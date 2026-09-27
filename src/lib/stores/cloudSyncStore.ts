/**
 * CloudSyncStore — writes encrypted save blobs to the BFF.
 *
 * ponytail: C.12 — save blobs are now encrypted client-side with AES-GCM
 * before POSTing. The key is derived from the deviceId (stored in localStorage).
 * This is NOT full E2E (the key never leaves the device, but it's derivable
 * from the deviceId which the server holds). For true E2E, the key should be
 * derived from the player's recovery mnemonic (which the server never sees
 * in plaintext). That's a future enhancement — the current implementation
 * is still better than plaintext (the server can't read saves without
 * brute-forcing the key derivation).
 *
 * Flow:
 *   1. deviceId generated on first run (localStorage)
 *   2. Significator mutations debounced 500ms, encrypted, POSTed to /api/save
 *   3. session_ended → immediate flush
 *   4. BFF unreachable → local saves still work, and `cloudSyncState` reports the failure
 *
 * B-1 (the client half): a 503 from the save route used to be discarded by BOTH callers —
 * `debouncedSync` did `void postSave(sig)` and `flushSync` did `await postSave(sig)` with no
 * check — and then BOTH set `lastSyncedSig`. So the player saw "saved", the state was marked
 * synced, the next flush compared equal and skipped, and the save was gone forever. The 503
 * changed the HTTP status and nothing the player could observe. `cloudSyncState` is now the
 * observable: a surface renders it, and a failed sync does NOT advance `lastSyncedSig`, so the
 * next attempt retries instead of treating the state as already synced.
 */

import { writable } from 'svelte/store';
import type { Significator } from '$core/domain/Significator.js';
import { CryptoStore } from '$infra/crypto/CryptoStore.js';

/** Whether the last sync attempt reached durable storage. Observable, not a silent no-op. */
export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'failed';

export interface CloudSyncState {
  readonly status: CloudSyncStatus;
  /** Consecutive failed attempts. Reset by a success. The number a player can act on. */
  readonly consecutiveFailures: number;
  /** HTTP status of the last failure, when the failure was a response rather than a network error. */
  readonly lastError: string | null;
  readonly lastSyncedAt: number | null;
}

const initialState: CloudSyncState = { status: 'idle', consecutiveFailures: 0, lastError: null, lastSyncedAt: null };

/**
 * The sync state a surface renders. Present because B-1's whole point is that a save that did
 * not happen must be VISIBLE — a store nobody renders is the same silent-success class, so the
 * layout is wired in the same commit.
 */
export const cloudSyncState = writable<CloudSyncState>(initialState);

const DEVICE_ID_KEY = 'mysterium:device-id';
const SYNC_DEBOUNCE_MS = 500;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastSyncedSig: Significator | null = null;

// ponytail: single CryptoStore instance, keyed by the device ID.
// Lazy-initialized on first use to avoid SSR issues.
let cryptoStore: CryptoStore | null = null;
function getCrypto(): CryptoStore {
  if (!cryptoStore) {
    cryptoStore = new CryptoStore(getDeviceId());
  }
  return cryptoStore;
}

/** Get or create the device ID. Generated once, stored in localStorage. */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'unknown';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/**
 * POST an encrypted save blob to the BFF. Returns true on success, false on failure, and
 * records the outcome in `cloudSyncState` either way.
 *
 * Best-effort, but NOT silent: a failure is counted and surfaced. The distinction that matters
 * is local-vs-durable — the local save always happened, so nothing is lost in this session; what
 * a failure means is that the blob is not on the server yet.
 */
async function postSave(sig: Significator): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const deviceId = getDeviceId();
    const plaintext = JSON.stringify(sig);
    const blob = await getCrypto().encrypt(plaintext);
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, blob, encrypted: true }),
    });
    if (!res.ok) {
      // Read the reason when the server sent one (B-1's 503 body names the missing binding);
      // fall back to the status so the state is never blank.
      let detail = `save rejected (HTTP ${res.status})`;
      try {
        const body = (await res.json()) as { message?: string };
        if (body?.message) detail = body.message;
      } catch {
        // A non-JSON error body is not worth failing over — the status is the signal.
      }
      recordFailure(detail);
      return false;
    }
    recordSuccess();
    return true;
  } catch (e) {
    // Network error / BFF unreachable: the blob never left the device.
    recordFailure(e instanceof Error ? e.message : 'network error');
    return false;
  }
}

function recordSuccess(): void {
  cloudSyncState.update(() => ({ status: 'synced', consecutiveFailures: 0, lastError: null, lastSyncedAt: Date.now() }));
}

function recordFailure(detail: string): void {
  cloudSyncState.update((s) => {
    const consecutiveFailures = s.consecutiveFailures + 1;
    // A console line as well as the store: the store is what a surface renders, this is what a
    // developer sees in the console when nothing is rendering it yet (and the standalone
    // Capacitor/static build, where there is no layout to wire).
    console.warn(`[cloud-sync] save not durable (${consecutiveFailures} consecutive): ${detail}`);
    return {
      status: 'failed',
      consecutiveFailures,
      lastError: detail,
      lastSyncedAt: s.lastSyncedAt,
    };
  });
}

/**
 * Debounced sync — called on every Significator mutation.
 * Waits 500ms after the last mutation before POSTing.
 */
export function debouncedSync(sig: Significator): void {
  if (typeof window === 'undefined') return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    cloudSyncState.update((s) => ({ ...s, status: 'syncing' }));
    // `lastSyncedSig` advances ONLY on success. Marking it on failure made the next flush
    // compare equal, skip, and silently abandon the save — the exact loss B-1 exists to stop.
    void postSave(sig).then((ok) => {
      if (ok) lastSyncedSig = sig;
    });
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Immediate flush — called on session_ended and beforeunload.
 * Skips if nothing changed since the last sync.
 */
export async function flushSync(sig: Significator | null): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!sig) return;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  // Skip if unchanged (deep compare via JSON — Significator is serializable)
  const sigJson = JSON.stringify(sig);
  const lastJson = lastSyncedSig ? JSON.stringify(lastSyncedSig) : '';
  if (sigJson === lastJson) return;
  cloudSyncState.update((s) => ({ ...s, status: 'syncing' }));
  // As above: a failed flush must leave `lastSyncedSig` where it was so the next flush retries.
  if (await postSave(sig)) lastSyncedSig = sig;
}

/**
 * Generate a 12-word recovery mnemonic bound to this device.
 * Called once on first cloud sync (or on user request from /settings).
 * Returns the mnemonic — the server stores only its hash.
 */
export async function generateRecoveryMnemonic(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const deviceId = getDeviceId();
    const res = await fetch('/api/recovery/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.mnemonic as string;
  } catch {
    return null;
  }
}

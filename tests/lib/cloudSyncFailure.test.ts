/**
 * B-1's client half: a save that did not reach durable storage must not be recorded as synced.
 *
 * The defect this pins is a two-line interaction that no single line reveals. `postSave` returned
 * `false` on failure; `debouncedSync` and `flushSync` both DISCARDED that return value and set
 * `lastSyncedSig = sig` unconditionally. So a 503 (or a dropped connection) produced: the player
 * sees "saved", the state is marked synced, and the NEXT `flushSync` short-circuits at its
 * deep-equal compare and never retries. The save is abandoned for the rest of the session.
 *
 * `cloudSyncStore` reads `window`, `localStorage`, `fetch` and `CryptoStore` (AES-GCM), so this
 * drives the real module through those seams rather than re-implementing it — a test of a copy
 * would pass against the defect it exists to catch.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

interface SyncState {
  readonly status: string;
  readonly consecutiveFailures: number;
  readonly lastError: string | null;
  readonly lastSyncedAt: number | null;
}

describe('B-1 client half — a failed sync is visible and retried', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let state: SyncState;
  let unsubscribe: () => void;

  beforeEach(async () => {
    // `cloudSyncStore` guards every entry point on `typeof window`, so without this the whole
    // module no-ops and the test would assert nothing.
    vi.stubGlobal('window', { location: { origin: 'https://test.local' } });
    vi.stubGlobal('localStorage', {
      getItem: () => 'device-1',
      setItem: () => undefined,
    });
    // Node's real WebCrypto: CryptoStore's AES-GCM needs `getRandomValues` + `subtle`, and
    // stubbing `crypto` wholesale broke encryption (which is the honest failure — the module
    // must encrypt for real, or the test would pass against a broken blob).
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    // Reset module state so `lastSyncedSig` and the failure counter start clean per test.
    vi.resetModules();
    const mod = await import('../../src/lib/stores/cloudSyncStore.js');
    state = { status: 'idle', consecutiveFailures: 0, lastError: null, lastSyncedAt: null };
    unsubscribe = mod.cloudSyncState.subscribe((s) => { state = s as SyncState; });
  });

  afterEach(() => {
    unsubscribe?.();
    vi.unstubAllGlobals();
  });

  it('records a 503 as a visible failure carrying the server reason, not a silent no-op', async () => {
    const { flushSync } = await import('../../src/lib/stores/cloudSyncStore.js');
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ message: 'storage not configured: SAVE_KV is unbound' }),
    });

    await flushSync({ theta: {} } as never);

    expect(state.status).toBe('failed');
    expect(state.consecutiveFailures).toBe(1);
    // The server's own words reach the client — that is what makes the failure diagnosable.
    expect(state.lastError).toMatch(/SAVE_KV is unbound/);
  });

  it('does NOT mark the state synced after a failure, so the next flush retries', async () => {
    const { flushSync } = await import('../../src/lib/stores/cloudSyncStore.js');
    fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => ({ message: 'nope' }) });

    const sig = { theta: { a: 1 } } as never;
    await flushSync(sig);
    const callsAfterFirst = fetchMock.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThan(0);

    // The same significator again: with `lastSyncedSig` wrongly advanced, this returns early
    // without a request — which is precisely the abandoned save. It must POST again.
    await flushSync(sig);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  it('clears the failure state once a sync succeeds', async () => {
    const { flushSync } = await import('../../src/lib/stores/cloudSyncStore.js');
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ message: 'nope' }) });
    await flushSync({ theta: { a: 1 } } as never);
    expect(state.status).toBe('failed');

    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ accepted: true }) });
    await flushSync({ theta: { a: 2 } } as never);

    expect(state.status).toBe('synced');
    expect(state.consecutiveFailures).toBe(0);
    expect(state.lastError).toBeNull();
  });
});

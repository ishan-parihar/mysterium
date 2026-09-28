/**
 * The auditor-share store — 16 §2.4.1 (the share contract), MY-AD-0034, 33 §7.
 *
 * The share LAW already exists and is not duplicated here: `createShare` validates the scope run
 * at creation and `renderLevel` re-checks it at every render (AL5). This store is only the
 * persistence those two read, because without it the three auditor surfaces have nothing to
 * enforce against and would have to grow a second, weaker permission system.
 *
 * Persona-free by owner ruling (2026-09-27): a share is a grant id + a scope run + a revocation
 * flag. There is no recipient identity, no role class, no "is this really a therapist" question.
 * The scope selection is the entire security interface.
 */
import { writable, derived, get, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import { createShare, revokeShare, type ShareRecord } from '$core/domain/shares.js';
import { scopeRunValid, type LadderLevel } from '$core/domain/articulationLadder.js';

const STORAGE_KEY = 'mysterium.shares.v1';

/** The three auditor surfaces of 33 §7 — each opens at the deepest level its scope whitelists. */
export type AuditorSurface = 'guardian' | 'educator' | 'therapeutic';

/** 33 §7.1: the entry level for each surface's scope. Descent is one level deeper per request. */
export const SURFACE_ENTRY_LEVEL: Readonly<Record<AuditorSurface, LadderLevel>> = {
  guardian: 'L1',
  educator: 'L1',
  therapeutic: 'L1',
};

/** 33 §7.1 rendering rules, as data the shell reads rather than prose it re-implements. */
export const SURFACE_LABEL: Readonly<Record<AuditorSurface, string>> = {
  guardian: 'Guardian Mirror',
  educator: 'Educator Desk',
  therapeutic: 'Therapeutic Pane',
};

/**
 * Turn whatever is in storage into grants, or into nothing.
 *
 * Extracted as a pure function on purpose. `readStore` bails on `browser === false`, and the
 * vitest `$app/environment` stub is permanently `browser: false` — so a test of the read path
 * can only ever observe the empty branch, which means the filter is exactly the code a test
 * would falsely certify. Pure, it is reachable: a corrupt store, a non-array payload, a
 * hand-edited record with a gapped or L0-bearing scope are all plain inputs here.
 *
 * Nothing is coerced into a grant that is not one. The scope run is the whole security
 * interface (16 §2.4.1), so an invalid run is dropped HERE as well as refused at render — the
 * render-time check stays, because this layer can be bypassed by anything that writes storage.
 */
export function sanitizeRecords(raw: unknown): readonly ShareRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: ShareRecord[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const r = item as Record<string, unknown>;
    if (typeof r.grantId !== 'string' || r.grantId.length === 0) continue;
    if (!Array.isArray(r.scopes) || !r.scopes.every((s) => typeof s === 'string')) continue;
    if (typeof r.revoked !== 'boolean') continue;
    const scopes = r.scopes as readonly LadderLevel[];
    if (!scopeRunValid(scopes)) continue; // gapped, or an L0-bearing run (MY-AD-0034)
    out.push({ grantId: r.grantId, scopes, revoked: r.revoked, createdAtMs: typeof r.createdAtMs === 'number' ? r.createdAtMs : 0 });
  }
  return out;
}

function readStore(): readonly ShareRecord[] {
  if (!browser) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return sanitizeRecords(JSON.parse(raw));
  } catch {
    return []; // a corrupt store must not take the surface down with it
  }
}

const shares = writable<readonly ShareRecord[]>(readStore());

if (browser) {
  // Another tab revoking a grant must take effect here, not at the next write: a revoked share
  // that still renders in a stale tab is a consent failure (AL5 re-checks at every render).
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) shares.set(readStore());
  });
}

function persist(next: readonly ShareRecord[]): void {
  shares.set(next);
  if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/**
 * Issue a share. Returns the reason instead of throwing when the scope run is invalid — the law
 * has already said no (MY-AD-0034), and this layer is a caller, not a second opinion.
 */
export function issueShare(rawScopes: readonly LadderLevel[]): { grantId?: string; reason?: string } {
  const outcome = createShare(rawScopes, Date.now());
  if (!outcome.share) return { reason: outcome.reason ?? 'share refused' };
  persist([...get(shares), outcome.share]);
  return { grantId: outcome.share.grantId };
}

export function revoke(grantId: string): boolean {
  const { revoked, next } = revokeShare(get(shares), grantId);
  if (revoked) persist(next);
  return revoked;
}

/** Every grant, newest last. The identity banner reads this; it never renders scope contents. */
export const shareStore: Readable<readonly ShareRecord[]> = { subscribe: shares.subscribe };

/** Live (unrevoked) grants only — a revoked link is a link that no longer exists. */
export const liveShares: Readable<readonly ShareRecord[]> = derived(
  shares,
  ($shares) => $shares.filter((s) => !s.revoked),
);

/**
 * Resolve the consent link a surface must render through. Returns the *live* grant or undefined;
 * the caller then hands it to `renderLevel`, which re-checks scope and revocation at render (AL5).
 * This is a lookup, never a permission decision — the permission is `renderLevel`'s.
 */
export function consentFor(surface: AuditorSurface): { consent?: ShareRecord; reason: string } {
  const live = get(liveShares);
  if (live.length === 0) {
    return { reason: 'no live consent grant — access is a player-issued, revocable link, re-checked at every render (AL5)' };
  }
  // A surface is not a permission: a grant whose contiguous scope covers the surface's entry
  // level can serve it. The 33 §7 role names are consumers, not identity classes (16 §2.4.1).
  const entry = SURFACE_ENTRY_LEVEL[surface];
  const usable = live.find((s) => scopeRunValid(s.scopes) && s.scopes.includes(entry));
  if (!usable) {
    // Distinguish "there is a grant but it does not reach" from "the live records are not valid
    // grants at all" (a gapped or hand-edited store). Both refuse identically; only the reason
    // differs, and a reason an auditor can act on is worth the extra branch.
    const invalid = live.some((s) => !scopeRunValid(s.scopes));
    return {
      reason: invalid
        ? `the live share records are not valid grants — a scope run must be contiguous from L1 (MY-AD-0034); refusing rather than rendering from them`
        : `no live grant covers ${entry}, the entry level for this surface`,
    };
  }
  return { consent: usable, reason: 'consented traversal: scope-bounded grant, live at render (AL5)' };
}

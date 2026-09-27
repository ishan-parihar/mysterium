/**
 * The share registry — 16 §2.4.1 (the share contract), MY-AD-0034, Phase 17 d3.
 *
 * Owner ruling 2026-09-27: the Significator sharing system implements NO second-party personas
 * (parent/guardian-of-record/teacher/therapist) at this point. It is an API-key-permission
 * shape: a player intending to share their profile creates a share and selects the scopes the
 * recipient may see — **the scope selection is the entire security interface.**
 *
 * One law, two enforcement points: `createShare` validates the scope run HERE, and `renderLevel`
 * (AL5) re-checks it at every render — a corrupted store cannot widen what a share may show.
 */
import { LADDER_LEVELS, scopeRunValid, type ConsentLink, type LadderLevel } from './articulationLadder.js';

/** A share is a `ConsentLink` plus its creation time — nothing else (no identity typing). */
export interface ShareRecord extends ConsentLink {
  readonly createdAtMs: number;
}

export interface ShareOutcome<T> {
  readonly share?: T;
  readonly reason?: string;
}

/**
 * Create a player-issued share. The scope selection IS the security interface: no non-empty
 * grant with L0, no gapped runs, no unknown levels — the exact law `renderLevel` enforces
 * (MY-AD-0034), validated at creation so a bad share never exists to be leaked.
 */
export function createShare(rawScopes: readonly string[], nowMs: number): ShareOutcome<ShareRecord> {
  const scopes = [...new Set(rawScopes)];
  if (scopes.length === 0) return { reason: 'a share must name at least one level (L1..L7)' };
  const unknown = scopes.filter((s) => !(LADDER_LEVELS as readonly string[]).includes(s));
  if (unknown.length > 0) return { reason: `unknown level(s): ${unknown.join(', ')}` };
  const levels = scopes as LadderLevel[];
  if (levels.includes('L0')) {
    return { reason: 'L0 (felt-sense) is the player\'s own surface — never shareable (MY-AD-0034)' };
  }
  if (!scopeRunValid(levels)) {
    return { reason: 'scopes must form a contiguous run from L1 (e.g. L1,L2,L3 — never L1,L3 or starting at L0; MY-AD-0034)' };
  }
  const grantId = `share-${nowMs.toString(36)}-${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
  return { share: { grantId, scopes: [...levels].sort(), revoked: false, createdAtMs: nowMs } };
}

/** Revocation nulls the projection at any level instantly (AL5) — idempotent re-revoke is a no-op. */
export function revokeShare(shares: readonly ShareRecord[], grantId: string): { revoked: boolean; next: readonly ShareRecord[] } {
  let revoked = false;
  const next = shares.map((s) => {
    if (s.grantId === grantId && !s.revoked) {
      revoked = true;
      return { ...s, revoked: true };
    }
    return s;
  });
  return { revoked, next };
}

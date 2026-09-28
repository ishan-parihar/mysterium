/**
 * The projection → route seam, shared by all three auditor surfaces (33 §7).
 *
 * WHY THIS EXISTS. 33 §7 says the scope projections "arrive pre-filtered and consent-checked —
 * this layer adds visual hierarchy and interaction only." If each route re-derived that, three
 * copies of a consent decision would sit in `src/routes`, where no gate reads them and the
 * 16 §2.4.1 law would have four enforcement points instead of two — which is the exact failure
 * G47 was written to prevent. So the seam is one module, and every route calls it.
 *
 * It does four things, in this order, and refuses loudly at each:
 *   1. no Significator → refuse (the `hasSave` honesty gate: never narrate a fabricated profile)
 *   2. no live grant    → refuse with the law's own reason
 *   3. build the payloads from the live Significator
 *   4. hand EVERY requested level to `renderLevel`, which re-checks scope and revocation
 */
import type { Significator } from '$core/domain/Significator.js';
import { buildLadderPayloads } from '$core/presentation/ladderProjections.js';
import { renderLevel, type LadderLevel, type RenderedLevel } from '$core/domain/articulationLadder.js';
import type { ShareRecord } from '$core/domain/shares.js';
import { consentFor, SURFACE_ENTRY_LEVEL, type AuditorSurface } from '$lib/stores/shareStore.js';

export interface ProjectionResult {
  /** The law's reason when a level was refused. Absent when every requested level rendered. */
  readonly refusal?: string;
  /** Per-level render records, in request order. Only allowed levels appear. */
  readonly rendered: readonly RenderedLevel[];
  /** The deepest level this surface may currently drill to (its grant's ceiling). */
  readonly ceiling: LadderLevel;
  /** The grant in force, for the identity banner. */
  readonly consent?: ShareRecord;
}

/**
 * Resolve what a surface may show. `requested` is the auditor's drill-down target: the entry
 * level at rest, one level deeper per explicit request (33 §7.2.2 — descent-only).
 */
export function projectWithConsent(
  surface: AuditorSurface,
  sig: Significator | undefined,
  requested: readonly LadderLevel[],
  playerStage: Significator['currentStage'],
  /** The live grant, or undefined. Passed IN rather than looked up, so the seam is pure. */
  live?: ShareRecord,
): ProjectionResult {
  // (1) The honesty gate. A surface that renders history refuses without a save — it must never
  // narrate a profile that does not exist, the same fabrication the Veil forbids everywhere else.
  if (!sig) {
    return {
      refusal:
        'no Significator loaded — this surface renders what you have lived, never a fabricated profile (16 §2.4.1 hasSave)',
      rendered: [],
      ceiling: SURFACE_ENTRY_LEVEL[surface],
    };
  }

  // (2) The consent link. renderLevel is the law (AL5); this only decides whether there IS one.
  if (!live || live.revoked) {
    return {
      refusal:
        'no live consent grant — access is a player-issued, revocable link, re-checked at every render (AL5)',
      rendered: [],
      ceiling: SURFACE_ENTRY_LEVEL[surface],
    };
  }
  const consent = live;

  // (3) The payloads, derived from the live Significator. Never from a cache: a stale payload is
  // a consent failure in the same way a stale grant is.
  const payloads = buildLadderPayloads(sig, { now: Date.now() });

  // (4) Every level through the law. A refusal is a refusal with a reason, never a partial
  // payload (16 §2.4.1 lifecycle).
  const rendered: RenderedLevel[] = [];
  let refusal: string | undefined;
  for (const level of requested) {
    const out = renderLevel({ register: 'auditor', level, playerStage, consent }, payloads);
    if (out.allowed) rendered.push(out);
    else refusal ??= out.reason;
  }

  const ceiling = [...consent.scopes].sort()[consent.scopes.length - 1] ?? 'L1';
  return { rendered, refusal, ceiling, consent };
}

/**
 * The impure half: read the live grant from the store, then project through the pure seam.
 *
 * The split is what makes the consent law TESTABLE. With the lookup inside the seam, every test
 * runs with an empty store and can only ever observe the refusal path — which is how a seam that
 * renders nothing and refuses everything can look correct. Here, the component supplies the grant
 * and the law is exercised end to end.
 */
export function projectForAuditor(
  surface: AuditorSurface,
  sig: Significator | undefined,
  requested: readonly LadderLevel[],
  playerStage: Significator['currentStage'],
): ProjectionResult {
  const { consent } = consentFor(surface);
  return projectWithConsent(surface, sig, requested, playerStage, consent);
}

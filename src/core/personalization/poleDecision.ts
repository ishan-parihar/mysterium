/**
 * The polarity decision — Phase 13 d10 L2 (`45 §5.4`'s consumer; the plan's Polarity Pool).
 *
 * Pooling (45 §5) ranks candidates by relevance and the dialectic engine (46 §5) selects the
 * HOW-poles. What neither decides is WHICH POLE the encounter serves — and that is the piece the
 * user ratified: a cell's infinite polarities are served alternately as
 *
 *   - `familiar`       — flavour inside the player's fluent/interest domains: recognized,
 *                        effortless, the hook;
 *   - `unfamiliar`     — flavour OUTSIDE those domains: the stretch the dialectic engine's
 *                        expansion budget already demands;
 *   - `shadow-facing`  — unfamiliar, AND pointed at the player's active shadow on the cell's
 *                        line: the Distortion Ledger's severity decides how much of this the
 *                        player meets.
 *
 * Laws this module enforces (45 §5.4's refinement, the canon owner of the budget):
 *   1. Dosage is shadow-SEVERITY-scaled — severity 0 ⇒ never shadow-facing; the unfamiliar share
 *      rises with the severity of the cell's line's active shadow. This is `noveltyBudget`'s
 *      first real consumer.
 *   2. The aversion veto is ABSOLUTE (45 §5.2.1, unchanged): the pole decision selects among
 *      candidates the veto already spared, never overrides, never selects FROM the veto list.
 *      Unfamiliar ≠ aversive.
 *   3. Selection is a RANK over candidates, never a fabrication: if the library has no
 *      unfamiliar-capable rendering for the cell, the decision degrades to `familiar` and the
 *      shortfall is recorded (the coverage query in polarityResolution.ts reports it).
 *   4. Determinism: same inputs (positions, weights, severity) ⇒ same decision. Ties break by
 *      library order (stable sort) — the seed may reorder, never choose (43 §3.3's law applied
 *      to flavour).
 */

import type { Line } from '../domain/Line.js';
import type { PoolCandidate } from './pooling.js';
import type { TagStore } from '../world/tags/dialectic.js';
import { distanceFrom, axisCentroid } from './polarityIndex.js';
import type { Tag, TagId } from '../world/tags/types.js';

// Phase 13 d6 — engagement-register enforcement at the mechanism seam (45 §7.3, MY-RG-0017).
// Each pole IS a retention mechanism: the familiar pole is `analogical-resonance` ("the material
// speaks their language"), the unfamiliar/shadow-facing poles are `curiosity-gap` ("an opened
// question the player wants to close" — the expansion demand). A mechanism that has not passed
// BOTH register tests has no legitimate place in the product; the seam refuses to serve it and
// degrades to the always-lawful pole rather than ship an unregistered hook. The default register
// here is the SHARED singleton shape (all 8 pre-registered mechanisms pass both tests), so this
// enforcement is structural teeth, not a behavioral change — a mechanism removed from the
// register would immediately stop being servable at this seam.
import { createEngagementRegister, type EngagementRegister } from './engagementRegister.js';

/** Which pole an encounter serves — the plan's ratified vocabulary. */
export type Pole = 'familiar' | 'unfamiliar' | 'shadow-facing';

/** Pole → the engagement mechanism that pole exercises (45 §7.1's binding). */
export function poleMechanism(pole: Pole): 'analogical-resonance' | 'curiosity-gap' {
  return pole === 'familiar' ? 'analogical-resonance' : 'curiosity-gap';
}

/** The process-wide register the seam consults (the register is a config surface, not per-call state). */
let mechanismRegister: EngagementRegister | null = null;
export function setMechanismRegister(r: EngagementRegister): void {
  mechanismRegister = r;
}
function activeRegister(): EngagementRegister {
  if (!mechanismRegister) mechanismRegister = createEngagementRegister();
  return mechanismRegister;
}

export interface PoleDecision {
  readonly pole: Pole;
  /** The candidate the pole names — the primary the prompt renders (L4). */
  readonly primary: PoolCandidate;
  /** Named alternates: the next-best candidates of the SAME cell, hidden from the prompt
   *  (L4's ratified surface) but present for authorized reads and calibration telemetry. */
  readonly alternates: readonly PoolCandidate[];
  /** Why: the recorded rationale (an auditor must be able to replay the decision). */
  readonly reason: string;
  /** The shadow severity that dosed this decision (0 when the pole is `familiar`). */
  readonly shadowSeverity: number;
  /** The unfamiliar share the budget demanded this encounter (0..1). */
  readonly unfamiliarShare: number;
}

/** The severity→share curve: `noveltyBudget` (the seed floor) raised by active shadow severity.
 *  Severity ≤0.2 is dormant (the ledger's own activity threshold in sessionRuntime); above it
 *  the unfamiliar share scales linearly to a hard ceiling of 0.6 — shadow-facing work is a dose,
 *  never a takeover (45 §5.4: bridging is a ramp, not a wall). */
export function unfamiliarShareFor(seedNoveltyBudget: number, shadowSeverity: number): number {
  if (shadowSeverity <= 0.2) return Math.max(0, seedNoveltyBudget);
  return Math.min(0.6, Math.max(0, seedNoveltyBudget) + (shadowSeverity - 0.2) * 0.8);
}

/** The strongest active shadow severity on ONE line (the cell's line), or 0 when none is active. */
export function shadowSeverityForLine(
  shadows: readonly { readonly line: Line; readonly resolvedAt: number | null; readonly severity: number }[],
  line: Line,
): number {
  let worst = 0;
  for (const e of shadows) {
    if (e.line !== line || e.resolvedAt !== null) continue;
    if (e.severity > worst) worst = e.severity;
  }
  return worst;
}

export interface PoleDecisionInput {
  /** The cell's candidates AFTER constraint-filter + veto routing (pooling's survivors). */
  readonly candidates: readonly PoolCandidate[];
  readonly target: { readonly line: Line };
  /** The player's fluent-domain tag ids, best-first (the UDV's analogy band). */
  readonly fluentTags: readonly TagId[];
  /** Strongest active shadow severity on the target line (0 when dormant). */
  readonly shadowSeverity: number;
  /** The bridge's seed rotation budget (45 §5.4) — the unfamiliar floor. */
  readonly seedNoveltyBudget: number;
  /** A draw in [0,1) — reorders WITHIN a tied score class, never across classes. */
  readonly draw: number;
}

/**
 * The FAMILIAR MATCH: how much of a candidate's flavour sits inside the player's fluent set.
 * This — not axis distance alone — is the UDV's actual lever on the rank: a player fluent in
 * `music` meets the music-recoloured rendering, a player fluent in `law` the law-recoloured one.
 */
function fluentOverlap(c: PoolCandidate, fluent: ReadonlySet<TagId>): number {
  if (c.tags.length === 0) return 0;
  let hits = 0;
  for (const t of c.tags) if (fluent.has(t)) hits++;
  return hits / c.tags.length;
}

/**
 * Resolve the pole for one encounter (L2). Pure; throws nothing — an under-stocked cell degrades
 * to `familiar` rather than failing the session (45 §5's degradation law).
 *
 * Algorithm (deterministic):
 *   1. Rank by FAMILIAR MATCH descending (stable tie-order = library order) — the fluent-side
 *      candidates lead.
 *   2. Split that rank at the unfamiliar share: the head is the familiar pool, the tail the
 *      unfamiliar pool. Axis distance from the fluent centroid breaks ties INSIDE a pool so the
 *      unfamiliar pool really is the far side of the axis space, not a random remainder.
 *   3. Choose the pool: shadow-facing when severity is live AND the share demand + the line's
 *      shadow warrant it; unfamiliar when the expansion demand beats the draw; familiar otherwise.
 *   4. Inside the chosen pool, the primary is the best candidate; the rest are alternates.
 */
export function decidePole(store: TagStore, input: PoleDecisionInput): PoleDecision | null {
  if (input.candidates.length === 0) return null;

  const fluentSet = new Set<TagId>(input.fluentTags);
  const fluent = input.fluentTags
    .map((id) => store.byId(id))
    .filter((t): t is Tag => t !== undefined);
  const familiarPoint = axisCentroid(fluent);

  // Rank: fluent-overlap descending, axis-distance ascending as the tiebreak. Stable sort keeps
  // library order inside full ties.
  const ranked = [...input.candidates]
    .map((c) => ({ c, overlap: fluentOverlap(c, fluentSet), d: distanceFrom(store, c, familiarPoint) }))
    .sort((a, b) => b.overlap - a.overlap || a.d - b.d);

  const share = unfamiliarShareFor(input.seedNoveltyBudget, input.shadowSeverity);
  const split = Math.min(
    ranked.length - 1,
    Math.max(1, Math.round(ranked.length * (1 - share))),
  );
  const familiarPool = ranked.slice(0, split);
  const unfamiliarPool = ranked.slice(split);

  // The draw perturbs WITHIN a score class only: candidates whose distances differ by <0.05 are
  // one class (the axis resolution of the tag space). Across classes the score decides — the
  // draw reorders, never chooses (43 §3.3).
  const withinClass = (pool: { c: PoolCandidate; d: number }[]): { c: PoolCandidate; d: number }[] => {
    if (pool.length <= 1) return pool;
    const out = [...pool];
    let i = 0;
    while (i < out.length) {
      let j = i;
      while (j + 1 < out.length && Math.abs(out[j + 1].d - out[i].d) < 0.05) j++;
      const span = j - i + 1;
      if (span > 1) {
        const shift = Math.floor(input.draw * span) % span;
        const head = out.splice(i, shift);
        out.push(...head);
      }
      i = j + 1;
    }
    return out;
  };

  // Pole selection: shadow-facing when the ledger is live on this line and the dose demands it;
  // unfamiliar when the expansion demand beats the draw; familiar otherwise. A pool that would
  // serve an unfamiliar/shadow-facing decision but is EMPTY degrades to familiar (law 3).
  // d6: a pole whose mechanism is not both-tests-passed in the register is REFUSED — the seam
  // degrades to familiar rather than serve an unregistered retention mechanism (MY-RG-0017).
  const register = activeRegister();
  const wantShadow = input.shadowSeverity > 0.2 && share > Math.max(0, input.seedNoveltyBudget) + 1e-9;
  const wantUnfamiliar = share > input.draw;
  let pool: { c: PoolCandidate; d: number }[];
  let pole: Pole;
  if (wantShadow && unfamiliarPool.length > 0) {
    pool = unfamiliarPool;
    pole = 'shadow-facing';
  } else if (wantUnfamiliar && unfamiliarPool.length > 0) {
    pool = unfamiliarPool;
    pole = 'unfamiliar';
  } else {
    pool = familiarPool;
    pole = 'familiar';
  }
  if (pole !== 'familiar' && (!register.isMechanismAllowed(poleMechanism(pole)) || pool.length === 0)) {
    pool = familiarPool;
    pole = 'familiar';
  }
  if (!register.isMechanismAllowed(poleMechanism(pole))) {
    // Both mechanisms unregistered: no lawful hook exists — degrade to a mechanism-null decision.
    return null;
  }

  const ordered = withinClass(pool);
  const primary = ordered[0].c;
  const alternates = ordered.slice(1).map((x) => x.c);

  const severity = pole === 'familiar' ? 0 : input.shadowSeverity;
  const reason =
    pole === 'familiar'
      ? `familiar pole: severity ${input.shadowSeverity.toFixed(2)} dormant or share ${share.toFixed(2)} within the draw; primary ${primary.id}`
      : pole === 'unfamiliar'
        ? `unfamiliar pole: share ${share.toFixed(2)} exceeds the draw ${input.draw.toFixed(2)} (seed budget ${input.seedNoveltyBudget.toFixed(2)}); primary ${primary.id}`
        : `shadow-facing pole: line shadow severity ${input.shadowSeverity.toFixed(2)} dosed share ${share.toFixed(2)} (noveltyBudget consumer, 45 §5.4); aversion veto untouched; primary ${primary.id}`;

  return { pole, primary, alternates, reason, shadowSeverity: severity, unfamiliarShare: share };
}

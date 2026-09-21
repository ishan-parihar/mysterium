/**
 * The interest record — 47 §5 (`docs/foundations/47-preference-inference-and-scaffolding.md`).
 *
 * Six axes, one record. The 45 §6 depth enum is kept unchanged and mapped to 31's ladder rather
 * than extended (two competing depth enums would be a defect; one enum and one mapping is not).
 *
 * §5.3 is load-bearing in both senses: a `loadBearing` interest carries identity or vocation, and
 * the dialectic engine may never select it as the STRUCTURAL pole of a bridge — fluency may be the
 * surface of a bridge into difficult material; it must not be the site where the player's weak
 * dimension is trained (47 §9 check 7).
 */

import type { TagId } from '../world/tags/types.js';

/** 47 §5.1 — how they relate to the domain; the sharpest axis, absent everywhere else. */
export const INTEREST_MODES = [
  'consume', 'produce', 'master', 'compete', 'collect', 'teach', 'repair', 'serve', 'contemplate',
] as const;
export type InterestMode = (typeof INTEREST_MODES)[number];

export type InterestAim = 'practice-vow' | 'exposure-step' | 'learning-quest' | 'service-act';
export type InterestProvenance = 'declared' | 'probed' | 'observed';
export type InterestDepth = 'surface' | 'working' | 'fluent';

/** 47 §5.1's six-axis record. */
export interface InterestRecord {
  readonly domain: TagId;            // 46 §4 — what it is about (axis position inherited)
  readonly mode: InterestMode;       // how they relate to it
  readonly depth: InterestDepth;     // mapped to 31's ladder (§5.1 note)
  readonly salience: number;         // 0..1
  readonly loadBearing: boolean;     // §5.3 — identity-carrying, protected
  readonly aim: InterestAim;         // 39 §3.1 — what the interest is FOR
  readonly provenance: InterestProvenance;
}

/** 47 §5.1's depth→ladder mapping (31). Level 7 is reachable only through transfer, never held. */
export const DEPTH_LADDER: Readonly<Record<InterestDepth, readonly [number, number]>> = Object.freeze({
  surface: [1, 2],
  working: [3, 4],
  fluent: [5, 6],
});

export function depthToLadderRange(depth: InterestDepth): readonly [number, number] {
  return DEPTH_LADDER[depth];
}

/** 47 §5.4 — an archetype prior with a mandatory expiry; superseded by individual evidence. */
export interface ArchetypePrior {
  readonly archetype: string;
  readonly axes: readonly string[];   // the T1 distinctions the clustering ran on (small by design)
  readonly assignedAt: number;
  /** Mandatory — a prior without an expiry has become a label (MY-RG-0021, §9 check 3). */
  readonly expiresAt: number;
}

export function isPriorLive(prior: ArchetypePrior, now: number): boolean {
  return now < prior.expiresAt;
}

/** Construct a record, asserting the invariants the type cannot express. */
export function createInterestRecord(r: InterestRecord): InterestRecord {
  if (r.salience < 0 || r.salience > 1) throw new Error(`interest ${r.domain}: salience out of range (47 §5.1)`);
  if (!INTEREST_MODES.includes(r.mode)) throw new Error(`interest ${r.domain}: unknown mode ${r.mode}`);
  return r;
}

/**
 * §9 check 7 — the load-bearing guard, expressed as a pure predicate so both the dialectic engine
 * and the kernel gate (G24) read the SAME rule from the SAME place.
 */
export function isStructuralPoleAllowed(domain: TagId, records: readonly InterestRecord[]): boolean {
  return !records.some((r) => r.domain === domain && r.loadBearing);
}

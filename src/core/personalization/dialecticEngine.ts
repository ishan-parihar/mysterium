/**
 * The dialectic engine — 46 §5 (`docs/foundations/46-generative-world-composition.md`).
 *
 * Answers ONE question: how much familiarity and how much novelty, and novelty of what kind.
 * It sets the poles (familiar tag + structural opposite); the scaffold (`47 §6.2`) arranges them.
 *
 * Hard bounds (46 §5.3):
 * - it may NOT select the catalytic purpose (that is 24 + the developmental state);
 * - it may NOT override an aversion — refused tags are excluded from both poles;
 * - it may NOT collapse into a comfort engine — `expansionRatio` has a floor;
 * - it may NOT select on a `reconciled` or `undiscovered` pair — only `active-tension` pairs
 *   carry a structural pole (`selectableStructurally`, 46 §4.3).
 *
 * Vocabulary (MY-AD-0031): every "polarity" here is a RECONCILIATION-polarity (thesis⟷antithesis
 * with a synthesis state), never the service-polarity (STO/STS) of 19/23.
 */

import type { Tag, TagId } from '../world/tags/types.js';
import { selectableStructurally } from '../world/tags/types.js';
import type { TagStore } from '../world/tags/dialectic.js';
import { isStructuralPoleAllowed, type InterestRecord } from './interestRecord.js';

/** Canonical pair key for a reconciliation-polarity — unordered, so the map cannot disagree with itself. */
export function pairKeyOf(a: TagId, b: TagId): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * The player's state map over the PAIR space — 46 §5.2/§4.3. A reconciliation-polarity is a PAIR
 * carrying a state (KosmOS `polarity.md` via MY-AD-0031), so the map is keyed by canonical pair
 * key, never by a single tag. Absent pairs read as `undiscovered`.
 */
export type PolarityStateMap = Readonly<Record<string, 'reconciled' | 'active-tension' | 'undiscovered'>>;

export type DialecticMode = 'familiar' | 'expand' | 'spiral';

/** The engine's decision — 46 §5.1's three modes expressed as two poles. */
export interface PoleSelection {
  readonly mode: DialecticMode;
  /** The surface pole: the tag the content is rendered IN (45 §5.4's D). */
  readonly surface: Tag;
  /** The structural pole: the tag whose arrangement carries the payload (45 §5.4's D'). */
  readonly structure: Tag;
  /** Why this selection was made — recorded with the composition for auditability (46 §7.1). */
  readonly reason: string;
}

export interface DialecticEngineInput {
  readonly mode: DialecticMode;
  /** The UDV's fluent-domain tags, best-first (45 §3 `analogy.fluentDomains`). */
  readonly fluentTags: readonly TagId[];
  /** 45 §3.1 rule 2: refused tags — excluded from BOTH poles, unconditionally. */
  readonly aversions: readonly string[];
  /** The per-player reconciliation-state map (46 §5.2). */
  readonly states: PolarityStateMap;
  /** 47 §5.3 — the interest record set; a load-bearing domain is never the structural pole (check 7). */
  readonly interests?: readonly InterestRecord[];
  /** Exposures per dominant tag id — the rotation floor's counter (46 §5.2). */
  readonly exposures?: Readonly<Record<TagId, number>>;
  /** Minimum interval between two encounters sharing a dominant tag (46 §5.2). Default 3. */
  readonly rotationFloor?: number;
}

/** 46 §5.2: expansionRatio floor — a comfort engine is a failure mode, not a preference. */
export const EXPANSION_RATIO_FLOOR = 0.25;

export interface ExpansionBudget {
  /** Fraction of composed encounters whose STRUCTURE must come from the opposite pole. */
  readonly expansionRatio: number;
  readonly rotationFloor: number;
  /** Pairs the player has reconciled — no longer selectable as structural poles. */
  readonly saturated: readonly [TagId, TagId][];
}

export function expansionBudget(
  states: PolarityStateMap,
  seedNoveltyBudget = 0.25,
  rotationFloor = 3,
): ExpansionBudget {
  const saturated: [TagId, TagId][] = [];
  for (const [key, state] of Object.entries(states)) {
    if (state !== 'reconciled') continue;
    const [a, b] = key.split('|');
    saturated.push([a, b]);
  }
  // The ratio is the seed noveltyBudget raised to at least the floor (46 §5.2 + 45 §5.4).
  return {
    expansionRatio: Math.max(seedNoveltyBudget, EXPANSION_RATIO_FLOOR),
    rotationFloor,
    saturated,
  };
}

/** Is the PAIR (fluent tag, its opposite) selectable as a structural arrangement (46 §5.3)? */
function pairEligible(
  a: Tag,
  b: Tag,
  states: PolarityStateMap,
  aversions: readonly string[],
  interests?: readonly InterestRecord[],
): boolean {
  if (aversions.includes(a.id) || aversions.includes(b.id)) return false;
  // 47 §5.3 / §9 check 7 — a load-bearing domain is never the structural pole: the spiral maps
  // difficult structure onto the opposite pole, and that work must not degrade the domain that
  // carries the player's identity.
  if (interests && !isStructuralPoleAllowed(b.id, interests)) return false;
  const state = states[pairKeyOf(a.id, b.id)] ?? 'undiscovered';
  // 46 §5.3: the engine may not select on a reconciled pair (nothing left to teach — the
  // saturation guard) or an undiscovered one (bypass, not stretch). Only active-tension teaches.
  return selectableStructurally(state);
}

/** Rotation-floor gate: a dominant tag used too recently yields to another fluent tag. */
function withinRotation(tag: Tag, input: DialecticEngineInput): boolean {
  if (input.exposures === undefined) return true;
  const seen = input.exposures[tag.id] ?? 0;
  const floor = input.rotationFloor ?? 3;
  if (seen === 0) return true;
  // exposures counts recent uses; above the floor the tag must yield (exact window is a
  // composition-level concern — here the counter gates eligibility).
  return seen <= floor;
}

/**
 * Select the poles for one composition (46 §5.1).
 *
 * - `familiar` — surface AND structure from the fluent side (retention, fluency, bridge surface).
 * - `expand`   — surface from the fluent side, structure from the reflected position of an
 *                `active-tension` pair, ordered by distance (16 §6.4).
 * - `spiral`   — familiar surface, opposite structure — the DEFAULT (46 §5.1).
 *
 * Throws when no eligible structural pole exists — the caller defers the cell (45 §5.2.1), it does
 * not fall back to a vetoed or unreconciled tag.
 */
export function selectPoles(store: TagStore, input: DialecticEngineInput): PoleSelection {
  const fluent = input.fluentTags
    .map((id) => store.byId(id))
    .filter((t): t is Tag => t !== undefined)
    .filter((t) => !input.aversions.includes(t.id));

  if (fluent.length === 0) {
    throw new Error('dialectic engine: no fluent tags outside the aversion set (45 §3.1 rule 2)');
  }

  const rotatable = fluent.filter((t) => withinRotation(t, input));
  const surfaceTag = (rotatable.length > 0 ? rotatable : fluent)[0];

  if (input.mode === 'familiar') {
    return {
      mode: 'familiar',
      surface: surfaceTag,
      structure: surfaceTag,
      reason: `familiar mode: surface=structure=${surfaceTag.id} (retention/fluency)`,
    };
  }

  // expand / spiral: the structural pole comes from the OPPOSITE of a fluent tag whose pair is in
  // active-tension. Try each fluent tag best-first until one has an eligible opposite.
  const attempts: { surface: Tag; structure: Tag }[] = [];
  for (const t of rotatable.length > 0 ? rotatable : fluent) {
    const opposite = store.opposite(t.id); // symmetric + total by construction (46 §4.2)
    if (opposite.id === t.id) continue; // reflexive-safe: origin tags carry no structural payload
    if (!pairEligible(t, opposite, input.states, input.aversions, input.interests)) continue;
    attempts.push({ surface: t, structure: opposite });
  }

  if (attempts.length === 0) {
    throw new Error(
      'dialectic engine: no eligible structural pole — every fluent tag either reflects to itself, ' +
        'is vetoed, or its pair is not in active-tension (46 §5.3). The cell defers (45 §5.2.1).',
    );
  }

  // Order by 16 §6.4 distance: the NEAREST eligible opposite is the player's edge — not the
  // farthest (bypass) and not the fluent tag itself (comfort).
  attempts.sort((a, b) => store.distance(a.surface, a.structure) - store.distance(b.surface, b.structure));

  if (input.mode === 'expand') {
    const pick = attempts[0];
    return {
      mode: 'expand',
      surface: pick.surface,
      structure: pick.structure,
      reason: `expand mode: structure from ${pick.structure.id} (active-tension pair of ${pick.surface.id})`,
    };
  }

  const pick = attempts[0];
  return {
    mode: 'spiral',
    surface: pick.surface,
    structure: pick.structure,
    reason: `spiral mode (default): surface ${pick.surface.id}, structure ${pick.structure.id} — fluency is the carrier, the opposite pole is the payload (46 §5.1)`,
  };
}

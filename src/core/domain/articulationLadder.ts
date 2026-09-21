/**
 * The articulation ladder — 16 §10.5, MY-AD-0006, MY-AD-0007.
 *
 * ONE system, ONE ladder (L0–L7), two parties traversing it (the player and a consented
 * auditor), two registers rendering the same derivation. There is no auditor identity class
 * and no privilege tier: access is determined by register class (MY-AD-0006) and consent —
 * never by who is asking.
 *
 * Register classes (20 §11.1, MY-AD-0006):
 * - OPEN   — metric-bearing, player-readable at ANY stage (the recorded HoloOS D3-Veil
 *            divergence, with its compensation: the closed class keeps the endgame state
 *            ungameable).
 * - CLOSED — polarity, shadow, ray state, harvest verdict, delegation inference fields.
 *            Never rendered to the player at any stage; met only as narrative consequence.
 *
 * Ladder laws enforced here:
 * - AL1 one ladder, no privilege tiers (access = register class + consent)
 * - AL2 registers, not gatekeeping (same derivation, two renderings)
 * - AL3 presentation (not availability) is stage-articulated
 * - AL4 auditor descent is progressive; the self addresses any level directly
 * - AL5 consent is re-checked at EVERY render; revocation nulls instantly
 * - AL6 presentation is never measurement pressure (no comparison dynamics — a rendering rule)
 */

import type { Stage } from './Stage.js';

export type LadderLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7';

export const LADDER_LEVELS: readonly LadderLevel[] = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];

export interface LadderLevelSpec {
  readonly level: LadderLevel;
  readonly articulation: string;
  readonly registerClass: 'open' | 'closed';
}

/** The ladder itself — which level draws from which register class (16 §10.5 table). */
export const LADDER: readonly LadderLevelSpec[] = [
  { level: 'L0', articulation: 'Felt-sense / lived experience', registerClass: 'open' },
  { level: 'L1', articulation: 'Whole-person holonic span (centre of gravity + lower-stage health)', registerClass: 'open' },
  { level: 'L2', articulation: 'Line profile (8 altitudes + theta freshness)', registerClass: 'open' },
  { level: 'L3', articulation: 'Line × stage (where growth stalls, per stage)', registerClass: 'open' },
  { level: 'L4', articulation: 'Line × stage × quadrant (the stance-diagnostics core)', registerClass: 'closed' },
  { level: 'L5', articulation: 'Line × stage × polarity cell (STO/STS/exploratory texture)', registerClass: 'closed' },
  { level: 'L6', articulation: 'Evidence layer (rubric-named instrument detail, RV status, skill-θ streams)', registerClass: 'open' },
  { level: 'L7', articulation: 'Derivation / provenance (which encounter produced which signal)', registerClass: 'open' },
];

export const LADDER_BY_LEVEL: ReadonlyMap<LadderLevel, LadderLevelSpec> = new Map(
  LADDER.map((l) => [l.level, l]),
);

export type Register = 'self' | 'auditor';

/** The consent grant: player-issued, revocable, scope-bounded (16 §2.4). */
export interface ConsentLink {
  readonly grantId: string;
  readonly scopes: readonly LadderLevel[];     // purpose-scoped: which levels this link may render
  readonly revoked: boolean;
}

/** The purpose-scoped payload of one level, already derived. */
export interface LevelPayload {
  readonly level: LadderLevel;
  readonly narrative: string;        // the phenomenological rendering (self register; closed class)
  readonly metrics?: Readonly<Record<string, number | string>>; // metric-bearing (open class; auditor register)
}

export interface RenderRequest {
  readonly register: Register;
  readonly level: LadderLevel;
  readonly playerStage: Stage;       // AL3: presentation adapts to altitude
  readonly consent?: ConsentLink;    // auditor register REQUIRES a live grant (AL1/AL5)
}

export interface RenderedLevel {
  readonly level: LadderLevel;
  readonly registerClass: 'open' | 'closed';
  /** true when the caller may see this level at all. */
  readonly allowed: boolean;
  readonly reason: string;
  /** AL3 — presentation articulation chosen from the player's stage. */
  readonly presentation: 'concrete-markers' | 'standard' | 'full-structure';
  readonly payload?: LevelPayload;
}

function presentationFor(stage: Stage): RenderedLevel['presentation'] {
  const s = stageOrdinal(stage);
  if (s <= 1) return 'concrete-markers'; // Infrared/Magenta: concrete markers (22 §5 voice specs)
  if (s >= 5) return 'full-structure';   // Green+: the full multi-line structure
  return 'standard';
}

// Local import to avoid a cycle with Stage.ts
import { stageOrdinal } from './Stage.js';

/**
 * The single render path for the ladder. Same derivation in, register-scoped rendering out.
 * Throws nothing: an unauthorised request is a `allowed: false` record with its reason
 * (legibility — the player can always see WHY something is not shown).
 */
export function renderLevel(req: RenderRequest, payloads: ReadonlyMap<LadderLevel, LevelPayload>): RenderedLevel {
  const spec = LADDER_BY_LEVEL.get(req.level);
  if (!spec) throw new Error(`unknown ladder level '${req.level}'`);
  const presentation = presentationFor(req.playerStage);

  if (req.register === 'self') {
    // AL1: the self addresses any level directly — availability never varies with altitude
    // for the OPEN class. The CLOSED class is never rendered to the player at any stage
    // (MY-AD-0006; 20 §11.1).
    if (spec.registerClass === 'closed') {
      return { level: req.level, registerClass: spec.registerClass, allowed: false,
               reason: 'closed register class: never rendered to the player at any stage (20 §11.1); met only as narrative consequence', presentation };
    }
    return { level: req.level, registerClass: spec.registerClass, allowed: true,
             reason: 'open register class: player-readable at any stage (MY-AD-0006)', presentation,
             payload: payloads.get(req.level) };
  }

  // Auditor register: a consented traversal of the SAME ladder (no identity class, AL1).
  const consent = req.consent;
  if (!consent || consent.revoked) {
    return { level: req.level, registerClass: spec.registerClass, allowed: false,
             reason: 'no live consent grant — access is a player-issued, revocable link, re-checked at every render (AL5)', presentation };
  }
  if (!consent.scopes.includes(req.level)) {
    return { level: req.level, registerClass: spec.registerClass, allowed: false,
             reason: 'level outside the consent link\'s scope (purpose-bounded, 16 §2.4)', presentation };
  }
  // AL4: auditor descent is progressive — a scope grant to L5 implies the auditor may traverse
  // L1..L5 but the SELF-only levels are the same levels; progressive disclosure is enforced by
  // requiring the scopes to be contiguous from L1.
  const granted = [...consent.scopes].sort();
  const firstIdx = LADDER_LEVELS.indexOf(granted[0]);
  const lastIdx = LADDER_LEVELS.indexOf(granted[granted.length - 1]);
  const contiguous = lastIdx - firstIdx === granted.length - 1;
  const reqIdx = LADDER_LEVELS.indexOf(req.level);
  const belowTop = reqIdx <= LADDER_LEVELS.indexOf(granted[granted.length - 1]);
  if (!contiguous || !belowTop) {
    return { level: req.level, registerClass: spec.registerClass, allowed: false,
             reason: 'descent is progressive: the grant must be a contiguous run of levels (16 §10.4 AP3)', presentation };
  }
  return { level: req.level, registerClass: spec.registerClass, allowed: true,
           reason: 'consented traversal: scope-bounded grant, live at render (AL5)', presentation,
           payload: payloads.get(req.level) };
}

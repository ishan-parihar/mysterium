/**
 * The ScenarioContext envelope — 45 §6/§6.1
 * (`docs/foundations/45-personalization-and-context-pooling.md`).
 *
 * The object handed to the scenario-catalyst agent and, SCOPED, to its sub-agents. Two structural
 * rules are enforced here, not by convention:
 *
 * 1. §6.1 sub-agent alignment — the UDV is projected per role rather than passed whole. The rule
 *    behind the table: the more metric-bearing the role, the less of the UDV it may see, or
 *    relevance leaks into assessment.
 * 2. §6 `veiled` — what the LLM must not assert rides in the envelope (20).
 */

import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';
import type { Modality } from '../domain/enums.js';
import type { UserDimensionalityVector, Purpose, PreferenceBand, AnalogyBand, LifeConstraints } from './udv.js';
import type { PoleSelection } from './dialecticEngine.js';
import type { ComposedHolon } from './composition.js';

/** 45 §6 `pooled` — the §5.2 survivors, as library-typed refs. */
export interface PooledRefs {
  readonly world: readonly string[];
  readonly npcs: readonly string[];
  readonly scenarios: readonly string[];
}

/**
 * The polarity pool's selection (Phase 13 d10 L4, user-ratified surface): the TOP-1 primary the
 * prompt renders, the POLE it serves, and named alternates that stay HIDDEN from the prompt —
 * present only for authorized reads (`read_band`) and calibration telemetry. The pole is NAMED
 * to the scenario-catalyst so the rendering knows which flavour register it is speaking in, and
 * the calibration loop can see the polarity balance over time.
 */
export interface PooledSelection {
  /** Which pole this encounter serves (`poleDecision.ts` — familiar/unfamiliar/shadow-facing). */
  readonly pole: 'familiar' | 'unfamiliar' | 'shadow-facing';
  /** The winning candidate id — the ONE rendering the prompt conditions on. */
  readonly primary: string;
  /** Hidden alternates (same cell) — audit/telemetry only, never prompt content. */
  readonly alternates: readonly string[];
  /** The recorded rationale (replayable decision). */
  readonly reason: string;
}

/** The polarity resolution record attached to the envelope when a reading was captured (d10 L3).
 *  The READING itself never renders (it is a measurement — Veil); only that one was captured. */
export interface ResolutionStamp {
  readonly pairKey: string;
  readonly proposedBy: 'system1' | 'deterministic-fallback';
  readonly captured: boolean;
}

/** 45 §6 `analogicalBridge` — the three layers of §5.4, all three required. */
export interface AnalogicalBridge {
  /** The STRUCTURAL layer: C's structure mapped onto D' — the opposite pole (46 §5.1 refinement). */
  readonly structuralMap: string;
  /** The SURFACE layer: C expressed in D's vocabulary, register, imagery. */
  readonly surfaceMap: string;
  /** The STAKES layer: C connected to an aim in the player's purpose set (39). */
  readonly stakeHook: string | null;
  /** The fluent domain the surface renders in (D). */
  readonly domain: string;
  /** 45 §5.4's rotation budget: the fraction of encounters that must introduce a NEW domain. */
  readonly noveltyBudget: number;
}

/** 45 §6 — the full envelope (foreground scenario-catalyst agent only). */
export interface ScenarioContext {
  readonly udv: UserDimensionalityVector;
  readonly pooled: PooledRefs;
  readonly analogicalBridge: AnalogicalBridge | null;
  readonly catalystTarget: { readonly line: Line; readonly stage: Stage; readonly modality: Modality; readonly purpose: string };
  /** What the LLM must not assert (20) — carries into every sub-agent scope. */
  readonly veiled: readonly string[];
  /** The poles the dialectic engine selected — the HOW behind this envelope (46 §5). */
  readonly poles: PoleSelection | null;
  /** The composed entity this envelope instantiates, if composition already ran (46 §7 step 4). */
  readonly entity: ComposedHolon | null;
  /** The polarity pool's selection (d10 L4) — top-1 primary + named pole + hidden alternates.
   *  Null when the cell had no candidates at all (degradation, never fabricated). */
  readonly polarity: PooledSelection | null;
  /**
   * The pair this encounter ENGAGED in texture — `[surfaceTag, oppositeTag]` — present even when
   * `poles` is null (46 §4.3: an `undiscovered` pair may render as texture but is not a structural
   * candidate, so the dialectic engine defers and this is the only record of the pair worked).
   * The discovery writer (`undiscovered` → `active-tension`) reads THIS, never `poles`: selecting
   * structurally requires the pair to be `active-tension` already (46 §5.3), so a loop whose only
   * input is `poles` has no entry point. Null when no pole decision was made or the tag reflects to
   * itself (reflexive-safe, `46 §4.2`).
   */
  readonly engagedPair: readonly [string, string] | null;
  /** The resolution stamp (d10 L3) — that a reading was captured, never the reading itself. */
  readonly resolution: ResolutionStamp | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// §6.1 Sub-agent alignment — per-role scoped projections
// ─────────────────────────────────────────────────────────────────────────────

export type CouncilRole =
  | 'scenario-catalyst' | 'narrative-voice' | 'assessment' | 'curriculum-teacher' | 'safety'
  /** 
   * Added 2026-09-24 (council orthogonality audit, O8): the shadow-work pair — the Therapist and
   * J4 — had no row at all, though they handle the most delicate material. They receive the veto
   * list, the banded placement and the player's aims as STAKES, and never the interest graph or the
   * analogy internals: affinities must not be usable as levers in shadow-work.
   */
  | 'healing';

/** The UDV band names (45 §3) as the scope table uses them — exported so the orchestration layer
 *  can bind agent roles to scopes without re-spelling the vocabulary (`types.ts` re-exports). */
export type UdvBand = 'preference' | 'analogy' | 'purpose' | 'developmental' | 'interests' | 'aversions' | 'constraints';

export interface RoleScope {
  readonly role: CouncilRole;
  /** Which UDV bands this role receives. */
  readonly receives: readonly UdvBand[];
  /** What this role must NOT receive, stated for the audit surface (45 §6.1's last column). */
  readonly mustNotReceive: readonly string[];
}

/**
 * 45 §6.1's table as code. The metric-bearing roles are blind to personalization:
 * - assessment gets developmental + catalyst target ONLY — grading is evidence-only (42 §1.1);
 * - curriculum gets developmental + purpose as transfer targets, never analogy internals
 *   (they must not teach in the player's domain);
 * - safety gets aversions (veto list only) + crisis signals, never the interest graph;
 * - narrative/voice gets preference + analogy + purpose, never developmental numbers, and the
 *   aversion CONTENT stays with safety (narrative sees only the veto list).
 */
export const ROLE_SCOPES: Readonly<Record<CouncilRole, RoleScope>> = Object.freeze({
  'scenario-catalyst': Object.freeze({
    role: 'scenario-catalyst',
    receives: ['preference', 'analogy', 'purpose', 'developmental', 'interests', 'aversions', 'constraints'] as const,
    mustNotReceive: [] as const,
  }),
  'narrative-voice': Object.freeze({
    role: 'narrative-voice',
    receives: ['preference', 'analogy', 'purpose', 'aversions'] as const,
    mustNotReceive: ['developmental numbers', 'aversion content (only the veto list)'] as const,
  }),
  assessment: Object.freeze({
    role: 'assessment',
    receives: ['developmental'] as const,
    mustNotReceive: ['interest graph', 'purpose statements (grading is evidence-only, 42 §1.1)'] as const,
  }),
  'curriculum-teacher': Object.freeze({
    role: 'curriculum-teacher',
    receives: ['developmental', 'purpose', 'constraints'] as const,
    mustNotReceive: ['analogy internals (they must not teach in the player’s domain)'] as const,
  }),
  safety: Object.freeze({
    role: 'safety',
    receives: ['aversions'] as const,
    mustNotReceive: ['interest graph', 'analogy'] as const,
  }),
  healing: Object.freeze({
    role: 'healing',
    receives: ['aversions', 'developmental', 'purpose'] as const,
    mustNotReceive: ['interest graph', 'analogy internals (affinities must never be levers in shadow-work)'] as const,
  }),
});

/** The scoped view one role receives — a projection of the envelope, not the envelope. */
export interface ScopedEnvelope {
  readonly role: CouncilRole;
  readonly preference?: PreferenceBand;
  readonly analogy?: AnalogyBand;
  readonly purpose?: readonly Purpose[];
  readonly developmental?: UserDimensionalityVector['developmental'];
  readonly interests?: UserDimensionalityVector['interests'];
  readonly aversions?: readonly string[];
  readonly constraints?: LifeConstraints;
  readonly catalystTarget: ScenarioContext['catalystTarget'];
  readonly veiled: readonly string[];
  readonly poles: PoleSelection | null;
  readonly entity: ComposedHolon | null;
  /** The pole name ONLY (d10 L4) — every role may know which register the encounter spoke in;
   *  the primary/alternates/reason stay with the scenario-catalyst's full envelope. */
  readonly poleServed?: 'familiar' | 'unfamiliar' | 'shadow-facing';
}

/**
 * Scope the envelope for one council role (45 §6.1). The receives-list is the enforcement: a band
 * absent from `receives` is absent from the returned object — not flagged, not nulled, ABSENT.
 * `veiled` always passes through: the Veil binds every role (20). The pole NAME passes through
 * (d10 L4 — the register the encounter spoke in); the selection internals do not.
 */
export function scopeForRole(ctx: ScenarioContext, role: CouncilRole): ScopedEnvelope {
  const scope = ROLE_SCOPES[role];
  const out: { -readonly [K in keyof ScopedEnvelope]: ScopedEnvelope[K] } = {
    role,
    catalystTarget: ctx.catalystTarget,
    veiled: ctx.veiled,
    poles: ctx.poles,
    entity: ctx.entity,
    ...(ctx.polarity ? { poleServed: ctx.polarity.pole } : {}),
  };
  for (const band of scope.receives) {
    switch (band) {
      case 'preference': out.preference = ctx.udv.preference; break;
      case 'analogy': out.analogy = ctx.udv.analogy; break;
      case 'purpose': out.purpose = ctx.udv.purpose; break;
      case 'developmental': out.developmental = ctx.udv.developmental; break;
      case 'interests': out.interests = ctx.udv.interests; break;
      case 'aversions': out.aversions = ctx.udv.aversions; break;
      case 'constraints': out.constraints = ctx.udv.constraints; break;
    }
  }
  return out;
}

/** Assemble the envelope (46 §7 step 6 — ENVELOPE). */
export function buildScenarioContext(parts: {
  readonly udv: UserDimensionalityVector;
  readonly pooled: PooledRefs;
  readonly analogicalBridge: AnalogicalBridge | null;
  readonly catalystTarget: ScenarioContext['catalystTarget'];
  readonly veiled: readonly string[];
  readonly poles: PoleSelection | null;
  readonly entity: ComposedHolon | null;
  readonly polarity?: PooledSelection | null;
  readonly resolution?: ResolutionStamp | null;
  readonly engagedPair?: readonly [string, string] | null;
}): ScenarioContext {
  return {
    ...parts,
    engagedPair: parts.engagedPair ?? null,
    polarity: parts.polarity ?? null,
    resolution: parts.resolution ?? null,
  };
}

/**
 * The L4 prompt line — the ONE rendering plus its named pole (user-ratified surface). Renders
 * nothing about alternates, scores, or the reading itself; the alternates stay hidden, the
 * reading stays a measurement. Null when no polarity decision was made (degradation).
 */
export function polarityPromptLine(polarity: PooledSelection | null): string | null {
  if (!polarity) return null;
  return `[POLARITY] This encounter is rendered as the ${polarity.pole} pole — primary rendering ${polarity.primary}.`;
}

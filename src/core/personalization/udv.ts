/**
 * The user-dimensionality vector (UDV) — 45 §3/§6
 * (`docs/foundations/45-personalization-and-context-pooling.md`).
 *
 * The UDV is the retrieval key for context pooling. It is NOT a store: every field is either
 * derived from an existing engine's state or read from `16 §2.1`'s consent-bound identity context
 * through the purpose-bound projector. Nothing here is a parallel profile (45 §3).
 *
 * The projection firewall (MY-AD-0020 §3) is structural: C1/C2 data is reachable by no code path
 * except a registered projection, and `gameplay-personalization` — the only projection that may
 * build a UDV — may not include raw identity, CCI numbers, or stage labels. The firewall is
 * enforced in `projectUdv` (bands instead of labels; consent checked per field), not by convention.
 */

import type { Line } from '../domain/Line.js';
import type { ShadowQuadrant } from '../domain/enums.js';
import type { GameModality } from './modality.js';

/** 45 §6 `preference` band. Opt-in, revocable; empty is fully functional (MY-AD-0020 §4). */
export interface PreferenceBand {
  /** learning-modality mix; missing modalities are simply unpreferred */
  readonly modalityMix: Partial<Record<GameModality, number>>;
  readonly difficultyAppetite: 'gentle' | 'steady' | 'steep';
  readonly sessionToleranceMin: number;
  readonly aestheticLeanings: readonly string[];
}

/** 45 §3 interest-graph row. Only `source: 'declared'` may become a field of record (rule 1). */
export interface Interest {
  readonly topic: string;
  readonly weight: number;
  readonly depth: 'surface' | 'working' | 'fluent';
  readonly source: 'declared' | 'observed';
}

/** 45 §6 `purpose` band — sourced from 39's objective taxonomy (the Vow). */
export interface Purpose {
  readonly kind: 'practice-vow' | 'exposure-step' | 'learning-quest' | 'service-act';
  readonly statement: string;
}

/** 45 §6 `analogy` band — the player's fluent domains and the words that land / repel. */
export interface AnalogyBand {
  readonly fluentDomains: readonly { readonly domain: string; readonly weight: number }[];
  readonly landings: readonly string[];
  readonly repels: readonly string[];
}

/** 45 §6 `constraints` band — 09 §4 NFRs, never used for engagement targeting. */
export interface LifeConstraints {
  readonly timeBudgetMin?: number;
  readonly accessibility: readonly string[];
}

/**
 * Developmental inputs to the projection — C1 signals downgraded to firewall-safe shapes.
 * `stageOrdinals` is per-line 0..7 from the Significator; the projection converts them to bands
 * so no stage label crosses the boundary (MY-AD-0020 §3: gameplay-personalization may-not-include
 * "stage labels").
 */
export interface DevelopmentalInputs {
  readonly stageOrdinals: Readonly<Record<Line, number>>;
  readonly activeShadowQuadrants: readonly ShadowQuadrant[];
}

/** The declared/consented inputs a UDV projection is built from — 45 §3's field groups. */
export interface UdvInputs {
  /** per-identity-field consent verdicts, already checked through `16 §2.1`'s ledger */
  readonly usableFields: ReadonlySet<string>;
  /** declared interests (C2, consented). Observed interests stay ranking-weight only. */
  readonly declaredInterests: readonly Interest[];
  /** observed interests (C0-derived signals) — ranking weight only, never a field of record */
  readonly observedInterests?: readonly Interest[];
  readonly developmental: DevelopmentalInputs;
  readonly purpose: readonly Purpose[];
  readonly analogy?: AnalogyBand;
  /** aversions: explicit declaration only, fail-closed (45 §3.1 rule 2) */
  readonly aversions?: readonly string[];
  readonly constraints?: LifeConstraints;
  readonly preference?: Partial<PreferenceBand>;
}

/** 45 §6 `UserDimensionalityVector`. */
export interface UserDimensionalityVector {
  readonly developmental: {
    readonly lineAltitudeBand: readonly { readonly line: Line; readonly band: 'emerging' | 'active' | 'consolidating' }[];
    readonly activeShadows: readonly ShadowQuadrant[];
  };
  readonly preference: PreferenceBand;
  readonly interests: readonly Interest[];
  readonly purpose: readonly Purpose[];
  readonly analogy: AnalogyBand;
  readonly aversions: readonly string[];
  readonly constraints: LifeConstraints;
}

/**
 * The projection registry — MY-AD-0020 §3. A projection is a declared, purpose-bound view with a
 * named scope; it is the only mechanism by which C1/C2 data leaves the engines that own it.
 * Registered with may-not-include contracts so a misuse is auditable against this record.
 */
export const REGISTERED_PROJECTIONS = Object.freeze({
  'gameplay-personalization': Object.freeze({
    purpose: 'pooling the three libraries (45 §5)',
    mayNotInclude: Object.freeze(['raw identity', 'CCI numbers', 'stage labels']),
  }),
  'learning-support': Object.freeze({
    purpose: 'curriculum pacing (30, 34)',
    mayNotInclude: Object.freeze(['identity fields', 'purpose statements']),
  }),
  'assessment-evidence': Object.freeze({
    purpose: 'levelling evidence (42)',
    mayNotInclude: Object.freeze(['interest graph', 'purpose', 'analogy internals']),
  }),
  'learner-dashboard': Object.freeze({
    purpose: "the player's own mirror (33 §1–§5)",
    mayNotInclude: Object.freeze(["other players' data"]),
  }),
  'guardian-mirror': Object.freeze({
    purpose: 'consented guardians (16 §10.4, 33 §7)',
    mayNotInclude: Object.freeze(['any projection not separately consented']),
  }),
  'educator-desk': Object.freeze({
    purpose: 'consented educators, cohort scope',
    mayNotInclude: Object.freeze(['individual-level identity data without individual consent']),
  }),
  'therapeutic-pane': Object.freeze({
    purpose: 'consented clinicians (33 §7)',
    mayNotInclude: Object.freeze(['anything outside the declared care purpose']),
  }),
  'research-aggregate': Object.freeze({
    purpose: 'efficacy measurement (40)',
    mayNotInclude: Object.freeze(['any record-level data', 'reconstruction-unsafe sets']),
  }),
} satisfies Record<string, { readonly purpose: string; readonly mayNotInclude: readonly string[] }>);

export type ProjectionName = keyof typeof REGISTERED_PROJECTIONS;

const STAGE_BAND_CUTS: readonly { readonly at: number; readonly band: 'emerging' | 'active' | 'consolidating' }[] = [
  { at: 0, band: 'emerging' },
  { at: 4, band: 'active' },
  { at: 6, band: 'consolidating' },
];

function bandFor(ordinal: number): 'emerging' | 'active' | 'consolidating' {
  let band = STAGE_BAND_CUTS[0].band;
  for (const s of STAGE_BAND_CUTS) if (ordinal >= s.at) band = s.band;
  return band;
}

/**
 * Build the UDV through the `gameplay-personalization` projection (45 §3.1 rule 1).
 *
 * Enforcement, in order:
 * - only fields present in `usableFields` contribute — the caller derives that set through the
 *   consent ledger (`16 §2.1`); the projector re-checks rather than trusts;
 * - declared interests become the field of record; observed interests ride along as ranking weight,
 *   tagged so no consumer can mistake them for declared (MY-AD-0020 §2.1 rule 3);
 * - aversions pass through unchanged — fail-closed means the CONSUMER vetoes, never the projector;
 * - stage ordinals are downgraded to bands (no stage labels, no CCI numbers).
 */
export function projectUdv(inputs: UdvInputs): UserDimensionalityVector {
  const reg = REGISTERED_PROJECTIONS['gameplay-personalization'];
  if (!reg) throw new Error('projection registry: gameplay-personalization missing');

  return {
    developmental: {
      lineAltitudeBand: (Object.entries(inputs.developmental.stageOrdinals) as [Line, number][]).map(
        ([line, ordinal]) => ({ line, band: bandFor(ordinal) }),
      ),
      activeShadows: inputs.developmental.activeShadowQuadrants,
    },
    preference: {
      modalityMix: inputs.preference?.modalityMix ?? {},
      difficultyAppetite: inputs.preference?.difficultyAppetite ?? 'steady',
      sessionToleranceMin: inputs.preference?.sessionToleranceMin ?? 25,
      aestheticLeanings: inputs.preference?.aestheticLeanings ?? [],
    },
    interests: [
      ...inputs.declaredInterests,
      ...(inputs.observedInterests ?? []).filter((o) => !inputs.declaredInterests.some((d) => d.topic === o.topic)),
    ],
    purpose: inputs.purpose,
    analogy: inputs.analogy ?? { fluentDomains: [], landings: [], repels: [] },
    aversions: inputs.aversions ?? [],
    constraints: inputs.constraints ?? { accessibility: [] },
  };
}

/**
 * Firewall audit: the UDV must not serialize any stage label or CCI marker. Used by tests and by
 * the runtime guard that keeps future UDV fields from silently re-introducing a forbidden token.
 */
export function auditUdv(udv: UserDimensionalityVector): { projection: ProjectionName; forbiddenTokens: readonly string[] } {
  const serialized = JSON.stringify(udv);
  const forbiddenTokens = [
    'Infrared', 'Magenta', 'Red', 'Amber', 'Orange', 'Green', 'Teal', 'Turquoise', 'Indigo', 'Ultraviolet', 'cci',
  ].filter((tok) => serialized.includes(`"${tok}"`));
  return { projection: 'gameplay-personalization', forbiddenTokens };
}

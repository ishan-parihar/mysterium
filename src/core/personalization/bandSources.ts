/**
 * The UDV band sources — 45 §3's remaining field groups, assembled from REAL engine state.
 * Phase 13 d1 (`docs/audits/WIRING-CONTRAST-AUDIT-2026-09-23.md` §5).
 *
 * The audit found the live UDV carrying 3 of its 8 declared bands: the live seam supplied
 * developmental + declared interests + aversions, and hardcoded `purpose: []` while supplying no
 * `preference`, `analogy`, `constraints` or `observedInterests` — even though `pooling.ts` already
 * reads purpose and analogy as ranking inputs (lines 65–76). This module is the producer half.
 *
 * Laws held here (all from 45, none new):
 * - **Degradation (45 §5).** Every band falls back to its ratified default. A missing source is
 *   never an error, never a block: an empty band is fully functional (MY-AD-0020 §4).
 * - **Derive, don't duplicate (MY-RG-0015).** Nothing here stores anything. Purposes are read from
 *   39's vow text, preferences from the profile the player already wrote and the sessions they
 *   already played, observed interests from declared topics — each a projection of an existing
 *   store, never a second one.
 * - **Declared-over-observed (47 §3).** Observed interests are tagged `source: 'observed'` and
 *   `projectUdv` drops any whose topic is already declared — the field-of-record rule (45 §3.1).
 * - **Deterministic (MY-AD-0022).** Pure functions of their inputs; no clock reads, no LLM, no
 *   randomness. Replay yields byte-identical bands.
 */

import type { Interest, Purpose, AnalogyBand, PreferenceBand, LifeConstraints } from './udv.js';
import type { GameModality } from './modality.js';

/** The source shape a caller may supply — every field optional, every absence lawful. */
export interface UdvBandSources {
  /** 45 §6 `purpose` — from 39's objective taxonomy (the active Vows). */
  readonly purposes?: readonly Purpose[];
  /** 45 §6 `analogy` — fluent domains + the words that land / repel. Derived when omitted. */
  readonly analogy?: AnalogyBand;
  /**
   * 45 §6 `preference` — learning-modality mix, difficulty appetite, tolerance, aesthetics.
   * PARTIAL by design: what the caller declares (the profile's metaphor taste, its intensity)
   * merges over what the seam can EVIDENCE for itself (the median session length already on the
   * feed). An omitted field is derived at the seam, not silently defaulted (45 §5).
   */
  readonly preference?: Partial<PreferenceBand>;
  /** 45 §6 `constraints` — 09 §4 NFRs. */
  readonly constraints?: LifeConstraints;
  /** 45 §3 interest graph, observed half. Ranking weight only, never a field of record. */
  readonly observedInterests?: readonly Interest[];
}

/** A Vow as 39 stores it (the subset this projection reads). */
export interface VowLike {
  readonly text: string;
  readonly kind?: 'practice' | 'exposure' | 'learning' | 'service';
  readonly status?: 'active' | 'fulfilled' | 'lapsed' | 'renegotiated';
  readonly fulfilled?: boolean;
}

/** Profile preferences as `preferences.yaml` holds them (16 §2.1's consented surface, 45 §6). */
export interface ProfilePreferencesLike {
  readonly metaphorPreference?: string;
  readonly intensity?: string;
  readonly pacing?: string;
}

/** One played session, as the play history knows it. `modality` absent when the caller lacks it. */
export interface PlayedSessionLike {
  readonly modality?: GameModality;
  readonly durationMs: number;
}

/** Observed-engagement row (47 §3's observation half, already derived by the caller). */
export interface EngagementRowLike {
  readonly topic: string;
  readonly weight?: number;
}

/** The ratified defaults — a missing source degrades to exactly these (45 §5). */
export const DEFAULT_PREFERENCE: PreferenceBand = Object.freeze({
  modalityMix: {},
  difficultyAppetite: 'steady',
  sessionToleranceMin: 25,
  aestheticLeanings: [],
});

export const DEFAULT_ANALOGY: AnalogyBand = Object.freeze({
  fluentDomains: [],
  landings: [],
  repels: [],
});

export const DEFAULT_CONSTRAINTS: LifeConstraints = Object.freeze({ accessibility: [] });

/** 39's vow kinds → 45 §6's purpose kinds. One taxonomy, two spellings (no second vocabulary). */
const VOW_KIND_TO_PURPOSE: Readonly<Record<string, Purpose['kind']>> = Object.freeze({
  practice: 'practice-vow',
  exposure: 'exposure-step',
  learning: 'learning-quest',
  service: 'service-act',
});

/**
 * The purpose band from 39's objective taxonomy: ACTIVE vows only.
 * A fulfilled, lapsed or renegotiated vow no longer states what the player is aiming at, so it
 * carries no stake — including it would aim catalyst at a finished intention (45 §5.4's stakeHook).
 */
export function purposesFromVows(vows: readonly VowLike[]): Purpose[] {
  const out: Purpose[] = [];
  for (const v of vows) {
    const status = v.status ?? (v.fulfilled ? 'fulfilled' : 'active');
    if (status !== 'active') continue;
    const kind = VOW_KIND_TO_PURPOSE[v.kind ?? 'practice'];
    if (!kind) continue;
    const statement = v.text.trim();
    if (statement.length === 0) continue;
    out.push({ kind, statement });
  }
  return out;
}

/**
 * The player's self-declared goals (16 §2.1's consented profile surface) as aims.
 *
 * A goal is stated without a kind, so it enters as a `learning-quest` — the general aim shape.
 * Both sources feed ONE purpose band: the band is a view over aims, and 39's vows plus the
 * profile's declared goals are the two places an aim is recorded (45 §3's derive-don't-duplicate).
 * Statements already present as vows are skipped, so an aim stated both ways appears once.
 */
export function purposesFromGoals(
  goals: readonly string[],
  existing: readonly Purpose[] = [],
): Purpose[] {
  const seen = new Set(existing.map((p) => p.statement.trim().toLowerCase()));
  const out: Purpose[] = [];
  for (const g of goals) {
    const statement = g.trim();
    if (statement.length === 0) continue;
    const key = statement.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: 'learning-quest', statement });
  }
  return out;
}

/**
 * The analogy band (45 §5.4) — the player's fluent domains, derived from the interest graph.
 *
 * `fluentDomains` is what `pooling.ts` consumes (line 69): the topics the player already cares
 * about become the vocabulary catalyst is rendered IN. `landings` are the topics with working or
 * fluent depth (the ones that actually land); `repels` are the declared aversions — the veto list,
 * passed through unchanged because fail-closed means the CONSUMER vetoes, never the producer.
 */
export function analogyFromInterests(
  interests: readonly Interest[],
  aversions: readonly string[] = [],
): AnalogyBand {
  if (interests.length === 0 && aversions.length === 0) return DEFAULT_ANALOGY;
  const seen = new Set<string>();
  const fluentDomains: { domain: string; weight: number }[] = [];
  const landings: string[] = [];
  for (const i of interests) {
    const topic = i.topic.trim();
    if (topic.length === 0 || seen.has(topic)) continue;
    seen.add(topic);
    fluentDomains.push({ domain: topic, weight: i.weight });
    if (i.depth === 'working' || i.depth === 'fluent') landings.push(topic);
  }
  return { fluentDomains, landings, repels: [...aversions] };
}

/** Profile intensity → the difficulty appetite band. Unknown values degrade (never guess wildly). */
function appetiteFromIntensity(intensity: string | undefined): PreferenceBand['difficultyAppetite'] {
  switch ((intensity ?? '').toLowerCase()) {
    case 'gentle': case 'low': case 'soft': return 'gentle';
    case 'intense': case 'high': case 'steep': return 'steep';
    default: return 'steady';
  }
}

/** Clamp a tolerance to the band's lawful range (10–90 min) — 09 §4's session NFR. */
function clampTolerance(minutes: number): number {
  if (!Number.isFinite(minutes)) return DEFAULT_PREFERENCE.sessionToleranceMin;
  return Math.max(10, Math.min(90, Math.round(minutes)));
}

/** Median of a numeric list (deterministic; empty → null). */
function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

/**
 * The preference band (45 §6) from what the player ALREADY declared and ALREADY played.
 *
 * - `modalityMix` — the share of played sessions per modality, normalized to the most-played
 *   modality. Missing modalities are simply unpreferred (that is the band's own semantics).
 * - `sessionToleranceMin` — the MEDIAN session length, clamped 10–90. Median, not mean: one
 *   abandoned 2-minute session must not redefine the player's tolerance.
 * - `difficultyAppetite` — from the profile's declared intensity.
 * - `aestheticLeanings` — the declared metaphor preference, which is what 22 §4.4's
 *   `vocabularyBand` renders in.
 *
 * With no history and no profile this returns {@link DEFAULT_PREFERENCE} exactly.
 */
export function preferenceFromHistory(input: {
  readonly profile?: ProfilePreferencesLike;
  readonly sessions?: readonly PlayedSessionLike[];
}): PreferenceBand {
  const sessions = input.sessions ?? [];
  const counts = new Map<GameModality, number>();
  for (const s of sessions) {
    if (!s.modality) continue;
    counts.set(s.modality, (counts.get(s.modality) ?? 0) + 1);
  }
  const max = counts.size > 0 ? Math.max(...counts.values()) : 0;
  const modalityMix: Partial<Record<GameModality, number>> = {};
  for (const [modality, count] of counts) modalityMix[modality] = count / max;

  const toleranceMedian = median(sessions.map((s) => s.durationMs / 60_000));
  const leanings = (input.profile?.metaphorPreference ?? '').trim();

  return {
    modalityMix,
    difficultyAppetite: appetiteFromIntensity(input.profile?.intensity),
    sessionToleranceMin: toleranceMedian === null ? DEFAULT_PREFERENCE.sessionToleranceMin : clampTolerance(toleranceMedian),
    aestheticLeanings: leanings.length > 0 ? [leanings] : [],
  };
}

/** Weight → depth. The interest graph's own ladder, applied to observed evidence (47 §5). */
function depthFor(weight: number): Interest['depth'] {
  if (weight >= 0.7) return 'fluent';
  if (weight >= 0.4) return 'working';
  return 'surface';
}

/**
 * The observed half of the interest graph (47 §3) — ranking weight only.
 *
 * Every row is tagged `source: 'observed'`, and `projectUdv` then drops any topic the player has
 * already DECLARED: the declared statement is the field of record, the observation never overrides
 * it (45 §3.1 rule 1). A row with an empty topic is dropped — an observation with no subject is
 * not evidence.
 */
export function observedFromEngagement(rows: readonly EngagementRowLike[]): Interest[] {
  const out: Interest[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const topic = row.topic.trim();
    if (topic.length === 0 || seen.has(topic)) continue;
    seen.add(topic);
    const weight = Number.isFinite(row.weight) ? Math.max(0, Math.min(1, row.weight!)) : 0.5;
    out.push({ topic, weight, depth: depthFor(weight), source: 'observed' });
  }
  return out;
}

/**
 * The session lengths already on the feed — the in-seam source for `sessionToleranceMin`.
 *
 * Read through the PLANNING projection because durations are planning input, and read-only in every
 * case: the feed is a ledger, and the UDV is a view over it, never a second store (45 §3).
 */
export function sessionDurationsFromFeed(
  entries: readonly { readonly ref: unknown }[],
): PlayedSessionLike[] {
  const out: PlayedSessionLike[] = [];
  for (const e of entries) {
    const ref = e.ref as { startedAtMs?: number; endedAtMs?: number } | undefined;
    if (!ref || typeof ref.startedAtMs !== 'number' || typeof ref.endedAtMs !== 'number') continue;
    const durationMs = ref.endedAtMs - ref.startedAtMs;
    if (!Number.isFinite(durationMs) || durationMs <= 0) continue;
    out.push({ durationMs });
  }
  return out;
}

/**
 * Assemble the band sources. Every field is optional and every absence degrades to the ratified
 * default — this function is total, and it never throws.
 *
 * The analogy band is DERIVED here from the interest graph when the caller supplies none, because
 * that derivation needs nothing the seam does not already have: the declared interests and the
 * aversions. That single derivation is what turns 45 §5.4's analogical resonance from a documented
 * mechanism into a live ranking input.
 */
export function deriveBandSources(input: {
  readonly declaredInterests: readonly Interest[];
  readonly aversions?: readonly string[];
  readonly purposes?: readonly Purpose[];
  readonly preference?: Partial<PreferenceBand>;
  readonly constraints?: LifeConstraints;
  readonly observedInterests?: readonly Interest[];
  readonly analogy?: AnalogyBand;
}): UdvBandSources {
  return {
    purposes: input.purposes ?? [],
    analogy: input.analogy ?? analogyFromInterests(input.declaredInterests, input.aversions ?? []),
    preference: { ...DEFAULT_PREFERENCE, ...(input.preference ?? {}) },
    constraints: input.constraints ?? DEFAULT_CONSTRAINTS,
    observedInterests: input.observedInterests ?? [],
  };
}

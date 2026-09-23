/**
 * The rater cohort — plan Phase 14 d7 (`12 §5.4` applied to preference instruments; `47 §7/§9`
 * check 8).
 *
 * `probeValidation.ts` is the *synthetic* harness: it answers "would this instrument discriminate
 * at all?" over seeded personas. This module is the other half of K1 — the part that only REAL
 * raters can supply. It is deliberately pure: it holds no cohort, reads no files, and never flips
 * `rvPassed`. It takes administrations in and returns statistics out, so the same functions serve
 * a CLI run, a calibration script and a test.
 *
 * The two RV dimensions the statistics cover:
 *
 * - **RV3 known-answer stability** — an administration may be taken *as a named archetype* (the
 *   rater answers as, say, the options-first holder). When the archetype's pole is one of the
 *   probe's poles, the rater has a known answer and their agreement with it is measurable.
 * - **RV1 reliability** — across administrations of the same probe, how much do raters agree with
 *   each other? Pairwise (not modal) agreement is the honest measure: a majority can be unanimous
 *   in error, and the statistic a real rater would recognise is "two raters picked the same pole".
 *
 * RV2/RV4/RV5 are the synthetic harness's (coverage, position-lock, altitude leak); RV6/RV7 are
 * `probeThresholds.ts`'s (placement and drift). This split is the point: each dimension is measured
 * by the instrument that can actually see it.
 *
 * Spec: `docs/foundations/12-drive-assessment-mechanics.md` §5.4 · `47-preference-inference-and-scaffolding.md` §7.
 */

import type { Probe } from './probeSet.js';
import type { TagId } from '../world/tags/types.js';

/** One rater's administration of one probe. */
export interface RaterAdministration {
  readonly raterId: string;
  readonly probeId: string;
  /** The pole this rater chose for the player they were shown (or as themselves). */
  readonly pole: TagId;
  /**
   * The archetype the rater answered AS, when they were given one. `null` for a self/free
   * administration — those carry no known answer, so they feed RV1 and not RV3.
   */
  readonly asArchetypeTag: TagId | null;
  /** Where the rater's pole sits relative to the probe: A-pole, B-pole, or neither (invalid). */
  readonly at: number;
}

/** Per-probe statistics over a cohort. */
export interface ProbeAgreementStat {
  readonly probeId: string;
  /** Administrations that named one of this probe's poles (invalid entries are excluded, not scored). */
  readonly n: number;
  /** Administrations dropped because the named pole is not one of this probe's two poles. */
  readonly invalid: number;
  /**
   * RV1: the **weakest** within-condition pairwise agreement — the share of rater PAIRS that agree,
   * ties included (no pair is dropped for disagreeing), computed inside each known-answer condition
   * and reduced to its minimum. `null` when no condition has two administrations to pair.
   *
   * Why per-condition, and why the minimum: two raters told to hold pole A and two told to hold
   * pole B are a perfectly reliable instrument — their disagreement is the *instruction*, not
   * noise. Pooling them measures the archetype mix, not the instrument (the first run of this
   * statistic did exactly that and rated a conforming probe at 0.33). And an instrument is only as
   * reliable as its least reliable condition, so the weakest group is the honest number.
   */
  readonly pairwiseAgreement: number | null;
  /** How many conditions had at least two administrations — the groups `pairwiseAgreement` reduced. */
  readonly agreementGroups: number;
  /** The pole the most raters named, or `null` on a tie (a tie is a real signal, not a value). */
  readonly modalPole: TagId | null;
  /** RV3: among administrations with a known answer that names one of the poles, the share correct. */
  readonly knownAnswerAccuracy: number | null;
  readonly knownAnswerN: number;
}

/** Cohort-level statistics. */
export interface CohortStat {
  readonly perProbe: readonly ProbeAgreementStat[];
  /** Total valid administrations across every probe. */
  readonly administrations: number;
  /** Administrations naming a pole the probe does not own — usually a mis-keyed rater id, so it is
   *  counted at cohort level rather than silently absorbed per probe. */
  readonly invalidAdministrations: number;
  /** Distinct rater ids seen — the number the `minN` threshold is really about (a single rater
   *  administered 40 times is one rater, not a cohort). */
  readonly raters: number;
}

/** Does this probe own that pole? An administration naming an outside pole is invalid, not a vote. */
function probeOwns(probe: Probe, pole: TagId): boolean {
  return pole === probe.poleA || pole === probe.poleB;
}

/** Pairwise agreement within one group, ties included, so a disagreeing pair is never dropped. */
function groupAgreement(poles: readonly TagId[]): number | null {
  if (poles.length < 2) return null;
  let agree = 0;
  let pairs = 0;
  for (let i = 0; i < poles.length; i += 1) {
    for (let j = i + 1; j < poles.length; j += 1) {
      pairs += 1;
      if (poles[i] === poles[j]) agree += 1;
    }
  }
  return pairs === 0 ? null : agree / pairs;
}

/**
 * RV1 — reliability: pairwise agreement inside each known-answer condition, reduced to the weakest.
 * A free (self) administration is its own condition: it carries no instruction, so it can only be
 * compared with other free administrations.
 */
function weakestConditionAgreement(grouped: ReadonlyMap<TagId | null, readonly TagId[]>): { agreement: number | null; groups: number } {
  let weakest: number | null = null;
  let groups = 0;
  for (const poles of grouped.values()) {
    const a = groupAgreement(poles);
    if (a === null) continue;
    groups += 1;
    if (weakest === null || a < weakest) weakest = a;
  }
  return { agreement: weakest, groups };
}

/** The pole with a strict majority of the votes, or null on a tie. */
function modalPole(poles: readonly TagId[]): TagId | null {
  const tally = new Map<TagId, number>();
  for (const p of poles) tally.set(p, (tally.get(p) ?? 0) + 1);
  let best: TagId | null = null;
  let bestN = 0;
  let tied = false;
  for (const [p, n] of tally) {
    if (n > bestN) { best = p; bestN = n; tied = false; }
    else if (n === bestN) tied = true;
  }
  return tied ? null : best;
}

/** Summarise one probe's administrations (RV1 + RV3). */
export function summariseProbe(probe: Probe, administrations: readonly RaterAdministration[]): ProbeAgreementStat {
  const mine = administrations.filter((a) => a.probeId === probe.id);
  const valid = mine.filter((a) => probeOwns(probe, a.pole));
  const invalid = mine.length - valid.length;
  const poles = valid.map((a) => a.pole);

  // RV3 — a known answer only exists when the administration was taken as an archetype whose pole
  // is one of THIS probe's poles. Any other archetype is a rating of a different distinction and
  // must not be scored as a miss.
  const scored = valid.filter((a) => a.asArchetypeTag !== null && probeOwns(probe, a.asArchetypeTag));
  const correct = scored.filter((a) => a.pole === a.asArchetypeTag);

  const grouped = new Map<TagId | null, TagId[]>();
  for (const a of valid) {
    const key = a.asArchetypeTag ?? null;
    const bucket = grouped.get(key);
    if (bucket) bucket.push(a.pole); else grouped.set(key, [a.pole]);
  }
  const agreement = weakestConditionAgreement(grouped);

  return {
    probeId: probe.id,
    n: valid.length,
    invalid,
    pairwiseAgreement: agreement.agreement,
    agreementGroups: agreement.groups,
    modalPole: modalPole(poles),
    knownAnswerAccuracy: scored.length === 0 ? null : correct.length / scored.length,
    knownAnswerN: scored.length,
  };
}

/** Summarise a whole cohort: per-probe statistics plus the cohort-level counts a threshold needs. */
export function summariseCohort(probes: readonly Probe[], administrations: readonly RaterAdministration[]): CohortStat {
  const perProbe = probes.map((p) => summariseProbe(p, administrations));
  return {
    perProbe,
    administrations: perProbe.reduce((sum, s) => sum + s.n, 0),
    invalidAdministrations: perProbe.reduce((sum, s) => sum + s.invalid, 0),
    raters: new Set(administrations.map((a) => a.raterId)).size,
  };
}

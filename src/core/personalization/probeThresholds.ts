/**
 * Probe thresholds, adjudication and the band-flip retirement condition — plan Phase 14 d7
 * (K1: "instrumentation plus a synthetic pilot"; user-ratified 2026-09-24).
 *
 * `probeValidation.ts` answers "does this instrument discriminate?"; `probeRaterCohort.ts` answers
 * "do raters agree?". This module is where the two meet the DECISION: what counts as passing, what
 * happens when a passing instrument stops passing, and — the ratified scope — what a synthetic
 * pilot may and may not claim.
 *
 * The law the whole file obeys: **synthetic personas are not real raters.** A pilot over scripted
 * personas can catch an *instrument defect* (an unstable probe, an altitude leak) and can calibrate
 * the thresholds so they are not arbitrary. It cannot certify an instrument. So:
 *
 * - Every threshold carries its `provenance`. `PROVISIONAL_SYNTHETIC` is explicitly not a
 *   certification; `PROVISIONAL_RATERS` is the state a real cohort leaves behind, and it is still
 *   provisional until the retirement condition has had a chance to fire on live readings.
 * - `adjudicate` returns `'insufficient'` rather than `'fail'` when the evidence is thin. A probe
 *   nobody administered is unknown, not bad — collapsing the two is how a thin cohort silently
 *   "validates" an instrument.
 * - `rvPassed` is never written here. The verdict is returned; flipping the flag on the instrument
 *   is a deliberate authoring act, recorded with its provenance.
 *
 * RV6 (active-stage placement) and RV7 (drift) live here because both are properties of ADMINISTRATION
 * rather than of the instrument's construction: placement is which archetype the probe was answered
 * as, drift is whether live readings still agree with the known answer.
 *
 * Spec: `docs/foundations/12-drive-assessment-mechanics.md` §5.4 · `47-preference-inference-and-scaffolding.md` §7/§9 check 8.
 */

import type { Probe, ProbeReading, RVDimension } from './probeSet.js';
import type { TagId } from '../world/tags/types.js';
import type { CohortStat, ProbeAgreementStat, RaterAdministration } from './probeRaterCohort.js';
import { summariseCohort } from './probeRaterCohort.js';
import type { SetRvResult } from './probeValidation.js';
import { runProbeRvHarness, harnessFailures } from './probeValidation.js';

// ─────────────────────────────────────────────────────────────────────────────
// Thresholds (never bare numbers)
// ─────────────────────────────────────────────────────────────────────────────

/** Where a threshold came from. The provenance travels WITH the number — a bare cut-off is a claim
 *  nobody can audit, which is the failure `12 §5.4`'s protocol exists to prevent. */
export type ThresholdProvenance = 'provisional-synthetic-pilot' | 'provisional-real-raters';

export interface ProbeThresholds {
  /** Minimum VALID administrations for a probe to be adjudicable at all (RV1 needs pairs). */
  readonly minN: number;
  /** Minimum distinct raters — a single rater repeating themselves is not a cohort. */
  readonly minRaters: number;
  /** RV1: minimum pairwise agreement. */
  readonly minPairwiseAgreement: number;
  /** RV6/RV3: minimum known-answer accuracy; `null` means "not required at this provenance". */
  readonly minKnownAnswerAccuracy: number | null;
  readonly provenance: ThresholdProvenance;
  /** Plain-language note carried into every report so a reader cannot mistake the standing. */
  readonly note: string;
}

/**
 * The thresholds a synthetic pilot may justify. The numbers are deliberately strict rather than
 * tuned: a pilot can demonstrate that a conforming instrument is POSSIBLE, and a loose threshold
 * would let the pilot's own optimism become the certification standard.
 */
export const PILOT_THRESHOLDS: ProbeThresholds = Object.freeze({
  minN: 4,
  minRaters: 2,
  minPairwiseAgreement: 0.8,
  minKnownAnswerAccuracy: 0.8,
  provenance: 'provisional-synthetic-pilot',
  note: 'provisional: calibrated over scripted personas, which are NOT raters — this can reject an instrument, never certify one',
});

/** Placement (RV6) is what a real cohort adds: the probes must land on the archetype they claim. */
export const MIN_RATERS_FOR_CERTIFICATION = 5;

// ─────────────────────────────────────────────────────────────────────────────
// Adjudication
// ─────────────────────────────────────────────────────────────────────────────

/** Per-probe verdict. `insufficient` is a distinct outcome from `fail` (see the module doc). */
export type RVVerdict = 'pass' | 'fail' | 'insufficient';

export interface ProbeAdjudication {
  readonly probeId: string;
  readonly verdict: RVVerdict;
  /** The RV dimensions this adjudication actually spoke to. */
  readonly dimensions: readonly RVDimension[];
  readonly reasons: readonly string[];
}

export interface CohortAdjudication {
  readonly perProbe: readonly ProbeAdjudication[];
  readonly thresholds: ProbeThresholds;
  /** Probes a real cohort could certify (all dimensions evidenced). */
  readonly certifiable: readonly string[];
  /** Probes the evidence rejects — the class the pilot exists to catch. */
  readonly rejected: readonly string[];
  /** Probes with too little evidence to decide. */
  readonly undecided: readonly string[];
}

function adjudicateOne(probeId: string, stat: ProbeAgreementStat, thresholds: ProbeThresholds): ProbeAdjudication {
  const reasons: string[] = [];
  const dimensions: RVDimension[] = [];

  if (stat.n < thresholds.minN) {
    return { probeId, verdict: 'insufficient', dimensions: [], reasons: [`only ${stat.n} valid administration(s); ${thresholds.minN} required for RV1`] };
  }
  dimensions.push('RV1-reliability');

  // RV1 — reliability. A null here means fewer than two valid administrations, already excluded by
  // minN except when minN is 1; treat it as a failure of the evidence rather than of the probe.
  if (stat.pairwiseAgreement === null || stat.pairwiseAgreement < thresholds.minPairwiseAgreement) {
    reasons.push(`RV1: pairwise agreement ${stat.pairwiseAgreement === null ? 'undefined' : stat.pairwiseAgreement.toFixed(2)} below ${thresholds.minPairwiseAgreement}`);
  }

  // RV3/RV6 — known-answer accuracy, but ONLY where the threshold demands it. Requiring a known
  // answer at every provenance would silently forbid self-administration, which is the only way
  // most instruments ever get their first readings.
  if (thresholds.minKnownAnswerAccuracy !== null) {
    dimensions.push('RV3-known-answer-stability');
    if (stat.knownAnswerN === 0) {
      reasons.push('RV3: no administration carried an archetype whose pole is this probe\'s — known-answer stability is unmeasured');
    } else if (stat.knownAnswerAccuracy === null || stat.knownAnswerAccuracy < thresholds.minKnownAnswerAccuracy) {
      reasons.push(`RV3: known-answer accuracy ${stat.knownAnswerAccuracy === null ? 'undefined' : stat.knownAnswerAccuracy.toFixed(2)} below ${thresholds.minKnownAnswerAccuracy}`);
    }
  }

  if (reasons.length === 0) return { probeId, verdict: 'pass', dimensions, reasons: [] };
  // Thin evidence is `insufficient`, not `fail`: a probe nobody administered is unknown. A probe
  // that WAS administered and disagreed is a genuine reject.
  const thin = stat.n < thresholds.minN * 2 && stat.knownAnswerN === 0 && thresholds.minKnownAnswerAccuracy !== null;
  return { probeId, verdict: thin ? 'insufficient' : 'fail', dimensions, reasons };
}

/**
 * Adjudicate a cohort against thresholds. Statistics in, verdict out — pure, and the only shape
 * that works for a caller holding administrations rather than probes (a rater-facing surface).
 */
export function adjudicateCohort(stat: CohortStat, thresholds: ProbeThresholds): CohortAdjudication {
  return finishAdjudication(stat.perProbe.map((s) => adjudicateOne(s.probeId, s, thresholds)), thresholds);
}

/** The form the calibration path uses: it holds the probes, so the cohort is summarised here. */
export function adjudicateProbes(
  probes: readonly Probe[],
  administrations: readonly RaterAdministration[],
  thresholds: ProbeThresholds,
): CohortAdjudication {
  return adjudicateCohort(summariseCohort(probes, administrations), thresholds);
}

function finishAdjudication(perProbe: readonly ProbeAdjudication[], thresholds: ProbeThresholds): CohortAdjudication {
  return {
    perProbe,
    thresholds,
    certifiable: perProbe.filter((p) => p.verdict === 'pass').map((p) => p.probeId),
    rejected: perProbe.filter((p) => p.verdict === 'fail').map((p) => p.probeId),
    undecided: perProbe.filter((p) => p.verdict === 'insufficient').map((p) => p.probeId),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RV7 — the band-flip retirement condition
// ─────────────────────────────────────────────────────────────────────────────

export interface BandFlip {
  readonly probeId: string;
  readonly readings: number;
  /** The share of LIVE validated readings that disagree with the probe's known-answer pole. */
  readonly disagreement: number;
  readonly reason: string;
}

/**
 * RV7 — drift monitoring. Once an instrument seeds a T1 field, its live readings must keep agreeing
 * with what it was validated to measure. When they stop, the instrument is retired: the readings
 * were real, but the field they were seeding is no longer trustworthy, and leaving it in place is
 * worse than removing it.
 *
 * The window is a reading count, not a time: a probe is played a handful of times per player, so a
 * clock would retire instruments for being unpopular. `minReadings` makes the condition quiet until
 * there is something to judge — an instrument with two readings is not drifting, it is new.
 */
export function detectBandFlips(
  probes: readonly Probe[],
  readings: readonly ProbeReading[],
  minReadings = 6,
  maxDisagreement = 0.4,
): readonly BandFlip[] {
  const out: BandFlip[] = [];
  for (const probe of probes) {
    // Only VALIDATED readings count: a log-only reading never seeded a field, so its disagreement
    // is not drift — it is exactly why the reading was held back.
    const mine = readings.filter((r) => r.probeId === probe.id && r.instrumentValidated);
    if (mine.length < minReadings) continue;
    const expected = probe.poleA;
    const disagree = mine.filter((r) => r.pole !== expected).length;
    const share = disagree / mine.length;
    if (share > maxDisagreement) {
      out.push({
        probeId: probe.id,
        readings: mine.length,
        disagreement: share,
        reason: `RV7: ${(share * 100).toFixed(0)}% of ${mine.length} live validated readings disagree with the validated pole — retire the instrument (its readings still stand; the field it seeds does not)`,
      });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// The synthetic pilot (K1's ratified scope)
// ─────────────────────────────────────────────────────────────────────────────

/** A scripted rater: a persona reused as a cohort member. */
export interface PilotRater {
  readonly id: string;
  /** The archetype this scripted rater answers AS on every probe — an A-pole holder of whatever
   *  probe they are given (a `constant-A`-style respondent), which is what makes their answers a
   *  known answer per probe rather than a fixed tag. */
  readonly answersAs: 'pole-A' | 'pole-B';
}

export interface PilotReport {
  /** The synthetic discrimination run (probeValidation.ts). */
  readonly harness: SetRvResult;
  /** Instrument defects the battery caught — non-empty means the pilot FAILED the library. */
  readonly harnessFailures: readonly string[];
  /** The cohort statistics over the scripted raters. */
  readonly cohort: CohortStat;
  /** The adjudication under the pilot thresholds. */
  readonly adjudication: CohortAdjudication;
  /** The thresholds, with provenance attached — the thing this pilot is allowed to say. */
  readonly thresholds: ProbeThresholds;
  readonly passes: boolean;
}

/** Turn a scripted rater's constant-A/B behaviour into administrations with known answers. */
function administrationsFor(probes: readonly Probe[], rater: PilotRater): RaterAdministration[] {
  return probes.map((p, i) => ({
    raterId: rater.id,
    probeId: p.id,
    pole: rater.answersAs === 'pole-A' ? p.poleA : p.poleB,
    // The scripted rater has a known answer BY CONSTRUCTION: they were told to hold one pole of
    // this distinction. That is exactly what a real known-answer administration is.
    asArchetypeTag: rater.answersAs === 'pole-A' ? p.poleA : p.poleB,
    at: i,
  }));
}

/**
 * Run the pilot: the synthetic battery + a scripted cohort, adjudicated under `PILOT_THRESHOLDS`.
 * This is K1's executable half. It is honest about its standing in one line: the thresholds it
 * returns are `provisional-synthetic-pilot`, and `passes` means "no instrument defect was found",
 * never "these instruments are certified".
 */
export function runProbePilot(
  probes: readonly Probe[],
  raters: readonly PilotRater[] = [
    { id: 'pilot-rater-a', answersAs: 'pole-A' },
    { id: 'pilot-rater-b', answersAs: 'pole-B' },
    { id: 'pilot-rater-c', answersAs: 'pole-A' },
  ],
  thresholds: ProbeThresholds = PILOT_THRESHOLDS,
): PilotReport {
  const harness = runProbeRvHarness(probes, 8);
  const failures = harnessFailures(harness);
  // Two administrations per rater per probe: a cohort needs a pair to measure agreement, and one
  // administration per rater would make RV1 undefined for every probe.
  const administrations = raters.flatMap((r) => [...administrationsFor(probes, r), ...administrationsFor(probes, r)]);
  const cohort = summariseCohort(probes, administrations);
  const adjudication = adjudicateProbes(probes, administrations, thresholds);
  return {
    harness,
    harnessFailures: failures,
    cohort,
    adjudication,
    thresholds,
    passes: failures.length === 0 && adjudication.rejected.length === 0,
  };
}

/** One paragraph a human (or a log) can read: the pilot's standing, in its own words. */
export function describePilot(report: PilotReport): string {
  const t = report.thresholds;
  return [
    `${report.cohort.perProbe.length} probe(s) · ${report.cohort.administrations} administration(s) · ${report.cohort.raters} scripted rater(s)`,
    `thresholds: ${t.provenance} (minN ${t.minN}, agreement ≥ ${t.minPairwiseAgreement}${t.minKnownAnswerAccuracy === null ? '' : `, known-answer ≥ ${t.minKnownAnswerAccuracy}`})`,
    `adjudication: ${report.adjudication.certifiable.length} pass · ${report.adjudication.rejected.length} rejected · ${report.adjudication.undecided.length} undecided`,
    report.harnessFailures.length > 0 ? `instrument defects: ${report.harnessFailures.join('; ')}` : 'instrument defects: none',
    `standing: ${t.note}`,
  ].join('\n  ');
}

/** Exported for the calibration path: the pole an instrument was validated to measure. */
export function validatedPole(probe: Probe): TagId {
  return probe.poleA;
}

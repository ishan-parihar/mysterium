/**
 * The probe set — 47 §7 (`docs/foundations/47-preference-inference-and-scaffolding.md`).
 *
 * `probed` provenance needs an instrument indistinguishable from play (AGENTS.md §5.4 — the game
 * is never diagnostic to the user). A probe is a PLAYABLE ENCOUNTER that discriminates between two
 * poles of a T1 distinction by confronting the player with a situation where the two would choose
 * differently — never a questionnaire item.
 *
 * Validation: a probe that seeds a T1 field of record must pass 12 §5.4's RV1–RV7. An unvalidated
 * probe may still run, but its readings are log-only and may not leave the weight/ephemeral band.
 * Declinable: a refused probe yields no reading and the refusal is NOT recorded (§5.2).
 */

import type { TagId } from '../world/tags/types.js';

/** 12 §5.4's RV dimensions (the rubric-validation protocol for implicit instruments). */
export const RV_DIMENSIONS = [
  'RV1-reliability',
  'RV2-coverage-and-shadow-specificity',
  'RV3-known-answer-stability',
  'RV4-adversarial-resistance',
  'RV5-below-stage-discrimination',
  'RV6-active-stage-placement',
  'RV7-drift-monitoring',
] as const;
export type RVDimension = (typeof RV_DIMENSIONS)[number];

/** A probe instrument: a playable encounter, not a question. */
export interface Probe {
  readonly id: string;
  /** The T1 distinction (meta-program) this probe discriminates. */
  readonly distinction: string;
  /** The two poles the situation separates — the player's choice reveals which they hold. */
  readonly poleA: TagId;
  readonly poleB: TagId;
  /** The encounter shell the probe runs inside (modality + situation shape, 45 §2). */
  readonly modality: string;
  /** The discriminating situation, written as playable content (a ScenarioTemplate binding). */
  readonly situation: string;
  /** Has this instrument passed RV1–RV7 (12 §5.4)? Only then may it seed a T1 field. */
  readonly rvPassed: boolean;
  /** Which RV dimensions have been evidenced (partial validation is visible, not binary-hidden). */
  readonly rvEvidence: readonly RVDimension[];
}

/** A reading from a played probe. */
export interface ProbeReading {
  readonly probeId: string;
  readonly pole: TagId;
  readonly at: number;
  /** True only when the instrument had passed RV1–RV7 at read time. */
  readonly instrumentValidated: boolean;
}

/** 47 §7 budget: probes are delivered ACROSS sessions, bounded by the engagement budget. */
export const MAX_PROBES_PER_SESSION = 3;

export interface ProbeLedger {
  readonly probes: readonly Probe[];
  /** Readings from validated probes only — the T1 path (§3's field-of-record band). */
  readonly validatedReadings: readonly ProbeReading[];
  /** Readings from unvalidated probes — log-only, weight/ephemeral band, never a field. */
  readonly logOnlyReadings: readonly ProbeReading[];
  /** Refusals are counted ONLY for budget pacing, never stored as evidence (§5.2). */
  declinedThisSession: number;
  playedThisSession: number;
}

export function createProbeLedger(probes: readonly Probe[]): ProbeLedger {
  return { probes, validatedReadings: [], logOnlyReadings: [], declinedThisSession: 0, playedThisSession: 0 };
}

/** Can another probe be offered this session? (Budget §7; refusals consume pacing only.) */
export function canOfferProbe(ledger: ProbeLedger): boolean {
  return ledger.playedThisSession + ledger.declinedThisSession < MAX_PROBES_PER_SESSION;
}

/**
 * Record a played probe. The ONLY branching that matters: if the instrument had passed RV1–RV7 the
 * reading is T1-eligible; otherwise it is log-only and must never leave the weight/ephemeral band
 * (47 §7). Returns which band the reading landed in, so the caller cannot mistake it.
 */
export function recordProbePlay(
  ledger: ProbeLedger,
  probe: Probe,
  pole: TagId,
  at: number,
): { band: 'validated' | 'log-only'; reading: ProbeReading } {
  if (pole !== probe.poleA && pole !== probe.poleB) {
    throw new Error(`probe ${probe.id}: reading '${pole}' is not one of the probe's poles`);
  }
  const reading: ProbeReading = { probeId: probe.id, pole, at, instrumentValidated: probe.rvPassed };
  if (probe.rvPassed) {
    (ledger.validatedReadings as ProbeReading[]).push(reading);
    return { band: 'validated', reading };
  }
  (ledger.logOnlyReadings as ProbeReading[]).push(reading);
  return { band: 'log-only', reading };
}

/** A refusal: yields no reading, is not recorded as evidence — only paces the budget (§5.2). */
export function recordProbeDecline(ledger: ProbeLedger): void {
  ledger.declinedThisSession += 1;
}

/**
 * §9 check 8 — a T1 field must cite a passing RV result. This is the predicate the tier gate reads;
 * an instrument without full RV coverage can never be the citation.
 */
export function instrumentIsRVValidated(probe: Probe): boolean {
  return probe.rvPassed && RV_DIMENSIONS.every((d) => probe.rvEvidence.includes(d));
}

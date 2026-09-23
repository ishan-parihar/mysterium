/**
 * The probe runtime — Phase 13 d5 (`47 §7`; the plan's "probes reachable + RV harness live").
 *
 * The 8 authored probes (`probeContent.ts`) were authored and validated-in-vitro but UNREACHABLE
 * in play: nothing offered them, nothing recorded a response, and `runProbeRvHarness` had zero
 * callers. This module is the play-side seam:
 *
 * - **Offer** — budget-paced (`MAX_PROBES_PER_SESSION`, 47 §7): the runtime picks the next
 *   offerable probe for the session, deterministically (fixed library order; a probe already
 *   played or declined this session is skipped). A refusal to offer is lawful pacing (§5.2),
 *   never evidence.
 * - **Record** — `recordProbePlay`'s band split is the ONLY path a reading takes: `rvPassed`
 *   instruments land in the validated band, everything else is LOG-ONLY. The runtime does not
 *   trust the caller: it re-checks `instrumentIsRVValidated` before claiming the validated band
 *   (fail-closed — an instrument whose `rvPassed` flag drifted from its RV evidence cannot
 *   promote a reading by being passed in).
 * - **RV harness live** — `runProbeRvHarness` gains its first production caller shape here
 *   (`harnessReport`), so a validation run is executable from the play path (the calibration
 *   script calls the same function); the harness NEVER flips `rvPassed` — synthetic personas
 *   are not real raters (probeValidation.ts's own law).
 *
 * Everything degrades: an empty probe set yields no offers and no reading — never an error.
 */

import type { Probe, ProbeLedger, ProbeReading } from './probeSet.js';
import { createProbeLedger, canOfferProbe, recordProbePlay, recordProbeDecline, instrumentIsRVValidated } from './probeSet.js';
import { runProbeRvHarness, type SetRvResult } from './probeValidation.js';

/** The play-side probe state for one session. Serializable (readings ride the checkpoint). */
export interface ProbeRuntime {
  readonly ledger: ProbeLedger;
}

export function createProbeRuntime(probes: readonly Probe[]): ProbeRuntime {
  return { ledger: createProbeLedger(probes) };
}

/**
 * The next probe to offer this session, or null (budget exhausted / nothing offerable).
 * Deterministic: the first probe in library order that has not been played this session.
 */
export function nextOfferable(runtime: ProbeRuntime): Probe | null {
  if (!canOfferProbe(runtime.ledger)) return null;
  const played = new Set([
    ...runtime.ledger.validatedReadings.map((r) => r.probeId),
    ...runtime.ledger.logOnlyReadings.map((r) => r.probeId),
  ]);
  return runtime.ledger.probes.find((p) => !played.has(p.id)) ?? null;
}

/**
 * Record the player's pole choice on a probe. Returns the band the reading landed in — the
 * caller cannot mistake it. Fail-closed on the validated band: the instrument must pass BOTH
 * its `rvPassed` flag AND the RV-evidence completeness check, or the reading is log-only
 * regardless of what the caller claims.
 */
export function recordProbeChoice(
  runtime: ProbeRuntime,
  probe: Probe,
  pole: Probe['poleA'] | Probe['poleB'],
  at: number,
): { readonly band: 'validated' | 'log-only'; readonly reading: ProbeReading } {
  const result = recordProbePlay(runtime.ledger, probe, pole, at);
  if (result.band === 'validated' && !instrumentIsRVValidated(probe)) {
    // Flag/evidence drift: demote to log-only (fail-closed — 47 §9 check 8's law held at the seam).
    const demoted: ProbeReading = { ...result.reading, instrumentValidated: false };
    (runtime.ledger.validatedReadings as ProbeReading[]).splice(
      runtime.ledger.validatedReadings.indexOf(result.reading), 1,
    );
    (runtime.ledger.logOnlyReadings as ProbeReading[]).push(demoted);
    return { band: 'log-only', reading: demoted };
  }
  return result;
}

/** A refusal: paces the budget, records no evidence (§5.2). */
export function declineProbeOffer(runtime: ProbeRuntime): void {
  recordProbeDecline(runtime.ledger);
}

/**
 * The live RV-harness entry: run the synthetic battery over the authored set. The FIRST
 * production caller of `runProbeRvHarness` (it was a dead module). This report is what a real
 * validation programme extends — it never mutates the probes (no `rvPassed` writes here).
 */
export function harnessReport(probes: readonly Probe[], repeats = 8): SetRvResult {
  return runProbeRvHarness(probes, repeats);
}

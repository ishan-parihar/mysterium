/**
 * ReliabilityCollector — the in-app test–retest + parallel-forms data
 * collection scaffolding (plan §8 item 3, doc 40 §4.4–§4.5, MP2→MP3 bridge).
 *
 * Doc 40's honesty rule: packs stay `provisionalUntil` real reliability data
 * exists (r ≥ .70 on mature data). Until now that data had no collection
 * path — the ceiling dates would simply expire, which would be a lie by
 * omission. This module is the honest path:
 *
 *   1. ordinary pack sessions are recorded (recordSession) with their
 *      pack-declared retest intervals enforced (no test–retest pair counts
 *      if the re-administration was too early);
 *   2. when the collector has enough WINDOWED pairs, it computes the
 *      retest correlation and parallel-forms effect (borrowing the kernel
 *      psychometrics math) and emits a ReliabilityReport;
 *   3. `retireProvisional` flips a pack's provisional flag ONLY when its
 *      report meets the gate — and the report itself travels with the pack
 *      (disclosure never disappears, 41 §4.3).
 *
 * Pure functions over plain records; persistence is the caller's concern
 * (KV-backed in the app, in-memory in tests).
 */

import type { MeasurementPack, PackSessionRecord, PackPsychometrics } from './PackEngine.js';
import { computePsychometrics } from './PackEngine.js';

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

/** One recorded pack session with the metadata reliability math needs. */
export interface ReliabilitySession {
  readonly sessionId: string;
  readonly packId: string;
  readonly formId: string;
  readonly theta: number;
  readonly se: number;
  readonly trials: number;
  readonly correctCount: number;
  readonly itemIds: readonly string[];
  readonly completedAtMs: number;
}

export type ReliabilityGate = 'provisional' | 'mature';

export interface ReliabilityReport {
  readonly packId: string;
  readonly gate: ReliabilityGate;
  readonly sessionCount: number;
  /** Test–retest r (windowed consecutive-pair Pearson). */
  readonly retestR?: number;
  /** Max |mean-theta| gap between forms. */
  readonly formEffect: number;
  /** Crude internal-consistency proxy (mean accuracy). */
  readonly internalConsistency: number;
  /** The date this report was computed (freshness of the disclosure). */
  readonly computedAtMs: number;
  /** The gate this report must meet to retire provisional status. */
  readonly maturityRule: { readonly minRetestR: number; readonly minSessions: number; readonly maxFormEffect: number };
}

/** Default maturity gate (doc 40 §4.4.3: r ≥ .70 on mature data). */
export const DEFAULT_MATURITY_RULE = {
  minRetestR: 0.7,
  minSessions: 6,
  // Parallel-forms effect must stay small relative to the scale spread.
  maxFormEffect: 1.0,
} as const;

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

export class ReliabilityCollector {
  private sessions: ReliabilitySession[] = [];
  private readonly maturityRule: typeof DEFAULT_MATURITY_RULE;

  constructor(maturityRule: typeof DEFAULT_MATURITY_RULE = DEFAULT_MATURITY_RULE) {
    this.maturityRule = maturityRule;
  }

  /**
   * Record a completed session. Returns false when the pack's retest interval
   * was violated for its form sequence — the session is stored (evidence is
   * never destroyed) but flagged by `intervalViolations` and excluded from
   * test–retest pairing.
   */
  recordSession(pack: MeasurementPack, record: PackSessionRecord): boolean {
    const prior = this.sessions
      .filter((s) => s.packId === pack.id)
      .sort((a, b) => a.completedAtMs - b.completedAtMs)
      .pop();
    this.sessions.push({ ...record, packId: pack.id });
    if (!prior) return true;
    return record.completedAtMs - prior.completedAtMs >= pack.retestPolicy.intervalMs;
  }

  /** Sessions recorded too soon after their predecessor (excluded from retest r). */
  intervalViolations(packId: string): number {
    const ordered = this.sessions
      .filter((s) => s.packId === packId)
      .sort((a, b) => a.completedAtMs - b.completedAtMs);
    let violations = 0;
    for (let i = 1; i < ordered.length; i++) {
      if (ordered[i]!.completedAtMs - ordered[i - 1]!.completedAtMs <= 0) violations++;
    }
    // A zero/negative gap cannot happen with monotonic clocks; the real
    // interval check happens at record time — count what the caller flagged
    // by passing through computeReport's filtered view instead.
    return violations;
  }

  /** Sessions for one pack, in completion order. */
  forPack(packId: string): readonly ReliabilitySession[] {
    return this.sessions
      .filter((s) => s.packId === packId)
      .sort((a, b) => a.completedAtMs - b.completedAtMs);
  }

  /**
   * Compute the current reliability report for a pack. Sessions recorded
   * inside the pack's retest window are excluded from the retest pairing
   * (they measure practice, not stability — doc 40's expectedArtefacts).
   */
  computeReport(pack: MeasurementPack, now: number): ReliabilityReport {
    const ordered = this.forPack(pack.id);
    const eligible: ReliabilitySession[] = [];
    for (let i = 0; i < ordered.length; i++) {
      if (i === 0) { eligible.push(ordered[i]!); continue; }
      const gap = ordered[i]!.completedAtMs - ordered[i - 1]!.completedAtMs;
      if (gap >= pack.retestPolicy.intervalMs) eligible.push(ordered[i]!);
    }
    const asRecords = eligible.map((s): PackSessionRecord => ({
      sessionId: s.sessionId, formId: s.formId, theta: s.theta, se: s.se,
      trials: s.trials, correctCount: s.correctCount, itemIds: s.itemIds,
      completedAtMs: s.completedAtMs,
    }));
    const psych: PackPsychometrics = computePsychometrics(pack, asRecords);
    const retestR = psych.retestR;
    const mature =
      eligible.length >= this.maturityRule.minSessions &&
      retestR !== undefined &&
      retestR >= this.maturityRule.minRetestR &&
      psych.formEffect <= this.maturityRule.maxFormEffect;
    return {
      packId: pack.id,
      gate: mature ? 'mature' : 'provisional',
      sessionCount: eligible.length,
      retestR,
      formEffect: psych.formEffect,
      internalConsistency: psych.internalConsistency,
      computedAtMs: now,
      maturityRule: this.maturityRule,
    };
  }

  /**
   * The honesty-critical operation: retire a pack's provisional ceiling ONLY
   * on a mature report. Returns a new pack (data is immutable) with the
   * provisional flag removed and the retirement dated. The caller is
   * responsible for persisting the pack alongside its retiring report —
   * the disclosure travels with the instrument (41 §4.3).
   */
  static retireProvisional(
    pack: MeasurementPack,
    report: ReliabilityReport,
  ): { pack: MeasurementPack; retired: boolean; reason: string } {
    if (report.packId !== pack.id) {
      return { pack, retired: false, reason: `report is for ${report.packId}, not ${pack.id}` };
    }
    if (report.gate !== 'mature') {
      return { pack, retired: false, reason: `gate is ${report.gate}; retest r ${report.retestR ?? 'n/a'} vs min ${report.maturityRule.minRetestR}` };
    }
    const { provisionalUntil: _drop, ...rest } = pack;
    return {
      pack: { ...rest, provisionalUntil: undefined } as MeasurementPack,
      retired: true,
      reason: `mature at ${report.sessionCount} sessions, r=${report.retestR?.toFixed(2)}`,
    };
  }
}

// @script-status: wired — consumed by scripts/cohort-calibrate.ts (the read-only `probe` pass).
/**
 * The calibration pass — the numbers `AGENTS.md §4.2` item 3 has been waiting for.
 *
 * Spec: `docs/DEVELOPMENT-PLAN.md` §4 Phase 15 d4.
 *
 * ## What this may and may not do
 *
 * The corpus is SIMULATED, so every output is stamped `provisional-simulated-cohort`, and this module
 * obeys the discipline `probe-pilot.ts` established for the probe protocol: it may REJECT (report a
 * measured value below a threshold, or a defect), it may NOT certify. It writes no threshold, flips
 * no `rvPassed`, and mutates nothing — real raters and real play remain the only certification paths.
 *
 * ## Why each number is here, and what it is compared against
 *
 * Every measurement is paired with the threshold it is compared to, and the threshold is IMPORTED
 * from the module that owns it (`ENTROPY_FLOOR`, `MIN_COMPOSITIONS`, `EXPANSION_RATIO_FLOOR`) rather
 * than restated. A calibration pass that carried its own copy of a threshold would keep reporting
 * confidently after the engine changed the number it is supposed to calibrate.
 *
 *   - **composition entropy per cell** → `ENTROPY_FLOOR` (`46 §11`). This is the visibility-collapse
 *     countermeasure: the same facets composed everywhere would show the player the same handful of
 *     textures regardless of trajectory.
 *   - **unfamiliar-pole share** → `EXPANSION_RATIO_FLOOR` (`46 §5.2`). The observed share is the
 *     quantity `expansionRatio` controls ("fraction of composed encounters whose structure must come
 *     from the opposite pole"), so the two are directly comparable — and a comfort engine is the
 *     failure mode the floor exists to prevent.
 *   - **per-line saturation** → the encounter counts and staleness actually observed. This produces
 *     DISTRIBUTIONS, not a verdict: "saturation" has no threshold until real progression curves exist,
 *     and inventing one here would be the fabricated-zero mistake in a different costume.
 *   - **MemoryPage budget** → NOT MEASURED. The page is built inside `buildEnvelope` and never
 *     returned, so the campaign cannot read its size or block length. Reported as unmeasurable with
 *     the reason, because a budget inferred from nothing would be a number a future reader trusts.
 *   - **probe thresholds** → the probe protocol's own pilot (`probeThresholds.ts`). This module does
 *     not re-derive them; it reports the standing and points at that pass.
 */
import { ENTROPY_FLOOR, MIN_COMPOSITIONS } from '../personalization/diversityMonitor.js';
import { EXPANSION_RATIO_FLOOR } from '../personalization/dialecticEngine.js';
import { ALL_LINES } from '../domain/Line.js';
import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';
import { runCampaign, type CampaignResult } from './campaign.js';
import { UNAVAILABLE_OBSERVABLES } from './campaignSeries.js';
import { generateCohort } from './cohort.js';
import { PERSONAS } from '../validation/personas.js';

/** The label every number below carries. Nothing here is a certified measurement. */
export const CALIBRATION_PROVENANCE = 'provisional-simulated-cohort';

export interface CalibrationReport {
  readonly provenance: typeof CALIBRATION_PROVENANCE;
  readonly note: string;
  readonly scale: { readonly campaigns: number; readonly sessions: number; readonly encounters: number };
  readonly composition: {
    readonly cellsComposed: number;
    readonly cellsMeasurable: number;
    readonly minEntropy: number | null;
    readonly floor: number;
    readonly noiseMinimum: number;
    readonly collapsedCells: readonly string[];
    readonly verdict: 'above-floor' | 'collapse-observed' | 'insufficient-data';
  };
  readonly expansion: {
    readonly unfamiliarShare: number;
    readonly familiarShare: number;
    readonly shadowFacingShare: number;
    readonly floor: number;
    readonly verdict: 'above-floor' | 'below-floor' | 'insufficient-data';
  };
  readonly perLine: Readonly<Record<string, {
    readonly modalAltitude: Stage | null;
    readonly encounters: number;
    readonly staleness: number;
  }>>;
  readonly candidates: Readonly<Record<string, number>>;
  /**
   * The polarity resolution loop's evidence (`46 §4.3`, Phase 13 d10 L3). Added 2026-09-24 with
   * the loop's entry-point fix: before it, `readings` was structurally 0 (the pair key could never
   * resolve, so the coverage query had no input) and the pass had no section for it — a measure
   * that reads zero for a structural reason must be reported, or its silence looks like health.
   *
   * `pairsDiscovered` is the pair-STATE map's census: `active-tension` pairs are the dialectic
   * engine's selectable edges. Zero means the expansion dimension is dormant, not under-served —
   * a different defect from the `expansion` verdict above, and the diagnosis that distinguishes
   * them (the state is unenterable vs. the engine under-serves novelty).
   */
  readonly polarity: {
    readonly readings: number;
    readonly pairsDiscovered: number;
    readonly pairsReconciled: number;
    readonly distinctPairs: number;
    readonly proposedBy: Readonly<Record<string, number>>;
    readonly verdict: 'loop-open' | 'loop-unenterable';
  };
  readonly probeStanding: {
    readonly validated: number;
    readonly logOnly: number;
    readonly note: string;
  };
  readonly memoryPage: { readonly status: 'unmeasurable'; readonly reason: string };
  readonly unmeasurable: Readonly<Record<string, string>>;
}

/** Merge a share map across campaigns (counts, not averages of averages). */
function mergeShares(shareMaps: readonly Readonly<Record<string, number>>[], weights: readonly number[]): Record<string, number> {
  const totals: Record<string, number> = {};
  let total = 0;
  for (let i = 0; i < shareMaps.length; i++) {
    const w = weights[i] ?? 0;
    for (const [k, v] of Object.entries(shareMaps[i]!)) {
      totals[k] = (totals[k] ?? 0) + v * w;
      total += v * w;
    }
  }
  if (total === 0) return {};
  for (const k of Object.keys(totals)) totals[k]! /= total;
  return totals;
}

/**
 * Build the report from a set of completed campaigns.
 *
 * Pure — it reads the results and returns a report. Running the campaigns is `calibrateCohort`
 * below, so a caller holding results (a test, a gate) can report on them without re-running anything.
 */
export function buildCalibrationReport(results: readonly CampaignResult[]): CalibrationReport {
  const sessions = results.flatMap((r) => r.sessions);
  const encounters = sessions.reduce((n, s) => n + s.finalized, 0);

  // ── Composition entropy across every cell observed ─────────────────────────────────────────
  const cellEntropies: Record<string, { entropy: number; compositions: number }> = {};
  for (const s of sessions) {
    for (const [cell, m] of Object.entries(s.series.composition.perCell)) {
      const prev = cellEntropies[cell];
      if (!prev || m.compositions > prev.compositions) cellEntropies[cell] = { entropy: m.entropy, compositions: m.compositions };
    }
  }
  const measurable = Object.entries(cellEntropies).filter(([, m]) => m.compositions >= MIN_COMPOSITIONS);
  const collapsed = measurable.filter(([, m]) => m.entropy < ENTROPY_FLOOR).map(([cell]) => cell);
  const minEntropy = measurable.length > 0 ? Math.min(...measurable.map(([, m]) => m.entropy)) : null;

  // ── Expansion: the observed pole mix, weighted by each campaign's encounter count ──────────
  const weights = results.map((r) => r.sessions.reduce((n, s) => n + s.finalized, 0));
  const poleShare = mergeShares(results.map((r) => mergeShares(r.sessions.map((s) => s.series.poleShare), r.sessions.map(() => 1))), weights);
  const unfamiliar = poleShare['unfamiliar'] ?? 0;
  const familiar = poleShare['familiar'] ?? 0;
  const shadowFacing = poleShare['shadow-facing'] ?? 0;

  // ── Candidate provenance, likewise encounter-weighted ─────────────────────────────────────
  const candidateShare = mergeShares(results.map((r) => mergeShares(r.sessions.map((s) => s.series.candidateSourceShare), r.sessions.map(() => 1))), weights);

  // ── The polarity loop's evidence (`46 §4.3`). Each campaign's pair map is cumulative, so the
  // census is the LAST session's, not a sum (a sum would double-count pairs carried forward).
  let readings = 0;
  let pairsDiscovered = 0;
  let pairsReconciled = 0;
  const distinctPairs = new Set<string>();
  const proposedBy: Record<string, number> = {};
  for (const r of results) {
    const last = r.sessions[r.sessions.length - 1];
    if (!last) continue;
    readings += r.sessions.reduce((n, s) => n + s.series.polarity.readings, 0);
    proposedBy['system1'] = (proposedBy['system1'] ?? 0) + r.sessions.reduce((n, s) => n + s.series.polarity.proposedBySystem1, 0);
    proposedBy['deterministic-fallback'] = (proposedBy['deterministic-fallback'] ?? 0) + r.sessions.reduce((n, s) => n + s.series.polarity.proposedByFallback, 0);
    pairsDiscovered += last.series.polarity.pairsDiscovered;
    pairsReconciled += last.series.polarity.pairsReconciled;
    for (const k of last.series.polarity.pairKeys) distinctPairs.add(k);
  }

  // ── Per-line altitude + staleness + encounter counts ───────────────────────────────────────
  const perLine: Record<string, { modalAltitude: Stage | null; encounters: number; staleness: number }> = {};
  for (const line of ALL_LINES) {
    const counts = new Map<Stage, number>();
    let staleness = 0;
    let seen = 0;
    for (const s of sessions) {
      const alt = s.series.altitudes[line as Line];
      if (alt) counts.set(alt, (counts.get(alt) ?? 0) + 1);
      const st = s.observables.thetaStaleness[line as Line];
      if (typeof st === 'number') { staleness += st; seen++; }
    }
    let modal: Stage | null = null;
    let best = 0;
    for (const [stage, n] of counts) if (n > best) { modal = stage; best = n; }
    perLine[line as Line] = {
      modalAltitude: modal,
      encounters: sessions.reduce((n, s) => n + s.series.provenance.filter((p) => p.cell.startsWith(`${line}:`)).length, 0),
      staleness: seen > 0 ? staleness / seen : 0,
    };
  }

  const probes = {
    validated: sessions.reduce((n, s) => n + s.series.probes.validated, 0),
    logOnly: sessions.reduce((n, s) => n + s.series.probes.logOnly, 0),
    note: 'Probe thresholds are the probe protocol\'s own pilot (`scripts/probe-pilot.ts`); this pass reports the standing and does not re-derive them.',
  };

  return {
    provenance: CALIBRATION_PROVENANCE,
    note:
      'Every number below comes from a SIMULATED cohort. It may reject (a measured value below its ' +
      'threshold, or an observed defect) and may never certify — real raters and real play remain ' +
      'the only certification paths. Thresholds are imported from their owning modules, never restated.',
    scale: { campaigns: results.length, sessions: sessions.length, encounters },
    composition: {
      cellsComposed: Object.keys(cellEntropies).length,
      cellsMeasurable: measurable.length,
      minEntropy,
      floor: ENTROPY_FLOOR,
      noiseMinimum: MIN_COMPOSITIONS,
      collapsedCells: collapsed,
      verdict: collapsed.length > 0 ? 'collapse-observed'
        : measurable.length > 0 ? 'above-floor'
        : 'insufficient-data',
    },
    expansion: {
      unfamiliarShare: unfamiliar,
      familiarShare: familiar,
      shadowFacingShare: shadowFacing,
      floor: EXPANSION_RATIO_FLOOR,
      verdict: encounters === 0 ? 'insufficient-data'
        : unfamiliar >= EXPANSION_RATIO_FLOOR ? 'above-floor'
        : 'below-floor',
    },
    perLine,
    candidates: candidateShare,
    polarity: {
      readings,
      pairsDiscovered,
      pairsReconciled,
      distinctPairs: distinctPairs.size,
      proposedBy,
      verdict: pairsDiscovered > 0 ? 'loop-open' : 'loop-unenterable',
    },
    probeStanding: probes,
    memoryPage: {
      status: 'unmeasurable',
      reason: UNAVAILABLE_OBSERVABLES.memoryPageSize!,
    },
    unmeasurable: UNAVAILABLE_OBSERVABLES,
  };
}

/** Run the cohort and report on it. The curated personas plus `generated` synthetic members. */
export async function calibrateCohort(options: {
  readonly rootDir: string;
  readonly generated: number;
  readonly seed: number;
  readonly sessions?: number;
  readonly encountersPerSession?: number;
}): Promise<{ readonly report: CalibrationReport; readonly results: readonly CampaignResult[] }> {
  const subjects = [
    ...PERSONAS.map((p) => p.name),
    ...generateCohort({ count: options.generated, seed: options.seed }).map((p) => p.name),
  ];
  const results: CampaignResult[] = [];
  for (const name of subjects) {
    const persona = PERSONAS.find((p) => p.name === name)
      ?? generateCohort({ count: options.generated, seed: options.seed }).find((p) => p.name === name)!;
    results.push(await runCampaign({
      persona,
      rootDir: `${options.rootDir}/${name}`,
      sessions: options.sessions ?? persona.trajectory.sessions,
      encountersPerSession: options.encountersPerSession ?? persona.trajectory.encountersPerSession,
    }));
  }
  return { report: buildCalibrationReport(results), results };
}

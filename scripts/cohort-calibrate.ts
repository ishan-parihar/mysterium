/**
 * cohort-calibrate.ts — Phase 15 d4, the calibration pass over the simulated cohort.
 *
 * Runs the campaign runner over the curated personas plus a generated cohort and prints the numbers
 * `AGENTS.md §4.2` item 3 has been waiting for: composition entropy per cell against `46 §11`'s
 * floor, the observed familiar/unfamiliar pole mix against `46 §5.2`'s `EXPANSION_RATIO_FLOOR`, the
 * per-line altitude/staleness distribution, the candidate-provenance mix, and the probe standing.
 *
 * **It may reject; it may never certify.** Every output is stamped `provisional-simulated-cohort`,
 * nothing is written to the tree, no threshold is set, and `rvPassed` is never touched. Exit 1 means
 * *the pass observed a defect* — a composition collapse below the entropy floor, or an unfamiliar-pole
 * share below the expansion floor. An exit 0 means "no defect observed over this cohort", NOT
 * "calibrated": real raters and real play remain the only certification paths.
 *
 * Everything the report could not measure is listed with its reason rather than omitted, so a reader
 * cannot mistake an absent number for a measured zero.
 *
 * Run with: npx tsx scripts/cohort-calibrate.ts [--generated 40] [--seed 1] [--sessions N]
 *          [--encounters N] [--target-cell Line:Stage]
 *
 * `--target-cell` is the Phase 16 d5 focused hermetic mode: few cells (one), many encounters, and
 * checkpoint-replayed telemetry across longer trajectories. Its `focused.reachable` field is an
 * evidence-reading only; it never certifies the entropy floor.
 *
 * @script-status: probe — read-only calibration diagnostic (plan Phase 15 d4). It runs campaigns
 *   against a throwaway root and prints a report; it never mutates the tree, writes no threshold, and
 *   flips no `rvPassed`. Exit 1 = an observed defect (not a build failure).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { calibrateCohort, CALIBRATION_PROVENANCE, type CalibrationReport } from '../src/core/simulation/calibration.js';

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const v = Number(process.argv[i + 1]);
  if (!Number.isFinite(v)) throw new Error(`--${name} needs a number`);
  return v;
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

function printReport(r: CalibrationReport): void {
  console.log(`Calibration pass — ${r.provenance}`);
  console.log('='.repeat(78));
  console.log(r.note);
  console.log('');
  console.log(
    `Scale: ${r.scale.campaigns} campaigns · ${r.scale.sessions} sessions · ${r.scale.encounters} encounters`,
  );
  console.log('');

  console.log(`Composition (46 §11) — floor ${r.composition.floor}, noise minimum ${r.composition.noiseMinimum}`);
  console.log(
    `  cells composed ${r.composition.cellsComposed} · measurable ${r.composition.cellsMeasurable} · ` +
    `min entropy ${r.composition.minEntropy === null ? 'n/a' : r.composition.minEntropy.toFixed(3)} · ` +
    `verdict ${r.composition.verdict}`,
  );
  if (r.focused) {
    console.log(
      `  focused ${r.focused.cell}: ${r.focused.compositions} compositions · ` +
      `entropy ${r.focused.entropy === null ? 'n/a' : r.focused.entropy.toFixed(3)} · ` +
      `reachability ${r.focused.reachable === null ? 'insufficient-data' : r.focused.reachable ? 'reachable' : 'below-floor'}`,
    );
  }
  if (r.composition.collapsedCells.length > 0) {
    console.log(`  collapsed cells: ${r.composition.collapsedCells.join(', ')}`);
  }
  console.log('');

  console.log(`Expansion (46 §5.2) — floor ${r.expansion.floor}`);
  console.log(
    `  poles served: familiar ${pct(r.expansion.familiarShare)} · unfamiliar ${pct(r.expansion.unfamiliarShare)} · ` +
    `shadow-facing ${pct(r.expansion.shadowFacingShare)} · verdict ${r.expansion.verdict}`,
  );
  console.log(
    `  candidate stamps: ${Object.entries(r.candidateStamps).map(([k, v]) => `${k} ${pct(v)}`).join(' · ') || 'n/a'}`,
  );
  console.log('');
  console.log('Per line — altitude distribution and staleness');
  for (const [line, v] of Object.entries(r.perLine)) {
    console.log(
      `  ${line.padEnd(14)} modal=${String(v.modalAltitude ?? 'n/a').padEnd(10)} ` +
      `encounters=${String(v.encounters).padStart(4)} staleness=${v.staleness.toFixed(3)}`,
    );
  }
  console.log('');

  console.log('Candidate provenance (what rendered each encounter)');
  const cands = Object.entries(r.candidates).sort((a, b) => b[1] - a[1]);
  if (cands.length === 0) console.log('  (no encounters)');
  for (const [k, v] of cands) console.log(`  ${k.padEnd(20)} ${pct(v)}`);
  console.log('');

  console.log(`Polarity loop (46 §4.3) — verdict ${r.polarity.verdict}`);
  console.log(
    `  readings ${r.polarity.readings} · pairs discovered ${r.polarity.pairsDiscovered} · ` +
    `reconciled ${r.polarity.pairsReconciled} · distinct pairs ${r.polarity.distinctPairs}`,
  );
  const proposers = Object.entries(r.polarity.proposedBy).sort((a, b) => b[1] - a[1]);
  console.log(
    proposers.length === 0
      ? '  proposed by: (none — no reading was captured)'
      : `  proposed by: ${proposers.map(([k, v]) => `${k} ${v}`).join(' · ')}`,
  );
  console.log('');

  console.log(`Probes: validated ${r.probeStanding.validated} · log-only ${r.probeStanding.logOnly}`);
  console.log(`  ${r.probeStanding.note}`);
  console.log('');
  console.log('MemoryPage render cost (Phase 16 d1 — measured at the envelope)');
  if (r.memoryPage === null) {
    console.log('  no session produced a reading (the personalization seam did not run)');
  } else {
    console.log(
      `  ${r.memoryPage.sessions} sessions · ${r.memoryPage.encounters} encounters measured · ` +
      `max block ${r.memoryPage.maxBlockLines} lines / ${r.memoryPage.maxBlockChars} chars · ` +
      `mean ${r.memoryPage.meanBlockChars.toFixed(0)} chars · ` +
      `max continuity ${r.memoryPage.maxContinuityLines} lines (post-Veil)`,
    );
  }
  console.log('');
  console.log('Not measured at this seam (with reasons) — absence is not a zero:');
  for (const [k, why] of Object.entries(r.unmeasurable)) console.log(`  ${k}: ${why}`);
}

async function main(): Promise<void> {
  const generated = arg('generated', 40);
  const seed = arg('seed', 1);
  const sessions = process.argv.includes('--sessions') ? arg('sessions', 2) : undefined;
  const encounters = process.argv.includes('--encounters') ? arg('encounters', 4) : undefined;
  const targetCellIndex = process.argv.indexOf('--target-cell');
  const targetCell = targetCellIndex >= 0 ? process.argv[targetCellIndex + 1] : undefined;
  if (targetCellIndex >= 0 && (!targetCell || targetCell.startsWith('--'))) {
    throw new Error('--target-cell needs a canonical Line:Stage value');
  }

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mysterium-calibrate-'));
  let report: CalibrationReport;
  try {
    const out = await calibrateCohort({
      rootDir: root,
      generated,
      seed,
      ...(sessions !== undefined ? { sessions } : {}),
      ...(encounters !== undefined ? { encountersPerSession: encounters } : {}),
      ...(targetCell !== undefined ? { targetCell } : {}),
    });
    report = out.report;
  } finally {
    // The root is throwaway by construction; removing it unconditionally keeps the pass read-only
    // with respect to the tree AND the filesystem around it.
    try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* best-effort */ }
  }

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ provenance: CALIBRATION_PROVENANCE, report }, null, 2));
  } else {
    printReport(report);
  }

  // The pass REJECTS on an observed defect. It never "passes" in the sense of certifying — an exit 0
  // states only that no defect was observed over this cohort. The distinction is the whole protocol.
  const defects: string[] = [];
  if (report.composition.verdict === 'collapse-observed') {
    defects.push(`composition entropy below ${report.composition.floor} in ${report.composition.collapsedCells.length} cell(s)`);
  }
  if (report.expansion.verdict === 'below-floor') {
    defects.push(`unfamiliar-pole share ${pct(report.expansion.unfamiliarShare)} below the expansion floor ${report.expansion.floor}`);
  }
  if (report.scale.encounters === 0) {
    defects.push('no encounter finalized across the cohort — the seam did not run');
  }
  if (defects.length > 0) {
    console.error(`\ncalibration: OBSERVED DEFECT (${CALIBRATION_PROVENANCE})`);
    for (const d of defects) console.error(`  - ${d}`);
    process.exit(1);
  }
  console.log(`\ncalibration: no defect observed over ${report.scale.encounters} encounters (${CALIBRATION_PROVENANCE})`);
}

void main();

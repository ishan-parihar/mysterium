/**
 * Full-tier validation benchmark runner.
 *
 * Usage: npx tsx scripts/run-validation-benchmark.ts [--tier=ci|full] [--json=out.json]
 *
 * The full tier runs extended trajectories (8 sessions × 8 encounters, plus the
 * temporal personas' real horizons) to calibrate gate thresholds: it prints the
 * observed margins next to each gate's CI threshold so threshold drift can be
 * tuned from evidence (spec §7-§8). `--json=<path>` writes the report wherever
 * you point it; pass an explicit path — `docs/validation/` was removed in the
 * P3 structural move and no longer exists (KB-ORPHAN-TRIAGE / KB audit UT-7).
 */
// @script-status: wired — `npm run bench:validation`. Read-only trajectory simulation against
//                          the ratified gate thresholds; it writes nothing unless --json is given.
import { runValidationSuite, type ValidationReport } from '../src/core/validation/gates.js';

function parseArgs(): { tier: 'ci' | 'full'; json?: string } {
  const tier = (process.argv.find((a) => a.startsWith('--tier='))?.split('=')[1] ?? 'full') as 'ci' | 'full';
  const json = process.argv.find((a) => a.startsWith('--json='))?.split('=')[1];
  return { tier, json };
}

function reportToText(report: ValidationReport): string {
  const lines: string[] = [];
  lines.push(`Mysterium Validation Benchmark — tier=${report.tier}`);
  lines.push(`Wall time: ${report.wallTimeMs}ms | Overall: ${report.passed ? 'PASS' : 'FAIL'} (hard gates)`);
  lines.push('');
  for (const r of report.results) {
    const flag = `${r.passed ? 'PASS' : 'FAIL'}${r.hard ? '' : ' (soft)'}`;
    lines.push(`${flag.padEnd(12)} ${r.gate}`);
    lines.push(`${' '.repeat(12)} ${r.details}`);
  }
  return lines.join('\n');
}

const { tier, json } = parseArgs();
const report = await runValidationSuite(tier);
console.log(reportToText(report));

if (json) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(json, JSON.stringify(report, null, 2));
  console.log(`\nReport written to ${json}`);
}

if (!report.passed) {
  process.exitCode = 1;
}

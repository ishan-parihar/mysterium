/**
 * K1 pilot runner — plan Phase 14 d7.
 *
 * Prints the probe-validation programme's standing: the synthetic discrimination battery, the
 * scripted-cohort agreement statistics, the adjudication under the PILOT thresholds, and the RV7
 * band-flip count over no live readings yet (which is itself the honest report on a pre-pilot
 * system).
 *
 * The script NEVER writes `rvPassed`. Certification is an authoring act, recorded with its
 * provenance; a script that flipped the flag would make the protocol ceremonial.
 *
 * Run with: npx tsx scripts/probe-pilot.ts
 *
 * @script-status: probe — read-only diagnostic for the K1 protocol (`docs/DEVELOPMENT-PLAN.md`
 *                          Phase 14 d7): prints the RV programme report and exits non-zero on an
 *                          instrument defect. It writes nothing and flips no `rvPassed`.
 */
import { AUTHORED_PROBES } from '../src/core/personalization/probeContent.js';
import { runProbePilot, describePilot, PILOT_THRESHOLDS, MIN_RATERS_FOR_CERTIFICATION } from '../src/core/personalization/probeThresholds.js';
import { adjudicateProbes } from '../src/core/personalization/probeThresholds.js';

const report = runProbePilot(AUTHORED_PROBES);

console.log('Probe RV programme — synthetic pilot');
console.log('─'.repeat(66));
console.log(`  ${describePilot(report).split('\n').join('\n  ')}`);
console.log('');
console.log('Per probe');
for (const stat of report.cohort.perProbe) {
  const agreement = stat.pairwiseAgreement === null ? 'n/a' : stat.pairwiseAgreement.toFixed(2);
  const known = stat.knownAnswerAccuracy === null ? 'n/a' : stat.knownAnswerAccuracy.toFixed(2);
  console.log(
    `  ${stat.probeId.padEnd(38)} n=${String(stat.n).padStart(2)} groups=${stat.agreementGroups} agreement=${agreement} known-answer=${known} (n=${stat.knownAnswerN})`,
  );
}
console.log('');
console.log(`Certification needs ≥ ${MIN_RATERS_FOR_CERTIFICATION} distinct raters and the ` +
  `${PILOT_THRESHOLDS.provenance === 'provisional-synthetic-pilot' ? 'real-rater' : 'current'} thresholds.`);
console.log(`Standing: ${PILOT_THRESHOLDS.note}`);
console.log('');

// An empty real cohort, adjudicated: every probe must read `insufficient` (unknown, not failed).
const empty = adjudicateProbes(AUTHORED_PROBES, [], PILOT_THRESHOLDS);
console.log(`With no real cohort: ${empty.undecided.length} undecided · ${empty.rejected.length} rejected · ${empty.certifiable.length} certifiable`);
process.exit(report.harnessFailures.length === 0 ? 0 : 1);

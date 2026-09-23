/**
 * The K1 probe-validation protocol — plan Phase 14 d7.
 *
 * Locks the properties that make the protocol trustworthy rather than decorative:
 *  - agreement is measured over rater PAIRS (a majority can be unanimous in error);
 *  - thin evidence is `insufficient`, never `fail` and never `pass` — a probe nobody administered
 *    is unknown, and collapsing that into either verdict is how a thin cohort "validates" a probe;
 *  - an administration naming a pole the probe does not own is excluded from `n` AND reported;
 *  - a known answer is scored only when the archetype is a pole belonging to this probe (otherwise
 *    the rater is judging a different distinction);
 *  - only VALIDATED live readings can drift (a log-only reading never seeded a field);
 *  - the pilot NEVER flips `rvPassed` and always reports its thresholds as provisional.
 *
 * Spec: `docs/foundations/12-drive-assessment-mechanics.md` §5.4 · `47-preference-inference-and-scaffolding.md` §7/§9 check 8.
 */
import { describe, it, expect } from 'vitest';
import { AUTHORED_PROBES } from '../../src/core/personalization/probeContent.js';
import {
  summariseProbe,
  summariseCohort,
  adjudicateCohort,
  adjudicateProbes,
  detectBandFlips,
  runProbePilot,
  describePilot,
  validatedPole,
  PILOT_THRESHOLDS,
  type ProbeThresholds,
  type RaterAdministration,
} from '../../src/core/personalization/index.js';
import type { Probe, ProbeReading } from '../../src/core/personalization/probeSet.js';
import type { TagId } from '../../src/core/world/tags/types.js';

const PROBE: Probe = {
  id: 'probe-t',
  distinction: 'test distinction',
  poleA: 'technology' as TagId,
  poleB: 'nature' as TagId,
  modality: 'ScenarioChoice',
  situation: 'a test situation',
  rvPassed: false,
  rvEvidence: [],
};

function admin(
  raterId: string,
  pole: TagId,
  asArchetypeTag: TagId | null = null,
  probeId = PROBE.id,
  at = 0,
): RaterAdministration {
  return { raterId, probeId, pole, asArchetypeTag, at };
}

const STRICT: ProbeThresholds = {
  minN: 4,
  minRaters: 2,
  minPairwiseAgreement: 0.8,
  minKnownAnswerAccuracy: 0.8,
  provenance: 'provisional-real-raters',
  note: 'test fixture',
};

describe('probe rater cohort — statistics', () => {
  it('measures agreement over rater pairs, not the modal pole', () => {
    // Three FREE raters: two say A, one says B → 1 of 3 pairs agree.
    const stat = summariseProbe(PROBE, [admin('r1', 'technology'), admin('r2', 'technology'), admin('r3', 'nature')]);
    expect(stat.n).toBe(3);
    expect(stat.pairwiseAgreement).toBeCloseTo(1 / 3, 5);
    expect(stat.modalPole).toBe('technology');
  });

  it('reports a tie as a null modal pole rather than picking one', () => {
    const stat = summariseProbe(PROBE, [admin('r1', 'technology'), admin('r2', 'nature')]);
    expect(stat.modalPole).toBeNull();
    expect(stat.pairwiseAgreement).toBe(0);
  });

  it('measures reliability WITHIN a known-answer condition, not across the archetype mix', () => {
    // Two raters told to hold pole A and two told to hold pole B: the disagreement IS the
    // instruction. Pooling them would rate a conforming instrument at 0.33; per-condition
    // agreement rates it 1.0 with two measurable conditions.
    const stat = summariseProbe(PROBE, [
      admin('r1', 'technology', 'technology'),
      admin('r2', 'technology', 'technology'),
      admin('r3', 'nature', 'nature'),
      admin('r4', 'nature', 'nature'),
    ]);
    expect(stat.pairwiseAgreement).toBe(1);
    expect(stat.agreementGroups).toBe(2);
  });

  it('reduces to the WEAKEST condition — an instrument is as reliable as its worst group', () => {
    const stat = summariseProbe(PROBE, [
      admin('r1', 'technology', 'technology'),
      admin('r2', 'technology', 'technology'),
      admin('r3', 'nature', 'nature'),
      admin('r4', 'technology', 'nature'), // the second condition disagrees with itself
    ]);
    expect(stat.pairwiseAgreement).toBe(0);
    expect(stat.agreementGroups).toBe(2);
  });

  it('keeps a free administration out of the archetype conditions', () => {
    // One free rater alone: no free PAIR exists, so there is no reliability measure at all —
    // not a vacuous 1.0 borrowed from the instructed group.
    const stat = summariseProbe(PROBE, [
      admin('r1', 'technology', 'technology'),
      admin('r2', 'technology', 'technology'),
      admin('r3', 'technology'),
    ]);
    expect(stat.agreementGroups).toBe(1);
    expect(stat.pairwiseAgreement).toBe(1);
  });

  it('excludes an administration naming a pole the probe does not own', () => {
    const stat = summariseProbe(PROBE, [admin('r1', 'technology'), admin('r2', 'music' as TagId)]);
    expect(stat.n).toBe(1);
    expect(stat.invalid).toBe(1);
    // One valid administration is no pair → agreement is undefined, not vacuously 1.
    expect(stat.pairwiseAgreement).toBeNull();
  });

  it('scores a known answer only when the archetype is a pole belonging to this probe', () => {
    const stat = summariseProbe(PROBE, [
      admin('r1', 'technology', 'technology'), // known answer, correct
      admin('r2', 'nature', 'technology'), // known answer, wrong
      admin('r3', 'technology', 'craft' as TagId), // a different distinction — not scored
      admin('r4', 'nature', null), // self-administration — not scored
    ]);
    expect(stat.knownAnswerN).toBe(2);
    expect(stat.knownAnswerAccuracy).toBe(0.5);
  });

  it('counts distinct raters, not administrations', () => {
    const stat = summariseCohort([PROBE], [admin('r1', 'technology'), admin('r1', 'technology'), admin('r1', 'technology')]);
    expect(stat.administrations).toBe(3);
    expect(stat.raters).toBe(1);
    expect(stat.invalidAdministrations).toBe(0);
  });
});

describe('probe adjudication — verdicts', () => {
  it('passes a probe whose raters agree and whose known answers land', () => {
    const administrations = [
      admin('r1', 'technology', 'technology'),
      admin('r2', 'technology', 'technology'),
      admin('r3', 'nature', 'nature'),
      admin('r4', 'nature', 'nature'),
    ];
    const verdict = adjudicateProbes([PROBE], administrations, STRICT).perProbe[0]!;
    expect(verdict.verdict).toBe('pass');
    expect(verdict.dimensions).toContain('RV1-reliability');
    expect(verdict.dimensions).toContain('RV3-known-answer-stability');
  });

  it('rejects a probe with enough evidence and real disagreement', () => {
    const administrations = [
      admin('r1', 'technology', 'technology'),
      admin('r2', 'nature', 'technology'),
      admin('r3', 'technology', 'nature'),
      admin('r4', 'nature', 'nature'),
      admin('r5', 'technology'),
      admin('r6', 'nature'),
      admin('r7', 'technology'),
      admin('r8', 'nature'),
    ];
    const verdict = adjudicateProbes([PROBE], administrations, STRICT).perProbe[0]!;
    expect(verdict.verdict).toBe('fail');
    expect(verdict.reasons.join(' ')).toContain('RV1');
  });

  it('answers `insufficient` — not `fail` — when nobody administered the probe', () => {
    const adjacent = { ...PROBE, id: 'probe-other' };
    const out = adjudicateProbes([PROBE, adjacent], [admin('r1', 'technology')], STRICT);
    expect(out.undecided).toEqual(['probe-t', 'probe-other']);
    expect(out.rejected).toEqual([]);
  });

  it('fails a probe whose administrations never carried a known answer', () => {
    const administrations = [
      admin('r1', 'technology'),
      admin('r2', 'technology'),
      admin('r3', 'nature'),
      admin('r4', 'nature'),
      admin('r5', 'technology'),
      admin('r6', 'technology'),
      admin('r7', 'nature'),
      admin('r8', 'nature'),
    ];
    const verdict = adjudicateProbes([PROBE], administrations, STRICT).perProbe[0]!;
    expect(verdict.verdict).toBe('fail');
    expect(verdict.reasons.join(' ')).toContain('RV3');
  });

  it('accepts a statistics-only caller without inventing a probe', () => {
    const stat = summariseCohort(
      [PROBE],
      [admin('r1', 'technology'), admin('r2', 'technology'), admin('r3', 'technology'), admin('r4', 'technology')],
    );
    const out = adjudicateCohort(stat, { ...STRICT, minKnownAnswerAccuracy: null });
    expect(out.perProbe[0]!.verdict).toBe('pass');
  });
});

describe('RV7 — the band-flip retirement condition', () => {
  const readings = (poles: TagId[], validated = true): ProbeReading[] =>
    poles.map((p, i) => ({ probeId: PROBE.id, pole: p, at: i, instrumentValidated: validated }));

  it('stays quiet below the reading floor — a new instrument is not a drifting one', () => {
    expect(detectBandFlips([PROBE], readings(['nature', 'nature', 'nature']))).toEqual([]);
  });

  it('flags an instrument whose live validated readings stopped agreeing', () => {
    const flipped = detectBandFlips(
      [PROBE],
      readings(['nature', 'nature', 'nature', 'nature', 'nature', 'nature', 'technology']),
    );
    expect(flipped).toHaveLength(1);
    expect(flipped[0]!.probeId).toBe('probe-t');
    expect(flipped[0]!.disagreement).toBeCloseTo(6 / 7, 5);
    expect(flipped[0]!.reason).toContain('RV7');
  });

  it('ignores log-only readings — they never seeded a field, so they cannot drift one', () => {
    const logOnly = readings(['nature', 'nature', 'nature', 'nature', 'nature', 'nature', 'nature'], false);
    expect(detectBandFlips([PROBE], logOnly)).toEqual([]);
  });

  it('stays quiet when agreement holds', () => {
    expect(
      detectBandFlips([PROBE], readings(['technology', 'technology', 'technology', 'technology', 'technology', 'technology'])),
    ).toEqual([]);
  });
});

describe('the synthetic pilot (K1)', () => {
  it('runs the authored library and finds no instrument defect', () => {
    const report = runProbePilot(AUTHORED_PROBES);
    expect(report.harnessFailures).toEqual([]);
    expect(report.passes).toBe(true);
    expect(report.cohort.perProbe).toHaveLength(AUTHORED_PROBES.length);
  });

  it('labels its thresholds provisional and never certifies', () => {
    const report = runProbePilot(AUTHORED_PROBES);
    expect(report.thresholds).toBe(PILOT_THRESHOLDS);
    expect(report.thresholds.provenance).toBe('provisional-synthetic-pilot');
    expect(describePilot(report)).toContain('provisional-synthetic-pilot');
    expect(describePilot(report)).toContain('NOT raters');
  });

  it('never flips rvPassed — a pilot is not a certification', () => {
    const before = AUTHORED_PROBES.map((p) => p.rvPassed);
    runProbePilot(AUTHORED_PROBES);
    expect(AUTHORED_PROBES.map((p) => p.rvPassed)).toEqual(before);
    expect(AUTHORED_PROBES.every((p) => p.rvPassed === false)).toBe(true);
  });

  it('reports the pilot standing in one paragraph a human can read', () => {
    const lines = describePilot(runProbePilot(AUTHORED_PROBES)).split('\n');
    expect(lines.some((l) => l.includes('administration(s)'))).toBe(true);
    expect(lines.some((l) => l.includes('adjudication:'))).toBe(true);
    expect(lines.some((l) => l.includes('standing:'))).toBe(true);
  });

  it('names the pole each instrument was validated to measure', () => {
    for (const probe of AUTHORED_PROBES) expect(validatedPole(probe)).toBe(probe.poleA);
  });

  it('catches an instrument defect when it is real (a probe with identical poles cannot discriminate)', () => {
    // poleA === poleB: no rater, scripted or human, can be shown a distinction. The harness's
    // flip check is what rejects it.
    const degenerate: Probe = { ...PROBE, id: 'probe-degenerate', poleB: PROBE.poleA };
    const report = runProbePilot([PROBE, degenerate]);
    expect(report.passes).toBe(false);
    expect(report.harnessFailures.length).toBeGreaterThan(0);
  });
});

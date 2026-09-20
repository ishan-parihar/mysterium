/**
 * The priority formula is CLOSED — contract tests for `24 §3.2.9` (`MY-AD-0025`).
 *
 * The reconciliation replaced eight ratified weights *plus* six unweighted additive terms with the
 * eight criteria alone. Two things can regress silently, and both have a guard here:
 *
 *   1. A new additive term (a "bonus") is added next to the weighted sum. It reads as a detail,
 *      it is not comparable to a criterion on the 0–1 scale, and it can reorder the criteria.
 *      Guarded by the ADDITIVITY IDENTITY: the score must equal the weighted sum of the eight
 *      criterion scores exactly, at every point of a probe grid.
 *   2. A criterion's input is absent and the absence takes a meaningful branch instead of a
 *      default. Guarded by ABSENCE EQUIVALENCE: omitting an optional input must score the same
 *      as passing its documented default.
 *
 * The second guard is not theoretical — an omitted `sessionDurationMs` made `undefined < 900_000`
 * false, so a fresh session was scored as a LONG one while the same session with `0` was scored as
 * short. Two code paths that differed only in whether they stamped the field scheduled different
 * encounters, and the WebUI parity gate caught it only once the flattening `theta = 1.0 for an
 * unvisited cell` substitution was removed.
 */
import { describe, it, expect } from 'vitest';
import {
  ALL_CRITERIA,
  CRITERION_SCORES,
  DEFAULT_WEIGHTS,
  FORMER_TERM_DISPOSITION,
  applyWeightBias,
  computePriority,
  computeContextBias,
  effectiveWeights,
  masteryConceptOf,
  weightSum,
  type PriorityInputs,
} from '../../src/core/engines/PriorityComputation.js';
import { rankCandidates, TIE_BAND } from '../../src/core/engines/EncounterScheduler.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import { ALL_LINES, type Line } from '../../src/core/domain/Line.js';
import { ALL_STAGES, type Stage } from '../../src/core/domain/Stage.js';
import { createInitialWorldState } from '../../src/core/engines/CandidateGeneration.js';

const NOW = 1_767_225_600_000; // fixed clock — determinism, not wall time

function probeSig(prefix = 'g26') {
  const altitudes = Object.fromEntries(ALL_LINES.map((l) => [l, 'Turquoise' as Stage])) as Record<Line, Stage>;
  const base = createSignificator(prefix, altitudes, 'Turquoise');
  return {
    ...base,
    // A shadow on every line×stage, so shadow-activation is exercised for any candidate cell.
    shadows: {
      entries: ALL_LINES.flatMap((line) =>
        ALL_STAGES.map((stage) => ({
          id: `shadow-${line}-${stage}`, quadrant: 'DarkAddiction' as const, line, stage,
          drive: 'Agency' as const, surfacedAt: 0, resolvedAt: null,
          recurrenceCount: 1, compoundPartner: 'probe-compound', severity: 1,
        })),
      ),
    },
    // A REAL timestamp one ms into the epoch: 0 is this codebase's "never visited" sentinel, and
    // §3.2.1 gives an unvisited cell 0.0 urgency, so 0 cannot be used to mean "very stale".
    theta: {
      lastEncounter: Object.fromEntries(
        ALL_LINES.flatMap((l) => ALL_STAGES.map((s) => [`${l}:${s}`, 1])),
      ),
    },
  } as unknown as ReturnType<typeof createSignificator>;
}

const probeWorld = createInitialWorldState(
  ALL_LINES.map((line) => ({
    id: `h-${line}-Turquoise`, name: `${line} probe`, kind: 'NPC' as const, line,
    stage: 'Turquoise' as Stage,
    drives: { dominant: 'Agency' as const, secondary: 'Eros' as const, shadowQuadrant: null },
    polarity: 'Sovereign' as const, narrativeRole: 'g26', relationships: ['h-0'], active: true,
  })) as never,
);

function inputs(over: Partial<PriorityInputs> = {}): PriorityInputs {
  return {
    candidate: {
      moduleRef: 'Cognitive:Turquoise', line: 'Cognitive', stage: 'Turquoise',
      modality: 'ImmersiveRPG', holonId: 'h-Cognitive-Turquoise', cooldownClear: true,
    },
    sig: probeSig(),
    world: probeWorld,
    session: { encountersSoFar: 3, sessionDurationMs: 600_000, targetSessionLength: 8, recentLines: [] },
    now: NOW,
    ...over,
  };
}

describe('24 §3.2.9 — the priority formula is closed', () => {
  it('the weight vector IS the eight criteria, summing to exactly 1.00', () => {
    expect(Object.keys(DEFAULT_WEIGHTS).sort()).toEqual([...ALL_CRITERIA].sort());
    expect(weightSum(DEFAULT_WEIGHTS)).toBeCloseTo(1, 12);
    // The renormalised canon values, asserted literally: a silent re-weighting is a contract change.
    expect(DEFAULT_WEIGHTS).toEqual({
      thetaUrgency: 0.21, shadowActivation: 0.19, polarityAlignment: 0.14,
      transformationReadiness: 0.14, driveCorrection: 0.09, narrativeCoherence: 0.09,
      sessionFit: 0.04, masteryAlignment: 0.1,
    });
  });

  it('the score is exactly the weighted sum of the eight criteria (additivity)', () => {
    const biases = [undefined, { shadowActivation: 1.8, thetaUrgency: 0.6 }, { sessionFit: 0.001 }];
    for (const bias of biases) {
      for (const line of ALL_LINES) {
        for (const stage of ALL_STAGES) {
          const i = inputs({
            candidate: {
              moduleRef: `${line}:${stage}`, line, stage, modality: 'ImmersiveRPG',
              holonId: `h-${line}-Turquoise`, cooldownClear: true,
            },
            bias,
          });
          const w = effectiveWeights(i);
          const recomputed = ALL_CRITERIA.reduce((acc, c) => acc + (w[c] ?? 0) * CRITERION_SCORES[c](i), 0);
          expect(computePriority(i)).toBe(recomputed);
        }
      }
    }
  });

  it('no priority can exceed 1.00 — the ceiling is structural, not empirical', () => {
    let max = -Infinity;
    let min = Infinity;
    for (const line of ALL_LINES) {
      for (const stage of ALL_STAGES) {
        for (const energy of ['low', 'moderate', 'high', undefined] as const) {
          for (const duration of [0, 60_000, 3_600_000]) {
            const p = computePriority(inputs({
              candidate: {
                moduleRef: `${line}:${stage}`, line, stage, modality: 'ImmersiveRPG',
                holonId: `h-${line}-Turquoise`, cooldownClear: true,
              },
              session: {
                encountersSoFar: 3, sessionDurationMs: duration, targetSessionLength: 8,
                recentLines: [], inferredEnergy: energy,
              },
            }));
            max = Math.max(max, p);
            min = Math.min(min, p);
          }
        }
      }
    }
    expect(max).toBeLessThanOrEqual(1);
    expect(min).toBeGreaterThanOrEqual(0);
  });

  it('bias renormalises to 1.00 and can never produce a negative or inflated weight', () => {
    const biases = [
      {},
      Object.fromEntries(ALL_CRITERIA.map((c) => [c, 0])), // silence everything
      { thetaUrgency: 100, sessionFit: 0.001 },
      { shadowActivation: 0, masteryAlignment: 50 },
    ];
    for (const bias of biases) {
      const w = applyWeightBias(DEFAULT_WEIGHTS, bias);
      expect(weightSum(w)).toBeCloseTo(1, 12);
      expect(ALL_CRITERIA.every((c) => (w[c] ?? -1) >= 0)).toBe(true);
    }
  });

  it('every additive term the reconciliation removed has a recorded disposition', () => {
    // The names come from canon §3.2.9's recorded deviation. A future additive term must appear
    // here to look legitimate — which is the point: the list is the audit surface.
    for (const term of [
      'noveltyBonus', 'weaknessBonus', 'diversityBonus', 'bleedBoost', 'rayBoost',
      'tieBreaker', 'userMatrixTargeting',
    ]) {
      expect(FORMER_TERM_DISPOSITION[term], term).toBeTruthy();
    }
  });

  it('ties are ordered by a comparator, never by inflating a score', () => {
    const scored = [
      { candidate: { moduleRef: 'b:one', line: 'Cognitive' as Line, stage: 'Turquoise' as Stage, modality: 'ImmersiveRPG' as const, holonId: 'h-1', cooldownClear: true }, priority: 0.42 },
      { candidate: { moduleRef: 'b:two', line: 'Emotional' as Line, stage: 'Turquoise' as Stage, modality: 'ImmersiveRPG' as const, holonId: 'h-2', cooldownClear: true }, priority: 0.42 },
    ];
    const first = rankCandidates(scored, probeSig(), probeWorld);
    const second = rankCandidates(scored, probeSig(), probeWorld);
    expect(first.map((s) => s.candidate.moduleRef)).toEqual(second.map((s) => s.candidate.moduleRef));
    // The tie band preserves equality — §3.3 reorders, it does not re-score.
    expect(first[0]!.priority).toBe(first[1]!.priority);
    expect(TIE_BAND).toBeGreaterThan(0);
  });
});

describe('an absent optional input must score as its documented default', () => {
  it('sessionDurationMs: omitted === 0 (a session with no duration yet is SHORT)', () => {
    // `undefined < 900_000` is false: before the fix, omitting the field scored the candidate as
    // a long session while passing 0 scored it as a short one.
    const withZero = computePriority(inputs({
      session: { encountersSoFar: 3, sessionDurationMs: 0, targetSessionLength: 8, recentLines: [] },
    }));
    const without = computePriority(inputs({
      session: { encountersSoFar: 3, targetSessionLength: 8, recentLines: [] },
    }));
    expect(withZero).toBe(without);
  });

  it('a never-visited cell scores 0.0 theta urgency, not maximum (§3.2.1)', () => {
    const fresh = createSignificator('fresh', Object.fromEntries(ALL_LINES.map((l) => [l, 'Red' as Stage])) as Record<Line, Stage>, 'Red');
    const i = inputs({ sig: fresh });
    expect(CRITERION_SCORES.thetaUrgency(i)).toBe(0);

    const stale = inputs(); // theta cells stamped at epoch+1ms, far past every half-life
    expect(CRITERION_SCORES.thetaUrgency(stale)).toBeGreaterThan(0.9);
  });

  it('a developmental candidate scores 0 on mastery alignment regardless of mastery fields', () => {
    const withFields = computePriority(inputs({
      candidate: {
        moduleRef: 'Cognitive:Turquoise', line: 'Cognitive', stage: 'Turquoise',
        modality: 'ImmersiveRPG', holonId: 'h-Cognitive-Turquoise', cooldownClear: true,
        targetBlindSpotClass: 'boundary', resolvesUnsatisfiedClosure: true,
        targetDepthLevel: 'transformed', isRetentionBoundaryReview: true,
      },
    }));
    const without = computePriority(inputs());
    // A developmental ref is exactly `<Line>:<Stage>`. Splitting it on `:` yields the string
    // `Turquoise`, which is not a concept — so the mastery fields are inert and mastery never
    // leaks into a developmental score.
    expect(withFields).toBe(without);
  });

  it('a curriculum candidate DOES exercise mastery alignment (the guard is not a dead criterion)', () => {
    const sig = probeSig();
    const curriculum = inputs({
      candidate: {
        moduleRef: 'algebra:linear-equations', line: 'Cognitive', stage: 'Turquoise',
        modality: 'LanguageReflective', holonId: 'h-Cognitive-Turquoise', cooldownClear: true,
        targetBlindSpotClass: 'sibling-confusion', resolvesUnsatisfiedClosure: true,
        isRetentionBoundaryReview: true,
      },
      sig,
    });
    expect(masteryConceptOf(curriculum.candidate)).toBe('linear-equations');
    expect(CRITERION_SCORES.masteryAlignment(curriculum)).toBeCloseTo(0.8, 10);
    // Worst case, mastery can only move the total by its own weight (0.10). Development keeps a
    // strict 0.90 majority in the same formula — mastery is never a separate mode.
    const dev = inputs({ sig });
    expect(computePriority(curriculum) - computePriority(dev)).toBeLessThanOrEqual(
      DEFAULT_WEIGHTS.masteryAlignment * 0.8 + 1e-12,
    );
  });

  it('the bias layer is multiplicative — it cannot lift a candidate over a stronger one', () => {
    // A pure function of the inputs, so identical inputs give identical bias; and a bias of 1
    // everywhere returns the identity, i.e. an unqualified call IS the plain canon formula.
    const i = inputs();
    expect(weightSum(effectiveWeights(i))).toBeCloseTo(1, 12);
    const identity = computeContextBias({ ...i, bleedThrough: undefined, userMatrixModel: undefined });
    expect(Object.values(identity).every((v) => v === 1)).toBe(true);
  });
});

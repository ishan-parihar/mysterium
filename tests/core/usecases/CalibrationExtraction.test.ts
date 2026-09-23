/**
 * Calibration extraction tests — Phase 14 d3 (Q10's ruling).
 *
 * The inference and the probe scoring used to sit inside `scripts/cli-game.ts`, outside the
 * checked graph, which is how the retired `White` stage survived in the marker table (the
 * checked-surface audit's F5). These tests make the two invariants that allowed that permanent:
 *
 * 1. the marker table names stages of the CANONICAL ladder only — no retired rung, and no rung
 *    invented to hold closure vocabulary (`Ray.ts`: *"there is no D4 stage"*);
 * 2. the scoring is pure arithmetic over the player's response, so accuracy and stage can never
 *    move in opposite directions.
 */
import { describe, it, expect } from 'vitest';
import {
  inferAltitudesFromAnswers,
  STAGE_MARKERS,
  CALIBRATION_FLOOR,
  MARKER_THRESHOLD,
} from '../../../src/core/usecases/InitialAltitudeInference.js';
import {
  probeKindFor,
  scoreHoldProbe,
  scoreChoiceProbe,
  holdAccuracy,
  holdThreshold,
  feltSenseLabel,
} from '../../../src/core/usecases/QuickCalibrationScoring.js';
import { ALL_STAGES, stageOrdinal } from '../../../src/core/domain/Stage.js';
import { ALL_LINES } from '../../../src/core/domain/Line.js';
import { HOLD_TARGETS } from '../../../src/core/data/calibrationPrompts.js';

describe('InitialAltitudeInference — the marker table', () => {
  it('names canonical stages only, and never the retired rung', () => {
    const named = Object.keys(STAGE_MARKERS);
    expect(named).toEqual([...ALL_STAGES]);
    expect(named).not.toContain('White');
  });

  it('claims no markers for the pre-conventional stages it cannot detect', () => {
    // Not an oversight: written answers carry no signal for these, and inventing one would be a
    // fabricated placement (the same discipline as an unrunnable probe).
    expect(STAGE_MARKERS.Infrared).toHaveLength(0);
    expect(STAGE_MARKERS.Magenta).toHaveLength(0);
  });

  it('requires MARKER_THRESHOLD hits, so one coincidental word is not a placement', () => {
    expect(MARKER_THRESHOLD).toBeGreaterThan(1);
    const one = inferAltitudesFromAnswers([[...STAGE_MARKERS.Green][0]]);
    expect(one.detectedStage).toBe(CALIBRATION_FLOOR);
  });
});

describe('InitialAltitudeInference — the inference', () => {
  it('is total: an empty answer set is the floor, and says so', () => {
    const r = inferAltitudesFromAnswers([]);
    expect(r.fellBackToFloor).toBe(true);
    expect(r.detectedStage).toBe(CALIBRATION_FLOOR);
    expect(Object.keys(r.altitudes).sort()).toEqual([...ALL_LINES].sort());
  });

  it('seeds every line at the same detected stage — differentiation is the encounters job', () => {
    const answers = [...STAGE_MARKERS.Green, ...STAGE_MARKERS.Orange];
    const r = inferAltitudesFromAnswers(answers);
    expect(new Set(Object.values(r.altitudes)).size).toBe(1);
    expect(stageOrdinal(r.detectedStage)).toBeGreaterThan(stageOrdinal(CALIBRATION_FLOOR));
  });

  it('never places above what the vocabulary supports, and reports its evidence', () => {
    const r = inferAltitudesFromAnswers([...STAGE_MARKERS.Teal]);
    expect(r.detectedStage).toBe('Teal');
    expect(r.stageScores.Teal).toBeGreaterThanOrEqual(MARKER_THRESHOLD);
    expect(r.fellBackToFloor).toBe(false);
  });
});

describe('QuickCalibrationScoring — probe kinds', () => {
  it('probes every line with exactly one instrument', () => {
    for (const line of ALL_LINES) {
      expect(['hold', 'choice']).toContain(probeKindFor(line));
    }
    expect(probeKindFor('Somatic')).toBe('hold');
    expect(probeKindFor('Willpower')).toBe('hold');
  });

  it('leaves a choice-probed line unscored by the timing instrument, and vice versa', () => {
    expect(scoreHoldProbe('Cognitive', 900)).toBeNull();
    expect(scoreChoiceProbe('Somatic', 0)).toBeNull();
  });
});

describe('QuickCalibrationScoring — timing probes', () => {
  it('accuracy is 1 at the target and decays with distance', () => {
    expect(holdAccuracy(700, 700)).toBe(1);
    expect(holdAccuracy(1400, 700)).toBe(0);
    expect(holdAccuracy(1050, 700)).toBeCloseTo(0.5, 5);
  });

  it('inverts the axis for Somatic and keeps the standard direction otherwise', () => {
    // Somatic expresses performance as a response time (lower is better)…
    expect(holdThreshold('Somatic', 1)).toBeLessThan(holdThreshold('Somatic', 0));
    // …volitional as a score (higher is better).
    expect(holdThreshold('Willpower', 1)).toBeGreaterThan(holdThreshold('Willpower', 0));
  });

  it('gives a strictly higher or equal stage as accuracy improves', () => {
    for (const line of ALL_LINES.filter((l) => probeKindFor(l) === 'hold')) {
      const target = HOLD_TARGETS[line]!;
      const good = scoreHoldProbe(line, target)!;
      const bad = scoreHoldProbe(line, target + target)!;
      expect(stageOrdinal(good.stage)).toBeGreaterThanOrEqual(stageOrdinal(bad.stage));
    }
  });
});

describe('QuickCalibrationScoring — choice probes', () => {
  it('clamps an out-of-range index instead of throwing', () => {
    const high = scoreChoiceProbe('Cognitive', 99)!;
    const atEnd = scoreChoiceProbe('Cognitive', 2)!;
    expect(high.stage).toBe(atEnd.stage);
    expect(scoreChoiceProbe('Cognitive', -5)!.stage).toBe(scoreChoiceProbe('Cognitive', 0)!.stage);
  });

  it('is monotone in the authored depth gradient', () => {
    const stages = [0, 1, 2].map((i) => stageOrdinal(scoreChoiceProbe('Moral', i)!.stage));
    expect(stages[0]).toBeLessThanOrEqual(stages[1]);
    expect(stages[1]).toBeLessThanOrEqual(stages[2]);
  });
});

describe('QuickCalibrationScoring — the rendered label', () => {
  it('bands the confidence the CLI would otherwise print as a number', () => {
    expect(feltSenseLabel(0.9)).toBe('clear');
    expect(feltSenseLabel(0.5)).toBe('emerging');
    expect(feltSenseLabel(0.1)).toBe('gathering');
  });
});

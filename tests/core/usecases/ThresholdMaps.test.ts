/**
 * ThresholdMaps contract tests — the onboarding altitude seed path
 * (ONBOARDING-REDESIGN-PLAN §2.2 via OnboardingCalibrator).
 *
 * Contract: per-line task-unit thresholds map to stages via THRESHOLD_MAPS;
 * Somatic is inverted (lower RT = higher stage). A threshold value is only
 * meaningful in its line's own units — feeding a 0–1 normalized value to a
 * ms-scale map silently saturates (previously produced a spurious 'Turquoise').
 */
import { describe, it, expect } from 'vitest';
import { thresholdToStage, THRESHOLD_MAPS } from '../../../src/core/usecases/ThresholdMaps.js';
import { calibrate } from '../../../src/core/usecases/OnboardingCalibrator.js';
import { ALL_LINES } from '../../../src/core/domain/Line.js';

describe('thresholdToStage — standard (ascending) maps', () => {
  it('maps the Cognitive span scale across the stage ladder', () => {
    expect(thresholdToStage('Cognitive', 0.5)).toBe('Infrared');
    expect(thresholdToStage('Cognitive', 1)).toBe('Infrared');
    expect(thresholdToStage('Cognitive', 1.5)).toBe('Magenta');
    expect(thresholdToStage('Cognitive', 2.2)).toBe('Red');
    expect(thresholdToStage('Cognitive', 2.8)).toBe('Amber');
    expect(thresholdToStage('Cognitive', 3.5)).toBe('Orange');
    expect(thresholdToStage('Cognitive', 4.5)).toBe('Green');
    expect(thresholdToStage('Cognitive', 5.5)).toBe('Teal');
    expect(thresholdToStage('Cognitive', 7)).toBe('Turquoise');
  });

  it('maps boundary values inclusively (>= cutoff)', () => {
    expect(thresholdToStage('Emotional', 2.5)).toBe('Red');
    expect(thresholdToStage('Willpower', 4)).toBe('Red');
  });

  it('never returns below Infrared for sub-threshold values', () => {
    for (const line of ALL_LINES) {
      if (line === 'Somatic') continue;
      expect(thresholdToStage(line, 0)).toBe('Infrared');
    }
  });
});

describe('thresholdToStage — Somatic (inverted RT map)', () => {
  it('maps lower RT to higher stages', () => {
    expect(thresholdToStage('Somatic', 900)).toBe('Infrared');
    expect(thresholdToStage('Somatic', 650)).toBe('Red');
    expect(thresholdToStage('Somatic', 550)).toBe('Amber');
    expect(thresholdToStage('Somatic', 350)).toBe('Green');
    expect(thresholdToStage('Somatic', 200)).toBe('Turquoise');
  });

  it('continues the inverted ladder below the minimum cutoff (faster → ceiling)', () => {
    // The map is in MILLISECONDS — unit responsibility lies with the caller.
    // A sub-minimum value (e.g. 150ms, or a misunit-ed 0.55) continues the
    // inverted ladder to its ceiling. Callers feeding normalized 0–1 values
    // will saturate — that is the caller's unit bug (see TrainingRuntime demo
    // thresholds, which use per-line task units).
    expect(thresholdToStage('Somatic', 150)).toBe('Turquoise');
  });

  it('seeds Amber — not Turquoise — from ms-unit demo thresholds (calibrate path)', () => {
    // Mirrors src/cli/TrainingRuntime.ts --onboard demo thresholds: per-line
    // task units, all landing at Amber. The pre-fix demo fed 0.55 to every
    // line, saturating Somatic to a spurious Turquoise.
    const out = calibrate(
      ALL_LINES.map((line) => ({
        line,
        accuracy: 0.62,
        medianReactionMs: 820,
        threshold: line === 'Somatic' ? 550 : line === 'Cognitive' ? 2.8 : line === 'Willpower' ? 5.5 : 3.2,
        trials: [],
      })),
    );
    expect(out.altitudes.Somatic).toBe('Amber');
    expect(out.altitudes.Cognitive).toBe('Amber');
    expect(out.altitudes.Emotional).toBe('Amber');
    expect(out.stage).toBe('Amber');
  });
});

describe('map integrity', () => {
  it('every line has a complete 8-stage map, ascending except Somatic', () => {
    for (const line of ALL_LINES) {
      const map = THRESHOLD_MAPS[line];
      expect(map.map(([, s]) => s), `${line} stages`).toEqual([
        'Infrared', 'Magenta', 'Red', 'Amber', 'Orange', 'Green', 'Teal', 'Turquoise',
      ]);
      const values = map.map(([v]) => v);
      const sorted = [...values].sort((a, b) => (line === 'Somatic' ? b - a : a - b));
      expect(values, `${line} cutoff ordering`).toEqual(sorted);
    }
  });
});

describe('calibrate — end-to-end altitude seeding', () => {
  it('seeds per-line altitudes from task-unit thresholds', () => {
    const out = calibrate([
      { line: 'Cognitive', accuracy: 0.62, medianReactionMs: 820, threshold: 2.8, trials: [] },
      { line: 'Somatic', accuracy: 0.62, medianReactionMs: 820, threshold: 550, trials: [] },
    ]);
    expect(out.altitudes.Cognitive).toBe('Amber');
    expect(out.altitudes.Somatic).toBe('Amber');
    // Unprobed lines default to Infrared.
    expect(out.altitudes.Moral).toBe('Infrared');
    // Overall stage = minimum across lines.
    expect(out.stage).toBe('Infrared');
  });

  it('drive weights default to an even quarter split', () => {
    const out = calibrate([]);
    expect(out.driveWeights).toEqual({ Agency: 0.25, Communion: 0.25, Eros: 0.25, Agape: 0.25 });
  });
});

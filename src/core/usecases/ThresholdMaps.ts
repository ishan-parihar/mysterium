/**
 * ThresholdMaps — per-line threshold→stage mappings for onboarding calibration.
 * Each line has its own scale; thresholdToStage finds the highest stage
 * whose threshold the player meets or exceeds.
 */
import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';

type ThresholdMap = readonly (readonly [number, Stage])[];

const COGNITIVE: ThresholdMap = [
  [1, 'Infrared'], [1.5, 'Magenta'], [2.2, 'Red'], [2.8, 'Amber'],
  [3.5, 'Orange'], [4.5, 'Green'], [5.5, 'Teal'], [7, 'Turquoise'],
];

const EMOTIONAL: ThresholdMap = [
  [1, 'Infrared'], [1.8, 'Magenta'], [2.5, 'Red'], [3.2, 'Amber'],
  [4, 'Orange'], [4.8, 'Green'], [5.5, 'Teal'], [6.5, 'Turquoise'],
];

/** Somatic: lower RT = higher stage. Map stores RT cutoffs in ascending order. */
const SOMATIC: ThresholdMap = [
  [900, 'Infrared'], [750, 'Magenta'], [650, 'Red'], [550, 'Amber'],
  [450, 'Orange'], [350, 'Green'], [280, 'Teal'], [200, 'Turquoise'],
];

const WILLPOWER: ThresholdMap = [
  [1, 'Infrared'], [2.5, 'Magenta'], [4, 'Red'], [5.5, 'Amber'],
  [7, 'Orange'], [9, 'Green'], [12, 'Teal'], [15, 'Turquoise'],
];

export const THRESHOLD_MAPS: Record<Line, ThresholdMap> = {
  Cognitive: COGNITIVE,
  Emotional: EMOTIONAL,
  Moral: EMOTIONAL,
  Intrapersonal: EMOTIONAL,
  Spiritual: EMOTIONAL,
  Somatic: SOMATIC,
  Willpower: WILLPOWER,
  Interpersonal: EMOTIONAL,
};

/**
 * Map a threshold value to a stage for a given line.
 * For Somatic, lower RT = higher stage (cutoffs descend).
 * For all others, higher threshold = higher stage (cutoffs ascend).
 */
export function thresholdToStage(line: Line, threshold: number): Stage {
  const map = THRESHOLD_MAPS[line];

  if (line === 'Somatic') {
    // Inverted: lower threshold (faster RT) = higher stage.
    // Map is sorted descending: [900→Infrared, 800→Magenta, ... 200→Turquoise]
    let result: Stage = 'Infrared';
    for (const [cutoff, stage] of map) {
      if (threshold <= cutoff) {
        result = stage;
      }
    }
    return result;
  }

  // Standard: higher threshold = higher stage
  let result: Stage = 'Infrared';
  for (const [cutoff, stage] of map) {
    if (threshold >= cutoff) {
      result = stage;
    }
  }
  return result;
}

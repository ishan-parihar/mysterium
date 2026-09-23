/**
 * OnboardingCalibrator — converts onboarding probe results into initial altitudes.
 * Uses per-line threshold maps from FastStaircase convergence levels.
 */
import type { Drive } from '../domain/Drive.js';
import { ALL_LINES } from '../domain/Line.js';
import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';
import type { StaircaseState } from '../domain/SharedTypes.js';
import { ALL_STAGES } from '../domain/Stage.js';
import { thresholdToStage } from './ThresholdMaps.js';

export interface ProbeResult {
  readonly line: Line;
  readonly accuracy: number;
  readonly medianReactionMs: number;
  readonly threshold: number;
  readonly trials: readonly ProbeTrialResult[];
}

export interface ProbeTrialResult {
  readonly correct: boolean;
  readonly reactionMs: number;
}

export interface CalibrationOutput {
  readonly altitudes: Record<Line, Stage>;
  readonly driveWeights: Record<Drive, number>;
  readonly stage: Stage;
  readonly taskStaircases: Partial<Record<string, StaircaseState>>;
}

/**
 * Calibrate initial altitudes from onboarding probes.
 * Maps each line's FastStaircase threshold to a stage via per-line maps.
 */
export function calibrate(
  probes: readonly ProbeResult[],
  driveSignals?: Partial<Record<Drive, number>>,
): CalibrationOutput {
  const altitudes = {} as Record<Line, Stage>;
  const taskStaircases: Partial<Record<string, StaircaseState>> = {};

  for (const probe of probes) {
    altitudes[probe.line] = thresholdToStage(probe.line, probe.threshold);
    taskStaircases[probe.line] = {
      level: probe.threshold,
      reversals: 0,
      lastDirection: null,
      history: [],
    };
  }

  for (const line of ALL_LINES) {
    if (!(line in altitudes)) {
      altitudes[line] = 'Infrared';
    }
  }

  const driveWeights: Record<Drive, number> = {
    Agency: driveSignals?.Agency ?? 0.25,
    Communion: driveSignals?.Communion ?? 0.25,
    Eros: driveSignals?.Eros ?? 0.25,
    Agape: driveSignals?.Agape ?? 0.25,
  };

  let minIdx = 7;
  for (const line of ALL_LINES) {
    const idx = ALL_STAGES.indexOf(altitudes[line]);
    if (idx < minIdx) minIdx = idx;
  }

  return {
    altitudes,
    driveWeights,
    stage: ALL_STAGES[minIdx]!,
    taskStaircases,
  };
}

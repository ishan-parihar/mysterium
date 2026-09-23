/**
 * Scoring mode router - applies mode-specific scoring logic per trial.
 * Spec: docs/STAGE-ASSESSMENT-ARCHITECTURE Part V.
 *
 * Four execution modes, each producing different scoring signals:
 *   capacity    - standard pass/fail against rubric
 *   shadow      - drive-health probe scoring (dark/golden per drive)
 *   calibration - information gain / convergence signal
 *   practice    - improvement tracking (delta from baseline)
 */
import type {
  ModuleExecutionMode,
  TrialResult,
  ScoringRubric,
  MeasureDimension,
} from './types.js';
import { ALL_DRIVES } from '../domain/Drive.js';

export interface ScoredTrial extends TrialResult {
  readonly mode: ModuleExecutionMode;
  readonly weightedScore: number;
  readonly modeSpecific: Record<string, number>;
}

/**
 * Score a single trial according to the active execution mode.
 */
export function scoreTrial(
  mode: ModuleExecutionMode,
  trial: TrialResult,
  rubric: ScoringRubric,
): ScoredTrial {
  switch (mode) {
    case 'capacity':
    case 'encounter':
      return scoreCapacity(trial, rubric);
    case 'shadow':
      return scoreShadow(trial, rubric);
    case 'calibration':
      return scoreCalibration(trial, rubric);
    case 'practice':
      return scorePractice(trial, rubric);
  }
}

function computeWeightedScore(
  dimensions: Partial<Record<MeasureDimension, number>>,
  rubric: ScoringRubric,
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [dim, weight] of Object.entries(rubric.dimensionWeights)) {
    if (weight === undefined || weight === 0) continue;
    const value = dimensions[dim as MeasureDimension];
    if (value !== undefined) {
      weightedSum += value * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Capacity mode: score against dimension weights and passThreshold.
 */
function scoreCapacity(trial: TrialResult, rubric: ScoringRubric): ScoredTrial {
  const weightedScore = computeWeightedScore(trial.dimensions, rubric);
  const passed = weightedScore >= rubric.passThreshold ? 1 : 0;
  const margin = weightedScore - rubric.passThreshold;

  return {
    ...trial,
    mode: 'capacity',
    weightedScore,
    modeSpecific: {
      passed,
      margin,
      threshold: rubric.passThreshold,
    },
  };
}

/**
 * Shadow mode: score against drive-health signals.
 * Dark shadow = score well below threshold (avoidance/suppression).
 * Golden shadow = score well above threshold but inconsistently (projection).
 */
function scoreShadow(trial: TrialResult, rubric: ScoringRubric): ScoredTrial {
  const weightedScore = computeWeightedScore(trial.dimensions, rubric);
  const deviation = weightedScore - rubric.passThreshold;

  // Dark shadow signal: low performance suggests avoidance
  const darkSignal = Math.max(0, -deviation);
  // Golden shadow signal: high variance with high performance suggests projection
  const goldenSignal = Math.max(0, deviation * 0.5);

  return {
    ...trial,
    mode: 'shadow',
    weightedScore,
    modeSpecific: {
      darkSignal,
      goldenSignal,
      deviation,
    },
  };
}

/**
 * Calibration mode: score for convergence signal (information gain).
 * Higher surprise (distance from expected) = more informative trial.
 */
function scoreCalibration(trial: TrialResult, rubric: ScoringRubric): ScoredTrial {
  const weightedScore = computeWeightedScore(trial.dimensions, rubric);
  // Information gain: how much this trial's score deviates from the threshold
  // Trials near the boundary are most informative for calibration
  const distFromThreshold = Math.abs(weightedScore - rubric.passThreshold);
  const informationGain = 1 - distFromThreshold; // near-boundary = high info
  const convergenceSignal = Math.max(0, Math.min(1, informationGain));

  return {
    ...trial,
    mode: 'calibration',
    weightedScore,
    modeSpecific: {
      convergenceSignal,
      distFromThreshold,
      informationGain: convergenceSignal,
    },
  };
}

/**
 * Practice mode: score for improvement tracking.
 * Delta from baseline indicates growth direction and magnitude.
 */
function scorePractice(trial: TrialResult, rubric: ScoringRubric): ScoredTrial {
  const weightedScore = computeWeightedScore(trial.dimensions, rubric);
  // In practice mode, we track improvement relative to baseline (threshold as proxy)
  const deltaFromBaseline = weightedScore - rubric.passThreshold;
  const improvementSignal = Math.max(0, deltaFromBaseline);
  const effortScore = Math.min(1, weightedScore);

  return {
    ...trial,
    mode: 'practice',
    weightedScore,
    modeSpecific: {
      deltaFromBaseline,
      improvementSignal,
      effortScore,
    },
  };
}

/**
 * Aggregate shadow-mode scored trials into per-drive health scores.
 * Each trial must carry a `taskId` that matches one of the module's drive probe task IDs.
 * Trials not matching any probe are ignored for drive-health computation.
 *
 * Returns drive health (1.0 = healthy, 0.0 = pathological) and pathology classification.
 */
export function aggregateShadowTrials(
  trials: readonly ScoredTrial[],
  probeTaskIds: { agency: string; communion: string; eros: string; agape: string },
): {
  driveHealth: {
    agency: { dark: number; golden: number };
    communion: { dark: number; golden: number };
    eros: { dark: number; golden: number };
    agape: { dark: number; golden: number };
  };
  dominantPathology: { drive: 'Agency' | 'Communion' | 'Eros' | 'Agape'; domain: 'dark' | 'golden'; type: 'addiction' | 'allergy' } | null;
} {
  const drives = ['agency', 'communion', 'eros', 'agape'] as const;
  const driveNames = ALL_DRIVES;
  const result = {} as Record<string, { dark: number; golden: number }>;

  for (const drive of drives) {
    const probeTrials = trials.filter(t => t.taskId === probeTaskIds[drive]);
    if (probeTrials.length === 0) {
      result[drive] = { dark: 0.7, golden: 0.7 };
      continue;
    }
    // dark health = 1 - average darkSignal (high darkSignal = unhealthy)
    const avgDark = probeTrials.reduce((s, t) => s + (t.modeSpecific['darkSignal'] ?? 0), 0) / probeTrials.length;
    // golden health = 1 - average goldenSignal
    const avgGolden = probeTrials.reduce((s, t) => s + (t.modeSpecific['goldenSignal'] ?? 0), 0) / probeTrials.length;
    result[drive] = {
      dark: Math.max(0, Math.min(1, 1 - avgDark)),
      golden: Math.max(0, Math.min(1, 1 - avgGolden)),
    };
  }

  // Identify dominant pathology
  let worstScore = 1;
  let worstDriveIdx = 0;
  let worstDomain: 'dark' | 'golden' = 'dark';
  for (let i = 0; i < ALL_DRIVES.length; i++) {
    const h = result[drives[i]!]!;
    if (h.dark < worstScore) { worstScore = h.dark; worstDriveIdx = i; worstDomain = 'dark'; }
    if (h.golden < worstScore) { worstScore = h.golden; worstDriveIdx = i; worstDomain = 'golden'; }
  }

  const dominantPathology = worstScore < 0.5
    ? {
        drive: driveNames[worstDriveIdx],
        domain: worstDomain,
        // Addiction: over-expression (agency/eros high, communion/agape low)
        // Allergy: under-expression (agency/eros low, communion/agape high)
        type: (result['agency'][worstDomain] + result['eros'][worstDomain]) >
              (result['communion'][worstDomain] + result['agape'][worstDomain])
          ? 'addiction' as const
          : 'allergy' as const,
      }
    : null;

  return {
    driveHealth: result as any,
    dominantPathology,
  };
}

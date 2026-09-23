/**
 * Assessment Engine - pure functions for scoring and aggregation.
 * Spec: docs/STAGE-ASSESSMENT-ARCHITECTURE Part V.
 *
 * All functions are pure: state in, result out. No side effects.
 */
import type {
  StageAssessment,
  TrialResult,
  AssessmentResult,
  ScoringRubric,
  MeasureDimension,
  ModuleExecutionMode,
  ShadowAssessmentResult,
} from './types.js';
import { ALL_DRIVES } from '../domain/Drive.js';
import type { Drive } from '../domain/Drive.js';

const ALL_DIMENSIONS: readonly MeasureDimension[] = [
  'accuracy',
  'response_time',
  'consistency',
  'depth',
  'self_correction',
  'complexity_handled',
  'transfer',
  'metacognition',
  'coherence',
  'integration',
];

/**
 * Compute weighted average for each dimension across trials.
 * Dimensions not present in a trial are excluded from that trial's contribution.
 * Weights from the rubric determine each dimension's importance in the final score.
 */
export function scoreTrials(
  trials: readonly TrialResult[],
  _rubric: ScoringRubric,
): Record<MeasureDimension, number> {
  const result = {} as Record<MeasureDimension, number>;

  for (const dim of ALL_DIMENSIONS) {
    const values: number[] = [];
    for (const trial of trials) {
      const v = trial.dimensions[dim];
      if (v !== undefined) {
        values.push(v);
      }
    }
    if (values.length === 0) {
      result[dim] = 0;
    } else {
      const sum = values.reduce((a, b) => a + b, 0);
      result[dim] = sum / values.length;
    }
  }

  return result;
}

/**
 * Compute confidence in the pass/fail determination.
 * Formula: distance * consistency * trialFactor
 *   - distance: normalized distance of weighted score from threshold
 *   - consistency: 1 - variance of dimension scores across trials
 *   - trialFactor: min(1, trials.length / 6) - more trials = more confidence
 */
export function computeConfidence(
  trials: readonly TrialResult[],
  passThreshold: number,
): number {
  if (trials.length === 0) return 0;

  // Compute weighted score across all trials (average of all dimensions present)
  const trialScores: number[] = [];
  for (const trial of trials) {
    const values = Object.values(trial.dimensions).filter(
      (v): v is number => v !== undefined,
    );
    if (values.length > 0) {
      trialScores.push(values.reduce((a, b) => a + b, 0) / values.length);
    }
  }

  if (trialScores.length === 0) return 0;

  const mean = trialScores.reduce((a, b) => a + b, 0) / trialScores.length;

  // distance: how far from the threshold (normalized 0-1)
  const distance = Math.min(1, Math.abs(mean - passThreshold));

  // consistency: 1 - variance (clamped to 0-1)
  const variance =
    trialScores.length > 1
      ? trialScores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / trialScores.length
      : 0;
  const consistency = Math.max(0, 1 - variance);

  // trialFactor: more trials increases confidence, saturates at 6
  const trialFactor = Math.min(1, trials.length / 6);

  return distance * consistency * trialFactor;
}

/**
 * Run an assessment by aggregating trial results against a module's rubric.
 * Returns a full AssessmentResult with pass/fail determination.
 */
export function runAssessment(
  module: StageAssessment,
  trials: readonly TrialResult[],
): AssessmentResult {
  const rubric = module.scoringRubric;
  const dimensions = scoreTrials(trials, rubric);

  // Compute weighted score using rubric dimension weights
  let weightedSum = 0;
  let totalWeight = 0;
  for (const dim of ALL_DIMENSIONS) {
    const weight = rubric.dimensionWeights[dim] ?? 0;
    if (weight > 0) {
      weightedSum += dimensions[dim] * weight;
      totalWeight += weight;
    }
  }

  const weightedScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const passed = weightedScore >= rubric.passThreshold;
  const confidence = computeConfidence(trials, rubric.passThreshold);

  return {
    line: module.line,
    stage: module.stage,
    passed,
    confidence,
    dimensions,
    rawTrials: trials,
  };
}

// ─── Mode-Aware Assessment Functions ────────────────────────────────────────

/**
 * Mode-aware assessment runner. Dispatches to the appropriate scoring path
 * based on execution mode.
 */
export function runModeAwareAssessment(
  module: StageAssessment,
  trials: readonly TrialResult[],
  mode: ModuleExecutionMode,
): AssessmentResult | ShadowAssessmentResult {
  switch (mode) {
    case 'shadow':
      return runShadowAssessment(module, trials);
    case 'calibration':
      return runCalibrationAssessment(module, trials);
    case 'practice':
    case 'capacity':
    default:
      return runAssessment(module, trials);
  }
}

/**
 * Shadow mode assessment: scores drive-health per drive per domain.
 * Produces ShadowAssessmentResult with driveHealth, severity, and dominant pathology.
 */
export function runShadowAssessment(
  module: StageAssessment,
  trials: readonly TrialResult[],
): ShadowAssessmentResult {
  const baseResult = runAssessment(module, trials);

  // Map trials to drive probes by matching task IDs
  const driveProbeTaskIds = {
    agency: module.driveProbes.agency.task.id,
    communion: module.driveProbes.communion.task.id,
    eros: module.driveProbes.eros.task.id,
    agape: module.driveProbes.agape.task.id,
  };

  const driveHealth = computeDriveHealth(trials, driveProbeTaskIds);
  const darkShadowSeverity = Math.max(
    1 - driveHealth.agency.dark,
    1 - driveHealth.communion.dark,
    1 - driveHealth.eros.dark,
    1 - driveHealth.agape.dark,
  );
  const goldenShadowSeverity = Math.max(
    1 - driveHealth.agency.golden,
    1 - driveHealth.communion.golden,
    1 - driveHealth.eros.golden,
    1 - driveHealth.agape.golden,
  );

  const dominantPathology = identifyDominantPathology(driveHealth);

  return {
    ...baseResult,
    driveHealth,
    darkShadowSeverity,
    goldenShadowSeverity,
    dominantPathology,
  };
}

/**
 * Calibration mode: same as capacity but enforces minimum trials.
 */
function runCalibrationAssessment(
  module: StageAssessment,
  trials: readonly TrialResult[],
): AssessmentResult {
  const result = runAssessment(module, trials);
  // In calibration, confidence is penalised if below minimum trials
  const trialPenalty = trials.length < module.minimumTrials
    ? trials.length / module.minimumTrials
    : 1;
  return {
    ...result,
    confidence: result.confidence * trialPenalty,
  };
}

type DriveHealthScores = ShadowAssessmentResult['driveHealth'];

/**
 * Compute per-drive per-domain health scores from trial results.
 * Each drive probe trial's dimensions are averaged to produce a health score.
 * Dark domain = how well the player relates to current/past capacity.
 * Golden domain = how well the player relates to next-stage capacity.
 * Score of 1.0 = healthy, 0.0 = severely pathological.
 */
function computeDriveHealth(
  trials: readonly TrialResult[],
  probeTaskIds: Record<string, string>,
): DriveHealthScores {
  const drives = ['agency', 'communion', 'eros', 'agape'] as const;
  const result = {} as Record<string, { dark: number; golden: number }>;

  for (const drive of drives) {
    const probeTrials = trials.filter(t => t.taskId === probeTaskIds[drive]);
    if (probeTrials.length === 0) {
      // No probe data — assume healthy (0.7 baseline)
      result[drive] = { dark: 0.7, golden: 0.7 };
      continue;
    }

    // Average all dimension values for this drive's trials
    const scores = probeTrials.map(t => {
      const vals = Object.values(t.dimensions).filter((v): v is number => v !== undefined);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0.5;
    });
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Dark domain: score directly (high = healthy relationship to current)
    // Golden domain: derived from consistency + depth (high = healthy relationship to growth)
    const consistency = probeTrials.length > 1
      ? 1 - Math.sqrt(scores.reduce((sum, s) => sum + (s - avgScore) ** 2, 0) / scores.length)
      : 0.7;

    result[drive] = {
      dark: Math.max(0, Math.min(1, avgScore)),
      golden: Math.max(0, Math.min(1, (avgScore + consistency) / 2)),
    };
  }

  return result as DriveHealthScores;
}

/**
 * Identify the most pathological drive and its domain/type.
 */
function identifyDominantPathology(
  driveHealth: DriveHealthScores,
): ShadowAssessmentResult['dominantPathology'] {
  const driveKeys = ['agency', 'communion', 'eros', 'agape'] as const;

  let worstDrive: Drive = 'Agency';
  let worstDomain: 'dark' | 'golden' = 'dark';
  let worstScore = 1;

  for (let i = 0; i < ALL_DRIVES.length; i++) {
    const key = driveKeys[i]!;
    const health = driveHealth[key];
    if (health.dark < worstScore) {
      worstScore = health.dark;
      worstDrive = ALL_DRIVES[i]!;
      worstDomain = 'dark';
    }
    if (health.golden < worstScore) {
      worstScore = health.golden;
      worstDrive = ALL_DRIVES[i]!;
      worstDomain = 'golden';
    }
  }

  // Only report pathology if score is below 0.5 (developing or worse)
  if (worstScore >= 0.5) return null;

  // Determine addiction vs allergy:
  // Addiction = high agency/eros but low communion/agape (over-doing)
  // Allergy = low agency/eros but high communion/agape (under-doing)
  const agencyHealth = driveHealth.agency[worstDomain];
  const communionHealth = driveHealth.communion[worstDomain];
  const type: 'addiction' | 'allergy' = agencyHealth > communionHealth ? 'addiction' : 'allergy';

  return { drive: worstDrive, domain: worstDomain, type };
}

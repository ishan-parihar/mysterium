/**
 * AutoModeStrategy -- Session-level strategy engine.
 * Spec: foundations/27
 *
 * Consumes the CCI (foundations/25) and produces a session plan that
 * parameterises the encounter scheduler's session arc, biases its priority
 * weights, and adjusts mid-session based on engagement signals.
 *
 * Auto-mode wraps the scheduler; it never replaces it.
 * Pure functions: state in, strategy out. No side effects.
 */
import type { SignificatorSnapshot } from '../domain/SignificatorSnapshot.js';
import type { PriorityBias, SessionContext } from './PriorityComputation.js';
import { applyWeightBias as applyCanonicalWeightBias } from './PriorityComputation.js';
import type { CCIScore, SessionTheme } from './CCIEngine.js';
import type { StudyTheme } from '../curriculum/types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WarmupFocus =
  | 'theta-decay-arrest'
  | 'familiar-modality'
  | 'drive-rebalancing'
  | 'continuation'
  | 'general';

export interface ParameterisedSessionArc {
  warmup: {
    intensityCeiling: number;
    focus: WarmupFocus;
    preferredModalities: string[];
  };
  peak: {
    intensityRange: { min: number; max: number };
    shadowAllocation: number;
    transformationSlots: number;
  };
  cooldown: {
    intensityCeiling: number;
    integrationFocus: boolean;
    preferredModalities: string[];
  };
}

/**
 * A theme's emphasis, expressed as multiplicative bias on the eight criteria (`24 §3.2.9`).
 * `1.0` (or absent) = no change. `masteryAlignment` is a first-class member (`24 §3.2.8`).
 *
 * This is an alias of the canonical `PriorityBias`, not a parallel type: two bias types meant
 * two normalisation paths, and the second one carried `userMatrixTargeting` as a ninth weight —
 * exactly the shape `§3.2.9` forbids (`MY-RG-0023`).
 */
export type PriorityWeightBias = PriorityBias;

/**
 * Canonical weight-bias application (`24 §3.2.9`): multiply, then renormalise to exactly 1.00.
 * Re-exported rather than reimplemented — one normalisation path, always.
 */
export const applyWeightBias = applyCanonicalWeightBias;

export interface EncounterBudget {
  totalTarget: number;
  warmupCount: number;
  peakCount: number;
  cooldownCount: number;
  shadowEncounterCap: number;
  practiceSlots: number;
}

export interface AdjustmentThresholds {
  energyDropThreshold: number;
  avoidanceSpikeThreshold: number;
  engagementSurgeThreshold: number;
  shadowFatigueTrials: number;
  reEvaluationInterval: number;
}

export const DEFAULT_ADJUSTMENT_THRESHOLDS: AdjustmentThresholds = {
  energyDropThreshold: 0.35,
  avoidanceSpikeThreshold: 0.4,
  engagementSurgeThreshold: 0.8,
  shadowFatigueTrials: 3,
  reEvaluationInterval: 3,
};

export interface SessionStrategy {
  theme: SessionTheme;
  themeRationale: string;
  arc: ParameterisedSessionArc;
  weightBias: PriorityWeightBias;
  encounterBudget: EncounterBudget;
  modalityBias: Partial<Record<string, number>>;
  adjustmentThresholds: AdjustmentThresholds;
  /** Curriculum study theme — derived from knowledge state when available. */
  studyTheme?: StudyTheme;
  /** Curriculum encounter slots within the session budget. */
  curriculumSlots?: number;
  /** Training-beat slots: brain-game interludes woven into narrative sessions. */
  trainingSlots?: number;
}

export interface SessionStrategyAdjustment {
  type: 'intensity-reduction' | 'intensity-increase' | 'theme-shift' | 'shadow-pause';
  newPeakIntensity?: { min: number; max: number };
  newTheme?: SessionTheme;
  newWeightBias?: PriorityWeightBias;
  shadowBiasOverride?: number;
  rationale: string;
}

export interface RecentEncounter {
  outcome: 'completed' | 'avoided' | 'abandoned';
  quality: number;
  mode: 'capacity' | 'shadow' | 'calibration' | 'practice';
  shadowIntegrated: boolean;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Generate a complete session strategy from CCI signals and session context.
 * Called at session start before the first encounter.
 */
export function generateSessionStrategy(
  cci: CCIScore,
  session: SessionContext,
  _previousStrategy: SessionStrategy | null,
  knowledge?: { readonly learningProfile?: { readonly modalityEffectiveness?: Readonly<Record<string, number>> } },
): SessionStrategy {
  const theme = cci.sessionSignals.recommendedTheme;
  const arc = parameteriseArc(theme, cci, session);
  const weightBias = computeWeightBias(theme, cci);
  const encounterBudget = computeEncounterBudget(session, arc);
  const modalityBias = computeModalityBias(theme);
  const adjustmentThresholds = { ...DEFAULT_ADJUSTMENT_THRESHOLDS };

  // 6. Derive curriculum study theme and slots from knowledge health
  const studyTheme = selectStudyTheme(cci);
  const curriculumSlots = computeCurriculumSlots(session, cci);
  const trainingSlots = computeTrainingSlots(session);

  // Phase 4C: Apply modality effectiveness bias from LearningAnalytics.
  // When the player's learning profile has modality effectiveness data,
  // boost modalities that historically produce better learning outcomes.
  const analyticsBias = computeAnalyticsModalityBias(cci, knowledge?.learningProfile);
  const mergedModalityBias = { ...modalityBias, ...analyticsBias };

  return {
    theme,
    themeRationale: `CCI dominant dimension: ${cci.dominantDimension}; composite: ${cci.composite.toFixed(2)}`,
    arc,
    weightBias,
    encounterBudget,
    modalityBias: mergedModalityBias,
    adjustmentThresholds,
    studyTheme,
    curriculumSlots,
    trainingSlots,
  };
}

// ---------------------------------------------------------------------------
// Curriculum study theme selection (foundations/34)
// ---------------------------------------------------------------------------

/**
 * Select the curriculum study theme based on CCI knowledge health signals.
 * Maps the CCI's knowledgeHealth composite to a StudyTheme that biases
 * which curriculum encounters are scheduled.
 *
 * Priority order: review_decay > misconception_repair > depth_push >
 *                 cross_domain > integration_sprint > new_material.
 */
export function selectStudyTheme(cci: CCIScore): StudyTheme | undefined {
  const kh = cci.knowledgeHealth;
  if (!kh) return undefined;

  // No curriculum data yet — defer entirely
  if (kh.conceptCoverage === 0 && kh.averageDepth === 0) return undefined;

  // High misconception load demands repair
  if (kh.misconceptionLoad > 0.3) return 'misconception_repair';

  // Low retention health demands spaced review
  if (kh.retentionHealth < 0.4) return 'review_decay';

  // Low average depth — push deeper into current material
  if (kh.averageDepth < 0.3) return 'depth_push';

  // Low integration density — connect concepts across domains
  if (kh.integrationDensity < 0.3) return 'cross_domain';

  // High coverage but moderate depth — sprint toward synthesis
  if (kh.conceptCoverage > 0.6 && kh.averageDepth > 0.4) return 'integration_sprint';

  // Default: introduce new material when fundamentals are healthy
  if (kh.conceptCoverage <= 0.6) return 'new_material';

  // Fallback: balanced review
  return 'review_decay';
}

/**
 * Compute the number of curriculum encounter slots for this session.
 * Slots are carved from the total encounter budget. When no curriculum
 * data is available, returns 0 (pure developmental session).
 */
export function computeCurriculumSlots(
  session: SessionContext,
  cci: CCIScore,
): number {
  const kh = cci.knowledgeHealth;
  if (!kh || kh.conceptCoverage === 0) return 0;

  const totalTarget = session.targetSessionLength;

  // Curriculum slots: 10-20% of total, scaled by knowledge health composite
  // Higher composite = more slots (the player is ready for more curriculum)
  const maxSlots = Math.max(1, Math.round(totalTarget * 0.2));
  const minSlots = Math.min(1, maxSlots);

  // Scale by knowledge health composite (0-1)
  const scaledSlots = Math.round(minSlots + (kh.composite * (maxSlots - minSlots)));

  // Clamp to reasonable bounds (at most 3 curriculum encounters per session)
  return Math.max(0, Math.min(3, scaledSlots));
}

export function computeTrainingSlots(session: SessionContext): number {
  const total = session.targetSessionLength;
  if (total < 4) return 0;
  // Cadence: ~15% of the session, at least 1 for 8+, 2 for 14+, cap 2
  if (total >= 14) return 2;
  if (total >= 8) return 1;
  if (total >= 4 && session.inferredEnergy !== 'low') return 1;
  return 0;
}

// ---------------------------------------------------------------------------
// Weight bias computation
// ---------------------------------------------------------------------------

/**
 * Compute the priority weight bias multipliers for a given session theme.
 * Each theme produces a characteristic bias that shapes which encounters
 * the scheduler prefers during this session.
 *
 * Multiplier of 1.0 = no change; >1.0 = boost; <1.0 = reduce.
 * Order: thetaUrgency, shadowActivation, polarityAlignment,
 *        transformationReadiness, driveCorrection, narrativeCoherence, sessionFit
 */
export function computeWeightBias(theme: SessionTheme, _cci?: CCIScore | null): PriorityWeightBias {
  switch (theme) {
    case 'shadow-integration':
      return {
        thetaUrgency: 0.6,
        shadowActivation: 1.8,
        polarityAlignment: 0.7,
        transformationReadiness: 0.5,
        driveCorrection: 1.2,
        narrativeCoherence: 0.8,
        sessionFit: 1.0,
      };

    case 'growth-edge-push':
      return {
        thetaUrgency: 0.8,
        shadowActivation: 0.7,
        polarityAlignment: 1.2,
        transformationReadiness: 1.8,
        driveCorrection: 0.8,
        narrativeCoherence: 1.0,
        sessionFit: 0.9,
      };

    case 'consolidation':
      return {
        thetaUrgency: 1.5,
        shadowActivation: 0.8,
        polarityAlignment: 0.8,
        transformationReadiness: 0.5,
        driveCorrection: 1.3,
        narrativeCoherence: 1.2,
        sessionFit: 1.4,
      };

    case 'drive-rebalancing':
      return {
        thetaUrgency: 0.7,
        shadowActivation: 0.8,
        polarityAlignment: 0.7,
        transformationReadiness: 0.6,
        driveCorrection: 2.0,
        narrativeCoherence: 0.9,
        sessionFit: 1.0,
      };

    case 'transformation-prep':
      return {
        thetaUrgency: 0.5,
        shadowActivation: 1.5,
        polarityAlignment: 1.0,
        transformationReadiness: 2.0,
        driveCorrection: 0.7,
        narrativeCoherence: 1.0,
        sessionFit: 0.7,
      };

    case 'active-transformation':
      return {
        thetaUrgency: 0.2,
        shadowActivation: 0.5,
        polarityAlignment: 0.3,
        transformationReadiness: 3.0,
        driveCorrection: 0.3,
        narrativeCoherence: 0.5,
        sessionFit: 0.5,
      };

    case 'post-transformation':
      return {
        thetaUrgency: 0.5,
        shadowActivation: 0.5,
        polarityAlignment: 1.5,
        transformationReadiness: 0.2,
        driveCorrection: 1.3,
        narrativeCoherence: 1.8,
        sessionFit: 1.5,
      };

    case 'polarity-deepening':
      return {
        thetaUrgency: 0.8,
        shadowActivation: 0.9,
        polarityAlignment: 2.0,
        transformationReadiness: 0.8,
        driveCorrection: 0.7,
        narrativeCoherence: 1.0,
        sessionFit: 0.9,
      };

    case 'balanced-development':
      return {
        thetaUrgency: 1.0,
        shadowActivation: 1.0,
        polarityAlignment: 1.0,
        transformationReadiness: 1.0,
        driveCorrection: 1.0,
        narrativeCoherence: 1.0,
        sessionFit: 1.0,
      };
  }
}

// ---------------------------------------------------------------------------
// Weight bias application
// ---------------------------------------------------------------------------

// `applyWeightBias` is the canonical one from `PriorityComputation` (re-exported above) —
// `24 §3.2.9` allows exactly one normalisation path, so there is no local copy.

// Arc parameterisation
// ---------------------------------------------------------------------------

/**
 * Parameterise the session arc for a given theme.
 * Each theme produces a distinct intensity curve, warmup focus, shadow
 * allocation, and cooldown strategy tuned to its developmental purpose.
 */
export function parameteriseArc(
  theme: SessionTheme,
  _cci: CCIScore,
  _session: SessionContext,
): ParameterisedSessionArc {
  switch (theme) {
    case 'shadow-integration':
      return {
        warmup: {
          intensityCeiling: 0.3,
          focus: 'familiar-modality',
          preferredModalities: ['LanguageReflective', 'ImmersiveRPG'],
        },
        peak: {
          intensityRange: { min: 0.4, max: 0.7 },
          shadowAllocation: 0.5,
          transformationSlots: 0,
        },
        cooldown: {
          intensityCeiling: 0.2,
          integrationFocus: true,
          preferredModalities: ['LanguageReflective'],
        },
      };

    case 'growth-edge-push':
      return {
        warmup: {
          intensityCeiling: 0.4,
          focus: 'continuation',
          preferredModalities: ['Deterministic', 'Strategic'],
        },
        peak: {
          intensityRange: { min: 0.6, max: 1.0 },
          shadowAllocation: 0.1,
          transformationSlots: 2,
        },
        cooldown: {
          intensityCeiling: 0.3,
          integrationFocus: false,
          preferredModalities: ['ImmersiveRPG', 'LanguageReflective'],
        },
      };

    case 'consolidation':
      return {
        warmup: {
          intensityCeiling: 0.3,
          focus: 'theta-decay-arrest',
          preferredModalities: ['Deterministic'],
        },
        peak: {
          intensityRange: { min: 0.3, max: 0.6 },
          shadowAllocation: 0.2,
          transformationSlots: 0,
        },
        cooldown: {
          intensityCeiling: 0.2,
          integrationFocus: true,
          preferredModalities: ['LanguageReflective', 'ImmersiveRPG'],
        },
      };

    case 'drive-rebalancing':
      return {
        warmup: {
          intensityCeiling: 0.35,
          focus: 'drive-rebalancing',
          preferredModalities: ['ScenarioChoice', 'SocialCooperative'],
        },
        peak: {
          intensityRange: { min: 0.4, max: 0.7 },
          shadowAllocation: 0.15,
          transformationSlots: 0,
        },
        cooldown: {
          intensityCeiling: 0.25,
          integrationFocus: false,
          preferredModalities: ['LanguageReflective'],
        },
      };

    case 'transformation-prep':
      return {
        warmup: {
          intensityCeiling: 0.4,
          focus: 'continuation',
          preferredModalities: ['Deterministic', 'Strategic'],
        },
        peak: {
          intensityRange: { min: 0.7, max: 1.0 },
          shadowAllocation: 0.3,
          transformationSlots: 3,
        },
        cooldown: {
          intensityCeiling: 0.3,
          integrationFocus: true,
          preferredModalities: ['LanguageReflective', 'ImmersiveRPG'],
        },
      };

    case 'active-transformation':
      return {
        warmup: {
          intensityCeiling: 0.3,
          focus: 'general',
          preferredModalities: ['ImmersiveRPG'],
        },
        peak: {
          intensityRange: { min: 0.8, max: 1.0 },
          shadowAllocation: 0.1,
          transformationSlots: 3,
        },
        cooldown: {
          intensityCeiling: 0.2,
          integrationFocus: true,
          preferredModalities: ['LanguageReflective'],
        },
      };

    case 'post-transformation':
      return {
        warmup: {
          intensityCeiling: 0.25,
          focus: 'general',
          preferredModalities: ['ScenarioChoice', 'ImmersiveRPG'],
        },
        peak: {
          intensityRange: { min: 0.3, max: 0.5 },
          shadowAllocation: 0.1,
          transformationSlots: 0,
        },
        cooldown: {
          intensityCeiling: 0.2,
          integrationFocus: true,
          preferredModalities: ['LanguageReflective'],
        },
      };

    case 'polarity-deepening':
      return {
        warmup: {
          intensityCeiling: 0.3,
          focus: 'familiar-modality',
          preferredModalities: ['ScenarioChoice', 'LanguageReflective'],
        },
        peak: {
          intensityRange: { min: 0.5, max: 0.8 },
          shadowAllocation: 0.15,
          transformationSlots: 1,
        },
        cooldown: {
          intensityCeiling: 0.25,
          integrationFocus: false,
          preferredModalities: ['ImmersiveRPG'],
        },
      };

    case 'balanced-development':
      return {
        warmup: {
          intensityCeiling: 0.35,
          focus: 'general',
          preferredModalities: [],
        },
        peak: {
          intensityRange: { min: 0.5, max: 0.8 },
          shadowAllocation: 0.2,
          transformationSlots: 1,
        },
        cooldown: {
          intensityCeiling: 0.25,
          integrationFocus: false,
          preferredModalities: ['LanguageReflective'],
        },
      };
  }
}

// ---------------------------------------------------------------------------
// Encounter budget
// ---------------------------------------------------------------------------

/**
 * Compute the encounter budget for a session.
 * Distributes encounters across warmup (20%), peak (60%), cooldown (20%)
 * phases based on the target session length.
 */
export function computeEncounterBudget(
  session: SessionContext,
  arc: ParameterisedSessionArc,
): EncounterBudget {
  const totalTarget = session.targetSessionLength;

  // Distribute encounters: warmup 20%, peak 60%, cooldown 20%
  const warmupCount = Math.max(1, Math.round(totalTarget * 0.2));
  const cooldownCount = Math.max(1, Math.round(totalTarget * 0.2));
  const peakCount = Math.max(1, totalTarget - warmupCount - cooldownCount);

  // Shadow cap: peak shadow allocation * peak encounter count
  const shadowEncounterCap = Math.max(0, Math.round(arc.peak.shadowAllocation * peakCount));

  // Practice slots: 1 for sessions with > 10 encounters, 0 otherwise
  const practiceSlots = totalTarget > 10 ? 1 : 0;

  return {
    totalTarget,
    warmupCount,
    peakCount,
    cooldownCount,
    shadowEncounterCap,
    practiceSlots,
  };
}



// ---------------------------------------------------------------------------
// Mid-session adjustment
// ---------------------------------------------------------------------------

/**
 * Evaluate whether a mid-session strategy adjustment is needed.
 * Checks 4 signals: energy drop, avoidance spike, engagement surge,
 * and shadow fatigue. Returns null if no adjustment is warranted.
 */
export function evaluateMidSessionAdjustment(
  currentStrategy: SessionStrategy,
  session: SessionContext,
  recentOutcomes: RecentEncounter[],
): SessionStrategyAdjustment | null {
  // Signal 1: Energy drop - reduce intensity when player energy is low
  if (session.inferredEnergy === 'low' &&
      currentStrategy.arc.peak.intensityRange.max > 0.5) {
    return {
      type: 'intensity-reduction',
      newPeakIntensity: { min: 0.3, max: 0.5 },
      rationale: 'Energy drop detected; reducing peak intensity',
    };
  }

  // Signal 2: Avoidance spike - shift to consolidation when too many encounters avoided
  const recentSlice = recentOutcomes.slice(0, 3);
  const avoidanceCount = recentSlice.filter(e => e.outcome === 'avoided').length;
  const avoidanceRate = recentSlice.length > 0 ? avoidanceCount / recentSlice.length : 0;
  if (avoidanceRate > currentStrategy.adjustmentThresholds.avoidanceSpikeThreshold) {
    return {
      type: 'theme-shift',
      newTheme: 'consolidation',
      newWeightBias: computeWeightBias('consolidation', null),
      rationale: 'High avoidance rate; shifting to consolidation',
    };
  }

  // Signal 3: Engagement surge - allow intensity increase when quality is high
  const recentQuality = recentOutcomes.length > 0
    ? recentOutcomes.slice(0, 3).reduce((sum, e) => sum + e.quality, 0) /
      Math.min(recentOutcomes.length, 3)
    : 0;
  if (recentQuality > currentStrategy.adjustmentThresholds.engagementSurgeThreshold &&
      session.inferredEnergy === 'high') {
    return {
      type: 'intensity-increase',
      newPeakIntensity: { min: 0.7, max: 1.0 },
      rationale: 'High engagement + energy; allowing intensity increase',
    };
  }

  // Signal 4: Shadow fatigue - pause shadow work when consecutive shadow
  // encounters fail to produce integration
  const consecutiveShadowFailures = countConsecutiveShadowFailures(recentOutcomes);
  if (consecutiveShadowFailures >= currentStrategy.adjustmentThresholds.shadowFatigueTrials) {
    return {
      type: 'shadow-pause',
      shadowBiasOverride: 0.3,
      rationale: 'Shadow fatigue; reducing shadow encounter frequency',
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Safety override
// ---------------------------------------------------------------------------

/**
 * Check whether a safety override should engage.
 * Returns true if the Significator shows multiple distress signals:
 * high fixation risk AND heavy unresolved shadows AND low intensity budget.
 * When true, the caller should force 'consolidation' theme.
 */
export function checkSafetyOverride(snapshot: SignificatorSnapshot): boolean {
  const maxFixationRisk = Math.max(
    ...Object.values(snapshot.fixationRisk),
  );
  const unresolvedShadows = snapshot.shadows.entries.filter(
    e => e.resolvedAt === null,
  ).length;

  // Import from the CCI logic: if fixation > 0.8 AND shadows > 10 => distressed
  // The intensity budget check is implicit: these conditions produce < 0.3 budget
  return maxFixationRisk > 0.8 && unresolvedShadows > 10;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Count consecutive shadow-mode encounters without integration from
 * the most recent outcomes backwards.
 */
function countConsecutiveShadowFailures(outcomes: RecentEncounter[]): number {
  let count = 0;
  for (const outcome of outcomes) {
    if (outcome.mode === 'shadow' && !outcome.shadowIntegrated) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Compute modality bias for a given theme.
 * Returns partial record of modality multipliers. Empty means no bias.
 */
/**
 * Phase 4C: Compute modality bias from LearningAnalytics modality effectiveness.
 * When the player's learning profile has effectiveness data, boost modalities
 * that historically produce better learning outcomes (higher depth gain per event).
 * Returns empty when no analytics data is available (backward compat).
 */
function computeAnalyticsModalityBias(
  cci: CCIScore,
  learningProfile?: { readonly modalityEffectiveness?: Readonly<Record<string, number>> },
): Partial<Record<string, number>> {
  // Use per-modality effectiveness data when available — this is the
  // genuinely analytics-driven path.
  if (learningProfile?.modalityEffectiveness) {
    const entries = Object.entries(learningProfile.modalityEffectiveness);
    if (entries.length === 0) return {};

    const avg = entries.reduce((sum, [_, v]) => sum + v, 0) / entries.length;
    const bias: Partial<Record<string, number>> = {};
    for (const [modality, effectiveness] of entries) {
      // Scale: effective modalities get boosted, ineffective ones get reduced.
      // 1.0 = neutral; range [0.7, 1.4] to avoid extreme swings.
      const ratio = effectiveness / Math.max(0.01, avg);
      bias[modality] = Math.max(0.7, Math.min(1.4, ratio));
    }
    return bias;
  }

  // Fallback: infer from knowledge health composite.
  const kh = cci.knowledgeHealth;
  if (!kh) return {};

  if (kh.composite > 0.5) {
    return {};
  }

  // Low knowledge health: bias toward LanguageReflective (most accessible)
  // and away from Deterministic/Strategic (more cognitively demanding)
  return {
    'LanguageReflective': 1.2,
    'ImmersiveRPG': 1.1,
    'Deterministic': 0.8,
    'Strategic': 0.8,
  };
}

function computeModalityBias(theme: SessionTheme): Partial<Record<string, number>> {
  switch (theme) {
    case 'shadow-integration':
      return {
        'LanguageReflective': 1.4,
        'ImmersiveRPG': 1.2,
        'ScenarioChoice': 1.1,
        'Deterministic': 0.7,
      };
    case 'growth-edge-push':
      return {
        'Deterministic': 1.3,
        'Strategic': 1.3,
        'ScenarioChoice': 1.1,
      };
    case 'consolidation':
      return {
        'Deterministic': 1.2,
        'LanguageReflective': 1.1,
        'ImmersiveRPG': 1.1,
      };
    case 'drive-rebalancing':
      return {
        'ScenarioChoice': 1.3,
        'SocialCooperative': 1.3,
        'ImmersiveRPG': 1.1,
      };
    case 'transformation-prep':
      return {
        'Strategic': 1.2,
        'ScenarioChoice': 1.2,
        'LanguageReflective': 1.1,
      };
    case 'active-transformation':
      return {
        'ImmersiveRPG': 1.5,
        'ScenarioChoice': 1.3,
      };
    case 'post-transformation':
      return {
        'ImmersiveRPG': 1.3,
        'LanguageReflective': 1.2,
        'ScenarioChoice': 1.1,
      };
    case 'polarity-deepening':
      return {
        'ScenarioChoice': 1.4,
        'LanguageReflective': 1.2,
        'SocialCooperative': 1.1,
      };
    case 'balanced-development':
      return {};
  }
}

/**
 * Post-transformation weight ramp-up.
 * For 5 sessions after transformation, use post-transformation weights.
 * For sessions 6-10, linearly interpolate back to defaults.
 * Spec: foundations/17 §5.2, foundations/24 §6.3
 */
export function computePostTransformationBias(
  sessionsSinceTransformation: number,
): PriorityWeightBias | null {
  if (sessionsSinceTransformation >= 10) return null;

  const postWeights: PriorityWeightBias = {
    thetaUrgency: -0.10,
    shadowActivation: -0.05,
    polarityAlignment: 0.05,
    transformationReadiness: -0.10,
    driveCorrection: 0.05,
    narrativeCoherence: 0.10,
    sessionFit: 0.05,
  };

  if (sessionsSinceTransformation < 5) return postWeights;

  const t = (sessionsSinceTransformation - 5) / 5;
  // These are MULTIPLICATIVE deltas: the caller adds them to the theme multipliers, so a
  // returned `-0.10` means "10% of this criterion's weight" (`24 §3.2.9` — bias multiplies).
  const result: PriorityWeightBias = {
    thetaUrgency: (postWeights.thetaUrgency ?? 0) * (1 - t),
    shadowActivation: (postWeights.shadowActivation ?? 0) * (1 - t),
    polarityAlignment: (postWeights.polarityAlignment ?? 0) * (1 - t),
    transformationReadiness: (postWeights.transformationReadiness ?? 0) * (1 - t),
    driveCorrection: (postWeights.driveCorrection ?? 0) * (1 - t),
    narrativeCoherence: (postWeights.narrativeCoherence ?? 0) * (1 - t),
    sessionFit: (postWeights.sessionFit ?? 0) * (1 - t),
  };
  return result;
}

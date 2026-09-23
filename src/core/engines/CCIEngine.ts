/**
 * CCIEngine -- Cumulative Consciousness Index computation.
 * Spec: foundations/25
 *
 * Pure function: SignificatorSnapshot in, CCIScore out.
 * Computes a multi-dimensional composite signal capturing the Significator's
 * overall developmental state at session-start. Feeds the auto-mode strategy
 * engine (foundations/27) which shapes session-level decisions.
 *
 * The CCI is NEVER player-facing (Veil principle). It carries no normative
 * valence -- higher is not "better"; it is different.
 */
import type { SignificatorSnapshot } from '../domain/SignificatorSnapshot.js';
import type { Significator } from '../domain/Significator.js';
import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';
import type { Drive } from '../domain/Drive.js';
import { ALL_LINES } from '../domain/Line.js';
import { ALL_DRIVES } from '../domain/Drive.js';
import { ALL_STAGES, stageOrdinal } from '../domain/Stage.js';
// P1-15: Import GreaterCycleEngine.computeMetabolicHealth so CCI can delegate
// G_z/P_z computation to the canonical source instead of duplicating the formula.
import { computeMetabolicHealth } from './GreaterCycleEngine.js';
// Curriculum expansion: import knowledge health computation from CurriculumBridge.
import { computeKnowledgeHealth } from '../curriculum/CurriculumBridge.js';
import { getCurriculumRegistry } from '../curriculum/CurriculumRegistry.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CCIWeights {
  altitude: number;
  driveHealth: number;
  polarity: number;
  shadowTopology: number;
  transformationReadiness: number;
  knowledgeHealth: number;
}

export const DEFAULT_CCI_WEIGHTS: CCIWeights = {
  altitude: 0.12,
  driveHealth: 0.20,
  polarity: 0.12,
  shadowTopology: 0.20,
  transformationReadiness: 0.16,
  knowledgeHealth: 0.20,
};

export type SessionTheme =
  | 'consolidation'
  | 'growth-edge-push'
  | 'shadow-integration'
  | 'drive-rebalancing'
  | 'transformation-prep'
  | 'active-transformation'
  | 'post-transformation'
  | 'polarity-deepening'
  | 'balanced-development';

export type ShadowPressureLevel = 'low' | 'moderate' | 'high' | 'critical';
export type TransformationProximity = 'distant' | 'approaching' | 'imminent' | 'active';

export interface PolaritySessionGuidance {
  mode: 'exploration' | 'crystallizing' | 'crystallized';
  recommendedDiversity: number;
  temptationFrequency: number;
}

export interface CCISessionSignals {
  recommendedTheme: SessionTheme;
  intensityBudget: number;
  shadowPressure: ShadowPressureLevel;
  transformationProximity: TransformationProximity;
  driveRebalancingTarget: Drive | null;
  polarityGuidance: PolaritySessionGuidance;
}

export interface CCIScore {
  composite: number;
  dimensions: {
    altitude: number;
    driveHealth: number;
    polarity: number;
    shadowTopology: number;
    transformationReadiness: number;
  };
  weights: CCIWeights;
  dominantDimension: keyof CCIWeights;
  sessionSignals: CCISessionSignals;
  /**
   * T-1.8: HoloOS G_z / P_z dual health metrics (per foundations/25 §1.1).
   * G_z = Lesser-Cycle health (Agape/integration); P_z = Greater-Cycle health
   * (Eros/polarization). Total Metabolic Health = G_z · P_z.
   * `interpretation` classifies the player's metabolic state.
   */
  metabolicHealth?: {
    gz: number;
    pz: number;
    total: number;
    interpretation: 'consolidating' | 'polarizing-healthy' | 'polarizing-unhealthy' | 'stuck' | 'transitional';
    liminalitySignature?: {
      readonly pzSpike: boolean;
      readonly subDensitySaturation: boolean;
      readonly isTransitional: boolean;
    };
  };
  /**
   * Curriculum expansion: knowledge health dimension.
   * Tracks concept coverage, depth, retention, and integration density.
   * Defaults to zero when no curriculum data is available (backward compat).
   */
  knowledgeHealth?: {
    conceptCoverage: number;
    averageDepth: number;
    retentionHealth: number;
    integrationDensity: number;
    misconceptionLoad: number;
    composite: number;
  };
}

// ---------------------------------------------------------------------------
// Internal dimension input interfaces
// ---------------------------------------------------------------------------

export interface AltitudeInput {
  perLineAltitudes: Record<Line, Stage>;
  centreOfGravity: Stage;
  spread: number;
  lowestAltitude: Stage;
  highestAltitude: Stage;
  linesAtEdge: number;
}

export interface DriveHealthInput {
  balance: Record<Drive, number>;
  fixationRisk: Record<Drive, number>;
  maxImbalance: number;
  maxFixationRisk: number;
  complementaryTension: {
    agencyVsCommunion: number;
    erosVsAgape: number;
  };
}

export interface PolarityInput {
  masterMode: 'exploration' | 'crystallizing' | 'crystallized';
  crystallizationIndex: number;
  exploratoryBreadth: number;
  coherentLineCount: number;
  recentPolarityStability: number;
}

export interface ShadowTopologyInput {
  unresolvedCount: number;
  averageSeverity: number;
  maxSeverity: number;
  compoundPatternCount: number;
  recentSurfacingRate: number;
  integrationRate: number;
  oldestUnresolvedAge: number;
}

export interface TransformationReadinessInput {
  linesAtEdge: number;
  shadowClearance: boolean;
  catalystSaturation: number;
  pendingTransformation: boolean;
  targetStage: Stage | null;
  sessionsSinceLastTransformation: number;
}

interface CCIDimensionInputs {
  altitude: AltitudeInput;
  driveHealth: DriveHealthInput;
  polarity: PolarityInput;
  shadowTopology: ShadowTopologyInput;
  transformationReadiness: TransformationReadinessInput;
}

// ---------------------------------------------------------------------------
// Dimension extraction from SignificatorSnapshot
// ---------------------------------------------------------------------------

function extractDimensionInputs(sig: SignificatorSnapshot): CCIDimensionInputs {
  return {
    altitude: extractAltitudeInput(sig),
    driveHealth: extractDriveHealthInput(sig),
    polarity: extractPolarityInput(sig),
    shadowTopology: extractShadowTopologyInput(sig),
    transformationReadiness: extractTransformationReadinessInput(sig),
  };
}

function extractAltitudeInput(sig: SignificatorSnapshot): AltitudeInput {
  const ordinals = ALL_LINES.map(l => stageOrdinal(sig.altitudes[l]));
  const mean = ordinals.reduce((a, b) => a + b, 0) / ordinals.length;
  const variance = ordinals.reduce((sum, o) => sum + (o - mean) ** 2, 0) / ordinals.length;
  // Normalise spread to 0-1 range (max possible stddev is ~3.5 for 8 stages)
  const spread = Math.sqrt(variance) / 3.5;

  const lowestOrdinal = Math.min(...ordinals);
  const highestOrdinal = Math.max(...ordinals);

  const lowestAltitude = ALL_STAGES[lowestOrdinal] as Stage;
  const highestAltitude = ALL_STAGES[highestOrdinal] as Stage;

  // Lines at edge: lines at or above current stage (growth edge contributors)
  const currentOrdinal = stageOrdinal(sig.currentStage);
  const linesAtEdge = ordinals.filter(o => o >= currentOrdinal).length;

  return {
    perLineAltitudes: sig.altitudes as Record<Line, Stage>,
    centreOfGravity: sig.currentStage,
    spread: Math.min(1.0, spread),
    lowestAltitude,
    highestAltitude,
    linesAtEdge,
  };
}

function extractDriveHealthInput(sig: SignificatorSnapshot): DriveHealthInput {
  const balance = sig.driveBalance;
  const fixationRisk = sig.fixationRisk;

  const maxImbalance = Math.max(...ALL_DRIVES.map(d => Math.abs(balance[d])));
  const maxFixationRisk = Math.max(...ALL_DRIVES.map(d => fixationRisk[d]));

  // Complementary tension: |Agency - Communion| and |Eros - Agape|
  const agencyVsCommunion = Math.abs(balance['Agency'] - balance['Communion']);
  const erosVsAgape = Math.abs(balance['Eros'] - balance['Agape']);

  // Normalise tension to 0-1 (max possible is 2.0 for balance range -1..1)
  const complementaryTension = {
    agencyVsCommunion: Math.min(1.0, agencyVsCommunion / 2.0),
    erosVsAgape: Math.min(1.0, erosVsAgape / 2.0),
  };

  return {
    balance,
    fixationRisk,
    maxImbalance: Math.min(1.0, maxImbalance),
    maxFixationRisk: Math.min(1.0, maxFixationRisk),
    complementaryTension,
  };
}

function extractPolarityInput(sig: SignificatorSnapshot): PolarityInput {
  const master = sig.polarity.master;

  // Map PolarityMode to the spec's lowercase mode naming
  let masterMode: 'exploration' | 'crystallizing' | 'crystallized';
  switch (master.mode) {
    case 'Exploring':
      masterMode = 'exploration';
      break;
    case 'Crystallizing':
      masterMode = 'crystallizing';
      break;
    case 'Crystallized':
      masterMode = 'crystallized';
      break;
    default:
      masterMode = 'exploration';
  }

  // Exploratory breadth: diversity of polarity cell patterns sampled
  // Computed from the number of distinct non-null patterns across cells
  const cells = Object.values(sig.polarity.cells);
  const distinctPatterns = new Set(cells.map(c => c.dominantPattern).filter(Boolean));
  const exploratoryBreadth = cells.length > 0
    ? Math.min(1.0, distinctPatterns.size / 4) // 4 energetic directions = max diversity
    : 0;

  // Recent polarity stability: coherence of recent traces
  // Approximated from average coherence of cells
  const avgCoherence = cells.length > 0
    ? cells.reduce((sum, c) => sum + c.coherence, 0) / cells.length
    : 0;

  return {
    masterMode,
    crystallizationIndex: master.crystallizationProgress,
    exploratoryBreadth,
    coherentLineCount: master.coherentLineCount,
    recentPolarityStability: avgCoherence,
  };
}

function extractShadowTopologyInput(sig: SignificatorSnapshot): ShadowTopologyInput {
  const entries = sig.shadows.entries;
  const unresolved = entries.filter(e => e.resolvedAt === null);
  const resolved = entries.filter(e => e.resolvedAt !== null);

  const unresolvedCount = unresolved.length;
  const averageSeverity = unresolvedCount > 0
    ? unresolved.reduce((sum, e) => sum + e.severity, 0) / unresolvedCount
    : 0;
  const maxSeverity = unresolvedCount > 0
    ? Math.max(...unresolved.map(e => e.severity))
    : 0;

  const compoundPatternCount = sig.compoundShadows.length;

  // Recent surfacing rate: approximated from total entries / total sessions
  const recentSurfacingRate = sig.totalSessions > 0
    ? entries.length / sig.totalSessions
    : 0;

  // Integration rate: resolved per session
  const integrationRate = sig.totalSessions > 0
    ? resolved.length / sig.totalSessions
    : 0;

  // Oldest unresolved age: sessions since creation proxy
  // Use totalSessions minus an estimate based on entry index
  const oldestUnresolvedAge = unresolvedCount > 0
    ? sig.totalSessions // Conservative: oldest could have been there since start
    : 0;

  return {
    unresolvedCount,
    averageSeverity,
    maxSeverity,
    compoundPatternCount,
    recentSurfacingRate: Math.max(recentSurfacingRate, 0.001), // avoid division by zero
    integrationRate,
    oldestUnresolvedAge,
  };
}

function extractTransformationReadinessInput(sig: SignificatorSnapshot): TransformationReadinessInput {
  const tr = sig.transformationReadiness;
  return {
    linesAtEdge: tr.linesAtEdge,
    shadowClearance: tr.shadowClearance,
    catalystSaturation: tr.catalystSaturation,
    pendingTransformation: tr.pendingTransformation,
    targetStage: tr.targetStage,
    sessionsSinceLastTransformation: tr.sessionsSinceLastTransformation,
  };
}

// ---------------------------------------------------------------------------
// Normalisation functions (each returns 0.0 to 1.0)
// ---------------------------------------------------------------------------

/**
 * Normalise altitude dimension.
 * Centre of gravity is primary signal, with holonic penalty (floor too far
 * below CoG) and spread penalty (uneven development).
 */
export function normaliseAltitude(input: AltitudeInput): number {
  const cogValue = stageOrdinal(input.centreOfGravity) / 7;
  const floorValue = stageOrdinal(input.lowestAltitude) / 7;

  // Holonic health: floor pulls the effective altitude down when gap > 2 stages
  const holonicPenalty = Math.max(0, cogValue - floorValue - (2 / 7)) * 0.3;

  // Spread penalty: highly uneven development reduces effective altitude
  const spreadPenalty = input.spread * 0.15;

  return clamp(cogValue - holonicPenalty - spreadPenalty);
}

/**
 * Normalise drive health dimension.
 * INVERTED: high score = healthy (low imbalance, low fixation).
 * Combines balance health, fixation health, and complementary tension health.
 */
export function normaliseDriveHealth(input: DriveHealthInput): number {
  const balanceHealth = 1.0 - input.maxImbalance;
  const fixationHealth = 1.0 - input.maxFixationRisk;
  const tensionHealth = 1.0 - (
    input.complementaryTension.agencyVsCommunion * 0.5 +
    input.complementaryTension.erosVsAgape * 0.5
  );

  return clamp(
    balanceHealth * 0.35 +
    fixationHealth * 0.40 +
    tensionHealth * 0.25
  );
}

/**
 * Normalise polarity dimension.
 * Reflects CLARITY of polarity direction, not which direction.
 * Exploration rewards breadth, crystallizing rewards emerging coherence,
 * crystallized rewards stability.
 */
export function normalisePolarity(input: PolarityInput): number {
  switch (input.masterMode) {
    case 'exploration':
      // In exploration, score reflects breadth of sampling
      return clamp(input.exploratoryBreadth * 0.4);
    case 'crystallizing':
      // In crystallizing, score reflects emerging coherence
      return clamp(0.4 + (input.crystallizationIndex * 0.3));
    case 'crystallized':
      // In crystallized, score reflects depth and stability
      return clamp(0.7 + (input.recentPolarityStability * 0.3));
  }
}

/**
 * Normalise shadow topology dimension.
 * INVERTED: high score = clean (few shadows, well-integrated).
 * Penalises unresolved count, max severity, compound patterns, stale age,
 * and poor integration rate relative to surfacing.
 */
export function normaliseShadowTopology(input: ShadowTopologyInput): number {
  const countPenalty = Math.min(input.unresolvedCount / 12, 1.0);
  const severityPenalty = input.maxSeverity;
  const compoundPenalty = Math.min(input.compoundPatternCount / 4, 1.0);
  const stalePenalty = Math.min(input.oldestUnresolvedAge / 20, 1.0);

  // Integration credit: ratio of integration to surfacing, capped at 1.0
  const integrationCredit = input.recentSurfacingRate > 0
    ? Math.min(input.integrationRate / input.recentSurfacingRate, 1.0)
    : 0;

  const rawPenalty = (
    countPenalty * 0.25 +
    severityPenalty * 0.30 +
    compoundPenalty * 0.20 +
    stalePenalty * 0.15 +
    (1.0 - integrationCredit) * 0.10
  );

  return clamp(1.0 - rawPenalty);
}

/**
 * Normalise transformation readiness dimension.
 * Active transformation saturates at 1.0. No target returns 0.0.
 * Otherwise: edgeProgress * clearanceFactor * saturation * recoveryDamping.
 */
export function normaliseTransformationReadiness(input: TransformationReadinessInput): number {
  if (input.pendingTransformation) return 1.0;
  if (!input.targetStage) return 0.0;

  const edgeProgress = Math.min(input.linesAtEdge / 6, 1.0);
  const clearanceFactor = input.shadowClearance ? 1.0 : 0.6;
  const saturationFactor = input.catalystSaturation;

  // Post-transformation recovery: reduce readiness signal for 5 sessions
  const recoveryDamping = input.sessionsSinceLastTransformation < 5
    ? input.sessionsSinceLastTransformation / 5
    : 1.0;

  return clamp(edgeProgress * clearanceFactor * saturationFactor * recoveryDamping);
}

// ---------------------------------------------------------------------------
// Weight adjustment
// ---------------------------------------------------------------------------

/**
 * Context-sensitive weight adjustment. Weights shift based on the
 * Significator's current developmental state to ensure proportional
 * response to the most urgent developmental need.
 */
export function adjustWeights(
  defaults: CCIWeights,
  inputs: CCIDimensionInputs,
): CCIWeights {
  // Active transformation override: hardcoded weights for transformation mode
  if (inputs.transformationReadiness.pendingTransformation) {
    return {
      altitude: 0.05,
      driveHealth: 0.10,
      polarity: 0.05,
      shadowTopology: 0.10,
      transformationReadiness: 0.65,
      knowledgeHealth: 0.05,
    };
  }

  const adjusted = { ...defaults };

  // Near-transformation: boost TR, reduce altitude and polarity
  if (inputs.transformationReadiness.linesAtEdge >= 4) {
    adjusted.transformationReadiness += 0.10;
    adjusted.altitude -= 0.05;
    adjusted.polarity -= 0.05;
  }

  // Heavy shadow load: boost shadow, reduce transformation readiness
  if (inputs.shadowTopology.unresolvedCount > 8 || inputs.shadowTopology.maxSeverity > 0.7) {
    adjusted.shadowTopology += 0.10;
    adjusted.transformationReadiness -= 0.10;
  }

  // Severe drive imbalance: boost drive health, reduce polarity and altitude
  if (inputs.driveHealth.maxFixationRisk > 0.7) {
    adjusted.driveHealth += 0.10;
    adjusted.polarity -= 0.05;
    adjusted.altitude -= 0.05;
  }

  // Floor clamp: no dimension weight should go below 0.01
  adjusted.altitude = Math.max(0.01, adjusted.altitude);
  adjusted.driveHealth = Math.max(0.01, adjusted.driveHealth);
  adjusted.polarity = Math.max(0.01, adjusted.polarity);
  adjusted.shadowTopology = Math.max(0.01, adjusted.shadowTopology);
  adjusted.transformationReadiness = Math.max(0.01, adjusted.transformationReadiness);
  adjusted.knowledgeHealth = Math.max(0.01, adjusted.knowledgeHealth);

  // Normalise to sum to 1.0
  const total = adjusted.altitude + adjusted.driveHealth + adjusted.polarity
    + adjusted.shadowTopology + adjusted.transformationReadiness + adjusted.knowledgeHealth;

  if (total <= 0) {
    // Safety: if adjustments produced all-zero/negative, return defaults
    return { ...DEFAULT_CCI_WEIGHTS };
  }

  return {
    altitude: adjusted.altitude / total,
    driveHealth: adjusted.driveHealth / total,
    polarity: adjusted.polarity / total,
    shadowTopology: adjusted.shadowTopology / total,
    transformationReadiness: adjusted.transformationReadiness / total,
    knowledgeHealth: adjusted.knowledgeHealth / total,
  };
}

// ---------------------------------------------------------------------------
// Session signal derivation
// ---------------------------------------------------------------------------

/**
 * Select the recommended session theme based on dimensional analysis.
 * Priority-ordered: active transformation > post-transformation > critical shadow >
 * severe fixation > imminent transformation > polarity momentum > growth-edge >
 * consolidation > balanced-development.
 */
export function selectSessionTheme(
  dimensions: Record<string, number>,
  inputs: CCIDimensionInputs,
): SessionTheme {
  // Active transformation overrides all
  if (inputs.transformationReadiness.pendingTransformation) return 'active-transformation';

  // Post-transformation recovery (first 5 sessions after transition)
  if (inputs.transformationReadiness.sessionsSinceLastTransformation < 5) return 'post-transformation';

  // Critical shadow pressure demands attention
  if (inputs.shadowTopology.maxSeverity > 0.8 || inputs.shadowTopology.compoundPatternCount >= 3) {
    return 'shadow-integration';
  }

  // Severe drive fixation demands rebalancing
  if (inputs.driveHealth.maxFixationRisk > 0.7) return 'drive-rebalancing';

  // Imminent transformation: prep mode
  if (inputs.transformationReadiness.linesAtEdge >= 5 && inputs.transformationReadiness.catalystSaturation > 0.7) {
    return 'transformation-prep';
  }

  // High polarity momentum: deepen
  if (inputs.polarity.crystallizationIndex > 0.7 && inputs.polarity.masterMode === 'crystallizing') {
    return 'polarity-deepening';
  }

  // High altitude with low spread: push the growth edge
  if (dimensions['altitude'] > 0.5 && inputs.altitude.spread < 0.15) {
    return 'growth-edge-push';
  }

  // High altitude with high spread: consolidate
  if (dimensions['altitude'] > 0.5 && inputs.altitude.spread > 0.25) {
    return 'consolidation';
  }

  return 'balanced-development';
}

/**
 * Compute intensity budget: how much intensity the session can sustain.
 * Capped by the weakest link (drive health or shadow state) with a base
 * boost from altitude.
 */
export function computeIntensityBudget(dimensions: Record<string, number>): number {
  const healthFloor = Math.min(
    dimensions['driveHealth'] ?? 1,
    dimensions['shadowTopology'] ?? 1,
  );
  const altitudeFactor = 0.4 + ((dimensions['altitude'] ?? 0) * 0.3);
  return clamp(healthFloor * 0.6 + altitudeFactor * 0.4);
}

/**
 * Classify shadow pressure level from topology input thresholds.
 */
export function classifyShadowPressure(input: ShadowTopologyInput): ShadowPressureLevel {
  if (input.maxSeverity > 0.8 || input.compoundPatternCount >= 3) return 'critical';
  if (input.unresolvedCount > 6 || input.maxSeverity > 0.5) return 'high';
  if (input.unresolvedCount > 3 || input.averageSeverity > 0.3) return 'moderate';
  return 'low';
}

/**
 * Classify transformation proximity from readiness input.
 */
export function classifyTransformationProximity(input: TransformationReadinessInput): TransformationProximity {
  if (input.pendingTransformation) return 'active';
  if (input.linesAtEdge >= 5 && input.catalystSaturation > 0.7) return 'imminent';
  if (input.linesAtEdge >= 3) return 'approaching';
  return 'distant';
}

/**
 * Identify which drive most needs rebalancing exercise.
 * Returns the COMPLEMENT of the most imbalanced/fixated drive.
 */
export function identifyRebalancingTarget(input: DriveHealthInput): Drive | null {
  const candidates = ALL_DRIVES
    .filter(d => Math.abs(input.balance[d]) > 0.4 || input.fixationRisk[d] > 0.5)
    .sort((a, b) => input.fixationRisk[b] - input.fixationRisk[a]);

  if (candidates.length === 0) return null;

  // Return the COMPLEMENT of the over-expressed/fixated drive
  const overExpressed = candidates[0];
  const complementMap: Record<Drive, Drive> = {
    'Agency': 'Communion',
    'Communion': 'Agency',
    'Eros': 'Agape',
    'Agape': 'Eros',
  };
  return complementMap[overExpressed];
}

/**
 * Derive polarity session guidance based on master polarity mode.
 * Controls diversity of polarity textures and temptation (counter-polarity)
 * challenge frequency within the session.
 */
export function derivePolarityGuidance(input: PolarityInput): PolaritySessionGuidance {
  switch (input.masterMode) {
    case 'exploration':
      return {
        mode: 'exploration',
        recommendedDiversity: 0.9,
        temptationFrequency: 0.0,
      };
    case 'crystallizing':
      return {
        mode: 'crystallizing',
        recommendedDiversity: 0.4,
        temptationFrequency: 0.15 + (0.35 * input.crystallizationIndex),
      };
    case 'crystallized':
      return {
        mode: 'crystallized',
        recommendedDiversity: 0.2,
        temptationFrequency: 0.1,
      };
  }
}

/**
 * Derive all session signals from normalised dimensions and raw inputs.
 */
function deriveSessionSignals(
  dimensions: Record<string, number>,
  inputs: CCIDimensionInputs,
): CCISessionSignals {
  const recommendedTheme = selectSessionTheme(dimensions, inputs);
  const intensityBudget = computeIntensityBudget(dimensions);
  const shadowPressure = classifyShadowPressure(inputs.shadowTopology);
  const transformationProximity = classifyTransformationProximity(inputs.transformationReadiness);
  const driveRebalancingTarget = identifyRebalancingTarget(inputs.driveHealth);
  const polarityGuidance = derivePolarityGuidance(inputs.polarity);

  return {
    recommendedTheme,
    intensityBudget,
    shadowPressure,
    transformationProximity,
    driveRebalancingTarget,
    polarityGuidance,
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Compute the Cumulative Consciousness Index from a SignificatorSnapshot.
 *
 * Pure function: same input always produces same output. No side effects.
 * All dimensions are normalised to [0.0, 1.0]. Weights always sum to 1.0.
 *
 * P1-15: When the optional `sig` parameter is provided, G_z/P_z metabolic
 * health is delegated to GreaterCycleEngine.computeMetabolicHealth(sig)
 * instead of being computed inline. This eliminates the formula duplication
 * flagged in Wave 1.4 — CCI and GCE now use the SAME G_z/P_z computation.
 * When `sig` is omitted, the inline computation is used (backward compat for
 * callers that only have a snapshot).
 */
export function computeCCI(snapshot: SignificatorSnapshot, sig?: Significator): CCIScore {
  // 1. Extract inputs from Significator snapshot
  const inputs = extractDimensionInputs(snapshot);

  // 2. Normalise each dimension to [0, 1]
  const dimensions = {
    altitude: normaliseAltitude(inputs.altitude),
    driveHealth: normaliseDriveHealth(inputs.driveHealth),
    polarity: normalisePolarity(inputs.polarity),
    shadowTopology: normaliseShadowTopology(inputs.shadowTopology),
    transformationReadiness: normaliseTransformationReadiness(inputs.transformationReadiness),
  };

  // 3. Adjust weights based on state
  const weights = adjustWeights(DEFAULT_CCI_WEIGHTS, inputs);

  // 4. Compute weighted composite.
  // Knowledge health: computed from player's KnowledgeState when curriculum data
  // exists; defaults to 0 when no concepts have been encountered (backward compat).
  // Sub-dimension weights: coverage/depth/retention share equal weight (0.25 each);
  // integration (0.15) reflects transfer capacity; misconception penalty (0.10)
  // reduces health proportionally to flagged misconceptions.
  const KH_COVERAGE_W = 0.25;
  const KH_DEPTH_W = 0.25;
  const KH_RETENTION_W = 0.25;
  const KH_INTEGRATION_W = 0.15;
  const KH_MISCONCEPTION_W = 0.10;

  let knowledgeHealthValue = 0;
  let knowledgeHealthMetrics: CCIScore['knowledgeHealth'];
  const registryCount = getCurriculumRegistry().count();
  if (sig?.knowledge && sig.knowledge.conceptStates.size > 0 && registryCount > 0) {
    // Use the curriculum registry's total count for conceptCoverage calculation.
    // Previously this used conceptStates.size which made coverage always 1.0.
    // P2-ISO: Pass registry so computeKnowledgeHealth can weight cross-domain isomorphisms.
    const kh = computeKnowledgeHealth(sig.knowledge, registryCount, getCurriculumRegistry());
    const composite = (kh.conceptCoverage * KH_COVERAGE_W + kh.averageDepth * KH_DEPTH_W +
      kh.retentionHealth * KH_RETENTION_W + kh.integrationDensity * KH_INTEGRATION_W +
      (1 - kh.misconceptionLoad) * KH_MISCONCEPTION_W);
    knowledgeHealthValue = clamp(composite);
    knowledgeHealthMetrics = { ...kh, composite: knowledgeHealthValue };
  } else {
    knowledgeHealthMetrics = {
      conceptCoverage: 0,
      averageDepth: 0,
      retentionHealth: 0,
      integrationDensity: 0,
      misconceptionLoad: 0,
      composite: 0,
    };
  }
  const composite = clamp(
    dimensions.altitude * weights.altitude +
    dimensions.driveHealth * weights.driveHealth +
    dimensions.polarity * weights.polarity +
    dimensions.shadowTopology * weights.shadowTopology +
    dimensions.transformationReadiness * weights.transformationReadiness +
    knowledgeHealthValue * weights.knowledgeHealth
  );

  // 5. Identify dominant dimension (highest weighted contribution)
  const contributions: { key: keyof CCIWeights; value: number }[] = [
    { key: 'altitude', value: dimensions.altitude * weights.altitude },
    { key: 'driveHealth', value: dimensions.driveHealth * weights.driveHealth },
    { key: 'polarity', value: dimensions.polarity * weights.polarity },
    { key: 'shadowTopology', value: dimensions.shadowTopology * weights.shadowTopology },
    { key: 'transformationReadiness', value: dimensions.transformationReadiness * weights.transformationReadiness },
    { key: 'knowledgeHealth', value: knowledgeHealthValue * weights.knowledgeHealth },
  ];
  contributions.sort((a, b) => b.value - a.value);
  const dominantDimension = contributions[0].key;

  // 6. Derive session signals
  const sessionSignals = deriveSessionSignals(dimensions, inputs);

  // 7. Wave 1.4 + P1-15: Compute HoloOS G_z / P_z dual health metrics.
  // P1-15: When `sig` is provided, delegate to GreaterCycleEngine.computeMetabolicHealth
  // to eliminate the formula duplication. When `sig` is omitted (backward compat),
  // use the inline computation below.
  let gz: number, pz: number, total: number;
  let interpretation: 'consolidating' | 'polarizing-healthy' | 'polarizing-unhealthy' | 'stuck' | 'transitional';
  let liminalitySignature: { pzSpike: boolean; subDensitySaturation: boolean; isTransitional: boolean };

  if (sig) {
    // P1-15: Delegate to GreaterCycleEngine — the canonical source of G_z/P_z.
    // This eliminates the inline formula duplication flagged in Wave 1.4.
    // GCE uses sig.drives.weights (raw) + sig.polarity.cells + sig.shadows.entries
    // + sig.theta.lastEncounter + sig.transformations — the full Significator,
    // not the flattened snapshot. This is more accurate than the inline version.
    const gceHealth = computeMetabolicHealth(sig);
    gz = gceHealth.gz;
    pz = gceHealth.pz;
    total = gceHealth.total;
    interpretation = gceHealth.interpretation;
    liminalitySignature = gceHealth.liminalitySignature ?? { pzSpike: false, subDensitySaturation: false, isTransitional: false };
  } else {
    // Inline computation (backward compat — callers that only have a snapshot).
    // Compute thetaFreshness from snapshot (1 - avg staleness across cells)
    const thetaKeys = Object.keys(snapshot.theta.lastEncounter);
    const thetaCount = thetaKeys.length || 1;
    let totalStaleness = 0;
    for (const key of thetaKeys) {
      const lastTs = snapshot.theta.lastEncounter[key] ?? 0;
      if (lastTs === 0) { totalStaleness += 1; continue; }
      const elapsed = Date.now() - lastTs;
      const halfLife = 7 * 24 * 60 * 60 * 1000;
      totalStaleness += 1 - Math.pow(0.5, elapsed / halfLife);
    }
    const thetaFreshness = 1 - (totalStaleness / thetaCount);

    // Compute complexBalance from altitude spread (1 - normalized spread across 3 complexes)
    const allAlts = Object.values(snapshot.altitudes).map(s => stageOrdinal(s));
    const altSpread = allAlts.length > 0
      ? (Math.max(...allAlts) - Math.min(...allAlts)) / 7
      : 0;
    const complexBalance = 1 - altSpread;

    gz = clamp(
      dimensions.driveHealth * 0.35 +
      dimensions.shadowTopology * 0.30 +
      thetaFreshness * 0.20 +
      complexBalance * 0.15,
    );
    pz = clamp(
      dimensions.polarity * 0.35 +
      dimensions.transformationReadiness * 0.30 +
      (1 - altSpread) * 0.20 +
      thetaFreshness * 0.15,
    );
    total = gz * pz;

    const pzSpike = pz > 0.7;
    const saturatedLines = new Set<string>();
    for (const key of Object.keys(snapshot.polarity.cells)) {
      if ((snapshot.polarity.cells[key]?.crystallization ?? 0) > 0.7) {
        const [line] = key.split(':');
        if (line) saturatedLines.add(line);
      }
    }
    const subDensitySaturation = saturatedLines.size >= 5;
    const isTransitional = pzSpike && subDensitySaturation;
    liminalitySignature = { pzSpike, subDensitySaturation, isTransitional };

    if (isTransitional) {
      interpretation = 'transitional';
    } else if (gz < 0.3 && pz < 0.3) {
      interpretation = 'stuck';
    } else if (gz > 0.6 && pz < 0.3) {
      interpretation = 'consolidating';
    } else if (pz > 0.6 && gz < 0.3) {
      interpretation = 'polarizing-unhealthy';
    } else {
      interpretation = 'polarizing-healthy';
    }
  }

  return {
    composite,
    dimensions,
    weights,
    dominantDimension,
    sessionSignals,
    metabolicHealth: { gz, pz, total, interpretation, liminalitySignature },
    knowledgeHealth: knowledgeHealthMetrics,
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function clamp(value: number, min = 0.0, max = 1.0): number {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// Phase 4b: Supplementary TDG-Rust health hook (non-breaking, opt-in)
// ---------------------------------------------------------------------------

/**
 * Compute the CCI, optionally augmented with TDG-Rust graph-level health (G_z/P_z).
 *
 * When TDG-Rust is running, this fetches G_z/P_z for the player holon and blends
 * it into the metabolicHealth dimension. When TDG-Rust is not running (the common
 * case), this returns the exact same result as computeCCI() — zero regression.
 *
 * This is the Phase 4 progressive-integration path: the Significator remains the
 * source of truth, but TDG provides an additional graph-level metabolic signal
 * when available. The blending is conservative (TDG contributes at most 20% of
 * the metabolic dimension) to preserve Mysterium's existing behavioural baseline.
 *
 * Async because TDG calls are async (MCP over stdio). Callers that don't need
 * TDG augmentation should use the sync computeCCI() instead.
 */
export async function computeCCIWithTDG(
  snapshot: SignificatorSnapshot,
  _playerId: string,
): Promise<CCIScore> {
  // ponytail: TDG-Rust integration removed. Returns pure baseline — no
  // graph-level health augmentation. Signature preserved for callers.
  return computeCCI(snapshot);
}

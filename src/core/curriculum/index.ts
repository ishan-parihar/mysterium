/**
 * Curriculum module — barrel export.
 * Spec: docs/foundations/29-34
 */
export * from './types.js';
export { buildGraph, detectCycles, topologicalSort, allPrerequisites, dependents, detectGaps, learningPath, findReadyConcepts } from './KnowledgeGraph.js';
export type { GraphNode, GraphEdge } from './KnowledgeGraph.js';
export { computeRetention, computeConceptRetention, updateAfterSuccess, updateAfterFailure, createCurve, createPersonalizedCurve, computeReviewCandidates, nextDepthLevel, computeRetentionStats } from './ForgettingCurve.js';
// REVIEW_THRESHOLD and CRITICAL_THRESHOLD are re-exported via export * from './types.js' above.
export { classifyDepth, classifyDepthFromScores, assessDualDepth, updateConceptState, computeCalibrationBias } from './DepthAssessment.js';
export type { RubricEvaluationInput } from './DepthAssessment.js';
export { CurriculumRegistry, getCurriculumRegistry, resetCurriculumRegistry, isRegistrySeeded, markSeeded } from './CurriculumRegistry.js';
export { bridgeCurriculumToDevelopmental, bridgeDevelopmentalToCurriculum, computeCurriculumReviewSchedule, computeDepthProgressions, computeKnowledgeHealth } from './CurriculumBridge.js';
export { lintHolon, lintRegistry } from './CurriculumLinter.js';
export { seedCurriculumRegistry } from './CurriculumSeed.js';
export { computeLearningAnalytics } from './LearningAnalytics.js';
export type { LearningAnalyticsReport, StudyEfficiency, LearningVelocity, ModalityEffectiveness, OptimalReviewInterval } from './LearningAnalytics.js';
export { migrateKnowledgeState, needsMigration, getSchemaVersion, CURRENT_CURRICULUM_VERSION } from './CurriculumMigration.js';
export type { CurriculumBridgeResult, DevelopmentalNeed } from './CurriculumBridge.js';

// Meta-cognitive validation tools — rubric-level progression checks for the agentic loop.
export { auditProgression } from './ProgressionValidator.js';
export type { ProgressionAudit, ProgressionCheck } from './ProgressionValidator.js';
export { calibrateAllRubrics } from './RubricCalibrator.js';
export type { RubricCalibrationReport } from './RubricCalibrator.js';
export { probeCurriculum, formatProbeSummary } from './MetaCognitiveProbe.js';
export type { MetaCognitiveProbeResult } from './MetaCognitiveProbe.js';
export { detectDevelopmentalNeeds } from './DevelopmentalNeedsDetector.js';
export {
  buildSyllabusLadder,
  buildLineLadder,
  evaluateSyllabusLevel,
  evaluateLineLevel,
  evaluateAllLevels,
  DEFAULT_LEVELLING_CONFIG,
  SYLLABUS_RUNG_TITLES,
  LINE_RUNG_TITLES,
  EMPTY_PRIOR,
} from './LevellingEngine.js';
export type { LevelRung, LevelLadder, LevelPrior, LevelPriors, LevelEvaluation, LevelCap, LevellingConfig, LineLevelInputs, EvaluateAllResult } from './LevellingEngine.js';
export { seedInitialKnowledge } from './SeedInitialKnowledge.js';

/**
 * Core type system for the curriculum expansion.
 * Spec: docs/foundations/29-meta-learning-science.md, 30-holonic-curriculum-architecture.md,
 *       31-depth-assessment-model.md, 34-curriculum-engine-bridge.md
 *
 * All types are readonly interfaces. No runtime behavior lives here.
 * Follows the same conventions as src/core/assessments/types.ts.
 */
import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';
import type { Modality } from '../domain/enums.js';

// ---------------------------------------------------------------------------
// Depth Levels (foundations/31)
// ---------------------------------------------------------------------------

export type DepthLevel =
  | 'absent'
  | 'memorized'
  | 'comprehended'
  | 'applied'
  | 'analyzed'
  | 'evaluated'
  | 'transformed';

export const ALL_DEPTH_LEVELS: readonly DepthLevel[] = [
  'absent', 'memorized', 'comprehended', 'applied',
  'analyzed', 'evaluated', 'transformed',
];

/** Ordinal index of a depth level (0 = absent, 6 = transformed). */
export function depthOrdinal(level: DepthLevel): number {
  return ALL_DEPTH_LEVELS.indexOf(level);
}

/** Check if depth A is deeper than depth B. */
export function isDeeperThan(a: DepthLevel, b: DepthLevel): boolean {
  return depthOrdinal(a) > depthOrdinal(b);
}

/** Check if depth A is at least as deep as depth B. */
export function isAtLeast(a: DepthLevel, b: DepthLevel): boolean {
  return depthOrdinal(a) >= depthOrdinal(b);
}

// ---------------------------------------------------------------------------
// Bloom's Taxonomy Levels (foundations/29, 31)
// ---------------------------------------------------------------------------

export type BloomLevel =
  | 'remember'
  | 'understand'
  | 'apply'
  | 'analyze'
  | 'evaluate'
  | 'create';

export const ALL_BLOOM_LEVELS: readonly BloomLevel[] = [
  'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create',
];

/** Map DepthLevel to the corresponding BloomLevel. */
export function depthToBloom(depth: DepthLevel): BloomLevel {
  switch (depth) {
    case 'absent': return 'remember';
    case 'memorized': return 'remember';
    case 'comprehended': return 'understand';
    case 'applied': return 'apply';
    case 'analyzed': return 'analyze';
    case 'evaluated': return 'evaluate';
    case 'transformed': return 'create';
  }
}

// ---------------------------------------------------------------------------
// Curriculum Task Types (foundations/31)
// ---------------------------------------------------------------------------

export type CurriculumTaskType =
  | 'factual_recall'
  | 'concept_explanation'
  | 'application_problem'
  | 'analogy_mapping'
  | 'misconception_check'
  | 'socratic_dialogue'
  | 'peer_teaching'
  | 'project_based'
  | 'research_question'
  | 'peer_review'
  | 'debate_position'
  | 'case_study_analysis'
  | 'lab_simulation'
  | 'creative_synthesis';

export const ALL_CURRICULUM_TASK_TYPES: readonly CurriculumTaskType[] = [
  'factual_recall', 'concept_explanation', 'application_problem',
  'analogy_mapping', 'misconception_check', 'socratic_dialogue',
  'peer_teaching', 'project_based', 'research_question',
  'peer_review', 'debate_position', 'case_study_analysis',
  'lab_simulation', 'creative_synthesis',
];

// ---------------------------------------------------------------------------
// Holon Levels (foundations/30)
// ---------------------------------------------------------------------------

/**
 * Holon levels — the holonic hierarchy depth.
 * Phase 2A: Extended with academic hierarchy levels for Ph.D-level scaling.
 * Original 5 levels preserved for backward compatibility.
 * New 6 levels enable program → degree → course → module → unit → lesson → concept.
 */
export type HolonLevel =
  | 'program'    // Top-level academic program (e.g., "CS Bachelor's")
  | 'degree'     // Degree tier (e.g., "B.S. Computer Science")
  | 'course'     // Individual course (e.g., "CS101: Intro to Programming")
  | 'module'     // Course module / unit (e.g., "Algorithms Module")
  | 'unit'       // Teaching unit within a module (e.g., "Sorting Algorithms")
  | 'lesson'     // Individual lesson (e.g., "Quicksort")
  | 'branch'     // Top-level domain branch (backward compat)
  | 'subject'    // Domain subject (backward compat)
  | 'topic'      // Topic within a subject (backward compat)
  | 'concept'    // Atomic concept (backward compat)
  | 'instance';  // Concrete exercise / example (backward compat)

export const ALL_HOLON_LEVELS: readonly HolonLevel[] = [
  'program', 'degree', 'course', 'module', 'unit', 'lesson',
  'branch', 'subject', 'topic', 'concept', 'instance',
];

/** Level ordinal — deeper = higher number. Used for depth validation in linter. */
export function holonLevelOrdinal(level: HolonLevel): number {
  return ALL_HOLON_LEVELS.indexOf(level);
}

/** Check if level A is deeper than level B in the hierarchy. */
export function isDeeperLevel(a: HolonLevel, b: HolonLevel): boolean {
  return holonLevelOrdinal(a) > holonLevelOrdinal(b);
}

// ---------------------------------------------------------------------------
// Mastery Levels (foundations/34)
// ---------------------------------------------------------------------------

export type MasteryLevel = 'novice' | 'beginner' | 'competent' | 'proficient' | 'expert';

export const ALL_MASTERY_LEVELS: readonly MasteryLevel[] = [
  'novice', 'beginner', 'competent', 'proficient', 'expert',
];

// ---------------------------------------------------------------------------
// Curriculum Holon (foundations/30, 34)
// ---------------------------------------------------------------------------

export interface HolonPhase {
  /** What this phase asks */
  readonly question: string;
  /** How this phase is assessed */
  readonly assessmentType: CurriculumTaskType;
  /** What evidence indicates completion */
  readonly completionEvidence: string;
}

export interface Isomorphism {
  /** The structural pattern shared */
  readonly pattern: string;
  /** The other concept that shares this pattern */
  readonly targetConceptId: string;
  /** The domain of the target concept */
  readonly targetDomain: string;
  /** How the mapping works (structural, not surface) */
  readonly mappingDescription: string;
  /** Where the analogy breaks down */
  readonly limitations?: string;
}

export interface CurriculumContent {
  /** Core explanation (adapted by LLM to student's level) */
  readonly explanation: string;
  /** Examples of the concept */
  readonly examples: readonly string[];
  /** Non-examples (what the concept is NOT) */
  readonly nonExamples: readonly string[];
  /** Analogies to other concepts */
  readonly analogies: readonly string[];
  /** Visual/diagram descriptions */
  readonly visuals: readonly string[];
  /** Practice problems */
  readonly practiceProblems: readonly PracticeProblem[];
}

export interface PracticeProblem {
  readonly id: string;
  readonly problemText: string;
  readonly targetDepth: DepthLevel;
  readonly solution?: string;
  readonly hints?: readonly string[];
}

export interface Misconception {
  readonly id: string;
  readonly statement: string;
  readonly whyItFeelsRight: string;
  readonly structuralReason: string;
  /** Assessment task designed to reveal this misconception */
  readonly diagnosticTaskId: string;
}

export interface DepthRubricEntry {
  /** What evidence distinguishes this depth level for THIS concept */
  readonly evidence: string;
  /** What the learner can do at this level */
  readonly canDo: readonly string[];
  /** What the learner CANNOT yet do */
  readonly cannotDo: readonly string[];
  /** Task types appropriate for assessing this level */
  readonly appropriateTasks: readonly CurriculumTaskType[];
  /** Threshold score to be classified at this level (0-1) */
  readonly threshold: number;
  /** LLM rubric prompt for scoring open-ended responses */
  readonly llmRubric?: string;
}

/** The complete depth rubric for a single concept. */
export interface DepthRubric {
  readonly conceptId: string;
  readonly levels: {
    readonly memorized: DepthRubricEntry;
    readonly comprehended: DepthRubricEntry;
    readonly applied: DepthRubricEntry;
    readonly analyzed: DepthRubricEntry;
    readonly evaluated: DepthRubricEntry;
    readonly transformed: DepthRubricEntry;
  };
}

/** Forgetting curve parameters for a concept. */
export interface ForgettingParams {
  readonly initialHalfLifeMs: number;
  readonly halfLifeMultiplier: number;
  readonly maxHalfLifeMs: number;
}

/** Default forgetting curve parameters. */
export const DEFAULT_FORGETTING_PARAMS: ForgettingParams = {
  initialHalfLifeMs: 24 * 60 * 60 * 1000, // 1 day
  halfLifeMultiplier: 2.5,
  maxHalfLifeMs: 365 * 24 * 60 * 60 * 1000, // 1 year
};



/** Developmental mapping for a curriculum holon. */
export interface CurriculumDevMapping {
  readonly primaryLine: Line;
  readonly secondaryLines: readonly Line[];
  readonly stageRange: { readonly min: Stage; readonly max: Stage };
}

/** Depth metadata for a curriculum holon. */
export interface CurriculumDepthMeta {
  readonly requiredPrerequisiteDepth: DepthLevel;
  readonly targetDepthRange: { readonly min: DepthLevel; readonly max: DepthLevel };
  readonly depthProgression: readonly DepthLevel[];
}

/** A single curriculum holon — the atomic unit of knowledge. */
export interface CurriculumHolon {
  /** Unique identifier (e.g., "cs.algorithms.recursion") */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Description */
  readonly description: string;

  /** Position in the holarchy */
  readonly level: HolonLevel;
  readonly parentId: string | null;
  readonly childIds: readonly string[];

  /** The five-phase internal structure (self-similar at every level) */
  readonly phases: {
    readonly observation: HolonPhase;
    readonly principle: HolonPhase;
    readonly application: HolonPhase;
    readonly integration: HolonPhase;
    readonly creation: HolonPhase;
  };

  /** Structural isomorphisms — what this holon is structurally similar to */
  readonly isomorphisms: readonly Isomorphism[];

  /** Prerequisite holons (structural, not just sequential) */
  readonly prerequisites: readonly string[];

  /** Phase 3A: Cross-branch prerequisites — holons from other branches that
   *  must be completed before this holon can be studied. Checked by the
   *  curriculum linter and enforced by CandidateGeneration. */
  readonly crossBranchPrerequisites?: readonly string[];

  /** Developmental mapping */
  readonly devMapping: CurriculumDevMapping;

  /** Depth metadata */
  readonly depthMeta: CurriculumDepthMeta;

  /** Forgetting curve parameters */
  readonly forgettingParams: ForgettingParams;

  /** Content for this concept */
  readonly content: CurriculumContent;

  /** Misconceptions mapped to this concept */
  readonly misconceptions: readonly Misconception[];

  /** Depth rubric */
  readonly depthRubric: DepthRubric;

  /** Which modalities can deliver this content */
  readonly supportedModalities: readonly Modality[];

  /** Optional, NON-authoritative jurisdictional standards tags (doc 37 §4.3),
   *  e.g. "CCSS.MATH.4.OA.A.1". Exist solely so 41's credential layer can
   *  align evidence to external competency descriptors when a jurisdiction
   *  requires it. The engine NEVER branches on these (42's blindness law). */
  readonly standardsTags?: readonly string[];

  /** Version of this holon (for curriculum versioning). */
  readonly version?: string;
}

// ---------------------------------------------------------------------------
// Concept State (what the learner knows — stored on Significator)
// ---------------------------------------------------------------------------

export interface DepthHistoryEntry {
  readonly level: DepthLevel;
  readonly timestamp: number;
  readonly evidence: string;
}

export interface ConceptState {
  readonly depthLevel: DepthLevel;
  readonly retention: number;
  readonly lastReviewedAt: number;
  readonly reviewCount: number;
  readonly depthHistory: readonly DepthHistoryEntry[];
  readonly misconceptionFlags: readonly string[];
  /** Phase 3C: Which of the 5 holonic phases have been completed.
   *  Tracks observation → principle → application → integration → creation.
   *  Used to determine if a holon is fully mastered (all phases complete). */
  readonly completedPhases?: readonly string[];
}

export interface SubjectProgress {
  readonly modulesCompleted: number;
  readonly averageDepth: number;
  readonly masteryLevel: MasteryLevel;
  readonly crossDomainConnections: readonly string[];
}

export interface StudyEvent {
  readonly conceptId: string;
  readonly depthAchieved: DepthLevel;
  readonly modality: Modality;
  readonly timestamp: number;
  readonly retentionBefore: number;
  readonly retentionAfter: number;
}

export interface LearningProfile {
  readonly preferredModalities: readonly Modality[];
  readonly metacognitionScore: number;
  readonly calibrationAccuracy: number;
  readonly transferCapacity: number;
  readonly studyEfficiency: number;
  /** Phase 4C: Modality effectiveness scores derived from LearningAnalytics. */
  readonly modalityEffectiveness?: Readonly<Record<string, number>>;
  /** Phase 4C: Overall learning velocity (concepts per session). */
  readonly learningVelocity?: number;
  /** Phase 4C: Timestamp of last analytics computation. */
  readonly lastAnalyticsAt?: number;
}

/** The knowledge state embedded in the Significator. */
export interface KnowledgeState {
  readonly conceptStates: ReadonlyMap<string, ConceptState>;
  readonly subjectProgress: ReadonlyMap<string, SubjectProgress>;
  readonly studyHistory: readonly StudyEvent[];
  readonly learningProfile: LearningProfile;
  /** Phase 5A: Persisted forgetting curves for cross-session spaced repetition. */
  readonly forgettingCurves?: ReadonlyMap<string, ForgettingCurve>;
  /** Phase 5B: Curriculum schema version for migration support. */
  readonly curriculumVersion?: string;
}



// ---------------------------------------------------------------------------
// Dual-Depth Assessment Result (foundations/31)
// ---------------------------------------------------------------------------

export interface DualDepthResult {
  readonly conceptId: string;
  readonly timestamp: number;

  /** Knowledge depth assessment */
  readonly knowledgeDepth: {
    readonly level: DepthLevel;
    readonly confidence: number;
    readonly evidence: readonly string[];
    readonly dimensions: Readonly<Record<string, number>>;
  };

  /** Developmental signal assessment */
  readonly developmentalSignal: {
    readonly driveScores: Readonly<Record<string, number>>;
    readonly driveSignals: Readonly<Record<string, string>>;
    readonly shadowDetected: string | null;
    readonly shadowIntensity: number;
  };

  /** Metacognitive calibration */
  readonly metacognition: {
    readonly predictedDepth: DepthLevel;
    readonly actualDepth: DepthLevel;
    readonly calibrationError: number;
    readonly confidenceInPrediction: number;
  };
}

// ---------------------------------------------------------------------------
// Forgetting Curve Runtime State
// ---------------------------------------------------------------------------

export interface ForgettingCurve {
  readonly conceptId: string;
  readonly firstLearnedAt: number;
  readonly lastRetrievedAt: number;
  readonly retrievalCount: number;
  readonly retention: number;
  readonly halfLifeMs: number;
}

// ---------------------------------------------------------------------------
// Study Themes (foundations/34)
// ---------------------------------------------------------------------------

export type StudyTheme =
  | 'review_decay'
  | 'new_material'
  | 'depth_push'
  | 'cross_domain'
  | 'misconception_repair'
  | 'integration_sprint';

export const ALL_STUDY_THEMES: readonly StudyTheme[] = [
  'review_decay', 'new_material', 'depth_push',
  'cross_domain', 'misconception_repair', 'integration_sprint',
];

// ---------------------------------------------------------------------------
// Linter Types (foundations/32)
// ---------------------------------------------------------------------------

export interface LinterIssue {
  readonly checkId: string;
  readonly category: 'structural' | 'pedagogical' | 'developmental' | 'epistemic';
  readonly severity: 'error' | 'warning' | 'info';
  readonly message: string;
  readonly suggestion?: string;
  readonly location?: string;
}

export interface CurriculumLinterReport {
  readonly moduleId: string;
  readonly timestamp: number;
  readonly passed: boolean;
  readonly errors: readonly LinterIssue[];
  readonly warnings: readonly LinterIssue[];
  readonly infos: readonly LinterIssue[];
  readonly summary: {
    readonly totalChecks: number;
    readonly passed: number;
    readonly errors: number;
    readonly warnings: number;
    readonly infos: number;
  };
  readonly pedagogicalQuality: number;
  readonly developmentalIntegration: number;
}

// ---------------------------------------------------------------------------
// Review Candidates (for scheduler integration)
// ---------------------------------------------------------------------------

export interface ReviewCandidate {
  readonly conceptId: string;
  readonly currentRetention: number;
  readonly currentDepth: DepthLevel;
  readonly targetDepth: DepthLevel;
  readonly priority: number;
  readonly overdueDays: number;
}

export interface CurriculumRecommendation {
  readonly conceptId: string;
  readonly action: 'review' | 'new_material' | 'deepen' | 'connect';
  readonly estimatedMinutes: number;
  readonly rationale: string;
  readonly priority: number;
  readonly targetDepth: DepthLevel;
  /** Phase 1B: task types appropriate for assessing this depth level. */
  readonly preferredTaskTypes?: readonly CurriculumTaskType[];
}

// ---------------------------------------------------------------------------
// Review Scheduling Constants (foundations/29, 34)
// ---------------------------------------------------------------------------

/** Threshold below which a concept needs review. */
export const REVIEW_THRESHOLD = 0.7;

/** Threshold below which a concept is critically decayed. */
export const CRITICAL_THRESHOLD = 0.3;

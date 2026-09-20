/**
 * CandidateGeneration — filters eligible encounters from the world state.
 * Spec: foundations/24 §2
 */
import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';
import { stageOrdinal } from '../domain/Stage.js';
import type { Modality } from '../domain/enums.js';
import type { Holon } from '../domain/Holon.js';
import type { Significator } from '../domain/Significator.js';
import type { SessionContext } from './PriorityComputation.js';
import type { PESTLETension, MacroEvent } from './MacroCatalystEngine.js';
import { getMacroEncounterModifications } from './MacroCatalystEngine.js';

export interface EncounterCandidate {
  readonly moduleRef: string;
  readonly line: Line;
  readonly stage: Stage;
  readonly modality: Modality;
  readonly holonId: string;
  readonly cooldownClear: boolean;
  /** Codex entry text unlocked upon completing this encounter. */
  readonly codexEntry?: string;

  // --- Mastery-sequence alignment inputs (§3.2.8) ---------------------------------
  // Optional, and absent for developmental encounters, which score 0 on the mastery
  // criterion. `31` populates them during Phase-3 curriculum expansion; until then the
  // criterion is implemented and simply weighs nothing for developmental candidates.

  /** The declared blind-spot class this encounter probes (`31 §3.4`), or null. */
  readonly targetBlindSpotClass?: string | null;
  /** True when the encounter clears an unsatisfied prerequisite depth gate (`31 §3.5a`). */
  readonly resolvesUnsatisfiedClosure?: boolean;
  /** The depth level this encounter targets — scored against the learner's spiral (`31 §3.2`). */
  readonly targetDepthLevel?: DepthLevel;
  /** True when the encounter is review timed to the forgetting boundary (`31 §4.4`). */
  readonly isRetentionBoundaryReview?: boolean;
}

export interface NarrativeBeat {
  readonly id: string;
  readonly stage: Stage;
  readonly prerequisiteBeats: readonly string[];
  readonly completed: boolean;
  readonly gatedEncounterIds: readonly string[];
}

export interface FactionState {
  readonly id: string;
  readonly name: string;
  readonly stage: Stage;
  readonly disposition: number; // -1 to 1 (hostile to allied)
  readonly active: boolean;
}

export interface NPCRelationship {
  readonly holonId: string;
  readonly strength: number; // 0-1
  readonly encounters: number;
  readonly lastEncounterAt: number;
}

export interface WorldState {
  readonly holons: readonly Holon[];
  readonly recentEncounterIds: readonly string[];
  readonly cooldowns: Readonly<Record<string, number>>;
  readonly recentEncounters?: readonly { line: Line; stage: Stage; modality: Modality }[];
  readonly holon_relationships?: Readonly<Record<string, number>>;
  // Narrative system
  readonly narrativeBeats: readonly NarrativeBeat[];
  readonly activeBeatId: string | null;
  readonly completedBeatIds: readonly string[];
  // Faction system
  readonly factions: readonly FactionState[];
  // NPC relationships
  readonly npcRelationships: readonly NPCRelationship[];
  // PESTLE tension (from MacroCatalystEngine)
  readonly pestleTension: PESTLETension;
  // Active macro events
  readonly activeMacroEvents: readonly MacroEvent[];
  // P1-14: State for each active macro event (phase, sessionsInPhase, playerChoices).
  // The lifecycle (onset → active → resolution) is advanced by endSession via
  // advanceMacroEvent(). Prior to P1-14, this field didn't exist and the
  // lifecycle functions were never called — macro events were stuck in 'onset'
  // forever (or rather, MacroEventState was a dead type). Now the state is
  // tracked per active event, keyed by event id.
  readonly macroEventStates?: readonly { readonly eventId: string; readonly state: import('./MacroCatalystEngine.js').MacroEventState }[];
}

export function createInitialWorldState(holons: readonly Holon[]): WorldState {
  // G.6: Initial narrative beats that gate encounters by stage progression
  const narrativeBeats: NarrativeBeat[] = [
    { id: 'awakening', stage: 'Red', prerequisiteBeats: [], completed: false, gatedEncounterIds: [] },
    { id: 'first-challenge', stage: 'Red', prerequisiteBeats: ['awakening'], completed: false, gatedEncounterIds: [] },
    { id: 'order-emerges', stage: 'Amber', prerequisiteBeats: ['first-challenge'], completed: false, gatedEncounterIds: [] },
    { id: 'autonomy-calls', stage: 'Orange', prerequisiteBeats: ['order-emerges'], completed: false, gatedEncounterIds: [] },
    { id: 'connection-awakens', stage: 'Green', prerequisiteBeats: ['autonomy-calls'], completed: false, gatedEncounterIds: [] },
    { id: 'systemic-vision', stage: 'Teal', prerequisiteBeats: ['connection-awakens'], completed: false, gatedEncounterIds: [] },
  ];

  return {
    holons,
    recentEncounterIds: [],
    cooldowns: {},
    recentEncounters: [],
    narrativeBeats,
    activeBeatId: 'awakening',
    completedBeatIds: [],
    factions: [],
    npcRelationships: [],
    pestleTension: { political: 0, economic: 0, social: 0, technological: 0, legal: 0, environmental: 0 },
    activeMacroEvents: [],
  };
}

/** All 7 modalities available in the system. */
const ALL_MODALITIES: Modality[] = [
  'Deterministic', 'Strategic', 'Embodied',
  'ScenarioChoice', 'LanguageReflective', 'SocialCooperative', 'ImmersiveRPG',
];

/** Ponytail: task-type sets per modality — modalities whose preferred chain has no match in the module won't be assigned. */
const MODALITY_TASK_TYPES: Record<Modality, readonly string[]> = {
  Deterministic: ['n_back', 'stroop', 'go_no_go', 'reaction_time'],
  Strategic: ['pattern_prediction'],
  Embodied: ['hold', 'reaction_time'],
  ScenarioChoice: ['dilemma', 'scenario'],
  LanguageReflective: ['self_report', 'llm_dialogue'],
  SocialCooperative: ['cooperation', 'imitation'],
  ImmersiveRPG: ['dilemma', 'scenario', 'emotion_identification', 'self_report', 'cooperation'],
};

/** Modalities that require specific session conditions. */
const ENERGY_GATED: Modality[] = ['Embodied'];
const TIME_GATED: Modality[] = ['Strategic'];

/**
 * Generate all eligible encounter candidates given current significator and world state.
 * Applies 5 filters: layer-perception, altitude, cooldown, narrative gate, modality availability.
 *
 * T-0.4 (HS-13 fix): the optional `moduleTaskTypesProvider` callback lets the
 * scheduler filter modalities by what the target module actually supports.
 * When provided, modalities whose preferred task-type chain has no match in
 * the module's tasks are excluded. When not provided, all non-blocked
 * modalities are eligible (legacy behavior — root cause of modality collapse).
 */
/**
 * Generate all eligible encounter candidates given current significator and world state.
 * Applies 5 filters: layer-perception, altitude, cooldown, narrative gate, modality availability.
 *
 * T-0.4 (HS-13 fix): the optional `moduleTaskTypesProvider` callback lets the
 * scheduler filter modalities by what the target module actually supports.
 * When provided, modalities whose preferred task-type chain has no match in
 * the module's tasks are excluded. When not provided, all non-blocked
 * modalities are eligible (legacy behavior — root cause of modality collapse).
 *
 * Phase 1B: When `rubricTaskTypes` is provided, modalities that align with
 * the rubric's appropriateTasks are ranked higher (bias toward rubric-aligned modalities).
 */
export function generateCandidates(
  sig: Significator,
  world: WorldState,
  now: number,
  session?: SessionContext,
  moduleTaskTypesProvider?: (moduleRef: string) => Set<string> | undefined,
): EncounterCandidate[] {
  const maxStageOrd = stageOrdinal(sig.currentStage) + 1;
  const candidates: EncounterCandidate[] = [];
  const recent = world.recentEncounters ?? [];

  // Filter 5: Determine blocked modalities based on session context
  const blockedModalities = new Set<Modality>();
  if (session?.inferredEnergy === 'low') {
    ENERGY_GATED.forEach(m => blockedModalities.add(m));
  }
  if (session?.estimatedTimeAvailable !== undefined && session.estimatedTimeAvailable < 900000) {
    TIME_GATED.forEach(m => blockedModalities.add(m));
  }

  // Compute macro-event modifications from active events
  const macroModifications = computeMacroModifications(world);

  for (const holon of world.holons) {
    if (!holon.active) continue;

    // If forceLine is provided, filter candidates to only matching holon.line.
    if (session?.forceLine && holon.line !== session.forceLine) continue;

    // If forceStage is provided, filter candidates to only matching holon.stage.
    if (session?.forceStage && holon.stage !== session.forceStage) continue;

    const bypassChecks = !!(session?.forceLine || session?.forceStage);

    if (!bypassChecks) {
      // Filter 1: Layer-perception (stage <= current + 1)
      if (stageOrdinal(holon.stage) > maxStageOrd) continue;

      // Filter 2: Altitude requirement (stage <= line altitude + 1)
      const lineAltOrd = stageOrdinal(sig.altitudes[holon.line]);
      if (stageOrdinal(holon.stage) > lineAltOrd + 1) continue;
    }

    const moduleRef = `${holon.line}:${holon.stage}`;
    const rotationKey = holon.id ?? moduleRef;
    // T-0.4 (HS-13 fix): look up the module's task types and pass them to
    // getEligibleModalities so modalities are filtered by module support.
    const moduleTaskTypes = moduleTaskTypesProvider?.(moduleRef);

    // Generate candidates across eligible modalities (2-3 per holon)
    const eligible = session?.forceModality
      ? [session.forceModality as Modality]
      : getEligibleModalities(holon, blockedModalities, moduleTaskTypes, rotationKey);

    const anyForcing = !!(session?.forceLine || session?.forceStage || session?.forceModality);

    for (const modality of eligible) {
      if (!anyForcing) {
        // Filter 3: Cooldown — timestamp-based
        const tupleKey = `${holon.line}:${holon.stage}:${modality}`;
        const cooldownTs = world.cooldowns[tupleKey] ?? world.cooldowns[moduleRef] ?? 0;
        if (now < cooldownTs) continue;

        // Filter 3: Cooldown — recency-based
        const last3 = recent.slice(-3);
        if (last3.some(r => r.line === holon.line && r.stage === holon.stage && r.modality === modality)) continue;

        const last2 = recent.slice(-2);
        if (last2.some(r => r.line === holon.line && r.stage === holon.stage)) continue;

        // Modality rotation constraint: prevent consecutive repeats of the same modality
        if (recent.length >= 2) {
          const last2Modalities = recent.slice(-2);
          if (last2Modalities[0].modality === last2Modalities[1].modality && modality === last2Modalities[0].modality) {
            continue;
          }
        }
      }

      // Filter 6: Macro-event blocking — if candidate matches blocked tags, skip
      const candidateTags = [`macro:${modality}`, `event:${holon.id}`];
      const isBlocked = candidateTags.some(tag => macroModifications.blockedTags.has(tag));
      if (isBlocked) continue;

      // Filter 7: Narrative beat gating — if encounter is gated by incomplete beat, skip
      const gatedByBeat = world.narrativeBeats.some(
        beat => !beat.completed && beat.gatedEncounterIds.includes(moduleRef),
      );
      if (gatedByBeat) continue;

      candidates.push({
        moduleRef,
        line: holon.line,
        stage: holon.stage,
        modality,
        holonId: holon.id,
        cooldownClear: true,
      });
    }
  }

  return candidates;
}

function getAllTaskTypes(): Set<string> {
  const allTypes = new Set<string>();
  for (const types of Object.values(MODALITY_TASK_TYPES)) {
    for (const t of types) allTypes.add(t);
  }
  return allTypes;
}

/**
 * Deterministic rotation offset derived from the holon identity: different
 * holons start their modality rotation at different points (preserving the
 * variety the old Math.random() call provided) while remaining fully
 * reproducible for the same world state.
 */
function modalityRotationOffset(key: string): number {
  const s = String(key);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function getEligibleModalities(
  holon: Holon,
  blocked: Set<Modality>,
  moduleTaskTypes?: Set<string>,
  rotationKey = '',
): Modality[] {
  const primary = holon.modality ?? 'ImmersiveRPG';
  
  // Filter modalities to only those whose preferred chain has ≥1 match in the module
  const taskTypes = moduleTaskTypes ?? getAllTaskTypes();
  const eligible = ALL_MODALITIES.filter(m => {
    if (blocked.has(m)) return false;
    const chain = MODALITY_TASK_TYPES[m];
    return chain.some(t => taskTypes.has(t));
  });
  
  if (eligible.length === 0) return !blocked.has(primary) ? [primary] : ['ImmersiveRPG'];
  
  const selected: Modality[] = [];
  if (eligible.includes(primary)) selected.push(primary);
  
  // P0-BENCH (Validation Benchmark 2026-09-15): this selection previously used
  // Math.random(), which made encounter scheduling non-deterministic — violating
  // the core architecture's determinism claim (README: "fully deterministic given
  // the same inputs and registry state") and failing the benchmark's G1
  // reproducibility gate. Round-robin over a stable rotation order preserves the
  // intent (variety across candidates) deterministically.
  const alternatives = eligible.filter(m => m !== primary);
  let rot = modalityRotationOffset(rotationKey);
  while (selected.length < 3 && alternatives.length > 0) {
    const idx = rot % alternatives.length;
    selected.push(alternatives.splice(idx, 1)[0]);
    rot++;
  }
  
  return selected;
}

function computeMacroModifications(world: WorldState): {
  blockedTags: Set<string>;
  boostedTags: Set<string>;
} {
  const blockedTags = new Set<string>();
  const boostedTags = new Set<string>();

  for (const event of world.activeMacroEvents) {
    const eventState = {
      event,
      phase: 'active' as const,
      sessionsInPhase: 0,
      encountersSinceStart: 0,
      playerChoices: [],
    };
    const mods = getMacroEncounterModifications(eventState);
    for (const tag of mods.blockedEncounterTags) blockedTags.add(tag);
    for (const tag of mods.additionalEncounterTags) boostedTags.add(tag);
  }

  return { blockedTags, boostedTags };
}

/**
 * T-0.4 (HS-13 fix): Build a moduleTaskTypesProvider callback from a
 * StageAssessment lookup function. The provider returns the set of TaskType
 * strings a module supports, so getEligibleModalities can filter modalities
 * by module support (fixing the modality collapse where 6/8 Red-stage
 * modules produced identical generic n_back).
 *
 * Usage:
 *   const provider = createModuleTaskTypesProvider(
 *     (line, stage) => moduleRegistry.get(line, stage)
 *   );
 *   const encounters = scheduleNext(sig, world, session, now, 5, weights, undefined, provider);
 */
export function createModuleTaskTypesProvider(
  getModule: (line: string, stage: string) => { readonly tasks: readonly { readonly type: string }[] } | undefined,
): (moduleRef: string) => Set<string> | undefined {
  return (moduleRef: string): Set<string> | undefined => {
    const [line, stage] = moduleRef.split(':');
    if (!line || !stage) return undefined;
    const module = getModule(line, stage);
    if (!module) return undefined;
    return new Set(module.tasks.map(t => t.type));
  };
}

// ---------------------------------------------------------------------------
// Curriculum Candidate Generation (foundations/34)
// ---------------------------------------------------------------------------

import type { KnowledgeState, StudyTheme, CurriculumRecommendation, CurriculumTaskType, DepthLevel, CurriculumHolon } from '../curriculum/types.js';
import { REVIEW_THRESHOLD, CRITICAL_THRESHOLD, depthOrdinal, ALL_DEPTH_LEVELS } from '../curriculum/types.js';
import type { CurriculumRegistry } from '../curriculum/CurriculumRegistry.js';
import { buildGraph, topologicalSort } from '../curriculum/KnowledgeGraph.js';

/**
 * Mapping from CurriculumTaskType to eligible Modalities.
 * Used to bias modality selection for curriculum encounters toward
 * assessment types aligned with the rubric's appropriateTasks.
 */
const TASK_TYPE_TO_MODALITIES: Record<CurriculumTaskType, readonly Modality[]> = {
  factual_recall: ['LanguageReflective', 'Deterministic'],
  concept_explanation: ['LanguageReflective', 'ImmersiveRPG'],
  application_problem: ['Deterministic', 'ScenarioChoice', 'ImmersiveRPG'],
  analogy_mapping: ['LanguageReflective', 'ImmersiveRPG'],
  misconception_check: ['LanguageReflective', 'ScenarioChoice'],
  socratic_dialogue: ['LanguageReflective', 'SocialCooperative'],
  peer_teaching: ['SocialCooperative', 'LanguageReflective'],
  project_based: ['Strategic', 'ImmersiveRPG'],
  research_question: ['LanguageReflective'],
  peer_review: ['SocialCooperative', 'LanguageReflective'],
  debate_position: ['SocialCooperative', 'LanguageReflective'],
  case_study_analysis: ['ImmersiveRPG', 'ScenarioChoice'],
  lab_simulation: ['Embodied', 'Deterministic'],
  creative_synthesis: ['ImmersiveRPG', 'LanguageReflective'],
};

/**
 * Get the modalities best suited for a given set of appropriate task types.
 * Returns modalities sorted by how many task types they cover (descending).
 */
export function getModalitiesForTaskTypes(
  appropriateTasks: readonly CurriculumTaskType[],
): readonly Modality[] {
  const modalityScore = new Map<Modality, number>();
  for (const taskType of appropriateTasks) {
    const modalities = TASK_TYPE_TO_MODALITIES[taskType] ?? [];
    for (const m of modalities) {
      modalityScore.set(m, (modalityScore.get(m) ?? 0) + 1);
    }
  }
  return [...modalityScore.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([m]) => m);
}

// Reuse CurriculumRecommendation from curriculum/types.ts — no duplicate interface.
export type CurriculumCandidate = CurriculumRecommendation;

/**
 * Check if all prerequisites of a holon are at the required depth level.
 * Shared helper to eliminate duplication across new_material and depth_push cases.
 */
function prerequisitesAtRequiredDepth(
  conceptId: string,
  knowledge: KnowledgeState,
  registry: CurriculumRegistry,
  encountered?: ReadonlySet<string>,
): boolean {
  const holon = registry.get(conceptId);
  if (!holon) return false;

  // Check same-branch prerequisites
  const sameBranchMet = holon.prerequisites.every(p => {
    if (encountered && !encountered.has(p)) return false;
    const prereqCs = knowledge.conceptStates.get(p);
    if (!prereqCs) return false;
    const prereqHolon = registry.get(p);
    const requiredDepth = prereqHolon?.depthMeta.requiredPrerequisiteDepth ?? 'memorized';
    return depthOrdinal(prereqCs.depthLevel) >= depthOrdinal(requiredDepth);
  });
  if (!sameBranchMet) return false;

  // Check cross-branch prerequisites (must exist in knowledge state at required depth)
  const crossBranchMet = (holon.crossBranchPrerequisites ?? []).every(cbId => {
    const cbCs = knowledge.conceptStates.get(cbId);
    if (!cbCs) return false;
    const cbHolon = registry.get(cbId);
    const requiredDepth = cbHolon?.depthMeta.requiredPrerequisiteDepth ?? 'memorized';
    return depthOrdinal(cbCs.depthLevel) >= depthOrdinal(requiredDepth);
  });
  return crossBranchMet;
}

/**
 * Phase 6B: Adaptive difficulty — compute target depth based on performance signals.
 * Uses retention, consecutive correct answers, and review count to determine
 * whether the learner is ready to push deeper or should consolidate first.
 *
 * Heuristic: high retention + 3+ consecutive correct = push 1 level deeper.
 * Low retention or recent errors = stay at current depth for consolidation.
 */
function computeAdaptiveTargetDepth(
  cs: { readonly depthLevel: DepthLevel; readonly retention: number; readonly reviewCount: number },
  holon: CurriculumHolon | undefined,
): DepthLevel {
  const currentOrd = depthOrdinal(cs.depthLevel);
  const maxOrd = holon ? depthOrdinal(holon.depthMeta.targetDepthRange.max) : ALL_DEPTH_LEVELS.length - 1;

  // Can't go beyond the holon's target max
  if (currentOrd >= maxOrd) return cs.depthLevel;

  // High retention + sufficient reviews = ready for next level
  if (cs.retention > 0.8 && cs.reviewCount >= 3) {
    return ALL_DEPTH_LEVELS[Math.min(currentOrd + 1, maxOrd)]!;
  }

  // Medium retention = stay at current depth for consolidation
  return cs.depthLevel;
}

/**
 * Phase 6B: Adaptive priority — adjust scheduling priority based on performance.
 * Concepts with high retention and good history get lower priority (less urgent).
 * Concepts with low retention or many reviews without mastery get higher priority.
 */
function computeAdaptivePriority(
  cs: { readonly retention: number; readonly reviewCount: number },
): number {
  // Base priority inversely proportional to retention
  const retentionPriority = Math.max(0, 1 - cs.retention);

  // High review count with low retention = struggling = boost priority.
  // Only apply when retention is actually low to avoid boosting nearly-mastered concepts.
  const struggleBoost = (cs.reviewCount > 5 && cs.retention < 0.6)
    ? Math.min(0.2, (cs.reviewCount - 5) * 0.04)
    : 0;

  return Math.min(0.9, 0.5 + retentionPriority * 0.3 + struggleBoost);
}

/**
 * Generate curriculum encounter candidates from the player's knowledge state.
 * These candidates are interleaved with developmental encounters during scheduling.
 *
 * @param knowledge - The player's current KnowledgeState from the Significator
 * @param studyTheme - The active study theme from AutoModeStrategy
 * @param maxSlots - Maximum number of curriculum encounters to generate
 * @param registry - Optional CurriculumRegistry for discovering new material
 * @returns Array of CurriculumCandidate ranked by priority (descending)
 */
export function generateCurriculumCandidates(
  knowledge: KnowledgeState | undefined,
  studyTheme: StudyTheme | undefined,
  maxSlots: number,
  registry?: CurriculumRegistry,
): readonly CurriculumCandidate[] {
  if (!knowledge || maxSlots <= 0 || !studyTheme) return [];

  const candidates: CurriculumCandidate[] = [];
  const now = Date.now();

  // Route by study theme
  switch (studyTheme) {
    case 'review_decay': {
      // Find concepts with low retention that need review (no forgetting curve needed —
      // ConceptState.retention is the canonical source; ForgettingCurve enriches when available)
      // Use shared constants from ForgettingCurve to prevent drift
      for (const [conceptId, cs] of knowledge.conceptStates) {
        if (candidates.length >= maxSlots) break;
        if (cs.retention < REVIEW_THRESHOLD) {
          const retentionPriority = 1 - cs.retention;
          const criticalBoost = cs.retention < CRITICAL_THRESHOLD ? 0.3 : 0;
          const overdueMs = now - cs.lastReviewedAt;
          const overdueDays = overdueMs / (24 * 60 * 60 * 1000);
          const overdueBoost = Math.min(0.2, overdueDays * 0.02);
          candidates.push({
            conceptId,
            action: 'review',
            priority: Math.min(1, retentionPriority + criticalBoost + overdueBoost),
            estimatedMinutes: 10,
            rationale: `Retention at ${(cs.retention * 100).toFixed(0)}% — reviewed ${Math.round(overdueDays)}d ago`,
            targetDepth: cs.depthLevel,
          });
        }
      }
      // Sort by priority descending
      candidates.sort((a, b) => b.priority - a.priority);
      break;
    }

    case 'depth_push': {
      // Find concepts at lower depth that should be pushed deeper.
      // P-A: Also enforce prerequisite depth — a concept can't be deepened
      // if its prerequisites haven't reached the required depth.
      // Phase 6B: Adaptive difficulty — adjust target depth based on
      // retention, consecutive correct answers, and recent performance.
      if (!registry) break;
      for (const [conceptId, cs] of knowledge.conceptStates) {
        if (candidates.length >= maxSlots) break;
        if (cs.retention > 0.5 && prerequisitesAtRequiredDepth(conceptId, knowledge, registry)) {
          // Adaptive difficulty: determine target depth based on performance
          const targetDepth = computeAdaptiveTargetDepth(cs, registry.get(conceptId));
          const adaptivePriority = computeAdaptivePriority(cs);
          candidates.push({
            conceptId,
            action: 'deepen',
            priority: adaptivePriority,
            estimatedMinutes: 15,
            rationale: `Current depth: ${cs.depthLevel} — push to ${targetDepth} (adaptive)`,
            targetDepth,
          });
        }
      }
      break;
    }

    case 'new_material': {
      // Discover unmastered concepts from the CurriculumRegistry.
      // Filter: concept not in knowledge.conceptStates OR at 'absent' depth.
      // Prefer concepts whose prerequisites are already mastered.
      // Phase 6C: Adaptive difficulty — use computeAdaptiveTargetDepth for
      // encountered concepts that need depth advancement.
      if (!registry) break;

      const encountered = new Set(knowledge.conceptStates.keys());
      const unmastered: { id: string; depth: number }[] = [];

      for (const holon of registry.getAll()) {
        if (candidates.length >= maxSlots) break;
        if (encountered.has(holon.id)) {
          // Already encountered — check if it needs depth advancement
          const cs = knowledge.conceptStates.get(holon.id);
          if (cs && depthOrdinal(cs.depthLevel) < depthOrdinal(holon.depthMeta.targetDepthRange.max)) {
            unmastered.push({ id: holon.id, depth: depthOrdinal(cs.depthLevel) });
          }
          continue;
        }
        // Never encountered — rank by prerequisite readiness
        const prereqsMet = prerequisitesAtRequiredDepth(holon.id, knowledge, registry, encountered);
        unmastered.push({ id: holon.id, depth: prereqsMet ? -1 : -2 });
      }

      // Sort: prereqs-met (depth=-1) before prereqs-not-met (depth=-2), then by lowest current depth
      unmastered.sort((a, b) => b.depth - a.depth);

      for (const { id } of unmastered) {
        if (candidates.length >= maxSlots) break;
        const holon = registry.get(id);
        if (!holon) continue;
        const prereqsMet = holon.prerequisites.every(p => encountered.has(p));
        const cs = knowledge.conceptStates.get(id);
        const currentDepth = cs?.depthLevel ?? 'absent';

        // Adaptive: for encountered concepts, compute target depth dynamically
        const targetDepth = cs
          ? computeAdaptiveTargetDepth(cs, holon)
          : holon.depthMeta.targetDepthRange.min;
        const adaptivePriority = cs
          ? computeAdaptivePriority({ retention: cs.retention, reviewCount: cs.reviewCount })
          : (prereqsMet ? 0.7 : 0.4);

        candidates.push({
          conceptId: id,
          action: cs ? 'deepen' : 'new_material',
          priority: adaptivePriority,
          estimatedMinutes: 15,
          rationale: cs
            ? `At ${currentDepth} depth — advance toward ${targetDepth} (adaptive)`
            : `New concept — prerequisites ${prereqsMet ? 'met' : 'not yet met'}`,
          targetDepth,
        });
      }
      break;
    }

    case 'cross_domain': {
      // Find concepts with cross-domain connections.
      // Phase 6C: Adaptive difficulty — use computeAdaptivePriority to
      // rank concepts by their readiness for cross-domain exploration.
      for (const [conceptId, cs] of knowledge.conceptStates) {
        if (candidates.length >= maxSlots) break;
        if (cs.depthLevel === 'analyzed' || cs.depthLevel === 'evaluated') {
          const adaptivePriority = computeAdaptivePriority({ retention: cs.retention, reviewCount: cs.reviewCount });
          candidates.push({
            conceptId,
            action: 'connect',
            priority: adaptivePriority,
            estimatedMinutes: 15,
            rationale: `At ${cs.depthLevel} depth — explore cross-domain connections`,
            targetDepth: 'transformed',
          });
        }
      }
      break;
    }

    case 'misconception_repair': {
      // Find concepts with misconception flags
      for (const [conceptId, cs] of knowledge.conceptStates) {
        if (candidates.length >= maxSlots) break;
        if (cs.misconceptionFlags.length > 0) {
          candidates.push({
            conceptId,
            action: 'deepen',
            priority: 0.8,
            estimatedMinutes: 15,
            rationale: `${cs.misconceptionFlags.length} misconception(s) flagged — repair needed`,
            targetDepth: cs.depthLevel,
          });
        }
      }
      break;
    }

    case 'integration_sprint': {
      // Find concepts at high depth for integration work
      for (const [conceptId, cs] of knowledge.conceptStates) {
        if (candidates.length >= maxSlots) break;
        if (cs.depthLevel === 'evaluated' || cs.depthLevel === 'transformed') {
          candidates.push({
            conceptId,
            action: 'connect',
            priority: 0.65,
            estimatedMinutes: 20,
            rationale: `At ${cs.depthLevel} — sprint toward integration`,
            targetDepth: 'transformed',
          });
        }
      }
      break;
    }
  }  // Enrich candidates with rubric-appropriate task types from the holon.
  // Phase 1B: look up the target depth level's appropriateTasks from the
  // holon's depthRubric so the scheduler can bias modality selection.
  if (registry) {
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i]!;
      const holon = registry.get(c.conceptId);
      if (!holon) continue;
      const levelEntry = holon.depthRubric.levels[c.targetDepth as keyof typeof holon.depthRubric.levels];
      if (levelEntry && levelEntry.appropriateTasks.length > 0) {
        candidates[i] = { ...c, preferredTaskTypes: levelEntry.appropriateTasks };
      }
    }
  }

  // Phase 4A: Sort candidates by prerequisite depth using topological order.
  // Concepts whose prerequisites are met come first, ensuring the learner
  // follows the DAG rather than receiving random-seeming material.
  if (registry && candidates.length > 1) {
    const graph = buildGraph(registry.getAll());
    const topoOrder = topologicalSort(graph.adjacency);
    const orderMap = new Map<string, number>();
    topoOrder.forEach((id, idx) => orderMap.set(id, idx));
    candidates.sort((a, b) => {
      const orderA = orderMap.get(a.conceptId) ?? Infinity;
      const orderB = orderMap.get(b.conceptId) ?? Infinity;
      if (orderA !== orderB) return orderA - orderB;
      // Same topological position: break tie by priority
      return b.priority - a.priority;
    });
  } else {
    candidates.sort((a, b) => b.priority - a.priority);
  }

  // Phase 3B: Isomorphism enrichment — for concepts with structural isomorphisms
  // to already-mastered concepts, boost their priority (cross-branch reinforcement).
  // This surfaces transfer-learning opportunities: when a learner has mastered
  // a concept with a known isomorphism, the structurally similar concept is
  // scheduled sooner because the learner can leverage existing understanding.
  if (registry) {
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i]!;
      const holon = registry.get(c.conceptId);
      if (!holon || holon.isomorphisms.length === 0) continue;

      // Check how many isomorphism targets the learner has mastered
      let masteredIsomorphisms = 0;
      for (const iso of holon.isomorphisms) {
        const targetCs = knowledge.conceptStates.get(iso.targetConceptId);
        if (targetCs && depthOrdinal(targetCs.depthLevel) >= depthOrdinal('comprehended')) {
          masteredIsomorphisms++;
        }
      }

      if (masteredIsomorphisms > 0) {
        // Boost priority: more mastered isomorphisms = stronger boost
        const isomorphismBoost = Math.min(0.15, masteredIsomorphisms * 0.05);
        candidates[i] = {
          ...c,
          priority: Math.min(1, c.priority + isomorphismBoost),
          rationale: `${c.rationale} [${masteredIsomorphisms} isomorphic concept(s) mastered]`,
        };
      }
    }
    // Re-sort after isomorphism enrichment
    candidates.sort((a, b) => b.priority - a.priority);
  }

  return candidates.slice(0, maxSlots);
}




/**
 * GameLoop — headless game loop wiring all 5 engines.
 * Spec: foundations/21 (master synthesis)
 */
import type { Significator } from './domain/Significator.js';
import type { ScheduledEncounter } from './domain/EncounterSpecNew.js';
import { scheduleNextWithHolonicReturn, scheduleThresholdMode, type WorldState, type SessionContext } from './engines/EncounterScheduler.js';
import { processOutcome, applyConsequences, type PlayerResponse } from './engines/ConsequenceEngine.js';
// P0-FIX (Full-Development Audit 2026-09-15): static imports replace the three
// require() calls that crashed endSession in every ESM runtime (tsx/vitest/dev)
// with "require is not defined". The production tsup bundle masked this by
// bundling the call sites; every non-bundled runtime hit a dead macro-event
// lifecycle and a silently no-op harvest check.
import { advanceMacroEvent, resolveMacroEvent, type MacroEventState } from './engines/MacroCatalystEngine.js';
import { checkHarvest } from './engines/PolarityEngine.js';
import { InfraConfig } from './config/InfraConfig.js';
import { detectThreshold, advanceTransformation, commitTransformation, recordKnotResolution, reconstructTransformationState, detectPerLineTransformation, type TransformationSignal, type TransformationState, type PerLineTransformationSignal } from './engines/TransformationDetector.js';
import { detectBleedThrough } from './engines/ThetaDecay.js';
import { toSnapshot } from './domain/SignificatorSnapshot.js';
import { computeCCI, type CCIScore } from './engines/CCIEngine.js';
import {
  generateSessionStrategy,
  evaluateMidSessionAdjustment,
  applyWeightBias,
  checkSafetyOverride,
  computePostTransformationBias,
  type SessionStrategy,
  type SessionStrategyAdjustment,
  type RecentEncounter,
} from './engines/AutoModeStrategy.js';
import { DEFAULT_WEIGHTS, type PriorityWeights } from './engines/PriorityComputation.js';
import { runModeAwareAssessment } from './assessments/engine.js';
import type { AssessmentResult, ShadowAssessmentResult, StageAssessment, TrialResult, ModuleExecutionMode } from './assessments/types.js';
import {
  createInitialUserMatrixModel,
  updateUserMatrix,
  promotePhase,
  resetPhaseAfterTransformation,
  inferFromResponse,
  summarizeUserMatrix,
  type UserMatrixModel,
} from './engines/UserMatrixModel.js';
import { maybeFireHook } from './engines/hooks.js';
import { stageOrdinal } from './domain/Stage.js';
import type { Line } from './domain/Line.js';
import type { Stage } from './domain/Stage.js';
import type { Modality } from './domain/enums.js';
// Curriculum expansion: session-end retention decay and curriculum scheduling.
import { DEFAULT_FORGETTING_PARAMS, ALL_DEPTH_LEVELS } from './curriculum/types.js';
import type { ConceptState, StudyTheme, ForgettingCurve } from './curriculum/types.js';
import { generateCurriculumCandidates, type CurriculumCandidate } from './engines/CandidateGeneration.js';
import { getCurriculumRegistry } from './curriculum/CurriculumRegistry.js';
import { seedCurriculumRegistry } from './curriculum/CurriculumSeed.js';
import { computeLearningAnalytics } from './curriculum/LearningAnalytics.js';
import { migrateKnowledgeState } from './curriculum/CurriculumMigration.js';
import { probeCurriculum } from './curriculum/MetaCognitiveProbe.js';
import { bridgeDevelopmentalToCurriculum } from './curriculum/CurriculumBridge.js';
import { detectDevelopmentalNeeds } from './curriculum/DevelopmentalNeedsDetector.js';
import { seedInitialKnowledge } from './curriculum/SeedInitialKnowledge.js';
import { allParadigms } from './braingame/registry.js';


export interface TickResult {
  readonly encounter: ScheduledEncounter | null;
  readonly encounters: readonly ScheduledEncounter[];
  readonly sig: Significator;
  readonly world: WorldState;
  readonly transformation: TransformationSignal | null;
  readonly bleedThrough: readonly string[];
}

/**
 * Wave 1.1: Apply a response WITHOUT scheduling the next encounter.
 * This decouples "apply consequences + update UserMatrixModel + advance
 * transformation state" from "schedule next encounter." The CLI's
 * AgenticOrchestrator already calls applyConsequences internally, so
 * passing the response to tickWithStrategy would double-count. Instead,
 * the CLI calls applyResponseOnly first, then tickWithStrategy(null, null)
 * for scheduling only.
 *
 * Returns the updated sig, world, and sessionState (with UserMatrixModel
 * and transformation state advanced).
 */
export function applyResponseOnly(
  sig: Significator,
  world: WorldState,
  sessionState: SessionState,
  response: PlayerResponse,
  previousEncounter: ScheduledEncounter,
  now: number,
): { sig: Significator; world: WorldState; sessionState: SessionState } {
  let updatedSig = sig;
  let updatedWorld = world;
  let updatedUserMatrix = sessionState.userMatrixModel;
  let updatedTransformationState = sessionState.transformationState;

  // The orchestrator already called applyConsequences, so we DON'T re-apply.
  // But we DO need to update UserMatrixModel and advance transformation state.

  // Update UserMatrixModel
  const inference = inferFromResponse(
    response.narrativeSummary ?? '',
    response.driveDirectionality,
    response.shadowSurfaced,
  );
  const line = previousEncounter.targetLines[0] ?? 'Cognitive';
  const stage = previousEncounter.stage;
  updatedUserMatrix = updateUserMatrix(updatedUserMatrix, line, stage, inference, now);
  updatedUserMatrix = promotePhase(updatedUserMatrix, updatedSig.polarity.master.mode);

  // Advance transformation state
  updatedTransformationState = advanceTransformation(updatedTransformationState, updatedSig);

  // Record knot resolution if shadow encounter was passed
  if (previousEncounter.executionMode === 'shadow') {
    const shadowPassed = Object.values(response.driveDirectionality).every(d => d === 'HealthyBalanced');
    if (shadowPassed) {
      updatedTransformationState = recordKnotResolution(updatedTransformationState);
    }
  }

  // Check for transformation commit
  // P1-F7 (Fresh-User UX Audit): Stages NEVER demote. commitTransformation
  // only returns a targetStage when phase === 'complete', and the target is
  // always ALL_STAGES[currentOrd + 1] (the next stage UP). There is no code
  // path that lowers currentStage. The "stage regression" reported in the
  // fresh-user audit was a symptom of the F4 migration bug (which destroyed
  // the save and created a fresh Red significator), not a demotion mechanic.
  // See tests/engines/StageNoDemotion.test.ts for the regression guard.
  const commitResult = commitTransformation(updatedTransformationState);
  if (commitResult.targetStage) {
    // Hook 3: onTransformation — fire before we mutate sig, using the pre-commit stage as `from`.
    const fromStage = updatedSig.currentStage;
    maybeFireHook('onTransformation', (h) => h.onTransformation(fromStage, commitResult.targetStage!, updatedSig));
    updatedSig = {
      ...updatedSig,
      currentStage: commitResult.targetStage,
      transformations: [
        ...updatedSig.transformations,
        {
          fromStage: updatedSig.currentStage,
          toStage: commitResult.targetStage,
          triggeredAt: Date.now(),
          triggeredAtSession: updatedSig.totalSessions,
          catalystCount: updatedSig.totalEncounters,
        },
      ],
    };
    updatedTransformationState = commitResult.newState;
    updatedUserMatrix = resetPhaseAfterTransformation(updatedUserMatrix);
  }

  // Persist transformation state to sig
  updatedSig = {
    ...updatedSig,
    transformationPhase: updatedTransformationState.phase,
    transformationTargetStage: updatedTransformationState.targetStage,
    transformationSessionsInPhase: updatedTransformationState.sessionsInPhase,
    transformationKnotsResolved: updatedTransformationState.knotsResolved,
    transformationTotalKnots: updatedTransformationState.totalKnots,
  };

  // Track outcome
  const quality = estimateResponseQuality(response);
  const newOutcome: RecentEncounter = {
    outcome: 'completed',
    quality,
    mode: previousEncounter.executionMode === 'shadow' ? 'shadow' : 'capacity',
    shadowIntegrated: previousEncounter.executionMode === 'shadow' && quality > 0.5,
  };
  const recentOutcomes = [newOutcome, ...sessionState.recentOutcomes].slice(0, 20);

  // WIRE-BRIDGE: Curriculum → Developmental signal flow.
  // When a curriculum encounter completes, update the Significator's knowledge
  // state so the developmental system can observe curriculum progress.
  if (previousEncounter.curriculumConceptId && updatedSig.knowledge) {
    const conceptId = previousEncounter.curriculumConceptId;
    const existing = updatedSig.knowledge.conceptStates.get(conceptId);

    // Determine depth achieved based on response quality and current depth.
    // WIRE-BRIDGE: Stages NEVER demote — depth only increases or stays the same.
    const currentDepthIdx = existing ? ALL_DEPTH_LEVELS.indexOf(existing.depthLevel) : 0;
    const qualityBoost = quality > 0.7 ? 1 : 0;
    const newDepthIdx = Math.min(ALL_DEPTH_LEVELS.length - 1, currentDepthIdx + qualityBoost);
    const newDepth = ALL_DEPTH_LEVELS[newDepthIdx]!;
    // Depth advances only when quality is high enough AND new depth > current
    const effectiveDepth = (newDepthIdx > currentDepthIdx && quality > 0.5) ? newDepth : (existing?.depthLevel ?? 'absent');

    // Update concept state
    const updatedConceptStates = new Map(updatedSig.knowledge.conceptStates);
    updatedConceptStates.set(conceptId, {
      depthLevel: effectiveDepth,
      retention: Math.min(1, (existing?.retention ?? 0) + quality * 0.3),
      lastReviewedAt: Date.now(),
      reviewCount: (existing?.reviewCount ?? 0) + 1,
      depthHistory: [
        ...(existing?.depthHistory ?? []),
        { level: effectiveDepth, timestamp: Date.now(), evidence: `Curriculum encounter: ${previousEncounter.curriculumAction ?? 'study'}` },
      ],
      misconceptionFlags: existing?.misconceptionFlags ?? [],
    });

    updatedSig = {
      ...updatedSig,
      knowledge: {
        ...updatedSig.knowledge,
        conceptStates: updatedConceptStates as ReadonlyMap<string, ConceptState>,
      },
    };
  }

  return {
    sig: updatedSig,
    world: updatedWorld,
    sessionState: {
      ...sessionState,
      recentOutcomes,
      encountersSinceRefresh: sessionState.encountersSinceRefresh + 1,
      transformationState: updatedTransformationState,
      userMatrixModel: updatedUserMatrix,
    },
  };
}

export interface SessionState {
  readonly strategy: SessionStrategy;
  readonly cci: CCIScore;
  readonly recentOutcomes: RecentEncounter[];
  readonly encountersSinceRefresh: number;
  readonly transformationState: TransformationState;
  /** GAP-D2-4: UserMatrixModel — explicit model of the user's Matrix/Potentiator. */
  readonly userMatrixModel: UserMatrixModel;
  /** Wave 3.4: Explicit session start time for accurate shadow-counting. */
  readonly sessionStartMs?: number;
  /**
   * Curriculum expansion: number of curriculum encounters consumed this session.
   * Used to enforce the curriculum slot budget from AutoModeStrategy.
   */
  readonly curriculumEncountersThisSession?: number;
  /** Training expansion: number of brain-game beats consumed this session. */
  readonly trainingEncountersThisSession?: number;
  /** P1-B8 (Architecture Audit Phase B): per-line transformation readiness signals. */
  readonly perLineTransformations?: readonly PerLineTransformationSignal[];
}

/**
 * Initialize a new session: compute CCI, generate strategy.
 * Called once at session start before the first encounter.
 *
 * P0-7: Reconstructs transformationState from the Significator's persisted
 * fields instead of always returning a fresh 'idle' state. This preserves
 * cross-session transformation continuity — if the player was mid-crucible
 * when they last exited, they resume mid-crucible instead of resetting to idle.
 */
export function startSession(sig: Significator, session: SessionContext): SessionState {
  // Curriculum expansion: seed the registry with curriculum data if not already done.
  // This is idempotent — safe to call on every session start.
  seedCurriculumRegistry();

  // Phase 5B: Migrate knowledge state to current schema version if needed.
  let migratedSig = sig;
  if (sig.knowledge && migrateKnowledgeState(sig.knowledge) !== sig.knowledge) {
    migratedSig = { ...sig, knowledge: migrateKnowledgeState(sig.knowledge) };
  }

  // P1-QW2 (Architecture Audit Phase A): Auto-seed KnowledgeState on first
  // session. Without this, get_knowledge_snapshot returns { empty: true }
  // for fresh saves and the 48-holon educational stream is invisible to
  // the player. Idempotent: only seeds if knowledge is missing OR has zero
  // conceptStates.
  if (!migratedSig.knowledge || migratedSig.knowledge.conceptStates.size === 0) {
    // Use the first recent line as a heuristic for dominant line; fall back
    // to the current stage's line, and finally to 'Cognitive'.
    const dominantLine = (session.recentLines[0] as any) ?? 'Cognitive';
    const seeded = seedInitialKnowledge(dominantLine, migratedSig.currentStage);
    migratedSig = { ...migratedSig, knowledge: seeded };
  }

  // P1-B6 (Architecture Audit Phase B): re-calibration trigger. If the
  // player has been away > 30 days, lower the starting session strategy
  // by 5% so the first encounter back isn't too aggressive. Pure
  // heuristic — measured by sig's `lastSessionAt` (added as a Sig
  // extension) or, falling back, the highest theta.lastEncounter ts.
  let lastSessionTs = migratedSig.lastSessionAt;
  // FIX-B6 (Audit): fallback to highest theta timestamp when lastSessionAt is missing.
  // The audit doc says to use theta as fallback but the code never did — so
  // recalibration never triggered for saves that predate lastSessionAt.
  if (!lastSessionTs) {
    const thetaTimes = Object.values(migratedSig.theta.lastEncounter).filter((t): t is number => typeof t === 'number' && t > 0);
    if (thetaTimes.length > 0) lastSessionTs = Math.max(...thetaTimes);
  }
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  if (lastSessionTs && Date.now() - lastSessionTs > THIRTY_DAYS_MS) {
    // Soft cap: lower targetSessionLength by 1 if > 3, so the player
    // can ease back in.
    const target = session.targetSessionLength;
    if (target > 3) {
      session = { ...session, targetSessionLength: Math.max(3, target - 1) };
    }
  }

  const snapshot = toSnapshot(migratedSig);
  // P1-15: Pass sig so CCI delegates G_z/P_z to GreaterCycleEngine.
  const cci = computeCCI(snapshot, migratedSig);
  let strategy = generateSessionStrategy(cci, session, null, migratedSig.knowledge);

  // WIRE-BRIDGE: If the previous session's curriculum probe flagged shouldIntervene,
  // force the consolidation theme for this session. The flag is persisted to sig
  // as `curriculumIntervention` by endSession() and OVERWRITTEN at each session
  // end (set on intervene, cleared otherwise), so it is a one-shot signal by
  // construction. (P5-FIX: typed Significator field that survives save/load —
  // previously an `as any` field stripped by the validator AND sticky forever,
  // because the old consume-in-local-copy never reached the persisted state.)
  const interventionReason = migratedSig.curriculumIntervention;
  if (interventionReason) {
    strategy = {
      ...strategy,
      theme: 'consolidation',
      themeRationale: `Curriculum intervention: ${interventionReason}`,
    };
  }
  // P1-B8 (Architecture Audit Phase B): per-line transformation readiness.
  // Supplements the single global currentStage with cluster-based signals so the
  // scheduler and Veil descriptors can surface line-specific movement.
  let perLineTransformations: readonly PerLineTransformationSignal[] = [];
  try {
    // Detect readiness for the next stage above currentStage.
    const nextStageOrd = stageOrdinal(migratedSig.currentStage) + 1;
    const allStages = ['Infrared','Magenta','Red','Amber','Orange','Green','Teal','Turquoise'] as const;
    const nextStage = allStages[nextStageOrd] as Stage | undefined;
    if (nextStage) perLineTransformations = detectPerLineTransformation(migratedSig as any, nextStage);
  } catch { /* best-effort */ }
  return {
    strategy,
    cci,
    recentOutcomes: [],
    encountersSinceRefresh: 0,
    // P0-7: reconstruct from sig instead of always createInitialTransformationState()
    transformationState: reconstructTransformationState(sig),
    userMatrixModel: createInitialUserMatrixModel(),
    sessionStartMs: Date.now(),
    curriculumEncountersThisSession: 0,
    trainingEncountersThisSession: 0,
    perLineTransformations,
  };
}

/**
 * Enhanced tick that uses session strategy for weight biasing.
 * Call this instead of tick() when auto-mode is active.
 *
 * Integrates CCI computation and mid-session adjustment logic:
 * 1. Applies weight bias from session strategy to priority computation
 * 2. Tracks encounter outcomes
 * 3. Every reEvaluationInterval encounters: recomputes CCI and evaluates adjustment
 */
export function tickWithStrategy(
  sig: Significator,
  world: WorldState,
  session: SessionContext,
  sessionState: SessionState,
  response: PlayerResponse | null,
  previousEncounter: ScheduledEncounter | null,
  now: number,
): { tickResult: TickResult; sessionState: SessionState } {
  // 1. Process response from previous encounter (if available)
  let updatedSig = sig;
  let updatedWorld = world;
  // GAP-D2-4: carry forward the userMatrixModel; update it after response processing
  let updatedUserMatrix = sessionState.userMatrixModel;

  if (response && previousEncounter) {
    const record = processOutcome(previousEncounter, response, now);
    const result = applyConsequences(sig, world, record, previousEncounter);
    updatedSig = result.sig;
    updatedWorld = result.world;

    // GAP-D2-4: Update the UserMatrixModel with the inferred Matrix/Potentiator
    // state from the player's response. This is the core of the user-modelling:
    // the game infers what the user's Matrix/Potentiator looks like based on
    // how they responded, then uses that model to select the next catalyst.
    const inference = inferFromResponse(
      response.narrativeSummary ?? '',
      response.driveDirectionality,
      response.shadowSurfaced,
    );
    const line = previousEncounter.targetLines[0] ?? 'Cognitive';
    const stage = previousEncounter.stage;
    updatedUserMatrix = updateUserMatrix(updatedUserMatrix, line, stage, inference, now);
    // Promote phase based on polarity crystallization
    updatedUserMatrix = promotePhase(updatedUserMatrix, updatedSig.polarity.master.mode);
  }

  // 2. Increment encounter counter
  const encountersSinceRefresh = sessionState.encountersSinceRefresh + 1;

  // 3. Apply weight bias from strategy to default weights
  const biasedWeights: PriorityWeights = applyWeightBias(
    DEFAULT_WEIGHTS,
    sessionState.strategy.weightBias,
  );

  // 4. Check for bleed-through
  const bleedThrough = detectBleedThrough(updatedSig.theta.lastEncounter, now);

  // GAP-D2-3: Wire scheduleThresholdMode — when the transformation state
  // machine is in unravelling/crucible/emergence phase, use the threshold-mode
  // weights (which bias toward shadow-activation + transformation-readiness)
  // instead of the normal session-strategy weights. This activates the 3-phase
  // Crucible that was previously dead code.
  const tsPhase = sessionState.transformationState.phase;
  let scheduled: ScheduledEncounter[];
  if (tsPhase === 'unravelling' || tsPhase === 'crucible' || tsPhase === 'emergence') {
    scheduled = scheduleThresholdMode(updatedSig, updatedWorld, session, tsPhase, now);
  } else {
    // GAP-D2-4: pass userMatrixModel to scheduleNext so the scheduler can use
    // the user's Matrix/Potentiator model for phase-dependent targeting.
    // WIRE-1: Use scheduleNextWithHolonicReturn to inject Holonic Return encounters
    // when the cadence triggers (every 3 encounters at current stage).
    scheduled = scheduleNextWithHolonicReturn(updatedSig, updatedWorld, session, now, 5, biasedWeights, bleedThrough, undefined, sessionState.userMatrixModel, sessionState.encountersSinceRefresh);
  }
  // 5. Curriculum expansion: generate curriculum encounters and interleave them.
  let curriculumEncountersConsumed = sessionState.curriculumEncountersThisSession ?? 0;
  const curriculumEncounters = generateCurriculumEncounters(
    updatedSig, sessionState, session, now,
  );
  // Interleave: take up to 1 curriculum encounter per scheduling tick,
  // placed after the first developmental encounter if slots remain.
  if (curriculumEncounters.length > 0 && scheduled.length > 0) {
    const curriculumEnc = curriculumEncounters[0]!;
    scheduled = [scheduled[0]!, curriculumEnc, ...scheduled.slice(1)].slice(0, 5);
    curriculumEncountersConsumed++;
  }

  // 5b. Training beats: weave brain-game interludes into narrative sessions.
  // Fires at most 1 per tick, respecting the session's trainingSlots budget.
  // WIRE-7 (training-beat parity): the weave DECISION lives in the exported
  // computeTrainingWeave() policy so the WebUI binding weaves identically —
  // one definition of the cadence, consumed by both surfaces.
  let trainingEncountersConsumed = sessionState.trainingEncountersThisSession ?? 0;
  const weave = computeTrainingWeave(
    sessionState.strategy.trainingSlots ?? 0,
    trainingEncountersConsumed,
    encountersSinceRefresh,
    tsPhase,
  );
  if (weave.shouldWeave && weave.paradigmId !== null && scheduled.length > 0) {
    const beat = makeTrainingBeat(weave.paradigmId, updatedSig, now);
    // Make the training beat the next encounter (primary), with narrative offers behind it.
    scheduled = [beat, ...scheduled].slice(0, 5);
    trainingEncountersConsumed = weave.nextConsumed;
  }

  const encounter = scheduled[0] ?? null;

  // 6. Check transformation threshold and advance state machine.
  //
  // P0-1 BUGFIX: When tickWithStrategy is called with response=null (scheduling-only
  // mode — the CLI's standard pattern), we must NOT advance the transformation state
  // machine here. The caller will invoke applyResponseOnly() which advances it.
  // Advancing here too caused the state machine to advance 2× per encounter,
  // making the 3-phase Crucible complete in half the intended sessions.
  // The transformation SIGNAL (detectThreshold) is still computed so the caller
  // can observe readiness, but the STATE is not mutated when response=null.
  const transformation = detectThreshold(updatedSig);
  let updatedTransformationState = sessionState.transformationState;

  if (response && previousEncounter) {
    // Only advance the state machine when we have an actual encounter response.
    updatedTransformationState = advanceTransformation(sessionState.transformationState, updatedSig);

    // If transformation completes, commit it and update Significator
    const commitResult = commitTransformation(updatedTransformationState);
    if (commitResult.targetStage) {
      // Hook 3: onTransformation — fire before mutating sig, using pre-commit stage as `from`.
      const fromStage = updatedSig.currentStage;
      maybeFireHook('onTransformation', (h) => h.onTransformation(fromStage, commitResult.targetStage!, updatedSig));
      // Advance the Significator to the new stage
      updatedSig = {
        ...updatedSig,
        currentStage: commitResult.targetStage,
        transformations: [
          ...updatedSig.transformations,
          {
            fromStage: updatedSig.currentStage,
            toStage: commitResult.targetStage,
            triggeredAt: Date.now(),
            triggeredAtSession: updatedSig.totalSessions,
            catalystCount: updatedSig.totalEncounters,
          },
        ],
      };
      updatedTransformationState = commitResult.newState;
      // GAP-V3-23: Reset the UserMatrixModel phase to 'unmapped' — the new stage
      // brings new territory to probe.
      updatedUserMatrix = resetPhaseAfterTransformation(updatedUserMatrix);
    }

    // GAP-V3-25: If a shadow encounter was passed, record knot resolution
    // (prior code only did this in Phaser EncounterScene, not in headless GameLoop)
    if (previousEncounter.executionMode === 'shadow') {
      const shadowPassed = Object.values(response.driveDirectionality).every(d => d === 'HealthyBalanced');
      if (shadowPassed) {
        updatedTransformationState = recordKnotResolution(updatedTransformationState);
      }
    }
  }

  // GAP-F-4: Persist transformation state back to Significator so it survives
  // across sessions. Prior code only stored it in SessionState (which is
  // ephemeral). Now we write phase + counters + targetStage to sig fields.
  updatedSig = {
    ...updatedSig,
    transformationPhase: updatedTransformationState.phase,
    transformationTargetStage: updatedTransformationState.targetStage,
    transformationSessionsInPhase: updatedTransformationState.sessionsInPhase,
    transformationKnotsResolved: updatedTransformationState.knotsResolved,
    transformationTotalKnots: updatedTransformationState.totalKnots,
  };

  // 7. Track outcome in recentOutcomes.
  //
  // P0-2 BUGFIX: When response=null (scheduling-only mode), do NOT push a phantom
  // 'avoided' outcome. The scheduling tick is not a player behavior event — it's
  // just the scheduler computing what to offer next. Pushing 'avoided' here
  // polluted recentOutcomes with [completed, avoided, completed, avoided, ...],
  // causing evaluateMidSessionAdjustment to see ~50% avoidance when the player
  // never avoided anything, incorrectly triggering theme switches to 'consolidation'.
  // Now: only push an outcome when there's an actual response.
  let recentOutcomes = sessionState.recentOutcomes;
  if (response) {
    const quality = estimateResponseQuality(response);
    const newOutcome: RecentEncounter = {
      outcome: 'completed',
      quality,
      mode: previousEncounter?.executionMode === 'shadow' ? 'shadow' : 'capacity',
      shadowIntegrated: previousEncounter?.executionMode === 'shadow' && quality > 0.5,
    };
    recentOutcomes = [newOutcome, ...sessionState.recentOutcomes].slice(0, 20);
  }

  // 8. Mid-session refresh: every reEvaluationInterval encounters
  const interval = sessionState.strategy.adjustmentThresholds.reEvaluationInterval;
  let updatedStrategy = sessionState.strategy;
  let updatedCCI = sessionState.cci;

  if (encountersSinceRefresh % interval === 0) {
    // Recompute CCI from current Significator state
    const freshSnapshot = toSnapshot(updatedSig);
    // P1-15: Pass sig so CCI delegates G_z/P_z to GreaterCycleEngine.
    updatedCCI = computeCCI(freshSnapshot, updatedSig);

    // Evaluate whether mid-session adjustment is needed
    const adjustment = evaluateMidSessionAdjustment(
      updatedStrategy,
      session,
      recentOutcomes,
    );

    if (adjustment !== null) {
      // Apply the adjustment to strategy
      updatedStrategy = applyAdjustmentToStrategy(updatedStrategy, adjustment);
    }
  }

  // 9. Safety override: if player is in distress, force consolidation theme
  // WIRE-BRIDGE: Also consume curriculum probe's shouldIntervene — when the
  // meta-cognitive probe detects critical progression issues or rubric calibration
  // errors, force consolidation to give the system time to heal.
  const snapshot = toSnapshot(updatedSig);
  if (checkSafetyOverride(snapshot)) {
    updatedStrategy = {
      ...updatedStrategy,
      theme: 'consolidation',
      themeRationale: 'Safety override: high fixation + unresolved shadows',
    };
  }
  // NOTE: shouldIntervene from MetaCognitiveProbe is consumed at session end
  // (in endSession), not per-tick. The per-tick probe was removed because
  // probeCurriculum lints all holons + calibrates all rubrics — too expensive
  // for every encounter tick. The session-end probe result triggers intervention
  // via the CLI's renderPostSessionSummary and the next session's strategy.

  // 10. Post-transformation bias: apply weight adjustments after recent transformation
  const lastTransformation = updatedSig.transformations[updatedSig.transformations.length - 1];
  if (lastTransformation) {
    const sessionsSinceTransform = updatedSig.totalSessions;
    const postBias = computePostTransformationBias(sessionsSinceTransform);
    if (postBias) {
      updatedStrategy = {
        ...updatedStrategy,
        weightBias: {
          thetaUrgency: updatedStrategy.weightBias.thetaUrgency + (postBias.thetaUrgency ?? 0),
          shadowActivation: updatedStrategy.weightBias.shadowActivation + (postBias.shadowActivation ?? 0),
          polarityAlignment: updatedStrategy.weightBias.polarityAlignment + (postBias.polarityAlignment ?? 0),
          transformationReadiness: updatedStrategy.weightBias.transformationReadiness + (postBias.transformationReadiness ?? 0),
          driveCorrection: updatedStrategy.weightBias.driveCorrection + (postBias.driveCorrection ?? 0),
          narrativeCoherence: updatedStrategy.weightBias.narrativeCoherence + (postBias.narrativeCoherence ?? 0),
          sessionFit: updatedStrategy.weightBias.sessionFit + (postBias.sessionFit ?? 0),
        },
      };
    }
  }

  const tickResult: TickResult = {
    encounter,
    encounters: scheduled,
    sig: updatedSig,
    world: updatedWorld,
    transformation,
    bleedThrough,
  };

  // P1-B8: refresh per-line transformation signals as altitudes shift.
  let perLineTransformations = sessionState.perLineTransformations ?? [];
  try {
    const nextOrd = stageOrdinal(updatedSig.currentStage) + 1;
    const allStages = ['Infrared','Magenta','Red','Amber','Orange','Green','Teal','Turquoise'] as const;
    const nextStage = allStages[nextOrd] as Stage | undefined;
    if (nextStage) perLineTransformations = detectPerLineTransformation(updatedSig as any, nextStage);
  } catch { /* best-effort */ }
  const newSessionState: SessionState = {
    strategy: updatedStrategy,
    cci: updatedCCI,
    recentOutcomes,
    encountersSinceRefresh,
    transformationState: updatedTransformationState,
    userMatrixModel: updatedUserMatrix,
    sessionStartMs: sessionState.sessionStartMs,
    curriculumEncountersThisSession: curriculumEncountersConsumed,
    trainingEncountersThisSession: trainingEncountersConsumed,
    perLineTransformations,
  };

  return { tickResult, sessionState: newSessionState };
}

function pickTrainingParadigm(offset: number): string {
  const all = allParadigms();
  if (all.length === 0) return 'stroop';
  return all[offset % all.length]!.id;
}

function makeTrainingBeat(paradigmId: string, sig: Significator, now: number): ScheduledEncounter {
  const paradigm = allParadigms().find((p) => p.id === paradigmId);
  const lines = (paradigm?.domains ?? ['Cognitive']) as Line[];
  const stage = sig.currentStage;
  return {
    id: `training:${paradigmId}:${now}:${Math.floor(Math.random() * 10000)}`,
    moduleRef: `Training:${paradigmId}`,
    modality: 'Deterministic',
    targetLines: lines,
    stage,
    holonSource: 'training-dojo',
    shadowTarget: null,
    polarityMode: 'Exploring',
    difficulty: 0.5,
    sessionPosition: 'peak',
    priority: 0.95,
    driveTarget: null,
    executionMode: 'capacity',
    isTrainingBeat: true,
    trainingParadigmId: paradigmId,
  };
}

/**
 * WIRE-7 (training-beat parity): the training-weave decision policy, shared by
 * the core loop (CLI/harness) and the WebUI binding (gameEngine.ts).
 *
 * Given the session's trainingSlots budget, how many beats are already consumed,
 * how many encounters have run since the last schedule refresh, and the current
 * transformation phase, decides whether the NEXT encounter should be a training
 * beat — and which paradigm it runs. Fires at most 1 per scheduling pass:
 * - never during a threshold phase (unravelling/crucible/emergence);
 * - never before TRAINING_WEAVE_FIRST_AT encounters;
 * - then at most 1 per TRAINING_WEAVE_EVERY encounters until the budget is spent.
 * Cadence constants: InfraConfig.TRAINING_WEAVE_FIRST_AT / TRAINING_WEAVE_EVERY.
 */
export function computeTrainingWeave(
  trainingSlots: number,
  trainingEncountersConsumed: number,
  encountersSinceRefresh: number,
  tsPhase: string,
): { shouldWeave: boolean; paradigmId: string | null; nextConsumed: number } {
  if (trainingSlots <= trainingEncountersConsumed) {
    return { shouldWeave: false, paradigmId: null, nextConsumed: trainingEncountersConsumed };
  }
  const isThresholdPhase = tsPhase === 'unravelling' || tsPhase === 'crucible' || tsPhase === 'emergence';
  if (isThresholdPhase) {
    return { shouldWeave: false, paradigmId: null, nextConsumed: trainingEncountersConsumed };
  }
  if (encountersSinceRefresh < InfraConfig.TRAINING_WEAVE_FIRST_AT) {
    return { shouldWeave: false, paradigmId: null, nextConsumed: trainingEncountersConsumed };
  }
  if (!(trainingEncountersConsumed === 0 || encountersSinceRefresh % InfraConfig.TRAINING_WEAVE_EVERY === 0)) {
    return { shouldWeave: false, paradigmId: null, nextConsumed: trainingEncountersConsumed };
  }
  return {
    shouldWeave: true,
    paradigmId: pickTrainingParadigm(trainingEncountersConsumed),
    nextConsumed: trainingEncountersConsumed + 1,
  };
}

/**
 * Apply a mid-session adjustment to the current strategy.
 * Returns a new strategy with the adjustment incorporated.
 */
function applyAdjustmentToStrategy(
  strategy: SessionStrategy,
  adjustment: SessionStrategyAdjustment,
): SessionStrategy {
  let updated = { ...strategy };

  if (adjustment.newPeakIntensity) {
    updated = {
      ...updated,
      arc: {
        ...updated.arc,
        peak: {
          ...updated.arc.peak,
          intensityRange: adjustment.newPeakIntensity,
        },
      },
    };
  }

  if (adjustment.newTheme) {
    updated = { ...updated, theme: adjustment.newTheme };
  }

  if (adjustment.newWeightBias) {
    updated = { ...updated, weightBias: adjustment.newWeightBias };
  }

  return updated;
}

/**
 * Estimate encounter quality from the richness of the player response.
 * Quality reflects engagement depth: diverse drive signals, shadow surfacing,
 * and narrative richness indicate higher engagement.
 */
function estimateResponseQuality(response: PlayerResponse): number {
  let quality = 0.5; // baseline for any completed encounter

  // Diverse drive directionality boosts quality
  const driveValues = Object.values(response.driveDirectionality);
  const uniqueDrives = new Set(driveValues).size;
  if (uniqueDrives >= 3) quality += 0.15;
  else if (uniqueDrives >= 2) quality += 0.08;

  // Shadow surfacing indicates deep engagement
  if (response.shadowSurfaced !== null) quality += 0.15;

  // Shadow resolution indicates integration
  if (response.shadowResolvedId !== null) quality += 0.1;

  // P5-FIX (Full-Development Audit 2026-09-15): engagement depth is scored by
  // WORD count with a saturating ceiling, not raw character length. The old
  // `length > 100` heuristic rewarded verbose-but-empty answers over
  // terse-but-considered ones. Bonus tiers: ≥40 words = full 0.10, ≥15 = 0.07,
  // ≥6 = 0.03, below that no bonus. The maximum possible bonus is unchanged
  // (0.10) so downstream quality thresholds (>0.5, >0.7) keep their semantics.
  const words = response.narrativeSummary.trim().split(/\s+/).filter(Boolean).length;
  if (words >= 40) quality += 0.1;
  else if (words >= 15) quality += 0.07;
  else if (words >= 6) quality += 0.03;

  return Math.min(1.0, quality);
}

// ---------------------------------------------------------------------------
// Knowledge decay + forgetting curve persistence (shared by sync/async paths)
// ---------------------------------------------------------------------------

/**
 * Apply retention decay and persist forgetting curves at session end.
 * Shared helper used by both endSession (sync) and endSessionAsync (async)
 * to avoid code duplication. The curve's lastRetrievedAt is set to `now`
 * (session end time) because retention is already decayed to that point.
 * This prevents double-decay when computeRetention runs at next session start.
 */
function persistKnowledgeDecay(
  sig: Significator,
  now: number,
): Significator {
  const knowledge = sig.knowledge;
  if (!knowledge || knowledge.conceptStates.size === 0) return sig;

  const decayedConcepts = new Map<string, ConceptState>();
  for (const [key, concept] of knowledge.conceptStates) {
    const elapsed = now - concept.lastReviewedAt;
    const decayedRetention = elapsed > 0
      ? Math.max(0, Math.min(1, concept.retention * Math.pow(2, -elapsed / DEFAULT_FORGETTING_PARAMS.initialHalfLifeMs)))
      : concept.retention;
    decayedConcepts.set(key, { ...concept, retention: decayedRetention });
  }

  // Phase 5A: Persist forgetting curves — lastRetrievedAt = now (session end)
  // to prevent double-decay across sessions.
  const curves = new Map<string, ForgettingCurve>(
    [...(knowledge.forgettingCurves ?? new Map())],
  );
  for (const [key, concept] of decayedConcepts) {
    const existing = curves.get(key);
    if (existing) {
      curves.set(key, {
        ...existing,
        retention: concept.retention,
        lastRetrievedAt: now,
      });
    } else if (concept.reviewCount > 0) {
      curves.set(key, {
        conceptId: key,
        firstLearnedAt: concept.lastReviewedAt,
        lastRetrievedAt: now,
        retention: concept.retention,
        retrievalCount: concept.reviewCount,
        halfLifeMs: DEFAULT_FORGETTING_PARAMS.initialHalfLifeMs,
      });
    }
  }

  return {
    ...sig,
    knowledge: {
      ...knowledge,
      conceptStates: decayedConcepts as ReadonlyMap<string, ConceptState>,
      forgettingCurves: curves as ReadonlyMap<string, ForgettingCurve>,
    },
  };
}

// ---------------------------------------------------------------------------
// Curriculum encounter scheduling
// ---------------------------------------------------------------------------

/**
 * Convert a CurriculumCandidate into a ScheduledEncounter.
 * This bridges the curriculum system (pure knowledge study) into the
 * encounter scheduling pipeline (developmental assessment).
 */
function curriculumCandidateToEncounter(
  candidate: CurriculumCandidate,
  studyTheme: StudyTheme,
  sessionPosition: 'warmup' | 'peak' | 'cooldown',
  now: number,
): ScheduledEncounter {
  // Map study theme to modality
  const themeModality: Record<StudyTheme, string> = {
    review_decay: 'LanguageReflective',
    depth_push: 'ScenarioChoice',
    new_material: 'LanguageReflective',
    cross_domain: 'ScenarioChoice',
    misconception_repair: 'LanguageReflective',
    integration_sprint: 'ImmersiveRPG',
  };
  // Look up the holon in the registry for devMapping (line, stage).
  const registry = getCurriculumRegistry();
  const holon = registry.get(candidate.conceptId);
  const primaryLine = (holon?.devMapping.primaryLine ?? 'Cognitive') as Line;
  const stageMin = (holon?.devMapping.stageRange.min ?? 'Red') as Stage;
  return {
    id: `curriculum:${candidate.conceptId}:${now}`,
    moduleRef: `curriculum:${candidate.conceptId}`,
    modality: (themeModality[studyTheme] ?? 'LanguageReflective') as Modality,
    targetLines: [primaryLine],
    stage: stageMin,
    holonSource: candidate.conceptId,
    shadowTarget: null,
    polarityMode: 'Exploring',
    difficulty: 0.5,
    sessionPosition,
    priority: candidate.priority,
    driveTarget: null,
    executionMode: 'capacity',
    curriculumConceptId: candidate.conceptId,
    curriculumAction: candidate.action,
  };
}

/**
 * Generate curriculum encounters for the current session.
 * Returns curriculum encounters interleaved with developmental encounters,
 * respecting the session's curriculum slot budget.
 */
export function generateCurriculumEncounters(
  sig: Significator,
  sessionState: SessionState,
  session: SessionContext,
  now: number,
): readonly ScheduledEncounter[] {
  const kh = sessionState.cci.knowledgeHealth;
  if (!kh || (kh.conceptCoverage === 0 && kh.averageDepth === 0)) return [];

  const studyTheme = sessionState.strategy.studyTheme;
  const maxSlots = sessionState.strategy.curriculumSlots ?? 0;
  const consumed = sessionState.curriculumEncountersThisSession ?? 0;
  const remaining = Math.max(0, maxSlots - consumed);
  if (remaining <= 0 || !studyTheme) return [];

  const registry = getCurriculumRegistry();
  const candidates = [...generateCurriculumCandidates(
    sig.knowledge,
    studyTheme,
    remaining,
    registry,
  )];

  // WIRE-BRIDGE: Developmental → Curriculum signal flow.
  // Detect developmental needs and add curriculum recommendations that
  // address them (theta decay, drive imbalance, shadow surfacing).
  if (sig.knowledge && sig.knowledge.conceptStates.size > 0 && remaining > candidates.length) {
    const developmentalNeeds = detectDevelopmentalNeeds(sig);
    const knowledge = sig.knowledge;
    const concepts = new Map<string, { id: string; primaryLine: string; depthRange: { min: any; max: any } }>();
    for (const holon of registry.getAll()) {
      concepts.set(holon.id, {
        id: holon.id,
        primaryLine: holon.devMapping.primaryLine,
        depthRange: holon.depthMeta.targetDepthRange,
      });
    }
    const curves = knowledge.forgettingCurves ?? new Map();

    for (const need of developmentalNeeds) {
      if (candidates.length >= remaining) break;
      const recommendation = bridgeDevelopmentalToCurriculum(
        need, knowledge, concepts, curves as any, now,
      );
      if (recommendation && !candidates.some(c => c.conceptId === recommendation.conceptId)) {
        candidates.push(recommendation);
      }
    }
  }

  if (candidates.length === 0) return [];

  // Convert to ScheduledEncounters
  const progress = session.encountersSoFar / Math.max(1, session.targetSessionLength);
  const position: 'warmup' | 'peak' | 'cooldown' =
    progress < 0.2 ? 'warmup' : progress > 0.8 ? 'cooldown' : 'peak';

  return candidates.map(c => curriculumCandidateToEncounter(c, studyTheme, position, now));
}

/**
 * WIRE-BRIDGE: Detect developmental needs that could be addressed by curriculum content.
 * Scans the Significator for theta decay, drive imbalance, and shadow surfacing,
 * then converts each to a DevelopmentalNeed for bridgeDevelopmentalToCurriculum.
 * Implementation moved to core/curriculum/DevelopmentalNeedsDetector.ts so the
 * unified profile tools can use it without importing GameLoop. Re-exported here
 * for backward compatibility with any internal callers.
 */
export { detectDevelopmentalNeeds } from './curriculum/DevelopmentalNeedsDetector.js';

/**
 * Execute a module headlessly given pre-collected trials.
 * Bridges the gap between encounter scheduling and consequence processing.
 * In headless/test mode, trials are provided directly.
 * In game mode, the AssessmentScene collects trials interactively.
 */
export function executeModule(
  module: StageAssessment,
  trials: readonly TrialResult[],
  mode: ModuleExecutionMode,
): AssessmentResult | ShadowAssessmentResult {
  return runModeAwareAssessment(module, trials, mode);
}

/**
 * End a session: apply theta-decay to all unvisited modules,
 * persist final state, and return session summary.
 *
 * P1-14: Now advances macro-event lifecycle (onset → active → resolution)
 * via advanceMacroEvent(). Prior to P1-14, the lifecycle functions were
 * exported but never called — macroEventsAdvanced was hardcoded to 0.
 *
 * @param world Optional WorldState — when provided, macro-event states are
 *              advanced and the updated world is returned. When omitted,
 *              macro-event advancement is skipped (backward compat).
 */
export function endSession(
  sig: Significator,
  sessionState: SessionState,
  now: number,
  world?: WorldState,
): { sig: Significator; world?: WorldState; summary: { encountersCompleted: number; shadowsSurfaced: number; shadowsResolved: number; userMatrixSummary?: ReturnType<typeof summarizeUserMatrix>; macroEventsAdvanced?: number; curriculumProbe?: import('./curriculum/MetaCognitiveProbe.js').MetaCognitiveProbeResult }; harvestCheck?: { harvestable: boolean; direction: 'STO' | 'STS' | null; reason: string } | null } {
  const encountersCompleted = sessionState.recentOutcomes.filter(o => o.outcome === 'completed').length;
  const sessionStartMs = sessionState.sessionStartMs ?? now;
  const shadowsSurfaced = sig.shadows.entries.filter(e => e.surfacedAt >= sessionStartMs).length;
  const shadowsResolved = sig.shadows.entries.filter(e => e.resolvedAt !== null && e.resolvedAt >= sessionStartMs).length;

  // Wave 3.5: Summarize UserMatrixModel for telemetry
  const userMatrixSummary = summarizeUserMatrix(sessionState.userMatrixModel);

  // P1-14: Advance macro-event lifecycle at session end.
  // Prior to P1-14, advanceMacroEvent/recordMacroChoice/resolveMacroEvent were
  // exported but NEVER called from runtime — macroEventsAdvanced was hardcoded 0.
  // Now we advance each active macro event's state by one session. Events that
  // reach 'resolution' phase are resolved (PESTLE tension reset for their dimension).
  let macroEventsAdvanced = 0;
  let updatedWorld = world;
  if (world && world.activeMacroEvents.length > 0) {
    // P0-FIX: advanceMacroEvent/resolveMacroEvent are now statically imported.
    const existingStates = world.macroEventStates ?? [];
    const newStates: { eventId: string; state: MacroEventState }[] = [];
    const resolvedEvents: string[] = [];

    for (const event of world.activeMacroEvents) {
      const existing = existingStates.find(s => s.eventId === event.id);
      // SHAPE-FIX: the fallback state must carry the event itself (mirrors the
      // endSessionAsync path). The previous object literal omitted `event`, so
      // a first-session event resolved via resolveMacroEvent would spread an
      // undefined event and reset tension under an `undefined` key.
      const currentState: MacroEventState = existing?.state ?? { event, phase: 'onset', sessionsInPhase: 0, playerChoices: [], encountersSinceStart: 0 };
      const advanced = advanceMacroEvent(currentState);
      newStates.push({ eventId: event.id, state: advanced });
      macroEventsAdvanced++;

      if (advanced.phase === 'resolution') {
        resolvedEvents.push(event.id);
      }
    }

    // Resolve events that reached resolution phase — reset their PESTLE dimension
    let newPestle = { ...world.pestleTension };
    const remainingEvents = world.activeMacroEvents.filter(e => !resolvedEvents.includes(e.id));
    for (const eventId of resolvedEvents) {
      const event = world.activeMacroEvents.find(e => e.id === eventId);
      if (event) {
        const result = resolveMacroEvent(
          newStates.find(s => s.eventId === eventId)!.state,
          newPestle,
        );
        newPestle = result.tension;
      }
    }

    updatedWorld = {
      ...world,
      pestleTension: newPestle,
      activeMacroEvents: remainingEvents,
      macroEventStates: newStates.filter(s => !resolvedEvents.includes(s.eventId)),
    };
  }

  // P2-1 (UX-R3): Only count a session if at least one encounter completed.
  // Previously every endSession() call incremented totalSessions, including
  // failed runs where every encounter crashed — so a user who ran 6 commands
  // that all failed would see 'totalSessions: 6' in their save file, which
  // was misleading. Now only sessions with real activity count.
  const updatedSig: Significator = {
    ...sig,
    totalSessions: encountersCompleted > 0 ? sig.totalSessions + 1 : sig.totalSessions,
  };

  // P2-Critical: Wire checkHarvest into runtime. Per foundations/19 §9, at
  // Turquoise stage, check if the player is harvestable. If not, enter Samsara
  // mode (the player continues in a post-Turquoise loop receiving increasingly
  // intense catalysts to force crystallization). The harvest check uses the
  // STO 51% / STS 95% thresholds per foundations/19 §5.
  let harvestResult: { harvestable: boolean; direction: 'STO' | 'STS' | null; reason: string } | null = null;
  if (updatedSig.currentStage === 'Turquoise') {
    // P0-FIX: checkHarvest is now statically imported — the previous
    // require()-inside-try silently swallowed "require is not defined" and the
    // harvest check ALWAYS returned null at Turquoise stage. No try/catch is needed
    // for the import; validateSignificator guarantees the polarity/altitude
    // shapes consumed below.
    // WIRE-5: Use crystallization (direction commitment) not coherence
    // (consistency). Per foundations/19 §5, the harvest requires
    // mean(direction_strength) ≥ 0.51 (STO) / 0.95 (STS). Direction strength =
    // how committed the polarity is, measured by crystallization progress.
    const directionStrengths = Object.keys(updatedSig.polarity.lineProfiles ?? {}).length > 0
      ? Object.keys(updatedSig.polarity.lineProfiles ?? {}).map(line => {
          const cellKey = `${line}:${updatedSig.currentStage}`;
          const cell = updatedSig.polarity.cells[cellKey];
          return cell?.crystallization ?? 0;
        })
      : [updatedSig.polarity.master.crystallizationProgress ?? 0];
    const violetRay = updatedSig.rayProfile.Violet ?? 0;
    const altitudeFloor = Math.min(...Object.values(updatedSig.altitudes).map(s => stageOrdinal(s)));
    harvestResult = checkHarvest(updatedSig.polarity.master, directionStrengths, altitudeFloor, violetRay);
  }

  // Phase 4C: Update learning profile with analytics data so the scheduler
  // can use modality effectiveness data in future sessions.
  let finalSig = updatedSig;
  const knowledge = updatedSig.knowledge;
  if (knowledge && knowledge.conceptStates.size > 0) {
    // Phase 4C: Update learning profile with analytics data.
    let updatedProfile = knowledge.learningProfile;
    if (knowledge.studyHistory.length >= 3) {
      const analytics = computeLearningAnalytics({ ...knowledge, conceptStates: knowledge.conceptStates as ReadonlyMap<string, ConceptState> });
      const modalityEff: Record<string, number> = {};
      for (const me of analytics.modalityEffectiveness) {
        modalityEff[me.modality] = me.effectiveness;
      }
      updatedProfile = {
        ...updatedProfile,
        modalityEffectiveness: modalityEff,
        learningVelocity: analytics.velocity.conceptsPerSession,
        lastAnalyticsAt: now,
      };
      finalSig = {
        ...finalSig,
        knowledge: finalSig.knowledge ? { ...finalSig.knowledge, learningProfile: updatedProfile } : undefined,
      };
    }
  }
  // Apply retention decay + persist forgetting curves via shared helper.
  finalSig = persistKnowledgeDecay(finalSig, now);

  // META-PROBE: Run meta-cognitive curriculum probe at session end.
  // This gives the agentic loop a comprehensive health check of the curriculum
  // system — progression, rubric calibration, and content linting.
  let curriculumProbe: import('./curriculum/MetaCognitiveProbe.js').MetaCognitiveProbeResult | undefined;
  if (finalSig.knowledge && finalSig.knowledge.conceptStates.size > 0) {
    const probeRegistry = getCurriculumRegistry();
    if (probeRegistry.count() > 0) {
      curriculumProbe = probeCurriculum(finalSig.knowledge, probeRegistry, now);
    }
  }

  // WIRE-BRIDGE: shouldIntervene → next session strategy.
  // When the probe detects critical progression issues or rubric calibration
  // errors, flag the significator so the next session's strategy generation
  // forces consolidation theme. This is the session-end counterpart to the
  // safety override in tickWithStrategy.
  //
  // P5-FIX (audit): lifecycle moved here. The old startSession consumed the
  // flag only in a local copy it never returned, so an intervention once set
  // stuck FOREVER — every subsequent session was forced to consolidation.
  // Now: endSession OVERWRITES the flag each session end (set when the probe
  // says intervene, explicitly cleared when it doesn't), and startSession only
  // READS it (a one-shot signal by construction).
  finalSig = {
    ...finalSig,
    curriculumIntervention: curriculumProbe?.shouldIntervene
      ? (curriculumProbe.interventionReason ?? 'health below threshold')
      : undefined,
    // P5-FIX: stamp the session-end time so the >30-day re-calibration in
    // startSession works on the primary signal, not just the theta fallback.
    lastSessionAt: now,
  };

  // Hook 4: onSessionEnd — fire fire-and-forget for the sync path.
  // Callers that need to await the hook (e.g. CLI --agent before stopTDGBridge)
  // should use endSessionAsync() instead, which awaits the hook before returning.
  maybeFireHook('onSessionEnd', (h) => h.onSessionEnd(finalSig));

  return {
    sig: finalSig,
    ...(updatedWorld !== world ? { world: updatedWorld } : {}),
    summary: { encountersCompleted, shadowsSurfaced, shadowsResolved, userMatrixSummary, macroEventsAdvanced, curriculumProbe },
    // P2-Critical: harvest check result (null unless player is at Turquoise stage)
    harvestCheck: harvestResult,
  };
}

/**
 * P0-3 BUGFIX: Async session end that AWAITS the TDG onSessionEnd hook before
 * returning. The sync endSession() fires the hook fire-and-forget, which is
 * fine when TDG is not running. But when TDG IS running and the caller is
 * about to call stopTDGBridge() (which kills the TDG-Rust process synchronously),
 * the fire-and-forget hook can be interrupted mid-call — losing the
 * tdg_consolidate + tdg_save_mind_state operations.
 *
 * Callers that use TDG (--agent flag) should call endSessionAsync() and await
 * it BEFORE calling stopTDGBridge(). Callers that don't use TDG can use the
 * sync endSession() — the hook no-ops immediately when TDG is inactive.
 *
 * Returns the same shape as endSession().
 */
export async function endSessionAsync(
  sig: Significator,
  sessionState: SessionState,
  now: number,
  world?: WorldState,
): Promise<{ sig: Significator; world?: WorldState; summary: { encountersCompleted: number; shadowsSurfaced: number; shadowsResolved: number; userMatrixSummary?: ReturnType<typeof summarizeUserMatrix>; macroEventsAdvanced?: number } }> {
  const encountersCompleted = sessionState.recentOutcomes.filter(o => o.outcome === 'completed').length;
  const sessionStartMs = sessionState.sessionStartMs ?? now;
  const shadowsSurfaced = sig.shadows.entries.filter(e => e.surfacedAt >= sessionStartMs).length;
  const shadowsResolved = sig.shadows.entries.filter(e => e.resolvedAt !== null && e.resolvedAt >= sessionStartMs).length;

  const userMatrixSummary = summarizeUserMatrix(sessionState.userMatrixModel);

  // P1-14: Advance macro-event lifecycle (same logic as sync endSession above).
  let macroEventsAdvanced = 0;
  let updatedWorld = world;
  if (world && world.activeMacroEvents.length > 0) {
    // P0-FIX: statically imported (was require() — dead in ESM).
    const existingStates = world.macroEventStates ?? [];
    const newStates: { eventId: string; state: import('./engines/MacroCatalystEngine.js').MacroEventState }[] = [];
    const resolvedEvents: string[] = [];

    for (const event of world.activeMacroEvents) {
      const existing = existingStates.find(s => s.eventId === event.id);
      const currentState = existing?.state ?? { event, phase: 'onset' as const, sessionsInPhase: 0, playerChoices: [], encountersSinceStart: 0 };
      const advanced = advanceMacroEvent(currentState);
      newStates.push({ eventId: event.id, state: advanced });
      macroEventsAdvanced++;

      if (advanced.phase === 'resolution') {
        resolvedEvents.push(event.id);
      }
    }

    let newPestle = { ...world.pestleTension };
    const remainingEvents = world.activeMacroEvents.filter(e => !resolvedEvents.includes(e.id));
    for (const eventId of resolvedEvents) {
      const stateEntry = newStates.find(s => s.eventId === eventId);
      if (stateEntry) {
        const result = resolveMacroEvent(stateEntry.state, newPestle);
        newPestle = result.tension;
      }
    }

    updatedWorld = {
      ...world,
      pestleTension: newPestle,
      activeMacroEvents: remainingEvents,
      macroEventStates: newStates.filter(s => !resolvedEvents.includes(s.eventId)),
    };
  }

  // P2-1 (UX-R3): Only count a session if at least one encounter completed
  // (matches endSession's behavior). See comment in endSession().
  const updatedSig: Significator = {
    ...sig,
    totalSessions: encountersCompleted > 0 ? sig.totalSessions + 1 : sig.totalSessions,
  };

  // ponytail: TDG-Rust onSessionEnd hook removed. The async endSessionAsync
  // now has the same behavior as the sync endSession — no TDG hook to await.

  // Phase 5A parity: Apply retention decay + persist forgetting curves
  // via shared helper (same logic as sync endSession path).
  const decayedSig = persistKnowledgeDecay(updatedSig, now);
  // P5-FIX: stamp session-end time (parity with sync endSession) so the
  // >30-day re-calibration in startSession has a reliable primary signal.
  const finalSig: Significator = { ...decayedSig, lastSessionAt: now };

  return {
    sig: finalSig,
    ...(updatedWorld !== world ? { world: updatedWorld } : {}),
    summary: { encountersCompleted, shadowsSurfaced, shadowsResolved, userMatrixSummary, macroEventsAdvanced },
  };
}

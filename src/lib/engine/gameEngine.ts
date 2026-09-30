/**
 * gameEngine — Svelte-side gameplay service.
 *
 * Wraps the pure-TypeScript core/ engines (GameLoop, EncounterScheduler,
 * AgenticOrchestrator, ConsequenceEngine) into a Svelte-friendly service
 * with reactive state. This is the Svelte replacement for Phaser's
 * main.ts + scene registry.
 *
 * Responsibilities:
 *   1. Boot: load Significator + WorldState from SaveRepository
 *   2. Session: start a session (compute CCI, strategy)
 *   3. Schedule: produce the next 3 encounters
 *   4. Run: execute an encounter via AgenticOrchestrator
 *   5. Apply: persist the result back to Significator + WorldState
 *   6. Persist: save to localStorage + cloud sync
 *
 * The UI calls these methods; the engine emits state changes via gameStore.
 */

import { writable, get } from 'svelte/store';
import type { Significator } from '$core/domain/Significator.js';
import type { WorldState } from '$core/engines/CandidateGeneration.js';
import type { ScheduledEncounter } from '$core/domain/EncounterSpecNew.js';
import type { SessionContext } from '$core/engines/PriorityComputation.js';
import type { SessionState } from '$core/GameLoop.js';
import type { OrchestratorResult, AgenticUIHandler } from '$core/assessments/AgenticOrchestrator.js';
import { startSession, applyResponseOnly, computeTrainingWeave, generateCurriculumEncounters, endSession } from '$core/GameLoop.js';
import { detectBleedThrough } from '$core/engines/ThetaDecay.js';
import { scheduleNextWithHolonicReturn } from '$core/engines/EncounterScheduler.js';
import { createModuleTaskTypesProvider } from '$core/engines/CandidateGeneration.js';
import { DEFAULT_WEIGHTS, applyWeightBias } from '$core/engines/PriorityComputation.js';
import { sessionControlStore } from '$lib/stores/sessionControlStore.js';
import { AgenticOrchestrator } from '$core/assessments/AgenticOrchestrator.js';
import { currentVowBook } from '$lib/stores/vowStore.js';
import { detectDevelopmentalNeeds } from '$core/curriculum/DevelopmentalNeedsDetector.js';
import { queryLLM } from '$infra/llm/LLMClient.js';
// RuntimeLoop (43 §5.5 + 45 §5/§6 + 22 §7.5): the orchestration services — one per browser
// session, held in the engine store so the feed and worker profiles accumulate across encounters.
import { createOrchestrationServices, type OrchestrationServices } from '$core/personalization/sessionRuntime.js';
import { bootModuleRegistry } from '$core/assessments/bootModules.js';
import { getParadigm } from '$core/braingame/registry.js';
import type { Line } from '$core/domain/Line.js';
import { SaveRepository } from '$infra/persistence/SaveRepository.js';
import { createKeyValueStore } from '$infra/persistence/createKeyValueStore.js';
import { createFirstBootWorld, mergeAuthoredHolons } from './worldBootstrap.js';
import { setSignificator, setLastEncounter } from '$lib/stores/gameStore.js';
import { debouncedSync, flushSync } from '$lib/stores/cloudSyncStore.js';
import { recordEvent } from '$lib/stores/telemetryStore.js';

// ─── Engine state ────────────────────────────────────────────────────

interface EngineState {
  bootstrapped: boolean;
  significator: Significator | null;
  world: WorldState | null;
  session: SessionState | null;
  encounters: ScheduledEncounter[];
  activeEncounter: ScheduledEncounter | null;
  activeOrchestrator: AgenticOrchestrator | null;
  lastResult: OrchestratorResult | null;
  error: string | null;
  /** ponytail: D — set when a stage transformation fires, so the UI can show an overlay. */
  transformationSignal: { fromStage: string; toStage: string; readiness: number } | null;
}

export const engineStore = writable<EngineState>({
  bootstrapped: false,
  significator: null,
  world: null,
  session: null,
  encounters: [],
  activeEncounter: null,
  activeOrchestrator: null,
  lastResult: null,
  error: null,
  transformationSignal: null,
});

let saveRepo: SaveRepository | null = null;
let moduleTaskTypesProvider: ((moduleRef: string) => Set<string> | undefined) | null = null;
let moduleRegistry: ReturnType<typeof bootModuleRegistry> | null = null;

// ─── Boot ────────────────────────────────────────────────────────────

/**
 * Boot the engine: load Significator + WorldState from persistence.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function bootEngine(): Promise<void> {
  if (get(engineStore).bootstrapped) return;

  try {
    saveRepo = new SaveRepository(createKeyValueStore());

    // Boot module registry (64 assessment modules)
    moduleRegistry = bootModuleRegistry();
    moduleTaskTypesProvider = createModuleTaskTypesProvider(
      (line: string, stage: string) => moduleRegistry?.get(line as never, stage as never),
    );

    // Load Significator + WorldState
    const sig = await saveRepo.loadProfile();
    let world = await saveRepo.loadWorldState();

    // A first-time player has a profile but NO world: `world:v1` is only ever written after a
    // session ENDS, so it cannot exist before the first one starts. The result was that
    // calibration completed, /play loaded, and `startGameSession` refused with "no Significator or
    // WorldState" — the game was unstartable on a clean profile, while the CLI (which seeds a world
    // in `loadHolons`) could play. Seed it here from the same authored corpora the CLI seeds.
    if (sig && !world) {
      world = createFirstBootWorld();
      await saveRepo.saveWorldState(world);
    }
    if (world) {
      // Returning players: fold in holons authored since their save, and persist the merge once.
      const merged = { ...world, holons: mergeAuthoredHolons(world.holons) };
      if (merged.holons.length !== world.holons.length) {
        world = merged;
        await saveRepo.saveWorldState(world);
      }
    }

    if (sig) {
      setSignificator(sig);
    }

    engineStore.update((s) => ({
      ...s,
      bootstrapped: true,
      significator: sig,
      world,
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    engineStore.update((s) => ({ ...s, error: `Boot failed: ${msg}` }));
    console.error('[gameEngine] boot failed:', err);
  }
}

// ─── Session ─────────────────────────────────────────────────────────

/**
 * Start a new session. Computes CCI, generates strategy.
 *
 * Phase 16 d8 (2026-09-26) — the session CONTROLS now reach the kernel. `sessionControlStore` was
 * a write-only surface for its whole life: the settings page wrote `forceLine`/`forceStage`/
 * `forceModality`/`encounterCount` to localStorage and NO `SessionContext` builder read them, so
 * four player-facing controls changed nothing. This is the live-surface-wiring class `AGENTS.md` §4.2
 * item 2 defines, and it was listed there as empty.
 *
 * The force fields ride both scheduling calls, and the KERNEL decides their effect: an incidental
 * settings pin (both axes set, no `focusedCell`) keeps every injection seam — threshold mode, Holonic
 * Return, curriculum interleave, training weave — because a player picking a line and a stage
 * expressed a preference, not an instrument run. Only a deliberate pin suppresses them, and the
 * WebUI has no producer for that mark. A player who sets only `forceLine` gets the same
 * line-preference behaviour the CLI's `--line` already has.
 */
export function startGameSession(): void {
  const { significator, world } = get(engineStore);
  if (!significator || !world) {
    engineStore.update((s) => ({ ...s, error: 'Cannot start session: no Significator or WorldState' }));
    return;
  }

  const control = get(sessionControlStore);
  const sessionContext: SessionContext = {
    encountersSoFar: 0,
    sessionDurationMs: 0,
    targetSessionLength: control.encounterCount,
    recentLines: [],
    forceLine: control.forceLine ?? undefined,
    forceStage: control.forceStage ?? undefined,
    forceModality: control.forceModality ?? undefined,
  };

  const session = startSession(significator, sessionContext);
  engineStore.update((s) => ({ ...s, session }));
  scheduleEncounters();
}

/**
 * Schedule the next 3 encounters.
 */
export function scheduleEncounters(): void {
  const { significator, world, session } = get(engineStore);
  if (!significator || !world || !session) return;

  const now = Date.now();
  // The force fields must ride BOTH scheduling calls, not just `startGameSession`: a session's
  // encounters are scheduled in batches of 3, and the first batch is scheduled from inside
  // `startGameSession`. Pinning a cell that applied only to the first batch would let the second
  // batch drift off it — the exact class of half-wired surface this closes.
  const control = get(sessionControlStore);
  const forceFields = {
    forceLine: control.forceLine ?? undefined,
    forceStage: control.forceStage ?? undefined,
    forceModality: control.forceModality ?? undefined,
  };
  const sessionContext: SessionContext = {
    encountersSoFar: session.recentOutcomes.length,
    sessionDurationMs: now - (session.sessionStartMs ?? now),
    targetSessionLength: control.encounterCount,
    recentLines: [],
    ...forceFields,
  };
  let encounters = scheduleNextWithHolonicReturn(
    significator,
    world,
    sessionContext,
    now,
    3,
    // The STRATEGY's weight bias + bleed-through, exactly as the kernel loop computes them
    // (tickWithStrategy steps 3–4). Without these the browser scheduled unweighted while
    // every other surface scheduled with the session's strategy — the parity gap Track B
    // closes. The curriculum interleave (step 5) and the training weave (step 5b) are applied
    // below; threshold mode is the kernel-only Crucible path (see `isDeliberateInstrumentPin`).
    applyWeightBias(DEFAULT_WEIGHTS, session.strategy.weightBias),
    detectBleedThrough(significator.theta.lastEncounter, now),
    moduleTaskTypesProvider ?? undefined,
    session.userMatrixModel,
    session.encountersSinceRefresh,
  );

  // The curriculum interleave (kernel step 5): up to one curriculum beat per scheduling pass,
  // placed after the first developmental encounter when slots remain — the same interleave
  // tickWithStrategy performs, driven by the same pure generator. The counter rides the
  // session copy (SessionState is readonly by contract; the store is replaced wholesale).
  const curriculumEncounters = generateCurriculumEncounters(significator, session, sessionContext, now);
  if (curriculumEncounters.length > 0 && encounters.length > 0) {
    encounters = [encounters[0]!, curriculumEncounters[0]!, ...encounters.slice(1)].slice(0, 3);
    engineStore.update((s) => ({
      ...s,
      session: s.session
        ? { ...s.session, curriculumEncountersThisSession: (s.session.curriculumEncountersThisSession ?? 0) + 1 }
        : s.session,
    }));
  }

  // WIRE-7 (training-beat parity): apply the SAME weave policy as the kernel
  // loop (computeTrainingWeave) after every scheduling pass — exactly where
  // tickWithStrategy applies it for the CLI/harness. Skipped when the queue
  // already carries an unplayed beat (decline/completion re-schedules).
  //
  // Phase 16 d9 — NO pin guard here, on purpose. The settings store has no `focusedCell` producer,
  // so a pin expression in the browser evaluates a constant: d8's guard was exactly that — a dead
  // `isDeliberateInstrumentPin` call kept "so the surfaces cannot drift" — and it was deleted rather
  // than left as dead code that looked load-bearing. The browser is not an instrument; the rule lives
  // in the kernel seams, which the context built above reaches with its force fields but never with
  // a deliberate-pin mark. If the WebUI ever gains an instrument mode, add the producer and the guard
  // together, and relax G44's no-pin-logic assertion in the same commit.
  //
  // SCOPE, stated plainly because the parity claim is otherwise overstated: the WebUI calls
  // `scheduleNextWithHolonicReturn` directly rather than `tickWithStrategy`, so it does not drive
  // the orchestrated loop. Track B closed the three seams that were silently missing — the strategy
  // weight bias, the bleed-through and the curriculum interleave, all now the same pure functions
  // the kernel uses. What remains browser-dark is THRESHOLD MODE: the kernel's stage-transition
  // branch assembles the whole foreground council with the Therapist first and advances the
  // state machine, which only `processOutcome` (the browser has it) and the tick's response
  // handling own. It stays CLI/campaign-only by design, not by omission — see the plan's Track B
  // entry for the narrowing this records.
  if (!encounters.some((e) => e.isTrainingBeat)) {
    const weave = computeTrainingWeave(
      session.strategy.trainingSlots ?? 0,
      session.trainingEncountersThisSession ?? 0,
      session.encountersSinceRefresh,
      session.transformationState.phase,
    );
    if (weave.shouldWeave && weave.paradigmId && encounters.length > 0) {
      encounters = [makeTrainingBeatEncounter(weave.paradigmId, significator.currentStage, now), ...encounters].slice(0, 5);
    }
  }

  engineStore.update((s) => ({ ...s, encounters }));
}

/** Build a training-beat encounter (mirror of GameLoop.makeTrainingBeat). */
function makeTrainingBeatEncounter(paradigmId: string, stage: Significator['currentStage'], now: number): ScheduledEncounter {
  const paradigm = getParadigm(paradigmId);
  const lines = (paradigm?.domains ?? ['Cognitive']) as readonly Line[];
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

// ─── Encounter execution ─────────────────────────────────────────────

/**
 * Run an encounter via the AgenticOrchestrator. The UI handler is called
 * whenever the orchestrator needs to ask the user a question.
 *
 * ponytail: B9 fix — pass an AbortSignal so the caller can cancel cleanly.
 *
 * Returns the orchestrator result (updated sig, world, scores, feedback).
 */
export async function runEncounter(
  encounter: ScheduledEncounter,
  uiHandler: AgenticUIHandler,
  options: { noLlm?: boolean; forceShadow?: string; signal?: AbortSignal } = {},
): Promise<OrchestratorResult> {
  const { significator, world } = get(engineStore);
  if (!significator || !world) {
    throw new Error('Cannot run encounter: no Significator or WorldState');
  }

  setLastEncounter(encounter.id);
  engineStore.update((s) => ({ ...s, activeEncounter: encounter, error: null }));
  recordEvent('session_started', { encounterId: encounter.id, moduleRef: encounter.moduleRef });

  try {
    // RuntimeLoop: one services record per browser session — created lazily on the first
    // encounter, carried in the store, seeded from the world's holons.
    const storeNow = get(engineStore);
    let orchestration = (storeNow as { orchestration?: OrchestrationServices }).orchestration;
    if (!orchestration) {
      orchestration = createOrchestrationServices(world.holons);
      engineStore.update((s) => ({ ...s, orchestration }));
    }

    const orchestrator = new AgenticOrchestrator({
      encounter,
      significator,
      world,
      history: [],
      conceptIndex: null,
      uiHandler,
      noLlm: options.noLlm ?? false,
      forceShadow: options.forceShadow,
      orchestration,
      // Phase 17 D-39 (39 §4.2/§4.4 P1): the practice toolset goes live on the browser
      // session loop — propose_objective / process_checkin through the same pure functions
      // /journal calls; depth via the §4.4 pipeline (queryLLM routes through the BFF in the
      // browser; absent/unreachable config ⇒ the heuristic stands — offline is law).
      practice: {
        book: currentVowBook(),
        sig: significator,
        world,
        objectiveContext: () => ({
          needs: detectDevelopmentalNeeds(significator).map((n) => ({ label: `${n.type}:${n.line}`, urgency: n.urgency })),
          activeShadows: significator.shadows.entries
            .filter((e) => e.resolvedAt === null)
            .map((e) => ({ line: e.line, quadrant: e.quadrant, severity: e.severity })),
        }),
        query: (prompt) => queryLLM(prompt, 'Reply with only the integer depth 1-5.'),
      },
    });

    engineStore.update((s) => ({ ...s, activeOrchestrator: orchestrator }));
    const result = await orchestrator.run(options.signal);

    // Apply the result to sig + world + session
    await applyEncounterResult(encounter, result);

    // ponytail: C.11 — emit telemetry events (parity with CLI emitEvent).
    recordEvent('encounter_completed', {
      encounterId: encounter.id,
      moduleRef: encounter.moduleRef,
      passed: result.finalResult.passed,
    });
    if (result.consequenceRecord.shadowSurfaced) {
      recordEvent('shadow_surfaced', {
        encounterId: encounter.id,
        quadrant: result.consequenceRecord.shadowSurfaced,
      });
    }
    if (result.consequenceRecord.shadowResolved) {
      recordEvent('shadow_resolved', {
        shadowId: result.consequenceRecord.shadowResolved,
      });
    }

    engineStore.update((s) => ({
      ...s,
      activeOrchestrator: null,
      activeEncounter: null,
      lastResult: result,
    }));

    return result;
  } catch (err) {
    // ponytail: B9 fix — AbortError is a clean exit, not an error.
    if (err instanceof DOMException && err.name === 'AbortError') {
      engineStore.update((s) => ({
        ...s,
        activeOrchestrator: null,
        activeEncounter: null,
        // Don't set error — abort is expected, not a failure.
      }));
      throw err; // re-throw so the caller knows it was aborted
    }
    const msg = err instanceof Error ? err.message : String(err);
    engineStore.update((s) => ({
      ...s,
      activeOrchestrator: null,
      activeEncounter: null,
      error: `Encounter failed: ${msg}`,
    }));
    throw err;
  }
}

// ─── Training beats ─────────────────────────────────────────────────

/**
 * Complete a training beat (WIRE-7). Parity with the CLI's training-beat
 * branch: a beat NEVER advances narrative polarity/shadow — it records no
 * outcome and leaves significator/world untouched. It DOES consume its slot:
 * the session's training + refresh counters advance and the offer queue is
 * rescheduled (dropping the completed beat), mirroring the kernel tick.
 * Telemetry (trials/index/calibration) is persisted by the TrainingBeatRunner
 * through trainingBridge before this is called.
 */
export async function completeTrainingBeat(encounter: ScheduledEncounter): Promise<void> {
  recordEvent('training_beat_completed', {
    encounterId: encounter.id,
    paradigmId: encounter.trainingParadigmId ?? null,
  });
  engineStore.update((s) => ({
    ...s,
    activeEncounter: null,
    session: s.session
      ? {
          ...s.session,
          trainingEncountersThisSession: (s.session.trainingEncountersThisSession ?? 0) + 1,
          encountersSinceRefresh: s.session.encountersSinceRefresh + 1,
        }
      : s.session,
  }));
  scheduleEncounters();
}

/**
 * Apply an encounter result: update sig, world, session; persist.
 *
 * ponytail: B1+B2 fix — use the real PlayerResponse from the orchestrator
 * (result.playerResponse) instead of hardcoding 'Sovereign'/'Homeostatic'/'Ambivalent'.
 * The orchestrator's finalizeEncounter builds this from the LLM's driveSignals
 * + polarityDirection, so it's the honest evaluation. This matches the CLI path,
 * which uses the orchestrator's output directly.
 *
 * Note: the orchestrator ALREADY called applyConsequences internally (in
 * finalizeEncounter), so result.updatedSig/updatedWorld are the post-consequence
 * state. We still call applyResponseOnly here to advance the UserMatrixModel +
 * transformation state (the orchestrator doesn't do that part).
 */
async function applyEncounterResult(
  encounter: ScheduledEncounter,
  result: OrchestratorResult,
): Promise<void> {
  const state = get(engineStore);
  if (!state.significator || !state.world || !state.session) return;

  // ponytail: B1+B2 fix — use the real playerResponse from the orchestrator.
  // Fallback to consequenceRecord.polarityTrace if playerResponse is missing
  // (older result shape). Never hardcode.
  const playerResponse = result.playerResponse ?? {
    encounterId: encounter.id,
    narrativeSummary: result.narrativeSummary,
    driveDirectionality: result.consequenceRecord.polarityTrace.driveDirectionality,
    shadowSurfaced: result.consequenceRecord.shadowSurfaced ?? null,
    shadowResolvedId: result.consequenceRecord.shadowResolved ?? null,
    energeticDirection: result.consequenceRecord.polarityTrace.energeticDirection,
    stageOrientation: result.consequenceRecord.polarityTrace.stageOrientation,
    sourceOfNourishment: result.consequenceRecord.polarityTrace.sourceOfNourishment,
  };

  // The orchestrator ALREADY applied consequences, so `result.updatedSig` / `result.updatedWorld`
  // are the post-consequence state. This used to pass `state.significator` — the value from BEFORE
  // the encounter — and then persisted that, so every counter the encounter computed was
  // overwritten by the pre-encounter value: totalEncounters stayed 0 forever, a reload lost the
  // session, and nothing reported an error. `applyResponseOnly` below ADDS to what it is given, so
  // it must be given the state the consequences already updated, not a stale copy of the start.
  const { sig: newSig, world: newWorld, sessionState: newSession } = applyResponseOnly(
    result.updatedSig,
    result.updatedWorld,
    state.session,
    playerResponse,
    encounter,
    Date.now(),
  );

  if (saveRepo) {
    await saveRepo.saveProfile(newSig);
    await saveRepo.saveWorldState(newWorld);
  }

  setSignificator(newSig);
  debouncedSync(newSig);

  // ponytail: D — detect stage transformation (parity with CLI transformation_triggered).
  const fromStage = state.significator.currentStage;
  const toStage = newSig.currentStage;
  let transformationSignal: EngineState['transformationSignal'] = null;
  if (toStage !== fromStage) {
    transformationSignal = { fromStage, toStage, readiness: 1 };
    recordEvent('transformation_triggered', { fromStage, toStage });
  }

  engineStore.update((s) => ({
    ...s,
    significator: newSig,
    world: newWorld,
    session: newSession,
    transformationSignal: transformationSignal ?? s.transformationSignal,
  }));

  scheduleEncounters();
}

/** Clear the transformation signal (called by the UI after the overlay plays). */
export function clearTransformationSignal(): void {
  engineStore.update((s) => ({ ...s, transformationSignal: null }));
}

// ─── Decline encounter ──────────────────────────────────────────────

export async function declineEncounter(encounter: ScheduledEncounter): Promise<void> {
  // ponytail: C.11 — emit encounter_declined (parity with CLI emitEvent).
  recordEvent('encounter_declined', {
    encounterId: encounter.id,
    moduleRef: encounter.moduleRef,
  });
  engineStore.update((s) => ({
    ...s,
    encounters: s.encounters.filter((e) => e.id !== encounter.id),
  }));
  const { encounters } = get(engineStore);
  if (encounters.length < 3) {
    scheduleEncounters();
  }
}

// ─── Session end ─────────────────────────────────────────────────────

/**
 * Close the session and apply everything that only happens at a boundary.
 *
 * THIS WAS MISSING ENTIRELY FROM THE BROWSER, and the damage was wider than a counter. `endSession`
 * is where the kernel does the work that CANNOT happen mid-encounter: theta-decay on neglected
 * stages, the Choice evaluation at the apex (19 §9.6 — a STATE, with the harvest EVENT only when
 * eligibility and closure both hold), and the harvest check. `/play` had exactly two exits
 * (`backToMenu` and the Menu link) and both called `goto('/')`, so a browser player got none of it:
 * a session never ended, `totalSessions` stayed 0 forever, neglected stages never decayed, and the
 * Choice was never evaluated. The CLI reached all of it; the browser was not the same product.
 *
 * The `encountersCompleted > 0` guard is the KERNEL's (GameLoop P2-1), and it is left doing its job —
 * a run where every encounter crashed must not count as a session. This function does not decide
 * that; it hands the accumulated state over and takes the kernel's answer.
 *
 * Idempotent by construction: a second call finds `session` null and returns, so a double-tap on
 * "Menu" cannot double-apply theta decay.
 */
export async function endGameSession(): Promise<void> {
  const { significator, world, session } = get(engineStore);
  if (!significator || !world || !session) return;

  const closed = endSession(significator, session, Date.now(), world);

  // `endSession` types `world` as optional (the CLI's DQ path calls it without one), so the returned
  // world is `WorldState | undefined` even though we passed one. Falling back to the world we handed
  // in keeps the store's non-optional contract instead of widening it for a caller that cannot
  // produce undefined.
  const closedWorld = closed.world ?? world;

  engineStore.update((s) => ({
    ...s,
    significator: closed.sig,
    world: closedWorld,
    session: null, // the boundary has been crossed; a second call must not re-enter
  }));

  if (saveRepo) {
    await saveRepo.saveProfile(closed.sig);
    await saveRepo.saveWorldState(closedWorld);
  }
}

// ─── Flush on unload ────────────────────────────────────────────────

export async function flushEngine(): Promise<void> {
  const { significator } = get(engineStore);
  if (significator) {
    await flushSync(significator);
  }
}

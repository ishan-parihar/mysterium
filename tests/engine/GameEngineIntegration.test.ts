/**
 * gameEngine integration (W7-5/W7-6, plan Phase 6 G2 extension).
 *
 * Contract under test: the BROWSER engine layer — not just the kernel pieces —
 * boots through the REAL persistence seam (SaveRepository + createKeyValueStore
 * over localStorage), starts sessions, schedules with the shared weave policy,
 * and completes/declines encounters with kernel-parity session semantics:
 *   GE-1  Boot + start: real boot → persisted sig/world load → session with
 *         CCI/strategy and a non-empty offer queue.
 *   GE-2  Weave parity: scheduleEncounters() weaves a training beat exactly
 *         when computeTrainingWeave says to for the live session state.
 *   GE-3  Beat completion (W7-3/W7-2 on the live path): counters advance,
 *         the beat leaves the queue, and NO narrative consequence lands —
 *         Significator/WorldState byte-identical.
 *   GE-4  Decline: the encounter is removed and the queue re-schedules.
 *   GE-5  Persistence round-trip: post-session state survives a fresh boot.
 *   GE-6  An ANSWERED encounter persists its counters. `applyEncounterResult` used to persist the
 *         PRE-encounter significator, so `totalEncounters` stayed 0 forever and a reload lost the
 *         session — the save ran, with the wrong value, and reported no error.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { ensureLocalStorage } from '../helpers/localStorageMock.js';
import {
  engineStore,
  bootEngine,
  startGameSession,
  scheduleEncounters,
  completeTrainingBeat,
  declineEncounter,
  runEncounter,
  flushEngine,
} from '../../src/lib/engine/gameEngine.js';
import { computeTrainingWeave } from '../../src/core/GameLoop.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import { createInitialWorldState } from '../../src/core/engines/CandidateGeneration.js';
import { ALL_LINES, type Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';
import type { ScheduledEncounter } from '../../src/core/domain/EncounterSpecNew.js';
import type { Holon } from '../../src/core/world/Holon.js';
import { SaveRepository } from '../../src/infra/persistence/SaveRepository.js';
import { createKeyValueStore } from '../../src/infra/persistence/createKeyValueStore.js';

const altitudes: Record<Line, Stage> = ALL_LINES.reduce(
  (acc, l) => ({ ...acc, [l]: 'Red' }),
  {} as Record<Line, Stage>,
);

function freshSig() {
  return createSignificator('ge', altitudes, 'Red');
}

function freshWorld(): ReturnType<typeof createInitialWorldState> {
  const holons: Holon[] = ALL_LINES.map((line) => ({
    id: `h-${line}-Red`,
    name: `${line} Red contact`,
    kind: 'NPC',
    line,
    stage: 'Red',
    drives: { dominant: 'Agency', secondary: 'Eros', shadowQuadrant: null },
    polarity: 'Sovereign',
    narrativeRole: 'engine-integration',
    relationships: [],
    active: true,
  }));
  return createInitialWorldState(holons);
}

/** Persist a fresh profile + world, then boot the engine through the real seam. */
async function bootFresh(): Promise<SaveRepository> {
  const repo = new SaveRepository(createKeyValueStore());
  await repo.saveProfile(freshSig());
  await repo.saveWorldState(freshWorld());
  await bootEngine();
  const s = get(engineStore);
  if (!s.bootstrapped || !s.significator || !s.world || s.error) {
    throw new Error(`boot failed: bootstrapped=${s.bootstrapped} error=${s.error}`);
  }
  return repo;
}

/** Insert a training beat at the head of the live queue (mirrors the weave). */
function primeBeat(): ScheduledEncounter {
  const beat: ScheduledEncounter = {
    id: `training:stroop:prime:1`,
    moduleRef: `Training:stroop`,
    modality: 'Deterministic',
    targetLines: ['Cognitive'],
    stage: 'Red',
    holonSource: 'training-dojo',
    shadowTarget: null,
    polarityMode: 'Exploring',
    difficulty: 0.5,
    sessionPosition: 'peak',
    priority: 0.95,
    driveTarget: null,
    executionMode: 'capacity',
    isTrainingBeat: true,
    trainingParadigmId: 'stroop',
  };
  engineStore.update((s) => ({ ...s, encounters: [beat, ...s.encounters] }));
  return beat;
}

async function resetEngineStore(): Promise<void> {
  engineStore.set({
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
}

describe('gameEngine integration (browser binding over the real persistence seam)', () => {
  beforeEach(async () => {
    ensureLocalStorage();
    localStorage.clear();
    await resetEngineStore();
  });

  it('GE-1: boots headless through the real seam and starts a session', async () => {
    await bootFresh();
    startGameSession();
    const s = get(engineStore);
    expect(s.session).toBeTruthy();
    expect(s.session!.cci).toBeTruthy();
    expect(s.encounters.length).toBeGreaterThan(0);
    expect(s.error).toBeNull();
  });

  it('GE-2: scheduleEncounters weaves exactly when computeTrainingWeave says to', async () => {
    await bootFresh();
    startGameSession();
    const session = get(engineStore).session!;
    const weave = computeTrainingWeave(
      session.strategy.trainingSlots ?? 0,
      session.trainingEncountersThisSession ?? 0,
      session.encountersSinceRefresh,
      session.transformationState.phase,
    );
    scheduleEncounters();
    const has = get(engineStore).encounters.some((e) => e.isTrainingBeat);
    expect(has).toBe(weave.shouldWeave);
  });

  it('GE-3: completing a training beat consumes the slot and never writes a narrative consequence', async () => {
    await bootFresh();
    startGameSession();
    const beat = primeBeat();

    const before = get(engineStore);
    const sigBefore = JSON.stringify(before.significator);
    const worldBefore = JSON.stringify(before.world);
    const countersBefore = {
      t: before.session?.trainingEncountersThisSession ?? 0,
      r: before.session?.encountersSinceRefresh ?? 0,
    };

    await completeTrainingBeat(beat);

    const after = get(engineStore);
    // W7-2: counters advance.
    expect(after.session?.trainingEncountersThisSession).toBe(countersBefore.t + 1);
    expect(after.session?.encountersSinceRefresh).toBe(countersBefore.r + 1);
    // The completed beat left the queue (reschedule dropped it).
    expect(after.encounters.some((e) => e.id === beat.id)).toBe(false);
    // W7-3: no narrative consequence — sig/world byte-identical.
    expect(JSON.stringify(after.significator)).toBe(sigBefore);
    expect(JSON.stringify(after.world)).toBe(worldBefore);
  });

  it('GE-4: decline removes the offer and the queue refills non-empty', async () => {
    await bootFresh();
    startGameSession();
    const first = get(engineStore).encounters[0];
    expect(first).toBeTruthy();

    await declineEncounter(first!);
    const after = get(engineStore);
    // Queue semantics per the audited contract (PONYTAIL B8/B11, REALIGNED-PLAN):
    // the declined offer is removed, telemetry fires (browser-only no-op here),
    // and the offer list is refreshed — deterministic re-ranking may legitimately
    // re-offer the same module (there is no decline-memory by design), so the
    // honest invariants are: non-empty queue, consistent session, no error.
    expect(after.encounters.length).toBeGreaterThan(0);
    expect(after.session).toBeTruthy();
    expect(after.error).toBeNull();
  });

  it('GE-5: session state persists and survives a fresh boot', async () => {
    const repo = await bootFresh();
    startGameSession();
    const sigBefore = get(engineStore).significator!;
    startGameSession();
    const sigMid = get(engineStore).significator!;
    expect(JSON.stringify(sigMid)).toBe(JSON.stringify(sigBefore));

    // Reboot: engine re-loads the same profile from the KV store.
    await resetEngineStore();
    const s = get(engineStore);
    expect(s.bootstrapped).toBe(false);
    await bootEngine();
    const reloaded = get(engineStore);
    expect(reloaded.bootstrapped).toBe(true);
    expect(reloaded.significator).toBeTruthy();
    expect(JSON.stringify(reloaded.significator)).toBe(JSON.stringify(sigBefore));
    void repo;
  });

  it('GE-6: an answered encounter PERSISTS its counters, and they survive a fresh boot', async () => {
    // `applyEncounterResult` used to pass the PRE-encounter significator into applyResponseOnly and
    // then persist that. The orchestrator's post-consequence state was discarded, so every counter
    // an encounter computed was overwritten by the value from before it ran: totalEncounters stayed
    // 0 no matter how many encounters a player answered, and a reload lost the session. Nothing
    // errored — the save ran, with the wrong value. Found by driving the browser and reading the
    // stored JSON immediately after answering.
    await bootFresh();
    startGameSession();
    const encounter = get(engineStore).encounters[0];
    expect(encounter).toBeTruthy();

    const before = get(engineStore).significator!;
    expect(before.totalEncounters).toBe(0);

    // `runEncounter` drives the whole seam itself and calls applyEncounterResult internally, so the
    // handler just answers the prompts it is asked. Keyless, so no model is reached.
    const handler = {
      askUser: async () => ({ answers: [{ selectedLabels: ['I engage directly'] }] }),
    };
    await runEncounter(encounter!, handler, { noLlm: true });
    await flushEngine();

    const after = get(engineStore).significator!;
    expect(after.totalEncounters).toBe(1);
    expect(after.recentEncounters.length).toBe(1);

    // And it is on DISK, not only in memory.
    const repo = new SaveRepository(createKeyValueStore());
    const persisted = (await repo.loadProfile())!;
    expect(persisted.totalEncounters).toBe(1);

    // Reboot: the counter is still there.
    await resetEngineStore();
    await bootEngine();
    expect(get(engineStore).significator!.totalEncounters).toBe(1);
  });
});

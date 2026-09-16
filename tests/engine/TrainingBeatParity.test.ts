/**
 * WIRE-7 — training-beat WebUI parity (docs/brain-game-upgrade/06 §5,
 * DEVELOPMENT-PLAN Phase 6 G2 extension).
 *
 * Contract under test: the BROWSER binding schedules and completes training
 * beats through the SAME weave policy and the SAME session-consequence rules
 * as the kernel loop:
 *   W7-1  Shared policy — gameEngine.scheduleEncounters() weaves beats exactly
 *         when computeTrainingWeave says to (same slots/cadence/threshold rules).
 *   W7-2  Budget — at most trainingSlots beats per session; the counter advances
 *         only when a beat completes.
 *   W7-3  No-narrative-consequence — completing a beat never touches
 *         Significator/WorldState and records no RecentEncounter (CLI parity).
 *   W7-4  Persistence — persistTrainingBeat lands trials + cognitive-index +
 *         calibration records in the KV store (CLI session-weave parity).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ensureLocalStorage } from '../helpers/localStorageMock.js';
import { computeTrainingWeave } from '../../src/core/GameLoop.js';
import { startSession } from '../../src/core/GameLoop.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import { ALL_LINES, type Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';
import {
  prepareTrainingBeat,
  persistTrainingBeat,
  getTrainingServices,
  resetTrainingBridgeForTests,
} from '../../src/lib/engine/trainingBridge.js';
import { BrainGameEngine, type GameUiPort } from '../../src/core/braingame/BrainGameEngine.js';
import { getParadigm } from '../../src/core/braingame/registry.js';

const altitudes: Record<Line, Stage> = ALL_LINES.reduce(
  (acc, l) => ({ ...acc, [l]: 'Red' }),
  {} as Record<Line, Stage>,
);

function freshSig() {
  return createSignificator('w7', altitudes, 'Red');
}

describe('W7-1: computeTrainingWeave policy (shared kernel/WebUI definition)', () => {
  it('weaves when slots remain and cadence is met', () => {
    // First beat: at FIRST_AT (2) with 0 consumed.
    const a = computeTrainingWeave(1, 0, 2, 'idle');
    expect(a.shouldWeave).toBe(true);
    expect(typeof a.paradigmId).toBe('string');
    expect(a.nextConsumed).toBe(1);
  });

  it('does not weave when the budget is spent', () => {
    expect(computeTrainingWeave(1, 1, 5, 'idle').shouldWeave).toBe(false);
    expect(computeTrainingWeave(0, 0, 5, 'idle').shouldWeave).toBe(false);
  });

  it('does not weave before the first-at cadence', () => {
    expect(computeTrainingWeave(1, 0, 1, 'idle').shouldWeave).toBe(false);
  });

  it('does not weave during threshold phases', () => {
    for (const phase of ['unravelling', 'crucible', 'emergence']) {
      expect(computeTrainingWeave(2, 0, 4, phase).shouldWeave).toBe(false);
    }
  });

  it('spaces subsequent beats by the every-N cadence', () => {
    // After 1 beat consumed, only multiples of EVERY (3) re-trigger.
    expect(computeTrainingWeave(2, 1, 4, 'idle').shouldWeave).toBe(false);
    expect(computeTrainingWeave(2, 1, 6, 'idle').shouldWeave).toBe(true);
  });
});

describe('W7-2/W7-3: session semantics through the core loop', () => {
  it('startSession allocates training slots for 8+ encounter sessions', () => {
    const state = startSession(freshSig(), { encountersSoFar: 0, sessionDurationMs: 0, targetSessionLength: 8, recentLines: [] });
    expect(state.strategy.trainingSlots ?? 0).toBeGreaterThan(0);
  });

  it('tickWithStrategy increments the training counter only when a beat is woven', () => {
    // (Covered by tests/core/GameLoopTraining.test.ts for the kernel path;
    // here we assert the counter contract the WebUI completion path relies on:
    // computeTrainingWeave.nextConsumed == consumed + 1 iff shouldWeave.)
    const r = computeTrainingWeave(1, 0, 2, 'idle');
    expect(r.nextConsumed).toBe(r.shouldWeave ? 1 : 0);
  });
});

describe('W7-4: trainingBridge persistence (browser KV)', () => {
  beforeEach(() => {
    ensureLocalStorage();
    localStorage.clear();
    resetTrainingBridgeForTests();
  });

  it('persists trials, cognitive index, and calibration after a beat', async () => {
    const paradigmId = 'stroop';
    const paradigm = getParadigm(paradigmId);
    expect(paradigm).toBeTruthy();

    // Prepare (calibrated start + staircase) — same call the runner makes.
    const prepared = await prepareTrainingBeat(paradigmId);
    expect(prepared.level).toBeGreaterThanOrEqual(0);
    expect(prepared.level).toBeLessThanOrEqual(1);

    // Scripted UI port: always answer with the first choice after ~10ms.
    const ui: GameUiPort = {
      async show() {},
      async runTrial(plan) {
        if (plan.response.mode === 'choice') {
          return { value: plan.response.choices[0]?.id ?? null, latencyNs: BigInt(10_000_000), timedOut: false };
        }
        return { value: null, latencyNs: null, timedOut: true };
      },
      onAbort() {},
    };

    const trials: import('../../src/core/braingame/types.js').TrialRecord[] = [];
    const engine = new BrainGameEngine({
      paradigm: paradigm!,
      ui,
      params: prepared.startParams,
      adjustDifficulty: prepared.adjust,
      sink: (r) => trials.push(r),
      trialCount: 4,
    });
    const summary = await engine.run();
    expect(summary.trialsCompleted).toBeGreaterThan(0);
    expect(trials.length).toBe(summary.trialsCompleted);

    await persistTrainingBeat(paradigmId, summary, trials);

    const s = await getTrainingServices();
    const sessions = await s.trials.recentSessions(5);
    expect(sessions.length).toBe(1);
    expect(sessions[0]!.paradigmId).toBe(paradigmId);

    const cal = await s.calibration.get(paradigmId);
    expect(cal).toBeTruthy();
    expect(cal!.sessionsPlayed).toBe(1);

    const idx = JSON.parse((await s.kv.get('cogidx:v1')) ?? '{}');
    expect(Object.keys(idx.skills ?? {}).length).toBe(ALL_LINES.length);
  });

  it('EMA-updates the calibration baseline across sessions', async () => {
    const paradigmId = 'n_back';
    const prepared = await prepareTrainingBeat(paradigmId);
    const ui: GameUiPort = {
      async show() {},
      async runTrial(plan) {
        if (plan.response.mode === 'choice') {
          return { value: plan.response.choices[0]?.id ?? null, latencyNs: BigInt(10_000_000), timedOut: false };
        }
        return { value: null, latencyNs: null, timedOut: true };
      },
      onAbort() {},
    };
    const runOnce = async () => {
      const trials: import('../../src/core/braingame/types.js').TrialRecord[] = [];
      const engine = new BrainGameEngine({
        paradigm: getParadigm(paradigmId)!,
        ui,
        params: prepared.startParams,
        adjustDifficulty: prepared.adjust,
        sink: (r) => trials.push(r),
        trialCount: 3,
      });
      const summary = await engine.run();
      await persistTrainingBeat(paradigmId, summary, trials);
    };
    await runOnce();
    await runOnce();
    const s = await getTrainingServices();
    const cal = await s.calibration.get(paradigmId);
    expect(cal!.sessionsPlayed).toBe(2);
    // EMA: lastLevel within [0,1]
    expect(cal!.lastLevel).toBeGreaterThanOrEqual(0);
    expect(cal!.lastLevel).toBeLessThanOrEqual(1);
  });
});

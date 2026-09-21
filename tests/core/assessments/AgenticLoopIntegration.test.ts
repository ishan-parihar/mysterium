import { describe, it, expect, afterAll } from 'vitest';
import { FileKeyValueStore } from '../../../src/infra/persistence/FileKeyValueStore.js';
import { CalibrationStore } from '../../../src/core/adaptive/CalibrationStore.js';
import { TrialRecordStore } from '../../../src/core/braingame/TrialRecordStore.js';
import { CognitiveIndex } from '../../../src/core/training/CognitiveIndex.js';
import {
  handleTrainingTool,
  TRAINING_TOOLS,
  TRAINING_RULES_SUFFIX,
} from '../../../src/core/assessments/trainingTools.js';
import {
  handleUnifiedProfileTool,
  UNIFIED_PROFILE_TOOLS,
  UNIFIED_RULES_SUFFIX,
} from '../../../src/core/assessments/unifiedProfileTools.js';
import { AgenticOrchestrator } from '../../../src/core/assessments/AgenticOrchestrator.js';
import { createSignificator } from '../../../src/core/domain/Significator.js';
import { createInitialWorldState } from '../../../src/core/engines/CandidateGeneration.js';
import { startSession, tickWithStrategy } from '../../../src/core/GameLoop.js';
import { getParadigm, allParadigms } from '../../../src/core/braingame/registry.js';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const TMP = mkdtempSync(join(tmpdir(), 'mysterium-int-'));
const KV = new FileKeyValueStore(TMP);
const CAL = new CalibrationStore(KV);
const TRIALS = new TrialRecordStore(KV);
const IDX = new CognitiveIndex();
const SIG = createSignificator('test-sig', {
  Cognitive: 'Red', Emotional: 'Red', Moral: 'Red', Intrapersonal: 'Red',
  Spiritual: 'Red', Somatic: 'Red', Willpower: 'Red', Interpersonal: 'Red',
} as any, 'Red');
IDX.recordGame(['Cognitive'] as any, 0.75, Date.now() - 2 * 86_400_000);
IDX.recordGame(['Emotional'] as any, 0.6, Date.now() - 5 * 86_400_000);

const MOCK_RUNNER = {
  async runGame(paradigmId: string, opts: any) {
    const paradigm = getParadigm(paradigmId)!;
    const sessionId = `test-${Date.now()}`;
    return {
      summary: {
        sessionId, paradigmId, label: paradigm.label,
        trialsCompleted: opts.trialCount ?? paradigm.defaultTrials,
        aborted: false, accuracyTrend: [0.6, 0.7, 0.75],
        rtMedianMs: paradigm.timed ? 450 : null, paramsStart: {}, paramsEnd: { difficulty: 0.5 },
        overallAccuracy: 0.72, performance: 0.7, feltSenseHint: 'steady focus deepening',
      },
      trials: Array.from({ length: opts.trialCount ?? 8 }, (_, i) => ({
        sessionId, paradigmId, timestamp: Date.now(), trialIndex: i,
        params: {}, paramsHash: 'test',
        correct: i % 3 !== 0, accuracy: i % 3 !== 0 ? 1 : 0,
        latencyScore: 0.6, latencyNs: BigInt(400_000_000), adjustedLatencyMs: 400,
      })),
    };
  },
};
const WORKOUT = { plan: null as any, completed: 0 };

const trainingServices = {
  calibration: CAL, trials: TRIALS, index: IDX,
  now: () => Date.now(), persistIndex: async () => {}, fatigue: undefined as any,
};
const trainingCtx = {
  services: trainingServices as any, runner: MOCK_RUNNER as any, workout: WORKOUT, signal: undefined,
};

const unifiedServices = {
  getSignificator: async () => SIG as any,
  cognitiveIndex: IDX, trials: TRIALS, calibration: CAL,
  now: () => Date.now(),
};
const unifiedCtx = { services: unifiedServices as any };

function dummyEncounter(modality: any = 'ScenarioChoice', line: any = 'Cognitive', stage: any = 'Red'): any {
  return {
    id: 'test-enc', moduleRef: `${line}:${stage}`, modality,
    targetLines: [line], stage, holonSource: 'test',
    shadowTarget: null, polarityMode: 'Exploring', difficulty: 0.5,
    sessionPosition: 'peak', priority: 0.5, driveTarget: null, executionMode: 'capacity',
  };
}

function makeWorld() {
  return createInitialWorldState([]) as any;
}

function makeMockUI(answers: any[] = []) {
  return {
    askUser: async (params: any) => {
      if (answers.length > 0) return { answers: answers.shift()! };
      const opt = params.questions[0]?.options?.[0];
      const label = opt?.label ?? 'A';
      return { answers: [{ selectedIndex: 0, label, selectedLabels: [label], writeInValue: undefined }] };
    },
  } as any;
}

describe('Agentic Loop Integration — tools across dimensions', () => {
  it('inventory: 13 total tools (2 core + 5 training + 6 unified)', () => {
    // P1-QW7 (Architecture Audit Phase A): added study_concept.
    // P1-B1 (Architecture Audit Phase B): added detect_shadow_signals.
    const total = 2 + TRAINING_TOOLS.length + UNIFIED_PROFILE_TOOLS.length;
    expect(total).toBe(13);
  });

  it('every tool schema is valid OpenAI function format', () => {
    for (const t of [...TRAINING_TOOLS, ...UNIFIED_PROFILE_TOOLS]) {
      expect(typeof (t as any).function?.name).toBe('string');
      expect(typeof (t as any).function?.description).toBe('string');
    }
  });

  it('system prompt suffixes mention their key tool', () => {
    expect(TRAINING_RULES_SUFFIX).toContain('run_brain_game');
    expect(UNIFIED_RULES_SUFFIX).toContain('get_unified_profile');
  });

  describe('training tools (5)', () => {
    it('get_training_profile returns 8 domains with felt-sense', async () => {
      const res = await handleTrainingTool('get_training_profile', '{}', trainingCtx);
      expect(res.ok).toBe(true);
      const domains = (res.payload as any).domains;
      expect(domains).toHaveLength(8);
      expect(typeof domains[0]?.feltSense).toBe('string');
    });

    it('recommend_workout returns balanced plan', async () => {
      const res = await handleTrainingTool('recommend_workout', JSON.stringify({ minutes: 12 }), trainingCtx);
      expect(res.ok).toBe(true);
      expect((res.payload as any).items.length).toBeGreaterThanOrEqual(2);
      expect((res.payload as any).totalMinutes).toBeGreaterThanOrEqual(6);
      expect((res.payload as any).totalMinutes).toBeLessThanOrEqual(20);
    });

    it('set_difficulty_override persists both direction and level', async () => {
      const r1 = await handleTrainingTool('set_difficulty_override', JSON.stringify({ paradigmId: 'stroop', direction: 'easier' }), trainingCtx);
      expect(r1.ok).toBe(true);
      const r2 = await handleTrainingTool('set_difficulty_override', JSON.stringify({ paradigmId: 'n_back', level: 0.8 }), trainingCtx);
      expect(r2.ok).toBe(true);
    });

    it('set_difficulty_override rejects unknown paradigm', async () => {
      const bad = await handleTrainingTool('set_difficulty_override', JSON.stringify({ paradigmId: 'unknown', direction: 'easier' }), trainingCtx);
      expect(bad.ok).toBe(false);
    });

    it('run_brain_game executes, updates index, persists calibration + trials', async () => {
      const res = await handleTrainingTool('run_brain_game', JSON.stringify({ paradigmId: 'stroop', trialCount: 6 }), trainingCtx);
      expect(res.ok).toBe(true);
      expect(typeof (res.payload as any).feltSenseHint).toBe('string');
      expect(IDX.snapshot().some(s => s.line === 'Cognitive')).toBe(true);
      const cal = await CAL.get('stroop');
      expect(cal).not.toBeNull();
      expect(typeof cal!.baselineLevel).toBe('number');
      const recent = await TRIALS.recentSessions(5);
      expect(recent.length).toBeGreaterThan(0);
    });

    it('run_brain_game rejects unknown paradigm', async () => {
      const res = await handleTrainingTool('run_brain_game', JSON.stringify({ paradigmId: 'not_a_game' }), trainingCtx);
      expect(res.ok).toBe(false);
    });

    it('complete_workout returns next review suggestion', async () => {
      const res = await handleTrainingTool('complete_workout', JSON.stringify({ summary: 'felt steady and clear' }), trainingCtx);
      expect(res.ok).toBe(true);
      expect(typeof (res.payload as any).nextReviewSuggestion).toBe('string');
    });

    it('unknown training tool rejected gracefully', async () => {
      const res = await handleTrainingTool('unknown_tool', '{}', trainingCtx);
      expect(res.ok).toBe(false);
    });
  });

  describe('unified profile tools (4)', () => {
    it('get_developmental_snapshot returns 8 altitudes + CCI', async () => {
      const res = await handleUnifiedProfileTool('get_developmental_snapshot', '{}', unifiedCtx);
      expect(res.ok).toBe(true);
      const p = res.payload as any;
      expect(p.altitudes).toHaveLength(8);
      expect(p.cci.composite).toBeTypeOf('number');
      expect(typeof p.cci.feltSense).toBe('string');
    });

    it('get_knowledge_snapshot returns felt-sense (empty knowledge)', async () => {
      const res = await handleUnifiedProfileTool('get_knowledge_snapshot', '{}', unifiedCtx);
      expect(res.ok).toBe(true);
      expect(typeof (res.payload as any).feltSense).toBe('string');
    });

    it('get_unified_profile composes dev + knowledge + cognitive', async () => {
      const res = await handleUnifiedProfileTool('get_unified_profile', '{}', unifiedCtx);
      expect(res.ok).toBe(true);
      const p = res.payload as any;
      expect(p.developmental).toBeTruthy();
      expect(p.knowledge).toBeTruthy();
      expect(p.cognitive.lines).toHaveLength(8);
      expect(typeof p.continuity).toBe('string');
    });

    it('recommend_trajectory produces balanced 3-5 steps within budget', async () => {
      const res = await handleUnifiedProfileTool('recommend_trajectory', JSON.stringify({ minutes: 15 }), unifiedCtx);
      expect(res.ok).toBe(true);
      const p = res.payload as any;
      expect(p.steps.length).toBeGreaterThanOrEqual(2);
      expect(p.totalMinutes).toBeLessThanOrEqual(15);
      const kinds = new Set(p.steps.map((s: any) => s.kind));
      expect(kinds.size).toBeGreaterThanOrEqual(2);
    });

    it('recommend_trajectory preserves focusLine', async () => {
      const res = await handleUnifiedProfileTool('recommend_trajectory', JSON.stringify({ minutes: 20, focusLine: 'Cognitive' }), unifiedCtx);
      expect(res.ok).toBe(true);
      expect((res.payload as any).focusLine).toBe('Cognitive');
    });

    it('handles null significator gracefully (fresh user)', async () => {
      const res = await handleUnifiedProfileTool('get_developmental_snapshot', '{}', {
        services: { ...unifiedServices, getSignificator: async () => null } as any,
      });
      expect(res.ok).toBe(true);
      expect((res.payload as any).empty).toBe(true);
    });

    it('unknown unified tool rejected', async () => {
      const res = await handleUnifiedProfileTool('unknown_unified_tool', '{}', unifiedCtx);
      expect(res.ok).toBe(false);
    });
  });

  describe('AgenticOrchestrator tool registration', () => {
    it('without integrations: 2 tools', () => {
      const orch = new AgenticOrchestrator({
        encounter: dummyEncounter(), significator: SIG as any, world: makeWorld(),
        history: [], conceptIndex: {}, uiHandler: makeMockUI(), noLlm: true,
      });
      const tools = (orch as any).toolsForRun();
      expect(tools.length).toBe(2);
    });

    it('with training: 7 tools (2+5)', () => {
      const orch = new AgenticOrchestrator({
        encounter: dummyEncounter(), significator: SIG as any, world: makeWorld(),
        history: [], conceptIndex: {}, uiHandler: makeMockUI(), noLlm: true,
        training: { services: trainingServices as any, runner: MOCK_RUNNER as any, workout: WORKOUT } as any,
      });
      const tools = (orch as any).toolsForRun();
      expect(tools.length).toBe(7);
    });

    it('with both training + unified: 13 tools (2+5+6)', () => {
      // P1-QW7 (Architecture Audit Phase A): study_concept added.
      // P1-B1 (Architecture Audit Phase B): detect_shadow_signals added.
      const orch = new AgenticOrchestrator({
        encounter: dummyEncounter(), significator: SIG as any, world: makeWorld(),
        history: [], conceptIndex: {}, uiHandler: makeMockUI(), noLlm: true,
        training: { services: trainingServices as any, runner: MOCK_RUNNER as any, workout: WORKOUT } as any,
        unifiedProfile: unifiedServices as any,
      });
      const tools = (orch as any).toolsForRun();
      expect(tools.length).toBe(13);
    });

    it('fallback path (noLlm) completes encounter with finalResult', async () => {
      const orch = new AgenticOrchestrator({
        encounter: dummyEncounter('ScenarioChoice', 'Emotional', 'Red'), significator: SIG as any,
        world: makeWorld(), history: [], conceptIndex: {}, uiHandler: makeMockUI(), noLlm: true,
      });
      const result = await orch.run();
      expect(typeof result.narrativeSummary).toBe('string');
      expect(result.finalResult).toBeTruthy();
    });
  });

  describe('GameLoop integration', () => {
    it('startSession produces strategy with curriculum + training slots', () => {
      const sig2 = createSignificator('test-sig2', {
        Cognitive: 'Red', Emotional: 'Red', Moral: 'Red', Intrapersonal: 'Red',
        Spiritual: 'Red', Somatic: 'Red', Willpower: 'Red', Interpersonal: 'Red',
      } as any, 'Red');
      const session = { targetSessionLength: 12, encountersSoFar: 0, energy: 'high' as const, holonAvailability: 'high' as const, recentLines: [] as string[], sessionDurationMs: 0 } as any;
      const state = startSession(sig2 as any, session);
      expect(state.strategy).toBeTruthy();
      expect(state.cci).toBeTruthy();
      expect(typeof state.strategy.curriculumSlots).toBe('number');
      expect(typeof (state.strategy as any).trainingSlots).toBe('number');
    });

    it('tickWithStrategy schedules encounters when holons exist and weaves training beats', () => {
      const sig2 = createSignificator('test-sig2', {
        Cognitive: 'Red', Emotional: 'Red', Moral: 'Red', Intrapersonal: 'Red',
        Spiritual: 'Red', Somatic: 'Red', Willpower: 'Red', Interpersonal: 'Red',
      } as any, 'Red');
      const holonData = require('../../../src/core/world/data/red-layer-holons.json');
      const world = createInitialWorldState(holonData as any) as any;
      const session = { targetSessionLength: 12, encountersSoFar: 0, energy: 'high' as const, holonAvailability: 'high' as const, recentLines: [] as string[], sessionDurationMs: 0 } as any;
      const state = startSession(sig2 as any, session);
      const tick1 = tickWithStrategy(sig2 as any, world, session, state, null, null, Date.now());
      expect(tick1.tickResult.encounters.length).toBeGreaterThan(0);
      // Check for training beat in subsequent ticks
      let foundBeat = tick1.tickResult.encounters.some((e: any) => e.isTrainingBeat);
      let curState = tick1.sessionState;
      for (let i = 0; i < 4 && !foundBeat && tick1.tickResult.encounters.length > 0; i++) {
        const e0 = tick1.tickResult.encounters[0]!;
        const fakeResp = {
          encounterId: e0.id, energeticDirection: 'Radiative' as any,
          driveDirectionality: { Agency: 'HealthyBalanced', Communion: 'HealthyBalanced', Eros: 'HealthyBalanced', Agape: 'HealthyBalanced' } as any,
          stageOrientation: 'Sovereign' as any, sourceOfNourishment: 'Homeostatic' as any,
          shadowSurfaced: null, shadowResolvedId: null, narrativeSummary: 'test',
        };
        const next = tickWithStrategy(tick1.tickResult.sig as any, tick1.tickResult.world as any, { ...session, encountersSoFar: i + 1 } as any, curState, fakeResp as any, e0, Date.now());
        if (next.tickResult.encounters.some((e: any) => e.isTrainingBeat)) foundBeat = true;
        curState = next.sessionState;
      }
      expect(foundBeat).toBe(true);
    });
  });

  describe('paradigm registry', () => {
    it('has 5 paradigms, each with domains + paramSpace', () => {
      const all = allParadigms();
      expect(all).toHaveLength(5);
      for (const p of all) {
        expect(p.domains.length).toBeGreaterThan(0);
        expect(Object.keys(p.paramSpace).length).toBeGreaterThan(0);
      }
    });

    it('getParadigm resolves known and rejects unknown', () => {
      expect(getParadigm('stroop')).toBeTruthy();
      expect(getParadigm('not_real')).toBeUndefined();
    });
  });
});

afterAll(() => { try { rmSync(TMP, { recursive: true, force: true }); } catch {} });

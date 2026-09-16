/**
 * trainingBridge — browser-side training-beat persistence (doc 40 §6.2,
 * docs/brain-game-upgrade/06 §training). The browser twin of the CLI's
 * training-beat persistence path (scripts/cli-game.ts session weave +
 * src/cli/TrainingRuntime.ts services).
 *
 * Owns the TrainingServices singletons over the browser KV store
 * (createKeyValueStore → localStorage/Capacitor), so a training beat played in
 * the WebUI:
 *   1. appends its trial records (TrialRecordStore),
 *   2. folds performance into the CognitiveIndex (decay-aware, Veil-safe),
 *   3. EMA-updates the paradigm's CalibrationStore baseline,
 *   4. drives the adaptive staircase (resolveStartLevel + createTrialAdjuster)
 *      exactly as the CLI runner does.
 *
 * Veil rule: only the summary's felt-sense phrase crosses into player view;
 * raw accuracy/RT stay in telemetry stores (same convention as CLI insights).
 */

import { createKeyValueStore } from '$infra/persistence/createKeyValueStore.js';
import { CalibrationStore } from '$core/adaptive/CalibrationStore.js';
import { TrialRecordStore } from '$core/braingame/TrialRecordStore.js';
import { CognitiveIndex, type CognitiveIndexState } from '$core/training/CognitiveIndex.js';
import {
  resolveStartLevel,
  type TrainingServices,
} from '$core/assessments/trainingTools.js';
import {
  createTrialAdjuster,
  initAdaptiveState,
  strategyForParadigm,
  levelFromParadigm,
} from '$core/adaptive/AdaptiveDifficultyService.js';
import { getParadigm } from '$core/braingame/registry.js';
import type { NumericParams, TrialRecord, GameSummary } from '$core/braingame/types.js';

const INDEX_KEY = 'cogidx:v1';

interface CachedServices extends TrainingServices {
  readonly kv: ReturnType<typeof createKeyValueStore>;
}

let cached: CachedServices | null = null;
let cachedPromise: Promise<CachedServices> | null = null;

/** Persist the cognitive index after mutations (mirrors TrainingRuntime.persistIndex). */
async function persistIndex(): Promise<void> {
  if (!cached) return;
  await cached.kv.set(INDEX_KEY, JSON.stringify(cached.index.getState()));
}

/**
 * Browser TrainingServices singleton. Same layout as the CLI's
 * TrainingRuntime.services(), over the browser KV backend.
 */
export async function getTrainingServices(): Promise<CachedServices> {
  if (cached) return cached;
  if (cachedPromise) return cachedPromise;
  cachedPromise = (async () => {
    const kv = createKeyValueStore();
    const calibration = new CalibrationStore(kv);
    const trials = new TrialRecordStore(kv);
    const index = new CognitiveIndex();
    try {
      const raw = await kv.get(INDEX_KEY);
      if (raw) index.load(JSON.parse(raw) as CognitiveIndexState);
    } catch {
      /* fresh index */
    }
    cached = { kv, calibration, trials, index, now: () => Date.now(), persistIndex };
    return cached;
  })();
  const s = await cachedPromise;
  cachedPromise = null;
  return s;
}

/** Test seam: reset the singleton between tests. */
export function resetTrainingBridgeForTests(): void {
  cached = null;
  cachedPromise = null;
}

/**
 * Prepare one training beat: resolve the calibrated start level and build the
 * per-trial adaptive adjuster (the browser twin of TrainingRuntime's runner).
 * Feed `startParams` into the BrainGameEngine's `params` option and `adjust`
 * into its `adjustDifficulty` hook; wire `sink` to collect the trial records
 * that persistTrainingBeat stores.
 */
export async function prepareTrainingBeat(
  paradigmId: string,
  difficultyHint?: number,
): Promise<{
  level: number;
  calibrated: boolean;
  startParams: NumericParams;
  adjust: (params: NumericParams, correct: boolean, latencyScore?: number) => NumericParams;
}> {
  const s = await getTrainingServices();
  const paradigm = getParadigm(paradigmId);
  if (!paradigm) throw new Error(`Unknown paradigm '${paradigmId}'`);
  const { level, calibrated } = await resolveStartLevel(s, paradigmId, difficultyHint);
  const { levelToParams } = await import('$core/braingame/types.js');
  const startParams = levelToParams(paradigm.paramSpace, level);
  const adjuster = createTrialAdjuster(paradigm, initAdaptiveState(level), strategyForParadigm(paradigmId));
  return { level, calibrated, startParams, adjust: adjuster.adjust };
}

/**
 * Persist one completed training beat — the exact CLI session-weave path
 * (scripts/cli-game.ts training-beat branch + handleTrainingTool's run_brain_game):
 * appendSession → index.recordGame → calibration EMA → persistIndex.
 * Called by the TrainingBeatRunner after BrainGameEngine.run() resolves.
 */
export async function persistTrainingBeat(
  paradigmId: string,
  summary: GameSummary,
  trials: readonly TrialRecord[],
): Promise<void> {
  const s = await getTrainingServices();
  const paradigm = getParadigm(paradigmId);
  if (!paradigm) throw new Error(`Unknown paradigm '${paradigmId}'`);

  const session = {
    sessionId: summary.sessionId,
    paradigmId: summary.paradigmId,
    startedAt: Date.now(),
    trialsCompleted: summary.trialsCompleted,
    accuracy: summary.overallAccuracy,
    rtMedianMs: summary.rtMedianMs,
    performance: summary.performance,
  };
  await s.trials.appendSession(trials as TrialRecord[], session);
  s.index.recordGame([...paradigm.domains], summary.performance);
  const prev = await s.calibration.get(paradigmId);
  const endLevel = levelFromParadigm(paradigm, summary.paramsEnd as NumericParams);
  await s.calibration.put({
    paradigmId,
    baselineLevel: prev ? prev.baselineLevel * 0.7 + endLevel * 0.3 : endLevel,
    lastLevel: endLevel,
    calibratedAt: prev?.calibratedAt ?? Date.now(),
    lastPlayedAt: Date.now(),
    sessionsPlayed: (prev?.sessionsPlayed ?? 0) + 1,
  });
  await persistIndex();
}

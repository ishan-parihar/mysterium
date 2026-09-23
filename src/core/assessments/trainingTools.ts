/**
 * Training tools — the five function-tools that let the agentic Game Master
 * execute and orchestrate brain-training games inside an encounter.
 * Spec: docs/brain-game-upgrade/04-agent-tool-spec.md.
 *
 * Handlers here are pure orchestration over TrainingServices; the actual
 * interactive execution happens behind GameRunnerPort (CLI adapter today,
 * WebUI later). Tool results are the ONLY channel back to the model — every
 * player-facing value must already be Veil-safe (felt-sense phrasing).
 */
import { ALL_LINES } from '../domain/Line.js';
import type { Line } from '../domain/Line.js';
import type { GameSummary, NumericParams, TrialRecord } from '../braingame/types.js';
import { getParadigm } from '../braingame/registry.js';
import { TrialRecordStore, type SessionRecord } from '../braingame/TrialRecordStore.js';
import { CalibrationStore, type CalibrationRecord } from '../adaptive/CalibrationStore.js';
import { CognitiveIndex } from '../training/CognitiveIndex.js';
import { planWorkout, FatigueMonitor, type WorkoutPlan } from '../training/WorkoutPlanner.js';
import { initAdaptiveState, levelForParadigm, levelFromParadigm } from '../adaptive/AdaptiveDifficultyService.js';

// ── Ports ─────────────────────────────────────────────────────────────

/** Summary for the agent + raw trial records for telemetry. */
export interface GameRunOutcome {
  readonly summary: GameSummary;
  readonly trials: readonly TrialRecord[];
}

/** Executed natively by the host surface — never by the LLM. */
export interface GameRunnerPort {
  runGame(paradigmId: string, opts: {
    trialCount?: number;
    /** 0..1 starting difficulty; omit → player's calibrated baseline. */
    difficultyHint?: number;
    signal?: AbortSignal;
  }): Promise<GameRunOutcome>;
}

export interface TrainingServices {
  readonly calibration: CalibrationStore;
  readonly trials: TrialRecordStore;
  readonly index: CognitiveIndex;
  readonly now: () => number;
  /** Persist the index (KV-backed stores make this trivial). */
  readonly persistIndex: () => Promise<void>;
  /** Optional fatigue monitor shared across the workout. */
  readonly fatigue?: FatigueMonitor;
}

/** Everything the host surface must provide to enable in-encounter games. */
export interface TrainingIntegration {
  readonly services: TrainingServices;
  readonly runner: GameRunnerPort;
  /** Mutable within one encounter; tracks plan + completion count. */
  readonly workout: { plan: WorkoutPlan | null; completed: number };
}

// ── Tool schemas (OpenAI function-tool style, matching ASK_USER_QUESTION_TOOL) ──

const PARADIGM_ENUM = ['n_back', 'stroop', 'go_no_go', 'reaction_time', 'pattern_prediction'] as const;

export const RUN_BRAIN_GAME_TOOL = {
  type: 'function' as const,
  function: {
    name: 'run_brain_game',
    description: 'Run a complete interactive brain-training game with the player (multiple timed trials). Call this when the session reaches a training beat or the player requests a challenge. Frame the game narratively BEFORE calling; interpret results AFTER using only the returned values. Never invent or estimate the summary values.',
    parameters: {
      type: 'object',
      properties: {
        paradigmId: { type: 'string', enum: [...PARADIGM_ENUM], description: 'Which cognitive paradigm to run.' },
        trialCount: { type: 'integer', minimum: 4, maximum: 30, description: 'Override the default trial count (usually leave unset).' },
        difficultyHint: { type: 'number', minimum: 0, maximum: 1, description: 'Optional starting difficulty 0-1. Omit to use the player\'s calibrated baseline.' }
      },
      required: ['paradigmId']
    }
  }
};

export const GET_TRAINING_PROFILE_TOOL = {
  type: 'function' as const,
  function: {
    name: 'get_training_profile',
    description: 'Read the player\'s cognitive-training profile: per-line readiness (decayed scores relative to their own baseline), trends, and staleness. Use to decide what to train next and how to frame it. Values are internal context — translate into felt-sense language for the player; never expose numbers.',
    parameters: { type: 'object', properties: {}, required: [] }
  }
};

export const RECOMMEND_WORKOUT_TOOL = {
  type: 'function' as const,
  function: {
    name: 'recommend_workout',
    description: 'Request an ordered set of brain games tailored to available time and decay profile. Present the returned items to the player via ask_user_question BEFORE running any of them.',
    parameters: {
      type: 'object',
      properties: {
        minutes: { type: 'integer', minimum: 5, maximum: 45, description: 'Total time budget.' },
        focusLine: { type: 'string', enum: [...ALL_LINES], description: 'Optional line to bias toward.' }
      },
      required: ['minutes']
    }
  }
};

export const SET_DIFFICULTY_OVERRIDE_TOOL = {
  type: 'function' as const,
  function: {
    name: 'set_difficulty_override',
    description: 'Adjust difficulty calibration for a paradigm at the player\'s explicit request ("too easy", "too hard"). Persists across sessions.',
    parameters: {
      type: 'object',
      properties: {
        paradigmId: { type: 'string', enum: [...PARADIGM_ENUM] },
        direction: { type: 'string', enum: ['easier', 'harder'], description: 'Relative adjustment.' },
        level: { type: 'number', minimum: 0, maximum: 1, description: 'Absolute level (overrides direction).' }
      },
      required: ['paradigmId']
    }
  }
};

export const COMPLETE_WORKOUT_TOOL = {
  type: 'function' as const,
  function: {
    name: 'complete_workout',
    description: 'Concludes a brain-game workout after all planned games are run (or the player stops). Persists progress. Provide a felt-sense summary — supportive, never clinical.',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Veil-safe felt-sense recap of the session.' },
        playerStoppedEarly: { type: 'boolean' }
      },
      required: ['summary']
    }
  }
};

export const TRAINING_TOOLS = [
  RUN_BRAIN_GAME_TOOL,
  GET_TRAINING_PROFILE_TOOL,
  RECOMMEND_WORKOUT_TOOL,
  SET_DIFFICULTY_OVERRIDE_TOOL,
  COMPLETE_WORKOUT_TOOL,
] as const;

export const TRAINING_TOOL_NAMES: ReadonlySet<string> = new Set(TRAINING_TOOLS.map((t) => t.function.name));

/** System-prompt amendments appended only when training tools are active. */
export const TRAINING_RULES_SUFFIX = `
8. TRAINING BEATS: When you intend to run a brain game, frame it in fiction FIRST, then call 'run_brain_game'. Quote ONLY values present in the tool result — never simulate gameplay or invent metrics.
9. VEIL: Translate all training data into felt-sense language ("your recall felt steadier than last time"). Never speak scores, percentages, reaction times, or difficulty levels aloud.
10. CONSENT: Before the first 'run_brain_game' of a workout, present the planned games via 'ask_user_question'. Respect a declined item — move on or shorten the session.
11. WORKOUT CLOSURE: When the planned games are done (or the player stops), call 'complete_workout'. The encounter itself still ends with 'complete_encounter'.`;

// ── Handler context ───────────────────────────────────────────────────

export interface TrainingHandlerContext {
  readonly services: TrainingServices;
  readonly runner: GameRunnerPort;
  /** Workout state lives across tool calls within one encounter. */
  readonly workout: { plan: WorkoutPlan | null; completed: number };
  readonly signal?: AbortSignal;
}

export interface TrainingToolResult {
  readonly ok: boolean;
  readonly payload: Record<string, unknown>;
}

/** Resolve start params for a game: hint > override > baseline > neutral. */
export async function resolveStartLevel(
  services: TrainingServices,
  paradigmId: string,
  hint?: number,
):Promise<{ level: number; calibrated: boolean }> {
  if (typeof hint === 'number') return { level: Math.min(1, Math.max(0, hint)), calibrated: true };
  const rec = await services.calibration.get(paradigmId);
  if (!rec) return { level: 0.35, calibrated: false };
  const staleDays = (services.now() - rec.lastPlayedAt) / 86_400_000;
  // Stale baselines warm-start slightly lower (decay-aware).
  const decayedBaseline = Math.max(0.15, rec.lastLevel - Math.min(0.15, staleDays * 0.02));
  const overridden = applyOverride(decayedBaseline, rec);
  return { level: overridden, calibrated: true };
}

function applyOverride(level: number, rec: CalibrationRecord): number {
  if (!rec.override) return level;
  if (typeof rec.override.level === 'number') return Math.min(1, Math.max(0, rec.override.level));
  if (rec.override.direction === 'easier') return Math.max(0, level - 0.12);
  if (rec.override.direction === 'harder') return Math.min(1, level + 0.12);
  return level;
}

/**
 * Central training-tool dispatcher. Returns a tool-message payload for the LLM.
 * Unknown/unsupported combinations degrade gracefully (never throw into the loop).
 */
export async function handleTrainingTool(
  name: string,
  argsJson: string,
  ctx: TrainingHandlerContext,
): Promise<TrainingToolResult> {
  try {
    const args = argsJson.trim() ? (JSON.parse(argsJson) as Record<string, unknown>) : {};
    switch (name) {
      case 'run_brain_game': return await runBrainGame(args, ctx);
      case 'get_training_profile': return await getTrainingProfile(ctx.services);
      case 'recommend_workout': return await recommendWorkout(args, ctx.services);
      case 'set_difficulty_override': return await setDifficultyOverride(args, ctx.services);
      case 'complete_workout': return await completeWorkout(args, ctx);
      default: return { ok: false, payload: { error: `Unknown training tool: ${name}` } };
    }
  } catch (err) {
    return { ok: false, payload: { error: `Training tool failed: ${(err as Error).message}` } };
  }
}

async function runBrainGame(args: Record<string, unknown>, ctx: TrainingHandlerContext): Promise<TrainingToolResult> {
  const paradigmId = String(args.paradigmId ?? '');
  const paradigm = getParadigm(paradigmId);
  if (!paradigm) {
    return { ok: false, payload: { error: `Unknown paradigm '${paradigmId}'. Valid: ${PARADIGM_ENUM.join(', ')}` } };
  }

  const hint = typeof args.difficultyHint === 'number' ? args.difficultyHint : undefined;
  const trialCount = typeof args.trialCount === 'number' ? args.trialCount : undefined;
  const { level, calibrated } = await resolveStartLevel(ctx.services, paradigmId, hint);

  // The runner owns the engine loop including per-trial adaptation; we
  // recompute the final level from the summary's end params for calibration.
  const outcome = await ctx.runner.runGame(paradigmId, {
    trialCount,
    difficultyHint: level,
    signal: ctx.signal,
  });
  const summary = outcome.summary;

  // Persist telemetry + fold into the index.
  const now = ctx.services.now();
  const session: SessionRecord = {
    sessionId: summary.sessionId,
    paradigmId: summary.paradigmId,
    startedAt: now,
    trialsCompleted: summary.trialsCompleted,
    accuracy: summary.overallAccuracy,
    rtMedianMs: summary.rtMedianMs,
    performance: summary.performance,
  };
  await ctx.services.trials.appendSession(outcome.trials, session);

  // Fold index updates per trained line.
  ctx.services.index.recordGame([...paradigm.domains], summary.performance, now);

  // Update calibration (EMA of reached level).
  const prev = await ctx.services.calibration.get(paradigmId);
  const endLevel = levelFromParadigm(paradigm, summary.paramsEnd as NumericParams);
  await ctx.services.calibration.put({
    paradigmId,
    baselineLevel: prev ? prev.baselineLevel * 0.7 + endLevel * 0.3 : endLevel,
    lastLevel: endLevel,
    calibratedAt: prev?.calibratedAt ?? now,
    lastPlayedAt: now,
    sessionsPlayed: (prev?.sessionsPlayed ?? 0) + 1,
  });
  await ctx.services.persistIndex();

  ctx.workout.completed++;

  // Fatigue recommendation for the agent's framing.
  const fatigue = ctx.services.fatigue;
  const verdict = fatigue ? fatigue.record(summary.overallAccuracy, summary.rtMedianMs) : 'ok';

  return {
    ok: true,
    payload: {
      sessionId: summary.sessionId,
      paradigmId: summary.paradigmId,
      label: summary.label,
      trialsCompleted: summary.trialsCompleted,
      aborted: summary.aborted,
      accuracyTrend: summary.accuracyTrend.map((v) => Math.round(v * 100) / 100),
      rtMedianMs: summary.rtMedianMs !== null ? Math.round(summary.rtMedianMs) : null,
      difficultyStart: Math.round(level * 100) / 100,
      difficultyEnd: Math.round(endLevel * 100) / 100,
      calibrated,
      fatigueAdvice: verdict,
      feltSenseHint: summary.feltSenseHint,
      workoutProgress: ctx.workout.plan
        ? `${ctx.workout.completed}/${ctx.workout.plan.items.length}`
        : null,
    },
  };
}

async function getTrainingProfile(services: TrainingServices): Promise<TrainingToolResult> {
  services.index.applyDecay(services.now());
  const snapshot = services.index.snapshot(services.now());
  const stalest = [...snapshot].sort((a, b) => b.lastPlayedDaysAgo - a.lastPlayedDaysAgo)[0];
  const overall = snapshot.reduce((s, x) => s + x.score01, 0) / snapshot.length;
  await services.persistIndex();
  return {
    ok: true,
    payload: {
      domains: snapshot.map((s) => ({
        line: s.line,
        readiness01: Math.round(s.score01 * 100) / 100,
        trend: s.trend,
        lastPlayedDaysAgo: s.lastPlayedDaysAgo,
        feltSense: services.index.feltSenseFor(s.line),
      })),
      stalestLine: stalest?.line ?? null,
      overallReadiness01: Math.round(overall * 100) / 100,
    },
  };
}

async function recommendWorkout(args: Record<string, unknown>, services: TrainingServices, ): Promise<TrainingToolResult> {
  const minutes = Math.min(45, Math.max(5, Number(args.minutes ?? 12)));
  const focusLine = typeof args.focusLine === 'string' ? (args.focusLine as Line) : undefined;
  const plan = planWorkout(services.index, { minutes, focusLine });
  return {
    ok: true,
    payload: {
      items: plan.items.map((i) => {
        // Veil: surface the player-facing felt-sense rather than the clinical rationale.
        // The agent sees the clinical rationale; the player sees the felt sense.
        const felt = i.domains.length > 0
          ? services.index.feltSenseFor(i.domains[0]!)
          : 'your mind settling into focus';
        return {
          paradigmId: i.paradigmId,
          estimatedMinutes: i.estimatedMinutes,
          rationale: i.rationale, // agent context
          feltSense: felt, // player-facing
        };
      }),
      totalMinutes: plan.totalMinutes,
    },
  };
}

async function setDifficultyOverride(args: Record<string, unknown>, services: TrainingServices): Promise<TrainingToolResult> {
  const paradigmId = String(args.paradigmId ?? '');
  if (!getParadigm(paradigmId)) return { ok: false, payload: { error: `Unknown paradigm '${paradigmId}'` } };
  const prev = await services.calibration.get(paradigmId);

  const direction: 'easier' | 'harder' | undefined =
    args.direction === 'easier' || args.direction === 'harder' ? args.direction : undefined;
  const absoluteLevel: number | undefined = typeof args.level === 'number' ? args.level : undefined;
  if (direction === undefined && absoluteLevel === undefined) {
    return { ok: false, payload: { error: 'Provide direction or level.' } };
  }

  // P1-B4 (Architecture Audit Phase B): overrides now carry an explicit
  // expiresAt so a stale override doesn't outlive its welcome. 7-day TTL
  // by default; the player can call set_difficulty_override again to extend.
  const now = services.now();
  const override: NonNullable<CalibrationRecord['override']> = {
    ...(absoluteLevel !== undefined ? { level: absoluteLevel } : {}),
    ...(direction !== undefined ? { direction } : {}),
    at: now,
    expiresAt: now + 7 * 24 * 60 * 60 * 1000,
  };
  const record: CalibrationRecord = {
    paradigmId,
    baselineLevel: prev?.baselineLevel ?? 0.35,
    lastLevel: prev?.lastLevel ?? 0.35,
    calibratedAt: prev?.calibratedAt ?? now,
    lastPlayedAt: prev?.lastPlayedAt ?? 0,
    sessionsPlayed: prev?.sessionsPlayed ?? 0,
    override,
  };
  await services.calibration.put(record);
  return { ok: true, payload: { paradigmId, applied: true, expiresInDays: 7 } };
}

async function completeWorkout(args: Record<string, unknown>, ctx: TrainingHandlerContext): Promise<TrainingToolResult> {
  const snapshot = ctx.services.index.snapshot(ctx.services.now());
  const rising = snapshot.filter((s) => s.trend === 'rising').map((s) => s.line);
  const decaying = snapshot.filter((s) => s.trend === 'decaying').map((s) => s.line);
  await ctx.services.persistIndex();
  return {
    ok: true,
    payload: {
      recorded: true,
      playerStoppedEarly: Boolean(args.playerStoppedEarly),
      gamesCompleted: ctx.workout.completed,
      linesStrengthening: rising,
      linesResting: decaying,
      nextReviewSuggestion: decaying[0]
        ? `the ${decaying[0].toLowerCase()} sense would welcome attention soon`
        : 'all senses resting easy',
    },
  };
}

/** Exposed for tests: deterministic start-level resolution. */
export function startParamsFor(paradigmId: string, level: number): NumericParams | null {
  const p = getParadigm(paradigmId);
  if (!p) return null;
  return levelForParadigm(p, initAdaptiveState(level));
}

void TrialRecordStore;

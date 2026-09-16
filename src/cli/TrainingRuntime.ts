/**
 * TrainingRuntime — CLI-side bootstrap for the brain-training subsystem.
 * Owns the service singletons (calibration, trials, cognitive index) over
 * the file-backed KV store, exposes the GameRunnerPort used by
 * run_brain_game, and implements the `train` / `insights` commands.
 *
 * Veil rule: `insights` renders felt-sense language only. Raw numbers stay
 * behind --dev (same convention as glossary --full).
 */
import chalk from 'chalk';
import { Command } from 'commander';
import { FileKeyValueStore } from '../infra/persistence/FileKeyValueStore.js';
import type { KeyValueStore } from '../infra/persistence/KeyValueStore.js';
import { CalibrationStore } from '../core/adaptive/CalibrationStore.js';
import { TrialRecordStore } from '../core/braingame/TrialRecordStore.js';
import { CognitiveIndex, type CognitiveIndexState } from '../core/training/CognitiveIndex.js';
import { planWorkout, FatigueMonitor } from '../core/training/WorkoutPlanner.js';
import { getParadigm } from '../core/braingame/registry.js';
import type { Line } from '../core/domain/Line.js';
import type { TrialRecord } from '../core/braingame/types.js';
import {
  resolveStartLevel,
  type GameRunnerPort,
  type TrainingIntegration,
  type TrainingServices,
} from '../core/assessments/trainingTools.js';
import { runInteractiveGame } from './BrainGameCli.js';
import { createTrialAdjuster, initAdaptiveState, strategyForParadigm } from '../core/adaptive/AdaptiveDifficultyService.js';
import { runExportCommand as runExportImpl, setServicesGetter } from './ExportRuntime.js';
import type { UnifiedProfileServices } from '../core/assessments/unifiedProfileTools.js';
import { loadSave } from '../infra/persistence/SaveRepository.js';

const INDEX_KEY = 'cogidx:v1';
const PLAN_KEY = 'workout-plan:v1';

let cached: TrainingServices & { kv: KeyValueStore } | null = null;

async function services() {
  if (!cached) {
    const kv = new FileKeyValueStore();
    const calibration = new CalibrationStore(kv);
    const encrypt = process.env.MYSTERIUM_ENCRYPT_TRAINING === '1';
    const trials = new TrialRecordStore(kv, encrypt);
    const index = new CognitiveIndex();
    try {
      const raw = await kv.get(INDEX_KEY);
      if (raw) index.load(JSON.parse(raw) as CognitiveIndexState);
    } catch { /* fresh index */ }
    cached = { kv, calibration, trials, index, now: () => Date.now(), persistIndex };
    setServicesGetter(() => services());
  }
  return cached;
}

export async function runExportCommand(args: string[]): Promise<number> {
  // Ensure services getter is wired even if this is the first call
  await services();
  return runExportImpl(args);
}

export async function runCalibrateCommand(args: string[]): Promise<number> {
  const parser = new Command();
  parser.option('--paradigm <id>', 'paradigm to calibrate (default: all)').option('--trials <n>', 'trials per calibration block', parseIntSafe).option('--demo [seed]', 'scripted responder', parseIntSafe).option('--onboard', 'Run OnboardingCalibrator to seed per-line altitudes (binary-search onboarding per ONBOARDING-REDESIGN-PLAN 2.2)');
  parser.exitOverride();
  try { parser.parse(args, { from: 'user' }); } catch { /* help */ }
  const o = parser.opts<{ paradigm?: string; trials?: number; demo?: number | boolean; onboard?: boolean }>();
  if (o.onboard) {
    // OnboardingCalibrator path — per-line binary-search onboarding
    const { calibrate } = await import('../core/usecases/OnboardingCalibrator.js');
    const { ALL_LINES } = await import('../core/domain/Line.js');
    // Synthetic probes for demo: per-line task-unit thresholds chosen so each
    // line's map lands at the same altitude (Amber). ThresholdMaps are in each
    // line's own units (span-like scales; Somatic in ms, lower = higher) — a
    // single normalized value like 0.55 is meaningful for none of them.
    const demoThresholds: Record<Line, number> = {
      Cognitive: 2.8,
      Emotional: 3.2,
      Moral: 3.2,
      Intrapersonal: 3.2,
      Spiritual: 3.2,
      Somatic: 550,
      Willpower: 5.5,
      Interpersonal: 3.2,
    };
    const demoProbes = ALL_LINES.map(line => ({
      line,
      accuracy: 0.62,
      medianReactionMs: 820,
      threshold: demoThresholds[line],
      trials: [],
    }));
    const out = calibrate(demoProbes);
    await import('../infra/profiles/ProfileManager.js');
    // Persist via Significator knowledge path: create or patch save
    const { loadSave, saveGame } = await import('../infra/persistence/SaveRepository.js');
    const sig = loadSave();
    if (sig) {
      const patched = { ...sig, altitudes: out.altitudes as Record<string, string>, currentStage: out.stage };
      saveGame(patched as unknown as import('../core/domain/Significator.js').Significator);
    }
    console.log(`\n  Onboarding complete — seeded altitudes:`);
    for (const line of ALL_LINES) console.log(`    ${line}: ${out.altitudes[line as keyof typeof out.altitudes]}`);
    console.log(`  Overall stage: ${out.stage}`);
    return 0;
  }
  const s = await services();
  s.index.applyDecay();
  const targets = o.paradigm ? [o.paradigm] : ['n_back', 'stroop', 'go_no_go', 'reaction_time', 'pattern_prediction'];
  const demoSeed = o.demo !== undefined ? (typeof o.demo === 'number' ? o.demo : 9) : undefined;
  const demoCorrectRate = demoSeed !== undefined ? 0.6 : undefined;
  for (const pid of targets) {
    const paradigm = getParadigm(pid);
    if (!paradigm) { console.error(`Unknown paradigm '${pid}'`); continue; }
    console.log(`\n  Calibrating ${paradigm.label} — wide exploration…`);
    const trials: TrialRecord[] = [];
    const adj = createTrialAdjuster(paradigm, initAdaptiveState(0.5), strategyForParadigm(paradigm.id));
    const summary = await runInteractiveGame(paradigm, {
      trialCount: o.trials ?? 12,
      difficultyHint: 0.5,
      demoSeed,
      demoCorrectRate,
      sink: (r) => trials.push(r),
      adjustDifficulty: adj.adjust,
      quiet: true,
    });
    const { levelFromParadigm } = await import('../core/adaptive/AdaptiveDifficultyService.js');
    const endLevel = levelFromParadigm(paradigm, summary.paramsEnd as import('../core/braingame/types.js').NumericParams);
    await s.calibration.put({
      paradigmId: paradigm.id,
      baselineLevel: endLevel,
      lastLevel: endLevel,
      calibratedAt: Date.now(),
      lastPlayedAt: Date.now(),
      sessionsPlayed: (await s.calibration.get(paradigm.id))?.sessionsPlayed ?? 0,
    });
    // Do not credit index — calibration is exploration, not training
    console.log(`  ${paradigm.label}: baseline ${Math.round(endLevel * 100) / 100} · ${summary.feltSenseHint}`);
  }
  await persistIndex();
  console.log(`\n  Calibration complete.`);
  return 0;
}

/** Persist the index after mutations (called by tool handlers). */
async function persistIndex(): Promise<void> {
  if (!cached) return;
  await cached.kv.set(INDEX_KEY, JSON.stringify(cached.index.getState()));
}

/**
 * Build a per-encounter TrainingIntegration for AgenticOrchestrator.
 * Returns undefined when the terminal can't run games (no games for WebUI).
 */
export async function buildTrainingIntegration(): Promise<TrainingIntegration> {
  const s = await services();
  // P1-B4 (Architecture Audit Phase B): expire stale difficulty overrides.
  // Called at every session start so an override from >7 days ago doesn't
  // silently suppress the player's calibrated baseline.
  await s.calibration.expireOverrides().catch(() => undefined);
  const runner: GameRunnerPort = {
    async runGame(paradigmId, opts) {
      const paradigm = getParadigm(paradigmId);
      if (!paradigm) throw new Error(`Unknown paradigm '${paradigmId}'`);
      const start = await resolveStartLevel(s, paradigmId, opts.difficultyHint);
      const adjuster = createTrialAdjuster(paradigm, initAdaptiveState(start.level), strategyForParadigm(paradigmId));
      const trials: TrialRecord[] = [];
      const summary = await runInteractiveGame(paradigm, {
        trialCount: opts.trialCount,
        difficultyHint: start.level,
        sink: (r) => trials.push(r),
        adjustDifficulty: adjuster.adjust,
      });
      return { summary, trials };
    },
  };
  return {
    services: { ...s, fatigue: new FatigueMonitor() },
    runner,
    workout: { plan: null, completed: 0 },
  };
}

export async function buildUnifiedProfileServices(): Promise<UnifiedProfileServices> {
  const s = await services();
  return {
    getSignificator: async () => {
      try {
        const saved = await loadSave();
        return (saved as any) ?? null;
      } catch {
        return null;
      }
    },
    cognitiveIndex: s.index,
    trials: s.trials,
    calibration: s.calibration,
    now: () => Date.now(),
  };
}

// ── mysterium train ──────────────────────────────────────────────────

export async function runTrainCommand(args: string[], jsonMode = false): Promise<number> {
  const parser = new Command();
  parser
    .name('train')
    .option('--free [paradigm]', 'play one game directly, no narrative wrapper')
    .option('--trials <n>', 'override trial count', parseIntSafe)
    .option('--difficulty <x>', 'starting difficulty 0-1', parseFloatSafe)
    .option('--minutes <n>', 'workout length in minutes', parseIntSafe)
    .option('--focus <line>', 'bias the workout toward one line')
    .option('--plan', 'print the planned workout instead of playing')
    .option('--demo [seed]', 'scripted responder for CI smoke tests', parseIntSafe)
    .option('--practice', 'non-timed practice mode: no time pressure, latency not scored')
    .option('--window <ms>', 'override response window in ms (configurable stimulus duration)', parseIntSafe)
    .option('--accessible', 'accessible presentation: symbol/text fallbacks for color-dependent stimuli');

  parser.exitOverride();
  try {
    parser.parse(args, { from: 'user' });
  } catch { /* help requested or bad flag — fall through with defaults */ }
  const o = parser.opts<{ free?: string | boolean; trials?: number; difficulty?: number; minutes?: number; focus?: string; plan?: boolean; demo?: number | boolean; practice?: boolean; window?: number; accessible?: boolean }>();

  const demoOpts = o.demo !== undefined ? { demoSeed: typeof o.demo === 'number' ? o.demo : 7 } : {};
  const accessibilityOpts = {
    practice: Boolean(o.practice),
    windowMsOverride: typeof o.window === 'number' ? o.window : undefined,
    accessible: Boolean(o.accessible),
    jsonEvents: jsonMode,
  };

  // Free play: single game, no planner. Persists telemetry + index + calibration (same path as guided workout).
  if (typeof o.free === 'string') {
    const p = getParadigm(o.free);
    if (!p) {
      console.error(`Unknown game '${o.free}'. Available: n_back, stroop, go_no_go, reaction_time, pattern_prediction`);
      return 1;
    }
    const sFree = await services();
    sFree.index.applyDecay();
    // First-exposure calibration block: when no baseline exists, seed it with a
    // short 6-trial exploration so the scored block starts near the player's band.
    const needsCalibration = !o.difficulty && !(await sFree.calibration.get(p.id));
    if (needsCalibration) {
      const calibTrials: TrialRecord[] = [];
      const calibAdj = createTrialAdjuster(p, initAdaptiveState(0.4), strategyForParadigm(p.id));
      const calibSummary = await runInteractiveGame(p, {
        trialCount: 6,
        difficultyHint: 0.4,
        ...demoOpts,
        ...accessibilityOpts,
        quiet: true,
        sink: (r) => calibTrials.push(r),
        adjustDifficulty: calibAdj.adjust,
      });
      const { levelFromParadigm } = await import('../core/adaptive/AdaptiveDifficultyService.js');
      const calibLevel = levelFromParadigm(p, calibSummary.paramsEnd as import('../core/braingame/types.js').NumericParams);
      // Seed calibration without crediting the index — this was exploration, not training.
      await sFree.calibration.put({
        paradigmId: p.id,
        baselineLevel: calibLevel,
        lastLevel: calibLevel,
        calibratedAt: Date.now(),
        lastPlayedAt: Date.now(),
        sessionsPlayed: 0,
      });
      void calibTrials;
    }
    const start = await resolveStartLevel(sFree, p.id, o.difficulty);
    const freeAdjuster = createTrialAdjuster(p, initAdaptiveState(start.level), strategyForParadigm(p.id));
    const trials: TrialRecord[] = [];
    const summary = await runInteractiveGame(p, {
      trialCount: o.trials ?? p.defaultTrials,
      difficultyHint: start.level,
      ...demoOpts,
      ...accessibilityOpts,
      sink: (r) => trials.push(r),
      adjustDifficulty: freeAdjuster.adjust,
    });
    // Persist telemetry and index (Veil-safe).
    await sFree.trials.appendSession(trials, {
      sessionId: summary.sessionId,
      paradigmId: summary.paradigmId,
      startedAt: Date.now(),
      trialsCompleted: summary.trialsCompleted,
      accuracy: summary.overallAccuracy,
      rtMedianMs: summary.rtMedianMs,
      performance: summary.performance,
    });
    sFree.index.recordGame([...p.domains], summary.performance);
    const prev = await sFree.calibration.get(p.id);
    const { levelFromParadigm } = await import('../core/adaptive/AdaptiveDifficultyService.js');
    const endLevel = levelFromParadigm(p, summary.paramsEnd as import('../core/braingame/types.js').NumericParams);
    await sFree.calibration.put({
      paradigmId: p.id,
      baselineLevel: prev ? prev.baselineLevel * 0.7 + endLevel * 0.3 : endLevel,
      lastLevel: endLevel,
      calibratedAt: prev?.calibratedAt ?? Date.now(),
      lastPlayedAt: Date.now(),
      sessionsPlayed: (prev?.sessionsPlayed ?? 0) + 1,
    });
    await persistIndex();
    const plainFree = jsonMode || !process.stdout.isTTY;
    const line = plainFree
      ? `trials ${summary.trialsCompleted} · ${summary.feltSenseHint}`
      : `trials ${summary.trialsCompleted} · focus ${Math.round(summary.overallAccuracy * 100)}%`;
    if (!plainFree) console.log(`\n  ${chalk.dim(line)}`);
    else if (!jsonMode) console.log(`\n  ${line}`);
    return 0;
  }
  if (o.free === true) {
    console.error('Usage: mysterium train --free <n_back|stroop|go_no_go|reaction_time|pattern_prediction>');
    return 1;
  }

  // Guided workout through the planner.
  const s = await services();
  s.index.applyDecay();
  const focusLine = o.focus as Line | undefined;
  // P1-B3 (Architecture Audit Phase B): resume a persisted plan if it exists
  // and is still fresh (≤24h). Otherwise build a fresh plan and persist it.
  const RESUME_WINDOW_MS = 24 * 60 * 60 * 1000;
  let plan = planWorkout(s.index, { minutes: o.minutes ?? 12, focusLine });
  let resumeContext: { completed: number; startedAt: number } | null = null;
  if (!o.minutes && !o.focus) {
    try {
      const raw = await s.kv.get(PLAN_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { plan: typeof plan; completed: number; startedAt: number };
        if (Date.now() - parsed.startedAt < RESUME_WINDOW_MS && parsed.completed < parsed.plan.items.length) {
          plan = parsed.plan;
          resumeContext = { completed: parsed.completed, startedAt: parsed.startedAt };
          if (!jsonMode) console.log(`  ${chalk.dim(`Resuming workout — ${parsed.completed}/${parsed.plan.items.length} done`)}`);
        }
      }
    } catch { /* no plan or corrupt — ignore */ }
  }
  // Persist the (fresh or resumed) plan immediately so a crash mid-workout
  // doesn't lose progress.
  if (!resumeContext) {
    try {
      await s.kv.set(PLAN_KEY, JSON.stringify({ plan, completed: 0, startedAt: Date.now() }));
    } catch { /* best-effort */ }
  }

  if (o.plan || jsonMode) {
    const payload = {
      items: plan.items.map((i) => ({ paradigmId: i.paradigmId, minutes: i.estimatedMinutes })),
      totalMinutes: plan.totalMinutes,
    };
    if (jsonMode) {
      console.log(JSON.stringify({ type: 'workout_plan', ...payload }));
    } else {
      console.log(`\n${chalk.bold('Planned workout')} ${chalk.dim(`(~${plan.totalMinutes} min)`)}`);
      for (const item of plan.items) {
        const p = getParadigm(item.paradigmId)!;
        console.log(`  ${chalk.cyan('◆')} ${p.label} ${chalk.dim(`— ${item.rationale}`)}`);
      }
    }
    await persistIndex();
    return 0;
  }

  const plainTrain = jsonMode || !process.stdout.isTTY;
  const header = plainTrain
    ? `A sequence of challenges awaits — about ${plan.totalMinutes} minutes`
    : `${chalk.bold.magenta('A sequence of challenges awaits')} ${chalk.dim(`— about ${plan.totalMinutes} minutes`)}`;
  console.log(`\n${header}`);
  const fatigue = new FatigueMonitor();
  // Mutate plan in place when fatigue suggests lighter — track excluded lines
  let excludeLines: Line[] = [];
  let remainingPlan = plan;
  for (let i = 0; i < remainingPlan.items.length; i++) {
    const item = remainingPlan.items[i]!;
    const paradigm = getParadigm(item.paradigmId);
    if (!paradigm) continue;
    const start = await resolveStartLevel(s, item.paradigmId, item.targetLevel);
    const effectiveLevel = excludeLines.length ? Math.max(0.15, start.level - 0.15) : start.level;
    const adjuster = createTrialAdjuster(paradigm, initAdaptiveState(effectiveLevel), strategyForParadigm(paradigm.id));
    const trials: TrialRecord[] = [];
    const summary = await runInteractiveGame(paradigm, {
      trialCount: o.trials,
      difficultyHint: effectiveLevel,
      ...demoOpts,
      ...accessibilityOpts,
      sink: (r) => trials.push(r),
      adjustDifficulty: adjuster.adjust,
    });
    await s.trials.appendSession(trials, {
      sessionId: summary.sessionId,
      paradigmId: summary.paradigmId,
      startedAt: Date.now(),
      trialsCompleted: summary.trialsCompleted,
      accuracy: summary.overallAccuracy,
      rtMedianMs: summary.rtMedianMs,
      performance: summary.performance,
    });
    s.index.recordGame([...paradigm.domains], summary.performance);
    const prev = await s.calibration.get(paradigm.id);
    const { levelFromParadigm } = await import('../core/adaptive/AdaptiveDifficultyService.js');
    const endLevel = levelFromParadigm(paradigm, summary.paramsEnd as import('../core/braingame/types.js').NumericParams);
    await s.calibration.put({
      paradigmId: paradigm.id,
      baselineLevel: prev ? prev.baselineLevel * 0.7 + endLevel * 0.3 : endLevel,
      lastLevel: endLevel,
      calibratedAt: prev?.calibratedAt ?? Date.now(),
      lastPlayedAt: Date.now(),
      sessionsPlayed: (prev?.sessionsPlayed ?? 0) + 1,
    });
    const verdict = fatigue.record(summary.overallAccuracy, summary.rtMedianMs);
    // P1-B3: persist plan progress after each item so resume survives a crash.
    try {
      await s.kv.set(PLAN_KEY, JSON.stringify({ plan: remainingPlan, completed: i + 1, startedAt: resumeContext?.startedAt ?? Date.now() }));
    } catch { /* best-effort */ }
    if (verdict === 'break') {
      console.log(`\n${chalk.yellow.dim('Rest now. The exercises will keep.')}`);
      // Clear the plan on early break — they should pick a new shape next time.
      try { await s.kv.remove(PLAN_KEY); } catch { /* best-effort */ }
      break;
    }
    if (verdict === 'lighter') {
      // Swap-to-lighter: bias remaining items away from fatigued lines and ease difficulty.
      console.log(`\n${chalk.yellow.dim('A gentler rhythm now — easing the next challenge.')}`);
      excludeLines = [...paradigm.domains] as Line[];
      // Re-plan the remainder with exclusion so the next games touch fresh ground.
      const remainingMinutes = remainingPlan.items.slice(i + 1).reduce((s, it) => s + it.estimatedMinutes, 0);
      if (remainingMinutes > 0) {
        const lighterPlan = planWorkout(s.index, { minutes: remainingMinutes, focusLine, excludeLines });
        // Splice lighter items in place of the remaining tail
        remainingPlan = { items: [...remainingPlan.items.slice(0, i + 1), ...lighterPlan.items], totalMinutes: remainingPlan.totalMinutes };
      }
    }
  }
  await persistIndex();
  // P1-B3: clear the plan on natural completion.
  try { await s.kv.remove(PLAN_KEY); } catch { /* best-effort */ }
  const doneLine = plainTrain
    ? 'The practice is complete. Carry the stillness with you.'
    : `${chalk.green.dim('The practice is complete. Carry the stillness with you.')}`;
  console.log(`\n${doneLine}`);
  return 0;
}

// ── mysterium insights ───────────────────────────────────────────────

export async function runInsightsCommand(devMode: boolean, rawArgs: string[] = [], jsonModeExplicit = false): Promise<number> {
  // jsonMode may arrive via global --json (cli-game) or via subcommand --json flag.
  const jsonMode = jsonModeExplicit || rawArgs.includes('--json');
  const daysIdx = rawArgs.indexOf('--days');
  const days = daysIdx >= 0 ? Math.max(1, parseInt(String(rawArgs[daysIdx + 1]), 10) || 14) : 14;
  // P1-B7 (Architecture Audit Phase B): --trend flag prints a per-day
  // accuracy series so the player can see the curve, not just the
  // current snapshot. Default: still the felt-sense view.
  const trendMode = rawArgs.includes('--trend');
  const cutoff = Date.now() - days * 86_400_000;

  const s = await services();
  s.index.applyDecay();
  const snapshot = s.index.snapshot();
  const allRecent = await s.trials.recentSessions(20);
  const recent = allRecent.filter((r) => r.startedAt >= cutoff).slice(0, 10);
  const plain = jsonMode || !process.stdout.isTTY;

  // JSON mode: machine-readable payload for automation / tests.
  if (jsonMode) {
    const payload = {
      type: 'insights',
      days,
      snapshot: snapshot.map((e) => ({
        line: e.line,
        score01: Math.round(e.score01 * 100) / 100,
        trend: e.trend,
        lastPlayedDaysAgo: e.lastPlayedDaysAgo,
        feltSense: s.index.feltSenseFor(e.line),
      })),
      recentSessions: recent.map((r) => ({
        paradigmId: r.paradigmId,
        startedAt: r.startedAt,
        trialsCompleted: r.trialsCompleted,
        accuracy: Math.round(r.accuracy * 100) / 100,
        rtMedianMs: r.rtMedianMs,
      })),
    };
    console.log(JSON.stringify(payload));
    return 0;
  }

  const header = plain
    ? 'How your senses have been resting and rising'
    : `${chalk.bold.cyan('How your senses have been resting and rising')}${chalk.reset}`;
  console.log(`\n${header}${plain ? '' : ''}\n`);
  // Sparkline from recent session accuracies grouped by recency (Veil-safe trend, not raw scores).
  const spark = recent.length >= 2 ? `  ${chalk.dim('trend')} ${renderSparkline(recent.map((r) => r.accuracy).reverse())}  ${chalk.dim(`last ${recent.length} sessions · last ${days}d`)}` : '';
  if (spark) console.log(spark + '\n');

  for (const entry of snapshot) {
    const phrase = s.index.feltSenseFor(entry.line);
    const glyph = plain
      ? (entry.trend === 'rising' ? '↗' : entry.trend === 'decaying' ? '↘' : '·')
      : entry.trend === 'rising' ? chalk.green('↗') : entry.trend === 'decaying' ? chalk.yellow('↘') : chalk.dim('·');
    const bar = plain ? renderBarPlain(entry.score01) : renderBar(entry.score01);
    const devSuffix = devMode ? (plain ? ` (${entry.score01.toFixed(2)}, ${entry.lastPlayedDaysAgo}d)` : chalk.dim(` (${entry.score01.toFixed(2)}, ${entry.lastPlayedDaysAgo}d)`)) : '';
    const phraseOut = plain ? phrase : chalk.dim(phrase);
    console.log(`  ${glyph} ${entry.line.padEnd(14)} ${bar}  ${phraseOut}${devSuffix}`);
  }

  // P1-B7: --trend prints the per-day accuracy curve.
  if (trendMode && recent.length >= 2) {
    console.log(`\n  ${chalk.dim('Daily accuracy trend:')}`);
    const series: { day: string; accuracy: number; trials: number }[] = [];
    const byDay = new Map<string, { accSum: number; count: number; trials: number }>();
    for (const r of recent) {
      const day = new Date(r.startedAt).toISOString().slice(0, 10);
      const cur = byDay.get(day) ?? { accSum: 0, count: 0, trials: 0 };
      cur.accSum += r.accuracy;
      cur.count += 1;
      cur.trials += r.trialsCompleted;
      byDay.set(day, cur);
    }
    for (const [day, v] of [...byDay.entries()].sort()) {
      series.push({ day, accuracy: Math.round((v.accSum / v.count) * 100) / 100, trials: v.trials });
    }
    for (const s of series) {
      const bar = plain ? renderBarPlain(s.accuracy) : renderBar(s.accuracy);
      console.log(`  ${chalk.dim(s.day)} ${bar}  ${chalk.dim(`${Math.round(s.accuracy * 100)}% · ${s.trials} trials`)}`);
    }
  }

  if (recent.length > 0) {
    const lastLine = plain
      ? `Last practiced: ${recent[0]!.paradigmId.replace(/_/g, ' ')} · ${recent.length} recent session${recent.length === 1 ? '' : 's'} (last ${days}d)`
      : chalk.dim(`Last practiced: ${recent[0]!.paradigmId.replace(/_/g, ' ')} · ${recent.length} recent session${recent.length === 1 ? '' : 's'} (last ${days}d)`);
    console.log(`\n  ${lastLine}`);
  } else if (allRecent.length > 0) {
    const msg = plain ? `No practices in the last ${days} days — try mysterium train to begin.` : `${chalk.dim(`No practices in the last ${days} days — try`)} ${chalk.bold('mysterium train')}${chalk.dim(' to begin.')}`;
    console.log(`\n  ${msg} ${plain ? '' : chalk.dim(`(${allRecent.length} older session${allRecent.length === 1 ? '' : 's'} outside window)`)}`);
  } else {
    const msg = plain ? 'No practices yet — try mysterium train to begin.' : `${chalk.dim('No practices yet — try')} ${chalk.bold('mysterium train')}${chalk.dim(' to begin.')}`;
    console.log(`\n  ${msg}`);
  }
  if (!plain) console.log(chalk.dim(`  Tip: mysterium insights --days 30 · mysterium export --format csv`));
  console.log('');
  return 0;
}

function renderBar(score01: number): string {
  const cells = Math.round(Math.min(1, Math.max(0, score01)) * 10);
  const filled = '◆'.repeat(cells);
  const hollow = '◇'.repeat(10 - cells);
  return `${chalk.cyan(filled)}${chalk.dim(hollow)}`;
}

function renderBarPlain(score01: number): string {
  const cells = Math.round(Math.min(1, Math.max(0, score01)) * 10);
  return `[${'='.repeat(cells)}${' '.repeat(10 - cells)}]`;
}

function renderSparkline(values: readonly number[]): string {
  const blocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v) => blocks[Math.min(7, Math.max(0, Math.round(((v - min) / range) * 7)))]!).join('');
}

function parseIntSafe(v: string): number {
  return Math.abs(parseInt(v, 10));
}
function parseFloatSafe(v: string): number {
  return Math.min(1, Math.max(0, parseFloat(v)));
}

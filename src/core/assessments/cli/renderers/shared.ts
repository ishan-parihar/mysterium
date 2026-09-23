/**
 * Shared renderer plumbing — the palette, the difficulty tables and the option/task helpers.
 *
 * Split out of `TaskRenderers.ts` (module-cohesion audit item 3): 24 renderers sharing one
 * import block read as peers of each other. Each group file names the task family it renders;
 * `../TaskRenderers.ts` re-exports the whole set, so importers are unchanged.
 */
import type { AssessmentTask, TrialResult } from '../../types.js';
import type { AskUserQuestionParams } from '../../agentTypes.js';
import { ALL_LINES } from '../../../domain/Line.js';
import type { Line } from '../../../domain/Line.js';

/**
 * What every renderer returns: the prompt to ask, and the evaluator that turns the answer into
 * trials. Named here rather than repeated inline 24 times — the dispatch table in
 * `../TaskRenderers.ts` needs to say "a renderer" in one line to stay readable.
 */
export type TaskRenderer = (task: AssessmentTask) => {
  prompt: AskUserQuestionParams;
  evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult;
};

// ── ANSI helpers (must be at top for const hoisting) ──────────────────

export const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m',
  magenta: '\x1b[35m', cyan: '\x1b[36m', red: '\x1b[31m',
};

// ── Option type with drive metadata ───────────────────────────────────

export interface DriveOption {
  label: string;
  description: string;
  drive: 'agency' | 'communion' | 'eros' | 'agape';
  polarity: 'sto' | 'sts' | 'neutral';
  /** Score multiplier for correctness (1.0 = correct, 0.5 = partial, 0.0 = wrong) */
  correctnessScore: number;
}

/**
 * Shuffle an array in place (Fisher-Yates). Returns the same array.
 */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

// ── Brain-game MCQ symbols/STAGE_DIFFICULTY PURGED for n_back/stroop/go_no_go/hold/pattern_prediction — use ParadigmDefinitions (src/core/braingame/paradigms/*)
// Minimal developmental probe support retained below for line probes (Cognitive/Interpersonal etc.)
export const NBACK_SYMBOLS_DEV = ['◆', '●', '▲', '■', '★', '◇'];

const STAGE_DIFFICULTY_DEV: Record<string, { symbolPool: readonly string[]; holdDurationMs: number; stroopColors: readonly string[]; goStimuli: readonly string[] }> = {
  Infrared: { symbolPool: NBACK_SYMBOLS_DEV.slice(0, 3), holdDurationMs: 3000, stroopColors: ['R','G','B'], goStimuli: ['⚔','🛡'] },
  Magenta: { symbolPool: NBACK_SYMBOLS_DEV.slice(0, 4), holdDurationMs: 4000, stroopColors: ['R','G','B'], goStimuli: ['⚔','🛡'] },
  Red: { symbolPool: NBACK_SYMBOLS_DEV, holdDurationMs: 5000, stroopColors: ['R','G','B'], goStimuli: ['⚔','🛡'] },
  Amber: { symbolPool: NBACK_SYMBOLS_DEV, holdDurationMs: 6000, stroopColors: ['R','G','B'], goStimuli: ['⚔','🛡'] },
  Orange: { symbolPool: NBACK_SYMBOLS_DEV, holdDurationMs: 7000, stroopColors: ['R','G','B'], goStimuli: ['⚔','🛡'] },
  Green: { symbolPool: NBACK_SYMBOLS_DEV, holdDurationMs: 8000, stroopColors: ['R','G','B'], goStimuli: ['⚔','🛡'] },
  Teal: { symbolPool: NBACK_SYMBOLS_DEV, holdDurationMs: 9000, stroopColors: ['R','G','B'], goStimuli: ['⚔','🛡'] },
  Turquoise: { symbolPool: NBACK_SYMBOLS_DEV, holdDurationMs: 10000, stroopColors: ['R','G','B'], goStimuli: ['⚔','🛡'] },
};

export function getDifficulty(stage?: string): { symbolPool: readonly string[]; holdDurationMs: number; stroopColors: readonly string[]; goStimuli: readonly string[] } {
  return STAGE_DIFFICULTY_DEV[stage ?? 'Red'] ?? STAGE_DIFFICULTY_DEV['Red']!;
}

// ── Task type display names ────────────────────────────────────────────

export const TASK_TYPE_LABELS: Record<string, string> = {
  n_back: 'Working Memory',
  stroop: 'Inhibitory Control',
  go_no_go: 'Impulse Regulation',
  hold: 'Attentional Hold',
  pattern_prediction: 'Pattern Recognition',
  emotion_identification: 'Emotional Literacy',
  dilemma: 'Moral Reasoning',
  scenario: 'Situational Judgment',
  value_ranking: 'Value Prioritization',
  self_report: 'Self-Inquiry',
  reaction_time: 'Reaction Speed',
  rhythm: 'Rhythmic Attunement',
  imitation: 'Imitative Learning',
  cooperation: 'Cooperative Dynamics',
  llm_dialogue: 'Reflective Dialogue',
};

// ── Line-Specific Probe Renderers (G.12) ────────────────────────────
//
// Each intelligence line has unique interaction mechanics per foundations/12.
// These wrap the task-type renderers with line-specific options, headers,
// and evaluation dimensions so each line probes its developmental structure.

/** Extract the line from task parameters, or null if not specified. */
export function getLine(task: AssessmentTask): Line | null {
  const raw = task.parameters.line as string | undefined;
  if (raw && (ALL_LINES as readonly string[]).includes(raw)) return raw as Line;
  return null;
}

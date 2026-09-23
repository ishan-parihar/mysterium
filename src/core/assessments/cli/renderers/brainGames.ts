/**
 * Brain-game renderers — the timed tasks whose difficulty scales with stage.
 *
 * Split out of `TaskRenderers.ts` (module-cohesion audit item 3): 24 renderers sharing one
 * import block read as peers of each other. Each group file names the task family it renders;
 * `../TaskRenderers.ts` re-exports the whole set, so importers are unchanged.
 */
import type { AssessmentTask, TrialResult } from '../../types.js';
import type { AskUserQuestionParams } from '../../agentTypes.js';

// ── N-Back Renderer ───────────────────────────────────────────────────

/**
 * Render an n-back task: generate a symbol sequence and ask the player
 * to identify which positions match the item from n steps back.
 */
export function renderNBack(_task: AssessmentTask): { prompt: AskUserQuestionParams; evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult; } {
  // PURGED — brain games now run via BrainGameEngine (run_brain_game tool). This stub keeps the export alive for type-checking.
  return {
    prompt: { questions: [{ question: '[PURGED] n_back — use run_brain_game', header: 'Working Memory', options: [{ label: 'Continue', description: 'Use brain game' }], allowWriteIn: true, multiSelect: false }] },
    evaluate: (_answer: string, startTimeMs: number, endTimeMs: number): TrialResult => ({ taskId: _task.id, timestamp: startTimeMs, dimensions: { accuracy: 0.5 }, rawResponse: {}, durationMs: endTimeMs - startTimeMs }),
  };
}

// ── Stroop Renderer ───────────────────────────────────────────────────

/**
 * Render a Stroop task: show a word printed in a different ink color,
 * ask the player to name the INK color (not the word).
 */
export function renderStroop(_task: AssessmentTask): { prompt: AskUserQuestionParams; evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult; } {
  return {
    prompt: { questions: [{ question: '[PURGED] stroop — use run_brain_game', header: 'Inhibitory Control', options: [{ label: 'Continue', description: 'Use brain game' }], allowWriteIn: true, multiSelect: false }] },
    evaluate: (_answer: string, startTimeMs: number, endTimeMs: number): TrialResult => ({ taskId: _task.id, timestamp: startTimeMs, dimensions: { accuracy: 0.5 }, rawResponse: {}, durationMs: endTimeMs - startTimeMs }),
  };
}

// ── Go/No-Go Renderer ────────────────────────────────────────────────

/**
 * Render a Go/No-Go task: show stimuli and ask the player to count
 * how many "Go" (⚔) stimuli appeared vs "No-Go" (🛡) stimuli.
 */
export function renderGoNoGo(_task: AssessmentTask): { prompt: AskUserQuestionParams; evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult; } {
  return {
    prompt: { questions: [{ question: '[PURGED] go_no_go — use run_brain_game', header: 'Impulse Regulation', options: [{ label: 'Continue', description: 'Use brain game' }], allowWriteIn: true, multiSelect: false }] },
    evaluate: (_answer: string, startTimeMs: number, endTimeMs: number): TrialResult => ({ taskId: _task.id, timestamp: startTimeMs, dimensions: { accuracy: 0.5 }, rawResponse: {}, durationMs: endTimeMs - startTimeMs }),
  };
}

// ── Hold Task Renderer ───────────────────────────────────────────────

/**
 * Render a Hold task: show items to remember, then ask the player to recall.
 */
export function renderHold(_task: AssessmentTask): { prompt: AskUserQuestionParams; evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult; } {
  return {
    prompt: { questions: [{ question: '[PURGED] hold — use run_brain_game', header: 'Attentional Hold', options: [{ label: 'Continue', description: 'Use brain game' }], allowWriteIn: true, multiSelect: false }] },
    evaluate: (_answer: string, startTimeMs: number, endTimeMs: number): TrialResult => ({ taskId: _task.id, timestamp: startTimeMs, dimensions: { accuracy: 0.5 }, rawResponse: {}, durationMs: endTimeMs - startTimeMs }),
  };
}

// ── Pattern Prediction Renderer ──────────────────────────────────────

export function renderPatternPrediction(_task: AssessmentTask): { prompt: AskUserQuestionParams; evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult; } {
  return {
    prompt: { questions: [{ question: '[PURGED] pattern_prediction — use run_brain_game', header: 'Pattern Recognition', options: [{ label: 'Continue', description: 'Use brain game' }], allowWriteIn: true, multiSelect: false }] },
    evaluate: (_answer: string, startTimeMs: number, endTimeMs: number): TrialResult => ({ taskId: _task.id, timestamp: startTimeMs, dimensions: { accuracy: 0.5 }, rawResponse: {}, durationMs: endTimeMs - startTimeMs }),
  };
}

// ── Reaction Time Renderer ──────────────────────────────────────────

export function renderReactionTime(_task: AssessmentTask): { prompt: AskUserQuestionParams; evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult; } {
  return {
    prompt: { questions: [{ question: '[PURGED] reaction_time — use run_brain_game', header: 'Reaction Speed', options: [{ label: 'Continue', description: 'Use brain game' }], allowWriteIn: true, multiSelect: false }] },
    evaluate: (_answer: string, startTimeMs: number, endTimeMs: number): TrialResult => ({ taskId: _task.id, timestamp: startTimeMs, dimensions: { accuracy: 0.5 }, rawResponse: {}, durationMs: endTimeMs - startTimeMs }),
  };
}

/**
 * The generic renderer — the task type with no authored renderer of its own.
 *
 * Split out of `TaskRenderers.ts` (module-cohesion audit item 3): 24 renderers sharing one
 * import block read as peers of each other. Each group file names the task family it renders;
 * `../TaskRenderers.ts` re-exports the whole set, so importers are unchanged.
 */
import type { AssessmentTask, TrialResult } from '../../types.js';
import type { AskUserQuestionParams } from '../../agentTypes.js';
import { C, type DriveOption, shuffle, TASK_TYPE_LABELS } from './shared.js';

// ── Generic Fallback Renderer ────────────────────────────────────────

/**
 * Generic renderer for task types without specific implementations.
 */
export function renderGeneric(task: AssessmentTask): {
  prompt: AskUserQuestionParams;
  evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult;
} {
  const label = TASK_TYPE_LABELS[task.type] ?? task.type;

  const options: DriveOption[] = [
    { label: 'Fully engaged', description: 'I gave it my full attention and effort', drive: 'agency', polarity: 'neutral', correctnessScore: 0.8 },
    { label: 'Partially engaged', description: 'I was somewhat distracted or uncertain', drive: 'communion', polarity: 'neutral', correctnessScore: 0.6 },
    { label: 'Withdrew', description: 'I chose not to engage fully', drive: 'agape', polarity: 'neutral', correctnessScore: 0.3 },
    { label: 'Transcended', description: 'I saw beyond the surface of the task', drive: 'eros', polarity: 'neutral', correctnessScore: 0.7 },
  ];
  shuffle(options);

  return {
    prompt: {
      questions: [{
        question: `${task.description}\n\n${C.bold}How did you engage with this challenge?${C.reset}`,
        header: label,
        options: options.map(o => ({ label: o.label, description: o.description })),
        allowWriteIn: true,
        multiSelect: false,
      }],
    },
    evaluate: (answer: string, startTimeMs: number, endTimeMs: number): TrialResult => {
      const durationMs = endTimeMs - startTimeMs;

      // Detect known MCQ labels for reliable scoring
      const answerLower = answer.toLowerCase().trim();
      const matchedOpt = options.find(o => answerLower.includes(o.label.toLowerCase()));

      // Use correctnessScore from matched option, with word-count bonus for write-ins
      const wordCount = answer.split(/\s+/).filter(Boolean).length;
      const isWriteIn = !matchedOpt && wordCount > 3;

      const baseAccuracy = matchedOpt
        ? matchedOpt.correctnessScore
        : Math.min(0.9, 0.4 + wordCount * 0.02); // Write-in bonus

      const depth = matchedOpt
        ? matchedOpt.correctnessScore
        : wordCount > 15 ? 0.8 : wordCount > 5 ? 0.6 : 0.4;

      return {
        taskId: task.id,
        timestamp: startTimeMs,
        dimensions: {
          accuracy: baseAccuracy,
          depth,
          response_time: durationMs < 30000 ? 0.7 : 0.5,
        },
        rawResponse: {
          answer, wordCount, isWriteIn,
          matchedDrive: matchedOpt?.drive ?? null,
          matchedPolarity: matchedOpt?.polarity ?? 'neutral',
          correctnessScore: matchedOpt?.correctnessScore ?? Math.min(0.9, 0.4 + wordCount * 0.02),
        },
        durationMs,
      };
    },
  };
}

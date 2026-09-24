/**
 * The task presenters — how a module's chosen task becomes a question the player answers.
 *
 * Cohesion item 4, collaborators 4–6 (module-cohesion audit §4): the three methods the orchestrator
 * used to own alongside context-building and consequence processing. Extracted as module functions
 * with the state they read passed in — `presentModuleTask` receives the history and the UI handler,
 * and reports back through `setRendererEvaluate`/`setTaskStartTime` so the orchestrator's trial
 * evaluation (timing + accuracy capture) stays wired exactly as before. Nothing here decides
 * WHETHER a task is asked; the orchestrator keeps the loop, this keeps the shape.
 */

import type { StageAssessment, AssessmentTask, TaskType } from './types.js';
import type { Modality } from '../domain/enums.js';
import type { ConsequenceRecord } from '../domain/ConsequenceRecord.js';
import type { AskUserQuestionParams, AskUserQuestionResult } from './agentTypes.js';
import type { AgenticUIHandler } from './AgenticOrchestrator.js';
import { getRenderer } from './cli/TaskRenderers.js';
import { briefHistory } from './promptBlocks.js';

/** Wire-backs so the orchestrator's trial evaluator can capture timing + accuracy (see above). */
let _rendererEvaluate: ((answer: string, startMs: number, endMs: number) => any) | null = null;
let _taskStartTime = 0;
/**
 * The question text this presenter ACTUALLY asked.
 *
 * The renderer composes the prompt (the continuity prefix, the holon framing, the task text) and the
 * orchestrator cannot reconstruct it — so it is reported back here rather than rebuilt, the same way
 * the evaluator and the start time are. It exists because `F7` declared `questionText` on the
 * consequence record and the module-assessment path — the one every production encounter takes —
 * never set it, so the encounter log recorded no question and the campaign series had nothing to
 * pair an answer with.
 */
let _presentedQuestionText: string | undefined = undefined;
export function setRendererEvaluate(f: ((answer: string, startMs: number, endMs: number) => any) | null): void { _rendererEvaluate = f; }
export function setTaskStartTime(t: number): void { _taskStartTime = t; }
export function rendererEvaluate(): ((answer: string, startMs: number, endMs: number) => any) | null { return _rendererEvaluate; }
export function taskStartTime(): number { return _taskStartTime; }
export function presentedQuestionText(): string | undefined { return _presentedQuestionText; }

  /**
   * Select the best assessment task from the module based on encounter modality.
   */
export function selectTaskForModality(module: StageAssessment, modality: Modality): AssessmentTask {
  // All task types supported by TaskRenderers
  const ALL_RENDERABLE: readonly TaskType[] = [
    'n_back', 'stroop', 'go_no_go', 'hold', 'pattern_prediction',
    'emotion_identification', 'dilemma', 'scenario', 'self_report',
    'value_ranking', 'reaction_time', 'rhythm', 'cooperation', 'imitation',
  ];

  // Modality-specific preference order (first match wins)
  const modalityPreference: Record<string, readonly TaskType[]> = {
    Deterministic: ['n_back', 'stroop', 'go_no_go', 'hold', 'reaction_time', 'rhythm', 'pattern_prediction'],
    LanguageReflective: ['llm_dialogue', 'self_report', 'emotion_identification', 'scenario', 'dilemma'],
    ScenarioChoice: ['dilemma', 'scenario', 'emotion_identification', 'self_report'],
    Embodied: ['hold', 'rhythm', 'imitation', 'reaction_time', 'go_no_go'],
    Strategic: ['pattern_prediction', 'value_ranking', 'n_back', 'stroop'],
    SocialCooperative: ['cooperation', 'dilemma', 'emotion_identification', 'scenario', 'self_report'],
    ImmersiveRPG: ['scenario', 'dilemma', 'llm_dialogue', 'emotion_identification', 'self_report'],
  };

  const preferred = modalityPreference[modality] ?? ALL_RENDERABLE;

  // G.1: Try preferred types first, then fall back to any renderable type in the module
  for (const prefType of [...preferred, ...ALL_RENDERABLE]) {
    const match = module.tasks.find(t => t.type === prefType);
    if (match) return match;
  }

  // Last resort: generate a modality-appropriate task
  return generateModalityFallbackTask(modality, module);
}


  /**
   * Generate a generic task appropriate for the modality when the module
   * doesn't have any of the preferred task types. This ensures ScenarioChoice
   * always shows a dilemma, ImmersiveRPG always shows a scenario, etc.
   */
export function generateModalityFallbackTask(modality: Modality, module: StageAssessment): AssessmentTask {
  const prefix = `${module.line.toLowerCase()}-${module.stage.toLowerCase()}`;
  // Inject stage into all generated task parameters so TaskRenderers can use it for difficulty scaling
  const stage = module.stage;
  switch (modality) {
    case 'ScenarioChoice':
    case 'ImmersiveRPG':
      return {
        id: `generic-dilemma-${prefix}`,
        type: 'dilemma',
        description: `A developmental dilemma at the ${module.stage} stage of ${module.line} development`,
        parameters: { dilemmaType: 'developmental', choices: 4, stage, line: module.line },
        measures: ['depth', 'coherence'],
      };
    case 'LanguageReflective':
      return {
        id: `generic-self-report-${prefix}`,
        type: 'self_report',
        description: `Self-inquiry reflection at the ${module.stage} stage of ${module.line} development`,
        parameters: { stage },
        measures: ['depth', 'metacognition'],
      };
    case 'SocialCooperative':
      return {
        id: `generic-cooperation-${prefix}`,
        type: 'cooperation',
        description: `Cooperative dynamics at the ${module.stage} stage of ${module.line} development`,
        parameters: { stage },
        measures: ['depth', 'coherence'],
      };
    case 'Embodied':
      return {
        id: `generic-hold-${prefix}`,
        type: 'hold',
        description: `Attentional hold at the ${module.stage} stage of ${module.line} development`,
        parameters: { items: 3, holdDurationMs: 5000, stage },
        measures: ['accuracy', 'consistency'],
      };
    case 'Strategic':
      return {
        id: `generic-pattern-${prefix}`,
        type: 'pattern_prediction',
        description: `Pattern recognition at the ${module.stage} stage of ${module.line} development`,
        parameters: { disks: 3, attempts: 4, stage },
        measures: ['accuracy', 'complexity_handled'],
      };
    case 'Deterministic':
    default:
      return module.tasks[0] ?? {
        id: `generic-nback-${prefix}`,
        type: 'n_back',
        description: `Working memory challenge at the ${module.stage} stage of ${module.line} development`,
        parameters: { n: 2, trials: 12, stage },
        measures: ['accuracy', 'response_time'],
      };
  }
}


  /**
   * Present a module task as a narrative challenge via the UI handler.
   * Translates the assessment task type to CLI-friendly MCQ options.
   */
export async function presentModuleTask(
  module: StageAssessment,
  task: AssessmentTask,
  _modality: Modality,
  holonName: string,
  history: readonly ConsequenceRecord[],
  ui: AgenticUIHandler,
): Promise<AskUserQuestionResult> {
  // Use TaskRenderers to get a real assessment prompt with task-specific options
  // and a response evaluator that captures TrialResult data (timing, accuracy)
  // Inject stage AND line into task parameters so TaskRenderers can use stage-specific
  // difficulty and line-specific dilemma content
  const taskWithStage = { ...task, parameters: { ...task.parameters, stage: module.stage, line: module.line } };
  const renderer = getRenderer(taskWithStage);

  // Store the renderer's evaluate function so runModuleAssessment can use it
  setRendererEvaluate(renderer.evaluate);
  setTaskStartTime(Date.now());

  // Prepend holon-narrative framing to the question with continuity context
  const historyPrefix = briefHistory(history);
  const enrichedPrompt: AskUserQuestionParams = {
    questions: renderer.prompt.questions.map(q => ({
      ...q,
      question: `${historyPrefix}${holonName} presents a challenge.\n\n${q.question}`,
      header: q.header, // Keep the renderer's meaningful header
    })),
  };

  // Report back what was asked (see `presentedQuestionText`) — the LAST question is the one the
  // answer belongs to, matching how the answer is read (`answers[0]` on a single-question prompt).
  _presentedQuestionText = enrichedPrompt.questions[enrichedPrompt.questions.length - 1]?.question;

  return ui.askUser(enrichedPrompt);
}

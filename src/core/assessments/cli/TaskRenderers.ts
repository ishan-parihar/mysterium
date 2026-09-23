/**
 * TaskRenderers — (PURGED BRAIN-GAME MCQ)
 * Canonical brain-game tasks (n_back, stroop, go_no_go, hold, pattern_prediction, reaction_time, rhythm)
 * are now served by src/core/braingame/paradigms/* via BrainGameEngine + AdaptiveDifficultyService.
 * This file now only serves developmental task types (dilemma, self_report, etc.).
 * Legacy MCQ wrappers for brain games have been removed — use run_brain_game tool.
 *
 * Each renderer produces an AskUserQuestionParams-compatible prompt and a
 * response evaluator that generates TrialResult[] for the scoring engine.
 *
 * Key design:
 * - Options include drive/polarity metadata for differentiated scoring
 * - Correct answer position is shuffled to prevent gaming
 * - Each option maps to a specific drive expression
 *
 * **This file is the roster.** The renderers were split by task family into `renderers/` (the
 * module-cohesion audit's item 3): 24 renderers sharing one import block read as peers of each
 * other. Each family file names the tasks it renders and imports only what it uses; this index
 * re-exports the whole set, so every importer — `AgenticOrchestrator` included — is unchanged, and
 * `getRenderer` stays here because it is the one place that reads ALL of them: the dispatch table
 * IS the list of renderers.
 */
import type { AssessmentTask, TrialResult } from '../types.js';
import type { AskUserQuestionParams } from '../agentTypes.js';
import type { Line } from '../../domain/Line.js';

import type { TaskRenderer } from './renderers/shared.js';
import { getLine } from './renderers/shared.js';
import {
  renderGoNoGo,
  renderHold,
  renderNBack,
  renderPatternPrediction,
  renderReactionTime,
  renderStroop,
} from './renderers/brainGames.js';
import { renderCooperation, renderDilemma, renderImitation } from './renderers/social.js';
import {
  renderEmotionIdentification,
  renderRhythm,
  renderSelfReport,
  renderValueRanking,
} from './renderers/reflective.js';
import {
  renderCognitiveProbe,
  renderEmotionalProbe,
  renderInterpersonalProbe,
  renderIntrapersonalProbe,
  renderMoralProbe,
  renderSomaticProbe,
  renderSpiritualProbe,
  renderWillpowerProbe,
} from './renderers/probes.js';
import { renderGeneric } from './renderers/generic.js';

// The public surface, exactly as it was before the split: the 24 renderers plus the task-type
// labels. Re-exported by name rather than `export *` so the family modules stay free to hold
// private helpers (the palette, the difficulty tables, the option builders) without widening this
// module's surface by accident.
export { TASK_TYPE_LABELS } from './renderers/shared.js';
export {
  renderGoNoGo,
  renderHold,
  renderNBack,
  renderPatternPrediction,
  renderReactionTime,
  renderStroop,
} from './renderers/brainGames.js';
export { renderCooperation, renderDilemma, renderImitation } from './renderers/social.js';
export {
  renderEmotionIdentification,
  renderRhythm,
  renderSelfReport,
  renderValueRanking,
} from './renderers/reflective.js';
export {
  renderCognitiveProbe,
  renderEmotionalProbe,
  renderInterpersonalProbe,
  renderIntrapersonalProbe,
  renderLineProbe,
  renderMoralProbe,
  renderSomaticProbe,
  renderSpiritualProbe,
  renderWillpowerProbe,
} from './renderers/probes.js';
export { renderGeneric } from './renderers/generic.js';

/** The task-type dispatch — the ONE place that maps a task to its renderer. */
export function getRenderer(task: AssessmentTask): {
  prompt: AskUserQuestionParams;
  evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult;
} {
  const line = getLine(task);

  if (line) {
    const LINE_RENDERERS: Record<Line, TaskRenderer> = {
      Cognitive: renderCognitiveProbe,
      Emotional: renderEmotionalProbe,
      Moral: renderMoralProbe,
      Intrapersonal: renderIntrapersonalProbe,
      Spiritual: renderSpiritualProbe,
      Somatic: renderSomaticProbe,
      Willpower: renderWillpowerProbe,
      Interpersonal: renderInterpersonalProbe,
    };
    return LINE_RENDERERS[line](task);
  }

  switch (task.type) {
    case 'n_back': return renderNBack(task);
    case 'stroop': return renderStroop(task);
    case 'go_no_go': return renderGoNoGo(task);
    case 'hold': return renderHold(task);
    case 'pattern_prediction': return renderPatternPrediction(task);
    case 'emotion_identification': return renderEmotionIdentification(task);
    case 'dilemma':
    case 'scenario': return renderDilemma(task);
    case 'self_report': return renderSelfReport(task);
    case 'value_ranking': return renderValueRanking(task);
    case 'reaction_time': return renderReactionTime(task);
    case 'rhythm': return renderRhythm(task);
    case 'cooperation': return renderCooperation(task);
    case 'imitation': return renderImitation(task);
    default: return renderGeneric(task);
  }
}

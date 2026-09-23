/**
 * The fallback narrative — collaborator 3 of the `AgenticOrchestrator` extraction (module-cohesion
 * audit item 4).
 *
 * This is what the player reads when the model is unavailable, so it carries the whole
 * degradation contract on the narrative side alone: the session must still feel like a session, and
 * the Veil must hold. Two consequences are visible in the code and are the reason it is its own
 * module rather than a branch inside the class:
 *
 *  - **The player's words are never quoted back.** The narrative acknowledges the offering and its
 *    SHAPE (brief, substantial, or absent), not its content — quoting a write-in into a summary is
 *    how a reflective practice starts to read like a transcript.
 *  - **Silence is a valid response, not a missing one.** An empty offering gets its own band rather
 *    than the generic path, because "you said nothing" and "the engine could not tell" must not
 *    render the same way.
 *
 * Kept as a pure function of `(line, stage, playerResponse, isSelfReflection)` — the same shape the
 * private method had, minus the `this` that made it untestable.
 */
import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';

/** A narrative chosen at random from a band, so repeats of the same shape do not repeat verbatim. */
function pick(openers: readonly string[]): string {
  return openers[Math.floor(Math.random() * openers.length)]!;
}

/**
 * Render the fallback narrative for one encounter.
 *
 * Thresholds on the offering's length are the engine's existing bands: under 15 characters is a
 * sparse offering, over 100 is a substantial one — they describe the shape of the response, not its
 * quality, and the wording for each never implies the player did well or badly.
 */
export function buildFallbackNarrative(
  line: Line,
  stage: Stage,
  playerResponse: string,
  isSelfReflection: boolean,
): string {
  const lineWord = line.toLowerCase();

  // If the player offered nothing, use a contemplative silence narrative.
  if (!playerResponse || playerResponse.trim().length === 0) {
    return pick([
      `The question hung in the air. Silence answered — not empty, but full of what could not yet be spoken.`,
      `A long pause. The moment stretched, holding something that had no words. The ${lineWord} dimension waited, patient.`,
      `No answer came. The silence itself was a response — a holding, a protecting, a thing too tender to name.`,
    ]);
  }

  // For self-reflection (Direct Questioning), generate a reflective narrative that acknowledges the
  // player's offering without quoting it verbatim.
  if (isSelfReflection) {
    const responseLen = playerResponse.trim().length;
    const stageWord = stage.toLowerCase();
    const openers = responseLen < 15
      ? [
          `Something was offered — brief, almost missed. The ${lineWord} dimension received it and held it up to the light. There was more beneath the surface, but the surface itself was honest.`,
          `A few words, and then stillness. The ${lineWord} question found its answer in the space between what was said and what was meant. The moment passed, but something had been named.`,
          `The offering was sparse but true. At the ${stageWord} stage, ${lineWord} work often begins this way — a single thread pulled, and the fabric shifts.`,
        ]
      : responseLen > 100
        ? [
            `Words came freely, weaving a longer thread. The ${lineWord} dimension received the full offering — there was thoughtfulness in it, a willingness to stay with the question. At the ${stageWord} stage, this is the work: to speak what is true and let the speaking itself be the practice.`,
            `The reflection ran deep, touching multiple edges. The ${lineWord} question had opened a door, and the player walked through it. Something was seen that had not been seen before — or something was named that had only been felt.`,
            `A substantial offering. The ${lineWord} dimension holds complexity at the ${stageWord} stage, and the player met that complexity. The narrative closes here, but the reflection continues beneath the surface.`,
          ]
        : [
            `The ${lineWord} question was met with something honest. Not everything was said, but what was said was true. At the ${stageWord} stage, this is enough — the door was opened, and the player chose to walk through it.`,
            `Something was named. The ${lineWord} dimension received the offering and reflected it back, changed. The ${stageWord} stage holds this kind of seeing — partial, but real.`,
            `The moment held. The ${lineWord} question found its response, and the response found its ground. Not a completion, but a beginning — something moved that will continue to move.`,
          ];
    return pick(openers);
  }

  // Non-self-reflection fallbacks (task and module encounters) get the generic narrative.
  return `The ${lineWord} encounter at the ${stage.toLowerCase()} stage unfolded. ${playerResponse ? 'The player met the moment with something genuine.' : 'The moment passed, leaving a subtle shift.'} The ${lineWord} dimension received what was offered and held it.`;
}

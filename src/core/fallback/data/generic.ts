/**
 * The Generic corpus — the last resort per modality when no line-specific pool covers the cell.
 *
 * Split out of `FallbackProvider.ts` (module-cohesion audit item 5): this module is DATA,
 * authored against `schema.ts`. Nothing here decides anything — the pools are selected in
 * `../FallbackProvider.ts`, where `LR_BY_LINE_*`/`SC_BY_LINE_*` route each cell to a pool.
 */
import { driveOptionsToMCQ, type FallbackContent } from './schema.js';

export // ============================================================================
// Generic fallbacks for modality × stage combos not covered above
// ============================================================================

const GENERIC_LANGUAGE_REFLECTIVE: FallbackContent = {
  prompt: 'What is present for you right now?',
  followUps: ['What does that tell you?', 'Where does it lead?'],
};

export const GENERIC_SCENARIO_CHOICE: FallbackContent = {
  scenario: 'A crossroads appears. Each path carries weight.',
  options: driveOptionsToMCQ({
    agency: 'Take the direct route — trust your capacity',
    communion: 'Consult those affected before deciding',
    eros: 'Follow what calls you — let longing be the compass',
    agape: 'Hold the complexity — every path has cost',
  }),
};

export const GENERIC_DETERMINISTIC: FallbackContent = {
  framing: 'Focus. The moment demands clarity.',
};

export const GENERIC_STRATEGIC: FallbackContent = {
  scenario: 'Resources are limited. The map shows three routes to the objective, each with hidden risks.',
  options: driveOptionsToMCQ({
    agency: 'Take the shortest path — speed over safety',
    communion: 'Share the plan — collective intelligence is stronger',
    eros: 'Choose the path that teaches you the most',
    agape: 'Pick the route that causes least harm to all parties',
  }),
};

export const GENERIC_EMBODIED: FallbackContent = {
  prompt: 'Close your eyes. Where do you feel tension in your body right now?',
  followUps: ['What does that tension want to do?', 'Breathe into it. What shifts?'],
};

export const GENERIC_SOCIAL_COOPERATIVE: FallbackContent = {
  scenario: 'The scouts look to you. The path splits — one leads through danger, the other through uncertainty. They need your word.',
  options: driveOptionsToMCQ({
    agency: 'Lead — you will not ask them to go where you will not',
    communion: 'Ask the group — every voice matters in this decision',
    eros: 'Choose the path that will make them grow, even if it\'s harder',
    agape: 'Find the third way — neither danger nor avoidance, but something new',
  }),
};

export const GENERIC_IMMERSIVE_RPG: FallbackContent = {
  prompt: 'The world stretches before you. A path winds through unfamiliar terrain. Something waits ahead — you can feel it.',
  followUps: ['What draws you forward?', 'What do you leave behind?'],
};

export const GENERIC_FALLBACK: FallbackContent = {
  prompt: 'What is present for you right now?',
  followUps: ['What does that tell you?', 'Where does it lead?'],
};

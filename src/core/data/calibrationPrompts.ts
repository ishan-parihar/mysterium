/**
 * Calibration data — shared between CLI (runQuickCalibration) and WebUI (/onboarding).
 * ponytail: extracted from scripts/cli-game.ts to avoid duplication.
 */
import type { Line } from '../domain/Line.js';

export interface CalibrationPrompt {
  readonly prompt: string;
  readonly options: readonly string[];
}

export const CALIBRATION_PROMPTS: Readonly<Record<Line, CalibrationPrompt>> = {
  Cognitive: {
    prompt: 'Describe your strategy for solving complex problems. How do you handle interference or prioritize competing goals?',
    options: [
      'Systematically isolate variables and execute step-by-step.',
      'Trust intuitive patterns and adapt resources dynamically as needed.',
      'Gather community perspectives and build consensus on the plan.',
    ],
  },
  Emotional: {
    prompt: 'Two people you care about have deeply conflicting needs. Describe what you feel and how you navigate the emotional tension.',
    options: [
      'Prioritize rules or roles to establish order.',
      'Empathize with both perspectives and sit with the tension.',
      'Seek a higher systemic resolution that transcends their individual desires.',
    ],
  },
  Moral: {
    prompt: 'Your friend broke a rule to prevent minor harm to a stranger. Authority asks you what happened. What do you say, and why?',
    options: [
      'Report the truth immediately because rules are absolute.',
      'Protect my friend because personal loyalty comes first.',
      'Explain the nuance and justify the rule-breaking to the authority.',
    ],
  },
  Intrapersonal: {
    prompt: 'Describe a time you changed your mind about something important. What shifted in your perspective?',
    options: [
      'I realized my old view was factually incorrect based on new data.',
      'I integrated a completely different worldview that expanded my own.',
      'I realized my previous stance was causing harm to those around me.',
    ],
  },
  Spiritual: {
    prompt: 'What does it mean to act in alignment with the greatest good, and how do you experience this in your daily life?',
    options: [
      'Strict adherence to cosmic law and duty.',
      'Acting from a place of unconditional love and service to others.',
      'Dissolving the ego to act as a clear channel for the Creator.',
    ],
  },
  Interpersonal: {
    prompt: 'Describe how you approach resolving a disagreement with someone who holds a completely different set of core values.',
    options: [
      'Explain my rational points and let the facts speak for themselves.',
      'Listen deeply to their perspective to find common emotional ground.',
      'Look for the evolutionary synthesis that makes room for both viewpoints.',
    ],
  },
  Somatic: {
    prompt: 'Timing probe — press the button when you think 4 seconds have passed.',
    options: [],
  },
  Willpower: {
    prompt: 'Timing probe — press the button when you think 5 seconds have passed.',
    options: [],
  },
};

// Index 0 = Red level, 1 = Amber level, 2 = Orange level
//
// **Partial on purpose** (`probeKindFor`, `QuickCalibrationScoring.ts`): Somatic and Willpower are
// probed by TIMING, so they have no choice threshold. This map was total over all 8 lines, and the
// Somatic entry was not inert — its values are on the 1–12 volitional scale, and the somatic map is
// INVERTED (200–900 ms, lower is better), so feeding `2` into it saturated at the ceiling. Any
// caller that scored a choice probe on Somatic placed the player at the top of the ladder from a
// probe that cannot measure the line — the same saturation class `ThresholdMaps.test.ts` records as
// "previously produced a spurious 'Turquoise'". The type now makes that path unrepresentable.
export const CHOICE_THRESHOLDS: Readonly<Partial<Record<Line, readonly [number, number, number]>>> = {
  Cognitive: [1.8, 2.2, 2.8],
  Emotional: [2, 2.5, 3],
  Moral: [2, 2.5, 3],
  Intrapersonal: [2, 2.5, 3],
  Spiritual: [2, 2.5, 3],
  Interpersonal: [2, 2.5, 3],
};

export const HOLD_TARGETS: Readonly<Partial<Record<Line, number>>> = {
  Somatic: 4000,
  Willpower: 5000,
};

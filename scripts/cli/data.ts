// @script-status: wired — imported by cli-game.ts, which `npm run cli` runs. No side effects of its own.
/**
 * CLI data tables — values the runner holds rather than derives.
 */


// ── Direct Questioning session — true 8-line flow ──────────────────

// UX-R2-7: NPC scene-setting templates for DQ mode.
// Previously DQ was a bare questionnaire — no story, no NPC, no setting.
// Now each question is preceded by a one-line scene-setting that creates
// RPG atmosphere even without an LLM.
export const DQ_SCENE_SETTINGS = [
  'A figure watches you across the firelight. The question forms between you:',
  'The air shifts. Someone is waiting for your answer:',
  'You find yourself at a crossroads. A voice asks:',
  'In the silence after the storm, a presence turns to you:',
  'The old keeper at the gate leans forward. They ask:',
  'A stranger sits beside you on the road. They say:',
  'The mirror before you shows a different face. It asks:',
  'Deep in the chamber, the question finds you:',
];

// P1-5 (UX-R3): Validate --line / --stage / --modality / --force-shadow.
// Previously these were `as` type assertions with no runtime check, so any
// string was silently accepted — the user had no way to discover valid
// values except by trial-and-error or by peeking at save files. Now we
// fail fast with a helpful list of valid options.
export const VALID_SHADOW_QUADRANTS = new Set(['none', 'DarkAddiction', 'DarkAllergy', 'GoldenAddiction', 'GoldenAllergy']);

// ── Rendering helpers ────────────────────────────────────────────────
// (The clinical dashboard helpers that lived here — an altitude bar chart, a CCI composite bar, a
// shadow-quadrant list, a drive compass and a radar chart — were retired with `SHADOW_LABELS`.
// They had no call sites, and their output is exactly what `profile show`'s rewrite removed as
// Veil-violating: *"categorized bullet lists … read like a therapist's chart … the Veil feels
// violated"* (see `runProfile`). Restoring them would re-introduce the violation, so they are
// deleted rather than re-wired.)

// Task 4: Narrative context — map line names to challenge descriptions
export const CHALLENGE_NAMES: Record<string, string> = {
  Cognitive: 'Pattern Recognition',
  Emotional: 'Emotional Landscape',
  Moral: 'Moral Dilemma',
  Intrapersonal: 'Self-Reflection',
  Spiritual: 'Meaning-Making',
  Interpersonal: 'Social Cue Reading',
  Somatic: 'Body Awareness',
  Willpower: 'Sustained Attention',
};

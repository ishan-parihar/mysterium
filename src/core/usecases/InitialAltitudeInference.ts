/**
 * Initial altitude inference — plan Phase 14 d3 (Q10's ruling: the calibration block leaves the
 * presentation layer).
 *
 * This is the "rough seed" the game starts a new player from: it reads the answers the player
 * brought to the session and looks for the stage-specific vocabulary that indicates altitude. It
 * is deliberately NOT an assessment — it is a prior, and the first encounters are what refine it.
 * Being explicit about that is what keeps it from becoming a diagnosis (AGENTS.md §5.4).
 *
 * It lived in `scripts/cli-game.ts` until Phase 14, where it was outside the checked graph and
 * carried the retired `White` stage in its marker table (the finding the checked-surface audit
 * recorded as F5). Moving it here does three things at once: the ladder is the canonical one, the
 * inference is testable without a terminal, and the CLI keeps only the sentence it renders.
 *
 * **The retired `White` markers are NOT folded in.** `White` named a rung that does not exist
 * (`Ray.ts`: *"there is no D4 stage"*), so its vocabulary is the *closure*'s, not an altitude's —
 * it lives at `CLOSURE_MARKERS` beside `CLOSURE_BINDING`. A player writing closure language must
 * not be PLACED by it: the vocabulary names an event, and inferring an altitude from it would
 * repeat the conflation the retirement corrected.
 *
 * Spec: `docs/foundations/02-eight-stages-overview.md` · `docs/ONBOARDING-REDESIGN-PLAN.md`.
 */

import type { Line } from '../domain/Line.js';
import { ALL_LINES } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';
import { ALL_STAGES } from '../domain/Stage.js';

/**
 * Stage markers — vocabulary and concepts that indicate developmental altitude.
 *
 * `Infrared` and `Magenta` carry none on purpose: pre-conventional speech is not detectable from
 * written answers at all, so claiming to detect it would be inventing a signal. A player with no
 * markers stays at the floor.
 */
export const STAGE_MARKERS: Readonly<Record<Stage, readonly string[]>> = Object.freeze({
  Infrared: [],
  Magenta: [],
  Red: ['survival', 'power', 'force', 'fight', 'dominate', 'win', 'fear', 'anger', 'protect'],
  Amber: ['duty', 'rules', 'belong', 'tradition', 'loyalty', 'obligation', 'should', 'order', 'role'],
  Orange: ['achieve', 'system', 'strategy', 'rational', 'analysis', 'compete', 'goal', 'optimize', 'objective', 'merit'],
  Green: ['perspective', 'systemic', 'privilege', 'inclusive', 'interconnected', 'pluralism', 'empathy', 'oppression', 'relativ', 'valid'],
  // Teal (L7) — "the gateway opens; meta-perspective … vision-logic" (StageQuality).
  Teal: ['integral', 'meta', 'paradigm', 'holistic', 'dialectic', 'aqal', 'vision', 'paradox'],
  // Turquoise (L8) — "the gateway is traversed … trans-rational direct knowing" (StageQuality).
  Turquoise: ['kosm', 'evolutionary', 'emergent', 'non-dual', 'transpersonal', 'unity', 'contemplative', 'planetary'],
});

/** The floor a new player starts from — the stage every line seeds at when nothing is inferable. */
export const CALIBRATION_FLOOR: Stage = 'Red';

/** Marker density that counts as "this altitude is present" rather than a coincidental word. */
export const MARKER_THRESHOLD = 2;

/** Long-and-dense prose is at least formal-operational even when no stage marker fires. */
const DENSITY_BOOSTS: readonly { readonly minWords: number; readonly minDensity: number; readonly stage: Stage }[] = [
  { minWords: 100, minDensity: 0.7, stage: 'Green' },
  { minWords: 50, minDensity: 0.6, stage: 'Orange' },
];

export interface AltitudeInference {
  /** One altitude per line — the seed. Conservative: every line gets the same detected stage,
   *  because the first encounters are what differentiate them. */
  readonly altitudes: Readonly<Record<Line, Stage>>;
  readonly detectedStage: Stage;
  /** Marker hits per stage, for diagnosis. Empty stages are omitted. */
  readonly stageScores: Readonly<Record<string, number>>;
  readonly wordCount: number;
  readonly conceptDensity: number;
  /** True when inference found nothing and the floor was used — the caller renders this
   *  differently, and a caller that wants to know whether anything was measured reads it. */
  readonly fellBackToFloor: boolean;
}

/** Unique-word ratio over words longer than two characters — the crude "conceptual density" signal. */
function conceptDensityOf(text: string, wordCount: number): number {
  if (wordCount === 0) return 0;
  const unique = new Set(text.split(/\s+/).filter((w) => w.length > 2)).size;
  return unique / wordCount;
}

/** Highest altitude with enough marker presence, then the density boost, then the floor. */
function detectStage(stageScores: Readonly<Record<string, number>>, wordCount: number, density: number): Stage {
  let detected: Stage = CALIBRATION_FLOOR;
  // Ascending so the HIGHEST matching altitude wins — the vocabulary is cumulative in practice.
  for (const stage of ALL_STAGES) {
    if ((stageScores[stage] ?? 0) >= MARKER_THRESHOLD) detected = stage;
  }
  if (detected !== CALIBRATION_FLOOR) return detected;
  for (const boost of DENSITY_BOOSTS) {
    if (wordCount > boost.minWords && density > boost.minDensity) return boost.stage;
  }
  return detected;
}

/**
 * Infer a starting altitude per line from the answers the player brought.
 *
 * Pure and total: an empty answer set returns the floor, which is information (nothing was
 * measured) and not an error.
 */
export function inferAltitudesFromAnswers(answers: readonly string[]): AltitudeInference {
  const altitudes = Object.fromEntries(ALL_LINES.map((l) => [l, CALIBRATION_FLOOR])) as Record<Line, Stage>;
  const empty: AltitudeInference = {
    altitudes, detectedStage: CALIBRATION_FLOOR, stageScores: {}, wordCount: 0, conceptDensity: 0, fellBackToFloor: true,
  };
  if (answers.length === 0) return empty;

  const text = answers.join(' ').toLowerCase();
  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
  const density = conceptDensityOf(text, wordCount);

  const stageScores: Record<string, number> = {};
  for (const stage of ALL_STAGES) {
    const markers = STAGE_MARKERS[stage];
    if (markers.length === 0) continue;
    const matches = markers.filter((m) => text.includes(m)).length;
    if (matches > 0) stageScores[stage] = matches;
  }

  const detectedStage = detectStage(stageScores, wordCount, density);
  for (const line of ALL_LINES) altitudes[line] = detectedStage;

  return {
    altitudes,
    detectedStage,
    stageScores,
    wordCount,
    conceptDensity: density,
    fellBackToFloor: detectedStage === CALIBRATION_FLOOR,
  };
}

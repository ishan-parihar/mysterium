/**
 * CalibrationRun — the browser-side driver for quick calibration.
 *
 * The scoring already exists and is PURE (`QuickCalibrationScoring.ts`); the prompts already exist
 * and are data (`calibrationPrompts.ts`). What did not exist was a driver that holds a player's
 * eight answers in browser state and reports what the run found, so `scripts/cli/onboarding.ts`
 * was the only way to run it — which is why `web-surface-architecture.md` §7 listed `calibrate`
 * as "no headless equivalent" and left it unbuilt.
 *
 * This module is that driver, with no I/O and no framework: the page owns the timing and the
 * clicks, and this holds the answers. That split is deliberate. The CLI's loop is `console.log`,
 * a `select()` prompt and `Date.now()`; a Svelte page is a click handler and `performance.now()`.
 * Neither can be shared, but the DECISION — which line, which instrument, what the answer means —
 * is already in the pure functions and is shared unchanged.
 *
 * WHY THE TIMING PROBE IS NOT SKIPPABLE. Somatic and Willpower are probed by timing, not by
 * choice (`probeKindFor`). The reason is in the scoring module: a choice among three reflective
 * options cannot discriminate capacities that show up as embodied regulation. So a run that
 * offered a choice there would produce a number, and the number would be noise.
 */
import { probeKindFor, scoreChoiceProbe, scoreHoldProbe, type CalibrationOutcome } from '../usecases/QuickCalibrationScoring.js';
import { CALIBRATION_PROMPTS, HOLD_TARGETS } from '../data/calibrationPrompts.js';
import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';

/** One answered probe, keyed by line. A line with no entry has not been answered yet. */
export type CalibrationAnswers = Partial<Readonly<Record<Line, CalibrationAnswer>>>;

export type CalibrationAnswer =
  | { readonly kind: 'hold'; readonly elapsedMs: number }
  | { readonly kind: 'choice'; readonly choiceIndex: number };

export interface LineProgress {
  readonly line: Line;
  readonly answered: boolean;
  /** Present once answered. `null` when the answer was out of contract and scored nothing. */
  readonly outcome: CalibrationOutcome | null;
}

/** The timing target a `hold` line is measured against, in ms. `null` for a `choice` line. */
export function holdTargetFor(line: Line): number | null {
  return probeKindFor(line) === 'hold' ? (HOLD_TARGETS[line] ?? null) : null;
}

/** The authored prompt for a `choice` line, or `null` for a `hold` line. */
export function choicePromptFor(
  line: Line,
): { readonly prompt: string; readonly options: readonly string[] } | null {
  return probeKindFor(line) === 'choice' ? (CALIBRATION_PROMPTS[line] ?? null) : null;
}

/**
 * Score one answer. Returns `null` for a `hold` answer to a choice line and vice versa — the same
 * contract `scoreHoldProbe` / `scoreChoiceProbe` use, so a page that routes wrong gets `null`
 * rather than a plausible-looking wrong number.
 */
export function scoreAnswer(line: Line, answer: CalibrationAnswer): CalibrationOutcome | null {
  return answer.kind === 'hold'
    ? scoreHoldProbe(line, answer.elapsedMs)
    : scoreChoiceProbe(line, answer.choiceIndex);
}

/** Per-line state for a run, in the order the lines are presented. */
export function progressFor(
  lines: readonly Line[],
  answers: CalibrationAnswers,
): readonly LineProgress[] {
  return lines.map((line) => {
    const answer = answers[line];
    return {
      line,
      answered: answer !== undefined,
      outcome: answer === undefined ? null : scoreAnswer(line, answer),
    };
  });
}

/**
 * The altitudes a completed run assigns, for the lines that actually scored.
 *
 * A line that did not score is ABSENT from the map rather than defaulted to `Red`. Defaulting
 * would be a claim — "we probed you and you are at Red" — where the truth is "we did not get an
 * answer". The caller decides what an unprobed line means; this function does not decide for it.
 */
export function altitudesFrom(
  answers: CalibrationAnswers,
): Partial<Readonly<Record<Line, Stage>>> {
  const out: Partial<Record<Line, Stage>> = {};
  for (const [line, answer] of Object.entries(answers) as [Line, CalibrationAnswer][]) {
    const outcome = scoreAnswer(line, answer);
    if (outcome) out[line] = outcome.stage;
  }
  return out;
}

/** Lines still unanswered — what the page shows as remaining. */
export function remainingLines(lines: readonly Line[], answers: CalibrationAnswers): readonly Line[] {
  return lines.filter((line) => answers[line] === undefined);
}

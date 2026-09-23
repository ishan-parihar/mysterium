/**
 * Quick-calibration probe scoring — plan Phase 14 d3 (Q10's ruling).
 *
 * `runQuickCalibration` in the CLI has two halves: it ASKS (a timing probe for the somatic and
 * volitional lines, a multiple-choice probe for the rest) and it SCORES. Only the asking needs a
 * terminal. The scoring is arithmetic over numbers — and it lived in the presentation layer, which
 * is why the retired `White` ladder could sit inside it unnoticed (the checked-surface audit's F5).
 *
 * This module is the scoring half, extracted so it is testable without a TTY and so the ladder it
 * consults is the canonical one. The CLI keeps the asking and the felt-sense rendering.
 *
 * The two probe kinds are discriminated by `probeKindFor`, so a caller never branches on a line
 * list of its own — the same move as the mode list in Phase 14 d4.
 *
 * Spec: `docs/foundations/08-psychophysics-and-staircase.md` · `docs/ONBOARDING-REDESIGN-PLAN.md`.
 */

import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';
import { CHOICE_THRESHOLDS, HOLD_TARGETS, CALIBRATION_PROMPTS } from '../data/calibrationPrompts.js';
import { thresholdToStage } from './ThresholdMaps.js';
import { computeConfidence } from '../assessments/engine.js';
import type { TrialResult } from '../assessments/types.js';

/** Which instrument a line is probed with. */
export type CalibrationProbeKind = 'hold' | 'choice';

/**
 * The somatic and volitional lines are probed by TIMING rather than by dialogue: a choice among
 * three reflective options cannot discriminate capacities that show up as embodied regulation, and
 * the timing probe can. Every other line is probed by the authored dialogue prompt.
 */
export function probeKindFor(line: Line): CalibrationProbeKind {
  return line === 'Somatic' || line === 'Willpower' ? 'hold' : 'choice';
}

/** Depth/coherence a choice carries, by option index — the authored gradient (0 = conventional). */
const CHOICE_DEPTH = [0.3, 0.6, 0.85] as const;
const CHOICE_COHERENCE = [0.4, 0.7, 0.9] as const;

export interface CalibrationOutcome {
  readonly line: Line;
  readonly stage: Stage;
  readonly confidence: number;
  readonly trial: TrialResult;
}

/** How well a timing response landed: 1 = exact, 0 = as wrong as the target allows. */
export function holdAccuracy(elapsedMs: number, targetMs: number): number {
  if (targetMs <= 0) return 0;
  return Math.max(0, 1 - Math.abs(elapsedMs - targetMs) / targetMs);
}

/**
 * The threshold a timing probe maps into. The two lines invert the axis on purpose: somatic
 * accuracy is expressed as a response time (lower is better, 200–900 ms), volitional accuracy as a
 * score (higher is better, 1–12).
 */
export function holdThreshold(line: Line, accuracy: number): number {
  return line === 'Somatic' ? 900 - accuracy * 700 : 1 + accuracy * 11;
}

/** Score a completed timing probe. `null` when the line is not probed by timing. */
export function scoreHoldProbe(line: Line, elapsedMs: number): CalibrationOutcome | null {
  const target = HOLD_TARGETS[line];
  if (target === undefined || probeKindFor(line) !== 'hold') return null;
  const accuracy = holdAccuracy(elapsedMs, target);
  const stage = thresholdToStage(line, holdThreshold(line, accuracy));
  const trial: TrialResult = {
    taskId: `cal-${line.toLowerCase()}`,
    timestamp: Date.now(),
    dimensions: { accuracy, response_time: accuracy },
    rawResponse: elapsedMs,
    durationMs: elapsedMs,
  };
  return { line, stage, confidence: computeConfidence([trial], 0.5), trial };
}

/** Score a completed choice probe. `choiceIndex` is clamped into the authored gradient. */
export function scoreChoiceProbe(line: Line, choiceIndex: number): CalibrationOutcome | null {
  // Gate on the discriminator, not on the data's shape: a choice threshold existing for a
  // timing-probed line is exactly what produced a spurious ceiling placement (see the note on
  // `CHOICE_THRESHOLDS`), so the instrument refuses the line rather than trusting the map.
  if (probeKindFor(line) !== 'choice') return null;
  const thresholds = CHOICE_THRESHOLDS[line];
  if (thresholds === undefined || CALIBRATION_PROMPTS[line] === undefined) return null;
  const idx = Math.max(0, Math.min(thresholds.length - 1, Math.trunc(choiceIndex)));
  const stage = thresholdToStage(line, thresholds[idx]!);
  const trial: TrialResult = {
    taskId: `cal-${line.toLowerCase()}`,
    timestamp: Date.now(),
    dimensions: { depth: CHOICE_DEPTH[idx]!, coherence: CHOICE_COHERENCE[idx]! },
    rawResponse: choiceIndex,
    durationMs: 0,
  };
  return { line, stage, confidence: computeConfidence([trial], 0.5), trial };
}

/**
 * The felt-sense label the CLI renders instead of a confidence number. It lives here because the
 * bands are a property of the confidence SCALE, not of the terminal: two surfaces showing the same
 * confidence must describe it the same way (the reason the Veil descriptions live in
 * `presentation/veilDescriptors.ts` and not in each renderer).
 */
export function feltSenseLabel(confidence: number): 'clear' | 'emerging' | 'gathering' {
  if (confidence > 0.7) return 'clear';
  if (confidence > 0.4) return 'emerging';
  return 'gathering';
}

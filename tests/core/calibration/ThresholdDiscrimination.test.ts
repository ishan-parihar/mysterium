import { describe, expect, it } from 'vitest';

import { ALL_LINES } from '$core/domain/Line.js';
import { CHOICE_THRESHOLDS, CALIBRATION_PROMPTS } from '$core/data/calibrationPrompts.js';
import { thresholdToStage } from '$core/usecases/ThresholdMaps.js';
import { scoreChoiceProbe, probeKindFor } from '$core/usecases/QuickCalibrationScoring.js';

/**
 * A three-option probe must be able to say three different things.
 *
 * THE DEFECT THIS PINS. `CHOICE_THRESHOLDS` was `[2, 2.5, 3]` for five of the six choice-probed
 * lines, against an EMOTIONAL map whose rungs ascend 1.8 → Magenta, 2.5 → Red, 3.2 → Amber. Both
 * `2.5` and `3` resolved to **Red**, so options 2 and 3 were indistinguishable: a player who chose
 * "look for the evolutionary synthesis that makes room for both viewpoints" was recorded exactly as
 * one who picked the plainer middle answer. Measured consequence — an eight-probe run reported
 * `Red · gathering` on all eight lines, and the deepest answer the instrument could express was the
 * same reading as the middle one.
 *
 * WHY THE PROPERTY, NOT THE LITERALS. Pinning `[1.75, 2.4, 3.1]` would pass just as happily against
 * a map retuned under it, and would keep passing if the numbers were later collapsed again. These
 * assertions ask the only question that matters — does each option land somewhere different — so
 * they go red on the real regression.
 */
describe('choice-probe discrimination', () => {
  const choiceLines = ALL_LINES.filter((l) => probeKindFor(l) === 'choice');

  it('has choice-probed lines to check (guards the rest of this file from being vacuous)', () => {
    expect(choiceLines.length).toBeGreaterThanOrEqual(6);
  });

  it.each(choiceLines)('%s: its three options resolve to three DISTINCT stages', (line) => {
    const thresholds = CHOICE_THRESHOLDS[line];
    expect(thresholds, `${line} has no choice thresholds`).toBeDefined();

    const stages = thresholds!.map((t) => thresholdToStage(line, t));
    const distinct = new Set(stages);

    // The regression: `[2, 2.5, 3]` produced ['Magenta', 'Red', 'Red'] here.
    expect(
      distinct.size,
      `${line} maps options ${JSON.stringify(thresholds)} to ${JSON.stringify(stages)} — ` +
        `${3 - distinct.size} of 3 options are indistinguishable`,
    ).toBe(3);
  });

  it.each(choiceLines)('%s: scoring each option returns three distinct stages', (line) => {
    // The same property through the LIVE entry point the browser uses, not just the primitive.
    const outcomes = [0, 1, 2].map((i) => scoreChoiceProbe(line, i));
    for (const o of outcomes) expect(o, `${line} refused to score option`).not.toBeNull();

    const stages = outcomes.map((o) => o!.stage);
    expect(new Set(stages).size, `${line} scored options to ${JSON.stringify(stages)}`).toBe(3);
  });

  it('a choice-probed line whose options all score the same is a defect, not a preference', () => {
    // A cross-line sweep, so a line ADDED to CHOICE_THRESHOLDS later is covered without editing
    // this file: adding one with collapsing values fails here.
    const collapsing: string[] = [];
    for (const line of ALL_LINES) {
      const t = CHOICE_THRESHOLDS[line];
      if (!t) continue;
      if (new Set(t.map((v) => thresholdToStage(line, v))).size !== t.length) collapsing.push(line);
    }
    expect(collapsing).toEqual([]);
  });

  it('each choice line has exactly the three authored options its thresholds expect', () => {
    for (const line of choiceLines) {
      const options = CALIBRATION_PROMPTS[line]?.options ?? [];
      expect(options.length, `${line} has ${options.length} authored options`).toBe(3);
    }
  });
});

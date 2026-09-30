import { describe, expect, it } from 'vitest';

import { ALL_LINES, type Line } from '$core/domain/Line.js';
import { ALL_STAGES, type Stage } from '$core/domain/Stage.js';
import { CHOICE_THRESHOLDS, CALIBRATION_PROMPTS } from '$core/data/calibrationPrompts.js';
import { thresholdToStage } from '$core/usecases/ThresholdMaps.js';
import { scoreChoiceProbe, probeKindFor } from '$core/usecases/QuickCalibrationScoring.js';

/**
 * A three-option probe must place a player on the THREE STAGES THE OPTIONS MEAN.
 *
 * `calibrationPrompts.ts` declares the contract above the map it feeds: `// Index 0 = Red level,
 * 1 = Amber level, 2 = Orange level`. That is the authored meaning of the three options, so this
 * asserts it directly — per line, per option — through both the primitive and the live entry point
 * the browser uses.
 *
 * WHY NOT "THREE DISTINCT STAGES", WHICH IS WHAT CAME FIRST. Distinctness is NECESSARY AND NOT
 * SUFFICIENT, and this file has now been wrong twice in a way only the second assertion could see:
 *
 *   1. `[2, 2.5, 3]` on the five EMOTIONAL lines resolved to Magenta, Red, Red — options 2 and 3
 *      were indistinguishable.
 *   2. The first repair (`[1.75, 2.4, 3.1]`) made them distinct and was STILL WRONG.
 *      `thresholdToStage` returns the highest rung whose cutoff the value REACHES, and EMOTIONAL's
 *      Magenta cutoff is 1.8 — so 1.75 cleared nothing and put those five lines at **Infrared**, the
 *      floor. Three wrong-but-different rungs satisfy a distinctness check perfectly.
 *
 * So a property test that cannot tell "three distinct rungs" from "three WRONG rungs" will green-light
 * the next regression too. These assertions name the expected stage, which is what makes the floor
 * placement impossible to ship again.
 */

/** What `// Index 0 = Red level, 1 = Amber level, 2 = Orange level` means, per line. */
const EXPECTED: Readonly<Record<string, readonly [Stage, Stage, Stage]>> = {
  Cognitive: ['Red', 'Amber', 'Orange'], // COGNITIVE map — its own rungs, not EMOTIONAL's
  Emotional: ['Red', 'Amber', 'Orange'],
  Moral: ['Red', 'Amber', 'Orange'],
  Intrapersonal: ['Red', 'Amber', 'Orange'],
  Spiritual: ['Red', 'Amber', 'Orange'],
  Interpersonal: ['Red', 'Amber', 'Orange'],
};

const choiceLines = ALL_LINES.filter((l) => probeKindFor(l) === 'choice') as readonly Line[];

describe('choice-probe stage placement', () => {
  it('has choice-probed lines to check (guards every assertion below from being vacuous)', () => {
    expect(choiceLines.length).toBeGreaterThanOrEqual(6);
    // Somatic and Willpower are TIMING-probed and must stay absent: `scoreChoiceProbe` refuses them
    // by design, so a choice threshold on either would be an unreachable, misleading entry.
    expect(probeKindFor('Somatic')).toBe('hold');
    expect(probeKindFor('Willpower')).toBe('hold');
    expect(CHOICE_THRESHOLDS.Somatic).toBeUndefined();
    expect(CHOICE_THRESHOLDS.Willpower).toBeUndefined();
  });

  it.each(choiceLines)('%s: option i lands on the declared stage (not merely a different one)', (line) => {
    const thresholds = CHOICE_THRESHOLDS[line];
    expect(thresholds, `${line} has no choice thresholds`).toBeDefined();

    const want = EXPECTED[line];
    expect(want, `${line} has no declared expectation in this test`).toBeDefined();

    const got = thresholds!.map((t) => thresholdToStage(line, t));
    expect(got, `${line} thresholds ${JSON.stringify(thresholds)} land on ${got.join(', ')}`).toEqual([...want!]);
  });

  it.each(choiceLines)('%s: the LIVE scorer agrees with the primitive', (line) => {
    // Same property through `scoreChoiceProbe` — the function `/calibrate` actually calls, so a
    // clamp or an off-by-one there cannot hide behind a correct primitive.
    const got = [0, 1, 2].map((i) => scoreChoiceProbe(line, i)?.stage);
    expect(got, `${line} refused to score an option`).toEqual([...EXPECTED[line]!]);
  });

  it('no choice line places the LOWEST option at the floor rung', () => {
    // The specific regression, named on its own so the failure reads as itself rather than as an
    // opaque array mismatch. Infrared is where every line starts; a first probe reporting it means
    // the instrument told a player they had answered nothing.
    const floored: string[] = [];
    for (const line of choiceLines) {
      const t = CHOICE_THRESHOLDS[line];
      if (!t) continue;
      if (thresholdToStage(line, t[0]!) === 'Infrared') floored.push(line);
    }
    expect(floored, `option 1 on ${floored.join(', ')} resolves to Infrared`).toEqual([]);
  });

  it('the three options are distinct AND ascending', () => {
    // Kept alongside the stage assertions rather than instead of them: collapsing two options is the
    // original defect, and it deserves a message that says so.
    for (const line of choiceLines) {
      const t = CHOICE_THRESHOLDS[line];
      if (!t) continue;
      const stages = t.map((v) => thresholdToStage(line, v));
      expect(new Set(stages).size, `${line}: ${stages.join(', ')} — two options are the same reading`).toBe(3);
      const ordinals = stages.map((s) => ALL_STAGES.indexOf(s));
      expect(ordinals[0], `${line} does not ascend`).toBeLessThan(ordinals[1]!);
      expect(ordinals[1], `${line} does not ascend`).toBeLessThan(ordinals[2]!);
    }
  });

  it('each choice line has exactly the three authored options the thresholds expect', () => {
    for (const line of choiceLines) {
      expect(CALIBRATION_PROMPTS[line]?.options.length, `${line}`).toBe(3);
    }
  });
});

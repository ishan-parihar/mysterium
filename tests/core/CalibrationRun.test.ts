/**
 * The calibration driver the /calibrate page and the CLI share.
 *
 * The scoring is pre-existing and pure; what is new is the driver that holds eight answers and
 * reports what the run found, so the same instrument could run in a browser at all. The property
 * worth locking is the ONE the CLI's loop got for free and a page cannot: a line that was not
 * probed must be ABSENT from the result, not defaulted. A run that silently writes Red for a line
 * it never asked about is a claim the page then displays as a measurement.
 */
import { describe, it, expect } from 'vitest';
import { ALL_LINES } from '../../src/core/domain/Line.js';
import {
  altitudesFrom,
  choicePromptFor,
  holdTargetFor,
  progressFor,
  remainingLines,
  scoreAnswer,
  type CalibrationAnswers,
} from '../../src/core/usecases/CalibrationRun.js';

/** An answer in the right instrument for the line, so a full run scores all eight. */
function answerFor(line: (typeof ALL_LINES)[number]): { kind: 'hold'; elapsedMs: number } | { kind: 'choice'; choiceIndex: number } {
  const hold = holdTargetFor(line);
  return hold !== null ? { kind: 'hold', elapsedMs: hold } : { kind: 'choice', choiceIndex: 1 };
}

describe('every line is probeable', () => {
  it('all eight lines have an instrument and every answer scores', () => {
    for (const line of ALL_LINES) {
      expect(holdTargetFor(line) !== null || choicePromptFor(line) !== null).toBe(true);
      expect(scoreAnswer(line, answerFor(line))).not.toBeNull();
    }
  });

  it('the choice prompts carry three options, since scoring reads an index', () => {
    for (const line of ALL_LINES) {
      const p = choicePromptFor(line);
      if (p) expect(p.options).toHaveLength(3);
    }
  });
});

describe('an unprobed line is absent, not defaulted', () => {
  it('a partial run omits the unanswered line entirely', () => {
    const a = altitudesFrom({ Cognitive: { kind: 'choice', choiceIndex: 2 } });
    expect(Object.keys(a)).toEqual(['Cognitive']);
    expect('Moral' in a).toBe(false);
  });

  it('a full run carries all eight', () => {
    const answered = Object.fromEntries(
      ALL_LINES.map((line) => [line, answerFor(line)]),
    ) as CalibrationAnswers;
    expect(Object.keys(altitudesFrom(answered))).toHaveLength(ALL_LINES.length);
    expect(remainingLines(ALL_LINES, answered)).toHaveLength(0);
  });
});

describe('the wrong instrument scores nothing rather than a wrong number', () => {
  it('a hold answer to a choice line, and a choice answer to a hold line', () => {
    expect(scoreAnswer('Cognitive', { kind: 'hold', elapsedMs: 500 })).toBeNull();
    expect(scoreAnswer('Somatic', { kind: 'choice', choiceIndex: 1 })).toBeNull();
  });

  it('and the page renders that as unscored rather than as a stage', () => {
    const rows = progressFor(ALL_LINES, { Cognitive: { kind: 'hold', elapsedMs: 500 } });
    const cognitive = rows.find((r) => r.line === 'Cognitive');
    expect(cognitive?.answered).toBe(true);
    expect(cognitive?.outcome).toBeNull();
  });
});

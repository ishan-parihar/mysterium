/**
 * The presentation-safe half of the CLI, unit-tested.
 *
 * These assertions only exist because `scripts/cli/render.ts` is importable: before the split these
 * helpers were module-private to a 5 700-line file whose only test was a subcommand smoke matrix, so
 * their behaviour could only be checked by booting a session and reading the output by eye. That is
 * the audit's whole argument for the CLI split (module-cohesion item 1) made concrete — the Veil
 * bands below are the kind of thing that must not drift silently.
 */
import { describe, it, expect } from 'vitest';
import {
  ANSI_REGEX,
  cciToFeltSense,
  checkPrerequisiteGaps,
  curriculumLabel,
  describeShadowMovement,
  readinessToFeltSense,
  saturationToFeltSense,
  stageColor,
  stripAnsi,
  truncateAtWordBoundary,
  truncateNarrative,
} from '../../scripts/cli/render.js';
import { CHALLENGE_NAMES, VALID_SHADOW_QUADRANTS } from '../../scripts/cli/data.js';

describe('Veil-safe metrics — no numerals reach the player', () => {
  it('bands CCI into felt-sense language at every boundary', () => {
    expect(cciToFeltSense(0.0)).toBe('arriving');
    expect(cciToFeltSense(0.2999)).toBe('arriving');
    expect(cciToFeltSense(0.3)).toBe('working');
    expect(cciToFeltSense(0.5)).toBe('integrating');
    expect(cciToFeltSense(0.7)).toBe('transforming');
    expect(cciToFeltSense(0.85)).toBe('embodying');
    expect(cciToFeltSense(1)).toBe('embodying');
  });

  it('bands saturation against the infrastructure threshold, not a copy of it', () => {
    expect(saturationToFeltSense(0)).toBe('holding');
    expect(saturationToFeltSense(0.29)).toBe('holding');
    expect(saturationToFeltSense(0.31)).toBe('opening');
    expect(saturationToFeltSense(0.95)).toBe('ready to shift');
  });

  it('bands readiness into a sentence about the work', () => {
    expect(readinessToFeltSense(0)).toBe('the work is still gathering');
    expect(readinessToFeltSense(0.5)).toBe('something is building');
    expect(readinessToFeltSense(1)).toBe('the threshold is here');
  });

  it('names all four shadow quadrants as movement, never as a clinical label', () => {
    const described = ['DarkAddiction', 'DarkAllergy', 'GoldenAddiction', 'GoldenAllergy'].map(describeShadowMovement);
    expect(described).toEqual([
      'a pull toward a familiar capacity',
      'an aversion to something still needed',
      'a reach toward something not yet integrated',
      'a resistance to growth in a specific area',
    ]);
    expect(describeShadowMovement('Unknown')).toBe('an unresolved pattern');
    // The clinical quadrant vocabulary must not appear in any rendered description.
    for (const d of described) expect(d).not.toMatch(/Dark|Golden|Addiction|Allergy/);
  });
});

describe('truncation', () => {
  it('breaks on sentence punctuation only when the break lands past half the window', () => {
    // Window 26: the sentence end at index 22 is past half the window → break there.
    expect(truncateNarrative('One thing. Two things. Three things.', 26)).toBe('One thing. Two things.…');
    // Window 20: the same sentence end (index 9) is NOT past half (10), so the word boundary wins —
    // a mid-sentence cut reads better than a fragment shorter than the window allows.
    expect(truncateNarrative('One thing. Two things. Three things.', 20)).toBe('One thing. Two…');
  });

  it('falls back to a word boundary, then to a hard cut', () => {
    expect(truncateNarrative('aaaaaaaaaa bbbbbbbbbb cccccccccc', 15)).toBe('aaaaaaaaaa…');
    expect(truncateNarrative('aaaaaaaaaa', 5)).toBe('aaaaa…');
  });

  it('leaves short text exactly as it is', () => {
    expect(truncateNarrative('short', 20)).toBe('short');
    expect(truncateAtWordBoundary('short', 20)).toBe('short');
    expect(truncateAtWordBoundary('aaaa bbbb', 5)).toBe('aaaa…');
  });
});

describe('ANSI handling', () => {
  it('strips colour codes so JSON output stays machine-parseable', () => {
    expect(stripAnsi('\u001b[31mred\u001b[0m')).toBe('red');
    expect(ANSI_REGEX.test('\u001b[31mred')).toBe(true);
  });

  it('keeps a colour function per stage and a dim fallback for an unknown one', () => {
    expect(typeof stageColor('Teal')('x')).toBe('string');
    expect(typeof stageColor('NotAStage')('x')).toBe('string');
  });
});

describe('data tables', () => {
  it('names the shadow-quadrant vocabulary the CLI validates flags against', () => {
    expect([...VALID_SHADOW_QUADRANTS]).toEqual([
      'none', 'DarkAddiction', 'DarkAllergy', 'GoldenAddiction', 'GoldenAllergy',
    ]);
  });

  it('has a challenge name for every line', () => {
    expect(Object.keys(CHALLENGE_NAMES)).toEqual([
      'Cognitive', 'Emotional', 'Moral', 'Intrapersonal', 'Spiritual', 'Interpersonal', 'Somatic', 'Willpower',
    ]);
  });

  it('resolves a curriculum label to empty string rather than throwing on an unknown concept', () => {
    expect(curriculumLabel(undefined)).toBe('');
    expect(curriculumLabel('no-such-concept-id')).toBe('');
  });

  it('reports no gaps when the concept has no prerequisites registered', () => {
    expect(checkPrerequisiteGaps('no-such-concept-id', undefined)).toEqual([]);
  });
});

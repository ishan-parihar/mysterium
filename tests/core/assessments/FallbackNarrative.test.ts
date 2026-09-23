/**
 * The degradation narrative, unit-tested in isolation.
 *
 * This is what the player reads when the model is unavailable, so two properties matter more than
 * the wording: the player's own words must never be quoted back at them (a reflective practice that
 * echoes your sentence reads as a transcript), and silence must have its own band rather than
 * collapsing into the generic one. Both are behaviours, so both are asserted.
 */
import { describe, it, expect } from 'vitest';
import { buildFallbackNarrative } from '../../../src/core/assessments/fallbackNarrative.js';

/** Run the builder enough times to see every opener in a band (3 per band). */
function sample(line: 'Cognitive' | 'Somatic', stage: 'Red' | 'Green', response: string, selfReflection: boolean, n = 40): string[] {
  return Array.from({ length: n }, () => buildFallbackNarrative(line, stage, response, selfReflection));
}

describe('buildFallbackNarrative', () => {
  it('gives an empty offering the silence band, not the generic one', () => {
    for (const text of ['', '   ', '\n']) {
      const out = sample('Cognitive', 'Red', text, true);
      // The silence band is the only one whose openers speak about the absence of an answer.
      for (const line of out) {
        expect(line).not.toContain('encounter at the');
        expect(line).toMatch(/Silence answered|silence itself was a response|A long pause/);
      }
      // Three openers, all reachable — a band that always renders one string is a fixed string.
      expect(new Set(out).size).toBe(3);
    }
  });

  it('never quotes the player back, and never leaks the raw response', () => {
    const secret = 'my mother said the thing about the inheritance';
    const out = sample('Cognitive', 'Red', secret, true);
    for (const line of out) expect(line).not.toContain(secret);
    expect(out.join(' ')).not.toContain('inheritance');
  });

  it('bands a sparse offering, a middle one and a substantial one differently', () => {
    const sparse = new Set(sample('Cognitive', 'Red', 'yes', true));
    const middle = new Set(sample('Cognitive', 'Red', 'I stayed with it and noticed the pull', true));
    const long = new Set(sample('Cognitive', 'Red', 'x'.repeat(150), true));
    // The bands are disjoint vocabularies, so no rendering may appear in two of them.
    for (const s of sparse) expect(middle.has(s)).toBe(false);
    for (const s of middle) expect(long.has(s)).toBe(false);
    for (const s of sparse) expect(long.has(s)).toBe(false);
  });

  it('names the line and the stage in the self-reflection bands', () => {
    const out = sample('Somatic', 'Green', 'I feel it in my jaw when I start to speak', true);
    expect(out.every((s) => s.includes('somatic'))).toBe(true);
    expect(out.some((s) => s.includes('green'))).toBe(true);
  });

  it('renders task encounters through the generic band, with the line named', () => {
    const out = buildFallbackNarrative('Cognitive', 'Red', 'the answer I gave', false);
    expect(out).toContain('encounter at the red stage unfolded');
    expect(out).toContain('cognitive dimension received what was offered');
    expect(out).toContain('The player met the moment with something genuine.');
  });

  it('varies the wording across calls so repeats do not repeat verbatim', () => {
    expect(new Set(sample('Cognitive', 'Red', 'a short reply', true)).size).toBeGreaterThan(1);
    expect(new Set(sample('Somatic', 'Green', '', true)).size).toBeGreaterThan(1);
  });
});

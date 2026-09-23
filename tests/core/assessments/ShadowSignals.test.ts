/**
 * Shadow-signal detection, unit-tested in isolation.
 *
 * These detectors are the fallback path for the one signal the engine must read without an LLM: what
 * the player's own words carried. Until the extraction they were private statics on a 2 876-line
 * class, so the only way to exercise them was to run a whole session through `AgenticOrchestrator`.
 * The precedence order they encode (dark-addiction → dark-aversion → golden-addiction →
 * golden-allergy) is a behavioural contract, and it is what these tests lock.
 */
import { describe, it, expect } from 'vitest';
import { detectShadowKeywords, detectWriteInShadow } from '../../../src/core/assessments/shadowSignals.js';
import { SHADOW_KEYWORDS } from '../../../src/core/data/shadowKeywords.js';

/** The first keyword of each channel — the vocabulary itself lives in the data module. */
const FIRST = {
  DarkAddiction: SHADOW_KEYWORDS.darkAddiction[0]!,
  DarkAllergy: SHADOW_KEYWORDS.darkAversion[0]!,
  GoldenAddiction: SHADOW_KEYWORDS.goldenAddiction[0]!,
  GoldenAllergy: SHADOW_KEYWORDS.goldenAllergy[0]!,
} as const;

describe('detectShadowKeywords', () => {
  it('reads each quadrant from its own vocabulary', () => {
    for (const [quadrant, keyword] of Object.entries(FIRST)) {
      expect(detectShadowKeywords(`I will ${keyword} now`)?.quadrant).toBe(quadrant);
    }
  });

  it('is case-insensitive and matches inside a sentence, not only a bare word', () => {
    expect(detectShadowKeywords(`SO I CHOSE TO ${FIRST.DarkAddiction.toUpperCase()} THEM`)?.quadrant).toBe('DarkAddiction');
    expect(detectShadowKeywords(`it felt like I wanted to ${FIRST.GoldenAllergy} the whole thing`)?.quadrant).toBe('GoldenAllergy');
  });

  it('returns null when no vocabulary matches', () => {
    expect(detectShadowKeywords('I sat with the question and let it be')).toBeNull();
    expect(detectShadowKeywords('')).toBeNull();
  });

  it('keeps intensity inside (0, 1] for every quadrant', () => {
    for (const keyword of Object.values(FIRST)) {
      for (let i = 0; i < 30; i++) {
        const signal = detectShadowKeywords(`${keyword}`)!;
        expect(signal.intensity).toBeGreaterThan(0);
        expect(signal.intensity).toBeLessThanOrEqual(1);
      }
    }
  });

  it('resolves a sentence carrying two vocabularies by PRECEDENCE, not by position', () => {
    // dark-addiction is the load-bearing signal and wins even when it comes second in the text.
    const text = `${FIRST.GoldenAddiction} and ${FIRST.DarkAddiction}`;
    expect(detectShadowKeywords(text)?.quadrant).toBe('DarkAddiction');
    // the same sentence without the first word: the golden channel is what remains.
    expect(detectShadowKeywords(FIRST.GoldenAddiction)?.quadrant).toBe('GoldenAddiction');
  });
});

describe('detectWriteInShadow', () => {
  it('maps each quadrant onto the drive and polarity the quadrant names', () => {
    expect(detectWriteInShadow(FIRST.DarkAddiction)).toEqual({ drive: 'agency', polarity: 'sts', shadowKeyword: 'DarkAddicted' });
    expect(detectWriteInShadow(FIRST.DarkAllergy)).toEqual({ drive: 'communion', polarity: 'sto', shadowKeyword: 'DarkAverted' });
    expect(detectWriteInShadow(FIRST.GoldenAddiction)).toEqual({ drive: 'eros', polarity: 'neutral', shadowKeyword: 'GoldenAddicted' });
    expect(detectWriteInShadow(FIRST.GoldenAllergy)).toEqual({ drive: 'agape', polarity: 'neutral', shadowKeyword: 'GoldenAverted' });
  });

  it('returns null when the write-in carries no shadow vocabulary', () => {
    expect(detectWriteInShadow('I breathe and let the moment be what it is')).toBeNull();
  });

  it('matches on substring, so an inflected form still reads as its channel', () => {
    // 'stay' is the golden-allergy keyword; 'stayed' must not slip through as no-signal. This is a
    // deliberate property of the detector (cheap, and the alternative is a stemmer), so it is locked
    // here rather than left for someone to "fix" into a stricter match that misses real write-ins.
    expect(detectShadowKeywords('I stayed where it was safe')?.quadrant).toBe('GoldenAllergy');
  });

  it('agrees with detectShadowKeywords on every quadrant — one reading, two projections', () => {
    for (const keyword of Object.values(FIRST)) {
      const quadrant = detectShadowKeywords(keyword)!.quadrant;
      const writeIn = detectWriteInShadow(keyword)!;
      // Both projections must come from the SAME detected quadrant; only their presentation differs.
      expect(writeIn.shadowKeyword).toBeTruthy();
      expect(quadrant).toBe(detectShadowKeywords(keyword)!.quadrant);
    }
  });
});

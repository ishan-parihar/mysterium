/**
 * Keyword-based shadow detection — a collaborator extracted from `AgenticOrchestrator` (module
 * cohesion audit item 4, first collaborator).
 *
 * The class is 2 876 lines and every method can reach every field, so the dependency graph it
 * actually has is invisible. These two detectors are the cleanest first extraction because they are
 * functions OF THEIR ARGUMENT: no instance state, no I/O, no LLM. They answer "did the player's own
 * words carry a shadow signal?", which is the one signal the engine must extract without help.
 *
 * The keywords live in `../data/shadowKeywords.ts` (data, not code — a wording change should not be
 * a diff to the detector). Precedence below is ORDERED, not symmetric: the four quadrants are
 * disjoint vocabularies, but a sentence can carry more than one, and the order here is the
 * tie-break the engine has always used — dark-addiction first (the most load-bearing signal), then
 * dark-aversion, then the two golden quadrants.
 */
import { SHADOW_KEYWORDS } from '../data/shadowKeywords.js';
import type { ShadowQuadrant } from '../domain/enums.js';

const KEYWORDS = SHADOW_KEYWORDS as Readonly<Record<string, readonly string[]>>;

/** The four quadrants in detection precedence order, each with the keyword list it matches. */
const QUADRANTS: readonly { readonly quadrant: ShadowQuadrant; readonly channel: string }[] = [
  { quadrant: 'DarkAddiction', channel: 'darkAddiction' },
  { quadrant: 'DarkAllergy', channel: 'darkAversion' },
  { quadrant: 'GoldenAddiction', channel: 'goldenAddiction' },
  { quadrant: 'GoldenAllergy', channel: 'goldenAllergy' },
];

/** How intense a detected shadow reads, per quadrant. Randomised inside the band so repeats differ. */
const INTENSITY: Readonly<Record<ShadowQuadrant, () => number>> = {
  DarkAddiction: () => Math.min(1, 0.4 + Math.random() * 0.3),
  DarkAllergy: () => Math.min(1, 0.3 + Math.random() * 0.2),
  GoldenAddiction: () => Math.min(1, 0.5 + Math.random() * 0.3),
  GoldenAllergy: () => Math.min(1, 0.3 + Math.random() * 0.3),
};

function matchesAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

/** The first quadrant whose vocabulary the text carries, or null. Case-insensitive. */
function firstMatch(text: string): ShadowQuadrant | null {
  const lower = text.toLowerCase();
  for (const { quadrant, channel } of QUADRANTS) {
    if (matchesAny(lower, KEYWORDS[channel] ?? [])) return quadrant;
  }
  return null;
}

/** Detect shadow quadrant from text. Returns quadrant name + intensity, or null. */
export function detectShadowKeywords(text: string): { quadrant: ShadowQuadrant; intensity: number } | null {
  const quadrant = firstMatch(text);
  return quadrant ? { quadrant, intensity: INTENSITY[quadrant]() } : null;
}

/**
 * Detect the drive/polarity mapping a write-in carries, for write-in evaluation.
 *
 * This is NOT a second, independent reading of the same text: it maps the quadrant the detector
 * above already found onto the drive and polarity whose absence or excess the quadrant names
 * (addiction clings by agency, aversion withdraws from communion, and both golden quadrants sit on
 * the vertical axis, so they read neutral). Kept beside the detector so the two cannot drift apart.
 */
export function detectWriteInShadow(
  text: string,
): { drive: string; polarity: string; shadowKeyword: string | null } | null {
  const quadrant = firstMatch(text);
  switch (quadrant) {
    case 'DarkAddiction': return { drive: 'agency', polarity: 'sts', shadowKeyword: 'DarkAddicted' };
    case 'DarkAllergy': return { drive: 'communion', polarity: 'sto', shadowKeyword: 'DarkAverted' };
    case 'GoldenAddiction': return { drive: 'eros', polarity: 'neutral', shadowKeyword: 'GoldenAddicted' };
    case 'GoldenAllergy': return { drive: 'agape', polarity: 'neutral', shadowKeyword: 'GoldenAverted' };
    default: return null;
  }
}

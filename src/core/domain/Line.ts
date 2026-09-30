/**
 * Line — the eight lines of intelligence.
 * Canonical string literal union per docs/02-glossary.md.
 *
 * HoloOS alignment (per AUDIT-HOLOOS-ALIGNMENT.md §2.5.8):
 * Each Line runs on a primary substrate face (HoloOS Complex). A player's
 * profile therefore has three Complex-level altitudes in addition to eight
 * Line-level altitudes. Complex altitude is used for cross-Complex shadow
 * detection (e.g., Mind-Complex at Amber with Body-Complex at Red surfaces
 * as a "spiritual bypass" pattern) and per-Complex theta-decay rates
 * (Body decays fastest, Spirit slowest).
 *
 * HoloOS anchor: _THEORY/02_Ontology/04.2_Intra_Holonic_Specialization.md
 * (canonical-hypothesis).
 */
import type { Quadrant } from './SharedTypes.js';

export type Line =
  | 'Cognitive'
  | 'Emotional'
  | 'Moral'
  | 'Intrapersonal'
  | 'Spiritual'
  | 'Somatic'
  | 'Willpower'
  | 'Interpersonal';

export const ALL_LINES: readonly Line[] = [
  'Cognitive',
  'Emotional',
  'Moral',
  'Intrapersonal',
  'Spiritual',
  'Somatic',
  'Willpower',
  'Interpersonal',
];

/**
 * Narrows an `unknown` to `Line` against the canonical set.
 *
 * It lives here, beside the constant it checks, rather than in a consumer — a membership test duplicated
 * in two display models is a second binding for a canonical set, and M8 forbids that. It exists because
 * `devMapping.primaryLine` is typed `Line` while its value arrives from JSON, where nothing enforces the
 * type: a corpus naming `"Naturalist"` compiles cleanly and returns `undefined` from every `tally.get`,
 * which blanked a whole dashboard before MY-AD-0037 and G17 caught it.
 */
export function isLine(v: unknown): v is Line {
  return typeof v === 'string' && (ALL_LINES as readonly string[]).includes(v);
}

/** Primary quadrant home for each line. */
export const LINE_QUADRANT: Readonly<Record<Line, Quadrant>> = {
  Cognitive: 'UR',
  Emotional: 'UL',
  Moral: 'LL',
  Intrapersonal: 'UL',
  Spiritual: 'UL',
  Somatic: 'UR',
  Willpower: 'UR',
  Interpersonal: 'LL',
};

/**
 * HoloOS Complex — the substrate face on which a Line runs.
 * Mind  = symbolic reasoning / self-reflection
 * Body  = embodied sensation / volitional motor
 * Spirit = affective resonance / transpersonal / relational field
 *
 * Used for cross-Complex shadow detection and per-Complex theta-decay rates.
 */
export type Complex = 'Mind' | 'Body' | 'Spirit';

export const ALL_COMPLEXES: readonly Complex[] = ['Mind', 'Body', 'Spirit'];

/** Primary Complex affinity for each Line (per AUDIT-HOLOOS-ALIGNMENT.md §2.5.8). */
export const LINE_COMPLEX: Readonly<Record<Line, Complex>> = {
  Cognitive: 'Mind',
  Moral: 'Mind',
  Intrapersonal: 'Mind',
  Emotional: 'Spirit',
  Spiritual: 'Spirit',
  Interpersonal: 'Spirit',
  Somatic: 'Body',
  Willpower: 'Body',
};

/** All Lines belonging to a given Complex. */
export function linesForComplex(complex: Complex): readonly Line[] {
  return ALL_LINES.filter(l => LINE_COMPLEX[l] === complex);
}


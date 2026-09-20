/**
 * Stage — the eight macro-developmental levels of consciousness.
 * Canonical string literal union per docs/02-glossary.md.
 */
export type Stage =
  | 'Infrared'
  | 'Magenta'
  | 'Red'
  | 'Amber'
  | 'Orange'
  | 'Green'
  | 'Teal'
  | 'Turquoise';

export const ALL_STAGES: readonly Stage[] = [
  'Infrared',
  'Magenta',
  'Red',
  'Amber',
  'Orange',
  'Green',
  'Teal',
  'Turquoise',
];

/** Ordinal index of a stage (0 = Infrared, 7 = Turquoise). */
export function stageOrdinal(s: Stage): number {
  return ALL_STAGES.indexOf(s);
}

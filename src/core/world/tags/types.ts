/**
 * Tag ontology types — 46 §4 (`docs/foundations/46-generative-world-composition.md`).
 *
 * A tag is the preference-relevant domain label an entity is ABOUT. It is the join between the
 * player (`45 §3`'s interest graph) and the component stock. A tag is a POSITION, not a label:
 * every tag carries coordinates on the two canonical axes (`AGENTS.md §5.1`).
 */

/** The 10 dimensions along which an entity can vary within a line × stage cell (46 §2.1). */
export const CHARACTERISTICS = [
  'drive-profile',
  'shadow-expression',
  'polarity-texture',
  'voice-register',
  'role-archetype',
  'stake',
  'pressure-lever',
  'surface-aesthetic',
  'relationship-pattern',
  'memory-schema',
] as const;

export type Characteristic = (typeof CHARACTERISTICS)[number];

export type TagId = string;

export interface Tag {
  readonly id: TagId;
  readonly label: string;
  /** -1 (Agape) .. +1 (Eros) — the vertical axis, within the holon, between stages. */
  readonly erosAgape: number;
  /** -1 (Communion) .. +1 (Agency) — the horizontal axis, across holons, at a given stage. */
  readonly agencyCommunion: number;
  /** How strongly this tag tunes each characteristic (-1..1). Authored, sparse. */
  readonly facetAffinity: Partial<Record<Characteristic, number>>;
  /** Curated override for the core set where geometric reflection is not the pedagogic opposite (46 §4.2). */
  readonly dialecticPair?: TagId;
  /** Authored, never inferred — fluency is culture-laden (46 §9). */
  readonly culturalNotes: string;
  /** Culture-restricted tags are excluded from automatic selection where they would read as appropriation (46 §9). */
  readonly cultureRestricted?: boolean;
}

/** The three reconciliation states of a tag pair, per KosmOS `_Ontology/polarity.md` via 46 §4.3. */
export type PolarityState = 'undiscovered' | 'active-tension' | 'reconciled';

/**
 * Selection semantics (46 §4.3):
 * - `undiscovered`   → the familiar pole may appear as texture; NOT a structural candidate.
 * - `active-tension` → the live frontier; the ONLY state that carries a structural pole.
 * - `reconciled`     → stop selecting structurally (saturation guard); re-opens on refutation evidence.
 */
export function selectableStructurally(state: PolarityState): boolean {
  return state === 'active-tension';
}

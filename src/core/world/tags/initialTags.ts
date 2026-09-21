/**
 * The initial tag set — 46 §4, seeded from the tag list named in 46 §4's opening paragraph
 * (technology, nature, kindred, commerce, craft, music, medicine, law, warfare, exploration,
 * ritual, architecture).
 *
 * Authoring rules (all compile-checked by `dialectic.ts` + `tests/world/TagOntology.test.ts`):
 * - every tag is positioned on both canonical axes (AGENTS.md §5.1);
 * - the dialectic relation is DERIVED by reflecting the axis position (46 §4.2), with a curated
 *   `dialecticPair` override ONLY where geometry is not the pedagogic opposite;
 * - `culturalNotes` is authored, never inferred (46 §9);
 * - authoring a NEW tag is a corpus change (46 §8) — it lands here, reviewed like canon.
 */

import type { Tag, TagId } from './types.js';

export const INITIAL_TAGS: readonly Tag[] = [
  {
    id: 'technology',
    label: 'Technology',
    erosAgape: 0.8,
    agencyCommunion: 0.6,
    facetAffinity: { 'surface-aesthetic': 0.9, 'pressure-lever': 0.6, 'role-archetype': 0.4 },
    dialecticPair: 'nature',
    culturalNotes:
      'Fluency varies sharply by exposure; in low-infrastructure localities it can read as_extractive outsider power rather than shared tooling. Pair with local craft vocabulary before structurally selecting it.',
  },
  {
    id: 'nature',
    label: 'Nature',
    erosAgape: 0.5,
    agencyCommunion: -0.7,
    facetAffinity: { 'surface-aesthetic': 0.9, 'polarity-texture': 0.5, 'relationship-pattern': 0.4 },
    dialecticPair: 'technology',
    culturalNotes:
      'Reads as sacred, ancestral or merely scenic depending on locality; avoid framing as resource or as pristine-wilderness both of which carry colonial connotations in different regions.',
  },
  {
    id: 'kindred',
    label: 'Kindred',
    erosAgape: -0.4,
    agencyCommunion: -0.9,
    facetAffinity: { 'relationship-pattern': 0.9, 'stake': 0.7, 'voice-register': 0.4 },
    dialecticPair: 'warfare',
    culturalNotes:
      'Kinship obligation is legally and emotionally load-bearing in much of the world; do not flatten into chosen-family idiom where blood-oath framing is the fluent register.',
  },
  {
    id: 'commerce',
    label: 'Commerce',
    erosAgape: 0.7,
    agencyCommunion: 0.3,
    facetAffinity: { 'stake': 0.9, 'pressure-lever': 0.7, 'role-archetype': 0.5 },
    dialecticPair: 'ritual',
    culturalNotes:
      'Market fluency is near-universal but its moral valence is not; in some localities haggling is hospitality, in others it is conflict. Commerce as self-worth is the aggressive read.',
  },
  {
    id: 'craft',
    label: 'Craft',
    erosAgape: 0.4,
    agencyCommunion: 0.1,
    facetAffinity: { 'surface-aesthetic': 0.7, 'voice-register': 0.6, 'memory-schema': 0.4 },
    dialecticPair: 'law',
    culturalNotes:
      'Craft mastery is a dignity vocabulary almost everywhere, but apprenticeship framing differs: guild-hierarchical in some cultures, lineage-ancestral in others, self-taught in others.',
  },
  {
    id: 'music',
    label: 'Music',
    erosAgape: 0.6,
    agencyCommunion: -0.4,
    facetAffinity: { 'voice-register': 0.9, 'surface-aesthetic': 0.8, 'polarity-texture': 0.4 },
    culturalNotes:
      'The most universally fluent domain and the most easily pastiched. Rhythm, scale and occasion carry sacred/profane boundaries that must be authored locally, not assumed.',
  },
  {
    id: 'medicine',
    label: 'Medicine',
    erosAgape: -0.6,
    agencyCommunion: 0.5,
    facetAffinity: { 'stake': 0.8, 'pressure-lever': 0.8, 'role-archetype': 0.5 },
    culturalNotes:
      'Healing authority is contested between institutional, lineage and spiritual registers in most cultures; who may heal whom is a local fact, not a universal.',
  },
  {
    id: 'law',
    label: 'Law',
    erosAgape: -0.3,
    agencyCommunion: 0.8,
    facetAffinity: { 'role-archetype': 0.8, 'stake': 0.6, 'relationship-pattern': 0.5 },
    dialecticPair: 'craft',
    culturalNotes:
      'Codified-rule fluency is high in bureaucratised societies and low where customary mediation is primary; law-as-fairness vs law-as-order is the local axis to author against.',
  },
  {
    id: 'warfare',
    label: 'Warfare',
    erosAgape: 0.9,
    agencyCommunion: 0.7,
    facetAffinity: { 'pressure-lever': 0.9, 'shadow-expression': 0.7, 'role-archetype': 0.6 },
    dialecticPair: 'kindred',
    culturalNotes:
      'Highest-arousal, highest-risk tag. Honour-framing varies between cultures that code it protective and cultures that code it predative; never select structurally without the encounter safety review.',
  },
  {
    id: 'exploration',
    label: 'Exploration',
    erosAgape: 0.7,
    agencyCommunion: -0.2,
    facetAffinity: { 'pressure-lever': 0.7, 'role-archetype': 0.7, 'surface-aesthetic': 0.5 },
    culturalNotes:
      'Discovery framing is heroic in settler cultures and problematically tied to conquest elsewhere; frontier openness vs trespass is the local contrast to author.',
  },
  {
    id: 'ritual',
    label: 'Ritual',
    erosAgape: -0.8,
    agencyCommunion: -0.5,
    facetAffinity: { 'polarity-texture': 0.8, 'memory-schema': 0.6, 'relationship-pattern': 0.5 },
    dialecticPair: 'commerce',
    culturalNotes:
      'Ritual is the least exportable tag: its fluency is entirely local. Treat every ritual facet as culture-restricted by default and author it per-locality.',
  },
  {
    id: 'architecture',
    label: 'Architecture',
    erosAgape: 0.2,
    agencyCommunion: -0.6,
    facetAffinity: { 'surface-aesthetic': 0.9, 'memory-schema': 0.5, 'relationship-pattern': 0.3 },
    culturalNotes:
      'Built space encodes social order legibly; hierarchy-in-stone reads differently across cultures. Materials carry status locally; author from the locality, not the archetype.',
  },
];

/** Tags whose geometric reflection is the pedagogically correct opposite need no override (46 §4.2). */
export const CURATED_OVERRIDES: Readonly<Record<TagId, TagId>> = Object.freeze(
  Object.fromEntries(
    INITIAL_TAGS.filter((t) => t.dialecticPair !== undefined).map((t) => [t.id, t.dialecticPair as TagId]),
  ),
);

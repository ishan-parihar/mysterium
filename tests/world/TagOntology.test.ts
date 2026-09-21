import { describe, it, expect } from 'vitest';
import { createTagStore } from '../../src/core/world/tags/dialectic.js';
import { INITIAL_TAGS, CURATED_OVERRIDES } from '../../src/core/world/tags/initialTags.js';
import type { Tag } from '../../src/core/world/tags/types.js';

describe('tag ontology (46 §4)', () => {
  it('every canon-named tag is present in the initial set', () => {
    const ids = new Set(INITIAL_TAGS.map((t) => t.id));
    for (const required of [
      'technology', 'nature', 'kindred', 'commerce', 'craft', 'music',
      'medicine', 'law', 'warfare', 'exploration', 'ritual', 'architecture',
    ]) {
      expect(ids.has(required), `missing canon-named tag: ${required}`).toBe(true);
    }
  });

  it('every tag is positioned on both canonical axes', () => {
    for (const t of INITIAL_TAGS) {
      expect(Math.abs(t.erosAgape), `${t.id}.erosAgape`).toBeLessThanOrEqual(1);
      expect(Math.abs(t.agencyCommunion), `${t.id}.agencyCommunion`).toBeLessThanOrEqual(1);
    }
  });

  it('every tag has authored culturalNotes (46 §9: authored, not inferred)', () => {
    for (const t of INITIAL_TAGS) {
      expect(t.culturalNotes.trim().length, `${t.id}.culturalNotes`).toBeGreaterThan(20);
    }
  });

  it('the relation is total: every tag resolves an opposite (46 §4.2)', () => {
    const store = createTagStore();
    for (const t of INITIAL_TAGS) {
      expect(() => store.opposite(t.id)).not.toThrow();
      expect(store.opposite(t.id).id).not.toBe(t.id);
    }
  });

  it('the relation is symmetric: opposite(opposite(t)) === t (46 §11 invariant 2)', () => {
    const store = createTagStore();
    for (const t of INITIAL_TAGS) {
      expect(store.opposite(store.opposite(t.id).id).id, `asymmetric at ${t.id}`).toBe(t.id);
    }
  });

  it('curated overrides are mutual and both endpoints exist', () => {
    const ids = new Set(INITIAL_TAGS.map((t) => t.id));
    for (const [a, b] of Object.entries(CURATED_OVERRIDES)) {
      expect(ids.has(a)).toBe(true);
      expect(ids.has(b), `override endpoint '${b}' does not resolve`).toBe(true);
      expect(CURATED_OVERRIDES[b], `override ${a}<->${b} is not mutual`).toBe(a);
    }
  });

  it('technology <-> nature is the canon example of a curated (non-geometric) pair', () => {
    expect(CURATED_OVERRIDES['technology']).toBe('nature');
  });

  it('an origin tag without an explicit pair fails closed (reflexive-safe rule)', () => {
    const origin: Tag = {
      id: 'origin-tag',
      label: 'Origin',
      erosAgape: 0,
      agencyCommunion: 0,
      facetAffinity: {},
      culturalNotes: 'Sits exactly at the origin; reflection is the identity.',
    };
    expect(() => createTagStore([...INITIAL_TAGS, origin])).toThrowError(/origin/);
  });

  it('an origin tag WITH an explicit mutual pair resolves', () => {
    const origin: Tag = {
      id: 'origin-tag',
      label: 'Origin',
      erosAgape: 0,
      agencyCommunion: 0,
      facetAffinity: {},
      dialecticPair: 'kindred',
      culturalNotes: 'Declares its own opposite explicitly per the reflexive-safe rule.',
    };
    const kindred = INITIAL_TAGS.find((t) => t.id === 'kindred')!;
    const warfare = INITIAL_TAGS.find((t) => t.id === 'warfare')!;
    const exploration = INITIAL_TAGS.find((t) => t.id === 'exploration')!;
    const music = INITIAL_TAGS.find((t) => t.id === 'music')!;
    const medicine = INITIAL_TAGS.find((t) => t.id === 'medicine')!;
    const patchedKindred: Tag = { ...kindred, dialecticPair: 'origin-tag' };
    const patchedWarfare: Tag = { ...warfare, dialecticPair: 'medicine' };
    const patchedMedicine: Tag = { ...medicine, dialecticPair: 'warfare' };
    const patchedMusic: Tag = { ...music, dialecticPair: 'exploration' };
    const patchedExploration: Tag = { ...exploration, dialecticPair: 'music' };
    // architecture is dropped (not re-added) so every remaining tag is explicitly paired.
    const store = createTagStore([
      ...INITIAL_TAGS.filter(
        (t) => !['kindred', 'warfare', 'exploration', 'architecture', 'music', 'medicine'].includes(t.id),
      ),
      origin,
      patchedKindred,
      patchedWarfare,
      patchedMedicine,
      patchedMusic,
      patchedExploration,
    ]);
    expect(store.opposite('origin-tag').id).toBe('kindred');
    expect(store.opposite('kindred').id).toBe('origin-tag');
  });

  it('a curated pair pointing at an unknown tag fails closed (46 §11 invariant 4)', () => {
    const broken: Tag = { ...INITIAL_TAGS[0], dialecticPair: 'nonexistent' };
    expect(() => createTagStore([broken, ...INITIAL_TAGS.slice(1)])).toThrowError(/does not resolve/);
  });

  it('an asymmetric curated pair fails closed at construction (mutuality asserted, not assumed)', () => {
    const oneWay: Tag = { ...INITIAL_TAGS[0], dialecticPair: 'music' };
    expect(() => createTagStore([oneWay, ...INITIAL_TAGS.slice(1)])).toThrowError(/not mutual/);
  });

  it('an unknown tag id fails closed on lookup', () => {
    const store = createTagStore();
    expect(() => store.opposite('no-such-tag')).toThrowError(/unknown tag/);
  });
});

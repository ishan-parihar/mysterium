import { describe, it, expect } from 'vitest';
import { createFacetStore, facetKeyOf, parseFacetKey } from '../../src/core/world/facets/FacetStore.js';
import { CHARACTERISTICS } from '../../src/core/world/tags/types.js';
import { INITIAL_TAGS } from '../../src/core/world/tags/initialTags.js';
import { ALL_LINES } from '../../src/core/domain/Line.js';
import { ALL_STAGES } from '../../src/core/domain/Stage.js';
import facetsJson from '../../src/core/world/facets/facets.json';

const tagIds = new Set(INITIAL_TAGS.map((t) => t.id));
const store = createFacetStore(tagIds, (facetsJson as unknown as { facets: never }).facets as never);

describe('facet store (46 §2/§6/§8)', () => {
  it('the compiled store covers every module cell (8 lines × 8 stages)', () => {
    for (const line of ALL_LINES) {
      for (const stage of ALL_STAGES) {
        for (const c of ['shadow-expression', 'drive-profile'] as const) {
          expect(store.byKey(facetKeyOf(line, stage, c)), `${line}:${stage}:${c}`).toBeDefined();
        }
        // each modality file emitted voice/surface/lever × 7 modalities
        expect(store.byKey(facetKeyOf(line, stage, 'voice-register'))).toBeDefined();
        expect(store.byKey(facetKeyOf(line, stage, 'surface-aesthetic'))).toBeDefined();
        expect(store.byKey(facetKeyOf(line, stage, 'pressure-lever'))).toBeDefined();
      }
    }
  });

  it('every facet key parses and resolves to its declared line/stage/characteristic', () => {
    for (const key of store.facets.keys()) {
      const { line, stage, characteristic } = parseFacetKey(key);
      const f = store.byKey(key)!;
      expect(f.line).toBe(line);
      expect(f.stage).toBe(stage);
      expect(f.characteristic).toBe(characteristic);
    }
  });

  it('shadow-expression facets carry all 4 quadrants (AGENTS.md §5.5 all-inclusive)', () => {
    for (const line of ALL_LINES) {
      for (const stage of ALL_STAGES) {
        const f = store.byKey(facetKeyOf(line, stage, 'shadow-expression'))!;
        const payload = f.payload as unknown as { kind: string; quadrants: { quadrant: string }[] };
        const quads = payload.quadrants.map((q) => q.quadrant).sort();
        expect(quads, `${line}/${stage}`).toEqual(['Dark-Addiction', 'Dark-Allergy', 'Golden-Addiction', 'Golden-Allergy']);
      }
    }
  });

  it('drive-profile facets carry all 4 drives (AGENTS.md §5.5)', () => {
    for (const line of ALL_LINES) {
      for (const stage of ALL_STAGES) {
        const f = store.byKey(facetKeyOf(line, stage, 'drive-profile'))!;
        const payload = f.payload as unknown as { kind: string; rows: { drive: string }[] };
        for (const d of ['Agency', 'Communion', 'Eros', 'Agape']) {
          expect(payload.rows.some((r) => r.drive === d), `${line}/${stage} missing ${d}`).toBe(true);
        }
      }
    }
  });

  it('per-modality facets record which modality they came from (46 §8 tagged by modality)', () => {
    const f = store.byKey(facetKeyOf('Cognitive', 'Red', 'voice-register'))!;
    const payload = f.payload as unknown as { modality: string };
    expect(payload.modality).toBe('ImmersiveRPG');
  });

  it('byTags returns only facets tagged with a known tag', () => {
    const tagged = store.byTags(['technology']);
    for (const f of tagged) expect(f.tags).toContain('technology');
  });

  it('an unresolved tag fails closed at store construction (46 §11 invariant 4)', () => {
    const bad = [{ key: 'Cognitive:Red:stake', tags: ['nonexistent-tag'], tagAffinity: {}, payload: { kind: 'stake', wants: 'x', canLose: 'y' }, source: 'authored' }];
    expect(() => createFacetStore(tagIds, bad as never)).toThrowError(/invariant 4/);
  });

  it('a malformed facet key fails closed', () => {
    expect(() => parseFacetKey('Cognitive:Red')).toThrowError(/malformed/);
    expect(() => parseFacetKey('Nope:Red:stake')).toThrowError(/unknown line/);
    expect(() => parseFacetKey('Cognitive:Nope:stake')).toThrowError(/unknown stage/);
    expect(() => parseFacetKey('Cognitive:Red:nope')).toThrowError(/unknown characteristic/);
  });

  it('every one of the 10 characteristics is present in CHARACTERISTICS (46 §2.1)', () => {
    expect(CHARACTERISTICS).toHaveLength(10);
  });
});

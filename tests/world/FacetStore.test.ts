import { describe, it, expect } from 'vitest';
import { createFacetStore, facetKeyOf, parseFacetKey } from '../../src/core/world/facets/FacetStore.js';
import { CHARACTERISTICS } from '../../src/core/world/tags/types.js';
import { ALL_MODALITIES } from '../../src/core/domain/enums.js';
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
        // modality variants carry @Modality keys (46 §8 tagged by modality)
        for (const m of ALL_MODALITIES) {
          expect(store.byKey(`${facetKeyOf(line, stage, 'voice-register')}@${m}`), `${line}:${stage}:voice@${m}`).toBeDefined();
          expect(store.byKey(`${facetKeyOf(line, stage, 'surface-aesthetic')}@${m}`)).toBeDefined();
          expect(store.byKey(`${facetKeyOf(line, stage, 'pressure-lever')}@${m}`)).toBeDefined();
        }
        // the full 10-characteristic base set (46 §2.1)
        for (const c of CHARACTERISTICS) {
          if (['voice-register', 'surface-aesthetic', 'pressure-lever'].includes(c)) continue; // variant-keyed
          expect(store.byKey(facetKeyOf(line, stage, c)), `${line}:${stage}:${c}`).toBeDefined();
        }
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

  it('per-modality facets are keyed by @Modality and record it in the payload (46 §8)', () => {
    const f = store.byKey(`${facetKeyOf('Cognitive', 'Red', 'voice-register')}@ImmersiveRPG`)!;
    const payload = f.payload as unknown as { modality: string };
    expect(payload.modality).toBe('ImmersiveRPG');
  });

  it('the store has no duplicate keys — modality variants are distinct facets (RT-CORPUS-RECONCILE)', () => {
    const seen = new Set<string>();
    for (const f of store.facets.values()) {
      expect(seen.has(f.key), `duplicate facet key ${f.key}`).toBe(false);
      seen.add(f.key);
    }
    // per cell: 7 base characteristics + 3 modality-keyed × 7 modalities = 28 (46 §2.1's set,
    // with voice/surface/lever living as @Modality variants rather than base keys)
    expect(seen.size).toBe(64 * 28);
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
    expect(() => parseFacetKey('Cognitive:Red:nope@ImmersiveRPG')).toThrowError(/unknown characteristic/);
  });

  it('every one of the 10 characteristics is present in CHARACTERISTICS (46 §2.1)', () => {
    expect(CHARACTERISTICS).toHaveLength(10);
  });
});

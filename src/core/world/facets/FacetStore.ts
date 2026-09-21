/**
 * The facet store — 46 §6. Holds the compiled facets emitted by `scripts/compile-facets.ts`
 * (the ONLY path from corpus to store, MY-RG-0019) and answers the queries of 46 §4.4.
 */

import { ALL_LINES, type Line } from '../../domain/Line.js';
import { ALL_STAGES, type Stage } from '../../domain/Stage.js';
import { CHARACTERISTICS, type Characteristic, type TagId } from '../tags/types.js';
import type { Facet, FacetKey, FacetPayload } from './types.js';
import rawFacets from './facets.json';

export function facetKeyOf(line: Line, stage: Stage, characteristic: Characteristic): FacetKey {
  return `${line}:${stage}:${characteristic}`;
}

export function parseFacetKey(key: FacetKey): { line: Line; stage: Stage; characteristic: Characteristic } {
  const parts = key.split(':');
  if (parts.length !== 3) throw new Error(`malformed facet key '${key}'`);
  const [line, stage, characteristic] = parts;
  if (!ALL_LINES.includes(line as Line)) throw new Error(`unknown line in facet key '${key}'`);
  if (!ALL_STAGES.includes(stage as Stage)) throw new Error(`unknown stage in facet key '${key}'`);
  if (!CHARACTERISTICS.includes(characteristic as Characteristic)) {
    throw new Error(`unknown characteristic in facet key '${key}'`);
  }
  return { line: line as Line, stage: stage as Stage, characteristic: characteristic as Characteristic };
}

/** Serialisation shape — payloads survive as plain data; the store rehydrates them. */
interface RawFacet {
  key: FacetKey;
  tags: TagId[];
  tagAffinity: Record<TagId, number>;
  payload: FacetPayload;
  source: 'corpus' | 'authored' | 'generated';
}

export interface FacetStore {
  readonly facets: ReadonlyMap<FacetKey, Facet>;
  readonly count: number;
  byKey(key: FacetKey): Facet | undefined;
  byCharacteristic(c: Characteristic, line: Line, stage: Stage): Facet[];
  /** All facets tagged with any of `tagIds`, across the store (46 §4.4 pooling query). */
  byTags(tagIds: readonly TagId[]): Facet[];
  /** Facets for a module cell, i.e. all 10 characteristics of one line × stage. */
  moduleFacets(line: Line, stage: Stage): Facet[];
}

export function createFacetStore(
  tagIds: ReadonlySet<TagId>,
  raw: readonly RawFacet[] = (rawFacets as unknown as { facets: readonly RawFacet[] }).facets,
): FacetStore {
  const facets = new Map<FacetKey, Facet>();
  for (const r of raw) {
    const { line, stage, characteristic } = parseFacetKey(r.key); // throws on malformed keys
    // 46 §11 invariant 4: a facet whose tags do not resolve in the tag store is a compile error.
    const unresolved = r.tags.filter((t) => !tagIds.has(t));
    if (unresolved.length > 0) {
      throw new Error(`facet ${r.key}: unresolved tags [${unresolved.join(', ')}] — 46 §11 invariant 4`);
    }
    facets.set(r.key, {
      key: r.key,
      line,
      stage,
      characteristic,
      tags: r.tags,
      tagAffinity: r.tagAffinity,
      payload: r.payload,
      composedWith: [],
      source: r.source,
    });
  }

  const store: FacetStore = {
    facets,
    count: facets.size,
    byKey: (key) => facets.get(key),
    byCharacteristic: (c, line, stage) => {
      const f = facets.get(facetKeyOf(line, stage, c));
      return f ? [f] : [];
    },
    byTags: (tagIds_) => {
      const set = new Set(tagIds_);
      return [...facets.values()].filter((f) => f.tags.some((t) => set.has(t)));
    },
    moduleFacets: (line, stage) =>
      CHARACTERISTICS.map((c) => facets.get(facetKeyOf(line, stage, c))).filter((f): f is Facet => f !== undefined),
  };
  return store;
}

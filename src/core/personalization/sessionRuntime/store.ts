/**
 * The facet store singleton — one store per process, shared by every consumer of the seam.
 *
 * Split out of `sessionRuntime.ts` (module-cohesion audit item 7) WITHOUT weakening the
 * single-seam rule (`M6`): `../sessionRuntime.ts` re-exports every symbol, so the seam is
 * still one import path for every caller. The split is a file change, not an interface change.
 */
import type { FacetStore } from '../../world/facets/FacetStore.js';
import { INITIAL_TAGS } from '../../world/tags/initialTags.js';
import { createFacetStore } from '../../world/facets/FacetStore.js';
import facetsJson from '../../world/facets/facets.json';

// ── Facet store (per-process singleton, same pattern as the runtime bridge) ─────────────────

let facetStoreSingleton: FacetStore | null = null;

export function sharedFacetStore(): FacetStore {
  if (!facetStoreSingleton) {
    const tagIds = new Set(INITIAL_TAGS.map((t) => t.id));
    facetStoreSingleton = createFacetStore(tagIds, (facetsJson as unknown as { facets: never }).facets as never);
  }
  return facetStoreSingleton;
}

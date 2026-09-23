/**
 * The similarity/opposition index — Phase 13 d10 L1 (the plan's Polarity Pool; `46 §4.2`/§4.4).
 *
 * The W11 finding: the candidate library held exactly five renderings per cell with IDENTICAL tag
 * vectors, so a cell-targeted pool returned the same five refs for every player and the UDV's
 * bands had nothing to order (locked in Phase13Wiring.test.ts). The ratified fix derives
 * multiplicity from the library itself instead of authoring it:
 *
 *   - every tag is a POSITION on the two canonical axes (AGENTS.md §5.1: Eros↔Agape vertical,
 *     Agency↔Communion horizontal) — `initialTags.ts` carries the coordinates;
 *   - `similar(...)`  = tag-overlap + axis-proximity neighbours  → deepen FAMILIARITY;
 *   - `opposite(...)` = the tag store's own reflection geometry (`46 §4.2` — total and symmetric
 *     by construction) → the POLARITY CHALLENGE.
 *
 * `deriveLibraryVariants` walks those neighbourhoods per cell and emits RECOLOURED renderings of
 * the cell's base candidates: identical cell (altitude is the seed's job, never a variant's),
 * distinct flavour tags — which is exactly what gives `rankByRelevance` a real spread (L2's pole
 * decision and L4's selection then have something to select BETWEEN). Variants never re-altitude:
 * the coherence validator's law is inherited by construction, because a variant copies its base's
 * cell verbatim.
 *
 * Determinism: pure functions over the store + the library; no clocks, no randomness (MY-RG-0015:
 * derive what can be derived; the composition pipeline's determinism law, 46 §7.1).
 */

import type { PoolCandidate } from './pooling.js';
import type { Tag, TagId } from '../world/tags/types.js';
import type { TagStore } from '../world/tags/dialectic.js';

/** A point in the tag-ontology's axis space — the centroid of a tag set. */
export interface AxisPoint {
  readonly erosAgape: number;
  readonly agencyCommunion: number;
}

/** Centroid of a tag set over the two canonical axes. Empty set → the origin (the neutral point). */
export function axisCentroid(tags: readonly Tag[]): AxisPoint {
  if (tags.length === 0) return { erosAgape: 0, agencyCommunion: 0 };
  let e = 0;
  let a = 0;
  for (const t of tags) {
    e += t.erosAgape;
    a += t.agencyCommunion;
  }
  return { erosAgape: e / tags.length, agencyCommunion: a / tags.length };
}

export function axisDistance(a: AxisPoint, b: AxisPoint): number {
  return Math.hypot(a.erosAgape - b.erosAgape, a.agencyCommunion - b.agencyCommunion);
}

/**
 * The FAMILIAR neighbourhood of a tag: other tags ordered by overlap with the tag's facet
 * affinities first (same family), then by axis proximity. Used to recolour a rendering so the
 * same cell speaks in a NEARBY flavour the player already half-owns.
 */
export function similarTags(store: TagStore, tagId: TagId, k = 4): readonly Tag[] {
  const t = store.byId(tagId);
  if (!t) return [];
  const affinities = new Set(Object.keys(t.facetAffinity));
  const others = [...store.tags.values()].filter((c) => c.id !== t.id);
  const self = axisCentroid([t]);
  return others
    .map((c) => {
      const shared = Object.keys(c.facetAffinity).filter((ch) => affinities.has(ch)).length;
      const d = axisDistance(self, axisCentroid([c]));
      // Lower is better: shared characteristics first, then nearer on the axes.
      return { tag: c, score: d - shared * 0.5 };
    })
    .sort((a, b) => a.score - b.score || a.tag.id.localeCompare(b.tag.id))
    .slice(0, k)
    .map((x) => x.tag);
}

/**
 * The OPPOSITE neighbourhood of a tag: the store's dialectic opposite first (`46 §4.2`), then the
 * nearest tags to the reflected axis point. This is the polarity-challenge walk — the flavour
 * domain the player does NOT already own, never chosen from the aversion set (the veto is
 * applied by the caller; the walk itself is pure geometry).
 */
export function oppositeTags(store: TagStore, tagId: TagId, k = 4): readonly Tag[] {
  const t = store.byId(tagId);
  if (!t) return [];
  const reflected = store.reflect(t);
  const out: Tag[] = [];
  try {
    const o = store.opposite(t.id);
    if (o.id !== t.id) out.push(o); // reflexive-safe: an origin tag carries no structural payload
  } catch {
    // unresolved opposite: the walk degrades to pure reflection neighbours (fail-soft — the
    // veto/state layers still guard what is actually selected)
  }
  const others = [...store.tags.values()].filter((c) => c.id !== t.id && !out.some((o) => o.id === c.id));
  const rest = others
    .map((c) => ({ tag: c, d: axisDistance({ erosAgape: reflected.erosAgape, agencyCommunion: reflected.agencyCommunion }, axisCentroid([c])) }))
    .sort((a, b) => a.d - b.d || a.tag.id.localeCompare(b.tag.id))
    .slice(0, Math.max(0, k - out.length))
    .map((x) => x.tag);
  return [...out, ...rest];
}

/** The axis position of a candidate — the centroid of its flavour tags. */
export function candidatePosition(store: TagStore, c: PoolCandidate): AxisPoint {
  const tags = c.tags.map((id) => store.byId(id)).filter((t): t is Tag => t !== undefined);
  return axisCentroid(tags);
}

/** How far a candidate's flavour sits from a point in axis space (the pole-decision metric). */
export function distanceFrom(store: TagStore, c: PoolCandidate, p: AxisPoint): number {
  return axisDistance(candidatePosition(store, c), p);
}

/**
 * One derived variant: the base's cell and tier verbatim, a RECOLOURED tag vector, and an id
 * that names its provenance (`~sim` = familiar-capable recolour, `~opp` = unfamiliar-capable
 * recolour). The id stays library-unique so pooling/veto bookkeeping cannot collide.
 */
export interface DerivedVariant {
  readonly candidate: PoolCandidate;
  readonly kind: 'similar' | 'opposite';
}

/** Recolour a base candidate's tags through a walk, keeping the base's cell/stratum/depth. */
function recolour(base: PoolCandidate, tags: readonly TagId[], kind: 'similar' | 'opposite', n: number): DerivedVariant {
  const id = `${base.id}~${kind === 'similar' ? 'sim' : 'opp'}${n}`;
  return {
    kind,
    candidate: {
      id,
      cell: base.cell, // altitude is the seed's job — a variant NEVER re-altitudes
      tags: [...tags],
      stratum: base.stratum,
      depthFloor: base.depthFloor,
      landsIn: [...tags],
    },
  };
}

/**
 * Derive the variants for one base candidate: one familiar-capable recolour (the most similar
 * nearby flavour) and one unfamiliar-capable recolour (the dialectic-opposite flavour). These two
 * are the per-cell floor G35 asserts: without them a cell cannot serve both poles of the polarity
 * decision. Deterministic; identical inputs yield identical variants.
 */
export function deriveVariantsFor(base: PoolCandidate, store: TagStore): readonly DerivedVariant[] {
  if (base.tags.length === 0) return []; // no vocabulary to walk from — the base serves as-is
  const anchor = base.tags[0];
  const sim = similarTags(store, anchor, 3);
  const opp = oppositeTags(store, anchor, 3);
  const out: DerivedVariant[] = [];
  // A recolour keeps any base tag that survives the walk so the flavour stays related to the
  // cell's canon; the walked tags lead so the vector genuinely differs.
  const simTags = [...sim.map((t) => t.id), ...base.tags].filter((t, i, a) => a.indexOf(t) === i).slice(0, Math.max(1, base.tags.length));
  const oppTags = [...opp.map((t) => t.id), ...base.tags].filter((t, i, a) => a.indexOf(t) === i).slice(0, Math.max(1, base.tags.length));
  if (sim.length > 0) out.push(recolour(base, simTags, 'similar', 1));
  if (opp.length > 0) out.push(recolour(base, oppTags, 'opposite', 1));
  return out;
}

/**
 * Derive variants for the WHOLE library (Phase 13 d10 L1). Idempotent by WHOLE-LIBRARY detection:
 * if the input already carries any derived id, it is returned as-is — derivation is a
 * construction-time step (services build), and re-running over a derived library must neither
 * duplicate variant ids nor derive-from-variant (a variant of a variant would drift flavour from
 * its cell's canon).
 *
 * The result: every cell that has at least one tagged base candidate now carries ≥3 renderings
 * with pairwise-distinct tag vectors — one canon + one familiar-capable + one unfamiliar-capable —
 * which is what makes the UDV a real retrieval key (the differential criterion).
 */
export function deriveLibraryVariants(library: readonly PoolCandidate[], store: TagStore): readonly PoolCandidate[] {
  if (library.some((c) => c.id.includes('~sim') || c.id.includes('~opp'))) return library;
  const out: PoolCandidate[] = [];
  for (const c of library) {
    out.push(c);
    for (const v of deriveVariantsFor(c, store)) out.push(v.candidate);
  }
  return out;
}

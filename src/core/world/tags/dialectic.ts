/**
 * The dialectic relation — 46 §4.2.
 *
 * `opposite(t)` = the tag nearest to `reflect(t)`, where reflect negates both axis coordinates.
 * Geometry PROPOSES a pole; the curated `dialecticPair` overrides where culture, not geometry,
 * decides the pedagogic opposite. The relation is total (every tag resolves) and symmetric
 * (`opposite(opposite(t)) === t`, 46 §11 invariant 2 — asserted at construction, not assumed).
 *
 * Derivation is a **symmetric closure**: curated pairs bind first (and their mutuality is
 * verified — a one-way override is a construction error), then every remaining tag is matched,
 * by nearest reflection, *among the other remaining tags*. Matching within the unmatched pool is
 * what makes derived symmetry hold by construction instead of by luck: pairing t with an already
 * paired tag would either break that tag's existing pair or leave the pair one-way.
 *
 * Reflexive-safe (46 §4.2): a tag at the origin reflects to itself and MUST declare its own
 * opposite explicitly, or the store refuses to construct.
 */

import type { Tag, TagId } from './types.js';
import { INITIAL_TAGS } from './initialTags.js';

export interface TagStore {
  readonly tags: ReadonlyMap<TagId, Tag>;
  byId(id: TagId): Tag | undefined;
  /** Reflect the tag's axis position and return the nearest tag by Euclidean distance. */
  reflect(t: Tag): Tag;
  /** `opposite(opposite(t)) === t` — verified at store construction; throws when violated. */
  opposite(id: TagId): Tag;
  distance(a: Tag, b: Tag): number;
}

function reflect(t: Tag): { erosAgape: number; agencyCommunion: number } {
  return { erosAgape: -t.erosAgape, agencyCommunion: -t.agencyCommunion };
}

function distance(a: Tag, b: Tag): number {
  return Math.hypot(a.erosAgape - b.erosAgape, a.agencyCommunion - b.agencyCommunion);
}

export function createTagStore(tags: readonly Tag[] = INITIAL_TAGS): TagStore {
  const map = new Map<TagId, Tag>(tags.map((t) => [t.id, t]));
  if (map.size !== tags.length) throw new Error('tag store: duplicate tag ids');

  const pairs = new Map<TagId, TagId>();

  // ── Pass 1: curated pairs bind first; mutuality is verified, never assumed. ──
  for (const t of tags) {
    if (t.dialecticPair === undefined) continue;
    const p = map.get(t.dialecticPair);
    if (p === undefined) {
      throw new Error(
        `tag ${t.id}: curated dialecticPair '${t.dialecticPair}' does not resolve (DG17's lesson applied to content, 46 §11 invariant 4)`,
      );
    }
    if (p.dialecticPair !== t.id) {
      throw new Error(
        `tag ${t.id}: curated pair is not mutual — opposite(${p.id})=${p.dialecticPair ?? 'unresolved'}`,
      );
    }
    pairs.set(t.id, p.id);
  }

  // ── Reflexive-safe gate: an origin tag must declare its own opposite explicitly. ──
  for (const t of tags) {
    if (t.dialecticPair === undefined && Math.hypot(t.erosAgape, t.agencyCommunion) < 0.2) {
      throw new Error(
        `tag ${t.id} sits at the origin and must declare its own dialecticPair explicitly (46 §4.2 reflexive-safe rule)`,
      );
    }
  }

  // ── Pass 2: derive the rest by nearest reflection WITHIN the unmatched pool. ──
  // Greedy nearest-pair matching over the pool; symmetric by construction because both endpoints
  // are chosen together and removed together.
  const pool = tags.filter((t) => !pairs.has(t.id));
  const remaining = new Set<TagId>(pool.map((t) => t.id));
  while (remaining.size > 1) {
    let bestA: Tag | undefined;
    let bestB: Tag | undefined;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const a of pool) {
      if (!remaining.has(a.id)) continue;
      const r = reflect(a);
      for (const b of pool) {
        if (b.id === a.id || !remaining.has(b.id)) continue;
        const score = Math.hypot(b.erosAgape - r.erosAgape, b.agencyCommunion - r.agencyCommunion);
        if (score < bestScore) {
          bestScore = score;
          bestA = a;
          bestB = b;
        }
      }
    }
    if (bestA === undefined || bestB === undefined) break; // single leftover: it has a curated partner
    pairs.set(bestA.id, bestB.id);
    pairs.set(bestB.id, bestA.id);
    remaining.delete(bestA.id);
    remaining.delete(bestB.id);
  }
  if (remaining.size === 1) {
    // A curated pair already consumed this tag's partner; nothing can pair the leftover.
    const leftover = [...remaining][0];
    throw new Error(`tag ${leftover}: no unmatched pool remains — its reflection is already paired; declare a curated dialecticPair`);
  }

  const oppositeCache = new Map<TagId, Tag>(
    [...pairs.entries()].map(([a, b]) => [a, map.get(b) as Tag]),
  );

  const store: TagStore = {
    tags: map,
    byId: (id) => map.get(id),
    reflect: (t) => {
      let best: Tag | undefined;
      let bestD = Number.POSITIVE_INFINITY;
      for (const c of tags) {
        if (c.id === t.id) continue;
        const d = distance(c, { ...t, erosAgape: -t.erosAgape, agencyCommunion: -t.agencyCommunion });
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (best === undefined) throw new Error(`tag store: no candidate for reflection of ${t.id}`);
      return best;
    },
    opposite: (id) => {
      const o = oppositeCache.get(id);
      if (o === undefined) {
        throw new Error(`unknown tag '${id}' or unresolved opposite (46 §11 invariant 4: fail closed, never silently drop)`);
      }
      return o;
    },
    distance,
  };
  return store;
}

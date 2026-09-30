import type { DepthLevel } from '$core/curriculum/types.js';
import type { GraphNode } from '$core/curriculum/KnowledgeGraph.js';

/**
 * Knowledge Map layout — the pure geometry, extracted from `KnowledgeMap.svelte`.
 *
 * WHY EXTRACTED. `KnowledgeMap` shipped this logic untested inside three `$derived.by` closures, and
 * Views 2–5 of `33 §3.1` were about to copy its shape four more times. A debt copied four times is a
 * debt compounded four times, so the geometry is here, testable without a browser, and the component
 * is left holding only what belongs in a component.
 *
 * THE BUG THIS EXTRACTION FOUND. `depthOrdinalFor` counted WAVES, not edges:
 *
 *     let depth = 0;
 *     while (frontier.length > 0 && depth < 5) { …; frontier = next; depth++; }
 *     return depth;
 *
 * A concept with no prerequisites enters with `frontier = [id]`, finds `next = []`, assigns
 * `frontier = []`, and THEN increments `depth` — so it returns 1, not 0. Since ring 0 is the outer
 * ring ("depth 0 (prerequisite roots) on the outside"), every true root was drawn one ring too far in,
 * and a leaf's ring was indistinguishable from a concept with exactly one prerequisite. Nothing
 * surfaced it: the rings still looked plausible, because a systematic off-by-one in a circular layout
 * is still a circular layout.
 *
 * `depth - 1` is correct because the loop's last increment accounts for a wave that produced nothing.
 * The alternative — incrementing only when `next` is non-empty — is the same number with one fewer
 * reason to be wrong, and it is what is written here.
 */

/** Ring cap: five concentric bands, matching `33 §3.1`'s "gaps are visible as missing nodes". */
export const MAX_RING = 5;

/** Ring ordinal for a concept, from its own prerequisite closure. A true root is 0. */
export function depthOrdinalFor(id: string, adjacency: ReadonlyMap<string, readonly string[]>): number {
  const seen = new Set<string>();
  let frontier = [id];
  let depth = 0;
  // The cap is belt-and-braces against a cycle in the prerequisite graph: `seen` already prevents an
  // infinite walk, but a cyclic corpus would otherwise make `depth` grow without bound. The bound is
  // `MAX_RING - 1` because that is the deepest ring `layoutRings` will use — a function that can return
  // a value its only caller has to clamp is a function whose contract is split in two.
  while (frontier.length > 0 && depth < MAX_RING - 1) {
    const next: string[] = [];
    for (const f of frontier) {
      for (const pre of adjacency.get(f) ?? []) {
        if (!seen.has(pre)) {
          seen.add(pre);
          next.push(pre);
        }
      }
    }
    // Counting waves: increment only when this wave actually found prerequisites. The buggy version
    // incremented unconditionally, so a leaf returned 1.
    if (next.length === 0) break;
    frontier = next;
    depth += 1;
  }
  return depth;
}

export interface Placed {
  readonly node: GraphNode;
  readonly x: number;
  readonly y: number;
  readonly depth: DepthLevel;
  readonly met: boolean;
}

/**
 * Concentric rings: depth 0 (prerequisite roots) on the OUTSIDE, the deepest in the middle, so a gap
 * in the middle reads as a hole — the visual language `33 §3.1` asks for ("gaps are visible as missing
 * nodes or thin connections").
 *
 * @param size       square viewport; the centre is `size / 2`.
 * @param depthOf    a concept's own depth LEVEL (the learner's state), not its ring — the two are
 *                   unrelated and conflating them is the bug this module exists to prevent.
 */
export function layoutRings(
  nodes: Iterable<GraphNode>,
  adjacency: ReadonlyMap<string, readonly string[]>,
  depthOf: (id: string) => DepthLevel,
  encountered: ReadonlySet<string>,
  size: number,
): Placed[] {
  const byRing = new Map<number, GraphNode[]>();
  for (const node of nodes) {
    const ring = Math.min(MAX_RING - 1, depthOrdinalFor(node.id, adjacency));
    const bucket = byRing.get(ring);
    if (bucket) bucket.push(node);
    else byRing.set(ring, [node]);
  }

  const out: Placed[] = [];
  // Deepest ring first, so iteration order is stable regardless of insertion order.
  for (const [ring, ringNodes] of [...byRing.entries()].sort((a, b) => b[0] - a[0])) {
    const radius = (size / 2 - 40) * (1 - ring / MAX_RING);
    const n = ringNodes.length || 1;
    ringNodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / n;
      out.push({
        node,
        x: size / 2 + radius * Math.cos(angle),
        y: size / 2 + radius * Math.sin(angle),
        depth: depthOf(node.id),
        met: encountered.has(node.id),
      });
    });
  }
  return out;
}

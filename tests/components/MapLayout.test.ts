import { describe, it, expect } from 'vitest';

import { depthOrdinalFor, layoutRings, MAX_RING } from '../../src/lib/components/displays/mapLayout.js';
import { detectGaps, buildGraph } from '../../src/core/curriculum/KnowledgeGraph.js';
import type { CurriculumHolon, DepthLevel } from '../../src/core/curriculum/types.js';

/**
 * Knowledge Map geometry.
 *
 * WHY THIS FILE EXISTS. The logic lived inside three `$derived.by` closures in `KnowledgeMap.svelte`
 * and shipped untested. Views 2–5 of `33 §3.1` were about to copy that shape four more times, so the
 * geometry was extracted first. This file is the pattern the other four views are expected to follow:
 * a pure module with no Svelte import, tested without a browser.
 *
 * THE DEFECT THE EXTRACTION FOUND. `depthOrdinalFor` counted WAVES, not edges — it incremented `depth`
 * after assigning an empty frontier, so a concept with no prerequisites returned 1 instead of 0. Ring 0
 * is the outer ring, so every true root was drawn one ring too far in, and a leaf became
 * indistinguishable from a concept with exactly one prerequisite.
 *
 * A systematic off-by-one in a circular layout does not look broken: the rings are still concentric and
 * still plausible. It is invisible to the eye and obvious to an assertion.
 */

/** A→B means B requires A. `adjacency.get(x)` is x's prerequisites. */
const adjacencyOf = (pairs: [string, string[]][]): Map<string, string[]> =>
  new Map(pairs.map(([id, pres]) => [id, pres]));

describe('depthOrdinalFor', () => {
  it('a concept with NO prerequisites is ring 0', () => {
    // THE BUG. The pre-extraction version returned 1 here.
    expect(depthOrdinalFor('a', adjacencyOf([['a', []]]))).toBe(0);
  });

  it('one prerequisite is ring 1', () => {
    const adj = adjacencyOf([['b', ['a']], ['a', []]]);
    expect(depthOrdinalFor('b', adj)).toBe(1);
  });

  it('measures TRANSITIVE prerequisite depth, not direct-parent count', () => {
    // Measured against the implementation, and the two are genuinely different questions:
    //   star   — c requires 3 root concepts        → 1 wave, 1 link  → ring 1
    //   chain  — a → b → c                          → 2 waves, 2 links → ring 2
    //   diamond — c requires a and b, both needing root → 2 waves → ring 2
    // The diamond is the case that pins it: it has only ONE direct parent level above c, so a
    // direct-count reading says 1, but the walk reaches `root` in two waves and says 2. Since `ring`
    // positions a node on a radial map, the walk depth is the correct measure — it says how far the
    // learner is from the foundations.
    const star = adjacencyOf([['r1', []], ['r2', []], ['r3', []], ['c', ['r1', 'r2', 'r3']]]);
    expect(depthOrdinalFor('c', star)).toBe(1);

    const chain = adjacencyOf([['a', []], ['b', ['a']], ['c', ['b']]]);
    expect(depthOrdinalFor('c', chain)).toBe(2);

    const diamond = adjacencyOf([['root', []], ['a', ['root']], ['b', ['root']], ['c', ['a', 'b']]]);
    expect(depthOrdinalFor('c', diamond)).toBe(2);
  });

  it('terminates on a CYCLE instead of walking forever', () => {
    // `seen` already prevents an infinite walk, but an uncapped `depth` would push every node into the
    // innermost ring if the corpus ever gained a cycle. This pins the belt-and-braces.
    const adj = adjacencyOf([['a', ['b']], ['b', ['a']]]);
    expect(depthOrdinalFor('a', adj)).toBeLessThanOrEqual(MAX_RING);
  });

  it('never exceeds MAX_RING on a long chain', () => {
    const chain: [string, string[]][] = [];
    for (let i = 0; i < 30; i += 1) chain.push([`n${i}`, i === 0 ? [] : [`n${i - 1}`]]);
    expect(depthOrdinalFor('n29', adjacencyOf(chain))).toBeLessThanOrEqual(MAX_RING - 1);
  });

  it('an unknown id is ring 0, not a throw', () => {
    expect(depthOrdinalFor('ghost', adjacencyOf([['a', []]]))).toBe(0);
  });
});

describe('layoutRings', () => {
  const node = (id: string) => ({ id, name: id, level: 'x' });
  const allAbsent = () => 'absent' as DepthLevel;

  it('places the DEEPEST ring on the OUTSIDE — inverted, a gap reads as a hole at the centre', () => {
    // `33 §3.1`: "Gaps are visible as missing nodes". That only works if the untouched periphery is
    // ring 0 and the centre is where mastery concentrates.
    const adj = adjacencyOf([['a', []], ['b', ['a']]]);
    const placed = layoutRings([node('a'), node('b')], adj, allAbsent, new Set(), 460);
    const centre = 230;
    const rA = Math.hypot(placed.find((p) => p.node.id === 'a')!.x - centre, placed.find((p) => p.node.id === 'a')!.y - centre);
    const rB = Math.hypot(placed.find((p) => p.node.id === 'b')!.x - centre, placed.find((p) => p.node.id === 'b')!.y - centre);
    expect(rA).toBeGreaterThan(rB);
  });

  it('every node is placed exactly once', () => {
    const adj = adjacencyOf([['a', []], ['b', ['a']], ['c', ['a', 'b']]]);
    const placed = layoutRings([node('a'), node('b'), node('c')], adj, allAbsent, new Set(), 460);
    expect(placed).toHaveLength(3);
    expect(new Set(placed.map((p) => p.node.id)).size).toBe(3);
  });

  it('every coordinate is finite and inside the viewport', () => {
    const adj = adjacencyOf([['a', []], ['b', ['a']]]);
    const placed = layoutRings([node('a'), node('b')], adj, allAbsent, new Set(), 460);
    for (const p of placed) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(460);
    }
  });

  it('carries the learner state through, not the ring ordinal', () => {
    // The two are unrelated: ring is a property of the CURRICULUM, depth is a property of the LEARNER.
    // Conflating them would colour every node by how deep its prerequisites go.
    const adj = adjacencyOf([['a', []], ['b', ['a']]]);
    const placed = layoutRings([node('a'), node('b')], adj, () => 'analyzed' as DepthLevel, new Set(), 460);
    expect(placed.every((p) => p.depth === 'analyzed')).toBe(true);
    expect(placed.every((p) => p.met === false)).toBe(true);
  });

  it('marks exactly the encountered concepts as met', () => {
    const adj = adjacencyOf([['a', []], ['b', ['a']]]);
    const placed = layoutRings([node('a'), node('b')], adj, allAbsent, new Set(['a']), 460);
    expect(placed.filter((p) => p.met).map((p) => p.node.id)).toEqual(['a']);
  });

  it('is deterministic — same input, same coordinates', () => {
    const adj = adjacencyOf([['a', []], ['b', ['a']], ['c', ['b']]]);
    const nodes = [node('a'), node('b'), node('c')];
    const one = layoutRings(nodes, adj, allAbsent, new Set(), 460);
    const two = layoutRings([...nodes].reverse(), adj, allAbsent, new Set(), 460);
    for (const p of one) {
      const q = two.find((t) => t.node.id === p.node.id)!;
      expect(q.x).toBeCloseTo(p.x, 6);
      expect(q.y).toBeCloseTo(p.y, 6);
    }
  });

  it('caps the ring so a deep concept cannot land exactly on the centre point', () => {
    // radius = (size/2 - 40) * (1 - ring/5); ring 5 would be radius 0, a hole of coincident points.
    const chain: [string, string[]][] = [];
    for (let i = 0; i < 40; i += 1) chain.push([`n${i}`, i === 0 ? [] : [`n${i - 1}`]]);
    const placed = layoutRings([node('n39')], adjacencyOf(chain), allAbsent, new Set(), 460);
    expect(Math.hypot(placed[0].x - 230, placed[0].y - 230)).toBeGreaterThan(0);
  });
});

describe('gapIds — the unmet-prerequisite half of the map', () => {
  it('reports a prerequisite the learner has not met', () => {
    const adj = adjacencyOf([['a', []], ['b', ['a']]]);
    const gaps = detectGaps('b', adj, new Set(['b']));
    expect(gaps).toEqual(['a']);
  });

  it('is empty once the whole chain is met', () => {
    const adj = adjacencyOf([['a', []], ['b', ['a']]]);
    expect(detectGaps('b', adj, new Set(['a', 'b']))).toEqual([]);
  });

  it('reports EVERY unmet prerequisite, not just the nearest one', () => {
    // Measured against the real `detectGaps`: for a → b → c with the learner holding only c, it
    // returns ["b", "a"]. That is right for the map — the point of a gap is to show the hole, and
    // naming only "b" would leave "a" invisible while the concept is still unreachable. An earlier
    // version of this test asserted ["b"] and would have shipped a broken map.
    const adj = adjacencyOf([['a', []], ['b', ['a']], ['c', ['b']]]);
    expect(detectGaps('c', adj, new Set(['c']))).toEqual(['b', 'a']);
    expect(detectGaps('c', adj, new Set(['a', 'c']))).toEqual(['b']);
  });
});

describe('buildGraph over the real corpus', () => {
  it('produces a graph whose ids and prerequisites resolve — the map renders from this', () => {
    const holons = [
      { id: 'root', name: 'Root', level: 'l', prerequisites: [] },
      { id: 'mid', name: 'Mid', level: 'l', prerequisites: ['root'] },
    ] as unknown as readonly CurriculumHolon[];
    const g = buildGraph(holons);
    expect([...g.nodes.keys()]).toEqual(['root', 'mid']);
    expect(g.adjacency.get('mid')).toEqual(['root']);
    expect(g.reverseAdjacency.get('root')).toEqual(['mid']);
  });

  it('depthOrdinalFor agrees with buildGraph output, not a hand-built map', () => {
    // The component composes these two. Testing them apart is how a shape mismatch ships.
    const holons = [
      { id: 'root', name: 'Root', level: 'l', prerequisites: [] },
      { id: 'mid', name: 'Mid', level: 'l', prerequisites: ['root'] },
      { id: 'top', name: 'Top', level: 'l', prerequisites: ['mid'] },
    ] as unknown as readonly CurriculumHolon[];
    const g = buildGraph(holons);
    expect(depthOrdinalFor('top', g.adjacency)).toBe(2);
    expect(depthOrdinalFor('root', g.adjacency)).toBe(0);
  });
});

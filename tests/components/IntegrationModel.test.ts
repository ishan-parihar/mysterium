import { describe, it, expect } from 'vitest';

import { analogyEdges, patternClusters, linesInvolved } from '../../src/lib/components/displays/integrationModel.js';
import { seedCurriculumRegistry } from '../../src/core/curriculum/CurriculumSeed.js';
import { getCurriculumRegistry } from '../../src/core/curriculum/CurriculumRegistry.js';
import type { CurriculumHolon, DepthLevel, KnowledgeState } from '../../src/core/curriculum/types.js';
import { ALL_LINES } from '../../src/core/domain/Line.js';

/**
 * Integration Map — canon `33 §3.1` View 5 (`:152-163`), gated on `analyzed` depth by `§3.2:170`.
 *
 * The data needed no authoring: 55 of 113 corpus holons already carry `isomorphisms` with a
 * `pattern`, a `targetConceptId` and a `limitations` string. The tests below mostly guard the GATE and
 * the honesty of the rendering, since the corpus is not in question.
 */

const iso = (targetConceptId: string, pattern: string, limitations = '') => ({
  pattern,
  targetConceptId,
  targetDomain: 'Other',
  mappingDescription: '',
  limitations,
});

const holon = (
  id: string,
  primary: (typeof ALL_LINES)[number],
  secondary: (typeof ALL_LINES)[number][] = [],
  isomorphisms: ReturnType<typeof iso>[] = [],
): CurriculumHolon =>
  ({
    id,
    name: id,
    prerequisites: [],
    isomorphisms,
    devMapping: { primaryLine: primary, secondaryLines: secondary, stageRange: { min: 'Red', max: 'Turquoise' } },
  }) as unknown as CurriculumHolon;

const stateOf = (byId: Record<string, DepthLevel>): KnowledgeState =>
  ({
    conceptStates: new Map(
      Object.entries(byId).map(([id, depthLevel]) => [
        id,
        { depthLevel, retention: 1, lastReviewedAt: 0, reviewCount: 1, depthHistory: [], misconceptionFlags: [] },
      ]),
    ),
    subjectProgress: new Map(),
    studyHistory: [],
  }) as unknown as KnowledgeState;

describe('analogyEdges — the analyzed gate', () => {
  const h = [holon('a', 'Cognitive', [], [iso('b', 'recursion')]), holon('b', 'Moral')];

  it('a concept BELOW analyzed contributes nothing', () => {
    // Canon §3.2:170: the map is only visible at 'analyzed' depth. Measured on the real ladder
    // (`analyzed` = ordinal 4 of 0..6), every rung below it yields zero edges. An earlier version of
    // this test also asserted `evaluated` was excluded, which contradicts the gate's own docblock —
    // `evaluated` is ABOVE `analyzed` and must be included, or a learner who has gone further sees
    // LESS than one who stopped.
    for (const below of ['absent', 'memorized', 'comprehended', 'applied'] as DepthLevel[]) {
      expect(analogyEdges(h, stateOf({ a: below })), `${below} was above the gate`).toEqual([]);
    }
    expect(analogyEdges(h, stateOf({}))).toEqual([]);
    expect(analogyEdges(h, undefined)).toEqual([]);
  });

  it('a concept AT analyzed contributes its links', () => {
    const edges = analogyEdges(h, stateOf({ a: 'analyzed' }));
    expect(edges).toHaveLength(1);
    expect(edges[0]!.from).toBe('a');
  });

  it('EVERY rung above analyzed counts — the gate is a floor, not an equality', () => {
    for (const above of ['analyzed', 'evaluated', 'transformed'] as DepthLevel[]) {
      expect(analogyEdges(h, stateOf({ a: above })), `${above} was below the gate`).toHaveLength(1);
    }
  });

  it('the gate is on the SOURCE, so an unreached TARGET is still shown', () => {
    // The isomorphism is a claim the CORPUS makes; the reach gate is on the understanding the learner
    // already has, not on the destination. Gating the target would hide exactly the connections worth
    // showing — the ones that lead somewhere new.
    const edges = analogyEdges(h, stateOf({ a: 'analyzed' }));
    expect(edges[0]!.to).toBe('b');
  });
});

describe('analogyEdges — honesty', () => {
  it('carries the LIMITATION verbatim', () => {
    // The reason this view is worth building: "Recursion connects to Logic" teaches a false transfer;
    // "recursion adds execution order and stack depth" teaches where it stops.
    const h = [holon('a', 'Cognitive', [], [iso('b', 'recursion', 'adds execution order')]), holon('b', 'Moral')];
    expect(analogyEdges(h, stateOf({ a: 'analyzed' }))[0]!.limitation).toBe('adds execution order');
  });

  it('an unresolvable target is DROPPED, not rendered as a dangling edge', () => {
    // A map whose edge points at nothing is worse than one missing an edge, and rendering the id would
    // put a corpus defect on a player surface.
    const h = [holon('a', 'Cognitive', [], [iso('ghost', 'recursion')])];
    expect(analogyEdges(h, stateOf({ a: 'analyzed' }))).toEqual([]);
  });

  it('marks a same-domain link as NOT cross-domain', () => {
    const h = [holon('a', 'Cognitive', [], [iso('b', 'x')]), holon('b', 'Cognitive')];
    expect(analogyEdges(h, stateOf({ a: 'analyzed' }))[0]!.crossDomain).toBe(false);
  });

  it('cross-domain links sort FIRST — they are the ones the view exists to reveal', () => {
    const h = [
      holon('a', 'Cognitive', [], [iso('same', 'zzz-last')]),
      holon('same', 'Cognitive'),
      holon('b', 'Moral', [], [iso('other', 'aaa-first')]),
      holon('other', 'Spiritual'),
    ];
    const edges = analogyEdges(h, stateOf({ a: 'analyzed', b: 'analyzed' }));
    expect(edges.map((e) => e.crossDomain)).toEqual([true, false]);
  });

  it('carries NO closed-register vocabulary (AGENTS.md §5.4)', () => {
    const h = [holon('a', 'Cognitive', [], [iso('b', 'trade-off')]), holon('b', 'Moral')];
    const text = analogyEdges(h, stateOf({ a: 'analyzed' }))
      .flatMap((e) => [e.pattern, e.limitation, e.fromName, e.toName])
      .join(' ')
      .toLowerCase();
    for (const closed of ['polarity', 'quadrant', 'darkaddiction', 'rayprofile', 'harvest', 'crystallization']) {
      expect(text).not.toContain(closed);
    }
  });
});

describe('patternClusters', () => {
  it('groups on the pattern string, and drops groups of ONE', () => {
    // A cluster of one is a node, not a cluster; listing it pads the view with edges already drawn.
    const h = [
      holon('a', 'Cognitive', [], [iso('b', 'recursion')]),
      holon('b', 'Moral', [], [iso('a', 'recursion')]),
      holon('c', 'Spiritual', [], [iso('ghost', 'lonely')]),
    ];
    const clusters = patternClusters(analogyEdges(h, stateOf({ a: 'analyzed', b: 'analyzed' })));
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.pattern).toBe('recursion');
    expect([...clusters[0]!.members].sort()).toEqual(['a', 'b']);
  });

  it('ranks clusters by how many links leave the member domain', () => {
    const h = [
      holon('a', 'Cognitive', [], [iso('x', 'shared')]),
      holon('x', 'Moral', [], [iso('y', 'shared')]),
      holon('y', 'Spiritual'),
      holon('p', 'Cognitive', [], [iso('q', 'internal')]),
      holon('q', 'Cognitive', [], [iso('r', 'internal')]),
      holon('r', 'Cognitive'),
    ];
    const clusters = patternClusters(analogyEdges(h, stateOf({ a: 'analyzed', x: 'analyzed', p: 'analyzed', q: 'analyzed' })));
    expect(clusters[0]!.pattern).toBe('shared');
    expect(clusters[0]!.crossDomainLinks).toBe(2);
    expect(clusters[1]!.crossDomainLinks).toBe(0);
  });
});

describe('linesInvolved', () => {
  it('lists only lines that appear, in CANONICAL order', () => {
    const h = [
      holon('a', 'Spiritual', [], [iso('b', 'x')]),
      holon('b', 'Cognitive'),
    ];
    expect(linesInvolved(analogyEdges(h, stateOf({ a: 'analyzed' })))).toEqual(['Cognitive', 'Spiritual']);
  });

  it('is empty when nothing has reached analyzed', () => {
    expect(linesInvolved(analogyEdges([], stateOf({})))).toEqual([]);
  });
});

describe('the REAL corpus', () => {
  const corpus = () => {
    seedCurriculumRegistry();
    return getCurriculumRegistry().getAll();
  };

  it('produces edges once the learner has analysed enough — the map is NOT decoration', () => {
    const holons = corpus();
    // Analyse EVERY concept. The gate must open; if it does not, the view never renders for anyone.
    const all: Record<string, DepthLevel> = {};
    for (const h of holons) all[h.id] = 'analyzed';
    const edges = analogyEdges(holons, stateOf(all));
    expect(edges.length, 'the real corpus produced no integration edges at all').toBeGreaterThan(20);
  });

  it('every edge resolves to a REAL corpus concept on both ends', () => {
    const holons = corpus();
    const all: Record<string, DepthLevel> = {};
    for (const h of holons) all[h.id] = 'analyzed';
    const ids = new Set(holons.map((h) => h.id));
    for (const e of analogyEdges(holons, stateOf(all))) {
      expect(ids.has(e.from)).toBe(true);
      expect(ids.has(e.to)).toBe(true);
    }
  });

  it('a REAL isomorphism carries a caveat where the corpus author judged one was needed', () => {
    // MEASURED, not hoped for: 57 isomorphisms, 17 with a `limitations` string — 29.8%. The corpus
    // writes caveats where a transfer is genuinely dangerous ("Mergesort uses extra space; quicksort
    // is in-place") and not otherwise, which is better authoring than a uniform rate would be. An
    // earlier version of this test asserted >50% and failed against a correct model: the assumption
    // was the defect, not the data.
    //
    // The assertion is therefore "the caveat channel is USED", not "every edge has one" — and it is
    // paired with the component rendering an explicit empty state when a link has no caveat, so a
    // bare transfer is never presented as if it were complete.
    const holons = corpus();
    const all: Record<string, DepthLevel> = {};
    for (const h of holons) all[h.id] = 'analyzed';
    const edges = analogyEdges(holons, stateOf(all));
    const withLimit = edges.filter((e) => e.limitation.length > 0);
    // 57 authored isomorphisms resolve to 52 renderable edges: five name a `targetConceptId` the
    // registry does not hold, and the model drops them rather than pointing the map at nothing. The
    // count difference is the dangling-target guard doing its job, and it is pinned so a future corpus
    // edit that breaks more targets shows up as a number rather than as a quietly smaller map.
    // Measured on the real corpus, in the order the model produces them: 52 of the 57 authored
    // isomorphisms resolve, of which 15 carry a caveat. The two that are both caveated AND dangling are
    // why the counts differ by more than the target drop alone, and pinning all three numbers makes a
    // future corpus edit show up as a number rather than as a quietly smaller map.
    expect(edges.length).toBe(52);
    expect(withLimit.length).toBe(15);
    expect(withLimit[0]!.limitation.length).toBeGreaterThan(0);
  });

  it('cross-domain edges EXIST in the real corpus — the view has something to reveal', () => {
    const holons = corpus();
    const all: Record<string, DepthLevel> = {};
    for (const h of holons) all[h.id] = 'analyzed';
    const edges = analogyEdges(holons, stateOf(all));
    expect(edges.some((e) => e.crossDomain)).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';

import { studyPlan, reviewBoundaryDays } from '../../src/lib/components/displays/plannerModel.js';
import { buildGraph } from '../../src/core/curriculum/KnowledgeGraph.js';
import { seedCurriculumRegistry } from '../../src/core/curriculum/CurriculumSeed.js';
import { getCurriculumRegistry } from '../../src/core/curriculum/CurriculumRegistry.js';
import { DEFAULT_FORGETTING_PARAMS } from '../../src/core/curriculum/types.js';
import type { CurriculumHolon, DepthLevel, KnowledgeState } from '../../src/core/curriculum/types.js';
import type { Line } from '../../src/core/domain/Line.js';

/**
 * Study Planner — canon `33 §3.1` View 4 (`:130-150`).
 *
 * The engine's own `themeRationale` is `"CCI dominant dimension: X; composite: 0.73"`, and canon
 * §3.2:168 forbids scores on a player surface. So this module takes the strategy as INPUT and produces
 * the plan as OUTPUT — a bug these tests pin, because the tempting implementation is to render the
 * rationale verbatim.
 *
 * CANON'S FOUR CLAIMS. Session (`:134-137`), reasons (`:138-140`) and spacing (`:146-150`) are built.
 * Learner overrides (`:141-145`) are NOT, and deliberately: the kernel already honours session-local
 * preferences, and a second override channel nothing reads is the documented-but-unwired class.
 */

const holon = (
  id: string,
  primary: Line,
  secondary: Line[] = [],
  prerequisites: string[] = [],
): CurriculumHolon =>
  ({
    id,
    name: id,
    prerequisites,
    devMapping: { primaryLine: primary, secondaryLines: secondary, stageRange: { min: 'Red', max: 'Turquoise' } },
  }) as unknown as CurriculumHolon;

const stateOf = (byId: Record<string, { depth: DepthLevel; retention?: number; lastReviewedAt?: number }>): KnowledgeState =>
  ({
    conceptStates: new Map(
      Object.entries(byId).map(([id, v]) => [
        id,
        { depthLevel: v.depth, retention: v.retention ?? 1, lastReviewedAt: v.lastReviewedAt ?? 0, reviewCount: 1, depthHistory: [], misconceptionFlags: [] },
      ]),
    ),
    subjectProgress: new Map(),
    studyHistory: [],
  }) as unknown as KnowledgeState;

const adj = (pairs: [string, string[]][]) => new Map(pairs);

describe('studyPlan — ordering', () => {
  it('a due REVIEW comes before anything else', () => {
    // Canon §3.1:135 leads with the review. It is the only item with a clock on it.
    const h = [holon('old', 'Cognitive'), holon('new', 'Cognitive')];
    const g = adj([['old', []], ['new', []]]);
    const plan = studyPlan(h, g, stateOf({ old: { depth: 'applied', retention: 0.4 } }));
    expect(plan.recommendations[0]!.kind).toBe('review');
  });

  it('a CROSS-DOMAIN connection sorts AFTER new material, and after a review', () => {
    // All three kinds in one plan, so the ORDER is under test rather than the presence of a row. The
    // first version of this test set up two REACHED concepts and expected a 'new' row, which cannot
    // exist — a reached concept is never new — so it proved nothing about ordering.
    const h = [
      holon('due', 'Cognitive'),                   // reached, faded  → review
      holon('open', 'Cognitive'),                  // untouched, unblocked → new
      holon('link', 'Cognitive', ['Emotional']),   // reached, fresh, names an untouched line → connect
    ];
    const g = adj([['due', []], ['open', []], ['link', []]]);
    const plan = studyPlan(h, g, stateOf({ due: { depth: 'applied', retention: 0.4 }, link: { depth: 'applied' } }));
    expect(plan.recommendations.map((r) => r.kind)).toEqual(['review', 'new', 'connect']);
    expect(plan.recommendations.map((r) => r.order)).toEqual([0, 1, 2]);
  });

  it('reasons are sentences about the LEARNER, never scores', () => {
    const h = [holon('old', 'Cognitive')];
    const plan = studyPlan(h, adj([['old', []]]), stateOf({ old: { depth: 'applied', retention: 0.4 } }));
    const text = plan.recommendations[0]!.reason.toLowerCase();
    expect(text).toMatch(/reached 'applied'/);
    expect(text).toMatch(/faded|brings it back/);
    for (const banned of ['0.', 'composite', 'score', 'cci', 'rank', 'percent', '%']) {
      expect(text).not.toContain(banned);
    }
  });
});

describe('studyPlan — prerequisites', () => {
  it('a concept behind an unmet prerequisite is BLOCKED, not recommended', () => {
    const h = [holon('a', 'Cognitive', [], ['pre']), holon('pre', 'Cognitive')];
    const g = adj([['a', ['pre']], ['pre', []]]);
    const plan = studyPlan(h, g, stateOf({}));
    expect(plan.blocked).toContain('a');
    expect(plan.recommendations.map((r) => r.conceptId)).not.toContain('a');
  });

  it('a MEMORISED prerequisite opens the door — "reached", not "comprehended"', () => {
    // Requiring comprehension would make the curriculum unreachable for a learner still climbing.
    const h = [holon('a', 'Cognitive', [], ['pre']), holon('pre', 'Cognitive')];
    const g = adj([['a', ['pre']], ['pre', []]]);
    const plan = studyPlan(h, g, stateOf({ pre: { depth: 'memorized' } }));
    expect(plan.recommendations.map((r) => r.conceptId)).toContain('a');
    expect(plan.blocked).not.toContain('a');
  });

  it('nothing is planned and nothing is blocked for an empty corpus', () => {
    const plan = studyPlan([], adj([]), stateOf({}));
    expect(plan.recommendations).toEqual([]);
    expect(plan.totalMinutes).toBe(0);
  });
});

describe('studyPlan — the limit caps, it does not pad', () => {
  it('shows only what exists rather than always filling the list', () => {
    const h = [holon('a', 'Cognitive')];
    const plan = studyPlan(h, adj([['a', []]]), stateOf({}), 4);
    expect(plan.recommendations).toHaveLength(1);
  });

  it('respects the cap when there is more than enough', () => {
    const h = Array.from({ length: 20 }, (_, i) => holon(`c${i}`, 'Cognitive'));
    const g = adj(h.map((x) => [x.id, [] as string[]]));
    expect(studyPlan(h, g, stateOf({}), 4).recommendations).toHaveLength(4);
  });

  it('totalMinutes is the SUM of what is actually shown', () => {
    const h = [holon('a', 'Cognitive'), holon('b', 'Cognitive')];
    const plan = studyPlan(h, adj([['a', []], ['b', []]]), stateOf({}));
    expect(plan.totalMinutes).toBe(plan.recommendations.reduce((n, r) => n + r.minutes, 0));
  });
});

describe('reviewBoundaryDays — canon §3.1:139, derived not asserted', () => {
  const HALF = DEFAULT_FORGETTING_PARAMS.initialHalfLifeMs;

  it('is null for a concept never reached — a half-life for nothing is a number about nothing', () => {
    expect(reviewBoundaryDays(stateOf({ a: { depth: 'absent' } }), 'a', HALF)).toBeNull();
    expect(reviewBoundaryDays(undefined, 'a', HALF)).toBeNull();
  });

  it('grows with elapsed time', () => {
    const now = Date.now();
    const recent = reviewBoundaryDays(stateOf({ a: { depth: 'applied', lastReviewedAt: now - HALF / 4 } }), 'a', HALF)!;
    const older = reviewBoundaryDays(stateOf({ a: { depth: 'applied', lastReviewedAt: now - HALF } }), 'a', HALF)!;
    expect(older).toBeGreaterThan(recent);
  });

  it('one half-life elapsed is exactly one half-life of days', () => {
    const days = reviewBoundaryDays(
      stateOf({ a: { depth: 'applied', lastReviewedAt: Date.now() - HALF } }),
      'a',
      HALF,
    )!;
    expect(days).toBeCloseTo(HALF / 86_400_000, 0);
  });

  it('never returns a negative number for a future timestamp', () => {
    expect(reviewBoundaryDays(stateOf({ a: { depth: 'applied', lastReviewedAt: Date.now() + 1000 } }), 'a', HALF)).toBe(0);
  });
});

describe('the REAL corpus, end to end', () => {
  /**
   * The control that catches a dead branch.
   *
   * `isUnderTouched` took a corpus it was never given, so `touchedOn` always returned 1 and the
   * `connect` branch could never fire — while the unit tests above passed, because they build a
   * `holons` array by hand and the real call site did not. Same shape as `recordProbeResult?.` and the
   * unwired `radarPoints`: a green suite over a path nothing reaches.
   */
  const corpus = () => {
    seedCurriculumRegistry();
    const holons = getCurriculumRegistry().getAll();
    return { holons, g: buildGraph(holons as never) };
  };

  it('plans a bounded session and blocks the genuinely unreachable majority', () => {
    const { holons, g } = corpus();
    const empty = { conceptStates: new Map(), subjectProgress: new Map(), studyHistory: [] } as unknown as KnowledgeState;
    const plan = studyPlan(holons, g.adjacency, empty);
    expect(plan.recommendations.length).toBeGreaterThan(0);
    expect(plan.recommendations.length).toBeLessThanOrEqual(4);
    // Most of the corpus genuinely sits behind prerequisites at the start, and that is the ladder
    // working. A planner that recommended it all would be recommending the impossible.
    expect(plan.blocked.length).toBeGreaterThan(0);
  });

  it('every recommendation names a REAL corpus concept — no invented rows', () => {
    const { holons, g } = corpus();
    const plan = studyPlan(holons, g.adjacency, stateOf({}));
    const ids = new Set(holons.map((h) => h.id));
    for (const r of plan.recommendations) expect(ids.has(r.conceptId)).toBe(true);
  });

  it('the `connect` branch FIRES on real data — it is not decoration', () => {
    // Reached concepts with secondary lines into untouched lines. Without this, the branch could be
    // deleted and every test above would still pass.
    const { holons, g } = corpus();
    const ids = holons.map((h) => h.id).slice(0, 40);
    const reached: Record<string, { depth: DepthLevel }> = {};
    for (const id of ids) reached[id] = { depth: 'applied' };
    // Touch nothing on Emotional or Somatic, so any concept naming one is under-touched.
    for (const id of ids) {
      const h = holons.find((x) => x.id === id)!;
      if (h.devMapping.primaryLine === 'Emotional' || h.devMapping.primaryLine === 'Somatic') {
        delete reached[id];
      }
    }
    const plan = studyPlan(holons, g.adjacency, stateOf(reached), 40);
    const connects = plan.recommendations.filter((r) => r.kind === 'connect');

    // COUNTED, not just "greater than zero". An earlier version asserted only `> 0` and the
    // `isUnderTouched(holon, knowledge, [])` mutation left it green, because the handful of connects
    // that still fired were enough to clear a `> 0` bar. A `> 0` assertion on a branch measures
    // existence, and existence was never the thing at risk — REACHABILITY was.
    expect(connects.length, 'the cross-domain branch never fired on the real corpus').toBeGreaterThan(3);
    expect(connects[0]!.reason).toMatch(/also works on/);

  });

  it('the `connect` branch is a function of the corpus, not a constant', () => {
    // THE FIXTURE THAT DISCRIMINATES. The real-corpus test above fires 17 connects EITHER WAY when the
    // corpus argument is dropped, because its concepts already name untouched lines — so that mutation
    // was a no-op for it, not a hole. A mutation that is equivalent to the original proves nothing.
    //
    // Here the secondary line is one the learner HAS worked on, so the corpus argument is what makes
    // the difference: with it the concept is not a cross-domain candidate, without it the empty set
    // reads as "untouched" and it becomes one.
    // 'a' is REACHED and FRESH, so it skips the review branch and reaches the cross-domain test. That
    // ordering is why an earlier version of this fixture produced no rows at all: the fresh concepts
    // matched no branch, so there was nothing to compare.
    const h = [holon('a', 'Cognitive', ['Emotional']), holon('e1', 'Emotional'), holon('e2', 'Emotional')];
    const g = adj([['a', []], ['e1', []], ['e2', []]]);
    const touched = {
      a: { depth: 'applied' as DepthLevel },
      e1: { depth: 'applied' as DepthLevel },
      e2: { depth: 'memorized' as DepthLevel },
    };

    // Both Emotional concepts are reached, so Emotional is well touched and 'a' is NOT a cross-domain
    // candidate. This is the assertion the dead-argument mutation broke.
    const withCorpus = studyPlan(h, g, stateOf(touched), 10).recommendations.filter((r) => r.kind === 'connect');
    expect(withCorpus.length, 'a well-touched secondary line was offered as a cross-domain link').toBe(0);

    // Leave Emotional UNTOUCHED and the same concept becomes one — so the branch is reading the corpus,
    // not returning a constant. Without this the test would pass even if the argument were dropped.
    const untouched = { a: { depth: 'applied' as DepthLevel } };
    const links = studyPlan(h, g, stateOf(untouched), 10).recommendations.filter((r) => r.kind === 'connect');
    expect(links.length, 'an untouched secondary line produced no cross-domain link').toBe(1);
    expect(links[0]!.conceptId).toBe('a');
  });

  it('a concept already fresh is NOT recommended for review', () => {
    const { holons, g } = corpus();
    const ids = holons.filter((h) => h.devMapping.primaryLine === 'Cognitive').slice(0, 3).map((h) => h.id);
    const reached: Record<string, { depth: DepthLevel; retention: number }> = {};
    for (const id of ids) reached[id] = { depth: 'applied', retention: 0.95 };
    const plan = studyPlan(holons, g.adjacency, stateOf(reached));
    for (const r of plan.recommendations.filter((x) => x.kind === 'review')) {
      expect(reached[r.conceptId], 'a fresh concept was recommended for review').toBeUndefined();
    }
  });
});

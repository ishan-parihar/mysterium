import { describe, it, expect } from 'vitest';

import {
  trajectory,
  milestones,
  forgettingEvents,
  paceProjection,
  timeSpan,
} from '../../src/lib/components/displays/trajectoryModel.js';
import { ALL_DEPTH_LEVELS, type DepthLevel, type KnowledgeState } from '../../src/core/curriculum/types.js';

/**
 * Learning Trajectory — canon `33 §3.1` View 3 (`:112-128`).
 *
 * The plan marked View 3's data `[UNMEASURED]`. It is not: `ConceptState.depthHistory` carries
 * `{ level, timestamp, evidence }`, which is exactly the X-axis canon names. What needed measuring was
 * the PROJECTION, and the answer is that it cannot be drawn honestly from thin data — `paceProjection`
 * returns `null` per concept below two transitions, and the tests below pin that refusal rather than
 * the arithmetic around it.
 */

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 2, 1);

const history = (...entries: [DepthLevel, number][]) =>
  entries.map(([level, at], i) => ({ level, timestamp: T0 + at * DAY, evidence: `e${i}` }));

const stateOf = (byId: Record<string, ReturnType<typeof history>>): KnowledgeState =>
  ({
    conceptStates: new Map(
      Object.entries(byId).map(([id, depthHistory]) => [
        id,
        { depthLevel: depthHistory[depthHistory.length - 1]!.level, retention: 1, lastReviewedAt: 0, reviewCount: depthHistory.length, depthHistory, misconceptionFlags: [] },
      ]),
    ),
    subjectProgress: new Map(),
    studyHistory: [],
  }) as unknown as KnowledgeState;

const concepts = [{ id: 'phys', name: 'Physics' }, { id: 'math', name: 'Mathematics' }];

describe('trajectory', () => {
  it('emits one point per depth change, in TIME order across concepts', () => {
    // The input is per-concept append order, so a naive concatenation interleaves badly. A timeline
    // that jumps backwards is not a timeline.
    const points = trajectory(
      stateOf({ phys: history(['memorized', 0], ['comprehended', 10]), math: history(['memorized', 5]) }),
      concepts,
    );
    expect(points.map((p) => p.timestamp)).toEqual([...points.map((p) => p.timestamp)].sort((a, b) => a - b));
    expect(points).toHaveLength(3);
  });

  it('labels a point with the CONCEPT NAME when known, and the id when not', () => {
    const withName = trajectory(stateOf({ phys: history(['applied', 1]) }), concepts);
    const without = trajectory(stateOf({ phys: history(['applied', 1]) }), []);
    expect(withName[0]!.label).toBe("Physics reached 'applied'");
    expect(without[0]!.label).toBe("phys reached 'applied'");
  });

  it('no knowledge means no timeline, not a crash', () => {
    expect(trajectory(undefined, concepts)).toEqual([]);
    expect(trajectory(stateOf({}), concepts)).toEqual([]);
  });

  it('a concept with NO history contributes nothing', () => {
    const s = stateOf({ phys: history(['applied', 1]) }) as unknown as KnowledgeState;
    (s.conceptStates as unknown as Map<string, { depthHistory: unknown }>).get('phys')!.depthHistory = [];
    expect(trajectory(s, concepts)).toEqual([]);
  });
});

describe('forgetting events — canon §3.1:124-125', () => {
  it('marks a DOWNWARD step, and only downward steps', () => {
    const points = trajectory(
      stateOf({ phys: history(['comprehended', 0], ['applied', 5], ['memorized', 20]) }),
      concepts,
    );
    const decays = forgettingEvents(points);
    expect(decays).toHaveLength(1);
    expect(decays[0]!.from).toBe('applied');
    expect(decays[0]!.level).toBe('memorized');
  });

  it('does NOT mark a rise', () => {
    const points = trajectory(stateOf({ phys: history(['memorized', 0], ['comprehended', 5]) }), concepts);
    expect(forgettingEvents(points)).toEqual([]);
  });

  it('compares against the SAME concept, never the shared timeline', () => {
    // THE SUBTLE ONE. Physics memorised on day 0, Mathematics applied on day 1: a single merged series
    // would call the second a decay, which is nonsense — they are different subjects.
    const points = trajectory(
      stateOf({ phys: history(['memorized', 0]), math: history(['applied', 1]) }),
      concepts,
    );
    expect(forgettingEvents(points)).toEqual([]);
    expect(points.every((p) => !p.isDecay)).toBe(true);
  });

  it('names the level it fell FROM, which is the useful half', () => {
    const points = trajectory(stateOf({ phys: history(['analyzed', 0], ['comprehended', 9]) }), concepts);
    expect(forgettingEvents(points)[0]!.from).toBe('analyzed');
  });

  it('a drop of more than one rung is still ONE event, not two', () => {
    const points = trajectory(stateOf({ phys: history(['analyzed', 0], ['memorized', 9]) }), concepts);
    expect(forgettingEvents(points)).toHaveLength(1);
  });
});

describe('milestones — canon §3.1:119-120', () => {
  it('every transition qualifies, including the first', () => {
    const points = trajectory(stateOf({ phys: history(['memorized', 0], ['comprehended', 3]) }), concepts);
    expect(milestones(points)).toHaveLength(2);
  });

  it('an empty timeline has no milestones', () => {
    expect(milestones([])).toEqual([]);
  });
});

describe('paceProjection — canon §3.1:122-123, as a RATE', () => {
  it('REFUSES from a single DEPTH ENTRY — one rung is not a rate', () => {
    // The boundary is one TRANSITION, i.e. two points. A concept with a single history entry has no
    // slope at all, and a date from one point is a commitment the learner will believe. The refusal is
    // the feature, and the test name says "transition" while the assertion is about POINTS, which is
    // how the first version of this test came to expect the wrong thing.
    const single = trajectory(stateOf({ phys: history(['memorized', 0]) }), concepts);
    expect(single).toHaveLength(1);
    expect(paceProjection(single, concepts)).toEqual([]);

    // Two points on the same rung are two points and zero rungs: also no rate.
    const flat = trajectory(stateOf({ phys: history(['memorized', 0], ['memorized', 5]) }), concepts);
    expect(flat).toHaveLength(2);
    expect(paceProjection(flat, concepts)).toEqual([]);
  });

  it('REFUSES when no time has passed, however many transitions there are', () => {
    const points = trajectory(stateOf({ phys: history(['memorized', 0], ['comprehended', 0]) }), concepts);
    expect(paceProjection(points, concepts)).toEqual([]);
  });

  it('REFUSES to project a FORGETTING CURVE as a learning pace', () => {
    // THE ONE THE TESTS FOUND. applied → memorized over ten days satisfies every other condition: two
    // points, real elapsed time, a non-zero rung difference. It would have produced "2 rungs per 10
    // days", from which canon's sentence reads "at your current pace you will reach 'analyzed' soon" —
    // promising a learner who is LOSING ground that they will gain it. The pace is taken over ascending
    // transitions only, and canon §3.1:124 already shows decay as its own event.
    const points = trajectory(stateOf({ phys: history(['applied', 0], ['memorized', 10]) }), concepts);
    expect(forgettingEvents(points)).toHaveLength(1);
    expect(paceProjection(points, concepts)).toEqual([]);
  });

  it('REFUSES when a DECAY is mixed into a concept that also rose', () => {
    // THE MUTATION THAT PROVES THE ABOVE. With only a pure decay in the test, an implementation that
    // used ALL points still produced a correct-looking result, because `abs()` of a downward move is
    // the same magnitude as a rise. So the case has to be a concept that rose, then fell, where
    // including the fall changes the rate — and where the honest answer is still NO pace, because the
    // learner's most recent movement on this concept is downward.
    //
    // memorized → comprehended → memorized, 10 days apart. Excluding the decay leaves ONE ascending
    // point, which is below the two-point bar. Including it yields a rate, which is the bug.
    const points = trajectory(
      stateOf({ phys: history(['memorized', 0], ['comprehended', 10], ['memorized', 20]) }),
      concepts,
    );
    expect(forgettingEvents(points)).toHaveLength(1);
    expect(paceProjection(points, concepts), 'a rise-then-fall was projected as a learning pace').toEqual([]);
  });

  it('projects days-per-rung from two transitions and names the next rung', () => {
    const points = trajectory(
      stateOf({ phys: history(['memorized', 0], ['comprehended', 10], ['applied', 20]) }),
      concepts,
    );
    const [pace] = paceProjection(points, concepts);
    expect(pace!.daysPerLevel).toBe(10);
    // TRANSITIONS, not points: three history entries describe two moves.
    expect(pace!.transitions).toBe(2);
    expect(pace!.nextLevel).toBe('analyzed');
    expect(pace!.conceptName).toBe('Physics');
  });

  it('a fully transformed concept has NO next rung, and says so', () => {
    const points = trajectory(stateOf({ phys: history(['applied', 0], ['transformed', 8]) }), concepts);
    expect(paceProjection(points, concepts)[0]!.nextLevel).toBeNull();
  });

  it('sorts fastest first, and the next rung is always a REAL one', () => {
    const points = trajectory(
      stateOf({
        phys: history(['memorized', 0], ['comprehended', 20]),
        math: history(['memorized', 0], ['comprehended', 2]),
      }),
      concepts,
    );
    const paces = paceProjection(points, concepts);
    expect(paces.map((p) => p.conceptName)).toEqual(['Mathematics', 'Physics']);
    for (const p of paces) expect(ALL_DEPTH_LEVELS).toContain(p.nextLevel!);
  });
});

describe('timeSpan', () => {
  it('is the observed extent, not "now"', () => {
    const points = trajectory(stateOf({ phys: history(['memorized', 0], ['applied', 30]) }), concepts);
    const span = timeSpan(points)!;
    expect(span.from).toBe(T0);
    expect(span.to).toBe(T0 + 30 * DAY);
  });

  it('is null with no points — a zero-width axis is a lie about the data', () => {
    expect(timeSpan([])).toBeNull();
  });
});

describe('read-register discipline (AGENTS.md §5.4)', () => {
  it('no label carries CLOSED-register vocabulary', () => {
    // G55 guards templates and the corpus; this guards the labels the model GENERATES.
    const points = trajectory(
      stateOf({ phys: history(['memorized', 0], ['comprehended', 5], ['memorized', 9]) }),
      concepts,
    );
    const text = [...points.map((p) => p.label), ...milestones(points).map((m) => m.label)].join(' ').toLowerCase();
    for (const closed of [
      'polarity', 'shadow', 'quadrant', 'darkaddiction', 'goldenallergy', 'rayprofile',
      'harvest', 'crystallization', 'inference', 'score', 'grade', 'percent',
    ]) {
      expect(text).not.toContain(closed);
    }
  });
});

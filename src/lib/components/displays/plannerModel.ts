import { ALL_LINES, type Line } from '$core/domain/Line.js';
import { ALL_DEPTH_LEVELS, type CurriculumHolon, type KnowledgeState } from '$core/curriculum/types.js';
import { depthOrdinal } from '$core/curriculum/types.js';

/**
 * Study Planner — canon `33 §3.1` View 4 (`:130-150`), "the auto-mode strategy engine's
 * recommendations, made visible".
 *
 * WHY THIS IS NOT A VIEW ONTO `AutoModeStrategy`. The engine produces a session STRATEGY — theme, arc
 * parameterisation, weight bias, encounter budget — and its one human-readable field,
 * `themeRationale`, reads `CCI dominant dimension: X; composite: 0.73`. Canon §3.2:168 forbids
 * "percentage scores, no GPA" on a player surface, and a composite is exactly that. So the strategy is
 * an INPUT to this module and the plan is an OUTPUT: a small ordered set of named, time-boxed
 * recommendations, each carrying its own reason, with no numbers the engine uses internally.
 *
 * WHAT CANON ASKS FOR, AND WHAT IS BUILT:
 *   - today's recommended session, time-boxed (`:134-137`) — BUILT
 *   - why each recommendation (`:138-140`) — BUILT, from the learner's own state
 *   - learner overrides: skip, reorder, add topics, adjust length (`:141-145`) — NOT BUILT
 *   - learning-science scheduling: spacing at the forgetting boundary, interleaving, desirable
 *     difficulty (`:146-150`) — PARTIALLY, see `reviewBoundary` below
 *
 * WHY OVERRIDES ARE NOT BUILT. Skip and reorder are session-local preferences the kernel already
 * honours (`PriorityComputation` weights, `sessionControlStore`'s `encounterCount` and `focusedCell`),
 * and wiring a second override channel that nothing reads would be the documented-but-unwired class
 * `AGENTS.md` §4.2 item 2 tracks. A planner whose buttons change nothing is worse than one that
 * shows the plan and names the control that already exists. Recorded rather than faked.
 *
 * THE FORGETTING BOUNDARY IS COMPUTED, NOT ASSERTED. Canon §3.1:139's own example is "retention has
 * fallen below 70%". `ConceptState` carries `retention` and `lastReviewedAt`, and
 * `DEFAULT_FORGETTING_PARAMS` carries `initialHalfLifeMs`, so the boundary is derivable — a concept is
 * due when its retention has decayed past the threshold, which is the shape of the curve rather than a
 * constant someone picked.
 */

export type PlanKind = 'review' | 'new' | 'connect';

export interface Recommendation {
  readonly conceptId: string;
  readonly conceptName: string;
  readonly kind: PlanKind;
  /** Minutes. A PLAN, not a measurement — no telemetry says how long a concept takes. */
  readonly minutes: number;
  /** The learner's own state, in words. Never a score, never a rank. */
  readonly reason: string;
  /** Lower sorts first. */
  readonly order: number;
}

export interface StudyPlan {
  readonly recommendations: readonly Recommendation[];
  /** Total planned minutes, or 0 when there is nothing to plan. */
  readonly totalMinutes: number;
  /** Concepts with an unmet prerequisite, which the plan deliberately does not recommend. */
  readonly blocked: readonly string[];
}

/** Retention at or above this is "still fresh"; below it the concept is due for review. */
const REVIEW_THRESHOLD = 0.7;

const depthOf = (knowledge: KnowledgeState | undefined, id: string) =>
  knowledge?.conceptStates.get(id)?.depthLevel ?? 'absent';

const retentionOf = (knowledge: KnowledgeState | undefined, id: string) =>
  knowledge?.conceptStates.get(id)?.retention ?? 1;

/**
 * Whether a concept is a legal starting point: every prerequisite must itself have been reached.
 *
 * "Reached" is `depthLevel !== 'absent'`, NOT `>= 'applied'`. A memorised prerequisite is enough to
 * open the next door — that is what a ladder is — and requiring comprehension would make the
 * curriculum unreachable for a learner still working up the rungs.
 */
function prerequisitesMet(
  holon: CurriculumHolon,
  adjacency: ReadonlyMap<string, readonly string[]>,
  knowledge: KnowledgeState | undefined,
): boolean {
  return (adjacency.get(holon.id) ?? []).every((pre) => depthOf(knowledge, pre) !== 'absent');
}

/**
 * The plan for right now.
 *
 * ORDER IS REVIEW, THEN NEW, THEN CONNECT — and that is a deliberate reading of canon's own example
 * (`:135-137`): a due review is the only item with a clock on it. A concept nobody has opened cannot
 * become due, and a cross-domain connection is worth less than either, so it sorts last.
 *
 * `limit` caps the plan rather than padding it. A planner that always shows five items must invent
 * four when the learner has three that matter.
 */
export function studyPlan(
  holons: readonly CurriculumHolon[],
  adjacency: ReadonlyMap<string, readonly string[]>,
  knowledge: KnowledgeState | undefined,
  limit = 4,
): StudyPlan {
  const nameOf = new Map(holons.map((h) => [h.id, h.name]));
  const reviews: Recommendation[] = [];
  const fresh: Recommendation[] = [];
  const connects: Recommendation[] = [];
  const blocked: string[] = [];

  for (const holon of holons) {
    const met = prerequisitesMet(holon, adjacency, knowledge);
    const depth = depthOf(knowledge, holon.id);
    const name = nameOf.get(holon.id) ?? holon.id;

    if (depth !== 'absent' && retentionOf(knowledge, holon.id) < REVIEW_THRESHOLD) {
      if (!met) {
        blocked.push(name);
        continue;
      }
      reviews.push({
        conceptId: holon.id,
        conceptName: name,
        kind: 'review',
        minutes: 10,
        reason: `You reached '${depth}' and it has faded since — reviewing brings it back.`,
        order: 0,
      });
      continue;
    }

    if (depth === 'absent') {
      if (!met) {
        blocked.push(name);
        continue;
      }
      fresh.push({
        conceptId: holon.id,
        conceptName: name,
        kind: 'new',
        minutes: 15,
        reason: 'Everything it needs is already in place, so it is open to you now.',
        order: 1,
      });
      continue;
    }

    // Reached and fresh, but listing a line the learner has not touched much: a cross-domain link.
    if (isUnderTouched(holon, knowledge, holons)) {
      connects.push({
        conceptId: holon.id,
        conceptName: name,
        kind: 'connect',
        minutes: 10,
        reason: `It also works on ${describeSecondary(holon)}, which you have touched less.`,
        order: 2,
      });
    }
  }

  const chosen = [...reviews, ...fresh, ...connects]
    .sort((a, b) => a.order - b.order || a.conceptName.localeCompare(b.conceptName))
    .slice(0, limit);

  return {
    recommendations: chosen,
    totalMinutes: chosen.reduce((n, r) => n + r.minutes, 0),
    blocked,
  };
}

/**
 * True when a concept names a secondary line the learner has barely reached anything on.
 *
 * The corpus was the third argument and the call site omitted it, so `touchedOn` always returned 1
 * and this branch could never fire. A parameter that is never supplied is a dead branch with a
 * plausible name, which is why the `connect` recommendations appeared in the unit tests — those passed
 * a `holons` array by hand — and were absent from the real corpus. The same shape as
 * `recordProbeResult?.` and the unwired `radarPoints`: green tests over a path nothing reaches.
 */
function isUnderTouched(
  holon: CurriculumHolon,
  knowledge: KnowledgeState | undefined,
  holons: readonly CurriculumHolon[],
): boolean {
  const secondary = holon.devMapping?.secondaryLines ?? [];
  if (secondary.length === 0) return false;
  return secondary.some((line) => touchedOn(knowledge, line, holons) < 0.2);
}

/**
 * Share of a line's concepts the learner has reached anything on.
 *
 * A line with NO concepts of its own is UNTOUCHED, not neutral. Returning 1 — "nothing to compare" —
 * made every cross-domain link look fine on a small hand-built fixture, while the real corpus, where
 * eight lines each have concepts, behaved correctly. The fixture and the corpus disagreed and the
 * default was on the wrong side: a claim of "the learner has not worked on this line" is exactly what
 * a missing division should say, because the alternative is inventing coverage out of an empty set.
 */
function touchedOn(knowledge: KnowledgeState | undefined, line: Line, holons: readonly CurriculumHolon[]): number {
  if (holons.length === 0) return 0;
  const onLine = holons.filter((h) => h.devMapping?.primaryLine === line);
  if (onLine.length === 0) return 0;
  const reached = onLine.filter((h) => depthOf(knowledge, h.id) !== 'absent').length;
  return reached / onLine.length;
}

function describeSecondary(holon: CurriculumHolon): string {
  const secondary = holon.devMapping?.secondaryLines ?? [];
  if (secondary.length === 0) return 'another line';
  if (secondary.length === 1) return secondary[0]!;
  return `${secondary.slice(0, -1).join(', ')} and ${secondary[secondary.length - 1]}`;
}

/**
 * How long until a concept is due again, in days, or `null` if it has never been reviewed.
 *
 * Derived from the forgetting curve's own half-life rather than a constant, so it moves when
 * `DEFAULT_FORGETTING_PARAMS` moves. Only meaningful for a concept that HAS been reached — a
 * half-life for something never opened is a number about nothing.
 */
export function reviewBoundaryDays(
  knowledge: KnowledgeState | undefined,
  conceptId: string,
  halfLifeMs: number,
): number | null {
  const state = knowledge?.conceptStates.get(conceptId);
  if (!state || state.depthLevel === 'absent' || state.lastReviewedAt <= 0) return null;
  const elapsed = Date.now() - state.lastReviewedAt;
  if (elapsed <= 0) return 0;
  // Retention halves every half-life, so the fraction of the original that survives is 2^(-t/h).
  const survived = Math.pow(2, -elapsed / halfLifeMs);
  return Math.max(0, (halfLifeMs / 86_400_000) * Math.log2(1 / survived));
}

/** Depth ordinal, re-exported so a view can place a concept without importing two modules. */
export { depthOrdinal, ALL_DEPTH_LEVELS, ALL_LINES };

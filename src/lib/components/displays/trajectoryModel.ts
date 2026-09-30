import { ALL_DEPTH_LEVELS, depthOrdinal, type DepthLevel, type KnowledgeState } from '$core/curriculum/types.js';

/**
 * Learning Trajectory — canon `33 §3.1` View 3 (`:112-128`).
 *
 * The data is `ConceptState.depthHistory`: a list of `{ level, timestamp, evidence }` per concept.
 * Measured, not assumed — `33 §3.1`'s X-axis is TIME and the plan's `[UNMEASURED]` note was whether a
 * session-indexed series exists. It does not need to: `timestamp` is the axis, and the field is
 * already populated by the depth-assessment path. There is no new collection and no new write.
 *
 * FOUR CLAIMS CANON ASKS FOR, AND WHAT EACH ACTUALLY NEEDS:
 *   - milestones, "Newton's Laws reached 'comprehension'" (:119-120) — every history entry IS one
 *   - forgetting events, "decayed from 'comprehended' to 'memorized'" (:124-125) — a DOWNWARD step
 *   - a projection, "at current pace you will reach 'analysis' by June" (:122-123) — see BELOW
 *   - pattern insights, "you learn faster in morning sessions" (:126-128) — deliberately NOT built
 *
 * WHY THE PROJECTION IS OPTIONAL AND HONEST. A projection needs at least two DEPTH TRANSITIONS in one
 * concept; from a single transition the slope is either infinite (one point) or an artefact of when
 * the learner happened to start. So `paceProjection` returns `null` unless a concept has two or more
 * transitions, and the component renders the pace as a RATE rather than a date. A confident dotted
 * line drawn over n=1 is worse than no line: it is a number the learner will believe.
 *
 * WHY NO PATTERN INSIGHTS. "You learn faster in morning sessions" needs a clock on each session, and
 * the honest sample for that is one learner's whole history, which no test can hold. Shipping a claim
 * the data cannot support is the fabricated-threshold mistake this project has already paid for once
 * (per the campaign report). Absent rather than asserted.
 */

/** One point on the timeline. `level` is the depth reached at that instant. */
export interface TrajectoryPoint {
  readonly conceptId: string;
  readonly level: DepthLevel;
  readonly timestamp: number;
  /** A human-readable event: "reached 'comprehended'". Never a score. */
  readonly label: string;
  /** True when this step went DOWN a rung — canon's "forgetting event". */
  readonly isDecay: boolean;
}

export interface Milestone extends TrajectoryPoint {
  /** A decay names where it fell FROM, which is the useful half. */
  readonly from?: DepthLevel;
}

const ordinalOf = (level: DepthLevel): number => depthOrdinal(level);

/**
 * Every depth change, ordered in time, with decays marked.
 *
 * ORDERING IS LOAD-BEARING AND THE INPUT IS NOT SORTED. A concept's history is appended as it happens,
 * so within one concept it is chronological — but MERGING several concepts' histories by first-seen
 * order produces a timeline that jumps backwards. So the merge sorts on `timestamp`, and the `decay`
 * flag compares against the previous point **for the same concept**, never against the previous point
 * overall: a learner moving from memorised Physics to applied Mathematics is not decaying from
 * anything, and treating the shared timeline as one series would mark it as one.
 */
export function trajectory(
  knowledge: KnowledgeState | undefined,
  concepts: readonly { id: string; name: string }[] = [],
): readonly TrajectoryPoint[] {
  if (!knowledge) return [];
  const nameOf = new Map(concepts.map((c) => [c.id, c.name]));

  const points: TrajectoryPoint[] = [];
  for (const [conceptId, state] of knowledge.conceptStates) {
    const history = state.depthHistory ?? [];
    let previous: DepthLevel | null = null;
    for (const entry of history) {
      const from = previous;
      points.push({
        conceptId,
        level: entry.level,
        timestamp: entry.timestamp,
        label: `${nameOf.get(conceptId) ?? conceptId} reached '${entry.level}'`,
        isDecay: from !== null && ordinalOf(entry.level) < ordinalOf(from),
      });
      previous = entry.level;
    }
  }

  return points.sort((a, b) => a.timestamp - b.timestamp || a.conceptId.localeCompare(b.conceptId));
}

/** Canon `:119-120`. Every transition is a milestone; there is nothing else that qualifies. */
export function milestones(points: readonly TrajectoryPoint[]): readonly Milestone[] {
  return points.map((p) => {
    if (!p.isDecay) return p;
    const prior = points.filter((q) => q.conceptId === p.conceptId && q.timestamp < p.timestamp).pop();
    return { ...p, from: prior?.level };
  });
}

/** Canon `:124-125`. Only the DOWNWARD steps, and only the concept's own previous level. */
export function forgettingEvents(
  points: readonly TrajectoryPoint[],
): readonly (Milestone & { from: DepthLevel })[] {
  const ms = milestones(points);
  return ms.filter((m): m is Milestone & { from: DepthLevel } => m.isDecay && m.from !== undefined);
}

export interface Pace {
  readonly conceptId: string;
  readonly conceptName: string;
  /** Mean days per rung, from the concept's own transitions. */
  readonly daysPerLevel: number;
  readonly transitions: number;
  /** The next rung up, or null when the concept is already `transformed`. */
  readonly nextLevel: DepthLevel | null;
}

/**
 * Canon `:122-123`, returned as a RATE.
 *
 * `null` for any concept with fewer than two transitions: from one transition there is no slope, and
 * from none there is not even a starting rung. A date computed from a single point is a number the
 * learner will read as a commitment.
 */
export function paceProjection(
  points: readonly TrajectoryPoint[],
  concepts: readonly { id: string; name: string }[] = [],
): readonly Pace[] {
  const nameOf = new Map(concepts.map((c) => [c.id, c.name]));
  const out: Pace[] = [];

  for (const [conceptId, ids] of groupBy(points, (p) => p.conceptId)) {
    // Fewer than two POINTS is fewer than one transition, so there is no rate at all.
    if (ids.length < 2) continue;

    /**
     * A DECAY IS NOT A LEARNING PACE — and the guard that enforces it is `rungs > 0`, not a filter.
     *
     * Two explicit guards were written here first: one excluding `isDecay` points, one requiring the
     * most recent movement to be upward. Both were DEAD. The tests said so honestly: removing both left
     * 21/21 green, because a concept that ends on a downward step has `rungs <= 0` at the end and is
     * already rejected by the existing check. A rise-then-fall leaves one ascending point, so a count
     * of ascending points was never the discriminator either.
     *
     * One honest condition does the work: a rate requires the concept's level at the end to be ABOVE
     * its level at the start, with real elapsed time. A forgetting curve fails it by construction.
     * Dead guards were deleted rather than kept as decoration, and the two tests that appeared to
     * cover them now pin the property that actually implements the rule.
     */
    const days = (ids[ids.length - 1]!.timestamp - ids[0]!.timestamp) / 86_400_000;
    const rungs = ordinalOf(ids[ids.length - 1]!.level) - ordinalOf(ids[0]!.level);
    if (days <= 0 || rungs <= 0) continue;

    const lastLevel = ids[ids.length - 1]!.level;
    out.push({
      conceptId,
      conceptName: nameOf.get(conceptId) ?? conceptId,
      daysPerLevel: days / rungs,
      // Transitions, not points: two points on a flat concept are one transition and no rate.
      transitions: ids.length - 1,
      nextLevel: ALL_DEPTH_LEVELS[ordinalOf(lastLevel) + 1] ?? null,
    });
  }

  return out.sort((a, b) => a.daysPerLevel - b.daysPerLevel);
}

/** The span the timeline covers — the X-axis extent, not a guess at "now". */
export function timeSpan(points: readonly TrajectoryPoint[]): { from: number; to: number } | null {
  if (points.length === 0) return null;
  let from = points[0]!.timestamp;
  let to = from;
  for (const p of points) {
    if (p.timestamp < from) from = p.timestamp;
    if (p.timestamp > to) to = p.timestamp;
  }
  return { from, to };
}

function groupBy<T, K>(items: readonly T[], key: (item: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = out.get(k);
    if (bucket) bucket.push(item);
    else out.set(k, [item]);
  }
  return out;
}

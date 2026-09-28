/**
 * The descent-only granularity stepper (33 §7.2.1, AP3) — as a PURE function.
 *
 * WHY PURE. The first version of this logic lived in `AuditorShell.svelte` and had two defects
 * that no test could have found, both found by driving the real page:
 *
 *  1. `const idx = GRANULARITY.indexOf(granularity)` is a plain const, so it snapshotted the prop
 *     at init. The button label stayed on "one level deeper → line" through every click. Fixed by
 *     `$derived` — but `$derived` is a Svelte construct, so testing it means mounting a component.
 *  2. The ceiling compared the current granularity's own top level against `ceiling`, and under
 *     the naive mapping the deepest granularity mapped to L4 — at or past EVERY ceiling. So
 *     `atCeiling` could only ever be true at the last rung: unreachable code wearing a feature's
 *     name, and therapeutic stopped exactly where guardian did.
 *
 * Extracting the decision makes both testable as values, and leaves the component to render what
 * this returns. The component must still `$derived` this — a plain const would reintroduce (1).
 */

import { LADDER_LEVELS } from '$core/domain/articulationLadder.js';
import type { LadderLevel } from '$core/domain/articulationLadder.js';

/** 33 §7.2 — the granularity ladder. One step per drill-down request. Descent-only. */
export const GRANULARITY = ['summary', 'line', 'line-stage', 'line-stage-cell'] as const;
export type Granularity = (typeof GRANULARITY)[number];

/**
 * The level a rung REQUESTS. One rung, one level — the mapping the seam already uses
 * (`AuditorSurface.svelte`: summary->L1, line->L2, line-stage->L3, cell->ceiling). A rung cannot
 * carry a range, because the seam derives one level from it.
 *
 * The earlier mapping here had each rung spanning a RANGE (line -> L3, line-stage -> L5, cell ->
 * L7) on the theory that a projection covers several levels. That made the ceiling check
 * unreachable at high ceilings and, once a property test asked the only question that matters —
 * "can the offered step ever reach past the grant?" — it proved the opposite failure too: with a
 * ceiling of L2 the stepper still offered `line`, which reaches L3. A range is strictly worse than
 * one level: it both under-binds a deep ceiling and over-reaches a shallow one.
 */
export function topLevelOf(g: Granularity, ceiling: LadderLevel = 'L4'): LadderLevel {
  // The deepest rung requests the SURFACE'S CEILING, not a fixed L4. Keeping that branch at the
  // call site meant two places decided what a rung requests — the function and the caller — and a
  // caller that forgot the branch would silently request L4 on a surface granted only L2. One
  // function, one answer.
  switch (g) {
    case 'summary': return 'L1';
    case 'line': return 'L2';
    case 'line-stage': return 'L3';
    case 'line-stage-cell': return ceiling;
  }
}

/** The one forward step, or undefined at the end of the ladder. */
export function nextGranularity(current: Granularity): Granularity | undefined {
  return GRANULARITY[GRANULARITY.indexOf(current) + 1];
}

export interface StepperState {
  readonly current: Granularity;
  /** The label the control should show. */
  readonly label: string;
  /** True when the control is inert — at the ladder's end, or at the surface's consent ceiling. */
  readonly atCeiling: boolean;
}

/**
 * The stepper's whole state for a given position and ceiling.
 *
 * `ceiling` is the deepest level the SURFACE's grant permits, not the deepest the ladder offers.
 * A therapeutic surface's ceiling is L4, so it must refuse to offer the step that would request
 * L5 even though a guardian's grant would allow it — the ceiling is what makes the same shell
 * lawful on two surfaces with different audiences.
 */
export function stepperState(current: Granularity, ceiling: LadderLevel): StepperState {
  const next = nextGranularity(current);
  const atCeiling = next === undefined || LADDER_LEVELS.indexOf(topLevelOf(current, ceiling)) >= LADDER_LEVELS.indexOf(ceiling);
  return {
    current,
    atCeiling,
    label: atCeiling ? 'deepest permitted' : `one level deeper → ${next}`,
  };
}

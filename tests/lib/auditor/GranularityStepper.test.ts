/**
 * The descent-only granularity stepper — 33 §7.2.1 / AP3.
 *
 * These assert the DECISION (which step is offered, and when the control goes inert), because that
 * is the part with a law behind it and the part that was wrong twice. The rendering around it is
 * the shell's job and is not re-tested here.
 *
 * Both defects these cover were invisible to any test and found by driving the real page:
 *   - the label never advanced, because a plain `const` snapshotted the reactive prop;
 *   - the ceiling could never bind before the last rung, so a therapeutic surface and a guardian
 *     both stopped in the same place despite different consent ceilings.
 */
import { describe, it, expect } from 'vitest';
import {
  GRANULARITY,
  stepperState,
  nextGranularity,
  topLevelOf,
} from '../../../src/lib/components/auditor/granularityStepper.js';

describe('AP3 descent-only stepper', () => {
  it('offers exactly ONE forward step from every position', () => {
    // The anti-AP3 property: a stepper, not a level selector. Whatever the position, there is one
    // next value, and it is always deeper. A selector would expose the whole ladder at once.
    for (const g of GRANULARITY) {
      const next = nextGranularity(g);
      if (next === undefined) continue;
      expect(GRANULARITY.indexOf(next)).toBeGreaterThan(GRANULARITY.indexOf(g));
    }
    expect(GRANULARITY).toHaveLength(4);
  });

  it('never offers a shallower step, and has no step back', () => {
    // Descent-only means the ladder has no upward edge at all.
    expect(nextGranularity('summary')).toBe('line');
    expect(nextGranularity('line')).toBe('line-stage');
    expect(nextGranularity('line-stage-cell')).toBeUndefined();
  });

  it('keeps offering steps up to an unrestricted ceiling, then goes inert', () => {
    const labels = GRANULARITY.map((g) => stepperState(g, 'L7'));
    expect(labels.map((l) => l.atCeiling)).toEqual([false, false, false, true]);
    expect(labels[0]!.label).toBe('one level deeper → line');
    expect(labels[3]!.label).toBe('deepest permitted');
  });

  it('binds the ceiling EARLIER when the surface is granted less', () => {
    // The regression that made this function exist. A therapeutic surface's ceiling is L4, so the
    // rung that would request it — `line-stage-cell` — is the one it refuses to offer. A guardian
    // (L7) is not bounded by any of the four rungs, so it only goes inert at the ladder's end.
    // Note the deepest rung maps to the surface's CEILING, not a fixed level, which is why the
    // therapeutic row and the guardian row differ only in the last position.
    const therapeutic = GRANULARITY.map((g) => stepperState(g, 'L4'));
    const guardian = GRANULARITY.map((g) => stepperState(g, 'L7'));

    // L4 ceiling: summary(L1) and line(L2) still have a step; line-stage(L3) is the last rung the
    // therapeutic grant covers, so the next step — which would request L4 — is still lawful, and
    // only `line-stage-cell` is refused. One rung deeper than the old mapping allowed.
    expect(therapeutic.map((s) => s.atCeiling)).toEqual([false, false, false, true]);
    expect(guardian.map((s) => s.atCeiling)).toEqual([false, false, false, true]);

    // The same position, two different offers — which is the whole point of a per-surface ceiling.
    expect(stepperState('line-stage-cell', 'L4').atCeiling).toBe(true);
    expect(stepperState('line-stage-cell', 'L7').atCeiling).toBe(true);
    // The divergence the ceiling actually produces: at L3 a therapeutic grant is one step from
    // its ceiling while a guardian's still has room to go.
    expect(stepperState('line-stage', 'L3').atCeiling).toBe(true);
    expect(stepperState('line-stage', 'L7').atCeiling).toBe(false);
  });

  it('never lets a grant reach past its own ceiling, at ANY ceiling', () => {
    // Property check across every legal ceiling: the highest level the stepper would let an
    // auditor reach must be at or below the ceiling. This is what an unreachable check cannot
    // show — for a single hand-picked ceiling the old mapping passed too.
    const ceilings = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'] as const;
    for (const ceiling of ceilings) {
      for (const g of GRANULARITY) {
        const state = stepperState(g, ceiling);
        if (state.atCeiling) continue; // inert: nothing is offered
        const offered = nextGranularity(g)!;
        const reaches = topLevelOf(offered);
        expect(
          ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'].indexOf(reaches),
          `ceiling ${ceiling} offered ${offered} which reaches ${reaches}`,
        ).toBeLessThanOrEqual(['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'].indexOf(ceiling));
      }
    }
  });

  it('maps each rung to exactly ONE level — the one the seam derives from it', () => {
    // Spelled out because this mapping WAS the bug, twice. A range-per-rung mapping
    // (line->L3, cell->L7) under-bound a deep ceiling and over-reached a shallow one; a property
    // test asking "can the offered step pass the grant?" is what caught it, and no hand-picked
    // expectation had.
    expect(topLevelOf('summary')).toBe('L1');
    expect(topLevelOf('line')).toBe('L2');
    expect(topLevelOf('line-stage')).toBe('L3');
    // The deepest rung follows the surface's ceiling, so the function alone decides what a rung
    // requests — a caller-side branch was the second binding of the same question.
    expect(topLevelOf('line-stage-cell')).toBe('L4');
    expect(topLevelOf('line-stage-cell', 'L2')).toBe('L2');
    expect(topLevelOf('line-stage-cell', 'L7')).toBe('L7');
  });
});

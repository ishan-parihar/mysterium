/**
 * CHOICE-CLOSURE — the condition and the event are two different things.
 *
 * Canon: `19 §9.6` (eligibility vs event), `06 §7.4` + `06 §5.1` (the Violet event), KosmOS
 * `lenses/rays.md` → "Harvest condition" (rainbow distinctness). Guards `MY-AD-0005` and
 * `MY-RG-0030`.
 *
 * The regression this file exists for: `checkHarvest` returned one verdict that both described a
 * *condition* and gated the post-Turquoise continuation, so "the player qualifies" and "the player
 * has finished" were the same boolean — and `Exploring → Harvesting` sat in the lifecycle table as
 * a legal transition for a player who had crystallized nothing.
 */
import { describe, expect, it } from 'vitest';
import {
  RAINBOW_DISTINCTNESS_FLOOR,
  RAINBOW_RAYS,
  RAINBOW_RAY_FLOOR,
  checkChoiceEligibility,
  evaluateChoice,
  isChoiceReady,
  rainbowDistinctness,
  subOctaveClosureReached,
} from '../../src/core/engines/PolarityEngine.js';
import { ALL_LINES, type Line } from '../../src/core/domain/Line.js';
import { ALL_STAGES, type Stage } from '../../src/core/domain/Stage.js';
import { canHarvest, isValidTransition } from '../../src/core/domain/Significator.js';
import type { MasterPolarity } from '../../src/core/domain/PolarityCellVector.js';

const crystallized = (direction: 'Radiative' | 'Absorptive', lines: number): MasterPolarity => ({
  mode: 'Crystallized',
  dominantDirection: direction,
  coherentLineCount: lines,
  crystallizationProgress: 0.9,
});

/** A complete rainbow — every ray of it distinct and integrated. */
const RH = { Green: 0.9, Blue: 0.8, Indigo: 0.7 };

const allAt = (stage: Stage): Record<Line, Stage> =>
  Object.fromEntries(ALL_LINES.map(l => [l, stage])) as Record<Line, Stage>;

describe('rainbow distinctness — a Violet total is a SUM, so it can be reached by skipping', () => {
  it('passes a complete, evenly-developed rainbow', () => {
    expect(rainbowDistinctness(RH).ok).toBe(true);
  });

  it('fails when a ray was bypassed even though the others are strong', () => {
    // "…each color distinct, none bypassed" — Green was skipped. Summing would have hidden this.
    const bypassed = { Green: 0.05, Blue: 0.9, Indigo: 0.9 };
    const verdict = rainbowDistinctness(bypassed);
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toMatch(/not integrated/);
    expect(verdict.reason).toMatch(/Green/);
  });

  it('fails when a ray is present but an order of magnitude below its siblings', () => {
    const lopsided = { Green: 0.6, Blue: 0.6, Indigo: 0.6 * RAINBOW_DISTINCTNESS_FLOOR - 0.01 };
    const verdict = rainbowDistinctness(lopsided);
    // Below the absolute floor is the integration failure; above it, the distinctness failure.
    expect(verdict.ok).toBe(false);
  });

  it('reports distinctness as min/max, and fails exactly at the floor', () => {
    expect(rainbowDistinctness({ Green: 1, Blue: 1, Indigo: 1 }).ok).toBe(true);
    expect(rainbowDistinctness({ Green: 1, Blue: 1, Indigo: 0.5 }).ok).toBe(true);
    expect(rainbowDistinctness({ Green: 1, Blue: 1, Indigo: 0.49 }).ok).toBe(false);
  });

  it('names exactly the three rays of the rainbow', () => {
    expect(RAINBOW_RAYS).toEqual(['Green', 'Blue', 'Indigo']);
    expect(RAINBOW_RAY_FLOOR).toBeGreaterThan(0);
    expect(RAINBOW_DISTINCTNESS_FLOOR).toBeGreaterThan(0);
  });
});

describe('choice-readiness is not a claim about where the harvest happens (19 §9.6)', () => {
  it('is false below the readiness line and true at or above it', () => {
    expect(isChoiceReady(allAt('Red'))).toBe(false);
    expect(isChoiceReady(allAt('Amber'))).toBe(false);
    expect(isChoiceReady(allAt('Orange'))).toBe(true);
    expect(isChoiceReady(allAt('Turquoise'))).toBe(true);
  });

  it('is false when no line altitude was recorded', () => {
    expect(isChoiceReady({})).toBe(false);
  });
});

describe('the sub-octave closure requires EVERY line at L8 Turquoise', () => {
  it('is reached only when all lines have arrived', () => {
    expect(subOctaveClosureReached(allAt('Turquoise')).reached).toBe(true);
  });

  it('is not reached while any line is short, and names how many', () => {
    const short = { ...allAt('Turquoise'), Cognitive: 'Teal' } as Record<Line, Stage>;
    const verdict = subOctaveClosureReached(short);
    expect(verdict.reached).toBe(false);
    expect(verdict.reason).toMatch(/1\/8/);
  });

  it('is not reached when nothing is recorded', () => {
    expect(subOctaveClosureReached({}).reached).toBe(false);
  });

  it('refuses a completed-BUT-not-closed state: the closure is the last position, not any position', () => {
    for (const stage of ALL_STAGES.slice(0, -1)) {
      expect(subOctaveClosureReached(allAt(stage)).reached, stage).toBe(false);
    }
  });
});

describe('eligibility is a condition, and it can never be an event', () => {
  const ready = allAt('Turquoise');

  it('does not expose a harvest/endgame field at all', () => {
    const eligibility = checkChoiceEligibility(crystallized('Radiative', 8), [0.9], true, 0.9, RH);
    expect(eligibility.eligible).toBe(true);
    // The whole point: there is no event-shaped field on the condition.
    expect(eligibility).not.toHaveProperty('harvestEvent');
    expect(eligibility).not.toHaveProperty('harvestable');
  });

  it('requires crystallisation, direction, readiness, Violet integration and the rainbow', () => {
    const c = crystallized('Radiative', 8);
    expect(checkChoiceEligibility({ ...c, mode: 'Exploring' }, [0.9], true, 0.9, RH).eligible).toBe(false);
    expect(checkChoiceEligibility({ ...c, dominantDirection: null }, [0.9], true, 0.9, RH).eligible).toBe(false);
    expect(checkChoiceEligibility(c, [0.9], false, 0.9, RH).eligible).toBe(false);
    expect(checkChoiceEligibility(c, [0.9], true, 0.79, RH).eligible).toBe(false);
    expect(checkChoiceEligibility(c, [0.9], true, 0.9, { Green: 0.9, Blue: 0.9, Indigo: 0.1 }).eligible).toBe(false);
    expect(checkChoiceEligibility(c, null, true, 0.9, RH).eligible).toBe(false);
  });

  it('a saturated Violet total with a skipped rainbow ray is NOT eligible', () => {
    // The discrimination CHOICE-CLOSURE was about: the old check tested the Violet total alone.
    const c = crystallized('Radiative', 8);
    expect(checkChoiceEligibility(c, [0.9], true, 1.0, { Green: 0.0, Blue: 1.0, Indigo: 1.0 }).eligible).toBe(false);
    expect(checkChoiceEligibility(c, [0.9], true, 1.0, RH).eligible).toBe(true);
  });

  it('keeps the 51% / 95% STO/STS asymmetry', () => {
    expect(checkChoiceEligibility(crystallized('Radiative', 6), [0.51], true, 0.9, RH).eligible).toBe(true);
    expect(checkChoiceEligibility(crystallized('Radiative', 6), [0.509], true, 0.9, RH).eligible).toBe(false);
    expect(checkChoiceEligibility(crystallized('Absorptive', 7), [0.95], true, 0.9, RH).eligible).toBe(true);
    expect(checkChoiceEligibility(crystallized('Absorptive', 7), [0.949], true, 0.9, RH).eligible).toBe(false);
    // STS is stricter in the line count as well.
    expect(checkChoiceEligibility(crystallized('Absorptive', 6), [0.99], true, 0.9, RH).eligible).toBe(false);
  });

  it('reports readiness, not the harvest, as the reason it fails', () => {
    const verdict = checkChoiceEligibility(crystallized('Radiative', 8), [0.9], false, 0.9, RH);
    expect(verdict.reason).toMatch(/not choice-ready/);
    expect(verdict.reason).toMatch(/no authentic Choice exists below it/);
  });

  it('carries no readiness requirement it cannot justify: readiness is the ONLY altitude test', () => {
    // Every line at the apex is trivially ready, so eligibility does not depend on the closure.
    expect(ready).toBeDefined();
    const eligibility = checkChoiceEligibility(crystallized('Radiative', 8), [0.9], true, 0.9, RH);
    expect(eligibility.eligible).toBe(true);
  });
});

describe('the harvest EVENT is eligibility ∧ arrival (19 §9.6)', () => {
  const readyState = allAt('Turquoise');
  const shortState = { ...allAt('Turquoise'), Cognitive: 'Teal' } as Record<Line, Stage>;

  it('fires only when eligible AND arrived', () => {
    const state = evaluateChoice(crystallized('Radiative', 8), [0.9], readyState, 0.9, RH);
    expect(state.eligible).toBe(true);
    expect(state.closure.reached).toBe(true);
    expect(state.harvestEvent).toBe(true);
    expect(state.reason).toMatch(/^HARVEST/);
  });

  it('does NOT fire for an eligible player who has not arrived — the Samsara case', () => {
    const state = evaluateChoice(crystallized('Radiative', 8), [0.9], shortState, 0.9, RH);
    expect(state.eligible).toBe(true);
    expect(state.closure.reached).toBe(false);
    expect(state.harvestEvent).toBe(false);
    expect(state.reason).toMatch(/eligible, closure pending/);
  });

  it('does NOT fire for an arrived player who is not eligible', () => {
    const state = evaluateChoice({ ...crystallized('Radiative', 8), mode: 'Exploring' }, [0.9], readyState, 0.9, RH);
    expect(state.eligible).toBe(false);
    expect(state.closure.reached).toBe(true);
    expect(state.harvestEvent).toBe(false);
  });

  it('is exactly the conjunction, over the whole cross-product of the two halves', () => {
    const eligibilities = [
      checkChoiceEligibility(crystallized('Radiative', 8), [0.9], true, 0.9, RH).eligible,
      checkChoiceEligibility({ ...crystallized('Radiative', 8), mode: 'Exploring' }, [0.9], true, 0.9, RH).eligible,
    ];
    const arrivals = [true, false];
    for (const eligible of eligibilities) {
      for (const arrived of arrivals) {
        // Rebuild each cell explicitly so the assertion is on the identity, not on a mock.
        const state = eligible
          ? evaluateChoice(
              crystallized('Radiative', 8),
              [0.9],
              arrived ? readyState : shortState,
              0.9,
              RH,
            )
          : evaluateChoice(
              { ...crystallized('Radiative', 8), mode: 'Exploring' },
              [0.9],
              arrived ? readyState : shortState,
              0.9,
              RH,
            );
        expect(state.harvestEvent, `eligible=${eligible} arrived=${arrived}`).toBe(eligible && arrived);
      }
    }
  });
});

describe('the lifecycle cannot express the shortcut (MY-RG-0030)', () => {
  it('does not permit `Exploring → Harvesting`', () => {
    expect(isValidTransition('Exploring', 'Harvesting')).toBe(false);
    // Nor may any pre-crystallisation state walk into it.
    expect(isValidTransition('Onboarding', 'Harvesting')).toBe(false);
    expect(isValidTransition('Developing', 'Harvesting')).toBe(false);
    expect(isValidTransition('Crystallizing', 'Harvesting')).toBe(false);
  });

  it('permits exactly one entry point into `Harvesting`, and the enum alone is not a licence', () => {
    const entryPoints = (['Onboarding', 'Exploring', 'Developing', 'Crystallizing', 'Transforming'] as const).filter(
      from => isValidTransition(from, 'Harvesting'),
    );
    expect(entryPoints).toEqual(['Transforming']);
    // The enum says the pair is legal; `canHarvest` still refuses without the event.
    expect(canHarvest('Transforming', { harvestEvent: false })).toBe(false);
    expect(canHarvest('Transforming', { harvestEvent: true })).toBe(true);
    // And a state that has not arrived cannot harvest from anywhere, even with a forged event.
    expect(canHarvest('Exploring', { harvestEvent: true })).toBe(false);
  });

  it('is a dead end once entered, and `evaluateChoice` is the only producer of the event', () => {
    expect(isValidTransition('Harvesting', 'Exploring')).toBe(false);
    const state = evaluateChoice(crystallized('Radiative', 8), [0.9], allAt('Turquoise'), 0.9, RH);
    expect(canHarvest('Transforming', state)).toBe(true);
  });
});

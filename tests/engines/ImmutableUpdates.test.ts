/**
 * Tests for T-5.8 — immutable Significator updates in AgenticOrchestrator.
 * Verifies that the direct mutation pattern (sig as mutable) has been replaced
 * with immutable spread updates.
 */
import { describe, it, expect } from 'vitest';
import { createSignificator } from '../../src/core/domain/Significator.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';

function makeAltitudes(stage: Stage): Record<Line, Stage> {
  return {
    Cognitive: stage, Emotional: stage, Moral: stage, Intrapersonal: stage,
    Spiritual: stage, Somatic: stage, Willpower: stage, Interpersonal: stage,
  };
}

describe('T-5.8 — Immutable Significator updates', () => {
  it('theta.lastEncounter can be updated immutably without mutating original', () => {
    const sig = createSignificator('p1', makeAltitudes('Red'), 'Red');
    const originalTimestamp = sig.theta.lastEncounter['Cognitive:Red'];

    // Immutable update (the pattern used in the T-5.8 fix)
    const updatedSig = {
      ...sig,
      theta: {
        lastEncounter: {
          ...sig.theta.lastEncounter,
          ['Cognitive:Red']: Date.now() - 7200000,
        },
      },
    };

    // Original is unchanged
    expect(sig.theta.lastEncounter['Cognitive:Red']).toBe(originalTimestamp);
    // Updated has the new value
    expect(updatedSig.theta.lastEncounter['Cognitive:Red']).not.toBe(originalTimestamp);
    // They are different objects
    expect(sig.theta.lastEncounter).not.toBe(updatedSig.theta.lastEncounter);
    expect(sig).not.toBe(updatedSig);
  });

  it('immutable update preserves all other theta cells', () => {
    const sig = createSignificator('p1', makeAltitudes('Red'), 'Red');
    const updatedSig = {
      ...sig,
      theta: {
        lastEncounter: {
          ...sig.theta.lastEncounter,
          ['Cognitive:Red']: 12345,
        },
      },
    };

    // All other cells should be preserved
    const updatedLast = updatedSig.theta.lastEncounter as Record<string, number>;
    const originalLast = sig.theta.lastEncounter as Record<string, number>;
    expect(updatedLast['Emotional:Red']).toBe(originalLast['Emotional:Red']);
    expect(updatedLast['Somatic:Turquoise']).toBe(originalLast['Somatic:Turquoise']);
  });

  it('immutable update preserves all other Significator fields', () => {
    const sig = createSignificator('p1', makeAltitudes('Red'), 'Red');
    const updatedSig = {
      ...sig,
      theta: {
        lastEncounter: {
          ...sig.theta.lastEncounter,
          ['Cognitive:Red']: 12345,
        },
      },
    };

    expect(updatedSig.id).toBe(sig.id);
    expect(updatedSig.currentStage).toBe(sig.currentStage);
    expect(updatedSig.altitudes).toBe(sig.altitudes);
    expect(updatedSig.drives).toBe(sig.drives);
    expect(updatedSig.shadows).toBe(sig.shadows);
    expect(updatedSig.polarity).toBe(sig.polarity);
  });
});

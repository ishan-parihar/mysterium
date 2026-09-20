/**
 * Tests for T-0.8 (HS-16 fix) — validateSignificator.
 * Verifies schema validation with backward-compat shims for old saves.
 */
import { describe, it, expect } from 'vitest';
import { validateSignificator } from '../../src/infra/persistence/validateSignificator.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';

function makeAltitudes(stage: Stage): Record<Line, Stage> {
  return {
    Cognitive: stage, Emotional: stage, Moral: stage, Intrapersonal: stage,
    Spiritual: stage, Somatic: stage, Willpower: stage, Interpersonal: stage,
  };
}

describe('T-0.8 — validateSignificator', () => {
  it('returns null for input missing id', () => {
    expect(validateSignificator({ currentStage: 'Red' })).toBeNull();
  });

  it('returns null for input with empty id', () => {
    expect(validateSignificator({ id: '' })).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(validateSignificator(null)).toBeNull();
    expect(validateSignificator('string')).toBeNull();
    expect(validateSignificator(42)).toBeNull();
  });

  it('round-trips a freshly created Significator', () => {
    const sig = createSignificator('p1', makeAltitudes('Red'), 'Red');
    const json = JSON.parse(JSON.stringify(sig)) as unknown;
    const restored = validateSignificator(json);
    expect(restored).not.toBeNull();
    expect(restored!.id).toBe('p1');
    expect(restored!.currentStage).toBe('Red');
    expect(restored!.altitudes.Cognitive).toBe('Red');
  });

  it('fills missing altitudes with Red (default)', () => {
    const restored = validateSignificator({ id: 'p2', altitudes: {} });
    expect(restored).not.toBeNull();
    // All 8 lines should be present, defaulting to Red
    expect(restored!.altitudes.Cognitive).toBe('Red');
    expect(restored!.altitudes.Somatic).toBe('Red');
    expect(restored!.altitudes.Interpersonal).toBe('Red');
  });

  it('fills missing drives with zero weights', () => {
    const restored = validateSignificator({ id: 'p3' });
    expect(restored).not.toBeNull();
    expect(restored!.drives.weights.Agency).toBe(0);
    expect(restored!.drives.weights.Communion).toBe(0);
    expect(restored!.drives.fixationRisk.Eros).toBe(0);
  });

  it('fills missing shadows with an empty ledger', () => {
    const restored = validateSignificator({ id: 'p4' });
    expect(restored).not.toBeNull();
    expect(restored!.shadows.entries).toEqual([]);
    expect(restored!.shadows.activeCount).toBe(0);
  });

  it('fills missing theta with all cells at 0 (never visited)', () => {
    const restored = validateSignificator({ id: 'p5' });
    expect(restored).not.toBeNull();
    expect(restored!.theta.lastEncounter['Cognitive:Red']).toBe(0);
    expect(restored!.theta.lastEncounter['Somatic:Turquoise']).toBe(0);
  });

  it('fills missing transformations with empty array', () => {
    const restored = validateSignificator({ id: 'p6' });
    expect(restored).not.toBeNull();
    expect(restored!.transformations).toEqual([]);
  });

  it('fills missing recentEncounters with empty array', () => {
    const restored = validateSignificator({ id: 'p7' });
    expect(restored).not.toBeNull();
    expect(restored!.recentEncounters).toEqual([]);
  });

  it('defaults transformationPhase to "idle"', () => {
    const restored = validateSignificator({ id: 'p8' });
    expect(restored).not.toBeNull();
    expect(restored!.transformationPhase).toBe('idle');
  });

  it('defaults transformation counters to 0', () => {
    const restored = validateSignificator({ id: 'p9' });
    expect(restored).not.toBeNull();
    expect(restored!.transformationSessionsInPhase).toBe(0);
    expect(restored!.transformationKnotsResolved).toBe(0);
    expect(restored!.transformationTotalKnots).toBe(0);
    expect(restored!.transformationTargetStage).toBeNull();
  });

  it('preserves existing transformation counters from a v2 save', () => {
    const restored = validateSignificator({
      id: 'p10',
      transformationPhase: 'crucible',
      transformationSessionsInPhase: 3,
      transformationKnotsResolved: 1,
      transformationTotalKnots: 2,
      transformationTargetStage: 'Amber',
    });
    expect(restored).not.toBeNull();
    expect(restored!.transformationPhase).toBe('crucible');
    expect(restored!.transformationSessionsInPhase).toBe(3);
    expect(restored!.transformationKnotsResolved).toBe(1);
    expect(restored!.transformationTotalKnots).toBe(2);
    expect(restored!.transformationTargetStage).toBe('Amber');
  });

  it('handles a v1 save (pre-T-0.5, no transformation counters)', () => {
    // Simulate an old save that only has transformationPhase (string)
    const restored = validateSignificator({
      id: 'p11',
      transformationPhase: 'threshold',
    });
    expect(restored).not.toBeNull();
    expect(restored!.transformationPhase).toBe('threshold');
    // Counters default to 0 (backward compat)
    expect(restored!.transformationSessionsInPhase).toBe(0);
    expect(restored!.transformationTargetStage).toBeNull();
  });

  it('caps recentEncounters at 50 entries', () => {
    const recentEncounters = Array.from({ length: 100 }, (_, i) => ({
      line: 'Cognitive',
      passed: true,
      timestamp: i,
    }));
    const restored = validateSignificator({ id: 'p12', recentEncounters });
    expect(restored).not.toBeNull();
    expect(restored!.recentEncounters.length).toBeLessThanOrEqual(50);
  });

  it('defaults invalid stage values to Red', () => {
    const restored = validateSignificator({
      id: 'p13',
      currentStage: 'NotARealStage',
      altitudes: { Cognitive: 'AlsoFake' },
    });
    expect(restored).not.toBeNull();
    expect(restored!.currentStage).toBe('Red');
    expect(restored!.altitudes.Cognitive).toBe('Red');
  });
});

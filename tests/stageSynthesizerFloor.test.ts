/**
 * Tests for T-0.9 (HS-04 fix) — StageSynthesizer floor semantics.
 * Verifies the synthesized stage is the floor (min altitude), not dead-code hysteresis.
 */
import { describe, it, expect } from 'vitest';
import { synthesiseStage } from '../src/core/usecases/StageSynthesizer.js';
import type { Line } from '../src/core/domain/Line.js';
import type { Stage } from '../src/core/domain/Stage.js';

function makeAltitudes(stage: Stage): Record<Line, Stage> {
  return {
    Cognitive: stage, Emotional: stage, Moral: stage, Intrapersonal: stage,
    Spiritual: stage, Somatic: stage, Willpower: stage, Interpersonal: stage,
  };
}

describe('T-0.9 — synthesiseStage floor semantics', () => {
  it('returns the uniform stage when all lines are equal', () => {
    expect(synthesiseStage(makeAltitudes('Red'))).toBe('Red');
    expect(synthesiseStage(makeAltitudes('Amber'))).toBe('Amber');
    expect(synthesiseStage(makeAltitudes('Turquoise'))).toBe('Turquoise');
  });

  it('returns the lowest line altitude (floor)', () => {
    const altitudes = { ...makeAltitudes('Orange'), Moral: 'Red' as Stage };
    expect(synthesiseStage(altitudes)).toBe('Red');
  });

  it('returns Infrared if any line is at Infrared', () => {
    const altitudes = { ...makeAltitudes('Turquoise'), Somatic: 'Infrared' as Stage };
    expect(synthesiseStage(altitudes)).toBe('Infrared');
  });

  it('returns the floor when one line pulls ahead but others hold back', () => {
    // Cognitive at Orange, rest at Amber → floor is Amber
    const altitudes = { ...makeAltitudes('Amber'), Cognitive: 'Orange' as Stage };
    expect(synthesiseStage(altitudes)).toBe('Amber');
  });

  it('returns the floor when multiple lines pull ahead', () => {
    // Cognitive + Emotional at Orange, rest at Amber → floor is Amber
    const altitudes = {
      ...makeAltitudes('Amber'),
      Cognitive: 'Orange' as Stage,
      Emotional: 'Orange' as Stage,
    };
    expect(synthesiseStage(altitudes)).toBe('Amber');
  });

  it('does NOT demote a uniform-stage player (no regression from old behavior)', () => {
    // This is the key test: the old dead-code bug would have returned the same
    // value here, but a naive "hysteresis enforces pull" interpretation would
    // demote uniform-Red to Infrared. We preserve the test-expected behavior.
    expect(synthesiseStage(makeAltitudes('Red'))).toBe('Red');
    expect(synthesiseStage(makeAltitudes('Amber'))).toBe('Amber');
  });
});

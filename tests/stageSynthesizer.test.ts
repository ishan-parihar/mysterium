import { describe, it, expect } from 'vitest';
import { synthesiseStage, meetsAdvancementCriteria, checkAdvancementGate } from '../src/core/usecases/StageSynthesizer.js';
import type { Line } from '../src/core/domain/Line.js';
import type { Stage } from '../src/core/domain/Stage.js';
import { createSignificator } from '../src/core/domain/Significator.js';

function makeAltitudes(stage: Stage): Record<Line, Stage> {
  return {
    Cognitive: stage,
    Emotional: stage,
    Moral: stage,
    Intrapersonal: stage,
    Spiritual: stage,
    Somatic: stage,
    Willpower: stage,
    Interpersonal: stage,
  };
}

describe('synthesiseStage', () => {
  it('returns the uniform stage when all lines are equal', () => {
    expect(synthesiseStage(makeAltitudes('Red'))).toBe('Red');
    expect(synthesiseStage(makeAltitudes('Amber'))).toBe('Amber');
  });

  it('returns the lowest line altitude', () => {
    const altitudes = { ...makeAltitudes('Orange'), Moral: 'Red' as Stage };
    expect(synthesiseStage(altitudes)).toBe('Red');
  });

  it('returns Infrared if any line is at Infrared', () => {
    const altitudes = { ...makeAltitudes('Turquoise'), Somatic: 'Infrared' as Stage };
    expect(synthesiseStage(altitudes)).toBe('Infrared');
  });
});

describe('meetsAdvancementCriteria', () => {
  it('returns false when lines are at target but no pull', () => {
    const sig = createSignificator('p1', makeAltitudes('Red'), 'Red');
    expect(meetsAdvancementCriteria(sig, 'Red')).toBe(false);
  });

  it('returns false when any line is below target', () => {
    const altitudes = { ...makeAltitudes('Amber'), Cognitive: 'Red' as Stage };
    const sig = createSignificator('p2', altitudes, 'Red');
    expect(meetsAdvancementCriteria(sig, 'Amber')).toBe(false);
  });

  it('returns false for Infrared when no lines above', () => {
    const sig = createSignificator('p3', makeAltitudes('Infrared'), 'Infrared');
    expect(meetsAdvancementCriteria(sig, 'Infrared')).toBe(false);
  });
});

describe('checkAdvancementGate', () => {
  it('identifies blockers for advancement', () => {
    const sig = createSignificator('p4', makeAltitudes('Red'), 'Red');
    const { canAdvance, blockers } = checkAdvancementGate(sig, 'Red');
    expect(canAdvance).toBe(false);
    expect(blockers.length).toBeGreaterThan(0);
  });

  it('passes when all criteria are met', () => {
    const altitudes: Record<Line, Stage> = {
      Cognitive: 'Orange',
      Emotional: 'Orange',
      Moral: 'Amber',
      Intrapersonal: 'Amber',
      Spiritual: 'Amber',
      Somatic: 'Amber',
      Willpower: 'Amber',
      Interpersonal: 'Amber',
    };
    const sig = createSignificator('p5', altitudes, 'Amber');
    // With the simplified gate (no boss/quadrant checks), this should pass:
    // All lines >= Amber ✓, >=2 lines above Amber (Cognitive, Emotional at Orange) ✓, no active shadows ✓
    const { canAdvance, blockers } = checkAdvancementGate(sig, 'Amber');
    expect(blockers).toEqual([]);
    expect(canAdvance).toBe(true);
  });
});

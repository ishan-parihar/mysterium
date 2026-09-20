import { describe, it, expect } from 'vitest';
import { detectThreshold, computeReadiness } from '../../src/core/engines/TransformationDetector.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';

const redAltitudes: Record<Line, Stage> = {
  Cognitive: 'Red', Emotional: 'Red', Moral: 'Red', Intrapersonal: 'Red',
  Spiritual: 'Red', Somatic: 'Red', Willpower: 'Red', Interpersonal: 'Red',
};

describe('TransformationDetector', () => {
  describe('detectThreshold', () => {
    it('returns null for fresh significator (no catalyst processed)', () => {
      const sig = createSignificator('p1', redAltitudes, 'Red');
      expect(detectThreshold(sig)).toBeNull();
    });

    it('returns null when at Turquoise (max stage)', () => {
      const turquoiseAlt: Record<Line, Stage> = {
        Cognitive: 'Turquoise', Emotional: 'Turquoise', Moral: 'Turquoise', Intrapersonal: 'Turquoise',
        Spiritual: 'Turquoise', Somatic: 'Turquoise', Willpower: 'Turquoise', Interpersonal: 'Turquoise',
      };
      const sig = createSignificator('p1', turquoiseAlt, 'Turquoise');
      expect(detectThreshold(sig)).toBeNull();
    });
  });

  describe('computeReadiness', () => {
    it('returns moderate readiness for fresh player (convergence high, saturation zero)', () => {
      const sig = createSignificator('p1', redAltitudes, 'Red');
      const report = computeReadiness(sig, 'Amber');
      // convergence=1 (all lines at Red), saturation=0, shadowClearance=1 → 0.4+0+0.3=0.7
      expect(report.overall).toBeCloseTo(0.7, 1);
      expect(report.saturation).toBe(0);
    });

    it('convergence is high when all lines are at current stage', () => {
      const sig = createSignificator('p1', redAltitudes, 'Red');
      const report = computeReadiness(sig, 'Amber');
      // All 8 lines at Red (ordinal 2), requirement for Red→Amber is 5 lines at ordinal ≥2
      expect(report.convergence).toBe(1);
    });

    it('shadow clearance is 1 when no critical shadows', () => {
      const sig = createSignificator('p1', redAltitudes, 'Red');
      const report = computeReadiness(sig, 'Amber');
      expect(report.shadowClearance).toBe(1);
    });

    it('saturation is 0 when no traces recorded', () => {
      const sig = createSignificator('p1', redAltitudes, 'Red');
      const report = computeReadiness(sig, 'Amber');
      expect(report.saturation).toBe(0);
    });
  });
});

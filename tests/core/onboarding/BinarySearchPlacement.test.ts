/**
 * Tests for the binary-search placement engine (ONBOARDING-REDESIGN-PLAN §2.2).
 *
 * Guarantees under test:
 *   O1  Convergence law — pass(S) + fail(S+1) ⇒ altitude = S with combined
 *       confidence.
 *   O2  Probe budget — ≤ 8 probes per line across the whole ladder.
 *   O3  Ladder edges — Infrared and White truths resolve without overrun.
 *   O4  Ambiguity — persistent low-confidence probes mark boundary, never
 *       fake convergence; resolvable ambiguity retries then proceeds.
 *   O5  Seeding — altitudesFromPlacement maps results to Significator shape
 *       with honest low-confidence fallbacks.
 */
import { describe, it, expect } from 'vitest';
import {
  placeLine, placeAllLines, altitudesFromPlacement, defaultStartStage,
  MAX_PROBES_PER_LINE, CONFIDENCE_THRESHOLD, type PlacementProbe,
} from '../../../src/core/onboarding/BinarySearchPlacement.js';
import { ALL_STAGES } from '../../../src/core/domain/Stage.js';
import { ALL_LINES } from '../../../src/core/domain/Line.js';
import type { Stage } from '../../../src/core/domain/Stage.js';

/** Deterministic synthetic player with a true altitude on every line. */
function probeWithTruth(truth: Stage): PlacementProbe {
  const t = ALL_STAGES.indexOf(truth);
  return (_line, stage) => {
    const i = ALL_STAGES.indexOf(stage);
    if (i <= t) return { outcome: 'pass', confidence: 0.9 };
    return { outcome: 'fail', confidence: 0.9 };
  };
}

describe('convergence law (O1)', () => {
  it('places mid-ladder truths exactly, within budget', () => {
    for (const truth of ['Red', 'Amber', 'Orange', 'Green', 'Turquoise'] as const) {
      const p = placeLine('Cognitive', probeWithTruth(truth));
      expect(p.converged, `truth ${truth}`).toBe(true);
      expect(p.altitude, `truth ${truth}`).toBe(truth);
      expect(p.probesUsed).toBeLessThanOrEqual(MAX_PROBES_PER_LINE);
    }
  });

  it('confidence is min(pass, fail) at the boundary pair', () => {
    const probe: PlacementProbe = (_line, stage) => {
      const i = ALL_STAGES.indexOf(stage);
      const t = ALL_STAGES.indexOf('Amber');
      return i <= t ? { outcome: 'pass', confidence: 0.8 } : { outcome: 'fail', confidence: 0.7 };
    };
    const p = placeLine('Cognitive', probe);
    expect(p.altitude).toBe('Amber');
    expect(p.confidence).toBeCloseTo(0.7);
  });
});

describe('probe budget (O2)', () => {
  it('never exceeds 8 probes, worst case included', () => {
    // Worst case: truth requires full up-walk from the default start.
    for (const truth of ALL_STAGES) {
      for (const line of ['Cognitive', 'Moral']) {
        const p = placeLine(line as never, probeWithTruth(truth));
        expect(p.probesUsed, `truth ${truth} line ${line}`).toBeLessThanOrEqual(MAX_PROBES_PER_LINE);
      }
    }
  });

  it('default start stage is Red except Moral (Amber)', () => {
    for (const line of ALL_LINES) {
      expect(defaultStartStage(line)).toBe(line === 'Moral' ? 'Amber' : 'Red');
    }
  });
});

describe('ladder edges (O3)', () => {
  it('bottom truth lands at Infrared', () => {
    const p = placeLine('Cognitive', probeWithTruth('Infrared'));
    expect(p.altitude).toBe('Infrared');
    expect(p.converged).toBe(true);
  });

  it('top truth lands at White', () => {
    const p = placeLine('Cognitive', probeWithTruth('White'));
    expect(p.altitude).toBe('White');
    expect(p.converged).toBe(true);
  });
});

describe('ambiguity (O4)', () => {
  it('persistent ambiguity marks boundary without convergence', () => {
    const ambiguous: PlacementProbe = () => ({ outcome: 'pass', confidence: CONFIDENCE_THRESHOLD - 0.05 });
    const p = placeLine('Somatic', ambiguous);
    expect(p.converged).toBe(false);
    expect(p.boundary).toBe(true);
  });

  it('resolvable ambiguity retries at the same stage then proceeds', () => {
    let calls = 0;
    const probe: PlacementProbe = (_line, stage, attempt) => {
      calls++;
      // First probe of the session is ambiguous; retries resolve to pass.
      if (attempt === 0 && calls === 1) return { outcome: 'pass', confidence: 0.3 };
      const i = ALL_STAGES.indexOf(stage);
      const t = ALL_STAGES.indexOf('Red');
      return i <= t ? { outcome: 'pass', confidence: 0.9 } : { outcome: 'fail', confidence: 0.9 };
    };
    const p = placeLine('Cognitive', probe);
    expect(p.altitude).toBe('Red');
    expect(p.converged).toBe(true);
  });
});

describe('full composite + seeding (O5)', () => {
  it('placeAllLines converges for a uniform player within total budget', () => {
    const result = placeAllLines(probeWithTruth('Red'));
    expect(result.converged).toBe(true);
    // 8 lines × ≤8 probes = ≤64, but uniform Red truth should be far cheaper.
    expect(result.probesUsed).toBeLessThanOrEqual(8 * MAX_PROBES_PER_LINE);
  });

  it('altitudesFromPlacement seeds the Significator shape honestly', () => {
    const result = placeAllLines(probeWithTruth('Red'));
    const { altitudes, lowConfidenceLines } = altitudesFromPlacement(result);
    for (const line of ALL_LINES) {
      expect(altitudes[line]).toBe('Red');
    }
    expect(lowConfidenceLines).toEqual([]);

    // A boundary player falls back to default start at low confidence.
    const boundary = placeAllLines(() => ({ outcome: 'pass', confidence: 0.1 }));
    const seeded = altitudesFromPlacement(boundary);
    expect(seeded.lowConfidenceLines.length).toBe(ALL_LINES.length);
    expect(seeded.altitudes.Cognitive).toBe('Red');
    expect(seeded.altitudes.Moral).toBe('Amber');
  });
});

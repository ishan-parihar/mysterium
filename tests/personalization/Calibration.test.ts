/**
 * Calibration-surface tests — the telemetry wrapper's degeneracy detection and the calibration
 * harness's fail-closed predicate (46 §11 + the calibration tier's contract):
 * an empty store or a zero-composition cell is a STRUCTURAL defect that must fail closed,
 * while entropy/share signals are development-loop data, not launch blockers.
 */
import { describe, it, expect } from 'vitest';
import { structuralFailures } from '../../scripts/calibrate-personalization.js';
import { createCompositionTelemetry } from '../../src/core/personalization/compositionTelemetry.js';
import type { CompositionEvent } from '../../src/core/personalization/diversityMonitor.js';

describe('calibration harness (scripts/calibrate-personalization)', () => {
  it('an empty store is a structural failure', () => {
    const f = structuralFailures(0, []);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatch(/EMPTY/);
  });

  it('a cell that composes nothing despite the store is a structural failure naming the cell', () => {
    const f = structuralFailures(1792, ['Cognitive:Red']);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatch(/Cognitive:Red/);
    expect(f[0]).toMatch(/structural gap/);
  });

  it('a healthy full pass produces zero failures', () => {
    expect(structuralFailures(1792, [])).toHaveLength(0);
  });
});

describe('telemetry-as-calibration-record', () => {
  const ev = (cell: string, facetKeys: string[], at = 1_700_000_000_000): CompositionEvent => ({
    cell,
    facetKeys,
    at,
  });

  it('degenerate traffic (single facet, above noise floor) yields a visibility-collapse signal', () => {
    const t = createCompositionTelemetry();
    for (let i = 0; i < 10; i++) t.record(ev('Moral:Red', ['only-facet']));
    const reports = t.evaluate();
    expect(reports.some((r) => r.kind === 'visibility-collapse' && r.subject === 'Moral:Red')).toBe(true);
  });

  it('diverse rotated traffic yields no signals', () => {
    const t = createCompositionTelemetry();
    for (let i = 0; i < 21; i++) t.record(ev('Moral:Red', [`f${i % 8}a`, `f${(i + 3) % 8}b`, `f${(i + 5) % 8}c`]));
    expect(t.evaluate().filter((r) => r.subject === 'Moral:Red')).toHaveLength(0);
  });

  it('the retained window is exposed for offline analysis (the calibration harness reads it)', () => {
    const t = createCompositionTelemetry();
    t.record(ev('Moral:Red', ['a']));
    t.record(ev('Moral:Amber', ['b']));
    expect(t.eventCount).toBe(2);
    expect([...t.knownCells].sort()).toEqual(['Moral:Amber', 'Moral:Red']);
  });
});

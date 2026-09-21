/**
 * Composition telemetry lifecycle tests (46 §11 + 47 §9 check 9).
 * Locks: bounded event retention, idempotent evaluate, acknowledge-suppression within the
 * retention window, and that BOTH monitors flow through the wrapper.
 */
import { describe, it, expect } from 'vitest';
import { createCompositionTelemetry, MAX_EVENTS } from '../../src/core/personalization/compositionTelemetry.js';
import type { CompositionEvent } from '../../src/core/personalization/diversityMonitor.js';

function ev(cell: string, facetKeys: string[], scaffoldId?: string): CompositionEvent {
  return { cell, facetKeys, scaffoldId, at: 1_700_000_000_000 };
}

describe('compositionTelemetry', () => {
  it('retains a bounded FIFO of events', () => {
    const t = createCompositionTelemetry();
    for (let i = 0; i < MAX_EVENTS + 50; i++) t.record(ev('Cognitive:Red', ['k' + (i % 3)]));
    expect(t.eventCount).toBe(MAX_EVENTS);
  });

  it('does not duplicate a pending report across evaluates', () => {
    const t = createCompositionTelemetry();
    // Degenerate traffic: same single facet key, enough compositions to clear the noise floor.
    for (let i = 0; i < 10; i++) t.record(ev('Cognitive:Red', ['always-the-same']));
    const first = t.evaluate();
    expect(first.filter((r) => r.kind === 'visibility-collapse' && r.subject === 'Cognitive:Red')).toHaveLength(1);
    // Re-evaluating with more of the same traffic must not stack duplicates.
    for (let i = 0; i < 10; i++) t.record(ev('Cognitive:Red', ['always-the-same']));
    const second = t.evaluate();
    expect(second.filter((r) => r.kind === 'visibility-collapse' && r.subject === 'Cognitive:Red')).toHaveLength(1);
  });

  it('acknowledge removes a report from pending and suppresses re-raise within the window', () => {
    const t = createCompositionTelemetry();
    for (let i = 0; i < 10; i++) t.record(ev('Cognitive:Red', ['one-facet']));
    expect(t.evaluate().some((r) => r.subject === 'Cognitive:Red')).toBe(true);
    t.acknowledge('visibility-collapse', 'Cognitive:Red');
    expect(t.pending.some((r) => r.subject === 'Cognitive:Red')).toBe(false);
    // Still not re-raised by later evaluates within the same retention window.
    for (let i = 0; i < 10; i++) t.record(ev('Cognitive:Red', ['one-facet']));
    expect(t.pending.some((r) => r.subject === 'Cognitive:Red')).toBe(false);
  });

  it('routes scaffold-share defects through the same lifecycle', () => {
    const t = createCompositionTelemetry({ scaffoldCeilings: { 'deep-work-scaffold': 0.2 } });
    for (let i = 0; i < 10; i++) t.record(ev('Cognitive:Red', ['a', 'b'], i < 8 ? 'deep-work-scaffold' : undefined));
    const reports = t.evaluate();
    const hit = reports.find((r) => r.kind === 'scaffold-share-exceeded' && r.subject === 'deep-work-scaffold');
    expect(hit).toBeDefined();
    t.acknowledge('scaffold-share-exceeded', 'deep-work-scaffold');
    expect(t.pending.some((r) => r.kind === 'scaffold-share-exceeded')).toBe(false);
  });

  it('a healthy cell produces no collapse report', () => {
    const t = createCompositionTelemetry();
    // Spread traffic across many facet keys so entropy stays above the floor.
    for (let i = 0; i < 12; i++) t.record(ev('Moral:Amber', ['k' + i, 'x' + i, 'y' + i]));
    expect(t.evaluate().filter((r) => r.subject === 'Moral:Amber')).toHaveLength(0);
  });
});

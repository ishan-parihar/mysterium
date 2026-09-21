import { describe, it, expect } from 'vitest';
import { createReportingFeed } from '../../src/core/orchestration/reportingFeed.js';
import type { FeedEntry } from '../../src/core/orchestration/reportingFeed.js';
import type { LogRef, Proposal, SessionSignals } from '../../src/core/orchestration/types.js';

const logRef: LogRef = { sessionId: 's1', delegationId: 'd1', startedAtMs: 1000, endedAtMs: 2000 };
const signals: SessionSignals = {
  veilRisk: 0.1, distressSignal: 0.0, frustrationSignal: 0.2, progressDelta: 0.3, consentEvents: [],
};
const proposal: Proposal = { kind: 'mastery_evidence', payload: { concept: 'Cognitive:Red:1' }, rationale: 'staircase pass' };

const sessionEntry: FeedEntry = {
  id: 'sess-1', at: 2000, source: 'session', ref: logRef,
  signals, proposals: [proposal],
};
const workerEntry: FeedEntry = {
  id: 'job-1', at: 2100, source: 'worker',
  ref: { jobId: 'j1', jobKind: 'identity_profile_update', startedAtMs: 1100, endedAtMs: 1900 },
  proposals: [proposal],
  proposalsOwnerCommitted: [{ kind: 'encounter_record', payload: { holonId: 'h1' }, rationale: 'owner commit (W2)' }],
};
const ratificationEntry: FeedEntry = {
  id: 'rat-1', at: 2200, source: 'ratification', ref: logRef,
  proposals: [],
  verdict: { committed: ['p-1'], rejected: [['p-2', 'veil risk above threshold']] },
};

describe('reporting feed (43 §5.5)', () => {
  it('one feed, one entry per unit of work: session and worker share the shape', () => {
    const feed = createReportingFeed();
    feed.append(sessionEntry);
    feed.append(workerEntry);
    expect(feed.entries).toHaveLength(2);
    expect(feed.entries[0].source).toBe('session');
    expect(feed.entries[1].source).toBe('worker');
  });

  it('F3 — replay is idempotent: a duplicate id returns the stored entry, no double-count', () => {
    const feed = createReportingFeed();
    const first = feed.append(sessionEntry);
    const replay = feed.append({ ...sessionEntry, proposals: [] });
    expect(replay).toBe(first);
    expect(feed.entries).toHaveLength(1);
    expect(feed.entries[0].proposals).toHaveLength(1);
  });

  it('F1 — the CCI reader sees committed verdicts, never raw signals', () => {
    const feed = createReportingFeed();
    feed.append(sessionEntry);
    feed.append(ratificationEntry);
    const seen = feed.read('cci');
    expect(seen).toHaveLength(1);
    expect(seen[0].id).toBe('rat-1');
    expect(seen[0].signals).toBeUndefined();
    expect(seen[0].verdict?.committed).toEqual(['p-1']);
  });

  it('F1 — a ratification entry with no commits is invisible to the CCI reader', () => {
    const feed = createReportingFeed();
    feed.append({ ...ratificationEntry, verdict: { committed: [], rejected: [] } });
    expect(feed.read('cci')).toHaveLength(0);
  });

  it('F1 — the projection reader sees committed state only (projections strip signals)', () => {
    const feed = createReportingFeed();
    feed.append(sessionEntry);
    feed.append(workerEntry); // owner-committed deltas count as committed (W2)
    feed.append(ratificationEntry);
    const seen = feed.read('projection');
    expect(seen.map((e) => e.id).sort()).toEqual(['job-1', 'rat-1']);
    for (const e of seen) expect(e.signals).toBeUndefined();
  });

  it('27 (planning) reads signals + forecasts — the raw layer it needs', () => {
    const feed = createReportingFeed();
    feed.append(sessionEntry);
    feed.append(ratificationEntry);
    const seen = feed.read('planning');
    expect(seen.map((e) => e.id)).toEqual(['sess-1']);
    expect(seen[0].signals?.progressDelta).toBe(0.3);
  });

  it('F4 — an orchestrator-loop entry without a forecast is rejected', () => {
    const feed = createReportingFeed();
    expect(() =>
      feed.append({
        id: 'orb-1', at: 3000, source: 'orchestrator', ref: logRef, proposals: [],
        insight: { suspectedCauses: ['x'], evidence: ['y'], recommendedPlanDeltas: ['z'] },
      }),
    ).toThrowError(/F4/);
  });

  it('an orchestrator insight WITH a forecast is recorded and readable by planning', () => {
    const feed = createReportingFeed();
    feed.append({
      id: 'orb-2', at: 3000, source: 'orchestrator', ref: logRef, proposals: [],
      insight: { suspectedCauses: ['stall'], evidence: ['3 sessions stalled'], recommendedPlanDeltas: ['swap modality'] },
      forecast: { expected: 'progress ~0.4', observed: 'progress ~0.0', deviation: 0.4 },
    });
    const seen = feed.read('planning');
    expect(seen).toHaveLength(1);
    expect(seen[0].insight?.suspectedCauses).toEqual(['stall']);
    expect(seen[0].forecast?.deviation).toBe(0.4);
  });

  it('F2 — worker owner-committed deltas are recorded but never ratified here', () => {
    const feed = createReportingFeed();
    feed.append(workerEntry);
    const seen = feed.read('projection');
    expect(seen[0].proposalsOwnerCommitted).toHaveLength(1);
    // recorded, not ratified: no verdict is synthesized for worker entries
    expect(seen[0].verdict).toBeUndefined();
  });
});

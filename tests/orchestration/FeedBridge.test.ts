/**
 * Runtime-loop wiring tests — closing the orchestrator↔feed↔worker↔personalization cycle.
 * Locks: the four 43 §5.5 writers attach with idempotent ids (F3), the F4 forecast requirement,
 * reader projections (F1/F2: committed-only for CCI/projections, signals for planning),
 * owner-worker drains as worker entries, and the live envelope's degradation + firewall.
 */
import { describe, it, expect } from 'vitest';
import {
  newFeed, appendSessionEntry, appendVerdictEntry, appendInsightEntry,
  appendOwnerWorkerEntry,
} from '../../src/core/orchestration/feedBridge.js';
import type { SessionSignals, LogRef } from '../../src/core/orchestration/types.js';
import {
  createOwnerWorkerPoolState, drain,
} from '../../src/core/world/ownerWorkerPool.js';
import { createHolonProfile, commitEvents } from '../../src/core/world/ownerWorker.js';
import type { Holon } from '../../src/core/world/Holon.js';
import { buildLiveEnvelope } from '../../src/core/personalization/envelopeRuntime.js';
import { createTagStore } from '../../src/core/world/tags/dialectic.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import { ALL_LINES, type Line } from '../../src/core/domain/Line.js';
import { ALL_STAGES, type Stage } from '../../src/core/domain/Stage.js';
import type { PoolCandidate } from '../../src/core/personalization/pooling.js';

const signals: SessionSignals = {
  veilRisk: 0.1, distressSignal: 0, frustrationSignal: 0.2, progressDelta: 0.3, consentEvents: [],
};
const logRef: LogRef = { sessionId: 's1', delegationId: 'd1', startedAtMs: 1000, endedAtMs: 2000 };

describe('feed bridge — the four writers (43 §5.5)', () => {
  it('session end writes signals + proposals, idempotent per sessionId (F3)', () => {
    const feed = newFeed();
    const a = appendSessionEntry(feed, { logRef, signals, proposals: [] });
    const b = appendSessionEntry(feed, { logRef, signals, proposals: [] });
    expect(a.id).toBe(b.id);
    expect(feed.entries).toHaveLength(1);
  });

  it('an orchestrator-loop entry without a forecast throws (F4)', () => {
    const feed = newFeed();
    expect(() => appendInsightEntry(feed, {
      sessionId: 's1', at: 100,
      insight: { suspectedCauses: ['x'], evidence: ['y'], recommendedPlanDeltas: ['z'] },
      forecast: undefined as never,
    })).toThrowError(/F4/);
  });

  it('reader projections hold: CCI/projections see committed verdicts only; planning sees signals (F1/F2)', () => {
    const feed = newFeed();
    appendSessionEntry(feed, { logRef, signals, proposals: [] });
    appendVerdictEntry(feed, { sessionId: 's1', at: 3000, dispositions: [{ kind: 'mastery_evidence', accepted: true, reason: 'ok' }] });
    const cci = feed.read('cci');
    expect(cci).toHaveLength(1);
    expect(cci[0].source).toBe('ratification');
    const planning = feed.read('planning');
    expect(planning.some((e) => e.source === 'session' && e.signals !== undefined)).toBe(true);
  });

  it('an owner-worker drain becomes one worker entry (22 §7.5 + 43 §5.5 W2)', () => {
    const holon = {
      id: 'kael', name: 'Kael', kind: 'NPC', line: 'Moral', stage: 'Red',
      drives: { dominant: 'Agency', secondary: 'Communion', shadowQuadrant: null },
      polarity: 'Sovereign', narrativeRole: 'deserter', relationships: [], active: true,
    } as unknown as Holon;
    const ev = {
      encounterId: 'e1', timestamp: 1, polarityTrace: {}, shadowSurfaced: 'DarkAllergy',
      shadowResolved: null,
      holonDeltas: [{ holonId: 'kael', field: 'trust', oldValue: 0.2, newValue: 0.4 }],
      altitudeShift: null, driveShift: null, narrativeSummary: 'Player betrayed Kael to the guards',
    } as never;
    const { profile } = commitEvents(createHolonProfile(holon), [ev]);
    void profile;
    const { proposals } = commitEvents(createHolonProfile(holon), [ev]);
    const feed = newFeed();
    const entry = appendOwnerWorkerEntry(feed, {
      jobId: 'job-kael-1', startedAtMs: 10, endedAtMs: 20, proposals,
    });
    expect(entry.source).toBe('worker');
    expect(entry.proposals).toHaveLength(1);
    // Idempotent per drain job (W4).
    const again = appendOwnerWorkerEntry(feed, { jobId: 'job-kael-1', startedAtMs: 10, endedAtMs: 20, proposals });
    expect(again.id).toBe(entry.id);
    expect(feed.entries).toHaveLength(1);
  });

  it('a pool drain round-trips through the bridge (the W2 record path)', () => {
    const holon = {
      id: 'kael', name: 'Kael', kind: 'NPC', line: 'Moral', stage: 'Red',
      drives: { dominant: 'Agency', secondary: 'Communion', shadowQuadrant: null },
      polarity: 'Sovereign', narrativeRole: 'deserter', relationships: [], active: true,
    } as unknown as Holon;
    const ev = {
      encounterId: 'e1', timestamp: 1, polarityTrace: {}, shadowSurfaced: 'DarkAllergy',
      shadowResolved: null,
      holonDeltas: [{ holonId: 'kael', field: 'trust', oldValue: 0.2, newValue: 0.4 }],
      altitudeShift: null, driveShift: null, narrativeSummary: 'betrayal',
    } as never;
    const { proposals } = drain(createOwnerWorkerPoolState(), [holon], [ev], ['kael']);
    expect(proposals.length).toBeGreaterThan(0);
    const feed = newFeed();
    appendOwnerWorkerEntry(feed, { jobId: 'j1', startedAtMs: 0, endedAtMs: 1, proposals });
    expect(feed.read('planning').some((e) => e.proposals.length > 0)).toBe(true);
  });
});

describe('live envelope (45 §5/§6) — degradation and firewall', () => {
  const tagStore = createTagStore();
  const altitudes = Object.fromEntries(ALL_LINES.map((l) => [l, 'Amber' as Stage])) as Record<Line, Stage>;
  const sig = createSignificator('env-test', altitudes, 'Amber');
  const resolve = () => undefined;
  const candidates: readonly PoolCandidate[] = [
    { id: 'scenario:sailchart', cell: { line: 'Cognitive', stage: 'Amber', modality: 'ScenarioChoice' }, tags: ['exploration'], stratum: 0, depthFloor: 0, landsIn: ['sailing'] },
  ];

  it('degrades to an unpersonalized-but-valid envelope when nothing is usable (45 §3)', () => {
    const out = buildLiveEnvelope({
      sig, target: { line: 'Cognitive', stage: 'Amber', modality: 'ScenarioChoice' },
      purpose: 'scheduler mandate', veiled: [], candidates, tagStore, resolve,
      states: {}, now: 1,
    });
    // Empty declared/observed data → empty-but-valid UDV bands, session still runs.
    expect(out.udv.interests).toHaveLength(0);
    expect(out.context.catalystTarget.purpose).toBe('scheduler mandate');
    expect(out.forCatalyst.role).toBe('scenario-catalyst');
  });

  it('the UDV carries no stage labels (the MY-AD-0020 §3 firewall holds at runtime)', () => {
    const out = buildLiveEnvelope({
      sig, target: { line: 'Cognitive', stage: 'Amber', modality: 'ScenarioChoice' },
      purpose: 'x', veiled: [], candidates, tagStore, resolve, states: {}, now: 1,
    });
    const serialized = JSON.stringify(out.udv);
    for (const stage of ALL_STAGES) expect(serialized).not.toContain(`"${stage}"`);
  });

  it('the catalyst purpose comes from the encounter, never the UDV (46 §11 invariant 5)', () => {
    const out = buildLiveEnvelope({
      sig, target: { line: 'Moral', stage: 'Red', modality: 'ImmersiveRPG' },
      purpose: 'the scheduled mandate', veiled: ['anything'], candidates: [], tagStore, resolve,
      states: {}, now: 1,
    });
    expect(out.context.catalystTarget).toEqual({ line: 'Moral', stage: 'Red', modality: 'ImmersiveRPG', purpose: 'the scheduled mandate' });
    expect(out.context.veiled).toEqual(['anything']);
    expect(out.ranked).toHaveLength(0); // empty library degrades, never blocks
  });
});

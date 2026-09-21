/**
 * Owner-worker integration tests (22 §7.5 / MY-AD-0009).
 * Locks: §7.2 delta caps, the local single-writer law, W4 replay idempotence, L3 digest bounds,
 * the §7.5 orchestrator boundary (player-facing effects leave as proposals), the pool's hot-set
 * scope and W5 concurrency cap, and offline degradation (pure fold, no clock).
 */
import { describe, it, expect } from 'vitest';
import {
  createHolonProfile, commitEvents, classifyPattern, digest, isOwner, MAX_DELTA_PER_ENCOUNTER,
} from '../../src/core/world/ownerWorker.js';
import {
  createOwnerWorkerPoolState, drain, hotSet, profileOf, DEFAULT_MAX_CONCURRENT,
} from '../../src/core/world/ownerWorkerPool.js';
import type { Holon } from '../../src/core/world/Holon.js';
import type { ConsequenceRecord } from '../../src/core/domain/ConsequenceRecord.js';

function mkHolon(id: string, rels: readonly string[] = []): Holon {
  return {
    id, name: id, kind: 'NPC', line: 'Moral', stage: 'Red',
    drives: { dominant: 'Agency', secondary: 'Communion', shadowQuadrant: null },
    polarity: 'Sovereign', narrativeRole: 'test', relationships: rels, active: true,
  };
}

let seq = 0;
const HEALTHY: Readonly<Record<string, string>> = {
  Agency: 'HealthyBalanced', Communion: 'HealthyBalanced', Eros: 'HealthyBalanced', Agape: 'HealthyBalanced',
};

function mkEvent(holonId: string, field: string, from: number, to: number, summary = 'a thing happened'): ConsequenceRecord {
  seq++;
  return {
    encounterId: `e${seq}`,
    timestamp: 1_700_000_000_000 + seq,
    polarityTrace: {
      encounterId: `e${seq}`,
      timestamp: 1_700_000_000_000 + seq,
      driveDirectionality: HEALTHY as never,
      energeticDirection: 'Sovereign',
      stageOrientation: 'IntegratingLower',
      sourceOfNourishment: 'Ambivalent',
    },
    shadowSurfaced: null,
    shadowResolved: null,
    holonDeltas: [{ holonId, field, oldValue: from, newValue: to }],
    altitudeShift: null,
    driveShift: null,
    narrativeSummary: summary,
  };
}

describe('owner worker — the single writer (22 §7.5)', () => {
  it('caps every numeric delta at ±0.3 per encounter (§7.2 rule 1)', () => {
    const h = mkHolon('kael');
    const p = commitEvents(createHolonProfile(h), [mkEvent('kael', 'trust', 0.2, 0.9)]);
    const key = 'field:trust';
    expect(p.profile.intensities[key]).toBeCloseTo(0.5 + MAX_DELTA_PER_ENCOUNTER, 5);
  });

  it('clamps intensity into [0,1] across many events', () => {
    const h = mkHolon('kael');
    const events = Array.from({ length: 10 }, () => mkEvent('kael', 'trust', 0, 0.3));
    const p = commitEvents(createHolonProfile(h), events);
    expect(p.profile.intensities['field:trust']).toBeLessThanOrEqual(1);
  });

  it('player-facing effects leave as PROPOSALS, never direct writes (§7.5 boundary)', () => {
    const h = mkHolon('kael');
    seq++;
    const ev: ConsequenceRecord = {
      ...mkEvent('kael', 'trust', 0.4, 0.5),
      shadowSurfaced: 'DarkAllergy',
    };
    const { profile, proposals } = commitEvents(createHolonProfile(h), [ev]);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].kind).toBe('shadow_entry');
    expect(profile.appliedEventCount).toBe(1);
  });

  it('classifies L3 archetypal patterns from narrative summaries', () => {
    expect(classifyPattern(mkEvent('kael', 'trust', 0.4, 0.5, 'Player betrayed Kael to the guards'), 'kael')).toBe('betrayal');
    expect(classifyPattern(mkEvent('kael', 'trust', 0.4, 0.5, 'Kael thanked the player for the rescue'), 'kael')).toBe('gratitude');
    expect(classifyPattern(mkEvent('other', 'trust', 0.4, 0.5, 'betrayal'), 'kael')).toBeNull();
  });

  it('isOwner is identity, and the digest stays a bounded voice line', () => {
    expect(isOwner('kael', 'kael')).toBe(true);
    expect(isOwner('kael', 'iron-company')).toBe(false);
    const h = mkHolon('kael', ['iron-company']);
    const p = commitEvents(createHolonProfile(h), [
      mkEvent('kael', 'trust', 0.2, 0.9, 'Kael thanked the player for the rescue'),
    ]);
    const d = digest(p.profile, h);
    expect(d).toContain('kael');
    expect(d.split(' · ').length).toBeLessThanOrEqual(6);
  });
});

describe('owner-worker pool — scale law (22 §7.5 / MY-AD-0010)', () => {
  it('dispatches for the hot-set only — cold holons never update', () => {
    const holons = [mkHolon('warm-1'), mkHolon('cold-1')];
    const events = [mkEvent('warm-1', 'trust', 0.2, 0.4), mkEvent('cold-1', 'trust', 0.2, 0.4)];
    const { state } = drain(createOwnerWorkerPoolState(), holons, events, ['warm-1']);
    expect(profileOf(state, 'warm-1')).toBeDefined();
    expect(profileOf(state, 'cold-1')).toBeUndefined();
  });

  it('enforces the concurrency cap and queues the overflow deterministically', () => {
    const holons = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => mkHolon(id));
    const events = holons.map((h) => mkEvent(h.id, 'trust', 0.2, 0.4));
    const { state } = drain(createOwnerWorkerPoolState(), holons, events, holons.map((h) => h.id));
    expect(Object.keys(state.workers)).toHaveLength(DEFAULT_MAX_CONCURRENT);
    expect(state.queued).toEqual(['e', 'f']);
    // The queued holons commit on the NEXT drain — the backlog gets priority (W5 drains forward).
    const second = drain(state, holons, events, holons.map((h) => h.id));
    expect(Object.keys(second.state.workers)).toHaveLength(6);
  });

  it('replay is idempotent (W4): draining the same ledger twice changes nothing', () => {
    const holons = [mkHolon('kael')];
    const events = [mkEvent('kael', 'trust', 0.2, 0.9)];
    const first = drain(createOwnerWorkerPoolState(), holons, events, ['kael']);
    const second = drain(first.state, holons, events, ['kael']);
    expect(profileOf(second.state, 'kael')!.intensities).toEqual(profileOf(first.state, 'kael')!.intensities);
    expect(profileOf(second.state, 'kael')!.appliedEventCount).toBe(1);
  });

  it('is a pure fold — same inputs, same state, no clock (offline degradation)', () => {
    const holons = [mkHolon('kael')];
    const events = [mkEvent('kael', 'trust', 0.2, 0.9, 'Kael thanked the player for the rescue')];
    const a = drain(createOwnerWorkerPoolState(), holons, events, ['kael']);
    const b = drain(createOwnerWorkerPoolState(), holons, events, ['kael']);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  });

  it('hotSet narrows to warm ids', () => {
    const holons = [mkHolon('a'), mkHolon('b')];
    expect(hotSet(holons, ['b']).map((h) => h.id)).toEqual(['b']);
  });
});

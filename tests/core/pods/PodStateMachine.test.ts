/**
 * Tests for the pod state machine (doc 38) — formation, membership bounds,
 * ritual lifecycle, recognition rules, and the serial event application path.
 *
 * Guarantees under test:
 *   B1  Membership bounds — invite-only, 3–9 members, no duplicates.
 *   B2  Ritual lifecycle — state order, quorum gate, role-independence.
 *   B3  Recognition — peer-issued only, published-evidence-backed.
 *   B4  Serial application — the single mutation path reproduces direct calls.
 *   B5  Payload firewall — personal psych state never crosses the wall.
 */
import { describe, it, expect } from 'vitest';
import {
  emptyPodState,
  formPod,
  joinPod,
  quorumMet,
  startRitual,
  advanceRitual,
  publishAggregate,
  issueRecognition,
  applyEvent,
  payloadIsSafe,
  POD_MIN_MEMBERS,
  POD_MAX_MEMBERS,
} from '../../../src/core/pods/podStateMachine.js';

const T0 = 1_000_000;

function mkPod() {
  let state = emptyPodState();
  state = formPod(state, { id: 'pod-test', covenant: 'we practice together', createdAtMs: T0 }, 'alice');
  state = joinPod(state, 'bob', T0 + 1).state;
  state = joinPod(state, 'carol', T0 + 2).state;
  return state;
}

describe('membership bounds (B1)', () => {
  it('forms with a founder and reaches quorum at 3', () => {
    const state = mkPod();
    expect(state.pod?.members.map((m) => m.playerId)).toEqual(['alice', 'bob', 'carol']);
    expect(quorumMet(state)).toBe(true);
  });

  it('rejects a ninth-plus member and accepts up to nine', () => {
    let state = mkPod();
    for (let i = 4; i <= POD_MAX_MEMBERS; i++) {
      const r = joinPod(state, `member-${i}`, T0 + i);
      expect(r.ok).toBe(true);
      state = r.state;
    }
    expect(state.pod?.members.length).toBe(POD_MAX_MEMBERS);
    const overflow = joinPod(state, 'member-overflow', T0 + 99);
    expect(overflow.ok).toBe(false);
    expect(overflow.reason).toContain('pod full');
  });

  it('join is idempotent per player', () => {
    let state = mkPod();
    const again = joinPod(state, 'bob', T0 + 50);
    expect(again.ok).toBe(true);
    expect(again.state.pod?.members.length).toBe(3);
  });

  it('quorum fails below the minimum', () => {
    const state = formPod(emptyPodState(), { id: 'p', covenant: 'c', createdAtMs: T0 }, 'solo');
    expect(quorumMet(state)).toBe(false);
    expect(POD_MIN_MEMBERS).toBe(3);
  });
});

describe('ritual lifecycle (B2)', () => {
  it('refuses to start without quorum', () => {
    const solo = formPod(emptyPodState(), { id: 'p', covenant: 'c', createdAtMs: T0 }, 'solo');
    const r = startRitual(solo, { encounterTemplateId: 'e', mode: 'mirrored', roles: { solo: 'witness' }, now: T0 });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('quorum');
  });

  it('refuses roles for non-members and blocks double-open', () => {
    const state = mkPod();
    const ghost = startRitual(state, { encounterTemplateId: 'e', mode: 'mirrored', roles: { ghost: 'witness' }, now: T0 });
    expect(ghost.ok).toBe(false);
    const opened = startRitual(state, { encounterTemplateId: 'e', mode: 'mirrored', roles: {}, now: T0 + 1 });
    expect(opened.ok).toBe(true);
    const twice = startRitual(opened.state, { encounterTemplateId: 'e2', mode: 'mirrored', roles: {}, now: T0 + 2 });
    expect(twice.ok).toBe(false);
  });

  it('advances gathering → catalyst → integration → closed, then locks', () => {
    let state = mkPod();
    state = startRitual(state, { encounterTemplateId: 'e', mode: 'mirrored', roles: {}, now: T0 + 1 }).state;
    for (const expected of ['catalyst', 'integration', 'closed']) {
      const r = advanceRitual(state);
      expect(r.ok).toBe(true);
      state = r.state;
      expect(state.ritual?.state).toBe(expected);
    }
    const after = advanceRitual(state);
    expect(after.ok).toBe(false);
  });

  it('collaborative rituals enforce role-independence at the catalyst gate', () => {
    let state = mkPod();
    state = startRitual(state, {
      encounterTemplateId: 'e', mode: 'collaborative',
      roles: { alice: 'anchor', bob: 'witness', carol: 'challenger' }, now: T0 + 1,
    }).state;
    state = advanceRitual(state).state; // → catalyst
    const premature = advanceRitual(state);
    expect(premature.ok).toBe(false);
    expect(premature.reason).toContain('role-independence');
  });

  it('mirrored rituals have no role-independence requirement', () => {
    let state = mkPod();
    state = startRitual(state, { encounterTemplateId: 'e', mode: 'mirrored', roles: {}, now: T0 + 1 }).state;
    state = advanceRitual(state).state; // → catalyst
    const r = advanceRitual(state);
    expect(r.ok).toBe(true);
  });
});

describe('recognition (B3)', () => {
  it('refuses self-recognition and ghost evidence', () => {
    const state = mkPod();
    const self = issueRecognition(state, { fromMemberId: 'bob', toMemberId: 'bob', kind: 'growth', periodId: 'p1', evidenceRef: 'system:x' }, T0);
    expect(self.ok).toBe(false);
    const ghost = issueRecognition(state, { fromMemberId: 'bob', toMemberId: 'carol', kind: 'growth', periodId: 'p1', evidenceRef: 'never-published' }, T0);
    expect(ghost.ok).toBe(false);
    expect(ghost.reason).toContain('no published aggregate');
  });

  it('accepts peer recognition backed by a published aggregate', () => {
    let state = mkPod();
    const pub = publishAggregate(state, 'carol:consistency:p1', { attempts: 12 }, T0);
    state = pub.state;
    expect(pub.ok).toBe(true);
    const rec = issueRecognition(state, { fromMemberId: 'alice', toMemberId: 'carol', kind: 'consistency', periodId: 'p1', evidenceRef: 'carol:consistency:p1' }, T0 + 1);
    expect(rec.ok).toBe(true);
    expect(rec.state.recognitions).toHaveLength(1);
    expect(rec.state.eventLog[rec.state.eventLog.length - 1]?.type).toBe('recognition');
  });

  it('rejects aggregates carrying personal psych state', () => {
    const state = mkPod();
    const bad = publishAggregate(state, 'carol:theta:p1', { thetaVector: [0.9] }, T0);
    expect(bad.ok).toBe(false);
  });
});

describe('serial application (B4)', () => {
  it('reproduces direct calls through applyEvent', () => {
    let viaEvents = emptyPodState();
    viaEvents = applyEvent(viaEvents, { type: 'form', payload: { id: 'pod-test', covenant: 'we practice together', founderId: 'alice' }, occurredAtMs: T0 }).state;
    viaEvents = applyEvent(viaEvents, { type: 'join', payload: { playerId: 'bob' }, occurredAtMs: T0 + 1 }).state;
    viaEvents = applyEvent(viaEvents, { type: 'join', payload: { playerId: 'carol' }, occurredAtMs: T0 + 2 }).state;
    expect(viaEvents.pod?.members.map((m) => m.playerId)).toEqual(['alice', 'bob', 'carol']);

    viaEvents = applyEvent(viaEvents, { type: 'publish', payload: { evidenceRef: 'carol:growth:p1', aggregate: { growthDelta: 0.1 } }, occurredAtMs: T0 + 3 }).state;
    viaEvents = applyEvent(viaEvents, { type: 'recognize', payload: { fromMemberId: 'alice', toMemberId: 'carol', kind: 'growth', periodId: 'p1', evidenceRef: 'carol:growth:p1' }, occurredAtMs: T0 + 4 }).state;
    expect(viaEvents.recognitions).toHaveLength(1);
    expect(viaEvents.eventLog.length).toBeGreaterThan(0);
  });

  it('rejects unknown event types', () => {
    const r = applyEvent(emptyPodState(), { type: 'chaos' as never, payload: {}, occurredAtMs: T0 });
    expect(r.ok).toBe(false);
  });
});

describe('payload firewall (B5)', () => {
  it('blocks personal psych state in any nesting', () => {
    expect(payloadIsSafe({ theta: [1] })).toBe(false);
    expect(payloadIsSafe({ nested: { deep: { shadowLedger: [] } } })).toBe(false);
    expect(payloadIsSafe([{ journalEntry: 'x' }])).toBe(false);
    expect(payloadIsSafe({ IdentityProfile: {} })).toBe(false); // case-insensitive
  });

  it('allows legitimate derived aggregates and ritual payloads', () => {
    expect(payloadIsSafe({ consistency: 0.8, attempts: 12 })).toBe(true);
    expect(payloadIsSafe({ encounterTemplateId: 'e', role: 'witness' })).toBe(true);
    expect(payloadIsSafe('a string')).toBe(true);
    expect(payloadIsSafe(null)).toBe(true);
  });
});

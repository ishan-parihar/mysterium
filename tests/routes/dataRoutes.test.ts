/**
 * @vitest-environment jsdom
 *
 * Behaviour tests for the four P2 data routes' view logic
 * (src/core/presentation/playerTelemetryView.ts) and the credential store.
 *
 * These are the assertions a route cannot make for itself: that an unplayed index
 * refuses to read as data, that an export states what it contains and what it
 * omits, that a draft is not a credential, and that the no-save case is refused
 * rather than zeroed. Every one of these was a way for a page to lie.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ensureLocalStorage } from '../helpers/localStorageMock.js';
import { get } from 'svelte/store';
import {
  loadInsights,
  buildExport,
  buildEventTail,
  readCredentialView,
  buildCredentialExport,
} from '../../src/core/presentation/playerTelemetryView.js';
import { InMemoryStore, type KeyValueStore } from '../../src/infra/persistence/KeyValueStore.js';
import { CognitiveIndex, type CognitiveIndexState } from '../../src/core/training/CognitiveIndex.js';
import { TrialRecordStore, type SessionRecord } from '../../src/core/braingame/TrialRecordStore.js';
import type { TrainingServices } from '../../src/core/assessments/trainingTools.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { RecordedEvent } from '../../src/core/presentation/playerTelemetryView.js';
import type { KnowledgeState } from '../../src/core/curriculum/types.js';
import {
  credentialLedger,
  loadCredentialLedger,
  draftFromEvidence,
  issueDraft,
  revoke,
  currentLedger,
  setLedgerStorage,
} from '../../src/lib/stores/credentialStore.js';
import {
  draftClaim,
  issueClaim,
  masteryEvidenceRef,
  emptyLedger,
} from '../../src/core/credential/ClaimLedger.js';

// ── fixtures ───────────────────────────────────────────────────────────

const NOW = Date.UTC(2026, 8, 29, 12, 0, 0);
const DAY = 86_400_000;
/** A real paradigm id (registry: n_back, stroop, go_no_go, reaction_time, pattern_prediction). */
const P = 'stroop';
/** Lines are Capitalised in ALL_LINES. */
const COG = 'Cognitive';

function makeTrial(overrides: Partial<{ sessionId: string; paradigmId: string; timestamp: number; trialIndex: number; correct: boolean; accuracy: number; latency: number }> = {}) {
  const t = { sessionId: 's1', paradigmId: P, timestamp: NOW - DAY, trialIndex: 0, correct: true, accuracy: 1, latency: 420, ...overrides };
  return {
    sessionId: t.sessionId,
    paradigmId: t.paradigmId,
    timestamp: t.timestamp,
    trialIndex: t.trialIndex,
    params: {},
    paramsHash: 'h1',
    correct: t.correct,
    accuracy: t.accuracy,
    latencyScore: 0.5,
    latencyNs: BigInt(t.latency) * 1_000_000n,
    adjustedLatencyMs: t.latency,
  };
}

function makeSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    sessionId: 's1',
    paradigmId: P,
    startedAt: NOW - DAY,
    trialsCompleted: 10,
    accuracy: 0.7,
    rtMedianMs: 420,
    performance: 0.72,
    ...overrides,
  };
}

/** A TrainingServices over an in-memory KV, with a controllable index. */
async function makeServices(state?: CognitiveIndexState): Promise<{ services: TrainingServices; kv: KeyValueStore; trials: TrialRecordStore }> {
  const kv = new InMemoryStore();
  const index = new CognitiveIndex();
  if (state) index.load(state);
  const trials = new TrialRecordStore(kv);
  const services: TrainingServices = {
    calibration: { get: async () => null, put: async () => {} } as unknown as TrainingServices['calibration'],
    trials,
    index,
    now: () => NOW,
    persistIndex: async () => {},
  };
  return { services, kv, trials };
}

function indexWith(scores: Partial<Record<Line, number>>): CognitiveIndexState {
  const base = new CognitiveIndex().getState();
  const skills = { ...base.skills } as Record<Line, (typeof base.skills)[Line]>;
  for (const [line, score] of Object.entries(scores)) {
    const key = line as Line;
    skills[key] = { ...skills[key]!, score: score!, baseline: 0.5, lastPlayedAt: NOW - DAY, sessionsPlayed: 3 };
  }
  return { skills };
}

beforeEach(() => {
  ensureLocalStorage();
  localStorage.clear();
});

// ── insights ───────────────────────────────────────────────────────────

describe('loadInsights — the no-play case', () => {
  it('reports hasTrainingData false for an index that was never written to', async () => {
    const { services } = await makeServices();
    const model = await loadInsights({ services });
    expect(model.hasTrainingData).toBe(false);
    // It still returns the full line set — the absence is flagged, not hidden.
    expect(model.lines.length).toBeGreaterThan(0);
  });

  it('reports hasTrainingData true once any line has moved off its starting value', async () => {
    const { services } = await makeServices(indexWith({ Cognitive: 0.71 }));
    const model = await loadInsights({ services });
    expect(model.hasTrainingData).toBe(true);
  });

  it('carries the felt-sense phrase, never a bare score, as the player-facing text', async () => {
    const { services } = await makeServices(indexWith({ Cognitive: 0.9 }));
    const model = await loadInsights({ services });
    const cognitive = model.lines.find((l) => l.line === COG)!;
    // feltSenseFor's own wording — the view's contract is to pass it through.
    expect(cognitive.feltSense).toBe('your cognitive sense feels sharp lately');
    expect(cognitive.trend).toBe('rising');
  });

  it('distinguishes "no sessions in the window" from "no sessions at all"', async () => {
    const { services, trials } = await makeServices();
    await trials.appendSession([makeTrial()], makeSession({ startedAt: NOW - 40 * DAY }));
    const model = await loadInsights({ services, days: 14 });
    expect(model.recentSessions).toHaveLength(0);
    expect(model.sessionsOutsideWindow).toBe(1);
  });

  it('drops sessions older than the window and keeps the ones inside it', async () => {
    const { services, trials } = await makeServices();
    // appendSession puts the newest first, so append old then new to control order.
    await trials.appendSession(
      [makeTrial({ sessionId: 'old', timestamp: NOW - 40 * DAY })],
      makeSession({ sessionId: 'old', startedAt: NOW - 40 * DAY }),
    );
    await trials.appendSession(
      [makeTrial({ sessionId: 'new', timestamp: NOW - 2 * DAY })],
      makeSession({ sessionId: 'new', startedAt: NOW - 2 * DAY }),
    );
    const model = await loadInsights({ services, days: 14 });
    expect(model.recentSessions.map((s) => s.sessionId)).toEqual(['new']);
  });

  it('groups sessions into ascending days, so a trend curve cannot be drawn backwards', async () => {
    const { services, trials } = await makeServices();
    for (const [id, daysAgo, accuracy] of [['a', 5, 0.6], ['b', 2, 0.4], ['c', 3, 0.8]] as const) {
      await trials.appendSession(
        [makeTrial({ sessionId: id, accuracy: accuracy })],
        makeSession({ sessionId: id, startedAt: NOW - daysAgo * DAY, accuracy }),
      );
    }
    const model = await loadInsights({ services, days: 14 });
    const days = model.trend.map((d) => d.day);
    expect(days).toEqual([...days].sort());
    expect(model.trend).toHaveLength(3);
    // Mean accuracy per day: day-5 → 0.6, day-3 → 0.8, day-2 → 0.4, in date order.
    expect(model.trend.map((d) => d.accuracy)).toEqual([0.6, 0.8, 0.4]);
  });
});

// ── export ─────────────────────────────────────────────────────────────

describe('buildExport — what the file says about itself', () => {
  it('states the actual counts, and those counts are the payload\'s', async () => {
    const { services, trials } = await makeServices();
    await trials.appendSession(
      [makeTrial({ trialIndex: 0 }), makeTrial({ trialIndex: 1 })],
      makeSession(),
    );
    const bundle = await buildExport({ services, paradigm: P });
    const payload = JSON.parse(bundle.body);
    expect(bundle.trialCount).toBe(2);
    expect(bundle.sessionCount).toBe(1);
    expect(payload.trials).toHaveLength(2);
    expect(bundle.included.join(' ')).toContain('trial records (2)');
  });

  it('carries the same per-trial fields the CLI serialises, and no more', async () => {
    const { services, trials } = await makeServices();
    await trials.appendSession([makeTrial()], makeSession());
    const bundle = await buildExport({ services, paradigm: P });
    const [first] = JSON.parse(bundle.body).trials;
    // Exactly the keys in ExportRuntime.serializeTrialForExport.
    expect(Object.keys(first).sort()).toEqual(
      ['accuracy', 'correct', 'latencyMs', 'paradigmId', 'paramsHash', 'sessionId', 'timestamp', 'trialIndex'].sort(),
    );
  });

  it('never carries the bigint latency across the boundary', async () => {
    const { services, trials } = await makeServices();
    await trials.appendSession([makeTrial()], makeSession());
    const bundle = await buildExport({ services, paradigm: P });
    // A bigint would have thrown during JSON.stringify; assert the field is the ms one.
    expect(JSON.parse(bundle.body).trials[0].latencyMs).toBe(420);
  });

  it('omits the analytics section AND says it is missing, when no curriculum progress exists', async () => {
    const { services } = await makeServices();
    const bundle = await buildExport({ services, paradigm: P, analytics: true });
    expect(JSON.parse(bundle.body).learningAnalytics).toBeNull();
    expect(bundle.missing.join(' ')).toContain('no curriculum progress');
  });

  it('includes real analytics when curriculum progress is present', async () => {
    const { services } = await makeServices();
    const bundle = await buildExport({ services, paradigm: P, analytics: true, knowledge: emptyKnowledge() });
    const analytics = JSON.parse(bundle.body).learningAnalytics;
    expect(analytics).toBeTruthy();
    expect(bundle.missing).toHaveLength(0);
  });

  it('refuses to claim analytics in a CSV, and says CSV does not carry them', async () => {
    const { services, trials } = await makeServices();
    await trials.appendSession([makeTrial()], makeSession());
    const bundle = await buildExport({ services, paradigm: P, format: 'csv', analytics: true, knowledge: emptyKnowledge() });
    expect(bundle.format).toBe('csv');
    expect(bundle.missing.join(' ')).toContain('CSV carries trial rows only');
  });

  it('applies the day window to trials, not only to sessions', async () => {
    const { services, trials } = await makeServices();
    await trials.appendSession(
      [makeTrial({ trialIndex: 0, timestamp: NOW - 40 * DAY }), makeTrial({ trialIndex: 1, timestamp: NOW - DAY })],
      makeSession(),
    );
    const bundle = await buildExport({ services, paradigm: P, days: 7 });
    expect(JSON.parse(bundle.body).trials.map((t: { timestamp: number }) => t.timestamp)).toEqual([NOW - DAY]);
  });

  it('sorts trials by timestamp, so the file is ordered rather than per-paradigm concatenated', async () => {
    const { services, trials } = await makeServices();
    await trials.appendSession(
      [makeTrial({ trialIndex: 0, timestamp: NOW }), makeTrial({ trialIndex: 1, timestamp: NOW - 5_000 })],
      makeSession(),
    );
    const bundle = await buildExport({ services, paradigm: P });
    const stamps = JSON.parse(bundle.body).trials.map((t: { timestamp: number }) => t.timestamp);
    expect(stamps).toEqual([...stamps].sort((x: number, y: number) => x - y));
  });

  it('produces an empty-but-valid file rather than failing when nothing is recorded', async () => {
    const { services } = await makeServices();
    const bundle = await buildExport({ services, paradigm: P });
    const payload = JSON.parse(bundle.body);
    expect(payload.trials).toEqual([]);
    expect(bundle.trialCount).toBe(0);
    expect(bundle.missing).toEqual([]);
  });

  it('refuses to build without services rather than silently exporting nothing', async () => {
    // A route that forgot to wire the store would otherwise render a confident,
    // empty "you exported 0 trials" — the worst possible failure here.
    await expect(buildExport({} as never)).rejects.toThrow(/requires TrainingServices/);
  });

  it('CSV escapes a comma-bearing field rather than producing a shifted column', async () => {
    const { services, trials } = await makeServices();
    await trials.appendSession([makeTrial({ sessionId: 'a,b' })], makeSession({ sessionId: 'a,b' }));
    const bundle = await buildExport({ services, paradigm: P, format: 'csv' });
    expect(bundle.body).toContain('"a,b"');
  });
});

function emptyKnowledge(): KnowledgeState {
  return {
    conceptStates: new Map(),
    subjectProgress: new Map(),
    studyHistory: [],
    learningProfile: { preferredModalities: [], totalStudyTimeMs: 0, conceptsStudied: 0, avgSessionMinutes: 0 },
  } as unknown as KnowledgeState;
}

// ── events ─────────────────────────────────────────────────────────────

describe('buildEventTail — the three kinds of empty', () => {
  const mk = (type: string, ts: number, data: Record<string, unknown> = {}): RecordedEvent => ({
    id: `${type}-${ts}`,
    type,
    timestamp: ts,
    data,
  });

  it('distinguishes "recording off" from "recording on, nothing yet"', () => {
    expect(buildEventTail([], { recording: false }).recording).toBe(false);
    expect(buildEventTail([], { recording: true }).recording).toBe(true);
    // Both are empty — the flag is the only thing that tells them apart, so it
    // must be carried, not inferred by the view from list length.
    expect(buildEventTail([], { recording: false }).events).toEqual([]);
    expect(buildEventTail([], { recording: true }).events).toEqual([]);
  });

  it('defaults recording to false, so a caller that forgets cannot claim events were captured', () => {
    expect(buildEventTail([mk('session_started', NOW)]).recording).toBe(false);
  });

  it('keeps the most recent tail and reports the pre-cut total', () => {
    // Appending order is oldest → newest, so slice(-5) is the newest 5.
    const events = Array.from({ length: 30 }, (_, i) => mk('session_started', NOW - (30 - i)));
    const model = buildEventTail(events, { tail: 5, recording: true });
    expect(model.events).toHaveLength(5);
    expect(model.total).toBe(30);
    expect(model.events[0]!.timestamp).toBe(NOW - 5);
    expect(model.events[4]!.timestamp).toBe(NOW - 1);
  });

  it('drops the OLDEST events, not the newest, when the tail is cut', () => {
    const events = [mk('session_started', 1), mk('session_started', 2), mk('session_started', 3)];
    const model = buildEventTail(events, { tail: 1, recording: true });
    // The whole point of a tail: the most recent event survives the cut.
    expect(model.events.map((e) => e.timestamp)).toEqual([3]);
  });

  it('counts kinds most-frequent first', () => {
    const model = buildEventTail(
      [mk('session_started', 1), mk('shadow_surfaced', 2), mk('shadow_surfaced', 3), mk('shadow_resolved', 4)],
      { recording: true },
    );
    expect(model.kinds[0]).toEqual({ type: 'shadow_surfaced', count: 2 });
    expect(model.kinds.map((k) => k.type).sort()).toEqual(['session_started', 'shadow_resolved', 'shadow_surfaced']);
  });

  it('has no kinds at all when there are no events, rather than one zero-count row', () => {
    expect(buildEventTail([], { recording: true }).kinds).toEqual([]);
  });
});

// ── credential ─────────────────────────────────────────────────────────

describe('readCredentialView — a draft is not a credential', () => {
  const draft = draftClaim({
    competencyDescriptor: 'Can factor a quadratic',
    domain: 'math.foundations',
    evidence: [masteryEvidenceRef('math.foundations', 'applied', NOW)],
    method: 'm',
    qualityAssurance: 'qa',
    nowMs: NOW,
  }).claim;

  it('separates issued claims from drafts by the subject, not by a flag', () => {
    const issued = issueClaim(emptyLedger(), draft, 'Ada').claim!;
    const view = readCredentialView({ claims: [issued, { ...draft, id: 'draft-1' }], revoked: [] });
    expect(view.issued.map((c) => c.id)).toEqual([issued.id]);
    expect(view.drafts.map((c) => c.id)).toEqual(['draft-1']);
  });

  it('shows an empty ledger as neither issued nor drafted', () => {
    const view = readCredentialView(emptyLedger());
    expect(view.issued).toEqual([]);
    expect(view.drafts).toEqual([]);
    expect(view.revokedIds).toEqual([]);
  });

  it('marks a revoked claim as revoked rather than dropping it from the list', () => {
    const issued = issueClaim(emptyLedger(), draft, 'Ada').claim!;
    const view = readCredentialView({ claims: [issued], revoked: [{ id: issued.id, atMs: NOW }] });
    expect(view.issued[0]!.revoked).toBe(true);
    expect(view.revokedIds).toEqual([issued.id]);
  });

  it('surfaces validation failures, so an unissuable claim cannot read as healthy', () => {
    const broken = { ...draft, id: 'broken', evidence: [] as never[] };
    const view = readCredentialView({ claims: [broken], revoked: [] });
    expect(view.drafts[0]!.failures.join(' ')).toContain('E1');
  });
});

describe('buildCredentialExport', () => {
  const draft = draftClaim({
    competencyDescriptor: 'Can factor a quadratic',
    domain: 'math.foundations',
    evidence: [masteryEvidenceRef('math.foundations', 'applied', NOW)],
    method: 'm',
    qualityAssurance: 'qa',
    nowMs: NOW,
  }).claim;

  it('refuses a portfolio when nothing is issued — never an empty portfolio', () => {
    const out = buildCredentialExport({ claims: [draft], revoked: [] }, 'Ada');
    expect(out.error).toMatch(/no issued, non-revoked claims/);
    expect(out.body).toBe('');
  });

  it('refuses a portfolio with no chosen name', () => {
    const issued = issueClaim(emptyLedger(), draft, 'Ada').claim!;
    const out = buildCredentialExport({ claims: [issued], revoked: [] }, '   ');
    expect(out.error).toMatch(/candidate name is required/);
  });

  it('excludes a withdrawn claim from the portfolio', () => {
    const issued = issueClaim(emptyLedger(), draft, 'Ada').claim!;
    const out = buildCredentialExport({ claims: [issued], revoked: [{ id: issued.id, atMs: NOW }] }, 'Ada');
    expect(out.error).toMatch(/no issued, non-revoked claims/);
  });

  it('projects a single issued claim to a W3C-VC-shaped document', () => {
    const issued = issueClaim(emptyLedger(), draft, 'Ada').claim!;
    const out = buildCredentialExport({ claims: [issued], revoked: [] }, 'Ada', issued.id);
    expect(out.error).toBe('');
    const vc = JSON.parse(out.body);
    expect(vc.type).toEqual(['VerifiableCredential', 'CompetencyCredential']);
    expect(vc.credentialSubject.name).toBe('Ada');
    expect(out.fileName).toBe(`${issued.id}.json`);
  });

  it('refuses to export a DRAFT as a VC, naming it as unissued', () => {
    // `toVerifiableCredential` alone would emit a credential naming nobody: it
    // validates fields, and a draft passes with subject ''. The view is the layer
    // that knows issuance is a separate act, so it refuses here.
    const out = buildCredentialExport({ claims: [draft], revoked: [] }, 'Ada', draft.id);
    expect(out.body).toBe('');
    expect(out.error).toContain('is not issued');
  });

  it('refuses to export a revoked claim even though the claim itself is valid', () => {
    const issued = issueClaim(emptyLedger(), draft, 'Ada').claim!;
    const out = buildCredentialExport({ claims: [issued], revoked: [{ id: issued.id, atMs: NOW }] }, 'Ada', issued.id);
    expect(out.body).toBe('');
    expect(out.error).toContain('revoked');
  });

  it('exports a portfolio containing exactly the issued claims', () => {
    const a = issueClaim(emptyLedger(), draft, 'Ada').claim!;
    const b = issueClaim(emptyLedger(), { ...draft, id: 'second', competencyDescriptor: 'Can integrate' }, 'Ada').claim!;
    const out = buildCredentialExport({ claims: [a, b, { ...draft, id: 'pending' }], revoked: [] }, 'Ada');
    const portfolio = JSON.parse(out.body);
    expect(portfolio.format).toBe('mysterium-rpl-portfolio');
    expect(portfolio.claims.map((c: { claimId: string }) => c.claimId)).toEqual([a.id, b.id]);
  });
});

// ── credential store ───────────────────────────────────────────────────

describe('credentialStore — persistence and refusal', () => {
  const draftInput = {
    competencyDescriptor: 'Can factor a quadratic',
    domain: 'math.foundations',
    evidence: [masteryEvidenceRef('math.foundations', 'applied', NOW)],
    method: 'm',
    qualityAssurance: 'qa',
    nowMs: NOW,
  };

  // The vitest `$app/environment` stub is permanently `browser: false`, so a store
  // that guards its read path on `browser` can only ever be observed returning the
  // empty case. The storage seam is what makes the real path testable.
  let mem = new Map<string, string>();
  beforeEach(() => {
    mem = new Map();
    credentialLedger.set(emptyLedger());
    setLedgerStorage({
      get: (k) => mem.get(k) ?? null,
      set: (k, v) => { mem.set(k, v); },
    });
  });

  it('starts from an empty ledger before hydration', () => {
    loadCredentialLedger();
    expect(get(credentialLedger)).toEqual(emptyLedger());
  });

  it('round-trips a drafted claim through storage', () => {
    const out = draftFromEvidence(draftInput);
    expect(out.claim).toBeDefined();
    // A fresh read from storage must see it — the store is not in-memory only.
    credentialLedger.set(emptyLedger());
    loadCredentialLedger();
    expect(get(credentialLedger).claims).toHaveLength(1);
  });

  it('drops a hand-edited claim that does not match the kernel shape rather than rendering it', () => {
    mem.set('credentials:v1', JSON.stringify({ claims: [{ id: 'x' }], revoked: [] }));
    loadCredentialLedger();
    expect(get(credentialLedger).claims).toEqual([]);
  });

  it('falls back to an empty ledger on corrupt JSON', () => {
    mem.set('credentials:v1', '{not json');
    loadCredentialLedger();
    expect(get(credentialLedger)).toEqual(emptyLedger());
  });

  it('refuses to issue without a name, and stores nothing', () => {
    const out = draftFromEvidence(draftInput);
    const issued = issueDraft(out.claim!.id, '   ');
    expect(issued.claim).toBeUndefined();
    expect(issued.failures.join(' ')).toContain('subject name is required');
    expect(get(credentialLedger).claims[0]!.subject).toBe('');
  });

  it('refuses to issue a claim that does not exist', () => {
    const out = issueDraft('no-such-claim', 'Ada');
    expect(out.failures.join(' ')).toContain('not found');
  });

  it('refuses to issue the same claim twice', () => {
    const out = draftFromEvidence(draftInput);
    issueDraft(out.claim!.id, 'Ada');
    const again = issueDraft(out.claim!.id, 'Someone Else');
    expect(again.claim).toBeUndefined();
    expect(again.failures.join(' ')).toContain('already issued');
    // One claim in the ledger, issued — not the draft AND its issued twin.
    const claims = currentLedger().claims;
    expect(claims).toHaveLength(1);
    expect(claims[0]!.subject).toBe('Ada');
  });

  it('tombstones a withdrawn claim and keeps it in the list', () => {
    const out = draftFromEvidence(draftInput);
    issueDraft(out.claim!.id, 'Ada');
    revoke(out.claim!.id, NOW);
    const view = readCredentialView(currentLedger());
    expect(view.issued).toHaveLength(1);
    expect(view.issued[0]!.revoked).toBe(true);
    expect(view.revokedIds).toEqual([out.claim!.id]);
  });

  it('is a no-op on withdrawing an unknown id', () => {
    draftFromEvidence(draftInput);
    const before = currentLedger();
    revoke('nope');
    expect(currentLedger()).toEqual(before);
  });
});

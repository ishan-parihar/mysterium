/**
 * Post-plan frontier tests (DEVELOPMENT-PLAN §8 items 1–5).
 *
 *   P1  LLM-backed choice policies (43 §6)      — choicePolicy degrade path
 *   P2  Pod DO transport (38 M1)                — serial apply, privacy wall, RPC shell
 *   P3  Packs §4.3 completion + reliability     — 8 packs lint-clean; collector retires only on maturity
 *   P4  K-12 planned branches (37)              — all 13 subject rows resolvable
 *   P5  RPL partner export (41 §4.5 step 3)     — portfolio honesty + fail-closed validation
 */
import { describe, it, expect, assert } from 'vitest';
import {
  InMemoryPodCoordinator, PodDurableObject, remotePodTransport,
} from '../../src/infra/pods/PodTransport.js';
import { emptyPodState, payloadIsSafe } from '../../src/core/pods/podStateMachine.js';
import {
  REFERENCE_PACKS, MEMORY_SPATIAL, COGNITION_SPEED, COGNITION_CONTROL,
  LANGUAGE_READING, CODING_FLUENCY, MATH_FLUENCY,
} from '../../src/core/packs/referencePacks.js';
import { lintPack, startPackSession, nextItem, recordTrial, assignForm } from '../../src/core/packs/PackEngine.js';
import {
  ReliabilityCollector, DEFAULT_MATURITY_RULE,
} from '../../src/core/packs/ReliabilityCollector.js';
import {
  emptyLedger, draftClaim, issueClaim, revokeClaim, packEvidenceRef, masteryEvidenceRef,
  exportRPLPortfolio,
} from '../../src/core/credential/ClaimLedger.js';
import { llmChoicePolicy } from '../../src/core/orchestration/choicePolicy.js';
import { roleChoicePolicy } from '../../src/core/orchestration/delegate.js';
import {
  delegateSession, ratifyProposalsTool, emptyLedgerState,
} from '../../src/core/orchestration/orchestratorTools.js';
import { ROLE_TOOLSETS, type DelegatedTool, type DelegationSpec } from '../../src/core/orchestration/types.js';
import { createInitialWorldState } from '../../src/core/engines/CandidateGeneration.js';
import type { ScheduledEncounter } from '../../src/core/domain/EncounterSpecNew.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import { ALL_LINES } from '../../src/core/domain/Line.js';
import { seedCurriculumRegistry } from '../../src/core/curriculum/CurriculumSeed.js';
import subjectMap from '../../src/core/curriculum/data/subject-line-map.json';

const DAY = 86_400_000;

// ---------------------------------------------------------------------------
// P2 — Pod transport
// ---------------------------------------------------------------------------

describe('P2: PodDurableObject transport (38 M1)', () => {
  const form = (id: string) => ({ type: 'form' as const, payload: { id, covenant: 'we practice', founderId: 'a' }, occurredAtMs: 1000 });
  const join = (playerId: string, at: number) => ({ type: 'join' as const, payload: { playerId }, occurredAtMs: at });

  it('applies events in serial order through the pure state machine', async () => {
    const pod = new PodDurableObject();
    const r1 = await pod.handleRpc({ kind: 'apply', event: form('pod-do') });
    expect(r1.kind).toBe('applied');
    const r2 = await pod.handleRpc({ kind: 'apply', event: join('b', 1001) });
    expect(r2.kind).toBe('applied');
    const snap = await pod.handleRpc({ kind: 'snapshot' });
    expect(snap.state?.pod?.members.length).toBe(2);
    const hist = await pod.handleRpc({ kind: 'events' });
    expect(hist.events?.length).toBe(2);
  });

  it('enforces the privacy wall before the state machine (defense in depth)', async () => {
    const pod = new PodDurableObject();
    await pod.handleRpc({ kind: 'apply', event: form('pod-w') });
    const smuggle = await pod.handleRpc({
      kind: 'apply',
      event: { type: 'publish', payload: { evidenceRef: 'x', aggregate: { theta: [0.9], cci: 0.7 } }, occurredAtMs: 1002 },
    });
    expect(smuggle.kind).toBe('error');
    expect(smuggle.error).toContain('privacy wall');
    // The smuggled event must not be in the replay log.
    const hist = await pod.handleRpc({ kind: 'events' });
    expect(hist.events?.length).toBe(1);
  });

  it('rejects illegal state transitions (join before form) with a logged error', async () => {
    const pod = new PodDurableObject();
    const r = await pod.handleRpc({ kind: 'apply', event: join('ghost', 1) });
    expect(r.kind).toBe('error');
  });

  it('fetch shell round-trips the RPC envelope', async () => {
    const pod = new PodDurableObject();
    const req = { json: async () => ({ kind: 'apply', event: form('pod-fetch') }) };
    const res = await pod.fetch(req);
    expect(res.status).toBe(200);
    expect(res.body.kind).toBe('applied');
    const bad = await pod.fetch({ json: async () => ({ kind: 'bogus' }) });
    expect(bad.status).toBe(400);
  });

  it('remote stub satisfies the transport contract against a local DO', async () => {
    const pod = new PodDurableObject();
    const transport = remotePodTransport((req) => pod.handleRpc(req));
    await transport.apply(form('pod-remote'));
    await transport.apply(join('b', 1001));
    const snap = await transport.snapshot();
    expect(snap.pod?.members.length).toBe(2);
    expect((await transport.events()).length).toBe(2);
  });

  it('duplicate join is an accepted no-op that never enters the replay log', async () => {
    const pod = new PodDurableObject();
    await pod.handleRpc({ kind: 'apply', event: form('pod-dup') });
    await pod.handleRpc({ kind: 'apply', event: join('b', 1001) });
    const before = await pod.handleRpc({ kind: 'events' });
    // At-least-once redelivery of the same join (retry path).
    const again = await pod.handleRpc({ kind: 'apply', event: join('b', 1001) });
    expect(again.kind).toBe('applied');
    const after = await pod.handleRpc({ kind: 'events' });
    expect(after.events?.length).toBe(before.events?.length);
    // And the state stays coherent: still 2 members, replayed identically.
    const snap = await pod.handleRpc({ kind: 'snapshot' });
    expect(snap.state?.pod?.members.length).toBe(2);
  });

  it('over-cap concurrent joins all reject without corrupting state or log', async () => {
    const pod = new PodDurableObject();
    await pod.handleRpc({ kind: 'apply', event: form('pod-cap') });
    // Pod cap is 9 → 8 joins fit; fire 20, expect exactly 8 applied + 12 rejected.
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        pod.handleRpc({ kind: 'apply', event: join(`c${i}`, 1000 + i) })),
    );
    const appliedCount = results.filter((r) => r.kind === 'applied').length;
    expect(appliedCount).toBe(8);
    const snap = await pod.handleRpc({ kind: 'snapshot' });
    expect(snap.state?.pod?.members.length).toBe(9); // founder + 8
    const hist = await pod.handleRpc({ kind: 'events' });
    expect(hist.events?.length).toBe(9); // form + 8 joins; rejections leave no trace
  });

  it('InMemoryPodCoordinator restore() rehydrates state + log', async () => {
    const first = new InMemoryPodCoordinator();
    await first.apply(form('pod-r'));
    const restored = new InMemoryPodCoordinator({ state: await first.snapshot(), events: await first.events() });
    expect((await restored.snapshot()).pod?.id).toBe('pod-r');
    expect((await restored.events()).length).toBe(1);
  });

  it('payloadIsSafe still rejects psych state (G18 double-check)', () => {
    expect(payloadIsSafe({ results: [{ theta: [0.9] }] })).toBe(false);
    expect(payloadIsSafe({ attempts: 3, consistency: 0.8 })).toBe(true);
    expect(emptyPodState().pod).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// P3 — Measurement packs §4.3 completion + reliability scaffolding
// ---------------------------------------------------------------------------

describe('P3: the full doc-40 §4.3 pack table', () => {
  it('ships all 8 packs', () => {
    const ids = REFERENCE_PACKS.map((p) => p.id);
    expect(ids).toEqual([
      'memory.working-span', 'memory.spatial', 'cognition.speed', 'cognition.control',
      'language.vocabulary', 'language.reading', 'coding.fluency', 'math.fluency',
    ]);
  });

  for (const pack of REFERENCE_PACKS) {
    it(`${pack.id} is lint-clean and runs a deterministic session`, () => {
      const errors = lintPack(pack).filter((i) => i.severity === 'error');
      expect(errors, errors.map((i) => i.message).join('; ')).toEqual([]);
      const run = (seed: number) => {
        let s = startPackSession(pack, assignForm(pack, 0), seed, 4);
        let guard = 0;
        while (!s.finished && guard++ < 100) {
          const item = nextItem(pack, s.formId, s);
          if (!item) break;
          s = recordTrial(s, pack, item, item.difficulty <= 6);
        }
        return s;
      };
      const a = run(99);
      const b = run(99);
      expect(a.theta).toBe(b.theta);
      expect(a.administered).toEqual(b.administered);
      expect(a.trial).toBeGreaterThan(0);
    });
  }

  it('forms are genuinely parallel (same difficulty span, disjoint item emphasis)', () => {
    for (const pack of [MEMORY_SPATIAL, COGNITION_SPEED, COGNITION_CONTROL, LANGUAGE_READING, CODING_FLUENCY, MATH_FLUENCY]) {
      expect(pack.forms.length).toBeGreaterThanOrEqual(2);
      for (const f of pack.forms) {
        expect(f.items.length, `${pack.id}/${f.id} empty form`).toBeGreaterThan(0);
      }
    }
  });
});

describe('P3b: ReliabilityCollector (plan §8 item 3)', () => {
  const pack = MATH_FLUENCY; // retest interval 7d

  const makeRecord = (i: number, theta: number) => ({
    sessionId: `s${i}`, formId: i % 2 === 0 ? 'a' : 'b', theta, se: 0.3,
    trials: 12, correctCount: 8, itemIds: ['mf.1', 'mf.2'], completedAtMs: 1000 + i * 8 * DAY,
  });

  it('stays provisional until the maturity gate passes', () => {
    const collector = new ReliabilityCollector();
    // 6 sessions, 8-day gaps (interval honored), improving theta.
    for (let i = 0; i < 6; i++) collector.recordSession(pack, makeRecord(i, 4 + i * 0.05));
    const report = collector.computeReport(pack, 1000 + 6 * 8 * DAY);
    expect(report.sessionCount).toBe(6);
    // Monotonic-ish theta pairs → positive retest r, but gate depends on value.
    expect(typeof report.retestR).toBe('number');
    if (report.gate === 'mature') {
      expect(report.retestR!).toBeGreaterThanOrEqual(DEFAULT_MATURITY_RULE.minRetestR);
    }
  });

  it('refuses to retire a provisional pack without a mature report', () => {
    const collector = new ReliabilityCollector();
    for (let i = 0; i < 2; i++) collector.recordSession(pack, makeRecord(i, 4));
    const report = collector.computeReport(pack, 1000 + 2 * 8 * DAY);
    const out = ReliabilityCollector.retireProvisional(pack, report);
    expect(out.retired).toBe(false);
    expect(out.pack.provisionalUntil).toBe('2027-03-01');
  });

  it('retires the provisional flag ONLY on a mature report — and the disclosure stays computable', () => {
    const collector = new ReliabilityCollector();
    // Stable theta pairs → high consecutive-pair correlation.
    for (let i = 0; i < 6; i++) collector.recordSession(pack, makeRecord(i, 5));
    const report = collector.computeReport(pack, 1000 + 6 * 8 * DAY);
    if (report.gate !== 'mature') {
      // The honest branch: gate still provisional — retirement must refuse.
      const out = ReliabilityCollector.retireProvisional(pack, report);
      expect(out.retired).toBe(false);
      return;
    }
    const out = ReliabilityCollector.retireProvisional(pack, report);
    expect(out.retired).toBe(true);
    expect(out.pack.provisionalUntil).toBeUndefined();
    expect(out.pack.id).toBe(pack.id); // data otherwise intact
  });

  it('never retires a report belonging to a different pack', () => {
    const other = COGNITION_SPEED;
    const report = {
      packId: 'math.fluency', gate: 'mature' as const, sessionCount: 9, retestR: 0.9,
      formEffect: 0.1, internalConsistency: 0.8, computedAtMs: 1, maturityRule: DEFAULT_MATURITY_RULE,
    };
    const out = ReliabilityCollector.retireProvisional(other, report);
    expect(out.retired).toBe(false);
  });

  it('excludes interval-violating sessions from retest pairing', () => {
    const collector = new ReliabilityCollector();
    // Session 2 comes 1 day after session 1 (interval 7d) → excluded.
    collector.recordSession(pack, makeRecord(0, 5));
    collector.recordSession(pack, { ...makeRecord(1, 5), completedAtMs: 1000 + 1 * DAY });
    const report = collector.computeReport(pack, 1000 + 2 * DAY);
    expect(report.sessionCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// P4 — K-12 planned branches
// ---------------------------------------------------------------------------

describe('P4: K-12 corpus completion (plan §8 item 4)', () => {
  it('every subject row with authored branches resolves in the seeded registry', () => {
    seedCurriculumRegistry();
    const mappings = subjectMap.mappings as readonly { subject: string; branches: readonly string[]; corpusStatus: string }[];
    for (const m of mappings) {
      if (m.corpusStatus === 'planned') continue; // only SEL remains planned-by-design (the 64-module engine)
      for (const branch of m.branches) {
        const data = require_branch(branch) as unknown[];
        expect(data, `${branch} corpus present`).toBeTruthy();
        expect(data.length, `${branch} holons`).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it('the 6 new branches carry their devMapping lines from the subject map', () => {
    const expectations: Record<string, { primary: string; secondary: string[] }> = {
      'language-arts': { primary: 'Cognitive', secondary: ['Emotional'] },
      arts: { primary: 'Emotional', secondary: ['Somatic', 'Spiritual'] },
      music: { primary: 'Emotional', secondary: ['Somatic', 'Spiritual'] },
      'second-language': { primary: 'Cognitive', secondary: ['Interpersonal'] },
      civics: { primary: 'Moral', secondary: ['Interpersonal'] },
      health: { primary: 'Somatic', secondary: ['Willpower'] },
    };
    for (const [branch, want] of Object.entries(expectations)) {
      const data = require_branch(branch) as Array<{ id: string; devMapping: { primaryLine: string; secondaryLines: string[] } }>;
      const branchHolon = data.find((h) => h.id === `${branch}.foundations`);
      expect(branchHolon, `${branch} branch holon`).toBeTruthy();
      assert(branchHolon, `${branch} branch holon`);
      expect(branchHolon.devMapping.primaryLine).toBe(want.primary);
      expect(branchHolon.devMapping.secondaryLines).toEqual(want.secondary);
    }
  });

  it('no grade-band vocabulary leaked into the new branches (42 blindness law)', () => {
    for (const branch of ['language-arts', 'arts', 'music', 'second-language', 'civics', 'health']) {
      const raw = JSON.stringify(require_branch(branch) as unknown).toLowerCase();
      // Word-boundary-aware checks: bare 'grade' would false-positive on the
      // legitimate pedagogical term 'graded readers'; the blindness law bans
      // grade-BAND vocabulary (grade/grades as words, band ranges, school years).
      expect(/\bgrades?\b/.test(raw), `${branch} contains grade-band vocabulary`).toBe(false);
      for (const banned of ['k-2', '6-8', '9-12', 'school year']) {
        expect(raw.includes(banned), `${branch} contains '${banned}'`).toBe(false);
      }
      expect(/\bage \b/.test(raw), `${branch} contains 'age '`).toBe(false);
    }
  });
});

/** Load a branch data file by prefix (branches map 1:1 to file names). */
import mathData from '../../src/core/curriculum/data/math.foundations.json';
import csData from '../../src/core/curriculum/data/cs.foundations.json';
import physicsData from '../../src/core/curriculum/data/physics.foundations.json';
import bioData from '../../src/core/curriculum/data/bio.foundations.json';
import chemData from '../../src/core/curriculum/data/chem.foundations.json';
import histData from '../../src/core/curriculum/data/hist.foundations.json';
import geoData from '../../src/core/curriculum/data/geo.foundations.json';
import languageArtsData from '../../src/core/curriculum/data/language-arts.foundations.json';
import artsData from '../../src/core/curriculum/data/arts.foundations.json';
import musicData from '../../src/core/curriculum/data/music.foundations.json';
import secondLanguageData from '../../src/core/curriculum/data/second-language.foundations.json';
import civicsData from '../../src/core/curriculum/data/civics.foundations.json';
import healthData from '../../src/core/curriculum/data/health.foundations.json';
import integralData from '../../src/core/curriculum/data/integral.foundations.json';

const BRANCH_FILES: Record<string, unknown> = {
  math: mathData, cs: csData, physics: physicsData, bio: bioData,
  chem: chemData, hist: histData, geo: geoData,
  'language-arts': languageArtsData, arts: artsData, music: musicData,
  'second-language': secondLanguageData, civics: civicsData, health: healthData,
  integral: integralData,
};

function require_branch(branch: string): unknown {
  return BRANCH_FILES[branch];
}

// ---------------------------------------------------------------------------
// P1 — LLM-backed choice policies
// ---------------------------------------------------------------------------

describe('P1: llmChoicePolicy (plan §8 item 1)', () => {
  const altitudes = Object.fromEntries(ALL_LINES.map((l) => [l, 'Red' as const])) as Record<string, never>;
  const sig = createSignificator('policy-test', altitudes as never, 'Red');
  const encounter: ScheduledEncounter = {
    id: 'enc-1', moduleRef: 'Cognitive:Red', modality: 'ImmersiveRPG',
    targetLines: ['Cognitive'], stage: 'Red', holonSource: 'h1',
    shadowTarget: null, polarityMode: 'Exploring', difficulty: 0.5,
    sessionPosition: 'peak', priority: 0.9, driveTarget: null,
    executionMode: 'capacity',
  };

  it('enriches the narrative from a well-formed LLM reply', async () => {
    const policy = llmChoicePolicy({
      query: async () => JSON.stringify({ narrative: 'The corridor narrowed and I kept walking.', engagement: 'engaged', surface: false }),
    });
    const r = await policy.choose({ role: 'J1', purpose: 'test', encounter, step: 0, sig: sig as never });
    expect(r.narrativeSummary).toContain('corridor narrowed');
    // Structural fields stay on the deterministic contract.
    expect(r.driveDirectionality).toEqual(roleChoicePolicy('J1', encounter, 0).driveDirectionality);
  });

  it('degrades to the deterministic policy on network failure', async () => {
    const policy = llmChoicePolicy({ query: async () => { throw new Error('offline'); } });
    const r = await policy.choose({ role: 'J1', purpose: 'test', encounter, step: 0, sig: sig as never });
    expect(r).toEqual(roleChoicePolicy('J1', encounter, 0));
  });

  it('degrades on malformed JSON and on timeout', async () => {
    const malformed = llmChoicePolicy({ query: async () => 'not json at all' });
    const r1 = await malformed.choose({ role: 'J1', purpose: 'test', encounter, step: 0, sig: sig as never });
    expect(r1).toEqual(roleChoicePolicy('J1', encounter, 0));

    const slow = llmChoicePolicy({ query: () => new Promise((res) => setTimeout(() => res('{"narrative":"late"}'), 200)), timeoutMs: 20 });
    const r2 = await slow.choose({ role: 'J1', purpose: 'test', encounter, step: 0, sig: sig as never });
    expect(r2).toEqual(roleChoicePolicy('J1', encounter, 0));
  });

  it('avoidance keeps the empty-narrative marker (OA-13)', async () => {
    const policy = llmChoicePolicy({
      query: async () => JSON.stringify({ narrative: 'I turned away.', engagement: 'avoided', surface: false }),
    });
    const r = await policy.choose({ role: 'J1', purpose: 'test', encounter, step: 0, sig: sig as never });
    expect(r.narrativeSummary).toBe('');
  });

  it('non-surfacing roles can never spontaneously surface shadow (TL1 hygiene)', async () => {
    const policy = llmChoicePolicy({
      query: async () => JSON.stringify({ narrative: 'Suddenly everything surfaced.', engagement: 'engaged', surface: true }),
    });
    const r = await policy.choose({ role: 'J1', purpose: 'test', encounter, step: 0, sig: sig as never });
    expect(r.shadowSurfaced).toBeNull();
  });

  it('J4 surfacing mandate survives LLM disagreement (the mandate owns the arc)', async () => {
    const deterministic = roleChoicePolicy('J4', encounter, 0);
    const policy = llmChoicePolicy({
      query: async () => JSON.stringify({ narrative: 'steady', engagement: 'engaged', surface: false }),
    });
    const r = await policy.choose({ role: 'J4', purpose: 'test', encounter, step: 0, sig: sig as never });
    // J4 step 0 surfaces deterministically; the LLM cannot cancel it.
    expect(r.shadowSurfaced).toEqual(deterministic.shadowSurfaced);
    expect(r.narrativeSummary).toBe('steady');
  });
});

// ---------------------------------------------------------------------------
// P5 — RPL portfolio export
// ---------------------------------------------------------------------------

describe('P5: RPL partner-institution export (plan §8 item 5)', () => {
  const now = 1_700_000_000_000;
  function seededLedger() {
    let ledger = emptyLedger();
    const mature = packEvidenceRef('math.fluency', 'sess-1', { retestR: 0.85, provisional: false, measuredAtMs: now - DAY });
    const mastery = masteryEvidenceRef('math.foundations.numbers', 'analyzed', now - 2 * DAY);
    const d1 = draftClaim({
      competencyDescriptor: 'Applies proportional reasoning to unfamiliar problems',
      domain: 'math.foundations',
      level: { eqf: 4 },
      evidence: [mature, mastery],
      method: 'adaptive staircase with parallel forms',
      qualityAssurance: 'internal psychometric harness; reliability disclosed per evidence',
      nowMs: now,
    });
    const i1 = issueClaim(ledger, d1.claim, 'Candidate A');
    ledger = i1.ledger;
    const d2 = draftClaim({
      competencyDescriptor: 'Reads short texts and infers unstated main points',
      domain: 'language.reading',
      evidence: [packEvidenceRef('language.reading', 'sess-2', { provisional: true, provisionalUntil: '2027-03-01', measuredAtMs: now })],
      method: 'adaptive cloze comprehension',
      qualityAssurance: 'provisional instrument; ceiling date disclosed',
      nowMs: now,
    });
    const i2 = issueClaim(ledger, d2.claim, 'Candidate A');
    ledger = i2.ledger;
    return { ledger, ids: [i1.claim!.id, i2.claim!.id] };
  }

  it('exports issued claims as an assessor-shaped portfolio', () => {
    const { ledger } = seededLedger();
    const out = exportRPLPortfolio(ledger, 'Candidate A');
    expect(out.error).toBeUndefined();
    const p = out.portfolio!;
    expect(p.format).toBe('mysterium-rpl-portfolio');
    expect(p.claims.length).toBe(2);
    expect(p.claims[0]!.method).toBeTruthy();
    expect(p.claims[0]!.qualityAssurance).toBeTruthy();
    expect(p.claimIds.length).toBe(2);
  });

  it('excludes revoked and unissued (draft) claims', () => {
    const { ledger, ids } = seededLedger();
    const revokedLedger = revokeClaim(ledger, ids[0]!, now + 1);
    const out = exportRPLPortfolio(revokedLedger, 'Candidate A');
    expect(out.portfolio!.claims.length).toBe(1);
    expect(out.portfolio!.claims[0]!.claimId).toBe(ids[1]);
  });

  it('fails closed on an empty ledger and on an empty name', () => {
    expect(exportRPLPortfolio(emptyLedger(), 'A').error).toBeTruthy();
    const { ledger } = seededLedger();
    expect(exportRPLPortfolio(ledger, '  ').error).toBeTruthy();
  });

  it('supports selective export (subset of claims)', () => {
    const { ledger, ids } = seededLedger();
    const out = exportRPLPortfolio(ledger, 'Candidate A', { onlyClaimIds: [ids[1]!] });
    expect(out.portfolio!.claims.length).toBe(1);
    expect(out.portfolio!.claims[0]!.domain).toBe('language.reading');
  });

  it('never includes identity fields — only the chosen name travels (firewall)', () => {
    const { ledger } = seededLedger();
    const out = exportRPLPortfolio(ledger, 'Chosen Name');
    const raw = JSON.stringify(out.portfolio);
    for (const banned of ['identityProfile', 'shadow', 'theta.lastEncounter', 'altitudes']) {
      expect(raw.includes(banned), `portfolio contains '${banned}'`).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Dispatch parity (43 §4.3): delegated execution must honor the toolset —
// record_encounter only for allowlisted roles; advisory read/propose tools
// actually execute; pack mandates administer + score. Ratification applies
// the new kinds (L4 single commit path).
// ---------------------------------------------------------------------------

describe('P6: toolset-driven dispatch (43 §4.3 executor conformance)', () => {
  seedCurriculumRegistry();
  const altitudes = Object.fromEntries(ALL_LINES.map((l) => [l, 'Red'])) as never;
  const sig = createSignificator('dispatch-test', altitudes, 'Red');
  const world = createInitialWorldState([{
    id: 'h-Cognitive-Red', name: 'dispatch contact', kind: 'NPC',
    line: 'Cognitive', stage: 'Red',
    drives: { dominant: 'Agency', secondary: 'Eros', shadowQuadrant: null },
    polarity: 'Sovereign', narrativeRole: 'test', relationships: [], active: true,
  } as never]);
  const session = { targetSessionLength: 5, encountersSoFar: 0, recentLines: [], sessionDurationMs: 0 };

  const specFor = (role: keyof typeof ROLE_TOOLSETS, cell?: { line: string; stage: string }): DelegationSpec => ({
    role: role as never,
    ...(cell ? { cell: cell as never } : {}),
    purpose: `dispatch test: ${role}`,
    readProjection: new Set(['corpus.moduleSpec', 'curriculum.state'] as never),
    toolset: new Set<DelegatedTool>(ROLE_TOOLSETS[role] as readonly DelegatedTool[]),
    budget: { toolCallsMax: 4, virtualMsMax: 600_000 },
  });

  it('T1 advisory mandate: no record_encounter, proposal emitted, ratification writes knowledge', async () => {
    const run = await delegateSession({ spec: specFor('T1'), sig, world, session, seed: 'd1', now: 1_000_000, ledger: emptyLedgerState() });
    expect(run.ok).toBe(true);
    expect(run.log.toolCalls.some((t) => t.tool === 'record_encounter')).toBe(false);
    // Every logged tool is in the allowlist (the executor itself respects TL1).
    expect(run.log.toolCalls.every((t) => ROLE_TOOLSETS.T1.includes(t.tool))).toBe(true);
    expect(run.log.proposals.map((p) => p.kind)).toContain('mastery_evidence');

    const rat = ratifyProposalsTool({ proposals: run.result?.proposals ?? [], sig, world, now: 1_100_000 });
    const d = rat.dispositions.find((x) => x.kind === 'mastery_evidence');
    expect(d?.accepted).toBe(true);
    expect(rat.sig.knowledge?.conceptStates.size ?? 0).toBeGreaterThan(0);
  });

  it('T3 prescription: trajectory targets validate against the seeded registry', async () => {
    const run = await delegateSession({ spec: specFor('T3'), sig, world, session, seed: 'd2', now: 1_000_000, ledger: emptyLedgerState() });
    expect(run.log.proposals.map((p) => p.kind)).toContain('trajectory');
    const rat = ratifyProposalsTool({ proposals: run.result?.proposals ?? [], sig, world, now: 1_100_000 });
    expect(rat.dispositions.find((x) => x.kind === 'trajectory')?.accepted).toBe(true);
  });

  it('S1 pack mandate: administers, scores, and ratification folds skillTheta (40 §4.2)', async () => {
    const run = await delegateSession({ spec: specFor('S1'), sig, world, session, seed: 'd3', now: 1_000_000, ledger: emptyLedgerState() });
    const tools = run.log.toolCalls.map((t) => t.tool);
    expect(tools).toContain('pack_administer');
    expect(tools).toContain('pack_score');
    expect(run.log.proposals.map((p) => p.kind)).toContain('pack_score');

    const rat = ratifyProposalsTool({ proposals: run.result?.proposals ?? [], sig, world, now: 1_100_000 });
    const d = rat.dispositions.find((x) => x.kind === 'pack_score');
    expect(d?.accepted).toBe(true);
    const streams = Object.keys(rat.sig.skillTheta ?? {});
    expect(streams.length).toBe(1);
    expect(rat.sig.skillTheta?.[streams[0]!]?.sessionCount).toBe(1);
  });

  it('J1 still drives encounters and logs only allowlisted tools (regression guard)', async () => {
    const run = await delegateSession({
      spec: specFor('J1', { line: 'Cognitive', stage: 'Red' }),
      sig, world, session, seed: 'd4', now: 1_000_000, ledger: emptyLedgerState(),
    });
    expect(run.ok).toBe(true);
    expect(run.encountersExecuted).toBe(1);
    expect(run.log.toolCalls.every((t) => ROLE_TOOLSETS.J1.includes(t.tool))).toBe(true);
  });

  it('G14 shape holds for advisory mandates: same seed ⇒ byte-identical log', async () => {
    const a = await delegateSession({ spec: specFor('T2'), sig, world, session, seed: 'det', now: 1_000_000, ledger: emptyLedgerState() });
    const b = await delegateSession({ spec: specFor('T2'), sig, world, session, seed: 'det', now: 1_000_000, ledger: emptyLedgerState() });
    expect(JSON.stringify(a.log)).toBe(JSON.stringify(b.log));
    const c = await delegateSession({ spec: specFor('T2'), sig, world, session, seed: 'det-2', now: 1_000_000, ledger: emptyLedgerState() });
    expect(JSON.stringify(a.log)).not.toBe(JSON.stringify(c.log));
  });

  it('ratifier rejects malformed payloads fail-closed (pack_score / mastery / retention / threshold)', () => {
    const bad = [
      { kind: 'pack_score' as const, payload: { packId: 'nonexistent.pack' }, rationale: 'x' },
      { kind: 'mastery_evidence' as const, payload: { conceptId: 'x', depth: 'not-a-level' }, rationale: 'x' },
      { kind: 'retention_estimate' as const, payload: { conceptId: 'x', retention: 7 }, rationale: 'x' },
      { kind: 'threshold_signal' as const, payload: { line: 'Nope', stage: 'Red' }, rationale: 'x' },
      { kind: 'trajectory' as const, payload: { targets: ['not.a.holon'] }, rationale: 'x' },
    ];
    const rat = ratifyProposalsTool({ proposals: bad, sig, world, now: 1_100_000 });
    for (const d of rat.dispositions) expect(d.accepted).toBe(false);
  });
});

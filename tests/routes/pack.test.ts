// @vitest-environment jsdom
/**
 * `/pack` — the measurement surface, and the honesty properties it must not lose.
 *
 * The pack engine is live and **G45** locks the seam (the registry seeds on the boot path, so a
 * production `getPack` read is a HIT). What the route adds over the CLI is the STANDING: a pack page
 * that rendered a claim draft beside a green badge would be claiming an authority the artefact does
 * not have. So the tests are about the distinctions the page is built to keep:
 *
 *   PK-1 the registry read is real — every registered pack appears, and a pack id that is not
 *        registered returns null rather than a synthesised pack. (A fallback list would make a
 *        broken seed look like a working page.)
 *   PK-2 **a pack with no sessions is provisional, not scored zero.** `computeReport` on an empty
 *        collector returns `gate: 'provisional'`, `retestR: undefined`, and the view reports how many
 *        more sessions the pack's OWN maturity rule needs. The `sessionsNeeded` is read from the
 *        report's `maturityRule`, not a re-declared threshold, so a page cannot drift from the engine.
 *   PK-3 **the retest interval is enforced by the collector, and the view follows it.** A session
 *        recorded inside the pack's interval is stored but NOT eligible, so the eligible count the
 *        report shows is smaller than the number of raw rows on disk. Rendering the raw count would
 *        overstate the evidence.
 *   PK-4 claim standings are four distinct states, and they are derived from the ledger, not from a
 *        flag on the view: draft (no subject), issued (subject set, not revoked), revoked (tombstoned),
 *        and INVALID (`validateClaim` non-empty). The invalid case is the load-bearing one: a draft
 *        that fails E1–E4 must never render as a working credential.
 *   PK-5 a malformed session row is dropped rather than coerced — a row with a non-numeric theta
 *        would otherwise reach the collector's statistics as `undefined`.
 *   PK-6 the responder disclosure is a real read of the stored provenance, not a hardcoded badge.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  PACK_STANDING,
  isMature,
  loadPackSessions,
  packView,
  packViews,
  savePackSessions,
  claimStanding,
  type StoredSession,
} from '../../src/lib/packs/packEvidenceView.js';
import { allPacks, getPack } from '../../src/core/packs/PackEngine.js';
import { seedPackRegistry } from '../../src/core/packs/referencePacks.js';
import { draftClaim, emptyLedger, issueClaim, packEvidenceRef, revokeClaim } from '../../src/core/credential/ClaimLedger.js';
import { ensureLocalStorage } from '../helpers/localStorageMock.js';

const NOW = 1_790_000_000_000;
const LEDGER_KEY = 'credentials:v1';

function session(packId: string, over: Partial<StoredSession> = {}): StoredSession {
  return {
    packId,
    sessionId: `s-${packId}-${over.completedAtMs ?? 0}`,
    formId: 'A',
    theta: 4,
    se: 0.4,
    trials: 6,
    correctCount: 4,
    itemIds: ['i1', 'i2'],
    completedAtMs: NOW,
    provenance: 'deterministic-simulated',
    ...over,
  };
}

describe('/pack — instrument surface and claim standing', () => {
  beforeEach(() => {
    ensureLocalStorage();
    localStorage.clear();
  });

  it('PK-1: the view is built from the real registry, and an unregistered id is null', () => {
    seedPackRegistry();
    const registered = allPacks();
    expect(registered.length).toBeGreaterThan(0);
    const views = packViews(NOW);
    expect(views.map((v) => v.id)).toEqual(registered.map((p) => p.id));
    // A route that fell back to a hardcoded pack list would answer for an unregistered id.
    expect(packView('not.a.real.pack', NOW)).toBeNull();
    const first = registered[0]!;
    expect(packView(first.id, NOW)?.id).toBe(first.id);
  });

  it('PK-2: a pack with no sessions is provisional with no correlation, not a score of zero', () => {
    const views = packViews(NOW);
    for (const v of views) {
      expect(v.recordedSessions).toBe(0);
      expect(v.report.gate).toBe('provisional');
      expect(isMature(v.report)).toBe(false);
      // The correlation is ABSENT, not 0 — a rendered 0.00 would read as "no relationship found",
      // which is a finding rather than the truth that there are no pairs yet.
      expect(v.report.retestR).toBeUndefined();
      // The gap is computed from the report's own rule, so the page cannot disagree with the engine.
      expect(v.sessionsNeeded).toBe(v.report.maturityRule.minSessions - v.report.sessionCount);
      expect(v.sessionsNeeded).toBeGreaterThan(0);
    }
  });

  it('PK-2: the standing statement says draft-not-certification and names the responder', () => {
    const text = PACK_STANDING.toLowerCase();
    expect(text).toContain('claim draft');
    expect(text).toContain('not a certification');
    expect(text).toContain('deterministic simulation');
  });

  it('PK-3: the retest interval gates eligibility, so eligible count can trail stored rows', () => {
    const pack = allPacks()[0]!;
    const interval = pack.retestPolicy.intervalMs;
    expect(interval).toBeGreaterThan(0);
    // Two sessions far apart plus one inside the interval of the previous: the third is stored but
    // ineligible, so the report's count is 2 while three rows sit on disk.
    savePackSessions([
      session(pack.id, { sessionId: 'a', completedAtMs: NOW - 100 * interval }),
      session(pack.id, { sessionId: 'b', completedAtMs: NOW - 50 * interval }),
      session(pack.id, { sessionId: 'c', completedAtMs: NOW - 50 * interval + 1 }),
    ]);
    expect(loadPackSessions()).toHaveLength(3);
    const v = packView(pack.id, NOW)!;
    expect(v.recordedSessions).toBe(3);
    // Reporting 3 here would overstate the evidence: `computeReport` only counts windowed pairs.
    expect(v.report.sessionCount).toBe(2);
  });

  it('PK-4: draft, issued and revoked are three distinct standings read from the ledger', () => {
    const pack = allPacks()[0]!;
    const evidence = packEvidenceRef(pack.id, 'sess-1', { provisional: true, provisionalUntil: '2027-01-01', measuredAtMs: NOW });
    const { claim: draft, failures } = draftClaim({
      competencyDescriptor: `Exercised ${pack.construct} (deterministic drill responder)`,
      domain: pack.id,
      evidence: [evidence],
      method: 'measurement-pack administration; responder provenance: deterministic-simulated',
      qualityAssurance: 'mysterium internal assessment machinery',
      nowMs: NOW,
    });
    expect(failures).toEqual([]);

    let ledger = emptyLedger();
    // A draft carries no subject: nobody has consented to be named by it.
    expect(claimStanding(ledger, draft)).toEqual({ kind: 'draft', subject: null });

    ledger = { ...ledger, claims: [draft] };
    const issued = issueClaim(ledger, draft, 'a name of my choosing');
    expect(issued.failures).toEqual([]);
    const issuedClaim = issued.claim!;
    expect(claimStanding(issued.ledger, issuedClaim)).toEqual({ kind: 'issued', subject: 'a name of my choosing' });

    const revoked = revokeClaim(issued.ledger, issuedClaim.id, NOW + 1);
    expect(claimStanding(revoked, issuedClaim).kind).toBe('revoked');
  });

  it('PK-4: a claim that fails its own evidence rules is INVALID, never rendered as working', () => {
    const ledger = emptyLedger();
    // E2: pack evidence with neither a retest correlation nor a provisional flag, and no ceiling
    // date. This is the failure the page exists to surface — a draft that cannot be issued.
    const broken = {
      id: 'claim-broken',
      subject: '',
      issuedAtMs: 0,
      competencyDescriptor: 'x',
      domain: 'd',
      evidence: [{ type: 'pack' as const, ref: 'pack:cognition.x:sess-1' }],
      method: 'm',
      qualityAssurance: 'q',
    };
    const standing = claimStanding(ledger, broken);
    expect(standing.kind).toBe('invalid');
    if (standing.kind === 'invalid') {
      expect(standing.reasons.join(' ')).toContain('E2');
    }
  });

  it('PK-4: a claim citing a protected ref is invalid under E3', () => {
    const broken = {
      id: 'claim-e3',
      subject: '',
      issuedAtMs: 0,
      competencyDescriptor: 'x',
      domain: 'd',
      evidence: [{ type: 'pack' as const, ref: 'journal:entry-3' }],
      method: 'm',
      qualityAssurance: 'q',
    };
    const standing = claimStanding(emptyLedger(), broken);
    expect(standing.kind).toBe('invalid');
    if (standing.kind === 'invalid') {
      expect(standing.reasons.join(' ')).toContain('E3');
    }
  });

  it('PK-5: a malformed session row is dropped, not coerced into the statistics', () => {
    savePackSessions([
      session('memory.span', { sessionId: 'good' }),
      { ...session('memory.span'), theta: 'four' } as unknown as StoredSession,
      { ...session('memory.span'), itemIds: 'not-an-array' } as unknown as StoredSession,
    ]);
    // Only the well-formed row survives; the other two would reach computePsychometrics as
    // `undefined` and poison every mean downstream.
    expect(loadPackSessions().map((s) => s.sessionId)).toEqual(['good']);
  });

  it('PK-5: unparseable storage is an empty list, not a thrown page', () => {
    localStorage.setItem('pack-sessions:v1', '{not json');
    expect(loadPackSessions()).toEqual([]);
    localStorage.setItem('pack-sessions:v1', '{"not":"an array"}');
    expect(loadPackSessions()).toEqual([]);
  });

  it('PK-6: the responder disclosure is read from stored provenance, not hardcoded', () => {
    const pack = allPacks()[0]!;
    expect(packView(pack.id, NOW)!.responderIsSimulated).toBe(false);
    savePackSessions([session(pack.id)]);
    expect(packView(pack.id, NOW)!.responderIsSimulated).toBe(true);
  });

  it('PK-1: a pack\'s forms and items are the instrument\'s own, not a summary', () => {
    const pack = allPacks()[0]!;
    const v = packView(pack.id, NOW)!;
    expect(v.formIds).toEqual(getPack(pack.id)!.forms.map((f) => f.id));
    expect(v.itemCount).toBe(getPack(pack.id)!.items.length);
  });

  it('a ledger written by the claim surface is what the view reads', () => {
    const pack = allPacks()[0]!;
    const evidence = packEvidenceRef(pack.id, 'sess-2', { provisional: true, provisionalUntil: '2027-01-01', measuredAtMs: NOW });
    const { claim } = draftClaim({
      competencyDescriptor: `Exercised ${pack.construct}`,
      domain: pack.id,
      evidence: [evidence],
      method: 'measurement-pack administration; responder: deterministic-simulated',
      qualityAssurance: 'internal machinery',
      nowMs: NOW,
    });
    localStorage.setItem(LEDGER_KEY, JSON.stringify({ claims: [claim], revoked: [] }));
    const v = packView(pack.id, NOW)!;
    expect(v.claims).toHaveLength(1);
    expect(v.claims[0]?.standing.kind).toBe('draft');
    expect(v.claims[0]?.ref).toBe(`pack:${pack.id}:sess-2`);
  });
});

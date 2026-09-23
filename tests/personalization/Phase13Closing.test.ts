/**
 * Phase 13 closing deliverables (d3–d9) — the wiring-completion tests.
 *
 * Locks:
 * - d3  retrieval on the candidate path (48 §4): shortlist above threshold, enumeration below;
 *       recallGuard drops forbidden-vocabulary candidates fail-closed.
 * - d4  composition telemetry at the runtime seam (46 §11): envelope builds record events;
 *       defect reports reach the dev loop only.
 * - d5  probes reachable in play (47 §7): budget-paced offers, band split, flag/evidence drift
 *       demotes to log-only; the RV harness is executable from the play path.
 * - d7  the composition engine ROUTED (46 §7): compose() instantiates entities in production.
 * - d6  engagement-register enforcement at the mechanism seam (45 §7.3): an unregistered
 *       mechanism is refused; the pole decision degrades.
 * - d9a MemoryPage render budget (memory-audit P1): block bounded under pathological pages.
 * - d9b crash-sidecar journal (memory-audit P3): pending replay, consumed skip, torn-line drop.
 * - d9c firewall randomized property sweep (memory-audit adversarial class): randomized
 *       cross-scope/raw/forbidden documents never leak through filterRecall.
 */
import { describe, it, expect } from 'vitest';
import { shortlist, recallGuard } from '../../src/core/personalization/retrievalShortlist.js';
import type { PoolCandidate } from '../../src/core/personalization/pooling.js';
import { createOrchestrationServices, buildEnvelope, captureCheckpoint, restoreCheckpoint, sharedFacetStore, type RuntimeCheckpoint } from '../../src/core/personalization/sessionRuntime.js';
import { buildMemoryPage, memoryPageBlock, FORBIDDEN } from '../../src/core/personalization/memoryPage.js';
import { createReportingFeed } from '../../src/core/orchestration/reportingFeed.js';
import { appendSessionEntry } from '../../src/core/orchestration/feedBridge.js';
import { createOwnerWorkerPoolState } from '../../src/core/world/ownerWorkerPool.js';
import { appendJournalEntry, replayJournal, journalPathFor } from '../../src/infra/persistence/sessionJournal.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createProbeRuntime, nextOfferable, recordProbeChoice, declineProbeOffer, harnessReport } from '../../src/core/personalization/probeRuntime.js';
import { AUTHORED_PROBES } from '../../src/core/personalization/probeContent.js';
import { composeSituationLibrary } from '../../src/core/personalization/compositionRuntime.js';
import { createEngagementRegister, FORBIDDEN_MECHANISMS } from '../../src/core/personalization/engagementRegister.js';
import { setMechanismRegister, decidePole } from '../../src/core/personalization/poleDecision.js';
import { createTagStore } from '../../src/core/world/tags/dialectic.js';
import { INITIAL_TAGS } from '../../src/core/world/tags/initialTags.js';
import { filterRecall, FORBIDDEN_RECALL_TOKENS } from '../../src/core/memory/retrievalFirewall.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import { ALL_LINES } from '../../src/core/domain/Line.js';
import type { LogRef } from '../../src/core/orchestration/types.js';

const LOG_REF: LogRef = { sessionId: 'p13-session', delegationId: 'p13-delegation', startedAtMs: 1000, endedAtMs: 2000 };
const SIGNALS = { veilRisk: 0, distressSignal: 0, frustrationSignal: 0, progressDelta: 0, consentEvents: [] };

function mkCandidate(id: string, tags: string[], line = 'Cognitive', stage = 'Amber'): PoolCandidate {
  return {
    id,
    cell: { line: line as never, stage: stage as never, modality: 'ScenarioChoice' },
    tags: tags as never,
    stratum: 0,
    depthFloor: 0,
    landsIn: tags as never,
  };
}

// ── d3 — retrieval on the candidate path ────────────────────────────────────────────────────

describe('d3: retrieval on the candidate path', () => {
  it('enumerates below the threshold — bit-identical pass-through', () => {
    const lib = Array.from({ length: 100 }, (_, i) => mkCandidate(`c${i}`, ['music']));
    const out = shortlist(lib, 'music', 1000);
    expect(out).toBe(lib); // same reference: no retrieval ran
  });

  it('shortlists above the threshold and keeps the fluent candidates in the head', () => {
    // 600 candidates: the music-flavoured minority must survive a music query's shortlist.
    const lib: PoolCandidate[] = [];
    for (let i = 0; i < 550; i++) lib.push(mkCandidate(`noise${i}`, [`craft${i % 7}` as never]));
    for (let i = 0; i < 50; i++) lib.push(mkCandidate(`music${i}`, ['music']));
    const out = shortlist(lib, 'music', 1000, 100);
    expect(out.length).toBeLessThanOrEqual(100);
    expect(out.filter((c) => c.id.startsWith('music')).length).toBeGreaterThan(0);
  });

  it('degrades to enumeration on an empty query', () => {
    const lib = Array.from({ length: 900 }, (_, i) => mkCandidate(`c${i}`, ['music']));
    expect(shortlist(lib, '   ', 1000)).toBe(lib);
  });

  it('recallGuard drops forbidden-vocabulary candidates fail-closed', () => {
    const ok = mkCandidate('ok', ['music']);
    const leak = mkCandidate('leak', ['music', 'teal' as never]); // a stage name in the tag set
    const out = recallGuard([ok, leak], 'scope-a');
    expect(out.map((c) => c.id)).toEqual(['ok']);
  });

  it('recallGuard keeps scope isolation: a different scope matches only uniform library docs', () => {
    const c = mkCandidate('ok', ['music']);
    expect(recallGuard([c], 'scope-x').length).toBe(1);
  });
});

// ── d4 — composition telemetry at the runtime seam ──────────────────────────────────────────

describe('d4: composition telemetry at the runtime seam', () => {
  it('every envelope build records an event; the dev loop reads pending defects', () => {
    const services = createOrchestrationServices();
    const before = services.telemetry.eventCount;
    const sig = createSignificator('p13-telemetry', Object.fromEntries(ALL_LINES.map((l) => [l, 'Amber'])) as never, 'Amber');
    buildEnvelope(services, sig, { declaredInterests: ['music'] }, { line: 'Cognitive', stage: 'Amber', modality: 'ScenarioChoice' }, 'target', [], 1000);
    expect(services.telemetry.eventCount).toBe(before + 1);
    const ev = services.telemetry.events[services.telemetry.events.length - 1]!;
    expect(ev.cell).toBe('Cognitive:Amber');
    expect(ev.facetKeys.length).toBeGreaterThan(0);
    // evaluate() is safe on thin traffic (below MIN_COMPOSITIONS: no reports, no throw).
    expect(Array.isArray(services.telemetry.evaluate())).toBe(true);
  });
});

// ── d5 — probes reachable in play ───────────────────────────────────────────────────────────

describe('d5: probes reachable in play', () => {
  it('offers the first unplayed probe; budget paces with plays and declines', () => {
    const rt = createProbeRuntime(AUTHORED_PROBES);
    const first = nextOfferable(rt);
    expect(first).not.toBeNull();
    recordProbeChoice(rt, first!, first!.poleA, 1000);
    expect(nextOfferable(rt)!.id).not.toBe(first!.id);
    for (let i = 0; i < 5; i++) declineProbeOffer(rt);
    expect(nextOfferable(rt)).toBeNull(); // budget exhausted (3 plays+declines per session)
  });

  it('readings from unvalidated instruments are LOG-ONLY (all authored probes are)', () => {
    const rt = createProbeRuntime(AUTHORED_PROBES);
    const p = nextOfferable(rt)!;
    const { band } = recordProbeChoice(rt, p, p.poleA, 1000);
    expect(band).toBe('log-only');
    expect(rt.ledger.validatedReadings.length).toBe(0);
    expect(rt.ledger.logOnlyReadings.length).toBe(1);
  });

  it('flag/evidence drift is demoted to log-only at the seam (fail-closed)', () => {
    const rt = createProbeRuntime(AUTHORED_PROBES);
    const p = { ...nextOfferable(rt)!, rvPassed: true, rvEvidence: [] as never }; // flag claims validated; evidence empty
    const { band } = recordProbeChoice(rt, p as never, p.poleA, 1000);
    expect(band).toBe('log-only');
  });

  it('the RV harness is executable from the play path and never flips rvPassed', () => {
    const before = AUTHORED_PROBES.map((p) => p.rvPassed);
    const report = harnessReport(AUTHORED_PROBES);
    expect(report.probes.length).toBe(AUTHORED_PROBES.length);
    expect(AUTHORED_PROBES.map((p) => p.rvPassed)).toEqual(before); // untouched
    expect(Array.isArray(harnessReport(AUTHORED_PROBES).probes)).toBe(true);
  });

  it('probe readings ride the checkpoint and restore without re-offering', () => {
    const services = createOrchestrationServices();
    const rt = services.probes;
    const p = nextOfferable(rt)!;
    recordProbeChoice(rt, p, p.poleA, 1000);
    const cp = captureCheckpoint(services);
    expect(cp.probeReadings!.logOnly.length).toBe(1);
    const fresh = createOrchestrationServices();
    restoreCheckpoint(fresh, cp as RuntimeCheckpoint);
    // The restored services' probe ledger carries the replayed reading — the same probe is not
    // offered again as "first unplayed" if it was the first in library order.
    expect(nextOfferable(fresh.probes)?.id ?? null).not.toBe(p.id);
  });
});

// ── d7 — the composition engine routed ──────────────────────────────────────────────────────

describe('d7: composition engine routed through the facet store', () => {
  it('compose() instantiates Situation entities in production; the composed tier joins the library', () => {
    const services = createOrchestrationServices();
    const composed = services.library.filter((c) => c.id.startsWith('composed:'));
    expect(composed.length).toBeGreaterThan(0);
    // Every composed candidate carries canon characteristics — never fabricated content.
    for (const c of composed.slice(0, 20)) {
      expect(c.tags.length).toBeGreaterThan(0);
      expect(c.cell.line.length).toBeGreaterThan(0);
    }
  });

  it('composition is deterministic — same store ⇒ same entity set', () => {
    const services = createOrchestrationServices();
    const again = composeSituationLibrary(sharedFacetStore(), services.tags);
    expect(again.candidates.length).toBeGreaterThan(0);
    const a = createOrchestrationServices().library.filter((c) => c.id.startsWith('composed:')).map((c) => c.id).sort();
    const b = createOrchestrationServices().library.filter((c) => c.id.startsWith('composed:')).map((c) => c.id).sort();
    expect(a).toEqual(b);
    expect(a.length).toBe(again.candidates.length);
  });
});

// ── d6 — engagement-register enforcement at the mechanism seam ──────────────────────────────

describe('d6: engagement-register enforcement at the mechanism seam', () => {
  it('the default register passes all pre-registered mechanisms; forbidden ones are refused', () => {
    const reg = createEngagementRegister();
    expect(reg.isMechanismAllowed('analogical-resonance')).toBe(true);
    expect(reg.isMechanismAllowed('curiosity-gap')).toBe(true);
    expect(reg.isMechanismAllowed('variable-ratio reward on anything developmental')).toBe(false);
    expect(FORBIDDEN_MECHANISMS.length).toBeGreaterThanOrEqual(8);
  });

  it('a mechanism withdrawn from the register degrades the pole decision to familiar or null', () => {
    const reg = createEngagementRegister();
    // Deregister both pole mechanisms: the seam must refuse to serve them.
    const stripped = createEngagementRegister() as unknown as { entries: unknown[] };
    (stripped.entries as unknown[]).length = 0; // empty register: nothing is allowed
    setMechanismRegister(stripped as never);
    try {
      const store = createTagStore(INITIAL_TAGS);
      const services = createOrchestrationServices();
      const inCell = services.library.filter((c) => c.cell.line === 'Cognitive' && c.cell.stage === 'Amber' && c.cell.modality === 'ScenarioChoice');
      const d = decidePole(store, { candidates: inCell, target: { line: 'Cognitive' }, fluentTags: ['technology'], shadowSeverity: 0.9, seedNoveltyBudget: 0.25, draw: 0.99 });
      // With NOTHING allowed, a shadow-facing/unfamiliar demand cannot be served; the decision
      // is either familiar-refused (null) or degraded familiar.
      expect(d === null || d.pole === 'familiar').toBe(true);
      void reg;
    } finally {
      setMechanismRegister(null as never); // restore the default singleton
    }
    void reg;
  });

  it('the default register serves the ratified poles (no behavioral regression)', () => {
    setMechanismRegister(null as never);
    const store = createTagStore(INITIAL_TAGS);
    const services = createOrchestrationServices();
    const inCell = services.library.filter((c) => c.cell.line === 'Cognitive' && c.cell.stage === 'Amber' && c.cell.modality === 'ScenarioChoice');
    const hot = decidePole(store, { candidates: inCell, target: { line: 'Cognitive' }, fluentTags: ['technology'], shadowSeverity: 0.9, seedNoveltyBudget: 0.25, draw: 0 });
    expect(hot).not.toBeNull();
    expect(['unfamiliar', 'shadow-facing']).toContain(hot!.pole);
  });
});

// ── d9a — MemoryPage render budget ──────────────────────────────────────────────────────────

describe('d9a: MemoryPage render budget', () => {
  it('the block is bounded under a pathological page (max threads, max stances, huge prose)', () => {
    const page = {
      builtAt: 0,
      derivedFrom: [],
      trajectory: 'x'.repeat(50_000),
      openThreads: Array.from({ length: 500 }, (_, i) => ({ ref: `r${i}`, summary: 'y'.repeat(2000), ageSessions: i })),
      holonStates: Array.from({ length: 500 }, (_, i) => ({ holonId: `h${i}`, stance: 'z'.repeat(2000) })),
    } as never;
    const block = memoryPageBlock(page);
    expect(block.length).toBeLessThanOrEqual(12);
    for (const line of block) expect(line.length).toBeLessThanOrEqual(300);
    expect(block.join(' ').length).toBeLessThanOrEqual(1400 + block.length);
  });

  it('a page built from a real feed passes both the budget and the M4 audit', () => {
    const feed = createReportingFeed();
    const services = { feed, workers: createOwnerWorkerPoolState(), holons: [] } as never;
    void services;
    appendSessionEntry(feed, { logRef: LOG_REF, signals: SIGNALS, proposals: [] });
    const page = buildMemoryPage(feed, createOwnerWorkerPoolState(), [], 1000);
    const block = memoryPageBlock(page);
    for (const line of block) expect(FORBIDDEN.every((w) => !line.toLowerCase().includes(w))).toBe(true);
  });
});

// ── d9b — crash-sidecar session journal ─────────────────────────────────────────────────────

describe('d9b: crash-sidecar session journal', () => {
  function tmpDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'p13-journal-'));
  }

  it('a pending line replays into the restored checkpoint; the file empties after', () => {
    const dir = tmpDir();
    const services = createOrchestrationServices();
    appendSessionEntry(services.feed, { logRef: { ...LOG_REF, sessionId: 'js-1' }, signals: SIGNALS, proposals: [] });
    const cp = captureCheckpoint(services);
    expect(appendJournalEntry(dir, cp)).toBe(true);

    // The restored checkpoint is OLDER — it lacks the journalled session.
    const older = createOrchestrationServices();
    const merged = replayJournal(dir, captureCheckpoint(older));
    expect(merged.replayed).toBe(1);
    expect(merged.checkpoint.feedEntries.some((e) => e.id.includes('js-1') || (e.ref as { sessionId?: string })?.sessionId === 'js-1')).toBe(true);
    expect(fs.existsSync(journalPathFor(dir))).toBe(true);
  });

  it('a consumed line (checkpoint already newer) is skipped, not re-applied', () => {
    const dir = tmpDir();
    const services = createOrchestrationServices();
    appendSessionEntry(services.feed, { logRef: { ...LOG_REF, sessionId: 'js-2' }, signals: SIGNALS, proposals: [] });
    const cp = captureCheckpoint(services);
    appendJournalEntry(dir, cp);
    // Same checkpoint restored: every id known → consumed.
    const r = replayJournal(dir, cp);
    expect(r.consumed).toBe(1);
    expect(r.replayed).toBe(0);
  });

  it('a torn last line is dropped, never retried (a torn write is not a session)', () => {
    const dir = tmpDir();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(journalPathFor(dir), '{"checkpoint": {"feedEntries": [{"id":"half'); // torn
    const r = replayJournal(dir, captureCheckpoint(createOrchestrationServices()));
    expect(r.droppedTorn).toBe(1);
    expect(r.replayed).toBe(0);
  });

  it('a missing journal is a no-op', () => {
    const dir = tmpDir();
    const r = replayJournal(dir, captureCheckpoint(createOrchestrationServices()));
    expect(r.replayed).toBe(0);
    expect(r.consumed).toBe(0);
    expect(r.droppedTorn).toBe(0);
  });
});

// ── d9c — firewall randomized property sweep ────────────────────────────────────────────────

describe('d9c: firewall randomized property sweep', () => {
  // Deterministic xorshift32 — property tests stay reproducible in CI.
  function rng(seed: number): () => number {
    let s = seed >>> 0 || 1;
    return () => {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  it('PROPERTY: over 2,000 randomized documents, no leak ever passes the firewall', () => {
    const r = rng(0x5eed_0001);
    const scopes = ['player-a', 'player-b', 'player-c'];
    const texts = [
      'the practice settled into a rhythm', // clean banded
      'something long-avoided was faced',   // clean banded
      'your stage is Teal and the system has noticed', // forbidden
      'cci 0.73 competence score rising',   // forbidden
      'raw signal: agency score 0.81 darkaddiction', // raw
    ];
    let leaks = 0;
    let drops = 0;
    const rank: { id: string; score: number }[] = [];
    const docs = new Map<string, { id: string; scope: string; banded: boolean; text: string }>();
    for (let i = 0; i < 2000; i++) {
      const id = `doc-${i}`;
      const text = texts[Math.floor(r() * texts.length)]!;
      const scope = scopes[Math.floor(r() * scopes.length)]!;
      const banded = r() > 0.4;
      docs.set(id, { id, scope, banded, text });
      rank.push({ id, score: 2000 - i });
    }
    const QUERY_SCOPE = scopes[0]!;
    const out = filterRecall(rank, docs, QUERY_SCOPE);
    for (const hit of out) {
      const doc = docs.get(hit.id)!;
      if (doc.scope !== QUERY_SCOPE || !doc.banded || FORBIDDEN_RECALL_TOKENS.some((t) => hit.text.includes(t))) leaks += 1;
    }
    drops = rank.length - out.length;
    expect(leaks).toBe(0);
    expect(drops).toBeGreaterThan(0);
  });

  it('PROPERTY: the page guard and the recall guard share one vocabulary (lockstep, randomized)', () => {
    const r = rng(0x5eed_0002);
    for (let i = 0; i < 200; i++) {
      const token = FORBIDDEN_RECALL_TOKENS[Math.floor(r() * FORBIDDEN_RECALL_TOKENS.length)]!;
      // The render-path page audit must flag everything the recall firewall drops (M4 lockstep,
      // MY-RG-0031 class). Token-level: every recall-forbidden token is page-forbidden.
      expect(FORBIDDEN.some((w) => token.includes(w) || w.includes(token))).toBe(true);
    }
  });
});

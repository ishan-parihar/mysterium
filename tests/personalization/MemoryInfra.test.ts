/**
 * Memory-infrastructure module tests — plan Phase 12 (foundations/48 §3–§5).
 * The kernel gates (G28–G31) assert the persistence/firewall laws end-to-end; these tests lock
 * the module-level invariants each component must hold on its own:
 *   - MemoryPage (48 §3): M1 deterministic, M2 bounded, M3 provenance, M4 banded, M5 view-not-store;
 *   - LocalRetriever (48 §4): deterministic BM25 + recency + graph, RRF fusion, degradation floor;
 *   - retrievalFirewall (48 §5): R1 banded-only, R3 Veil-filtered, R4 scope-isolated, pin enforcement.
 */
import { describe, it, expect } from 'vitest';
import {
  buildMemoryPage, memoryPageBlock, auditMemoryPage,
  MAX_OPEN_THREADS, MAX_HOLON_STATES, MAX_TRAJECTORY_CHARS,
} from '../../src/core/personalization/memoryPage.js';
import {
  createOrchestrationServices, sessionEnd,
  type SessionEndInput,
} from '../../src/core/personalization/sessionRuntime.js';
import {
  localRetrieve, rrfFuse, tokenize,
  type Retrievable, type RetrievalQuery,
} from '../../src/core/memory/LocalRetriever.js';
import {
  filterRecall, isBandedText,
  createEmbeddingProvider, semanticRank, fuseRanks, EMBEDDING_MODEL_PIN,
  type Recallable,
} from '../../src/core/memory/retrievalFirewall.js';

// ---------------------------------------------------------------------------
// Fixtures (mirroring the G28 gate's proven shapes)
// ---------------------------------------------------------------------------

function holons(withDirtyName = false) {
  return [
    {
      id: 'h1', name: withDirtyName ? 'Amber Warden' : 'Market Steward',
      kind: 'NPC', line: 'Cognitive', stage: 'Red',
      drives: { dominant: 'Agency', secondary: 'Eros', shadowQuadrant: null },
      polarity: 'Sovereign', narrativeRole: 'benchmark', relationships: [], active: true,
    } as never,
  ];
}

function consequenceRecord(holonId: string) {
  return {
    encounterId: 'enc', timestamp: 5,
    polarityTrace: {
      energeticDirection: 'Radiative',
      driveDirectionality: { Agency: 'HealthyBalanced', Communion: 'HealthyBalanced', Eros: 'HealthyBalanced', Agape: 'HealthyBalanced' },
    } as never,
    shadowSurfaced: null, shadowResolved: null,
    holonDeltas: [{ holonId, field: 'relationshipStrength', oldValue: 0.5, newValue: 0.6 }],
    altitudeShift: null, driveShift: null,
    narrativeSummary: 'The contact tested the player.',
  };
}

function sessionEndInput(overrides: Partial<SessionEndInput> = {}): SessionEndInput {
  return {
    logRef: { sessionId: 's1', delegationId: 'fg', startedAtMs: 0, endedAtMs: 10 },
    signals: { veilRisk: 0, distressSignal: 0, frustrationSignal: 0, progressDelta: 1, consentEvents: [] },
    proposals: [],
    touchedHolonIds: ['h1'],
    history: [consequenceRecord('h1')],
    now: 20,
    dialecticPair: ['craft', 'riddle'] as const,
    polarityDirection: 'sto',
    ...overrides,
  };
}

/** Run one real session end so the feed/workers hold committed state, then build the page. */
function buildPage(opts: { withDirtyName?: boolean; sessionId?: string; proposals?: readonly never[] } = {}) {
  const hs = holons(opts.withDirtyName);
  const s = createOrchestrationServices(hs);
  sessionEnd(s, sessionEndInput({
    proposals: opts.proposals ?? [],
    ...(opts.sessionId ? { logRef: { sessionId: opts.sessionId, delegationId: 'fg', startedAtMs: 0, endedAtMs: 10 } } : {}),
  }));
  const page = buildMemoryPage(s.feed, s.workers, hs, 30);
  return { page, services: s, holons: hs };
}

// ---------------------------------------------------------------------------
// MemoryPage (48 §3)
// ---------------------------------------------------------------------------

describe('MemoryPage (48 §3)', () => {
  it('M1 deterministic: the same committed state builds a byte-identical page', () => {
    const a = buildPage();
    const b = buildPage();
    expect(JSON.stringify(a.page)).toBe(JSON.stringify(b.page));
  });

  it('M2 bounded: open threads never exceed MAX_OPEN_THREADS; stances never exceed MAX_HOLON_STATES', () => {
    // Ten sessions, each carrying a threshold_signal → ten candidate threads, capped at 8.
    const hs = holons();
    const s = createOrchestrationServices(hs);
    for (let i = 0; i < 10; i++) {
      sessionEnd(s, sessionEndInput({
        logRef: { sessionId: `s${i}`, delegationId: 'fg', startedAtMs: i, endedAtMs: i + 5 },
        proposals: [{ kind: 'threshold_signal', payload: { note: `n${i}` }, rationale: 'test' }] as never,
        now: i + 10,
      }));
    }
    const page = buildMemoryPage(s.feed, s.workers, hs, 100);
    expect(page.openThreads.length).toBe(MAX_OPEN_THREADS);
    expect(page.holonStates.length).toBeLessThanOrEqual(MAX_HOLON_STATES);
    expect(page.trajectory.length).toBeLessThanOrEqual(MAX_TRAJECTORY_CHARS);
  });

  it('M3 provenance: every open thread cites an entry the page was derived from; audit is clean', () => {
    const { page } = buildPage({ proposals: [{ kind: 'threshold_signal', payload: {}, rationale: 't' }] as never });
    for (const t of page.openThreads) {
      expect(page.derivedFrom).toContain(t.ref);
    }
    expect(auditMemoryPage(page)).toEqual([]);
  });

  it('M4 banded: a stance carrying forbidden vocabulary is flagged by the audit (fail-closed)', () => {
    const { page } = buildPage({ withDirtyName: true });
    const violations = auditMemoryPage(page);
    expect(violations.some((v) => v.includes('M4 violation'))).toBe(true);
  });

  it('M5 view-not-store: building the page does not mutate the feed or the worker pool', () => {
    const a = buildPage();
    const feedBefore = JSON.stringify(a.services.feed.entries);
    const workersBefore = JSON.stringify(a.services.workers);
    buildMemoryPage(a.services.feed, a.services.workers, a.holons, 99);
    expect(JSON.stringify(a.services.feed.entries)).toBe(feedBefore);
    expect(JSON.stringify(a.services.workers)).toBe(workersBefore);
  });

  it('empty history renders an empty [CONTINUITY] block (45 §5 degradation law)', () => {
    const hs = holons();
    const s = createOrchestrationServices(hs);
    const page = buildMemoryPage(s.feed, s.workers, hs, 10);
    expect(memoryPageBlock(page)).toEqual([]);
    expect(memoryPageBlock(undefined)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// LocalRetriever (48 §4)
// ---------------------------------------------------------------------------

describe('LocalRetriever (48 §4 — BM25 + recency + graph, RRF-fused)', () => {
  const corpus: readonly Retrievable[] = [
    { id: 'd1', fields: [{ name: 'text', text: 'forge ritual binds the smith covenant', weight: 2 }], at: 100, edges: ['d2'] },
    { id: 'd2', fields: [{ name: 'text', text: 'smith apprentice dreams of the sea voyage', weight: 1 }], at: 900, edges: [] },
    { id: 'd3', fields: [{ name: 'text', text: 'market steward weighs grain against silver', weight: 1 }], at: 950, edges: [] },
  ];

  const q = (over: Partial<RetrievalQuery> = {}): RetrievalQuery => ({ text: 'forge ritual', now: 1000, ...over });

  it('is deterministic: identical corpus + query yield identical rankings', () => {
    expect(localRetrieve(corpus, q())).toEqual(localRetrieve(corpus, q()));
  });

  it('ranks lexical relevance first: the forge document outranks unrelated ones', () => {
    const ids = localRetrieve(corpus, q()).map((x) => x.id);
    expect(ids[0]).toBe('d1');
  });

  it('recency orders the tail when text is silent: a fresh doc outranks a stale one', () => {
    const tail: readonly Retrievable[] = [
      { id: 'matched', fields: [{ name: 'text', text: 'forge ritual covenant', weight: 1 }], at: 100, edges: [] },
      { id: 'fresh', fields: [{ name: 'text', text: 'unrelated words entirely', weight: 1 }], at: 999, edges: [] },
      { id: 'stale', fields: [{ name: 'text', text: 'other unrelated words', weight: 1 }], at: 1, edges: [] },
    ];
    const ids = localRetrieve(tail, q({ text: 'forge ritual' })).map((x) => x.id);
    expect(ids[0]).toBe('matched');            // lexical relevance wins the head
    expect(ids.indexOf('fresh')).toBeLessThan(ids.indexOf('stale')); // recency orders the text-silent tail
  });

  it('graph neighbourhood: the linked document outranks an equal-footing neutral one', () => {
    // d3 sits at the same age as d1 so recency grants it no advantage — the d1→d2 edge is the
    // only differentiator between d2 and d3.
    const corpus2: readonly Retrievable[] = [
      { id: 'd1', fields: [{ name: 'text', text: 'forge ritual binds the smith covenant', weight: 2 }], at: 100, edges: ['d2'] },
      { id: 'd2', fields: [{ name: 'text', text: 'smith apprentice dreams of the sea voyage', weight: 1 }], at: 500, edges: [] },
      { id: 'd3', fields: [{ name: 'text', text: 'market steward weighs grain against silver', weight: 1 }], at: 100, edges: [] },
    ];
    const ids = localRetrieve(corpus2, q({ boostIds: ['d1'] })).map((x) => x.id);
    expect(ids).toContain('d2');
    expect(ids).toContain('d3');
    expect(ids.indexOf('d2')).toBeLessThan(ids.indexOf('d3'));
  });

  it('is pure: retrieval mutates neither the corpus nor repeated-call results', () => {
    const src = corpus.map((c) => ({ ...c, fields: [...c.fields], edges: [...c.edges] }));
    const r1 = localRetrieve(src, q());
    const r2 = localRetrieve(src, q());
    expect(r1).toEqual(r2);
    expect(JSON.stringify(src)).toBe(JSON.stringify(corpus));
  });

  it('rrfFuse unions lists and rewards consensus across them', () => {
    const a = new Map([['x', 1], ['y', 2]]);
    const b = new Map([['x', 1], ['z', 2]]);
    const fused = rrfFuse([a, b], 60, 10).map((h) => h.id);
    expect(fused).toContain('x');
    expect(fused).toContain('y');
    expect(fused).toContain('z');
    expect(fused[0]).toBe('x'); // top of both lists wins
  });

  it('tokenize is stopword-light and deterministic', () => {
    expect(tokenize('The Forge of Ritual')).toEqual(tokenize('the forge of ritual'));
    expect(tokenize('the forge of ritual')).toEqual(['forge', 'ritual']);
  });
});

// ---------------------------------------------------------------------------
// Retrieval firewall (48 §5)
// ---------------------------------------------------------------------------

describe('Retrieval firewall (48 §5)', () => {
  const docs = new Map<string, Recallable>([
    ['ok', { id: 'ok', scope: 's1', banded: true, text: 'The contact completed the covenant rite.' }],
    ['raw', { id: 'raw', scope: 's1', banded: false, text: 'raw signal fragment' }],
    ['foreign', { id: 'foreign', scope: 's2', banded: true, text: 'another player was here' }],
    ['leaky', { id: 'leaky', scope: 's1', banded: true, text: 'your stage was amber and the system has noticed' }],
  ]);
  const ranked = [
    { id: 'ok', score: 1.0 },
    { id: 'raw', score: 0.9 },
    { id: 'foreign', score: 0.8 },
    { id: 'leaky', score: 0.7 },
    { id: 'ghost', score: 0.6 }, // not in the document map — unknown provenance
  ];

  it('R1: non-banded documents are dropped, never degraded', () => {
    expect(filterRecall(ranked, docs, 's1').map((h) => h.id)).toEqual(['ok']);
  });

  it('R3: text carrying forbidden/assessment vocabulary is dropped even if the doc claims banded', () => {
    expect(isBandedText('your stage was amber and the system has noticed')).toBe(false);
    expect(isBandedText('The contact completed the covenant rite.')).toBe(true);
  });

  it('R4: cross-scope hits are dropped — a query never sees another scope', () => {
    const only = new Map([['foreign', docs.get('foreign')!]]);
    expect(filterRecall([{ id: 'foreign', score: 1 }], only, 's1')).toEqual([]);
    expect(filterRecall([{ id: 'foreign', score: 1 }], only, 's2').length).toBe(1);
  });

  it('fail-closed provenance: a hit without a document is dropped silently', () => {
    expect(filterRecall([{ id: 'ghost', score: 1 }], docs, 's1')).toEqual([]);
  });

  it('MY-RG-0032: an unpinned embedding model is a hard construction error; the pin constructs', () => {
    expect(() => createEmbeddingProvider('some-other-model@v9', () => [1])).toThrow(/MY-RG-0032/);
    const p = createEmbeddingProvider(EMBEDDING_MODEL_PIN, (t) => [t.length, 1]);
    expect(p.modelId).toBe(EMBEDDING_MODEL_PIN);
  });

  it('semanticRank is deterministic and fuseRanks degrades to the local floor without semantics', () => {
    const p = createEmbeddingProvider(EMBEDDING_MODEL_PIN, (t) => [t.includes('forge') ? 1 : 0, 1]);
    const corpus = [
      { id: 'f', text: 'forge tale' },
      { id: 'm', text: 'market tale' },
    ];
    expect(semanticRank(p, corpus, 'forge')).toEqual(semanticRank(p, corpus, 'forge'));
    expect(semanticRank(p, corpus, 'forge')[0]!.id).toBe('f');

    const local = [{ id: 'a', score: 1 }, { id: 'b', score: 0.5 }];
    expect(fuseRanks(local, null)).toEqual(local.slice(0, 20)); // degradation floor = local
    const fused = fuseRanks(local, [{ id: 'b', score: 1 }, { id: 'c', score: 0.5 }]).map((h) => h.id);
    expect(fused[0]).toBe('b'); // consensus across both lists wins
    expect(fused).toContain('a');
    expect(fused).toContain('c');
  });
});

/**
 * The System-1 port — plan Phase 14 d6 (`43 §2`).
 *
 * Locks the three boundaries that make "proposes, never commits" a property rather than a promise:
 *  - the deterministic fallback is TOTAL (every op answers, always);
 *  - the vocabulary guard DROPS an invented tag rather than forwarding it — a model that can widen
 *    the ontology can author canon, which is the one thing it may not do;
 *  - the agreement check decides survival, and an UNMEASURED model is not kept (an unmeasured
 *    dimension is not a passed one).
 *
 * Also covers the Laya adapter's degradation shape: a throwing/malformed completion yields
 * `undefined` and never an exception, because the caller's synchronization cannot catch.
 *
 * Spec: `docs/foundations/43-agentic-orchestration-architecture.md` §2 · `45-personalization-and-context-pooling.md` §5.
 */
import { describe, it, expect } from 'vitest';
import { initialTopicTagResolver } from '../../src/core/personalization/candidateLibrary.js';
import { deterministicReading, type EncounterRecord } from '../../src/core/personalization/polarityResolution.js';
import {
  createDeterministicSystem1,
  withSystem1Fallback,
  evaluateSystem1Agreement,
  decideSystem1,
  bindSystem1,
  SYSTEM1_AGREEMENT_THRESHOLD,
  type System1Port,
  type System1Vocabulary,
} from '../../src/core/personalization/index.js';
import { createLayaSystem1, createLayaSystem1Async } from '../../src/infra/llm/LayaSystem1Adapter.js';
import type { TagId } from '../../src/core/world/tags/types.js';

const fallback = createDeterministicSystem1({
  resolveTopicTag: initialTopicTagResolver,
  proposeReading: deterministicReading,
});

/** The caller's vocabulary: whatever `initialTopicTagResolver` can produce is known. */
const VOCABULARY: System1Vocabulary = {
  knowsTag: (t) => initialTopicTagResolver(t) !== undefined,
  // The corpus predicate. Ids the caller hands IN as seeds are by definition in its corpus, so the
  // fixture's known set includes the seed ids the tests use.
  knowsId: (id) => id.startsWith('known-') || id === 'a',
};

describe('the deterministic fallback', () => {
  it('answers every operation without a model', () => {
    expect(fallback.resolveTopicTag?.('music')).toBe('music');
    expect(fallback.resolveTopicTag?.('not-a-tag-at-all')).toBeUndefined();
    // No prefilter configured → identity, which is a lawful answer (the retriever boosts its seeds).
    expect(fallback.prefilterNeighbours?.(['a', 'b'], ['a', 'b', 'c'])).toEqual(['a', 'b']);
  });
});

describe('the vocabulary guard', () => {
  it('drops an invented tag and answers from the fallback instead', () => {
    const inventor: System1Port = { id: 'inventor', resolveTopicTag: () => 'a-tag-that-does-not-exist' as TagId };
    const { port, report } = withSystem1Fallback(inventor, fallback, VOCABULARY);
    expect(port.resolveTopicTag?.('music')).toBe('music');
    expect(report.droppedTags).toEqual(['a-tag-that-does-not-exist']);
  });

  it('accepts a proposal the vocabulary knows', () => {
    const expert: System1Port = { id: 'expert', resolveTopicTag: () => 'craft' as TagId };
    const { port, report } = withSystem1Fallback(expert, fallback, VOCABULARY);
    expect(port.resolveTopicTag?.('anything')).toBe('craft');
    expect(report.droppedTags).toEqual([]);
  });

  it('degrades to the fallback when the port throws, on every operation', () => {
    const broken: System1Port = {
      id: 'broken',
      resolveTopicTag: () => { throw new Error('boom'); },
      proposeReading: () => { throw new Error('boom'); },
      prefilterNeighbours: () => { throw new Error('boom'); },
    };
    const { port } = withSystem1Fallback(broken, fallback, VOCABULARY);
    expect(port.resolveTopicTag?.('music')).toBe('music');
    expect(port.prefilterNeighbours?.(['a'], ['a', 'b'])).toEqual(['a']);
    const reading = port.proposeReading?.({} as EncounterRecord);
    expect(reading).not.toBeUndefined();
  });

  it('names its producer, so a caller can tell the fallback from a model', () => {
    const { port } = withSystem1Fallback(
      { id: 'broken', proposeReading: () => { throw new Error('boom'); } },
      fallback,
      VOCABULARY,
    );
    const record = {
      pairKey: 'technology|nature', poleServed: 'familiar', pairHoldQuality: 0.9,
      evidence: ['e1', 'e2', 'e3'], at: 1,
      cell: { line: 'Cognitive', stage: 'Red', modality: 'ScenarioChoice' },
    } as unknown as EncounterRecord;
    expect(port.proposeReading?.(record)?.proposedBy).toBe('deterministic-fallback');
  });

  it('rejects an evidence-less reading — a reading without evidence is not a reading', () => {
    const unsupported: System1Port = {
      id: 'unsupported',
      proposeReading: () => ({
        cell: { line: 'Cognitive', stage: 'Red', modality: 'ScenarioChoice' },
        pairKey: 'a|b', position: 0.9, direction: 'toward-conscious', confidence: 0.9,
        evidence: [], proposedBy: 'system1', at: 1,
      }),
    };
    const { port } = withSystem1Fallback(unsupported, fallback, VOCABULARY);
    const record = {
      pairKey: 'technology|nature', poleServed: 'familiar', pairHoldQuality: 0.9,
      evidence: ['e1', 'e2', 'e3'], at: 1,
      cell: { line: 'Cognitive', stage: 'Red', modality: 'ScenarioChoice' },
    } as unknown as EncounterRecord;
    const reading = port.proposeReading?.(record);
    // The fallback's reading, not the unsupported one.
    expect(reading?.evidence.length).toBeGreaterThan(0);
    expect(reading?.proposedBy).toBe('deterministic-fallback');
  });

  it('lets a prefilter narrow and reorder but never introduce', () => {
    const introducer: System1Port = {
      id: 'introducer',
      prefilterNeighbours: () => ['known-a', 'a-stranger', 'known-b'],
    };
    const { port, report } = withSystem1Fallback(introducer, fallback, VOCABULARY);
    // `known-a`/`known-b` survive; the stranger was introduced and is dropped.
    expect(port.prefilterNeighbours?.([], ['known-a', 'known-b'])).toEqual(['known-a', 'known-b']);
    expect(report.droppedIds).toBe(1);
  });
});

describe('the agreement check (RV discipline applied to a model)', () => {
  const CASES = [
    { topic: 'music', expected: 'music' as TagId },
    { topic: 'craft', expected: 'craft' as TagId },
    { topic: 'technology', expected: 'technology' as TagId },
    { topic: 'not-a-tag-at-all', expected: undefined },
  ];

  it('scores only the cases the deterministic resolver can answer', () => {
    const result = evaluateSystem1Agreement(fallback, CASES, fallback);
    expect(result.scored).toBe(3);
    expect(result.n).toBe(4);
    expect(result.agreement).toBe(1);
  });

  it('keeps a model that agrees, at provisional standing', () => {
    const agreeing: System1Port = { id: 'agreeing', resolveTopicTag: initialTopicTagResolver };
    const decision = decideSystem1(evaluateSystem1Agreement(agreeing, CASES, fallback));
    expect(decision.keep).toBe(true);
    expect(decision.standing).toBe('provisional-model');
  });

  it('discards a model that disagrees, and hands the loop back to the fallback', () => {
    const wrong: System1Port = { id: 'wrong', resolveTopicTag: () => 'law' as TagId };
    const binding = bindSystem1(wrong, fallback, CASES, VOCABULARY);
    expect(binding.standing).toBe('deterministic-fallback');
    expect(binding.port).toBe(fallback);
    expect(binding.evidence.length).toBe(4);
  });

  it('does NOT keep a model when nothing could be measured', () => {
    const decision = decideSystem1({ rows: [], agreement: 0, scored: 0, n: 0 });
    expect(decision.keep).toBe(false);
    expect(decision.reason).toContain('unmeasured');
  });

  it('with no candidate at all, binds the fallback with no evidence', () => {
    const binding = bindSystem1(undefined, fallback, CASES, VOCABULARY);
    expect(binding.port).toBe(fallback);
    expect(binding.standing).toBe('deterministic-fallback');
    expect(binding.evidence).toEqual([]);
  });

  it('kept still means guarded — the threshold governs agreement, not every future call', () => {
    let calls = 0;
    const flaky: System1Port = {
      id: 'flaky',
      resolveTopicTag: (topic) => {
        calls += 1;
        if (calls > 4) return 'invented-later' as TagId;
        return initialTopicTagResolver(topic);
      },
    };
    const binding = bindSystem1(flaky, fallback, CASES, VOCABULARY);
    expect(binding.standing).toBe('provisional-model');
    expect(binding.port.resolveTopicTag?.('music')).toBe('music'); // calls 5.. would invent
    expect(binding.port.resolveTopicTag?.('music')).toBe('music'); // guard caught it → fallback
  });

  it('states its threshold, so the number is auditable', () => {
    expect(SYSTEM1_AGREEMENT_THRESHOLD).toBeGreaterThan(0);
    expect(SYSTEM1_AGREEMENT_THRESHOLD).toBeLessThanOrEqual(1);
  });
});

describe('the Laya adapter', () => {
  it('never throws when the completion throws — the synchronous form answers undefined', () => {
    const port = createLayaSystem1({
      complete: () => Promise.reject(new Error('unreachable')),
      knownTags: ['music', 'craft'],
    });
    expect(port.resolveTopicTag?.('music')).toBeUndefined();
    expect(port.proposeReading?.({} as EncounterRecord)).toBeNull();
    expect(port.prefilterNeighbours?.(['s'], ['s'])).toEqual(['s']);
  });

  it('warms from a well-formed answer on the next call and parses a fenced block', async () => {
    const port = createLayaSystem1({
      complete: async () => '```json\n{"tag":"craft"}\n```',
      knownTags: ['music', 'craft'],
    });
    // First call returns undefined (the fallback answers) and warms the cache in the background.
    expect(port.resolveTopicTag?.('woodworking')).toBeUndefined();
    await new Promise((r) => setTimeout(r, 10));
    expect(port.resolveTopicTag?.('woodworking')).toBe('craft');
  });

  it('rejects a malformed completion without throwing', async () => {
    const port = createLayaSystem1({ complete: async () => 'not json at all' });
    expect(port.resolveTopicTag?.('music')).toBeUndefined();
    await new Promise((r) => setTimeout(r, 10));
    expect(port.resolveTopicTag?.('music')).toBeUndefined();
  });

  it('the async form draws prefilter ids only from the candidates', async () => {
    const port = createLayaSystem1Async({
      complete: async () => ({ ids: ['b', 'stranger', 'a'] }),
    });
    expect(await port.prefilterNeighbours(['a'], ['a', 'b', 'c'])).toEqual(['b', 'a']);
  });

  it('the async form keeps the reading surface on the deterministic path until it is measured', async () => {
    const port = createLayaSystem1Async({ complete: async () => ({ position: 1 }) });
    expect(await port.proposeReading({} as EncounterRecord)).toBeNull();
  });
});

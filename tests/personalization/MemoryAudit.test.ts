/**
 * Memory-audit regression tests (2026-09-22 audit, docs/audits/MEMORY-AUDIT-2026-09-22.md).
 * Each test locks one finding's fix at its owner:
 *  - F1  thread-closing asymmetry (verdict ref names the session it disposes)
 *  - F2  open threads never expire by age alone (M2 cap is the culler)
 *  - F3  verdict pluralization ("3 step was taken" class)
 *  - F4  render-path vs recall-path Veil vocabulary drift (MY-RG-0031 class)
 *  - F5  feed growth is windowed at the checkpoint (LM-c) with the MemoryPage as compaction
 *  - F6  Unicode interests are retrievable (48 §2: non-Latin tokenizers must not vanish)
 *  - W1  the live envelope carries the [CROSS-SESSION MEMORY] head, Veil-guarded, empty on cold start
 */
import { describe, it, expect } from 'vitest';
import {
  newFeed, appendSessionEntry, appendVerdictEntry, type ReportingFeed,
} from '../../src/core/orchestration/feedBridge.js';
import {
  buildMemoryPage, auditMemoryPage, MAX_OPEN_THREADS,
} from '../../src/core/personalization/memoryPage.js';
import { createOrchestrationServices, buildEnvelope } from '../../src/core/personalization/sessionRuntime.js';
import { localRetrieve, tokenize, type Retrievable } from '../../src/core/memory/LocalRetriever.js';
import { FORBIDDEN_RECALL_TOKENS } from '../../src/core/memory/retrievalFirewall.js';
import { isBandedText } from '../../src/core/memory/retrievalFirewall.js';
import type { Holon } from '../../src/core/world/Holon.js';

const SIG = { moodDelta: 1, engagementDelta: 1, progressDelta: 1, veilRisk: 0, distressSignal: 0, frustrationSignal: 0, consentEvents: [], stageName: 'Amber', lineName: 'cognitive' };

function sessionWithThreshold(feed: ReportingFeed, sid: string, at: number): void {
  appendSessionEntry(feed, {
    logRef: { sessionId: sid, delegationId: 'fg', startedAtMs: at, endedAtMs: at + 5 },
    signals: SIG,
    proposals: [{ kind: 'threshold_signal', payload: {}, rationale: 't' }],
  });
}

describe('F1 — verdict closes the session it names', () => {
  it('a verdict for session A does NOT close session B still carrying threshold_signal', () => {
    const feed = newFeed();
    sessionWithThreshold(feed, 'A', 0);
    sessionWithThreshold(feed, 'B', 10);
    appendVerdictEntry(feed, {
      sessionId: 'A', at: 20,
      dispositions: [{ kind: 'threshold_signal', accepted: true, reason: 'ok' }],
    });
    const page = buildMemoryPage(feed, { workers: {}, queued: [] }, [], 30);
    const openRefs = page.openThreads.map((t) => t.ref);
    expect(openRefs).toContain('session:B');
    expect(openRefs).not.toContain('session:A');
  });
});

describe('F2 — old age alone does not close a thread', () => {
  it('a very old unresolved session still appears as an open thread', () => {
    const feed = newFeed();
    sessionWithThreshold(feed, 'old', 0);
    const page = buildMemoryPage(feed, { workers: {}, queued: [] }, [], 10_000_000);
    expect(page.openThreads.some((t) => t.ref === 'session:old')).toBe(true);
  });

  it('M2 still caps the list at MAX_OPEN_THREADS (oldest kept)', () => {
    const feed = newFeed();
    for (let i = 0; i < MAX_OPEN_THREADS + 4; i++) sessionWithThreshold(feed, `s${i}`, i * 10);
    const page = buildMemoryPage(feed, { workers: {}, queued: [] }, [], 10_000);
    expect(page.openThreads.length).toBe(MAX_OPEN_THREADS);
  });
});

describe('F3 — verdict prose pluralization', () => {
  it('counts above one use plural verbs, not plural nouns ("3 steps were taken")', () => {
    const feed = newFeed();
    sessionWithThreshold(feed, 'A', 0);
    appendSessionEntry(feed, {
      logRef: { sessionId: 'B', delegationId: 'fg', startedAtMs: 10, endedAtMs: 15 },
      signals: SIG,
      proposals: [],
    });
    appendVerdictEntry(feed, {
      sessionId: 'B', at: 20,
      dispositions: [
        { kind: 'encounter_record', accepted: true, reason: 'a' },
        { kind: 'encounter_record', accepted: true, reason: 'b' },
        { kind: 'encounter_record', accepted: true, reason: 'c' },
      ],
    });
    const page = buildMemoryPage(feed, { workers: {}, queued: [] }, [], 30);
    expect(page.trajectory).toMatch(/3 steps were taken/);
    expect(page.trajectory).not.toMatch(/3 step was taken/);
    expect(page.trajectory).not.toMatch(/1 steps/);
  });
});

describe('F4 — one Veil vocabulary across render and recall paths', () => {
  it('every text the recall firewall drops is ALSO flagged by the page audit (render path)', () => {
    for (const tok of FORBIDDEN_RECALL_TOKENS) {
      const page = {
        builtAt: 1,
        derivedFrom: [],
        trajectory: `the memory carries: ${tok}`,
        openThreads: [],
        holonStates: [],
      };
      const violations = auditMemoryPage(page);
      expect(violations.length, `page audit missed recall token "${tok}"`).toBeGreaterThan(0);
    }
  });
  it('isBandedText and the page audit agree on a clean sentence', () => {
    const clean = 'A step was taken and settled; something long-avoided was faced.';
    expect(isBandedText(clean)).toBe(true);
    expect(auditMemoryPage({ builtAt: 1, derivedFrom: [], trajectory: clean, openThreads: [], holonStates: [] })).toEqual([]);
  });
});

describe('F5 — checkpoint windowing (LM-c)', () => {
  it('captureCheckpoint retains at most the last 2000 entries; older are compacted, not lost', async () => {
    const { captureCheckpoint, MAX_CHECKPOINT_FEED_ENTRIES } = await import('../../src/core/personalization/sessionRuntime.js');
    const services = createOrchestrationServices([]);
    for (let i = 0; i < MAX_CHECKPOINT_FEED_ENTRIES + 25; i++) {
      sessionWithThreshold(services.feed, `flood-${i}`, i * 10);
    }
    const cp = captureCheckpoint(services);
    expect(cp.feedEntries.length).toBe(MAX_CHECKPOINT_FEED_ENTRIES);
    // newest kept
    expect(cp.feedEntries.some((e) => e.id === `session:flood-${MAX_CHECKPOINT_FEED_ENTRIES + 24}`)).toBe(true);
    // oldest dropped from the window
    expect(cp.feedEntries.some((e) => e.id === 'session:flood-0')).toBe(false);
    // …and the page still renders the compacted trajectory (the compaction layer)
    const page = buildMemoryPage(services.feed, services.workers, [], 10_000_000);
    expect(page.trajectory.length).toBeGreaterThan(0);
  });
});

describe('F6 — Unicode retrieval', () => {
  it('cyrillic tokens tokenize (not vanish)', () => {
    expect(tokenize('медитация практика').length).toBe(2);
  });
  it('accents fold (café ≈ cafe)', () => {
    expect(tokenize('Café')[0]).toBe('cafe');
  });
  it('a non-Latin interest matches its candidate', () => {
    const corpus: Retrievable[] = [
      { id: 'yoga', fields: [{ name: 't', text: 'йога медитация практика дыхание', weight: 1 }], at: 900, edges: [] },
      { id: 'other', fields: [{ name: 't', text: 'commerce craft trade', weight: 1 }], at: 900, edges: [] },
    ];
    const r = localRetrieve(corpus, { text: 'медитация', now: 1000 });
    expect(r[0]?.id).toBe('yoga');
  });
});

describe('W1 — the live envelope carries cross-session memory (48 §3)', () => {
  const holons: Holon[] = [];
  const sig = {
    altitudes: {},
    shadows: { entries: [] },
  } as never;

  it('cold start → empty continuity (first boot is correct, not an error)', () => {
    const services = createOrchestrationServices(holons);
    const env = buildEnvelope(services, sig, undefined, { line: 'cognitive' as never, stage: 'amber' as never, modality: 'dialogue' as never }, 'test', [], 1000);
    expect(env.continuity).toEqual([]);
  });

  it('after a ratified session → banded lines, every one passing the Veil guard', () => {
    const services = createOrchestrationServices(holons);
    sessionWithThreshold(services.feed, 's1', 0);
    appendSessionEntry(services.feed, {
      logRef: { sessionId: 's2', delegationId: 'fg', startedAtMs: 10, endedAtMs: 15 },
      signals: SIG,
      proposals: [],
    });
    appendVerdictEntry(services.feed, {
      sessionId: 's2', at: 20,
      dispositions: [{ kind: 'encounter_record', accepted: true, reason: 'ok' }],
    });
    const env = buildEnvelope(services, sig, undefined, { line: 'cognitive' as never, stage: 'amber' as never, modality: 'dialogue' as never }, 'test', [], 1000);
    expect(env.continuity.length).toBeGreaterThan(0);
    for (const line of env.continuity) {
      expect(line.toLowerCase()).not.toContain('stage');
      expect(line.toLowerCase()).not.toContain('score');
    }
    expect(env.continuity.join(' ')).toMatch(/sittings have passed|sitting has passed/);
  });
});

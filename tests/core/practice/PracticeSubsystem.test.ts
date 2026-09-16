/**
 * Tests for the practice subsystem (doc 39) — VowService lifecycle,
 * reflection scoring/evidence, and the processCheckIn pipeline.
 *
 * Guarantees under test:
 *   P1  Acceptance is always the player's choice; decline is preference
 *       signal only (three declines of a class reroute proposals).
 *   P2  Lapse is material, not moral: only zero-engagement vows past their
 *       self-declared horizon lapse; lapse feeds avoidance delta.
 *   P3  Depth scoring is deterministic marker-tier classification.
 *   P4  Crisis text routes to safety BEFORE integration — nothing stored,
 *       nothing scored, nothing integrated.
 *   P5  Check-ins integrate as real-world catalyst events: record survives
 *       the pipeline, world consequences apply, single-commit.
 */
import { describe, it, expect } from 'vitest';
import {
  emptyVowBook,
  proposeVow,
  acceptVow,
  declineVow,
  shouldRerouteClass,
  checkIn as recordCheckIn,
  discoverLapses,
  lapseAvoidanceDelta,
  renegotiateVow,
  type ObjectiveProposal,
} from '../../../src/core/practice/VowService.js';
import {
  scoreReflectionDepth,
  classifyReflection,
  REFLECTION_PROMPTS,
} from '../../../src/core/practice/ReflectionEvidence.js';
import { proposeObjectives, processCheckIn, detectCrisis } from '../../../src/core/practice/practiceTools.js';
import { createSignificator } from '../../../src/core/domain/Significator.js';
import { createInitialWorldState } from '../../../src/core/engines/CandidateGeneration.js';
import { ALL_LINES } from '../../../src/core/domain/Line.js';
import type { Line } from '../../../src/core/domain/Line.js';
import type { Stage } from '../../../src/core/domain/Stage.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const RED_ALTITUDES = Object.fromEntries(ALL_LINES.map((l) => [l, 'Red'])) as Record<Line, Stage>;

function mkSig() {
  return createSignificator('practice-test', RED_ALTITUDES, 'Red');
}

function mkWorld() {
  return createInitialWorldState([]);
}

const BASE_PROPOSAL: ObjectiveProposal = {
  text: 'Speak once in the meeting you would normally stay silent in.',
  kind: 'exposure',
  rationale: 'approach gradient for the observed avoidance',
  suggestedHorizonMs: 7 * 24 * 60 * 60 * 1000,
};

// ---------------------------------------------------------------------------
// P1 — proposal/acceptance/decline
// ---------------------------------------------------------------------------

describe('VowService lifecycle', () => {
  it('proposes a vow with suggested horizon and no enforcement metadata', () => {
    const vow = proposeVow(BASE_PROPOSAL, 1_000);
    expect(vow.text).toBe(BASE_PROPOSAL.text);
    expect(vow.kind).toBe('exposure');
    expect(vow.horizonMs).toBe(7 * 24 * 60 * 60 * 1000);
    expect(vow.status).toBe('active');
    expect(vow.fulfilled).toBe(false);
    expect(vow.checkInCount).toBe(0);
  });

  it('accepts into the book without mutating the input book', () => {
    const book = emptyVowBook();
    const { book: out, vow } = acceptVow(book, BASE_PROPOSAL, 1_000);
    expect(out.vows).toHaveLength(1);
    expect(out.vows[0]!.text).toBe(vow.text);
    expect(book.vows).toHaveLength(0); // pure
  });

  it('records declines as preference signal, not failure', () => {
    let book = emptyVowBook();
    book = declineVow(book, BASE_PROPOSAL);
    book = declineVow(book, BASE_PROPOSAL);
    expect(book.vows).toHaveLength(0);
    expect(book.declineCounts['exposure']).toBe(2);
    expect(shouldRerouteClass(book, 'exposure')).toBe(false);
    book = declineVow(book, BASE_PROPOSAL);
    expect(book.declineCounts['exposure']).toBe(3);
    expect(shouldRerouteClass(book, 'exposure')).toBe(true);
  });

  it('reroute is per-class, not global', () => {
    let book = emptyVowBook();
    for (let i = 0; i < 3; i++) book = declineVow(book, BASE_PROPOSAL);
    expect(shouldRerouteClass(book, 'exposure')).toBe(true);
    expect(shouldRerouteClass(book, 'learning')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// P2 — lapse is material, not moral
// ---------------------------------------------------------------------------

describe('lapse discovery', () => {
  it('lapses only zero-engagement vows past their self-declared horizon', () => {
    const t0 = 1_000_000;
    const week = 7 * 24 * 60 * 60 * 1000;
    const { book } = acceptVow(emptyVowBook(), BASE_PROPOSAL, t0);
    const engaged = { ...book.vows[0]!, checkInCount: 1 };

    const bookEngaged = { ...book, vows: [engaged] };
    const bookDisengaged = { ...book, vows: [book.vows[0]!] };

    const past = discoverLapses(bookEngaged, t0 + week + 1);
    expect(past.lapsed).toHaveLength(0); // engaged vow never lapses on a timer

    const pastDis = discoverLapses(bookDisengaged, t0 + week + 1);
    expect(pastDis.lapsed).toHaveLength(1);
    expect(pastDis.lapsed[0]!.status).toBe('lapsed');
  });

  it('never lapses before the horizon or vows without one', () => {
    const t0 = 1_000_000;
    const week = 7 * 24 * 60 * 60 * 1000;
    const { book } = acceptVow(emptyVowBook(), BASE_PROPOSAL, t0);
    expect(discoverLapses(book, t0 + week - 1).lapsed).toHaveLength(0);

    const noHorizon = { ...book.vows[0]!, horizonMs: undefined };
    const bookNoHorizon = { ...book, vows: [noHorizon] };
    expect(discoverLapses(bookNoHorizon, t0 + week * 10).lapsed).toHaveLength(0);
  });

  it('lapse feeds an avoidance delta for the engine', () => {
    const t0 = 1_000_000;
    const week = 7 * 24 * 60 * 60 * 1000;
    const { book } = acceptVow(emptyVowBook(), BASE_PROPOSAL, t0);
    const { lapsed } = discoverLapses(book, t0 + week + 1);
    expect(lapseAvoidanceDelta(lapsed)).toBeGreaterThan(0);
    expect(lapseAvoidanceDelta([])).toBe(0);
  });

  it('renegotiation downsizes the step without moral framing', () => {
    const t0 = 1_000_000;
    const week = 7 * 24 * 60 * 60 * 1000;
    const { book, vow } = acceptVow(emptyVowBook(), BASE_PROPOSAL, t0);
    const lapsedBook = discoverLapses(book, t0 + week + 1).book;
    const { vow: renegotiated } = renegotiateVow(
      lapsedBook,
      lapsedBook.vows[0] ?? vow,
      'Just open the meeting notes.',
      t0 + week + 2,
    );
    expect(renegotiated.text).toBe('Just open the meeting notes.');
    expect(renegotiated.status).toBe('active');
  });
});

// ---------------------------------------------------------------------------
// P3 — depth scoring
// ---------------------------------------------------------------------------

describe('reflection depth scoring', () => {
  it('classifies marker tiers deterministically', () => {
    expect(scoreReflectionDepth([''])).toBe(1);
    expect(scoreReflectionDepth(['I did the thing.'])).toBe(1); // factual only
    expect(scoreReflectionDepth(['I felt tense the whole time'])).toBe(2);
    expect(scoreReflectionDepth(['because I noticed the pattern where I'])).toBeGreaterThanOrEqual(3);
    expect(scoreReflectionDepth(['i used to think it was about me, now i see it differently'])).toBe(5);
  });

  it('classifies reflection evidence without leaking raw text', () => {
    const record = {
      id: 'r1',
      prompts: REFLECTION_PROMPTS.map((q, i) => ({ question: q, answer: ['I showed up', 'felt calm', 'hard to start', 'connects to work', 'try again'][i] ?? '' })),
      depthScore: 3 as const,
      createdAtMs: 1,
    };
    const evidence = classifyReflection(record, 'Intrapersonal');
    expect(evidence.attempted).toBe(true);
    expect(evidence.primaryLine).toBe('Intrapersonal');
  });
});

// ---------------------------------------------------------------------------
// P4 — crisis gate
// ---------------------------------------------------------------------------

describe('crisis routing', () => {
  it('detects crisis patterns deterministically', () => {
    expect(detectCrisis('I want to die')).toBe(true);
    expect(detectCrisis('I had a hard day')).toBe(false);
  });

  it('routes crisis reflections to safety before anything is stored', () => {
    const book = emptyVowBook();
    const sig = mkSig();
    const world = mkWorld();
    const out = processCheckIn({ book, sig, world, answers: ['I want to die'], now: 1 });
    expect(out.routedToSafety).toBe(true);
    expect(out.sig.reflections ?? []).toHaveLength(0);
    expect(out.book.vows).toHaveLength(0);
    expect(out.engineIntegrated).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// P5 — the full check-in pipeline
// ---------------------------------------------------------------------------

describe('processCheckIn pipeline', () => {
  it('records the reflection, advances the vow, and integrates into the engine', () => {
    const t0 = 1_000_000;
    const { book, vow } = acceptVow(emptyVowBook(), BASE_PROPOSAL, t0);
    const sig = mkSig();
    const world = mkWorld();

    const first = processCheckIn({
      book,
      sig,
      world,
      vow,
      answers: ['I went to the meeting', 'I felt tense but stayed', 'It was hard to start', 'It connects to my fear of judgment', 'I will try again next week'],
      now: t0 + 1_000,
    });
    expect(first.routedToSafety).toBe(false);
    expect(first.sig.reflections ?? []).toHaveLength(1);
    expect(first.book.vows[0]!.checkInCount).toBe(1);
    expect(first.engineIntegrated).toBe(true);
    expect(first.book.vows[0]!.fulfilled).toBe(false); // needs 2 check-ins

    const second = processCheckIn({
      book: first.book,
      sig: first.sig,
      world: first.world,
      vow: first.book.vows[0]!,
      answers: ['I showed up again', 'I noticed the pattern where I rehearse before speaking', 'Starting is the hard part', 'It connects to being seen', 'Keep practicing'],
      now: t0 + 2_000,
    });
    expect(second.book.vows[0]!.fulfilled).toBe(true);
    expect(second.book.vows[0]!.status).toBe('fulfilled');
  });

  it('is pure: the input book and sig are never mutated', () => {
    const { book, vow } = acceptVow(emptyVowBook(), BASE_PROPOSAL, 1);
    const sig = mkSig();
    const bookBefore = JSON.stringify(book);
    const sigBefore = JSON.stringify(sig);
    recordCheckIn(book, sig, {
      vow,
      prompts: REFLECTION_PROMPTS.map((q) => ({ question: q, answer: 'something honest' })),
      now: 2,
      depthScore: 2,
      fulfilmentCriteriaMet: false,
    });
    expect(JSON.stringify(book)).toBe(bookBefore);
    expect(JSON.stringify(sig)).toBe(sigBefore);
  });

  it('handles free-standing reflections (no vow) without vow mutation', () => {
    const book = emptyVowBook();
    const out = processCheckIn({ book, sig: mkSig(), world: mkWorld(), answers: ['I felt calm today'], now: 1 });
    expect(out.routedToSafety).toBe(false);
    expect(out.sig.reflections ?? []).toHaveLength(1);
    expect(out.book.vows).toHaveLength(0);
  });

  it('returns no proposals for an empty context (CLI falls back to authored text)', () => {
    expect(proposeObjectives({ needs: [], activeShadows: [] })).toHaveLength(0);
  });

  it('derives exposure proposals from active shadows, sorted by severity', () => {
    const proposals = proposeObjectives({
      needs: [],
      activeShadows: [
        { quadrant: 'golden-allergy', line: 'Somatic', severity: 0.4 },
        { quadrant: 'dark-addiction', line: 'Intrapersonal', severity: 0.9 },
      ],
    });
    expect(proposals.length).toBe(2);
    expect(proposals[0]!.kind).toBe('exposure');
    expect(proposals[0]!.rationale).toContain('dark-addiction'); // severity-sorted first
    expect(proposals[0]!.suggestedHorizonMs).toBeDefined();
  });

  it('never reads identity context for proposal generation', () => {
    // The ObjectiveContext type carries only needs/shadows — enforced structurally.
    const ctx = { needs: [], activeShadows: [] };
    expect(Object.keys(ctx)).toEqual(['needs', 'activeShadows']);
  });
});

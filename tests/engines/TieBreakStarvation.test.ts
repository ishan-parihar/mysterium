/**
 * The tie-break's starvation key — Phase 16 d3 (`24 §3.3`).
 *
 * The campaign measured `Emotional: 1 encounter in 432` and traced it here. In a tie band the
 * comparator's three substantive rules (novel modality / novel line / familiarity) all tie for
 * several lines at once, so `refHash(moduleRef)` — a STATIC key, and per `24 §3.3` a
 * *reproducibility* key, never a score — decided line coverage every time. Three lines took 74 %.
 *
 * These tests lock the key that now sits ahead of the hash. They are unit tests rather than only a
 * campaign gate because the property is a comparison, and a comparison is exactly what a histogram
 * cannot show: two runs can produce the same skewed histogram for opposite reasons.
 */
import { describe, it, expect } from 'vitest';
import { rankCandidates, scheduleNext } from '../../src/core/engines/EncounterScheduler.js';
import { createSignificator, type Significator } from '../../src/core/domain/Significator.js';
import { buildBenchWorld } from '../../src/core/validation/harness.js';
import { applyConsequences, processOutcome, type PlayerResponse } from '../../src/core/engines/ConsequenceEngine.js';
import { ALL_LINES } from '../../src/core/domain/Line.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';
import type { WorldState } from '../../src/core/engines/CandidateGeneration.js';
import type { ShadowEntry } from '../../src/core/domain/ShadowLedger.js';

/** A candidate that ties with its peers on modality novelty, line novelty and familiarity. */
function candidate(line: Line, modality = 'ImmersiveRPG' as never, stage: Stage = 'Red' as Stage) {
  return {
    id: `${line}:${stage}`,
    moduleRef: `${line}:${stage}`,
    line,
    stage,
    modality,
    holonId: `h-${line}`,
  } as never;
}

/**
 * A significator whose theta book records exactly the lines given, each at the timestamp given.
 * Lines absent from the map have NEVER been encountered — the most starved state there is.
 */
function sigWith(theta: Record<string, number>) {
  return { theta: { lastEncounter: theta } } as never;
}

const world = { recentEncounters: [] } as never;

function freshSig(lastEncounter: Readonly<Record<string, number>> = {}): Significator {
  const altitudes = Object.fromEntries(ALL_LINES.map(line => [line, 'Red'])) as Record<Line, Stage>;
  const sig = createSignificator('fresh-player', altitudes, 'Red');
  return {
    ...sig,
    theta: { ...sig.theta, lastEncounter: { ...sig.theta.lastEncounter, ...lastEncounter } },
  };
}

describe('the tie-break prefers the starved line (Phase 16 d3)', () => {
  it('selects an unserved line as the production primary after one served encounter', () => {
    const altitudes = Object.fromEntries(ALL_LINES.map(line => [line, 'Red'])) as Record<Line, Stage>;
    let sig = createSignificator('covered-player', altitudes, 'Red');
    let world = buildBenchWorld();
    const now = 1_800_000_000_000;
    const session = { targetSessionLength: 4, encountersSoFar: 0, recentLines: [] } as never;

    const first = scheduleNext(sig, world, session, now, 5)[0]!;
    const firstLine = first.targetLines[0]!;
    const response: PlayerResponse = {
      encounterId: first.id,
      energeticDirection: 'Radiative' as const,
      driveDirectionality: {
        Agency: 'HealthyBalanced', Communion: 'HealthyBalanced',
        Eros: 'HealthyBalanced', Agape: 'HealthyBalanced',
      },
      stageOrientation: 'Homeostatic' as const,
      sourceOfNourishment: 'HigherRealm' as const,
      shadowSurfaced: null,
      shadowResolvedId: null,
      narrativeSummary: 'I engaged with the practice.',
    };
    const applied = applyConsequences(sig, world, processOutcome(first, response, now + 1), first);
    sig = applied.sig;
    world = applied.world;

    const second = scheduleNext(sig, world, session, now + 60_000, 5)[0]!;
    expect(second.targetLines[0]).not.toBe(firstLine);
    expect(ALL_LINES).toContain(second.targetLines[0]);
  });

  it('reserves the starved primary across a priority band while preserving the strong offer next', () => {
    const now = 1_800_000_000_000;
    const baseWorld = buildBenchWorld();
    const world: WorldState = {
      ...baseWorld,
      holons: baseWorld.holons.filter(holon =>
        (holon.line === 'Cognitive' || holon.line === 'Emotional') && holon.stage === 'Red',
      ),
    };
    const shadows: ShadowEntry[] = Array.from({ length: 3 }, (_, index) => ({
      id: `strong-shadow-${index}`,
      quadrant: 'DarkAddiction',
      line: 'Cognitive',
      stage: 'Red',
      drive: 'Agency',
      surfacedAt: now - 10_000,
      resolvedAt: null,
      recurrenceCount: 0,
      compoundPartner: null,
      severity: 0.8,
    }));
    const sig = {
      ...freshSig(),
      shadows: { entries: shadows, activeCount: shadows.length },
      theta: {
        lastEncounter: {
          ...freshSig().theta.lastEncounter,
          'Cognitive:Red': now - 1_000,
          'Emotional:Red': 0,
        },
      },
    };
    const offers = scheduleNext(
      sig,
      world,
      {
        targetSessionLength: 4,
        encountersSoFar: 0,
        recentLines: [],
        forceModality: 'ImmersiveRPG',
      },
      now,
      2,
    );

    expect(offers[0]?.targetLines[0]).toBe('Emotional');
    expect(offers[1]?.targetLines[0]).toBe('Cognitive');
    expect(offers[1]!.priority).toBeGreaterThan(offers[0]!.priority);
  });

  it('keeps the least recently served eligible line as the primary, not the static hash winner', () => {
    const sig = freshSig({ 'Cognitive:Red': 1, 'Moral:Red': 2 });
    const world = buildBenchWorld();
    const primary = scheduleNext(sig, world, { targetSessionLength: 4, encountersSoFar: 0, recentLines: [] } as never, 1_800_000_000_000, 5)[0]!;
    expect(['Emotional', 'Spiritual', 'Somatic', 'Willpower', 'Interpersonal', 'Intrapersonal']).toContain(primary.targetLines[0]);
    expect(primary.targetLines[0]).not.toBe('Cognitive');
    expect(primary.targetLines[0]).not.toBe('Moral');
  });

  it('treats initialized zero timestamps as unserved on a fresh significator', () => {
    const sig = freshSig({ 'Cognitive:Red': 1 });
    const scored = [
      { candidate: candidate('Cognitive' as Line), priority: 0.15 },
      { candidate: candidate('Emotional' as Line), priority: 0.15 },
      { candidate: candidate('Moral' as Line), priority: 0.15 },
    ];
    const ranked = rankCandidates(scored as never, sig, world);
    const lines = ranked.map(r => r.candidate.line);
    expect(new Set(lines)).toEqual(new Set(['Cognitive', 'Emotional', 'Moral']));
    expect(['Emotional', 'Moral']).toContain(lines[0]);
    expect(lines[0]).not.toBe('Cognitive');
  });

  it('orders tied candidates by the line that has gone longest without an encounter', () => {
    // Three lines tie on everything the first three rules can see: all three are absent from the
    // recent window (empty), so every candidate carries a novel modality and a novel line, and all
    // three are equally familiar. Only theta recency distinguishes them.
    const scored = [
      { candidate: candidate('Cognitive' as Line), priority: 0.15 },
      { candidate: candidate('Emotional' as Line), priority: 0.15 },
      { candidate: candidate('Spiritual' as Line), priority: 0.15 },
    ];
    // Cognitive was served most recently, Spiritual next, Emotional longest ago.
    const sig = sigWith({
      'Cognitive:Red': 3000,
      'Spiritual:Red': 2000,
      'Emotional:Red': 1000,
    });

    const ranked = rankCandidates(scored as never, sig, world);
    expect(ranked.map((r) => r.candidate.line)).toEqual(['Emotional', 'Spiritual', 'Cognitive']);
  });

  it('places a never-encountered line FIRST against a familiar one — unfamiliar-first (Phase 16 d3b)', () => {
    // Phase 16 d3b flipped this rule, and the flip is what this test now locks. The original draft
    // asserted the OPPOSITE (familiar-first, per `24 §3.3`'s comment) and the roster measurement
    // refuted it: a never-served line is never familiar, so familiar-first structurally locked it
    // out — Emotional and Moral took ZERO encounters across a 10-persona / 120-encounter roster
    // run, and the starvation key could never rescue them because it only ranks lines that reach
    // the comparison. Canon's own reference code already said unfamiliar-first (`some(...) ===
    // false`), so the comment, not the code, was the deviation; `24 §3.3` is reconciled in the
    // same commit.
    //
    // Unfamiliar-first also agrees with rule 4's convention (never-served = most starved = wins),
    // so the two rules can no longer disagree about which line is owed an encounter.
    const scored = [
      { candidate: candidate('Cognitive' as Line), priority: 0.15 },
      { candidate: candidate('Somatic' as Line), priority: 0.15 },
    ];
    const sig = sigWith({ 'Cognitive:Red': 1 });

    const ranked = rankCandidates(scored as never, sig, world);
    expect(ranked[0]!.candidate.line).toBe('Somatic');
  });

  it('falls through to the deterministic hash when the lines were served at the same time', () => {
    const scored = [
      { candidate: candidate('Cognitive' as Line), priority: 0.15 },
      { candidate: candidate('Emotional' as Line), priority: 0.15 },
    ];
    // Identical timestamps: the starvation key ties by construction, so reproducibility decides.
    const tied = sigWith({ 'Cognitive:Red': 5000, 'Emotional:Red': 5000 });
    const first = rankCandidates(scored as never, tied, world).map((r) => r.candidate.line);
    const second = rankCandidates([...scored].reverse() as never, tied, world).map((r) => r.candidate.line);

    // Same order regardless of input order — that IS the hash's job, and it still does it.
    expect(first).toEqual(second);
  });

  it('uses the line\'s MOST RECENT cell, not its oldest', () => {
    // Cognitive has two cells: one visited long ago, one just now. Its most recent encounter is
    // recent, so it is NOT starved — reading the oldest cell instead would invert the verdict.
    const scored = [
      { candidate: candidate('Cognitive' as Line), priority: 0.15 },
      { candidate: candidate('Moral' as Line), priority: 0.15 },
    ];
    const sig = sigWith({
      'Cognitive:Infrared': 100,
      'Cognitive:Red': 9000,
      'Moral:Red': 5000,
    });

    const ranked = rankCandidates(scored as never, sig, world);
    expect(ranked[0]!.candidate.line).toBe('Moral');
  });

  it('does not reorder candidates that differ in priority — the band still rules', () => {
    // The starvation key lives INSIDE a band. A candidate more than TIE_BAND below the top must
    // not be lifted above it, or coverage policy would be overriding developmental value.
    const scored = [
      { candidate: candidate('Cognitive' as Line), priority: 0.30 },
      { candidate: candidate('Emotional' as Line), priority: 0.10 },
    ];
    const sig = sigWith({ 'Cognitive:Red': 9000, 'Emotional:Red': 1 });

    const ranked = rankCandidates(scored as never, sig, world);
    expect(ranked[0]!.candidate.line).toBe('Cognitive');
  });
});

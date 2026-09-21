/**
 * Regression tests for the Full-Development Audit fixes (2026-09-15).
 *
 * P0: endSession crashed with "require is not defined" in every ESM runtime
 *     (tsx/vitest/dev) whenever world.activeMacroEvents was non-empty, and the
 *     Turquoise-stage harvest check silently no-op'ed through the same pattern.
 * P5: lastSessionAt / curriculumIntervention were untyped `as any` fields that
 *     validateSignificator stripped on load; the intervention flag was also
 *     sticky forever (consumed in a local copy that never persisted), and
 *     lastSessionAt was read but never written.
 * FIX: forgettingCurves were dropped by validateSignificator on load, so
 *     Phase 5A forgetting-curve persistence never survived a save/load.
 * FIX: estimateResponseQuality rewarded raw character length (verbose-but-empty
 *     answers outscored terse-but-considered ones); now saturating word count.
 */
import { describe, it, expect } from 'vitest';
import { createSignificator } from '../../src/core/domain/Significator.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';
import type { Holon } from '../../src/core/world/Holon.js';
import { startSession, endSession, tickWithStrategy } from '../../src/core/GameLoop.js';
import { createInitialWorldState } from '../../src/core/engines/CandidateGeneration.js';
import { validateSignificator } from '../../src/infra/persistence/validateSignificator.js';
import type { MacroEvent } from '../../src/core/engines/MacroCatalystEngine.js';

const altitudes: Record<Line, Stage> = {
  Cognitive: 'Red', Emotional: 'Red', Moral: 'Red', Intrapersonal: 'Red',
  Spiritual: 'Red', Somatic: 'Red', Willpower: 'Red', Interpersonal: 'Red',
};

function makeHolon(id: string, line: Line, stage: Stage): Holon {
  return {
    id, name: id, kind: 'NPC', line, stage,
    drives: { dominant: 'Agency', secondary: 'Eros', shadowQuadrant: null },
    polarity: 'Sovereign', narrativeRole: 'test', relationships: [], active: true,
  };
}

function makeWorld(): ReturnType<typeof createInitialWorldState> {
  const holons = (['Cognitive', 'Emotional', 'Moral', 'Intrapersonal', 'Spiritual', 'Somatic', 'Willpower', 'Interpersonal'] as Line[])
    .map((l) => makeHolon(`h-${l}`, l, 'Red'));
  return createInitialWorldState(holons);
}

function makeMacroEvent(id: string): MacroEvent {
  return {
    id,
    trigger: 'economic',
    altitude: 'Red',
    active: true,
    sessionsActive: 0,
    description: 'test macro event',
  };
}

describe('P0: endSession macro-event lifecycle survives ESM (require is not defined)', () => {
  it('advances macro events without crashing when activeMacroEvents is non-empty', () => {
    const sig = createSignificator('p0-macro', altitudes, 'Red');
    const session: any = { targetSessionLength: 5, encountersSoFar: 0, recentLines: ['Cognitive'] };
    const sessionState = startSession(sig, session);
    const world = makeWorld();
    const withEvent = {
      ...world,
      activeMacroEvents: [makeMacroEvent('macro-p0-test')],
    };

    // Pre-fix this threw "require is not defined" (crashed the whole session end).
    const result = endSession(sig, sessionState, Date.now(), withEvent);
    expect(result.summary.macroEventsAdvanced).toBe(1);
    expect(result.world).toBeDefined();
    // The event advanced out of 'onset' bookkeeping and stayed active (not yet resolved).
    expect(result.world!.activeMacroEvents.length).toBe(1);
    expect(result.world!.macroEventStates![0]!.eventId).toBe('macro-p0-test');
  });

  it('advances an event to resolution and resets PESTLE tension after enough sessions', () => {
    const sig = createSignificator('p0-resolve', altitudes, 'Red');
    const session: any = { targetSessionLength: 5, encountersSoFar: 0, recentLines: ['Cognitive'] };
    const sessionState = startSession(sig, session);
    const world = makeWorld();
    const event = makeMacroEvent('macro-p0-resolve');
    // Event already past the active phase ceiling: next advanceMacroEvent → 'resolution'.
    const withEvent = {
      ...world,
      pestleTension: { ...world.pestleTension, economic: 0.9 },
      activeMacroEvents: [event],
      macroEventStates: [{
        eventId: event.id,
        state: { event, phase: 'active' as const, sessionsInPhase: 6, playerChoices: [], encountersSinceStart: 3 },
      }],
    };

    const result = endSession(sig, sessionState, Date.now(), withEvent);
    expect(result.summary.macroEventsAdvanced).toBe(1);
    // Resolved events leave the active pool and their PESTLE dimension resets.
    expect(result.world!.activeMacroEvents.length).toBe(0);
    expect(result.world!.pestleTension.economic).toBe(0);
  });

  it('falls back to a well-formed onset state when no prior state exists (SHAPE-FIX)', () => {
    const sig = createSignificator('p0-shape', altitudes, 'Red');
    const session: any = { targetSessionLength: 5, encountersSoFar: 0, recentLines: ['Cognitive'] };
    const sessionState = startSession(sig, session);
    const event = makeMacroEvent('macro-p0-shape');
    const world = { ...makeWorld(), activeMacroEvents: [event] };

    const result = endSession(sig, sessionState, Date.now(), world);
    const st = result.world!.macroEventStates![0]!.state;
    // The fallback state must carry the event itself (old literal omitted it).
    expect(st.event.id).toBe(event.id);
    expect(st.phase).toBe('onset');
  });
});

describe('P0: Turquoise-stage Choice evaluation actually runs', () => {
  it('returns a real Choice state (not the silently-swallowed null) at Turquoise stage', () => {
    const sig = createSignificator('p0-harvest', { ...altitudes, Cognitive: 'Turquoise' } as Record<Line, Stage>, 'Turquoise');
    const session: any = { targetSessionLength: 5, encountersSoFar: 0, recentLines: ['Cognitive'] };
    const sessionState = startSession(sig, session);

    // Pre-fix this was ALWAYS null: require() threw inside try/catch and the
    // check silently no-op'ed. Now evaluateChoice executes and returns a state.
    const result = endSession(sig, sessionState, Date.now(), undefined);
    expect(result.choiceState).not.toBeNull();
    expect(typeof result.choiceState!.eligible).toBe('boolean');
    expect(typeof result.choiceState!.reason).toBe('string');
    // A fresh Turquoise significator is Exploring-mode: not eligible, with a reason.
    expect(result.choiceState!.eligible).toBe(false);
    expect(result.choiceState!.direction).toBeNull();
    // 19 §9.6: eligibility is a CONDITION and the harvest is an EVENT. A player who is not
    // eligible has not arrived, and must never have the closure reported as reached.
    expect(result.choiceState!.harvestEvent).toBe(false);
    expect(result.choiceState!.closure.reached).toBe(false);
  });

  it('does not evaluate the Choice below Turquoise stage', () => {
    const sig = createSignificator('p0-noharvest', altitudes, 'Red');
    const session: any = { targetSessionLength: 5, encountersSoFar: 0, recentLines: ['Cognitive'] };
    const sessionState = startSession(sig, session);
    const result = endSession(sig, sessionState, Date.now(), undefined);
    expect(result.choiceState).toBeNull();
  });
});

describe('P5: typed session bookkeeping fields survive save/load round-trip', () => {
  it('validateSignificator preserves lastSessionAt and curriculumIntervention', () => {
    const now = Date.now();
    const sig = {
      ...createSignificator('p5-roundtrip', altitudes, 'Red'),
      lastSessionAt: now,
      curriculumIntervention: 'retention health below threshold',
    };
    // Simulate a save/load round-trip (serializeSignificator spreads unknown
    // fields; the validator was the field-stripper).
    const serialized = JSON.parse(JSON.stringify(sig));
    const loaded = validateSignificator(serialized);
    expect(loaded).not.toBeNull();
    expect(loaded!.lastSessionAt).toBe(now);
    expect(loaded!.curriculumIntervention).toBe('retention health below threshold');
  });

  it('startSession consumes the intervention flag into the strategy theme (read-only)', () => {
    const sig = {
      ...createSignificator('p5-intervene', altitudes, 'Red'),
      curriculumIntervention: 'probe says intervene',
    };
    const session: any = { targetSessionLength: 5, encountersSoFar: 0, recentLines: ['Cognitive'] };
    const state = startSession(sig, session);
    expect(state.strategy.theme).toBe('consolidation');
    expect(state.strategy.themeRationale).toContain('probe says intervene');
  });

  it('endSession stamps lastSessionAt on the returned sig', () => {
    const sig = createSignificator('p5-stamp', altitudes, 'Red');
    const session: any = { targetSessionLength: 5, encountersSoFar: 0, recentLines: ['Cognitive'] };
    const sessionState = startSession(sig, session);
    const now = Date.now();
    const { sig: out } = endSession(sig, sessionState, now, undefined);
    expect(out.lastSessionAt).toBe(now);
  });

  it('endSession clears a stale intervention flag when the probe no longer intervenes', () => {
    const sig = {
      ...createSignificator('p5-clear', altitudes, 'Red'),
      curriculumIntervention: 'stale reason',
    };
    const session: any = { targetSessionLength: 5, encountersSoFar: 0, recentLines: ['Cognitive'] };
    const sessionState = startSession(sig, session);
    const { sig: out } = endSession(sig, sessionState, Date.now(), undefined);
    // No knowledge → no probe → shouldIntervene path absent → flag cleared.
    expect(out.curriculumIntervention).toBeUndefined();
  });
});

describe('FIX: validateSignificator reconstructs forgettingCurves', () => {
  it('preserves forgetting curves through a save/load round-trip', () => {
    const now = Date.now();
    const sig = createSignificator('fc-roundtrip', altitudes, 'Red');
    const withCurves = {
      ...sig,
      knowledge: {
        ...sig.knowledge!,
        forgettingCurves: new Map([
          ['cs.foundations.programming', {
            conceptId: 'cs.foundations.programming',
            firstLearnedAt: now - 86_400_000,
            lastRetrievedAt: now - 3_600_000,
            retention: 0.82,
            retrievalCount: 4,
            halfLifeMs: 3 * 86_400_000,
          }],
        ]),
      },
    };
    const serialized = JSON.parse(JSON.stringify({
      ...withCurves,
      knowledge: {
        ...withCurves.knowledge,
        // Mirror serializeSignificator's Map → object conversion.
        forgettingCurves: Object.fromEntries(withCurves.knowledge!.forgettingCurves as unknown as Map<string, unknown>),
      },
    }));
    const loaded = validateSignificator(serialized);
    expect(loaded).not.toBeNull();
    const fc = (loaded!.knowledge!.forgettingCurves as unknown as Map<string, any>).get('cs.foundations.programming');
    expect(fc).toBeDefined();
    expect(fc.retention).toBe(0.82);
    expect(fc.retrievalCount).toBe(4);
    expect(fc.halfLifeMs).toBe(3 * 86_400_000);
  });
});

describe('FIX: estimateResponseQuality rewards substance, not verbosity', () => {
  function qualityViaLoop(narrative: string): number {
    // Drive estimateResponseQuality through the public surface: applyResponseOnly
    // records a RecentEncounter with the estimated quality; endSession then
    // counts completions — we instead read quality via tickWithStrategy's
    // recentOutcomes path.
    const sig = createSignificator('q-' + narrative.length, altitudes, 'Red');
    const session: any = { targetSessionLength: 5, encountersSoFar: 0, recentLines: ['Cognitive'] };
    const sessionState = startSession(sig, session);
    const world = makeWorld();
    const now = Date.now();
    // Schedule an encounter, then apply a response against it.
    const { tickResult, sessionState: s2 } = tickWithStrategy(sig, world, session, sessionState, null, null, now);
    const encounter = tickResult.encounters[0]!;
    const response = {
      encounterId: encounter.id,
      energeticDirection: 'Radiative' as const,
      driveDirectionality: {
        Agency: 'HealthyBalanced' as const, Communion: 'HealthyBalanced' as const,
        Eros: 'HealthyBalanced' as const, Agape: 'HealthyBalanced' as const,
      },
      stageOrientation: 'ReachingHigher' as const,
      sourceOfNourishment: 'HigherRealm' as const,
      shadowSurfaced: null,
      shadowResolvedId: null,
      narrativeSummary: narrative,
    };
    const { sessionState: s3 } = tickWithStrategy(sig, world, session, s2, response as any, encounter, now);
    return s3.recentOutcomes[0]?.quality ?? -1;
  }

  it('saturates: a 400-word answer scores no higher than a 40-word answer', () => {
    const w40 = Array.from({ length: 40 }, (_, i) => `w${i}`).join(' ');
    const w400 = Array.from({ length: 400 }, (_, i) => `w${i}`).join(' ');
    const q40 = qualityViaLoop(w40);
    const q400 = qualityViaLoop(w400);
    // Pre-fix behavior was length-classed (+0.10 for >100 chars, +0.05 for
    // >50) — verbosity was continuously rewarded up to the class boundary.
    // Now the word bonus caps at 40 words.
    expect(q400).toBeCloseTo(q40, 10);
  });

  it('bounds the verbosity gap: a 15-word answer is within one tier of a 60-word one', () => {
    const short = Array.from({ length: 15 }, (_, i) => `w${i}`).join(' ');
    const padded = Array.from({ length: 60 }, (_, i) => `w${i}`).join(' ');
    const qShort = qualityViaLoop(short);
    const qPadded = qualityViaLoop(padded);
    expect(qPadded - qShort).toBeLessThanOrEqual(0.031);
    expect(qShort).toBeGreaterThan(0.5); // still earns its word-tier bonus
  });

  it('still rewards genuinely long reflective answers (saturating, not punitive)', () => {
    const reflective = Array.from({ length: 45 }, (_, i) => `word${i}`).join(' ');
    const q = qualityViaLoop(reflective);
    expect(q).toBeGreaterThan(0.5);
  });

  it('does not reward sub-threshold filler over a bare completion', () => {
    const qBare = qualityViaLoop('yes');
    const qShort = qualityViaLoop('a few words');
    expect(qShort).toBeGreaterThanOrEqual(qBare);
  });
});

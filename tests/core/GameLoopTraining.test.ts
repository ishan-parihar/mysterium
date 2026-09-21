import { describe, it, expect } from 'vitest';
import { startSession, tickWithStrategy } from '../../src/core/GameLoop.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';
import type { Holon } from '../../src/core/world/Holon.js';
import type { WorldState } from '../../src/core/engines/CandidateGeneration.js';

function makeHolon(id: string, line: Line, stage: Stage): Holon {
  return { id, name: id, kind: 'NPC', line, stage, drives: { dominant: 'Agency', secondary: 'Eros', shadowQuadrant: null }, polarity: 'Sovereign', narrativeRole: 'test', relationships: [], active: true };
}
const world: WorldState = {
  holons: [makeHolon('h1','Cognitive','Red'), makeHolon('h2','Emotional','Red'), makeHolon('h3','Moral','Red'), makeHolon('h4','Somatic','Red'), makeHolon('h5','Willpower','Red'), makeHolon('h6','Interpersonal','Red'), makeHolon('h7','Intrapersonal','Red'), makeHolon('h8','Spiritual','Red')],
  recentEncounterIds: [], cooldowns: {}, narrativeBeats: [], activeBeatId: null, completedBeatIds: [], factions: [], npcRelationships: [], pestleTension: { political:0, economic:0, social:0, technological:0, legal:0, environmental:0 }, activeMacroEvents: [],
};
const altitudes: Record<Line, Stage> = { Cognitive:'Red', Emotional:'Red', Moral:'Red', Intrapersonal:'Red', Spiritual:'Red', Somatic:'Red', Willpower:'Red', Interpersonal:'Red' };

describe('GameLoop training beats', () => {
  it('weaves training beats into sessions with >=8 encounters', () => {
    const sig = createSignificator('p1', altitudes, 'Red');
    const session = { encountersSoFar: 0, sessionDurationMs: 0, targetSessionLength: 8, recentLines: [] };
    let state = startSession(sig, session);
    expect(state.strategy.trainingSlots).toBeGreaterThan(0);
    let tick = tickWithStrategy(sig, world, session, state, null, null, Date.now());
    state = tick.sessionState;
    // Second tick should weave (encountersSinceRefresh 2, slots >0)
    tick = tickWithStrategy(tick.tickResult.sig, tick.tickResult.world, session, state, null, null, Date.now() + 5000);
    const hasTraining = tick.tickResult.encounters.some((e) => (e as any).isTrainingBeat) || tick.tickResult.encounter?.isTrainingBeat;
    expect(hasTraining).toBe(true);
    const beat = tick.tickResult.encounters.find((e) => (e as any).isTrainingBeat) ?? tick.tickResult.encounter;
    expect((beat as any).trainingParadigmId).toBeTruthy();
  });

  it('does not weave training beats for short sessions (<4)', () => {
    const sig = createSignificator('p1', altitudes, 'Red');
    const session = { encountersSoFar: 0, sessionDurationMs: 0, targetSessionLength: 3, recentLines: [] };
    const state = startSession(sig, session);
    expect(state.strategy.trainingSlots).toBe(0);
    const tick = tickWithStrategy(sig, world, session, state, null, null, Date.now());
    expect(tick.tickResult.encounters.some((e) => (e as any).isTrainingBeat)).toBe(false);
  });

  it('does not weave during threshold phase', () => {
    const sig = createSignificator('p1', altitudes, 'Red');
    (sig as any).transformationPhase = 'crucible';
    const session = { encountersSoFar: 0, sessionDurationMs: 0, targetSessionLength: 12, recentLines: [] };
    let state = startSession(sig, session);
    state = { ...state, transformationState: { ...state.transformationState, phase: 'crucible' as any } };
    const tick = tickWithStrategy(sig, world, session, state, null, null, Date.now());
    expect(tick.sessionState.trainingEncountersThisSession).toBe(0);
  });
});

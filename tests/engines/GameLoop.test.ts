import { describe, it, expect } from 'vitest';
import { tickWithStrategy, startSession } from '../../src/core/GameLoop.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';
import type { Holon } from '../../src/core/world/Holon.js';
import type { WorldState } from '../../src/core/engines/CandidateGeneration.js';
import type { SessionContext } from '../../src/core/engines/PriorityComputation.js';
import type { PlayerResponse } from '../../src/core/engines/ConsequenceEngine.js';
// @ts-ignore — retained for future test expansion
// eslint-disable-next-line
const _makeResponse = (encounterId: string): PlayerResponse => ({
  encounterId,
  energeticDirection: 'Radiative' as const,
  driveDirectionality: { Agency: 'HealthyBalanced' as const, Communion: 'HealthyBalanced' as const, Eros: 'HealthyBalanced' as const, Agape: 'HealthyBalanced' as const },
  stageOrientation: 'ReachingHigher' as const,
  sourceOfNourishment: 'HigherRealm' as const,
  shadowSurfaced: null,
  shadowResolvedId: null,
  narrativeSummary: 'Test response.',
});
void _makeResponse;

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

const world: WorldState = {
  holons: [
    makeHolon('h1', 'Cognitive', 'Red'),
    makeHolon('h2', 'Emotional', 'Red'),
    makeHolon('h3', 'Moral', 'Red'),
    makeHolon('h4', 'Somatic', 'Red'),
    makeHolon('h5', 'Willpower', 'Red'),
    makeHolon('h6', 'Interpersonal', 'Red'),
    makeHolon('h7', 'Intrapersonal', 'Red'),
    makeHolon('h8', 'Spiritual', 'Red'),
  ],
  recentEncounterIds: [],
  cooldowns: {},
  narrativeBeats: [],
  activeBeatId: null,
  completedBeatIds: [],
  factions: [],
  npcRelationships: [],
  pestleTension: { political: 0, economic: 0, social: 0, technological: 0, legal: 0, environmental: 0 },
  activeMacroEvents: [],
};

const session: SessionContext = {
  encountersSoFar: 0,
  sessionDurationMs: 0,
  targetSessionLength: 10,
  recentLines: [],
};

describe('GameLoop', () => {
  it('produces an encounter on first tick', () => {
    const sig = createSignificator('p1', altitudes, 'Red');
    const sessionState = startSession(sig, session);
    const { tickResult } = tickWithStrategy(sig, world, session, sessionState, null, null, Date.now());
    expect(tickResult.encounter).not.toBeNull();
  });

  it('runs 20 ticks without crashing', () => {
    let sig = createSignificator('p1', altitudes, 'Red');
    let w = world;
    let now = Date.now();
    let sessionState = startSession(sig, session);

    for (let i = 0; i < 20; i++) {
      const { tickResult, sessionState: newState } = tickWithStrategy(
        sig, w, { ...session, encountersSoFar: i }, sessionState, null, null, now,
      );
      sig = tickResult.sig;
      w = tickResult.world;
      sessionState = newState;
      now += 60000;
    }

    expect(sig.totalEncounters).toBeGreaterThanOrEqual(0);
  });

  it('detects bleed-through for stale cells', () => {
    const staleSig = {
      ...createSignificator('p1', altitudes, 'Red'),
      theta: { lastEncounter: { 'Cognitive:Red': 0 } },
    };
    const now = 30 * 24 * 60 * 60 * 1000; // 30 days later
    const sessionState = startSession(staleSig, session);
    const { tickResult } = tickWithStrategy(staleSig, world, session, sessionState, null, null, now);
    expect(tickResult.bleedThrough.length).toBeGreaterThan(0);
    expect(tickResult.bleedThrough).toContain('Cognitive:Red');
  });
});

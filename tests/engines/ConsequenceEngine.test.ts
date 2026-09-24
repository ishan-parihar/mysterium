import { describe, it, expect } from 'vitest';
import { processOutcome, applyConsequences, type PlayerResponse } from '../../src/core/engines/ConsequenceEngine.js';
import type { ScheduledEncounter } from '../../src/core/domain/EncounterSpecNew.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';
import type { WorldState } from '../../src/core/engines/CandidateGeneration.js';

const altitudes: Record<Line, Stage> = {
  Cognitive: 'Red', Emotional: 'Red', Moral: 'Red', Intrapersonal: 'Red',
  Spiritual: 'Red', Somatic: 'Red', Willpower: 'Red', Interpersonal: 'Red',
};

const mockEncounter: ScheduledEncounter = {
  id: 'Cognitive/Red:h1:1000',
  moduleRef: 'Cognitive/Red',
  modality: 'ImmersiveRPG',
  targetLines: ['Cognitive'],
  stage: 'Red',
  holonSource: 'h1',
  shadowTarget: null,
  polarityMode: 'Exploring',
  difficulty: 0.5,
  sessionPosition: 'peak',
  priority: 0.8,
  driveTarget: null,
  executionMode: 'capacity',
};

const mockResponse: PlayerResponse = {
  encounterId: 'Cognitive/Red:h1:1000',
  energeticDirection: 'Radiative',
  driveDirectionality: { Agency: 'HealthyBalanced', Communion: 'HealthyBalanced', Eros: 'HealthyBalanced', Agape: 'HealthyBalanced' },
  stageOrientation: 'ReachingHigher',
  sourceOfNourishment: 'HigherRealm',
  shadowSurfaced: null,
  shadowResolvedId: null,
  narrativeSummary: 'Player chose to help the stranger.',
};

describe('ConsequenceEngine', () => {
  describe('processOutcome', () => {
    it('produces a valid ConsequenceRecord', () => {
      const record = processOutcome(mockEncounter, mockResponse, 1000);
      expect(record.encounterId).toBe(mockEncounter.id);
      expect(record.polarityTrace.energeticDirection).toBe('Radiative');
      expect(record.timestamp).toBe(1000);
    });

    it('records shadow surfacing', () => {
      const resp = { ...mockResponse, shadowSurfaced: 'DarkAddiction' as const };
      const record = processOutcome(mockEncounter, resp, 1000);
      expect(record.shadowSurfaced).toBe('DarkAddiction');
    });

    // F7: the free text is the evidence for the reflective and immersion modalities. It used to be
    // collected on `PlayerResponse` and dropped here, so only code holding that transient object
    // could read the player's own words — and nothing could read them off a record.
    it('carries the player\'s write-in and the question onto the record', () => {
      const resp = {
        ...mockResponse,
        writeInValue: 'I told her the truth even though it cost me the deal.',
        questionText: 'What would you say if no one were watching?',
      };
      const record = processOutcome(mockEncounter, resp, 1000);
      expect(record.writeInValue).toBe('I told her the truth even though it cost me the deal.');
      expect(record.questionText).toBe('What would you say if no one were watching?');
    });

    it('leaves both absent when no write-in was given — they do not imply each other', () => {
      const record = processOutcome(mockEncounter, mockResponse, 1000);
      expect(record.writeInValue).toBeUndefined();
      expect(record.questionText).toBeUndefined();
    });
  });

  describe('applyConsequences', () => {
    it('increments totalEncounters', () => {
      const sig = createSignificator('p1', altitudes, 'Red');
      const world: WorldState = { holons: [], recentEncounterIds: [], cooldowns: {}, narrativeBeats: [], activeBeatId: null, completedBeatIds: [], factions: [], npcRelationships: [], pestleTension: { political: 0, economic: 0, social: 0, technological: 0, legal: 0, environmental: 0 }, activeMacroEvents: [] };
      const record = processOutcome(mockEncounter, mockResponse, 1000);
      const result = applyConsequences(sig, world, record, mockEncounter);
      expect(result.sig.totalEncounters).toBe(1);
    });

    it('updates theta timestamps', () => {
      const sig = createSignificator('p1', altitudes, 'Red');
      const world: WorldState = { holons: [], recentEncounterIds: [], cooldowns: {}, narrativeBeats: [], activeBeatId: null, completedBeatIds: [], factions: [], npcRelationships: [], pestleTension: { political: 0, economic: 0, social: 0, technological: 0, legal: 0, environmental: 0 }, activeMacroEvents: [] };
      const record = processOutcome(mockEncounter, mockResponse, 5000);
      const result = applyConsequences(sig, world, record, mockEncounter);
      expect(result.sig.theta.lastEncounter['Cognitive:Red']).toBe(5000);
    });

    it('adds shadow entry when shadow surfaced with non-healthy drive', () => {
      const sig = createSignificator('p1', altitudes, 'Red');
      const world: WorldState = { holons: [], recentEncounterIds: [], cooldowns: {}, narrativeBeats: [], activeBeatId: null, completedBeatIds: [], factions: [], npcRelationships: [], pestleTension: { political: 0, economic: 0, social: 0, technological: 0, legal: 0, environmental: 0 }, activeMacroEvents: [] };
      // Shadow surfaced + non-healthy drive = shadow stays unresolved
      const resp = { ...mockResponse, shadowSurfaced: 'GoldenAllergy' as const, driveDirectionality: { Agency: 'HealthyBalanced', Communion: 'HealthyBalanced', Eros: 'HealthyBalanced', Agape: 'GoldenAverted' } as const };
      const record = processOutcome(mockEncounter, resp, 1000);
      const result = applyConsequences(sig, world, record, mockEncounter);
      expect(result.sig.shadows.activeCount).toBe(1);
    });

    it('auto-resolves shadow when all drives healthy (integration through passing)', () => {
      const sig = createSignificator('p1', altitudes, 'Red');
      const world: WorldState = { holons: [], recentEncounterIds: [], cooldowns: {}, narrativeBeats: [], activeBeatId: null, completedBeatIds: [], factions: [], npcRelationships: [], pestleTension: { political: 0, economic: 0, social: 0, technological: 0, legal: 0, environmental: 0 }, activeMacroEvents: [] };
      // Shadow surfaced + ALL drives healthy = shadow immediately resolved (integration)
      const resp = { ...mockResponse, shadowSurfaced: 'GoldenAllergy' as const };
      const record = processOutcome(mockEncounter, resp, 1000);
      const result = applyConsequences(sig, world, record, mockEncounter);
      expect(result.sig.shadows.entries.length).toBe(1);
      expect(result.sig.shadows.activeCount).toBe(0);
      expect(result.sig.shadows.entries[0].resolvedAt).toBe(1000);
    });

    it('updates world.npcRelationships and world.recentEncounterIds using record.holonDeltas', () => {
      const sig = createSignificator('p1', altitudes, 'Red');
      const world: WorldState = {
        holons: [],
        recentEncounterIds: [],
        cooldowns: {},
        narrativeBeats: [],
        activeBeatId: null,
        completedBeatIds: [],
        factions: [],
        npcRelationships: [],
        pestleTension: { political: 0, economic: 0, social: 0, technological: 0, legal: 0, environmental: 0 },
        activeMacroEvents: []
      };
      
      const record = {
        ...processOutcome(mockEncounter, mockResponse, 1000),
        holonDeltas: [
          { holonId: 'h1', field: 'relationshipStrength', oldValue: 0.5, newValue: 0.6 }
        ]
      };
      
      const result = applyConsequences(sig, world, record, mockEncounter);
      
      expect(result.world.recentEncounterIds).toContain(mockEncounter.id);
      const rel = result.world.npcRelationships.find(r => r.holonId === 'h1');
      expect(rel).toBeDefined();
      expect(rel?.strength).toBeCloseTo(0.6);
      expect(rel?.encounters).toBe(1);
      expect(rel?.lastEncounterAt).toBe(1000);
    });
  });
});

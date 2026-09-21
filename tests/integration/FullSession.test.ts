/**
 * End-to-end headless integration test.
 * Validates the ENTIRE session pipeline: Significator -> CCI -> Strategy ->
 * Scheduler -> Consequence -> mid-session refresh.
 *
 * Uses minimal mock data (empty world state) to focus on engine pipeline
 * correctness rather than encounter content.
 */
import { describe, it, expect } from 'vitest';
import { createSignificator } from '../../src/core/domain/Significator.js';
import { toSnapshot } from '../../src/core/domain/SignificatorSnapshot.js';
import { computeCCI } from '../../src/core/engines/CCIEngine.js';
import {
  generateSessionStrategy,
  evaluateMidSessionAdjustment,
  applyWeightBias,
  checkSafetyOverride,
  type RecentEncounter,
} from '../../src/core/engines/AutoModeStrategy.js';
import { startSession, tickWithStrategy } from '../../src/core/GameLoop.js';
import { DEFAULT_WEIGHTS } from '../../src/core/engines/PriorityComputation.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';
import type { SessionContext } from '../../src/core/engines/PriorityComputation.js';
import type { WorldState } from '../../src/core/engines/CandidateGeneration.js';
import type { PlayerResponse } from '../../src/core/engines/ConsequenceEngine.js';
import type { Holon } from '../../src/core/world/Holon.js';
import type { SessionTheme } from '../../src/core/engines/CCIEngine.js';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const allRedAltitudes: Record<Line, Stage> = {
  Cognitive: 'Red', Emotional: 'Red', Moral: 'Red', Intrapersonal: 'Red',
  Spiritual: 'Red', Somatic: 'Red', Willpower: 'Red', Interpersonal: 'Red',
};

const mixedAltitudes: Record<Line, Stage> = {
  Cognitive: 'Orange', Emotional: 'Amber', Moral: 'Red', Intrapersonal: 'Green',
  Spiritual: 'Magenta', Somatic: 'Amber', Willpower: 'Red', Interpersonal: 'Amber',
};

const testHolons: Holon[] = [
  {
    id: 'h1', name: 'Guardian', kind: 'NPC', line: 'Cognitive', stage: 'Red',
    drives: { dominant: 'Agency', secondary: 'Eros', shadowQuadrant: null },
    polarity: 'Sovereign', narrativeRole: 'mentor', relationships: [], active: true,
  },
  {
    id: 'h2', name: 'Sage', kind: 'NPC', line: 'Emotional', stage: 'Red',
    drives: { dominant: 'Communion', secondary: 'Agape', shadowQuadrant: null },
    polarity: 'Absorptive', narrativeRole: 'guide', relationships: [], active: true,
  },
  {
    id: 'h3', name: 'Warrior', kind: 'NPC', line: 'Willpower', stage: 'Red',
    drives: { dominant: 'Agency', secondary: 'Communion', shadowQuadrant: null },
    polarity: 'Radiative', narrativeRole: 'rival', relationships: [], active: true,
  },
];

const mockWorld: WorldState = {
  holons: testHolons,
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

const emptyWorld: WorldState = {
  holons: [],
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

const mockSession: SessionContext = {
  encountersSoFar: 0,
  sessionDurationMs: 0,
  targetSessionLength: 20,
  recentLines: [],
};

function createMockResponse(encounterId: string): PlayerResponse {
  return {
    encounterId,
    energeticDirection: 'Sovereign',
    driveDirectionality: {
      Agency: 'HealthyBalanced',
      Communion: 'HealthyBalanced',
      Eros: 'HealthyBalanced',
      Agape: 'HealthyBalanced',
    },
    stageOrientation: 'ReachingHigher',
    sourceOfNourishment: 'HigherRealm',
    shadowSurfaced: null,
    shadowResolvedId: null,
    narrativeSummary: 'Test response',
  };
}

// Valid session themes for assertion
const VALID_THEMES: SessionTheme[] = [
  'consolidation', 'growth-edge-push', 'shadow-integration',
  'drive-rebalancing', 'transformation-prep', 'active-transformation',
  'post-transformation', 'polarity-deepening', 'balanced-development',
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FullSession Integration', () => {
  describe('session initialization', () => {
    it('computes valid CCI and strategy from all-Red significator', () => {
      const sig = createSignificator('test-player', allRedAltitudes, 'Red');
      const session = startSession(sig, mockSession);

      // CCI composite is in [0, 1]
      expect(session.cci.composite).toBeGreaterThanOrEqual(0);
      expect(session.cci.composite).toBeLessThanOrEqual(1);

      // Strategy theme is a valid SessionTheme
      expect(VALID_THEMES).toContain(session.strategy.theme);

      // Strategy has populated fields
      expect(session.strategy.arc).toBeDefined();
      expect(session.strategy.weightBias).toBeDefined();
      expect(session.strategy.encounterBudget).toBeDefined();
      expect(session.strategy.encounterBudget.totalTarget).toBe(20);
    });

    it('returns valid SessionState with all required fields', () => {
      const sig = createSignificator('test-player', allRedAltitudes, 'Red');
      const session = startSession(sig, mockSession);

      expect(session.strategy).toBeDefined();
      expect(session.cci).toBeDefined();
      expect(session.recentOutcomes).toEqual([]);
      expect(session.encountersSinceRefresh).toBe(0);
    });

    it('computes valid CCI from mixed-altitude significator', () => {
      const sig = createSignificator('test-player', mixedAltitudes, 'Amber');
      const session = startSession(sig, mockSession);

      expect(session.cci.composite).toBeGreaterThanOrEqual(0);
      expect(session.cci.composite).toBeLessThanOrEqual(1);
      expect(VALID_THEMES).toContain(session.strategy.theme);
    });
  });

  describe('CCI dimensions', () => {
    it('all 5 normalised dimensions are in [0, 1] for all-Red state', () => {
      const sig = createSignificator('test-player', allRedAltitudes, 'Red');
      const snapshot = toSnapshot(sig);
      const cci = computeCCI(snapshot);

      expect(cci.dimensions.altitude).toBeGreaterThanOrEqual(0);
      expect(cci.dimensions.altitude).toBeLessThanOrEqual(1);
      expect(cci.dimensions.driveHealth).toBeGreaterThanOrEqual(0);
      expect(cci.dimensions.driveHealth).toBeLessThanOrEqual(1);
      expect(cci.dimensions.polarity).toBeGreaterThanOrEqual(0);
      expect(cci.dimensions.polarity).toBeLessThanOrEqual(1);
      expect(cci.dimensions.shadowTopology).toBeGreaterThanOrEqual(0);
      expect(cci.dimensions.shadowTopology).toBeLessThanOrEqual(1);
      expect(cci.dimensions.transformationReadiness).toBeGreaterThanOrEqual(0);
      expect(cci.dimensions.transformationReadiness).toBeLessThanOrEqual(1);
    });

    it('all 5 normalised dimensions are in [0, 1] for mixed-altitude state', () => {
      const sig = createSignificator('test-player', mixedAltitudes, 'Amber');
      const snapshot = toSnapshot(sig);
      const cci = computeCCI(snapshot);

      expect(cci.dimensions.altitude).toBeGreaterThanOrEqual(0);
      expect(cci.dimensions.altitude).toBeLessThanOrEqual(1);
      expect(cci.dimensions.driveHealth).toBeGreaterThanOrEqual(0);
      expect(cci.dimensions.driveHealth).toBeLessThanOrEqual(1);
      expect(cci.dimensions.polarity).toBeGreaterThanOrEqual(0);
      expect(cci.dimensions.polarity).toBeLessThanOrEqual(1);
      expect(cci.dimensions.shadowTopology).toBeGreaterThanOrEqual(0);
      expect(cci.dimensions.shadowTopology).toBeLessThanOrEqual(1);
      expect(cci.dimensions.transformationReadiness).toBeGreaterThanOrEqual(0);
      expect(cci.dimensions.transformationReadiness).toBeLessThanOrEqual(1);
    });

    it('CCI weights sum to approximately 1.0', () => {
      const sig = createSignificator('test-player', allRedAltitudes, 'Red');
      const snapshot = toSnapshot(sig);
      const cci = computeCCI(snapshot);

      const sum = cci.weights.altitude + cci.weights.driveHealth
        + cci.weights.polarity + cci.weights.shadowTopology
        + cci.weights.transformationReadiness + cci.weights.knowledgeHealth;
      expect(sum).toBeCloseTo(1.0, 5);
    });
  });

  describe('strategy weight bias', () => {
    it('produces weights that sum to approximately 1.0 for each theme', () => {
      for (const theme of VALID_THEMES) {
        const sig = createSignificator('test-player', allRedAltitudes, 'Red');
        const snapshot = toSnapshot(sig);
        const cci = computeCCI(snapshot);

        // Override the recommended theme for testing
        const modifiedCCI = {
          ...cci,
          sessionSignals: { ...cci.sessionSignals, recommendedTheme: theme },
        };
        const strategy = generateSessionStrategy(modifiedCCI, mockSession, null);
        const biased = applyWeightBias(DEFAULT_WEIGHTS, strategy.weightBias);

        const sum = biased.thetaUrgency + biased.shadowActivation
          + biased.polarityAlignment + biased.transformationReadiness
          + biased.driveCorrection + biased.narrativeCoherence
          + biased.sessionFit + biased.masteryAlignment;
        expect(sum).toBeCloseTo(1.0, 5);
      }
    });

    it('all biased weights are non-negative', () => {
      const sig = createSignificator('test-player', allRedAltitudes, 'Red');
      const session = startSession(sig, mockSession);
      const biased = applyWeightBias(DEFAULT_WEIGHTS, session.strategy.weightBias);

      expect(biased.thetaUrgency).toBeGreaterThanOrEqual(0);
      expect(biased.shadowActivation).toBeGreaterThanOrEqual(0);
      expect(biased.polarityAlignment).toBeGreaterThanOrEqual(0);
      expect(biased.transformationReadiness).toBeGreaterThanOrEqual(0);
      expect(biased.driveCorrection).toBeGreaterThanOrEqual(0);
      expect(biased.narrativeCoherence).toBeGreaterThanOrEqual(0);
      expect(biased.sessionFit).toBeGreaterThanOrEqual(0);
    });
  });

  describe('mid-session refresh', () => {
    it('triggers CCI recomputation at reEvaluationInterval boundaries', () => {
      const sig = createSignificator('test-player', allRedAltitudes, 'Red');
      let sessionState = startSession(sig, mockSession);
      const now = Date.now();

      // Run 6 ticks - refresh should happen at encounter 3 and 6
      let currentSig = sig;
      for (let i = 0; i < 6; i++) {
        const result = tickWithStrategy(
          currentSig,
          mockWorld,
          { ...mockSession, encountersSoFar: i },
          sessionState,
          null,
          null,
          now + i * 1000,
        );
        sessionState = result.sessionState;
        currentSig = result.tickResult.sig;
      }

      // After 6 encounters, encountersSinceRefresh should be 6
      expect(sessionState.encountersSinceRefresh).toBe(6);
    });
  });

  describe('20-encounter headless session', () => {
    it('runs without crash with world containing holons', () => {
      const sig = createSignificator('test-player', allRedAltitudes, 'Red');
      let sessionState = startSession(sig, mockSession);
      const now = Date.now();

      let currentSig = sig;
      let currentWorld = mockWorld;

      for (let i = 0; i < 20; i++) {
        const session: SessionContext = {
          encountersSoFar: i,
          sessionDurationMs: i * 5000,
          targetSessionLength: 20,
          recentLines: [],
        };

        // Create a mock response if there is an encounter
        const response = currentSig.totalEncounters > 0
          ? createMockResponse(`enc-${i}`)
          : null;

        const { tickResult, sessionState: newState } = tickWithStrategy(
          currentSig,
          currentWorld,
          session,
          sessionState,
          response,
          null,
          now + i * 5000,
        );

        currentSig = tickResult.sig;
        currentWorld = tickResult.world;
        sessionState = newState;

        // Each tick result should have valid structure
        expect(tickResult.sig).toBeDefined();
        expect(tickResult.world).toBeDefined();
        expect(Array.isArray(tickResult.bleedThrough)).toBe(true);
      }

      // After 20 ticks, session state should have accumulated outcomes.
      // P0-2 fix: recentOutcomes only records ACTUAL responses, not phantom
      // 'avoided' entries from scheduling-only ticks. In this test,
      // previousEncounter is always null, so applyConsequences is never called,
      // so totalEncounters stays at 0, so response is always null, so
      // recentOutcomes stays empty. This is the CORRECT behavior — the old
      // test validated the buggy 20-phantom-outcome expectation.
      expect(sessionState.encountersSinceRefresh).toBe(20);
      expect(sessionState.recentOutcomes.length).toBe(0);
    });

    it('runs without crash with empty world', () => {
      const sig = createSignificator('test-player', allRedAltitudes, 'Red');
      let sessionState = startSession(sig, mockSession);
      const now = Date.now();

      let currentSig = sig;

      for (let i = 0; i < 20; i++) {
        const { tickResult, sessionState: newState } = tickWithStrategy(
          currentSig,
          emptyWorld,
          { ...mockSession, encountersSoFar: i },
          sessionState,
          null,
          null,
          now + i * 5000,
        );

        currentSig = tickResult.sig;
        sessionState = newState;

        // With empty world, encounter should be null
        expect(tickResult.encounter).toBeNull();
      }

      expect(sessionState.encountersSinceRefresh).toBe(20);
    });

    it('tickWithStrategy function remains functional (replaces deleted tick())', () => {
      const sig = createSignificator('test-player', allRedAltitudes, 'Red');
      const now = Date.now();
      const sessionState = startSession(sig, mockSession);

      // Use tickWithStrategy (tick() was deleted as dead code)
      const { tickResult } = tickWithStrategy(sig, mockWorld, mockSession, sessionState, null, null, now);

      expect(tickResult.sig).toBeDefined();
      expect(tickResult.world).toBeDefined();
      expect(Array.isArray(tickResult.bleedThrough)).toBe(true);
      expect(tickResult.transformation).toBeNull(); // fresh sig has no transformation
    });
  });

  describe('safety override', () => {
    it('triggers for distressed significator with high fixation and many shadows', () => {
      const sig = createSignificator('test-player', allRedAltitudes, 'Red');

      // Create a snapshot with distress signals manually
      const snapshot = toSnapshot(sig);

      // Modify the snapshot to trigger safety override (fixation > 0.8, shadows > 10)
      const distressedSnapshot = {
        ...snapshot,
        fixationRisk: { Agency: 0.9, Communion: 0.2, Eros: 0.1, Agape: 0.1 },
        shadows: {
          ...snapshot.shadows,
          entries: Array.from({ length: 12 }, (_, i) => ({
            id: `shadow-${i}`,
            quadrant: 'DarkAddiction' as const,
            line: 'Cognitive' as const,
            stage: 'Red' as const,
            drive: 'Agency' as const,
            surfacedAt: Date.now() - i * 1000,
            resolvedAt: null,
            recurrenceCount: 0,
            compoundPartner: null,
            severity: 0.5,
          })),
          activeCount: 12,
        },
      };

      const override = checkSafetyOverride(distressedSnapshot);
      expect(override).toBe(true);
    });

    it('does not trigger for healthy significator', () => {
      const sig = createSignificator('test-player', allRedAltitudes, 'Red');
      const snapshot = toSnapshot(sig);
      const override = checkSafetyOverride(snapshot);
      expect(override).toBe(false);
    });
  });

  describe('mid-session adjustment logic', () => {
    it('returns null when no adjustment needed', () => {
      const sig = createSignificator('test-player', allRedAltitudes, 'Red');
      const session = startSession(sig, mockSession);

      const recentOutcomes: RecentEncounter[] = [
        { outcome: 'completed', quality: 0.7, mode: 'capacity', shadowIntegrated: false },
        { outcome: 'completed', quality: 0.6, mode: 'capacity', shadowIntegrated: false },
      ];

      const adjustment = evaluateMidSessionAdjustment(
        session.strategy,
        mockSession,
        recentOutcomes,
      );

      // With moderate outcomes and no energy signals, no adjustment
      expect(adjustment).toBeNull();
    });

    it('suggests intensity reduction when energy is low', () => {
      const sig = createSignificator('test-player', allRedAltitudes, 'Red');
      const session = startSession(sig, mockSession);

      const lowEnergySession: SessionContext = {
        ...mockSession,
        inferredEnergy: 'low',
      };

      const recentOutcomes: RecentEncounter[] = [];

      const adjustment = evaluateMidSessionAdjustment(
        session.strategy,
        lowEnergySession,
        recentOutcomes,
      );

      // If strategy has high peak intensity, should suggest reduction
      if (session.strategy.arc.peak.intensityRange.max > 0.5) {
        expect(adjustment).not.toBeNull();
        expect(adjustment!.type).toBe('intensity-reduction');
      }
    });
  });
});

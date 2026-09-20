import { describe, it, expect } from 'vitest';
import {
  computeCCI,
  normaliseAltitude,
  normaliseDriveHealth,
  normalisePolarity,
  normaliseShadowTopology,
  normaliseTransformationReadiness,
  adjustWeights,
  selectSessionTheme,
  computeIntensityBudget,
  classifyShadowPressure,
  classifyTransformationProximity,
  identifyRebalancingTarget,
  derivePolarityGuidance,
  DEFAULT_CCI_WEIGHTS,
} from '../../src/core/engines/CCIEngine.js';
import type {
  AltitudeInput,
  DriveHealthInput,
  PolarityInput,
  ShadowTopologyInput,
  TransformationReadinessInput,
} from '../../src/core/engines/CCIEngine.js';
import type { SignificatorSnapshot } from '../../src/core/domain/SignificatorSnapshot.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';
import type { Drive } from '../../src/core/domain/Drive.js';

// ---------------------------------------------------------------------------
// Test helpers: factory functions for minimal valid inputs
// ---------------------------------------------------------------------------

function makeAltitudeInput(overrides: Partial<AltitudeInput> = {}): AltitudeInput {
  return {
    perLineAltitudes: {
      Cognitive: 'Red', Emotional: 'Red', Moral: 'Red', Intrapersonal: 'Red',
      Spiritual: 'Red', Somatic: 'Red', Willpower: 'Red', Interpersonal: 'Red',
    } as Record<Line, Stage>,
    centreOfGravity: 'Red',
    spread: 0,
    lowestAltitude: 'Red',
    highestAltitude: 'Red',
    linesAtEdge: 8,
    ...overrides,
  };
}

function makeDriveHealthInput(overrides: Partial<DriveHealthInput> = {}): DriveHealthInput {
  return {
    balance: { Agency: 0, Communion: 0, Eros: 0, Agape: 0 },
    fixationRisk: { Agency: 0, Communion: 0, Eros: 0, Agape: 0 },
    maxImbalance: 0,
    maxFixationRisk: 0,
    complementaryTension: { agencyVsCommunion: 0, erosVsAgape: 0 },
    ...overrides,
  };
}

function makePolarityInput(overrides: Partial<PolarityInput> = {}): PolarityInput {
  return {
    masterMode: 'exploration',
    crystallizationIndex: 0,
    exploratoryBreadth: 0.5,
    coherentLineCount: 0,
    recentPolarityStability: 0,
    ...overrides,
  };
}

function makeShadowTopologyInput(overrides: Partial<ShadowTopologyInput> = {}): ShadowTopologyInput {
  return {
    unresolvedCount: 0,
    averageSeverity: 0,
    maxSeverity: 0,
    compoundPatternCount: 0,
    recentSurfacingRate: 1,
    integrationRate: 1,
    oldestUnresolvedAge: 0,
    ...overrides,
  };
}

function makeTransformationReadinessInput(
  overrides: Partial<TransformationReadinessInput> = {},
): TransformationReadinessInput {
  return {
    linesAtEdge: 2,
    shadowClearance: true,
    catalystSaturation: 0.5,
    pendingTransformation: false,
    targetStage: 'Amber',
    sessionsSinceLastTransformation: 10,
    ...overrides,
  };
}

function makeMinimalSnapshot(overrides: Partial<SignificatorSnapshot> = {}): SignificatorSnapshot {
  const allInfrared: Record<Line, Stage> = {
    Cognitive: 'Infrared', Emotional: 'Infrared', Moral: 'Infrared',
    Intrapersonal: 'Infrared', Spiritual: 'Infrared', Somatic: 'Infrared',
    Willpower: 'Infrared', Interpersonal: 'Infrared',
  };
  return {
    id: 'test-sig',
    altitudes: allInfrared,
    currentStage: 'Infrared',
    drives: { weights: { Agency: 0, Communion: 0, Eros: 0, Agape: 0 }, fixationRisk: { Agency: 0, Communion: 0, Eros: 0, Agape: 0 } },
    polarity: {
      cells: {},
      lineProfiles: {},
      master: { mode: 'Exploring' as const, dominantDirection: null, coherentLineCount: 0, crystallizationProgress: 0 },
    },
    shadows: { entries: [], activeCount: 0 },
    theta: { lastEncounter: {} },
    transformations: [],
    totalEncounters: 0,
    totalSessions: 10,
    driveBalance: { Agency: 0, Communion: 0, Eros: 0, Agape: 0 },
    fixationRisk: { Agency: 0, Communion: 0, Eros: 0, Agape: 0 },
    compoundShadows: [],
    recentEncounterHistory: [],
    transformationReadiness: {
      linesAtEdge: 0,
      shadowClearance: true,
      catalystSaturation: 0,
      pendingTransformation: false,
      targetStage: null,
      sessionsSinceLastTransformation: 10,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests: Normalisation functions
// ---------------------------------------------------------------------------

describe('CCIEngine', () => {
  describe('normaliseAltitude', () => {
    it('returns 0 for Infrared centre of gravity', () => {
      const input = makeAltitudeInput({
        centreOfGravity: 'Infrared',
        lowestAltitude: 'Infrared',
        highestAltitude: 'Infrared',
        spread: 0,
      });
      expect(normaliseAltitude(input)).toBe(0);
    });

    it('returns 1.0 for Turquoise centre of gravity with no penalties', () => {
      const input = makeAltitudeInput({
        centreOfGravity: 'Turquoise',
        lowestAltitude: 'Teal',
        highestAltitude: 'Turquoise',
        spread: 0,
      });
      expect(normaliseAltitude(input)).toBeCloseTo(1.0, 1);
    });

    it('applies holonic penalty when floor is far below CoG', () => {
      const noGap = makeAltitudeInput({
        centreOfGravity: 'Green',
        lowestAltitude: 'Orange',
        spread: 0,
      });
      const bigGap = makeAltitudeInput({
        centreOfGravity: 'Green',
        lowestAltitude: 'Infrared',
        spread: 0,
      });
      expect(normaliseAltitude(bigGap)).toBeLessThan(normaliseAltitude(noGap));
    });

    it('applies spread penalty for uneven development', () => {
      const evenDev = makeAltitudeInput({ centreOfGravity: 'Orange', spread: 0, lowestAltitude: 'Orange' });
      const unevenDev = makeAltitudeInput({ centreOfGravity: 'Orange', spread: 0.8, lowestAltitude: 'Orange' });
      expect(normaliseAltitude(unevenDev)).toBeLessThan(normaliseAltitude(evenDev));
    });

    it('always returns value in [0, 1]', () => {
      const input = makeAltitudeInput({ centreOfGravity: 'Infrared', lowestAltitude: 'Infrared', spread: 1.0 });
      const result = normaliseAltitude(input);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('normaliseDriveHealth', () => {
    it('returns 1.0 for perfectly balanced drives', () => {
      const input = makeDriveHealthInput({
        maxImbalance: 0,
        maxFixationRisk: 0,
        complementaryTension: { agencyVsCommunion: 0, erosVsAgape: 0 },
      });
      expect(normaliseDriveHealth(input)).toBe(1.0);
    });

    it('returns low value for high fixation risk', () => {
      const input = makeDriveHealthInput({
        maxImbalance: 0.8,
        maxFixationRisk: 0.9,
        complementaryTension: { agencyVsCommunion: 0.7, erosVsAgape: 0.6 },
      });
      expect(normaliseDriveHealth(input)).toBeLessThan(0.3);
    });

    it('always returns value in [0, 1]', () => {
      const input = makeDriveHealthInput({
        maxImbalance: 1.0,
        maxFixationRisk: 1.0,
        complementaryTension: { agencyVsCommunion: 1.0, erosVsAgape: 1.0 },
      });
      const result = normaliseDriveHealth(input);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('normalisePolarity', () => {
    it('returns low value for exploration mode with low breadth', () => {
      const input = makePolarityInput({ masterMode: 'exploration', exploratoryBreadth: 0.1 });
      expect(normalisePolarity(input)).toBeCloseTo(0.04);
    });

    it('returns mid-range for crystallizing', () => {
      const input = makePolarityInput({ masterMode: 'crystallizing', crystallizationIndex: 0.5 });
      expect(normalisePolarity(input)).toBeCloseTo(0.55);
    });

    it('returns high value for crystallized with high stability', () => {
      const input = makePolarityInput({ masterMode: 'crystallized', recentPolarityStability: 1.0 });
      expect(normalisePolarity(input)).toBe(1.0);
    });

    it('always returns value in [0, 1]', () => {
      const modes: Array<'exploration' | 'crystallizing' | 'crystallized'> = ['exploration', 'crystallizing', 'crystallized'];
      for (const mode of modes) {
        const input = makePolarityInput({ masterMode: mode, exploratoryBreadth: 1, crystallizationIndex: 1, recentPolarityStability: 1 });
        const result = normalisePolarity(input);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('normaliseShadowTopology', () => {
    it('returns 1.0 for empty shadow ledger', () => {
      const input = makeShadowTopologyInput();
      expect(normaliseShadowTopology(input)).toBeCloseTo(1.0, 1);
    });

    it('returns low value for maximum shadow load', () => {
      const input = makeShadowTopologyInput({
        unresolvedCount: 12,
        maxSeverity: 1.0,
        compoundPatternCount: 4,
        oldestUnresolvedAge: 20,
        integrationRate: 0,
        recentSurfacingRate: 1,
      });
      expect(normaliseShadowTopology(input)).toBeLessThan(0.15);
    });

    it('always returns value in [0, 1]', () => {
      const input = makeShadowTopologyInput({
        unresolvedCount: 20,
        maxSeverity: 1.0,
        compoundPatternCount: 10,
        oldestUnresolvedAge: 50,
        integrationRate: 0,
        recentSurfacingRate: 1,
      });
      const result = normaliseShadowTopology(input);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('normaliseTransformationReadiness', () => {
    it('returns 1.0 for pending transformation', () => {
      const input = makeTransformationReadinessInput({ pendingTransformation: true });
      expect(normaliseTransformationReadiness(input)).toBe(1.0);
    });

    it('returns 0.0 when no target stage', () => {
      const input = makeTransformationReadinessInput({ targetStage: null });
      expect(normaliseTransformationReadiness(input)).toBe(0.0);
    });

    it('applies recovery damping for recent transformation', () => {
      const recent = makeTransformationReadinessInput({
        sessionsSinceLastTransformation: 2,
        linesAtEdge: 6,
        catalystSaturation: 1.0,
      });
      const distant = makeTransformationReadinessInput({
        sessionsSinceLastTransformation: 10,
        linesAtEdge: 6,
        catalystSaturation: 1.0,
      });
      expect(normaliseTransformationReadiness(recent)).toBeLessThan(
        normaliseTransformationReadiness(distant),
      );
    });

    it('always returns value in [0, 1]', () => {
      const input = makeTransformationReadinessInput({
        linesAtEdge: 8, catalystSaturation: 1.0, shadowClearance: true,
      });
      const result = normaliseTransformationReadiness(input);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Tests: Weight adjustment
  // ---------------------------------------------------------------------------

  describe('adjustWeights', () => {
    it('boosts shadow weight for heavy shadow state', () => {
      const inputs = {
        altitude: makeAltitudeInput(),
        driveHealth: makeDriveHealthInput(),
        polarity: makePolarityInput(),
        shadowTopology: makeShadowTopologyInput({ unresolvedCount: 10, maxSeverity: 0.5 }),
        transformationReadiness: makeTransformationReadinessInput({ linesAtEdge: 2 }),
      };
      const weights = adjustWeights(DEFAULT_CCI_WEIGHTS, inputs);
      expect(weights.shadowTopology).toBeGreaterThan(DEFAULT_CCI_WEIGHTS.shadowTopology);
    });

    it('boosts TR weight for near-transformation state', () => {
      const inputs = {
        altitude: makeAltitudeInput({ linesAtEdge: 5 }),
        driveHealth: makeDriveHealthInput(),
        polarity: makePolarityInput(),
        shadowTopology: makeShadowTopologyInput(),
        transformationReadiness: makeTransformationReadinessInput({ linesAtEdge: 5 }),
      };
      const weights = adjustWeights(DEFAULT_CCI_WEIGHTS, inputs);
      expect(weights.transformationReadiness).toBeGreaterThan(DEFAULT_CCI_WEIGHTS.transformationReadiness);
    });

    it('overrides to hardcoded weights for active transformation', () => {
      const inputs = {
        altitude: makeAltitudeInput(),
        driveHealth: makeDriveHealthInput(),
        polarity: makePolarityInput(),
        shadowTopology: makeShadowTopologyInput(),
        transformationReadiness: makeTransformationReadinessInput({ pendingTransformation: true }),
      };
      const weights = adjustWeights(DEFAULT_CCI_WEIGHTS, inputs);
      expect(weights.transformationReadiness).toBe(0.65);
      expect(weights.altitude).toBe(0.05);
      expect(weights.polarity).toBe(0.05);
    });

    it('always produces weights that sum to 1.0', () => {
      const inputs = {
        altitude: makeAltitudeInput({ linesAtEdge: 5 }),
        driveHealth: makeDriveHealthInput({ maxFixationRisk: 0.8 }),
        polarity: makePolarityInput(),
        shadowTopology: makeShadowTopologyInput({ unresolvedCount: 9, maxSeverity: 0.8 }),
        transformationReadiness: makeTransformationReadinessInput({ linesAtEdge: 5 }),
      };
      const weights = adjustWeights(DEFAULT_CCI_WEIGHTS, inputs);
      const sum = weights.altitude + weights.driveHealth + weights.polarity
        + weights.shadowTopology + weights.transformationReadiness + weights.knowledgeHealth;
      expect(sum).toBeCloseTo(1.0, 5);
    });
  });

  // ---------------------------------------------------------------------------
  // Tests: Session theme selection
  // ---------------------------------------------------------------------------

  describe('selectSessionTheme', () => {
    it('returns active-transformation for pending transformation', () => {
      const dims = { altitude: 0.5, driveHealth: 0.5, polarity: 0.5, shadowTopology: 0.5, transformationReadiness: 1.0 };
      const inputs = {
        altitude: makeAltitudeInput(),
        driveHealth: makeDriveHealthInput(),
        polarity: makePolarityInput(),
        shadowTopology: makeShadowTopologyInput(),
        transformationReadiness: makeTransformationReadinessInput({ pendingTransformation: true }),
      };
      expect(selectSessionTheme(dims, inputs)).toBe('active-transformation');
    });

    it('returns post-transformation for recent transformation', () => {
      const dims = { altitude: 0.5, driveHealth: 0.5, polarity: 0.5, shadowTopology: 0.5, transformationReadiness: 0.5 };
      const inputs = {
        altitude: makeAltitudeInput(),
        driveHealth: makeDriveHealthInput(),
        polarity: makePolarityInput(),
        shadowTopology: makeShadowTopologyInput(),
        transformationReadiness: makeTransformationReadinessInput({ sessionsSinceLastTransformation: 3 }),
      };
      expect(selectSessionTheme(dims, inputs)).toBe('post-transformation');
    });

    it('returns shadow-integration for critical shadow pressure', () => {
      const dims = { altitude: 0.5, driveHealth: 0.5, polarity: 0.5, shadowTopology: 0.2, transformationReadiness: 0.5 };
      const inputs = {
        altitude: makeAltitudeInput(),
        driveHealth: makeDriveHealthInput(),
        polarity: makePolarityInput(),
        shadowTopology: makeShadowTopologyInput({ maxSeverity: 0.9, compoundPatternCount: 1 }),
        transformationReadiness: makeTransformationReadinessInput({ sessionsSinceLastTransformation: 10 }),
      };
      expect(selectSessionTheme(dims, inputs)).toBe('shadow-integration');
    });

    it('returns drive-rebalancing for severe fixation', () => {
      const dims = { altitude: 0.5, driveHealth: 0.3, polarity: 0.5, shadowTopology: 0.8, transformationReadiness: 0.5 };
      const inputs = {
        altitude: makeAltitudeInput(),
        driveHealth: makeDriveHealthInput({ maxFixationRisk: 0.75 }),
        polarity: makePolarityInput(),
        shadowTopology: makeShadowTopologyInput(),
        transformationReadiness: makeTransformationReadinessInput({ sessionsSinceLastTransformation: 10 }),
      };
      expect(selectSessionTheme(dims, inputs)).toBe('drive-rebalancing');
    });

    it('returns balanced-development as default', () => {
      const dims = { altitude: 0.3, driveHealth: 0.8, polarity: 0.5, shadowTopology: 0.8, transformationReadiness: 0.3 };
      const inputs = {
        altitude: makeAltitudeInput({ spread: 0.2 }),
        driveHealth: makeDriveHealthInput(),
        polarity: makePolarityInput({ masterMode: 'exploration', crystallizationIndex: 0.2 }),
        shadowTopology: makeShadowTopologyInput(),
        transformationReadiness: makeTransformationReadinessInput({ linesAtEdge: 2, sessionsSinceLastTransformation: 10 }),
      };
      expect(selectSessionTheme(dims, inputs)).toBe('balanced-development');
    });
  });

  // ---------------------------------------------------------------------------
  // Tests: Session signal helpers
  // ---------------------------------------------------------------------------

  describe('computeIntensityBudget', () => {
    it('returns value in [0, 1]', () => {
      const dims = { altitude: 1.0, driveHealth: 1.0, polarity: 1.0, shadowTopology: 1.0, transformationReadiness: 1.0 };
      const result = computeIntensityBudget(dims);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('is constrained by low drive health', () => {
      const healthy = { altitude: 0.8, driveHealth: 0.9, polarity: 0.5, shadowTopology: 0.9, transformationReadiness: 0.5 };
      const unhealthy = { altitude: 0.8, driveHealth: 0.2, polarity: 0.5, shadowTopology: 0.9, transformationReadiness: 0.5 };
      expect(computeIntensityBudget(unhealthy)).toBeLessThan(computeIntensityBudget(healthy));
    });
  });

  describe('classifyShadowPressure', () => {
    it('returns critical for high severity', () => {
      expect(classifyShadowPressure(makeShadowTopologyInput({ maxSeverity: 0.9 }))).toBe('critical');
    });
    it('returns high for moderate unresolved count', () => {
      expect(classifyShadowPressure(makeShadowTopologyInput({ unresolvedCount: 7, maxSeverity: 0.4 }))).toBe('high');
    });
    it('returns moderate for some shadows', () => {
      expect(classifyShadowPressure(makeShadowTopologyInput({ unresolvedCount: 4, averageSeverity: 0.2 }))).toBe('moderate');
    });
    it('returns low for clean state', () => {
      expect(classifyShadowPressure(makeShadowTopologyInput())).toBe('low');
    });
  });

  describe('classifyTransformationProximity', () => {
    it('returns active for pending', () => {
      expect(classifyTransformationProximity(makeTransformationReadinessInput({ pendingTransformation: true }))).toBe('active');
    });
    it('returns imminent when many lines at edge with high saturation', () => {
      expect(classifyTransformationProximity(makeTransformationReadinessInput({ linesAtEdge: 6, catalystSaturation: 0.8 }))).toBe('imminent');
    });
    it('returns approaching with moderate lines at edge', () => {
      expect(classifyTransformationProximity(makeTransformationReadinessInput({ linesAtEdge: 4, catalystSaturation: 0.3 }))).toBe('approaching');
    });
    it('returns distant otherwise', () => {
      expect(classifyTransformationProximity(makeTransformationReadinessInput({ linesAtEdge: 1, catalystSaturation: 0.1 }))).toBe('distant');
    });
  });

  describe('identifyRebalancingTarget', () => {
    it('returns null when drives are balanced', () => {
      expect(identifyRebalancingTarget(makeDriveHealthInput())).toBeNull();
    });
    it('returns complement of fixated drive', () => {
      const input = makeDriveHealthInput({
        balance: { Agency: 0.6, Communion: -0.6, Eros: 0, Agape: 0 },
        fixationRisk: { Agency: 0.7, Communion: 0.1, Eros: 0.1, Agape: 0.1 },
      });
      expect(identifyRebalancingTarget(input)).toBe('Communion');
    });
  });

  describe('derivePolarityGuidance', () => {
    it('exploration mode has high diversity and no temptation', () => {
      const result = derivePolarityGuidance(makePolarityInput({ masterMode: 'exploration' }));
      expect(result.recommendedDiversity).toBe(0.9);
      expect(result.temptationFrequency).toBe(0.0);
    });
    it('crystallized mode has low diversity', () => {
      const result = derivePolarityGuidance(makePolarityInput({ masterMode: 'crystallized' }));
      expect(result.recommendedDiversity).toBe(0.2);
      expect(result.temptationFrequency).toBe(0.1);
    });
  });

  // ---------------------------------------------------------------------------
  // Tests: computeCCI integration
  // ---------------------------------------------------------------------------

  describe('computeCCI', () => {
    it('returns valid CCIScore with composite in [0, 1]', () => {
      const snapshot = makeMinimalSnapshot();
      const score = computeCCI(snapshot);
      expect(score.composite).toBeGreaterThanOrEqual(0);
      expect(score.composite).toBeLessThanOrEqual(1);
    });

    it('returns weights that sum to 1.0', () => {
      const snapshot = makeMinimalSnapshot();
      const score = computeCCI(snapshot);
      const sum = score.weights.altitude + score.weights.driveHealth + score.weights.polarity
        + score.weights.shadowTopology + score.weights.transformationReadiness + score.weights.knowledgeHealth;
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('all dimensions are in [0, 1]', () => {
      const snapshot = makeMinimalSnapshot();
      const score = computeCCI(snapshot);
      for (const val of Object.values(score.dimensions)) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    });

    it('dominantDimension is a valid key', () => {
      const snapshot = makeMinimalSnapshot();
      const score = computeCCI(snapshot);
      expect(['altitude', 'driveHealth', 'polarity', 'shadowTopology', 'transformationReadiness']).toContain(score.dominantDimension);
    });

    it('handles snapshot at Turquoise stage', () => {
      const allTurquoise: Record<Line, Stage> = {
        Cognitive: 'Turquoise', Emotional: 'Turquoise', Moral: 'Turquoise',
        Intrapersonal: 'Turquoise', Spiritual: 'Turquoise', Somatic: 'Turquoise',
        Willpower: 'Turquoise', Interpersonal: 'Turquoise',
      };
      const snapshot = makeMinimalSnapshot({
        altitudes: allTurquoise,
        currentStage: 'Turquoise',
        transformationReadiness: {
          linesAtEdge: 8, shadowClearance: true, catalystSaturation: 1.0,
          pendingTransformation: false, targetStage: null, sessionsSinceLastTransformation: 20,
        },
      });
      const score = computeCCI(snapshot);
      expect(score.dimensions.altitude).toBeCloseTo(1.0, 1);
      expect(score.composite).toBeGreaterThanOrEqual(0);
      expect(score.composite).toBeLessThanOrEqual(1);
    });

    it('produces shadow-integration theme for shadow-heavy state', () => {
      const snapshot = makeMinimalSnapshot({
        shadows: {
          entries: Array.from({ length: 5 }, (_, i) => ({
            id: `shadow-${i}`,
            quadrant: 'DarkAddiction' as const,
            line: 'Cognitive' as Line,
            stage: 'Red' as Stage,
            drive: 'Agency' as Drive,
            surfacedAt: 0,
            resolvedAt: null,
            recurrenceCount: 0,
            compoundPartner: null,
            severity: 0.85,
          })),
          activeCount: 5,
        },
      });
      const score = computeCCI(snapshot);
      expect(score.sessionSignals.shadowPressure).toBe('critical');
      expect(score.sessionSignals.recommendedTheme).toBe('shadow-integration');
    });
  });
});

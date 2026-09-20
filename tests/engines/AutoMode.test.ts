import { describe, it, expect } from 'vitest';
import {
  generateSessionStrategy,
  computeWeightBias,
  applyWeightBias,
  parameteriseArc,
  computeEncounterBudget,
  evaluateMidSessionAdjustment,
  checkSafetyOverride,
  DEFAULT_ADJUSTMENT_THRESHOLDS,
} from '../../src/core/engines/AutoModeStrategy.js';
import type {
  SessionStrategy,
  RecentEncounter,
  ParameterisedSessionArc,
} from '../../src/core/engines/AutoModeStrategy.js';
import type { CCIScore, SessionTheme } from '../../src/core/engines/CCIEngine.js';
import type { SessionContext } from '../../src/core/engines/PriorityComputation.js';
import { DEFAULT_WEIGHTS } from '../../src/core/engines/PriorityComputation.js';
import type { SignificatorSnapshot } from '../../src/core/domain/SignificatorSnapshot.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';
import type { Drive } from '../../src/core/domain/Drive.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeCCIScore(overrides: Partial<CCIScore> = {}): CCIScore {
  return {
    composite: 0.5,
    dimensions: {
      altitude: 0.5,
      driveHealth: 0.7,
      polarity: 0.4,
      shadowTopology: 0.6,
      transformationReadiness: 0.3,
    },
    weights: {
      altitude: 0.15,
      driveHealth: 0.25,
      polarity: 0.15,
      shadowTopology: 0.25,
      transformationReadiness: 0.20,
      knowledgeHealth: 0.05,
    },
    dominantDimension: 'driveHealth',
    sessionSignals: {
      recommendedTheme: 'balanced-development',
      intensityBudget: 0.6,
      shadowPressure: 'low',
      transformationProximity: 'distant',
      driveRebalancingTarget: null,
      polarityGuidance: {
        mode: 'exploration',
        recommendedDiversity: 0.9,
        temptationFrequency: 0.0,
      },
    },
    ...overrides,
  };
}

function makeSessionContext(overrides: Partial<SessionContext> = {}): SessionContext {
  return {
    encountersSoFar: 3,
    sessionDurationMs: 600000,
    targetSessionLength: 10,
    recentLines: ['Cognitive', 'Emotional'],
    inferredEnergy: 'moderate',
    ...overrides,
  };
}

function makeStrategy(overrides: Partial<SessionStrategy> = {}): SessionStrategy {
  return {
    theme: 'balanced-development',
    themeRationale: 'test',
    arc: {
      warmup: { intensityCeiling: 0.35, focus: 'general', preferredModalities: [] },
      peak: { intensityRange: { min: 0.5, max: 0.8 }, shadowAllocation: 0.2, transformationSlots: 1 },
      cooldown: { intensityCeiling: 0.25, integrationFocus: false, preferredModalities: ['LanguageReflective'] },
    },
    weightBias: {
      thetaUrgency: 1.0, shadowActivation: 1.0, polarityAlignment: 1.0,
      transformationReadiness: 1.0, driveCorrection: 1.0, narrativeCoherence: 1.0, sessionFit: 1.0,
    },
    encounterBudget: { totalTarget: 10, warmupCount: 2, peakCount: 6, cooldownCount: 2, shadowEncounterCap: 1, practiceSlots: 0 },
    modalityBias: {},
    adjustmentThresholds: { ...DEFAULT_ADJUSTMENT_THRESHOLDS },
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
    polarity: { cells: {}, lineProfiles: {}, master: { mode: 'Exploring' as const, dominantDirection: null, coherentLineCount: 0, crystallizationProgress: 0 } },
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
      linesAtEdge: 0, shadowClearance: true, catalystSaturation: 0,
      pendingTransformation: false, targetStage: null, sessionsSinceLastTransformation: 10,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AutoModeStrategy', () => {
  describe('generateSessionStrategy', () => {
    it('produces a valid strategy for balanced-development theme', () => {
      const cci = makeCCIScore();
      const session = makeSessionContext();
      const strategy = generateSessionStrategy(cci, session, null);

      expect(strategy.theme).toBe('balanced-development');
      expect(strategy.arc.warmup.intensityCeiling).toBeGreaterThan(0);
      expect(strategy.arc.peak.intensityRange.min).toBeLessThan(strategy.arc.peak.intensityRange.max);
      expect(strategy.encounterBudget.totalTarget).toBe(10);
    });

    it('produces valid strategies for all 9 themes', () => {
      const themes: SessionTheme[] = [
        'consolidation', 'growth-edge-push', 'shadow-integration',
        'drive-rebalancing', 'transformation-prep', 'active-transformation',
        'post-transformation', 'polarity-deepening', 'balanced-development',
      ];
      for (const theme of themes) {
        const cci = makeCCIScore({ sessionSignals: { ...makeCCIScore().sessionSignals, recommendedTheme: theme } });
        const strategy = generateSessionStrategy(cci, makeSessionContext(), null);
        expect(strategy.theme).toBe(theme);
        expect(strategy.arc.peak.intensityRange.min).toBeLessThanOrEqual(strategy.arc.peak.intensityRange.max);
      }
    });
  });

  describe('computeWeightBias', () => {
    const themes: SessionTheme[] = [
      'consolidation', 'growth-edge-push', 'shadow-integration',
      'drive-rebalancing', 'transformation-prep', 'active-transformation',
      'post-transformation', 'polarity-deepening', 'balanced-development',
    ];

    it.each(themes)('produces valid bias for theme: %s', (theme) => {
      const bias = computeWeightBias(theme, makeCCIScore());
      // All multipliers should be positive
      expect(bias.thetaUrgency).toBeGreaterThan(0);
      expect(bias.shadowActivation).toBeGreaterThan(0);
      expect(bias.polarityAlignment).toBeGreaterThan(0);
      expect(bias.transformationReadiness).toBeGreaterThan(0);
      expect(bias.driveCorrection).toBeGreaterThan(0);
      expect(bias.narrativeCoherence).toBeGreaterThan(0);
      expect(bias.sessionFit).toBeGreaterThan(0);
    });

    it('shadow-integration boosts shadowActivation to 1.8', () => {
      const bias = computeWeightBias('shadow-integration', makeCCIScore());
      expect(bias.shadowActivation).toBe(1.8);
    });

    it('active-transformation boosts transformationReadiness to 3.0', () => {
      const bias = computeWeightBias('active-transformation', makeCCIScore());
      expect(bias.transformationReadiness).toBe(3.0);
    });

    it('drive-rebalancing boosts driveCorrection to 2.0', () => {
      const bias = computeWeightBias('drive-rebalancing', makeCCIScore());
      expect(bias.driveCorrection).toBe(2.0);
    });

    it('polarity-deepening boosts polarityAlignment to 2.0', () => {
      const bias = computeWeightBias('polarity-deepening', makeCCIScore());
      expect(bias.polarityAlignment).toBe(2.0);
    });

    it('balanced-development has all multipliers at 1.0', () => {
      const bias = computeWeightBias('balanced-development', makeCCIScore());
      expect(bias.thetaUrgency).toBe(1.0);
      expect(bias.shadowActivation).toBe(1.0);
      expect(bias.polarityAlignment).toBe(1.0);
      expect(bias.transformationReadiness).toBe(1.0);
      expect(bias.driveCorrection).toBe(1.0);
      expect(bias.narrativeCoherence).toBe(1.0);
      expect(bias.sessionFit).toBe(1.0);
    });
  });

  describe('applyWeightBias', () => {
    it('always produces weights that sum to 1.0', () => {
      const biases = [
        computeWeightBias('shadow-integration', makeCCIScore()),
        computeWeightBias('active-transformation', makeCCIScore()),
        computeWeightBias('consolidation', makeCCIScore()),
        computeWeightBias('balanced-development', makeCCIScore()),
      ];
      for (const bias of biases) {
        const result = applyWeightBias(DEFAULT_WEIGHTS, bias);
        const sum = result.thetaUrgency + result.shadowActivation + result.polarityAlignment
          + result.transformationReadiness + result.driveCorrection + result.narrativeCoherence
          + result.sessionFit + result.masteryAlignment;
        expect(sum).toBeCloseTo(1.0, 5);
      }
    });

    it('preserves proportions for balanced-development (all 1.0 multipliers)', () => {
      const bias = computeWeightBias('balanced-development', makeCCIScore());
      const result = applyWeightBias(DEFAULT_WEIGHTS, bias);
      expect(result.thetaUrgency).toBeCloseTo(DEFAULT_WEIGHTS.thetaUrgency);
      expect(result.shadowActivation).toBeCloseTo(DEFAULT_WEIGHTS.shadowActivation);
    });

    it('boosts shadow weight for shadow-integration theme', () => {
      const bias = computeWeightBias('shadow-integration', makeCCIScore());
      const result = applyWeightBias(DEFAULT_WEIGHTS, bias);
      expect(result.shadowActivation).toBeGreaterThan(DEFAULT_WEIGHTS.shadowActivation);
    });
  });

  describe('computeEncounterBudget', () => {
    it('sums warmup + peak + cooldown to equal totalTarget', () => {
      const session = makeSessionContext({ targetSessionLength: 12 });
      const arc: ParameterisedSessionArc = {
        warmup: { intensityCeiling: 0.35, focus: 'general', preferredModalities: [] },
        peak: { intensityRange: { min: 0.5, max: 0.8 }, shadowAllocation: 0.2, transformationSlots: 1 },
        cooldown: { intensityCeiling: 0.25, integrationFocus: false, preferredModalities: [] },
      };
      const budget = computeEncounterBudget(session, arc);
      expect(budget.warmupCount + budget.peakCount + budget.cooldownCount).toBe(budget.totalTarget);
    });

    it('grants practice slot for sessions > 10 encounters', () => {
      const session = makeSessionContext({ targetSessionLength: 15 });
      const arc: ParameterisedSessionArc = {
        warmup: { intensityCeiling: 0.35, focus: 'general', preferredModalities: [] },
        peak: { intensityRange: { min: 0.5, max: 0.8 }, shadowAllocation: 0.2, transformationSlots: 1 },
        cooldown: { intensityCeiling: 0.25, integrationFocus: false, preferredModalities: [] },
      };
      const budget = computeEncounterBudget(session, arc);
      expect(budget.practiceSlots).toBe(1);
    });

    it('no practice slot for short sessions', () => {
      const session = makeSessionContext({ targetSessionLength: 8 });
      const arc: ParameterisedSessionArc = {
        warmup: { intensityCeiling: 0.35, focus: 'general', preferredModalities: [] },
        peak: { intensityRange: { min: 0.5, max: 0.8 }, shadowAllocation: 0.2, transformationSlots: 1 },
        cooldown: { intensityCeiling: 0.25, integrationFocus: false, preferredModalities: [] },
      };
      const budget = computeEncounterBudget(session, arc);
      expect(budget.practiceSlots).toBe(0);
    });
  });

  describe('evaluateMidSessionAdjustment', () => {
    it('returns intensity-reduction on energy drop', () => {
      const strategy = makeStrategy({
        arc: {
          warmup: { intensityCeiling: 0.35, focus: 'general', preferredModalities: [] },
          peak: { intensityRange: { min: 0.5, max: 0.8 }, shadowAllocation: 0.2, transformationSlots: 1 },
          cooldown: { intensityCeiling: 0.25, integrationFocus: false, preferredModalities: [] },
        },
      });
      const session = makeSessionContext({ inferredEnergy: 'low' });
      const result = evaluateMidSessionAdjustment(strategy, session, []);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('intensity-reduction');
      expect(result!.newPeakIntensity!.max).toBeLessThanOrEqual(0.5);
    });

    it('returns theme-shift on avoidance spike', () => {
      const strategy = makeStrategy();
      const session = makeSessionContext({ inferredEnergy: 'moderate' });
      const outcomes: RecentEncounter[] = [
        { outcome: 'avoided', quality: 0.2, mode: 'capacity', shadowIntegrated: false },
        { outcome: 'avoided', quality: 0.1, mode: 'capacity', shadowIntegrated: false },
        { outcome: 'avoided', quality: 0.3, mode: 'capacity', shadowIntegrated: false },
      ];
      const result = evaluateMidSessionAdjustment(strategy, session, outcomes);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('theme-shift');
      expect(result!.newTheme).toBe('consolidation');
    });

    it('returns intensity-increase on engagement surge', () => {
      const strategy = makeStrategy({
        arc: {
          warmup: { intensityCeiling: 0.35, focus: 'general', preferredModalities: [] },
          peak: { intensityRange: { min: 0.3, max: 0.5 }, shadowAllocation: 0.2, transformationSlots: 1 },
          cooldown: { intensityCeiling: 0.25, integrationFocus: false, preferredModalities: [] },
        },
      });
      const session = makeSessionContext({ inferredEnergy: 'high' });
      const outcomes: RecentEncounter[] = [
        { outcome: 'completed', quality: 0.95, mode: 'capacity', shadowIntegrated: false },
        { outcome: 'completed', quality: 0.9, mode: 'capacity', shadowIntegrated: false },
        { outcome: 'completed', quality: 0.92, mode: 'capacity', shadowIntegrated: false },
      ];
      const result = evaluateMidSessionAdjustment(strategy, session, outcomes);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('intensity-increase');
    });

    it('returns shadow-pause on shadow fatigue', () => {
      const strategy = makeStrategy();
      const session = makeSessionContext({ inferredEnergy: 'moderate' });
      const outcomes: RecentEncounter[] = [
        { outcome: 'completed', quality: 0.4, mode: 'shadow', shadowIntegrated: false },
        { outcome: 'completed', quality: 0.3, mode: 'shadow', shadowIntegrated: false },
        { outcome: 'completed', quality: 0.35, mode: 'shadow', shadowIntegrated: false },
      ];
      const result = evaluateMidSessionAdjustment(strategy, session, outcomes);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('shadow-pause');
      expect(result!.shadowBiasOverride).toBe(0.3);
    });

    it('returns null when all signals normal', () => {
      const strategy = makeStrategy();
      const session = makeSessionContext({ inferredEnergy: 'moderate' });
      const outcomes: RecentEncounter[] = [
        { outcome: 'completed', quality: 0.6, mode: 'capacity', shadowIntegrated: false },
        { outcome: 'completed', quality: 0.5, mode: 'capacity', shadowIntegrated: false },
      ];
      const result = evaluateMidSessionAdjustment(strategy, session, outcomes);
      expect(result).toBeNull();
    });
  });

  describe('checkSafetyOverride', () => {
    it('returns true for distressed significator', () => {
      const snapshot = makeMinimalSnapshot({
        fixationRisk: { Agency: 0.85, Communion: 0.1, Eros: 0.1, Agape: 0.1 },
        shadows: {
          entries: Array.from({ length: 12 }, (_, i) => ({
            id: `shadow-${i}`,
            quadrant: 'DarkAddiction' as const,
            line: 'Cognitive' as Line,
            stage: 'Red' as Stage,
            drive: 'Agency' as Drive,
            surfacedAt: 0,
            resolvedAt: null,
            recurrenceCount: 0,
            compoundPartner: null,
            severity: 0.5,
          })),
          activeCount: 12,
        },
      });
      expect(checkSafetyOverride(snapshot)).toBe(true);
    });

    it('returns false for healthy significator', () => {
      const snapshot = makeMinimalSnapshot();
      expect(checkSafetyOverride(snapshot)).toBe(false);
    });

    it('returns false when only fixation is high but shadows are low', () => {
      const snapshot = makeMinimalSnapshot({
        fixationRisk: { Agency: 0.9, Communion: 0.1, Eros: 0.1, Agape: 0.1 },
      });
      expect(checkSafetyOverride(snapshot)).toBe(false);
    });
  });

  describe('parameteriseArc', () => {
    it('shadow-integration has high shadow allocation', () => {
      const arc = parameteriseArc('shadow-integration', makeCCIScore(), makeSessionContext());
      expect(arc.peak.shadowAllocation).toBe(0.5);
      expect(arc.warmup.focus).toBe('familiar-modality');
    });

    it('active-transformation has high intensity range', () => {
      const arc = parameteriseArc('active-transformation', makeCCIScore(), makeSessionContext());
      expect(arc.peak.intensityRange.min).toBeGreaterThanOrEqual(0.8);
      expect(arc.peak.transformationSlots).toBe(3);
    });

    it('post-transformation has low intensity', () => {
      const arc = parameteriseArc('post-transformation', makeCCIScore(), makeSessionContext());
      expect(arc.peak.intensityRange.max).toBeLessThanOrEqual(0.5);
      expect(arc.cooldown.integrationFocus).toBe(true);
    });
  });
});

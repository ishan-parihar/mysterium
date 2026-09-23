import { describe, it, expect, vi } from 'vitest';
import { buildContext } from '../../src/infra/llm/ContextPipeline.js';
import type { ContextPipelineInput } from '../../src/infra/llm/ContextPipeline.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import type { Holon } from '../../src/core/world/Holon.js';
import type { HolonRegistry } from '../../src/core/world/store/HolonStore.js';
import type { ConceptDraftIndex } from '../../src/core/data/ConceptDraftIndex.js';
import type { ScheduledEncounter } from '../../src/core/domain/EncounterSpecNew.js';
import type { ConsequenceRecord } from '../../src/core/domain/ConsequenceRecord.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';
import { ALL_LINES } from '../../src/core/domain/Line.js';

// ---------------------------------------------------------------------------
// Mock data factories
// ---------------------------------------------------------------------------

function makeAltitudes(stage: Stage): Record<Line, Stage> {
  return Object.fromEntries(ALL_LINES.map(l => [l, stage])) as Record<Line, Stage>;
}

function makeMockHolon(id: string, name: string, line: Line, stage: Stage): Holon {
  return {
    id,
    name,
    kind: 'NPC',
    line,
    stage,
    drives: { dominant: 'Agency', secondary: 'Communion', shadowQuadrant: null },
    polarity: 'Radiative',
    narrativeRole: `${name} role`,
    relationships: [],
    active: true,
  };
}

function makeMockEncounter(overrides?: Partial<ScheduledEncounter>): ScheduledEncounter {
  return {
    id: 'enc-001',
    moduleRef: 'cognitive:red:language-reflective',
    modality: 'LanguageReflective',
    targetLines: ['Cognitive'],
    stage: 'Red',
    holonSource: 'holon-1',
    shadowTarget: null,
    polarityMode: 'Exploring',
    difficulty: 0.5,
    sessionPosition: 'peak',
    priority: 1,
    driveTarget: null,
    executionMode: 'capacity',
    ...overrides,
  };
}

function makeMockRegistry(holons: Holon[]): HolonRegistry {
  return { holons };
}

function makeMockConceptIndex(): ConceptDraftIndex {
  return {
    modules: {
      'cognitive:red': {
        line: 'Cognitive',
        stage: 'Red',
        title: 'Red Cognitive Challenge',
        modalities: ['LanguageReflective', 'ScenarioChoice'],
      },
    },
  };
}

function makeMockConsequences(): ConsequenceRecord[] {
  return [
    {
      encounterId: 'enc-prev-1',
      timestamp: 1000,
      line: 'Moral',
      polarityTrace: {
        encounterId: 'enc-prev-1',
        timestamp: 1000,
        driveDirectionality: {
          Agency: 'HealthyBalanced',
          Communion: 'HealthyBalanced',
          Eros: 'HealthyBalanced',
          Agape: 'HealthyBalanced',
        },
        energeticDirection: 'Radiative',
        stageOrientation: 'Homeostatic',
        sourceOfNourishment: 'Ambivalent',
      },
      shadowSurfaced: null,
      shadowResolved: null,
      holonDeltas: [{ holonId: 'holon-1', field: 'active', oldValue: true, newValue: true }],
      altitudeShift: null,
      driveShift: null,
      narrativeSummary: 'The warrior tested the player and found them worthy.',
    },
    {
      encounterId: 'enc-prev-2',
      timestamp: 2000,
      line: 'Moral',
      polarityTrace: {
        encounterId: 'enc-prev-2',
        timestamp: 2000,
        driveDirectionality: {
          Agency: 'HealthyBalanced',
          Communion: 'HealthyBalanced',
          Eros: 'HealthyBalanced',
          Agape: 'HealthyBalanced',
        },
        energeticDirection: 'Absorptive',
        stageOrientation: 'ReachingHigher',
        sourceOfNourishment: 'HigherRealm',
      },
      shadowSurfaced: 'DarkAddiction',
      shadowResolved: null,
      holonDeltas: [{ holonId: 'holon-2', field: 'stage', oldValue: 'Red', newValue: 'Amber' }],
      altitudeShift: null,
      driveShift: { drive: 'Agency', delta: 0.1 },
      narrativeSummary: 'A shadow emerged during confrontation with the faction leader.',
    },
  ];
}

function makeDefaultInput(): ContextPipelineInput {
  const holons = [
    makeMockHolon('holon-1', 'WarriorGuide', 'Cognitive', 'Red'),
    makeMockHolon('holon-2', 'FactionLeader', 'Cognitive', 'Amber'),
    makeMockHolon('holon-3', 'WildBeast', 'Somatic', 'Red'),
  ];

  return {
    encounter: makeMockEncounter(),
    significator: createSignificator('player-1', makeAltitudes('Red'), 'Red'),
    holonRegistry: makeMockRegistry(holons),
    conceptIndex: makeMockConceptIndex(),
    recentConsequences: [],
    sessionContext: { energy: 'high' },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ContextPipeline', () => {
  describe('buildContext - system prompt sections', () => {
    it('contains all 10 required sections', () => {
      const input = makeDefaultInput();
      const result = buildContext(input);

      const requiredSections = [
        '[ROLE]',
        '[COSMOLOGY]',
        '[FREQUENCY]',
        '[HOLONS]',
        '[ENCOUNTER]',
        '[MODALITY]',
        '[CONTINUITY]',
        '[PLAYER STATE]',
        '[OUTPUT FORMAT]',
        '[RULES]',
      ];

      for (const section of requiredSections) {
        expect(result.systemPrompt).toContain(section);
      }
    });
  });

  describe('buildContext - holon selection', () => {
    it('selected holons count is at most 6', () => {
      // Create 10 holons all on the same line
      const holons = Array.from({ length: 10 }, (_, i) =>
        makeMockHolon(`holon-${i}`, `Holon${i}`, 'Cognitive', 'Red'),
      );
      const input: ContextPipelineInput = {
        ...makeDefaultInput(),
        encounter: makeMockEncounter({ holonSource: 'holon-0' }),
        holonRegistry: makeMockRegistry(holons),
      };

      const result = buildContext(input);
      expect(result.selectedHolons.length).toBeLessThanOrEqual(6);
    });

    it('prioritizes the primary holon from encounter.holonSource', () => {
      const input = makeDefaultInput();
      const result = buildContext(input);

      expect(result.selectedHolons.length).toBeGreaterThan(0);
      expect(result.selectedHolons[0].id).toBe('holon-1');
    });

    it('selects holons from multiple target lines', () => {
      const holons = [
        makeMockHolon('holon-1', 'WarriorGuide', 'Cognitive', 'Red'),
        makeMockHolon('holon-2', 'Empath', 'Emotional', 'Red'),
        makeMockHolon('holon-3', 'Sage', 'Cognitive', 'Amber'),
        makeMockHolon('holon-4', 'Healer', 'Emotional', 'Amber'),
        makeMockHolon('holon-5', 'Beast', 'Somatic', 'Red'),
      ];

      const input: ContextPipelineInput = {
        ...makeDefaultInput(),
        encounter: makeMockEncounter({
          targetLines: ['Cognitive', 'Emotional'],
          holonSource: 'holon-1',
        }),
        holonRegistry: makeMockRegistry(holons),
      };

      const result = buildContext(input);

      // Should include holons from both Cognitive and Emotional lines
      const selectedLines = result.selectedHolons.map(h => h.line);
      expect(selectedLines).toContain('Cognitive');
      expect(selectedLines).toContain('Emotional');

      // Should NOT include Somatic holons since only Cognitive and Emotional are targeted
      expect(selectedLines).not.toContain('Somatic');

      // The system prompt [ENCOUNTER] section should contain both line names
      expect(result.systemPrompt).toContain('lines=Cognitive,Emotional');
    });
  });

  describe('buildContext - VeilFilteredSignificator', () => {
    it('contains no raw numerical scores', () => {
      const input = makeDefaultInput();
      const result = buildContext(input);
      const sig = result.veilFilteredSig;

      // Check that the signals are all strings, not numbers
      for (const signal of sig.activeDriveSignals) {
        expect(typeof signal).toBe('string');
        expect(signal).not.toMatch(/^\d+(\.\d+)?$/);
      }

      for (const signal of sig.activeShadowSignals) {
        expect(typeof signal).toBe('string');
        expect(signal).not.toMatch(/^\d+(\.\d+)?$/);
      }

      // Verify perceivedLayer is a stage name, not a number
      expect(typeof sig.perceivedLayer).toBe('string');
      expect(sig.transformationProximity).toMatch(/^(distant|approaching|threshold)$/);
      expect(sig.sessionEnergy).toMatch(/^(high|moderate|low)$/);
    });
  });

  describe('buildContext - FrequencySpec', () => {
    it('matches Red-stage expectations', () => {
      const input = makeDefaultInput();
      const result = buildContext(input);

      expect(result.frequencySpec.toneDirective).toContain('action verbs/force-words');
      expect(result.frequencySpec.holonFrequency.stage).toBe('Red');
    });
  });

  describe('buildContext - modality rubrics', () => {
    it('different modalities produce different MODALITY sections', () => {
      const input1 = {
        ...makeDefaultInput(),
        encounter: makeMockEncounter({ modality: 'LanguageReflective' }),
      };
      const input2 = {
        ...makeDefaultInput(),
        encounter: makeMockEncounter({ modality: 'ImmersiveRPG' }),
      };

      const result1 = buildContext(input1);
      const result2 = buildContext(input2);

      // Extract the modality section from each prompt
      const modalitySection1 = result1.systemPrompt.split('[MODALITY]')[1]?.split('[CONTINUITY]')[0] ?? '';
      const modalitySection2 = result2.systemPrompt.split('[MODALITY]')[1]?.split('[CONTINUITY]')[0] ?? '';

      expect(modalitySection1).not.toBe(modalitySection2);
    });
  });

  describe('buildContext - empty holon registry', () => {
    it('produces valid output with empty registry', () => {
      const input: ContextPipelineInput = {
        ...makeDefaultInput(),
        holonRegistry: makeMockRegistry([]),
      };

      const result = buildContext(input);

      expect(result.systemPrompt).toContain('[HOLONS]');
      expect(result.selectedHolons).toHaveLength(0);
      // Should still have all required sections
      expect(result.systemPrompt).toContain('[ROLE]');
      expect(result.systemPrompt).toContain('[RULES]');
    });
  });

  describe('buildContext - consequences', () => {
    it('produces valid CONTINUITY section with empty consequences', () => {
      const input: ContextPipelineInput = {
        ...makeDefaultInput(),
        recentConsequences: [],
      };

      const result = buildContext(input);
      expect(result.systemPrompt).toContain('[CONTINUITY]');
      expect(result.systemPrompt).toContain('No prior encounter history');
    });

    it('includes narrative summaries from recent consequences', () => {
      const input: ContextPipelineInput = {
        ...makeDefaultInput(),
        recentConsequences: makeMockConsequences(),
      };

      const result = buildContext(input);
      expect(result.systemPrompt).toContain('[CONTINUITY]');
      expect(result.systemPrompt).toContain('warrior tested the player');
    });
  });

  describe('evaluateResponse - stage inference parsing', () => {
    it('returns inferredStage and confidence when present in API output', async () => {
      // We will mock global.fetch to return a valid JSON payload containing inferredStage
      const originalFetch = global.fetch;
      global.fetch = async () => {
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    score: 0.8,
                    feedback: 'Nuanced reflection',
                    inferredStage: 'Orange',
                    confidence: 0.9,
                  }),
                },
              },
            ],
          }),
        } as any;
      };

      try {
        // Set temp env vars so evaluateResponse doesn't exit early
        vi.stubEnv('VITE_LLM_BASE_URL', 'http://localhost');
        vi.stubEnv('VITE_LLM_API_KEY', 'mock-key');
        vi.stubEnv('VITE_LLM_MODEL', 'mock-model');

        // @ts-ignore
        const { evaluateResponse } = await import('../../src/infra/llm/LLMClient.js');
        const res = await evaluateResponse('prompt', 'rubric', 'response');
        expect(res.inferredStage).toBe('Orange');
        expect(res.confidence).toBe(0.9);
      } finally {
        global.fetch = originalFetch;
        vi.unstubAllEnvs();
      }
    });
  });
});

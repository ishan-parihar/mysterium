import { describe, it, expect } from 'vitest';
import { generateFrequencySpec } from '../../src/infra/llm/FrequencyConditioner.js';
import type { Stage } from '../../src/core/domain/Stage.js';

describe('FrequencyConditioner', () => {
  describe('generateFrequencySpec', () => {
    it('returns a spec with correct player and holon frequencies', () => {
      const spec = generateFrequencySpec('Cognitive', 'Orange', 'Emotional', 'Green', 'Deterministic');
      expect(spec.playerFrequency).toEqual({ line: 'Cognitive', stage: 'Orange' });
      expect(spec.holonFrequency).toEqual({ line: 'Emotional', stage: 'Green' });
      expect(spec.modality).toBe('Deterministic');
    });

    it('produces sensory/primal tone for Infrared stage', () => {
      const spec = generateFrequencySpec('Somatic', 'Infrared', 'Somatic', 'Infrared', 'Embodied');
      expect(spec.toneDirective).toContain('sensory/primal');
      expect(spec.vocabularyBand).toContain('fragments');
      expect(spec.valueLens).toBe('survival/warmth');
      expect(spec.taboos).toContain('abstraction');
      expect(spec.taboos).toContain('future-planning');
    });

    it('produces action verbs/force-words tone for Red stage', () => {
      const spec = generateFrequencySpec('Willpower', 'Red', 'Willpower', 'Red', 'ImmersiveRPG');
      expect(spec.toneDirective).toContain('action verbs/force-words');
      expect(spec.vocabularyBand).toContain('short/imperative');
      expect(spec.valueLens).toBe('power/respect/will');
      expect(spec.taboos).toContain('vulnerability');
      expect(spec.taboos).toContain('compromise');
    });

    it('produces integral/paradox-holding tone for Teal stage', () => {
      const spec = generateFrequencySpec('Spiritual', 'Teal', 'Spiritual', 'Teal', 'LanguageReflective');
      expect(spec.toneDirective).toContain('integral/paradox-holding');
      expect(spec.vocabularyBand).toContain('multi-layered/both-and');
      expect(spec.valueLens).toBe('wholeness/emergence');
      expect(spec.taboos).toContain('reductionism');
    });

    it('produces distinct toneDirective for at least 4 different stages', () => {
      const stages: Stage[] = ['Infrared', 'Red', 'Orange', 'Green', 'Teal'];
      const tones = stages.map(
        (s) => generateFrequencySpec('Cognitive', s, 'Cognitive', s, 'Deterministic').toneDirective,
      );
      const uniqueTones = new Set(tones);
      expect(uniqueTones.size).toBeGreaterThanOrEqual(4);
    });

    it('produces distinct vocabularyBand for different stages', () => {
      const stages: Stage[] = ['Magenta', 'Amber', 'Orange', 'Turquoise'];
      const bands = stages.map(
        (s) => generateFrequencySpec('Cognitive', s, 'Cognitive', s, 'Deterministic').vocabularyBand,
      );
      const uniqueBands = new Set(bands);
      expect(uniqueBands.size).toBe(4);
    });

    it('incorporates line register into tone directive', () => {
      const cogSpec = generateFrequencySpec('Cognitive', 'Orange', 'Cognitive', 'Orange', 'Deterministic');
      expect(cogSpec.toneDirective).toContain('analytical');
      expect(cogSpec.toneDirective).toContain('cause-effect');

      const emotSpec = generateFrequencySpec('Cognitive', 'Orange', 'Emotional', 'Orange', 'Deterministic');
      expect(emotSpec.toneDirective).toContain('felt-sense');
      expect(emotSpec.toneDirective).toContain('atmosphere');
    });

    it('incorporates line register focus into vocabulary band', () => {
      const moralSpec = generateFrequencySpec('Moral', 'Amber', 'Moral', 'Amber', 'ScenarioChoice');
      expect(moralSpec.vocabularyBand).toContain('dilemma-oriented');

      const somaticSpec = generateFrequencySpec('Somatic', 'Amber', 'Somatic', 'Amber', 'Embodied');
      expect(somaticSpec.vocabularyBand).toContain('rhythm-aware');
    });
  });

  describe('crossAltitudeDynamic', () => {
    it('returns full-mutual-intelligibility when same stage', () => {
      const spec = generateFrequencySpec('Cognitive', 'Orange', 'Cognitive', 'Orange', 'Deterministic');
      expect(spec.crossAltitudeDynamic).toBe('full-mutual-intelligibility');
    });

    it('returns productive-tension for adjacent stages (player one above)', () => {
      const spec = generateFrequencySpec('Cognitive', 'Orange', 'Cognitive', 'Amber', 'Deterministic');
      expect(spec.crossAltitudeDynamic).toBe('productive-tension-slight-misunderstanding');
    });

    it('returns productive-tension for adjacent stages (player one below)', () => {
      const spec = generateFrequencySpec('Cognitive', 'Amber', 'Cognitive', 'Orange', 'Deterministic');
      expect(spec.crossAltitudeDynamic).toBe('productive-tension-slight-misunderstanding');
    });

    it('returns holon-speaks-authentically when player is higher by 2+', () => {
      const spec = generateFrequencySpec('Cognitive', 'Green', 'Cognitive', 'Red', 'Deterministic');
      expect(spec.crossAltitudeDynamic).toBe('holon-speaks-authentically-from-its-stage');
    });

    it('returns player-perceives-awe when player is lower by 2+', () => {
      const spec = generateFrequencySpec('Cognitive', 'Red', 'Cognitive', 'Green', 'Deterministic');
      expect(spec.crossAltitudeDynamic).toBe('holon-speaks-from-its-stage-player-perceives-awe');
    });
  });
});

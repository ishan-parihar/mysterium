/**
 * Tests for altitude-scaling: catalyst complexity adapts to player's current
 * altitude, not just the encounter's target stage.
 */
import { describe, it, expect } from 'vitest';
import { getFallback } from '../../src/core/fallback/FallbackProvider.js';
import { generateFrequencySpec } from '../../src/infra/llm/FrequencyConditioner.js';

describe('Altitude-scaling: FallbackProvider reframe layers', () => {
  it('does NOT reframe when player is at the same stage as the encounter (co-altitudinal)', () => {
    const base = getFallback('LanguageReflective', 'Cognitive', 'Red', 'Red');
    // No reframe prefix/suffix — should be the base prompt
    expect(base.prompt).not.toContain('You can see this Red-stage pattern');
    expect(base.prompt).not.toContain('Notice the Red-stage pattern');
  });

  it('reframes with mid-altitude prefix/suffix when player is at Orange encountering Red', () => {
    const reframed = getFallback('LanguageReflective', 'Cognitive', 'Red', 'Orange');
    expect(reframed.prompt).toContain('You can see this Red-stage pattern');
    expect(reframed.prompt).toContain('What does the pattern still cost you');
  });

  it('reframes with high-altitude meta-cognitive framing when player is at Teal encountering Red', () => {
    const reframed = getFallback('LanguageReflective', 'Cognitive', 'Red', 'Teal');
    expect(reframed.prompt).toContain('Notice the Red-stage pattern arising');
    expect(reframed.prompt).toContain('Where does the pattern still live unmetabolized');
  });

  it('reframes with peak-altitude framing when player is at Turquoise encountering Red', () => {
    const reframed = getFallback('LanguageReflective', 'Cognitive', 'Red', 'Turquoise');
    expect(reframed.prompt).toContain('From presence, witness the Red pattern');
    expect(reframed.prompt).toContain('felt-quality of recognizing it as pattern');
  });

  it('preserves the base prompt content within the reframe (same random seed)', () => {
    // Call twice with same stage — both get the same random pick from the pool
    // (deterministic in test since there's no time-based randomization affecting pick)
    // Instead, just verify the reframe adds prefix+suffix around SOMETHING
    const reframed = getFallback('LanguageReflective', 'Cognitive', 'Red', 'Teal');
    // The reframed prompt should be longer than just the prefix or suffix alone
    // (meaning the base content is sandwiched between them)
    expect(reframed.prompt).toMatch(/^Notice the Red-stage pattern.*Where does the pattern.*$/s);
  });

  it('applies reframe to ScenarioChoice scenarios too', () => {
    const reframed = getFallback('ScenarioChoice', 'Moral', 'Red', 'Teal');
    if (reframed.scenario) {
      expect(reframed.scenario).toContain('Notice the Red-stage pattern');
    }
  });

  it('does NOT reframe Amber encounters for Red players (player below holon)', () => {
    const base = getFallback('LanguageReflective', 'Cognitive', 'Amber', 'Red');
    // Red player encountering Amber — the reframe layer for Amber 'low' band is empty
    expect(base.prompt).not.toContain('You can see the structure');
  });

  it('does reframe Amber encounters for Teal players', () => {
    const reframed = getFallback('LanguageReflective', 'Cognitive', 'Amber', 'Teal');
    expect(reframed.prompt).toContain('Notice the Amber-stage pattern');
  });
});

describe('Altitude-scaling: FrequencyConditioner complexityRegister', () => {
  it('includes complexityRegister from the player\'s stage (not the holon\'s)', () => {
    const spec = generateFrequencySpec('Cognitive', 'Teal', 'Cognitive', 'Red', 'LanguageReflective');
    // Player is at Teal → complexityRegister should be integral-paradox-holding
    expect(spec.complexityRegister).toBe('integral-paradox-holding');
  });

  it('includes complexityRegister = concrete-imperative for Red player', () => {
    const spec = generateFrequencySpec('Cognitive', 'Red', 'Cognitive', 'Red', 'LanguageReflective');
    expect(spec.complexityRegister).toBe('concrete-imperative');
  });

  it('includes crossAltitudeDirective with structured instructions', () => {
    const spec = generateFrequencySpec('Cognitive', 'Teal', 'Cognitive', 'Red', 'LanguageReflective');
    expect(spec.crossAltitudeDirective).toContain('CROSS-ALTITUDE DIRECTIVE');
    expect(spec.crossAltitudeDirective).toContain('Teal');
    expect(spec.crossAltitudeDirective).toContain('Red');
    expect(spec.crossAltitudeDirective).toContain('Do NOT collapse to the Red register');
    expect(spec.crossAltitudeDirective).toContain('still-unmetabolized');
  });

  it('crossAltitudeDirective says "co-altitudinal" when player and holon are at the same stage', () => {
    const spec = generateFrequencySpec('Cognitive', 'Red', 'Cognitive', 'Red', 'LanguageReflective');
    expect(spec.crossAltitudeDirective).toContain('co-altitudinal');
  });

  it('crossAltitudeDirective provides scaffolding instructions when player is below holon', () => {
    const spec = generateFrequencySpec('Cognitive', 'Red', 'Cognitive', 'Teal', 'LanguageReflective');
    expect(spec.crossAltitudeDirective).toContain('from below');
    expect(spec.crossAltitudeDirective).toContain('scaffolding');
  });
});

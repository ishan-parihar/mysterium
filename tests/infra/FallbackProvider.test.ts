import { describe, it, expect } from 'vitest';
import { getFallback } from '../../src/core/fallback/FallbackProvider.js';
import { filterOutput } from '../../src/infra/llm/VeilFilter.js';

describe('FallbackProvider', () => {
  it('returns valid content for LanguageReflective at Red stage with prompt field', () => {
    const content = getFallback('LanguageReflective', 'Cognitive', 'Red');
    expect(content.prompt).toBeDefined();
    expect(content.prompt!.length).toBeGreaterThan(0);
  });

  it('returns valid content for ScenarioChoice at Red stage with scenario and options', () => {
    const content = getFallback('ScenarioChoice', 'Moral', 'Red');
    expect(content.scenario).toBeDefined();
    expect(content.scenario!.length).toBeGreaterThan(0);
    expect(content.options).toBeDefined();
    expect(content.options!.length).toBeGreaterThanOrEqual(2);
  });

  it('returns valid content for Deterministic at Red stage with framing field', () => {
    const content = getFallback('Deterministic', 'Cognitive', 'Red');
    expect(content.framing).toBeDefined();
    expect(content.framing!.length).toBeGreaterThan(0);
  });

  it('returns non-empty strings in content fields', () => {
    const lr = getFallback('LanguageReflective', 'Cognitive', 'Red');
    expect(lr.prompt!.trim().length).toBeGreaterThan(0);

    const sc = getFallback('ScenarioChoice', 'Moral', 'Red');
    expect(sc.scenario!.trim().length).toBeGreaterThan(0);

    const det = getFallback('Deterministic', 'Cognitive', 'Red');
    expect(det.framing!.trim().length).toBeGreaterThan(0);
  });

  it('multiple calls can return different content (randomization)', () => {
    // Run multiple times to check for variation (statistical test)
    const results = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const content = getFallback('LanguageReflective', 'Cognitive', 'Red');
      results.add(content.prompt!);
    }
    // With 5 options and 30 trials, probability of seeing only 1 is vanishingly small
    expect(results.size).toBeGreaterThan(1);
  });

  it('fallback content passes VeilFilter check (no Veil violations)', () => {
    // Test all Red stage fallbacks for each modality
    for (let i = 0; i < 20; i++) {
      const lr = getFallback('LanguageReflective', 'Cognitive', 'Red');
      if (lr.prompt) {
        const result = filterOutput(lr.prompt);
        expect(result.passed).toBe(true);
      }

      const sc = getFallback('ScenarioChoice', 'Moral', 'Red');
      if (sc.scenario) {
        const result = filterOutput(sc.scenario);
        expect(result.passed).toBe(true);
      }

      const det = getFallback('Deterministic', 'Cognitive', 'Red');
      if (det.framing) {
        const result = filterOutput(det.framing);
        expect(result.passed).toBe(true);
      }
    }
  });

  it('returns fallback even for stages without specific content (graceful generic)', () => {
    const content = getFallback('LanguageReflective', 'Cognitive', 'Teal');
    expect(content.prompt).toBeDefined();
    expect(content.prompt!.length).toBeGreaterThan(0);
  });

  it('options array in ScenarioChoice has at least 2 entries', () => {
    for (let i = 0; i < 10; i++) {
      const content = getFallback('ScenarioChoice', 'Moral', 'Red');
      expect(content.options!.length).toBeGreaterThanOrEqual(2);
      for (const opt of content.options!) {
        expect(opt.id.length).toBeGreaterThan(0);
        expect(opt.text.length).toBeGreaterThan(0);
      }
    }
  });
});

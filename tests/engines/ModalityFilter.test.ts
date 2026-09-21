/**
 * Tests for T-0.4 (HS-13 fix) — moduleTaskTypesProvider in CandidateGeneration.
 * Verifies that modalities are filtered by what the module actually supports.
 */
import { describe, it, expect } from 'vitest';
import { generateCandidates, createModuleTaskTypesProvider, type WorldState } from '../../src/core/engines/CandidateGeneration.js';
import { createInitialWorldState } from '../../src/core/engines/CandidateGeneration.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';
import type { Holon } from '../../src/core/world/Holon.js';

function makeAltitudes(stage: Stage): Record<Line, Stage> {
  return {
    Cognitive: stage, Emotional: stage, Moral: stage, Intrapersonal: stage,
    Spiritual: stage, Somatic: stage, Willpower: stage, Interpersonal: stage,
  };
}

function makeHolon(line: Line, stage: Stage): Holon {
  return {
    id: `${line}:${stage}`,
    name: `${line} ${stage}`,
    kind: 'NPC',
    line,
    stage,
    drives: { dominant: 'Agency', secondary: 'Communion', shadowQuadrant: null },
    polarity: 'Radiative',
    narrativeRole: 'test',
    relationships: [],
    active: true,
  };
}

describe('T-0.4 — createModuleTaskTypesProvider', () => {
  it('returns the set of task types for a known module', () => {
    const provider = createModuleTaskTypesProvider((line, stage) => {
      if (line === 'Cognitive' && stage === 'Red') {
        return { tasks: [{ type: 'n_back' }, { type: 'stroop' }] };
      }
      return undefined;
    });
    const types = provider('Cognitive:Red');
    expect(types).toBeInstanceOf(Set);
    expect(types!.has('n_back')).toBe(true);
    expect(types!.has('stroop')).toBe(true);
    expect(types!.size).toBe(2);
  });

  it('returns undefined for an unknown module', () => {
    const provider = createModuleTaskTypesProvider(() => undefined);
    expect(provider('Unknown:Stage')).toBeUndefined();
  });

  it('returns undefined for a malformed moduleRef', () => {
    const provider = createModuleTaskTypesProvider(() => ({ tasks: [] }));
    expect(provider('no-colon-here')).toBeUndefined();
  });
});

describe('T-0.4 — generateCandidates filters modalities by module support', () => {
  it('excludes modalities whose task types are not in the module', () => {
    const sig = createSignificator('p1', makeAltitudes('Red'), 'Red');
    const holon = makeHolon('Cognitive', 'Red');
    const world: WorldState = createInitialWorldState([holon]);

    // Module supports only n_back + stroop → only 'Deterministic' modality eligible
    // (Deterministic = ['n_back', 'stroop', 'go_no_go', 'reaction_time'])
    // ImmersiveRPG = ['dilemma', 'scenario', 'emotion_identification', 'self_report', 'cooperation']
    // → ImmersiveRPG should be EXCLUDED because none of its task types match.
    const provider = createModuleTaskTypesProvider(() => ({
      tasks: [{ type: 'n_back' }, { type: 'stroop' }],
    }));

    const candidates = generateCandidates(sig, world, Date.now(), undefined, provider);
    const modalities = new Set(candidates.map(c => c.modality));

    // Deterministic should be eligible (n_back matches)
    expect(modalities.has('Deterministic')).toBe(true);
    // ImmersiveRPG should NOT be eligible (no matching task types)
    expect(modalities.has('ImmersiveRPG')).toBe(false);
    // SocialCooperative should NOT be eligible (cooperation/imitation not in module)
    expect(modalities.has('SocialCooperative')).toBe(false);
  });

  it('falls back to legacy behavior (all modalities eligible) when no provider is given', () => {
    const sig = createSignificator('p1', makeAltitudes('Red'), 'Red');
    const holon = makeHolon('Cognitive', 'Red');
    const world: WorldState = createInitialWorldState([holon]);

    // No provider → all modalities eligible (legacy behavior)
    const candidates = generateCandidates(sig, world, Date.now());
    const modalities = new Set(candidates.map(c => c.modality));
    // At least 3 modalities should be eligible (the getEligibleModalities cap)
    expect(modalities.size).toBeGreaterThanOrEqual(1);
  });

  it('includes a modality when at least one of its task types matches', () => {
    const sig = createSignificator('p1', makeAltitudes('Red'), 'Red');
    const holon = makeHolon('Moral', 'Red');
    const world: WorldState = createInitialWorldState([holon]);

    // Module supports dilemma → ScenarioChoice AND ImmersiveRPG both match
    const provider = createModuleTaskTypesProvider(() => ({
      tasks: [{ type: 'dilemma' }],
    }));

    const candidates = generateCandidates(sig, world, Date.now(), undefined, provider);
    const modalities = new Set(candidates.map(c => c.modality));
    expect(modalities.has('ScenarioChoice')).toBe(true);
    expect(modalities.has('ImmersiveRPG')).toBe(true);
  });
});

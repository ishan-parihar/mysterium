/**
 * Wave 1.7: Integration test verifying that ContextPipeline's system prompt
 * contains the complexityRegister and crossAltitudeDirective for a
 * cross-altitude scenario (Teal player × Red holon).
 */
import { describe, it, expect } from 'vitest';
import { buildContext, type ContextPipelineInput } from '../../src/infra/llm/ContextPipeline.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import { createRegistry } from '../../src/core/data/HolonRegistry.js';
import type { ConceptDraftIndex as ConceptDraftIndexType } from '../../src/core/data/ConceptDraftIndex.js';
import type { ScheduledEncounter } from '../../src/core/domain/EncounterSpecNew.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';
import type { Holon } from '../../src/core/domain/Holon.js';

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
    line, stage,
    drives: { dominant: 'Agency', secondary: 'Communion', shadowQuadrant: null },
    polarity: 'Radiative',
    narrativeRole: 'test',
    relationships: [],
    active: true,
  };
}

function makeEncounter(): ScheduledEncounter {
  return {
    id: 'test-encounter',
    moduleRef: 'Cognitive:Red',
    modality: 'Deterministic',
    targetLines: ['Cognitive'],
    stage: 'Red',
    holonSource: 'Cognitive:Red',
    shadowTarget: null,
    polarityMode: 'Exploring',
    difficulty: 0.5,
    sessionPosition: 'peak',
    priority: 0.5,
    driveTarget: null,
    executionMode: 'capacity',
  };
}

function makeInput(playerStage: Stage): ContextPipelineInput {
  const sig = createSignificator('p1', makeAltitudes(playerStage), playerStage);
  const holon = makeHolon('Cognitive', 'Red');
  const registry = createRegistry([holon]);
  const conceptIndex = { modules: {} } as ConceptDraftIndexType;
  return {
    encounter: makeEncounter(),
    significator: sig,
    holonRegistry: registry,
    conceptIndex,
    recentConsequences: [],
    sessionContext: { energy: 'moderate' },
  };
}

describe('Wave 1.7: ContextPipeline altitude-scaling integration', () => {
  it('system prompt contains complexityRegister for co-altitudinal (Red player × Red holon)', () => {
    const output = buildContext(makeInput('Red'));
    expect(output.systemPrompt).toContain('complexity=');
    expect(output.systemPrompt).toContain('concrete-imperative');
  });

  it('system prompt contains complexityRegister for cross-altitude (Teal player × Red holon)', () => {
    const output = buildContext(makeInput('Teal'));
    expect(output.systemPrompt).toContain('complexity=');
    expect(output.systemPrompt).toContain('integral-paradox-holding');
  });

  it('system prompt contains crossAltitudeDirective for cross-altitude scenario', () => {
    const output = buildContext(makeInput('Teal'));
    expect(output.systemPrompt).toContain('CROSS-ALTITUDE DIRECTIVE');
    expect(output.systemPrompt).toContain('Teal');
    expect(output.systemPrompt).toContain('Red');
    expect(output.systemPrompt).toContain('Do NOT collapse to the Red register');
  });

  it('system prompt contains co-altitudinal directive for same-stage scenario', () => {
    const output = buildContext(makeInput('Red'));
    expect(output.systemPrompt).toContain('co-altitudinal');
  });

  it('system prompt contains scaffolding directive for player below holon', () => {
    const output = buildContext(makeInput('Infrared'));
    expect(output.systemPrompt).toContain('from below');
    expect(output.systemPrompt).toContain('scaffolding');
  });

  it('system prompt includes altitude-scaling rule', () => {
    const output = buildContext(makeInput('Red'));
    expect(output.systemPrompt).toContain('Scale cognitive complexity to the player\'s altitude');
  });
});

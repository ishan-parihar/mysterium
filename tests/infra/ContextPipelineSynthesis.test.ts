/**
 * Tests for T-2.9 — agentSynthesis injection into ContextPipeline.
 * Verifies that cross-encounter synthesis from SessionAgent is included
 * in the LLM system prompt when provided.
 */
import { describe, it, expect } from 'vitest';
import { buildContext, type ContextPipelineInput } from '../../src/infra/llm/ContextPipeline.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import { createRegistry } from '../../src/core/world/store/HolonStore.js';
import type { ConceptDraftIndex as ConceptDraftIndexType } from '../../src/core/data/ConceptDraftIndex.js';
import type { ScheduledEncounter } from '../../src/core/domain/EncounterSpecNew.js';
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

function makeInput(synthesis?: string): ContextPipelineInput {
  const sig = createSignificator('p1', makeAltitudes('Red'), 'Red');
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
    agentSynthesis: synthesis,
  };
}

describe('T-2.9 — agentSynthesis injection into ContextPipeline', () => {
  it('buildContext accepts an optional agentSynthesis field', () => {
    const input = makeInput('Lines explored: Cognitive, Emotional');
    expect(input.agentSynthesis).toBe('Lines explored: Cognitive, Emotional');
    // buildContext should not throw
    const output = buildContext(input);
    expect(output).toBeDefined();
    expect(output.systemPrompt).toBeDefined();
  });

  it('includes [SESSION SYNTHESIS] block when agentSynthesis is provided', () => {
    const synthesis = 'Lines explored: Cognitive, Emotional\nDominant drive pattern: agency(2/3)';
    const output = buildContext(makeInput(synthesis));
    expect(output.systemPrompt).toContain('[SESSION SYNTHESIS]');
    expect(output.systemPrompt).toContain(synthesis);
  });

  it('omits [SESSION SYNTHESIS] block when agentSynthesis is not provided', () => {
    const output = buildContext(makeInput(undefined));
    expect(output.systemPrompt).not.toContain('[SESSION SYNTHESIS]');
  });

  it('omits [SESSION SYNTHESIS] block when agentSynthesis is empty string', () => {
    const output = buildContext(makeInput(''));
    expect(output.systemPrompt).not.toContain('[SESSION SYNTHESIS]');
  });
});

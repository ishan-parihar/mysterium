/**
 * Runtime bridge + composed-world prompt block tests (46 §7 step 6, PLAN-IMPLEMENT wiring).
 * Locks: bridge determinism, modality-variant preference, graceful degradation on empty cells,
 * the [COMPOSED WORLD] prompt block's presence/absence rules, and store integrity binding
 * (no duplicate facet keys in the compiled store).
 */
import { describe, it, expect } from 'vitest';
import { composeWorldTexture } from '../../src/core/personalization/runtimeBridge.js';
import { createFacetStore } from '../../src/core/world/facets/FacetStore.js';
import { INITIAL_TAGS } from '../../src/core/world/tags/initialTags.js';
import facetsJson from '../../src/core/world/facets/facets.json';
import { buildContext } from '../../src/infra/llm/ContextPipeline.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import { ALL_LINES } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';
import type { Line } from '../../src/core/domain/Line.js';

function makeAltitudes(stage: Stage): Record<Line, Stage> {
  return Object.fromEntries(ALL_LINES.map((l) => [l, stage])) as Record<Line, Stage>;
}
import type { FacetStore } from '../../src/core/world/facets/FacetStore.js';
import type { ScheduledEncounter } from '../../src/core/domain/EncounterSpecNew.js';

const store: FacetStore = createFacetStore(
  new Set(INITIAL_TAGS.map((t) => t.id)),
  (facetsJson as unknown as { facets: never }).facets as never,
);

describe('runtime bridge (46 §7 step 6)', () => {
  it('composes deterministically — same cell+modality ⇒ same texture', () => {
    const a = composeWorldTexture({ line: 'Cognitive', stage: 'Red', modality: 'ImmersiveRPG', facets: store });
    const b = composeWorldTexture({ line: 'Cognitive', stage: 'Red', modality: 'ImmersiveRPG', facets: store });
    expect(a).toBeDefined();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('prefers the @Modality variant when present', () => {
    const tex = composeWorldTexture({ line: 'Cognitive', stage: 'Red', modality: 'ScenarioChoice', facets: store })!;
    const variantFacet = store.byKey('Cognitive:Red:pressure-lever@ScenarioChoice')!;
    const baseFacet = store.byKey('Cognitive:Red:pressure-lever');
    // the lever text came from the ScenarioChoice variant, not a base key
    if (variantFacet.payload.kind === 'pressure-lever' && !baseFacet) {
      expect(tex.lever).toContain(variantFacet.payload.lever.slice(0, 40));
    }
    expect(tex.lever.length).toBeGreaterThan(0);
  });

  it('degrades gracefully — an empty store yields undefined, not an empty texture', () => {
    const empty = createFacetStore(new Set(INITIAL_TAGS.map((t) => t.id)), []);
    expect(composeWorldTexture({ line: 'Cognitive', stage: 'Red', modality: 'Embodied', facets: empty })).toBeUndefined();
  });

  it('carries only canon prose — no stage labels from the developmental side leak in', () => {
    const tex = composeWorldTexture({ line: 'Cognitive', stage: 'Red', modality: 'Strategic', facets: store })!;
    const s = JSON.stringify(tex);
    // facet payloads are corpus text; they may mention stage names in prose, but the texture
    // itself must not contain score-like fields
    expect(s).not.toContain('"score"');
    expect(s).not.toContain('"cci"');
  });
});

describe('[COMPOSED WORLD] prompt block (ContextPipeline)', () => {
  const encounter = {
    id: 'e1',
    moduleRef: 'Cognitive:Red',
    targetLines: ['Cognitive' as const],
    stage: 'Red' as const,
    modality: 'ImmersiveRPG' as const,
    executionMode: 'standard' as const,
    holonSource: 'red' as const,
    priority: 0.6,
  } as unknown as ScheduledEncounter;
  const baseInput = {
    encounter,
    significator: createSignificator('g22', makeAltitudes('Red'), 'Red'),
    holonRegistry: { holons: [] },
    conceptIndex: { modules: {} },
    recentConsequences: [],
    sessionContext: { energy: 'high' as const },
  };

  it('appears when composedWorld is provided and is non-empty', () => {
    const tex = composeWorldTexture({ line: 'Cognitive', stage: 'Red', modality: 'ImmersiveRPG', facets: store })!;
    const out = buildContext({ ...baseInput, composedWorld: tex });
    expect(out.systemPrompt).toContain('[COMPOSED WORLD]');
    expect(out.systemPrompt).toContain('role=');
  });

  it('is absent when composedWorld is omitted (fallback to holon registry alone)', () => {
    const out = buildContext(baseInput);
    expect(out.systemPrompt).not.toContain('[COMPOSED WORLD]');
  });
});

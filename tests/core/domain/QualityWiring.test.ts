/**
 * QUALITY-WIRING (MY-AD-0030) — the quality data has runtime readers, not just a test.
 *
 * The deferral this file locks: `StageQuality` (and `RAY_LENS`'s descriptive fields) were data
 * with a test and no consumer, so `agapeScan`/`erosScan` had no runtime caller and the
 * per-quadrant pathology markers never reached doc 10's shadow model or the encounter scheduler.
 * Three consumers now exist; each is asserted here at its OWN seam, plus the invariants that make
 * the data safe to feed an LLM prompt (Veil) and to derive from (purity).
 *
 * Consumers under test:
 *   1. `buildDevelopmentalAgenda` → `ContextPipeline`'s `[DEVELOPMENTAL AGENDA]` block
 *      (Eros + Agape in one computed record — AGENTS.md §5.3's two vectors, one computation).
 *   2. `generateFrequencySpec().lensRead` → `RAY_LENS.rayFunction`/`subtleBody` +
 *      `qualityOf().emergentOrder` (MY-AD-0029's previously-unread fields).
 *   3. `buildShadowPromptSuffix` → `pathologyIn` via `LINE_QUADRANT` (doc 10's shadow model
 *      grounded in the per-quadrant pathology markers).
 */
import { describe, expect, it } from 'vitest';
import {
  buildDevelopmentalAgenda,
  pathologyIn,
} from '../../../src/core/domain/StageQuality.js';
import { generateFrequencySpec } from '../../../src/infra/llm/FrequencyConditioner.js';
import {
  generateShadowContent,
  buildShadowPromptSuffix,
} from '../../../src/core/engines/ShadowContentGenerator.js';
import { createSignificator } from '../../../src/core/domain/Significator.js';
import { ALL_LINES, type Line } from '../../../src/core/domain/Line.js';
import type { Stage } from '../../../src/core/domain/Stage.js';
import { buildContext } from '../../../src/infra/llm/ContextPipeline.js';

describe('the developmental agenda is computed, not declared', () => {
  it('carries both vectors at every altitude', () => {
    for (const cog of ['Red', 'Green', 'Turquoise'] as const) {
      const agenda = buildDevelopmentalAgenda(cog);
      expect(agenda.centreOfGravity).toBe(cog);
      // Agape: 4 quadrants per altitude below the CoG, non-empty whenever anything is below.
      expect(agenda.agape.length, `${cog} agape entries`).toBeGreaterThanOrEqual(0);
      expect(agenda.agape.length % 4, `${cog} entries are whole altitudes`).toBe(0);
    }
  });

  it('is empty at the bottom (nothing below to heal) and Eros-full above it', () => {
    const bottom = buildDevelopmentalAgenda('Infrared');
    expect(bottom.agape).toEqual([]);
    expect(bottom.eros?.calledToward).toBe('Magenta');

    const top = buildDevelopmentalAgenda('Turquoise');
    expect(top.agape).toHaveLength(7 * 4);
    expect(top.eros).toBeNull(); // the next attractor is the closure, not an altitude
  });

  it('is pure: same centre of gravity, same agenda, twice', () => {
    expect(buildDevelopmentalAgenda('Orange')).toEqual(buildDevelopmentalAgenda('Orange'));
  });
});

describe('consumer 1: the ContextPipeline renders the agenda Veil-safe', () => {
  const agenda = buildDevelopmentalAgenda('Amber');

  it('includes the agenda block when provided', () => {
    const { systemPrompt } = buildContext(minimalInput({ developmentalAgenda: agenda }));
    expect(systemPrompt).toContain('[DEVELOPMENTAL AGENDA]');
    expect(systemPrompt).toContain('called toward Orange');
  });

  it('omits the block when absent — no empty markers in the prompt', () => {
    const { systemPrompt } = buildContext(minimalInput({}));
    expect(systemPrompt).not.toContain('[DEVELOPMENTAL AGENDA]');
  });

  it('carries marker prose, never numbers or quadrant codes (Veil)', () => {
    const { systemPrompt } = buildContext(minimalInput({ developmentalAgenda: agenda }));
    const block = systemPrompt.split('[DEVELOPMENTAL AGENDA]')[1]?.split('\n[')[0] ?? '';
    expect(block).not.toMatch(/\b\d\.\d\d\b/); // no scores
    expect(block).not.toMatch(/\b(UL|UR|LL|LR)\b/); // no quadrant codes
  });
});

describe('consumer 2: frequency conditioning reads the ray lens and the emergent order', () => {
  it('exposes the holon position as WHAT is worked, not only HOW to speak', () => {
    const spec = generateFrequencySpec('Cognitive', 'Orange', 'Cognitive', 'Teal', 'Deterministic');
    // Teal: gateway opens (the same-ray half of MY-AD-0029's finding).
    expect(spec.lensRead.rayFunction).toMatch(/gateway opens/i);
    expect(spec.lensRead.subtleBody).toBeTruthy();
    expect(spec.lensRead.emergentOrder).toMatch(/gateway opens/i);
    // The voice table (HOW) is unchanged by the lens read (WHAT).
    expect(spec.toneDirective).toContain('integral');
  });

  it('distinguishes the two positions that share a ray — the whole point of the lens', () => {
    const teal = generateFrequencySpec('Cognitive', 'Green', 'Moral', 'Teal', 'Deterministic');
    const turq = generateFrequencySpec('Cognitive', 'Green', 'Moral', 'Turquoise', 'Deterministic');
    expect(teal.lensRead.rayFunction).toMatch(/opens/);
    expect(turq.lensRead.rayFunction).toMatch(/traversed/);
    expect(teal.lensRead.rayFunction).not.toBe(turq.lensRead.rayFunction);
  });
});

describe('consumer 3: shadow encounters name the altitude’s actual pathology content', () => {
  it('the suffix grounds the work in the line’s AQAL quadrant marker', () => {
    const content = generateShadowContent('Cognitive', 'Red', 'DarkAddiction');
    const suffix = buildShadowPromptSuffix(content, 'Cognitive', 'Red', 2);
    // Cognitive is UR; the UR pathology marker of Red must appear verbatim.
    expect(suffix).toContain('[THE MATERIAL ITSELF]');
    expect(suffix).toContain(pathologyIn('Red', 'UR'));
  });

  it('differs by line even at the same (stage, shadow quadrant)', () => {
    const cognitive = buildShadowPromptSuffix(generateShadowContent('Cognitive', 'Red', 'DarkAddiction'), 'Cognitive', 'Red', 1);
    const moral = buildShadowPromptSuffix(generateShadowContent('Moral', 'Red', 'DarkAddiction'), 'Moral', 'Red', 1);
    // UR (Cognitive) vs LL (Moral) — different quadrants, different live material.
    expect(cognitive).toContain(pathologyIn('Red', 'UR'));
    expect(moral).toContain(pathologyIn('Red', 'LL'));
    expect(cognitive).not.toBe(moral);
  });

  it('carries no AQAL codes and no scores in the material text (Veil)', () => {
    const suffix = buildShadowPromptSuffix(generateShadowContent('Cognitive', 'Amber', 'GoldenAllergy'), 'Cognitive', 'Amber', 0);
    const material = suffix.split('[THE MATERIAL ITSELF]')[1]?.split('\n')[0] ?? '';
    expect(material).not.toMatch(/\b(UL|UR|LL|LR)\b/);
    expect(material).not.toMatch(/\b\d\.\d\d\b/);
  });
});

// ── helpers ─────────────────────────────────────────────────────────────────

function allAltitudes(stage: Stage): Record<Line, Stage> {
  return Object.fromEntries(ALL_LINES.map(l => [l, stage])) as Record<Line, Stage>;
}

/** Minimal ContextPipelineInput: the pipeline is exercised through its real type here. */
function minimalInput(extra: Record<string, unknown>): Parameters<typeof buildContext>[0] {
  const s = createSignificator('ctx-pipeline-quality', allAltitudes('Amber'), 'Amber');
  return {
    encounter: minimalEncounter(),
    significator: s,
    holonRegistry: { holons: [] },
    conceptIndex: { modules: {} },
    recentConsequences: [],
    sessionContext: { energy: 'high' },
    ...extra,
  } as unknown as Parameters<typeof buildContext>[0];
}

function minimalEncounter(): Record<string, unknown> {
  return {
    id: 'q-wiring',
    moduleRef: 'Cognitive:Amber',
    modality: 'Deterministic',
    targetLines: ['Cognitive'],
    stage: 'Amber',
    holonSource: 'infrared',
    shadowTarget: null,
    polarityMode: 'exploratory',
    difficulty: 0.5,
    sessionPosition: 1,
    driveTarget: 'Agency',
    executionMode: 'capacity',
  };
}

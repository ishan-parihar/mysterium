/**
 * ContextBlocks contract tests — module-cohesion audit item 5 (rule M3).
 *
 * The optional blocks were inline concatenations inside `assembleSystemPrompt`, so nothing declared
 * their order and nothing could assert it. They are now a table (`OPTIONAL_BLOCKS`) with three
 * properties worth locking:
 *
 * 1. **Absence contributes nothing.** A caller with a cold holon or a first boot must not receive a
 *    blank section — the prompt's section list is otherwise fixed and a reader (or an LLM) treats a
 *    present-but-empty header as an instruction.
 * 2. **Order is declared, not implied.** The order is the table's, so it cannot drift with an
 *    argument list.
 * 3. **Every block is Veil-safe.** None of them may carry a stage ordinal or a taxonomy label.
 */
import { describe, it, expect } from 'vitest';
import {
  renderOptionalBlocks,
  formatPlayerState,
  formatCognitiveState,
  formatKnowledgeState,
  formatComposedWorld,
  injectModalityRubric,
  getOutputFormat,
  type VeilFilteredSignificator,
} from '../../src/infra/llm/contextBlocks.js';
import { ALL_MODALITIES, ALL_SHADOW_QUADRANTS } from '../../src/core/domain/enums.js';

describe('renderOptionalBlocks — absence', () => {
  it('renders nothing at all when a caller supplies no optional context', () => {
    expect(renderOptionalBlocks({})).toBe('');
  });

  it('treats the presence-but-empty cases as absent', () => {
    // A cold holon, a first boot, and an empty agenda are all "no block", never a blank header.
    const rendered = renderOptionalBlocks({
      holonProfileBlock: [],
      continuityBlock: [],
      scenarioSeedBlock: '   ',
      worldPlaceBlock: '',
      cognitiveSnapshot: [],
      polarityTextures: [],
      knowledgeState: { conceptCount: 0, avgRetention: 0, reviewCandidates: [] },
    });
    expect(rendered).toBe('');
  });

  it('never emits a section header without content', () => {
    const rendered = renderOptionalBlocks({ composedWorld: undefined, agentSynthesis: undefined });
    expect(rendered).not.toMatch(/\[[A-Z-]+ \]\s*$/);
    expect(rendered.trim()).toBe('');
  });
});

describe('renderOptionalBlocks — declared order', () => {
  it('orders the blocks by the table, not by the caller', () => {
    const rendered = renderOptionalBlocks({
      agentSynthesis: 'synthesis',
      cognitiveSnapshot: [{ line: 'Cognitive', score01: 0.9, trend: 'rising', lastPlayedDaysAgo: 1 }],
      knowledgeState: { conceptCount: 3, avgRetention: 0.8, reviewCandidates: [] },
      developmentalAgenda: undefined,
      composedWorld: {
        role: 'r', stake: 's', lever: 'l', voice: 'v', aesthetic: 'a', polarity: 'p', relationship: 'b', memory: 'm',
      },
      personalizationBlock: undefined,
      holonProfileBlock: ['remembers you'],
      scenarioSeedBlock: 'a situation',
      worldPlaceBlock: 'a place',
      continuityBlock: ['you were here before'],
    });

    const order = ['[SESSION SYNTHESIS]', '[COGNITIVE STATE]', '[KNOWLEDGE STATE]', '[COMPOSED WORLD]',
      '[HOLON MEMORY]', '[SCENARIO SEED]', '[WORLD PLACE]', '[CROSS-SESSION MEMORY]'];
    const positions = order.map((marker) => rendered.indexOf(marker));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('flattens a multi-line seed so a block cannot break the section layout', () => {
    const rendered = renderOptionalBlocks({ scenarioSeedBlock: 'line one\nline two' });
    expect(rendered).toContain('[SCENARIO SEED] line one | line two');
    expect(rendered.split('\n').filter((l) => l.trim() !== '')).toHaveLength(1);
  });
});

describe('contextBlocks — Veil safety on the render path', () => {
  const sig: VeilFilteredSignificator = {
    perceivedLayer: 'Orange',
    lineAltitudes: {} as VeilFilteredSignificator['lineAltitudes'],
    activeDriveSignals: ['agency-elevated', 'communion-suppressed'],
    activeShadowSignals: ['DarkAddiction-cognitive-active', 'GoldenAllergy-moral-active'],
    recentChoicePatterns: ['Red-to-Amber'],
    transformationProximity: 'threshold',
    sessionEnergy: 'high',
  };

  it('names no drive in the player-state block', () => {
    const rendered = formatPlayerState(sig);
    for (const leak of ['agency', 'communion', 'eros', 'agape']) {
      expect(rendered.toLowerCase()).not.toContain(leak.toLowerCase());
    }
  });

  it('translates EVERY canonical quadrant, so none can pass through verbatim', () => {
    // The map this replaced tested substrings of hand-written spellings (`darkavert`,
    // `goldenavert`) that do not occur in the canonical quadrant names, so `DarkAllergy` and
    // `GoldenAllergy` were echoed straight into the prompt — the raw label, to the model told not
    // to leak it. Total over the canonical set is the property that makes that impossible.
    for (const quadrant of ALL_SHADOW_QUADRANTS) {
      const rendered = formatPlayerState({
        ...sig,
        activeShadowSignals: [`${quadrant}-cognitive-active`],
      });
      expect(rendered).not.toContain(quadrant);
      expect(rendered).not.toContain(quadrant.toLowerCase());
      expect(rendered).toContain('undercurrents = ');
    }
  });

  it('renders cognitive and knowledge state as felt-sense, never as a score', () => {
    const cognitive = formatCognitiveState([
      { line: 'Cognitive', score01: 0.9, trend: 'rising', lastPlayedDaysAgo: 2 },
      { line: 'Moral', score01: 0.2, trend: 'decaying', lastPlayedDaysAgo: 40 },
    ]);
    expect(cognitive).toContain('sharp lately');
    expect(cognitive).toContain('a little distant');
    expect(cognitive).not.toContain('0.9');

    const knowledge = formatKnowledgeState({ conceptCount: 12, avgRetention: 0.8, reviewCandidates: [] });
    expect(knowledge).toContain('well-held');
    expect(knowledge).not.toContain('0.8');
  });

  it('collapses empty facets instead of printing blank fields', () => {
    expect(formatComposedWorld({
      role: 'a smith', stake: '', lever: '', voice: '', aesthetic: '', polarity: '', relationship: '', memory: '',
    })).toBe('\n[COMPOSED WORLD] role=a smith');
  });

  it('has a rubric and an output format for every modality — no silent undefined', () => {
    for (const modality of ALL_MODALITIES) {
      expect(injectModalityRubric(modality)).toBeTruthy();
      expect(getOutputFormat(modality)).toBeTruthy();
    }
  });
});

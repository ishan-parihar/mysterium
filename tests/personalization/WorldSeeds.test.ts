/**
 * Authored world-seed tests — the WORLD tier of the authored seeding (46 §2's world library,
 * 45 §5 §2). Locks:
 *  - coverage: exactly one authored world seed per cell, 64/64, no duplicates (compile-time
 *    via the module's own assertion, re-checked here);
 *  - every seed's tags resolve in the tag store (46 §11 invariant 4 at the content layer);
 *  - every seed carries provenance and substantive four-part prose (place/texture/population/
 *    tension), stage-coherent by construction;
 *  - the library audit passes (self-coherence + no duplicates);
 *  - the library registration: 64 authored worlds × 7 modalities present, poolable against
 *    their cell, ranked within the world tier;
 *  - the envelope integration: `worldPlace` rides `buildEnvelope`, absent nowhere across the
 *    full 64-cell grid;
 *  - the [WORLD PLACE] prompt block: present when seeded, absent when not (degradation, never
 *    fabrication).
 */
import { describe, it, expect } from 'vitest';
import { WORLD_SEEDS, assertWorldSeedCoverage } from '../../src/core/personalization/worldSeeds.js';
import { worldPlaceBlock, buildEnvelope, createOrchestrationServices } from '../../src/core/personalization/sessionRuntime.js';
import { auditSeedLibrary } from '../../src/core/personalization/stageCoherence.js';
import { seedCandidateLibrary, seedWorldCandidates, initialTopicTagResolver } from '../../src/core/personalization/candidateLibrary.js';
import { INITIAL_TAGS } from '../../src/core/world/tags/initialTags.js';
import { createFacetStore } from '../../src/core/world/facets/FacetStore.js';
import { ALL_LINES } from '../../src/core/domain/Line.js';
import { ALL_STAGES } from '../../src/core/domain/Stage.js';
import { ALL_MODALITIES } from '../../src/core/domain/enums.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { Significator } from '../../src/core/domain/Significator.js';
import { pool } from '../../src/core/personalization/pooling.js';
import { createTagStore } from '../../src/core/world/tags/dialectic.js';
import { projectUdv } from '../../src/core/personalization/udv.js';

const TAG_IDS = new Set(INITIAL_TAGS.map((t) => t.id));

// ── Minimal significator (envelope tests) — mirrors RuntimeLoop.test.ts's fixture ──────────
function mkSignificator(): Significator {
  const ladder = ['Infrared', 'Magenta', 'Red', 'Amber', 'Orange', 'Green', 'Teal', 'Turquoise'] as const;
  return {
    altitudes: Object.fromEntries(ALL_LINES.map((l, i) => [l, ladder[Math.min(7, 3 + (i % 3))]])),
    shadows: { entries: [] },
  } as unknown as Significator;
}

describe('world seed coverage and hygiene', () => {
  it('has exactly one authored world seed per cell — 64/64, no duplicates', () => {
    expect(() => assertWorldSeedCoverage()).not.toThrow();
    expect(WORLD_SEEDS.length).toBe(64);
    const seen = new Set<string>();
    for (const w of WORLD_SEEDS) {
      const key = `${w.line}:${w.stage}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    expect(seen.size).toBe(64);
    for (const line of ALL_LINES) {
      for (const stage of ALL_STAGES) {
        expect(seen.has(`${line}:${stage}`)).toBe(true);
      }
    }
  });

  it('every seed has a unique, correctly-shaped id', () => {
    const ids = new Set(WORLD_SEEDS.map((w) => w.id));
    expect(ids.size).toBe(64);
    for (const w of WORLD_SEEDS) expect(w.id).toBe(`world:${w.line}:${w.stage}:authored`);
  });

  it('every seed\u2019s tags resolve in the tag store (46 §11 invariant 4 at the content layer)', () => {
    for (const w of WORLD_SEEDS) {
      expect(w.tags.length).toBeGreaterThan(0);
      for (const t of w.tags) expect(TAG_IDS.has(t)).toBe(true);
    }
  });

  it('every seed carries provenance and substantive four-part prose', () => {
    for (const w of WORLD_SEEDS) {
      expect(w.groundedIn).toContain('module-spec');
      expect(w.groundedIn).toContain(w.line.toLowerCase());
      expect(w.groundedIn.toLowerCase()).toContain(stageSlug(w.stage));
      expect(w.place.length).toBeGreaterThan(60);
      expect(w.texture.length).toBeGreaterThan(30);
      expect(w.population.length).toBeGreaterThan(20);
      expect(w.tension.length).toBeGreaterThan(20);
    }
  });

  it('the library audit passes (self-coherence + no duplicates)', () => {
    const audit = auditSeedLibrary(WORLD_SEEDS);
    expect(audit.ok).toBe(true);
    expect(audit.problems).toEqual([]);
  });

  it('seed prose stays Veil-safe: no ordinals, no scores, no taxonomy labels', () => {
    const forbidden = /\b(stage|orange|green|teal|amber|infrared|magenta|turquoise|quadrant|shadow-quadrant)\b/i;
    // 'green' as a color word could be legitimate — but seed text never needs it; fail loudly
    // so authors notice rather than silently leaking taxonomy into player-facing prose.
    for (const w of WORLD_SEEDS) {
      expect(forbidden.test(w.place)).toBe(false);
      expect(forbidden.test(w.texture)).toBe(false);
      expect(forbidden.test(w.population)).toBe(false);
      expect(forbidden.test(w.tension)).toBe(false);
    }
  });
});

function stageSlug(stage: string): string {
  return stage.toLowerCase();
}

describe('library registration', () => {
  const store = createFacetStore(TAG_IDS);
  const library = seedCandidateLibrary(store);

  it('registers 64 authored worlds × 7 modalities', () => {
    const worldAuthored = library.filter((c) => c.id.startsWith('world-authored:'));
    expect(worldAuthored.length).toBe(64 * 7);
  });

  it('each registered rendering carries its seed\u2019s tags and cell', () => {
    for (const m of seedWorldCandidates()) {
      const seed = WORLD_SEEDS.find((w) => w.id === `world:${m.cell.line}:${m.cell.stage}:authored`);
      expect(seed).toBeDefined();
      expect(m.tags).toEqual([...seed!.tags]);
      expect(m.landsIn).toEqual([...seed!.tags]);
    }
  });

  it('authored worlds are reachable through pooling for their own cell', () => {
    const tags = createTagStore(INITIAL_TAGS);
    const udv = projectUdv({
      usableFields: new Set(),
      declaredInterests: [],
      developmental: { stageOrdinals: {} as never, activeShadowQuadrants: [] },
      purpose: [],
    });
    // Sweep the full grid: every (line × stage × modality) query must surface at least one
    // world-authored candidate in the ranking — the world tier is never empty.
    for (const line of ALL_LINES) {
      for (const stage of ALL_STAGES) {
        for (const modality of ALL_MODALITIES) {
          const result = pool(tags, udv, library, {
            mode: 'spiral',
            states: {},
            target: { line, stage, modality },
            maxStratum: 0,
            playerDepth: 0,
            resolve: initialTopicTagResolver,
            now: 0,
          });
          const hit = result.ranked.some((c) => c.id.startsWith('world-authored:'));
          expect(hit, `no world-authored candidate pooled for ${line}:${stage}:${modality}`).toBe(true);
        }
      }
    }
  });
});

describe('envelope integration', () => {
  const holons = [] as never[];
  const services = createOrchestrationServices(holons);
  const sig = mkSignificator();

  it('buildEnvelope returns worldPlace for every cell across the 64-grid', () => {
    for (const line of ALL_LINES) {
      for (const stage of ALL_STAGES) {
        for (const modality of ALL_MODALITIES) {
          const { worldPlace } = buildEnvelope(
            services,
            sig,
            undefined,
            { line: line as Line, stage, modality },
            'test purpose',
            [],
            0,
          );
          expect(worldPlace, `worldPlace missing for ${line}:${stage}`).toBeTruthy();
          expect(worldPlace!).toContain('Where:');
          expect(worldPlace!).toContain('Around you:');
          expect(worldPlace!).toContain('The place asks:');
        }
      }
    }
  });

  it('worldPlace text is the authored seed\u2019s own prose, unaltered in order', () => {
    const w = WORLD_SEEDS[0]!;
    const block = worldPlaceBlock(w.line, w.stage)!;
    expect(block.indexOf(w.place)).toBeGreaterThan(-1);
    expect(block.indexOf(w.texture)).toBeGreaterThan(block.indexOf(w.place));
    expect(block.indexOf(w.population)).toBeGreaterThan(block.indexOf(w.texture));
    expect(block.indexOf(w.tension)).toBeGreaterThan(block.indexOf(w.population));
  });

  it('degrades to null for an unseeded cell (never fabricates)', () => {
    // A real cell resolves; an unknown stage finds nothing → null (the degradation path).
    expect(worldPlaceBlock('Cognitive', 'Infrared')).toBeTruthy();
    expect(worldPlaceBlock('Cognitive', 'Nonexistent' as never)).toBeNull();
  });
});

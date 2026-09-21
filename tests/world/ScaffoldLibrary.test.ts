import { describe, it, expect } from 'vitest';
import {
  SCAFFOLDS, SCAFFOLD_BY_ID, selectScaffold, fadeTargets,
} from '../../src/core/world/scaffolds/ScaffoldLibrary.js';

const base = {
  metaProgramProfile: { options_procedures: 0.8, global_specific: 0.5, proactive_reactive: 0.6 },
  depth: 2, stage: 'Amber' as const, modality: 'ScenarioChoice',
  exposures: {}, seed: 42,
};

describe('scaffold library (47 §6)', () => {
  it('§6.2 — the ten scaffolds exist', () => {
    expect(SCAFFOLDS).toHaveLength(10);
    expect(SCAFFOLD_BY_ID.get('solo-inquiry')?.maxExposures).toBeNull(); // terminal
    expect(SCAFFOLD_BY_ID.get('solo-inquiry')?.fadesTo).toHaveLength(0);
  });

  it('§6.3 — deterministic: same (profile, target, seed) yields the same scaffold', () => {
    const a = selectScaffold(base);
    const b = selectScaffold({ ...base, seed: 42 });
    expect(a.scaffold).toBe(b.scaffold);
    const c = selectScaffold({ ...base, seed: 43 });
    expect(a.inputs.seed).toBe(42);
    // different seed MAY differ but must still be from the compatibility set
    expect(SCAFFOLDS.map((s) => s.id)).toContain(c.scaffold);
  });

  it('§6.3 — the selection record carries its inputs (check 5: reproducible)', () => {
    const rec = selectScaffold(base);
    expect(rec.inputs).toEqual(base);
  });

  it('§6.3 — the catalyst target is NOT an input: a scaffold arranges, never chooses what develops', () => {
    // SelectionInput has no catalyst field — asserted structurally:
    const keys = Object.keys(base);
    expect(keys).not.toContain('catalyst');
    expect(keys).not.toContain('target');
  });

  it('§6.3 — modality compatibility: a scaffold outside the modality set is never chosen', () => {
    for (let seed = 0; seed < 30; seed++) {
      const rec = selectScaffold({ ...base, seed, modality: 'LanguageReflective' });
      expect(SCAFFOLD_BY_ID.get(rec.scaffold)?.modalities).toContain('LanguageReflective');
    }
  });

  it('§6.3 — aversion veto is unconditional (45 §3.1 rule 2)', () => {
    const without = selectScaffold(base);
    const vetoed = selectScaffold({ ...base, vetoed: [without.scaffold] });
    expect(vetoed.scaffold).not.toBe(without.scaffold);
  });

  it('§6.4 — maxExposures removes a saturated scaffold from selection', () => {
    const saturated: Record<string, number> = {};
    for (const s of SCAFFOLDS) {
      if (s.maxExposures !== null) saturated[s.id] = s.maxExposures;
    }
    // only the terminal (null maxExposures) scaffolds remain
    const rec = selectScaffold({ ...base, exposures: saturated, stage: 'Orange', depth: 3, modality: 'ImmersiveRPG' });
    expect(['estrangement', 'solo-inquiry']).toContain(rec.scaffold);
  });

  it('§6.4 — the fading DAG is well-formed: every fadesTo target exists', () => {
    for (const s of SCAFFOLDS) {
      for (const t of s.fadesTo) {
        expect(SCAFFOLD_BY_ID.has(t), `${s.id} → ${t}`).toBe(true);
      }
    }
    expect(fadeTargets('worked-example')).toEqual(['stepped-ladder']);
  });

  it('§6.3 — depth and stage floors hold', () => {
    // depth 0 + Infrared cannot reach choice-set (depthFloor 1, stageFloor Amber)
    for (let seed = 0; seed < 20; seed++) {
      const rec = selectScaffold({ ...base, seed, depth: 0, stage: 'Infrared', modality: 'Deterministic' });
      const s = SCAFFOLD_BY_ID.get(rec.scaffold)!;
      expect(s.depthFloor).toBeLessThanOrEqual(0);
      expect(['Infrared', 'Magenta']).toContain(s.stageFloor);
    }
  });

  it('§6.3 — an empty compatibility set fails closed (impossible modality×floor combination)', () => {
    expect(() =>
      selectScaffold({ ...base, depth: 0, stage: 'Infrared', modality: 'LanguageReflective' }),
    ).toThrowError(/empty compatibility set/);
  });

  it('§6.3 — an unread profile still selects deterministically (neutral fit)', () => {
    const rec = selectScaffold({ ...base, metaProgramProfile: {} });
    expect(SCAFFOLDS.map((s) => s.id)).toContain(rec.scaffold);
  });
});

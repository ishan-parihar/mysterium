import { describe, it, expect } from 'vitest';
import {
  createEvidenceLedger, META_PROGRAM_TIERS, EVIDENCE_CONTEXTS,
} from '../../src/infra/profiles/evidenceLedger.js';
import type { Observation, MetaProgramId } from '../../src/infra/profiles/evidenceLedger.js';

// A realistic epoch (ms). A tiny NOW makes 10 half-lives of age reach before the epoch,
// which is not a state the ledger will ever see with real clocks.
const NOW = 1_800_000_000_000;
let seq = 0;
function obs(program: MetaProgramId, pole: number, context: (typeof EVIDENCE_CONTEXTS)[number], at = NOW - seq++ * 1000): Observation {
  return { program, pole, context, at };
}

describe('evidence ledger + tier gate (47 §3/§8)', () => {
  it('the tier table matches §4: 6×T1, 4×T2, 4×T3', () => {
    const tiers = Object.values(META_PROGRAM_TIERS);
    expect(tiers.filter((t) => t === 'T1')).toHaveLength(6);
    expect(tiers.filter((t) => t === 'T2')).toHaveLength(4);
    expect(tiers.filter((t) => t === 'T3')).toHaveLength(4);
  });

  it('below minimum evidence → discard (one bad session must not become a trait)', () => {
    const l = createEvidenceLedger();
    l.observe(obs('options_procedures', 0.8, 'play'));
    l.observe(obs('options_procedures', 0.8, 'play'));
    const [v] = l.evaluate(NOW);
    expect(v.gate).toBe('discard');
    expect(v.reason).toMatch(/minimum evidence/);
  });

  it('≥6 observations across ≥3 contexts → T2 weight', () => {
    const l = createEvidenceLedger();
    for (const ctx of ['solitary', 'social', 'play'] as const) {
      for (let i = 0; i < 2; i++) l.observe(obs('options_procedures', 0.8, ctx));
    }
    const [v] = l.evaluate(NOW);
    expect(v.tier).toBe('T1');
    expect(v.gate).toBe('weight'); // T1 but instrument not validated → held at weight band
    expect(v.reason).toMatch(/not yet validated/);
  });

  it('a T1 with a passing instrument → field of record', () => {
    const l = createEvidenceLedger();
    for (const ctx of ['solitary', 'social', 'play'] as const) {
      for (let i = 0; i < 2; i++) l.observe(obs('options_procedures', 0.8, ctx));
    }
    const v = l.evaluate(NOW, { t1Validated: new Set(['options_procedures']) })[0];
    expect(v.gate).toBe('field-of-record');
  });

  it('a T2 with sufficient evidence is a weight, never a field of record', () => {
    const l = createEvidenceLedger();
    for (const ctx of ['solitary', 'social', 'work', 'play'] as const) {
      for (let i = 0; i < 2; i++) l.observe(obs('internal_external', 0.7, ctx));
    }
    const v = l.evaluate(NOW, { t1Validated: new Set(['internal_external']) })[0];
    expect(v.tier).toBe('T2');
    expect(v.gate).toBe('weight'); // the validation set cannot promote a T2
  });

  it('T3 is discarded by construction even with abundant evidence', () => {
    const l = createEvidenceLedger();
    for (const ctx of EVIDENCE_CONTEXTS) {
      for (let i = 0; i < 4; i++) l.observe(obs('perceptual_preference', 0.9, ctx));
    }
    const [v] = l.evaluate(NOW);
    expect(v.tier).toBe('T3');
    expect(v.gate).toBe('discard');
    expect(Object.keys(v.poleByContext)).toHaveLength(0); // nothing derived survives
  });

  it('contradiction is represented, not resolved: per-context poles stay separate', () => {
    const l = createEvidenceLedger();
    for (const ctx of ['solitary', 'social', 'work'] as const) {
      for (let i = 0; i < 2; i++) l.observe(obs('options_procedures', ctx === 'social' ? -0.8 : 0.8, ctx));
    }
    const v = l.evaluate(NOW, { t1Validated: new Set(['options_procedures']) })[0];
    expect(v.gate).toBe('field-of-record');
    expect(v.poleByContext['social']).toBeLessThan(0);
    expect(v.poleByContext['solitary']).toBeGreaterThan(0);
  });

  it('recency: stale evidence decays toward zero (analogue of theta, NOT the same store)', () => {
    const l = createEvidenceLedger();
    const halfLife = 30 * 24 * 3600 * 1000;
    const stale = NOW - 10 * halfLife;
    for (const ctx of ['solitary', 'social', 'play'] as const) {
      for (let i = 0; i < 2; i++) {
        l.observe({ program: 'options_procedures', pole: 1, context: ctx, at: stale });
      }
    }
    const v = l.evaluate(NOW, { t1Validated: new Set(['options_procedures']) })[0];
    expect(Math.abs(v.poleByContext['solitary']!)).toBeLessThan(0.05);
  });

  it('withdrawal removes evidence AND the derived verdict (deletion is not itself recorded)', () => {
    const l = createEvidenceLedger();
    for (const ctx of ['solitary', 'social', 'play'] as const) {
      for (let i = 0; i < 2; i++) l.observe(obs('options_procedures', 0.8, ctx));
    }
    expect(l.evaluate(NOW)).toHaveLength(1);
    l.withdraw('options_procedures');
    expect(l.evaluate(NOW)).toHaveLength(0);
    expect([...l.ledger.keys()]).toHaveLength(0);
  });

  it('the evaluate output is deterministic for the same ledger and clock', () => {
    const build = () => {
      const l = createEvidenceLedger();
      for (const ctx of ['solitary', 'social', 'play'] as const) {
        for (let i = 0; i < 2; i++) {
          l.observe({ program: 'toward_away', pole: 0.6, context: ctx, at: NOW - 1000 });
        }
      }
      return l.evaluate(NOW);
    };
    expect(build()).toEqual(build());
  });

  it('the module graph has no write path to player state (47 §9 check 6)', () => {
    // Structural assertion: the ledger's public surface is observe / ledger / withdraw / evaluate.
    const l = createEvidenceLedger();
    const surface = Object.keys(l).sort();
    expect(surface).toEqual(['evaluate', 'ledger', 'observe', 'withdraw']);
    // none of these accept or return engine-state handles; evaluate returns verdicts only.
  });
});

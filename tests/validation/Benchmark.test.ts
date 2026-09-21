/**
 * CI-tier validation benchmark.
 *
 * Spec: docs/validation/BENCHMARK-ARCHITECTURE.md (§6 gates, §8 tiers).
 *
 * Runs the full persona matrix through the LIVE production loop and asserts
 * the engine's measurement guarantees:
 *   G1  reproducibility (hard)       — deterministic engine
 *   G2  population divergence (hard) — different players → different states
 *   G3  coherence (hard)             — entry-config invariance across surfaces
 *   G4  shadow resolution (hard)     — healthy engagement heals shadow load
 *   G5  forgetting fidelity (hard)   — non-passing learners never gain retention
 *   G6  educational stream (soft)    — curriculum/training slots deliver beats
 *   G6b metacognition (soft)         — self-audit healthy for passing learners
 *   G7  adaptive difficulty (soft)   — strong/weak separation via the estimator
 *   G8  transformation gating (hard) — no premature stage commit; gate non-vacuous
 *   G9  needs detection (soft)       — fixated personas produce detectable needs
 *   G10 Veil compliance (hard)       — no score leakage in player-facing output
 *
 * Hard-gate failures block merge; soft-gate failures are reported, not thrown.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { runValidationSuite, type ValidationReport } from '../../src/core/validation/gates.js';

describe('Validation benchmark (CI tier)', () => {
  let suite: ValidationReport;
  beforeAll(async () => {
    suite = await runValidationSuite('ci');
  });

  it('completes within the CI time budget', () => {
    // The full matrix (10 personas × 2–3 sessions, double-run for G1) should
    // be far below this; a runaway regression shows up as a timeout here.
    expect(suite.wallTimeMs).toBeLessThan(60_000);
  });

  it('passes all hard gates', () => {
    const failed = suite.results.filter((r) => r.hard && !r.passed);
    const report = failed.map((f) => `${f.gate}: ${f.details}`).join('\n  ');
    const allLines = suite.results.map((r) => `${r.passed ? 'PASS' : 'FAIL'}${r.hard ? '' : ' (soft)'} ${r.gate} — ${r.details}`);
    expect(failed, `Hard gate failures:\n  ${report}\n\nFull results:\n  ${allLines.join('\n  ')}`).toEqual([]);
  });

  it('reports every gate with diagnostic details', () => {
    for (const r of suite.results) {
      expect(r.details.length).toBeGreaterThan(0);
    }
    // The count is deliberately literal: adding or removing a gate must be a conscious edit here,
    // not a silent change to what the benchmark certifies. 21 → 22 with G26 (priority-formula
    // closure, `24 §3.2.9` / `MY-AD-0025`); 22 → 26 with the Phase 10 gates (G22 composition
    // integrity, G23 tier gate, G24 scaffold integrity, G25 inference write firewall — 46/47).
    expect(suite.results.length).toBe(26);
    expect(suite.results.map((r) => r.gate).some((g) => g.startsWith('G26'))).toBe(true);
    for (const g of ['G22', 'G23', 'G24', 'G25']) {
      expect(suite.results.map((r) => r.gate).some((x) => x.startsWith(g)), g).toBe(true);
    }
    expect(new Set(suite.results.map((r) => r.gate)).size).toBe(suite.results.length);
  });
});

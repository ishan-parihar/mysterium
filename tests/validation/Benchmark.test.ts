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
    // integrity, G23 tier gate, G24 scaffold integrity, G25 inference write firewall — 46/47);
    // 26 → 27 with G27 authored-seed stage coherence (46 §11 / 44 — the authored seeding tier);
    // 27 → 31 with the Phase 11/12 memory gates (G28 checkpoint persistence, G29 preference
    // intake firewall, G30 verdict completeness, G31 retrieval firewall — 22 §7.5, 47 §8, 43 §5.5, 48 §5).
    // 31 → 35 with Phase 13 (G32 council role scope, G33 UDV band population at the live
    // seam, G34 council dispatch — 45 §6.1, 45 §3, 43 §3.3; G35 the polarity pool — d10).
    // 35 → 37 with Phase 14 d5 (G36 CLI boot smoke — every `SESSION_MODES` member boots headless;
    // G37 checked graph — no production file outside the tsconfig include, no re-declared
    // canonical constant).
    // 37 → 38 with Phase 14 d6 (G38 system-1 boundary — the core depends on the port and never on
    // the adapter; the adapter persists nothing; the fallback is exported and therefore reachable).
    // 38 → 40 with Phase 15 d5 (G39 campaign continuity — a seeded campaign through the live seam is
    // deterministic and restores its predecessor's checkpoint at EVERY session boundary; G40 campaign
    // invariants — declared neglect shows in the theta book and only there, the stage does not advance
    // by session count, no measurable cell collapses below the entropy floor, no Veil vocabulary in a
    // session's provenance). These two are the only gates that assert over a trajectory of sessions
    // THROUGH THE SEAM, which is why the gap d3 found was invisible to the other 38.
    // 42 → 43 with Phase 16 d3 (G43 developmental encounter coverage — every canonical line consumed
    // by a finalized developmental encounter, none starved to effective exclusion. The diagnosis:
    // supply symmetric, priorities indistinguishable across lines, so the comparator decided; its
    // substantive rules tied across lines, leaving the reproducibility hash to carry policy. The
    // reserved developmental primary is locked by unit test; this gate is the histogram the player
    // would notice, not a claim about every secondary or ambient offer.)
    // 41 → 42 with Phase 16 d2 (G42 declared stance channel — driveFixation read as a pinned
    // observable and was a starved input: the campaign dropped the stance its personas declared, and
    // the narratives were filler so the keyword route could not fire. The gate asserts the stance
    // arrives on the DECLARED drive at the DECLARED rate, so a misrouted signal fails rather than
    // merely looking plausible).
    // 40 → 41 with the polarity-loop entry fix (G41 polarity loop entry — the dialectic loop OPENS
    // on texture engagement, because §5.3 forbids the structural selection its discovery writer was
    // wired to, and only a ratified reading reconciles). Both defects it locks lived in the
    // COMPOSITION of two seam calls over time, which is why none of the other 40 could see them.
    expect(suite.results.length).toBe(43);
    for (const g of ['G22', 'G23', 'G24', 'G25', 'G26', 'G27', 'G28', 'G29', 'G30', 'G31', 'G32', 'G33', 'G34', 'G35', 'G36', 'G37', 'G38', 'G39', 'G40', 'G41', 'G42', 'G43']) {
      expect(suite.results.map((r) => r.gate).some((x) => x.startsWith(g)), g).toBe(true);
    }
    expect(suite.results.map((r) => r.gate).some((g) => g.includes('authored-seed'))).toBe(true);
    expect(suite.results.map((r) => r.gate).some((g) => g.startsWith('G26 '))).toBe(true); // priority formula closure
    expect(new Set(suite.results.map((r) => r.gate)).size).toBe(suite.results.length);
  });
});

/**
 * CI-tier validation benchmark.
 *
 * The roster and every gate's contract are owned by `src/core/validation/gates/` — `roster.ts` is
 * where a gate is REGISTERED, and each gate documents itself at its definition. The historical
 * `docs/validation/BENCHMARK-ARCHITECTURE.md` §6 was the spec for this roster but is not in the tree
 * (`docs/audits/DOC-SET-AUDIT-2026-09-20.md` R6 records it as complementary to `foundations/40`).
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
import { runValidationSuite, validateSessionControlsWired, type ValidationReport } from '../../src/core/validation/gates.js';
import { evaluateSessionControlWiring, evaluateCliInstrumentMarking, sessionContextRegions } from '../../src/core/validation/gates/surface.js';

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
    // 43 → 44 with Phase 16 d8 (G44 session controls wired — the settings store declared CLI parity
    // and had ONE importer, itself, while `gameEngine.ts` hard-coded `targetSessionLength: 5` and no
    // force fields. An unread field behaves exactly like an absent one, so every runtime gate passed
    // with the surface fully dark; the only instrument that can see absence is the module graph, the
    // same technique as G37. It also locks that the browser carries NO instrument-pin logic — the
    // WebUI has no focusedCell producer, so pin logic there is dead code — and that every
    // force-aware CLI builder marks its combined --line/--stage sessions as deliberate pins.)
    // 44 → 45 with Phase 17 d1 (G45 pack seam wired — the pack engine's registry was test-only in
    // production: registerPack had no production caller, so delegate.ts's single getPack read was
    // a fallback-masked always-miss. An unseeded registry behaves exactly like an empty one, so
    // no runtime gate can see the absence; this is the module-graph technique again, extended to
    // the CLI pack session, whose teeth are proven by mutation in the gate's own doc-comment.)
    // 45 → 46 with Phase 17 d2 (G46 articulation ladder wired — the ladder was in-vitro, law-holding
    // render code with zero importers; the gate requires BOTH the payload bridge and the
    // law-holder at each consumer, so the ladder can neither go dark nor be bypassed with raw
    // payloads.)
    expect(suite.results.length).toBe(46);
    for (const g of ['G22', 'G23', 'G24', 'G25', 'G26', 'G27', 'G28', 'G29', 'G30', 'G31', 'G32', 'G33', 'G34', 'G35', 'G36', 'G37', 'G38', 'G39', 'G40', 'G41', 'G42', 'G43', 'G44', 'G45', 'G46']) {
      expect(suite.results.map((r) => r.gate).some((x) => x.startsWith(g)), g).toBe(true);
    }
    expect(suite.results.map((r) => r.gate).some((g) => g.includes('authored-seed'))).toBe(true);
    expect(suite.results.map((r) => r.gate).some((g) => g.startsWith('G26 '))).toBe(true); // priority formula closure
    expect(new Set(suite.results.map((r) => r.gate)).size).toBe(suite.results.length);
  });
});

/**
 * G44 — the session-controls wiring gate. A gate that cannot fail is decoration (`MY-RG-0010`), and
 * this one guards an ABSENCE, so its teeth are the only thing worth asserting: the gate must pass on
 * the wired tree and must fail when the store stops reaching the engine. The second case is proven
 * by reading the gate's own source, not by mutating the working tree.
 */
describe('G44 session controls wired', () => {
  it('passes on the wired tree', async () => {
    const r = await validateSessionControlsWired();
    expect(r.passed).toBe(true);
    expect(r.hard).toBe(true);
  });

  it('names the store and the parity fields it guards', async () => {
    const r = await validateSessionControlsWired();
    expect(r.details).toContain('4 parity fields');
    expect(r.details).toContain('no instrument-pin logic');
    expect(r.details).toContain('focusedCell: true');
  });

  it('has teeth: it fails on a store that no builder reads', () => {
    // The gate guards an ABSENCE, so a gate that only ever returns `passed: true` would satisfy
    // every other test in this file. The decision is a pure function, so the failure is provable by
    // handing it the source this tree had BEFORE the fix — the four hard-coded controls with no
    // store import — rather than by mutating the working tree.
    const beforeTheFix = `
      import { startSession } from '$core/GameLoop.js';
      export function startGameSession(): void {
        const sessionContext: SessionContext = {
          encountersSoFar: 0, sessionDurationMs: 0, targetSessionLength: 5, recentLines: [],
        };
      }
    `;
    const verdict = evaluateSessionControlWiring(beforeTheFix);
    expect(verdict.passed).toBe(false);
    expect(verdict.details).toContain('write-only');
  });

  it('has teeth: it fails when a parity field regresses to a literal', () => {
    // Narrower than the case above, and the one a careless refactor produces: the store is still
    // imported, but one field stops reading it and hard-codes a value again.
    const oneFieldDark = `
      import { sessionControlStore } from '$lib/stores/sessionControlStore.js';
      const control = get(sessionControlStore);
      const sessionContext: SessionContext = {
        encountersSoFar: 0, sessionDurationMs: 0,
        targetSessionLength: control.encounterCount, recentLines: [],
        forceStage: control.forceStage ?? undefined,
        forceModality: control.forceModality ?? undefined,
      };
    `;
    const verdict = evaluateSessionControlWiring(oneFieldDark);
    expect(verdict.passed).toBe(false);
    expect(verdict.details).toContain('forceLine');
  });

  it('has teeth: a COMMENT naming the field is not a read', () => {
    // The vacuity a whole-file regex cannot see. The store's own doc comment names every field, and
    // the guard expression mentions two of them, so a file that has dropped every READ still
    // contains all four words. This is the exact shape of a real regression — someone keeps the
    // import for the comment and reverts the literals to constants — and it is why the gate scopes
    // its checks to the context builders.
    const commentOnly = `
      // sessionControlStore — Parity with CLI flags: --encounters, --line, --stage, --modality.
      // Reads control.forceLine and control.forceStage to decide the instrument pin.
      import { sessionControlStore } from '$lib/stores/sessionControlStore.js';
      const sessionContext: SessionContext = {
        encountersSoFar: 0, sessionDurationMs: 0, targetSessionLength: 5, recentLines: [],
      };
      const isPinned = isDeliberateInstrumentPin(forceFields);
    `;
    const verdict = evaluateSessionControlWiring(commentOnly);
    expect(verdict.passed).toBe(false);
    expect(verdict.details).toContain('encounterCount');
    expect(verdict.details).toContain('forceLine');
  });

  it('has teeth: it fails when pin logic appears in the browser', () => {
    // d8 shipped a dead guard — a predicate call that could only evaluate false, because the
    // settings store has no `focusedCell` producer — and d9 deleted it on purpose. This fixture is
    // that exact shape returning: clean wiring with a pin expression hanging off it. The gate
    // rejects BOTH spellings (consulting the shared predicate without a producer, re-deriving a
    // local copy), because in the browser each is dead code that looks load-bearing.
    const pinLogicReturns = `
      import { sessionControlStore } from '$lib/stores/sessionControlStore.js';
      const control = get(sessionControlStore);
      const sessionContext: SessionContext = {
        encountersSoFar: 0, sessionDurationMs: 0,
        targetSessionLength: control.encounterCount, recentLines: [],
        forceLine: control.forceLine ?? undefined,
        forceStage: control.forceStage ?? undefined,
        forceModality: control.forceModality ?? undefined,
      };
      if (isDeliberateInstrumentPin(forceFields)) {
        const pinnedCell = true;
        if (!pinnedCell) { /* weave */ }
      }
    `;
    const verdict = evaluateSessionControlWiring(pinLogicReturns);
    expect(verdict.passed).toBe(false);
    expect(verdict.details).toContain('not an instrument');
  });

  it('passes a browser that carries no pin logic at all', () => {
    // d9 deleted the WebUI guard on purpose: with no `focusedCell` producer the predicate was a
    // constant, so "the guard is dropped" is the CORRECT state, not a regression. This test pins
    // that direction so the gate cannot quietly re-grow the dead guard — the previous test proves
    // the gate still fails when the pin logic returns.
    const cleanBrowser = `
      import { sessionControlStore } from '$lib/stores/sessionControlStore.js';
      const control = get(sessionControlStore);
      const sessionContext: SessionContext = {
        encountersSoFar: 0, sessionDurationMs: 0,
        targetSessionLength: control.encounterCount, recentLines: [],
        forceLine: control.forceLine ?? undefined,
        forceStage: control.forceStage ?? undefined,
        forceModality: control.forceModality ?? undefined,
      };
    `;
    const verdict = evaluateSessionControlWiring(cleanBrowser);
    expect(verdict.passed).toBe(true);
  });

  it('catches a read replaced by a literal (the vacuity a word-match cannot see)', () => {
    // Verified by mutation on the REAL file before it was written here: swapping
    // `forceLine: control.forceLine ?? undefined` for `forceLine: 'Cognitive'` leaves the WORD
    // `forceLine` standing in the `forceFields` block, and a gate that matched bare words returned
    // `passed: true` on that file. Scoping to the context regions alone did not fix it either —
    // `forceFields` IS a context region. Matching the VALUE form is what catches it.
    const readReplacedByLiteral = `
      import { sessionControlStore } from '$lib/stores/sessionControlStore.js';
      const control = get(sessionControlStore);
      const forceFields = {
        forceLine: 'Cognitive',
        forceStage: control.forceStage ?? undefined,
        forceModality: control.forceModality ?? undefined,
      };
      const sessionContext: SessionContext = {
        encountersSoFar: 0, sessionDurationMs: 0,
        targetSessionLength: control.encounterCount, recentLines: [],
        ...forceFields,
      };
    `;
    const verdict = evaluateSessionControlWiring(readReplacedByLiteral);
    expect(verdict.passed).toBe(false);
    expect(verdict.details).toContain('forceLine');
  });

  it('scopes its checks to the context builders', () => {
    // The extractor is the mechanism that makes the comment case above possible to detect, so it is
    // worth asserting directly: a field that appears ONLY in prose must not be found.
    const text = `
      // forceLine and forceModality are discussed here in a comment.
      const sessionContext: SessionContext = {
        targetSessionLength: control.encounterCount,
      };
    `;
    const regions = sessionContextRegions(text);
    expect(regions).toContain('encounterCount');
    expect(regions).not.toContain('forceLine');
    expect(regions).not.toContain('forceModality');
  });

  it('has teeth: an unmarked CLI builder is a mixed-cohort run', () => {
    // d9's own regression, kept as a fixture: when the rule moved behind `focusedCell`, the CLI kept
    // the candidate cell filter and silently regained the four injection seams. The gate counts
    // builders, so a third unmarked builder fails it too.
    const twoBuildersOneMark = `
      ...(FORCE_LINE ? { forceLine: FORCE_LINE } : {}),
      ...(FORCE_STAGE ? { forceStage: FORCE_STAGE } : {}),
      ...(FORCE_LINE && FORCE_STAGE ? { focusedCell: true as const } : {}),
      ...(FORCE_LINE ? { forceLine: FORCE_LINE } : {}),
      ...(FORCE_STAGE ? { forceStage: FORCE_STAGE } : {}),
    `;
    const verdict = evaluateCliInstrumentMarking(twoBuildersOneMark);
    expect(verdict.passed).toBe(false);
    expect(verdict.details).toContain('mixed-cohort');
  });
});

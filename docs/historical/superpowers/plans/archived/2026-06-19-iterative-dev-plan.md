# CLI Iterative Development Plan — v2

**Date:** June 19, 2026
**Audit Scope:** Full CLI/TUI end-to-end — runtime testing, code analysis, test suite
**Method:** 10+ CLI runtime tests + 447 unit tests (all pass) + TypeScript (clean) + deep code review
**Status:** Implementation in progress

---

## Current State Assessment

### What Works (Verified June 19)
- **447/447 unit tests pass** — zero regressions
- **TypeScript compiles cleanly** — zero type errors
- **72/72 audit checks pass** — 1 warning (holon modality)
- **Session mode (`--headless --no-llm`)** runs 5 encounters successfully
- **TaskRenderers** implemented for all task types (n-back, stroop, go/no-go, hold, dilemma, emotion ID, pattern prediction, value ranking, self-report, reaction time, rhythm, cooperation, imitation)
- **AgenticOrchestrator** handles LLM path + module-aware fallback correctly
- **CCI, altitude shifts, shadow detection, PESTLE, macro-events** all functional
- **Themed modality headers** in CLI (TIMED TRIAL, REFLECTION BEAT, etc.)
- **Per-encounter state display** with pass/fail, drive signals, shadows
- **Session summary** with CCI, altitudes, shadows, drives

### Architecture Stats
- `cli-game.ts`: 924 lines — main CLI runner
- `cli-audit.ts`: 544 lines — backend audit suite
- `TaskRenderers.ts`: 1,168 lines — assessment task rendering
- `ScoringBridge.ts`: 115 lines — TrialResult → AssessmentResult bridge
- `AgenticOrchestrator.ts`: 1,315 lines — LLM/fallback orchestrator
- **Total CLI core**: ~5,027 lines

---

## Gap Taxonomy

### Tier 0 — Blocking Bugs (system misbehaves)

| # | Gap | Evidence | Fix |
|---|---|---|---|
| **0.1** | **Single-encounter mode ignores `--no-llm`** | `--mode=encounter --no-llm --line=Cognitive --stage=Red` times out at 60s. The orchestrator's `noLlm` flag is set correctly, but the `runAgenticEncounter()` function still creates a `ModuleRegistry.getAll()` call and other pre-orchestrator work. The actual timeout is in `queryLLMWithTools` — even though `noLlm` is true and the orchestrator should skip to `runFallback()`, something in the encounter mode path still triggers the LLM. | Trace the exact code path; ensure `noLlm` is passed through correctly in encounter mode. |
| **0.2** | **Audit script uses wrong moduleRef format** | `scripts/cli-audit.ts` MOCK_ENCOUNTER uses `moduleRef: 'Cognitive/Red'` (slash separator) but the system uses `Cognitive:Red` (colon). | Change to colon format. |

### Tier 1 — Critical Gaps (developmental value limited)

| # | Gap | Evidence | Fix |
|---|---|---|---|
| **1.1** | **No save/load persistence** | `createDefaultSignificator()` hardcodes all lines to Red every run. `totalEncounters` and `totalSessions` reset. | Add JSON file persistence for Significator. |
| **1.2** | **No onboarding calibration** | `createSignificator('cli-player', allRed, 'Red')` — every player starts at Red regardless of capacity. ONBOARDING-REDESIGN-PLAN.md exists but isn't wired. | Add 3-question capacity estimation onboarding. |
| **1.3** | **FallbackProvider has content for only 3 stages** | `getFallback()` only generates meaningful content for Red/Amber/Orange; higher stages fall through to minimal defaults. | Add stage-specific content for Green/Turquoise/White. |
| **1.4** | **Theta-decay never runs mid-session** | `endSession()` applies theta-decay, but encounters within a session don't see staleness effects. The scheduler uses `lastEncounter` timestamps which are only set at session end. | Apply theta-decay to `theta.lastEncounter` after each encounter in the session loop. |

### Tier 2 — Developmental Depth Gaps

| # | Gap | Evidence | Fix |
|---|---|---|---|
| **2.1** | **No narrative continuity between encounters** | Each encounter is context-free — no reference to previous choices or events. | Pass last 3 encounter summaries into encounter context. |
| **2.2** | **Encounter count inflation** | `--encounters=5` sometimes produces 10+ encounters due to the GameLoop's `tickWithStrategy` counting mechanism. The tick loop calls `tickWithStrategy` which can schedule multiple encounters per tick. | Fix the encounter counting — break after reaching target count. |
| **2.3** | **Pass rate too low for balanced sessions** | Headless sessions show 20-40% pass rate. The pass threshold is often 0.5-0.6 but the scoring puts MCQ selections at 0.575 average, and shadow injection (40% chance) forces failures. | Reduce shadow injection probability, improve scoring differentiation. |
| **2.4** | **All narratives within same line are identical** | `buildModuleNarrative()` produces deterministic text per line×stage×modality — same narrative every time. | Add randomized narrative elements from a pool. |
| **2.5** | **No world-building narrative in headless mode** | Headless mode shows no scene-setting or atmosphere — just technical data. | Add brief atmospheric text at session start and between encounters. |

### Tier 3 — UX Polish Gaps

| # | Gap | Evidence | Fix |
|---|---|---|---|
| **3.1** | **No session summary narrative closure** | Session end shows stats but no meaningful wrap-up. | Add thematic session summary based on what happened. |
| **3.2** | **No progress indicators between encounters** | No loading dots or transition text between encounters. | Add brief transition text. |
| **3.3** | **Encounter result display could be richer** | Pass/fail is shown but no dimension breakdown unless `--verbose`. | Show key dimension scores in non-verbose mode. |
| **3.4** | **Raw CCI dimension labels are cryptic** | `alt:29% drH:100%` not meaningful to players. | Use full labels or better abbreviations. |

---

## Implementation Plan — Phase 1

### Sprint 1: Fix Blocking Bugs (0.1, 0.2)
**Target:** Single-encounter mode works with `--no-llm`, audit script uses correct format

### Sprint 2: Fix Encounter Counting & Pass Rate (2.2, 2.3)
**Target:** `--encounters=N` produces exactly N encounters; pass rate is 40-60%

### Sprint 3: Add Persistence & Onboarding (1.1, 1.2)
**Target:** Significator saves/loads from JSON; new players get capacity estimation

### Sprint 4: Developmental Depth (2.1, 2.4, 2.5, 1.4)
**Target:** Narrative continuity, varied narratives, world-building, theta-decay mid-session

### Sprint 5: UX Polish (3.1, 3.2, 3.3, 3.4)
**Target:** Session closure narrative, transitions, richer results, better labels

### Sprint 6: FallbackProvider Expansion (1.3)
**Target:** All 8 stages have meaningful fallback content

---

## Validation Criteria

After all sprints, the system must pass:

1. `--mode=encounter --no-llm --line=Cognitive --stage=Red` completes in < 5 seconds
2. `--headless --encounters=5 --no-llm` produces exactly 5 encounters
3. Pass rate across 5 encounters is 40-60% (not 10% or 90%)
4. Each encounter shows a different narrative even for the same line×stage
5. Session end shows a thematic wrap-up narrative
6. Significator persists across CLI runs
7. New player gets 3-question onboarding
8. All 447 tests still pass
9. TypeScript still compiles cleanly

---

## File Change Map

```
MODIFY:
  scripts/cli-game.ts                            — Fix encounter counting, add transitions, session closure
  scripts/cli-audit.ts                           — Fix moduleRef format
  src/core/assessments/AgenticOrchestrator.ts    — Fix noLlm propagation, varied narratives
  src/core/engines/PriorityComputation.ts        — Ensure encounter count is respected
  src/infra/llm/FallbackProvider.ts              — Add Stages 5-8 content
  src/core/GameLoop.ts                           — Fix encounter count boundary

NEW:
  src/infra/persistence/SaveRepository.ts        — JSON file persistence for Significator
  src/core/assessments/cli/Onboarding.ts         — 3-question capacity calibration
  src/core/assessments/cli/NarrativePool.ts      — Randomized narrative elements
```

# Mysterium TUI/CLI Comprehensive Gap Audit

**Date:** June 20, 2026
**Scope:** Exhaustive end-to-end testing of CLI/TUI across all modes, modalities, and edge cases
**Method:** 15+ runtime tests (diagnostic, headless, interactive, JSON, persistence), 7 modality routing tests, code analysis of 5,000+ lines, test suite (447 tests), manual UX walkthrough
**Prior Audits Referenced:** v6 audit, v7 gap analysis, 6-sprint implementation plan

---

## Executive Summary

The CLI is **functional and compiles cleanly** (TypeScript zero errors, 439/447 tests pass). The core plumbing works: 64 assessment modules load, scheduling produces encounters, scoring differentiates pass/fail, persistence saves/loads, and altitude shifts propagate. However, **7 critical gaps, 12 development depth gaps, and 10 UX polish gaps** remain that prevent the system from being a genuine developmental catalyst.

**Current developmental catalysis rating: 5.8/10** (up from 5/10 after Sprint 1-6 fixes).

---

## Test Results Summary

| Test | Status | Key Finding |
|---|---|---|
| TypeScript compilation | ✅ Clean | Zero errors |
| Test suite | ⚠️ 439/447 pass | 6 ScreenReaderOverlay, 1 ContextPipeline, 1 TelemetryStore failures |
| Diagnostic mode | ✅ Works | 64 modules, 36 holons, scheduling produces encounters |
| Headless 5 encounters (--no-llm) | ✅ Completes | 2/5 passed, CCI 50.4→47.2%, altitudes shifted to Amber |
| Headless 20 encounters (--no-llm) | ✅ Completes | 18/20 passed, all lines Red→Amber, CCI 29→43% |
| Force-shadow (DarkAddiction) | ✅ Works | Shadow surfaced, encounter failed, drive signals updated |
| Persistence save/load | ✅ Works | Second run loads saved progress correctly |
| JSON event stream | ✅ Valid | session_started → ask_user → encounter_completed → session_ended |
| Single encounter mode | ✅ Works | Correct module/modality/task presented |
| New-game flag | ✅ Works | Deletes previous save, starts fresh |
| Interactive mode | ⚠️ Partial | Shows question, prompts "Select:", no visual polish |
| **LLM-active mode** | 🔴 **HANGS** | LLM detection passes (2s check) but actual calls hang on auth errors |

---

## Gap Taxonomy

### TIER 0 — Blocking Bugs

| # | Gap | Evidence | Impact | Fix Effort |
|---|---|---|---|---|
| **B.1** | **LLM availability check false positive** | `checkLLMAvailability()` hits `/models` which returns 200 even with invalid API key. But `/chat/completions` returns `{"detail":"Invalid or missing API Key"}`. The 2s check passes → `LLM_ACTIVE = true` → every encounter hangs waiting for LLM response. | **CLI unusable with LLM configured but auth-invalid.** Users must pass `--no-llm` manually. | 30 min |
| **B.2** | **Narrative says wrong task type** | `buildModuleNarrative()` always uses `module.tasks[0]` for the narrative label. When `generateModalityFallbackTask()` produces a generic dilemma for ScenarioChoice on Willpower:Red, the narrative says "attentional hold task" even though the user saw a dilemma. | **User sees contradictory feedback** — task presented doesn't match what narrative describes. | 1 hour |
| **B.3** | **8 test failures** | 6× ScreenReaderOverlay (DOM/aria-live), 1× ContextPipeline (stage inference parsing), 1× TelemetryStore (encryption). | Accessibility layer broken. Context pipeline stage inference unreliable. | 4 hours |

### TIER 1 — Critical Developmental Gaps

| # | Gap | Evidence | Impact | Fix Effort |
|---|---|---|---|---|
| **D.1** | **No onboarding calibration** | Every new player starts at Red (all 8 lines). The `--new-game` flag hardcodes `allRed`. | Experienced players grind through trivial early-stage encounters. System can't adapt to actual capacity. | 2 days |
| **D.2** | **Modality routing collapses for some modules** | Willpower:Red only has `hold` + `go_no_go`. When ScenarioChoice is forced, `generateModalityFallbackTask()` creates a generic dilemma, but the module has no scenario content. 4 of 7 modalities showed "attentional hold" for Willpower:Red. | Players see generic content disconnected from the line×stage being assessed. | 1 day |
| **D.3** | **Generic dilemma pool shared across ALL modules** | `renderDilemma()` picks from 8 hardcoded dilemmas regardless of line×stage. A Cognitive:Red dilemma is identical to a Moral:Amber dilemma. | Dilemmas feel disconnected from developmental context. No line×stage-specific catalyst depth. | 2 days |
| **D.4** | **Write-in evaluation is keyword-matching only** | `attack/dominate/crush` → DarkAddiction, `withdraw/resist` → DarkAverted, `transcend/bypass` → GoldenAddicted, `stay/safe/comfortable` → GoldenAverted. 4 keywords per quadrant. | Free-form responses aren't deeply evaluated. Real developmental signals missed. | 2 days |
| **D.5** | **No narrative continuity between encounters** | `buildBriefHistory()` produces "You have faced 5 challenges before. Recent: a success, a struggle, a success." | Each encounter feels context-free. No story arc, no building upon previous insights. | 1 day |
| **D.6** | **CCI doesn't recompute after altitude shifts mid-session** | CCI only recomputes every `reEvaluationInterval` (default 5 encounters). After altitude shifts Red→Amber, the session strategy continues using old CCI. | Session strategy doesn't adapt to evolving player state during a session. | 4 hours |
| **D.7** | **No consequence differentiation for failure depth** | All failures get the same -0.05 NPC relationship penalty (with minor progressive scaling). No sense of escalating stakes. | Failures feel inconsequential. No developmental weight to choices. | 4 hours |
| **D.8** | **Theta-decay doesn't run mid-session** | Only applies at `endSession()`. Within a 20-encounter session, neglected lines don't degrade. | Scheduling doesn't adapt to neglect during a session. | 4 hours |
| **D.9** | **Shadow detection too weak in headless mode** | In 20-encounter session with `--force-shadow=none`, zero shadows surfaced. Shadow injection is only 10% chance. Write-in keyword matching rarely triggers. | Shadow surfacing — the core developmental mechanism — almost never fires naturally. | 1 day |
| **D.10** | **Altitude shifts too easy** | 18/20 encounters passed in headless mode. After 20 encounters, ALL 8 lines shifted Red→Amber. One pass per line is enough to shift. | Progression feels unearned. No sustained practice requirement. | 4 hours |
| **D.11** | **No modality diversity in scheduling** | 20-encounter session showed only Embodied and LanguageReflective modalities predominantly. Other modalities were rare. | Players don't experience the full 7-modality catalyst spectrum. | 1 day |
| **D.12** | **FallbackProvider only covers 3 stages** | Pre-authored content exists for Red, Amber, Orange, and generic. Infrared, Magenta, Green, Turquoise, White have minimal coverage. | Higher-stage encounters have less narrative depth. | 1 day |

### TIER 2 — UX Polish Gaps

| # | Gap | Evidence | Impact | Fix Effort |
|---|---|---|---|---|
| **U.1** | **No ASCII art or visual framing** | Tasks feel clinical. No borders, progress bars, or thematic framing around questions. | Less immersive than a game should be. | 4 hours |
| **U.2** | **Drive display shows "ok" for all drives always** | In modality tests, all 4 drives showed `HealthyBalanced` regardless of performance. Shadow signals almost never appear in the display. | Players can't see their actual drive balance. Display is misleading. | 2 hours |
| **U.3** | **Shadow display shows "90%" misleadingly** | The "90%" next to shadows is actually the CCI shadow topology dimension, not shadow count. `shadows: none active` with "90%" is confusing. | Players think they have 90% shadow activity when they have none. | 1 hour |
| **U.4** | **No processing spinner during evaluation** | Between selecting an option and seeing results, there's no visual feedback. | Player doesn't know if the system is working. | 30 min |
| **U.5** | **Interactive mode lacks input validation** | Typing non-numeric input or out-of-range numbers doesn't show an error message. | Confusing UX for first-time users. | 1 hour |
| **U.6** | **No help command or tutorial** | No `--help` flag output, no in-session help, no tutorial mode. | New users don't know how to use the system. | 2 hours |
| **U.7** | **Session closure could be richer** | Shows pass/fail ratio and lines advanced, but no per-line trajectory, no narrative summary of the session arc, no "what to work on next" guidance. | Missed opportunity for developmental feedback. | 2 hours |
| **U.8** | **No colorblind-friendly mode** | ANSI colors are the only visual differentiation. No shape/pattern alternatives. | Accessibility issue for colorblind users. | 2 hours |
| **U.9** | **CCI display labels still somewhat cryptic** | `alt:29% drive:100% polar:0% shadow:90% xform:0%` — abbreviated labels require mental mapping. | Minor readability issue. | 1 hour |
| **U.10** | **No transition animations** | Between encounters, just a text line. No ASCII art transitions, no visual progress. | Clinical feel, not game-like. | 2 hours |

### TIER 3 — Infrastructure Gaps

| # | Gap | Evidence | Impact | Fix Effort |
|---|---|---|---|---|
| **I.1** | **No CLI-specific tests** | Zero test files for cli-game.ts, TaskRenderers, or ScoringBridge. | Regressions undetectable. | 1 day |
| **I.2** | **LLM endpoint configuration fragile** | Falls back to Google API with `gemma-4-31b-it` which may not exist on Google's endpoint. | Silent failures when misconfigured. | 2 hours |
| **I.3** | **No retry logic for LLM failures** | Single LLM failure = immediate fallback. No exponential backoff. | Transient errors cause permanent mode switch. | 2 hours |
| **I.4** | **Headless mode selection deterministic** | `Date.now() % 4` cycling means AI agents get predictable results. | AI-agent testing isn't genuinely varied. | 2 hours |
| **I.5** | **No multi-save support** | Single `~/.mysterium/save.json`. No way to have multiple characters. | Limited for testing and multi-character play. | 2 hours |
| **I.6** | **Save file doesn't persist session history** | Only Significator state saved. Encounter history, narrative summaries lost. | Can't review past sessions. | 2 hours |

---

## Detailed Analysis

### B.1 — LLM Availability Check False Positive (CRITICAL)

**Root Cause:** The `checkLLMAvailability()` function in `cli-game.ts` calls `GET /models` with the API key. The local LLM server (OpenAI-compatible proxy at `127.0.0.1:8000`) returns 200 for `/models` even with an invalid key. But `/chat/completions` returns `{"detail":"Invalid or missing API Key"}`.

**Flow:**
```
checkLLMAvailability() → GET /models → 200 OK → LLM_ACTIVE = true
→ runAgenticEncounter() → AgenticOrchestrator.run() → queryLLMWithTools()
→ POST /chat/completions → {"detail":"Invalid or missing API Key"}
→ HANGS (no timeout on actual LLM call)
```

**Fix:** Either:
1. Change the health check to call `/chat/completions` with a minimal request
2. Add a timeout to `queryLLMWithTools()` 
3. Both

### B.2 — Narrative Task Label Mismatch

**Root Cause:** In `buildModuleNarrative()`:
```typescript
const primaryTask = module.tasks[0];
const taskLabel = primaryTask ? (TASK_LABELS[primaryTask.type] ?? 'a developmental challenge') : 'a developmental challenge';
```

This always uses the module's first task type for the narrative, not the actual task presented by `selectTaskForModality()` / `generateModalityFallbackTask()`.

**Fix:** Pass the actual presented task to `buildModuleNarrative()` and use its type for the label.

### D.2 — Modality Routing Collapse

**Root Cause:** `generateModalityFallbackTask()` creates a generic task with no line×stage-specific content. For Willpower:Red with ScenarioChoice, it creates a `dilemma` task, but the `buildModuleNarrative()` bug (B.2) makes it appear as "attentional hold".

Additionally, the `presentModuleTask()` method passes the generated task to `getRenderer()`, which works correctly. But the module's `tasks[0]` (hold) is what appears in the narrative.

**The actual user experience:** The dilemma IS presented correctly (user sees 4 moral dilemma options), but the narrative summary says "attentional hold task". The scoring also uses the dilemma renderer's evaluate function, so scoring is correct. The issue is purely in the narrative feedback.

### D.4 — Write-In Evaluation Depth

**Current keyword lists:**
- DarkAddiction: `attack, dominate, crush, enslave, destroy` (5 words)
- DarkAverted: `withdraw, resist, refuse, flee` (4 words)  
- GoldenAddicted: `transcend, bypass, enlighten, skip` (4 words)
- GoldenAverted: `stay, safe, comfortable, never change` (4 words)

**Missing patterns:**
- Nuanced shadow expressions ("I need to prove myself", "they're beneath me")
- Subtle bypassing ("it's all good", "everything happens for a reason")
- Complex mixed signals ("I want to help but they need to figure it out")
- Line-specific shadow expressions (cognitive shadow vs emotional shadow)

### D.10 — Altitude Shifts Too Easy

**Evidence:** In 20-encounter headless session, 18/20 passed. After ~3 passes per line, ALL lines shifted Red→Amber. The `computeAltitudeShift()` only requires:
1. `passed = true`
2. All 4 drive signals = `HealthyBalanced`

Since non-selected drives default to `HealthyBalanced` and the pass threshold is 0.5 (with blended scoring giving ~0.55 for partial performance), altitude shifts happen too easily.

**Fix:** Require sustained performance across multiple encounters before shifting. Track consecutive passes per line×stage.

---

## Modality Routing Matrix (Post-Audit)

| Modality | Cognitive:Red | Willpower:Red | Moral:Red | Status |
|---|---|---|---|---|
| Deterministic | n_back ✅ | hold ✅ | dilemma ✅ | ✅ Correct |
| LanguageReflective | self_report ✅ | self_report ✅ | llm_dialogue ✅ | ✅ Correct |
| ScenarioChoice | dilemma ✅ | dilemma ⚠️ (narrative says "hold") | dilemma ✅ | ⚠️ Narrative bug |
| Embodied | hold ✅ | hold ✅ | hold ✅ | ✅ Correct |
| Strategic | pattern ✅ | pattern ✅ | pattern ✅ | ✅ Correct |
| SocialCooperative | cooperation ✅ | cooperation ✅ | dilemma ✅ | ✅ Correct |
| ImmersiveRPG | dilemma ⚠️ (narrative says "hold") | dilemma ⚠️ (narrative says "hold") | dilemma ✅ | ⚠️ Narrative bug |

---

## Developmental Catalysis Assessment

| Phase | Required | Current | Rating |
|---|---|---|---|
| **Catalyst** | Challenge probes developmental structure | ✅ Real tasks with correct modality routing | 7/10 |
| **Experience** | Response reveals meaningful signals | ⚠️ Rubric scoring works but write-in too simplistic | 6/10 |
| **Integration** | State mutations from behavioral data | ✅ Altitude shifts, shadow tracking, CCI evolution | 7/10 |
| **Narrative** | Immersive story world | ⚠️ Template narratives, no continuity, wrong task labels | 4/10 |
| **Progression** | Building upon previous encounters | ⚠️ `buildBriefHistory()` minimal, no arc | 3/10 |
| **Adaptation** | System evolves with player | ⚠️ CCI recomputes every 5 encounters, no mid-session adaptation | 4/10 |
| **Shadow Work** | Shadow surfacing and integration | ⚠️ Shadow detection too weak, keyword-only | 4/10 |
| **Holonic Integrity** | Lower stages maintained | ⚠️ Theta-decay only at session end | 5/10 |

**Overall: 5.0/10** — The infrastructure is solid but the developmental depth is insufficient.

---

## Priority Fix Order

### Sprint 7: Critical Fixes (1 day)
1. **B.1** — Fix LLM health check to use `/chat/completions` + add timeout
2. **B.2** — Pass actual task to `buildModuleNarrative()` 
3. **B.3** — Fix 8 test failures (ScreenReaderOverlay, ContextPipeline, TelemetryStore)

### Sprint 8: Developmental Depth (3 days)
4. **D.1** — 3-question onboarding calibration
5. **D.4** — Expand write-in evaluation with LLM-assisted semantic analysis (when available)
6. **D.10** — Require 3+ consecutive passes per line×stage for altitude shift
7. **D.9** — Increase shadow detection: 25% injection rate + expand keyword lists + contextual detection
8. **D.5** — Pass last 3 encounter narratives into context for continuity

### Sprint 9: Modality & Scheduling (2 days)
9. **D.2** — Fix modality fallback to use module-specific content when available
10. **D.3** — Generate line×stage-specific dilemmas using template system
11. **D.11** — Ensure modality diversity in scheduling (rotate through all 7)
12. **D.12** — Expand FallbackProvider to cover all 8 stages

### Sprint 10: UX Polish (1 day)
13. **U.1** — Add ASCII borders and progress bars to task presentation
14. **U.2** — Fix drive display to show actual scores, not just "ok"
15. **U.3** — Fix shadow display label
16. **U.4** — Add processing spinner
17. **U.5** — Add input validation with error messages
18. **U.6** — Add `--help` flag output

### Sprint 11: Infrastructure (1 day)
19. **I.1** — Add CLI-specific test suite
20. **I.3** — Add LLM retry logic with exponential backoff
21. **I.4** — Fix headless mode randomization

---

## Validation Checklist (Post-Fix)

- [ ] `--no-llm` headless session completes in < 30s for 20 encounters
- [ ] LLM-active mode either works or fails gracefully (no hangs)
- [ ] All 7 modalities show correct task types with correct narrative labels
- [ ] Write-in responses evaluated with depth (not just 4 keywords per quadrant)
- [ ] Altitude shifts require 3+ consecutive passes
- [ ] Shadows surface in 20-30% of encounters naturally
- [ ] Narrative continuity between encounters (player feels story progression)
- [ ] Onboarding calibrates starting altitude
- [ ] All 447+ tests pass
- [ ] Interactive mode has input validation, help, and visual polish

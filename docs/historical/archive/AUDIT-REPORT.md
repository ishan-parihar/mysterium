# Mysterium CLI & Backend Audit Report — v6

**Date:** June 20, 2026  
**Scope:** Full CLI/TUI end-to-end audit — runtime testing across all 7 modalities, 8 lines, forcing flags, LLM vs fallback paths, 20-encounter sessions  
**Method:** 12+ CLI runtime tests (diagnostic, headless, JSON, verbose, forced modalities, forced shadows, full sessions) + code analysis of 5,000+ lines of CLI core  
**Previous audits:** v3 (June 17), v4 (June 18), v5 (June 19)

---

## Executive Summary

The CLI has matured significantly since v5. The TaskRenderers now produce real assessment content (n-back sequences, stroop colors, dilemmas, emotion scenarios, value rankings), option shuffling prevents gaming, modality headers are thematic, and the full 20-encounter session runs to completion with altitude shifts and shadow tracking.

**What changed since v5:**
- ✅ `--no-llm` flag works — encounters complete in < 3 seconds in fallback mode
- ✅ TaskRenderers dispatch correctly for all 13 task types
- ✅ Encounter counting is accurate (20 encounters = 20 encounters)
- ✅ Thematic modality headers (TIMED TRIAL, REFLECTION BEAT, DECISION CROSSROADS, etc.)
- ✅ World-building atmosphere text at session start
- ✅ Session closure narrative with shadow/altitude summaries
- ✅ Drive compass with fixation risk indicators
- ✅ Transition text between encounters
- ✅ Session position arc (WARMUP → PEAK → COOLDOWN)
- ✅ Altitude chart renders correctly per line
- ✅ Shadow display with quadrant grouping and severity

**Critical gaps that remain:**
- 🔴 Default mode (LLM active) is unusable — 20-30s timeout per encounter
- 🔴 ScenarioChoice/SocialCooperative modality shows wrong task types for some modules
- 🔴 No save/load persistence — every run starts from scratch
- 🔴 No onboarding calibration — every player starts at Red
- 🟡 Pass rate is 25% (5/20) — too low for engaging sessions
- 🟡 Narrative continuity between encounters is absent
- 🟡 Theta-decay never runs mid-session

---

## 1. Comprehensive Test Results

### 1.1 Diagnostic Mode

| Metric | Value | Status |
|---|---|---|
| Assessment modules | 64 (8 lines × 8 stages) | ✅ |
| Holons | 36 total (16 NPCs, 4 factions, 7 locations) | ✅ |
| Significator | cli-player, Red stage, 0 encounters | ✅ |
| CCI | 0.5036 (composite) | ✅ |
| Strategy theme | balanced-development | ✅ |
| Encounter scheduled | Willpower:Red / Embodied / WARMUP / pr:0.818 | ✅ |
| LLM endpoint | http://127.0.0.1:8000/v1 | ⚠️ unreachable |

### 1.2 Headless Mode (no-llm, verbose, 2 encounters)

| Encounter | Module | Task Type | Result | Altitude Shift |
|---|---|---|---|---|
| 1 | Willpower:Red | Attentional Hold (memory symbols) | ✗ FAILED (score=0.40) | None |
| 2 | Spiritual:Red | Value Prioritization | ✗ FAILED (score=0.50) | None |

**Observations:**
- Both encounters used correct task renderers (hold, value ranking)
- Modality headers displayed: "SOMATIC SCAN" for Embodied
- Session position: WARMUP → PEAK
- Transition text: "The previous encounter settles into memory..."
- Both failed because headless mode selects options that score below passThreshold

### 1.3 Headless Mode (no-llm, forced Deterministic, 2 encounters)

| Encounter | Task Presented | Options Shuffled | Evaluated | Result |
|---|---|---|---|---|
| 1 | N-Back(2): 12 symbols, 4 options | ✅ Yes | ✅ With accuracy + timing | ✗ FAILED |
| 2 | N-Back(2): 12 symbols, 4 options | ✅ Yes | ✅ With accuracy + timing | ✗ FAILED |

**Observations:**
- Symbol sequences are randomly generated with guaranteed matches
- Options include correct answer, ±1, and 0 matches
- Shuffling prevents position-based gaming
- Evaluation uses real TrialResult with dimensions

### 1.4 Headless Mode (no-llm, forced ScenarioChoice, Cognitive:Red, 2 encounters)

| Encounter | Expected Task | Actual Task | Status |
|---|---|---|---|
| 1 | Dilemma or Scenario | **N-Back (Working Memory)** | ❌ WRONG |
| 2 | Dilemma or Scenario | **N-Back (Working Memory)** | ❌ WRONG |

**Root Cause:** `selectTaskForModality()` maps ScenarioChoice → `['dilemma', 'scenario']`. But Cognitive:Red's module has tasks `['n_back', 'stroop', 'go_no_go', 'hold', 'pattern_prediction', 'emotion_identification']` — none match `dilemma` or `scenario`. Falls through to `module.tasks[0]` = `n_back`.

### 1.5 Headless Mode (no-llm, forced LanguageReflective, Emotional:Red, 2 encounters)

| Encounter | Task Presented | Result | Notes |
|---|---|---|---|
| 1 | Self-Report: "Describe a recent moment where you felt truly alive" | ✓ PASSED (agency, score=0.80) | Correct self-report prompt |
| 2 | Self-Report: "If you could change one thing about how you relate to others" | ✓ PASSED (communion, score=0.60) | Correct self-report prompt |

**Observations:** LanguageReflective correctly routes to `llm_dialogue` → falls through to `emotion_identification` → falls through to `self_report` → renders with `renderSelfReport()`. Works because Emotional:Red has `emotion_identification` task.

### 1.6 Headless Mode (no-llm, forced DarkAddiction shadow, 2 encounters)

| Encounter | Shadow Detected | Shadow Tracked | Result |
|---|---|---|---|
| 1 | ✓ DarkAddiction (forced) | ⚠ shadow: DarkAddiction | ✗ FAILED |
| 2 | ✓ DarkAddiction (forced) | ⚠ shadows: Addictio×2(32/34%) | ✗ FAILED |

**Observations:** Shadow forcing works correctly. Shadow display groups by quadrant and shows severity percentages.

### 1.7 Full 20-Encounter Session (no-llm, verbose, force-shadow=none)

| Metric | Value |
|---|---|
| Encounters completed | 20/20 |
| Pass rate | 5/20 (25%) |
| Lines advanced | Cognitive, Moral, Willpower, Interpersonal: Red→Amber |
| Lines unchanged | Emotional, Spiritual, Somatic: Red |
| CCI start → end | 50.4% → 52.1% |
| Altitude overall | 29% → 26% |

**Modules encountered:**
- Cognitive:Red — Working Memory (n-back) × multiple
- Emotional:Red — Emotional Literacy (emotion ID) × multiple
- Moral:Red — Moral Reasoning (dilemma) × multiple
- Willpower:Red — Attentional Hold (hold) × multiple
- Spiritual:Red — Value Prioritization × multiple
- Somatic:Red — Reaction Speed × multiple
- Interpersonal:Red — Situational Judgment (dilemma) × multiple
- Intrapersonal:Red — Self-Inquiry × multiple

**Observations:**
- 25% pass rate is too low — most encounters fail because headless scoring puts average at 0.575 but many modules have passThreshold at 0.5-0.6
- Despite low pass rate, altitude shifts still occur (4 lines advance)
- CCI barely moves (50.4% → 52.1%) — doesn't recompute after altitude shifts
- Narrative variety is template-based — same 4 opening/closing pools per pass/fail

### 1.8 JSON Event Stream (no-llm, 2 encounters)

| Event Type | Fired | Data Complete |
|---|---|---|
| `session_started` | ✅ | cci, theme, targetEncounters |
| `ask_user` (×2) | ✅ | header, question, options, allowWriteIn |
| `encounter_completed` (×2) | ✅ | encounter, modality, module, passed, narrative, totalEncounters |
| `session_ended` | ✅ | encountersCompleted, shadowsSurfaced, shadowsResolved, finalStage |

**Observations:** JSON event stream is complete and well-formed for AI-agent consumption loops.

### 1.9 SocialCooperative Modality (Moral:Red)

| Encounter | Task | Result |
|---|---|---|
| 1 | Moral Reasoning (dilemma): taking credit vs honesty | ✓ PASSED |
| 2 | Moral Reasoning (dilemma): explaining suffering to a child | ✓ PASSED |

**Observations:** SocialCooperative correctly routes to `['cooperation', 'dilemma', 'emotion_identification']`. Moral:Red has `dilemma` tasks, so dilemmas render correctly.

### 1.10 ImmersiveRPG Modality (Interpersonal:Red)

| Encounter | Task | Result |
|---|---|---|
| 1 | Pattern Recognition: ancient text and society | ✗ FAILED (score=0.50) |
| 2 | Pattern Recognition: rival faction alliance | ✗ FAILED (score=0.50) |

**Observations:** ImmersiveRPG maps to `['scenario', 'llm_dialogue', 'emotion_identification']`. Interpersonal:Red has `scenario` tasks, so it falls through to `renderDilemma()` via the `dilemma|scenario` case. The dilemmas shown are from the generic dilemma pool, not from the module's specific scenario content.

---

## 2. Gap Taxonomy

### Tier 0 — Blocking (system misbehaves for default users)

| # | Gap | Evidence | Impact | Fix Effort |
|---|---|---|---|---|
| **0.1** | **Default mode (LLM active) is unusable** | Every encounter waits 20-30s for LLM timeout before falling back. Full 20-encounter session takes 10+ minutes in timeouts alone. | The primary user experience is broken. Users must know to use `--no-llm`. | 2 hours |
| **0.2** | **Modality→TaskType mismatch for some modules** | `--modality=ScenarioChoice` on Cognitive:Red shows n-back (wrong). ScenarioChoice maps to `['dilemma', 'scenario']` but Cognitive:Red has neither. Falls through to `tasks[0]`. | Encounters show irrelevant task types, breaking developmental validity. | 1 day |

### Tier 1 — Critical (system runs but produces limited developmental value)

| # | Gap | Evidence | Impact | Fix Effort |
|---|---|---|---|---|
| **1.1** | **No save/load persistence** | `createDefaultSignificator()` hardcodes all lines to Red every run. `totalEncounters` and `totalSessions` reset to 0. | No continuity across sessions. Player progress is lost. | 1 day |
| **1.2** | **No onboarding calibration** | `createSignificator('cli-player', allRed, 'Red')` — every player starts at Red regardless of actual capacity. ONBOARDING-REDESIGN-PLAN.md exists but isn't wired. | Experienced players must grind through trivial early-stage encounters. | 2 days |
| **1.3** | **Pass rate is 25% (5/20)** | Headless scoring puts most MCQ selections at 0.575 average. Many modules have passThreshold at 0.5-0.6. Shadow injection (10% chance) forces additional failures. | Sessions feel punishing. Players fail 75% of encounters. | 1 day |
| **1.4** | **FallbackProvider limited for higher stages** | `getFallback()` only generates meaningful content for Red/Amber/Orange. Green/Turquoise/White fall through to minimal defaults. | Higher-stage encounters show generic content. | 4 hours |
| **1.5** | **Theta-decay never runs mid-session** | `endSession()` applies decay, but encounters within a session don't update `theta.lastEncounter`. Stale cells don't get prioritized dynamically. | Scheduling doesn't adapt to neglect during a session. | 4 hours |
| **1.6** | **Narrative continuity absent** | Each encounter is context-free. No reference to previous choices or events. The `history` array is passed but not used in encounter framing. | Encounters feel disconnected. No sense of story arc. | 1 day |

### Tier 2 — Developmental Depth Gaps

| # | Gap | Evidence | Impact | Fix Effort |
|---|---|---|---|---|
| **2.1** | **All narratives within same line are template-identical** | `buildModuleNarrative()` has 4 opening/closing pools per pass/fail. Same text every time for same line×stage×modality. | Repetitive. Feels like a test, not an RPG. | 1 day |
| **2.2** | **CCI doesn't recompute after altitude shifts mid-session** | CCI only recomputed every `reEvaluationInterval` (default 5 encounters). With altitude shifts at encounters 1-5, CCI is stale. | Session strategy doesn't adapt to evolving player state. | 2 hours |
| **2.3** | **Shadow display truncated** | "Addictio" instead of "DarkAddiction" in shadow summary. `q.replace('Dark', '').replace('Golden', 'G').slice(0, 8)` cuts off too aggressively. | Confusing labels for players. | 15 mins |
| **2.4** | **Self-limiting pattern in headless mode** | `Date.now() % 4` cycling means AI agents always get predictable results. Option positions are shuffled but evaluation is deterministic. | AI agents can't be genuinely tested. | 2 hours |
| **2.5** | **No consequence of failure** | Failing encounters has no real negative consequence. Theta decay doesn't accelerate, NPC relationships don't degrade meaningfully. | No stakes. Players don't feel the weight of choices. | 4 hours |
| **2.6** | **ImmersiveRPG shows generic dilemmas, not module-specific scenarios** | ImmersiveRPG maps to `['scenario', ...]` but `renderDilemma()` uses a generic pool, not the module's `scenario` task content. | Module-specific narrative content is ignored. | 4 hours |

### Tier 3 — UX Polish Gaps

| # | Gap | Evidence | Impact | Fix Effort |
|---|---|---|---|---|
| **3.1** | **CCI dimension labels cryptic** | `alt:29% drH:100% pol:0% shd:90% trns:0%` not meaningful to players. | Confusing. Players can't interpret their developmental state. | 1 hour |
| **3.2** | **No progress/loading indicators between encounters** | No dots, spinners, or "thinking..." text while the system processes. | Feels sluggish even when fast. | 30 mins |
| **3.3** | **Encounter result display limited in non-verbose mode** | Only shows pass/fail icon. No dimension breakdown, no score, no drive summary unless `--verbose`. | Players don't know WHY they passed/failed. | 2 hours |
| **3.4** | **Session closure could be richer** | Shows stats but no thematic wrap-up reflecting the specific encounters that occurred. | Sessions end anticlimactically. | 2 hours |
| **3.5** | **Drive compass shows fixation % but not direction** | Shows `fix:15%` but not whether agency is over/under-expressed relative to baseline. | Players can't see drive imbalance direction. | 1 hour |
| **3.6** | **No ASCII art or visual flair for assessment tasks** | N-back sequences are plain text. No visual framing, no progress bar during timed tasks. | Tasks feel clinical, not immersive. | 4 hours |

---

## 3. Modality Routing Analysis

The `selectTaskForModality()` function maps modalities to preferred task types:

| Modality | Preferred Task Types | Issue |
|---|---|---|
| Deterministic | n_back, stroop, go_no_go, hold, reaction_time, rhythm | ✅ Works — these tasks exist in most modules |
| LanguageReflective | llm_dialogue, self_report, emotion_identification | ⚠️ Falls through to self_report/emotion_id when llm_dialogue unavailable |
| ScenarioChoice | dilemma, scenario | ❌ Many modules lack these — falls to tasks[0] |
| Embodied | hold, rhythm, imitation | ⚠️ Some modules lack these |
| Strategic | pattern_prediction, value_ranking | ⚠️ Some modules lack these |
| SocialCooperative | cooperation, dilemma, emotion_identification | ⚠️ Works for Moral (has dilemma) but may fail for others |
| ImmersiveRPG | scenario, llm_dialogue, emotion_identification | ⚠️ Uses generic dilemma pool instead of module content |

**Recommendation:** Add a `modalityFallbackMap` that maps each modality to a default task type when the preferred types aren't available, rather than falling to `tasks[0]`.

---

## 4. Scoring Analysis

### Current Scoring Flow

1. TaskRenderer produces MCQ options with `correctnessScore` (1.0/0.7/0.5/0.0)
2. Option is shuffled (Fisher-Yates)
3. `evaluate()` matches selected option → extracts `correctnessScore`
4. `AgenticOrchestrator` builds `driveScores`:
   - Matched drive: `correctnessScore` (0.0–1.0)
   - Unmatched drives: 0.5 (neutral baseline)
5. Average = `(score + 0.5 + 0.5 + 0.5) / 4`
6. Pass if average ≥ module's `passThreshold`

### The 0.575 Problem

When a player selects option [1] (correct answer, score=1.0):
- Average = `(1.0 + 0.5 + 0.5 + 0.5) / 4 = 0.625` → PASSES most thresholds

When a player selects option [2] (close, score=0.7):
- Average = `(0.7 + 0.5 + 0.5 + 0.5) / 4 = 0.55` → FAILS at threshold 0.6

When a player selects option [3] (partial, score=0.5):
- Average = `(0.5 + 0.5 + 0.5 + 0.5) / 4 = 0.50` → FAILS at all thresholds

**The scoring is too compressed.** The difference between "perfect" and "partial" is only 0.125 in the average. This means:
- Only perfect MCQ selections pass
- Write-in responses get a depth bonus but it's small (max +0.2)
- The system is essentially binary: perfect = pass, anything else = fail

**Recommendation:** Either:
1. Increase the spread between drive scores (e.g., matched=1.0, unmatched=0.3)
2. Or use the TrialResult's dimension scores directly instead of the compressed average
3. Or lower passThreshold to 0.45 for Red-stage modules

---

## 5. Developmental Catalysis Assessment

### Is the CLI Actually Catalytic?

| Phase | Required | Current Status | Rating |
|---|---|---|---|
| **Catalyst** | Challenge that probes developmental structure | ✅ Real tasks (n-back, dilemmas, hold) with genuine cognitive/emotional demands | 7/10 |
| **Experience** | Response reveals meaningful signals | ⚠️ Drive differentiation works but scoring is compressed. Write-in depth bonus is small. | 5/10 |
| **Integration** | State mutations from behavioral data | ✅ Altitude shifts, shadow tracking, CCI evolution all functional | 7/10 |
| **Narrative** | Immersive story world | ❌ Template-based narratives, no continuity, no stakes | 3/10 |
| **Progression** | Building upon previous encounters | ❌ Each encounter is context-free. No story arc. | 2/10 |
| **Adaptation** | System evolves with player | ⚠️ Altitude shifts work but CCI doesn't recompute. Difficulty is trace-count-based. | 4/10 |

**Overall: 5/10** — The plumbing works but the experience is clinical, not catalytic.

### What Would Make It Truly Catalytic

1. **Narrative continuity** — Encounters reference previous choices. NPCs remember you.
2. **Genuine stakes** — Failure has consequences (relationship degradation, shadow accumulation).
3. **Adaptive difficulty** — System scales to player's actual performance, not just trace count.
4. **Emotional resonance** — Dilemmas that make you feel something, not just think.
5. **Progression arcs** — Sessions build toward a transformation threshold.
6. **Write-in richness** — Free-form responses evaluated for depth, not just keyword matching.

---

## 6. Prioritized Fix Plan

### Sprint 1: Fix Blocking Issues (0.1, 3.3, 2.3) — 4 hours
1. **Auto-detect LLM availability** — Add a fast connectivity check (HEAD /v1/models with 2s timeout) at session start. If unreachable, silently fall back to no-llm mode.
2. **Fix shadow label truncation** — Remove the `.slice(0, 8)` and show full quadrant names.
3. **Show score in non-verbose mode** — Display the primary dimension score after pass/fail.

### Sprint 2: Fix Modality Routing (0.2, 2.6) — 1 day
1. **Add modality fallback map** — When preferred task types aren't available, use a sensible default per modality instead of `tasks[0]`.
2. **Wire module-specific scenarios** — When ImmersiveRPG selects a `scenario` task, use the module's scenario content, not the generic dilemma pool.

### Sprint 3: Fix Scoring & Pass Rate (1.3, 2.1, 2.2) — 1 day
1. **Increase scoring spread** — Matched drive gets full score, unmatched get 0.3 instead of 0.5.
2. **Recompute CCI after altitude shifts** — Trigger CCI recomputation when `altitudeShift` is non-null.
3. **Add narrative variety** — Expand narrative pools from 4 to 12+ per pass/fail, include line-specific flavor text.

### Sprint 4: Add Persistence & Onboarding (1.1, 1.2) — 2 days
1. **JSON file persistence** — Save/load Significator to `~/.mysterium/save.json`.
2. **3-question capacity calibration** — Quick onboarding that estimates initial line altitudes.

### Sprint 5: Add Narrative Depth (1.6, 2.5, 3.4) — 2 days
1. **Pass last 3 encounter summaries into context** — Encounters reference previous events.
2. **Add failure consequences** — Theta decay accelerates, NPC relationship degrades.
3. **Rich session closure** — Thematic wrap-up based on what happened in the session.

### Sprint 6: UX Polish (3.1, 3.2, 3.5, 3.6) — 1 day
1. **Fix CCI labels** — Use "altitude", "driveHealth", "polarity", "shadow", "transformation".
2. **Add processing indicators** — "..." while evaluating responses.
3. **Enrich drive compass** — Show direction (over/under-expressed) not just fixation %.
4. **Add visual flair** — ASCII art borders, progress bars for timed tasks.

---

## 7. Validation Criteria (Post-Fix)

After all sprints, the system must pass:

1. `--headless --encounters=5` completes in < 10 seconds (no LLM timeout)
2. `--headless --encounters=5` produces exactly 5 encounters ✅ (already works)
3. Pass rate across 5 encounters is 40-60% (currently 25%)
4. Each encounter shows a different narrative even for same line×stage
5. Session end shows a thematic wrap-up referencing specific encounters
6. Significator persists across CLI runs
7. New player gets capacity calibration onboarding
8. `--modality=ScenarioChoice` on any module shows dilemma/scenario, not n-back
9. All 447 tests still pass
10. TypeScript still compiles cleanly

---

## 8. Architecture Stats

| File | Lines | Purpose |
|---|---|---|
| `scripts/cli-game.ts` | 924 | Main CLI runner |
| `TaskRenderers.ts` | 1,168 | Assessment task rendering |
| `AgenticOrchestrator.ts` | 1,315 | LLM/fallback orchestrator |
| `ScoringBridge.ts` | 115 | TrialResult → AssessmentResult |
| `GameLoop.ts` | 235 | Headless game loop |
| `EncounterScheduler.ts` | 95 | Encounter selection |
| `PriorityComputation.ts` | 180 | Priority formula |
| `CandidateGeneration.ts` | 115 | Candidate filtering |
| **Total CLI core** | **~5,027** | |

---

*This audit is based on 12+ CLI runtime tests across 7 modalities, 8 lines, multiple forcing flags, LLM vs fallback paths, 20-encounter sessions, JSON event streams, and deep code analysis of 5,000+ lines.*

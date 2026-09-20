# Mysterium TUI/CLI Comprehensive Gap Audit — v2

**Date:** June 20, 2026
**Scope:** Exhaustive end-to-end testing of CLI/TUI across all modes, modalities, and edge cases
**Method:** 15+ runtime tests (diagnostic, headless, interactive, JSON, persistence, forced modalities, forced shadows, --help, --new-game), 7 modality routing verification, code analysis of ~5,000+ lines, test suite (440/447 pass)
**Auditor:** Buffy (AI agent) — personal developmental audit

---

## Executive Summary

The CLI is **functional and compiles cleanly** (TypeScript zero errors, 440/447 tests pass). The core plumbing works: 64 assessment modules load, scheduling produces encounters, scoring differentiates pass/fail, persistence saves/loads, shadow detection fires, and narrative variety exists. The ScenarioChoice/ImmersiveRPG modality routing fix is verified working across all lines.

However, **the system is not yet a genuine developmental catalyst**. The core issue is that the scoring architecture produces pathological behaviors: CCI decreases despite good performance, altitude shifts never fire even at 70% pass rate, and the shadow detection system creates a false-positive lock that prevents all state progression. These are not polish issues — they are architectural gaps that undermine the entire developmental feedback loop.

**Current developmental catalysis rating: 5.5/10** (infrastructure solid, developmental depth insufficient)

---

## Test Results Matrix

| # | Test | Status | Key Finding |
|---|---|---|---|
| 1 | TypeScript compilation | ✅ Clean | Zero errors |
| 2 | Test suite | ⚠️ 440/447 pass | 6 ScreenReaderOverlay, 1 ContextPipeline (pre-existing) |
| 3 | Diagnostic mode | ✅ Works | 64 modules, 36 holons, saved progress loads |
| 4 | --help flag | ✅ Works | Comprehensive, well-formatted |
| 5 | Headless 5 encounters (--no-llm) | ✅ Completes | 3/5 passed (60%), GoldenAddiction surfaced |
| 6 | Headless 20 encounters (--no-llm) | ✅ Completes | 14/20 passed (70%), NO altitude shifts, CCI decreased 49.9→47.8% |
| 7 | --new-game flag | ✅ Works | Resets to Red, CCI 50.4%, no shadows |
| 8 | --force-shadow=DarkAddiction | ✅ Works | 3/3 forced shadows, all failed, correct quadrant |
| 9 | ScenarioChoice on Cognitive:Red | ✅ FIXED | Shows dilemma (not n-back), correct narrative label |
| 10 | SocialCooperative on Moral:Red | ✅ Works | Dilemma, correct routing |
| 11 | ImmersiveRPG on Spiritual:Red | ✅ Works | Line-specific dilemmas, correct routing |
| 12 | Deterministic on Emotional:Red | ✅ Works | Emotion identification, correct routing |
| 13 | LanguageReflective on Cognitive:Red | ✅ Works | Self-report, correct routing |
| 14 | Embodied on Intrapersonal:Red | ✅ Works | Hold task, correct routing |
| 15 | JSON event stream | ⚠️ Works | Valid events, BUT ANSI codes in question text |
| 16 | Persistence save/load | ✅ Works | Save → reload preserves state correctly |
| 17 | Single encounter mode | ✅ Works | Correct module/modality/task presented |

---

## Gap Taxonomy

### TIER 0 — Architectural Bugs (System behaves incorrectly)

| # | Gap | Evidence | Root Cause | Impact | Fix Effort |
|---|---|---|---|---|---|
| **B.1** | **CCI decreases despite good performance** | 14/20 encounters passed in 20-encounter session. CCI went from 49.9% → 47.8%. Over 5 sessions, CCI dropped from 50.4% to 44.5%. | CCI computation penalizes accumulated shadows without crediting passes. Shadow entries accumulate in the Significator's shadowLedger but are never resolved, dragging down the shadowTopology dimension. | **Core metric is broken.** Players see their "development score" decrease despite performing well. | 1 day |
| **B.2** | **Altitude shifts never fire** | 14/20 passed in 20-encounter session. ALL 8 lines remained at Red. The `computeAltitudeShift()` requires: (1) passed=true, (2) ALL 4 drive signals = HealthyBalanced, (3) 3+ consecutive passes per line. | The 3-consecutive-pass requirement was added as a fix (D.10 in v1 audit), but combined with the shadow detection system, it creates an impossible condition: any write-in that triggers ANY shadow keyword blocks ALL 4 drives from being HealthyBalanced, even for unrelated drives. | **Progression system is completely frozen.** Players never advance regardless of performance. | 2 hours |
| **B.3** | **ANSI escape codes in JSON output** | JSON event stream contains `\u001b[1m` in question text (e.g., `"What emotion does the person feel?\u001b[0m"`). | TaskRenderers use ANSI escape codes for bold formatting (`C.bold`) inside question text that gets serialized to JSON. No sanitization step. | **JSON mode is unusable for AI-agent consumption.** Machine consumers see raw escape sequences. | 30 min |
| **B.4** | **Processing spinner leaves ANSI artifacts** | Between encounters: `\r  ... preparing encounter\r  ... preparing encounter.\r  ... preparing encounter..\r  ... preparing encounter...\u001b[2K\r` | The spinner uses `\r` carriage returns with ANSI clear-line (`\u001b[2K`) but the final state isn't clean in all terminal emulators. | Visual artifacts on screen between encounters. | 30 min |

### TIER 1 — Critical Developmental Gaps

| # | Gap | Evidence | Root Cause | Impact | Fix Effort |
|---|---|---|---|---|---|
| **D.1** | **No onboarding calibration** | Every new player starts at Red (all 8 lines). The `--new-game` flag hardcodes `allRed`. ONBOARDING-REDESIGN-PLAN.md exists but isn't wired. | No calibration mechanism implemented. | **Experienced players grind through trivial early-stage encounters.** System can't adapt to actual capacity. | 2 days |
| **D.2** | **Self-report prompts are line-agnostic** | The `renderSelfReport()` has only 6 generic prompts shared across ALL 8 lines. A Cognitive:Red self-report asks "What is one thing you avoid thinking about?" — identical to Spiritual:Red. | No line-specific prompt pools in TaskRenderers. | **Same prompts across all lines feel disconnected from the line being assessed.** No developmental depth differentiation. | 1 day |
| **D.3** | **Embodied modality always shows "hold" (memory symbols)** | Embodied maps to `['hold', 'rhythm', 'imitation']`. Most modules only have 'hold', so Embodied ALWAYS shows ◆ ● ▲ regardless of line. Cognitive:Red Embodied = same hold task as Moral:Red Embodied. | Limited task diversity for Embodied modality across modules. | **7 modality diversity is illusory** — Embodied is always the same memory task. | 1 day |
| **D.4** | **Reaction speed is not actually timed** | `renderReactionTime()` asks "select the option that best describes your approach to quick response" — it's a preference question, not a reaction time test. Scoring uses MCQ correctness, not actual timing. | Task design doesn't leverage real-time measurement. | **Reaction Speed task measures preference, not reaction speed.** Misleading label. | 4 hours |
| **D.5** | **No write-in semantic analysis** | Write-in responses are evaluated only by keyword matching (30+ keywords per shadow quadrant). No LLM-assisted semantic analysis in fallback mode. | LLM unavailable in --no-llm mode; keyword matching is the only fallback. | **Free-form responses aren't deeply evaluated.** Real developmental signals missed. | 1 day |
| **D.6** | **Dilemma scoring doesn't differentiate options** | The dilemma renderer gives accuracy=0.6 for ANY MCQ selection and accuracy=0.8 for write-ins >30 chars. No option is "better" — the 4 drive-aligned options all score the same. | Dilemma scoring uses `accuracy = matchedOption ? 0.6 : (answer.length > 30 ? 0.8 : 0.5)`. | **Dilemma responses all score ~0.6 regardless of choice.** No differentiation between agency vs communion vs eros vs agape responses. | 1 day |
| **D.7** | **Self-report MCQ scoring doesn't use correctnessScore** | Self-report options have correctnessScores (0.8, 0.6, 0.3, 0.5) but the evaluate() function uses word count for accuracy, not the matched option's correctnessScore. All MCQ selections score ~0.5. | The evaluate function computes `effectiveWordCount` from label word count (~4-6 words) → `accuracy = 0.7` regardless of option. | **All self-report MCQ selections score the same.** The correctnessScore metadata is dead code. | 2 hours |
| **D.8** | **Shadow detection blocks altitude shifts permanently** | In `computeAltitudeShift()`, if ANY drive has a shadow signal (not HealthyBalanced), the altitude shift is blocked. But shadow detection fires from write-in keyword matching which is noisy. | The architecture requires ALL 4 drives to be HealthyBalanced, but shadow detection on one drive blocks all others. | **Altitude shifts are effectively impossible** when any shadow is detected. Combined with 25% shadow injection rate, this means ~25% of encounters permanently block progression. | 4 hours |

### TIER 2 — UX Polish Gaps

| # | Gap | Evidence | Impact | Fix Effort |
|---|---|---|---|---|
| **U.1** | **Session closure "Strengths" is misleading** | Lines with 1 encounter and 100% pass rate are listed as "Strengths: Willpower, Spiritual, Somatic — consider advancing to harder challenges" when they only had 1 data point. | Players get false confidence about capabilities. | 30 min |
| **U.2** | **No ASCII art or visual framing for tasks** | Tasks feel clinical — no borders, progress bars, or thematic framing around questions. | Less immersive than a game should be. | 4 hours |
| **U.3** | **Drive bars don't reflect actual scores** | Drive bars show "██░░░░░░" but the actual percentage is derived from shadow detection, not performance. All drives show similar bars regardless of performance. | Players can't see their actual drive balance. | 2 hours |
| **U.4** | **"Fixation risk" display is inconsistent** | Sometimes shows "fix:15%", sometimes "fix:11%", sometimes nothing. The display only appears when fixation exceeds a threshold but the threshold logic isn't clear. | Confusing. Players don't know when to expect it. | 1 hour |
| **U.5** | **Encounter history text gets very long and repetitive** | "Recently: Bloodfury beckoned you into a focused mental trial — the threshold remained unsteady — an emotional ..." — truncated narratives add visual noise. | Visual clutter makes it hard to focus on the current encounter. | 1 hour |
| **U.6** | **No transition animations between encounters** | Between encounters, just text lines. No visual progress indicators. | Clinical feel, not game-like. | 2 hours |
| **U.7** | **CCI dimension labels still somewhat long** | `altitude:29% drive:96% polarity:20% shadow:75% transformation:0%` — could be more compact. | Minor readability issue. | 30 min |
| **U.8** | **Per-line performance bars don't clearly distinguish pass/fail** | The █ and ░ symbols don't clearly distinguish pass/fail — it's just "filled" vs "empty". | Players can't quickly see which encounters succeeded vs failed. | 1 hour |
| **U.9** | **No visual distinction between WARMUP/PEAK/COOLDOWN phases** | The arc indicator (▰▰▱▱▱▱▱▱▱▱▱▱) exists but doesn't change color or style between phases. | Missed opportunity for atmospheric progression. | 1 hour |
| **U.10** | **Bleed-through display is confusing** | Shows "Cognitive:Infrared, Cognitive:Magenta, ..." (56 total) — this is the encounter scheduling bleed-through, not meaningful to the player. | Technical internals leaked to user. | 30 min |

### TIER 3 — Infrastructure Gaps

| # | Gap | Evidence | Impact | Fix Effort |
|---|---|---|---|---|
| **I.1** | **No CLI-specific tests** | Zero test files for cli-game.ts, TaskRenderers, or ScoringBridge. | Regressions undetectable. | 1 day |
| **I.2** | **7 pre-existing test failures** | 6× ScreenReaderOverlay (DOM/aria-live), 1× ContextPipeline (stage inference parsing). | Accessibility layer broken. | 4 hours |
| **I.3** | **LLM health check uses /models endpoint** | `checkLLMAvailability()` hits `/models` which returns 200 even with invalid API key. The `/chat/completions` endpoint returns auth errors. | LLM detection is a false positive. Users must use `--no-llm` manually. | 30 min |
| **I.4** | **No retry logic for LLM failures** | Single LLM failure = immediate fallback. No exponential backoff. | Transient errors cause permanent mode switch. | 2 hours |

---

## Modality Routing Matrix (Verified)

All 7 modalities now route correctly for forced line×stage combinations:

| Modality | Cognitive:Red | Willpower:Red | Moral:Red | Emotional:Red | Spiritual:Red | Intrapersonal:Red | Status |
|---|---|---|---|---|---|---|---|
| Deterministic | n_back ✅ | hold ✅ | dilemma ✅ | emotion_id ✅ | dilemma ✅ | self_report ✅ | ✅ All correct |
| LanguageReflective | self_report ✅ | self_report ✅ | dilemma ✅ | self_report ✅ | dilemma ✅ | self_report ✅ | ✅ All correct |
| ScenarioChoice | **dilemma ✅** | dilemma ✅ | dilemma ✅ | emotion_id ✅ | dilemma ✅ | dilemma ✅ | ✅ **Fixed** |
| Embodied | hold ✅ | hold ✅ | hold ✅ | hold ✅ | hold ✅ | hold ✅ | ⚠️ Always hold |
| Strategic | pattern ✅ | pattern ✅ | pattern ✅ | pattern ✅ | pattern ✅ | pattern ✅ | ✅ All correct |
| SocialCooperative | cooperation ✅ | cooperation ✅ | dilemma ✅ | emotion_id ✅ | cooperation ✅ | cooperation ✅ | ✅ All correct |
| ImmersiveRPG | **dilemma ✅** | dilemma ✅ | dilemma ✅ | emotion_id ✅ | dilemma ✅ | dilemma ✅ | ✅ **Fixed** |

**Key fix verified:** ScenarioChoice on Cognitive:Red now shows dilemma (not n-back). ImmersiveRPG on Spiritual:Red shows line-specific spiritual dilemmas.

---

## Developmental Catalysis Assessment

| Phase | Required | Current Status | Rating |
|---|---|---|---|
| **Catalyst** | Challenge probes developmental structure | ✅ Real tasks with correct modality routing, line-specific dilemmas | 7/10 |
| **Experience** | Response reveals meaningful signals | ⚠️ Rubric scoring works but dilemma scoring doesn't differentiate options; self-report scoring ignores correctnessScore | 5/10 |
| **Integration** | State mutations from behavioral data | ❌ CCI decreases despite good performance; altitude shifts never fire; progression frozen | 3/10 |
| **Narrative** | Immersive story world | ✅ 8+ narrative pools per pass/fail, line-specific, modality-aware | 7/10 |
| **Progression** | Building upon previous encounters | ⚠️ `buildBriefHistory()` exists with continuity; but CCI regression and no altitude shifts mean no actual progression | 4/10 |
| **Adaptation** | System evolves with player | ❌ CCI recomputes but decreases; scheduling doesn't adapt to neglect during session | 3/10 |
| **Shadow Work** | Shadow surfacing and integration | ⚠️ Shadow detection works (25% injection + keyword matching) but shadows are never resolved and block progression | 4/10 |
| **Holonic Integrity** | Lower stages maintained | ⚠️ Theta-decay only at session end; no mid-session adaptation | 5/10 |

**Overall: 5.5/10** — Infrastructure is solid. Developmental depth is undermined by the CCI/altitude/shadow architecture.

---

## Root Cause Analysis: The Three Interlocking Bugs

The three TIER 0 bugs (B.1, B.2, B.8) are not independent — they form a feedback loop:

```
Shadow Detection (25% injection + keyword matching)
    ↓ generates shadow signals on write-ins
    ↓ marks drives as DarkAddicted/DarkAverted/GoldenAddicted/GoldenAverted
    ↓
computeAltitudeShift() requires ALL 4 drives = HealthyBalanced
    ↓ ANY shadow signal blocks altitude shift
    ↓ 3-consecutive-pass requirement makes it even harder
    ↓
Altitude shifts NEVER fire
    ↓ Player stays at Red forever
    ↓ CCI doesn't get altitude boost
    ↓
Shadow entries accumulate in shadowLedger
    ↓ Never resolved (no shadow resolution mechanism)
    ↓ Shadow topology dimension degrades
    ↓
CCI DECREASES despite good performance
    ↓ Player sees "development score" going DOWN
    ↓ Feels punishing despite passing encounters
```

**The fix must address all three simultaneously:**
1. Make shadow detection proportional — not every shadow blocks progression
2. Make altitude shifts achievable — require sustained passes but don't let shadows permanently block
3. Make CCI responsive to passes — reward good performance, not just penalize shadows

---

## Priority Fix Order

### Sprint 7: Fix Architectural Bugs (1 day)

**The Big Three — must be fixed together:**

1. **B.2 + D.8** — Fix altitude shift logic: Change `computeAltitudeShift()` to not require ALL 4 drives HealthyBalanced. Instead: require the ACTIVE drive (matched drive) to be HealthyBalanced, AND require 3+ consecutive passes. Remove the shadow-blocking condition for unrelated drives.

2. **B.1** — Fix CCI computation: After each encounter, if passed AND no shadow on the active drive, give a small CCI boost to the relevant dimension. Shadow entries should decay over time (not accumulate forever). Add a "shadow resolution" mechanism: when a player passes an encounter in the same line where a shadow was previously detected, reduce that shadow's severity.

3. **B.3** — Strip ANSI codes from JSON output: Add a `stripAnsi()` helper that removes `\x1b[...m` sequences before serializing to JSON.

4. **B.4** — Fix processing spinner: Replace the carriage-return spinner with a clean single-line status that doesn't leave artifacts.

### Sprint 8: Fix Scoring Architecture (1 day)

5. **D.6** — Fix dilemma scoring: Each dilemma option should map to a drive. The matched drive's score should reflect the option's correctnessScore. Options aligned with the line's developmental edge should score higher than misaligned options.

6. **D.7** — Fix self-report scoring: Use the matched option's correctnessScore for accuracy, not word count. Word count should inform depth, not accuracy.

7. **D.4** — Fix reaction time: Either add actual timing measurement (measure response latency) or rename the task to "Response Preference" and update the label.

### Sprint 9: Developmental Depth (2 days)

8. **D.2** — Add line-specific self-report prompts: Each line gets 4-6 prompts that probe the developmental structure unique to that line (e.g., Cognitive: "What assumption do you hold that you've never questioned?", Emotional: "What feeling do you avoid sitting with?").

9. **D.5** — Add write-in evaluation depth: When LLM is available, use it for semantic analysis of write-ins. When not available, expand keyword detection with contextual patterns (not just raw keywords).

10. **D.3** — Add modality-specific Embodied tasks: Rhythm for Emotional, imitation for SocialCooperative, reaction_time for Cognitive, etc.

### Sprint 10: UX Polish (1 day)

11. **U.1** — Fix "Strengths" display: Only show lines with 3+ encounters as strengths.
12. **U.2** — Add ASCII borders around task presentation.
13. **U.3** — Fix drive bars to reflect actual performance scores.
14. **U.5** — Shorten encounter history text (max 60 chars per entry).
15. **U.8** — Use ✓/✗ symbols in per-line performance instead of █/░.
16. **U.10** — Remove bleed-through display (technical internals).

### Sprint 11: Infrastructure (1 day)

17. **I.1** — Add CLI-specific test suite for TaskRenderers and ScoringBridge.
18. **I.3** — Fix LLM health check to use `/chat/completions` with minimal request.
19. **I.2** — Fix 7 pre-existing test failures.

---

## Validation Checklist (Post-Fix)

- [ ] CCI increases (or stays stable) when player passes >50% of encounters
- [ ] Altitude shifts fire after 3+ consecutive passes per line (without shadow blocking)
- [ ] Shadow detection is proportional — shadows surface but don't permanently block progression
- [ ] Shadow entries decay over time (resolve after sustained healthy performance)
- [ ] JSON output contains no ANSI escape codes
- [ ] All 7 modalities show genuinely different content (not always "hold" for Embodied)
- [ ] Dilemma responses are differentiated by drive alignment
- [ ] Self-report MCQ selections score differently based on option choice
- [ ] Reaction speed task measures actual timing (or is correctly labeled)
- [ ] Line-specific self-report prompts exist for all 8 lines
- [ ] "Strengths" only shows lines with 3+ encounters
- [ ] All 447+ tests pass
- [ ] `--headless --no-llm --encounters=20` shows altitude shifts and CCI increase

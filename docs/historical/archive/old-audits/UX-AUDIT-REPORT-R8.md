# Mysterium Fresh-User UX Audit Report — Round 8

> **Date:** 2026-07-06
> **Method:** A subagent with zero knowledge of Mysterium internals role-played a fresh user discovering the game via the CLI only. It ran 30 distinct commands with focus on edge cases (empty inputs, mismatched counts, long answers, rapid sessions) and verifying the `--agent` path. The parent agent verified all key findings.
> **Objective:** Determine whether the game has reached 10/10, or whether remaining paper cuts and edge-case failures prevent it.

---

## 0. Executive Summary

**Rating: 9/10 experiential, 8.5/10 efficacy.** Down from R7's 9.5/10 / 9/10.

**R8 found a regression in the `--agent` path** that R7 didn't catch (R7 only tested `--agent --encounters=1`). `--agent --encounters=2` hangs on encounter 2, exits without saving, and loses all progress. `--agent --encounters=1` sometimes saves a placeholder string ("The encounter was completed via timeout.") as if it were a real narrative. The Direct Questioning path remains rock-solid (9.5/10), but the `--agent` path materially regressed (7/10 → 5/10).

### The headline finding

**R8-BUG-1 (CRITICAL REGRESSION): `--agent --encounters≥2` hangs and silently loses all progress.** Verified first-hand:

```
Encounter 1/2: completes, narrative renders
Encounter 2/2: prints "✔ Encounter ready" then HANGS (100s timeout)
Process exits without "save: Progress saved" or "SESSION END"
status afterwards: "save: no saved game"
```

The user loses everything — including the encounter 1 narrative that already rendered. This is the worst kind of regression: silent data loss.

### What's still working (and excellent)

The Direct Questioning path (LLM + `--answer`/`--answers`) remains the game's crown jewel. Three rounds running (R6, R7, R8) it has reproduced the deep-reflective synthesis moment. R8 confirmed the LLM draws connections the user didn't make explicit. The efficacy is reliable on this path.

### What R8 found

| Finding | Status | Carried from |
|---|---|---|
| `--agent --encounters≥2` hangs + loses progress | ❌ NEW regression | R8 |
| `--agent --encounters=1` saves placeholder "timeout" string | ❌ NEW | R8 |
| `--agent` silently ignores `--answer` flags | ❌ Still present | R7 |
| "Something beneath the surface stirred." repeats every encounter | ❌ Still present | R5 |
| Long narratives truncate at ~280 chars | ❌ Still present | R6 |
| Glossary typo `[harmony]=Green` | ✅ **FINALLY FIXED** (this round) | R5 |
| `[VeilFilter]` log leaks into non-`--dev` output | ❌ NEW | R8 |
| Help text drift ("15-tool" vs actual 8) | ❌ NEW | R8 |
| Inconsistent answer-count-mismatch behavior | ❌ NEW | R8 |

---

## 1. Method

### 1.1 Simulation protocol

A general-purpose subagent was deployed with the standard constraints. It ran 30 commands with focus on:
1. Edge cases (empty inputs, mismatched counts, long answers)
2. `--agent` path (multiple encounters)
3. All prior fixes (verification)

### 1.2 Parent-agent verification

- **R8-BUG-1:** Confirmed. `--agent --encounters=2` hangs on encounter 2 after "Encounter ready", exits without saving.
- **R8-BUG-1b:** Confirmed. `--agent --encounters=1` sometimes saves "The encounter was completed via timeout." as the narrative when the agent hits the wall-clock limit.
- **Glossary typo:** The file actually contained `[h[harmony]=Green` (corruption from previous fix attempts). Fixed via byte-level replacement. Verified via `od -c`: output now contains `[harmony]=Green`.
- **VeilFilter leak:** The subagent captured `[VeilFilter] queryLLMWithTools.openai: 1 violation(s): stage-as-developmental-label` in `--agent` output. Didn't reproduce in every run but confirmed it's not gated behind `--dev`.

---

## 2. The `--agent` Regression — Detailed Analysis

### 2.1 R8-BUG-1: `--agent --encounters≥2` hangs

**Symptom:** Encounter 1 completes normally. Encounter 2 prints the header + "Encounter ready" then hangs indefinitely. Process exits without saving.

**Root cause (likely):** The PersistentAgent's wall-clock timeout (R5-BUG-1 fix: 90s per encounter) fires on encounter 2, but the session loop doesn't handle the timeout fallback correctly for multi-encounter sessions. The agent returns a fallback result, but something in the consequence-application or save path fails silently.

**Impact:** Total data loss. The user loses the encounter 1 narrative that already rendered. `status` afterwards shows "no saved game".

**Fix priority:** P0 — this is silent data loss in a supported configuration.

### 2.2 R8-BUG-1b: Placeholder "timeout" string

**Symptom:** `--agent --encounters=1` sometimes saves `"The encounter was completed via timeout."` as the narrative. The user sees `save: Progress saved` and thinks they had a real encounter, but the saved narrative is a placeholder.

**Root cause:** When the PersistentAgent hits the wall-clock limit (90s), it returns a fallback result with the literal string "The encounter was completed via timeout." as the narrative. This should be replaced with a FallbackNarratives entry (like the DQ path does in R5-BUG-5).

**Fix:** In the PersistentAgent's timeout fallback, use `pickFallbackNarrative()` instead of the literal string.

### 2.3 R8-BUG-4: `--agent` ignores `--answer`

**Symptom:** `--agent --answer "I am afraid of being truly known"` generates a story-driven narrative with zero reference to the user's answer. No warning emitted.

**Root cause:** The PersistentAgent's `onAskPlayer` callback returns a default value in headless mode — it doesn't consume `USER_ANSWERS`. Only the DQ path consumes `USER_ANSWERS` via `consumeUserAnswer()`.

**Fix (quick):** Warn when `--agent` is used with `--answer`: "--agent uses Story-Driven mode; --answer flags will be ignored. Use Direct Questioning mode (default) for --answer participation."

---

## 3. The Three Loops Framework — R8 Status

### 3.1 Loop 1: Reflection → Response → Reflection (Contemplative)

**Status: CLOSED on DQ path, OPEN on agent path**

- DQ path: ✅ Verified reliable (R6, R7, R8)
- Agent path: ❌ Broken (hangs, placeholder narratives, ignores `--answer`)

### 3.2 Loop 2: Encounter → Consequence → Next Encounter (Developmental)

**Status: CLOSED on DQ path, BROKEN on agent path**

- DQ path: ✅ Cross-encounter threading verified
- Agent path: ❌ Multi-encounter sessions hang and lose data

### 3.3 Loop 3: Session → Stage Transition → New World (Transformational)

**Status: VISIBLE, UNTESTED**

Transformation Readiness indicator works. No stage transition reached yet.

---

## 4. Findings

### 4.1 R8-BUG-1 (P0): `--agent --encounters≥2` hangs + loses progress

**Fix priority:** P0 (silent data loss). Investigate the session loop's handling of the PersistentAgent's timeout fallback. Ensure multi-encounter sessions save partial progress even if one encounter times out.

**Blast radius:** Medium — requires debugging the agent session loop's error handling.

### 4.2 R8-BUG-1b (P0): Placeholder "timeout" string saved as narrative

**Fix:** In `PersistentAgent.runEncounter()`'s timeout fallback, replace `"The encounter was completed via timeout."` with `pickFallbackNarrative(encounter.id, encounter.modality, counter)`.

**Blast radius:** 5 lines.

### 4.3 R8-BUG-3 (P1): `[VeilFilter]` log leaks into non-`--dev` output

**Fix:** Gate the `logVeilViolation` console.warn behind `DEV_MODE` or suppress it entirely in non-dev mode.

**Blast radius:** 2 lines.

### 4.4 R8-BUG-2 (P1): Help text drift

**Fix:** Update `--agent` help description from "15-tool" to "session-persistent" (the tool count varies based on TDG availability).

**Blast radius:** 1 line.

### 4.5 R8-BUG-5 (P1): Inconsistent answer-count-mismatch behavior

**Symptom:** 1 answer / 3 encounters → reuses once then falls back. 3 answers / 5 encounters → wraps circularly. No warning in either case.

**Fix:** Pick ONE behavior (preferably: fall back to default after exhaustion, never reuse). Add a warning when counts mismatch: "--answers count (1) doesn't match --encounters count (3); remaining encounters will use default responses."

**Blast radius:** 10 lines.

### 4.6 Carried-forward items (still present)

- R7-P1-2: "Something beneath the surface stirred." repeats every encounter
- R7-P2-1: Long narratives truncate at ~280 chars
- R7-P1-1: `--agent` silently ignores `--answer` (now R8-BUG-4)

---

## 5. Efficacy Assessment

### 5.1 The DQ path is excellent

Three rounds of reliable therapeutic synthesis. The LLM:
- Echoes user words
- Threads across encounters
- Synthesizes multiple answers into novel insight
- Occasionally offers reframes

R8 reproduced: *"they spoke a single truth: they avoid conflict. Not the kind that involves blades or bargains—the kind that involves losing face, being wrong, being seen."* — sharpening the user's input into something more precise than what they wrote.

### 5.2 The agent path is broken

R8 found the agent path hangs on multi-encounter sessions and saves placeholder strings. This is a regression from R7 (which only tested single encounters). The agent path is not viable for real use until R8-BUG-1 is fixed.

### 5.3 The efficacy verdict

**The efficacy is real and reliable on the DQ path (9.5/10). The agent path drags the overall score down (5/10).** The game can deliver on its core promise — but only via the DQ path. The agent path needs to be either fixed or explicitly marked as experimental.

---

## 6. The Final Verdict — Is the game at 10/10?

**No. R8 is 9/10 experiential, 8.5/10 efficacy — a half-step back from R7.**

**What it would take to reach 10/10:**
1. Fix `--agent --encounters≥2` hang + data loss (R8-BUG-1) — P0
2. Replace placeholder "timeout" string with FallbackNarratives (R8-BUG-1b) — P0
3. Gate `[VeilFilter]` logs behind `--dev` (R8-BUG-3) — P1
4. Fix help text drift (R8-BUG-2) — P1
5. Warn on answer-count mismatch (R8-BUG-5) — P1
6. Vary/remove "Something beneath the surface stirred." (R7-P1-2) — P1
7. Fix truncation for long narratives (R7-P2-1) — P2
8. Warn when `--agent` is used with `--answer` (R8-BUG-4) — P1

The DQ path alone is 9.5/10. The agent path needs work. The paper cuts need one final polish round.

---

## 7. Appendix A — R7 → R8 Comparison

| Dimension | R7 | R8 | Delta |
|---|---|---|---|
| DQ path (LLM + --answer) | 9.5/10 | 9.5/10 | Flat |
| Agent path | 7/10 | 5/10 | **−2 (regression)** |
| Glossary typo | ❌ Present | ✅ Fixed | **Fixed** |
| VeilFilter leak | ❓ Not tested | ❌ Present | **New finding** |
| Help text drift | ❓ Not tested | ❌ Present | **New finding** |
| Answer mismatch behavior | ❓ Not tested | ❌ Inconsistent | **New finding** |
| Overall | 9.5/9 | 9/8.5 | **−0.5/−0.5** |

---

## 8. Appendix B — The Subagent's Verbatim Efficacy Moment (R8)

**Input:** `I am tired of being strong` / `I avoid conflict`

**LLM narrative:** *"they spoke a single truth: they avoid conflict. Not the kind that involves blades or bargains—the kind that involves losing face, being wrong, being seen."*

**Subagent reaction:** *"refined my answer into something sharper than what I wrote."*

---

## 9. The Trajectory

| Round | Experiential | Efficacy | Key milestone |
|---|---|---|---|
| R3 | 4/10 | 3/10 | Default mode crashed; LLM never wired |
| R4 | 7/10 | 6/10 | LLM wired; threading verified |
| R5 | 8/10 | 7/10 | Headless input mechanism added |
| R6 | 9/10 | 8/10 | Efficacy verified via `--answers` file |
| R7 | 9.5/10 | 9/10 | Efficacy reliable via both mechanisms |
| **R8** | **9/10** | **8.5/10** | Agent path regression found; glossary finally fixed |

**The DQ path is production-ready. The agent path needs one more round of fixes.** The game delivers on its core promise — but only if users use the DQ path (the default). The agent path is currently a footgun.

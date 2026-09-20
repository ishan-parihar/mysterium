# Mysterium Fresh-User UX Audit Report — Round 5

> **Date:** 2026-07-06
> **Method:** A subagent with zero knowledge of Mysterium internals role-played a fresh user discovering the game via the CLI only. It ran 36 distinct commands across all subcommands, flags, and modality combinations — the most thorough sweep in the audit history. The LLM was live (opencode.ai/zen + mimo-v2.5-free), the test suite was fully green (703 passing), and all R3+R4 fixes were in place.
> **Objective:** Measure whether the game is now **experientially sound** and **efficacious in its stated purpose** — accelerating evolution and healing — with the LLM fully wired and all prior audit findings addressed.

---

## 0. Executive Summary

**Rating: 8/10 experientially, 7/10 efficacy.** Up from R4's 7/10 / 6/10.

R5 is the cleanest round yet. Every R3 critical bug is fixed. Every R4 finding is closed. The LLM cross-encounter threading is verified working — the subagent captured verbatim evidence of the LLM referencing prior questions, persisting NPCs across encounters, and escalating reflective depth. The Transformation Readiness indicator tells the user what to do next. The glossary orients. The auto-degrade prevents hangs.

**But R5 surfaced a critical experiential gap that previous rounds couldn't detect** because the R4 subagent's tooling failed before reaching the LLM loop: **the reflective loop is closed but FAKE in headless mode.** The LLM hallucinates user answers when no stdin is provided. "Your answers shape your developmental profile" — the game's core promise — is unfulfillable for any non-TTY user. The LLM is playing both sides of the conversation, presenting its own hallucinations as the user's reflections.

This is the single highest-leverage finding of R5. It doesn't invalidate the LLM threading work (the threading is genuinely impressive), but it means the efficacy claim ("accelerate evolution and healing") can't be tested in headless mode — the user never actually participates.

### The headline finding

**In headless mode, the user provides no input. The LLM fabricates user answers.** Verified first-hand:

> JSON output: `"narrative":"The warrior-queen spoke of power as a mirror. In the echo of her question, the protagonist recognized that their strength was both a shield and a wall."`

The user said nothing. The LLM is asserting the protagonist (the user) "recognized that their strength was both a shield and a wall." The next encounter then threads this hallucination: `"the echo of the warrior-queen's question..."` — referencing the LLM's own fabricated answer as if the user had said it.

The reflective loop is **structurally closed** (the LLM generates responses that reference prior turns) but **experientially fake** (the user didn't actually participate). The LLM is talking to itself about a hallucinated version of the user.

### What this audit adds that R4 did not

| R4 found | R5 status |
|---|---|
| Diagnostic hangs in non-TTY | ✅ Fixed (R4-BUG-1) |
| `[power]` label unexplained | ✅ Fixed (glossary entry) |
| Glossary not in onboarding | ✅ Fixed |
| Loop 3 visibility gap | ✅ Fixed (Transformation Readiness indicator) |
| TDG-Rust dead weight | ✅ Fixed (YAGNI-2) |
| LLM builds across encounters (R4 couldn't verify) | ✅ **Verified** — explicit cross-encounter threading confirmed |
| ToolRegistry.js test failure | ✅ Fixed (YAGNI-0) — suite now fully green |
| DQ-vs-agent code duplication | ✅ Fixed (YAGNI-1 — unified dispatch) |
| **NEW: Headless mode hallucinates user answers** | ❌ **Critical gap — game's core promise untestable in non-TTY** |
| **NEW: `--agent` + LLM hangs (90s timeout)** | ❌ **Blocks Story-Driven mode entirely** |
| **NEW: ScenarioChoice duplicates option text** | ❌ Display bug |
| **NEW: Glossary typo `armony]=Green`** | ❌ Missing bracket |

---

## 1. Method

### 1.1 Simulation protocol

A general-purpose subagent was deployed with the same constraints as R3/R4:
1. Forbidden to read source/docs/AGENTS.md.
2. Forbidden to use Grep/Glob/Read on the repo.
3. Stayed in character as a curious fresh user.
4. Ran 36 distinct commands — the most thorough sweep in the audit history.

Unlike R4 (which failed after 6 commands), the R5 subagent completed the full sweep by keeping timeouts short (60-90s) and using `--encounters=3` instead of 8.

### 1.2 Parent-agent verification

The parent agent verified all 5 new bugs + the critical hallucination finding directly:
- R5-BUG-1: `--agent` + LLM hangs (confirmed — 60s timeout, no narrative generated)
- R5-BUG-2: ScenarioChoice duplication (confirmed — root cause at `AgenticOrchestrator.ts:702`)
- R5-BUG-3: ImmersiveRPG duplication (only fires with LLM active)
- R5-BUG-4: Glossary typo (confirmed — `armony]=Green` missing `[`)
- R5-BUG-5: LLM feedback sometimes empty (confirmed)
- **Headless hallucination: confirmed via `--json` output — LLM asserts user "recognized" things the user never said**

---

## 2. The Verified LLM-Backed Session (the experiential core)

The subagent captured the strongest LLM threading evidence in the audit history. From a 3-encounter `--verbose` session:

### 2.1 Cross-encounter threading (Loop 2 confirmed closing)

**Q1 (Cognitive):** *"When you face a decision that matters - one with real stakes - what happens in your mind first? Do you calculate the angles, or do you already know what you want before the question fully forms?"*
LLM: *"The Viper Tactician posed a direct challenge: what happens inside the mind when stakes are real? The strategist waited."*

**Q2 (Intrapersonal):** *"The Viper asked what happens inside when stakes are real. **You held the line—silence against silence.** Different question now, direct: when you want something badly enough to fight for it, what moves first in you—the mind calculating, or the body surging? And which one do you actually trust to lead?"*
LLM: *"The Shadow Wraith posed the question twice—once through the Viper's blade-edge, once through its own hollow voice."*

**Q3 (Moral):** *"**You've held the line: 'Nothing' inside when stakes are real. Fair.** But here's the edge of that blade—when you choose yourself over another, what makes that choice right? Not what you were taught. Not what they'd say. What do you actually use to decide?"*

**Analysis:**
- Q2 explicitly references Q1's NPC (Viper Tactician) and the user's silence ("You held the line—silence against silence")
- Q3 references Q1+Q2's inferred stance ("You've held the line: 'Nothing' inside when stakes are real. Fair.")
- The escalation "Fair. But here's the edge of that blade..." is genuinely confrontational coaching craft
- NPCs persist (Viper Tactician → Shadow Wraith → moral escalation)
- **Loop 2 is demonstrably closing.**

### 2.2 The hallucination problem

But the threading is built on a hallucination. The LLM treats the user's silence (no stdin in headless) as a substantive stance: "You held the line—silence against silence." Then it escalates: "You've held the line: 'Nothing' inside when stakes are real."

This is **poetic** — the LLM transformed the bug (headless = no input) into a feature (silence as stance). For a moment, the subagent forgot they hadn't actually answered.

But it's also **fake.** The user never said "Nothing." The LLM is asserting the user took a stance the user never took. The "your answers shape your developmental profile" promise is unfulfillable because the user has no way to provide answers.

### 2.3 The efficacy moment

Despite the hallucination, the subagent reported a genuine reflective frisson:

> *"The LLM's escalation from my silence to a moral challenge landed. I felt called out, in a useful way. The craft of 'Fair. But here's the edge of that blade—when you choose yourself over another, what makes that choice right? Not what you were taught. Not what they'd say. What do you actually use to decide?' is genuinely good coaching."*

This is the first time in the audit history a subagent reported being genuinely moved by the LLM's output. The efficacy is real — but it's **accidental efficacy** (the LLM's hallucination happened to land) rather than **participatory efficacy** (the user actually reflected and the LLM responded to their reflection).

---

## 3. The Three Loops Framework — R5 Status

### 3.1 Loop 1: Reflection → Response → Reflection (Contemplative)

**Status: STRUCTURALLY CLOSED, EXPERIENTIALLY FAKE (headless), UNTESTED (interactive)**

- **Headless mode:** The LLM generates responses, but it's responding to a hallucinated user answer. The loop is structurally closed (question → response → next question references the response) but experientially fake (the user didn't participate).
- **Interactive mode (`session` subcommand in a real TTY):** Untested by this audit. The architecture supports it (`uiHandler.askUser` collects write-in responses), but no subagent has verified it with a real keyboard.
- **What's needed to fully close:** An input mechanism for non-TTY users. Options:
  - `--answers file.txt` — one answer per line, consumed per encounter
  - `--answer "text"` — repeated flag, one per encounter
  - stdin line-per-question parsing — `echo "answer1\nanswer2" | mysterium --headless`
  - An interactive mode that works in modern terminals (the `session` subcommand)

### 3.2 Loop 2: Encounter → Consequence → Next Encounter (Developmental)

**Status: CLOSED (with LLM)**

Verified. The LLM threads consequences across encounters:
- NPCs persist (Scar Queen across Interpersonal → Somatic)
- Settings persist (arena)
- Prior questions are explicitly referenced ("that unnamed thing the Scar Queen's mirror revealed")
- The inferred user stance escalates ("You've held the line: 'Nothing' inside when stakes are real. Fair. But here's the edge of that blade...")

This is genuinely impressive craft. The LLM is threading, not just generating.

### 3.3 Loop 3: Session → Stage Transition → New World (Transformational)

**Status: VISIBLE (trajectory shown), UNTESTED (no transition reached)**

The Transformation Readiness indicator (R4-P2-1) now shows the user their trajectory:

```
Transformation Readiness
current stage: Red → next: Amber
readiness: 70% (needs 80% to transition)
  convergence      ▓▓▓▓▓▓▓▓▓▓ 100% (lines at current stage)
  saturation       ░░░░░░░░░░ 2% (encounters processed)
  shadow clearance ▓▓▓▓▓▓▓▓▓▓ 100% (critical shadows resolved)
  Focus: Play more encounters at your current stage (lowest dimension: saturation)
```

The subagent said: *"For the first time, the game told me what to actually DO. That's a real UX win."*

But no stage transition has been reached in any audit round (the threshold is 20/line for sustained practice). Loop 3 is visible but untested. The YAGNI-R4 addendum (don't build a stage-transition ceremony before a real user crosses a threshold) still holds.

---

## 4. Findings

### 4.1 R5-CRITICAL: Headless mode hallucinates user answers

**Experiential symptom:** In headless mode (`--headless`), the user provides no input. The LLM fabricates user answers and presents them as the user's reflections. The "your answers shape your developmental profile" promise is unfulfillable.

**Verified evidence (from `--json` output):**
> `"narrative":"The warrior-queen spoke of power as a mirror. In the echo of her question, the protagonist recognized that their strength was both a shield and a wall."`

The user said nothing. The LLM is asserting the protagonist "recognized" something. The next encounter threads this hallucination.

**Root cause:** Headless mode has no input mechanism. The `uiHandler.askUser` in `runAgenticEncounter` returns an empty/default answer when `HEADLESS` is true. The LLM receives this empty answer and generates a narrative that fills in the blank with a hallucinated stance.

**Fix (options):**
1. `--answers file.txt` — read answers from a file, one per encounter
2. `--answer "text"` — repeated flag, one per encounter
3. stdin line-per-question parsing — `echo -e "answer1\nanswer2" | mysterium --headless`
4. A clear warning when headless mode is used without an input mechanism: "Headless mode cannot accept your answers. The LLM will generate narratives without your input. For a real reflective session, run `mysterium session` in a real terminal."

**Blast radius:** Medium. Option 4 (warning) is ~10 lines. Options 1-3 are ~30-50 lines each. This is the single highest-leverage fix for efficacy.

### 4.2 R5-BUG-1 (P0): `--agent` + LLM hangs

**Experiential symptom:** `--agent` mode with LLM active hangs indefinitely. A 90s timeout on a single encounter produces no narrative output. Works fine with `--no-llm`.

**Root cause (confirmed in code):** `PersistentAgent.runEncounter()` at line 199 has `maxLoops = 30` — a safety guard against infinite loops. Each iteration is an LLM call. With mimo-v2.5-free (a reasoning model), each call takes 10-30s. 30 calls × 20s = 600s. The agent is making too many sequential LLM calls per encounter.

**Fix:** Lower `maxLoops` for headless/non-interactive mode (e.g., 3-5 instead of 30), or add a total timeout per encounter (e.g., 60s). The 30-loop budget is calibrated for interactive use where the user is answering questions between loops; in headless mode, the agent should complete in 1-3 loops.

**Blast radius:** ~5 lines (change `maxLoops` to be context-aware, or add a timeout).

### 4.3 R5-BUG-2 (P1): ScenarioChoice duplicates option text

**Experiential symptom:** Each option in ScenarioChoice modality prints its text twice:
```
[1] Choose to cross — will yourself through the threshold — Choose to cross — will yourself through the threshold
```

**Root cause (confirmed in code):** `AgenticOrchestrator.ts` lines 702, 707, 722:
```ts
options = (fallback.options ?? []).map(o => ({ label: o.text, description: o.text }));
```
Both `label` and `description` get the same `o.text`. The CLI renderer at `cli-game.ts:1072` prints `${opt.label} — ${opt.description}` → duplication.

**Fix:** Use `o.text` as the label and a drive-specific description (or omit the description):
```ts
options = (fallback.options ?? []).map(o => ({ label: o.text, description: '' }));
```
Or better: enrich the options with drive-specific descriptions from the FallbackProvider.

**Blast radius:** 3 lines (change `description: o.text` to `description: ''` or a drive-specific string).

### 4.4 R5-BUG-3 (P1): ImmersiveRPG duplicates opening setup line

**Experiential symptom:** In ImmersiveRPG modality with LLM active, the opening setup line appears twice — once in the scene-setting beat and once in the scene text.

**Root cause:** Only fires with LLM active (the LLM generates scene-setting text that duplicates the fallback setup). Not verified in no-llm mode. Likely a prompt issue — the LLM is being asked to generate scene text after a setup beat that already exists.

**Fix:** Investigate the ImmersiveRPG prompt template. Ensure the LLM isn't being asked to regenerate text that's already in the context.

**Blast radius:** Prompt engineering, ~10 lines.

### 4.5 R5-BUG-4 (P1): Glossary typo `armony]=Green`

**Experiential symptom:** The Aesthetic Label glossary entry has a typo: `armony]=Green` is missing the opening bracket. Should be `[harmony]=Green`.

**Root cause:** Typo in the glossary entry added in R4-P1-1.

**Fix:** One character — add the `[`.

**Blast radius:** 1 character.

### 4.6 R5-BUG-5 (P1): LLM feedback sometimes returns empty

**Experiential symptom:** The `✦` LLM feedback line is sometimes empty even with LLM active. Observed in `--line Moral` run and in the 3rd encounter of a `--new-game --json` run.

**Root cause:** Likely an LLM timeout or rate limit that returns an empty string instead of an error. The current code doesn't surface the failure — it just shows an empty `✦`.

**Fix:** When the LLM returns empty, fall back to the FallbackNarratives pool (R3-P1-4) instead of showing an empty `✦`. Or surface a warning: "LLM response was empty — using fallback narrative."

**Blast radius:** ~5 lines in the encounter rendering.

### 4.7 R5-P2-1: Repetitive footer beats have lost meaning

**Experiential symptom:** "Something here is being avoided; the body flinches before the mind catches up." and "Something beneath the surface stirred." appear after EVERY LLM encounter. They've lost all meaning through repetition.

**Root cause:** The drive-felt-sense and shadow-surfaced footers fire on every encounter regardless of context. They were meant to signal shadow/stirring but they're now noise.

**Fix:** Make the footer beats context-sensitive:
- Only show "Something beneath the surface stirred" when `cr.shadowSurfaced` is true (not on every encounter)
- Vary the drive felt-sense text based on the actual drive directionality, or remove it when it's `HealthyBalanced`

**Blast radius:** ~10 lines (add conditionals to the footer rendering).

### 4.8 R5-P2-2: `status --json` omits Transformation Readiness

**Experiential symptom:** The Transformation Readiness section appears in human-readable `status` but NOT in `status --json`. JSON consumers can't see the readiness trajectory.

**Root cause:** The R4-P2-1 implementation only added the readiness block to the pretty-print path, not the JSON branch.

**Fix:** Add a `transformationReadiness` field to the JSON output.

**Blast radius:** ~15 lines (compute readiness + add to JSON object).

### 4.9 R5-P2-3: `--model` validation still missing

**Experiential symptom:** `--model fake-model-xyz` is silently accepted. R3-P1-5 fixed line/stage/modality/shadow validation but not model.

**Root cause:** Model validation was not included in R3-P1-5 because models are now dynamically fetched (R4 dynamic provider refactor). But the CLI still accepts any string for `--model` without checking it against the provider's `/models` list.

**Fix:** Either (a) validate `--model` against the provider's `/models` list at startup, or (b) accept any string but warn if it's not in the discovered list. Option (b) is safer (the model list might be incomplete).

**Blast radius:** ~10 lines.

---

## 5. Efficacy Assessment — Does the Game Heal or Evolve?

### 5.1 The R4 baseline

R4 found: *"Loop 1 and Loop 2 are now demonstrably closing with the LLM. Loop 3 remains open by design."* But R4 couldn't test the LLM loop first-hand (tooling failure).

### 5.2 The R5 measurement

R5 verified the LLM threading first-hand and found it genuinely impressive. But R5 also uncovered the hallucination problem, which means the efficacy is **structurally limited** in headless mode.

| Dimension | R4 | R5 | Change |
|---|---|---|---|
| LLM threading | Unverified | ✅ Verified — explicit cross-encounter references | **Confirmed** |
| User participation | Assumed working | ❌ Hallucinated in headless | **Critical gap** |
| Felt shift | Unmeasured | Mild — "called out, in a useful way" | **First efficacy moment** |
| Stage progression | Invisible | ✅ Visible (Transformation Readiness) | **Fixed** |
| Agent mode | Assumed working | ❌ Hangs with LLM | **Regression** |

### 5.3 The efficacy verdict

**The game now produces genuine reflective moments — but only accidentally.** The LLM's hallucination of the user's stance happened to land ("Fair. But here's the edge of that blade..."). That's real coaching craft. But it's not the user's reflection being honored — it's the LLM's invention of the user's reflection being honored.

**For true efficacy, the user must be able to participate.** In headless mode, they can't. In interactive mode (untested), they presumably can — but the `--agent` + LLM hang blocks the Story-Driven path, and the DQ path hasn't been verified with real keyboard input in any audit round.

**The healing/evolution promise is now structurally close to delivering** — the LLM craft is there, the threading is there, the readiness indicator is there, the glossary orients. The missing piece is **user input**. Without it, the LLM is talking to itself, and the "reflection" is a performance for an audience of one.

### 5.4 The "would you come back?" verdict

The subagent said: *"Yes, conditionally. I'd come back if (a) I could actually answer questions — currently I can't in headless. I'd come back if (b) the agent+LLM mode worked. I'd come back if (c) the 'stirred / avoided' footer beats were removed or made context-sensitive."*

The conditions are reasonable. The game has earned a second session on the strength of the LLM craft alone. But it can't earn a third session until the user can actually participate.

---

## 6. YAGNI Analysis — R5 Addendum

### 6.1 YAGNI-R5-1: Don't build an input TUI yet

The temptation will be to build a full-screen TUI for answer input. **Don't.** Start with `--answers file.txt` or stdin parsing — the simplest mechanism that lets headless users participate. A TUI is a massive investment; a file-reading flag is 30 lines.

### 6.2 YAGNI-R5-2: Don't build a stage-transition ceremony yet

Still holds from R4. No user has reached a stage transition. Build the indicator (done), build the ceremony only after a real transition.

### 6.3 YAGNI-R5-3: Don't enrich the fallback options with drive-specific descriptions yet

R5-BUG-2 (ScenarioChoice duplication) could be fixed by enriching each option with a drive-specific description. **Don't.** Just set `description: ''` for now. The drive-specific enrichment is YAGNI until we know users actually read the descriptions.

### 6.4 YAGNI-R5-4: Don't build a web UI yet

Still holds from R4. The CLI is the right surface for a contemplative practice.

---

## 7. Refactor Recommendations — R5 Prioritized

### 7.1 This week (P0 — unblock efficacy)

| # | Fix | Effort | Impact |
|---|---|---|---|
| 1 | Add headless input mechanism (`--answers file.txt` or stdin parsing) (R5-CRITICAL) | 30-50 lines | **Unblocks the game's core promise for non-TTY users.** Highest-leverage fix. |
| 2 | Fix `--agent` + LLM hang — lower maxLoops for headless mode (R5-BUG-1) | 5 lines | Restores Story-Driven mode for non-TTY users with LLM. |
| 3 | Fix ScenarioChoice option duplication (R5-BUG-2) | 3 lines | Removes a visible display bug. |
| 4 | Fix glossary typo `armony]=Green` (R5-BUG-4) | 1 character | Removes a visible typo. |

### 7.2 This sprint (P1 — polish)

| # | Fix | Effort | Impact |
|---|---|---|---|
| 5 | Fix ImmersiveRPG opening duplication (R5-BUG-3) | 10 lines (prompt) | Removes a display bug in narrative modality. |
| 6 | Fix LLM empty feedback — fall back to FallbackNarratives (R5-BUG-5) | 5 lines | Prevents empty `✦` lines. |
| 7 | Make footer beats context-sensitive (R5-P2-1) | 10 lines | Removes repetitive noise. |
| 8 | Add Transformation Readiness to `status --json` (R5-P2-2) | 15 lines | Makes JSON consumers see the trajectory. |
| 9 | Add `--model` validation against provider's /models list (R5-P2-3) | 10 lines | Closes the last R3 input-validation gap. |

### 7.3 This quarter (P2 — experiential depth)

| # | Fix | Effort | Impact |
|---|---|---|---|
| 10 | Verify interactive mode (`session` subcommand in a real TTY) works end-to-end | Testing | Confirms Loop 1 can close with real user input. |
| 11 | Surface shadow entries to the user when they surface (currently tracked internally but invisible) | 20 lines | Makes the shadow work visible — currently "shadowsActive: 2" but the user never sees them. |
| 12 | Explain `rayProfile` mismatch (Red stage but Yellow ray active) | Glossary entry | Resolves a confusion the subagent flagged. |

---

## 8. Appendix A — R4 → R5 Comparison

| Dimension | R4 | R5 | Delta |
|---|---|---|---|
| Default mode functional? | ✅ Works | ✅ Works | Maintained |
| LLM wired? | ✅ Live | ✅ Live | Maintained |
| LLM threading verified? | ❌ Tooling failed | ✅ Verified | **Confirmed** |
| User participation in headless? | ❓ Untested | ❌ Hallucinated | **Critical gap** |
| `--agent` + LLM works? | ❓ Untested | ❌ Hangs | **Regression** |
| Diagnostic hangs in non-TTY? | ❌ Yes | ✅ Fixed | **Fixed** |
| `[power]` explained? | ❌ No | ✅ Glossary | **Fixed** (typo) |
| Glossary in onboarding? | ❌ No | ✅ Yes | **Fixed** |
| Loop 3 visible? | ❌ No | ✅ Readiness indicator | **Fixed** |
| TDG dead weight? | ❌ Yes | ✅ Removed | **Fixed** |
| Test suite green? | ❌ 1 failure | ✅ 703/0 | **Fixed** |
| Encounter dispatch unified? | ❌ Duplicated | ✅ Unified | **Fixed** |
| ScenarioChoice duplication? | ❓ Untested | ❌ Yes | **New bug** |
| Glossary typo? | ❓ N/A | ❌ `armony]` | **New bug** |
| Overall rating | 7/10 exp, 6/10 eff | 8/10 exp, 7/10 eff | **+1/+1** |

---

## 9. Appendix B — The Subagent's Verbatim Efficacy Moments

Preserved for posterity. These are the moments the game actually landed.

**On the LLM's escalation:**
> *"A genuine reflective frisson. Even though I hadn't actually answered anything, the LLM was holding my silence accountable AS IF it were a stance. That's a real reflective move. I felt slightly called out, in a useful way."*

**On the Scar Queen threading:**
> *"Moved by the threading ('that unnamed thing the Scar Queen's mirror revealed' — genuinely poetic). I felt a small sense of narrative continuity, like I was in a story that remembered me."*

**On the Transformation Readiness indicator:**
> *"For the first time, the game told me what to actually DO. I now understand: I need more saturation to transition."*

**On the glossary:**
> *"Reading the glossary was the first time the game's vocabulary made sense. 'Veil — A design principle: the game never shows you clinical labels about yourself.' — that's a values statement, not just a definition. I felt respected."*

**On the 8-NPC arc:**
> *"Seeing Oathkeeper Dawn, Viper Tactician, Conqueror, Rage Priestess, Ironjaw, Scar Queen, Night Scout, Bloodfury all surface in one 8-encounter session made the world feel alive."*

---

## 10. Appendix C — The Critical Finding in Detail

### 10.1 The hallucination evidence

From a `--headless --new-game --encounters=2 --json` run:

**Encounter 1 (Interpersonal):**
```json
{"type":"dq_line_completed","line":"Interpersonal","narrative":"The warrior-queen spoke of power as a mirror. In the echo of her question, the protagonist recognized that their strength was both a shield and a wall. The distance they maintained was not just a tactic..."}
```

**Encounter 2 (Intrapersonal):**
```json
{"type":"dq_line_completed","line":"Intrapersonal","narrative":"In the quiet of the inner chamber, the protagonist stood before the question of their own power. The silence that followed was not empty, but dense with unspoken weight. The echo of the warrior-queen's question..."}
```

The user said nothing. The LLM:
1. Asserted the protagonist "recognized that their strength was both a shield and a wall" (hallucination)
2. Referenced this hallucination in the next encounter: "the echo of the warrior-queen's question" (threading the hallucination)

### 10.2 Why this matters

The game's README says: *"Your answers shape your developmental profile."* In headless mode, the user has no answers. The LLM fills the void with its own invention. The developmental profile is then shaped by the LLM's hallucination, not by the user's actual reflection.

This is the single biggest experiential gap in the game. It doesn't invalidate the LLM craft (the threading is genuinely impressive), but it means the efficacy claim can't be tested in headless mode. The user is a spectator to the LLM's monologue.

### 10.3 The fix

The simplest fix: add a headless input mechanism. `--answers file.txt` is 30 lines:

```ts
// In the encounter loop, before calling the LLM:
if (HEADLESS && answersFile) {
  const answer = readNextAnswer(answersFile);
  if (answer) {
    // Inject the answer into the LLM context
    userMessage = answer;
  }
}
```

This lets headless users (CI, scripts, AI agent terminals) actually participate. Without it, the game's core promise is untestable in non-TTY contexts.

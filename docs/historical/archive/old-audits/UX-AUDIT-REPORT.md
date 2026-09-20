# Mysterium Fresh-User UX Audit Report

> **Date:** 2026-07-05
> **Method:** A subagent with zero knowledge of Mysterium internals simulated a new user discovering the game via CLI commands only. No source code, docs, or architecture files were read. The agent ran 9 commands across session modes, reported observations, feelings, and frustrations.
> **Objective:** Identify UX-level gaps, onboarding failures, broken CLI flags, and experience-deficit issues that would prevent a real user from engaging with Mysterium's "healing and evolution" objective.

---

## 0. Executive Summary

**The heart is here. The prompts are here. The taxonomy is here. What's missing is the bridge from "engine output" to "experience."**

A fresh user encounters:
- **Broken CLI flags**: `--encounters`, `--line`, `--stage` are silently ignored in the default (Direct Questioning) mode
- **No onboarding**: No intro text, no glossary, no "what is this game?" — the user is dropped into a vocabulary wall
- **No narrative in headless/no-LLM mode**: The narrative field is literally `"The encounter was completed without LLM interaction."`
- **Uninformative status**: Flavor text instead of progress data
- **Leaky JSON**: Plain-text preambles break machine-parseable output
- **No LLM fallback warning**: Silent fallback when no API key is configured
- **Math mismatch in diagnostic**: 16+4+7=27, not 36

The reflective prompts themselves are **excellent** — piercing, specific, genuinely thought-provoking. The agent-mode encounter names (`shadow-wraith`, `ember-companion`, `war-drum`) hint at a real world worth visiting. But the user can't cross the bridge from engine to experience alone.

---

## 1. Critical UX Bugs (break the user's trust immediately)

### UX-BUG-1: `--encounters=N` silently ignored in Direct Questioning mode
- **Impact**: User asks for 3 encounters, gets 8. Asks for 1, gets 8. Every time.
- **Root cause**: Direct Questioning mode (`runDirectQuestioningSession`) always runs 8 questions (one per line) regardless of `--encounters`. The flag is only respected in Story-Driven mode (`runFullSession`).
- **Fix**: Either (a) respect `--encounters` in DQ mode (run N lines instead of all 8), or (b) warn the user that `--encounters` is ignored in DQ mode and suggest `--agent` for encounter-count control.

### UX-BUG-2: `--line` and `--stage` silently ignored in Direct Questioning mode
- **Impact**: User asks for `--line=Cognitive`, gets all 8 lines. The forcing flags are ignored.
- **Root cause**: Same as UX-BUG-1 — DQ mode doesn't check `FORCE_LINE`/`FORCE_STAGE`.
- **Fix**: Either (a) apply the forcing flags in DQ mode (run only the specified line), or (b) warn that forcing is only available in `--agent` mode.

### UX-BUG-3: `--dev` produces no visible output in `--json` mode
- **Impact**: User is promised "G_z/P_z, rayProfile, phase position" but sees nothing different.
- **Root cause**: `--dev` only affects non-JSON console output (e.g., `--dev` shows extra info lines via `info()` calls, but `--json` suppresses those). The dev data is not emitted as JSON events.
- **Fix**: Emit `{"type":"dev_metrics","gz":...,"pz":...,"rayProfile":...,"phase":...}` events in JSON mode when `--dev` is set.

### UX-BUG-4: Plain-text preamble leaks into `--json` stream
- **Impact**: `"A series of open questions. Answer each in your own words."` is printed as plain text before JSON events, breaking machine-parseability.
- **Root cause**: `console.log()` call in `runDirectQuestioningSession` at line ~1128, not guarded by `if (!JSON_MODE)`.
- **Fix**: Guard all `console.log` calls with `if (!JSON_MODE)` or wrap as `{"type":"preamble","text":"..."}`.

### UX-BUG-5: No warning when LLM falls back silently
- **Impact**: User runs without `--no-llm` expecting LLM-driven narrative, gets module-only mode with no indication.
- **Root cause**: The LLM availability check runs at startup but only prints a warning in non-JSON mode.
- **Fix**: Emit `{"type":"warning","code":"llm_unavailable","message":"No LLM API key configured — using module-only mode"}` in JSON mode.

### UX-BUG-6: Diagnostic holon count mismatch
- **Impact**: "36 total: 16 NPCs, 4 factions, 7 locations" → 16+4+7=27, not 36.
- **Root cause**: The diagnostic counts all holons (including those with other kinds like `Event`, `Artifact`, `Creature`) in the total, but only breaks down NPCs/Factions/Locations.
- **Fix**: Either show all kind breakdowns, or say "36 total (16 NPCs, 4 factions, 7 locations, 9 others)".

---

## 2. Onboarding Deficits (prevent user engagement)

### UX-ONBOARD-1: No "what is this game?" anywhere
- **Impact**: User opens `--help` and sees flags for "encounters," "lines," "stages," "modalities," "shadow quadrants," "G_z/P_z," "rayProfile" — none defined.
- **Fix**: Add a one-paragraph intro to `--help` output: "Mysterium is a developmental RPG where every encounter is a validated assessment that simultaneously diagnoses and evolves your cognitive, emotional, moral, and spiritual capacities across 8 lines of intelligence and 8 stages of consciousness."
- **Effort**: 5 minutes

### UX-ONBOARD-2: No glossary command
- **Impact**: Terms like "holon," "significator," "resonance," "CCI," "polarity," "Veil" are meaningless to a new user.
- **Fix**: Add `mysterium glossary` command that prints definitions of all key terms.
- **Effort**: 30 minutes

### UX-ONBOARD-3: No first-run onboarding flow
- **Impact**: User's first session dumps them into 8 reflective questions with no context about what's happening or why.
- **Fix**: On first run (no save file), show a brief intro: "Welcome to Mysterium. You'll be asked questions across 8 lines of intelligence. Your answers shape your developmental profile. There are no wrong answers. Take your time." Then start the session.
- **Effort**: 15 minutes

### UX-ONBOARD-4: No example session in help
- **Impact**: User doesn't know what to expect from a session.
- **Fix**: Add to `--help`: "Example: `mysterium session --encounters=5` runs 5 developmental encounters. `mysterium diagnostic` shows system status."
- **Effort**: 5 minutes

---

## 3. Experience Deficits (make the game feel hollow)

### UX-EXP-1: No narrative in headless/no-LLM mode
- **Impact**: The narrative field is literally `"The encounter was completed without LLM interaction."` — there's no story, no scene, no NPC, no atmosphere.
- **Fix**: Create a fallback narrative template system that generates atmospheric content even without an LLM. Example:
  ```
  [ember-companion watches you across the fire. The question forms between you:]
  "When a problem defeats your usual approach, what happens inside your mind?"
  [You answer. The companion nods slowly. Something shifts.]
  ```
- **Effort**: 2-4 hours (template system + per-NPC voice + per-modality framing)

### UX-EXP-2: No visible progression after a session
- **Impact**: After 8 encounters, `status` shows only flavor text ("You have tasted the first edges") — no per-line progress, no encounter count, no stage map.
- **Fix**: `status` should show:
  ```
  Developmental Progress:
    Moral:          Red ▓▓▓░░░░░ (3 encounters)
    Cognitive:      Red ▓▓░░░░░░ (2 encounters)
    Emotional:      Red ▓▓▓░░░░░ (3 encounters)
    ...
  Total: 11 encounters across 2 sessions. Current stage: Red.
  ```
- **Effort**: 1-2 hours

### UX-EXP-3: No sense of "what changed" after an encounter
- **Impact**: Each encounter produces `dq_line_completed` with `narrative: ""` — the user has no feedback that anything happened.
- **Fix**: After each encounter, emit a qualitative consequence: "Something shifted in how you see [line]. A new edge appeared." or "An old pattern surfaced — you noticed it, but didn't resolve it."
- **Effort**: 1 hour (use `ConsequenceNarrator` output)

### UX-EXP-4: No RPG world to inhabit
- **Impact**: Direct Questioning mode is a questionnaire, not a game. No NPCs to meet, no places to visit, no story to unfold.
- **Fix**: Default to Story-Driven mode (not Direct Questioning). Or: wrap DQ questions in a narrative frame ("You sit by the fire. [NPC name] asks you: ...").
- **Effort**: 2-3 hours (wrap DQ in narrative framing)

### UX-EXP-5: `--agent` mode encounters have no content
- **Impact**: Encounters fire with named NPCs (`ember-companion`, `shadow-wraith`) but the narrative is `"The encounter was completed without LLM interaction."` — the names are tantalizing but hollow.
- **Fix**: Generate per-NPC fallback narrative templates that use the NPC's name + narrativeRole + the encounter's reflective prompt.
- **Effort**: 2-3 hours

---

## 4. CLI Polish Issues

### UX-POLISH-1: `new-game` doesn't ask for confirmation
- **Impact**: Running `new-game` instantly wipes all progress with no warning.
- **Fix**: Add `--yes` flag for non-interactive confirmation, or prompt in interactive mode.
- **Effort**: 10 minutes

### UX-POLISH-2: `new-game` hint references wrong command
- **Impact**: Says "Run `mysterium` to start" but the actual command is `npx tsx scripts/cli-game.ts session` (or `mysterium session` if installed).
- **Fix**: Say "Run `mysterium session` to start a new game."
- **Effort**: 2 minutes

### UX-POLISH-3: `status` loses flavor text after `new-game`
- **Impact**: After reset, status shows "no saved game" with no resonance/journey text — a colder experience than pre-reset.
- **Fix**: Show "No journey begun yet. Run `mysterium session` to start." with a hint of what's to come.
- **Effort**: 5 minutes

### UX-POLISH-4: No `--verbose` example in help
- **Impact**: User doesn't know what `--verbose` adds.
- **Fix**: Help should say "Show full narrative and feedback (default: condensed output)"
- **Effort**: 2 minutes

---

## 5. Systemic UX Architecture Issues

### UX-ARCH-1: Two-mode split creates confusion
- **Impact**: Direct Questioning mode (default) and Story-Driven mode (`--agent` auto-switches) have completely different behaviors, flag handling, and output formats. The user doesn't know which mode they're in.
- **Fix**: Either (a) unify the modes (DQ becomes a sub-mode of Story), or (b) clearly announce the mode at session start: `[Mode: Direct Questioning — 8 reflective prompts, one per line]` vs `[Mode: Story-Driven — N encounters with NPCs and narrative]`.
- **Effort**: 1-2 hours for the announcement; 1+ day for unification

### UX-ARCH-2: No interactive mode in headless
- **Impact**: `--headless` auto-answers everything, so the user never actually plays.
- **Fix**: Without `--headless`, the CLI should use `@clack/prompts` to present questions interactively. The infrastructure exists (the `select` and `clackText` imports are there) but the default DQ flow bypasses them.
- **Effort**: 2-3 hours

### UX-ARCH-3: No tutorial or first-encounter walkthrough
- **Impact**: The user's first encounter is a bare question with no context about how to answer, what the options mean, or what happens after.
- **Fix**: Add a `mysterium tutorial` command that runs a single guided encounter with extra annotations: "This is a [modality] encounter on the [line] line. You'll be asked a question. Your answer shapes your developmental profile. There are no wrong answers."
- **Effort**: 1-2 hours

---

## 6. What Worked Well (preserve these)

- **Reflective prompts are excellent** — piercing, specific, genuinely thought-provoking. "Where in your body do you carry the most tension right now? What is it protecting?" is a real question.
- **Diagnostic command** is reassuring — confirms the engine loads cleanly.
- **Agent mode** produces structured, RPG-flavored encounters with named NPCs, modalities, and pass/fail outcomes.
- **The 8 developmental lines** form a thoughtful, complete-seeming taxonomy.
- **Save state** persists across invocations and `new-game` wipes it cleanly.
- **NPC names** (`shadow-wraith`, `ember-companion`, `war-drum`) are evocative and hint at a real world.

---

## 7. Prioritized Action Plan

### P0 — Fix broken trust (do these first)

| # | Issue | Effort | Impact |
|---|---|---|---|
| 1 | Fix `--encounters` in DQ mode (respect the count) | 30 min | Critical — user's first command breaks trust |
| 2 | Fix `--line`/`--stage` in DQ mode (respect the forcing) | 30 min | Critical — flags are decoration |
| 3 | Suppress plain-text preamble in `--json` mode | 10 min | Critical — breaks machine-parseability |
| 4 | Emit LLM-unavailable warning in JSON mode | 10 min | High — user is misled |
| 5 | Add fallback narrative templates for no-LLM mode | 2-4 hrs | High — transforms hollow → alive |
| 6 | Fix diagnostic holon count | 5 min | Medium — math mismatch |

### P1 — Onboarding (do these next)

| # | Issue | Effort | Impact |
|---|---|---|---|
| 7 | Add intro text to `--help` | 5 min | High — first impression |
| 8 | Add first-run onboarding message | 15 min | High — contextualizes the experience |
| 9 | Add `glossary` command | 30 min | Medium — vocabulary wall |
| 10 | Add `--dev` JSON output | 30 min | Medium — promised but missing |

### P2 — Experience (transform from questionnaire to game)

| # | Issue | Effort | Impact |
|---|---|---|---|
| 11 | Show per-line progress in `status` | 1-2 hrs | High — visible progression |
| 12 | Emit qualitative consequence after each encounter | 1 hr | High — feedback loop |
| 13 | Wrap DQ questions in narrative framing | 2-3 hrs | High — feels like a game |
| 14 | Default to Story-Driven mode (not DQ) | 1 hr | High — RPG not questionnaire |
| 15 | Add `mysterium tutorial` command | 1-2 hrs | Medium — guided first encounter |

### P3 — Polish

| # | Issue | Effort | Impact |
|---|---|---|---|
| 16 | `new-game` confirmation prompt | 10 min | Medium |
| 17 | Fix `new-game` hint command | 2 min | Low |
| 18 | `status` post-reset message | 5 min | Low |
| 19 | Announce mode at session start | 30 min | Medium |
| 20 | Interactive mode without `--headless` | 2-3 hrs | High — actual playability |

---

## 8. The User's Verdict

> "The questions hooked me, and the agent-mode encounter names hint at a real world I want to visit. But I'd want to play it with an LLM configured and a narrative actually rendering — what I saw today was scaffolding without the building."

> "The heart is here. The prompts are here. The taxonomy is here. What's missing is the bridge from 'engine output' to 'experience' — and a new user can't cross that bridge alone."

---

## 9. YAGNI / Refactor Recommendations

### YAGNI: Things to REMOVE or defer
- **`--force-shadow` flag**: No user understands what a "shadow quadrant" is on first contact. Defer until the user has played enough to encounter shadows naturally.
- **`--modality` flag**: Same — "modality" is internal taxonomy. Defer.
- **`--skip-calibration` flag**: Only meaningful for testing. Hide from `--help` or move to `--dev` section.
- **The `setup` command**: Currently does nothing useful (no interactive LLM config). Either implement it or remove it.

### REFACTOR: Things to simplify
- **Merge DQ + Story modes**: The two-mode split creates massive UX confusion. Make DQ a sub-mode of Story ("DQ = 8 reflective prompts, one per line, no NPC framing; Story = N encounters with NPCs and narrative"). The mode is chosen interactively or via flag, not silently defaulted.
- **Flatten the flag surface**: `--headless`, `--json`, `--verbose`, `--dev`, `--no-llm`, `--agent`, `--encounters`, `--line`, `--stage`, `--modality`, `--force-shadow`, `--skip-calibration` — that's 12 flags. A new user can't parse this. Group them: `[Session Options]`, `[Forcing Options]`, `[Developer Options]`.
- **Status command**: Replace flavor text with a structured progress display. Flavor text can be an optional `--poetic` flag.

### KEEP: Things that work
- The reflective prompts
- The 8-line taxonomy
- The NPC names and narrative roles
- The save/load system
- The diagnostic command
- The agent-mode encounter structure

---

## 10. The Core UX Insight

Mysterium has a **deep engine** (38+ fixes, HoloOS-aligned G_z/P_z, AQAL gates, Atman Project detection, knot pairs, Holonic Return) sitting behind a **shallow user experience** (broken flags, no onboarding, hollow narrative, uninformative status). The engine can detect Atman Project defenses and schedule knot-pair encounters — but the user sees `"The encounter was completed without LLM interaction."`

The next investment should be **not in engine depth, but in experience depth** — fallback narratives, onboarding, progress visibility, and fixing the broken CLI flags that erode trust on first contact. The engine is ready; the experience is not.

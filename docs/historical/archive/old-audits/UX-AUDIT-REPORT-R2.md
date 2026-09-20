# Mysterium Fresh-User UX Audit Report — Round 2

> **Date:** 2026-07-05
> **Method:** A subagent with zero knowledge of Mysterium internals simulated a new user discovering the game via 10 CLI commands. This is the second pass — the first round's P0 fixes have been applied.
> **Objective:** Identify remaining UX gaps after the first round of fixes, and find the next tier of improvements.

---

## 0. Executive Summary

**Rating: 5/10** — up from ~3/10 in Round 1.

The first round of UX fixes successfully addressed the most trust-breaking issues:
- ✅ `--encounters`, `--line`, `--stage` now respected in DQ mode
- ✅ LLM-unavailable warning emitted in JSON mode
- ✅ Diagnostic holon count math adds up
- ✅ `--help` has an intro description
- ✅ First-run onboarding message appears
- ✅ Status shows per-line progress bars

**But new issues surfaced:**
- The fallback narrative templates have a grammar bug ("The an unknown path") and repeat across encounters
- `--verbose` is invisible in JSON mode (no extra fields emitted)
- Status shows encounter counts but NOT the current stage per line (the core developmental info)
- "LanguageReflective" header on every question is confusing — users don't know what it means
- `new-game` still has no confirmation prompt
- Post-reset status drops the 8-line table entirely
- No glossary command — jargon wall persists

The user's verdict: "The bones are excellent; the flesh is incomplete. The product would jump to 7-8/10 with glossary/onboarding, per-line stage display, fixed agent narratives, confirmation prompt, and visible --verbose."

---

## 1. Issues Fixed Since Round 1 (✅ Verified)

| Round 1 Issue | Status | User Feedback |
|---|---|---|
| `--encounters` ignored in DQ mode | ✅ Fixed | "CLI flags are predictable — all behaved as advertised" |
| `--line`/`--stage` ignored in DQ mode | ✅ Fixed | "The line-forcing feature is clean and predictable" |
| No LLM warning in JSON | ✅ Fixed | User saw the warning event |
| Diagnostic holon count mismatch | ✅ Fixed | "36 total: 16 NPCs, 4 factions, 7 locations, 9 others" — math adds up |
| No intro text in --help | ✅ Fixed | User read the description and understood it's a developmental RPG |
| First-run onboarding | ✅ Fixed | User saw "Welcome to Mysterium..." message |
| Status uninformative | ✅ Partially fixed | "Most polished screen so far — the character-sheet feel is satisfying" |
| Hollow narrative ("completed without LLM") | ✅ Partially fixed | Atmospheric templates exist but have bugs (see below) |
| `new-game` hint wrong command | ✅ Fixed | "Run mysterium session to start a new game" |

---

## 2. New Issues Found (Round 2)

### UX-R2-1: Agent-mode fallback narratives have grammar bug + repetition
- **What the user saw**: `"The an unknown path edge sharpened, then softened."` — the article "The" before "an" is a grammar error. Also, 3 encounters produced 2 nearly identical narratives.
- **Root cause**: The fallback template uses `enc?.holonSource ?? 'an unseen presence'` and `enc?.targetLines[0] ?? 'an unknown path'` — when the encounter HAS a holonSource but NOT a targetLines[0] (or vice versa), the template produces "The [modality] with [holonName]..." but then "an unknown path" leaks in. Also, random selection from 5 templates with only 3 encounters has a high collision probability.
- **Severity**: HIGH — breaks immersion and looks broken
- **Fix**: (a) Fix the template to handle the article correctly, (b) Add more templates or make selection non-repeating within a session

### UX-R2-2: `--verbose` is invisible in JSON mode
- **What the user saw**: `--verbose --json` produced identical output to `--json` alone. No extra fields, no additional events.
- **Root cause**: `--verbose` only affects non-JSON console output (via `verbose()` calls that check `!JSON_MODE`). No JSON events are emitted for verbose-only data.
- **Severity**: MEDIUM — feels broken
- **Fix**: Emit `{"type":"verbose_detail","module":...,"archetype":...,"modality":...}` events when `--verbose --json` is set

### UX-R2-3: Status shows encounter counts but NOT current stage per line
- **What the user saw**: `Cognitive ◆ ▓▓░░░░░░ 2 encounters` — the ◆ symbol is unexplained, and there's no "Red" or "Amber" label per line.
- **Root cause**: The Veil principle prohibits showing stage names to the player. The ◆ symbol IS the stage indicator (different symbols for different stages) but this isn't explained.
- **Severity**: HIGH — the core developmental info (am I progressing?) is invisible
- **Fix**: (a) Add a legend explaining the symbols, OR (b) use Veil-compliant qualitative stage labels ("power-oriented" for Red, "order-oriented" for Amber, etc.) instead of symbols, OR (c) add a "next milestone" hint ("Explore this line more to deepen")

### UX-R2-4: "LanguageReflective" header on every question
- **What the user saw**: Every DQ question has `header: "LanguageReflective"` regardless of which line is being assessed.
- **Root cause**: The header is the modality name, not the line name. DQ mode always uses the `LanguageReflective` modality. The user doesn't know what "LanguageReflective" means.
- **Severity**: MEDIUM — confusing but not blocking
- **Fix**: In DQ mode, set the header to the line name (e.g., "Cognitive", "Emotional") instead of the modality name. Or add a `line` field to the `ask_user` JSON event.

### UX-R2-5: `new-game` still has no confirmation prompt
- **What the user saw**: Running `new-game` instantly wiped all progress with no "Are you sure?" prompt.
- **Root cause**: The `new-game` command doesn't check for existing saves or prompt for confirmation.
- **Severity**: MEDIUM — destructive without warning
- **Fix**: If `hasSave()` is true, prompt "This will delete all progress. Continue? [y/N]" in interactive mode. In headless mode, require `--yes` flag.

### UX-R2-6: Post-reset status drops the 8-line table
- **What the user saw**: After `new-game`, status shows only "no saved game" — no empty 8-line table for orientation.
- **Root cause**: The per-line table is only rendered when `hasSave()` is true.
- **Severity**: LOW — disorienting but not blocking
- **Fix**: Show the 8-line table with all zeros even when no save exists, so the user sees the shape of the journey.

### UX-R2-7: No glossary command
- **What the user saw**: Terms like "holon", "significator", "CCI", "resonance", "modality", "shadow quadrant" appear in output with no definitions.
- **Severity**: MEDIUM — vocabulary wall persists
- **Fix**: Add `mysterium glossary` command that defines all key terms in plain English.

### UX-R2-8: NPCs/factions/locations exist in diagnostic but never appear in encounters (module-only mode)
- **What the user saw**: Diagnostic shows 16 NPCs, 4 factions, 7 locations — but DQ mode questions have no NPC, no setting, no story.
- **Root cause**: DQ mode synthesizes encounters without binding holons. Only `--agent` mode (Story-Driven) uses holonSource, and even then the narrative is templated.
- **Severity**: HIGH — the "RPG" framing is thin without LLM
- **Fix**: In DQ mode, prepend each question with a one-line scene-setting using a random NPC + location: `"[ember-companion watches you across the fire. The question forms:]"`

---

## 3. Prioritized Action Plan (Round 2)

### P0 — Fix what looks broken

| # | Issue | Effort | Impact |
|---|---|---|---|
| 1 | Fix agent-mode narrative grammar bug + repetition | 30 min | High — looks broken |
| 2 | Add stage legend/labels to status display | 30 min | High — core info missing |
| 3 | Add `line` field to DQ `ask_user` JSON events | 10 min | Medium — header confusion |

### P1 — Improve the experience

| # | Issue | Effort | Impact |
|---|---|---|---|
| 4 | Add `--verbose` JSON events (module, archetype, NPC, modality) | 1 hr | Medium — flag feels broken |
| 5 | Add `mysterium glossary` command | 30 min | Medium — vocabulary wall |
| 6 | Add `new-game` confirmation prompt | 15 min | Medium — destructive without warning |
| 7 | Show 8-line table even when no save exists | 10 min | Low — orientation |
| 8 | Prepend DQ questions with NPC scene-setting | 1 hr | High — transforms survey → RPG |

### P2 — Deepen the experience

| # | Issue | Effort | Impact |
|---|---|---|---|
| 9 | Add "next milestone" hint per line in status | 30 min | Medium — progression visibility |
| 10 | Add `mysterium preview --stage=Amber` command | 1 hr | Medium — curiosity satisfier |
| 11 | Add reflection journal (re-read past answers) | 2-3 hrs | High — retention |
| 12 | Add "what the game learned about you" summary | 1-2 hrs | High — feedback loop |

---

## 4. The User's Verdict

> "The questions themselves are compelling enough that I'd want to answer them properly (with LLM on, interactively). But the current headless/module-only experience doesn't deliver enough narrative payoff to make me return daily. It feels like a prototype of something excellent rather than a finished product."

> "The bones are excellent; the flesh is incomplete."

> **Rating: 5/10** — would jump to 7-8/10 with: glossary, per-line stage display, fixed agent narratives, confirmation prompt, visible --verbose.

---

## 5. What Changed Between Round 1 and Round 2

| Dimension | Round 1 | Round 2 | Delta |
|---|---|---|---|
| `--encounters` respected | ❌ Ignored | ✅ Works | Fixed |
| `--line`/`--stage` respected | ❌ Ignored | ✅ Works | Fixed |
| LLM warning in JSON | ❌ Silent | ✅ Warning event | Fixed |
| Diagnostic holon count | ❌ Math wrong | ✅ Math correct | Fixed |
| `--help` intro | ❌ No description | ✅ Description shown | Fixed |
| First-run onboarding | ❌ Nothing | ✅ Welcome message | Fixed |
| Status progress bars | ❌ Flavor text only | ✅ Per-line bars | Fixed |
| Agent narrative quality | ❌ "completed without LLM" | ⚠️ Atmospheric but buggy | Partial |
| Stage per line in status | ❌ Missing | ❌ Still missing | Not fixed |
| Glossary | ❌ Missing | ❌ Still missing | Not fixed |
| `--verbose` in JSON | ❌ Invisible | ❌ Still invisible | Not fixed |
| `new-game` confirmation | ❌ No prompt | ❌ Still no prompt | Not fixed |
| NPC scene-setting in DQ | ❌ No narrative | ❌ Still no narrative | Not fixed |
| Overall rating | ~3/10 | 5/10 | +2 |

---

## 6. The Core Insight (Round 2)

Round 1 fixed the **trust-breaking** issues (flags work, math adds up, warnings appear). Round 2 reveals the **experience-deficit** issues more clearly:

1. **The fallback narratives are close but broken** — the templates produce atmospheric text but with grammar bugs and repetition. They need one more polish pass.
2. **The stage-per-line display is the #1 missing feature** — users want to see their developmental progression, and the current status screen shows encounter counts but not whether those encounters moved them forward.
3. **The "LanguageReflective" header is a modality label, not a line label** — users see it on every question and don't know what it means. The fix is trivial (use the line name as the header in DQ mode).
4. **The RPG framing requires NPC scene-setting even in module-only mode** — without it, the game is a survey. With it (even one line of scene-setting), it becomes a story.

The path from 5/10 to 8/10 is clear: fix the narrative grammar, add stage labels, add a glossary, and prepend NPC scene-setting to DQ questions. The path from 8/10 to 10/10 requires LLM-driven narrative context.

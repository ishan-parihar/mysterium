# Mysterium Fresh-User UX Audit Report — Round 3

> **Date:** 2026-07-06
> **Method:** A subagent with zero knowledge of Mysterium internals role-played a brand-new user discovering the game via the CLI only. It was forbidden from reading source, docs, README, or any project file. It ran ~25 commands across all subcommands and flag combinations, captured a verbatim experiential journal, and reported its emotional and cognitive reactions. The parent agent (this report's author) then cross-referenced every reported friction point against the actual codebase to produce root-cause-attached recommendations.
> **Objective:** Identify UX-level gaps that prevent Mysterium from being *experientially sound* and *efficacious in its stated purpose* — accelerating evolution and healing in the individual. Not just "does it run?" but "does it transform?"

---

## 0. Executive Summary

**Rating: 4/10 experientially, 3/10 efficacy.** Down from R2's 5/10 not because the codebase regressed, but because R3 was the first round to actually exercise the default out-of-the-box state — and that state is **broken in a way R2 did not catch**.

### The single finding that dominates everything else

**The default gameplay mode crashes 100% of the time.** Direct Questioning + no-LLM (the state every fresh user lands in) throws `ReferenceError: line is not defined` on every encounter. The JSON error log literally contains `"line":"Moral"` in the same object as `"error":"line is not defined"` — a self-contradicting error message that exposes a one-line lexical scope bug.

This is not a polish issue. This is the entire game being unreachable for any user who doesn't:
- Have an LLM API key configured (most don't), OR
- Discover the `--agent` flag (which silently switches modes and sidesteps the bug)

The bug has a one-line fix (see §3.1). It is the highest-leverage fix in the entire project.

### The experiential verdict

The fresh user's journal contains this line, which should be tattooed on the project:

> *"If I could have answered them and gotten thoughtful feedback, this could have been a moving experience. I never got that chance."*

The reflective questions are genuinely excellent. The arc structure (Warmup/Peak/Cooldown) is sound. The hidden world (16 named NPCs with shadow quadrants, drives, polarity cells) is genuinely interesting. **None of it is reachable.** The encounter loop never closes. The user is read poetry at by a machine that won't let them reply.

After 42 encounters across 14 sessions, the user reported: still stage Red, still CCI 0.5136 (started at 0.5036), still "fortress-sharp, weapon-walls" resonance, still `[power]` on every line. **Zero felt sense of growth.** The healing/evolution promise is invisible — not because the engine can't produce it, but because the user can't engage with the engine.

### What this audit adds that R1 and R2 did not

| R1 covered | R2 covered | R3 adds (new) |
|---|---|---|
| `--encounters` ignored in DQ | LLM warning in JSON | **The `line is not defined` runtime crash** (R2 missed it because R2's smoke tests used `--agent`) |
| `--line`/`--stage` ignored | Diagnostic math | **`--dev` is a no-op in session context** (R2 only checked status) |
| Diagnostic math | `--verbose` invisible in JSON | **`status --json` is unimplemented** (parsed but ignored) |
| No intro text | Status per-line bars | **Interactive mode hangs silently in non-TTY** (no graceful degradation) |
| | | **Narrative truncation is a CLI display bug** (full text exists in JSON) |
| | | **Hidden world problem** — NPCs, shadow quadrants, drives never surface in gameplay |
| | | **Efficacy assessment** — first round to measure "did the user actually change?" |
| | | **YAGNI analysis** — what to delete, not just what to add |

---

## 1. Method

### 1.1 Simulation protocol

A general-purpose subagent was deployed with these constraints:

1. **Forbidden to read source, docs, README, AGENTS.md, or any project file.** A real fresh user wouldn't read your source.
2. **Forbidden to use Grep/Glob/Read on the repo.** Only bash commands and reading its own notes.
3. **Stayed in character** as a curious, somewhat-tech-savvy person who heard about a "developmental RPG" online.
4. **Ran ~25 commands** across all subcommands and flag combinations, capturing verbatim output, expectations, feelings, and learnings for each.

### 1.2 Cross-referencing protocol

The parent agent (this report's author) then took every concrete friction point in the simulation journal and:

1. Located the exact line of code producing the friction.
2. Confirmed the root cause (not just the symptom).
3. Assessed the fix's blast radius (one-liner? architectural? data?).
4. Mapped the friction to its **experiential** impact, not just its technical impact.

### 1.3 Efficacy assessment protocol

The simulation journal was mined for evidence of the game's stated purpose: *"accelerate evolution and healing in the individual."* Specifically:

- Did any reflective prompt actually land emotionally? (Captured verbatim.)
- Did any stage transition occur? (Checked save state.)
- Did any shadow surface? (Checked save state.)
- Did the user report feeling different at the end vs. the beginning?
- Would the user return?

---

## 2. The Simulation Journal (condensed)

The full journal is preserved in the worklog. Key verbatim moments:

### 2.1 The question that landed (and then died)

> **Command:** `npx tsx scripts/cli-game.ts --headless --no-llm --encounters 3`
>
> ```
> 🧘 [REFLECTION BEAT] • Tune in to your inner state •
> [Moral]
> When does honesty become cruel? Where is your line?
>   ✗ Encounter failed: line is not defined
> ```
>
> **User's reaction:** *"Whiplash. The questions are beautifully written — 'When does honesty become cruel?' actually made me pause. But then each one immediately dies with 'line is not defined'. The line is LITERALLY PRINTED IN BRACKETS ([Moral]). The system knows the line. The error contradicts itself."*

### 2.2 The moment of awe, then irritation

> **Command:** `ls /home/z/.mysterium/` (curious peek at save files)
>
> **User's reaction:** *"Awe, then irritation. There's a whole WORLD under the hood — factions, NPCs with shadow quadrants, narrative roles — and I would never have known. The CLI shows me almost none of it. I'm 'playing' a game whose characters I've never met."*

The save file revealed 16 named NPCs (The Conqueror, Bloodfury, Elder Ashmark, Silent Fang, The Viper Tactician...), each tied to a specific Line × Stage with a shadow quadrant (DarkAddiction, GoldenAllergy, GoldenAddiction, DarkAllergy). The CLI never surfaces any of this in gameplay output.

### 2.3 The final verdict

> **After 42 encounters across 14 sessions:**
>
> *"I am still at stage Red, still CCI 0.5136, still `[power]` on every line, still 'fortress-sharp, weapon-walls'. I never answered a single reflective prompt (every Direct Questioning encounter failed). I never made a single choice (every multiple-choice encounter failed). I watched the same narrative fragments cycle. I did not feel healed. I did not feel evolved. I felt like I'd been read poetry at by a machine that wouldn't let me reply."*

### 2.4 The "would you come back?" answer

> *"Not as it currently stands. The bugs are too many, the onboarding too absent, the reflective loop too broken. But — if Direct Questioning were fixed so I could actually answer those questions and get LLM feedback, I would absolutely come back. The question craft is real. The arc structure is sound. There's something here. It's just not reachable yet."*

---

## 3. Critical Findings (P0 — fix this week)

### 3.1 P0-1: `line is not defined` — the entire default mode is broken

**Experiential symptom:** Every Direct Questioning encounter crashes. The user sees the reflective question printed (e.g., "When does honesty become cruel?"), then immediately sees `✗ Encounter failed: line is not defined`. The session "ends" with `Progress saved` as if it succeeded.

**Root cause (confirmed in code):**

`scripts/cli-game.ts` line 786 defines `runAgenticEncounter(encounter, sig, world, ...)`. Inside it (line 799), `encLine` is destructured from `encounter.moduleRef`:

```ts
const [encLine, encStage] = encounter.moduleRef.split(':') as [Line, Stage];
```

Then a `uiHandler` closure is built (line 820) that, at line 882–890, references `line` and `i`:

```ts
emitEvent('ask_user', {
  header: line,                                          // ← BUG: `line` not in scope
  question: q.question,
  narrative: DQ_SCENE_SETTINGS[i % DQ_SCENE_SETTINGS.length],  // ← BUG: `i` not in scope
  ...
});
```

`line` and `i` exist only in `runDirectQuestioningSession`'s for-loop (lines 1178–1179):

```ts
for (let i = 0; i < linesToRun.length; i++) {
  const line = linesToRun[i]!;
```

But `uiHandler` is built INSIDE `runAgenticEncounter`, where those variables don't exist. JavaScript closures resolve lexically — they don't traverse the call stack. So `header: line` throws `ReferenceError: line is not defined` every time the object literal is evaluated.

The question is printed BEFORE the crash because lines 825–880 (the `if (!JSON_MODE)` block that prints `q.header`) use `q.header`, not `line`. The crash fires when `emitEvent` is called, because the argument object must be evaluated first.

**The one-line fix:**

```ts
// Before (line 882-890):
emitEvent('ask_user', {
  header: line,
  question: q.question,
  narrative: DQ_SCENE_SETTINGS[i % DQ_SCENE_SETTINGS.length],
  ...
});

// After:
emitEvent('ask_user', {
  header: encLine,                    // ← use the destructured variable in scope
  question: q.question,
  narrative: DQ_SCENE_SETTINGS[0],    // ← DQ_SCENE_SETTINGS is a fixed array; pick by encounter hash, not loop index
  ...
});
```

Better: pass `line` and `i` as explicit parameters to `runAgenticEncounter` so the closure can capture them intentionally, not accidentally.

**Why R1 and R2 missed this:** Both prior audits ran their smoke tests with `--agent` (Story-Driven mode), which bypasses `runDirectQuestioningSession` entirely. The bug only fires in the default mode (Direct Questioning), which is what a fresh user lands in.

**Blast radius:** One line. Zero architectural change. After this fix, the default mode will work end-to-end for the first time.

**Experiential impact:** This is the difference between "the game is unplayable" and "the game is playable." It is the single highest-leverage fix in the project.

---

### 3.2 P0-2: `--dev` is false-advertised in session context

**Experiential symptom:** `--help` promises `--dev` will "show holistic primitives (G_z/P_z, rayProfile, phase position)." The user runs `--dev`, `--dev --json`, `--dev --agent`, `--dev --verbose` — none of them surface the promised primitives during a session.

**Root cause (confirmed in code):**

`DEV_MODE` is read at line 183. It is checked in exactly one place: inside `runStatus()` at line 2167:

```ts
if (DEV_MODE) {
  console.log(`\n  ${chalk.bold('Holistic Primitives (dev mode)')}`);
  const snapshot = toSnapshot(sig);
  const cci = computeCCI(snapshot);
  info('G_z', cci.metabolicHealth?.gz.toFixed(4) ?? 'n/a');
  ...
}
```

So `--dev` only affects `mysterium status --dev`, not `mysterium --headless --dev`. The help text implies session-level dev output; the implementation only provides status-level dev output.

**Fix:** Either (a) update `--help` to say "Developer mode: show holistic primitives in `status` output", or (b) add a `DEV_MODE` branch in `runFullSession` / `runDirectQuestioningSession` that emits primitives after each encounter.

**Recommendation:** Option (b) — emit a `dev_primitives` JSON event after each encounter when `--dev` is set. This is what the help text implies and what a developer would want.

**Blast radius:** ~20 lines added to the session loop, or 1 line in the help text. Either is trivial.

---

### 3.3 P0-3: `status --json` is unimplemented

**Experiential symptom:** The user runs `status --json` expecting structured output. Instead, they see section headers (`Configuration`, `Game State`, etc.) with empty content underneath. The `--json` flag is parsed but produces broken output.

**Root cause (confirmed in code):**

`runStatus()` at line 2096 has no `JSON_MODE` branch. It always uses `info()` (which is a pretty-printer) and `console.log()`. When `JSON_MODE` is true, `info()` likely suppresses its output (because it's a pretty-printer), but `console.log()` for banners and headers still fires — producing the "headers without content" effect the user saw.

**Fix:** Add a `JSON_MODE` branch at the top of `runStatus()`:

```ts
async function runStatus(): Promise<void> {
  if (JSON_MODE) {
    const sig = hasSave() ? loadSave() : null;
    const config = loadConfig();
    process.stdout.write(JSON.stringify({
      type: 'status',
      config: { provider: config.llm?.provider ?? 'gemini', model: config.llm?.model ?? model, hasApiKey: !!config.llm?.apiKey },
      save: sig ? {
        playerId: sig.id,
        stage: sig.currentStage,
        totalEncounters: sig.totalEncounters,
        totalSessions: sig.totalSessions,
        cci: computeCCI(toSnapshot(sig)).composite,
        lines: ALL_LINES.map(l => ({ line: l, stage: sig.altitudes[l], encounters: sig.polarity.cells[`${l}:${sig.altitudes[l]}`]?.traceCount ?? 0 })),
      } : null,
    }) + '\n');
    return;
  }
  // ... existing pretty-print code ...
}
```

**Blast radius:** ~30 lines added. No regression risk.

---

### 3.4 P0-4: Interactive mode hangs silently in non-TTY environments

**Experiential symptom:** The bare `npx tsx scripts/cli-game.ts` command, `mysterium setup`, and `mysterium session` all hang indefinitely in any non-TTY environment (CI, pipes, subagent shells, containers). No "please run me in a terminal" message. No timeout. Just silence.

**Root cause:** `@clack/prompts`'s `select()` and `text()` functions wait for stdin TTY events. When stdin isn't a TTY, they block forever. The CLI doesn't detect this case.

**Fix:** At startup, detect non-TTY and either (a) print a helpful error and exit, or (b) auto-fall-back to `--headless` with a warning:

```ts
if (!process.stdin.isTTY && !HEADLESS && !JSON_MODE) {
  console.error('Mysterium requires an interactive terminal. Run with --headless for non-interactive use, or run in a real terminal.');
  process.exit(1);
}
```

**Blast radius:** 5 lines. Huge experiential win — every fresh user in a container/CI/subagent context currently hits this wall.

---

## 4. High-Severity Findings (P1 — fix this sprint)

### 4.1 P1-1: Narrative truncation is a CLI display bug

**Experiential symptom:** Pretty-print mode shows `"The moment settles. Something stirred — not fully formed, but present. The work continues beneath th..."` — truncated mid-word. The user thinks the content is broken. JSON mode reveals the full text: `"...The work continues beneath the surface."`

**Root cause (confirmed in code):**

`scripts/cli-game.ts` lines 1209–1211:

```ts
const briefNarrative = result.narrativeSummary.length > 120
  ? result.narrativeSummary.slice(0, 120) + '...'
  : result.narrativeSummary;
```

The slice is character-based, not word-boundary-aware. It cuts mid-word. The same pattern appears at line 1695 (`slice(0, 100)`).

**Fix:** Use a word-boundary-aware truncation:

```ts
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return cut.slice(0, lastSpace > 60 ? lastSpace : max) + '…';
}
```

Or just remove the truncation entirely — 120 chars is short enough that the terminal can handle it, and the full narrative is more valuable than the truncated one.

**Blast radius:** 1 helper function + 2 call sites. Trivial.

**Experiential impact:** The truncation makes the game feel broken. The full narratives are moody and well-written. Removing the truncation is a free win.

---

### 4.2 P1-2: The hidden world problem — NPCs, shadow quadrants, drives never surface

**Experiential symptom:** The user discovered (by reading save files, which a real user wouldn't do) that the game has 16 named NPCs — The Conqueror, Bloodfury, Elder Ashmark, Silent Fang, The Viper Tactician — each tied to a Line × Stage with a shadow quadrant. The CLI never shows any of this. Encounters have IDs like `Emotional:Red:bloodfury:1783345147431`, but the narrative is generic ("The moment settles..."). The user never meets Bloodfury.

**Root cause (confirmed in code):**

`scripts/cli-game.ts` line 1570 builds `lineLabel` from `CHALLENGE_NAMES[encLineName ?? '']`, but this only appears in `--agent` Story-Driven mode, and even then it's just a label, not a character. The NPC data (in `src/core/data/encounters/red/conqueror.ts`, `bloodfury.ts`, etc.) is loaded into the registry but never injected into the narrative output.

Meanwhile, the fallback narrative pool in `src/core/agent/PersistentAgent.ts` (lines 245–254) is 8 generic atmospheric strings that have nothing to do with the NPC. So even when an encounter is "with Bloodfury," the user reads "The moment settles."

**Fix (architectural):**

1. When scheduling an encounter, look up the NPC from the registry.
2. Inject the NPC's name, role, and shadow quadrant into the LLM prompt (or into the fallback narrative template).
3. Render the NPC name in the encounter header: `Bloodfury — rage-warrior — Emotional:Red` instead of just `[Emotional]`.
4. Use NPC-specific fallback narratives when the LLM is unavailable.

**Blast radius:** Medium. Requires threading NPC data through the encounter → orchestrator → UI pipeline. ~50–100 lines across 3–4 files.

**Experiential impact:** This is the difference between "atmospheric text generator" and "RPG with characters." The world exists; it just needs to be visible.

**YAGNI note:** Don't go further than surfacing the NPC name + role + shadow quadrant in the encounter header and fallback narrative. Don't build dialogue trees, voice acting, or portraits. The user just needs to know *who they're talking to*.

---

### 4.3 P1-3: No stage progression observed in 42 encounters

**Experiential symptom:** After 42 encounters across 14 sessions, the user is still at stage Red, CCI barely moved (0.5036 → 0.5136), `[power]` label unchanged on every line. The "evolution" promise is invisible.

**Root cause (confirmed in code):**

`src/core/engines/TransformationDetector.ts` lines 27–36:

```ts
const CONVERGENCE_REQUIREMENTS: Record<number, number> = {
  0: 3, // Infrared→Magenta: 3 lines
  1: 4, // Magenta→Red: 4 lines
  2: 5, // Red→Amber: 5 lines  ← user is here
  ...
};
const SATURATION_THRESHOLD = 20; // encounters per line at current stage
```

To transition Red→Amber, the user needs:
- 5 of 8 lines at Red altitude (convergence ≥ 0.7 of 5 = 5 lines)
- ~20 encounters per line × 8 lines = ~160 encounters total for saturation = 1.0
- Overall readiness ≥ 0.8
- Shadow clearance ≥ 0.8 (no critical unresolved shadows)
- No blockers

After 42 encounters spread across 8 lines (~5 per line), saturation is ~5/20 = 0.25. Convergence is 8/5 = 1.0 (capped). But saturation caps overall readiness at ~0.25, far below the 0.8 threshold. **The user would need ~160 successful encounters to transition.**

**The deeper issue:** Every Direct Questioning encounter FAILED (P0-1). Failed encounters don't increment `traceCount` (or if they do, they don't advance `saturation` meaningfully). So the user's 42 "encounters" were mostly no-ops.

**Fix (two-part):**

1. **Fix P0-1 first.** Once encounters actually succeed, progression will start moving.
2. **Re-tune `SATURATION_THRESHOLD`** for the no-LLM fallback path. 20 encounters per line × 8 lines = 160 is reasonable for an LLM-rich experience where each encounter is meaty. For no-LLM mode where encounters are 30-second reflections, 5–8 per line is more appropriate. Consider: `SATURATION_THRESHOLD = LLM_ENABLED ? 20 : 6`.
3. **Surface progression to the user.** After each encounter, show a tiny progress indicator: `Cognitive:Red ▰▰▰▰▱▱▱▱▱▱ 4/10 to next threshold`. The user needs to see they're moving.

**Blast radius:** P0-1 fix is 1 line. Threshold re-tune is 1 line. Progress indicator is ~10 lines per encounter output.

**Experiential impact:** This is the difference between "I played for 30 minutes and nothing happened" and "I played for 30 minutes and I can see myself growing."

---

### 4.4 P1-4: Narrative pool is tiny and repetitive

**Experiential symptom:** In `--agent` mode (the only mode that works), the user sees the same 8 narrative fragments cycle: "The moment settles...", "Silence falls...", "A pattern surfaced...", "The encounter fades...", "Stillness...", "A thread was pulled...", "The air thins...", "The work deepens...". By encounter 5, the user is skimming. By encounter 8, bored.

**Root cause (confirmed in code):**

`src/core/agent/PersistentAgent.ts` lines 244–255:

```ts
const idx = PersistentAgent.fallbackNarrativeCounter++ % 8;
const fallbackNarratives = [
  `The moment settles. Something stirred — not fully formed, but present. The work continues beneath the surface.`,
  `Silence falls. What was touched will return when it's ready. The edge sharpened, then softened.`,
  // ... 8 total
];
```

8 templates, cycled by counter. No variation by line, stage, modality, or NPC.

**Fix (layered):**

1. **Immediate (YAGNI-compliant):** Expand to 24–32 templates, categorized by modality (reflection / decision / somatic / shadow). Pick by `modality + counter`. ~50 lines.
2. **Medium-term:** When an NPC is associated with the encounter (P1-2), use NPC-flavored templates: Bloodfury's narratives should feel different from Elder Ashmark's.
3. **Long-term (when LLM is wired):** Delete the fallback pool entirely and let the LLM generate per-encounter narratives. The fallback should only fire when the LLM is truly unavailable.

**Blast radius:** Immediate fix is ~50 lines in one file. Trivial.

**YAGNI note:** Don't build a procedural narrative generator. Just expand the pool and tag by modality. The LLM is the long-term answer.

---

### 4.5 P1-5: No input validation on `--line`, `--stage`, `--modality`, `--model`, `--force-shadow`

**Experiential symptom:** The user tried `--line FakeLine`, `--stage Purple`, `--model fake-model-xyz`, `--force-shadow NW`. All silently accepted. `--line FakeLine` even produced a fallback question with `[FakeLine]` as the bracket label. The user has no way to discover valid values except by trial and error or by peeking at save files.

**Root cause (confirmed in code):**

`scripts/cli-game.ts` lines 191–193:

```ts
const FORCE_LINE = opts.line as Line | undefined;
const FORCE_STAGE = opts.stage as Stage | undefined;
const FORCE_MODALITY = opts.modality as Modality | undefined;
```

The `as` cast is a type assertion, not a runtime check. Any string is accepted.

**Fix:** Add a validation block after option parsing:

```ts
const VALID_LINES: Line[] = ['Cognitive', 'Emotional', 'Moral', 'Intrapersonal', 'Spiritual', 'Interpersonal', 'Somatic', 'Willpower'];
const VALID_STAGES: Stage[] = ['Infrared', 'Magenta', 'Red', 'Amber', 'Orange', 'Green', 'Turquoise', 'White'];
const VALID_MODALITIES: Modality[] = ['Deterministic', 'LanguageReflective', 'ScenarioChoice', 'Embodied', 'Strategic', 'SocialCooperative', 'ImmersiveRPG'];
const VALID_SHADOWS = ['none', 'DarkAddiction', 'DarkAllergy', 'GoldenAddiction', 'GoldenAllergy'];

if (FORCE_LINE && !VALID_LINES.includes(FORCE_LINE)) {
  console.error(`Invalid --line '${FORCE_LINE}'. Valid: ${VALID_LINES.join(', ')}`);
  process.exit(1);
}
// ... same for stage, modality, shadow
```

**Blast radius:** ~20 lines. Pure win.

**Experiential impact:** Turns "I have no idea what values are valid" into "the game tells me what's valid when I get it wrong." Trust +1.

---

### 4.6 P1-6: `--modality shadow` and `--force-shadow X` are inconsistent

**Experiential symptom:** `--modality shadow` triggers the shadow encounter format (red header, "SHADOW TRIAL" label). `--force-shadow NW` does not — it just runs a regular reflection beat. The user expected both to relate to shadow work.

**Root cause (confirmed in code):**

`--modality` is a `Modality` type (line 193) — it forces the encounter's modality field. `--force-shadow` is a separate flag (line 41) that's consumed elsewhere in the orchestrator to inject shadow keywords into the response pool. They're different code paths with overlapping names.

**Fix:** Either (a) rename `--force-shadow` to `--inject-shadow-keyword` to make clear it's a testing flag, not a gameplay flag; or (b) make `--force-shadow X` also set the encounter's execution mode to `shadow`. Option (a) is more honest.

**Blast radius:** 1 rename + help text update. Trivial.

---

## 5. Medium Findings (P2 — fix this quarter)

### 5.1 P2-1: Session counter semantics are unclear

**Experiential symptom:** The user ran ~6 commands and saw `totalSessions: 8` in JSON and `14 session(s)` in status. They never intentionally started a "session." What counts as a session?

**Root cause:** `totalSessions` is incremented in `src/core/GameLoop.ts` lines 679 and 797 — inside `endSession()`, which is called at the end of every `--headless` run, including failed ones. So every `npx tsx scripts/cli-game.ts --headless` counts as a session, even if every encounter crashed.

**Fix:** Only increment `totalSessions` when at least one encounter succeeded. Or rename to `totalRuns` and add a separate `successfulSessions` counter. Or surface the distinction in status: `14 runs (3 with completed encounters)`.

**Blast radius:** 2 lines in GameLoop + ~5 lines in status output. Low.

---

### 5.2 P2-2: The vocabulary wall is never breached

**Experiential symptom:** The user encountered and never had explained: Holon, Significator, resonance, CCI, rayProfile, G_z/P_z, shadowQuadrant, DarkAddiction, GoldenAllergy, Absorptive/Radiative/Sovereign polarity, Gross/Subtle/Causal/Witness/NonDual, Agency/Communion/Eros/Agape, arc/WARMUP/PEAK/COOLDOWN, TDG, TDG-Rust, calibration.

**Root cause:** No `glossary` subcommand. No `--explain` flag. No inline definitions in `--help`. The Veil of Forgetting design principle (foundations/20) argues against surfacing internal taxonomy to the user — but there's a difference between "don't reveal the player's diagnosis" and "don't explain what 'Holon' means when you print it in `diagnostic`."

**Fix:** Add a `mysterium glossary` subcommand that prints a 1-line definition per term. Add inline `(Holon: an autonomous whole that is part of a larger whole)` tooltips in `diagnostic` output. Keep the Veil for player-facing state (resonance, stage, CCI) but break it for system-facing vocabulary.

**Blast radius:** ~80 lines for a glossary command + data file. Low.

**YAGNI note:** Don't build a full documentation browser. A flat `glossary.md` rendered to terminal is enough.

---

### 5.3 P2-3: The `[power]` label is unexplained and static

**Experiential symptom:** Every developmental line shows `◆ [power]` next to it. The user doesn't know what `power` means. It never changes. Is it good? Stuck? A stage? A pattern?

**Root cause:** `scripts/cli-game.ts` line ~2155 (in `runStatus`) uses `aesthetic` from `stageAesthetics[sig.altitudes[line]]`. For Red stage, the aesthetic is `'power'` (from a hardcoded map). So `[power]` is the *aesthetic label* for the Red stage. It's static because the user is stuck at Red.

**Fix:** Either (a) remove the `[power]` label entirely (it's not actionable info), or (b) make it useful: `[Red · 4/10 to Amber]`. Option (b) is more honest about what's happening.

**Blast radius:** 5 lines. Low.

---

### 5.4 P2-4: The `--encounters` cap is silent

**Experiential symptom:** The user ran `--encounters 999` and got 8 (the DQ cap). No warning, no message.

**Root cause:** `scripts/cli-game.ts` line 1168:

```ts
const count = Math.min(encounterCount, shuffledLines.length);  // capped at 8
```

Silent cap.

**Fix:** Add a warning when the cap fires:

```ts
if (encounterCount > shuffledLines.length) {
  console.warn(`--encounters=${encounterCount} exceeds the ${shuffledLines.length} available lines; running ${shuffledLines.length}.`);
}
```

**Blast radius:** 3 lines. Trivial.

---

### 5.5 P2-5: `setup` and `session` subcommands hang in non-TTY (duplicate of P0-4)

Already covered in P0-4. Listed here for completeness — the fix applies to all three entry points (bare, `setup`, `session`).

---

## 6. Efficacy Assessment — Does the Game Heal or Evolve?

This is the section R1 and R2 did not write. It is the most important section of this report.

### 6.1 The stated objective

From `AGENTS.md` §1:

> *"Mysterium is a Mysterium where every gameplay verb is a gamified developmental assessment... The game is designed for psychological, neurological, sociological, and biological healing and evolution."*

From `README.md`:

> *"A literal cognitive / developmental practice — every assessment module is a validated developmental exercise that simultaneously diagnoses AND heals/evolves the player."*

### 6.2 The simulation evidence

After 42 encounters across 14 sessions, the fresh user reported:

| Dimension | Before | After | Change |
|---|---|---|---|
| Stage | Red | Red | None |
| CCI | 0.5036 | 0.5136 | +0.010 (noise) |
| `[power]` label | All lines | All lines | None |
| Resonance | fortress-sharp, weapon-walls | fortress-sharp, weapon-walls | None |
| Shadows surfaced | 0 | 0 | None |
| Drives moved | — | — | None observable |
| Felt sense of growth | — | "I felt I'd consumed content, not grown" | Negative |
| Would return | — | "Not as it currently stands" | Negative |

**Verdict: The game, in its default out-of-the-box state, does not heal or evolve.** It produces no measurable change in any tracked dimension, and the user's subjective experience was negative (frustration, boredom, numbness).

### 6.3 Why it fails — the three missing loops

The game has three feedback loops that must close for healing/evolution to occur. **None of them close in the default state.**

#### Loop 1: Reflection → Response → Reflection (the contemplative loop)

The user must be able to *answer* a reflective prompt and receive a *response* that builds on their answer. This is the basic unit of any journaling practice, therapy session, or coaching conversation.

**Current state:** The user sees the prompt, then the encounter crashes (P0-1). The loop never opens. Even in `--agent` mode (where the loop technically opens), the response is a generic atmospheric fragment unrelated to the user's input — the loop opens but doesn't close.

**What's needed:**
1. Fix P0-1 so the loop can open.
2. When LLM is unavailable, use a structured fallback that at least reflects the user's input back: *"You wrote: '<user's text>'. The line you've named is <X>. Sit with this for a moment."* This isn't as good as LLM feedback, but it closes the loop.
3. When LLM is available, the prompt must include the user's write-in response and the NPC context, and the LLM must respond to *what the user actually said*, not generate atmospheric text.

#### Loop 2: Encounter → Consequence → Next Encounter (the developmental loop)

Each encounter must produce a *consequence* that the next encounter can build on. The user must feel that encounter N+1 is different because of what happened in encounter N.

**Current state:** Consequences are tracked internally (`ConsequenceRecord` with drive directionality, shadow surfacing, etc.) but never surfaced to the user. The user has no idea that their answer to the Moral question "moved their Communion drive from HealthyBalanced to DarkAverted." The internal state changes; the user's experience doesn't.

**What's needed:**
1. After each encounter, show a *qualitative* consequence (Veil-compliant): *"Something shifted in how you relate to fairness. The next time this comes up, it may feel different."* Not the drive name — the felt sense.
2. The encounter scheduler already uses consequences to pick the next encounter (good!). But the user can't see the thread. Surface it: *"This encounter follows from the last one. You named <X>; now we go deeper."*

#### Loop 3: Session → Stage Transition → New World (the transformational loop)

After enough sessions, the user must cross a stage threshold and the *world must change*. This is the macro-loop that gives the practice its arc — the difference between "I'm doing daily journaling" and "I'm evolving through developmental stages."

**Current state:** Stage transitions require ~160 successful encounters (P1-3). The user would need to play for weeks to cross one threshold. And when they do, nothing visible changes — the world state updates internally but the CLI renders the same Red-stage aesthetics.

**What's needed:**
1. Lower the no-LLM saturation threshold (P1-3 fix).
2. When a stage transition fires, *make it an event*. Print a transition narrative. Change the resonance text. Show the new stage's aesthetic. Make the user feel the threshold was crossed.
3. The transition narrative should reference the specific lines and shadows that converged to enable it. Not generic — specific. *"You crossed from Red to Amber because your Moral, Cognitive, Emotional, Intrapersonal, and Interpersonal lines all reached saturation. The shadow 'silent-fang' was the last to clear."*

### 6.4 The efficacy verdict

**The game cannot currently perform its stated objective.** The three loops are all open. Fixing P0-1 closes Loop 1 partially. Fixing P1-2 (hidden world) and adding consequence surfacing closes Loop 2. Fixing P1-3 (progression) and adding transition events closes Loop 3.

**After all P0 + P1 fixes:** The game would be a functional contemplative practice — roughly equivalent to a structured journaling app with NPC framing. Not yet "healing and evolution" in the clinical sense, but moving in that direction.

**For true efficacy (the long road):**
- The LLM must be wired and the prompts must be excellent (the question bank suggests they will be).
- The consequence → next-encounter threading must be visible to the user.
- Stage transitions must be experientially significant, not just stat changes.
- The shadow work path must actually surface shadows *to the user* (currently they're tracked internally but never shown).

---

## 7. YAGNI Analysis — What to Delete, Not Add

The project has a strong "add more features" energy (64 modules, 8 modalities, 15 tools, TDG-Rust integration, Persistent Developmental Agent, etc.). This audit recommends the opposite: **remove complexity before adding more.**

### 7.1 YAGNI-1: Remove `--agent` / PersistentAgent as a separate code path

**Problem:** The `--agent` flag triggers a completely separate execution path (Story-Driven + PersistentAgent + 15-tool registry + TDG-Rust bridge). This duplicates the encounter loop, the UI handler, the narrative generation, and the consequence tracking. It's also the *only* path that works right now (because it sidesteps the P0-1 bug).

**Recommendation:** Make the PersistentAgent path the *default*. Delete the `--agent` flag. Delete the non-agent Story-Driven path. Keep Direct Questioning as the simple mode, but route it through the same orchestrator.

**Why:** Two code paths means two places for bugs to hide. The P0-1 bug exists because DQ has its own `uiHandler` that duplicates the agent path's `ask_player` handler. One path, one bug surface.

**Blast radius:** Large (architectural), but the payoff is huge. Defer to next quarter.

### 7.2 YAGNI-2: Remove TDG-Rust integration until it's needed

**Problem:** The CLI mentions "TDG-Rust not running — using Mysterium-native 8 tools only" in user-facing output. The user has no idea what TDG-Rust is. The integration is a no-op in the default state. It's dead weight in the UX.

**Recommendation:** Remove the TDG-Rust bridge entirely until there's a concrete reason for it. If/when graph memory is needed, add it back. Don't ship the integration stub.

**Blast radius:** Delete `src/core/agent/TDGBridge.ts` (or similar) + remove the `--agent` TDG-wiring code. ~100 lines deleted.

### 7.3 YAGNI-3: Remove the `gemma-4-31b-it` default model

**Problem:** The default model is `gemma-4-31b-it`, which is not a real model name. Gemma exists (Google's open models), but there's no "Gemma-4-31b." This is a typo or placeholder that ships to users.

**Recommendation:** Either (a) remove the default entirely and require explicit configuration, or (b) default to a real model name (`gemini-1.5-flash` if Gemini is the default provider). Don't ship fake model names.

**Blast radius:** 1 line.

### 7.4 YAGNI-4: Don't build a glossary browser, a settings TUI, or a stats dashboard

**Problem:** The temptation will be to "improve the UX" by adding more commands. Resist this.

**Recommendation:** The CLI should have exactly these commands: `session` (play), `status` (check), `setup` (configure), `new-game` (reset), `glossary` (learn terms). That's it. Don't add `dashboard`, `history`, `stats`, `achievements`, `profile`, `settings`. Every new command is a new surface to maintain and a new place for bugs.

**Blast radius:** Discipline, not code.

### 7.5 YAGNI-5: Don't add more modalities until the existing 7 work

**Problem:** The game has 7 modalities (Deterministic, LanguageReflective, ScenarioChoice, Embodied, Strategic, SocialCooperative, ImmersiveRPG). Most of them are untested in the default flow because DQ always uses LanguageReflective and Story-Driven mode cycles through whatever the scheduler picks.

**Recommendation:** Make all 7 modalities actually fire in normal gameplay before adding an 8th. Add a `--modality` smoke test that runs one encounter per modality and verifies each renders correctly.

**Blast radius:** Test infrastructure, not features.

---

## 8. Refactor Recommendations — Prioritized

### 8.1 This week (P0 — unblock the default experience)

| # | Fix | Effort | Impact |
|---|---|---|---|
| 1 | Fix `line is not defined` (P0-1) | 1 line | **Unblocks the entire default mode.** Highest-leverage fix in the project. |
| 2 | Add non-TTY detection (P0-4) | 5 lines | Prevents silent hangs in CI/containers/subagents. |
| 3 | Fix `--dev` false advertising (P0-2) | 1 line (help text) or 20 lines (session dev output) | Restores trust in `--help`. |
| 4 | Implement `status --json` (P0-3) | 30 lines | Makes the CLI scriptable. |

### 8.2 This sprint (P1 — make the experience work)

| # | Fix | Effort | Impact |
|---|---|---|---|
| 5 | Fix narrative truncation (P1-1) | 1 helper + 2 call sites | Removes "broken content" impression. |
| 6 | Surface NPC name + role in encounter header (P1-2) | 50–100 lines | Turns "atmospheric text" into "RPG with characters." |
| 7 | Re-tune `SATURATION_THRESHOLD` for no-LLM mode (P1-3) | 1 line | Makes progression visible in 30 min, not 30 hours. |
| 8 | Add input validation for `--line`/`--stage`/`--modality`/`--force-shadow` (P1-5) | 20 lines | Turns "I have to guess" into "the game tells me." |
| 9 | Expand fallback narrative pool to 24–32, tagged by modality (P1-4) | 50 lines | Reduces repetition fatigue. |
| 10 | Rename `--force-shadow` to `--inject-shadow-keyword` (P1-6) | 1 rename | Removes naming confusion. |

### 8.3 This quarter (P2 — polish and clarify)

| # | Fix | Effort | Impact |
|---|---|---|---|
| 11 | Fix session counter semantics (P2-1) | 7 lines | Makes stats trustworthy. |
| 12 | Add `glossary` subcommand (P2-2) | 80 lines | Breaches the vocabulary wall. |
| 13 | Replace `[power]` label with `[Red · 4/10 to Amber]` (P2-3) | 5 lines | Makes stage info actionable. |
| 14 | Warn on `--encounters` cap (P2-4) | 3 lines | Removes silent surprises. |

### 8.4 Next quarter (architectural — YAGNI cleanup)

| # | Fix | Effort | Impact |
|---|---|---|---|
| 15 | Consolidate to one encounter code path (YAGNI-1) | Large | Halves the bug surface. |
| 16 | Remove TDG-Rust bridge (YAGNI-2) | Medium (deletion) | Removes user-facing dead weight. |
| 17 | Remove `gemma-4-31b-it` default (YAGNI-3) | 1 line | Stops shipping fake model names. |

---

## 9. The Three Loops Framework — A Diagnostic for Future Audits

This audit introduced the **Three Loops** framework for assessing Mysterium's efficacy. Future audits should use it.

| Loop | Description | How to test if it's closed |
|---|---|---|
| **Loop 1: Contemplative** | Reflection → Response → Reflection | Did the user answer a prompt and receive a response that built on their answer? |
| **Loop 2: Developmental** | Encounter → Consequence → Next Encounter | Did encounter N+1 feel different because of what happened in encounter N? |
| **Loop 3: Transformational** | Session → Stage Transition → New World | Did the user cross a threshold and feel the world change? |

**Current state (2026-07-06):** All three loops are open.
**After P0 fixes:** Loop 1 partially closes (reflections can be answered, but responses are generic).
**After P1 fixes:** Loop 1 fully closes (NPCs and consequences surface), Loop 2 begins to close (consequences visible), Loop 3 begins to close (progression visible).
**After P2 fixes:** All three loops close for the no-LLM path. LLM path closes them with much higher quality.

**The north star:** A user who plays for 30 minutes should be able to point to one moment where Loop 1 closed (they answered something and felt heard), one moment where Loop 2 closed (the next encounter built on the last), and a sense that Loop 3 is approachable (they can see the next threshold). If all three are present, the game is efficacious. If any is missing, the game is not yet doing its job.

---

## 10. Appendix A — Root Cause Map

For every experiential finding in §3–5, the exact code location and root cause.

| Finding | Symptom | File:Line | Root Cause |
|---|---|---|---|
| P0-1 | `line is not defined` | `scripts/cli-game.ts:884` | `header: line` references variable not in `runAgenticEncounter`'s lexical scope. Should be `encLine`. |
| P0-2 | `--dev` no-op in session | `scripts/cli-game.ts:2167` | `DEV_MODE` only checked in `runStatus()`, not in session functions. |
| P0-3 | `status --json` broken | `scripts/cli-game.ts:2096` | `runStatus()` has no `JSON_MODE` branch. |
| P0-4 | Interactive hangs in non-TTY | `scripts/cli-game.ts:1` (top-level) | No `process.stdin.isTTY` check before invoking `@clack/prompts`. |
| P1-1 | Narrative truncation | `scripts/cli-game.ts:1209, 1695` | `slice(0, 120)` cuts mid-word. No word-boundary awareness. |
| P1-2 | Hidden NPCs | `src/core/agent/PersistentAgent.ts:245` | Fallback narratives are generic; NPC data not threaded to UI. |
| P1-3 | No progression | `src/core/engines/TransformationDetector.ts:38` | `SATURATION_THRESHOLD = 20` too high for no-LLM mode. |
| P1-4 | Repetitive narratives | `src/core/agent/PersistentAgent.ts:244` | 8 templates, cycled by counter, no modality/NPC variation. |
| P1-5 | No input validation | `scripts/cli-game.ts:191-193` | `as` type assertion, no runtime check. |
| P1-6 | `--modality` vs `--force-shadow` | `scripts/cli-game.ts:41, 193` | Two different code paths with overlapping names. |
| P2-1 | Session counter confusing | `src/core/GameLoop.ts:679, 797` | `totalSessions` increments on every `endSession()` call, including failed runs. |
| P2-2 | Vocabulary wall | (project-wide) | No `glossary` command; terms used in CLI without definition. |
| P2-3 | `[power]` label static | `scripts/cli-game.ts:~2155` | Aesthetic label for Red stage; never changes because user is stuck at Red. |
| P2-4 | `--encounters` cap silent | `scripts/cli-game.ts:1168` | `Math.min(encounterCount, 8)` with no warning. |

---

## 11. Appendix B — The Fresh User's Verbatim Verdict

Preserved for posterity. This is the deliverable.

> *"There is something real buried in here — a serious contemplative-development simulation with a thoughtful question bank and a sound arc structure. But the default-state UX is so broken (Direct Questioning fails 100% of the time, `--dev` does nothing, interactive mode hangs, narrative truncates, stage never progresses, hidden world stays hidden) that I would not have stayed past command 5 if I weren't being paid to. The healing promise can't land because the encounter loop never closes. Fix the `line is not defined` bug first; everything else is downstream of that."*

---

## 12. Appendix C — Methodology Notes for Future Audits

### 12.1 Why this audit caught P0-1 and R1/R2 didn't

R1 and R2 both ran smoke tests with `--agent` (Story-Driven mode), which bypasses `runDirectQuestioningSession` and the P0-1 bug. R3 deployed a subagent that was explicitly instructed to "try the bare command first, then `--help`, then a few obvious flags" — which led it to `--headless --no-llm` (the default state) and the bug.

**Lesson for future audits:** Always test the *default* state (no flags, no configuration) before testing configured states. The default state is what every fresh user hits.

### 12.2 Why the subagent was forbidden from reading source

A real fresh user doesn't read your source code. If the audit subagent reads source, it starts to "understand" the system in a way no user ever will, and its observations become developer observations, not user observations. The forbidden-source constraint is what produces genuine experiential data.

**Lesson for future audits:** The simulation subagent must be sandboxed from the codebase. Its only interface is the terminal.

### 12.3 Why the parent agent cross-referenced with source

The subagent's journal is experiential data. The parent agent's cross-referencing is what turns experiential data into actionable fixes. Without cross-referencing, the journal is just "the user was confused." With cross-referencing, it's "the user was confused because `header: line` at line 884 references a variable not in lexical scope; here's the one-line fix."

**Lesson for future audits:** Two-agent protocol — sandboxed simulator + cross-referencing parent — produces strictly better signal than either alone.

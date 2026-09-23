# Module Cohesion Audit — 2026-09-24

**Scope:** every `.ts` file in `src/`, `scripts/` and `tests/` (524 files, 92 254 lines), measured by
line count, export surface and declared section structure, then judged by **responsibility** — not by
size.

**Why this exists.** The checked-surface sweep (`CHECKED-SURFACE-AUDIT-2026-09-24`) found defects that
lived where no gate looks. This audit asks the adjacent question: where is code so large that no
reader — human or agent — holds it in view at once, and therefore where do the *next* such defects
accumulate? It also ratifies the **doctrine** those splits must follow, so future splitting is
principled rather than cosmetic.

> **Status of this document.** §2 is **normative** (the doctrine; standing rules are also carried in
> `AGENTS.md §7.4` as `M1–M10`). §3–§6 are the **dated findings** for this measurement. **Landing
> status:** the prerequisite gate (`G37`) and the doctrine landed 2026-09-24 (`MODULE-COHESION` items
> 0, and §5's two hard gates); the seven splits in §4 remain open and are scheduled — see the plan's
> Phase 14 d3 and the §4 status column for the honest per-item state.

---

## 1. What was measured (and what the distribution says)

| Bucket | Files | Lines | Share of lines |
|---|---|---|---|
| 0–150 | 358 | 26 654 | 29 % |
| 150–300 | 96 | 20 120 | 22 % |
| 300–500 | 44 | 16 599 | 18 % |
| 500–1 000 | 19 | 12 324 | 13 % |
| **1 000+** | **7** | **16 557** | **18 %** |

| Group | Files | Lines | > 500 | > 1 000 |
|---|---|---|---|---|
| `src/` | 379 | 62 336 | 21 | 6 |
| `tests/` | 136 | 22 741 | 3 | 0 |
| `scripts/` | 9 | 7 177 | 2 | 1 |

**Median 109 lines. p90 = 367 lines.**

**The finding is the shape, not the count.** This is not a codebase riddled with monoliths: it is a
healthy long tail — *median 109 lines* — with **seven concentrated outliers** holding 18 % of all code.
That is a much narrower problem than "everything is too big", and it is the reason this audit does not
recommend a sweeping refactor. §3 confirms the shape: of the seven, four are genuine
multi-responsibility files (Tier A) and three carry embedded data or a single over-long function
(Tier B) — and **most of the 19 files in the 500–1 000 band are cohesive and should be left alone**, as
§3 Tier C records.

---

## 2. The doctrine (normative)

The source is Apollo GraphQL's *Rust Best Practices Handbook* (Chapter 1 §1.6, §1.8; Chapter 5).
Its **transferable claims are about structure and naming**, not about Rust: extraction has a cost, a
wrong abstraction is harder to remove than duplication, and length is a *smell* rather than a verdict.
Each rule below is the TypeScript form of that claim, with the mechanism this repo already has.

### M1 — The unit of cohesion is a **responsibility**, not a line count

A 600-line module with one responsibility and a clear name is healthy. A 200-line module with three
responsibilities is not. Every proposal in §3 therefore states the **responsibilities it separates**,
never "this file is long".

### M2 — Extraction rule: Rule of Three; duplication over wrong abstraction

- Extract when the logic appears in **3+ places AND represents the same decision**.
- **Never** extract 1–2 lines used fewer than three times; that is pure indirection.
- The classic smell of a wrong abstraction is a **flag parameter** — `render(x, true)`. The TypeScript
  fix is a **discriminated union** (or a two-variant literal type), not a second boolean.
- Do not extract because a file is long. *"Duplication is far cheaper than the wrong abstraction."*
  Applied to this repo: `encounterLine()` (this week's `ConsequenceRecord` work) is a correct
  extraction — one decision, two callers, and the name carries meaning; the five retired clinical
  renderers were the opposite — near-duplicates that had lost every caller.
- **Unwind rather than patch** a wrong abstraction: re-inline its body into every call site, reduce
  what is now literal, and re-derive the abstraction from what actually remains (possibly nothing).

### M3 — Long functions become **named steps**, not longer comments

If a function needs a comment block narrating *"first we validate… then we decode… then we
authorize…"*, that comment is a split signal. Replace it with named calls whose names carry the
meaning (`validateRequestHeaders(&request)`), so the reader gets the story from structure.
**This is the single highest-yield rule in this repo**, because the CLI's session flows are written as
narrated steps.

### M4 — Comments explain **why**; doc-comments explain **what/how**

- `//` = why: a non-obvious constraint, a workaround, a tradeoff. Link the authority (`43 §5.5`,
  `MY-AD-0029`) rather than restating it.
- `/** */` = what/how, for a module or an exported symbol.
- A comment that narrates *what the next three lines do* is a defect (M3).
- **A `TODO` must name its owner.** This repo's owner is a record id (`MY-AD-*` / `MY-RG-*`) or the
  plan — an unowned `TODO` is a promise nobody can collect. When a stale comment is found, fix or
  delete it in the same commit; *a misleading comment is worse than none*.
- **Comments are claims and must be re-verified.** The `White` ladder survived three days partly
  because a comment asserted a convention the code had stopped following.

### M5 — Types are the primary documentation (the type-state analogue)

Rust's type-state pattern encodes valid states so invalid operations fail to compile. TypeScript's
equivalents, already used in this repo:

| Rust | TypeScript here |
|---|---|
| Type-state (`Connection<Connected>`) | Literal unions that make illegal states unrepresentable — `Vow.status?: 'active' \| 'fulfilled' \| 'lapsed' \| 'renegotiated'`, and `evaluateChoice` as the *only* producer of the harvest event (`MY-RG-0030`) |
| Newtype wrappers | `readonly` domain interfaces (`ConsequenceRecord`, `PolarityTrace`) + `Line` / `Stage` / `Drive` literal unions instead of `string` |
| `Option<T>` vs a sentinel | `T \| undefined` with an **honest** optionality comment; never a magic value |
| Exhaustive `match` | `switch` over a literal union with `noFallthroughCasesInSwitch`, or a `Record<Union, X>` |
| Multiple `bool` flags | One discriminated union on a `kind` field |

Corollary the repo learned the hard way: **if a value is derived from a canonical constant, import it.**
Re-declaring it in a second place is how a retired stage (`White`) stayed alive in four ladders
(`CHECKED-SURFACE-AUDIT §10.4`).

### M6 — Never `throw` across a seam that must degrade

This repo's runtime law is *degrade, never break the frame*: a missing service, an absent model or an
empty library must produce a lawful default, not an exception (`45 §5`; the `sessionRuntime` seam
documents this explicitly). So:

- A **seam** returns a result union or `undefined`; the caller defaults.
- A `throw` inside a seam is a defect unless the seam is documented as fail-closed **by design**
  (the kernel gates and the firewall are — they are the exception, and they say so).

### M7 — Tests are **DAMP**, not DRY

Prefer *Descriptive And Meaningful Phrases*: each test reads as a self-contained story (setup → action
→ assertion) without the reader chasing helpers. **Share fixtures; keep actions and assertions inline.**
Tests have no tests — logic hidden in a shared helper is untested logic that silently weakens
everything built on it. This is why `tests/` shows 0 files over 1 000 lines and 136 files with a median
well under the `src/` median: long test *files* are usually fine (many independent stories), long test
*helpers* are the risk.

### M8 — Import ordering is not decoration

Order: **stdlib → external packages → workspace aliases (`@core/…`, `$shared/…`) → relative paths**,
and never a **second binding for a canonical constant**. A shadowing local `const { ALL_STAGES } =
await import(...)` beside a module-level `ALL_STAGES` import is a defect class this repo has already
paid for (audit §10.4): it *looks* equivalent and is a separate value that can drift.

### M9 — No file may live outside the checked graph

A file that `tsc`, the tests, the gates or the linter do not read is unverified **by construction** —
the root cause of both the non-bootable CLI and the `White` ladder. This is an assertion, not advice:
it becomes **`G37`** (Phase 14 d5).

### M10 — Advisory bands, with a required justification above them

| Band | Expectation |
|---|---|
| ≤ 300 lines | normal; nothing required |
| 300–500 | the file should have one nameable responsibility |
| 500–1 000 | **justify in the module doc-comment** — one responsibility, stated |
| > 1 000 | **split candidate by default.** Staying whole requires a documented reason (a generated table, a state machine that must be read in one place, a single class whose collaborators would be pure indirection) |

Bands are **advisory**, deliberately: M1 says length is a smell. Enforcing a line ceiling would
manufacture exactly the wrong abstractions M2 warns about. What is *enforced* is M9.

---

## 3. The audited outliers

### Tier A — genuine multi-responsibility files (split candidates)

| File | Lines | Why it is a monolith | Proposed separation |
|---|---|---|---|
| `scripts/cli-game.ts` | **5 770** | **73 top-level functions, 0 exports, 29 sections.** Holds: argv/env bootstrap · holon loading · calibration · significator creation · **two complete session flows** (direct + story) · 18 subcommand implementations · ~15 render helpers. Nothing here is importable, so nothing here is testable in isolation — `tests/cli/` covers one 120-line helpers module. | `cli/parse` (commander surface + env bootstrap) · `cli/runtime` (session flows, services, checkpoint/journal) · `cli/commands/*` (one module per subcommand) · `cli/render` (banner/info/success/warn/error, stage colour, sparkline). Thin `cli-game.ts` entry. **This is Phase 14 d3**, and the calibration block moves to `src/core/` in the same pass (user-ratified Q10). |
| `src/core/validation/gates.ts` | **2 042** | **34 exported gate validators in one file**, plus harness fixtures. Gates are independent assertions with independent evidence needs; one file means every gate edit rebases against 33 unrelated ones, and G16/G18 already live in *their own* modules (`practice/practiceTools.ts`, `pods/podStateMachine.ts`) — so the split is already the established pattern. | `validation/gates/<family>.ts` — e.g. `foundations.ts` (reproducibility/divergence/coherence), `development.ts` (transformation/levelling/forgetting-curve), `firewalls.ts` (identity/veil/inference-write/retrieval/preference), `council.ts`, `personalization.ts`, `corpus.ts` — plus `gates/index.ts` re-exporting the roster so the runner and `_org.yaml → gates` are unchanged. |
| `src/core/assessments/cli/TaskRenderers.ts` | **1 878** | **24 `renderX` functions across 22 declared sections** — one per task type. Each renderer is independent; the file is a directory pretending to be a module. | `assessments/cli/renderers/<group>.ts` — `brainGames.ts` (n-back, stroop, go/no-go, hold, reaction-time), `social.ts` (cooperation, imitation, dilemma), `reflective.ts` (self-report, value-ranking, emotion-id, rhythm), `probes.ts` (line-probe family) — with an index preserving the current import surface. |
| `src/core/assessments/AgenticOrchestrator.ts` | **2 878** | **A single 2 878-line class.** Its collaborators are implicit: prompt assembly, answer evaluation, delegation, result mapping, state accumulation. Class size at this scale means every method can reach every field, so the *actual* dependency graph is invisible. | Extract the collaborators the methods already imply: a prompt builder, an evaluator, a result mapper — each a module with an honest signature. The class becomes orchestration over them. **Highest-risk split in the list** (most-tested surface: 645-line test file), so it should be incremental, one collaborator per commit. |

### Tier B — one responsibility, but carrying embedded data or a long function

| File | Lines | The actual problem | Proposed move |
|---|---|---|---|
| `src/core/fallback/FallbackProvider.ts` | **1 632** | Only **4 exports** and 5 locals — the line count is **embedded fallback corpus**, not logic. Data masquerading as code: a prose change now shows up as a code diff. | Extract the pools to data modules (`.json` or `fallback/data/*.ts` typed constants); keep the selector logic. Then M3 applies to the selector. |
| `src/infra/llm/ContextPipeline.ts` | **680** | **1 export (`buildContext`), 15 local helpers.** This is a long *function*, not many responsibilities. | Apply M3: promote the 15 helpers into a `blocks/` module set, each named for the block it renders (`continuityBlock`, `holonDigestBlock`, …), so `buildContext` reads as a list of steps and each block becomes unit-testable. |
| `src/core/personalization/sessionRuntime.ts` | **926** | **20 exports across 11 declared sections** — facet store singleton · services factory · envelope builder · digest blocks · seeds · session-end drain · polarity advance · coverage · dev-loop read · ratification. Multi-responsibility. **BUT** its doc-comment deliberately declares it the *ONE seam* every caller goes through, for the degradation law (M6). | Split the file by section, then **re-export from an `index.ts` so the seam survives** — the seam is an *interface* contract, not a file. Do not weaken the single-entry property while splitting. |

### Tier C — cohesive; leave alone

Recorded so the next reader does not "fix" them:

| File | Lines | Why it stays whole |
|---|---|---|
| `src/core/engines/AutoModeStrategy.ts` | 840 | 10 exports, all strategy derivation for one decision (what should this session do). One responsibility, one name. |
| `src/core/engines/CCIEngine.ts` | 911 | 14 exports = 5 normalisers + 8 signal derivations + `computeCCI`. A composite index and its components belong in view together; the exports are the API of one metric. |
| `src/core/orchestration/delegate.ts` | 1 101 | 6 exports, all steps of one operation (spec validation → policy → execution → scoring → veil check → ratification). Cohesive by construction; splitting would scatter a single audit trail. |
| `src/core/engines/CandidateGeneration.ts` | 773 | 5 exports, one pipeline. |
| `src/core/GameLoop.ts` | 1 263 | 8 exports across two adjacent halves (session lifecycle, encounter execution) — a **borderline** case. Not split here: the halves share `SessionState` mutation, and separating them without a type-level seam (M5) would create the wrong abstraction. Revisit if `SessionState` gains its own module. |
| `src/core/engines/ConsequenceEngine.ts` | 639 | 3 exports (`processOutcome`, `encounterLine`, `applyConsequences`) — the consequence pipeline, freshly de-duplicated. |
| `tests/postplan/Frontier.test.ts` | 741 | **DAMP (M7):** many self-contained stories in one file, 0 shared-mutable-state risk. Long test files are not the concern; long test *helpers* are. |
| `tests/core/assessments/AgenticOrchestrator.test.ts` | 645 | Same — and it is the safety net for the Tier-A split of that class, so it should grow, not shrink. |

---

## 4. Actionable backlog

| # | Item | Band | Status |
|---|---|---|---|
| 0 | **Prerequisite: `G37` must land before any split** | — | ✅ **DONE 2026-09-24** (Phase 14 d5) — every production `.ts` is now inside the tsconfig `include`, so a new file cannot escape the graph, and no module may rebuild a canonical set. The *scaffolder↔linter↔indexer* lesson from `KOSMOS-RG-008` applied to this repo's own gate |
| 1 | `cli-game.ts` split + calibration extraction to `src/core/` | > 1 000 | ✅ **DONE 2026-09-24** — the calibration block landed (Phase 14 **d3**, `InitialAltitudeInference` + `QuickCalibrationScoring`, commit `e5e536f`), and **all four split stages are in**: A `config.ts` · `data.ts` · `render.ts` (the pure helpers, unit-tested by `tests/cli/RenderHelpers.test.ts`); B `flags.ts` (the invocation state, `VERBOSE` derived once); C `output.ts` (the flag-reading printers + `readActiveFocus`); D `support.ts` · `onboarding.ts` · `profileCmd.ts` · `practiceCmd.ts` · `delegateCmd.ts` · `runtime.ts` (one leaf per responsibility, moved in dependency order so no cycle could form). **The entry is 775 lines** — the commander chain, the start-up phases, and `main()`. The D-stage losslessness check was run depth-normalized (the moved bodies' dynamic imports changed `'../src/'` → `'../../src/'`) and found **4 line-level deltas, all intentional re-points** of the two root-coupled reads the split surfaced: `opts.audit`/`opts.llm` → `AUDIT`/`HEADLESS_LLM` in the flags owner, and `llmComplete` → `LLM_ACTIVE` — the audit-flag and llm-flag state now comes from the same owner as every other flag instead of reaching back into `program.opts()` mid-flow |
| 2 | `gates.ts` split by family + `index.ts` roster | > 1 000 | ✅ **DONE 2026-09-24** — nine family files under `validation/gates/` (`plumbing` · `roster` · `trajectory` G1–G9 · `veil` G10–G12 · `curriculum` G17–G21 · `orchestration` G14/G15/G26 · `personalization` G22–G25/G27 · `memory` G28–G35 · `surface` G36–G38); `gates.ts` is now a 33-line index whose re-export roster IS the public surface. The landed families are named for the *domain* they assert, not for the list-of-concerns proposed above |
| 3 | `TaskRenderers.ts` split by renderer group | > 1 000 | ✅ **DONE 2026-09-24** — six files under `assessments/cli/renderers/` (`shared` · `brainGames` · `social` · `reflective` · `probes` · `generic`); `TaskRenderers.ts` is a 127-line index that re-exports the 24 renderers **by name** (not `export *`, so the family files keep their palettes and tables private) and keeps `getRenderer`, whose dispatch table is the one reader of the whole set. A named `TaskRenderer` type replaced the 24 inline repeats of the return shape |
| 4 | `AgenticOrchestrator` collaborator extraction | > 1 000 | ✅ **DONE 2026-09-24** — six collaborators extracted: `shadowSignals.ts` (both shadow-keyword detectors as ONE reading with a locked precedence), `promptBlocks.ts` (journey blocks), `fallbackNarrative.ts` (degradation narrative; player's words never quoted back), and `taskPresenters.ts` (the task presenters — `selectTaskForModality`'s preference order, `generateModalityFallbackTask`'s per-modality fallbacks, `presentModuleTask`'s narrative framing — extracted with the state they read passed IN: history and UI handler are parameters, and the trial-evaluation wire-back (`setRendererEvaluate`/`setTaskStartTime` accessors) keeps timing+accuracy capture exactly where it was). 2 878 → **2 629**; remaining bulk is the encounter loop itself, which is the class's one responsibility |
| 5 | `FallbackProvider.ts` data extraction | > 1 000 | ✅ **DONE 2026-09-24** — 1 632 → **558** lines. The corpus moved to `fallback/data/` (`schema` + `languageReflective` · `scenarioChoice` · `embodied` · `deterministic` · `generic`, 98 pools); the provider keeps the routing tables, the reframe layers and `getFallback`. `FallbackContent` is re-exported so the public surface is unchanged |
| 6 | `ContextPipeline.ts` block promotion (M3) | 500–1 000 | ✅ **DONE 2026-09-24** — the 15 builders moved to `infra/llm/contextBlocks.ts`; `buildContext` is now a list of named steps. The split also surfaced a live Veil leak (a shadow label rendered into a prompt block) |
| 7 | `sessionRuntime.ts` split behind an index re-export | 500–1 000 | ✅ **DONE 2026-09-24** — 926 → **56** lines (index) + nine modules under `sessionRuntime/` (`store` · `services` · `envelope` · `scope` · `digest` · `seeds` · `sessionEnd` · `devLoop` · `checkpoint`). The seam survived exactly as `M6` demands: the index is the only import path, and its doc-comment now states the rule ("a seam is an INTERFACE contract, not a file") so the next reader does not mistake the split for a permission to reach past it |
| 8 | `GameLoop.ts` — revisit only if `SessionState` becomes its own module | 1 000+ | **Not now** (Tier C) |

**What landed with the doctrine (2026-09-24):** item 0, plus the *doctrine itself* — `M1–M10` in
`AGENTS.md §7.4` and §2 of this document. Two of the ten rules are now enforced rather than advised:
**M9** by `G37` (no file outside the checked graph) and **M8**'s "never a second binding for a
canonical constant" by `G37`'s second assertion (which found and closed 25 re-declarations on its
first run). The enforced rule is the one the check-hard-way class needed: *a large file is a
decision someone made, not a fact nobody noticed* — and the difference between the two is whether a
reader can be forced to see it.

**Sequencing note:** item 2 (or any split) should land *after* item 0 — a new file created outside the
checked graph is unverified at birth, which is the failure this audit exists to prevent.

### The CLI split — the four stages (item 1, complete)

Stage A extracted what could move *without* touching module state; B, C and D were defined by the same boundary, each shippable on its own because the CLI is exercised by `G36` (boot, both modes) plus `tests/cli/CliMatrix.test.ts` (the subcommand surface). **All four are DONE** — the table records what each moved and what the move caught:

| Stage | What moved | Status |
|---|---|---|
| **B — flags** | `scripts/cli/flags.ts` (131 lines): the parsed option state (`HEADLESS`, `JSON_MODE`, `VERBOSE`, `DEV_MODE`, `FORCE_*`, `NEW_GAME`, `SKIP_CALIBRATION`, `encounters`, `USER_ANSWERS`) behind explicit setters, initialised once by the entry after `program.parse`. | ✅ **DONE 2026-09-24** — the module owns the state *and* the derivation that used to be scattered: `setInvocation` computes the `VERBOSE = RAW_VERBOSE && DEV_MODE` relation once instead of at every reader, and `HEADLESS` stays the one deliberate `let` (the non-TTY guard in `main()` flips it) behind `setHeadless`. This is the prerequisite for C and D, which is why it landed first |
| **C — printers** | `scripts/cli/output.ts` (342 lines): `banner` · `info` · `success` · `warn` · `error` · `separator` · `verbose` · `emitEvent` · `emitDevPrimitives` · the session renderers (`renderSessionPosition`, `renderLinesProgress`, `printSignificator`, `printEncounter`, `renderPostSessionSummary`, `renderPrerequisiteGaps`) · plus `readActiveFocus` (it exists only to be printed, and rendering it in two places is why it was reached for twice). | ✅ **DONE 2026-09-24** — the flag-READING half of the output is now separate from the pure half (`render.ts`, which imports no state), and that is the testability line this audit was after: `render.ts` carries `tests/cli/RenderHelpers.test.ts`, `output.ts` is exercised by `tests/cli/CliMatrix.test.ts`. **Two defects were caught by the post-stage losslessness check rather than by `tsc`**: the block scanner swallowed the trailing `program.parse()` invocation block into the new module (leaving the CLI parsing nothing) and mis-scoped import pruning dropped `Option` from `commander`, silently resolving it to the DOM global `HTMLOptionElement`. Neither is a type error at the seam — both are why the check is part of the method |
| **D — commands + flows** | `scripts/cli/commands/*.ts` (one module per subcommand: `runProfile`, `runDiagnostic`, `runSingleEncounter`, the `runAgenticEncounter` drill, …) and `scripts/cli/runtime.ts` (the two session flows: `runDirectQuestioningSession`, `runFullSession`). The entry keeps the commander chain and `main()`. | ✅ **DONE 2026-09-24** — landed as six leaves rather than a `commands/` directory: `support.ts` (495 — the shared bottom of the call graph) · `onboarding.ts` (537 — calibration, default significator, `setup`) · `profileCmd.ts` (883 — `profile`/`status`/`glossary`/`events`/`privacy`) · `practiceCmd.ts` (291 — `vow`/`pod`/`credential`) · `delegateCmd.ts` (242 — the council surface) · `runtime.ts` (2 246 — `executeEncounter`, the agentic drill, `runDiagnostic`, `runSingleEncounter`, the integration ritual, and the two session flows). The entry is **775 lines**. Moved in dependency order (support → onboarding → commands → runtime) so no cycle could form; the two root-coupled reads the flows had (`opts.audit`/`opts.llm`, `llmComplete`) were re-pointed at the flags owner (`AUDIT`/`HEADLESS_LLM`, `LLM_ACTIVE`) rather than exported out of the entry. Verified by the strongest check in the sequence: G36 boots both modes headless and requires a persisted checkpoint — the behaviour this stage could have broken silently |

**How to verify each stage:** `npx tsc --noEmit` (0) · `npx vitest run tests/cli tests/validation` (E `G36` boots both `SESSION_MODES` headless against a throwaway `MYSTERIUM_HOME`) · `npm run build` · `python3 scripts/arch.py validate` · plus a losslessness check against the pre-stage file (the code-line multiset, minus the `export ` prefixes) — the check that caught a whole async function being swallowed when the first pass used a scanner that did not know `async function` starts a declaration.

---

## 5. Enforcement

| Mechanism | Kind | Status |
|---|---|---|
| **`G37` checked-graph assertion** (every production `.ts` is inside the `tsconfig` include set) | **hard gate** | ✅ **BUILT** — Phase 14 d5 (`gates.ts`, kernel gate 37) |
| `G37` second assertion (no module re-declares a canonical domain constant) | **hard gate** | ✅ **BUILT** — found and closed **25** re-declarations on its first run; 3 documented exemptions |
| `G36` CLI boot smoke (both session modes, exit 0 + completed session + persisted checkpoint) | **hard gate** | ✅ **BUILT** — Phase 14 d5. Not a cohesion gate, but it is what makes a split *verifiable*: the entry point is the surface every split of item 1 must keep honest |
| Large-file report (`> 500` / `> 1 000` with the module's declared responsibility) | **advisory report** | this document, re-measured per audit |
| Doc-governance gates (`arch.py validate`, DG1–DG23) | hard gates | green |

**Deliberately not built:** a hard line-count ceiling. M2 says a wrong abstraction costs more than
duplication; a ceiling would manufacture them. What is enforced is *visibility* (M9, the report), so a
growing file is a decision someone made, not a fact nobody noticed.

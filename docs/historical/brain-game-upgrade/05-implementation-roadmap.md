# 05 — Implementation Roadmap

> Phased delivery A→E. Each phase is independently shippable, keeps the full test suite green (793 passing at plan time), and follows the AGENTS.md §7.5 iteration protocol (workspace-lint → build+test → commit → push both remotes).

Dependency chain: **A → B → C → D → E**. Phases A and B touch disjoint modules and could partially overlap, but the regression gate favors strict sequence.

---

## Phase A — BrainGameEngine kernel (closes G2, G7)

**Goal:** real multi-trial games with precise timing exist as pure core code, provable without any LLM.

| # | Task | Notes |
|---|---|---|
| A1 | `core/braingame/types.ts` — ParadigmDefinition, StimulusDescriptor, GameSessionState, TrialRecord, ParamSpace | Types only; frozen early |
| A2 | `core/braingame/TrialClock.ts` — hrtime.bigint measurement + calibration offset constant | Unit tests with fake clocks |
| A3 | Extract 3 paradigms first: `n_back`, `reaction_time`, `pattern_prediction` from TaskRenderers logic into `core/braingame/paradigms/` | Keep old renderers untouched |
| A4 | `BrainGameEngine.ts` state machine + CLI stimulus renderer for descriptors (grid/stream/mcq kinds) | Raw-mode keypress input for timed trials; line input otherwise |
| A5 | `mysterium train --free <paradigmId>` command wired through engine directly | Integration seam: headless `--answer` mode works per-trial |
| A6 | Tests: engine loops, timing math, descriptor rendering, abort/persist-resume | |

**Acceptance:** a player can play a 12-trial N-back with per-trial RT recorded at sub-ms precision, difficulty stepping across trials, Ctrl-C resume. All legacy tests pass.

## Phase B — Adaptive difficulty (closes G3 ★)

**Goal:** difficulty adapts to the individual, persists, and self-corrects.

| # | Task | Notes |
|---|---|---|
| B1 | `core/adaptive/AdaptiveDifficultyService.ts` — WeightedUpDownStaircase + CompositeAccuracyRt strategies operating on paramSpace | Pure functions; synthetic-user simulation test (lumosity.md mitigation) |
| B2 | Guardrails: forced-ease after 3 fails; ceiling hold; step-size shrink on reversals | Property-based tests for non-oscillation |
| B3 | `CalibrationStore.ts` over KeyValueStore; NodeKeyValueStore file adapter in infra | Validate-on-load with shims |
| B4 | First-exposure calibration block (wide exploration → narrow) wired into engine start when no baseline exists | Also exposed as `mysterium calibrate` |
| B5 | Wire service into BrainGameEngine + `run_brain_game` difficulty resolution path | |

**Acceptance:** simulated players (strong/weak/noisy) converge to distinct stable difficulty bands within 2 sessions; calibration survives restart.

## Phase C — Trial telemetry + cognitive index (closes G4, G5, G8)

**Goal:** every trial lands in durable history; skill scores normalize and decay.

| # | Task | Notes |
|---|---|---|
| C1 | `TrialRecordStore.ts` — append + compaction + bounded ring buffers; encrypted-at-rest via existing crypto pattern | Size cap tests |
| C2 | Remaining paradigms extracted to registry (stroop, go_no_go, rhythm, hold, emotion_identification, dilemma, scenario, value_ranking, imitation, cooperation) | Registry lookup replaces getRenderer dispatch inside engine path |
| C3 | `CognitiveIndex.ts` — self-referenced z-normalization, domain aggregation, exponential decay on session start (ForgettingCurve math idioms) | |
| C4 | Retarget SRS review candidates at skill records alongside curriculum concepts | Extends, does not modify, curriculum behavior |
| C5 | Index update hook on workout completion; profile save integration | |

**Acceptance:** after two sessions, `insights`-ready data exists: per-domain scores, trends computed from stored trials; store stays under size budget after 500 trials.

## Phase D — Agentic integration (closes G1, G6 — the headline)

**Goal:** the agent executes and orchestrates brain games inside sessions.

| # | Task | Notes |
|---|---|---|
| D1 | `WorkoutPlanner.ts` + `FatigueMonitor.ts`; bridge to AutoModeStrategy bias + EncounterScheduler slot types | Planner output persisted for resume |
| D2 | Register the five new tools (`04-agent-tool-spec.md`) in TOOLS + execution switch in orchestrator `run()` | Tool-result messages follow existing format |
| D3 | System-prompt rules 8–11 amendments; forcing message on workout budget exhaustion | Mirrors ask-budget mechanism |
| D4 | Workout slots in GameLoop tick dispatch (narrative encounter OR training beat) | Arcs/budgets/safety overrides preserved |
| D5 | Veil pass: audit every new player-facing string routes felt-sense framing; add `feltSenseHint` generation to summaries | Precedent cciToFeltSense |
| D6 | Failure integrity: LLM-off fallback sequencing; SIGINT persistence; per-paradigm crash isolation | |
| D7 | Council-style review of tool schemas vs prompt-injection surface (tool results are untrusted-ish input) | |

**Acceptance:** end-to-end agentic session: agent frames a workout, runs 3 games via tools, interprets summaries in fiction, completes workout; index updates persist. Works with LLM offline.

## Phase E — Insights, accessibility, polish (closes G10, G11)

**Goal:** retention loop and inclusivity.

| # | Task | Notes |
|---|---|---|
| E1 | `mysterium insights [--days N]` — sparklines/trends from trial store, felt-sense framed | Reuses chart idioms |
| E2 | Accessibility: symbol alternatives for color-dependent paradigms (Stroop), configurable stimulus durations, non-timed practice mode flag | Per references R6 |
| E3 | Non-TTY degradation: pipe-safe output, JSON event stream completion for automation | |
| E4 | Export API (JSON/CSV) for trial data | Local-only, opt-in |
| E5 | Docs: architecture doc for braingame subsystem; concept-draft cross-references updated | AGENTS.md §3.2 protocol |
| E6 | Full regression sweep incl. fresh-user CLI walkthrough | |

**Acceptance:** colorblind-complete Stroop; practice mode; insights chart renders from real history; docs updated; all gates green.

---

## Cross-phase constraints

1. **No regression:** every task lands with `npm run build && npm test` green. Legacy MCQ narrative path remains functional throughout migration (old renderer retained until C2 completes).
2. **Veil audits** at D5 and E1 — any leaked metric is a release blocker.
3. **Concept-draft grounding:** paradigm extraction maps to existing concept-drafts; genuinely new games (e.g., math family) require a draft first (AGENTS.md §4.3).
4. **Commit discipline:** one logical change per commit; push origin AND gitlab.
5. **Uniqueness principle:** this directory describes implementation deltas; theory lives in foundations/ (esp. 08-psychophysics-and-staircase.md); no duplication.

## Out of scope (explicitly deferred)

- Bayesian/KBT adaptive algorithms (post-v1 upgrade path noted in B1)
- TUI framework adoption (Ink/blessed)
- Population-normed baselines & leaderboards (canon conflict)
- Cloud sync of training telemetry
- WebUI parity for training surfaces (CLI-first; WebUI reuses same core services later)

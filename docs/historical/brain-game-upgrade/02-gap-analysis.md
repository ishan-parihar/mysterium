# 02 — Gap Analysis

> Reference requirement vs codebase reality, requirement by requirement. Severity: **BLOCKER** (prevents the upgrade's goal), **HIGH** (core training value), **MEDIUM** (retention/polish). Each row names the reuse path — what existing code the solution builds on.

Sources: requirements R1–R7 from [01-reference-synthesis.md](01-reference-synthesis.md); codebase facts from [00-current-state-audit.md](00-current-state-audit.md).

---

## Master matrix

| # | Requirement | Codebase reality | Gap severity | Reuse path |
|---|---|---|---|---|
| G1 | Agent tools that execute/orchestrate games (R5+R2) | Orchestrator has exactly 2 tools: `ask_user_question`, `complete_encounter` (`AgenticOrchestrator.ts:57–160`) | **BLOCKER** | Extend `TOOLS` array + tool-execution switch in `run()`; new core services behind them |
| G2 | Multi-trial game sessions (R5) | Every paradigm collapses to one MCQ via `presentModuleTask` (`AgenticOrchestrator.ts:1462–1490`); renderers return `{prompt, evaluate}` for a single exchange | **BLOCKER** | New `BrainGameEngine` in `core/` wrapping TaskRenderers' stimulus logic into trial loops |
| G3 | Adaptive difficulty engine (R1) ★ | Static `STAGE_DIFFICULTY[stage]` (`TaskRenderers.ts:70–85`); naive +0.05 ramp in `itemSelection.ts:44–64`; nothing persisted | **HIGH** | New `AdaptiveDifficultyService`; theory already specified in `docs/foundations/08-psychophysics-and-staircase.md` |
| G4 | Trial-level event persistence (R4) | `TrialResult` computed in memory, discarded post-session; generic encrypted `TelemetryStore` exists but unwired to trials | **HIGH** | `TrialRecordStore` over existing `KeyValueStore` port; ring-buffer + summary index |
| G5 | Normalized per-domain index with decay (R3) | CCI covers developmental composite; no per-paradigm/domain skill index; no decay on skills | **HIGH** | `CognitiveIndex` service reusing CCI normalization idioms + ForgettingCurve decay math |
| G6 | Workout orchestration for games (R2) | Rich session strategy exists but schedules narrative encounters only (`AutoModeStrategy`, `EncounterScheduler`) | **HIGH** | `WorkoutPlanner` bridging AutoModeStrategy outputs to BrainGameEngine sessions |
| G7 | High-resolution timing (R6) | `Date.now()` bookends around whole MCQ exchange (`AgenticOrchestrator.ts:1055,1067,1477`); coarse RT buckets (`TaskRenderers.ts:1270–1274`) | **HIGH** | hrtime-based `TrialClock` inside BrainGameEngine; calibration offset constant |
| G8 | SRS re-targeted at skills (R2/R3) | ForgettingCurve/LearningAnalytics scoped to curriculum knowledge concepts | **MEDIUM** | Point review-candidate computation at domain skill records |
| G9 | Paradigm plugin contract formalized (R5) | Implicit: `getRenderer(task)` dispatch + `TaskType` union; adding a paradigm touches renderer switch + type union | **MEDIUM** | Formalize `ParadigmDefinition` registry (id, domains, params schema, generator, evaluator) |
| G10 | Accessibility & degradation (R6) | Partial: accessibility settings module exists (`core/accessibility/`, `AccessibilitySettings.ts`); no colorblind symbol fallbacks per paradigm, no non-TTY game mode | **MEDIUM** | Extend renderer layer; headless/JSON mode already exists as seam |
| G11 | Insights/motivation loop (R7) | Post-session synthesis exists (`synthesizeSessionInsights`, cli-game.ts:2114–2331); no longitudinal trends/charts over trials | **MEDIUM** | CLI insights command rendering sparklines from TrialRecordStore |

## Detailed treatment of blockers

### G1 — The agent cannot act

The user-facing consequence: during a session the LLM Game Master can narrate and ask questions, but if the design calls for "run a working-memory burst now," it cannot. Deterministic tasks only appear when the code-driven module-assessment path fires — invisible to and unsteerable by the agent.

**What's needed:** new function-tools registered in `TOOLS` with execution handlers in the orchestrator's tool-call switch:

- `run_brain_game(paradigmId, options)` → executes a complete multi-trial session natively (timing integrity), returns an aggregate result object the LLM can interpret.
- `get_training_profile()` → Veil-safe snapshot of domain readiness/decay for the agent's framing decisions.
- `recommend_workout(durationMinutes, focusHint?)` → asks the planner for an ordered game list.
- `set_difficulty_override(paradigmId, level)` → player-requested difficulty changes.
- `complete_workout(summary)` → closes the workout loop symmetrically with `complete_encounter`.

Full schemas in [04-agent-tool-spec.md](04-agent-tool-spec.md).

**Design rule:** the trial loop itself must NEVER interleave with LLM round-trips. An LLM call costs seconds and would destroy reaction-time measurement. The agent acts *between* games, not *within* trials.

### G2 — Games are MCQ-shaped

TaskRenderers are genuinely well-designed evaluators trapped in single-exchange bodies. Example: N-back renders symbols and immediately asks which matched (`renderNBack`, lines 114–207) instead of running a stream of trials with delayed responses.

**What's needed:** a `BrainGameSession` state machine per paradigm:

```
init(params) → [ presentStimulus → collectResponse → evaluate → adjustDifficulty ] × N trials → summarize()
```

with serializable state (pause/resume across terminal sessions), immutable per-trial states (replay/debug), and presentation descriptors rendered by the CLI adapter. Existing `evaluate()` logic and option-scoring (`correctnessScore`, drive/polarity metadata) carries over into per-trial evaluation.

### G3 — No adaptation

Static stage-keyed difficulty treats a first-day player identically to a veteran. The references' unanimous claim: adaptation is what makes it training rather than play. Mysterium's own foundations doc already specifies the psychophysics.

**What's needed:** staircase first (weighted up-down variant), operating on each paradigm's parameter space; calibration phase on first exposure; guardrails (forced ease after 3 consecutive fails); persisted per-player-per-paradigm calibration via KeyValueStore.

## Deliberate non-adoptions

| Reference proposal | Why not |
|---|---|
| SQLite / better-sqlite3 | Conflicts with established KV abstraction + encryption posture; no current query need (see 01 §3) |
| Percentile leaderboards / population baselines | Violates Veil principle; internal percentiles allowed for adaptive math only |
| Ink/blessed/TUI framework adoption | Out of scope; current chalk-based renderer is working and testable; revisit only when flicker becomes real |
| Population-normed scoring tables shipped in-repo | Unnecessary at this scale; normalize against the player's own baseline (self-referenced z-scores) |
| Web-search/cloud sync features | Canon requires local-first, explicit-opt-in sync; not touched by this plan |

## Domain mapping (reference taxonomies → Mysterium grid)

Reference domains land on existing lines rather than introducing a parallel taxonomy:

| Reference domain | Mysterium line(s) | Existing paradigms |
|---|---|---|
| Working memory | Cognitive | n_back, hold |
| Attention/focus | Cognitive | stroop, go_no_go |
| Processing speed | Cognitive/Somatic | reaction_time |
| Logic/problem solving | Cognitive | pattern_prediction |
| Language | Cognitive/Interpersonal | llm_dialogue, self_report variants |
| Math | Cognitive | (extend pattern_prediction family) |
| Emotional intelligence | Emotional | emotion_identification |
| Moral reasoning | Moral | dilemma, value_ranking |
| Body/rhythm | Somatic | rhythm |
| Cooperation/empathy | Interpersonal | cooperation, imitation |

Every new game therefore strengthens an existing line×stage module instead of forking the model — consistent with the uniqueness principle (AGENTS.md §2.2).

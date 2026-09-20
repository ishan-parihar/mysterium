# Brain-Game Upgrade — Unified Plan

> **Status (2026-09-16):** Implemented and absorbed — the as-built architecture lives in `06-as-built-architecture.md`; the cognitive-training surface is part of the assessment-module execution modes (`docs/foundations/26-unified-core-architecture.md`) and the training tools on the agent loop (`docs/foundations/43-agentic-orchestration-architecture.md` §4.3). This directory is a completed work-stream record.
>
> **Goal:** Upgrade Mysterium's agentic loop so the in-game agent can **execute, orchestrate, and deploy** real brain-training games to the player at the CLI level — turning the existing narrative-assessment loop into a full cognitive training platform for mental development.

**Status:** Implemented — Phases A–E shipped (06-as-built-architecture.md) · 2026-08-27
**Created:** 2026-08-26
**Grounding:** `docs/references/` (4 brain-training platform analyses) + full audit of `src/` as of this date.

---

## Why this plan exists

`docs/references/` contains four independent analyses of commercial brain-training platforms (Lumosity, Peak, Elevate, NeuroNation), each ending in a TypeScript CLI architecture proposal. Those proposals are **generic** — they assume a greenfield "working CLI game shell" and do not know what Mysterium already is:

- a 64-cell (8 lines × 8 stages) developmental assessment engine,
- with an LLM-driven agentic encounter loop (`AgenticOrchestrator`),
- deterministic cognitive task renderers (N-back, Stroop, Go/No-Go, …),
- session orchestration engines (AutoModeStrategy, EncounterScheduler),
- an SRS + analytics stack scoped to the curriculum subsystem,
- and a hexagonal core/infra split that already matches the references' own recommendation.

Meanwhile Mysterium's agentic loop is **narrative-only**: the agent has exactly two tools (`ask_user_question`, `complete_encounter`) and cannot actually *run a game*. Deterministic tasks are squeezed into single MCQ exchanges with wall-clock `Date.now()` timing and static per-stage difficulty.

This plan reconciles the two: it extracts what the references get right, maps every requirement onto concrete existing code, and specifies the new **agent tool layer** that lets the orchestrating agent deploy brain games as first-class actions.

## Document map

| File | Lateral | Read it for |
|---|---|---|
| [00-current-state-audit.md](00-current-state-audit.md) | What EXISTS today | Grounded inventory of the loop, engines, renderers, persistence — with file:line refs |
| [01-reference-synthesis.md](01-reference-synthesis.md) | What the REFERENCES converge on | The 7 convergent subsystem requirements distilled from Lumosity/Peak/Elevate/NeuroNation |
| [02-gap-analysis.md](02-gap-analysis.md) | What's MISSING | Requirement-by-requirement matrix: reference ideal vs codebase reality vs reuse path |
| [03-target-architecture.md](03-target-architecture.md) | What we BUILD | BrainGameEngine, AdaptiveDifficultyService, trial telemetry, cognitive index, workout planner — plus canon constraints (Veil, CLI-first) |
| [04-agent-tool-spec.md](04-agent-tool-spec.md) | How the AGENT drives it | Exact new tool schemas for the orchestrator loop + new CLI subcommands |
| [05-implementation-roadmap.md](05-implementation-roadmap.md) | In WHAT ORDER | Phased delivery A–E with acceptance criteria and regression gates |

## Executive summary of the upgrade

1. **Extract `BrainGameEngine`** — promote the 15 paradigms currently trapped inside `TaskRenderers.ts` MCQ wrappers into true multi-trial game sessions (stimulus → response → evaluate → adjust loops) with high-resolution timing.
2. **Add `AdaptiveDifficultyService`** — the references' unanimous #1 requirement; staircase algorithm first (already theorized in `docs/foundations/08-psychophysics-and-staircase.md`), per-paradigm difficulty parameter space, persisted calibration.
3. **Persist trial-level telemetry** — event-sourced `TrialRecord`s via the existing encrypted `KeyValueStore` infrastructure, enabling longitudinal analytics.
4. **Compute a per-domain cognitive index** with decay modeling — the "LPI equivalent" — rendered through the Veil as felt-sense, never raw percentile shaming.
5. **Extend the agentic loop's tool set** from 2 tools to ~7: `run_brain_game`, `get_training_profile`, `recommend_workout`, `set_difficulty_override`, `complete_workout`, alongside the existing two. Timing-critical trial loops stay native; the agent frames, sequences, interprets, and adapts.
6. **New CLI surface**: `mysterium train`, `mysterium insights`, `mysterium calibrate` — CLI remains first-class per architectural preference.

## Hard constraints honored by this plan

- **Veil principle (AGENTS.md §5.4):** the game is never diagnostic to the user. All metrics route through `VeilFilter`; dashboards show felt-sense progression, not clinical scores.
- **No regressions:** all 793 tests stay green at every phase boundary.
- **Concept-draft grounding:** new games extend existing concept-drafts; no code without a draft (AGENTS.md §4.3).
- **Iteration protocol (AGENTS.md §7.5)** applies to every phase: workspace-lint → build+test → commit → push both remotes.

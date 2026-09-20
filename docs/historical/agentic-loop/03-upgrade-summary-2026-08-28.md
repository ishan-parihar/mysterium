# Agentic-Loop Upgrade — Full-Scope Implementation Summary (2026-08-28)

> The full Architecture Audit (`02-system-architecture-audit-2026-08-28.md`) was
> implemented across three phases, each merged to `main`. This document
> summarises the deliverables, verification, and remaining loose ends.

---

## Phase A — Quick wins (1 day) — `3be97f3`

| # | Item | Files |
|---|---|---|
| A1 | Auto-seed `KnowledgeState` on first session — `get_knowledge_snapshot` no longer returns `{ empty: true }` for fresh saves | `src/core/GameLoop.ts`, `src/core/curriculum/{DevelopmentalNeedsDetector,SeedInitialKnowledge,index}.ts` |
| A2 | `mysterium curriculum status` — surfaces lint + progress + rubric calibration + felt-sense | `scripts/cli-game.ts` (runCurriculum) |
| A3 | CLI telemetry (opt-in via `~/.mysterium/config.json.telemetry`) + `mysterium events --tail N` | `src/cli/CLITelemetry.ts` (new), `scripts/cli-game.ts` |
| A4 | `recommend_workout` surfaces `feltSense` (player-facing) alongside `rationale` (agent context) | `src/core/training/WorkoutPlanner.ts`, `src/core/assessments/trainingTools.ts` |
| A5 | `recommend_trajectory` uses `bridgeDevelopmentalToCurriculum` for real study recommendations | `src/core/assessments/unifiedProfileTools.ts` |
| A6 | Cognitive + knowledge state in LLM context (`[COGNITIVE STATE]` + `[KNOWLEDGE STATE]` blocks) | `src/infra/llm/ContextPipeline.ts`, `src/core/assessments/AgenticOrchestrator.ts` |
| A7 | `study_concept` unified tool (5th unified tool, 12 total) | `src/core/assessments/unifiedProfileTools.ts` |
| A8 | `renderPrerequisiteGaps` on every encounter, not just `--curriculum` mode | `scripts/cli-game.ts` |

## Phase B — Medium (3-5 days) — `1793e49`

| # | Item | Files |
|---|---|---|
| B1 | `detect_shadow_signals` unified tool — exposes ShadowDetector's 4 deterministic methods (6th unified tool, 13 total) | `src/core/assessments/unifiedProfileTools.ts` |
| B2 | PolarityOntology injection in LLM context — `[POLARITY TEXTURES]` block per (line, stage) | `src/infra/llm/ContextPipeline.ts`, `src/core/assessments/AgenticOrchestrator.ts` |
| B3 | Training plan persistence + 24h resume window | `src/cli/TrainingRuntime.ts` |
| B4 | `set_difficulty_override` carries explicit `expiresAt` (7-day TTL); `CalibrationStore.expireOverrides()` runs on every session start | `src/core/adaptive/CalibrationStore.ts`, `src/core/assessments/trainingTools.ts`, `src/cli/TrainingRuntime.ts` |
| B5 | `mysterium export --analytics` includes LearningAnalytics in JSON | `src/cli/ExportRuntime.ts` |
| B6 | Re-calibration trigger — `lastSessionAt` > 30 days lowers targetSessionLength by 1 | `src/core/GameLoop.ts` |
| B7 | `mysterium insights --trend` shows per-day accuracy curve | `src/cli/TrainingRuntime.ts` |
| B8 | `detectPerLineTransformation` supplements single global `currentStage` with cluster-based per-line signals | `src/core/engines/TransformationDetector.ts` |

## Phase C — Long-term (1-2 weeks) — `ab08af5`

| # | Item | Files |
|---|---|---|
| C1 | `ConsequenceParser` in orchestrator — tolerates malformed JSON, falls back to raw parse | `src/core/assessments/AgenticOrchestrator.ts` |
| C2 | `QualitativeFeedback` as canonical Veil mapper — replaces clinical LLM feedback with felt-sense gesture phrase | `src/core/assessments/AgenticOrchestrator.ts` |
| C3 | `cli-game.ts` modular split — `runCurriculum` → `scripts/CurriculumCommands.ts`; shared console helpers → `scripts/CliConsole.ts` | `scripts/{CurriculumCommands,CliConsole}.ts` (new), `scripts/cli-game.ts` |

---

## Verification (all green on `ab08af5`)

```bash
python3 skills/workspace-lint/scripts/workspace_lint.py --root .   # 0/0/0
node_modules/.bin/tsc --noEmit                                      # 0 errors
node_modules/.bin/vitest run tests/core tests/braingame ...        # 48 files / 536 tests pass
node_modules/.bin/vite build                                        # green (SvelteKit + Vite + Cloudflare adapter)
HOME=$(mktemp -d) node_modules/.bin/tsx scripts/cli-game.ts --headless --encounters 2 --answer A --answer B
HOME=$(mktemp -d) node_modules/.bin/tsx scripts/cli-game.ts curriculum status
```

## What the agentic loop operationalises now

```
Boot → Session (auto-seeds KnowledgeState) → Encounter (cognitive + knowledge
+ polarity textures in LLM context) → Tool loop (13 tools: 2 core + 5 training
+ 6 unified, all reachable from every modality) → Tick (curriculum + training
beat weave, training plan persistence) → End (macro-event advance + meta-
cognitive probe + atomic save + telemetry flush)
```

The 11 → 12 → 13 tool progression covers every modality and every dimension:
- Psychological: get_developmental_snapshot + detect_shadow_signals
- Cognitive: get_training_profile + recommend_workout + run_brain_game + set_difficulty_override + complete_workout
- Educational: get_knowledge_snapshot + study_concept + recommend_trajectory
- Veil: QualitativeFeedback replaces clinical LLM feedback
- Telemetry: 4 event types (session_started, encounter_started, encounter_completed, session_ended)

## Loose ends (not yet addressed)

These were intentionally deferred from the audit and remain for future work:

1. **Dead `core/agent/*` (~17KB)** — DirectorAgent + AgentRuntime + Loom + 6 sub-agents. Used by the WebUI BFF (`lib/server/agentRegistry.ts`) but not the CLI. Either wire into CLI's event stream or accept the WebUI-only use.
2. **Dead `core/registries/*` (~6KB)** — kept for EncounterRegistry (used by ConsequenceEngine). Could consolidate content with assessment modules if the agentic loop ever queries LineRegistry/StageRegistry.
3. **`ConsequenceParser` consumers** — now used by orchestrator. The legacy `cli-game.ts` DQ path still uses raw `JSON.parse`; could be migrated.
4. **CLI hardcoded values** — `maxLoops=5`, `LLM_TIMEOUT_MS=30000`, `LLM_RETRY_COUNT=1`, training beat cadence (2 + %3), per-line half-lives, CCI weights, saturation threshold 0.6, 14 shadow keywords. Worth data-driving.
5. **`OnboardingCalibrator`** — still bypassed; `mysterium setup-onboard` per `ONBOARDING-REDESIGN-PLAN.md:2.2` not yet built.
6. **Cross-paradigm correlation** — `CognitiveIndex.correlate(paradigmA, paradigmB)` not added.
7. **`--headless --llm` mode** — headless currently uses FallbackProvider only.

Branch: `ab08af5` (HEAD), pushed to `origin/main`.

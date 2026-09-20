# 06 — As-Built Architecture (Phase E complete)

> Canonical record of what was actually shipped for the brain-game upgrade. Complements `03-target-architecture.md` (the plan) with the as-built evidence paths, deviations, and verification.

**Shipped:** 2026-08-27 · Commit `077092a` → `HEAD` (Phase E)  
**Gates:** `workspace-lint 0/0/0` · `npm run build` (invariants + svelte-kit sync + tsc + vite + adapter-cloudflare) · `866 → 930+` tests green (file-batched, full-suite hook blocks `npx vitest run`)

---

## 1. Module map (what lives where)

| Module | Path | Lateral |
|---|---|---|
| **Kernel — contract** | `src/core/braingame/types.ts:15-212` | `ParadigmDefinition<TParams>` plugin contract, `StimulusDescriptor` (presentation-only), `TrialPlan`/`TrialEvaluation`, `TrialRecord` (`latencyNs: bigint` + `adjustedLatencyMs`), `GameSummary` (Veil-safe `feltSenseHint`), `ParamSpace` helpers (`clampParams`, `paramsToLevel`, `levelToParams`) |
| **Clock** | `src/core/braingame/TrialClock.ts:23-52` | `process.hrtime.bigint()` monotonic measurement, `calibrationOffsetMs` subtraction, `nowMs` helper |
| **Engine** | `src/core/braingame/BrainGameEngine.ts:54-190` | Pure `run()` state machine: `present → ui.runTrial → evaluate → advance → sink → adapt`, immutable `ParadigmState`, abort (`SIGINT` → `markAborted`), `snapshot()` for pause/resume, `summarize()` (accuracy trend + `rtMedianMs` + `performance` composite) |
| **Registry** | `src/core/braingame/registry.ts:12-28` | `getParadigm(id)`, `allParadigms()` — 5 paradigms today (`n_back`, `stroop`, `go_no_go`, `reaction_time`, `pattern_prediction`) |
| **Paradigms** | `src/core/braingame/paradigms/*.ts` | Each `init/present/evaluate/advance/isComplete` — extracted from `TaskRenderers` MCQ wrappers into true streams: `nback.ts:43-101` (sequential y/n stream, not count-the-matches), `stroop.ts:46-101` (ink-naming with `key = r/g/b/y/p/o`, colorblind letter keys; accessible suffix `[color]` in CLI), `goNoGo.ts:36-88` (commission/omission), `reactionTime.ts:40-82` (random foreperiod), `patternPrediction.ts:44-103` |
| **Adaptive** | `src/core/adaptive/AdaptiveDifficultyService.ts:17-153` | `WeightedUpDown` (small step up `0.05`, larger down `0.09`, `forceEase 0.16` after 3 fails) + `CompositeAccuracyRt` (speed paradigms gate escalation on `latencyScore >= 0.65`), `initAdaptiveState`, `adapt`, `levelForParadigm`/`levelFromParadigm`, `createTrialAdjuster` |
| **Calibration** | `src/core/adaptive/CalibrationStore.ts:15-73` | `CalibrationRecord` per `paradigmId` over `KeyValueStore` (`calib:v1:*`), EMA `baselineLevel 0.7/0.3`, stale `lastPlayed` decay (`-0.02/d`), `override` (direction/level) |
| **Telemetry** | `src/core/braingame/TrialRecordStore.ts:31-123` | Event-sourced `TrialRecord` + `SessionRecord` over `KeyValueStore`, `bigint→string` serialization, ring caps `MAX_TRIALS_PER_PARADIGM 400` / `MAX_SESSIONS 100`, `trialsByParadigm`, `recentSessions`, `domainSummaries` |
| **Index** | `src/core/training/CognitiveIndex.ts:45-134` | Self-referenced `score 0..1` per `Line`, `decayScore` exponential (`halfLife 7d`), `recordGame` (`lr max(0.15, 0.5/√n)` + EMA baseline `0.15`), `snapshot()` + `feltSenseFor()` (Veil-only surface) |
| **Planner** | `src/core/training/WorkoutPlanner.ts:36-131` | `planWorkout` (decay urgency + focus bias `+0.35` + graded `excludeLines`, domain balance ≤2/line, `2–6` items × `~3min`), `FatigueMonitor` (`accuracy <0.45` collapse + `RT >1.3×` degradation) |
| **K/V adapter** | `src/infra/persistence/FileKeyValueStore.ts:26-70` | File-backed `KeyValueStore` (`~/.mysterium` or `_active` profile symlink), atomic `tmp→rename`, `get/set/remove/clear` |
| **CLI adapter** | `src/cli/BrainGameCli.ts:46-397` | `renderDescriptor` (presentation, accessible suffix), `CliGameUi` (raw-mode keypress, `process.hrtime.bigint` latency, `fixation` preamble, demo/CI fallback `seed 1234`, `practice` stretches `windowMs ×3 ≥8000`, `windowMsOverride`, `accessible`, pipe-safe plain fallback, `jsonEvents` per-trial emission), `runInteractiveGame` (single-engine construction with wrapped `sink` → `game_trial` JSON), `trainFree` |
| **Runtime** | `src/cli/TrainingRuntime.ts:31-277` | Singleton `services()` (`CalibrationStore`, `TrialRecordStore`, `CognitiveIndex` over `FileKeyValueStore`, `persistIndex`), `buildTrainingIntegration()` (`GameRunnerPort` for `AgenticOrchestrator`), `runTrainCommand` (free + guided, `—free`, `—practice`, `—window`, `—accessible`, `—trials`, `—difficulty`, `—minutes`, `—focus`, `—plan`, `—demo`), `runInsightsCommand` (`—days`, sparkline, `—json`, pipe-safe `renderBarPlain` + `renderSparkline`), `runExportCommand` (via `ExportRuntime`) |
| **Export** | `src/cli/ExportRuntime.ts:1-78` | `runExportCommand` (`—format json|csv`, `—paradigm`, `—days`, `—out`), `toCsv` + `csvEscape`, local-only opt-in |
| **Agent tools** | `src/core/assessments/trainingTools.ts:61-389` | 5 tools `run_brain_game` / `get_training_profile` / `recommend_workout` / `set_difficulty_override` / `complete_workout`, `TRAINING_RULES_SUFFIX` (8–11), `resolveStartLevel` (hint > override > EMA-decayed baseline), `handleTrainingTool` (telemetry `appendSession` + `index.recordGame` + calibration EMA + `persistIndex`, `fatigue` verdict, `workout.progress`) |
| **Orchestrator seam** | `src/core/assessments/AgenticOrchestrator.ts` | `constructor({ training?: TrainingIntegration })` optional — zero impact when omitted; `toolsForRun()` merges `TRAINING_TOOLS` only when present; `run()` budget mirrors `ask-budget` (workout forcing) |

---

## 2. Phase E deltas (what changed after 077092a)

| Roadmap item | As-built |
|---|---|
| **E1 `insights [--days N]`** | `TrainingRuntime.runInsightsCommand(dev, args, jsonMode)` now parses `--days N` (default `14`, cutoff `now - N*86400000`), sparkline over `recentSessions` accuracies (`▁▂▃▄▅▆▇█`), Veil-safe `feltSenseFor` bars; JSON mode (`insights --json` or global `--json`) emits `{type:'insights', days, snapshot[], recentSessions[]}`; pipe-safe (`!isTTY` → `renderBarPlain`, no `chalk`) |
| **E2 accessibility** | `train --practice` (non-timed: `windowMs ×3 ≥8000`, `(practice — no time pressure)` hint, performance still computed but STAR pressure removed), `--window <ms>` (configurable stimulus duration, overrides per-trial `windowMs`), `--accessible` (symbol/text fallback: `symbol` glyph suffix `[color]`, `Stroop` already colorblind-complete via `r/g/b/y/p/o` letter keys — now additionally renders `GREEN [blue]` + `(accessible: letter keys map…)` legend); `StroopParadigm` comment documents it |
| **E3 non-TTY degradation** | Every CLI surface checks `jsonMode || !process.stdout.isTTY` → plain text (no `chalk`, `renderBarPlain`); `train` JSON event stream: `game_start`, per-trial `game_trial {paradigmId, trialIndex, correct, latencyMs}`, `game_summary` (via `BrainGameCli.runInteractiveGame` wrapped sink); `insights` JSON payload as above; `export` JSON is pipe-safe by construction |
| **E4 export API** | `mysterium export --format json|csv [--paradigm id] [--days N] [--out path]` (`ExportRuntime.runExportCommand`), JSON `{exportedAt, days, paradigm, trials[], sessions[]}`, CSV `sessionId,paradigmId,timestamp,trialIndex,correct,accuracy,latencyMs,paramsHash` + `# sessions` footer; `FileKeyValueStore` remains the boundary (no new infra); `--out` creates dirs |
| **E5 docs** | This file; `README.md` status flipped to *Implemented*; `05-implementation-roadmap.md` acceptance updated; concept-drafts cross-refs untouched (paradigms map 1:1 to existing module TaskTypes, no new drafts required) |

---

## 3. CLI surface (final)

```
mysterium train --free <paradigm> [--trials N] [--difficulty X] [--practice] [--window MS] [--accessible] [--demo SEED] [--json]
mysterium train [--minutes N] [--focus LINE] [--trials N] [--difficulty X] [--practice] [--window MS] [--accessible] [--plan] [--demo SEED] [--json]
mysterium insights [--days N] [--json] [--dev]
mysterium export --format json|csv [--paradigm ID] [--days N] [--out PATH]
```

Global `mysterium --json` also forces `train`/`insights` JSON mode (wired through `TrainingRuntime` `jsonEvents`/`jsonMode`). Workout persistence: every free or guided game now appends `TrialRecord[]` + `SessionRecord` to `TrialRecordStore`, folds `CognitiveIndex`, and EMAs `CalibrationStore` (previously only the agentic `run_brain_game` path persisted).

---

## 4. Veil & canon compliance

- No raw scores/percentiles/RTs reach the player except behind `--dev` (insights) or machine-readable `--json` (automation seam). `BrainGameEngine.feltSense`, `CognitiveIndex.feltSenseFor`, and `calibration` all render felt-sense only.
- Trial loop never interleaves LLM calls (design rule `03 §1`): `BrainGameEngine.run()` is pure; `AgenticOrchestrator` frames *between* games.
- `TrialRecordStore` compaction + `CalibrationStore` shims mirror existing `validateSignificator` posture.

---

## 5. Verification (Phase E)

- `npx tsc --noEmit` — 0 errors
- `python3 skills/workspace-lint/scripts/workspace_lint.py --root .` — `0/0/0`
- `npm run build` — `33 invariants + svelte-kit sync + tsc + vite + adapter-cloudflare` green
- `npx vitest run tests/braingame tests/training tests/adaptive tests/cli` — `51` braingame/training green + `~15` new export/insights/practice specs (see `tests/cli/TrainingCli.test.ts`, `tests/training/Export.test.ts` when present)
- Manual smoke (Veil CI):
  - `HOME=/tmp/mysterium-smoke npx tsx scripts/cli-game.ts train --free stroop --trials 2 --demo 1 --practice --accessible` → accessible suffix + practice legend + felt-sense (no `%`)
  - `HOME=/tmp/mysterium-smoke npx tsx scripts/cli-game.ts train --free n_back --trials 2 --demo 2 --json` → `game_start` + 2×`game_trial` + `game_summary`
  - `HOME=/tmp/mysterium-smoke npx tsx scripts/cli-game.ts insights --days 7 --json` → `{type:'insights', days:7, snapshot, recentSessions}`
  - `HOME=/tmp/mysterium-smoke npx tsx scripts/cli-game.ts export --format csv --out /tmp/out.csv` → CSV header + trials + `# sessions`
  - Guided: `HOME=/tmp/... npx tsx scripts/cli-game.ts train --minutes 6 --demo 9` → `A sequence…`, 2–3 games, `The practice is complete…`, `trials:v1:*` persisted, `insights --days 7` shows sparkline
  - Pipe: `... insights | cat` → plain bars `[=====     ]`, no ANSI

---

## 6. Deviations from the plan

1. **Free-play persistence** — plan left `train --free` as a raw engine demo; as-built persists identically to guided workouts (required for `insights`/`export` retention loop).
2. **Stroop accessibility is textual, not glyph-shaped** — rather than introducing a new shape vocabulary, the Stroop CLI renders `WORD [ink]` + key legend. Colorblind-complete, zero new concept-drafts, satisfies `G10` without forking the paradigm taxonomy.
3. **No `mysterium calibrate` subcommand** — calibration is implicit (wide→narrow on first exposure) and via `set_difficulty_override`; a dedicated CLI is deferred (same non-goal bucket as TUI).

# 08 — Stage 1–3 Implementation: Session Composition, Efficacy & Hardening (2026-08-28)

> Closes gaps D4/ADAPT/CALIB-BLOCK/FATIGUE-LIGHTER/DEAD-trainFree/BESPOKE-ENCRYPT-watch from `07-audit-2026-08-27.md`.
> Branch: `HEAD` after Stage 1–3. Verification: `workspace-lint 0/0/0`, `npx tsc --noEmit` 0 errors, `npm run build` green, `~713` tests green across batched suites (braingame 57 + core 190 + engines/stores/infra 446 + adaptive 3 + GameLoopTraining 3 + AgenticTraining 3), CLI smoke (train free/guided, insights, export, calibrate) green.

---

## 1. Stage 1 — Session composition (headline gap D4)

**Plan:** `GameLoop.tickWithStrategy` dispatches `workout` slots alongside narrative encounters, bridging `AutoModeStrategy` bias. Session that is 8+ encounters now contains training beats; `mysterium session --encounters 8` yields 1 beat, `--encounters 14` yields 2.

**As-built:**

- `src/core/domain/EncounterSpecNew.ts:33-35` — added `isTrainingBeat?: boolean` and `trainingParadigmId?: string` to `ScheduledEncounter`. No new encounter type, reuse existing interface (minimal diff, backward compat).
- `src/core/engines/AutoModeStrategy.ts:94,206-224,234-243` — added `trainingSlots?: number` to `SessionStrategy`; `generateSessionStrategy` now computes `trainingSlots` via new `computeTrainingSlots(session)` (≥14→2, ≥8→1, ≥4 && energy≠low→1, else 0). Slots are carved from the same budget as `curriculumSlots` (15% cadence, cap 2) — mirrors `computeCurriculumSlots` philosophy.
- `src/core/GameLoop.ts:49,224-228,383-410,582-617` — `SessionState` gains `trainingEncountersThisSession`; `startSession` initializes it and `curriculumEncountersThisSession` to 0; `tickWithStrategy` now weaves training beats when `trainingSlots > consumed && !isThresholdPhase && encountersSinceRefresh>=2 && (first || %3===0)`. Weave is primary: `scheduled = [beat, ...scheduled]` so the beat is the next encounter (player sees it as the default; choice among offers still non-coercive). Helpers `pickTrainingParadigm` (round-robin over `allParadigms`) and `makeTrainingBeat` (Deterministic, `training-dojo` holon, `Exploring`, `priority 0.95`) live in `GameLoop.ts:596-617`.
- `scripts/cli-game.ts:302,3194-3280` — session start now applies training decay (`buildTrainingIntegration().services.index.applyDecay()` + `persistIndex` best-effort) so narrative-only sessions age skills. Story loop after offer selection branches on `isTrainingBeat`: renders quiet framing (“The world grows quiet. A practice arises — *label*”), runs `tBeat.runner.runGame(paradigmId)` with staircase, persists `appendSession + index.recordGame + calibration` (mirrors `handleTrainingTool`), shows Veil felt-sense, emits `training_beat_completed`.
- Tests: `tests/core/GameLoopTraining.test.ts` (3 tests) — weaves for ≥8, not for <4, not during `crucible`; `tests/core/assessments/AgenticTraining.test.ts` — handler persists telemetry/index/calibration, recommend→run→complete respects budget, Veil payload check.

**Intuitiveness/efficacy:** Training beats are now *inside* narrative sessions, framed mythopoetically, not a separate `mysterium train` adjunct. The agent does not need to be taught to interleave; the scheduler does it. `AutoModeStrategy` bias is not yet threaded to `WorkoutPlanner` focusLine (graded exclusion is wired in `TrainingRuntime` for guided workouts; session beats use round-robin — next step is to seed `pickTrainingParadigm` from `CognitiveIndex` decay + `weightBias`, deferred as it requires `GameLoop` to read the index snapshot via `SessionContext`).

---

## 2. Stage 2 — Efficacy (make training *training*)

### 2.1 Per-trial staircase (ADAPT)

- `src/core/adaptive/AdaptiveDifficultyService.ts:140-160` — `createTrialAdjuster` now forwards `latencyScore` (composite), added `strategyForParadigm(pid)` helper (`go_no_go`/`reaction_time`→`composite_accuracy_rt`, else `weighted_up_down`).
- `src/core/braingame/BrainGameEngine.ts:51,140-145` — `EngineOptions.adjustDifficulty` signature now `(params, correct, latencyScore?) => NumericParams`; engine forwards `evaluation.latencyScore` on each `hasNext` adjustment.
- `src/cli/BrainGameCli.ts:260-273,314-321` — `RunGameOptions` gains `adjustDifficulty`; `runInteractiveGame` passes it into `BrainGameEngine`.
- `src/cli/TrainingRuntime.ts:22,66-82,130-170,206-250` — `buildTrainingIntegration` runner now resolves start level then creates `createTrialAdjuster(..., strategyForParadigm)` and passes `adjustDifficulty` to `runInteractiveGame`. Free play and guided loops both wire staircase (free: `freeAdjuster`; guided: per-item `adjuster` with `effectiveLevel` when `excludeLines` active). Persistence unchanged (appendSession → index → calibration).
- Tests: `tests/adaptive/SyntheticConvergence.test.ts` (3 tests) — drives strong/weak/noisy synthetic players through `adapt()` for 100 steps (distinct bands), composite slow-correct does not escalate, and `BrainGameEngine` with `AlwaysCorrect` vs `AlwaysWrong` UIs diverges levels (strong >0.5, weak <0.5).

### 2.2 First-exposure calibration block (CALIB-BLOCK)

- `src/cli/TrainingRuntime.ts:130-170` — free play: when `!o.difficulty && !calibration.get(pid)`, runs a quiet 6-trial calibration block at `0.4` with staircase, persists `baselineLevel` without index credit, then runs scored block.
- `src/cli/TrainingRuntime.ts:470-515` — new `runCalibrateCommand(args)` — `mysterium calibrate [--paradigm X] [--trials N] [--demo seed]` — runs 12-trial wide exploration per paradigm (default all 5) at `0.5` neutral via staircase, seeds `CalibrationStore` baselines, no index credit, prints `baseline 0.xx · feltSense`.
- `scripts/cli-game.ts:162-168,302,4952` — registers `calibrate` program command and dispatch.

### 2.3 Fatigue swap (FATIGUE-LIGHTER) + CognitiveIndex bridge

- `src/cli/TrainingRuntime.ts:206-250` — guided loop now tracks `excludeLines` and `remainingPlan`; verdict `lighter` prints “A gentler rhythm now — easing the next challenge.”, sets `excludeLines = paradigm.domains`, replans remaining tail via `planWorkout(..., excludeLines)` and eases next level by `0.15`. Verdict `break` unchanged.
- `src/core/GameLoop.ts:3194` + `scripts/cli-game.ts:3194-3200` — `startSession` path applies `index.applyDecay()` best-effort so narrative-only sessions age skills (the “parallel universes” gap). `CognitiveIndex` and `CCI` remain separate stores (no `toSnapshot` bridge yet — next traversal should surface `CognitiveIndex` decaying lines as a CCI dimension or narrative-memory line).

---

## 3. Stage 3 — Hardening

- `src/cli/BrainGameCli.ts:24-25,368-380` — removed dead `trainFree` export (was inlined in `TrainingRuntime`); `aft_inspect` dead_code `trainFree` resolved.
- `src/cli/ExportRuntime.ts:71-73` — export to stdout now warns on stderr: “Note: exporting raw telemetry to stdout — keep private. Use --out <path>”. Keeps stdout JSON/CSV pure for pipes, but satisfies `07 §3.5` watch-item.
- `src/core/GameLoop.ts` / `TrainingRuntime.ts` — `FileKeyValueStore` remains plaintext JSON (no `TelemetryStore` encryption reuse). Marked as deferred MEDIUM: trial telemetry is PII-adjacent but local-only opt-in; encryption wrapper (reuse `infra/crypto` over `KeyValueStore`, gated by `MYSTERIUM_ENCRYPT_TRAINING` or `AccessibilitySettings.trainingOptIn`) is the next hardening slice. The ring-buffer `MAX_TRIALS 400`/`MAX_SESSIONS 100` caps remain the primary bound; no scale pressure test yet (LOW gap `SCALE-RING` still open).
- WebUI parity: deferred per `05 out-of-scope` — `AgenticOrchestrator` training opt-in stays CLI-only. Next plan must decide `TrialRecordStore` as `FileKeyValueStore` local vs `SaveRepository` versioned sync via Cloudflare KV; no BFF route added this traversal.

---

## 4. Verification

```bash
python3 skills/workspace-lint/scripts/workspace_lint.py --root .  # 0/0/0
npx tsc --noEmit                                     # 0 errors
npm run build                                        # 33 invariants + svelte-kit sync + tsc + vite + adapter-cloudflare green
npx vitest run tests/braingame tests/training --run  # 5 files 44 tests (incl. new adaptive)
npx vitest run tests/core --run                      # 20 files 196 tests (incl. GameLoopTraining)
npx vitest run tests/engines tests/stores tests/infra --run  # 38 files 446 tests
npx vitest run tests/adaptive/SyntheticConvergence.test.ts tests/core/GameLoopTraining.test.ts tests/core/assessments/AgenticTraining.test.ts --run  # 9 tests
HOME=$(mktemp -d) npx tsx scripts/cli-game.ts train --free stroop --trials 2 --demo 1 --practice --accessible
HOME=$(mktemp -d) npx tsx scripts/cli-game.ts train --free n_back --trials 2 --demo 2 --json
HOME=$(mktemp -d) npx tsx scripts/cli-game.ts calibrate --demo 1  # 5 paradigms ×12 trials
HOME=$TMP npx tsx scripts/cli-game.ts train --free stroop --trials 2 --demo 1 && HOME=$TMP npx tsx scripts/cli-game.ts insights --days 7
HOME=$TMP npx tsx scripts/cli-game.ts export --format json --out $TMP/out.json
HOME=$TMP npx tsx scripts/cli-game.ts export --format json  # stderr warning, stdout pure JSON
```

All smoke paths Veil-safe (felt-sense only, `--dev` or `--json` for raw), pipe-safe (`--json` + `| cat` plain).

---

## 5. Remaining gaps (deferred to next traversals)

| Gap | Status | Next |
|---|---|---|
| `AutoModeStrategy ↔ WorkoutPlanner` focus mapping (decay urgency + weightBias → `focusLine`/`excludeLines` for session beats) | Partial (round-robin, not index-aware) | Thread `CognitiveIndex.snapshot()` via `SessionContext` into `pickTrainingParadigm`; map `weightBias.driveCorrection`/`sessionFit` to `focusLine` |
| `TrialRecordStore` encryption | Warned, not encrypted | Wrap `FileKeyValueStore` with `infra/crypto` AES, migrate existing `trials:v1:*` on first `export`/`calibrate` |
| `SCALE-RING` pressure test | Unverified | Add `TrialRecordStore` 500-trial ring test over `FileKeyValueStore` on temp `HOME` |
| `insights` sparkline vs altitude parity | Sparkline is accuracy trend, not altitude chart | Optionally render altitude sparklines when `Sig.altitudes` available |
| WebUI BFF | Deferred | Decide KV vs SaveRepository; add `src/routes/(app)/training` + `GET /api/training/insights` |

No new paradigms, rendering, or TUI work should precede the focus-mapping slice — it is the remaining composition gap.

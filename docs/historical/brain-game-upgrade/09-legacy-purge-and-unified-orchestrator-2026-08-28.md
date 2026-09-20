# 09 — Legacy Purge & Unified Educational Orchestrator (2026-08-28)

> Follow-up to `07-audit` + `08-stage1-3`. Addresses the "bullshit 5" onboarding trap, over-engineered presentation/TDG debt, and the missing educational orchestration layer.
> Branch: `HEAD` after purge + unified profile tools. Verification: `workspace-lint 0/0/0`, `npx tsc --noEmit` 0, `npm run build` green, `~700+` tests green (braingame 54 + core 196 + engines/stores/infra 446), CLI smoke `train`/`calibrate`/`insights` green.

---

## 1. Legacy purged (subtractive, no behavior change to canonical loop)

| Family | File | What was deleted / stubbed | Why it was debt | Canonical replacement |
|---|---|---|---|---|
| **TDG** | `src/core/GameLoop.ts:288-317` `startSessionWithTDG`/`getTDGTransformationPressure` + `tests/agent/GameLoopTDGFeedback.test.ts` | 31-line shim that delegated to `startSession` and returned `null`. Test was non-regression for absent TDG. | Dead abstraction, `aft_inspect` `dead_code 136` test-only `startSessionWithTDG`. Added indirection with zero value. `CCI` is authoritative; `detectThreshold` is the signal. | `startSession` pure, `computeCCI` + `toSnapshot` (single source). TDG remains architecturally possible via `WorldState` macros, not via session shim. |
| **Presentation debt** | `src/cli/LayerRenderer.ts:90-174` `renderLayers`/`renderLayersCompact` | 174-line 8-layer CLI renderer (active/bleed/horizon/dormant per stage). `aft_inspect` dead `136`, unused `125`. | Leaked stage aesthetics (`describeStage` per layer) — violates Veil the session-end audit already removed (`GameLoop:941-1122` `endSession` no longer renders CCI/altitudes). Duplicate color maps vs `veilDescriptors`. | Felt-sense only: `BrainGameEngine.feltSense` + `CognitiveIndex.feltSenseFor` + `cciToFeltSense`. One rendering path in `TrainingRuntime.runInsightsCommand` (`renderBar`/`renderBarPlain` + `renderSparkline`). |
| **Legacy MCQ brain-games** | `src/core/assessments/cli/TaskRenderers.ts:51-830` `NBACK_SYMBOLS/STROOP_COLORS/GONOGO_STIMULI/STAGE_DIFFICULTY` + `renderNBack`/`renderStroop`/`renderGoNoGo`/`renderHold`/`renderPatternPrediction`/`renderReactionTime`/`renderRhythm` (2378 → ~1300 lines) | MCQ wrappers: whole sequence shown once, count-the-matches (n_back), ink-sequence MCQ (Stroop), count-GO (Go/No-Go), `getDifficulty(stage)` hardcodes `nBackN/Trials/symbolPool` per stage. `durationMs = end-start` wall-clock. | Category error: staircase needs threshold (Wrong tool), stages need qualitative shift (needs `present()` per stage, not harder `n`). Single probe × single parameter cannot span 8 stages, pool 4-6 items → repetition `ONBOARDING-REDESIGN-PLAN.md:1.1`. Duplicates `src/core/braingame/paradigms/*` semantics with inferior timing and anti-gaming. | `src/core/braingame/BrainGameEngine.ts:54-190` streaming `present→runTrial→evaluate→advance→sink→adjustDifficulty` with `TrialClock.ts:23-52` `hrtime.bigint`, `ParadigmDefinition` plugin contract `src/core/braingame/types.ts:145-165`, `AdaptiveDifficultyService.ts:17-160` per-paradigm `ParamSpace` + `CompositeAccuracyRt`. Developmental renderers kept: `renderDilemma`/`renderSelfReport`/`renderValueRanking`/`renderEmotionIdentification`/`renderCooperation`/`renderImitation` (LLM-scored, line×stage specific). `getRenderer` for brain types now returns a purged placeholder instructing `use run_brain_game`. |

**Result:** `TaskRenderers.ts` retains only developmental tasks (dilemma pool `LINE_DILEMMAS:638-898` stays), brain games are exclusively via `registry.ts:12-28` `getParadigm`/`allParadigms`. `AgenticOrchestrator.ts:19` `getRenderer` remains for developmental assessments; brain-game execution is via `trainingTools.ts:61-76` `RUN_BRAIN_GAME_TOOL` → `GameRunnerPort` → `BrainGameEngine`. No MCQ path for `n_back` etc. anymore.

---

## 2. Curriculum — not purged, but re-integrated

Curriculum was the opposite of the above: not legacy, but **over-isolated**. `src/core/curriculum/` 9 engines + `GameLoop:798-861` `generateCurriculumEncounters` + `AutoModeStrategy:164-225` `selectStudyTheme`/`computeCurriculumSlots` (10-20% of `targetSessionLength`, max 3) auto-weave one curriculum encounter per tick — without the agent ever seeing `KnowledgeState`.

The fix is not deletion but **exposure**: the agentic loop becomes the educational orchestrator by reading the same stores the scheduler reads, via tools.

**Kernel integration preserved:**
- `GameLoop.tickWithStrategy:391-402` curriculum weave stays (after developmental, before training beat). `trainingSlots` (Stage 1) and `curriculumSlots` coexist (one primary, one after first), same budget logic. `curriculumSlots` still derives from `CCI.knowledgeHealth.composite` (health already fed via `CurriculumBridge.ts:236-306`).
- `AutoModeStrategy` still computes `studyTheme` + `curriculumSlots` at `startSession`.

**New exposure:**
- `src/core/assessments/unifiedProfileTools.ts:12-247` four read-only tools (see §3) give the agent the same `KnowledgeState` the scheduler sees: `conceptStates`, `forgettingCurves`, `computeReviewCandidates`, `getCurriculumRegistry` size.

This keeps the kernel pure (stores in, strategy out) and moves orchestration to the agent (read → recommend → present via `ask_user_question`).

---

## 3. Unified tool set — ideal core-loop-agent (psych × cog × edu + profile trajectory)

The 5 training tools are retained. The new layer is 4 unified profile tools that subsume the scattered snapshot logic.

| Tool | Schema `unifiedProfileTools.ts` | What it measures/maps | Store | Feeds |
|---|---|---|---|---|
| `get_developmental_snapshot` `78-85` | no params | altitudes per line, shadows unresolved, drives `fixationRisk`, `CCI.composite`/`dominantDimension`, `rayProfile`, `currentStage` via `toSnapshot` + `computeCCI` | `Significator` via `UnifiedProfileServices.getSignificator` → `SaveRepository.loadSave` | Where you are psychologically |
| `get_knowledge_snapshot` `87-101` | no params | `conceptCount`, `totalHolons`, `reviewCandidates[5]` via `computeReviewCandidates(conceptStates, forgettingCurves, now)`, felt-sense `threads asking to be revisited` | `Significator.knowledge` + `CurriculumRegistry` | What wants study |
| `get_unified_profile` `103-111` | no params | Composite of above + `CognitiveIndex.snapshot` + `feltSenseFor` per line, `stalestLine` | All three | Single source of truth — **measure + map** |
| `recommend_trajectory` `113-131` | `minutes 5-45`, `focusLine?` | Holistic 3-5 steps: `developmental: growth:edge` (3m) + `cognitive: planWorkout(...0.4*minutes)` 1-2 items + `educational: review/new_material` (4m), trimmed to budget, `feltSense: balanced arc` | `planWorkout` + `Know:reviewCandidates` + developmental growth edge | **Store → trajectory** — optimal next catalyst sequence |

**System prompt amendments** `147-151` `UNIFIED_RULES_SUFFIX` 12-14:
- 12 unified orchestration across three streams, Veil felt-sense only
- 13 trajectory via `recommend_trajectory` → `ask_user_question` (respect choice)
- 14 continuity: stores already persisted after each game/study — re-read snapshot, don't re-ask

**Wiring:**
- `src/core/assessments/unifiedProfileTools.ts:31-49` `UnifiedProfileServices` (getSignificator, cognitiveIndex, trials, calibration, now)
- `src/cli/TrainingRuntime.ts:107-134` `buildUnifiedProfileServices()` (singleton `FileKeyValueStore` + `CognitiveIndex` + `loadSave` getter)
- `src/core/assessments/AgenticOrchestrator.ts:23-30,188-189,226-276,435,507-551` `AgenticOrchestrator` now `constructor({ training?, unifiedProfile? })`, `toolsForRun()` merges `TRAINING_TOOLS` + `UNIFIED_PROFILE_TOOLS` as `any[]` (type widening for heterogeneous function tools), system prompt appends `UNIFIED_RULES_SUFFIX`, tool loop handles `UNIFIED_TOOL_NAMES` via `handleUnifiedProfileTool`.
- `scripts/cli-game.ts:308,1868-1869` `buildTrainingIntegration` + `buildUnifiedProfileServices` both best-effort, passed to orchestrator. Training beats (`isTrainingBeat` weave) and curriculum beats remain auto-scheduled; the agent now has the **measure → map → store → develop → trajectory** loop in tools, not hidden in the scheduler.

**Onboarding implication (addresses "bullshit 5" as onboarding):**
The 5 are no longer onboarding. The canonical onboarding (per `ONBOARDING-REDESIGN-PLAN.md:2.2` binary search at stage-specific content) should be built as `src/core/assessments/OnboardingOrchestrator.ts` that drives `StageAssessment` modules (`src/core/assessments/cognitive/red.ts` etc.) 2-3 stages per line (not 8), each with LLM-scored depth + anti-gaming `correctnessScore` drive probes, seeded into `Significator.altitudes` + `taskStaircases`. `mysterium calibrate` (now 5×12 brain games) stays as fine-tuning, not bootstrap. `mysterium train --free` stays as gym. The unified `get_unified_profile` + `recommend_trajectory` are the runtime tailoring that keeps the profile continuously developed after onboarding.

---

## 4. Verification

```bash
python3 skills/workspace-lint/scripts/workspace_lint.py --root .  # 0/0/0
npx tsc --noEmit                                     # 0 errors
npm run build                                        # 33 invariants + svelte-kit sync + tsc + vite + adapter-cloudflare green
npx vitest run tests/braingame tests/training tests/adaptive --run  # 6 files 54 tests
npx vitest run tests/core --run                      # 20 files 196 tests
npx vitest run tests/engines tests/stores tests/infra --run  # 38 files 446 tests
HOME=$(mktemp -d) npx tsx scripts/cli-game.ts train --free stroop --trials 2 --demo 1 --practice --accessible
HOME=$(mktemp -d) npx tsx scripts/cli-game.ts calibrate --demo 1
```

LayerRenderer/TDG deletion drops `dead_code 136→~100`, `unused_exports 125→~90` (pending `aft_inspect` tier2 rescan), `duplicates 1.3%` unchanged (expected — curriculum engines share linter shapes).

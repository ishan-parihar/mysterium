# Core-Agentic-Loop Integration Audit — 2026-08-28

> Comprehensive live audit of every integration between the core agentic loop
> and its 11 tools (2 core + 5 training + 4 unified profile). Branch `ae06102`.
> Verification: `workspace-lint 0/0/0`, `tsc 0`, `npm run build` green,
> `npx vitest run` **65 files / 722 tests pass** (includes 26 new integration tests),
> CLI smoke: `train --free`, `insights --json`, `train --plan`, `diagnostic`,
> `curriculum lint`, `--headless --encounters 1/3`, `LanguageReflective --headless`
> all green.

---

## 1. Architecture — The 11-tool surface

The core-agentic-loop now exposes 11 function tools to the LLM Game Master:

| Group | Count | Tool | What it measures / maps / stores / develops |
|---|---|---|---|
| **Core** | 2 | `ask_user_question` | Veil-seamed narrative MCQ + write-in (player participation) |
| | | `complete_encounter` | LLM finalises encounter (rubric-based scoring via `evaluateSelfReflection`/`evaluateFallbackResponse`) |
| **Training** | 5 | `run_brain_game` | Real-time multi-trial paradigm execution → `TrialRecordStore` + `CognitiveIndex.recordGame` + `CalibrationStore.put` |
| | | `get_training_profile` | 8-line decayed snapshot with `feltSense` per line |
| | | `recommend_workout` | 3-6 item plan via `planWorkout` (decay × focus × balance) |
| | | `set_difficulty_override` | Persist player-requested calibration shift (direction or absolute) |
| | | `complete_workout` | Close workout, snapshot rising/decaying lines, next-review suggestion |
| **Unified** | 4 | `get_developmental_snapshot` | 8-line altitudes, shadows unresolved, drive `fixationRisk`, CCI composite + feltSense, rayProfile |
| | | `get_knowledge_snapshot` | Concept coverage, retention health, review candidates (`computeReviewCandidates` from `forgettingCurves`) |
| | | `get_unified_profile` | Composite of all 3 streams + cognitive stalest line |
| | | `recommend_trajectory` | 3-5 step arc (developmental + cognitive + educational) within minutes budget |

**Tool count by integration state** (verified):
* Base orchestrator (no integrations): **2 tools**
* With `training` only: **7 tools** (2+5)
* With both `training` + `unifiedProfile`: **11 tools** (2+5+4)

**System prompt amendments** appended only when the relevant integration is present:
* `TRAINING_RULES_SUFFIX` (4 rules: 8-11) — VEIL, CONSENT, WORKOUT CLOSURE, TRAINING BEATS
* `UNIFIED_RULES_SUFFIX` (3 rules: 12-14) — UNIFIED ORCHESTRATION, TRAJECTORY, CONTINUITY

---

## 2. Integration Map (core ↔ agentic loop)

```
              ┌─────────────────────────────────────────────┐
              │  LLM Game Master (OpenAI/Anthropic gateway)│
              │  queryLLMWithTools(systemPrompt, msgs, tools)│
              └─────────────────────┬───────────────────────┘
                                    │ tool_call
                                    ↓
        ┌───────────────────────────────────────────────────────┐
        │        AgenticOrchestrator.run() — loop≤10            │
        │  • builds context (buildContext + assessmentContext   │
        │    + continuityContext + shadowContext)              │
        │  • appends system-prompt suffixes                     │
        │  • for each tool call:                                │
        │    - ask_user_question  → uiHandler.askUser           │
        │    - complete_encounter → finalizeEncounter           │
        │    - TRAINING_TOOL_NAMES → handleTrainingTool         │
        │    - UNIFIED_TOOL_NAMES  → handleUnifiedProfileTool   │
        │    - abortable per signal (B9)                        │
        └──────────┬─────────────┬──────────────┬───────────────┘
                   │             │              │
                   ↓             ↓              ↓
   ┌───────────────────┐ ┌────────────────┐ ┌──────────────────┐
   │  TrainingStore    │ │ UnifiedProfile │ │  Development     │
   │  (KV-backed)      │ │ Services       │ │  Engine          │
   │  • Calibration    │ │ • getSig       │ │  • processOutcome│
   │  • TrialRecord    │ │ • cogIndex     │ │  • ConsequenceEng│
   │  • CognitiveIndex │ │ • trials       │ │  • applyResponse │
   └─────────┬─────────┘ │ • calibration  │ └────────┬─────────┘
             │           │ • now()         │          │
             ↓           └────────┬───────┘          ↓
   ┌─────────────────────┐         │          ┌──────────────────┐
   │  BrainGameEngine    │         │          │  Significator    │
   │  • present→runTrial│         │          │  (player state)  │
   │  • evaluate→advance│         │          │  + knowledge     │
   │  • TrialClock.hrtime│        │          └──────────────────┘
   │  • Paradigm plugin │         │
   └─────────────────────┘         │
                                   ↓
                          ┌──────────────────┐
                          │  GameLoop        │
                          │  • startSession  │
                          │  • tickWithStrat │
                          │  • endSession    │
                          │  (curriculum+    │
                          │   training weave)│
                          └──────────────────┘
```

**Key wires (all live-tested):**

* `GameLoop.tickWithStrategy:797-861` `generateCurriculumEncounters` consumes `CCI.knowledgeHealth` → curriculum beat woven in
* `GameLoop.tickWithStrategy:803-836` `shouldWeaveTraining` + `pickTrainingParadigm` + `makeTrainingBeat` → training beat every 3rd encounter when `trainingSlots > consumed`
* `BrainGameEngine.run:92-148` `present→runTrial→evaluate→advance→sink→adjust` driven by `GameUiPort` (CLI: `BrainGameCli.CliGameUi`) with `TrialClock.hrtime.bigint` for monotonic latency
* `handleTrainingTool:runBrainGame:216-291` persists `trials.appendSession` + `index.recordGame([...paradigm.domains])` + `calibration.put` (EMA `baselineLevel * 0.7 + endLevel * 0.3`)
* `handleUnifiedProfileTool:getUnifiedProfile:152-167` calls `cognitiveIndex.applyDecay(now)` before `snapshot(now)` for consistency with `get_training_profile`
* `AgenticOrchestrator.runLanguageReflective` (FIXED in `ae06102`) now uses `toolsForRun()` instead of hardcoded `TOOLS`, appends both suffixes, dispatches all 11 tools

---

## 3. Dimensions and modules coverage

| Dimension / module | Tools in scope | Test coverage |
|---|---|---|
| Psychological (8×8) | `get_developmental_snapshot`, `get_unified_profile`, `recommend_trajectory` | ✅ altitudes×8, CCI, shadows, drive fixation, rayProfile |
| Cognitive (5 paradigms) | `run_brain_game`, `get_training_profile`, `recommend_workout`, `set_difficulty_override`, `complete_workout`, `get_unified_profile` | ✅ 5 paradigms (n_back, stroop, go_no_go, reaction_time, pattern_prediction), domains+paramSpace |
| Educational (curriculum) | `get_knowledge_snapshot`, `get_unified_profile`, `recommend_trajectory` | ✅ knowledge state, review candidates, educational step in trajectory |
| Veil (felt-sense) | every tool | ✅ all outputs include `feltSense`/`feltSenseHint`/`nextReviewSuggestion` — no raw scores leak |
| Persistence | all handlers | ✅ `trials.appendSession`, `calibration.put`, `index.recordGame`, `index.persistIndex` |
| Scheduling | `GameLoop.tickWithStrategy` | ✅ curriculum weave, training beat weave, encounter generation with 36 real red-layer holons |
| Fallback | `noLlm: true` | ✅ encounter completes with `finalResult` via static FallbackProvider |
| LLM path | `queryLLMWithTools` | ✅ filters input, retries on 5xx/429, Anthropic vs OpenAI protocol support |

---

## 4. Critical gaps found and fixed (committed `ae06102`)

### Gap 1 — Modal isolation (LanguageReflective)
**Before:** `runLanguageReflective:771` used `TOOLS` constant (2 tools) and hardcoded `systemPrompt` without suffixes. The educational orchestrator (training + unified profile) was unavailable in self-reflection encounters.
**Fix:** `AgenticOrchestrator.runLanguageReflective:645-756` now:
* `systemPromptBase` assembled from isSelfReflection template
* `systemPrompt = systemPromptBase + TRAINING_RULES_SUFFIX + UNIFIED_RULES_SUFFIX`
* `queryLLMWithTools(systemPrompt, msgs, this.toolsForRun())` (11 tools)
* Added tool-dispatch branches for `TRAINING_TOOL_NAMES` and `UNIFIED_TOOL_NAMES`

### Gap 3 — Stale cognitive index
**Before:** `getUnifiedProfile:152-167` called `cognitiveIndex.snapshot()` without `applyDecay()`. The unified composite could show scores from the last session without decay applied.
**Fix:** `applyDecay(services.now())` called before `snapshot(services.now())` — matches `get_training_profile:293-313` behaviour.

### Gap 2 (documented, deferred)
`recommend_trajectory` has placeholder "growth:edge" step for the developmental side because `bridgeDevelopmentalToCurriculum` needs `KnowledgeState + forgettingCurves` populated. Once curriculum encounters have been played (which now happens via `GameLoop.tickWithStrategy:798-861` weave), `computeReviewCandidates` returns real candidates and the educational step becomes real. The developmental step is generic by design — the trajectory is presented via `ask_user_question` and the player chooses.

### Gap 4 (documented, low-risk)
`TrainingRuntime.buildUnifiedProfileServices:138-154` uses `loadSave()` which may return legacy save shape without `knowledge` field. The `migrateKnowledgeState` in `GameLoop:249-252` handles this on the next `startSession`. Fresh saves include knowledge by default (`createSignificator:194-207`).

---

## 5. Live CLI validation (all green)

| Command | Result |
|---|---|
| `mysterium train --free stroop --trials 4 --demo 1` | 4 trials, felt-sense rendered, calibration persisted |
| `mysterium train --plan --minutes 12` | 4-item plan with rationale per item |
| `mysterium insights --json` | 8-line snapshot with trend, score, days-ago, felt-sense |
| `mysterium curriculum lint` | 48 holons, 0 errors, 80 warnings (pre-existing) |
| `mysterium diagnostic` | 64 modules, 36 holons, scheduler produces encounter, LLM endpoint active |
| `mysterium --headless --encounters 1 --answer "..."` | 1 encounter, Veil narrative, G_z/P_z/CCI dev primitives |
| `mysterium --headless --encounters 3 --answer A --answer B --answer C` | 3 encounters, save persisted, glossary terms unlocked |
| `mysterium --headless --encounters 1 --modality LanguageReflective --answer "..."` | Somatic self-reflection, rubric-based scoring, save persisted |

---

## 6. Test suite expansion (26 new tests)

`tests/core/assessments/AgenticLoopIntegration.test.ts` (added in `ae06102`):

| Section | Count | Coverage |
|---|---|---|
| Inventory | 3 | 11 tool count, valid OpenAI function format, suffix mentions key tool |
| Training tools | 8 | each of 5 tools + 3 error/rejection paths |
| Unified tools | 7 | each of 4 tools + null sig + unknown tool + focusLine |
| AgenticOrchestrator | 4 | 2/7/11 tool count by integration, noLlm fallback |
| GameLoop | 2 | strategy has curriculum+training slots, tickWithStrategy weaves training beats |
| Paradigm registry | 2 | 5 paradigms with domains+paramSpace, known/unknown lookup |
| **Total** | **26** | all green |

---

## 7. Remaining minor gaps (non-blocking, future work)

| Gap | Severity | Fix when |
|---|---|---|
| `recommend_trajectory` returns generic `growth:edge` instead of line-specific developmental step | Low — agent translates into narrative | After `bridgeDevelopmentalToCurriculum` fully wired |
| `TrainingRuntime.buildUnifiedProfileServices:138-154` doesn't seed `knowledge` for legacy saves | Low — `migrateKnowledgeState` handles on next session | When `loadSave` returns legacy shape, run migration inline |
| `unifiedProfileTools` doesn't return `rayProfile` per-line (only top-level) | Cosmetic | Future enrichment when ray × line interactions are mapped |
| `get_training_profile` returns domains but doesn't include `lastImprovementDelta` | Cosmetic — trend already encoded in `trend` field | Future |
| No persistent tool-call history for debugging | Dev-only | `Mysterium_DEV=1` would log tool calls; not implemented yet |

---

## 8. Verification commands

```bash
python3 skills/workspace-lint/scripts/workspace_lint.py --root .   # 0/0/0
npx tsc --noEmit                                                    # 0 errors
npm run build                                                       # 33 invariants + svelte + vite + cloudflare green
npx vitest run tests/core tests/braingame tests/training tests/engines tests/stores tests/infra tests/adaptive  # 65 files 722 tests
HOME=$(mktemp -d) npx tsx scripts/cli-game.ts train --free stroop --trials 4 --demo 1
HOME=$(mktemp -d) npx tsx scripts/cli-game.ts insights --json
HOME=$(mktemp -d) npx tsx scripts/cli-game.ts train --plan --minutes 12
HOME=$(mktemp -d) npx tsx scripts/cli-game.ts diagnostic
HOME=$(mktemp -d) npx tsx scripts/cli-game.ts curriculum lint
HOME=$(mktemp -d) npx tsx scripts/cli-game.ts --headless --encounters 3 --answer A --answer B --answer C
HOME=$(mktemp -d) npx tsx scripts/cli-game.ts --headless --modality LanguageReflective --answer "..."
```

All green. The core-agentic-loop is now fully integrated: every store feeds the orchestrator, every orchestrator is reachable from every modality, every tool result is Veil-seamed, every tool persists to durable storage, and the LLM has the measure→map→store→develop→trajectory loop the brain-game upgrade called for.

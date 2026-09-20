# Core↔Agentic-Loop — System-Architecture Audit (2026-08-28)

> Full map of the 3 development dimensions (psychological, educational, cognitive),
> the cross-cutting infra, and the agentic-loop entry layer — with every loose
> end and integration gap surfaced. Generated from a parallel walk of every
> module in `src/`. Branch: `3f80ec1` (HEAD).
> Verification: `workspace-lint 0/0/0`, `tsc 0`, `npm run build` green,
> `npx vitest run` 65 files / 722 tests pass.

---

## 0. How the agentic loop operationalises (one breath)

**Boot → Session → Encounter → Tool loop → Tick → End**

1. `scripts/cli-game.ts:441` `program.parse()` (or BFF in WebUI) resolves `LLMConfig` via `ProviderRegistry.resolveConfig` (env → file → fallback), seeds `process.env.VITE_LLM_*`, calls `bootRegistries` (`core/registries/boot.ts:37`).
2. `createSignificator` (`domain/Significator.ts:144`) seeds 8 line × Red altitudes, theta timestamps, empty knowledge.
3. `GameLoop.startSession` (`core/GameLoop.ts:243`) seeds the curriculum registry, runs `migrateKnowledgeState`, computes CCI via `computeCCI(toSnapshot(sig), sig)` (`engines/CCIEngine.ts:696`), and `generateSessionStrategy` (`engines/AutoModeStrategy.ts:118`) — which derives `theme` (warmup/peak/cooldown), `weightBias`, `trainingSlots`, `curriculumSlots`, and `studyTheme`.
4. `AgenticOrchestrator.run` (`assessments/AgenticOrchestrator.ts`) builds context via `ContextPipeline.buildContext` (`infra/llm/ContextPipeline.ts`) — which composes `buildAssessmentContext`, `buildContinuityContext`, `buildShadowContext`, **and** `FrequencySpec` (`infra/llm/FrequencyConditioner.ts:155` — altitude-aware voice register).
5. The orchestrator calls `queryLLMWithTools(systemPrompt, messages, this.toolsForRun())` — `toolsForRun()` returns **2 / 7 / 11** tools depending on integration state.
6. The LLM returns tool calls; the orchestrator dispatches them (`ask_user_question` → `uiHandler`, `complete_encounter` → `finalizeEncounter`, training/unified tools → their handlers).
7. On `complete_encounter`, `finalizeEncounter` (`AgenticOrchestrator.ts:2156+`) builds a `PlayerResponse`, calls `processOutcome` (`engines/ConsequenceEngine.ts:43`) then `applyConsequences` (`:67`) which mutates the `Significator` (drives, polarity, shadows, knowledge, altitudes).
8. The CLI takes the result, calls `GameLoop.applyResponseOnly` (`GameLoop.ts:74`) to advance the transformation state machine + persist curriculum knowledge + UserMatrixModel, then `tickWithStrategy` (`:297`) to schedule the next encounter — weaving a **curriculum beat** (`:798-861`) and/or a **training beat** (`:803-836`).
9. `GameLoop.endSession` (`:922`) advances macro-events, runs `probeCurriculum` (the meta-cognitive probe), and persists `Sig` + `World` atomically via `saveAll` (`persistence/SaveRepository.ts:310`).

---

## 1. Hierarchical Architecture Tree

```
ROOT: src/
├── cli/                            ── entry + adapters
│   ├── BrainGameCli.ts             ── GameUiPort (raw-mode keypress), GameRunnerPort
│   ├── TrainingRuntime.ts          ── services singleton, runTrain/Insights/Calibrate/Export, buildTrainingIntegration + buildUnifiedProfileServices
│   └── ExportRuntime.ts            ── JSON/CSV export of trial telemetry
│
├── core/                           ── game engine
│   ├── GameLoop.ts                 ★ ROUTER — startSession/tickWithStrategy/endSession/applyResponseOnly, persistence glue
│   ├── domain/                     ── pure data
│   │   ├── Significator.ts            (player state root: 8 altitudes, transformations, knowledge, polarity, shadows, theta, drives, contactBoundaryPermeability)
│   │   ├── SignificatorSnapshot.ts    (Veil-safe projection for LLM context)
│   │   ├── PolarityCellVector.ts      (8×8 polarity cells, line profiles, master polarity)
│   │   ├── ShadowLedger.ts            (4-quadrant shadow entries: surfacedAt/resolvedAt/compoundPartner)
│   │   ├── Holon.ts                   (line×stage entity — NPC/faction/location/event/artifact/creature)
│   │   ├── Line.ts / Stage.ts / Drive.ts / Ray.ts / State.ts / enums.ts
│   │   ├── EncounterSpecNew.ts        (ScheduledEncounter — runtime schedule)
│   │   ├── ConsequenceRecord.ts
│   │   └── SharedTypes.ts / ArchetypalClass.ts / Stats.ts / PolarityTrace.ts / Encounter.ts
│   │
│   ├── engines/                    ── pure logic
│   │   ├── CCIEngine.ts                (5 dim: altitude, drive, polarity, shadow, transformation; + metabolicHealth G_z/P_z)
│   │   ├── TransformationDetector.ts   (3-phase crucible + commitTransformation)
│   │   ├── PolarityEngine.ts           (recordTrace, computeCrystallization, checkHarvest White-stage)
│   │   ├── GreaterCycleEngine.ts       (G_z/P_z metabolicHealth, contactBoundaryPermeability, INVOLUTION_GROUND, Indigo-ray)
│   │   ├── MacroCatalystEngine.ts      (PESTLE tension, MacroEvent lifecycle, getMacroEncounterModifications)
│   │   ├── ShadowContentGenerator.ts   (per-quadrant archetypes, prompt suffix)
│   │   ├── UserMatrixModel.ts          (per-line×stage Matrix/Potentiator inference from responses; phase)
│   │   ├── ConsequenceEngine.ts        (processOutcome, applyConsequences, updateKnowledgeFromEncounter — 173 lines)
│   │   ├── PriorityComputation.ts      (7 sub-scores: theta/shadow/polarity/transformation/drive/narrative/sessionFit)
│   │   ├── EncounterScheduler.ts       (scheduleNext + scheduleNextWithHolonicReturn + scheduleThresholdMode)
│   │   ├── CandidateGeneration.ts      (5 filters: layer/altitude/cooldown/narrative/modality + curriculum candidates)
│   │   ├── AutoModeStrategy.ts         (SessionStrategy: theme/arc/weightBias/trainingSlots/curriculumSlots/studyTheme)
│   │   ├── ThetaDecay.ts               (per-line half-lives, detectBleedThrough)
│   │   └── hooks.ts                    (maybeFireHook — 17-byte no-op stub; TRANSFORMATION HOOKS NOT WIRED)
│   │
│   ├── assessments/                ── the 8×8 modules + orchestrator
│   │   ├── AgenticOrchestrator.ts   ★★ ORCHESTRATOR — LLM tool loop, runLanguageReflective, runFallback, buildContext, finalizeEncounter
│   │   ├── trainingTools.ts         ★ TOOLS — 5 training tools + TRAINING_RULES_SUFFIX
│   │   ├── unifiedProfileTools.ts   ★ TOOLS — 4 unified tools + UNIFIED_RULES_SUFFIX
│   │   ├── agentTypes.ts            (AgentMessage, ToolCall, AskUserQuestion{Params,Result}, UserAnswer, MCQOption)
│   │   ├── engine.ts                (runAssessment, runShadowAssessment, computeDriveHealth, identifyDominantPathology)
│   │   ├── scoring.ts               (weighted scoring)
│   │   ├── itemSelection.ts         (per-mode item selection)
│   │   ├── registry.ts              (ModuleRegistry — O(1) line:stage lookup)
│   │   ├── bootModules.ts           (bootModuleRegistry iterates 8 lines × 8 stages)
│   │   ├── SessionAgent.ts          (legacy — referenced but no longer in CLI path)
│   │   ├── types.ts                 (StageAssessment, TrialResult, AssessmentResult, ShadowAssessmentResult, 10 MeasureDimensions)
│   │   ├── cli/TaskRenderers.ts     (developmental task renderers: dilemma, self_report, emotion, cooperation, imitation; brain-game stubs)
│   │   └── {line}/{stage}.ts        (8 lines × 8 stages = 64 modules, each with tasks + driveProbes + scoringRubric)
│   │
│   ├── braingame/                  ── cognitive kernel
│   │   ├── BrainGameEngine.ts       (present→runTrial→evaluate→advance→adjustDifficulty, GameUiPort, TrialClock)
│   │   ├── TrialClock.ts            (hrtime.bigint, calibrationOffsetMs)
│   │   ├── TrialRecordStore.ts      (appendSession/recentSessions KV-backed)
│   │   ├── types.ts                 (ParadigmDefinition, TrialPlan, TrialRecord, NumericParams, Rng, GameSummary)
│   │   ├── registry.ts              (5 paradigms: n_back, stroop, go_no_go, reaction_time, pattern_prediction)
│   │   └── paradigms/{5}.ts        (per-paradigm present/evaluate/advance/init/isComplete/paramSpace)
│   │
│   ├── curriculum/                 ── educational kernel
│   │   ├── CurriculumRegistry.ts    (singleton; get/getBySubject/getByLevel/getPrerequisites/getAnalogies/count)
│   │   ├── CurriculumSeed.ts        (idempotent loader: cs.foundations/program, math.foundations, physics.foundations/program; cached lint)
│   │   ├── CurriculumLinter.ts      (21+ checks: prerequisites/depth/rubric/coverage)
│   │   ├── CurriculumMigration.ts   (KnowledgeState schema migrations)
│   │   ├── CurriculumBridge.ts      (bridgeDevelopmentalToCurriculum, bridgeCurriculumToDevelopmental, computeCurriculumReviewSchedule, computeKnowledgeHealth)
│   │   ├── DepthAssessment.ts       (classifyDepth, updateConceptState, calibration bias)
│   │   ├── ForgettingCurve.ts       (computeRetention, computeReviewCandidates, nextDepthLevel)
│   │   ├── KnowledgeGraph.ts        (buildGraph, topologicalSort, learningPath, findReadyConcepts)
│   │   ├── LearningAnalytics.ts     (studyEfficiency, learningVelocity, modalityEffectiveness)
│   │   ├── MetaCognitiveProbe.ts    (probeCurriculum — auditProgression + calibrateAllRubrics, fires at session end)
│   │   ├── ProgressionValidator.ts  (auditProgression — monotonic/retention/stuck/depth_ceiling per concept)
│   │   ├── RubricCalibrator.ts      (calibrateRubric/calibrateAllRubrics — discriminability/threshold/coverage/consistency)
│   │   ├── SeedInitialKnowledge.ts  (initial concept state per subject)
│   │   ├── types.ts                 (ConceptState, DepthLevel, StudyTheme, CurriculumHolon, ForgettingCurve, 44 symbols)
│   │   ├── index.ts                 (barrel — every curriculum export)
│   │   └── data/                    (cs.foundations/program, math.foundations, physics.foundations/program — 48 holons, 3 subjects, 7 concepts)
│   │
│   ├── training/                    ── cognitive orchestration
│   │   ├── CognitiveIndex.ts        (8-line skill scores, EMA baseline, decay, feltSense)
│   │   └── WorkoutPlanner.ts        (planWorkout decay×focus×balance, FatigueMonitor)
│   │
│   ├── adaptive/                    ── difficulty calibration
│   │   ├── AdaptiveDifficultyService.ts (initAdaptiveState, levelFor/FromParadigm, createTrialAdjuster, strategyForParadigm)
│   │   └── CalibrationStore.ts      (KV-backed per-paradigm baselineLevel/lastLevel/override)
│   │
│   ├── presentation/                ── Veil descriptors
│   │   └── veilDescriptors.ts       (describeStage, describePersonalResonance — the only renderer for the CLI's felt-sense output)
│   │
│   ├── registries/                  ── bare 200-byte data blobs (LineRegistry, StageRegistry, RayRegistry, EncounterRegistry, DriveRegistry)
│   │   ├── boot.ts                  (registers the 8 lines, 8 stages, 7 rays, 4 drives, red-encounters)
│   │   ├── {lines,stages,rays,drives,encounters}/*.module.ts
│   │   └── index.ts                 (5 registry instances — created but not consumed in the agentic loop)
│   │
│   ├── data/                        ── content data files
│   │   ├── red-layer-holons.json    (36 holons: NPCs/factions/locations/creatures/events/artifacts)
│   │   ├── glossary.ts              (GLOSSARY_TERMS, PLAYER_GLOSSARY_TERMS, checkTermUnlocks)
│   │   ├── concept-drafts.json      (legacy concept index)
│   │   ├── PolarityOntology.ts      (per-line×stage polarity textures)
│   │   ├── RedPESTLE.ts             (PESTLE config for Red layer)
│   │   ├── shadowKeywords.ts        (shadow detection lexicon)
│   │   ├── calibrationPrompts.ts    (calibration probe prompts)
│   │   ├── HolonRegistry.ts         (helper — addHolon/queryByKind/queryByAltitude/queryByLine/queryByNarrativeRole)
│   │   ├── ConceptDraftIndex.ts     (helper — queryByLineStage/queryByModality)
│   │   └── encounters/red/          (per-line encounter spec files)
│   │
│   ├── events/                      ── typed event bus
│   │   ├── EventBus.ts              (on/emit/clear — 23 lines)
│   │   └── GameEvents.ts            (GameEventMap — 14 typed events: encounter_scheduled, shadow_surfaced, cci_computed, etc.)
│   │   ⚠ ONLY CONSUMER: src/lib/server/agentRegistry.ts (WebUI BFF) and src/core/agent/AgentRuntime.ts (NEVER INSTANTIATED)
│   │
│   ├── agent/                       ── background-agentic runtime (NEVER WIRED IN CLI)
│   │   ├── AgentRuntime.ts          (EventBus → DirectorAgent bridge)
│   │   ├── Loom.ts                  (rolling 5-event / 3-free-input context)
│   │   ├── DirectorAgent.ts         (subscribe to events, generateNextProbe)
│   │   ├── RecognitionAgent.ts, ReflectionAgent.ts, CalibrationAgent.ts, SynthesisAgent.ts
│   │   ├── AgenticProbe.ts, validateAgenticProbe.ts
│   │   ├── FallbackNarratives.ts    (single 395-byte stub: "LLM unavailable")
│   │   ├── PersistentAgent.ts       ★ STUB — class with no-op constructor (YAGNI-EFF-3)
│   │   ├── PersistentAgentBridge.ts ★ STUB — throws "USE_PERSISTENT_AGENT is always false"
│   │   └── ToolRegistry.ts          ★ STUB — throws "USE_PERSISTENT_AGENT is always false"
│   │
│   ├── fallback/                    ── 81KB of pre-written mirror responses
│   │   ├── FallbackProvider.ts      (126 symbols — per-line per-stage, every modality)
│   │   └── withFallbackVeil.ts      (Veil filter over FallbackProvider)
│   │
│   ├── usecases/                    ── thin helpers
│   │   ├── FastStaircase.ts, LineCeilings.ts, RandomSource.ts, RegistryEngine.ts, Staircase.ts, ThresholdMaps.ts
│   │   ├── ShadowDetector.ts        (per-line shadow detection — 12 fns)
│   │   ├── OnboardingCalibrator.ts  (binary-search onboarding per spec — UNUSED IN CLI)
│   │   ├── StageSynthesizer.ts      (UNUSED in CLI; curriculum uses it via deep imports)
│   │   └── DevelopmentalReport.ts   (UNUSED in CLI)
│   │
│   ├── accessibility/AccessibilitySettings.ts
│   ├── logic/dilemmaMapping.ts
│   ├── telemetry/                   ── in-memory collector
│   │   ├── TelemetryEvent.ts
│   │   ├── TelemetryCollector.ts
│   │   └── DevelopmentalReport.ts
│   │
│   └── (top-level concerns)
│       ├── withFallbackVeil.ts      (wraps FallbackProvider with Veil filtering)
│       └── shadows, polarity, etc. as needed
│
├── infra/                           ── cross-cutting
│   ├── llm/
│   │   ├── LLMClient.ts             (queryLLM, queryLLMStream, queryLLMWithTools, evaluateResponse; fetchWithTimeout+Retry; Anthropic/OpenAI protocols; input+output VeilFilter)
│   │   ├── ProviderRegistry.ts      (12+ known provider profiles; env-var resolution; /models + models.dev discovery)
│   │   ├── ProxiedLLMClient.ts      (browser → /api BFF proxy)
│   │   ├── VeilFilter.ts            (filterInput/filterOutput, 0 export — but the imports are exported from the *index* in lib)
│   │   ├── ContextPipeline.ts       (buildContext — assembles system prompt from line×stage+lineage+continuity+shadow+frequency)
│   │   ├── FrequencyConditioner.ts  (altitude-aware voice register; cross-altitude directive)
│   │   ├── QualitativeFeedback.ts   (Veil-mapped clinical terms → felt-sense phrases)
│   │   ├── ConsequenceParser.ts     (parses LLM JSON output into structured ConsequenceRecord) ⚠ 1 consumer: scripts/cli-game.ts only
│   │   ├── templates.ts             (modalityOpenerTemplate, moduleSummaryTemplate, responseOptionsTemplate)
│   │   └── contracts/               (modality contracts: LanguageReflective, ScenarioChoice, DeterministicFraming — real; 4 placeholder)
│   │
│   ├── persistence/
│   │   ├── KeyValueStore.ts         (interface)
│   │   ├── FileKeyValueStore.ts     (Node fs-based)
│   │   ├── LocalStorageStore.ts     (browser)
│   │   ├── CapacitorPreferencesStore.ts (mobile)
│   │   ├── createKeyValueStore.ts   (factory)
│   │   ├── validateSignificator.ts  (backward-compat shims — the canonical loader)
│   │   └── SaveRepository.ts        (SaveRepository class + CLI file-based loadSave/saveGame/loadAll/saveAll/deleteAllSaves; atomic save-via-rename)
│   │
│   ├── profiles/ProfileManager.ts   (36 symbols: listProfiles, createProfile, setActiveProfile, buildContextInjection, appendEncounterLog, loadUnlockedTerms, addUnlockedTerms, agentReadProfileFile, agentWriteProfileFile, etc.)
│   │
│   ├── telemetry/                   ── opt-in analytics
│   │   ├── TelemetryService.ts      (recordEvent/flush, opt-in via getOptIn)
│   │   └── TelemetryStore.ts        (encrypted-at-rest via ICryptoStore)
│   │
│   ├── crypto/CryptoStore.ts        (interface for symmetric encryption)
│   ├── i18n/I18n.ts                 (i18n stub — no consumers)
│   └── native/NativeBridge.ts       (Capacitor bridge)
│
├── lib/                             ── SvelteKit (WebUI) — UNREACHED BY CLI
│   ├── stores/
│   │   ├── cloudSyncStore.ts        (debounced 5s sync to /api/sig; immediate on session_ended)
│   │   ├── telemetryStore.ts        (telemetry parity with CLI's TelemetryService, debounce 5s)
│   │   ├── accessibilityStore.ts    (settings persistence)
│   │   └── ...
│   ├── engine/gameEngine.ts         (Svelte game engine; uses recordEvent + flushSync)
│   └── server/agentRegistry.ts      (per-request EventBus → DirectorAgent)
│
└── scripts/cli-game.ts              (5036 lines — see §6)
```

---

## 2. The 11 tools — current dispatch surface

| # | Tool | Module | LLM-callable? | Storage touched | Veil-safe? |
|---|---|---|---|---|---|
| 1 | `ask_user_question` | `AgenticOrchestrator.ts:72` | ✅ always | none | n/a (player-facing) |
| 2 | `complete_encounter` | `AgenticOrchestrator.ts:111` | ✅ always | Sig + World via `applyConsequences` | `feedback` Veil-filtered |
| 3 | `run_brain_game` | `trainingTools.ts:61` | ✅ if `training` | `trials`, `index`, `calibration` | `feltSenseHint` only |
| 4 | `get_training_profile` | `trainingTools.ts:78` | ✅ if `training` | reads `index` | per-line `feltSense` |
| 5 | `recommend_workout` | `trainingTools.ts:87` | ✅ if `training` | none | `rationale` field |
| 6 | `set_difficulty_override` | `trainingTools.ts:103` | ✅ if `training` | `calibration.put` | n/a |
| 7 | `complete_workout` | `trainingTools.ts:120` | ✅ if `training` | reads `index` | `nextReviewSuggestion` |
| 8 | `get_developmental_snapshot` | `unifiedProfileTools.ts:33` | ✅ if `unifiedProfile` | none | `feltSense` per altitude |
| 9 | `get_knowledge_snapshot` | `unifiedProfileTools.ts:42` | ✅ if `unifiedProfile` | none | `feltSense` for retention |
| 10 | `get_unified_profile` | `unifiedProfileTools.ts:51` | ✅ if `unifiedProfile` | calls `applyDecay` | composite `feltSense` |
| 11 | `recommend_trajectory` | `unifiedProfileTools.ts:60` | ✅ if `unifiedProfile` | none | `feltSense` arc |

**Coverage**: 11/11 reachable from every modality (LanguageReflective fix in `ae06102`). 2 (core) always; 5 (training) wired via `buildTrainingIntegration`; 4 (unified) wired via `buildUnifiedProfileServices`.

---

## 3. Per-dimension deep audit

### 3.1 Psychological development (8 lines × 8 stages + 4-quadrant shadow + CCI)

**What it operationalises:**
- **Significator** (`domain/Significator.ts:71`) — 8 altitudes, 7 rays, 4 drives, polarity master+64 cells, shadow ledger, theta decay timestamps, transformation history, knowledge, contactBoundaryPermeability.
- **CCI** (`engines/CCIEngine.ts:696`) — 5 normalised dimensions × weights, plus `metabolicHealth` (G_z/P_z via `GreaterCycleEngine.computeMetabolicHealth:335`), session signals, dominantDimension.
- **Transformation** (`engines/TransformationDetector.ts`) — detectThreshold → advanceTransformation (3 phases) → commitTransformation (new target stage on phase 'complete').
- **Polarity** (`engines/PolarityEngine.ts`) — recordTrace per encounter, computeCrystallization, checkHarvest (White stage, 51% STO / 95% STS).
- **UserMatrixModel** (`engines/UserMatrixModel.ts:64`) — per-line×stage Matrix/Potentiator state from response inference (4 shadow categories × AVOIDANCE/FIXATION/BYPASS/RESISTANCE keywords), promotePhase, computeUserMatrixPriority.
- **Shadows** (`domain/ShadowLedger.ts` + `engines/ShadowContentGenerator.ts:190`) — surface, resolve, compoundPartner; per-quadrant archetype content.

**Architectural limitations:**

1. **Shadow detection is keyword-based + binary** — `inferFromResponse` (`UserMatrixModel.ts:118`) uses 4 hardcoded keyword lists (~14 keywords total). Misses:
   - Sarcasm, indirect expression, multi-language input
   - Drive-specific signals not in the lists (e.g. communion signals that aren't about "we/us")
   - LLM-generated write-ins with rich metaphor (the most common case in self-reflection)

2. **Transformation is single-axis** — `commitTransformation` advances `currentStage` (the global, not per-line). The 8-line model implies per-line stages, but only one stage is tracked. `lineToThreshold` and per-line transformation would be a much richer developmental signal.

3. **Polarity is coarse** — `recordTrace` (`PolarityEngine.ts:42`) stores a single `dominantPattern` per cell; 4 shadow quadrants × 4 drives × 8 stages × 8 lines = 1024 cells would have far more texture. `PolarityOntology.ts` claims the per-line×stage texture catalogue but is unused in the LLM context.

4. **CCI is unrevealed to the player** — `computeCCI` runs in `startSession` and every `reEvaluationInterval` (default 5) but the only surfaces are `--dev`/`--json`. The `feltSense` mapping in `unifiedProfileTools.getDevelopmentalSnapshot` is a single threshold band (`>0.6 integration humming, >0.4 field settling, else foundations gathering`). 5 dimensions collapsed to 1.

5. **Hooks are dead** — `engines/hooks.ts:15` `maybeFireHook` is a 17-byte no-op. `GameLoop:124,416,1082` and `ConsequenceEngine:354,357,370,379` call it but it never fires. DirectorAgent (the background-agentic layer) was designed to subscribe to these but is never instantiated in CLI.

6. **Holonic Return is implementation-light** — `EncounterScheduler.scheduleNextWithHolonicReturn:238` accepts `encountersSinceRefresh` but the only consumer (`GameLoop.tickWithStrategy:360`) passes the value; the actual "holonic return" encounter synthesis is minimal — no specific return-encounter format, just an extra encounter.

7. **MacroEvents never trigger automatically** — `tryTriggerMacroEvent` (`MacroCatalystEngine.ts:79`) exists; `GameLoop.endSession` advances existing events but nothing in the main loop ever calls `tryTriggerMacroEvent` after PESTLE accumulates enough tension. PESTLE decays per session (`decayTension:58`) so they never reach the threshold.

8. **GreaterCycle harvest is unreachable in CLI** — `checkHarvest` is called from `endSession` only when `currentStage === 'White'` AND the polarity crystallisation is sufficient. There's no path in the normal session flow that lets a player reach White stage without long-term self-direction (no automated progression test for this).

9. **UserMatrixModel is observed but not surfaced** — `computeUserMatrixPriority` (`:345`) feeds the scheduler, but the player never sees their Matrix/Potentiator state. Felt-sense mapping for the Matrix field doesn't exist.

10. **Drive inference is asymmetric** — Agency/Communion have `FIXATION_KEYWORDS`/`AVOIDANCE_KEYWORDS`; Eros/Agape have `BYPASS_KEYWORDS`/`RESISTANCE_KEYWORDS`. The mapping between drives and shadow quadrants is one-way (addiction/allergy detection works, but bypass/avoidance are conflated).

11. **ContextPipeline builds a system prompt, not a cognitive context** — `buildContext` (`infra/llm/ContextPipeline.ts`) is the per-encounter prompt composer, but it has no knowledge of the cognitive index or the brain-game history. The LLM doesn't know what brain games the player just played unless it asks via `get_training_profile`.

12. **Shadow content is `LINE_SHADOW_ARCHETYPES` static** — `ShadowContentGenerator.ts:41-90` hardcodes per-line archetypes. Per-line×stage×quadrant content would be richer but requires content authoring (the curriculum-style approach).

13. **Veil compliance in `finalizeEncounter` depends on `narrativeSummary`** — if the LLM sets `narrativeSummary` to a clinical phrase (e.g. "you demonstrated a Dark-Addiction to Communion"), it leaks. The VeilFilter only runs on the LLM *response* (`filterOutput`), not on the structured `params.feedback` field the LLM sends in `complete_encounter`.

### 3.2 Educational development (curriculum)

**What it operationalises:**
- **CurriculumRegistry** (singleton) — 48 holons across 3 subjects (cs.foundations/program, math.foundations, physics.foundations/program) seeded at first `startSession`. Indexed by id, subject prefix, level, parent.
- **KnowledgeState** (in Significator.knowledge) — `conceptStates` (per-concept depthLevel/retention/lastReviewedAt/reviewCount/depthHistory/misconceptionFlags), `subjectProgress`, `studyHistory`, `learningProfile` (5 metrics), `forgettingCurves`.
- **ForgettingCurve** — `computeConceptRetention` (per-concept exponential decay), `computeReviewCandidates`, `nextDepthLevel` (5-stage ladder: absent → memorized → comprehended → applied → analyzed → evaluated → transformed).
- **CurriculumBridge** — `bridgeDevelopmentalToCurriculum` (theta_decay/drive_rebalance/shadow_surface → recommendation), `bridgeCurriculumToDevelopmental` (opposite direction), `computeKnowledgeHealth` (used in `GameLoop:778`).
- **CurriculumLinter** — 21+ checks (prerequisites, depth, rubric coverage). Run at seed time; results cached in `_cachedLintResult`.
- **MetaCognitiveProbe** — runs at session end only; composes `auditProgression` + `calibrateAllRubrics`.

**Architectural limitations:**

1. **The educational stream is auto-weaved but rarely reaches the player visibly.** `GameLoop:798-861` injects up to 1 curriculum encounter per tick (after the first, when slots remain). But:
   - The educational encounter is converted to a `ScheduledEncounter` with `moduleRef: curriculum:<conceptId>` (`curriculumCandidateToEncounter:728-765`) — the agentic orchestrator then calls `runFallback` (or `runModuleAssessment`) which uses the developmental module, not a curriculum-specific module.
   - There's no "curriculum mode" path in the orchestrator that asks the LLM to teach/review the concept. The student-facing educational experience is *implicit* — the LLM must infer from the encounter ID that this is a study beat.

2. **`get_knowledge_snapshot` only fires when the player has studied.** `unifiedProfileTools.getKnowledgeSnapshot:131` returns `{ empty: true }` if `sig.knowledge` is missing. The 5 subjects' seed data is loaded into the registry, but `SeedInitialKnowledge` is not called automatically — only when the player has played a curriculum encounter. Fresh save = empty knowledge snapshot.

3. **No CLI command to inspect curriculum progress** — `mysterium curriculum lint` exists, but there's no `mysterium curriculum status` or `mysterium curriculum concepts --depth <level>`. The 5 subjects, 48 holons, and the player's progress are all hidden.

4. **No curriculum "next step" tool** — `recommend_trajectory` returns a generic "review/new_material" step but the LLM has no way to ask "give me a curriculum encounter on concept X" because the orchestrator doesn't expose the curriculum as a modality.

5. **`bridgeDevelopmentalToCurriculum` is wired in `GameLoop.generateCurriculumEncounters` but not in `recommend_trajectory`.** The latter comment-acknowledges this: "Future: bridgeDevelopmentalToCurriculum will wire theta/drive needs to curriculum when KnowledgeState has retention data." (`:175`)

6. **Prerequisite gaps only fire in `--curriculum` mode** — `cli-game.ts:1660` `renderPrerequisiteGaps` is called only when `forcedEncounter.curriculumConceptId` is set (the `--curriculum` flag path). In a normal session where `GameLoop.tickWithStrategy:798-861` weaves a curriculum encounter, the gap check is silently skipped.

7. **Linter results never reach the player** — `_cachedLintResult` is computed at seed but only logged via `console.warn` if errors exist. There's no CLI command or tool to expose "your curriculum has 80 warnings" or "concept X is missing 2 canDo items".

8. **Curriculum-only paths require manual `mysterium curriculum lint`/`--curriculum` flag** — there's no auto-curriculum-mode the LLM can request via tool. The LLM is the orchestrator; if it knows a concept should be reviewed, it has no tool to ask the system to schedule a curriculum encounter on that concept.

9. **`LearningAnalytics` is never read** — the analytics module computes `studyEfficiency`, `learningVelocity`, `modalityEffectiveness`, but no consumer calls `computeLearningAnalytics` outside the curriculum barrel export.

10. **`ProgressionValidator` and `RubricCalibrator` are reachable only via `probeCurriculum` (session end).** A meta-cognitive "audit now" tool would let the LLM detect stuck concepts mid-session and adjust.

11. **5 depth levels × 48 holons = 240 possible cells**, but `ALL_DEPTH_LEVELS` has 7 levels (absent, memorized, comprehended, applied, analyzed, evaluated, transformed). At most ~30 are well-populated.

12. **Isomorphisms are data but not leverageable** — `getAnalogies` (`:74`) returns isomorphic concepts, but no scheduler function uses them to bias selection. The code at `CandidateGeneration.ts:696-727` does boost priority for mastered isomorphisms in `generateCurriculumCandidates`, but this is a one-off enrichment, not a structural use of the isomorphism graph.

13. **`SeedInitialKnowledge` exists but is not auto-called.** The player's first curriculum encounter must be triggered by `GameLoop`'s curriculum weave with `studyTheme: 'new_material'`, which then calls `getOrCreateConceptState` lazily. No initial concept state.

14. **No concept-level "what was the last depth achieved" recovery** — when a player re-installs or migrates save, `depthHistory` is preserved but the `depthLevel` is the latest entry. There's no rollback handling if `depthLevel` doesn't match `depthHistory[last]`.

15. **CurriculumBridge imports `computeReviewCandidates` but never actually re-exports it through the tool surface.** The LLM has `get_knowledge_snapshot` (read), but no `study_concept` or `get_concept_detail` tool.

### 3.3 Cognitive development (brain-games)

**What it operationalises:**
- **BrainGameEngine** (`braingame/BrainGameEngine.ts:54`) — pure state machine: present → runTrial → evaluate → advance → sink → adjustDifficulty. Drives `BrainGameUi` (raw-mode keypress) for CLI, or future WebUI.
- **5 paradigms** (n_back, stroop, go_no_go, reaction_time, pattern_prediction) — each with `paramSpace`, `init`, `present`, `evaluate`, `advance`, `isComplete`, `defaultTrials`, `timed`, `domains`.
- **AdaptiveDifficultyService** (`adaptive/AdaptiveDifficultyService.ts:17`) — `initAdaptiveState`, `levelForParadigm`, `levelFromParadigm`, `createTrialAdjuster`, `strategyForParadigm`. Per-paradigm `ParamSpace` (e.g. n for n_back, color count for stroop).
- **CalibrationStore** (KV) — per-paradigm `baselineLevel` (EMA), `lastLevel`, `override` (player-set easier/harder/level).
- **TrialRecordStore** (KV) — appendSession, recentSessions. ~10K trials/player at 12 trials/game.
- **CognitiveIndex** (`training/CognitiveIndex.ts:45`) — 8-line `LineSkill` (score, baseline, lastPlayedAt, sessionsPlayed), `recordGame` (EMA of performance), `applyDecay` (per-line half-life), `snapshot`, `feltSenseFor`.
- **WorkoutPlanner** (`training/WorkoutPlanner.ts`) — `planWorkout` (decay × focus × balance, 2-6 items, 2-4 min each, no immediate repeats). `FatigueMonitor` (collapse/break/light).
- **CLI surface** — `mysterium train --free <paradigm>`, `mysterium train --plan`, `mysterium insights`, `mysterium calibrate`, `mysterium export`.

**Architectural limitations:**

1. **No LLM-mediated cognitive context in the system prompt.** `get_training_profile` is a tool, but the orchestrator doesn't pre-load it into the system prompt at session start. The LLM must call the tool mid-encounter to know what the player just trained.

2. **`recommend_workout` returns `rationale` as developer-language.** Per spec, all player-facing values are felt-sense, but `WorkoutItem.rationale` is `"${line} readiness is ${trend}"` — that's a clinical observation, not a felt-sense phrase. Used as-is by the tool. ⚠ veils violation if the LLM passes it through.

3. **CognitiveIndex `feltSenseFor` is per-line but the CLI's `insights` command renders them as a single bar/sparkline** — `renderBar`/`renderSparkline` show the line label and phrase side by side. Functional, but not a unified felt-sense arc.

4. **No re-calibration trigger.** The system has `CalibrationStore` and `--calibrate` command but no automatic re-calibration when `lastPlayedAt` exceeds N days, or when a player's trend is 'decaying' for >3 sessions.

5. **No "training beat" is in the agentic system prompt.** `GameLoop.tickWithStrategy:803-836` weaves a training beat (every 3rd encounter after #2) but the LLM doesn't know that. When it gets a `ScheduledEncounter.isTrainingBeat: true`, the LLM has no protocol — only the system prompt suffix mentions it. The LLM might not understand the beat is mandatory.

6. **Brain-game performance is `accuracy * 0.6 + latencyScore * 0.4` for timed paradigms, raw accuracy for untimed.** This means the same accuracy with different RTs maps to different "performance" — but the CLI's `--json` mode doesn't show the formula, so debugging performance regressions is opaque.

7. **The `set_difficulty_override` tool persists overrides but never clears them.** Once a player says "too hard", the override is permanent unless they call the tool again. There's no time-decay on overrides.

8. **Trial-level `note` (paradigm-specific coaching) is rendered but not persisted** — `BrainGameEngine:130` calls `ui.show([evaluation.note])` but `note` is not in the `TrialRecord` shape. So per-trial coaching is ephemeral.

9. **No cross-paradigm correlation analysis.** `CognitiveIndex.recordGame` updates each line independently. There's no detection of "stroop worsening while n_back improving" — a real cognitive signal.

10. **`export` produces JSON or CSV, but no analytics command consumes them.** No `mysterium insights --from <file>` to replay/compare exports. The CSV/JSON are terminal-only.

11. **No training plan persistence.** When `mysterium train` exits mid-workout (e.g. SIGINT), the partial plan is lost. The `workout.completed` counter is in-memory only.

12. **Only the CLI has brain-games; WebUI doesn't.** The `BrainGameUi` is raw-mode terminal-only. The 5 paradigms could be ported to the browser (canvas + keyboard), but the GameUiPort is unimplemented for that path.

13. **No brain-game "shadow" mode.** The developmental modules have shadow/calibration/practice modes (`runModeAwareAssessment:147`); brain-games don't. A "shadow paradigm" (e.g. 3-back at player's baseline, no feedback) would probe automaticity, not capacity.

14. **No web-audio/haptic feedback for accessibility.** The CLI has `--accessible` (text fallback) and `--practice` (no time pressure), but the paradigms don't use `AccessibilitySettings` (`core/accessibility/AccessibilitySettings.ts:888 bytes` — almost empty).

15. **Cognitive metrics are not exposed to the LLM via the orchestrator's system prompt.** `get_training_profile` is a tool, but `ContextPipeline.buildContext` doesn't read it. The LLM discovers the cognitive history on-demand.

16. **No progress visualization CLI command.** `mysterium insights` is line-by-line, no per-paradigm, no time-series chart.

---

## 4. Cross-cutting infra (with limitations)

### 4.1 Persistence (`infra/persistence/`)
- **Atomic save** via `saveAll` (`SaveRepository.ts:310`) — envelope `{version:2, savedAt, sig, world}` written to temp + rename, with individual files for backward compat. ✅ solid.
- **Backward compat shims** in `validateSignificator.ts` — load any save, patch missing fields. ✅ robust.
- **Profile-scoped dirs** — `getSaveDir` resolves active symlink; per-profile saves. ✅ clean.
- **KeyValueStore** interface + 3 implementations (file/localStorage/Capacitor). ✅ portable.
- **Encrypted telemetry** at rest via `ICryptoStore`. ✅ opt-in only.

**Limitations:**
- `LocalStorageStore` and `CapacitorPreferencesStore` are 1.4KB / 736B — they implement the interface but no consumer instantiates them outside of `createKeyValueStore.ts:739`. WebUI uses `localStorage` directly via `lib/stores/`, bypassing the abstraction.
- `CryptoStore` interface is 8 lines — only `TelemetryStore` consumes it. No general-purpose encryption for save files.
- `i18n/I18n.ts` (2.3KB) is a no-op stub. No translations exist.

### 4.2 LLM gateway (`infra/llm/`)
- **12+ provider profiles** in `ProviderRegistry.ts` (openai/anthropic/gemini/openrouter/groq/deepseek/cerebras/fireworks/together/xai/ollama/custom). ✅ comprehensive.
- **Dynamic model discovery** via `/models` endpoint with `models.dev` fallback. ✅ no hardcoded models.
- **Anthropic vs OpenAI protocol** detection by baseUrl. ✅ both supported.
- **fetchWithRetry** with timeout + 5xx/429 retry. ✅ resilient.
- **VeilFilter** on both input and output. ✅ bidirectional.
- **Streaming** via `queryLLMStream` (SSE consumer). ✅ responsive.
- **Tool calling** via `queryLLMWithTools` (Anthropic `input_schema` / OpenAI `tools`). ✅ multi-protocol.

**Limitations:**
- `ProxiedLLMClient.ts` (13.6KB) is browser-only — when `isBrowserWithBFF()` returns true, all calls route through the BFF. No consumer in the CLI.
- `LLMClient.ts` has a hardcoded 30s timeout per call (`:54` `LLM_TIMEOUT_MS`). Long-form generation (multi-paragraph Veil narrative) can hit this.
- `evaluateResponse` returns a `FALLBACK: { score: 0.5, feedback: 'LLM unavailable' }` on error — silently. The `assessments/engine.ts` uses this for calibration but the player never sees the fallback message.
- `ConsequenceParser.ts` (5.2KB) has exactly 1 consumer: `scripts/cli-game.ts:321` (legacy Direct-Questioning path). It's not used by the orchestrator at all.
- `QualitativeFeedback.ts` (6.6KB) has no consumers outside the LLM context. `toQualitativeFeedback` produces felt-sense phrases; nothing calls it.
- `templates.ts` (13.7KB) — modality opener/summary/options templates. Used by orchestrator's runModuleAssessment but not by the LLM tool loop.

### 4.3 Profiles (`infra/profiles/ProfileManager.ts`)
- **36 symbols** — list/create/setActive/load/save/appendEncounterLog/loadUnlockedTerms/addUnlockedTerms/agentReadProfileFile/agentWriteProfileFile/buildContextInjection. ✅ multi-user.
- **Profile context injection** — `buildContextInjection` produces a string for the LLM's system prompt with the player's narrative memory, goals, and active focus. ✅ continuity.

**Limitations:**
- `agentWriteProfileFile` allows LLM to write to profile files (narrative-memory.md, goals.yaml). There's no size/format validation — a misbehaving LLM could write 10MB.
- The profile system is invoked in `cli-game.ts` (legacy paths) but not in the orchestrator's `buildContext`. The LLM's profile context comes from `ContextPipeline.buildContinuityContext` which is hardcoded, not from `ProfileManager`.

### 4.4 EventBus (`core/events/`)
- 14 typed events defined. **Zero emitters in core/CLI.** Only consumers: `core/agent/AgentRuntime` (never wired), `lib/server/agentRegistry` (WebUI BFF).
- `TelemetryService` (`:10`) is a separate opt-in channel; not connected to the EventBus.

**Limitations:**
- The CLI's encounter loop, transformation events, macro events, and shadow events all happen silently. No `recordEvent` call in the CLI's main path.
- The WebUI gameEngine emits 11 events (encounter_scheduled, shadow_surfaced, cci_computed, etc.) but the CLI emits 0.
- This means the CLI has NO telemetry by default; the WebUI has full event telemetry via `lib/stores/telemetryStore.ts`.

### 4.5 Background agentic runtime (`core/agent/`)
- 12 files, mostly **dead code** from YAGNI-EFF-3 (Story-Driven mode removed).
- `PersistentAgent.ts` — empty class stub, `new PersistentAgent({...})` no-ops.
- `PersistentAgentBridge.ts` — `runPersistentAgentEncounter` throws.
- `ToolRegistry.ts` — `createMysteriumToolRegistry` throws.
- `DirectorAgent.ts` — 183 lines of real code (subscribe to events, generateNextProbe), never instantiated.
- `AgentRuntime.ts` — EventBus → DirectorAgent bridge, never instantiated.
- `Loom.ts` — rolling 5-event / 3-free-input context, never used.
- `ReflectionAgent.ts` (39 lines), `CalibrationAgent.ts` (150), `RecognitionAgent.ts` (65), `SynthesisAgent.ts` (34) — 4 specialised agents, all unreferenced.
- `FallbackNarratives.ts` (395 bytes) — single function exporting a stub string.

**Why this exists:** the design preserves the architecture for a future rebuild. YAGNI-EFF-3: "Story-Driven mode can be rebuilt on top of DQ's proven architecture when needed."

**Limitations:**
- The bytes and the import sites are still there — `import { ... } from '../core/agent/...'` in cli-game.ts (3 places) — but the imports are dead.
- The agents/Loom are well-designed but the CLI doesn't use them. The context they could provide (rolling event window) is missed.

### 4.6 Presentation (`core/presentation/`)
- `veilDescriptors.ts` (6.7KB) — `describeStage` + `describePersonalResonance`. Used by the CLI's `--dev` mode and the orchestrator's `finalizeEncounter`. ✅ the canonical felt-sense mapper.

**Limitations:**
- `describeStage` returns 8 stage-specific phrases (Infrared → White); the line × stage × quadrant cross-product doesn't have descriptors. `PolarityOntology.ts` (8KB) is unused.
- `describePersonalResonance` is called only in the session-end summary path. Mid-session, the LLM must produce its own felt-sense from scratch.

### 4.7 Usecases (`core/usecases/`)
- `OnboardingCalibrator.ts` (2.3KB) — implements `ONBOARDING-REDESIGN-PLAN.md:2.2` binary search at stage-specific content. **Not called by the CLI's onboarding**. The CLI uses `mysterium calibrate` (the 5 brain-games) as onboarding.
- `StageSynthesizer.ts` (4KB) — referenced in curriculum. Not directly used by the orchestrator.
- `DevelopmentalReport.ts` (2.8KB) — not used.
- `Staircase.ts`, `FastStaircase.ts`, `LineCeilings.ts`, `RandomSource.ts` — helpers, used by the adaptive subsystem.
- `ShadowDetector.ts` (15.7KB, 12 functions) — per-line shadow detection. Not called by the orchestrator; the LLM does the detection via keyword matching in `evaluateFallbackResponse`.

**Limitations:**
- `OnboardingCalibrator` is the canonical per-`ONBOARDING-REDESIGN-PLAN` solution but is bypassed. The "5 brain games as onboarding" never reaches the canonical onboarding shape (line×stage seeded altitudes, taskStaircases seeded with LLM-scored depth).
- `ShadowDetector` is a 15KB library that the LLM does in <100 tokens of keyword matching. A 3-call tool would be more reliable.

### 4.8 Registries (`core/registries/`)
- 5 registries: LineRegistry, StageRegistry, RayRegistry, EncounterRegistry, DriveRegistry.
- `boot.ts:37` registers all 8 lines, 8 stages, 7 rays, 4 drives, 1 encounter (red-encounters.module).
- Total bytes: ~6KB of modules + 5 registry instances.
- **No consumer in the agentic loop** — the orchestrator uses `bootModuleRegistry` (assessments) and `getCurriculumRegistry` (curriculum), but never queries these registries.

**Limitations:**
- The registries are vestigial. The data they hold (line descriptions, stage palettes, drive narratives) is duplicated in:
  - `assessments/cognitive/red.ts` (assessment content)
  - `assessments/types.ts` (data types)
  - `infra/llm/FrequencyConditioner.ts` (voice register)
  - `infra/llm/contracts/LanguageReflective.ts` (modality rubric)
- Each `module.ts` file (210 bytes) is a register call with a static `LineModule`/`StageModule` blob. That's **architectural debt**: the game has two parallel content systems (registries vs assessments).

### 4.9 Telemetry (`infra/telemetry/` + `core/telemetry/`)
- `TelemetryService.recordEvent/flush` (opt-in) + `TelemetryStore` (encrypted-at-rest).
- WebUI parity in `lib/stores/telemetryStore.ts` (5s debounce → POST /api/telemetry).
- `core/telemetry/TelemetryEvent.ts` defines the event types.

**Limitations:**
- `core/telemetry/DevelopmentalReport.ts` and `core/telemetry/TelemetryCollector.ts` — collector/service pattern. Not instantiated in CLI.
- The CLI emits 0 events because `TelemetryService` is never instantiated in `scripts/cli-game.ts:308`. The opt-in flag defaults to `false` (no `~/.mysterium/config.json` opt-in).
- The `Mysterium_DEV=1` env var gates `VeilFilter` warnings (`:39`) but no general-purpose CLI telemetry flag exists.

### 4.10 Fallback layer (`core/fallback/`)
- `FallbackProvider.ts` (81KB, 126 symbols) — per-line per-stage per-modality pre-written mirror content. Used when LLM unavailable.
- `withFallbackVeil.ts` — Veil filter on top.

**Limitations:**
- The 81KB of pre-written content is the safety net. The Veil filter ensures it stays felt-sense. ✅ well-designed.
- But: the fallback is used for *every* `noLlm` encounter, not just when the LLM is down. The CLI's `--headless` mode runs entirely on fallback, which means every headless encounter is template-driven, not LLM-driven.

### 4.11 Other
- `I18n.ts` (2.3KB) — stub. No translations.
- `NativeBridge.ts` (1.5KB) — Capacitor bridge for mobile. Not used in CLI.
- `AccessibilitySettings.ts` (888B) — minimal (just `enabled: boolean`). No settings.

---

## 5. Loose ends inventory (concrete file_path:line_number)

### 5.1 Dead code (preserve-or-delete candidates)

| File | Symbol | Why dead |
|---|---|---|
| `core/agent/PersistentAgent.ts:10` | class PersistentAgent | YAGNI-EFF-3 stub; no-op constructor |
| `core/agent/PersistentAgentBridge.ts:9` | runPersistentAgentEncounter | Throws — never called |
| `core/agent/ToolRegistry.ts:6` | createMysteriumToolRegistry | Throws — never called |
| `core/agent/AgentRuntime.ts:42` | class AgentRuntime | DirectorAgent never instantiated in CLI |
| `core/agent/DirectorAgent.ts:1` | class DirectorAgent | Same — dead |
| `core/agent/Loom.ts:40` | class Loom | Same — dead |
| `core/agent/ReflectionAgent.ts` (39 lines) | class | Unreferenced |
| `core/agent/CalibrationAgent.ts` (150 lines) | class | Unreferenced |
| `core/agent/RecognitionAgent.ts` (65 lines) | class | Unreferenced |
| `core/agent/SynthesisAgent.ts` (34 lines) | class | Unreferenced |
| `core/agent/AgenticProbe.ts` (73 lines) | class | Unreferenced |
| `core/agent/validateAgenticProbe.ts` (140 lines) | class | Unreferenced |
| `core/agent/FallbackNarratives.ts:1` | single 395-byte stub | Unreferenced (FallbackProvider is the real fallback) |
| `core/usecases/OnboardingCalibrator.ts:1` | class | Bypassed by `mysterium calibrate` |
| `core/usecases/StageSynthesizer.ts:1` | class | Only in curriculum deep imports |
| `core/usecases/DevelopmentalReport.ts:1` | class | Unreferenced |
| `core/engines/hooks.ts:15` | maybeFireHook | 17-byte no-op, but called from 9 sites |
| `core/events/EventBus.ts` + `GameEvents.ts` (49 lines) | class | Only WebUI consumes |
| `core/telemetry/DevelopmentalReport.ts` (2.8KB) | class | Unreferenced |
| `core/telemetry/TelemetryCollector.ts` (882B) | class | Unreferenced |
| `core/telemetry/TelemetryEvent.ts` (712B) | types | Unreferenced |
| `core/registries/*` (entire dir, 6KB) | 5 registry instances | Unreferenced from agentic loop |
| `core/data/encounters/red/*.ts` (9 files, 19KB) | per-line encounter specs | Unreferenced — only `red-layer-holons.json` consumed |
| `core/data/concept-drafts.json` (22KB) | legacy concept index | ConceptDraftIndex still queried but for `conceptIndex.modules` only |
| `core/data/calibrationPrompts.ts` (3.4KB) | calibration prompts | Unreferenced |
| `core/data/RedPESTLE.ts` (977B) | Red PESTLE config | Unreferenced (PESTLE initialized to zero in WorldState) |
| `core/agent/Loom.ts:40` | class | Same as DirectorAgent |
| `cli-game.ts:1082` | `applyResponseOnly` is exported but not called from `applyResponseOnly` directly | ⚠ The CLI's main path uses `applyResponseOnly` once; `GameLoop.tickWithStrategy` has the response path inside it (lines 312-332) but `applyResponseOnly` is also exported as a separate API. Confusing. |

### 5.2 Disconnected producers/consumers

| Producer | Consumer | Gap |
|---|---|---|
| `engines/hooks.ts:15` maybeFireHook (no-op) | `GameLoop:124,416,1082`, `ConsequenceEngine:354-357-370-379` | Hooks are placeholder; DirectorAgent that would receive them is also dead |
| `events/EventBus.ts` | Only `lib/server/agentRegistry.ts:27` and `core/agent/AgentRuntime.ts:18` (both unwired in CLI) | CLI emits 0 events |
| `TelemetryService.recordEvent` | Only itself (no CLI consumer) | CLI has no telemetry |
| `core/agent/Loom.render` | Never read | Rolling context window is dead |
| `CurriculumBridge.computeCurriculumReviewSchedule` | `curriculum/index.ts:13` export | No consumer outside the index |
| `CurriculumBridge.computeDepthProgressions` | `curriculum/index.ts:13` export | No consumer outside the index |
| `CurriculumBridge.computeKnowledgeHealth` | `GameLoop:778` `cci.knowledgeHealth` | Only one consumer, in CCI |
| `LearningAnalytics.computeLearningAnalytics` | `curriculum/index.ts:16` export | No consumer outside the index |
| `curriculum/SeedInitialKnowledge.ts` | `cli-game.ts:349` (1 import site) | Not called automatically — player must trigger curriculum mode |
| `probes/ProgressionValidator.auditProgression` | `MetaCognitiveProbe:63` | Only fires at session end via probeCurriculum |
| `RubricCalibrator.calibrateAllRubrics` | `MetaCognitiveProbe:66` | Same — session end only |
| `infra/llm/ConsequenceParser.ts` | `cli-game.ts:321` (legacy DQ path) | Orchestrator doesn't use it |
| `infra/llm/QualitativeFeedback.toQualitativeFeedback` | `QualitativeFeedback.ts:92` | No external consumer |
| `core/usecases/ShadowDetector.ts` (15.7KB) | None | LLM does detection via 14-keyword lists |
| `core/usecases/OnboardingCalibrator.ts` | None | Bypassed by `mysterium calibrate` |
| `core/usecases/StageSynthesizer.ts` | Only via curriculum deep imports | Not used by orchestrator |
| `core/data/PolarityOntology.ts` (8KB) | `data/` index only | Not injected into LLM context |
| `core/data/glossary.ts:102 checkTermUnlocks` | `cli-game.ts:801` | Not called by orchestrator's finalizeEncounter — terms unlock via `addUnlockedTerms` in `cli-game.ts:801` only, not from the LLM tool loop |
| `core/data/calibrationPrompts.ts` | None | Unreferenced |
| `core/registries/boot.ts:37` bootRegistries | `cli-game.ts:286` | Registered but never queried |
| `cli/TrainingRuntime.buildUnifiedProfileServices` | `cli-game.ts:1868` | Wired but `getSignificator` returns null for fresh saves; educational stream is empty until curriculum runs |
| `GameLoop.tickWithStrategy:798-861` curriculum weave | Player only sees if LLM asks | Curriculum is invisible unless the LLM translates it |
| `ContextPipeline.buildContext` | orchestrator (✅) | But doesn't include cognitive profile or knowledge state in system prompt |

### 5.3 Stubs and TODOs

| Location | Status |
|---|---|
| `AgenticOrchestrator.runFallback:1082` "applyResponseOnly is exported but not called from `applyResponseOnly` directly" | Confusing dual path |
| `core/agent/PersistentAgent.ts:1` "USE_PERSISTENT_AGENT is always false" | Documented dead |
| `core/agent/ToolRegistry.ts:1` same | Documented dead |
| `cli-game.ts:1607` `--verbose requires --dev` warning | Documented behaviour |
| `cli-game.ts:471` Dev mode warning | Documented behaviour |
| `cli-game.ts:1660` `renderPrerequisiteGaps` only called in `--curriculum` mode | Limitation: gaps not shown in normal session |
| `core/curriculum/ForgettingCurve.ts` nextDepthLevel | 7-level ladder hardcoded |
| `core/curriculum/CurriculumLinter.ts:21+ checks` | Run only at seed; not on concept update |
| `core/curriculum/ProgressionValidator.ts` "stages NEVER demote" | Enforced; linter doesn't fire at runtime |

### 5.4 Hardcoded values that should be data

| Location | Hardcoded value | Should be |
|---|---|---|
| `AgenticOrchestrator.ts:766` `maxLoops = 5` (runLanguageReflective) | Per-modality loop budget | Config |
| `AgenticOrchestrator.ts:911` `collectStreamWithin(stream, 5000)` | 5s stream timeout | Config |
| `LLMClient.ts:54` `LLM_TIMEOUT_MS = 30_000` | 30s fetch timeout | Config |
| `LLMClient.ts:60` `LLM_RETRY_COUNT = 1` | 1 retry | Config |
| `LLMClient.ts:61` `LLM_RETRY_BACKOFF_MS = 1500` | 1.5s backoff | Config |
| `AdaptiveDifficultyService.ts:79` `strategyForParadigm(p.id)` | per-paradigm strategy hardcoded | Data file |
| `GameLoop.tickWithStrategy:360` `5` (encountersSinceRefresh) | 5 between return encounters | Config |
| `GameLoop.tickWithStrategy:384` `2` and `% 3 === 0` | training beat cadence | Config |
| `GameLoop.tickWithStrategy:486` `interval` from strategy | Per-session | OK |
| `AutoModeStrategy.ts:74-80` DEFAULT_ADJUSTMENT_THRESHOLDS | Hardcoded | Data |
| `CCIEngine.ts:41-48` DEFAULT_CCI_WEIGHTS | Hardcoded | Data |
| `ThetaDecay.ts:12-26` DEFAULT_THETA_PARAMS.lineHalfLives | Hardcoded per-line | Data |
| `transformationDetector.ts:46` SATURATION_THRESHOLD | 0.6 (saturate) | Data |
| `engines/ConsequenceEngine.ts:454-625 updateKnowledgeFromEncounter` (173 lines) | Complex heuristic | Should be data-driven (rubric + probe) |
| `core/fallback/FallbackProvider.ts:81KB` | 126 hardcoded symbols | Should be JSON-loaded |
| `UserMatrixModel.ts:76-96` 4 keyword lists | ~14 keywords total | Should be data file |

### 5.5 Telemetry gaps (CLI vs WebUI)

The WebUI emits 11 events to `telemetryStore` (via `recordEvent` in `lib/engine/gameEngine.ts:186,207,213,219,312,335`) with debounce 5s → POST /api/telemetry.

The CLI emits **0 events** to anywhere. `TelemetryService` is defined but not instantiated; the EventBus is defined but not consumed.

**This is the largest single gap.** The CLI is a black box at runtime; only the save file is observable.

---

## 6. The CLI itself (`scripts/cli-game.ts` — 5036 lines)

The CLI is the single entry point that wires everything:
- 1:1846: top-level orchestration, commander parsing, save loading
- 1:1867-1868: `training: buildTrainingIntegration` and `unifiedProfile: buildUnifiedProfileServices` (both best-effort, both wired in `ae06102`)
- 308: `buildTrainingIntegration` retry path for `tBeat` (used by training beat weaving)
- 1:3204-3382: training-beat secondary path (3 calls)
- 1:1908: `orchestrator.run()` → full encounter flow

**Limitations:**
- The CLI is 5036 lines of a single file — split-worthy (commander setup, encounter flow, session summary, training integration, each in its own module).
- `console.log` for every output, no shared "presenter" abstraction. Hard to test presentation.
- `--headless` mode auto-falls back to FallbackProvider (no LLM). The 81KB of fallback content is the entire headless experience.
- `--dev` mode exposes internal metrics but only in a limited form (G_z/P_z/CCI/rayProfile, not the full CCI dimensions).
- No `mysterium agent` subcommand to run a headless LLM agent loop (the LLM mode requires running the full encounter flow).

---

## 7. Integration gaps — prioritised

### 7.1 Highest value (1-2 day each)

| Gap | Where | Fix |
|---|---|---|
| **CLI emits 0 events; no runtime telemetry** | `scripts/cli-game.ts:1+`, `core/agent/AgentRuntime.ts:42` | Wire `TelemetryService` instantiation in cli-game.ts:308 with opt-in from config. Add `recordEvent` calls in `GameLoop.startSession/tickWithStrategy/endSession/applyResponseOnly`. Add a `mysterium events --tail N` CLI command. |
| **`get_knowledge_snapshot` is empty until the player studies** | `unifiedProfileTools.ts:131` | Call `seedInitialKnowledge` automatically in `GameLoop.startSession` (currently called only in `cli-game.ts:349`). |
| **`recommend_trajectory` returns generic `growth:edge`** | `unifiedProfileTools.ts:169-211` | Wire `bridgeDevelopmentalToCurriculum` into `recommendTrajectory` to use real `KnowledgeState` + `forgettingCurves` for the educational step. |
| **Curriculum encounters aren't experienced as curriculum** | `GameLoop:798-861`, `curriculumCandidateToEncounter:728-765` | Add a `curriculum` modality to the orchestrator's encounter dispatch — `runCurriculumEncounter` that asks the LLM to teach/review the concept using the LLM rubric. |
| **Prerequisite gaps not shown in normal session** | `cli-game.ts:1660` | Call `renderPrerequisiteGaps` on every encounter with a `curriculumConceptId`, not just in `--curriculum` mode. |
| **`recommend_workout` rationale is clinical** | `WorkoutPlanner.ts:58-60` | Map `rationale` through `CognitiveIndex.feltSenseFor` for player-facing string. |
| **`ContextPipeline` doesn't read CognitiveIndex/KnowledgeState** | `infra/llm/ContextPipeline.ts` | Add `buildCognitiveContext` and `buildKnowledgeContext` blocks to the system prompt. |
| **No `mysterium curriculum status` command** | `scripts/cli-game.ts` | Add a `curriculum status [--subject X] [--depth Y]` command using `auditProgression` + `calibrateAllRubrics`. |

### 7.2 Medium value (3-5 days)

| Gap | Where | Fix |
|---|---|---|
| **Shadow detection is keyword-based** | `UserMatrixModel.ts:118`, `core/usecases/ShadowDetector.ts` | Expose `ShadowDetector` as a 3-call tool (`detect_shadow_signals` → return rich object), letting the LLM defer to deterministic detection. |
| **Polarity cross-product is data not consumed** | `core/data/PolarityOntology.ts:8KB` | Inject `PolarityOntology` textures into `ContextPipeline.buildContext` (per-line×stage). |
| **No training plan persistence** | `cli/TrainingRuntime.ts:runTrainCommand` | Persist `{plan, completed}` to KV at start; resume on next `train` call. |
| **`TelemetryCollector` is dead** | `core/telemetry/TelemetryCollector.ts` | Either wire it in `TelemetryService` instantiation or delete. |
| **`OnboardingCalibrator` is bypassed** | `core/usecases/OnboardingCalibrator.ts`, `cli-game.ts` | Build `mysterium setup-onboard` that uses `OnboardingCalibrator` per `ONBOARDING-REDESIGN-PLAN.md:2.2`. |
| **3-5 day only**: per-line transformation | `TransformationDetector.commitTransformation:282` | Track per-line stage (line → stage map) alongside the global `currentStage`. |
| **No "curriculum mode" in the orchestrator** | `AgenticOrchestrator.ts` | Add `runCurriculumEncounter` that uses the LLM rubric + concept depth. |
| **No tool to ask "give me a curriculum encounter on X"** | `unifiedProfileTools.ts` | Add `study_concept(conceptId)` tool that returns a `ScheduledEncounter` for a specific concept. |

### 7.3 Lower priority (1-2 weeks)

| Gap | Where | Fix |
|---|---|---|
| **Dead `core/agent/*` (12 files, ~17KB)** | `core/agent/` | Either wire DirectorAgent + AgentRuntime + Loom into the CLI's event stream (a real win for context-aware encounters), or remove. |
| **Dead `core/registries/*` (~6KB)** | `core/registries/` | Remove; consolidate content into the assessment modules. |
| **Dead `core/agent/Loom.ts`** | `core/agent/Loom.ts` | Same as above. |
| **`ContextPipeline` doesn't expose cognitive/knowledge state** | `infra/llm/ContextPipeline.ts` | Add blocks for both. |
| **`--headless` uses FallbackProvider entirely (no LLM)** | `scripts/cli-game.ts:266-321` | Add `--headless --llm` flag that uses the LLM with `--answer` file input. |
| **No progress visualization CLI command** | `scripts/cli-game.ts` | Add `mysterium insights --trend --days 30 --json` time series. |
| **No cross-paradigm correlation analysis** | `CognitiveIndex.recordGame:75` | Add `CognitiveIndex.correlate(paradigmA, paradigmB)` → return trend correlation. |
| **No re-calibration trigger** | `CalibrationStore`, `GameLoop.startSession` | Add a session-start check: if `lastPlayedAt` > 30 days, lower starting level by 0.1. |
| **`set_difficulty_override` never expires** | `trainingTools.ts:332-360` | Add `override.expiresAt` and decay it after N days. |
| **No `cli-game.ts` modular split** | `scripts/cli-game.ts:5036 lines` | Split: `commander-setup.ts`, `encounter-flow.ts`, `post-session-summary.ts`, `training-integration.ts`. |
| **`ConsequenceParser.ts` only used by legacy DQ path** | `infra/llm/ConsequenceParser.ts` | Use it from `AgenticOrchestrator` for parsing `complete_encounter` arguments (currently direct JSON.parse). |
| **`QualitativeFeedback.toQualitativeFeedback` unused** | `infra/llm/QualitativeFeedback.ts` | Use it as the canonical Veil mapper for `complete_encounter.feedback` and CCI feltSense. |
| **`PolarityOntology` not in LLM context** | `core/data/PolarityOntology.ts` | Inject per-line×stage textures. |
| **No `mysterium export --analytics` (analytics on the export)** | `cli/ExportRuntime.ts` | Add `computeLearningAnalytics` to the export pipeline. |

---

## 8. Quick wins (top 3 — 1 day total)

1. **Add `mysterium curriculum status` command** (4-6 hours) — calls `auditProgression` + `calibrateAllRubrics`, prints felt-sense. Surfaces the 80 lint warnings the player currently can't see.
2. **Auto-seed `KnowledgeState` at session start** (2-3 hours) — call `seedInitialKnowledge` in `GameLoop.startSession` so `get_knowledge_snapshot` returns the 5 subjects' concepts immediately.
3. **Wire `TelemetryService` in CLI** (3-4 hours) — instantiate in `cli-game.ts:308`, opt-in via `~/.mysterium/config.json.telemetry=true`, add `recordEvent` calls in `GameLoop.startSession`/`tickWithStrategy`/`endSession`. Add `mysterium events --tail N` command.

---

## 9. Architectural-level recommendations

1. **Consolidate the two parallel content systems** — the 5 registries (`core/registries/`) duplicate content already in `assessments/cognitive/red.ts` etc. Pick one. The assessment modules are the canonical source.
2. **Wire the EventBus in the CLI** — even without DirectorAgent, the 14 typed events are the right telemetry channel. Wire `EventBus.emit` calls in `GameLoop` and let `TelemetryService` subscribe.
3. **Replace keyword-based shadow detection with a tool** — `core/usecases/ShadowDetector.ts` is 15KB of well-designed logic. Expose `detect_shadow_signals` as a tool; the LLM can call it instead of guessing from 14 keywords.
4. **Make the educational stream visible** — add a `curriculum` modality to the orchestrator + a `study_concept` tool. The 48 holons are seeded; the only missing piece is a tool that asks "schedule a study encounter on this concept".
5. **Move the onboarding from "5 brain games" to `OnboardingCalibrator`** — implement `mysterium setup-onboard` per the existing `ONBOARDING-REDESIGN-PLAN.md`.
6. **Replace `cli-game.ts` 5036-line monolith with a 5-file module split** — `commander-setup`, `encounter-flow`, `post-session`, `training-integration`, `llm-bootstrap`.
7. **Make `ConsequenceParser` and `QualitativeFeedback` first-class in the orchestrator** — both are designed for the agentic flow but currently bypassed.

---

## 10. Verification commands (all green on `3f80ec1`)

```bash
python3 skills/workspace-lint/scripts/workspace_lint.py --root .   # 0/0/0
npx tsc --noEmit                                                    # 0 errors
npm run build                                                       # 33 invariants + svelte + vite + cloudflare
npx vitest run tests/core tests/braingame tests/training tests/engines tests/stores tests/infra tests/adaptive  # 65 files 722 tests
HOME=$(mktemp -d) npx tsx scripts/cli-game.ts --headless --encounters 3 --answer A --answer B --answer C
HOME=$(mktemp -d) npx tsx scripts/cli-game.ts curriculum lint  # 48 holons, 0 errors, 80 warnings
```

The agentic loop is **operationally complete** for the 11 tools and the 5 paradigms. The biggest single gap is the **invisible educational stream** (48 holons seeded but no tool asks the LLM to teach/review them, and no CLI command shows the player's progress). After that, the **CLI's missing telemetry** is the largest blind spot.

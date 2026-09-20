# 00 — Current-State Audit (Grounded)

> What Mysterium actually implements today. Every claim is anchored to a file in this repository. This is the baseline the upgrade plan builds on — nothing here is aspirational.

**Audited:** 2026-08-26 · branch `main` · tests 793/793 passing (`docs/PROGRESS.md`)

---

## 1. Layer map

```
scripts/cli-game.ts          ← CLI entry (~4,900 lines, commander subcommands)
src/
├── core/                    ← pure domain (no framework deps)
│   ├── GameLoop.ts          ← session-level loop: startSession → tickWithStrategy → endSession
│   ├── agent/               ← DirectorAgent + sub-agents (partially wired)
│   ├── assessments/         ← 64-cell module system + AgenticOrchestrator + TaskRenderers
│   ├── curriculum/          ← SRS, knowledge graph, learning analytics (curriculum-scoped)
│   ├── engines/             ← AutoModeStrategy, EncounterScheduler, CCIEngine, PolarityEngine…
│   ├── domain/              ← Significator, Line, Stage, Drive types
│   └── events/              ← EventBus + typed GameEventMap
├── infra/                   ← adapters
│   ├── persistence/         ← KeyValueStore abstraction, SaveRepository (CLI JSON / localStorage / Capacitor)
│   ├── telemetry/           ← encrypted TelemetryStore
│   ├── llm/                 ← LLMClient, ProviderRegistry, VeilFilter, per-modality contracts
│   └── crypto/ profiles/ i18n/ native/
└── routes/                  ← SvelteKit WebUI (play/onboarding/journal/codex/telemetry) + BFF API routes
```

The hexagonal boundary the reference documents demand ("pure domain core, CLI as adapter") **already exists**. Any upgrade must respect it: game logic goes in `core/`, terminal concerns stay in renderers/scripts.

## 2. The agentic loop today

**Location:** `src/core/assessments/AgenticOrchestrator.ts` (~2,280 lines), class `AgenticOrchestrator`.

### 2.1 Tool surface — exactly two tools

Defined at `AgenticOrchestrator.ts:57–160`, registered in `TOOLS` at line 160:

| Tool | Purpose |
|---|---|
| `ask_user_question` | LLM presents narrative + 3–4 MCQ options (+ optional write-in). Rendered by the UI handler (CLI or WebUI). |
| `complete_encounter` | LLM concludes: pass/fail, scores, drive scores/signals, polarity direction, shadow signal, narrative summary. |

There are **no tools to execute a game, read performance data, adjust difficulty, plan a session, or query history**. This is the central gap this upgrade closes.

### 2.2 The run loop (`run()`, lines 346–528)

1. Dispatch: `noLlm` → `runFallback()`; modality `LanguageReflective` → dedicated dialogue path; module present → `runModuleAssessment()`; else narrative MCQ loop.
2. Builds a system prompt from continuity context + assessment context + shadow context; hard `[AGENT RULES]` enforce a **budget of 4 exchanges** and force `complete_encounter` afterward.
3. Loop (max 10 iterations): `queryLLMWithTools(systemPrompt, messages, TOOLS)` → execute tool calls → append tool result messages → repeat.
4. On `complete_encounter`: **rubric-based scoring overrides the LLM's own scores** (GAP-3 anti-circularity fix, lines 474–501) — the LLM narrates; deterministic evaluators score.

### 2.3 DirectorAgent & sub-agents (`src/core/agent/`)

- `DirectorAgent.ts`: observes engine events via `AgentRuntime` (17 typed events), owns the `Loom` (event/input memory). Calibration path works (`CalibrationAgent`, confidence threshold 0.8). `computeModuleTransition()` **throws NotYetWired** (line 176).
- `ReflectionAgent`, `RecognitionAgent`, `SynthesisAgent`: scaffolded, not wired into dispatch.
- `ToolRegistry.ts`: a removed-feature stub — "ToolRegistry removed with PersistentAgent… USE_PERSISTENT_AGENT is always false" (whole file). A tool registry existed once and was excised; this plan reintroduces the concept deliberately and minimally.

## 3. Brain-game content that already exists

### 3.1 Fifteen deterministic paradigms

`src/core/assessments/cli/TaskRenderers.ts` (~2,380 lines) renders these task types (`TaskType` union, `core/assessments/types.ts:11–26`):

`n_back`, `stroop`, `go_no_go`, `reaction_time`, `rhythm`, `hold`, `pattern_prediction`, `emotion_identification`, `dilemma`, `scenario`, `value_ranking`, `self_report`, `llm_dialogue`, `imitation`, `cooperation`

These map almost one-to-one onto the cognitive domains in `docs/references/` (memory→n_back, attention→stroop/go_no_go, speed→reaction_time, reasoning→pattern_prediction, plus emotional/moral/somatic paradigms the references lack entirely).

### 3.2 How they execute today — the single-shot MCQ squeeze

`AgenticOrchestrator.presentModuleTask()` (lines 1462–1490):

1. Takes an `AssessmentTask`, injects stage/line params, calls `getRenderer(task)`.
2. Renderer returns `{ prompt: AskUserQuestionParams, evaluate(answer, startTimeMs, endTimeMs): TrialResult }`.
3. The prompt is **flattened into one MCQ question** presented through `uiHandler.askUser`.
4. After the answer, `evaluate()` runs exactly once with `Date.now()` bookends (line 1055/1067).

Consequences:

- Multi-phase games (N-back streams, delayed grid recall, RSVP sequences) cannot exist — every paradigm collapses to a single choice among 4 shuffled options.
- Reaction-time scoring uses coarse wall-clock buckets (`renderReactionTime`, lines 1270–1274: `<3000ms → 0.95` etc.) polluted by LLM-free but terminal-latency noise, with no hrtime precision and no calibration offset.
- Difficulty is **static**: `STAGE_DIFFICULTY` record keyed by stage name (lines 70–85). No adaptation to the individual player within or across sessions.

### 3.3 Item selection

`core/assessments/itemSelection.ts`: picks pool items nearest a target difficulty and ramps difficulty +0.05 per item (`selectSessionItems`). A heuristic, not a psychometric algorithm. No persistence of selection state across sessions.

### 3.4 Scoring pipeline

`core/assessments/engine.ts` (pure functions): `scoreTrials` → rubric-weighted dimensions → `runAssessment` (pass/fail + confidence) → mode-aware variants (`shadow` computes drive-health per dark/golden domain; `calibration` penalizes low trial counts). Ten `MeasureDimension`s (accuracy, response_time, consistency, depth, self_correction, complexity_handled, transfer, metacognition, coherence, integration).

`TrialResult` objects are computed **in memory and discarded** — nothing persists raw trials beyond the session object graph.

## 4. Orchestration systems that already exist

### 4.1 Session level — `GameLoop.ts` + `AutoModeStrategy.ts`

- `startSession` → `tickWithStrategy` (per-encounter scheduling) → `endSession`/`endSessionAsync`.
- `AutoModeStrategy.generateSessionStrategy()` produces a full `SessionStrategy`: warmup focus, parameterized session arc, encounter budget, weight bias across lines/stages/modalities.
- `evaluateMidSessionAdjustment()` adapts mid-session from recent encounter outcomes; `checkSafetyOverride()` halts on consecutive shadow failures.
- `EncounterScheduler.scheduleNext()` selects the next encounter; `scheduleThresholdMode` handles shadow-work thresholds; holonic-return scheduling keeps lower stages alive.

This is a **more sophisticated session planner than anything the references propose** — but it schedules *narrative encounters*, not brain-game workouts, and knows nothing about per-paradigm difficulty calibration.

### 4.2 Curriculum subsystem — SRS + analytics already built

`src/core/curriculum/`:

- `ForgettingCurve.ts`: SM-2-style retention model — `computeRetention`, `updateAfterSuccess/Failure`, `computeReviewCandidates`, personalized curves.
- `LearningAnalytics.ts`: study efficiency, learning velocity, **modality effectiveness**, optimal review intervals.
- Plus `KnowledgeGraph`, `DepthAssessment`, `ProgressionValidator`, `RubricCalibrator`, `MetaCognitiveProbe`.

All of it is scoped to **curriculum knowledge concepts**, not cognitive-game skill domains. The machinery is reusable; the data feeding it is wrong for brain training.

### 4.3 Composite index

`CCIEngine.ts` (36 symbols) computes the Cumulative Consciousness Index across all lines/stages — Mysterium's answer to Lumosity's LPI, already canon. The CLI renders it through felt-sense language (`cciToFeltSense`, cli-game.ts:618–646) rather than numbers — the Veil made concrete.

## 5. Persistence & telemetry infrastructure

- `infra/persistence/KeyValueStore.ts`: port interface. Adapters: `LocalStorageStore` (web), `CapacitorPreferencesStore` (native), CLI file-based JSON (`SaveRepository.ts` file functions).
- `SaveRepository`: versioned save/profile/world-state documents with schema validation (`validateSignificator.ts`) and corruption recovery.
- `infra/telemetry/TelemetryStore.ts`: encrypted event-list store over KeyValueStore — exists, generic, **not wired to trial data**.
- Cloud save: `/api/save` stores client-side-encrypted blobs (Cloudflare KV); server never sees plaintext.

Conclusion: the references' insistence on SQLite is a **non sequitur here** — the KV abstraction + encrypted blobs pattern is established, canon-compliant (privacy posture), and sufficient for trial records if we add a bounded ring-buffer/index design. Re-evaluate only if query volume demands it.

## 6. CLI command surface

`scripts/cli-game.ts` commander program (lines 100–137):

`setup`, `status`, `new-game`, `diagnostic`, `curriculum [action]`, `session`, `glossary`, `profile [action] [name]`, `setup-profile`

Plus rich internal flows: `runQuickCalibration` (binary-search altitude inference), `runFullSession`, `runDirectQuestioningSession`, `runIntegrationRitual`, `synthesizeSessionInsights`, headless/JSON modes (`--answer` injection, `emitEvent` JSON events) used by tests and automation.

There is **no** `train`, `insights`, or `calibrate <game>` command — no way to play brain games standalone today.

## 7. Summary: strengths to preserve, gaps to close

**Preserve (these beat the references' proposals):**
- Hexagonal layering; pure-core scoring engine; anti-circular rubric scoring
- Session strategy engine (arcs, budgets, mid-session adjustment, safety overrides)
- Veil-compliant felt-sense rendering of metrics
- Encrypted local-first persistence with schema validation
- Headless/JSON test seams

**Close (detailed in 02-gap-analysis.md):**
1. Agent can't run games (2-tool surface)
2. Single-shot MCQ squeeze kills multi-trial game design
3. Static difficulty; no adaptive engine
4. Trials discarded; no longitudinal store
5. No normalized cross-game index with decay (for skills — CCI covers development)
6. Wall-clock timing; no high-resolution measurement or latency compensation
7. SRS/analytics not pointed at cognitive skills


---

## Addendum — implementation pass corrections

Ground-truth corrections discovered while implementing Phases A–D. Where this document and the code disagree, the code wins.

| Claim in audit | Ground truth |
|---|---|
| AgenticOrchestrator location unspecified | `src/core/assessments/AgenticOrchestrator.ts` (2282 lines); `TOOLS` array confirmed near line 160 as claimed |
| "No staircase exists" | A 1-up/2-down transformed staircase EXISTS (`src/core/usecases/Staircase.ts`) but operates on abstract levels 1–10, not paradigm parameter spaces — the real gap was narrower |
| "No KV abstraction for CLI" | The `KeyValueStore` port + InMemory/Capacitor/LocalStorage impls existed; only a Node file-backed adapter was missing (added: `src/infra/persistence/FileKeyValueStore.ts`) |
| Tool surface | `src/core/agent/ToolRegistry.ts` is a removed stub (USE_PERSISTENT_AGENT=false); the live loop is AgenticOrchestrator exclusively |
| Renderer coverage | TaskRenderers also ships 8 per-LINE probe renderers dispatched before the task-type switch |
| CLI shape | `scripts/cli-game.ts` (~5000 lines): commander declarations + manual dispatch in main(); flags are global options or early-parsed via a separate Command instance |
| 793 passing tests | Suite had grown; after this upgrade: **866 tests green across ~80 files** |

Phase status after implementation: **A, B, C core, D complete** (E1 insights shipped; E2 accessibility alternates partially via Stroop letter keys; E4 export deferred). Actual module paths:

```
src/core/braingame/{types,TrialClock,BrainGameEngine,TrialRecordStore,registry}.ts
src/core/braingame/paradigms/{nback,reactionTime,patternPrediction,goNoGo,stroop}.ts
src/core/adaptive/{AdaptiveDifficultyService,CalibrationStore}.ts
src/core/training/{CognitiveIndex,WorkoutPlanner}.ts
src/cli/{BrainGameCli,TrainingRuntime}.ts
src/core/assessments/trainingTools.ts   ← five agent tools + handlers
tests/braingame/*.test.ts, tests/training/*.test.ts
```

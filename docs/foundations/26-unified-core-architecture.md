# 26 -- Unified Core Architecture

> **Cross-references:** [[AGENTS.md|AGENTS.md (process protocol)]] · [[docs/system/sub-systems/kernel/stage-assessment-architecture|Stage Assessment Architecture]] · [[docs/foundations/21-incarnation-architecture|21 — Incarnation Architecture]] · [[docs/foundations/24-encounter-scheduler|24 — Encounter Scheduler]]
> **Lateral:** The modular architecture overview -- how the 64-cell assessment module system is the SINGLE building block serving all gameplay purposes (onboarding, encounters, practice, shadow work), the module lifecycle from creation to re-scheduling, the renderer abstraction, and the relationship between the module contract, the encounter scheduler, and the CCI. This is the architectural thesis that unifies docs/system/sub-systems/kernel/stage-assessment-architecture's technical spec with the greater-cycle engines.
>
> **Depends on:** 11, 12, 16, 24, 25
> **Referenced by:** 27 (auto-mode strategy engine)

> **Heading-contract map (2026-09-16):** Purpose → §1; Scientific basis → §2 (the one-module-type thesis and its theoretical warrant); Game-design mapping → §2 (four purposes = the game-design mapping); Architectural contract → §4–§7 + §10 (state vessel, renderer, composition, module contract, invariants); Open questions → deferred to the subsystem docs (43 §7 for orchestration, 27 §7 for session edge cases); Principles served → §10 invariants.

---

## 1. Purpose and unique lateral

This document answers: **How does the entire system compose at the architectural level?**

No existing document covers this:

- `docs/system/sub-systems/kernel/stage-assessment-architecture` defines the module contract, per-line stage definitions, scoring rubrics, and file structure -- but presents them as a standalone assessment system without connecting to the greater-cycle engines.
- Foundations/24 defines the encounter scheduler -- but treats modules as opaque items in a pool.
- Foundations/16 defines the Significator -- but does not specify how modules mutate it.
- Foundations/21 defines the incarnation architecture synthesis -- but at the conceptual/narrative level, not the code architecture level.

This document bridges all of the above: it specifies how ONE module type simultaneously serves ALL game purposes, how the module lifecycle threads through the scheduler/CCI/Significator pipeline, and how the rendering layer consumes modules without coupling to their internals.

**The central thesis:** There is ONE architectural unit in Mysterium -- the assessment module. Every gameplay moment is an assessment module executing in one of four modes. There is no legacy combat. There are no separate "game types." Assessment modules ARE the game.

---

## 2. The architectural principle: one module type, four purposes

### 2.1 The four modes of module execution

Every module in the 64-cell pool (8 lines x 8 stages; see docs/system/sub-systems/kernel/stage-assessment-architecture Part II for the cell structure) can execute in four modes:

| Mode | Trigger | Scoring focus | Session context |
|---|---|---|---|
| **Calibration** | Onboarding binary search | Pass/fail at this stage + confidence | Initial 2-3 sessions |
| **Encounter** | Scheduler selection (foundations/24) | Full multi-parameter scoring + polarity trace + shadow detection | Regular gameplay |
| **Practice** | Player-initiated (voluntary) | Capacity development only; no shadow scoring; theta-decay arrest | Player choice |
| **Shadow work** | Holonic return trigger (docs/system/sub-systems/kernel/stage-assessment-architecture Part XII) | Drive-health scoring; shadow mode rubric | Scheduler or auto-mode initiated |

```ts
type ModuleExecutionMode = 'calibration' | 'encounter' | 'practice' | 'shadow_work';

interface ModuleExecution {
  module: StageAssessment;                  // the 64-cell module (docs/system/sub-systems/kernel/stage-assessment-architecture Part II)
  mode: ModuleExecutionMode;
  encounterSpec: EncounterSpec | null;      // null in practice mode; from scheduler otherwise
  scoringOverride: ScoringMode;            // determines which rubric applies
}

type ScoringMode = 'capacity' | 'shadow' | 'calibration' | 'practice';
```

### 2.2 Why one module serves all four

The same cognitive/emotional/moral tasks reveal different information depending on what you measure:

- **Capacity scoring** (calibration + encounter): Can the player perform at this stage? Measures accuracy, speed, depth, transfer.
- **Shadow scoring** (shadow work): Does the player have a healthy relationship to this capacity? Measures drive-health probes (per foundations/12 and docs/system/sub-systems/kernel/stage-assessment-architecture Part XI section 11.2).
- **Practice scoring** (practice): Is the player improving? Measures delta from previous performance. No shadow or polarity recording.

The MODULE does not know which mode it is in. The ENGINE wraps it with the appropriate scoring rubric and consequence processing. This separation is the key to architectural simplicity.

### 2.3 Legacy removal mandate

The following are completely removed from the architecture:

| Removed concept | Replacement |
|---|---|
| ATB combat system | Assessment modules in encounter mode with intensity-appropriate pacing |
| BattleScene | AssessmentScene with modality-specific renderers |
| Spells / abilities | Tasks within assessment modules (the "moves" ARE the assessment tasks) |
| HP / Mana / Damage | Multi-parameter scoring dimensions (accuracy, depth, coherence, etc.) |
| PlayerProfile (legacy) | Significator (foundations/16) -- sole state vessel |
| Random encounters | Scheduler-driven selection (foundations/24) with CCI-shaped session strategy (foundations/25, 27) |

The `Battler.ts`, `Spell.ts`, `ATBEngine.ts`, `DamageCalculator.ts`, and `BattleScene.ts` files are legacy artifacts that do not belong in the unified architecture. Every "combat encounter" in the game is an assessment module running in encounter mode -- the player is solving tasks, making choices, and demonstrating capacities, not calculating damage.

---

## 3. The module lifecycle

A module traverses seven stages from dormant pool item to completed encounter with state mutation:

```
┌──────────┐     ┌──────────────┐     ┌────────────┐     ┌───────────┐
│ 1. POOL  │ --> │ 2. CANDIDATE │ --> │ 3. SELECTED│ --> │ 4. ACTIVE │
│ (dormant)│     │ (filtered)   │     │ (scheduled)│     │ (running) │
└──────────┘     └──────────────┘     └────────────┘     └───────────┘
                                                               │
                                                               v
┌──────────────┐     ┌──────────────┐     ┌───────────────────────────┐
│ 7. RE-POOL   │ <-- │ 6. MUTATE    │ <-- │ 5. SCORED                 │
│ (cooldown)   │     │ (state write)│     │ (rubric applied)          │
└──────────────┘     └──────────────┘     └───────────────────────────┘
```

### 3.1 Stage 1: Pool (dormant)

All 64 modules exist in the pool. Each is registered with its metadata:

```ts
interface RegisteredModule {
  assessment: StageAssessment;            // from docs/system/sub-systems/kernel/stage-assessment-architecture Part II
  line: Line;
  stage: Stage;
  modalities: GameModality[];             // which modalities can render this module
  driveProbes: DriveProbeSet;             // from docs/system/sub-systems/kernel/stage-assessment-architecture Part XI
  cooldownUntil: number | null;           // timestamp when re-eligible (null = always eligible)
  lastExecutedAt: number | null;
  executionCount: number;
}
```

### 3.2 Stage 2: Candidate generation

The encounter scheduler filters the pool to eligible candidates (foundations/24 section 3.1). Filters applied:
- Layer-perception filter (is this stage visible to the player?)
- Cooldown filter (has this module been used too recently?)
- Altitude filter (is the player within reach of this stage?)
- Modality availability filter (does the session context support the required modality?)
- Narrative gate filter (are prerequisite story beats completed?)

Reference: foundations/24 section 3.1 for full filter logic and `generateCandidates()` function.

### 3.3 Stage 3: Selection (scheduled)

The scheduler's priority formula (foundations/24 section 3.2) scores all candidates and produces a ranked list of 3-5 options. Auto-mode (foundations/27) may bias the weights before this computation based on the CCI session strategy.

The top candidates are presented to the player as encounter offers per the non-coercion principle (foundations/24 section 3.4).

### 3.4 Stage 4: Active (running)

The player selects an encounter. The module enters active execution:

```ts
interface ActiveModuleState {
  module: RegisteredModule;
  mode: ModuleExecutionMode;
  encounterSpec: EncounterSpec;           // from scheduler (foundations/24 section 9.1)
  startedAt: number;
  trialsCompleted: TrialResult[];
  currentTask: AssessmentTask | null;
  playerResponses: PlayerResponse[];
  checkpointState: CheckpointData;        // for infinite-checkpoint save
}
```

The module runs its tasks sequentially. Each task is rendered by the appropriate renderer (see section 5). Player responses are collected but NOT scored until completion.

### 3.5 Stage 5: Scored

On module completion (all tasks finished or player exits at a checkpoint), the scoring engine applies the appropriate rubric:

```ts
interface ModuleScoring {
  // Capacity scoring (from docs/system/sub-systems/kernel/stage-assessment-architecture Part IV rubrics)
  capacityResult: AssessmentResult;

  // Shadow scoring (from docs/system/sub-systems/kernel/stage-assessment-architecture Part XI)
  shadowResult: ShadowAssessmentResult | null;  // null if mode !== 'shadow_work'

  // Polarity trace (from foundations/19 section 4.1)
  polarityTrace: PolarityTrace | null;          // null if mode === 'practice'

  // Drive signal (from foundations/12)
  driveSignals: DriveSignalSet;
}

function scoreModule(active: ActiveModuleState): ModuleScoring {
  const capacityResult = applyScoringRubric(
    active.module.assessment.scoringRubric,
    active.trialsCompleted
  );

  const shadowResult = active.mode === 'shadow_work'
    ? applyShadowRubric(active.module.driveProbes, active.playerResponses)
    : null;

  const polarityTrace = active.mode !== 'practice'
    ? extractPolarityTrace(active.encounterSpec, active.playerResponses)
    : null;

  const driveSignals = extractDriveSignals(
    active.module.driveProbes,
    active.playerResponses
  );

  return { capacityResult, shadowResult, polarityTrace, driveSignals };
}
```

### 3.6 Stage 6: State mutation

The scoring output is processed by the Consequence Engine (foundations/24 section 9, IMPLEMENTATION-PLAN Phase A.5) to mutate the Significator:

```ts
function applyModuleConsequences(
  sig: Significator,
  scoring: ModuleScoring,
  spec: EncounterSpec
): Significator {
  let updated = sig;

  // Update altitude (if capacity scoring indicates advancement or regression)
  updated = updateAltitude(updated, scoring.capacityResult);

  // Record polarity trace (foundations/19 section 4.1-4.2)
  if (scoring.polarityTrace) {
    updated = recordPolarityTrace(updated, scoring.polarityTrace);
  }

  // Update shadow ledger (foundations/16 section 3)
  if (scoring.shadowResult) {
    updated = updateShadowLedger(updated, scoring.shadowResult);
  }

  // Update drive state (foundations/12)
  updated = updateDriveState(updated, scoring.driveSignals);

  // Update theta-decay timestamps (arrest decay on this line/stage)
  updated = refreshThetaTimestamp(updated, spec.module.line, spec.module.stage);

  // Check transformation threshold (foundations/17)
  updated = checkTransformationThreshold(updated);

  return updated;
}
```

### 3.7 Stage 7: Re-pool

After state mutation, the module returns to the pool with updated metadata:

```ts
function repoolModule(
  module: RegisteredModule,
  completedAt: number
): RegisteredModule {
  return {
    ...module,
    cooldownUntil: completedAt + COOLDOWN_DURATION_MS,  // minimum gap before re-eligibility
    lastExecutedAt: completedAt,
    executionCount: module.executionCount + 1,
  };
}
```

The scheduler will not select this module again until its cooldown expires (foundations/24 section 3.1, cooldown filter).

---

## 4. The Significator as sole state vessel

### 4.1 No PlayerProfile legacy

The Significator (foundations/16) is the ONLY persistent player state. There is no separate "PlayerProfile" containing HP, mana, equipment, or combat stats. The Significator holds:

- Per-line altitudes (developmental stage per line)
- Drive state (balance and fixation risk)
- Shadow ledger (unresolved material)
- Polarity state (4-level aggregation per foundations/19)
- Theta-decay timestamps (staleness per line/stage)
- Transformation history
- Vow system (self-authored commitments)

Reference: foundations/16 section 2.1 for the complete vessel specification.

### 4.2 All modules read from and write to the Significator

```
                    ┌─────────────────┐
                    │  Significator   │
                    │  (sole vessel)  │
                    └────────┬────────┘
                             │ read (snapshot at session start)
                             v
                    ┌─────────────────┐
                    │   CCI Engine    │
                    │  (foundations/25)│
                    └────────┬────────┘
                             │ session signals
                             v
                    ┌─────────────────┐
                    │  Auto-Mode      │
                    │ (foundations/27) │
                    └────────┬────────┘
                             │ biased weights + session plan
                             v
                    ┌─────────────────┐
                    │   Scheduler     │
                    │ (foundations/24) │
                    └────────┬────────┘
                             │ EncounterSpec
                             v
                    ┌─────────────────┐
                    │  Module Pool    │
                    │  (64 modules)   │
                    └────────┬────────┘
                             │ execution + scoring
                             v
                    ┌─────────────────┐
                    │  State Mutation  │
                    │  → Significator │
                    └─────────────────┘
```

Every component in the pipeline either reads the Significator (as immutable snapshot) or produces mutations that are applied to it. There is no other player state.

---

## 5. The renderer abstraction

### 5.1 The rendering layer contract

The game/ layer never knows WHAT developmental assessment is running. It only knows HOW to render specific task types. This separation is specified in docs/system/sub-systems/kernel/stage-assessment-architecture Part IX.

```ts
// The renderer abstraction (game layer)
interface TaskRenderer {
  readonly supportedTaskTypes: TaskType[];
  setup(task: AssessmentTask, config: RenderConfig): void;
  run(): Promise<PlayerResponse>;
  cleanup(): void;
}

// The orchestrating scene
interface AssessmentSceneContract {
  loadModule(execution: ModuleExecution): void;
  runNextTask(): Promise<TrialResult>;
  completeModule(): ModuleScoring;
  handleCheckpoint(): void;
}
```

### 5.2 Renderer catalogue

Per docs/system/sub-systems/kernel/stage-assessment-architecture Part IX, the renderer set:

| Renderer | Task types handled | Lines primarily served |
|---|---|---|
| `NBackRenderer` | n-back, working memory, sequence tracking | Cognitive |
| `DilemmaRenderer` | moral dilemmas, choice scenarios, value ranking | Moral, Spiritual |
| `ScenarioRenderer` | intrapersonal reflection, self-concept tasks | Intrapersonal |
| `ReactionTimeRenderer` | RT, rhythm, anticipation, sustained hold | Somatic |
| `HoldRenderer` | willpower holds, delay of gratification | Willpower |
| `PatternRenderer` | pattern recognition, social prediction | Interpersonal |
| `EmotionRenderer` | emotion identification, empathy tasks | Emotional |
| `LLMDialogueRenderer` | open-ended language tasks requiring LLM scoring | All (depth tasks) |

### 5.3 The AssessmentScene as generic container

The `AssessmentScene.ts` is the ONLY Phaser scene needed for all assessment encounters. It:

1. Receives a `ModuleExecution` from the game loop
2. Selects the appropriate `TaskRenderer` for each task in the module
3. Sequences tasks with appropriate transitions
4. Collects `PlayerResponse` for each task
5. Handles checkpoints (infinite checkpoint model per AGENTS.md section 5.7)
6. Returns the completed `TrialResult[]` to the scoring engine

There is NO `BattleScene`. The "combat" encounter IS an AssessmentScene running a module in encounter mode with higher intensity settings and narrative framing provided by the LLM layer (foundations/22).

---

## 6. Composition with the encounter scheduler

### 6.1 How modules become encounters

The encounter scheduler (foundations/24) operates on the module pool. Its relationship:

| Scheduler responsibility | Module provides |
|---|---|
| Selects which (line, stage) to present | Pool of 64 registered modules |
| Assigns modality for delivery | Module declares supported modalities |
| Sets difficulty parameters | Module contains adaptive staircase bounds |
| Conditions with shadow target | Module contains shadow mode rubric |
| Sets polarity mode | Module contains tasks with polarity choice-points |
| Positions in session arc | Module declares estimated duration |

The scheduler's `EncounterSpec` output (foundations/24 section 9.1) maps directly to a `ModuleExecution`:

```ts
function encounterSpecToExecution(spec: EncounterSpec): ModuleExecution {
  const module = moduleRegistry.get(spec.module.line, spec.module.stage);
  const mode: ModuleExecutionMode = spec.catalyticPurpose === 'shadow-surfacing'
    || spec.catalyticPurpose === 'shadow-integration'
    ? 'shadow_work'
    : 'encounter';

  return {
    module: module.assessment,
    mode,
    encounterSpec: spec,
    scoringOverride: mode === 'shadow_work' ? 'shadow' : 'capacity',
  };
}
```

### 6.2 How CCI shapes module selection

The CCI (foundations/25) does not select modules directly. It produces session signals that auto-mode (foundations/27) translates into scheduler weight biases:

1. CCI computes `CCISessionSignals.recommendedTheme`
2. Auto-mode translates theme into weight adjustments for the scheduler's 7-criterion priority formula
3. The scheduler runs its normal algorithm with adjusted weights
4. Modules are selected per the biased priority

This preserves the scheduler's autonomy (it still decides per-encounter) while allowing session-level strategy to shape the encounter sequence.

---

## 7. The module contract

The complete module contract is specified across multiple documents. This section maps the contract to its sources:

| Contract element | Source document | Section |
|---|---|---|
| `StageAssessment` interface | docs/system/sub-systems/kernel/stage-assessment-architecture | Part II section 2.2 |
| Per-line stage definitions | docs/system/sub-systems/kernel/stage-assessment-architecture | Part III |
| Multi-parameter scoring rubrics | docs/system/sub-systems/kernel/stage-assessment-architecture | Part IV (implied by rubric fields) |
| Drive-health probes | docs/system/sub-systems/kernel/stage-assessment-architecture | Part XI section 11.2 |
| Shadow scoring output | docs/system/sub-systems/kernel/stage-assessment-architecture | Part XI section 11.4 |
| Dual-mode operation | docs/system/sub-systems/kernel/stage-assessment-architecture | Part XI section 11.1 |
| Holonic return schedule | docs/system/sub-systems/kernel/stage-assessment-architecture | Part XII |
| Supported modalities per module | Foundations/11 | Modality x line affinity matrix |
| Drive probe specifications | Foundations/12 | Per-module drive probes |
| Polarity trace extraction | Foundations/19 | Section 4.1 |
| Encounter conditioning | Foundations/24 | Section 9.1 EncounterSpec |

This document does NOT duplicate these specifications -- it shows how they compose into a unified lifecycle.

---

## 8. Error handling and graceful degradation

### 8.1 Module execution failures

```ts
interface ModuleFailurePolicy {
  // If a task within a module fails to render (renderer crash)
  taskRenderFailure: 'skip_task' | 'abort_module';

  // If the LLM is unavailable for scoring
  llmUnavailable: 'use_deterministic_fallback' | 'defer_scoring';

  // If the player abandons mid-module
  playerAbandonment: 'score_partial' | 'discard';
}

const DEFAULT_FAILURE_POLICY: ModuleFailurePolicy = {
  taskRenderFailure: 'skip_task',       // skip broken task, continue with remaining
  llmUnavailable: 'use_deterministic_fallback',  // fallback to dimensional scoring only
  playerAbandonment: 'score_partial',   // record what was completed
};
```

### 8.2 Partial completion scoring

When a player exits at a checkpoint (infinite checkpoint model), the module scores what was completed:

```ts
function scorePartialCompletion(
  active: ActiveModuleState
): ModuleScoring | null {
  if (active.trialsCompleted.length === 0) return null;  // nothing to score

  // Score with reduced confidence proportional to completion
  const completionRatio = active.trialsCompleted.length / active.module.assessment.tasks.length;
  const scoring = scoreModule(active);

  // Reduce confidence to reflect incompleteness
  return {
    ...scoring,
    capacityResult: {
      ...scoring.capacityResult,
      confidence: scoring.capacityResult.confidence * completionRatio,
    },
  };
}
```

---

## 9. Implementation structure

The unified architecture maps to the following file structure (extending docs/system/sub-systems/kernel/stage-assessment-architecture Part IX):

```
src/
├── core/
│   ├── assessments/
│   │   ├── types.ts                  ← StageAssessment, AssessmentTask, MeasureDimension, etc.
│   │   ├── engine.ts                 ← runAssessment(), scoreTrials(), computeConfidence()
│   │   ├── registry.ts              ← ModuleRegistry: register, get, filter, cooldown management
│   │   ├── lifecycle.ts             ← Module lifecycle orchestrator (7-stage pipeline)
│   │   ├── scoring.ts              ← Scoring mode routing (capacity/shadow/calibration/practice)
│   │   └── {line}/{stage}.ts        ← 64 individual module definitions
│   │
│   ├── engines/
│   │   ├── CCIEngine.ts             ← Composite index computation (foundations/25)
│   │   ├── AutoModeStrategy.ts      ← Session strategy from CCI (foundations/27)
│   │   ├── EncounterScheduler.ts    ← Priority-based selection (foundations/24)
│   │   ├── ConsequenceEngine.ts     ← Outcome -> state mutations
│   │   ├── PolarityEngine.ts        ← 4-level polarity aggregation (foundations/19)
│   │   ├── ThetaDecay.ts            ← Staleness computation
│   │   └── TransformationDetector.ts← Threshold detection (foundations/17)
│   │
│   └── domain/
│       └── Significator.ts          ← The sole state vessel (foundations/16)
│
├── game/
│   └── assessments/
│       ├── AssessmentScene.ts       ← Generic Phaser scene for all module execution
│       ├── renderers/
│       │   ├── NBackRenderer.ts
│       │   ├── DilemmaRenderer.ts
│       │   ├── ScenarioRenderer.ts
│       │   ├── ReactionTimeRenderer.ts
│       │   ├── HoldRenderer.ts
│       │   ├── PatternRenderer.ts
│       │   ├── EmotionRenderer.ts
│       │   └── LLMDialogueRenderer.ts
│       └── CompositeOnboarding.ts   ← Binary-search orchestrator
```

---

## 10. Architectural invariants

These invariants must hold across all implementations:

1. **No module knows its execution mode.** Modules define tasks and rubrics; the engine decides how to score.
2. **No renderer knows the developmental purpose.** Renderers display tasks and collect responses; they never access the Significator.
3. **No state mutation occurs during module execution.** All mutations happen AFTER scoring, atomically.
4. **The Significator is the sole mutable player state.** No other persistent player data structure exists.
5. **The scheduler never generates player-facing content.** It produces structural specifications; the LLM and renderers produce player-visible output.
6. **Every encounter is an assessment module.** There is no other encounter type. "Combat" is a narrative frame, not an architectural category.
7. **The module pool is the single content source.** Onboarding, encounters, practice, and shadow work all draw from the same 64 modules.
8. **Pure functions dominate.** CCI, scheduling, and scoring are all pure functions (state in, result out). Only the persistence layer has side effects.

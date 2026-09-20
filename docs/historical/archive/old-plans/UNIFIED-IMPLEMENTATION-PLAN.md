# UNIFIED-IMPLEMENTATION-PLAN.md -- From R&D to Unified Architecture

> **Status:** Active. This document supersedes `IMPLEMENTATION-PLAN.md`.
> **Supersedes:** `IMPLEMENTATION-PLAN.md` (which retains ATB combat, BattleScene, and PlayerProfile -- all now removed from the architecture).
> **Language:** TypeScript (strict mode). **Renderer:** Phaser 3. **Targets:** Web + Android (Capacitor).
> **Architectural basis:** `docs/foundations/26-unified-core-architecture.md`, `docs/STAGE-ASSESSMENT-ARCHITECTURE.md`

---

## Overview

The R&D documentation set (27 foundation docs + 512 concept-drafts) specifies *what* the game is. This document specifies *how to build it* -- in what order, with what interfaces, tested how.

**Key architectural shift from the previous plan:** Legacy combat (ATB, spells, damage, HP/Mana) is completely removed. Assessment modules ARE the gameplay. Every encounter is a module executing in one of four modes (calibration, encounter, practice, shadow work). The BattleScene is replaced by AssessmentScene. The PlayerProfile is replaced by the Significator.

### The Three Layers (unchanged)

```
src/
├── core/       <- Pure TypeScript. No Phaser, no I/O, no network.
│               Runs in Node, in Vitest, in the browser, anywhere.
│               THIS IS WHERE THE BRAIN LIVES.
│
├── infra/      <- I/O adapters: persistence, LLM client, crypto, native bridges.
│               Implements interfaces defined in core/.
│
└── game/       <- Phaser 3 scenes that VISUALISE the core.
                The rendering layer. Consumes core/ via events.
```

### The Build Phases

| Phase | What | Duration estimate | Exit criteria |
|---|---|---|---|
| **0** | Legacy removal | 1 week | All combat/battle/spell/damage code deleted; imports resolved; build passes |
| **1** | Assessment module system (64-cell architecture) | 4-6 weeks | Red stage modules pass tests; engine runs headless |
| **2** | CCI engine | 1 week | Pure function computes composite from Significator; all signals correct |
| **3** | Auto-mode strategy engine | 1-2 weeks | Session strategies generated; weight biasing verified |
| **4** | Refactored onboarding | 2 weeks | Binary-search composite assessment produces valid Significator |
| **5** | Integration and polish | 2-3 weeks | End-to-end session playable; accessibility; deploy |

---

## Phase 0: Legacy Removal

**Goal:** Remove all vestiges of the ATB combat system, spell/damage mechanics, and the legacy PlayerProfile. The codebase should compile cleanly with ONLY the Significator as player state and assessment modules as gameplay.

### 0.1 -- Files to delete

| File | Reason for removal |
|---|---|
| `src/core/domain/Battler.ts` | ATB combat entity -- replaced by assessment module execution |
| `src/core/domain/Spell.ts` | Spell system -- no spells in unified architecture |
| `src/core/usecases/ATBEngine.ts` | Active Time Battle engine -- no turn-based combat |
| `src/core/usecases/DamageCalculator.ts` | Damage computation -- no HP/damage in unified architecture |
| `src/game/scenes/BattleScene.ts` | Combat rendering scene -- replaced by AssessmentScene |

### 0.2 -- Files to refactor

| File | Refactoring needed |
|---|---|
| `src/core/domain/PlayerProfile.ts` | Mark as deprecated; ensure `Significator.ts` (already exists) is the sole vessel. Remove HP, Mana, Damage, Equipment fields if present. |
| `src/core/domain/Stats.ts` | Remove HP, Mana, Attack, Defence, Speed -- retain only developmental stats (if any remain relevant) or delete entirely |
| `src/game/ui/StatBar.ts` | Likely references HP/Mana display concepts. Remove or rewrite for developmental-only display. |
| All files importing deleted modules | Update imports; remove combat-related logic; ensure build compiles |

### 0.3 -- Verification

| Check | Command | Expected |
|---|---|---|
| Build compiles | `npm run build` | 0 errors |
| Type check passes | `npx tsc --noEmit` | 0 errors |
| Tests pass | `npm run test` | All existing non-combat tests pass |
| No dangling imports | `grep -r "Battler\|ATBEngine\|DamageCalculator\|BattleScene\|Spell" src/` | 0 results |
| No residual HP/Mana/damage UI | `grep -r "HP\|Mana\|damage" src/` | 0 results (or only false positives in unrelated contexts) |

### 0.4 -- What survives from the old plan

- All existing engine infrastructure (ThetaDecay, PolarityEngine, TransformationDetector, EncounterScheduler, ConsequenceEngine)
- The EventBus and event system
- The persistence layer (SignificatorStore, WorldStateStore)
- The LLM infrastructure (ContextPipeline, VeilFilter, etc.)
- Onboarding probes (but they will be refactored in Phase 4)
- Domain models that align with the Significator (PolarityTrace, ShadowLedger, Holon, EncounterSpec, etc.)

---

## Phase 1: Assessment Module System

**Goal:** Implement the 64-cell module architecture per `docs/STAGE-ASSESSMENT-ARCHITECTURE.md` and `docs/foundations/26-unified-core-architecture.md`. Start with Red stage as the vertical slice.

### Phase 1a: Core types and engine (Week 1-2)

| # | Task | File(s) | Spec source | Test criteria |
|---|---|---|---|---|
| 1 | Define assessment types | `src/core/assessments/types.ts` | STAGE-ASSESSMENT-ARCHITECTURE Part II | All interfaces compile; factory functions produce valid instances |
| 2 | Implement assessment engine | `src/core/assessments/engine.ts` | STAGE-ASSESSMENT-ARCHITECTURE Part IX | `runAssessment()`, `scoreTrials()`, `computeConfidence()` pass unit tests |
| 3 | Implement module registry | `src/core/assessments/registry.ts` | foundations/26 section 3.1 | CRUD operations; cooldown management; query by line/stage/modality |
| 4 | Implement lifecycle orchestrator | `src/core/assessments/lifecycle.ts` | foundations/26 section 3 | 7-stage pipeline executes correctly; state mutations applied |
| 5 | Implement scoring mode router | `src/core/assessments/scoring.ts` | foundations/26 section 2.1 | Capacity/shadow/calibration/practice modes produce correct output types |
| 5b | Create SignificatorSnapshot bridge type | `src/core/domain/SignificatorSnapshot.ts` | foundations/24 section 2.1 | Read-only projection from the existing `Significator` interface; includes pre-computed `driveBalance`, `fixationRisk`, `compoundShadows`, `recentEncounterHistory`, and `transformationReadiness` sub-object as required by CCI (foundations/25) and auto-mode (foundations/27); factory function `toSnapshot(sig: Significator): SignificatorSnapshot` compiles and returns a valid snapshot |

### Phase 1b: Red stage modules (Week 2-4)

> **Note (SessionContext refactoring):** The existing `SessionContext` in `src/core/engines/PriorityComputation.ts` has fields (`encountersSoFar`, `sessionDurationMs`, `targetSessionLength`, `recentLines`) that diverge from the spec in foundations/24 section 2.3 (which adds `estimatedTimeAvailable`, `inferredEnergy`, `patienceSignals`, etc.). As part of Phase 1a domain model work, `SessionContext` must be extended to include these fields so that the CCI engine (Phase 2) and auto-mode (Phase 3) can consume session context correctly. This can be done as a sub-task alongside task 1 (Define assessment types).

| # | Task | File(s) | Spec source | Test criteria |
|---|---|---|---|---|
| 6 | Cognitive/Red module | `src/core/assessments/cognitive/red.ts` | STAGE-ASSESSMENT-ARCHITECTURE Part III section 3.1 + concept-drafts/cognitive/03-red/module-spec.md | n=2 n-back + 2-step planning tasks defined; scoring rubric produces valid results |
| 7 | Emotional/Red module | `src/core/assessments/emotional/red.ts` | Part III section 3.2 + concept-drafts | Self-other emotion tasks; intensity rating; scoring correct |
| 8 | Moral/Red module | `src/core/assessments/moral/red.ts` | Part III section 3.3 + concept-drafts | Egocentric dilemmas; LLM rubric defined; fallback scoring works |
| 9 | Intrapersonal/Red module | `src/core/assessments/intrapersonal/red.ts` | Part III section 3.4 + concept-drafts | Self-concept tasks; prediction tasks; scoring correct |
| 10 | Spiritual/Red module | `src/core/assessments/spiritual/red.ts` | Part III section 3.5 + concept-drafts | Value-ranking under temptation; coherence scoring |
| 11 | Somatic/Red module | `src/core/assessments/somatic/red.ts` | Part III section 3.6 + concept-drafts | Fast RT + rapid alternation; timing accuracy |
| 12 | Willpower/Red module | `src/core/assessments/willpower/red.ts` | Part III section 3.7 + concept-drafts | 3-5s hold under distraction; early-release temptation |
| 13 | Interpersonal/Red module | `src/core/assessments/interpersonal/red.ts` | Part III section 3.8 + concept-drafts | Simple pattern prediction; social reading tasks |

### Phase 1c: Amber + Magenta modules (Week 4-5)

| # | Task | File(s) | Test criteria |
|---|---|---|---|
| 14 | All 8 Magenta modules | `src/core/assessments/{line}/magenta.ts` | Each passes with stage-appropriate tasks |
| 15 | All 8 Amber modules | `src/core/assessments/{line}/amber.ts` | Each passes with stage-appropriate tasks |

### Phase 1d: Orange + Green modules (Week 5-6)

| # | Task | File(s) | Test criteria |
|---|---|---|---|
| 16 | All 8 Orange modules | `src/core/assessments/{line}/orange.ts` | Each passes; abstract reasoning tasks defined |
| 17 | All 8 Green modules | `src/core/assessments/{line}/green.ts` | Each passes; perspective-coordination tasks defined |

### Phase 1e: Edge stages (Week 6, parallel with Phase 2)

| # | Task | File(s) | Test criteria |
|---|---|---|---|
| 18 | All 8 Infrared modules | `src/core/assessments/{line}/infrared.ts` | Sensorimotor baseline tasks |
| 19 | All 8 Turquoise modules | `src/core/assessments/{line}/turquoise.ts` | Vision-logic tasks |
| 20 | All 8 White modules | `src/core/assessments/{line}/white.ts` | Non-dual capacity tasks |

### Phase 1f: Renderers (Week 4-6, parallel with module development)

| # | Task | File(s) | Test criteria |
|---|---|---|---|
| 21 | AssessmentScene (generic container) | `src/game/assessments/AssessmentScene.ts` | Loads any module; sequences tasks; handles checkpoints |
| 22 | NBackRenderer | `src/game/assessments/renderers/NBackRenderer.ts` | Renders n-back tasks; collects responses |
| 23 | DilemmaRenderer | `src/game/assessments/renderers/DilemmaRenderer.ts` | Renders choice scenarios; branching works |
| 24 | ScenarioRenderer | `src/game/assessments/renderers/ScenarioRenderer.ts` | Renders intrapersonal/spiritual reflections |
| 25 | ReactionTimeRenderer | `src/game/assessments/renderers/ReactionTimeRenderer.ts` | Renders RT/rhythm/anticipation tasks |
| 26 | HoldRenderer | `src/game/assessments/renderers/HoldRenderer.ts` | Renders sustained-hold/willpower tasks |
| 27 | PatternRenderer | `src/game/assessments/renderers/PatternRenderer.ts` | Renders pattern-recognition/social-prediction |
| 28 | EmotionRenderer | `src/game/assessments/renderers/EmotionRenderer.ts` | Renders emotion-identification tasks |
| 29 | LLMDialogueRenderer | `src/game/assessments/renderers/LLMDialogueRenderer.ts` | Renders open-ended LLM-scored tasks |

---

## Phase 2: CCI Engine

**Goal:** Implement the Cumulative Consciousness Index per `docs/foundations/25-cumulative-consciousness-index.md`. Pure function: Significator in, CCI score out.

| # | Task | File(s) | Spec source | Test criteria |
|---|---|---|---|---|
| 30 | Implement dimension extractors | `src/core/engines/CCIEngine.ts` | foundations/25 section 2 | Each of 5 dimensions correctly extracted from test Significator |
| 31 | Implement normalisation functions | `src/core/engines/CCIEngine.ts` | foundations/25 section 2 (per dimension) | All normalised values in [0.0, 1.0]; edge cases handled |
| 32 | Implement weight adjustment | `src/core/engines/CCIEngine.ts` | foundations/25 section 3.2 | Weights shift correctly for shadow-heavy, near-transformation, drive-imbalanced states |
| 33 | Implement composite computation | `src/core/engines/CCIEngine.ts` | foundations/25 section 3.3 | Composite correct for known inputs; weights sum to 1.0 after the normalisation step in `adjustWeights` (the active-transformation override hardcodes weights that happen to sum to 1.0, but the general-case normalisation is what guarantees it) |
| 34 | Implement session signal derivation | `src/core/engines/CCIEngine.ts` | foundations/25 section 4 | Theme selection, intensity budget, shadow pressure classification all correct |
| 35 | Integration test: CCI + existing engines | `src/tests/engines/CCIEngine.test.ts` | foundations/25 section 5.3 | CCI correctly reads ThetaDecay, PolarityEngine, TransformationDetector outputs |

---

## Phase 3: Auto-Mode Strategy Engine

**Goal:** Implement the session-level strategy generator per `docs/foundations/27-auto-mode-strategy-engine.md`. Wraps the scheduler with CCI-informed parameterisation.

| # | Task | File(s) | Spec source | Test criteria |
|---|---|---|---|---|
| 36 | Implement strategy generation | `src/core/engines/AutoModeStrategy.ts` | foundations/27 section 3 | Given known CCI, produces correct theme, arc params, and weight bias |
| 37 | Implement weight bias application | `src/core/engines/AutoModeStrategy.ts` | foundations/27 section 2.3 | Biased weights normalise correctly; scheduler receives valid params |
| 38 | Implement arc parameterisation | `src/core/engines/AutoModeStrategy.ts` | foundations/27 section 3.3 | Each theme produces appropriate warmup/peak/cooldown parameters |
| 39 | Implement mid-session adjustment | `src/core/engines/AutoModeStrategy.ts` | foundations/27 section 4 | Energy drop, avoidance spike, engagement surge, shadow fatigue all trigger correctly |
| 40 | Implement CCI refresh cycle | `src/core/engines/AutoModeStrategy.ts` | foundations/27 section 4.3 | Strategy refreshes after N encounters; theme changes propagate |
| 41 | Implement safety override | `src/core/engines/AutoModeStrategy.ts` | foundations/27 section 7.3 | Distressed Significator triggers consolidation override |
| 42 | Integration: auto-mode + scheduler | `src/tests/engines/AutoMode.test.ts` | foundations/27 section 5 | Session strategy correctly biases scheduler output |

---

## Phase 4: Refactored Onboarding

**Goal:** Rewrite the onboarding as a composite assessment (binary search on stages) per `STAGE-ASSESSMENT-ARCHITECTURE` Part VI. Uses the same 64-cell modules -- NOT a separate system.

| # | Task | File(s) | Spec source | Test criteria |
|---|---|---|---|---|
| 43 | Implement binary search orchestrator | `src/game/assessments/CompositeOnboarding.ts` | STAGE-ASSESSMENT-ARCHITECTURE Part VI | Converges to correct altitude within 2-4 modules per line |
| 44 | Implement session splitting | `src/game/assessments/CompositeOnboarding.ts` | Part VI section 6.1 | 3-session split: body+mind, depth, action |
| 45 | Implement quick-calibration mode | `src/game/assessments/CompositeOnboarding.ts` | Part VI section 6.1 | Single-session calibration with 1 assessment per line |
| 46 | Wire onboarding to Significator | `src/core/domain/Significator.ts` + onboarding | foundations/16 | Onboarding results produce valid initial Significator with per-line altitudes |
| 47 | Integration: onboarding -> CCI -> first session | Integration test | foundations/25, 27 | After onboarding completes, first gameplay session receives valid CCI and strategy |

---

## Phase 5: Integration and Polish

**Goal:** Wire all systems together through the EventBus. End-to-end testing. Accessibility. Deploy.

### 5.1 -- System integration (Week 1)

| # | Task | File(s) | Test criteria |
|---|---|---|---|
| 48 | Wire module lifecycle to EventBus | `src/core/events/GameEvents.ts` | Events fire at each lifecycle stage (scheduled, active, scored, mutated) |
| 49 | Wire CCI + auto-mode to session start | `src/core/GameLoop.ts` | Session start computes CCI, generates strategy, passes to scheduler |
| 50 | Wire mid-session refresh | `src/core/GameLoop.ts` | CCI recomputes every 3 encounters; adjustments apply |
| 51 | End-to-end headless test | `src/tests/integration/FullSession.test.ts` | 20-encounter session runs: onboard -> CCI -> strategy -> encounters -> mutations |

### 5.2 -- Accessibility (Week 2)

| # | Task | Test criteria |
|---|---|---|
| 52 | WCAG 2.1 AA compliance on all renderers | All interactive elements keyboard-accessible; colour contrast passes |
| 53 | Reduced-motion mode | Animations disabled; timing tasks use patience mode |
| 54 | Screen reader support | Text-heavy renderers announce content; focus management correct |

### 5.3 -- Deploy (Week 2-3)

| # | Task | Test criteria |
|---|---|---|
| 55 | Vite production build | `npm run build` succeeds; bundle size reasonable |
| 56 | Capacitor Android sync | `npx cap sync android` succeeds; APK builds |
| 57 | CI pipeline | All invariants checked; build + test + type-check pass in CI |
| 58 | Build-time invariant checks | Assessment module count = 64; all modules registered; no orphans |

---

## File Structure (target state after Phase 5)

```
src/
├── core/
│   ├── assessments/
│   │   ├── types.ts                  <- StageAssessment, AssessmentTask, ScoringRubric, etc.
│   │   ├── engine.ts                 <- runAssessment(), scoreTrials(), computeConfidence()
│   │   ├── registry.ts              <- ModuleRegistry: register, get, filter, cooldown
│   │   ├── lifecycle.ts             <- 7-stage module lifecycle orchestrator
│   │   ├── scoring.ts              <- Scoring mode router (capacity/shadow/calibration/practice)
│   │   ├── cognitive/
│   │   │   ├── index.ts
│   │   │   ├── infrared.ts -> white.ts  (8 modules)
│   │   ├── emotional/              <- same structure (8 modules)
│   │   ├── moral/                  <- same structure (8 modules)
│   │   ├── intrapersonal/          <- same structure (8 modules)
│   │   ├── spiritual/             <- same structure (8 modules)
│   │   ├── somatic/               <- same structure (8 modules)
│   │   ├── willpower/             <- same structure (8 modules)
│   │   └── interpersonal/          <- same structure (8 modules)
│   │
│   ├── engines/
│   │   ├── CCIEngine.ts             <- Cumulative Consciousness Index (foundations/25)
│   │   ├── AutoModeStrategy.ts      <- Session strategy from CCI (foundations/27)
│   │   ├── EncounterScheduler.ts    <- Priority-based selection (foundations/24)
│   │   ├── PriorityComputation.ts   <- The weighted formula
│   │   ├── CandidateGeneration.ts   <- Eligible encounter filtering
│   │   ├── ConsequenceEngine.ts     <- Outcome -> state mutations
│   │   ├── PolarityEngine.ts        <- 4-level polarity aggregation (foundations/19)
│   │   ├── ThetaDecay.ts            <- Staleness computation
│   │   └── TransformationDetector.ts<- Threshold detection (foundations/17)
│   │
│   ├── domain/
│   │   ├── Significator.ts          <- The sole state vessel (foundations/16)
│   │   ├── PolarityTrace.ts
│   │   ├── PolarityCellVector.ts
│   │   ├── Holon.ts
│   │   ├── EncounterSpec.ts
│   │   ├── ConsequenceRecord.ts
│   │   ├── ShadowLedger.ts
│   │   └── enums.ts
│   │
│   ├── data/
│   │   ├── ConceptDraftIndex.ts
│   │   ├── HolonRegistry.ts
│   │   ├── PolarityOntology.ts
│   │   └── red-layer-holons.json
│   │
│   ├── events/
│   │   ├── GameEvents.ts
│   │   └── EventBus.ts
│   │
│   └── GameLoop.ts                   <- Headless game loop (CCI -> auto-mode -> scheduler -> module -> mutate)
│
├── infra/
│   ├── llm/
│   │   ├── LLMClient.ts
│   │   ├── ContextPipeline.ts
│   │   ├── FrequencyConditioner.ts
│   │   ├── VeilFilter.ts
│   │   ├── ConsequenceParser.ts
│   │   ├── FallbackProvider.ts
│   │   └── contracts/
│   │       ├── LanguageReflective.ts
│   │       ├── ScenarioChoice.ts
│   │       ├── DeterministicFraming.ts
│   │       └── index.ts
│   │
│   ├── persistence/
│   │   ├── SignificatorStore.ts
│   │   ├── WorldStateStore.ts
│   │   ├── MigrationEngine.ts
│   │   └── (existing files)
│   │
│   └── (existing: crypto, i18n, native)
│
├── game/
│   ├── assessments/
│   │   ├── AssessmentScene.ts       <- Generic Phaser scene for ALL module execution
│   │   ├── renderers/
│   │   │   ├── NBackRenderer.ts
│   │   │   ├── DilemmaRenderer.ts
│   │   │   ├── ScenarioRenderer.ts
│   │   │   ├── ReactionTimeRenderer.ts
│   │   │   ├── HoldRenderer.ts
│   │   │   ├── PatternRenderer.ts
│   │   │   ├── EmotionRenderer.ts
│   │   │   └── LLMDialogueRenderer.ts
│   │   └── CompositeOnboarding.ts   <- Binary-search onboarding orchestrator
│   │
│   ├── scenes/
│   │   ├── WorldScene.ts            <- World navigation (renders available encounters)
│   │   ├── JournalScene.ts          <- Codex + vows
│   │   └── (other non-combat scenes)
│   │
│   ├── onboarding/                   <- (legacy probes, wired to CompositeOnboarding)
│   └── (existing: ui, objects, config)
│
└── tests/
    ├── engines/
    │   ├── CCIEngine.test.ts
    │   ├── AutoMode.test.ts
    │   ├── EncounterScheduler.test.ts
    │   ├── PolarityEngine.test.ts
    │   ├── ThetaDecay.test.ts
    │   ├── ConsequenceEngine.test.ts
    │   └── TransformationDetector.test.ts
    ├── assessments/
    │   ├── Registry.test.ts
    │   ├── Lifecycle.test.ts
    │   └── modules/                  <- Per-module tests
    ├── integration/
    │   ├── FullSession.test.ts       <- End-to-end 20-encounter session
    │   ├── Onboarding.test.ts        <- Binary-search convergence
    │   └── ConceptDraftIndex.test.ts
    └── (existing tests)
```

---

## Removed from the old plan (explicitly)

The following items from `IMPLEMENTATION-PLAN.md` are removed in this unified plan:

| Old plan item | Reason for removal |
|---|---|
| Phase D section 3: BattleScene | Replaced by AssessmentScene; no ATB combat |
| Phase D section 5: The Conqueror Boss Fight (4-quadrant phased fight) | Boss "fights" are now assessment module sequences with narrative framing, not ATB combat |
| "Refactor BattleScene for new domain" (task 37) | BattleScene deleted in Phase 0 |
| ATB mechanics in any form | Assessment modules ARE the gameplay; no turn-based combat |
| HP/Mana/Damage in Stats.ts | Developmental dimensions (accuracy, depth, coherence) replace hit points |
| PlayerProfile as primary vessel | Significator (already exists) is the sole state vessel |
| "Existing scaffold is preserved and extended" for combat | Combat scaffold is deleted, not extended |

---

## Dependencies between phases

```
Phase 0 (Legacy Removal)
    |
    v
Phase 1a (Core types + engine)
    |
    ├── Phase 1b-1e (64 modules) -- can proceed in parallel once 1a is done
    |       |
    |       └── Phase 1f (Renderers) -- parallel with module development
    |
    v
Phase 2 (CCI Engine) -- requires Significator types from Phase 1a
    |
    v
Phase 3 (Auto-Mode) -- requires CCI from Phase 2
    |
    v
Phase 4 (Onboarding) -- requires modules from Phase 1b-1c + CCI from Phase 2
    |
    v
Phase 5 (Integration) -- requires all above
```

---

## Key Design Decisions (updated from old plan)

| Decision | Rationale |
|---|---|
| **ATB combat is completely removed** | Assessment modules ARE the gameplay; combat was a vestigial concept from earlier design |
| **BattleScene replaced by AssessmentScene** | One generic scene handles all module types via renderer abstraction |
| **Significator is the sole state vessel** | PlayerProfile lacked polarity, shadow-ledger, transformation-history, theta-decay |
| **CCI is a session-level signal, not per-encounter** | Prevents redundant computation; clean separation of concerns |
| **Auto-mode wraps scheduler, never replaces** | Preserves scheduler's per-encounter autonomy while adding session intelligence |
| **Modules serve 4 purposes (calibration/encounter/practice/shadow)** | One content investment serves the entire game; no separate assessment system |
| **Engines are pure functions** | Testable, deterministic, portable. State in, state out. |
| **64 modules built stage-by-stage (Red first)** | Vertical slice validates architecture before horizontal expansion |
| **LLM is manifest layer, not brain** | Scheduler decides WHAT; LLM decides HOW to present it |
| **Legacy removal is Phase 0, not deferred** | Clean break prevents contamination of new architecture with old assumptions |

---

## Success Criteria (Launch Gate)

1. All 64 assessment modules implemented and passing tests
2. CCI engine produces valid session signals from any Significator state
3. Auto-mode generates appropriate session strategies for all 9 themes
4. Encounter scheduler operates with auto-mode weight biasing correctly
5. Composite onboarding converges within 2-4 assessments per line
6. No references to ATB, Battler, Spell, DamageCalculator, or BattleScene in codebase
7. AssessmentScene renders all 8+ task types via renderer abstraction
8. Full session (20 encounters) runs headlessly without crash
9. Mid-session strategy adjustment triggers correctly on energy/avoidance signals
10. Significator state mutates correctly after each module completion
11. Polarity engine running (traces recorded, crystallisation detected)
12. Theta-decay triggers maintenance encounters at correct intervals
13. Transformation threshold detection and transformation-mode scheduling work
14. Veil enforced (no developmental scores or CCI values in player-facing UI)
15. Web + Android deploy succeeds
16. WCAG 2.1 AA accessibility on all renderers
17. >= 90% test coverage on core/ engines and assessments
18. Build-time invariant: exactly 64 registered modules (8 lines x 8 stages)

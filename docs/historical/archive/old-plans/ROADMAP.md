# ROADMAP.md - Mysterium Development Roadmap

> Mysterium: every gameplay verb is a gamified developmental assessment across 8 lines of intelligence x 8 stages of consciousness.

---

## What Has Been Built (Phases 0-5)

The project has undergone a complete architectural transformation implementing Phases 0 through 5 of the [UNIFIED-IMPLEMENTATION-PLAN.md](./UNIFIED-IMPLEMENTATION-PLAN.md).

### Phase 0: Legacy Removal (COMPLETE)

All combat-oriented legacy code has been removed:
- No `BattleScene`, `ATBEngine`, `DamageCalculator`, `Spell`, or `Battler` classes remain
- `src/core/domain/PlayerProfile.ts` marked `@deprecated` - retained only for migration paths
- `src/core/domain/Significator.ts` (104 lines) is now the sole player state vessel
- `src/core/domain/Stats.ts` retained only for backward-compatible `CognitiveProfile` type

### Phase 1: Assessment Module System (COMPLETE)

**Core framework** (`src/core/assessments/`, 526 lines total):
- `types.ts` (110 lines) - Full type system: `StageAssessment`, `AssessmentTask`, `ScoringRubric`, `DriveProbe`, task type unions
- `engine.ts` (136 lines) - `runAssessment()`, `scoreTrials()`, `computeConfidence()`
- `registry.ts` (50 lines) - `ModuleRegistry` class with CRUD + cooldown tracking
- `lifecycle.ts` (76 lines) - 7-stage state machine: Pool -> Candidate -> Selected -> Active -> Scored -> Mutate -> Repool
- `scoring.ts` (154 lines) - 4 execution modes: capacity / shadow / calibration / practice

**All 64 assessment modules** exist across 8 lines x 8 stages:
- `src/core/assessments/cognitive/{infrared,magenta,red,amber,orange,green,turquoise,white}.ts`
- `src/core/assessments/emotional/{infrared,magenta,red,amber,orange,green,turquoise,white}.ts`
- `src/core/assessments/moral/{infrared,magenta,red,amber,orange,green,turquoise,white}.ts`
- `src/core/assessments/intrapersonal/{infrared,magenta,red,amber,orange,green,turquoise,white}.ts`
- `src/core/assessments/interpersonal/{infrared,magenta,red,amber,orange,green,turquoise,white}.ts`
- `src/core/assessments/spiritual/{infrared,magenta,red,amber,orange,green,turquoise,white}.ts`
- `src/core/assessments/somatic/{infrared,magenta,red,amber,orange,green,turquoise,white}.ts`
- `src/core/assessments/willpower/{infrared,magenta,red,amber,orange,green,turquoise,white}.ts`

Each module contains: task definitions with typed parameters, a scoring rubric with dimension weights, minimum trial count, estimated duration, and 4 drive probes (agency, communion, eros, agape) with healthy/addiction/allergy signal descriptions.

**8 task-type renderers** (`src/game/assessments/renderers/`):
- `NBackRenderer.ts` - Working memory n-back tasks
- `ReactionTimeRenderer.ts` - Go/No-Go and reaction time tasks
- `DilemmaRenderer.ts` - Moral dilemma presentations
- `ScenarioRenderer.ts` - Multi-choice scenario assessments
- `HoldRenderer.ts` - Sustained attention / impulse regulation tasks
- `PatternRenderer.ts` - Pattern recognition and prediction tasks
- `EmotionRenderer.ts` - Emotional recognition and regulation tasks
- `LLMDialogueRenderer.ts` - Free-text dialogue scored by LLM rubrics

**Assessment orchestration**:
- `src/game/assessments/AssessmentScene.ts` (197 lines) - Generic container routing to correct renderer by task type
- `src/game/assessments/CompositeOnboarding.ts` (232 lines) - Binary-search onboarding with session splitting (full / three-session / quick-calibration)

### Phase 2: CCI Engine (COMPLETE)

`src/core/engines/CCIEngine.ts` (708 lines):
- 5 dimension extractors (cognitive complexity, emotional regulation, moral reasoning, shadow integration, drive balance)
- 5 normalisation functions (one per dimension)
- Composite CCI computation with configurable weight adjustment
- Session signal derivation: theme selection, intensity budget, shadow pressure, transformation proximity, drive rebalancing target, polarity guidance

### Phase 3: Auto-Mode Strategy Engine (COMPLETE)

`src/core/engines/AutoModeStrategy.ts` (684 lines):
- `generateSessionStrategy()` - Full session planning from CCI + Significator state
- `computeWeightBias()` / `applyWeightBias()` - Dynamic priority adjustment
- `parameteriseArc()` - Session arc parameterisation (warmup -> peak -> cooldown)
- `computeEncounterBudget()` - Per-session encounter allocation
- `evaluateMidSessionAdjustment()` - Real-time session course correction
- `checkSafetyOverride()` - Psychological safety bounds enforcement

### Phase 4: Refactored Onboarding (COMPLETE)

`src/game/assessments/CompositeOnboarding.ts` (232 lines):
- Binary search per line to find initial stage placement
- Session splitting: full (all 8 lines in one session), three-session (split across 3 sessions), quick-calibration (abbreviated)
- Connects to `AssessmentScene` for task presentation

### Phase 5: Integration and Polish (PARTIALLY COMPLETE)

**Engine integration** (`src/core/GameLoop.ts`, 250 lines):
- `tick()` and `tickWithStrategy()` methods wire all engines together
- CCI recomputation on encounter completion
- Auto-Mode strategy regeneration on significant state changes

**Supporting engines** (`src/core/engines/`, 654 lines combined):
- `EncounterScheduler.ts` (85 lines) - Encounter selection algorithm
- `PriorityComputation.ts` (131 lines) - Multi-factor priority scoring
- `CandidateGeneration.ts` (59 lines) - Candidate pool generation
- `PolarityEngine.ts` (144 lines) - STO/STS polarity vector tracking
- `TransformationDetector.ts` (88 lines) - Stage-transition detection
- `ConsequenceEngine.ts` (101 lines) - Action consequence propagation
- `ThetaDecay.ts` (46 lines) - Confidence decay over time

**Event system** (`src/core/events/`, 51 lines):
- `EventBus.ts` - Publish/subscribe event bus
- `GameEvents.ts` - All lifecycle event types (encounter_scheduled, encounter_completed, shadow_surfaced, transformation_detected, etc.)

**Accessibility** (`src/game/accessibility/`, 114 lines):
- `AccessibilityManager.ts` (47 lines) - Preference management and coordination
- `ReducedMotionGuard.ts` (13 lines) - Motion sensitivity guard
- `ScreenReaderOverlay.ts` (54 lines) - Screen reader support overlay

**Telemetry** (`src/infra/telemetry/`, 70 lines):
- `TelemetryService.ts` (44 lines) - Opt-in telemetry collection
- `TelemetryStore.ts` (26 lines) - Local telemetry persistence

**LLM infrastructure** (`src/infra/llm/`, 936 lines):
- `FallbackProvider.ts` (143 lines) - Multi-provider fallback chain
- `LLMClient.ts` (50 lines) - Unified LLM API client interface
- `ContextPipeline.ts` (380 lines) - Context assembly for LLM requests
- `VeilFilter.ts` (92 lines) - Filters explicit psychological content from player-visible outputs
- `ConsequenceParser.ts` (131 lines) - Parses LLM-generated consequence chains
- `FrequencyConditioner.ts` (140 lines) - Stage-frequency conditioning for prompts
- `contracts/` directory with DeterministicFraming, LanguageReflective, ScenarioChoice contract templates

**Player state** (`src/core/domain/`):
- `Significator.ts` (104 lines) - Persistent player state vessel
- `SignificatorSnapshot.ts` (196 lines) - `toSnapshot()` with derived fields: driveBalance, fixationRisk, compoundShadows, transformationReadiness

**CI/CD** (`.github/workflows/`):
- `ci.yml` - Type-check + invariant verification + vitest + vite build
- `deploy.yml` - GitHub Pages deployment using `npm run build` (includes all checks)

**Game scenes** (`src/game/scenes/`, 12 scenes):
BootScene, PreloaderScene, MainMenuScene, WorldScene, EncounterScene, DilemmaScene, OnboardingScene, ReflectionScene, JournalScene, CodexScene, RadialChartScene, UIOverlayScene

**Build-time invariants** (`scripts/check-invariants.ts`):
- Verifies `bootRegistries()` executes without error
- Verifies `allModuleKeys` is callable
- Verifies `createRegistry([])` returns a valid empty registry
- Verifies all enum arrays (ALL_MODALITIES, ALL_SHADOW_QUADRANTS, ALL_HOLON_KINDS, ALL_POLARITY_MODES, ALL_ENERGETIC_DIRECTIONS) are non-empty

---

## Architecture Overview

### Three-Layer Architecture

```
src/core/       Pure TypeScript, zero dependencies on Phaser or I/O
                Contains: domain models, engines, registries, assessments, events, GameLoop

src/infra/      I/O adapters (persistence, native bridge, LLM, telemetry, crypto, i18n)
                Implements interfaces defined in core/

src/game/       Phaser 3 layer (scenes, renderers, UI, accessibility)
                Consumes core/ and infra/ - never imported by them
```

### Key Systems

1. **Assessment System**: 64 modules (8 lines x 8 stages) define tasks that are presented through 8 renderers, scored via rubrics, and analyzed for drive health patterns.

2. **CCI Engine**: Computes a Composite Consciousness Index from assessment results across 5 dimensions, then derives session signals (theme, intensity, shadow pressure) to guide the next encounter.

3. **Auto-Mode Strategy Engine**: Generates full session strategies by computing weight biases, parameterising session arcs, budgeting encounters, and checking safety overrides.

4. **Encounter Pipeline**: CandidateGeneration -> PriorityComputation -> EncounterScheduler selects the next assessment module based on theta-decay, CCI signals, and transformation proximity.

5. **Polarity and Consequence**: PolarityEngine tracks STO/STS vectors, ConsequenceEngine propagates action outcomes, TransformationDetector identifies stage transitions.

6. **LLM Pipeline**: ContextPipeline assembles prompts, FrequencyConditioner tunes to stage-appropriate language, VeilFilter ensures implicit operation, FallbackProvider manages multi-provider resilience.

---

## Current Gaps

### Gap 1: Content Depth in Assessment Modules

**Status: Structural skeleton WITH domain-specific parameterization, but limited narrative/stimulus content.**

All 64 modules exist with:
- Typed task definitions (specific n-back levels, trial counts, timing parameters)
- Scoring rubrics with dimension weights and pass thresholds
- Drive probes with healthy/addiction/allergy signal descriptions
- LLM scoring rubrics for dialogue tasks (particularly rich at Turquoise/White stages)

What is MISSING:
- Actual stimulus content (face images for emotion recognition, specific scenario narratives for dilemma tasks)
- Concrete text content for scenario-type tasks beyond template descriptions
- Audio/visual stimulus libraries for somatic tasks (heartbeat patterns, body scan cues)
- The concept-draft content from `docs/concept-drafts/cognitive/` through all 8 lines has been translated into module specs but the immersive-rpg, embodied-somatic, and social-cooperative modality variants are not reflected in the code modules (each module uses only 3-4 task types, not all 7 modalities)

### Gap 2: LLM Scoring Pipeline Not Wired

**Status: Infrastructure exists but no actual API integration.**

What EXISTS:
- `src/infra/llm/LLMClient.ts` - Interface definition
- `src/infra/llm/FallbackProvider.ts` - Multi-provider fallback logic
- `src/infra/llm/ContextPipeline.ts` - Context assembly (380 lines of pipeline logic)
- `src/infra/llm/VeilFilter.ts` - Output filtering
- `src/infra/llm/contracts/` - 3 contract templates (DeterministicFraming, LanguageReflective, ScenarioChoice)
- LLM rubric strings in assessment modules (e.g., `spiritual/white.ts` has detailed scoring criteria)

What is MISSING:
- No actual HTTP calls to any LLM provider (OpenAI, Anthropic, local)
- `LLMClient.ts` is 50 lines - an interface with no real implementation
- Tasks with `type: 'llm_dialogue'` that specify `measures: ['depth', 'coherence', 'integration']` currently fall through to fixed-rubric scoring in `scoring.ts`
- No prompt engineering for scoring (turning rubric strings into actual scored API calls)
- No streaming, rate limiting, or cost management

### Gap 3: Renderer Polish

**Status: All 8 renderers handle their task types but lack production-quality UX.**

What EXISTS:
- Functional task presentation and response collection for all 8 task types
- Basic text-based feedback

What is MISSING:
- Animations and transitions between task states (intro -> active -> scored -> next)
- Sound effects and audio feedback
- Visual feedback beyond basic text (progress bars, confidence indicators, drive health visualizations)
- Adaptive layouts for different screen sizes (mobile vs tablet vs desktop)
- Proper accessibility annotations beyond the basic `ScreenReaderOverlay`
- Theming per stage (each stage has a color/frequency that should be reflected in presentation)

### Gap 4: Testing Coverage

**Status: Engine-level tests pass; no module-level or E2E interaction tests.**

What EXISTS (tests that run and pass):
- `tests/engines/ThetaDecay.test.ts`
- `tests/engines/PolarityEngine.test.ts`
- `tests/engines/TransformationDetector.test.ts`
- `tests/engines/EncounterScheduler.test.ts`
- `tests/engines/GameLoop.test.ts`
- `tests/engines/CCIEngine.test.ts`
- `tests/engines/AutoMode.test.ts`
- `tests/engines/ConsequenceEngine.test.ts`
- `tests/integration/FullSession.test.ts` (20-encounter headless session)
- `tests/integration/CompositeOnboarding.test.ts`
- `tests/integration/PhaseB.test.ts`

What is MISSING:
- No unit tests for individual assessment modules (e.g., verifying `cognitiveRed` scoring produces expected results)
- No tests for renderers (task presentation, user input handling, state transitions)
- No tests for the scoring mode router with real trial data across all 4 modes
- No E2E test exercising actual Phaser scene interaction (user clicks, timed responses)
- No tests for LLM pipeline components (ContextPipeline, VeilFilter, FallbackProvider with mock providers)
- No property-based tests for CCI normalisation functions

### Gap 5: Native Build

**Status: Capacitor configured but never synced or built.**

What EXISTS:
- `capacitor.config.json` with app ID and web directory configured
- `@capacitor/android`, `@capacitor/core`, `@capacitor/app`, `@capacitor/preferences` in dependencies
- `src/infra/native/` bridge implementation
- `package.json` scripts: `cap:sync` and `cap:android`

What is MISSING:
- `npx cap sync android` has never been run (no `android/` directory exists)
- No APK has been produced or tested
- No iOS configuration
- No native-specific UI adaptations (safe areas, notch handling)
- No offline-first data strategy validated on device

### Gap 6: Performance

**Status: No optimization work done.**

What is MISSING:
- No bundle size analysis (Phaser alone is ~1MB)
- No code splitting beyond Vite's automatic chunking
- No lazy loading of assessment modules (all 64 are statically imported via index.ts barrel exports)
- No route-based splitting for scenes
- No asset loading strategy for stimulus content (images, audio)
- No profiling of CCI/AutoMode computation cost per tick

### Gap 7: Invariant Verification Depth

**Status: `scripts/check-invariants.ts` verifies minimal structural properties only.**

What it currently checks (8 assertions):
1. `bootRegistries()` does not throw
2. `allModuleKeys` is a callable function
3. `createRegistry([])` returns valid structure
4. 5 enum arrays are non-empty

What it DOES NOT check:
- Whether all 64 assessment modules are registered and discoverable at runtime
- Whether every module's task types have a corresponding renderer
- Whether module `measures` arrays match `scoringRubric.dimensionWeights` keys
- Whether `driveProbes` reference valid task types
- Whether no orphan modules exist (modules not reachable from any registry)
- Whether lifecycle state transitions are exhaustively handled

---

## Next Development Priorities

### Priority 1: Content Authoring (64 modules need real stimulus content)

**Rationale:** The assessment system architecture is complete, but the actual player experience depends on rich, psychologically grounded content. Without real stimuli, the game cannot function as a developmental assessment tool.

**What needs doing:**
- Translate the 512 concept-draft game descriptions (in `docs/concept-drafts/{line}/{stage}/`) into concrete stimulus libraries
- Create scenario narratives for all scenario-type tasks (not just parameter skeletons)
- Define concrete dilemma texts with branching consequences for all moral/interpersonal/intrapersonal dilemma tasks
- Create emotion stimulus descriptions (facial expressions, vocal tones, body language descriptions) for emotional line modules
- Write n-back stimulus sets appropriate to each stage's cognitive complexity
- Design somatic tasks with concrete body-awareness prompts (beyond parameter placeholders)
- Author LLM dialogue prompts that are psychologically sophisticated for all 64 modules

**Scope:** 64 modules, each needing 3-5 tasks fleshed out with real content. Roughly 250-300 individual task content items.

**Key files:**
- `src/core/assessments/{line}/{stage}.ts` (all 64 modules)
- `docs/concept-drafts/{line}/{stage}/` (source material for content)

### Priority 2: LLM Integration (scoring pipeline for depth/coherence/integration)

**Rationale:** Approximately 30% of assessment tasks are `llm_dialogue` type and many scenario tasks require LLM scoring for dimensions like depth, coherence, and integration. Without this, the system cannot assess higher-stage capacities (Green through White) which are inherently language-based and cannot be reduced to deterministic rubrics.

**What needs doing:**
- Implement a real `LLMClient` with at least one provider (OpenAI or Anthropic)
- Build the scoring endpoint: takes (task, response, rubric_string) -> scored dimensions
- Wire `scoring.ts` mode router to call LLM scoring when task `measures` include depth/coherence/integration
- Implement streaming for long-form dialogue tasks
- Add rate limiting, retry logic, and cost tracking
- Create fallback scoring (simplified rubric-based) when LLM is unavailable
- Test scoring consistency across repeated evaluations of identical responses

**Key files:**
- `src/infra/llm/LLMClient.ts` (needs real implementation)
- `src/core/assessments/scoring.ts` (needs LLM path)
- `src/infra/llm/contracts/` (needs expansion for all scoring dimensions)

### Priority 3: Testing Depth (integration tests exercising assessment flow)

**Rationale:** The engine layer is well-tested (8 test files, all passing) but the assessment modules themselves, which are the core product, have zero test coverage. A bug in a scoring rubric or task parameterisation silently corrupts developmental assessment results.

**What needs doing:**
- Unit tests for at least one module per line (8 modules) verifying scoring produces valid ranges
- Integration test: full assessment flow from module selection through scoring through CCI update
- Property-based tests for CCI normalisation (output always in [0,1], monotonic with input quality)
- Mock-provider tests for LLM pipeline (ContextPipeline transforms, VeilFilter strips correctly)
- Renderer tests with Phaser scene mocking (task presented, input collected, result returned)
- Regression tests for known-good scoring outputs (golden file approach)

**Key files:**
- `tests/engines/` (existing pattern to follow)
- `tests/integration/FullSession.test.ts` (existing integration test pattern)
- New: `tests/assessments/` directory

### Priority 4: Rendering Polish (animations, transitions, accessibility pass)

**Rationale:** The assessment system requires sustained player engagement. Poor UX leads to disengagement, which corrupts assessment validity (low engagement produces unreliable signal). Rendering quality directly affects data quality.

**What needs doing:**
- Per-stage color theming (Infrared=deep red, Magenta=magenta, Red=red, Amber=warm amber, Orange=orange, Green=green, Turquoise=teal, White=white/silver)
- Transition animations between task states (fade-in, slide, pulse for correct/incorrect)
- Progress indicators (trials remaining, session progress, confidence meter)
- Sound design: ambient stage-appropriate tones, subtle feedback sounds
- Responsive layouts: mobile-first design with breakpoints for tablet/desktop
- Full accessibility audit: ARIA roles, keyboard navigation, high-contrast mode, screen reader flow
- Drive-health visualization in the UI (the 4-drive radar chart)

**Key files:**
- `src/game/assessments/renderers/*.ts` (all 8 renderers)
- `src/game/assessments/AssessmentScene.ts`
- `src/game/accessibility/` (all 3 files)
- `src/game/scenes/RadialChartScene.ts`

### Priority 5: Native Build (Capacitor Android sync and APK)

**Rationale:** The game's primary target is mobile (intimate, personal developmental tool). Desktop/web is secondary. Native performance, offline support, and device-specific features (haptics for somatic tasks, accelerometer, etc.) are essential.

**What needs doing:**
- Run `npx cap sync android` to generate the Android project
- Configure Android manifest (permissions, orientation, status bar)
- Build and test APK on device/emulator
- Implement offline-first storage strategy (assessment results cached locally, synced when online)
- Add haptic feedback integration for somatic task renderers
- Test on multiple screen sizes (phone 5" through tablet 10")
- Configure iOS project (post-Android validation)

**Key files:**
- `capacitor.config.json`
- `src/infra/native/` (native bridge)
- `src/infra/persistence/` (storage layer)
- New: `android/` directory (generated by cap sync)

### Priority 6: Performance (bundle size, lazy loading, code splitting)

**Rationale:** With 64 assessment modules, 8 renderers, 12 scenes, and Phaser 3, the bundle will be large without optimization. Mobile networks and low-end devices require attention to bundle size and runtime performance.

**What needs doing:**
- Bundle analysis: measure current output size, identify largest chunks
- Lazy load assessment modules (only load the module needed for current encounter)
- Route-based code splitting for Phaser scenes (only load scene code when navigating to it)
- Lazy load renderers (only load the renderer matching the current task type)
- Tree-shake unused Phaser subsystems if possible
- Profile CCI/AutoMode computation: ensure tick() completes in <16ms
- Asset loading strategy: preload next likely module, defer distant ones
- Consider WASM for computationally heavy scoring paths

**Key files:**
- `vite.config.ts` (splitting configuration)
- `src/core/assessments/{line}/index.ts` (barrel exports that defeat tree-shaking)
- `src/game/assessments/AssessmentScene.ts` (renderer loading)
- `src/game/main.ts` (scene registration)

### Priority 7: Extended Invariants (build-time verification of module completeness)

**Rationale:** With 64 modules, 8 renderers, 4 scoring modes, and 4 drive probes per module, there are 1000+ structural relationships that can silently break. The current invariant script checks only 8 basic assertions. A comprehensive check prevents regressions.

**What needs doing:**
- Verify all 64 modules are registered and discoverable (import all index.ts, count entries)
- Verify every task `type` has a corresponding renderer mapping in AssessmentScene
- Verify every module's `measures` array entries match `scoringRubric.dimensionWeights` keys
- Verify every `driveProbe` task `type` is a valid task type
- Verify scoring rubric `passThreshold` is in (0, 1] for all modules
- Verify `minimumTrials` <= total task count for all modules
- Verify no two modules share the same task `id` (uniqueness check)
- Verify lifecycle state transitions are exhaustive (every state has at least one exit path)

**Key files:**
- `scripts/check-invariants.ts` (extend this)
- `src/core/assessments/{line}/index.ts` (module barrel exports)
- `src/game/assessments/AssessmentScene.ts` (renderer mapping)

---

## Development Process

All contributions follow the protocol defined in [AGENTS.md](./AGENTS.md):

1. **Theory first**: R&D documentation must be correct before concept-drafts are written
2. **Concept-drafts before code**: No assessment module code without a corresponding concept-draft in `docs/concept-drafts/{line}/{stage}/`
3. **Build + test before commit**: All code must pass `npm run build` (invariants + typecheck + vite build) and `npm test` (vitest)
4. **Three-layer separation**: `src/core/` has zero I/O dependencies; `src/infra/` implements I/O; `src/game/` owns Phaser
5. **Uniqueness principle**: Every file covers a unique lateral - no redundant content across modules

For full contribution protocol, development cycle, and theoretical commitments, see [AGENTS.md](./AGENTS.md).

# IMPLEMENTATION-PLAN.md — From R&D to Playable Game

> **Status:** Active. This document is the binding implementation roadmap.
> **Supersedes:** The existing `src/` scaffold is the *seed*; this plan specifies how to grow it into the full architecture described in `foundations/21` (Incarnation Architecture).
> **Language:** TypeScript (strict mode). **Renderer:** Phaser 3. **Targets:** Web + Android (Capacitor).

---

## Overview

The R&D documentation set (25 foundation docs + 512 concept-drafts) specifies *what* the game is. This document specifies *how to build it* — in what order, with what interfaces, tested how.

### The Three Layers (unchanged from MVP-BLUEPRINT §4)

```
src/
├── core/       ← Pure TypeScript. No Phaser, no I/O, no network.
│               Runs in Node, in Vitest, in the browser, anywhere.
│               THIS IS WHERE THE BRAIN LIVES.
│
├── infra/      ← I/O adapters: persistence, LLM client, crypto, native bridges.
│               Implements interfaces defined in core/.
│
└── game/       ← Phaser 3 scenes that VISUALISE the core.
                The rendering layer. Consumes core/ via events.
```

### The Build Phases

| Phase | What | Duration estimate | Exit criteria |
|---|---|---|---|
| **A** | Core engine (pure TS, no rendering) | 2-3 weeks | All 5 engines pass unit tests; game loop runs headless |
| **B** | Integration + persistence | 1 week | Save/load works; concept-draft index parsed; engines wired |
| **C** | LLM manifest layer | 2 weeks | Language-Reflective modality generates content from concept-drafts |
| **D** | Red stage vertical slice | 3-4 weeks | 30 encounters playable end-to-end with Phaser rendering |
| **E** | Polish + deploy | 1-2 weeks | Web + Android deploy; accessibility pass; telemetry encrypted |

---

## Phase A: The Core Engine

**Goal:** Build the 5 runtime engines as pure functions with full test coverage. No Phaser. No LLM. No UI. Just the brain.

### A.1 — Domain Models (refactor existing)

The existing `src/core/domain/PlayerProfile.ts` is a good start but needs expansion to match `foundations/16`.

| File | What to build | Spec source |
|---|---|---|
| `core/domain/Significator.ts` | Replace `PlayerProfile` with the full Significator model: per-line altitudes, drive-state, shadow-ledger, polarity state (4-level), theta-decay timestamps, transformation-history, distortion-ledger | foundations/16 §2, §9 |
| `core/domain/PolarityTrace.ts` | Per-encounter polarity trace: drive-directionality, energetic-direction, stage-orientation, source-of-nourishment | foundations/19 §4.1 |
| `core/domain/PolarityCellVector.ts` | Per-cell (line×stage) aggregated polarity: dominant-pattern, exploratory-breadth, coherence, crystallization, texture-id | foundations/19 §4.2 |
| `core/domain/Holon.ts` | The Holon record: id, kind, line-stage-signature, drive-state, shadow-state, polarity, PESTLE, relationships, narrative-role, llm-metadata | foundations/22 §2 |
| `core/domain/EncounterSpec.ts` | The scheduler's output: module-ref, modality, holon-source, shadow-target, polarity-mode, difficulty, session-position | foundations/24 §9 |
| `core/domain/ConsequenceRecord.ts` | Encounter output: affected-holons, state-deltas, polarity-delta, shadow-signal, narrative-summary | foundations/22 §7 |
| `core/domain/ShadowLedger.ts` | Shadow entries: quadrant, line, stage, surfaced-at, resolved-at, recurrence-count, compound-partner | foundations/16 §3 |
| `core/domain/enums.ts` | Shared enums: Line, Stage, Modality, Drive, Ray, ShadowQuadrant, HolonKind, PolarityMode, EnergeticDirection, SourceOfNourishment | all docs |

**Test criteria:** All interfaces compile. Factory functions produce valid instances. Serialization round-trips.

### A.2 — Theta-Decay Engine

Pure function: given last-encounter timestamps per line×stage, compute staleness scores.

| File | Interface |
|---|---|
| `core/engines/ThetaDecay.ts` | `computeStaleness(timestamps: Record<string, number>, now: number, params: ThetaParams): Record<string, number>` |

**Params** (from concept-draft module-specs): half-life, max-decay per line×stage.
**Output:** staleness score 0.0–1.0 per cell. Above threshold = bleed-through trigger.
**Test:** Given known timestamps and half-lives, verify exponential decay curve. Verify bleed-through threshold detection.

### A.3 — Polarity Engine

Pure functions for the 4-level aggregation model.

| File | Functions |
|---|---|
| `core/engines/PolarityEngine.ts` | `recordTrace(state: PolarityState, trace: PolarityTrace, cell: {line, stage}): PolarityState` |
| | `computeCellCoherence(cell: PolarityCellVector): number` |
| | `computeLineProfile(cells: PolarityCellVector[]): LineProfile` |
| | `computeMasterPolarity(profiles: LineProfile[]): MasterPolarity` |
| | `detectCrystallizationMode(master: MasterPolarity): PolarityMode` |

**Test:** Given a sequence of traces, verify aggregation produces expected coherence. Verify crystallization threshold detection. Verify exploration→crystallizing→crystallized transitions.

### A.4 — Encounter Scheduler

Replace the existing 60-line `EncounterScheduler.ts` with the full algorithm from `foundations/24`.

| File | Functions |
|---|---|
| `core/engines/EncounterScheduler.ts` | `scheduleNext(sig: Significator, world: WorldState, session: SessionContext): EncounterSpec[]` |
| `core/engines/PriorityComputation.ts` | `computePriority(candidate: EncounterCandidate, sig: Significator, world: WorldState, session: SessionContext): number` |
| `core/engines/CandidateGeneration.ts` | `generateCandidates(sig: Significator, world: WorldState): EncounterCandidate[]` |

**Priority formula** (from foundations/24 §3.2):
```
priority = 0.25 * theta_urgency
         + 0.20 * shadow_activation
         + 0.15 * polarity_alignment
         + 0.15 * transformation_readiness
         + 0.10 * drive_correction
         + 0.10 * narrative_coherence
         + 0.05 * session_fit
```

**Test:** Given a known Significator state with one decayed line, verify that line's encounters rank highest. Given an active shadow, verify shadow-targeting encounters are boosted. Given crystallizing polarity, verify deepening encounters are preferred.

### A.5 — Consequence Engine

Pure function: given encounter outcome, compute state mutations.

| File | Functions |
|---|---|
| `core/engines/ConsequenceEngine.ts` | `processOutcome(spec: EncounterSpec, response: PlayerResponse): ConsequenceRecord` |
| | `applyConsequences(sig: Significator, world: WorldState, record: ConsequenceRecord): { sig: Significator, world: WorldState }` |

**Test:** Given a choice classified as STO-radiative, verify polarity trace is recorded correctly. Given a shadow-surfacing without resolution, verify shadow-ledger entry created. Given a shadow-integration, verify ledger entry resolved.

### A.6 — Transformation Detector

Pure function: given Significator state, detect whether transformation threshold is crossed.

| File | Functions |
|---|---|
| `core/engines/TransformationDetector.ts` | `detectThreshold(sig: Significator): TransformationSignal | null` |
| | `computeReadiness(sig: Significator, targetStage: Stage): ReadinessReport` |

**Threshold formula** (from foundations/17 §2):
- Convergence: ≥N lines at edge of next stage (N varies by stage)
- Saturation: sufficient catalyst processed at current stage
- Shadow-clearance: no critical unresolved shadows blocking

**Test:** Given a Significator with 6/8 lines at Red-edge, verify threshold detected for Red→Amber. Given unresolved critical shadow, verify threshold blocked.

### A.7 — Game Loop (headless)

Wire the 5 engines into a single game-loop function that can run without rendering.

| File | Interface |
|---|---|
| `core/GameLoop.ts` | `tick(sig: Significator, world: WorldState, session: SessionContext): { encounter: EncounterSpec, sig: Significator, world: WorldState }` |

**Test:** Run 100 ticks with a simulated player making random choices. Verify: no crashes, polarity accumulates, theta-decay triggers, shadows surface, transformation eventually fires.

---

## Phase B: Integration + Persistence

### B.1 — Concept-Draft Index

Parse the 512 `.md` files into a machine-readable index the scheduler can query.

| File | What |
|---|---|
| `core/data/ConceptDraftIndex.ts` | Parse module-spec.md → scoring params, shadow archetypes, compound shadows |
| `core/data/GameFileIndex.ts` | Parse game files → modality, item-pool counts, technical requirements |
| `scripts/build-concept-index.ts` | Build-time script that generates `concept-drafts.json` from the .md files |

**Output:** A JSON file mapping `{line}×{stage}×{modality}` → structured encounter template data.

### B.2 — Holon Registry

Populate the world with initial holons for the Red stage.

| File | What |
|---|---|
| `core/data/HolonRegistry.ts` | Registry of all active holons with CRUD operations |
| `core/data/red-layer-holons.json` | Initial Red-layer holons: The Conqueror, allies, side-NPCs, factions |

### B.3 — Persistence Layer

Extend existing `infra/persistence/` to handle the full Significator.

| File | What |
|---|---|
| `infra/persistence/SignificatorStore.ts` | Encrypted save/load of Significator state |
| `infra/persistence/WorldStateStore.ts` | Save/load of holon registry + world PESTLE state |
| `infra/persistence/MigrationEngine.ts` | Schema versioning for save-file forward-compatibility |

### B.4 — Event Bus

Connect core engines to the game layer via typed events.

| File | What |
|---|---|
| `core/events/GameEvents.ts` | Typed event definitions: `encounter_scheduled`, `encounter_completed`, `shadow_surfaced`, `transformation_triggered`, etc. |
| `core/events/EventBus.ts` | Pub/sub bus that core engines emit to and game layer subscribes to |

---

## Phase C: LLM Manifest Layer

### C.1 — Context Aggregation Pipeline

Implement the 7-step pipeline from `foundations/22 §4`.

| File | What |
|---|---|
| `infra/llm/ContextPipeline.ts` | Assembles LLM system prompt from: holon selection → significator injection → encounter spec → frequency conditioning → modality rubric → consequence context → final assembly |
| `infra/llm/FrequencyConditioner.ts` | Generates voice/register specs from line×stage signatures |
| `infra/llm/VeilFilter.ts` | Strips Veil-violating content from both input (to LLM) and output (from LLM) |

### C.2 — Modality Contracts

Implement the 7 modality contracts. Start with Language-Reflective (most LLM-dependent).

| File | What |
|---|---|
| `infra/llm/contracts/LanguageReflective.ts` | Full contract: prompt template, scoring rubric, generation constraints, fallback |
| `infra/llm/contracts/ScenarioChoice.ts` | Branching scenario generation within authored templates |
| `infra/llm/contracts/DeterministicFraming.ts` | Narrative framing only (task mechanics are fixed code) |
| `infra/llm/contracts/index.ts` | Contract registry keyed by Modality enum |

### C.3 — Consequence Parser

Parse LLM output into structured ConsequenceRecords.

| File | What |
|---|---|
| `infra/llm/ConsequenceParser.ts` | Extract structured data from LLM response; validate against schema; reject invalid |

### C.4 — Fallback System

When LLM is unavailable, serve pre-authored content.

| File | What |
|---|---|
| `infra/llm/FallbackProvider.ts` | Per-modality fallback content drawn from concept-drafts |

---

## Phase D: Red Stage Vertical Slice

### D.1 — Red Layer World

| Task | What |
|---|---|
| Red-layer holons | 30+ NPCs/groups with line×stage signatures, drive profiles |
| Red PESTLE | Political (warlords), Economic (plunder), Social (might=right), Tech (weapons), Legal (none), Environmental (harsh) |
| The Conqueror | Main boss: 4-quadrant phased fight, authored script |
| Red allies | 1-2 companion NPCs with their own developmental arcs |

### D.2 — 30 Encounters (Red × 8 lines × ~4 modalities)

| Line | Encounters | Modalities covered |
|---|---|---|
| Cognitive | 4 | Deterministic, Strategic, Immersive-RPG, Language-Reflective |
| Emotional | 4 | Scenario-Choice, Embodied, Social-Cooperative, Immersive-RPG |
| Moral | 4 | Scenario-Choice, Language-Reflective, Social-Cooperative, Immersive-RPG |
| Intrapersonal | 3 | Language-Reflective, Scenario-Choice, Immersive-RPG |
| Spiritual | 3 | Language-Reflective, Scenario-Choice, Immersive-RPG |
| Somatic | 4 | Embodied, Deterministic, Strategic, Immersive-RPG |
| Willpower | 4 | Deterministic, Strategic, Embodied, Immersive-RPG |
| Interpersonal | 4 | Social-Cooperative, Scenario-Choice, Language-Reflective, Immersive-RPG |

Each encounter: authored template (from concept-drafts/*/03-red/*) + LLM surface generation.

### D.3 — Phaser Scenes

| Scene | What |
|---|---|
| `WorldScene` | The Red layer rendered. Player avatar. NPC placement. Environment. |
| `EncounterScene` | Generic encounter container. Loads modality-specific sub-scene. |
| `BattleScene` | ATB combat (refactor existing). Cognitive overlays. |
| `ReflectionScene` | Language-Reflective encounters. Text input + LLM response. |
| `DilemmaScene` | Scenario-Choice encounters. Branching dialogue. |
| `JournalScene` | Player codex. Vow system. Felt-sense feedback. |

### D.4 — Onboarding (refactor existing)

The existing onboarding probes are good. Wire them into the new Significator model so they produce initial altitude estimates that feed the scheduler.

### D.5 — The Conqueror Boss Fight

4-quadrant phased fight per MVP-BLUEPRINT. Each phase exercises a different quadrant:
- UL: Empath Read, Witness Pause
- UR: Echo Cast, Reflex Dodge
- LL: Attune (companion coordination)
- LR: Resource/terrain decisions

---

## Phase E: Polish + Deploy

### E.1 — Accessibility
- WCAG 2.1 AA on all UI
- Reduced-motion mode
- Patience mode for somatic timing
- Screen reader support for text-heavy encounters

### E.2 — Telemetry
- Encrypted at rest (existing CryptoStore)
- Opt-in sync only
- No PII leaves device
- Developmental report available on player request (post-Veil)

### E.3 — Deploy
- Web: Vite production build → static hosting
- Android: Capacitor sync → Play Store
- CI: All invariants checked at build time

---

## File Structure (target state after Phase D)

```
src/
├── core/
│   ├── domain/
│   │   ├── Significator.ts          ← The vessel (replaces PlayerProfile)
│   │   ├── PolarityTrace.ts         ← Per-encounter polarity record
│   │   ├── PolarityCellVector.ts    ← Per-cell aggregated polarity
│   │   ├── Holon.ts                 ← World entity
│   │   ├── EncounterSpec.ts         ← Scheduler output
│   │   ├── ConsequenceRecord.ts     ← Encounter output
│   │   ├── ShadowLedger.ts          ← Shadow tracking
│   │   └── enums.ts                 ← All shared enums
│   │
│   ├── engines/
│   │   ├── ThetaDecay.ts            ← Staleness computation
│   │   ├── PolarityEngine.ts        ← 4-level polarity aggregation
│   │   ├── EncounterScheduler.ts    ← Priority-based encounter selection
│   │   ├── PriorityComputation.ts   ← The weighted formula
│   │   ├── CandidateGeneration.ts   ← Eligible encounter filtering
│   │   ├── ConsequenceEngine.ts     ← Outcome → state mutations
│   │   └── TransformationDetector.ts← Threshold detection
│   │
│   ├── data/
│   │   ├── ConceptDraftIndex.ts     ← Parsed concept-draft data
│   │   ├── HolonRegistry.ts         ← World entity registry
│   │   ├── PolarityOntology.ts      ← 64-cell texture catalogue (from doc 23)
│   │   └── red-layer-holons.json    ← Initial Red world data
│   │
│   ├── events/
│   │   ├── GameEvents.ts            ← Typed event definitions
│   │   └── EventBus.ts              ← Pub/sub
│   │
│   ├── registries/                   ← (existing, extended)
│   ├── usecases/                     ← (existing tasks, staircase, etc.)
│   ├── GameLoop.ts                   ← Headless game loop
│   └── index.ts
│
├── infra/
│   ├── llm/
│   │   ├── LLMClient.ts             ← (existing, extended)
│   │   ├── ContextPipeline.ts       ← 7-step context assembly
│   │   ├── FrequencyConditioner.ts  ← Voice/register from line×stage
│   │   ├── VeilFilter.ts            ← Input/output Veil enforcement
│   │   ├── ConsequenceParser.ts     ← Structured output extraction
│   │   ├── FallbackProvider.ts      ← Offline/failure fallbacks
│   │   └── contracts/
│   │       ├── LanguageReflective.ts
│   │       ├── ScenarioChoice.ts
│   │       ├── DeterministicFraming.ts
│   │       └── index.ts
│   │
│   ├── persistence/
│   │   ├── SignificatorStore.ts      ← Encrypted Significator save/load
│   │   ├── WorldStateStore.ts        ← World state persistence
│   │   ├── MigrationEngine.ts       ← Schema versioning
│   │   └── (existing files)
│   │
│   └── (existing: crypto, i18n, native)
│
├── game/
│   ├── scenes/
│   │   ├── WorldScene.ts            ← Red layer world
│   │   ├── EncounterScene.ts        ← Generic encounter container
│   │   ├── BattleScene.ts           ← (existing, refactored)
│   │   ├── ReflectionScene.ts       ← Language-Reflective UI
│   │   ├── DilemmaScene.ts          ← Scenario-Choice UI
│   │   ├── JournalScene.ts          ← Codex + vows
│   │   └── (existing scenes)
│   │
│   ├── onboarding/                   ← (existing, wired to new Significator)
│   └── (existing: ui, objects, config)
│
└── tests/
    ├── engines/
    │   ├── ThetaDecay.test.ts
    │   ├── PolarityEngine.test.ts
    │   ├── EncounterScheduler.test.ts
    │   ├── ConsequenceEngine.test.ts
    │   └── TransformationDetector.test.ts
    ├── integration/
    │   ├── GameLoop.test.ts          ← 100-tick headless simulation
    │   └── ConceptDraftIndex.test.ts
    └── (existing tests)
```

---

## Implementation Sequence (atomic tasks)

### Week 1: Domain + Theta-Decay + Polarity

| # | Task | File(s) | Test |
|---|---|---|---|
| 1 | Define all enums | `core/domain/enums.ts` | Compiles |
| 2 | Define PolarityTrace interface | `core/domain/PolarityTrace.ts` | Compiles |
| 3 | Define PolarityCellVector interface | `core/domain/PolarityCellVector.ts` | Compiles |
| 4 | Define ShadowLedger types | `core/domain/ShadowLedger.ts` | Compiles |
| 5 | Define Significator interface (full) | `core/domain/Significator.ts` | Compiles; factory produces valid instance |
| 6 | Define Holon interface | `core/domain/Holon.ts` | Compiles |
| 7 | Define EncounterSpec interface | `core/domain/EncounterSpec.ts` | Compiles |
| 8 | Define ConsequenceRecord interface | `core/domain/ConsequenceRecord.ts` | Compiles |
| 9 | Implement ThetaDecay engine | `core/engines/ThetaDecay.ts` | Exponential decay verified; threshold detection works |
| 10 | Implement PolarityEngine (recordTrace) | `core/engines/PolarityEngine.ts` | Trace recorded; cell vector updated |
| 11 | Implement PolarityEngine (aggregation) | `core/engines/PolarityEngine.ts` | Cell→line→master aggregation correct |
| 12 | Implement PolarityEngine (crystallization) | `core/engines/PolarityEngine.ts` | Mode transitions detected |

### Week 2: Scheduler + Consequence + Transformation

| # | Task | File(s) | Test |
|---|---|---|---|
| 13 | Implement CandidateGeneration | `core/engines/CandidateGeneration.ts` | Filters by layer-perception, cooldown, narrative gates |
| 14 | Implement PriorityComputation | `core/engines/PriorityComputation.ts` | Weighted formula produces expected rankings |
| 15 | Implement EncounterScheduler (full) | `core/engines/EncounterScheduler.ts` | Top-ranked encounter matches expected for known state |
| 16 | Implement ConsequenceEngine | `core/engines/ConsequenceEngine.ts` | State mutations correct for STO/STS/shadow outcomes |
| 17 | Implement TransformationDetector | `core/engines/TransformationDetector.ts` | Threshold detection; blocking by unresolved shadows |
| 18 | Wire GameLoop (headless) | `core/GameLoop.ts` | 100-tick simulation runs without crash |

### Week 3: Integration + Persistence + Concept Index

| # | Task | File(s) | Test |
|---|---|---|---|
| 19 | Build concept-draft parser script | `scripts/build-concept-index.ts` | Parses all 512 files; outputs valid JSON |
| 20 | Implement ConceptDraftIndex | `core/data/ConceptDraftIndex.ts` | Queries by line×stage×modality return correct data |
| 21 | Implement PolarityOntology data | `core/data/PolarityOntology.ts` | 64 cells with texture names from doc 23 |
| 22 | Implement HolonRegistry | `core/data/HolonRegistry.ts` | CRUD operations; query by kind/altitude |
| 23 | Create red-layer-holons.json | `core/data/red-layer-holons.json` | Valid holon records for Red layer |
| 24 | Implement SignificatorStore | `infra/persistence/SignificatorStore.ts` | Save/load round-trip; encryption verified |
| 25 | Implement WorldStateStore | `infra/persistence/WorldStateStore.ts` | Save/load round-trip |
| 26 | Implement EventBus | `core/events/EventBus.ts` | Pub/sub works; typed events |

### Week 4-5: LLM Layer

| # | Task | File(s) | Test |
|---|---|---|---|
| 27 | Implement ContextPipeline | `infra/llm/ContextPipeline.ts` | Produces valid system prompt from known inputs |
| 28 | Implement FrequencyConditioner | `infra/llm/FrequencyConditioner.ts` | Different line×stage produce different voice specs |
| 29 | Implement VeilFilter | `infra/llm/VeilFilter.ts` | Strips prohibited content from input and output |
| 30 | Implement LanguageReflective contract | `infra/llm/contracts/LanguageReflective.ts` | Generates valid prompt; scores response |
| 31 | Implement ScenarioChoice contract | `infra/llm/contracts/ScenarioChoice.ts` | Generates branching scenario within template |
| 32 | Implement ConsequenceParser | `infra/llm/ConsequenceParser.ts` | Extracts structured data from LLM response |
| 33 | Implement FallbackProvider | `infra/llm/FallbackProvider.ts` | Returns valid fallback per modality |

### Week 6-9: Red Stage Content + Phaser

| # | Task | File(s) | Test |
|---|---|---|---|
| 34 | Author 30 Red encounter templates | `core/data/encounters/red/` | Valid EncounterSpec per encounter |
| 35 | Implement WorldScene | `game/scenes/WorldScene.ts` | Red layer renders; player moves; NPCs visible |
| 36 | Implement EncounterScene | `game/scenes/EncounterScene.ts` | Loads correct sub-scene per modality |
| 37 | Refactor BattleScene for new domain | `game/scenes/BattleScene.ts` | ATB works with new Significator model |
| 38 | Implement ReflectionScene | `game/scenes/ReflectionScene.ts` | Text input → LLM → response displayed |
| 39 | Implement DilemmaScene | `game/scenes/DilemmaScene.ts` | Branching choices → consequences recorded |
| 40 | Wire onboarding to Significator | `game/onboarding/` | Probes produce initial Significator state |
| 41 | Implement The Conqueror boss | `core/data/encounters/red/conqueror.ts` | 4-quadrant phased fight works |
| 42 | End-to-end playtest | — | Player can: onboard → explore → encounter → progress → boss |

---

## Key Design Decisions (locked)

| Decision | Rationale |
|---|---|
| Significator replaces PlayerProfile | The old model lacks polarity, shadow-ledger, transformation-history, theta-decay timestamps |
| Engines are pure functions | Testable, deterministic, portable. No side effects. State in, state out. |
| Scheduler uses weighted priority formula | Implementable, tunable, debuggable. Weights are config, not code. |
| Polarity is 4-level, not scalar | Prevents unilateral moral system; grounds in concept-draft ontology |
| LLM is manifest layer, not brain | The scheduler decides WHAT; the LLM decides HOW to present it |
| Concept-drafts are parsed at build time | No runtime .md parsing; fast startup; validated at CI |
| Existing scaffold is preserved and extended | Don't rewrite what works (tasks, staircase, ATB, onboarding probes) |

---

## Success Criteria (MVP Launch Gate)

From MVP-BLUEPRINT §7, updated with greater-cycle requirements:

1. ✅ All 8 registries instantiated with ≥1 entry each
2. ✅ Adaptive onboarding produces valid Significator within ±1 stage
3. ✅ Red stage content-complete (≥30 encounters across 8 lines)
4. ✅ All 4 quadrants exercised in Conqueror fight
5. ✅ Law-of-One layer integrated (rays, palettes, codex)
6. ✅ Web + Android deploy
7. ✅ ≥90% test coverage on core/ engines
8. ✅ Anti-frustration backstop working
9. ✅ Telemetry encrypted, opt-in only
10. ✅ Accessibility compliant (WCAG 2.1 AA)
11. ✅ Polarity engine running (traces recorded, no crystallization forced)
12. ✅ Theta-decay triggers bleed-through encounters
13. ✅ Encounter scheduler uses full priority formula
14. ✅ Veil enforced (no meta-information in player-facing UI)
15. ✅ LLM fallbacks work offline
16. ✅ Plugin contract proven (at least one post-MVP content drop simulated)

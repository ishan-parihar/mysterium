# Architecture Overview

> **Cross-references:** [[docs/architecture/10-stage-assessment-architecture|Stage Assessment Architecture]] · [[docs/foundations/20-veil-of-forgetting|20 — Veil Of Forgetting]] · [[docs/foundations/21-incarnation-architecture|21 — Incarnation Architecture]] · [[docs/foundations/30-holonic-curriculum-architecture|30 — Holonic Curriculum Architecture]]

## 1. Purpose

The binding architectural contract for Mysterium. This document describes how the 64-module system, curriculum, shadow work, polarity engine, and LLM integration compose into a working contemplative practice.

## 2. Scientific basis

The architecture is grounded in:
- Clean architecture (Martin 2017) — core/ has zero external dependencies
- The AQAL framework — four quadrants, eight stages, eight lines
- The assessment module contract (architecture/10-stage-assessment-architecture.md)
- The holonic curriculum architecture (foundations/30)

## 3. Game-design mapping

The architecture supports six distinct-but-fused functions:

| Function | Primary engines | Scale |
|---|---|---|
| Developmental Assessment | AgenticOrchestrator, TaskRenderers, ItemSelection | Micro (per-encounter) |
| Holonic Curriculum | CurriculumEngine, DepthAssessment, SpacedRepetition | Meso (knowledge acquisition) |
| Shadow Work | ShadowDetector, ConsequenceEngine, ShadowContentGenerator | Micro (per-shadow) |
| Polarity & Choice | PolarityEngine, PolarityTrace, STO/STS crystallization | Macro (lifetime arc) |
| Incarnation Architecture | WorldState, EncounterScheduler, MacroCatalystEngine | Macro (world-system) |
| Veil of Forgetting | VeilFilter, FallbackProvider, qualitative descriptors | Meta (experiential) |

## 4. Architectural contract

### 4.1 The core/ rule

`src/core/` imports from no game engine, no native bridge, no networking library. It is pure TypeScript. The core contains:
- `src/core/engines/` — 10+ engines (CCI, ThetaDecay, PolarityEngine, MacroCatalyst, TransformationDetector, AutoModeStrategy, EncounterScheduler, ConsequenceEngine, ShadowContentGenerator, CandidateGeneration, PriorityComputation)
- `src/core/assessments/` — AgenticOrchestrator, TaskRenderers, ItemSelection
- `src/core/curriculum/` — CurriculumLinter, LearningAnalytics, AdaptiveDifficulty
- `src/core/data/` — 1,280 assessment items, calibration prompts
- `src/core/domain/` — Significator, Stage, Line, Drive types
- `src/core/presentation/` — Veil descriptors, felt-sense indicators

### 4.2 The infra/ rule

`src/infra/` contains all external integrations:
- `src/infra/llm/` — LLMClient, ProxiedLLMClient, ContextPipeline, templates
- `src/infra/persistence/` — SignificatorStore, WorldStateStore, CryptoStore
- `src/infra/profiles/` — ProfileManager
- `src/infra/telemetry/` — TelemetryStore

### 4.3 The rendering rule

`src/routes/` (SvelteKit WebUI) and `scripts/cli-game.ts` (CLI) are rendering surfaces. They consume the core via the infra layer. The CLI is first-class, not a debug tool.

### 4.4 The data rule

Adding a new line, stage, shadow archetype, curriculum concept, or assessment item is a JSON/TS-data change, not a code change.

## 5. Open questions

- **When does the curriculum "graduate" a player?** The 5-level holarchy scales to ~850 holons. Current seed data has ~50.
- **How many shadow configurations must be operational?** The 4-quadrant model has 256 configurations. What's the minimum viable set?
- **Multiplayer architecture?** Single-player MVP. Post multiplayer is deferred.

## 6. Principles served

Principles **1, 2, 7, 8** — training clarity, validity, codebase honesty, curriculum integrity.

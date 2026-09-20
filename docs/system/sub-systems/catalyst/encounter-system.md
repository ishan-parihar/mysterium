# Encounter System Architecture

## 1. Purpose

Describes the 64-module assessment system, 7 modalities, and the AgenticOrchestrator that executes encounters. This is the "front door" of Mysterium — every player interaction flows through this system.

## 2. Scientific basis

- **64 modules** — Foundations/12: 8 lines × 8 stages, each with unique developmental content
- **7 modalities** — Foundations/11: 7 axes of catalyst delivery (Deterministic, Language-Reflective, Scenario-Choice, Embodied-Somatic, Strategic-Planning, Social-Cooperative, Immersive-RPG)
- **AgenticOrchestrator** — Foundations/22: LLM-driven encounter execution with deterministic fallback

## 3. Game-design mapping

### The 64-Module System

Each module targets a specific (line × stage) cell and contains:
- `tasks: TaskItem[]` — assessment items from the 1,280-item pool
- `modality: Modality` — primary modality for this module
- `depthLevels: DepthLevel[]` — applicable curriculum depth levels
- `shadowConfig: ShadowConfig` — 4-quadrant shadow archetypes for this cell

### The 7 Modalities

Each modality probes different dimensions of the same shadow:

| Modality | What it measures | Task types |
|---|---|---|
| Deterministic | Ground-truth capacity | n_back, stroop, go_no_go, reaction_time |
| Language-Reflective | Verbal metacognition | self_report, free_text |
| Scenario-Choice | Contextual decision-making | dilemma, scenario |
| Embodied-Somatic | Body-as-medium | hold, rhythm, reaction_time |
| Strategic-Planning | Multi-step sequencing | pattern_prediction, planning |
| Social-Cooperative | Relational coordination | cooperation, social_cue |
| Immersive-RPG | Ecological/spontaneous | narrative_choice, exploration |

### AgenticOrchestrator

The central execution engine:
1. Receives encounter from EncounterScheduler
2. Selects task from module's item pool (ItemSelection with difficulty matching)
3. Renders via TaskRenderer (deterministic) or LLM (Language-Reflective)
4. Captures player response
5. Scores via rubric-weighted scoring
6. Passes to ConsequenceEngine for Significator update

Budget: max 2 LLM calls per encounter (hardcoded).

### Item Selection

`ItemSelection.selectNextItem()`:
- 60% difficulty matching (item difficulty ≈ player ability)
- 40% dimension coverage (ensure all capacity dimensions are probed)
- Anti-repetition: tracks usedItemIds per session
- Difficulty bands: Easy (0.3-0.5), Medium (0.5-0.7), Hard (0.7-0.9)

## 4. Architectural contract

- `src/core/assessments/AgenticOrchestrator.ts` — central orchestrator
- `src/core/assessments/cli/TaskRenderers.ts` — deterministic task rendering (CLI surface)
- `src/core/assessments/itemSelection.ts` — adaptive item selection
- `src/core/data/` — 1,280 assessment items across all modules

## 5. Open questions

- **Modality collapse** — 6/8 Red-stage modules get generic n_back fallback when assigned non-matching modalities
- **LLM as narrative wrapper** — LLM wraps deterministic MCQ instead of generating open-ended assessment
- **LLM budget** — max 2 calls per encounter limits complex modalities

## 6. Principles served

Principles **1, 2, 3** — training clarity, validity, growth edge.

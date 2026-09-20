# Curriculum Authoring Guide

> How to author, validate, and integrate curriculum holons into Mysterium.

---

## 1. The Holonic Hierarchy

Every curriculum is a tree of **CurriculumHolons** — self-similar at every level. A holon at any level contains the same five-phase internal structure as a holon at any other level.

### 1.1 Holon Levels

| Level | Purpose | Example |
|---|---|---|
| `program` | Top-level academic program | "Computer Science" |
| `degree` | Degree tier | "B.S. Computer Science" |
| `course` | Individual course | "CS101: Intro to Programming" |
| `module` | Course module / unit | "Algorithms Module" |
| `unit` | Teaching unit within a module | "Sorting Algorithms" |
| `lesson` | Individual lesson | "Quicksort" |
| `branch` | Top-level domain branch (legacy) | "cs.foundations" |
| `subject` | Domain subject (legacy) | "cs.foundations.algorithms" |
| `topic` | Topic within a subject (legacy) | "cs.foundations.algorithms.sorting" |
| `concept` | Atomic concept (legacy) | "cs.foundations.algorithms.quicksort" |
| `instance` | Concrete exercise / example | "cs.foundations.algorithms.quicksort.ex1" |

**Rule:** Top-level holons (`program`, `branch`) have `parentId: null`. Leaf holons (`concept`, `lesson`, `instance`) must have a parent.

### 1.2 ID Convention

IDs use dot-separated segments that mirror the hierarchy:

```
cs.program.bachelors.algorithms.sorting.quicksort
│     │       │          │          │        │
│     │       │          │          │        └── lesson
│     │       │          │          └── unit
│     │       │          └── module
│     │       └── course
│     └── degree
└── branch prefix
```

**Convention:** The first two segments form the branch key (e.g., `cs.program`).

---

## 2. Prerequisites

### 2.1 Same-Branch Prerequisites

Every holon can declare `prerequisites: string[]` — IDs of holons that must be mastered before this one can be studied.

```json
{
  "id": "cs.foundations.algorithms.mergesort",
  "prerequisites": ["cs.foundations.algorithms.quicksort"]
}
```

**Enforcement:** The `CurriculumLinter` S-1 check verifies all prerequisite IDs exist in the registry. The `CandidateGeneration` engine enforces that prerequisites are at the required depth level before scheduling.

### 2.2 Cross-Branch Prerequisites

When a concept requires knowledge from a different branch:

```json
{
  "id": "cs.foundations.complexity.big-o",
  "crossBranchPrerequisites": ["math.foundations.calculus.limits"]
}
```

**Enforcement:** The `CurriculumLinter` S-1 check also verifies cross-branch prerequisite IDs exist. The D-3 check validates that cross-branch prerequisites have sane depth requirements.

### 2.3 Required Prerequisite Depth

Each holon specifies `requiredPrerequisiteDepth` — the minimum depth level its prerequisites must reach:

```json
{
  "depthMeta": {
    "requiredPrerequisiteDepth": "comprehended",
    "targetDepthRange": { "min": "applied", "max": "transformed" }
  }
}
```

**Rule:** `requiredPrerequisiteDepth` must be strictly less than `targetDepthRange.min`.

### 2.4 Forgetting Curve Parameters

Each holon specifies `forgettingParams` to control spaced repetition behavior:

```json
{
  "forgettingParams": {
    "initialHalfLifeMs": 86400000,
    "halfLifeMultiplier": 2.5,
    "maxHalfLifeMs": 31536000000
  }
}
```

| Parameter | Default | Description |
|---|---|---|
| `initialHalfLifeMs` | 86400000 (1 day) | Retention half-life after first review |
| `halfLifeMultiplier` | 2.5 | Multiplier applied to half-life after each successful retrieval |
| `maxHalfLifeMs` | 31536000000 (1 year) | Upper bound on half-life |

**Override per concept:** Branch-level holons can set `forgettingParams` to customize spaced repetition for their children. If a concept doesn't specify its own params, it inherits from its parent or falls back to `DEFAULT_FORGETTING_PARAMS`.

---

## 3. The Five-Phase Internal Structure

Every holon, regardless of level, contains the same five phases. This is the holonic self-similarity principle — the same structure repeats at every scale.

### 3.1 Phase Definitions

| Phase | Purpose | Assessment Type |
|---|---|---|
| `observation` | Direct encounter with the concept | `factual_recall` |
| `principle` | Abstracting the pattern | `concept_explanation` |
| `application` | Using the concept in context | `application_problem` |
| `integration` | Connecting to other concepts | `analogy_mapping` |
| `creation` | Generating novel work | `creative_synthesis` |

### 3.2 Phase Structure

Each phase has:

```json
{
  "observation": {
    "question": "What patterns do you notice when sorting these elements?",
    "assessmentType": "factual_recall",
    "completionEvidence": "Student can identify at least 2 sorting patterns"
  }
}
```

**Validation:** The `CurriculumLinter` P-1 check verifies all five phases have non-empty `question` and `completionEvidence` fields.

---

## 4. Depth Rubric

Every concept-level holon must have a depth rubric that defines what evidence distinguishes each depth level.

### 4.1 Depth Levels

| Level | Bloom's Equivalent | What It Means |
|---|---|---|
| `memorized` | Remember | Can recall facts |
| `comprehended` | Understand | Can explain in own words |
| `applied` | Apply | Can use in new situations |
| `analyzed` | Analyze | Can break down and compare |
| `evaluated` | Evaluate | Can judge and critique |
| `transformed` | Create | Can generate novel work |

### 4.2 Rubric Structure

```json
{
  "depthRubric": {
    "conceptId": "cs.foundations.algorithms.quicksort",
    "levels": {
      "memorized": {
        "evidence": "Can state the basic steps of quicksort",
        "canDo": ["Recall the pivot selection step"],
        "cannotDo": ["Explain why pivot choice matters"],
        "appropriateTasks": ["factual_recall"],
        "threshold": 0.2
      },
      "comprehended": {
        "evidence": "Can explain how quicksort works to a peer",
        "canDo": ["Describe the divide-and-conquer strategy"],
        "cannotDo": ["Analyze worst-case complexity"],
        "appropriateTasks": ["concept_explanation", "analogy_mapping"],
        "threshold": 0.4
      }
    }
  }
}
```

**Validation:** The `CurriculumLinter` E-2 check verifies all six depth levels have non-empty `evidence`.

---

## 5. Isomorphisms

Structural isomorphisms connect concepts across domains that share deep patterns.

```json
{
  "isomorphisms": [
    {
      "pattern": "divide and conquer",
      "targetConceptId": "math.foundations.calculus.integration",
      "targetDomain": "mathematics",
      "mappingDescription": "Both break a problem into smaller subproblems, solve independently, then combine",
      "limitations": "Quicksort is discrete; integration is continuous"
    }
  ]
}
```

**Validation:** The `CurriculumLinter` S-4 check verifies isomorphism target IDs exist in the registry. The `CandidateGeneration` engine boosts priority for concepts with mastered isomorphisms.

---

## 6. Adding a New Curriculum Branch

### Step 1: Create the JSON file

Create `src/core/curriculum/data/{branch}.json` with an array of `CurriculumHolon` objects.

**Minimum viable branch:**

```json
[
  {
    "id": "physics.foundations",
    "name": "Physics Foundations",
    "description": "The foundational concepts of physics: mechanics, thermodynamics, and electromagnetism.",
    "level": "branch",
    "parentId": null,
    "childIds": ["physics.foundations.mechanics"],
    "phases": { ... },
    "isomorphisms": [],
    "prerequisites": [],
    "devMapping": {
      "primaryLine": "Cognitive",
      "secondaryLines": [],
      "stageRange": { "min": "Orange", max: "Orange" }
    },
    "depthMeta": {
      "requiredPrerequisiteDepth": "absent",
      "targetDepthRange": { "min": "memorized", "max": "transformed" },
      "depthProgression": ["memorized", "comprehended", "applied", "analyzed", "evaluated", "transformed"]
    },
    "forgettingParams": {
      "initialHalfLifeMs": 86400000,
      "halfLifeMultiplier": 2.5,
      "maxHalfLifeMs": 31536000000
    },
    "content": {
      "explanation": "Physics is the study of matter, energy, and their interactions.",
      "examples": ["Newton's laws", "Thermodynamic cycles"],
      "nonExamples": ["Chemical reactions (chemistry)", "Living systems (biology)"],
      "analogies": [],
      "visuals": [],
      "practiceProblems": []
    },
    "misconceptions": [],
    "depthRubric": { ... },
    "supportedModalities": ["LanguageReflective", "Deterministic"]
  }
]
```

### Step 2: Wire into the seed data

Add the import to `src/core/curriculum/CurriculumSeed.ts`:

```typescript
import physicsFoundations from './data/physics.foundations.json' with { type: 'json' };

const SEED_MODULES: CurriculumHolon[] = [
  ...existingModules,
  ...physicsFoundations as unknown as CurriculumHolon[],
];
```

**Runtime requirement:** The `seedCurriculumRegistry()` function must be called at runtime before the registry is populated. Routes like `/curriculum` and `/knowledge` call this in their `onMount` hook. The function is idempotent — it checks an internal `_seeded` flag and only populates once, so multiple calls are safe.

### Step 3: Run the linter

```bash
npm test -- --grep "CurriculumLinter"
```

Fix any errors (S-1, S-2, P-1, D-1, D-2, E-2) before proceeding.

### Step 4: Update schema version (if modifying existing curricula)

If you're updating an existing curriculum (not adding a new one), bump the `curriculumVersion` in `CurriculumMigration.ts` and add a migration function. The `CurriculumMigration` module handles version detection and forward-compatible migration at session load time.

### Step 5: Validate end-to-end

```bash
npx tsc --noEmit
npm test
```

---

## 7. Validation Rules Summary

| Check | Category | Severity | Description |
|---|---|---|---|
| S-1 | Structural | Error | Prerequisites and cross-branch prerequisites exist in registry |
| S-2 | Structural | Error | Parent holon exists in registry |
| S-3 | Structural | Warning | Child holons exist in registry |
| S-4 | Structural | Warning | Isomorphism targets exist in registry |
| S-5 | Structural | Warning | Holon level is appropriate for its position |
| P-1 | Pedagogical | Error | All 5 phases have non-empty question and completion evidence |
| P-2 | Pedagogical | Error | Content has explanation (≥50 chars), examples, non-examples |
| P-3 | Pedagogical | Warning | At least one practice problem |
| P-4 | Pedagogical | Info | Higher-depth concepts should have misconceptions |
| D-1 | Developmental | Error | Depth progression is monotonically increasing |
| D-2 | Developmental | Error | Target min ≤ target max |
| D-3 | Developmental | Warning | Required prerequisite depth < target min |
| D-4 | Developmental | Error | At least one modality supported |
| E-1 | Epistemic | Warning | Description ≥ 30 chars |
| E-2 | Epistemic | Warning | All 6 depth rubric levels have evidence |
| S-CYCLE | Structural | Error | No prerequisite cycles |

---

## 8. Adaptive Difficulty

The scheduling engine uses adaptive difficulty for curriculum encounters, adjusting both the target depth and scheduling priority based on the learner's performance:

- **`computeAdaptiveTargetDepth(cs, holon)`:** When `retention > 0.8` AND `reviewCount >= 3`, pushes 1 level deeper (e.g., memorized → comprehended). When retention is medium or reviewCount is insufficient, stays at current depth for consolidation. Never exceeds `holon.depthMeta.targetDepthRange.max`.
- **`computeAdaptivePriority(cs)`:** Priority inversely proportional to retention — low retention = higher priority. Struggle boost activates only when `reviewCount > 5` AND `retention < 0.6`, preventing nearly-mastered concepts from being unnecessarily boosted.

This applies across all study themes: `depth_push`, `new_material`, `cross_domain`, `review_decay`, `misconception_repair`, and `integration_sprint`.

**Feedback loop:** `LearningAnalytics` and `DepthAssessment` feed performance data back into `CandidateGeneration` via adaptive difficulty, creating a closed loop where scheduling adapts to the learner's evolving knowledge state.

---

## 9. Study Themes

| Theme | When Selected | What It Does |
|---|---|---|
| `misconception_repair` | misconceptionLoad > 0.3 | Repairs flagged misconceptions (highest priority) |
| `review_decay` | retentionHealth < 0.4 | Schedules concepts with retention < 70% for review |
| `depth_push` | averageDepth < 0.3 | Pushes concepts to next depth level (adaptive) |
| `cross_domain` | integrationDensity < 0.3 | Explores cross-domain connections for high-depth concepts |
| `integration_sprint` | coverage > 0.6 AND depth > 0.4 | Sprints toward synthesis for evaluated/transformed concepts |
| `new_material` | coverage ≤ 0.6 | Discovers unmastered concepts, prioritizes by prerequisite readiness |

Selection priority: misconception_repair > review_decay > depth_push > cross_domain > integration_sprint > new_material. The `AutoModeStrategy.selectStudyTheme()` function selects the theme based on CCI knowledge health signals.

## 9.1 Forgetting Curve Integration

The `ForgettingCurve` module implements spaced repetition using Ebbinghaus exponential decay. Each concept tracked in `Significator.knowledge.forgettingCurves` has a `halfLifeMs` that doubles with each successful retrieval (up to `maxHalfLifeMs`). The `review_decay` study theme uses `computeReviewCandidates()` to find concepts whose retention has fallen below the review threshold (70%). Forgetting curves are persisted at session end via `persistKnowledgeDecay()` to ensure cross-session retention accuracy.

## 9.2 ConceptState Phases

Each concept tracks which of the 5 holonic phases have been completed via `ConceptState.completedPhases`. A concept is considered fully mastered only when all 5 phases (observation, principle, application, integration, creation) are complete.

---

## 10. Architecture Overview

```
JSON Seed Data → CurriculumRegistry → CurriculumLinter (validation)
                                          ↓
                              CandidateGeneration (scheduling) ←──────┐
                                          ↓                              │
                              EncounterScheduler (interleaving)        │
                                          ↓                              │
                              Significator.knowledge (state)           │
                                          ↓                              │
                              CCIEngine.knowledgeHealth ───────────────┘
                              ↕                    ↕
                              LearningAnalytics  DepthAssessment
                              (modality          (knowledge +
                               effectiveness)     developmental)
```

**Key files:**
- `src/core/curriculum/types.ts` — All type definitions
- `src/core/curriculum/CurriculumRegistry.ts` — Singleton registry
- `src/core/curriculum/CurriculumLinter.ts` — Structural/pedagogical/developmental validation
- `src/core/curriculum/CurriculumBridge.ts` — Integration with Significator + knowledgeHealth computation
- `src/core/curriculum/ForgettingCurve.ts` — Spaced repetition (Ebbinghaus exponential decay)
- `src/core/curriculum/KnowledgeGraph.ts` — Prerequisite DAG (topological sort, cycle detection)
- `src/core/curriculum/DepthAssessment.ts` — Dual-depth evaluation (knowledge + developmental)
- `src/core/curriculum/LearningAnalytics.ts` — Modality effectiveness, velocity, review intervals
- `src/core/curriculum/DepthAssessment.ts` — Over/under-confidence detection (`computeCalibrationBias`) from calibration history
- `src/core/curriculum/CurriculumMigration.ts` — Schema versioning and forward-compatible migration
- `src/core/engines/CandidateGeneration.ts` — Candidate generation with adaptive difficulty
- `src/core/engines/AutoModeStrategy.ts` — Study theme selection from CCI signals
- `src/core/curriculum/CurriculumSeed.ts` — Seed data loader
- `src/core/curriculum/data/*.json` — Curriculum holon definitions

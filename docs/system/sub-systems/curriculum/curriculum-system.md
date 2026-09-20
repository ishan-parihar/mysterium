# Curriculum System Architecture

> **Updated:** 2026-07-25 — Rewritten to reflect actual implementation state and the two-system architecture.

## 1. Purpose

Describes the **knowledge curriculum system** — one of two orthogonal systems in Mysterium. This document covers how knowledge is organized (holonic hierarchy), assessed (depth spectrum), retained (spaced repetition), and delivered (encounter interleaving). It does NOT cover the developmental assessment system (64 cells) — that lives in the assessment module architecture.

## 2. The Two-System Architecture

Mysterium has two orthogonal systems that must remain separate:

```
┌─────────────────────────────────────────────────────────┐
│                    SIGNIFICATOR                          │
│                                                          │
│  ┌──────────────────┐    ┌──────────────────────────┐   │
│  │  System 1:        │    │  System 2:               │   │
│  │  Developmental    │    │  Knowledge               │   │
│  │  Assessment       │    │  Curriculum              │   │
│  │  (64 cells)       │    │  (holon hierarchy)       │   │
│  │                   │    │                          │   │
│  │  Tracks:          │    │  Tracks:                 │   │
│  │  CAPACITY         │    │  KNOWLEDGE               │   │
│  │  "Can you operate │    │  "What do you know and   │   │
│  │   at this stage?" │    │   at what depth?"        │   │
│  │                   │    │                          │   │
│  │  Data:            │    │  Data:                   │   │
│  │  - altitudes      │    │  - conceptStates         │   │
│  │  - shadows        │    │  - subjectProgress       │   │
│  │  - drives         │    │  - studyHistory          │   │
│  │  - polarity       │    │  - learningProfile       │   │
│  │  - transformations│    │  - forgettingCurves      │   │
│  │  - theta          │    │                          │   │
│  └──────────────────┘    └──────────────────────────┘   │
│           │                        │                     │
│           │    ┌──────────────────┐│                     │
│           └────│  CCI Engine      │┘                     │
│                │  (6 dimensions + │                       │
│                │   knowledgeHealth)│                      │
│                └──────────────────┘                       │
└─────────────────────────────────────────────────────────┘
                         │
                         │ CCI feeds
                         ▼
┌─────────────────────────────────────────────────────────┐
│              AUTO-MODE STRATEGY ENGINE                    │
│                                                          │
│  Session Plan: developmental theme + study theme          │
│  Encounter Mix: developmental + curriculum (interleaved)  │
└─────────────────────────────────────────────────────────┘
```

### Why They Must Remain Separate

| Principle | Explanation |
|-----------|-------------|
| **Capacity ≠ Knowledge** | A player at Green stage (Cognitive) can engage Tier 1 CS content. Stage determines *how deeply*, not *what* they learn. |
| **Same content, different depth** | "What is a variable?" is Tier 1. A Red-stage player and a Green-stage player both encounter it — at different depths. |
| **Orthogonal axes** | Developmental stage is vertical (growth). Knowledge depth is horizontal (mastery). Independent dimensions. |

### Bridge Points

| Bridge | Location | Function |
|--------|----------|----------|
| **CurriculumDevMapping** | `CurriculumHolon.devMapping` | Maps holon to primaryLine + stageRange |
| **CCI knowledgeHealth** | `CCIEngine.ts` | Curriculum progress feeds CCI (20% weight) |
| **CurriculumBridge** | `CurriculumBridge.ts` | Bidirectional: curriculum ↔ developmental signals |
| **generateCurriculumCandidates** | `CandidateGeneration.ts` | Interleaves curriculum with developmental encounters |
| **Auto-Mode Strategy** | `AutoModeStrategy.ts` | Session plan addresses both systems |

## 3. Scientific Basis

- **Holonic curriculum** — Foundations/30: self-similar hierarchy (Branch → Subject → Topic → Concept → Instance)
- **Depth assessment** — Foundations/31: 7-level spectrum (absent → memorized → comprehended → applied → analyzed → evaluated → transformed)
- **Spaced repetition** — Foundations/29: Ebbinghaus forgetting curves applied to concept retention
- **Meta-learning science** — Foundations/29: desirable difficulties, interleaving, testing effect
- **Framework complexity** — Foundations/35: meta-line determining depth at which all 8 lines operate

## 4. Game-Design Mapping

### 4.1 The Holonic Hierarchy

```
Branch (e.g., "Formal Sciences")
  └── Subject (e.g., "Computer Science")
       └── Topic (e.g., "Algorithms & Data Structures")
            └── Concept (e.g., "Recursion")
                 └── Instance (e.g., "Factorial computation")
```

Each level is a holon — whole at its own level, part of a larger whole. The same five-phase internal structure appears at every level:

| Phase | Question | Output |
|-------|----------|--------|
| **Observation** | "What is the phenomenon?" | Description |
| **Principle** | "What is the underlying mechanism?" | Rule/law |
| **Application** | "How does this operate in novel situations?" | Problem-solving |
| **Integration** | "How does this connect to other principles?" | Cross-references |
| **Creation** | "Can the learner generate new instances?" | Original work |

### 4.2 The 7-Level Depth Spectrum

| Level | Name | What it measures |
|-------|------|------------------|
| 0 | Absent | No knowledge of concept |
| 1 | Memorized | Can recall definitions |
| 2 | Comprehended | Can explain in own words |
| 3 | Applied | Can solve standard problems |
| 4 | Analyzed | Can decompose and examine |
| 5 | Evaluated | Can judge and critique |
| 6 | Transformed | Can create new understanding |

### 4.3 The Framework-Complexity Bridge (Doc 35)

Framework-complexity is a **meta-line** — not one of the 8 canonical lines, but a dimension that determines how deeply all 8 lines can engage with knowledge:

| HolonLevel | Framework Tier | Depth Range |
|------------|----------------|-------------|
| instance | Tier 1: Foundational | memorized |
| concept | Tier 1→2: Foundational→Systematic | memorized → evaluated |
| topic | Tier 2→3: Systematic→Meta | comprehended → transformed |
| subject | Tier 3→4: Meta→Trans | applied → transformed |
| branch | Tier 4: Trans-paradigmatic | evaluated → transformed |

## 5. Implementation

### 5.1 Type System

All types defined in `src/core/curriculum/types.ts`:

- `CurriculumHolon` — atomic unit of knowledge (five-phase structure, depth rubrics, prerequisites, isomorphisms)
- `ConceptState` — what the learner knows (depth level, retention, review count, misconception flags)
- `KnowledgeState` — aggregate knowledge state on Significator
- `DepthLevel`, `BloomLevel`, `CurriculumTaskType` — assessment vocabulary
- `DualDepthResult` — combined knowledge + developmental assessment result
- `ForgettingCurve` — spaced repetition parameters

### 5.2 Registry & Seed Data

| Component | File | Status |
|-----------|------|--------|
| CurriculumRegistry | `src/core/curriculum/CurriculumRegistry.ts` | ✅ Complete — singleton, indexed by subject/level |
| CurriculumSeed | `src/core/curriculum/CurriculumSeed.ts` | ✅ Complete — loads 48 holons from JSON |
| Seed Data | `src/core/curriculum/data/*.json` | ⚠️ 48 of ~744 holons (6.5%) |

**Current coverage:** CS foundations (14), CS program (6), Math foundations (12), Physics foundations (8), Physics program (8).

### 5.3 Bridge Integration

| Component | File | Status |
|-----------|------|--------|
| CurriculumBridge | `src/core/curriculum/CurriculumBridge.ts` | ✅ Complete — bidirectional curriculum ↔ developmental |
| KnowledgeGraph | `src/core/curriculum/KnowledgeGraph.ts` | ✅ Complete — DAG + topological sort |
| ForgettingCurve | `src/core/curriculum/ForgettingCurve.ts` | ✅ Complete — spaced repetition |
| DepthAssessment | `src/core/curriculum/DepthAssessment.ts` | ✅ Complete |
| CurriculumLinter | `src/core/curriculum/CurriculumLinter.ts` | ✅ Complete |
| LearningAnalytics | `src/core/curriculum/LearningAnalytics.ts` | ✅ Complete |

### 5.4 Encounter Integration

Curriculum encounters are interleaved with developmental encounters in `CandidateGeneration.ts`:

```
AutoModeStrategy → studyTheme → generateCurriculumCandidates()
  → review_decay: concepts with retention < 0.7
  → depth_push: concepts ready for deeper engagement
  → new_material: unmastered concepts with prerequisites met
  → cross_domain: concepts at analyzed/evaluated depth
  → misconception_repair: concepts with flagged misconceptions
  → integration_sprint: concepts at evaluated/transformed depth
```

Candidates are merged with developmental encounters and ranked by priority.

### 5.5 CCI Integration

The CCI composite score includes knowledge health as the 6th dimension (20% weight):

| Dimension | Weight | Source |
|-----------|--------|--------|
| Altitude | 12% | Significator altitudes |
| Drive Health | 20% | Significator drives |
| Polarity | 12% | Significator polarity |
| Shadow Topology | 20% | Significator shadows |
| Transformation Readiness | 16% | Significator transformations |
| **Knowledge Health** | **20%** | Significator.knowledge |

Knowledge health sub-dimensions: conceptCoverage (25%), averageDepth (25%), retentionHealth (25%), integrationDensity (15%), misconceptionLoad (10%).

## 6. The Curriculum Expansion Contract

### 6.1 Minimum Viable Curriculum Per Branch

A branch is "curriculum-complete" when:
- 1 branch holon
- ≥2 subject holons
- ≥3 topic holons per subject
- ≥3 concept holons per topic
- ≥2 instance holons per concept
- Complete depth rubrics at all levels
- ≥1 cross-domain isomorphism per concept
- ≥1 misconception per concept at Tier 2+

**Minimum:** 1 + 2 + 6 + 18 + 36 = **63 holons per branch**

### 6.2 Full Graduation-Level Curriculum

| Branch | Subjects | Topics | Concepts | Instances | Total |
|--------|:--------:|:------:|:--------:|:---------:|:-----:|
| Formal Sciences | 6 | 18 | 54 | 108 | **186** |
| Natural Sciences | 6 | 18 | 54 | 108 | **186** |
| Social Sciences | 6 | 18 | 54 | 108 | **186** |
| Humanities | 6 | 18 | 54 | 108 | **186** |
| **Total** | **24** | **72** | **216** | **432** | **744** |

## 7. Architectural Contract

### 7.1 File Map

| File | Purpose |
|------|---------|
| `src/core/curriculum/types.ts` | All type definitions |
| `src/core/curriculum/CurriculumRegistry.ts` | Holon storage and queries |
| `src/core/curriculum/CurriculumSeed.ts` | JSON loader |
| `src/core/curriculum/CurriculumBridge.ts` | Curriculum ↔ developmental bridge |
| `src/core/curriculum/KnowledgeGraph.ts` | DAG + topological sort |
| `src/core/curriculum/ForgettingCurve.ts` | Spaced repetition |
| `src/core/curriculum/DepthAssessment.ts` | Depth evaluation |
| `src/core/curriculum/CurriculumLinter.ts` | Structural/pedagogical validation |
| `src/core/curriculum/LearningAnalytics.ts` | Retention tracking |
| `src/core/curriculum/CurriculumMigration.ts` | Schema versioning |
| `src/core/curriculum/SeedInitialKnowledge.ts` | Initial knowledge seeding |
| `src/core/curriculum/data/` | JSON seed data |
| `src/core/engines/CandidateGeneration.ts` | Curriculum candidate generation (§7) |
| `src/core/engines/CCIEngine.ts` | Knowledge health in CCI (§5.5) |
| `src/core/domain/Significator.ts` | KnowledgeState on Significator |

### 7.2 Invariants

1. Every CurriculumHolon must have all five phases (observation → creation)
2. Prerequisite graph must be a DAG (no cycles)
3. Cross-branch prerequisites must exist at required depth before advancing
4. ConceptState.retention must be in [0, 1]
5. DepthLevel progression must be monotonically increasing
6. ForgettingCurve half-life must be in [initialHalfLifeMs, maxHalfLifeMs]

## 8. Open Questions

- **Graduation depth** — when does a player "complete" the curriculum? The hierarchy scales to ~744 holons.
- **Research pipeline** — Tier 4 content (research-level) doesn't exist yet.
- **Framework-complexity integration** — Doc 35 specifies tier-aware modality selection and pedagogical gradients, not yet implemented.
- **Cross-domain activation** — Isomorphisms exist in seed data but tier-activation logic (plant seeds at Tier 1, activate at Tier 3) is not implemented.

## 9. Principles Served

Principles **2** (validity — grounded in spaced repetition and depth assessment), **4** (earned progression — depth levels must be demonstrated), **7** (codebase — all types are pure data structures testable in isolation).

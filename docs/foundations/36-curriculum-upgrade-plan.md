# 36 — Curriculum Upgrade Plan: From Basics to Ph.D

> **Cross-references:** [[docs/foundations/30-holonic-curriculum-architecture|30 — Holonic Curriculum Architecture]] · [[docs/foundations/31-depth-assessment-model|31 — Depth Assessment Model]]
> **Status:** draft (awaiting user ratification).
>
> **Lateral:** The formal implementation plan for upgrading Mysterium's curriculum system from its current 8-holon prototype to a full graduation-level architecture that scales from foundational concepts through Ph.D.-level research. No other document covers this: foundations/35 maps framework-complexity stages to curriculum tiers; this document specifies *what to build, in what order, and why*.
>
> **Depends on:** 29 (meta-learning science), 30 (holonic curriculum architecture), 31 (depth assessment model), 35 (framework-complexity mapping)
> **Referenced by:** Implementation tickets
> **Heading contract:** working-plan format — Purpose is §1 Current State Assessment; Open Questions are carried in the risk/dependency sections; Principles served is §7. The six-heading contract applies in substance, not literal headings.

---

## 1. Current State Assessment

### 1.1 What Exists

| Component | Status | File |
|---|---|---|
| CurriculumHolon type (5 levels) | ✅ Complete | `src/core/curriculum/types.ts` |
| CurriculumRegistry singleton | ✅ Complete | `src/core/curriculum/CurriculumRegistry.ts` |
| CurriculumLinter (13 checks) | ✅ Complete | `src/core/curriculum/CurriculumLinter.ts` |
| CurriculumSeed loader | ✅ Complete | `src/core/curriculum/CurriculumSeed.ts` |
| KnowledgeGraph (DAG queries) | ✅ Complete | `src/core/curriculum/KnowledgeGraph.ts` |
| ForgettingCurve model | ✅ Complete | `src/core/curriculum/ForgettingCurve.ts` |
| DepthAssessment (dual-depth) | ✅ Complete | `src/core/curriculum/DepthAssessment.ts` |
| CurriculumBridge (integration) | ✅ Complete | `src/core/curriculum/CurriculumBridge.ts` |
| CandidateGeneration (scheduling) | ✅ Complete | `src/core/engines/CandidateGeneration.ts` |
| AutoModeStrategy (study themes) | ✅ Complete | `src/core/engines/AutoModeStrategy.ts` |
| ConsequenceEngine (knowledge update) | ✅ Complete | `src/core/engines/ConsequenceEngine.ts` |
| CCIEngine (knowledge health) | ✅ Complete | `src/core/engines/CCIEngine.ts` |
| KnowledgeDashboard Svelte | ✅ Complete | `src/lib/components/displays/KnowledgeDashboard.svelte` |
| /knowledge route | ✅ Complete | `src/routes/knowledge/+page.svelte` |
| Seed data: CS foundations | ✅ Complete | `src/core/curriculum/data/cs.foundations.json` (4 holons) |
| Seed data: Math foundations | ✅ Complete | `src/core/curriculum/data/math.foundations.json` (4 holons) |

### 1.2 What's Missing

| Gap | Priority | Impact | Effort |
|---|---|---|---|
| **G1:** No multi-level holarchy (only branch + concept) | P0 | Cannot model subject/topic levels | 3–5 days |
| **G2:** No prerequisite depth enforcement | P0 | Unsafe scaling to multi-level curricula | 1 day |
| **G3:** No LLM-driven adaptive content | P1 | Cannot personalize at any level | 7–10 days |
| **G4:** No dual-depth assessment in encounters | P1 | Binary pass/fail, no real depth measurement | 5–7 days |
| **G5:** No research/original contribution tracking | P2 | Cannot model Ph.D.-level work | 10–15 days |
| **G6:** No cross-disciplinary integration engine | P2 | Cannot model graduate-level synthesis | 5–7 days |
| **G7:** No mentor/advisor role | P2 | Cannot model academic social structure | 5–7 days |
| **G8:** No publication/review pipeline | P2 | Cannot model the publication cycle | 7–10 days |
| **G9:** No thesis/dissertation milestone | P2 | Cannot model capstone work | 5–7 days |
| **G10:** No curriculum versioning | P3 | Cannot iterate without breaking progress | 3–5 days |
| **G11:** No adaptive difficulty within concept | P3 | Cannot personalize within a concept | 3–5 days |
| **G12:** No study session analytics | P3 | Cannot provide data-driven recommendations | 5–7 days |
| **G13:** No spaced repetition personalization | P3 | One-size-fits-all review scheduling | 3–5 days |
| **G14:** No curriculum browse/search UI | P3 | Users can't discover available curriculum | 3–5 days |

---

## 2. The Implementation Phases

### Phase A: Prerequisite Depth Enforcement (P0, 1 day)

**Goal:** Ensure learners cannot encounter advanced material before mastering prerequisites at the required depth.

**Changes:**
1. `src/core/engines/CandidateGeneration.ts` — In `generateCurriculumCandidates`, add depth check:
   ```
   holon.prerequisites.every(p => {
     const pCs = knowledge.conceptStates.get(p);
     return pCs && depthOrdinal(pCs.depthLevel) >= depthOrdinal(holon.depthMeta.requiredPrerequisiteDepth);
   })
   ```
2. `tests/core/engines/CandidateGeneration.test.ts` — Add tests for depth gating
3. `src/core/curriculum/CurriculumLinter.ts` — Verify D-3 check enforces at scheduling time

**Validation:** typecheck, tests, workspace lint

---

### Phase B: Deepen the Holarchy (P0, 3–5 days)

**Goal:** Populate the full 5-level holarchy (branch → subject → topic → concept → instance).

**Changes:**
1. **Seed data expansion:**
   - `cs.foundations.json`: Add `subject` holons (e.g., `cs.algorithms`, `cs.data_structures`, `cs.programming`) and `topic` holons (e.g., `cs.algorithms.sorting`, `cs.algorithms.graph`)
   - `math.foundations.json`: Add `subject` holons (e.g., `math.algebra`, `math.geometry`, `math.analysis`) and `topic` holons
2. **Registry update:** `CurriculumRegistry.ts` — Add `getByParent(parentId)` method
3. **Scheduler update:** `CandidateGeneration.ts` — Traverse holarchy when generating candidates (prefer topics whose concepts are at the learner's current depth)
4. **Linter update:** `CurriculumLinter.ts` — Add check for holon level consistency (concept must have parent, topic must have children)
5. **Dashboard update:** `KnowledgeDashboard.svelte` — Show hierarchical progress (branch → subject → topic → concept)
6. **Route update:** `/knowledge` — Add browsable catalog with level filtering

**Validation:** typecheck, tests, workspace lint

---

### Phase C: Dual-Depth Assessment Engine (P1, 5–7 days)

**Goal:** Replace binary pass/fail with full dual-depth assessment (knowledge depth + developmental signal).

**Changes:**
1. **Wire DepthAssessment into ConsequenceEngine:**
   - `ConsequenceEngine.ts` — Replace `passed: boolean` with `DualDepthResult` from `DepthAssessment.assessDualDepth()`
   - `EncounterSpecNew.ts` — Add `depthRubric?: DepthRubric` to `ScheduledEncounter`
2. **LLM scoring:**
   - `AgenticOrchestrator.ts` — Add `scoreDepthResponse` tool that scores open-ended responses against the rubric
   - `src/infra/llm/templates.ts` — Add `depthScoringTemplate` for LLM prompt
3. **ConceptState update:**
   - `ConsequenceEngine.ts` — Use `updateConceptState()` from `DepthAssessment.ts` instead of manual depth advancement
4. **Tests:**
   - `tests/core/curriculum/DepthAssessment.test.ts` — Add integration tests with ConsequenceEngine

**Validation:** typecheck, tests, workspace lint

---

### Phase D: LLM-Driven Adaptive Content (P1, 7–10 days)

**Goal:** LLM generates content tailored to the learner's level, interests, and misconception history.

**Changes:**
1. **Content template system:**
   - `src/core/curriculum/types.ts` — Add `ContentTemplate` interface with placeholders for adaptive generation
   - `src/infra/llm/templates.ts` — Add `contentGenerationTemplate` that takes holon template + learner context → adaptive content
2. **Encounter-time generation:**
   - `AgenticOrchestrator.ts` — Before presenting a curriculum encounter, call LLM to generate adaptive content
   - Fallback to static content when LLM unavailable (existing `FallbackProvider` pattern)
3. **Misconception-aware generation:**
   - LLM receives the learner's misconception history for this concept
   - Content explicitly addresses known misconceptions
4. **Modality-adaptive generation:**
   - LLM generates content in the modality matching the learner's preferred learning style
   - Same concept, different presentation for different learners

**Validation:** typecheck, tests, workspace lint

---

### Phase E: Analytics Engine (P3, 5–7 days)

**Goal:** Data-driven study recommendations based on learning patterns.

**Changes:**
1. **LearningAnalytics engine:**
   - `src/core/curriculum/LearningAnalytics.ts` — New module
   - Study efficiency per concept (retention gain per minute)
   - Optimal review intervals (personalized forgetting curves)
   - Learning velocity per domain (concepts mastered per session)
   - Modality effectiveness (which modalities produce deepest learning)
2. **Personalized forgetting curves:**
   - `ForgettingCurve.ts` — Per-concept half-life adaptation based on observed retention
   - Initial: `DEFAULT_FORGETTING_PARAMS` → After 3 reviews: personalized per concept
3. **Adaptive time estimation:**
   - `CandidateGeneration.ts` — Replace hardcoded `estimatedMinutes` with historical average
4. **Dashboard integration:**
   - `KnowledgeDashboard.svelte` — Add analytics section showing study efficiency trends

**Validation:** typecheck, tests, workspace lint

---

### Phase F: Research Pipeline (P2, 10–15 days)

**Goal:** Model the full thesis/dissertation lifecycle for Ph.D.-level work.

**Changes:**
1. **New holon level: `research`:**
   - `src/core/curriculum/types.ts` — Add `ResearchHolon` as a union variant of `CurriculumHolon` (discriminator: `level: 'research'`)
   - Additional fields: `researchQuestion`, `methodology`, `expectedContribution`, `advisorId`, `committeeIds`, `milestones`
   - Note: `AdvisorNPC` is a new type to create in `src/core/curriculum/ResearchPipeline.ts`, not in the existing `src/core/domain/Holon.ts`
2. **AdvisorNPC role:**
   - `src/core/domain/Holon.ts` — Add `AdvisorNPC` type
   - Provides feedback, approves milestones, suggests方向
3. **Publication pipeline:**
   - `src/core/curriculum/ResearchPipeline.ts` — New module
   - States: `draft → review → revise → submit → published`
   - Peer review via `SocialCooperative` modality
4. **Thesis milestone:**
   - `src/core/curriculum/ThesisTracker.ts` — New module
   - Tracks: proposal → chapters → defense
   - Synthesizes N concepts into original contribution
5. **Defense mechanism:**
   - Oral examination via `ImmersiveRPG` modality
   - Panel of advisor NPCs asks cross-domain questions

**Validation:** typecheck, tests, workspace lint

---

### Phase G: Curriculum Management (P3, 7–10 days)

**Goal:** Dynamic registry with versioning, persistence, and browse UI.

**Changes:**
1. **Registry persistence:**
   - `CurriculumRegistry.ts` — Serialize to IndexedDB (browser) or Cloudflare KV (cloud)
   - Load on startup, save on mutation
2. **Versioning:**
   - `CurriculumHolon` — Add `version: string` field
   - Migration system for curriculum updates
   - Track which version each learner studied
3. **Browse UI:**
   - `/curriculum` route — Searchable, filterable catalog
   - Show progress per holon (depth level, retention, last reviewed)
   - Prerequisite chain visualization
4. **Admin panel (Phase 5+):**
   - Visual curriculum authoring tool
   - Lint validation in real-time
   - Export/import JSON

**Validation:** typecheck, tests, workspace lint

---

## 3. The Scaling Projection

### 3.1 Current → Phase B → Phase F

| Metric | Current | After Phase B | After Phase F |
|---|:---:|:---:|:---:|
| Total holons | 8 | ~50 | ~850 |
| Holon levels used | 2 (branch, concept) | 4 (branch, subject, topic, concept) | 5 (+ research) |
| Branches | 2 | 2 | 4+ |
| Subjects | 0 | 6 | 24 |
| Topics | 0 | 18 | 72 |
| Concepts | 6 | ~20 | 216 |
| Instances | 0 | ~0 | 432 |
| Research | 0 | 0 | 50–100 |
| Assessment depth | Binary pass/fail | Binary pass/fail | 6-level dual-depth |
| Content adaptation | Static | Static | LLM-adaptive |
| Analytics | None | None | Full learning analytics |

### 3.2 The Ph.D.-Level Curriculum Example

**Branch: Formal Sciences**

```
formal_sciences (branch)
├── computer_science (subject)
│   ├── algorithms (topic)
│   │   ├── sorting (concept)
│   │   │   ├── bubble_sort (instance)
│   │   │   ├── merge_sort (instance)
│   │   │   └── quicksort (instance)
│   │   ├── graph_algorithms (concept)
│   │   │   ├── bfs (instance)
│   │   │   ├── dfs (instance)
│   │   │   └── dijkstra (instance)
│   │   └── complexity_theory (concept)
│   │       ├── p_vs_np (instance)
│   │       └── np_completeness (instance)
│   ├── programming_languages (topic)
│   │   ├── type_systems (concept)
│   │   ├── semantics (concept)
│   │   └── compilers (concept)
│   └── ai_ml (topic)
│       ├── supervised_learning (concept)
│       ├── unsupervised_learning (concept)
│       └── deep_learning (concept)
├── mathematics (subject)
│   ├── algebra (topic)
│   │   ├── group_theory (concept)
│   │   ├── ring_theory (concept)
│   │   └── field_theory (concept)
│   ├── analysis (topic)
│   │   ├── real_analysis (concept)
│   │   ├── complex_analysis (concept)
│   │   └── functional_analysis (concept)
│   └── topology (topic)
│       ├── point_set_topology (concept)
│       ├── algebraic_topology (concept)
│       └── differential_topology (concept)
└── research (branch-level research)
    ├── thesis_proposal (research)
    ├── experimental_phase (research)
    ├── writing_phase (research)
    └── defense (research)
```

---

## 4. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Seed data authoring is slow | High | Delays Phase B | Use LLM to generate initial seed data, lint for quality |
| LLM content generation is inconsistent | Medium | Degrades Phase D | Fallback to static content; cache generated content |
| Dual-depth assessment is noisy | Medium | Degrades Phase C | Use confidence thresholds; require multiple assessments |
| Research pipeline is over-engineered | Low | Wastes effort | Start with minimal viable thesis tracking; iterate |
| Learner progress breaks during migration | Medium | High | Version all curriculum data; migration tests |

---

## 5. Dependencies

```
Phase A (prereq depth) ──→ Phase B (holarchy) ──→ Phase G (management)
                                    │
Phase C (dual-depth) ──→ Phase D (LLM content)
                                    │
Phase E (analytics) ───────────────→ (standalone, benefits from B)
                                    │
Phase F (research) ────────────────→ (standalone, benefits from C+D)
```

**Critical path:** A → B → C → D → F

---

## 6. Success Criteria

| Phase | Success Metric |
|---|---|
| A | Learner cannot encounter concept C until all prerequisites are at required depth |
| B | 5-level holarchy renders correctly in KnowledgeDashboard |
| C | Depth assessment produces 6 distinct levels with >80% inter-rater reliability |
| D | LLM-generated content is rated "appropriate" by >90% of test users |
| E | Analytics correctly predict optimal review time within ±20% |
| F | Learner can complete a thesis proposal through the research pipeline |
| G | Curriculum catalog loads <2s with 850+ holons |

---

## 7. Principles served

Principles **1** (what the game trains — extends training to include framework complexity and research skills), **2** (validity — grounded in learning science and developmental psychology), **3** (adaptive — tier-aware pedagogy and personalized content), **4** (earned progression — prerequisite depth enforcement), **5** (multi-dimensional — framework complexity as meta-dimension), **7** (codebase — all new modules are pure functions testable in isolation).

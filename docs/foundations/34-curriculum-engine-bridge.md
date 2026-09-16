# 34 — Curriculum-Engine Bridge

> **Cross-references:** [[docs/foundations/29-meta-learning-science|29 — Meta Learning Science]]
> **Status:** canonical-hypothesis (Mysterium-specific integration contract between curriculum modules and the existing developmental engine).
>
> **Lateral:** The integration contract that specifies exactly how curriculum content plugs into Mysterium's existing hooks — Significator, ModuleRegistry, EncounterScheduler, AgenticOrchestrator, CCI Engine, and Auto-Mode Strategy. No other document covers this: foundations/29-33 cover the curriculum subsystem in isolation; this document covers the *bridge* between curriculum and the existing engine.
>
> **Depends on:** 29 (meta-learning), 30 (holonic architecture), 31 (depth model), 32 (linter), 33 (dashboard), 16 (Significator), 24 (scheduler), 25 (CCI), 26 (unified architecture), 27 (auto-mode)
> **Referenced by:** All implementation work for the curriculum expansion; 43 (agentic orchestration — Teacher/Assessor councils and the Curriculum Aligner consume this bridge's hooks through purpose-scoped projections)
>
> **Orchestration note (43):** the bridge functions and the curriculum-enhanced orchestrator extension (§3.4) execute *through* the delegated councils: tutoring, revision, prescription, examination, and alignment adjustments are agent mandates, not menu actions. Curriculum alignment context itself is assembled by the Context Steward (S2) and ratified by the orchestrator.

---

## 1. Purpose

This document answers: **How does a curriculum module compose with the existing Mysterium engine so that knowledge acquisition and developmental growth are tracked in the same state vessel, scheduled by the same engine, and displayed on the same dashboard?**

The curriculum expansion does NOT replace the existing engine. It EXTENDS it. Every existing component — the Significator, the ModuleRegistry, the EncounterScheduler, the AgenticOrchestrator, the CCI Engine, the Auto-Mode Strategy — gains new capabilities, but their existing capabilities remain intact. A learner who never touches a curriculum module experiences Mysterium exactly as before. A learner who engages with curriculum content experiences an enriched version where knowledge and development are interleaved.

---

## 2. Scientific basis

### 2.1 The Dual-Track Model

The fundamental insight: knowledge acquisition and developmental growth are not separate processes — they are two aspects of the same learning activity. When a learner studies physics:

- They acquire **knowledge** (Newton's Laws, conservation of energy, etc.)
- They exercise **developmental capacities** (cognitive flexibility, persistence, self-monitoring)
- They express **drives** (agency in independent problem-solving, communion in collaborative study, eros in genuine curiosity, agape in integrating new knowledge with old)
- They may surface **shadows** (intellectual bypass, knowledge-as-status, perfectionism)

The dual-track model captures all of this in a single encounter. The curriculum engine bridge ensures that every curriculum encounter produces both a knowledge signal AND a developmental signal, and that both are written to the same Significator.

### 2.2 The Composability Principle

The existing engine was designed for composability — the module system, the registry, the scheduler, and the Significator are all designed to be extended without breaking existing functionality. The curriculum bridge exploits this:

- The Significator gains a `knowledge` field (additive, not replacing existing fields)
- The ModuleRegistry gains a parallel curriculum registry (additive, not replacing the developmental registry)
- The EncounterScheduler gains a new selection dimension (knowledge state alongside theta-decay and shadow pressure)
- The AgenticOrchestrator gains new tools (curriculum-specific tools alongside existing developmental tools)
- The CCI Engine gains a sixth dimension (knowledge health alongside altitude, drive health, polarity, shadow topology, and transformation readiness)
- The Auto-Mode Strategy gains study themes (alongside developmental session themes)

### 2.3 The Forgetting Curve as a Shared Mechanism

The existing theta-decay system (foundations/14) and the curriculum's forgetting curve (foundations/29) are instances of the same pattern: knowledge/capacity decays over time without retrieval, and review at the forgetting boundary strengthens it. The bridge unifies these into a single decay model:

- Developmental capacities decay via theta-decay
- Knowledge concepts decay via forgetting curves
- Both are modeled as exponential decay with configurable half-lives
- Both are restored by successful retrieval (review encounters)
- The scheduler selects review encounters based on whichever decay is most urgent

---

## 3. Game-design mapping

### 3.1 Extension 1: The Unified Significator

The Significator gains a new top-level field: `knowledge`. This is embedded within the existing vessel, following the same pattern as `shadows`, `polarity`, and `drives`.

**What is added:**

```
Significator
├── [existing fields unchanged]
│
└── knowledge (NEW)
    ├── conceptStates: Map<conceptId, ConceptState>
    │   ├── depthLevel: DepthLevel
    │   ├── retention: number (0-1)
    │   ├── lastReviewedAt: number
    │   ├── reviewCount: number
    │   ├── depthHistory: Array<{level, timestamp, evidence}>
    │   └── misconceptionFlags: string[]
    ├── subjectProgress: Map<subjectId, SubjectProgress>
    │   ├── modulesCompleted: number
    │   ├── averageDepth: number
    │   ├── masteryLevel: MasteryLevel
    │   └── crossDomainConnections: string[]
    ├── studyHistory: Array<StudyEvent>
    └── learningProfile: LearningProfile
```

**What is NOT changed:**
- All existing fields (altitudes, drives, shadows, polarity, theta, transformations) remain identical
- The Significator's serialization format is backward-compatible (the `knowledge` field is optional and defaults to empty)
- Existing encounter types (purely developmental, no curriculum) continue to work exactly as before

### 3.2 Extension 2: The Dual Registry

The ModuleRegistry gains a parallel CurriculumRegistry:

```typescript
interface DualRegistry {
  /** The existing developmental module registry (unchanged) */
  readonly developmental: ModuleRegistry;
  
  /** The new curriculum module registry */
  readonly curriculum: CurriculumRegistry;
  
  /** Bridge function: curriculum completion → developmental signal */
  curriculumToDevelopmental(
    curriculumResult: DualDepthResult,
  ): DevelopmentalSignal;
  
  /** Bridge function: developmental need → curriculum recommendation */
  developmentalToCurriculum(
    developmentalNeed: DevelopmentalNeed,
  ): CurriculumRecommendation | null;
}
```

**The bridge functions are the key innovation:**

When a curriculum module is completed:
- The knowledge depth level is recorded in `knowledge.conceptStates`
- The developmental signals (drive scores, shadow detection, metacognition) are written to the Significator's developmental fields
- The forgetting curve is initialized or updated
- The curriculum registry marks the concept as encountered

When the scheduler needs to select an encounter:
- It checks BOTH developmental needs (theta-decay, shadow pressure) AND knowledge needs (forgetting curve, depth progression)
- It selects whichever is most urgent
- It can also select "integrated" encounters that address both simultaneously

### 3.3 Extension 3: The Knowledge-State-Aware Scheduler

The EncounterScheduler gains a new selection dimension:

**New candidate generation logic:**

```
1. Generate developmental candidates (existing logic, unchanged)
2. Generate curriculum candidates (new logic):
   a. Find concepts where retention < review threshold → schedule review
   b. Find concepts where prerequisites are met but concept not encountered → schedule new material
   c. Find concepts at the right depth level for progression → schedule depth push
   d. Find cross-domain analogical connections → schedule integration
3. Merge both candidate sets
4. Apply priority formula (existing 7 criteria + 2 new criteria):
   - Criterion 8: Knowledge urgency (how far below retention threshold?)
   - Criterion 9: Depth progression opportunity (is the learner ready to go deeper?)
5. Rank and select top N
```

**The scheduler never forces curriculum over development or vice versa.** It presents both as options and lets the learner choose (or lets auto-mode bias the selection based on the CCI).

### 3.4 Extension 4: The Curriculum-Enhanced Orchestrator

The AgenticOrchestrator gains curriculum-specific tools alongside existing developmental tools:

| Existing Tools (unchanged) | New Curriculum Tools |
|---|---|
| `ask_user_question` (MCQ + write-in) | `present_concept` (multi-representation content delivery) |
| `complete_encounter` (developmental scoring) | `ask_depth_question` (Bloom's-level calibrated question) |
| — | `evaluate_understanding` (depth-level scoring, not just correct/incorrect) |
| — | `socratic_dialogue` (multi-turn probing for deep understanding) |
| — | `surface_misconception` (present scenario designed to reveal misconception) |
| — | `cross_domain_bridge` (introduce analogical connection to another subject) |
| — | `peer_teaching_prompt` (ask learner to explain as if teaching) |

**The orchestrator selects tools based on encounter type:**
- Purely developmental encounters use only existing tools (unchanged behavior)
- Purely curriculum encounters use curriculum tools + developmental drive probes
- Integrated encounters use all tools

### 3.5 Extension 5: The CCI with Knowledge Health

The CCI gains a sixth dimension:

```typescript
interface CCIWeights {
  readonly altitude: number;              // existing
  readonly driveHealth: number;           // existing
  readonly polarity: number;              // existing
  readonly shadowTopology: number;        // existing
  readonly transformationReadiness: number; // existing
  readonly knowledgeHealth: number;       // NEW
}
```

**Knowledge health sub-dimensions:**

| Sub-dimension | What it measures | How |
|---|---|---|
| `conceptCoverage` | What % of the curriculum has been encountered | encountered concepts / total concepts |
| `averageDepth` | Mean depth level across encountered concepts | weighted average of depth ordinals |
| `retentionHealth` | Mean retention across all concepts | average of all concept retention values |
| `integrationDensity` | How many cross-domain connections exist | connections / possible connections |
| `misconceptionLoad` | How many unresolved misconceptions | unresolved misconceptions / total misconceptions |

**Weight redistribution:**

The default weights are adjusted to accommodate the new dimension while maintaining the sum to 1.0:

```
altitude:                0.12  (was 0.15)
driveHealth:             0.20  (was 0.25)
polarity:                0.12  (was 0.15)
shadowTopology:          0.20  (was 0.25)
transformationReadiness: 0.16  (was 0.20)
knowledgeHealth:         0.20  (NEW)
```

The rationale: knowledge health is weighted equally with drive health and shadow topology because, for a learner engaged with curriculum content, knowledge state is as important as developmental state for determining what session theme to recommend.

### 3.6 Extension 6: The Auto-Mode with Study Themes

The Auto-Mode Strategy Engine gains study themes alongside developmental session themes:

**New study themes:**

| Study Theme | When selected | What it does |
|---|---|---|
| `review_decay` | Many concepts below retention threshold | Prioritizes spaced-repetition reviews |
| `new_material` | Retention healthy, depth plateauing | Introduces new concepts at the growth edge |
| `depth_push` | Concepts at "memorized" but not "comprehended" | Focuses on explanation and elaboration tasks |
| `cross_domain` | Many concepts at "analyzed" depth | Introduces analogical connections across subjects |
| `misconception_repair` | Misconception flags accumulating | Targets specific misconceptions with corrective scenarios |
| `integration_sprint` | Many at "applied" but few at "analyzed" | Focuses on decomposition and structural analysis |

**The session strategy becomes a dual strategy:**

```typescript
interface SessionStrategy {
  /** Developmental theme (existing) */
  readonly developmentalTheme: SessionTheme;
  
  /** Study theme (NEW) */
  readonly studyTheme: StudyTheme | null;
  
  /** Combined arc parameterization */
  readonly arc: ParameterisedSessionArc;
  
  /** Combined weight bias (developmental + knowledge) */
  readonly weightBias: PriorityWeightBias;
}
```

When both themes are active, the scheduler interleaves developmental and curriculum encounters. The ratio is determined by the CCI: if knowledge health is the dominant dimension, more curriculum encounters; if developmental health is dominant, more developmental encounters.

---

## 4. Architectural contract

### 4.1 The Significator Extension

```typescript
interface KnowledgeState {
  readonly conceptStates: ReadonlyMap<string, ConceptState>;
  readonly subjectProgress: ReadonlyMap<string, SubjectProgress>;
  readonly studyHistory: readonly StudyEvent[];
  readonly learningProfile: LearningProfile;
}

interface ConceptState {
  readonly depthLevel: DepthLevel;
  readonly retention: number;
  readonly lastReviewedAt: number;
  readonly reviewCount: number;
  readonly depthHistory: readonly DepthHistoryEntry[];
  readonly misconceptionFlags: readonly string[];
}

interface SubjectProgress {
  readonly modulesCompleted: number;
  readonly averageDepth: number;
  readonly masteryLevel: MasteryLevel;
  readonly crossDomainConnections: readonly string[];
}

type MasteryLevel = 'novice' | 'beginner' | 'competent' | 'proficient' | 'expert';

interface StudyEvent {
  readonly conceptId: string;
  readonly depthAchieved: DepthLevel;
  readonly modality: GameModality;
  readonly timestamp: number;
  readonly retentionBefore: number;
  readonly retentionAfter: number;
}

interface LearningProfile {
  readonly preferredModalities: readonly GameModality[];
  readonly metacognitionScore: number;
  readonly calibrationAccuracy: number;
  readonly transferCapacity: number;
  readonly studyEfficiency: number;
}
```

### 4.2 The CurriculumRegistry

```typescript
interface CurriculumRegistry {
  register(module: CurriculumHolon): void;
  get(conceptId: string): CurriculumHolon | undefined;
  getAll(): readonly CurriculumHolon[];
  getBySubject(subjectId: string): readonly CurriculumHolon[];
  getByDepthLevel(level: DepthLevel): readonly CurriculumHolon[];
  getPrerequisites(conceptId: string): readonly CurriculumHolon[];
  getDependents(conceptId: string): readonly CurriculumHolon[];
  getAnalogies(conceptId: string): readonly Isomorphism[];
  count(): number;
}
```

### 4.3 The Bridge Functions

```typescript
/** Curriculum completion → developmental signal */
function curriculumToDevelopmental(
  result: DualDepthResult,
  sig: Significator,
): {
  readonly developmentalUpdate: Partial<Significator>;
  readonly knowledgeUpdate: Partial<KnowledgeState>;
  readonly shouldTriggerShadowWork: boolean;
  readonly shouldTriggerTransformationCheck: boolean;
}

/** Developmental need → curriculum recommendation */
function developmentalToCurriculum(
  need: DevelopmentalNeed,
  registry: CurriculumRegistry,
  knowledgeState: KnowledgeState,
): CurriculumRecommendation | null

/** Forgetting curve → review scheduling */
function computeReviewSchedule(
  knowledgeState: KnowledgeState,
  now: number,
): readonly ReviewCandidate[]

/** Depth progression → next assessment */
function computeNextDepthAssessment(
  conceptId: string,
  currentDepth: DepthLevel,
  registry: CurriculumRegistry,
): CurriculumTask | null
```

### 4.4 Backward Compatibility

The bridge is designed for backward compatibility:

1. **Empty knowledge state = unchanged behavior.** If a learner has no curriculum data, every component behaves exactly as before. The `knowledge` field defaults to empty; the curriculum registry is empty; the scheduler generates zero curriculum candidates; the CCI uses the original 5-dimension weights.

2. **Optional engagement.** Curriculum encounters are offered alongside developmental encounters. The learner can ignore them entirely and experience pure Mysterium.

3. **Graceful degradation.** If the curriculum system fails (registry corruption, LLM unavailable for curriculum scoring), the system falls back to purely developmental encounters. The learner's experience degrades gracefully, not catastrophically.

4. **Schema migration.** Existing save files (Significators without `knowledge` field) are loaded with an empty knowledge state. No migration script is needed — the field is additive.

---

## 5. Open questions

- **The encounter ratio.** When both developmental and curriculum encounters are available, what ratio should the scheduler use? The CCI provides a signal (knowledge health vs. developmental health), but the exact mapping from CCI dimensions to encounter ratio needs empirical calibration.

- **The cross-encounter synthesis problem.** When a learner completes a curriculum encounter and then a developmental encounter in the same session, how do the two signals interact? Do they compound (curriculum + development = more than sum) or interfere (curriculum assessment noise contaminates developmental assessment)?

- **The content freshness problem.** Curriculum content must be kept up-to-date (e.g., new AI research, updated best practices). The content model must support versioning — a concept can have multiple versions, and the scheduler selects the appropriate version for the learner's depth level and recency.

- **The multi-learner problem.** The current architecture assumes a single learner per Significator. For classroom/institutional use, there would need to be a teacher dashboard that aggregates multiple Significators. This is deferred to a future phase.

- **The assessment validity problem.** How do we know that the depth-level assessments (Bloom's rubrics) are actually measuring what they claim? The curriculum linter (foundations/32) validates structural properties, but empirical validation of assessment validity requires pilot testing with real learners.

---

## 6. Principles served

Principles **1** (what the game trains — the bridge ensures curriculum encounters exercise both knowledge and developmental dimensions), **2** (validity — the bridge uses the same validated assessment mechanisms for both tracks), **3** (adaptive — the CCI's knowledge health dimension enables curriculum-aware session planning), **4** (earned progression — depth levels must be demonstrated, and the bridge tracks them), **5** (multi-dimensional — the dual-depth model is the bridge's core innovation), **7** (codebase — the bridge functions are pure functions testable in isolation; backward compatibility is maintained).

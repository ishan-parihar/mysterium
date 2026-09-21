# 31 — Depth Assessment Model

> **Cross-references:** [[docs/foundations/12-drive-assessment-mechanics|12 — Drive Assessment Mechanics]] · [[docs/foundations/30-holonic-curriculum-architecture|30 — Holonic Curriculum Architecture]] · [[docs/foundations/32-agentic-curriculum-linter|32 — Agentic Curriculum Linter]]
> **Status:** canonical-hypothesis (Mysterium-specific operationalization of Bloom's taxonomy, depth-of-knowledge frameworks, and dual-depth assessment for curriculum modules).
>
> **Lateral:** The model that answers HOW DEEPLY a learner understands a concept — not just whether they know it. No other document covers this: foundations/29 covers the learning process; foundations/30 covers knowledge organization; this document covers the *measurement of understanding depth* and the dual-depth model that simultaneously assesses knowledge depth and developmental capacity.
>
> **Depends on:** 29 (meta-learning science), 30 (holonic curriculum architecture), 03 (lines of intelligence), 12 (drive assessment mechanics)
> **Referenced by:** 32 (agentic curriculum linter), 34 (curriculum-engine bridge)
> **Satisfied by:** `src/core/curriculum/DepthAssessment.ts` (the depth levels and their assessment)

---

## 1. Purpose

This document answers: **How do we know whether a learner truly understands a concept, or has merely memorized it?**

The distinction between memorization and understanding is the central problem in education. A student who memorizes "F=ma" can pass a factual recall test. A student who understands F=ma can predict the behavior of a system they've never seen before. The same "knowledge" exists at radically different depths, and the curriculum must measure and respond to this difference.

This document defines:
1. The depth spectrum — seven levels from absent to transformed
2. The dual-depth model — simultaneous assessment of knowledge depth AND developmental capacity
3. The depth-level rubrics — how to differentiate between depth levels for any concept
4. The calibration system — tracking whether the learner's self-assessment matches actual depth

---

## 2. Scientific basis

### 2.1 Bloom's Taxonomy and Its Modern Revisions

Bloom's Taxonomy (1956) classified learning objectives into six levels: Knowledge, Comprehension, Application, Analysis, Synthesis, Evaluation. Anderson & Krathwohl (2001) revised it to: Remember, Understand, Apply, Analyze, Evaluate, Create.

**Key insight from cognitive science:** These levels are NOT a simple hierarchy where "higher" is always better. Research shows that:

- **Lower-order thinking depends on rich factual knowledge.** You cannot analyze or evaluate without a deep base of remembered and comprehended information (Willingham 2007).
- **The levels interact, not just stack.** A learner might "apply" a concept mechanically without truly "understanding" it — procedural fluency without conceptual understanding. Conversely, a learner might "understand" a concept deeply but struggle to "apply" it under time pressure.
- **The levels are not strictly sequential.** Learners often cycle between levels — applying a concept reveals gaps in comprehension, which triggers revisiting the principle, which enables deeper application.

**Architectural implication:** The depth levels are not a ladder to climb once. They are a spiral to traverse repeatedly. Each traversal deepens understanding. The curriculum must support this spiral, not enforce a linear progression.

### 2.2 Webb's Depth of Knowledge (DOK)

Webb's DOK framework (1997, 2002) provides a more granular classification:

| DOK Level | What it requires | Example in CS |
|---|---|---|
| **DOK 1: Recall** | Memory of facts, terms, simple procedures | "What does CPU stand for?" |
| **DOK 2: Skill/Concept** | Mental processing beyond recall; organization, comparison, explanation | "Explain the difference between a stack and a queue" |
| **DOK 3: Strategic Thinking** | Reasoning, planning, using evidence; complex, abstract thinking | "Design a system that uses both stacks and queues to solve this scheduling problem" |
| **DOK 4: Extended Thinking** | Complex, non-routine thinking across domains; synthesis, evaluation over time | "Write a research proposal comparing the efficiency of different scheduling algorithms for this specific use case" |

**Key insight:** DOK levels map to the complexity of the mental processing required, not just the difficulty of the content. A simple question can require DOK 4 thinking if it demands synthesis across multiple domains.

### 2.3 The Surface Learning vs. Deep Learning Distinction

Marton & Säljö (1976) identified two fundamentally different approaches to learning:

**Surface learning:** Focused on memorizing facts and procedures. Motivated by extrinsic pressure (passing a test). Results in transient, fragile knowledge that does not transfer. The learner reproduces content without restructuring their understanding.

**Deep learning:** Focused on creating conceptual schemas — organizing new information into a coherent structure. Motivated by genuine interest and the desire to understand. Results in durable, flexible knowledge that transfers to novel contexts. The learner transforms content by relating it to prior knowledge and examining the logic behind it.

**The critical finding:** The same student can use surface or deep approaches depending on the assessment task. If the test only asks for recall, students learn surface. If the test requires explanation and application, students learn deep. **The assessment design determines the learning approach.**

**Architectural implication:** The curriculum's assessment tasks must be designed to elicit deep learning. If we only ask "what is the answer?", we get memorization. If we ask "why is this the answer?" and "when would this NOT be the answer?", we get understanding.

### 2.4 The Inert Knowledge Problem

Whitehead (1929) identified "inert ideas" — ideas that are "merely received into the mind without being utilized, or tested, or thrown into fresh combinations." Modern cognitive science confirms:

- Knowledge learned in isolation (without connection to application contexts) becomes inert
- Knowledge learned through rote memorization (without conceptual understanding) becomes inert
- Knowledge learned in a single context (without multiple representations) becomes inert

**The remedy:** Transfer requires structural understanding. When learners grasp the *deep structure* of a concept (not just the surface features), they can recognize that structure in new contexts and apply it. This requires:
1. Multiple representations (same concept in different formats)
2. Analogical mapping (same structure in different domains)
3. Self-explanation (explaining the logic to oneself)
4. Varied practice (applying the concept in diverse contexts)

### 2.5 The Dual-Depth Problem

Mysterium's unique contribution is the recognition that knowledge depth and developmental capacity are orthogonal dimensions that must be assessed simultaneously:

- A learner might have HIGH knowledge depth (understands physics deeply) but LOW developmental capacity (approaches physics with ego-driven competitiveness, intellectual bypass, or rigid perfectionism)
- A learner might have LOW knowledge depth (memorized physics facts) but HIGH developmental capacity (approaches physics with genuine curiosity, humble uncertainty, and willingness to be wrong)

The dual-depth model captures both:
- **Knowledge depth:** How deeply does the learner understand THIS concept?
- **Developmental depth:** How does the learner RELATE to this knowledge? What drives are active? What shadows are surfacing?

The bridge between them: when a learner reaches "transformed" depth on a concept, the developmental engine records this as a high-integration signal. When a learner shows knowledge-avoidance or intellectual bypass, the developmental engine records shadow material.

---

## 3. Game-design mapping

### 3.1 The seven depth levels as assessment tiers

| Depth Level | What the learner can do | Assessment method | Mysterium MeasureDimensions |
|---|---|---|---|
| **Absent** | Cannot recall or recognize | Cannot answer any question about the concept | N/A |
| **Memorized** | Can recall facts verbatim | Factual recall: "What is X?" | accuracy only |
| **Comprehended** | Can explain in own words, give examples | Self-explanation: "Explain why X works" | accuracy + depth |
| **Applied** | Can use the principle to solve novel problems | Application task: "Solve this problem using X" | accuracy + transfer + complexity_handled |
| **Analyzed** | Can decompose, identify assumptions, see relationships | Analysis task: "Break down X into its components" | depth + complexity_handled + coherence |
| **Evaluated** | Can judge quality, weigh evidence, critique | Evaluation task: "Is this reasoning sound? Why?" | depth + coherence + integration |
| **Transformed** | Can teach, synthesize across domains, create new applications | Creation task: "Explain X to a beginner" or "Combine X with Y to solve Z" | integration + transfer + metacognition |

### 3.2 The depth progression as a spiral

The depth levels are not a ladder — they are a spiral. Each traversal of the spiral deepens understanding:

```
First encounter: Memorized → Comprehended → Applied (if the learner progresses)
Review 1: Applied → Analyzed (deeper application)
Review 2: Analyzed → Evaluated (critical assessment)
Review 3: Evaluated → Transformed (synthesis and teaching)
```

Each review uses a different modality and context:
- First encounter: Direct instruction + guided practice (modality: deterministic + reflective)
- Review 1: Novel problem set (modality: scenario-choice + strategic)
- Review 2: Critique a flawed explanation (modality: reflective + social)
- Review 3: Teach it to someone else (modality: social + immersive)

### 3.3 The dual-depth assessment in practice

Every curriculum encounter produces TWO scores:

**Score 1: Knowledge Depth** (which Bloom's level was demonstrated)
- Measured by the type of task the learner succeeded at
- Supported by the quality of their response (LLM-scored for open-ended tasks)

**Score 2: Developmental Signal** (what drives and shadows appeared)
- Measured by the drive-probe embedded in the encounter
- Detected by shadow keywords in the learner's responses
- Assessed by the LLM's evaluation of the learner's tone, approach, and self-assessment

**Example — a learner studying "Recursion":**

| Dimension | What we measure | What it reveals |
|---|---|---|
| Knowledge depth | Can they write a recursive function? Explain why it works? Apply it to a novel problem? | Memorized → Applied |
| Agency drive | Did they attempt the problem independently, or immediately ask for help? | Healthy agency vs. dependency |
| Eros drive | Did they show genuine curiosity about how recursion works, or just want the answer? | Growth-seeking vs. performance-seeking |
| Shadow detection | Did they say "I'm stupid, I'll never get this"? | Dark-Allergy shadow surfacing |
| Metacognition | Did they accurately predict whether they would succeed? | Calibration accuracy |

The encounter produces:
- Knowledge depth: "Applied" (correct solution, some transfer)
- Developmental signal: Healthy agency, moderate erosion, no shadow
- Metacognition: Calibration error of 0.2 (slightly overconfident)

### 3.4 How depth levels affect scheduling (mastery sequencing)

The depth level achieved determines what the scheduler selects next. This IS the
mastery-sequencing rule: mastery sequences are not a separate curriculum queue — they
are the depth ladder consumed by the SAME scheduler that delivers developmental
catalyst (24 §3.2.8 wires this into the priority formula as one criterion among
seven, not a parallel engine).

| Achieved depth | Scheduler behavior |
|---|---|
| **Absent** | Schedule the concept for first encounter at "memorized" depth |
| **Memorized** | Schedule review at "comprehended" depth (explanation task) |
| **Comprehended** | Schedule application task at "applied" depth |
| **Applied** | Interleave with related concepts; schedule analysis task |
| **Analyzed** | Introduce cross-domain analogies; schedule evaluation task |
| **Evaluated** | Schedule creation/teaching task |
| **Transformed** | Mark as "integrated"; reduce review frequency; use as analogical anchor for other concepts |

**Blind-spot catalyst (the catalyst-loop behaviour, added 2026-09-17).** When the
scheduler targets a concept, it does not present the concept's frontier depth task
cold — it selects catalysts from the concept's **blind-spot adjacency map** (§3.5a):
adjacent concepts and prerequisite-of-prerequisite concepts whose evidence profile
suggests a gap. Concretely, the encounter mix for a developing concept includes:

- **adjacent-concept probes** — tasks in structurally neighbouring concepts that test
  whether the current concept's pattern transferred (cognitive-flexibility probe);
- **prerequisite-failure probes** — tasks at the failing prerequisite's depth, when
  prereq closure (§3.5a) flags it, so the learner rebuilds the foundation in context;
- **sibling-confusion probes** — contrast tasks between the concept and its declared
  confusable siblings (the misconception map's structural cousins);
- **overgeneralization probes** — "when would this NOT apply" tasks targeting the
  declared boundary conditions.

This is exactly how the developmental catalyst loop works (10–14): probe the edge,
surface the gap as experience, integrate. The knowledge-depth loop runs the same
shape at the syllabus ladder. The linter (32 E4/E5) guarantees every concept ships
with this map populated, so the scheduler never probes blind.

### 3.5a Depth closure, blind-spot adjacency, and the depth ceiling (added 2026-09-17)

Three structural computations the linter (32 Category E) and the scheduler both
consume. They close the gap between "prerequisite exists" and "prerequisite
understood deeply enough to build on."

**1. Prerequisite depth closure.** Every prerequisite edge carries a minimum depth.
Closure is computed over the concept's whole prerequisite subgraph:

```ts
interface PrereqEdge {
  readonly prerequisiteId: string;
  readonly minDepth: DepthLevel;      // NOT mere existence — required depth
}

/** Depth-closure check: does every prerequisite chain ground at sufficient depth? */
function depthClosureSatisfied(
  conceptId: string,
  edges: readonly PrereqEdge[],
  state: Record<string, { depth: DepthLevel; retention: number }>,
): { satisfied: boolean; unsatisfied: readonly { conceptId: string; required: DepthLevel; actual: DepthLevel }[] }
```

Rules: retention below the concept's retention floor (0.4, aligned with 42's demotion
bar semantics) demotes the effective depth one level for closure purposes — a decayed
prerequisite is a shallower prerequisite (forgetting is real developmental
information, 42 §2). Unsatisfied closure caps the branch rung (42 §3.2's prereq
closure) and routes the scheduler to prerequisite-failure probes (§3.4).

**2. Blind-spot adjacency map.** Every concept declares its structural neighbours and
the failure classes each neighbour diagnoses. The linter (32 E4/E5) enforces
population; the scheduler (§3.4) consumes it:

```ts
type BlindSpotClass =
  | 'prereq-failure'          // the foundation is missing or decayed
  | 'sibling-confusion'       // structurally similar concept is conflated
  | 'overgeneralization'      // the pattern is applied beyond its boundary
  | 'principle-absence';      // the underlying mechanism was never grasped

interface BlindSpotEntry {
  readonly adjacentConceptId: string;
  readonly relationship: 'prerequisite-of-prerequisite' | 'sibling' | 'application-domain' | 'boundary-case';
  readonly failureClass: BlindSpotClass;
  readonly evidenceNote: string;      // why this adjacency diagnoses this failure class
}
```

**3. The depth ceiling.** Some concepts legitimately top out (31 §5's depth-ceiling
problem, resolved): a concept may declare `depthCeiling?: DepthLevel` — the highest
depth that is epistemically meaningful for it ("the speed of light is 3×10⁸ m/s"
ceils at `memorized`). Effects: the scheduler stops offering tasks above the ceiling
(the spiral stops there, honestly — no forced depth for depth's sake); closure
requirements citing that concept can never demand more than its ceiling; the linter
(32 E1) exempts ceiling levels from the completeness requirement.

### 3.5 The dual-depth assessment in practice

---

## 4. Architectural contract

### 4.1 Depth Level Types

```typescript
type DepthLevel = 
  | 'absent' 
  | 'memorized' 
  | 'comprehended' 
  | 'applied' 
  | 'analyzed' 
  | 'evaluated' 
  | 'transformed';

const DEPTH_LEVEL_ORDER: readonly DepthLevel[] = [
  'absent', 'memorized', 'comprehended', 'applied', 
  'analyzed', 'evaluated', 'transformed'
];

function depthOrdinal(level: DepthLevel): number {
  return DEPTH_LEVEL_ORDER.indexOf(level);
}
```

### 4.2 The Depth Rubric

```typescript
interface DepthRubric {
  readonly conceptId: string;
  readonly levels: Record<DepthLevel, DepthLevelRubricEntry>;
  /** Minimum required depth per prerequisite edge (§3.5a; linter 32 E3). */
  readonly prereqEdges: readonly PrereqEdge[];
  /** Structural neighbours that diagnose this concept's failure classes (§3.5a; 32 E4/E5). */
  readonly blindSpots: readonly BlindSpotEntry[];
  /** Highest epistemically meaningful depth for this concept (§3.5a; 32 E1). */
  readonly depthCeiling?: DepthLevel;
}

interface DepthLevelRubricEntry {
  /** What evidence distinguishes this depth level */
  readonly evidence: string;
  /** What the learner can do at this level */
  readonly canDo: readonly string[];
  /** What the learner CANNOT yet do */
  readonly cannotDo: readonly string[];
  /** Task types appropriate for assessing this level */
  readonly appropriateTasks: readonly CurriculumTaskType[];
  /** Threshold score to be classified at this level (0-1) */
  readonly threshold: number;
  /** LLM rubric prompt for scoring open-ended responses */
  readonly llmRubric?: string;
}
```

### 4.3 The Dual-Depth Result

```typescript
interface DualDepthResult {
  readonly conceptId: string;
  readonly timestamp: number;
  
  /** Knowledge depth assessment */
  readonly knowledgeDepth: {
    readonly level: DepthLevel;
    readonly confidence: number;
    readonly evidence: readonly string[];
    /** Dimension scores from the assessment */
    readonly dimensions: Record<MeasureDimension, number>;
  };
  
  /** Developmental signal assessment */
  readonly developmentalSignal: {
    readonly driveScores: Record<Drive, number>;
    readonly driveSignals: Record<Drive, DriveSignal>;
    readonly shadowDetected: ShadowQuadrant | null;
    readonly shadowIntensity: number;
  };
  
  /** Metacognitive calibration */
  readonly metacognition: {
    readonly predictedDepth: DepthLevel;
    readonly actualDepth: DepthLevel;
    readonly calibrationError: number;
    readonly confidenceInPrediction: number;
  };
}
```

### 4.4 The Forgetting Curve for Depth Levels

Each depth level has its own retention curve. Deeper levels are more durable:

```typescript
interface DepthRetention {
  readonly conceptId: string;
  readonly currentDepth: DepthLevel;
  /** Retention at the current depth level */
  readonly retention: number;
  /** Half-life depends on depth: deeper = longer */
  readonly halfLifeMs: number;
  /** When last assessed at this depth */
  readonly lastAssessedAt: number;
  /** Number of times this depth level was successfully demonstrated */
  readonly demonstrationCount: number;
}

/** Half-life increases with depth level */
function computeHalfLife(depth: DepthLevel, baseHalfLife: number): number {
  const multipliers: Record<DepthLevel, number> = {
    absent: 0,
    memorized: 1,
    comprehended: 2,
    applied: 4,
    analyzed: 8,
    evaluated: 16,
    transformed: 32,
  };
  return baseHalfLife * (multipliers[depth] ?? 1);
}
```

---

## 5. Open questions

- **The depth-level classification problem.** Automatically classifying a learner's response into a depth level is non-trivial. Factual recall (memorized vs. absent) is straightforward. But distinguishing "comprehended" from "applied" from "analyzed" requires nuanced LLM evaluation. The rubrics must be concept-specific, not generic.

- **The calibration problem.** Learners are notoriously poor at judging their own understanding. The system tracks calibration accuracy, but what happens when a learner is chronically overconfident? Should the system reduce the weight of self-assessment? Or should it explicitly teach calibration as a metacognitive skill?

- **The depth-ceiling problem.** Some concepts may have a natural depth ceiling — "memorized" is all that's needed for certain facts (e.g., "the speed of light is 3×10^8 m/s"). The system must recognize when deeper understanding is not needed and not force unnecessary depth. *(Resolved 2026-09-17: §3.5a's `depthCeiling` declaration; 32 E1 exempts ceiling levels; the scheduler stops the spiral at the ceiling.)*

- **Cross-concept depth interaction.** Understanding concept A at "applied" depth may depend on understanding concept B at "comprehended" depth. The depth rubrics must account for prerequisite depth requirements, not just prerequisite existence. *(Resolved 2026-09-17: §3.5a's `PrereqEdge.minDepth` + depth-closure computation; 32 E3 enforces at the gate; 42 §3.2's prereq closure consumes it.)*

- **The developmental signal reliability.** The drive and shadow signals embedded in curriculum encounters are indirect measures. A learner might show healthy drive scores on curriculum tasks but unhealthy drive patterns in free play. The dual-depth model must be validated against ecological behavior.

---

## 6. Principles served

Principles **1** (what the game trains — the depth model defines WHAT level of understanding is being trained), **2** (validity — grounded in Bloom's, Webb's, and Marton & Säljö's research), **3** (adaptive — the depth level determines what the scheduler selects next), **4** (earned progression — depth levels must be demonstrated, not assumed), **5** (multi-dimensional — the dual-depth model adds knowledge depth AND developmental signal), **7** (codebase — DepthLevel, DepthRubric, and DualDepthResult are pure types testable in isolation).

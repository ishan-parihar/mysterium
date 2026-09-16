# 35 — Framework Complexity × Curriculum Mapping

> **Cross-references:** [[docs/foundations/30-holonic-curriculum-architecture|30 — Holonic Curriculum Architecture]] · [[docs/foundations/31-depth-assessment-model|31 — Depth Assessment Model]] · [[docs/foundations/36-curriculum-upgrade-plan|36 — Curriculum Upgrade Plan]]
> **Status:** canonical-hypothesis (mapping KosmOS framework-complexity line to Mysterium curriculum architecture).
>
> **Lateral:** How the structural complexity of conceptual frameworks (the framework-complexity line from the KosmOS ontology) maps to curriculum holon levels, depth rubrics, assessment modalities, and pedagogical strategies. No other document covers this: foundations/30 covers *how knowledge is organized* (the holonic structure); this document covers *how framework complexity determines what the curriculum must teach and how*. Foundations/29 covers *how learning happens* (the process); this document covers *what level of complexity the learner is navigating*.
>
> **Depends on:** 29 (meta-learning science), 30 (holonic curriculum architecture), 31 (depth assessment model)
> **Referenced by:** 36 (curriculum upgrade plan)
> **Heading contract:** working-mapping format — Purpose, Open Questions, and Principles served are carried by the numbered section set below; the six-heading contract applies in substance, not literal headings.

---

## 1. Purpose

This document answers: **How does the framework-complexity line — the structural complexity of conceptual frameworks, formal systems, and epistemic architectures — determine what the curriculum must teach, at what depth, and through what pedagogical strategy?**

The framework-complexity line (KosmOS `_Ontology/lines/framework-complexity`) measures the maximum order of hierarchical embedding, recursive self-reference, and cross-paradigm integration a framework can sustain. It is the *epistemic skeleton* upon which all other lines of intelligence build their domain-specific knowledge.

**Note on stage count:** The KosmOS ontology defines 17 IST stage directories (01–17) for this line, while the original line definition header references `matrix_cells_required: 13`. The 17-stage ladder below reflects the actual directory structure and is the authoritative source. The 13-cell reference in the header is a legacy artifact from the initial stub.

**The key insight:** A curriculum that only teaches *content* (facts, procedures, applications) without teaching *framework complexity* (how to construct, compare, and transcend formal systems) will produce learners who can operate within a single paradigm but cannot navigate paradigm shifts, integrate cross-domain insights, or generate novel theoretical frameworks.

---

## 2. The 17 IST Framework-Complexity Stages

The KosmOS ontology defines 17 stages for the framework-complexity line, mapped from Commons' Model of Hierarchical Complexity (MHC) and Kegan's orders of consciousness:

### 2.1 The Stage Ladder

| IST # | Stage Name | MHC Order | Kegan | Altitude | Framework Density | Curriculum Implication |
|:---:|---|:---:|:---:|---|---|---|
| 1 | Prehension | 1 | 1 | Infrared | Pre-conceptual | No curriculum — sensory grounding only |
| 2 | Irritability | 2 | 1 | Magenta | Sensorimotor reflex | No curriculum — reflexive response |
| 3 | Basic Impulse | 3 | 2 | Red | Single-concept | Isolated facts, no relations |
| 4 | Emotion Complex | 4 | 2 | Red | Associative | Simple associations, categorical sorting |
| 5 | Sensory-Motor | 5 | 2 | Red/Magenta | Procedural | Step-by-step procedures, algorithms |
| 6 | Nominal & Rule | 6 | 3 | Amber | Rule-governed | Rules, taxonomies, classification systems |
| 7 | Sentential & Faith | 6+ | 3 | Amber | Authority-based | Dogmatic frameworks, sacred canon |
| 8 | Preoperational | 7 | 3 | Amber | Empirical | Basic scientific method, evidence-based reasoning |
| 9 | Primary / Modern | 8 | 3+ | Orange | Formal-operational | Axiomatic systems, logical deduction, proof |
| 10 | Concrete Peak | 9 | 4 | Orange | Systematic | Systems thinking, multi-variable analysis |
| 11 | Abstract Emerge | 10 | 4 | Orange/Green | Meta-systematic | Comparing systems, paradigm awareness |
| 12 | Formal Landmark | 11 | 5 | Green/Teal | Formal meta-systematic | Creating novel meta-frameworks |
| 13 | Systematic Green | 12 | 5 | Green | Paradigmatic | Paradigm-internal coherence, paradigm as object |
| 14 | Metasystematic Teal | 13 | 5+ | Teal | Metasystematic | Cross-paradigm translation, universal meta-principles |
| 15 | Paradigmatic Turquoise | 14 | 5++ | Turquoise | Cross-paradigmatic | Mapping relationships between incommensurable paradigms |
| 16 | Cross-paradigmatic | 15 | 6 | Indigo | Cross-paradigmatic | Translating truths across worldviews without reduction |
| 17 | Meta-cross Violet | 16 | 6+ | Violet | Meta-cross-paradigmatic | Nondual unification of all frameworks |

### 2.2 The Four Tiers of Curriculum Complexity

For practical curriculum design, the 17 stages collapse into four tiers:

**Tier 1: Foundational (Stages 1–5)** — *What is this?*
- Isolated concepts, simple associations, procedural knowledge
- Curriculum level: **concept** and **instance**
- Assessment: factual recall, procedural execution
- No framework comparison possible — the learner operates within a single framework

**Tier 2: Systematic (Stages 6–10)** — *How does this work?*
- Rule-governed systems, taxonomies, formal operations, systems thinking
- Curriculum level: **topic** and **concept**
- Assessment: application, analysis, structural reasoning
- Single-framework mastery — the learner can operate fluently within one paradigm

**Tier 3: Meta-systematic (Stages 11–14)** — *How do frameworks relate?*
- Comparing systems, creating meta-frameworks, cross-paradigm translation
- Curriculum level: **subject** and **topic**
- Assessment: evaluation, synthesis, paradigm comparison
- Multi-framework navigation — the learner can move between paradigms and translate

**Tier 4: Trans-paradigmatic (Stages 15–17)** — *What transcends all frameworks?*
- Mapping incommensurable paradigms, nondual unification
- Curriculum level: **branch** and **subject**
- Assessment: creation, original contribution, teaching
- Framework-transcendent knowing — the learner can generate novel frameworks

---

## 3. Mapping to CurriculumHolon Architecture

### 3.1 HolonLevel ↔ Framework-Complexity Tier

The five `HolonLevel` values in the `CurriculumHolon` type map to the four tiers. The overlap between tiers is intentional — a `concept` at IST stage 10 (Concrete Peak) has different framework complexity than one at stage 3 (Basic Impulse), even though both are at the same holon level. The tier represents the *maximum* complexity the holon can sustain:

```
HolonLevel          Framework-Complexity Tier         IST Stages    Depth Range
──────────────────────────────────────────────────────────────────────────────
instance            Tier 1: Foundational              1–5           memorized
concept             Tier 1→2: Foundational→Systematic  3–10        memorized → evaluated
topic               Tier 2→3: Systematic→Meta          6–14       comprehended → transformed
subject             Tier 3→4: Meta→Trans               10–17      applied → transformed
branch              Tier 4: Trans-paradigmatic         14–17       evaluated → transformed
```

**The critical design principle:** Each holon level is not just a filing category — it represents a *qualitatively different kind of knowing*. A `concept`-level holon asks "what is this and how does it work?" A `topic`-level holon asks "how do multiple concepts relate within a coherent system?" A `subject`-level holon asks "how do multiple topics compare across paradigms?" A `branch`-level holon asks "what universal principles govern all subjects in this domain?"

### 3.2 Depth Rubric Calibration by Tier

The depth rubric on each `CurriculumHolon` must be calibrated to the framework-complexity tier:

**Tier 1 (concept/instance) — Foundational Depth Rubric:**

| Level | Evidence | Appropriate Tasks |
|---|---|---|
| memorized | Can recall definitions and identify examples | factual_recall |
| comprehended | Can explain in own words, identify non-examples | concept_explanation |
| applied | Can solve standard problems using the concept | application_problem |
| analyzed | Can decompose the concept into components | case_study_analysis |
| evaluated | Can judge when the concept applies and when it doesn't | peer_review |
| transformed | Can teach the concept and create novel instances | peer_teaching, creative_synthesis |

**Tier 2 (topic) — Systematic Depth Rubric:**

| Level | Evidence | Appropriate Tasks |
|---|---|---|
| memorized | Can recall the topic's structure and key relationships | factual_recall |
| comprehended | Can explain how the concepts within the topic interrelate | concept_explanation |
| applied | Can use the topic's framework to solve multi-concept problems | application_problem |
| analyzed | Can identify the topic's assumptions, boundary conditions, and failure modes | case_study_analysis |
| evaluated | Can compare the topic's framework to alternative approaches | peer_review, debate_position |
| transformed | Can synthesize the topic with other topics to create new frameworks | creative_synthesis, project_based |

**Tier 3 (subject) — Meta-systematic Depth Rubric:**

| Level | Evidence | Appropriate Tasks |
|---|---|---|
| memorized | Can recall the subject's major paradigms and their historical development | factual_recall |
| comprehended | Can explain how different paradigms within the subject relate to each other | concept_explanation |
| applied | Can apply cross-paradigm insights to novel problems | application_problem |
| analyzed | Can decompose paradigms into their axiomatic foundations | case_study_analysis, research_question |
| evaluated | Can judge which paradigm is most appropriate for a given context | peer_review, debate_position |
| transformed | Can create novel paradigms that transcend existing ones | creative_synthesis, project_based |

**Tier 4 (branch) — Trans-paradigmatic Depth Rubric:**

| Level | Evidence | Appropriate Tasks |
|---|---|---|
| memorized | Can recall the branch's foundational principles and their interconnections | factual_recall |
| comprehended | Can explain how the branch's principles apply across all subjects | concept_explanation |
| applied | Can use the branch's principles to design novel educational experiences | application_problem |
| analyzed | Can decompose the branch's assumptions and identify their limits | research_question |
| evaluated | Can judge the branch's completeness and identify gaps | peer_review, debate_position |
| transformed | Can extend the branch's principles to domains they were not designed for | creative_synthesis, project_based |

---

## 4. Pedagogical Strategy by Tier

### 4.1 The Constructivism–Direct Instruction Gradient

Per foundations/29 §2.8, the pedagogical approach must shift based on the learner's depth level:

| Tier | Novice (memorized/comprehended) | Intermediate (applied/analyzed) | Advanced (evaluated/transformed) |
|---|---|---|---|
| **Tier 1** | Direct instruction: explicit definitions, worked examples | Guided inquiry: structured problems with hints | Open inquiry: novel problems, self-directed exploration |
| **Tier 2** | Direct instruction: framework presentation, comparisons | Guided inquiry: multi-concept problem solving | Open inquiry: framework critique, alternative construction |
| **Tier 3** | Direct instruction: paradigm mapping, historical context | Guided inquiry: cross-paradigm analysis | Open inquiry: paradigm creation, meta-framework design |
| **Tier 4** | Direct instruction: foundational principles, lineage | Guided inquiry: principle application across domains | Open inquiry: principle extension, novel domain creation |

### 4.2 Modality Alignment by Tier

The seven Mysterium modalities (foundations/11) map to framework-complexity tiers:

| Modality | Tier 1 Strength | Tier 2 Strength | Tier 3 Strength | Tier 4 Strength |
|---|---|---|---|---|
| Deterministic | ★★★ (quizzes, fact recall) | ★★ (procedural application) | ★ (limited) | — |
| Strategic | ★★ (pattern recognition) | ★★★ (systems optimization) | ★★ (paradigm strategy) | ★ (meta-strategy) |
| Embodied | ★★★ (sensory grounding) | ★★ (procedural embodiment) | ★ (limited) | — |
| ScenarioChoice | ★★★ (concrete dilemmas) | ★★★ (multi-variable trade-offs) | ★★★ (paradigm choice) | ★★ (meta-paradigm choice) |
| LanguageReflective | ★★ (definition explanation) | ★★★ (framework articulation) | ★★★ (paradigm comparison) | ★★★ (trans-paradigm discourse) |
| SocialCooperative | ★★ (peer teaching basics) | ★★★ (collaborative problem-solving) | ★★★ (cross-paradigm dialogue) | ★★★ (collective framework creation) |
| ImmersiveRPG | ★★★ (narrative grounding) | ★★★ (systems-in-context) | ★★★ (paradigm-as-worldview) | ★★★ (framework-transcendent experience) |

### 4.3 Assessment Strategy by Tier

| Tier | Primary Assessment | Secondary Assessment | Avoid |
|---|---|---|---|
| **Tier 1** | Factual recall, worked examples | Concept explanation, analogy | Open-ended research |
| **Tier 2** | Application problems, case studies | Structural analysis, comparison | Paradigm-level critique |
| **Tier 3** | Cross-paradigm analysis, synthesis | Evaluation of competing frameworks | Premature original contribution |
| **Tier 4** | Original research, teaching | Framework creation, meta-analysis | Rote repetition |

---

## 5. The Curriculum Expansion Contract

### 5.1 Adding a New Branch to the Curriculum

When adding a new branch (e.g., "physics", "biology", "humanities"), the following contract must be satisfied:

1. **Branch holon** must exist at `level: 'branch'` with `parentId: null`
2. **Subject holons** under the branch must exist at `level: 'subject'`
3. **Topic holons** under each subject must exist at `level: 'topic'`
4. **Concept holons** under each topic must exist at `level: 'concept'`
5. **Instance holons** under each concept must exist at `level: 'instance'`
6. **Every holon** must have all five phases (observation → creation)
7. **Every holon** must have a depth rubric calibrated to its tier
8. **Prerequisites** must be explicitly declared and form a DAG (no cycles)
9. **Cross-domain isomorphisms** must be structurally valid (not surface similarity)
10. **The CurriculumLinter** must pass with 0 errors on the new data

### 5.2 The Minimum Viable Curriculum Per Branch

A branch is considered "curriculum-complete" when it has:

- 1 branch holon
- At least 2 subject holons
- At least 3 topic holons per subject
- At least 3 concept holons per topic
- At least 2 instance holons per concept
- Complete depth rubrics at all levels
- At least 1 cross-domain isomorphism per concept
- At least 1 misconception per concept at Tier 2+

**Minimum for a branch:** 1 (branch) + 2 (subjects) + 2×3 (topics) + 2×3×3 (concepts) + 2×3×3×2 (instances) = 1 + 6 + 18 + 36 + 36 = **97 holons**

### 5.3 The Scaling Projection

For a full graduation-level curriculum across 4 major branches:

| Branch | Subjects | Topics | Concepts | Instances | Total |
|---|:---:|:---:|:---:|:---:|:---:|
| Formal Sciences (CS, Math, Logic) | 6 | 18 | 54 | 108 | **186** |
| Natural Sciences (Physics, Chemistry, Biology) | 6 | 18 | 54 | 108 | **186** |
| Social Sciences (Psychology, Sociology, Economics) | 6 | 18 | 54 | 108 | **186** |
| Humanities (Philosophy, History, Literature) | 6 | 18 | 54 | 108 | **186** |
| **Total** | **24** | **72** | **216** | **432** | **744** |

For Ph.D.-level depth (adding research-level holons):

| Level | Count | Description |
|---|:---:|---|
| Branch | 4 | Top-level domains |
| Subject | 24 | Major disciplines |
| Topic | 72 | Sub-disciplines |
| Concept | 216 | Core concepts |
| Instance | 432 | Specific applications |
| Research | 50–100 | Thesis-level original contributions |
| **Total** | **~850** | Full graduation-level curriculum |

---

## 6. The Framework-Complexity Ladder in Practice

### 6.1 How a Learner Climbs the Ladder

A learner does not climb all 17 framework-complexity stages in a single domain. Instead, they climb *within each domain* at their own pace:

**Example: Computer Science curriculum**

```
Tier 1 (Foundational):
  concept: "variable" → memorized → comprehended → applied
  concept: "function" → memorized → comprehended → applied
  concept: "loop" → memorized → comprehended → applied

Tier 2 (Systematic):
  topic: "control flow" → comprehends how variables, functions, loops interrelate
  topic: "data structures" → comprehends how arrays, trees, graphs relate

Tier 3 (Meta-systematic):
  subject: "computer science" → compares imperative vs. declarative vs. functional paradigms
  subject: "theory of computation" → compares Turing machines vs. lambda calculus vs. cellular automata

Tier 4 (Trans-paradigmatic):
  branch: "formal sciences" → maps the universal principles of abstraction, computation, and information across CS, math, and logic
```

### 6.2 The Cross-Domain Bridge

The framework-complexity line enables *cross-domain bridges* that lower lines cannot:

| Bridge Pattern | CS Instance | Math Instance | Physics Instance | Biology Instance |
|---|---|---|---|---|
| **Abstraction** | Function hides implementation | Set abstracts over elements | Model abstracts over reality | Taxonomy abstracts over organisms |
| **Optimization** | Minimize time complexity | Minimize cost function | Minimize action principle | Maximize fitness |
| **Trade-offs** | Time vs. space | Accuracy vs. complexity | Energy vs. entropy | Speed vs. accuracy |
| **State** | Program state | Differential equation state | Phase state | Homeostatic state |
| **Emergence** | Cellular automata | Chaos theory | Phase transitions | Consciousness |

These bridges are *not* surface analogies — they are structural isomorphisms that the learner can only perceive when they reach Tier 3 (meta-systematic) framework complexity. The curriculum must plant seeds at Tier 1 (simple analogies) and activate them at Tier 3 (formal mappings).

---

## 7. Integration with Mysterium's Existing Architecture

### 7.1 How Framework Complexity Maps to the 8 × 8 Matrix

The framework-complexity line is NOT one of Mysterium's 8 canonical lines. Instead, it is a *meta-line* that determines the **depth** at which all 8 lines operate:

| Mysterium Line | Tier 1 Expression | Tier 2 Expression | Tier 3 Expression | Tier 4 Expression |
|---|---|---|---|---|
| Cognitive | Recognize patterns | Apply logical operations | Compare reasoning frameworks | Create novel epistemologies |
| Emotional | Identify emotions | Regulate emotional responses | Navigate emotional paradigms | Transcend emotional frameworks |
| Moral | Follow rules | Apply ethical principles | Compare ethical systems | Create novel ethical frameworks |
| Intrapersonal | Self-observe | Self-regulate | Compare self-models | Transcend self-concept |
| Spiritual | Experience awe | Practice spiritual disciplines | Compare spiritual traditions | Unify spiritual frameworks |
| Somatic | Body awareness | Body control | Compare somatic practices | Transcend body-mind duality |
| Willpower | Resist impulse | Sustain effort | Compare motivational frameworks | Transcend will-power duality |
| Interpersonal | Social awareness | Social skill | Compare social theories | Create novel social structures |

### 7.2 How the CCI Integrates Framework Complexity

The CCI's `knowledgeHealth` dimension (foundations/25) currently tracks concept coverage, depth, retention, integration, and misconceptions. To integrate framework complexity, the following additions are needed:

1. **Framework tier tracking:** Each concept's `ConceptState` should record the framework-complexity tier at which it was mastered (not just the depth level).
2. **Cross-paradigm integration density:** The `integrationDensity` metric should weight cross-paradigm isomorphisms more heavily than within-paradigm connections.
3. **Meta-framework creation capacity:** A new sub-dimension tracking the learner's ability to generate novel frameworks (assessed through `creative_synthesis` task types).

---

## 8. Open Questions

1. **Can framework complexity be taught, or only recognized?** The literature suggests that framework complexity develops through exposure to increasingly complex frameworks, but the mechanism is not well-understood. The curriculum should provide *scaffolded exposure* to higher-complexity frameworks while respecting the learner's current tier.

2. **How do we assess framework complexity without circularity?** If the assessment itself requires a certain framework complexity to understand, how do we assess a learner who hasn't reached that tier? The answer: use *lower-tier assessment tasks* that probe the learner's *readiness* for the next tier, not the tier itself.

3. **What is the relationship between framework complexity and developmental stage?** The framework-complexity line tracks *epistemic* complexity, while Mysterium's 8 lines track *developmental* capacity. A learner can be at Stage 5 (Green) developmentally but only Tier 2 (Systematic) in framework complexity for a new domain. The two are correlated but independent.

4. **How does the curriculum handle genuinely novel frameworks?** When a learner reaches Tier 4 (trans-paradigmatic) in a domain, they may generate frameworks that don't exist in the seed data. The curriculum must have a mechanism for *accepting* novel frameworks as valid instances — this is the `research` holon level.

---

## 9. Principles served

Principles **1** (what the game trains — extends training to include framework complexity as a meta-dimension), **2** (validity — grounded in Commons MHC and Kegan's orders), **3** (adaptive — tier-aware pedagogy), **4** (earned progression — framework complexity must be demonstrated), **5** (multi-dimensional — framework complexity adds a new assessment dimension across all 8 lines), **7** (codebase — the tier mapping and depth rubric calibration are data-driven).

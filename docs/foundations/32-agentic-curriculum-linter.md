# 32 — Agentic Curriculum Linter

> **Cross-references:** [[docs/foundations/30-holonic-curriculum-architecture|30 — Holonic Curriculum Architecture]] · [[docs/foundations/31-depth-assessment-model|31 — Depth Assessment Model]]
> **Status:** canonical-hypothesis (Mysterium-specific agentic workflow for curriculum validation).
>
> **Lateral:** The validation workflow that ensures curriculum content is pedagogically sound, holonically coherent, and developmentally integrated. No other document covers this: foundations/29 covers learning science; foundations/30 covers holonic structure; foundations/31 covers depth assessment. This document covers the *agent-based validation process* that ensures all three are satisfied before content reaches the learner.
>
> **Depends on:** 29 (meta-learning science), 30 (holonic curriculum architecture), 31 (depth assessment model)
> **Referenced by:** 34 (curriculum-engine bridge)

---

## 1. Purpose

This document answers: **How do we validate that curriculum content is pedagogically effective, structurally coherent, and developmentally integrated — before it reaches the learner?**

The curriculum linter is NOT a static analysis tool or a code linter. It is an **agentic workflow** — a multi-step AI-agent process that validates curriculum content based on meta-learning principles, subject topology, ontology, and epistemics. It is analogous to a skill-creator workflow: it allows AI agents to create, validate, and refine curriculum modules that align with the core meta-learning and surface-to-depth transformation model, and that effectively plug into the Mysterium system's hooks.

The linter answers three questions:
1. **Is this curriculum structurally sound?** (prerequisites, depth progression, metadata completeness)
2. **Is this curriculum pedagogically effective?** (does it leverage desirable difficulties, spaced repetition, multiple representations, elaborative interrogation?)
3. **Is this curriculum developmentally integrated?** (does it exercise the claimed developmental lines, map to the correct stages, connect to the Significator?)

---

## 2. Scientific basis

### 2.1 Why Agentic, Not Static

A static linter can check structural invariants (no cycles, metadata completeness, depth monotonicity). But it cannot check:

- Whether the rubric genuinely differentiates between memorization and comprehension
- Whether the analogical connections are structurally valid (not just surface-similar)
- Whether the misconception coverage is pedagogically sufficient
- Whether the content actually leverages desirable difficulties
- Whether the developmental mapping is authentic (the assessment tasks really do exercise the claimed lines)

These require **judgment** — the kind of judgment that comes from understanding pedagogy, domain knowledge, and developmental psychology simultaneously. An AI agent with the right prompt engineering and reference materials can make these judgments.

### 2.2 The Three-Agent Architecture

The linter uses a **Generator → Critic → Integrator** pipeline:

**Agent 1: The Curriculum Generator**
- Creates curriculum content following the holonic structure template
- Input: topic specification (subject, concept, target depth, target lines)
- Output: complete curriculum module with all metadata
- Constrained by: the holonic structure template (foundations/30), the depth rubric patterns (foundations/31)

**Agent 2: The Curriculum Critic**
- Validates generated content against meta-learning principles and structural invariants
- Input: generated module + existing knowledge graph
- Output: validation report (errors, warnings, infos)
- Uses: meta-learning principles checklist (§3.2), holonic continuity checks (§3.3), epistemic integrity checks (§3.4)

**Agent 3: The Curriculum Integrator**
- Wires the validated module into the Mysterium engine
- Input: validated module + existing registry state
- Output: final module with engine hooks wired
- Uses: developmental mapping validation, Significator update paths, scheduler compatibility checks

### 2.3 The Skill-Based Implementation

The linter is implemented as a Freebuff skill, not as TypeScript code. This means:

- It uses LLM reasoning, not static rules — it can evaluate pedagogical quality
- It can be improved by refining the skill instructions, not by rewriting code
- It composes with the existing Freebuff agent ecosystem
- It can be triggered by any agent, not just the main Buffy agent

```
skills/
  curriculum-linter/
    SKILL.md                        ← Main skill definition
    references/
      meta-learning-principles.md   ← The 7 principles the Critic checks
      holonic-structure-template.md ← The template the Generator follows
      depth-rubric-patterns.md      ← Patterns for differentiating depth levels
      cs-curriculum-ontology.md     ← The CS/AI/ML knowledge graph
```

---

## 3. Game-design mapping

### 3.1 The Generator Agent's Workflow

When creating a new curriculum module, the Generator agent:

1. **Receives a topic specification:**
   - Subject (e.g., "Computer Science")
   - Concept name (e.g., "Recursion")
   - Target depth range (e.g., "comprehended" to "applied")
   - Target developmental lines (e.g., "Cognitive" primary, "Willpower" secondary)
   - Prerequisites (e.g., "Functions", "Stack Data Structure")

2. **Generates the five-phase holonic content:**
   - Observation: "What is recursion?" (phenomenon description)
   - Principle: "A function that calls itself with a simpler input" (mechanism)
   - Application: "Write a recursive factorial function" (novel problem)
   - Integration: "How does recursion relate to mathematical induction?" (cross-references)
   - Creation: "Design a recursive solution to this novel problem" (synthesis)

3. **Generates multiple representations:**
   - Verbal: Plain-language explanation
   - Visual: Diagram of recursive call stack
   - Mathematical: Recursive definition (factorial(n) = n × factorial(n-1))
   - Physical: Russian nesting dolls analogy
   - Code: Actual implementation in the learner's language

4. **Generates misconception map:**
   - "Recursion always terminates" → Counter-example: infinite recursion
   - "Recursion is always slower than iteration" → When and why this is false
   - "Recursion uses more memory" → True for some cases, false for tail-call optimization

5. **Generates depth-level rubrics for each Bloom's level**

6. **Generates assessment tasks at each depth level**

### 3.2 The Critic Agent's Validation Checklist

The Critic agent checks the generated module against three categories of invariants:

**Category A: Structural Invariants (the curriculum won't break the learner)**

| Check | What it validates | Severity if failed |
|---|---|---|
| A1: Prerequisite completeness | Every concept has at least one prerequisite (except root concepts) | Error |
| A2: DAG integrity | No circular prerequisites | Error |
| A3: Depth rubric completeness | Every concept has rubrics for at least 2 depth levels | Error |
| A4: Representation diversity | Every concept has at least 2 representations | Warning |
| A5: Depth monotonicity | Depth levels within a topic progress monotonically | Error |
| A6: Concept metadata | Every concept has all required fields (id, name, description, prerequisites, lines, stages) | Error |

**Category B: Pedagogical Invariants (the curriculum will actually teach)**

| Check | What it validates | Severity if failed |
|---|---|---|
| B1: Elaborative interrogation | Each concept includes at least one "why" or "how" prompt | Warning |
| B2: Transfer tasks | Each concept at "applied" depth or above has a novel-context task | Warning |
| B3: Misconception coverage | Each concept maps at least one misconception to a corrective scenario | Warning |
| B4: Spacing model | The concept defines review intervals and decay parameters | Info |
| B5: Interleaving support | The concept identifies peer concepts for mixed practice | Info |
| B6: Desirable difficulty | Assessment tasks are challenging enough to force active processing | Warning |
| B7: Multiple assessment modalities | At least 2 different task types are used for assessment | Warning |

**Category C: Developmental Invariants (the curriculum exercises the claimed lines)**

| Check | What it validates | Severity if failed |
|---|---|---|
| C1: Line authenticity | Assessment tasks actually probe the claimed developmental lines | Error |
| C2: Stage appropriateness | The concept's stage range overlaps with prerequisite concepts | Warning |
| C3: Drive probe inclusion | Each curriculum encounter includes at least one drive probe | Warning |
| C4: Shadow detection | Each concept maps potential shadow material (knowledge-avoidance, intellectual bypass) | Info |
| C5: Metacognitive probes | Each concept includes at least one self-assessment prompt | Warning |

**Category D: Epistemic Invariants (the curriculum is honest about knowledge)**

| Check | What it validates | Severity if failed |
|---|---|---|
| D1: Evidence-based claims | Facts are presented as claims with evidence, not absolute truths | Warning |
| D2: Uncertainty acknowledged | Where uncertainty exists, it is acknowledged | Info |
| D3: Frontier distinction | Established knowledge is distinguished from active research | Info |
| D4: Source attribution | Key claims cite their source (textbook, paper, consensus) | Info |

**Category E: Depth-Validation Invariants (the knowledge-depth engine can actually run on this module)** (added 2026-09-17)

These checks are the COMPILATION VALIDATION for knowledge depth: a module must
prove — before registration — that its depth profile is genuinely navigable by the
orchestrator-agents (24 §3.2.8, 27) and the teacher/assessor/developmental/therapeutic
sub-agents (43 §4.2) over journeys that span months to years. E-checks are
DETERMINISTIC (structural analysis of the module's depth metadata), unlike the
judgment-based B/C checks; an E-check failure is always a hard error.

| Check | What it validates | Severity if failed |
|---|---|---|
| E1: Depth-profile completeness | Every concept declares evidence for ≥ 4 of the 7 depth levels (ceiling concepts may declare `depthCeiling` per 31 §3.5a and are exempt above it) | Error |
| E2: Depth monotonicity of tasks | Task sequence within each concept exercises non-decreasing depth levels; the first task sits at the concept's declared entry level | Error |
| E3: Prerequisite depth closure | Every prerequisite cites a MINIMUM DEPTH (not just existence); the closure computation in 31 §3.5a passes for the module's whole subgraph | Error |
| E4: Blind-spot adjacency coverage | The concept's blind-spot adjacency map (31 §3.5a) names ≥ 2 adjacent concepts AND ≥ 1 prerequisite of prerequisite; these are the scheduler's probe targets | Error |
| E5: Blind-spot diagnosis validity | Each declared blind-spot cites its evidence class (31 §3.5a — prereq-failure / sibling-confusion / overgeneralization / principle-absence) | Error |
| E6: Journey viability | The module's depth span is traversable within a declared evidence-cadence envelope (depth × retention × spacing parameters admit a months-to-years journey without dead ends) | Error |
| E7: Rubric–agent consumability | Each depth rubric's `llmRubric` is present for levels the orchestrator scores open-endedly, and phrased for the Teacher/Assessor toolsets (43 §4.3) | Warning |

E-checks run FIRST in the Critic's pass (cheap, deterministic, fail-fast) and gate the
expensive judgment-based B/C checks — no module proceeds to pedagogical judgment
until its depth skeleton compiles.

**Hierarchy-level composition (added in re-audit, 2026-09-17).** E1–E7 are
concept-level checks; the depth profile is holonic (30 §3.1), so the same validation
composes upward without a second rule family:

| **E8** | Hierarchy-level depth aggregation | Topic/Subject/Branch holons aggregate their descendants' depth profiles (coverage, prereq-depth edges, blind-spot maps, ceilings); an aggregate is valid only if every descendant passes E1–E7 AND the aggregate's journey envelope (E6) holds at its own altitude | Error (blocks registration at that level) |

This gives the orchestrator-agents and the Teacher/Assessor/developmental/therapeutic
sub-agents (43 §4.2) a depth-validated framework AT EVERY ALTITUDE of the
module→course→subject hierarchy — a Branch-level read (e.g., an Educator Desk
projection, 33 §7) is as trustworthy as a concept-level read because it passed the
same gate shape one level up.

### 3.3 The Critic Agent's Analogy Validation

When the Generator proposes an analogical connection between concepts in different domains, the Critic validates structural validity:

1. **Extract relational structure** from both the source and target concepts
2. **Check relational consistency:** Does the logic in the source map to the logic in the target?
3. **Check constraint satisfaction:** Are the mapped properties essential and structural, not superficial?
4. **Check scope limitations:** Where does the analogy break down? The Critic flags analogies that are presented as stronger than they are.

**Example:**
- Analogy: "Recursion is like Russian nesting dolls"
- Structural mapping: Each doll contains a smaller version of itself (self-similar structure)
- Relational consistency: ✓ (recursion calls a smaller version of itself)
- Constraint limitation: Dolls have finite depth; recursion can be infinite → flag this limitation
- Verdict: Valid analogy with noted limitation → Warning if limitation is not documented

### 3.4 The Integrator Agent's Wiring

After the Critic passes, the Integrator agent:

1. **Validates developmental mapping:**
   - Does the claimed primary line match the assessment tasks? (e.g., if claiming "Cognitive" line, are the tasks actually cognitive?)
   - Does the stage range make sense given the prerequisite chain?
   - Are the drive probes authentic to this concept?

2. **Wires Significator update paths:**
   - What happens to the Significator when this module is completed at each depth level?
   - Which fields are updated? (knowledge.conceptStates, knowledge.subjectProgress, etc.)
   - What developmental signals are produced?

3. **Wires scheduler compatibility:**
   - Does the module's modality set overlap with available renderers?
   - Does the forgetting curve parameterization make sense for this concept type?
   - Are the review intervals compatible with the spacing model?

4. **Registers the module:**
   - Adds the module to the CurriculumRegistry
   - Updates the KnowledgeGraph edges
   - Validates that the graph remains a DAG

---

## 4. Architectural contract

### 4.1 The Linter Skill Definition

```markdown
# curriculum-linter

## Purpose
Validate curriculum modules against meta-learning principles, holonic structure, 
depth assessment requirements, and Mysterium engine integration.

## Agents
1. Generator: Creates curriculum content following holonic template
2. Critic: Validates content against all invariants
3. Integrator: Wires validated content into the engine

## Triggers
- "Create a curriculum module for [concept]"
- "Validate the [subject] curriculum"
- "Check if [concept] builds properly on its prerequisites"
- "Refine this module until the Critic passes"

## References
- meta-learning-principles.md: The 7 principles
- holonic-structure-template.md: The content template
- depth-rubric-patterns.md: Depth differentiation patterns
- cs-curriculum-ontology.md: The CS knowledge graph
```

### 4.2 The Validation Report

```typescript
interface CurriculumLinterReport {
  readonly moduleId: string;
  readonly timestamp: number;
  readonly passed: boolean;
  
  readonly errors: readonly LinterIssue[];
  readonly warnings: readonly LinterIssue[];
  readonly infos: readonly LinterIssue[];
  
  /** Summary statistics */
  readonly summary: {
    readonly totalChecks: number;
    readonly passed: number;
    readonly errors: number;
    readonly warnings: number;
    readonly infos: number;
  };
  
  /** Pedagogical quality score (0-1, derived from B-checks) */
  readonly pedagogicalQuality: number;
  
  /** Developmental integration score (0-1, derived from C-checks) */
  readonly developmentalIntegration: number;
}

interface LinterIssue {
  readonly checkId: string;       // e.g., "A2", "B3", "C1"
  readonly category: 'structural' | 'pedagogical' | 'developmental' | 'epistemic';
  readonly severity: 'error' | 'warning' | 'info';
  readonly message: string;
  readonly suggestion?: string;
  readonly location?: string;     // which part of the module has the issue
}
```

### 4.3 The Linter as an Iterative Workflow

The linter is not a single-pass tool. It is an iterative workflow:

```
1. Generator creates module
2. Critic validates → produces report
3. If errors exist:
   a. Critic provides specific feedback to Generator
   b. Generator refines the module
   c. Critic re-validates
   d. Repeat until zero errors
4. If warnings exist:
   a. Critic suggests improvements
   b. Generator optionally refines
   c. Critic re-validates
5. Once Critic passes (zero errors):
   a. Integrator wires the module into the engine
   b. Integrator validates engine compatibility
   c. Module is registered
```

This workflow can be triggered:
- **Manually:** "Create a curriculum module for Backpropagation"
- **Automatically:** "Validate the entire Algorithms topic — find gaps"
- **Iteratively:** "Keep refining this module until the Critic gives zero errors"

---

## 5. Open questions

- **The Critic's own calibration.** How do we know the Critic agent is making good judgments? The Critic needs its own validation — perhaps a set of known-good and known-bad curriculum modules that the Critic must correctly classify.

- **Domain-specific vs. domain-general checks.** Some checks (structural invariants) are domain-general. Others (epistemic invariants, analogy validation) require domain knowledge. Should the linter have domain-specific Critic agents for different subjects?

- **The cost of agentic validation.** Running three LLM agents on every curriculum module is expensive. The linter should be selective — running the full pipeline only for new modules, and abbreviated checks for updates to existing modules.

- **Human-in-the-loop.** Should curriculum authors be able to override the Critic's judgments? The system should allow human override for edge cases, but track override frequency to improve the Critic over time.

- **The linter for the linter.** Who validates the validator? The meta-learning principles checklist (§3.2) must itself be validated against the research literature. This is a recursive problem that the holonic principle addresses: the linter is a holon that contains, in miniature, the same validation structure it applies to curriculum content.

---

## 6. Principles served

Principles **1** (what the game trains — the linter ensures curriculum modules genuinely exercise the claimed capacities), **2** (validity — the linter enforces evidence-based pedagogical design), **3** (adaptive — the linter validates that content is appropriate for the target depth and stage), **4** (earned progression — the linter ensures depth levels are genuinely differentiated), **5** (multi-dimensional — the linter checks both knowledge depth and developmental integration), **7** (codebase — the linter report types are pure data structures testable in isolation).

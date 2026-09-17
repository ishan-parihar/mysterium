# 33 — Self-Directed Dashboard

> **Status:** canonical-hypothesis (Mysterium-specific learner-facing dashboard architecture for self-directed study).
>
> **Lateral:** The learner's mirror — the interface through which individuals study, understand, and project their own developmental trajectories across all lines of development and all curriculum subjects. No other document covers this: foundations/29 covers learning science; foundations/30 covers knowledge structure; foundations/31 covers depth measurement; foundations/32 covers validation. This document covers *what the learner sees and how they navigate their own growth*.
>
> **Revision (2026-09-17):** this document is REFRAMED from "the dashboard document" to "the RENDER-CONTRACT document for every human-facing developmental surface." The data authority for all dashboard surfaces — including the new auditor dashboards (§7) — is the Significator itself: the profiling system IS the diagnostics system (16 §2.4), and every view is a derived projection of it. This document owns what surfaces LOOK like and how they behave; 16 §10.4 owns what they are ALLOWED to show. No second data store, no parallel report generator, no redundant duplicate of the profiling system.
>
> **Depends on:** 29, 30, 31, 16 (Significator), 25 (CCI), 11 (modalities)
> **Referenced by:** 34 (curriculum-engine bridge)

---

## 1. Purpose

This document answers: **How does the learner see themselves — their knowledge, their development, their trajectory — in a way that is motivating, accurate, and actionable?**

The dashboard is not an institutional surveillance tool. It is not a grade book. It is a **mirror** — it shows the learner their own patterns, gaps, strengths, and growth edges. It is designed for self-directed study: the learner uses it to decide what to study next, how deeply to study it, and where their time is best spent.

The dashboard operates on two parallel tracks:
1. **Knowledge track:** What do I know? How deeply? What's decaying? What should I review?
2. **Developmental track:** Where am I growing? What drives are healthy? What shadows are surfacing? What lines need attention?

These tracks are not separate — they are two faces of the same holon. The dashboard makes their interconnection visible.

---

## 2. Scientific basis

### 2.1 Self-Determination Theory and Autonomy

Deci & Ryan's Self-Determination Theory (SDT) identifies three innate psychological needs that drive intrinsic motivation:

- **Autonomy:** The learner must feel they are directing their own learning. External control (forced sequences, mandatory exercises) undermines motivation.
- **Competence:** The learner must feel they are getting better at something that matters. Visible progress is essential.
- **Relatedness:** The learner must feel connected to a community of learners (even if that community is future-you and past-you).

**Architectural implication:** The dashboard must give the learner agency (choose what to study), visibility of progress (see growth over time), and connection to their own learning journey (the trajectory view). It must NOT feel like a surveillance system or a grade book.

### 2.2 The Metacognitive Mirror

Flavell's metacognitive theory (1979) shows that self-monitoring improves learning. The dashboard serves as an external metacognitive mirror — it shows the learner things about their own learning that they cannot see from the inside:

- "You think you understand X, but your assessment scores suggest you're at 'memorized' depth" (calibration feedback)
- "You haven't reviewed Y in 3 weeks — it's likely decayed" (forgetting curve visibility)
- "Your strongest line is Cognitive; your weakest is Emotional — consider an Emotional exercise" (developmental balance)

### 2.3 The Feedback Loop Architecture

The dashboard creates a virtuous feedback loop:

```
Learner studies → System assesses depth → Dashboard shows depth → 
Learner sees gap → Learner chooses what to study → Learner studies → ...
```

This loop is the engine of self-directed learning. The dashboard's job is to make the loop as tight and informative as possible — minimizing the time between "studying" and "seeing the result."

### 2.4 Progressive Disclosure and the Depth Gate

Not all information should be visible at all times. The dashboard uses progressive disclosure:

- **At "memorized" depth:** The learner sees their knowledge map (what they've encountered) and retention levels (what's decaying). They do NOT see the Integration Map (cross-domain connections require deeper understanding to appreciate).
- **At "comprehended" depth:** The learner sees their Learning Trajectory (how their understanding has evolved over time).
- **At "applied" depth:** The learner sees the Study Planner (personalized recommendations based on their specific state).
- **At "analyzed" depth or above:** The learner sees the Integration Map (cross-domain connections become visible).

This ensures the learner only sees information they have the depth to understand and act on.

---

## 3. Game-design mapping

### 3.1 The Five Dashboard Views

**View 1: The Knowledge Map**

A navigable graph of all concepts the learner has encountered.

- **Nodes** are concepts, colored by depth level:
  - Grey = absent (prerequisite exists but not encountered)
  - Red = memorized
  - Yellow = comprehended
  - Green = applied
  - Blue = analyzed
  - Purple = evaluated
  - White = transformed
- **Edges** are prerequisite relationships (thick = strong prerequisite, thin = weak)
- **Gaps** are visible as missing nodes or thin connections
- **Click any node** to see:
  - Current depth level and retention
  - Last reviewed date and next review date
  - Forgetting curve visualization
  - Recommended next action (review, deepen, or connect)
  - Developmental signals (which line this concept exercises)

**View 2: The Developmental Radar**

The existing 8-line radar chart, enriched with curriculum data.

- Each spoke represents a line of intelligence
- Radius represents developmental altitude (existing)
- **New:** Each spoke also shows which subjects exercise that line
  - "Cognitive: Physics (Orange), Mathematics (Orange), CS (Amber)"
  - "Emotional: Literature (Red), Psychology (Red)"
- **New:** Cross-domain development is visible
  - "Studying Ethics (Moral line) is also strengthening your Emotional line"
- **New:** The radar shows depth-level distribution per line
  - "Your Cognitive line: 12 concepts at 'applied', 5 at 'comprehended', 3 at 'memorized'"

**View 3: The Learning Trajectory**

A timeline showing the learner's journey across all subjects and developmental lines.

- **X-axis:** Time (sessions, days, weeks)
- **Y-axis:** Depth level (absent → transformed)
- **Lines:** One per subject, colored by branch
- **Milestones:** Labeled points where the learner reached a new depth level
  - "March 15: Newton's Laws reached 'comprehension'"
  - "April 2: Newton's Laws reached 'application'"
- **Projections:** Dotted lines showing expected trajectory based on current pace
  - "At current pace, you will reach 'analysis' in Classical Mechanics by June"
- **Forgetting events:** Visible dips where concepts decayed
  - "Supply and Demand decayed from 'comprehended' to 'memorized' between March 10-25"
- **Pattern insights:**
  - "You learn faster in morning sessions"
  - "You retain better when you interleave Physics and Math"

**View 4: The Study Planner**

The auto-mode strategy engine's recommendations, made visible.

- **Today's recommended session:**
  - "20 min: Review Newton's Laws (retention at 60% — review boundary)"
  - "15 min: New material — Electromagnetism (all prerequisites met at 'applied' depth)"
  - "10 min: Cross-domain connection — link wave mechanics to your Physics understanding"
- **Why each recommendation:** Transparency into the system's reasoning
  - "Newton's Laws recommended for review because retention has fallen below 70%"
  - "Electromagnetism recommended because your prerequisite chain is complete"
- **Learner overrides:** The learner can:
  - Skip any recommendation
  - Reorder the session
  - Add their own topics
  - Adjust session length
- **Respects learning science:** The planner automatically:
  - Spaces reviews at the forgetting boundary
  - Interleaves topics (not blocked practice)
  - Introduces desirable difficulties at the right moments
  - Balances new material with review

**View 5: The Integration Map**

Shows how knowledge across subjects connects through shared structural patterns.

- **Nodes** are concepts (only those at "analyzed" depth or above)
- **Edges** are analogical connections (same structural pattern, different domain)
  - "Optimization" connects: Algorithm Complexity ↔ Loss Minimization ↔ Resource Allocation ↔ Natural Selection
  - "Recursion" connects: Recursive Functions ↔ Mathematical Induction ↔ Fractal Geometry ↔ Self-Similar Growth
- **Clusters** emerge naturally — groups of concepts that share multiple structural patterns
- **Insight prompts:**
  - "You have 3 concepts at 'analyzed' depth that share the 'trade-off' pattern. Consider studying them together."
  - "Your strongest cross-domain connection is between Algorithms and Machine Learning. Consider exploring Optimization Theory."

### 3.2 What the Dashboard Does NOT Show

- **Other learners' data:** No social comparison. No leaderboards. No rankings.
- **Grades or scores:** No percentage scores, no GPA, no "you're in the top 10%."
- **Clinical labels:** No "you have ADHD" or "you're at risk of failure." The Veil principle applies — the learner sees their trajectory, not a diagnosis.
- **Anything they haven't earned:** The Integration Map is only visible at "analyzed" depth. The Study Planner only appears after the first few sessions. Progressive disclosure prevents information overload.

### 3.3 The Dashboard as a Holonic Mirror

The dashboard itself is a holon — it contains, in miniature, the same structure it displays:

- The Knowledge Map is a holon (each node is a whole containing depth/retention/history, and a part of the larger graph)
- The Developmental Radar is a holon (each spoke is a whole containing line data, and a part of the overall profile)
- The Learning Trajectory is a holon (each milestone is a whole containing a moment of growth, and a part of the larger journey)
- The Study Planner is a holon (each recommendation is a whole containing reasoning and action, and a part of the session plan)
- The Integration Map is a holon (each connection is a whole containing a structural analogy, and a part of the knowledge web)

---

## 4. Architectural contract

### 4.1 Dashboard Data Model

```typescript
interface DashboardState {
  /** Knowledge Map data */
  readonly knowledgeMap: {
    readonly nodes: readonly KnowledgeNode[];
    readonly edges: readonly KnowledgeEdge[];
    readonly gaps: readonly KnowledgeGap[];
  };
  
  /** Developmental Radar data */
  readonly developmentalRadar: {
    readonly altitudes: Record<Line, Stage>;
    readonly depthDistribution: Record<Line, Record<DepthLevel, number>>;
    readonly subjectMapping: Record<Line, readonly string[]>;
    readonly crossDomainEffects: readonly CrossDomainEffect[];
  };
  
  /** Learning Trajectory data */
  readonly learningTrajectory: {
    readonly milestones: readonly Milestone[];
    readonly projections: readonly Projection[];
    readonly patterns: readonly LearningPattern[];
  };
  
  /** Study Planner data */
  readonly studyPlanner: {
    readonly recommendations: readonly StudyRecommendation[];
    readonly sessionArc: ParameterisedSessionArc;
    readonly rationale: readonly string[];
  };
  
  /** Integration Map data (only at "analyzed" depth or above) */
  readonly integrationMap: {
    readonly nodes: readonly IntegratedConcept[];
    readonly connections: readonly AnalogyConnection[];
    readonly clusters: readonly ConceptCluster[];
    readonly visible: boolean;
  };
}

interface KnowledgeNode {
  readonly conceptId: string;
  readonly name: string;
  readonly subjectId: string;
  readonly depthLevel: DepthLevel;
  readonly retention: number;
  readonly lastReviewedAt: number;
  readonly nextReviewAt: number;
  readonly developmentalLine: Line;
}

interface StudyRecommendation {
  readonly conceptId: string;
  readonly action: 'review' | 'new_material' | 'deepen' | 'connect';
  readonly estimatedMinutes: number;
  readonly rationale: string;
  readonly priority: number;
}
```

### 4.2 Dashboard Render Contract

The dashboard renders using the existing SvelteKit component architecture:

- `KnowledgeMap.svelte` — D3.js force-directed graph with depth coloring
- `DevelopmentalRadar.svelte` — Extension of existing radar component with curriculum data
- `LearningTrajectory.svelte` — Time-series chart with milestone annotations
- `StudyPlanner.svelte` — Card-based recommendation list with rationale
- `IntegrationMap.svelte` — Network graph of cross-domain connections (conditionally rendered)

All views share:
- The existing `StageTheme.svelte` for color palette
- The existing `A11yApplier.svelte` for accessibility
- The existing `StageTransitionOverlay.svelte` for depth-level transitions

---

## 5. Open questions

- **Real-time vs. session-boundary updates.** Should the dashboard update in real-time during a session, or only at session boundaries? Real-time is more motivating but may be distracting. Session-boundary is cleaner but less immediate.

- **The social dimension.** The dashboard currently shows only the individual learner's data. Should there be a (voluntary, anonymized) social dimension — "other learners at your level found these concepts challenging"? This must be carefully designed to avoid comparison dynamics.

- **Mobile responsiveness.** The Knowledge Map and Integration Map are complex network visualizations. How do they render on mobile devices? The SvelteKit app must be responsive, but network graphs are inherently challenging on small screens.

- **Data privacy.** The dashboard shows sensitive developmental data. The architecture must ensure this data is encrypted, never shared without explicit consent, and deletable. This is already handled by the Significator's encryption model, but the dashboard UI must also respect these constraints.

- **The learning pattern engine.** The trajectory view shows "patterns" (e.g., "you learn faster in mornings"). Detecting these patterns requires statistical analysis of the learner's session data. The pattern engine must be robust enough to detect real patterns but not so sensitive that it finds spurious correlations.

- **Auditor authentication in a local-first architecture (added 2026-09-17).** The app has no accounts; identity is device-local. §7's consent brokerage and request logging assume an authenticated, revocable auditor link — how that link is established and verified without compromising the pseudonymous-by-design profile (16 §3.2) is unresolved. Candidate directions: guardian-held pairing codes, platform account anchoring (Capacitor/OS), or credential-ledger attestation (41). Must be resolved BEFORE §7 implementation; the §7 render contract is valid regardless of the mechanism chosen.

---

## 6. Principles served

Principles **3** (adaptive — the dashboard adapts what it shows based on the learner's depth level), **4** (earned progression — the Integration Map is only visible at "analyzed" depth or above), **5** (multi-dimensional — the dashboard shows knowledge depth, developmental altitude, and cross-domain connections simultaneously), **7** (codebase — the DashboardState type is a pure data structure testable in isolation).

---

## 7. The auditor dashboards (added 2026-09-17)

The profiling system acts as the diagnostics dashboard for parents, teachers/guardians,
and therapists. This section is the RENDER CONTRACT for those dashboards; the data
authority is 16 §2.4 + §10.4 (Auditor Projection Layer). The three scope projections
arrive pre-filtered and consent-checked — this layer adds visual hierarchy and
interaction only.

### 7.1 The three auditor surfaces (one per scope)

| Surface | Audience | Projection | Visual hierarchy (default → drill-down) |
|---|---|---|---|
| **Guardian Mirror** | parents, guardians-of-record | `guardian` | wellbeing overview → milestone timeline → engagement pattern → theta-attention lines |
| **Educator Desk** | teachers, tutors | `educator` | cohort-of-one overview (branch rungs) → depth distribution per subject → prerequisite gaps → mastery-sequence status (24 §3.2.8) → pack trajectories |
| **Therapeutic Pane** | therapists, counsellors | `therapeutic` | integration-trend overview → surfacing trends per line×quadrant → integration history → drive-balance trend |

All three share one shell (`AuditorShell.svelte`): identity banner (who is this view
for, which consent scopes are active), window selector (30d / 90d / all), and the
granularity stepper (summary → line → line-stage → line-stage-cell) that maps 1:1 to
the projection granularity ladder.

### 7.2 Hierarchical expansion on request (the drill-down contract)

The defining interaction: **the dashboard expands when the auditor asks, not before.**

1. Every surface renders its coarsest level first (one screen, no scrolling walls).
2. Any node the auditor selects issues the next `AuditorViewRequest` at one granularity
   level deeper (AP3 — descent-only; enforced in the UI, not just the projector).
3. Expansion is AUDITED: each request is logged (who, scope, granularity, when) so
   consent reviews can see exactly what was seen. No background refresh pushes new
   detail into an expanded view — re-request is explicit.
4. Drill-down terminates at `line-stage-cell`: the full evidence context for one
   line×stage cell (rubric outcomes, drive signatures, integration events). This is
   the deepest sanctioned reveal; nothing below it exists in any projection.

### 7.3 Rendering rules (binding)

- **Metric-bearing is correct here.** Stage labels, rung indices, rubric names, and
  theta values render verbatim on auditor surfaces (16 §10.3 rule 6). The Veil register
  components (felt-sense descriptors) are NOT reused for auditor surfaces.
- **No clinical language.** The therapeutic pane renders patterns and trends
  ("Dark-Allergy surfacing rising on Interpersonal, integration events 3 this window") —
  it never renders diagnostic categories or crisis content. Crisis signals route
  through the deterministic crisis layer (43 §4.7), never through a projection.
- **No cross-player comparison.** Surfaces render one Significator per session
  (multi-auditee for an educator = one auditee selected at a time; batch comparison
  is out of scope per 38's recognition discipline).
- **Read-only plus propose.** The only write affordance is "submit request to the
  orchestrator" (AP5) — a staged proposal form (e.g., adjust voicing, add practice
  objectives), never a direct state mutation.
- **Same components, same a11y.** AuditorShell reuses Card/Button/Stack/Cluster,
  StageTheme palette, A11yApplier — no parallel component family.

### 7.4 Data flow (one direction)

```
Significator (16)                    consent ledger (16 §2.4)
      │                                        │
      ▼                                        ▼
AuditorProjections projector  ◄── consent check at render (AP4)
      │            (AP1: derived at request time)
      ▼
/api/auditor/view  (server; session-authenticated; request logged)
      ▼
AuditorShell.svelte → Guardian Mirror / Educator Desk / Therapeutic Pane
      └── drill-down → next AuditorViewRequest (AP3) → loop
      └── propose → orchestrator delegation (43 §4.6) → ratification (AP5)
```

No mirror tables, no cached reports, no export-to-pdf snapshots of state (an export
regenerates a projection at export time, so consent applies).

# AGENTS.md — R&D Process and Development Protocol

> This document defines how the Mysterium project is researched, documented, and developed. It is the operating manual for any AI agent (or human collaborator) working on this project.

---

## 1. Project Overview

Mysterium is a Mysterium where every gameplay verb is a gamified developmental assessment across 8 lines of intelligence × 8 stages of consciousness, with Law-of-One cosmology as canon. The game is designed for psychological, neurological, sociological, and biological healing and evolution.

**The game is two things at once:**
1. A real action RPG with combat, narrative, and immersive gameplay
2. A literal developmental practice — every game mechanic IS a validated assessment that simultaneously diagnoses AND heals/evolves the player

---

## 2. The R&D Documentation Set

### 2.1 Structure

```
docs/
├── foundations/          ← Theoretical substrate (pure theory + game-design translation)
│   │
│   ├── 00-integral-theory.md
│   ├── 01-aqal-quadrants.md
│   ├── 02-eight-stages-overview.md
│   ├── 03-lines-of-intelligence-overview.md
│   ├── 04-states-of-consciousness.md
│   ├── 05-drives-and-polarities.md
│   ├── 06-law-of-one-correspondence.md
│   ├── 07-neuroscience-of-development.md
│   ├── 08-psychophysics-and-staircase.md
│   ├── 09-flow-and-engagement-theory.md
│   │
│   │  ── Lesser-cycle: Matrix / Potentiator / Catalyst / Experience ──
│   ├── 10-shadow-and-pathology.md          ← 4-quadrant shadow model, drive-health, holonic return
│   ├── 11-game-modalities.md               ← 7 game types, modality×line affinity
│   ├── 12-drive-assessment-mechanics.md    ← Per-module drive probes, dual-domain scoring
│   ├── 13-architecture-of-consciousness.md ← 5-layer topography, contact boundary, Matrix/Potentiator
│   ├── 14-game-as-developmental-catalyst.md← Catalyst→experience→integration mechanics
│   │
│   │  ── Greater-cycle: Significator / Transformation / Great Way / Choice ──
│   ├── 15-macro-scale-archetypal-mind.md   ← Pure theory of the macro-archetypes (the Logos blueprint)
│   ├── 16-significator-architecture.md     ← Player as persistent soul-pattern; PlayerProfile-as-Significator
│   ├── 17-transformation-mechanics.md      ← Frame-change at stage thresholds; Lovers crucible
│   ├── 18-great-way-world-architecture.md  ← World as PESTLE-mapped collective holons
│   ├── 19-choice-and-polarity-engine.md    ← STO/STS vectors, consequence propagation
│   ├── 20-veil-of-forgetting.md            ← The implicit-operation principle
│   ├── 21-incarnation-architecture.md      ← MASTER SYNTHESIS (Option C: layered-world incarnation)
│   ├── 22-holon-context-engine.md          ← LLM-driven world implementation spec
│   ├── 23-polarity-ontology.md             ← Per-line×stage polarity texture catalogue (64 cells)
│   ├── 24-encounter-scheduler.md           ← Encounter selection algorithm & macro-catalyst engine
│   ├── 25-cumulative-consciousness-index.md← CCI composite metric
│   ├── 26-unified-core-architecture.md     ← The unified core architecture spec
│   ├── 27-auto-mode-strategy-engine.md     ← Auto-mode session strategy generation
│   ├── 28-holoos-open-joints-mapping.md    ← HoloOS open-joints tracking
│   ├── 29–36 ...                           ← Curriculum expansion set (29 meta-learning, 30 holonic curriculum, 31 depth, 32 agentic linter, 33 dashboard, 34 engine bridge, 35 framework complexity, 36 upgrade plan)
│   ├── 37–41 ...                           ← Domain expansion set (37 K-12, 38 cohort/multiplayer, 39 action-induction/journal, 40 measurement packs, 41 global recognition)
│   ├── 42-developmental-levelling-mechanism.md ← Unified evidence-only grading/staging (competence/identity firewall)
│   └── 43-agentic-orchestration-architecture.md ← Primary orchestrator + sub-agent council + tool systems + log protocol
│
├── concept-drafts/      ← 512 game concept documents (64 modules × 8 files)
│   ├── README.md        ← Templates and requirements for each file
│   ├── ROADMAP.md       ← Development phases and process
│   └── {line}/{stage}/  ← 64 module directories
├── lines/               ← Per-line documentation
├── stages/              ← Per-stage documentation
├── archive/             ← Archived documents (ATB combat philosophy, enemy taxonomy, old plans)
├── progression/         ← Progression overview
└── narrative/           ← Narrative architecture
```

### 2.2 The Uniqueness Principle

**Every document in the R&D set must be unique.** No redundancies. Each document covers a specific lateral that no other document covers. If two documents overlap, one must be refactored or merged.

| Document | Unique lateral |
|---|---|
| **— Theoretical substrate (00–09) —** ||
| foundations/00–09 | Pure theory: integral, AQAL, stages, lines, states, drives, Law-of-One, neuroscience, psychophysics, flow |
| **— Lesser-cycle game design (10–14) —** ||
| foundations/10 | WHAT shadows are and how they map to game mechanics (4-quadrant shadow model) |
| foundations/11 | WHAT types of games exist and what each measures (the 7 modalities) |
| foundations/12 | HOW drives are measured (concrete probe specifications) |
| foundations/13 | The THEORETICAL substrate of consciousness (5-layer topography, contact boundary, Matrix/Potentiator) |
| foundations/14 | HOW a game becomes a developmental catalyst (catalyst → experience → integration) |
| **— Greater-cycle game design (15–22) —** ||
| foundations/15 | PURE THEORY of the macro-archetypes (Significator/Transformation/Great Way/Choice + Veil) |
| foundations/16 | The Significator: player as persistent soul-pattern; PlayerProfile-as-Significator; the distortion ledger |
| foundations/17 | Transformation: frame-change at stage thresholds; the Lovers crucible; ego-dissolution mechanics |
| foundations/18 | The Great Way: world as PESTLE-mapped collective holons; layered perception; macro-catalyst engine |
| foundations/19 | The Choice & polarity engine: STO/STS vectors, micro-choice aggregation, consequence propagation |
| foundations/20 | The Veil of Forgetting: the implicit-operation principle; what the game reveals vs withholds |
| foundations/21 | **MASTER SYNTHESIS** (Option C): how all greater-cycle archetypes + concept-drafts + modalities compose into a playable game |
| foundations/22 | The Holon Context Engine: LLM-driven world implementation spec (data model, pipeline, generation, consequences) |
| foundations/23 | Polarity Ontology: the 64-cell polarity texture catalogue — per-line×stage STO/STS/exploratory textures grounded in concept-drafts |
| foundations/24 | Encounter Scheduler & Macro-Catalyst Engine: the operational algorithm that selects, routes, and conditions encounters — including mastery-sequence alignment (§3.2.8) as the knowledge-depth criterion in the ONE priority formula |
| foundations/25 | Cumulative Consciousness Index (CCI): the composite metric tracking integrated development across all lines and stages |
| foundations/26 | Unified Core Architecture: the unified core architecture spec replacing ATB with assessment-module execution |
| foundations/27 | Auto-Mode Strategy Engine: auto-mode session strategy generation for adaptive play |
| foundations/12 | Drive assessment mechanics — PLUS the rubric-validation protocol (§5.4): what it means for an implicit-assessment rubric to be valid (RV1–RV7 — reliability, coverage + shadow-quadrant specificity, known-answer stability, adversarial resistance, below-stage discrimination, active-stage placement, drift monitoring) |
| foundations/16 | Significator architecture — PLUS the Auditor Projection Layer (§2.4, §10.4): the profiling system as the diagnostics dashboard for consented guardians, derived projections only |
| foundations/33 | Dashboard render contract — learner surfaces (§1–5) AND auditor dashboards (§7): Guardian Mirror / Educator Desk / Therapeutic Pane, rendered from 16 §10.4 projections |
| **-- Architecture / process docs --** ||
| STAGE-ASSESSMENT-ARCHITECTURE | The MODULE CONTRACT (composition rules, interfaces, 4 execution modes) |
| ONBOARDING-REDESIGN-PLAN | Binary-search composite assessment for initial Significator seeding |
| UNIFIED-IMPLEMENTATION-PLAN | ARCHIVED (`docs/archive/old-plans/`) — legacy-removal phase record; superseded by the current phase in §4.2 |
| concept-drafts/README | TEMPLATES for what each concept-draft file must contain |
| concept-drafts/ROADMAP | The TRAJECTORY for developing all 512 concept-drafts |
| MVP-BLUEPRINT.md | ARCHIVED (`docs/archive/old-plans/`) — historical canon record; live canon = `docs/foundations/` + `docs/INDEX.md` (blueprint decision #2 revised in `docs/foundations/41-global-recognition-credentialing.md` §0) |

### 2.3 Document Relationships (No Circular Dependencies)

```
            ┌───────────────────────────────────────────────────────────┐
            │  Theoretical substrate (foundations 00–09)                 │
            │  Integral, AQAL, stages, lines, states, drives, Law-of-One,│
            │  neuroscience, psychophysics, flow                          │
            └─────────────────────────┬─────────────────────────────────┘
                                      │ informs both cycles
            ┌─────────────────────────┴─────────────────────────────────┐
            ↓                                                            ↓
┌───────────────────────────────┐                  ┌────────────────────────────────────┐
│  LESSER CYCLE (foundations 10–14)               │  GREATER CYCLE (foundations 15–22)  │
│  Matrix → Potentiator → Catalyst → Experience   │  Significator / Transformation /    │
│                                                  │  Great Way / Choice / Veil          │
│  10 — shadow model (theoretical)                │  15 — macro archetypes (pure theory)│
│  11 — 7 modalities                               │  16 — Significator (player vessel) │
│  12 — drive probes (mechanics)                  │  17 — Transformation (frame-change) │
│  13 — consciousness topography (theoretical)    │  18 — Great Way (world architecture)│
│  14 — catalyst→experience→integration (bridge)  │  19 — Choice/polarity engine        │
│                                                  │  20 — Veil of Forgetting (principle)│
└──────────────────┬───────────────────────────────┘                  ↓                  │
                   │                                  ┌───────────────┴────────────────┐ │
                   │                                  │  21 — Incarnation Architecture │ │
                   │                                  │       (MASTER SYNTHESIS, Option C)│
                   │                                  │  22 — Holon Context Engine     │ │
                   │                                  │       (LLM-driven world impl)  │ │
                   │                                  └───────────────┬────────────────┘ │
                   │                                                  │                  │
                   ↓                                                  ↓                  │
            ┌──────────────────────────────────────────────────────────────────────┐    │
            │  concept-drafts/ — 512 game concept documents (64 modules × 8 files) │    │
            │  Module-spec defines the lesser-cycle anchor; the 7 game files       │    │
            │  define the lesser-cycle catalyst at each modality.                  │    │
            └──────────────────────────────────┬───────────────────────────────────┘    │
                                               ↓                                         │
            ┌────────────────────────────────────────────────────────────────────┐      │
            │  src/ — the actual game (driven by 21's encounter scheduler &      │      │
            │  22's holon context engine, consuming concept-drafts as templates) │      │
            └────────────────────────────────────────────────────────────────────┘      │
                                                                                         │
            (narrative/, lines/, stages/, progression/ documents               │
             provide per-domain detail consumed by both cycles ←─────────────────────────┘
```

**The two-cycle insight:** The lesser cycle (10–14) mechanises a single moment of catalyst → experience for a single capacity. The greater cycle (15–22) mechanises the eternal lifecycle of the soul across all capacities. Document 21 is the keystone where they meet: every encounter (lesser-cycle) is delivered by a holon (greater-cycle) within a stage-layer (greater-cycle), with consequences tracked through the polarity engine (greater-cycle), all under the Veil (greater-cycle).

---

## 3. How the R&D Doc Set Is Managed

### 3.1 The Feedback Loop

The R&D documentation is a LIVING system. It is updated based on:

1. **User feedback/correction:** When the user provides new understanding, corrects a misunderstanding, or introduces new context, the relevant documents are updated IMMEDIATELY. The user's understanding is always authoritative on matters of theory.

2. **Development insights:** When writing concept-drafts reveals gaps or contradictions in the foundations, the foundations are updated to resolve them.

3. **Implementation feedback:** When coding reveals that a documented design doesn't work in practice, the documentation is updated to reflect the working design.

### 3.2 The Update Protocol

When updating the R&D doc set:

1. **Identify which document owns the concept** — never add content to the wrong document
2. **Check for uniqueness** — does this update create redundancy with another document? If so, refactor.
3. **Check for consistency** — does this update contradict anything in other documents? If so, update all affected documents.
4. **Preserve the document's lateral** — each document has a specific purpose. Updates must stay within that purpose.
5. **Reference, don't duplicate** — if document A needs to mention something that document B covers, reference B rather than duplicating the content.

### 3.3 When to Create a New Document

A new foundations document is created ONLY when:
- A genuinely new lateral emerges that no existing document covers
- The new lateral is substantial enough to warrant its own document (not just a section)
- The new document would be referenced by multiple other documents

### 3.4 When to Refactor an Existing Document

An existing document is refactored when:
- The user corrects a fundamental misunderstanding (e.g., the drive↔shadow mapping correction)
- New theoretical understanding changes the document's core model
- The document has grown beyond its original lateral and needs splitting

---

## 4. How We Develop the Project

### 4.1 The Development Cycle

```
R&D Documentation (theory + design)
    ↓ grounds
Concept-Drafts (concrete game designs)
    ↓ specifies
Implementation (code)
    ↓ reveals
Feedback (what works, what doesn't)
    ↓ updates
R&D Documentation (refined theory + design)
```

### 4.2 Current Phase: Phase 1 — Delegation Kernel (per docs/DEVELOPMENT-PLAN.md)

Concept-drafts are **COMPLETE** (all 512 exist across 64 modules x 8 files).
Legacy removal is **DONE** (record: `docs/audits/DOC-SET-AUDIT-2026-09-16.md`).

**The binding build plan is `docs/DEVELOPMENT-PLAN.md`** — the authoritative,
revised-in-place sequencing of all phases (1 Delegation Kernel → 2 Practice Tools →
3 Corpus → 4 Pods → 5 Packs → 6 WebUI Parity → 7 Onboarding Composite → 8 K-12 →
9 Credentialing), each with gates. The current phase is **Phase 1**: implement the
delegation kernel per `docs/foundations/43-agentic-orchestration-architecture.md`
(DelegationSpec/Result/Proposal types, session-log store, `delegate_session`,
ratification-only commits, kernel gates G14/G15). The plan owns order and gates;
foundations own contracts; on conflict the foundations doc wins and the plan is revised.

Standing constraints for ALL phases: workspace-lint → build+test → commit → push to BOTH remotes (`origin` GitHub, `gitlab`). See §7.5.

### 4.3 The Grounding Principle

All development is grounded in the R&D documentation. No code is written without a concept-draft. No concept-draft is written without the foundations being correct and complete. If the foundations are wrong, we fix them FIRST.

---

## 5. Key Theoretical Commitments

These are non-negotiable and must be reflected in all work:

### 5.1 The Two Axes

| Axis | Drives | Domain | Archetypal Mind |
|---|---|---|---|
| **Vertical** | Eros ↕ Agape | Within the holon, between stages | Matrix ↔ Potentiator |
| **Horizontal** | Agency ↔ Communion | Across holons, at a given stage | Catalyst ↔ Experience |

### 5.2 The 4-Quadrant Shadow Model

- **Dark-Addiction:** Submergent fixation (clings to lower capacity)
- **Dark-Allergy:** Submergent aversion (rejects lower capacity)
- **Golden-Addiction:** Emergent fixation (bypasses toward higher without integration)
- **Golden-Allergy:** Emergent aversion (refuses the call to grow)

ALL 4 drives can be pathological in BOTH domains. There is NO 1:1 mapping between drives and shadow quadrants.

### 5.3 The Dual Vectors

- **Heal/Evolve (bottom-up):** Agape + Agency integrate dark shadows
- **Evolve/Heal (top-down):** Eros + Communion dissolve golden shadows

### 5.4 Game as Catalyst

Every game follows: Catalyst → Experience → Integration. The game is not a test — it is a developmental practice that simultaneously diagnoses AND heals/evolves. The game is NEVER diagnostic to the user — everything happens implicitly in the background.

### 5.5 Self-Contained and All-Inclusive

Each game at a given line×stage must probe the ENTIRE span of drives × shadow-polarities for that module. It must have its own internal progression from diagnosis → healing → evolution.

### 5.6 The Holon Is Never Outgrown

Lower stages must remain healthy. Games at earlier stages are never "completed" — they become shadow-mode encounters that maintain holonic integrity. Theta-decay ensures neglected stages degrade, and the consciousness index requires lower-stage health for upper-stage unlocks.

### 5.7 The Infinite Checkpoint Model

Every game is an infinite checkpoint game. Players can leave at any checkpoint. Progress is saved continuously. Session length is player-determined. The game is addictive through felt-sense of growth, not dopamine manipulation.

### 5.8 The 7 Modalities as Catalyst Axes

The 7 game modalities are 7 AXES through which catalyst of a particular frequency (line×stage) is delivered. They are not just different game types — they probe different dimensions of the same shadow in different manners. The LLM operates WITHIN each modality using rubrics. Fixed mechanics + adaptive content.

---

## 6. AQAL Quadrants (Deferred)

The 4 AQAL quadrants (UL/UR/LL/LR) are implicitly present in the line taxonomy. Explicit quadrant integration into the game architecture is deferred until:
1. The core drive×shadow model is stable through Phase 1 concept-drafts
2. We have clarity on how quadrant dynamics ADD to the existing architecture
3. The user decides it's time to integrate them

---

## 7. For AI Agents Working on This Project

### 7.1 Before writing anything

1. Read the relevant foundations documents
2. Read the concept-drafts README and ROADMAP
3. Understand the uniqueness principle — don't create redundant content
4. Understand the theoretical commitments (§5) — don't violate them

### 7.2 When writing concept-drafts

1. Start with shadow-diagnostics (the anchor for the module)
2. Follow the templates in concept-drafts/README.md exactly
3. Each game must be self-contained, all-inclusive, and progressive
4. Each game must follow the catalyst→experience→integration flow
5. Each game must probe all 4 drives in both domains
6. Each game must surface all 4 shadow quadrants
7. Each game must support both heal/evolve and evolve/heal vectors

### 7.3 When updating documentation

1. Follow the update protocol (§3.2)
2. Never create redundancy
3. Always check consistency across documents
4. The user's theoretical understanding is authoritative
5. If unsure, ask — don't guess

### 7.4 When writing code

1. The concept-draft must exist before code is written
2. Code must implement the concept-draft faithfully
3. If implementation reveals design problems, update the concept-draft first
4. Follow the existing architecture (core/infra/game layers, registries)
5. All code must pass build + tests before being committed

### 7.5 The Iteration Protocol (MANDATORY)

Every development iteration — no exceptions — must follow this sequence:

```
1. Make changes (code, docs, config)
2. Run workspace-lint:  python3 skills/workspace-lint/scripts/workspace_lint.py --root .
3. Run build + tests:   npm run build && npm test
4. Fix any violations
5. Git commit + push to BOTH remotes
```

**Step-by-step:**

1. **Workspace lint** — Run `python3 skills/workspace-lint/scripts/workspace_lint.py --root .` after every change. Violations must be fixed before committing. The linter natively respects `.gitignore` — do NOT manually add ignored paths to `workspace-lint.yaml`.

2. **Build + test** — Run `npm run build` (builds both Vite browser bundle and tsup CLI). Run `npm test` if tests exist. Both must pass.

3. **Git commit** — Stage only the intended files (`git add <files>`). Never `git add .` blindly. Write a concise commit message.

4. **Git push to both remotes** — Push to GitHub AND GitLab:
   ```
   git push origin main
   git push gitlab main
   ```
   Both remotes MUST stay in sync. Never push to only one.

5. **Never commit:**
   - `.env` files
   - `node_modules/`, `dist/`, `build/`, `__pycache__/`
   - `.hive/`, `.memsearch/`, `.contexty/`, `.opencode/`, `.sisyphus/`
   - Any file matched by `.gitignore`

**Workspace-lint config:** `workspace-lint.yaml` at project root. The validator script is at `skills/workspace-lint/scripts/workspace_lint.py`. It uses `.gitignore` as the source of truth for exclusions — config only adds project-specific overrides.

**Remotes:**
- GitHub: `origin` → `https://github.com/ishan-parihar/Mysterium.git`
- GitLab: `gitlab` → `https://gitlab.com/ishan-parihar/Mysterium.git`

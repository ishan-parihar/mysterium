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

### 2.0 External canon sources (they govern vocabulary where they speak)

Mysterium's metaphysical vocabulary is **not original**. Two external knowledge bases are canonical
for it, and they are read-only inputs — never edited from this repository:

| Source | Path | Governs |
|---|---|---|
| **HoloOS** | `~/Documents/knowledge-base/HoloOS/_THEORY/02_Ontology/` | densities (VIBGYOR), octaves, the Veil, the primal distortions |
| **KosmOS** | `~/Documents/knowledge-base/KosmOS/_Ontology/` | altitudes L1–L10, the stage-number axis (MHC/Kegan), the ray lens, framework-density, AQAL structure |

**Precedence:** where HoloOS or KosmOS speaks on a term, that source governs Mysterium's definition of
it; where they are silent, `docs/foundations/*` owns it; where Mysterium **diverges**, the divergence
must be recorded **with its compensation** (`docs/foundations/20` §11 is the pattern). A silent
divergence is a defect, not a decision. An agent that cannot see these sources cannot know that
densities ≠ stages — which is exactly how the `D2` deviation class arose (see
`docs/audits/DOC-SET-AUDIT-2026-09-20.md`).

**The grammar doc** `docs/foundations/44-system-ontology-and-vocabulary.md` owns the Mysterium-side
synthesis: the five axes and their firewalls, the ratified ladder, the term→owner table, and the
blacklist of superseded vocabulary. **Read it before changing any term anywhere.**

### 2.0b The documentation rungs (`_org.yaml`)

The doc tree is declared machine-readably at the repository root (`_org.yaml`) as four firewalled
rungs plus historical:

```
canon-root   docs/{00-vision,01-first-principles,02-glossary,03-research-methodology}.md
canon        docs/foundations/            theory — "what is true"        authority: docs/foundations/AGENTS.md
canon-domain docs/{lines,stages,narrative,progression}/
content      docs/concept-drafts/          the 512-file corpus
system       docs/system/                 contracts, as ORGANS          authority: docs/system/AGENTS.md
records      docs/system/**/core/         AD · RG · Log (architecture-discipline, localized)
plans        docs/{DEVELOPMENT-PLAN,ONBOARDING-REDESIGN-PLAN,ARCHITECTURE-TRANSMUTATION-PLAN,REQUIREMENTS}.md
historical   docs/historical/             dated records; never an authority, never cited
audits       docs/audits/                 dated audit evidence behind the RG ledger; never an authority
generated    docs/INDEX.md + docs/system/sub-systems/*/AGENTS.md   ← `arch.py emit`; never hand-edited
```

The **records** layer is the part the doc set never had: decisions (`MY-AD-NNNN`), regression guards
(`MY-RG-NNNN`), and the mutation ledger (`docs/system/logs/mutations.jsonl`). Its rules, write path
and gates are specified in `docs/ARCHITECTURE-TRANSMUTATION-PLAN.md`; the tool is `scripts/arch.py`;
vocabulary and ownership come from `docs/foundations/44`.

Route any path — **a document OR a code path** — to its rung/organ/record home, and pull the
bundle you need before editing:
```bash
python3 scripts/arch.py route docs/foundations/19-choice-and-polarity-engine.md
python3 scripts/arch.py route src/core/orchestration        # code -> organ + contract docs
python3 scripts/arch.py context src/core/assessments       # contract docs + organ docs + records
python3 scripts/arch.py search "alignment adjustment"      # BM25 search over the live KB
python3 scripts/arch.py search --relations --rung canon "polarity"   # + edges + missing-link suggestions
python3 scripts/arch.py related docs/foundations/19-choice-and-polarity-engine.md   # backlinks + suggestions
python3 scripts/arch.py doc add --organ safety --title "..."   # author an organ document (refuses orphans)
```

**Start work on any code path with `context`.** It answers *which foundation docs govern this, what
was decided about it, and what has broken here* — the alignment step, made deterministic instead of
remembered.

### 2.1 Structure

```
mysterium/                ← repository root
├── _org.yaml             ← THE structure declaration: rungs, 13 organs, DG1–DG18 (machine-readable)
├── AGENTS.md             ← process protocol (the root router — this file)
├── scripts/arch.py       ← the ONLY write path for AD/RG; validates every rung
│
└── docs/
    ├── INDEX.md          ← GENERATED by `arch.py emit` (never hand-edited — DG11 fails when stale)
    ├── 00-vision.md · 01-first-principles.md · 02-glossary.md · 03-research-methodology.md
    │                     ← RUNG canon-root (why we build this + shared vocabulary)
    ├── foundations/      ← RUNG canon (theory + game-design translation)
│   ├── AGENTS.md         ← canon rung router (read this + 44 first)
│   ├── 44-system-ontology-and-vocabulary.md  ← THE GRAMMAR: axes, ladder, owners, blacklist
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
│   ├── 43-agentic-orchestration-architecture.md ← Primary orchestrator + sub-agent council + tool systems + log protocol
│   │
│   │  ── Personalization & generation (ratified 2026-09-20) ──
│   ├── 45-personalization-and-context-pooling.md ← UDV, three-library pooling, analogical bridge, engagement contract
│   ├── 46-generative-world-composition.md  ← facets, tag store, derived dialectic, composition pipeline
│   └── 47-preference-inference-and-scaffolding.md ← evidence tiers, interest record, scaffold library, inference red line
│
├── concept-drafts/      ← RUNG content: 512 game concept documents (64 modules × 8 files)
│   ├── README.md        ← Templates and requirements for each file
│   ├── ROADMAP.md       ← Development phases and process
│   └── {line}/{stage}/  ← 64 module directories
├── system/              ← RUNG system + records: 13 ORGAN pools under sub-systems/
│   ├── AGENTS.md        ← system rung router
│   └── sub-systems/<organ>/{AGENTS.md, <contracts>, core/{decisions,regressions}/}
├── lines/               ← Per-line documentation
├── stages/              ← Per-stage documentation
├── progression/         ← Progression overview
├── narrative/           ← Narrative architecture
├── audits/              ← dated audit evidence behind the RG ledger (NON-LIVE)
└── historical/          ← RUNG historical: quarantined dormant directories (NON-LIVE, never cited)
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
| foundations/28 | HoloOS open-joints mapping — open-joints tracking as the depth signal |
| foundations/29–32 | Curriculum expansion set: meta-learning science, holonic curriculum architecture, depth-assessment model, agentic curriculum linter |
| foundations/34–36 | Curriculum expansion set (cont.): engine bridge, framework complexity, upgrade plan |
| foundations/37–41 | Domain expansion set: K-12, cohort weave/multiplayer, action-induction journal, measurement packs + efficacy infra, global recognition/credentialing |
| foundations/42 | Developmental Levelling Mechanism — unified evidence-only grading/staging (competence/identity firewall) |
| foundations/43 | Agentic Orchestration Architecture — primary orchestrator + sub-agent council + tool systems + log protocol |
| foundations/44 | **THE GRAMMAR** — the three axes + their firewalls, the ratified ladder, the term→owner table (52 owners, machine-readable), the superseded-vocabulary blacklist (DG5 reads it), and external-canon precedence |
| foundations/45 | Personalization & Context Pooling — the user-dimensionality vector as a **retrieval key**, world/NPC/scenario pooled *before* `24`'s selection (retrieval-then-rank, never a second scheduler), the three-layer analogical bridge, and the engagement contract with its two tests |
| foundations/46 | Generative World Composition — entities are **composed from facets**, not stored whole: the `[line × stage × characteristic]` facet key, the tag store whose dialectic opposites are **derived** by reflection, the composition pipeline, and the 512 concept-drafts as facet modules |
| foundations/47 | Preference Inference & the Scaffold Library — interest categorised by **domain × mode × depth × salience × load-bearing × aim × provenance**, the meta-program catalogue under an **evidence tier** (T1/T2/T3), the ten scaffolds with fading, and the structural red line (the inference module's only write path is the UDV) |
| **-- Architecture / process docs --** ||
| docs/system/sub-systems/kernel/stage-assessment-architecture | The MODULE CONTRACT (composition rules, interfaces, 4 execution modes) — now the `kernel` organ's contract doc |
| ONBOARDING-REDESIGN-PLAN | Binary-search composite assessment for initial Significator seeding — owned by the `onboarding` organ |
| ARCHITECTURE-TRANSMUTATION-PLAN | The documentation transmutation (rungs, AD/RG/Logs, phases P0–P7) |
| `docs/system/core/{decisions,regressions}/` | **MY-AD-nnnn** decisions and **MY-RG-nnnn** regression guards — written only via `python3 scripts/arch.py` |
| UNIFIED-IMPLEMENTATION-PLAN | ARCHIVED (`docs/historical/archive/old-plans/`) — legacy-removal phase record; superseded by the current phase in §4.2 |
| concept-drafts/README | TEMPLATES for what each concept-draft file must contain |
| concept-drafts/ROADMAP | The TRAJECTORY for developing all 512 concept-drafts |
| MVP-BLUEPRINT.md | ARCHIVED (`docs/historical/archive/old-plans/`) — historical canon record; live canon = `docs/foundations/` + `docs/INDEX.md` (blueprint decision #2 revised in `docs/foundations/41-global-recognition-credentialing.md` §0) |

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

### 4.2 Current state: all nine build phases are IMPLEMENTED

Concept-drafts are **COMPLETE** (all 512 exist across 64 modules × 8 files). Legacy removal is
**DONE**. **All nine build phases** (1 Delegation Kernel → 9 Credentialing) are **implemented and
gated** — kernel gates G1–G21 green, the post-plan frontier closed. **There is no *current* phase
number** — work is selected by the record layer. **One phase is ratified and unbuilt: Phase 10**
(Generative World & Personalization, from `45` / `46` / `47`; gates G22–G25) — its order and gates are
in `docs/DEVELOPMENT-PLAN.md §4`, and it is the only outstanding build work. Cite this section and the
plan, never a phase number spoken from memory.

> **Corrected 2026-09-20 (`MY-AD-0017`).** Until then this section declared *"The current phase is
> Phase 1"* while `docs/DEVELOPMENT-PLAN.md §8` recorded all nine phases implemented and §9 logged the
> five post-plan frontier items closed on 2026-09-17 (`G14`/`G15` have been in
> `src/core/validation/gates.ts` since then). An agent obeying the root protocol — this file — would
> have rebuilt finished work. The stale half was the plan's §2 gap table; both are corrected, and §2
> now carries the closure evidence per gap.

**The binding plan is `docs/DEVELOPMENT-PLAN.md`** (order + gates). It is revised in-place; on
conflict the foundations docs win and the plan is revised.

**What is actually open** — two lists, both owned by the record layer. Do **not** duplicate their
contents here; read them where they live:

1. **Ratified laws with no consumer.** Decisions the canon has ratified that no code implements yet:
   `MY-AD-0006` (register classes), `MY-AD-0007` (one articulation ladder, two registers),
   `MY-AD-0008` (alignment bias — the seam exists, the consumer does not), `MY-AD-0009` (two-fold
   world memory + per-holon owner worker), `MY-AD-0010` (background workers), `MY-AD-0011`
   (integrated human intervention), `MY-AD-0018` (the user-dimensionality vector as retrieval key),
   `MY-AD-0019` (world/NPC/scenario pooling), `MY-AD-0020` (the ethics and data-privacy classes and
   projection firewall), `MY-AD-0021` (entities are composed from facets, not stored whole — with
   the tag/dialectic store), `MY-AD-0022` (preference is inferred under an evidence tier; only the
   instrumented tier becomes a field of record) and `MY-AD-0023` (delivery structure is selected from
   a scaffold library and must fade). Plus the Auditor Projection Layer (`16 §2.4/§10.4`).
   `python3 scripts/arch.py related <ID>` pulls any record's edges.
2. **Documentation and knowledge-base integrity.** `_org.yaml → pending` — `CODE-PASS`, the `RT-*`
   gate/ingest items and the `KB-*` items (orphan-script triage, the undocumented organs, skills
   provenance, `validate --json`, canon→code ingest).

**A law that is Active with no consumer is the normal shape of pending work here.** When you
implement one, record the implementation in the same commit and cite the record it closes.

Standing constraints: workspace-lint → `arch.py validate` (DG1–DG18) → build + test → commit + push to BOTH remotes (`origin` GitHub, `gitlab`). See §7.5. The full gate roster is in `_org.yaml → gates` and in step 1b below.

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

Every game follows: Catalyst → Experience → Integration. The game is not a test — it is a developmental practice that simultaneously diagnoses AND heals/evolves.

**Scope of "never diagnostic to the user" (revised 2026-09-20; canon home = `docs/foundations/20` §11).** The prohibition binds the **closed register class** absolutely: polarity (direction, magnitude, cells, textures, crystallization index), shadow (quadrants, intensities, ledger entries), ray profile, harvest eligibility/verdict, and delegation inference fields are **never player-readable, at any stage**. The **open register class** (stage altitudes, line profiles, drive balance, theta freshness, curriculum rungs/depth/retention, mastery sequences, pack θ, engagement patterns, and the system's own architecture) **is** player-readable at any stage, metric-bearing, through the Articulation Ladder (`foundations/16` §10.5). This is a deliberate, recorded divergence from HoloOS's D3 Veil (`foundations/20` §11.2), compensated by the closed class keeping the endgame's load-bearing state ungameable.

### 5.5 Self-Contained and All-Inclusive

Each game at a given line×stage must probe the ENTIRE span of drives × shadow-polarities for that module. It must have its own internal progression from diagnosis → healing → evolution.

### 5.6 The Holon Is Never Outgrown

Lower stages must remain healthy. Games at earlier stages are never "completed" — they become shadow-mode encounters that maintain holonic integrity. Theta-decay ensures neglected stages degrade, and the consciousness index requires lower-stage health for upper-stage unlocks.

### 5.7 The Infinite Checkpoint Model

Every game is an infinite checkpoint game. Players can leave at any checkpoint. Progress is saved continuously. Session length is player-determined. The game is addictive through felt-sense of growth, not dopamine manipulation.

### 5.8 The 7 Modalities as Catalyst Axes

The 7 game modalities are 7 AXES through which catalyst of a particular frequency (line×stage) is delivered. They are not just different game types — they probe different dimensions of the same shadow in different manners. The LLM operates WITHIN each modality using rubrics. Fixed mechanics + adaptive content.

---

## 6. AQAL Quadrants (model closed 2026-09-20; wiring deferred)

The 4 AQAL quadrants (UL interior-individual · UR exterior-individual · LL interior-collective · LR
exterior-collective) are no longer a missing model. The ratified ontology Mysterium is already
governed by carries every altitude's markers **per quadrant** — integrity and pathology alike — and
those are now ingested into code (`StageQuality`, `MY-AD-0030`, canon `02 §3` / KosmOS
`_Ontology/stages/altitude.md`). `pathologies.md` is the same fourfold model as §5.2 below.

Three things follow, and one is still deferred:

- **Closed.** The quadrants are present, per altitude, from a ratified source — not invented locally.
- **Closed.** The dual vectors of §5.3 became computable: `agapeScan(cog)` enumerates every altitude
  below the centre of gravity (the heal/evolve agenda, and the mechanism by which §5.6's
  never-outgrown lower stages are actually maintained), and `erosScan(cog)` reads the CoG's own
  threshold markers plus the altitude they are called toward.
- **STILL DEFERRED — wiring.** How quadrant dynamics *feed the encounter architecture* (which
  quadrant a generated encounter should stress, and how a macro-catalyst's PESTLE pressure maps onto
  LR) is unresolved, and nothing at runtime reads the markers yet. Tracked as
  `_org.yaml → pending → QUALITY-WIRING`. It is now a wiring question, not a missing-model question,
  which is what the original deferral was waiting for.

Latitude: `LINE_QUADRANT` maps lines to UL/UR/LL and leaves LR to the world-state PESTLE system
(`TransformationDetector` documents the proxy it uses in the interim).

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

1b. **Doc-governance gates** — Run `python3 scripts/arch.py validate` after every change to `docs/`, `_org.yaml`, or a record. It must exit 0 (gates DG1–DG19: record schema, status enum, numbering + no-reissue, authority uniqueness, superseded vocabulary, historical quarantine, ownership, reference resolution, ledger integrity, canon↔code, derived-surface freshness, canon link integrity, organ integrity, **relationality** — no authored document may be an orphan — **Source resolution**, **cited-path resolution** — a backticked citation must point at something real, prose included — **record-reference resolution** — a cited `MY-AD-*`/`MY-RG-*` ID must exist — **router coverage** — every document in a rung must be named by that rung's router, so a document cannot be ratified into invisibility — and **law consumer** — every Active AD declares where it is consumed or a `_org.yaml → pending` key that will consume it, because a ratified law with no consumer is invisible pending work).

   A gate that cannot fail is decoration (`MY-RG-0010`). Run `python3 scripts/arch.py fixtures` (it is part of this step): it injects one targeted violation per gate, runs that gate alone, restores the tree, and reports any gate that passed on its own violation as toothless. 19/19 gates are proven this way; a new gate without a fixture is reported `! no fixture (teeth unproven)` rather than assumed good.

   - **Records are written only through the tool.** Never hand-create or hand-edit a `MY-AD-*`/`MY-RG-*` file: `arch.py new` / `arch.py update` / `arch.py seed` write the ledger receipt that DG9 requires.
   - **Documents are written through the tool too.** Use `arch.py doc add --organ <organ> --title "..."` to author an architecture document; it lands in the organ, is **auto-discovered** (reachable from `route`/`context`/`search`/`related` the moment it exists), and needs no registry edit. Authoring a document by hand means hand-editing `_org.yaml` and `44` — which `MY-RG-0015` exists to prevent. Never enumerate an organ's contents anywhere: `_org.yaml` declares the *structure*; the *contents* are discovered.
   - **Generated surfaces are never hand-edited.** After any change to `_org.yaml` or to a record, run `python3 scripts/arch.py emit`; DG11 fails while `docs/INDEX.md` or an organ router's auto-zone is stale.
   - **Vocabulary changes** happen only via `docs/foundations/44` (add a blacklist entry, then sweep — see RG-0001 for why a chained renaming is one-way and receipt-guarded).
   - **Before answering "what does this word mean" or "who owns this?"** read `docs/foundations/44`; before answering "what did we decide / what broke?" read `docs/system/core/{decisions,regressions}/`; before editing code, run `arch.py context <path>`.

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

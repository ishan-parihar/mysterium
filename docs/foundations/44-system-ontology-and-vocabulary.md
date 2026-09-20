# foundations/44 — System Ontology & Vocabulary

> **Status:** Active (ratified 2026-09-20)
> **Lateral:** the **grammar** of Mysterium. This document owns the alphabet: the axes and their
> firewalls, the ratified ladder, the term→owner table, and the blacklist of superseded vocabulary.
> Every other document **references** this one; nothing here is restated elsewhere.
> **Read this first** when you need to know what a word means or which document owns it.
> **Machine-readable blocks:** §8 (owners) and §9 (blacklist) are parsed by
> `scripts/arch.py validate` (gates DG5 and DG7). Keep the fences and the block markers intact.

---

## 1. Why this document exists

Mysterium's doc set had no owner for its own vocabulary. The ratified grammar was scattered across
six documents — the three axes in `06 §5.1`, the ladder in `02`, register classes in `20 §11`, the
articulation ladder in `16 §10.5`, the depth firewall across `31`/`42`, the line registry in `03` —
so an agent had to read all six to learn the alphabet. That is the mechanism that produces
*redundant analogy* and *confusing architecture*: when no document owns a word, every document
redefines it slightly.

The rule this document establishes: **one term, one owner, one meaning.** A term either is defined
here or is owned by a document named in §8. A document that needs a term references its owner
rather than redefining it.

---

## 2. Sources and precedence

Mysterium's metaphysical vocabulary is not original. Two external canon sources govern it, and one
metaphor governs the design stance:

| Source | Governs | Status |
|---|---|---|
| **HoloOS** `_THEORY/02_Ontology/` | densities (VIBGYOR), octaves, the Veil, the primal distortions | **canonical where it speaks** |
| **KosmOS** `_Ontology/` | altitudes (L1–L10), the stage-number axis (MHC/Kegan), the ray lens, framework-density, AQAL structure | **canonical where it speaks** |
| **Law of One** (Ra material, via `06`) | the 7 rays, the Choice, harvest | canonical where `06` cites it |

**Precedence rule (ratified 2026-09-20).** Where HoloOS or KosmOS speaks on a term, that source
governs Mysterium's definition of it. Where they are silent, Mysterium's own `foundations/*` owns the
term. Where a Mysterium document **diverges** from them, the divergence must be **recorded with its
compensation** — see `20 §11` (the D3 Veil divergence) for the pattern. A silent divergence is a
defect, not a decision.

**KosmOS's own law (`CONSTITUTION.md` rule 13):** the axes are never conflated. This document
enforces that law inside Mysterium.

---

## 3. The axes — and the firewalls between them

Five things in Mysterium look like "levels" and are **not** the same axis. They are never averaged,
summed, or used as proxies for one another.

| Axis | Domain | Canonical home | Meaning |
|---|---|---|---|
| **A** — **Altitude** | the one vertical | `06 §5.1`, `02` | how high; L1…L10. Every line climbs this. |
| **B** — **Stage number** | within-altitude resolution | `02 §2.3` (MHC/Kegan spans) | *how* the ascent differentiates — MHC Orders 0–16, Kegan 0–5+. |
| **C** — **Ray / density lens** | the Law-of-One overlay | `06 §5.1`, `06 §3` | **a lens, never a place.** 9 sub-octave positions (Blue 5a/5b, Indigo 6a/6b). Horizon vocabulary. |
| **D** — **Framework-density** | the *knowledge* axis | `31` (DepthLevel), `42` (depth rungs) | concept → concrete-op → formal-op → vision-logic → beyond. A different question entirely. |
| **E** — **Intra-holonic vertical** | the consciousness topography | `13` | the 5 substrate layers *inside* a holon — not stages, not densities. |

**Firewall laws (each has a gate or a documented failure it prevents):**

1. **Altitude ≠ ray/density.** `06 §5.1`. A stage is never labelled with a density.
2. **Altitude ≠ framework-density.** A player can hold high altitude with shallow knowledge and vice
   versa; `31`/`42` keep them separable, and `42 §1.1` forbids computing one from the other.
3. **Competence ≠ identity.** `42 §1.1`. Knowledge-axis measures never feed identity diagnostics.
4. **Open ≠ closed register.** `20 §11`. What the surface may show is a different question from what
   the engine measures.
5. **Architectural log ≠ session log.** §7 below. Development history and player evidence are
   different stores with different owners.
6. **Mysterium stage names are Spiral-Dynamics *colours*.** They are not HoloOS densities. The
   colours are names for altitudes; HoloOS's VIBGYOR names are functions of density. `06 §5.1`.

---

## 4. The ratified ladder (canonical — supersedes every earlier ladder)

Ratified 2026-09-20 (`06 §5.1`). Mysterium keeps **eight** stages: they are KosmOS **L1–L8**, plus a
closure that is **not a stage**.

| # | Stage | KosmOS altitude | MHC stages | Kegan | Ray lens (within D3) |
|---|---|---|---|---|---|
| 1 | Infrared | L1 Infrared | 1–2 | — | Red (1st) |
| 2 | Magenta | L2 Magenta | 3 | 0→1 | Orange (2nd) |
| 3 | Red | L3 Red | 4–5 | 1→2 | Yellow (3rd) |
| 4 | Amber | L4 Amber | 6–10 | 2→3 | Green (4th) |
| 5 | Orange | L5 Orange | 11–12 | 3→4 | Blue in (5a) |
| 6 | Green | L6 Green | 13 | 4 | Blue out (5b) |
| 7 | **Teal** | L7 Teal | 14 | 4→5 | Indigo (6a) — the gateway *opens* |
| 8 | **Turquoise** | L8 Turquoise | 15 | 5 | Indigo (6b) — the gateway *traversed* |
| — | *(the closure — not a stage)* | **L10 Violet** | 17 | 5+ | Violet (7th) → **the D3→D4 harvest** |

**Consequences that bind every other document:**

1. **`White` retired as a stage.** Its content split: "total integration / harvest readiness" → **L8
   Turquoise**; the harvest → the **Violet closure event** (`16 §11.5`). The former `07 Turquoise`
   re-indexed to **`07 Teal`**.
2. **A stage's `Energy Ray` is its ladder ray** — Teal = Indigo (6a), Turquoise = Indigo (6b). The
   **Violet ray belongs to the closure event**, never to a stage. `06 §5.4`'s 8-stage↔7-ray bridge is
   retained only as **cosmetic sub-octave decoration**; where the two disagree, this ladder wins.
3. **L9 Indigo and every density above D4 are out of scope** as developmental states — beyond the
   human range. L9 is **reserved post-harvest territory** (`16 §11.6`), never playable.
4. **The world is D3 (Yellow)** — the density of self-awareness, the Choice, and the Veil. The eight
   stages are the **D3 sub-octave**; the harvest is its closure — in-octave, one event two sides.
5. **The objective is not the harvest** (`06 §7.4`): *continuing developmental progression across all
   dimensions without residual entropy or residual shadows.* The closure is an emergent horizon,
   never an optimisation target. `Samsara` is the normal condition of a healthy practice, not a
   failure state.

---

## 5. The closure event (definition)

"Harvest", "the closure", "the Violet event", `harvest_event`, and "the D3→D4 transition" are **one
event**, owned by `19 §9.6` (eligibility vs event) and `16 §11.5` (the lifecycle stage E). Two things
must never be conflated again:

| | What it is | Criterion | Owner |
|---|---|---|---|
| **Choice-eligibility** | a *condition* — is this entity's Choice structurally authentic at all? | `19 §9.2`/§9.3 (`checkChoiceEligibility`) | `19` |
| **The harvest / closure** | the *event* — polarity locks, archive, retirement | eligibility **∧** arrival at the closure | `16 §11.5`, `19 §9.4` |

The runtime function was renamed `checkHarvest` → **`checkChoiceEligibility`** because it computes the
condition, not the event. Eligibility is never itself an endgame trigger.

---

## 6. Registers and depth (pointers, not definitions)

Three mechanisms describe *how much* of the system a given viewer may see. Their definitions live in
their owners; this section exists so no document invents a fourth:

| Mechanism | Owner | One-line |
|---|---|---|
| **Register classes** (open / closed) | `20 §11` | full metric register is available at **any** stage; the *consequences* of showing it are the governed question |
| **The Articulation Ladder** (L0–L7, AL1–AL6) | `16 §10.5` | one ladder, two registers: self-register (stage-articulated, scoreless) and auditor-register (metric-bearing). No privilege tiers. |
| **Veil / implicit operation** | `20` | the game never presents itself as a test; everything is measured in the background |

The self-register and the auditor-register render **the same derivation** — they differ in
articulation, never in truth. Access is a **consented traversal** (`16 §2.4`), never a credential class.

---

## 7. Log kinds (a firewall)

"Log" means two different stores. Conflating them corrupts both.

| Log | What it records | Home | Owner |
|---|---|---|---|
| **Architectural log** | *our* mutations — AD/RG lifecycle, structural moves, refactors | `docs/system/logs/mutations.jsonl` + `docs/system/core/worklog/` | `_org.yaml`, this plan's P4 tooling |
| **Session log** | *the player's* encounters — the runtime evidence stream | the runtime data plane (`src/infra/persistence`) | `43 §4.4` |

The architectural log is history and is never hand-edited (it is written by `scripts/arch.py`). The
session log is player evidence and is never a development record.

---

## 8. Term → owner (machine-readable)

**Rule:** a term listed here is owned by that document. Other documents may *use* it and must
*link* to the owner; they must not restate its definition. `docs/system/core/decisions/` records hold
the ADs that changed these owners.

```yaml
# owners-table (DG7 reads this block)
owners:
  # meta
  vocabulary-and-axes: foundations/44-system-ontology-and-vocabulary
  rung-map-and-records: _org.yaml
  build-phase-order: DEVELOPMENT-PLAN
  root-protocol: AGENTS.md

  # substrate
  integral-framework: foundations/00-integral-theory
  quadrants: foundations/01-aqal-quadrants
  stages-ladder-and-mhc: foundations/02-eight-stages-overview
  lines-registry: foundations/03-lines-of-intelligence-overview
  states: foundations/04-states-of-consciousness
  drives-and-polarities: foundations/05-drives-and-polarities
  cosmology-density-ray: foundations/06-law-of-one-correspondence
  neuroscience: foundations/07-neuroscience-of-development
  psychophysics-staircase: foundations/08-psychophysics-and-staircase
  flow-engagement: foundations/09-flow-and-engagement-theory

  # lesser cycle
  shadow-model: foundations/10-shadow-and-pathology
  modalities: foundations/11-game-modalities
  drive-probes-and-rubric-validation: foundations/12-drive-assessment-mechanics
  consciousness-topography: foundations/13-architecture-of-consciousness
  catalyst-integration: foundations/14-game-as-developmental-catalyst

  # greater cycle
  macro-archetypes: foundations/15-macro-scale-archetypal-mind
  significator-and-lifecycle: foundations/16-significator-architecture
  articulation-ladder: foundations/16-significator-architecture
  transformation: foundations/17-transformation-mechanics
  world-architecture: foundations/18-great-way-world-architecture
  choice-eligibility-and-consequence: foundations/19-choice-and-polarity-engine
  veil: foundations/20-veil-of-forgetting
  register-classes: foundations/20-veil-of-forgetting
  incarnation-synthesis: foundations/21-incarnation-architecture
  holon-context-engine: foundations/22-holon-context-engine

  # curriculum and mechanisms
  polarity-ontology-cells: foundations/23-polarity-ontology
  encounter-scheduler: foundations/24-encounter-scheduler
  consciousness-index-composite: foundations/25-cumulative-consciousness-index
  core-module-contract: foundations/26-unified-core-architecture
  objective-alignment: foundations/27-auto-mode-strategy-engine
  holoos-open-joints: foundations/28-holoos-open-joints-mapping
  depth-axis: foundations/31-depth-assessment-model
  levelling-mechanism: foundations/42-developmental-levelling-mechanism
  orchestration-and-workers: foundations/43-agentic-orchestration-architecture
  world-consequence-memory: foundations/22-holon-context-engine
  human-intervention: foundations/43-agentic-orchestration-architecture

  # curriculum detail
  meta-learning: foundations/29-meta-learning-science
  holonic-curriculum: foundations/30-holonic-curriculum-architecture
  curriculum-linter: foundations/32-agentic-curriculum-linter
  dashboard-render-contract: foundations/33-self-directed-dashboard
  curriculum-engine-bridge: foundations/34-curriculum-engine-bridge
  framework-complexity: foundations/35-framework-complexity-curriculum-mapping
  curriculum-upgrade-plan: foundations/36-curriculum-upgrade-plan

  # domains
  k12: foundations/37-k12-curriculum-expansion
  cohort-multiplayer: foundations/38-cohort-weave-multiplayer
  action-induction-journal: foundations/39-action-induction-journal-system
  measurement-packs: foundations/40-measurement-packs-efficacy-infra
  credentialing: foundations/41-global-recognition-credentialing
```

**Not owned by any single document** (declared here so no one claims them): the term `Mysterium`
itself, the four lines of §3's firewall laws, and the concept-draft corpus (owned by
`concept-drafts/README.md`).

---

## 9. Superseded vocabulary — the blacklist (machine-readable)

`scripts/arch.py validate` (DG5) fails when a **live** document (rungs `canon`, `canon-domain`,
`system`, `content`, `plans`) uses a superseded term in a superseded sense. Historical records
(`docs/historical/**`, `docs/audits/**`, `CHANGELOG`, `PROGRESS`) are exempt **by design** — they
describe a date.

```yaml
# vocabulary-blacklist (DG5 reads this block)
blacklist:
  - term: "White"
    superseded_sense: "a stage of development (the 8th, Super-Integral)"
    correct: "`White` is not a stage. The 8th stage is **Turquoise** (L8). The harvest is the **Violet closure event**."
    patterns:
      - "White\\s+stage"
      - "stage\\s+White"
      - "at\\s+White\\b"
      - "White\\s+\\(Super-Integral"
      - "\\b08-white"
      - "White\\s+(?:is|was)\\s+the\\s+final"
    exempt_in: ["foundations/06-law-of-one-correspondence", "docs/foundations/44-system-ontology-and-vocabulary.md", "DEVELOPMENT-PLAN", "ARCHITECTURE-TRANSMUTATION-PLAN", "foundations/02-eight-stages-overview"]

  - term: "Turquoise"
    superseded_sense: "a stage name for the 7th stage (Integral)"
    correct: "the 7th stage is **Teal** (L7); `Turquoise` names the 8th stage (L8)."
    patterns:
      - "Turquoise\\s+\\(Integral"
      - "07-turquoise"
      - "Turquoise\\s*[÷/]\\s*Integral"
    exempt_in: ["foundations/06-law-of-one-correspondence", "docs/foundations/44-system-ontology-and-vocabulary.md", "DEVELOPMENT-PLAN", "ARCHITECTURE-TRANSMUTATION-PLAN", "ONBOARDING-REDESIGN-PLAN", "foundations/02-eight-stages-overview"]

  - term: "harvest"
    superseded_sense: "a destination, target, or progression goal"
    correct: "the harvest is the **closure event** — an emergent horizon, never the system's objective (06 §7.4)."
    patterns:
      - "harvest\\s+as\\s+(?:a\\s+)?(?:destination|goal|target)"
      - "progress\\s+to\\s+(?:the\\s+)?harvest"
      - "harvest\\s+is\\s+the\\s+(?:goal|objective|point)"
      - "maximi[sz]\\w*\\s+harvest"
    exempt_in: ["foundations/19-choice-and-polarity-engine", "foundations/20-veil-of-forgetting", "ARCHITECTURE-TRANSMUTATION-PLAN", "DEVELOPMENT-PLAN", "foundations/06-law-of-one-correspondence", "foundations/16-significator-architecture", "foundations/25-cumulative-consciousness-index", "docs/foundations/44-system-ontology-and-vocabulary.md"]

  - term: "density"
    superseded_sense: "applied to a stage or a stage band (e.g. 'White is D4', 'D1 = Infrared')"
    correct: "**density is not a developmental state** for a D3 entity. The eight stages are the **D3 sub-octave**; D5+ and L9 are out of scope (06 §5.1)."
    patterns:
      - "\\bD[1-7]\\s*(?:=|≈|→)\\s*(?:Infrared|Magenta|Red|Amber|Orange|Green|Teal|Turquoise)"
      - "\\bstage\\s*=\\s*density"
      - "\\bD[45]\\+\\s*density"
    exempt_in: ["foundations/06-law-of-one-correspondence", "foundations/02-eight-stages-overview", "foundations/19-choice-and-polarity-engine", "docs/foundations/44-system-ontology-and-vocabulary.md", "ARCHITECTURE-TRANSMUTATION-PLAN"]

  - term: "Orange (as a density floor)"
    superseded_sense: "`altitude_floor >= Orange` used as a density threshold"
    correct: "re-expressed as **choice-readiness** (19 §9.6); the criterion is never a stage-name proxy for a density."
    patterns:
      - "altitude_floor\\s*[><=]+\\s*Orange"
    exempt_in: ["foundations/19-choice-and-polarity-engine", "ARCHITECTURE-TRANSMUTATION-PLAN"]

  - term: "ATB / combat-only progression"
    superseded_sense: "time-bar combat as the progression spine"
    correct: "assessment-module execution replaces ATB (26); combat exists only as narrative affordance."
    patterns:
      - "combat-only progression"
      - "time-bar combat"
    exempt_in: ["DEVELOPMENT-PLAN", "ARCHITECTURE-TRANSMUTATION-PLAN", "docs/foundations/44-system-ontology-and-vocabulary.md"]

  - term: "checkHarvest"
    superseded_sense: "the name of the eligibility function"
    correct: "**`checkChoiceEligibility`** — it computes the condition, not the event (19 §9.6)."
    patterns:
      - "checkHarvest"
    exempt_in: ["foundations/19-choice-and-polarity-engine", "DEVELOPMENT-PLAN", "ARCHITECTURE-TRANSMUTATION-PLAN"]
```

**Adding a term to this blacklist is how a vocabulary correction becomes permanent.** The pattern:
(1) rule the correct sense, (2) sweep active canon, (3) add the entry here with its `exempt_in` list,
(4) the gate prevents regression without a human remembering.

---

## 10. The rung map

The documentation rungs, the organs, the record homes and the gate set are declared
**machine-readably** in `_org.yaml` at the repository root. Route any path with:

```bash
python3 scripts/arch.py route docs/foundations/19-choice-and-polarity-engine.md
```

Rungs in one line: **canon** (theory) → **system** (contracts, as organs) → **records** (AD/RG/Log)
→ **content** (the 512-file corpus), with **historical** outside all of them and never an authority.

---

## 11. How to change this document

This document is the only place a *term* is defined. Changes follow the update protocol
(`AGENTS.md §3.2`) with one addition, because vocabulary changes are the highest-blast-radius edits
in the project:

1. **Ratify the sense** — the user's understanding is authoritative on theory (`AGENTS.md §3.1`).
2. **Sweep active canon** — every affected document, mechanical parts scripted with a
   **receipt-guarded, one-way migration** (see `scripts/doc-stage-reindex.py` and plan §12: a
   non-idempotent sweep was applied twice and corrupted 194 files).
3. **Add the blacklist entry** (§9) with its `exempt_in` list.
4. **Record the decision** as an AD (`docs/system/core/decisions/`) citing this document.
5. **Run the gates** — `arch.py validate` must exit 0.

---

## 12. Principles served

Principles **1** (honest simulation: the model is stated, not implied), **5** (one vocabulary
everywhere), **7** (honest codebase: docs and code agree or the divergence is annotated), and **8**
(a curriculum needs a stable grammar to teach in).

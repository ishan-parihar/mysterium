# foundations/AGENTS.md — Canon Rung Router

> **Role:** the canonical entry point for `docs/foundations/` (rung **canon** in `_org.yaml`).
> A router, not a treatise: it says what each document owns and in what order to read them.
> Definitions live in the documents; vocabulary lives in `44`.
> **Status:** Active (2026-09-20) · **Owner of record:** this file is the rung's authority
> (`_org.yaml → rungs.canon.authority`).

---

## 1. Read this first

1. **`44-system-ontology-and-vocabulary.md`** — the grammar: the five axes and their firewalls, the
   **ratified ladder**, the term→owner table, the **superseded-vocabulary blacklist**. Every term you
   are about to read is defined there or owned by a document it names.
2. **`_org.yaml`** (repository root) — the machine-readable rung/organ/record map. Route any path:
   `python3 scripts/arch.py route <path>`.

If a document below appears to define a term that `44` owns, **`44` wins** and that document is a
defect to fix (`AGENTS.md §3.2`).

## 2. The clusters (47 documents)

| Cluster | Documents | What it answers |
|---|---|---|
| **Meta** | `44` | the grammar, the axes, the ladder, the owners, the blacklist |
| **Substrate** | `00`–`09` | the theory Mysterium is built on: integral framework, quadrants, stages, lines, states, drives, Law-of-One, neuroscience, psychophysics, flow |
| **Lesser cycle** — Matrix → Potentiator → Catalyst → Experience | `10`–`14` | one moment of catalyst→experience for one capacity: shadow model, modalities, probes, consciousness topography, integration |
| **Greater cycle** — Significator / Transformation / Great Way / Choice / Veil | `15`–`22` | the soul's lifecycle across all capacities: archetypes, the Significator, transformation, the world, the Choice, the Veil, the synthesis, the holon context engine |
| **Curriculum & mechanisms** | `23`–`36` | the 64-cell polarity catalogue, the encounter scheduler, the composite index, the core module contract, objective alignment, curriculum architecture, depth, linter, dashboard, bridges |
| **Domains** | `37`–`41` | K-12, cohort/multiplayer, action-induction journal, measurement packs, credentialing |
| **Mechanisms (late)** | `42`–`43` | evidence-only levelling (competence/identity firewall), agentic orchestration (delegation kernel, workers, human intervention) |
| **Personalization & generation** | `45`–`47` | what the player *prefers* and how it is inferred (`47`), how world entities are *composed* rather than authored (`46`), and how a scenario is *assembled* for one player (`45`) |

`06 §5.1` is the keystone of the substrate: it fixes the three axes, the ladder and the closure.
`21` is the keystone of the greater cycle: it composes everything into a playable game.

## 3. Ownership highlights (full table in `44 §8`)

| Question | Owner |
|---|---|
| What does a word mean? | `44` |
| The ladder, stages, MHC resolution | `02` (ladder fixed in `06 §5.1`) |
| Density/ray/cosmology | `06` |
| The lines | `03` |
| Drives and shadow | `05`, `10` |
| Instruments and rubrics | `12` (+ RV1–RV7) |
| The player's state vessel and lifecycle | `16` |
| The Choice: eligibility vs event | `19` |
| What the player may see | `20` |
| The world and its memory | `18`, `22` |
| Selection of what comes next | `24`, `27` |
| The composite metric | `25` |
| Grading and staging | `42` |
| The delegation kernel | `43` |
| What the player prefers, and how it is inferred | `47` |
| How a world entity is composed | `46` |
| How a scenario is assembled for one player | `45` |

## 4. Document status conventions

Each document carries a `Status:` line near its head: `Active`, `Draft`, `Superseded`, `Frozen`, or
`Historical`. A document that is **not** `Active` never governs; if it reads as live, that is a defect
(the audits `D3`/`D5` classes). Historical records live in `docs/historical/` and are never cited as
authority (gate `DG6`).

## 5. Editing this rung

1. Identify the owner (`44 §8`) — never add content to a document that does not own the concept.
2. Check uniqueness — does the change duplicate another document? If so, reference instead.
3. Check consistency — does it contradict `06 §5.1`, `16 §10.5`/`§11.5`, `19 §9.6`, `20 §11`, or
   `27 §5.4`? If so, update every affected document in the same change.
4. Record the decision as an AD in `docs/system/core/decisions/` (rung **records**).
5. Run the iteration protocol (`AGENTS.md §7.5`): workspace-lint → `arch.py validate` → build + tests.

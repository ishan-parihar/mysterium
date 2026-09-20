# Documentation Set Audit — 2026-09-20

> **Status:** working plan (this report is itself a historical record once superseded — it
> describes the tree as of commit `23ec6ef` + the re-index in progress).
> **Scope:** the complete `docs/` tree (~110 active docs + 512 concept-drafts + 12 historical
> dirs), audited against the canon ratified 2026-09-20 and its external sources.
> **Ratified canon used as the yardstick:** `foundations/06` §5.1/§7.4 (three axes, ladder,
> teleology), `foundations/16` §10.5/§11.5–§11.6 (ladder, closure, reserved L9),
> `foundations/19` §9.6 (eligibility ≠ event), `foundations/20` §11 (register classes),
> `foundations/22` §7.4–§7.5, `foundations/27` §5.4, `foundations/43` §4.5b/§5.4/§4.7,
> `AGENTS.md` §5.4. External sources: HoloOS `_THEORY/02_Ontology/`, KosmOS `_Ontology/`.

---

## 1. Method

1. **Structural survey** — file counts per directory, duplicate/lateral declarations, INDEX
   coverage, and status stamps (`canonical` / `frozen` / `superseded` / `deferred`).
2. **Vocabulary sweep** — occurrence counts for superseded tokens across active canon
   (`White` as a stage, `Turquoise` as the integral stage, density labels `D4`–`D7`,
   "harvest as destination").
3. **Semantic check before mechanical fix** — every suspected deviation was read in context
   before being classified, because the first-pass lesson from `DOC-SET-AUDIT-2026-09-16`
   was that mechanical "reconciliation" can destroy correct content (the 7→8 rung case).
4. **Historical-record discipline** — `docs/archive/**`, `docs/audits/**`, `docs/CHANGELOG.md`,
   `docs/PROGRESS.md`, `docs/research/**`, `docs/superpowers/**`, `docs/brain-game-upgrade/**`,
   `docs/agentic-loop/**` are **never rewritten**; they describe a date. Where such a doc still
   reads as live canon, the fix is a **status stamp or a move**, not a rewrite.

---

## 2. Deviations found (stale canon vs ratified architecture)

### D1 — Stage vocabulary, tree-wide (mechanical; in progress)

The ratified ladder re-indexes the top two stages: former `07 Turquoise` (Integral) → **Teal**,
former `08 White` (Super-Integral) → **Turquoise**; the harvest becomes the **Violet closure**
(06 §5.1). Already done and committed:

- 16 concept-draft stage directories renamed (`concept-drafts/<line>/{07-turquoise→07-teal,
  08-white→08-turquoise}`) and the two stage docs (`stages/07-teal-integral.md`,
  `stages/08-turquoise-superintegral.md`).
- `foundations/06` hand-reindexed (banner, aesthetic tables, landscape table, ray map at §7).

**Still to apply** (blocked only on running the migration): ~150 occurrences across
`foundations/23` (25 in the 64-cell catalogue), `architecture/10` (11), `foundations/19` (10),
`21` (9), `12` (9), `18` (7), `16` (7), `02` (6), `lines/*` (5 each), `progression/00`,
`narrative/00`, `INDEX.md`, `02-glossary.md`, and the 512 concept-draft files' headers
(`**Module:** <line> / White`).
**Tool:** `scripts/doc-stage-reindex.py` (allowlisted, dry-run by default; excludes historical
records and `foundations/06`, which *defines* the migration).
**Manual review required (not scripted):** `foundations/23` — the 64-cell catalogue's stage rows
carry unique texture names per cell and must be read, not swapped blindly; and
`foundations/25` §…'s lowercase stage-weight map (`white: 1.0`) which is a code-like key.

### D2 — Density labels applied to stages (semantic; partially fixed)

`06 §5.1`, `02 §4`, `19 §9.6` are fixed. Remaining active-canon instances that present
densities as reachable developmental states:

| File | Issue |
|---|---|
| `foundations/42` | 4 refs to densities in the levelling ladder context — must say "L8 Turquoise", not a density |
| `foundations/16` §11.5–11.6 | fixed (closure + reserved L9) — verify no other density refs remain |
| `foundations/38`, `32`, `28`, `21` | single refs each; each needs the §5.1 vocabulary (L9/D5+ = out of scope) |
| `REQUIREMENTS.md`, `INDEX.md` | density vocabulary in the doc-set description |
| `architecture/06-polarity-engine.md` | "harvest mechanics" as a live engine claim (see R1) |

### D3 — Competing authority claims

- **`architecture/01-overview.md`** self-describes as *"The binding architectural contract for
  Mysterium."* That contradicts the ratified hierarchy (`AGENTS.md` §4.2: the **plan** owns
  order and gates, **foundations** own contracts). → demote to an index/pointer.
- **`RED-TEAM-AUDIT-DEFINITIVE.md`** sits at the docs root with
  *"Status: CRITICAL — 3 architectural pillars must be rebuilt"* (dated 2026-06-23). An agent
  reading the root will treat a two-month-old audit as live. → move to `docs/audits/` + stamp.
- **`PROGRESS.md`** is correctly stamped FROZEN ✅ (no change; referenced for completeness).

### D4 — Stale system references in architecture

- **`architecture/10-stage-assessment-architecture.md`** still carries **Part VIII "Relationship
  to Combat"** and **Part XIV "How This Replaces 'Combat-Only' Progression"** — the ATB combat
  system was removed (2026-07-24 archive pass; foundations were reworded, this doc was missed).
- The same doc carries 11 `White`-as-stage refs (D1).

### D5 — Dormant directories that read as canon

- `docs/agentic-loop/` (4 dated audit reports, 2026-08-28) — not in INDEX, no status stamp,
  describes itself as an architecture audit. Overlaps `foundations/43`'s subject matter.
- `docs/brain-game-upgrade/` (11 files) — absorbed per earlier audits but still unstamped.
- `docs/superpowers/plans/*` — partly archived; the live plan(s) need a Superseded stamp.

---

## 3. Redundancy map (what to consolidate)

| # | Candidate | Verdict | Action |
|---|---|---|---|
| R1 | `architecture/06-polarity-engine.md` ("64-cell catalogue, crystallization, 4-level aggregation, harvest mechanics") vs `foundations/19` + `23` | **Duplicate** — 23 *is* the catalogue, 19 *is* crystallization/aggregation | Shrink to an implementation pointer (code paths + links); delete the restated theory |
| R2 | `architecture/01-overview.md` "binding contract" | Authority duplication | Demote to index/pointer (§D3) |
| R3 | `architecture/11-curriculum-authoring.md` vs `foundations/30`/`31`/`32`/`34` + `37` | **Overlap** — authoring procedure vs the schema/linter/corpus owners | Keep as the *procedure* doc; it must reference 30/32/37 for rules, not restate them |
| R4 | `concept-drafts/SCORING-ARCHITECTURE.md` ("how module scores compose into the single consciousness index") vs `foundations/25` (CCI composite) | **Overlap on the aggregation formula** | One owner must hold the formula. Recommended: **25 owns the composite**, this doc owns the *per-module scoring skeleton* and cites 25 |
| R5 | `agentic-loop/02-…system-architecture-audit` vs `foundations/43` | Historical audit vs live contract | Move to `docs/audits/`; 43 stays the contract |
| R6 | `validation/BENCHMARK-ARCHITECTURE.md` vs `foundations/40` (measurement packs) | **Complementary, keep** — 40 owns explicit packs; validation owns the synthetic-persona kernel. Borderline on "reliability gates" | Cross-reference both ways; declare the boundary explicitly in each |
| R7 | `docs/PROGRESS.md` vs `DEVELOPMENT-PLAN.md` §9 | Duplicate status tracking | PROGRESS.md is stamped frozen ✅; move to `docs/archive/` for hygiene |
| R8 | `docs/ONBOARDING-REDESIGN-PLAN.md` vs `foundations/16` §11.1 + plan Phase 7 | Process doc duplicating spec | Keep; add a read-first pointer to 16 §11.1 (no restatement) |
| R9 | `foundations/26` (unified core) vs `43` (orchestration) | **Complementary** — 26 owns the module/engine contract, 43 owns the delegation layer; 43 explicitly extends 26 | Keep; verify 43 doesn't restate 26's invariants |

**Not redundant (verified, leave alone):** `foundations/23` (64-cell catalogue — unique lateral),
`foundations/24` vs `27` (selection formula vs strategy parameterisation), `foundations/31` vs
`42` (depth taxonomy vs levelling mechanism), `foundations/12` vs `40` (implicit instruments vs
explicit packs).

---

## 4. Gaps (architectural elements needing a home)

### G1 — The vocabulary/ontology grammar has no single owner (**create**)

Today the ratified grammar is scattered: the three axes in `06 §5.1`, the ladder table in
`02`, register classes in `20 §11`, the articulation ladder in `16 §10.5`, the depth/altitude
firewall across `31`/`42`, and the line registry in `03`. An agent must read six docs to learn
the alphabet, which is precisely how "redundant analogy and confusing architecture" enters.

**Recommendation: `foundations/44-system-ontology-and-vocabulary.md`** — the grammar doc:
the three axes + firewalls; the ratified ladder (one table, canonical); the term→owner table;
the **superseded-vocabulary blacklist** (density labels for stages, `White` as a stage,
"harvest as destination/goal", "stage = density"); and the external-source rule (HoloOS/KosmOS
govern vocabulary where they speak). Everything else *references* 44.

### G2 — The psychological resolution (MHC/Kegan) has no Mysterium home (**extend 02**)

The ratified ladder makes MHC 1–17 / Kegan 0–5+ the within-altitude resolution, but that layer
exists only in KosmOS. `02-eight-stages-overview.md` owns the ladder overview and should gain
the per-altitude MHC spans table — this is also what makes the game's item-difficulty bands
*derived* rather than invented.

### G3 — The design objective is not in the vision doc (**propagate**)

The ratified objective ("continuing developmental progression across all dimensions without
residual entropy or shadows") currently lives in `06 §5.1`/§7.4. It is a *vision-level* claim;
`00-vision.md` and `01-first-principles.md` should state it, with 06 owning its cosmology.

### G4 — External canon sources are invisible to agents (**extend AGENTS.md**)

HoloOS and KosmOS govern vocabulary (this audit's §D2 exists because of it) but appear nowhere
in `AGENTS.md` §2. An agent reading only the repo cannot know they exist. Add them as external
canon sources with the precedence rule.

---

## 5. Proposed optimal foundations set

Keep 43 docs; **create 1**; all consults go through the grammar doc.

| Cluster | Docs | Owner of record |
|---|---|---|
| Meta | 00–03, REQUIREMENTS, INDEX, 44 **(new)** | 44 owns vocabulary; 02 owns the ladder; INDEX owns navigation |
| Substrate 00–09 | unchanged | 06 owns cosmology/lens; 02 owns stages; 03 owns lines |
| Lesser cycle 10–14 | unchanged | 10 shadow, 11 modalities, 12 probes (+RV), 13 topography, 14 catalyst |
| Greater cycle 15–22 | 16/19/20/22 gain new sections; 15/17/18/21 unchanged | 22 owns world memory; 19 owns consequences + eligibility |
| Curriculum 23–34 | 23 (catalogue), 24 (scheduler), 25 (CCI — R4 winner), 27 (+§5.4), 28–34 | 25 owns the composite |
| Domain 35–41 | unchanged | 37/38/39/40/41 own their domains |
| Mechanism 42–43 | unchanged | 42 levelling, 43 orchestration (+§4.5b/§5.4) |

---

## 6. Execution queue (in order)

1. **Vocabulary sweep** — run `scripts/doc-stage-reindex.py` (dry run → review → apply);
   hand-review `23` and `25`; purge `architecture/10`'s combat parts. *(in progress)*
2. **Create `44-system-ontology-and-vocabulary.md`**; extend `02` (G2) and `AGENTS.md` (G4);
   propagate the objective to `00-vision`/`01-first-principles` (G3).
3. **Consolidate** R1–R9; move `agentic-loop/`, `brain-game-upgrade/`, `RED-TEAM-AUDIT-DEFINITIVE.md`,
   `PROGRESS.md` into their historical homes with stamps.
4. **Density sweep** (D2) across 42/38/32/28/21/REQUIREMENTS/INDEX.
5. **Re-run this audit** on the consolidated tree; then the code pass
   (weights-canon, `checkChoiceEligibility`, lifecycle hole, alignment seam, memory ledger).

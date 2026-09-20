# Mysterium — Architecture Transmutation Plan

> **Status:** Proposed (awaiting ratification of §11 decisions)
> **Authority:** the `architecture-discipline` meta-skill ingested 2026-09-20, **localized**: nothing
> in this plan may live outside the Mysterium repository (no `~/.hermes/`, no external `arch` CLI).
> **Inputs:** `docs/audits/DOC-SET-AUDIT-2026-09-20.md` (D1–D5 deviations, R1–R9 redundancies,
> G1–G4 gaps) + the canon ratified 2026-09-20 (`fb8bb02`, `23ec6ef`, `a4c3cfd`).
> **Supersedes:** nothing. This plan adds the governance layer the doc set has never had; it does not
> revise theory (foundations own theory) and does not re-sequence build phases (`DEVELOPMENT-PLAN.md`
> owns those).

---

## 1. What is wrong today (the case for transmutation)

Mysterium has **706 markdown files and no architecture record**. Concretely:

| Symptom | Evidence |
|---|---|
| Decisions live as prose inside theory docs | the ratified ladder, register classes, alignment mechanism, world memory, orchestration topology are all *sections* of `foundations/*` — there is no way to ask "what did we decide, and is it still true?" |
| Findings live forever as findings | 24 audit reports; each one is a snapshot with no closure. Nothing records that a finding was *fixed*, so the June red-team doc still shouts "CRITICAL" from the docs root. |
| No structure declaration | nothing declares which directories are live canon, which are historical, or who owns what concept — so an agent must read 6 docs to learn the alphabet (G1). |
| Doc tree has drifted from the code | `docs/architecture/` is 12 flat files; `src/core/` has 28 domains. The architecture doc set no longer mirrors the system it describes. |
| Redundancy is unenforced | `architecture/06` restates `foundations/19`+`23`; `architecture/01` declares itself "the binding architectural contract" against `AGENTS.md §4.2`. |
| Guards are discovered, never recorded | the ATB purge missed a file; the priority formula drifted 7↔8 criteria; GitLab pushes were silently skipped; the `Exploring → Harvesting` FSM bypass. Each was found by hand. None produced a guard. |

**Root cause (the skill's principle 1 in Mysterium terms):** the doc set is *prose only*. A living
system needs three record types — **decisions** (AD), **regression guards** (RG), and **logs**
(the mutation ledger) — plus a machine-readable structure file and a linter that enforces all of it.

---

## 2. Target architecture

### 2.1 Rungs (the four layers, firewalled)

```
RUNG 1  CANON        docs/foundations/ (00–44)   theory + design substrate. Owns "what is true".
RUNG 2  SYSTEM       docs/system/                the built system's contracts, as ORGANS. Owns "how it is built".
RUNG 3  RECORDS      docs/system/**/core/        AD + RG + worklog. Owns "what was decided / what broke".
RUNG 4  CONTENT      docs/concept-drafts/ (512)  the grounding corpus. Owns "what each module plays as".
        CANON-DOMAIN docs/{lines,stages,narrative,progression}/  per-domain detail (unchanged paths).
        HISTORICAL   docs/historical/            dated records. Never an authority. Never rewritten.
```

Rungs never restate each other: RUNG 2 **references** RUNG 1; RUNG 3 **records** changes to RUNG 2;
RUNG 4 is consumed as templates. Each rung gets one `AGENTS.md` (the canonical router) and one
`_org.yaml` (the machine-readable structure declaration).

### 2.2 The record types

| Type | Answers | Home | Never |
|---|---|---|---|
| **AD** — architectural decision | "we chose X over Y because…" (forward design, trade-offs) | `docs/system/core/decisions/` + each organ's `core/decisions/` | never a post-mortem |
| **RG** — regression guard | "this broke; here is the prevention" | `docs/system/core/regressions/` + organ cores | never archived, never deleted |
| **Log** — architectural worklog | "this changed on this date, by this action, for this reason" | `docs/system/logs/mutations.jsonl` (append-only) + `core/worklog/NNNN-*.md` | never hand-edited; logs are history, not authority |

**Two log kinds, never conflated** (this is a firewall — `foundations/44` will name it):

- **Architectural Log** — the development ledger above. Records *our* mutations.
- **Session Log** — the runtime evidence stream of `foundations/43 §4.4`. Records *the player's*
  encounters. Lives in the runtime data plane (`src/infra/persistence`), never in `docs/`.

### 2.3 Organ map (RUNG 2 — docs mirror the system, not the old flat list)

`docs/architecture/*` → `docs/system/sub-systems/<organ>/`, aligned to the real code domains:

| Organ | Owns (canon) | Code it describes | Today's docs |
|---|---|---|---|
| `kernel` | 26 (module contract), 42 (levelling) | `src/core/{engines,assessments,registries,domain,logic}` | `architecture/02`, `architecture/10` |
| `catalyst` | 10, 11, 14, 19, 23, 24, 27 | `src/core/{practice,healing,usecases}` | `architecture/03`, `architecture/05`, `architecture/06` |
| `curriculum` | 29–34, 37 | `src/core/{curriculum,packs,training}` | `architecture/04`, `architecture/11` |
| `profiling` | 12, 16, 25, 33, 40 | `src/core/domain`, `src/infra/profiles` | **none — GAP G5** |
| `orchestration` | 43 | `src/core/{orchestration,agent,fallback}`, `src/infra/llm` | `architecture/07` |
| `world` | 18, 22 | `src/core/pods`, `src/infra/pods` | **none — GAP G6** |
| `onboarding` | 21, 16 §11.1 | `src/core/{onboarding,adaptive}` | `ONBOARDING-REDESIGN-PLAN.md` |
| `persistence` | 43 §4.4, AGENTS §5.7 | `src/infra/{persistence,native,crypto}` | `architecture/08` |
| `presentation` | 33 §1–5, 20 §11 | `src/core/presentation`, `src/routes`, `src/lib` | `architecture/09` |
| `safety` | 43 §4.7 | `src/core/{safety,accessibility}` | **none — GAP G7** |
| `credentialing` | 41 | `src/core/credential` | **none — GAP G8** |
| `validation` | 40, gates G1–G21 | `src/core/validation`, `scripts/run-validation-benchmark.ts` | `docs/validation/` |

Twelve organs. Gaps G5–G8 are *new organs with no architecture doc* — the plan creates their
`AGENTS.md` (contract pointer + code map), not new theory.

### 2.4 Target tree

```
mysterium/
├── AGENTS.md                     # root canonical router (existing; gains the rung map + record index)
├── README.md                     # DEMOTED to a ≤40-line pointer at AGENTS.md (legacy duplicate)
├── _org.yaml                     # NEW — structure declaration: rungs, organs, record dirs, prefixes
├── docs/
│   ├── AGENTS.md                 # NEW — doc-tree router (replaces hand-kept INDEX.md)
│   ├── INDEX.md                  # GENERATED from _org.yaml (never hand-edited)
│   ├── foundations/              # RUNG 1 canon (43 → 44)
│   ├── system/                   # RUNG 2 + 3 (was docs/architecture/ + docs/validation/)
│   │   ├── AGENTS.md
│   │   ├── _org.yaml
│   │   ├── core/
│   │   │   ├── decisions/        # MY-AD-NNNN-*.md
│   │   │   ├── regressions/      # MY-RG-NNNN-*.md
│   │   │   └── worklog/          # LOGS: NNNN-<action>-<target>.md
│   │   ├── logs/mutations.jsonl  # append-only architectural ledger
│   │   └── sub-systems/<organ>/  # 12 organs, each: AGENTS.md + core/{decisions,regressions} (+ refs)
│   ├── concept-drafts/           # RUNG 4 corpus (paths unchanged — 512 files must not churn)
│   ├── {lines,stages,narrative,progression}/   # canon-domain (paths unchanged)
│   ├── audits/                   # historical (unchanged, dated, index-only)
│   ├── historical/               # NEW home for dormant dirs (archive/, research/, superpowers/,
│   │                             #   agentic-loop/, brain-game-upgrade/, PROGRESS.md, red-team doc)
│   ├── CHANGELOG.md              # historical log
│   ├── DEVELOPMENT-PLAN.md       # owns build-phase order + gates (unchanged authority)
│   └── REQUIREMENTS.md           # product requirements (unchanged)
└── scripts/arch.py               # NEW — the project-local governance CLI (validate/new/update/log/emit)
```

**Churn budget:** `docs/architecture/*.md` (12 files) move; ~8 dormant directories move; everything
else keeps its path. The 512 concept-drafts, `foundations/`, `lines/`, `stages/` are **not renamed**.

---

## 3. The governance CLI (`scripts/arch.py`, project-local)

One flat Python script (matches the repo's scripts convention), no external dependency, no `~/.hermes`:

```bash
python3 scripts/arch.py recon <kw>              # required first: prove existing coverage was reviewed
python3 scripts/arch.py new --type ad|rg --title T --desc D --organ <organ> --recon <id>
python3 scripts/arch.py update <ID> --field Status=Superseded --reason R --recon <id>
python3 scripts/arch.py supersede <ID> --by <NEW> --reason R
python3 scripts/arch.py log --action <create|update|merge|move|refactor> --target <t> --reason R
python3 scripts/arch.py route <path>            # resolve any path to its owning rung/organ
python3 scripts/arch.py validate                # the DG gates below; exits non-zero on violation
python3 scripts/arch.py emit                    # regenerate INDEX.md + AGENTS.md auto-zones
```

**Write discipline:** AD/RG files are created/edited **only** through `new`/`update`/`supersede`, which
append to `mutations.jsonl` and write the directory worklog. `validate` fails closed on a hand-written
record (missing ledger receipt = DG9 violation).

**Record schema** (mirrors the skill's AD-067, kept minimal for a single-project repo):

```yaml
---
ID: MY-AD-0012
Title: "The ratified 8-stage ladder"
Status: Active          # Active|Accepted|Proposed|Draft|Superseded|Resolved|Open
Date: 2026-09-20
Organ: kernel           # routing/attribution; numbering stays global
Supersedes: []
Description: "<=1024 chars, aggregated up the hierarchy by emit>"
---
## Context / ## Decision / ## Consequences / ## Related      # AD
## Symptom / ## Root Cause / ## Incident N / ## Detection / ## Prevention  # RG (+ Severity:)
```

**Numbering:** `MY-AD-NNNN` / `MY-RG-NNNN`, global and permanent, never reused; organ attribution via
the `Organ:` field (the skill's sanctioned sub-system pattern: inherit the parent prefix, continue the
parent sequence). This keeps one sequence and one ledger for a single-repo system.

### 3.1 The DG gates (doc-governance, distinct from the kernel gates G1–G21)

| Gate | Asserts |
|---|---|
| DG1 | every AD/RG has conforming frontmatter + filename `MY-(AD\|RG)-NNNN-*.md` |
| DG2 | `Status` is in the enum exactly (no invented variants) |
| DG3 | numbering integrity: no duplicates, no reuse, no gaps |
| DG4 | authority uniqueness: no doc may declare itself binding outside the ratified map (kills D3) |
| DG5 | vocabulary blacklist: `White` as a stage, stage=density labels, "harvest as destination" (kills D1/D2) |
| DG6 | historical quarantine: live docs never cite `docs/historical/**` as authority; historical never appears in `INDEX.md` as live |
| DG7 | non-redundancy: one owner per concept, per the OWNERS table in `foundations/44` |
| DG8 | cross-reference resolution: every `Related:` ID and every doc link resolves |
| DG9 | ledger integrity: one well-formed `mutations.jsonl` receipt per record mutation |
| DG10 | canon↔code contract: a record citing a code artifact cites a path that exists |

`DG*` runs as **step 2b of the mandatory iteration protocol** (`AGENTS.md §7.5`): workspace-lint →
**arch validate** → build + tests → fix → commit → push both remotes.

---

## 4. Disposition of every audit finding (nothing is dropped)

| Finding | Disposition in the new architecture |
|---|---|
| **D1** stale stage vocabulary (~150 refs) | **P1** — run `scripts/doc-stage-reindex.py` dry → hand-review `23`/`25` → apply; DG5 prevents recurrence |
| **D2** density labels as developmental states | **P1** — sweep 42/38/32/28/21/REQUIREMENTS/INDEX; DG5 owns the blacklist; the class is recorded as **RG-0001** |
| **D3** competing authority claims | **P3** — `architecture/01` → `docs/system/AGENTS.md` (router, no authority claim); red-team doc → `docs/historical/audits/` + stamp; DG4 enforces; **RG-0002** |
| **D4** ATB combat residue in `architecture/10` | **P1** — purge Part VIII + Part XIV; the class is **RG-0003** (forbidden-token check in `validate`) |
| **D5** dormant dirs read as canon | **P6** — `agentic-loop/`, `brain-game-upgrade/`, `superpowers/`, `research/`, `docs/historical/archive/`, `PROGRESS.md`, red-team doc → `docs/historical/` with stamps; DG6 enforces; **RG-0004** |
| **R1** `architecture/06` restates 19+23 | **P3** — shrinks to an implementation pointer inside `catalyst` (code paths + links) |
| **R2** `architecture/01` binding claim | **P3** — merges into `docs/system/AGENTS.md` (DG4) |
| **R3** `architecture/11` vs 30/31/32/34/37 | **P3** — stays as the authoring *procedure* under `curriculum`, references the rule owners |
| **R4** `SCORING-ARCHITECTURE.md` vs `foundations/25` | **P3** — 25 keeps the composite formula; the draft keeps the per-module scoring skeleton and cites 25 |
| **R5** `agentic-loop` audit vs `foundations/43` | **P6** — audit → `docs/historical/audits/`; 43 remains the contract |
| **R6** `docs/system/sub-systems/validation/benchmark-architecture.md` vs 40 | **P3** — moves to the `validation` organ; both docs declare the boundary explicitly |
| **R7** `PROGRESS.md` vs plan §9 | **P6** — → `docs/historical/` (it is a frozen log, not a plan) |
| **R8** onboarding plan vs 16 §11.1 | **P3** — moves under the `onboarding` organ with a read-first pointer to 16 §11.1 |
| **R9** `foundations/26` vs `43` | **keep** — verify 43 doesn't restate 26's invariants (DG7 check) |
| **G1** no vocabulary owner | **P2** — create `foundations/44-system-ontology-and-vocabulary.md` (the grammar doc: three axes + firewalls, the ratified ladder, the term→owner table, the **superseded-vocabulary blacklist**, external-source precedence) |
| **G2** MHC/Kegan has no home | **P2** — extend `foundations/02` with the per-altitude MHC spans |
| **G3** objective only in `06` | **P2** — propagate to `docs/00-vision.md` + `docs/01-first-principles.md` |
| **G4** HoloOS/KosmOS invisible to agents | **P2** — extend `AGENTS.md §2` as external canon with the precedence rule (→ also **AD-0020**) |
| **G5–G8** organs without docs | **P3** — `profiling`, `world`, `safety`, `credentialing` organ `AGENTS.md` files (contract pointer + code map, no new theory) |

---

## 5. Seed ledger (derived from what is already ratified — transcribed, not invented)

This is the payoff: **the decisions already exist as prose.** P5 lifts each into an AD and replaces the
prose with a reference. Indicative seed (final numbering assigned by `arch.py new`):

**ADs** — assessment-module execution replaces ATB (26) · every verb is an implicit assessment, never
diagnostic to the player (§5.4) · catalyst→experience→integration (14) · two axes + 4-quadrant shadow,
no 1:1 drive↔shadow map (§5.2) · 7 modalities are catalyst axes (11) · the Veil withholds scores (20) ·
infinite checkpoint model (§5.7) · the holon is never outgrown + theta-decay (§5.6, 25) · no code without
a concept-draft (§4.3) · evidence-only grading + competence/identity firewall (42) · **three axes
firewalled, ray/density is a lens** (06) · **the ratified ladder, White retired, L9/D5+ out of scope**
(06) · **the non-harvest teleology** (06 §7.4) · **register classes: full metric register at any stage**
(20 §11, with the recorded HoloOS divergence) · **one articulation ladder, two registers, auditor access
= consented traversal** (16 §10.5) · **objective alignment over the catalyst-choice seam** (27 §5.4) ·
**two-fold consequence memory + per-holon owner worker** (22 §7.4–7.5) · **single foreground
orchestrator + background workers, ratification-only commits** (43) · **integrated human intervention**
(43 §4.7) · external canon precedence · the 8-criterion priority canon is the single selection
vocabulary · RV1–RV7 rubric validation (12 §5.4) · minor-guardianship rules · **documentation
governance = AD/RG/Logs** (this plan).

**RGs** — stage/density vocabulary drift · competing authority claims · incomplete subsystem purge ·
dormant dirs as canon · canon↔code weight drift (7 vs 8 criteria) · orphan policy seam
(`alignment_adjustment` never applied) · FSM bypass (`Exploring → Harvesting`) · duplicated lateral ·
two owners for one formula · instrument shipped without RV evidence · vacuous/self-satisfying gate
(each hard gate must fail on an injected regression) · **dual-remote push drift**.

Every RG's `Prevention` must be an executable guard: a `validate` check, a kernel gate, or a test.

---

## 6. Phases (each gated; nothing lands ungated)

| Phase | Work | Gate |
|---|---|---|
| **P0** | Freeze: no new architecture prose until the structure lands. Write `_org.yaml` + the organ map. Ratify §11 decisions. | `_org.yaml` parses; organs resolve to real `src/` paths |
| **P1** | Finish the vocabulary sweep (D1/D2/D4): reindex script dry → review → apply; hand-review `23`/`25`; purge `architecture/10`'s combat parts. | dry-run report reviewed by hand; DG5 green |
| **P2** | Canon completion: create `foundations/44`; extend `02` (MHC), `00-vision`/`01-first-principles` (objective), `AGENTS.md §2` (external canon). | lint 0/0/0 · build ✔ · tests ✔ · every term in 44 has exactly one owner |
| **P3** | Structural transmutation: `docs/architecture/` → `docs/system/sub-systems/<organ>/`; `docs/validation/` → `validation` organ; create the 4 missing organ docs; execute R1–R9. | `arch.py route` resolves every organ; DG4/DG7 green; 0 broken links |
| **P4** | Tooling: `scripts/arch.py` + DG1–DG10; wire into `AGENTS.md §7.5` as step 2b; `emit` regenerates `INDEX.md` + routers. | `arch.py validate` exits 0; `validate` fails closed on an injected violation (RG "vacuous guard" test) |
| **P5** | Seed ledger: create ADs + RGs from §5; replace restated prose in `foundations/*` with `Related: MY-AD-NNNN` references. | DG8/DG9 green; each AD's `Context` cites its source section |
| **P6** | Historical quarantine + root hygiene: dormant dirs → `docs/historical/`; `README.md` → pointer; `PROGRESS.md`/red-team doc stamped and moved. | DG6 green; `INDEX.md` lists zero historical entries as live |
| **P7** | Verification: re-run the documentation audit against the new structure; full iteration protocol; dual-remote push. | lint 0/0/0 · build ✔ · 1120+ tests · 0 DG violations · pushed to `origin` + `gitlab` |

Phases P1–P3 are sequential (P3 depends on P1's vocabulary being clean). P4 may run in parallel with P2.

---

## 7. What is explicitly negated (redundant or irrelevant to development)

Removed from the live architecture (not deleted — stamped and moved):

1. `README.md` as a second router (AGENTS.md is canonical; README becomes a pointer).
2. `docs/INDEX.md` as a hand-maintained file (generated).
3. `docs/historical/PROGRESS.md` (frozen duplicate of the plan's status section).
4. `docs/historical/audits/RED-TEAM-AUDIT-DEFINITIVE.md` at the docs root (June snapshot read as live authority).
5. `docs/historical/agentic-loop/` (superseded by `foundations/43`).
6. `docs/historical/brain-game-upgrade/` (absorbed; unstamped).
7. `docs/historical/superpowers/plans/*` (historical).
8. `docs/historical/research/` (pre-canon exploration).
9. `docs/architecture/06`'s restated polarity theory + `architecture/10`'s combat parts.
10. `docs/audits/*` as *authority* (they remain the historical evidence behind each RG).

**Not negated** (verified complementary in the audit): `foundations/23`, 24 vs 27, 31 vs 42, 12 vs 40,
26 vs 43, and the entire concept-draft corpus.

---

## 8. Non-goals

- No theory changes. Foundations keep ownership of theory; this plan only relocates, references, and
  records. Any content change here is limited to the G1–G4 extends already in the audit.
- No re-sequencing of build phases (`DEVELOPMENT-PLAN.md` keeps that authority).
- No renaming of `docs/foundations/`, `docs/concept-drafts/`, `docs/lines/`, `docs/stages/`,
  `docs/narrative/`, `docs/progression/` — path churn is a cost with no architectural return.
- No external tooling: `scripts/arch.py` is self-contained, Python stdlib only.

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| Mass rename breaks links | renames limited to 12 architecture files + dormant dirs; DG8 checks every link after P3 |
| AD seeding becomes a theory rewrite | seeds are **transcriptions** with a `Source:` line pointing at the owning section; `arch.py new` refuses an AD with no source |
| Governance overhead slows development | everything is one CLI call; `emit` generates indexes; the only invariant is "records through the CLI" |
| The ledger duplicates `docs/CHANGELOG.md` | CHANGELOG = user-facing release history; `mutations.jsonl` = architectural mutations. Distinct subjects; declared in `foundations/44` |
| Two authorities reappear later (D3 class) | DG4 + RG-0002 (the guard is a check, not a convention) |

---

## 10. Success criteria

1. `python3 scripts/arch.py validate` exits 0, and **fails on an injected violation** (all 10 gates).
2. Every ratified decision from 2026-09-20 exists as an AD with a resolvable source.
3. Every audit finding (D1–D5, R1–R9, G1–G4) is either fixed or recorded with a guard — **zero open findings**.
4. `INDEX.md` is generated; reading `docs/AGENTS.md` alone yields the whole rung map + record index.
5. `docs/historical/**` contains everything dated, and nothing in it is citable as authority.
6. Full iteration protocol green: lint 0/0/0, build ✔, tests ✔, both remotes pushed.

---

## 11. Decisions — RATIFIED 2026-09-20

| # | Decision | Ruling |
|---|---|---|
| **Q1** | Record numbering/attribution | **Global sequence + `Organ:` field** — one `MY-AD-/MY-RG-` sequence project-wide; organ attribution is a frontmatter field doing the routing. One ledger, one sequence. |
| **Q2** | Scope of the physical move | **Surgical** — only `docs/architecture/` → `docs/system/` (12 files) and dormant dirs → `docs/historical/`. `foundations/`, `concept-drafts/` (512), `lines/`, `stages/`, `narrative/`, `progression/` keep their paths. |
| **Q3** | Project-local tooling | **Build `scripts/arch.py`** — lifecycle verbs + DG1–DG10, stdlib only, wired into `AGENTS.md §7.5` as step 2b. |
| **Q4** | Record homes | **Holoarchic** — `docs/system/core/{decisions,regressions}/` (system-wide) + each organ's `core/{decisions,regressions}/` (organ-scoped). System-wide verdicts never live in an organ core. |

**P0 may begin.** Structural plan = `docs/system/`; record dirs as above; `docs/historical/` created in P6.

---

## 12. Incident 1 — the non-idempotent migration (2026-09-20, P1)

**What happened.** `scripts/doc-stage-reindex.py` was run with `--apply` **twice in one command**
(once to print the head of the report, once for the HELD section). The first pass was correct; the
second pass took the *correctly migrated* stage-8 name `Turquoise` and mapped it to `Teal`
(stage 7's new name is the same token family). 194 files were corrupted; the stage-8 concept-draft
modules read "Stage: Teal (super-integral / non-dual / harvest)".

**Recovery.** `git checkout -- docs/` (the hand-edits were re-applied deterministically), then a
single `--apply`.

**Root cause (the part that becomes a guard).** The migration is **one-way**, but nothing enforced
it. `--apply` looked like an ordinary idempotent command, so re-running it seemed safe — and because
the *output* of the first pass was piped into `sed`, the second invocation was live in the same
pipeline. This is the failure class AD/RG exist for: a transformation whose correctness depends on
how many times it has run, with no receipt.

**Guard (implemented).** `--apply` writes `docs/.doc-stage-reindex.applied` (base rev, counts,
timestamp). A re-run **refuses** with exit 2 unless `--force`. The docstring now states the one-way
nature in its first paragraph. Recorded as **RG-0001** in the seed ledger (§5).

---

## 12b. Execution outcome (P0–P6 complete, 2026-09-20)

| Phase | Outcome | Evidence |
|---|---|---|
| **P0** structure | `_org.yaml` declares 4 rungs, 13 organs, record homes, DG1–DG10; 94 declared paths resolve | `python3 scripts/arch.py route <path>` |
| **P1** vocabulary | 193 files / 543 lines swept; 39 stale lines remain, all code identifiers or `CODE-PASS PENDING` annotations; `23` corrected post-review via `--only` | sweep report; `grep -rn "L8 Teal\|Teal→Teal" docs/` empty |
| **P2** canon | `foundations/44` (grammar: 5 axes, ratified ladder, owners table, blacklist) + `foundations/AGENTS.md` canon router + `02 §2.3` (MHC/Kegan) + Principle 0 in `01` + objective in `00-vision` + HoloOS/KosmOS in `AGENTS.md §2.0` | DG5/DG7 read `44` |
| **P3** system | `docs/architecture/` → `docs/system/sub-systems/<organ>/` (13 organ pools, each with `core/{decisions,regressions}`); `docs/system/AGENTS.md` absorbs the overview (authority claim dropped); `docs/validation/` → the `validation` organ; **D4 purged** (ATB residue); **R1 collapsed** (polarity engine → pointer); links rewritten by `scripts/doc-path-reindex.py` | `docs/architecture/` and `docs/validation/` no longer exist |
| **P4** tooling | `scripts/arch.py`: `route · recon · new · update · seed · log · emit · validate`; 10 gates; `emit` generates `INDEX.md` + the 13 organ routers (auto-zone + preserved manual zone) | `arch.py validate` → 0 violations |
| **P5** ledger | 23 records seeded (13 AD + 10 RG) with ledger receipts, from the transcription map `docs/system/core/seed-2026-09-20.yaml` | `docs/system/logs/mutations.jsonl` |
| **P6** quarantine | `agentic-loop/`, `brain-game-upgrade/`, `superpowers/`, `research/`, `archive/`, the red-team doc and `PROGRESS.md` → `docs/historical/` (+ its own router); `README.md` demoted to a pointer; `INDEX.md` generated | `arch.py route docs/historical/...` → `live: False` |

**Gate proof (RG-0010).** Three injections were applied and detected, then reverted: a hand-written
record with no ledger receipt (DG1/DG2/DG9), superseded vocabulary in live canon (DG5), and an
authority claim outside the map (DG4). A gate that cannot fail is decoration.

**Still open (declared in `_org.yaml → pending`):**
1. **CODE-PASS** — rename the 8 stage identifiers (`src/core/assessments/*/white.ts`, the `Stage` union,
   threshold maps, fixtures) atomically with their tests, and update the ~39 held doc lines.
2. **DG-ENFORCE** — wire `arch.py validate` into the CI/iteration path (it is documented in
   `AGENTS.md §7.5` step 2b and must be run by hand until then).

---

## 13. P1 outcome (vocabulary sweep, 2026-09-20)

| Metric | Value |
|---|---|
| Files swept | **193** (598 scanned) |
| Lines changed | **543** |
| Remaining stale lines in active canon | **39**, in 19 files — **all** code identifiers, paths, or `CODE-PASS PENDING` annotations |
| Held spans (not auto-renamed) | 48 — 30 code-bearing, 18 path fragments |
| Concept-draft corpus | fully re-indexed: `07 — Teal (Integral / Vision-Logic)` ↔ `08 — Turquoise (Super-Integral)` |
| Idempotence | **one-way**; receipt-guarded (Incident 1) |

**Deviation D6 — FIXED (ruled 2026-09-20: the ladder wins).** The 7 stage-8 `module-spec.md` files
declared `Energy Ray: Violet` (`emotional`, `interpersonal`, `intrapersonal`, `moral`, `somatic`,
`spiritual`, `willpower`) — stale by the same rule that retired `White`, since `06 §5.1` gives
**L8 Turquoise = Indigo (6b)** and attaches the **Violet ray to the closure event**. `06 §5.4`'s
8-stage↔7-ray bridge is retained but explicitly demoted to **cosmetic sub-octave decoration**
(banner added at the bridge), and where the two disagree **§5.1 wins**. All 8 stage-7 specs now read
`Indigo (6a)` and all 7 stage-8 specs `Indigo (6b)`, so the 6a/6b split actually distinguishes the
two stages. `kosmocentric` vocabulary in `moral/08` (L9 territory, out of scope) was corrected in
the same pass.

**Also found (code-pass scope).** The stage tokens are live code identifiers — `src/core/assessments/*/white.ts`
(8 modules), `type Stage = '…|Turquoise'|'White'`, `altitudeMin: 'White'` threshold maps,
`TaskRenderers` keys, glossary data — across **67 files in `src/` + `tests/`**. The doc pass therefore
**held** those spans (58) rather than renaming them alone; each is annotated `CODE-PASS PENDING` in
place. The code pass is a new, sized work item: it renames the 8 modules + the `Stage` union + the
test fixtures + `src/core/curriculum/data/*` keys **atomically**, and it owns the ~39 remaining
stale doc lines. Until it lands, docs read Teal/Turquoise (ratified) and code reads
Turquoise/White (pre-re-index) — a **tracked, annotated divergence**, not a silent one.

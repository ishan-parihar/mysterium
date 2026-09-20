# Knowledge-Base Utilities Audit — the ingest / retrieve / author layer

> **Date:** 2026-09-20 · **Scope:** *every* house utility that manages, ingests, retrieves, or
> validates the documentation knowledge-base, assessed against one target specification:
>
> > *any agent needing context for an architectural component — or needing to add the documentation
> > for it — must be able to do so through the CLI infra, so that the whole doc set becomes a
> > relational, referential, hierarchical database that scales infinitely, where keyword search
> > returns the docs and references required for refactoring, auditing, alignment, and updating.*
>
> **Method:** every claim executed against the working tree at commit `79309e5`. Inventories are
> exhaustive (all of `scripts/`, `skills/`, `src/core/data/`, CI, `package.json`, `install.sh`), not
> sampled. Related: `RED-TEAM-2026-09-20.md` (the doc-governance layer).
> **Status:** evidence for the RG ledger. Not an authority.

---

## 0. Verdict

**The hierarchy exists. The graph does not.**

Mysterium has a real, enforced *hierarchy* — rung → organ → record → code — and as of `79309e5` it has
a working *retrieval* verb for a single path (`route`, `context`). What it does not have is the thing
the specification above actually asks for: a **queryable relational model** over the documentation.

Six capabilities were specified. This is the honest scoreboard:

| # | Capability | State | Evidence |
|---|---|---|---|
| **C1** | Given a component, return its governing docs | ✅ built (`79309e5`) | `arch.py context src/core/assessments` |
| **C2** | Return *the component's own* architecture docs | ❌ **11 docs unreachable** | UT-1 |
| **C3** | Keyword search over the KB | ❌ **absent entirely** | UT-2 |
| **C4** | Relational / referential model with backlinks | ❌ **3 unjoined islands** | UT-3 |
| **C5** | Add documentation via the CLI | ❌ **no such verb** | UT-4 |
| **C6** | Scales without hand-maintenance | ⚠️ **partly** | UT-11 |

C1 alone was closed yesterday. C2–C5 are the specification, and none of them is implemented.

---

## 1. The complete house inventory

### 1.1 The governance CLI — `scripts/arch.py` (48 KB, stdlib + PyYAML)

| Verb | Does | Wired |
|---|---|---|
| `route <path>` | doc **or code** path → rung / organ / contract docs | ✅ |
| `context <path>` | start-of-work bundle (contract docs, invariants, records) | ✅ |
| `recon <keyword>` | coverage report over record titles/bodies before creating one | ✅ |
| `new` / `update` / `seed` | author AD/RG records (only write path; appends a ledger receipt) | ✅ |
| `log` | append a structural mutation receipt | ✅ |
| `emit` | regenerate `INDEX.md` + 13 organ routers | ✅ |
| `validate` | DG1–DG12 doc-governance gates | ✅ |

**No `search`, no `related`, no `graph`, no `doc`/authoring verb for documents, no `--json` output.**

### 1.2 Structure & vocabulary declarations

| Asset | Role | Maintenance |
|---|---|---|
| `_org.yaml` | rungs, 13 organs, `contract_docs`, `code:`, `generated`, gates, `pending` | **hand-edited** |
| `docs/foundations/44` `# owners-table` | 52 term → doc owners (DG7) | **hand-edited** |
| `docs/foundations/44` `# vocabulary-blacklist` | 6 terms × regex patterns (DG5) | **hand-edited** |
| `docs/INDEX.md` | generated rung/organ/record index | generated (DG11) |
| `docs/system/sub-systems/*/AGENTS.md` | 13 organ routers, auto-zone + manual-zone | generated (DG11) |
| record frontmatter | `ID, Status, Date, Organ, Severity, Source, Description, Related[]` | via CLI only (DG9) |

### 1.3 The doc→code ingest layer

| Asset | Direction | State |
|---|---|---|
| `scripts/build-concept-index.ts` | corpus md → `src/core/data/concept-drafts.json` | **orphan**; constants fixed `79309e5`, no longer silent; output still pre-re-index |
| `src/core/data/stage-holons.json` (56 holons), `red-layer-holons.json` (36) | corpus → runtime | hand/unknown provenance, consumed by `gates.ts` + `cli-game.ts` |
| `src/core/data/{glossary,shadowKeywords,calibrationPrompts,RedPESTLE,PolarityOntology,HolonRegistry}.ts` | corpus → runtime | **hand-written** (types + helpers), not generated |
| *(foundations docs → anything)* | canon → code | **absent** — nothing ingests `docs/foundations/` |

### 1.4 Linters and gates (four separate systems)

| System | Covers | Wired |
|---|---|---|
| `arch.py validate` DG1–DG12 | docs, records, generated surfaces, canon links | ✅ CI |
| `skills/workspace-lint/scripts/workspace_lint.py` | file placement / root hygiene | ✅ CI |
| `scripts/check-invariants.ts` | registry/enum/engine structural integrity | ✅ `build`, CI, `install.sh` |
| `skills/curriculum-linter` + `lintRegistry` | curriculum holon data | via curriculum engine |
| `src/core/validation/gates.ts` (G1–G21) | runtime behaviour, 10 personas, benchmark | ✅ `npm run bench:validation` |

### 1.5 Everything else in `scripts/` — 11 of 15 are orphans

Not referenced by `package.json`, CI, `install.sh`, or `AGENTS.md`:

| Script | What it is |
|---|---|
| `make_module_specs.py` · `rebuild_module_specs.py` · `strip_game_files.py` · `fix_subsection_numbers.py` | one-shot corpus-shaping scripts for **superseded** templates |
| `doc-stage-reindex.py` · `doc-path-reindex.py` | one-way migrations (receipt-guarded) whose mapping exists nowhere else |
| `author-k12-branches.py` | one-shot curriculum authoring (K-12 branches) |
| `regression-sweep.sh` | UX-R3 CLI smoke matrix |
| `tdg-probe.ts` | external TDG-Rust integration probe; **not referenced by `install.sh`** |
| `CliConsole.ts` · `CurriculumCommands.ts` · `scripts/cli/delegateArgs.ts` | CLI modules imported by `cli-game.ts` (not orphans, just unflagged) |

**Wired:** `arch.py`, `check-invariants.ts`, `cli-game.ts`, `run-validation-benchmark.ts`.

### 1.6 Skills — house and vendored share one namespace

| Skill | Files tracked | Provenance |
|---|---|---|
| `workspace-lint` | 5 | **house** (governance) |
| `curriculum-linter` | 1 | **house** (governance) |
| `design-taste-frontend` | 1 | third-party |
| `ui-styling` | 98 (fonts, LICENSE.txt, references) | **vendored third-party** |
| `ui-ux-pro-max` | 35 (CSVs, scripts) | **vendored third-party** |

### 1.7 Runtime surfaces touching the KB

`src/routes/knowledge`, `/glossary`, `/codex`, `/curriculum`, `/diagnostic` — all read
**hand-written TS data** (`glossary.ts`, holon JSONs), never the markdown doc set. The player-facing
KB and the developer KB are entirely separate corpora.

---

## 2. Findings

**S1** = the specified capability cannot work · **S2** = a declared mechanism is missing or false ·
**S3** = will bite on the next routine change.

---

### UT-1 · S1 — 11 organ architecture docs are unreachable from every index, router, and verb

The organ pools contain 11 architecture documents. **Eight of them have zero inbound links from
anywhere in the repository**, and none is reachable through the CLI:

| Doc | Inbound links (outside its own organ) |
|---|---|
| `kernel/core-engine.md` | **0** |
| `kernel/stage-assessment-architecture.md` | 4 (CHANGELOG, REQUIREMENTS) |
| `catalyst/encounter-system.md` | **0** |
| `catalyst/polarity-engine.md` | **0** |
| `catalyst/shadow-work.md` | **0** |
| `curriculum/curriculum-authoring.md` | 1 (REQUIREMENTS) |
| `curriculum/curriculum-system.md` | **0** |
| `orchestration/llm-integration.md` | **0** |
| `persistence/persistence.md` | **0** |
| `presentation/rendering-layer.md` | **0** |
| `validation/benchmark-architecture.md` | 4 (foundations 39, 40) |

Why: `docs/INDEX.md` lists only each organ's `AGENTS.md`; the generated organ router lists only
`contract_docs` (which are **foundations** docs); `context <code path>` likewise returns only
`contract_docs`. The organ's *own* documents are invisible by construction:

```
$ python3 scripts/arch.py context src/core/engines
contract docs (canon):
  - docs/foundations/26-unified-core-architecture.md
  - docs/foundations/42-developmental-levelling-mechanism.md
  # ← kernel/core-engine.md and kernel/stage-assessment-architecture.md are NOT listed
```

**This is the specification's core failure.** An agent asking for the architecture of a component
gets the *theory that informs it* and not *its own architecture doc* — and for eight of those docs,
nothing in the repository points at them at all. They were written, moved into the right organ by the
transmutation, and then connected to nothing.

---

### UT-2 · S1 — there is no keyword search over the knowledge-base

`arch.py` has nine verbs; none is `search`. Nothing in `scripts/`, `skills/`, or `src/` indexes
documents. The complete toolchain available to an agent looking for "the doc that covers alignment
adjustment" is `grep` over 746 markdown files.

The ingredients for a real answer already exist and are simply not joined: 642 governed documents,
`DG12`-validated wiki-links, an organ map, a 52-entry owner table, and 27 records with `Related[]`.
No artifact consumes more than one of them at a time.

**Consequence:** the specified workflow — *keyword → docs + references → refactor/audit/align* — has
no implementation. Retrieval is path-only, which means it only works when you already know the answer.

---

### UT-3 · S1 — the "relational referential database" is three hand-maintained islands that never join

Every edge in the system currently lives in one of three files, and **no tool reads two of them
together**:

| Edge | Lives in | Read by |
|---|---|---|
| organ → `contract_docs` (foundations docs) | `_org.yaml` | `route`, `context`, `emit` |
| organ → `code:` paths | `_org.yaml` | `route`, `context`, `emit` |
| term → owning doc (52 owners) | `44` `# owners-table` | DG7 |
| record → `Organ`, record → `Related[]` | record frontmatter | DG1, DG8, `emit` |
| **doc → doc** (wiki-links) | markdown body | **DG12 only — validated, never extracted** |

Consequences, each verifiable in one command:

- **No backlinks.** *Nothing* can answer "what references `foundations/19`?". DG12 proves a link
  resolves and discards the edge.
- **No join.** `organ → contract_docs` and `term → owner` are separate islands; there is no query
  that walks from a *term* to the *organ* whose code implements it.
- **No typed relations.** Edges are "a link exists". There is no `implements`, `supersedes`,
  `depends-on`, `governs` — so the graph cannot be reasoned with, only displayed.
- **No index artifact.** Nothing is materialised: no edge file, no graph JSON, no reverse map. Every
  consumer re-derives what little it needs, or does without.

**Verdict:** this is a hierarchy with hyperlinks, not a relational model. Calling it a database would
be aspirational; it is 3 declarations + 746 markdown files + `grep`.

---

### UT-4 · S1 — adding documentation is not a CLI operation

The CLI authors **records** (`MY-AD`/`MY-RG`) and nothing else. To add a document an agent must:

1. hand-create the `.md` in the right organ directory,
2. hand-edit `_org.yaml` to add it to `contract_docs` (else it is invisible per UT-1),
3. hand-edit `44`'s owner table if it is a numbered foundation (else **DG7 fails**),
4. remember to run `emit` (else **DG11 fails**).

Four hand-steps in three files, two of which are enforced by gates — so the failure mode of "add
documentation" is *a red gate with a message about the wrong file*.

There is also **no template and no ledger receipt**: a doc addition is an architectural change that
leaves no trace in `mutations.jsonl`. The protocol in `AGENTS.md` §7.5 says "records are written only
through the tool"; there is no equivalent sentence for documents because there is no tool.

**This is exactly the specified requirement ("it must be able to add it using the cli infra"), and it
is unmet.**

---

### UT-5 · S2 — `_org.yaml` claims validation it does not perform

`_org.yaml` line 133: *"`code` paths MUST resolve on disk (`arch.py validate` enforces)."*

**No gate does.** Verified in-process with a deliberately bogus path
(`src/core/DOES-NOT-EXIST` appended to the `kernel` organ):

```
violations with a bogus organ code path: 2
  ✗ DG11: docs/INDEX.md is stale — run `python3 scripts/arch.py emit`
  ✗ DG11: docs/system/sub-systems/kernel/AGENTS.md auto-zone is stale — run `python3 scripts/arch.py emit`
```

Neither message mentions the code path. Following the advice makes it **worse**: `emit` bakes the
nonexistent path into the generated router, after which `validate` is green with a fabricated
`code:` entry in a canonical document.

Same defect class as RT-5a (a documented enforcement that does not exist), and the more dangerous
variant: here the only detector *mislabels the problem and recommends the action that hides it*.

---

### UT-6 · S2 — 6 of 13 organs contain nothing but a generated router

| Organ | Architecture docs |
|---|---|
| kernel 2 · catalyst 3 · curriculum 2 · orchestration 1 · persistence 1 · presentation 1 · validation 1 | present |
| **profiling · world · onboarding · safety · credentialing · platform** | **0** |

These are the organs flagged as `G5`–`G8` gaps at transmutation time. The **pools** were created;
the **documents** never were. Combined with UT-4, the six most under-documented subsystems are
precisely the ones an agent cannot add documentation for through the toolchain.

---

### UT-7 · S2 — 11 of 15 scripts are orphans; an agent cannot tell which are safe to run

Unreferenced by `package.json`, CI, `install.sh`, or `AGENTS.md` §2:
`author-k12-branches.py`, `build-concept-index.ts`, `doc-path-reindex.py`, `doc-stage-reindex.py`,
`fix_subsection_numbers.py`, `make_module_specs.py`, `rebuild_module_specs.py`, `regression-sweep.sh`,
`strip_game_files.py`, `tdg-probe.ts` (+ the three CLI modules, which are imported).

Four of them rewrite the corpus in place (`make_module_specs`, `rebuild_module_specs`,
`strip_game_files`, `fix_subsection_numbers`) for **superseded templates** — one-shot tools that would
now be destructive if run. Two encode one-way migrations. Two are probes. Nothing distinguishes
"historical one-shot" from "current utility".

`scripts/run-validation-benchmark.ts` — a **wired** tool (`npm run bench:validation`) — still directs
its docstring output at `docs/validation/last-full-run.json`, a directory removed in P3.

---

### UT-8 · S2 — the two root routers disagree, one layer below the last fix

`AGENTS.md` (rewritten in `79309e5`) lists `canon-root`, `plans`, `audits`, `generated`.
`README.md` — which declares itself the start-here surface — lists neither `canon-root` nor `audits`,
stops its rung table at `historical`, and does not mention `emit`/DG11 at all. This is the RT-8 class
(root-router drift) recurring one layer down.

---

### UT-9 · S3 — house and vendored skills share one namespace

`skills/` contains 2 house governance skills and **134 tracked files of third-party vendored
content** (`ui-styling` 98, `ui-ux-pro-max` 35, `design-taste-frontend` 1 — fonts, CSVs,
`LICENSE.txt`). Nothing distinguishes them, so "the house utilities" is not a decidable set from the
tree alone, and third-party code is committed as though it were ours.

---

### UT-10 · S3 — validation is full-scan-per-gate and produces no machine-readable output

`records()` re-reads and re-parses all 27 records **in seven separate gates**; `live_files()` re-globs
the tree per gate; DG12 regex-scans all 618 live files; DG5 runs 6 terms × N patterns over 642 files.
Measured cost: **1.3 s** at the current size — so this is a *shape* finding, not a bug.

Two consequences worth stating, because the specification says "scales infinitely":
1. Storage scales (plain markdown, path-addressed). **Validation cost is O(docs) × 12 gates with no
   index**, so it grows linearly and there is no artifact to make it sublinear.
2. `validate` has `--gate` and no `--json`, so nothing downstream (CI badges, dashboards, an agent
   choosing what to fix) can consume the result programmatically.

---

### UT-11 · S3 — no ingest for `docs/foundations/` at all

The corpus has a generator (broken, `79309e5`-fixed); the stage-holons and red-layer holons have JSON
mirrors; the runtime has hand-written glossary/polarity/registry modules. **Foundations docs are
ingested by nothing.** They are prose that only a human or an LLM reads.

That is coherent with the design (canon is the authority, code is the implementation) — but it means
there is no mechanical link between a foundation doc's contract and the code that must satisfy it,
beyond `contract_docs` pointers and DG10's check on paths *cited inside records*. Which is why
RT-9 (the stage rename) and MY-RG-0005 (canon↔code drift) can exist at all.

---

## 3. Disposition

The specification has four missing pieces. In dependency order:

| # | Piece | Closes |
|---|---|---|
| 1 | **`arch.py search <keyword>`** — ranked keyword hits over live docs + records, each with path, rung/organ, title, matching lines, and outbound refs | UT-2 |
| 2 | **`arch.py related <target>`** — the referential graph: forward edges *and* **backlinks**, joining the three islands (organ↔code, organ↔contract docs, term↔owner, record↔organ/Related, doc↔doc wiki-links) | UT-3 |
| 3 | **`arch.py doc add`** — author a document under an organ via CLI, from a template, reachable the moment it exists, with a ledger receipt | UT-4, UT-6 |
| 4 | **Auto-discovery of organ documents** — routers and `context` list every `*.md` in the organ directory, so a new doc is reachable by construction (no registry to hand-edit) | UT-1 |
| 5 | **DG13 organ integrity** — organ `code:` paths and `contract_docs` must resolve; the false claim in `_org.yaml` becomes true | UT-5 |
| 6 | Orphan triage (mark one-shot scripts as historical), root-router reconciliation, skills provenance markers, `validate --json` | UT-7…UT-10 |

**The load-bearing idea:** pieces 1–4 make documentation *reachable and addable* without any
hand-maintained registry. Every registry that can be derived from the tree should be — `_org.yaml`
declares the structure (which must be hand-authored), but the *contents* of an organ (its documents,
its records) are discoverable and should never be listed by hand. UT-1 exists precisely because the
router listed its contents from a declaration instead of discovering them.

---

## 4. Status

**Fixed in this pass** — recorded as `MY-AD-0015`, `MY-RG-0014`, `MY-RG-0015`:

| Finding | Fix | Evidence |
|---|---|---|
| UT-1 | `organ_docs()` auto-discovers; routers + `context` list the organ's own documents | `context src/core/engines` now returns `kernel/core-engine.md` + `stage-assessment-architecture.md` |
| UT-2 | **`arch.py search <keyword>`** — ranked, AND-across-terms, with path/rung/organ/title/lines/refs; `--json` | `search "alignment adjustment"` → 14 hits, 27/24/records ranked correctly |
| UT-3 | **`arch.py related <path\|ID>`** — outbound + structural + **backlinks**, joining 5 edge sources and 5 citation styles | `related docs/foundations/19-…` → 5 inbound (44, the `catalyst` organ, 2 records, the router); previously the question was unanswerable |
| UT-4 | **`arch.py doc add --organ O --title T`** — template or `--file`, ledger receipt, no registry edit | round-tripped into `safety` (an organ with zero docs): immediately reachable via `context`, findable via `search`, gate-green after `emit` |
| UT-5 | **DG13** organ integrity — `code:` paths and `contract_docs` must resolve, organ must declare code and have a router | proven to fail on both injections (bogus code path; bogus contract doc) |
| UT-8 | `README.md` rung table reconciled with `AGENTS.md`; the six query verbs documented | — |
| — | `activate the graph`: 1.4 s `validate`, 0.3 s `search` at 642 documents | — |

**Still open, declared in `_org.yaml → pending`:** `KB-ORPHAN-TRIAGE` (UT-7), `KB-ORGAN-DOCS`
(UT-6 — the 6 empty organs), `KB-SKILLS-PROVENANCE` (UT-9), `KB-VALIDATE-JSON` (UT-10),
`KB-FOUNDATIONS-INGEST` (UT-11).

**Not a defect:** the four linters (`arch.py` DG1–DG13, `workspace-lint`, `check-invariants.ts`,
`validation/gates.ts` G1–G21) are genuinely disjoint — doc governance, file hygiene, static structure,
runtime behaviour. Their overlap is zero and they should stay separate.

**One thing this pass could not fix by construction:** `doc add` gives an agent the *mechanism* to
document an organ; it does not give it the *knowledge*. The six empty organs (UT-6) need someone who
knows what `src/core/safety`, `src/core/pods`, `src/infra/profiles` and `src/core/credential`
actually do. The template stages the sections and the CLI makes the result reachable; the content is
an authoring task, not a tooling one.

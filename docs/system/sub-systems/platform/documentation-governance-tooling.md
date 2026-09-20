# Documentation Governance & Tooling

> **Organ:** `platform` · **Status:** Active · **Date:** 2026-09-20
> **Contract docs (canon):** *(none declared)*

## 1. Purpose

This organ owns **the surface an agent reads before it writes**: the record system (`AD`/`RG`), the
structural declaration (`_org.yaml`), the routers every rung is entered through, the retrieval verbs
that make the knowledge-base queryable, and the lint/build/test battery that every iteration runs
(`AGENTS.md §7.5`). It exists because the documentation set is *the* foundation of this project — a
governance layer that reports green on a broken foundation is worse than none.

## 2. Boundaries

**Inside:** `scripts/arch.py` (authoring, retrieval, and gates DG1–DG19), `_org.yaml`, the rung and
organ routers (generated), `docs/INDEX.md` (generated), the workspace linter, the migration scripts,
and the build/test configuration.

**Outside, deliberately:**

- **What the canon says** — the `canon` rung owns content; this organ owns whether a reader can
  *reach* it (gate **DG18**) and whether its references resolve (DG12–DG17).
- **The kernel's behavioural gates** — `validation` owns G1–G21, which assert the *product*; this
  organ's DG series asserts the *documentation set*.
- **Runtime configuration** — `src/core/config` is a code surface owned here but governed by `26`.

## 3. Interfaces

| Surface | Direction | Contract |
|---|---|---|
| `scripts/arch.py` | provides | `route` · `context` · `search` · `related` · `doc add` · `new` · `update` · `log` · `emit` · `validate` |
| `_org.yaml` | provides | rungs (with `router`), 13 organs, records, gates, `pending` |
| `docs/system/logs/mutations.jsonl` | provides | the append-only ledger every record write receipts into |
| `skills/workspace-lint/` | provides | the workspace linter run by `AGENTS.md §7.5` |
| `docs/foundations/AGENTS.md` · `docs/system/AGENTS.md` | provides | the rung routers |

## 4. Invariants

1. **The CLI is the only write path for a record** — ADs and RGs are created and amended through
   `arch.py new`/`update`, never by hand (`MY-AD-0013`).
2. **Relationality is enforced, not reported** — a new document with no reference in either
   direction is refused (`MY-AD-0016`, gates DG12/DG14/DG15).
3. **Every rung router names every document in its rung** — a ratified document cannot be 
   unreachable from the map (`MY-AD-0024`, gate DG18).
4. **Every Active AD declares a consumer or a deferral**, and a deferral must name a real
   `pending` key (`MY-AD-0025`'s sibling work; gate DG19).
5. **A cited path or record ID resolves** — prose included (DG16/DG17); `planned:` and declared-future
   markers are the only escape, and they must be explicit.
6. **Derived surfaces are generated** — `docs/INDEX.md` and organ routers are emitted, never
   hand-edited (DG11).
7. **A gate is not trusted until it has been shown to fail** — `arch.py fixtures` injects one violation
   per gate, runs that gate alone, restores the tree, and reports any gate that passed on its own
   violation as toothless. A harness may only undo what it can prove it did (`MY-RG-0013`).

## 5. Records

```bash
python3 scripts/arch.py context scripts/arch.py
```

## 6. References

- `AGENTS.md §3` documentation protocol and §7.5 the iteration protocol
- `docs/system/AGENTS.md` the system rung router · `docs/foundations/AGENTS.md` the canon router
- The `MY-AD-0013`–`MY-AD-0017`, `MY-AD-0024` records: the governance half of this project

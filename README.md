# Mysterium

A contemplative practice that uses game mechanics as its delivery vehicle: every encounter
simultaneously diagnoses and heals/evolves the player across all lines of development, with
Law-of-One cosmology as canon.

## Start here

| If you are… | Read |
|---|---|
| an AI agent or contributor working on this repo | **[`AGENTS.md`](AGENTS.md)** — the operating manual (process, protocol, iteration steps) |
| looking for a document | [`docs/INDEX.md`](docs/INDEX.md) — **generated** index of rungs, organs and records |
| looking for what a word means | [`docs/foundations/44-system-ontology-and-vocabulary.md`](docs/foundations/44-system-ontology-and-vocabulary.md) — the grammar |
| looking for the system architecture | [`docs/system/AGENTS.md`](docs/system/AGENTS.md) — the organ map |
| looking for decisions or past failures | [`docs/system/core/decisions/`](docs/system/core/decisions/) · [`docs/system/core/regressions/`](docs/system/core/regressions/) |
| looking for the build plan | [`docs/DEVELOPMENT-PLAN.md`](docs/DEVELOPMENT-PLAN.md) |

## The documentation rungs

```
canon        docs/foundations/          theory — "what is true"
canon-domain docs/{lines,stages,narrative,progression}/
content      docs/concept-drafts/       512-file corpus
system       docs/system/               contracts, as 13 organs
records      docs/system/core/          AD · RG · Log   (decisions, guards, ledger)
historical   docs/historical/           dated; never an authority
```

Declared machine-readably in [`_org.yaml`](_org.yaml). Validate and route with:

```bash
python3 scripts/arch.py validate          # the doc-governance gates
python3 scripts/arch.py route <path>      # which rung/organ owns this file?
```

## Development

```bash
npm run build && npm test                 # build + 1120 tests
python3 skills/workspace-lint/scripts/workspace_lint.py --root .
python3 scripts/arch.py validate
```

The mandatory iteration sequence is in [`AGENTS.md §7.5`](AGENTS.md).

> This README is a pointer, not a second router. Governance content lives in `AGENTS.md` (one
> canonical document per directory); if this file grows beyond pointers, that is a defect.

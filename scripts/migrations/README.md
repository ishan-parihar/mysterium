# scripts/migrations/ — archived one-way migrations

**These tools are retired.** Each performed a one-time rewrite of the tree whose mapping is not
derivable from the repository after the fact, so they are preserved here (not deleted) as the only
executable record of what changed. The `@script-status: historical|one-shot` declaration on each
file is gate-checked by **DG20** (`python3 scripts/arch.py validate --gate DG20`).

| Tool | What it did | Guard |
|---|---|---|
| `doc-stage-reindex.py` | Active-canon stage vocabulary → the ratified KosmOS ladder (2026-09-20): `White → Turquoise`, `Turquoise → Teal`, path renames. **ONE-WAY**: a re-run maps the *correct* stage-8 name `Turquoise` back to `Teal` and corrupts the tree (incident 2026-09-20). | `receipts/doc-stage-reindex.json` |
| `code-stage-reindex.py` | The CODE half of the same re-index, held back by the doc half so doc and code never diverged mid-migration: 87 content files + 18 path renames under `src/` + `tests/`. Also **NOT idempotent** for the same reason. | `receipts/code-stage-reindex.json` |
| `doc-path-reindex.py` | Link rewrite after the structural move (P3/P6, 2026-09-20): `docs/architecture/` → `docs/system/sub-systems/`, historical quarantine, benchmark relocation. Idempotent by construction, receipt-guarded anyway. | `receipts/doc-path-reindex.json` |

## Receipts (`receipts/*.json`)

One JSON receipt per tool: what ran, when, against which base revision, how much it changed, and —
for the one-way tools — *why* the guard exists. The receipts moved here with the tools: as
`docs/.<tool>.applied` dotfiles they were governance artefacts living inside the documentation set,
invisible to every index and to DG1. A migration's proof-of-run is a record **about** the tree, not
a document **of** it.

## Re-running

Don't. Each tool refuses when its receipt exists (`--force` overrides, and is a bad idea unless the
tree has been reverted to the pre-migration state — see each tool's refusal message, which names the
exact corruption a second pass would cause). They are kept executable so a future agent can *read*
the mapping, and runnable only against a reverted tree.

## Why a directory and not deletion

`MY-RG-0001` (a one-way migration script looks idempotent and is not) exists because the mapping a
one-way script encodes is otherwise unverifiable from the tree. Deleting the script deletes the last
executable statement of what the rename actually did; the git history holds the diff, but not the
order-sensitivity or the held-span reasoning that made the mapping safe. Archived-with-receipt is
the form that keeps `MY-RG-0001` auditable without leaving destructive tools where a routine
`ls scripts/` can mistake them for live utilities.

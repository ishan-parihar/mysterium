# docs/historical/AGENTS.md — Quarantine Router

> **Role:** the canonical entry point for the historical rung. `_org.yaml` declares this rung
> **`live: false`**, which makes it invisible to every gate, every index, and every search for
> current canon.
> **Status:** Active (2026-09-20) — as a *quarantine*, not as canon.

---

## 1. The rule

**Nothing here is an authority. Nothing here is current. Nothing here is rewritten.**

These files describe the state of the project **at a date**. They are retained because they are the
evidence behind the record ledger: every regression guard (`MY-RG-NNNN`) that was written from an
audit points back into this material, and deleting it would delete the evidence.

| You want | Go to |
|---|---|
| what is true now | `docs/foundations/` (canon) |
| how it is built now | `docs/system/` (system) |
| what we decided / what broke | `docs/system/core/{decisions,regressions}/` |
| what the corpus plays as | `docs/concept-drafts/` |
| **what it looked like on a date** | **this directory** |

Gate `DG6` fails any **live** document that cites `docs/historical/` as authority, and
`docs/INDEX.md` is generated from live rungs only — so historical material cannot leak into the
current surface by accident.

## 2. Inventory

| Path | What it is | Dated |
|---|---|---|
| `archive/` | the archive of superseded material, including `archive/atb-combat/` (the removed time-bar combat design) and `archive/old-*/` audit sets | 2026-07 → 2026-08 |
| `audits/RED-TEAM-AUDIT-DEFINITIVE.md` | a red-team audit that sat at the docs root claiming "CRITICAL — 3 pillars must be rebuilt" | 2026-06-23 |
| `PROGRESS.md` | frozen progress log, superseded by `DEVELOPMENT-PLAN.md §9` | frozen 2026-07 |
| `agentic-loop/` | four dated audit reports whose subject matter `foundations/43` now owns | 2026-08-28 |
| `brain-game-upgrade/` | absorbed upgrade notes | 2026-08 |
| `superpowers/` | retired plan set | 2026-07 |
| `research/` | pre-canon exploration | 2026-05 → 2026-06 |

`docs/audits/` is a separate non-live rung (`_org.yaml`) and stays in place: the audit reports are
the evidence trail, indexed by date rather than by rung.

## 3. Adding to this directory

Move a document here when it is **dated** — i.e. when its claims are only meaningful relative to a
moment — and not merely when it is old. Then:

1. Move it (never rewrite its contents — the vocabulary it uses is part of the record).
2. Add it to the inventory table above.
3. If it was cited by a live document, replace that citation with the live owner or with the AD/RG
   that superseded it.
4. Record the move with `python3 scripts/arch.py log --action move --target <path> --reason "..."`.

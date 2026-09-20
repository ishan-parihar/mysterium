---
ID: MY-AD-0013
Title: "Documentation is governed as a three-record system"
Status: Active
Date: 2026-09-20
Organ: platform
Source: "docs/ARCHITECTURE-TRANSMUTATION-PLAN.md §2.2"
Description: "Decisions (AD), regression guards (RG) and a mutation ledger, with a machine-readable structure declaration and fail-closed gates."
Related: [MY-AD-0003, MY-RG-0001, MY-RG-0010]
---

## Context
706 markdown files and no architecture record: decisions lived as prose sections, audit findings
never closed, and nothing declared which directories were live.

## Decision
Three record types with distinct owners — AD (forward design), RG (post-mortem guard), Log (the
append-only mutation ledger) — plus `_org.yaml` (the structure declaration) and `scripts/arch.py`
(the only write path, with gates DG1–DG10).

## Consequences
- Positive: "what did we decide and is it still true" becomes answerable; findings close.
- Negative: a linter and a ledger to maintain — accepted because the alternative is drift.
- Evidence: the first ledger entry is `MY-RG-0001`, an incident caused during this very migration.

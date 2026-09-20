---
ID: MY-RG-0004
Title: "A dormant directory reads as live canon"
Status: Active
Date: 2026-09-20
Organ: platform
Severity: Medium
Source: "docs/audits/DOC-SET-AUDIT-2026-09-20 D5"
Description: "Dated directories (agentic-loop/, brain-game-upgrade/, superpowers/, a June red-team audit at the docs root) were navigable as if current."
Related: [MY-AD-0013]
---

## Symptom
An agent reads `docs/historical/audits/RED-TEAM-AUDIT-DEFINITIVE.md` ("Status: CRITICAL - 3 architectural pillars
must be rebuilt", dated 2026-06-23) and treats a two-month-old audit as a live verdict.

## Root cause
Historical material was left in place with no status stamp and no rung declaration, so "is this
current?" had no answer other than the reader's judgment.

## Detection
`python3 scripts/arch.py validate --gate DG6`

## Prevention
- Dated material moves to `docs/historical/` (rung declared `live: false` in `_org.yaml`).
- DG6 fails a live document that cites `docs/historical/` as authority.
- `docs/INDEX.md` is generated from live rungs only, so historical material cannot appear as current.

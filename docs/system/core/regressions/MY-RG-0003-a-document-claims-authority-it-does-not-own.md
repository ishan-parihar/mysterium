---
ID: MY-RG-0003
Title: "A document claims authority it does not own"
Status: Active
Date: 2026-09-20
Organ: platform
Severity: Medium
Source: "docs/audits/DOC-SET-AUDIT-2026-09-20 D3"
Description: "docs/system/AGENTS.md.md described itself as the binding architectural contract while the ratified hierarchy gives contracts to foundations and sequencing to the plan."
Related: [MY-AD-0013]
---

## Symptom
A doc set has two documents that both call themselves authoritative (`docs/system/AGENTS.md.md`
said "The binding architectural contract for Mysterium"), so an agent cannot tell which to follow.

## Root cause
Authority was written by hand into prose, and nothing owned the authority map. Any document could
promote itself.

## Detection
`python3 scripts/arch.py validate --gate DG4`

## Prevention
- `_org.yaml → authority_map` names the only documents that may self-describe as binding.
- DG4 fails any other live document claiming authority; the former overview is now
  `docs/system/AGENTS.md`, a router without the claim.

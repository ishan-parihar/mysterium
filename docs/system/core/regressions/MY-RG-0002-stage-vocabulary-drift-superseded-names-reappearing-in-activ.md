---
ID: MY-RG-0002
Title: "Stage vocabulary drift (superseded names reappearing in active canon)"
Status: Active
Date: 2026-09-20
Organ: platform
Severity: High
Source: "docs/audits/DOC-SET-AUDIT-2026-09-20 D1/D2"
Description: "The retired stage vocabulary (White as a stage, Turquoise as stage 7, stage=density labels) keeps reappearing in new prose."
Related: [MY-AD-0003, MY-RG-0001]
---

## Symptom
A new document written months after the re-index says "at White stage", or labels a band "D4+",
or writes "07 Turquoise". Nothing fails; the canon just forks again.

## Root cause
Vocabulary corrections lived only in prose. Nothing executable prevented a regression, so the
only detector was a human re-reading ~700 files — which is why D1/D2 were found by an audit
rather than by the build.

## Detection
`python3 scripts/arch.py validate --gate DG5`

## Prevention
- The blacklist block in `docs/foundations/44 §9` is machine-read; DG5 fails on a live document
  that uses a superseded sense, with `exempt_in` covering the documents that legitimately discuss
  the retirement.
- Adding a term to the blacklist is the required final step of any vocabulary correction.

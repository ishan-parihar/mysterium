---
ID: MY-RG-0005
Title: "Canon and code drift apart on a shared vocabulary"
Status: Active
Date: 2026-09-20
Organ: kernel
Severity: Medium
Source: "docs/audits/DOC-SET-AUDIT-2026-09-20 §D1 + plan §13"
Description: "The priority weights in PriorityComputation.ts disagreed with the documented canon (7 criteria vs 8), and the stage re-index renamed docs without renaming the code identifiers."
Related: [MY-AD-0001, MY-AD-0003]
---

## Symptom
`src/core/engines/PriorityComputation.ts` carried 7 criteria with `userMatrixTargeting: 0.12`,
while `foundations/24 §3.2` canonised 8 with `masteryAlignment: 0.10`. Separately, docs read
`Teal`/`Turquoise` while `src/core/assessments/*/white.ts` and the `Stage` union still read the
pre-re-index names.

## Root cause
The docs and the code each owned a copy of the same vocabulary, and no check compared them. A
documentation-only rename is *worse* than no rename, because it creates a silent mismatch.

## Detection
`python3 scripts/arch.py validate --gate DG10` (records citing code artifacts must resolve);
plus a test asserting the computed criteria match `foundations/24 §3.2`.

## Prevention
- Where a term is also a code identifier, docs **hold** the rename and annotate it
  `CODE-PASS PENDING` until the code pass lands atomically with its tests.
- Every such held span is listed in the sweep report
  (`python3 scripts/doc-stage-reindex.py`).

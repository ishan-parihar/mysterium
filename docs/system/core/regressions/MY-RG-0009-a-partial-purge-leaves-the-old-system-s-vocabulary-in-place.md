---
ID: MY-RG-0009
Title: "A partial purge leaves the old system's vocabulary in place"
Status: Active
Date: 2026-09-20
Organ: kernel
Severity: Medium
Source: "docs/audits/DOC-SET-AUDIT-2026-09-20 D4"
Description: "The ATB removal pass updated foundations but missed architecture/10, which kept 'Relationship to Combat' and 'How This Replaces Combat-Only Progression'."
Related: [MY-AD-0001]
---

## Symptom
Months after a subsystem was removed, a live architecture document still specifies how that
subsystem works, so new work is designed against a system that no longer exists.

## Root cause
The purge was executed as a document-by-document review with no inventory of which documents
mention the subsystem. Coverage was assumed rather than checked.

## Detection
`grep -rln "ATB\|combat-only" docs/ --include=*.md | grep -v docs/historical` must return nothing;
DG5's blacklist carries the vocabulary patterns.

## Prevention
- A removal pass starts with a token inventory across live canon and ends by adding those tokens
  to the blacklist (`foundations/44 §9`), so the class cannot return.

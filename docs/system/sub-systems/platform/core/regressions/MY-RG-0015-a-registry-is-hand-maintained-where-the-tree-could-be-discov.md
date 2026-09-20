---
ID: MY-RG-0015
Title: "A registry is hand-maintained where the tree could be discovered"
Status: Active
Date: 2026-09-20
Organ: platform
Severity: High
Source: "docs/audits/KB-UTILITIES-AUDIT-2026-09-20.md UT-1, UT-4"
Description: "Contents that are derivable from the filesystem were instead listed by hand, so the listing rotted: organ routers and context listed only contract_docs (which point at foundations), leaving 11 of the organ's own architecture documents unreachable and 8 with zero inbound links anywhere. Adding a document required four hand-edits across three files, two of them gate-enforced, so the failure mode of adding documentation was a red gate naming the wrong file. Derive what can be derived; declare only what cannot."
Related: []
---

## The regression

Contents that are derivable from the filesystem are listed by hand instead. The hand-list rots
silently, because nothing reconciles it against the tree it claims to describe.

**Observed:** organ routers and `context` listed only `contract_docs` — which point at *foundations*
docs, not at the organ. So the organ's **own** architecture documents were unreachable by construction:
11 documents, **8 with zero inbound links from anywhere in the repository** (`core-engine`,
`encounter-system`, `polarity-engine`, `shadow-work`, `curriculum-system`, `llm-integration`,
`persistence`, `rendering-layer`). They were written, moved into the right organ by the transmutation,
and connected to nothing.

And adding a document required four hand-edits across three files:

1. create the `.md` in the organ directory,
2. add it to `contract_docs` in `_org.yaml` (else invisible),
3. add it to `44`'s owner table if it is a numbered foundation (else **DG7 fails**),
4. remember `emit` (else **DG11 fails**).

The failure mode of "add documentation" was therefore *a red gate naming the wrong file*.

## Prevention (executable)

- `organ_docs()` **discovers** documents by globbing the organ directory; routers and `context` both
  use it. A new document is reachable the moment it exists.
- `arch.py doc add` creates the document, writes a ledger receipt, and requires no registry edit.
- `emit` writes `.gitkeep` into every organ `core/{decisions,regressions}` so contents survive a clone.

## Prevention (procedural)

Before declaring a list, ask whether it can be derived. `_org.yaml` legitimately declares the
**structure** (rungs, organs, gates — choices). It must not enumerate the **contents** (documents,
records — facts) because those are readable from the tree and a hand-list always drifts.

## References

- `docs/audits/KB-UTILITIES-AUDIT-2026-09-20.md` UT-1, UT-4, UT-6
- `MY-AD-0015` (the knowledge-base is queried, not only validated)

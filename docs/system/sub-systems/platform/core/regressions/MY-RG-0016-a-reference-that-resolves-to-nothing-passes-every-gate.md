---
ID: MY-RG-0016
Title: "A reference that resolves to nothing passes every gate"
Status: Active
Date: 2026-09-20
Organ: platform
Severity: High
Source: "docs/audits/KB-UTILITIES-AUDIT-2026-09-20.md UT-3, DG14"
Description: "Prose pointers are invisible to the link gates, so they are written, never validated, and rot silently. Three were found in the canon in one pass: foundations/02 said per-stage detail is in stages/0X-*.md (a glob, not a link), foundations/03 said line detail is in lines/01-...08-... and pointed at combat/03-skill-tree-architecture.md (a directory that no longer exists since the combat spine was replaced) and at roadmap/02 (also gone). None of these is a link, so DG12 never saw them; and because they were not links they also produced no graph edge, which is how five canon-domain documents became orphans with zero inbound references."
Related: []
---

## The regression

A cross-reference written **in prose** is invisible to the link gates. It is never validated, so it
rots silently, and because it is not a link it also produces no graph edge — so it creates orphans
without ever being reported as broken.

**Observed** — three in the canon in a single pass:

| Written | Problem |
|---|---|
| `foundations/02`: *"Per-stage detail is in `stages/0X-*.md`"* | a glob, not a reference; resolves to nothing, but reads as if it does |
| `foundations/03`: *"Per-line detail is in `lines/01-…08-…`"* | same pattern, same nothing |
| `foundations/03`: *"generated from data in `combat/03-skill-tree-architecture.md`"* | the `combat/` directory no longer exists since the assessment-module spine replaced it (`MY-AD-0001`) |
| `foundations/03`: *"revisit in `roadmap/02`"* | `roadmap/` no longer exists |

DG12 checks wiki-link syntax (double-bracket) and markdown-link syntax (a bracketed path ending in
`.md`). None of the pointers above uses either, so DG12 passed them while they pointed at nothing. And because the taxonomy overviews referenced their children in prose,
the children had **no inbound edges** — which is how five canon-domain documents (2 line docs, 3 stage
docs) became orphans with zero references in either direction.

## Prevention

- Both overviews now carry **real link tables** (`foundations/02` §3.1 per-stage;
  `foundations/03` §7 per-line), so the taxonomy is navigable and every child has an inbound edge.
- **DG14** makes the *consequence* visible: an unlinked document is a violation, so a rotted pointer
  surfaces at the next `validate` instead of at the next reader.
- The dead pointers were replaced with live ones (the corpus README, the concept-drafts ROADMAP, and
  `MY-AD-0001` for the retired skill-tree document).

## What is deliberately *not* enforced

DG12/DG14 do not resolve **backticked paths** in general (`` `src/core` ``, `` `stage-holons` ``,
`` `config.json` `` are legitimate non-reference code spans). The line between "a code span" and "a
reference" is semantic; enforcing it by pattern would produce far more false positives than findings.
The cost of that choice is this regression class: **a prose pointer is the one reference shape that no
gate can see**, so it is on the author and the reviewer.

## References

- `docs/audits/KB-UTILITIES-AUDIT-2026-09-20.md` UT-3
- `MY-AD-0016`, `MY-RG-0014` (a declaration claims enforcement that no gate performs)

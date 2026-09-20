---
ID: MY-AD-0016
Title: "Relationality is enforced when creating, modifying and validating the knowledge-base"
Status: Active
Date: 2026-09-20
Organ: platform
Source: "docs/audits/KB-UTILITIES-AUDIT-2026-09-20.md C4"
Description: "Relationality was reported, never enforced: DG12 proved links resolved and discarded the edge, and an authored document with zero links passed all thirteen gates. Now DG14 fails any live document in an authored rung with no inbound and no outbound reference (rung content/corpus exempt by design: its relationality is structural), DG15 requires a record's Source: to name a resolvable document, doc add refuses to create an orphan and prints BM25 link candidates instead, and search --relations plus related emit declared structural edges and BM25-similar documents not yet linked. Measured: canon-domain 5 -> 0 zero-edge docs, system 4 -> 1 (a generated router), 550 citation edges over 645 documents."
Related: []
---

## Decision

Relationality is **enforced at all three moments** the knowledge-base is touched:

| Moment | Mechanism | Effect |
|---|---|---|
| **create** | `arch.py doc add` | refuses to write an orphan; prints BM25 link candidates from the whole knowledge-base and returns 2 |
| **modify** | DG12 + DG14 on the next `validate` | breaking an inbound link fails DG12; removing the last edge fails DG14 |
| **manage / validate** | **DG14** relationality · **DG15** Source resolution | every authored document needs an edge; every record's `Source:` must name a resolvable document |

Plus the **suggestion** surface: `search --relations` and `related <path|ID>` emit the declared structural
edges and the BM25-similar documents **not yet linked in either direction**.

## Retrieval is BM25, not term counts

`Corpus` indexes every live document with field-weighted BM25 (title x3, headings x2, body x1;
k1=1.2, b=0.75), replacing the first implementation's three faults: long documents out-ranking
precise ones, common words weighing as much as rare ones, and scores that were raw mention counts and
therefore incomparable across rungs. Deliberately un-stemmed — this corpus's terms are compound
(`contract_docs`, `polarity-engine`, `stage-holons`) and stemming merges distinct concepts.

`suggest` = BM25 relevance x structural knowledge: for any document, the query is its own most
distinctive terms (tf x idf), and candidates already linked are filtered out, so what remains is
exactly the *missing* wiring.

## Scope of the relationality requirement (stated, not implied)

| Rung | Required to be connected? | Why |
|---|---|---|
| canon, canon-root, canon-domain, system, plans | **yes** | these are the interconnected architecture |
| content (the 512-file corpus) | **no** | its relationality is structural: line x stage directories plus the generated corpus index. 494 of 515 files legitimately carry no citation |
| generated | n/a | a generated router's edges are produced by `emit`; DG11 owns it |

The exemption is **explicit and documented here** rather than an unstated gate blind spot — an
enforcement whose scope is invisible is worse than none.

## Consequences (measured at 645 live documents)

- `canon-domain`: **5 → 0** zero-edge documents. `system`: **4 → 1** (the generated `platform` router,
  which is empty because that organ has no documents yet — `KB-ORGAN-DOCS`).
- 550 citation edges, 0.85 out-edges/document. `canon`, `canon-root` and `plans` were already at 0.
- Cost: `Corpus` build ~1.0 s; a BM25 query ~1 ms; `relations()` ~10 ms.
- Both new gates proven to fail on injection (an injected orphan document; a fabricated `Source:`).

## References

- `docs/audits/KB-UTILITIES-AUDIT-2026-09-20.md` §0 (C4), UT-3
- `MY-RG-0016` (a reference that resolves to nothing passes every gate)
- `MY-AD-0015` (the knowledge-base is queried, not only validated)

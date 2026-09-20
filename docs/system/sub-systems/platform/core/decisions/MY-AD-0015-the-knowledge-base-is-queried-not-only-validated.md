---
ID: MY-AD-0015
Title: "The knowledge-base is queried, not only validated"
Status: Active
Date: 2026-09-20
Organ: platform
Source: "docs/audits/KB-UTILITIES-AUDIT-2026-09-20.md C2-C5"
Description: "The governance layer could author and validate but not answer questions over the corpus. Three verbs close it: search (keyword over live docs and records, ranked, each hit reporting where it lives and what it references), related (the referential graph with BACKLINKS, joining organ<->contract docs and organ<->code, term<->owner, record<->organ/Related/Source, and doc<->doc across five citation styles), and doc add (author an organ document via CLI). Organ documents are DISCOVERED from the tree, not declared, so a new document is reachable from route/context/search/related the moment it exists and no registry is hand-edited."
Related: []
Consumer: "`scripts/arch.py` (the search and related verbs)"
---

## Decision

The knowledge-base is **queryable**, not merely authorable and validatable:

- **`arch.py search <keyword>`** — AND across terms, ranked by body frequency, title match, then
  heading match. Every hit reports its path, rung, organ, title, matching lines, and **outbound refs**,
  so a hit is a starting point rather than a dead end. `--json` for machine consumers, `--limit`,
  `--lines`.
- **`arch.py related <path|ID>`** — the referential graph for a node: **outbound edges**, **declared
  structural edges**, and **backlinks**.
- **`arch.py doc add --organ O --title T`** — author an organ document through the CLI (`--file` to
  supply a body, else the house template), with a ledger receipt.

## The joining rule (the load-bearing part)

**Derive what can be derived; declare only what cannot.** Organ documents are *discovered* by globbing
`docs/system/sub-systems/<organ>/*.md`, not listed in `_org.yaml`. A new document is therefore
reachable from `route`, `context`, `search`, `related`, and the generated router **the moment it
exists**, with no registry edit to forget.

## The graph edges now joined

| Edge | Source of truth |
|---|---|
| organ → contract docs | `_org.yaml` |
| organ → code paths | `_org.yaml` |
| term → owning doc (52) | `44` `# owners-table` |
| record → organ · Related[] · Source | record frontmatter |
| doc ↔ doc | body citations, across **five** styles |

The five citation styles are wiki-links, markdown links, backticked paths, bare paths, and
rung-relative paths with a section suffix (`` `foundations/19-… §9.6` ``, how a record's `Source:`
field cites canon). Missing the last three made the first version report `(no backlinks)` for a
document that four other files point at — an edge extractor that under-reports is worse than none.

## Consequences

- `docs/foundations/19` now reports 5 inbound edges (44, the `catalyst` organ, two records, and the
generated router); before this decision the question had no answer at all.
- `context` on a code path returns the organ's **own** architecture documents as well as the canon
  that informs it — previously it returned only `contract_docs`.
- Cost: `search` ~0.3 s, `validate` ~1.4 s at 642 live documents (full-scan, no index — see the audit's
  UT-10 for the scaling shape).

## References

- `docs/audits/KB-UTILITIES-AUDIT-2026-09-20.md` §0 (C2–C5), UT-1…UT-4
- `AGENTS.md` §2.0, §7.5 step 1b

<!-- 2026-09-20: DG19: declare where this law is consumed, or the pending key that will consume it (recon 2b4849c6b7) -->

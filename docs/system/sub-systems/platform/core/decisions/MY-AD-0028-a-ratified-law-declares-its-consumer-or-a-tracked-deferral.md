---
ID: MY-AD-0028
Title: "A ratified law declares its consumer or a tracked deferral"
Status: Active
Date: 2026-09-20
Organ: platform
Source: "docs/system/sub-systems/platform/documentation-governance-tooling.md section 4"
Description: "Every Active AD carries Consumer: (a resolving path, gate id or record id) or Deferral: (a key present in _org.yaml pending); DG19 fails closed otherwise and validates each deferral against the ledger."
Related: [MY-AD-0027, MY-RG-0024, MY-AD-0017]
Consumer: "`scripts/arch.py` (gate DG19)"
---

## Context

A record could be perfectly well-formed, correctly filed, correctly cited and correctly linked while
describing architecture that **nothing consumed**. Every gate checked that records are well-formed;
none asked whether a law has a consumer. So seven ratified laws (`MY-AD-0006` register classes,
`MY-AD-0007` the articulation ladder, `MY-AD-0008` the alignment bias, `MY-AD-0009` two-fold world
memory, `MY-AD-0010` background workers, `MY-AD-0011` integrated intervention, and the Auditor
Projection Layer) sat with no implementation, **none of them in the pending ledger**. That was the
largest untracked backlog in the repository, and the one class an autonomous agent is most likely to
trip over: it reads a law, implements it, and discovers six siblings nobody mentioned.

## Decision

Every **Active AD** declares at least one of:

- **`Consumer:`** — where the law is consumed: backticked paths that must resolve, a gate id (`G11`,
  `DG18`), or a record id. Backticks are required on paths, because a consumer reference must be
  *readable* by the gate rather than merely prose-adjacent.
- **`Deferral:`** — a key in `_org.yaml → pending`. The gate validates the key against the ledger, so
  a deferral cannot name work nobody tracks (the `MY-RG-0014` class: a claim of enforcement).

`DG19` fails closed on a law that declares neither. RGs are out of scope by design — an RG's consumer
is the gate that implements it, and that pairing is `MY-RG-0023`/`MY-AD-0027` territory.

## Consequences

- Positive: the pending ledger can no longer lag the record layer; declaring a law is now also a
  declaration of who owes it work. The audit that produced this decision found the backlog in one pass
  once the fields existed.
- Positive: the gate *reports its coverage* (it prints how many Active ADs it examined), so "all laws
  declare a consumer" is visible rather than assumed.
- Negative: two extra frontmatter fields per law, and a law that legitimately has neither — a
  principle like `MY-AD-0004` whose consumer is the design itself — must name the closest thing that
  is real rather than leaving the field empty. Writing an honest consumer is the point.



<!-- 2026-09-20: DG19: the gate consumes this law (recon 10e602210e) -->

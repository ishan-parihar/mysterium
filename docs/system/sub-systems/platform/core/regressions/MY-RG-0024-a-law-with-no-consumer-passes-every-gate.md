---
ID: MY-RG-0024
Title: "A law with no consumer passes every gate"
Status: Active
Date: 2026-09-20
Organ: platform
Severity: high
Source: docs/system/sub-systems/platform/documentation-governance-tooling.md
Description: "An Active AD may describe architecture that no code, gate or document consumes; every gate checks that records are well-formed, so the largest pending backlog in the project had no gate and no ledger entry."
Related: [MY-AD-0028, MY-RG-0014, MY-RG-0006]
---

## The failure

A record can be well-formed in every way the gate set knows how to check — valid frontmatter, correct
numbering, resolvable `Related:` IDs, a ledger receipt, an organ that matches its directory, a
resolvable `Source:` — and still describe architecture that **nothing implements**. Well-formedness
was mistaken for liveness.

## How it actually happened (2026-09-20)

Seven ratified laws had no consumer: register classes, the articulation ladder, the alignment bias
(seam accepted and dispositioned but never mapped into `PriorityWeightBias`), two-fold world memory,
the background worker fleet, integrated human intervention, and the Auditor Projection Layer. None
appeared in `_org.yaml → pending`. A green validate pass reported none of it, and the repository's
largest pending backlog was invisible to the tool that exists to find pending work.

## The guard

`DG19` (`MY-AD-0028`): an Active AD must declare `Consumer:` (resolving path, gate id, or record id)
or `Deferral:` (a key that exists in `_org.yaml → pending`). 25 Active laws were classified in the pass
that introduced it, and the classification is what surfaced `CHOICE-CLOSURE` — the implementation
still names the Choice's *eligibility* check after the closure event, while the grammar (`44`) cites a
function for the condition that does not exist anywhere in the tree. See
`docs/foundations/19-choice-and-polarity-engine.md` §9.6 and
`docs/foundations/44-system-ontology-and-vocabulary.md` §9 for the ratified naming.

## The generalisation

Same family as `MY-RG-0006` (a dormant seam) and `MY-RG-0014` (a declaration claiming enforcement):
the gates were all asking *is this record correct?* and none was asking *is this record owed anything?*
Whenever a new record class is introduced, ask what its **obligation** looks like, not only its schema.



<!-- 2026-09-20: DG15: a record's Source must resolve to a document (recon 10e602210e) -->

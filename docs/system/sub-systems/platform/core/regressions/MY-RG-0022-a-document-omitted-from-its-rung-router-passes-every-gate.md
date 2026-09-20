---
ID: MY-RG-0022
Title: "A document omitted from its rung router passes every gate"
Status: Active
Date: 2026-09-20
Organ: platform
Severity: medium
Source: "MY-AD-0024; docs/foundations/45,46,47 omitted from docs/foundations/AGENTS.md"
Description: "A live document that its rung's router never names is unreachable from the map agents read, yet DG1-DG17 report green because each gate checks a document that is read, never the map that reaches it."
Related: [MY-AD-0024, MY-RG-0014, MY-AD-0017]
---

## The failure

A live document that its rung's router never names is **unreachable from the map that is read**,
while `DG1`–`DG17` report green. Each of those gates validates a document it *found*; none asked
whether a reader can *find* the document. Reachability had no owner and no check.

## How it actually happened (2026-09-20)

`45`, `46` and `47` were created, ratified, wired into `_org.yaml → organs.*.contract_docs`,
referenced by each other, and covered by `DG14`'s relationality requirement — and were named by
neither router. `AGENTS.md §2.1`'s tree stopped at `43`; `docs/foundations/AGENTS.md` announced
"43 documents + 44" and its newest cluster was "Mechanisms (late) `42`–`43`". A full validate pass
was green throughout.

## The guard

`DG18` (`MY-AD-0024`): for every rung that declares a `router`, every live document in the rung
must be named by it — id token or expanded `NN–MM` range — or the gate fails closed. Proven by
injection: removing every `45` from the router makes `DG18` name
`docs/foundations/45-personalization-and-context-pooling.md`; restoring it clears.

## Why the guard is the right shape

The tempting fix is a checklist ("remember to update the router"). A checklist is not a guard: it
depends on the same attention whose absence caused the failure. The guard converts the obligation
into a property of the tree, so it holds for the agent that never read this record.



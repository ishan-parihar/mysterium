---
ID: MY-RG-0030
Title: "A lifecycle table that lists the terminal event as an ordinary successor licenses the event by walking"
Status: Active
Date: 2026-09-21
Organ: catalyst
Severity: medium
Source: "foundations/19-choice-and-polarity-engine §9.6"
Description: "Enumerating the closure event as a successor in a transition table redefines it as a milestone, so the event becomes reachable without its gates."
Related: [MY-AD-0005, MY-RG-0006, MY-RG-0024]
---

## Regression class

A lifecycle (or state) machine enumerates the *terminating event* as an ordinary successor, so the
event becomes reachable by **walking the table** instead of by satisfying its own gates.

`Significator`'s `VALID_TRANSITIONS` had:

```
Exploring: ['Developing', 'Transforming', 'Harvesting'],
```

`Harvesting` is not a stage a player progresses *into* — it is the closure EVENT, licensed by
choice-eligibility **∧** arrival at the sub-octave closure (`19 §9.6`). Listing it as a successor of
`Exploring` made "the player qualifies" and "the player has finished" the same fact anywhere the enum
was consulted, which is how a fresh, crystallized-nothing Significator could be read as finished.

The class is broader than this one edge: **any** ordered pair `(from, event)` added to a transition
table silently redefines that event as a milestone, and the table is exactly the artifact that
readers consult when they want to know what is possible.

## How it was caught

`19 §9.6` ratified the eligibility/event split and stated the lifecycle consequence as prose
("the runtime lifecycle machine must not permit `Exploring → Harvesting`"). Nothing executable
enforced it: `isValidTransition` had no caller, so no test, type or gate could see the hole. The
missing enforcement was itself invisible because an uncalled exported function reads as "the API
exists" in review.

## Guard

- The enum alone is no longer sufficient. `canHarvest(from, choice)` in
  `src/core/domain/Significator.ts` requires `isValidTransition(from, 'Harvesting')` **and**
  `choice.harvestEvent` — the parameter is structural (`{ harvestEvent: boolean }`) so `domain/`
  stays free of `engines/`.
- `Harvesting` is reachable only from `Transforming`; every other entry point is absent from the
  table, so the *enum* cannot express the shortcut even if a caller forgets `canHarvest`.
- `tests/core/domain/StageLadder.test.ts` locks both halves: no `Exploring → Harvesting`, and
  `canHarvest` false for an eligible-but-not-arrived state and false for an arrived-but-ineligible
  one. `evaluateChoice` is the only producer of `harvestEvent`.

## Testing the guard

Inject the shortcut back (`Exploring: [..., 'Harvesting']`) and the transition test fails on the
pair, not on the narrative. Inject `harvestEvent: true` from `checkChoiceEligibility` alone and the
`canHarvest` test fails. Both injections must fail; a guard that only one of them fails is guarding
the table and not the event.


<!-- 2026-09-21: declare the records this guard depends on (recon dec81c2b48) -->

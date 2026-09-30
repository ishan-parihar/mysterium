---
ID: MY-AD-0037
Title: "Ecology is Interpersonal, not Naturalist: a declined capacity remapped in the corpus"
Status: Active
Date: 2026-09-30
Organ: curriculum
Source: docs/foundations/03-lines-of-intelligence-overview.md §5
Description: "bio.ecology named a ninth line canon considered and declined; the corpus now names Interpersonal, and G17 asserts every devMapping value is canonical."
Related: []
Consumer: "`src/core/validation/gates/curriculum.ts` (G17) + `src/lib/components/displays/radarModel.ts`"
---

## The decision

**`bio.ecology`'s `"Naturalist"` secondary line becomes `Interpersonal`.** The nine-line value was
retired, not renamed, and the replacement is a ruling about a capacity canon considered and declined —
which is why it needs a record rather than a typo fix.

## What happened

`src/core/curriculum/data/bio.foundations.json`'s `bio.ecology` carried
`devMapping.secondaryLines: ["Moral", "Naturalist"]`. There is no `Naturalist` line:
`docs/foundations/03` §5 records the question verbatim —

> **Are eight enough?** Aesthetic intelligence, financial intelligence, ecological intelligence are each
> defensible additional lines. Mysterium's decision: hold to eight in MVP; revisit in concept-drafts/ROADMAP.

— so ecological intelligence was considered and **not adopted**. `git grep Naturalist -- docs/foundations`
returns nothing. The corpus named a capacity the theory does not have.

## Why the replacement is `Interpersonal`

Not a guess and not a default. The holon's own description is the evidence: "Organisms exist in webs:
energy flows, matter cycles, and every population is both constrained by and constitutive of its
community." Canon `03` §line-table gives `Interpersonal` the verbs "Attune, signal, support, rally" with
the AQAL quadrant `LL` — the collective level, which is what "constitutive of its community" describes.
The holon already declares `Cognitive` primary and `Moral` secondary, so `Interpersonal` adds the
collective dimension the other two do not, rather than duplicating them.

`Somatic` was considered and rejected: canon 03:104 gives it "Dodge, posture, breath-gate" —
proprioception and bodily regulation, which is not what an ecology holon about population structure
exercises.

## The other two options, recorded as rejected

- **Widen `ALL_LINES` to nine.** This would adopt the capacity canon explicitly deferred, in a commit
  whose subject is a dashboard view. Canon `03` §5 names ROADMAP as the place to revisit it, and a
  JSON edit is not that place.
- **Let the view throw on the unknown line.** `tally.get('Naturalist')` returns `undefined` and one holon
  out of 113 blanked the whole Developmental Radar. A data defect should be a red gate, not an exception
  thrown from a render path.

## What guards it now

**G17** asserts every `devMapping` line and `stageRange` bound is canonical, and fails closed on an empty
registry so the check cannot pass vacuously. Teeth proven by injection: restoring `"Naturalist"` turns G17
red naming `bio.ecology: Naturalist`, and restoring the file returns the same sha256
(`adf452cc367d66bf`). The corpus defect was found by a view crashing, which is the second-best time to find
it — G17's other assertions check RELATIONSHIPS, and a well-formed holon naming a retired capacity is a
closed graph over the wrong vertex set.

`radarModel.ts` keeps an `isLine` guard as belt-and-braces: the test says the corpus is clean, the guard
says which holon is not if a future one is not.

## Consumer

`src/core/validation/gates/curriculum.ts` (G17), `src/lib/components/displays/radarModel.ts`, and the
corpus file itself. If ecological intelligence is ever adopted as a ninth line, this record is superseded
by that decision and `docs/foundations/03` §5 must be amended in the same change.


<!-- 2026-09-30: DG19: a law with no consumer is invisible pending work; the consumer is the gate that enforces it. (recon 84bad748d4) -->

<!-- 2026-09-30: DG15: the source must be a resolvable path; the prose version was not resolvable. (recon 84bad748d4) -->

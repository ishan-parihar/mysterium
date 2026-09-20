---
ID: MY-RG-0026
Title: "One word carrying two frameworks re-merges them under pressure"
Status: Active
Severity: Medium
Date: 2026-09-20
Organ: catalyst
Source: "foundations/44-system-ontology-and-vocabulary §3.1"
Description: "The word polarity carried both the service-polarity of the Choice and the thesis-antithesis distinction of the dialectic. Two frameworks sharing a token do not stay distinct in practice: whichever use is more frequent silently defines the other, so a reader of 46 §4 arrives at the Choice, and a designer of a tag pair arrives at STO/STS. Guard: 44 §3.1 names both terms, the blacklist pattern set flags the dialectical sense used unqualified, and 46 states the firewall in its own section."
Related: [MY-AD-0031, MY-AD-0030, MY-RG-0005]
---

## The regression class

When two ratified frameworks share a term, the term does not stay ambiguous — **it resolves, silently,
in favour of the more frequent use.** The minority sense becomes reachable only through context a
reader has to already possess.

*Polarity* was the concrete case. `19` and `23` use it for the STO/STS service-polarity throughout;
KosmOS `polarity.md` uses it for a thesis⟷antithesis reconciliation carrying a state. Both senses are
ratified, both are in force, and the word carried no marker. The failure is not that a reader is
confused; it is that the reader is **confident and wrong**, in both directions:

- arriving at `46 §4` from `19`, "polarity" reads as the Choice, so a tag pair looks like a statement
  about service-orientation;
- designing a tag pair from KosmOS, `47`'s interest record looks like it needs a `polar_pair` field in
  the *service* sense, which is not a thing.

This is why it is a distinct class from `MY-RG-0005` (canon and code drifting apart): here nothing
drifted. Every document was internally consistent and correct. The collision is *between* documents,
and no single-document review can see it — both files read fine.

## The tell

The tell is that a **disambiguation, once added, changes behaviour** — not just comprehension. Adding
the split to `44 §3.1` did not merely clarify `46 §4`: it exposed that `46`'s dialectic engine was
missing a selection signal, because the reconciliation sense carries a *state* and the service sense
does not. A collision that turns out to have been hiding a missing mechanism was not a wording
problem. (`MY-AD-0031`'s consequences: the `reconciled` / `active-tension` / `undiscovered` state
layer.)

A second tell, from KosmOS's own handling: the ontology explicitly forbids **three** things, not two
— it firewalls the insight `±` valent as *insight valence* against both of them. A term collision
usually has more than two occupants once a third party has had to rule on it.

## The guard

1. **Name both senses where the axes are named.** `44 §3.1` is the canonical split, and it states
   which sense bare usage means (service-polarity) and what the other must be called
   (reconciliation-polarity).
2. **State the firewall in the consuming document, not only in the vocabulary doc.** `46 §5.3` carries
   it in place, next to the engine that would get it wrong. A vocabulary table is only read by someone
   already looking for it.
3. **Blacklist the unqualified dialectical use** so the pattern cannot quietly return.
4. **Watch for the third occupant.** When a new framework joins an already-collided term, it is a
   signal to check whether the term is exhausted and needs replacing rather than disambiguating.

## Scope note

The same class is live elsewhere in the ontology and is **not** yet resolved: *substrate* is used for
the D3 law-bands (`02 §4`, `06`, `22`) **and** for the intra-holonic compositional vertical
(`13`, `44` axis E). It is tracked as `_org.yaml → pending → VOCAB-SUBSTRATE` rather than fixed here,
because the rename touches ratified canon in four documents and is a user-ratified vocabulary decision
— a half-rename would be worse than the collision.

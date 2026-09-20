---
ID: MY-AD-0031
Title: "Bare polarity means service-polarity; the dialectic is reconciliation-polarity"
Status: Active
Date: 2026-09-20
Organ: catalyst
Source: "foundations/44-system-ontology-and-vocabulary §3.1, KosmOS _Ontology/polarity.md (external, not a Mysterium path)"
Description: "Two ratified frameworks used one word. Bare polarity in Mysterium means the Law-of-One service-polarity (STO/STS, the Choice, 19/23). The thesis-antithesis sense is reconciliation-polarity, per KosmOS polarity.md: a KosmOS polar_pair carrying a state (reconciled | active-tension | undiscovered), whose reconciliation is a synthesis holding both poles, and which a refutation re-opens."
Related: [MY-RG-0026, MY-AD-0005, MY-AD-0021, MY-AD-0030]
Consumer: "`docs/foundations/44-system-ontology-and-vocabulary.md` (§3.1 and the blacklist), `docs/foundations/46-generative-world-composition.md` (§4.3, §5.3)"
---

## Context

*Polarity* is doing two unrelated jobs across the ratified set.

**In `19` and `23`** it is the **service-polarity**: the STO/STS orientation that a Significator
crystallises through the aggregate of its micro-choices, and which the harvest qualifies. That is the
Law-of-One sense — polarity as *which way the entity serves* — and it is the dominant use in the
codebase.

**In KosmOS `_Ontology/polarity.md`** it is the **reconciliation-polarity**: "every distinction opens a
polarity — two poles held in tension … a polarity is not solved by picking a pole; it is reconciled by
a synthesis that holds both — a concept." It carries a **state** (`reconciled` / `active-tension` /
`undiscovered`), a formal identifier (`polar_pair`), and an inverse edge: an entity that `refutes` a
framework flips the reconciliation back to `active-tension`.

`46 §4` needed the second sense for its tag pairs and did not say which sense it meant — and a reader
arriving from `19` would read "polarity" as the Choice. That is not a wording problem. The two senses
have incompatible consequences: a service-polarity is a **scalar orientation the player accrues**; a
reconciliation-polarity is a **state of a piece of knowledge, which can be wrong and re-opened**. Code
written against the wrong one would treat the player's dialectical position as an ethical stance.

KosmOS flags a third thing to keep out of both: `polarity-self.md`'s **asymmetric-insight axiom** —
an insight's `±` valent is *insight valence* (descriptive: opportunity/risk), *not* a dialectical
state, "co-habit with the dialectical polarity graph, but do not conflate."

## Decision

1. **Bare "polarity" in Mysterium means service-polarity** — the STO/STS sense of `19`/`23`. It is the
   older and dominant use; naming the exception is cheaper and safer than renaming the rule.
2. **The dialectical sense must be written reconciliation-polarity** (or "dialectic"), never bare
   "polarity". `44 §3.1` carries the split; `46 §4.3` and §5.3 state it in place.
3. **A reconciliation-polarity carries a state**, and the state — not the pair's existence — is what
   selection reads: `undiscovered` is not a structural candidate, `active-tension` is the expansion
   target, `reconciled` is not selected structurally.
4. **Reconciliation is re-openable.** Evidence that the player later fails to hold both poles returns
   a `reconciled` pair to `active-tension`. A monotone coverage counter cannot express this; a state
   can, and KosmOS already supplies the mechanism (`refutes` → re-open).
5. **The insight-valence firewall is stated, not implied** — a `±` valent is descriptive telemetry and
   is never a dialectical state.
6. `44`'s blacklist flags the dialectical sense used unqualified.

## Consequences

- Positive: a document can now say "polarity" and be understood, and a reader of `46` cannot arrive at
  the Choice by accident.
- Positive: `46 §4.3` gains the selection signal it was missing. Its reflection-derived `opposite()`
  stays as the **candidate proposer** — geometry can always name a pole — but geometry cannot say
  whether the pair is worth an encounter, and state can. Without this, the engine would spend
  encounters on pairs the player had already integrated.
- Positive: `reconciled` replaces the saturation guard's threshold with a claim the system can be
  wrong about, which is the same move `MY-RG-0018`'s class asks for elsewhere.
- Negative / accepted: `46 §4.3`'s state layer has no implementation. It is part of the Phase-10
  build and is carried inside `PLAN-IMPLEMENT` rather than as a separate key, because a second key
  over the same document is the redundancy rule's exact target.
- Neutral: KosmOS's `polar_pair` frontmatter convention — a list of two `pole/<slug>` wiki-slugs,
  alongside `current:` and `target:` — is the house precedent for `46`'s tag pair and should be
  followed when the tag store is authored, rather than inventing a parallel shape. (Written as
  prose here, not as a live example: a wiki-link in this record would have to resolve, and the
  KosmOS pole slugs are not Mysterium paths.)

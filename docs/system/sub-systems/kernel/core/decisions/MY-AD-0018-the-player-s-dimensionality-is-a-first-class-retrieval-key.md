---
ID: MY-AD-0018
Title: "The player's dimensionality is a first-class retrieval key"
Status: Active
Date: 2026-09-20
Organ: kernel
Source: "docs/foundations/45-personalization-and-context-pooling.md section 3"
Description: "The generation pipeline carried only a developmental description of the player (VeilFilteredSignificator, 22 section 4.2) and no account of who this person is. The user-dimensionality vector is added as the retrieval key for content pooling: consent-first and purpose-bound, with aversion fail-closed and veto power over the priority formula, readable and exportable by the player; personalization shapes how catalyst is delivered and never which development is served."
Consumer: "`src/core/personalization/udv.ts` + `src/core/personalization/envelopeRuntime.ts` (the live UDV path)"
Related: ["MY-AD-0008", "MY-AD-0019", "MY-AD-0011", "MY-RG-0017"]
---

<!-- Discharged 2026-09-21: the UDV + context pooling exist at src/core/personalization/ (udv.ts, pooling.ts, scenarioContext.ts, envelopeRuntime.ts — the live path) per 45; locked by tests/personalization/PlanImplement.test.ts and tests/orchestration/FeedBridge.test.ts (recon 06828d7aaa) -->
## Decision

The player's **dimensionality** — preference, interest graph, purpose and vision, analogical
vocabulary, aversions, life constraints — is a **first-class retrieval key**, held as the
user-dimensionality vector and used to pool world content. It is added *beside* the developmental
description (`VeilFilteredSignificator`, 22 §4.2), never in place of it.

## Three rules

1. **Consent-first, purpose-bound.** Identity-derived fields are reachable only through the existing
   purpose-bound projector (`16 §2.1`). The pooling step requests *purpose-scoped projections*; no
   field may be created in the UDV from observation — observed signals re-weight ranking, they do not
   become fields of record.
2. **Aversion is fail-closed.** A stated "not this" suppresses a candidate unconditionally. It is the
   one UDV field with veto power over the priority formula (`24`): relevance never overrides it.
3. **The UDV is readable, editable and exportable by the player.** Personalization a player cannot
   inspect is indistinguishable from manipulation, so legibility is structural, not a courtesy.

## The line personalization may not cross

The developmental agenda outranks the preference agenda.

| May | May not |
|---|---|
| Choose the scenario that carries a required catalytic purpose | Replace the catalytic purpose with one the player prefers |
| Express a concept in the player's own vocabulary | Rewrite the concept to fit that vocabulary |
| Tune tone, stakes, aesthetic, pacing | Tune difficulty away from the growth edge (`16 §6.4`) |
| Prioritize among equivalent candidates | Suppress a candidate the developmental state requires (except by aversion) |

The standing counterweight to the comfort trap is `16 §6.4`'s growth-edge bias, with `09 §3.2`'s
boredom backstop for plateau. This decision adds no third mechanism.

## Consequences

- Personalization enters selection exactly as every other bias does (`MY-AD-0008`): a multiplicative
  bias on the eight criteria, never a hard filter and never a parallel queue.
- Measurement stays blind to it: the more metric-bearing a sub-agent's mandate, the less of the UDV
  it receives (45 §6.1). Relevance is a rendering concern, and it must not leak into grading (`42 §1.1`).
- Field and envelope shapes are specified in 45 §3 and §6.

## References

- `docs/foundations/45-personalization-and-context-pooling.md` §3, §4, §6
- `docs/foundations/16-significator-architecture.md` §2.1, §6.4
- `MY-AD-0008` (alignment biases selection), `MY-AD-0009` (two-fold world memory), `MY-RG-0017`

<!-- 2026-09-20: DG19: declare where this law is consumed, or the pending key that will consume it (recon 2b4849c6b7) -->

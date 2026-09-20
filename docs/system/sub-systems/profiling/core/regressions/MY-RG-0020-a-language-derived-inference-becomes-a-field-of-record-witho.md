---
ID: MY-RG-0020
Title: "A language-derived inference becomes a field of record without a tier, a data class, or consent"
Status: Active
Date: 2026-09-20
Organ: profiling
Severity: High
Source: "docs/foundations/47-preference-inference-and-scaffolding.md sections 3, 8, 9"
Description: "Language is the richest preference signal available and the easiest place for a covert profile to form: markers extracted from journal text, free choices and dialogue accrete field by field until the profile holds things the player never said and never agreed to. MY-RG-0018 already requires a stored field to declare a data class; this guard adds that a language-derived field must also carry its evidence tier, its provenance and a consent reference, that a tier-3 reading is never persisted, and that an LLM-proposed evidence observation may only be committed by the deterministic counter."
Related: ["MY-AD-0022", "MY-AD-0020", "MY-RG-0017", "MY-RG-0018"]
---

## The regression

A preference profile is built one field at a time, by people acting reasonably. Someone notices that
journal text carries signal, so markers are extracted. Someone notices that the extracted marks are
useful, so they are stored — for caching, or for a dashboard, or so the next session can use them
without re-deriving. Nothing in that sequence is malicious, and the end state is a **profile holding
things the player never said and never agreed to**, assembled from their private reflection.

The failure is not the reading. The reading is the feature. The failure is that **inference and record
are conflated**: a derived value and a declared field become the same kind of thing in the same store,
and after that no one can tell which facts about a person they actually stated.

`45 §3.1` rule 1 forbids the end state. This guard is the mechanism, and the mechanism is a **tier**.

## Prevention

1. **A language-derived field must declare `{tier, provenance, dataClass, consentRef}`.** `MY-RG-0018`
   requires the data class; a preference field additionally carries its tier, where the reading came
   from, and the consent under which it is held. A field that cannot name all four is not written.
2. **T3 is never persisted, by schema.** The store has no slot for a tier-3 reading (`47 §9` check 2).
   A distinction with no empirical support may shape the surface of the current encounter and is
   discarded with the session. This is what makes accumulation impossible rather than discouraged.
3. **T2 is a weight, never a field.** Ranking may adapt; the profile may not gain a statement about who
   the person is.
4. **A T1 field requires a passing `12 §5.4` RV result** for its instrument. No new protocol; the
   existing rubric-validation gate is the one that governs.
5. **Deterministic commit.** An LLM may *propose* an evidence observation; only the deterministic
   counter commits it (`MY-AD-0001`'s kernel discipline, `43 §5.3`). An LLM-written profile is
   unauditable by construction.
6. **Observed signals create weights, never fields of record** — `45 §3.1` rule 1, operationalised by
   the tier so that it is checkable rather than aspirational.
7. **Declining is not evidence.** A refused probe, a skipped reflection and a deleted field yield no
   reading, and non-participation must not become a data point. Treating refusal as signal is this
   regression in miniature.

## The structural guarantee

`47 §2` rule 2 denies the whole influence-technique set, and `47 §9` check 6 makes the denial
structural rather than intentional: **the inference module has no write path to player state other
than the UDV field set, and the UDV cannot hold a state value.** A pure reader over text, writing only
tiered fields, cannot implement state induction or anchoring — not because it was told not to, but
because there is nowhere for it to write.

## References

- `docs/foundations/47-preference-inference-and-scaffolding.md` §2, §3, §3.1, §8, §9
- `docs/foundations/45-personalization-and-context-pooling.md` §3.1, §8 (the consent-erosion failure)
- `docs/foundations/12-drive-assessment-mechanics.md` §5.4
- `MY-AD-0001`, `MY-AD-0020`, `MY-AD-0022`, `MY-RG-0017`, `MY-RG-0018`

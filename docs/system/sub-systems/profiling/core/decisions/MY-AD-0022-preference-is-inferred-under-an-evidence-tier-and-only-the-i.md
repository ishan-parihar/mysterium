---
ID: MY-AD-0022
Title: "Preference is inferred under an evidence tier, and only the instrumented tier becomes a field of record"
Status: Active
Date: 2026-09-20
Organ: profiling
Source: "docs/foundations/47-preference-inference-and-scaffolding.md sections 3, 5, 8"
Description: "45 section 3.1 rule 1 forbids creating fields of record from observation but leaves the line unauditable, and 45 section 10 names that as an open question. The line is now the evidence tier: tier 1 (a validated instrument or an empirically robust construct with a game-measurable expression) may become a consent-bound field of record with a declared data class; tier 2 (an established construct with no validated instrument here) may bias ranking and select a scaffold but may not be a field of record and may not be surfaced as a fact about the player; tier 3 (meta-program distinctions with no empirical support) may shape the surface of one encounter and is never persisted. Every stored field carries tier, provenance, data class and consent reference; a scaffold archetype is a prior with an expiry, never a stored identity label."
Related: ["MY-AD-0018", "MY-AD-0020", "MY-AD-0012", "MY-RG-0018", "MY-RG-0020", "MY-RG-0021"]
Consumer: "`src/infra/profiles/evidenceLedger.ts`, `src/core/world/scaffolds/ScaffoldLibrary.ts`"
---

## Decision

Preference inference from language is governed by an **evidence tier**, and the tier is a property of
the **distinction**, not of the inference method:

| Tier | Definition | May become | May be shown to the player |
|---|---|---|---|
| **T1 — instrumented** | a validated instrument exists, or an empirically robust construct has a game-measurable expression | a **consent-bound field of record** with a declared data class | yes, as an instrument result, through the player's own register of the articulation ladder |
| **T2 — correlational** | an established construct with no validated instrument in this system | a **ranking weight and a scaffold input** — never a field of record | **no** |
| **T3 — descriptive** | a distinction with no empirical support behind it | **nothing persisted** — derived at prompt-assembly time and discarded with the session | no |

## The question this closes

`45 §3.1` rule 1 already forbade the dangerous case — *"no field may be inferred into the UDV from
behaviour if it was not declared and consented"* — and `45 §10` then named the consequence honestly:
*"Where exactly is the line, and is it auditable?"*

**The line is the tier.** That is what makes it auditable rather than a matter of implementation
confidence: a distinction either has a validated analogue in the literature or it does not, and that
fact does not change with how confidently a system reads the text. An implementation may not promote a
T3 reading to a field by accumulating more T3 evidence.

## Why a tier rather than a capability list

Three failures are prevented by the tier alone:

1. **Covert profiling.** A dossier of things the player never said requires a store to accumulate in.
   T3 has none, by schema (`MY-RG-0020`).
2. **Type-casting.** T2 may steer the practice while being barred from describing the person, so a
   correlational reading cannot become a statement about who they are (`MY-RG-0021`).
3. **Laundering through implementation.** A tier is changed by record, never by an implementation —
   so a plausible-looking detector cannot upgrade what it is allowed to write.

## Trait and state are separate evidence classes

The same linguistic material yields both. Meta-Model markers (deletions, nominalisations, universal
quantifiers, cause-effect constructions, heavy modal constriction) are read as **state**, and state
readings go to `04`'s accessibility model — never to a preference field and never to a developmental
field. `04 §3.1` already rules that state is accessibility, not progression; this is the same rule at
the preference layer. **A hard week must not become a trait.**

## Fields, provenances and the cold-start ladder

Every stored field declares `{tier, provenance, dataClass, consentRef}` (`MY-RG-0018` requires the data
class; this decision adds tier, provenance and consent). Three provenances carry different write
rights:

| Provenance | Source | May write |
|---|---|---|
| **declared** | onboarding self-report, explicit edits | any tier — and it is the only route by which a T2 reading may be *shown* to the player as their own statement |
| **probed** | the in-world probe set (`47 §7`), a playable encounter, never a questionnaire | T1 only, and only with a passing `12 §5.4` RV result |
| **observed** | behaviour — replays, revisits, free choice, journal text | **ranking weights only**; never a field of record |

**Declining is not evidence.** A refused probe, a skipped reflection or a deleted field yields no
reading, and the refusal must not itself become a data point.

## Archetype priors

Population-level clustering is permitted for exactly two purposes — **cold-start scaffold selection**
and **cohort formation** (`38`) — and only where the clustering axes are the T1 set. An archetype is a
**prior with an expiry**: never stored in an identity field, never surfaced to the player, and
superseded the moment individual evidence accumulates (`MY-AD-0012`: competence and identity never
mix, and a typology is identity by another route).

## References

- `docs/foundations/47-preference-inference-and-scaffolding.md` §2, §3, §3.1, §5, §8, §9
- `docs/foundations/45-personalization-and-context-pooling.md` §3, §3.1, §6.1, §10
- `docs/foundations/12-drive-assessment-mechanics.md` §5.4 (RV1–RV7 — the validation protocol a T1 probe must pass)
- `docs/foundations/04-states-of-consciousness.md` §3.1
- `MY-AD-0012`, `MY-AD-0018`, `MY-AD-0020`, `MY-RG-0018`, `MY-RG-0020`, `MY-RG-0021`

<!-- 2026-09-20: DG19: declare where this law is consumed, or the pending key that will consume it (recon 2b4849c6b7) -->

<!-- 2026-09-21: Deferral discharged 2026-09-21: the evidence ledger + tier gate exist at src/infra/profiles/evidenceLedger.ts and the scaffold library at src/core/world/scaffolds/ (PROFILE-INFERENCE key removed from _org.yaml pending ledger) (recon recon_id: 581aa7756a) -->

<!-- 2026-09-21: Consumer declared: the tier gate and scaffold library implement this law (PROFILE-INFERENCE, 2026-09-21) (recon recon_id: 55e586e23c) -->

<!-- 2026-09-21: Consumer paths backticked so DG19 resolves them as code paths (recon recon_id: 23814c0886) -->

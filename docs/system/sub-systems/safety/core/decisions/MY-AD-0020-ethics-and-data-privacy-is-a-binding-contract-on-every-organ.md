---
ID: MY-AD-0020
Title: "Ethics and data privacy is a binding contract on every organ"
Status: Active
Date: 2026-09-20
Organ: safety
Source: "docs/system/sub-systems/safety/ethics-and-data-privacy.md"
Description: "The project could measure a person's developmental interior without a written boundary on what that measurement may be used for; four live documents cited this contract and it did not exist. Every stored field now belongs to exactly one of four classes (inherent play state, developmental inference, identity context, consent record) determining retention and readers; C3 outlives C1 and C2; aggregation destroys identity or does not exist; no class may be created from inference; C1 and C2 are reachable only through a registered purpose-bound projection; and no role grants access - auditors reach data by consent and projection, never by privilege."
Related: ["MY-AD-0011", "MY-AD-0018", "MY-RG-0017", "MY-RG-0018"]
Consumer: "`docs/system/sub-systems/safety/ethics-and-data-privacy.md`, `src/core/safety/crisis.ts`"
---

## Decision

Ethics and data privacy is a **binding contract on every organ**, not a policy appendix. Four live
documents cited it (`foundations/09 §2.4`, `lines/02-emotional`, `lines/08-interpersonal`,
`foundations/45 §3.1`) and it did not exist — so a project that measures a person's developmental
interior was proceeding without a written boundary on what that measurement may be used for.

**The premise.** Mysterium holds clinically-relevant inferences about a person's cognition, affect,
somatic regulation, moral reasoning and self-relation. That is a strong claim on trust, defensible
under one condition: **the player is the first and primary beneficiary of everything inferred, and
can see all of it.**

## The four data classes

Every stored field belongs to exactly one class, and the class determines retention and readers:
**C0** inherent play state · **C1** developmental inference · **C2** identity and purpose context ·
**C3** consent and audit record. Three hard rules follow:

1. **C3 outlives C1 and C2.** Revoking consent destroys the data, never the record that it *was*
   consented and then revoked. A consent system that cannot prove consent is not a consent system.
2. **Aggregation destroys identity or it does not exist.** Cohort, institutional and population
   reports are computed on a set large enough that no individual is reconstructable, and carry their
   `n`. `n < 5` is not reportable.
3. **No class may be created from inference.** A field of record exists because the player declared
   it or an engine is contractually entitled to compute it — never because a model inferred it and
   wrote it back (`45 §3.1` rule 1).

## The projection firewall, and no privilege tiers

C1 and C2 are reachable by no code path except a **registered, purpose-bound projection** (`16 §2.4`).
Eight projections are named in the contract, each with a stated purpose and an explicit *may not
include*. **Auditors reach data by consent and projection, never by role** — there is no
"admin sees everything" path, and a human intervenor uses the same surfaces as the player with the
same audit trail (`MY-AD-0011`).

## Consent, engagement and crisis

- **No implied consent.** Nothing is opt-out; every C2 field defaults to *absent*, and the platform
  must function — less personally, but fully correctly — with C2 entirely empty.
- **Revocation is immediate and total**: the field is destroyed, the projection stops, and pending
  generations that depended on it are re-pooled.
- **Minors** require guardian consent *plus* the minor's own assent; C1 is never disclosed to a
  guardian except through a guardian-consented projection, never as raw data.
- **The engagement vetoes** are executable, not aspirational, and efficacy is not a defence; they are
  implemented in `45 §7` and guarded by `MY-RG-0017`.
- **The platform is not a clinician.** Escalation routes to human help and does not absorb the moment
  into gameplay (`43 §4.7`).

## References

- `docs/system/sub-systems/safety/ethics-and-data-privacy.md` §2, §3, §4, §5
- `docs/foundations/16-significator-architecture.md` §2.1, §2.4, §10.4
- `docs/foundations/45-personalization-and-context-pooling.md` §3.1, §7
- `MY-AD-0011` (human intervention is integrated), `MY-AD-0018`, `MY-RG-0017`, `MY-RG-0018`

<!-- 2026-09-20: DG19: declare where this law is consumed, or the pending key that will consume it (recon 2b4849c6b7) -->

<!-- 2026-09-21: Deferral discharged 2026-09-21: consent re-check at every render (AL5) and register-class access are implemented in src/core/domain/articulationLadder.ts; no separate deferral remains — the ethics contract's access rules are enforced by that render path (recon recon_id: a2e49a8aef) -->

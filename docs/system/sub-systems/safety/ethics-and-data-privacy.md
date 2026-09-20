# Ethics & Data Privacy

> **Organ:** `safety` · **Contract level:** binding on every organ
> **Lateral:** what Mysterium may know about a player, who may see it, how engagement may be
> produced, and what is forbidden regardless of efficacy.
> **Owns:** the data-class taxonomy, the consent lifecycle, the identity/projection firewall, the
> minor-guardian rules, the crisis-escalation contract, and the **engagement vetoes** that
> `45 §7` implements and `MY-RG-0017` guards.
> **Does not own:** the consent *mechanics* of the profile's identity context (`foundations/16 §2.1`),
> the articulation ladder and auditor projections (`16 §2.4`, `foundations/33 §7`), the crisis-response
> runtime (`src/core/safety/crisis.ts`), the pooled personalization mechanism
> (`foundations/45`), credentialing and RPL disclosure (`foundations/41`).
> **Cross-references:** `16`, `33`, `41`, `43 §4.7`, `45`, `DEVELOPMENT-PLAN`.

---

## 1. Why this document exists

This contract is cited by `foundations/09 §2.4`, `lines/02-emotional`, `lines/08-interpersonal`, and
`foundations/45 §3.1` — and did not exist. Its absence is the reason a project that measures a
person's developmental interior could proceed without a written boundary on what that measurement
may be used for. Written 2026-09-20 to close the gap; ratified as `MY-AD-0020`.

**The premise.** Mysterium holds clinically-relevant inferences about a person's cognition, affect,
somatic regulation, moral reasoning, and self-relation. That is a strong claim on a person's trust,
and it is only defensible under one condition: **the player is the first and primary beneficiary of
everything inferred, and can see all of it.**

---

## 2. Data classes

Every field the platform stores belongs to exactly one class. The class determines who may read it
and for how long it lives. Classes are declared in the persistence layer's schema and enforced by
`MY-RG-0018`.

| Class | Contains | Retention | Who may read |
|---|---|---|---|
| **C0 — Inherent play state** | encounter outcomes, timing, modality performance, world state | session + rolling window | the player; the assessment engine |
| **C1 — Developmental inference** | line heights, stage center of gravity, CCI, shadow/drive signals, transformation proximity | until revoked (the Significator, `16 §2`) | the player; the assessment engine; **never** an LLM as an assertion (`20`) |
| **C2 — Identity & purpose context** | stated aims, interests, values, fluent domains, aversions, life constraints | until revoked, field-by-field | the player; purpose-scoped projections only (`16 §2.1`) |
| **C3 — Consent & audit record** | what was consented, when, by whom, what projection was granted | immutable, survives revocation (append-only) | the player; auditors of the consent record itself |

### 2.1 The three hard rules

1. **C3 outlives C2 and C1.** Revoking consent destroys the data, never the record that it *was*
   consented and then revoked. A consent system that cannot prove consent is not a consent system.
2. **Aggregation destroys identity or it does not exist.** Any report at cohort altitude (`38`),
   institutional altitude (`41`), or population level must be computed on a set large enough that no
   individual is reconstructable, and must be reported with its `n`. `n < 5` is not reportable.
3. **No class may be created from inference.** A field of record exists because the player declared
   it or because an engine is contractually entitled to compute it — never because a model inferred
   it and wrote it back (`45 §3.1` rule 1). Observed signals may *weight* ranking; they may not
   *become* a stored attribute.

---

## 3. The identity/projection firewall

C1 and C2 are reachable by no code path except a **registered projection**. A projection is a
declared, purpose-bound view with a named scope, and it is the only mechanism by which developmental
or identity data leaves the engines that own it (`16 §2.4`).

| Registered projection | Purpose | May not include |
|---|---|---|
| `gameplay-personalization` | pooling the three libraries (`45 §5`) | raw identity, CCI numbers, stage labels |
| `learning-support` | curriculum pacing (`30`, `34`) | identity fields, purpose statements |
| `assessment-evidence` | levelling evidence (`42`) | interest graph, purpose, analogy internals (`45 §6.1`) |
| `learner-dashboard` | the player's own mirror (`33 §1–§5`) | other players' data |
| `guardian-mirror` | consented guardians (`16 §10.4`, `33 §7`) | any projection not separately consented |
| `educator-desk` | consented educators, cohort scope | individual-level identity data without individual consent |
| `therapeutic-pane` | consented clinicians (`33 §7`) | anything outside the declared care purpose |
| `research-aggregate` | efficacy measurement (`40`) | any record-level data; reconstruction-unsafe sets |

**No privilege tiers.** Auditors reach data by consent and projection — never by role. There is no
"admin sees everything" path, and `43 §4.7`'s integration requirement means a human intervenor uses
the same surfaces as the player, with the same audit trail.

---

## 4. Consent lifecycle

```
DECLARE ──► GRANT ──► USE ──► REVIEW ──► REVOKE
   │          │        │        │          │
 (explicit,  (scoped, (recorded (legible,  (data destroyed,
  no default)  revocable) in C3)  periodic)  C3 retained)
```

- **No implied consent.** Nothing is opt-out. The default state of every C2 field is *absent*, and
  the platform must function — less personally, but fully correctly — with the entire C2 class empty.
- **Revocation is immediate and total.** On revocation the field is destroyed, the projection stops,
  and pending generations that depended on it are re-pooled. Revival requires a fresh grant.
- **Consent is per purpose, not per dataset.** Granting `gameplay-personalization` never grants
  `learning-support`, even for the same field.
- **Minors.** Below the age of majority in the relevant jurisdiction, C2 requires guardian consent
  *plus* the minor's own assent, and C1 is never disclosed to a guardian except through a
  guardian-consented projection, never as raw data. `41`'s credentialing output discloses attainment
  only, never developmental inference.

---

## 5. The engagement vetoes

Mysterium's design goal is **sustained voluntary return** (`45 §7`). The following are prohibited
without exception, because they work — efficacy is not a defence:

- variable-ratio reward on any developmental outcome (`09 §2.4`);
- loss aversion, streak decay framing, or progress-threatening timers;
- artificial scarcity, FOMO windows, or expiring content;
- dark-pattern notifications, guilt framing, or NPCs scripted to suffer absence;
- engagement or session length as an optimisation target (`09 §4`);
- personalization used to retain a player away from the development they asked for;
- any mechanism using C1 or C2 knowledge the player could not themselves read.

### 5.1 The two tests

Every retention mechanism must pass both, and be recorded in the engagement register:

1. **Endorsement** — shown a plain description of the mechanism and its effect, would the player
   endorse it?
2. **Reversal** — would the design survive the sentence *"This contemplative practice is designed to
   keep you here by …"* read aloud to a clinician, a regulator, or the player's own family?

Failure class: `MY-RG-0017`.

---

## 6. Crisis and human intervention

- **The platform is not a clinician.** Assessment output is never presented to the player or any
  auditor as diagnosis, and no surface may imply treatment (this is the standing position of
  `foundations/42 §1.1` and `41 §0`).
- **Escalation is a real path, not a diverting one.** When crisis signals fire
  (`src/core/safety/crisis.ts`), the platform routes to human help — it does not absorb the moment
  into gameplay. Escalation contacts, localized patterns, and live handoff are `43 §4.7`'s flows.
- **Validation, not conversion.** An intervenor may not use C1/C2 data to argue a player toward a
  developmental position; the authority is the player's own stated purpose (`39`).
- **No covert profiling.** No surreptitious keyboard, camera, or biometric inference beyond the
  explicitly-consented and separately-disclosed channels.

---

## 7. Security and locality

- **Local-first by default.** C1 and C2 live on the player's device unless and until they choose
  cloud sync; the game must be playable offline with full developmental fidelity.
- **Export and erasure are first-class operations**, available to the player at any time, covering
  all classes including C3's record (as a report, not a deletion — C3 is append-only by §2.1 rule 1).
- **Encryption** at rest for C1–C3; C2 fields individually encrypted. Keys are player-held where the
  platform's architecture permits.
- **No third-party analytics on developmental surfaces.** Vendor analytics may see C0 only.

---

## 8. Failure modes

| Failure | Countermeasure |
|---|---|
| Consent theatre — a wall of text nobody reads | per-purpose grants with plain-language effect statements; the game must *demonstrate* its reduced personalization when C2 is empty |
| Projection sprawl — new projections ratified casually | every projection declares purpose + scope in `16 §2.4`; adding one is a recorded decision |
| Dark-pattern accretion — one plausible step at a time | §5 vetoes + §5.1 tests as a standing gate; `MY-RG-0017` |
| De-anonymised aggregate | §2.1 rule 2, with an enforced `n` floor at report time |
| Inference write-back | §2.1 rule 3 + `45 §3.1` rule 1 |
| Guardian over-reach | §4 minors clause; `33 §7`'s projection render contract |

---

## 9. Open questions

- **Jurisdictional variance.** Consent age, erasure rights, and clinical-device definitions differ by
  jurisdiction. Which regime does the reference implementation target, and is localisation of this
  contract a per-locale deliverable?
- **The `n` floor.** Is 5 the right threshold for a cohort this small, or does re-identification risk
  require per-dimension floors?
- **Crisis precision.** What sensitivity/specificity must the crisis detector reach before any
  escalation path is shipped, and who signs that off?
- **Auditor accountability.** §3's "no privilege tiers" is clean architecturally; it needs an audit
  log proving that a projector never exceeded its declared scope (`43`'s log protocol is the host).

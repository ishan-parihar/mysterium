# 41 — Global Recognition & Credentialing Architecture (EU-First)

> **Status:** canonical-hypothesis (architecture; contains a **canon revision** — see §0).
> **Lateral:** the external-legitimacy layer — how demonstrated in-game competence
> becomes *recognizable, portable, legally-compliant* credentialing, EU-first. This
> document owns: the legal/data-protection substrate, the competency-evidence model,
> the credential ledger, the EU recognition pathway, and the partner strategy. It does
> NOT own measurement instruments (40 — it consumes their reliability metadata),
> school-domain content (37 — it consumes standards tags), or practice evidence (39 —
> it consumes consented summaries).

## 0. Canon revision (recorded per the update protocol)

`MVP-BLUEPRINT.md` canon decision #2 excluded regulated certification from scope. The
user's direction explicitly reopens this: schooling inclusion is in-plan, and global —
specifically EU-forward — recognition is a goal. **Revision:** certification/credentialing
is now an architectural layer (this document), built *on top of* the developmental core,
with the standing constraint that credentialing may never reshape the game's assessment
psychology (the tail stops wagging the dog: see §4.4's firewall).The blueprint (archived at `docs/archive/old-plans/MVP-BLUEPRINT.md`) is not edited
post-archival; this section is the canonical record of the revision, and `docs/INDEX.md`
carries the reading-order pointer.

## 1. Purpose

Continuous, embedded, Veil-compliant assessment produces something exams cannot: dense,
longitudinal, ecologically-valid evidence of actual capability. That evidence is
currently invisible to the world's recognition systems — employers, universities,
ministries. This document specifies the bridge: a **claim-based credential ledger** that
converts engine/mastery/measurement evidence into verifiable, portable credential
claims, aligned first to the EU's qualification architecture (micro-credentials → ECTS →
EQF → Europass → national frameworks), with honest staging of what self-issued claims
can achieve versus what requires partner institutions.

## 2. Scientific / regulatory basis

### 2.1 The legal substrate is load-bearing (GDPR first, not last)

Developmental data here is about as sensitive as data gets — theta vectors, shadow
ledgers, journals (39). Under GDPR:

- **Special-category data (Art. 9):** anything inferable as health/mental-health data
  requires explicit consent conditions; journals and shadow ledgers are treated as
  special-category by default policy even where the classification is arguable.
- **Profiling (Art. 22):** automated developmental profiling that feeds credential
  decisions with legal/significant effect triggers Art. 22 safeguards: explicit
  consent, human-review path on request, meaningful information about the logic. The
  architecture answer is §4.3's human-review gate — credential claims are *derived and
  reviewed*, never auto-issued for high-stakes uses.
- **Data minimization + local-first advantage:** the existing architecture (07: local
  Significator storage, server-as-coordinator per 38 §4.3) is a massive compliance
  asset. The rule formalized: **raw developmental state never leaves the client**;
  only consented, derived, minimized claims do.
- **DPIA:** a Data Protection Impact Assessment is mandatory before any EU-facing
  credential feature ships; this document is its architectural input.
- **Minors:** GDPR-K / member-state age limits shape the K-12 mode (37): supervised
  pods (38 §4.5), guardian-consented credentialing, existence-not-content visibility
  (39 §6.4).

### 2.2 The qualification architecture being joined (EU)

- **Council Recommendation on micro-credentials (2022):** the EU's official vehicle for
  short, portable credential recognition. Defines required metadata: learning
  outcomes, ECTS/hours, level, assessment method, quality assurance. Mysterium claims
  must carry exactly this metadata to be legible (§4.1).
- **EQF (European Qualifications Framework), levels 1–8** defined by knowledge /
  skills / autonomy-responsibility complexity — **not** by AQAL stage. The honest
  mapping is via *demonstrated competency complexity* per domain (35's complexity
  tiers), never "stage 6 = EQF 6" (a category error; see §4.2).
- **ECTS** for the academic spine (37 K1 domains): credit-bearing recognition runs
  through partner institutions (§4.5) — ECTS is awarded by accredited bodies, not by
  platforms.
- **Europass / European Digital Credentials (EDC):** the serialization targets for
  portability; EDC already specifies verifiable-credential-shaped emission.
- **ENIC-NARIC** networks for cross-border advisory recognition; **UNESCO Global
  Convention (2019)** as the long-horizon international recognition frame.
- **Quality assurance:** ISO 21001 (educational organizations management systems) is
  the achievable organizational-standard first step; full program accreditation via
  EQAR-registered agencies is the multi-year endgame, entered only after the RPL
  partner route has produced real outcomes (§4.5).

## 3. Game-design mapping

### 3.1 What is credentialed (and what never is)

| Evidence stream | Source | Enters claims as |
|---|---|---|
| Curriculum mastery artifacts | 34 bridge / 30 holarchy (37 domains) | mastery claims per competency descriptor |
| Explicit competency measurement | 40 packs — only if reliability gate passed | skill claims with reliability + method metadata |
| Real-world practice summaries | 39 reflections — **consented, summarized, never raw text** | practice-attested evidence |
| Sustained engagement integrity | checkpoint/consistency machinery | (optional attestation field) |

**Never credentialed, ever:** shadow ledgers, theta vectors, CCI internals, drive
weights, journal text. The developmental ledger (private, Veil) and the credential
ledger (consented claims) are *separate stores with a one-way, consent-gated derivation
boundary*. A claim cites evidence *references*, not evidence *contents*.

### 3.2 The assessment-form advantage (positioning)

Credentialing here is *continuous evidence aggregation*, not one-shot examination:
proctored high-stakes exams are replaced (where partners accept it) by longitudinal
mastery trajectories + measurement-pack reliability metadata + practice attestation.
This is a genuine differentiator versus exam-industry capture, and it is also the
hardest sell to conservative institutions — which is why §4.5's route starts with
recognition-of-prior-learning (RPL), where institutions already accept portfolio-style
evidence.

## 4. Architectural contract

### 4.1 The claim model

```ts
interface CredentialClaim {
  readonly id: string;
  readonly subject: string;                    // player pseudonym or legal name — player's choice per claim
  readonly competencyDescriptor: string;       // canonical outcome statement
  readonly domain: string;                     // 37 domain tree id
  readonly standardsTags?: readonly string[];  // 37 §4.3 (e.g. EQF-referenced outcomes)
  readonly level?: { eqf?: 1|2|3|4|5|6|7|8; ects?: number };
  readonly evidence: readonly EvidenceRef[];   // { type: 'mastery'|'pack'|'practice'|'attestation', ref, reliability? }
  readonly method: string;                     // assessment method statement (micro-credential metadata)
  readonly qualityAssurance: string;           // QA statement (micro-credential metadata)
  readonly issuedAtMs: number;
  readonly serialization?: 'edc-vc' | 'w3c-vc' | 'europass';   // §4.4
}
```

### 4.2 EQF mapping rule (the category-error firewall)

EQF levels attach to **demonstrated competency complexity within a domain** (autonomy,
knowledge breadth, integration across concepts) — proxied by 35's complexity tiers and
by mastery depth (31). They never attach to consciousness stages. A person at
any developmental stage can earn an EQF-5 mathematics claim; developmental state and
competency claims are orthogonal and the ledger enforces it structurally (claims carry
domain evidence only; stage data is unreachable from the credential layer).

### 4.3 Issue flow (human-in-the-loop where it matters)

```
evidence accrues (37/39/40 machinery)
  → derivation engine drafts claims (metadata-complete, micro-credential-shaped)
  → player reviews: consent per claim, subject naming, serialization target
  → [high-stakes use only] independent human review sign-off (Art. 22 path)
  → claim signed (self-issued VC immediately; partner countersignature when §4.5 route applies)
  → portability export (Europass/EDC/W3C-VC JSON)
```

Revocation/expiration: claims carry refresh requirements where competency decays
(40's freshness); staleness is disclosed, not hidden — a 2019 Python claim presented
in 2026 shows its evidence window.

### 4.4 The firewall (credentialing may not reshape the game)

No scheduler, module, or assessment mechanic may branch on credential state. No
encounter may be easier to pass because a credential depends on it (that would be the
exact corruption the obedience pipeline represents). Enforced by layer separation:
`src/core/credential/` (proposed) depends on evidence *read models* only, and the
validation kernel gains a gate asserting engine behavior is identical with and without
credential state present.

### 4.5 Partner strategy (recognition requires institutions)

Self-issued verifiable credentials are portable but carry no institutional weight.
The staged route:

1. **Self-issued claims** (immediate): W3C-VC-shaped, honest metadata, zero legal weight, full portability.
2. **Micro-credential alignment** (+1–2 quarters): publish learning-outcome mappings per 37 domain; complete DPIA; ISO 21001 readiness.
3. **RPL / credit-recognition pilot** (+2–4 quarters): partner with an accredited EU institution (university continuing-education arm or adult-education provider) that assesses Mysterium evidence portfolios and awards its own ECTS/micro-credentials — the platform provides evidence, the institution awards. This is the *realistic* first legally-recognized step.
4. **National NQF ingestion** (+1–2 yrs): map claims to member-state frameworks (e.g., DE DQR, NL NLQF, FR France Compétences) via the partner's accreditation; Europass/EDC emission for portability; ENIC-NARIC advisory engagement.
5. **Program accreditation (long-horizon):** pursue full accreditation through an EQAR-registered agency only after step 3–4 have produced multi-cohort outcomes. Enter with humility: innovative continuous-assessment providers have succeeded here, but on multi-year timelines with substantial QA documentation.

Non-EU (brief, later): US (ACE credit-recommendation route / NCCRS), UK (RPL via
Ofqual-recognized awarding bodies), UNESCO Global Convention for cross-border framing.

## 5. Phases

| Phase | Contents | Gate |
|---|---|---|
| **C0** | Claim model + local ledger + self-issued VC export; firewall + validation gate | engine behavior identical with/without credential state (kernel gate) |
| **C1** | Micro-credential metadata completeness; DPIA drafted; ISO 21001 readiness doc | DPIA signed off by counsel before any EU-facing feature |
| **C2** | RPL partner pilot (one institution, one domain — likely `cs` or `math`) | first partner-awarded credential from Mysterium evidence |
| **C3** | NQF mappings + Europass/EDC portability; second/third partners; cohort outcome reporting (40 MP3 data) | claims recognized in ≥ 2 member-state frameworks |
| **C4** | Accreditation-track engagement (EQAR-registered agency) | only after C2/C3 outcomes exist |

## 6. Open questions

1. Which partner institution first — university continuing-ed, adult-education
   (Volkshochschule-type), or a quality-driven online provider with accreditation?
2. Operating-entity jurisdiction (who is the GDPR controller) — EU entity required
   for the C2+ era?
3. Proctoring tension: some partners will demand identity assurance that conflicts
   with local-first privacy; what is the minimum acceptable identity binding, and who
   holds it?
4. Does the developmental core ever *market* credentials (growth funnel), or does the
   credential layer stay a silent opt-in wing? (Tentative: silent — funnel pressure
   would bend assessment psychology, §4.4.)
5. Pseudonymity vs. named credentials: can a claim be issued pseudonymously and later
   de-anonymized only by the holder's key?

## 7. Principles served

- **Uniqueness:** owns external recognition/legal substrate; consumes 37/39/40
  evidence via read models only.
- **Veil (20):** the developmental ledger stays private and unmeasured-feeling;
  credentialing is a separate, consented derivation — the game never becomes a test
  to the player, even when its evidence becomes a credential to the world.
- **The firewall (§4.4):** recognition pressure can never reshape assessment
  psychology — the anti-obedience-pipeline guarantee, structurally enforced.
- **Autonomy:** per-claim consent, subject-naming choice, human review path.
- **Grounding principle (§4.1 of the process doc):** this layer is grounded in the
  same R&D spine as everything else — evidence claims cite the concept-draft/curriculum
  machinery, not marketing.

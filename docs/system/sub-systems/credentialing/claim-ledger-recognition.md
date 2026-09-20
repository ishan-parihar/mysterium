# Claim Ledger & Recognition

> **Organ:** `credentialing` · **Status:** Active · **Date:** 2026-09-20
> **Contract docs (canon):** [foundations/41-global-recognition-credentialing](../../../../docs/foundations/41-global-recognition-credentialing.md), [foundations/38-cohort-weave-multiplayer](../../../../docs/foundations/38-cohort-weave-multiplayer.md)

## 1. Purpose

This organ owns **the claim ledger and its recognition chain**: claims trace to instrumented evidence,
evidence traces to a measurement's reliability status, and the whole chain exports as a verifiable
credential or an assessor-shaped portfolio (`41`). It exists so that recognition is a *derived*
object — never an assertion about a person that the system cannot substantiate.

## 2. Boundaries

**Inside:** the claim ledger, the evidence chain and its teeth (E2/E3/E4), revocation, VC export, the
partner-institution RPL portfolio, and the disclosure posture (chosen name only).

**Outside, deliberately:**

- **What counts as evidence** — `profiling` and `curriculum`. Credentialing consumes ratified
  evidence; it never grades.
- **Reliability status of an instrument** — `validation` (`40`). A ceiling that has not been retired
  travels with the claim, and credentialing may not hide it.
- **Who is allowed to see a credential** — `safety`. Consent and the identity firewall precede export.

## 3. Interfaces

| Surface | Direction | Contract |
|---|---|---|
| `src/core/credential/ClaimLedger.ts` | provides | claims, evidence links, revocation |
| `exportRPLPortfolio` · `mysterium credential rpl` | provides | partner-institution export (`41 §4.5`) |
| `src/core/packs/ReliabilityCollector.ts` | consumes | the reliability status a claim must cite |
| `src/core/validation/gates.ts` | enforces | **G21** credential evidence chain |

## 4. Invariants

1. **Every claim cites evidence that resolves** — a claim with no evidence link is invalid, not
   pending (gate **G21**).
2. **Provisional travels with the claim** — an instrument whose reliability ceiling has not been
   retired carries its disclosure into the credential (`40`).
3. **Identity never appears in a credential payload** — chosen name only; consent is re-checked at
   export (`MY-AD-0020`, gate **G12**'s firewall).
4. **Export fails closed** — invalid, draft or revoked claims abort the portfolio rather than being
   silently omitted.
5. **Recognition is a derived object** — no claim may be authored directly into the ledger.

## 5. Records

```bash
python3 scripts/arch.py context src/core/credential
```

## 6. References

- `41` global recognition and credentialing · `40` measurement packs and reliability status
- `42` evidence-only levelling (the evidence a claim cites) · `MY-AD-0020` the ethics contract

> **Blocked on an external party:** the chain is complete and gated, but recognition by an institution
> requires an institution (`DEVELOPMENT-PLAN §8`).

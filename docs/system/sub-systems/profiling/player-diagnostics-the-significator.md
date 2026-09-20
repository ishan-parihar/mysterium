# Player Diagnostics & the Significator

> **Organ:** `profiling` · **Status:** Active · **Date:** 2026-09-20
> **Contract docs (canon):** [foundations/12-drive-assessment-mechanics](../../../../docs/foundations/12-drive-assessment-mechanics.md), [foundations/16-significator-architecture](../../../../docs/foundations/16-significator-architecture.md), [foundations/25-cumulative-consciousness-index](../../../../docs/foundations/25-cumulative-consciousness-index.md), [foundations/40-measurement-packs-efficacy-infra](../../../../docs/foundations/40-measurement-packs-efficacy-infra.md), [foundations/47-preference-inference-and-scaffolding](../../../../docs/foundations/47-preference-inference-and-scaffolding.md)

## 1. Purpose

This organ owns **what Mysterium knows about the player, and who may see it**: the Significator as the
single state vessel (`16`), the drive/shadow readings the instruments produce (`12`), the composite
index (`25`), the preference record and its evidence tiers (`47`), and the consented projections that
render all of it at the reader's altitude (`16 §2.4`/`§10.4`, `33 §7`).

The diagnostics framework is not a separate subsystem that the world architecture calls into — the
world architecture *is* how it is operationalized: `24` turns the readings into a catalyst target,
`46 §7` composes an entity for it, the session produces evidence, and evidence returns through `42` to
the vessel. This organ is the vessel and the reading; it never selects.

## 2. Boundaries

**Inside:** the Significator's shape and lifecycle, the distortion ledger, theta/retention state, CCI,
the interest record and the inference pipeline that fills it (`47 §8`), the evidence-tier gate, the
articulation ladder and its two registers, the auditor projections.

**Outside, deliberately:**

- **Selection** — `catalyst`. Profiling states what is true; `24` decides what happens next.
- **What may be stored** — `safety`. The data classes and the consent lifecycle are the ethics
  contract (`MY-AD-0020`); profiling consumes them and cannot widen them.
- **Render** — `presentation`. Profiling emits projections; the surface draws them.
- **Session content** — `world`. The world carries a purpose-scoped projection of this organ, never
  the record itself (`45 §6`).

## 3. Interfaces

| Surface | Direction | Contract |
|---|---|---|
| `src/core/domain/Significator.ts`, `IdentityProfile.ts` | provides | the state vessel and the identity context |
| `src/core/curriculum/LevellingEngine.ts` | consumes | evidence-only grading and staging (`42`) |
| `src/core/engines/CCIEngine.ts` | provides | the composite metric (`25`) |
| `src/core/validation/gates.ts` | enforces | **G11** levelling · **G12** identity firewall |
| `45 §3` UDV · `47 §8` inference | provides | the preference half of the retrieval key |

## 4. Invariants

1. **Evidence-only grading** — ladder movement derives only from demonstrated evidence (`MY-AD-0012`);
   the Significator is the sole state vessel (`26 §4`).
2. **The competence/identity firewall holds** — no measurement output reaches the player as
   player-visible content, and no healing-path agent receives measurement input (`42 §1.1`, gate
   **G12**).
3. **No preference becomes a fact about the player without its tier** — a field of record requires
   `{tier, provenance, dataClass, consentRef}`; a T3 reading has no schema slot (`MY-AD-0022`,
   `MY-RG-0020`, gate **G23**).
4. **A prior expires** — an archetype that lacks an expiry, or appears in an identity field, is a
   defect (`MY-RG-0021`).
5. **Inference writes nowhere but the UDV** — asserted at module-graph level (`47 §2`, gate **G25**).
6. **No privilege tiers** — the auditor register is the same derivation, not a different record
   (`MY-AD-0007`, `MY-AD-0011`).

## 5. Records

```bash
python3 scripts/arch.py context src/core/domain
```

## 6. References

- `12` instruments and rubrics (**RV1–RV7**) · `16` the Significator · `25` CCI
- `42` evidence-only levelling · `47` preference inference and the scaffold library
- `45 §6` the UDV and its per-role projection · `33 §7` the rendered auditor surfaces

> **Open:** the register/articulation layer has no code — `src/core/observability/` does not exist and
> auditor authentication is unresolved (`33 §7`). Tracked as `_org.yaml → pending → ARTICULATION-LAYER`.

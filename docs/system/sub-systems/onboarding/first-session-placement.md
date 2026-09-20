# First-Session Placement

> **Organ:** `onboarding` · **Status:** Active · **Date:** 2026-09-20
> **Contract docs (canon):** [foundations/21-incarnation-architecture](../../../../docs/foundations/21-incarnation-architecture.md), [foundations/16-significator-architecture](../../../../docs/foundations/16-significator-architecture.md)

## 1. Purpose

This organ owns **the first session**: seeding the Significator from a composite, binary-search
placement so the player's first encounter is neither insultingly easy nor impossible (`08`'s
psychophysics budget, `ONBOARDING-REDESIGN-PLAN`). It exists because everything downstream reads the
seeded state — a bad seed is a bad first hour, and the Veil (`20`) forbids repairing it by telling the
player what we are doing.

## 2. Boundaries

**Inside:** the placement composite across the eight lines, the convergence budget (≤ 8 probes), the
seed contract that writes the initial Significator, the feature flag gating the legacy probe flow.

**Outside, deliberately:**

- **The vessel** — `profiling` owns the Significator's shape; onboarding only seeds it.
- **Instrument validity** — `profiling`. Placement may not use an instrument whose rubric has not
  passed the RV protocol (`12 §5.4`).
- **What the player is told** — `presentation`. Onboarding is a session like any other; it is
  delegated (`43 §4.6`) and Veil-bound like the rest.

## 3. Interfaces

| Surface | Direction | Contract |
|---|---|---|
| `src/core/onboarding/BinarySearchPlacement.ts` | provides | the placement composite and its convergence |
| `src/core/domain/Significator.ts` | consumes → writes once | the seed |
| `src/core/validation/gates.ts` | enforces | **G20** placement convergence (≤ 8 probes) |
| `43 §4.2` A4 calibrator role | consumes | placement runs as a delegated mandate, not a bespoke flow |

## 4. Invariants

1. **Convergence is bounded** — placement terminates within the psychophysics budget, or the
   session ends with a declared provisional seed rather than probing indefinitely (gate **G20**).
2. **Onboarding is a session** — it is delegated, logged and Veil-bound like any other (no
   special-case code path outside `43 §4.6`).
3. **A seed is a hypothesis with provenance** — the initial state records how it was obtained, so
   `24` can re-probe rather than treat it as demonstrated (`16 §6.4`'s growth edge needs a
   starting point it can distrust).
4. **No grade-band vocabulary** — placement may not name what it measures (`20`, gate **G10**).

## 5. Records

```bash
python3 scripts/arch.py context src/core/onboarding
```

## 6. References

- `08` psychophysics and the staircase · `16` the Significator it seeds · `20` the Veil
- `43 §4.6` the delegation lifecycle · `ONBOARDING-REDESIGN-PLAN` (the binary-search composite)

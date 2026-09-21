## 1. Purpose

Implements the runtime of the ratified personalization architecture: the user-dimensionality vector
(`45 §3/§6`), the dialectic engine (`46 §5`), the composition pipeline over the facet and tag stores
(`46 §3/§6/§7`), context pooling (`45 §5`), the ScenarioContext envelope with per-role sub-agent
scoping (`45 §6.1`), and the engagement register (`45 §7.3`). The organ doc
[player-diagnostics-the-significator](player-diagnostics-the-significator.md) covers the
measurement side; this doc covers the personalization runtime that consumes its projections.

## 2. Boundaries

**Inside:** UDV projection and its firewall, pole selection, facet composition, pooling and
deferral routing, envelope assembly and role scoping, engagement-mechanism registry.

**Outside, deliberately:**

- **What to teach** — `catalyst` (`24`'s ONE formula selects; pooling only ranks candidates).
- **Where content comes from** — `world` (facet/tag/holon stores are the world organ's).
- **Evidence and consent** — `profiling`'s measurement surfaces (`16 §2.1` consent ledger) and the
  safety contract (`MY-AD-0020`) that the projection registry enforces.
- **Rendering** — `presentation` (the envelope is agent input, not a player surface).

## 3. Modules

| Module | Contract | Notes |
|---|---|---|
| `udv.ts` | `45 §3/§6`, `MY-AD-0020 §3` | `REGISTERED_PROJECTIONS` + `projectUdv`; stage labels downgrade to bands; observed interests stay ranking-weight |
| `dialecticEngine.ts` | `46 §5`, `MY-AD-0031` | pair-keyed `PolarityStateMap` (`pairKeyOf`); only `active-tension` pairs carry structural poles; `EXPANSION_RATIO_FLOOR` |
| `composition.ts` | `46 §3/§6/§7` | `Situation` holon kind; `composedOf` bindings; dependency-ordered compose; `CompositionStore` replay (invariant 1) |
| `pooling.ts` | `45 §5` | constraint filter order; veto-as-routing-rule with recorded deferrals (§5.2.1); relevance is a rank, never a selection |
| `scenarioContext.ts` | `45 §6/§6.1` | `ROLE_SCOPES` enforce absence — a band not in `receives` is absent from the scoped view; the Veil list passes into every scope |
| `engagementRegister.ts` | `45 §7.3`, `MY-RG-0017` | both tests gate registration; forbidden mechanisms refused outright |

## 4. Invariants enforced in code (46 §11)

1. Composition records `(facet keys, tag query, seed)` and replays deterministically.
2. Dialectic symmetry is the tag store's construction-time assertion (inherited, not re-checked).
3. No composed facet may fall outside the declared target cell.
4. Facet tags resolve in the tag store at `FacetStore` construction (compile error, not a drop).
5. Composition never overrides an aversion — a fully-vetoed cell fails closed and defers.

## 5. Tests

`tests/personalization/PlanImplement.test.ts` (25 tests) locks every module above, including the
firewall audit (`auditUdv`), the sole-carrier deferral record, replay determinism, and the
role-scoping blindness table.

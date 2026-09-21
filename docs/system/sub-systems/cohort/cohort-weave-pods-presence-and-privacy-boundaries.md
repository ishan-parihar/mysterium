## 1. Purpose

Cohort multiplayer — the *weave* (`38`): how two or more players' practices interleave without any
player's developmental state leaking to another, and without the shared layer becoming a stage for
performance. The pods code (`src/core/pods`, `src/infra/pods`) implements the transport and
membership; this doc states the architecture the pods must satisfy.

## 2. Boundaries

**Inside:** pod membership and transport (`PodTransport`), shared-encounter choreography, cohort-
scoped aggregation of developmentally-safe signals, presence and absence handling.

**Outside, deliberately:**

- **Individual state** — every C1 field stays in the owner's Significator (`profiling`). A pod
  member sees presence and shared narrative, never another member's lines, stages, or shadows.
- **World state** — `world` owns it; a pod visits a world, it does not fork it.
- **Credentialing** — cohort reports (`41`) flow through aggregation that destroys identity
  (ethics contract §2.1 rule 2: `n < 5` is not reportable).

## 3. Binding rules inherited from canon

1. **Relatedness without exposure** (`45 §7.1`): the cohort is a legitimate relatedness mechanism
   only while no member can inspect another's developmental inference.
2. **Aggregation rule** (`MY-AD-0020 §2.1`): any cohort-level report carries its `n`.
3. **No engagement optimization** (`45 §7.2`): cohort presence is never used to guilt attendance —
   no "your pod misses you" surfaces, ever.

## 4. Status

Transport and membership exist in code; choreography and cohort-scoped aggregation are Phase 4
(`DEVELOPMENT-PLAN`). This doc is the organ's contract until then; the pools' state is declared in
`_org.yaml`.

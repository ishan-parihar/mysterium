---
ID: MY-AD-0019
Title: "World, NPC and scenario libraries are pooled before selection"
Status: Active
Date: 2026-09-20
Organ: kernel
Source: "docs/foundations/45-personalization-and-context-pooling.md sections 2 and 5"
Description: "World content is three libraries with different lifecycles; a scenario is the unit of instantiation and declares only locus kind, cast shape, catalytic purpose, modality, stake kind and pressure levers, so content scales by combination rather than by authoring variants. Pooling is retrieval-then-rank producing a candidate set; selection stays with the ONE priority formula (24) as a multiplicative bias, never a parallel queue."
Related: ["MY-AD-0009", "MY-AD-0018", "MY-AD-0008"]
Deferral: PLAN-IMPLEMENT
---

## Decision

The world's content is **three libraries with different lifecycles** — world, NPC, scenario — and a
**scenario is the unit of instantiation**. A scenario template is parameterized by a pooling step into
a concrete encounter, so one template serves a courtroom in a mercantile world for one player and a
family council in a pastoral one for another, with the catalytic purpose intact. Content therefore
scales by **combination**, not by authoring every variant.

### The template invariant

A scenario template declares only `{locus_kind, cast_shape, catalytic purpose, modality, stake_kind,
pressure_levers}`. Anything more specific makes it unpoolable.

### Pooling is retrieval-then-rank, and selection is untouched

```
UDV → QUERY → LIBRARY RETRIEVAL → CONSTRAINT FILTER → CANDIDATE SET → (24) selection
```

The constraint filter is hard and ordered: veil (`20`), perceptibility strata (`18 §5`), aversion
(`MY-AD-0018` rule 2), prerequisites and depth (`31 §3.5a`), modality fitness (`11`). Pooling produces
a **ranked candidate set**; `24`'s ONE priority formula remains the single selection authority and
this document's relevance enters it as a bias.

## Why not a second scheduler

Two selection authorities is the defect `MY-RG-0008` guards. Pooling selects nothing — it narrows
what may be selected, which is a different job and belongs before the formula.

## The analogical bridge

Bridging a concept `C` through the player's fluent domain `D` requires all three layers: **structural**
(map `C`'s parts and invariants onto `D`), **surface** (express in `D`'s vocabulary), **stakes**
(connect to an aim in the player's purpose set). Two guards are mandatory — **structural fidelity**
(an analogy that distorts `C` is a false teacher; mastery is scored on `C`, never on `D`, so fluency
in a favourite domain cannot produce evidence) and **analogy rotation** (every bridge declares a
`noveltyBudget`, the fraction of encounters that must introduce a new domain, so a bridge is a ramp
into unfamiliar material and not a wall around familiar material).

## Consequences

- World, NPC and scenario shapes are owned by `18`, `11`/`12` and this decision respectively; the join
  is specified in 45 §2 and §5.
- Per-holon context (including NPC profiles) is updated by the owner workers of `MY-AD-0009`; pooling
  reads those profiles, it does not maintain a second copy.
- The template schema needs a linter before the library can be authored at volume (declared open in
  45 §10).

## References

- `docs/foundations/45-personalization-and-context-pooling.md` §2, §5, §6
- `docs/foundations/18-great-way-world-architecture.md` §2, §5
- `docs/foundations/24-encounter-scheduler.md`
- `MY-AD-0008`, `MY-AD-0009`, `MY-AD-0018`, `MY-RG-0008`

<!-- 2026-09-20: DG19: declare where this law is consumed, or the pending key that will consume it (recon 2b4849c6b7) -->

---
ID: MY-AD-0021
Title: "World entities are composed from facets, not stored whole"
Status: Active
Date: 2026-09-20
Organ: world
Source: "docs/foundations/46-generative-world-composition.md"
Description: "The world model assumed authored entities: the code holds hand-written holons in stage-holons.json and red-layer-holons.json plus one TypeScript file per line for the Red layer, and 45's three libraries had nothing to pool from because the corpus index carries only line, stage, title and modalities. World, NPC and scenario are now compositions over a facet stock keyed by line x stage x characteristic (640 base cells per characteristic-set), a Situation joins the holon kind taxonomy so the scenario library is a view rather than a second store, and each composition records its facet keys, tag query and seed so it is reproducible and auditable. Two players at the same line-stage no longer receive interchangeable content."
Consumer: "`src/core/personalization/composition.ts` + `src/core/personalization/runtimeBridge.ts` (composition is the live path)"
Related: ["MY-AD-0018", "MY-AD-0019", "MY-AD-0009", "MY-RG-0019"]
---

<!-- Discharged 2026-09-21: composition is the live path — compose() binds entities from the facet stock with composedOf bindings + CompositionStore replay; runtimeBridge.ts composes the encounter texture into the LLM prompt at both orchestrator context builds (recon 06828d7aaa) -->
## Decision

World, NPC and scenario entities are **composed at runtime from a facet stock**, not stored whole.
What is stored is two things: **facets** (the parts an entity can be made of) and **tags** (what those
parts are about, and what they are the opposite of).

```
facet key = [line] × [stage] × [characteristic]
```

Ten characteristics (`46 §2.1`) give **640 base cells per characteristic-set** — that is the entire
authored-variety budget, and it is small precisely because variety comes from **combination** rather
than from authoring entities.

## Why the static model had to go

| Consequence | Evidence in the tree |
|---|---|
| Authoring cost scales linearly with content | one hand-written TypeScript file per line for the Red layer (nine files reproduce one stage) |
| Two players at the same line-stage receive interchangeable content | the store cannot express "same catalytic purpose, this player's vocabulary" |
| Personalization has nothing to select from | `45` specifies pooling over three libraries; the corpus index carries only `{line, stage, title, modalities}` |

## Three structural consequences

1. **A `Situation` joins the holon kind taxonomy** (`18 §2`). A situation — a locus, a cast and a
   stake — is an emergent whole, the same move `18 §2.2` already makes for dyadic relationships.
   Therefore the **scenario library is a view over `Situation` holons**, and all three of `45`'s
   libraries are views over **one store**.
2. **The tag store carries a dialectic relation.** Tags are positioned on the two canonical axes
   (`AGENTS.md §5.1`) so the opposite is *derived* (reflection through the origin) rather than
   hand-paired — a hand-paired list is unbounded authoring and unprincipled. Curated
   `dialecticPair` overrides exist where culture, not geometry, decides the correct opposite.
3. **Composition is recorded and reproducible.** Every composition stores `(facet keys, tag query,
   seed)` (`46 §7.1`), so a player can ask *why* they met this NPC and get a record rather than a
   model. Determinism is what makes personalization auditable.

## What this changes elsewhere

- **`22 §2.1`**'s canonical `Holon` gains a library discriminator, an optional `composedOf`
  facet-binding record, and **sparse altitude overrides**: primary line + stage plus a sparse map for
  lines that differ. `22 §2.1`'s dense `lineStageSignature` stays legal, it is simply no longer
  mandatory — which is what lets the code express `18 §2.1`'s "Orange in Cognitive but Amber in
  Moral" without an eight-line record per NPC.
- **`45 §5.4`**'s bridge is refined by `46 §5.1`: surface in the player's fluent domain, **structure
  in that domain's dialectical opposite**. Rendering in `D` alone is a filter bubble.
- **The 512 concept-drafts become facet modules by extraction, not re-authoring** (`46 §8`): the
  corpus is already keyed `{line}/{stage}/`, so a compiler emits the facet store from it and the
  corpus stays prose-for-humans.

## Code home (recommended, not yet executed)

The world domain has no organ home: `_org.yaml → organs.world.code` is cohort multiplayer, the
world's content sits in `src/core/data` held by `platform`, and its types sit in `src/core/domain`
held by `kernel` — which is *why* `18`, `21`, `22`, `45` and `46` are unreachable from the code they
govern. Recommended (proposed, not yet existing): a new `src/core/world/` with
`{store, facets, tags, compose, libraries}`, and the content moved into it (`46 §10`). Tracked as
`WORLD-STORE-MOVE`.

## References

- `docs/foundations/46-generative-world-composition.md` §2, §3, §4, §5, §7, §10
- `docs/foundations/45-personalization-and-context-pooling.md` §2, §5.4
- `docs/foundations/18-great-way-world-architecture.md` §2, §2.2
- `docs/foundations/22-holon-context-engine.md` §2.1
- `MY-AD-0018`, `MY-AD-0019`, `MY-AD-0009`, `MY-RG-0019`

<!-- 2026-09-20: DG19: declare where this law is consumed, or the pending key that will consume it (recon 2b4849c6b7) -->

# World Composition & Holon Memory

> **Organ:** `world` · **Status:** Active · **Date:** 2026-09-20
> **Contract docs (canon):** [foundations/18-great-way-world-architecture](../../../../docs/foundations/18-great-way-world-architecture.md), [foundations/21-incarnation-architecture](../../../../docs/foundations/21-incarnation-architecture.md), [foundations/22-holon-context-engine](../../../../docs/foundations/22-holon-context-engine.md), [foundations/45-personalization-and-context-pooling](../../../../docs/foundations/45-personalization-and-context-pooling.md), [foundations/46-generative-world-composition](../../../../docs/foundations/46-generative-world-composition.md), [foundations/47-preference-inference-and-scaffolding](../../../../docs/foundations/47-preference-inference-and-scaffolding.md)

## 1. Purpose

This organ owns **the world the player is incarnated into**: the holon store, the facet and tag
stores that compose entities (`46`), the three library views the personalization layer pools over
(`45 §2`), long-horizon world memory (`22 §7.4`), and the encounter content the scheduler draws from
(`24 §2.2`). It exists because the world is not decoration — it is the *delivery surface* of every
catalyst, and its memory is what makes an NPC that remembers the player different from an NPC that
reloads.

## 2. Boundaries

**Inside:** holon identity and state, composition from facets, the tag ontology and its derived
dialectic relation, world-side memory and its per-holon owner workers (`22 §7.5`), PESTLE collective
state, encounter content data.

**Outside, deliberately:**

- **Who the player is** — `profiling`. The world receives a purpose-scoped projection, never the
  Significator.
- **What happens next** — `catalyst` (`24` selects; the world supplies candidates).
- **What the player may see** — `presentation`. The world holds full state; perception strata
  (`18 §5`) are a render decision.
- **Interventions in a shared world** — `persistence` (pods are cohort transport, not world state).

> The sample path below is wrong today and is left visible rather than hidden.
>
> **Known mis-ownership (tracked, `_org.yaml → pending → WORLD-STORE-MOVE`).** `organs.world.code`
> currently points at `src/core/pods` and `src/infra/pods` — cohort multiplayer, not world-building —
> while the actual world content sits in `src/core/data` (owned by `platform`) and its types in
> `src/core/domain` (owned by `kernel`). That scattering is why `18`/`21`/`22`/`45`/`46` are not
> reachable from the code they govern. Phase 10 creates the planned `src/core/world/` and corrects
> this block.

## 3. Interfaces

| Surface | Direction | Contract |
|---|---|---|
| planned layout (`46 §10`, not yet created): `src/core/world/` with `store`, `facets`, `tags`, `compose`, `libraries` | provides | the world store, the composition pipeline, the three views |
| `src/core/world/Holon.ts` | provides | the holon kind taxonomy, incl. `Situation` (`46 §3.1`) |
| `src/core/data/{stage-holons,red-layer-holons}.json`, `RedPESTLE.ts` | provides (today) | authored world state — to be superseded by the facet store |
| `src/core/engines/CandidateGeneration.ts` | consumes | `WorldState`: holons, cooldowns, narrative beats, factions, NPC relationships, PESTLE tension, macro-event state |
| `src/core/engines/MacroCatalystEngine.ts` | consumes | collective tension → macro-events (`24 §8`) |
| `45 §5` pooling · `46 §7` composition | provides | the candidate set the scenario-catalyst agent renders |

## 4. Invariants

1. **Entities are composed, never authored into a table** (`MY-AD-0021`). A stored entity that
   duplicates what composition would produce is a defect (`MY-RG-0019`).
2. **Every composition is reproducible** — it records `(facet keys, tag query, seed)`; gate **G22**.
3. **`opposite(opposite(t)) == t` for every tag**, and a tag without a resolvable opposite is a
   compile error, not a runtime surprise (`46 §4.2`; gate **G22**).
4. **One writer per holon** — a holon's state is committed by its owner worker only (`22 §7.5`,
   `MY-AD-0009`); the orchestrator ratifies only deltas that reach the player.
5. **Memory is two-fold and never merged** — player/profiling memory and object/world memory are
   separate ledgers (`MY-AD-0009`); the firewall is `MY-RG-0018`'s data classes.
6. **Offline degrades to deterministic ledger replay**, never a silent skip (`22 §7.4`).

## 5. Records

```bash
python3 scripts/arch.py context src/core/world
```

## 6. References

- `18` world architecture · `21` incarnation · `22` holon context engine and memory tiers
- `45` the three libraries · `46` composition, facets, tags · `47` what the player prefers
- `24 §2.2` the world inputs the scheduler consumes · `19 §8.2` consequence propagation

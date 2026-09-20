# 46 — Generative World Composition

> **Lateral:** How world, NPC and scenario entities are **composed at runtime from facet modules**
> rather than stored whole; the **tag ontology and its dialectical opposites**, which is the store
> that makes a preference retrievable and its opposite trainable; and the composition pipeline that
> turns those two stores into novel entities.
> **Status:** recommended 2026-09-20 — awaiting ratification.
> **Owns:** the **facet/module model** (`[line × stage × characteristic]`), the **characteristic
> axis**, the **tag ontology**, the **dialectic relation** (tag → opposite), the **dialectic engine**
> (`familiar | expand | spiral`), the **composition pipeline**, and the **world store layout**.
> **Does not own:** the world's holon taxonomy (`18`), the holon data model and prompt pipeline
> (`22`), the user-dimensionality vector, pooling and the analogical bridge (`45`), the polarity
> texture catalogue (`23`), the per-line×stage shadow/drive modules (`10`, `12`), the modality
> contracts (`11`), the encounter priority formula (`24`), the 512 design briefs themselves
> (`concept-drafts/README`).
> **Cross-references:** all of the above. This document is the join between the corpus, the tag
> store and the composed world.

---

## 1. Purpose: why a static world store fails

The preceding documents describe a world of **authored entities**. `18 §2` taxonomy, `22 §2.1` data
model, `22 §3` worked examples, `21 §8` content drops, and the code (`src/core/data/stage-holons.json`,
`src/core/data/red-layer-holons.json`, `src/core/data/encounters/red/`) all assume the same thing: a
human writes an NPC, a world region or an encounter, and it is stored.

That assumption has three consequences, and all three are already visible in the tree:

| Consequence | Evidence in the tree |
|---|---|
| **Authoring cost scales linearly with content** | one hand-written TypeScript file per line for the Red layer (`src/core/data/encounters/red/`) — 9 files reproduce one stage |
| **Two players receive interchangeable content** | the store cannot express "the same catalytic purpose, expressed in this player's vocabulary" |
| **Personalization has nothing to select from** | `45` specifies pooling over three libraries, and there are no libraries — the corpus index (`src/core/data/concept-drafts.json`) carries only `{line, stage, title, modalities}` |

**The commitment this document makes:** entities are **composed**, not stored. What is stored is a
stock of **facets** (the parts an entity can be made of) and a stock of **tags** (what those parts are
*about*, and what they are the opposite of). A world, an NPC and a scenario are each a **composition**
— a selection of facets bound to a holon identity — generated for a specific player at a specific
moment.

This is the "dynamic architecture" the canon has been converging on: `45` pools libraries, but a
library that must be authored entry by entry cannot supply variety at scale. The library is a
**component stock**, and variety comes from **combination**.

---

## 2. The facet model

A **facet** is the smallest independently varying unit of world content. Its key is the triple the
corpus is already organized by:

```
facet key = [line] × [stage] × [characteristic]
```

| Axis | Values | Owner of the axis |
|---|---|---|
| **line** | the 8 lines (`03`) | `03` |
| **stage** | the 8 ratified stages (`02 §3`) | `02`, `44` |
| **characteristic** | the 10 dimensions below | this document |

### 2.1 The characteristic axis

A characteristic is **a dimension along which an entity can vary within a given line × stage**. It is
not a content type — it is an *aspect of being* that has a distinct developmental shape at every
line×stage cell.

| # | Characteristic | What it fixes | Grounded in |
|---|---|---|---|
| 1 | `drive-profile` | the balance across Eros/Agape and Agency/Communion | `05`, `12` |
| 2 | `shadow-expression` | which of the four quadrants is live, and how it presents | `10 §` |
| 3 | `polarity-texture` | the STO/STS/exploratory texture at this cell | `23` (the 64-cell catalogue) |
| 4 | `voice-register` | how it speaks: syntax, register, imagery | `22 §5` |
| 5 | `role-archetype` | its narrative function | `18 §2` |
| 6 | `stake` | what it wants, and what it can lose | `19` |
| 7 | `pressure-lever` | the catalyst it is able to deliver | `10`, `14` |
| 8 | `surface-aesthetic` | sensory and cultural surface (this is where PESTLE lives, `18 §3`) | `18 §3` |
| 9 | `relationship-pattern` | how it binds to other holons | `18 §2.9` |
| 10 | `memory-schema` | what it records about itself and the player | `MY-AD-0009`, `22 §7.4` |

**640 base facets per characteristic-set** (8 × 8 × 10). That is the whole authored-variety budget:
640 cells, each of which is *composed* with others rather than stored as a finished entity, which is
what makes an unbounded number of distinct entities affordable.

### 2.2 Facet record shape

```typescript
interface Facet {
  readonly key: FacetKey;              // `${line}:${stage}:${characteristic}`
  readonly line: Line;
  readonly stage: Stage;
  readonly characteristic: Characteristic;
  readonly tags: readonly TagId[];     // §4 — what this facet is ABOUT
  readonly tagAffinity: Readonly<Record<TagId, number>>;   // -1..1, how strongly
  readonly payload: FacetPayload;      // characteristic-specific content
  readonly composedWith: readonly Characteristic[];  // which other facets it modifies
  readonly source: 'corpus' | 'authored' | 'generated';
  readonly generationSeed?: number;
}
```

`composedWith` is the load-bearing field: a facet is not a leaf value but a **transformer** over
another facet. A `voice-register` facet at `Green` modifies whatever `stake` it is paired with; a
`pressure-lever` facet at `Amber` constrains which `shadow-expression` is coherent. Composition is a
sequence of refinements, not a concatenation.

---

## 3. From stored entities to composed entities

| Library (`45 §2`) | Holon kind (`18 §2`) | What composition produces |
|---|---|---|
| **World** | group-altitude and above | a region with its perceptibility strata, PESTLE state and local culture |
| **NPC** | individual / dyadic | a character with a voice, stakes, drives, a shadow and a memory |
| **Scenario** | `Situation` (new, §3.1) | a locus + a cast + a catalytic purpose + pressure levers |

### 3.1 A situation is a holon

`45 §2` calls the scenario the unit of instantiation, and `18 §2.2` already treats a **dyadic
relationship** as a holon in its own right — a whole that is not reducible to its members. A situation
is the same move one step further out: a locus, a cast and a stake form an emergent whole with its own
developmental signature. Therefore:

**`Situation` is added to the holon kind taxonomy** (`18 §2`), and the scenario library is a **view
over `Situation` holons**. This is why `45`'s three libraries can all be views over one store
without violating anything: world and NPC are holons by altitude, scenario is a holon by emergent
composition, and the library is the role the holon is playing.

**Consequence for `22 §2.1`:** the canonical `Holon` interface gains a `library` discriminator and an
optional `composedOf` facet-binding record. Its `lineStageSignature` stays authoritative (§6.3).

---

## 4. The tag ontology

A tag is the **preference-relevant domain label** an entity is about: *technology*, *nature*,
*kindred*, *commerce*, *craft*, *music*, *medicine*, *law*, *warfare*, *exploration*, *ritual*,
*architecture*. Tags are what `45 §3`'s interest graph and analogical vocabulary are expressed in, and
they are the join between the player and the component stock.

### 4.1 A tag is a position, not a label

Tags are not a flat list. Each is **positioned on the two canonical axes** (`AGENTS.md §5.1`):

```typescript
interface Tag {
  readonly id: TagId;
  readonly label: string;
  readonly axis: { readonly erosAgape: number;       // -1 (Agape) .. +1 (Eros)
                   readonly agencyCommunion: number };// -1 (Communion) .. +1 (Agency)
  readonly facetAffinity: Readonly<Record<Characteristic, number>>;
  readonly dialecticPair?: TagId;   // curated override, §4.2
  readonly culturalNotes: string;   // §9 — fluency is culture-laden
}
```

This is a deliberate choice: **the dialectic is derived, not hand-authored.** A hand-paired list of
opposites is (a) unbounded authoring, (b) unprincipled — nothing would say why `technology ↔ nature`
and not `technology ↔ ritual`, and (c) impossible to extend without a design meeting per tag.

### 4.2 The dialectic relation

```
opposite(t) = the tag nearest to reflect(t)      where reflect negates both axis coordinates
```

with a **curated `dialecticPair` override** for the core set where the geometric reflection is not
the pedagogically correct opposite (culture, not geometry, decides those). The relation is:

- **symmetric** — `opposite(opposite(t)) == t` (asserted, not assumed: the reflection is involutive)
- **total** — every tag has one, because every position has a reflection
- **reflexive-safe** — a tag at the origin reflects to itself and must declare its own opposite
  explicitly, or be excluded from dialectic selection

### 4.3 What the tag store is for

| Consumer | Query | Purpose |
|---|---|---|
| `45 §5` pooling | facets whose tags overlap the UDV's interest graph | **familiarity** — the content lands |
| the dialectic engine (§5) | facets whose tags are the *opposite* | **expansion** — the dimension the player does not have |
| `45 §5.4` the bridge | a fluent domain `D` and its opposite `D'` | surface in `D`, structure in `D'` (`45 §5.4` refinement below) |
| `24` selection | tags as a *relevance* bias | the encounter that should be selected, in a vocabulary that will land |
| `16 §6.4` growth edge | distance from the UDV's current position | which expansion is the *next* one, not a random one |

---

## 5. The dialectic engine

The engine answers one question: **how much familiarity and how much novelty, and novelty of what
kind.**

### 5.1 Three modes

| Mode | Selection | Serves |
|---|---|---|
| **familiar** | tags nearest the UDV position | retention, fluency, the surface of a bridge |
| **expand** | tags at the reflected position, ordered by `16 §6.4` distance | dimensional widening |
| **spiral** | familiar for *surface*, opposite for *structure* — the default | both at once |

**Spiral is the default and the reason this document exists.** It resolves an ambiguity in `45 §5.4`:
the analogical bridge is specified as "map `C` onto the player's fluent domain `D`", which alone
produces a filter bubble — the player learns everything in the vocabulary they already own, and the
structure they cannot yet see is never trained. The refinement is:

> **The bridge renders `C` in `D`'s surface and `D`'s opposite's structure.** The vocabulary is
> familiar so the content is not rejected; the structure is the dialectical opposite so the
> unfamiliar dimension is what gets practised. Fluency is the carrier; the opposite pole is the
> payload.

`45 §5.4`'s two guards still apply unchanged and now have a sharper job: **structural fidelity**
(measured against `C`, never against `D`) is what stops the spiral from becoming a distorted teacher,
and **analogy rotation** (`noveltyBudget`) is what stops the familiar surface from hardening into the
only surface ever used.

### 5.2 The expansion budget

Repetition of any single tag or of any single opposite pair is the failure mode. The engine therefore
carries, per player, a **coverage vector** over the tag space and derives:

- `expansionRatio` — the fraction of composed encounters whose *structure* must come from the
  opposite pole (seeded from `45 §5.4`'s `noveltyBudget`, calibrated by play data)
- `rotationFloor` — a minimum interval between two encounters sharing a dominant tag
- **saturation guard** — once a tag's coverage entry is high, it stops being selectable as the
  structural pole (it has nothing left to teach)

### 5.3 What the engine may not do

- **It may not select the catalytic purpose.** The dialectic chooses the *how*; `24` and the
  developmental state choose the *what* (`45 §4`).
- **It may not override aversion.** A tag the player has refused is excluded from both poles
  (`45 §3.1` rule 2).
- **It may not collapse into a comfort engine.** `expansionRatio` has a floor; a player who always
  chooses the familiar is still given the opposite — that is the standing `16 §6.4` counterweight
  applied to *content* rather than difficulty.

---

## 6. The world store

### 6.1 One store, three views

```
                    ┌──────────────────────────────────────────┐
                    │  HOLON STORE  (identity, altitude, tags,  │
                    │  memories, composedOf facet bindings)     │
                    └────────────────┬─────────────────────────┘
        ┌────────────────────────────┼────────────────────────────┐
        ↓                            ↓                            ↓
   world view                   NPC view                   scenario view
 (altitude ≥ group)        (altitude individual/dyadic)     (kind = Situation)
        └────────────────────────────┴────────────────────────────┘
                                     ↑
                     ┌───────────────┴────────────────┐
                     │  FACET STORE   (640 base cells) │
                     │  TAG STORE     (positions +     │
                     │                 dialectic pairs)│
                     └────────────────────────────────┘
```

A **view** is a declared projection with its own index — `45 §5` pools over views, and a view is not a
second store (`MY-RG-0015`: derive what can be derived).

### 6.2 Store layout

```typescript
interface WorldStore {
  readonly holons: HolonStore;          // identity + state, keyed by HolonId
  readonly facets: FacetStore;          // keyed by FacetKey, indexed by tag
  readonly tags: TagStore;              // the ontology (§4) + the dialectic relation (§4.2)
  readonly compositions: CompositionStore;  // the record of what was composed and why (§7.4)
}

interface FacetStore {
  get(key: FacetKey): Facet | undefined;
  byTag(tags: readonly TagId[], opts?: { line?: Line; stage?: Stage }): Facet[];
  byCharacteristic(c: Characteristic, line: Line, stage: Stage): Facet[];
  transformsFor(target: Characteristic, line: Line, stage: Stage): Facet[];
}
```

### 6.3 Altitude resolution (the `22 §2.1` question)

`22 §2.1` declares `lineStageSignature: Record<Line, Stage>` — all eight lines. That is correct and
stays authoritative. What was wrong was the **code**, which carried a single `line` and a single
`stage` while `18 §2.1` promised an NPC can be "Orange in Cognitive but Amber in Moral".

The resolution adopted here is **sparse-over-dense**: the record declares a **primary line and its
stage** plus a **sparse override map** for lines that differ. Every NPC can therefore express
`18 §2.1`'s internal contradictions; the common case costs one line of data; and the synthesis rule
already exists (`02 §4`'s two-line breakthrough). Full eight-line authoring remains legal, it is simply
not mandatory.

---

## 7. The composition pipeline

```
1. PURPOSE     ← 24 / 16 state: the catalytic target (line × stage × modality × shadow quadrant)
2. TAG QUERY   ← UDV (45 §3) + dialectic engine (§5): familiar pole + structural opposite
3. FACET PULL  ← FacetStore.byTag(...) for the target cell, per characteristic
4. BIND        ← select a Holon identity (existing, or instantiate a new Situation/NPC)
5. COMPOSE     ← apply facets in dependency order (`composedWith`), resolving conflicts
6. ENVELOPE    ← emit a ScenarioContext (45 §6) for the scenario-catalyst agent
7. MEMORY      ← the two-fold write path (22 §7.4): player ledger + holon owner worker
```

**The pipeline generates entities; it does not invent canon.** Steps 1–2 are deterministic given the
UDV and the developmental state; step 5 is constraint-solved, not free-form. LLM generation stays
inside the envelope as `22 §1` specifies, and the authored/generated boundary of `22 §8` is
unchanged: the *facet stock* is canon, the *composition* is generated.

### 7.1 Composition determinism

A composition must be **reproducible** for a replayed session (`22 §9`). Each composition records
`(facet keys, tag query, seed)` in `CompositionStore`; replaying with the same inputs yields the same
entity. This is what makes personalization auditable rather than mystical — a player can ask *why* they
met this NPC, and the answer is a record, not a model.

---

## 8. The 512 concept-drafts become facet modules

The 512 files are already `docs/concept-drafts/{line}/{stage}/{module-spec + 7 modality files}` —
**exactly the `[line × stage]` grid** this architecture is keyed by. The conversion is therefore an
**extraction**, not a re-authoring:

| Corpus artifact | Becomes |
|---|---|
| `module-spec.md` (the module's psychology, shadow archetypes, drive-health, scoring) | the facet payloads for `drive-profile`, `shadow-expression`, `stake`, `pressure-lever` at that cell |
| each of the 7 modality files | a `voice-register` + `surface-aesthetic` + pressure-lever variant **tagged by modality** (`11`) |
| the existing corpus index (`src/core/data/concept-drafts.json`) | extended from `{line, stage, title, modalities}` to carry facet keys, tags and tag affinities |

**The split:** the concept-drafts remain the **design briefs** and the reviewable source of truth.
A **compiler** (`scripts/compile-facets.ts` or equivalent) emits the facet store from them, so the
corpus stays prose-for-humans and the store stays data-for-the-engine — and the two cannot silently
diverge, which is the failure class `RT-CORPUS-RECONCILE` already tracks.

Authoring a *new* facet (a tag, a characteristic payload, a curated dialectic pair) is a corpus change,
reviewed like any other canon.

---

## 9. Cultural authenticity, again

`18 §9` guards against pastiche in the world's cultures. The tag store needs the same guard, one level
down: **fluency is culture-laden.** A domain that is warmly familiar to one player is exotic,
infantilising or offensive to another. Therefore:

- a tag's `culturalNotes` is authored, not inferred;
- a tag may be marked **culture-restricted**, which excludes it from automatic selection in
  localities where it would read as appropriation;
- `45 §3.1`'s aversion list is the player-level override and it outranks everything here.

---

## 10. Code layout recommendation

**Recommendation: create a single world organ home and move the world content into it.** The proposed
tree below does not exist yet — it is a recommendation, and each of its paths is named here as a
target, not as a citation:

```
src/core/world/
├── Holon.ts          ← moved from src/core/domain/Holon.ts
├── store/            ← moved from src/core/data/HolonRegistry.ts (HolonStore)
├── data/             ← moved from src/core/data/{stage-holons,red-layer-holons}.json
├── pestle/           ← moved from src/core/data/RedPESTLE.ts, extended to every stage (§2.1 ch. 8)
├── facets/           ← compiled from the corpus (§8); replaces src/core/data/encounters/red/
├── tags/             ← the tag store (§4)
├── compose/          ← the composition pipeline (§7)
└── libraries/        ← the three views: world · NPC · scenario
```

| Now (a real citation) | Becomes | Why |
|---|---|---|
| `src/core/domain/Holon.ts` | the world's root entity | it belongs to the world organ, not to generic domain types |
| `src/core/data/HolonRegistry.ts` | the world store | it is the store, not generic data |
| `src/core/data/{stage-holons.json, red-layer-holons.json}` | world content | content, not substrate |
| `src/core/data/RedPESTLE.ts` | the PESTLE facade | PESTLE is one stage deep today |
| `src/core/data/encounters/red/` | compiled facets | the hand-authored per-stage encounter list is the static model this document replaces |

**Two ownership corrections in `_org.yaml`, both required:**

1. `organs.world.code` is currently `[src/core/pods, src/infra/pods]` — that is **cohort multiplayer**
   (`38`), not world-building. Pods belong to the cohort organ; the world organ should own the
   proposed `src/core/world/` home instead.
2. `src/core/data` is currently owned by `platform` as "system substrate". The world content in it is
   not substrate. After the move, `platform` keeps `concept-drafts.json` (a generated corpus index),
   `glossary.ts`, `shadowKeywords.ts` and `ConceptDraftIndex.ts`.

**Why a new directory rather than splitting across `domain/` + `data/` + `engines/`:** the world
domain has no home today, which is *why* its code ended up scaffolded across three organs and its
canon docs (`18`, `22`, `45`, and this one) are unreachable from the code that must satisfy them. A
single organ directory is what makes `arch.py context` able to answer "what governs this?" — the gap
`KB-FOUNDATIONS-INGEST` names.

---

## 11. Invariants and failure modes

**Invariants (each is a candidate gate for the implementation phase):**

1. Every composed entity records its `(facet keys, tag query, seed)` and is reproducible from them.
2. `opposite(opposite(t)) == t` for every tag, or the tag is excluded from dialectic selection.
3. No composed entity may contain a facet whose `line`/`stage` is outside its declared composition
   target.
4. A facet's tags must resolve in the tag store; a facet with an unknown tag is a compile error, not a
   silent drop (`DG17`'s lesson, applied to content).
5. Composition never overrides an aversion, and never substitutes a catalytic purpose.

**Failure modes:**

| Failure | Mechanism | Countermeasure |
|---|---|---|
| **Static reassertion** | someone adds a hand-authored entity because it is faster today | the store has no entity table; §10's move removes the place to put one |
| **Tag sprawl** | tags accrete faster than the dialectic relation can be maintained | a tag without an `opposite` is a compile error (invariant 2) |
| **Echo chamber** | the familiar pole is always selected | §5.2 `expansionRatio` floor + saturation guard |
| **Dialectical falsification** | the opposite pole distorts the concept | `45 §5.4` structural fidelity, scored on `C` |
| **Facet incoherence** | composed parts contradict (an Amber voice on a Green stake) | `composedWith` dependency order + coherence check in step 5 |
| **Corpus divergence** | the facet store drifts from the concept-drafts | compiler-only path (§8), reconciliation gate |
| **Visibility collapse** | the same 20 facets are seen everywhere | measures the composition's *entropy* per line×stage and flags low-diversity cells |

---

## 12. Principles served

Principles **1, 3, 5, 6** — the practice is delivered in the player's own language (1); the machinery
that knows them best is not used to exploit them, because a composition is recorded and reversible (3);
the developmental need always outranks the preference, since the dialectic chooses the *how* and never
the *what* (5); and the player can read, edit and export the model of themselves that drives it (6).

---

## 13. Open questions

- **Characteristic completeness.** Is 10 the right axis, or does `pressure-lever` and `stake` collapse
  into one? The test is whether two facets can vary independently — if they always move together, they
  are one characteristic.
- **`expansionRatio` calibration.** Unresolved without play data; `45 §5.4`'s `noveltyBudget` has the
  same open question and should be answered once.
- **Tag vocabulary size.** Where is the point at which the ontology stops being learnable by a player
  reading their own model? Unknown.
- **Composition cost.** 640 base cells × 10 characteristics is small; the cross-product at runtime is
  not. Does composition need a precomputed index for the hot cells?
- **Situation scope.** A `Situation` holon generated per encounter could explode the holon store.
  Does a situation persist after its encounter, or is it garbage-collected with its composition record
  retained?
- **Migration.** `src/core/data/{stage-holons.json, red-layer-holons.json}` are hand-authored entities.
  Are they retro-fitted into facets, kept as a legacy overlay, or retired?

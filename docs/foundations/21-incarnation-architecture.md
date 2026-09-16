# 21 — Incarnation Architecture (Option C)

> **Cross-references:** [[AGENTS.md|AGENTS.md (process protocol)]] · [[docs/foundations/24-encounter-scheduler|24 — Encounter Scheduler]] · [[docs/foundations/01-aqal-quadrants|01 — Aqal Quadrants]] · [[docs/foundations/05-drives-and-polarities|05 — Drives And Polarities]] · [[docs/foundations/11-game-modalities|11 — Game Modalities]] · [[docs/foundations/13-architecture-of-consciousness|13 — Architecture Of Consciousness]] · [[docs/foundations/20-veil-of-forgetting|20 — Veil Of Forgetting]] · [[docs/foundations/22-holon-context-engine|22 — Holon Context Engine]]
> **Lateral:** Master synthesis — how greater-cycle archetypes + concept-drafts + modalities compose into a playable game.
> **Depends on:** 11, 13, 14, 15, 16, 17, 18, 19, 20, 23, 24
> **Referenced by:** all implementation work; MVP-BLUEPRINT

---

## 1. The master equation

```
Game = Significator (player) navigating Great Way (world)
     through encounters drawn from 64 line×stage modules
     with consequences propagating through Choice/polarity engine
     triggering Transformation at stage thresholds
     all behind the Veil of Forgetting
```

This is Mysterium reduced to a single sentence. Every system in the codebase exists to serve one term in this equation. The remainder of this document unpacks each term and specifies how they compose into a playable structure.

### 1.1 Term definitions

| Term | Archetype | Game-system | Specified in |
|---|---|---|---|
| **Significator** | Hierophant (Card 5) | `PlayerProfile` — the persistent self-pattern | foundations/16 |
| **Great Way** | Chariot (Card 7) | The layered world of holons | foundations/18 |
| **Encounters** | Catalyst (Empress) → Experience (Emperor) | The atomic unit of gameplay | foundations/14, concept-drafts/ |
| **Choice/polarity engine** | Archetype 22 | `PolarityVector` — STO/STS crystallisation | foundations/19 |
| **Transformation** | Lovers (Card 6) | Stage-threshold frame-change events | foundations/17 |
| **Veil of Forgetting** | Embedded Unconscious | The experiential principle — no meta-awareness | foundations/20 |
| **64 modules** | The lesser-cycle catalyst pool | 8 lines × 8 stages, each with 7 modality games | concept-drafts/ |

### 1.2 The two cycles unified

The lesser cycle (Matrix → Potentiator → Catalyst → Experience) operates *within* each encounter. The greater cycle (Significator → Transformation → Great Way → Choice) operates *across* the player's entire game-lifetime. This document is the bridge: it specifies how thousands of lesser-cycle encounters, drawn from the 64-module pool and delivered through 7 modalities, accumulate into the greater-cycle arc of Transformation and Choice.

### 1.3 Option C: the layered-world incarnation

Three structural options were considered for Mysterium's world:
- **Option A:** 64 separate game-worlds (one per module) — rejected; no coherent narrative
- **Option B:** A single flat world with gated zones — rejected; no perceptual shift at Transformation
- **Option C:** ONE world with 8 perceptual layers — accepted; the Incarnation Architecture

Option C means: the player inhabits a single, continuous world. What changes at each stage transition is not the *world* but the *perception* of it. This is the Incarnation Architecture — the player is incarnated into a world they perceive through the lens of their current developmental altitude, and Transformation shifts that lens.

---

## 2. The world as layered incarnation

### 2.1 One world, eight layers

The game world is ONE coherent geography. It does not branch into parallel dimensions or separate maps at stage transitions. Instead, it possesses eight **perceptual layers** — strata of reality that become visible, interactive, and meaningful as the Significator's altitude shifts.

| Layer | Stage | Aesthetic signature | Physics | Beings |
|---|---|---|---|---|
| 1 | Infrared | Cave-dark, hearth-lit, primal textures | Gravity-heavy, slow, visceral | Animal companions, elemental presences |
| 2 | Magenta | Dream-saturated, animistic, symbol-rich | Fluid, magical causation | Totemic spirits, tribal ancestors |
| 3 | Red | Fortress-sharp, saffron/brass, weapon-walls | Force-based, momentum, impact | Warriors, warlords, beasts of dominance |
| 4 | Amber | Cathedral-ordered, gold/stone, hierarchical | Rule-governed, structured, ceremonial | Priests, knights, judges, tradition-keepers |
| 5 | Orange | Mechanism-precise, steel/glass, achievement | Rational causation, measurable, optimisable | Inventors, strategists, merchants, scholars |
| 6 | Green | Garden-lush, earth-toned, communal | Relational, ecological, interconnected | Healers, pluralists, activists, artists |
| 7 | Turquoise | Crystalline, vast, translucent | Holonic, multi-scale, integral | Sages, vision-logicians, planetary stewards |
| 8 | White | Luminous silence, minimal, spacious | Non-dual, paradox-holding | The witness, the transparent vessel |

### 2.2 Layers are strata of perception, not separate maps

A player at Red altitude and a player at Green altitude stand in the *same* world-coordinate. They perceive different things:

- **NPCs visible:** Each NPC has a primary layer. An NPC whose signature is Amber is invisible (or perceived as a flat background figure) to a Red-altitude player. At Amber altitude, that NPC becomes a full interactable character with dialogue, quests, and relational depth.
- **Environments accessible:** Certain spaces exist only at certain layers. A meditation grove is physically present at all layers but is perceived as "empty clearing" at Red, "pleasant garden" at Green, and "crystalline sanctuary" at Turquoise.
- **Encounter types eligible:** The encounter scheduler only draws from modules at or below the player's current altitude (plus golden-shadow horizon encounters from one layer above).
- **Palette and music:** Each layer carries its ray-palette and modal audio signature (per MVP-BLUEPRINT §14–15). The renderer blends layers based on the player's perceptual state.

### 2.3 Bleed-through and horizon-impression

The player does not perceive *only* their dominant layer. Two additional perceptual phenomena operate:

**Theta-decay bleed-through (downward):** When a lower layer's module has decayed (theta-decay per foundations/14), that layer *bleeds through* into the player's perception. A Turquoise player who has neglected their Red-stage health will see Red-layer elements intruding — fortress walls cracking through the crystalline landscape, aggressive NPCs appearing where none should be. This is the holonic maintenance principle made perceptual: neglected lower stages demand attention.

**Golden-shadow horizon (upward):** The player receives faint impressions of the *next* layer above their current altitude. These are not full interactions — they are glimpses: a distant figure that vanishes, a sound that doesn't belong, an environmental detail that seems to shimmer with unrealised meaning. These impressions are the emergent unconscious (the Potentiator) calling the Significator forward. They intensify as the player approaches a Transformation threshold.

### 2.4 Transformation as perceptual layer-shift

At a successful Transformation event (per foundations/17), the player's dominant perceptual layer shifts. This is not a teleport or a loading screen. It is a *revelation*: the same world, perceived with new eyes. Concretely:

- The renderer activates the next layer's palette, lighting, and shader uniforms
- Previously invisible NPCs fade into visibility over 2–3 sessions
- Previously inaccessible spaces become navigable
- The audio engine shifts modal scale and instrumentation
- The encounter scheduler begins drawing from the new stage's modules
- The old layer's encounters transition to shadow-mode (maintenance, not advancement)

The player's felt-sense: "This was always here. I couldn't see it before."

### 2.5 What "layer" means for the engine

Technically, a layer is a tagged set of:
- **Render data:** palette uniforms, shader parameters, particle systems, lighting profiles
- **Audio data:** modal scale, instrumentation set, ambient soundscape
- **Entity visibility masks:** which NPCs, objects, and environmental features are perceptible
- **Encounter eligibility flags:** which modules the scheduler may draw from
- **Physics modifiers:** movement feel, gravity weight, interaction responsiveness

The engine maintains all 8 layers simultaneously in data; only the active layer (plus bleed-through and horizon) is rendered. Layer transitions are gradual blends, not hard cuts.

---

## 3. The encounter as atomic unit

### 3.1 Definition

The **encounter** is the atomic unit of gameplay. Every moment of meaningful player engagement is an encounter. Every encounter is a lesser-cycle catalyst→experience→integration loop (per foundations/14) wrapped in narrative and delivered through a specific modality.

### 3.2 Encounter identity

Every encounter carries a fixed identity tuple:

```
encounter = {
  line:     Line,           // which of 8 lines of intelligence
  stage:    Stage,          // which of 8 developmental stages
  modality: GameModality,   // which of 7 catalyst-delivery axes
  holon:    HolonRef,       // which entity in the Great Way sources it
  role:     EncounterRole,  // side | mini | main | shadow | threshold
  ray:      Ray,            // canonical energy-ray binding
  polarity: PolarityEligibility  // which choices carry STO/STS signal
}
```

No encounter exists without all six coordinates. This is the encounter's address in the game's architecture.

### 3.3 The encounter contract

Every encounter operates a strict input→output contract:

**Inputs:**
| Input | Source | What it provides |
|---|---|---|
| Significator state | PlayerProfile (foundations/16) | Current altitudes, drive-balance, shadow-ledger, polarity vector, transformation-readiness |
| Holon state | Great Way world-state (foundations/18) | The sourcing entity's current altitude, shadow-state, relationship to player |
| Scheduler decision | Encounter scheduler (§4) | Why this encounter was selected — which need it addresses |
| Session context | Runtime telemetry | Player energy estimate, time available, patience signals |

**Outputs:**
| Output | Destination | What it records |
|---|---|---|
| Telemetry | Local encrypted storage | Raw behavioural data (RT, accuracy, choice patterns, engagement quality) |
| Consequence vector | Great Way world-state | How the encounter's outcome changes the sourcing holon and adjacent holons |
| Polarity vector contribution | PolarityVector on PlayerProfile | The STO/STS signal from any choice-points within the encounter |
| Integration signal | Distortion Ledger on PlayerProfile | Whether shadow material was surfaced, partially integrated, or fully resolved |
| Drive-health update | Drive weights on PlayerProfile | How the encounter shifted the player's drive-balance |
| Theta refresh | Task staircases on PlayerProfile | Capacity demonstration resets decay timers |

### 3.4 The encounter lifecycle

```
1. SELECTION    — Scheduler selects encounter spec
2. GENERATION   — LLM (or authored content) instantiates the encounter surface
3. PRESENTATION — Game engine renders the encounter in the world
4. ENGAGEMENT   — Player interacts; lesser-cycle runs (catalyst→experience)
5. RESOLUTION   — Encounter concludes; outputs computed
6. PROPAGATION  — Outputs written to PlayerProfile and world-state
7. CHECKPOINT   — State saved; player may exit
```

Steps 1–2 are invisible to the player. Steps 3–5 are the gameplay. Steps 6–7 are invisible. The Veil (foundations/20) ensures the player experiences only steps 3–5 as "playing the game."

### 3.5 Encounter duration and the infinite checkpoint model

Encounters vary in duration (30 seconds to 15 minutes) but ALL support the infinite checkpoint model:
- The player can exit at any checkpoint within an encounter
- Progress within the encounter is saved
- The player can resume in a future session
- No encounter requires uninterrupted completion
- Session length is always player-determined

This is non-negotiable (per AGENTS.md §5.7).

---

## 4. The encounter scheduler

> **Full algorithmic specification:** see `foundations/24-encounter-scheduler.md`. This section provides the architectural overview; doc 24 provides the implementable algorithm with priority formulas, polarity-conditioned selection modes, shadow-targeting logic, transformation-window scheduling, session-level arc management, and the macro-catalyst engine.

The encounter scheduler is the world's intelligence — the algorithmic engine that decides *what* encounters to present, *when*, and *why*. It is the bridge between the Significator's needs and the Great Way's offerings.

### 4.1 Inputs

The scheduler reads three input domains:

**Significator state (from PlayerProfile):**
- Theta-decay per line (which capacities are degrading from neglect)
- Drive-balance (which drives are over/under-expressed)
- Shadow-ledger (which shadows are unresolved, which are approaching threshold)
- Polarity vector (current direction, magnitude, momentum)
- Transformation-readiness (convergence count, saturation, shadow-clearance)
- Per-line altitude and confidence bands

**World state (from Great Way):**
- Active holons and their current states (which NPCs/groups/organisations are in play)
- Current narrative beats (which story arcs are active, which are gated)
- PESTLE configuration (the macro-environment's current pressures per foundations/18)
- Holon-encounter availability (which holons have undelivered catalyst)

**Session context (from runtime):**
- Player energy estimate (derived from engagement quality, RT trends, session duration)
- Time available (inferred from session patterns; never asked directly)
- Patience signals (skip rate, pause frequency, exploration vs. goal-seeking behaviour)
- Recent encounter history (anti-repetition buffer)

### 4.2 Decision criteria

The scheduler applies the following priority stack (highest first):

1. **Theta-decay urgency:** If any line's capacity has decayed past the warning threshold, surface an encounter for that line at the decayed stage. The holon is never outgrown; neglect demands attention.

2. **Active compound shadow:** If the shadow-ledger shows a compound shadow pattern (per module-spec §6) involving 2+ modules, surface an encounter that addresses the compound — not just one module in isolation.

3. **Transformation threshold proximity:** If the Significator is approaching a Transformation threshold (per foundations/17 §2.1), enter threshold mode — surface dual-shadow encounters that address both dark (current stage) and golden (next stage) material.

4. **Polarity-conditioning:** Match encounter polarity-eligibility to the player's current crystallisation phase (per foundations/19 §5). Uncrystallised players get maximum diversity; consolidating players get temptation-tests; crystallised players get deepening encounters.

5. **Narrative gating:** Respect active narrative arcs. If a story beat requires a specific encounter sequence, honour it. Narrative gates override pure-algorithmic selection when active.

6. **Modality rotation:** Avoid presenting the same modality consecutively. Rotate across the 6 discrete modalities; the 7th (Immersive-RPG) runs continuously as ambient.

7. **Session-fit:** Match encounter duration and intensity to the player's current energy and available time. Low-energy sessions get shorter, lower-intensity encounters. High-energy sessions get catalytic peaks.

### 4.3 Output

The scheduler produces an **encounter spec** — a data structure containing:

```ts
interface ScheduledEncounter {
  moduleRef: { line: Line; stage: Stage };
  modality: GameModality;
  holonSource: HolonRef;
  role: EncounterRole;
  catalyticPurpose: 'capacity' | 'shadow' | 'drive-health' | 'threshold' | 'maintenance';
  polarityEligibility: PolarityEligibility;
  narrativeContext: NarrativeBeatRef | null;
  intensityTarget: number;  // 0.0–1.0
  durationEstimateMs: number;
}
```

This spec is passed to the content generation layer (LLM or authored content lookup) for instantiation into a playable encounter surface.

### 4.4 The scheduler never coerces

The scheduler *offers* encounters. The player *chooses* which to enter. Multiple encounter options are always available (minimum 2, typically 3–5). The player's choice of which encounter to engage is itself a signal — avoidance patterns feed back into the shadow-ledger; approach patterns confirm drive-health.

The scheduler respects the contact boundary (per foundations/13, foundations/14): it presents catalyst at the player's edge, never beyond it. If the player consistently avoids a category of encounter, the scheduler notes the avoidance (shadow signal) but does not force engagement. It re-presents the same catalyst in different modalities and narrative frames.

---

## 5. Modality → encounter-type mapping

The 7 modalities (per foundations/11) manifest in the world as distinct encounter types. Six are **discrete** — bounded gameplay sequences with clear entry and exit. One is **ambient** — always running, always observing.

### 5.1 The ambient layer: Immersive-RPG

The Immersive-RPG modality IS the world itself. It is not a discrete encounter the player enters and exits — it is the continuous experience of inhabiting the Great Way. Everything the player does *between* discrete encounters is Immersive-RPG:

- Navigation choices (where they go, what they explore, what they avoid)
- Spontaneous NPC interactions (greetings, observations, micro-dialogues)
- Environmental engagement (picking up objects, reading inscriptions, observing weather)
- High-intensity assessment-module encounters (real-time tasking with cognitive overlays)
- Resource decisions (inventory, upgrades, rest)

The Immersive-RPG modality is the **ecological validator** — it confirms whether capacities demonstrated in discrete encounters transfer to spontaneous behaviour. If a player shows high Moral-line scores in Scenario-Choice encounters but makes consistently cruel choices in free-play, the discrepancy is diagnostic.

### 5.2 The six discrete encounter types

| Modality | World manifestation | Entry trigger | Duration |
|---|---|---|---|
| **Deterministic Psychometric** | Puzzle-shrines, training grounds, challenge-arenas, chase sequences | Player approaches a shrine/arena; scheduler places one in path | 3–8 min |
| **Language-Reflective** | Campfire journals, altar prayers, mentor dialogues, dream-sequences | Player rests at a campfire; visits an altar; sleeps | 2–10 min |
| **Scenario-Choice** | NPC encounters with branching dialogue, moral dilemmas, faction negotiations | NPC approaches player; player enters a settlement; story beat triggers | 3–12 min |
| **Embodied-Somatic** | Rhythmic combat, breath-gated abilities, posture challenges, dance-rituals | Combat encounter; ritual site; physical challenge in environment | 2–8 min |
| **Strategic-Planning** | Siege planning, expedition preparation, resource allocation, territory management | War-room entry; expedition launch; faction leadership moment | 5–15 min |
| **Social-Cooperative** | Group missions with NPC parties, faction politics, council debates, teaching moments | Party formation; council summons; NPC requests aid | 5–15 min |

### 5.3 How discrete encounters arise in the world

Discrete encounters do not appear as menu selections or UI prompts. They arise *within* the Immersive-RPG layer as natural world-events:

- A puzzle-shrine glows as the player passes (Deterministic)
- A companion sits by a fire and asks "What are you thinking?" (Language-Reflective)
- A stranger blocks the path with a demand (Scenario-Choice)
- A drumbeat begins and enemies appear in rhythm (Embodied-Somatic)
- A war-council convenes and the player is asked to plan (Strategic-Planning)
- An NPC party needs a leader for a dangerous mission (Social-Cooperative)

The transition from ambient to discrete is seamless. The player experiences "something happened in the world" — not "I entered a mini-game." The Veil is maintained.

### 5.4 Modality-shadow affinity

Each modality has natural strengths for surfacing specific shadow material (per concept-drafts/README §Cross-Validation Logic):

| Modality | Surfaces most clearly |
|---|---|
| Deterministic | Capacity ceiling; dark-allergy (avoidance); golden-addiction (self-selected difficulty gap) |
| Language-Reflective | Metacognitive depth; golden-addiction (verbal performance without substrate) |
| Scenario-Choice | Value structure; moral stage; polarity orientation |
| Embodied-Somatic | Body-mind integration; somatic dark-allergy; willpower pathology |
| Strategic-Planning | Executive function; agency pathology; eros compulsion (over-planning) |
| Social-Cooperative | Interpersonal capacity; communion pathology; agency isolation |
| Immersive-RPG | Ecological transfer; spontaneous drive expression; compound shadows |

The scheduler uses these affinities when selecting modality: if the catalytic purpose is "shadow surfacing for dark-allergy on Cognitive/Red," the scheduler preferentially selects Deterministic modality (which surfaces that shadow most clearly).

---

## 6. The 3-act macro-structure

The narrative architecture (per narrative/00) maps onto the layered world as three acts, each spanning specific perceptual layers and carrying distinct developmental themes.

### 6.1 Act I — The Embodied World (Infrared, Magenta)

**Theme:** "I am alive. I imagine."

The player learns to perceive the world. The Significator is nascent — drive-profile forming, line-altitudes differentiating, first shadows surfacing. The world is primal: cave-lit, dream-saturated, symbol-rich.

**Structural role:**
- Onboarding and calibration (per MVP-BLUEPRINT §9–13)
- Significator initialisation — the PlayerProfile takes shape
- First companions gained (the animal/maternal figure, the dream-mentor)
- First encounter with the contact boundary — learning that the world responds to attention
- Polarity vector begins accumulating (first micro-choices, low weight)

**Transformation I→II:** The player is *named* — speaks their first words, chooses their first symbol, takes their first stand. Perception shifts from Infrared/Magenta layers to Red. The world sharpens from dream into force.

### 6.2 Act II — The World of Selves (Red, Amber, Orange, Green)

**Theme:** "Who am I, with whom, why?"

The bulk of gameplay. The player becomes a *self* — first as warrior (Red), then as tradition-member (Amber), then as rational individual (Orange), then as sensitive pluralist (Green). Each stage's layer reveals new dimensions of the same world.

**Structural role:**
- Four full Transformation events (Red→Amber, Amber→Orange, Orange→Green, Green→Turquoise)
- Four major antagonists, each embodying a stage-fixation (per narrative/00 §4.2):
  - The Conqueror (Red × Agency-fixation)
  - The Inquisitor (Amber × Communion-fixation)
  - The Architect (Orange × Eros-fixation)
  - The Equivocator (Green × Agape-fixation)
- The central tension: *the seductiveness of each stage*. Each layer is beautiful, meaningful, and complete-feeling. The player is tempted to stay. The antagonists embody this temptation.
- Polarity vector consolidates and begins crystallising. By late Green, most players have entered the consolidation phase (magnitude 0.3–0.6).
- All 8 lines exercised across all 4 stages = 32 modules of content

**Transformation events within Act II** follow the full Lovers Crucible pattern (per foundations/17 §2.2): Unravelling → Crucible → Emergence. Each transition costs the player something they valued at the previous stage. Each transition reveals something that was always present but imperceptible.

### 6.3 Act III — The World of Wholes (Turquoise, White)

**Theme:** "Who am I, when 'I' is one of many holons in a larger field?"

The integral and non-dual stages. The world becomes spacious — fewer encounters, deeper each. The narrative quiets. The player's *self* is transcended-and-included into larger holons.

**Structural role:**
- Two final Transformation events (Turquoise→White, White→Harvest)
- The Choice crystallises — polarity vector reaches locked phase (magnitude ≥ 0.85)
- The protagonist's future self appears as mentor at Turquoise threshold
- The protagonist *authors* their closing reflection at White (player-written text)
- The harvest endgame (post-White) — transition into 4th density (per MVP-BLUEPRINT §16)
- The world renders with maximum perceptual depth — all 8 layers simultaneously visible to the integral perceiver

**Transformation at Act III's close:** The final Transformation is not into a new stage but into a new *density*. The Significator's game-lifetime concludes. The character is retired; the psychograph preserved; the player's words become part of the world (multiplayer: mentor presence for other players).

### 6.4 How Transformation events bridge acts and stages

Each Transformation event is both a narrative climax and a mechanical phase-transition:

| Transition | Narrative beat | Mechanical shift |
|---|---|---|
| Infrared → Magenta | The first dream; the world responds to symbol | Layer 2 activates; symbol-based encounters unlock |
| Magenta → Red | The naming; the first stand | Layer 3 activates; combat system fully online |
| Red → Amber | The surrender of dominance; joining a tradition | Layer 4 activates; rule-based encounters unlock |
| Amber → Orange | The questioning; breaking from dogma | Layer 5 activates; rational/strategic encounters unlock |
| Orange → Green | The opening; feeling the other | Layer 6 activates; relational/ecological encounters unlock |
| Green → Turquoise | The integration; seeing the whole spiral | Layer 7 activates; integral encounters unlock |
| Turquoise → White | The silence; releasing the need to integrate | Layer 8 activates; non-dual encounters unlock |
| White → Harvest | The authoring; the player's final words | All layers unified; game-lifetime concludes |

---

## 7. The vertical slice (MVP Red stage)

The MVP (per MVP-BLUEPRINT) is an instance of this architecture with Red as the fully-realised layer. It demonstrates the entire Incarnation Architecture at a single stage.

### 7.1 What is present in MVP

| Architecture element | MVP instantiation |
|---|---|
| **Perceptual layers** | Red layer fully rendered; Magenta as bleed-through (onboarding prologue aesthetic); Amber as horizon-impression (faint glimpses) |
| **Encounter scheduler** | Fully operational; draws from Red-stage modules across all 8 lines |
| **64 modules** | 8 Red-stage modules populated (one per line); other 56 as stubs |
| **7 modalities** | 6 discrete encounter types within Red layer; Immersive-RPG as ambient |
| **Significator** | Full PlayerProfile with all fields; altitudes initialised by onboarding |
| **Polarity engine** | Running in background; Red STO vs Red STS choices recorded; vector accumulating |
| **Transformation** | Red→Amber threshold detectable; Amber stub gates with "more content coming" |
| **Veil** | Fully enforced; no meta-awareness exposed to player |
| **Infinite checkpoints** | Every encounter supports exit-and-resume |
| **Narrative** | Full Red arc: 24 side encounters, 3 mini-bosses, 1 main boss, 1 shadow encounter |

### 7.2 The Red layer concretely

- **Aesthetic:** Saffron/brass/weapon-walls; Yellow-Ray palette; force-based physics
- **Beings:** Warriors, warlords, beasts of dominance, the Conqueror (main boss), the Cruelty (shadow encounter)
- **Encounters:** All 8 lines represented — Echo Cast (Cognitive), Empath Read (Emotional), Choose Mercy/Justice (Moral), Witness Pause (Intrapersonal), Invoke Value (Spiritual), Reflex Dodge (Somatic), Lock Goal (Willpower), Attune (Interpersonal)
- **The Conqueror fight:** 4-quadrant phased boss (per MVP-BLUEPRINT §22) — one phase per AQAL quadrant, requiring cross-line capacity demonstration

### 7.3 What MVP proves about the architecture

The MVP is not a demo — it is a proof that the architecture works:
- The encounter scheduler selects from 8 modules across 7 modalities → the selection algorithm is validated
- The polarity engine records Red-stage STO/STS choices → the accumulation algorithm is validated
- Theta-decay triggers maintenance encounters for neglected lines → the holonic maintenance principle is validated
- The Transformation threshold is detectable (even if Amber content is stubbed) → the threshold detection algorithm is validated
- The Veil is maintained throughout → the experiential principle is validated
- The infinite checkpoint model works across all encounter types → the session model is validated

---

## 8. The content drop model

### 8.1 The 4th canon decision

Per MVP-BLUEPRINT §2, decision 4: "MVP = modular foundation of everything." The architecture is fixed at MVP launch. Every subsequent stage is a **content drop** — new data plugged into existing registries, never a re-architecture.

### 8.2 What a content drop contains

Each new stage is a self-contained package:

```
content-drops/{stage-slug}/
├── stage.module.ts          ← StageRegistry.register(...)
├── bestiary.json            ← NPCs, enemies, allies for this layer
├── narrative.json           ← Stage rite, dialogue beats, antagonist arc
├── advancement.json         ← Transformation threshold parameters
├── encounters/              ← Encounter specs for all 8 lines at this stage
├── holons.json              ← Collective holons (organisations, cultures, ecology)
└── assets/
    ├── palette.json         ← Ray-palette for this layer
    ├── audio/               ← Modal scale, instrumentation, ambient
    └── sprites/             ← Visual assets for this layer's beings and environments
```

### 8.3 What a content drop does NOT change

- The encounter scheduler algorithm
- The polarity engine
- The Transformation detection logic
- The Veil enforcement
- The PlayerProfile schema
- The modality contracts
- The registry interfaces
- The render pipeline (layers are data-driven)

### 8.4 Drop sequence

Per concept-drafts/ROADMAP and MVP-BLUEPRINT §37:

| Drop | Stages | Content volume |
|---|---|---|
| MVP | Red (full) + Infrared (prologue) | 8 modules × 7 games + narrative arc |
| Drop 1 | Amber + Magenta | 16 modules × 7 games + 2 narrative arcs |
| Drop 2 | Orange + Green | 16 modules × 7 games + 2 narrative arcs |
| Drop 3 | Infrared (full) + Turquoise + White | 24 modules × 7 games + 3 narrative arcs |
| Drop 4 | Harvest endgame | Post-White scripted content |

Each drop activates a new perceptual layer, populates new collective holons in the Great Way, and introduces new encounters drawn from the relevant line×stage modules. The player who has been playing since MVP experiences each drop as the world *deepening* — new layers becoming perceptible as their altitude advances.

### 8.5 Architectural invariant

The content drop model is possible ONLY because the Incarnation Architecture separates structure from content:
- **Structure** (fixed at MVP): registries, scheduler, polarity engine, Transformation logic, Veil, render pipeline, layer system
- **Content** (drops): stage modules, encounter specs, holon data, narrative beats, assets

This separation is the 4th canon decision made concrete.

---

## 9. How the concept-drafts plug in

### 9.1 The 512 files as design briefs

The concept-drafts directory (64 modules × 8 files each = 512 documents) is the **design brief library** for the encounter content within each line×stage module. They are not code — they are specifications that the implementation (authored content + LLM generation) draws from.

### 9.2 Module-spec → encounter scheduler input

Each `module-spec.md` provides the encounter scheduler with:

| Module-spec section | Scheduler use |
|---|---|
| §2 Shadow Archetypes | Which shadows to surface; detection signals; what to look for |
| §3 Drive-Health Landscape | Drive-balance targets; pathological indicators |
| §4 Healing Vectors | Which encounters heal which shadows; intervention strategies |
| §5 Scoring Parameters | Theta-decay rates; capacity thresholds; checkpoint progression |
| §6 Compound Shadows | Cross-module relationships; which modules to co-schedule |
| §7 Shadow Surfacing Sequence | Per-modality surfacing strategy; cross-validation rules |

The scheduler reads module-spec data (compiled into registry entries) to make informed decisions about *what* to present and *why*.

### 9.3 Game files → modality encounter designs

Each of the 7 game files per module is the design brief for ONE modality's encounter at that line×stage:

| Game file | Becomes in-game |
|---|---|
| `deterministic.md` | A discrete in-game challenge: puzzle-shrine, training ground, chase sequence |
| `language-reflective.md` | A campfire/journal/altar interaction: reflective dialogue, prayer, dream-journal |
| `scenario-choice.md` | An NPC dialogue tree: branching encounter with moral/value choices |
| `embodied-somatic.md` | A rhythmic/physical challenge: combat rhythm, breath-gate, posture trial |
| `strategic-planning.md` | A planning encounter: siege preparation, expedition design, resource allocation |
| `social-cooperative.md` | A group mission: NPC party coordination, faction negotiation, teaching moment |
| `immersive-rpg.md` | The AMBIENT design: how this module contributes to the layer's continuous feel |

### 9.4 The immersive-rpg file's special role

The `immersive-rpg.md` file for each module does not describe a discrete encounter. It describes how that line×stage's *presence* manifests in the ambient world layer:

- What environmental details reflect this capacity (e.g., Cognitive/Red → weapon-strategy inscriptions on fortress walls)
- What spontaneous NPC behaviours probe this capacity (e.g., an NPC challenges the player to a quick-thinking contest in passing)
- What exploration patterns signal this capacity's health or shadow (e.g., player avoids all puzzle-shrines → dark-allergy signal)
- What the ecological validator looks for in free-play

The 8 immersive-rpg files at a given stage collectively define the *texture* of that stage's perceptual layer.

### 9.5 From concept-draft to playable encounter

The pipeline:

```
concept-draft (design brief)
    → registry data (compiled parameters, rubrics, item-pool specs)
        → encounter spec (scheduler output)
            → content generation (LLM or authored lookup)
                → rendered encounter (Phaser scene)
                    → player engagement
                        → outputs (telemetry, consequence, polarity, integration)
```

The concept-drafts are the *source of truth* for encounter design. They are never bypassed. If implementation reveals that a concept-draft doesn't work, the concept-draft is updated first (per AGENTS.md §4.3), then implementation follows.

---

## 10. The LLM's role

### 10.1 The LLM as dynamic content generator

The LLM is not the game's brain — it is the game's *voice*. The scheduler decides *what* encounter to present; the LLM decides *how* to present it. The LLM generates the moment-to-moment surface of encounters within strict structural constraints.

### 10.2 What the LLM receives

When generating encounter content, the LLM is provided:

| Input | Purpose |
|---|---|
| The relevant concept-draft | The design brief — what this encounter must accomplish |
| The modality's structural rubric | The rules of this encounter type — what is fixed vs. variable |
| The holon context | The sourcing entity's state, relationships, history (per foundations/22) |
| The Significator state (Veil-filtered) | Current altitude, drive-balance, shadow-state — but NOT raw scores or meta-labels |
| The narrative context | Active story arcs, NPC relationship history, prior choices |
| The session context | Tone-matching parameters (energy level, time of day, recent encounters) |

### 10.3 What the LLM generates

| Content type | Constraint level |
|---|---|
| NPC dialogue (moment-to-moment) | Must stay within NPC's developmental signature and narrative arc |
| Environmental descriptions | Must match the active perceptual layer's aesthetic |
| Choice text (scenario-choice encounters) | Must present options tagged to correct developmental stages |
| Reflective prompts (language-reflective encounters) | Must probe at the player's current altitude ± 1 |
| Scenario variations | Must stay within the authored template's structural bounds |
| Side-NPC encounters | Must serve the scheduler's catalytic purpose |

### 10.4 What the LLM never does

- Decides macro-arc (which stage the player is at, whether Transformation occurs)
- Modifies the polarity vector directly
- Overrides the encounter scheduler's selection
- Violates the Veil (exposes meta-information to the player)
- Generates content outside the active perceptual layer
- Contradicts authored canonical content (world bible, key NPC arcs, stage rites)
- Scores the player or provides clinical feedback

### 10.5 The rubric constraint

Every modality has a **structural rubric** — a fixed contract that the LLM must honour:

- Deterministic: the LLM generates framing/narrative only; the task mechanics are fixed code
- Language-Reflective: the LLM generates prompts and scores responses against developmental rubrics
- Scenario-Choice: the LLM generates scenario text and option text; option-tags are pre-authored
- Embodied-Somatic: the LLM generates narrative framing only; timing/rhythm mechanics are fixed code
- Strategic-Planning: the LLM generates scenario context; planning mechanics are fixed code
- Social-Cooperative: the LLM generates NPC dialogue and behaviour within authored personality constraints
- Immersive-RPG: the LLM generates ambient descriptions, micro-dialogues, environmental flavour

The pattern: **fixed mechanics + adaptive content**. The LLM fills the surface; the code enforces the structure.

### 10.6 Detailed implementation

Full specification of the LLM integration — context window management, prompt engineering, rubric formats, scoring protocols, and holon-context threading — is deferred to foundations/22 (Holon Context Engine).

---

## 11. Authored vs generated boundary

### 11.1 The principle

Mysterium's content exists on a spectrum from fully-authored (hand-written, canonical, immutable) to fully-generated (LLM-produced, contextual, ephemeral). The boundary between them is precise and non-negotiable.

### 11.2 What is authored (hand-written, canonical)

| Content type | Why authored |
|---|---|
| Stage rites (Transformation events) | Too important to leave to generation; must be precisely crafted |
| Key NPC arcs (allies, antagonists, mentors) | Character consistency across the entire game-lifetime requires authorial control |
| Main-boss fights (mechanical design) | 4-quadrant phased fights require precise mechanical authoring |
| Transformation event sequences | The Lovers Crucible must be carefully paced and emotionally calibrated |
| The canonical world bible | The metaphysics, cosmology, and world-rules are fixed |
| Registry data (module-specs, scoring parameters) | The developmental science must be precise |
| Modality rubrics and contracts | The structural rules of each encounter type are fixed |
| Concept-drafts themselves | The design briefs are authored specifications |
| The encounter scheduler algorithm | The world's intelligence is engineered, not generated |
| Polarity engine parameters | The crystallisation dynamics are designed, not emergent |

### 11.3 What is generated (LLM-produced, contextual)

| Content type | Why generated |
|---|---|
| Moment-to-moment NPC dialogue | Must adapt to player's choices, altitude, and context |
| Encounter-specific descriptions | Must match current world-state and session context |
| Side-NPC encounters (non-canonical) | Provide variety without requiring authoring of thousands of NPCs |
| Environmental flavour text | Must match perceptual layer and player's current experience |
| Scenario variations within authored templates | Prevent repetition across sessions |
| Reflective prompt variations | Must meet the player at their specific edge |
| Language-reflective scoring | Requires developmental rubric application to free-text |

### 11.4 The boundary rule

> The LLM never decides macro-arc; it fills in moment-to-moment surface within authored constraints.

Concretely:
- **Authored** = anything that, if wrong, would break the developmental model or narrative coherence
- **Generated** = anything that, if slightly different, would still serve the same catalytic purpose

The authored layer is the skeleton; the generated layer is the flesh. The skeleton determines the shape; the flesh makes it alive.

---

## 12. Architectural invariants

These invariants are enforced by the engine at startup or via property-based tests. Violation is a build break.

### 12.1 Encounter invariants

- Every encounter carries `(line, stage, modality, holonSource, role, ray, polarityEligibility)` — no null coordinates
- Every encounter operates the full lesser-cycle: catalyst presentation → experience processing → integration signal
- Every encounter produces outputs to at least one of: telemetry, consequence vector, polarity vector, integration signal
- Every encounter supports the infinite checkpoint model — exit at any checkpoint, resume later
- No encounter exceeds 15 minutes without an intermediate checkpoint

### 12.2 Transformation invariants

- Every Transformation requires accumulated threshold: `convergence_minimum` lines at edge + `saturation_threshold` catalyst + shadow-clearance
- Every Transformation includes the dual-shadow window: dark shadows of current stage AND golden shadows of next stage must be addressed
- Every Transformation produces an irreversible perceptual layer-shift
- No Transformation can be triggered by a single encounter or a single session
- Failed Transformation produces graceful regression, never punishment

### 12.3 Polarity invariants

- Polarity is multi-scale: per-encounter trace → per-cell vector (64) → per-line profile (8) → master polarity (1). See foundations/19 for the full model.
- Every choice-point in every encounter produces a polarity trace with four dimensions: drive directionality, energetic direction, stage orientation, source-of-nourishment
- Per-cell polarity textures are grounded in the concept-drafts' shadow/drive ontology (see foundations/23 for the 64-cell catalogue)
- The polarity engine never steers the player toward either pole — it provides authentic conditions for crystallisation
- STO and STS are both valid evolutionary paths; both are playable with mechanical fairness
- The exploratory state (uncrystallised) is legitimate and default through Acts I-II — not a failure mode
- Master polarity crystallises only when ≥6 lines show coherent direction at altitude ≥ Orange
- Reversal is never prevented — free will is absolute — but crystallisation has inertia proportional to coherence
- The polarity vector is never visible to the player (Veil enforcement)

### 12.4 Veil invariants

- The Veil is enforced at the UI/UX layer — no meta-information is ever exposed to the player
- No numerical scores, stage labels, shadow names, drive values, or polarity readings appear in the player-facing interface
- The player experiences qualitative feedback only: "clean / tight / loose / fumbled" (per MVP-BLUEPRINT §24)
- The codex is player-authored — the game never writes clinical assessments into it
- The radial chart shows *relative* progress without numerical values

### 12.5 Significator invariants

- The PlayerProfile persists across all sessions — the Significator is never reset without explicit player action
- The player can delete their profile at any time (sovereignty over own record)
- The profile is encrypted on-device and never transmitted in identifiable form
- The Distortion Ledger is read-only to the encounter scheduler — only encounter outcomes write to it
- The player can exit at any checkpoint; the Significator persists exactly as it was at that checkpoint

### 12.6 World invariants

- ONE world, not multiple — all players inhabit the same geography (perceived through different layers)
- Every holon in the Great Way has a line×stage signature, drive profile, shadow state, and ray binding
- Holons evolve, regress, and transform independently of the player (the world is alive)
- Theta-decay on lower layers produces bleed-through — neglected stages intrude perceptually
- The encounter scheduler respects the contact boundary — presents catalyst at the edge, never beyond

### 12.7 Content drop invariants

- Adding a new stage is a content drop, never an engine modification
- Every content drop must satisfy all encounter invariants for its new encounters
- Every content drop must include a main-boss encounter covering all 4 AQAL quadrants
- The plugin contract (MVP-BLUEPRINT §6) is the only interface between drops and engine

---

## 13. What this document does NOT cover (cross-references)

This document is the master synthesis. It references but does not duplicate the following:

| Topic | Document | What it covers that this one does not |
|---|---|---|
| Greater-cycle pure theory | foundations/15 | The theoretical substrate: Significator, Transformation, Great Way, Choice as archetypal structures |
| Significator data architecture | foundations/16 | PlayerProfile schema, Distortion Ledger internals, free-will design commitments |
| Transformation event mechanics | foundations/17 | Threshold detection formulas, Crucible phase design, ego-dissolution principles, regression handling |
| Great Way world-system | foundations/18 | Holon taxonomy (individual through cosmic), PESTLE dimensions, co-creation dynamics |
| Choice & polarity engine | foundations/19 | Multi-scale polarity model (4 levels), STO/STS reconciliation, aggregation, crystallisation dynamics, harvest thresholds |
| Polarity ontology | foundations/23 | The 64-cell polarity texture catalogue — per-line×stage STO/STS/exploratory textures grounded in concept-drafts |
| Encounter scheduler algorithm | foundations/24 | The full implementable algorithm: priority formula, polarity-conditioned selection, shadow-targeting, transformation-window, session-arc, macro-catalyst engine |
| Veil of Forgetting | foundations/20 | The experiential principle in full — why the Veil exists, how it is enforced, edge cases |
| LLM / Holon Context Engine | foundations/22 | Prompt engineering, context window management, rubric formats, holon-context threading |
| Lesser-cycle catalyst flow | foundations/14 | Catalyst→Experience→Integration mechanics within a single encounter |
| Game modalities | foundations/11 | The 7 modalities in full — what each measures, triangulation principle, per-modality specs |
| Shadow model | foundations/10 | The 4-quadrant shadow model, 256-shadow matrix, detection mechanics |
| Drives and polarities | foundations/05 | The 4 drives as motivational primitives, dual-domain model |
| Architecture of consciousness | foundations/13 | 5-layer topography, contact boundary, Matrix/Potentiator dynamics |
| Concept-draft templates | concept-drafts/README.md | File templates, uniqueness principle, development priority |
| Narrative architecture | narrative/00 | 3-act structure in narrative detail, NPC categories, narrative-mechanic compact |
| MVP build plan | MVP-BLUEPRINT.md | Phased delivery, acceptance criteria, technical foundation, registry pattern |

---

*This document is the keystone. If read alone, it tells a developer: this is what the game IS at a structural level. Every other document in the R&D set provides depth on one facet; this document provides the composition of all facets into a single playable architecture.*

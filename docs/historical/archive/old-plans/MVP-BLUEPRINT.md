> **Implementation Scope Notice:** The implementation details in this document
> (ATB combat, BattleScene, HP/Mana, DamageCalculator, specific `src/` tree in section 27)
> are superseded by `UNIFIED-IMPLEMENTATION-PLAN.md`. The **vision** (Parts I-IV),
> **canon decisions** (section 2), and **modular architecture philosophy** (sections 4-8) remain
> authoritative. For the binding build plan, see `UNIFIED-IMPLEMENTATION-PLAN.md`.

# MVP Blueprint — The Definitive Build Plan

> **Status:** v1.0 — load-bearing. This document is the *binding plan*
> for building Mysterium to MVP. Every PR, every module, every content
> drop traces back to a numbered section here. It supersedes anything
> in `/docs/` it disagrees with; if it ever does, this document is
> updated and the loser is corrected.

---

## Part I — Vision restated, with the four canon decisions

### 1. The vision in one paragraph

Mysterium is a **role-playing fighting game** whose every gameplay verb is
the gamification of a validated developmental assessment, whose
macro-progression is the eight stages of consciousness (Infrared →
White), and whose endgame is the harvest into 4th-density unity
consciousness in the canonical Law-of-One framing. It is built for
**neurological, biological, and psychological development of any
human with a working mind/brain cognition**, irrespective of age or
prior experience, through an adaptive onboarding that seats each
player precisely at their current developmental altitude. It is
**built personally and shipped globally**.

### 2. The four resolved canon decisions

| # | Decision | Implication |
|:-:|---|---|
| 1 | **Law-of-One layer = canon, fully integrated** | The 7 energy rays are first-class types; the 8-stage / 7-ray sub-octave correspondence is canon; harvest into 4th density is the post-White endgame; the world's metaphysics is explicitly the Ra material's cosmology. Visuals, audio, narrative, codex, and game-state all carry ray information. |
| 2 | **No clinical / IRB ambition; effective efficacy required** | We do not pursue regulated medical-device claims. We *do* commit to designs that are *legitimately* neuroplastically, cognitively, and developmentally efficacious — measured by validated tasks and honest telemetry — without the regulatory overhead of clinical certification. |
| 3 | **Adaptive onboarding for any age, any altitude** | A 7-year-old at Magenta and a 70-year-old at Green must each find the game *meeting them where they are* within the first 20 minutes. Onboarding *calibrates*; the game *adjusts*. There is no fixed entry difficulty. |
| 4 | **MVP = modular foundation of everything** | The MVP ships the *complete architectural skeleton* (every line, every stage, every quadrant, every ray as a registered module) plus the *first vertical slice* of fully-playable content (Red stage, top-to-bottom). Adding the rest of the content is a *content drop*, not a re-architecture. |

These four decisions shape every section below.

### 3. The MVP commitment

> **MVP = modular skeleton + Red-stage vertical slice + adaptive
> onboarding + canonical Law-of-One stack, deployable to web and
> Android, ship-ready and globally accessible.**

What this concretely means is enumerated in Part V.

---

## Part II — The modular architecture (the technical spine)

The MVP's load-bearing engineering decision: **everything in Mysterium is
a registered module**. New stages, new lines, new tasks, new
encounters, new ray correspondences are *data files plus a small
adapter*, never engine modifications.

### 4. The registry pattern

The engine boots, scans `core/registries/`, and registers all modules
into typed registries. Game code never references a specific module
directly — it asks a registry by coordinate.

```
type Registry<K extends string, V> = {
  register(key: K, value: V): void;
  get(key: K): V | undefined;
  all(): ReadonlyArray<readonly [K, V]>;
  keysFor(filter: Partial<V>): ReadonlyArray<K>;
};
```

### 5. The eight canonical registries

| Registry | Key | Value | What it holds |
|---|---|---|---|
| **LineRegistry** | `Line` | `LineModule` | The 8 lines of intelligence with their tasks, verbs, ceilings |
| **StageRegistry** | `Stage` | `StageModule` | The 8 stages with their world bibles, bestiaries, advancement criteria |
| **RayRegistry** | `Ray` | `RayModule` | The 7 Law-of-One rays with their palettes, audio modes, codex entries, harvest correspondences |
| **TaskRegistry** | `TaskSlug` | `TaskModule` | The cognitive tasks (n-back, Stroop, …) with parameters, scorers, network claims |
| **AbilityRegistry** | `AbilitySlug` | `AbilityModule` | The combat verbs (echo cast, chromatic parry, vow, …) bound to a line + task |
| **EncounterRegistry** | `EncounterId` | `EncounterModule` | Side / mini / main / shadow encounters, each tagged `(lines, stage, quadrants, role, taskBinds, drive)` |
| **DriveRegistry** | `Drive` | `DriveModule` | Agency / Communion / Eros / Agape with their pathologies and combat modifiers |
| **NarrativeRegistry** | `BeatId` | `NarrativeBeatModule` | Dialogue beats, cutscenes, codex entries, stage rites |

Each registry's module shape is small (≤ 30 lines of TS) and
deliberately data-heavy. Engine logic is generic over the registry.

### 6. The plugin contract

A new content drop is *exactly* one of:

- A `*.module.ts` file under the appropriate registry directory that
  exports a `register()` function.
- An optional `*.json` data file consumed by the module.
- An optional asset bundle (sprites, audio, shader uniforms) keyed by
  the module's slug.

Adding the Magenta stage post-MVP, for example, is:

```
core/registries/stages/02-magenta/
├── stage.module.ts          ← exports the StageModule
├── bestiary.json            ← the stage's enemy roster
├── narrative.json           ← stage rite, dialogue beats
├── advancement.json         ← stage gate criteria
└── assets/
    ├── palette.json
    ├── audio/
    └── sprites/
```

`stage.module.ts` calls `StageRegistry.register('Magenta', module)`
and the engine instantly serves it. **No engine code changes.** This
is the modularity contract.

### 7. Invariants the engine enforces

These are checked at startup or via property-based tests. A failure
is a build break, not a runtime error.

| Invariant | Why |
|---|---|
| Every `Line` registered has at least one `Ability` | A line with no abilities cannot be exercised. |
| Every `Stage` registered has at least one main-boss `Encounter` | A stage cannot be cleared. |
| Every `Encounter` carries `(lines, stage, quadrants, role)` non-null | Per `enemies/00`. |
| Every main-boss `Encounter` covers all 4 quadrants | The integral synthesis rule from `foundations/01`. |
| Every `Stage` has an associated `Ray` | Law-of-One canon (decision 1). |
| Every `Ability` references a `Task` that exists in `TaskRegistry` | No orphan abilities. |
| Every `Task` carries a `NetworkClaim` (citation to brain network) | Per `foundations/07`. |
| Stage advancement is a *pure function* of `PlayerProfile` | Per `foundations/02`. |

If a content drop violates any of these, CI fails before the build
ships.

### 8. Why this matters at MVP

The MVP must contain **all eight registries with the correct
interfaces and at least one entry each**, even if seven of the eight
stages have only stub content. The skeleton itself is the deliverable
— the eighth-stage ascent can be added as content drops later
*without architectural change*. This is what "MVP = modular
foundation of everything" means.

---

## Part III — Adaptive onboarding (the universal access layer)

The single most important MVP UX system. Without it, the game is
calibrated for one altitude (probably the author's) and fails its
global-deployment promise.

### 9. The four onboarding goals

1. **Identify the player's altitude per line** — without asking them
   to take a clinical assessment.
2. **Seat the player into stage-appropriate content** — they enter
   the game world at their stage of consciousness.
3. **Establish the staircase per task** — so combat opens at flow
   threshold.
4. **Respect dignity** — never patronise (kid placed too low) or
   crush (adult placed too high).

### 10. The onboarding architecture

A short interactive sequence (~10–20 minutes) that *plays as a game*
— it does **not** present as a quiz.

#### 10.1 Phase 1 — The dream sequence (minutes 0–4)

A wordless prologue that touches all four quadrants:

| Beat | Quadrant | Probe |
|---|---|---|
| Awaken in a hearth-lit cave | UR | Reflex: tap a falling ember (reaction time) |
| See a totem painted on the wall | UL | Imagery recall (1-back; "did you see this symbol?") |
| Hear a distant voice — name a feeling | UL | Affect identification (3 facial-affect cards, pick one) |
| Pass through a doorway alongside a companion | LL | Coordination tap (rhythm-sync with companion's footstep) |
| Tend the hearth, save kindling for tomorrow | LR | Resource decision (eat now / save) |

These five beats yield a first low-fidelity **altitude estimate per
line**, as well as a **drive-tilt** estimate.

#### 10.2 Phase 2 — The threshold (minutes 4–10)

A short combat interlude that confirms or revises the Phase 1
estimate. The game presents an enemy whose attack pattern *adapts in
real time* to the player's responses. The player attempts to:

- Dodge / parry (somatic + inhibitory control)
- Cast their first symbol-spell (cognitive working memory at n=1)
- Choose to spare or strike a wounded creature (moral seed)
- Speak (or not speak) to a watching companion (interpersonal seed)

A continuous-staircase per micro-task converges within 5–10 trials
to a per-line altitude estimate accurate to ±1 stage.

#### 10.3 Phase 3 — The first horizon (minutes 10–20)

The game *names* (in narration, not in UI numerics) what it has
estimated, in narrative form:

> "You have hands that know how to grip what is dropped to them.
> You have a tongue that has not yet found the word for what stirred
> in you when the wounded creature looked up. You walk well alone;
> you have not yet walked well with another. Begin from where you
> stand. The world is waiting."

This is then crystallised in the radial chart's first reveal — the
psychograph as the player's *living portrait*. The player can choose
their first encounter from a small set, all calibrated to their
inferred altitudes.

### 11. The calibration algorithm (lightweight DDA inside onboarding)

Each onboarding probe runs a *fast staircase* (3–6 trials max) per
task. The fast staircase uses larger step sizes than steady-state
DDA (≈1.4× per reversal) and an aggressive convergence rule (any 2
reversals → seat at midpoint). Output: a per-line altitude estimate
with a confidence band.

If confidence is low (player's responses are inconsistent), the
onboarding adds optional *deepening probes* — extra side-content the
player can decline. Decline is honoured; the band stays wide; the
real-game DDA tightens it as play continues.

### 12. Age and locale awareness without disclosure

Mysterium **never asks the player's age or location**. Instead, signal
without disclosure:

- **Vocabulary band** of opening narration is autodetected from the
  player's first text input (codex name, first dialogue choice). Low
  vocabulary → simpler narration; rich vocabulary → richer narration.
- **Reflex windows** in Phase 1 self-tune to the player's measured
  reaction time in the first 60 seconds — without exposing the
  measurement.
- **Cultural / locale-specific affect-recognition stimuli** are
  served from a multi-cultural corpus (NimStim + JACFEE + RaFD +
  custom). The corpus rotation is randomised, not selected by IP.
- **Audio-language**: opening narration is wordless or in the
  device's locale's phonemes; first ally voice is non-binary,
  multi-lingual, recorded in 8+ languages with player choice in
  Phase 3.

This produces an experience that *feels* personalised without
collecting any demographic data.

### 13. The "Stage 0 no-content gate"

If a player's onboarding suggests they cannot operate at *any*
altitude — extreme cognitive impairment, severe motor difficulty,
sensory issue not addressed by accessibility — the game *does not
fail them*. It opens a permanent Stage-0 mode: contemplative
soundscape, breath-paced visuals, no combat, gradual capacity
appearance over time. This is the floor below Infrared. It exists
so that the global-deploy promise is honest.

---

## Part IV — The canonical Law-of-One stack (now load-bearing canon)

Per decision 1, the Ra material's cosmology is canon — fully
integrated into the world's metaphysics, not a removable aesthetic
layer.

### 14. The seven energy rays as first-class types

```
type Ray =
  | 'Red'      // Root / foundation — survival
  | 'Orange'   // Sacral — emotional identity
  | 'Yellow'   // Solar plexus — ego / will
  | 'Green'    // Heart — first love
  | 'Blue'     // Throat — co-creator (bidirectional)
  | 'Indigo'   // Brow — gateway / vision
  | 'Violet';  // Crown — integration / harvest
```

`Ray` is a canonical core type (alongside `Stage`, `Line`, `Quadrant`,
`State`, `Drive`). It is read by:

- The renderer (palette uniforms, shader tints)
- The audio engine (modal scale selection, instrumentation)
- The narrative engine (codex entries, stage-rite invocations)
- The combat engine (ray-aligned ability bonuses)
- The harvest endgame (post-White content gating)

### 15. The 8 × 7 sub-octave correspondence

The canonical mapping (from `foundations/06`, now promoted):

| Stage | Ray | Sub-octave note |
|---|---|---|
| Infrared | Red | Foundation — "basic strengthening ray" |
| Magenta | Orange | Emotional / fantasy / sacral life |
| Red | Yellow | Ego / will / "great stepping-stone ray" |
| Amber | Green | First heart-opening, ethnocentric love |
| Orange | Blue (in) | Co-creator inflow — rational investigation |
| Green | Blue (out) | Co-creator outflow — pluralistic radiation |
| Turquoise | Indigo | Gateway opens — vision-logic |
| White | Violet (with Indigo traversed) | Total integration — harvest readiness |

This is *not* aesthetic correspondence. It is the metaphysical
truth of the world. Every stage's content carries explicit ray
information in its data row. Every player's `PlayerProfile` records
their *violet-ray expression* — the integration-quality across the
seven prior rays — which is the harvest criterion.

### 16. The harvest end-game

Post-White content is the **harvest into 4th density** — the
transition from the 3rd-density experience of self-conscious-awareness-
and-polarity-choice to the 4th-density experience of unity
consciousness and social-memory complex.

The harvest end-game is **scripted**, not procedural. It consists of:

- A series of contemplative rites (extension of the White world's
  Last Threshold encounter)
- The player's authored *closing reflection*
- A "graduation cutscene" rendered in the violet-ray palette
- Multiplayer: the player becomes a **mentor presence** in other
  players' worlds — appearing as an NPC with the player's chosen
  voice and codex-quote
- The player's character is *not deleted* but *retired*; their
  developmental psychograph is preserved as an immutable record
  visible in the codex

Harvest is not in MVP. The skeleton is in MVP — the `Ray` type, the
violet-ray expression tracking, the data fields. Harvest content
drops as a post-MVP module.

### 17. The world's metaphysics, in one paragraph

> The world the player inhabits is **3rd density** — the density of
> self-conscious awareness and the polarity-choice — and within it,
> the player ascends through the seven energy rays as sub-octaves.
> The eight stages of consciousness are the holographic recapitulation
> of the entire density octave inside this density, mediated through
> the bidirectional Blue-Ray (Orange / Green) and the gateway
> Indigo-Ray (Turquoise / lower White). The harvest at the apex is
> the transition into 4th density — the density of universal love
> and social-memory complex. This world's metaphysics is the *Law of
> One*, sourced from the Ra material as canonised in
> `foundations/06`. NPCs operate within this metaphysics; the codex
> elaborates it; the gameplay enacts it.

### 18. UX consequence — explicit ray UI

The radial chart now has a **ray ring** — an outermost concentric
band that lights up the ray colour the player's current
violet-ray expression most resembles. This is the harvest-readiness
indicator. Late-game players see their violet-ray ring slowly fill
as integration deepens; early-game players see it dim, indicating
the road ahead.

---

## Part V — MVP content scope

### 19. Stage selection: Red

The MVP ships **Red stage** as the only fully-playable content stage,
with onboarding capable of seating any player at any altitude
(but routing them through the calibrated Red experience for MVP).

**Why Red and not Infrared (the chronological start)?**

- Red has *real combat*. Infrared is contemplative-tutorial; it
  cannot demonstrate the combat engine.
- Red has *real moral content*. Infrared is pre-moral.
- Red has *real ego-self*. Infrared is fused with environment.
- Red is *dramatically rich* — fortresses, warlords, banners — and
  that drama is what proves the genre wrap.
- Red is *culturally universal* — power, honour, dominance, mercy
  read across every human culture; Magenta's animism is more
  culturally specific.

**However:** the *onboarding prologue* (Part III) is itself
**Infrared-flavoured** content (cave, hearth, dream-companion). It
serves as both the calibration system and the first taste of
Infrared aesthetics. So both stages exist in MVP — Infrared as
prologue, Red as the main playable arc.

A player who calibrates as below-Red is routed through an extended
Infrared experience that gradually leads them to Red. A player who
calibrates as above-Red sees Red world content presented at higher
altitudes (sub-octave variants) until later stages are content-dropped.

### 20. Eight line MVP verbs (one minimum-viable per line)

| Line | MVP verb | Cognitive task vehicle | Acceptance |
|---|---|---|---|
| Cognitive | Echo Cast | n-back (n=1 to n=3) | Working at all 3 levels with 70.7% staircase |
| Emotional | Empath Read | Affect-recognition (Ekman 6) | RT < 1500 ms baseline; cultural corpus |
| Moral | Choose Mercy / Justice | Dilemma decision | At least 6 dilemmas in Red bestiary |
| Intrapersonal | Witness Pause | Sustained attention + meta-label | Pause-and-label sub-task working |
| Spiritual | Invoke Value | Player-authored value + alignment | Free-text value entry; coherence tracking |
| Somatic | Reflex Dodge + Postured Stance | Reaction time + held-input | Calibrated to player's measured RT |
| Willpower | Lock Goal | Pre-fight goal declaration | At least 3 goal types selectable |
| Interpersonal | Attune | Dyadic affect-read with NPC ally | Single-player NPC partner working |

That is **8 verbs × 1 task each = 8 cognitive tasks** in the MVP
TaskRegistry minimum. Plus the breathing/rhythm task for
state-training (Part VI), totalling **9 tasks**.

### 21. Cognitive task MVP set (TaskRegistry minimum)

| Task | Slug | MVP parameter range | Network claim |
|---|---|---|---|
| n-back | `n_back` | n ∈ {1, 2, 3}, ISI 1500 ms → 700 ms | FPCN |
| Stroop | `stroop` | colour-word, 4 colours, SOA 1200 → 600 ms | dACC, anterior insula |
| Simon | `simon` | 2 directions, distractor strength variable | Frontoparietal |
| Go/No-Go | `go_no_go` | 70/30 ratio, RT deadline 800 → 400 ms | rIFG, pre-SMA |
| Affect recognition | `affect_recognition` | Ekman 6, multi-cultural corpus | TPJ, mPFC |
| Dilemma decision | `dilemma_choice` | 4-option, latency tracked | vmPFC, TPJ |
| Reaction time | `reaction_time` | calibrated to player baseline | Motor / cerebellar |
| Held input (posture) | `held_input` | held duration, perturbation | Motor / cerebellar |
| Breath-paced rhythm | `breath_rhythm` | manual or accelerometer-paced | Insula, parasympathetic |

Other tasks (Corsi, WCST, Tower of London, complex span,
task-switching, dyadic-tap) are **post-MVP content drops** — the
TaskRegistry is ready for them; the modules ship later.

### 22. Quadrant coverage in MVP

All four quadrants are exercised in MVP:

- **UL** — Empath Read, Witness Pause, Invoke Value, Choose Mercy
- **UR** — Echo Cast, Reflex Dodge, Postured Stance, Go/No-Go
- **LL** — Attune (NPC ally coordination), companion dialogue
- **LR** — Resource decision (eat now / save), terrain use, encounter scheduling

The Red main boss fight has a phase per quadrant (per `stages/03 §6.3`).

### 23. Narrative MVP

- Full Infrared prologue (the dream sequence + threshold + first
  horizon, ~20 min)
- Full Red world arc — opening, three side encounters per line (24
  side encounters), three mini-bosses (one per line-pair: Cog×Som,
  Cog×Will, Mor×Spi), one main boss (The Conqueror), one shadow
  encounter (The Cruelty)
- One ally companion who travels with the player from Infrared
  prologue through Red main boss
- One mentor cameo at the Red→Amber threshold (foreshadowing)
- Codex framework with auto-entries on first encounters and
  player-authored entries at stage rite

Estimated content size: ~30 unique encounters, ~6 hours of focused
Red play.

### 24. UX MVP

- Radial chart (8 spokes, 8 rings, ray-tinted ring outer band)
- Combat HUD (HP, mana, ATB gauges; cognitive overlay region)
- Cognitive overlay sub-system (one overlay per task)
- Codex (auto + player-authored entries)
- Settings (accessibility, audio language, stimulus-corpus
  preference, content warnings)
- No analytics dashboard exposing numerical scores in MVP — the
  *qualitative* feedback band ("clean / tight / loose / fumbled") is
  the player-facing signal. Numerics are in a hidden developer mode
  for tuning.

### 25. Web + Android targets

- **Web:** primary dev target via Vite, deployable as a static SPA.
- **Android:** Capacitor wrap of the web build, with
  Preferences-API persistence, hardware-back intercept, safe-area
  handling. Minimum API 28 (Android 9).
- **iOS / desktop:** out of MVP. The pure-TS core is portable; future
  ports are content-only work.

### 26. Telemetry skeleton

- All telemetry **encrypted at rest on device** (local-first).
- A sync-toggle in settings, **off by default**, that uploads
  anonymised aggregates only — no raw response streams, no PII.
- A "developer mode" gated by build flag for the author's own
  granular telemetry.
- Sensitive data classes (raw response patterns, dilemma choices,
  player-authored text) **never leave the device** in MVP.

This is the ethical floor of `validation/02` (deferred doc) and is
sufficient for global deployment without a clinical / regulatory
review.

---

## Part VI — MVP technical foundation

### 27. Extending the existing `src/` tree

The current repo has a working ATB + n-back + Stroop core. The MVP
extends this without replacing it. The target tree:

```
src/
├── core/                              ← pure TS; no Phaser; no I/O
│   ├── domain/                        ← entities & value objects
│   │   ├── Battler.ts                 ← (exists)
│   │   ├── Spell.ts                   ← (exists)
│   │   ├── Stats.ts                   ← (exists)
│   │   ├── PlayerProfile.ts           ← NEW — psychograph + altitudes + drives + ray
│   │   ├── Encounter.ts               ← NEW — typed encounter spec
│   │   ├── Stage.ts                   ← NEW — Stage type + per-stage data
│   │   ├── Line.ts                    ← NEW — Line type + per-line data
│   │   ├── Ray.ts                     ← NEW — Ray type + sub-octave map
│   │   ├── Drive.ts                   ← NEW
│   │   └── State.ts                   ← NEW (Gross/Subtle/Causal/Witness/NonDual)
│   ├── usecases/                      ← combat math & cognitive task generators
│   │   ├── ATBEngine.ts               ← (exists)
│   │   ├── DamageCalculator.ts        ← (exists)
│   │   ├── NBackTask.ts               ← (exists)
│   │   ├── StroopTask.ts              ← (exists)
│   │   ├── RandomSource.ts            ← (exists)
│   │   ├── SimonTask.ts               ← NEW
│   │   ├── GoNoGoTask.ts              ← NEW
│   │   ├── AffectRecognitionTask.ts   ← NEW
│   │   ├── DilemmaTask.ts             ← NEW
│   │   ├── ReactionTimeTask.ts        ← NEW
│   │   ├── HeldInputTask.ts           ← NEW
│   │   ├── BreathRhythmTask.ts        ← NEW
│   │   ├── Staircase.ts               ← NEW (1u/2d staircase)
│   │   ├── StageSynthesizer.ts        ← NEW (altitudes → stage)
│   │   ├── ShadowDetector.ts          ← NEW (fixation/regression/repression)
│   │   ├── OnboardingCalibrator.ts    ← NEW (Part III)
│   │   └── RegistryEngine.ts          ← NEW (Part II)
│   └── registries/                    ← NEW — every module registered here
│       ├── lines/                     ← 8 line modules
│       │   ├── 01-cognitive.module.ts
│       │   ├── 02-emotional.module.ts
│       │   ├── 03-moral.module.ts
│       │   ├── 04-intrapersonal.module.ts
│       │   ├── 05-spiritual.module.ts
│       │   ├── 06-somatic.module.ts
│       │   ├── 07-willpower.module.ts
│       │   └── 08-interpersonal.module.ts
│       ├── stages/                    ← 8 stage modules; 1 fully populated, 7 stubs
│       │   ├── 00-infrared/
│       │   ├── 01-magenta-stub/
│       │   ├── 02-red/                ← FULLY POPULATED in MVP
│       │   ├── 03-amber-stub/
│       │   ├── 04-orange-stub/
│       │   ├── 05-green-stub/
│       │   ├── 06-turquoise-stub/
│       │   └── 07-white-stub/
│       ├── rays/                      ← 7 ray modules (canon)
│       ├── tasks/                     ← 9 task modules (MVP set)
│       ├── abilities/                 ← 8+ ability modules (MVP verbs)
│       ├── encounters/                ← 30+ encounter data files
│       ├── drives/                    ← 4 drive modules
│       └── narrative/                 ← MVP narrative beats
│
├── infra/                             ← I/O adapters
│   ├── persistence/                   ← (exists; extend with profile schema)
│   ├── native/                        ← (exists; back-button)
│   ├── crypto/                        ← NEW — at-rest encryption for telemetry
│   ├── i18n/                          ← NEW — locale-aware narration
│   └── analytics/                     ← NEW — opt-in aggregates only
│
└── game/                              ← Phaser layer
    ├── main.ts                        ← (exists)
    ├── config.ts                      ← (exists)
    ├── keys.ts                        ← (exists)
    ├── events.ts                      ← (exists; extend)
    ├── textures.ts                    ← (exists)
    ├── ray-shaders/                   ← NEW — per-ray shader uniforms
    ├── objects/
    │   └── ProjectilePool.ts          ← (exists)
    ├── ui/
    │   ├── Button.ts                  ← (exists)
    │   ├── StatBar.ts                 ← (exists)
    │   ├── RadialChart.ts             ← NEW — psychograph view
    │   ├── CodexView.ts               ← NEW
    │   └── CognitiveOverlay/          ← NEW — one overlay per task
    └── scenes/
        ├── BootScene.ts               ← (exists)
        ├── PreloaderScene.ts          ← (exists)
        ├── OnboardingScene.ts         ← NEW (Part III)
        ├── MainMenuScene.ts           ← (exists; reskin with ray palette)
        ├── BattleScene.ts             ← (exists; extend for new tasks)
        └── UIOverlayScene.ts          ← (exists; extend for codex / radial)
```

The columns marked `(exists)` are kept as-is or lightly extended.
The MVP build is *additive* over the current src/ — no rewrites.

### 28. The data schemas (types only; no implementations here)

```ts
interface PlayerProfile {
  id: string;
  createdAtMs: number;
  altitudes: Record<Line, Stage>;
  stage: Stage;                                  // synthesised
  rayProfile: Record<Ray, number>;               // 0..1 per ray; violet computed
  states: Record<State, { unlocked: boolean; depth: number; minutesPracticed: number }>;
  drives: { weights: Record<Drive, number>; fixationRisk: Record<Drive, number> };
  taskStaircases: Record<TaskSlug, StaircaseState>;
  vows: Vow[];
  shadows: ShadowSignal[];
  codexEntries: CodexEntry[];
  primaryValue: string;                          // player-authored
  onboardingComplete: boolean;
  totalSessionsPlayed: number;
}

interface EncounterSpec {
  id: string;
  lines: Line[];
  stage: Stage;
  quadrants: Quadrant[];
  role: 'side' | 'mini' | 'main' | 'shadow';
  ray: Ray;                                       // canonical sub-octave assignment
  drive?: { fixated: Drive; absent: Drive };
  taskBinds: TaskBind[];
  narrative: { theme: string; allyBeats: BeatId[]; codexEntry: BeatId };
}

interface RayModule {
  ray: Ray;
  paletteAnchor: string;       // hex
  paletteSecondary: string[];
  audioMode: ModeName;
  instruments: string[];
  codexEntry: string;
  harvestRole: 'foundation' | 'identity' | 'will' | 'heart' | 'co-creator-in' | 'co-creator-out' | 'gateway' | 'integration';
}
```

These type sketches are illustrative; final shapes settle during
implementation. The *contract* is that each registry module
supplies these fields.

### 29. Build, test, deploy

- **Dev:** `npm run dev` (Vite) — already working.
- **Build:** `npm run build` (Vite + tsc strict) — already working.
- **Test:** `npm test` (Vitest) — already working with 3 spec files;
  must grow to cover every new use-case.
- **Capacitor:** `npm run cap:android` — already wired.
- **Deploy targets MVP:**
  - Web: GitHub Pages or Netlify free tier — `npm run build` →
    static `dist/` upload.
  - Android: signed APK from Android Studio + Capacitor.

---

## Part VII — The delivery plan (phased, week-coded)

These are *order-of-operations*, not strict calendar weeks. A
solo-build pace is assumed; multipliers can adjust.

### 30. Phase 0 — Research finalisation (DONE)

Deliverable: `/docs/` tree complete, `MVP-BLUEPRINT.md` (this file)
signed off, four canon decisions resolved.

### 31. Phase 1 — Registry skeleton + onboarding scaffolding (~1 week)

Deliverables:
- All 8 registries instantiated; engine boots and registers stubs
  for every line / stage / ray / task / drive
- `OnboardingCalibrator` use-case with deterministic tests
- Profile schema and persistence (extend existing `KeyValueStore` +
  `SaveRepository`)
- The radial-chart UI (data-bound, mostly empty initially)
- Adaptive onboarding scene (Phase 1 + Phase 2 of the dream
  sequence) — wired but minimally art-finished

Acceptance: a fresh player can complete onboarding and arrive at the
Red world with valid altitudes, drive weights, and a populated
radial chart.

### 32. Phase 2 — Red stage vertical slice (~2 weeks)

Deliverables:
- Red stage module fully populated (bestiary, narrative, world
  aesthetic with Yellow-Ray palette, audio scaffold)
- 8 side-character encounter implementations (one per line)
- 3 mini-boss encounter implementations
- The Conqueror main-boss encounter (4-quadrant phased fight)
- The Cruelty shadow encounter
- 8 line ability implementations (the MVP verb each)
- 9 task implementations in `core/usecases/`
- Stage rite + first stage-advancement gate (gated; player can
  *theoretically* clear Red and unlock Amber stub which routes to
  "more content coming")

Acceptance: a player who has completed onboarding can play through
Red top-to-bottom, fight every encounter, defeat / spare / recruit
The Conqueror, complete the stage rite, and see the radial chart
fill with lit rings.

### 33. Phase 3 — All 8 line modules with at least stub content (~1 week)

Deliverables:
- Each line module exposes its 8-stage trajectory data (read-only
  in MVP — used by codex, by stage-stub previews)
- Stub stage modules (Magenta through White) shipped with single
  "preview" encounter + "more coming" narrative beat
- Codex correctly displays each line's developmental trajectory

Acceptance: clicking any spoke in the radial chart shows its
trajectory; clicking any locked ring shows "coming in vX.Y".

### 34. Phase 4 — Law-of-One canonical layer (~1 week)

Deliverables:
- `RayRegistry` populated with all 7 rays
- Per-ray palette / shader uniforms wired into render
- Per-ray audio modes / instrumentation in the music engine
- Codex entries for the Ra cosmology (3rd-density framing,
  sub-octave correspondence, harvest)
- Ray-ring on the radial chart visible and updating
- Violet-ray expression computation (rolling)
- Pre-harvest scaffold (the data and UI exist; actual harvest
  endgame content is post-MVP)

Acceptance: every encounter visibly carries its ray colour; the
Conqueror fight uses Yellow-Ray palette throughout; the codex
contains the Ra-cosmology entries; a player at full Red completion
sees a small violet-ray ring beginning.

### 35. Phase 5 — Adaptive onboarding refinement + global deploy (~1 week)

Deliverables:
- Multi-cultural affect-recognition corpus integrated (≥ 3
  cultural sets, randomised)
- Locale auto-detection; narration localised in 8 languages (with
  the player's locale's phonemes for wordless beats)
- Reflex-window auto-tuning verified across reaction-time bands
- Stage-0 no-content gate implemented for low-capacity calibration
- Web build deployed to a public URL (GitHub Pages)
- Signed Android APK produced for sideload (Play Store submission
  is post-MVP)

Acceptance: a fresh player from any geography completes onboarding
gracefully and is seated at correct altitude.

### 36. MVP launch criteria (the gate to call MVP "done")

All of:

1. ✅ All eight registries instantiated, with at least one entry each
2. ✅ Adaptive onboarding produces valid per-line altitudes within
   ±1 stage of post-hoc validation
3. ✅ Red stage is fully content-complete (≥ 30 encounters)
4. ✅ All four quadrants exercised in the Conqueror fight
5. ✅ Law-of-One canonical layer integrated (rays, palettes, codex,
   violet-ray tracking)
6. ✅ Web build deploys; Android APK signs
7. ✅ All `core/` use-cases pass property-based tests at ≥ 90% coverage
8. ✅ Anti-frustration backstop fires correctly in playtests
9. ✅ Telemetry encrypted at rest; opt-in sync only
10. ✅ Accessibility: WCAG 2.1 AA on all UI; reduced-motion mode;
    "patience mode" for somatic timing windows
11. ✅ A new player from any of three test locales (US, India,
    Brazil) can play onboarding to first Red encounter without
    cultural confusion
12. ✅ The plugin contract (Part II §6) is documented with at least
    one **post-MVP** content drop authored as proof — e.g., a
    Magenta side-character module dropped in to verify the system

If any of these fail, MVP is not shipped. They are not negotiable.

---

## Part VIII — The expansion path (post-MVP content drops)

The MVP is the foundation; the rest of the game is *content drops*
that snap into the registries.

### 37. How stages 02-08 plug in

Each stage is a content drop:

```
content-drops/
├── 002-magenta-stage/
│   ├── stage.module.ts
│   ├── bestiary.json
│   ├── narrative.json
│   ├── advancement.json
│   └── assets/
├── 003-amber-stage/
│   └── …
…
```

A drop is a release candidate when:
- Bestiary covers all 8 lines at the stage's altitude
- Main boss is 4-quadrant phased
- Shadow encounter authored
- Cultural review signed off

### 38. How additional lines / tasks plug in

Adding the Corsi block-tapping task post-MVP:

```
content-drops/2024Q3-corsi-task/
├── task.module.ts        ← TaskRegistry.register('corsi', module)
├── corsi.spec.ts          ← property tests
├── ability.module.ts      ← AbilityRegistry.register('sigil_tracing', module)
└── assets/
```

Once registered, any encounter spec can bind `task: 'corsi'` and the
engine handles the rest.

### 39. Multiplayer integration path

Post-MVP. The plan:

- Add Colyseus as a new package alongside `core/`
- Mirror `PlayerProfile` and `EncounterSpec` as Colyseus `Schema`s
- Server-authoritative cognitive evaluation via `RegistryEngine`
  (pure TS — runs on Node identically)
- Match-making by line altitude bands
- Co-op encounters drop in as additional encounter specs with
  `multiplayerOnly: true`

### 40. State-training (meditation) integration

Post-MVP. The state mini-game from `progression/06-state-training-meditation.md`
plugs in as:

- A new task: `breath_meditation` → `TaskRegistry`
- A new ability: `state_practice` → `AbilityRegistry`
- A new scene: `MeditationScene` running parallel to combat

The state-tracking already exists in `PlayerProfile.states` from MVP.

### 41. Shadow content expansion

Post-MVP. Per-line shadow encounters drop in as:

- New encounter specs with `role: 'shadow'`
- Triggers wired to `ShadowDetector` (already in MVP)

### 42. The harvest endgame

Post-MVP. Authored as scripted content drops:

- A new "stage" module past White (`stages/9-harvest`)
- Multiplayer mentor presence (when multiplayer ships)
- Codex archives for retired characters

---

## Part IX — Open questions (post-resolution)

The four major canon decisions are resolved. Remaining honest
unknowns:

1. **Compression of the developmental arc.** Real human stage
   development takes decades; Mysterium compresses it. The *temporal
   honesty ratio* — how much in-game altitude truly maps to real-life
   capacity — must be communicated honestly in onboarding and codex.
   Best phrasing: "in-game altitude is a *practice indicator*, not a
   clinical attainment." Tracked in the codex preface.

2. **Multi-cultural authenticity.** Each stage's aesthetic and
   bestiary draws from real-world traditions. Solo-author MVP risks
   cultural blind-spots. Mitigation: actively invite review *during*
   the post-MVP content drops; documented review process in
   `CONTRIBUTING.md` to be added.

3. **Onboarding accuracy floor.** Phase 1 + 2 of onboarding has
   ~20 min. With 8 lines, this is ~2.5 min per line — barely enough
   for reliable per-line estimates. Mitigation: estimates are
   *low-fidelity priors*; the in-game DDA refines them session-by-session;
   the radial chart shows confidence bands.

4. **Anti-cheat without multiplayer.** In single-player MVP there
   is no cheating to defend against (the player is only deceiving
   themselves). When multiplayer arrives, server-authoritative
   evaluation kicks in. Decision logged.

5. **Performance on low-end Android.** Capacitor + Phaser stretches
   a mid-range device. The 60 fps target on a Pixel 5a-equivalent is
   the floor. If performance fails, fallback is a 30 fps "patience
   mode" that uses gentler animations and longer cognitive overlays
   (which are valid as a difficulty mode anyway).

6. **The author-as-target-player.** The user has stated Mysterium is
   built personally and shipped globally. There is a real risk that
   the design over-fits the author's developmental profile. The
   adaptive onboarding is the primary defence; cultural diversity in
   playtesting is the second. To be honoured operationally.

These open questions are *tracked* — they do not block MVP. They
inform the post-MVP iteration plan.

---

## Part X — How to use this document

- **For the implementer (you, AI agent, or future contributor):** read
  Parts I–IV, then implement Part VII phases in order. Each phase
  has its own acceptance criteria.
- **For a content author:** read Part VIII for the plug-in contract;
  use any existing module under `core/registries/` as a template.
- **For the author / decision-maker:** read Parts I, IV, IX. The four
  canon decisions and remaining open questions are the leadership
  surface.
- **For a sceptic / reviewer:** read Part VI §28 for the data
  schemas, Part VI §27 for the file tree, Part II §7 for the
  invariants. The architecture's claims are auditable.

This document supersedes any conflict; it is the single source of
truth for the MVP build.

---

## Principles served

This blueprint serves principles **1, 2, 3, 4, 5, 6, 7** — all of
them, because it is the *integration* of the seven into a single
buildable plan, with the four canon decisions now load-bearing.

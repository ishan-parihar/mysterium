# 16 — Significator Architecture

> **Cross-references:** [[AGENTS.md|AGENTS.md (process protocol)]] · [[docs/foundations/05-drives-and-polarities|05 — Drives And Polarities]] · [[docs/foundations/17-transformation-mechanics|17 — Transformation Mechanics]] · [[docs/foundations/20-veil-of-forgetting|20 — Veil Of Forgetting]] · [[docs/foundations/21-incarnation-architecture|21 — Incarnation Architecture]] · [[docs/foundations/22-holon-context-engine|22 — Holon Context Engine]] · [[docs/foundations/24-encounter-scheduler|24 — Encounter Scheduler]]
> **Lateral:** The player as Significator — the persistent self-pattern that survives session transitions, accumulates distortions, holds the entire developmental story, and exercises true free will. The game-design translation of the Hierophant archetype into Mysterium's data architecture and encounter-scheduling logic.
>
> **Status:** Canonical design document.
> **Depends on:** 15 (macro-cycle theory), 13 (lesser-cycle topography), 10 (shadow model), 05 (drives and polarities)
> **Forward-references:** 17 (Transformation mechanics), 18 (Great Way world-system), 19 (Choice & polarity engine), 20 (Veil of Forgetting), 21 (Incarnation Architecture)

> **Heading-contract map (2026-09-16):** Purpose → §1; Scientific basis → §2 (PlayerProfile-as-Significator grounding + §5 spiral-stage architecture); Game-design mapping → §3 (distortion ledger) + §4 (free-will commitment); Architectural contract → §8–§11 (registry integration, transitions, observability, lifecycle); Principles served → §4 + §6 (the covenant with spirit).
>
> **Open questions (added 2026-09-16):**
> - Should the Significator carry per-Complex sub-altitudes as first-class state (13's appendix models computeComplexAltitudes), or remain derived-only to keep the state vessel minimal?
> - What is the Significator's migration contract when canon decisions revise optional subsystems (identity, cohort links) — schema versioning currently implied but unspecified?
> - Does §10's layered observability need an explicit projection registry (43's purpose-scoped read projections) so new consumers cannot bypass consent scopes?

---

## 1. Purpose and lateral

Foundations/15 establishes the *pure theory* of the Significator — the Hierophant as the complex vessel of the self, carrying accumulated distortions across incarnations. This document translates that theory into **concrete game architecture**: what data structures constitute the Significator, how the game observes and records its evolution, and what design commitments protect the player's free will.

No other document covers this lateral:

- Foundations/13 covers the *lesser-cycle* topography (Matrix/Potentiator/Catalyst/Experience) — the moment-to-moment processing engine.
- Foundations/15 covers the *pure theory* of the macro-cycle archetypes.
- Foundations/10 covers *what* shadows are and how they map to game mechanics.
- Foundations/05 covers the four drives as motivational primitives.

This document specifies the **vessel that holds all of the above** — the PlayerProfile as Significator, its persistence model, its relationship to the eight registries, and the design commitments that make it a genuine locus of free will rather than a deterministic state machine.

---

## 2. The PlayerProfile as Significator

### 2.1 The IdentityProfile — consent-bound identity context (added 2026-09-15)

The Significator gains an OPTIONAL `identity?: IdentityProfile` — the consent-bound
home for the identity context the user directed be collected at onboarding (age band,
sex/gender, lineage/ancestry, culture, location/region, language, life situation).
Its architecture is defined by three hard properties:

1. **Consent-gated existence.** Every field is voluntary, collected only after an
   explicit consent step, and the player can view/withdraw/revoke at any time.
   Withdrawing nulls the field and its derived healing context (the game continues
   unimpaired — identity tunes voicing, never progression).
2. **Purpose-bound exposure.** Raw identity fields are NEVER read directly by game
   systems. The only sanctioned consumer is `projectHealingContext(identity, purposes)`
   (healing-layer module), which checks the field's recorded consent purposes and
   emits a *derived* `HealingContext` (metaphor-set hints, example-domain hints,
   life-stage texture, locale) for presentation/LLM-voicing use. Measurement paths —
   levelling (42), difficulty, scoring, credential evidence — are structurally
   unable to import it (kernel firewall gate G12).
3. **Separation from the developmental ledger.** Identity tunes HOW catalyst feels;
   it never touches WHAT level is assigned or WHAT evidence counts (42 §1.1's
   competence/identity firewall). A healer must know who you are; a grader must
   not.

Schema: `src/core/domain/IdentityProfile.ts` (types + consent ledger), projector in
`src/core/healing/HealingContext.ts`. Onboarding collects it after the developmental
probes (CLI: `mysterium onboard` consent flow), one prompt per field, all skippable.

(Original §2 content follows.)

### 2.1 The vessel, not the save file

The `PlayerProfile` is not a serialisation convenience. It is the Significator — the self-pattern that persists across sessions, accumulates the traces of every encounter, and reorganises as the player evolves. Every field in the profile corresponds to a dimension of the Hierophant's complexity:

| Profile field | Significator dimension |
|---|---|
| `altitudes: Record<Line, Stage>` | Per-line developmental altitude — where the Significator *is* on each axis of intelligence |
| `stage: Stage` (synthesised) | The Significator's centre-of-gravity — its dominant worldview |
| `drives.weights` | The current motivational orientation (Agency/Communion/Eros/Agape) |
| `drives.fixationRisk` | Accumulated drive-imbalance — the Significator's vulnerability to shadow |
| `shadows: ShadowSignal[]` | The distortion ledger (§3) — unresolved shadow surfacings |
| `rayProfile: Record<Ray, number>` | The Significator's energetic signature across the seven rays |
| `taskStaircases` | Per-task adaptive difficulty — the Significator's demonstrated capacity |
| `vows: Vow[]` | Player-authored commitments — the Significator's self-declared intentions |
| `primaryValue: string` | The Significator's self-authored identity anchor |
| `states` | Gross/Subtle/Causal/Witness/NonDual access — the Significator's state-stage development |

### 2.2 The polarity vector (forward-reference)

The PlayerProfile will carry a `polarityVector` field specifying the Significator's cumulative orientation toward Service-to-Others or Service-to-Self. This is the crystallisation of micro-choices into macro-polarity. Full specification deferred to foundations/19 (Choice & polarity engine).

### 2.3 The transformation history (forward-reference)

The PlayerProfile will carry a `transformations: TransformationEvent[]` field recording every stage-transition the Significator has undergone — the frame-changes where the self-structure reorganised. Full specification deferred to foundations/17 (Transformation mechanics).

### 2.4 What the profile is NOT

The PlayerProfile does not contain:
- Raw telemetry or behavioural logs (those live in infra/persistence as ephemeral session data)
- Personally identifiable information (the profile is pseudonymous by design)
- Judgements, scores, or grades (the Significator is observed, never evaluated)
- Prescriptive content (the profile describes *what is*, never *what should be*)

---

## 3. The Distortion Ledger

### 3.1 What gets recorded

Every encounter leaves a trace on the Significator. The `shadows: ShadowSignal[]` array (and its supporting indices) constitutes the **Distortion Ledger** — the accumulated record of the Significator's unresolved material and integration breakthroughs.

Each `ShadowSignal` records:

| Field | Meaning |
|---|---|
| `line: Line` | Which line of intelligence the distortion manifests in |
| `stage: Stage` | Which developmental altitude the distortion belongs to |
| `quadrant: ShadowQuadrant` | Dark-Addiction / Dark-Allergy / Golden-Addiction / Golden-Allergy |
| `driveSignature: Partial<Record<Drive, number>>` | The drive-imbalance pattern that surfaced the shadow |
| `surfacedAtMs: number` | When the shadow was first detected |
| `resolutionStatus: 'unresolved' | 'partial' | 'integrated'` | Current integration state |
| `integrationEvents: IntegrationEvent[]` | Timestamped records of partial or full integration |
| `encounterIds: string[]` | Which encounters surfaced or addressed this shadow |

### 3.2 How it persists

The Distortion Ledger is:
- **Encrypted on-device** using platform-native secure storage (Keychain / EncryptedSharedPreferences / IndexedDB with Web Crypto API)
- **Never transmitted** to any server in identifiable form
- **Pseudonymous** — the profile ID is a locally-generated UUID with no link to real identity
- **Player-deletable** — the player can wipe their profile at any time (the Significator has sovereignty over its own record)

### 3.3 How it influences encounter selection

The encounter scheduler queries the Significator's Distortion Ledger to determine what catalyst to deliver next. The algorithm:

1. **Surface unresolved shadows** — encounters that address `resolutionStatus === 'unresolved'` signals are weighted higher
2. **Respect the growth edge** — the scheduler biases toward the player's current altitude ± 1 stage, never skipping stages
3. **Balance across lines** — if one line has accumulated significantly more unresolved shadows, the scheduler surfaces encounters for that line
4. **Honour drive-imbalance** — if `fixationRisk` for a drive exceeds threshold, encounters that exercise the complementary drive are prioritised
5. **Never coerce** — the scheduler *offers* encounters; the player chooses which to enter (see §4)

The Distortion Ledger is read-only to the encounter scheduler. It cannot modify the ledger — only encounter *outcomes* (processed through the lesser-cycle engine) write to the ledger.

---

## 4. The Significator's free will (the central design commitment)

### 4.1 The Hierophant's question

The Significator's defining capacity is articulated in foundations/15: *"What shall the mind do with its knowledge, and for what reasons does it seek?"* This is not rhetorical. It is the game's central design commitment: **the player has true free will, and the game never coerces.**

### 4.2 The mechanic of genuine choice

Every encounter in Mysterium offers **genuine multi-path response**. This is not cosmetic branching (where all paths converge). The paths differ in:

- **Drive expression** — each path exercises a different drive or drive-combination
- **Shadow engagement** — some paths confront the shadow directly; others avoid it
- **Polarity vector** — each path nudges the cumulative polarity in a direction (see foundations/19)
- **Integration depth** — some paths achieve full integration; others achieve partial; others defer

### 4.3 Observation without judgement

The game observes which path the Significator chooses. The choice is recorded in the Distortion Ledger and the polarity vector. But:

- **No path is "correct"** — the game never labels a choice as right or wrong
- **No path is punished** — there are no fail-states for choosing "poorly"
- **No path is hidden** — the player always knows their options (though not their developmental implications)
- **Consequences are natural** — choosing avoidance means the shadow remains unresolved and will surface again; choosing confrontation means integration occurs. These are natural consequences, not rewards/punishments.

### 4.4 Distinguishing the Significator from an automaton

An NPC in Mysterium follows deterministic drive-fixation logic (see foundations/05 §3.3). The player-as-Significator is distinguished by:

1. **Unpredictability** — the game cannot predict the player's choice; it can only observe it after the fact
2. **Self-authorship** — the player's `primaryValue` and `vows` are self-declared, not system-assigned
3. **Sovereignty over the record** — the player can delete their profile, reset their vows, or contradict their own history
4. **Meta-awareness** — the player knows they are playing a game; the Significator holds the tension between immersion and self-awareness

---

## 5. Spiral-stage architecture: how the Significator reorganises across altitudes

### 5.1 Not addition but reorganisation

As the Significator evolves through the 8 stages, it does not merely *add* new capacities to a fixed container. The container itself reorganises. The `PlayerProfile` must hold not just *what* the player can do but *who they are* at each stage — the structural logic of their self-system.

### 5.2 Stage-specific Significator configurations

| Stage | Self-structure | Drive centre | Shadow vulnerability | Contact boundary |
|---|---|---|---|---|
| Infrared | Pre-egoic; fused with environment | Survival agency | Annihilation terror | Confluent (no boundary) |
| Magenta | Magical-animistic; fused with tribe | Communion (tribal) | Engulfment / abandonment | Permeable, undifferentiated |
| Red | Egocentric; impulsive sovereign | Agency (power) | Domination without embrace | Rigid, armoured |
| Amber | Conformist; rule-and-role identity | Communion (institutional) | Rigid agency-suppression | Selectively permeable (in-group only) |
| Orange | Rational-achiever; autonomous self | Agency (achievement) | Instrumentalising others | Controlled, strategic |
| Green | Pluralistic; sensitive-relational | Communion (egalitarian) | Mean-green suppression of hierarchy | Hyper-permeable |
| Turquoise | Integral; vision-logic | All four in dynamic dance | Subtle integral elitism | Calibrated, context-sensitive |
| White | Non-dual; transparent self | Unity beyond drives | (Rare; no common pathology) | Fully permeable, fully coherent |

### 5.3 Implementation: the `stage` field as synthesised centre-of-gravity

The `stage` field in `PlayerProfile` is computed by `StageSynthesizer` from the `altitudes` record. It represents the Significator's *centre-of-gravity* — the dominant worldview organising the self-system. The synthesiser accounts for:

- The lowest altitude across all lines (holonic health — see §6)
- The highest altitude across all lines (growth edge)
- The distribution pattern (even vs. spiky)
- Drive-balance at the current centre-of-gravity

The Significator's stage determines which encounters are available, which narrative arcs are active, and how the world presents itself (see foundations/18 for the Great Way).

### 5.4 The holon is never outgrown

Per AGENTS.md §5.6: lower stages must remain healthy. The Significator at Orange still *contains* healthy Red, Amber, Magenta, and Infrared. If any lower-stage altitude degrades (theta-decay), the Significator's effective stage is pulled downward. The profile tracks all 8 altitudes simultaneously — the Significator is a *nested holon*, not a ladder.

---

## 6. The covenant with spirit: the game's protective promise

### 6.1 The wings of the Hierophant

Foundations/15 describes the "outstretched wings above the Hierophant" — a protective promise that draws the veiled mind toward transformation. In Mysterium, this covenant is implemented through three mechanisms:

### 6.2 Theta-decay nudges

When a line's altitude has not been exercised for a configurable duration, theta-decay begins degrading that altitude. This is not punishment — it is the covenant surfacing neglected dimensions of the Significator. The encounter scheduler responds to theta-decay by:

- Increasing the weight of encounters for the decaying line
- Surfacing narrative nudges (codex entries, NPC dialogue) that reference the neglected capacity
- Offering low-friction "maintenance encounters" that arrest decay without demanding full engagement

### 6.3 Anti-frustration backstops

The covenant guarantees the game never abandons the player in a state of unresolvable frustration:

- **Staircase regression** — if the player fails repeatedly at a task, the adaptive staircase lowers difficulty until success is achievable
- **Shadow deferral** — if a shadow has surfaced 3+ times without resolution, the scheduler temporarily reduces its priority and offers alternative growth-edge encounters
- **Session-length sovereignty** — the infinite-checkpoint model means the player can leave at any moment without losing progress; the covenant respects the player's time and energy
- **No dead ends** — every encounter has at least one path that does not require the player to confront material they are not ready for

### 6.4 Growth-edge bias

The encounter scheduler carries a structural bias toward catalyst at the Significator's growth edge — the altitude just above the current centre-of-gravity. This bias is:

- **Gentle** — growth-edge encounters are weighted ~1.3× relative to maintenance encounters, not forced
- **Responsive** — if the player consistently avoids growth-edge encounters, the bias does not escalate; it waits
- **Contextual** — the bias applies per-line, not globally; the scheduler respects that different lines may have different growth edges

---

## 7. AQAL anchoring (UL→UR observation)

### 7.1 The Significator's quadrant position

The Significator occupies the **Upper-Left (UL)** quadrant — the domain of subjective consciousness, intention, and inner state. However, the game has no direct access to UL. It can only observe the Significator through **Upper-Right (UR)** proxies — objective, measurable behaviour.

### 7.2 UR proxies as windows into UL

| UR observable | UL inference (probabilistic, never certain) |
|---|---|
| Task performance (reaction time, accuracy, n-back level) | Cognitive capacity at a given line×stage |
| Choice patterns across encounters | Drive orientation and polarity vector |
| Shadow-encounter response paths | Shadow-integration readiness |
| Session frequency and duration | Engagement and developmental momentum |
| Staircase trajectory (ascending/plateauing/descending) | Growth-edge proximity |

### 7.3 The epistemic non-claim

Mysterium **never claims direct access to the player's inner state**. All inferences from UR behaviour to UL state are:

- Probabilistic, not deterministic
- Revisable — new behaviour can override prior inferences
- Non-diagnostic — the game does not label the player with clinical categories
- Invisible to the player — the inference layer operates in the background; the player sees only their psychograph (the radial chart), never the raw inference data

This is the ethical boundary of the Significator architecture: the game observes behaviour, infers developmental state, and adapts catalyst accordingly — but it never presumes to *know* the player's subjective experience.

---

## 8. Integration with the registry architecture

### 8.1 How the eight registries serve the Significator

The Significator does not exist in isolation. It is the *consumer* of all eight registries:

| Registry | Service to the Significator |
|---|---|
| **LineRegistry** | Defines the 8 axes along which the Significator develops; provides task bindings and ceiling definitions |
| **StageRegistry** | Defines the 8 altitudes the Significator can occupy; provides advancement criteria and world bibles |
| **RayRegistry** | Defines the energetic signature the Significator accumulates; provides harvest-readiness computation |
| **TaskRegistry** | Provides the cognitive tasks that *measure* the Significator's capacity (the UR observation layer) |
| **AbilityRegistry** | Provides the combat verbs the Significator can exercise — the gameplay surface of developmental capacity |
| **EncounterRegistry** | Provides the catalysts the encounter scheduler selects based on the Significator's state |
| **DriveRegistry** | Defines the motivational primitives the Significator balances; provides pathology definitions |
| **NarrativeRegistry** | Provides the story beats that contextualise the Significator's journey; adapts to its stage and choices |

### 8.2 The Significator as registry consumer, not registry member

The PlayerProfile is **not** registered in any registry. It is the entity that *queries* registries. This is architecturally deliberate:

- Registries hold *type-level* definitions (what a line IS, what a stage IS)
- The PlayerProfile holds *instance-level* state (where THIS player is on each line, at which stage)
- The encounter scheduler mediates between the two: it reads the Significator's state, queries the EncounterRegistry for appropriate catalysts, and presents options

### 8.3 The invariant

Per MVP-BLUEPRINT §7: *"Stage advancement is a pure function of PlayerProfile."* The Significator's state is the sole input to the `StageSynthesizer`. No external state, no server-side override, no social comparison. The Significator is sovereign over its own evolution.

---

## 9. State transitions: events that mutate the Significator

The Significator is mutated exclusively through well-defined events. No system writes to the PlayerProfile outside this event protocol. Each event specifies its input, the fields it mutates, side-effects on other engines, and invariants that must hold after the mutation.

### 9.1 Event → state-change matrix

| Event | Input data | Fields mutated | Side-effects | Invariants enforced |
|---|---|---|---|---|
| **encounter_completed** | `EncounterResult` (line, stage, modality, drive-signals, choice-points, score) | `drives.weights`, `shadows[]` (new or updated entry), `polarityVector.choiceTrail` (appended), `taskStaircases[line]` (updated), theta-decay timestamp reset for involved lines | Polarity engine recalculates direction/magnitude; encounter scheduler re-weights next pool | Drive weights remain in [-1,1]; staircase never jumps >1 level per encounter |
| **shadow_surfaced** | `ShadowDetection` (line, stage, quadrant, driveSignature, confidence) | `shadows[]` (new entry with `resolutionStatus: 'unresolved'`), `drives.fixationRisk` (incremented for relevant drive) | Encounter scheduler bias increases toward recurrence of this shadow's line×stage; no polarity change | Shadow entry requires confidence ≥ 0.6; max 3 unresolved shadows per line |
| **shadow_integrated** | `IntegrationResult` (shadowId, depth: 'partial' \| 'full', encounterIds) | `shadows[id].resolutionStatus` → 'partial' or 'integrated', `shadows[id].integrationEvents[]` (appended), `altitudes[line]` (potentially advances if full + threshold met), `drives.fixationRisk` (decremented) | If altitude advances → stage synthesiser recalculates centre-of-gravity; narrative registry notified | Altitude advances only on full integration + convergence criteria (§5.3); fixationRisk ≥ 0 |
| **transformation_threshold_crossed** | `ConvergenceSignal` (line, currentStage, targetStage, convergenceScore) | `pendingTransformation` flag set; no altitude change yet | Transformation engine (foundations/17) activated; encounter scheduler locks to Transformation sequence | Only one pending transformation per line at a time; convergenceScore ≥ 0.8 required |
| **transformation_completed** | `TransformationResult` (line, fromStage, toStage, polarityAtCrossing) | `altitudes[line]` advances, `transformations[]` (new entry), `pendingTransformation` cleared, `stage` (re-synthesised) | Great Way reconfiguration (foundations/18) triggered; narrative registry advances arc; world palette/tone shift | New altitude = old + 1 (no skipping); all lower altitudes must be healthy (theta > threshold) |
| **transformation_failed** | `TransformationAbort` (line, reason, partialProgress) | `pendingTransformation` remains set with `attempts` incremented; `shadows[]` may gain new entry (the resistance pattern) | Scheduler defers re-attempt for configurable cooldown; anti-frustration backstop activates | Max 3 consecutive failures before scheduler pivots to alternative growth path |
| **regression_detected** | `ThetaDecayAlert` (line, currentAltitude, decayedTo) | `altitudes[line]` decreases, `stage` (re-synthesised if centre-of-gravity affected) | Bleed-through encounters activated for regressed line; narrative surfaces instability signals | Regression max 1 stage per decay event; cannot regress below Infrared |
| **session_pause** | `SessionContext` (timestamp, activeEncounterId or null) | Ephemeral state pruned (in-encounter working memory, uncommitted drive-deltas); persistent state unchanged | Save triggered (see save_event); session timer paused | No data loss — all committed mutations already persisted |
| **session_resume** | `SessionContext` (timestamp, profileVersion) | Theta-decay computed for elapsed time; `lastActiveAt` updated | Encounter scheduler recalculates pool based on elapsed decay; nudge encounters queued if decay significant | Profile version matches saved version (integrity check) |
| **save_event** | `SaveTrigger` (reason: 'checkpoint' \| 'pause' \| 'manual') | None (read-only serialisation) | Serialised profile emitted with `stateVersion` counter incremented; written to encrypted local storage | Serialised state passes schema validation; stateVersion monotonically increases |
| **load_event** | `LoadRequest` (profileId, expectedVersion) | Full profile deserialised into memory | Integrity hash verified; if mismatch → recovery from last valid checkpoint | Schema version compatible; no field corruption; stateVersion ≥ expected |
| **harvest_event** | `HarvestTrigger` (crystallisationIndex, rayIntegration, allStagesHealthy) | `harvestState` set to 'crystallised'; `polarityVector` locked (immutable); Veil partially lifted flag set | Archive copy created; post-harvest mode unlocked; player-visible developmental summary generated (per foundations/20 §8.4) | crystallisationIndex ≥ threshold (STO: 0.51×0.85; STS: 0.95×0.85); all 8 line altitudes ≥ White |

### 9.2 Event ordering guarantees

- Events are processed **sequentially** within a session — no concurrent mutations.
- `encounter_completed` always fires before any derived events (`shadow_surfaced`, `shadow_integrated`, `transformation_threshold_crossed`).
- `transformation_threshold_crossed` → `transformation_completed` | `transformation_failed` is an atomic sequence — no other events interleave.
- `save_event` captures a consistent snapshot — never fires mid-mutation.

---

## 10. State observability: layered access

The Significator's state is sensitive developmental data. Access is stratified into three layers, each with strict boundaries enforced by the architecture.

### 10.1 The three observer layers

| Layer | Observers | Access level | Purpose |
|---|---|---|---|
| **Engine-internal** | Encounter scheduler, polarity engine, theta-decay engine, transformation detector, stage synthesiser, drive-health monitor | Full — all fields, all precision | Compute next catalyst, detect thresholds, enforce invariants |
| **LLM-context** | Holon Context Engine (foundations/22 §4.2) | Filtered — Veil-respecting machine signals only | Condition generation on player state without exposing raw metrics |
| **Player-visible** | Player (via UI, Codex, narrative, aesthetics) | Bounded — felt-sense only, no measurement language | Preserve the Veil; enable authentic experience |

### 10.2 Per-field access matrix

| Significator field | Engine-internal | LLM-context | Player-visible |
|---|---|---|---|
| `altitudes: Record<Line, Stage>` | ✅ raw values | ✅ raw stage labels (e.g., `cognitive: orange`) | ❌ never — player perceives capability shifts, not labels |
| `stage` (centre-of-gravity) | ✅ | ✅ as `perceivedLayer` | ❌ never — world-feel changes communicate this implicitly |
| `drives.weights` | ✅ numerical | ✅ as signals (`agency-elevated`, `communion-suppressed`) | ❌ never |
| `drives.fixationRisk` | ✅ numerical | ✅ as signal (`fixation-risk-high-on-agency`) | ❌ never |
| `shadows[]` (Distortion Ledger) | ✅ full entries | ⚠️ anonymised signals only (`dark-allergy-active-on-interpersonal`); no archetype names, no quadrant labels in player-facing language | ❌ never — shadow material surfaces as narrative recurrence |
| `polarityVector.direction` | ✅ numerical | ⚠️ machine label only (`sto-consolidating`); no magnitude number | ❌ never — consequences communicate polarity implicitly |
| `polarityVector.magnitude` | ✅ numerical | ❌ not injected | ❌ never |
| `polarityVector.choiceTrail` | ✅ full history | ⚠️ last 5 entries as `recentChoicePatterns[]` (machine labels) | ❌ never |
| `rayProfile` | ✅ | ✅ injected via FrequencyConditioner complexityRegister | ✅ updated every encounter (activation/decay model per GAP-D2-1) |
| `taskStaircases` | ✅ | ❌ not injected | ❌ never — player perceives difficulty as "the world adapting" |
| `transformations[]` | ✅ full history | ✅ as `transformationProximity` signal | ❌ never — player experiences the Transformation as narrative event |
| `pendingTransformation` | ✅ | ✅ as `transformation-approaching` | ❌ never |
| `vows[]` | ✅ | ✅ (player-authored; safe to inject) | ✅ player authored these — visible in Codex |
| `primaryValue` | ✅ | ✅ (player-authored) | ✅ visible in Codex |
| `states` (state-stages) | ✅ | ✅ as signal (`subtle-access-active`) | ❌ never as labels — player experiences state-shifts directly |
| `harvestState` | ✅ | ✅ when active | ⚠️ only at harvest (Veil lifts per foundations/20 §8.4) |
| `sessionEnergy` (ephemeral) | ✅ | ✅ as `high` / `moderate` / `low` | ❌ never |

### 10.3 Veil enforcement rules

1. **No numerical values** cross into the player-visible layer — ever.
2. **No developmental terminology** (stage names, drive labels, shadow quadrant names, polarity direction) appears in player-facing UI or dialogue.
3. **The LLM receives machine signals, not player-facing language.** The LLM translates signals into narrative; it never echoes them verbatim.
4. **Player-authored fields** (vows, primaryValue) are the only Significator data the player sees directly.
5. **The harvest exception:** At harvest (foundations/20 §8.4), the Veil lifts. The player may optionally view their full developmental trajectory — because the Choice has already been made.

---

## 11. The Significator lifecycle

The Significator evolves through distinct lifecycle stages, each with characteristic state, events, and exit criteria.

### 11.1 Stage A: Onboarding (first ~20 minutes)

**Purpose:** Produce initial estimates for all Significator fields with minimal player burden.

| Aspect | State at end of onboarding |
|---|---|
| `altitudes` | Initial estimates (±1 stage accuracy); confidence low; derived from adaptive onboarding tasks |
| `drives.weights` | Initial balance estimate from onboarding choice-patterns; exploratory, not stable |
| `shadows[]` | Empty — no shadows surfaced yet |
| `polarityVector` | direction ≈ 0.0, magnitude ≈ 0.0 — fully uncrystallised, exploratory |
| `transformations[]` | Empty |
| `taskStaircases` | Seeded at estimated difficulty from onboarding performance |
| `vows[]` / `primaryValue` | May be set if onboarding includes self-authorship prompt; otherwise empty |
| `stage` | Synthesised from initial altitude estimates (typically Infrared or Magenta) |

**Characteristic events:** Rapid `encounter_completed` events (short onboarding tasks); no shadows, no transformations.

**Exit criteria:** All 8 line altitudes have initial estimates with confidence ≥ 0.5; drive-balance has ≥ 3 data points; player has entered the game world.

### 11.2 Stage B: First-loop play (Red stage MVP, ~6 hours)

**Purpose:** Stabilise the Significator through repeated encounters; surface first shadows; begin polarity exploration.

| Aspect | Typical end-state |
|---|---|
| `altitudes` | Red confirmed across most lines (±0 accuracy); some lines may show Amber-edge signals |
| `drives.weights` | Stable profile emerging; fixationRisk may be non-zero for 1-2 drives |
| `shadows[]` | 2–5 entries; mostly `unresolved`; first `partial` integrations possible |
| `polarityVector` | direction beginning to lean (±0.1–0.3); magnitude 0.1–0.25 (exploration phase) |
| `transformations[]` | Empty — no stage transitions yet |
| `taskStaircases` | Calibrated to player's actual capacity; stable oscillation around true level |
| `stage` | Red (confirmed) |

**Characteristic events:** Regular `encounter_completed`; first `shadow_surfaced` events; early polarity-signal choices; theta-decay not yet relevant (too early).

**Exit criteria:** `transformation_threshold_crossed` fires for at least one line (Red → Amber); OR player has completed ≥ 30 encounters with stable altitude estimates.

### 11.3 Stage C: Mid-game (Acts I–II, ~20–60 hours)

**Purpose:** The bulk of developmental play. Multiple Transformations cross. The Significator becomes complex and internally differentiated.

| Aspect | State evolution |
|---|---|
| `altitudes` | Lines diverge — some at Amber, some at Orange, growth-edge lines pushing toward Green; spiky profile normal |
| `drives.weights` | Dynamic — shifts per encounter; fixationRisk fluctuates; drive-balance becomes a live concern |
| `shadows[]` | 10–30 entries; mix of unresolved, partial, and integrated; integration_history growing |
| `polarityVector` | direction consolidating (±0.3–0.6); magnitude 0.3–0.6 (consolidation phase); per-line divergence narrowing |
| `transformations[]` | 3–8 entries across different lines; transformation_history records the journey |
| `stage` | Amber → Orange → Green (centre-of-gravity advances as lines coordinate) |

**Characteristic events:** All event types active; `transformation_completed` events every 5–10 hours; `regression_detected` possible if player neglects lines; `shadow_integrated` events mark breakthroughs.

**Exit criteria:** Centre-of-gravity reaches Turquoise; OR all lines ≥ Green with polarity magnitude ≥ 0.5.

### 11.4 Stage D: Late-game (Act III — Turquoise/White, ~10–30 hours)

**Purpose:** Polarity crystallisation. The Significator becomes highly coherent — per-line divergence narrows, drive-balance stabilises, shadow material integrates deeply.

| Aspect | Thresholds |
|---|---|
| `altitudes` | All lines ≥ Turquoise; growth-edge lines pushing White; max divergence ≤ 2 stages between any two lines |
| `drives.weights` | Stable dynamic equilibrium; fixationRisk near zero across all drives |
| `shadows[]` | Mostly integrated; remaining unresolved shadows are deep/subtle; new surfacings rare |
| `polarityVector` | direction ≥ |0.51| (STO) or ≤ -0.95 (STS); magnitude ≥ 0.7 (crystallisation phase); per-line polarity coherent |
| `transformations[]` | 8–12+ entries; late transformations are subtle frame-shifts, not dramatic upheavals |
| `stage` | Turquoise → White |

**Characteristic events:** `transformation_completed` (Turquoise → White); deep `shadow_integrated` events; polarity-locking choices; theta-decay vigilance (all lower stages must remain healthy).

**Exit criteria:** All lines at White; crystallisationIndex ≥ harvest threshold; all ray integrations complete.

### 11.5 Stage E: Harvest (endgame)

**Purpose:** The Veil lifts. Final polarity crystallises. The Significator is archived.

| Aspect | Final state |
|---|---|
| `harvestState` | `'crystallised'` |
| `polarityVector` | Locked — immutable from this point |
| Veil | Partially lifted — player may view developmental trajectory |
| Archive | Immutable copy of full Significator state preserved |

**What becomes visible to the player (per foundations/20 §8.4):**
- Full developmental trajectory (line altitudes over time)
- Shadow integration history (what was confronted, what was resolved)
- Polarity crystallisation path (the choice trail, in narrative form)
- The architecture itself — the player can now understand how the game worked

**What remains private:** Raw numerical scores, confidence intervals, staircase parameters — these are implementation detail, not meaningful to the player.

**Characteristic events:** `harvest_event` fires once; archive created; post-harvest mode unlocked.

**Exit criteria:** Player acknowledges harvest; character retired (STO → mentor presence; STS → adversarial presence; per foundations/19 §9).

### 11.6 Stage F: Post-harvest (post-MVP, reserved)

The harvested Significator persists as an archived record. Future systems may allow:
- The archived Significator to appear as an NPC in other players' worlds
- A "new incarnation" mode where the player begins fresh with subtle carry-over
- Longitudinal developmental reports for the player's personal growth record

Specification deferred to post-MVP design phase.

---

## 12. What this document does NOT cover (cross-references)

| Topic | Document |
|---|---|
| The macro/micro distinction and the four macro archetypes as pure theory | foundations/15 |
| The 4-quadrant shadow model and how shadows are surfaced in encounters | foundations/10 |
| The contact boundary, lesser-cycle topography, and catalyst→experience→integration flow | foundations/13 |
| The four drives (Agency, Communion, Eros, Agape) as motivational primitives | foundations/05 |
| Transformation events — the mechanics of stage-transition and frame-change that mutate the Significator | foundations/17 |
| The Great Way — the world-system that reconfigures on transformation_completed | foundations/18 |
| Choice and polarity — how micro-choices crystallise into macro-polarity (polarity tracking) | foundations/19 |
| The Veil of Forgetting — bounds on player observability of Significator state | foundations/20 |
| The Incarnation Architecture — how all macro-cycle documents synthesise into the master game-structure | foundations/21 |
| The Holon Context Engine — LLM context layer that reads Veil-filtered Significator state | foundations/22 |
| The encounter scheduler — observation of Significator state for catalyst selection | foundations/21 §4 |

# 22 — The Holon Context Engine

> **Cross-references:** [[AGENTS.md|AGENTS.md (process protocol)]] · [[docs/foundations/24-encounter-scheduler|24 — Encounter Scheduler]]
> **Lateral:** Implementation architecture for the LLM-driven world. Specifies how holons deliver context to the LLM, how generation is conditioned on the player's frequency (line×stage altitude), and how consequences propagate through the system.
>
> **Status:** Foundation. Implementation specification.
> **Depends on:** 11, 14, 15, 18, 21
> **Forward-references:** 16 (Significator), 19 (Choice/polarity), 20 (Veil), 43 (agentic orchestration — J-council agents are the persona lenses that carry this engine's context to the foreground)
>
> **Orchestration note (43):** the context pipeline this document specifies is *delivered* by agents — the Journey-Guide council holds the foreground while holon context flows; the primary orchestrator never voices holon content directly.

---

## 1. The LLM as manifest layer (design philosophy)

The LLM is not the author of Mysterium. It is the **manifestation layer** — a translator from structural game-state into narrative surface. The architecture is hand-authored (registries, modality contracts, scoring rubrics, scheduler, polarity engine). The LLM fills moment-to-moment flesh on this skeleton within tight rubrics.

The canon principle (per AGENTS.md §5.8, foundations/21 §10.5):

> **Fixed mechanics + adaptive content.** The LLM fills the surface; the code enforces the structure.

| Layer | Owner |
|---|---|
| What encounter to present, why, and how to score it | Engine (authored) |
| What the player experiences moment-to-moment (dialogue, description, prompts) | LLM (generated) |
| Whether the output is valid | Engine validators (authored) |

The LLM never decides macro-arc, never scores the player directly, never violates the Veil.

---

## 2. The Holon data model

### 2.1 Canonical interface

```typescript
interface Holon {
  readonly id: HolonId;
  readonly kind: HolonKind;
  readonly name: string;
  readonly parentHolons: HolonId[];
  readonly childHolons: HolonId[];
  readonly lineStageSignature: Record<Line, Stage>;
  readonly driveState: Record<'agency' | 'communion' | 'eros' | 'agape', number>; // -1.0 to +1.0
  readonly shadowState: {
    activeQuadrants: ShadowQuadrant[];
    intensity: number;       // 0.0–1.0
    domain: 'dark' | 'golden' | 'both';
  };
  readonly polarity: { direction: 'sto' | 'sts' | 'uncrystallised'; magnitude: number };
  readonly pestleDimensions?: PestleState;  // collective holons only
  readonly stateHistory: HolonStateSnapshot[];  // last 20 snapshots
  readonly relationships: HolonRelationship[];
  readonly narrativeRole: NarrativeRole | null;
  readonly llmMetadata: {
    voiceProfile: string | null;
    lastGeneratedAt: number | null;
    generationSeed: number;
    consistencyAnchors: string[];
  };
}

type HolonKind = 'individual' | 'dyadic' | 'group' | 'organisational'
  | 'cultural' | 'geopolitical' | 'ecological' | 'cosmic';
type ShadowQuadrant = 'dark-addiction' | 'dark-allergy' | 'golden-addiction' | 'golden-allergy';

interface HolonRelationship {
  targetId: HolonId;
  type: 'parent' | 'child' | 'ally' | 'antagonist' | 'mentor' | 'student' | 'rival' | 'neutral';
  strength: number;
  history: string;  // brief narrative for LLM context
}
```

### 2.2 Registry and persistence

```typescript
interface HolonRegistry {
  register(holon: Holon): void;
  get(id: HolonId): Holon | undefined;
  getByKind(kind: HolonKind): Holon[];
  getByLineStage(line: Line, stage: Stage): Holon[];
  getInShadow(): Holon[];
  update(id: HolonId, delta: Partial<Holon>): void;
}
```

- Persisted in local encrypted storage alongside PlayerProfile
- Only dirty holons written on save (change-tracking via generation counter)
- Updated ONLY via `ConsequenceRecord` outputs (§7) — never by direct LLM mutation
- Holon evolution is slower than player evolution (world inertia per foundations/18 §4.3)

---

## 3. Holon taxonomy: concrete examples

Taxonomy defined at game-design level in foundations/18 §2. Below: one concrete example per kind showing data shape and catalyst role.

### 3.1 Individual — "Kael, the Deserter"

Signature: Cognitive=Orange, Emotional=Red, Moral=Amber. Drives: Agency 0.8, Communion -0.4. Shadow: dark-allergy on interpersonal (intensity 0.7). **Catalyst:** Probes player's relationship to belonging vs. isolation at Red stage.

### 3.2 Dyadic — "Kael ↔ Player bond"

Emergent signature starts at Red. Evolves based on player choices toward Kael. **Catalyst:** Interpersonal-line encounters unlock as dyad's communion score rises.

### 3.3 Group — "The Iron Company"

Signature: Red across all lines. Drives: Agency 0.9, Agape -0.8. Shadow: dark-addiction (intensity 0.8), STS-leaning. **Catalyst:** Delivers Red-stage moral and interpersonal catalyst through faction encounters.

### 3.4 Organisational — "The Warlord Confederacy"

Red-altitude Political/Economic PESTLE. Rewards dominance, punishes weakness. **Catalyst:** Macro-scale moral dilemmas (power vs. principle).

### 3.5 Cultural — "The Honour Code"

Red-altitude shared meaning-system defining worth through combat prowess. **Catalyst:** Social pressure — player's choices judged against this code by NPCs.

### 3.6 Geopolitical — "The Shattered Territories"

Fragmented warlord domains. Political=might-makes-right, Economic=plunder. **Catalyst:** Territorial conflicts forcing strategic and moral engagement.

### 3.7 Ecological — "The Ashlands"

Harsh terrain delivering somatic/willpower catalyst through environmental pressure. **Catalyst:** Survival demands that probe endurance and body-awareness.

### 3.8 Cosmic — "Third Density"

Metaphysical ceiling. Not directly interactable. Constrains all holons: free will absolute, Veil enforced, polarity crystallisation is purpose. Referenced in system prompts as cosmological frame.

---

## 4. The context aggregation pipeline

Seven steps from encounter-spec to assembled LLM prompt.

### 4.1 Holon selection

**Input:** `ScheduledEncounter` from scheduler (foundations/21 §4.3)
**Transform:** Query registry for sourcing holon + parents (2 levels) + player relationships.
**Output:** `{ primary: Holon, contextual: Holon[], playerRelationships: HolonRelationship[] }`
**Rule:** Max 6 holons (token budget). Priority: primary > relationships > parents > ambient.

### 4.2 Significator state injection

**Input:** PlayerProfile (foundations/16)
**Transform:** Veil filter — convert numerical state to machine-language descriptors. No raw scores, no PII.
**Output:**

```typescript
interface VeilFilteredSignificator {
  perceivedLayer: Stage;
  lineAltitudes: Record<Line, Stage>;
  activeDriveSignals: string[];     // e.g., 'agency-elevated'
  activeShadowSignals: string[];    // e.g., 'dark-allergy-rising-on-interpersonal'
  recentChoicePatterns: string[];
  transformationProximity: 'distant' | 'approaching' | 'threshold';
  sessionEnergy: 'high' | 'moderate' | 'low';
}
```

### 4.3 Encounter spec injection

**Input:** `ScheduledEncounter` + compiled concept-draft data from registry
**Output:** `{ line, stage, modality, catalyticPurpose, templateStructure, scoringRubricRef, narrativeBeat }`

### 4.4 Frequency conditioning

**Input:** Significator state + holon signatures + modality
**Output:**

```typescript
interface FrequencySpec {
  playerFrequency: { line: Line; stage: Stage };
  holonFrequency: { line: Line; stage: Stage };
  modality: GameModality;
  toneDirective: string;        // e.g., 'force-based, direct, visceral'
  vocabularyBand: string;       // e.g., 'concrete, action-oriented, short sentences'
  valueLens: string;            // e.g., 'power, dominance, respect'
  taboos: string[];             // e.g., ['abstract philosophy', 'vulnerability language']
  crossAltitudeDynamic: string | null;
}
```

### 4.5 Modality rubric injection

**Input:** Encounter modality
**Output:** `{ llmResponsibilities[], generationConstraints, outputSchema, fallbackBehaviour }`
Loaded from the relevant `ModalityContract` (§6).

### 4.6 Consequence-aware context

**Input:** Selected holons' `stateHistory` + recent consequence log
**Output:** Last 3 relevant `ConsequenceRecord` summaries + world-state anchors the LLM must respect.

### 4.7 System prompt assembly

All outputs from 4.1–4.6 composed into a fixed template:

```
[ROLE] You are the manifestation layer of Mysterium.
[COSMOLOGY] Third Density constraints, Veil enforcement.
[FREQUENCY] {FrequencySpec}
[HOLONS] {Selected holons — names, signatures, voice anchors}
[ENCOUNTER] {What this encounter must accomplish}
[MODALITY] {LLM responsibilities and constraints}
[CONTINUITY] {Recent consequences, world-state anchors}
[PLAYER STATE] {VeilFilteredSignificator — machine signals only}
[OUTPUT FORMAT] {Expected JSON schema}
[RULES] {Veil rules, canon rules, forbidden patterns}
```

---

## 5. Frequency-conditioned generation

### 5.1 Stage voice specifications

| Stage | Vocabulary | Structure | Values | Taboos |
|---|---|---|---|---|
| Infrared | Sensory, primal | Fragments | Survival, warmth | Abstraction, future-planning |
| Magenta | Symbolic, animistic | Flowing, incantatory | Magic, belonging | Rational analysis |
| Red | Action verbs, force-words | Short, imperative | Power, respect, will | Vulnerability, compromise |
| Amber | Formal, duty-words | Structured, subordinate | Order, tradition, loyalty | Questioning authority |
| Orange | Precise, analytical | Complex, logical | Reason, merit, evidence | Dogma, sentiment |
| Green | Inclusive, feeling-words | Empathic, parenthetical | Sensitivity, equality | Hierarchy, exclusion |
| Turquoise | Integral, paradox-holding | Multi-layered, both/and | Wholeness, emergence | Reductionism, either/or |
| White | Minimal, spacious | Sparse, koan-like | Presence, release | Grasping, identity-claims |

### 5.2 Line register specifications

| Line | Register character |
|---|---|
| Cognitive | Analytical, problem-oriented, cause-effect |
| Emotional | Felt-sense, affect-rich, atmosphere |
| Moral | Principled, dilemma-oriented, stakeholder |
| Intrapersonal | Reflective, self-referential, pattern-recognition |
| Spiritual | Value-laden, meaning-oriented, mystery |
| Somatic | Embodied, rhythm-aware, sensation |
| Willpower | Effort-oriented, commitment, endurance |
| Interpersonal | Relational, other-aware, attunement |

### 5.3 Cross-altitude dynamics

| Relationship | Generation directive |
|---|---|
| Player higher than holon | Holon speaks authentically from its stage; no "trying to sound smart" |
| Player lower than holon | Holon speaks from its stage; player-facing text renders awe/confusion |
| Same altitude | Full mutual intelligibility; deepest engagement |
| Adjacent (±1) | Productive tension; slight misunderstanding at growth-edge |

### 5.4 Example frequency tuples

- **Cognitive × Red × Deterministic:** Sharp, competitive, immediate. "Beat this. Faster. Again."
- **Spiritual × Turquoise × Language-Reflective:** Spacious, paradox-holding. "What holds together when all frames dissolve?"
- **Moral × Orange × Scenario-Choice:** Precise, principled. Competing rights-claims with consequence-chains.

---

## 6. The modality contract

### 6.1 Contract template

```typescript
interface ModalityContract {
  name: GameModality;
  fixedMechanics: string[];           // engine-handled, NEVER LLM
  llmResponsibilities: string[];
  generationConstraints: {
    maxWordCount: number;
    tone: string;
    structure: string;
    forbiddenPatterns: string[];
  };
  scoringRubric: ScoringRubric;
  fallbackBehaviour: string;
}
```

### 6.2 Reference implementation: Language-Reflective

```typescript
const languageReflectiveContract: ModalityContract = {
  name: 'language_reflective',
  fixedMechanics: [
    'Session timing/checkpoints', 'Response recording', 'Score computation',
    'Drive-signal extraction', 'Progression-stage tracking', 'Anti-repetition'
  ],
  llmResponsibilities: [
    'Generate reflective prompt (within frequency spec)',
    'Generate follow-up probes', 'Score response against rubric',
    'Produce narrative acknowledgment (non-evaluative)'
  ],
  generationConstraints: {
    maxWordCount: 80,
    tone: 'Determined by FrequencySpec',
    structure: 'Single prompt; no lists; no instructions',
    forbiddenPatterns: [
      'Clinical language', 'Explicit praise/evaluation',
      'Scoring references', 'Frame-breaking', 'Leading questions'
    ]
  },
  scoringRubric: {
    dimensions: [
      { name: 'depth', weight: 0.3 },
      { name: 'coherence', weight: 0.2 },
      { name: 'self_reference', weight: 0.2 },
      { name: 'stage_indicators', weight: 0.2 },
      { name: 'drive_signals', weight: 0.1 }
    ],
    stageCalibration: 'Thresholds shift per stage'
  },
  fallbackBehaviour: 'Pre-authored prompt from module item-pool; keyword-matching heuristic scoring'
};
```

**Expected LLM output shape:**

```json
{
  "prompt": "The fire burns low. You chose to leave him. What lives in that choice?",
  "follow_ups": ["And if he had asked you to stay?", "What would it cost to go back?"],
  "scoring_anchors": ["self-reference to motivation", "competing values acknowledged"]
}
```

### 6.3 Other modality contracts (summary)

| Modality | LLM generates | LLM never touches |
|---|---|---|
| Deterministic Psychometric | Narrative framing only | Task mechanics, timing, scoring |
| Scenario-Choice | Scenario text, options, consequences | Option stage-tags, scoring logic |
| Embodied-Somatic | Narrative framing | Timing mechanics, input detection |
| Strategic-Planning | Scenario context | Planning mechanics, optimality scoring |
| Social-Cooperative | NPC dialogue and behaviour | Coordination mechanics, ToM scoring |
| Immersive-RPG | Ambient descriptions, micro-dialogues | Combat mechanics, physics, state |


---

## 7. The consequence threading mechanism

### 7.1 ConsequenceRecord schema

Every resolved encounter produces a machine-readable consequence alongside narrative:

```typescript
interface ConsequenceRecord {
  encounterId: string;
  timestamp: number;
  affectedHolons: {
    holonId: HolonId;
    deltas: Partial<Pick<Holon, 'driveState' | 'shadowState' | 'polarity'>>;
    narrativeSummary: string;
  }[];
  polarityDelta: { direction: 'sto' | 'sts' | 'neutral'; magnitude: number };
  shadowSignal: { quadrant: ShadowQuadrant | null; line: Line; intensity: number } | null;
  driveHealthDeltas: Partial<Record<'agency' | 'communion' | 'eros' | 'agape', number>>;
  pestleShift: { dimension: keyof PestleState; holonId: HolonId; delta: number } | null;
  narrativeSummary: string;
  consequenceType: 'immediate' | 'delayed' | 'cascading';
  expiresAfterEncounters: number;  // default 10
}
```

### 7.2 Update propagation rules

1. **Holon registry:** Apply `deltas` to each affected holon. Validate: no single delta exceeds ±0.3 per encounter.
2. **Polarity engine:** Feed `polarityDelta` to foundations/19 engine (applies momentum/inertia).
3. **Shadow ledger:** Write `shadowSignal` to Significator's Distortion Ledger (foundations/16).
4. **World PESTLE:** If `pestleShift` non-null AND holon is organisational-scale+, propagate to PESTLE state.
5. **State history:** Snapshot affected holons into their `stateHistory` arrays.
6. **Consequence log:** Append to ring buffer (max 50 entries).

### 7.3 Worked example

**Encounter A:** Moral/Red Scenario-Choice. Kael asks for help escaping the Iron Company. Player helps (STO).

Consequence produced:
- Kael: communion +0.2, shadow intensity -0.1. Summary: "Trust increased after player aided escape."
- Iron Company: shadow intensity +0.1. Summary: "Paranoia deepened after losing deserter."
- Player: polarity STO +0.05, communion +0.1.

**Encounter B (3 encounters later):** Social-Cooperative. Pipeline reads consequence log (§4.6), finds Kael's updated state. LLM receives: "Kael's trust increased; Iron Company more paranoid." LLM generates: Kael offers intelligence about Iron Company movements (natural consequence of trust). Iron Company NPCs are more hostile in ambient encounters. No additional authoring required.

---

## 8. Authored vs generated boundary (implementation level)

### 8.1 Hard-authored (NEVER LLM)

| Content | Enforcement |
|---|---|
| Registries (module-specs, line/stage/ray definitions) | Type-checked `.module.ts` files |
| Main-boss scripts, Transformation sequences, stage rites | Scripted encounter data; no LLM path exists |
| Key NPC arcs (allies, antagonists, mentors) | Authored narrative-beat sequences |
| Modality contracts and scoring rubrics | TypeScript constants, immutable at runtime |
| Encounter scheduler algorithm, polarity engine | Engine code; deterministic |
| World bible (cosmology, metaphysics) | Static reference; LLM receives as read-only |

### 8.2 LLM-generated within authored templates

| Content | Validation |
|---|---|
| NPC dialogue (moment-to-moment) | FrequencyValidator checks tone/vocabulary against stage spec |
| Environmental descriptions | LayerValidator checks for off-layer imagery |
| Reflective prompts and scoring | AltitudeValidator + range/consistency checks |
| Scenario branches within authored shape | OptionTagValidator confirms stage alignment |
| Consequence narration | HolonReferenceValidator checks all named entities exist |

### 8.3 Hybrid (LLM proposes, rules validate)

| Content | Validation |
|---|---|
| Side-NPC encounters | Must serve scheduler's catalytic purpose; no world-state contradictions |
| Codex flavour text | CanonValidator (no world-bible contradictions); layer match |
| Ambient world chatter | PESTLE-state match; no Veil-protected info |

**Enforcement:** All LLM output passes `GenerationValidator` before reaching player. Invalid → retry (max 2) → authored fallback.

---

## 9. Caching, determinism, reproducibility

**Holon voice caching:** Once generated, an NPC's voice profile is cached in `llmMetadata.voiceProfile`. Consistent across all encounters. Invalidated only on holon Transformation (altitude shift ≥ 2 stages).

**Seeded generation:** Critical beats (stage rites, key NPC first-meetings) use `generationSeed` for deterministic output. Save/load/replay produces identical text.

**Hot paths never depend on LLM:**

| Hot path | Handler |
|---|---|
| Real-time encounter micro-interactions (task timing) | Engine physics |
| Deterministic-modality task execution | Engine task runner |
| Input detection, score computation, checkpoint save | Engine systems |

**Offline play:** Core loop intact without LLM. Language-Reflective falls back to pre-authored prompt pools with keyword-matching scoring. Scenario-Choice uses pre-authored pools. Ambient generation disabled; authored descriptions from world-bibles used instead. Game is **fully playable offline**; LLM enhances fidelity but is never required.

---

## 10. Latency and performance

**Async-first:** All LLM calls non-blocking. Game loop never waits.

**Pre-generation:** Scheduler operates 2–3 encounters ahead. Generation begins when encounter is queued, completes before player arrives. If not ready: authored fallback shown, hot-swapped when generation completes.

**Streaming:** Long-form content (mentor speeches, codex) uses streaming with typewriter effect.

**Token budget:**

| Type | Max tokens |
|---|---|
| Reflective prompt | 200 |
| Scenario + options | 500 |
| NPC dialogue turn | 150 |
| Response scoring | 300 |
| Per-session total | 15,000 |

When budget exhausted, remaining encounters use authored fallbacks.

**Target:** <200ms perceived latency via pre-generation + streaming + fallback-swap.

---

## 11. Privacy and locality

**PII never leaves device.** Player name, location, device IDs never included in any LLM payload.

**What is sent (if cloud opted-in):** Frequency spec (stage/line labels), holon context (fictional NPC data), encounter template, modality constraints.

**What is never sent:** Player identity, raw scores, session timestamps, device IDs, player-written reflective responses (scored locally or via anonymised API).

**Local-first inference:** Small on-device model (<2GB quantised) handles ambient generation (flavour text, greetings). Cloud reserved for high-stakes generation (scoring, scenario creation).

**Cloud is opt-in.** Game functions fully without it. Opt-in screen explains what is/isn't sent.

**Telemetry encrypted at rest** using device-local keys. No transmission unless player opts into anonymised research (future, not MVP).

---

## 12. Failure modes and fallbacks

| Failure | Detection | Recovery |
|---|---|---|
| LLM unavailable | HTTP timeout/error | Authored fallback from module item-pool |
| Invalid output (wrong structure) | `GenerationValidator` | Retry (max 2) → authored fallback |
| Off-frequency (wrong tone) | `FrequencyValidator` | Retry with emphasis → fallback |
| Canon violation (invented lore) | `CanonValidator` | Retry with anchors → fallback |
| Veil violation (reveals meta-info) | `VeilValidator` pattern-match | Immediate rejection → fallback (no retry) |
| Harmful content | Safety filter + rules | Immediate rejection → safe alternative |
| Token budget exhausted | Counter check | No generation; authored fallbacks for session |
| Latency exceeded (>3s) | Timeout | Cancel; authored fallback; hot-swap if late |

**Principle:** The player never experiences a failure. Every mode has an authored fallback maintaining gameplay continuity.

---

## 13. Telemetry and the Veil

### 13.1 What the LLM knows

| LLM receives | LLM does NOT receive |
|---|---|
| `agency-elevated` | Agency score: 0.82 |
| `dark-allergy-active-on-interpersonal` | Detection confidence: 0.7 |
| `perceived-layer: red` | Stage score: 3.2/8.0 |
| `transformation-approaching` | Convergence count: 6/8 |

Machine-language signals only. No numbers, no raw metrics.

### 13.2 What the LLM must never surface

- Stage names/numbers, drive labels, shadow quadrant names
- Score language, assessment language, meta-game language
- Therapeutic language ("you seem to be avoiding...")

### 13.3 The translation principle

| Machine signal (LLM input) | Narrative surface (LLM output) |
|---|---|
| `agency-pathology-rising` | NPC challenges rigidity: "You stand alone again. Does the wall keep danger out — or keep you in?" |
| `communion-suppressed` | Group encounter with gentle inclusion pressure |
| `golden-allergy-on-eros` | Mentor embodies next stage; narrative renders player's resistance as tension |

The Veil is maintained: the player experiences story, not assessment.

---

## 14. What this document does NOT cover (cross-references)

| Topic | Document | Relationship |
|---|---|---|
| Modality definitions, triangulation | foundations/11 | This doc constrains LLM per modality; 11 defines modalities |
| Lesser-cycle catalyst flow | foundations/14 | This doc generates catalyst surface; 14 defines the flow |
| Macro-scale archetypal theory | foundations/15 | This doc implements the theory; 15 IS the theory |
| Significator state schema | foundations/16 | This doc reads from Significator; 16 defines its structure |
| Great Way world structure | foundations/18 | This doc implements holons as data; 18 defines them as design |
| Consequence propagation logic | foundations/19 | This doc produces ConsequenceRecords; 19 propagates them |
| Veil constraints | foundations/20 | This doc enforces Veil in generation; 20 defines why |
| Encounter scheduler | foundations/21 | This doc receives scheduler output; 21 defines the scheduler |
| Concept-draft templates | concept-drafts/README.md | This doc consumes concept-drafts as encounter specs |

---

*This document is the implementation bridge between the game's authored architecture and its living, adaptive surface. Every other foundation defines WHAT the game is; this document defines HOW the LLM brings it to life — within constraints that keep it honest, developmental, and veiled.*

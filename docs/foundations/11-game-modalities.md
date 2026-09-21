# foundations/11 — Game Modalities and the Multi-Game Ecosystem
> **Heading-contract map (2026-09-16):** Purpose → §1; Scientific basis → §2–§4 (each modality row names its measured construct and literature anchor); Game-design mapping → §6–§7; Architectural contract → §10; Principles served → §11.
>
> **Open questions (added 2026-09-16 — none previously stated):**
> - Does the modality × line affinity matrix need per-stage modifiers (a dilemma probes Moral differently at Red than at Green), or is affinity stage-invariant as currently canonised?
> - What is the minimum encounter count per modality for stable cross-modality triangulation (the doc asserts triangulation but not its sampling floor)?
> - Should Immersive-RPG free-play override staircase pacing when flow absorption is detected, and how is that reconciled with scheduler authority (24)?
> **Satisfied by:** `src/core/engines/CandidateGeneration.ts` (the modality x line affinity (`MODALITY_TASK_TYPES`) that routes a capacity to a modality) · `src/core/domain/enums.ts` (the modality set itself)

## 1. Purpose

Define the **complete palette of game types** available to the Mysterium engine, how each modality maps to specific assessment dimensions, and how multiple games per module create a robust, non-gameable, multi-dimensional assessment of each capacity. No single game type can assess the full depth of a developmental capacity — therefore each of the 64 modules must support **multiple game modalities** that triangulate the truth.

This document answers: *What kinds of games can we build, what does each kind measure, and how do they compose into a complete assessment ecosystem?*

---

## 2. The Seven Game Modalities

### 2.1 Taxonomy

| # | Modality | Description | Primary assessment strength | Example |
|:-:|---|---|---|---|
| 1 | **Deterministic Psychometric** | Timed tasks with objectively correct answers; performance is measurable without interpretation | Accuracy, speed, consistency, ceiling | n-back, Stroop, Go/No-Go, reaction time |
| 2 | **Language-Based Reflective** | Open-ended prompts requiring written/spoken response; scored by LLM against developmental rubrics | Depth, coherence, integration, metacognition | "Why did you choose that?", "Describe yourself", "What would you feel?" |
| 3 | **Scenario-Choice (MCQ+)** | Branching scenarios with multiple options tagged to developmental stages; choice patterns reveal structure | Moral stage, value hierarchy, decision patterns | Dilemmas, temptation scenarios, value-ranking |
| 4 | **Embodied/Somatic** | Tasks requiring physical timing, rhythm, sustained input, or body-awareness | Motor control, rhythm, endurance, proprioception | Hold-button, rhythm tapping, reaction time, anticipatory timing |
| 5 | **Strategic/Planning** | Tasks requiring multi-step planning, resource allocation, or systems thinking | Executive function, foresight, strategic allocation | Tower of Hanoi, resource management, multi-step puzzles |
| 6 | **Social/Cooperative** | Tasks requiring coordination with NPCs or other players; reading intent, predicting behaviour | Theory of mind, attunement, coordination, empathy | Pattern prediction, cooperative timing, false-belief tasks |
| 7 | **Immersive RPG** | Narrative-embedded encounters where assessment is invisible; the player is "just playing" | Ecological validity, spontaneous behaviour, drive expression | Combat encounters, exploration choices, NPC dialogue |

### 2.2 What each modality CAN and CANNOT measure

| Modality | Measures well | Cannot measure |
|---|---|---|
| Deterministic Psychometric | Accuracy, speed, ceiling, consistency | Depth of reasoning, values, social capacity |
| Language-Based Reflective | Depth, coherence, self-awareness, integration | Speed, motor control, unconscious patterns |
| Scenario-Choice | Decision structure, value hierarchy, moral stage | Whether the choice is genuine (social desirability) |
| Embodied/Somatic | Motor precision, rhythm, endurance, body-awareness | Cognitive complexity, moral reasoning |
| Strategic/Planning | Executive function, foresight, systems thinking | Emotional depth, social attunement |
| Social/Cooperative | Theory of mind, coordination, empathy | Individual cognitive ceiling, somatic capacity |
| Immersive RPG | Ecological validity, spontaneous drive expression | Isolated capacity measurement (too many variables) |

### 2.3 The triangulation principle

**No single modality is sufficient.** Each module must use ≥ 3 modalities to triangulate:

```
Module assessment = f(
  deterministic_score,    // what they CAN do (ceiling)
  reflective_score,       // how DEEPLY they understand it
  choice_pattern_score,   // what they CHOOSE when free
  [embodied_score],       // how their BODY participates (where relevant)
  [social_score],         // how they RELATE through it (where relevant)
)
```

The immersive RPG modality serves as the **ecological validator** — if the player demonstrates a capacity in isolated tasks but NOT in free-play, the assessment confidence drops.

---

## 3. Modality × Line Affinity Matrix

Each line has natural affinities with certain modalities:

| Line | Primary modalities | Secondary modalities | Tertiary (ecological) |
|---|---|---|---|
| **Cognitive** | Deterministic Psychometric, Strategic/Planning | Language-Based (metacognition) | Immersive RPG |
| **Emotional** | Scenario-Choice, Language-Based Reflective | Social/Cooperative | Immersive RPG |
| **Moral** | Scenario-Choice, Language-Based Reflective | Social/Cooperative | Immersive RPG |
| **Intrapersonal** | Language-Based Reflective, Scenario-Choice | Deterministic (prediction accuracy) | Immersive RPG |
| **Spiritual** | Scenario-Choice, Language-Based Reflective | Embodied (coherence under pressure) | Immersive RPG |
| **Somatic** | Embodied/Somatic, Deterministic Psychometric | Strategic (anticipation) | Immersive RPG |
| **Willpower** | Embodied/Somatic, Strategic/Planning | Scenario-Choice (delay of gratification) | Immersive RPG |
| **Interpersonal** | Social/Cooperative, Scenario-Choice | Language-Based (perspective-taking) | Immersive RPG |

---

## 4. Modality × Drive Measurement

Each modality has natural strengths for measuring specific drives:

| Modality | Measures Agency via | Measures Communion via | Measures Eros via | Measures Agape via |
|---|---|---|---|---|
| **Deterministic** | Performance without hints/support | N/A (individual task) | Willingness to attempt harder level | Willingness to return to easier level |
| **Language-Based** | Self-authored responses (not copying) | Responses that include others | Responses that reach beyond current understanding | Responses that embrace earlier/simpler truths |
| **Scenario-Choice** | Choices that assert boundaries | Choices that prioritise connection | Choices that risk growth | Choices that return to care for what's below |
| **Embodied** | Solo performance without encouragement | Cooperative rhythm/timing | Attempting longer/harder holds | Returning to easy holds with full presence |
| **Strategic** | Independent strategy formation | Collaborative strategy | Attempting higher-complexity problems | Revisiting solved problems with new insight |
| **Social** | Leading/initiating in coordination | Following/adapting in coordination | Attempting harder social challenges | Supporting others at easier levels |
| **Immersive RPG** | Autonomous exploration/combat choices | Cooperative/helping behaviours | Pursuing harder content voluntarily | Returning to earlier areas to help/heal |

---

## 5. The Multi-Game-Per-Module Architecture

### 5.1 Each module is a POOL, not a single game

```ts
interface ModuleGamePool {
  readonly line: Line;
  readonly stage: Stage;
  readonly games: readonly GameDefinition[];  // ≥ 5 games per module
  readonly minimumModalities: 3;              // must cover ≥ 3 modalities
  readonly driveProbeGames: {                 // dedicated drive-measurement games
    agency: GameDefinition;
    communion: GameDefinition;
    eros: GameDefinition;
    agape: GameDefinition;
  };
}

interface GameDefinition {
  readonly id: string;
  readonly modality: GameModality;
  readonly title: string;
  readonly description: string;
  readonly estimatedDurationMs: number;
  readonly measures: readonly MeasureDimension[];
  readonly driveSignals: readonly Drive[];     // which drives this game can measure
  readonly itemPool: readonly GameItem[];      // ≥ 20 items for anti-repetition
  readonly scoringRubric: ScoringRubric;
  readonly llmRubric?: string;                 // for language-based/scenario games
}

type GameModality =
  | 'deterministic_psychometric'
  | 'language_reflective'
  | 'scenario_choice'
  | 'embodied_somatic'
  | 'strategic_planning'
  | 'social_cooperative'
  | 'immersive_rpg';
```

### 5.2 Game selection within a module

When the engine needs to assess a player at (line, stage):

```
1. Determine assessment purpose: capacity | shadow | drive-health
2. Select modalities based on purpose:
   - Capacity: primary + secondary modalities for this line
   - Shadow: modalities that reveal drive-health (see §4)
   - Drive-health: dedicated drive-probe games
3. From the selected modalities, pick games the player hasn't seen recently
4. Run 2-4 games (depending on confidence needed)
5. Aggregate scores across games using modality-weighted rubric
```

### 5.3 Why multiple games matter

| Problem with single-game assessment | How multi-game solves it |
|---|---|
| Can be spoofed (learn the pattern) | Different games measure the same construct differently |
| Measures only one dimension | Different modalities cover different dimensions |
| Repetitive (player sees same content) | Large pool across multiple game types |
| Narrow ecological validity | Immersive RPG validates isolated-task findings |
| Cannot measure drives implicitly | Dedicated drive-probe games embedded naturally |
| Single bad session distorts profile | Aggregation across games smooths noise |

---

## 6. Per-Modality Design Specifications

### 6.1 Deterministic Psychometric Games

**Design principles:**
- Objectively scoreable (no interpretation needed)
- Timed (RT is a signal)
- Adaptive difficulty (staircase or equivalent)
- Large item pools (≥ 50 items per game)
- Clear visual/auditory feedback

**Game types within this modality:**
| Game type | What it measures | Lines it serves |
|---|---|---|
| N-back (visual/auditory) | Working memory capacity | Cognitive |
| Stroop / flanker | Inhibitory control | Cognitive, Willpower |
| Go/No-Go | Impulse resistance | Willpower, Cognitive |
| Simple/choice RT | Processing speed, motor readiness | Somatic |
| WCST (card sorting) | Cognitive flexibility | Cognitive |
| Pattern completion | Analogical reasoning | Cognitive |
| Rhythm reproduction | Sensorimotor synchronisation | Somatic |
| Anticipatory timing | Predictive motor control | Somatic |
| Sustained attention (CPT) | Vigilance, sustained focus | Willpower |
| Dual-task | Divided attention, multi-tasking | Cognitive, Willpower |

### 6.2 Language-Based Reflective Games

**Design principles:**
- Open-ended prompts (no "right answer")
- LLM-scored against developmental rubrics
- Rubrics are stage-specific (what counts as "deep" at Red ≠ at Green)
- Response time is a secondary signal (faster = more automatic = higher integration)
- Follow-up probes deepen assessment ("Tell me more", "What if X?")

**Game types within this modality:**
| Game type | What it measures | Lines it serves |
|---|---|---|
| Self-description ("Who are you?") | Self-concept complexity, stage of identity | Intrapersonal |
| Justification ("Why did you choose that?") | Moral reasoning depth, principle articulation | Moral |
| Emotion labelling ("What are you feeling?") | Emotional granularity, present-moment awareness | Emotional, Intrapersonal |
| Value articulation ("Why does X matter?") | Spiritual depth, value-hierarchy coherence | Spiritual |
| Perspective-taking ("What would they feel?") | Theory of mind, empathic depth | Interpersonal, Emotional |
| Metacognitive prediction ("How well did you do?") | Self-knowledge accuracy | Intrapersonal, Cognitive |
| Paradox holding ("Both X and Y are true — how?") | Dialectical thinking, integration capacity | Cognitive (post-formal), Spiritual |
| Narrative construction ("Tell the story of...") | Meaning-making, coherence, temporal integration | Intrapersonal, Spiritual |

### 6.3 Scenario-Choice Games (MCQ+)

**Design principles:**
- Options tagged to developmental stages (invisible to player)
- No "right answer" — all options are valid actions
- Choice PATTERN across multiple scenarios reveals structure
- Follow-up with language-based probe for depth ("Why?")
- Large scenario pools (≥ 20 per module) to prevent memorisation
- Options randomised in order

**Game types within this modality:**
| Game type | What it measures | Lines it serves |
|---|---|---|
| Moral dilemmas (Kohlberg-style) | Moral stage, reasoning structure | Moral |
| Value-temptation scenarios | Value coherence under pressure | Spiritual |
| Emotional scenarios ("What would you feel?") | Emotional complexity, self-other differentiation | Emotional, Intrapersonal |
| Social scenarios ("What would you do?") | Interpersonal strategy, theory of mind | Interpersonal |
| Delay-of-gratification choices | Willpower, temporal discounting | Willpower |
| Risk/reward trade-offs | Agency/communion balance, strategic thinking | Willpower, Cognitive |
| Perspective-conflict scenarios | Integration capacity, dialectical thinking | All lines at Green+ |

### 6.4 Embodied/Somatic Games

**Design principles:**
- Require physical input (tap, hold, swipe, rhythm)
- Measure timing precision, not just correctness
- Include sustained-effort components
- Include perturbation/distraction resistance
- Body-awareness probes (interoception where possible)

**Game types within this modality:**
| Game type | What it measures | Lines it serves |
|---|---|---|
| Simple/choice reaction time | Motor readiness, processing speed | Somatic |
| Rhythm tapping (sync then continue) | Internalised rhythm, sensorimotor integration | Somatic |
| Sustained hold (with perturbation) | Endurance, impulse resistance | Willpower, Somatic |
| Anticipatory timing (predict arrival) | Predictive motor control | Somatic |
| Rapid alternation (tap patterns) | Motor coordination, speed | Somatic |
| Breath-paced input | Interoceptive awareness, self-regulation | Somatic, Intrapersonal |
| Progressive relaxation (release on cue) | Letting-go capacity, flexibility | Willpower (Agape probe) |
| Polyrhythm (3-against-2) | Complex coordination | Somatic (Orange+) |

### 6.5 Strategic/Planning Games

**Design principles:**
- Multi-step problems with clear goals
- Measure planning depth (how many steps ahead)
- Measure error correction (do they recover from mistakes?)
- Measure resource allocation (strategic willpower)
- Adaptive complexity

**Game types within this modality:**
| Game type | What it measures | Lines it serves |
|---|---|---|
| Tower of Hanoi (2-5 discs) | Planning depth, sequential reasoning | Cognitive |
| Resource allocation ("spend 3 tokens wisely") | Strategic willpower, foresight | Willpower, Cognitive |
| Path planning (maze with constraints) | Spatial reasoning, constraint satisfaction | Cognitive |
| Multi-objective optimisation | Systems thinking, trade-off reasoning | Cognitive (Green+) |
| Scheduling (order tasks by priority) | Executive function, value-based prioritisation | Willpower, Spiritual |
| Prediction markets ("what will happen next?") | Probabilistic reasoning, calibration | Cognitive, Interpersonal |

### 6.6 Social/Cooperative Games

**Design principles:**
- Involve NPC or player partners
- Measure coordination, not just individual performance
- Include theory-of-mind probes (predict partner's action)
- Include cooperative timing (sync with another)
- Include conflict resolution (disagree productively)

**Game types within this modality:**
| Game type | What it measures | Lines it serves |
|---|---|---|
| Pattern prediction (predict NPC's next move) | Theory of mind, pattern recognition | Interpersonal |
| Cooperative timing (sync with NPC) | Attunement, mutual adaptation | Interpersonal, Somatic |
| False-belief tasks (NPC doesn't know X) | Perspective-taking, ToM | Interpersonal |
| Negotiation scenarios (find mutual benefit) | Conflict resolution, communion | Interpersonal, Moral |
| Teaching tasks (explain to NPC) | Communication, communion | Interpersonal, Cognitive |
| Trust games (share resources with NPC) | Trust, risk assessment, communion | Interpersonal, Willpower |
| Recursive prediction (NPC adapts to you) | Meta-cognition, recursive ToM | Interpersonal (Teal+) |

### 6.7 Immersive RPG Games

**Design principles:**
- Assessment is INVISIBLE — the player is "just playing"
- Behaviour is observed, not tested
- Choices reveal drives and values spontaneously
- Combat mechanics ARE assessment tasks (n-back = spell, Stroop = parry)
- Exploration patterns reveal avoidance/approach (allergy/addiction)
- NPC interactions reveal interpersonal capacity

**Game types within this modality:**
| Game type | What it measures | Lines it serves |
|---|---|---|
| Assessment-module encounters (real-time cognitive tasking + overlays) | Cognitive ceiling, motor control, willpower | Cognitive, Somatic, Willpower |
| Dialogue trees (NPC conversations) | Moral reasoning, empathy, communication | Moral, Interpersonal, Emotional |
| Exploration choices (where do they go?) | Curiosity (Eros), avoidance patterns (allergy) | All lines (drive measurement) |
| Resource management (inventory, upgrades) | Strategic thinking, value priorities | Willpower, Spiritual |
| Side-quest acceptance/rejection | Value hierarchy, time allocation | Spiritual, Willpower |
| Party management (if multiplayer) | Leadership, coordination, communion | Interpersonal |
| Environmental puzzles | Cognitive flexibility, spatial reasoning | Cognitive |

---

## 7. The Healing Dimensions

### 7.1 How game modalities map to healing domains

The game ecosystem serves not just assessment but active **healing and evolution** across multiple domains:

| Healing domain | Primary modalities | Mechanism of action |
|---|---|---|
| **Psychological** | Language-Based, Scenario-Choice, Immersive RPG | Self-awareness, pattern recognition, shadow integration, meaning-making |
| **Neurological** | Deterministic Psychometric, Strategic/Planning | Neural plasticity via repeated challenge at the edge; working memory training; executive function development |
| **Sociological** | Social/Cooperative, Immersive RPG | Theory of mind development; coordination practice; conflict resolution; perspective-taking |
| **Biological/Somatic** | Embodied/Somatic | Motor learning; rhythm entrainment; interoceptive accuracy; stress-response regulation |
| **Spiritual/Existential** | Language-Based, Scenario-Choice | Value clarification; meaning-making; coherence under uncertainty; paradox tolerance |
| **Volitional** | Embodied, Strategic, Scenario-Choice | Delay of gratification training; impulse control; strategic effort allocation; flexible persistence |

### 7.2 The developmental catalyst principle

Each game is not just measuring — it is **actively developing** the capacity it measures. This is the core design principle:

> The act of being assessed IS the act of developing. The game does not test-then-teach; it tests-AS-teaching. Every trial at the player's edge is a developmental stimulus.

This is grounded in:
- **Vygotsky's Zone of Proximal Development** — learning happens at the edge, not in comfort
- **Ericsson's deliberate practice** — improvement requires challenge at threshold + feedback
- **Csikszentmihalyi's flow** — engagement requires challenge matched to skill
- **Neuroplasticity** — neural circuits strengthen through repeated activation at threshold

---

## 8. Module Composition Rules

### 8.1 Minimum viable module

Every module (line × stage) must contain:

| Requirement | Minimum | Purpose |
|---|---|---|
| Total games | ≥ 5 | Variety, anti-repetition |
| Modalities covered | ≥ 3 | Triangulation |
| Items per game | ≥ 20 | Anti-memorisation |
| Drive-probe games | 4 (one per drive) | Implicit drive measurement |
| LLM-scored games | ≥ 1 (for qualitative lines) | Depth assessment |
| Embodied games | ≥ 1 | Somatic grounding |
| Estimated total duration | 8-15 minutes (full assessment) | Practical constraint |
| Single-trial mode | All games must support | For combat/encounter use |

### 8.2 Game selection algorithm

```ts
function selectGames(
  module: ModuleGamePool,
  purpose: 'capacity' | 'shadow' | 'drive_health',
  recentlyPlayed: string[],
  confidenceNeeded: number,
): GameDefinition[] {
  const candidates = module.games.filter(g => !recentlyPlayed.includes(g.id));

  if (purpose === 'capacity') {
    // Select from primary + secondary modalities
    return selectByModality(candidates, module.line, confidenceNeeded);
  }
  if (purpose === 'shadow') {
    // Select games that reveal drive-health
    return [...module.driveProbeGames.values()].filter(g => !recentlyPlayed.includes(g.id));
  }
  if (purpose === 'drive_health') {
    // Select the specific drive-probe game
    return [module.driveProbeGames[targetDrive]];
  }
}
```

### 8.3 Score aggregation across games

```ts
function aggregateModuleScore(
  gameResults: GameResult[],
  purpose: 'capacity' | 'shadow',
): ModuleAssessmentResult {
  // Weight by modality reliability for this line
  const weights = MODALITY_WEIGHTS[module.line];

  // Capacity: weighted average of dimension scores
  // Shadow: drive-health scores from drive-probe games
  // Confidence: increases with number of games and consistency across them
}
```

---

## 9. The Ecosystem Vision

### 9.1 Scale

```
64 modules × ≥ 5 games per module = ≥ 320 unique games
320 games × ≥ 20 items per game = ≥ 6,400 unique items
```

This is a **content ecosystem**, not a single game. It is:
- Large enough that no player sees the same content twice in a month
- Diverse enough that no single strategy can game the system
- Deep enough that genuine development is the only path to advancement

### 9.2 Content creation pipeline

Each game is defined by:
1. **Modality** — which of the 7 types
2. **Line × Stage** — which module it belongs to
3. **Assessment dimensions** — what it measures
4. **Drive signals** — which drives it can reveal
5. **Item pool** — the specific content (scenarios, stimuli, patterns)
6. **Scoring rubric** — how responses map to scores
7. **LLM rubric** (if applicable) — the developmental rubric for AI scoring

This is a **data-driven** system. Adding a new game to a module is adding data, not writing new code. The engine renders any game from its definition.

### 9.3 Extensibility

The 7 modalities are not exhaustive. Future modalities could include:
- **Creative/Generative** — draw, compose, build (measures creativity, expression)
- **Meditative/Contemplative** — sustained attention, open awareness (measures state access)
- **Physical/Movement** — accelerometer-based (measures body intelligence on mobile)
- **Collaborative/Multiplayer** — real human partners (measures genuine social capacity)

Each new modality plugs into the same architecture: it produces scores on the standard dimensions, signals drives, and integrates with the module pool.

---

## 10. Architectural Contract

```ts
type GameModality =
  | 'deterministic_psychometric'
  | 'language_reflective'
  | 'scenario_choice'
  | 'embodied_somatic'
  | 'strategic_planning'
  | 'social_cooperative'
  | 'immersive_rpg';

const ALL_MODALITIES: readonly GameModality[] = [...];

interface GameDefinition {
  readonly id: string;
  readonly modality: GameModality;
  readonly line: Line;
  readonly stage: Stage;
  readonly title: string;
  readonly measures: readonly MeasureDimension[];
  readonly driveSignals: readonly Drive[];
  readonly itemPool: readonly GameItem[];
  readonly scoringRubric: ScoringRubric;
  readonly llmRubric?: string;
  readonly singleTrialCapable: boolean;
  readonly estimatedDurationMs: number;
}

interface ModuleGamePool {
  readonly line: Line;
  readonly stage: Stage;
  readonly games: readonly GameDefinition[];
  readonly driveProbeGames: Record<Drive, GameDefinition>;
}
```

---

## 11. Principles Served

Principles **1, 2, 3, 4, 5, 6** — every game is a validated assessment (1), no clinical ambition but legitimate efficacy (2), adaptive to any age/altitude (3), modular foundation (4), multi-dimensional (5), and the game IS the development (6).

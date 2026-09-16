# 02 — Glossary

> **Cross-references:** [[docs/foundations/10-shadow-and-pathology|10 — Shadow And Pathology]] · [[docs/foundations/23-polarity-ontology|23 — Polarity Ontology]] · [[docs/foundations/25-cumulative-consciousness-index|25 — Cumulative Consciousness Index]] · [[docs/foundations/30-holonic-curriculum-architecture|30 — Holonic Curriculum Architecture]] · [[docs/foundations/31-depth-assessment-model|31 — Depth Assessment Model]] · [[docs/foundations/20-veil-of-forgetting|20 — Veil Of Forgetting]]

## 1. Purpose

A single, canonical, alphabetised definition for every domain term used anywhere in `/docs/`. If a term has nuance, the glossary entry says so and points to the document where the nuance is explored.

Terms are normative: when a document uses one of these words, it uses *this* definition. Conflicts are resolved by editing this file, not the using document.

## 2. Scientific basis

Each entry cites the originating literature where applicable. When a concept is contested between literatures (e.g., "stage" in Piaget vs. Wilber vs. Kohlberg), the glossary records the Mysterium-canonical reading and cross-references the alternatives.

## 3. Game-design mapping

The glossary doubles as the *vocabulary the player will eventually encounter* — every term that surfaces in tooltips, codex entries, or stage-up screens must appear here so that in-game text remains consistent with the design canon.

## 4. Architectural contract

Every TypeScript identifier in `core/domain/` that names a concept defined here must spell it identically. E.g., `Stage`, `Line`, `Quadrant`, `Ray` are top-level types whose string-literal members exactly match the slug column below.

```
type Stage = 'Infrared'|'Magenta'|'Red'|'Amber'|'Orange'|'Green'|'Turquoise'|'White';
type Line  = 'Cognitive'|'Emotional'|'Moral'|'Intrapersonal'|'Spiritual'|'Somatic'|'Willpower'|'Interpersonal';
type Quadrant = 'UL'|'UR'|'LL'|'LR';
type State = 'Gross'|'Subtle'|'Causal'|'Witness'|'NonDual';
type Drive = 'Agency'|'Communion'|'Eros'|'Agape';
type Ray   = 'Red'|'Orange'|'Yellow'|'Green'|'Blue'|'Indigo'|'Violet';   // canon — see foundations/06
type BlueFlow = 'in'|'out';                                              // required when Ray === 'Blue'
type Modality = 'Deterministic'|'LanguageReflective'|'ScenarioChoice'|'EmbodiedSomatic'|'StrategicPlanning'|'SocialCooperative'|'ImmersiveRPG';
type ShadowQuadrant = 'DarkAddiction'|'DarkAllergy'|'GoldenAddiction'|'GoldenAllergy';
type PolarityDirection = 'STO'|'STS'|'Neutral';
```

These are the canonical strings. Using `'IndividualInterior'` instead of `'UL'` anywhere in `core/` is a lint failure.

## 5. Glossary entries

### Top-level structures

| Term | Slug | Definition |
|---|---|---|
| **AQAL** | `AQAL` | Wilber's "all quadrants, all levels" meta-framework. Mysterium uses the four-quadrant version (UL, UR, LL, LR) plus levels (= stages) and lines. |
| **Altitude** | `altitude` | The level a *single line* has reached, independent of other lines. A player has eight altitudes simultaneously. Distinguished from *stage*, which is a synthesis. |
| **Drive** | `Drive` | One of {Agency, Communion, Eros, Agape}. The polarity engine that motivates story-level conflict and gives each line a "tilt." |
| **Encounter** | `encounter` | A single assessment interaction. Always typed by `(line, stage, modality, drives_in_play)`. |
| **Holon** | `holon` | Wilber's term for "a whole that is part of a larger whole." Used in Mysterium to describe sub-octaves, recursive level structures, and curriculum knowledge nodes. |
| **Line (of intelligence)** | `Line` | A relatively-independent developmental stream. Mysterium canonises eight: see table above. |
| **Quadrant** | `Quadrant` | One of UL (individual interior), UR (individual exterior), LL (collective interior), LR (collective exterior). |
| **Significator** | `Significator` | The sole state vessel for the player's developmental profile. Replaces the legacy PlayerProfile. Stores altitudes, shadow ledger, drive balance, transformation state, theta timestamps, and polarity traces. |
| **Stage (of consciousness)** | `Stage` | One of the eight macro-developmental levels Infrared → White. Stage is reached only when *every* line has cleared the threshold, not when one has. |
| **State** | `State` | One of {Gross, Subtle, Causal, Witness, Non-Dual}. Orthogonal to stage; trains via meditative mini-game. |
| **Sub-octave** | `sub_octave` | The fractal recapitulation of the eight-stage octave inside a single stage. Used in the Law-of-One layer. |

### Lines, expanded

| Line | Slug | Quadrant home | One-line definition |
|---|---|---|---|
| Cognitive | `Cognitive` | UR | The capacity to take perspectives; depth of cognitive complexity. |
| Emotional | `Emotional` | UL | The capacity to register, regulate, and read feelings — own and other. |
| Moral | `Moral` | UL→LL | The capacity to discern right action; egocentric→ethnocentric→worldcentric→kosmocentric. |
| Intrapersonal | `Intrapersonal` | UL | The capacity to introspect and accurately self-report. |
| Spiritual | `Spiritual` | UL | The capacity to discern what is most fundamentally important; "ultimate concern." |
| Somatic | `Somatic` | UR | The capacity to inhabit and skilfully use the body. |
| Willpower | `Willpower` | UL→UR | The capacity to set a goal and execute toward it across time. |
| Interpersonal | `Interpersonal` | LL | The capacity to skilfully attune to and engage other selves. |

### Stages, expanded

| Stage | Slug | Energy ray (canonical) | Defining capacity |
|---|---|---|---|
| Infrared | `Infrared` | Red | Survival, sensory-motor |
| Magenta | `Magenta` | Orange | Symbol, fantasy, magical agency |
| Red | `Red` | Yellow | Ego, will, dominance |
| Amber | `Amber` | Green | Belonging, rule-and-role |
| Orange | `Orange` | Blue (in) | Reason, achievement, science |
| Green | `Green` | Blue (out) | Sensitivity, plurality, inclusion |
| Turquoise | `Turquoise` | Indigo | Vision-logic, holism |
| White | `White` | Violet | Non-dual, harvest |

### Rays, expanded (canonical — see `foundations/06`)

| Ray | Slug | Energy centre | Stage hosted | Function in the world |
|---|---|---|---|---|
| Red | `Red` | Root / Muladhara | Infrared | Foundation; basic strengthening |
| Orange | `Orange` | Sacral / Svadhisthana | Magenta | Emotional / sacral identity |
| Yellow | `Yellow` | Solar plexus / Manipura | Red | Ego / will; "great stepping-stone ray" |
| Green | `Green` | Heart / Anahata | Amber | First true heart-opening |
| Blue | `Blue` (`in` / `out`) | Throat / Vishuddha | Orange (in) / Green (out) | Co-creator, bidirectional |
| Indigo | `Indigo` | Brow / Ajna | Turquoise | Gateway; vision-logic |
| Violet | `Violet` | Crown / Sahasrara | White | Total integration; harvest |

### Assessment modalities

| Modality | Slug | Unique axis | What it alone can measure |
|---|---|---|---|
| **Deterministic** | `Deterministic` | Objective psychophysics | Ground-truth capacity (binary correct/incorrect, ms timing). The calibration anchor. |
| **Language-Reflective** | `LanguageReflective` | Verbal metacognition | Whether the player can ARTICULATE their process. Bridges implicit capacity to explicit awareness. |
| **Scenario-Choice** | `ScenarioChoice` | Contextual decision-making | Whether the player can APPLY capacity wisely in ambiguous situations. Wisdom, not just skill. |
| **Embodied-Somatic** | `EmbodiedSomatic` | Body-as-medium | Whether capacity is EMBODIED (not just mental). The body's relationship to the line's capacity. |
| **Strategic-Planning** | `StrategicPlanning` | Multi-step sequencing | Whether the player can PLAN within the capacity's domain. Executive function applied to this line. |
| **Social-Cooperative** | `SocialCooperative` | Relational coordination | Whether the player can exercise capacity WITH OTHERS. The social dimension of the line. |
| **Immersive-RPG** | `ImmersiveRPG` | Ecological/spontaneous | Whether capacity appears NATURALLY in free-play. Transfer to lived behaviour. |

### Cognitive tasks (canonical task set)

| Task | Slug | Trains | Assessment vehicle |
|---|---|---|---|
| n-back | `n_back` | Working memory, dlPFC | Timed recall accuracy — measures how many items you can hold in mind |
| Stroop | `stroop` | Inhibitory control, ACC | Interference resolution — can you suppress automatic responses? |
| Simon | `simon` | Spatial inhibitory control | Spatial conflict — can you override spatial impulses? |
| Go/No-Go | `go_no_go` | Behavioural inhibition | Impulse suppression — can you stop an action before it starts? |
| Corsi block-tapping | `corsi` | Visuospatial WM | Sequence recall — can you remember spatial patterns? |
| WCST | `wcst` | Cognitive flexibility | Rule switching — can you adapt when the rules change? |
| Tower of London | `tol` | Planning, pre-frontal | Multi-step planning — can you think ahead before acting? |
| Complex span | `complex_span` | WM under interference | Dual-task — can you maintain focus under distraction? |
| Task switching | `task_switch` | Set-shifting | Asynchronous switching — can you juggle multiple goals? |

### Curriculum system

| Term | Slug | Definition |
|---|---|---|
| **Depth Level** | `depthLevel` | One of {absent, memorized, comprehended, applied, analyzed, evaluated, transformed} — 1 unengaged + 6 Bloom-aligned achieved levels. The per-concept depth spectrum. See `foundations/31-depth-assessment-model.md`; the branch-level 8-rung ladder that wraps these is defined in `foundations/42-developmental-levelling-mechanism.md`. |
| **Forgetting Curve** | `forgettingCurve` | Ebbinghaus exponential decay model applied to curriculum concept retention. Tracks retention probability per concept per player. Drives spaced-repetition scheduling. |
| **Holonic Curriculum** | `holonicCurriculum` | A 5-level holarchy of knowledge organization: Program → Course → Module → Concept → Atom. Each level is a holon (whole that is part of a larger whole). See `foundations/30-holonic-curriculum-architecture.md`. |
| **Isomorphism** | `isomorphism` | A structural similarity between concepts in different domains (e.g., feedback loops in ecology ≈ feedback loops in psychology). Cross-domain isomorphisms enable transfer learning. |
| **Knowledge Graph** | `knowledgeGraph` | The relational graph connecting curriculum concepts via prerequisite, dependency, and isomorphism edges. Drives adaptive learning pathways. |
| **Spaced Repetition** | `spacedRepetition` | The practice of reviewing concepts at increasing intervals to combat forgetting curves. Mysterium's curriculum engine schedules reviews adaptively based on retention probability. |
| **Levelling Ladder** | `levellingLadder` | The unified, demographic-blind grading/staging ladder (`syllabus.<branch>`, `line.<line>`) computed from developmental evidence only, with promotion/demotion hysteresis. See `foundations/42-developmental-levelling-mechanism.md`. |
| **Branch Rung 7 (woven)** | `woven` | The 8th syllabus rung: whole-branch mastery over aggregate depth × retention × prerequisite-closure evidence — a synthesis level beyond any single concept's depth. |

### Shadow work

| Term | Slug | Definition |
|---|---|---|
| **Dark-Addiction** | `DarkAddiction` | Submergent fixation — clinging to lower capacity. The shadow quadrant where Agency or Eros fixates on a lower stage's expression. See `foundations/10-shadow-and-pathology.md`. |
| **Dark-Allergy** | `DarkAllergy` | Submergent aversion — rejecting lower capacity. The shadow quadrant where Communion or Agape averts from a lower stage's expression. |
| **Golden-Addiction** | `GoldenAddiction` | Emergent fixation — bypassing toward higher without integration. The shadow quadrant where the player spiritualizes or intellectualizes past their actual stage. |
| **Golden-Allergy** | `GoldenAllergy` | Emergent aversion — refusing the call to grow. The shadow quadrant where the player resists developmental pressure at their growth edge. |
| **Compound Shadow** | `compoundShadow` | A shadow pattern that spans two or more lines simultaneously (e.g., Dark-Addiction on Cognitive + Golden-Allergy on Intrapersonal). Detected when same-quadrant shadows exist across lines. |
| **Shadow Ledger** | `shadowLedger` | The Significator's record of detected shadow patterns. Stores quadrant, drive, intensity, line, stage, detection timestamp, and recurrence count for each entry. |

### Polarity engine

| Term | Slug | Definition |
|---|---|---|
| **STO** | `STO` | Service-to-Others — the polarity direction where choices prioritize collective wellbeing. One of {STO, STS, Neutral}. |
| **STS** | `STS` | Service-to-Self — the polarity direction where choices prioritize individual advantage. One of {STO, STS, Neutral}. |
| **Polarity Texture** | `polarityTexture` | The specific expression of STO/STS tendency for a given (line × stage) cell. 64 unique textures in the catalogue. See `foundations/23-polarity-ontology.md`. |
| **Polarity Trace** | `polarityTrace` | The per-encounter record of polarity signals: energetic direction, drive directionality, stage orientation, source of nourishment. |
| **Crystallization** | `crystallization` | The process by which scattered polarity choices coalesce into a consistent STO or STS orientation. Occurs as the player approaches White stage. |

### Agentic orchestration & domain expansion

| Term | Slug | Definition |
|---|---|---|
| **Primary Orchestrator** | `primaryOrchestrator` | The supervisor agent that owns session strategy, delegates all player-facing surfaces to the sub-agent council, ratifies proposals, and is the single commit path for state transitions. See `foundations/43-agentic-orchestration-architecture.md`. |
| **Sub-Agent Council** | `subAgentCouncil` | The specialized agents (Teacher T1–T3, Assessor A1–A4, Journey-Guide J1–J5, Therapist, Specialist S1–S5) that hold the foreground under delegation; proposals-only, never direct commits. |
| **Delegation** | `delegation` | The orchestrator→sub-agent handoff: a DelegationSpec (role, purpose-scoped read projection, toolset, budget) answered by a DelegationResult (outcome, proposals, signals, log reference). |
| **Session Log** | `sessionLog` | The append-only, structured record of every sub-agent session (transcript, tool calls, proposals, signals). The orchestrator's sensory organ for background supervision. |
| **Identity Profile** | `identityProfile` | Optional, per-field-consented identity context (age band, sex, gender, lineage, ethnicity, culture, region, language, life situation) stored on the Significator. Never enters measurement paths. See `foundations/16-significator-architecture.md` §2.1. |
| **Healing Context** | `healingContext` | The purpose-bound projector that converts consented identity fields into derived presentation hints (voice, metaphor, locale) for healing-path agents only. See `foundations/42-developmental-levelling-mechanism.md` §1.1. |
| **Cohort Pod** | `cohortPod` | A 3–9 player developmental group with shared rituals and recognition-of-practice — deliberately NOT a social feed or leaderboard. See `foundations/38-cohort-weave-multiplayer.md`. |
| **Measurement Pack** | `measurementPack` | A swappable add-on module administering explicit competency instruments (coding, language, memory…) with psychometric reliability gates. See `foundations/40-measurement-packs-efficacy-infra.md`. |
| **Vow** | `vow` | A real-world practice objective (accept/decline, no deadlines) tracked through journal reflection check-ins. See `foundations/39-action-induction-journal-system.md`. |

### Mechanics

| Term | Slug | Definition |
|---|---|---|
| **CCI** | `CCI` | Cumulative Consciousness Index — a 5-dimension composite metric tracking integrated development across all lines and stages. See `foundations/25-cumulative-consciousness-index.md`. |
| **DDA (Dynamic Difficulty Adjustment)** | `DDA` | The transformed up-down staircase. Per-line, per-task. Converges difficulty to the player's 70.7% performance threshold. |
| **Theta Decay** | `thetaDecay` | The exponential decay of engagement with neglected stages. Drives the scheduler to surface neglected line×stage cells. 7-day half-life. |
| **Threshold (70.7%)** | `threshold_70_7` | The convergence target for the 1-up/2-down staircase; the empirical sweet-spot for engagement and plasticity. |
| **Veil of Forgetting** | `veil` | The principle that all assessment mechanics operate invisibly. The player never sees scores, drive-health values, polarity vectors, or stage altitudes. They experience reflection, not measurement. |

### Process / methodology

| Term | Slug | Definition |
|---|---|---|
| **DSR** | `DSR` | Design Science Research — the seven-phase methodology for the research phase. |
| **INFORM** | `INFORM` | Interaction-design framework with 12 micro-elements that link representation/interaction to cognitive demand. |
| **OMDE** | `OMDE` | Objects → Mechanics → Dynamics → Emotions design-from-the-foundation pattern. |

### Pathology / shadow

| Term | Slug | Definition |
|---|---|---|
| **Fixation** | `fixation` | The player's altitude on a line stalls for a sustained period. Triggers a shadow-encounter unlock. |
| **Regression** | `regression` | A line's measured altitude drops by ≥ 1 stage and stays there for ≥ N sessions. Triggers shadow-encounter and a softer DDA on that line. |
| **Repression** | `repression` | A line is consistently *underused* — the player avoids encounters that would surface it. Detected via sampling. |
| **Shadow Encounter** | `shadowEncounter` | An optional encounter that dramatises a fixation, regression, or repression for *integration*, not punishment. |

## 6. Open questions

- **Naming the lines.** Should `Interpersonal` be promoted to a quadrant rather than a line, since it lives in LL? The current decision (line) is pragmatic — it makes the radial chart symmetric (8 spokes). But it is technically a category-error in pure AQAL.
- **`Spiritual` vs `Intrapersonal` overlap.** Wilber distinguishes them; Goleman folds them; Fowler fuses them with moral. The canon decision is to keep them separate but document the overlap explicitly in `lines/05`.
- **Curriculum depth levels.** Are 6 levels sufficient, or does the system need finer granularity at the upper end (e.g., "Research" as a 7th level between Analytical and Evaluative)?
  > **Resolution note (2026-09-16):** per-concept depth remains the 7-value `DepthLevel` (absent + 6 Bloom-aligned achieved levels, 31). The upper-end synthesis demand is answered at **branch level**, not per-concept: the levelling ladder (42) adds rung 7 (`woven`) = whole-branch mastery over aggregate evidence. No per-concept level was added.

## 7. Principles served

Principles **1, 5, 7** — definition discipline, UX consistency, codebase honesty.

# lines/02 — Emotional Line

> **Cross-references:** [[docs/foundations/07-neuroscience-of-development|07 — Neuroscience Of Development]] · [[docs/foundations/03-lines-of-intelligence-overview|03 — Lines Of Intelligence Overview]]

## 1. Purpose

Specify the Emotional line — the capacity to (a) register one's own
feelings, (b) register others' feelings, (c) regulate own affect under
load, and (d) interact between own and other affect adaptively. Mysterium's
empath-read, mood-parry, and affect-channel verbs live here; emotional
shadow encounters dramatise repressed affect.

## 2. Scientific basis

### 2.1 Construct definition

Synthesis:

- **Salovey & Mayer (1990, 1997)** — four-branch model: perceiving,
  using, understanding, managing emotions.
- **Goleman (1995, 2006)** — popular four-domain model: self-awareness,
  self-management, social awareness, relationship management.
- **Mayer-Salovey-Caruso EQ test (MSCEIT)** — performance-based EI
  (the strongest psychometric tradition).
- **Gross's process-model of emotion regulation** — situation selection,
  modification, attentional deployment, cognitive change, response
  modulation.

Mysterium's working definition:

> Emotional intelligence is the joint capacity for (a) accurate
> recognition of affect (own and other), (b) regulation of affect
> under stress, and (c) skilful use of affect to guide thought and
> action.

### 2.2 Validated assessments

| Domain | Assessment | What it measures |
|---|---|---|
| Affect recognition | Reading the Mind in the Eyes (Baron-Cohen); RMET | mPFC, TPJ |
| Emotion regulation | DERS (Difficulties in Emotion Regulation Scale) | Self-report |
| Performance EI | MSCEIT | Performance-based, four branches |
| Empathy | IRI (Interpersonal Reactivity Index) | Cognitive vs. affective empathy |
| Affect labelling | Emotion-word matching tasks | vmPFC, amygdala |

### 2.3 Brain regions

Amygdala, ventromedial PFC, anterior insula, right hemisphere, default-mode
network. See `foundations/07`.

## 3. Stage trajectory

| Stage | Capacity | In-game expression |
|---|---|---|
| Infrared | Raw affect — fear, rage, primary pleasure | Visible-only emotion HUD; cannot act on affect |
| Magenta | Magical attribution — "the forest is angry"; emotional fusion | Mood-of-the-zone; player feels but does not act |
| Red | Self-other-emotion split; egocentric anger / pride | Rage-buff combat; first emotional self-management beats |
| Amber | Conformist emotion — group-shame, group-pride | Empath read of in-group NPCs; out-group emotions opaque |
| Orange | Reflective self-awareness; emotion as data | Empath read of any NPC; emotion-regulation skills unlock |
| Green | Pluralistic empathy — multi-perspective affect | Holding contradictory emotions; co-regulating with allies |
| Teal | Vision-logic affect — sees emotional patterns across systems | "Reading the room" — group-level emotional waves |
| Turquoise | Equanimity — affect is luminous, not gripping | Emotion as energy; non-defensive presence |

## 4. Game-design mapping

### 4.1 Assessment modality affinity

**Reader, regulator, channeler.** An emotional-leaning build favours
reading enemy emotional state to predict attacks, regulating own affect
to avoid combat penalties under emotional load, and *channelling*
emotion into power (rage as buff; sorrow as healing focus).

### 4.2 Assessment tasks / defences / skills

| Verb | Task vehicle | Mechanic | Stage gating |
|---|---|---|---|
| Empath Read | Affect-recognition (eyes/face) | Identify enemy intent before strike-frame | Red+ for in-group; Orange+ for any |
| Mood Parry | Emotional Stroop (face × word interference) | Override word, parry on facial affect | Amber+ |
| Affect Channel | Hold target emotion under load | Sustained labelling task; converts affect to mana | Orange+ |
| Co-Regulate | Reduce ally's affect-spike | Multiplayer: tap-rhythm with partner under their stress wave | Green+ |
| Equanimity Stance | Reduced damage from emotional attacks | Sustained calm-affect under provocation | Green+ |
| Compassion Burst | AoE that targets only fixated enemies | Demands accurate moral-affect read of every enemy in scene | Teal+ |

### 4.3 Module parameters(s) backed

- **Empathy / Read** — recognition accuracy
- **Resolve** — emotion regulation under stress (resists fear / charm / rage statuses)
- **Aura** — group-affect reading; multiplayer

### 4.4 Cognitive task vehicles

- Emotional Stroop (face-word interference)
- Affect-recognition under time pressure
- Emotional regulation tasks (cognitive reappraisal latency)
- Affect-labelling under cognitive load

### 4.5 Depth progression

The emotional line moves more slowly than cognitive — the tasks are
*harder* to ground-truth (the "right answer" is not always the same
across cultures) and require more contextual scaffolding. Expected
pace: roughly 60% of cognitive line's velocity in MVP.

The emotional line is **the one most likely to plateau** at Amber or
Orange for Western players. The mid-to-late game's emotional content
is therefore proportionally weighted to give the line room to grow.

## 5. Enemy / encounter structure

### 5.1 Module-level encounters archetypes

| Stage | Side-character | Task encoded |
|---|---|---|
| Infrared | "Maw of Hunger" — fear-driven, no affect signal | Pure motor combat, no affect read |
| Magenta | "Mood-Wraith" — projects diffuse emotion; player must *feel* the zone | Affect-zone identification |
| Red | "Wroth-Champion" — visible rage telegraphs; mis-read costs HP | Affect recognition (anger) |
| Amber | "Lamenter" — broadcasts in-group grief that buffs allies and de-buffs out-group | Group-affect read |
| Orange | "Mask-Smith" — wears different emotional masks; surface vs. true affect | Emotional Stroop |
| Green | "Choir of Ten" — ten distinct affect signatures, each requiring own response | Multi-target affect read |
| Teal | "Hollow Mirror" — reflects player's own affect; misreads cause self-damage | Self-affect awareness |
| Turquoise | "Silent Witness" — non-reactive; player must self-regulate to engage | Pure equanimity |

### 5.2 Cross-line encounterses (emotional × other lines)

- **Emotional × Cognitive:** "The Sorrowful Geometer" — Stroop with
  emotional faces.
- **Emotional × Moral:** "The Pleader" — gives a moral dilemma while
  showing genuine grief; reading the affect changes the dilemma's
  tenor.
- **Emotional × Interpersonal:** "The Crowd" — ten NPCs with emotional
  states that resonate; player must calm one to not destabilise the
  others.

### 5.3 Main-boss role

In stage main-bosses, the emotional phase is typically the **second
phase** (after the cognitive phase, before the moral / interpersonal),
where the player must read the boss's true affect under deception /
masking.

### 5.4 Shadow encounters

**"The Glacier"** — at Orange stage. The shadow of cognitive
over-development with emotional repression. The player meets a
mirror-self frozen in PFC dominance. The fight is unwinnable by
spells; the only damage path is to *accurately label own emotion*
during the fight (a pop-up requires the player to choose from a list of
six affect labels). Three correct labels in a row break the glacier.

**Counter-shadow:** "The Storm" — at Green stage. The over-developed
emotional, the under-developed cognitive. The player drowns in
affect-flood unless they engage cognitive regulation (cognitive
reappraisal mini-task).

## 6. Architectural contract

```
const EMOTIONAL_VERBS = {
  empathRead:       { task: 'affect_recognition', altitudeMin: 'Red' },
  moodParry:        { task: 'emotional_stroop',   altitudeMin: 'Amber' },
  affectChannel:    { task: 'affect_label_load',  altitudeMin: 'Orange' },
  coRegulate:       { task: 'pair_rhythm',        altitudeMin: 'Green' },
  equanimityStance: { task: 'sustained_calm',     altitudeMin: 'Green' },
  compassionBurst:  { task: 'multi_affect_read',  altitudeMin: 'Turquoise' },
} as const;
```

Affect-recognition tasks ship with culturally-balanced face stimuli
(`docs/foundations/12-drive-assessment-mechanics.md` will specify the corpus).

## 7. Open questions

- **Cultural validity of affect-recognition.** Most face stimuli are
  Western; cross-cultural recognition rates differ. Mysterium must use a
  multi-cultural stimulus set (e.g., NimStim + JACFEE + RaFD).
- **Affect-labelling vocabulary.** Six basic emotions (Ekman) are
  contested; alternative is constructed-emotion (Barrett). Mysterium can
  carry both labelling models; default to Ekman in MVP for tractability.
- **Triggering content.** Trauma-adjacent affect (deep grief, shame) is
  legitimate gameplay material but must be handled with content
  warnings and skip options. `docs/system/sub-systems/safety/ethics-and-data-privacy.md`.

## 8. Principles served

Principles **1, 2, 5** — emotional development as a first-class line,
honestly assessed, with UX care for the felt sense.

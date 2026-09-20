# narrative/00 — Narrative Architecture

> **Cross-references:** [[docs/foundations/05-drives-and-polarities|05 — Drives And Polarities]]

## 1. Purpose

Specify the *story-level* design of Mysterium — how narrative serves the
developmental arc rather than merely decorating it. Detailed
character arcs, dialogue trees, and quest scripts are deferred to
implementation; this document is the *architecture*.

The slogan:

> The protagonist is the player's developmental arc made flesh. The
> narrative is the *scaffolding* of stage progression. Every story
> beat exists to dramatise a developmental movement; if it does not,
> it is cut.

## 2. The three macro-acts (per `stages/00 §4`)

Mysterium's narrative arc is shaped by the three nested arcs of the
eight-stage progression:

### 2.1 Act I — The Embodied World (Pre-personal)

**Stages: Infrared, Magenta**
**Theme: I am alive. I imagine.**

The protagonist begins in the body — surviving, sensing, dreaming.
They learn that the world responds to *attention*, then to *symbol*.
A beloved figure (animal companion, dream-mentor) accompanies them;
that figure becomes a touchstone for the rest of the journey.

Act I closes with the protagonist *named* — speaking their first
words, choosing their first symbol, taking their first stand against
a great natural force.

### 2.2 Act II — The World of Selves (Personal)

**Stages: Red, Amber, Orange, Green**
**Theme: Who am I, with whom, why?**

The bulk of the game. The protagonist becomes a *self* — first as a
warrior (Red), then as a member of a tradition (Amber), then as a
rational individual (Orange), then as a sensitive plural participant
(Green). Each transition is *costly* — what the protagonist values
in one stage, they must surrender or transcend in the next; what they
gain, they must integrate honestly.

Act II's central tension: *the seductiveness of each stage*. Red is
glorious; Amber is meaningful; Orange is empowering; Green is
beautiful. The protagonist (and the player) are tempted to *stay*.
Major NPC antagonists embody this temptation — they are the
*fixations* of each stage.

Act II closes with the protagonist *standing inside Green* — sensitive,
plural, capable, and *just beginning to feel the ceiling* of
first-tier consciousness.

### 2.3 Act III — The World of Wholes (Trans-personal)

**Stages: Teal, Turquoise**
**Theme: Who am I, when "I" is one of many holons in a larger field?**

The integral and non-dual stages. The protagonist's *self* is
transcended-and-included into larger holons. The world's stakes
shift from personal to collective to kosmocentric. The narrative
becomes *spacious*; events are quieter but deeper.

Act III closes with the protagonist *authoring* — writing their own
final reflection, naming what their life has been about, handing the
torch to other characters (NPCs and / or other players in
multiplayer). The game ends with the player's own words.

## 3. The protagonist

The protagonist is **the player's avatar** — and the arc *is* the
player's developmental journey through the eight stages.

The protagonist is *not* a fully pre-written character. They are a
**vessel** with:

- A starting drive profile (player-customised at character creation).
- A starting line profile (Infrared baseline, gradual differentiation).
- A name and appearance (player-chosen).
- A small set of *life-events* that occur regardless of choice (stage
  rites, key NPC meetings).
- A vast set of *response capacities* — every stage's content is
  authored such that the protagonist can be *many kinds of person*
  at that stage and the writing accommodates.

The protagonist's *voice* is largely the player's voice — chosen
dialogue, chosen actions, authored codex entries. The narrator's voice
is separate, sometimes commentating, sometimes silent.

## 4. NPC architecture

Three categories of NPC, each with a distinct role:

### 4.1 Allies — companions across stages

Each act has 1–2 primary allies who *travel with* the protagonist
across multiple stages. The ally's *own* developmental arc is
visible — they start at one altitude, struggle, sometimes regress,
sometimes leap. The protagonist witnesses the ally's growth as a
mirror to their own.

Allies are how interpersonal-line encounters happen in single-player
mode; the depth of the ally relationship caps interpersonal altitude
at Orange in single-player.

### 4.2 Antagonists — the stage exemplars

Each stage has a major antagonist who *fixates* the stage's
characteristic drive (`foundations/05`). The Conqueror (Red ×
Agency-fixation), the Inquisitor (Amber × Communion-fixation), the
Architect (Orange × Eros-fixation), the Equivocator (Green ×
Agape-fixation), the Adept Above (Teal × subtle-pride). They
are *not* villains; they are *charismatic embodiments* of what each
stage offers and what its shadow costs.

Antagonists are the main bosses of their stages and are written
to be *almost* persuasive. Defeating them is rarely a kill; it is a
*completion* — the protagonist demonstrates the absent drive, and
the antagonist either dissolves their fixation, accepts honourable
defeat, or (rarely) transforms.

### 4.3 Mentors — guides at thresholds

At each stage threshold, a mentor figure appears briefly — usually
a higher-altitude character glimpsed once or twice, never a
permanent companion. Mentors model what is *possible*; they do not
solve the protagonist's problems.

The most important mentor is **the protagonist's future self**, who
appears at the Teal threshold as a being of vision-logic and
quiet humour, and at the Turquoise threshold as silence.

## 5. The recurring characters across acts

A small set of NPCs appear *across* multiple acts, transforming with
the world:

- The **animal companion / maternal figure** from Infrared returns at
  Magenta (revealed to speak in dream-imagery), at Red (as a
  battle-bond ally), at Amber (as an elder), and at Orange / Green
  (as a contemplative partner). At Turquoise, they appear in the
  Communion ring.
- **The Conqueror's son/daughter** — saved or spared at Red — returns
  at Amber as a knight of an opposing tradition, at Orange as a
  diplomat, and the player's Red choices echo into how this
  relationship plays out.
- **The Inquisitor's protégé** — converted or refused at Amber —
  returns at Orange as a reformer, at Green as a pluralist
  theologian.
- And so on.

These returning characters are how Mysterium *enforces* the
transcend-and-include principle in narrative form. Choices in earlier
stages have *legible consequences* in later stages.

## 6. The seven narrative principles

### 6.1 Story serves development

Every narrative beat dramatises a developmental movement. If a beat
does not, it is cut.

### 6.2 No infodumps about the model

The eight-stage model is **never** explained didactically in-game. The
player *experiences* it. The codex (player-authored) is where
intellectual reflection lives, optionally — never required.

### 6.3 Choices have multi-stage consequences

NPCs have memory; choices propagate; the world changes shape based
on what the protagonist has done across stages.

### 6.4 The narrator is sparing

Most of the time, the world *is* the narrator. NPC voices, environmental
storytelling, found objects, soundscape. A discrete narrator-voice
(text or voice-over) appears only at major thresholds and in the
codex.

### 6.5 Tone matches stage

Each stage's tone is specified in its world bible (`stages/01–08`).
A narrative beat written for Orange will not work in Red; a beat
written for Green will feel saccharine in Amber. Tone-mismatched
content is cut.

### 6.6 The player authors the close

The endings are *not* fully scripted. The player writes their own
final reflection at Turquoise; the game presents the rough shape but the
words are the player's. This is the strongest expression of "earned
progression."

### 6.7 No villains, only fixations

Every "antagonist" in Mysterium is a fixation — a person who has
over-developed one drive at the expense of its complement. They are
defeated by completion, not destruction. This philosophy is
non-negotiable; it is what makes Mysterium's story morally consistent
with its developmental claims.

## 7. The narrative-mechanic compact

A narrative beat *is* a mechanical beat, and vice versa. Concretely:

- A dialogue choice is a moral-line micro-task.
- A vow given to an ally is a willpower-line lock and an
  interpersonal-line pledge.
- A stage rite is a value-commitment that the next stage's mechanics
  read.
- A returning NPC reads the player's prior-stage choices from the
  save record.
- The codex's player-authored entries appear as in-world *journals*
  found by other players in multiplayer.

Story is mechanics; mechanics are story. Mysterium cannot have a
"narrative-only" beat that has no mechanical residue, nor a
"mechanical-only" beat with no narrative weight. Each beat is both.

## 8. The downstream documents (deferred)

| Deferred doc | One-line intent |
|---|---|
| `narrative/01-protagonist-arc.md` *(planned)* | The protagonist's arc across the eight stages, with key beats. |
| `narrative/02-antagonist-archetypes.md` *(planned)* | Per-stage major antagonists with drive fixation, voice, mechanics. |
| `narrative/03-world-aesthetic-per-stage.md` *(planned)* | Visual / sonic / tonal world-bibles. (Largely captured in `docs/stages/01-infrared-archaic.md` §5 and its siblings.) |
| `narrative/04-environmental-storytelling.md` *(planned)* | How the level itself communicates the stage without dialogue. |

*(planned)* = declared but not yet written; the overview above is the current owner of these
laterals until each file exists.

The *concept* layer for each is in this document and in the per-stage
world bibles. Implementation can proceed.

## 9. Open questions

- **Branching depth.** How many real branches does the story support?
  Default: each major stage has a *small* set of canonical paths
  (defeat / spare / partner / transform the boss) and a *large* set of
  micro-variations in dialogue and side-content. Branching is wide
  but shallow; replayability comes from drive variance and from
  shadow content, not from radically different main paths.
- **Cultural specificity.** The world is multi-stage; it is *not*
  multicultural in the modern sense. Each stage's aesthetic draws
  from real-world traditions (sometimes multiple). Authentic
  representation requires cultural consultants.
- **Authoring ambition.** A truly memorable narrative arc across eight
  stages is enormous writing work. MVP scope (one or two stages) is
  the realistic starting point.

## 10. Principles served

Principles **1, 4, 5, 6** — narrative as the *felt* dimension of
developmental progression, earned through choices, rendered with
honesty about what each stage values and costs.

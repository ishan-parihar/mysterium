# enemies/00 — Enemy Taxonomy

## 1. Purpose

Specify the *kinds of enemy* Mysterium ships, the *role* each kind plays
in the developmental architecture, and the *design contract* every
enemy must satisfy. Detailed bestiary stat blocks are deferred to
implementation; this document is the *taxonomy*.

The slogan:

> Every enemy is a *probe*. Every enemy answers — and asks — a
> developmental question. An enemy without a developmental question
> is set dressing, not a combatant.

## 2. The four-axis taxonomy

Every enemy is fully described by four axes:

| Axis | Values | What it determines |
|---|---|---|
| **Line(s) probed** | One or more of the 8 lines | Which line altitude the encounter measures and trains |
| **Stage of expression** | One of the 8 stages | The altitude at which the line is expressed |
| **AQAL quadrant(s)** | Subset of {UL, UR, LL, LR} | What kind of capacity the encounter draws on |
| **Role** | side / mini / main / shadow | The *narrative* and *progression* function of the encounter |

A complete enemy spec is a tuple
`(lines, stage, quadrants, role, taskBinds, theme, drive)`.

### 2.1 Role definitions

#### Side-character (cognitive drill)

A standard enemy. Probes **one** line at a single stage's altitude,
through **one** primary cognitive task. Side-characters are the
**most common** encounters and the **bedrock** of altitude growth on
each line.

Per stage, the bestiary has *at least* one side-character per line —
8 archetypes per stage, 64 across the canonical arc. With sub-octave
flavour variants, ~3 per line per stage = ~24 per stage = ~190 across
the arc.

#### Mini-boss (dual-task interference)

A mid-level encounter. Probes **two** lines simultaneously, surfacing
the interference between them. The mini-boss is the **integration
test** — the player who can clear each line in isolation may struggle
when both must be held at once.

Per stage: 3–5 mini-bosses, covering the most pedagogically useful
line-pairs at that altitude.

#### Main boss (synthesis exam)

The capstone of a stage. Probes **all 8 lines**, touches **all 4
quadrants**, in a phased structure. The main boss is the
*demonstration that the player has actually integrated the stage*.
Failure does not lose progression; it reveals which lines are still
weak so the player knows what to develop next.

Per stage: exactly **one** canonical main boss. Sub-octave variant
versions (different drive fixations, different aesthetic skins) may
exist for replayability.

#### Shadow encounter (fixation / regression / repression)

An *optional* encounter that dramatises a developmental pathology
detected from the player's telemetry — fixation (stuck altitude),
regression (altitude fell back), or repression (line under-used).
The shadow is an **invitation**, never imposed.

Per stage: 1–2 typical shadow archetypes per stage; per player,
unlocked dynamically based on `foundations/10-shadow-and-pathology.md`.

## 3. The "what an enemy is for" matrix

Every enemy can be located in this matrix:

|              | One line | Two lines | All lines |
|---           |---       |---        |---        |
| **One stage**| Side     | Mini      | Main      |
| **Stage shadow**| Shadow (line-fixated) | Shadow (line-pair-fixated) | Shadow (whole-stage regression) |

Encounters in the upper-left half (one or two lines × one stage) are
the bulk of content. The lower row (shadow material) is the integration
layer.

## 4. The drive layer

Every enemy carries a **drive signature** (`foundations/05`) — Agency,
Communion, Eros, Agape — and (for antagonists) a **fixation** plus an
**absent complement**. The drive layer is what makes enemies
*characters* rather than mechanisms.

Major antagonists (mini-bosses, main bosses, named shadows) are
*defeated* by demonstrating the *absent* drive during the encounter,
not by raw damage. A Red × Agency-fixation Conqueror is defeated by
the player demonstrating Communion in some load-bearing way during
the fight (saving an ally, choosing mercy, accepting help).

This is what makes Mysterium's combat *narratively resonant* — the enemy
is *cured*, mechanically speaking, not just defeated.

## 5. The sub-octave layer

Each stage's bestiary includes **sub-octave-flavoured variants** of
its enemies — Red-of-Red (the most-typical Red enemy), Red-of-Amber
(group-bound power), Red-of-Orange (rationally calculating power),
etc. Sub-octave variants give a stage *texture* and explain why a
high-altitude player still meets challenges that *taste* like older
stages.

Sub-octave variants are not *new* enemies; they are *re-expressions*
of the same archetypes through a different sub-octave lens. The
generator pattern (deferred to implementation) takes
`(archetype, currentStage, subOctaveStage)` and produces a tuned
variant.

## 6. The encounter density target

For an MVP that ships a single stage:

- ≥ 8 side-character archetypes (one per line at the stage's altitude)
- ≥ 16 sub-octave-flavoured side-character variants (≈2 per archetype)
- ≥ 3 mini-boss archetypes (line-pair coverage)
- 1 canonical main boss (with variants for replay)
- 1–2 shadow encounters

≈ 30 enemy concepts for one stage. Across the full eight-stage arc:
**~240 enemy concepts**. Detailed stat blocks come later; the
*concepts* are foundational and live in each `stages/0X-*.md`'s
bestiary section.

## 7. The enemy-design contract

Every enemy that ships **must** answer these eight questions in its
data row:

1. Which line(s) does this enemy probe? (1 to 8)
2. At which stage's altitude is the line expressed?
3. Which AQAL quadrant(s) does the encounter draw on?
4. Which role does the enemy play (side / mini / main / shadow)?
5. Which cognitive task(s) does the encounter bind?
6. What is the enemy's drive fixation (if antagonist), and what is the
   absent complement?
7. What is the in-world theme / fiction (one-line elevator)?
8. What is the *medicine* — i.e., what does the player *learn* by
   facing this enemy?

An enemy data row missing any of these eight is incomplete and is
flagged for review.

## 8. The downstream documents (deferred)

The following enemy documents were planned in `REQUIREMENTS.md` but
are deferred to the implementation phase. The *intent* for each:

| Deferred doc | One-line intent |
|---|---|
| `enemies/01-side-characters-cognitive-drills.md` | Stat blocks, AI behaviour trees, attack patterns for side-characters. |
| `enemies/02-mini-bosses-dual-task.md` | Stat blocks for mini-bosses; line-pair coverage matrix. |
| `enemies/03-main-bosses-synthesis.md` | Per-stage main-boss phase scripts and AI. |
| `enemies/04-stage-bestiaries.md` | Stage-by-stage roster manifests. (Largely captured in concept form in `stages/01–08`.) |
| `enemies/05-shadow-encounters.md` | Detection thresholds and per-shadow encounter scripts. |

The *concept* layer for each is already in the per-stage world
bibles; what is deferred is the engineering / stat-block level.

## 9. Open questions

- **Repeatable enemies.** A player will fight many of the same
  archetype across a stage. How do we keep these encounters
  *informative* without making them grind? Answer: sub-octave
  variants give *texture* without breaking the line→altitude
  contract.
- **Cross-stage enemies.** A Red enemy appearing in an Orange world
  (as part of a memory-dungeon shadow encounter) — is this allowed?
  Yes, and important; it is how we keep older stages alive in the
  player's experience.
- **Cosmetic flavour vs. mechanical truth.** A "fire mage" can be a
  cognitive-line side-character with elemental dressing, or it can be
  a spiritual-line side-character (sacred fire) — the dressing must
  not lie about the mechanical content. Encounter data row decides.

## 10. Principles served

Principles **1, 2, 4** — every enemy is a clearly-located probe,
every encounter has validated cognitive content, every fight earns
its place in the developmental arc.

# foundations/05 — Drives and Polarities

## 1. Purpose

Specify the four drives — Agency, Communion, Eros, Agape — that
constitute Mysterium's *motivational engine*. Stages and lines tell us *what*
develops; drives tell us *what makes a character (player or NPC) move*.
Conflict — and therefore narrative, and therefore replay — emerges from
the polarities between drives.

Without drives, the game has the structure of a curriculum and the
emotional tone of a textbook. With drives, every fight has a *because*.

## 2. Scientific basis

### 2.1 The four drives

Drawn from Wilber's Integral metatheory of agency/communion and
ascending/descending currents (Wilber 1995, *Sex, Ecology, Spirituality*),
synthesised with Bakan's classic agency-communion (Bakan 1966) and the
contemplative literature on Eros/Agape (Aurobindo, Teilhard de Chardin).

| Drive | Direction | Healthy expression | Pathology |
|---|---|---|---|
| **Agency** | Self-preservation; sovereignty; autonomy | Boundaries, sovereignty, solitude | Domination, alienation, hyper-individualism |
| **Communion** | Joining; connection; belonging | Community, partnership, mutual support | Codependency, herd-mind, loss of self |
| **Eros** | Ascending; growth; transcendence | Aspiration, creativity, evolution | Escapism, narcissistic spirituality, fear of embodiment |
| **Agape** | Descending; embracing; immanence | Embodied compassion, holding, incarnation | Regression, smothering, self-sacrifice |

### 2.2 The polarity pairs

The four drives form two complementary pairs:

- **Agency ↔ Communion** — the horizontal axis. The lonely sovereign vs.
  the merged collective. Health is a *dance*, not a balance — context-sensitive.
- **Eros ↔ Agape** — the vertical axis. The ascending impulse vs. the
  descending impulse. Health is a *cycle*: ascend, return, embrace,
  ascend.

Pathology arises from over-identifying with one pole and excluding its
complement. Wilber: "The disease is dissociation; the cure is integration."

### 2.3 Drives × stages — pathology profiles per stage

| Stage | Healthy drive expression | Common pathology |
|---|---|---|
| Infrared | Survival agency; biological communion (mother-infant) | Survival terror; failure of bonding |
| Magenta | Magical agency; family communion | Engulfment / fusion; magical thinking as control |
| Red | Power agency; tribal communion | Domination; ego-power without embrace |
| Amber | Conformist communion; rule-bounded agency | Rigid agency-suppression; us-vs-them |
| Orange | Achievement agency; contractual communion | Workaholism; treating others as means |
| Green | Pluralistic communion; sensitive agency | Mean-green-meme (suppressing agency under egalitarian pressure) |
| Teal | Integral dance of all four | Integral elitism; subtle agency-pride |
| Turquoise | Non-dual unity of all four | (No common pathology at this stage; rare population) |

### 2.4 Lines × drives

Drives *colour* lines. A Cognitive line under heavy Agency motivation
looks like the lone scientist; under Communion, like the collaborator;
under Eros, like the visionary; under Agape, like the popular educator.
Every line has four "flavours" — same altitude, different drive
profile. Mysterium uses this for character variety without inflating the
matrix.

## 3. Game-design mapping

### 3.1 Drive as character-creation slider

At character creation, the player distributes points across the four
drives. The default is balanced; players can lean. Drive *settings*
shape:

- Starting cosmetics / visual aura
- Initial NPC dialogue tone
- The flavour of the player's first stage's encounters
- Which side-quests are available

Drive settings are **not** caps. Any encounter can still be cleared by
any drive profile. Drives shape the *path*, not the *ceiling*.

### 3.2 Drive as combat modifier

Each drive provides a small in-combat modifier:

| Drive | In-combat | Cost |
|---|---|---|
| Agency | +damage to single targets; -damage to multi-target | Less synergy with allies |
| Communion | +healing / buffs to allies; -solo damage | Vulnerable when alone |
| Eros | +damage to enemies of higher stage than self | -resistance to lower-stage feints |
| Agape | +mitigation when defending allies; +shadow integration | -outright damage |

These modifiers are *small* (±10%) — they should not dominate
performance. They exist to make drive-flavour *legible*, not to gate
content.

### 3.3 Drive as antagonist material

Major antagonists are *fixations* of a drive at a stage. Examples:

- **Red × Agency-fixation** — the Warlord. All sovereignty, no embrace.
- **Amber × Communion-fixation** — the Cult. All belonging, no sovereignty.
- **Orange × Eros-fixation** — the Cold Visionary. All ascent, no incarnation.
- **Green × Agape-fixation** — the Smother. All inclusion, no individual.

The bestiary in `enemies/04-stage-bestiaries.md` enumerates these.

### 3.4 Drive as redemption arc

A boss fight in Mysterium is not "kill the baddie." It is "demonstrate the
*absent* drive in the boss." A Warlord (Red × Agency-fixation) is
defeated when the player demonstrates Communion at sufficient intensity
during the fight (a co-op gesture, a saved ally, a chosen mercy). The
mechanical defeat-condition is the drive-completion.

This is what makes the combat narratively resonant: the boss is *cured*,
not *killed*. (Or, mechanically: their drive-fixation is dissolved.)

### 3.5 Drives × shadow

Shadow encounters in `enemies/05-shadow-encounters.md` dramatise the
player's *own* drive imbalances. If the player has been over-relying on
Agency, their shadow takes Communion form, and the player must defeat
it by exercising Communion. Drives drive shadow.

## 4. Architectural contract

```
type Drive = 'Agency' | 'Communion' | 'Eros' | 'Agape';

interface DriveProfile {
  weights: Record<Drive, number>;            // sums to 1.0
  fixationRisk: Record<Drive, number>;       // 0..1; tracked over time, raises shadow encounters
}

interface AntagonistDriveSpec {
  fixated: Drive;                            // the over-developed drive
  absent:  Drive;                            // the complement the boss lacks
  fixationStage: Stage;                      // which stage the fixation lives at
}
```

Combat damage formula incorporates a drive-modifier multiplier. Boss
fights additionally check whether the player has demonstrated `absent`
during the encounter (signalled by specific verbs / choices) — required
for the boss-completion bonus.

## 5. Open questions

- **Visibility of drives.** Should the player *see* their drive profile,
  or should it be implicit? Default: implicit at first, surfaced after
  first stage advancement. Showing too early reduces emergent
  storytelling.
- **Drive in multiplayer.** A party of four with all-Agency settings
  will struggle — by design. Should match-making rebalance, or should
  the social challenge be part of the gameplay? Default: party
  composition is part of the gameplay; rebalancing is opt-in.
- **Drive versus type.** Drive is *not* type — drives can develop,
  fixate, and integrate. We must not let drives ossify into fixed labels.

## 6. Principles served

Principles **1, 3** — gives the game its motivational *because* and
keeps the staircase from feeling clinical.

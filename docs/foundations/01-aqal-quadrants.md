# foundations/01 — AQAL Quadrants

## 1. Purpose

Specify the four AQAL quadrants — UL, UR, LL, LR — in Mysterium-canonical
form, and prove that the game *must* touch all four to be honest about
what it claims to train. A cognitive-training app that lives only in UR
(behaviour, brain) is not training a whole person; a contemplative app
that lives only in UL (interior) cannot demonstrate transfer; a social
game that lives only in LL/LR is engagement without growth.

Mysterium's design constraint: **every stage advancement gate touches all
four quadrants.**

## 2. Scientific basis

The four quadrants are derived from two orthogonal distinctions Wilber
identifies as irreducible:

1. **Singular vs. plural** — does the perspective belong to an individual
   or a collective?
2. **Interior vs. exterior** — is the perspective experienced from inside
   (subjective) or observed from outside (objective)?

| | Interior (subjective) | Exterior (objective) |
|---|---|---|
| **Individual (singular)** | UL — "I" | UR — "It" |
| **Collective (plural)** | LL — "We" | LR — "Its" (system) |

Each quadrant has a distinct *truth criterion*:

| Quadrant | Truth criterion | Method |
|---|---|---|
| UL | Truthfulness, sincerity | Introspection, phenomenological report |
| UR | Truth, correspondence | Empirical observation, measurement |
| LL | Justness, mutual understanding | Hermeneutics, dialogue, cultural fit |
| LR | Functional fit, systems coherence | Systems analysis, network theory |

A claim cannot be reduced to one quadrant. "I love my family" is
simultaneously a UL felt sense, a UR neuro-endocrine pattern, a LL
cultural meaning of "family," and an LR economic / legal arrangement.
Reducing it to any one is the integral fallacy.

### Per-quadrant lines (Mysterium's mapping)

Following the Knowledge-Base mapping:

| Quadrant | Lines housed there | Notes |
|---|---|---|
| **UL** Individual Interior | Emotional, Moral (early), Intrapersonal, Spiritual, Willpower (early), Aesthetic | The interior-felt-sense lines |
| **UR** Individual Exterior | Cognitive (most), Somatic, Behavioural, Skill-development, Personal-financial | Observable / measurable individual capacities |
| **LL** Collective Interior | Interpersonal, Empathy, Communication, Group-emotional-IQ, Shared-ethics | Shared felt-sense, culture |
| **LR** Collective Exterior | Organisational, Resource-management, Systems-IQ, Political/Economic/Legal/Tech systems | Observable collective structures |

A single line often *primarily* lives in one quadrant but *expresses* in
adjacent ones — e.g., Moral starts UL (private conscience) and matures
into LL (lived ethics). Mysterium's `lines/*` documents specify the home
quadrant and the expression-quadrants for each line.

## 3. Game-design mapping

### 3.1 Quadrant tinting

The radial skill-tree chart uses quadrant tinting:

- UL — warm interior tones (deep amber, plum)
- UR — cool clinical tones (steel, electric blue)
- LL — earth/ochre (terracotta, moss)
- LR — neutral structural (graphite, pale gold)

A spoke is *primarily* one tint but bleeds into adjacent quadrants where
the line expresses there.

### 3.2 Encounter-quadrant balance

A stage advancement gate (`docs/foundations/42-developmental-levelling-mechanism.md`) requires the player to have
demonstrated capacity at the relevant altitude in **all four quadrants**:

| Demonstration | Mechanic |
|---|---|
| **UL** | Self-report check at end of session — does the player's reported felt-sense match the inferred altitude? Used as a *consistency check*, not a gate threshold (UL self-report is unreliable in isolation). |
| **UR** | Cognitive / somatic micro-task scores at the altitude band. The hard data. |
| **LL** | Multiplayer or NPC-dialogue encounters that test attunement, communication, conflict resolution. |
| **LR** | Resource / system management mini-games — managing party stamina, planning a multi-encounter campaign, optimising a stance loadout under constraints. |

Without LR or LL coverage, the synthesis exam (main boss) does not
unlock. This is what stops the game from collapsing into yet another
single-quadrant cognitive-training tool.

### 3.3 The four-quadrant boss design

A main boss exam tests:

1. **UR** — every cognitive task at the stage's altitude (the obvious half).
2. **UL** — a moment of choice that requires accurate emotional self-read
   (e.g., the boss reveals a shadow-mirror; player must name what they
   feel, from a list, within a time limit).
3. **LL** — a parley phase (single-player: NPC ally; multiplayer: human
   ally) where coordination / attunement / shared-understanding is
   measured.
4. **LR** — a phase where the arena itself is the puzzle (terrain, hazard
   scheduling, resource flows), testing systemic awareness.

A boss that lacks any of the four phases is *not* an integral synthesis
exam — it is a single-quadrant cognitive set-piece. The bestiary review
process flags such bosses for redesign.

## 4. Architectural contract

```
interface Encounter {
  id: string;
  quadrantsTested: ReadonlyArray<Quadrant>;   // must cover all four for synthesis-exam encounters
  linesTested:     ReadonlyArray<Line>;
  stage:           Stage;
  role:            'side' | 'mini' | 'main' | 'shadow';
}
```

Engine-level invariant (asserted in unit tests): for any encounter where
`role === 'main'`, `quadrantsTested.length === 4` and the set is
`{ 'UL', 'UR', 'LL', 'LR' }`.

The cognitive-overlay UI (`docs/system/sub-systems/presentation/rendering-layer.md`) chooses overlay placement based on
quadrant: UL overlays bottom-left (introspective), UR overlays right
(action-side, dominant hand), LL overlays bottom-centre (the shared
ground), LR overlays top (the bird's-eye/system view).

## 5. Open questions

- **Single-player LL.** How honestly can LL be exercised in single-player?
  NPC dialogue is a poor proxy for genuine attunement. The MVP plan
  treats single-player LL as *practice*, multiplayer LL as *test*. Stage
  advancement in single-player therefore weights LL lighter, with a
  multiplayer-only "true" Stage-Up rite. Tentative.
- **Shadow encounters and quadrants.** A shadow encounter dramatising a
  fixation on power (Red, UL→UR) and a shadow encounter dramatising LL
  groupthink are very different beasts. We have not yet specified whether
  shadows are quadrant-typed.

## 6. Principles served

Principles **1, 2, 4, 5** — quadrant coverage *is* the integrity
guarantee.

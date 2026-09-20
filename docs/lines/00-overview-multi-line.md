# lines/00 — Multi-Line Dynamics (Overview)

> **Cross-references:** [[docs/foundations/24-encounter-scheduler|24 — Encounter Scheduler]]

## 1. Purpose

Specify how the eight lines *interact* in Mysterium. The per-line documents
(`lines/01-…08-…`) define each line in isolation; this document
specifies their composition: line caps, cross-line tasks, line balance,
the radial chart, and the algorithms that prevent the whole system from
becoming "do whatever is fastest, ignore the rest."

This is the integrity contract for the `lines/*` layer.

## 2. Scientific basis

### 2.1 Lines develop semi-independently

The empirical finding that motivates the whole multi-line architecture
(see `foundations/03`):

> A 50-year-old PhD physicist may sit at Orange/Green on cognitive but
> Amber on emotional. A 22-year-old social worker may sit at
> Green/Teal on moral but Red on financial.

Lines are *relatively* independent — not absolutely. Some lines have
*partial* dependencies:

### 2.2 The dependency graph

Hard ceilings (a line cannot exceed) and soft floors (a line tends to
follow):

| Line | Cannot exceed | Tends to follow |
|---|---|---|
| Cognitive | (no ceiling — substrate of others) | — |
| Emotional | Cognitive + 1 | Intrapersonal |
| Moral | Cognitive + 1 | Emotional, Intrapersonal |
| Intrapersonal | Cognitive + 1 | (no follower) |
| Spiritual | Cognitive + 1 | Intrapersonal, Moral |
| Somatic | (no ceiling) | (independent) |
| Willpower | Cognitive + 2 | (independent) |
| Interpersonal | Cognitive + 1 | Emotional |

Reading: **Cognitive is the substrate**; six lines cannot outrun it by
more than one stage. **Somatic and Willpower are independent** —
empirically, you can have very high somatic intelligence (a master
athlete) without high cognitive altitude, and vice versa.

### 2.3 Cross-line tasks

Some encounters legitimately probe two lines at once:

| Encounter type | Lines | Example |
|---|---|---|
| Empathic dilemma | Emotional + Moral | "He weeps. Will you spare him?" |
| Body-mind | Somatic + Cognitive | Breath-paced n-back |
| Resolve | Willpower + Cognitive | Sustained n-back across long arena |
| Attunement | Interpersonal + Emotional | Coordinated parry with co-op partner |
| Witnessing | Intrapersonal + Cognitive | Replay-with-prediction task |
| Vow | Spiritual + Willpower | Hold a chosen value across temptations |

Mini-bosses are exactly the design space for these compositions
(`enemies/02-mini-bosses-dual-task.md`).

## 3. Game-design mapping

### 3.1 The radial chart

Eight spokes, one per line, around a central point. Concentric rings
mark stages (Infrared at centre → Turquoise at rim). The current altitude
on each line is plotted; the chart's filled area is the *psychograph*.

The visualisation immediately reveals:

- The **horizon line** — the lowest spoke; the developmental bottleneck.
- The **leading line** — the highest spoke; the player's current edge.
- **Quadrant skew** — if the warm spokes (UL lines) are short and the
  cool spokes (UR lines) are long, the player is *exteriorising* and
  needs interior work.
- **Repression patterns** — if a spoke has been static while others
  grow, it is being avoided.

See `docs/system/sub-systems/presentation/rendering-layer.md` for the visual grammar.

### 3.2 Encounter scheduler

The post-fight encounter scheduler:

1. Identifies the **horizon line** (lowest altitude).
2. Identifies the **most-recently-played line** (last 3 sessions).
3. Identifies any **shadow signals** (`foundations/10`).
4. Schedules the next encounter to:
   - Touch the horizon line (gentle pull-up)
   - Avoid the most-recently-played line if it has been used 3× in a row
     (no overuse fatigue)
   - Surface a shadow encounter if one is unresolved

The player can override scheduler suggestions ("I want to fight
something else") — autonomy first.

### 3.3 Stage-advancement gate

To advance from stage *S* to stage *S+1*, the player must:

1. Have *every line* at altitude ≥ *S* (the floor)
2. Have *at least two lines* at altitude ≥ *S+1* (the pull)
3. Have demonstrated capacity in *all four quadrants* at altitude *S*
   (`foundations/01`)
4. Have completed the synthesis-exam main boss for stage *S*
5. Have **resolved any active shadow signals** at altitude ≤ *S*

(5) is the integrity step. A player who powered through the surface
checks but has unaddressed regression cannot advance until they engage
the shadow.

### 3.4 Stage advancement is line-uniform

A player at "Orange" who is actually `[Cog: Orange, Emo: Amber, Mor:
Amber, Intra: Amber, Spi: Amber, Som: Orange, Wil: Orange, Inter: Amber]`
is **NOT** at Orange. They are at Amber, with bright Orange spokes.
The synthesised stage = the floor (with hysteresis, as specified in
`foundations/02`).

This is what stops players from gaming the system by pumping a single
line.

## 4. Architectural contract

```
const LINE_CEILINGS: Record<Line, { dependsOn: Line | null; offset: number }> = {
  Cognitive:     { dependsOn: null,           offset: 0 },
  Emotional:     { dependsOn: 'Cognitive',    offset: 1 },
  Moral:         { dependsOn: 'Cognitive',    offset: 1 },
  Intrapersonal: { dependsOn: 'Cognitive',    offset: 1 },
  Spiritual:     { dependsOn: 'Cognitive',    offset: 1 },
  Somatic:       { dependsOn: null,           offset: 0 },
  Willpower:     { dependsOn: 'Cognitive',    offset: 2 },
  Interpersonal: { dependsOn: 'Cognitive',    offset: 1 },
};

function ceiling(line: Line, profile: PlayerProfile): Stage {
  const dep = LINE_CEILINGS[line].dependsOn;
  const off = LINE_CEILINGS[line].offset;
  if (!dep) return 'White';
  return offsetStage(profile.altitudes[dep], off);
}
```

Pure functions tested in `core/usecases/LineCeilings.spec.ts`:

1. Cognitive has no ceiling.
2. Emotional cannot exceed Cognitive + 1 stage.
3. Stage-advancement requires all lines ≥ candidate, ≥2 lines ≥ candidate+1.
4. Resolved shadow signals required for advancement.

## 5. Open questions

- **Are the dependency offsets correct?** Empirical research on line
  development is sparse — these are reasoned defaults. They should be
  treated as *tunable*, with defaults documented and any changes
  rationalised.
- **Multi-line tasks and double-credit.** When a single encounter probes
  two lines, do both get full credit, half credit, or some weighted
  share? Default: half-credit each, with a small "synergy bonus" if both
  are passed cleanly.
- **Cosmetic vs. mechanical line emphasis.** Should the radial chart
  show *current* altitude only, or also the *deepest visited* altitude
  on each spoke (for shadow / regression visibility)? Default: both,
  with the deepest as a faint ring.

## 6. Principles served

Principles **1, 4, 7** — the multi-line architecture is *the* answer
to "what is being trained" and "what is earned progression."

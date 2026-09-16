# Concept Drafts — 64 Modules × 7 Game Modalities

> **Cross-references:** [[docs/foundations/11-game-modalities|11 — Game Modalities]] · [[docs/foundations/12-drive-assessment-mechanics|12 — Drive Assessment Mechanics]] · [[docs/foundations/13-architecture-of-consciousness|13 — Architecture Of Consciousness]] · [[docs/foundations/14-game-as-developmental-catalyst|14 — Game As Developmental Catalyst]]
> **Purpose:** First-principles game designs for every game in the Mysterium assessment ecosystem. Each game is a self-contained developmental catalyst that implicitly diagnoses AND progressively heals/evolves the player across all drives and shadow-polarities for its line×stage module.
> **Structure:** `{line}/{stage}/` — one directory per module (64 total).
> **Each module contains:** 1 module-spec file + 7 game concept files (one per modality).

---

## Directory Structure

```
concept-drafts/
├── cognitive/
│   ├── 01-infrared/
│   │   ├── module-spec.md          ← THE module's psychology (capacity + shadows + drives + healing + scoring)
│   │   ├── deterministic.md        ← Game design ONLY (unique to this modality)
│   │   ├── language-reflective.md
│   │   ├── scenario-choice.md
│   │   ├── embodied-somatic.md
│   │   ├── strategic-planning.md
│   │   ├── social-cooperative.md
│   │   └── immersive-rpg.md
│   ├── 02-magenta/
│   │   └── ... (same 8 files)
│   └── ... (through 08-white)
├── emotional/
├── moral/
├── intrapersonal/
├── spiritual/
├── somatic/
├── willpower/
└── interpersonal/
```

**Total files when complete:** 64 modules × 8 files = 512 concept documents.

---

## The Uniqueness Principle

Every file must contain ONLY information that no other file contains. The architecture enforces this:

| File | Unique lateral | Does NOT contain |
|---|---|---|
| `module-spec.md` | The module's full psychology: capacity definition, shadow archetypes, drive-health landscape, healing vectors, scoring parameters, compound shadows, cross-module relationships | Game designs, item pools, technical requirements |
| Each game file | The unique game design for ONE modality: how THIS axis delivers catalyst differently from the other 6 | Shadow archetype definitions, drive-health tables, healing theory, scoring formulas (reference module-spec.md) |

**What lives in foundational docs (never repeated in concept-drafts):**
- `foundations/10` — The 4-quadrant shadow MODEL (what shadows ARE)
- `foundations/12` — The drive assessment FRAMEWORK (how drives are measured in general)
- `foundations/14` — The catalyst→experience→integration MECHANICS (how games become catalysts in general)

**What lives in module-spec.md (never repeated in game files):**
- The 4 shadow archetypes for THIS module (names, patterns, detection signals)
- The drive-health landscape for THIS module (4×2 healthy/pathological)
- The healing vectors for THIS module (heal/evolve + evolve/heal)
- The scoring parameters for THIS module (capacity dimensions, theta-decay, thresholds)
- Compound shadows and cross-module relationships

**What lives in each game file (never repeated across game files):**
- The unique game concept (title, mechanic, aesthetic)
- How THIS modality delivers catalyst at the contact boundary (distinct from other 6)
- The actual gameplay (setup, interaction, feedback, progression)
- The item pool specification
- Technical requirements (inputs, timing, LLM needs, state)

---

## File Templates

### module-spec.md

```markdown
# {Line} / {Stage} — Module Specification

## 1. Capacity Definition
- What this module measures (the specific developmental capacity at this line×stage)
- Core capacity dimensions (table: dimension, definition, assessment vehicle, ceiling)
- What this is NOT (distinguish from adjacent stages above and below)

## 2. Shadow Archetypes
- Dark-Addiction: [Named] — core pattern, drive pathology, behavioural signatures, what it protects against
- Dark-Allergy: [Named] — core pattern, drive pathology, behavioural signatures, what it protects against
- Golden-Addiction: [Named] — core pattern, drive pathology, behavioural signatures, what it protects against
- Golden-Allergy: [Named] — core pattern, drive pathology, behavioural signatures, what it protects against

## 3. Drive-Health Landscape
- Full 4×2 table: each drive in both domains (healthy + pathological expression)
- How drives interact at this specific line×stage

## 4. Healing Vectors
- Heal/Evolve (Agape + Agency → dark shadows): specific interventions for this module
- Evolve/Heal (Eros + Communion → golden shadows): specific interventions for this module
- Integration criteria: what "healed" looks like at this module

## 5. Scoring Parameters
- Theta model (half-life, max-decay, composite weights)
- Stage-transition thresholds (up and down)
- Drive-health weight and shadow-drag coefficient
- Cross-validation rules (how modalities validate each other)

## 6. Compound Shadows & Cross-Module Relationships
- Named compound shadows (which modules interact)
- Bidirectional loops
- How this module's health supports/depends on adjacent modules

## 7. Shadow Surfacing Sequence
- Which capacity dimension surfaces which shadow first
- Per-modality surfacing table (one row per modality — how each game surfaces each shadow)
- Shadow intensity scoring (levels 0-4)
```

### Game concept file (deterministic.md, language-reflective.md, etc.)

```markdown
# {Line} / {Stage} — {Modality} Game Concept

> **Modality axis:** [One sentence: what unique dimension of catalyst delivery this modality provides]
> **Why this axis for this module:** [One sentence: why this modality matters for this specific line×stage]

## 1. Game Identity
- Title (evocative, not clinical)
- Core mechanic (one paragraph — what makes this game THIS game)
- Duration per session
- Internal progression stages (named phases with checkpoint ranges)

## 2. Catalyst Delivery
- What specific catalyst does THIS modality present at the contact boundary?
- How is this DIFFERENT from the other 6 modalities for this module?
- What unconscious material does this axis uniquely surface?
- What does successful integration look like WITHIN this game?

## 3. Game Design
- Setup (what the player sees; aesthetic)
- Interaction (what they do at each progression phase)
- Feedback (what they experience — implicit, not clinical)
- Difficulty adaptation (how the game meets the player)
- Internal progression table (phase → checkpoint range → what changes)

## 4. Item Pool
- Item types (with brief descriptions)
- Minimum pool sizes
- Generation rules

## 5. Technical Requirements
- Input types
- Timing requirements
- NPC/AI requirements
- LLM requirements (None / Low / Medium / High / Very High)
- State persistence (what carries across sessions)
```

---

## What Each Modality Uniquely Probes

The 7 modalities are 7 AXES of catalyst delivery. Each surfaces the same shadows through a different dimension:

| Modality | Unique axis | What it alone can measure |
|---|---|---|
| **Deterministic** | Objective psychophysics | Ground-truth capacity (binary correct/incorrect, ms timing). No interpretation. The calibration anchor. |
| **Language-reflective** | Verbal metacognition | Whether the player can ARTICULATE their process. Bridges implicit capacity to explicit awareness. |
| **Scenario-choice** | Contextual decision-making | Whether the player can APPLY capacity wisely in ambiguous situations. Wisdom, not just skill. |
| **Embodied-somatic** | Body-as-medium | Whether capacity is EMBODIED (not just mental). The body's relationship to the line's capacity. |
| **Strategic-planning** | Multi-step sequencing | Whether the player can PLAN within the capacity's domain. Executive function applied to this line. |
| **Social-cooperative** | Relational coordination | Whether the player can exercise capacity WITH OTHERS. The social dimension of the line. |
| **Immersive-rpg** | Ecological/spontaneous | Whether capacity appears NATURALLY in free-play. Transfer to lived behaviour. The ultimate validity check. |

---

## Cross-Validation Logic

Modalities validate each other. Discrepancies between modalities are diagnostic:

- **Deterministic high + Language-reflective low** = implicit capacity without metacognitive awareness (normal at early stages)
- **Language-reflective high + Deterministic low** = verbal performance without actual capacity (golden-addiction signal)
- **Deterministic high + Immersive-rpg low** = structured capacity without ecological transfer (compartmentalised)
- **Social-cooperative high + Deterministic low** = group-dependent capacity (communion-addiction signal)
- **Embodied-somatic high + Language-reflective low** = embodied knowing without verbal access (somatic intelligence ahead of cognitive)

---

## Development Priority

| Phase | Modules | Files |
|---|---|---|
| **Phase 1** | Red × all 8 lines | 64 files (8 modules × 8 files) |
| **Phase 2** | Amber + Magenta × all 8 lines | 128 files |
| **Phase 3** | Orange + Green × all 8 lines | 128 files |
| **Phase 4** | Infrared + Turquoise + White × all 8 lines | 192 files |

---

## Reference Documents

- `foundations/10` — The 4-quadrant shadow model (what shadows ARE; the 256-shadow matrix)
- `foundations/11` — Game modalities (7 types, what each measures)
- `foundations/12` — Drive assessment mechanics (how drives are measured; the framework)
- `foundations/13` — Architecture of consciousness (5-layer topography, contact boundary, Matrix/Potentiator)
- `foundations/14` — Game as developmental catalyst (catalyst→experience→integration mechanics)
- `ROADMAP.md` — Development phases and process
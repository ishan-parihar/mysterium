# Grounded Audit: User-Matrix/Potentiator Modelling

> **Status:** canonical-hypothesis (Mysterium-specific operationalization of HoloOS `02.1_Microcosmic_Metabolic_Architecture.md` canonical).
>
> **Date:** 2026-07-03
>
> **Scope:** Audit how the Mysterium codebase models (or fails to model) the USER's own Matrix and Potentiator — the pre-existing unprocessed developmental material the user brings to the game — vs modelling only the in-game Significator's encounter history.

---

## 0. The Core Ontological Distinction

Per HoloOS `02.1` §1-4 (canonical):

- **Matrix** (Reservoir A, intra-holonic, past): STORES Experience. Current-state organizer. Holds accumulated unprocessed catalyst.
- **Potentiator** (Reservoir B, extra-holonic, future): STORES Catalyst. Latent-state generator. Holds unprocessed experience waiting to become new catalyst.
- **Catalyst** flows Potentiator → Matrix (extra→intra bridge).
- **Experience** flows Matrix → Potentiator (intra→extra bridge).
- **Shadows are digestive inefficiencies:**
  - **Dark-Addiction** = excess Catalyst in Matrix (unprocessed life-challenge, repetitive pattern)
  - **Dark-Allergy** = deficient Catalyst in Matrix (avoidance, fragile configuration)
  - **Golden-Addiction** = excess Experience in Potentiator (premature expansion, bypass)
  - **Golden-Allergy** = deficient Experience in Potentiator (resistance to growth)

The user's articulation: "nudging for the catalyst that are unprocessed in the individual's matrix, and unprocessed experiences that are unprocessed in the Potentiator" maps EXACTLY to:
- Unprocessed catalyst in Matrix → Dark-Addiction patterns
- Unprocessed experience in Potentiator → Golden-Addiction patterns

---

## 1. What the Code Currently Models

### 1.1 The in-game Significator (NOT the user's Matrix/Potentiator)

The Mysterium `Significator` interface (`src/core/domain/Significator.ts`) models:

| Field | What it tracks | HoloOS analogue | Gap |
|---|---|---|---|
| `altitudes: Record<Line, Stage>` | Per-line developmental level reached IN-GAME | Verticality (V.D) | Does NOT model the user's pre-existing altitude before playing |
| `theta.lastEncounter` | When each (line×stage) cell was last exercised IN-GAME | Matrix staleness | Models in-game decay, NOT the user's pre-existing unprocessed catalyst |
| `shadows.entries` | Shadows that surfaced during in-game encounters | Shadow ledger | REACTIVE — only tracks what surfaces, doesn't proactively probe the user's pre-existing shadows |
| `drives.fixationRisk` | Drive fixation accumulated from in-game responses | Potentiator filtering | Closer to user-Potentiator, but not explicitly framed as "what the user's Potentiator filters out" |
| `polarity.cells` | Per-cell polarity traces from in-game choices | Matrix stored experience | Models in-game accumulation, NOT the user's pre-existing polarity |
| `recentEncounters` | Last 50 in-game encounter records | Recent contact-boundary events | In-game only |

### 1.2 The scheduler's priority formula (reactive, not proactive)

`PriorityComputation.computePriority()` uses 7 criteria:

| Criterion | Weight | What it targets | User-Matrix/Potentiator gap |
|---|---|---|---|
| `thetaUrgency` | 0.25 | Stale in-game cells | Models in-game decay, not user's pre-existing unprocessed Matrix |
| `shadowActivation` | 0.20 | Unresolved in-game shadows | REACTIVE — targets shadows that already surfaced, doesn't probe for undiscovered ones |
| `polarityAlignment` | 0.15 | Polarized cells | Models in-game polarity, not user's pre-existing direction |
| `transformationReadiness` | 0.15 | Lines at edge | In-game state |
| `driveCorrection` | 0.10 | Fixated drives | Closest to user-Potentiator, but reactive |
| `narrativeCoherence` | 0.10 | NPC relationships | In-game state |
| `sessionFit` | 0.05 | Session arc | In-game state |

**All 7 criteria are reactive** — they target in-game accumulated state. None proactively probe the user's pre-existing Matrix/Potentiator configuration.

### 1.3 The two-phase progression (implicit, not explicit)

The user described two phases:
1. **Random catalysts** (to probe and map the user's Matrix/Potentiator)
2. **Crystallized-profile targeting** (focus on patterns relevant to the user's evolution)

The code does this IMPLICITLY:
- **Phase 1:** For a fresh player (all theta cells at 0, no shadows, no polarity), `thetaUrgency` = 1.0 for ALL cells → all cells have max urgency → the tie-breaker (`now % 2000`) produces pseudo-random selection. This IS random catalyst throwing, but it's not FRAMED as probing.
- **Phase 2:** As shadows accumulate, `shadowActivation` boosts their priority. As drives fixate, `driveCorrection` targets complements. As polarity crystallizes, `polarityAlignment` deepens. This IS profile-driven targeting, but there's no explicit crystallization threshold or phase transition.

**The gap:** There's no `profilePhase` field that explicitly tracks the transition from 'unmapped' → 'mapping' → 'crystallizing' → 'crystallized'. The game doesn't know WHEN it has enough data to switch from probing to targeting.

---

## 2. The Critical Missing Primitive: UserMatrixModel

The game needs an explicit model of the USER's Matrix/Potentiator that is SEPARATE from the in-game Significator. This model tracks:

### 2.1 UserMatrix (the user's unprocessed catalyst reservoir)

For each (Line × Stage) cell, the game should infer:
- **Unprocessed catalyst load** (0-1): how much unprocessed life-catalyst is in the user's Matrix at this cell? Inferred from:
  - Strong emotional/cognitive reaction to the cell's encounters (response length, intensity keywords)
  - Fixation patterns (same drive-choice repeatedly)
  - Avoidance patterns (flinching, withdrawal, short responses)
  - Theta-decay rate (fast decay = the cell is actively unprocessed, not settled)
- **Dark-Addiction signature**: excess catalyst, repetitive pattern, old response repeating
- **Dark-Allergy signature**: deficient catalyst, avoidance, fragile configuration

### 2.2 UserPotentiator (the user's unprocessed experience reservoir)

For each (Line × Stage) cell, the game should infer:
- **Unprocessed experience load** (0-1): how much experience has entered the user's Potentiator without being converted to new catalyst? Inferred from:
  - Bypass patterns (spiritualizing, premature closure, "I'm already past this")
  - Golden-shadow signals (reaching toward higher stage without grounding)
  - Resistance patterns ("I don't need this", refusal to engage)
- **Golden-Addiction signature**: excess experience, premature expansion, bypass
- **Golden-Allergy signature**: deficient experience, resistance to growth

### 2.3 ProfilePhase (explicit phase tracking)

| Phase | Trigger | Scheduler behavior |
|---|---|---|
| `unmapped` | Fresh player, < 3 encounters per line | Random diverse probing across all cells |
| `mapping` | 3+ encounters on some lines, patterns emerging | Continue probing unexplored cells + begin targeting emerging patterns |
| `crystallizing` | Polarity master mode = 'Crystallizing' OR 5+ shadows surfaced | Focus on crystallizing patterns, reduce random probing |
| `crystallized` | Polarity master mode = 'Crystallized' | Targeted intervention on specific unprocessed aspects |

---

## 3. Types of Catalysts, Experiences, Significators, Great Way

Per the user's request, here are the types the architecture must distinguish:

### 3.1 Types of Catalysts

| Type | Purpose | When used | Selection mechanism |
|---|---|---|---|
| **Probing catalyst** | Map the user's Matrix/Potentiator | Phase: unmapped, mapping | Random diverse selection across all cells |
| **Targeting catalyst** | Address a specific unprocessed aspect | Phase: crystallizing, crystallized | Priority formula weighted by shadowActivation + driveCorrection |
| **Shadow-surfacing catalyst** | Trigger a specific shadow quadrant | When shadow detected but not yet surfaced | executionMode = 'shadow', shadowTarget = quadrant |
| **Capacity-building catalyst** | Strengthen a weak Line | When altitude spread is high | weaknessBonus in priority formula |
| **Polarity-deepening catalyst** | Crystallize STO/STS direction | When polarity master = 'Crystallizing' | polarityAlignment criterion |
| **Transformation-threshold catalyst** | Trigger stage transition | When transformationReadiness > 0.8 | scheduleThresholdMode() |
| **Holonic-return catalyst** | Resurface earlier-stage unprocessed material | When earlier-stage shadows unresolved | holonic-return detection (not yet wired) |

### 3.2 Types of Experiences (consequence metabolization)

| Type | Signature | Drive directionality | Shadow quadrant |
|---|---|---|---|
| **Integration** | Shadow resolved, experience metabolized | HealthyBalanced | (resolved) |
| **Fixation** | Drive over-expressed, catalyst not fully processed | DarkAddicted | DarkAddiction |
| **Avoidance** | Drive under-expressed, Potentiator filtered catalyst | DarkAverted | DarkAllergy |
| **Bypass** | Golden shadow, skipped past actual work | GoldenAddicted | GoldenAddiction |
| **Resistance** | Refusal to grow, Potentiator closed | GoldenAverted | GoldenAllergy |
| **Crystallization** | Polarity pattern solidified | (stable direction) | (none) |
| **Regression** | Holonic return, earlier-stage reactivated | (varies) | (earlier-stage) |

### 3.3 Types of Significators (user developmental-profile configurations)

| Type | profilePhase | Polarity master mode | Shadow state | Scheduler focus |
|---|---|---|---|---|
| **Unmapped** | unmapped | Exploring | None surfaced | Random probing |
| **Mapping** | mapping | Exploring | Some surfacing | Probing + early targeting |
| **Crystallizing** | crystallizing | Crystallizing | Active patterns | Pattern deepening |
| **Crystallized** | crystallized | Crystallized | Stable topology | Targeted intervention |
| **Transforming** | (any) | (any) | (any) | Threshold catalyst |

### 3.4 Types of Great Way (teleological attractors)

| Type | Polarity direction | Crystallization | Catalyst character |
|---|---|---|---|
| **STO crystallization** | Radiative (service-to-others) | > 0.7 | Relational, giving, outward-facing |
| **STS crystallization** | Absorptive (service-to-self) | > 0.7 | Sovereign, receiving, inward-facing |
| **Integration** | Neutral / mixed | < 0.4 | Balancing, grounding, consolidating |
| **Harvest** | (stable) | (octave-boundary) | Contemplative, rites-of-passage |

---

## 4. Implementation: UserMatrixModel Engine

I will implement a `UserMatrixModel` engine that explicitly models the user's Matrix/Potentiator and exposes a `profilePhase` that the scheduler uses to transition from random probing to targeted intervention.

### 4.1 Domain types

```typescript
// src/core/engines/UserMatrixModel.ts

export type ProfilePhase = 'unmapped' | 'mapping' | 'crystallizing' | 'crystallized';

export interface CellMatrixState {
  readonly line: Line;
  readonly stage: Stage;
  readonly unprocessedCatalystLoad: number;   // 0-1, Dark-Addiction signal
  readonly unprocessedExperienceLoad: number; // 0-1, Golden-Addiction signal
  readonly avoidanceSignal: number;           // 0-1, Dark-Allergy signal
  readonly resistanceSignal: number;          // 0-1, Golden-Allergy signal
  readonly encounterCount: number;
  readonly lastProbedAt: number;
}

export interface UserMatrixModel {
  readonly cells: Readonly<Record<string, CellMatrixState>>;
  readonly profilePhase: ProfilePhase;
  readonly probeCoverage: number;  // fraction of 64 cells probed at least once
  readonly crystallizationThreshold: number;  // 0-1, when to transition to 'crystallized'
}
```

### 4.2 Inference logic

The `UserMatrixModel` is updated after each encounter by inferring the user's Matrix/Potentiator state from their response:

- **Unprocessed catalyst load** ↑ when: response length is long (strong reaction), intensity keywords present, same drive-choice repeated
- **Avoidance signal** ↑ when: response is short, withdrawal keywords present, encounter avoided
- **Unprocessed experience load** ↑ when: bypass keywords present ("transcend", "already past"), spiritualizing language
- **Resistance signal** ↑ when: refusal keywords present ("don't need", "fine as I am"), defensiveness

### 4.3 Scheduler integration

The scheduler's priority formula gains a new criterion:

- **userMatrixTargeting** (replaces部分 of thetaUrgency + shadowActivation):
  - Phase `unmapped`: boost UNPROBED cells (probeCoverage < 1.0 → diversity)
  - Phase `mapping`: boost cells with high unprocessedCatalystLoad + low encounterCount
  - Phase `crystallizing`: boost cells with highest unprocessedCatalystLoad (targeted)
  - Phase `crystallized`: boost cells with specific shadow quadrant matches

### 4.4 Phase transition logic

- `unmapped` → `mapping`: when probeCoverage >= 0.25 (16/64 cells probed)
- `mapping` → `crystallizing`: when polarity.master.mode = 'Crystallizing' OR 5+ shadows surfaced
- `crystallizing` → `crystallized`: when polarity.master.mode = 'Crystallized'
- `crystallized` → `unmapped` (regression): when transformation fires (new stage = new territory to probe)

---

## 5. What Was Removed

Per user request, the decorative "Qualitative Atmospheric Closing" lines have been removed from both Direct Questioning and Story-Driven session closures. These lines ("The session closes. Each question was a mirror…", "Something that was hidden has been touched…", etc.) imposed a specific vibe that may not resonate universally and broke the flow. The session's felt-sense is now carried entirely by the per-encounter feedback, not by a summary block.

---

**End of grounded audit.**

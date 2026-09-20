# Developmental Profile Mapping — Audit Report

> **Date:** 2026-05-17
> **Scope:** How the player's developmental profile is constructed, maintained, and used — from onboarding through gameplay.
> **Verdict:** The profile *data structure* is comprehensive. The *mapping logic* (how gameplay updates the profile) has critical gaps. Several documented systems exist only as types with no runtime behaviour.

---

## Part I — What the First Principles Require

Per `foundations/02`, `foundations/03`, `lines/00`, `foundations/05`, `foundations/10`, and `MVP-BLUEPRINT.md`, the developmental profile must:

| # | Requirement | Source doc |
|:-:|---|---|
| 1 | Track per-line altitude (8 lines × 8 stages) | `foundations/03 §2.2` |
| 2 | Synthesise a single stage via the "lowest altitude with hysteresis" rule | `foundations/02 §3.2` |
| 3 | Enforce line ceilings (Emotional ≤ Cognitive+1, etc.) | `lines/00 §4` |
| 4 | Track per-task staircase state (9 tasks, each with level/reversals/history) | `foundations/08` |
| 5 | Track drive weights and fixation risk (4 drives) | `foundations/05` |
| 6 | Track ray profile (7 rays, 0-1 each) — violet-ray as harvest criterion | `foundations/06 §7.5` |
| 7 | Track state progress (5 states: Gross→NonDual) | `foundations/04` |
| 8 | Detect shadow signals (fixation, regression, repression) | `foundations/10 §2.1` |
| 9 | Track vows (willpower/moral/spiritual commitments) | `lines/07 §4.2` |
| 10 | Track codex entries (player-authored + auto-unlocked) | `narrative/00 §5` |
| 11 | Enforce stage-advancement gate (all lines ≥ S, ≥2 lines ≥ S+1, all 4 quadrants, boss cleared, shadows resolved) | `lines/00 §3.3` |
| 12 | Update altitudes from combat encounter results | `progression/00 §4.2` |
| 13 | Compute the "horizon line" (weakest line) for encounter scheduling | `lines/00 §3.2` |
| 14 | Track quadrant coverage per stage | `foundations/01 §3.2` |
| 15 | Seed staircases from onboarding thresholds | `MVP-BLUEPRINT.md §11` |

---

## Part II — What Is Implemented vs. What Is Missing

### ✅ Implemented and working

| # | Feature | Implementation | Status |
|:-:|---|---|---|
| 1 | Per-line altitude tracking | `PlayerProfile.altitudes: Record<Line, Stage>` | ✅ Complete |
| 4 | Per-task staircase state | `PlayerProfile.taskStaircases: Record<TaskSlug, StaircaseState>` | ✅ Complete |
| 5 | Drive weights | `PlayerProfile.drives.weights: Record<Drive, number>` | ✅ Data structure exists |
| 6 | Ray profile | `PlayerProfile.rayProfile: Record<Ray, number>` | ✅ Data structure exists |
| 7 | State progress | `PlayerProfile.states: Record<State, StateProgress>` | ✅ Data structure exists |
| 8 | Shadow signals (detection) | `ShadowDetector.detectShadows()` | ✅ Detects repression + fixation |
| 9 | Vows | `PlayerProfile.vows: Vow[]` | ✅ Data structure exists |
| 10 | Codex entries | `PlayerProfile.codexEntries: CodexEntry[]` | ✅ Data structure exists |
| 15 | Staircase seeding from onboarding | `OnboardingScene.finishOnboarding()` seeds `taskStaircases` | ✅ Complete |

### ⚠️ Partially implemented (data exists, logic incomplete)

| # | Feature | What exists | What's missing |
|:-:|---|---|---|
| 2 | Stage synthesis with hysteresis | `synthesiseStage()` returns lowest altitude | **Missing:** the "+1 pull" hysteresis rule. Current impl is just `min(altitudes)` — no requirement for ≥2 lines at S+1. |
| 8 | Shadow detection (regression) | Detects repression + fixation | **Missing:** regression detection (altitude *dropped* and stayed). Requires historical altitude tracking (not in profile). |
| 11 | Stage-advancement gate | `meetsAdvancementCriteria()` checks all lines ≥ target | **Missing:** ≥2 lines at S+1 check, quadrant coverage check, boss-cleared check, shadow-resolved check. |

### ❌ Not implemented at all

| # | Feature | What's needed | Impact |
|:-:|---|---|---|
| 3 | **Line ceilings** | `Emotional ≤ Cognitive+1`, `Moral ≤ Cognitive+1`, etc. No enforcement exists. A player could theoretically have Emotional at White and Cognitive at Infrared. | **High** — violates the documented cognitive-substrate constraint |
| 5 | **Drive fixation risk tracking** | `drives.fixationRisk` is always `{Agency:0, Communion:0, Eros:0, Agape:0}`. Nothing ever updates it. | **Medium** — drives are cosmetic until this works |
| 6 | **Ray profile computation** | `rayProfile` is always `{Red:0, Orange:0, ...}`. Nothing ever computes it from gameplay. Per `foundations/06 §7.5`, it should reflect how *distinctly* each ray has been activated. | **High** — the harvest endgame depends on this |
| 12 | **Altitude updates from combat** | No code path exists that takes a combat encounter result and updates `PlayerProfile.altitudes`. The staircase updates `level` but nothing maps that back to altitude. | **Critical** — the profile never changes after onboarding |
| 13 | **Horizon line computation** | No function computes the weakest line for encounter scheduling. | **Medium** — encounter scheduler doesn't exist yet |
| 14 | **Quadrant coverage tracking** | No field tracks which quadrants have been demonstrated at each stage. | **Medium** — stage gate can't enforce it |

---

## Part III — The Critical Gap: Profile Never Updates After Onboarding

This is the single most important finding.

**Current state:** Onboarding calibrates the profile. Then the profile *never changes*. Combat encounters run, the staircase updates `taskStaircases[slug].level`, but nothing ever:
1. Checks if the staircase level has crossed a threshold that should advance a line's altitude
2. Recomputes the synthesised stage
3. Updates the ray profile
4. Checks for shadow signals after each session
5. Enforces line ceilings

**What should happen (per the docs):**

After every combat encounter:
```
1. Update taskStaircases[slug] via the 1-up/2-down staircase
2. For each line whose primary task was exercised:
   a. Check if staircase.level has crossed the next threshold in ThresholdMaps
   b. If yes AND line ceiling is not violated → advance altitude[line]
   c. Recompute synthesised stage via synthesiseStage()
   d. Recompute ray profile
3. After every session (not every encounter):
   a. Run ShadowDetector
   b. Check stage-advancement gate
   c. Update drive fixation risk from choice patterns
```

This is the **ProfileUpdater** use-case — it does not exist.

---

## Part IV — The StageSynthesizer Is Incomplete

### Current implementation:
```ts
export function synthesiseStage(altitudes: Record<Line, Stage>): Stage {
  let minOrdinal = 7;
  for (const line of ALL_LINES) {
    const ord = stageOrdinal(altitudes[line]);
    if (ord < minOrdinal) minOrdinal = ord;
  }
  return ALL_STAGES[minOrdinal]!;
}
```

This is just `min(altitudes)`. Per `foundations/02 §3.2`, the rule is:

> Player.stage = max stage S such that:
>   for all line L: altitude(L) >= S
>   AND at least one line reaches S+1

The "+1 pull" means: the stage doesn't advance until at least one line has *broken through* to the next level. This prevents oscillation when the weakest line jitters at the boundary.

### What's also missing from `meetsAdvancementCriteria()`:

Per `lines/00 §3.3`, advancement requires ALL of:
1. ✅ All 8 lines ≥ target stage (implemented)
2. ❌ At least 2 lines ≥ target+1 (NOT implemented)
3. ❌ All 4 quadrants demonstrated at target stage (NOT implemented — no quadrant tracking)
4. ❌ Main boss synthesis exam cleared (NOT implemented — no boss-cleared flag)
5. ❌ No active shadow signals at altitude ≤ target (NOT implemented — shadows not checked)

---

## Part V — The ShadowDetector Has Wrong Line→Task Mapping

Current code:
```ts
const lineTaskMap: Partial<Record<Line, keyof typeof profile.taskStaircases>> = {
  Cognitive: 'n_back',
  Emotional: 'affect_recognition',
  Moral: 'dilemma_choice',
  Intrapersonal: 'go_no_go',      // ← WRONG: Go/No-Go is cognitive, not intrapersonal
  Spiritual: 'breath_rhythm',      // ← WRONG: breath rhythm is somatic, not spiritual
  Somatic: 'reaction_time',
  Willpower: 'simon',             // ← WRONG: Simon is cognitive, not willpower
  Interpersonal: 'stroop',        // ← WRONG: Stroop is cognitive, not interpersonal
};
```

This mapping is stale from before the probe redesign. The correct mapping (post-refactor):

| Line | Primary task slug | Rationale |
|---|---|---|
| Cognitive | `n_back` | ✅ Correct |
| Emotional | `affect_recognition` | ✅ Correct |
| Moral | `dilemma_choice` | ✅ Correct |
| Intrapersonal | `held_input` | Self-report accuracy → closest to held-input (sustained attention to self) |
| Spiritual | `breath_rhythm` | Value-coherence → no perfect slug; needs a new `value_coherence` task slug |
| Somatic | `reaction_time` | ✅ Correct |
| Willpower | `held_input` | ✅ Correct (sustained hold) |
| Interpersonal | `simon` | Pattern prediction → closest to simon (spatial coordination) |

The deeper issue: the `TaskSlug` type doesn't include slugs for the new probe tasks (intrapersonal self-report, spiritual value-coherence, interpersonal pattern-prediction). These are new task types that need to be added to the canonical set.

---

## Part VI — The Ray Profile Is Never Computed

Per `foundations/06 §7.5`:

> Mysterium models this via a `rayProfile: Record<Ray, number>` on the
> PlayerProfile. The violet-ray *integration quality* is computed as a
> function of how *distinct* (low-variance, well-developed,
> non-collapsed) the player's prior rays are.

The computation should be:
```
For each ray R:
  rayProfile[R] = normalized altitude of the stage that maps to R

violetRay = f(variance of rayProfile[Red..Indigo])
  - Low variance (all rays developed equally) → high violet
  - High variance (some rays bypassed) → low violet ("muddied")
```

This is the harvest criterion. Without it, the endgame has no gate.

---

## Part VII — Line Ceilings Are Not Enforced

Per `lines/00 §4`:

```
Emotional ≤ Cognitive + 1
Moral ≤ Cognitive + 1
Intrapersonal ≤ Cognitive + 1
Spiritual ≤ Cognitive + 1
Willpower ≤ Cognitive + 2
Interpersonal ≤ Cognitive + 1
Somatic: no ceiling
Cognitive: no ceiling
```

No code enforces this. A `LineCeilings.ts` use-case is needed that:
1. Takes a proposed altitude change
2. Checks if it would violate the ceiling
3. Returns the capped altitude (or the proposed one if valid)

---

## Part VIII — Refactor Plan (Priority Order)

| # | Task | Creates | Effort | Impact |
|:-:|---|---|---|---|
| 1 | **Create `ProfileUpdater.ts`** — the use-case that takes encounter results and updates the profile (altitudes, stage, rays, shadows) | The missing runtime loop | High | **Critical** — without this, the profile is static |
| 2 | **Create `LineCeilings.ts`** — enforces cognitive-substrate caps | Prevents impossible profiles | Low | High |
| 3 | **Create `RayProfileComputer.ts`** — computes ray activation from altitudes | Enables harvest endgame | Low | High |
| 4 | **Fix `StageSynthesizer.ts`** — add the "+1 pull" hysteresis rule and the full 5-check advancement gate | Correct stage advancement | Medium | High |
| 5 | **Fix `ShadowDetector.ts`** — correct line→task mapping, add regression detection, add historical altitude tracking | Correct shadow detection | Medium | Medium |
| 6 | **Add new TaskSlugs** — `self_report`, `value_coherence`, `pattern_prediction` for the redesigned probes | Type completeness | Low | Medium |
| 7 | **Add quadrant coverage tracking** — a `Record<Stage, Set<Quadrant>>` field on the profile | Enables quadrant gate | Low | Medium |
| 8 | **Create `EncounterScheduler.ts`** — computes the horizon line and suggests next encounters | Intelligent progression | Medium | Medium |
| 9 | **Add drive fixation risk updates** — track choice patterns and update `drives.fixationRisk` | Enables drive-based shadows | Medium | Low (post-MVP) |
| 10 | **Wire `ProfileUpdater` into BattleScene** — after each encounter, call the updater | Closes the loop | Low | **Critical** (depends on #1) |

---

## Part IX — The Complete Profile Update Loop (Target Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                        ENCOUNTER COMPLETES                        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Update taskStaircases[slug] via 1-up/2-down                  │
│     (already implemented in Staircase.ts)                        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. For each line exercised:                                     │
│     a. Map staircase.level → stage via ThresholdMaps             │
│     b. Check LineCeilings — cap if needed                        │
│     c. If new altitude > current → advance altitude[line]        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Recompute synthesised stage (with hysteresis)                │
│     - All lines ≥ S AND ≥1 line at S+1 → stage = S              │
│     - All lines ≥ S AND ≥2 lines at S+1 → stage = S+1           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Recompute rayProfile from altitudes                          │
│     - Each ray's activation = ordinal(altitude of its stage) / 7 │
│     - Violet = 1 - normalised_variance(Red..Indigo)              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. End-of-session checks (every N encounters or on session end): │
│     a. Run ShadowDetector → update profile.shadows               │
│     b. Check stage-advancement gate (5 criteria)                 │
│     c. Update drive fixation risk from choice patterns           │
│     d. Persist profile to storage                                │
└─────────────────────────────────────────────────────────────────┘
```

This loop does not exist. Creating it is the #1 priority.

---

## Part X — Summary

The `PlayerProfile` data structure is **comprehensive and correct** — it has all the fields the first principles require. The problem is that **nothing updates it after onboarding**. The profile is born complete and then frozen.

The five missing pieces, in priority order:
1. **ProfileUpdater** — the runtime loop that maps encounter results → altitude changes → stage recomputation → ray profile → shadow detection
2. **LineCeilings** — prevents impossible altitude configurations
3. **RayProfileComputer** — enables the harvest endgame
4. **StageSynthesizer fix** — the hysteresis rule and full advancement gate
5. **ShadowDetector fix** — correct line→task mapping and regression detection

Once these five are in place, the developmental profile becomes a *living document* that evolves with every encounter — which is the entire point of the game.

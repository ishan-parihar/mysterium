# 27 -- Auto-Mode Strategy Engine

> **Cross-references:** [[docs/foundations/24-encounter-scheduler|24 — Encounter Scheduler]]
> **Lateral:** The session-level strategy layer that consumes the CCI (foundations/25) and produces a session plan -- parameterising the encounter scheduler's session arc, biasing its priority weights, and adjusting mid-session based on engagement signals. Auto-mode wraps the scheduler; it never replaces it.
>
> **Depends on:** 24, 25, 16
> **Referenced by:** 26 (unified architecture, pipeline diagram), 43 (agentic orchestration — the orchestrator consumes session strategy and expresses it as delegation plans)
>
> **Orchestration note (43):** a session strategy names *what* should happen; the orchestration layer decides *which agent* delivers each element (council presence scheduling, 43 §3.3). Strategy generation stays engine-deterministic; agent selection is the orchestrator's ratification surface.

---

## 1. Purpose and unique lateral

The encounter scheduler (foundations/24) answers: "Which encounter should come next?" It operates per-encounter, computing priority scores for candidates and presenting ranked options.

Auto-mode answers a different question: **"What kind of session should this be?"**

No existing document covers this:

- Foundations/24 defines the session arc (section 7.1: warmup/peak/cooldown proportions) but uses FIXED proportions based only on time available.
- Foundations/24 defines the priority formula (section 3.2: 7 criteria with static weights) but does not adapt weights across a session.
- Foundations/25 computes the CCI composite and session signals but does not ACT on them.
- Foundations/16 defines the Significator's state but does not prescribe how to use it for session planning.

Auto-mode fills this gap: it takes the CCI's session signals and translates them into concrete parameterisation of the scheduler's existing mechanisms. It sits BETWEEN the CCI and the scheduler in the pipeline:

```
Significator --> CCI --> Auto-Mode --> Scheduler --> EncounterSpec
                (25)      (27)          (24)
```

**What auto-mode does NOT do:**
- It does not select individual encounters (that is the scheduler's job)
- It does not compute developmental state (that is the CCI's job)
- It does not produce player-facing content (Veil principle, foundations/20)
- It does not override the player's free will (encounters are still offers, not mandates)

---

## 2. The session strategy

### 2.1 Strategy interface

Before the first encounter of each session, auto-mode generates a complete session strategy:

```ts
interface SessionStrategy {
  // Theme and focus
  theme: SessionTheme;                    // from CCI signals (foundations/25 section 4.1)
  themeRationale: string;                 // internal logging only (never player-facing)

  // Arc parameterisation (extends foundations/24 section 7.1)
  arc: ParameterisedSessionArc;

  // Weight biasing (modifies foundations/24 section 3.2 defaults)
  weightBias: PriorityWeightBias;

  // Encounter budget
  encounterBudget: EncounterBudget;

  // Modality preferences for this session
  modalityBias: Partial<Record<GameModality, number>>;

  // Mid-session adjustment triggers
  adjustmentThresholds: AdjustmentThresholds;
}
```

### 2.2 Parameterised session arc

Auto-mode extends the scheduler's fixed session arc (foundations/24 section 7.1 `SessionArc` interface) with CCI-informed parameters:

```ts
interface ParameterisedSessionArc {
  // Base arc (from foundations/24 section 7.1, selected by time available)
  baseArc: SessionArc;

  // Auto-mode modifications
  warmup: {
    intensityCeiling: number;             // max intensity during warmup (0.0-1.0)
    focus: WarmupFocus;                   // what warmup targets
    preferredModalities: GameModality[];  // modalities for gentle re-entry
  };
  peak: {
    intensityRange: { min: number; max: number };  // intensity band for peak encounters
    shadowAllocation: number;              // proportion of peak allocated to shadow work (0.0-0.5)
    transformationSlots: number;           // encounters reserved for threshold work (0-3)
  };
  cooldown: {
    intensityCeiling: number;             // max intensity during cooldown
    integrationFocus: boolean;            // whether cooldown should emphasise reflection
    preferredModalities: GameModality[];
  };
}

type WarmupFocus =
  | 'theta-decay-arrest'      // target most decayed lines with easy encounters
  | 'familiar-modality'       // use player's highest-engagement modalities
  | 'drive-rebalancing'       // gentle exercise of under-expressed drive
  | 'continuation'            // resume from where last session left off
  | 'general';               // no specific warmup target
```

### 2.3 Priority weight biasing

Auto-mode adjusts the scheduler's 7-criterion priority weights for the duration of the session. This is the primary mechanism by which session-level strategy shapes encounter selection.

```ts
interface PriorityWeightBias {
  // Multipliers applied to the scheduler's default weights (foundations/24 section 3.2)
  // Field names match PriorityWeights in src/core/engines/PriorityComputation.ts
  // A multiplier of 1.0 = no change; >1.0 = boost; <1.0 = reduce
  thetaUrgency: number;
  shadowActivation: number;
  polarityAlignment: number;
  transformationReadiness: number;
  driveCorrection: number;
  narrativeCoherence: number;
  sessionFit: number;
}

// The scheduler applies biases before normalising weights
function applyWeightBias(
  defaults: PriorityWeights,
  bias: PriorityWeightBias
): PriorityWeights {
  const biased = {
    thetaUrgency: defaults.thetaUrgency * bias.thetaUrgency,
    shadowActivation: defaults.shadowActivation * bias.shadowActivation,
    polarityAlignment: defaults.polarityAlignment * bias.polarityAlignment,
    transformationReadiness: defaults.transformationReadiness * bias.transformationReadiness,
    driveCorrection: defaults.driveCorrection * bias.driveCorrection,
    narrativeCoherence: defaults.narrativeCoherence * bias.narrativeCoherence,
    sessionFit: defaults.sessionFit * bias.sessionFit,
  };

  // Normalise so weights still sum to 1.0
  const total = Object.values(biased).reduce((a, b) => a + b, 0);
  return Object.fromEntries(
    Object.entries(biased).map(([k, v]) => [k, v / total])
  ) as PriorityWeights;
}
```

### 2.4 Encounter budget

Auto-mode specifies how many encounters the session should contain and how they are distributed:

```ts
interface EncounterBudget {
  totalTarget: number;                    // target encounter count for the session
  warmupCount: number;                    // encounters in warmup phase
  peakCount: number;                      // encounters in peak phase
  cooldownCount: number;                  // encounters in cooldown phase
  shadowEncounterCap: number;             // maximum shadow-mode encounters in one session
  practiceSlots: number;                  // slots reserved for player-initiated practice (0-2)
}
```

---

## 3. Strategy generation algorithm

### 3.1 The generation function

```ts
function generateSessionStrategy(
  cci: CCIScore,
  session: SessionContext,
  previousStrategy: SessionStrategy | null
): SessionStrategy {
  // 1. Select theme (already computed by CCI)
  const theme = cci.sessionSignals.recommendedTheme;

  // 2. Generate arc parameters based on theme
  const arc = parameteriseArc(theme, cci, session);

  // 3. Compute weight bias based on theme and CCI dimensions
  const weightBias = computeWeightBias(theme, cci);

  // 4. Compute encounter budget
  const encounterBudget = computeEncounterBudget(session, arc);

  // 5. Determine modality preferences
  const modalityBias = computeModalityBias(theme, cci, session);

  // 6. Set adjustment thresholds
  const adjustmentThresholds = computeAdjustmentThresholds(theme, cci);

  return {
    theme,
    themeRationale: `CCI dominant dimension: ${cci.dominantDimension}; composite: ${cci.composite.toFixed(2)}`,
    arc,
    weightBias,
    encounterBudget,
    modalityBias,
    adjustmentThresholds,
  };
}
```

### 3.2 Theme-to-weight-bias mapping

Each session theme produces a characteristic weight bias:

```ts
function computeWeightBias(theme: SessionTheme, cci: CCIScore): PriorityWeightBias {
  switch (theme) {
    case 'shadow-integration':
      return {
        thetaUrgency: 0.6,           // reduce maintenance
        shadowActivation: 1.8,       // strongly boost shadow encounters
        polarityAlignment: 0.7,      // reduce polarity focus
        transformationReadiness: 0.5, // reduce transformation push
        driveCorrection: 1.2,        // moderate boost (shadows often involve drive imbalance)
        narrativeCoherence: 0.8,     // slightly reduce narrative
        sessionFit: 1.0,             // unchanged
      };

    case 'growth-edge-push':
      return {
        thetaUrgency: 0.8,
        shadowActivation: 0.7,
        polarityAlignment: 1.2,
        transformationReadiness: 1.8, // strongly boost threshold-contributing encounters
        driveCorrection: 0.8,
        narrativeCoherence: 1.0,
        sessionFit: 0.9,
      };

    case 'consolidation':
      return {
        thetaUrgency: 1.5,           // boost maintenance of neglected lines
        shadowActivation: 0.8,
        polarityAlignment: 0.8,
        transformationReadiness: 0.5, // reduce growth pressure
        driveCorrection: 1.3,        // moderate rebalancing
        narrativeCoherence: 1.2,
        sessionFit: 1.4,             // prioritise session comfort
      };

    case 'drive-rebalancing':
      return {
        thetaUrgency: 0.7,
        shadowActivation: 0.8,
        polarityAlignment: 0.7,
        transformationReadiness: 0.6,
        driveCorrection: 2.0,        // heavily boost drive correction
        narrativeCoherence: 0.9,
        sessionFit: 1.0,
      };

    case 'transformation-prep':
      return {
        thetaUrgency: 0.5,
        shadowActivation: 1.5,       // clear shadows blocking threshold
        polarityAlignment: 1.0,
        transformationReadiness: 2.0, // maximum threshold focus
        driveCorrection: 0.7,
        narrativeCoherence: 1.0,
        sessionFit: 0.7,
      };

    case 'active-transformation':
      // Delegate entirely to transformation mode (foundations/24 section 6.2)
      return {
        thetaUrgency: 0.2,
        shadowActivation: 0.5,
        polarityAlignment: 0.3,
        transformationReadiness: 3.0,
        driveCorrection: 0.3,
        narrativeCoherence: 0.5,
        sessionFit: 0.5,
      };

    case 'post-transformation':
      return {
        thetaUrgency: 0.5,           // everything is fresh, low decay urgency
        shadowActivation: 0.5,       // shadows cleared at threshold
        polarityAlignment: 1.5,      // polarity deepens at new altitude
        transformationReadiness: 0.2, // far from next threshold
        driveCorrection: 1.3,        // drives rebalance
        narrativeCoherence: 1.8,     // new narrative arc opening
        sessionFit: 1.5,             // gentle re-entry
      };

    case 'polarity-deepening':
      return {
        thetaUrgency: 0.8,
        shadowActivation: 0.9,
        polarityAlignment: 2.0,      // heavily boost polarity encounters
        transformationReadiness: 0.8,
        driveCorrection: 0.7,
        narrativeCoherence: 1.0,
        sessionFit: 0.9,
      };

    case 'balanced-development':
    default:
      return {
        thetaUrgency: 1.0,
        shadowActivation: 1.0,
        polarityAlignment: 1.0,
        transformationReadiness: 1.0,
        driveCorrection: 1.0,
        narrativeCoherence: 1.0,
        sessionFit: 1.0,
      };
  }
}
```

### 3.3 Arc parameterisation by theme

```ts
function parameteriseArc(
  theme: SessionTheme,
  cci: CCIScore,
  session: SessionContext
): ParameterisedSessionArc {
  // Start with the base arc from foundations/24 section 7.1
  const baseArc = computeSessionArc(session);  // from foundations/24

  switch (theme) {
    case 'shadow-integration':
      return {
        baseArc,
        warmup: {
          intensityCeiling: 0.3,
          focus: 'familiar-modality',
          preferredModalities: ['language_reflective', 'immersive_rpg'],
        },
        peak: {
          intensityRange: { min: 0.4, max: 0.7 },  // moderate -- shadow work shouldn't overwhelm
          shadowAllocation: 0.5,                     // half of peak is shadow encounters
          transformationSlots: 0,
        },
        cooldown: {
          intensityCeiling: 0.2,
          integrationFocus: true,
          preferredModalities: ['language_reflective'],
        },
      };

    case 'growth-edge-push':
      return {
        baseArc,
        warmup: {
          intensityCeiling: 0.4,
          focus: 'continuation',
          preferredModalities: ['deterministic_psychometric', 'strategic_planning'],
        },
        peak: {
          intensityRange: { min: 0.6, max: 1.0 },
          shadowAllocation: 0.1,
          transformationSlots: 2,
        },
        cooldown: {
          intensityCeiling: 0.3,
          integrationFocus: false,
          preferredModalities: ['immersive_rpg', 'language_reflective'],
        },
      };

    case 'consolidation':
      return {
        baseArc,
        warmup: {
          intensityCeiling: 0.3,
          focus: 'theta-decay-arrest',
          preferredModalities: ['deterministic_psychometric'],
        },
        peak: {
          intensityRange: { min: 0.3, max: 0.6 },  // lower intensity -- consolidation, not push
          shadowAllocation: 0.2,
          transformationSlots: 0,
        },
        cooldown: {
          intensityCeiling: 0.2,
          integrationFocus: true,
          preferredModalities: ['language_reflective', 'immersive_rpg'],
        },
      };

    // Additional themes follow similar patterns
    default:
      return {
        baseArc,
        warmup: {
          intensityCeiling: 0.35,
          focus: 'general',
          preferredModalities: [],
        },
        peak: {
          intensityRange: { min: 0.5, max: 0.8 },
          shadowAllocation: 0.2,
          transformationSlots: 1,
        },
        cooldown: {
          intensityCeiling: 0.25,
          integrationFocus: false,
          preferredModalities: ['language_reflective'],
        },
      };
  }
}
```

---

## 4. Mid-session adaptation

Auto-mode does not only plan at session-start. It monitors engagement signals during the session and adjusts the strategy when thresholds are crossed.

### 4.1 Adjustment thresholds

```ts
interface AdjustmentThresholds {
  // Energy drop: if energy inference drops below this, reduce intensity
  energyDropThreshold: number;            // 0.0-1.0; threshold for energy signal

  // Avoidance spike: if avoidance rate exceeds this, shift strategy
  avoidanceSpikeThreshold: number;        // 0.0-1.0; threshold for avoidance

  // Engagement surge: if response quality spikes, allow intensity increase
  engagementSurgeThreshold: number;       // 0.0-1.0; threshold for quality signal

  // Shadow fatigue: if shadow encounters produce declining integration, pause shadow work
  shadowFatigueTrials: number;            // consecutive shadow encounters without integration before pause

  // Re-evaluation interval: recompute CCI after this many encounters
  reEvaluationInterval: number;           // encounter count between CCI refreshes
}

const DEFAULT_ADJUSTMENT_THRESHOLDS: AdjustmentThresholds = {
  energyDropThreshold: 0.35,
  avoidanceSpikeThreshold: 0.4,
  engagementSurgeThreshold: 0.8,
  shadowFatigueTrials: 3,
  reEvaluationInterval: 3,
};
```

### 4.2 Mid-session adjustment logic

```ts
function evaluateMidSessionAdjustment(
  currentStrategy: SessionStrategy,
  session: SessionContext,
  recentOutcomes: RecentEncounter[]
): SessionStrategyAdjustment | null {
  // Check energy drop
  if (session.inferredEnergy === 'low' &&
      currentStrategy.arc.peak.intensityRange.max > 0.5) {
    return {
      type: 'intensity-reduction',
      newPeakIntensity: { min: 0.3, max: 0.5 },
      rationale: 'Energy drop detected; reducing peak intensity',
    };
  }

  // Check avoidance spike
  const recentAvoidance = recentOutcomes
    .slice(0, 3)
    .filter(e => e.outcome === 'avoided').length / Math.max(recentOutcomes.slice(0, 3).length, 1);
  if (recentAvoidance > currentStrategy.adjustmentThresholds.avoidanceSpikeThreshold) {
    return {
      type: 'theme-shift',
      newTheme: 'consolidation',
      newWeightBias: computeWeightBias('consolidation', null!),
      rationale: 'High avoidance rate; shifting to consolidation',
    };
  }

  // Check engagement surge
  const recentQuality = computeRecentResponseQuality(recentOutcomes);
  if (recentQuality > currentStrategy.adjustmentThresholds.engagementSurgeThreshold &&
      session.inferredEnergy === 'high') {
    return {
      type: 'intensity-increase',
      newPeakIntensity: { min: 0.7, max: 1.0 },
      rationale: 'High engagement + energy; allowing intensity increase',
    };
  }

  // Check shadow fatigue
  const consecutiveShadowWithoutIntegration = countConsecutiveShadowFailures(recentOutcomes);
  if (consecutiveShadowWithoutIntegration >= currentStrategy.adjustmentThresholds.shadowFatigueTrials) {
    return {
      type: 'shadow-pause',
      shadowBiasOverride: 0.3,
      rationale: 'Shadow fatigue; reducing shadow encounter frequency',
    };
  }

  return null;  // no adjustment needed
}

interface SessionStrategyAdjustment {
  type: 'intensity-reduction' | 'intensity-increase' | 'theme-shift' | 'shadow-pause';
  newPeakIntensity?: { min: number; max: number };
  newTheme?: SessionTheme;
  newWeightBias?: PriorityWeightBias;
  shadowBiasOverride?: number;
  rationale: string;
}
```

### 4.3 CCI refresh cycle

Every `reEvaluationInterval` encounters (default: 3), auto-mode recomputes the CCI from the current Significator state. If the CCI's recommended theme has changed, auto-mode may generate a mid-session strategy adjustment:

```ts
function refreshStrategy(
  currentStrategy: SessionStrategy,
  sig: SignificatorSnapshot,
  session: SessionContext
): SessionStrategy {
  const freshCCI = computeCCI(sig);

  // If theme has changed, generate new strategy for remaining session
  if (freshCCI.sessionSignals.recommendedTheme !== currentStrategy.theme) {
    // Don't override active-transformation or post-transformation mid-session
    if (currentStrategy.theme === 'active-transformation' ||
        currentStrategy.theme === 'post-transformation') {
      return currentStrategy;  // these themes persist for entire session
    }

    // Generate fresh strategy with remaining time
    return generateSessionStrategy(freshCCI, session, currentStrategy);
  }

  return currentStrategy;
}
```

---

## 5. Relationship to foundations/24 (what auto-mode extends, not replaces)

### 5.1 What the scheduler already handles (auto-mode does NOT touch)

- Per-encounter candidate generation and filtering (section 3.1)
- The 7-criterion priority formula structure (section 3.2)
- Tie-breaking rules (section 3.3)
- The non-coercion principle (section 3.4)
- Polarity-conditioned selection logic (section 4)
- Shadow-targeting mechanics (section 5)
- Transformation-window scheduling (section 6)
- Modality rotation constraints (section 7.2)
- The macro-catalyst engine (section 8)
- The EncounterSpec output format (section 9)

### 5.2 What auto-mode parameterises (wrapping the scheduler)

| Scheduler mechanism | Auto-mode parameterisation |
|---|---|
| Session arc proportions (section 7.1) | `ParameterisedSessionArc` -- adjusts warmup/peak/cooldown based on CCI theme |
| Priority weights (section 3.2) | `PriorityWeightBias` -- multipliers on the 7 default weights |
| Intensity target per phase (section 7.1) | `intensityRange` per arc phase -- constrains encounter intensity |
| Energy management (section 7.3) | `intensityBudget` from CCI + mid-session energy adjustment |
| Encounter count per phase | `EncounterBudget` -- derived from time + theme requirements |

### 5.3 The wrapping contract

```ts
// Auto-mode wraps the scheduler -- it calls the scheduler, never the reverse
interface AutoModeContract {
  // Called at session start
  generateStrategy(sig: SignificatorSnapshot, session: SessionContext): SessionStrategy;

  // Called before each scheduler invocation (applies bias)
  getSchedulerParams(strategy: SessionStrategy, session: SessionContext): SchedulerParams;

  // Called after each encounter (evaluates mid-session adjustment)
  evaluateAdjustment(
    strategy: SessionStrategy,
    session: SessionContext,
    recentOutcomes: RecentEncounter[]
  ): SessionStrategy;
}

interface SchedulerParams {
  weightBias: PriorityWeightBias;
  intensityConstraint: { min: number; max: number };
  modalityBias: Partial<Record<GameModality, number>>;
  shadowAllocationRemaining: number;
  currentPhase: 'warmup' | 'peak' | 'cooldown';
}
```

The scheduler receives `SchedulerParams` and uses them to:
1. Apply `weightBias` before computing priority scores
2. Filter candidates by `intensityConstraint`
3. Boost/penalise candidates by `modalityBias`
4. Limit shadow-mode encounters to `shadowAllocationRemaining`

---

## 6. The "recommended gaming strategy" (internal plan)

### 6.1 What this is

The "recommended gaming strategy" is the internal plan that auto-mode generates. It is NEVER shown to the player (Veil principle). It shapes how encounters are sequenced -- not just which encounters appear (that is still the scheduler's per-encounter decision), but the overall rhythm and flow of the session.

### 6.2 Strategy as narrative arc

Each session theme implies a narrative arc:

| Theme | Session narrative |
|---|---|
| `shadow-integration` | Gentle opening -> deep shadow confrontation -> integration and release |
| `growth-edge-push` | Energising warmup -> intense threshold work -> reflective wind-down |
| `consolidation` | Maintenance of neglected areas -> moderate practice -> peaceful integration |
| `drive-rebalancing` | Familiar comfort -> targeted challenge of weak drive -> balanced closure |
| `transformation-prep` | Shadow clearing -> edge encounters -> transformation priming |
| `active-transformation` | Unravelling encounters -> crucible pairs -> emergence scaffolding |
| `post-transformation` | Gentle exploration at new altitude -> low-intensity familiarisation -> narrative opening |
| `polarity-deepening` | Direction-aligned warmup -> temptation/testing encounters -> deepening |
| `balanced-development` | Mixed warmup -> diverse peak -> integration cooldown |

The player does not see these narratives described. They EXPERIENCE them as natural session flow -- sometimes intense, sometimes gentle, always purposeful.

---

## 7. Edge cases and safety

### 7.1 First session (no prior data)

When the Significator has no encounter history (brand new player):

```ts
function generateFirstSessionStrategy(session: SessionContext): SessionStrategy {
  // Default to calibration mode (onboarding)
  return {
    theme: 'balanced-development',
    themeRationale: 'First session; no CCI data available; defaulting to onboarding flow',
    arc: {
      baseArc: computeSessionArc(session),
      warmup: {
        intensityCeiling: 0.3,
        focus: 'general',
        preferredModalities: ['deterministic_psychometric', 'scenario_choice'],
      },
      peak: {
        intensityRange: { min: 0.3, max: 0.6 },
        shadowAllocation: 0.0,           // no shadow work until calibrated
        transformationSlots: 0,
      },
      cooldown: {
        intensityCeiling: 0.2,
        integrationFocus: false,
        preferredModalities: ['immersive_rpg'],
      },
    },
    weightBias: {
      thetaUrgency: 0.5,
      shadowActivation: 0.3,
      polarityAlignment: 0.8,
      transformationReadiness: 0.2,
      driveCorrection: 0.5,
      narrativeCoherence: 1.5,           // boost narrative for engagement
      sessionFit: 2.0,                   // heavily weight session comfort
    },
    encounterBudget: {
      totalTarget: 5,
      warmupCount: 2,
      peakCount: 2,
      cooldownCount: 1,
      shadowEncounterCap: 0,
      practiceSlots: 0,
    },
    modalityBias: {},
    adjustmentThresholds: DEFAULT_ADJUSTMENT_THRESHOLDS,
  };
}
```

### 7.2 Very short sessions

When `session.estimatedTimeAvailable === 'short'` (< 15 minutes):

- Auto-mode caps total encounters at 3 (1 warmup, 1 peak, 1 cooldown)
- Shadow work is deferred unless shadow pressure is critical
- Transformation encounters are deferred unless actively transforming
- Intensity is capped at 0.6 (insufficient time for high-intensity recovery)

### 7.3 Distressed Significator (safety override)

If the CCI indicates both `shadowPressure: 'critical'` and `driveHealth < 0.3`:

```ts
function applySafetyOverride(strategy: SessionStrategy): SessionStrategy {
  return {
    ...strategy,
    theme: 'consolidation',              // override to safest theme
    arc: {
      ...strategy.arc,
      peak: {
        intensityRange: { min: 0.2, max: 0.4 },  // cap intensity
        shadowAllocation: 0.0,                     // no shadow surfacing when already overwhelmed
        transformationSlots: 0,
      },
    },
    weightBias: {
      thetaUrgency: 1.0,
      shadowActivation: 0.3,             // reduce shadow encounters
      polarityAlignment: 0.5,
      transformationReadiness: 0.2,
      driveCorrection: 1.5,             // gentle rebalancing
      narrativeCoherence: 1.5,           // narrative comfort
      sessionFit: 2.0,                   // maximum session comfort
    },
  };
}
```

This embodies the anti-frustration backstop (foundations/16 section 6.3): the system never pushes a distressed player harder. It backs off and offers comfort.

---

## 8. Implementation

### 8.1 File structure

```
src/core/engines/AutoModeStrategy.ts
```

A single module exporting the auto-mode contract:

```ts
export {
  generateSessionStrategy,
  evaluateMidSessionAdjustment,
  refreshStrategy,
  applyWeightBias,
  type SessionStrategy,
  type PriorityWeightBias,
  type ParameterisedSessionArc,
  type EncounterBudget,
  type AdjustmentThresholds,
};
```

### 8.2 Dependencies

- `CCIEngine` (foundations/25) -- provides `CCIScore` input
- `SignificatorSnapshot` type (foundations/16)
- `SessionContext` type (foundations/24 section 2.3)
- `SessionArc` computation (foundations/24 section 7.1)
- `PriorityWeights` type (foundations/24 section 3.2)

### 8.3 Pure function contract

Like the CCI engine, auto-mode is implemented as pure functions. No side effects, no persistence, no mutation. State in, strategy out.

### 8.4 Test criteria

- Given a CCI with `recommendedTheme: 'shadow-integration'`, strategy produces `shadowActivation` weight bias > 1.5
- Given a CCI with `transformationProximity: 'imminent'`, strategy produces `transformationReadiness` weight bias > 1.5
- Given a session with `inferredEnergy: 'low'` mid-session, adjustment reduces peak intensity
- Given 3 consecutive avoided encounters, adjustment shifts to consolidation theme
- Given a first session (no history), strategy uses safe defaults with high session-fit weight
- Given `shadowPressure: 'critical'` and low drive health, safety override engages
- Weight biases always produce normalised weights (sum to 1.0) after application
- Pure function: same inputs always produce same outputs

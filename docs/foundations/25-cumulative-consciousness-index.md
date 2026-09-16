# 25 -- Cumulative Consciousness Index (CCI)

> **Cross-references:** [[docs/foundations/24-encounter-scheduler|24 — Encounter Scheduler]]
> **Status:** canonical-hypothesis (Mysterium-specific operationalization; G_z/P_z framework grounded in HoloOS Primal Distortion Genesis Theorem).
>
> **HoloOS anchor:** `_THEORY/02_Ontology/02.1_Microcosmic_Metabolic_Architecture.md` (canonical) + `_THEORY/02_Ontology/08.8.7_Primal_Distortion_Genesis_Theorem.md` (canonical-hypothesis). HoloOS requires both `G_z` (Lesser-Cycle health, Agape, rewards balance/integration) AND `P_z` (Greater-Cycle health, Eros, rewards polarization/transcendence) for total metabolic health.
>
> **Ontological derivation (NEW, per Primal Distortion Genesis Theorem):** The G_z/P_z duality is not arbitrary — it corresponds to two of three established Primal Laws:
> - **G_z (Agape/integration) ↔ Love-Law (D2, Second Distortion, established by Octave N-2).** Love is the principle of unity-attracting; G_z measures how well the holon metabolizes catalyst into integrated experience within the current Stage.
> - **P_z (Eros/polarization) ↔ Free-Will-Law (D1, First Distortion, established by Octave N-3).** Free Will is the principle of choice-as-such; P_z measures how ready the holon is to ratchet to the next Stage via authentic choice.
> - **Light-Law (D3, Third Distortion) is the substrate both operate on** — the holon at D3 (Light) needs both Free-Will-choice (P_z) and Love-integration (G_z) to be metabolically complete.
>
> **Total Metabolic Health = G_z · P_z** (geometric mean). A player with high G_z but low P_z is "consolidating" — healthy but not advancing. A player with high P_z but low G_z is "polarizing unhealthily" — advancing without integration. Both must be nonzero. This formula now has ontological grounding, not just HoloOS citation.
>
> **The 5 existing CCI dimensions map as follows:**
> - Altitude Map → neither (positional, not health)
> - Drive Health Tensor → G_z (primary)
> - Polarity Vector → P_z (primary)
> - Shadow Topology → G_z (primary)
> - Transformation Readiness → P_z (primary)
>
> **Lateral:** The composite internal scoring model that folds five developmental dimensions -- altitude, drive health, polarity, shadow topology, and transformation readiness -- into a single index consumed by the auto-mode strategy engine. The CCI is NEVER player-facing (Veil principle, foundations/20). It operates at the session-strategy level, above the encounter scheduler's per-encounter priority formula.
>
> **Depends on:** 10, 12, 16, 17, 19
> **Referenced by:** 26 (unified architecture), 27 (auto-mode strategy engine)

---

## 1. Purpose and unique lateral

No existing document computes a composite score across all five developmental dimensions simultaneously:

- Foundations/16 defines the Significator data model (the vessel) but does not compute a composite.
- Foundations/24 defines the encounter scheduler's 7-criterion priority formula -- that operates per-candidate-encounter, not per-session.
- Foundations/17 defines transformation readiness as a threshold check -- binary, not continuous.
- Foundations/19 defines the 4-level polarity aggregation -- structural, not scored.
- Foundations/12 defines per-module drive probes -- local, not global.

The CCI fills this gap: a **continuous, multi-dimensional composite signal** that captures the Significator's overall developmental state at session-start. It feeds the auto-mode strategy engine (foundations/27) which uses it to shape session-level decisions: warmup intensity, peak focus, session theme, and scheduler weight biasing.

**What the CCI is NOT:**
- It is NOT shown to the player (Veil principle, foundations/20 -- the player never sees a "score" or "level")
- It is NOT a replacement for the encounter scheduler's priority formula (foundations/24 section 3.2) -- that formula selects individual encounters; CCI shapes the session envelope
- It is NOT a judgement -- it carries no normative valence (higher is not "better"; it is different)
- It is NOT persistent state -- it is computed fresh at each session boundary from the Significator snapshot

---

## 2. The five input dimensions

The CCI composes five orthogonal dimensions, each extracted from the Significator's current state. Each dimension is normalised to [0.0, 1.0] before composition.

### 2.1 Dimension 1: Altitude Map

**Source:** `SignificatorSnapshot.altitudes` (foundations/16 section 2.1)

The altitude map captures WHERE the Significator is across all 8 lines of development.

```ts
interface AltitudeInput {
  perLineAltitudes: Record<Line, Stage>;
  centreOfGravity: Stage;
  spread: number;              // standard deviation of altitudes (normalised 0-1)
  lowestAltitude: Stage;       // holonic floor
  highestAltitude: Stage;      // growth ceiling
  linesAtEdge: number;         // count of lines at (centreOfGravity + 1)
}
```

**Normalisation:**

```ts
function normaliseAltitude(input: AltitudeInput): number {
  const stageValues: Record<Stage, number> = {
    infrared: 0.0, magenta: 0.143, red: 0.286, amber: 0.429,
    orange: 0.571, green: 0.714, turquoise: 0.857, white: 1.0
  };

  // Weighted combination: CoG is primary, spread penalises, floor matters
  const cogValue = stageValues[input.centreOfGravity];
  const floorValue = stageValues[input.lowestAltitude];

  // Holonic health: floor pulls the effective altitude down
  const holonicPenalty = Math.max(0, cogValue - floorValue - 0.286) * 0.3;

  // Spread penalty: highly uneven development reduces effective altitude
  const spreadPenalty = input.spread * 0.15;

  return Math.max(0.0, Math.min(1.0, cogValue - holonicPenalty - spreadPenalty));
}
```

**What this dimension tells auto-mode:** The overall developmental altitude constrains which session themes are appropriate. A Red-altitude session cannot target integration tasks designed for Orange. The spread indicates whether consolidation or expansion is more appropriate.

### 2.2 Dimension 2: Drive Health Tensor

**Source:** `SignificatorSnapshot.driveBalance` and `SignificatorSnapshot.fixationRisk` (foundations/12, foundations/16 section 2.1)

The drive health tensor captures the 4-drive balance and pathology risk.

```ts
interface DriveHealthInput {
  balance: Record<Drive, number>;         // -1.0 to +1.0 per drive
  fixationRisk: Record<Drive, number>;    // 0.0 to 1.0 per drive
  maxImbalance: number;                   // max absolute balance across drives
  maxFixationRisk: number;                // max fixation risk across drives
  complementaryTension: {
    agencyVsCommunion: number;            // |agency - communion| normalised
    erosVsAgape: number;                  // |eros - agape| normalised
  };
}
```

**Normalisation:**

```ts
function normaliseDriveHealth(input: DriveHealthInput): number {
  // Drive health is INVERTED: high score = healthy (low imbalance, low fixation)
  const balanceHealth = 1.0 - input.maxImbalance;
  const fixationHealth = 1.0 - input.maxFixationRisk;
  const tensionHealth = 1.0 - (
    input.complementaryTension.agencyVsCommunion * 0.5 +
    input.complementaryTension.erosVsAgape * 0.5
  );

  return (
    balanceHealth * 0.35 +
    fixationHealth * 0.40 +
    tensionHealth * 0.25
  );
}
```

**What this dimension tells auto-mode:** Low drive health suggests a session focused on rebalancing -- encounters that exercise under-expressed drives. High fixation risk indicates shadow-vulnerable territory that may warrant gentler session pacing.

### 2.3 Dimension 3: Polarity Vector

**Source:** `SignificatorSnapshot.polarityState` (foundations/19 section 4, specifically the `MasterPolarity` aggregation)

The polarity vector captures the Significator's macro-orientation state.

```ts
interface PolarityInput {
  masterMode: 'exploration' | 'crystallizing' | 'crystallized';
  direction: 'STO' | 'STS' | null;
  crystallizationIndex: number;           // 0.0 to 1.0
  coherentLineCount: number;              // lines with coherent polarity pattern
  exploratoryBreadth: number;             // diversity of sampled patterns (normalised)
  recentPolarityStability: number;        // consistency of recent traces (0-1)
}
```

**Normalisation:**

```ts
function normalisePolarity(input: PolarityInput): number {
  // Polarity score reflects CLARITY, not direction
  // High score = clear direction (whether STO or STS)
  // Low score = uncrystallised, exploratory
  switch (input.masterMode) {
    case 'exploration':
      // In exploration, score reflects breadth of sampling
      return input.exploratoryBreadth * 0.4;
    case 'crystallizing':
      // In crystallizing, score reflects emerging coherence
      return 0.4 + (input.crystallizationIndex * 0.3);
    case 'crystallized':
      // In crystallized, score reflects depth and stability
      return 0.7 + (input.recentPolarityStability * 0.3);
  }
}
```

**What this dimension tells auto-mode:** Exploration mode sessions should maximise polarity diversity. Crystallizing sessions should alternate deepening and testing. Crystallized sessions should provide path-specific depth encounters.

### 2.4 Dimension 4: Shadow Topology

**Source:** `SignificatorSnapshot.shadowLedger` and `SignificatorSnapshot.compoundShadows` (foundations/10, foundations/16 section 3)

The shadow topology captures the state of unresolved developmental material.

```ts
interface ShadowTopologyInput {
  unresolvedCount: number;                // total unresolved shadow signals
  averageSeverity: number;                // mean severity across unresolved (0-1)
  maxSeverity: number;                    // worst single shadow severity
  compoundPatternCount: number;           // cross-line shadow patterns detected
  recentSurfacingRate: number;            // shadows surfaced per session (recent avg)
  integrationRate: number;                // shadows integrated per session (recent avg)
  oldestUnresolvedAge: number;            // sessions since oldest unresolved shadow
  quadrantDistribution: Record<ShadowQuadrant, number>;  // count per quadrant
}
```

**Normalisation:**

```ts
function normaliseShadowTopology(input: ShadowTopologyInput): number {
  // Shadow score is INVERTED: high score = clean (few shadows, well-integrated)
  // Low score = heavy shadow load

  const countPenalty = Math.min(input.unresolvedCount / 12, 1.0);  // cap at 12
  const severityPenalty = input.maxSeverity;
  const compoundPenalty = Math.min(input.compoundPatternCount / 4, 1.0);
  const stalePenalty = Math.min(input.oldestUnresolvedAge / 20, 1.0);  // 20 sessions = max
  const integrationCredit = Math.min(input.integrationRate / input.recentSurfacingRate, 1.0) || 0;

  const rawPenalty = (
    countPenalty * 0.25 +
    severityPenalty * 0.30 +
    compoundPenalty * 0.20 +
    stalePenalty * 0.15 +
    (1.0 - integrationCredit) * 0.10
  );

  return Math.max(0.0, 1.0 - rawPenalty);
}
```

**What this dimension tells auto-mode:** Heavy shadow load signals a "shadow integration day" session theme. Compound patterns suggest that multiple lines need coordinated attention. High stale-shadow age may warrant a dedicated surfacing push.

### 2.5 Dimension 5: Transformation Readiness

**Source:** `SignificatorSnapshot.transformationReadiness` (foundations/16 section 9.1 `transformation_threshold_crossed` event, foundations/17)

Transformation readiness captures proximity to the next stage-transition threshold.

```ts
interface TransformationReadinessInput {
  linesAtEdge: number;                    // lines at (targetStage - 1) altitude
  shadowClearance: boolean;               // all critical shadows resolved
  catalystSaturation: number;             // 0.0-1.0; sufficient processing at current stage
  pendingTransformation: boolean;         // threshold already crossed, in active transformation
  targetStage: Stage | null;              // what stage is being approached
  sessionsSinceLastTransformation: number;
}
```

**Normalisation:**

```ts
function normaliseTransformationReadiness(input: TransformationReadinessInput): number {
  if (input.pendingTransformation) return 1.0;  // actively transforming
  if (!input.targetStage) return 0.0;           // no target (at White, or insufficient data)

  const edgeProgress = Math.min(input.linesAtEdge / 6, 1.0);  // 6 lines = threshold
  const clearanceFactor = input.shadowClearance ? 1.0 : 0.6;
  const saturationFactor = input.catalystSaturation;

  // Post-transformation recovery: reduce readiness signal for 5 sessions after last transition
  const recoveryDamping = input.sessionsSinceLastTransformation < 5
    ? input.sessionsSinceLastTransformation / 5
    : 1.0;

  return edgeProgress * clearanceFactor * saturationFactor * recoveryDamping;
}
```

**What this dimension tells auto-mode:** High transformation readiness signals a "growth edge push" session. The session strategy should intensify edge-encounters and prioritise shadow clearance to prepare for the threshold. Active transformation triggers the special transformation mode (foundations/17, foundations/24 section 6.2).

---

## 3. The composite algorithm

### 3.1 Dimensional weights

The CCI combines its five normalised dimensions using context-sensitive weights. Default weights are:

```ts
interface CCIWeights {
  altitude: number;
  driveHealth: number;
  polarity: number;
  shadowTopology: number;
  transformationReadiness: number;
}

const DEFAULT_CCI_WEIGHTS: CCIWeights = {
  altitude:                0.15,
  driveHealth:             0.25,
  polarity:               0.15,
  shadowTopology:         0.25,
  transformationReadiness: 0.20,
};
```

**Rationale for default weights:**
- Drive health and shadow topology are weighted highest (0.25 each) because they represent the Significator's current wellness -- sessions must respond to distress before pursuing growth
- Transformation readiness is next (0.20) because approaching a threshold demands specific session strategy
- Altitude and polarity are lower (0.15 each) because they change slowly and primarily constrain rather than drive session decisions

### 3.2 Context-sensitive weight adjustment

Weights shift based on the Significator's current state:

```ts
function adjustWeights(
  defaults: CCIWeights,
  inputs: CCIDimensionInputs
): CCIWeights {
  const adjusted = { ...defaults };

  // Near-transformation: boost transformation readiness, reduce altitude
  if (inputs.transformationReadiness.linesAtEdge >= 4) {
    adjusted.transformationReadiness += 0.10;
    adjusted.altitude -= 0.05;
    adjusted.polarity -= 0.05;
  }

  // Heavy shadow load: boost shadow, reduce transformation
  if (inputs.shadowTopology.unresolvedCount > 8 || inputs.shadowTopology.maxSeverity > 0.7) {
    adjusted.shadowTopology += 0.10;
    adjusted.transformationReadiness -= 0.10;
  }

  // Severe drive imbalance: boost drive health
  if (inputs.driveHealth.maxFixationRisk > 0.7) {
    adjusted.driveHealth += 0.10;
    adjusted.polarity -= 0.05;
    adjusted.altitude -= 0.05;
  }

  // Active transformation: override everything
  if (inputs.transformationReadiness.pendingTransformation) {
    return {
      altitude: 0.05,
      driveHealth: 0.10,
      polarity: 0.05,
      shadowTopology: 0.10,
      transformationReadiness: 0.70,
    };
  }

  // Normalise to sum to 1.0
  const total = Object.values(adjusted).reduce((a, b) => a + b, 0);
  return Object.fromEntries(
    Object.entries(adjusted).map(([k, v]) => [k, v / total])
  ) as CCIWeights;
}
```

### 3.3 The composite score

```ts
interface CCIScore {
  composite: number;                      // 0.0-1.0; the single index value
  dimensions: {
    altitude: number;
    driveHealth: number;
    polarity: number;
    shadowTopology: number;
    transformationReadiness: number;
  };
  weights: CCIWeights;                    // the weights used (after adjustment)
  dominantDimension: keyof CCIWeights;    // which dimension contributed most
  sessionSignals: CCISessionSignals;      // derived signals for auto-mode
}

function computeCCI(sig: SignificatorSnapshot): CCIScore {
  // 1. Extract inputs from Significator snapshot
  const inputs = extractDimensionInputs(sig);

  // 2. Normalise each dimension
  const dimensions = {
    altitude: normaliseAltitude(inputs.altitude),
    driveHealth: normaliseDriveHealth(inputs.driveHealth),
    polarity: normalisePolarity(inputs.polarity),
    shadowTopology: normaliseShadowTopology(inputs.shadowTopology),
    transformationReadiness: normaliseTransformationReadiness(inputs.transformationReadiness),
  };

  // 3. Adjust weights based on state
  const weights = adjustWeights(DEFAULT_CCI_WEIGHTS, inputs);

  // 4. Compute weighted composite
  const composite =
    dimensions.altitude * weights.altitude +
    dimensions.driveHealth * weights.driveHealth +
    dimensions.polarity * weights.polarity +
    dimensions.shadowTopology * weights.shadowTopology +
    dimensions.transformationReadiness * weights.transformationReadiness;

  // 5. Identify dominant dimension
  const weightedDimensions = Object.entries(dimensions).map(([k, v]) => ({
    key: k as keyof CCIWeights,
    contribution: v * weights[k as keyof CCIWeights],
  }));
  const dominantDimension = weightedDimensions.sort((a, b) => b.contribution - a.contribution)[0].key;

  // 6. Derive session signals
  const sessionSignals = deriveSessionSignals(dimensions, inputs);

  return { composite, dimensions, weights, dominantDimension, sessionSignals };
}
```

---

## 4. Session signals derived from CCI

The CCI does not merely produce a number. It derives actionable session signals that the auto-mode engine (foundations/27) consumes directly.

### 4.1 Session signal interface

```ts
interface CCISessionSignals {
  recommendedTheme: SessionTheme;
  intensityBudget: number;                // 0.0-1.0; how much intensity the session can sustain
  shadowPressure: ShadowPressureLevel;
  transformationProximity: TransformationProximity;
  driveRebalancingTarget: Drive | null;   // which drive most needs exercise
  polarityGuidance: PolaritySessionGuidance;
}

type SessionTheme =
  | 'consolidation'           // reinforce existing altitude, low intensity
  | 'growth-edge-push'        // target lines at edge, high intensity
  | 'shadow-integration'      // prioritise surfacing and resolving shadows
  | 'drive-rebalancing'       // focus on under-exercised drives
  | 'transformation-prep'     // clear shadows and saturate catalyst for threshold
  | 'active-transformation'   // in transformation window, special mode
  | 'post-transformation'     // gentle re-entry after stage transition
  | 'polarity-deepening'      // intensify polarity exploration or crystallisation
  | 'balanced-development';   // no strong signal, balanced mix

type ShadowPressureLevel = 'low' | 'moderate' | 'high' | 'critical';
type TransformationProximity = 'distant' | 'approaching' | 'imminent' | 'active';

interface PolaritySessionGuidance {
  mode: 'exploration' | 'crystallizing' | 'crystallized';
  recommendedDiversity: number;           // 0-1; how much polarity texture variety to include
  temptationFrequency: number;            // 0-1; how often to include counter-polarity challenges
}
```

### 4.2 Signal derivation logic

```ts
function deriveSessionSignals(
  dimensions: Record<string, number>,
  inputs: CCIDimensionInputs
): CCISessionSignals {
  // Theme selection: based on which dimension is most demanding
  const recommendedTheme = selectSessionTheme(dimensions, inputs);

  // Intensity budget: constrained by drive health and shadow load
  const intensityBudget = computeIntensityBudget(dimensions);

  // Shadow pressure: direct from shadow topology
  const shadowPressure = classifyShadowPressure(inputs.shadowTopology);

  // Transformation proximity
  const transformationProximity = classifyTransformationProximity(inputs.transformationReadiness);

  // Drive rebalancing target
  const driveRebalancingTarget = identifyRebalancingTarget(inputs.driveHealth);

  // Polarity guidance
  const polarityGuidance = derivePolarityGuidance(inputs.polarity);

  return {
    recommendedTheme,
    intensityBudget,
    shadowPressure,
    transformationProximity,
    driveRebalancingTarget,
    polarityGuidance,
  };
}

function selectSessionTheme(
  dimensions: Record<string, number>,
  inputs: CCIDimensionInputs
): SessionTheme {
  // Active transformation overrides all
  if (inputs.transformationReadiness.pendingTransformation) return 'active-transformation';

  // Post-transformation recovery (first 5 sessions after transition)
  if (inputs.transformationReadiness.sessionsSinceLastTransformation < 5) return 'post-transformation';

  // Critical shadow pressure demands attention
  if (inputs.shadowTopology.maxSeverity > 0.8 || inputs.shadowTopology.compoundPatternCount >= 3) {
    return 'shadow-integration';
  }

  // Severe drive fixation demands rebalancing
  if (inputs.driveHealth.maxFixationRisk > 0.7) return 'drive-rebalancing';

  // Imminent transformation: prep mode
  if (inputs.transformationReadiness.linesAtEdge >= 5 && inputs.transformationReadiness.catalystSaturation > 0.7) {
    return 'transformation-prep';
  }

  // High polarity momentum: deepen
  if (inputs.polarity.crystallizationIndex > 0.7 && inputs.polarity.masterMode === 'crystallizing') {
    return 'polarity-deepening';
  }

  // High altitude with low spread: push the growth edge
  if (dimensions.altitude > 0.5 && inputs.altitude.spread < 0.15) {
    return 'growth-edge-push';
  }

  // High altitude with high spread: consolidate
  if (dimensions.altitude > 0.5 && inputs.altitude.spread > 0.25) {
    return 'consolidation';
  }

  return 'balanced-development';
}

function computeIntensityBudget(dimensions: Record<string, number>): number {
  // Intensity is capped by the weakest link (drive health or shadow state)
  const healthFloor = Math.min(dimensions.driveHealth, dimensions.shadowTopology);
  // Base budget from altitude (higher altitude can sustain more intensity)
  const altitudeFactor = 0.4 + (dimensions.altitude * 0.3);
  return Math.min(1.0, healthFloor * 0.6 + altitudeFactor * 0.4);
}

function classifyShadowPressure(input: ShadowTopologyInput): ShadowPressureLevel {
  if (input.maxSeverity > 0.8 || input.compoundPatternCount >= 3) return 'critical';
  if (input.unresolvedCount > 6 || input.maxSeverity > 0.5) return 'high';
  if (input.unresolvedCount > 3 || input.averageSeverity > 0.3) return 'moderate';
  return 'low';
}

function classifyTransformationProximity(input: TransformationReadinessInput): TransformationProximity {
  if (input.pendingTransformation) return 'active';
  if (input.linesAtEdge >= 5 && input.catalystSaturation > 0.7) return 'imminent';
  if (input.linesAtEdge >= 3) return 'approaching';
  return 'distant';
}

function identifyRebalancingTarget(input: DriveHealthInput): Drive | null {
  const drives: Drive[] = ['agency', 'communion', 'eros', 'agape'];
  const mostImbalanced = drives
    .filter(d => Math.abs(input.balance[d]) > 0.4 || input.fixationRisk[d] > 0.5)
    .sort((a, b) => input.fixationRisk[b] - input.fixationRisk[a]);

  if (mostImbalanced.length === 0) return null;

  // Return the COMPLEMENT of the over-expressed drive
  const overExpressed = mostImbalanced[0];
  const complementMap: Record<Drive, Drive> = {
    agency: 'communion', communion: 'agency',
    eros: 'agape', agape: 'eros',
  };
  return complementMap[overExpressed];
}

function derivePolarityGuidance(input: PolarityInput): PolaritySessionGuidance {
  switch (input.masterMode) {
    case 'exploration':
      return {
        mode: 'exploration',
        recommendedDiversity: 0.9,    // maximise texture variety
        temptationFrequency: 0.0,     // no temptation in exploration
      };
    case 'crystallizing':
      return {
        mode: 'crystallizing',
        recommendedDiversity: 0.4,    // moderate variety, focus on direction
        temptationFrequency: 0.15 + (0.35 * input.crystallizationIndex),  // per foundations/19 section 7.3
      };
    case 'crystallized':
      return {
        mode: 'crystallized',
        recommendedDiversity: 0.2,    // low variety, path-aligned depth
        temptationFrequency: 0.1,     // rare but present (maintenance)
      };
  }
}
```

---

## 5. CCI computation lifecycle

### 5.1 When CCI is computed

The CCI is computed at two points:

1. **Session start:** Before the first encounter of each session, the auto-mode engine (foundations/27) computes the CCI from the current Significator snapshot. This produces the session strategy.

2. **Mid-session refresh:** After every 3 encounters within a session, the CCI is recomputed from the updated Significator state. This allows mid-session strategy adjustment (see foundations/27 section on mid-session adaptation).

### 5.2 Pure function contract

The CCI computation is a **pure function**. It takes a `SignificatorSnapshot` and returns a `CCIScore`. It has no side effects, no persistence, and no dependency on external state beyond the snapshot.

```ts
// The complete CCI engine interface
interface CCIEngine {
  compute(sig: SignificatorSnapshot): CCIScore;
}

// Implementation is a single pure function
const cciEngine: CCIEngine = {
  compute: computeCCI,
};
```

### 5.3 Relationship to other engines

```
SignificatorSnapshot
       |
       v
  [CCIEngine.compute]  -- pure function, no side effects
       |
       v
    CCIScore
       |
       v
  [AutoModeStrategy]   -- foundations/27; consumes CCI, produces session plan
       |
       v
  SessionStrategy
       |
       v
  [EncounterScheduler] -- foundations/24; receives biased weights from session strategy
       |
       v
  EncounterSpec[]
```

The CCI sits between the Significator (raw state) and the auto-mode engine (session planning). It does not communicate with the encounter scheduler directly -- that relationship is mediated by auto-mode (foundations/27).

---

## 6. What the CCI adds vs. existing documentation

| Existing doc | What it provides | What CCI adds |
|---|---|---|
| Foundations/16 | The raw Significator data model | Composite scoring across all data |
| Foundations/24 section 3.2 | Per-encounter priority formula (7 criteria) | Session-level aggregate (5 dimensions) |
| Foundations/17 | Binary transformation threshold check | Continuous readiness gradient |
| Foundations/19 section 4 | 4-level polarity structure | Single normalised polarity clarity score |
| Foundations/10 | Shadow theory and detection | Quantified shadow pressure classification |
| Foundations/12 | Per-module drive probes | Global drive health tensor |

The CCI's unique contribution is the **cross-dimensional synthesis** -- identifying which developmental concern should dominate a session's strategy based on the relative urgency of all dimensions simultaneously. No individual engine produces this; each operates within its own domain.

---

## 7. Design decisions

### 7.1 Why a single composite score exists at all

The composite `CCIScore.composite` number (0.0-1.0) is NOT the primary output. The primary output is the `CCISessionSignals` structure. The composite exists for:
- Logging and analytics (tracking developmental trajectory over sessions)
- Threshold-gating in auto-mode (e.g., "if composite < 0.3, force a consolidation session")
- Smooth interpolation for weight biasing (auto-mode can scale scheduler weight adjustments proportionally to CCI)

### 7.2 Why weights are context-sensitive

Static weights would produce degenerate behaviour at state extremes. A player in active transformation with a 0.15 transformation weight would receive insufficiently focused sessions. Context-sensitive weights ensure the CCI responds proportionally to the Significator's most urgent developmental need.

### 7.3 Why shadow and drive health are weighted highest by default

The system's primary commitment is non-harm (foundations/20, Veil principle). A session that pushes the growth edge while ignoring critical shadow accumulation or severe drive fixation risks psychological harm. The default weighting embodies a "safety-first" principle: address distress before pursuing growth.

### 7.4 Implementation path

The CCI engine is implemented as `src/core/engines/CCIEngine.ts` -- a pure function module with no dependencies beyond the Significator type definitions and the normalisation constants defined in this document.

```ts
// src/core/engines/CCIEngine.ts (target structure)
export { computeCCI, type CCIScore, type CCISessionSignals, type CCIWeights };
```

Test criteria:
- Given a Significator with high shadow load, CCI produces `shadowPressure: 'critical'` and `recommendedTheme: 'shadow-integration'`
- Given a Significator near transformation threshold, CCI produces `transformationProximity: 'imminent'`
- Given a balanced, healthy Significator, CCI produces `recommendedTheme: 'balanced-development'`
- Pure function: same input always produces same output
- All dimension scores remain within [0.0, 1.0]
- Weights always sum to 1.0 after adjustment

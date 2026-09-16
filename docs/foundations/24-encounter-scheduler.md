# 24 — Encounter Scheduler & Macro-Catalyst Engine

> **Cross-references:** [[docs/foundations/22-holon-context-engine|22 — Holon Context Engine]]
> **Lateral:** The algorithmic engine that selects, routes, and conditions encounters — the operational bridge between the Significator's state, the world's state, and the encounter content pool.
>
> **Depends on:** 14, 16, 17, 18, 19, 21, 22
> **Referenced by:** 17 (§6 reconfiguration), 19 (§7 polarity-conditioned selection), 21 (§4 scheduler), 22 (§4 pipeline)

> **Heading-contract map (2026-09-16):** Purpose → §1; Scientific basis → §2–§3 (inputs + priority computation, the psychophysics grounding in 08's staircase + 09's flow band); Game-design mapping → §4–§8 (polarity-conditioning, shadow-targeting, transformation windows, session arcs, macro-catalyst engine); Principles served → added below with genuine content.
>
> **Open questions (added 2026-09-16):**
> - What is the scheduler's fallback contract when the strategy engine (27) and the shadow-targeting rule (§5) conflict — which overrides, and is the priority deterministic under tie-break?
> - Should transformation-window scheduling (§6) be allowed to override theta-urgency ordering, or is the current interleaving the settled design?
>
> **Principles served (added 2026-09-16):** principles 3 (adaptive), 5 (multi-dimensional), 7 (codebase honesty) per docs/01-first-principles.md — the scheduler is the point where developmental theory becomes encounter order, and it must stay deterministic, demographic-blind (42), and Veil-compliant (20).

---

## 1. Purpose: the world's intelligence

The encounter scheduler IS the Great Way's intelligence. It is how the world "knows" what catalyst to deliver to the Significator at any given moment. It is not a random queue, not a linear playlist, not a difficulty curve. It is a **purposeful, multi-criteria decision engine** that serves the Significator's evolution while respecting absolute free will.

The scheduler answers five questions simultaneously:

| Question | Output |
|---|---|
| **WHICH** line×stage module? | `module: { line, stage }` |
| **WHICH** modality? | `modality: GameModality` |
| **WHICH** holon sources it? | `holon_source: HolonId` |
| **WHEN** in the session? | `session_position: 'warmup' | 'peak' | 'cooldown'` |
| **HOW** is it conditioned? | `polarity_mode`, `shadow_target`, `difficulty` |

The scheduler operates at the boundary between the greater cycle (Significator/Transformation/Great Way/Choice) and the lesser cycle (Catalyst→Experience→Integration). It translates the Significator's macro-developmental needs into concrete micro-encounters drawn from the 64-module pool.

**Design commitment:** The scheduler SUGGESTS; it never FORCES. Multiple encounter options are always available (minimum 2, typically 3–5). The player's choice of which to engage — and which to avoid — is itself developmental data.

---

## 2. Inputs to the scheduler

The scheduler reads three input domains, cached at session-start and refreshed at each encounter-transition.

### 2.1 Significator state (from foundations/16)

```ts
interface SignificatorSnapshot {
  altitudes: Record<Line, Stage>;
  centreOfGravity: Stage;
  thetaDecay: Record<Line, {
    lastExercisedAt: number;
    decayLevel: number;          // 0.0 (fresh) to 1.0 (critical)
    stage: Stage;                // the stage that is decaying
  }>;
  driveBalance: Record<Drive, number>;          // -1.0 to +1.0
  fixationRisk: Record<Drive, number>;          // 0.0 to 1.0
  shadowLedger: ShadowSignal[];                 // active/unresolved entries
  compoundShadows: CompoundShadow[];            // cross-line patterns
  polarityState: {
    masterMode: 'exploration' | 'crystallizing' | 'crystallized';
    direction: 'STO' | 'STS' | null;
    crystallizationIndex: number;
    perLineProfiles: Record<Line, LinePolarityProfile>;
  };
  transformationReadiness: {
    linesAtEdge: number;
    shadowClearance: boolean;
    catalystSaturation: number;
    pendingTransformation: boolean;
    targetStage: Stage | null;
  };
  recentEncounterHistory: RecentEncounter[];     // last 10 encounters
}

interface RecentEncounter {
  moduleRef: { line: Line; stage: Stage };
  modality: GameModality;
  timestamp: number;
  outcome: 'completed' | 'avoided' | 'abandoned';
}
```

### 2.2 World state (from foundations/18)

```ts
interface WorldSnapshot {
  activeHolons: HolonSummary[];                  // holons with pending catalyst
  currentLayerPerception: Stage;                 // player's dominant perceptual layer
  pestleState: Record<PestleDimension, {
    altitude: Stage;
    tension: number;                             // 0.0–1.0; accumulated pressure
  }>;
  narrativeState: {
    activeBeat: NarrativeBeatRef | null;
    gatedEncounters: string[];                   // encounter IDs requiring prior beats
    completedBeats: string[];
  };
  activeMacroEvents: MacroEvent[];
  factionStates: Record<FactionId, FactionState>;
  npcRelationships: Record<HolonId, RelationshipState>;
}
```

### 2.3 Session context

```ts
interface SessionContext {
  estimatedTimeAvailable: 'short' | 'medium' | 'long';  // <15min, 15-45min, >45min
  inferredEnergy: 'high' | 'moderate' | 'low';
  patienceSignals: {
    avoidanceRate: number;        // 0.0–1.0; proportion of recent offers declined
    abandonmentRate: number;      // 0.0–1.0; proportion of started encounters abandoned
    sessionDurationTrend: 'increasing' | 'stable' | 'decreasing';
  };
  modalityPreferences: Record<GameModality, number>;  // engagement scores 0.0–1.0
  sessionEncounterCount: number;                       // encounters completed this session
  sessionElapsedMs: number;
}
```

---

## 3. The priority computation

The scheduler computes a priority score for each candidate encounter. The algorithm proceeds in three phases: candidate generation, priority scoring, and tie-breaking.

### 3.1 Candidate generation

Before scoring, the scheduler filters the full encounter pool to eligible candidates.

```ts
function generateCandidates(
  sig: SignificatorSnapshot,
  world: WorldSnapshot,
  session: SessionContext
): CandidateEncounter[] {
  return encounterPool
    .filter(e => isLayerPerceptible(e.stage, world.currentLayerPerception))
    .filter(e => !isNarrativeGated(e, world.narrativeState))
    .filter(e => !isOnCooldown(e, sig.recentEncounterHistory))
    .filter(e => isModalityAvailable(e.modality, session))
    .filter(e => meetsAltitudeRequirement(e, sig.altitudes));
}
```

**Filter rules:**

| Filter | Logic |
|---|---|
| **Layer-perception** | `encounter.stage <= world.currentLayerPerception + 1` (current layer + horizon) |
| **Narrative gate** | Encounter not in `world.narrativeState.gatedEncounters` unless prerequisite beats completed |
| **Cooldown** | Same `(line, stage, modality)` tuple not repeated within last 3 encounters; same `(line, stage)` not repeated within last 2 |
| **Modality availability** | Embodied-Somatic requires `session.inferredEnergy != 'low'`; Strategic-Planning requires `session.estimatedTimeAvailable != 'short'` |
| **Altitude requirement** | `encounter.stage <= sig.altitudes[encounter.line] + 1` (cannot exceed demonstrated altitude + 1 golden-horizon) |

### 3.2 The priority formula

Each candidate receives a weighted priority score. The formula is additive with seven criteria:

```ts
function computePriority(
  candidate: CandidateEncounter,
  sig: SignificatorSnapshot,
  world: WorldSnapshot,
  session: SessionContext
): number {
  const W = {
    thetaDecay:          0.25,
    shadowActivation:    0.20,
    polarityAlignment:   0.15,
    transformationReady: 0.15,
    driveCorrection:     0.10,
    narrativeCoherence:  0.10,
    sessionFit:          0.05,
  };

  return (
    W.thetaDecay          * thetaDecayScore(candidate, sig) +
    W.shadowActivation    * shadowActivationScore(candidate, sig) +
    W.polarityAlignment   * polarityAlignmentScore(candidate, sig) +
    W.transformationReady * transformationScore(candidate, sig) +
    W.driveCorrection     * driveBalanceScore(candidate, sig) +
    W.narrativeCoherence  * narrativeScore(candidate, world) +
    W.sessionFit          * sessionFitScore(candidate, session)
  );
}
```

#### 3.2.1 Theta-decay urgency (weight: 0.25)

```ts
function thetaDecayScore(c: CandidateEncounter, sig: SignificatorSnapshot): number {
  const decay = sig.thetaDecay[c.line];
  if (!decay || decay.stage !== c.stage) return 0.0;
  // Exponential urgency: gentle at low decay, steep at high
  return Math.pow(decay.decayLevel, 1.5);
  // 0.0 at fresh, ~0.35 at 0.5 decay, 1.0 at critical
}
```

#### 3.2.2 Shadow-activation signal (weight: 0.20)

```ts
function shadowActivationScore(c: CandidateEncounter, sig: SignificatorSnapshot): number {
  // Check if candidate targets an active unresolved shadow
  const matchingShadows = sig.shadowLedger.filter(s =>
    s.line === c.line &&
    s.stage === c.stage &&
    s.resolutionStatus === 'unresolved'
  );
  if (matchingShadows.length === 0) return 0.0;

  // Compound shadows get extra boost
  const compoundMatch = sig.compoundShadows.some(cs =>
    cs.involvedLines.includes(c.line) && cs.stage === c.stage
  );

  const baseScore = Math.min(matchingShadows.length * 0.4, 1.0);
  return compoundMatch ? Math.min(baseScore + 0.3, 1.0) : baseScore;
}
```

#### 3.2.3 Polarity-mode alignment (weight: 0.15)

```ts
function polarityAlignmentScore(c: CandidateEncounter, sig: SignificatorSnapshot): number {
  const mode = sig.polarityState.masterMode;

  switch (mode) {
    case 'exploration':
      // Reward diversity: encounters with polarity textures NOT recently sampled
      return c.polarityDiversity;  // 0.0–1.0 based on novelty of texture
    case 'crystallizing':
      // Reward challenge: counter-polarity temptations and deepening tests
      return c.crystallizationChallenge;  // 0.0–1.0 based on test-intensity
    case 'crystallized':
      // Reward depth: encounters aligned with chosen path's advanced challenges
      return c.depthAlignment;  // 0.0–1.0 based on path-appropriate depth
  }
}
```

#### 3.2.4 Transformation-readiness (weight: 0.15)

```ts
function transformationScore(c: CandidateEncounter, sig: SignificatorSnapshot): number {
  if (!sig.transformationReadiness.pendingTransformation &&
      sig.transformationReadiness.linesAtEdge < 3) {
    return 0.0;  // not near threshold
  }

  const targetStage = sig.transformationReadiness.targetStage;
  if (!targetStage) return 0.0;

  // Boost encounters that contribute to threshold-crossing
  const isEdgeLine = sig.altitudes[c.line] >= targetStage - 1;
  const isDualShadow = c.shadowTarget !== null &&
    (c.stage === sig.centreOfGravity || c.stage === targetStage);

  let score = 0.0;
  if (isEdgeLine) score += 0.5;
  if (isDualShadow) score += 0.5;
  return Math.min(score, 1.0);
}
```

#### 3.2.5 Drive-balance correction (weight: 0.10)

```ts
function driveBalanceScore(c: CandidateEncounter, sig: SignificatorSnapshot): number {
  // Identify most imbalanced drive
  const drives: Drive[] = ['agency', 'communion', 'eros', 'agape'];
  const maxImbalance = Math.max(...drives.map(d => Math.abs(sig.driveBalance[d])));
  if (maxImbalance < 0.3) return 0.0;  // balanced enough

  // Does this encounter's modality challenge the over-expressed drive?
  const overExpressed = drives.find(d => sig.driveBalance[d] === maxImbalance)!;
  const complementary = getComplementaryDrive(overExpressed);
  const exercisesComplement = c.driveSignals.includes(complementary);

  return exercisesComplement ? maxImbalance : 0.0;
}

function getComplementaryDrive(drive: Drive): Drive {
  switch (drive) {
    case 'agency': return 'communion';
    case 'communion': return 'agency';
    case 'eros': return 'agape';
    case 'agape': return 'eros';
  }
}
```

#### 3.2.6 Narrative coherence (weight: 0.10)

```ts
function narrativeScore(c: CandidateEncounter, world: WorldSnapshot): number {
  if (!world.narrativeState.activeBeat) return 0.0;

  // Does this encounter advance the active narrative beat?
  const beatMatch = c.narrativeContext === world.narrativeState.activeBeat;
  if (beatMatch) return 1.0;

  // Does the sourcing holon have an active relationship with the player?
  const relationship = world.npcRelationships[c.holonSource];
  if (relationship && relationship.strength > 0.5) return 0.4;

  return 0.0;
}
```

#### 3.2.7 Session-fit (weight: 0.05)

```ts
function sessionFitScore(c: CandidateEncounter, session: SessionContext): number {
  let score = 0.0;

  // Duration match
  if (session.estimatedTimeAvailable === 'short' && c.estimatedDurationMs < 300_000) score += 0.4;
  if (session.estimatedTimeAvailable === 'long' && c.estimatedDurationMs > 300_000) score += 0.2;

  // Energy match
  if (session.inferredEnergy === 'low' && c.intensityTarget < 0.4) score += 0.3;
  if (session.inferredEnergy === 'high' && c.intensityTarget > 0.6) score += 0.3;

  // Modality preference
  score += session.modalityPreferences[c.modality] * 0.3;

  return Math.min(score, 1.0);
}
```

### 3.3 Tie-breaking rules

When multiple candidates score within 0.05 of each other, tie-breaking applies in order:

```ts
function breakTie(candidates: ScoredCandidate[], sig: SignificatorSnapshot): ScoredCandidate {
  // 1. Prefer different modality from last 3 encounters
  const recentModalities = sig.recentEncounterHistory.slice(0, 3).map(e => e.modality);
  const novelModality = candidates.filter(c => !recentModalities.includes(c.modality));
  if (novelModality.length > 0) candidates = novelModality;

  // 2. Prefer different line from last 2 encounters
  const recentLines = sig.recentEncounterHistory.slice(0, 2).map(e => e.moduleRef.line);
  const novelLine = candidates.filter(c => !recentLines.includes(c.line));
  if (novelLine.length > 0) candidates = novelLine;

  // 3. Prefer holons with existing player relationships
  const withRelationship = candidates.filter(c =>
    sig.recentEncounterHistory.some(e => e.moduleRef.line === c.line) === false
  );

  // 4. Final: deterministic selection by encounter ID hash (reproducibility)
  return candidates.sort((a, b) => hashCompare(a.id, b.id))[0];
}
```

### 3.4 The non-coercion principle

The scheduler produces a **ranked list** of 3–5 candidates, not a single forced encounter. Implementation:

1. Top candidate becomes the **primary offer** (most prominent in the world — glowing shrine, approaching NPC, etc.)
2. Candidates 2–3 become **secondary offers** (visible but less prominent — distant shrine, NPC in peripheral vision)
3. Candidates 4–5 become **ambient options** (discoverable through exploration)

**Avoidance handling:**
- If the player declines the primary offer, this is recorded as `outcome: 'avoided'`
- Avoidance of the same `(line, stage)` 3+ times triggers a shadow signal write to the Distortion Ledger (foundations/16 §3)
- The avoided encounter re-enters the pool with a `cooldown` of 5 encounters before re-presentation
- When re-presented, it appears through a **different modality** and **different holon** — same catalyst, different surface


---

## 4. Polarity-conditioned selection

The scheduler's behaviour shifts based on the Significator's master polarity mode (foundations/19 §7). This section specifies the concrete selection logic for each mode.

### 4.1 Exploration mode

**Trigger:** `sig.polarityState.masterMode === 'exploration'` (coherent_lines < 3)

**Scheduler behaviour:**
- Polarity textures are drawn from the full catalogue with maximum diversity
- No bias toward STO or STS encounter variants
- Choice-points within encounters present **genuinely ambiguous** options where both orientations are viable
- The `polarityDiversity` score (used in §3.2.3) is computed as:

```ts
function computePolarityDiversity(c: CandidateEncounter, sig: SignificatorSnapshot): number {
  const recentTextures = sig.recentEncounterHistory
    .filter(e => e.outcome === 'completed')
    .map(e => e.polarityTextureId);

  // Novel texture = high score; repeated texture = low score
  if (!recentTextures.includes(c.polarityTextureId)) return 1.0;
  const repetitions = recentTextures.filter(t => t === c.polarityTextureId).length;
  return Math.max(0.0, 1.0 - (repetitions * 0.3));
}
```

**Encounter conditioning:** The `EncounterSpec` emitted carries `polarity_mode: 'exploration'`, signalling the LLM (foundations/22) to present choice-points without moral weighting — both paths must feel equally valid and attractive.

### 4.2 Crystallizing mode

**Trigger:** `sig.polarityState.masterMode === 'crystallizing'` (3 ≤ coherent_lines < 6, altitude_floor ≥ Orange)

**Scheduler behaviour:**
- Counter-polarity temptations increase per the formula from foundations/19 §7.3:

```ts
function temptationFrequency(sig: SignificatorSnapshot): number {
  const strength = sig.polarityState.crystallizationIndex;
  return 0.15 + (0.35 * strength);
  // At 0.6 strength: ~36% encounters contain counter-polarity temptation
  // At 0.9 strength: ~47% encounters contain counter-polarity temptation
}
```

- The `crystallizationChallenge` score rewards encounters that TEST the emerging direction:

```ts
function computeCrystallizationChallenge(
  c: CandidateEncounter,
  sig: SignificatorSnapshot
): number {
  const isCounterPolarity = c.dominantPolarity !== sig.polarityState.direction;
  const isDeepening = c.dominantPolarity === sig.polarityState.direction && c.intensity > 0.7;

  if (isCounterPolarity) return 0.8;  // temptation encounters score high
  if (isDeepening) return 0.6;        // deepening encounters score moderate
  return 0.2;                          // neutral encounters score low
}
```

- Ambiguity decreases — choices become starker, consequences more visible
- The scheduler alternates between temptation encounters and deepening encounters (never more than 2 temptations consecutively)

### 4.3 Crystallized mode

**Trigger:** `sig.polarityState.masterMode === 'crystallized'` (coherent_lines ≥ 6, altitude_floor ≥ Orange)

**Scheduler behaviour:**
- Encounters align with the chosen path's advanced challenges:
  - **STO crystallized:** communion/service challenges, collective shadow integration, sacrifice dilemmas
  - **STS crystallized:** dominion/mastery challenges, sovereignty tests, efficiency under pressure
- Both paths receive their polarity-specific shadow risks:
  - **STO shadow-risk:** martyrdom (communion dark-addiction), spiritual bypassing (eros golden-addiction)
  - **STS shadow-risk:** isolation collapse (agency dark-addiction), paranoid control (communion dark-allergy)

```ts
function computeDepthAlignment(
  c: CandidateEncounter,
  sig: SignificatorSnapshot
): number {
  const direction = sig.polarityState.direction!;
  const pathMatch = c.dominantPolarity === direction;
  const shadowRisk = c.targetsShadowOfPath(direction);

  if (pathMatch && c.intensity > 0.7) return 0.9;   // deep path-aligned
  if (shadowRisk) return 0.8;                         // path-specific shadow work
  if (pathMatch) return 0.5;                          // moderate path-aligned
  return 0.1;                                          // off-path (rare, maintenance only)
}
```

---

## 5. Shadow-targeting logic

The scheduler identifies which shadow to target and selects encounters optimised for surfacing or integrating that shadow.

### 5.1 Active shadow detection

```ts
function detectActiveShadows(sig: SignificatorSnapshot): PrioritisedShadow[] {
  const unresolved = sig.shadowLedger
    .filter(s => s.resolutionStatus === 'unresolved')
    .sort((a, b) => {
      // Priority: older shadows first, higher fixationRisk first
      const ageDiff = a.surfacedAtMs - b.surfacedAtMs;
      const riskDiff = sig.fixationRisk[a.driveSignature.primary]
                     - sig.fixationRisk[b.driveSignature.primary];
      return riskDiff !== 0 ? -riskDiff : ageDiff;
    });

  // Detect compound shadows (cross-line patterns)
  const compounds = sig.compoundShadows.filter(cs =>
    cs.involvedLines.length >= 2 &&
    cs.severity > 0.5
  );

  return [...compounds.map(toShadowPriority), ...unresolved.map(toShadowPriority)];
}
```

### 5.2 Shadow-encounter pairing (affinity matrix)

Each shadow quadrant has preferred modalities for surfacing. The scheduler uses this affinity matrix to select the optimal modality:

| Shadow Quadrant | Primary Modality | Secondary Modality | Rationale |
|---|---|---|---|
| **Dark-Addiction** (submergent fixation) | Deterministic Psychometric | Strategic-Planning | Fixation patterns surface under performance pressure; measurable repetition reveals clinging |
| **Dark-Allergy** (submergent aversion) | Scenario-Choice | Social-Cooperative | Avoidance patterns surface when the avoided capacity is the only path forward |
| **Golden-Addiction** (emergent fixation) | Language-Reflective | Immersive-RPG | Bypassing surfaces in reflective contexts where depth is probed; ecological validator catches performance without substrate |
| **Golden-Allergy** (emergent aversion) | Embodied-Somatic | Scenario-Choice | Resistance to growth surfaces in embodied contexts (the body cannot lie); choice contexts reveal refusal of the call |

```ts
const SHADOW_MODALITY_AFFINITY: Record<ShadowQuadrant, GameModality[]> = {
  'dark-addiction':   ['deterministic_psychometric', 'strategic_planning'],
  'dark-allergy':    ['scenario_choice', 'social_cooperative'],
  'golden-addiction': ['language_reflective', 'immersive_rpg'],
  'golden-allergy':  ['embodied_somatic', 'scenario_choice'],
};
```

When the scheduler targets a specific shadow, it preferentially selects encounters delivered through the shadow's primary affinity modality. If that modality was used in the last 2 encounters, it falls back to the secondary.

### 5.3 Recurrence escalation

If a shadow has been surfaced 3+ times without integration progress:

```ts
function escalateShadow(shadow: ShadowSignal, sig: SignificatorSnapshot): EscalationStrategy {
  const surfaceCount = shadow.encounterIds.length;

  if (surfaceCount < 3) return { strategy: 'normal' };

  if (surfaceCount < 5) {
    return {
      strategy: 'modality-shift',
      // Switch to a modality NOT yet used for this shadow
      preferredModality: getUnusedModality(shadow, sig),
      intensityMultiplier: 1.2,
    };
  }

  if (surfaceCount < 8) {
    return {
      strategy: 'compound-pairing',
      // Pair with another shadow on a related line
      pairedShadow: findRelatedShadow(shadow, sig),
      intensityMultiplier: 1.4,
    };
  }

  // 8+ surfacings: defer and pivot
  return {
    strategy: 'deferral',
    // Reduce priority for 10 encounters; focus on adjacent growth
    cooldownEncounters: 10,
    alternativeFocus: getAdjacentGrowthEdge(shadow, sig),
  };
}
```

**Escalation is never punitive.** Each escalation level is an invitation in a different form. The deferral at 8+ surfacings honours the anti-frustration backstop (foundations/16 §6.3) — the system acknowledges the player is not ready and pivots to alternative growth.

---

## 6. Transformation-window scheduling

When the Significator approaches a Transformation threshold (foundations/17 §2), the scheduler enters a distinct operating mode.

### 6.1 Pre-threshold intensification

**Trigger:** `sig.transformationReadiness.linesAtEdge >= 3 AND !sig.transformationReadiness.pendingTransformation`

```ts
function preThresholdWeightAdjustment(
  baseWeights: PriorityWeights
): PriorityWeights {
  return {
    ...baseWeights,
    thetaDecay: baseWeights.thetaDecay * 0.6,           // reduce maintenance priority
    transformationReady: baseWeights.transformationReady * 2.0,  // double threshold priority
    shadowActivation: baseWeights.shadowActivation * 1.3,        // boost shadow work
  };
}
```

**Behaviour changes:**
- Encounter frequency increases for lines approaching threshold (those at `altitude >= targetStage - 1`)
- Dual-shadow encounters (submergent at current stage + emergent at next stage) get priority boost
- The scheduler begins presenting knot-untying pairs (foundations/17 §5): encounter A surfaces the dark anchor, encounter B (immediately following) invites the golden capacity
- Modality rotation relaxes slightly — the scheduler may repeat a modality if it serves the threshold

### 6.2 The threshold window (active Transformation)

**Trigger:** `sig.transformationReadiness.pendingTransformation === true`

Normal scheduling **pauses**. The scheduler enters Transformation mode:

```ts
function transformationModeSchedule(sig: SignificatorSnapshot): EncounterSpec[] {
  const phase = detectTransformationPhase(sig);

  switch (phase) {
    case 'unravelling':
      // Present encounters incoherent within current stage's logic
      return generateUnravellingEncounters(sig);
    case 'crucible':
      // Present knot-untying pairs that demand next-stage capacity
      return generateCrucibleEncounters(sig);
    case 'emergence':
      // Present encounters at new altitude with gentle scaffolding
      return generateEmergenceEncounters(sig);
  }
}
```

- **Unravelling phase (1–3 sessions):** Encounters from the current stage that subtly fail — strategies that worked before produce unexpected results. The scheduler draws from the same modules but conditions them with `contradiction_mode: true`.
- **Crucible phase (2–5 sessions):** Knot-untying encounters exclusively. Each session presents 1–2 knot-pairs. Normal encounter offers are suppressed.
- **Emergence phase (1–2 sessions):** New-altitude encounters at low intensity. The scheduler draws from the next stage's modules with `intensityTarget: 0.3` (scaffolded, gentle).

### 6.3 Post-threshold rebalancing

**Trigger:** `transformation_completed` event fires (foundations/16 §9.1)

The scheduler executes the Great Way Reconfiguration (foundations/17 §6):

```ts
function postTransformationRebalance(
  sig: SignificatorSnapshot,
  newStage: Stage
): PriorityWeights {
  return {
    thetaDecay: 0.15,            // reduced — everything is fresh
    shadowActivation: 0.15,      // reduced — shadows cleared at threshold
    polarityAlignment: 0.20,     // increased — polarity deepens at new altitude
    transformationReady: 0.05,   // minimal — just crossed, far from next
    driveCorrection: 0.15,       // increased — drives rebalance at new altitude
    narrativeCoherence: 0.20,    // increased — new narrative arc opening
    sessionFit: 0.10,            // increased — gentle re-entry
  };
}
```

**Weight ramp-up:** These adjusted weights persist for `rampUpSessions = 5` sessions, then linearly interpolate back to default weights over the next 5 sessions. This ensures the post-Transformation experience is gentle and exploratory before returning to full developmental pressure.

**Encounter eligibility shift:**
- New altitude modules → primary weight (growth edge)
- Previous altitude modules → theta-decay-only (maintenance)
- One-above-new altitude → low exploratory weight (golden-horizon impressions)


---

## 7. Session-level scheduling

The scheduler sequences encounters within a single play session according to a natural energy arc.

### 7.1 Session arc

Each session follows a three-phase arc calibrated to the player's available time:

```ts
interface SessionArc {
  warmup: { proportion: number; maxEncounters: number };
  peak:   { proportion: number; maxEncounters: number };
  cooldown: { proportion: number; maxEncounters: number };
}

function computeSessionArc(session: SessionContext): SessionArc {
  switch (session.estimatedTimeAvailable) {
    case 'short':   // <15 min
      return { warmup: { proportion: 0.3, maxEncounters: 1 },
               peak:   { proportion: 0.5, maxEncounters: 1 },
               cooldown: { proportion: 0.2, maxEncounters: 1 } };
    case 'medium':  // 15-45 min
      return { warmup: { proportion: 0.25, maxEncounters: 2 },
               peak:   { proportion: 0.50, maxEncounters: 3 },
               cooldown: { proportion: 0.25, maxEncounters: 2 } };
    case 'long':    // >45 min
      return { warmup: { proportion: 0.20, maxEncounters: 3 },
               peak:   { proportion: 0.55, maxEncounters: 5 },
               cooldown: { proportion: 0.25, maxEncounters: 3 } };
  }
}
```

**Phase characteristics:**

| Phase | Intensity | Modality preference | Purpose |
|---|---|---|---|
| **Warmup** | `intensityTarget < 0.4` | Familiar modalities (high `modalityPreferences` score) | Re-engage; rebuild context; arrest theta-decay on neglected lines |
| **Peak** | `intensityTarget 0.6–1.0` | Highest-priority candidates regardless of familiarity | Deliver primary catalyst; shadow work; transformation encounters |
| **Cooldown** | `intensityTarget < 0.3` | Language-Reflective, Immersive-RPG | Integration; reflection; narrative closure for the session |

**Phase detection:** The scheduler tracks `session.sessionEncounterCount` and `session.sessionElapsedMs` against the arc proportions to determine current phase. The `session_position` field in the emitted `EncounterSpec` reflects this.

### 7.2 Modality rotation

Hard constraints on modality sequencing:

```ts
function isModalitySequenceValid(
  candidate: CandidateEncounter,
  recentHistory: RecentEncounter[]
): boolean {
  const lastTwo = recentHistory.slice(0, 2).map(e => e.modality);

  // Rule 1: No more than 2 consecutive same-modality encounters
  if (lastTwo[0] === candidate.modality && lastTwo[1] === candidate.modality) {
    return false;
  }

  // Rule 2: Deterministic tasks interspersed with narrative/reflective
  const lastThree = recentHistory.slice(0, 3).map(e => e.modality);
  const deterministicCount = lastThree.filter(m =>
    m === 'deterministic_psychometric' || m === 'strategic_planning'
  ).length;
  const isCognitive = candidate.modality === 'deterministic_psychometric' ||
                      candidate.modality === 'strategic_planning';
  if (deterministicCount >= 2 && isCognitive) return false;

  // Rule 3: Embodied-Somatic requires energy
  // (already filtered in candidate generation, but double-check)

  return true;
}
```

### 7.3 Energy management

The scheduler dynamically adjusts based on real-time energy signals:

```ts
function adjustForEnergy(
  candidates: ScoredCandidate[],
  session: SessionContext
): ScoredCandidate[] {
  if (session.inferredEnergy === 'low') {
    // Cap intensity; prefer shorter encounters
    return candidates.map(c => ({
      ...c,
      score: c.intensityTarget > 0.5 ? c.score * 0.5 : c.score,
    }));
  }

  if (session.inferredEnergy === 'high' && session.patienceSignals.avoidanceRate < 0.2) {
    // Extend peak phase: allow higher-intensity encounters longer
    return candidates.map(c => ({
      ...c,
      score: c.intensityTarget > 0.7 ? c.score * 1.2 : c.score,
    }));
  }

  return candidates;
}
```

**Energy inference signals:**
- Response time trending upward → energy decreasing
- Avoidance rate increasing within session → energy decreasing
- Session duration shorter than player's average → energy was low at start
- High accuracy + fast responses → energy high

### 7.4 The infinite checkpoint

The scheduler maintains no assumption about session continuity:

- State is saved after every encounter resolution (step 7 of encounter lifecycle, foundations/21 §3.4)
- The priority queue is recomputed fresh at each encounter-transition — it is never "pre-planned" beyond the current selection
- If the player exits mid-session, the next session begins with a fresh priority computation from the updated `SignificatorSnapshot`
- No encounter is "lost" due to session exit — if a high-priority encounter was not reached, it remains high-priority at next session start
- The session arc phase resets at session start (always begins with warmup)

---

## 8. The macro-catalyst engine

The scheduler generates world-level macro-events when individual encounter consequences accumulate past thresholds.

### 8.1 Macro-event triggers

```ts
interface MacroEventTrigger {
  pestleDimension: PestleDimension;
  tensionThreshold: number;          // 0.0–1.0; fires when exceeded
  requiredConsequenceCount: number;  // minimum consequences accumulated
  altitudeAlignment: Stage;          // macro-event matches this altitude
}

function checkMacroEventTriggers(world: WorldSnapshot): MacroEvent | null {
  for (const dimension of PESTLE_DIMENSIONS) {
    const state = world.pestleState[dimension];

    if (state.tension >= MACRO_EVENT_TENSION_THRESHOLD  // default: 0.75
        && getConsequenceCount(dimension) >= MACRO_EVENT_MIN_CONSEQUENCES  // default: 15
    ) {
      return generateMacroEvent(dimension, state);
    }
  }
  return null;
}

const MACRO_EVENT_TENSION_THRESHOLD = 0.75;
const MACRO_EVENT_MIN_CONSEQUENCES = 15;
```

**Tension accumulation:** Each `ConsequenceRecord` (foundations/22 §7.1) with a non-null `pestleShift` increments the relevant dimension's tension by `pestleShift.delta`. Tension decays at 0.01 per encounter-transition (slow natural dissipation).

### 8.2 Macro-event types

| PESTLE Dimension | Macro-Event Examples | Encounter Effects |
|---|---|---|
| **Political** | Revolution, coup, liberation, federation | Faction encounters reshuffled; new power structures create new moral dilemmas |
| **Economic** | Famine, boom, trade collapse, commons tragedy | Resource-scarcity encounters; willpower/strategic challenges intensify |
| **Social** | Cultural renaissance, persecution, migration | Interpersonal encounters shift; belonging/exclusion dynamics change |
| **Technological** | Invention, paradigm shift, catastrophic failure | Cognitive encounters gain new tools/constraints; strategic planning recontextualised |
| **Legal** | Reform, tyranny, rights revolution | Moral encounters gain new frameworks; scenario-choice options expand/contract |
| **Environmental** | Drought, flood, ecological collapse, discovery | Somatic encounters intensify; survival-layer bleeds through; new territories open |

**Effect on scheduling:** When a macro-event fires:
1. New encounters become eligible (event-specific content)
2. Some existing encounters become temporarily unavailable (world disruption)
3. The narrative state advances (new beat activated)
4. Affected holons update their states (faction shifts, NPC reactions)

### 8.3 Macro-event scheduling

Macro-events are rare and narratively significant:

```ts
const MACRO_EVENT_CONSTRAINTS = {
  minimumPlayHoursBetween: 10,       // ~10 hours between macro-events
  maximumActiveSimultaneous: 2,       // no more than 2 active at once
  altitudeAlignment: true,            // event altitude must match player's ±1
};

function shouldFireMacroEvent(
  trigger: MacroEventTrigger,
  sig: SignificatorSnapshot,
  world: WorldSnapshot
): boolean {
  // Time constraint
  const lastMacroEvent = world.activeMacroEvents
    .sort((a, b) => b.firedAt - a.firedAt)[0];
  if (lastMacroEvent && hoursSince(lastMacroEvent.firedAt) < MACRO_EVENT_CONSTRAINTS.minimumPlayHoursBetween) {
    return false;
  }

  // Simultaneous constraint
  if (world.activeMacroEvents.length >= MACRO_EVENT_CONSTRAINTS.maximumActiveSimultaneous) {
    return false;
  }

  // Altitude alignment
  const altitudeDiff = Math.abs(stageToNumber(trigger.altitudeAlignment) - stageToNumber(sig.centreOfGravity));
  if (altitudeDiff > 1) return false;

  // Polarity + shadow alignment: macro-event template must resonate with player state
  return macroEventResonates(trigger, sig);
}
```

**Macro-event lifecycle:**
1. **Trigger:** Tension threshold crossed + constraints satisfied
2. **Onset (1–2 sessions):** World signals the coming event (NPC rumours, environmental omens)
3. **Active (3–8 sessions):** Event is live; encounter pool modified; narrative arc active
4. **Resolution:** Player's choices during the event determine outcome; PESTLE dimension resets tension to 0; world state permanently altered

---

## 9. The scheduler's relationship to the LLM

The scheduler outputs an `EncounterSpec` — a complete specification that the Holon Context Engine (foundations/22) receives and translates into playable content.

### 9.1 The EncounterSpec interface

```ts
interface EncounterSpec {
  // What to present
  module: { line: Line; stage: Stage };
  modality: GameModality;
  holonSource: HolonId;

  // How to condition it
  shadowTarget: ShadowQuadrant | null;
  polarityMode: 'exploration' | 'crystallizing' | 'crystallized';
  polarityTexture: TextureId;           // from foundations/23 catalogue
  difficulty: DifficultyParams;
  narrativeContext: NarrativeBeatRef | null;

  // Consequence weighting
  consequenceSensitivity: ConsequenceWeight;

  // Session positioning
  sessionPosition: 'warmup' | 'peak' | 'cooldown';

  // Metadata for the LLM pipeline
  catalyticPurpose: CatalyticPurpose;
  escalationLevel: number;              // 0 = normal, 1–3 = shadow escalation
  transformationPhase: TransformationPhase | null;
}

interface DifficultyParams {
  baseLevel: number;                    // 0.0–1.0; from task staircase
  intensityTarget: number;              // 0.0–1.0; from session arc
  adaptiveRange: { min: number; max: number };  // staircase bounds
}

interface ConsequenceWeight {
  localWeight: number;                  // 0.0–1.0; immediate encounter effects
  holonicWeight: number;                // 0.0–1.0; NPC/faction state changes
  polarityWeight: number;               // 0.0–1.0; polarity trace significance
  pestleWeight: number;                 // 0.0–1.0; world-state contribution
}

type CatalyticPurpose =
  | 'capacity-development'              // grow the line×stage ability
  | 'shadow-surfacing'                  // surface unresolved shadow
  | 'shadow-integration'                // provide integration opportunity
  | 'drive-rebalancing'                 // correct drive imbalance
  | 'threshold-preparation'             // contribute to transformation readiness
  | 'knot-untying'                      // dual-shadow pair for transformation
  | 'maintenance'                       // arrest theta-decay
  | 'polarity-deepening'                // deepen crystallized orientation
  | 'polarity-testing';                 // temptation/challenge for crystallizing

type TransformationPhase = 'unravelling' | 'crucible' | 'emergence' | null;
```

### 9.2 The handoff contract

The scheduler produces the `EncounterSpec`. The LLM pipeline (foundations/22 §4) consumes it. The boundary is strict:

| Scheduler decides | LLM decides |
|---|---|
| Which module (line×stage) | Moment-to-moment dialogue and description |
| Which modality | Specific prompt wording, scenario details |
| Which holon sources it | NPC voice, personality expression |
| Shadow target | How the shadow manifests narratively |
| Polarity mode | How choice-points are framed |
| Difficulty parameters | Specific item selection within difficulty band |
| Session position | Pacing and tone within the encounter |
| Catalytic purpose | Surface-level narrative justification |

The scheduler never generates player-facing content. The LLM never overrides the scheduler's structural decisions.


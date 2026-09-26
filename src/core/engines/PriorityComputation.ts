/**
 * PriorityComputation — the encounter priority formula.
 *
 * Canon: `docs/foundations/24` §3.2 (eight criteria), §3.2.8 (mastery alignment),
 * §3.2.9 (**the formula is closed**) and `MY-AD-0025`.
 *
 * ```
 * priority = Σ  W[c] · score(c, candidate, state)      c ∈ the eight criteria
 *            with W renormalised to sum to exactly 1.00
 * ```
 *
 * THE CLOSURE RULE (§3.2.9). The eight criteria are the **only additive terms**. Any
 * further consideration — relevance to the player's dimensionality (`45 §5.3`), user-Matrix
 * targeting (`15 §230`, `28`), a theme's emphasis, exploration — enters as a **multiplicative
 * bias on those eight weights**, renormalised back to 1.00 before scoring. It is never a ninth
 * weight and never an additive bonus.
 *
 * Why this is a contract and not a style preference: an additive term outside the eight is
 * *unnormalised*. It is not comparable to a criterion on the 0–1 scale, `27` cannot
 * parameterise it, and it can silently reorder the criteria. Bias is multiplicative and
 * order-preserving; a bonus is neither. A scheduler whose behaviour cannot be predicted from
 * its published weights is not auditable, and the player's catalyst sequence stops being
 * explainable from the documented state.
 *
 * WHAT WAS HERE BEFORE (reconciled 2026-09-20; `pending → SCHEDULER-FORMULA`). The previous
 * implementation carried `userMatrixTargeting: 0.12` as an eighth additive **weight** (canon's
 * eighth is `masteryAlignment`, which had no implementation at all) **plus six further
 * unweighted additive terms** after the weighted sum — `noveltyBonus` ≤ 0.25, `weaknessBonus`
 * ≤ 0.15, `diversityBonus` ± 0.10, `bleedBoost` ≤ 0.15, `rayBoost` ≤ 0.05, `tieBreaker` ≤ 0.02.
 * Against a base bounded by 1.00 that envelope is up to **+0.72**, so the bonuses governed
 * selection and the ratified weights largely did not. Each one's disposition is recorded in
 * `FORMER_TERM_DISPOSITION` below, and `G26` now holds the closure.
 */
import type { Drive } from '../domain/Drive.js';
import type { Significator } from '../domain/Significator.js';
import { ALL_STAGES, stageOrdinal } from '../domain/Stage.js';
import { ALL_LINES } from '../domain/Line.js';
import { STAGE_RAY_MAP } from '../domain/Ray.js';
import { ALL_DEPTH_LEVELS, depthOrdinal, type DepthLevel } from '../curriculum/types.js';
import type { EncounterCandidate, WorldState } from './CandidateGeneration.js';
import { computeCellStaleness, DEFAULT_THETA_PARAMS } from './ThetaDecay.js';
import { computeUserMatrixPriority, type UserMatrixModel } from './UserMatrixModel.js';

export interface SessionContext {
  readonly encountersSoFar: number;
  /**
   * Elapsed session time, in ms. Optional because a session may be scored before any duration is
   * recorded — and an omitted value must behave as "short", never as "long". See
   * `computeSessionFit`: `undefined < 900_000` is FALSE, so an absent field silently selected the
   * long-session branch, the opposite of what "no duration recorded yet" means.
   */
  readonly sessionDurationMs?: number;
  readonly targetSessionLength: number; // encounters
  readonly recentLines: readonly string[];
  readonly estimatedTimeAvailable?: number; // ms
  readonly inferredEnergy?: 'high' | 'low' | 'moderate';
  readonly patienceSignals?: {
    readonly avoidanceRate: number;
    readonly responseLatencyTrend: 'decreasing' | 'increasing' | 'stable';
    readonly earlyExits: number;
  };
  readonly forceLine?: string;
  readonly forceStage?: string;
  readonly forceModality?: string;
  /**
   * Phase 16 d8 — the caller DELIBERATELY pinned an instrument cell (`--target-cell` on a focused
   * campaign). Optional and absent by default, and that default is the whole point: it separates
   * "both force fields happen to be set" from "this session exists to measure one cell". Only the
   * deliberate pin suppresses the injection seams, so a player who picks a line AND a stage in the
   * settings page keeps the crucible, Holonic Return, curriculum interleave and training beats.
   * The rule has one owner — `isDeliberateInstrumentPin` in this file; do not re-derive it.
   */
  readonly focusedCell?: true;
  readonly transformationState?: { phase: string }; // G.20: transformation phase for crucible detection
}

/**
 * Is this session a fully pinned cell — a DIAGNOSTIC INSTRUMENT rather than play?
 *
 * One owner for the rule, because three call sites had each grown their own copy and the copies
 * disagreed on the VALUE they tested: the kernel tested `forceLine !== undefined && forceStage !==
 * undefined` while the WebUI binding tested `control.forceLine !== null && control.forceStage !==
 * null`. Those agree only while the binding maps `null → undefined` on the way in; a caller passing
 * any other falsy-but-defined value diverges silently, and nothing would fail. `SessionContext` is
 * the right home because the predicate reads nothing else.
 *
 * BOTH axes, never one — a `forceLine` on its own is ordinary play (the CLI sets the two
 * independently), and silently disabling a session's transformation, curriculum and training
 * behaviour because a player picked a line would be a change nobody asked for. `forceModality` is
 * excluded on purpose: a modality pin does not pin a cell.
 *
 * What the caller OWES the player when this returns true: the four injection seams
 * (`GameLoop`'s threshold replacement, curriculum interleave and training weave, and the
 * scheduler's Holonic Return) are suppressed, because an instrument measuring one cell must not
 * have a different cell substituted into it. That is only a fair trade for a caller that deliberately
 * pinned a cell to measure it — a player picking a line and a stage in settings has not asked for a
 * diagnostic, and the settings surface must not reach here on its own. See
 * `isDeliberateInstrumentPin` for the opt-in that keeps the two apart.
 */
export function isPinnedInstrumentCell(session: Pick<SessionContext, 'forceLine' | 'forceStage'>): boolean {
  return session.forceLine !== undefined && session.forceStage !== undefined;
}

/**
 * Did a caller DELIBERATELY pin an instrument cell, as opposed to setting both axes incidentally?
 *
 * The distinction exists because `isPinnedInstrumentCell` is not safe to honour from a settings UI.
 * A player choosing a line and a stage in the settings page is expressing a preference, not mounting
 * an instrument, and suppressing the crucible, Holonic Return, curriculum interleave and training
 * beats for them is a silent behavioural change with no visible cause. The focused campaign
 * (`--target-cell`) is the deliberate caller and sets this flag; the settings page must not.
 *
 * So the rule is: the seams stay suppressed when the cell is pinned AND the pin was an opt-in.
 * A caller that wants instrument semantics states them instead of relying on a coincidence.
 */
export function isDeliberateInstrumentPin(
  session: Pick<SessionContext, 'forceLine' | 'forceStage' | 'focusedCell'>,
): boolean {
  return session.focusedCell === true && isPinnedInstrumentCell(session);
}

// ---------------------------------------------------------------------------
// The eight criteria (§3.2) and the closed weight vector
// ---------------------------------------------------------------------------

/** The eight additive criteria. Nothing else may be added (`G26`). */
export type PriorityCriterion =
  | 'thetaUrgency'
  | 'shadowActivation'
  | 'polarityAlignment'
  | 'transformationReadiness'
  | 'driveCorrection'
  | 'narrativeCoherence'
  | 'sessionFit'
  | 'masteryAlignment';

export const ALL_CRITERIA: readonly PriorityCriterion[] = [
  'thetaUrgency',
  'shadowActivation',
  'polarityAlignment',
  'transformationReadiness',
  'driveCorrection',
  'narrativeCoherence',
  'sessionFit',
  'masteryAlignment',
];

export type PriorityWeights = Readonly<Record<PriorityCriterion, number>>;

/**
 * The renormalised canon weights (§3.2.8): mastery alignment took 0.10 proportionally —
 * theta-decay 0.25→0.21, shadow-activation 0.20→0.19, polarity-mode 0.15→0.14,
 * transformation-readiness 0.15→0.14, drive-balance 0.10→0.09, narrative-coherence 0.10→0.09,
 * session-fit 0.05→0.04, mastery-alignment 0.10. Sums to exactly 1.00, so the maximum
 * achievable priority is exactly 1.00 and no candidate can outrank a perfect one by accident.
 */
export const DEFAULT_WEIGHTS: PriorityWeights = {
  thetaUrgency: 0.21,
  shadowActivation: 0.19,
  polarityAlignment: 0.14,
  transformationReadiness: 0.14,
  driveCorrection: 0.09,
  narrativeCoherence: 0.09,
  sessionFit: 0.04,
  masteryAlignment: 0.1,
};

/** Per-criterion multipliers. `1.0` = unchanged; `0.0` = that criterion is silenced. */
export type PriorityBias = Readonly<Partial<Record<PriorityCriterion, number>>>;

/** Sum of a weight vector. `G26` asserts `DEFAULT_WEIGHTS` sums to exactly 1.00. */
export function weightSum(w: PriorityWeights): number {
  return ALL_CRITERIA.reduce((a, c) => a + (w[c] ?? 0), 0);
}

/**
 * Multiply weights by a bias and renormalise back to 1.00 — the ONLY sanctioned way a
 * consideration outside the eight criteria may influence the score (`27`'s parameterisation).
 * A zero total (every criterion silenced) falls back to the defaults rather than producing NaN.
 */
export function applyWeightBias(defaults: PriorityWeights, bias: PriorityBias): PriorityWeights {
  const biased = rawBiasProduct(defaults, bias);
  const total = weightSum(biased);
  if (total <= 0) return { ...DEFAULT_WEIGHTS };
  return Object.fromEntries(
    ALL_CRITERIA.map((c) => [c, (biased[c] ?? 0) / total]),
  ) as PriorityWeights;
}

/** Products before renormalisation — exposed for `G26`'s closure check. */
export function rawBiasProduct(
  defaults: PriorityWeights,
  bias: PriorityBias,
): PriorityWeights {
  return Object.fromEntries(
    ALL_CRITERIA.map((c) => [c, (defaults[c] ?? 0) * (bias[c] ?? 1)]),
  ) as PriorityWeights;
}

// ---------------------------------------------------------------------------
// The formula
// ---------------------------------------------------------------------------

export interface PriorityInputs {
  readonly candidate: EncounterCandidate;
  readonly sig: Significator;
  readonly world: WorldState;
  readonly session: SessionContext;
  readonly now: number;
  /** Seed weights. Defaults to `DEFAULT_WEIGHTS`. */
  readonly weights?: PriorityWeights;
  /** Multiplicative bias folded into the weights before scoring (`27`, §3.2.9). */
  readonly bias?: PriorityBias;
  /** Stale cells flagged by bleed-through — an EXPLORATION emphasis (§3.2.9), not a bonus. */
  readonly bleedThrough?: readonly string[];
  /** user-Matrix / Potentiator targeting — a "where to look" input (`15 §230`, `28`). */
  readonly userMatrixModel?: UserMatrixModel;
}

/**
 * The score. Sums the eight criteria under weights renormalised to 1.00, so the result is
 * bounded by 1.00 **by construction** — which is what makes `G26`'s "no additive term outside
 * the eight" checkable as a behavioural property rather than a source-code opinion.
 */
export function computePriority(inputs: PriorityInputs): number {
  const { candidate: c, sig, world, session, now } = inputs;
  const weights = inputs.weights ?? DEFAULT_WEIGHTS;
  const effective = applyWeightBias(weights, computeContextBias(inputs));

  return (
    effective.thetaUrgency * thetaDecayScore(c, sig, now) +
    effective.shadowActivation * shadowActivationScore(c, sig) +
    effective.polarityAlignment * polarityAlignmentScore(c, sig) +
    effective.transformationReadiness * transformationScore(c, sig) +
    effective.driveCorrection * driveBalanceScore(c, sig, world) +
    effective.narrativeCoherence * narrativeScore(c, world) +
    effective.sessionFit * sessionFitScore(c, session) +
    effective.masteryAlignment * masteryAlignmentScore(c, sig)
  );
}

/**
 * The eight criterion scores, addressable by criterion name. Exported because the closure
 * (`§3.2.9`) must be PROVABLE, not asserted: `G26` recomputes
 *
 * ```
 * Σ_c effectiveWeight[c] · CRITERION_SCORES[c](inputs)   ===   computePriority(inputs)
 * ```
 *
 * over a probe grid. Any additive term outside the eight breaks that identity with a discrepancy
 * equal to the term — so a future "bonus" cannot hide behind a weight literal that still reads
 * correct, which is exactly how the old envelope (up to +0.72) went unnoticed.
 */
export const CRITERION_SCORES: Readonly<Record<PriorityCriterion, (i: PriorityInputs) => number>> = {
  thetaUrgency: (i) => thetaDecayScore(i.candidate, i.sig, i.now),
  shadowActivation: (i) => shadowActivationScore(i.candidate, i.sig),
  polarityAlignment: (i) => polarityAlignmentScore(i.candidate, i.sig),
  transformationReadiness: (i) => transformationScore(i.candidate, i.sig),
  driveCorrection: (i) => driveBalanceScore(i.candidate, i.sig, i.world),
  narrativeCoherence: (i) => narrativeScore(i.candidate, i.world),
  sessionFit: (i) => sessionFitScore(i.candidate, i.session),
  masteryAlignment: (i) => masteryAlignmentScore(i.candidate, i.sig),
};

/** The effective (biased, renormalised) weights a call will score with — the audit surface. */
export function effectiveWeights(inputs: PriorityInputs): PriorityWeights {
  return applyWeightBias(inputs.weights ?? DEFAULT_WEIGHTS, computeContextBias(inputs));
}

// ---------------------------------------------------------------------------
// The bias layer (§3.2.9) — every former bonus's landing place
// ---------------------------------------------------------------------------

/**
 * What happened to each additive term the old implementation carried. Kept as data so the
 * reconciliation is reviewable and `G26` can assert that nothing has crept back.
 */
export const FORMER_TERM_DISPOSITION: Readonly<Record<string, string>> = {
  noveltyBonus:
    'DELETED. A never-visited cell scores 0.0 on theta-urgency by canon (§3.2.1), so a bias on ' +
    'that criterion would be inert. Canon deliberately does not reward novelty as an additive ' +
    'term; exploration of cells that are DUE is theta-urgency itself.',
  bleedBoost: 'BIAS on thetaUrgency — an exploration emphasis (§3.2.9 names "an exploration bonus").',
  weaknessBonus: 'BIAS on transformationReadiness — the line floor is what gates a transition (§3.2.4).',
  rayBoost: 'BIAS on polarityAlignment — the ray/polarity axis is §3.2.3\'s own axis.',
  diversityBonus: 'MOVED to §3.3 tie-breaking, which already owns "prefer a different modality/line".',
  tieBreaker: 'MOVED to the scheduler\'s comparator as its deterministic final key (never a score).',
  userMatrixTargeting:
    'BIAS on masteryAlignment — both answer "which of the user\'s material to probe next"; the ' +
    'magnitude is a function of ProfilePhase (§3.2.9, `28`). It was previously a ninth weight.',
};

/**
 * Derive the multiplicative bias from the context. Every multiplier is 1.0 unless its
 * condition holds, so an unqualified call is bias-free and equals the plain canon formula.
 *
 * Magnitudes are set to the WEIGHT-RELATIVE equivalent of the additive term each replaces:
 * a former `+0.15` against a weight of `0.21` is roughly a `×1.7`, and so on. They are
 * deliberately conservative — a bias multiplies, so it cannot reorder candidates whose
 * criterion scores already differ materially.
 */
export function computeContextBias(inputs: PriorityInputs): PriorityBias {
  const { candidate: c, sig, bleedThrough, userMatrixModel } = inputs;
  const bias: Record<PriorityCriterion, number> = {
    thetaUrgency: 1,
    shadowActivation: 1,
    polarityAlignment: 1,
    transformationReadiness: 1,
    driveCorrection: 1,
    narrativeCoherence: 1,
    sessionFit: 1,
    masteryAlignment: 1,
  };

  // Former `bleedBoost` (+0.15 on a 0.21 weight ≈ ×1.7): exploration emphasis on stale cells.
  if (bleedThrough?.includes(`${c.line}:${c.stage}`)) bias.thetaUrgency *= 1.7;

  // Former `weaknessBonus` (+0.15 on a 0.14 weight ≈ ×2.0): the lowest line is the floor that
  // gates the whole holon's advance, so a candidate on it is more transition-relevant.
  const allAlts = Object.values(sig.altitudes).map(stageOrdinal);
  const meanAlt = allAlts.reduce((a, b) => a + b, 0) / allAlts.length;
  if (stageOrdinal(sig.altitudes[c.line] ?? 'Red') < meanAlt) bias.transformationReadiness *= 2;

  // Former `rayBoost` (+0.05 on a 0.14 weight ≈ ×1.35): developmental momentum along the ray
  // the player is currently activating.
  const encounterRay = STAGE_RAY_MAP[c.stage] ?? 'Yellow';
  if ((sig.rayProfile[encounterRay] ?? 0) > 0.5) bias.polarityAlignment *= 1.35;

  // user-Matrix / Potentiator targeting (`28`): `unmapped` raises diversity, `crystallized`
  // narrows onto the user's own mapped pattern. A "where to look" input, never a criterion.
  if (userMatrixModel) {
    const v = computeUserMatrixPriority(userMatrixModel, c.line, c.stage);
    bias.masteryAlignment *= 1 + 1.2 * v;
  }

  return bias;
}

// ---------------------------------------------------------------------------
// §3.2.1–§3.2.8 — the eight criterion scores (each in [0, 1])
// ---------------------------------------------------------------------------

/**
 * §3.2.1 — `Math.pow(decayLevel, 1.5)`. Only scores > 0 if candidate's line AND stage match
 * the decaying cell.
 *
 * **A never-visited cell scores 0.0, not 1.0** (canon returns 0.0 when there is no decay
 * record for the cell; the old implementation returned `1` for "never visited = max urgency").
 * The distinction matters: a cell with no θ record is not *due*, it is simply absent from the
 * player's developmental set, and canon does not schedule it as urgent. `MY-RG-0023`'s sibling
 * case in spirit — a substituted term that governs selection while reading as a detail.
 *
 * T-0.12 (HS-03 fix): per-line theta half-life when configured — different Complexes
 * (Mind/Body/Spirit) decay at different rates (Body fastest, Spirit slowest).
 */
export function thetaDecayScore(c: EncounterCandidate, sig: Significator, now: number): number {
  const key = `${c.line}:${c.stage}`;
  const lastTs = sig.theta.lastEncounter[key];
  if (lastTs === undefined || lastTs === 0) return 0; // no record = not due (§3.2.1)
  const halfLife = DEFAULT_THETA_PARAMS.lineHalfLives?.[c.line] ?? DEFAULT_THETA_PARAMS.halfLife;
  const decayLevel = computeCellStaleness(lastTs, now, halfLife);
  return Math.pow(decayLevel, 1.5);
}

/**
 * §3.2.2 — Match on BOTH line AND stage. Base = min(count * 0.4, 1.0).
 * +0.3 if any matching shadow has compoundPartner !== null. Cap at 1.0.
 */
export function shadowActivationScore(c: EncounterCandidate, sig: Significator): number {
  const matching = sig.shadows.entries.filter(
    e => e.resolvedAt === null && e.line === c.line && e.stage === c.stage,
  );
  if (matching.length === 0) return 0;
  let score = Math.min(matching.length * 0.4, 1.0);
  if (matching.some(e => e.compoundPartner !== null)) score += 0.3;
  return Math.min(score, 1.0);
}

/**
 * §3.2.3 — Mode-specific:
 * Exploring → 0.5, Crystallizing → counter-polarity 0.8 / deepening 0.6,
 * Crystallized → aligned 0.9 / misaligned 0.1
 */
export function polarityAlignmentScore(c: EncounterCandidate, sig: Significator): number {
  const mode = sig.polarity.master.mode;
  if (mode === 'Exploring') return 0.5;

  const key = `${c.line}:${c.stage}`;
  const cell = sig.polarity.cells[key];
  const candidateTexture = cell?.dominantPattern ?? null;
  const dominant = sig.polarity.master.dominantDirection;

  if (mode === 'Crystallizing') {
    return candidateTexture !== null && candidateTexture !== dominant ? 0.8 : 0.6;
  }
  // Crystallized
  return candidateTexture === dominant ? 0.9 : 0.1;
}

/**
 * §3.2.4 — Returns 0 if linesAtEdge < 3 AND no pendingTransformation.
 * Otherwise: isEdgeLine → +0.5, isDualShadow → +0.5.
 */
export function transformationScore(c: EncounterCandidate, sig: Significator): number {
  const targetStageOrd = stageOrdinal(sig.currentStage) + 1;
  const linesAtEdge = Object.values(sig.altitudes).filter(
    alt => stageOrdinal(alt) >= stageOrdinal(sig.currentStage),
  ).length;
  const pendingTransformation = sig.lifecycle === 'Transforming';

  if (linesAtEdge < 3 && !pendingTransformation) return 0;

  let score = 0;
  // isEdgeLine: candidate's line altitude >= targetStage - 1
  const candidateLineAlt = stageOrdinal(sig.altitudes[c.line]);
  if (candidateLineAlt >= targetStageOrd - 1) score += 0.5;

  // isDualShadow: candidate targets shadow at centreOfGravity or targetStage
  const cogOrd = stageOrdinal(sig.currentStage);
  const hasShadowAtCoG = sig.shadows.entries.some(
    e => e.resolvedAt === null && e.line === c.line && stageOrdinal(e.stage) === cogOrd,
  );
  const hasShadowAtTarget = sig.shadows.entries.some(
    e => e.resolvedAt === null && e.line === c.line && stageOrdinal(e.stage) === targetStageOrd,
  );
  // P2-High: Dual-shadow window requires BOTH shadows active (AND, not OR).
  // Per foundations/17 §3, the dual-shadow window presents BOTH submergent
  // (dark at current stage) AND emergent (golden at next stage) shadows
  // simultaneously. The OR logic let a player enter the Crucible with only
  // one shadow vector, enabling spiritual bypassing (golden without dark).
  // Full dual-shadow = 0.5 boost; either shadow alone = 0.25 (reduced).
  if (hasShadowAtCoG && hasShadowAtTarget) {
    score += 0.5; // Full dual-shadow window — both vectors active
  } else if (hasShadowAtCoG || hasShadowAtTarget) {
    score += 0.25; // Single shadow — partial readiness (not full dual-window)
  }

  return score;
}

const DRIVE_COMPLEMENT: Record<Drive, Drive> = {
  Agency: 'Communion',
  Communion: 'Agency',
  Eros: 'Agape',
  Agape: 'Eros',
};

/**
 * §3.2.5 — Only activates when max drive imbalance >= 0.3.
 * Scores if candidate's driveTarget is the COMPLEMENT of the most fixated drive.
 * Score = the fixation magnitude.
 */
export function driveBalanceScore(c: EncounterCandidate, sig: Significator, world: WorldState): number {
  const fixations = sig.drives.fixationRisk;
  let maxDrive: Drive = 'Agency';
  let maxVal = 0;
  for (const [d, v] of Object.entries(fixations) as [Drive, number][]) {
    if (v > maxVal) { maxVal = v; maxDrive = d; }
  }
  if (maxVal < 0.3) return 0;

  // Derive candidate's drive target from its holon
  const holon = world.holons.find(h => h.id === c.holonId);
  const candidateDrive = holon?.drives.dominant ?? null;
  if (!candidateDrive) return 0;

  return candidateDrive === DRIVE_COMPLEMENT[maxDrive] ? maxVal : 0;
}

/**
 * §3.2.6 — Active narrative beat match → 1.0.
 * Else if holon has existing relationship → 0.4 (static or dynamic). Else 0.
 *
 * NOTE (§3.2.9): "prefer a line we have not seen this session" is NOT computed here. It was a
 * former `diversityBonus`, and it belongs to §3.3 tie-breaking, which already owns "prefer a
 * different modality from the last 3 encounters". Injecting it into the score made it
 * incomparable to a criterion and let it reorder the ranking.
 */
export function narrativeScore(c: EncounterCandidate, world: WorldState): number {
  const holon = world.holons.find(h => h.id === c.holonId);
  if (!holon) return 0;

  // Check dynamic NPC relationships from ConsequenceEngine
  const dynamicRel = world.npcRelationships?.find(r => r.holonId === c.holonId);
  if (dynamicRel && dynamicRel.strength > 0.3) return 0.4;

  // Fall back to static holon relationship data
  if (holon.relationships.length > 0) return 0.4;
  return 0;
}

/**
 * §3.2.7 — Three sub-scores averaged:
 * Duration: short+short → 0.4, long+long → 0.2, else 0.1
 * Energy: low+low → 0.3, high+high → 0.3, mismatch → 0
 * Modality preference: 0.3 * (preference score, default 0.5)
 */
export function sessionFitScore(c: EncounterCandidate, session: SessionContext): number {
  // Duration sub-score. `?? 0` is load-bearing: an absent duration means "a session that has just
  // started" = SHORT. Without it, `undefined < 900_000` evaluated false and a fresh session was
  // scored as a long one, so two paths that differed only in whether they stamped the field
  // (kernel harness omitted it, the browser binding passed 0) scheduled different encounters.
  const shortSession = (session.estimatedTimeAvailable ?? session.sessionDurationMs ?? 0) < 900_000; // < 15min
  const shortEncounter = c.modality === 'Deterministic' || c.modality === 'Embodied';
  const longEncounter = c.modality === 'ImmersiveRPG' || c.modality === 'SocialCooperative';
  let duration: number;
  if (shortSession && shortEncounter) duration = 0.4;
  else if (!shortSession && longEncounter) duration = 0.2;
  else duration = 0.1;

  // Energy sub-score
  const energy = session.inferredEnergy ?? 'moderate';
  const highIntensity = c.modality === 'ImmersiveRPG' || c.modality === 'Strategic';
  const lowIntensity = c.modality === 'LanguageReflective' || c.modality === 'ScenarioChoice';
  let energyScore: number;
  if (energy === 'low' && lowIntensity) energyScore = 0.3;
  else if (energy === 'high' && highIntensity) energyScore = 0.3;
  else if (energy === 'moderate') energyScore = 0.15;
  else energyScore = 0;

  // Modality preference sub-score (no preference data available, use default 0.5)
  const modalityPref = 0.3 * 0.5;

  return (duration + energyScore + modalityPref) / 3;
}

/**
 * §3.2.8 — Mastery-sequence alignment (weight 0.10). The curriculum fabric rides in the SAME
 * formula: mastery sequencing is not a parallel engine, queue or mode. Four contributions, each
 * capped so the criterion is in [0, 1]:
 *
 * 1. blind-spot adjacency (+0.4) — the gap-directed probe (`31 §3.4`)
 * 2. depth-closure urgency (+0.3) — an unsatisfied prerequisite depth gate (`31 §3.5a`)
 * 3. spiral position (+0.2) — the learner's current frontier depth, not below, not above (`31 §3.2`)
 * 4. retention boundary (+0.1) — review at the forgetting boundary (`31 §4.4`)
 *
 * A developmental encounter (no `moduleRef`) scores 0 here, which is why mastery can never
 * crowd out development: the other seven criteria carry a full 0.90 of the weight.
 */
export function masteryAlignmentScore(c: EncounterCandidate, sig: Significator): number {
  const concept = masteryConceptOf(c);
  if (!concept) return 0;

  let score = 0;
  if (c.targetBlindSpotClass != null) score += 0.4;
  if (c.resolvesUnsatisfiedClosure === true) score += 0.3;

  const frontier = frontierDepthFor(concept, sig);
  if (frontier !== null && c.targetDepthLevel === frontier) score += 0.2;
  if (c.isRetentionBoundaryReview === true) score += 0.1;

  return Math.min(score, 1);
}

/**
 * The curriculum concept a candidate addresses, or `null` for a developmental encounter.
 *
 * The discriminator is STRUCTURAL, not "does the ref contain a colon". A developmental ref is
 * exactly `<Line>:<Stage>` — `Cognitive:Turquoise` — so splitting on `:` and taking element 1
 * yields the string `Turquoise` and hands the mastery criterion a concept name that does not
 * exist. The criterion then fires on developmental candidates whenever a mastery field happens to
 * be set, which is the one thing `§3.2.8` forbids: mastery must never crowd out development.
 */
export function masteryConceptOf(c: EncounterCandidate): string | null {
  const parts = c.moduleRef.split(':');
  if (parts.length < 2) return null;
  const [scope, concept] = parts;
  if (!scope || !concept) return null;
  // `<Line>:<Stage>` is a developmental ref — there is no concept inside it.
  if (
    (ALL_LINES as readonly string[]).includes(scope)
    && (ALL_STAGES as readonly string[]).includes(concept)
  ) return null;
  return concept;
}

/**
 * The depth a concept is CURRENTLY traversing (`31 §3.2`'s spiral): the next level after the
 * deepest one reached, or `absent` for a concept not yet started. Returns `null` when there is
 * no knowledge state at all, so the caller can distinguish "no data" from "starts at absent".
 */
export function frontierDepthFor(concept: string, sig: Significator): DepthLevel | null {
  const state = sig.knowledge?.conceptStates?.get(concept);
  if (!state) return sig.knowledge ? 'absent' : null;
  const next = depthOrdinal(state.depthLevel) + 1;
  return ALL_DEPTH_LEVELS[Math.min(next, ALL_DEPTH_LEVELS.length - 1)] ?? 'absent';
}

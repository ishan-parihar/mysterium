/**
 * LevellingEngine — the unified developmental grading/staging mechanism.
 * Spec: docs/foundations/42-developmental-levelling-mechanism.md
 *
 * Computes a learner's LEVEL as a pure function of developmental evidence,
 * for two ladder families that share one evaluation law:
 *
 *   syllabus.<branch>  — 8 depth rungs (absent → transformed), aggregated
 *                        from per-concept depth × retention, capped by
 *                        prerequisite closure.
 *   line.<line>        — 8 stage rungs (Infrared → White) from the
 *                        Significator's altitudes, discounted by theta
 *                        staleness, gated by shadow load.
 *
 * Hard guarantees (doc 42 §3.8):
 *   D1  No demographic input exists in any input type — the engine literally
 *       cannot receive age/sex/race/class/identity. Inputs are engine state
 *       (depths, retention, altitudes, theta, shadows) only.
 *   D2  Thresholds are demographic-free constants (InfraConfig.LEVELLING).
 *   D3  Everything is a pure, deterministic function of the inputs — same
 *       state in, same level out; no clock reads, no randomness.
 *
 * Pure functions throughout; the caller persists LevelPriors on the
 * Significator (optional field — back-compatible).
 */
import type { Line } from '../domain/Line.js';
import { ALL_LINES } from '../domain/Line.js';
import { ALL_STAGES } from '../domain/Stage.js';
import { ALL_DEPTH_LEVELS, depthOrdinal } from './types.js';
import type { CurriculumHolon, KnowledgeState } from './types.js';
import type { ShadowEntry } from '../domain/ShadowLedger.js';
import type { ThetaTimestamps } from '../domain/Significator.js';
import type { Stage } from '../domain/Stage.js';

// ---------------------------------------------------------------------------
// Constants (doc 42 §4 — single tuning source in InfraConfig.LEVELLING)
// ---------------------------------------------------------------------------

export interface LevellingConfig {
  /** Consecutive evaluations evidence must hold above/below a bar to act. */
  readonly STABILITY_WINDOW: number;
  /** Promotion bar sits this far above the demotion bar (anti-oscillation). */
  readonly HYSTERESIS_MARGIN: number;
  /** Evidence score (0..1) at or above which promotion becomes eligible. */
  readonly PROMOTION_BAR: number;
  /** Evidence score (0..1) at or below which demotion becomes eligible. */
  readonly DEMOTION_BAR: number;
}

export const DEFAULT_LEVELLING_CONFIG: LevellingConfig = {
  STABILITY_WINDOW: 3,
  HYSTERESIS_MARGIN: 0.05,
  PROMOTION_BAR: 0.75,
  DEMOTION_BAR: 0.55,
};

// ---------------------------------------------------------------------------
// Level priors — the persisted counter-state between evaluations
// ---------------------------------------------------------------------------

/** Per-ladder counter state. Pure data; safe to serialize. */
export interface LevelPrior {
  /** Consecutive evaluations with evidence in the promotion band. */
  readonly aboveCount: number;
  /** Consecutive evaluations with evidence in the demotion band. */
  readonly belowCount: number;
  /** Last computed rung (for delta detection; informational). */
  readonly lastRung: number;
}

export const EMPTY_PRIOR: LevelPrior = { aboveCount: 0, belowCount: 0, lastRung: 0 };

export type LevelPriors = ReadonlyMap<string, LevelPrior>;

// ---------------------------------------------------------------------------
// Ladder construction
// ---------------------------------------------------------------------------

export interface LevelRung {
  readonly ladderId: string;
  /** 0..7 */
  readonly index: number;
  readonly title: string;
  /** Evidence bar to have entered this rung. */
  readonly entryBar: number;
  /** Evidence bar to leave this rung upward (= entryBar of index+1). */
  readonly exitBar: number;
}

export interface LevelLadder {
  readonly ladderId: string;
  readonly rungs: readonly LevelRung[];
}

/** Evidence bars per rung — demographic-free, evidence-only. */
const SYLLABUS_RUNG_BARS: readonly [number, number][] = [
  [0.0, 0.08], // 0 absent
  [0.08, 0.20], // 1 memorized
  [0.20, 0.38], // 2 comprehended
  [0.38, 0.55], // 3 applied
  [0.55, 0.70], // 4 analyzed
  [0.70, 0.85], // 5 evaluated
  [0.85, 0.95], // 6 transformed
  [0.95, 1.01], // 7 integrated (whole-branch mastery)
];
const LINE_RUNG_BARS: readonly [number, number][] = [
  [0.0, 0.08],
  [0.08, 0.20],
  [0.20, 0.38],
  [0.38, 0.55],
  [0.55, 0.70],
  [0.70, 0.85],
  [0.85, 0.95],
  [0.95, 1.01],
];

function buildRungs(ladderId: string, bars: readonly [number, number][], titles: readonly string[]): LevelLadder {
  const rungs: LevelRung[] = bars.map(([entry, exit], index) => ({
    ladderId,
    index,
    title: titles[index] ?? `Rung ${index}`,
    entryBar: entry,
    exitBar: exit,
  }));
  return { ladderId, rungs };
}

export const SYLLABUS_RUNG_TITLES: readonly string[] = [
  'untouched', 'recognized', 'grasped', 'usable', 'connected', 'judged', 'regenerated', 'woven',
];

export const LINE_RUNG_TITLES: readonly string[] = ALL_STAGES;

/** Build the syllabus ladder for a branch (8 rungs over depth evidence). */
export function buildSyllabusLadder(branchId: string): LevelLadder {
  return buildRungs(`syllabus.${branchId}`, SYLLABUS_RUNG_BARS, SYLLABUS_RUNG_TITLES);
}

/** Build the line ladder for one of the 8 lines (8 rungs over stage altitudes). */
export function buildLineLadder(line: Line): LevelLadder {
  return buildRungs(`line.${line}`, LINE_RUNG_BARS, LINE_RUNG_TITLES);
}

// ---------------------------------------------------------------------------
// Evaluation results
// ---------------------------------------------------------------------------

export type LevelCap = 'none' | 'prerequisites' | 'shadows';

export interface LevelEvaluation {
  readonly ladderId: string;
  /** Aggregate evidence score 0..1 for the ladder's current band. */
  readonly evidenceScore: number;
  readonly currentRung: number;
  readonly promoted: boolean;
  readonly demoted: boolean;
  readonly cappedBy: LevelCap;
  readonly prior: LevelPrior;
}

// ---------------------------------------------------------------------------
// Syllabus ladder evaluation
// ---------------------------------------------------------------------------

/**
 * Aggregate per-concept evidence for a branch:
 *   mastery weight per concept = depthOrdinal(depthLevel)/6 × retention
 * Branch evidence = mean over branch concepts, capped by prereq closure:
 *   if any encountered concept has an unmet prerequisite (a prereq concept
 *   with no state or depth < comprehended), the evidence is capped at the
 *   prereq-closure ceiling (0.55 — 'usable'): you cannot sit above what
 *   you cannot stand on.
 */
export function evaluateSyllabusLevel(
  knowledge: KnowledgeState,
  branchHolons: readonly CurriculumHolon[],
  config: LevellingConfig = DEFAULT_LEVELLING_CONFIG,
  prior: LevelPrior = EMPTY_PRIOR,
): LevelEvaluation {
  const ladder = buildSyllabusLadder(branchHolons[0]?.id.split('.')[0] ?? 'unknown');
  const ladderId = ladder.ladderId;

  if (branchHolons.length === 0) {
    return finish(ladderId, 0, 0, 'none', config, prior);
  }

  // Concept ids belonging to this branch (id prefix before first '.').
  const branchPrefix = branchHolons[0]!.id.split('.')[0]!;
  let masterySum = 0;
  let counted = 0;
  let cappedBy: LevelCap = 'none';

  for (const holon of branchHolons) {
    if (holon.id.split('.')[0] !== branchPrefix) continue;
    const state = knowledge.conceptStates.get(holon.id);
    if (!state) continue; // unencountered concepts do not drag the mean
    const depthW = depthOrdinal(state.depthLevel) / (ALL_DEPTH_LEVELS.length - 1);
    masterySum += depthW * clamp01(state.retention);
    counted++;

    // Prereq closure: an encountered concept whose prerequisites are not
    // themselves held at >= comprehended depth caps the branch.
    for (const prereqId of holon.prerequisites) {
      const prereqState = knowledge.conceptStates.get(prereqId);
      const prereqDepth = prereqState ? depthOrdinal(prereqState.depthLevel) : -1;
      if (prereqDepth < depthOrdinal('comprehended')) {
        cappedBy = 'prerequisites';
      }
    }
  }

  const raw = counted > 0 ? masterySum / counted : 0;
  const evidence = cappedBy === 'prerequisites' ? Math.min(raw, 0.55) : raw;
  const evidenceScore = clamp01(evidence);

  const currentRung = rungForEvidence(ladder, evidenceScore);
  return finish(ladderId, evidenceScore, currentRung, cappedBy, config, prior);
}

// ---------------------------------------------------------------------------
// Line ladder evaluation
// ---------------------------------------------------------------------------

export interface LineLevelInputs {
  readonly altitudes: Readonly<Record<Line, Stage>>;
  readonly theta: ThetaTimestamps;
  readonly shadows: readonly ShadowEntry[];
  readonly nowMs: number;
}

/**
 * Line evidence combines:
 *   - altitude: stage ordinal / 7 (dominant term, weight 0.7)
 *   - intensity: recorded per-line intensity, default 0.5 (weight 0.1)
 *   - freshness: theta recency mapped to 0..1 with a 45-day full-stale
 *     horizon (weight 0.2)
 * Shadow load at/below the line's altitude gates promotion eligibility
 * (holonic integrity): any unresolved shadow whose stage ordinal is <= the
 * line's stage ordinal caps evidence at the demotion bar boundary — visible
 * staleness, not erasure.
 */
export function evaluateLineLevel(
  inputs: LineLevelInputs,
  line: Line,
  config: LevellingConfig = DEFAULT_LEVELLING_CONFIG,
  prior: LevelPrior = EMPTY_PRIOR,
): LevelEvaluation {
  const ladder = buildLineLadder(line);
  const altitude = inputs.altitudes[line] ?? ALL_STAGES[0]!;
  const altitudeScore = ALL_STAGES.indexOf(altitude) / (ALL_STAGES.length - 1);

  const lastTheta = inputs.theta.lastEncounter[line] ?? 0;
  const daysIdle = Math.max(0, (inputs.nowMs - lastTheta) / 86_400_000);
  const freshness = clamp01(1 - daysIdle / 45);

  let evidence = 0.75 * altitudeScore + 0.25 * freshness;

  // Shadow gate: UNRESOLVED shadows at/below the stage cap the evidence.
  let shadowCapped = false;
  const stageOrd = ALL_STAGES.indexOf(altitude);
  for (const shadow of inputs.shadows) {
    if (shadow.resolvedAt !== null) continue;
    if (shadow.line !== line) continue;
    if (ALL_STAGES.indexOf(shadow.stage) <= stageOrd) {
      shadowCapped = true;
      break;
    }
  }
  if (shadowCapped) {
    evidence = Math.min(evidence, config.DEMOTION_BAR + config.HYSTERESIS_MARGIN / 2);
  }

  const evidenceScore = clamp01(evidence);
  const currentRung = rungForEvidence(ladder, evidenceScore);
  const cappedBy: LevelCap = shadowCapped ? 'shadows' : 'none';
  return finish(ladder.ladderId, evidenceScore, currentRung, cappedBy, config, prior);
}

// ---------------------------------------------------------------------------
// Shared evaluation law (promotion/demotion with hysteresis + stability)
// ---------------------------------------------------------------------------

function rungForEvidence(ladder: LevelLadder, evidence: number): number {
  for (let i = ladder.rungs.length - 1; i >= 0; i--) {
    const rung = ladder.rungs[i]!;
    if (evidence >= rung.entryBar) return rung.index;
  }
  return 0;
}

function finish(
  ladderId: string,
  evidenceScore: number,
  currentRung: number,
  cappedBy: LevelCap,
  config: LevellingConfig,
  prior: LevelPrior,
): LevelEvaluation {
  // Stability law (doc 42 §3.3–§3.5): counters track CONSECUTIVE evaluations
  // with evidence in each band; the promotion/demotion EVENT fires exactly
  // when a counter completes the stability window (and not again while
  // evidence merely stays in band). Evidence between the bars is the
  // hysteresis dead zone: neither counter moves.
  const inPromotionBand = evidenceScore >= config.PROMOTION_BAR;
  const inDemotionBand = evidenceScore <= config.DEMOTION_BAR;

  const aboveCount = inPromotionBand ? prior.aboveCount + 1 : 0;
  const belowCount = inDemotionBand ? prior.belowCount + 1 : 0;

  const promoted = aboveCount === config.STABILITY_WINDOW;
  const demoted = belowCount === config.STABILITY_WINDOW;

  return {
    ladderId,
    evidenceScore,
    currentRung,
    promoted,
    demoted,
    cappedBy,
    prior: { aboveCount, belowCount, lastRung: currentRung },
  };
}

// ---------------------------------------------------------------------------
// Evaluate everything (the one call sites want)
// ---------------------------------------------------------------------------

export interface EvaluateAllResult {
  readonly evaluations: ReadonlyMap<string, LevelEvaluation>;
  readonly ladders: ReadonlyMap<string, LevelLadder>;
}

/** Evaluate all line ladders + all syllabus branch ladders present in holons. */
export function evaluateAllLevels(
  inputs: LineLevelInputs,
  branchHolons: ReadonlyMap<string, readonly CurriculumHolon[]>,
  knowledge: KnowledgeState,
  priors: LevelPriors = new Map(),
  config: LevellingConfig = DEFAULT_LEVELLING_CONFIG,
): EvaluateAllResult {
  const evaluations = new Map<string, LevelEvaluation>();
  const ladders = new Map<string, LevelLadder>();

  for (const line of ALL_LINES) {
    const ladderId = `line.${line}`;
    const ladder = buildLineLadder(line);
    ladders.set(ladderId, ladder);
    evaluations.set(
      ladderId,
      evaluateLineLevel(inputs, line, config, priors.get(ladderId) ?? EMPTY_PRIOR),
    );
  }

  for (const [branchId, holons] of branchHolons) {
    const ladder = buildSyllabusLadder(branchId);
    ladders.set(ladder.ladderId, ladder);
    evaluations.set(
      ladder.ladderId,
      evaluateSyllabusLevel(knowledge, holons, config, priors.get(ladder.ladderId) ?? EMPTY_PRIOR),
    );
  }

  return { evaluations, ladders };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

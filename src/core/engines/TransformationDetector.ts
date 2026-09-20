/**
 * TransformationDetector — detects stage-transition thresholds.
 * Spec: foundations/17 §2
 */
import type { Line } from '../domain/Line.js';
import { ALL_LINES, LINE_QUADRANT } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';
import { ALL_STAGES, stageOrdinal } from '../domain/Stage.js';
import { STAGE_RAY_MAP, sameRay } from '../domain/Ray.js';
import type { Significator } from '../domain/Significator.js';
import type { Quadrant } from '../domain/SharedTypes.js';

export interface TransformationSignal {
  readonly targetStage: Stage;
  readonly readiness: number; // 0-1
  readonly convergentLines: readonly Line[];
  readonly blockers: readonly string[];
}

export interface ReadinessReport {
  readonly convergence: number; // fraction of lines at edge
  readonly saturation: number; // catalyst processed ratio
  readonly shadowClearance: number; // 0-1, 1 = no blocking shadows
  readonly overall: number; // weighted composite
}

// Lines required at edge for each stage transition
const CONVERGENCE_REQUIREMENTS: Record<number, number> = {
  0: 3, // Infrared→Magenta: 3 lines
  1: 4, // Magenta→Red: 4 lines
  2: 5, // Red→Amber: 5 lines
  3: 5, // Amber→Orange
  4: 6, // Orange→Green
  5: 6, // Green→Teal
  6: 7, // Teal→Turquoise
};

// P1-3 (UX-R3): SATURATION_THRESHOLD is now exported and mutable so the
// CLI can lower it for the no-LLM fallback path (where encounters are
// ~30-second reflections, not LLM-rich developmental exchanges). The
// default of 20 is appropriate for LLM-driven sessions; for no-LLM
// mode the CLI sets it to 6 (so a full 8-line calibration + ~2 follow-up
// sessions can produce a stage transition).
// Original audit finding: a fresh user ran 42 encounters across 14
// sessions and saw zero stage progression — the threshold was unreachable.
export let SATURATION_THRESHOLD = 20; // encounters per line at current stage

/** Override the saturation threshold (used by the CLI for --no-llm mode). */
export function setSaturationThreshold(n: number): void {
  if (Number.isFinite(n) && n > 0) {
    SATURATION_THRESHOLD = Math.max(1, Math.floor(n));
  }
}

/**
 * P1-3 (UX-R3): Per-line progress toward the saturation threshold.
 * Returns the trace count and the threshold for the player's current
 * stage, so the CLI can render a "4/6 to next threshold" indicator.
 * Veil-compliant: this is structural progress, not clinical state.
 */
export interface LineProgress {
  readonly line: Line;
  readonly stage: Stage;
  readonly traces: number;
  readonly threshold: number;
  readonly ratio: number; // 0..1
}

export function getLineProgress(sig: Significator): readonly LineProgress[] {
  return ALL_LINES.map((line) => {
    const stage = sig.altitudes[line] ?? sig.currentStage;
    const key = `${line}:${stage}`;
    const traces = sig.polarity.cells[key]?.traceCount ?? 0;
    return {
      line,
      stage,
      traces,
      threshold: SATURATION_THRESHOLD,
      ratio: Math.min(1, traces / SATURATION_THRESHOLD),
    };
  });
}

/** Detect whether transformation threshold is crossed. */
export function detectThreshold(sig: Significator): TransformationSignal | null {
  const currentOrd = stageOrdinal(sig.currentStage);
  if (currentOrd >= ALL_STAGES.length - 1) return null; // already at Turquoise

  const targetStage = ALL_STAGES[currentOrd + 1]!;
  const report = computeReadiness(sig, targetStage);

  if (report.overall >= 0.8) {
    const convergentLines = ALL_LINES.filter(l => stageOrdinal(sig.altitudes[l]) >= currentOrd);
    const blockers: string[] = [];
    if (report.shadowClearance < 0.8) blockers.push('unresolved_critical_shadows');
    if (report.convergence < 0.7) blockers.push('insufficient_line_convergence');

    if (blockers.length === 0) {
      return { targetStage, readiness: report.overall, convergentLines, blockers };
    }
  }

  return null;
}

/** Compute readiness for a specific stage transition. */
export function computeReadiness(sig: Significator, targetStage: Stage): ReadinessReport {
  const targetOrd = stageOrdinal(targetStage);
  const currentOrd = targetOrd - 1;
  const required = CONVERGENCE_REQUIREMENTS[currentOrd] ?? 5;

  // Convergence: how many lines are at or above current stage
  const linesAtEdge = ALL_LINES.filter(l => stageOrdinal(sig.altitudes[l]) >= currentOrd);
  const convergence = Math.min(1, linesAtEdge.length / required);

  // Saturation: encounters processed at current stage
  let totalTraces = 0;
  for (const line of ALL_LINES) {
    const key = `${line}:${ALL_STAGES[currentOrd]}`;
    const cell = sig.polarity.cells[key];
    totalTraces += cell?.traceCount ?? 0;
  }
  const saturation = Math.min(1, totalTraces / (ALL_LINES.length * SATURATION_THRESHOLD));

  // Shadow clearance: no critical unresolved shadows at current stage
  const criticalShadows = sig.shadows.entries.filter(
    e => e.resolvedAt === null && e.severity >= 0.7 && stageOrdinal(e.stage) >= currentOrd,
  );
  const shadowClearance = criticalShadows.length === 0 ? 1 : Math.max(0, 1 - criticalShadows.length * 0.3);

  // GAP-F-7: Ray-center activation signal (per HoloOS 08.8.22).
  // When the next-density ray-center is activating while the current saturates,
  // this is a phase-transition signal. The current stage's ray should be highly
  // activated (saturation), and the next stage's ray should be rising (catalytic
  // interference per 08.8.14 §2.3).
  //
  // SAME-RAY TRANSITIONS (CODE-PASS): Orange/Green share the Blue ray and Teal/Turquoise share
  // the Indigo ray, so `currentRay === targetRay` for those steps. The signal above is then
  // degenerate — one activation would have to be both saturated and rising — and it used to be
  // masked only by the conflation that gave stage 8 the Violet ray. A same-ray step is NOT a
  // ray transition: the lens reads the two positions as 5a→5b / 6a→6b (`RAY_LENS`), and what
  // actually separates them is QUALITY (gateway opens vs gateway traversed, `StageQuality`). So
  // the ray term abstains (1 = no ray objection) and the AQAL + saturation terms carry the
  // boundary, rather than reporting a barrier that does not exist.
  const currentRay = STAGE_RAY_MAP[sig.currentStage] ?? 'Yellow';
  const targetRay = STAGE_RAY_MAP[targetStage] ?? 'Green';
  const currentRayActivation = sig.rayProfile[currentRay] ?? 0;
  const targetRayActivation = sig.rayProfile[targetRay] ?? 0;
  const rayReadiness = sameRay(sig.currentStage, targetStage)
    ? 1
    : (currentRayActivation > 0.6 && targetRayActivation > 0.3)
      ? 1
      : 0;

  // CRITICAL-1: AQAL 4-quadrant coherence gate.
  // Per foundations/01 §4, all 4 quadrants (UL/UR/LL/LR) must have at least
  // one line at or above the current stage for transformation to fire.
  // This prevents "integral fallacy" — transformation on cognitive-only evidence.
  // Note: Mysterium's LINE_QUADRANT maps 6 lines to UL/UR/LL but none to LR.
  // LR (exterior-collective) is covered by the world-state PESTLE system.
  // We treat LR as "covered" if any macro-event or PESTLE tension is active
  // (the world is exerting systemic pressure). For now, LR coverage is assumed
  // if the player has ≥1 encounter at the current stage (simplification until
  // LR lines are added or world-state is integrated into the gate).
  const quadrantsCovered = new Set<Quadrant>();
  for (const line of ALL_LINES) {
    const lineOrd = stageOrdinal(sig.altitudes[line]);
    if (lineOrd >= currentOrd) {
      quadrantsCovered.add(LINE_QUADRANT[line]);
    }
  }
  // LR is "covered" if there's any polarity cell activity at the current stage
  // (proxy for systemic/world engagement). This is a simplification — a proper
  // LR gate would check PESTLE tension or macro-event activity.
  const lrActivity = Object.keys(sig.polarity.cells).some(k => k.endsWith(`:${sig.currentStage}`));
  if (lrActivity) quadrantsCovered.add('LR');

  const aqalCoherence = quadrantsCovered.size >= 3 ? 1 : quadrantsCovered.size / 4;

  // Overall: convergence 35% + saturation 20% + shadowClearance 20% + rayReadiness 10% + AQAL 15%
  // AQAL gate reduces readiness if quadrants are missing. If < 3 quadrants covered,
  // readiness is capped at 0.5 (can't reach the 0.8 threshold without AQAL coherence).
  const overall = aqalCoherence < 0.75
    ? Math.min(0.5, convergence * 0.35 + saturation * 0.20 + shadowClearance * 0.20 + rayReadiness * 0.10 + aqalCoherence * 0.15)
    : convergence * 0.35 + saturation * 0.20 + shadowClearance * 0.20 + rayReadiness * 0.10 + aqalCoherence * 0.15;

  return { convergence, saturation, shadowClearance, overall };
}

// ─── Transformation State Machine (R3.1 + R3.5 + R3.6) ───

export type TransformationPhase = 'idle' | 'threshold' | 'unravelling' | 'crucible' | 'emergence' | 'complete';

export interface TransformationState {
  readonly phase: TransformationPhase;
  readonly targetStage: Stage | null;
  readonly sessionsInPhase: number;
  readonly knotsResolved: number;
  readonly totalKnots: number;
}

export function createInitialTransformationState(): TransformationState {
  return { phase: 'idle', targetStage: null, sessionsInPhase: 0, knotsResolved: 0, totalKnots: 0 };
}

/**
 * P0-7: Reconstruct a TransformationState from the Significator's persisted fields.
 *
 * The Significator stores transformationPhase + sessionsInPhase + knotsResolved +
 * totalKnots + targetStage so that transformation state survives across sessions.
 * But startSession() was returning createInitialTransformationState() (always
 * fresh 'idle' with all counters at 0), discarding the persisted state. This
 * meant sessionsInPhase reset to 0 every session, breaking cross-session
 * transformation continuity (the crucible should span multiple sessions per
 * foundations/17, but the counter reset made each session start fresh).
 *
 * This helper reads the persisted fields and reconstructs the TransformationState.
 * Falls back to createInitialTransformationState() if fields are missing.
 */
export function reconstructTransformationState(sig: {
  transformationPhase?: string | null;
  transformationTargetStage?: string | null;
  transformationSessionsInPhase?: number | null;
  transformationKnotsResolved?: number | null;
  transformationTotalKnots?: number | null;
}): TransformationState {
  const phase = (sig.transformationPhase ?? 'idle') as TransformationState['phase'];
  // Validate the phase is a known value; fall back to 'idle' if corrupted
  const validPhases: TransformationState['phase'][] = ['idle', 'threshold', 'unravelling', 'crucible', 'emergence', 'complete'];
  const safePhase = validPhases.includes(phase) ? phase : 'idle';

  return {
    phase: safePhase,
    targetStage: (sig.transformationTargetStage ?? null) as TransformationState['targetStage'],
    sessionsInPhase: sig.transformationSessionsInPhase ?? 0,
    knotsResolved: sig.transformationKnotsResolved ?? 0,
    totalKnots: sig.transformationTotalKnots ?? 0,
  };
}

/**
 * Advance the transformation state machine based on current conditions.
 * Called after each encounter during an active transformation.
 */
export function advanceTransformation(
  state: TransformationState,
  sig: Significator,
): TransformationState {
  switch (state.phase) {
    case 'idle': {
      const signal = detectThreshold(sig);
      if (signal && signal.readiness >= 0.8) {
        return { ...state, phase: 'threshold', targetStage: signal.targetStage, sessionsInPhase: 0, totalKnots: signal.blockers.length || 1 };
      }
      return state;
    }
    case 'threshold': {
      if (state.sessionsInPhase >= 1) {
        return { ...state, phase: 'unravelling', sessionsInPhase: 0 };
      }
      return { ...state, sessionsInPhase: state.sessionsInPhase + 1 };
    }
    case 'unravelling': {
      if (state.sessionsInPhase >= 2) {
        return { ...state, phase: 'crucible', sessionsInPhase: 0 };
      }
      return { ...state, sessionsInPhase: state.sessionsInPhase + 1 };
    }
    case 'crucible': {
      if (state.knotsResolved >= state.totalKnots || state.sessionsInPhase >= 5) {
        return { ...state, phase: 'emergence', sessionsInPhase: 0 };
      }
      return { ...state, sessionsInPhase: state.sessionsInPhase + 1 };
    }
    case 'emergence': {
      if (state.sessionsInPhase >= 1) {
        return { ...state, phase: 'complete' };
      }
      return { ...state, sessionsInPhase: state.sessionsInPhase + 1 };
    }
    case 'complete':
      return state;
  }
}

/**
 * Record a knot resolution during the crucible phase.
 */
export function recordKnotResolution(state: TransformationState): TransformationState {
  if (state.phase !== 'crucible') return state;
  return { ...state, knotsResolved: state.knotsResolved + 1 };
}

/**
 * Commit the transformation: returns the new target stage.
 * Only valid when phase === 'complete'.
 * The caller is responsible for advancing the Significator's altitude.
 */
export function commitTransformation(state: TransformationState): { targetStage: Stage | null; newState: TransformationState } {
  if (state.phase !== 'complete' || !state.targetStage) {
    return { targetStage: null, newState: state };
  }
  return {
    targetStage: state.targetStage,
    newState: createInitialTransformationState(),
  };
}

// P1-B8 (Architecture Audit Phase B): per-line transformation tracking.
// A line-level transformation is detected when ALL 3 lines in a
// 'line-cluster' reach the next stage together. Clusters are heuristic
// (Cognitive/Emotional share a stage-axis, Moral/Intrapersonal share
// another, etc). This supplements the single global `currentStage` and
// unlocks a richer "per-line development" narrative.
const LINE_CLUSTERS: ReadonlyArray<ReadonlyArray<Line>> = [
  ['Cognitive', 'Emotional'],
  ['Moral', 'Intrapersonal'],
  ['Spiritual', 'Somatic'],
  ['Interpersonal', 'Willpower'],
];

export interface PerLineTransformationSignal {
  readonly cluster: readonly Line[];
  readonly lineAltitudes: Readonly<Record<Line, Stage>>;
  readonly candidateTarget: Stage | null;
  readonly readiness: number; // 0-1
}

export function detectPerLineTransformation(
  sig: Significator,
  targetStage: Stage,
): readonly PerLineTransformationSignal[] {
  const signals: PerLineTransformationSignal[] = [];
  for (const cluster of LINE_CLUSTERS) {
    // A cluster is "ready" when ALL its lines are at the same stage (the
    // pre-target stage). readiness is the proportion of lines already at
    // the target.
    const altitudes: Record<Line, Stage> = {} as any;
    for (const line of cluster) altitudes[line] = sig.altitudes[line] ?? sig.currentStage;
    const targetOrd = stageOrdinal(targetStage);
    const atTarget = cluster.filter((l) => stageOrdinal(sig.altitudes[l] ?? sig.currentStage) >= targetOrd).length;
    const readiness = atTarget / cluster.length;
    if (readiness > 0 && readiness < 1) {
      signals.push({
        cluster,
        lineAltitudes: altitudes,
        candidateTarget: targetStage,
        readiness,
      });
    }
  }
  return signals;
}

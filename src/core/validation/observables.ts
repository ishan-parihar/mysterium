/**
 * Observables — the canonicalization layer between engine state and gates.
 *
 * Spec: docs/validation/BENCHMARK-ARCHITECTURE.md §5.
 *
 * Projects a Significator (+ session context) into a flat, serializable
 * snapshot of every signal the gates reason about. Single source of truth so
 * per-persona expectations and population statistics always agree on
 * definitions.
 *
 * Note on wall-clock: the engine reads Date.now() in a few places (CCI theta
 * freshness, startSession recalibration). Because the harness anchors its
 * virtual clock at BENCH_EPOCH (2026-01-01) — a FIXED point in the past —
 * every wall-clock read that lands inside a trajectory returns a timestamp
 * AFTER the virtual clock, which uniformly pushes theta staleness toward its
 * ceiling. This is deterministic (same wall delta per run only if runs are
 * time-boxed...) — so instead, observables normalize staleness by the newest
 * cell timestamp, and gates assert on RELATIVE staleness (per-line ordering),
 * never on absolute values. This keeps all staleness gates reproducible.
 */
import type { Significator } from '../domain/Significator.js';
import type { Stage } from '../domain/Stage.js';
import { computeCCI } from '../engines/CCIEngine.js';
import { toSnapshot } from '../domain/SignificatorSnapshot.js';
import { computeReadiness } from '../engines/TransformationDetector.js';
import { computeStaleness, DEFAULT_THETA_PARAMS } from '../engines/ThetaDecay.js';
import { ALL_LINES } from '../domain/Line.js';

export interface Observables {
  session: number;
  cci: number;
  cciDims: Record<string, number>;
  driveWeights: Record<string, number>;
  driveFixation: Record<string, number>;
  shadowsTotal: number;
  shadowsUnresolved: number;
  /** Per-line MAX staleness, normalized so the freshest line = 0 and stalest = 1. */
  thetaStaleness: Record<string, number>;
  conceptRetention: Record<string, number>;
  themes: readonly string[];
  modalityCounts: Record<string, number>;
  curriculumEncounters: number;
  trainingEncounters: number;
  curriculumSlots: number;
  trainingSlots: number;
  readiness: number;
  currentStage: Stage;
}

const STAGE_ORDER: readonly Stage[] = ['Infrared', 'Magenta', 'Red', 'Amber', 'Orange', 'Green', 'Turquoise', 'White'];

export interface EncounterCounters {
  curriculum: number;
  training: number;
}

export function extractObservables(
  sig: Significator,
  sessionState: { strategy?: { theme?: string; curriculumSlots?: number; trainingSlots?: number } },
  session: number,
  counters: EncounterCounters = { curriculum: 0, training: 0 },
): Observables {
  const snapshot = toSnapshot(sig);
  const cci = computeCCI(snapshot, sig);
  const readiness = safeReadiness(sig);

  const conceptRetention: Record<string, number> = {};
  if (sig.knowledge) {
    for (const [id, cs] of sig.knowledge.conceptStates) {
      conceptRetention[id] = cs.retention;
    }
  }

  // Raw staleness at extraction time, then per-line max, then min-max normalize
  // across lines. Relative profile is invariant to wall-clock injection.
  const raw = computeStaleness(sig.theta.lastEncounter, Date.now(), DEFAULT_THETA_PARAMS);
  const perLineMax: Record<string, number> = {};
  for (const line of ALL_LINES) {
    const cells = Object.entries(raw).filter(([k]) => k.startsWith(`${line}:`));
    if (cells.length > 0) perLineMax[line] = Math.max(...cells.map(([, v]) => v));
  }
  const lines = Object.values(perLineMax);
  const min = lines.length ? Math.min(...lines) : 0;
  const max = lines.length ? Math.max(...lines) : 0;
  const span = max - min;
  const thetaStaleness: Record<string, number> = {};
  for (const [line, v] of Object.entries(perLineMax)) {
    thetaStaleness[line] = span > 0 ? (v - min) / span : 0;
  }

  return {
    session,
    cci: cci.composite,
    cciDims: { ...cci.dimensions },
    driveWeights: { ...sig.drives.weights },
    driveFixation: { ...sig.drives.fixationRisk },
    shadowsTotal: sig.shadows.entries.length,
    shadowsUnresolved: sig.shadows.entries.filter((e) => e.resolvedAt === null).length,
    thetaStaleness,
    conceptRetention,
    themes: sessionState.strategy?.theme ? [sessionState.strategy.theme] : [],
    modalityCounts: {},
    curriculumEncounters: counters.curriculum,
    trainingEncounters: counters.training,
    curriculumSlots: sessionState.strategy?.curriculumSlots ?? 0,
    trainingSlots: sessionState.strategy?.trainingSlots ?? 0,
    readiness,
    currentStage: sig.currentStage,
  };
}

function safeReadiness(sig: Significator): number {
  try {
    const idx = STAGE_ORDER.indexOf(sig.currentStage);
    const next = STAGE_ORDER[Math.min(STAGE_ORDER.length - 1, idx + 1)]!;
    return computeReadiness(sig, next).overall;
  } catch {
    return 0;
  }
}

/**
 * Measurement pack contract (doc 40 §4.1) — types + registry + session runner.
 *
 * Packs are self-contained, swappable competency instruments. Nothing in the
 * core engine branches on pack presence: a pack is data + the shared runner
 * below, registered in a MeasurementPackRegistry parallel to the
 * CurriculumRegistry. New domains are new packs, not core changes.
 *
 * Session runner semantics:
 *   - Adaptive staircase per pack policy (reuses the 1-up/2-down core).
 *   - Stop rule: SE ≤ pack.stopSe OR maxTrials reached (session budget).
 *   - Form assignment alternates per retestPolicy so test–retest and parallel
 *     forms data accumulate from ordinary play.
 *   - Results stream into Significator.skillTheta[packId] (40 §4.2) with
 *     pack-declared half-life freshness.
 *
 * Determinism: item ordering and difficulty progression derive from a seed;
 * the same (pack, form, seed, ability) ⇒ identical session (kernel-gated).
 */
import type { StaircaseState } from '../domain/SharedTypes.js';
import { updateStaircase, DEFAULT_STAIRCASE_CONFIG, type StaircaseConfig } from '../usecases/Staircase.js';

// ---------------------------------------------------------------------------
// Contract types (40 §4.1)
// ---------------------------------------------------------------------------

export interface PackItem {
  readonly id: string;
  /** Item difficulty on the pack's scale (higher = harder). */
  readonly difficulty: number;
  /** Deterministic check that a response is correct for this item. */
  readonly correctResponse: string;
  readonly prompt: string;
}

export interface PackForm {
  readonly id: string;
  readonly items: readonly PackItem[];
}

export type ScoringModel = '1pl-lite' | '2pl-lite';

export interface StaircasePolicy {
  readonly stepSize: number;
  readonly minLevel: number;
  readonly maxLevel: number;
  /** Stop when the running SE estimate ≤ this (40 §4.1: 0.30 default). */
  readonly stopSe: number;
  /** Hard trial budget — SE-stop must be achievable within this (linter). */
  readonly maxTrials: number;
}

export interface RetestPolicy {
  /** Minimum ms between sessions of the same pack. */
  readonly intervalMs: number;
  /** Alternate parallel forms across sessions. */
  readonly alternateForms: boolean;
}

export interface EffectDeclarations {
  /** Declared, testable practice effect (theta slope upper bound per session). */
  readonly practiceEffectPerSession: number;
  /** Declared fatigue effect within a session (late-trial accuracy drop). */
  readonly fatigueEffect: number;
}

export interface MeasurementPack {
  readonly id: string;
  readonly construct: string;
  readonly skillThetaKey: string;
  readonly forms: readonly PackForm[];
  readonly staircase: StaircasePolicy;
  readonly scoringModel: ScoringModel;
  /** Item pool (difficulty-annotated) the forms draw from. */
  readonly items: readonly PackItem[];
  readonly convergentAnchors: readonly string[];
  readonly discriminantDivergents: readonly string[];
  readonly retestPolicy: RetestPolicy;
  readonly expectedArtefacts: EffectDeclarations;
  /** Locale for localizable packs (40 §4.3). */
  readonly locale?: string;
  /** Young packs must carry a provisional ceiling date (linter). */
  readonly provisionalUntil?: string;
}

export interface SkillThetaStream {
  readonly theta: number;
  readonly se: number;
  readonly lastMeasuredAtMs: number;
  readonly sessionCount: number;
  /** Pack-declared half-life for freshness decay (ms). */
  readonly halfLifeMs: number;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const registry = new Map<string, MeasurementPack>();

export function registerPack(pack: MeasurementPack): void {
  registry.set(pack.id, pack);
}

export function getPack(id: string): MeasurementPack | undefined {
  return registry.get(id);
}

export function allPacks(): readonly MeasurementPack[] {
  return [...registry.values()];
}

// ---------------------------------------------------------------------------
// Item selection + session state
// ---------------------------------------------------------------------------

export interface PackSessionState {
  readonly packId: string;
  readonly formId: string;
  readonly seed: number;
  readonly staircase: StaircaseState;
  readonly trial: number;
  /** Ability estimate (theta) and running SE on the pack's difficulty scale. */
  readonly theta: number;
  readonly se: number;
  /** Administered item ids in order (exposure stats feed the linter). */
  readonly administered: readonly string[];
  readonly correctCount: number;
  readonly finished: boolean;
  readonly stopReason?: 'se-stop' | 'budget';
}

/**
 * Pick the un-administered item closest to the current theta. Ties within a
 * small difficulty window are broken by the session seed (deterministically):
 * this is what makes parallel sessions with equal ability paths diverge in
 * item exposure — the property test–retest and exposure stats need.
 */
export function nextItem(pack: MeasurementPack, formId: string, state: PackSessionState): PackItem | null {
  const form = pack.forms.find((f) => f.id === formId);
  if (!form) return null;
  const used = new Set(state.administered);
  const pool = pack.items.filter((i) => form.items.some((fi) => fi.id === i.id) && !used.has(i.id));
  if (pool.length === 0) return null;
  const WINDOW = 0.5;
  const best = Math.min(...pool.map((i) => Math.abs(i.difficulty - state.theta)));
  const candidates = pool.filter((i) => Math.abs(i.difficulty - state.theta) <= best + WINDOW);
  if (candidates.length === 1) return candidates[0]!;
  // Seed-driven rotation among near-tie candidates (deterministic).
  const idx = Math.abs(state.seed + state.trial * 2654435761) % candidates.length;
  return candidates[idx]!;
}

export function startPackSession(pack: MeasurementPack, formId: string, seed: number, startTheta = 0): PackSessionState {
  return {
    packId: pack.id,
    formId,
    seed,
    staircase: { level: startTheta, reversals: 0, lastDirection: null, history: [] },
    trial: 0,
    theta: startTheta,
    se: 1.0,
    administered: [],
    correctCount: 0,
    finished: false,
  };
}

function cfgFor(pack: MeasurementPack): StaircaseConfig {
  return {
    stepSize: pack.staircase.stepSize,
    minLevel: pack.staircase.minLevel,
    maxLevel: pack.staircase.maxLevel,
    convergenceReversals: DEFAULT_STAIRCASE_CONFIG.convergenceReversals,
  };
}

/**
 * Record one trial response. Correctness comes from the presentation adapter
 * comparing the captured response to item.correctResponse; here we only
 * advance the model. SE shrinks as ~1/sqrt(trial) (1PL-lite), which the
 * stop rule consumes.
 */
export function recordTrial(state: PackSessionState, pack: MeasurementPack, item: PackItem, correct: boolean): PackSessionState {
  if (state.finished) return state;
  const staircase = updateStaircase(state.staircase, cfgFor(pack), correct);
  const trial = state.trial + 1;
  const correctCount = state.correctCount + (correct ? 1 : 0);
  // 1PL-lite ability update: nudge theta toward the item difficulty based on
  // the response; SE estimate shrinks with information accrued.
  const alpha = correct ? 0.15 : -0.15;
  const theta = state.theta + alpha * (1 + 0.2 * Math.abs(item.difficulty - state.theta));
  const se = Math.max(pack.staircase.stopSe, 1.0 / Math.sqrt(trial));
  const finished = se <= pack.staircase.stopSe || trial >= pack.staircase.maxTrials;
  return {
    ...state,
    staircase,
    trial,
    theta,
    se,
    administered: [...state.administered, item.id],
    correctCount,
    finished,
    stopReason: finished ? (se <= pack.staircase.stopSe ? 'se-stop' : 'budget') : undefined,
  };
}

/** Form assignment per retest policy (alternate across sessionCount). */
export function assignForm(pack: MeasurementPack, sessionCount: number): string {
  if (!pack.retestPolicy.alternateForms) return pack.forms[0]!.id;
  return pack.forms[sessionCount % pack.forms.length]!.id;
}

// ---------------------------------------------------------------------------
// Psychometric report (the scoring harness — 40 §4.4.2)
// ---------------------------------------------------------------------------

export interface PackSessionRecord {
  readonly sessionId: string;
  readonly formId: string;
  readonly theta: number;
  readonly se: number;
  readonly trials: number;
  readonly correctCount: number;
  readonly itemIds: readonly string[];
  readonly completedAtMs: number;
}

export interface PackPsychometrics {
  readonly packId: string;
  readonly sessionCount: number;
  /** Windowed test–retest correlation (undefined until ≥ 3 sessions). */
  readonly retestR?: number;
  /** Max |theta| gap between forms (parallel-forms effect). */
  readonly formEffect: number;
  /** Mean accuracy = crude internal-consistency proxy (split-half on trials). */
  readonly internalConsistency: number;
  /** Item exposure stats across sessions. */
  readonly exposure: Readonly<Record<string, number>>;
  readonly provisional: boolean;
}

export function computePsychometrics(pack: MeasurementPack, records: readonly PackSessionRecord[]): PackPsychometrics {
  const exposure: Record<string, number> = {};
  for (const r of records) {
    for (const id of r.itemIds) exposure[id] = (exposure[id] ?? 0) + 1;
  }
  const formThetas = new Map<string, number[]>();
  for (const r of records) {
    formThetas.set(r.formId, [...(formThetas.get(r.formId) ?? []), r.theta]);
  }
  let formEffect = 0;
  const forms = [...formThetas.keys()].sort();
  for (let i = 0; i < forms.length; i++) {
    for (let j = i + 1; j < forms.length; j++) {
      const meanA = mean(formThetas.get(forms[i]!) ?? []);
      const meanB = mean(formThetas.get(forms[j]!) ?? []);
      formEffect = Math.max(formEffect, Math.abs(meanA - meanB));
    }
  }
  // Test–retest: correlate session order with theta stability — Pearson r
  // between consecutive-session theta pairs (windowed, honest on small n).
  let retestR: number | undefined;
  if (records.length >= 3) {
    const thetas = records.map((r) => r.theta);
    const xs = thetas.slice(0, -1);
    const ys = thetas.slice(1);
    retestR = pearson(xs, ys);
  }
  const accuracy = records.length
    ? records.reduce((s, r) => s + r.correctCount / Math.max(1, r.trials), 0) / records.length
    : 0;
  return {
    packId: pack.id,
    sessionCount: records.length,
    retestR,
    formEffect,
    internalConsistency: accuracy,
    exposure,
    provisional: pack.provisionalUntil !== undefined,
  };
}

function mean(xs: readonly number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

function pearson(xs: readonly number[], ys: readonly number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i]! - mx, b = ys[i]! - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  return dx > 0 && dy > 0 ? num / Math.sqrt(dx * dy) : 0;
}

// ---------------------------------------------------------------------------
// Pack linter (40 §4.4.3 — the CI gate with teeth)
// ---------------------------------------------------------------------------

export interface PackLintIssue {
  readonly checkId: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
}

export function lintPack(pack: MeasurementPack): PackLintIssue[] {
  const issues: PackLintIssue[] = [];
  if (pack.forms.length < 2) {
    issues.push({ checkId: 'PK-1', severity: 'error', message: `pack has ${pack.forms.length} form(s); ≥ 2 parallel forms required` });
  }
  const itemIds = new Set(pack.items.map((i) => i.id));
  for (const form of pack.forms) {
    for (const fi of form.items) {
      if (!itemIds.has(fi.id)) {
        issues.push({ checkId: 'PK-2', severity: 'error', message: `form ${form.id} references unknown item ${fi.id}` });
      }
    }
  }
  const difficulties = pack.items.map((i) => i.difficulty);
  const span = Math.max(...difficulties) - Math.min(...difficulties);
  if (span < pack.staircase.maxLevel - pack.staircase.minLevel) {
    issues.push({ checkId: 'PK-3', severity: 'error', message: `difficulty span ${span.toFixed(2)} does not cover declared range [${pack.staircase.minLevel}, ${pack.staircase.maxLevel}]` });
  }
  // SE-stop achievability: se(n) = 1/sqrt(n) ≤ stopSe ⇒ n ≥ 1/stopSe².
  const trialsNeeded = Math.ceil(1 / (pack.staircase.stopSe * pack.staircase.stopSe));
  if (trialsNeeded > pack.staircase.maxTrials) {
    issues.push({ checkId: 'PK-4', severity: 'error', message: `SE-stop needs ${trialsNeeded} trials but budget is ${pack.staircase.maxTrials}` });
  }
  if (!pack.provisionalUntil) {
    issues.push({ checkId: 'PK-5', severity: 'warning', message: 'no provisionalUntil ceiling date — mature packs must have reliability data or an explicit flag' });
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Skill-theta stream integration (40 §4.2)
// ---------------------------------------------------------------------------

/**
 * Fold a completed session into the Significator's skillTheta map — the ONLY
 * sanctioned write path for pack results. Pure: returns a new map.
 */
export function integrateSkillTheta(
  streams: Readonly<Record<string, SkillThetaStream>> | undefined,
  pack: MeasurementPack,
  record: PackSessionRecord,
): Readonly<Record<string, SkillThetaStream>> {
  const prior = streams?.[pack.id];
  const next: SkillThetaStream = {
    theta: record.theta,
    se: record.se,
    lastMeasuredAtMs: record.completedAtMs,
    sessionCount: (prior?.sessionCount ?? 0) + 1,
    halfLifeMs: defaultHalfLifeFor(pack),
  };
  return { ...(streams ?? {}), [pack.id]: next };
}

/**
 * Pack-declared freshness half-life (40 §4.2): perceptual-motor skills decay
 * faster than vocabulary — mirror of the CCI per-line decay rationale.
 */
function defaultHalfLifeFor(pack: MeasurementPack): number {
  if (pack.id.startsWith('memory.')) return 14 * 86_400_000; // 14d
  if (pack.id.startsWith('cognition.')) return 30 * 86_400_000; // 30d
  if (pack.id.startsWith('language.')) return 90 * 86_400_000; // 90d
  if (pack.id.startsWith('coding.') || pack.id.startsWith('math.')) return 45 * 86_400_000; // 45d
  return 30 * 86_400_000;
}

/**
 * Freshness-weighted theta read: exponential decay toward unmeasured.
 * Orchestrator (27) consumes this the same way it reads line staleness.
 * Returns null when the stream has never been measured.
 */
export function readFreshTheta(stream: SkillThetaStream | undefined, now: number): number | null {
  if (!stream) return null;
  const age = Math.max(0, now - stream.lastMeasuredAtMs);
  const decay = Math.pow(0.5, age / stream.halfLifeMs);
  // Decayed streams pull toward the scale midpoint (uninformative prior).
  return stream.theta * decay;
}

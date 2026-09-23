/**
 * The polarity resolution loop — Phase 13 d10 L3 (`46 §4.3`'s falsifiable state, operationalized;
 * `43 §2`'s System-1 layer; the user's transmutation ruling).
 *
 * The ratified law: hard polarities do not reconcile in a single sweep — the development is
 * spiral, and forging a polarity into consciousness is a TRANSMUTATION process, not a
 * deterministic algorithm. So a resolution is a READING, not a verdict:
 *
 *   - the reading is a scored position on the cell's inclination/altitude/balance toward
 *     conscious/light vs unconscious/shadow, plus a direction of travel;
 *   - the local System-1 layer (a fast decision model behind `System1Reader`) PROPOSES the
 *     reading from the session log; the orchestrator RATIFIES or vetoes it (`43 §4.1`'s L4 —
 *     a proposal is never a self-committing write);
 *   - on ratification the reading moves the pair's reconciliation state the LONG way: repeated
 *     confirmations accumulate toward `reconciled`; a disconfirming reading re-opens the pair to
 *     `active-tension` and increments shadow severity on the cell's line (`16`'s Distortion
 *     Ledger) — which raises the next encounter's unfamiliar dosage (`45 §5.4`'s consumer);
 *   - every ratified reading profile-updates through the background workers (`43 §4.5b`) — the
 *     process reveals the player's tendencies and feeds them back.
 *
 * A cell is NEVER closed by this module: `polarityCoverage` reports the orthogonal-dimension
 * coverage a cell has been read across, and profiling completion is a coverage judgment, never a
 * counter. The state map and the ledger are the ONLY things a ratified reading may mutate, and
 * both mutations are bounded (state vocabulary is 46 §4.3's three states; severity moves at most
 * one increment per reading).
 */

import type { Line } from '../domain/Line.js';
import type { Stage as StageName } from '../domain/Stage.js';
import type { Modality } from '../domain/enums.js';
import { pairKeyOf, type PolarityStateMap } from './dialecticEngine.js';

// ── The reading ─────────────────────────────────────────────────────────────────────────────

/** Direction of travel on the conscious/shadow axis — the spiral's derivative, not a position. */
export type ReadingDirection = 'toward-conscious' | 'toward-shadow' | 'stationary';

/**
 * One polarity reading — a scored position, never a toggle.
 *
 * `position` ∈ [0,1]: 0 = the cell's balance sits unconscious/shadow, 1 = fully conscious/light.
 * `confidence` ∈ [0,1]: how much evidence the reading rests on (the rubric audit's RV discipline
 * applied to the loop: a low-confidence reading cannot move state — see `applyReading`).
 */
export interface PolarityReading {
  readonly cell: { readonly line: Line; readonly stage: StageName; readonly modality: Modality };
  /** The reconciliation pair the reading is about — canonical `a|b` key (`pairKeyOf`). */
  readonly pairKey: string;
  readonly position: number;
  readonly direction: ReadingDirection;
  readonly confidence: number;
  /** Evidence citations from the session log — a reading without evidence is not a reading (42's
   *  evidence-only law applied to the loop). */
  readonly evidence: readonly string[];
  /** Who produced the reading: the System-1 proposer, or the deterministic fallback. */
  readonly proposedBy: 'system1' | 'deterministic-fallback';
  readonly at: number;
}

/** The outcome of applying one reading — what the ratification mutated (or refused, and why). */
export interface ReadingApplication {
  readonly applied: boolean;
  readonly reason: string;
  readonly stateBefore: 'reconciled' | 'active-tension' | 'undiscovered';
  readonly stateAfter: 'reconciled' | 'active-tension' | 'undiscovered';
  /** Severity delta on the cell's line's shadow entries (bounded: −1, 0, or +1 per reading). */
  readonly severityDelta: 0 | 1 | -1;
  /** The pair's confirmation tally after this reading (the long way to `reconciled`). */
  readonly confirmations: number;
}

// ── The System-1 layer (43 §2) — propose, never commit ──────────────────────────────────────

/**
 * The System-1 proposer interface. The reference implementation is a Laya-shaped local decision
 * model (state + typed questions in one forward pass); ANY scorer behind this interface is
 * admissible, and the deterministic fallback below is always available (43 §2's boundaries: it
 * never authors content, never holds final authority, degrades quietly).
 */
export interface System1Reader {
  /** Propose a reading from the encounter's observable record. Pure; may return null when the
   *  record is insufficient — `null` is information, not an error. */
  proposeReading(record: EncounterRecord): PolarityReading | null;
}

/**
 * The deterministic fallback reader: derives the reading from the encounter's own outcome
 * counters — response consistency (did the player hold the pair's both poles?) and engagement
 * shape. No model, no randomness; it is the floor the loop stands on when no System-1 model is
 * wired (48 §4's optional-embedder law applied here).
 */
export function deterministicReading(record: EncounterRecord): PolarityReading {
  // Hold-quality: the encounter's own assessment of whether the player held BOTH poles of the
  // pair (the scaffold's structural measurement, 46 §5.2). Absent → 0.5 (stationary).
  const hold = record.pairHoldQuality ?? 0.5;
  const position = Math.min(1, Math.max(0, hold));
  const direction: ReadingDirection = hold > 0.55 ? 'toward-conscious' : hold < 0.45 ? 'toward-shadow' : 'stationary';
  const confidence = Math.min(1, record.evidence.length / 3); // three independent citations = full
  return {
    cell: record.cell,
    pairKey: record.pairKey,
    position,
    direction,
    confidence,
    evidence: record.evidence,
    proposedBy: 'deterministic-fallback',
    at: record.at,
  };
}

// ── The encounter record — what a reading may be derived FROM ───────────────────────────────

/** The observable record of one encounter (the System-1 layer's "state"). */
export interface EncounterRecord {
  readonly cell: { readonly line: Line; readonly stage: StageName; readonly modality: Modality };
  /** The pair the encounter served — canonical `a|b` key. */
  readonly pairKey: string;
  /** Which pole the encounter actually rendered (L2's decision, recorded at the seam). */
  readonly poleServed: 'familiar' | 'unfamiliar' | 'shadow-facing';
  /** 0..1 — did the player hold both poles? The scaffold's structural measurement, when the
   *  encounter carried one; absent means the fallback reads stationary (never fabricates). */
  readonly pairHoldQuality?: number;
  /** Evidence citations: encounter ids, log refs, signal names — traceable strings only. */
  readonly evidence: readonly string[];
  readonly at: number;
}

// ── Ratification + the bounded effects ──────────────────────────────────────────────────────

/** The long way to `reconciled`: this many consecutive confirming readings with confidence ≥
 *  CONFIRM_FLOOR. One sweep never reconciles — the transmutation ruling, as a constant. */
export const CONFIRMATIONS_TO_RECONCILE = 3;
export const CONFIRM_FLOOR = 0.5;
/** A reading below this confidence is recorded but moves nothing (RV discipline). */
export const APPLICATION_CONFIDENCE_FLOOR = 0.34;

/** Mutable tally map (pairKey → consecutive confirming readings). Rides the services record. */
export type ConfirmationTally = Record<string, number>;

export interface ApplyReadingInput {
  readonly reading: PolarityReading;
  /** Ratified? The orchestrator's L4 decision. An unratified reading is recorded, never applied. */
  readonly ratified: boolean;
  readonly states: PolarityStateMap;
  readonly tallies: ConfirmationTally;
  /** The player's active shadow entries on the cell's LINE — the disapproval targets. The caller
   *  supplies them read-only; the return carries the delta, the caller persists. */
  readonly shadows: readonly { readonly id: string; readonly line: Line; readonly resolvedAt: number | null }[];
}

/**
 * Apply (or refuse) one ratified reading. Bounded, total, and honest: every path returns a
 * `ReadingApplication` that names what moved and why. Laws:
 *   - unratified ⇒ recorded only (L4);
 *   - low confidence (< APPLICATION_CONFIDENCE_FLOOR) ⇒ recorded only;
 *   - `toward-conscious` + high confidence ⇒ tally++ ; tally reaching CONFIRMATIONS_TO_RECONCILE
 *     AND the pair being in active-tension ⇒ `reconciled` (the saturation guard's inverse —
 *     reaching reconciliation also RESETS the tally, so a future re-open starts clean);
 *   - `toward-shadow` + high confidence ⇒ re-open a reconciled pair to active-tension (46 §4.3's
 *     falsifiable state), reset the tally, and severity +1 on the line's active shadows;
 *   - `stationary` or low confidence ⇒ nothing moves (the spiral allows plateau).
 */
export function applyReading(input: ApplyReadingInput): ReadingApplication {
  const { reading, ratified, states, tallies } = input;
  const before = states[reading.pairKey] ?? 'undiscovered';
  const confirmed = reading.direction === 'toward-conscious' && reading.position >= CONFIRM_FLOOR;
  const disconfirmed = reading.direction === 'toward-shadow' && reading.position <= 1 - CONFIRM_FLOOR;

  if (!ratified) {
    return { applied: false, reason: 'not ratified (L4) — recorded only', stateBefore: before, stateAfter: before, severityDelta: 0, confirmations: tallies[reading.pairKey] ?? 0 };
  }
  if (reading.confidence < APPLICATION_CONFIDENCE_FLOOR) {
    return { applied: false, reason: `confidence ${reading.confidence.toFixed(2)} below floor ${APPLICATION_CONFIDENCE_FLOOR} — recorded only`, stateBefore: before, stateAfter: before, severityDelta: 0, confirmations: tallies[reading.pairKey] ?? 0 };
  }
  if (!confirmed && !disconfirmed) {
    return { applied: false, reason: 'stationary reading — the spiral allows plateau', stateBefore: before, stateAfter: before, severityDelta: 0, confirmations: tallies[reading.pairKey] ?? 0 };
  }

  if (confirmed) {
    const count = (tallies[reading.pairKey] ?? 0) + 1;
    tallies[reading.pairKey] = count;
    const onlyPairActive = before === 'active-tension' || before === 'reconciled';
    if (count >= CONFIRMATIONS_TO_RECONCILE && onlyPairActive && before !== 'reconciled') {
      tallies[reading.pairKey] = 0;
      (states as Record<string, 'reconciled' | 'active-tension' | 'undiscovered'>)[reading.pairKey] = 'reconciled';
      return { applied: true, reason: `${CONFIRMATIONS_TO_RECONCILE} consecutive confirmations — pair reconciled (46 §4.3)`, stateBefore: before, stateAfter: 'reconciled', severityDelta: 0, confirmations: 0 };
    }
    return { applied: true, reason: `confirmation ${count}/${CONFIRMATIONS_TO_RECONCILE} recorded`, stateBefore: before, stateAfter: before, severityDelta: 0, confirmations: count };
  }

  // Disconfirmed: re-open (falsifiable state) + severity +1 on the line's active shadows.
  tallies[reading.pairKey] = 0;
  (states as Record<string, 'reconciled' | 'active-tension' | 'undiscovered'>)[reading.pairKey] = 'active-tension';
  return {
    applied: true,
    reason: 'disconfirming reading — pair re-opened to active-tension; shadow severity +1 (45 §5.4 dosage tightens)',
    stateBefore: before,
    stateAfter: 'active-tension',
    severityDelta: 1,
    confirmations: 0,
  };
}

// ── The cell-never-closed coverage query ────────────────────────────────────────────────────

/** Coverage of ONE cell: which orthogonal dimensions have ratified readings touched, and how
 *  deeply. `dimensions` = the distinct pairs read on the cell; `readings` = total ratified
 *  readings; `robust` = the profiling-completion judgment — coverage across dimensions, never a
 *  bare counter (the plan's "test each cell against several orthogonal dimensions"). */
export interface PolarityCoverage {
  readonly cell: { readonly line: Line; readonly stage: StageName };
  readonly dimensions: readonly string[];
  readonly readings: number;
  /** ≥ MIN_DIMENSIONS_FOR_ROBUST distinct pairs AND ≥ MIN_READINGS_FOR_ROBUST ratified readings. */
  readonly robust: boolean;
}

export const MIN_DIMENSIONS_FOR_ROBUST = 3;
export const MIN_READINGS_FOR_ROBUST = 6;

/**
 * Aggregate the ratified reading log into per-cell coverage. A cell that has never been read is
 * `robust: false` — profiling stays open forever by default, exactly as the ruling demands.
 */
export function polarityCoverage(readings: readonly PolarityReading[]): readonly PolarityCoverage[] {
  const byCell = new Map<string, { cell: PolarityCoverage['cell']; dims: Set<string>; n: number }>();
  for (const r of readings) {
    const key = `${r.cell.line}:${r.cell.stage}`;
    const slot = byCell.get(key) ?? { cell: { line: r.cell.line, stage: r.cell.stage }, dims: new Set<string>(), n: 0 };
    slot.dims.add(r.pairKey);
    slot.n += 1;
    byCell.set(key, slot);
  }
  return [...byCell.values()]
    .map((s) => ({
      cell: s.cell,
      dimensions: [...s.dims].sort(),
      readings: s.n,
      robust: s.dims.size >= MIN_DIMENSIONS_FOR_ROBUST && s.n >= MIN_READINGS_FOR_ROBUST,
    }))
    .sort((a, b) => `${a.cell.line}:${a.cell.stage}`.localeCompare(`${b.cell.line}:${b.cell.stage}`));
}

// ── The rubric audit (the per-cell mechanical audit the user specified) ─────────────────────

/** One audit finding: a ratified reading that violated the rubric. */
export interface RubricViolation {
  readonly pairKey: string;
  readonly rule: 'evidence-cited' | 'bounded-state' | 'no-single-sweep' | 'bounded-severity';
  readonly detail: string;
}

/**
 * Audit a reading log against the four rubric rules (the plan's L3 audit spec):
 *   (a) every ratified reading cites evidence (evidence-only law);
 *   (b) every state mutation lands in 46 §4.3's three-state vocabulary (bounded state);
 *   (c) no single reading reconciles a pair from anything but confirmations-tally (no single
 *       sweep — a reading that jumps a pair to reconciled without the tally is a defect);
 *   (d) severity deltas are bounded to one increment per reading (bounded severity).
 * Pure over the log; the G35 gate runs it against a synthetic violating log and requires
 * detection.
 */
export function auditReadingLog(
  readings: readonly PolarityReading[],
  applications: readonly ReadingApplication[],
): readonly RubricViolation[] {
  const out: RubricViolation[] = [];
  for (const r of readings) {
    if (r.evidence.length === 0) {
      out.push({ pairKey: r.pairKey, rule: 'evidence-cited', detail: `reading at ${r.at} cites no evidence` });
    }
  }
  for (const a of applications) {
    if (a.stateAfter !== 'reconciled' && a.stateAfter !== 'active-tension' && a.stateAfter !== 'undiscovered') {
      out.push({ pairKey: '', rule: 'bounded-state', detail: `stateAfter "${String(a.stateAfter)}" is outside 46 §4.3's vocabulary` });
    }
    if (a.stateAfter === 'reconciled' && a.stateBefore !== 'reconciled' && a.confirmations !== 0) {
      out.push({ pairKey: '', rule: 'no-single-sweep', detail: 'pair reached reconciled without the confirmation tally resetting — inspect the tally bookkeeping' });
    }
    if (Math.abs(a.severityDelta) > 1) {
      out.push({ pairKey: '', rule: 'bounded-severity', detail: `severityDelta ${a.severityDelta} exceeds one increment` });
    }
  }
  return out;
}

/** Convenience: the canonical pair key for a cell's fluent/opposite pair (the caller passes the
 *  two tag ids the dialectic engine selected). */
export function pairKeyFor(surface: string, structure: string): string {
  return pairKeyOf(surface as never, structure as never);
}

/**
 * The session-end drain — polarity advance and the feed writes that close a session.
 *
 * Split out of `sessionRuntime.ts` (module-cohesion audit item 7) WITHOUT weakening the
 * single-seam rule (`M6`): `../sessionRuntime.ts` re-exports every symbol, so the seam is
 * still one import path for every caller. The split is a file change, not an interface change.
 */
import type { ConsequenceRecord } from '../../domain/ConsequenceRecord.js';
import { drain, hotSet, type OwnerWorkerPoolState } from '../../world/ownerWorkerPool.js';
import { appendOwnerWorkerEntry, appendSessionEntry, appendVerdictEntry, type ReportingFeed } from '../../orchestration/feedBridge.js';
import type { LogRef, Proposal, SessionSignals } from '../../orchestration/types.js';
import type { PolarityStateMap } from '.././dialecticEngine.js';
import { applyReading, deterministicReading, type EncounterRecord, type PolarityReading, type ReadingApplication, type ConfirmationTally } from '.././polarityResolution.js';
import type { OrchestrationServices } from './services.js';

// ── Session-end: feed + owner-worker drain ──────────────────────────────────────────────────

export interface SessionEndInput {
  readonly logRef: LogRef;
  readonly signals: SessionSignals;
  readonly proposals: readonly Proposal[];
  /** Encounter ids touched this session, for the worker hot-set (§4.1/§7.4). */
  readonly touchedHolonIds: readonly string[];
  readonly history: readonly ConsequenceRecord[];
  readonly now: number;
  /** The dialectic pair the composition selected (surface, structure ids) — Phase 11 d5. */
  readonly dialecticPair?: readonly [string, string] | null;
  /** The encounter's scored SERVICE-polarity direction (19/23) — the advance signal for d5. */
  readonly polarityDirection?: 'sto' | 'sts' | 'neutral';
  /** Phase 13 d10 L3 — the encounter's observable record for the polarity READING. When
   *  supplied (and a pair was selected), the System-1 layer (or the deterministic fallback)
   *  proposes a reading; it is RATIFIED here only when the caller says so (`ratifyReading`),
   *  and only a ratified reading moves state (46 §4.3's falsifiable state, L4 discipline). */
  readonly encounterRecord?: EncounterRecord;
  /** Ratify the proposed reading? Default false — a reading is recorded, never self-applied. */
  readonly ratifyReading?: boolean;
}

export interface SessionEndOutcome {
  /** Proposals the owner workers committed themselves (L2 — recorded on the feed, never ratified). */
  readonly ownerCommitted: number;
  /** Proposals left for L4 ratification. */
  readonly awaitingRatification: readonly Proposal[];
  /** The post-drain pool state — the caller persists this so profiles survive the process. */
  readonly workers: OwnerWorkerPoolState;
  /** The post-append feed — likewise carried/persisted by the caller (serializable entries). */
  readonly feed: ReportingFeed;
  /** The disposition list recorded for the session's proposals — G30's evidence surface. */
  readonly verdictRecorded: boolean;
  /** Phase 13 d10 L3 — the reading this session produced (proposed always when a record was
   *  supplied; applied only when ratified). Null when no record was supplied. */
  readonly polarityReading: PolarityReading | null;
  readonly polarityApplication: ReadingApplication | null;
}

// ── Polarity state advance (Phase 11 d5; 46 §5.2/§5.3 + MY-AD-0031) ────────────────────────

/**
 * Advance the player's dialectic pair-state map from one session's reconciliation evidence.
 *
 * The pair worked is the pair the composition SELECTED (surface ⟷ structure — the pair whose
 * active tension carried the encounter). The encounter's scored SERVICE-polarity (sto/sts/
 * neutral — a 19/23 concept, deliberately distinct from the reconciliation-polarity per
 * MY-AD-0031) is the advance signal:
 *
 * - `neutral`  → `undiscovered` pairs become `active-tension` (the work has begun — discovery);
 * - `sto`      → the pair advances one step further: `active-tension` → `reconciled` (service-
 *                oriented engagement is the integrative direction; MY-AD-0031's reading);
 * - `sts`      → no advance (self-serving engagement does not reconcile a dialectic pair).
 *
 * Saturation guard (46 §5.3): `reconciled` never regresses here, and a reconciled pair is
 * thereafter unselectable as a structural pole — the engine re-opens it only on refutation
 * evidence, which is not this writer's job. Pure function; sessionEnd assigns the result.
 */
export function advancePolarityStates(
  states: PolarityStateMap,
  pair: readonly [string, string] | null | undefined,
  direction: 'sto' | 'sts' | 'neutral' | undefined,
): PolarityStateMap {
  if (!pair || !direction) return states;
  const [a, b] = pair;
  if (a === b) return states; // reflexive-safe: origin tags carry no structural payload
  const key = a < b ? `${a}|${b}` : `${b}|${a}`;
  const current = states[key] ?? 'undiscovered';
  if (current === 'reconciled') return states; // saturation guard
  if (direction === 'sts') return states;      // no advance on self-serving engagement
  if (current === 'undiscovered') {
    // `sto` on an undiscovered pair: the work was integrative from the first encounter — count
    // it as discovery (active-tension), not instant reconciliation.
    return { ...states, [key]: 'active-tension' };
  }
  // current === 'active-tension', direction sto → reconciled.
  return { ...states, [key]: 'reconciled' };
}

/**
 * Session end (43 §4.6 + §5.5 W1/W2): append the session entry, drain the owner-worker pool over
 * the touched holons, advance the polarity state map (Phase 11 d5), and record the drain as a
 * worker entry. Deterministic; replay-safe (both writers are idempotent per unit of work — F3/W4).
 */
export function sessionEnd(
  services: OrchestrationServices,
  input: SessionEndInput,
): SessionEndOutcome {
  appendSessionEntry(services.feed, {
    logRef: input.logRef,
    signals: input.signals,
    proposals: input.proposals,
  });

  // Owner-worker drain: hot-set scoped, concurrency-capped, idempotent (22 §7.5 W4/W5).
  const warm = hotSet(services.holons, input.touchedHolonIds);
  const drainResult = drain(services.workers, warm, input.history, input.touchedHolonIds);

  // Polarity advance (Phase 11 d5): the pair the composition selected moves one step under the
  // saturation guard; the map is mutated-by-replacement like the worker pool so the caller's
  // checkpoint and the next envelope both see it.
  (services as { states: PolarityStateMap }).states = advancePolarityStates(
    services.states,
    input.dialecticPair,
    input.polarityDirection,
  );

  // Phase 13 d10 L3 — the polarity READING. The System-1 layer (services.system1) proposes from
  // the encounter record; absent a reader, the deterministic fallback proposes. The reading is
  // ALWAYS recorded (it is the coverage query's input and the background workers' evidence);
  // it moves state only when the caller ratified it AND it passes the confidence floor.
  let reading: PolarityReading | null = null;
  let application: ReadingApplication | null = null;
  if (input.encounterRecord && input.dialecticPair) {
    const proposed = services.system1
      ? services.system1.proposeReading(input.encounterRecord)
      : deterministicReading(input.encounterRecord);
    if (proposed) {
      reading = proposed;
      const tallies = { ...services.tallies };
      const states = { ...services.states };
      application = applyReading({
        reading: proposed,
        ratified: input.ratifyReading === true,
        states,
        tallies,
        shadows: [], // severity deltas land on the ledger via the caller's persistence path
      });
      (services as { tallies: ConfirmationTally }).tallies = tallies;
      (services as { states: PolarityStateMap }).states = states;
      (services as { readings: readonly PolarityReading[] }).readings = [...services.readings, proposed];
    }
  }

  // The drain returns a NEW state; the services record is mutable-by-replacement so the next
  // encounter's envelope and the caller's checkpoint both see the committed profiles.
  (services as { workers: OwnerWorkerPoolState }).workers = drainResult.state;

  const ownerCommitted = drainResult.proposals.length;
  void ownerCommitted;
  if (drainResult.proposals.length > 0 || Object.keys(drainResult.state.workers).length > 0) {
    appendOwnerWorkerEntry(services.feed, {
      jobId: `drain:${input.logRef.sessionId}`,
      startedAtMs: input.logRef.endedAtMs,
      endedAtMs: input.now,
      proposals: drainResult.proposals,
    });
  }

  // Writer 3 (Phase 11 d4 / G30 — verdict completeness): a session whose outcome is recorded on
  // the feed gets a disposition entry on the SAME feed. Engine-committed effects (processOutcome
  // / applyConsequences) and owner-committed deltas are the normal accepted classes; a session
  // with no ratifiable payload records an explicit empty verdict, so "every session has a
  // disposition" is checkable rather than assumed (F2: the feed is the only channel).
  // Idempotent per session (entry id is verdict:{sessionId}) — replay-safe like every writer.
  let verdictRecorded = false;
  try {
    const committed = input.proposals.filter((p) => p.kind === 'encounter_record' || p.kind === 'shadow_entry' || p.kind === 'mastery_evidence' || p.kind === 'pack_score');
    appendVerdictEntry(services.feed, {
      sessionId: input.logRef.sessionId,
      at: input.now,
      dispositions: committed.map((p) => ({
        kind: p.kind,
        accepted: true,
        reason: 'engine-committed via processOutcome/applyConsequences (L4 deterministic path)',
      })),
    });
    verdictRecorded = true;
  } catch {
    verdictRecorded = false; // the feed can never break the session (degradation law)
  }

  return {
    ownerCommitted,
    awaitingRatification: input.proposals,
    workers: drainResult.state,
    feed: services.feed,
    verdictRecorded,
    polarityReading: reading,
    polarityApplication: application,
  };
}

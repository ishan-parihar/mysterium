/**
 * Orchestrator tooling (doc 43 §4.3 core-loop toolset) — the delegation
 * surface exposed to the primary orchestrator's tool loop.
 *
 * New orchestrator tools:
 *   delegate_session     — validate + run a delegated session (live loop)
 *   read_session_log     — eager-read a session log by sessionId
 *   analyze_session_logs — deep analysis across logs for one role (43 §5.2)
 *   ratify_proposals     — the ONLY commit path onto the Significator (L4)
 *   schedule_presence    — council presence scheduling (43 §3.3, deterministic)
 *
 * Determinism: orchestration state (log store, presence) is carried in
 * DelegationLedgerState; the same inputs + seed reproduce the same run (G14).
 */
import type { Significator } from '../domain/Significator.js';
import type { WorldState } from '../engines/EncounterScheduler.js';
import type { SessionContext } from '../engines/PriorityComputation.js';
import { executeDelegatedSession, ratifyProposals, validateSpec } from './delegate.js';
import { fnv1a } from './sessionLog.js';
import type { DelegationRunContext, SpecViolation } from './delegate.js';
import { logsForRole, openSessionLog, closeSessionLog, emptySignals, persistSessionLog } from './sessionLog.js';
import type { SessionLog } from './sessionLog.js';
import type {
  AgentRole, DelegationResult, DelegationSpec, Proposal,
} from './types.js';

// ---------------------------------------------------------------------------
// Orchestrator state (carried by the caller; serializable for checkpointing)
// ---------------------------------------------------------------------------

export interface DelegationLedgerState {
  /** Append-only session logs (JSON strings). */
  readonly logs: readonly string[];
  /** Presence schedule per session (role order). */
  readonly presence: readonly AgentRole[];
}

export function emptyLedgerState(): DelegationLedgerState {
  return { logs: [], presence: [] };
}

// ---------------------------------------------------------------------------
// delegate_session
// ---------------------------------------------------------------------------

export interface DelegateSessionArgs {
  readonly spec: DelegationSpec;
  readonly sig: Significator;
  readonly world: WorldState;
  readonly session: SessionContext;
  readonly seed: string;
  readonly now: number;
  readonly ledger?: DelegationLedgerState;
  /** P1-LLM: optional LLM-backed choice policy; omit for the deterministic kernel path. */
  readonly choicePolicy?: import('./choicePolicy.js').ChoicePolicy;
}

export interface DelegateSessionOutcome {
  readonly ok: boolean;
  readonly violation?: SpecViolation;
  readonly result?: DelegationResult;
  readonly sig: Significator;
  readonly world: WorldState;
  /** Number of encounters the delegated session executed. */
  readonly encountersExecuted: number;
  readonly log: SessionLog;
  readonly ledger: DelegationLedgerState;
}

/**
 * Validate + execute a delegated session. The caller passes the CURRENT
 * sig/world; the returned sig/world carry the session's consequences forward
 * (encounters executed inside the delegation are real state transitions via
 * the live loop — the orchestrator did not hold the foreground while they
 * ran, but the state advanced through the same engine path as any session).
 *
 * P1-LLM: async because the underlying session execution may consult an
 * LLM-backed choice policy; without one, no awaits change the outcome.
 */
export async function delegateSession(args: DelegateSessionArgs): Promise<DelegateSessionOutcome> {
  const violation = validateSpec(args.spec);
  if (violation) {
    return {
      ok: false, violation,
      sig: args.sig, world: args.world, encountersExecuted: 0,
      log: emptySessionLogFor(args.spec, args.seed, 0),
      ledger: args.ledger ?? emptyLedgerState(),
    };
  }

  const runCtx: DelegationRunContext = {
    sig: args.sig, world: args.world, session: args.session, virtualNow: args.now,
    ...(args.choicePolicy ? { choicePolicy: args.choicePolicy } : {}),
  };
  const prior = args.ledger ?? emptyLedgerState();
  const seedCfg = { seed: args.seed, now: args.now, sessionIndex: prior.logs.length };

  const run = await executeDelegatedSession(args.spec, runCtx, seedCfg);
  const ledger: DelegationLedgerState = { ...prior, logs: persistSessionLog([...prior.logs], run.log) };

  return {
    ok: true,
    result: run.result,
    sig: run.sig,
    world: run.world,
    encountersExecuted: run.encountersExecuted,
    log: run.log,
    ledger,
  };
}

/** Placeholder log for rejected specs (so callers always get a shape back). */
function emptySessionLogFor(spec: DelegationSpec, seed: string, index: number): SessionLog {
  const { log } = openSessionLog(spec, seed, index, 0);
  return closeSessionLog(log, 0, 'recalled', emptySignals());
}

// ---------------------------------------------------------------------------
// read_session_log
// ---------------------------------------------------------------------------

export function readSessionLog(ledger: DelegationLedgerState, sessionId: string): SessionLog | null {
  for (const raw of ledger.logs) {
    try {
      const l = JSON.parse(raw) as SessionLog;
      if (l.sessionId === sessionId) return l;
    } catch { /* skip malformed */ }
  }
  return null;
}

// ---------------------------------------------------------------------------
// analyze_session_logs (43 §5.2)
// ---------------------------------------------------------------------------

export interface OrchestratorInsight {
  readonly role: AgentRole;
  readonly sessionsAnalyzed: number;
  readonly avgToolCalls: number;
  readonly budgetExhaustedRate: number;
  readonly handoffRate: number;
  /** Suspected causes worth orchestrator attention (joined view of notesList). */
  readonly notes: string;
  readonly notesList: readonly string[];
}

export function analyzeSessionLogs(ledger: DelegationLedgerState, role: AgentRole): OrchestratorInsight {
  const logs = logsForRole(ledger.logs, role);
  const n = logs.length;
  if (n === 0) {
    return { role, sessionsAnalyzed: 0, avgToolCalls: 0, budgetExhaustedRate: 0, handoffRate: 0, notes: 'no sessions', notesList: ['no sessions'] };
  }
  const avgToolCalls = logs.reduce((a, l) => a + l.budget.toolCallsUsed, 0) / n;
  const budgetExhaustedRate = logs.filter((l) => l.budget.endedBy === 'budget_exhausted').length / n;
  const handoffRate = logs.filter((l) => l.budget.endedBy === 'handoff').length / n;
  const notesList: string[] = [];
  if (budgetExhaustedRate > 0.5) notesList.push('budgets too small for this role — consider raising toolCallsMax');
  if (handoffRate > 0.5) notesList.push('role frequently produces no encounters — verify corpus resolution for its cells');
  if (avgToolCalls < 1) notesList.push('role executes almost no tools — check mandate relevance');
  return {
    role, sessionsAnalyzed: n, avgToolCalls, budgetExhaustedRate, handoffRate,
    notes: notesList.join('; ') || 'nominal',
    notesList: notesList.length > 0 ? notesList : ['nominal'],
  };
}

// ---------------------------------------------------------------------------
// ratify_proposals (the L4 commit path)
// ---------------------------------------------------------------------------

export interface RatifyArgs {
  readonly proposals: readonly Proposal[];
  readonly sig: Significator;
  readonly world: WorldState;
  readonly now: number;
  /**
   * Resolver for PURE-proposal encounter_records (proposals with
   * `committed !== true`, i.e. not already applied during a delegated
   * session). Typically backed by the scheduler's candidate pool.
   */
  readonly resolveEncounter?: (id: string) => import('../domain/EncounterSpecNew.js').ScheduledEncounter | undefined;
}

export interface RatifyOutcome {
  readonly sig: Significator;
  readonly world: WorldState;
  readonly dispositions: readonly { kind: Proposal['kind']; accepted: boolean; reason: string }[];
}

/**
 * Ratify a delegation result's proposals. Encounter resolution uses the
 * orchestrator's CURRENT world pool (the delegated session's encounters were
 * drawn from the live scheduler's pool — resolve by id).
 */
export function ratifyProposalsTool(args: RatifyArgs): RatifyOutcome {
  const resolver = args.resolveEncounter ?? (() => undefined);
  return ratifyProposals(args.proposals, args.sig, args.world, args.now, resolver);
}

// ---------------------------------------------------------------------------
// schedule_presence (43 §3.3 — deterministic council presence scheduling)
// ---------------------------------------------------------------------------

const PRESENCE_PRIORITY: Readonly<Record<AgentRole, number>> = {
  therapist: 0, // crisis-capable roles anchor the schedule
  J4: 1, J1: 2, J5: 3, J2: 4, J3: 5,
  T1: 6, T2: 7, T3: 8,
  A1: 9, A4: 10, A2: 11, A3: 12,
  S2: 13, S4: 14, S3: 15, S1: 16, S5: 17,
};

/**
 * Deterministically order council presence for a session. Base order follows
 * the canonical priority (therapy anchor → encounter delivery → teaching →
 * assessment → specialists); the seed applies a stable rotation so different
 * sessions don't always open with the same agent. Same seed ⇒ same schedule.
 */
export function schedulePresence(seed: string, roles: readonly AgentRole[]): readonly AgentRole[] {
  return [...roles].sort((a, b) => {
    const ha = fnv1a(`${seed}|${a}`);
    const hb = fnv1a(`${seed}|${b}`);
    if (ha !== hb) return ha < hb ? -1 : 1;
    return PRESENCE_PRIORITY[a] - PRESENCE_PRIORITY[b];
  });
}

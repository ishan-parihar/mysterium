/**
 * Session log store (doc 43 §4.4) — the append-only, structured record of
 * every delegated sub-agent session. The orchestrator's sensory organ:
 * `signals` is the eager-reading layer; the full record supports deep analysis.
 *
 * Determinism note: log ids derive from the delegation seed (same spec + seed
 * → same session id → reproducible orchestration, gate G14).
 */
import type {
  AgentRole, DelegationCell, DelegationOutcome, DelegationSpec,
  DelegatedTool, LogRef, Proposal, SessionSignals,
} from './types.js';

export interface TranscriptEntry {
  readonly t: number;
  readonly who: 'agent' | 'player' | 'system';
  readonly text: string;
}

export interface ToolCallRecord {
  readonly t: number;
  readonly tool: DelegatedTool;
  readonly ok: boolean;
  /** 43 §5.6 — why a call refused (a denied band read). A refusal is INFORMATION, never silent. */
  readonly note?: string;
}

export interface SessionLog {
  readonly sessionId: string;
  readonly delegationId: string;
  readonly agentRole: AgentRole;
  readonly cell?: DelegationCell;
  readonly purpose: string;
  readonly startedAtMs: number;
  readonly endedAtMs: number;
  readonly foreground: boolean;
  readonly transcript: readonly TranscriptEntry[];
  readonly toolCalls: readonly ToolCallRecord[];
  readonly proposals: readonly Proposal[];
  readonly signals: SessionSignals;
  readonly budget: Readonly<{ toolCallsUsed: number; toolCallsMax: number; endedBy: DelegationOutcome }>;
  /**
   * 43 §5.6 — the standing block this agent was deployed with (mandate / view / boundaries / tools
   * / session). Recorded on the log so an auditor can see exactly what the agent was given, rather
   * than inferring it from the transcript.
   */
  readonly standing?: readonly string[];
  /** 43 §4.2 — the personalization scope this role was bound to (`45 §6.1`); absent for S2/S5. */
  readonly councilScope?: string;
}

/** FNV-1a — stable id derivation from the delegation seed. */
export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function deriveSessionId(spec: DelegationSpec, seed: string, index: number): string {
  const cell = spec.cell ? `:${spec.cell.line}@${spec.cell.stage}` : '';
  return `dls-${fnv1a(`${spec.role}${cell}|${spec.purpose}|${seed}`)}-${index.toString(36)}`;
}

export function deriveDelegationId(spec: DelegationSpec, seed: string): string {
  const cell = spec.cell ? `:${spec.cell.line}@${spec.cell.stage}` : '';
  return `dlg-${fnv1a(`${spec.role}${cell}|${spec.purpose}|${seed}|dlg`)}`;
}

export function emptySignals(): SessionSignals {
  return { veilRisk: 0, distressSignal: 0, frustrationSignal: 0, progressDelta: 0, consentEvents: [] };
}

/** Entry point for building a log; the executor appends as it runs. */
export function openSessionLog(
  spec: DelegationSpec, seed: string, index: number, startedAtMs: number,
): { log: SessionLog; delegationId: string } {
  const sessionId = deriveSessionId(spec, seed, index);
  const delegationId = deriveDelegationId(spec, seed);
  return {
    delegationId,
    log: {
      sessionId, delegationId,
      agentRole: spec.role,
      cell: spec.cell,
      purpose: spec.purpose,
      startedAtMs, endedAtMs: startedAtMs,
      foreground: true,
      transcript: [], toolCalls: [], proposals: [],
      signals: emptySignals(),
      budget: { toolCallsUsed: 0, toolCallsMax: spec.budget.toolCallsMax, endedBy: 'completion' },
    },
  };
}

/** Pure append: returns a new log (no mutation — orchestration stays replayable). */
export function appendTranscript(log: SessionLog, entry: TranscriptEntry): SessionLog {
  return { ...log, transcript: [...log.transcript, entry] };
}

export function appendToolCall(log: SessionLog, record: ToolCallRecord): SessionLog {
  return { ...log, toolCalls: [...log.toolCalls, record], budget: { ...log.budget, toolCallsUsed: log.budget.toolCallsUsed + 1 } };
}

export function closeSessionLog(
  log: SessionLog, endedAtMs: number, endedBy: DelegationOutcome, signals: SessionSignals,
): SessionLog {
  return { ...log, endedAtMs, budget: { ...log.budget, endedBy }, signals };
}

/** The orchestrator's eager-read view: log → result (logRef + signals + proposals). */
export function toResult(log: SessionLog, outcome: DelegationOutcome): {
  outcome: DelegationOutcome; proposals: readonly Proposal[]; signals: SessionSignals; logRef: LogRef;
} {
  return {
    outcome,
    proposals: log.proposals,
    signals: log.signals,
    logRef: {
      sessionId: log.sessionId, delegationId: log.delegationId,
      startedAtMs: log.startedAtMs, endedAtMs: log.endedAtMs,
    },
  };
}

/** Persist a closed log (append-only store; dedupe by sessionId). */
export function persistSessionLog(store: string[], log: SessionLog): string[] {
  const withoutDup = store.filter((r) => {
    try {
      return (JSON.parse(r) as SessionLog).sessionId !== log.sessionId;
    } catch {
      return true;
    }
  });
  return [...withoutDup, JSON.stringify(log)];
}

/** Deep-analysis input: collect logs by role/cell for pattern memory (43 §5.3). */
export function logsForRole(store: readonly string[], role: AgentRole): SessionLog[] {
  return store
    .map((r) => { try { return JSON.parse(r) as SessionLog; } catch { return null; } })
    .filter((l): l is SessionLog => l !== null && l.agentRole === role);
}

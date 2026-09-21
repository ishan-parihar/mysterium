/**
 * The reporting feed — 43 §5.5 (`docs/foundations/43-agentic-orchestration-architecture.md`).
 *
 * One feed, one entry per unit of work: a session and a background job append the SAME shape,
 * which is what makes "the orchestrator re-plans" a single code path instead of two.
 *
 * Feed laws (enforced here, not by convention):
 * - F1 Committed-not-observed: only `committed`/`rejected` verdicts are exposed to state readers
 *   (25 CCI, 16 §10.4 projections). Raw signals are visible only to the planning reader (27).
 * - F2 One feed, no side channels: this is the ONLY way a reader sees session outcome. Log-level
 *   analysis stays behind `analyze_session_logs` (§5.2) and is not offered here.
 * - F3 Replayable + idempotent: `append` with a duplicate id is a no-op returning the stored
 *   entry — a re-run cannot double-count a session (W4).
 * - F4 Forecast is the loop's only self-criticism: entries from the orchestrator's own loop must
 *   carry a `forecast`; the feed rejects an insight entry without one.
 */

import type { LogRef, Proposal, SessionSignals } from './types.js';

/** §5.4 job record reference (background worker unit of work). */
export interface WorkerJobRef {
  readonly jobId: string;
  readonly jobKind:
    | 'identity_profile_update' | 'consequence_propagation' | 'holon_npc_profile_refresh'
    | 'retention_theta_recompute' | 'reliability_collection' | 'corpus_registry_health'
    | 'log_compaction' | 'trend_pattern_mining';
  readonly startedAtMs: number;
  readonly endedAtMs: number;
}

/** §5.2 — what 27 predicted before the unit of work vs what the signals show after. */
export interface FeedForecast {
  readonly expected: string;
  readonly observed: string;
  readonly deviation: number;
}

export interface FeedEntry {
  readonly id: string;
  readonly at: number;
  readonly source: 'session' | 'worker' | 'ratification' | 'orchestrator';
  readonly ref: LogRef | WorkerJobRef;
  readonly signals?: SessionSignals;
  readonly proposals: readonly Proposal[];
  /** World-side deltas committed by a holon's owner-worker under W2 — recorded here, never ratified here. */
  readonly proposalsOwnerCommitted?: readonly Proposal[];
  /** Ratification verdict — which proposals committed, which were rejected and why. */
  readonly verdict?: Readonly<{ committed: readonly string[]; rejected: readonly (readonly [string, string])[] }>;
  /** §5.2 insight findings — the orchestrator is logged like any agent. */
  readonly insight?: Readonly<{ suspectedCauses: readonly string[]; evidence: readonly string[]; recommendedPlanDeltas: readonly string[] }>;
  readonly forecast?: FeedForecast;
}

export type ProposalId = string;

/** The three readers of 43 §5.5. Each sees a purpose-scoped projection of the feed. */
export type FeedReader = 'planning' | 'cci' | 'projection';

export interface ReportingFeed {
  /** Writer (session end / worker / ratification / orchestrator loop). Idempotent per entry id (F3). */
  append(entry: FeedEntry): FeedEntry;
  readonly entries: readonly FeedEntry[];
  /** Reader projections (F1/F2). */
  read(reader: FeedReader): readonly FeedEntry[];
}

/** Entries a reader may see, per the writer/reader table of 43 §5.5. */
function visibleTo(entry: FeedEntry, reader: FeedReader): boolean {
  switch (reader) {
    case 'planning':
      // 27 reads progressDelta + forecast.deviation — signals and forecasts are its input.
      return entry.source === 'session' || entry.source === 'worker' || entry.source === 'orchestrator';
    case 'cci':
      // 25 reads COMMITTED evidence only — never raw signals (F1).
      return (entry.source === 'ratification' && (entry.verdict?.committed.length ?? 0) > 0) ||
             (entry.source === 'worker' && (entry.proposalsOwnerCommitted?.length ?? 0) > 0);
    case 'projection':
      // 16 §10.4 → 33 §7: committed state only, purpose-scoped, consent re-checked at render (F1).
      return (entry.source === 'ratification' && (entry.verdict?.committed.length ?? 0) > 0) ||
             (entry.source === 'worker' && (entry.proposalsOwnerCommitted?.length ?? 0) > 0);
  }
}

/** Projection a reader receives: F1 strips signals from state readers. */
function project(entry: FeedEntry, reader: FeedReader): FeedEntry {
  if (reader === 'planning') return entry;
  const { signals: _signals, ...rest } = entry;
  return rest as FeedEntry;
}

export function createReportingFeed(): ReportingFeed {
  const byId = new Map<string, FeedEntry>();
  const ordered: FeedEntry[] = [];

  return {
    append(entry: FeedEntry): FeedEntry {
      // F3 — idempotency: replay yields the same entry, not a second one.
      const existing = byId.get(entry.id);
      if (existing) return existing;
      // F4 — the orchestrator's own loop must carry its self-criticism.
      if (entry.source === 'orchestrator' && entry.forecast === undefined) {
        throw new Error('feed law F4: an orchestrator-loop entry must carry a forecast (43 §5.5)');
      }
      // Sessions carry signals; workers carry proposals — both may carry either, but the
      // ratification writer's job is the verdict.
      byId.set(entry.id, entry);
      ordered.push(entry);
      return entry;
    },
    entries: ordered,
    read(reader: FeedReader): readonly FeedEntry[] {
      return ordered.filter((e) => visibleTo(e, reader)).map((e) => project(e, reader));
    },
  };
}

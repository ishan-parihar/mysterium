/**
 * The reporting-feed bridge — 43 §5.5's four writers as the ONE surface the orchestration flow
 * calls. The feed (reportingFeed.ts) owns the record and its laws; this module owns WHERE the
 * writers attach in the orchestrator's flow, so "the orchestrator re-plans" is a single code path:
 *
 *   session end (§4.6)     → appendSessionEntry     (signals + the session's proposals)
 *   a background worker    → appendWorkerEntry      (worker proposals + owner-committed deltas)
 *   ratification (L4)      → appendVerdictEntry     (which proposals committed, which rejected, why)
 *   the orchestrator loop  → appendInsightEntry     (findings; MUST carry a forecast — law F4)
 *
 * Every writer is idempotent per entry id (F3): the ids are derived deterministically from the
 * unit of work (sessionId / jobId), so a replayed session cannot double-count.
 *
 * F1/F2 stay structural: readers see only what reportingFeed.read() projects — committed verdicts
 * for CCI/projections, signals+forecasts for planning. Nothing else reads session logs.
 */

import { createReportingFeed, type FeedEntry, type FeedForecast, type ReportingFeed, type WorkerJobRef } from './reportingFeed.js';
import type { LogRef, Proposal, SessionSignals } from './types.js';
import type { OwnerProposal } from '../world/ownerWorker.js';

export type { ReportingFeed, FeedEntry, FeedForecast, WorkerJobRef };

/** The shared feed instance shape the orchestrator carries (serializable entries for checkpoint). */
export function newFeed(): ReportingFeed {
  return createReportingFeed();
}

/** Deterministic idempotency key (W4): same unit of work ⇒ same entry id. */
function entryId(parts: readonly (string | number)[]): string {
  return parts.join(':');
}

// ── Writer 1: session end (§4.6) ────────────────────────────────────────────

export function appendSessionEntry(
  feed: ReportingFeed,
  parts: {
    readonly logRef: LogRef;
    readonly signals: SessionSignals;
    readonly proposals: readonly Proposal[];
    readonly forecast?: FeedForecast;
  },
): FeedEntry {
  return feed.append({
    id: entryId(['session', parts.logRef.sessionId]),
    at: parts.logRef.endedAtMs,
    source: 'session',
    ref: parts.logRef,
    signals: parts.signals,
    proposals: parts.proposals,
    ...(parts.forecast ? { forecast: parts.forecast } : {}),
  });
}

// ── Writer 2: a background worker (§5.4) ────────────────────────────────────

export function appendWorkerEntry(
  feed: ReportingFeed,
  parts: {
    readonly jobRef: WorkerJobRef;
    readonly proposals?: readonly Proposal[];
    /** Owner-committed L2 deltas (22 §7.5 W2) — recorded here, never ratified here. */
    readonly proposalsOwnerCommitted?: readonly Proposal[];
  },
): FeedEntry {
  return feed.append({
    id: entryId(['worker', parts.jobRef.jobId]),
    at: parts.jobRef.endedAtMs,
    source: 'worker',
    ref: parts.jobRef,
    proposals: parts.proposals ?? [],
    ...(parts.proposalsOwnerCommitted ? { proposalsOwnerCommitted: parts.proposalsOwnerCommitted } : {}),
  });
}

/**
 * Owner-worker drain → worker entry (22 §7.5 + 43 §5.5 W2). The pool's owner-committed L2 deltas
 * and player-facing proposals become ONE feed entry for the drain job: deltas ride as
 * `proposalsOwnerCommitted` (recorded, never ratified here), player-facing reads ride as
 * `proposals` awaiting L4. Idempotent per drain job id (W4).
 */
export function appendOwnerWorkerEntry(
  feed: ReportingFeed,
  parts: {
    readonly jobId: string;
    readonly startedAtMs: number;
    readonly endedAtMs: number;
    readonly proposals: readonly OwnerProposal[];
  },
): FeedEntry {
  const toFeed = (p: OwnerProposal): Proposal => ({ kind: p.kind, payload: p.payload, rationale: p.rationale });
  return feed.append({
    id: entryId(['worker', parts.jobId]),
    at: parts.endedAtMs,
    source: 'worker',
    ref: { jobId: parts.jobId, jobKind: 'holon_npc_profile_refresh', startedAtMs: parts.startedAtMs, endedAtMs: parts.endedAtMs },
    proposals: parts.proposals.map(toFeed),
    proposalsOwnerCommitted: [],
  });
}

// ── Writer 3: ratification (L4) ─────────────────────────────────────────────

export interface RatificationDisposition {
  readonly kind: Proposal['kind'];
  readonly accepted: boolean;
  readonly reason: string;
}

export function appendVerdictEntry(
  feed: ReportingFeed,
  parts: {
    readonly sessionId: string;
    readonly at: number;
    readonly dispositions: readonly RatificationDisposition[];
    /** Stable ids for the proposal payloads ratified (payload hash is the caller's key). */
    readonly committedKeys?: readonly string[];
    readonly rejectedKeys?: readonly (readonly [string, string])[];
  },
): FeedEntry {
  const committed = parts.committedKeys
    ?? parts.dispositions.filter((d) => d.accepted).map((d, i) => `${d.kind}#${i}`);
  const rejected = parts.rejectedKeys
    ?? parts.dispositions.filter((d) => !d.accepted).map((d, i) => [`${d.kind}#${i}`, d.reason] as const);
  return feed.append({
    id: entryId(['verdict', parts.sessionId]),
    at: parts.at,
    source: 'ratification',
    ref: { sessionId: parts.sessionId, delegationId: 'ratification', startedAtMs: parts.at, endedAtMs: parts.at },
    proposals: [],
    verdict: { committed, rejected },
  });
}

// ── Writer 4: the orchestrator's own loop (§5.2) ────────────────────────────

export function appendInsightEntry(
  feed: ReportingFeed,
  parts: {
    readonly sessionId: string;
    readonly at: number;
    readonly insight: { readonly suspectedCauses: readonly string[]; readonly evidence: readonly string[]; readonly recommendedPlanDeltas: readonly string[] };
    /** F4 — the loop's self-criticism: what 27 expected vs what happened. REQUIRED. */
    readonly forecast: FeedForecast;
  },
): FeedEntry {
  return feed.append({
    id: entryId(['insight', parts.sessionId]),
    at: parts.at,
    source: 'orchestrator',
    ref: { sessionId: parts.sessionId, delegationId: 'orchestrator-loop', startedAtMs: parts.at, endedAtMs: parts.at },
    proposals: [],
    insight: parts.insight,
    forecast: parts.forecast,
  });
}

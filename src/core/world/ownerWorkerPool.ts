/**
 * The owner-worker POOL — 22 §7.5 scale law + MY-AD-0010 (one foreground orchestrator; menial
 * background work as workers W1–W5).
 *
 * - Hot-set only: workers are dispatched for holons inside the player's reach (§7.4 L2 — the
 *   §4.1 selection rule IS the hot-set rule). A cold holon's profile is simply not updated.
 * - Concurrency-capped and budgeted (W5): at most `maxConcurrent` workers commit per drain; the
 *   rest stay queued — no worker storm when a big session touches many holons.
 * - Idempotent (W4): each drain records the event count it applied per holon; replaying the same
 *   ledger against the same pool yields the same pool state, not double-applied deltas.
 * - Offline degradation: `drain` is a pure fold over the event ledger. No LLM, no wall clock —
 *   offline, the same fold IS the replay, and the world never forgets because a worker didn't run.
 *
 * The pool does NOT touch the player's record: everything player-facing leaves as OwnerProposals
 * for the orchestrator to ratify through L4 (§7.5 orchestrator boundary), and owner-committed L2
 * deltas reach the reporting feed only as `proposalsOwnerCommitted` (43 §5.5 — recorded there,
 * never ratified there).
 */

import type { ConsequenceRecord } from '../domain/ConsequenceRecord.js';
import type { Holon } from './Holon.js';
import {
  createHolonProfile, commitEvents, isOwner,
  type HolonProfile, type OwnerProposal,
} from './ownerWorker.js';

export const DEFAULT_MAX_CONCURRENT = 4;

/** The state one owner worker holds for its holon (L2+L3). Serializable for checkpointing. */
export interface WorkerState {
  readonly holonId: string;
  readonly profile: HolonProfile;
}

export interface OwnerWorkerPoolState {
  readonly workers: Readonly<Record<string, WorkerState>>;
  /** Queued holon ids that exceeded the concurrency cap this drain (deterministic order). */
  readonly queued: readonly string[];
}

export function createOwnerWorkerPoolState(): OwnerWorkerPoolState {
  return { workers: {}, queued: [] };
}

/**
 * The §4.1/§7.4 hot-set rule: a holon is warm iff the player recently encountered it. The caller
 * supplies the warm ids; the pool refuses to spawn workers outside them (fail-closed scope).
 */
export function hotSet(
  holons: readonly Holon[],
  recentHolonIds: readonly string[],
): readonly Holon[] {
  const warm = new Set(recentHolonIds);
  return holons.filter((h) => warm.has(h.id));
}

/**
 * Drain the event ledger into the pool. Pure: (state, holons, events, warmIds) → new state +
 * collected proposals. Deterministic order (holon id sort) so replay is byte-stable.
 */
export function drain(
  state: OwnerWorkerPoolState,
  holons: readonly Holon[],
  events: readonly ConsequenceRecord[],
  warmIds: readonly string[],
  opts: { readonly maxConcurrent?: number } = {},
): { readonly state: OwnerWorkerPoolState; readonly proposals: readonly OwnerProposal[] } {
  const maxConcurrent = opts.maxConcurrent ?? DEFAULT_MAX_CONCURRENT;
  const warm = new Set(warmIds);
  const byHolon = new Map<string, ConsequenceRecord[]>();
  for (const e of events) {
    for (const id of new Set(e.holonDeltas.map((d) => d.holonId))) {
      if (!byHolon.has(id)) byHolon.set(id, []);
      byHolon.get(id)!.push(e);
    }
  }

  const freshCandidates = [...byHolon.keys()]
    .filter((id) => warm.has(id) && holons.some((h) => h.id === id))
    .sort();
  // W5 backlog: previously-queued holons get priority so the cap cannot starve them forever.
  const queued = state.queued.filter((q) => freshCandidates.includes(q));
  const candidates = [...queued, ...freshCandidates.filter((c) => !queued.includes(c))];

  const workers = { ...state.workers };
  const proposals: OwnerProposal[] = [];
  const deferred: string[] = [];

  candidates.forEach((holonId, i) => {
    // W5 — concurrency cap: beyond the cap, the holon stays queued (applied next drain).
    if (i >= maxConcurrent) {
      deferred.push(holonId);
      return;
    }
    const holon = holons.find((h) => h.id === holonId)!;
    const existing = workers[holonId];
    // Single-writer law: an existing worker IS the owner; ownership is identity, not lookup.
    if (existing && !isOwner(existing.holonId, holonId)) return;
    // W4 idempotence: events already absorbed by this worker's profile are skipped — replaying
    // the full ledger re-applies nothing.
    const fresh = (existing?.profile.appliedEventCount ?? 0);
    const todo = (byHolon.get(holonId) ?? []).slice(fresh);
    if (todo.length === 0) return;
    const profile = existing?.profile ?? createHolonProfile(holon);
    const { profile: next, proposals: ps } = commitEvents(profile, todo);
    workers[holonId] = { holonId, profile: next };
    proposals.push(...ps);
  });

  return { state: { workers, queued: deferred }, proposals };
}

/** Read one holon's live profile (L2) — what the game agent's context reads before narrating. */
export function profileOf(state: OwnerWorkerPoolState, holonId: string): HolonProfile | undefined {
  return state.workers[holonId]?.profile;
}

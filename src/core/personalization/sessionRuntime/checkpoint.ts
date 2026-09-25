/**
 * The runtime checkpoint — capture and restore of everything a session carries.
 *
 * Split out of `sessionRuntime.ts` (module-cohesion audit item 7) WITHOUT weakening the
 * single-seam rule (`M6`): `../sessionRuntime.ts` re-exports every symbol, so the seam is
 * still one import path for every caller. The split is a file change, not an interface change.
 */
import { type OwnerWorkerPoolState } from '../../world/ownerWorkerPool.js';
import type { Proposal, SessionSignals } from '../../orchestration/types.js';
import type { PolarityStateMap } from '.././dialecticEngine.js';
import type { ProbeReading } from '.././probeSet.js';
import { type PolarityReading, type ConfirmationTally } from '.././polarityResolution.js';
import type { CompositionEvent } from '../diversityMonitor.js';
import type { OrchestrationServices } from './services.js';

// ── Restore (the checkpoint story: serialize entries + workers, rebuild services) ───────────

/** Serializable checkpoint of the runtime state (feed entries are plain objects by design). */
export interface RuntimeCheckpoint {
  readonly feedEntries: readonly {
    readonly id: string;
    readonly at: number;
    readonly source: 'session' | 'worker' | 'ratification' | 'orchestrator';
    readonly ref: unknown;
    readonly signals?: SessionSignals;
    readonly proposals?: readonly Proposal[];
    readonly proposalsOwnerCommitted?: readonly Proposal[];
    readonly verdict?: { readonly committed: readonly string[]; readonly rejected: readonly (readonly [string, string])[] };
    readonly insight?: { readonly suspectedCauses: readonly string[]; readonly evidence: readonly string[]; readonly recommendedPlanDeltas: readonly string[] };
    readonly forecast?: { readonly expected: string; readonly observed: string; readonly deviation: number };
  }[];
  readonly workers: OwnerWorkerPoolState;
  /** The dialectic pair-state map (46 §5.2) — rides the checkpoint (Phase 11 d5). */
  readonly states?: PolarityStateMap;
  /** Phase 13 d10 L3 — the reading log + confirmation tallies ride the checkpoint too. */
  readonly readings?: readonly PolarityReading[];
  readonly tallies?: ConfirmationTally;
  /** Phase 13 d5 — the probe readings made this session (validated + log-only), so the
   *  budget paces across a checkpoint restore correctly. */
  readonly probeReadings?: { readonly validated: readonly string[]; readonly logOnly: readonly string[] };
  /** Composition events retained by the runtime. Replayed on restore so a focused trajectory's
   *  per-cell entropy is cumulative across disk-restored sessions, not restarted at each session. */
  readonly compositionEvents?: readonly CompositionEvent[];
}

/** Capture the current runtime state for persistence. */
/**
 * Feed retention cap (48 §2, failure class LM-c — unbounded growth): the checkpoint retains the
 * most recent window of entries; older entries are not lost — they are COMPACTED into the
 * MemoryPage (trajectory prose, open threads, holon stances) before they scroll out. F3 replay
 * exactness holds within the window; the page is the summary of what the window dropped.
 */
export const MAX_CHECKPOINT_FEED_ENTRIES = 2000;

export function captureCheckpoint(
  services: OrchestrationServices,
  options: { readonly includeCompositionEvents?: boolean } = {},
): RuntimeCheckpoint {
  const window = services.feed.entries.length > MAX_CHECKPOINT_FEED_ENTRIES
    ? services.feed.entries.slice(-MAX_CHECKPOINT_FEED_ENTRIES)
    : services.feed.entries;
  return {
    feedEntries: window.map((e) => ({
      id: e.id,
      at: e.at,
      source: e.source,
      ref: e.ref,
      ...(e.signals ? { signals: e.signals } : {}),
      // Always serialize proposals: restore re-appends entries as-is, and a restored entry
      // without this required field would crash the NEXT captureCheckpoint (W4 round trip).
      proposals: e.proposals,
      ...(e.proposalsOwnerCommitted ? { proposalsOwnerCommitted: e.proposalsOwnerCommitted } : {}),
      ...(e.verdict ? { verdict: e.verdict } : {}),
      ...(e.insight ? { insight: e.insight } : {}),
      ...(e.forecast ? { forecast: e.forecast } : {}),
    })),
    workers: services.workers,
    states: services.states,
    readings: services.readings,
    tallies: services.tallies,
    probeReadings: {
      validated: services.probes.ledger.validatedReadings.map((r) => r.probeId),
      logOnly: services.probes.ledger.logOnlyReadings.map((r) => r.probeId),
    },
    ...(options.includeCompositionEvents
      ? { compositionEvents: services.telemetry.events.slice() }
      : {}),
  };
}

/**
 * Restore services from a checkpoint: a fresh services record with the feed replayed (F3 makes
 * replay exact — same ids yield the same entries, no duplicates) and the worker pool state
 * reattached. Unknown/foreign entries are refused (fail-closed) rather than silently dropped.
 */
export function restoreCheckpoint(
  services: OrchestrationServices,
  checkpoint: RuntimeCheckpoint,
): void {
  for (const e of checkpoint.feedEntries) {
    // Boundary normalization: a parsed checkpoint (or legacy save) may omit the required
    // `proposals` field — backfill it so the feed always holds valid entries (fail-closed
    // against silent corruption, MY-RG-0031 class).
    services.feed.append({ proposals: [], ...e } as never); // F3: replaying a known id is a no-op; unknown ids append
  }
  (services as { workers: OwnerWorkerPoolState }).workers = checkpoint.workers;
  if (checkpoint.states) {
    (services as { states: PolarityStateMap }).states = checkpoint.states;
  }
  if (checkpoint.readings) {
    (services as { readings: readonly PolarityReading[] }).readings = checkpoint.readings;
  }
  if (checkpoint.tallies) {
    (services as { tallies: ConfirmationTally }).tallies = checkpoint.tallies;
  }
  // Phase 13 d5: replay the probe ledger's played set so the per-session budget resumes from
  // the checkpoint rather than re-offering an already-answered probe.
  if (checkpoint.probeReadings) {
    const ledger = services.probes.ledger as unknown as { validatedReadings: ProbeReading[]; logOnlyReadings: ProbeReading[] };
    const at = Date.now();
    for (const id of checkpoint.probeReadings.validated) {
      const p = services.probes.ledger.probes.find((x) => x.id === id);
      if (p) ledger.validatedReadings.push({ probeId: p.id, pole: p.poleA, at, instrumentValidated: true });
    }
    for (const id of checkpoint.probeReadings.logOnly) {
      const p = services.probes.ledger.probes.find((x) => x.id === id);
      if (p) ledger.logOnlyReadings.push({ probeId: p.id, pole: p.poleA, at, instrumentValidated: false });
    }
  }
  if (checkpoint.compositionEvents) {
    for (const event of checkpoint.compositionEvents) services.telemetry.record(event);
  }
}

/** Proposals an owner worker emits (re-export for the orchestrator's ratification surface). */

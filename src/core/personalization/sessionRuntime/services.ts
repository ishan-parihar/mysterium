/**
 * The services factory and the state a runtime persists — what `createOrchestrationServices` wires.
 *
 * Split out of `sessionRuntime.ts` (module-cohesion audit item 7) WITHOUT weakening the
 * single-seam rule (`M6`): `../sessionRuntime.ts` re-exports every symbol, so the seam is
 * still one import path for every caller. The split is a file change, not an interface change.
 */
import type { Holon } from '../../world/Holon.js';
import type { TagStore } from '../../world/tags/dialectic.js';
import { createTagStore } from '../../world/tags/dialectic.js';
import { INITIAL_TAGS } from '../../world/tags/initialTags.js';
import { createOwnerWorkerPoolState, type OwnerWorkerPoolState } from '../../world/ownerWorkerPool.js';
import { type ReportingFeed } from '../../orchestration/feedBridge.js';
import { createReportingFeed } from '../../orchestration/reportingFeed.js';
import type { PoolCandidate } from '.././pooling.js';
import { seedCandidateLibrary, deriveNpcCandidates } from '.././candidateLibrary.js';
import type { PolarityStateMap } from '.././dialecticEngine.js';
import { deriveLibraryVariants } from '.././polarityIndex.js';
import { createCompositionTelemetry, type CompositionTelemetry } from '.././compositionTelemetry.js';
import { createProbeRuntime, type ProbeRuntime } from '.././probeRuntime.js';
import { composeSituationLibrary } from '.././compositionRuntime.js';
import { AUTHORED_PROBES } from '.././probeContent.js';
import { type PolarityReading, type ConfirmationTally, type System1Reader } from '.././polarityResolution.js';
import { sharedFacetStore } from './store.js';
import { type RuntimeCheckpoint, restoreCheckpoint } from './checkpoint.js';

// ── Services ────────────────────────────────────────────────────────────────────────────────

/** What the session runtime carries between encounters — serializable for checkpointing. */
export interface RuntimePersistedState {
  readonly feed: ReportingFeed;
  readonly workers: OwnerWorkerPoolState;
}

export interface OrchestrationServices {
  /** The reporting feed (43 §5.5) — created once, carried across the session's encounters. */
  readonly feed: ReportingFeed;
  /** The tag store (46 §4) — the dialectic vocabulary. */
  readonly tags: TagStore;
  /** The candidate library (45 §5) — derived from the facet store; see candidateLibrary.ts.
   *  Phase 13 d10 L1: carries the derived polarity variants (~sim / ~opp recolourings). */
  readonly library: readonly PoolCandidate[];
  /** Long-lived dialectic pair-state memory (46 §5) — the reconciliations already made. */
  readonly states: PolarityStateMap;
  /** The owner-worker pool state (22 §7.5) — per-holon L2/L3 profiles. */
  readonly workers: OwnerWorkerPoolState;
  /** The authored holon corpus — what workers own and what NPC candidates derive from. */
  readonly holons: readonly Holon[];
  /** Phase 13 d10 L3 — the ratified polarity-reading log (the coverage query's input). Read-only
   *  in practice: only `recordPolarityReading` appends, by replacement. */
  readonly readings: readonly PolarityReading[];
  /** The confirmation tallies behind the spiral's long way to `reconciled`. */
  readonly tallies: ConfirmationTally;
  /** The optional System-1 reader (43 §2) — when absent, the deterministic fallback proposes. */
  readonly system1?: System1Reader;
  /** Phase 13 d4 — the composition telemetry (46 §11): runtime composition events recorded at
   *  the envelope seam, evaluated on demand; defect reports reach the dev loop, never the player. */
  readonly telemetry: CompositionTelemetry;
  /** Phase 13 d5 — the probe runtime (47 §7): the offer/decline/record path for the authored
   *  probe set. Budget-paced per session; readings land in the validated or log-only band. */
  readonly probes: ProbeRuntime;
}

/** Build a fresh services record. `holons` seeds NPC derivation; empty is valid (no NPC candidates).
 *  `restore` (Phase 11 d1): a checkpoint captured from a previous process — the feed replays
 *  idempotently (F3), the worker pool and polarity states reattach, so cross-session memory
 *  survives the restart instead of dying with the process. */
export function createOrchestrationServices(holons: readonly Holon[] = [], restore?: RuntimeCheckpoint): OrchestrationServices {
  const base = seedCandidateLibrary(sharedFacetStore());
  const tags = createTagStore(INITIAL_TAGS);
  // Phase 13 d7 — the composition engine ROUTED (46 §7): Situation entities are instantiated
  // from the compiled facet store at service creation and join the scenario tier as the
  // `composed:` candidates. Cells with empty pulls compose nothing (degradation, never
  // fabrication); the authored seeds and the derived skeleton still carry them.
  const composed = composeSituationLibrary(sharedFacetStore(), tags);
  const services: OrchestrationServices = {
    feed: createReportingFeed(),
    tags,
    // Phase 13 d10 L1: the library is DERIVED — every cell gains familiar-capable and
    // unfamiliar-capable recolourings so the UDV's bands have something to order (W11's fix).
    library: deriveLibraryVariants([...base, ...composed.candidates, ...deriveNpcCandidates(holons)], tags),
    states: {},
    workers: createOwnerWorkerPoolState(),
    holons,
    readings: [],
    tallies: {},
    telemetry: createCompositionTelemetry({ now: () => Date.now() }),
    probes: createProbeRuntime(AUTHORED_PROBES),
  };
  if (restore) restoreCheckpoint(services, restore);
  return services;
}

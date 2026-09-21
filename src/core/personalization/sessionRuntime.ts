/**
 * The session runtime — the ONE surface where 43 §5.5's feed contract and 45 §5/§6's personalization
 * attach to a LIVE session. The orchestrator holds `OrchestrationServices | undefined` and calls
 * into here; it never imports the personalization/orchestration modules directly. One seam, one
 * doc-comment, degradation everywhere:
 *
 *  - no services   → the pre-personalization pipeline is the fallback (45 §5 degradation law);
 *  - empty library → the envelope degrades to an unpersonalized rank — never blocks a session;
 *  - no identity   → the UDV is empty-but-valid (consent firewall: only usable fields enter);
 *  - no holon      → the owner-worker drain is skipped — the world simply doesn't move this turn.
 *
 * Everything here is deterministic given its inputs (offline degradation: the same fold without a
 * live session), so a checkpoint replay reproduces the same feed entries and pool state.
 */

import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';
import type { Modality, ShadowQuadrant } from '../domain/enums.js';
import { ALL_LINES } from '../domain/Line.js';
import type { Significator } from '../domain/Significator.js';
import type { ConsequenceRecord } from '../domain/ConsequenceRecord.js';
import type { Holon } from '../world/Holon.js';
import type { FacetStore } from '../world/facets/FacetStore.js';
import type { TagStore } from '../world/tags/dialectic.js';
import { createTagStore } from '../world/tags/dialectic.js';
import { INITIAL_TAGS } from '../world/tags/initialTags.js';
import { createOwnerWorkerPoolState, drain, hotSet, type OwnerWorkerPoolState } from '../world/ownerWorkerPool.js';
import type { OwnerProposal } from '../world/ownerWorker.js';
import { appendOwnerWorkerEntry, appendSessionEntry, type ReportingFeed } from '../orchestration/feedBridge.js';
import { createReportingFeed } from '../orchestration/reportingFeed.js';
import type { LogRef, Proposal, SessionSignals } from '../orchestration/types.js';
import { projectUdv } from './udv.js';
import { pool } from './pooling.js';
import type { PoolCandidate } from './pooling.js';
import { buildScenarioContext, type ScenarioContext, type PooledRefs } from './scenarioContext.js';
import { initialTopicTagResolver, seedCandidateLibrary, deriveNpcCandidates } from './candidateLibrary.js';
import type { PolarityStateMap } from './dialecticEngine.js';
import { createFacetStore } from '../world/facets/FacetStore.js';
import facetsJson from '../world/facets/facets.json';

// ── Facet store (per-process singleton, same pattern as the runtime bridge) ─────────────────

let facetStoreSingleton: FacetStore | null = null;
export function sharedFacetStore(): FacetStore {
  if (!facetStoreSingleton) {
    const tagIds = new Set(INITIAL_TAGS.map((t) => t.id));
    facetStoreSingleton = createFacetStore(tagIds, (facetsJson as unknown as { facets: never }).facets as never);
  }
  return facetStoreSingleton;
}

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
  /** The candidate library (45 §5) — derived from the facet store; see candidateLibrary.ts. */
  readonly library: readonly PoolCandidate[];
  /** Long-lived dialectic pair-state memory (46 §5) — the reconciliations already made. */
  readonly states: PolarityStateMap;
  /** The owner-worker pool state (22 §7.5) — per-holon L2/L3 profiles. */
  readonly workers: OwnerWorkerPoolState;
  /** The authored holon corpus — what workers own and what NPC candidates derive from. */
  readonly holons: readonly Holon[];
}

/** Build a fresh services record. `holons` seeds NPC derivation; empty is valid (no NPC candidates). */
export function createOrchestrationServices(holons: readonly Holon[] = []): OrchestrationServices {
  const base = seedCandidateLibrary(sharedFacetStore());
  return {
    feed: createReportingFeed(),
    tags: createTagStore(INITIAL_TAGS),
    library: [...base, ...deriveNpcCandidates(holons)],
    states: {},
    workers: createOwnerWorkerPoolState(),
    holons,
  };
}

// ── Encounter-time: the personalization envelope ────────────────────────────────────────────

/** Consent-checked identity projection into the UDV (16 §2.1 → 45 §3). */
export interface IdentityProjectionInput {
  readonly fields?: Partial<Record<string, string>>;
  readonly usable?: readonly string[];
  readonly declaredInterests?: readonly string[];
  readonly aversions?: readonly string[];
}

/** The LLM-facing personalization block — qualitative prose only, no numbers, no stage labels. */
export interface PersonalizationBlock {
  readonly mode: string;
  readonly surface: string | null;
  readonly structure: string | null;
  readonly interestEcho: readonly string[];
  readonly pooledCount: number;
  readonly deferredCells: readonly string[];
}

/** Extract the active shadow quadrants from the significator's Distortion Ledger (16). */
function activeShadows(sig: Significator): readonly ShadowQuadrant[] {
  const out = new Set<ShadowQuadrant>();
  for (const e of sig.shadows.entries) {
    if (e.resolvedAt === null && e.severity > 0.2) out.add(e.quadrant);
  }
  return [...out];
}

/** Build the envelope for one encounter. Degrades to an unpersonalized rank, never throws. */
export function buildEnvelope(
  services: OrchestrationServices,
  sig: Significator,
  identity: IdentityProjectionInput | undefined,
  target: { readonly line: Line; readonly stage: Stage; readonly modality: Modality },
  purpose: string,
  veiled: readonly string[],
  now: number,
): {
  readonly context: ScenarioContext | null;
  readonly block: PersonalizationBlock | null;
} {
  // Consent-checked usable fields — the projector re-checks, but the caller declares the set.
  const usableFields = new Set(identity?.usable ?? []);
  const declaredInterests = (identity?.declaredInterests ?? []).map((topic) => ({
    topic,
    weight: 0.8,
    depth: 'working' as const,
    source: 'declared' as const,
  }));

  // Developmental inputs from engine state — stage ordinals per line (downgraded to bands inside
  // the projector; no stage label ever crosses the firewall — MY-AD-0020 §3).
  const stageOrdinals: Record<string, number> = {};
  const ladder = ['Infrared', 'Magenta', 'Red', 'Amber', 'Orange', 'Green', 'Teal', 'Turquoise'];
  for (const line of ALL_LINES) {
    const st = sig.altitudes[line];
    if (st) stageOrdinals[line] = ladder.indexOf(st);
  }

  const udv = projectUdv({
    usableFields,
    declaredInterests,
    developmental: {
      stageOrdinals: stageOrdinals as never,
      activeShadowQuadrants: activeShadows(sig),
    },
    purpose: [],
    aversions: identity?.aversions,
  });

  const result = pool(services.tags, udv, services.library, {
    mode: 'spiral',
    states: services.states,
    target,
    maxStratum: 0,
    playerDepth: 0,
    resolve: initialTopicTagResolver,
    now,
  });

  const pooledRefs: PooledRefs = {
    world: result.ranked.filter((c) => c.id.startsWith('world:')).map((c) => c.id),
    npcs: result.ranked.filter((c) => c.id.startsWith('npc:')).map((c) => c.id),
    scenarios: result.ranked.filter((c) => c.id.startsWith('scenario:')).map((c) => c.id),
  };

  const context = buildScenarioContext({
    udv,
    pooled: pooledRefs,
    analogicalBridge: null,
    catalystTarget: { ...target, purpose },
    veiled,
    poles: result.poles,
    entity: null,
  });

  const block: PersonalizationBlock = {
    mode: result.poles?.mode ?? 'spiral',
    surface: result.poles?.surface.label ?? null,
    structure: result.poles?.structure.label ?? null,
    interestEcho: udv.interests.slice(0, 4).map((i) => i.topic),
    pooledCount: result.ranked.length,
    deferredCells: result.deferrals.slice(0, 4).map((d) => `${d.cell.line}:${d.cell.stage}:${d.cell.modality}`),
  };

  return { context, block };
}

// ── Holon L3 digest block (22 §7.4) ─────────────────────────────────────────────────────────

/**
 * The worker digests for the encounter's holon — what generation consumes so an NPC "remembers"
 * the player (MY-AD-0009). Missing profile → empty list (a cold holon has no history; that is
 * correct, not an error).
 */
export function holonDigestBlock(services: OrchestrationServices, holonId: string | null): readonly string[] {
  if (!holonId) return [];
  const worker = services.workers.workers[holonId];
  if (!worker) return [];
  const holon = services.holons.find((h) => h.id === holonId);
  if (!holon) return [];
  const p = worker.profile;
  const hot = Object.entries(p.intensities)
    .filter(([k, v]) => (k.startsWith('rel:') || k.startsWith('drive:')) && (v > 0.65 || v < 0.35))
    .map(([k, v]) => `${k.includes(':') ? k.slice(k.indexOf(':') + 1) : k}=${v.toFixed(2)}`);
  const patterns = p.patterns.slice(-3).map((x) => x.kind);
  const out: string[] = [];
  out.push(`${holon.name} — ${holon.narrativeRole}`);
  if (hot.length > 0) out.push(`disposition shifted: ${hot.join(', ')}`);
  if (patterns.length > 0) out.push(`shared history: ${[...new Set(patterns)].join(', ')}`);
  return out;
}

// ── Session-end: feed + owner-worker drain ──────────────────────────────────────────────────

export interface SessionEndInput {
  readonly logRef: LogRef;
  readonly signals: SessionSignals;
  readonly proposals: readonly Proposal[];
  /** Encounter ids touched this session, for the worker hot-set (§4.1/§7.4). */
  readonly touchedHolonIds: readonly string[];
  readonly history: readonly ConsequenceRecord[];
  readonly now: number;
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
}

/**
 * Session end (43 §4.6 + §5.5 W1/W2): append the session entry, drain the owner-worker pool over
 * the touched holons, and record the drain as a worker entry. Deterministic; replay-safe (both
 * writers are idempotent per unit of work — F3/W4).
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

  // The drain returns a NEW state; the services record is mutable-by-replacement so the next
  // encounter's envelope and the caller's checkpoint both see the committed profiles.
  (services as { workers: OwnerWorkerPoolState }).workers = drainResult.state;

  const ownerCommitted = drainResult.proposals.length;
  if (drainResult.proposals.length > 0 || Object.keys(drainResult.state.workers).length > 0) {
    appendOwnerWorkerEntry(services.feed, {
      jobId: `drain:${input.logRef.sessionId}`,
      startedAtMs: input.logRef.endedAtMs,
      endedAtMs: input.now,
      proposals: drainResult.proposals,
    });
  }

  return {
    ownerCommitted,
    awaitingRatification: input.proposals,
    workers: drainResult.state,
    feed: services.feed,
  };
}

/** Proposals an owner worker emits (re-export for the orchestrator's ratification surface). */
export type { OwnerProposal };

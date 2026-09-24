// @script-status: wired — consumed by src/core/simulation/campaign.ts and scripts/cohort-run.ts.
/**
 * The campaign time-series — one row per session per persona, over the observables the architecture
 * actually claims.
 *
 * Spec: `docs/DEVELOPMENT-PLAN.md` §4 Phase 15 d3.
 *
 * ## Why this is a separate module from the kernel's `observables.ts`
 *
 * The kernel's `Observables` answers *"did the engine's state move as the gate expects"* over a
 * persona trajectory, and every field is derived from the Significator alone — because a kernel gate
 * must not depend on the personalization seam. This module answers a different question: *"what did
 * the live seam DO"*, which requires the services (the pool, the telemetry, the probe ledger, the
 * feed). Merging them would force the kernel to import the seam, which is the coupling `G2` exists to
 * prevent; so the kernel's `Observables` is REUSED as one field (`observables`) and this module adds
 * the seam's own record around it.
 *
 * ## The producer rule
 *
 * Every field below is read from a producer that exists. Where a declared observable has no runtime
 * producer at this seam, it is listed in `UNAVAILABLE_OBSERVABLES` and OMITTED from the row — never
 * emitted as `0`. A fabricated zero is indistinguishable from a measured zero, which is exactly the
 * defect class Phase 14 d2a recorded (`driveWeights.agency → undefined ?? 0` pinned four health
 * scores to 0.5 for every player) and the reason the d1 run's flat `driveFixation` had to be
 * investigated rather than assumed.
 */
import type { Significator } from '../domain/Significator.js';
import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';
import type { WorldState } from '../engines/CandidateGeneration.js';
import type { OrchestrationServices } from '../personalization/sessionRuntime.js';
import type { Observables } from '../validation/observables.js';
import { ENTROPY_FLOOR, MIN_COMPOSITIONS, cellEntropy } from '../personalization/diversityMonitor.js';
import { ALL_LINES } from '../domain/Line.js';

/**
 * Observables the plan names that have NO producer at the campaign seam.
 *
 * Listed rather than omitted silently, so a reader of the series knows the difference between "the
 * campaign measured this and it was zero" and "nothing produces this yet". Each entry says what
 * would be needed — this is the list d4's report should carry forward, not a list of TODOs.
 */
export const UNAVAILABLE_OBSERVABLES: Readonly<Record<string, string>> = {
  memoryPageSize:
    'the MemoryPage is built inside `buildEnvelope` and consumed by `memoryPageBlock`; neither is ' +
    'returned to the caller, so the campaign cannot read its size. Needs the envelope result to ' +
    'expose the page (or its block line count).',
  renderBudget:
    'the render budget is a property of the assembled prompt, which the orchestrator keeps private ' +
    '(`this.messages`); measuring it needs a prompt-size hook at the LLM seam.',
  engagementRegisterHits:
    'the register (`engagementRegister.ts`) records MECHANISMS at authoring time, not hits at ' +
    'runtime; there is no runtime accumulator to read, so a hit count would be invented.',
};

/** The composition stamp the orchestrator reports for one encounter. */
export interface CompositionStamp {
  readonly pole: 'familiar' | 'unfamiliar' | 'shadow-facing' | null;
  readonly candidateId: string | null;
  readonly pairKey: string | null;
  readonly proposedBy: 'system1' | 'deterministic-fallback' | null;
}

/** One encounter's provenance, as it appeared in the session. */
export interface EncounterProvenance {
  readonly cell: string;
  readonly modality: string;
  readonly tier: string;
  readonly executionMode: string;
  readonly polarityMode: string;
  /** Where the content came from, decoded from the candidate id (see `candidateSource`). */
  readonly candidateSource: CandidateSource;
  readonly pole: CompositionStamp['pole'];
  readonly isCurriculum: boolean;
  readonly isTraining: boolean;
}

export type CandidateSource =
  | 'composed' | 'npc' | 'authored-scenario' | 'authored-world'
  | 'scenario' | 'world' | 'recoloured-similar' | 'recoloured-opposite' | 'unknown';

/**
 * Decode a pool candidate id into its provenance.
 *
 * The ids are the pool's own vocabulary (`polarityIndex.ts` recolours with `~sim`/`~opp`;
 * `compositionRuntime.ts` prefixes `composed:`; `candidateLibrary.ts` uses `npc:`/`scenario-authored:`
 * /`world-authored:`/`scenario:`/`world:`). Decoding rather than re-deriving keeps the series
 * reporting the pool's actual decision — and if `deriveLibraryVariants` ever changes its id scheme,
 * this function is the one place that says so, rather than a report that silently reads `unknown`.
 */
export function candidateSource(candidateId: string | null): CandidateSource {
  if (!candidateId) return 'unknown';
  if (candidateId.includes('~sim')) return 'recoloured-similar';
  if (candidateId.includes('~opp')) return 'recoloured-opposite';
  if (candidateId.startsWith('composed:')) return 'composed';
  if (candidateId.startsWith('npc:')) return 'npc';
  if (candidateId.startsWith('scenario-authored:')) return 'authored-scenario';
  if (candidateId.startsWith('world-authored:')) return 'authored-world';
  if (candidateId.startsWith('scenario:')) return 'scenario';
  if (candidateId.startsWith('world:')) return 'world';
  return 'unknown';
}

export interface CampaignSeriesInput {
  readonly session: number;
  readonly persona: string;
  readonly sig: Significator;
  readonly world: WorldState;
  readonly observables: Observables;
  /** Undefined only if a caller builds a series without the seam — every campaign session has one. */
  readonly services?: OrchestrationServices;
  readonly provenance: readonly EncounterProvenance[];
}

/** One session's row. Every field name states the producer it came from. */
export interface CampaignSeriesRow {
  readonly session: number;
  readonly persona: string;
  /** The kernel's observables, unchanged — `cci`, `cciDims`, `driveWeights`, `driveFixation`, … */
  readonly observables: Observables;
  /** Per-line altitude and staleness. `thetaStaleness` is the kernel's; altitude is the raw state. */
  readonly altitudes: Readonly<Record<string, Stage>>;
  /** Shadow accumulation by quadrant, from the Significator's ledger. */
  readonly shadowsByQuadrant: Readonly<Record<string, number>>;
  readonly shadowsUnresolved: number;
  /** The encounter provenance this session produced, one entry per finalized encounter. */
  readonly provenance: readonly EncounterProvenance[];
  /** Share of encounters by candidate source — the composition's variety as the player saw it. */
  readonly candidateSourceShare: Readonly<Record<string, number>>;
  /** Share by pole served (`45 §5.4`) — the familiar/unfamiliar/shadow-facing split. */
  readonly poleShare: Readonly<Record<string, number>>;
  /** Composition entropy per cell plus the visibility-collapse verdict (`46 §11`). */
  readonly composition: {
    readonly eventCount: number;
    readonly knownCells: number;
    readonly perCell: Readonly<Record<string, { entropy: number; distinct: number; compositions: number; collapsed: boolean }>>;
    /** Cells below the entropy floor AND with enough compositions to call it — `diversityMonitor`'s
     *  two conditions, applied here so a report does not re-implement the threshold. */
    readonly collapsedCells: readonly string[];
    readonly pendingDefects: number;
  };
  /** The probe ledger's standing. `offers` is the budget-pacing denominator. */
  readonly probes: {
    readonly offered: number;
    readonly validated: number;
    readonly logOnly: number;
  };
  /** Feed entries by writer (`43 §5.5`) — council dispatches arrive as `orchestrator` entries. */
  readonly feed: Readonly<Record<string, number>>;
  readonly feedTotal: number;
  /** Polarity readings and the confirmation tallies behind them (`46 §4.3`). */
  readonly polarity: {
    readonly readings: number;
    readonly reconciled: number;
    readonly inProgress: number;
    readonly proposedBySystem1: number;
    readonly proposedByFallback: number;
    /** The pair-STATE map's census (`46 §4.3`'s falsifiable state). `discovered` counts
     *  `active-tension` pairs — the loop's evidence that the dialectic engine has an edge to
     *  select on. Zero here means the expansion dimension is dormant, not merely under-served. */
    readonly pairsDiscovered: number;
    readonly pairsReconciled: number;
    readonly pairKeys: readonly string[];
  };
  /** Holon relationship strength, so world-side causality is visible in the series. */
  readonly npcRelationships: number;
  /** The observables the plan names with no producer yet — carried so a report cannot mistake
   *  absence for a measured zero. */
  readonly unavailable: Readonly<Record<string, string>>;
}

function share(counts: ReadonlyMap<string, number>): Record<string, number> {
  let total = 0;
  for (const n of counts.values()) total += n;
  if (total === 0) return {};
  const out: Record<string, number> = {};
  for (const [k, n] of counts) out[k] = n / total;
  return out;
}

function tally<T>(xs: readonly T[], key: (x: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of xs) m.set(key(x), (m.get(key(x)) ?? 0) + 1);
  return m;
}

/**
 * Build one session's row.
 *
 * Pure: it reads the state it is handed and returns a row. It never mutates the services, which
 * matters because the campaign captures a checkpoint from the same services immediately afterwards —
 * a reporter with a side effect would have to be reasoned about in the restore path.
 */
export function buildSeriesRow(input: CampaignSeriesInput): CampaignSeriesRow {
  const { sig, services, provenance, observables } = input;

  const altitudes: Record<string, Stage> = {};
  for (const line of ALL_LINES) altitudes[line as Line] = sig.altitudes[line as Line];

  const shadowsByQuadrant: Record<string, number> = {};
  for (const entry of sig.shadows.entries) {
    const q = entry.quadrant ?? 'unknown';
    shadowsByQuadrant[q] = (shadowsByQuadrant[q] ?? 0) + 1;
  }

  // ── Composition: the telemetry's own monitors, not a second copy of their thresholds ────────
  let composition: CampaignSeriesRow['composition'] = {
    eventCount: 0, knownCells: 0, perCell: {}, collapsedCells: [], pendingDefects: 0,
  };
  let feed: Record<string, number> = {};
  let feedTotal = 0;
  let probes = { offered: 0, validated: 0, logOnly: 0 };
  let polarity: CampaignSeriesRow['polarity'] = {
    readings: 0, reconciled: 0, inProgress: 0, proposedBySystem1: 0, proposedByFallback: 0,
    pairsDiscovered: 0, pairsReconciled: 0, pairKeys: [],
  };

  if (services) {
    const events = services.telemetry.events;
    const perCell: Record<string, { entropy: number; distinct: number; compositions: number; collapsed: boolean }> = {};
    const collapsedCells: string[] = [];
    for (const cell of services.telemetry.knownCells) {
      const m = cellEntropy(events, cell);
      // `MIN_COMPOSITIONS` is the monitor's own noise floor: below it the measurement is not signal,
      // so a cell is not "collapsed" merely for having been composed once.
      const collapsed = m.compositions >= MIN_COMPOSITIONS && m.entropy < ENTROPY_FLOOR;
      perCell[cell] = { ...m, collapsed };
      if (collapsed) collapsedCells.push(cell);
    }
    composition = {
      eventCount: services.telemetry.eventCount,
      knownCells: services.telemetry.knownCells.length,
      perCell,
      collapsedCells,
      pendingDefects: services.telemetry.pending.length,
    };

    feed = share(tally(services.feed.entries, (e) => e.source));
    feedTotal = services.feed.entries.length;

    const probeIds = new Set(services.probes.ledger.probes.map((p) => p.id));
    probes = {
      offered: probeIds.size,
      validated: services.probes.ledger.validatedReadings.length,
      logOnly: services.probes.ledger.logOnlyReadings.length,
    };

    // The tallies are `pairKey → count` (`ConfirmationTally = Record<string, number>`), so "how
    // many pairs are confirmed" is a count of entries at or above the confirmation bar. The bar
    // itself lives in `polarityResolution.ts` and is deliberately not re-declared here — this reads
    // the tallies' SHAPE (present and non-zero), not a threshold, and the reconciliation verdict is
    // the state map's (`46 §4.3`).
    let reconciled = 0;
    let inProgress = 0;
    for (const n of Object.values(services.tallies)) {
      if (n > 0) reconciled++;
      else inProgress++;
    }
    const stateValues = Object.values(services.states);
    polarity = {
      readings: services.readings.length,
      reconciled,
      inProgress,
      proposedBySystem1: services.readings.filter((r) => r.proposedBy === 'system1').length,
      proposedByFallback: services.readings.filter((r) => r.proposedBy === 'deterministic-fallback').length,
      pairsDiscovered: stateValues.filter((v) => v === 'active-tension').length,
      pairsReconciled: stateValues.filter((v) => v === 'reconciled').length,
      pairKeys: Object.keys(services.states),
    };
  }

  return {
    session: input.session,
    persona: input.persona,
    observables,
    altitudes,
    shadowsByQuadrant,
    shadowsUnresolved: observables.shadowsUnresolved,
    provenance,
    candidateSourceShare: share(tally(provenance, (p) => p.candidateSource)),
    poleShare: share(tally(provenance, (p) => p.pole ?? 'none')),
    composition,
    probes,
    feed,
    feedTotal,
    polarity,
    npcRelationships: input.world.npcRelationships.length,
    unavailable: UNAVAILABLE_OBSERVABLES,
  };
}

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
  renderBudget:
    'STRUCTURALLY UNMEASURED, not missing instrumentation. A request budget has no single seam: ' +
    'the encounter loop sends `queryLLMWithTools` (a multi-turn tool loop, so one encounter is ' +
    'several requests of growing history), the fallback paths send `queryLLMStream` (single shots), ' +
    'and the WebUI sends a proxied body. Critically, the filtered prompt is knowable on the DIRECT ' +
    'path (which Veil-filters inside `LLMClient`) but NOT on the browser path — `queryLLMWithTools` ' +
    'returns to `proxyQueryLLMWithTools` BEFORE `filterInput` runs — so there is no post-Veil figure ' +
    'common to both, and any measurement taken at the orchestrator is a PRE-FILTER prompt that the ' +
    'transport then shrinks. The producer that would close this is a per-request counter in the ' +
    'transport layer, on both paths. Until then the honest reading is that counter (absent), never ' +
    'an encounter-count proxy labelled "requests".',
  engagementRegisterHits:
    'DELIBERATELY UNMEASURED, not missing instrumentation. The register (`engagementRegister.ts`) ' +
    'holds AUTHORING-TIME mechanism records and answers a policy question (`isMechanismAllowed`); it ' +
    'has no runtime event to count. The only runtime activity is the pole seam consulting the ' +
    'register (`poleDecision.ts`), which is policy evaluation — a gate consulted several times per ' +
    'encounter for one player-visible decision — and `poleShare`/candidate provenance already ' +
    'report what was actually SERVED. Counting consults would overcount; deriving "hits" from the ' +
    'pole mix would re-report a number the row already carries. A hit count becomes meaningful when ' +
    '45 §7.3 defines what a hit IS (a player-visible activation, not an authorization call); until ' +
    'then a counter here would be a number no reader could trust.',
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
  /** Raw pool id, retained so a missing stamp is distinguishable from an unrecognised scheme. */
  readonly candidateId: string | null;
  /** Whether the encounter carried a composition stamp, and whether its id was decodable. */
  readonly candidateStamp: CandidateStampStatus;
  readonly pole: CompositionStamp['pole'];
  readonly isCurriculum: boolean;
  readonly isTraining: boolean;
  /**
   * Which channel carried this encounter's drive stance (Phase 16 d2). `true` when the fixture's
   * declared-stance seam supplied the directionality, `false` when the orchestrator derived it from
   * its own evaluation. Recorded so a `driveFixation` reading is never attributed to the wrong
   * channel: the declaration can express the 4-quadrant × 4-drive model, the derivation cannot
   * (it emits at most one pathological signal per encounter).
   */
  readonly declaredStance: boolean;
}

export type CandidateSource =
  | 'composed' | 'npc' | 'authored-npc' | 'authored-scenario' | 'authored-world'
  | 'scenario' | 'world' | 'recoloured-similar' | 'recoloured-opposite' | 'unknown';

/** The reason a raw candidate id could not be attributed to a known source scheme. */
export type CandidateStampStatus = 'present' | 'missing' | 'unrecognised';

/**
 * Decode a pool candidate id into its provenance.
 *
 * The ids are the pool's own vocabulary (`polarityIndex.ts` recolours with `~sim`/`~opp`;
 * `compositionRuntime.ts` prefixes `composed:`; `candidateLibrary.ts` uses
 * `npc:`/`npc-authored:`/`scenario-authored:`/`world-authored:`/`scenario:`/`world:`. Decoding rather
 * than re-deriving keeps the series
 * reporting the pool's actual decision — and if `deriveLibraryVariants` ever changes its id scheme,
 * this function is the one place that says so, rather than a report that silently reads `unknown`.
 */
export function candidateSource(candidateId: string | null): CandidateSource {
  if (!candidateId) return 'unknown';
  if (candidateId.includes('~sim')) return 'recoloured-similar';
  if (candidateId.includes('~opp')) return 'recoloured-opposite';
  if (candidateId.startsWith('composed:')) return 'composed';
  if (candidateId.startsWith('npc-authored:')) return 'authored-npc';
  if (candidateId.startsWith('npc:')) return 'npc';
  if (candidateId.startsWith('scenario-authored:')) return 'authored-scenario';
  if (candidateId.startsWith('world-authored:')) return 'authored-world';
  if (candidateId.startsWith('scenario:')) return 'scenario';
  if (candidateId.startsWith('world:')) return 'world';
  return 'unknown';
}

export function candidateStampStatus(candidateId: string | null): CandidateStampStatus {
  if (candidateId === null) return 'missing';
  return candidateSource(candidateId) === 'unknown' ? 'unrecognised' : 'present';
}

/** One encounter's MemoryPage render cost, as measured at the envelope seam. */
export interface EncounterMemoryPage {
  /** Lines `memoryPageBlock` produced, before the Veil guard. */
  readonly blockLines: number;
  /** Characters those lines cost, before the Veil guard. */
  readonly blockChars: number;
  /** Lines that survived the Veil guard — what the prompt actually received. */
  readonly continuityLines: number;
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
  /**
   * Phase 16 d1 — the per-encounter measurements the orchestrator reported, one entry per finalized
   * encounter. Read from the result of the encounter that ran, never re-derived here.
   */
  readonly observablesMeasured?: readonly EncounterMeasurement[];
}

/** What ONE encounter actually cost at the two seams that can measure it. */
export interface EncounterMeasurement {
  /** The MemoryPage render for this encounter. Absent when the personalization seam did not run. */
  readonly memoryPage?: EncounterMemoryPage;
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
  /** Share of encounters by raw stamp status: present, missing, or unrecognised. */
  readonly candidateStampStatusShare: Readonly<Record<string, number>>;
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
  /**
   * Phase 16 d1 — what the MemoryPage and the LLM request actually cost this session.
   *
   * Aggregated, never invented: `encounters` is how many encounters contributed a page reading and
   * is the denominator for every mean here, so an unmeasured encounter is a smaller denominator
   * rather than a zero contributor. `maxBlockChars` is the series' standing render-headroom signal.
   * Null means the personalization seam produced no reading at all, which is a different fact from
   * a rendered page of zero lines.
   */
  readonly memoryPage: {
    /** How many encounters contributed a reading — the denominator for every mean below. */
    readonly encounters: number;
    readonly maxBlockLines: number;
    readonly maxBlockChars: number;
    readonly meanBlockChars: number;
    /** The lines that survived the Veil guard, i.e. what the prompt actually received. */
    readonly maxContinuityLines: number;
  } | null;
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

  // ── Phase 16 d1 — aggregate only readings the encounters actually produced ───────────────────
  // `null` is a load-bearing distinction: a session with no page measurement is not a page of size
  // zero, and a hermetic session with no LLM request is not a zero-character prompt. The count fields
  // preserve the denominator so a report can say "2 of 4 encounters reached this seam" rather than
  // silently averaging only the survivors.
  const pages = (input.observablesMeasured ?? [])
    .map((m) => m.memoryPage)
    .filter((p): p is EncounterMemoryPage => p !== undefined);
  const memoryPage = pages.length === 0
    ? null
    : {
        encounters: pages.length,
        maxBlockLines: Math.max(...pages.map((p) => p.blockLines)),
        maxBlockChars: Math.max(...pages.map((p) => p.blockChars)),
        meanBlockChars: pages.reduce((n, p) => n + p.blockChars, 0) / pages.length,
        maxContinuityLines: Math.max(...pages.map((p) => p.continuityLines)),
      };

  return {
    session: input.session,
    persona: input.persona,
    observables,
    altitudes,
    shadowsByQuadrant,
    shadowsUnresolved: observables.shadowsUnresolved,
    provenance,
    candidateSourceShare: share(tally(provenance, (p) => p.candidateSource)),
    candidateStampStatusShare: share(tally(provenance, (p) => p.candidateStamp)),
    poleShare: share(tally(provenance, (p) => p.pole ?? 'none')),
    composition,
    probes,
    feed,
    feedTotal,
    polarity,
    npcRelationships: input.world.npcRelationships.length,
    memoryPage,
    unavailable: UNAVAILABLE_OBSERVABLES,
  };
}

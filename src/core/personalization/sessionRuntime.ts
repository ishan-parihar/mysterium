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
import { appendOwnerWorkerEntry, appendInsightEntry, appendSessionEntry, appendVerdictEntry, type ReportingFeed } from '../orchestration/feedBridge.js';
import { shadowSeverityForLine } from './poleDecision.js';
import { createReportingFeed } from '../orchestration/reportingFeed.js';
import { buildMemoryPage, memoryPageBlock } from './memoryPage.js';
import { isBandedText } from '../memory/retrievalFirewall.js';
import type { LogRef, Proposal, SessionSignals } from '../orchestration/types.js';
import { projectUdv } from './udv.js';
import { pool } from './pooling.js';
import type { PoolCandidate } from './pooling.js';
import { buildScenarioContext, scopeForRole, ROLE_SCOPES, type ScenarioContext, type PooledRefs, type ScopedEnvelope, type CouncilRole } from './scenarioContext.js';
import { deriveBandSources, sessionDurationsFromFeed, preferenceFromHistory, type UdvBandSources } from './bandSources.js';
import { initialTopicTagResolver, seedCandidateLibrary, deriveNpcCandidates } from './candidateLibrary.js';
import type { PolarityStateMap } from './dialecticEngine.js';
import { SCENARIO_SEEDS, type ScenarioSeed } from './scenarioSeeds.js';
import { WORLD_SEEDS, type WorldSeed } from './worldSeeds.js';
import { NPC_SEEDS, type NpcSeed } from './npcSeeds.js';
import { contextualSeed } from './scenarioSeedVariants.js';
import { checkCoherence, type CoherenceDefect } from './stageCoherence.js';
import { deriveLibraryVariants } from './polarityIndex.js';
import { decidePole } from './poleDecision.js';
import {
  applyReading, deterministicReading, polarityCoverage,
  type EncounterRecord, type PolarityReading, type ReadingApplication, type ConfirmationTally,
  type System1Reader,
} from './polarityResolution.js';
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
}

/** Build a fresh services record. `holons` seeds NPC derivation; empty is valid (no NPC candidates).
 *  `restore` (Phase 11 d1): a checkpoint captured from a previous process — the feed replays
 *  idempotently (F3), the worker pool and polarity states reattach, so cross-session memory
 *  survives the restart instead of dying with the process. */
export function createOrchestrationServices(holons: readonly Holon[] = [], restore?: RuntimeCheckpoint): OrchestrationServices {
  const base = seedCandidateLibrary(sharedFacetStore());
  const tags = createTagStore(INITIAL_TAGS);
  const services: OrchestrationServices = {
    feed: createReportingFeed(),
    tags,
    // Phase 13 d10 L1: the library is DERIVED — every cell gains familiar-capable and
    // unfamiliar-capable recolourings so the UDV's bands have something to order (W11's fix).
    library: deriveLibraryVariants([...base, ...deriveNpcCandidates(holons)], tags),
    states: {},
    workers: createOwnerWorkerPoolState(),
    holons,
    readings: [],
    tallies: {},
  };
  if (restore) restoreCheckpoint(services, restore);
  return services;
}

// ── Encounter-time: the personalization envelope ────────────────────────────────────────────

/** Consent-checked identity projection into the UDV (16 §2.1 → 45 §3). */
export interface IdentityProjectionInput {
  readonly fields?: Partial<Record<string, string>>;
  readonly usable?: readonly string[];
  readonly declaredInterests?: readonly string[];
  readonly aversions?: readonly string[];
  /**
   * The remaining UDV bands (45 §3), assembled by the caller from its own stores — Phase 13 d1.
   * `purposes` from 39's active vows (`purposesFromVows`), `preference` from the profile +
   * play history (`preferenceFromHistory`), `observedInterests` from engagement
   * (`observedFromEngagement`), `constraints` from consented NFRs. Omit any of them and the band
   * degrades to its ratified default (45 §5); the analogy band is derived at this seam when absent.
   */
  readonly bands?: UdvBandSources;
}

/** The LLM-facing personalization block — qualitative prose only, no numbers, no stage labels. */
export interface PersonalizationBlock {
  readonly mode: string;
  readonly surface: string | null;
  readonly structure: string | null;
  readonly interestEcho: readonly string[];
  readonly pooledCount: number;
  readonly deferredCells: readonly string[];
  /** Phase 13 d10 L4: which pole this encounter serves — the register the rendering speaks in. */
  readonly pole: 'familiar' | 'unfamiliar' | 'shadow-facing' | null;
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
  /** The encounter's holonSource, when the encounter names one — coherence-checked here. */
  holonSource: string | null = null,
): {
  readonly context: ScenarioContext | null;
  readonly block: PersonalizationBlock | null;
  /** The authored contextual seed text for this (cell × modality), or null when unauthored. */
  readonly seedText: string | null;
  /** The authored world PLACE text for this cell, or null when unauthored. */
  readonly worldPlace: string | null;
  /** The authored persona VOICE for this cell (46 §2's NPC library), or null when unauthored. */
  readonly personaVoice: string | null;
  /** The [CONTINUITY] head (48 §3) — banded cross-session memory lines, Veil-filtered at this seam.
   *  Empty array on first boot (no history) or when every line fails the guard. */
  readonly continuity: readonly string[];
  /** The runtime coherence verdict: `blocked` means the holon was routed OUT of the prompt. */
  readonly coherenceBlocked: boolean;
  readonly coherenceDefects: readonly CoherenceDefect[];
  /**
   * 45 §6.1 council alignment, per role — Phase 13 d2. Every role receives its DECLARED band
   * subset and nothing else (structural absence, not nulling). The scenario-catalyst renders the
   * encounter; the assessment role is blind to interests/purpose/analogy by construction.
   */
  readonly scopes: Readonly<Record<CouncilRole, ScopedEnvelope>>;
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

  // Phase 13 d1 — the remaining UDV bands (45 §3). Every source is real engine state:
  //   purpose      ← 39's active vows, supplied by the caller (`purposesFromVows`)
  //   preference   ← the caller's profile/history, or the sessions already on the feed
  //                  (median duration → `sessionToleranceMin`; the in-seam source)
  //   analogy      ← DERIVED here from the interest graph + aversions (45 §5.4; `pooling` reads it)
  //   constraints  ← the caller's consented NFRs
  //   observed     ← the caller's engagement evidence (ranking weight only, 47 §3)
  // A caller's partial declaration merges OVER the feed-evidenced tolerance: what the player
  // declared beats what can be inferred, and an omitted field is evidenced rather than defaulted.
  const feedPreference = preferenceFromHistory({ sessions: sessionDurationsFromFeed(services.feed.read('planning')) });
  const declaredPreference = identity?.bands?.preference;
  const bands = deriveBandSources({
    declaredInterests,
    aversions: identity?.aversions,
    purposes: identity?.bands?.purposes,
    preference: {
      ...(declaredPreference?.sessionToleranceMin === undefined
        ? { sessionToleranceMin: feedPreference.sessionToleranceMin }
        : {}),
      ...(declaredPreference ?? {}),
    },
    constraints: identity?.bands?.constraints,
    observedInterests: identity?.bands?.observedInterests,
    analogy: identity?.bands?.analogy,
  });

  const udv = projectUdv({
    usableFields,
    declaredInterests,
    developmental: {
      stageOrdinals: stageOrdinals as never,
      activeShadowQuadrants: activeShadows(sig),
    },
    purpose: bands.purposes ?? [],
    analogy: bands.analogy,
    preference: bands.preference,
    constraints: bands.constraints,
    observedInterests: bands.observedInterests,
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

  // Phase 13 d10 L2 — the pole decision. The UDV's analogy band is the fluent set; the shadow
  // severity reads the significator's Distortion Ledger for the target line; the bridge's seed
  // budget is the unfamiliar floor (45 §5.4's consumer). The draw is derived from the encounter
  // target so the dosage is deterministic (43 §3.3: the seed reorders, never chooses).
  const severity = shadowSeverityForLine(
    sig.shadows.entries.map((e) => ({ line: e.line, resolvedAt: e.resolvedAt, severity: e.severity })),
    target.line,
  );
  const fluentIds = udv.analogy.fluentDomains.map((d) => d.domain).map(initialTopicTagResolver).filter((t): t is NonNullable<typeof t> => t !== undefined);
  const drawSeed = `${target.line}:${target.stage}:${target.modality}`;
  const draw = (([...drawSeed].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % 1000) / 1000);
  const decision = decidePole(services.tags, {
    candidates: result.ranked,
    target: { line: target.line },
    fluentTags: fluentIds,
    shadowSeverity: severity,
    seedNoveltyBudget: 0.25, // 45 §5.4's seed floor; play-data calibration is the shared deferral
    draw,
  });

  const pooledRefs: PooledRefs = {
    world: result.ranked.filter((c) => c.id.startsWith('world:')).map((c) => c.id),
    // Both the derived skeleton (`scenario:`) and the authored seed (`scenario-authored:`) are
    // scenario-tier renderings — the authored one ranks FIRST when tags tie because its situation
    // text is the cell's canon (the ranking bias applies within the tier).
    scenarios: result.ranked
      .filter((c) => c.id.startsWith('scenario:'))
      .sort((a, b) => (a.id.startsWith('scenario-authored:') ? -1 : 1) - (b.id.startsWith('scenario-authored:') ? -1 : 1))
      .map((c) => c.id),
    // Same authored-first bias within the NPC tier: the persona seed's prose is the cell's canon
    // (Phase 11 d7), the derived-from-holons skeleton fills the rest.
    npcs: result.ranked
      .filter((c) => c.id.startsWith('npc:'))
      .sort((a, b) => (a.id.startsWith('npc-authored:') ? -1 : 1) - (b.id.startsWith('npc-authored:') ? -1 : 1))
      .map((c) => c.id),
  };

  // The authored contextual seed for this (cell × modality) — the stage-coherent situation text.
  const seedText = contextualSeedBlock(target.line, target.stage, target.modality);

  // The authored world place for this cell — the stage the situation stands on (46 §2's world
  // library; the authored tier above facet composition).
  const worldPlace = worldPlaceBlock(target.line, target.stage);

  // The authored persona voice for this cell — the canonical figure of the NPC library (46 §2;
  // Phase 11 d7), the authored tier above the derived-from-holons skeleton.
  const personaVoice = personaVoiceBlock(target.line, target.stage);

  // The RUNTIME coherence gate: the encounter's holon is checked against the target cell. A
  // mismatch blocks the holon's digest from the prompt (routing, not canceling — 45 §5.2.1); the
  // defects ride the outcome so the caller feeds the dev loop.
  const coherence = coherenceGate(services, holonSource, target);

  const context = buildScenarioContext({
    udv,
    pooled: pooledRefs,
    analogicalBridge: null,
    catalystTarget: { ...target, purpose },
    veiled,
    poles: result.poles,
    entity: null,
    polarity: decision
      ? {
          pole: decision.pole,
          primary: decision.primary.id,
          alternates: decision.alternates.map((a) => a.id),
          reason: decision.reason,
        }
      : null,
    resolution: null, // stamped by recordPolarityReading at session end (d10 L3)
  });

  const block: PersonalizationBlock = {
    mode: result.poles?.mode ?? 'spiral',
    surface: result.poles?.surface.label ?? null,
    structure: result.poles?.structure.label ?? null,
    interestEcho: udv.interests.slice(0, 4).map((i) => i.topic),
    pooledCount: result.ranked.length,
    deferredCells: result.deferrals.slice(0, 4).map((d) => `${d.cell.line}:${d.cell.stage}:${d.cell.modality}`),
    pole: decision?.pole ?? null,
  };

  // 45 §6.1 — the council alignment, computed at the live seam for EVERY role. The scenario-
  // catalyst renders the encounter (it receives all bands); the assessment role receives the
  // developmental band and the catalyst target ONLY, so grading can never be conditioned on what
  // the player cares about (42 §1.1's firewall, now enforced on the live path rather than implied).
  const scopes: Record<CouncilRole, ScopedEnvelope> = {
    'scenario-catalyst': scopeForRole(context, 'scenario-catalyst'),
    'narrative-voice': scopeForRole(context, 'narrative-voice'),
    assessment: scopeForRole(context, 'assessment'),
    'curriculum-teacher': scopeForRole(context, 'curriculum-teacher'),
    safety: scopeForRole(context, 'safety'),
    healing: scopeForRole(context, 'healing'),
  };

  return {
    context,
    block,
    seedText,
    worldPlace,
    personaVoice,
    /** [CONTINUITY] head (48 §3): the cross-session standing memory, banded + Veil-guarded at
     *  this seam so a page built from older/foreign vocabulary can never reach the prompt (M4 —
     *  the render path carries its own guard; recall-time G31 is the second). Empty history →
     *  empty array → the pre-memory pipeline is the fallback (45 §5). Deterministic: rebuilt
     *  from committed feed state on every envelope (M5 view-not-store). */
    continuity: memoryPageBlock(buildMemoryPage(services.feed, services.workers, services.holons, now))
      .filter((line) => isBandedText(line)),
    coherenceBlocked: coherence.blocked,
    coherenceDefects: coherence.defects,
    scopes,
  };
}

/**
 * The fail-closed role-scope contract — 45 §6.1, Phase 13 d2's enforcement teeth.
 *
 * `scopeForRole` builds the scopes by construction, so a violation cannot be produced by the
 * sanctioned path. This check exists for the OTHER paths: a hand-assembled or future scope that
 * carries a band its role does not receive must fail LOUDLY here rather than leak into a sub-agent
 * prompt. G32 injects exactly such a scope and requires this to reject it.
 *
 * Returns the offending band names (empty = lawful). Never mutates, never throws for a lawful scope.
 */
export function scopeContractViolations(scope: ScopedEnvelope): readonly string[] {
  const contract = ROLE_SCOPES[scope.role];
  if (!contract) return ['unknown role'];
  const allowed = new Set<string>(contract.receives as readonly string[]);
  const present: readonly string[] = [
    scope.preference !== undefined ? 'preference' : '',
    scope.analogy !== undefined ? 'analogy' : '',
    scope.purpose !== undefined ? 'purpose' : '',
    scope.developmental !== undefined ? 'developmental' : '',
    scope.interests !== undefined ? 'interests' : '',
    scope.aversions !== undefined ? 'aversions' : '',
    scope.constraints !== undefined ? 'constraints' : '',
  ].filter((b) => b.length > 0);
  return present.filter((band) => !allowed.has(band));
}

/**
 * The assessment-facing line, rendered from the ASSESSMENT scope alone (Phase 13 d2).
 *
 * 45 §6.1 gives the assessment role `developmental` + the catalyst target, and nothing else: it
 * must never see the interest graph, the purpose statements, or the analogy internals, or grading
 * becomes conditioned on what the player cares about (42 §1.1's evidence-only firewall). This is
 * the live consumer of that scope — the orchestrator appends the returned line to its
 * assessment-facing prompt section.
 *
 * Fail-closed: a scope that violates its contract (or is not the assessment role) returns null, so
 * a hand-assembled leak renders as NOTHING rather than as a partial leak.
 */
export function assessmentScopeLine(scope: ScopedEnvelope): string | null {
  if (scope.role !== 'assessment') return null;
  if (scopeContractViolations(scope).length > 0) return null;
  const t = scope.catalystTarget;
  const bands = (scope.developmental?.lineAltitudeBand ?? [])
    .map((b) => `${b.line}:${b.band}`)
    .join(', ');
  // Bands + the encounter's own cell only — never the PLAYER's stage label, never an interest,
  // never a purpose statement (MY-AD-0020 §3's may-not-include list, applied to the metric-bearing
  // role; the cell's target stage is the module being assessed, not a claim about the player).
  return `[ASSESSMENT SCOPE] Banded placement (${bands || 'unplaced'}) · cell ${t.line}/${t.stage}/${t.modality} · target: ${t.purpose}`;
}

// ── Holon L3 digest block (22 §7.4) ─────────────────────────────────────────────────────────

/**
 * Coherence-check the encounter's holon against the target cell and return the live defect list.
 *
 * This is the RUNTIME half of the stage-coherence gate (46 §11 facet incoherence; 44 altitude
 * separation): the pool/composition path picks renderings, but the one component the orchestrator
 * names directly — the encounter's `holonSource` NPC — is checked HERE, at the seam, every
 * encounter. A mismatch is ROUTED, not canceled (45 §5.2.1): the defect is returned so the caller
 * can reach the dev loop, and the session proceeds — but the block that would have carried the
 * misaligned component's voice is withheld, so nothing incoherent reaches the prompt.
 *
 * NPC holons authored at a stage are load-bearing for their own cell; when the encounter targets
 * a different cell with the same holon, that is exactly the deviated-simulation shape the user's
 * requirement forbids — so the defect surfaces and the digest stays out of the prompt.
 */
export function coherenceGate(
  services: OrchestrationServices,
  holonId: string | null,
  target: { readonly line: Line; readonly stage: Stage; readonly modality: Modality },
): { readonly blocked: boolean; readonly defects: readonly CoherenceDefect[] } {
  if (!holonId) return { blocked: false, defects: [] };
  const holon = services.holons.find((h) => h.id === holonId);
  if (!holon) return { blocked: false, defects: [] }; // unknown holon: nothing to check
  const verdict = checkCoherence(
    [{ source: `npc:${holon.id}`, line: holon.line, stage: holon.stage, loadBearing: true }],
    { line: target.line, stage: target.stage },
  );
  return { blocked: !verdict.coherent, defects: verdict.defects };
}

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

// ── The authored contextual seed (46 §2 × 11 — the cell's canonical situation, rendered) ────

/** The authored seed for a cell, or undefined (a cell without an authored seed is a content gap
 * the calibration harness reports — the runtime degrades rather than fabricates). */
export function scenarioSeedFor(line: Line, stage: Stage, seeds: readonly ScenarioSeed[] = SCENARIO_SEEDS): ScenarioSeed | undefined {
  return seeds.find((s) => s.line === line && s.stage === stage);
}

/**
 * The contextual seed text for this encounter: the authored seed bound to the modality's angle
 * (`scenarioSeedVariants.ts`). Null when the cell has no authored seed — the LLM then falls back
 * to the composed facets alone, which is degradation, never fabrication.
 */
export function contextualSeedBlock(line: Line, stage: Stage, modality: Modality): string | null {
  const seed = scenarioSeedFor(line, stage);
  if (!seed) return null;
  return contextualSeed(seed, modality);
}

/** The authored world seed for a cell, or undefined (degradation, never fabrication). */
export function worldSeedFor(line: Line, stage: Stage, seeds: readonly WorldSeed[] = WORLD_SEEDS): WorldSeed | undefined {
  return seeds.find((s) => s.line === line && s.stage === stage);
}

/**
 * The authored world PLACE text for this cell: the stage the situation stands on — locus,
 * texture, population, and the place's own quiet tension, as one prose block. Null when the
 * cell has no authored place; the prompt then falls back to the composed facets alone.
 */
export function worldPlaceBlock(line: Line, stage: Stage): string | null {
  const w = worldSeedFor(line, stage);
  if (!w) return null;
  return `Where: ${w.place} — ${w.texture} Around you: ${w.population} The place asks: ${w.tension}`;
}

/** The authored persona seed for a cell, or undefined (degradation, never fabrication). */
export function npcPersonaFor(line: Line, stage: Stage, seeds: readonly NpcSeed[] = NPC_SEEDS): NpcSeed | undefined {
  return seeds.find((s) => s.line === line && s.stage === stage);
}

/**
 * The authored persona VOICE for this cell: the canonical figure of the NPC library (46 §2),
 * given in stage-register prose — who stands in the situation, how they speak, and the tension
 * they carry. This is the SIGNIFICATOR's persona voice: how the game's voice toward this player
 * is registered (16 §2's vessel side). Null when the cell has no authored persona.
 */
export function personaVoiceBlock(line: Line, stage: Stage): string | null {
  const p = npcPersonaFor(line, stage);
  if (!p) return null;
  return `${p.name} — ${p.role}. They speak ${p.voice}; ${p.register}. Beneath it: ${p.tension}.`;
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
  /** The dialectic pair the composition selected (surface, structure ids) — Phase 11 d5. */
  readonly dialecticPair?: readonly [string, string] | null;
  /** The encounter's scored SERVICE-polarity direction (19/23) — the advance signal for d5. */
  readonly polarityDirection?: 'sto' | 'sts' | 'neutral';
  /** Phase 13 d10 L3 — the encounter's observable record for the polarity READING. When
   *  supplied (and a pair was selected), the System-1 layer (or the deterministic fallback)
   *  proposes a reading; it is RATIFIED here only when the caller says so (`ratifyReading`),
   *  and only a ratified reading moves state (46 §4.3's falsifiable state, L4 discipline). */
  readonly encounterRecord?: EncounterRecord;
  /** Ratify the proposed reading? Default false — a reading is recorded, never self-applied. */
  readonly ratifyReading?: boolean;
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
  /** The disposition list recorded for the session's proposals — G30's evidence surface. */
  readonly verdictRecorded: boolean;
  /** Phase 13 d10 L3 — the reading this session produced (proposed always when a record was
   *  supplied; applied only when ratified). Null when no record was supplied. */
  readonly polarityReading: PolarityReading | null;
  readonly polarityApplication: ReadingApplication | null;
}

// ── Polarity state advance (Phase 11 d5; 46 §5.2/§5.3 + MY-AD-0031) ────────────────────────

/**
 * Advance the player's dialectic pair-state map from one session's reconciliation evidence.
 *
 * The pair worked is the pair the composition SELECTED (surface ⟷ structure — the pair whose
 * active tension carried the encounter). The encounter's scored SERVICE-polarity (sto/sts/
 * neutral — a 19/23 concept, deliberately distinct from the reconciliation-polarity per
 * MY-AD-0031) is the advance signal:
 *
 * - `neutral`  → `undiscovered` pairs become `active-tension` (the work has begun — discovery);
 * - `sto`      → the pair advances one step further: `active-tension` → `reconciled` (service-
 *                oriented engagement is the integrative direction; MY-AD-0031's reading);
 * - `sts`      → no advance (self-serving engagement does not reconcile a dialectic pair).
 *
 * Saturation guard (46 §5.3): `reconciled` never regresses here, and a reconciled pair is
 * thereafter unselectable as a structural pole — the engine re-opens it only on refutation
 * evidence, which is not this writer's job. Pure function; sessionEnd assigns the result.
 */
export function advancePolarityStates(
  states: PolarityStateMap,
  pair: readonly [string, string] | null | undefined,
  direction: 'sto' | 'sts' | 'neutral' | undefined,
): PolarityStateMap {
  if (!pair || !direction) return states;
  const [a, b] = pair;
  if (a === b) return states; // reflexive-safe: origin tags carry no structural payload
  const key = a < b ? `${a}|${b}` : `${b}|${a}`;
  const current = states[key] ?? 'undiscovered';
  if (current === 'reconciled') return states; // saturation guard
  if (direction === 'sts') return states;      // no advance on self-serving engagement
  if (current === 'undiscovered') {
    // `sto` on an undiscovered pair: the work was integrative from the first encounter — count
    // it as discovery (active-tension), not instant reconciliation.
    return { ...states, [key]: 'active-tension' };
  }
  // current === 'active-tension', direction sto → reconciled.
  return { ...states, [key]: 'reconciled' };
}

/**
 * Session end (43 §4.6 + §5.5 W1/W2): append the session entry, drain the owner-worker pool over
 * the touched holons, advance the polarity state map (Phase 11 d5), and record the drain as a
 * worker entry. Deterministic; replay-safe (both writers are idempotent per unit of work — F3/W4).
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

  // Polarity advance (Phase 11 d5): the pair the composition selected moves one step under the
  // saturation guard; the map is mutated-by-replacement like the worker pool so the caller's
  // checkpoint and the next envelope both see it.
  (services as { states: PolarityStateMap }).states = advancePolarityStates(
    services.states,
    input.dialecticPair,
    input.polarityDirection,
  );

  // Phase 13 d10 L3 — the polarity READING. The System-1 layer (services.system1) proposes from
  // the encounter record; absent a reader, the deterministic fallback proposes. The reading is
  // ALWAYS recorded (it is the coverage query's input and the background workers' evidence);
  // it moves state only when the caller ratified it AND it passes the confidence floor.
  let reading: PolarityReading | null = null;
  let application: ReadingApplication | null = null;
  if (input.encounterRecord && input.dialecticPair) {
    const proposed = services.system1
      ? services.system1.proposeReading(input.encounterRecord)
      : deterministicReading(input.encounterRecord);
    if (proposed) {
      reading = proposed;
      const tallies = { ...services.tallies };
      const states = { ...services.states };
      application = applyReading({
        reading: proposed,
        ratified: input.ratifyReading === true,
        states,
        tallies,
        shadows: [], // severity deltas land on the ledger via the caller's persistence path
      });
      (services as { tallies: ConfirmationTally }).tallies = tallies;
      (services as { states: PolarityStateMap }).states = states;
      (services as { readings: readonly PolarityReading[] }).readings = [...services.readings, proposed];
    }
  }

  // The drain returns a NEW state; the services record is mutable-by-replacement so the next
  // encounter's envelope and the caller's checkpoint both see the committed profiles.
  (services as { workers: OwnerWorkerPoolState }).workers = drainResult.state;

  const ownerCommitted = drainResult.proposals.length;
  void ownerCommitted;
  if (drainResult.proposals.length > 0 || Object.keys(drainResult.state.workers).length > 0) {
    appendOwnerWorkerEntry(services.feed, {
      jobId: `drain:${input.logRef.sessionId}`,
      startedAtMs: input.logRef.endedAtMs,
      endedAtMs: input.now,
      proposals: drainResult.proposals,
    });
  }

  // Writer 3 (Phase 11 d4 / G30 — verdict completeness): a session whose outcome is recorded on
  // the feed gets a disposition entry on the SAME feed. Engine-committed effects (processOutcome
  // / applyConsequences) and owner-committed deltas are the normal accepted classes; a session
  // with no ratifiable payload records an explicit empty verdict, so "every session has a
  // disposition" is checkable rather than assumed (F2: the feed is the only channel).
  // Idempotent per session (entry id is verdict:{sessionId}) — replay-safe like every writer.
  let verdictRecorded = false;
  try {
    const committed = input.proposals.filter((p) => p.kind === 'encounter_record' || p.kind === 'shadow_entry' || p.kind === 'mastery_evidence' || p.kind === 'pack_score');
    appendVerdictEntry(services.feed, {
      sessionId: input.logRef.sessionId,
      at: input.now,
      dispositions: committed.map((p) => ({
        kind: p.kind,
        accepted: true,
        reason: 'engine-committed via processOutcome/applyConsequences (L4 deterministic path)',
      })),
    });
    verdictRecorded = true;
  } catch {
    verdictRecorded = false; // the feed can never break the session (degradation law)
  }

  return {
    ownerCommitted,
    awaitingRatification: input.proposals,
    workers: drainResult.state,
    feed: services.feed,
    verdictRecorded,
    polarityReading: reading,
    polarityApplication: application,
  };
}

// ── Phase 13 d10 — the coverage read + the reading log accessor ────────────────────────────

/**
 * The cell-never-closed query over the ratified reading log (d10 L3). Profiling of a cell is a
 * coverage judgment across orthogonal dimensions, never a counter — the calibration loop reads
 * this to see which cells are still open.
 */
export function coverageReport(services: OrchestrationServices) {
  return polarityCoverage(services.readings);
}

// ── The dev loop reads the coherence defects (43 §5.5 W4) ───────────────────────────────────

/**
 * Record the runtime coherence verdict as an orchestrator insight entry — the defect must be
 * SEEN by the development loop (46 §11: triage, not the player). The forecast is F4's
 * self-criticism: if a coherence defect routed a component out of the prompt this session, the
 * strategy engine expected an aligned rendering, so the deviation is named.
 *
 * Idempotent per session (the insight entry id is `insight:{sessionId}`); an all-clear verdict
 * records nothing — the feed carries findings, not silence.
 */
export function recordCoherenceInsight(
  services: OrchestrationServices,
  sessionId: string,
  defects: readonly CoherenceDefect[],
  at: number,
): boolean {
  if (defects.length === 0) return false;
  appendInsightEntry(services.feed, {
    sessionId,
    at,
    insight: {
      suspectedCauses: defects.map((d) => `${d.source}: ${d.rule} (${d.componentStage} vs ${d.targetStage})`),
      evidence: defects.map((d) => d.detail),
      recommendedPlanDeltas: [
        're-scope the encounter\'s holonSource to the target cell, or schedule the holon\'s own cell',
      ],
    },
    forecast: {
      expected: 'all prompt components at the encounter\'s stage (46 §11; 44 altitude separation)',
      observed: `${defects.length} component(s) off-stage — routed out of the prompt, session proceeded`,
      deviation: Math.min(1, defects.length * 0.25),
    },
  });
  return true;
}

// ── Ratification pass-through (43 §5.5 W3) ─────────────────────────────────────────────────

/**
 * Record an L4 ratification verdict for a session's proposals. The orchestrator may call this
 * after its ratification step; kept here so the FOUR writers of 43 §5.5 all flow through the one
 * seam. Idempotent per session id.
 */
export function recordRatification(
  services: OrchestrationServices,
  sessionId: string,
  at: number,
  dispositions: readonly { readonly kind: Proposal['kind']; readonly accepted: boolean; readonly reason: string }[],
): void {
  appendVerdictEntry(services.feed, {
    sessionId,
    at,
    dispositions,
  });
}

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
}

/** Capture the current runtime state for persistence. */
/**
 * Feed retention cap (48 §2, failure class LM-c — unbounded growth): the checkpoint retains the
 * most recent window of entries; older entries are not lost — they are COMPACTED into the
 * MemoryPage (trajectory prose, open threads, holon stances) before they scroll out. F3 replay
 * exactness holds within the window; the page is the summary of what the window dropped.
 */
export const MAX_CHECKPOINT_FEED_ENTRIES = 2000;

export function captureCheckpoint(services: OrchestrationServices): RuntimeCheckpoint {
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
}

/** Proposals an owner worker emits (re-export for the orchestrator's ratification surface). */
export type { OwnerProposal };

/**
 * The personalization envelope — the scoped projection the prompt is built from.
 *
 * Split out of `sessionRuntime.ts` (module-cohesion audit item 7) WITHOUT weakening the
 * single-seam rule (`M6`): `../sessionRuntime.ts` re-exports every symbol, so the seam is
 * still one import path for every caller. The split is a file change, not an interface change.
 */
import type { Line } from '../../domain/Line.js';
import type { Stage } from '../../domain/Stage.js';
import { stageOrdinal } from '../../domain/Stage.js';
import type { Modality, ShadowQuadrant } from '../../domain/enums.js';
import { ALL_LINES } from '../../domain/Line.js';
import type { Significator } from '../../domain/Significator.js';
import { shadowSeverityForLine } from '.././poleDecision.js';
import { buildMemoryPage, memoryPageBlock } from '.././memoryPage.js';
import { isBandedText } from '../../memory/retrievalFirewall.js';
import { projectUdv } from '.././udv.js';
import { pool } from '.././pooling.js';
import { buildScenarioContext, scopeForRole, type ScenarioContext, type PooledRefs, type ScopedEnvelope, type CouncilRole } from '.././scenarioContext.js';
import { deriveBandSources, sessionDurationsFromFeed, preferenceFromHistory, type UdvBandSources } from '.././bandSources.js';
import { initialTopicTagResolver } from '.././candidateLibrary.js';
import { type CoherenceDefect } from '.././stageCoherence.js';
import { decidePole } from '.././poleDecision.js';
import type { OrchestrationServices } from './services.js';
import { coherenceGate } from './scope.js';
import { contextualSeedBlock, personaVoiceBlock, worldPlaceBlock } from './seeds.js';

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
export function activeShadows(sig: Significator): readonly ShadowQuadrant[] {
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
  for (const line of ALL_LINES) {
    const st = sig.altitudes[line];
    if (st) stageOrdinals[line] = stageOrdinal(st);
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

  // Phase 13 d4 — composition telemetry at the runtime seam (46 §11): the envelope IS a
  // composition; its facet keys are the pooled scenario tier's renderings. Events are recorded
  // always (bounded FIFO); the diversity monitors are evaluated lazily by the dev loop, and
  // defect reports are triaged there — never surfaced to the player.
  services.telemetry.record({
    cell: `${target.line}:${target.stage}`,
    facetKeys: result.ranked
      .filter((c) => c.id.startsWith('scenario:'))
      .slice(0, 8)
      .map((c) => c.id),
    at: now,
  });

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

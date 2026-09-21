/**
 * The personalization envelope at RUNTIME — 45 §5/§6 executed for a live encounter.
 *
 * This is the missing wiring between the ratified personalization stack and the orchestrator's
 * session path: it derives the UDV from the significator's consent-checked identity context and
 * engine state (never a parallel profile — 45 §3), pools the three libraries against it, and
 * returns the envelope scoped for the scenario-catalyst role (45 §6.1) plus the raw ScenarioContext
 * for other roles' scopeForRole calls.
 *
 * Degradation law (the same one runtimeBridge.ts holds): an empty library or an empty tag match
 * degrades to an unpersonalized envelope — pooling failure never blocks a session. The catalyst's
 * PURPOSE always comes from the encounter, never from the UDV (46 §11 invariant 5).
 */

import type { Significator } from '../domain/Significator.js';
import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';
import type { Modality, ShadowQuadrant } from '../domain/enums.js';
import { ALL_LINES } from '../domain/Line.js';
import { projectUdv, type UserDimensionalityVector } from './udv.js';
import { pool, type CandidateLibrary, type PoolCandidate, type DeferralRecord, type TopicTagResolver } from './pooling.js';
import type { PoleSelection, PolarityStateMap } from './dialecticEngine.js';
import { buildScenarioContext, scopeForRole, type ScenarioContext, type ScopedEnvelope, type PooledRefs } from './scenarioContext.js';
import type { TagStore } from '../world/tags/dialectic.js';
import type { TagId } from '../world/tags/types.js';

/** Everything the orchestrator already holds at encounter time, passed in — nothing is re-derived. */
export interface EnvelopeInputs {
  readonly sig: Significator;
  readonly target: { readonly line: Line; readonly stage: Stage; readonly modality: Modality };
  /** The encounter's purpose — from the scheduler/module, NEVER from the UDV. */
  readonly purpose: string;
  /** What the Veil withholds this session (20) — passes into every role scope untouched. */
  readonly veiled: readonly string[];
  /** The candidate library (world/NPC/scenario candidates with tags). */
  readonly candidates: CandidateLibrary;
  readonly tagStore: TagStore;
  /** Topic → tag resolution for the UDV's interest/analogy/purpose strings. */
  readonly resolve: TopicTagResolver;
  /** Dialectic pair-state map (46 §5) — the orchestrator's long-lived memory of reconciliations. */
  readonly states: PolarityStateMap;
  readonly now: number;
  /** Deterministic seed for pole selection tie-breaks. */
  readonly seed?: number;
}

export interface EnvelopeOutcome {
  readonly udv: UserDimensionalityVector;
  readonly context: ScenarioContext;
  /** The scenario-catalyst's scoped view — the role that renders the encounter. */
  readonly forCatalyst: ScopedEnvelope;
  readonly pooledRefs: PooledRefs;
  readonly ranked: readonly PoolCandidate[];
  readonly deferrals: readonly DeferralRecord[];
  readonly poles: PoleSelection | null;
}

/** Active shadow quadrants from the significator's Distortion Ledger (16). */
function activeShadows(sig: Significator): readonly ShadowQuadrant[] {
  const out = new Set<ShadowQuadrant>();
  for (const e of sig.shadows.entries) {
    if (e.resolvedAt === null && e.severity > 0.2) out.add(e.quadrant);
  }
  return [...out];
}

/**
 * Build the envelope. Consent enforcement happens BEFORE projection: only identity fields the
 * caller marked usable (through 16 §2.1's ledger) may enter, and `projectUdv` re-checks rather
 * than trusts. With no usable fields and no declared interests, the UDV is empty-but-valid and
 * pooling degrades to an unpersonalized rank — the pre-personalization pipeline is the fallback.
 */
export function buildLiveEnvelope(inputs: EnvelopeInputs): EnvelopeOutcome {
  const { sig } = inputs;

  // Developmental inputs from engine state: stage ordinals per line from the significator's
  // altitudes (downgraded to bands inside the projector — no stage labels cross the firewall).
  const stageOrdinals: Partial<Record<Line, number>> = {};
  for (const line of ALL_LINES) {
    const st = sig.altitudes[line];
    if (st) stageOrdinals[line] = ['Infrared', 'Magenta', 'Red', 'Amber', 'Orange', 'Green', 'Teal', 'Turquoise'].indexOf(st);
  }

  const udv = projectUdv({
    usableFields: new Set<string>(),
    declaredInterests: [],
    developmental: {
      stageOrdinals: stageOrdinals as Record<Line, number>,
      activeShadowQuadrants: activeShadows(sig),
    },
    purpose: [],
  });

  const result = pool(inputs.tagStore, udv, inputs.candidates, {
    mode: 'spiral',
    states: inputs.states,
    target: inputs.target,
    maxStratum: 0,
    playerDepth: 0,
    resolve: inputs.resolve,
    now: inputs.now,
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
    catalystTarget: { ...inputs.target, purpose: inputs.purpose },
    veiled: inputs.veiled,
    poles: result.poles,
    entity: null,
  });

  return {
    udv,
    context,
    forCatalyst: scopeForRole(context, 'scenario-catalyst'),
    pooledRefs,
    ranked: result.ranked,
    deferrals: result.deferrals,
    poles: result.poles,
  };
}

/** Re-export for callers that need to resolve a topic against the store directly. */
export type { TopicTagResolver, TagId };

/**
 * The feed readers — 43 §5.5's reader table as CODE (Phase 11 d2).
 *
 * The feed already enforces F1/F2 mechanically (`reportingFeed.ts`); this module is the two
 * state-side readers the plan named:
 *
 *   Reader 1 — **27 (planning)**: `feedPlanningBias` distils the planning projection (session
 *   signals + forecasts) into a PriorityWeightBias fragment. The orchestrator re-plans from what
 *   actually happened: sustained positive progress keeps the growth push; high forecast deviation
 *   or negative progress eases intensity. RANKING-AS-BIAS, never a filter — the bias multiplies
 *   into the strategy's existing weights and an EMPTY FEED yields exactly `{}` (byte-identical
 *   behaviour, the degradation law).
 *
 *   Reader 2 — **25 (CCI)**: `feedCommittedEvidence` is the ONLY sanctioned accessor for
 *   CCI-side consumption. It delegates to `feed.read('cci')`, whose projection strips raw
 *   signals by construction (F1's committed-not-observed becomes a checked edge, asserted in
 *   tests — never a convention).
 *
 * Both are pure functions over the feed; neither writes anything anywhere (memory never writes —
 * 48 §5 R2 applies to readers a fortiori).
 */

import type { ReportingFeed, FeedEntry } from './reportingFeed.js';
import type { PriorityBias } from '../engines/PriorityComputation.js';
import type { Proposal } from './types.js';

/** Committed-only evidence projection for reader 2 (25 CCI / 16 projections). */
export function feedCommittedEvidence(feed: ReportingFeed): readonly FeedEntry[] {
  return feed.read('cci');
}

/** Committed-only proposals across the feed — the ratified/owner-committed payload stream. */
export function committedProposals(feed: ReportingFeed): readonly Proposal[] {
  const out: Proposal[] = [];
  for (const e of feedCommittedEvidence(feed)) {
    if (e.proposalsOwnerCommitted) out.push(...e.proposalsOwnerCommitted);
  }
  return out;
}

/**
 * Reader 1 (27 planning): the feed's trend as a ranking bias fragment.
 *
 * Inputs (planning projection only — raw signals are 27's lawful diet):
 * - `progressDelta` mean over session entries (signed, -1..1),
 * - mean `forecast.deviation` over entries that carry one (F4 — the loop's self-criticism).
 *
 * Output (multiplicative fragment over the eight criteria, all defaults 1.0 = no change):
 * - strong positive progress (≥ +0.3)  → keep pushing: transformationReadiness ×1.15;
 * - strong negative progress (≤ −0.3)  → ease: transformationReadiness ×0.8, sessionFit ×1.1;
 * - mean deviation > 0.5              → the plan was wrong: narrativeCoherence ×0.9 and a
 *   gentler peak (transformationReadiness ×0.9) — self-criticism must cost something.
 *
 * Deterministic; empty/quiet feed → `{}` (the strategy engine behaves exactly as before).
 */
export function feedPlanningBias(feed: ReportingFeed): PriorityBias {
  const planning = feed.read('planning');
  const sessions = planning.filter((e) => e.source === 'session' && e.signals !== undefined);
  if (sessions.length === 0) return {};

  const progress = sessions.reduce((acc, e) => acc + (e.signals?.progressDelta ?? 0), 0) / sessions.length;
  const forecasts = planning.filter((e) => e.forecast !== undefined);
  const deviation = forecasts.length > 0
    ? forecasts.reduce((acc, e) => acc + (e.forecast?.deviation ?? 0), 0) / forecasts.length
    : 0;

  const bias: { transformationReadiness?: number; sessionFit?: number; narrativeCoherence?: number } = {};
  if (progress >= 0.3) bias.transformationReadiness = 1.15;
  if (progress <= -0.3) {
    bias.transformationReadiness = 0.8;
    bias.sessionFit = 1.1;
  }
  if (deviation > 0.5) {
    bias.narrativeCoherence = 0.9;
    bias.transformationReadiness = (bias.transformationReadiness ?? 1) * 0.9;
  }
  return bias;
}

/**
 * Compose two bias fragments multiplicatively (both are multiplier maps over the same criteria;
 * an absent criterion in either reads as 1.0). One composition path — `applyCanonicalWeightBias`
 * remains the only applier downstream (`MY-RG-0023`'s one-normalisation law).
 */
export function composeBiases(base: PriorityBias, fragment: PriorityBias): PriorityBias {
  const out: Partial<Record<keyof PriorityBias, number>> = {};
  const keys = new Set([...Object.keys(base), ...Object.keys(fragment)] as (keyof PriorityBias)[]);
  for (const k of keys) {
    const v = (base[k] ?? 1) * (fragment[k] ?? 1);
    if (v !== 1) out[k] = v;
  }
  return out;
}

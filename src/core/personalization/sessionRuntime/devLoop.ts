/**
 * The development loop’s reads — coverage, coherence insights, ratification.
 *
 * Split out of `sessionRuntime.ts` (module-cohesion audit item 7) WITHOUT weakening the
 * single-seam rule (`M6`): `../sessionRuntime.ts` re-exports every symbol, so the seam is
 * still one import path for every caller. The split is a file change, not an interface change.
 */
import { appendInsightEntry, appendVerdictEntry } from '../../orchestration/feedBridge.js';
import type { Proposal } from '../../orchestration/types.js';
import { type CoherenceDefect } from '.././stageCoherence.js';
import { polarityCoverage } from '.././polarityResolution.js';
import type { OrchestrationServices } from './services.js';

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

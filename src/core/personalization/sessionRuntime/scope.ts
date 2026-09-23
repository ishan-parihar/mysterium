/**
 * Scope readings over an envelope — what a contract violation is, which line a scope measures, whether the composition is coherent.
 *
 * Split out of `sessionRuntime.ts` (module-cohesion audit item 7) WITHOUT weakening the
 * single-seam rule (`M6`): `../sessionRuntime.ts` re-exports every symbol, so the seam is
 * still one import path for every caller. The split is a file change, not an interface change.
 */
import type { Line } from '../../domain/Line.js';
import type { Stage } from '../../domain/Stage.js';
import type { Modality } from '../../domain/enums.js';
import { ROLE_SCOPES, type ScopedEnvelope } from '.././scenarioContext.js';
import { checkCoherence, type CoherenceDefect } from '.././stageCoherence.js';
import type { OrchestrationServices } from './services.js';

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

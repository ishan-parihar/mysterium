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
 *
 * **This file is the seam, and after the split (module-cohesion audit item 7) it is ONLY the seam.**
 * The implementation moved into `sessionRuntime/` — nine modules, one per section the file already
 * declared (store · services · envelope · scope · digest · seeds · sessionEnd · devLoop ·
 * checkpoint) — and this index re-exports every symbol by name.
 *
 * That is the point: `M6` calls this the ONE seam, and a seam is an INTERFACE contract, not a file.
 * Callers keep importing `sessionRuntime.js` and see exactly what they saw before; the modules are
 * free to change without touching a caller. Do not let a caller reach past this index into
 * `sessionRuntime/*` — if it must, the symbol belongs on the seam.
 */

export { sharedFacetStore } from './sessionRuntime/store.js';

export type { OrchestrationServices, RuntimePersistedState } from './sessionRuntime/services.js';
export { createOrchestrationServices } from './sessionRuntime/services.js';

export type { IdentityProjectionInput, PersonalizationBlock } from './sessionRuntime/envelope.js';
export { buildEnvelope } from './sessionRuntime/envelope.js';

export { assessmentScopeLine, coherenceGate, scopeContractViolations } from './sessionRuntime/scope.js';

export { holonDigestBlock } from './sessionRuntime/digest.js';

export {
  contextualSeedBlock,
  npcPersonaFor,
  personaVoiceBlock,
  scenarioSeedFor,
  worldPlaceBlock,
  worldSeedFor,
} from './sessionRuntime/seeds.js';

export type { SessionEndInput, SessionEndOutcome } from './sessionRuntime/sessionEnd.js';
export { advancePolarityStates, sessionEnd } from './sessionRuntime/sessionEnd.js';

export { coverageReport, recordCoherenceInsight, recordRatification } from './sessionRuntime/devLoop.js';

export type { RuntimeCheckpoint } from './sessionRuntime/checkpoint.js';
export { MAX_CHECKPOINT_FEED_ENTRIES, captureCheckpoint, restoreCheckpoint } from './sessionRuntime/checkpoint.js';

/** Proposals an owner worker emits (re-export for the orchestrator's ratification surface). */
export type { OwnerProposal } from '../world/ownerWorker.js';

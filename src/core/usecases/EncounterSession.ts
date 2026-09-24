/**
 * Encounter session wiring — the ONE construction path for an encounter's orchestrator, plus the
 * one derivation of the `PlayerResponse` a completed encounter yields.
 *
 * Every caller that runs an encounter through the architecture-live seam hands the orchestrator the
 * same things: the scheduled encounter, the player's significator and world, the carried history, a
 * caller-supplied UI handler, the assessment module, the concept index, and the optional
 * integrations (orchestration services, identity projection, training, unified profile, council).
 * Before this module there was exactly one production caller (the CLI), so the construction could
 * live in an if-tree inside `scripts/cli/runtime.ts`. Phase 15's campaign runner is the second
 * caller, and two callers that must agree about "which integrations are attached and what a
 * completed encounter yields" are the drift class the project's audits keep finding — so the
 * construction moved here and both callers delegate to it.
 *
 * What is deliberately NOT here: anything the caller owns. The UI handler (the CLI's is chalk/ora/
 * clack and clack's cancel semantics; the campaign's is a deterministic policy), the module
 * registry lookup, the forced line/stage/modality override, and the identity bands are all assembled
 * by the caller and passed in. This module holds the *shape* of an encounter session, not the
 * caller's policy about it.
 */
import {
  AgenticOrchestrator,
  type AgenticUIHandler,
  type OrchestratorResult,
} from '../assessments/AgenticOrchestrator.js';
import type { TrainingIntegration } from '../assessments/trainingTools.js';
import type { UnifiedProfileServices } from '../assessments/unifiedProfileTools.js';
import type { CouncilIntegration } from '../assessments/councilTools.js';
import type { StageAssessment } from '../assessments/types.js';
import type { UdvBandSources } from '../personalization/bandSources.js';
import type { OrchestrationServices } from '../personalization/sessionRuntime.js';
import type { ScheduledEncounter } from '../domain/EncounterSpecNew.js';
import type { Significator } from '../domain/Significator.js';
import type { ConsequenceRecord } from '../domain/ConsequenceRecord.js';
import type { WorldState } from '../engines/CandidateGeneration.js';
import type { PlayerResponse } from '../engines/ConsequenceEngine.js';
import type { DriveDirectionality } from '../domain/enums.js';
import type { Drive } from '../domain/Drive.js';

/**
 * The consent-checked identity projection for this session (`16 §2.1`). Absent → the UDV is
 * empty-but-valid (the `45 §5` degradation law), never a block.
 */
export interface EncounterIdentity {
  readonly usable?: readonly string[];
  readonly declaredInterests?: readonly string[];
  readonly aversions?: readonly string[];
  readonly bands?: UdvBandSources;
}

/** Everything an encounter session needs. Every field is the caller's, resolved before the call. */
export interface EncounterSessionInput {
  readonly encounter: ScheduledEncounter;
  readonly significator: Significator;
  readonly world: WorldState;
  readonly history: readonly ConsequenceRecord[];
  readonly uiHandler: AgenticUIHandler;
  /** The assessment module for this encounter's (line, stage). Absent → the orchestrator degrades. */
  readonly module?: StageAssessment;
  /** The concept index the orchestrator may consult (curriculum framing). */
  readonly conceptIndex?: unknown;
  /** Suppress the LLM entirely (the hermetic tier and `--headless` without `--llm`). */
  readonly noLlm?: boolean;
  readonly forceShadow?: string;
  /**
   * FIXTURE-ONLY — a declared drive directionality replacing the derived one (Phase 16 d2).
   *
   * The derivation can emit at most ONE pathological drive signal per encounter, so the 4-quadrant ×
   * 4-drive model `driveFixation` watches is unreachable from anything a player can produce; a
   * fixture that declares a stance could not deliver it, because the orchestrator derives the rest.
   * This is the seam for that. **Production callers must not set it** — a declared stance in
   * production asserts a player's evaluation instead of measuring it (`43 §4.1` L4). The campaign
   * records which channel produced each reading (`EncounterProvenance.declaredStance`).
   */
  readonly declaredDirectionality?: Readonly<Record<Drive, DriveDirectionality>>;
  readonly consecutivePasses?: Map<string, number>;
  readonly agentSynthesis?: string;
  /** The runtime services. Absent → the pre-personalization pipeline (one of the two ratified modes). */
  readonly orchestration?: OrchestrationServices;
  readonly identity?: EncounterIdentity;
  readonly training?: TrainingIntegration;
  readonly unifiedProfile?: UnifiedProfileServices;
  readonly council?: CouncilIntegration;
}

/**
 * Build the orchestrator for one encounter. The caller keeps the instance: it is not reusable
 * across encounters (it carries the encounter under test), and constructing one per encounter is
 * what the CLI already does.
 */
export function buildEncounterOrchestrator(input: EncounterSessionInput): AgenticOrchestrator {
  return new AgenticOrchestrator({
    encounter: input.encounter,
    significator: input.significator,
    world: input.world,
    history: [...input.history],
    conceptIndex: input.conceptIndex,
    uiHandler: input.uiHandler,
    module: input.module,
    noLlm: input.noLlm,
    forceShadow: input.forceShadow,
    declaredDirectionality: input.declaredDirectionality,
    consecutivePasses: input.consecutivePasses,
    agentSynthesis: input.agentSynthesis,
    training: input.training,
    unifiedProfile: input.unifiedProfile,
    orchestration: input.orchestration,
    identity: input.identity,
    council: input.council,
  });
}

/** What a completed encounter yields — the orchestrator result and the response it implies. */
export interface EncounterSessionResult {
  readonly outcome: OrchestratorResult;
  readonly response: PlayerResponse;
  readonly narrativeSummary: string;
}

/**
 * Derive the `PlayerResponse` a completed encounter yields.
 *
 * The response is a PROJECTION of the consequence record, and that direction matters: the record is
 * what `processOutcome` produced and what survives the encounter (it is what the encounter log, the
 * campaign series and session synthesis read), whereas the response object does not outlive the
 * caller's stack frame. Every field below is read from the record, so a caller cannot construct a
 * response that disagrees with the record about what happened — the failure F7 recorded, where the
 * write-in reached the log from one source and the record from none.
 */
export function responseFromRecord(
  encounter: ScheduledEncounter,
  record: ConsequenceRecord,
  narrativeSummary: string,
): PlayerResponse {
  return {
    encounterId: encounter.id,
    energeticDirection: record.polarityTrace.energeticDirection,
    driveDirectionality: record.polarityTrace.driveDirectionality,
    stageOrientation: record.polarityTrace.stageOrientation,
    sourceOfNourishment: record.polarityTrace.sourceOfNourishment,
    shadowSurfaced: record.shadowSurfaced,
    shadowResolvedId: record.shadowResolved,
    narrativeSummary,
    writeInValue: record.writeInValue,
    questionText: record.questionText,
  };
}

/**
 * DirectorAgent — the single source of truth for the diagnostic narrative.
 *
 * BACKGROUND-AGENTIC-ARCHITECTURE Decision 1, 2, 3, 14.
 *
 * The Director observes engine events (via AgentRuntime) and player
 * responses (via the AgentRunner UI), and decides what the next probe or
 * transition should be. It owns the Loom and dispatches to four
 * sub-agents on demand:
 *   - CalibrationAgent    (onboarding)
 *   - ReflectionAgent     (free-text analysis)
 *   - RecognitionAgent    (MCQ polarity pattern analysis)
 *   - SynthesisAgent      (module transitions)
 *
 * Initial scaffolding: this file compiles, hops through observed events,
 * owns the Loom, and exposes dispatch hooks for sub-agents. Sub-agent
 * implementations land in subsequent phases; until then, the dispatch
 * methods throw `not yet wired` to keep the contract honest.
 *
 * One instance per session. The session key is opaque to us; the caller
 * picks it. For the BFF, sessions are scoped to a single tab via a
 * `sessionId` cookie or localStorage seed.
 */

import { Loom, type LoomFreeInput } from './Loom.js';
import type { GameEventMap, GameEventType } from '../events/GameEvents.js';
import type { AgenticProbe, AgenticProbeResponse } from './AgenticProbe.js';
import { CalibrationAgent } from './CalibrationAgent.js';

export interface DirectorSnapshot {
  readonly loomEventsCount: number;
  readonly loomInputsCount: number;
  /** 0..1 overall calibration confidence — set by CalibrationAgent. */
  readonly calibrationConfidence: number;
  /** Whether CalibrationAgent has emitted calibration_complete. */
  readonly calibrationComplete: boolean;
  /** Whether the LLM is currently unavailable (Failure Integrity). */
  readonly llmOffline: boolean;
}

export class NotYetWired extends Error {
  constructor(method: string) {
    super(`[DirectorAgent] ${method} is not yet wired — see BACKGROUND-AGENTIC-ARCHITECTURE.md phase plan`);
    this.name = 'NotYetWired';
  }
}

/** Confidence threshold above which CalibrationAgent stops probing. */
export const CALIBRATION_THRESHOLD = 0.8;

/**
 * Compute new calibration confidence from prior confidence + per-probe weight.
 * Pure function — exported to make it testable and shareable across phases.
 *
 * Invariant: result ∈ [0, 1]. Negative signal weights are clamped to
 * zero contribution (calibration never decreases from a single signal).
 */
export function nextCalibrationConfidence(
  prior: number,
  signalWeight: number,
): number {
  const safePrior = Math.max(0, Math.min(1, prior));
  const safeWeight = Math.max(0, signalWeight);
  const maxGain = (1 - safePrior) * safeWeight;
  return Math.min(1, safePrior + maxGain);
}

export class DirectorAgent {
  private readonly loom: Loom;
  private calibrationConfidence = 0;
  private calibrationComplete = false;
  private llmOffline = false;
  /**
   * How many calibration probes this Director has ISSUED. The corpus path needs a progress signal
   * that actually advances, and no existing counter does: `Loom.render()` exposes two capped
   * windows (5 game events, 3 free inputs) and during onboarding the event window is EMPTY —
   * `observeGameEvent` is only driven by play — so any selector keyed on it serves the same probe
   * forever. This is the honest counter, and it is the Director's because the Director is the
   * thing that decides a probe is due.
   */
  private probeCount = 0;
  private readonly calibration: CalibrationAgent;

  constructor() {
    this.loom = new Loom();
    this.calibration = new CalibrationAgent();
  }

  // ---------- observe engine events ----------

  observeGameEvent<E extends GameEventType>(event: E, payload: GameEventMap[E]): void {
    this.loom.observeGameEvent(event, payload);
    // Sub-agents are wired in later phases; the Loom is the source of truth
    // for now so prompts can already see the recent event stream.
  }

  observeFreeInput(input: LoomFreeInput): void {
    this.loom.observeFreeInput(input);
    // ReflectionAgent / RecognitionAgent hook lands in Phase 3.
  }

  // ---------- calibration state ----------

  setCalibrationConfidence(value: number): void {
    this.calibrationConfidence = Math.max(0, Math.min(1, value));
  }

  markCalibrationComplete(): void {
    this.calibrationComplete = true;
  }

  // ---------- failure integrity ----------

  setLlmOffline(offline: boolean): void {
    this.llmOffline = offline;
  }

  // ---------- read-only views ----------

  loom$(): Loom {
    return this.loom;
  }

  snapshot(): DirectorSnapshot {
    return {
      loomEventsCount: this.loom.gameEvents$().length,
      loomInputsCount: this.loom.freeInputs$().length,
      calibrationConfidence: this.calibrationConfidence,
      calibrationComplete: this.calibrationComplete,
      llmOffline: this.llmOffline,
    };
  }

  // ---------- sub-agent dispatch (throw until wired) ----------

  /** Calibration-only: ask CalibrationAgent for the next onboarding probe. */
  async generateCalibrationProbe(): Promise<AgenticProbe> {
    const probe = await this.calibration.generateProbe(
      this.loom,
      this.calibrationConfidence,
      this.probeCount,
    );
    this.probeCount += 1;
    return probe;
  }

  /**
   * In-encounter: ingest a player probe response, evolve calibration
   * confidence from the probe's `signalWeight`, and (if above
   * threshold) flip the calibration-complete flag.
   *
   * Returns the new confidence after applying the response.
   */
  async observeProbeResponse(response: AgenticProbeResponse): Promise<number> {
    this.observeFreeInput({
      timestamp: Date.now(),
      text: response.freeInput,
      selectedPolarity: response.selectedPolarity,
    });
    // signalWeight is read from the most recently generated probe; we
    // require CalibrationAgent to carry it via metadata. The DirectorAgent
    // surfaces the value via `latestProbeSignalWeight()` so callers that
    // mutate the probe themselves can pass it through.
    const weight = this.stagedProbeSignalWeight ?? 0.1;
    this.calibrationConfidence = nextCalibrationConfidence(
      this.calibrationConfidence,
      weight,
    );
    this.stagedProbeSignalWeight = null;
    if (this.calibrationConfidence >= CALIBRATION_THRESHOLD) {
      this.calibrationComplete = true;
    }
    return this.calibrationConfidence;
  }

  /** Stash the latest probe's signalWeight so a follow-up response can apply it. */
  setLatestProbeSignalWeight(weight: number): void {
    this.stagedProbeSignalWeight = weight;
  }

  /** Stash a probe so the response can be correlated by id. */
  setLatestProbe(probe: AgenticProbe): void {
    this.stagedProbe = probe;
  }

  latestProbe(): AgenticProbe | null {
    return this.stagedProbe;
  }

  /** Module transition: ask SynthesisAgent whether to advance modules. */
  async computeModuleTransition(): Promise<never> {
    throw new NotYetWired('computeModuleTransition');
  }

  // ----- private state carried across the calibrate-then-respond cycle -----
  private stagedProbe: AgenticProbe | null = null;
  private stagedProbeSignalWeight: number | null = null;
}

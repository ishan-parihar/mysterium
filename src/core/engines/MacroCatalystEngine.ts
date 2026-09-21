/**
 * MacroCatalystEngine — PESTLE tension accumulation, macro-event lifecycle.
 * Spec: foundations/24 §8
 *
 * GAP-WB-2: Now bridges RedPESTLE descriptive content into macro-event
 * generation. Each macro-event carries a thematic description drawn from
 * the RedPESTLE data, giving narrative substance to the PESTLE tension.
 */
import type { Stage } from '../domain/Stage.js';
import { RedPESTLE, PESTLE_DIMENSIONS } from '../world/pestle/RedPESTLE.js';

export interface PESTLETension {
  readonly political: number;
  readonly economic: number;
  readonly social: number;
  readonly technological: number;
  readonly legal: number;
  readonly environmental: number;
}

export interface MacroEvent {
  readonly id: string;
  readonly trigger: keyof PESTLETension;
  readonly altitude: Stage;
  readonly active: boolean;
  readonly sessionsActive: number;
  /** GAP-WB-2: Thematic description from RedPESTLE for narrative conditioning. */
  readonly description?: string;
}

export type MacroEventPhase = 'onset' | 'active' | 'resolution';

export interface MacroEventState {
  readonly event: MacroEvent;
  readonly phase: MacroEventPhase;
  readonly sessionsInPhase: number;
  readonly encountersSinceStart: number;
  readonly playerChoices: readonly string[];
}

export function createInitialTension(): PESTLETension {
  return { political: 0, economic: 0, social: 0, technological: 0, legal: 0, environmental: 0 };
}

/**
 * Accumulate tension from an encounter outcome.
 * Each encounter shifts one PESTLE dimension by a small delta.
 */
export function accumulateTension(
  tension: PESTLETension,
  dimension: keyof PESTLETension,
  delta: number,
): PESTLETension {
  const decayed = decayTension(tension);
  return { ...decayed, [dimension]: Math.min(1, Math.max(0, decayed[dimension] + delta)) };
}

/**
 * Natural tension decay (0.01 per encounter-transition).
 */
export function decayTension(tension: PESTLETension): PESTLETension {
  const result = {} as Record<string, number>;
  for (const [k, v] of Object.entries(tension)) {
    result[k] = Math.max(0, v - 0.01);
  }
  return result as unknown as PESTLETension;
}

/**
 * Check if any dimension has crossed the macro-event threshold (0.75).
 */
export function checkMacroTrigger(tension: PESTLETension): (keyof PESTLETension) | null {
  for (const [k, v] of Object.entries(tension)) {
    if (v >= 0.75) return k as keyof PESTLETension;
  }
  return null;
}

/**
 * Attempt to trigger a new macro-event based on PESTLE tension.
 * Spec: foundations/24 §8.1
 * Constraints:
 * - Tension >= 0.75 on any dimension
 * - Max 2 active events simultaneously
 * - Event altitude must match player's centreOfGravity ± 1
 */
export function tryTriggerMacroEvent(
  tension: PESTLETension,
  activeEvents: readonly MacroEvent[],
  playerStage: Stage,
  now: number,
): MacroEvent | null {
  if (activeEvents.length >= 2) return null;

  const trigger = checkMacroTrigger(tension);
  if (!trigger) return null;

  // Check minimum spacing (simplified: no event in last 10 encounters)
  const recentEvent = activeEvents.find(e => e.sessionsActive < 10);
  if (recentEvent) return null;

  return {
    id: `macro-${trigger}-${now}`,
    trigger,
    altitude: playerStage,
    active: true,
    sessionsActive: 0,
    description: RedPESTLE[trigger] ?? `${trigger} tension has reached a breaking point`,
  };
}

/**
 * Advance a macro-event through its lifecycle phases.
 * Onset: 1-2 sessions (world signals coming event)
 * Active: 3-8 sessions (encounter pool modified)
 * Resolution: player choices determine outcome
 */
export function advanceMacroEvent(state: MacroEventState): MacroEventState {
  switch (state.phase) {
    case 'onset':
      if (state.sessionsInPhase >= 2) {
        return { ...state, phase: 'active', sessionsInPhase: 0 };
      }
      return { ...state, sessionsInPhase: state.sessionsInPhase + 1 };

    case 'active':
      if (state.sessionsInPhase >= 6 || state.playerChoices.length >= 5) {
        return { ...state, phase: 'resolution', sessionsInPhase: 0 };
      }
      return { ...state, sessionsInPhase: state.sessionsInPhase + 1 };

    case 'resolution':
      return state; // Terminal — resolved externally
  }
}

/**
 * Record a player choice during an active macro-event.
 */
export function recordMacroChoice(
  state: MacroEventState,
  choiceId: string,
): MacroEventState {
  return {
    ...state,
    playerChoices: [...state.playerChoices, choiceId],
    encountersSinceStart: state.encountersSinceStart + 1,
  };
}

/**
 * Resolve a macro-event: reset PESTLE tension for the trigger dimension,
 * deactivate the event, and return the resolution outcome.
 */
export function resolveMacroEvent(
  state: MacroEventState,
  tension: PESTLETension,
): { tension: PESTLETension; resolvedEvent: MacroEvent } {
  const resolvedEvent: MacroEvent = {
    ...state.event,
    active: false,
    sessionsActive: state.encountersSinceStart,
  };

  // Reset tension for the trigger dimension
  const newTension = { ...tension, [state.event.trigger]: 0 };

  return { tension: newTension, resolvedEvent };
}

/**
 * Get encounter pool modifications for an active macro-event.
 * During 'active' phase, some encounters become available and others are blocked.
 */
export function getMacroEncounterModifications(state: MacroEventState): {
  additionalEncounterTags: readonly string[];
  blockedEncounterTags: readonly string[];
} {
  if (state.phase !== 'active') {
    return { additionalEncounterTags: [], blockedEncounterTags: [] };
  }

  return {
    additionalEncounterTags: [`macro:${state.event.trigger}`, `event:${state.event.id}`],
    blockedEncounterTags: [`peaceful:${state.event.trigger}`],
  };
}

export function createMacroEventState(event: MacroEvent): MacroEventState {
  return {
    event,
    phase: 'onset',
    sessionsInPhase: 0,
    encountersSinceStart: 0,
    playerChoices: [],
  };
}

export function getPESTLEContentModifiers(tension: PESTLETension): {
  narrativeThemes: readonly string[];
  encounterFlavor: string;
  difficultyModifier: number;
} {
  const maxDimension = Object.entries(tension).reduce((a, b) =>
    b[1] > a[1] ? b : a,
  );

  const THEMES: Record<keyof PESTLETension, readonly string[]> = {
    political: ['power dynamics', 'governance', 'authority', 'civic duty'],
    economic: ['scarcity', 'trade', 'value exchange', 'resource allocation'],
    social: ['belonging', 'exclusion', 'group dynamics', 'social norms'],
    technological: ['automation', 'digital divide', 'innovation ethics', 'information overload'],
    legal: ['justice', 'compliance', 'rights', 'regulation'],
    environmental: ['sustainability', 'climate', 'natural resources', 'ecological balance'],
  };

  if (maxDimension[1] < 0.3) {
    return { narrativeThemes: [], encounterFlavor: 'neutral', difficultyModifier: 0 };
  }

  const themes = THEMES[maxDimension[0] as keyof PESTLETension] ?? [];
  const flavor = maxDimension[0] as keyof PESTLETension;
  const difficultyModifier = Math.min(0.3, maxDimension[1] * 0.4);

  return { narrativeThemes: themes, encounterFlavor: flavor, difficultyModifier };
}

// ─── GAP-WB-2: RedPESTLE bridge helpers ──────────────────────────────

/**
 * Get the RedPESTLE description for a PESTLE dimension.
 * Used by ContextPipeline to inject world-state flavor into LLM prompts.
 */
export function getPESTLEDescription(dimension: keyof PESTLETension): string {
  return RedPESTLE[dimension] ?? `${dimension} tension`;
}

/**
 * Get all PESTLE descriptions as a formatted string for LLM context injection.
 */
export function getPESTLEContextString(): string {
  return PESTLE_DIMENSIONS.map(dim => `${dim}: ${RedPESTLE[dim]}`).join('; ');
}

/**
 * Get the PESTLE dimension with highest tension and its description.
 * Used by ContextPipeline to condition encounters on active world-pressure.
 */
export function getDominantPESTLE(tension: PESTLETension): { dimension: keyof PESTLETension; tension: number; description: string } | null {
  let maxDim: keyof PESTLETension | null = null;
  let maxVal = 0;
  for (const dim of PESTLE_DIMENSIONS) {
    if (tension[dim] > maxVal) {
      maxVal = tension[dim];
      maxDim = dim;
    }
  }
  if (!maxDim || maxVal < 0.2) return null;
  return { dimension: maxDim, tension: maxVal, description: RedPESTLE[maxDim] };
}

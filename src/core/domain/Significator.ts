import type { Line } from './Line.js';
import type { Stage } from './Stage.js';
import type { Drive } from './Drive.js';
import type { Ray } from './Ray.js';
import type { State } from './State.js';
import type { PolarityState } from './PolarityCellVector.js';
import type { ShadowLedger } from './ShadowLedger.js';
import type { CodexEntry } from './SharedTypes.js';
import type { TransformationPhase } from '../engines/TransformationDetector.js';
import type { KnowledgeState } from '../curriculum/types.js';
import type { IdentityProfile } from './IdentityProfile.js';

import { ALL_DRIVES } from './Drive.js';
import { ALL_RAYS } from './Ray.js';
import { ALL_STATES } from './State.js';
import { ALL_LINES } from './Line.js';
import { ALL_STAGES } from './Stage.js';
import { createInitialPolarityState } from './PolarityCellVector.js';
import { createEmptyShadowLedger } from './ShadowLedger.js';

export interface TransformationRecord {
  readonly fromStage: Stage;
  readonly toStage: Stage;
  readonly triggeredAt: number;
  readonly triggeredAtSession?: number; // Session index when transformation fired. Optional for backward-compat with old saves.
  readonly catalystCount: number;
}

export interface EncounterRecord {
  readonly line: Line;
  readonly passed: boolean;
  readonly driveChoice?: Drive;
  readonly timestamp: number;
}

export interface ThetaTimestamps {
  readonly lastEncounter: Readonly<Record<string, number>>;
}

export interface DriveState {
  readonly weights: Readonly<Record<Drive, number>>;
  readonly fixationRisk: Readonly<Record<Drive, number>>;
}

export interface StateProgress {
  readonly unlocked: boolean;
  readonly depth: number;
  readonly minutesPracticed: number;
}

export type LifecycleStage =
  | 'Onboarding'
  | 'Exploring'
  | 'Developing'
  | 'Crystallizing'
  | 'Transforming'
  | 'Harvesting';

const VALID_TRANSITIONS: Record<LifecycleStage, readonly LifecycleStage[]> = {
  Onboarding: ['Exploring'],
  Exploring: ['Developing', 'Transforming', 'Harvesting'],
  Developing: ['Crystallizing', 'Exploring'],
  Crystallizing: ['Transforming', 'Exploring'],
  Transforming: ['Exploring'],
  Harvesting: [],
};

export function isValidTransition(from: LifecycleStage, to: LifecycleStage): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface Significator {
  readonly id: string;
  readonly createdAt: number;
  readonly lifecycle: LifecycleStage;
  readonly altitudes: Readonly<Record<Line, Stage>>;
  readonly currentStage: Stage;
  readonly rayProfile: Readonly<Record<Ray, number>>;
  readonly states: Readonly<Record<State, StateProgress>>;
  readonly drives: DriveState;
  readonly polarity: PolarityState;
  readonly shadows: ShadowLedger;
  readonly theta: ThetaTimestamps;
  readonly transformations: readonly TransformationRecord[];
  readonly codexEntries: readonly CodexEntry[];
  readonly transformationPhase: TransformationPhase;
  /**
   * T-0.5 (HS-06 fix): full transformation state machine counters, persisted
   * across encounters. Without this, the state machine deadlocks at 'threshold'
   * (sessionsInPhase never increments) or skips the crucible (knotsResolved
   * >= totalKnots evaluates to 0 >= 0 = true on first encounter).
   */
  readonly transformationSessionsInPhase?: number;
  readonly transformationKnotsResolved?: number;
  readonly transformationTotalKnots?: number;
  readonly transformationTargetStage?: Stage | null;
  readonly totalEncounters: number;
  readonly totalSessions: number;
  readonly avoidedEncounters: readonly string[];
  readonly recentEncounters: readonly EncounterRecord[];
  /**
   * Wave 2.4: Endosymbiosis — NPCs internalized as sub-holons.
   * Per HoloOS 08.8.25, endosymbiosis is a second compartmentalization mechanism
   * where an external holon is internalized. When an NPC's relationship strength
   * reaches >0.9 and the player passes a threshold encounter, the NPC is
   * internalized — its drive-state contributes to the player's developmental profile.
   */
  readonly internalizedHolons?: readonly string[];
  /**
   * Wave 2.5: Greater-Cycle role flows (S·T·G·Ch per HoloOS 08.8.26).
   * greatWayDirection: the player's last directional commitment (Choice).
   * greatWayPressure: the accumulated Potentiator pressure from the world state.
   */
  readonly greatWayDirection?: 'STO' | 'STS' | null;
  readonly greatWayPressure?: number;
  /**
   * DEV-4: Contact-boundary permeability (0.0–1.0).
   * Per HoloOS 00.md, Transformation is the contact-boundary membrane —
   * continuously regulating Catalyst/Experience flow between Matrix↔Potentiator
   * (lesser cycle) and Significator↔Great Way (greater cycle).
   * - High permeability (0.7-1.0): much Catalyst flows in, much Experience flows
   *   out. Good for active learning / crucible. Bad for integration / consolidation.
   * - Low permeability (0.0-0.3): limited flow. Good for integration / rest.
   *   Bad for growth — the player is "armored" against new Catalyst.
   * - Optimal (0.4-0.6): Goldilocks zone — enough flow for growth, enough
   *   boundary for integration.
   * Computed from drive balance (high balance = optimal permeability).
   * During transformation phases, permeability shifts (crucible = high,
   * emergence = low for integration).
   */
  readonly contactBoundaryPermeability?: number;
  /**
   * Curriculum expansion: knowledge state for self-directed learning.
   * Tracks concept depth levels, retention curves, study history,
   * and learning profile. Embedded in Significator per foundations/34 §3.1.
   * Empty by default — backward-compatible with existing saves.
   */
  readonly knowledge?: KnowledgeState;
  /**
   * P5-FIX (Full-Development Audit 2026-09-15): timestamp of the last session
   * end (ms epoch). Previously read via an `as any` cast but NEVER written, so
   * the >30-day re-calibration heuristic only ever fired through its theta
   * fallback. Written by endSession/endSessionAsync; preserved by
   * validateSignificator. Absent on fresh saves — the reader falls back to
   * theta timestamps (P1-B6 behavior).
   */
  readonly lastSessionAt?: number;
  /**
   * P5-FIX: persisted intervention flag from the session-end metacognitive
   * curriculum probe. When probeCurriculum reports shouldIntervene, the reason
   * is stored here so the NEXT startSession can force the consolidation theme
   * and clear the flag. Previously an `as any` field that validateSignificator
   * stripped on every load — the intervention bridge silently never survived a
   * save/load round-trip.
   */
  readonly curriculumIntervention?: string;
  /**
   * IdentityProfile (doc 16 §2.1): consent-bound identity context for the
   * HEALING layer only. Collected at onboarding under per-field consent;
   * consumed exclusively via projectHealingContext (src/core/healing/) for
   * voicing/texture. Structurally unreachable from measurement paths (levelling,
   * difficulty, scoring, credentials) — kernel firewall gate G12. Optional:
   * absent on saves without identity, and after full withdrawal.
   */
  readonly identity?: IdentityProfile;
}

function zeroRecord<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map(k => [k, 0])) as Record<K, number>;
}

export function createSignificator(
  id: string,
  initialAltitudes: Record<Line, Stage>,
  stage: Stage,
): Significator {
  const defaultState: StateProgress = { unlocked: false, depth: 0, minutesPracticed: 0 };

  const states = Object.fromEntries(
    ALL_STATES.map((s, i) => [s, i === 0 ? { ...defaultState, unlocked: true } : defaultState]),
  ) as Record<State, StateProgress>;

  // Initialize theta timestamps to 0 — unvisited cells have maximum urgency
  // (staleness = 1.0, urgency = 1.0^1.5 = 1.0). Bleed-through threshold at 0.7
  // means all cells initially show as "needs attention", which is correct for new players.
  const theta: ThetaTimestamps = {
    lastEncounter: Object.fromEntries(
      ALL_LINES.flatMap(l => ALL_STAGES.map(s => [`${l}:${s}`, 0])),
    ) as Record<string, number>,
  };

  return {
    id,
    createdAt: Date.now(),
    lifecycle: 'Exploring',
    altitudes: { ...initialAltitudes },
    currentStage: stage,
    rayProfile: zeroRecord(ALL_RAYS),
    states,
    drives: {
      weights: zeroRecord(ALL_DRIVES),
      fixationRisk: zeroRecord(ALL_DRIVES),
    },
    polarity: createInitialPolarityState(),
    shadows: createEmptyShadowLedger(),
    theta,
    transformations: [],
    codexEntries: [],
    transformationPhase: 'idle',
    transformationSessionsInPhase: 0,
    transformationKnotsResolved: 0,
    transformationTotalKnots: 0,
    transformationTargetStage: null,
    totalEncounters: 0,
    totalSessions: 0,
    avoidedEncounters: [],
    recentEncounters: [],
    internalizedHolons: [],
    greatWayDirection: null,
    greatWayPressure: 0,
    contactBoundaryPermeability: 0.5, // DEV-4: default Goldilocks zone
    // Curriculum expansion: empty knowledge state — backward-compatible with existing saves.
    // The knowledge field is populated when curriculum data is loaded.
    knowledge: {
      conceptStates: new Map(),
      subjectProgress: new Map(),
      studyHistory: [],
      learningProfile: {
        preferredModalities: [],
        metacognitionScore: 0.5,
        calibrationAccuracy: 0.5,
        transferCapacity: 0.5,
        studyEfficiency: 0.5,
      },
    },
  };
}

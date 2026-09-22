/**
 * The council dispatcher — `43 §3.3` (presence is a pacing instrument) × the trigger table
 * (audit `COUNCIL-ORTHOGONALITY-AUDIT-2026-09-24` §3–§4). Phase 13 d12.
 *
 * Before this module the council had **no dispatcher**: 18 roles, toolsets, scopes and standing
 * blocks all built, and the live loop never summoned one (audit O10). The trigger table below is
 * the missing piece — it binds a *state change* to the role that answers it, so summoning is a
 * function of the player's state rather than a caller's mood.
 *
 * Four laws hold here:
 *
 * 1. **Deterministic (MY-AD-0022, `43 §3.3`).** `dispatchCouncil` is a pure function of its state;
 *    the same state summons the same role, every time, in every process. No clock, no LLM, no
 *    randomness. The LLM never chooses who appears (audit D4) — that is what keeps the threshold
 *    moment meaningful and the pacing honest.
 * 2. **The frame-changing triggers outrank the work-changing ones.** Crisis preempts everything
 *    (`§4.7`'s bypass: the game stops being a game); threshold proximity assembles the whole
 *    council; then the mandates that change WHAT the player is doing; the ordinary encounter is the
 *    default row, not a competitor.
 * 3. **Background roles are never foreground.** S2 (assembles envelopes) and S5 (keeps the loop
 *    healthy) ride every dispatch as background and are never the role the player meets
 *    (`45 §6.1`: neither holds player bands).
 * 4. **The table is data.** `TRIGGER_TABLE` is exported and iterated by tests and by the
 *    `summon_council` tool, so a new trigger is one row — not a new branch in a caller.
 */

import type { AgentRole } from './types.js';
import { AGENT_ROLE_COUNCIL, ALL_AGENT_ROLES } from './councilStanding.js';
import { schedulePresence, type PresenceStrategy } from './orchestratorTools.js';

/** What changed in the player's state — the dispatcher's only input vocabulary. */
export interface CouncilObservation {
  /** A crisis pattern is present (`core/safety/crisis.ts`). Preempts everything. */
  readonly crisis: boolean;
  /** The developmental agenda reports a stage-threshold crossing is near (17). */
  readonly thresholdProximity: boolean;
  /** The distortion ledger carries unresolved, severe material — shadow-work is warranted (16). */
  readonly shadowWorkWarranted: boolean;
  /** No placement on record for the encounter's line (onboarding, 42). */
  readonly placementUnknown: boolean;
  /** A measurement-pack intake is due (40). */
  readonly packIntakeDue: boolean;
  /** The player asked what we hold about them, or changed a consent grant (16 §2.1). */
  readonly consentChangeRequested: boolean;
  /** Consecutive passes over the same cell with no movement. */
  readonly depthPlateauTicks: number;
  /** Retention has decayed on a consolidated band (curriculum forgetting curve). */
  readonly retentionDecay: boolean;
  /** A journal reflection was written since the last dispatch. */
  readonly reflectionWritten: boolean;
  /** The cell's intent — what the encounter is FOR (43 §4.2's J-roles). */
  readonly cellIntent: 'game' | 'test' | 'diagnosis';
  /** The loop-health tick fired (infrastructure, never the player's frame). */
  readonly loopHealthTick?: boolean;
}

export interface DispatchState extends CouncilObservation {
  /** Ordering seed (G14): affects only the arrangement of an assembled presence, never membership. */
  readonly seed: string;
}

export type SummonTrigger =
  | 'crisis' | 'threshold-proximity' | 'shadow-work-warranted' | 'placement-unknown'
  | 'pack-intake-due' | 'consent-change' | 'depth-plateau' | 'retention-decay'
  | 'reflection-written' | 'loop-health' | 'encounter-open';

/** Who decided the summons — recorded so an audit can tell a bypass from a pacing choice. */
export type Summoner = 'bypass' | 'strategy' | 'journal' | 'player' | 'tick';

export interface Summon {
  readonly trigger: SummonTrigger;
  readonly summoner: Summoner;
  /** The roles summoned INTO the foreground, in presence order. */
  readonly roles: readonly AgentRole[];
  /** Roles that work behind the curtain (S2 always; S5 on the health tick). */
  readonly background: readonly AgentRole[];
  /** Who holds the player's frame after this dispatch; null = the orchestrator keeps it. */
  readonly foreground: AgentRole | null;
  /** True when the game stops being a game (crisis bypass, §4.7). */
  readonly bypass: boolean;
  readonly strategy: PresenceStrategy;
  /** Deterministic, player-safe explanation (never a measurement — the Veil binds this string). */
  readonly rationale: string;
}

export interface TriggerRow {
  readonly trigger: SummonTrigger;
  readonly summoner: Summoner;
  readonly strategy: PresenceStrategy;
  /** Does this row fire for the given state? Rows are evaluated in TABLE ORDER. */
  readonly fires: (state: CouncilObservation) => boolean;
  /** The roles this trigger summons (foreground), before presence ordering. */
  readonly roles: (state: CouncilObservation) => readonly AgentRole[];
  readonly foreground: (roles: readonly AgentRole[]) => AgentRole | null;
  readonly bypass?: boolean;
  readonly background?: readonly AgentRole[];
  readonly rationale: (state: CouncilObservation) => string;
}

/**
 * The trigger table (`43 §3.3`, audit §3) — evaluated top to bottom, first match wins.
 *
 * The order is the ruling: **crisis** (the frame changes completely) → **threshold** (the frame is
 * meant to change; the whole council arrives) → **shadow-work** (a different kind of sitting) →
 * **placement / pack / consent** (bounded, out-of-fiction instruments) → **plateau / decay /
 * reflection** (the work changes, the frame does not) → **encounter-open** (the default: the cell's
 * own guide).
 */
const TRIGGER_ROWS: readonly TriggerRow[] = [
  {
    trigger: 'crisis',
    summoner: 'bypass',
    strategy: 'therapy',
    bypass: true,
    roles: () => ['therapist'],
    fires: (s) => s.crisis,
    foreground: () => 'therapist',
    background: ['S2', 'S5'],
    rationale: () => 'a crisis pattern is present — the frame stops being a game and becomes plainly human',
  },
  {
    trigger: 'threshold-proximity',
    summoner: 'strategy',
    strategy: 'transformation',
    roles: () => ALL_AGENT_ROLES,
    fires: (s) => s.thresholdProximity,
    // The whole council assembled — every role except the two background ones (law 3). The
    // Therapist anchors it: canonical order under the transformation rule, no rotation.
    foreground: (roles) => roles[0] ?? null,
    background: ['S2', 'S5'],
    rationale: () => 'a threshold is near — the world reorganises and several figures appear at once',
  },
  {
    trigger: 'shadow-work-warranted',
    summoner: 'strategy',
    strategy: 'therapy',
    // The Therapist PROPOSES the work; J4 DELIVERS it (audit O2 — producer, then consumer).
    roles: () => ['therapist', 'J4'],
    fires: (s) => s.shadowWorkWarranted,
    foreground: () => 'J4',
    background: ['S2'],
    rationale: () => 'material is ready to be met — a companion sits with it, in the world',
  },
  {
    trigger: 'placement-unknown',
    summoner: 'strategy',
    strategy: 'balanced',
    roles: () => ['A4'],
    fires: (s) => s.placementUnknown,
    foreground: () => 'A4',
    background: ['S2'],
    rationale: () => 'placement is not yet known for this line — a threshold trial is offered',
  },
  {
    trigger: 'pack-intake-due',
    summoner: 'strategy',
    strategy: 'balanced',
    // S1 operates the instrument; A3 judges it (audit O6/D2 — distinct return contracts).
    roles: () => ['S1', 'A3'],
    fires: (s) => s.packIntakeDue,
    foreground: () => 'S1',
    background: ['S2'],
    rationale: () => 'a measurement instrument is due — offered as an honest instrument, explicitly not the game',
  },
  {
    trigger: 'consent-change',
    summoner: 'player',
    strategy: 'balanced',
    roles: () => ['S4'],
    fires: (s) => s.consentChangeRequested,
    foreground: () => 'S4',
    background: ['S2'],
    rationale: () => 'the player asked about their own record — answered plainly, outside the fiction',
  },
  {
    trigger: 'depth-plateau',
    summoner: 'strategy',
    strategy: 'study',
    roles: () => ['T1', 'T2'],
    fires: (s) => s.depthPlateauTicks >= 3,
    foreground: () => 'T1',
    background: ['S2'],
    rationale: () => 'repeated passes without movement — a mentor arrives who explains rather than tests',
  },
  {
    trigger: 'retention-decay',
    summoner: 'strategy',
    strategy: 'study',
    roles: () => ['T2'],
    fires: (s) => s.retentionDecay,
    foreground: () => 'T2',
    background: ['S2'],
    rationale: () => 'something consolidated is fading — a revisit, framed as remembering with someone',
  },
  {
    trigger: 'reflection-written',
    summoner: 'journal',
    strategy: 'balanced',
    roles: () => ['A2'],
    fires: (s) => s.reflectionWritten,
    foreground: () => 'A2',
    background: ['S2'],
    rationale: () => "a reflection was written — a mirror returns the player's own words",
  },
  {
    trigger: 'loop-health',
    summoner: 'tick',
    strategy: 'balanced',
    roles: () => [],
    fires: (s) => s.loopHealthTick === true,
    foreground: () => null,
    background: ['S5', 'S2'],
    rationale: () => 'the loop-health tick fired — infrastructure work, the player never meets it',
  },
  {
    trigger: 'encounter-open',
    summoner: 'strategy',
    strategy: 'balanced',
    // The cell's own guide: the encounter's intent picks which J-role embodies it.
    roles: (s) => [s.cellIntent === 'test' ? 'J2' : s.cellIntent === 'diagnosis' ? 'J3' : 'J1'],
    fires: () => true, // the default row — last in table order by construction
    foreground: (roles) => roles[0] ?? null,
    background: ['S2'],
    rationale: (s) => `the encounter opens — its guide (${s.cellIntent}) meets the player in the scene`,
  },
];

/** Frozen for readers — the table is data, and data does not get edited in place. */
export const TRIGGER_TABLE: readonly TriggerRow[] = Object.freeze(TRIGGER_ROWS);

/** The quiet state: nothing has changed, the ordinary encounter is open. */
export const CLEAR_OBSERVATION: CouncilObservation = Object.freeze({
  crisis: false, thresholdProximity: false, shadowWorkWarranted: false, placementUnknown: false,
  packIntakeDue: false, consentChangeRequested: false, depthPlateauTicks: 0, retentionDecay: false,
  reflectionWritten: false, cellIntent: 'game',
});

/**
 * The canonical MINIMAL state that fires one trigger — the inverse of `dispatchCouncil`, and the
 * only supported way for a caller to ask for a specific summons (a CLI smoke flag, a test, a
 * drill). It exists so that no caller re-implements "what makes this row fire": if the table's
 * predicate changes, this changes with it, and the round-trip test catches the drift.
 */
export function observationForTrigger(
  trigger: SummonTrigger,
  cellIntent: CouncilObservation['cellIntent'] = 'game',
): CouncilObservation {
  const base: CouncilObservation = { ...CLEAR_OBSERVATION, cellIntent };
  switch (trigger) {
    case 'crisis': return { ...base, crisis: true };
    case 'threshold-proximity': return { ...base, thresholdProximity: true };
    case 'shadow-work-warranted': return { ...base, shadowWorkWarranted: true };
    case 'placement-unknown': return { ...base, placementUnknown: true };
    case 'pack-intake-due': return { ...base, packIntakeDue: true };
    case 'consent-change': return { ...base, consentChangeRequested: true };
    // 3 is the table's plateau threshold; the helper names it rather than guessing at the boundary.
    case 'depth-plateau': return { ...base, depthPlateauTicks: 3 };
    case 'retention-decay': return { ...base, retentionDecay: true };
    case 'reflection-written': return { ...base, reflectionWritten: true };
    case 'loop-health': return { ...base, loopHealthTick: true };
    case 'encounter-open': return base;
  }
}

/** Every trigger the table declares, in table order — the vocabulary callers may name. */
export const ALL_TRIGGERS: readonly SummonTrigger[] = TRIGGER_TABLE.map((r) => r.trigger);

/**
 * Decide who is present. First firing row in `TRIGGER_TABLE` order wins; presence is ordered by
 * `schedulePresence` under the row's strategy (so a therapy dispatch opens with the Healer, a study
 * dispatch with the Teacher, a transformation assembles the council in canonical order).
 */
export function dispatchCouncil(state: DispatchState): Summon {
  const row = TRIGGER_TABLE.find((r) => r.fires(state))!;
  const requested = row.roles(state);
  // Background roles are excluded from the foreground presence by construction (law 3).
  const background = row.background ?? ['S2'];
  const foregroundRoles = requested.filter((r) => !background.includes(r));
  const roles = schedulePresence(state.seed, foregroundRoles, row.strategy);
  return {
    trigger: row.trigger,
    summoner: row.summoner,
    roles,
    background,
    foreground: row.foreground(roles),
    bypass: row.bypass === true,
    strategy: row.strategy,
    rationale: row.rationale(state),
  };
}

/**
 * The dispatcher's own contract check — every role the table can summon must be a real role, and no
 * background role may ever hold the foreground. Returns the violations (empty = coherent), so a
 * gate can fail closed rather than trusting the table by inspection.
 */
export function dispatchTableViolations(): readonly string[] {
  const out: string[] = [];
  const known = new Set<string>(ALL_AGENT_ROLES);
  const probes: DispatchState[] = [
    { seed: 'g', crisis: true, thresholdProximity: false, shadowWorkWarranted: false, placementUnknown: false, packIntakeDue: false, consentChangeRequested: false, depthPlateauTicks: 0, retentionDecay: false, reflectionWritten: false, cellIntent: 'game' },
    { seed: 'g', crisis: false, thresholdProximity: true, shadowWorkWarranted: false, placementUnknown: false, packIntakeDue: false, consentChangeRequested: false, depthPlateauTicks: 0, retentionDecay: false, reflectionWritten: false, cellIntent: 'game' },
    { seed: 'g', crisis: false, thresholdProximity: false, shadowWorkWarranted: true, placementUnknown: false, packIntakeDue: false, consentChangeRequested: false, depthPlateauTicks: 0, retentionDecay: false, reflectionWritten: false, cellIntent: 'game' },
    { seed: 'g', crisis: false, thresholdProximity: false, shadowWorkWarranted: false, placementUnknown: true, packIntakeDue: false, consentChangeRequested: false, depthPlateauTicks: 0, retentionDecay: false, reflectionWritten: false, cellIntent: 'game' },
    { seed: 'g', crisis: false, thresholdProximity: false, shadowWorkWarranted: false, placementUnknown: false, packIntakeDue: true, consentChangeRequested: false, depthPlateauTicks: 0, retentionDecay: false, reflectionWritten: false, cellIntent: 'game' },
    { seed: 'g', crisis: false, thresholdProximity: false, shadowWorkWarranted: false, placementUnknown: false, packIntakeDue: false, consentChangeRequested: true, depthPlateauTicks: 0, retentionDecay: false, reflectionWritten: false, cellIntent: 'game' },
    { seed: 'g', crisis: false, thresholdProximity: false, shadowWorkWarranted: false, placementUnknown: false, packIntakeDue: false, consentChangeRequested: false, depthPlateauTicks: 3, retentionDecay: false, reflectionWritten: false, cellIntent: 'game' },
    { seed: 'g', crisis: false, thresholdProximity: false, shadowWorkWarranted: false, placementUnknown: false, packIntakeDue: false, consentChangeRequested: false, depthPlateauTicks: 0, retentionDecay: true, reflectionWritten: false, cellIntent: 'game' },
    { seed: 'g', crisis: false, thresholdProximity: false, shadowWorkWarranted: false, placementUnknown: false, packIntakeDue: false, consentChangeRequested: false, depthPlateauTicks: 0, retentionDecay: false, reflectionWritten: true, cellIntent: 'game' },
    { seed: 'g', crisis: false, thresholdProximity: false, shadowWorkWarranted: false, placementUnknown: false, packIntakeDue: false, consentChangeRequested: false, depthPlateauTicks: 0, retentionDecay: false, reflectionWritten: false, cellIntent: 'game', loopHealthTick: true },
    { seed: 'g', crisis: false, thresholdProximity: false, shadowWorkWarranted: false, placementUnknown: false, packIntakeDue: false, consentChangeRequested: false, depthPlateauTicks: 0, retentionDecay: false, reflectionWritten: false, cellIntent: 'game' },
  ];
  const seen = new Set<string>();
  for (const state of probes) {
    const summon = dispatchCouncil(state);
    seen.add(summon.trigger);
    for (const role of summon.roles) {
      if (!known.has(role)) out.push(`trigger ${summon.trigger} summons unknown role '${role}'`);
      if (summon.background.includes(role)) out.push(`trigger ${summon.trigger} summons background role ${role} into the foreground`);
      // Every summoned role must be bound to a scope (or be one of the two lawful exceptions).
      if (AGENT_ROLE_COUNCIL[role] === null && role !== 'S5') {
        out.push(`trigger ${summon.trigger} summons ${role}, which holds no player bands — it cannot hold the foreground`);
      }
    }
    if (summon.bypass && summon.roles.length !== 1) {
      out.push(`trigger ${summon.trigger} is a bypass but summons ${summon.roles.length} roles`);
    }
  }
  for (const row of TRIGGER_TABLE) {
    if (!seen.has(row.trigger) && row.trigger !== 'encounter-open') {
      // A row that no probe can reach is either shadowed by an earlier row (a real defect) or the
      // probe list is incomplete. Either way it is reported, not ignored.
      out.push(`trigger ${row.trigger} is unreachable — an earlier row always matches first`);
    }
  }
  return out;
}

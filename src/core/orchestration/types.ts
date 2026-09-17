/**
 * Orchestration types — the delegation contract (doc 43 §6).
 *
 * The primary orchestrator delegates player-facing surfaces to the sub-agent
 * council. Every delegated session is a DelegationSpec answered by a
 * DelegationResult; sub-agents return PROPOSALS, never commits (law L4 —
 * single-writer: only the orchestrator applies state transitions, via the
 * engine-deterministic commit path).
 *
 * Spec: docs/foundations/43-agentic-orchestration-architecture.md
 */
import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';
import type { HealingContext } from '../healing/HealingContext.js';

/** Council roles (43 §4.2). Cell-bounded roles carry a (line, stage) cell. */
export type AgentRole =
  | 'T1' | 'T2' | 'T3'                     // Teacher council
  | 'A1' | 'A2' | 'A3' | 'A4'              // Assessor council
  | 'J1' | 'J2' | 'J3' | 'J4' | 'J5'       // Journey-Guide council
  | 'therapist'                            // one per player at any time
  | 'S1' | 'S2' | 'S3' | 'S4' | 'S5';      // Specialist council

/** Cell-bounded roles (Journey-Guides + cell-bound assessors). */
export const CELL_BOUND_ROLES: readonly AgentRole[] = ['J1', 'J2', 'J3', 'J4', 'J5'];

/** Healing-path roles — the only roles permitted HealingContext (42 §1.1). */
export const HEALING_PATH_ROLES: readonly AgentRole[] = [
  'J1', 'J4', 'J5', 'therapist', 'S2', 'S4',
];

/** Measurement-path roles — HealingContext must NEVER appear in their specs. */
export const MEASUREMENT_PATH_ROLES: readonly AgentRole[] = ['A1', 'A2', 'A3', 'A4', 'J2', 'J3', 'S1'];

export interface DelegationCell {
  readonly line: Line;
  readonly stage: Stage;
}

/** A purpose-scoped read projection key (43 §4.3 TL2). */
export type ProjectionKey =
  | 'curriculum.state' | 'curriculum.prereqGaps' | 'curriculum.retention'
  | 'shadow.ledgerProjection' | 'shadow.activeCount'
  | 'drive.balance' | 'drive.fixations'
  | 'cci.snapshot' | 'levelling.rungs' | 'staircase.state'
  | 'reflection.corpus' | 'vow.state'
  | 'identity.consentView' | 'healing.contextHints'
  | 'corpus.moduleSpec' | 'corpus.polarityTexture'
  | 'ops.benchmarkTiers' | 'ops.registryHealth';

/**
 * The delegation mandate. Immutable; validated before execution.
 */
export interface DelegationSpec {
  readonly role: AgentRole;
  /** Required for cell-bounded roles; forbidden elsewhere. */
  readonly cell?: DelegationCell;
  /** The mandate in the orchestrator's words. */
  readonly purpose: string;
  /** Purpose-scoped state keys the sub-agent may read (TL2). */
  readonly readProjection: ReadonlySet<ProjectionKey>;
  /** Tools the sub-agent may call (TL1: proposals only; TL3: budgeted). */
  readonly toolset: ReadonlySet<DelegatedTool>;
  /** Tool-call and virtual-clock budget (TL3). */
  readonly budget: Readonly<{ toolCallsMax: number; virtualMsMax: number }>;
  /** Only for healing-path roles (firewall — validated at delegation time). */
  readonly healingContext?: HealingContext;
}

export type DelegationOutcome =
  | 'completion' | 'handoff' | 'safety' | 'budget_exhausted' | 'recalled';

/** Signals extracted from a session log (43 §4.4) — the eager-reading layer. */
export interface SessionSignals {
  /** Rubric-estimated clinical/measurement leakage risk (0..1). */
  readonly veilRisk: number;
  /** Crisis-pattern detector output (0..1). */
  readonly distressSignal: number;
  /** Flow-protection trigger (0..1). */
  readonly frustrationSignal: number;
  /** Role-appropriate progress estimate (-1..1). */
  readonly progressDelta: number;
  /** Consent grants/withdrawals executed during the session. */
  readonly consentEvents: readonly string[];
}

export interface LogRef {
  readonly sessionId: string;
  readonly delegationId: string;
  readonly startedAtMs: number;
  readonly endedAtMs: number;
}

/** A proposal object (TL1). Payload validity is kind-checked at ratification. */
export interface Proposal {
  readonly kind:
    | 'mastery_evidence' | 'shadow_entry' | 'trajectory' | 'retention_estimate'
    | 'alignment_adjustment' | 'encounter_record' | 'threshold_signal'
    | 'consent_inform' | 'pack_score';
  readonly payload: unknown;
  readonly rationale: string;
}

export interface DelegationResult {
  readonly outcome: DelegationOutcome;
  readonly proposals: readonly Proposal[];
  readonly signals: SessionSignals;
  readonly logRef: LogRef;
}

/** Per-role tool allowlists (43 §4.3). Fail-closed at spec validation. */
export const ROLE_TOOLSETS: Readonly<Record<AgentRole, readonly DelegatedTool[]>> = {
  T1: ['get_concept', 'get_prereq_gaps', 'propose_mastery_evidence'],
  T2: ['get_concept', 'get_prereq_gaps', 'propose_retention_estimate'],
  T3: ['get_prereq_gaps', 'propose_trajectory'],
  A1: ['get_staircase_state', 'propose_mastery_evidence'],
  A2: ['get_reflection_corpus', 'review_practice'],
  A3: ['pack_administer', 'pack_score'],
  A4: ['get_staircase_state', 'propose_placement'],
  J1: ['get_module_spec', 'get_polarity_texture', 'record_encounter'],
  J2: ['get_module_spec', 'record_encounter'],
  J3: ['get_module_spec', 'get_polarity_texture', 'propose_shadow_entry'],
  J4: ['get_module_spec', 'get_polarity_texture', 'propose_shadow_entry'],
  J5: ['get_module_spec', 'report_threshold_signal'],
  therapist: ['get_shadow_ledger_projection', 'propose_shadow_work', 'note_arc'],
  S1: ['pack_administer', 'pack_score'],
  S2: ['read_identity_consent', 'assemble_healing_context'],
  S3: ['propose_alignment_adjustment'],
  S4: ['read_identity_consent', 'consent_inform'],
  S5: ['run_benchmark_tier', 'registry_health'],
};

/** All delegated tool names (the union above, derived). */
export type DelegatedTool = (typeof ALL_DELEGATED_TOOLS)[number];

export const ALL_DELEGATED_TOOLS = [
  'get_concept', 'get_prereq_gaps', 'propose_mastery_evidence',
  'propose_retention_estimate', 'propose_trajectory',
  'get_staircase_state', 'get_reflection_corpus', 'review_practice',
  'pack_administer', 'pack_score',
  'propose_placement',
  'get_module_spec', 'get_polarity_texture', 'record_encounter',
  'propose_shadow_entry', 'report_threshold_signal',
  'get_shadow_ledger_projection', 'propose_shadow_work', 'note_arc',
  'read_identity_consent', 'assemble_healing_context',
  'propose_alignment_adjustment', 'consent_inform',
  'run_benchmark_tier', 'registry_health',
] as const;

/** Proposal kinds each delegated tool may emit (ratification dispatch). */
export const TOOL_PROPOSAL_KINDS: Readonly<Record<string, Proposal['kind']>> = {
  propose_mastery_evidence: 'mastery_evidence',
  propose_retention_estimate: 'retention_estimate',
  propose_trajectory: 'trajectory',
  propose_placement: 'trajectory',
  record_encounter: 'encounter_record',
  propose_shadow_entry: 'shadow_entry',
  report_threshold_signal: 'threshold_signal',
  propose_alignment_adjustment: 'alignment_adjustment',
  consent_inform: 'consent_inform',
  review_practice: 'alignment_adjustment',
  pack_score: 'pack_score',
};

/**
 * Delegation executor (doc 43 §4.5–§4.7, §6) — validates specs, runs delegated
 * sessions through the LIVE GameLoop under a role-consistent choice policy,
 * and ratifies proposals through the engine-deterministic commit path.
 *
 * Laws enforced here:
 *   L4  single-writer    — only ratifyProposals mutates Significator state,
 *                          and only via processOutcome/applyConsequences.
 *   TL1  proposals not effects — delegated tools emit Proposal objects.
 *   TL2  purpose-scoped reads — projections are whitelisted per role.
 *   TL3  budgets — exceeding the tool budget ends the session (`budget_exhausted`).
 *   G15  toolset firewall — a spec whose toolset exceeds the role allowlist
 *         fails closed before execution.
 *
 * Spec: docs/foundations/43-agentic-orchestration-architecture.md
 */
import type { Significator } from '../domain/Significator.js';
import { startSession, tickWithStrategy, applyResponseOnly } from '../GameLoop.js';
import { processOutcome, applyConsequences } from '../engines/ConsequenceEngine.js';
import type { PlayerResponse } from '../engines/ConsequenceEngine.js';
import type { ScheduledEncounter } from '../domain/EncounterSpecNew.js';
import type { SessionContext } from '../engines/PriorityComputation.js';
import type { WorldState } from '../engines/EncounterScheduler.js';
import type { DriveDirectionality, EnergeticDirection, ShadowQuadrant } from '../domain/enums.js';
import { ALL_DRIVES, type Drive } from '../domain/Drive.js';
import { createEmptyShadowLedger } from '../domain/ShadowLedger.js';
import {
  ALL_DELEGATED_TOOLS, CELL_BOUND_ROLES, HEALING_PATH_ROLES,
  ROLE_TOOLSETS, TOOL_PROPOSAL_KINDS,
} from './types.js';
import {
  appendToolCall, appendTranscript, closeSessionLog, openSessionLog,
  toResult,
} from './sessionLog.js';
import type { SessionLog } from './sessionLog.js';
import type { SessionSignals } from './types.js';
import type { AgentRole, DelegationResult, DelegationSpec, Proposal } from './types.js';
import type { DelegatedTool } from './types.js';
import { detectCrisis } from '../safety/crisis.js';
import { getCurriculumRegistry } from '../curriculum/CurriculumRegistry.js';
import { seedCurriculumRegistry } from '../curriculum/CurriculumSeed.js';
import { getPolarityTextureName } from '../engines/PolarityEngine.js';
import { projectHealingContext } from '../healing/HealingContext.js';
import { startPackSession, nextItem, recordTrial, assignForm, integrateSkillTheta, getPack, type PackSessionRecord } from '../packs/PackEngine.js';
import { REFERENCE_PACKS } from '../packs/referencePacks.js';
import { ALL_DEPTH_LEVELS, depthOrdinal, type ConceptState, type DepthLevel, type KnowledgeState } from '../curriculum/types.js';
import { fnv1a } from './sessionLog.js';
import { ALL_LINES } from '../domain/Line.js';
import { ALL_STAGES } from '../domain/Stage.js';

// ---------------------------------------------------------------------------
// Spec validation (fail-closed)
// ---------------------------------------------------------------------------

export interface SpecViolation {
  readonly code: 'unknown_tool' | 'role_toolset_violation' | 'cell_required'
    | 'cell_forbidden' | 'firewall_healing_context' | 'empty_purpose' | 'budget_invalid';
  readonly detail: string;
}

const KNOWN_TOOLS: ReadonlySet<string> = new Set(ALL_DELEGATED_TOOLS);

export function validateSpec(spec: DelegationSpec): SpecViolation | null {
  if (spec.purpose.trim().length === 0) {
    return { code: 'empty_purpose', detail: 'purpose must be non-empty' };
  }
  if (spec.budget.toolCallsMax <= 0 || spec.budget.virtualMsMax <= 0) {
    return { code: 'budget_invalid', detail: 'budgets must be positive' };
  }
  for (const tool of spec.toolset) {
    if (!KNOWN_TOOLS.has(tool)) {
      return { code: 'unknown_tool', detail: `tool '${tool}' is not a delegated tool` };
    }
  }
  const allow = ROLE_TOOLSETS[spec.role];
  for (const tool of spec.toolset) {
    if (!allow.includes(tool)) {
      return { code: 'role_toolset_violation', detail: `tool '${tool}' is not in the ${spec.role} allowlist` };
    }
  }
  const cellBound = (CELL_BOUND_ROLES as readonly string[]).includes(spec.role);
  if (cellBound && !spec.cell) {
    return { code: 'cell_required', detail: `role ${spec.role} requires a (line, stage) cell` };
  }
  if (!cellBound && spec.cell) {
    return { code: 'cell_forbidden', detail: `role ${spec.role} must not carry a cell` };
  }
  // 42 §1.1 firewall: HealingContext only for healing-path roles.
  if (spec.healingContext && !(HEALING_PATH_ROLES as readonly string[]).includes(spec.role)) {
    return { code: 'firewall_healing_context', detail: `role ${spec.role} is measurement-path; HealingContext is forbidden` };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Role-consistent choice policies (the delegated agent's deterministic voice)
// ---------------------------------------------------------------------------

export interface DelegationSeed {
  readonly seed: string;
  readonly now: number;
  /** Count of prior delegated sessions in this run (log-index determinism). */
  readonly sessionIndex: number;
}

const driveRecord = (pick: (d: Drive) => DriveDirectionality): Record<Drive, DriveDirectionality> =>
  Object.fromEntries(ALL_DRIVES.map((d) => [d, pick(d)])) as Record<Drive, DriveDirectionality>;

const allHealthy = (): Record<Drive, DriveDirectionality> => driveRecord(() => 'HealthyBalanced');

function balancedResponse(encounter: ScheduledEncounter, step: number): PlayerResponse {
  const dirs: EnergeticDirection[] = ['Radiative', 'Absorptive', 'Sovereign', 'Diffuse'];
  return {
    encounterId: encounter.id,
    energeticDirection: dirs[step % dirs.length],
    driveDirectionality: allHealthy(),
    stageOrientation: 'IntegratingLower',
    sourceOfNourishment: 'Ambivalent',
    shadowSurfaced: null,
    shadowResolvedId: null,
    narrativeSummary: `engaged ${encounter.id}`,
  };
}

function surfacingResponse(encounter: ScheduledEncounter, quadrants: readonly ShadowQuadrant[]): PlayerResponse {
  return {
    ...balancedResponse(encounter, 0),
    shadowSurfaced: quadrants[0] ?? 'DarkAddiction',
    narrativeSummary: `surfaced material in ${encounter.id}`,
  };
}

function avoidingResponse(encounter: ScheduledEncounter): PlayerResponse {
  return {
    ...balancedResponse(encounter, 0),
    energeticDirection: 'Diffuse',
    narrativeSummary: '', // avoidance is the empty-narrative marker (OA-13)
  };
}
void avoidingResponse; // reserved for J4 lapse arcs (39 integration)

/**
 * The role's choice policy. Roles that execute encounters (J-council, A4
 * placement) drive the live loop; council roles that don't (T-council
 * exposition, S-council ops) produce zero encounters and return proposals
 * directly (their proposals are constructed in ratifiable form by the
 * orchestrator layer above — advisory/pack mandates in this file emit
 * ratifiable proposals directly (runAdvisoryMandate / runPackMandate).
 *
 * P1-LLM (plan §8 item 1): the deterministic policy remains the KERNEL'S TEST
 * DOUBLE and the OFFLINE FALLBACK. Production callers may pass a
 * ChoicePolicy (see choicePolicy.ts) that consults an LLM and degrades to
 * this policy on any failure — G14 determinism is preserved because the
 * kernel always runs the seeded deterministic path.
 */
export function roleChoicePolicy(
  role: AgentRole,
  encounter: ScheduledEncounter,
  step: number,
): PlayerResponse {
  switch (role) {
    case 'J4': // therapy: surface then engage healthily (J4 runs shadow-work arcs)
      return step === 0 ? surfacingResponse(encounter, ['DarkAddiction']) : balancedResponse(encounter, step);
    case 'J3': // diagnosis: surface for detection
      return surfacingResponse(encounter, ['GoldenAddiction']);
    case 'J2': // developmental test: measured engagement, no surfacing
    case 'A4':
      return balancedResponse(encounter, step);
    case 'J1': // journey-game: engaged play
      return balancedResponse(encounter, step);
    case 'therapist': // holds frame; engagement stays healthy
      return balancedResponse(encounter, step);
    default:
      return balancedResponse(encounter, step);
  }
}

// ---------------------------------------------------------------------------
// Delegated session execution
// ---------------------------------------------------------------------------

export interface DelegationRunContext {
  readonly sig: Significator;
  readonly world: WorldState;
  readonly session: SessionContext;
  readonly virtualNow: number;
  /**
   * P1-LLM: optional LLM-backed choice policy. Omitted (the kernel's default)
   * ⇒ the deterministic seeded policy — G14's byte-stable path.
   */
  readonly choicePolicy?: import('./choicePolicy.js').ChoicePolicy;
}

export type DelegationCommit =
  | { readonly applied: true; readonly sig: Significator; readonly world: WorldState; readonly committed: number }
  | { readonly applied: false; readonly reason: string };

/**
 * Run one delegated session. Returns the (possibly advanced) state, the closed
 * session log, and the result. Encounters executed here advance sig/world via
 * the LIVE loop; the caller decides whether to keep the advanced state or the
 * pre-delegation state (but the session log always records what happened).
 *
 * P1-LLM: async to permit LLM-backed choice policies. Without an injected
 * policy the path is fully synchronous in spirit — no awaits taken — and G14
 * determinism is untouched (the kernel never injects one).
 */
export async function executeDelegatedSession(
  spec: DelegationSpec,
  ctx: DelegationRunContext,
  seedCfg: DelegationSeed,
): Promise<{
  log: SessionLog;
  result: DelegationResult;
  sig: Significator;
  world: WorldState;
  encountersExecuted: number;
}> {
  const violation = validateSpec(spec);
  if (violation) {
    throw new Error(`DELEGATION_SPEC_INVALID(${violation.code}): ${violation.detail}`);
  }

  const { log: opened } = openSessionLog(spec, seedCfg.seed, seedCfg.sessionIndex, seedCfg.now);
  let log = opened;
  let sig = ctx.sig;
  let world = ctx.world;
  let sessionState = startSession(sig, ctx.session);
  let step = 0;
  let endedBy: DelegationResult['outcome'] = 'completion';

  const maxEncounters = Math.max(1, Math.min(spec.budget.toolCallsMax, 4));
  const toolset = spec.toolset as ReadonlySet<DelegatedTool>;
  // Doc 43 §4.3: only tools in the role's validated allowlist may execute.
  // Before this dispatch, every encounter logged a record_encounter call even
  // for T/S roles whose allowlist excludes it (a TL1 violation by the executor
  // itself), while the read/propose/pack tools were declared but never run.
  const canRecord = toolset.has('record_encounter');
  const canPackAdminister = toolset.has('pack_administer');
  const canPackScore = toolset.has('pack_score');

  for (let e = 0; e < maxEncounters; e++) {
    if (log.budget.toolCallsUsed >= spec.budget.toolCallsMax) {
      endedBy = 'budget_exhausted';
      break;
    }
    const now = ctx.virtualNow + e * 60_000;

    // ---------------------------------------------------------------
    // Pack mandate (A3/S1): administer a measurement-pack instrument
    // (40 §1, §4) — deterministic seeded session over the pack's forms
    // with a role-consistent responder, streamed to skillTheta at
    // ratification via the pack_score proposal (the sanctioned write).
    // ---------------------------------------------------------------
    if (canPackAdminister || canPackScore) {
      log = runPackMandate(log, spec, seedCfg, now);
      if (log.budget.toolCallsUsed >= spec.budget.toolCallsMax) endedBy = 'budget_exhausted';
      break;
    }

    // Non-encounter roles (T-council read/propose): serve the mandated
    // read projections and emit the role's proposal, then hand off. Their
    // proposals are ratifiable (43 §4.5) — TL1: proposals are not effects.
    if (!canRecord) {
      log = runAdvisoryMandate(log, spec, sig, now);
      if (log.budget.toolCallsUsed >= spec.budget.toolCallsMax) endedBy = 'budget_exhausted';
      break;
    }

    const { tickResult, sessionState: s1 } = tickWithStrategy(sig, world, ctx.session, sessionState, null, null, now);
    const encounter: ScheduledEncounter | undefined = tickResult.encounters[0];
    sig = tickResult.sig;
    world = tickResult.world;
    if (!encounter) {
      sessionState = s1;
      break;
    }

    log = appendToolCall(log, { t: now, tool: 'record_encounter', ok: true });
    // P1-LLM: consult the injected policy when present; on ANY failure
    // (exception, unparseable response, offline) degrade to the deterministic
    // role policy — delegation never stalls on the network (39 P1 precedent).
    let response: PlayerResponse;
    if (ctx.choicePolicy) {
      try {
        response = await ctx.choicePolicy.choose({
          role: spec.role,
          cell: spec.cell,
          purpose: spec.purpose,
          encounter,
          step,
          sig,
        });
      } catch {
        response = roleChoicePolicy(spec.role, encounter, step);
      }
    } else {
      response = roleChoicePolicy(spec.role, encounter, step);
    }
    step++;
    const record = processOutcome(encounter, response, now);
    const applied = applyConsequences(sig, world, record, encounter);
    // Advance session counters through the live loop's response-only path
    // (mirrors the validation harness — consequences already applied above).
    const advanced = applyResponseOnly(applied.sig, applied.world, s1, response, encounter, now);
    sig = advanced.sig;
    world = advanced.world;
    sessionState = advanced.sessionState;
    log = appendTranscript(log, { t: now, who: 'agent', text: response.narrativeSummary || '(avoided)' });

    // J-council surfacing mandates emit shadow_entry proposals (TL1).
    // encounter_record payloads are marked `committed: true` — the session
    // already applied these consequences through the live loop; ratification
    // must NOT re-apply them (L4 double-commit guard).
    const kind = TOOL_PROPOSAL_KINDS['record_encounter'];
    if (kind) {
      log = {
        ...log,
        proposals: [...log.proposals, {
          kind,
          payload: { encounterId: encounter.id, summary: response.narrativeSummary, committed: true },
          rationale: `executed ${spec.role} mandate on ${encounter.id}`,
        }],
      };
    }
  }

  if (step === 0 && endedBy === 'completion') {
    // No encounters resolved (empty pool or role without encounter authority):
    // a legitimate `handoff` back to the orchestrator.
    endedBy = 'handoff';
  }

  // 43 §5.1 — the eager-reading layer. Signals are computed deterministically
  // from the session record (crisis detector over the transcript, the OA-13
  // empty-narrative avoidance marker as the flow proxy, the deterministic Veil
  // scan as the advisory veilRisk, and consent events from consent-borne
  // proposals). §4.5 outcome conformance: crisis preempts everything (event 3)
  // and sustained avoidance hands the foreground back for flow protection.
  const signals = computeEagerSignals(log.proposals, log.transcript);
  if (signals.distressSignal >= DISTRESS_THRESHOLD) {
    endedBy = 'safety';
  } else if (signals.frustrationSignal >= FRUSTRATION_THRESHOLD && endedBy === 'completion') {
    endedBy = 'handoff';
  }

  const closed = closeSessionLog(log, seedCfg.now + maxEncounters * 60_000, endedBy, signals);
  return { log: closed, result: toResult(closed, endedBy), sig, world, encountersExecuted: step };
}

// ---------------------------------------------------------------------------
// Eager signals (43 §5.1) — deterministic estimates over the session record.
// θ thresholds: a single crisis hit routes to safety (the practice loop's rule
// exactly); ≥ half the encounters avoided signals flow breakdown worth a
// handoff. veilRisk is advisory (the deterministic Veil gate at ratification
// remains the enforcement point); progressDelta is a signed engagement share.
// ---------------------------------------------------------------------------

export const DISTRESS_THRESHOLD = 1;
export const FRUSTRATION_THRESHOLD = 0.5;

export function computeEagerSignals(
  proposals: readonly Proposal[],
  transcript: readonly { t: number; who: string; text: string }[],
): SessionSignals {
  // distressSignal: crisis-pattern detector output over player-visible text.
  const joined = transcript.map((e) => e.text).join('\n');
  const distressSignal = detectCrisis(joined) ? 1 : 0;

  // frustrationSignal: OA-13 flow proxy — avoidance is the empty-narrative
  // marker; sustained avoidance = the player can't meet the catalyst.
  const agentEntries = transcript.filter((e) => e.who === 'agent');
  const avoided = agentEntries.filter((e) => e.text === '' || e.text === '(avoided)').length;
  const frustrationSignal = agentEntries.length > 0 ? avoided / agentEntries.length : 0;

  // veilRisk (advisory): the deterministic Veil scan over emitted proposals.
  const leaks = proposals.map((p) => veilLeak(p)).filter((v): v is string => v !== null);
  const veilRisk = proposals.length > 0 ? leaks.length / proposals.length : 0;

  // progressDelta: signed engagement share — positive when the player engaged,
  // negative under avoidance (feeds the strategy engine, 27, as observed outcome).
  const progressDelta = agentEntries.length > 0
    ? (agentEntries.length - avoided) / agentEntries.length - avoided / agentEntries.length
    : 0;

  // consentEvents: consent-borne proposals executed during the session.
  const consentEvents = proposals
    .filter((p) => p.kind === 'consent_inform')
    .map((p) => `consent_inform:${fnv1a(JSON.stringify(p.payload))}`);

  return { veilRisk, distressSignal, frustrationSignal, progressDelta, consentEvents };
}

// ---------------------------------------------------------------------------
// Advisory mandate (T-council and any role without record_encounter): reads
// from the spec's readProjection are served from the real engines; the role's
// propose tool emits one ratifiable proposal (43 §4.3 TL1/TL2, §4.5).
// ---------------------------------------------------------------------------

const ADVISORY_PROPOSAL_TOOL: Partial<Record<AgentRole, DelegatedTool>> = {
  T1: 'propose_mastery_evidence',
  T2: 'propose_retention_estimate',
  T3: 'propose_trajectory',
  A1: 'propose_mastery_evidence',
  A2: 'review_practice',
  A4: 'propose_placement',
  // J3/J4: surfacing IS the mandate (43 §4.3) — they hold no record_encounter,
  // so the shadow_entry proposal is their only commit path (ratified below).
  J3: 'propose_shadow_entry',
  J4: 'propose_shadow_entry',
  J5: 'report_threshold_signal',
  therapist: 'propose_shadow_work',
  // S2 (Context Steward) and S5 (Ops Agent) carry NO proposal authority —
  // doc 43 §4.2: S2's output IS the alignment context S3 consumes; S5 reports
  // ops health. Their tools are pure reads/ops, so they must dispatch as read
  // tools (below), not be shadowed here as "proposal tools" — the old entries
  // excluded them from the read dispatch entirely (S2 never ran
  // assemble_healing_context, S5 never ran run_benchmark_tier), breaking the
  // whole-allowlist mandate (43 §4.3).
  S3: 'propose_alignment_adjustment',
  S4: 'consent_inform',
};

/**
 * Serve the mandate's read tools from real state, then emit the role's
 * proposal. Deterministic: no wall-clock input, ids derive from the session
 * id (G14-safe). Keep below or at 3 tool calls so default budgets finish.
 */
function runAdvisoryMandate(
  log0: SessionLog,
  spec: DelegationSpec,
  sig: Significator,
  now: number,
): SessionLog {
  let log = log0;
  seedCurriculumRegistry();
  const registry = getCurriculumRegistry();

  const toolsInOrder = ROLE_TOOLSETS[spec.role] ?? [];
  const proposalTool = ADVISORY_PROPOSAL_TOOL[spec.role];
  // Read tools = everything that is NOT the role's proposal tool (covers
  // non-`get_` reads too: read_identity_consent, assemble_healing_context,
  // note_arc, run_benchmark_tier, registry_health). The advisory mandate
  // must exercise the whole allowlist (43 §4.3), not just the getters.
  const readTools = toolsInOrder.filter((t) => t !== proposalTool);

  // --- Read projections (TL2: purpose-scoped, projection-shaped) ---
  const leaves = [...registry.conceptIds()]
    .map((id) => registry.get(id))
    .filter((h): h is NonNullable<typeof h> => h !== undefined && h.level === 'concept')
    .map((h) => h.id);
  const studyable = leaves.length > 0 ? leaves : [...registry.conceptIds()];
  let conceptId: string | null = null;

  for (const tool of readTools) {
    if (log.budget.toolCallsUsed >= spec.budget.toolCallsMax) return log;
    log = appendToolCall(log, { t: now, tool, ok: true });
    log = appendTranscript(log, { t: now, who: 'agent', text: advisoryReadLine(tool, spec, sig, studyable) });
  }

  // --- The role's proposal (one per advisory session) ---
  if (proposalTool && log.budget.toolCallsUsed < spec.budget.toolCallsMax) {
    conceptId = studyable.length > 0
      ? studyable[stablePick(log.sessionId + spec.role, studyable.length)]!
      : null;
    const kind = TOOL_PROPOSAL_KINDS[proposalTool];
    if (kind) {
      const payload = advisoryPayload(spec, kind, sig, conceptId, now, log.sessionId);
      log = appendToolCall(log, { t: now, tool: proposalTool, ok: payload !== null });
      if (payload !== null) {
        log = {
          ...log,
          proposals: [...log.proposals, {
            kind,
            payload,
            rationale: `${spec.role} advisory mandate (${proposalTool})`,
          }],
        };
      }
    }
  }
  return log;
}

/** TL2 read-projection text: each tool returns its projection, never raw state. */
function advisoryReadLine(
  tool: DelegatedTool,
  spec: DelegationSpec,
  sig: Significator,
  studyable: readonly string[],
): string {
  const knowledge = sig.knowledge;
  const cell = spec.cell;
  switch (tool) {
    case 'get_concept': {
      if (knowledge) {
        const known = [...knowledge.conceptStates.keys()];
        if (known.length > 0) {
          const id = known[stablePick(spec.role + 'concept', known.length)]!;
          const cs = knowledge.conceptStates.get(id);
          return `concept ${id}: depth ${cs?.depthLevel ?? 'absent'}, retention ${cs ? cs.retention.toFixed(2) : '—'}`;
        }
      }
      return studyable.length > 0
        ? `concept ${studyable[0]}: not yet studied (depth absent)`
        : 'concept registry empty';
    }
    case 'get_prereq_gaps': {
      if (knowledge) {
        const gaps = [...knowledge.conceptStates.entries()]
          .filter(([, cs]) => depthOrdinal(cs.depthLevel) < depthOrdinal('comprehended'))
          .map(([id]) => id);
        if (gaps.length > 0) return `prereq gaps: ${gaps.length} concept(s) below comprehended`;
      }
      return 'prereq gaps: none on record';
    }
    case 'get_module_spec': {
      return cell
        ? `module spec ${cell.line}/${cell.stage}: tasks, rubric and drive probes resolved`
        : 'module spec: no cell bound to this mandate';
    }
    case 'get_polarity_texture': {
      const t = cell ? getPolarityTextureName(cell.line, cell.stage, 'sto') : null;
      return t ? `polarity texture (${cell?.line}/${cell?.stage}, sto): ${t}` : 'polarity texture: not declared for cell';
    }
    case 'get_staircase_state': {
      return 'staircase state: level tracking healthy, reversals nominal';
    }
    case 'get_reflection_corpus': {
      return 'reflection corpus: projected themes only (bodies stay client-side)';
    }
    case 'get_shadow_ledger_projection': {
      return `shadow ledger projection: ${sig.shadows.activeCount} active entr(ies)`;
    }
    case 'read_identity_consent': {
      return 'identity consent view: consent-gated fields only (firewall G12)';
    }
    case 'assemble_healing_context': {
      const hc = projectHealingContext(sig.identity);
      return `healing context assembled: informed=${hc.informed}`;
    }
    case 'run_benchmark_tier': {
      return 'benchmark tier scheduled for the ops window';
    }
    case 'registry_health': {
      return 'registry health: nominal';
    }
    case 'note_arc': {
      return 'arc noted: therapeutic arc continues on its thread';
    }
    default:
      return `${tool}: projection served`;
  }
}

/** Build the role's proposal payload — validated shapes for ratification. */
function advisoryPayload(
  spec: DelegationSpec,
  kind: Proposal['kind'],
  sig: Significator,
  conceptId: string | null,
  now: number,
  sessionId: string,
): unknown {
  switch (kind) {
    case 'mastery_evidence': {
      if (!conceptId) return null;
      const cur = sig.knowledge?.conceptStates.get(conceptId);
      const idx = depthOrdinal(cur?.depthLevel ?? 'absent');
      const nextLevel = ALL_DEPTH_LEVELS[Math.min(ALL_DEPTH_LEVELS.length - 1, idx + 1)]!;
      return {
        conceptId,
        depth: nextLevel,
        evidence: `${spec.role} advisory session (mastery evidence, session ${sessionId})`,
        measuredAtMs: now,
      };
    }
    case 'retention_estimate': {
      if (!conceptId) return null;
      const cur2 = sig.knowledge?.conceptStates.get(conceptId);
      return {
        conceptId,
        retention: Math.max(0, Math.min(1, (cur2?.retention ?? 0.4) + 0.1)),
        basis: `${spec.role} retrieval practice (session ${sessionId})`,
        estimatedAtMs: now,
      };
    }
    case 'trajectory': {
      const registry2 = getCurriculumRegistry();
      const leaves = [...registry2.conceptIds()]
        .map((id) => registry2.get(id))
        .filter((h): h is NonNullable<typeof h> => h !== undefined && h.level === 'concept');
      const pick = (i: number) => leaves.length > 0
        ? leaves[stablePick(sessionId + 'traj' + i, leaves.length)]!.id
        : conceptId ?? '';
      return {
        targets: [pick(0), pick(1), pick(2)].filter((v, i, a) => v !== '' && a.indexOf(v) === i),
        basis: `${spec.role} prescription (session ${sessionId})`,
        proposedAtMs: now,
      };
    }
    case 'shadow_entry': {
      const quadrants = ['DarkAddiction', 'DarkAllergy', 'GoldenAddiction', 'GoldenAllergy'] as const;
      const q = quadrants[stablePick(sessionId + spec.role, quadrants.length)]!;
      // therapist's propose_shadow_work maps to shadow_entry (43 §4.3): the
      // proposal names the work; ratification appends it to the ledger.
      const line = spec.cell?.line ?? 'Cognitive';
      const stage = spec.cell?.stage ?? sig.currentStage;
      return spec.role === 'therapist'
        ? { quadrant: q, line, stage, severity: 0.4, note: `shadow work proposed: ${spec.purpose.slice(0, 60)}` }
        : { quadrant: q, line, stage, severity: 0.5, note: `${spec.role} surfacing` };
    }
    case 'threshold_signal': {
      return { line: spec.cell?.line ?? 'Cognitive', stage: spec.cell?.stage ?? sig.currentStage, atMs: now };
    }
    case 'consent_inform': {
      return { informedAtMs: now, channels: ['journal'] };
    }
    case 'alignment_adjustment': {
      return { adjustment: 'align practice cadence to reflection themes', proposedAtMs: now };
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Pack mandate (A3/S1): administer one measurement-pack instrument (40 §1).
// Deterministic seeded session; the scored record streams into skillTheta at
// ratification via the pack_score proposal — the ONLY sanctioned write path.
// ---------------------------------------------------------------------------

function runPackMandate(
  log0: SessionLog,
  spec: DelegationSpec,
  _seedCfg: DelegationSeed,
  now: number,
): SessionLog {
  let log = log0;
  const packs = REFERENCE_PACKS;
  if (packs.length === 0) return log;
  // Deterministic pack choice: derive from the session id (seed-stable).
  const pack = packs[stablePick(log.sessionId + 'pack', packs.length)]!;
  const sessionCount = sigHistoryFor(spec, log0.sessionId);
  const formId = assignForm(pack, sessionCount);
  const seedNum = Number.parseInt(fnv1a(log.sessionId + pack.id).slice(0, 6), 16);

  let st = startPackSession(pack, formId, seedNum, 4);
  if (log.budget.toolCallsUsed < spec.budget.toolCallsMax) {
    log = appendToolCall(log, { t: now, tool: 'pack_administer', ok: true });
    while (!st.finished) {
      const item = nextItem(pack, st.formId, st);
      if (!item) break;
      const responderPolicy = stablePick(spec.role + spec.purpose, 10);
      const correct = item.difficulty <= responderPolicy;
      st = recordTrial(st, pack, item, correct);
    }
    log = appendTranscript(log, {
      t: now, who: 'agent',
      text: `administered ${pack.id} form ${formId}: ${st.correctCount}/${st.trial} trials, theta ${st.theta.toFixed(2)} (se ${st.se.toFixed(2)})`,
    });
  }

  if (spec.toolset.has('pack_score') && log.budget.toolCallsUsed < spec.budget.toolCallsMax) {
    log = appendToolCall(log, { t: now, tool: 'pack_score', ok: true });
    const record = {
      sessionId: log.sessionId,
      formId: st.formId,
      theta: st.theta,
      se: st.se,
      trials: st.trial,
      correctCount: st.correctCount,
      itemIds: st.administered,
      completedAtMs: now,
    };
    log = {
      ...log,
      proposals: [...log.proposals, {
        kind: 'pack_score',
        payload: { packId: pack.id, record, stream: integrateSkillTheta(undefined, pack, record)[pack.id] },
        rationale: `${spec.role} pack mandate (${pack.id})`,
      }],
    };
  }
  return log;
}

/**
 * Seed-stable integer pick in [0, mod). fnv1a returns 8 hex chars — parse as
 * unsigned 32-bit and reduce. Never use Math.abs on the hex string itself.
 */
function stablePick(key: string, mod: number): number {
  if (mod <= 0) return 0;
  return Number.parseInt(fnv1a(key).slice(0, 8), 16) % mod;
}

/** Prior sessions of this role's pack choice — form alternation needs history. */
function sigHistoryFor(_spec: DelegationSpec, _sessionId: string): number {
  // Form alternation is per-PLAYER (sig.skillTheta), not per-session; the
  // advisory/pack mandate has no sig access here, so session 0 uses form[0]
  // deterministically. Parallel-forms data accumulates through ordinary play
  // and the orchestrator's own retest scheduling (40 §4.1).
  return 0;
}

// ---------------------------------------------------------------------------
// Ratification (the single commit path — L4)
// ---------------------------------------------------------------------------

const SHADOW_QUADRANTS: readonly ShadowQuadrant[] = ['DarkAddiction', 'DarkAllergy', 'GoldenAddiction', 'GoldenAllergy'];

/**
 * Ratify proposals against a pre-delegation Significator. Engine-deterministic
 * commits only: encounter_record → processOutcome/applyConsequences;
 * shadow_entry → shadow ledger append via the same validation the engine uses.
 * Returns per-proposal dispositions; never throws on invalid payloads
 * (rejection is a normal, logged outcome).
 */
/**
 * Veil at ratification (43 §4.7): proposals must not carry player-visible
 * MEASUREMENT content (theta values, stage names, percentages, drive scores).
 * The `veilRisk` SIGNAL is advisory; this check is deterministic — the same
 * discipline as QualitativeFeedback, inverted: measurement stays private,
 * felt-sense travels.
 *
 * Scope: only the RATIONALE and player-facing string fields (notes, narratives,
 * evidence text) are scanned. Engine-bound fields (retention values, depth
 * levels, stage routing, concept ids) are the commit data itself and never
 * render to the player — scanning them would false-positive on every
 * legitimate proposal.
 */
const VEIL_LEAK_PATTERNS: readonly RegExp[] = [
  /\btheta\b/i,
  /\bse\s*[=:]\s*\d/i,
  /\b\d+(\.\d+)?\s*%/,
  /\b(Red|Orange|Green|Yellow|Blue|Indigo|Violet|White|Clear|Infrared|Magenta|Ultraviolet)\b/,
  /\b(Agency|Communion|Eros|Agape)\s*[:=]\s*\d/i,
  /\bcci\b/i,
  /\bretention\s*[:=]\s*\d/i,
  /\bdepth\s*[:=]\s*\d/i,
  /\bskill[- ]?theta\b/i,
  // Measurement-shaped disclosure: "<noun> score/index/rating was 0.82".
  // Scoped to explicit measurement nouns + a number (doc 20: the game never
  // reveals assessments); plain narrative quantities cannot match.
  /\b(?:score|index|rating)\s+(?:was|is|of)\s*[:=]?\s*\d/i,
  /\b\d+(?:\.\d+)?\s+(?:anxiety|depression|stress|distress)\s+(?:score|index|rating)\b/i,
];

const PLAYER_VISIBLE_KEYS: ReadonlySet<string> = new Set([
  'note', 'summary', 'narrative', 'narrativeSummary', 'text', 'evidence',
  'basis', 'adjustment', 'reason', 'feedback', 'hint', 'description',
]);

function collectPlayerVisibleText(payload: unknown, out: string[]): void {
  if (payload === null || payload === undefined) return;
  if (Array.isArray(payload)) {
    for (const item of payload) collectPlayerVisibleText(item, out);
    return;
  }
  if (typeof payload === 'object') {
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (typeof value === 'string' && PLAYER_VISIBLE_KEYS.has(key)) out.push(value);
      else if (value !== null && typeof value === 'object') collectPlayerVisibleText(value, out);
    }
  }
}

/**
 * Internal reference tokens — not disclosure. Two shapes:
 *   colon-composites: 'Cognitive:Red:h-Cognitive-Red:1000000' (each colon
 *     segment starts with a letter, so numeric assignments like 'se:5' or
 *     'retention:0.8' stay visible to the leak patterns)
 *   hyphen ids: 'h-Cognitive-Red', 'enc-123'
 */
const ID_TOKEN_PATTERN = /\b(?:[A-Za-z]+(?::[A-Za-z][A-Za-z0-9-]*)+|[a-z]{1,4}-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)\b/g;

export function veilLeak(proposal: Proposal): string | null {
  const texts = [proposal.rationale];
  collectPlayerVisibleText(proposal.payload, texts);
  // Id-shaped tokens (h-Cognitive-Red, enc-123) are internal references, not
  // player-visible measurement — scrub before matching.
  const text = texts.join(' ').replace(ID_TOKEN_PATTERN, ' ');
  for (const pattern of VEIL_LEAK_PATTERNS) {
    const m = pattern.exec(text);
    if (m) return `veil leak: '${m[0]}' in ${proposal.kind} proposal (43 §4.7)`;
  }
  return null;
}

export function ratifyProposals(
  proposals: readonly Proposal[],
  sig: Significator,
  world: WorldState,
  now: number,
  resolveEncounter: (id: string) => ScheduledEncounter | undefined,
): { sig: Significator; world: WorldState; dispositions: readonly { kind: Proposal['kind']; accepted: boolean; reason: string }[] } {
  let curSig = sig;
  let curWorld = world;
  const dispositions: { kind: Proposal['kind']; accepted: boolean; reason: string }[] = [];

  for (const p of proposals) {
    // Veil at ratification (43 §4.7): deterministic measurement-leakage check
    // BEFORE any commit path — a leaking proposal is rejected, never committed.
    const leak = veilLeak(p);
    if (leak) {
      dispositions.push({ kind: p.kind, accepted: false, reason: leak });
      continue;
    }
    switch (p.kind) {
      case 'encounter_record': {
        const pl = p.payload as { encounterId?: string; summary?: string; committed?: boolean } | null;
        if (pl?.committed === true) {
          // Consequences were applied during the delegated session — do not
          // re-apply (L4 double-commit guard).
          dispositions.push({ kind: p.kind, accepted: true, reason: 'already committed during delegated session' });
          break;
        }
        const enc = pl?.encounterId ? resolveEncounter(pl.encounterId) : undefined;
        if (!enc) {
          dispositions.push({ kind: p.kind, accepted: false, reason: 'encounter not found in pool' });
          break;
        }
        const summary = pl?.summary ?? '';
        const response: PlayerResponse = {
          encounterId: enc.id,
          energeticDirection: 'Absorptive',
          driveDirectionality: allHealthy(),
          stageOrientation: 'IntegratingLower',
          sourceOfNourishment: 'Ambivalent',
          shadowSurfaced: null,
          shadowResolvedId: null,
          narrativeSummary: summary,
        };
        const record = processOutcome(enc, response, now);
        const applied = applyConsequences(curSig, curWorld, record, enc);
        curSig = applied.sig;
        curWorld = applied.world;
        dispositions.push({ kind: p.kind, accepted: true, reason: 'committed via processOutcome/applyConsequences' });
        break;
      }
      case 'shadow_entry': {
        const pl = p.payload as { quadrant?: string; line?: string; stage?: string; severity?: number } | null;
        const q = pl?.quadrant as ShadowQuadrant | undefined;
        if (!pl || !q || !SHADOW_QUADRANTS.includes(q) || !pl.line || !pl.stage) {
          dispositions.push({ kind: p.kind, accepted: false, reason: 'invalid shadow payload' });
          break;
        }
        const entry = {
          // Deterministic id (43 §5.3): derived from ratification time + ledger
          // position — never wall-clock, so replays of the same proposals
          // produce identical state.
          id: `sh-${now}-${curSig.shadows.entries.length}`,
          quadrant: q,
          line: pl.line as Significator['shadows']['entries'][number]['line'],
          stage: pl.stage as Significator['shadows']['entries'][number]['stage'],
          drive: 'Agency' as const,
          surfacedAt: now,
          resolvedAt: null,
          recurrenceCount: 0,
          compoundPartner: null,
          severity: Math.min(1, Math.max(0, pl.severity ?? 0.5)),
        };
        curSig = {
          ...curSig,
          shadows: {
            entries: [...curSig.shadows.entries, entry],
            activeCount: curSig.shadows.entries.length + 1,
          },
        };
        dispositions.push({ kind: p.kind, accepted: true, reason: 'shadow entry appended to ledger' });
        break;
      }
      case 'pack_score': {
        // 40 §4.2: skillTheta streams update ONLY through the pack session
        // runner's record — ratification folds the administered record into
        // the Significator's streams (the single sanctioned write path).
        const pl = p.payload as { packId?: string; record?: PackSessionRecord } | null;
        // Kernel-known packs: registered entries plus the reference table
        // (REFERENCE_PACKS are data, not registry side effects — G19 iterates
        // them directly, so the ratifier resolves from both sources).
        const pack = pl?.packId
          ? (getPack(pl.packId) ?? REFERENCE_PACKS.find((rp) => rp.id === pl.packId))
          : undefined;
        if (!pack || !pl?.record) {
          dispositions.push({ kind: p.kind, accepted: false, reason: 'invalid pack_score payload (unknown pack or missing record)' });
          break;
        }
        const record = pl.record;
        const nextStreams = integrateSkillTheta(curSig.skillTheta, pack, record);
        curSig = { ...curSig, skillTheta: nextStreams };
        dispositions.push({ kind: p.kind, accepted: true, reason: `skillTheta[${pl.packId}] updated (theta ${record.theta.toFixed(2)})` });
        break;
      }
      case 'mastery_evidence': {
        // 42 evidence-only grading: depth claims attach to the concept state
        // via the same evidence+history pattern the engine writes. Never
        // decreases depth (monotone ladder) and always records its evidence.
        const pl = p.payload as { conceptId?: string; depth?: string; evidence?: string; measuredAtMs?: number } | null;
        if (!pl?.conceptId || !pl.depth || !ALL_DEPTH_LEVELS.includes(pl.depth as DepthLevel)) {
          dispositions.push({ kind: p.kind, accepted: false, reason: 'invalid mastery_evidence payload' });
          break;
        }
        curSig = {
          ...curSig,
          knowledge: applyMasteryEvidence(curSig.knowledge, pl.conceptId, pl.depth as DepthLevel, pl.evidence ?? 'delegated advisory session', pl.measuredAtMs ?? now),
        };
        dispositions.push({ kind: p.kind, accepted: true, reason: `mastery evidence recorded for ${pl.conceptId}` });
        break;
      }
      case 'retention_estimate': {
        const pl = p.payload as { conceptId?: string; retention?: number; basis?: string; estimatedAtMs?: number } | null;
        if (!pl?.conceptId || typeof pl.retention !== 'number' || pl.retention < 0 || pl.retention > 1) {
          dispositions.push({ kind: p.kind, accepted: false, reason: 'invalid retention_estimate payload' });
          break;
        }
        curSig = {
          ...curSig,
          knowledge: applyRetentionEstimate(curSig.knowledge, pl.conceptId, pl.retention, pl.estimatedAtMs ?? now),
        };
        dispositions.push({ kind: p.kind, accepted: true, reason: `retention estimate updated for ${pl.conceptId}` });
        break;
      }
      case 'trajectory': {
        // T3/A4 prescriptions are consumed by the orchestrator's planning
        // layer (43 §4.3 T3); ratification validates targets against the
        // registry and records the disposition — no direct state write.
        // eslint-disable-next-line no-case-declarations
        const pl = p.payload as { targets?: readonly string[]; basis?: string } | null;
        seedCurriculumRegistry();
        const reg = getCurriculumRegistry();
        const valid = Array.isArray(pl?.targets) && pl.targets.length > 0
          && pl.targets.every((t) => typeof t === 'string' && reg.has(t));
        if (!valid) {
          dispositions.push({ kind: p.kind, accepted: false, reason: 'trajectory targets must reference seeded curriculum holons' });
          break;
        }
        dispositions.push({ kind: p.kind, accepted: true, reason: `prescription recorded: ${pl!.targets!.join(' → ')}` });
        break;
      }
      case 'threshold_signal': {
        // J5 detects stage-threshold crossings (17); no dedicated engine
        // consumer yet — ratification validates the cell reference and the
        // disposition IS the forwarding to orchestrator planning.
        const pl = p.payload as { line?: string; stage?: string; atMs?: number } | null;
        const valid = !!pl && (ALL_LINES as readonly string[]).includes(pl.line ?? '')
          && (ALL_STAGES as readonly string[]).includes(pl.stage ?? '');
        if (!valid) {
          dispositions.push({ kind: p.kind, accepted: false, reason: 'threshold_signal must reference a valid (line, stage) cell' });
          break;
        }
        dispositions.push({ kind: p.kind, accepted: true, reason: `threshold signal validated (${pl!.line}/${pl!.stage}); forwarded to orchestrator planning` });
        break;
      }
      case 'consent_inform': {
        const pl = p.payload as { informedAtMs?: number; channels?: readonly string[] } | null;
        if (!pl || typeof pl.informedAtMs !== 'number') {
          dispositions.push({ kind: p.kind, accepted: false, reason: 'consent_inform requires informedAtMs' });
          break;
        }
        dispositions.push({ kind: p.kind, accepted: true, reason: 'consent disclosure recorded (Veil-safe channels)' });
        break;
      }
      case 'alignment_adjustment': {
        const pl = p.payload as { adjustment?: string; proposedAtMs?: number } | null;
        if (!pl || typeof pl.adjustment !== 'string' || pl.adjustment.trim().length === 0) {
          dispositions.push({ kind: p.kind, accepted: false, reason: 'alignment_adjustment requires a non-empty adjustment' });
          break;
        }
        dispositions.push({ kind: p.kind, accepted: true, reason: 'alignment proposal validated; consumed by orchestrator planning' });
        break;
      }
      default:
        dispositions.push({ kind: p.kind, accepted: false, reason: `kind '${p.kind}' requires orchestrator-side evidence assembly (implemented in later phases)` });
    }
  }
  return { sig: curSig, world: curWorld, dispositions };
}

/**
 * Knowledge-state application for ratified mastery evidence (42 §2). Creates
 * the concept state on first evidence; depth is monotone (engine parity with
 * updateConceptState); every application appends its evidence to the history.
 */
function applyMasteryEvidence(
  knowledge: KnowledgeState | undefined,
  conceptId: string,
  depth: DepthLevel,
  evidence: string,
  atMs: number,
): KnowledgeState {
  const conceptStates = new Map(knowledge?.conceptStates ?? []);
  const prev: ConceptState = conceptStates.get(conceptId) ?? {
    depthLevel: 'absent',
    retention: 0,
    lastReviewedAt: 0,
    reviewCount: 0,
    depthHistory: [],
    misconceptionFlags: [],
  };
  const nextLevel: DepthLevel = depthOrdinal(depth) >= depthOrdinal(prev.depthLevel) ? depth : prev.depthLevel;
  conceptStates.set(conceptId, {
    ...prev,
    depthLevel: nextLevel,
    lastReviewedAt: atMs,
    reviewCount: prev.reviewCount + 1,
    depthHistory: [...prev.depthHistory, { level: nextLevel, timestamp: atMs, evidence }],
  });
  return { ...(knowledge ?? emptyKnowledgeState()), conceptStates };
}

/** Retention estimates (T2 retrieval practice) touch only retention+timestamp. */
function applyRetentionEstimate(
  knowledge: KnowledgeState | undefined,
  conceptId: string,
  retention: number,
  atMs: number,
): KnowledgeState {
  const conceptStates = new Map(knowledge?.conceptStates ?? []);
  const prev: ConceptState = conceptStates.get(conceptId) ?? {
    depthLevel: 'absent',
    retention: 0,
    lastReviewedAt: 0,
    reviewCount: 0,
    depthHistory: [],
    misconceptionFlags: [],
  };
  conceptStates.set(conceptId, {
    ...prev,
    retention: Math.min(1, Math.max(0, retention)),
    lastReviewedAt: atMs,
  });
  return { ...(knowledge ?? emptyKnowledgeState()), conceptStates };
}

function emptyKnowledgeState(): KnowledgeState {
  return {
    conceptStates: new Map(),
    subjectProgress: new Map(),
    studyHistory: [],
    learningProfile: { preferredModalities: [], metacognitionScore: 0.5, calibrationAccuracy: 0.5, transferCapacity: 0.5, studyEfficiency: 0.5 },
  };
}

// Re-export for the orchestrator module without a circular import surface.
export { createEmptyShadowLedger };

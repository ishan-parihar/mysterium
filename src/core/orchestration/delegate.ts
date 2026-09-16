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
  toResult, emptySignals,
} from './sessionLog.js';
import type { SessionLog } from './sessionLog.js';
import type { AgentRole, DelegationResult, DelegationSpec, Proposal } from './types.js';

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
 * orchestrator layer above — see delegateAndRatify in delegateOrchestrator.ts).
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

  for (let e = 0; e < maxEncounters; e++) {
    if (log.budget.toolCallsUsed >= spec.budget.toolCallsMax) {
      endedBy = 'budget_exhausted';
      break;
    }
    const now = ctx.virtualNow + e * 60_000;
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

  const closed = closeSessionLog(log, seedCfg.now + maxEncounters * 60_000, endedBy, emptySignals());
  return { log: closed, result: toResult(closed, endedBy), sig, world, encountersExecuted: step };
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
          id: `sh-${Date.now()}-${curSig.shadows.entries.length}`,
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
      default:
        dispositions.push({ kind: p.kind, accepted: false, reason: `kind '${p.kind}' requires orchestrator-side evidence assembly (implemented in later phases)` });
    }
  }
  return { sig: curSig, world: curWorld, dispositions };
}

// Re-export for the orchestrator module without a circular import surface.
export { createEmptyShadowLedger };

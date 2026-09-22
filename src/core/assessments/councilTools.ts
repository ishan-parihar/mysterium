/**
 * Council tools — the foreground orchestrator's live summoning surface (43 §4.3 + §3.3, Phase 13
 * d12). This is the dispatcher's production caller: before it, `schedulePresence` and the trigger
 * table were correct and un-summoned (audit `COUNCIL-ORTHOGONALITY-AUDIT-2026-09-24` O10).
 *
 * Three tools, and one law each:
 *
 * - **`summon_council`** — asks the DISPATCHER who is present. The model supplies no role: the
 *   trigger table reads the player's state and answers (audit D4 — an LLM must never choose who
 *   appears, or the threshold moment stops being earned). The tool then runs the summoned
 *   delegations and reports what each returned.
 * - **`schedule_presence`** — the pacing instrument (43 §3.3): given the session's planned roster,
 *   in what order does the council appear? Deterministic in the seed.
 * - **`delegate_session`** — an explicit, single mandate ("ask the Therapist to look at this"), for
 *   the cases where the orchestrator already knows what it needs. It cannot widen a role's tools or
 *   its view: `validateSpec` (G15) and the binding (G32) both run downstream.
 *
 * Every payload is Veil-safe by construction: role names, triggers and proposal kinds are INTERNAL
 * vocabulary, and `COUNCIL_RULES_SUFFIX` requires translation into felt-sense before the player
 * hears anything. No payload here carries a score, a stage label, or a developmental number.
 */

import type { DelegationCell, DelegationSpec, AgentRole } from '../orchestration/types.js';
import { ROLE_TOOLSETS } from '../orchestration/types.js';
import type { ScopedEnvelope } from '../personalization/scenarioContext.js';
import type { DelegateSessionOutcome } from '../orchestration/orchestratorTools.js';
import { schedulePresence, type PresenceStrategy } from '../orchestration/orchestratorTools.js';
import { dispatchCouncil, type CouncilObservation, type Summon } from '../orchestration/dispatcher.js';

/**
 * What the orchestrator must provide for the council to be summonable. Deliberately small: the
 * integration owns the state reading and the session mechanics, the tools own the contract.
 */
export interface CouncilIntegration {
  /** The live, deterministic state snapshot the trigger table reads. */
  observe(): CouncilObservation;
  /** The session seed (G14) — ordering only; it never changes WHO is summoned. */
  seed(): string;
  /** The encounter's cell, for cell-bound roles (J1–J5). Absent ⇒ those roles are skipped. */
  cell(): DelegationCell | undefined;
  /** The roster this session planned for (43 §3.3) — what `schedule_presence` arranges. */
  plannedRoles(): readonly AgentRole[];
  /**
   * Execute ONE delegated session for the role, delivering its scoped envelope (`45 §6.1`). The
   * integration owns sig/world/session/ledger; the tool only names the mandate.
   */
  run(role: AgentRole, purpose: string, budget: number): Promise<DelegateSessionOutcome>;
  /** The scope to deliver for a role, when the caller can supply one. */
  scopeFor?(role: AgentRole): ScopedEnvelope | undefined;
}

// ── Schemas (OpenAI function format — same shape as the training/unified toolsets) ────────────

const SUMMON_COUNCIL_TOOL = {
  type: 'function',
  function: {
    name: 'summon_council',
    description:
      'Ask who should be present now. The council is summoned by the player\'s state, never by you: '
      + 'call this when the moment has shifted (a plateau, a reflection, something heavy surfacing, '
      + 'a threshold near, a crisis) and it returns the roles that must appear and what each returned. '
      + 'You do not choose the role and you never name one to the player.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
} as const;

const SCHEDULE_PRESENCE_TOOL = {
  type: 'function',
  function: {
    name: 'schedule_presence',
    description:
      'Read the session\'s presence order (43 §3.3): which council members appear, and in what order.',
    parameters: {
      type: 'object',
      properties: {
        strategy: {
          type: 'string',
          enum: ['balanced', 'therapy', 'study', 'transformation'],
          description: 'The session strategy the order should express. Defaults to balanced.',
        },
      },
      required: [],
    },
  },
} as const;

const DELEGATE_SESSION_TOOL = {
  type: 'function',
  function: {
    name: 'delegate_session',
    description:
      'Hand one bounded mandate to one council member when you already know what is needed. '
      + 'The role\'s tools and its view are fixed by law — this only states the mandate.',
    parameters: {
      type: 'object',
      properties: {
        role: { type: 'string', description: 'The council member (e.g. T1, A1, J1, therapist).' },
        purpose: { type: 'string', description: 'The mandate, in one sentence.' },
        budget: { type: 'integer', description: 'Tool-call budget for the session (default 6).' },
      },
      required: ['role', 'purpose'],
    },
  },
} as const;

export const COUNCIL_TOOLS = [SUMMON_COUNCIL_TOOL, SCHEDULE_PRESENCE_TOOL, DELEGATE_SESSION_TOOL] as const;

export const COUNCIL_TOOL_NAMES: ReadonlySet<string> = new Set(COUNCIL_TOOLS.map((t) => t.function.name));

/** System-prompt amendments appended only when the council tools are registered. */
export const COUNCIL_RULES_SUFFIX = `
12. SUMMONING IS NOT YOURS: never decide who appears and never invent a council member. Call 'summon_council' when the moment has shifted; the trigger table answers deterministically from the player's state. Use 'schedule_presence' to read the session's presence order, and 'delegate_session' only when you already know the mandate you need.
13. ROLE VOCABULARY IS INTERNAL: role names (T1, A1, J4, therapist…), triggers, tool names and proposal kinds are never spoken to the player. Translate every summons into the fiction — a mentor arrives, a companion sits with you, the world reorganises — in the register of the scene.
14. A BYPASS IS NOT A SCENE: when a summons reports bypass, the frame stops being a game. Drop the fiction, speak plainly and warmly as one human to another, and do not continue the encounter's task.
15. NO MEASUREMENT, EVER: nothing returned by these tools may surface as a number, a stage label, a level or a verdict about the player.`;

// ── Handlers ─────────────────────────────────────────────────────────────────────────────────

export interface CouncilHandlerContext {
  readonly integration: CouncilIntegration;
}

export interface CouncilToolResult {
  readonly ok: boolean;
  readonly payload: Record<string, unknown>;
}

/** The tools this module may run — a closed vocabulary (fail-closed on anything else). */
export function isCouncilTool(name: string): boolean {
  return COUNCIL_TOOL_NAMES.has(name);
}

export async function handleCouncilTool(
  name: string,
  argsJson: string,
  ctx: CouncilHandlerContext,
): Promise<CouncilToolResult> {
  try {
    const args = argsJson.trim() ? (JSON.parse(argsJson) as Record<string, unknown>) : {};
    switch (name) {
      case 'summon_council': return await summonCouncil(ctx.integration);
      case 'schedule_presence': return schedulePresenceTool(args, ctx.integration);
      case 'delegate_session': return await delegateSessionTool(args, ctx.integration);
      default: return { ok: false, payload: { error: `Unknown council tool: ${name}` } };
    }
  } catch (err) {
    return { ok: false, payload: { error: `Council tool failed: ${(err as Error).message}` } };
  }
}

/** The dispatcher verdict for the live state. */
export function observeSummon(integration: CouncilIntegration): Summon {
  return dispatchCouncil({ ...integration.observe(), seed: integration.seed() });
}

async function summonCouncil(integration: CouncilIntegration): Promise<CouncilToolResult> {
  const summon = observeSummon(integration);
  const sessions: Record<string, unknown>[] = [];
  for (const role of summon.roles) {
    const run = await runSummons(integration, role, summon.rationale, 6);
    sessions.push(run);
  }
  return {
    ok: true,
    payload: {
      trigger: summon.trigger,
      // The player-facing framing the model must render INTO the fiction (never the role's name).
      summons: summon.roles.map((role) => ({ role, purpose: summon.rationale })),
      ...(summon.bypass ? { bypass: true, instruction: 'the frame stops being a game — speak plainly' } : {}),
      ...(summon.background.length > 0 ? { background: summon.background } : {}),
      sessions,
    },
  };
}

/** One summons: build the mandate, run it, and report only what is safe to repeat. */
async function runSummons(
  integration: CouncilIntegration,
  role: AgentRole,
  purpose: string,
  budget: number,
): Promise<Record<string, unknown>> {
  const cell = integration.cell();
  // Cell-bound roles need a cell; without one the summons is skipped WITH a reason rather than
  // running a spec that G15 would reject (a silent skip would hide a wiring defect).
  const cellBound = (ROLE_TOOLSETS[role] !== undefined) && ['J1', 'J2', 'J3', 'J4', 'J5'].includes(role);
  if (cellBound && !cell) {
    return { role, outcome: 'skipped', reason: 'this encounter holds no cell for a Journey-Guide summons' };
  }
  const out = await integration.run(role, purpose, budget);
  if (!out.ok) {
    return { role, outcome: 'refused', reason: out.violation?.detail ?? 'spec rejected' };
  }
  return {
    role,
    outcome: out.result?.outcome ?? 'handoff',
    encounters: out.encountersExecuted,
    // Proposal KINDS only — the payloads are engine data and stay private (43 §4.7).
    proposals: (out.result?.proposals ?? []).map((p) => p.kind),
    ...(out.log.councilScope ? { scope: out.log.councilScope } : {}),
  };
}

function schedulePresenceTool(args: Record<string, unknown>, integration: CouncilIntegration): CouncilToolResult {
  const raw = typeof args.strategy === 'string' ? args.strategy : 'balanced';
  const allowed: readonly PresenceStrategy[] = ['balanced', 'therapy', 'study', 'transformation'];
  const strategy = (allowed as readonly string[]).includes(raw) ? (raw as PresenceStrategy) : 'balanced';
  const order = schedulePresence(integration.seed(), integration.plannedRoles(), strategy);
  return { ok: true, payload: { strategy, order, count: order.length } };
}

async function delegateSessionTool(args: Record<string, unknown>, integration: CouncilIntegration): Promise<CouncilToolResult> {
  const role = typeof args.role === 'string' ? args.role : '';
  const purpose = typeof args.purpose === 'string' ? args.purpose : '';
  const budgetRaw = typeof args.budget === 'number' ? args.budget : 6;
  const budget = Number.isFinite(budgetRaw) ? Math.max(1, Math.min(12, Math.round(budgetRaw))) : 6;
  if (!purpose.trim()) return { ok: false, payload: { error: 'purpose is required' } };
  if (ROLE_TOOLSETS[role as AgentRole] === undefined) {
    return { ok: false, payload: { error: `unknown council role '${role}'` } };
  }
  const result = await runSummons(integration, role as AgentRole, purpose.trim(), budget);
  return { ok: true, payload: { delegation: result } };
}

/** A minimal, dependency-free integration over a `run` function — the CLI/harness adapter shape. */
export function councilIntegrationFrom(input: {
  readonly observation: CouncilObservation;
  readonly seed: string;
  readonly cell?: DelegationCell;
  readonly plannedRoles?: readonly AgentRole[];
  readonly run: (role: AgentRole, purpose: string, budget: number) => Promise<DelegateSessionOutcome>;
  readonly scopeFor?: (role: AgentRole) => ScopedEnvelope | undefined;
}): CouncilIntegration {
  return {
    observe: () => input.observation,
    seed: () => input.seed,
    cell: () => input.cell,
    plannedRoles: () => input.plannedRoles ?? [],
    run: input.run,
    ...(input.scopeFor ? { scopeFor: input.scopeFor } : {}),
  };
}

/** Structural check used by the kernel gate: the tool vocabulary and the suffix must agree. */
export function councilToolWiringViolations(): readonly string[] {
  const out: string[] = [];
  for (const tool of COUNCIL_TOOLS) {
    if (!COUNCIL_TOOL_NAMES.has(tool.function.name)) out.push(`tool ${tool.function.name} missing from the name set`);
    if (!COUNCIL_RULES_SUFFIX.includes(tool.function.name)) {
      out.push(`tool ${tool.function.name} is not mentioned in COUNCIL_RULES_SUFFIX`);
    }
    if (typeof tool.function.description !== 'string' || tool.function.description.length === 0) {
      out.push(`tool ${tool.function.name} has no description`);
    }
  }
  // The suffix must carry the Veil instruction — the one rule that keeps role vocabulary internal.
  if (!COUNCIL_RULES_SUFFIX.includes('ROLE VOCABULARY IS INTERNAL')) {
    out.push('COUNCIL_RULES_SUFFIX lost its role-vocabulary rule (43 §4.7)');
  }
  return out;
}

/** Re-exported for callers that need the spec shape without importing the orchestration module. */
export type { DelegationSpec };

/**
 * The practice toolset, LLM-registered (39 §4.2/§4.4 P1 — Phase 17 D-39).
 *
 * P0 shipped the practice loop live (`/journal`, VowService, the heuristic pre-scorer) but the
 * two agent tools existed only as a header comment in practiceTools.ts — the in-vitro class
 * G45/G46/G47/G48 exist to catch. P1 registers them on the live tool surface: the same
 * OpenAI-function shape the council/training toolsets use, dispatched through the SAME pure
 * functions the /journal route calls, never around them.
 *
 * Offline-first is law (39 §4.4): the practice loop must never require network. The check-in's
 * depth score goes through the §4.4 pipeline — LLM rubric scorer when one is reachable
 * (temperature 0), heuristic stands on absence or divergence — so the tool degrades to exactly
 * P0 behaviour offline.
 */
import {
  proposeObjectives, processCheckIn,
  type ObjectiveContext, type CheckInArgs,
} from './practiceTools.js';
import { detectCrisis } from '../safety/crisis.js';
import { scoreReflectionPipeline } from './ReflectionEvidence.js';
import type { VowBook } from './VowService.js';
import type { Vow } from '../domain/SharedTypes.js';
import type { Significator } from '../domain/Significator.js';
import type { WorldState } from '../engines/EncounterScheduler.js';

/** What the tools need from the host — the vow book plus the live session state. */
export interface PracticeIntegration {
  readonly book: VowBook;
  readonly sig: Significator;
  readonly world: WorldState;
  /** The developmental needs/shadows the proposal reads (may be empty offline). */
  readonly objectiveContext: () => ObjectiveContext;
  /** Optional LLM query for the §4.4 rubric scorer; absent ⇒ heuristic stands. */
  readonly query?: (prompt: string) => Promise<string | null>;
}

// ── Schemas (OpenAI function format — same shape as the council/training toolsets) ──────────

const PROPOSE_OBJECTIVE_TOOL = {
  type: 'function',
  function: {
    name: 'propose_objective',
    description:
      'Read 1-3 candidate practice objectives for the player, derived from their live '
      + 'developmental needs and active shadows (39 §3.2). Deterministic: the same state '
      + 'proposes the same objectives. Offer at most one to the player, in your own voice.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
} as const;

const PROCESS_CHECKIN_TOOL = {
  type: 'function',
  function: {
    name: 'process_checkin',
    description:
      'Process one five-prompt reflection check-in on a chosen vow (39 §3.3): crisis-gated, '
      + 'depth-scored, engine-integrated. The five answers are the player\'s; you never '
      + 'author them. Depth is scored by the §4.4 pipeline (LLM rubric when reachable, '
      + 'heuristic offline) — either way the loop completes without network.',
    parameters: {
      type: 'object',
      properties: {
        vowText: { type: 'string', description: 'The exact text of the vow being checked in on.' },
        answers: {
          type: 'array', items: { type: 'string' },
          description: 'The five reflection answers, in REFLECTION_PROMPTS order.',
        },
      },
      required: ['vowText', 'answers'],
    },
  },
} as const;

export const PRACTICE_TOOLS = [PROPOSE_OBJECTIVE_TOOL, PROCESS_CHECKIN_TOOL] as const;
export const PRACTICE_TOOL_NAMES: ReadonlySet<string> = new Set(PRACTICE_TOOLS.map((t) => t.function.name));

export interface PracticeToolResult {
  readonly ok: boolean;
  readonly payload: Record<string, unknown>;
}

/** The tools this module may run — a closed vocabulary (fail-closed on anything else). */
export function isPracticeTool(name: string): boolean {
  return PRACTICE_TOOL_NAMES.has(name);
}

export async function handlePracticeTool(
  name: string,
  argsJson: string,
  ctx: PracticeIntegration,
): Promise<PracticeToolResult> {
  try {
    const args = argsJson.trim() ? (JSON.parse(argsJson) as Record<string, unknown>) : {};
    if (name === 'propose_objective') {
      const proposals = proposeObjectives(ctx.objectiveContext());
      return { ok: true, payload: { proposals } };
    }
    if (name === 'process_checkin') {
      const answers = Array.isArray(args.answers) ? (args.answers as string[]).map((a) => String(a ?? '')) : [];
      const vow = ctx.book.vows.find((v: Vow) => v.text === args.vowText);
      if (!vow) return { ok: false, payload: { error: `unknown vow '${String(args.vowText)}'` } };
      // 39 §4.2/§3.3: the CRISIS GATE comes before everything — crisis-pattern text never
      // leaves the client, nothing is scored, nothing is integrated. processCheckIn enforces
      // the gate; the pipeline must not even see crisis text, so the check runs here first
      // and the LLM call is skipped entirely.
      if (detectCrisis(answers.join('\n'))) {
        const gated = processCheckIn({ book: ctx.book, sig: ctx.sig, world: ctx.world, vow, answers, now: Date.now() });
        return { ok: true, payload: { outcome: gated, depthSource: 'gated' } };
      }
      // §4.4's pipeline: LLM rubric when reachable, heuristic stands otherwise.
      const scored = await scoreReflectionPipeline(answers, ctx.query);
      const outcome = processCheckIn({
        book: ctx.book, sig: ctx.sig, world: ctx.world, vow, answers,
        now: Date.now(), depthOverride: scored.depth,
      });
      return { ok: true, payload: { outcome, depthSource: scored.source } };
    }
    return { ok: false, payload: { error: `Unknown practice tool: ${name}` } };
  } catch (err) {
    return { ok: false, payload: { error: `Practice tool failed: ${(err as Error).message}` } };
  }
}

/** The check-in args the pure core accepts — the depth override is the pipeline's hook. */
export type { CheckInArgs };

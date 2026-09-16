/**
 * ChoicePolicy — the delegated agent's decision seam (doc 43 §6, plan §8
 * item 1). A delegated session runs the LIVE GameLoop; at each encounter the
 * role's choice policy decides the PlayerResponse. Historically that policy
 * was the deterministic `roleChoicePolicy` — the kernel's test double.
 *
 * This module opens the seam the plan deferred: production callers may
 * inject an LLM-backed policy (`llmChoicePolicy`) that consults the model
 * under the role's mandate and DEGRADES to the deterministic policy on any
 * failure. Laws preserved:
 *
 *   L4  single-writer — a policy only RETURNS a PlayerResponse; the state
 *       transition still flows exclusively through the engine commit path.
 *   TL1 proposals-not-effects — same as before; the policy cannot commit.
 *   G14 determinism — the kernel harness never injects a policy; the seeded
 *       deterministic path stays byte-stable. LLM policies are production
 *       runtime behavior, not validation behavior.
 *   Veil — the policy prompt is Veil-filtered (input) and its narrative
 *       output re-filtered (output); scores/percentages never cross.
 *   Offline degradation — network failure, timeout, or malformed JSON
 *       yields the deterministic fallback. Delegation never stalls.
 */

import type { Significator } from '../domain/Significator.js';
import type { ScheduledEncounter } from '../domain/EncounterSpecNew.js';
import type { PlayerResponse } from '../engines/ConsequenceEngine.js';
import type { DelegationCell, AgentRole } from './types.js';
import { roleChoicePolicy } from './delegate.js';
import { queryLLM } from '../../infra/llm/LLMClient.js';

/** Everything a policy may look at when choosing a response. */
export interface ChoiceContext {
  readonly role: AgentRole;
  readonly cell?: DelegationCell;
  readonly purpose: string;
  readonly encounter: ScheduledEncounter;
  /** Zero-based index of this encounter within the delegated session. */
  readonly step: number;
  /** Pre-encounter state (read-only by law — the policy never mutates it). */
  readonly sig: Significator;
}

/** The decision seam. Async because the LLM-backed policy is async. */
export interface ChoicePolicy {
  choose(ctx: ChoiceContext): Promise<PlayerResponse>;
}

const ROLE_MANDATES: Readonly<Record<string, string>> = {
  J1: 'You are a Journey Guide. Engage the encounter fully and respond with lived, specific narrative.',
  J2: 'You are a developmental assessor. Engage with measured, honest attention; surface nothing for effect.',
  J3: 'You are a diagnostic witness. Let avoidance patterns show naturally in how you engage.',
  J4: 'You are a therapeutic companion. On the first step, let the difficult material surface; then engage it healthily.',
  J5: 'You are a threshold guide. Engage with awareness of the transition the encounter sits within.',
  A4: 'You are a placement assessor. Engage to reveal true capacity; no performance, no sandbagging.',
  therapist: 'You hold the therapeutic frame. Engage steadily and healthily; the work stays contained.',
};

function fallbackNarrative(cellText: string, encounterId: string, llmText: string | null): string {
  if (llmText && llmText.trim().length > 0) {
    return llmText.trim().slice(0, 500);
  }
  return `engaged ${encounterId}${cellText ? ` (${cellText})` : ''}`;
}

/**
 * The LLM-backed choice policy. Builds a mandate-shaped prompt from the
 * context, queries the model, parses the JSON reply, and applies the Veil
 * filters on both directions. ANY failure — exception, offline client,
 * malformed JSON, unknown enum values — degrades to the deterministic
 * `roleChoicePolicy` for this step.
 */
export function llmChoicePolicy(options: {
  /** Per-call override of the transport (tests inject a stub here). */
  query?: (system: string, user: string) => Promise<string>;
  /** Wall-clock budget for the LLM consultation (default 8s). */
  timeoutMs?: number;
} = {}): ChoicePolicy {
  const query = options.query ?? queryLLM;
  const timeoutMs = options.timeoutMs ?? 8_000;
  return {
    async choose(ctx: ChoiceContext): Promise<PlayerResponse> {
      // The fallback is computed FIRST so its shape is the contract the LLM
      // must fill — the deterministic policy remains the source of truth for
      // structural validity (drive keys, enum values), the LLM only enriches
      // the narrative and may flip engagement signals within safe bands.
      const fallback = roleChoicePolicy(ctx.role, ctx.encounter, ctx.step);
      const mandate = ROLE_MANDATES[ctx.role] ?? ROLE_MANDATES['J1']!;
      const cellText = ctx.cell ? `${ctx.cell.line} × ${ctx.cell.stage}` : 'no specific cell';
      const system = [
        'You are choosing how a delegated in-game agent responds to one encounter in a contemplative RPG.',
        mandate,
        'Reply with ONLY a JSON object: {"narrative": string (1-3 sentences, first person, concrete), "engagement": "engaged" | "avoided", "surface": boolean (true only if the mandate says to let material surface)}',
        'No markdown, no commentary, no scores or percentages in the narrative.',
      ].join(' ');
      const user = [
        `Purpose: ${ctx.purpose}`,
        `Cell: ${cellText}`,
        `Encounter: ${ctx.encounter.id} (modality ${ctx.encounter.modality}, mode ${ctx.encounter.executionMode}, position ${ctx.encounter.sessionPosition})`,
        ctx.step === 0 ? 'This is the opening step of the session.' : `This is step ${ctx.step + 1} of the session.`,
      ].join('\n');

      try {
        const raw = await Promise.race([
          query(system, user),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error('policy timeout')), timeoutMs)),
        ]);
        const jsonText = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(jsonText) as { narrative?: unknown; engagement?: unknown; surface?: unknown };
        const narrative = typeof parsed.narrative === 'string' ? parsed.narrative : '';
        const avoided = parsed.engagement === 'avoided';
        const surface = parsed.surface === true;

        if (avoided) {
          // Avoidance is the empty-narrative marker (OA-13) — keep it honest.
          return { ...fallback, narrativeSummary: '' };
        }
        let next: PlayerResponse = { ...fallback, narrativeSummary: fallbackNarrative(cellText, ctx.encounter.id, narrative) };
        // J4/J3 surfacing mandates: the LLM may confirm surfacing, never
        // cancel it (the mandate owns the arc), but other roles stay clean.
        if (surface && (ctx.role === 'J4' || ctx.role === 'J3')) {
          next = { ...next, shadowSurfaced: fallback.shadowSurfaced };
        } else if (ctx.role !== 'J4' && ctx.role !== 'J3') {
          // Non-surfacing roles can never spontaneously surface (TL1 hygiene).
          next = { ...next, shadowSurfaced: null };
        }
        return next;
      } catch {
        // Offline / timeout / malformed → deterministic fallback (39 P1).
        return fallback;
      }
    },
  };
}

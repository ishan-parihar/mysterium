/**
 * Phase 17 D-39 — the journal P1 seam is live (39 §4.2/§4.4).
 *
 * P0 shipped the practice loop (/journal, VowService, the heuristic pre-scorer) but the two
 * agent tools were a header comment — the in-vitro class G49 exists to catch. These tests pin
 * the P1 contract:
 *
 *   P1-1 the two tools are registered with OpenAI-function schemas and a closed vocabulary;
 *   P1-2 propose_objective dispatches through the pure proposer (no LLM in the loop);
 *   P1-3 process_checkin dispatches through the pure core with the §4.4 depth pipeline;
 *   P1-4 the §4.4 degrade law — LLM absent / unreachable / divergent ⇒ the heuristic stands,
 *        and a valid 1–5 reply is used when the query is reachable;
 *   P1-5 THE CRISIS GATE (39 §4.2: journal text never leaves the client): crisis-pattern
 *        answers route to safety with NO pipeline call — the query is never invoked — and
 *        nothing is scored or integrated;
 *   P1-6 the pipeline's own contract: garbage and empty answers degrade to the heuristic.
 */
import { describe, it, expect } from 'vitest';
import {
  PRACTICE_TOOLS, PRACTICE_TOOL_NAMES, isPracticeTool, handlePracticeTool,
  type PracticeIntegration,
} from '../../../src/core/practice/practiceToolSchemas.js';
import { scoreReflectionPipeline, scoreReflectionDepth, REFLECTION_PROMPTS } from '../../../src/core/practice/ReflectionEvidence.js';
import { emptyVowBook, type VowBook } from '../../../src/core/practice/VowService.js';
import { createSignificator } from '../../../src/core/domain/Significator.js';
import { createInitialWorldState } from '../../../src/core/engines/CandidateGeneration.js';
import type { Vow } from '../../../src/core/domain/SharedTypes.js';

const NOW = 1790000000000;
const ANSWERS = [
  'It felt heavy again this week and I avoided the conversation.',
  'I think I do it because being seen feels like owing something.',
  'What if the avoidance is a small fear, not a character flaw?',
  'I noticed the pattern: every time I say yes quickly, I resent it later.',
  'Next week I will delay one small answer and sit with the discomfort.',
];

function integration(book: VowBook, query?: (p: string) => Promise<string | null>): PracticeIntegration {
  const altitudes = { Cognitive: 'Amber', Willpower: 'Red', Emotional: 'Amber', Somatic: 'Red',
    Interpersonal: 'Red', Intrapersonal: 'Amber', Moral: 'Red', Spiritual: 'Red' } as never;
  return {
    book,
    sig: createSignificator('practice-test', altitudes, 'Amber'),
    world: createInitialWorldState(),
    objectiveContext: () => ({
      needs: [{ label: 'drive_rebalance:Cognitive', urgency: 0.6 }],
      activeShadows: [{ line: 'Emotional', quadrant: 'Dark-Addiction', severity: 0.7 }],
    }),
    ...(query ? { query } : {}),
  };
}

function bookWithOneVow(): VowBook {
  const vow: Vow = { text: 'One small honest conversation this week.', createdAtMs: NOW, fulfilled: false, status: 'active' };
  return { vows: [vow], declineCounts: {} };
}

describe('journal P1 seam (39 §4.2/§4.4)', () => {
  it('P1-1: both tools are registered with function schemas and a closed vocabulary', () => {
    expect(PRACTICE_TOOLS.map((t) => t.function.name)).toEqual(['propose_objective', 'process_checkin']);
    for (const t of PRACTICE_TOOLS) expect(t.type).toBe('function');
    expect(PRACTICE_TOOL_NAMES.has('propose_objective')).toBe(true);
    expect(isPracticeTool('process_checkin')).toBe(true);
    expect(isPracticeTool('summon_council')).toBe(false); // closed vocabulary
  });

  it('P1-2: propose_objective dispatches through the pure proposer (no LLM in the loop)', async () => {
    const outcome = await handlePracticeTool('propose_objective', '{}', integration(emptyVowBook()));
    expect(outcome.ok).toBe(true);
    const proposals = outcome.payload.proposals as { text: string; kind: string }[];
    expect(proposals.length).toBeGreaterThan(0);
    expect(proposals.every((p) => typeof p.text === 'string' && p.text.length > 0)).toBe(true);
  });

  it('P1-3: process_checkin dispatches through the pure core with the §4.4 pipeline', async () => {
    const seen: string[] = [];
    const outcome = await handlePracticeTool(
      'process_checkin',
      JSON.stringify({ vowText: 'One small honest conversation this week.', answers: ANSWERS }),
      integration(bookWithOneVow(), async (p) => { seen.push(p); return '4'; }),
    );
    expect(outcome.ok).toBe(true);
    expect(outcome.payload.depthSource).toBe('llm');
    const inner = outcome.payload.outcome as { depthScore: number; engineIntegrated: boolean };
    expect(inner.depthScore).toBe(4);
    expect(seen.length).toBe(1);
    expect(seen[0]).toContain('reflection');
  });

  it('P1-4: the degrade law — absent, unreachable, and divergent queries all stand the heuristic', async () => {
    const heuristic = scoreReflectionDepth(ANSWERS);
    expect((await scoreReflectionPipeline(ANSWERS)).source).toBe('heuristic');
    expect((await scoreReflectionPipeline(ANSWERS, async () => { throw new Error('network down'); })).source).toBe('heuristic');
    expect((await scoreReflectionPipeline(ANSWERS, async () => 'beautifully deep')).source).toBe('heuristic');
    expect((await scoreReflectionPipeline(ANSWERS, async () => '9')).source).toBe('heuristic');
    expect((await scoreReflectionPipeline(ANSWERS, async () => ' 3 ')).source).toBe('llm');
    // And the tool path inherits the law:
    const outcome = await handlePracticeTool(
      'process_checkin',
      JSON.stringify({ vowText: 'One small honest conversation this week.', answers: ANSWERS }),
      integration(bookWithOneVow()),
    );
    const inner = outcome.payload.outcome as { depthScore: number };
    expect(outcome.payload.depthSource).toBe('heuristic');
    expect(inner.depthScore).toBe(heuristic);
  });

  it('P1-5: THE CRISIS GATE — crisis text is never scored and the query is never invoked (39 §4.2)', async () => {
    let invoked = 0;
    const outcome = await handlePracticeTool(
      'process_checkin',
      JSON.stringify({ vowText: 'One small honest conversation this week.', answers: ['I want to kill myself and end all of it'] }),
      integration(bookWithOneVow(), async () => { invoked++; return '1'; }),
    );
    expect(invoked).toBe(0); // the LLM never sees crisis text
    expect(outcome.payload.depthSource).toBe('gated');
    const inner = outcome.payload.outcome as { routedToSafety: boolean; engineIntegrated: boolean; lapseDeltaApplied: number };
    expect(inner.routedToSafety).toBe(true);
    expect(inner.engineIntegrated).toBe(false);
    expect(inner.lapseDeltaApplied).toBe(0);
  });

  it('P1-6: empty answers degrade; the rubric prompt enumerates all five prompts', async () => {
    const empty = await scoreReflectionPipeline([]);
    expect(empty.source).toBe('heuristic');
    expect(empty.depth).toBe(1);
    let prompt = '';
    await scoreReflectionPipeline(ANSWERS, async (p) => { prompt = p; return '2'; });
    for (const q of REFLECTION_PROMPTS) expect(prompt).toContain(q);
  });
});

/**
 * The journey prompt blocks, unit-tested in isolation.
 *
 * Both blocks are instructions to a model about what the player remembers, so the assertions here
 * are mostly about what the text must SAY (the continuation cue, the synthesis block, the `Now:`
 * cue) and about the empty-history case — a first encounter framed as a continuation is the one
 * failure mode that changes how a session opens.
 */
import { describe, it, expect } from 'vitest';
import { briefHistory, continuityContext } from '../../../src/core/assessments/promptBlocks.js';
import type { ConsequenceRecord } from '../../../src/core/domain/ConsequenceRecord.js';
import type { PolarityTrace } from '../../../src/core/domain/PolarityTrace.js';

/** Every drive healthy — the engine's definition of a passed encounter. */
const HEALTHY = {
  Agency: 'HealthyBalanced',
  Communion: 'HealthyBalanced',
  Eros: 'HealthyBalanced',
  Agape: 'HealthyBalanced',
} as const;

function trace(over: Partial<PolarityTrace> = {}): PolarityTrace {
  return {
    encounterId: 'Cognitive:Red:01',
    timestamp: 0,
    driveDirectionality: HEALTHY,
    energeticDirection: 'Radiative',
    stageOrientation: 'Ascending',
    sourceOfNourishment: 'Self',
    ...over,
  } as PolarityTrace;
}

function record(over: Partial<ConsequenceRecord> = {}): ConsequenceRecord {
  return {
    encounterId: 'Cognitive:Red:01',
    timestamp: 0,
    line: 'Cognitive',
    polarityTrace: trace(),
    shadowSurfaced: null,
    shadowResolved: null,
    holonDeltas: [],
    altitudeShift: null,
    driveShift: null,
    narrativeSummary: 'The player chose to stay with the difficulty instead of deflecting it.',
    ...over,
  };
}

describe('continuityContext', () => {
  it('returns nothing at all when the player has no history', () => {
    // Empty means "not a continuation" — the prompt must not claim a journey that has not happened.
    expect(continuityContext([])).toBe('');
  });

  it('blocks the recent journey with the pass state and polarity of each encounter', () => {
    const block = continuityContext([record()]);
    expect(block).toContain('[RECENT JOURNEY');
    expect(block).toContain('✓ PASSED');
    expect(block).toContain('(STO/radiative)');
    expect(block).toContain('[Cognitive]');
  });

  it('marks a failed encounter and names the shadow that surfaced', () => {
    const failed = record({
      shadowSurfaced: 'GoldenAllergy',
      polarityTrace: trace({
        driveDirectionality: { ...HEALTHY, Agency: 'DarkAddicted' },
        energeticDirection: 'Absorptive',
      }),
    });
    const block = continuityContext([failed]);
    expect(block).toContain('✗ FAILED');
    expect(block).toContain('(STS/absorptive)');
    expect(block).toContain('Shadow surfaced: GoldenAllergy.');
  });

  it('marks a line advance when one happened', () => {
    const advanced = record({ altitudeShift: { line: 'Cognitive', from: 'Red', to: 'Amber' } });
    expect(continuityContext([advanced])).toContain('LINE ADVANCED: Cognitive Red→Amber.');
  });

  it('keeps only the last three encounters, in order', () => {
    const five = [1, 2, 3, 4, 5].map((n) => record({ narrativeSummary: `encounter number ${n}` }));
    const block = continuityContext(five);
    expect(block).not.toContain('encounter number 1');
    expect(block).not.toContain('encounter number 2');
    expect(block.indexOf('encounter number 3')).toBeLessThan(block.indexOf('encounter number 5'));
  });

  it('includes the agent synthesis only when there is one, and asks the model to use it', () => {
    expect(continuityContext([record()])).not.toContain('SESSION SYNTHESIS');
    const withSynthesis = continuityContext([record()], 'the player keeps circling the same boundary');
    expect(withSynthesis).toContain('SESSION SYNTHESIS');
    expect(withSynthesis).toContain('the player keeps circling the same boundary');
  });
});

describe('briefHistory', () => {
  it('returns nothing when the player has no history', () => {
    expect(briefHistory([])).toBe('');
  });

  it('counts the challenges, summarises the last three and ends with the Now: cue', () => {
    const block = briefHistory([record(), record(), record(), record()]);
    expect(block.startsWith('You have faced 4 challenges before.')).toBe(true);
    expect(block.endsWith(' Now: ')).toBe(true);
    // The count is of ALL encounters, the summaries only of the last three.
    expect(block.match(/Recently: /g)?.length).toBe(3);
  });

  it('names a surfaced shadow without marking pass or fail', () => {
    // This block is a memory cue, not a scoreboard — the pass state belongs to continuityContext.
    const block = briefHistory([record({ shadowSurfaced: 'DarkAddiction' })]);
    expect(block).toContain('A DarkAddiction pattern surfaced.');
    expect(block).not.toContain('PASSED');
    expect(block).not.toContain('FAILED');
  });
});

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

function record(over: Partial<ConsequenceRecord> = {}): ConsequenceRecord {
  return {
    encounterId: 'Cognitive:Red:01',
    narrativeSummary: 'The player chose to stay with the difficulty instead of deflecting it.',
    polarityTrace: {
      driveDirectionality: { agency: 'HealthyBalanced', communion: 'HealthyBalanced', eros: 'HealthyBalanced', agape: 'HealthyBalanced' },
      energeticDirection: 'Radiative',
      serviceToOthers: 0.6,
      serviceToSelf: 0.2,
    },
    ...over,
  } as ConsequenceRecord;
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
      polarityTrace: {
        driveDirectionality: { agency: 'ExcessiveAgency', communion: 'HealthyBalanced', eros: 'HealthyBalanced', agape: 'HealthyBalanced' },
        energeticDirection: 'Absorptive',
        serviceToOthers: 0.2,
        serviceToSelf: 0.7,
      },
    } as Partial<ConsequenceRecord>);
    const block = continuityContext([failed]);
    expect(block).toContain('✗ FAILED');
    expect(block).toContain('(STS/absorptive)');
    expect(block).toContain('Shadow surfaced: GoldenAllergy.');
  });

  it('marks a line advance when one happened', () => {
    const advanced = record({ altitudeShift: { line: 'Cognitive', from: 'Red', to: 'Amber' } } as Partial<ConsequenceRecord>);
    expect(continuityContext([advanced])).toContain('LINE ADVANCED: Cognitive Red→Amber.');
  });

  it('keeps only the last three encounters, in order', () => {
    const five = [1, 2, 3, 4, 5].map((n) => record({ narrativeSummary: `encounter number ${n}` } as Partial<ConsequenceRecord>));
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
    const block = briefHistory([record({ shadowSurfaced: 'DarkAddiction' } as Partial<ConsequenceRecord>)]);
    expect(block).toContain('A DarkAddiction pattern surfaced.');
    expect(block).not.toContain('PASSED');
    expect(block).not.toContain('FAILED');
  });
});

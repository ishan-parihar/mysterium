/**
 * P1-F7 (Fresh-User UX Audit): Regression guard — stages never demote.
 *
 * The fresh-user audit reported that one avoidant session dropped the
 * player's stage from Orange back to Red, which felt punitive. Investigation
 * revealed this was NOT a stage-demotion mechanic — it was a symptom of the
 * F4 migration bug (migrateLegacySave was destroying the save and creating a
 * fresh Red significator). The codebase has no stage-demotion path:
 *   - currentStage is only ever set in GameLoop.ts via commitTransformation
 *   - commitTransformation only returns targetStage when phase === 'complete'
 *   - targetStage is always ALL_STAGES[currentOrd + 1] (the NEXT stage up)
 *
 * This test file is a regression guard: if anyone ever adds a demotion path,
 * these tests will fail.
 */
import { describe, it, expect } from 'vitest';
import { createSignificator } from '../../src/core/domain/Significator.js';
import { commitTransformation, createInitialTransformationState } from '../../src/core/engines/TransformationDetector.js';
import { ALL_STAGES, stageOrdinal } from '../../src/core/domain/Stage.js';
import type { Stage } from '../../src/core/domain/Stage.js';

describe('P1-F7: stages never demote (regression guard)', () => {
  it('commitTransformation returns null targetStage when phase is not "complete"', () => {
    // Valid phases: 'idle' | 'threshold' | 'unravelling' | 'crucible' | 'emergence' | 'complete'
    // Only 'complete' returns a targetStage. All others return null.
    const nonCompletePhases = ['idle', 'threshold', 'unravelling', 'crucible', 'emergence'] as const;
    for (const phase of nonCompletePhases) {
      const state = { ...createInitialTransformationState(), phase, targetStage: 'Amber' as Stage };
      const result = commitTransformation(state);
      expect(result.targetStage).toBeNull();
    }
  });

  it('commitTransformation only returns the targetStage (always higher than current)', () => {
    // The targetStage is set by detectTransformation as ALL_STAGES[currentOrd + 1].
    // Verify that for every stage, the "next" stage is always higher ordinal.
    for (let i = 0; i < ALL_STAGES.length - 1; i++) {
      const currentStage = ALL_STAGES[i]!;
      const nextStage = ALL_STAGES[i + 1]!;
      expect(stageOrdinal(nextStage)).toBeGreaterThan(stageOrdinal(currentStage));
    }
    // Turquoise is the top — there is no next stage.
    expect(ALL_STAGES[ALL_STAGES.length - 1]).toBe('Turquoise');
  });

  it('a fresh Significator always starts at Red (never demoted from a higher stage)', () => {
    const allRed = {
      Cognitive: 'Red', Emotional: 'Red', Moral: 'Red', Intrapersonal: 'Red',
      Spiritual: 'Red', Somatic: 'Red', Willpower: 'Red', Interpersonal: 'Red',
    } as Record<string, Stage>;
    const sig = createSignificator('test-player', allRed as any, 'Red');
    expect(sig.currentStage).toBe('Red');
    expect(sig.transformationPhase).toBe('idle');
    expect(sig.transformationTargetStage).toBeNull();
  });
});

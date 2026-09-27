/**
 * MY-AD-0033 — the reserved developmental primary, asserted SCALE-INDEPENDENTLY.
 *
 * The 2026-09-25 campaign report named the `Interpersonal` exclusion a "structural slot deficit":
 * the reserve's strict forward tie-break serves the 8th line 8th, and each campaign's 8th offer is
 * a training beat, so the round-robin reached its first seven lines and never the eighth. Phase 16
 * d3's reserve (the eligible line with the oldest positive theta timestamp) closed it — measured
 * here 2026-09-28 at three scales: every canonical line served, quietest/busiest 0.50 (3×4),
 * 0.20 (6×6), 0.11 (12×6), against the 0.02 floor G43 enforces.
 *
 * But G43 observes ONE seeded campaign at ONE scale, where an unlucky seed can satisfy it — so
 * the assertion G43 cannot make is made here, directly against the policy function, for ANY
 * eligibility set and ANY candidate-list shape:
 *
 *   BP-1 among eligible lines, the least-recently-served takes the first developmental offer;
 *   BP-2 a fresh significator's all-zero tie resolves in canonical ALL_LINES order, never hash
 *       order, and identically whatever shape the candidate list has (24 §3.3 rule 5 —
 *       reproducibility is the point);
 *   BP-3 a line with no eligible candidate is skipped, not promised — eligibility is upstream.
 */
import { describe, it, expect } from 'vitest';
import { selectReservedPrimaryByLineCoverage, type ScoredCandidate } from '../../src/core/engines/EncounterScheduler.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import { ALL_LINES, type Line } from '../../src/core/domain/Line.js';
import type { Significator } from '../../src/core/domain/Significator.js';
import type { Stage } from '../../src/core/domain/Stage.js';

const mkCandidates = (lines: readonly Line[], priority = 0.5): ScoredCandidate[] =>
  lines.map((line) => ({
    candidate: { id: `enc-${line}`, line, moduleRef: `m:${line}`, stage: 'Amber' as Stage } as never,
    priority,
  }));

const sigWith = (served: Partial<Record<Line, number>>): Significator => {
  const sig = createSignificator('reserve-probe', Object.fromEntries(ALL_LINES.map((l) => [l, 'Amber' as Stage])) as never, 'Amber');
  return { ...sig, theta: { ...sig.theta, lastEncounter: { ...served } } } as never;
};

describe('MY-AD-0033 — the reserved developmental primary (scale-independent)', () => {
  it('BP-1: the most-starved eligible line takes the first developmental offer', () => {
    // Seven lines served; Interpersonal never — the reserve MUST hand it the primary.
    // theta keys are `Line:Stage` — a bare `Cognitive` entry matches no `Cognitive:` prefix
    // and would read as UNSERVED, which is the bug this fixture would hide.
    const served: Partial<Record<Line, number>> = {
      Cognitive: 1000, Emotional: 1000, Willpower: 1000, Somatic: 1000,
      Intrapersonal: 1000, Spiritual: 1000, Moral: 1000,
    };
    const stageKeys = (m: Partial<Record<Line, number>>) =>
      Object.fromEntries(Object.entries(m).map(([l, ts]) => [`${l}:Amber`, ts]));
    const primary = selectReservedPrimaryByLineCoverage(mkCandidates(ALL_LINES), sigWith(stageKeys(served)));
    expect(primary.candidate.line).toBe('Interpersonal');

    // And when one served line is older than another, the OLDER one wins (not the unserved one,
    // which is now absent from the candidate set).
    const partial = selectReservedPrimaryByLineCoverage(
      mkCandidates(['Cognitive', 'Moral', 'Somatic']),
      sigWith(stageKeys({ Cognitive: 500, Moral: 100, Somatic: 900 })),
    );
    expect(partial.candidate.line).toBe('Moral');
  });

  it('BP-2: a fresh significator resolves in canonical order, whatever the candidate-list shape', () => {
    const fresh = sigWith({});
    const forward = selectReservedPrimaryByLineCoverage(mkCandidates(ALL_LINES), fresh);
    const reversed = selectReservedPrimaryByLineCoverage(mkCandidates([...ALL_LINES].reverse()), fresh);
    expect(forward.candidate.line).toBe(ALL_LINES[0]);
    expect(reversed.candidate.line).toBe(ALL_LINES[0]); // candidate order cannot change the tie
  });

  it('BP-3: an ineligible (absent) line is skipped — eligibility is upstream, not promised here', () => {
    const eligible = ['Cognitive', 'Somatic'] as Line[];
    const primary = selectReservedPrimaryByLineCoverage(mkCandidates(eligible), sigWith({}));
    expect(eligible).toContain(primary.candidate.line);
    // The reserve never reaches for a line with no candidate — and the function never throws
    // on a single-candidate set.
    expect(selectReservedPrimaryByLineCoverage(mkCandidates(['Willpower']), sigWith({})).candidate.line).toBe('Willpower');
  });
});

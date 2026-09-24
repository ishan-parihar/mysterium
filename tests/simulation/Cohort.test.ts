/**
 * Phase 15 d2 — the cohort generator.
 *
 * The generator's value is entirely in two properties: a cohort is REPRODUCIBLE from its seed (or a
 * gate cannot assert over a population), and a single dimension can be HELD while the rest varies
 * (or a boundary cannot be located). Both are asserted directly here, plus totality — every generated
 * persona must be a `PersonaSpec` the campaign runner actually accepts, since a generator that emits
 * plausible-looking objects the runner rejects produces a cohort of zero sessions and a green run.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateCohort, generatePersona, dimensionsFor, axisValue, COHORT_AXES } from '../../src/core/simulation/cohort.js';
import { runCampaign } from '../../src/core/simulation/campaign.js';
import { ALL_LINES } from '../../src/core/domain/Line.js';
import { ALL_STAGES } from '../../src/core/domain/Stage.js';

describe('cohort generator — reproducibility', () => {
  it('the same seed yields the same cohort, and a different seed does not', () => {
    const a = generateCohort({ count: 12, seed: 42 });
    const b = generateCohort({ count: 12, seed: 42 });
    const c = generateCohort({ count: 12, seed: 43 });
    expect(a.map((p) => p.name)).toEqual(b.map((p) => p.name));
    expect(a.map((p) => JSON.stringify(p.dimensions))).toEqual(b.map((p) => JSON.stringify(p.dimensions)));
    expect(a.map((p) => JSON.stringify(p.dimensions))).not.toEqual(c.map((p) => JSON.stringify(p.dimensions)));
  });

  it('names are derived from the generator call, not chosen', () => {
    const cohort = generateCohort({ count: 3, seed: 9, startIndex: 5 });
    expect(cohort.map((p) => p.name)).toEqual(['gen-9-5', 'gen-9-6', 'gen-9-7']);
  });

  it('a member is reproducible on its own, so a failing row can be re-run by itself', () => {
    const one = generatePersona(3, 11);
    const fromCohort = generateCohort({ count: 12, seed: 3 })[11]!;
    expect(JSON.stringify(one.dimensions)).toBe(JSON.stringify(fromCohort.dimensions));
  });
});

describe('cohort generator — totality', () => {
  it('every line gets an altitude, and currentStage is one of them', () => {
    for (let i = 0; i < 25; i++) {
      const p = generatePersona(1, i);
      for (const line of ALL_LINES) expect(ALL_STAGES).toContain(p.altitudes[line]);
      expect(ALL_STAGES).toContain(p.currentStage);
    }
  });

  it('a generated persona is accepted by the campaign runner and finalizes encounters', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mysterium-cohort-gen-'));
    try {
      // The assertion that matters: an object the runner rejects would produce a zero-session
      // campaign, which every "did it run" check that only looks at the series would call a pass.
      const result = await runCampaign({ persona: generatePersona(5, 3), rootDir: root, sessions: 2, encountersPerSession: 3 });
      expect(result.sessions).toHaveLength(2);
      expect(result.sessions.every((s) => s.finalized > 0)).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('cohort generator — the single-axis hold', () => {
  it('an override pins that dimension across the whole cohort', () => {
    const cohort = generateCohort({ count: 20, seed: 2, overrides: { stance: 'avoiding' } });
    expect(cohort.every((p) => p.dimensions.stance === 'avoiding')).toBe(true);
    // …and the other dimensions still vary, which is what makes a sweep a controlled comparison
    // rather than 20 copies of one persona.
    expect(new Set(cohort.map((p) => p.currentStage)).size).toBeGreaterThan(1);
    expect(new Set(cohort.map((p) => axisValue(p, 'cadence'))).size).toBeGreaterThan(1);
  });

  it('holds the shadow rate too, so a rate sweep is one line', () => {
    const cohort = generateCohort({ count: 10, seed: 4, overrides: { shadowRate: 0.5 } });
    expect(cohort.every((p) => p.dimensions.shadowRate === 0.5)).toBe(true);
  });
});

describe('cohort generator — every reportable axis resolves', () => {
  it('axisValue is total over COHORT_AXES and produces a non-empty grouping key', () => {
    const cohort = generateCohort({ count: 8, seed: 6 });
    for (const axis of COHORT_AXES) {
      for (const p of cohort) {
        const v = axisValue(p, axis);
        expect(typeof v).toBe('string');
        expect(v.length).toBeGreaterThan(0);
      }
    }
  });

  it('the generator varies the dimensions it claims to vary', () => {
    const cohort = generateCohort({ count: 60, seed: 8 });
    // A generator that silently pinned one of these would make every population finding about that
    // axis vacuous, and nothing else in the suite would notice.
    for (const axis of COHORT_AXES) {
      expect(new Set(cohort.map((p) => axisValue(p, axis))).size).toBeGreaterThan(1);
    }
  });
});

describe('cohort generator — neglect is per-line', () => {
  it('a neglected line gets an avoidance response regardless of stance', () => {
    const lines = ALL_LINES.slice(0, 2);
    const p = generatePersona(1, 0, { neglectLines: lines, stance: 'engaged' });
    const encounterAt = (line: string) => ({
      id: `${line}:Red:h1:1`, moduleRef: `${line}:Red`, modality: 'ImmersiveRPG' as const,
      targetLines: [line as never], stage: 'Red' as const, holonSource: 'h1',
      shadowTarget: null, polarityMode: 'Exploring' as const, difficulty: 0.5,
      sessionPosition: 'peak' as const, priority: 0.8, driveTarget: null, executionMode: 'capacity' as const,
    });
    // An empty narrative IS how the engine reads avoidance (`isAvoided`), which is what theta-decay
    // on an untouched line needs to observe.
    expect(p.policy(encounterAt(lines[0]!) as never, 0).narrativeSummary).toBe('');
    const other = ALL_LINES.find((l) => !lines.includes(l))!;
    expect(p.policy(encounterAt(other) as never, 0).narrativeSummary.length).toBeGreaterThan(0);
  });

  it('cadence becomes an inter-session gap, so theta-decay between sessions is exercised', () => {
    const fast = generatePersona(1, 0, { cadence: 7, sessions: 3 });
    const slow = generatePersona(1, 0, { cadence: 1, sessions: 3 });
    expect(fast.trajectory.gapDaysBeforeSession?.[1]).toBeCloseTo(1);
    expect(slow.trajectory.gapDaysBeforeSession?.[1]).toBeCloseTo(7);
  });
});

describe('cohort generator — dimension derivation is independent of order', () => {
  it('does not reuse one random stream across members', () => {
    // If member i's dimensions depended on how many members preceded it, a cohort of 40 would not
    // contain the first 10 of a cohort of 40-and-then-more — and a sub-sample would be a different
    // population from the one a gate certified.
    const dims = dimensionsFor(12, 3);
    const same = generateCohort({ count: 10, seed: 12 })[3]!.dimensions;
    expect(JSON.stringify(dims)).toBe(JSON.stringify(same));
  });
});

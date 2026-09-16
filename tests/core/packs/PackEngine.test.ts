/**
 * Tests for the measurement pack engine (doc 40) — contract invariants,
 * session runner, psychometric harness, and the pack linter.
 *
 * Guarantees under test:
 *   M1  Contract integrity — forms reference real items; difficulty spans
 *       cover the staircase range; SE-stop achievable within budget.
 *   M2  Session determinism — same seed ⇒ same session; different seeds
 *       diverge in exposure.
 *   M3  Stop rule — sessions end at SE-stop or budget, never mid-trial.
 *   M4  Form assignment — alternation per retest policy.
 *   M5  Psychometrics — retest r, form effect, exposure stats compute.
 *   M6  Linter teeth — degraded packs fail with the right checkIds.
 *   M7  Skill-theta stream — integration + freshness decay are pure.
 */
import { describe, it, expect } from 'vitest';
import {
  registerPack, getPack, allPacks, lintPack, startPackSession, nextItem,
  recordTrial, assignForm, computePsychometrics, integrateSkillTheta, readFreshTheta,
  type MeasurementPack,
} from '../../../src/core/packs/PackEngine.js';
import { REFERENCE_PACKS, MEMORY_WORKING_SPAN } from '../../../src/core/packs/referencePacks.js';

const WEEK = 7 * 86_400_000;

function runSession(pack: MeasurementPack, seed: number, formId: string, ability: number) {
  let s = startPackSession(pack, formId, seed, 4);
  while (!s.finished) {
    const item = nextItem(pack, formId, s);
    if (!item) break;
    s = recordTrial(s, pack, item, item.difficulty <= ability);
  }
  return s;
}

describe('contract integrity (M1)', () => {
  it('reference packs register and look up', () => {
    for (const p of REFERENCE_PACKS) registerPack(p);
    expect(getPack('memory.working-span')).toBeDefined();
    expect(getPack('language.vocabulary')?.locale).toBe('en');
    expect(allPacks().length).toBeGreaterThanOrEqual(2);
  });

  it('reference packs lint clean', () => {
    for (const p of REFERENCE_PACKS) {
      const errors = lintPack(p).filter((i) => i.severity === 'error');
      expect(errors, p.id).toEqual([]);
    }
  });

  it('forms reference items from the shared pool', () => {
    for (const p of REFERENCE_PACKS) {
      const pool = new Set(p.items.map((i) => i.id));
      for (const f of p.forms) {
        for (const fi of f.items) expect(pool.has(fi.id), `${p.id}/${f.id}/${fi.id}`).toBe(true);
      }
    }
  });
});

describe('session determinism (M2)', () => {
  it('same seed ⇒ identical session; different seed ⇒ divergent exposure', () => {
    const pack = MEMORY_WORKING_SPAN;
    const a = runSession(pack, 777, 'a', 6);
    const b = runSession(pack, 777, 'a', 6);
    expect(a.administered).toEqual(b.administered);
    expect(a.theta).toBe(b.theta);
    const c = runSession(pack, 778, 'a', 6);
    expect(c.administered.join(',')).not.toBe(a.administered.join(','));
  });

  it('ability drives the trajectory (higher ability ⇒ higher theta)', () => {
    const pack = MEMORY_WORKING_SPAN;
    const low = runSession(pack, 1, 'a', 4);
    const high = runSession(pack, 1, 'a', 7);
    expect(high.theta).toBeGreaterThan(low.theta);
  });
});

describe('stop rule (M3)', () => {
  it('sessions end at se-stop or budget with a reason', () => {
    const pack = MEMORY_WORKING_SPAN;
    for (const seed of [1, 2, 3]) {
      const s = runSession(pack, seed, 'a', 5);
      expect(s.finished).toBe(true);
      expect(['se-stop', 'budget']).toContain(s.stopReason);
      expect(s.trial).toBeLessThanOrEqual(pack.staircase.maxTrials);
    }
  });

  it('SE never drops below the declared stop threshold mid-session', () => {
    const pack = MEMORY_WORKING_SPAN;
    const s = runSession(pack, 9, 'a', 5);
    expect(s.se).toBeGreaterThanOrEqual(pack.staircase.stopSe);
  });
});

describe('form assignment (M4)', () => {
  it('alternates forms across sessionCount', () => {
    const pack = MEMORY_WORKING_SPAN;
    const ids = [0, 1, 2, 3].map((n) => assignForm(pack, n));
    expect(ids).toEqual(['a', 'b', 'c', 'a']);
  });
});

describe('psychometrics (M5)', () => {
  it('computes retest r, form effect, and exposure', () => {
    const pack = MEMORY_WORKING_SPAN;
    const recs = Array.from({ length: 6 }, (_, i) => ({
      sessionId: `s${i}`,
      formId: assignForm(pack, i),
      theta: 5 + (i % 2) * 0.4 + i * 0.05,
      se: 0.3,
      trials: 12,
      correctCount: 8,
      itemIds: ['ws.5.5', 'ws.6.6', 'ws.7.7'],
      completedAtMs: i * WEEK,
    }));
    const report = computePsychometrics(pack, recs);
    expect(report.sessionCount).toBe(6);
    expect(report.retestR).toBeDefined();
    expect(report.formEffect).toBeGreaterThanOrEqual(0);
    expect(report.exposure['ws.5.5']).toBe(6);
    expect(report.provisional).toBe(true); // provisionalUntil declared
  });

  it('withholds retest r below 3 sessions (honest small-n)', () => {
    const pack = MEMORY_WORKING_SPAN;
    const recs = [0, 1].map((i) => ({
      sessionId: `s${i}`, formId: 'a', theta: 5, se: 0.3, trials: 10, correctCount: 7,
      itemIds: ['ws.5.5'], completedAtMs: i * WEEK,
    }));
    expect(computePsychometrics(pack, recs).retestR).toBeUndefined();
  });
});

describe('linter teeth (M6)', () => {
  it('single-form pack fails PK-1', () => {
    const degraded: MeasurementPack = { ...MEMORY_WORKING_SPAN, forms: [MEMORY_WORKING_SPAN.forms[0]!] };
    expect(lintPack(degraded).some((i) => i.checkId === 'PK-1' && i.severity === 'error')).toBe(true);
  });

  it('impossible SE-stop budget fails PK-4', () => {
    const degraded: MeasurementPack = {
      ...MEMORY_WORKING_SPAN,
      staircase: { ...MEMORY_WORKING_SPAN.staircase, stopSe: 0.01, maxTrials: 5 },
    };
    expect(lintPack(degraded).some((i) => i.checkId === 'PK-4' && i.severity === 'error')).toBe(true);
  });

  it('narrow difficulty span fails PK-3', () => {
    const degraded: MeasurementPack = {
      ...MEMORY_WORKING_SPAN,
      items: MEMORY_WORKING_SPAN.items.filter((i) => i.difficulty <= 5),
    };
    expect(lintPack(degraded).some((i) => i.checkId === 'PK-3' && i.severity === 'error')).toBe(true);
  });
});

describe('skill-theta stream (M7)', () => {
  it('integrates purely and increments session counts', () => {
    const pack = MEMORY_WORKING_SPAN;
    const rec = { sessionId: 's', formId: 'a', theta: 5.2, se: 0.3, trials: 12, correctCount: 9, itemIds: ['ws.5.5'], completedAtMs: 1_000 };
    const out1 = integrateSkillTheta(undefined, pack, rec);
    expect(out1['memory.working-span']?.sessionCount).toBe(1);
    expect(out1['memory.working-span']?.theta).toBeCloseTo(5.2);
    const out2 = integrateSkillTheta(out1, pack, { ...rec, theta: 5.6 });
    expect(out2['memory.working-span']?.sessionCount).toBe(2);
  });

  it('freshness decays toward zero with the pack half-life', () => {
    const stream = { theta: 8, se: 0.3, lastMeasuredAtMs: 0, sessionCount: 1, halfLifeMs: 14 * 86_400_000 };
    const now = readFreshTheta(stream, 1);
    const later = readFreshTheta(stream, 14 * 86_400_000);
    const muchLater = readFreshTheta(stream, 140 * 86_400_000);
    expect(now).toBeCloseTo(8);
    expect(later).toBeCloseTo(4); // one half-life
    expect(muchLater).toBeLessThan(0.01);
    expect(readFreshTheta(undefined, 1)).toBeNull();
  });
});

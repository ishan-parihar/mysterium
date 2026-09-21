/**
 * Interest record + probe set tests — 47 §5/§7 and §9 checks 7–8.
 * Locks: the six-axis record invariants, the load-bearing structural-pole guard (check 7),
 * the expiring archetype prior (check 3), and the probe budget/validation split (check 8).
 */
import { describe, it, expect } from 'vitest';
import {
  createInterestRecord, isStructuralPoleAllowed, depthToLadderRange, isPriorLive, DEPTH_LADDER,
} from '../../src/core/personalization/interestRecord.js';
import {
  createProbeLedger, recordProbePlay, recordProbeDecline, canOfferProbe,
  instrumentIsRVValidated, MAX_PROBES_PER_SESSION, RV_DIMENSIONS,
} from '../../src/core/personalization/probeSet.js';
import type { Probe } from '../../src/core/personalization/probeSet.js';
import { selectPoles, pairKeyOf } from '../../src/core/personalization/dialecticEngine.js';
import { createTagStore } from '../../src/core/world/tags/dialectic.js';

const record = (over: Partial<Parameters<typeof createInterestRecord>[0]> = {}) =>
  createInterestRecord({
    domain: 'music', mode: 'produce', depth: 'fluent', salience: 0.9,
    loadBearing: true, aim: 'practice-vow', provenance: 'declared',
    ...over,
  });

describe('interest record (47 §5.1)', () => {
  it('rejects out-of-range salience', () => {
    expect(() => record({ salience: 1.5 })).toThrow(/salience/);
    expect(() => record({ salience: -0.1 })).toThrow(/salience/);
  });

  it('maps depth to 31\u2019s ladder without a second depth enum', () => {
    expect(DEPTH_LADDER.surface).toEqual([1, 2]);
    expect(DEPTH_LADDER.working).toEqual([3, 4]);
    expect(DEPTH_LADDER.fluent).toEqual([5, 6]);
    expect(depthToLadderRange('working')).toEqual([3, 4]);
  });
});

describe('load-bearing guard (47 §5.3, §9 check 7)', () => {
  it('a load-bearing domain is never allowed as the structural pole', () => {
    expect(isStructuralPoleAllowed('music', [record()])).toBe(false);
  });

  it('a non-load-bearing interest in the same domain is fine', () => {
    expect(isStructuralPoleAllowed('music', [record({ loadBearing: false })])).toBe(true);
  });

  it('the dialectic engine skips a load-bearing structural pole', () => {
    const tagStore = createTagStore();
    const poles = selectPoles(tagStore, {
      mode: 'spiral',
      fluentTags: ['music', 'technology'],
      aversions: [],
      states: {
        [pairKeyOf('music', 'architecture')]: 'active-tension',
        [pairKeyOf('technology', 'nature')]: 'active-tension',
      },
      interests: [record()],
    });
    expect(poles.structure.id).not.toBe('music');
    expect(poles.structure.id).toBe('nature'); // technology\u2019s opposite carries the work instead
  });
});

describe('archetype priors (47 §5.4, check 3)', () => {
  it('a prior expires', () => {
    const prior = { archetype: 'builder', axes: ['approach'], assignedAt: 1000, expiresAt: 2000 };
    expect(isPriorLive(prior, 1500)).toBe(true);
    expect(isPriorLive(prior, 2500)).toBe(false);
  });
});

describe('probe set (47 §7)', () => {
  const probe = (over: Partial<Probe> = {}): Probe => ({
    id: 'p1', distinction: 'approach', poleA: 'craft', poleB: 'ritual',
    modality: 'ScenarioChoice', situation: 'a workshop decision under time pressure',
    rvPassed: true, rvEvidence: [...RV_DIMENSIONS], ...over,
  });

  it('a validated instrument\u2019s reading lands in the T1 band', () => {
    const l = createProbeLedger([probe()]);
    const out = recordProbePlay(l, probe(), 'craft', 1);
    expect(out.band).toBe('validated');
    expect(l.validatedReadings).toHaveLength(1);
  });

  it('an unvalidated instrument\u2019s reading is log-only (check 8)', () => {
    const l = createProbeLedger([probe({ rvPassed: false, rvEvidence: [] })]);
    const out = recordProbePlay(l, probe({ rvPassed: false, rvEvidence: [] }), 'ritual', 1);
    expect(out.band).toBe('log-only');
    expect(l.logOnlyReadings).toHaveLength(1);
    expect(l.validatedReadings).toHaveLength(0);
  });

  it('partial RV evidence never counts as validated', () => {
    const partial = probe({ rvEvidence: ['RV1-reliability'] });
    expect(instrumentIsRVValidated(partial)).toBe(false);
  });

  it('a refusal yields no reading and only paces the budget (47 §5.2)', () => {
    const l = createProbeLedger([probe()]);
    recordProbeDecline(l);
    expect(l.validatedReadings).toHaveLength(0);
    expect(l.logOnlyReadings).toHaveLength(0);
  });

  it('the budget caps offers per session, counting declines', () => {
    const l = createProbeLedger([probe()]);
    for (let i = 0; i < MAX_PROBES_PER_SESSION; i += 1) {
      expect(canOfferProbe(l)).toBe(true);
      recordProbeDecline(l);
    }
    expect(canOfferProbe(l)).toBe(false);
  });
});

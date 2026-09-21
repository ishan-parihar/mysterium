import { describe, it, expect } from 'vitest';
import {
  renderLevel, LADDER, LADDER_BY_LEVEL, LADDER_LEVELS,
  type LadderLevel,
} from '../../../src/core/domain/articulationLadder.js';
import type { LevelPayload, ConsentLink } from '../../../src/core/domain/articulationLadder.js';
import { ALL_STAGES } from '../../../src/core/domain/Stage.js';

const payloads = new Map<LadderLevel, LevelPayload>([
  ['L1', { level: 'L1', narrative: 'your whole span', metrics: { cog: 0.6 } }],
  ['L4', { level: 'L4', narrative: 'a stance shift you may notice', metrics: { DA: 0.7 } }],
  ['L6', { level: 'L6', narrative: 'instrument detail', metrics: { rv: 'pass' } }],
]);

const liveGrant: ConsentLink = { grantId: 'g1', scopes: ['L1', 'L2', 'L3', 'L4'], revoked: false };
const revokedGrant: ConsentLink = { ...liveGrant, revoked: true };

describe('articulation ladder (16 §10.5, MY-AD-0006/0007)', () => {
  it('the ladder has L0–L7 with the §10.5 register classes', () => {
    expect(LADDER_LEVELS).toHaveLength(8);
    expect(LADDER_BY_LEVEL.get('L4')?.registerClass).toBe('closed');
    expect(LADDER_BY_LEVEL.get('L5')?.registerClass).toBe('closed');
    expect(LADDER_BY_LEVEL.get('L0')?.registerClass).toBe('open');
    expect(LADDER.filter((l) => l.registerClass === 'closed').map((l) => l.level)).toEqual(['L4', 'L5']);
  });

  it('MY-AD-0006 — the CLOSED class never renders to the self, at ANY stage', () => {
    for (const stage of ALL_STAGES) {
      const r = renderLevel({ register: 'self', level: 'L4', playerStage: stage }, payloads);
      expect(r.allowed, `${stage}`).toBe(false);
      expect(r.reason).toMatch(/closed register class/);
      expect(r.payload).toBeUndefined();
    }
  });

  it('MY-AD-0006 — the OPEN class is player-readable at ANY stage (the recorded D3 divergence)', () => {
    for (const stage of ALL_STAGES) {
      const r = renderLevel({ register: 'self', level: 'L1', playerStage: stage }, payloads);
      expect(r.allowed, `${stage}`).toBe(true);
      expect(r.payload?.metrics).toBeDefined();
    }
  });

  it('AL1 — no privilege tiers: the deepest level is available to the self directly', () => {
    const self = renderLevel({ register: 'self', level: 'L7', playerStage: 'Teal' }, payloads);
    expect(self.allowed).toBe(true);
  });

  it('AL1/AL5 — the auditor register requires a LIVE consent grant at render', () => {
    const noGrant = renderLevel({ register: 'auditor', level: 'L1', playerStage: 'Teal' }, payloads);
    expect(noGrant.allowed).toBe(false);
    expect(noGrant.reason).toMatch(/no live consent/);
    const revoked = renderLevel({ register: 'auditor', level: 'L1', playerStage: 'Teal', consent: revokedGrant }, payloads);
    expect(revoked.allowed).toBe(false);
    expect(revoked.reason).toMatch(/no live consent/);
  });

  it('AL1 — a consented auditor traverses the SAME ladder (same payloads, both classes)', () => {
    const r = renderLevel({ register: 'auditor', level: 'L4', playerStage: 'Teal', consent: liveGrant }, payloads);
    expect(r.allowed).toBe(true);
    expect(r.payload?.metrics).toEqual({ DA: 0.7 }); // closed class metric, consented
  });

  it('AL4 — descent is progressive: scopes must be contiguous from their lowest level', () => {
    const gappy: ConsentLink = { grantId: 'g2', scopes: ['L1', 'L3'], revoked: false };
    const r = renderLevel({ register: 'auditor', level: 'L3', playerStage: 'Teal', consent: gappy }, payloads);
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/progressive/);
  });

  it('AL5 — a level outside the consent scope is refused', () => {
    const r = renderLevel({ register: 'auditor', level: 'L6', playerStage: 'Teal', consent: liveGrant }, payloads);
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/scope/);
  });

  it('AL3 — presentation is stage-articulated while availability never changes', () => {
    const infrared = renderLevel({ register: 'self', level: 'L1', playerStage: 'Infrared' }, payloads);
    const teal = renderLevel({ register: 'self', level: 'L1', playerStage: 'Teal' }, payloads);
    expect(infrared.presentation).toBe('concrete-markers');
    expect(teal.presentation).toBe('full-structure');
    expect(infrared.allowed).toBe(teal.allowed);
  });

  it('every closed class is L4/L5 exactly — polarity, shadow, and the texture live below L6', () => {
    const closed = LADDER.filter((l) => l.registerClass === 'closed').map((l) => l.level);
    expect(closed).toEqual(['L4', 'L5']);
  });
});

/**
 * The ratified ladder and the three axes that must never be conflated.
 *
 * Guards the invariants CODE-PASS + P1/P2 established, none of which any existing test covered —
 * which is why the conflation they fix (`stage 8 → Violet ray`) survived in `Ray.ts` unobserved.
 * Canon: docs/foundations/02 §5, 06 §5 + §5.1. KosmOS: `_Ontology/stages/altitude.md`,
 * `_Ontology/lenses/rays.md`, `_Ontology/stages.md`.
 */
import { describe, expect, it } from 'vitest';
import { ALL_STAGES, stageOrdinal } from '../../../src/core/domain/Stage.js';
import {
  ALL_RAYS,
  ALL_SUB_OCTAVES,
  CLOSURE_BINDING,
  RAY_LENS,
  STAGE_BLUE_FLOW,
  STAGE_RAY_MAP,
  sameRay,
  stageAtRayPosition,
} from '../../../src/core/domain/Ray.js';
import {
  QUADRANTS,
  STAGE_QUALITY,
  agapeScan,
  erosScan,
  pathologyIn,
} from '../../../src/core/domain/StageQuality.js';

describe('the ratified stage ladder (02 §5, 06 §5.1)', () => {
  it('is the eight altitudes L1–L8, Teal before Turquoise', () => {
    expect(ALL_STAGES).toEqual([
      'Infrared',
      'Magenta',
      'Red',
      'Amber',
      'Orange',
      'Green',
      'Teal',
      'Turquoise',
    ]);
  });

  it('retires `White` as a stage', () => {
    expect(ALL_STAGES).not.toContain('White');
    expect(stageOrdinal('Teal')).toBe(6);
    expect(stageOrdinal('Turquoise')).toBe(7);
  });

  it('gives every altitude a KosmOS altitude label L1–L8', () => {
    expect(ALL_STAGES.map(s => STAGE_QUALITY[s].altitude)).toEqual([
      'L1',
      'L2',
      'L3',
      'L4',
      'L5',
      'L6',
      'L7',
      'L8',
    ]);
  });
});

describe('the ray LENS is a lens, not a place (06 §5, KosmOS lenses/rays.md)', () => {
  it('reads Teal and Turquoise as the SAME ray at two sub-octave positions', () => {
    expect(RAY_LENS.Teal.ray).toBe('Indigo');
    expect(RAY_LENS.Teal.subOctave).toBe('6a');
    expect(RAY_LENS.Turquoise.ray).toBe('Indigo');
    expect(RAY_LENS.Turquoise.subOctave).toBe('6b');
    expect(sameRay('Teal', 'Turquoise')).toBe(true);
  });

  it('does NOT give stage 8 the Violet ray — that position is the closure event', () => {
    // The regression this file exists for: `Turquoise: 'Violet'` conflated the altitude
    // framework with the ray framework.
    expect(STAGE_RAY_MAP.Turquoise).toBe('Indigo');
    expect(ALL_STAGES.map(s => RAY_LENS[s].ray)).not.toContain('Violet');
    expect(CLOSURE_BINDING.ray).toBe('Violet');
    expect(CLOSURE_BINDING.subOctave).toBe('7th');
  });

  it('assigns every sub-octave position at most once across the ladder', () => {
    const used = ALL_STAGES.map(s => RAY_LENS[s].subOctave);
    expect(new Set(used).size).toBe(used.length);
    // 8 altitudes occupy 8 of the 9 positions; only the closure's 7th is free.
    expect(used).not.toContain(CLOSURE_BINDING.subOctave);
    expect(ALL_SUB_OCTAVES).toHaveLength(ALL_RAYS.length + 2);
  });

  it('keeps the only doubled rays Blue (5a/5b) and Indigo (6a/6b)', () => {
    const counts = new Map<string, number>();
    for (const s of ALL_STAGES) counts.set(RAY_LENS[s].ray, (counts.get(RAY_LENS[s].ray) ?? 0) + 1);
    const doubled = [...counts.entries()].filter(([, n]) => n === 2).map(([r]) => r).sort();
    expect(doubled).toEqual(['Blue', 'Indigo']);
  });

  it('carries the Blue flow on the co-Creator pair and nowhere else', () => {
    expect(STAGE_BLUE_FLOW).toEqual({ Orange: 'in', Green: 'out' });
    expect(RAY_LENS.Orange.blueFlow).toBe('in');
    expect(RAY_LENS.Green.blueFlow).toBe('out');
  });

  it('derives STAGE_RAY_MAP from the lens (one source, not two copies)', () => {
    for (const s of ALL_STAGES) expect(STAGE_RAY_MAP[s]).toBe(RAY_LENS[s].ray);
    expect(Object.isFrozen(STAGE_RAY_MAP)).toBe(true);
  });

  it('resolves a (ray, position) back to its altitude, and the closure to nothing', () => {
    expect(stageAtRayPosition('Indigo', '6a')).toBe('Teal');
    expect(stageAtRayPosition('Indigo', '6b')).toBe('Turquoise');
    expect(stageAtRayPosition('Violet', '7th')).toBeUndefined();
  });
});

describe('altitude QUALITY is what distinguishes two stages that share a ray (P2)', () => {
  it('defines the four things KosmOS uses to name an altitude', () => {
    for (const s of ALL_STAGES) {
      const q = STAGE_QUALITY[s];
      expect(q.emergentOrder.length, `${s} emergentOrder`).toBeGreaterThan(20);
      expect(q.thresholdMarkers.length, `${s} thresholdMarkers`).toBeGreaterThan(10);
      expect(q.identityBand.length, `${s} identityBand`).toBeGreaterThan(3);
      expect(q.source).toContain('KosmOS');
    }
  });

  it('carries a marker in EVERY quadrant, integrity and pathology alike', () => {
    for (const s of ALL_STAGES) {
      for (const quad of QUADRANTS) {
        expect(STAGE_QUALITY[s].integrityMarkers[quad], `${s}.integrity.${quad}`).toBeTruthy();
        expect(STAGE_QUALITY[s].pathologyMarkers[quad], `${s}.pathology.${quad}`).toBeTruthy();
      }
      expect(Object.keys(STAGE_QUALITY[s].integrityMarkers).sort()).toEqual(['LL', 'LR', 'UL', 'UR']);
    }
  });

  it('distinguishes Teal from Turquoise by quality, not by index', () => {
    // The point of P2: these two share a ray, so the ladder's distinction must be qualitative.
    expect(STAGE_QUALITY.Teal.emergentOrder).toMatch(/gateway opens/i);
    expect(STAGE_QUALITY.Turquoise.emergentOrder).toMatch(/gateway is traversed/i);
    expect(STAGE_QUALITY.Teal.emergentOrder).not.toBe(STAGE_QUALITY.Turquoise.emergentOrder);
    expect(STAGE_QUALITY.Teal.identityBand).not.toBe(STAGE_QUALITY.Turquoise.identityBand);
    expect(pathologyIn('Teal', 'UL')).toMatch(/bypass/i);
    expect(pathologyIn('Turquoise', 'UL')).toMatch(/bypass/i);
    expect(pathologyIn('Teal', 'UL')).not.toBe(pathologyIn('Turquoise', 'UL'));
  });

  it('spans the 17-stage MHC ladder without gaps or overlaps', () => {
    const spans = ALL_STAGES.map(s => STAGE_QUALITY[s].kosmosStage);
    expect(spans[0][0]).toBe(1);
    expect(spans[spans.length - 1][1]).toBe(15);
    for (let i = 1; i < spans.length; i++) {
      expect(spans[i][0], `span ${i} starts after the previous ends`).toBe(spans[i - 1][1] + 1);
    }
  });
});

describe('the dual vectors are computable from quality (AGENTS.md §5.3)', () => {
  it('Agape descends to every altitude BELOW the centre of gravity', () => {
    expect(agapeScan('Infrared')).toEqual([]);
    expect(agapeScan('Red')).toEqual(['Infrared', 'Magenta']);
    expect(agapeScan('Turquoise')).toHaveLength(7);
    expect(agapeScan('Turquoise')).not.toContain('Turquoise');
  });

  it('Eros reads the CoG threshold markers and names what it is called toward', () => {
    const atRed = erosScan('Red');
    expect(atRed?.stage).toBe('Red');
    expect(atRed?.thresholdMarkers).toBe(STAGE_QUALITY.Red.thresholdMarkers);
    expect(atRed?.calledToward).toBe('Amber');
  });

  it('Eros returns null at the top of the ladder — the next attractor is the closure', () => {
    expect(erosScan('Turquoise')).toBeNull();
  });

  it('every altitude below the top has a non-empty Eros agenda', () => {
    for (const s of ALL_STAGES.slice(0, -1)) {
      expect(erosScan(s)?.thresholdMarkers.length, `${s} threshold`).toBeGreaterThan(10);
    }
  });
});

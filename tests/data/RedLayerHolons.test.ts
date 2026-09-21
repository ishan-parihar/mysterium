import { describe, it, expect } from 'vitest';
import holonsJson from '../../src/core/world/data/red-layer-holons.json';
import type { Holon } from '../../src/core/world/Holon.js';
import { ALL_HOLON_KINDS, ALL_ENERGETIC_DIRECTIONS } from '../../src/core/domain/enums.js';
import { ALL_LINES } from '../../src/core/domain/Line.js';
import { ALL_DRIVES } from '../../src/core/domain/Drive.js';
import { createRegistry, queryByNarrativeRole } from '../../src/core/world/store/HolonStore.js';
import { RedPESTLE, PESTLE_DIMENSIONS } from '../../src/core/world/pestle/RedPESTLE.js';

const holons = holonsJson as unknown as Holon[];

describe('Red Layer Holons JSON', () => {
  it('contains 30+ holons', () => {
    expect(holons.length).toBeGreaterThanOrEqual(30);
  });

  it('every holon has all required fields', () => {
    for (const h of holons) {
      expect(h.id).toBeTruthy();
      expect(h.name).toBeTruthy();
      expect(ALL_HOLON_KINDS).toContain(h.kind);
      expect(ALL_LINES).toContain(h.line);
      expect(h.stage).toBe('Red');
      expect(ALL_DRIVES).toContain(h.drives.dominant);
      expect(ALL_DRIVES).toContain(h.drives.secondary);
      expect(ALL_ENERGETIC_DIRECTIONS).toContain(h.polarity);
      expect(h.narrativeRole).toBeTruthy();
      expect(Array.isArray(h.relationships)).toBe(true);
      expect(typeof h.active).toBe('boolean');
    }
  });

  it('covers all 8 lines', () => {
    const linesPresent = new Set(holons.map(h => h.line));
    for (const line of ALL_LINES) {
      expect(linesPresent.has(line), `Missing line: ${line}`).toBe(true);
    }
  });

  it('covers all HolonKind types', () => {
    const kindsPresent = new Set(holons.map(h => h.kind));
    for (const kind of ALL_HOLON_KINDS) {
      expect(kindsPresent.has(kind), `Missing kind: ${kind}`).toBe(true);
    }
  });

  it('has at least 2 ally-companion holons', () => {
    const allies = holons.filter(h => h.narrativeRole === 'ally-companion');
    expect(allies.length).toBeGreaterThanOrEqual(2);
  });

  it('all holon IDs are unique', () => {
    const ids = holons.map(h => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('RedPESTLE', () => {
  it('covers all 6 PESTLE dimensions', () => {
    for (const dim of PESTLE_DIMENSIONS) {
      expect(RedPESTLE[dim]).toBeTruthy();
      expect(typeof RedPESTLE[dim]).toBe('string');
    }
  });

  it('has exactly 6 dimensions', () => {
    expect(PESTLE_DIMENSIONS.length).toBe(6);
  });
});

describe('queryByNarrativeRole', () => {
  const registry = createRegistry(holons);

  it('finds ally-companion holons', () => {
    const allies = queryByNarrativeRole(registry, 'ally-companion');
    expect(allies.length).toBeGreaterThanOrEqual(2);
    expect(allies.every(h => h.narrativeRole === 'ally-companion')).toBe(true);
  });

  it('finds the main-boss', () => {
    const bosses = queryByNarrativeRole(registry, 'main-boss');
    expect(bosses.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty array for non-existent role', () => {
    const results = queryByNarrativeRole(registry, 'non-existent-role');
    expect(results).toHaveLength(0);
  });
});

import { describe, it, expect } from 'vitest';
import stageHolonsJson from '../../src/core/data/stage-holons.json';
import redHolonsJson from '../../src/core/data/red-layer-holons.json';
import type { Holon } from '../../src/core/domain/Holon.js';
import { ALL_HOLON_KINDS, ALL_ENERGETIC_DIRECTIONS, ALL_SHADOW_QUADRANTS } from '../../src/core/domain/enums.js';
import { ALL_LINES } from '../../src/core/domain/Line.js';
import { ALL_STAGES } from '../../src/core/domain/Stage.js';
import { ALL_DRIVES } from '../../src/core/domain/Drive.js';
import { createRegistry, queryByAltitude } from '../../src/core/data/HolonRegistry.js';

const stageHolons = stageHolonsJson as unknown as Holon[];
const redHolons = redHolonsJson as unknown as Holon[];
const combined = [...redHolons, ...stageHolons];

describe('Stage Holons JSON (P3: all-stage world content)', () => {
  it('contains 56 holons across the 7 previously-unauthored stages', () => {
    expect(stageHolons.length).toBe(56);
  });

  it('every holon has all required fields with valid enum values', () => {
    for (const h of stageHolons) {
      expect(h.id, 'id').toBeTruthy();
      expect(h.name, 'name').toBeTruthy();
      expect(ALL_HOLON_KINDS, `kind of ${h.id}`).toContain(h.kind);
      expect(ALL_LINES, `line of ${h.id}`).toContain(h.line);
      expect(h.stage).not.toBe('Red'); // this file must NOT duplicate Red content
      expect(ALL_DRIVES, `dominant drive of ${h.id}`).toContain(h.drives.dominant);
      expect(ALL_DRIVES, `secondary drive of ${h.id}`).toContain(h.drives.secondary);
      if (h.drives.shadowQuadrant !== null) {
        expect(ALL_SHADOW_QUADRANTS, `shadow quadrant of ${h.id}`).toContain(h.drives.shadowQuadrant);
      }
      expect(ALL_ENERGETIC_DIRECTIONS, `polarity of ${h.id}`).toContain(h.polarity);
      expect(h.narrativeRole, `narrativeRole of ${h.id}`).toBeTruthy();
      expect(Array.isArray(h.relationships), `relationships of ${h.id}`).toBe(true);
      expect(typeof h.active, `active of ${h.id}`).toBe('boolean');
    }
  });

  it('every non-Red stage has exactly 8 holons, one per line', () => {
    for (const stage of ALL_STAGES) {
      if (stage === 'Red') continue; // Red is covered by red-layer-holons.json
      const forStage = stageHolons.filter(h => h.stage === stage);
      expect(forStage.length, `${stage} holon count`).toBe(8);
      const lines = new Set(forStage.map(h => h.line));
      for (const line of ALL_LINES) {
        expect(lines.has(line), `${stage} missing line ${line}`).toBe(true);
      }
    }
  });

  it('every non-Red stage surfaces all 4 shadow quadrants', () => {
    for (const stage of ALL_STAGES) {
      if (stage === 'Red') continue;
      const forStage = stageHolons.filter(h => h.stage === stage);
      const quadrants = new Set(forStage.map(h => h.drives.shadowQuadrant).filter(q => q !== null));
      for (const q of ALL_SHADOW_QUADRANTS) {
        expect(quadrants.has(q), `${stage} missing shadow quadrant ${q}`).toBe(true);
      }
    }
  });

  it('IDs are unique across the combined corpus (red + stage)', () => {
    const ids = combined.map(h => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('combined corpus covers all 8 stages and all 8 lines', () => {
    const registry = createRegistry(combined);
    const stageSet = new Set(combined.map(h => h.stage));
    for (const stage of ALL_STAGES) {
      expect(stageSet.has(stage), `missing stage ${stage}`).toBe(true);
      expect(queryByAltitude(registry, stage).length, `${stage} holon count`).toBeGreaterThanOrEqual(8);
    }
    const lineSet = new Set(combined.map(h => h.line));
    for (const line of ALL_LINES) {
      expect(lineSet.has(line), `missing line ${line}`).toBe(true);
    }
  });

  it('relationship references resolve to existing holon IDs (within-file or cross-file)', () => {
    const idSet = new Set(combined.map(h => h.id));
    for (const h of stageHolons) {
      for (const rel of h.relationships) {
        expect(idSet.has(rel), `${h.id} → unresolved relationship '${rel}'`).toBe(true);
      }
    }
  });
});

import { describe, it, expect } from 'vitest';
import { redEncounterData } from '../../src/core/world/encounters-red/index.js';
import { ALL_LINES } from '../../src/core/domain/Line.js';
import { ALL_MODALITIES } from '../../src/core/domain/enums.js';
import type { TaskSlug } from '../../src/core/domain/SharedTypes.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { Modality } from '../../src/core/domain/enums.js';

const VALID_TASK_SLUGS: readonly TaskSlug[] = [
  'n_back', 'stroop', 'simon', 'go_no_go',
  'affect_recognition', 'dilemma_choice',
  'reaction_time', 'held_input', 'breath_rhythm',
  'self_report', 'value_coherence', 'pattern_prediction',
];

describe('Red Encounter Data', () => {
  it('contains exactly 34 encounter templates (30 side + 4 threshold)', () => {
    expect(redEncounterData).toHaveLength(34);
  });

  it('all encounters are valid EncounterSpec objects', () => {
    for (const enc of redEncounterData) {
      expect(enc.id).toBeTruthy();
      expect(enc.lines.length).toBeGreaterThanOrEqual(1);
      expect(enc.stage).toBe('Red');
      expect(enc.quadrants.length).toBeGreaterThanOrEqual(1);
      expect(['side', 'mini', 'main', 'shadow', 'threshold']).toContain(enc.role);
      expect(enc.ray).toBe('Yellow');
      expect(enc.taskBinds.length).toBeGreaterThanOrEqual(1);
      expect(enc.narrative.theme).toBeTruthy();
      expect(enc.narrative.allyBeats.length).toBeGreaterThanOrEqual(1);
      expect(enc.narrative.codexEntry).toBeTruthy();
      expect(enc.enemy.name).toBeTruthy();
      expect(enc.enemy.difficulty).toBeGreaterThan(0);
    }
  });

  it('each encounter has a modality assigned', () => {
    for (const enc of redEncounterData) {
      expect(enc.modality).toBeTruthy();
      expect(ALL_MODALITIES).toContain(enc.modality);
    }
  });

  it('all 8 lines are covered', () => {
    const coveredLines = new Set<Line>();
    for (const enc of redEncounterData) {
      for (const line of enc.lines) {
        coveredLines.add(line);
      }
    }
    for (const line of ALL_LINES) {
      expect(coveredLines.has(line), `Line ${line} not covered`).toBe(true);
    }
  });

  it('at least 5 of the 7 modalities are represented', () => {
    const usedModalities = new Set<Modality>();
    for (const enc of redEncounterData) {
      if (enc.modality) {
        usedModalities.add(enc.modality);
      }
    }
    expect(usedModalities.size).toBeGreaterThanOrEqual(5);
  });

  it('all 7 modalities are represented', () => {
    const usedModalities = new Set<Modality>();
    for (const enc of redEncounterData) {
      if (enc.modality) {
        usedModalities.add(enc.modality);
      }
    }
    for (const mod of ALL_MODALITIES) {
      expect(usedModalities.has(mod), `Modality ${mod} not represented`).toBe(true);
    }
  });

  it('encounter IDs are unique', () => {
    const ids = redEncounterData.map(e => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all taskBinds reference valid TaskSlug values', () => {
    for (const enc of redEncounterData) {
      for (const bind of enc.taskBinds) {
        expect(
          VALID_TASK_SLUGS.includes(bind.taskSlug),
          `Invalid taskSlug "${bind.taskSlug}" in encounter ${enc.id}`,
        ).toBe(true);
      }
    }
  });

  it('all taskBinds reference valid Line values', () => {
    for (const enc of redEncounterData) {
      for (const bind of enc.taskBinds) {
        expect(
          (ALL_LINES as readonly string[]).includes(bind.line),
          `Invalid line "${bind.line}" in taskBind of encounter ${enc.id}`,
        ).toBe(true);
      }
    }
  });

  it('each line has 3-8 encounters as primary line (includes threshold encounters)', () => {
    for (const line of ALL_LINES) {
      const count = redEncounterData.filter(e => e.lines[0] === line).length;
      expect(
        count,
        `Line ${line} has ${count} encounters (expected 3-8)`,
      ).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(8);
    }
  });
});

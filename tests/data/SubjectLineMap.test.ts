/**
 * Tests for the subject → line mapping registry data (doc 37 §3.1).
 *
 * Guarantees under test:
 *   S1  Enum integrity — every mapping references canonical lines, stages of
 *       the 7 modalities, and valid corpus statuses.
 *   S2  Coverage — the K-12 subject table (37's 13 rows) is fully represented.
 *   S3  Grade-band absence — the blindness law (42 §1.1): no grade vocabulary
 *       anywhere in the mapping (grade bands are authoring-guide-only).
 *   S4  Branch references resolve — every mapped branch with corpusStatus
 *       'present' exists in the seeded curriculum registry.
 */
import { describe, it, expect } from 'vitest';
import subjectMap from '../../src/core/curriculum/data/subject-line-map.json';
import { ALL_LINES } from '../../src/core/domain/Line.js';
import { ALL_MODALITIES } from '../../src/core/domain/enums.js';
import { seedCurriculumRegistry } from '../../src/core/curriculum/CurriculumSeed.js';
import { getCurriculumRegistry } from '../../src/core/curriculum/CurriculumRegistry.js';

const mappings = subjectMap.mappings as readonly {
  subject: string;
  branches: readonly string[];
  primaryLines: readonly string[];
  secondaryLines: readonly string[];
  modalityAffinity: readonly string[];
  corpusStatus: string;
}[];

const EXPECTED_SUBJECTS = [
  'mathematics', 'computing', 'physical-sciences', 'life-sciences',
  'literacy-l1', 'literature', 'arts-music', 'second-language',
  'history', 'civics-ethics', 'geography', 'health-pe',
  'social-emotional-learning',
];

const VALID_STATUSES = ['present', 'partial', 'planned'];

describe('subject → line map (doc 37 §3.1)', () => {
  it('S1: uses canonical enums only', () => {
    for (const m of mappings) {
      for (const line of [...m.primaryLines, ...m.secondaryLines]) {
        expect(ALL_LINES as readonly string[], `${m.subject} line ${line}`).toContain(line);
      }
      for (const mod of m.modalityAffinity) {
        expect(ALL_MODALITIES as readonly string[], `${m.subject} modality ${mod}`).toContain(mod);
      }
      expect(VALID_STATUSES, `${m.subject} status`).toContain(m.corpusStatus);
    }
  });

  it('S2: covers all 13 K-12 subject rows', () => {
    const subjects = mappings.map((m) => m.subject);
    for (const expected of EXPECTED_SUBJECTS) {
      expect(subjects, `missing subject ${expected}`).toContain(expected);
    }
    expect(mappings.length).toBe(EXPECTED_SUBJECTS.length);
  });

  it('S3: carries no grade-band vocabulary (42 blindness law)', () => {
    const raw = JSON.stringify(subjectMap).toLowerCase();
    for (const banned of ['grade', 'k-2', 'k–2', '3-5', '6-8', '9-12', 'school year', 'age ']) {
      expect(raw.includes(banned), `banned vocabulary '${banned}'`).toBe(false);
    }
  });

  it('S4: present branches resolve in the seeded registry', () => {
    seedCurriculumRegistry();
    const registry = getCurriculumRegistry();
    const ids = registry.conceptIds();
    for (const m of mappings) {
      if (m.corpusStatus !== 'present') continue;
      for (const branch of m.branches) {
        expect(ids.some((id) => id.startsWith(`${branch}.`)), `branch ${branch} present in registry`).toBe(true);
      }
    }
  });
});

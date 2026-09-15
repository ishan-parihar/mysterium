import { describe, it, expect } from 'vitest';
import integralData from '../../../src/core/curriculum/data/integral.foundations.json';
import { seedCurriculumRegistry, getCachedLintResult } from '../../../src/core/curriculum/CurriculumSeed.js';
import { getCurriculumRegistry } from '../../../src/core/curriculum/CurriculumRegistry.js';
import { lintHolon } from '../../../src/core/curriculum/CurriculumLinter.js';
import { ALL_LINES } from '../../../src/core/domain/Line.js';
import { ALL_STAGES } from '../../../src/core/domain/Stage.js';
import { ALL_MODALITIES } from '../../../src/core/domain/enums.js';
import { ALL_DEPTH_LEVELS, ALL_CURRICULUM_TASK_TYPES } from '../../../src/core/curriculum/types.js';
import type { CurriculumHolon } from '../../../src/core/curriculum/types.js';

const holons = integralData as unknown as CurriculumHolon[];

describe('integral.foundations curriculum data (P4: curriculum expansion)', () => {
  it('contains 8 holons covering the branch and its subjects/topics', () => {
    expect(holons.length).toBe(8);
    expect(holons.map(h => h.id)).toContain('integral.foundations');
  });

  it('every holon has the five-phase structure with substantive questions', () => {
    for (const h of holons) {
      for (const phase of ['observation', 'principle', 'application', 'integration', 'creation'] as const) {
        const p = h.phases[phase];
        expect(p.question.length, `${h.id}.${phase}.question`).toBeGreaterThan(10);
        expect(p.completionEvidence.length, `${h.id}.${phase}.evidence`).toBeGreaterThan(10);
        expect(ALL_CURRICULUM_TASK_TYPES, `${h.id}.${phase}.assessmentType`).toContain(p.assessmentType);
      }
    }
  });

  it('content is rich: explanation, examples, non-examples, practice problems', () => {
    for (const h of holons) {
      expect(h.content.explanation.length, `${h.id} explanation`).toBeGreaterThanOrEqual(50);
      expect(h.content.examples.length, `${h.id} examples`).toBeGreaterThanOrEqual(2);
      expect(h.content.nonExamples.length, `${h.id} nonExamples`).toBeGreaterThanOrEqual(1);
      expect(h.content.practiceProblems.length, `${h.id} practiceProblems`).toBeGreaterThanOrEqual(1);
    }
  });

  it('devMappings use valid lines/stages; modalities are valid', () => {
    for (const h of holons) {
      expect(ALL_LINES, `${h.id} primaryLine`).toContain(h.devMapping.primaryLine);
      expect(ALL_STAGES, `${h.id} stageRange.min`).toContain(h.devMapping.stageRange.min);
      expect(ALL_STAGES, `${h.id} stageRange.max`).toContain(h.devMapping.stageRange.max);
      expect(h.supportedModalities.length, `${h.id} modalities`).toBeGreaterThanOrEqual(1);
      for (const m of h.supportedModalities) {
        expect(ALL_MODALITIES, `${h.id} modality ${m}`).toContain(m);
      }
    }
  });

  it('depth rubrics are complete across all 6 target levels with monotonic thresholds', () => {
    for (const h of holons) {
      const levels = h.depthRubric.levels;
      let prevThreshold = 0;
      for (const level of ['memorized', 'comprehended', 'applied', 'analyzed', 'evaluated', 'transformed'] as const) {
        const entry = levels[level];
        expect(entry, `${h.id}.${level}`).toBeDefined();
        expect(entry.evidence.length, `${h.id}.${level}.evidence`).toBeGreaterThan(5);
        expect(entry.threshold, `${h.id}.${level}.threshold`).toBeGreaterThan(prevThreshold);
        prevThreshold = entry.threshold;
      }
      // Monotonic depth progression per D-1
      const prog = h.depthMeta.depthProgression;
      for (let i = 1; i < prog.length; i++) {
        expect(ALL_DEPTH_LEVELS.indexOf(prog[i]!)).toBeGreaterThan(ALL_DEPTH_LEVELS.indexOf(prog[i - 1]!));
      }
    }
  });

  it('all internal references (parentId, prerequisites, childIds) resolve within the subject', () => {
    const ids = new Set(holons.map(h => h.id));
    for (const h of holons) {
      if (h.parentId !== null) expect(ids.has(h.parentId), `${h.id} parentId`).toBe(true);
      for (const p of h.prerequisites) expect(ids.has(p), `${h.id} prerequisite ${p}`).toBe(true);
      for (const c of h.childIds) expect(ids.has(c), `${h.id} child ${c}`).toBe(true);
    }
  });

  it('seeds into the registry and lints with zero errors and zero warnings', () => {
    seedCurriculumRegistry();
    const reg = getCurriculumRegistry();
    for (const h of holons) {
      expect(reg.get(h.id), `${h.id} registered`).toBeDefined();
      const report = lintHolon(h, reg);
      expect(report.errors, `${h.id} lint errors`).toHaveLength(0);
      expect(report.warnings, `${h.id} lint warnings`).toHaveLength(0);
      expect(report.passed, `${h.id} passed`).toBe(true);
      expect(report.pedagogicalQuality, `${h.id} pedQ`).toBe(1);
      expect(report.developmentalIntegration, `${h.id} devI`).toBe(1);
    }
  });

  it('seed-level lint cache shows zero errors overall (existing corpus + new subject)', () => {
    seedCurriculumRegistry();
    const lint = getCachedLintResult();
    expect(lint).not.toBeNull();
    expect(lint!.overallPassed).toBe(true);
    expect(lint!.totalErrors).toBe(0);
  });
});

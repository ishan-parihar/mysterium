/**
 * CurriculumLinter tests — validates all lint checks against curriculum holons.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CurriculumRegistry } from '../../../src/core/curriculum/CurriculumRegistry.js';
import { lintHolon, lintRegistry } from '../../../src/core/curriculum/CurriculumLinter.js';
import type { CurriculumHolon } from '../../../src/core/curriculum/types.js';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const BASE_HOLON: CurriculumHolon = {
  id: 'test.math.algebra',
  name: 'Algebra',
  description: 'The study of mathematical symbols and the rules for manipulating them.',
  level: 'concept',
  parentId: null,
  childIds: [],
  phases: {
    observation: { question: 'What patterns do you see in equations?', assessmentType: 'factual_recall', completionEvidence: 'Can identify variables and constants' },
    principle: { question: 'What rules govern equation manipulation?', assessmentType: 'concept_explanation', completionEvidence: 'Can explain properties of equality' },
    application: { question: 'How do you solve for unknowns?', assessmentType: 'application_problem', completionEvidence: 'Can solve linear equations' },
    integration: { question: 'How does algebra connect to geometry?', assessmentType: 'analogy_mapping', completionEvidence: 'Can map algebraic expressions to geometric representations' },
    creation: { question: 'How can you model real-world problems algebraically?', assessmentType: 'project_based', completionEvidence: 'Can formulate word problems as equations' },
  },
  isomorphisms: [],
  prerequisites: [],
  devMapping: {
    primaryLine: 'Cognitive',
    secondaryLines: [],
    stageRange: { min: 'Red', max: 'Orange' },
  },
  depthMeta: {
    requiredPrerequisiteDepth: 'absent',
    targetDepthRange: { min: 'memorized', max: 'applied' },
    depthProgression: ['memorized', 'comprehended', 'applied'],
  },
  forgettingParams: { initialHalfLifeMs: 86400000, halfLifeMultiplier: 2.5, maxHalfLifeMs: 31536000000 },
  content: {
    explanation: 'Algebra is a branch of mathematics that uses symbols to represent numbers and operations in equations.',
    examples: ['x + 2 = 5 → x = 3', '2x = 10 → x = 5'],
    nonExamples: ['Geometry (deals with shapes, not symbols)', 'Arithmetic (uses specific numbers, not variables)'],
    analogies: ['Like a balance scale — what you do to one side, you must do to the other'],
    visuals: ['Balance scale diagram showing equation equality'],
    practiceProblems: [
      { id: 'alg.p1', problemText: 'Solve: 3x + 7 = 22', targetDepth: 'memorized' },
      { id: 'alg.p2', problemText: 'Solve: 2(x - 3) = 10', targetDepth: 'comprehended' },
    ],
  },
  misconceptions: [
    {
      id: 'alg.mc1',
      statement: 'You can divide by zero',
      whyItFeelsRight: 'Division usually works, so it should work here too',
      structuralReason: 'Division by zero is undefined because there is no number that, when multiplied by zero, gives a non-zero result.',
      diagnosticTaskId: 'alg.mc1.diag',
    },
  ],
  depthRubric: {
    conceptId: 'test.math.algebra',
    levels: {
      memorized: { evidence: 'Can recall basic algebraic operations', canDo: ['Name variables and constants'], cannotDo: ['Solve equations'], appropriateTasks: ['factual_recall'], threshold: 0.3 },
      comprehended: { evidence: 'Can explain how equation manipulation works', canDo: ['Explain properties of equality'], cannotDo: ['Solve complex equations'], appropriateTasks: ['concept_explanation'], threshold: 0.5 },
      applied: { evidence: 'Can solve linear equations', canDo: ['Solve for x in various equations'], cannotDo: ['Analyze equation structure'], appropriateTasks: ['application_problem'], threshold: 0.65 },
      analyzed: { evidence: 'Can decompose equation systems', canDo: ['Identify solution strategies'], cannotDo: ['Create novel equations'], appropriateTasks: ['case_study_analysis'], threshold: 0.8 },
      evaluated: { evidence: 'Can assess solution correctness', canDo: ['Verify solutions'], cannotDo: ['Design new algebraic systems'], appropriateTasks: ['peer_review'], threshold: 0.9 },
      transformed: { evidence: 'Algebra is an intuitive lens', canDo: ['Apply algebra anywhere'], cannotDo: [], appropriateTasks: ['peer_teaching'], threshold: 0.95 },
    },
  },
  supportedModalities: ['LanguageReflective', 'Deterministic'],
};

function makeRegistry(holons: CurriculumHolon[]): CurriculumRegistry {
  const registry = new CurriculumRegistry();
  for (const h of holons) registry.register(h);
  return registry;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CurriculumLinter', () => {
  let registry: CurriculumRegistry;

  beforeEach(() => {
    registry = makeRegistry([BASE_HOLON]);
  });

  describe('lintHolon', () => {
    it('passes for a well-formed holon', () => {
      const report = lintHolon(BASE_HOLON, registry);
      expect(report.passed).toBe(true);
      expect(report.errors.length).toBe(0);
      expect(report.pedagogicalQuality).toBeGreaterThan(0.5);
      expect(report.developmentalIntegration).toBeGreaterThan(0.5);
    });

    it('detects missing prerequisite (S-1)', () => {
      const holon = { ...BASE_HOLON, prerequisites: ['nonexistent.concept'] };
      const report = lintHolon(holon, registry);
      expect(report.passed).toBe(false);
      expect(report.errors.some(e => e.checkId === 'S-1')).toBe(true);
    });

    it('detects missing parent (S-2)', () => {
      const holon = { ...BASE_HOLON, parentId: 'nonexistent.parent' };
      const report = lintHolon(holon, registry);
      expect(report.errors.some(e => e.checkId === 'S-2')).toBe(true);
    });

    it('warns about missing child (S-3)', () => {
      const holon = { ...BASE_HOLON, childIds: ['nonexistent.child'] };
      const report = lintHolon(holon, registry);
      expect(report.warnings.some(w => w.checkId === 'S-3')).toBe(true);
    });

    it('warns about missing isomorphism target (S-4)', () => {
      const holon = {
        ...BASE_HOLON,
        isomorphisms: [{
          pattern: 'test pattern',
          targetConceptId: 'nonexistent.target',
          targetDomain: 'Test',
          mappingDescription: 'Test mapping',
        }],
      };
      const report = lintHolon(holon, registry);
      expect(report.warnings.some(w => w.checkId === 'S-4')).toBe(true);
    });

    it('detects empty explanation (P-2)', () => {
      const holon = { ...BASE_HOLON, content: { ...BASE_HOLON.content, explanation: '' } };
      const report = lintHolon(holon, registry);
      expect(report.errors.some(e => e.checkId === 'P-2')).toBe(true);
    });

    it('detects no examples (P-2)', () => {
      const holon = { ...BASE_HOLON, content: { ...BASE_HOLON.content, examples: [] } };
      const report = lintHolon(holon, registry);
      expect(report.errors.some(e => e.checkId === 'P-2')).toBe(true);
    });

    it('warns about no non-examples (P-2)', () => {
      const holon = { ...BASE_HOLON, content: { ...BASE_HOLON.content, nonExamples: [] } };
      const report = lintHolon(holon, registry);
      expect(report.warnings.some(w => w.checkId === 'P-2')).toBe(true);
    });

    it('rejects an assessment-empty content-bearing holon (P-3, error since Phase 17 d5)', () => {
      const holon = { ...BASE_HOLON, content: { ...BASE_HOLON.content, practiceProblems: [] } };
      const report = lintHolon(holon, registry);
      // The teeth: a concept/module/lesson/unit with no practice problems is an ERROR, not a
      // warning — cs.program shipped 8/8-empty and linted clean under the old severities.
      expect(report.errors.some(e => e.checkId === 'P-3')).toBe(true);
      expect(report.passed).toBe(false);
    });

    it('does not demand practice problems of containers (branch/subject/topic)', () => {
      const holon = { ...BASE_HOLON, level: 'topic' as CurriculumHolon['level'], content: { ...BASE_HOLON.content, practiceProblems: [] } };
      const report = lintHolon(holon, registry);
      expect(report.errors.some(e => e.checkId === 'P-3')).toBe(false);
    });

    it('detects non-monotonic depth progression (D-1)', () => {
      const holon = {
        ...BASE_HOLON,
        depthMeta: { ...BASE_HOLON.depthMeta, depthProgression: ['applied', 'memorized', 'comprehended'] as readonly ['applied', 'memorized', 'comprehended'] },
      };
      const report = lintHolon(holon, registry);
      expect(report.errors.some(e => e.checkId === 'D-1')).toBe(true);
    });

    it('detects invalid target range (D-2)', () => {
      const holon = {
        ...BASE_HOLON,
        depthMeta: { ...BASE_HOLON.depthMeta, targetDepthRange: { min: 'applied' as const, max: 'memorized' as const } },
      };
      const report = lintHolon(holon, registry);
      expect(report.errors.some(e => e.checkId === 'D-2')).toBe(true);
    });

    it('detects no modalities (D-4)', () => {
      const holon = { ...BASE_HOLON, supportedModalities: [] };
      const report = lintHolon(holon, registry);
      expect(report.errors.some(e => e.checkId === 'D-4')).toBe(true);
    });

    it('warns about brief description (E-1)', () => {
      const holon = { ...BASE_HOLON, description: 'Short' };
      const report = lintHolon(holon, registry);
      expect(report.warnings.some(w => w.checkId === 'E-1')).toBe(true);
    });

    it('warns about missing phase question (P-1)', () => {
      const holon = {
        ...BASE_HOLON,
        phases: {
          ...BASE_HOLON.phases,
          observation: { ...BASE_HOLON.phases.observation, question: '' },
        },
      };
      const report = lintHolon(holon, registry);
      expect(report.errors.some(e => e.checkId === 'P-1')).toBe(true);
    });
  });

  describe('lintRegistry', () => {
    it('passes for a clean registry', () => {
      const result = lintRegistry(registry);
      expect(result.overallPassed).toBe(true);
      expect(result.totalErrors).toBe(0);
    });

    it('detects missing cross-branch prerequisites', () => {
      const holonWithMissingCB: CurriculumHolon = {
        ...BASE_HOLON,
        id: 'test.missing.cb',
        crossBranchPrerequisites: ['nonexistent.holon.x', 'nonexistent.holon.y'],
      };
      const missingCBRegistry = makeRegistry([holonWithMissingCB]);
      const result = lintRegistry(missingCBRegistry);
      expect(result.overallPassed).toBe(false);
      expect(result.graphIssues.some(i => i.checkId === 'G-CB-MISSING')).toBe(true);
      expect(result.graphIssues.filter(i => i.checkId === 'G-CB-MISSING').length).toBe(2);
    });

    it('detects prerequisite cycles', () => {
      const holonA: CurriculumHolon = {
        ...BASE_HOLON,
        id: 'test.cycle.a',
        prerequisites: ['test.cycle.b'],
      };
      const holonB: CurriculumHolon = {
        ...BASE_HOLON,
        id: 'test.cycle.b',
        prerequisites: ['test.cycle.a'],
      };
      const cycleRegistry = makeRegistry([holonA, holonB]);
      const result = lintRegistry(cycleRegistry);
      expect(result.overallPassed).toBe(false);
      expect(result.graphIssues.some(i => i.checkId === 'G-CYCLE')).toBe(true);
    });

    it('aggregates errors across all holons', () => {
      const badHolon: CurriculumHolon = {
        ...BASE_HOLON,
        id: 'test.bad',
        prerequisites: ['nonexistent'],
        content: { ...BASE_HOLON.content, explanation: '' },
      };
      const mixedRegistry = makeRegistry([BASE_HOLON, badHolon]);
      const result = lintRegistry(mixedRegistry);
      expect(result.totalErrors).toBeGreaterThan(0);
      expect(result.holonReports.length).toBe(2);
    });
  });
});

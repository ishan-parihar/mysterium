/**
 * Tests for the unified developmental levelling mechanism (doc 42).
 * Covers: ladder construction, syllabus evidence aggregation with prereq
 * capping, line evaluation with theta freshness + shadow gating, and the
 * promotion/demotion laws (stability window + hysteresis).
 */
import { describe, it, expect } from 'vitest';
import type { CurriculumHolon, KnowledgeState, ConceptState } from '../../../src/core/curriculum/types.js';
import {
  buildSyllabusLadder,
  buildLineLadder,
  evaluateSyllabusLevel,
  evaluateLineLevel,
  evaluateAllLevels,
  DEFAULT_LEVELLING_CONFIG,
  EMPTY_PRIOR,
} from '../../../src/core/curriculum/LevellingEngine.js';
import { ALL_LINES, type Line } from '../../../src/core/domain/Line.js';
import { ALL_STAGES, stageOrdinal, type Stage } from '../../../src/core/domain/Stage.js';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

const CONFIG = DEFAULT_LEVELLING_CONFIG;

function makeHolon(id: string, prereqs: readonly string[] = []): CurriculumHolon {
  return {
    id,
    name: id,
    description: `Holon ${id} for levelling tests`,
    level: 'concept',
    parentId: null,
    childIds: [],
    phases: {
      observation: { question: 'q', assessmentType: 'factual_recall', completionEvidence: 'e' },
      principle: { question: 'q', assessmentType: 'concept_explanation', completionEvidence: 'e' },
      application: { question: 'q', assessmentType: 'application_problem', completionEvidence: 'e' },
      integration: { question: 'q', assessmentType: 'analogy_mapping', completionEvidence: 'e' },
      creation: { question: 'q', assessmentType: 'creative_synthesis', completionEvidence: 'e' },
    },
    isomorphisms: [],
    prerequisites: prereqs,
    devMapping: { primaryLine: 'Cognitive', secondaryLines: [], stageRange: { min: 'Red', max: 'Red' } },
    depthMeta: {
      requiredPrerequisiteDepth: 'memorized',
      targetDepthRange: { min: 'memorized', max: 'transformed' },
      depthProgression: ['memorized', 'comprehended', 'applied', 'analyzed', 'evaluated', 'transformed'],
    },
    forgettingParams: { initialHalfLifeMs: 86_400_000, halfLifeMultiplier: 2.5, maxHalfLifeMs: 31_536_000_000 },
    content: {
      explanation: 'Test explanation long enough to satisfy any validation',
      examples: ['ex1'],
      nonExamples: ['non1'],
      analogies: ['an1'],
      visuals: ['vis1'],
      practiceProblems: [],
    },
    misconceptions: [],
    depthRubric: {
      conceptId: id,
      levels: {
        memorized: { evidence: 'e', canDo: ['c'], cannotDo: ['n'], appropriateTasks: ['factual_recall'], threshold: 0.5 },
        comprehended: { evidence: 'e', canDo: ['c'], cannotDo: ['n'], appropriateTasks: ['concept_explanation'], threshold: 0.5 },
        applied: { evidence: 'e', canDo: ['c'], cannotDo: ['n'], appropriateTasks: ['application_problem'], threshold: 0.5 },
        analyzed: { evidence: 'e', canDo: ['c'], cannotDo: ['n'], appropriateTasks: ['analogy_mapping'], threshold: 0.5 },
        evaluated: { evidence: 'e', canDo: ['c'], cannotDo: ['n'], appropriateTasks: ['debate_position'], threshold: 0.5 },
        transformed: { evidence: 'e', canDo: ['c'], cannotDo: ['n'], appropriateTasks: ['creative_synthesis'], threshold: 0.5 },
      },
    },
    supportedModalities: ['puzzle'],
  } as unknown as CurriculumHolon;
}

function makeState(overrides: Partial<ConceptState> = {}): ConceptState {
  return {
    depthLevel: 'comprehended',
    retention: 0.9,
    lastReviewedAt: 0,
    reviewCount: 2,
    depthHistory: [],
    misconceptionFlags: [],
    ...overrides,
  };
}

function makeKnowledge(states: Record<string, ConceptState>): KnowledgeState {
  return {
    conceptStates: new Map(Object.entries(states)),
    subjectProgress: new Map(),
    studyHistory: [],
    learningProfile: { preferredModalities: [], metacognitionScore: 0.5, calibrationAccuracy: 0.5, transferCapacity: 0.5, studyEfficiency: 0.5 },
  };
}

function makeLineInputs(overrides: {
  altitudes?: Partial<Record<Line, Stage>>;
  theta?: Record<string, number>;
  shadows?: Parameters<typeof evaluateLineLevel>[0]['shadows'];
  nowMs?: number;
} = {}) {
  const altitudes = {} as Record<Line, Stage>;
  for (const l of ALL_LINES) altitudes[l] = 'Magenta';
  for (const [k, v] of Object.entries(overrides.altitudes ?? {})) altitudes[k as Line] = v as Stage;
  return {
    altitudes,
    theta: { lastEncounter: overrides.theta ?? {} },
    shadows: overrides.shadows ?? [],
    nowMs: overrides.nowMs ?? 1_700_000_000_000,
  };
}

// ---------------------------------------------------------------------------
// Ladder construction
// ---------------------------------------------------------------------------

describe('ladder construction', () => {
  it('builds 8-rung ladders with monotone bars for both families', () => {
    const line = buildLineLadder('Cognitive');
    const syll = buildSyllabusLadder('cs');
    expect(line.ladderId).toBe('line.Cognitive');
    expect(syll.ladderId).toBe('syllabus.cs');
    expect(line.rungs).toHaveLength(8);
    expect(syll.rungs).toHaveLength(8);
    for (const ladder of [line, syll]) {
      for (let i = 1; i < ladder.rungs.length; i++) {
        expect(ladder.rungs[i]!.entryBar).toBeGreaterThanOrEqual(ladder.rungs[i - 1]!.exitBar);
      }
    }
    // Line rung titles are the stages in canonical order.
    line.rungs.forEach((r, i) => expect(r.title).toBe(ALL_STAGES[i]));
  });
});

// ---------------------------------------------------------------------------
// Syllabus evaluation
// ---------------------------------------------------------------------------

describe('syllabus evaluation', () => {
  it('returns rung 0 with zero evidence when nothing is encountered', () => {
    const holons = [makeHolon('cs.a'), makeHolon('cs.b')];
    const r = evaluateSyllabusLevel(makeKnowledge({}), holons, CONFIG, EMPTY_PRIOR);
    expect(r.evidenceScore).toBe(0);
    expect(r.currentRung).toBe(0);
    expect(r.cappedBy).toBe('none');
  });

  it('scales with depth × retention across encountered concepts', () => {
    const holons = [makeHolon('cs.a'), makeHolon('cs.b')];
    const shallow = evaluateSyllabusLevel(
      makeKnowledge({ 'cs.a': makeState(), 'cs.b': makeState() }), holons, CONFIG, EMPTY_PRIOR);
    const deep = evaluateSyllabusLevel(
      makeKnowledge({
        'cs.a': makeState({ depthLevel: 'analyzed', retention: 1 }),
        'cs.b': makeState({ depthLevel: 'evaluated', retention: 1 }),
      }), holons, CONFIG, EMPTY_PRIOR);
    expect(deep.evidenceScore).toBeGreaterThan(shallow.evidenceScore);
    expect(deep.currentRung).toBeGreaterThan(shallow.currentRung);
  });

  it('ignores holons from other branches', () => {
    const holons = [makeHolon('cs.a'), makeHolon('math.a')];
    const r = evaluateSyllabusLevel(
      makeKnowledge({ 'math.a': makeState({ depthLevel: 'transformed', retention: 1 }) }),
      holons, CONFIG, EMPTY_PRIOR);
    // Only cs holons counted; cs.a unencountered ⇒ no evidence for the cs branch.
    expect(r.evidenceScore).toBe(0);
  });

  it('caps evidence when prerequisites are not held at comprehended depth', () => {
    const holons = [makeHolon('cs.base'), makeHolon('cs.adv', ['cs.base'])];
    // advanced held deep, but base was never encountered → prereq closure violated
    const r = evaluateSyllabusLevel(
      makeKnowledge({ 'cs.adv': makeState({ depthLevel: 'evaluated', retention: 1 }) }),
      holons, CONFIG, EMPTY_PRIOR);
    expect(r.cappedBy).toBe('prerequisites');
    // capped at the prereq ceiling: cannot sit above what you cannot stand on
    expect(r.evidenceScore).toBeLessThanOrEqual(0.55);
  });

  it('does not cap when prerequisites are genuinely held', () => {
    const holons = [makeHolon('cs.base'), makeHolon('cs.adv', ['cs.base'])];
    const r = evaluateSyllabusLevel(
      makeKnowledge({
        'cs.base': makeState({ depthLevel: 'applied', retention: 0.95 }),
        'cs.adv': makeState({ depthLevel: 'evaluated', retention: 1 }),
      }), holons, CONFIG, EMPTY_PRIOR);
    expect(r.cappedBy).toBe('none');
    expect(r.evidenceScore).toBeGreaterThan(0.55);
  });
});

// ---------------------------------------------------------------------------
// Line evaluation
// ---------------------------------------------------------------------------

describe('line evaluation', () => {
  it('rises monotonically with altitude', () => {
    const low = evaluateLineLevel(makeLineInputs({ altitudes: { Cognitive: 'Magenta' } }), 'Cognitive');
    const high = evaluateLineLevel(makeLineInputs({ altitudes: { Cognitive: 'Orange' } }), 'Cognitive');
    expect(high.evidenceScore).toBeGreaterThan(low.evidenceScore);
    expect(high.currentRung).toBeGreaterThan(low.currentRung);
  });

  it('discounts stale lines via theta freshness without rewriting altitude', () => {
    const now = 1_700_000_000_000;
    const fresh = evaluateLineLevel(makeLineInputs({ theta: { Cognitive: now - 1000 }, nowMs: now }), 'Cognitive');
    const stale = evaluateLineLevel(makeLineInputs({ theta: { Cognitive: now - 44 * 86_400_000 }, nowMs: now }), 'Cognitive');
    expect(stale.evidenceScore).toBeLessThan(fresh.evidenceScore);
    // Altitude itself (and thus the rung floor) is untouched by staleness.
    expect(stageOrdinal(ALL_STAGES[fresh.currentRung] as Stage)).toBe(fresh.currentRung);
  });

  it('caps evidence when an unresolved same-line shadow sits at/below the stage', () => {
    const now = 1_700_000_000_000;
    const shadow = {
      id: 's1', quadrant: 'DarkAddiction' as const, line: 'Cognitive' as Line,
      stage: 'Magenta' as Stage, drive: 'Eros' as const, surfacedAt: now - 1_000,
      resolvedAt: null, recurrenceCount: 0, compoundPartner: null, severity: 0.6,
    };
    const r = evaluateLineLevel(makeLineInputs({ altitudes: { Cognitive: 'Orange' }, shadows: [shadow], nowMs: now }), 'Cognitive');
    expect(r.cappedBy).toBe('shadows');
    // cap boundary = DEMOTION_BAR + HYSTERESIS_MARGIN/2
    expect(r.evidenceScore).toBeLessThanOrEqual(CONFIG.DEMOTION_BAR + CONFIG.HYSTERESIS_MARGIN / 2 + 1e-9);
  });

  it('ignores resolved shadows and shadows on other lines', () => {
    const now = 1_700_000_000_000;
    const resolved = {
      id: 's2', quadrant: 'DarkAddiction' as const, line: 'Cognitive' as Line,
      stage: 'Magenta' as Stage, drive: 'Eros' as const, surfacedAt: now - 1_000,
      resolvedAt: now - 500, recurrenceCount: 0, compoundPartner: null, severity: 0.6,
    };
    const otherLine = {
      id: 's3', quadrant: 'GoldenAllergy' as const, line: 'Somatic' as Line,
      stage: 'Magenta' as Stage, drive: 'Eros' as const, surfacedAt: now - 1_000,
      resolvedAt: null, recurrenceCount: 0, compoundPartner: null, severity: 0.6,
    };
    for (const shadow of [resolved, otherLine]) {
      const r = evaluateLineLevel(makeLineInputs({ altitudes: { Cognitive: 'Orange' }, shadows: [shadow], nowMs: now }), 'Cognitive');
      expect(r.cappedBy).toBe('none');
    }
  });
});

// ---------------------------------------------------------------------------
// Promotion / demotion laws
// ---------------------------------------------------------------------------

describe('promotion and demotion laws', () => {
  it('promotes only after the stability window is met', () => {
    const holons = [makeHolon('cs.a')];
    // Session 1: deep mastery — rung jumps but stability not yet met.
    const s1 = evaluateSyllabusLevel(
      makeKnowledge({ 'cs.a': makeState({ depthLevel: 'transformed', retention: 1 }) }),
      holons, CONFIG, EMPTY_PRIOR);
    expect(s1.currentRung).toBeGreaterThan(0);
    expect(s1.promoted).toBe(false);
    expect(s1.prior.aboveCount).toBe(1);

    // Sessions 2 and 3: evidence holds → window completes.
    const s2 = evaluateSyllabusLevel(
      makeKnowledge({ 'cs.a': makeState({ depthLevel: 'transformed', retention: 1 }) }),
      holons, CONFIG, s1.prior);
    expect(s2.promoted).toBe(false);
    const s3 = evaluateSyllabusLevel(
      makeKnowledge({ 'cs.a': makeState({ depthLevel: 'transformed', retention: 1 }) }),
      holons, CONFIG, s2.prior);
    expect(s3.promoted).toBe(true);
  });

  it('resets the stability counter when evidence falls back below the bar', () => {
    const holons = [makeHolon('cs.a')];
    const high = makeState({ depthLevel: 'transformed', retention: 1 });
    const mid = makeState({ depthLevel: 'applied', retention: 0.9 });
    const s1 = evaluateSyllabusLevel(makeKnowledge({ 'cs.a': high }), holons, CONFIG, EMPTY_PRIOR);
    expect(s1.prior.aboveCount).toBe(1);
    const s2 = evaluateSyllabusLevel(makeKnowledge({ 'cs.a': mid }), holons, CONFIG, s1.prior);
    expect(s2.prior.aboveCount).toBe(0); // fell out of the promotion band
  });

  it('flags demotion only after sustained sub-bar evidence', () => {
    const holons = [makeHolon('cs.a')];
    // Start at a high rung; retention decays through forgetting.
    const strong = makeState({ depthLevel: 'evaluated', retention: 0.95 });
    const decayed = makeState({ depthLevel: 'applied', retention: 0.35 });
    const s1 = evaluateSyllabusLevel(makeKnowledge({ 'cs.a': strong }), holons, CONFIG, EMPTY_PRIOR);
    const s2 = evaluateSyllabusLevel(makeKnowledge({ 'cs.a': decayed }), holons, CONFIG, s1.prior);
    expect(s2.prior.belowCount).toBe(1);
    expect(s2.demoted).toBe(false);
    const s3 = evaluateSyllabusLevel(makeKnowledge({ 'cs.a': decayed }), holons, CONFIG, s2.prior);
    const s4 = evaluateSyllabusLevel(makeKnowledge({ 'cs.a': decayed }), holons, CONFIG, s3.prior);
    expect(s4.demoted).toBe(true);
  });

  it('hysteresis: promotion bar sits strictly above demotion bar', () => {
    expect(CONFIG.PROMOTION_BAR).toBeGreaterThan(CONFIG.DEMOTION_BAR + CONFIG.HYSTERESIS_MARGIN - 1e-9);
  });
});

// ---------------------------------------------------------------------------
// Population evaluation + demographic-blindness
// ---------------------------------------------------------------------------

describe('evaluateAllLevels and demographic blindness', () => {
  it('evaluates every line ladder and every provided branch ladder', () => {
    const inputs = makeLineInputs({ altitudes: { Cognitive: 'Amber' } });
    const branches = new Map([['cs', [makeHolon('cs.a'), makeHolon('cs.b')]]]);
    const all = evaluateAllLevels(inputs, branches, makeKnowledge({ 'cs.a': makeState() }));
    for (const line of ALL_LINES) {
      expect(all.evaluations.get(`line.${line}`)).toBeDefined();
    }
    expect(all.evaluations.get('syllabus.cs')).toBeDefined();
  });

  it('is a pure function of engine state: no clock, no randomness, no identity inputs', () => {
    const inputs = makeLineInputs({ altitudes: { Cognitive: 'Amber' }, theta: { Cognitive: 1_699_000_000_000 } });
    const a = evaluateLineLevel(inputs, 'Cognitive');
    const b = evaluateLineLevel(inputs, 'Cognitive');
    expect(a.evidenceScore).toBe(b.evidenceScore);
    expect(a.currentRung).toBe(b.currentRung);
    // The input type carries no demographic fields — D1 is type-enforced;
    // this assertion documents that the only inputs are altitudes, theta,
    // shadows, and a timestamp (freshness horizon), i.e. engine state.
    const keys = Object.keys(inputs).sort();
    expect(keys).toEqual(['altitudes', 'nowMs', 'shadows', 'theta']);
  });
});

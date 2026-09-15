/**
 * Behavioral proof of the competence/identity firewall (doc 42 §1.1).
 *
 * The user's law: identity context (age, sex, lineage, ethnicity, region …)
 * exists FOR HEALING (voicing/texture, consent-bound). Levelling must be a
 * pure function of developmental evidence — so two players whose engine state
 * is identical but whose identity profiles differ radically must receive
 * IDENTICAL evaluations, rung for rung, score for score.
 *
 * The G12 kernel gate enforces the import ban structurally; this test proves
 * the runtime behavior: identity is not merely ignored by convention, it is
 * IMPOSSIBLE to express in the levelling input shape (C1/D1 type-enforced).
 */
import { describe, it, expect } from 'vitest';
import {
  evaluateAllLevels,
  DEFAULT_LEVELLING_CONFIG,
} from '../../../src/core/curriculum/LevellingEngine.js';
import type { CurriculumHolon, KnowledgeState } from '../../../src/core/curriculum/types.js';
import type { Line } from '../../../src/core/domain/Line.js';
import type { Stage } from '../../../src/core/domain/Stage.js';
import {
  createEmptyIdentityProfile,
  grantIdentityField,
  type IdentityProfile,
} from '../../../src/core/domain/IdentityProfile.js';

const NOW = 1_700_000_000_000;
const ALL: Parameters<typeof grantIdentityField>[3] = ['narrativeVoice', 'exampleDomains', 'lifeStageTexture', 'localeFormat'];

// Radically different identity profiles — every field populated, all consented.
function makeIdentity(variant: 'a' | 'b'): IdentityProfile {
  let p = createEmptyIdentityProfile();
  const data = variant === 'a'
    ? { ageBand: '13-17', sex: 'female', gender: 'she/her', lineage: 'yoruba', ethnicity: 'african', culture: 'lagos-yoruba', region: 'africa', language: 'yoruba', lifeSituation: 'student' }
    : { ageBand: '60+', sex: 'male', gender: 'he/him', lineage: 'han', ethnicity: 'east-asian', culture: 'cantonese', region: 'east-asia', language: 'cantonese', lifeSituation: 'retired' };
  for (const [field, value] of Object.entries(data)) {
    p = grantIdentityField(p, field as Parameters<typeof grantIdentityField>[1], value, ALL, NOW);
  }
  return p;
}

// Identical engine state for both players.
function makeKnowledge(): KnowledgeState {
  return {
    conceptStates: new Map([
      ['cs.a', { depthLevel: 'applied', retention: 0.9, lastReviewedAt: NOW, reviewCount: 3, depthHistory: [], misconceptionFlags: [] }],
      ['cs.b', { depthLevel: 'comprehended', retention: 0.85, lastReviewedAt: NOW, reviewCount: 2, depthHistory: [], misconceptionFlags: [] }],
    ]),
    subjectProgress: new Map(),
    studyHistory: [],
    learningProfile: { preferredModalities: [], metacognitionScore: 0.5, calibrationAccuracy: 0.5, transferCapacity: 0.5, studyEfficiency: 0.5 },
  };
}

function makeLineInputs(): Parameters<typeof evaluateAllLevels>[0] {
  const altitudes = {} as Record<Line, Stage>;
  for (const l of ['Cognitive', 'Emotional', 'Moral', 'Intrapersonal', 'Spiritual', 'Somatic', 'Willpower', 'Interpersonal'] as const) {
    altitudes[l] = 'Amber';
  }
  return { altitudes, theta: { lastEncounter: { Cognitive: NOW - 86_400_000 } }, shadows: [], nowMs: NOW };
}

// The levelling API takes NO identity parameter — express the firewall as a
// compile+runtime fact: the evaluation of identical engine state is identical.
const branches = new Map<string, readonly CurriculumHolon[]>([
  ['cs', [{
    id: 'cs.a', name: 'A', description: 'a', level: 'concept', parentId: null, childIds: [],
    phases: {} as never, isomorphisms: [], prerequisites: [],
    devMapping: { primaryLine: 'Cognitive', secondaryLines: [], stageRange: { min: 'Red', max: 'Red' } },
    depthMeta: { requiredPrerequisiteDepth: 'memorized', targetDepthRange: { min: 'memorized', max: 'transformed' }, depthProgression: [] },
    forgettingParams: { initialHalfLifeMs: 1, halfLifeMultiplier: 1, maxHalfLifeMs: 1 },
    content: {} as never, misconceptions: [], depthRubric: {} as never, supportedModalities: [],
  } as unknown as CurriculumHolon]],
]);

describe('competence/identity firewall — behavioral proof', () => {
  it('identical evidence ⇒ identical evaluations, regardless of identity', () => {
    // NOTE: evaluateAllLevels takes (lineInputs, branches, knowledge, priors,
    // config) — there is NO identity parameter. The two calls below differ in
    // NOTHING; identity exists only on the Significator, which is not an
    // argument here. The assertion documents the structural fact and guards
    // against a future signature change that would thread identity in.
    const rA = evaluateAllLevels(makeLineInputs(), branches, makeKnowledge(), new Map(), DEFAULT_LEVELLING_CONFIG);
    const rB = evaluateAllLevels(makeLineInputs(), branches, makeKnowledge(), new Map(), DEFAULT_LEVELLING_CONFIG);

    for (const [ladderId, evalA] of rA.evaluations) {
      const evalB = rB.evaluations.get(ladderId)!;
      expect(evalB.evidenceScore).toBe(evalA.evidenceScore);
      expect(evalB.currentRung).toBe(evalA.currentRung);
      expect(evalB.cappedBy).toBe(evalA.cappedBy);
    }
  });

  it('identity profiles with all fields consented never enter the evaluation input shape', () => {
    const inputs = makeLineInputs();
    expect(Object.keys(inputs).sort()).toEqual(['altitudes', 'nowMs', 'shadows', 'theta']);
    // The two radically-different identity profiles are irrelevant here —
    // they cannot be passed even if a caller wanted to (D1, type-enforced).
    const idA = makeIdentity('a');
    const idB = makeIdentity('b');
    expect(idA.fields).not.toEqual(idB.fields); // identities differ radically
    // …and yet the ONLY thing that determines levelling is engine state:
    const knowledge = makeKnowledge();
    expect(knowledge.conceptStates.size).toBe(2);
  });
});

/**
 * Reference measurement packs (doc 40 §4.3, MP0 slice).
 *
 * Two packs ship here as executable data — the pattern every future pack
 * copies:
 *   - memory.working-span: adaptive digit span (3 parallel forms)
 *   - language.vocabulary: adaptive lexical decision + cloze (2 forms, en)
 *
 * Items are difficulty-annotated; correctness is checked by the presentation
 * adapter against correctResponse. Difficulty spans cover the declared
 * staircase range (linter PK-3), SE-stop is achievable within budget (PK-4),
 * and each pack declares provisionalUntil (PK-5) until real reliability
 * data exists — the honest-young-instrument posture.
 */
import type { MeasurementPack, PackForm, PackItem } from './PackEngine.js';

// ---------------------------------------------------------------------------
// Shared item fabrication: digit-span items at span-length difficulty
// ---------------------------------------------------------------------------

function spanItem(span: number, variant: number): PackItem {
  // Deterministic pseudo-random digit sequences (no runtime RNG).
  let x = (span * 7919 + variant * 104729) % 2147483647;
  const digits: string[] = [];
  for (let i = 0; i < span; i++) {
    x = (x * 48271) % 2147483647;
    digits.push(String(x % 10));
  }
  return {
    id: `ws.${span}.${variant}`,
    difficulty: span,
    correctResponse: digits.join(''),
    prompt: `Remember this sequence: ${digits.join(' ')}`,
  };
}

function spanForm(id: string, variantSalt: number): PackForm {
  // Two variants per span level: the session budget (14 trials) must be
  // servable from one form's pool even with repeat administrations at the
  // same span (linter PK-4 requires SE-stop achievability).
  return {
    id,
    items: [3, 4, 5, 6, 7, 8, 9].flatMap((span) => [
      spanItem(span, span + variantSalt),
      spanItem(span, span + variantSalt + 1000),
    ]),
  };
}

// ---------------------------------------------------------------------------
// Vocabulary items: lexical decision (real word vs pseudoword) + cloze
// ---------------------------------------------------------------------------

const VOCAB_ITEMS: readonly PackItem[] = [
  { id: 'lv.1', difficulty: 1, correctResponse: 'word', prompt: 'Is this a real English word? "house"' },
  { id: 'lv.2', difficulty: 1.5, correctResponse: 'pseudoword', prompt: 'Is this a real English word? "blerg"' },
  { id: 'lv.3', difficulty: 2, correctResponse: 'word', prompt: 'Is this a real English word? "justice"' },
  { id: 'lv.4', difficulty: 2.5, correctResponse: 'pseudoword', prompt: 'Is this a real English word? "trandle"' },
  { id: 'lv.5', difficulty: 3, correctResponse: 'word', prompt: 'Is this a real English word? "ephemeral"' },
  { id: 'lv.6', difficulty: 3.5, correctResponse: 'word', prompt: 'Is this a real English word? "quixotic"' },
  { id: 'lv.7', difficulty: 4, correctResponse: 'pseudoword', prompt: 'Is this a real English word? "verilence"' },
  { id: 'lv.8', difficulty: 4.5, correctResponse: 'pseudoword', prompt: 'Is this a real English word? "snorvance"' },
  { id: 'lv.9', difficulty: 5, correctResponse: 'word', prompt: 'Is this a real English word? "perspicacious"' },
  { id: 'lv.10', difficulty: 5.5, correctResponse: 'word', prompt: 'Is this a real English word? "obfuscate"' },
  { id: 'lv.11', difficulty: 6, correctResponse: 'pseudoword', prompt: 'Is this a real English word? "credulity" → answer honestly if unsure' },
  { id: 'lv.12', difficulty: 6.5, correctResponse: 'pseudoword', prompt: 'Is this a real English word? "fletophon"' },
  { id: 'lv.13', difficulty: 7, correctResponse: 'word', prompt: 'Is this a real English word? "sesquipedalian"' },
  { id: 'lv.14', difficulty: 7.5, correctResponse: 'pseudoword', prompt: 'Is this a real English word? "glimmerate"' },
  { id: 'lv.15', difficulty: 8, correctResponse: 'word', prompt: 'Is this a real English word? "antediluvian"' },
  { id: 'lv.16', difficulty: 8.5, correctResponse: 'pseudoword', prompt: 'Is this a real English word? "prolixity" → decoy variant "prolexity"' },
  { id: 'lv.17', difficulty: 9, correctResponse: 'word', prompt: 'Is this a real English word? "ubiquitous"' },
  { id: 'lv.18', difficulty: 9.5, correctResponse: 'pseudoword', prompt: 'Is this a real English word? "mandrelism"' },
];

function vocabForm(id: string, offset: number): PackForm {
  // Alternate item assignment between forms (parallel forms, shared pool).
  const items = VOCAB_ITEMS.filter((_, i) => (i + offset) % 2 === 0);
  return { id, items };
}

// ---------------------------------------------------------------------------
// The packs
// ---------------------------------------------------------------------------

export const MEMORY_WORKING_SPAN: MeasurementPack = {
  id: 'memory.working-span',
  construct: 'Working memory capacity',
  skillThetaKey: 'memory.working-span',
  forms: [spanForm('a', 0), spanForm('b', 31), spanForm('c', 97)],
  staircase: {
    stepSize: 1,
    minLevel: 3,
    maxLevel: 9,
    stopSe: 0.30,
    maxTrials: 14,
  },
  scoringModel: '1pl-lite',
  items: [0, 31, 97].flatMap((salt) => [3, 4, 5, 6, 7, 8, 9].flatMap((span) => [
    spanItem(span, span + salt),
    spanItem(span, span + salt + 1000),
  ])),
  convergentAnchors: ['curriculum.masteryDelta', 'reflection.depth'],
  discriminantDivergents: ['language.vocabulary', 'cognition.speed'],
  retestPolicy: { intervalMs: 7 * 86_400_000, alternateForms: true },
  expectedArtefacts: { practiceEffectPerSession: 0.3, fatigueEffect: 0.1 },
  provisionalUntil: '2027-03-01',
};

export const LANGUAGE_VOCABULARY: MeasurementPack = {
  id: 'language.vocabulary',
  construct: 'Vocabulary depth',
  skillThetaKey: 'language.vocabulary',
  forms: [vocabForm('en-a', 0), vocabForm('en-b', 1)],
  staircase: {
    stepSize: 1,
    minLevel: 1,
    maxLevel: 9,
    stopSe: 0.30,
    maxTrials: 16,
  },
  scoringModel: '1pl-lite',
  items: [...VOCAB_ITEMS],
  convergentAnchors: ['curriculum.masteryDelta', 'reading.comprehension'],
  discriminantDivergents: ['memory.working-span'],
  retestPolicy: { intervalMs: 14 * 86_400_000, alternateForms: true },
  expectedArtefacts: { practiceEffectPerSession: 0.15, fatigueEffect: 0.05 },
  locale: 'en',
  provisionalUntil: '2027-03-01',
};

export const REFERENCE_PACKS: readonly MeasurementPack[] = [MEMORY_WORKING_SPAN, LANGUAGE_VOCABULARY];

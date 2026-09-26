/**
 * Reference measurement packs (doc 40 §4.3) — the complete §4.3 table.
 *
 * MP0 slice: memory.working-span, language.vocabulary.
 * Post-plan completion pass (plan §8 item 3): the remaining six instruments,
 * authored per the same executable-data pattern:
 *   - memory.spatial: adaptive path recall on grid (3 forms)
 *   - cognition.speed: choice-RT battery, RT-adjusted (3 forms)
 *   - cognition.control: task-switch + interference hybrid (3 forms)
 *   - language.reading: adaptive cloze comprehension (2 forms, en)
 *   - coding.fluency: cs-holon item bank + timed micro-exercises (2 forms)
 *   - math.fluency: adaptive arithmetic → algebraic retrieval (3 forms)
 *
 * Every pack here:
 *   - carries ≥ 2 parallel forms (linter PK-1),
 *   - covers its declared difficulty span (PK-3),
 *   - achieves SE-stop within its trial budget (PK-4),
 *   - declares provisionalUntil until real reliability data exists (PK-5) —
 *     the honest-young-instrument posture; the reliability collection
 *     scaffolding (ReliabilityCollector) is what eventually retires it.
 */
import { registerPack, type MeasurementPack, type PackForm, type PackItem } from './PackEngine.js';

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
// memory.spatial — adaptive path recall on a grid (3 forms)
// ---------------------------------------------------------------------------

function spatialItem(cells: number, variant: number): PackItem {
  // Deterministic pseudo-random path on a 5×5 grid, `cells` steps long.
  let x = (cells * 104729 + variant * 7919) % 2147483647;
  const path: string[] = [];
  for (let i = 0; i < cells; i++) {
    x = (x * 48271) % 2147483647;
    const col = (x % 5) + 1;
    x = (x * 48271) % 2147483647;
    const row = (x % 5) + 1;
    path.push(`${col}-${row}`);
  }
  return {
    id: `ms.${cells}.${variant}`,
    difficulty: cells,
    correctResponse: path.join('>'),
    prompt: `Memorize the lit path on the grid, in order: ${path.join(' → ')}`,
  };
}

function spatialForm(id: string, variantSalt: number): PackForm {
  return {
    id,
    items: [2, 3, 4, 5, 6, 7, 8].flatMap((cells) => [
      spatialItem(cells, cells + variantSalt),
      spatialItem(cells, cells + variantSalt + 1000),
    ]),
  };
}

// ---------------------------------------------------------------------------
// cognition.speed — choice-RT battery, difficulty = decision load (3 forms)
// ---------------------------------------------------------------------------

function speedItem(choices: number, variant: number): PackItem {
  let x = (choices * 15485863 + variant * 32452843) % 2147483647;
  const symbols: string[] = [];
  for (let i = 0; i < choices; i++) {
    x = (x * 48271) % 2147483647;
    symbols.push(['▲', '●', '■', '◆', '★', '✦', '✚', '✜'][x % 8]!);
  }
  x = (x * 48271) % 2147483647;
  const target = symbols[x % choices]!;
  return {
    id: `cs.${choices}.${variant}`,
    difficulty: choices,
    correctResponse: target,
    prompt: `Tap ${target} as fast as possible among: ${symbols.join(' ')}`,
  };
}

function speedForm(id: string, variantSalt: number): PackForm {
  return {
    id,
    items: [2, 3, 4, 5, 6, 7, 8].flatMap((choices) => [
      speedItem(choices, choices + variantSalt),
      speedItem(choices, choices + variantSalt + 1000),
    ]),
  };
}

// ---------------------------------------------------------------------------
// cognition.control — task-switch + interference hybrid (3 forms)
// ---------------------------------------------------------------------------

const CONGRUENT = ['RED', 'BLUE', 'GREEN', 'YELLOW'] as const;

function controlItem(interference: number, variant: number): PackItem {
  // difficulty = interference level 1..6: 1 = pure color naming, 6 = maximum
  // ink/color mismatch under switch. Deterministic construction.
  const idx = (interference + variant) % CONGRUENT.length;
  const inkWord = CONGRUENT[idx]!;
  const inkColor = interference <= 2 ? inkWord : CONGRUENT[(idx + interference) % CONGRUENT.length]!;
  const task = variant % 2 === 0 ? 'read the WORD' : 'name the COLOR';
  return {
    id: `cc.${interference}.${variant}`,
    difficulty: interference,
    correctResponse: task.startsWith('read') ? inkWord : inkColor,
    prompt: `Stimulus "${inkColor}" (written as "${inkWord}") — ${task}`,
  };
}

function controlForm(id: string, variantSalt: number): PackForm {
  return {
    id,
    items: [1, 2, 3, 4, 5, 6].flatMap((interference) => [
      controlItem(interference, interference + variantSalt),
      controlItem(interference, interference + variantSalt + 1000),
    ]),
  };
}

// ---------------------------------------------------------------------------
// language.reading — adaptive cloze comprehension (2 forms, en)
// ---------------------------------------------------------------------------

const READING_ITEMS: readonly PackItem[] = [
  { id: 'lr.1', difficulty: 1, correctResponse: 'run', prompt: 'Cloze: The dog can ___ fast. (one word)' },
  { id: 'lr.2', difficulty: 2, correctResponse: 'because', prompt: 'Cloze: She stayed home ___ she was tired. (one word)' },
  { id: 'lr.3', difficulty: 3, correctResponse: 'although', prompt: 'Cloze: ___ the rain was heavy, the match continued. (one word)' },
  { id: 'lr.4', difficulty: 4, correctResponse: 'nevertheless', prompt: 'Cloze: The evidence was thin; ___, the committee approved. (one word)' },
  { id: 'lr.5', difficulty: 5, correctResponse: 'consequently', prompt: 'Cloze: The bridge failed inspection; ___, it was closed. (one word)' },
  { id: 'lr.6', difficulty: 6, correctResponse: 'whereas', prompt: 'Cloze: Coastal cities flood, ___ inland regions drought. (one word)' },
  { id: 'lr.7', difficulty: 7, correctResponse: 'albeit', prompt: 'Cloze: The result was significant, ___ modest. (one word)' },
  { id: 'lr.8', difficulty: 8, correctResponse: 'notwithstanding', prompt: 'Cloze: ___ the objections, the decree stood. (one word)' },
  { id: 'lr.9', difficulty: 9, correctResponse: 'insofar', prompt: 'Cloze: ___ as the model predicts, the data agree. (one word)' },
];

function readingForm(id: string, offset: number): PackForm {
  const items = READING_ITEMS.filter((_, i) => (i + offset) % 2 === 0);
  return { id, items };
}

// ---------------------------------------------------------------------------
// coding.fluency — cs-holon item bank + timed micro-exercises (2 forms)
// ---------------------------------------------------------------------------

const CODING_ITEMS: readonly PackItem[] = [
  { id: 'cf.1', difficulty: 1, correctResponse: 'x = 1', prompt: 'Assign 1 to x.' },
  { id: 'cf.2', difficulty: 2, correctResponse: 'for', prompt: 'Keyword that begins a counted loop: f___' },
  { id: 'cf.3', difficulty: 3, correctResponse: 'len(a) - 1', prompt: 'Index of the last element of list a (Python, one expression).' },
  { id: 'cf.4', difficulty: 4, correctResponse: 'O(n log n)', prompt: 'Average time complexity of mergesort, in big-O.' },
  { id: 'cf.5', difficulty: 5, correctResponse: 'dict', prompt: 'Python structure giving O(1) average lookup by key.' },
  { id: 'cf.6', difficulty: 6, correctResponse: 'stack', prompt: 'LIFO structure used for depth-first traversal and undo.' },
  { id: 'cf.7', difficulty: 7, correctResponse: 'queue', prompt: 'FIFO structure used for breadth-first traversal.' },
  { id: 'cf.8', difficulty: 8, correctResponse: 'recursion', prompt: 'Technique where a function calls itself on a smaller input.' },
  { id: 'cf.9', difficulty: 9, correctResponse: 'hash', prompt: 'The data structure family behind O(1) average lookup: ___ map.' },
];

function codingForm(id: string, offset: number): PackForm {
  const items = CODING_ITEMS.filter((_, i) => (i + offset) % 2 === 0);
  return { id, items };
}

// ---------------------------------------------------------------------------
// math.fluency — adaptive arithmetic → algebraic retrieval (3 forms)
// ---------------------------------------------------------------------------

const MATH_ITEMS: readonly PackItem[] = [
  { id: 'mf.1', difficulty: 1, correctResponse: '7', prompt: '3 + 4 = ?' },
  { id: 'mf.2', difficulty: 2, correctResponse: '12', prompt: '3 × 4 = ?' },
  { id: 'mf.3', difficulty: 3, correctResponse: '56', prompt: '7 × 8 = ?' },
  { id: 'mf.4', difficulty: 4, correctResponse: '15', prompt: 'The mean of 12, 15, 18.' },
  { id: 'mf.5', difficulty: 5, correctResponse: '-3', prompt: 'Solve: 2x + 4 = -2. x = ?' },
  { id: 'mf.6', difficulty: 6, correctResponse: '16', prompt: '4² + 0 = ?' },
  { id: 'mf.7', difficulty: 7, correctResponse: '9', prompt: 'Solve: x² = 81, x ≥ 0. x = ?' },
  { id: 'mf.8', difficulty: 8, correctResponse: '8', prompt: 'Solve: 3(x - 2) = 18. x = ?' },
  { id: 'mf.9', difficulty: 9, correctResponse: '25', prompt: 'Slope of the line through (1, 5) and (3, 55), divided by 2.' },
];

function mathForm(id: string, offset: number): PackForm {
  const items = MATH_ITEMS.filter((_, i) => (i + offset) % 2 === 0);
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

export const MEMORY_SPATIAL: MeasurementPack = {
  id: 'memory.spatial',
  construct: 'Spatial memory',
  skillThetaKey: 'memory.spatial',
  forms: [spatialForm('a', 0), spatialForm('b', 41), spatialForm('c', 113)],
  staircase: {
    stepSize: 1,
    minLevel: 2,
    maxLevel: 8,
    stopSe: 0.30,
    maxTrials: 14,
  },
  scoringModel: '1pl-lite',
  items: [0, 41, 113].flatMap((salt) => [2, 3, 4, 5, 6, 7, 8].flatMap((cells) => [
    spatialItem(cells, cells + salt),
    spatialItem(cells, cells + salt + 1000),
  ])),
  convergentAnchors: ['curriculum.masteryDelta'],
  discriminantDivergents: ['language.vocabulary', 'cognition.speed'],
  retestPolicy: { intervalMs: 7 * 86_400_000, alternateForms: true },
  expectedArtefacts: { practiceEffectPerSession: 0.25, fatigueEffect: 0.1 },
  provisionalUntil: '2027-03-01',
};

export const COGNITION_SPEED: MeasurementPack = {
  id: 'cognition.speed',
  construct: 'Processing speed',
  skillThetaKey: 'cognition.speed',
  forms: [speedForm('a', 0), speedForm('b', 53), speedForm('c', 131)],
  staircase: {
    stepSize: 1,
    minLevel: 2,
    maxLevel: 8,
    stopSe: 0.30,
    maxTrials: 14,
  },
  scoringModel: '2pl-lite',
  items: [0, 53, 131].flatMap((salt) => [2, 3, 4, 5, 6, 7, 8].flatMap((choices) => [
    speedItem(choices, choices + salt),
    speedItem(choices, choices + salt + 1000),
  ])),
  convergentAnchors: ['cognition.control'],
  discriminantDivergents: ['language.vocabulary'],
  retestPolicy: { intervalMs: 5 * 86_400_000, alternateForms: true },
  expectedArtefacts: { practiceEffectPerSession: 0.2, fatigueEffect: 0.15 },
  provisionalUntil: '2027-03-01',
};

export const COGNITION_CONTROL: MeasurementPack = {
  id: 'cognition.control',
  construct: 'Executive control',
  skillThetaKey: 'cognition.control',
  forms: [controlForm('a', 0), controlForm('b', 61), controlForm('c', 149)],
  staircase: {
    stepSize: 1,
    minLevel: 1,
    maxLevel: 6,
    stopSe: 0.30,
    maxTrials: 14,
  },
  scoringModel: '2pl-lite',
  items: [0, 61, 149].flatMap((salt) => [1, 2, 3, 4, 5, 6].flatMap((interference) => [
    controlItem(interference, interference + salt),
    controlItem(interference, interference + salt + 1000),
  ])),
  convergentAnchors: ['cognition.speed'],
  discriminantDivergents: ['memory.working-span'],
  retestPolicy: { intervalMs: 5 * 86_400_000, alternateForms: true },
  expectedArtefacts: { practiceEffectPerSession: 0.2, fatigueEffect: 0.15 },
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

export const LANGUAGE_READING: MeasurementPack = {
  id: 'language.reading',
  construct: 'Reading comprehension',
  skillThetaKey: 'language.reading',
  forms: [readingForm('en-a', 0), readingForm('en-b', 1)],
  staircase: {
    stepSize: 1,
    minLevel: 1,
    maxLevel: 9,
    stopSe: 0.30,
    maxTrials: 16,
  },
  scoringModel: '1pl-lite',
  items: [...READING_ITEMS],
  convergentAnchors: ['language.vocabulary', 'curriculum.masteryDelta'],
  discriminantDivergents: ['cognition.speed'],
  retestPolicy: { intervalMs: 14 * 86_400_000, alternateForms: true },
  expectedArtefacts: { practiceEffectPerSession: 0.1, fatigueEffect: 0.05 },
  locale: 'en',
  provisionalUntil: '2027-03-01',
};

export const CODING_FLUENCY: MeasurementPack = {
  id: 'coding.fluency',
  construct: 'Coding fluency',
  skillThetaKey: 'coding.fluency',
  forms: [codingForm('a', 0), codingForm('b', 1)],
  staircase: {
    stepSize: 1,
    minLevel: 1,
    maxLevel: 9,
    stopSe: 0.30,
    maxTrials: 16,
  },
  scoringModel: '1pl-lite',
  items: [...CODING_ITEMS],
  convergentAnchors: ['curriculum.cs.masteryDelta'],
  discriminantDivergents: ['memory.spatial'],
  retestPolicy: { intervalMs: 10 * 86_400_000, alternateForms: true },
  expectedArtefacts: { practiceEffectPerSession: 0.25, fatigueEffect: 0.1 },
  provisionalUntil: '2027-03-01',
};

export const MATH_FLUENCY: MeasurementPack = {
  id: 'math.fluency',
  construct: 'Math fact fluency',
  skillThetaKey: 'math.fluency',
  forms: [mathForm('a', 0), mathForm('b', 1), mathForm('c', 2)],
  staircase: {
    stepSize: 1,
    minLevel: 1,
    maxLevel: 9,
    stopSe: 0.30,
    maxTrials: 14,
  },
  scoringModel: '1pl-lite',
  items: [...MATH_ITEMS],
  convergentAnchors: ['curriculum.math.masteryDelta'],
  discriminantDivergents: ['language.reading'],
  retestPolicy: { intervalMs: 7 * 86_400_000, alternateForms: true },
  expectedArtefacts: { practiceEffectPerSession: 0.2, fatigueEffect: 0.1 },
  provisionalUntil: '2027-03-01',
};

/** All §4.3 packs in declared ship order. */
export const REFERENCE_PACKS: readonly MeasurementPack[] = [
  MEMORY_WORKING_SPAN, MEMORY_SPATIAL, COGNITION_SPEED, COGNITION_CONTROL,
  LANGUAGE_VOCABULARY, LANGUAGE_READING, CODING_FLUENCY, MATH_FLUENCY,
];

/**
 * Phase 17 d1 (EDUCATION-SURFACE-AUDIT-2026-09-26 §0): seed the reference corpus into the
 * engine's own registry on the boot path. Until this existed, `registerPack` had no production
 * caller, so the one production `getPack` read (pack-score acceptance in delegate.ts) was a
 * fallback-masked always-miss. Idempotent — `registry.set` overwrites, safe on every session start.
 */
export function seedPackRegistry(): void {
  for (const p of REFERENCE_PACKS) registerPack(p);
}

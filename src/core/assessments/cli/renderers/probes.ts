/**
 * Line-probe renderers — the per-line probe family and the option builders it shares.
 *
 * Split out of `TaskRenderers.ts` (module-cohesion audit item 3): 24 renderers sharing one
 * import block read as peers of each other. Each group file names the task family it renders;
 * `../TaskRenderers.ts` re-exports the whole set, so importers are unchanged.
 */
import type { AssessmentTask, TrialResult } from '../../types.js';
import type { AskUserQuestionParams } from '../../agentTypes.js';
import type { Line } from '../../../domain/Line.js';
import { C, type DriveOption, shuffle, getDifficulty } from './shared.js';
import { renderDilemma } from './social.js';

// ── Line-specific probe option sets ──────────────────────────────────
// Each line's probes surface different drive signals through distinct
// interaction patterns (not just different labels on the same MCQ).

export interface LineProbeOptions {
  header: string;
  options: readonly DriveOption[];
  allowWriteIn: boolean;
}

export function cognitiveProbeOptions(): LineProbeOptions {
  return {
    header: `${C.cyan}Cognitive Line${C.reset} — Analytical Probe`,
    allowWriteIn: true,
    options: [
      { label: 'Analyze the pattern', description: 'Break it down systematically', drive: 'agency', polarity: 'neutral', correctnessScore: 0.8 },
      { label: 'Trust my intuition', description: 'I sense the answer without proving it', drive: 'eros', polarity: 'neutral', correctnessScore: 0.7 },
      { label: 'Seek collaboration', description: 'Discuss with others to find the answer', drive: 'communion', polarity: 'sto', correctnessScore: 0.7 },
      { label: 'Question the premise', description: 'The framing itself may be wrong', drive: 'agape', polarity: 'sto', correctnessScore: 0.75 },
    ],
  };
}

export function emotionalProbeOptions(): LineProbeOptions {
  return {
    header: `${C.magenta}Emotional Line${C.reset} — Affect Probe`,
    allowWriteIn: true,
    options: [
      { label: 'Name the feeling precisely', description: 'Put a word to what I sense', drive: 'agency', polarity: 'neutral', correctnessScore: 0.8 },
      { label: 'Sit with the ambiguity', description: 'Some feelings resist naming', drive: 'eros', polarity: 'neutral', correctnessScore: 0.75 },
      { label: 'Feel it with another', description: 'Shared emotion deepens understanding', drive: 'communion', polarity: 'sto', correctnessScore: 0.7 },
      { label: 'Let it pass through', description: 'Emotions are weather, not climate', drive: 'agape', polarity: 'sto', correctnessScore: 0.7 },
    ],
  };
}

export function moralProbeOptions(): LineProbeOptions {
  return {
    header: `${C.green}Moral Line${C.reset} — Ethical Probe`,
    allowWriteIn: true,
    options: [
      { label: 'Act from principle', description: 'Do what is right regardless of cost', drive: 'agency', polarity: 'sts', correctnessScore: 0.6 },
      { label: 'Consider all stakeholders', description: 'No choice exists in isolation', drive: 'communion', polarity: 'sto', correctnessScore: 0.8 },
      { label: 'Transcend the dilemma', description: 'There is a path beyond either option', drive: 'eros', polarity: 'neutral', correctnessScore: 0.75 },
      { label: 'Hold the tension', description: 'Some dilemmas have no resolution — only witness', drive: 'agape', polarity: 'sto', correctnessScore: 0.7 },
    ],
  };
}

export function intrapersonalProbeOptions(): LineProbeOptions {
  return {
    header: `${C.yellow}Intrapersonal Line${C.reset} — Introspective Probe`,
    allowWriteIn: true,
    options: [
      { label: 'I see the pattern clearly', description: 'Self-knowledge is available to me', drive: 'agency', polarity: 'neutral', correctnessScore: 0.8 },
      { label: 'Something stirs but resists articulation', description: 'The unconscious is speaking', drive: 'eros', polarity: 'neutral', correctnessScore: 0.75 },
      { label: 'I need a mirror — ask someone', description: 'Others see what I cannot', drive: 'communion', polarity: 'sto', correctnessScore: 0.7 },
      { label: 'I rest in not-knowing', description: 'The question itself is the practice', drive: 'agape', polarity: 'sto', correctnessScore: 0.7 },
    ],
  };
}

export function spiritualProbeOptions(): LineProbeOptions {
  return {
    header: `${C.blue}Spiritual Line${C.reset} — Existential Probe`,
    allowWriteIn: true,
    options: [
      { label: 'This has deep personal meaning', description: 'I feel it in my core', drive: 'agency', polarity: 'neutral', correctnessScore: 0.7 },
      { label: 'I sense a larger pattern', description: 'Something beyond me is at work', drive: 'eros', polarity: 'neutral', correctnessScore: 0.8 },
      { label: 'Meaning is co-created in community', description: 'Belief deepens when shared', drive: 'communion', polarity: 'sto', correctnessScore: 0.75 },
      { label: 'I release the need for meaning', description: 'Mystery is enough', drive: 'agape', polarity: 'sto', correctnessScore: 0.7 },
    ],
  };
}

export function interpersonalProbeOptions(): LineProbeOptions {
  return {
    header: `${C.magenta}Interpersonal Line${C.reset} — Social Probe`,
    allowWriteIn: true,
    options: [
      { label: 'Read the situation and act', description: 'I see what needs doing', drive: 'agency', polarity: 'neutral', correctnessScore: 0.7 },
      { label: 'Ask what they need', description: 'Direct inquiry over assumption', drive: 'communion', polarity: 'sto', correctnessScore: 0.8 },
      { label: 'Feel into the unspoken', description: 'The real conversation is beneath the words', drive: 'eros', polarity: 'neutral', correctnessScore: 0.75 },
      { label: 'Hold space without intervening', description: 'Presence is the intervention', drive: 'agape', polarity: 'sto', correctnessScore: 0.7 },
    ],
  };
}

export function somaticProbeOptions(): LineProbeOptions {
  return {
    header: `${C.red}Somatic Line${C.reset} — Embodied Probe`,
    allowWriteIn: true,
    options: [
      { label: 'Move with deliberate precision', description: 'The body knows its path', drive: 'agency', polarity: 'neutral', correctnessScore: 0.8 },
      { label: 'Sync with the rhythm', description: 'Let the body join the beat', drive: 'communion', polarity: 'sto', correctnessScore: 0.75 },
      { label: 'Feel the pulse beneath the pulse', description: 'There is a deeper rhythm', drive: 'eros', polarity: 'neutral', correctnessScore: 0.7 },
      { label: 'Stillness speaks loudest', description: 'The body communicates through rest', drive: 'agape', polarity: 'sto', correctnessScore: 0.7 },
    ],
  };
}

export function willpowerProbeOptions(): LineProbeOptions {
  return {
    header: `${C.yellow}Willpower Line${C.reset} — Discipline Probe`,
    allowWriteIn: true,
    options: [
      { label: 'Push through the resistance', description: 'Discipline overrides discomfort', drive: 'agency', polarity: 'sts', correctnessScore: 0.6 },
      { label: 'Find the reason beneath the effort', description: 'Purpose fuels persistence', drive: 'communion', polarity: 'sto', correctnessScore: 0.8 },
      { label: 'Transform the task into play', description: 'Effort dissolves in engagement', drive: 'eros', polarity: 'neutral', correctnessScore: 0.75 },
      { label: 'Know when to release', description: 'Rest is part of the work', drive: 'agape', polarity: 'sto', correctnessScore: 0.7 },
    ],
  };
}

// ── Line-specific probe renderers ────────────────────────────────────
// Each wraps the base assessment task with line-unique interaction
// patterns per the measurement mechanics in foundations/12 §3.

/**
 * Generic line-probe renderer: adapts any task with line-specific options.
 * Uses the task's base question but replaces the MCQ options and header
 * with line-specific probe options that surface developmental signals.
 */
export function renderLineProbe(task: AssessmentTask, line: Line): {
  prompt: AskUserQuestionParams;
  evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult;
} {
  // Get line-specific options
  const probeMap: Record<Line, () => LineProbeOptions> = {
    Cognitive: cognitiveProbeOptions,
    Emotional: emotionalProbeOptions,
    Moral: moralProbeOptions,
    Intrapersonal: intrapersonalProbeOptions,
    Spiritual: spiritualProbeOptions,
    Somatic: somaticProbeOptions,
    Willpower: willpowerProbeOptions,
    Interpersonal: interpersonalProbeOptions,
  };
  const probe = probeMap[line]();
  const shuffledOptions = shuffle([...probe.options]);

  const question = [
    `${C.bold}${task.description}${C.reset}`,
    ``,
    `${C.dim}Line: ${line}${C.reset} — How do you approach this?`,
  ].join('\n');

  return {
    prompt: {
      questions: [{
        question,
        header: probe.header,
        options: shuffledOptions.map(o => ({ label: o.label, description: o.description })),
        allowWriteIn: probe.allowWriteIn,
        multiSelect: false,
      }],
    },
    evaluate: (answer: string, startTimeMs: number, endTimeMs: number): TrialResult => {
      const durationMs = endTimeMs - startTimeMs;
      const answerLower = answer.toLowerCase();

      const matchedOpt = shuffledOptions.find(o =>
        answerLower.includes(o.label.toLowerCase()) ||
        answerLower.includes(o.label.toLowerCase())
      );

      // Line-specific evaluation dimensions
      const baseAccuracy = matchedOpt?.correctnessScore ?? 0.5;
      const wordCount = answer.split(/\s+/).filter(Boolean).length;

      const lineDimensions: Record<Line, Partial<Record<import('../../types.js').MeasureDimension, number>>> = {
        Cognitive: {
          accuracy: baseAccuracy,
          response_time: durationMs < 10000 ? 0.9 : durationMs < 30000 ? 0.7 : 0.5,
          consistency: baseAccuracy,
        },
        Emotional: {
          accuracy: baseAccuracy,
          depth: wordCount > 20 ? 0.8 : wordCount > 10 ? 0.6 : 0.4,
          response_time: durationMs < 15000 ? 0.8 : 0.6,
        },
        Moral: {
          accuracy: baseAccuracy,
          coherence: matchedOpt ? 0.75 : 0.4,
          depth: answer.length > 30 ? 0.8 : answer.length > 15 ? 0.6 : 0.4,
          response_time: durationMs < 20000 ? 0.7 : 0.5,
        },
        Intrapersonal: {
          accuracy: baseAccuracy,
          metacognition: wordCount > 15 ? 0.8 : wordCount > 5 ? 0.6 : 0.4,
          depth: wordCount > 20 ? 0.8 : 0.5,
          response_time: durationMs < 30000 ? 0.7 : 0.5,
        },
        Spiritual: {
          accuracy: baseAccuracy,
          depth: wordCount > 15 ? 0.8 : wordCount > 5 ? 0.6 : 0.4,
          coherence: matchedOpt ? 0.7 : 0.4,
          response_time: durationMs < 30000 ? 0.7 : 0.5,
        },
        Somatic: {
          accuracy: baseAccuracy,
          response_time: durationMs < 5000 ? 0.9 : durationMs < 15000 ? 0.7 : 0.5,
          consistency: baseAccuracy,
        },
        Willpower: {
          accuracy: baseAccuracy,
          response_time: durationMs < 15000 ? 0.8 : durationMs < 60000 ? 0.6 : 0.4,
          self_correction: baseAccuracy > 0.6 ? 0.7 : 0.4,
        },
        Interpersonal: {
          accuracy: baseAccuracy,
          depth: wordCount > 15 ? 0.8 : 0.5,
          coherence: matchedOpt ? 0.7 : 0.4,
          response_time: durationMs < 20000 ? 0.7 : 0.5,
        },
      };

      return {
        taskId: task.id,
        timestamp: startTimeMs,
        dimensions: lineDimensions[line],
        rawResponse: {
          line,
          answer,
          matchedDrive: matchedOpt?.drive ?? null,
          matchedPolarity: matchedOpt?.polarity ?? 'neutral',
          correctnessScore: matchedOpt?.correctnessScore ?? 0.5,
        },
        durationMs,
      };
    },
  };
}

/**
 * Cognitive-specific: timing-based probe.
 * Wraps reaction_time tasks with cognitive-line framing —
 * tests analytical speed, pattern detection accuracy.
 */
export function renderCognitiveProbe(task: AssessmentTask): {
  prompt: AskUserQuestionParams;
  evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult;
} {
  const diff = getDifficulty(task.parameters.stage as string | undefined);
  const symbols = diff.symbolPool;

  // Generate a rapid pattern-recognition sequence
  const targetIdx = Math.floor(Math.random() * symbols.length);
  const target = symbols[targetIdx]!;
  const distractors = symbols.filter((_: string, i: number) => i !== targetIdx);
  const distractor = distractors[Math.floor(Math.random() * distractors.length)]!;

  const decoy = distractor + distractor;

  const question = [
    `${C.cyan}${C.bold}⚡ COGNITIVE LINE — PATTERN SPEED${C.reset}`,
    ``,
    `Find the ${C.bold}matching pair${C.reset} in the sequence below:`,
    ``,
    `  ${symbols.slice(0, 6).map((s: string, i: number) => `${C.dim}${i + 1}:${C.reset}${s}`).join('  ')}`,
    ``,
    `${C.bold}Which pair of identical symbols appeared?${C.reset}`,
  ].join('\n');

  const correctPair = target + target;
  const options: DriveOption[] = [
    { label: correctPair, description: 'The matching pair I spotted', drive: 'agency', polarity: 'neutral', correctnessScore: 1.0 },
    { label: decoy, description: 'A different pair', drive: 'communion', polarity: 'neutral', correctnessScore: 0.3 },
    { label: distractor + target, description: 'Adjacent but not matching', drive: 'eros', polarity: 'neutral', correctnessScore: 0.2 },
    { label: 'No pair found', description: 'I could not identify a match', drive: 'agape', polarity: 'neutral', correctnessScore: 0.0 },
  ];
  shuffle(options);

  return {
    prompt: {
      questions: [{
        question,
        header: 'Cognitive Line — Pattern Speed',
        options: options.map(o => ({ label: o.label, description: o.description })),
        allowWriteIn: true,
        multiSelect: false,
      }],
    },
    evaluate: (answer: string, startTimeMs: number, endTimeMs: number): TrialResult => {
      const durationMs = endTimeMs - startTimeMs;
      const isCorrect = answer.toLowerCase().includes(correctPair);

      const responseTime = durationMs < 3000 ? 0.95
        : durationMs < 8000 ? 0.8
        : durationMs < 15000 ? 0.6
        : 0.3;

      const matchedOpt = options.find(o => answer.toLowerCase().includes(o.label.toLowerCase()));

      return {
        taskId: task.id,
        timestamp: startTimeMs,
        dimensions: {
          accuracy: isCorrect ? 0.9 : 0.3,
          response_time: responseTime,
          consistency: isCorrect ? 0.8 : 0.4,
        },
        rawResponse: {
          line: 'Cognitive' as Line,
          target, answer, isCorrect, durationMs,
          matchedDrive: matchedOpt?.drive ?? null,
          matchedPolarity: matchedOpt?.polarity ?? 'neutral',
          correctnessScore: matchedOpt?.correctnessScore ?? 0.5,
        },
        durationMs,
      };
    },
  };
}

/**
 * Emotional-specific: sentiment analysis probe.
 * Presents an emotional scenario and asks the player to identify
 * the primary emotion — measures affect granularity.
 */
export function renderEmotionalProbe(task: AssessmentTask): {
  prompt: AskUserQuestionParams;
  evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult;
} {
  const scenarios = [
    { text: 'A friend shares devastating news about a loved one. You feel your chest tighten.', emotion: 'Grief', wrong: ['Anger', 'Fear', 'Joy'] },
    { text: 'You achieve something you worked months for. Your hands tremble slightly.', emotion: 'Pride', wrong: ['Relief', 'Exhaustion', 'Anxiety'] },
    { text: 'Someone betrays a trust you placed in them. Your face flushes hot.', emotion: 'Betrayal', wrong: ['Sadness', 'Confusion', 'Indifference'] },
    { text: 'You see a stranger being mistreated in public. Something inside you moves.', emotion: 'Moral Outrage', wrong: ['Curiosity', 'Amusement', 'Boredom'] },
    { text: 'You are alone in a dark forest at night. Every sound is amplified.', emotion: 'Fear', wrong: ['Excitement', 'Peace', 'Anger'] },
    { text: 'Someone you love tells you they need space. You feel a cold knot in your stomach.', emotion: 'Abandonment', wrong: ['Relief', 'Curiosity', 'Indifference'] },
    { text: 'You finally understand something that confused you for years. Your mind feels clear.', emotion: 'Clarity', wrong: ['Boredom', 'Fear', 'Anger'] },
  ];

  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)]!;
  const correctOpt: DriveOption = { label: scenario.emotion, description: 'Identify this emotion', drive: 'eros', polarity: 'neutral', correctnessScore: 1.0 };
  const wrongOpts: DriveOption[] = scenario.wrong.map((w, i) => ({
    label: w,
    description: 'A different emotional state',
    drive: i === 0 ? 'agency' : i === 1 ? 'communion' : 'agape',
    polarity: 'neutral',
    correctnessScore: 0.2,
  }));
  const options = shuffle([correctOpt, ...wrongOpts]);

  const question = [
    `${C.magenta}${C.bold}EMOTIONAL LINE — SENTIMENT ANALYSIS${C.reset}`,
    ``,
    `Read this scenario and identify the PRIMARY emotion:`,
    ``,
    `  "${scenario.text}"`,
    ``,
    `${C.bold}What emotion does the person feel?${C.reset}`,
  ].join('\n');

  return {
    prompt: {
      questions: [{
        question,
        header: 'Emotional Line — Sentiment Analysis',
        options: options.map(o => ({ label: o.label, description: o.description })),
        allowWriteIn: true,
        multiSelect: false,
      }],
    },
    evaluate: (answer: string, startTimeMs: number, endTimeMs: number): TrialResult => {
      const durationMs = endTimeMs - startTimeMs;
      const isCorrect = answer.toLowerCase().includes(scenario.emotion.toLowerCase());

      const accuracy = isCorrect ? 0.9 : 0.3;
      const responseTime = durationMs < 10000 ? 0.8 : durationMs < 30000 ? 0.6 : 0.4;

      const matchedOpt = options.find(o => answer.toLowerCase().includes(o.label.toLowerCase()));

      return {
        taskId: task.id,
        timestamp: startTimeMs,
        dimensions: {
          accuracy,
          response_time: responseTime,
          depth: isCorrect ? 0.7 : 0.3,
        },
        rawResponse: {
          line: 'Emotional' as Line,
          scenario: scenario.text, playerEmotion: answer, expectedEmotion: scenario.emotion, isCorrect,
          matchedDrive: matchedOpt?.drive ?? null,
          matchedPolarity: matchedOpt?.polarity ?? 'neutral',
          correctnessScore: matchedOpt?.correctnessScore ?? 0.5,
        },
        durationMs,
      };
    },
  };
}

/**
 * Moral-specific: dilemma resolution probe.
 * Wraps the existing dilemma renderer with moral-line framing.
 */
export function renderMoralProbe(task: AssessmentTask): {
  prompt: AskUserQuestionParams;
  evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult;
} {
  // Delegate to existing dilemma renderer (already has line-specific dilemmas)
  return renderDilemma(task);
}

/**
 * Intrapersonal-specific: self-reflection probe.
 * Presents an introspective prompt and measures depth of self-awareness.
 */
export function renderIntrapersonalProbe(task: AssessmentTask): {
  prompt: AskUserQuestionParams;
  evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult;
} {
  const prompts = [
    'What is the gap between who you are and who you present to the world?',
    'When you are completely alone, what is your relationship with yourself like?',
    'What is one pattern in your behavior that you recognize but cannot seem to change?',
    'What does your body know that your mind refuses to accept?',
    'If you could have a conversation with your younger self, what would you say?',
    'What is the most honest thing you can say about yourself right now?',
  ];

  const promptText = prompts[Math.floor(Math.random() * prompts.length)]!;

  const options: DriveOption[] = [
    { label: 'I see it clearly', description: 'Self-knowledge is available to me right now', drive: 'agency', polarity: 'neutral', correctnessScore: 0.8 },
    { label: 'Something stirs but resists words', description: 'The unconscious is speaking', drive: 'eros', polarity: 'neutral', correctnessScore: 0.75 },
    { label: 'I need a mirror', description: 'Others see what I cannot see alone', drive: 'communion', polarity: 'sto', correctnessScore: 0.7 },
    { label: 'I rest in not-knowing', description: 'The question itself is the practice', drive: 'agape', polarity: 'sto', correctnessScore: 0.7 },
  ];
  shuffle(options);

  const question = [
    `${C.yellow}${C.bold}INTRAPERSONAL LINE — SELF-REFLECTION${C.reset}`,
    ``,
    `${C.bold}Look inward.${C.reset}`,
    ``,
    `${promptText}`,
  ].join('\n');

  return {
    prompt: {
      questions: [{
        question,
        header: 'Intrapersonal Line — Introspective Probe',
        options: options.map(o => ({ label: o.label, description: o.description })),
        allowWriteIn: true,
        multiSelect: false,
      }],
    },
    evaluate: (answer: string, startTimeMs: number, endTimeMs: number): TrialResult => {
      const durationMs = endTimeMs - startTimeMs;
      const wordCount = answer.split(/\s+/).filter(Boolean).length;
      const matchedOpt = options.find(o => answer.toLowerCase().includes(o.label.toLowerCase()));

      const depth = wordCount > 30 ? 0.9 : wordCount > 15 ? 0.7 : wordCount > 5 ? 0.5 : 0.3;
      const accuracy = matchedOpt ? matchedOpt.correctnessScore : (wordCount > 15 ? 0.7 : wordCount > 5 ? 0.5 : 0.3);
      const responseTime = durationMs < 30000 ? 0.8 : durationMs < 120000 ? 0.6 : 0.4;

      return {
        taskId: task.id,
        timestamp: startTimeMs,
        dimensions: {
          accuracy,
          depth,
          response_time: responseTime,
          metacognition: wordCount > 20 ? 0.7 : 0.4,
        },
        rawResponse: {
          line: 'Intrapersonal' as Line,
          prompt: promptText, answer, wordCount,
          matchedDrive: matchedOpt?.drive ?? null,
          matchedPolarity: matchedOpt?.polarity ?? 'neutral',
          correctnessScore: matchedOpt?.correctnessScore ?? 0.5,
        },
        durationMs,
      };
    },
  };
}

/**
 * Spiritual-specific: meaning-making probe.
 * Presents a value-ranking task with spiritual-line framing —
 * measures capacity for meaning-making and purpose exploration.
 */
export function renderSpiritualProbe(task: AssessmentTask): {
  prompt: AskUserQuestionParams;
  evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult;
} {
  const values = ['Power', 'Connection', 'Freedom', 'Truth'];
  const shuffled = [...values].sort(() => Math.random() - 0.5);

  const driveMap: Record<string, { drive: 'agency' | 'communion' | 'eros' | 'agape'; polarity: 'sto' | 'sts' | 'neutral' }> = {
    Power: { drive: 'agency', polarity: 'sts' },
    Connection: { drive: 'communion', polarity: 'sto' },
    Freedom: { drive: 'eros', polarity: 'neutral' },
    Truth: { drive: 'agape', polarity: 'sto' },
  };

  const question = [
    `${C.blue}${C.bold}SPIRITUAL LINE — MEANING-MAKING${C.reset}`,
    ``,
    `Rank these four values from most to least important to you:`,
    ``,
    `  1. ${shuffled[0]}\n  2. ${shuffled[1]}\n  3. ${shuffled[2]}\n  4. ${shuffled[3]}`,
    ``,
    `${C.bold}Your ranking:${C.reset}`,
  ].join('\n');

  const options: DriveOption[] = shuffled.map(v => ({
    label: v,
    description: `Prioritize ${v}`,
    drive: driveMap[v]!.drive,
    polarity: driveMap[v]!.polarity,
    correctnessScore: 0.7,
  }));

  return {
    prompt: {
      questions: [{
        question,
        header: 'Spiritual Line — Meaning-Making',
        options: options.map(o => ({ label: o.label, description: o.description })),
        allowWriteIn: true,
        multiSelect: false,
      }],
    },
    evaluate: (answer: string, startTimeMs: number, endTimeMs: number): TrialResult => {
      const durationMs = endTimeMs - startTimeMs;

      const hasRanking = /\d/.test(answer) || shuffled.some(v => answer.toLowerCase().includes(v.toLowerCase()));
      const accuracy = hasRanking ? 0.7 : 0.4;
      const depth = answer.length > 10 ? 0.7 : 0.4;
      const responseTime = durationMs < 20000 ? 0.8 : 0.6;

      const matchedOpt = options.find(o => answer.toLowerCase().includes(o.label.toLowerCase()));

      return {
        taskId: task.id,
        timestamp: startTimeMs,
        dimensions: {
          accuracy,
          depth,
          response_time: responseTime,
          coherence: hasRanking ? 0.7 : 0.4,
        },
        rawResponse: {
          line: 'Spiritual' as Line,
          values: shuffled, answer,
          matchedDrive: matchedOpt?.drive ?? null,
          matchedPolarity: matchedOpt?.polarity ?? 'neutral',
        },
        durationMs,
      };
    },
  };
}

/**
 * Interpersonal-specific: social cue reading probe.
 * Presents a social scenario and asks for empathic interpretation.
 */
export function renderInterpersonalProbe(task: AssessmentTask): {
  prompt: AskUserQuestionParams;
  evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult;
} {
  const scenarios = [
    { text: 'Your teammate goes quiet during a meeting. Their arms cross and they stare at the table.', cue: 'Withdrawal — they feel unheard', wrong: ['Boredom', 'Fatigue', 'Agreement'] },
    { text: 'A friend laughs a beat too long at a joke that fell flat. Their eyes dart to the floor.', cue: 'Discomfort — they are protecting someone', wrong: ['Amusement', 'Distraction', 'Joy'] },
    { text: 'Your partner says "I\'m fine" but their voice is flat and they turn away.', cue: 'Suppression — something is wrong', wrong: ['Contentment', 'Tiredness', 'Focus'] },
    { text: 'A stranger holds the door open and makes eye contact that lingers one second too long.', cue: 'Desire for connection', wrong: ['Impatience', 'Politeness only', 'Confusion'] },
    { text: 'A colleague compliments your work but their tone is slightly higher than usual.', cue: 'Ambivalence — genuine but competitive', wrong: ['Pure admiration', 'Sarcasm', 'Indifference'] },
  ];

  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)]!;
  const correctOpt: DriveOption = { label: scenario.cue, description: 'Read the social cue', drive: 'eros', polarity: 'neutral', correctnessScore: 1.0 };
  const wrongOpts: DriveOption[] = scenario.wrong.map((w, i) => ({
    label: w,
    description: 'A different interpretation',
    drive: i === 0 ? 'agency' : i === 1 ? 'communion' : 'agape',
    polarity: 'neutral',
    correctnessScore: 0.2,
  }));
  const options = shuffle([correctOpt, ...wrongOpts]);

  const question = [
    `${C.magenta}${C.bold}INTERPERSONAL LINE — SOCIAL CUE READING${C.reset}`,
    ``,
    `Read this social scenario and identify the underlying cue:`,
    ``,
    `  "${scenario.text}"`,
    ``,
    `${C.bold}What is really happening here?${C.reset}`,
  ].join('\n');

  return {
    prompt: {
      questions: [{
        question,
        header: 'Interpersonal Line — Social Cue Reading',
        options: options.map(o => ({ label: o.label, description: o.description })),
        allowWriteIn: true,
        multiSelect: false,
      }],
    },
    evaluate: (answer: string, startTimeMs: number, endTimeMs: number): TrialResult => {
      const durationMs = endTimeMs - startTimeMs;
      const isCorrect = answer.toLowerCase().includes(scenario.cue.toLowerCase().split('—')[0]!.trim().toLowerCase());

      const accuracy = isCorrect ? 0.9 : 0.3;
      const responseTime = durationMs < 10000 ? 0.8 : durationMs < 30000 ? 0.6 : 0.4;

      const matchedOpt = options.find(o => answer.toLowerCase().includes(o.label.toLowerCase().split('—')[0]!.trim().toLowerCase()));

      return {
        taskId: task.id,
        timestamp: startTimeMs,
        dimensions: {
          accuracy,
          response_time: responseTime,
          depth: isCorrect ? 0.7 : 0.3,
        },
        rawResponse: {
          line: 'Interpersonal' as Line,
          scenario: scenario.text, playerCue: answer, expectedCue: scenario.cue, isCorrect,
          matchedDrive: matchedOpt?.drive ?? null,
          matchedPolarity: matchedOpt?.polarity ?? 'neutral',
          correctnessScore: matchedOpt?.correctnessScore ?? 0.5,
        },
        durationMs,
      };
    },
  };
}

/**
 * Somatic-specific: body awareness probe.
 * Presents a rhythmic/physical task and measures embodied attunement.
 */
export function renderSomaticProbe(task: AssessmentTask): {
  prompt: AskUserQuestionParams;
  evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult;
} {
  const rhythmPatterns = [
    { pattern: '♩ ♩ ♩ — ♩ ♩ ♩', description: 'A steady 3-beat pulse', tempo: 'moderate' },
    { pattern: '♩ ♪♩ ♩ ♪♩', description: 'A syncopated rhythm', tempo: 'fast' },
    { pattern: '♩ — — ♩ — —', description: 'A slow, spaced pulse', tempo: 'slow' },
    { pattern: '♪♪ ♩ ♪♪ ♩', description: 'A galloping pattern', tempo: 'mixed' },
  ];

  const chosen = rhythmPatterns[Math.floor(Math.random() * rhythmPatterns.length)]!;

  const question = [
    `${C.red}${C.bold}SOMATIC LINE — BODY AWARENESS${C.reset}`,
    ``,
    `A rhythm fills the space. Feel it in your body:`,
    ``,
    `  ${C.dim}${chosen.pattern}${C.reset}`,
    `  ${C.dim}(${chosen.description})${C.reset}`,
    ``,
    `${C.bold}How does your body respond?${C.reset}`,
  ].join('\n');

  const options: DriveOption[] = [
    { label: 'Move with the beat', description: 'My body syncs naturally', drive: 'communion', polarity: 'sto', correctnessScore: 0.8 },
    { label: 'Add my own counter-rhythm', description: 'I dance against it', drive: 'agency', polarity: 'sts', correctnessScore: 0.6 },
    { label: 'Feel it internally', description: 'The rhythm lives inside me', drive: 'eros', polarity: 'neutral', correctnessScore: 0.75 },
    { label: 'Find the silence between', description: 'Stillness is my response', drive: 'agape', polarity: 'sto', correctnessScore: 0.7 },
  ];
  shuffle(options);

  return {
    prompt: {
      questions: [{
        question,
        header: 'Somatic Line — Body Awareness',
        options: options.map(o => ({ label: o.label, description: o.description })),
        allowWriteIn: true,
        multiSelect: false,
      }],
    },
    evaluate: (answer: string, startTimeMs: number, endTimeMs: number): TrialResult => {
      const durationMs = endTimeMs - startTimeMs;
      const matchedOpt = options.find(o => answer.toLowerCase().includes(o.label.toLowerCase()));

      return {
        taskId: task.id,
        timestamp: startTimeMs,
        dimensions: {
          accuracy: matchedOpt?.correctnessScore ?? 0.5,
          response_time: durationMs < 15000 ? 0.7 : 0.5,
          coherence: matchedOpt ? 0.7 : 0.4,
        },
        rawResponse: {
          line: 'Somatic' as Line,
          rhythm: chosen.pattern, answer,
          matchedDrive: matchedOpt?.drive ?? null,
          matchedPolarity: matchedOpt?.polarity ?? 'neutral',
        },
        durationMs,
      };
    },
  };
}

/**
 * Willpower-specific: sustained attention probe.
 * Presents a hold task and measures patience, delay tolerance.
 */
export function renderWillpowerProbe(task: AssessmentTask): {
  prompt: AskUserQuestionParams;
  evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult;
} {
  const diff = getDifficulty(task.parameters.stage as string | undefined);
  const holdDurationMs = (task.parameters.holdDurationMs as number) ?? diff.holdDurationMs;

  const question = [
    `${C.yellow}${C.bold}WILLPOWER LINE — SUSTAINED ATTENTION${C.reset}`,
    ``,
    `Hold these symbols in your mind:`,
    ``,
    `  ${diff.symbolPool.slice(0, 3).join('   ')}`,
    ``,
    `Wait ${C.bold}${Math.round(holdDurationMs / 1000)} seconds${C.reset} before responding.`,
    `Do not rush. Let the time pass.`,
    ``,
    `${C.bold}Now — what did you hold?${C.reset}`,
  ].join('\n');

  const items = diff.symbolPool.slice(0, 3);
  const options: DriveOption[] = [
    { label: `${items.join(' ')}`, description: 'Full recall — I held them completely', drive: 'agency', polarity: 'neutral', correctnessScore: 1.0 },
    { label: `${items.slice(0, -1).join(' ')}…`, description: 'Partial — I held most of them', drive: 'communion', polarity: 'neutral', correctnessScore: 0.7 },
    { label: 'Some of them', description: 'I held parts but not all', drive: 'eros', polarity: 'neutral', correctnessScore: 0.4 },
    { label: 'They slipped', description: 'My attention wandered', drive: 'agape', polarity: 'neutral', correctnessScore: 0.0 },
  ];
  shuffle(options);

  return {
    prompt: {
      questions: [{
        question,
        header: 'Willpower Line — Sustained Attention',
        options: options.map(o => ({ label: o.label, description: o.description })),
        allowWriteIn: true,
        multiSelect: false,
      }],
    },
    evaluate: (answer: string, startTimeMs: number, endTimeMs: number): TrialResult => {
      const durationMs = endTimeMs - startTimeMs;
      const answerLower = answer.toLowerCase();
      const matched = items.filter((item: string) => answerLower.includes(item));
      const accuracy = matched.length / items.length;

      // Willpower-specific: reward appropriate timing (not too fast = didn't hold)
      const minExpectedMs = holdDurationMs * 0.8;
      const timingBonus = durationMs >= minExpectedMs ? 0.2 : 0;
      const responseTime = Math.min(1, (holdDurationMs / (holdDurationMs * 2)) + timingBonus);

      const matchedOpt = options.find(o => answer.toLowerCase().includes(o.label.toLowerCase()));

      return {
        taskId: task.id,
        timestamp: startTimeMs,
        dimensions: {
          accuracy,
          response_time: responseTime,
          self_correction: accuracy > 0.7 ? 0.8 : 0.4,
        },
        rawResponse: {
          line: 'Willpower' as Line,
          items, matched, answer, holdDurationMs, timingBonus,
          matchedDrive: matchedOpt?.drive ?? null,
          matchedPolarity: matchedOpt?.polarity ?? 'neutral',
          correctnessScore: matchedOpt?.correctnessScore ?? 0.5,
        },
        durationMs,
      };
    },
  };
}

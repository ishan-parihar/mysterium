/**
 * Reflective renderers — self-report, value-ranking, emotion identification and rhythm.
 *
 * Split out of `TaskRenderers.ts` (module-cohesion audit item 3): 24 renderers sharing one
 * import block read as peers of each other. Each group file names the task family it renders;
 * `../TaskRenderers.ts` re-exports the whole set, so importers are unchanged.
 */
import type { AssessmentTask, TrialResult } from '../../types.js';
import type { AskUserQuestionParams } from '../../agentTypes.js';
import { C, type DriveOption, shuffle } from './shared.js';

// ── Emotion Identification Renderer ──────────────────────────────────

export function renderEmotionIdentification(task: AssessmentTask): {
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
        header: 'Emotional Literacy',
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

// ── Self-Report Renderer ─────────────────────────────────────────────

export function renderSelfReport(task: AssessmentTask): {
  prompt: AskUserQuestionParams;
  evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult;
} {
  // Line-specific self-report prompts for developmental depth
  const LINE_PROMPTS: Record<string, string[]> = {
    Cognitive: [
      'What assumption do you hold that you have never questioned?',
      'When was the last time you changed your mind about something important? What triggered it?',
      'What is the difference between thinking and knowing?',
      'What is one thing you avoid thinking about, and why?',
      'If your thinking patterns were visible to others, what would surprise them most?',
      'When you face a challenge, what is your first instinct — analyze, trust intuition, seek input, or act?',
    ],
    Emotional: [
      'What feeling do you avoid sitting with?',
      'Describe a recent moment where you felt truly alive — not just happy, but fully present.',
      'What emotion is most present for you right now? Describe it in your own words.',
      'What does your inner critic say to you most often?',
      'When someone shares their pain with you, what happens inside you?',
      'What is the relationship between what you feel and what you express?',
    ],
    Moral: [
      'When you witness injustice, what happens in your body before your mind responds?',
      'What is one rule you follow even when no one is watching?',
      'What is the hardest ethical dilemma you have faced — and how did you resolve it?',
      'If you could change one thing about how the world treats its weakest members, what would it be?',
      'What is the relationship between what you believe and how you act?',
      'When you fail to live up to your own values, what happens next?',
    ],
    Intrapersonal: [
      'What is the gap between who you are and who you present to the world?',
      'When you are completely alone, what is your relationship with yourself like?',
      'What is one pattern in your behavior that you recognize but cannot seem to change?',
      'What does your body know that your mind refuses to accept?',
      'If you could have a conversation with your younger self, what would you say?',
      'What is the most honest thing you can say about yourself right now?',
    ],
    Spiritual: [
      'When you are in nature, what happens to your sense of self?',
      'What is the difference between belief and experience?',
      'What is one thing you would risk everything for?',
      'When you encounter mystery, do you lean in or pull back?',
      'What is the relationship between your daily actions and your deepest values?',
      'If you could describe your inner landscape in one word, what would it be?',
    ],
    Somatic: [
      'Where do you feel tension in your body right now? What might it be carrying?',
      'What is your relationship with your physical body — friend, stranger, or adversary?',
      'When your body speaks to you, what does it usually say?',
      'Describe a time when your body guided you toward a decision your mind resisted.',
      'What physical sensations accompany your most important decisions?',
      'If your body could speak freely for one minute, what would it say?',
    ],
    Willpower: [
      'What is the hardest thing you have committed to and sustained over time?',
      'When you face a challenge, what is your first instinct — fight, flee, freeze, or connect?',
      'What is the relationship between discipline and freedom in your life?',
      'When motivation fades, what keeps you going?',
      'What is one thing you avoid thinking about, and why?',
      'If you could change one thing about how you relate to obstacles, what would it be?',
    ],
    Interpersonal: [
      'If you could change one thing about how you relate to others, what would it be?',
      'What is the hardest conversation you have ever had? What did it teach you?',
      'When someone close to you is in pain, what is your instinct — fix, listen, or withdraw?',
      'What is the difference between connection and control in your relationships?',
      'When you feel unseen by others, what happens inside you?',
      'What is the most honest thing you can say about how you show up for others?',
    ],
  };
  const line = (task.parameters.line as string) ?? 'Moral';
  const linePrompts = LINE_PROMPTS[line] ?? [
    'What emotion is most present for you right now? Describe it in your own words.',
    'When you face a challenge, what is your first instinct — fight, flee, freeze, or connect?',
    'What is one thing you avoid thinking about, and why?',
    'Describe a recent moment where you felt truly alive.',
    'What does your inner critic say to you most often?',
    'If you could change one thing about how you relate to others, what would it be?',
  ];
  const prompts = linePrompts;

  const promptText = prompts[Math.floor(Math.random() * prompts.length)]!;

  const options: DriveOption[] = [
    { label: 'I can articulate it clearly', description: 'I know the answer deeply', drive: 'agency', polarity: 'neutral', correctnessScore: 0.8 },
    { label: 'I sense it but cannot name it', description: 'There is a feeling, but it eludes words', drive: 'communion', polarity: 'neutral', correctnessScore: 0.6 },
    { label: 'This feels too vulnerable', description: 'I need walls right now', drive: 'agape', polarity: 'neutral', correctnessScore: 0.3 },
    { label: 'Let me reflect more', description: 'I need time to go deeper', drive: 'eros', polarity: 'neutral', correctnessScore: 0.5 },
  ];
  shuffle(options);

  return {
    prompt: {
      questions: [{
        question: `${C.bold}Look inward.${C.reset}\n\n${promptText}`,
        header: 'Self-Inquiry',
        options: options.map(o => ({ label: o.label, description: o.description })),
        allowWriteIn: true,
        multiSelect: false,
      }],
    },
    evaluate: (answer: string, startTimeMs: number, endTimeMs: number): TrialResult => {
      const durationMs = endTimeMs - startTimeMs;
      const wordCount = answer.split(/\s+/).filter(Boolean).length;

      // Check if they selected a known MCQ option
      const matchedOpt = options.find(o => answer.toLowerCase().includes(o.label.toLowerCase()));

      const depth = wordCount > 30 ? 0.9 : wordCount > 15 ? 0.7 : wordCount > 5 ? 0.5 : 0.3;
      // FIX: Use the matched option's correctnessScore for accuracy (not word count).
      // This ensures different MCQ options score differently based on their developmental value.
      const accuracy = matchedOpt ? matchedOpt.correctnessScore : (wordCount > 15 ? 0.7 : wordCount > 5 ? 0.5 : 0.3);
      const responseTime = durationMs < 30000 ? 0.8 : durationMs < 120000 ? 0.6 : 0.4;

      return {
        taskId: task.id,
        timestamp: startTimeMs,
        dimensions: {
          accuracy,
          depth: matchedOpt ? Math.max(0.5, matchedOpt.correctnessScore) : depth,
          response_time: responseTime,
          metacognition: wordCount > 20 ? 0.7 : 0.4,
        },
        rawResponse: {
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

// ── Value Ranking Renderer ───────────────────────────────────────────

export function renderValueRanking(task: AssessmentTask): {
  prompt: AskUserQuestionParams;
  evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult;
} {
  const values = ['Power', 'Connection', 'Freedom', 'Truth'];
  const shuffled = [...values].sort(() => Math.random() - 0.5);

  const question = [
    `Rank these four values from most to least important to you:`,
    ``,
    `  1. ${shuffled[0]}\n  2. ${shuffled[1]}\n  3. ${shuffled[2]}\n  4. ${shuffled[3]}`,
    ``,
    `${C.bold}Your ranking:${C.reset}`,
  ].join('\n');

  // Options map to drives: Power→agency, Connection→communion, Freedom→eros, Truth→agape
  const driveMap: Record<string, { drive: 'agency' | 'communion' | 'eros' | 'agape'; polarity: 'sto' | 'sts' | 'neutral' }> = {
    Power: { drive: 'agency', polarity: 'sts' },
    Connection: { drive: 'communion', polarity: 'sto' },
    Freedom: { drive: 'eros', polarity: 'neutral' },
    Truth: { drive: 'agape', polarity: 'sto' },
  };

  const options: DriveOption[] = shuffled.map(v => ({
    label: v,
    description: `Prioritize ${v}`,
    drive: driveMap[v]!.drive,
    polarity: driveMap[v]!.polarity,
    correctnessScore: 0.7, // No wrong answer in value ranking
  }));

  return {
    prompt: {
      questions: [{
        question,
        header: 'Value Prioritization',
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
          values: shuffled, answer,
          matchedDrive: matchedOpt?.drive ?? null,
          matchedPolarity: matchedOpt?.polarity ?? 'neutral',
        },
        durationMs,
      };
    },
  };
}

// ── Rhythm Renderer ──────────────────────────────────────────────────

export function renderRhythm(_task: AssessmentTask): { prompt: AskUserQuestionParams; evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult; } {
  return {
    prompt: { questions: [{ question: '[PURGED] rhythm — use run_brain_game', header: 'Rhythmic Attunement', options: [{ label: 'Continue', description: 'Use brain game' }], allowWriteIn: true, multiSelect: false }] },
    evaluate: (_answer: string, startTimeMs: number, endTimeMs: number): TrialResult => ({ taskId: _task.id, timestamp: startTimeMs, dimensions: { accuracy: 0.5 }, rawResponse: {}, durationMs: endTimeMs - startTimeMs }),
  };
}

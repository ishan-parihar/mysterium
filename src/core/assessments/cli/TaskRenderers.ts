/**
 * TaskRenderers — (PURGED BRAIN-GAME MCQ)
 * Canonical brain-game tasks (n_back, stroop, go_no_go, hold, pattern_prediction, reaction_time, rhythm)
 * are now served by src/core/braingame/paradigms/* via BrainGameEngine + AdaptiveDifficultyService.
 * This file now only serves developmental task types (dilemma, self_report, etc.).
 * Legacy MCQ wrappers for brain games have been removed — use run_brain_game tool.
 *
 * Each renderer produces an AskUserQuestionParams-compatible prompt and a
 * response evaluator that generates TrialResult[] for the scoring engine.
 *
 * Key design:
 * - Options include drive/polarity metadata for differentiated scoring
 * - Correct answer position is shuffled to prevent gaming
 * - Each option maps to a specific drive expression
 */
import type { AssessmentTask, TrialResult } from '../types.js';
import type { AskUserQuestionParams } from '../agentTypes.js';
import type { Line } from '../../domain/Line.js';

// ── ANSI helpers (must be at top for const hoisting) ──────────────────

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m',
  magenta: '\x1b[35m', cyan: '\x1b[36m', red: '\x1b[31m',
};

// ── Option type with drive metadata ───────────────────────────────────

interface DriveOption {
  label: string;
  description: string;
  drive: 'agency' | 'communion' | 'eros' | 'agape';
  polarity: 'sto' | 'sts' | 'neutral';
  /** Score multiplier for correctness (1.0 = correct, 0.5 = partial, 0.0 = wrong) */
  correctnessScore: number;
}

/**
 * Shuffle an array in place (Fisher-Yates). Returns the same array.
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

// ── Brain-game MCQ symbols/STAGE_DIFFICULTY PURGED for n_back/stroop/go_no_go/hold/pattern_prediction — use ParadigmDefinitions (src/core/braingame/paradigms/*)
// Minimal developmental probe support retained below for line probes (Cognitive/Interpersonal etc.)
const NBACK_SYMBOLS_DEV = ['◆', '●', '▲', '■', '★', '◇'];
const STAGE_DIFFICULTY_DEV: Record<string, { symbolPool: readonly string[]; holdDurationMs: number; stroopColors: readonly string[]; goStimuli: readonly string[] }> = {
  Infrared: { symbolPool: NBACK_SYMBOLS_DEV.slice(0, 3), holdDurationMs: 3000, stroopColors: ['R','G','B'], goStimuli: ['⚔','🛡'] },
  Magenta: { symbolPool: NBACK_SYMBOLS_DEV.slice(0, 4), holdDurationMs: 4000, stroopColors: ['R','G','B'], goStimuli: ['⚔','🛡'] },
  Red: { symbolPool: NBACK_SYMBOLS_DEV, holdDurationMs: 5000, stroopColors: ['R','G','B'], goStimuli: ['⚔','🛡'] },
  Amber: { symbolPool: NBACK_SYMBOLS_DEV, holdDurationMs: 6000, stroopColors: ['R','G','B'], goStimuli: ['⚔','🛡'] },
  Orange: { symbolPool: NBACK_SYMBOLS_DEV, holdDurationMs: 7000, stroopColors: ['R','G','B'], goStimuli: ['⚔','🛡'] },
  Green: { symbolPool: NBACK_SYMBOLS_DEV, holdDurationMs: 8000, stroopColors: ['R','G','B'], goStimuli: ['⚔','🛡'] },
  Teal: { symbolPool: NBACK_SYMBOLS_DEV, holdDurationMs: 9000, stroopColors: ['R','G','B'], goStimuli: ['⚔','🛡'] },
  Turquoise: { symbolPool: NBACK_SYMBOLS_DEV, holdDurationMs: 10000, stroopColors: ['R','G','B'], goStimuli: ['⚔','🛡'] },
};
function getDifficulty(stage?: string): { symbolPool: readonly string[]; holdDurationMs: number; stroopColors: readonly string[]; goStimuli: readonly string[] } {
  return STAGE_DIFFICULTY_DEV[stage ?? 'Red'] ?? STAGE_DIFFICULTY_DEV['Red']!;
}

// ── Task type display names ────────────────────────────────────────────

export const TASK_TYPE_LABELS: Record<string, string> = {
  n_back: 'Working Memory',
  stroop: 'Inhibitory Control',
  go_no_go: 'Impulse Regulation',
  hold: 'Attentional Hold',
  pattern_prediction: 'Pattern Recognition',
  emotion_identification: 'Emotional Literacy',
  dilemma: 'Moral Reasoning',
  scenario: 'Situational Judgment',
  value_ranking: 'Value Prioritization',
  self_report: 'Self-Inquiry',
  reaction_time: 'Reaction Speed',
  rhythm: 'Rhythmic Attunement',
  imitation: 'Imitative Learning',
  cooperation: 'Cooperative Dynamics',
  llm_dialogue: 'Reflective Dialogue',
};

// ── N-Back Renderer ───────────────────────────────────────────────────

/**
 * Render an n-back task: generate a symbol sequence and ask the player
 * to identify which positions match the item from n steps back.
 */
export function renderNBack(_task: AssessmentTask): { prompt: AskUserQuestionParams; evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult; } {
  // PURGED — brain games now run via BrainGameEngine (run_brain_game tool). This stub keeps the export alive for type-checking.
  return {
    prompt: { questions: [{ question: '[PURGED] n_back — use run_brain_game', header: 'Working Memory', options: [{ label: 'Continue', description: 'Use brain game' }], allowWriteIn: true, multiSelect: false }] },
    evaluate: (_answer: string, startTimeMs: number, endTimeMs: number): TrialResult => ({ taskId: _task.id, timestamp: startTimeMs, dimensions: { accuracy: 0.5 }, rawResponse: {}, durationMs: endTimeMs - startTimeMs }),
  };
}


// ── Stroop Renderer ───────────────────────────────────────────────────

/**
 * Render a Stroop task: show a word printed in a different ink color,
 * ask the player to name the INK color (not the word).
 */
export function renderStroop(_task: AssessmentTask): { prompt: AskUserQuestionParams; evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult; } {
  return {
    prompt: { questions: [{ question: '[PURGED] stroop — use run_brain_game', header: 'Inhibitory Control', options: [{ label: 'Continue', description: 'Use brain game' }], allowWriteIn: true, multiSelect: false }] },
    evaluate: (_answer: string, startTimeMs: number, endTimeMs: number): TrialResult => ({ taskId: _task.id, timestamp: startTimeMs, dimensions: { accuracy: 0.5 }, rawResponse: {}, durationMs: endTimeMs - startTimeMs }),
  };
}


// ── Go/No-Go Renderer ────────────────────────────────────────────────

/**
 * Render a Go/No-Go task: show stimuli and ask the player to count
 * how many "Go" (⚔) stimuli appeared vs "No-Go" (🛡) stimuli.
 */
export function renderGoNoGo(_task: AssessmentTask): { prompt: AskUserQuestionParams; evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult; } {
  return {
    prompt: { questions: [{ question: '[PURGED] go_no_go — use run_brain_game', header: 'Impulse Regulation', options: [{ label: 'Continue', description: 'Use brain game' }], allowWriteIn: true, multiSelect: false }] },
    evaluate: (_answer: string, startTimeMs: number, endTimeMs: number): TrialResult => ({ taskId: _task.id, timestamp: startTimeMs, dimensions: { accuracy: 0.5 }, rawResponse: {}, durationMs: endTimeMs - startTimeMs }),
  };
}


// ── Hold Task Renderer ───────────────────────────────────────────────

/**
 * Render a Hold task: show items to remember, then ask the player to recall.
 */
export function renderHold(_task: AssessmentTask): { prompt: AskUserQuestionParams; evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult; } {
  return {
    prompt: { questions: [{ question: '[PURGED] hold — use run_brain_game', header: 'Attentional Hold', options: [{ label: 'Continue', description: 'Use brain game' }], allowWriteIn: true, multiSelect: false }] },
    evaluate: (_answer: string, startTimeMs: number, endTimeMs: number): TrialResult => ({ taskId: _task.id, timestamp: startTimeMs, dimensions: { accuracy: 0.5 }, rawResponse: {}, durationMs: endTimeMs - startTimeMs }),
  };
}


// ── Pattern Prediction Renderer ──────────────────────────────────────

export function renderPatternPrediction(_task: AssessmentTask): { prompt: AskUserQuestionParams; evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult; } {
  return {
    prompt: { questions: [{ question: '[PURGED] pattern_prediction — use run_brain_game', header: 'Pattern Recognition', options: [{ label: 'Continue', description: 'Use brain game' }], allowWriteIn: true, multiSelect: false }] },
    evaluate: (_answer: string, startTimeMs: number, endTimeMs: number): TrialResult => ({ taskId: _task.id, timestamp: startTimeMs, dimensions: { accuracy: 0.5 }, rawResponse: {}, durationMs: endTimeMs - startTimeMs }),
  };
}


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

// ── Dilemma Renderer — Line×Stage-Specific ─────────────────────────

interface DilemmaOption {
  label: string;
  description: string;
  drive: 'agency' | 'communion' | 'eros' | 'agape';
  polarity: 'sto' | 'sts' | 'neutral';
  /** Score for drive-aligned response (1.0 = fully aligned, 0.5 = neutral, 0.3 = misaligned) */
  correctnessScore: number;
}

interface LineDilemma {
  scenario: string;
  options: DilemmaOption[];
}

/**
 * Line-specific dilemma pools. Each line has 4-6 dilemmas that probe
 * the developmental structure unique to that line of intelligence.
 * Stage determines framing difficulty (Red = survival, Amber = rules,
 * Orange = optimization, Green = pluralistic).
 */
const LINE_DILEMMAS: Record<string, LineDilemma[]> = {
  Cognitive: [
    {
      scenario: 'You discover a flaw in a widely-accepted theory that has guided your community for years. Publishing it would advance knowledge but undermine the intellectual foundation people rely on.',
      options: [
        { label: 'Publish immediately', description: 'Truth must never be suppressed, regardless of consequences', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Work within the system', description: 'Introduce the correction gradually through trusted channels', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Replicate and verify first', description: 'One finding is not enough — build an irrefutable case', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Consider who benefits', description: 'Knowledge without wisdom about its use is dangerous', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'Your analytical framework reveals a pattern that implicates someone you deeply respect. The data is clear but the conclusion would destroy their reputation.',
      options: [
        { label: 'Follow the evidence', description: 'Analysis must be impartial — the truth is the truth', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Confront them privately first', description: 'Give them a chance to explain or correct the record', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Question the framework', description: 'If the conclusion feels wrong, maybe the model needs refinement', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Weigh the greater impact', description: 'What serves the community best — the truth or the relationship?', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'You can solve a complex problem instantly using intuition, or spend hours verifying through rigorous analysis. The intuitive answer feels right but you cannot prove why.',
      options: [
        { label: 'Trust the analysis', description: 'Unverified intuition is just guessing with confidence', drive: 'agency', polarity: 'neutral' , correctnessScore: 0.6 },
        { label: 'Act on intuition now', description: 'Speed matters — analysis can follow', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Blend both', description: 'Use intuition to guide the analysis, analysis to validate the intuition', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Present both paths', description: 'Let others see the reasoning and decide', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'A colleague presents flawed research that supports a cause you believe in. Exposing the flaw helps science but hurts a movement you care about.',
      options: [
        { label: 'Expose the flaw', description: 'Science must be honest, even when inconvenient', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Support the cause quietly', description: 'The greater good outweighs one methodological error', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Help them improve it', description: 'Fix the research rather than destroy it', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Let it stand', description: 'Perfect cannot be the enemy of good enough', drive: 'agape', polarity: 'neutral' , correctnessScore: 0.6 },
      ],
    },
  ],
  Emotional: [
    {
      scenario: 'A friend tells you they are fine, but their eyes tell a different story. Pressing them might break a wall they need. Ignoring it might leave them alone.',
      options: [
        { label: 'Name what I see', description: 'Sometimes being seen is the first step to healing', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Respect their boundary', description: 'They will share when they are ready', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
        { label: 'Share my own vulnerability first', description: 'Open the door by going through it myself', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Stay present without asking', description: 'Sometimes presence speaks louder than words', drive: 'agency', polarity: 'neutral' , correctnessScore: 0.6 },
      ],
    },
    {
      scenario: 'You feel a surge of anger during a conversation. It is justified, but expressing it could damage a fragile relationship.',
      options: [
        { label: 'Express the anger honestly', description: 'Suppressing authentic feeling is its own violence', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Name the feeling without blame', description: 'I feel angry — this is about me, not about you', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Sit with it before responding', description: 'Let the wave pass before speaking from the deeper place', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Redirect to what matters', description: 'Under the anger is a need — speak to the need instead', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'You are offered a position of great influence. It excites you, but something deep inside feels a quiet dread you cannot name.',
      options: [
        { label: 'Follow the excitement', description: 'Opportunity favours the bold — trust the pull', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Explore the dread', description: 'The body knows things the mind has not caught up with', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Delay the decision', description: 'Neither yes nor no — let the answer reveal itself', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Ask what I truly need', description: 'Influence is not the same as fulfilment', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'Someone you love is making a choice you believe will hurt them deeply. Your fear for them is tangled with your own unhealed wounds.',
      options: [
        { label: 'Warn them directly', description: 'Love means telling hard truths', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Hold space for their journey', description: 'Their path is theirs — my fear is mine', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Examine where my fear meets their choice', description: 'Where does their freedom end and my wound begin?', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Love them through it', description: 'I cannot walk their path, but I can walk beside them', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
  ],
  Moral: [
    {
      scenario: 'You discover your mentor has been lying to protect you. The truth would destroy your faith in them but free you to grow.',
      options: [
        { label: 'Confront them', description: 'Demand the truth, even if it breaks the relationship', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Forgive silently', description: 'Accept the protection and move on', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
        { label: 'Seek counsel', description: 'Ask someone you trust for perspective', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Transcend the need', description: "The truth doesn't matter — only growth does", drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
      ],
    },
    {
      scenario: 'A community depends on a resource that is slowly depleting. Sharing equally means everyone suffers slowly. Hoarding means your group survives but others don\'t.',
      options: [
        { label: 'Share equally', description: 'All should share the burden, even if it\'s harder', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
        { label: 'Protect your own', description: 'Your people come first', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Find alternatives', description: 'There must be another way — search for it', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Build alliances', description: 'Unite with others to solve it collectively', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
      ],
    },
    {
      scenario: 'You can advance your career by taking credit for someone else\'s work, or stay honest and remain overlooked.',
      options: [
        { label: 'Stay honest', description: 'Integrity matters more than advancement', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
        { label: 'Take credit', description: 'Survival requires boldness', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Share credit', description: 'Both of you deserve recognition', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Find a third path', description: "There's always another option", drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
      ],
    },
    {
      scenario: 'A child asks you why people suffer. You know the real answer would shatter their innocence, but a comforting lie feels wrong.',
      options: [
        { label: 'Tell the truth gently', description: 'They deserve honesty, softened with love', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
        { label: 'Shield them', description: 'Innocence is sacred — protect it', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Redirect with wonder', description: 'Turn the question toward beauty and possibility', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Let them figure it out', description: 'Some truths must be lived, not told', drive: 'agency', polarity: 'neutral' , correctnessScore: 0.6 },
      ],
    },
  ],
  Intrapersonal: [
    {
      scenario: 'You realize a core belief you have held about yourself — "I am not enough" — has been driving your decisions for years. Confronting it means confronting who you would be without it.',
      options: [
        { label: 'Dismantle it immediately', description: 'If it is false, every moment spent believing it is wasted', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Trace its origins gently', description: 'Understanding where it came from is the path to releasing it', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Let it dissolve naturally', description: 'Forced self-change creates new shadows — let awareness do the work', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Integrate it as a teacher', description: 'This belief served a purpose once — honour that before releasing', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'You notice you are performing a version of yourself for others that is not quite authentic. Dropping the performance might reveal something you are not ready to face.',
      options: [
        { label: 'Drop the mask now', description: 'Authenticity demands courage — face what is underneath', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Explore what the mask protects', description: 'Every persona exists for a reason — understand it first', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Let it thin gradually', description: 'Authenticity is not all-or-nothing — reveal more over time', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Accept the performance as part of me', description: 'All selves are real selves — even the ones we choose', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'You receive feedback that contradicts your self-image. Three people independently describe a pattern you cannot see in yourself.',
      options: [
        { label: 'Reject it as misunderstanding', description: 'They do not know the real me', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Sit with the discomfort', description: 'If three mirrors show the same image, perhaps I should look', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Investigate the pattern objectively', description: 'Data is data — let me examine the evidence', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Thank them and reflect', description: 'Feedback is a gift, even when it stings', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
  ],
  Spiritual: [
    {
      scenario: 'You experience a profound moment of connection with something larger than yourself. A voice inside says: "This is truth." Another voice asks: "Is this genuine insight or just what you wanted to feel?"',
      options: [
        { label: 'Trust the experience', description: 'Some truths are felt before they are understood', drive: 'agency', polarity: 'neutral' , correctnessScore: 0.6 },
        { label: 'Question it rigorously', description: 'Spiritual experiences are the most important to verify', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Hold both possibilities', description: 'The question itself is part of the answer', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Return to practice', description: 'The experience will clarify itself through continued engagement', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'Your spiritual practice has brought you peace, but someone you love is suffering and your peace feels like indifference.',
      options: [
        { label: 'Share the practice', description: 'If it brought me peace, it might help them too', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Set aside practice to be present', description: 'Their pain is more important than my peace', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Hold both — peace AND compassion', description: 'True peace includes the suffering of others', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Let my peace be an offering', description: 'The calmer I am, the more I can actually help', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'You are asked to lead a spiritual community. The role requires structure and authority, but your deepest teaching is about letting go of control.',
      options: [
        { label: 'Accept and adapt', description: 'The container must exist for the contents to be held', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Decline the role', description: 'The teaching matters more than the position', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Lead by not-leading', description: 'Create space for the community to lead itself', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Serve as guide, not guru', description: 'Hold authority lightly — point, do not push', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
  ],
  Somatic: [
    {
      scenario: 'Your body sends a persistent signal of fatigue, but you have committed to a demanding physical challenge. Pushing through could cause injury; stopping feels like failure.',
      options: [
        { label: 'Push through', description: 'The body adapts to what the mind demands', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Listen to the fatigue', description: 'The body is never wrong — only the mind ignores it', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Modify the challenge', description: 'Adapt the goal to honour the body without abandoning it', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Rest and return stronger', description: 'Recovery is not retreat — it is preparation', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'During deep physical work, a stored emotion surfaces — grief, rage, fear. Your body wants to release it, but the setting demands composure.',
      options: [
        { label: 'Release it fully', description: 'The body knows what it needs — let it speak', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Acknowledge and contain', description: 'I see you. Not now. Soon.', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Breathe into the sensation', description: 'Let the breath carry the emotion without acting on it', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Trust the process', description: 'What the body releases, the body heals', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'You notice your body has been holding tension in a specific area for weeks. A healer suggests it relates to an unresolved life situation.',
      options: [
        { label: 'Address the life situation directly', description: 'Fix the source, not just the symptom', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Work with the body first', description: 'Release the tension physically and see what emerges', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Hold curiosity about both', description: 'Body and situation are one conversation — listen to both', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Accept it as part of my story', description: 'This tension has carried something important — honour that', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
  ],
  Willpower: [
    {
      scenario: 'You have committed to a difficult daily practice. After two weeks, the initial motivation has faded and the practice feels mechanical. Stopping feels like weakness; continuing feels like hollow routine.',
      options: [
        { label: 'Discipline over feeling', description: 'Motivation follows action — do it regardless', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Reconnect with why I started', description: 'The original intention still holds — remember it', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Transform the practice', description: 'If it has become hollow, it needs to evolve — not be abandoned', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Rest without quitting', description: 'A pause is not a surrender — sometimes the practice needs silence', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'You are tempted by something you know will undermine a long-term goal. The temptation is immediate and pleasurable; the goal is distant and abstract.',
      options: [
        { label: 'Resist through willpower', description: 'I am stronger than this impulse', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Understand the temptation', description: 'What need is it trying to meet? Address that instead', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Redirect the energy', description: 'Channel this intensity into something that serves the goal', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Allow a small indulgence', description: 'Rigid denial creates explosive rebellion — allow with awareness', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'You witness someone struggling with a task you could complete effortlessly. Intervening would be efficient but robs them of the growth that comes from struggle.',
      options: [
        { label: 'Do it for them', description: 'Efficiency matters — their struggle is unnecessary', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Coach from the side', description: 'Guide without doing — their growth is the point', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Let them struggle', description: 'The resistance is the teacher — do not interfere', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Offer support when asked', description: 'Be available without being intrusive', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
  ],
  Interpersonal: [
    {
      scenario: 'A trusted ally has been sharing your private struggles with others. Confronting them risks the alliance; staying silent enables the breach.',
      options: [
        { label: 'Confront directly', description: 'Trust must be defended — this is non-negotiable', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Understand their motive first', description: 'People betray trust for reasons — learn the reason', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Set new boundaries without accusation', description: 'Protect without punishing — redesign the container', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Accept the vulnerability', description: 'What is known cannot hurt me — only shame can', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'Two people you care about are in conflict and each asks you to take their side. Neutrality satisfies neither; choosing one damages the other relationship.',
      options: [
        { label: 'Choose the side I believe is right', description: 'Neutrality in conflict is its own form of cowardice', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Hold space for both', description: 'I can love two people who disagree', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Help them see each other', description: 'The conflict is a mirror — help them look into it', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Refuse to be drawn in', description: 'Their conflict is not mine to resolve', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'You enter a group where the established dynamic requires you to play a subordinate role. Your capacity exceeds the role, but challenging it would disrupt the group.',
      options: [
        { label: 'Challenge the hierarchy', description: 'Capability should determine role, not seniority', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Serve within the role', description: 'The group needs stability more than my ambition', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Lead by example, not title', description: 'Authority earned through action outlasts authority given by position', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Find my unique contribution', description: 'Every role has space for genuine expression within it', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
  ],
};

/**
 * Render a dilemma: present a line-specific scenario with genuine developmental tensions.
 * Each option maps to a different drive, enabling differentiated scoring.
 * Uses line-specific dilemma pools when available, falls back to generic.
 */
export function renderDilemma(task: AssessmentTask): {
  prompt: AskUserQuestionParams;
  evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult;
} {
  // Get line-specific dilemmas if available
  const line = (task.parameters.line as string) ?? 'Moral';
  const lineDilemmas = LINE_DILEMMAS[line];
  const dilemmas: LineDilemma[] = lineDilemmas ?? [
    // Fallback: generic dilemmas when line not specified
    {
      scenario: 'You discover your mentor has been lying to protect you. The truth would destroy your faith in them but free you to grow.',
      options: [
        { label: 'I demand the truth — I need to see clearly, even if it hurts', description: 'Agency drive: direct confrontation, self-reliance', drive: 'agency', polarity: 'sts' },
        { label: 'I accept their protection — some truths are too heavy for now', description: 'Agape drive: compassion, acceptance of limitation', drive: 'agape', polarity: 'sto' },
        { label: 'I seek perspective — I need to understand before I act', description: 'Communion drive: relational wisdom, seeking counsel', drive: 'communion', polarity: 'sto' },
        { label: 'I question whether truth matters — growth happens regardless', description: 'Eros drive: transcendent inquiry, meaning-making', drive: 'eros', polarity: 'neutral' },
      ],
    },
    {
      scenario: 'A community depends on a resource that is slowly depleting. Sharing equally means everyone suffers slowly. Hoarding means your group survives but others don\'t.',
      options: [
        { label: 'I share equally — we all carry this burden together', description: 'Agape drive: collective responsibility, equity', drive: 'agape', polarity: 'sto' },
        { label: 'I protect my people — survival comes first', description: 'Agency drive: protective boundary, prioritization', drive: 'agency', polarity: 'sts' },
        { label: 'I search for alternatives — there must be another way', description: 'Eros drive: creative problem-solving, aspiration', drive: 'eros', polarity: 'neutral' },
        { label: 'I build alliances — unity is our strength', description: 'Communion drive: collaboration, collective action', drive: 'communion', polarity: 'sto' },
      ],
    },
    {
      scenario: 'You have the power to heal one person\'s deepest wound, but doing so will temporarily absorb their pain into yourself.',
      options: [
        { label: 'I heal them — their suffering outweighs my discomfort', description: 'Agape drive: selfless service, compassion', drive: 'agape', polarity: 'sto' },
        { label: 'I teach them to heal — empowerment lasts longer than rescue', description: 'Eros drive: developmental focus, growth-oriented', drive: 'eros', polarity: 'neutral' },
        { label: 'I stand witness — being present is itself a form of healing', description: 'Communion drive: empathic presence, relational healing', drive: 'communion', polarity: 'sto' },
        { label: 'I protect my energy — I cannot pour from an empty vessel', description: 'Agency drive: self-preservation, boundary-setting', drive: 'agency', polarity: 'sts' },
      ],
    },
    {
      scenario: 'A rival faction offers alliance against a greater threat, but their values are fundamentally opposed to yours.',
      options: [
        { label: 'I accept — the greater threat demands unity', description: 'Communion drive: pragmatic cooperation, collective survival', drive: 'communion', polarity: 'sto' },
        { label: 'I refuse — values cannot be compromised for convenience', description: 'Agency drive: principled boundary, integrity', drive: 'agency', polarity: 'sts' },
        { label: 'I negotiate — find shared ground without betraying core values', description: 'Agape drive: integrative approach, bridge-building', drive: 'agape', polarity: 'sto' },
        { label: 'I seek a different path — there must be another way', description: 'Eros drive: creative alternatives, visionary thinking', drive: 'eros', polarity: 'neutral' },
      ],
    },
  ];

  const dilemma = dilemmas[Math.floor(Math.random() * dilemmas.length)]!;

  const question = [
    `${C.bold}${dilemma.scenario}${C.reset}`,
    ``,
    `What do you do?`,
  ].join('\n');

  // Shuffle dilemma options (they're already drive-differentiated)
  const shuffledOptions = shuffle([...dilemma.options]);

  return {
    prompt: {
      questions: [{
        question,
        header: 'Moral Reasoning',
        options: shuffledOptions.map(o => ({ label: o.label, description: o.description })),
        allowWriteIn: true,
        multiSelect: false,
      }],
    },
    evaluate: (answer: string, startTimeMs: number, endTimeMs: number): TrialResult => {
      const durationMs = endTimeMs - startTimeMs;
      const answerLower = answer.toLowerCase();

      const matchedOption = shuffledOptions.find(o =>
        answerLower.includes(o.label.toLowerCase()) ||
        answerLower.includes(o.label.toLowerCase())
      );

      // Moral dilemmas: score on OPTION ALIGNMENT + depth of reflection.
      // Each option maps to a drive (agency/communion/eros/agape) — scoring uses
      // the option's correctnessScore to differentiate drive-aligned responses.
      const optionScore = matchedOption?.correctnessScore ?? 0.5;
      const depth = answer.length > 30 ? 0.9 : answer.length > 20 ? 0.7 : answer.length > 10 ? 0.5 : 0.3;
      const responseTime = durationMs < 15000 ? 0.8 : durationMs < 60000 ? 0.6 : 0.4;

      return {
        taskId: task.id,
        timestamp: startTimeMs,
        dimensions: {
          accuracy: optionScore,
          depth,
          response_time: responseTime,
          coherence: matchedOption ? 0.7 : 0.4,
        },
        rawResponse: {
          dilemma: dilemma.scenario,
          answer,
          matchedDrive: matchedOption?.drive ?? null,
          matchedPolarity: matchedOption?.polarity ?? 'neutral',
          correctnessScore: optionScore,
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

// ── Reaction Time Renderer ──────────────────────────────────────────

export function renderReactionTime(_task: AssessmentTask): { prompt: AskUserQuestionParams; evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult; } {
  return {
    prompt: { questions: [{ question: '[PURGED] reaction_time — use run_brain_game', header: 'Reaction Speed', options: [{ label: 'Continue', description: 'Use brain game' }], allowWriteIn: true, multiSelect: false }] },
    evaluate: (_answer: string, startTimeMs: number, endTimeMs: number): TrialResult => ({ taskId: _task.id, timestamp: startTimeMs, dimensions: { accuracy: 0.5 }, rawResponse: {}, durationMs: endTimeMs - startTimeMs }),
  };
}


// ── Rhythm Renderer ──────────────────────────────────────────────────

export function renderRhythm(_task: AssessmentTask): { prompt: AskUserQuestionParams; evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult; } {
  return {
    prompt: { questions: [{ question: '[PURGED] rhythm — use run_brain_game', header: 'Rhythmic Attunement', options: [{ label: 'Continue', description: 'Use brain game' }], allowWriteIn: true, multiSelect: false }] },
    evaluate: (_answer: string, startTimeMs: number, endTimeMs: number): TrialResult => ({ taskId: _task.id, timestamp: startTimeMs, dimensions: { accuracy: 0.5 }, rawResponse: {}, durationMs: endTimeMs - startTimeMs }),
  };
}


// ── Cooperation Renderer ─────────────────────────────────────────────

export function renderCooperation(task: AssessmentTask): {
  prompt: AskUserQuestionParams;
  evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult;
} {
  const question = [
    `A companion stands beside you at a crossroads. They look to you for direction.`,
    ``,
    `${C.bold}How do you lead?${C.reset}`,
  ].join('\n');

  const options: DriveOption[] = [
    { label: 'Decide and lead', description: 'Make the call and invite them to follow', drive: 'agency', polarity: 'sts', correctnessScore: 0.7 },
    { label: 'Decide together', description: 'Find the path through dialogue', drive: 'communion', polarity: 'sto', correctnessScore: 0.9 },
    { label: 'Follow their lead', description: 'Trust their judgment for this one', drive: 'agape', polarity: 'sto', correctnessScore: 0.5 },
    { label: 'Forge a new way', description: 'Neither path is right — create a third', drive: 'eros', polarity: 'neutral', correctnessScore: 0.6 },
  ];
  shuffle(options);

  return {
    prompt: {
      questions: [{
        question,
        header: 'Cooperative Dynamics',
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
          depth: answer.length > 20 ? 0.7 : 0.4,
        },
        rawResponse: {
          answer,
          matchedDrive: matchedOpt?.drive ?? null,
          matchedPolarity: matchedOpt?.polarity ?? 'neutral',
        },
        durationMs,
      };
    },
  };
}

// ── Imitation Renderer ───────────────────────────────────────────────

export function renderImitation(task: AssessmentTask): {
  prompt: AskUserQuestionParams;
  evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult;
} {
  const question = [
    `An elder demonstrates a technique — watch carefully, then replicate.`,
    ``,
    `${C.dim}The elder strikes a pose: grounded, arms extended, breath steady.${C.reset}`,
    ``,
    `${C.bold}Describe how you would replicate this:${C.reset}`,
  ].join('\n');

  const options: DriveOption[] = [
    { label: 'Mirror exactly', description: 'Precision replication — every detail matters', drive: 'agency', polarity: 'neutral', correctnessScore: 0.7 },
    { label: 'Capture the essence', description: 'Feel the intent behind the movement', drive: 'eros', polarity: 'neutral', correctnessScore: 0.8 },
    { label: 'Ask for guidance', description: 'Seek correction before practicing', drive: 'communion', polarity: 'sto', correctnessScore: 0.6 },
    { label: 'Improvise freely', description: 'Make it your own from the start', drive: 'agape', polarity: 'neutral', correctnessScore: 0.4 },
  ];
  shuffle(options);

  return {
    prompt: {
      questions: [{
        question,
        header: 'Imitative Learning',
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
          consistency: matchedOpt ? 0.6 : 0.4,
        },
        rawResponse: {
          answer,
          matchedDrive: matchedOpt?.drive ?? null,
          matchedPolarity: matchedOpt?.polarity ?? 'neutral',
        },
        durationMs,
      };
    },
  };
}

// ── Line-Specific Probe Renderers (G.12) ────────────────────────────
//
// Each intelligence line has unique interaction mechanics per foundations/12.
// These wrap the task-type renderers with line-specific options, headers,
// and evaluation dimensions so each line probes its developmental structure.

const ALL_LINES: readonly Line[] = [
  'Cognitive', 'Emotional', 'Moral', 'Intrapersonal',
  'Spiritual', 'Somatic', 'Willpower', 'Interpersonal',
];

/** Extract the line from task parameters, or null if not specified. */
function getLine(task: AssessmentTask): Line | null {
  const raw = task.parameters.line as string | undefined;
  if (raw && (ALL_LINES as readonly string[]).includes(raw)) return raw as Line;
  return null;
}

// ── Line-specific probe option sets ──────────────────────────────────
// Each line's probes surface different drive signals through distinct
// interaction patterns (not just different labels on the same MCQ).

interface LineProbeOptions {
  header: string;
  options: readonly DriveOption[];
  allowWriteIn: boolean;
}

function cognitiveProbeOptions(): LineProbeOptions {
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

function emotionalProbeOptions(): LineProbeOptions {
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

function moralProbeOptions(): LineProbeOptions {
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

function intrapersonalProbeOptions(): LineProbeOptions {
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

function spiritualProbeOptions(): LineProbeOptions {
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

function interpersonalProbeOptions(): LineProbeOptions {
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

function somaticProbeOptions(): LineProbeOptions {
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

function willpowerProbeOptions(): LineProbeOptions {
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

      const lineDimensions: Record<Line, Partial<Record<import('../types.js').MeasureDimension, number>>> = {
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

// ── Generic Fallback Renderer ────────────────────────────────────────

/**
 * Generic renderer for task types without specific implementations.
 */
export function renderGeneric(task: AssessmentTask): {
  prompt: AskUserQuestionParams;
  evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult;
} {
  const label = TASK_TYPE_LABELS[task.type] ?? task.type;

  const options: DriveOption[] = [
    { label: 'Fully engaged', description: 'I gave it my full attention and effort', drive: 'agency', polarity: 'neutral', correctnessScore: 0.8 },
    { label: 'Partially engaged', description: 'I was somewhat distracted or uncertain', drive: 'communion', polarity: 'neutral', correctnessScore: 0.6 },
    { label: 'Withdrew', description: 'I chose not to engage fully', drive: 'agape', polarity: 'neutral', correctnessScore: 0.3 },
    { label: 'Transcended', description: 'I saw beyond the surface of the task', drive: 'eros', polarity: 'neutral', correctnessScore: 0.7 },
  ];
  shuffle(options);

  return {
    prompt: {
      questions: [{
        question: `${task.description}\n\n${C.bold}How did you engage with this challenge?${C.reset}`,
        header: label,
        options: options.map(o => ({ label: o.label, description: o.description })),
        allowWriteIn: true,
        multiSelect: false,
      }],
    },
    evaluate: (answer: string, startTimeMs: number, endTimeMs: number): TrialResult => {
      const durationMs = endTimeMs - startTimeMs;

      // Detect known MCQ labels for reliable scoring
      const answerLower = answer.toLowerCase().trim();
      const matchedOpt = options.find(o => answerLower.includes(o.label.toLowerCase()));

      // Use correctnessScore from matched option, with word-count bonus for write-ins
      const wordCount = answer.split(/\s+/).filter(Boolean).length;
      const isWriteIn = !matchedOpt && wordCount > 3;

      const baseAccuracy = matchedOpt
        ? matchedOpt.correctnessScore
        : Math.min(0.9, 0.4 + wordCount * 0.02); // Write-in bonus

      const depth = matchedOpt
        ? matchedOpt.correctnessScore
        : wordCount > 15 ? 0.8 : wordCount > 5 ? 0.6 : 0.4;

      return {
        taskId: task.id,
        timestamp: startTimeMs,
        dimensions: {
          accuracy: baseAccuracy,
          depth,
          response_time: durationMs < 30000 ? 0.7 : 0.5,
        },
        rawResponse: {
          answer, wordCount, isWriteIn,
          matchedDrive: matchedOpt?.drive ?? null,
          matchedPolarity: matchedOpt?.polarity ?? 'neutral',
          correctnessScore: matchedOpt?.correctnessScore ?? Math.min(0.9, 0.4 + wordCount * 0.02),
        },
        durationMs,
      };
    },
  };
}

// ── Dispatcher ───────────────────────────────────────────────────────

/**
 * Get the appropriate renderer for a given task type.
 */
export function getRenderer(task: AssessmentTask): {
  prompt: AskUserQuestionParams;
  evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult;
} {
  const line = getLine(task);

  if (line) {
    const LINE_RENDERERS: Record<Line, (t: AssessmentTask) => {
      prompt: AskUserQuestionParams;
      evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult;
    }> = {
      Cognitive: renderCognitiveProbe,
      Emotional: renderEmotionalProbe,
      Moral: renderMoralProbe,
      Intrapersonal: renderIntrapersonalProbe,
      Spiritual: renderSpiritualProbe,
      Somatic: renderSomaticProbe,
      Willpower: renderWillpowerProbe,
      Interpersonal: renderInterpersonalProbe,
    };
    return LINE_RENDERERS[line](task);
  }

  switch (task.type) {
    case 'n_back': return renderNBack(task);
    case 'stroop': return renderStroop(task);
    case 'go_no_go': return renderGoNoGo(task);
    case 'hold': return renderHold(task);
    case 'pattern_prediction': return renderPatternPrediction(task);
    case 'emotion_identification': return renderEmotionIdentification(task);
    case 'dilemma':
    case 'scenario': return renderDilemma(task);
    case 'self_report': return renderSelfReport(task);
    case 'value_ranking': return renderValueRanking(task);
    case 'reaction_time': return renderReactionTime(task);
    case 'rhythm': return renderRhythm(task);
    case 'cooperation': return renderCooperation(task);
    case 'imitation': return renderImitation(task);
    default: return renderGeneric(task);
  }
}

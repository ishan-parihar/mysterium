/**
 * CalibrationCorpus — pre-authored onboarding probes for when the LLM is unavailable.
 *
 * The sibling of `FallbackProvider`, for the OTHER half of the game. `FallbackProvider` covers
 * ENCOUNTER narrative; this covers the ONBOARDING questionnaire, which is a different contract
 * (AgenticProbe: 4 tagged options + 1 free input) and a different failure.
 *
 * WHY THIS EXISTS. `CalibrationAgent.generateProbe` had exactly two outcomes: call the provider,
 * or `throw new Error('LLM not configured server-side')`. `/api/agent/probe` catches that and emits
 * an `{ error }` frame at HTTP 200, which `onboarding/+page.svelte` treats as a signal to set
 * `llmOffline` and redirect the player to `/setup`. So a KEYLESS DEPLOY COULD NOT ONBOARD — the
 * one claim the no-LLM deployment mode (D-1) is built to make. The game engine had a corpus path;
 * the questionnaire did not.
 *
 * WHY IT IS A CORPUS AND NOT A GENERATOR. The polarities are the diagnostic instrument: which
 * quadrant a player reaches for, and when, is the signal the DirectorAgent reads to decide when
 * calibration is sufficient. A generator that varied the wording freely would vary the instrument
 * with it. So these are FIXED, hand-authored, and deliberately ordered to sweep all four
 * polarities — the spread is the measurement, and a stable instrument is worth more here than a
 * varied one. `signalWeight` therefore follows a fixed ramp rather than being computed: the
 * DirectorAgent needs signal to accumulate, and a corpus that never terminates calibration would
 * strand the player in a loop.
 *
 * Veil register: the prompt asks, it never diagnoses. `metadata.intent` is phrased as the
 * agent's own intent ("I want to know where you stand…"), never as a claim about the player, and
 * `trajectory` names a direction, not a result. This is the same discipline the LLM system prompt
 * is given, and it is the reason the corpus is authored rather than templated.
 *
 * Location note: this sits beside `FallbackProvider.ts` in `src/core/fallback/` because it is the
 * same concern — pre-authored content that exists exclusively as a degradation target. The LLM
 * transport layer must not own it.
 */

/** Mirrors `AgenticProbePolarity`; kept local so the fallback carries no import from the LLM path. */
export type CorpusPolarity = 'action' | 'reflective' | 'communion' | 'integrative';

export interface CorpusProbe {
  /** Stable id. The corpus is deterministic, so this is content-addressed, not random. */
  readonly id: string;
  readonly prompt: string;
  /** EXACTLY four, one per polarity. Order is fixed: the spread is the instrument. */
  readonly options: readonly {
    readonly label: string;
    readonly polarity: CorpusPolarity;
  }[];
  readonly freeInputPlaceholder: string;
  readonly metadata: {
    readonly intent: string;
    readonly trajectory: string;
    readonly signalWeight: number;
  };
}

// SIGNAL RAMP. Calibration completes on accumulated signal, so a constant weight would either
// never finish or finish on probe one. The ramp rises across the set: early probes are coarse
// orientation, later ones carry the weight that closes calibration. Twelve entries for twelve
// probes — a shorter ramp left the final probe short of 1.0, so the last (and most decisive)
// question was worth the least.
const RAMP = [0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.7, 1.0] as const;

function probe(
  index: number,
  id: string,
  prompt: string,
  freeInputPlaceholder: string,
  intent: string,
  trajectory: string,
  options: readonly [string, CorpusPolarity][],
): CorpusProbe {
  return {
    id,
    prompt,
    options: options.map(([label, polarity]) => ({ label, polarity })),
    freeInputPlaceholder,
    metadata: { intent, trajectory, signalWeight: RAMP[index] ?? 1 },
  };
}

/**
 * The authored set. Twelve probes, each sweeping all four polarities, ordered from the most
 * concrete (a concrete past action) to the most abstract (holding a contradiction) — the
 * trajectory moves outward through the quadrants as calibration proceeds.
 */
export const CALIBRATION_CORPUS: readonly CorpusProbe[] = [
  probe(
    0,
    'cal-01',
    'Think of something you finished recently — small counts. When it was done, what did you do first?',
    'The first thing you did, however small.',
    'I want to know where you start when something begins.',
    'From concrete action toward how you make sense of it.',
    [
      ['I began right away', 'action'],
      ['I sat with it for a while first', 'reflective'],
      ['I told someone what I was doing', 'communion'],
      ['I looked for a way it connected to something larger', 'integrative'],
    ],
  ),
  probe(
    1,
    'cal-02',
    'When something goes wrong and nobody is watching, what is your first honest reaction?',
    'The reaction you would not usually say out loud.',
    'I want to know what you do before you decide what to show.',
    'From what you do, toward what you defend.',
    [
      ['I fix it or push through', 'action'],
      ['I notice it first and pause', 'reflective'],
      ['I check whether it affects anyone', 'communion'],
      ['I ask whether it was supposed to go this way', 'integrative'],
    ],
  ),
  probe(
    2,
    'cal-03',
    'Someone you respect disagrees with you about something that matters. What happens next?',
    'What you actually do in the first hour.',
    'I want to know what you do with a real disagreement.',
    'From reaction, toward relationship.',
    [
      ['I make my case until it lands', 'action'],
      ['I go quiet and think about it', 'reflective'],
      ['I ask what they are seeing that I am not', 'communion'],
      ['I wonder if we are both partly right', 'integrative'],
    ],
  ),
  probe(
    3,
    'cal-04',
    'You have free time and nothing pressing. What do you reach for?',
    'The first thing that comes to mind.',
    'I want to know what you choose when nothing requires it.',
    'From default, toward intention.',
    [
      ['Something I can finish', 'action'],
      ['Something that asks me to think', 'reflective'],
      ['Someone I have not spoken to in a while', 'communion'],
      ['Something that would change how I see things', 'integrative'],
    ],
  ),
  probe(
    4,
    'cal-05',
    'You made a mistake that cost someone else time. What stays with you?',
    'Whatever is still true about it now.',
    'I want to know what you do with a cost you caused.',
    'From the mistake, toward repair.',
    [
      ['I fix what I can, immediately', 'action'],
      ['I replay it looking for the moment it went wrong', 'reflective'],
      ['I think about what it was like for them', 'communion'],
      ['I hold that I did it and that it does not define me', 'integrative'],
    ],
  ),
  probe(
    5,
    'cal-06',
    'You are good at something. How do you usually find out what you are good at?',
    'The most recent evidence.',
    'I want to know how you find out what you are capable of.',
    'From skill, toward how you know it.',
    [
      ['I am told, or the result shows it', 'action'],
      ['I notice I am calmer doing it', 'reflective'],
      ['Other people tell me it comes easily to me', 'communion'],
      ['It fits something I am trying to become', 'integrative'],
    ],
  ),
  probe(
    6,
    'cal-07',
    'Something you want is in reach, but getting it means someone else loses out. What happens?',
    'What you actually do, not what you would wish.',
    'I want to know where you draw a line for something you want.',
    'From want, toward what you will trade.',
    [
      ['I take it and manage the consequences', 'action'],
      ['I would want a day before deciding', 'reflective'],
      ['I would talk to the other person first', 'communion'],
      ['I would ask what the whole situation is actually about', 'integrative'],
    ],
  ),
  probe(
    7,
    'cal-08',
    'You have been stuck on the same problem for a while. What changes?',
    'The thing that actually breaks the stuckness.',
    'I want to know what unsticks you.',
    'From stuckness, toward the way through.',
    [
      ['I try harder, differently', 'action'],
      ['I stop and look at it fresh', 'reflective'],
      ['I ask someone who has seen it before', 'communion'],
      ['I reconsider what I am actually being asked to solve', 'integrative'],
    ],
  ),
  probe(
    8,
    'cal-09',
    'You are asked to change your mind about something you feel strongly about. What would it take?',
    'What evidence would move you.',
    'I want to know how your mind changes.',
    'From conviction, toward revision.',
    [
      ['Something I can see for myself', 'action'],
      ['Time, and enough distance from it', 'reflective'],
      ['Someone I respect saying it differently', 'communion'],
      ['A better question than the one I was answering', 'integrative'],
    ],
  ),
  probe(
    9,
    'cal-10',
    'You are at a threshold — leaving something familiar. What is loudest?',
    'The loudest thing, in your words.',
    'I want to know what governs a threshold for you.',
    'From the decision, toward what it is really about.',
    [
      ['What I will have after', 'action'],
      ['What I will have left behind', 'reflective'],
      ['Who I am leaving, and how', 'communion'],
      ['Who I am becoming by going', 'integrative'],
    ],
  ),
  probe(
    10,
    'cal-11',
    'Someone you love is not doing well and has not asked for help. What do you do?',
    'What you would actually do tomorrow.',
    'I want to know how you show up when it matters.',
    'From care, toward the form it takes.',
    [
      ['I show up and keep showing up', 'action'],
      ['I give them room, and stay near', 'reflective'],
      ['I tell them plainly that I am here', 'communion'],
      ['I hold that I cannot fix it and can still be present', 'integrative'],
    ],
  ),
  probe(
    11,
    'cal-12',
    'Last one. If this whole practice were to change one thing about how you move through a day, what would it be?',
    'The one change.',
    'I want to close on what you actually want from this.',
    'From everything so far, toward the whole.',
    [
      ['I would act on what I already know', 'action'],
      ['I would stop rushing past my own thinking', 'reflective'],
      ['I would be more present with the people around me', 'communion'],
      ['I would hold more of it at once without needing it resolved', 'integrative'],
    ],
  ),
];

/**
 * Deterministic selection. Seeded by the session's own answers rather than randomness, so the same
 * player sees the same sequence on every visit (the corpus is an instrument — a player who sees a
 * different probe on reload cannot be compared to their own earlier answers) while a different
 * session still walks a different path through the set.
 */
export function selectCalibrationProbe(
  progress: number,
  _confidence: number,
): CorpusProbe {
  const p = CALIBRATION_CORPUS;
  // `progress` is the Director's probe count; modulo wraps for a long calibration, which is
  // correct: the set is a cycle of orientations, not a script with an end.
  const step = Math.min(Math.max(Math.floor(progress), 0), p.length - 1);
  // SELECTION IS BY POSITION ONLY. This previously shifted by `confidence >= 0.5 ? 6 : 0`, on the
  // reasoning that a Director who already trusts the player should start on the subtler half. It
  // fired on the ONLY path a keyless player has, mid-run, and served cal-01, cal-02, cal-03,
  // cal-04, cal-11, cal-12 — six authored probes never seen, in an order the module's own
  // doc-comment says is most-concrete-to-most-abstract. The offset corrected nothing because
  // `nextCalibrationConfidence` already rises monotonically through the ramp; it only inserted the
  // discontinuity. Measured over the client's six-probe cap: the ramp alone carries confidence
  // 0.15 → 0.32 → 0.49 → 0.643 → 0.768 → 0.861, clearing CALIBRATION_THRESHOLD on probe 6.
  // `_confidence` is kept in the signature because the Director passes it and the LLM path's
  // selection genuinely is driven by confidence — only the corpus path is positional.
  return p[step % p.length]!;
}

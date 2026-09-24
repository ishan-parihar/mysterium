/**
 * Validation personas — synthetic players with ground truth BY CONSTRUCTION.
 *
 * Spec: docs/validation/BENCHMARK-ARCHITECTURE.md §2.2–§3.
 *
 * A persona's policy is a pure function (encounter, step) → PlayerResponse that
 * encodes "what a player of this type does". The benchmark's gates then demand
 * that the engine's internal model (CCI, shadow ledger, drive weights, strategy
 * themes, knowledge state) agree with the encoded *type*, not with any single
 * response. Policies are index-parameterized so they are deterministic
 * regardless of which encounter the scheduler offers.
 *
 * These personas are benchmark fixtures, not game content: they never reach the
 * Veil surface and are never shown to a player.
 */
import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';
import { ALL_DRIVES } from '../domain/Drive.js';
import type { Drive } from '../domain/Drive.js';
import type {
  DriveDirectionality,
  EnergeticDirection,
  ShadowQuadrant,
  SourceOfNourishment,
  StageOrientation,
} from '../domain/enums.js';
import type { ScheduledEncounter } from '../domain/EncounterSpecNew.js';
import type { PlayerResponse } from '../engines/ConsequenceEngine.js';

// ---------------------------------------------------------------------------
// Response policy building blocks
// ---------------------------------------------------------------------------

export type DriveOverride =
  | Partial<Record<Drive, DriveDirectionality>>
  | ((step: number) => Partial<Record<Drive, DriveDirectionality>>);

export interface PolicyOptions {
  /** Per-drive directionality override (static or per-step). Default: all HealthyBalanced. */
  drives?: DriveOverride;
  energeticDirection?: EnergeticDirection;
  stageOrientation?: StageOrientation;
  sourceOfNourishment?: SourceOfNourishment;
  /** Shadow surfacing: static quadrant, per-step, or null (never). Default: null. */
  surfaceShadow?: ShadowQuadrant | null | ((step: number) => ShadowQuadrant | null);
  /** Narrative length drives the quality estimator (>=40 words = full bonus). */
  words?: number;
  /** Empty narrative = avoidance in the engine's eyes (isAvoided path). */
  avoid?: boolean;
  /**
   * Real prose for the write-in, cycled by step (`Phase 16 d2`).
   *
   * The default narrative is 50 generated filler tokens (`w0 w1 w2 …`), which is deliberate: it makes
   * the reflective-depth estimator's word-count/density heuristics measurable without injecting
   * vocabulary the OTHER channel reads. But it also means the shadow-KEYWORD channel
   * (`detectWriteInShadow`, the module path's only route to a non-healthy drive signal) can never
   * fire in a campaign — so "does the keyword detector work end to end" was untestable, and every
   * drive signal was `HealthyBalanced` by construction.
   *
   * A persona whose stance is a shadow stance carries prose here, in the vocabulary that stance would
   * actually use. This is not a substitute for `declaredDirectionality` — it answers the opposite
   * question. Prose exercises the detector as production does (a real player's words, matched by
   * keyword); the declaration supplies the multi-drive model the detector structurally cannot express
   * (it emits at most ONE drive's signal). A reading must be attributable to one of them, which is why
   * `EncounterProvenance.declaredStance` records the channel.
   */
  prose?: readonly string[];
}

export type ResponsePolicy = (encounter: ScheduledEncounter, step: number) => PlayerResponse;

/** Build a deterministic response policy from trait options. */
export function policy(options: PolicyOptions): ResponsePolicy {
  return (encounter: ScheduledEncounter, step: number): PlayerResponse => {
    const drives: Record<Drive, DriveDirectionality> = {
      Agency: 'HealthyBalanced',
      Communion: 'HealthyBalanced',
      Eros: 'HealthyBalanced',
      Agape: 'HealthyBalanced',
    };
    if (options.drives) {
      const override = typeof options.drives === 'function' ? options.drives(step) : options.drives;
      for (const d of ALL_DRIVES) {
        const v = override[d];
        if (v) drives[d] = v;
      }
    }
    const rawShadow = options.surfaceShadow ?? null;
    const shadowSurfaced = typeof rawShadow === 'function' ? rawShadow(step) : rawShadow;
    const words = options.words ?? 45;
    const narrative = options.avoid
      ? ''
      : options.prose && options.prose.length > 0
        ? options.prose[((step % options.prose.length) + options.prose.length) % options.prose.length]!
        : Array.from({ length: words }, (_, i) => `w${(step * 7 + i) % 50}`).join(' ');
    return {
      encounterId: encounter.id,
      energeticDirection: options.energeticDirection ?? 'Radiative',
      driveDirectionality: drives,
      stageOrientation: options.stageOrientation ?? 'ReachingHigher',
      sourceOfNourishment: options.sourceOfNourishment ?? 'HigherRealm',
      shadowSurfaced,
      shadowResolvedId: null,
      narrativeSummary: narrative,
    };
  };
}

// ---------------------------------------------------------------------------
// Trajectory plans
// ---------------------------------------------------------------------------

export interface TrajectoryPlan {
  sessions: number;
  encountersPerSession: number;
  /** session index → gap in days BEFORE that session (temporal personas). */
  gapDaysBeforeSession?: Record<number, number>;
}

// ---------------------------------------------------------------------------
// Expectations (per-persona ground truth; population gates live in gates.ts)
// ---------------------------------------------------------------------------

export interface PersonaExpectations {
  /** Strategy themes that must NEVER appear for this persona. */
  themeAvoids?: readonly string[];
  /** At least one session theme must be in this set (when non-empty). */
  themeIncludes?: readonly string[];
  /** Stage must never exceed this at any observed session end (G8). */
  stageMustRemain?: Stage;
}

// ---------------------------------------------------------------------------
// The persona set
// ---------------------------------------------------------------------------

export interface PersonaSpec {
  name: string;
  description: string;
  roleFocus: string;
  altitudes: Record<Line, Stage>;
  currentStage: Stage;
  knowledgeLine?: Line;
  policy: ResponsePolicy;
  /** When true the harness applies this persona's policy to EVERY offer the
   *  scheduler makes per tick (developmental + curriculum + training beats),
   *  not just the primary offer. Used by learning personas so curriculum
   *  beats — which are interleaved after the primary offer — are consumed. */
  consumesAllOffers?: boolean;
  expectations: PersonaExpectations;
  trajectory: TrajectoryPlan;
}

const RED_ALL: Record<Line, Stage> = {
  Cognitive: 'Red', Emotional: 'Red', Moral: 'Red', Intrapersonal: 'Red',
  Spiritual: 'Red', Somatic: 'Red', Willpower: 'Red', Interpersonal: 'Red',
};

/**
 * The therapy-arc persona (G4): sessions 1..K surface heavily with addiction
 * signals; later sessions engage healthily, which the engine's
 * implicit-integration rule should convert into shadow RESOLUTION.
 */
const therapyArcPolicy: ResponsePolicy = (encounter, step) => {
  const perSession = 6;
  const session = Math.floor(step / perSession);
  const healthy = session >= 1; // surfacing session 0, healthy engagement after
  if (healthy) return policy({ words: 45 })(encounter, step);
  return policy({
    drives: (s) => {
      const target = ALL_DRIVES[s % ALL_DRIVES.length]!;
      const out: Partial<Record<Drive, DriveDirectionality>> = {};
      for (const d of ALL_DRIVES) out[d] = d === target ? 'DarkAddicted' : 'HealthyBalanced';
      return out;
    },
    surfaceShadow: (s) => (s % 2 === 0 ? 'DarkAddiction' : 'DarkAllergy'),
    energeticDirection: 'Absorptive',
    stageOrientation: 'Regressive',
    // The surfacing sessions speak in the vocabulary their shadow would use — addiction on the even
    // steps, aversion on the odd ones, matching `surfaceShadow`'s alternation (Phase 16 d2).
    prose: step % 2 === 0 ? DARK_ADDICTION_PROSE : DARK_AVERSION_PROSE,
    words: 30,
  })(encounter, step);
};

// ---------------------------------------------------------------------------
// Prose for the write-in (Phase 16 d2)
// ---------------------------------------------------------------------------
//
// Each set is written in the vocabulary its stance would actually use, so the shadow-KEYWORD channel
// (`shadowSignals.detectWriteInShadow`, the module path's only route to a non-healthy drive signal) is
// exercised end to end. The filler default (`w0 w1 …`) stays for personas with no shadow stance: it
// keeps the reflective-depth estimator's word-count heuristics measurable without injecting
// vocabulary the OTHER channel reads. Every line here is >= 40 words so the depth estimator's full
// bonus is reached on all four (the same length the `words: 45` default targets).

/** Agency-clinging: control, dominance, force — `darkAddiction` vocabulary. */
const DARK_ADDICTION_PROSE: readonly string[] = [
  'What I felt was the need to take control of the situation before it took control of me, and the only way I could see was to force the issue, dominate the exchange, and prove myself against the person standing in front of me, because anything less felt like being made weak in front of everyone.',
  'I wanted to win, and I wanted them to know I had won, so I pushed hard, asserted myself, made them pay for the earlier slight, and told myself afterwards that a person who cannot defend their position deserves what they get from someone who can, that this is simply how the world works.',
];

/** Withdrawal and refusal — `darkAversion` vocabulary. */
const DARK_AVERSION_PROSE: readonly string[] = [
  'Honestly I wanted to withdraw from the whole thing, refuse the encounter, and avoid the person entirely, because it did not feel worth the effort and I could not be bothered to open a conversation that would end the same way it always does, with me too tired to keep going and the world as broken as it was before I started.',
  'My first instinct was to numb out, turn off, and just leave it, since nothing will change and I am not my brother\u2019s responsibility anyway, and when I am overwhelmed like this the only thing that works is to shut down and wait until the feeling passes and the day is over.',
];

/** Spiritual bypass — `goldenAddiction` vocabulary. */
const GOLDEN_ADDICTION_PROSE: readonly string[] = [
  'I did not really engage with the difficulty because I could see it was all part of the process and everything happens for a reason, so there was nothing to work on, only something to transcend, and from that higher self perspective the problem dissolves into pure awareness without needing any action from me at all.',
  'I would rise above it rather than sit in it, because I am already beyond that kind of reaction and the ego is not who I am, so the honest answer is that I skipped past the feeling and let go, trusting that only love exists and that nothing here is real enough to deserve my attention.',
];

export const PERSONAS: readonly PersonaSpec[] = [
  {
    name: 'flourishing',
    description: 'Healthy, reflective, growth-oriented engagement on every axis; consumes all offered beats.',
    roleFocus: 'Master/Guide',
    altitudes: RED_ALL,
    currentStage: 'Red',
    knowledgeLine: 'Cognitive',
    policy: policy({ words: 45 }),
    consumesAllOffers: true,
    expectations: { stageMustRemain: 'Red' },
    trajectory: { sessions: 2, encountersPerSession: 5 },
  },
  {
    name: 'constricted',
    description: 'Relational avoidance: Communion averted, avoidant encounters, dark-shadow surfacing on the interpersonal axis.',
    roleFocus: 'Therapist',
    altitudes: RED_ALL,
    currentStage: 'Red',
    knowledgeLine: 'Cognitive',
    policy: policy({
      drives: { Communion: 'DarkAverted' },
      surfaceShadow: (s) => (s % 2 === 0 ? 'DarkAllergy' : null),
      avoid: true,
      stageOrientation: 'IntegratingLower',
      words: 0,
    }),
    expectations: {},
    // 4 sessions × 6 encounters: Communion fixation accrues +0.03/encounter →
    // 0.72 by trajectory end, crossing the needs-detector's 0.6 drive_rebalance
    // threshold (calibrated 2026-09-15; see BENCHMARK-ARCHITECTURE.md §7).
    //
    // CORRECTED 2026-09-24 (Phase 16 d2): this expectation was UNREACHABLE when it was written.
    // `avoid: true` makes the write-in empty, and the drive signal reached the engine only through
    // the derived evaluation — which emits a pathological signal solely from a shadow KEYWORD in the
    // free text (empty here) or the LLM's per-drive enum (absent in the hermetic tier). So Communion
    // fixation sat at 0 for this persona, and the comment described a behaviour no harness could
    // produce. It is reachable now via `declaredDirectionality` (the campaign passes the stance this
    // policy already computes), which is the channel `cohort.ts`'s authored tilts use.
    trajectory: { sessions: 4, encountersPerSession: 6 },
  },
  {
    name: 'approaching-threshold',
    description: 'Healthy maximal coverage — saturation accumulates, but the transformation gate must hold.',
    roleFocus: 'Master',
    altitudes: RED_ALL,
    currentStage: 'Red',
    policy: policy({ words: 45 }),
    expectations: { stageMustRemain: 'Red' },
    trajectory: { sessions: 2, encountersPerSession: 5 },
  },
  {
    name: 'golden-bypass',
    description: 'Spiritual bypass: success-shaped signals (HigherRealm, ReachingHigher) while golden shadows accumulate.',
    roleFocus: 'Therapist',
    altitudes: RED_ALL,
    currentStage: 'Red',
    policy: policy({
      drives: { Eros: 'GoldenAddicted' },
      surfaceShadow: (s) => (s % 3 === 0 ? 'GoldenAddiction' : null),
      sourceOfNourishment: 'HigherRealm',
      stageOrientation: 'ReachingHigher',
      // Success-shaped vocabulary on every step: the golden-addiction signals are what the KEYWORD
      // channel must find here, so the persona's words must carry them (Phase 16 d2).
      prose: GOLDEN_ADDICTION_PROSE,
      words: 45,
    }),
    expectations: {},
    trajectory: { sessions: 2, encountersPerSession: 5 },
  },
  {
    name: 'fast-learner',
    description: 'Consumes every offered beat (developmental + curriculum + training) and passes all of them.',
    roleFocus: 'Teacher',
    altitudes: RED_ALL,
    currentStage: 'Red',
    knowledgeLine: 'Cognitive',
    policy: policy({ words: 45 }),
    consumesAllOffers: true,
    expectations: {},
    trajectory: { sessions: 2, encountersPerSession: 5 },
  },
  {
    name: 'slow-steady-learner',
    description: 'Passes 2 of 3 encounters; slower depth progression, still forward.',
    roleFocus: 'Teacher',
    altitudes: RED_ALL,
    currentStage: 'Red',
    knowledgeLine: 'Cognitive',
    policy: policy({
      drives: (s) => (s % 3 === 2 ? { Communion: 'DarkAverted' } : {}),
      words: 20,
    }),
    expectations: {},
    trajectory: { sessions: 2, encountersPerSession: 5 },
  },
  {
    name: 'surface-learner',
    description: 'Alternates passing with averted engagement; shallow depth expected.',
    roleFocus: 'Teacher',
    altitudes: RED_ALL,
    currentStage: 'Red',
    knowledgeLine: 'Cognitive',
    policy: policy({
      drives: (s) => (s % 2 === 1 ? { Communion: 'DarkAverted', Eros: 'DarkAverted' } : {}),
      words: 6,
    }),
    expectations: {},
    trajectory: { sessions: 2, encountersPerSession: 5 },
  },
  {
    name: 'stalled-learner',
    description: 'Consumes every offered beat but averts every drive; retention must decay, depth must never advance.',
    roleFocus: 'Teacher',
    altitudes: RED_ALL,
    currentStage: 'Red',
    knowledgeLine: 'Cognitive',
    policy: policy({
      drives: { Agency: 'DarkAverted', Communion: 'DarkAverted', Eros: 'DarkAverted', Agape: 'DarkAverted' },
      stageOrientation: 'Homeostatic',
      words: 2,
    }),
    consumesAllOffers: true,
    expectations: {},
    trajectory: { sessions: 2, encountersPerSession: 5 },
  },
  {
    name: 'therapy-arc',
    description: 'Surfaces heavily in session 1, then engages healthily — shadows must resolve (the therapy gate).',
    roleFocus: 'Therapist',
    altitudes: RED_ALL,
    currentStage: 'Red',
    policy: therapyArcPolicy,
    expectations: {},
    trajectory: { sessions: 3, encountersPerSession: 6 },
  },
  {
    name: 'exited-and-returning',
    description: 'Healthy engagement, then a 45-day absence — theta decay and returner care must engage.',
    roleFocus: 'Guide',
    altitudes: RED_ALL,
    currentStage: 'Red',
    knowledgeLine: 'Cognitive',
    policy: policy({ words: 45 }),
    expectations: {},
    trajectory: { sessions: 2, encountersPerSession: 5, gapDaysBeforeSession: { 1: 45 } },
  },
];

export function getPersona(name: string): PersonaSpec {
  const p = PERSONAS.find((x) => x.name === name);
  if (!p) throw new Error(`Unknown persona: ${name}`);
  return p;
}

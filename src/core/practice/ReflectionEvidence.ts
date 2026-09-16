/**
 * ReflectionEvidence — the reflection rubric and the reflection→engine bridge
 * (doc 39 §3.3–§3.4).
 *
 * Depth rubric (scored, never shown as a score): 1 = factual log, 2 =
 * emotional naming, 3 = mechanism insight, 4 = pattern linkage, 5 = reframe.
 * Positivity, grammar, and length are explicitly unscored. The rubric's only
 * faking-resistance claim is honest: depth-of-processing is harder to fake
 * than outcome claims.
 *
 * processReflection turns a check-in into a REAL-WORLD CATALYST EVENT fed
 * through processOutcome/applyConsequences — the game loop and the life loop
 * become one economy (39 §3.4).
 */
import type { ReflectionRecord } from '../domain/SharedTypes.js';
import type { Significator } from '../domain/Significator.js';
import type { WorldState } from '../engines/EncounterScheduler.js';
import type { ScheduledEncounter } from '../domain/EncounterSpecNew.js';
import type { Line } from '../domain/Line.js';
import { processOutcome, applyConsequences } from '../engines/ConsequenceEngine.js';

// ---------------------------------------------------------------------------
// Depth rubric (deterministic, offline-safe)
// ---------------------------------------------------------------------------

export type DepthScore = 1 | 2 | 3 | 4 | 5;

const PATTERN_MARKERS = [
  'same as', 'like when', 'again', 'pattern', 'connects', 'reminds', 'always', 'usually',
  'keep ', 'tend to', 'every time', 'similar',
];
const MECHANISM_MARKERS = [
  'because', 'since', 'so that', 'which is why', 'the reason', 'leads to', 'causes',
  'makes me', 'triggers', 'results in',
];
const REFRAME_MARKERS = [
  'i used to think', 'now i see', 'part of me', 'i am becoming', 'what if i', 'instead of trying',
  'a new way', 'i can choose', 'it means something different',
];
const EMOTION_MARKERS = [
  'felt', 'feeling', 'anxious', 'calm', 'tense', 'warm', 'heavy', 'light', 'afraid', 'curious',
  'proud', 'ashamed', 'angry', 'sad', 'glad', 'tired', 'restless', 'numb',
];

/**
 * Score a reflection's processing depth from its free-text answers.
 * Highest marker tier wins; pure factual logs land at 1. Deterministic and
 * dependency-free so it degrades gracefully offline (39 P1 requirement).
 */
export function scoreReflectionDepth(answers: readonly string[]): DepthScore {
  const text = answers.join(' ').toLowerCase();
  if (text.trim().length === 0) return 1;
  if (REFRAME_MARKERS.some((m) => text.includes(m))) return 5;
  if (PATTERN_MARKERS.some((m) => text.includes(m))) return 4;
  if (MECHANISM_MARKERS.some((m) => text.includes(m))) return 3;
  if (EMOTION_MARKERS.some((m) => text.includes(m))) return 2;
  return 1;
}

/** Build the five-prompt protocol (39 §3.3) — fixed structure, Veil-safe. */
export const REFLECTION_PROMPTS: readonly string[] = [
  'What happened?',
  'What did you notice?',
  'What was hard?',
  'What does it connect to?',
  "What's next?",
];

// ---------------------------------------------------------------------------
// Reflection → engine evidence
// ---------------------------------------------------------------------------

export interface ReflectionEvidence {
  /** Attempted the exposure/practice step (relief applies regardless of outcome). */
  readonly attempted: boolean;
  /** Service-act reflection → STO polarity weight. */
  readonly serviceAct: boolean;
  /** Approach vs avoidance expression in the answers. */
  readonly approach: boolean;
  /** The objective's primary line (theta refresh target). */
  readonly primaryLine: Line;
}

const APPROACH_MARKERS = ['tried', 'went', 'did it', 'showed up', 'started', 'practiced', 'asked', 'spoke'];
const AVOID_MARKERS = ['avoided', 'put off', 'did not', "didn't", 'skipped', 'froze', 'postponed'];
const SERVICE_MARKERS = ['helped', 'listened', 'gave', 'supported', 'served', 'cared for', 'showed up for'];

export function classifyReflection(record: ReflectionRecord, primaryLine: Line): ReflectionEvidence {
  const text = record.prompts.map((p) => p.answer).join(' ').toLowerCase();
  return {
    attempted: APPROACH_MARKERS.some((m) => text.includes(m)),
    serviceAct: SERVICE_MARKERS.some((m) => text.includes(m)),
    approach: APPROACH_MARKERS.some((m) => text.includes(m)) && !AVOID_MARKERS.some((m) => text.includes(m)),
    primaryLine,
  };
}

/**
 * Normalize a ReflectionRecord into a consequence record and apply it as a
 * real-world catalyst event. The synthetic encounter is the life-loop carrier:
 * modality LanguageReflective (journal = verbal metacognition), the vow's
 * primary line, current stage. Shadow pressure RELIEF is applied when an
 * exposure step was attempted (resolvedId on the vow's active shadow), per
 * 39 §3.4: regardless of "success".
 *
 * Returns the advanced state and the applied flag; the caller persists the
 * ReflectionRecord on the Significator (VowService.checkIn already does).
 */
export function processReflection(
  sig: Significator,
  world: WorldState,
  record: ReflectionRecord,
  evidence: ReflectionEvidence,
  synthetic: Omit<ScheduledEncounter, 'id' | 'moduleRef' | 'modality' | 'targetLines' | 'stage' | 'holonSource' | 'shadowTarget' | 'polarityMode' | 'difficulty' | 'sessionPosition' | 'priority' | 'driveTarget' | 'executionMode'> & Partial<Pick<ScheduledEncounter, 'difficulty'>>,
  now: number,
): { sig: Significator; world: WorldState; applied: boolean } {
  // Find an active shadow on the primary line for relief when attempted.
  const activeShadow = sig.shadows.entries.find((e) => e.line === evidence.primaryLine && e.resolvedAt === null);

  const encounter: ScheduledEncounter = {
    id: `life-${record.id}`,
    moduleRef: 'journal.checkin',
    modality: 'LanguageReflective',
    targetLines: [evidence.primaryLine],
    stage: sig.currentStage,
    holonSource: 'journal',
    shadowTarget: evidence.attempted && activeShadow ? activeShadow.quadrant : null,
    polarityMode: 'Exploring',
    difficulty: synthetic.difficulty ?? 0.5,
    sessionPosition: 'cooldown',
    priority: 0,
    driveTarget: null,
    executionMode: 'practice',
  };

  const response = {
    encounterId: encounter.id,
    energeticDirection: evidence.approach ? ('Radiative' as const) : ('Diffuse' as const),
    // All-drives-healthy engagement = the implicit-integration posture (14).
    driveDirectionality: {
      Agency: 'HealthyBalanced', Communion: 'HealthyBalanced',
      Eros: 'HealthyBalanced', Agape: 'HealthyBalanced',
    } as Record<'Agency' | 'Communion' | 'Eros' | 'Agape', 'HealthyBalanced'>,
    stageOrientation: 'IntegratingLower' as const,
    sourceOfNourishment: 'Ambivalent' as const,
    shadowSurfaced: null,
    // THE RELIEF: attempted exposure steps resolve the line's active shadow
    // regardless of outcome — life-loop engagement is metabolization.
    shadowResolvedId: evidence.attempted && activeShadow ? activeShadow.id : null,
    narrativeSummary: record.prompts[0]?.answer?.slice(0, 200) ?? '',
  };

  try {
    const consequence = processOutcome(encounter, response, now);
    const applied = applyConsequences(sig, world, consequence, encounter);
    return { sig: applied.sig, world: applied.world, applied: true };
  } catch {
    // Offline/degradation safety: the reflection is still recorded (checkIn
    // persists it); only the engine integration is skipped.
    return { sig, world, applied: false };
  }
}

/**
 * QualitativeFeedback — Veil-compliant qualitative feedback mapper.
 *
 * UX-01 fix (per Task 4-mysterium-ux-audit). Currently the player sees identical
 * feedback regardless of choice ("Your response reveals: Healthy balanced").
 * This mapper converts drive-directionality + shadow-quadrant + pass/fail
 * signals into foundations/20 §3.5 qualitative bands ("clean/tight/loose/
 * fumbled") WITHOUT leaking Veil-protected taxonomy (stage labels, drive
 * labels, shadow quadrant names, numerical scores).
 *
 * Status: canonical-hypothesis (Mysterium-specific; bands derived from
 * foundations/20 §3.5 design principle).
 *
 * HoloOS anchor: _THEORY/02_Ontology/08.8.8_Quantum_Realm_Backtrace.md
 * "weirdness signature" — Veil-filtered outputs should preserve weirdness,
 * not flatten to normalcy. The qualitative bands below preserve the felt-
 * sense of the player's response without diagnostic labels.
 */
import type { DriveDirectionality } from '../../core/domain/enums.js';
import { ALL_DRIVES } from '../../core/domain/Drive.js';
import type { Drive } from '../../core/domain/Drive.js';
import type { ShadowQuadrant } from '../../core/domain/enums.js';

/** The four Veil-compliant qualitative bands per foundations/20 §3.5. */
export type QualitativeBand = 'clean' | 'tight' | 'loose' | 'fumbled';

export interface QualitativeFeedback {
  readonly band: QualitativeBand;
  readonly gesture: string;        // 1-2 sentence felt-sense description
  readonly resonance: string;      // 1-sentence "what this touches" note
  readonly shadowHint?: string;    // optional 1-sentence shadow surfacing note (no labels)
}

/**
 * Map a single drive's directionality signal to a qualitative phrase.
 * Veil-compliant: never names the drive taxonomy.
 */
function drivePhrase(drive: Drive, signal: DriveDirectionality): string {
  // Each drive has a distinct felt-sense vocabulary.
  // HealthyBalanced → flowing; DarkAddicted → gripping; DarkAverted →
  // withdrawing; GoldenAddicted → bypassing; GoldenAverted → resisting.
  const vocab: Record<Drive, Record<DriveDirectionality, string>> = {
    Agency: {
      HealthyBalanced: 'acting with clear intent',
      DarkAddicted: 'gripping too tight',
      DarkAverted: 'pulling back from action',
      GoldenAddicted: 'leaping past the step you are on',
      GoldenAverted: 'resisting the call to act',
    },
    Communion: {
      HealthyBalanced: 'meeting what is here',
      DarkAddicted: 'merging too far',
      DarkAverted: 'turning away from connection',
      GoldenAddicted: 'dissolving boundaries prematurely',
      GoldenAverted: 'resisting the pull to relate',
    },
    Eros: {
      HealthyBalanced: 'reaching toward what calls',
      DarkAddicted: 'grasping at desire',
      DarkAverted: 'numbing the want',
      GoldenAddicted: 'spiritualizing the desire away',
      GoldenAverted: 'refusing to want',
    },
    Agape: {
      HealthyBalanced: 'letting it be held',
      DarkAddicted: 'dissolving the self too soon',
      DarkAverted: 'closing the heart',
      GoldenAddicted: 'bypassing through love',
      GoldenAverted: 'refusing to receive',
    },
  };
  return vocab[drive][signal] ?? 'present';
}

/** Map shadow quadrant to Veil-compliant hint phrase (no quadrant name). */
function shadowHintPhrase(quadrant: ShadowQuadrant): string {
  const hints: Record<ShadowQuadrant, string> = {
    DarkAddiction: 'A familiar pull tugs underneath the surface — known, but no longer serving.',
    DarkAllergy: 'Something here is being avoided; the body flinches before the mind catches up.',
    GoldenAddiction: 'A reaching toward the light that skips over the ground beneath your feet.',
    GoldenAllergy: 'A resistance to what is trying to emerge — the threshold feels like a wall.',
  };
  return hints[quadrant];
}

/**
 * Produce a QualitativeFeedback from encounter outcome signals.
 *
 * Inputs are the post-encounter drive-directionality map, the surfaced
 * shadow quadrant (if any), and a pass/fail flag. The mapper NEVER leaks
 * the input taxonomy to the player.
 */
export function toQualitativeFeedback(
  driveDirectionality: Readonly<Record<Drive, DriveDirectionality>>,
  shadowSurfaced: ShadowQuadrant | null,
  passed: boolean,
): QualitativeFeedback {
  const signals = ALL_DRIVES.map(d => driveDirectionality[d]);

  const allHealthy = signals.every(s => s === 'HealthyBalanced');
  const anyDarkAddicted = signals.some(s => s === 'DarkAddicted');
  const anyDarkAverted = signals.some(s => s === 'DarkAverted');
  const anyGoldenAddicted = signals.some(s => s === 'GoldenAddicted');
  const anyGoldenAverted = signals.some(s => s === 'GoldenAverted');

  // Determine band
  let band: QualitativeBand;
  if (allHealthy && passed) {
    band = 'clean';
  } else if ((anyDarkAddicted || anyDarkAverted) && passed) {
    band = 'tight';
  } else if ((anyGoldenAddicted || anyGoldenAverted) && passed) {
    band = 'tight';
  } else if (!passed && (anyDarkAddicted || anyDarkAverted)) {
    band = 'fumbled';
  } else if (!passed && (anyGoldenAddicted || anyGoldenAverted)) {
    band = 'loose';
  } else if (!passed) {
    band = 'loose';
  } else {
    band = 'tight';
  }

  // Build gesture (1-2 sentences, weaving 1-2 drive phrases)
  const notableDrives = ALL_DRIVES.filter(d => driveDirectionality[d] !== 'HealthyBalanced');
  const phrasesToUse = notableDrives.length > 0 ? notableDrives : [ALL_DRIVES[0]!];
  const gestureParts = phrasesToUse.slice(0, 2).map(d => drivePhrase(d, driveDirectionality[d]));
  const gesture = gestureParts.length === 1
    ? `You find yourself ${gestureParts[0]}.`
    : `You find yourself ${gestureParts[0]}, and somewhere underneath, ${gestureParts[1]}.`;

  // Resonance (1 sentence)
  const resonanceMap: Record<QualitativeBand, string> = {
    clean: 'Something settles into place without effort.',
    tight: 'There is skill here, and also a thread being held too carefully.',
    loose: 'The shape of the thing is not quite held; the edges blur.',
    fumbled: 'The grip slipped. The thing was not quite caught.',
  };
  const resonance = resonanceMap[band];

  // Shadow hint (optional, no labels)
  const shadowHint = shadowSurfaced ? shadowHintPhrase(shadowSurfaced) : undefined;

  return { band, gesture, resonance, shadowHint };
}

/**
 * Format the QualitativeFeedback as a single player-visible string.
 * This is the function the renderer should call.
 */
export function formatQualitativeFeedback(fb: QualitativeFeedback): string {
  const parts = [fb.gesture, fb.resonance];
  if (fb.shadowHint) parts.push(fb.shadowHint);
  return parts.join(' ');
}

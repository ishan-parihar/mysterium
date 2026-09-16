/**
 * SharedTypes -- types extracted from PlayerProfile that are used broadly across the codebase.
 * These remain even after PlayerProfile is deprecated.
 */
import type { Line } from './Line.js';

export type Quadrant = 'UL' | 'UR' | 'LL' | 'LR';

export type TaskSlug =
  | 'n_back'
  | 'stroop'
  | 'simon'
  | 'go_no_go'
  | 'affect_recognition'
  | 'dilemma_choice'
  | 'reaction_time'
  | 'held_input'
  | 'breath_rhythm'
  | 'self_report'
  | 'value_coherence'
  | 'pattern_prediction';

export interface StaircaseState {
  readonly level: number;
  readonly reversals: number;
  readonly lastDirection: 'up' | 'down' | null;
  readonly history: readonly boolean[];
}

export interface ShadowSignal {
  readonly type: 'fixation' | 'regression' | 'repression' | 'goldenAllergy';
  readonly line: Line;
  readonly detectedAtMs: number;
  readonly description: string;
}

export interface CodexEntry {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly unlockedAtMs: number;
}

export interface Vow {
  readonly text: string;
  readonly createdAtMs: number;
  readonly fulfilled: boolean;
  // ── 39 extension (optional ⇒ old saves parse unchanged) ──
  readonly kind?: 'practice' | 'exposure' | 'learning' | 'service';
  readonly status?: 'active' | 'fulfilled' | 'lapsed' | 'renegotiated';
  readonly implementationIntention?: { when: string; then: string };
  readonly horizonMs?: number;              // player-declared, not enforced
  readonly checkInCount?: number;
  readonly witnessPodId?: string;           // social-induction (38), optional
}

/** The journal check-in (39 §3.3). Client-side storage only; never cloud-synced. */
export interface ReflectionRecord {
  readonly id: string;
  readonly vowId?: string;
  readonly prompts: readonly { question: string; answer: string }[];
  readonly depthScore?: 1 | 2 | 3 | 4 | 5;  // rubric result, never surfaced as number
  readonly createdAtMs: number;
}

/** A measurement-pack skill-theta stream (40 §4.2). Freshness decays with the pack's half-life. */
export interface SkillThetaStream {
  readonly theta: number;
  readonly se: number;
  readonly lastMeasuredAtMs: number;
  readonly sessionCount: number;
  readonly halfLifeMs: number;
}

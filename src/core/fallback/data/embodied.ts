/**
 * The Embodied corpus — prompts that probe the somatic register, per line.
 *
 * Split out of `FallbackProvider.ts` (module-cohesion audit item 5): this module is DATA,
 * authored against `schema.ts`. Nothing here decides anything — the pools are selected in
 * `../FallbackProvider.ts`, where `LR_BY_LINE_*`/`SC_BY_LINE_*` route each cell to a pool.
 */
import type { FallbackContent } from './schema.js';

export // ============================================================================
// LINE-SPECIFIC EMBODIED CONTENT — Red stage
// ============================================================================

const EMB_COGNITIVE_RED: readonly FallbackContent[] = [
  {
    prompt: 'Close your eyes. Notice the quality of your thoughts right now — scattered, focused, racing, still. Where does that quality live in your body?',
    followUps: ['What shape would your thinking take if it were a physical sensation?', 'Does the body follow the mind, or the mind the body?'],
  },
];

export const EMB_EMOTIONAL_RED: readonly FallbackContent[] = [
  {
    prompt: 'Place a hand on your chest. Breathe. What emotion is your body holding right now — independent of what your mind thinks you should feel?',
    followUps: ['Does the body\'s emotion match the mind\'s story?', 'What would happen if you trusted the body\'s version?'],
  },
];

export const EMB_MORAL_RED: readonly FallbackContent[] = [
  {
    prompt: 'When you face a moral choice, your body responds before your mind. Notice: is there tightness or openness in your chest right now?',
    followUps: ['Does the body already know the right answer?', 'What does the body feel when you act against your conscience?'],
  },
];

export const EMB_INTRAPERSONAL_RED: readonly FallbackContent[] = [
  {
    prompt: 'Scan your body from head to toe. Where do you feel most alive? Where do you feel numb? The map of sensation is the map of self.',
    followUps: ['What does the numbness protect?', 'What does the aliveness want to do?'],
  },
];

export const EMB_SPIRITUAL_RED: readonly FallbackContent[] = [
  {
    prompt: 'Breathe deeply three times. On each exhale, notice what the body releases. What does your body carry that is not yours to carry?',
    followUps: ['Whose weight is in your shoulders?', 'What would your body feel like if it belonged only to itself?'],
  },
];

export const EMB_INTERPERSONAL_RED: readonly FallbackContent[] = [
  {
    prompt: 'Think of someone you will see today. Notice what happens in your body when they come to mind — expansion or contraction, warmth or tension.',
    followUps: ['What does your body know about this person that your mind hasn\'t admitted?', 'Is the body\'s signal a message or a memory?'],
  },
];

export const EMB_SOMATIC_RED: readonly FallbackContent[] = [
  {
    prompt: 'Stand still. Feel your feet on the ground. Notice the micro-adjustments your body makes to hold you upright. Your body is already doing something extraordinary without being asked.',
    followUps: ['What else is it doing that you haven\'t noticed?', 'If your body could speak right now, what would it say first?'],
  },
];

export const EMB_WILLPOWER_RED: readonly FallbackContent[] = [
  {
    prompt: 'Hold your hand out in front of you, palm down. Keep it perfectly still. Notice what happens in your arm, your shoulder, your breath. This is willpower as a physical experience.',
    followUps: ['Where does the effort live?', 'What would it feel like to release the effort without dropping the hand?'],
  },
];

/**
 * The Deterministic corpus — framing for modalities whose answer is a produced artefact.
 *
 * Split out of `FallbackProvider.ts` (module-cohesion audit item 5): this module is DATA,
 * authored against `schema.ts`. Nothing here decides anything — the pools are selected in
 * `../FallbackProvider.ts`, where `LR_BY_LINE_*`/`SC_BY_LINE_*` route each cell to a pool.
 */
import type { FallbackContent } from './schema.js';

export // ============================================================================
// LINE-SPECIFIC DETERMINISTIC CONTENT — Red stage (short framings)
// ============================================================================

const DET_COGNITIVE_RED: readonly FallbackContent[] = [
  { framing: 'A pattern hides in the noise. Track it.' },
  { framing: 'Three signals converge. Which one matters most?' },
  { framing: 'The logic chain has a gap. Find it before time runs out.' },
];

export const DET_EMOTIONAL_RED: readonly FallbackContent[] = [
  { framing: 'An emotional face appears for two seconds. Name it.' },
  { framing: 'The tone of voice shifts. What changed beneath the words?' },
  { framing: 'Two emotions coexist. Identify both.' },
];

export const DET_MORAL_RED: readonly FallbackContent[] = [
  { framing: 'A dilemma unfolds. There is no clean answer. Choose anyway.' },
  { framing: 'Someone is hurt. You can help, but it costs you. Decide.' },
  { framing: 'The rule says one thing. The situation says another. Act.' },
];

export const DET_INTRAPERSONAL_RED: readonly FallbackContent[] = [
  { framing: 'An impulse arises. Name it before you act on it.' },
  { framing: 'A self-image cracks. What is underneath?' },
  { framing: 'The gap between intention and action opens. Observe it.' },
];

export const DET_SPIRITUAL_RED: readonly FallbackContent[] = [
  { framing: 'A moment of meaning appears. What made it meaningful?' },
  { framing: 'Silence opens. What is present in it?' },
  { framing: 'The ego flinches. Notice what triggered it.' },
];

export const DET_INTERPERSONAL_RED: readonly FallbackContent[] = [
  { framing: 'A social signal flashes. Decode it in real time.' },
  { framing: 'Two people need different things from you. Prioritize.' },
  { framing: 'The group energy shifts. Name the shift before it names you.' },
];

export const DET_SOMATIC_RED: readonly FallbackContent[] = [
  { framing: 'A body sensation demands attention. Name it without interpreting it.' },
  { framing: 'Your breathing changed. Catch the moment it shifted.' },
  { framing: 'Tension appears somewhere unexpected. Locate it precisely.' },
];

export const DET_WILLPOWER_RED: readonly FallbackContent[] = [
  { framing: 'An impulse arises. Hold still for three breaths before responding.' },
  { framing: 'Fatigue whispers. Notice whether it is physical or emotional.' },
  { framing: 'A choice between comfort and growth appears. Name what pulls you toward comfort.' },
];

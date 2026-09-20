/**
 * Stage motion language — Svelte transitions per stage aesthetic.
 *
 * Each stage has a distinct motion register (from tokens.css --mysterium-motion):
 *   infrared: pulse    — slow sine yoyo
 *   magenta:  drift     — fade + slight vertical drift
 *   red:      snap      — fast linear (80ms)
 *   amber:    chime     — fade + scale up slightly
 *   orange:   tick      — quick slide from right
 *   green:    grow      — scale from 0.9 + fade
 *   teal: refract  — fade + slight horizontal shift
 *   turquoise:    dissolve  — slow fade, no movement
 *
 * These are Svelte transition functions compatible with `transition:` and
 * `in:` / `out:` directives. They read duration from --mysterium-duration-* tokens.
 */

import { cubicOut, sineInOut } from 'svelte/easing';
import type { TransitionConfig, EasingFunction } from 'svelte/transition';

type MotionName = 'pulse' | 'drift' | 'snap' | 'chime' | 'tick' | 'grow' | 'refract' | 'dissolve';

interface MotionParams {
  readonly duration?: number;
  readonly delay?: number;
  readonly easing?: EasingFunction;
}

/** Resolve the current stage's motion name from the DOM (data-stage attr → --mysterium-motion). */
function getMotionName(): MotionName {
  if (typeof document === 'undefined') return 'snap';
  const cssMotion = getComputedStyle(document.documentElement).getPropertyValue('--mysterium-motion').trim();
  const valid: MotionName[] = ['pulse', 'drift', 'snap', 'chime', 'tick', 'grow', 'refract', 'dissolve'];
  return (valid as readonly string[]).includes(cssMotion) ? (cssMotion as MotionName) : 'snap';
}

/** Resolve a duration token (ms) from the DOM. */
function getDuration(token: '--mysterium-duration-fast' | '--mysterium-duration-base' | '--mysterium-duration-slow'): number {
  if (typeof document === 'undefined') return 320;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const ms = parseInt(raw, 10);
  return Number.isFinite(ms) && ms > 0 ? ms : 320;
}

/** Build a fade transition. */
function fade(params: MotionParams = {}): TransitionConfig {
  return {
    duration: params.duration ?? getDuration('--mysterium-duration-base'),
    delay: params.delay ?? 0,
    easing: params.easing ?? cubicOut,
    css: (t: number) => `opacity: ${t}`,
  };
}

/** Build a scale transition. */
function scale(params: MotionParams & { from?: number; to?: number } = {}): TransitionConfig {
  const from = params.from ?? 0.9;
  const to = params.to ?? 1;
  return {
    duration: params.duration ?? getDuration('--mysterium-duration-base'),
    delay: params.delay ?? 0,
    easing: params.easing ?? cubicOut,
    css: (t: number) => {
      const s = from + (to - from) * t;
      return `opacity: ${t}; transform: scale(${s})`;
    },
  };
}

/** Build a fly (translate) transition. */
function fly(params: MotionParams & { x?: number; y?: number } = {}): TransitionConfig {
  const x = params.x ?? 0;
  const y = params.y ?? 0;
  return {
    duration: params.duration ?? getDuration('--mysterium-duration-base'),
    delay: params.delay ?? 0,
    easing: params.easing ?? cubicOut,
    css: (t: number) => `opacity: ${t}; transform: translate(${x * (1 - t)}px, ${y * (1 - t)}px)`,
  };
}

/**
 * Stage-aware fade. Uses the current stage's motion language to pick
 * the easing and duration.
 */
export function stageFade(_node: Element, params: MotionParams = {}): TransitionConfig {
  const motion = getMotionName();
  switch (motion) {
    case 'pulse':
      return { ...fade(params), easing: sineInOut, duration: params.duration ?? getDuration('--mysterium-duration-slow') };
    case 'drift':
      return fly({ ...params, y: 12 });
    case 'snap':
      return fade({ ...params, duration: params.duration ?? getDuration('--mysterium-duration-fast') });
    case 'chime':
      return scale({ ...params, from: 0.96 });
    case 'tick':
      return fly({ ...params, x: -16, duration: params.duration ?? getDuration('--mysterium-duration-fast') });
    case 'grow':
      return scale({ ...params, from: 0.9 });
    case 'refract':
      return fly({ ...params, x: 8 });
    case 'dissolve':
      return fade({ ...params, easing: sineInOut, duration: params.duration ?? getDuration('--mysterium-duration-slow') });
    default:
      return fade(params);
  }
}

/**
 * Stage-aware scale — for modals, cards, and emphasis elements.
 */
export function stageScale(_node: Element, params: MotionParams = {}): TransitionConfig {
  const motion = getMotionName();
  switch (motion) {
    case 'snap':
      return scale({ ...params, from: 0.95, duration: params.duration ?? getDuration('--mysterium-duration-fast') });
    case 'chime':
      return scale({ ...params, from: 0.92 });
    case 'grow':
      return scale({ ...params, from: 0.85 });
    case 'pulse':
      return scale({ ...params, from: 0.97, easing: sineInOut });
    default:
      return scale({ ...params, from: 0.92 });
  }
}

/**
 * Stage-aware fly — for navigation transitions (route changes, list items).
 */
export function stageFly(_node: Element, params: MotionParams & { x?: number; y?: number } = {}): TransitionConfig {
  const motion = getMotionName();
  const x = params.x ?? 0;
  const y = params.y ?? 0;
  switch (motion) {
    case 'drift':
      return fly({ ...params, y: y || 16 });
    case 'tick':
      return fly({ ...params, x: x || -20, duration: params.duration ?? getDuration('--mysterium-duration-fast') });
    case 'refract':
      return fly({ ...params, x: x || 10 });
    case 'dissolve':
      return fade(params);
    default:
      return fly(params);
  }
}

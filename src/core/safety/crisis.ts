/**
 * Crisis-pattern detection (39 §4.2 safety rule; doc 43 §4.5 event 3).
 *
 * Deterministic, offline-safe pattern scan over reflection/transcript text.
 * Lives in its own module so BOTH the practice loop (processCheckIn) and the
 * orchestration layer (delegated-session signals, 43 §5.1 distressSignal)
 * consume ONE definition — no duplication, no import cycle.
 *
 * The response is always human: this detector only routes to the safety
 * layer; it never scores, integrates, or persists the flagged text.
 */

// Crisis patterns (deterministic, offline-safe). Bypass everything → safety.
const CRISIS_PATTERNS: readonly RegExp[] = [
  /\bsuicid/i, /\bkill (myself|me)\b/i, /\bself[- ]harm/i, /\bwant to die\b/i,
  /\bhurt (myself|my self)\b/i, /\bend it all\b/i,
];

export function detectCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((r) => r.test(text));
}

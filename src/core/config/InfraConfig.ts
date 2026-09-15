/**
 * InfraConfig — single source for timeout, TTL, and cap constants.
 * Previously scattered across LLMClient, CalibrationStore, TrialRecordStore,
 * GameLoop, AutoModeStrategy, and CLI. Centralizing here makes tuning
 * observable and prevents drift between headless vs interactive paths.
 *
 * All values are conservative defaults; override via env or explicit param
 * where the call-site allows it. Do not add speculative config — only
 * values that were previously hardcoded in ≥2 places or that the audits
 * flagged as "hardcoded, worth data-driving".
 */
export const InfraConfig = {
  // ── LLM ──────────────────────────────────────────────────────────
  /** Per-call fetch timeout (LLMClient:54, _lib:31). */
  LLM_TIMEOUT_MS: 30_000,
  /** BFF proxy timeout (ProxiedLLMClient:16) — longer so BFF can retry. */
  LLM_BFF_TIMEOUT_MS: 45_000,
  /** Retries on 429/5xx (LLMClient:60). */
  LLM_RETRY_COUNT: 1,
  /** Backoff between retries (LLMClient:61). */
  LLM_RETRY_BACKOFF_MS: 1500,
  /** Max agentic loop iterations per encounter (orchestrator). */
  AGENTIC_MAX_LOOPS: 5,

  // ── Calibration / training ──────────────────────────────────────
  /** Override TTL 7 days (CalibrationStore:32). */
  CALIBRATION_OVERRIDE_TTL_MS: 7 * 24 * 60 * 60 * 1000,
  /** Ring caps for brain-game telemetry (TrialRecordStore:28-29). */
  MAX_TRIALS_PER_PARADIGM: 400,
  MAX_SESSIONS: 100,

  // ── GameLoop / strategy ─────────────────────────────────────────
  /** Default CC re-evaluation interval (AutoMode:79 =3, GameLoop fallback 5). */
  REEVALUATION_INTERVAL_DEFAULT: 3,
  REEVALUATION_INTERVAL_FALLBACK: 5,
  /** Saturation Veil hint threshold (cli-game:697). */
  SATURATION_THRESHOLD: 0.6,
  /** Training beat weave cadence: first at >=2 encounters, then every 3. */
  TRAINING_WEAVE_FIRST_AT: 2,
  TRAINING_WEAVE_EVERY: 3,
  /** Curriculum weave cadence: first at >=2, then every 3. */
  CURRICULUM_WEAVE_FIRST_AT: 2,
  CURRICULUM_WEAVE_EVERY: 3,

  // ── Levelling (doc 42) ───────────────────────────────────────────
  /** Consecutive session-end evaluations evidence must hold to promote/demote. */
  LEVELLING_STABILITY_WINDOW: 3,
  /** Promotion bar minus demotion bar — anti-oscillation hysteresis. */
  LEVELLING_HYSTERESIS_MARGIN: 0.05,
  /** Evidence score at/above which promotion becomes eligible. */
  LEVELLING_PROMOTION_BAR: 0.75,
  /** Evidence score at/below which demotion becomes eligible. */
  LEVELLING_DEMOTION_BAR: 0.55,

  // ── CCI ──────────────────────────────────────────────────────────
  // Weights live in CCIEngine.DEFAULT_CCI_WEIGHTS; not duplicated here.
  // Felt-sense bands live in unifiedProfileTools.getDevelopmentalSnapshot
  // (>0.6 humming, >0.4 settling). Kept there — single consumer.

  // ── Shadow ───────────────────────────────────────────────────────
  /** Number of shadow keywords for detection (14). */
  SHADOW_KEYWORD_COUNT: 14,
} as const;

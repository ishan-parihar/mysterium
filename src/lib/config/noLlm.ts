/**
 * The no-LLM deployment mode.
 *
 * The game does not REQUIRE a model. `AgenticOrchestrator.ts:494-497` routes an encounter straight
 * to `runFallback` when `noLlm` is set, and the narrative layer falls back per element on any LLM
 * error or timeout (`:1211-1222`). The fallback corpus is line-specific and stage-banded
 * (`FallbackProvider.ts:11-13`), drawn from the 512 concept-drafts — authored content, not a stub.
 * A deploy with no `LLM_API_KEY` therefore plays a complete session; what it loses is GENERATED
 * narrative, which is a content-quality difference and never an availability one.
 *
 * SCOPE, CORRECTED 2026-09-29. This module governs the ENCOUNTER path. It did not govern
 * onboarding: `CalibrationAgent.generateProbe` had no corpus branch, so a keyless deploy threw
 * `'LLM not configured server-side'`, `/api/agent/probe` turned that into an `{ error }` frame at
 * HTTP 200, and `onboarding/+page.svelte` read it as "no LLM — go to /setup" — i.e. it could not
 * reach the game at all. `CalibrationCorpus.ts` closes that. Read this file's claim as "the game
 * runs without a model", which is now true of both entry points, rather than "every code path
 * consults this flag" — it does not, and the agent path is metered separately
 * (`agent-probe` in `rateLimit.ts`, because it calls the provider directly).
 *
 * This module exists because the flag previously had no way to be set in a deploy. `runEncounter`
 * defaulted it to `false` (`gameEngine.ts:321`) and the browser's only call site passed no options
 * at all, so a keyless production build aimed every encounter at `/api/llm/chat`, paid a failed
 * round-trip per narrative element, and then used the fallback anyway. This makes the intent
 * explicit at build time instead of accidental at runtime.
 *
 * AUTO-DETECTION IS DELIBERATE. `VITE_LLM_REQUIRED` unset means "detect": the flag is on when no
 * client-visible key is configured, so an operator who forgets to set it gets a working game
 * rather than a broken one. `VITE_LLM_REQUIRED=1` forces the model path on (for a build that will
 * have a key injected at runtime); `=0` forces the corpus path off deliberately.
 */

/** True when the build must not attempt any LLM call — the corpus answers every element. */
export function noLlmEnabled(env: Readonly<Record<string, string | undefined>>): boolean {
  const explicit = env.VITE_LLM_REQUIRED;
  if (explicit === '1' || explicit === 'true') return false; // operator insists on the model path
  if (explicit === '0' || explicit === 'false') return true; // operator insists on the corpus path
  // Unset: detect. A key present in the CLIENT-visible config means a proxied keyless deploy is
  // possible, so the model path is worth attempting. No key means every call would fail first.
  return !hasClientVisibleKey(env);
}

/** Any client-visible LLM KEY. A provider name is not a key — `VITE_LLM_PROVIDER=opencode` with
 *  no `VITE_LLM_API_KEY` still 503s, so counting it as "configured" would send a keyless build at
 *  the model path. This was caught by mutation: a resolver that answered "has a key" for a
 *  provider-only env deployed a broken build while the gate stayed green. */
function hasClientVisibleKey(env: Readonly<Record<string, string | undefined>>): boolean {
  return Boolean(
    env.VITE_LLM_API_KEY || env.VITE_OPENCODE_API_KEY || env.VITE_ANTHROPIC_API_KEY,
  );
}

/** The resolved value for this build. Safe to call at module scope in a browser bundle. */
export const NO_LLM: boolean = noLlmEnabled(
  (typeof import.meta !== 'undefined' && (import.meta as { env?: Record<string, string | undefined> }).env) || {},
);

// /pack route — client-only. Reads the pack registry, the reliability collector and the claim
// ledger, all of which are browser-side stores; the policy gate (G54) requires the opt-out to be
// stated rather than inherited.
// Re-exported, not re-declared: the serving decision lives in one place. See
// `src/lib/config/serving.ts` for why page loads are pre-rendered and what that
// does to the cost of a deploy.
export { ssr, prerender } from '$lib/config/serving.js';

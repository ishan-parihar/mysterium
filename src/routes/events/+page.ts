// /events route — client-only. Reads the in-memory telemetry buffer and the
// player's local opt-in state; neither exists on the server.
// Re-exported, not re-declared: the serving decision lives in one place. See
// `src/lib/config/serving.ts` for why page loads are pre-rendered and what that
// does to the cost of a deploy.
export { ssr, prerender } from '$lib/config/serving.js';

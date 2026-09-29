// /pod route — client-only. The pod's event log lives in a browser KV binding (localStorage here,
// Cloudflare KV on deploy) and the transport is constructed per session; the policy gate (G54)
// requires the opt-out to be stated rather than inherited.
// Re-exported, not re-declared: the serving decision lives in one place. See
// `src/lib/config/serving.ts` for why page loads are pre-rendered and what that
// does to the cost of a deploy.
export { ssr, prerender } from '$lib/config/serving.js';

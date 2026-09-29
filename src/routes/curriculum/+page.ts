// /curriculum route — client-only: it hydrates the player's Significator from
// localStorage on mount, so a server render would emit the empty state and
// then swap it on hydration.
// Re-exported, not re-declared: the serving decision lives in one place. See
// `src/lib/config/serving.ts` for why page loads are pre-rendered and what that
// does to the cost of a deploy.
export { ssr, prerender } from '$lib/config/serving.js';

// /export route — client-only. The export is built in the browser from the
// player's own local storage; there is deliberately NO server round-trip, so the
// data never leaves the device unless the player moves the file themselves.
// Re-exported, not re-declared: the serving decision lives in one place. See
// `src/lib/config/serving.ts` for why page loads are pre-rendered and what that
// does to the cost of a deploy.
export { ssr, prerender } from '$lib/config/serving.js';

// /delegate route — client-only. Reads the live council through the kernel dispatcher, which the
// policy gate (G54) requires every route to state explicitly rather than inherit.
// Re-exported, not re-declared: the serving decision lives in one place. See
// `src/lib/config/serving.ts` for why page loads are pre-rendered and what that
// does to the cost of a deploy.
export { ssr, prerender } from '$lib/config/serving.js';

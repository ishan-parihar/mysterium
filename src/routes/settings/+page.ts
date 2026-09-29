// /settings route — client-only.
//
// The settings page imports accessibilityStore which reads localStorage
// at module load. SSR would run this on the server where localStorage
// is undefined. Disable SSR to keep settings client-only.
// (The isBrowser guard in accessibilityStore prevents crashes, but
// disabling SSR avoids the flash-of-default-settings on hydration.)

// Re-exported, not re-declared: the serving decision lives in one place. See
// `src/lib/config/serving.ts` for why page loads are pre-rendered and what that
// does to the cost of a deploy.
export { ssr, prerender } from '$lib/config/serving.js';

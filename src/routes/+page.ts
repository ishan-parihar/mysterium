// Root page load function.
//
// SSR is ALWAYS disabled for the root route because it mounts the Phaser
// game, whose deps (SaveRepository, etc.) use Node built-ins (fs, path,
// crypto) that cannot be bundled for the browser.
//
// The +layout.ts handles the BUILD_TARGET=static case globally (disables
// SSR for all routes); this file ensures / is client-only even when
// BUILD_TARGET=cloudflare (where other routes CAN be SSR'd).

// Re-exported, not re-declared: the serving decision lives in one place. See
// `src/lib/config/serving.ts` for why page loads are pre-rendered and what that
// does to the cost of a deploy.
export { ssr, prerender } from '$lib/config/serving.js';

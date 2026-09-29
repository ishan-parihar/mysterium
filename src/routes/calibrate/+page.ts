// /calibrate route — client-only. The run is scored in the browser by the same pure functions
// the CLI's `runQuickCalibration` uses; there is no server round-trip and nothing about the
// player's answers is transmitted.
export { ssr, prerender } from '$lib/config/serving.js';

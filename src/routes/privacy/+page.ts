// /privacy route — client-only. The inventory is built in the browser by reading this device's
// own storage keys, so what the page reports is what this device actually holds rather than a
// list that could drift from the app.
export { ssr, prerender } from '$lib/config/serving.js';

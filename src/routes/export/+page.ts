// /export route — client-only. The export is built in the browser from the
// player's own local storage; there is deliberately NO server round-trip, so the
// data never leaves the device unless the player moves the file themselves.
export const ssr = false;
export const prerender = false;

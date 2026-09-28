// /pack route — client-only. Reads the pack registry, the reliability collector and the claim
// ledger, all of which are browser-side stores; the policy gate (G54) requires the opt-out to be
// stated rather than inherited.
export const ssr = false;
export const prerender = false;

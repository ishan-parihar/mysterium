// /pod route — client-only. The pod's event log lives in a browser KV binding (localStorage here,
// Cloudflare KV on deploy) and the transport is constructed per session; the policy gate (G54)
// requires the opt-out to be stated rather than inherited.
export const ssr = false;
export const prerender = false;

// /delegate route — client-only. Reads the live council through the kernel dispatcher, which the
// policy gate (G54) requires every route to state explicitly rather than inherit.
export const ssr = false;
export const prerender = false;

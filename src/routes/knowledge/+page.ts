// /knowledge route — client-only: it hydrates the player's Significator from
// localStorage on mount, so a server render would emit the empty state and
// then swap it on hydration.
export const ssr = false;
export const prerender = false;

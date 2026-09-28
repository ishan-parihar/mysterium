// /play route — client-only. The session boots the kernel's engines through
// src/lib/engine/gameEngine.ts and renders as DOM/Svelte; there is no canvas engine
// (rendering-layer.md §4). The stale "Phaser is browser-only" comment here outlived Phaser's
// removal from the tree and is the residue class CLAIM-MUST-MATCH-CODE names.
export const ssr = false;
export const prerender = false;

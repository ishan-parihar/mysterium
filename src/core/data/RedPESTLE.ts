/**
 * @deprecated MOVED to `src/core/world/pestle/RedPESTLE.ts` (WORLD-STORE-MOVE, 46 §10, 2026-09-21).
 *
 * PESTLE is world content (the macro-environment a stage's collective holon sits in), not system
 * substrate. This facade re-exports the real module so existing imports keep resolving; import
 * from `world/pestle/` directly in new code.
 */
export { RedPESTLE, PESTLE_DIMENSIONS } from '../world/pestle/RedPESTLE.js';
export type { PESTLEData } from '../world/pestle/RedPESTLE.js';

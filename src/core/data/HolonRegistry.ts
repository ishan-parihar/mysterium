/**
 * @deprecated MOVED to `src/core/world/store/HolonStore.ts` (WORLD-STORE-MOVE, 46 §10, 2026-09-21).
 *
 * The holon store is the world organ's store, not generic data. This facade re-exports the real
 * module so existing imports keep resolving; import from `world/store/` directly in new code.
 */
export type { HolonRegistry } from '../world/store/HolonStore.js';
export {
  createRegistry,
  addHolon,
  removeHolon,
  queryByKind,
  queryByAltitude,
  queryByLine,
  getHolon,
  queryByNarrativeRole,
} from '../world/store/HolonStore.js';

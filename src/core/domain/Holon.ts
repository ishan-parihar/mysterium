/**
 * @deprecated MOVED to `src/core/world/Holon.ts` (WORLD-STORE-MOVE, 46 §10, 2026-09-21).
 *
 * The world's root entity belongs to the world organ, not to generic domain types. This facade
 * re-exports the real module so existing imports keep resolving; import from `world/` directly
 * in new code. The facade is the ONLY tolerated reference to the old path — DG23's canon-side
 * citations and `_org.yaml` ownership already name `src/core/world/`.
 */
export type {
  Holon,
  HolonDriveState,
} from '../world/Holon.js';

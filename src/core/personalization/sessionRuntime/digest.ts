/**
 * The holon digest block — what the prompt is told about the holon the player is inside.
 *
 * Split out of `sessionRuntime.ts` (module-cohesion audit item 7) WITHOUT weakening the
 * single-seam rule (`M6`): `../sessionRuntime.ts` re-exports every symbol, so the seam is
 * still one import path for every caller. The split is a file change, not an interface change.
 */
import type { OrchestrationServices } from './services.js';

/**
 * The worker digests for the encounter's holon — what generation consumes so an NPC "remembers"
 * the player (MY-AD-0009). Missing profile → empty list (a cold holon has no history; that is
 * correct, not an error).
 */
export function holonDigestBlock(services: OrchestrationServices, holonId: string | null): readonly string[] {
  if (!holonId) return [];
  const worker = services.workers.workers[holonId];
  if (!worker) return [];
  const holon = services.holons.find((h) => h.id === holonId);
  if (!holon) return [];
  const p = worker.profile;
  const hot = Object.entries(p.intensities)
    .filter(([k, v]) => (k.startsWith('rel:') || k.startsWith('drive:')) && (v > 0.65 || v < 0.35))
    .map(([k, v]) => `${k.includes(':') ? k.slice(k.indexOf(':') + 1) : k}=${v.toFixed(2)}`);
  const patterns = p.patterns.slice(-3).map((x) => x.kind);
  const out: string[] = [];
  out.push(`${holon.name} — ${holon.narrativeRole}`);
  if (hot.length > 0) out.push(`disposition shifted: ${hot.join(', ')}`);
  if (patterns.length > 0) out.push(`shared history: ${[...new Set(patterns)].join(', ')}`);
  return out;
}

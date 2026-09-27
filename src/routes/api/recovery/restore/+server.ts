/**
 * POST /api/recovery/restore — exchange a 12-word mnemonic for the
 * bound deviceId.
 *
 * Request body: { "mnemonic": "word1 word2 ... word12" }
 * Response (200): { "deviceId": "..." }
 * Response (404): mnemonic not recognised
 */

import { json, error } from '@sveltejs/kit';
import { requireBoundStorage } from '$lib/server/requireBoundStorage.js';
import type { RequestHandler } from './$types';

// Must match the hash function in generate/+server.ts.
async function hashMnemonic(mnemonic: string): Promise<string> {
  const encoded = new TextEncoder().encode(mnemonic.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// In-memory dev store shared with generate/+server.ts is not possible
// across module boundaries in dev mode without a singleton. For Phase 0
// dev testing, recovery works only within a single server process. In
// production (Cloudflare KV), it works across requests.
// We use a global singleton to share state between generate and restore.
interface DevRecoveryStore {
  readonly store: Map<string, string>;
}
const g = globalThis as unknown as { __mysteriumDevRecovery?: DevRecoveryStore };
if (!g.__mysteriumDevRecovery) g.__mysteriumDevRecovery = { store: new Map() };
const devRecoveryStore = g.__mysteriumDevRecovery.store;

export const POST: RequestHandler = async ({ request, platform }) => {
  let body: { mnemonic?: string };

  try {
    body = await request.json();
  } catch {
    throw error(400, 'Invalid JSON body');
  }

  if (!body.mnemonic || typeof body.mnemonic !== 'string') {
    throw error(400, 'Missing required field: mnemonic');
  }

  const mnemonic = body.mnemonic.trim().toLowerCase();
  const words = mnemonic.split(/\s+/);
  if (words.length !== 12) {
    throw error(400, `Mnemonic must be 12 words, got ${words.length}`);
  }

  const hash = await hashMnemonic(mnemonic);

  let deviceId: string | null = null;

  if (platform?.env && platform.env!.RECOVERY_KV) {
    const kv = platform.env!.RECOVERY_KV;
    const stored = await kv.get(`recovery:${hash}`, 'text');
    deviceId = typeof stored === 'string' ? stored : null;
  } else {
    // Unreachable in a built artifact (B-1).
    requireBoundStorage(false, 'RECOVERY_KV', 'recovery');
    deviceId = devRecoveryStore.get(hash) ?? null;
  }

  if (!deviceId) {
    throw error(404, 'Mnemonic not recognised');
  }

  return json({ deviceId });
};

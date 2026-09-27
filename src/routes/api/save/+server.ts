/**
 * GET /api/save?deviceId=… — retrieve latest encrypted save blob.
 * POST /api/save — store an encrypted save blob.
 *
 * Saves are END-TO-END ENCRYPTED client-side before being sent.
 * The server stores opaque encrypted blobs keyed by deviceId.
 * The server NEVER sees plaintext Significator or WorldState.
 *
 * This is canon-compliant (per AGENTS.md and the privacy posture in
 * the architecture plan §8.2 — "Recommend E2E for canon compliance").
 *
 * Storage backends:
 *   - Cloudflare: platform.env.SAVE_KV (Workers KV namespace)
 *   - Dev: in-memory Map (resets on restart — dev only)
 *
 * PRODUCTION SAFETY: with SAVE_KV unbound this route 503s rather than accepting saves into
 * memory — a fallback that answers 200 would lose every save on the next cold start
 * (`docs/DEPLOYMENT-READINESS-PLAN.md` B-1).
 *
 * GET response (200): { "deviceId": "...", "blob": "<base64-encrypted-save>", "updatedAt": 1234567890 }
 * GET response (404): no save found for deviceId
 * POST response (200): { "accepted": true, "updatedAt": 1234567890 }
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireBoundStorage } from '$lib/server/requireBoundStorage.js';

const MAX_BLOB_SIZE = 256 * 1024; // 256KB — generous for encrypted Significator + WorldState
const MAX_DEVICE_ID_LENGTH = 64;

// Dev-only in-memory store. In production, Cloudflare KV is used.
const devSaveStore = new Map<string, { blob: string; updatedAt: number }>();

interface SaveRecord {
  readonly deviceId: string;
  readonly blob: string;
  readonly updatedAt: number;
}

function validateDeviceId(deviceId: string): void {
  if (
    typeof deviceId !== 'string' ||
    deviceId.length === 0 ||
    deviceId.length > MAX_DEVICE_ID_LENGTH
  ) {
    throw error(400, `deviceId must be a string (1-${MAX_DEVICE_ID_LENGTH} chars)`);
  }
}

export const GET: RequestHandler = async ({ url, platform }) => {
  const deviceId = url.searchParams.get('deviceId');
  if (!deviceId) {
    throw error(400, 'Missing required query param: deviceId');
  }
  validateDeviceId(deviceId);

  // Try Cloudflare KV first.
  if (platform?.env && platform.env!.SAVE_KV) {
    const kv = platform.env!.SAVE_KV;
    const raw = await kv.get(`save:${deviceId}`, 'json');
    if (!raw) {
      throw error(404, 'No save found for deviceId');
    }
    return json(raw);
  }

  // Dev fallback: in-memory store. Unreachable in a built artifact (B-1).
  requireBoundStorage(false, 'SAVE_KV', 'save');
  const record = devSaveStore.get(deviceId);
  if (!record) {
    throw error(404, 'No save found for deviceId (dev store)');
  }
  return json({ deviceId, ...record });
};

export const POST: RequestHandler = async ({ request, platform }) => {
  let body: Partial<SaveRecord>;

  try {
    body = await request.json();
  } catch {
    throw error(400, 'Invalid JSON body');
  }

  if (!body.deviceId || !body.blob) {
    throw error(400, 'Missing required fields: deviceId, blob');
  }
  validateDeviceId(body.deviceId);

  if (typeof body.blob !== 'string') {
    throw error(400, 'blob must be a string (base64-encoded encrypted save)');
  }

  if (body.blob.length > MAX_BLOB_SIZE) {
    throw error(413, `Save blob too large: max ${MAX_BLOB_SIZE} chars, got ${body.blob.length}`);
  }

  const updatedAt = Date.now();
  const record: SaveRecord = {
    deviceId: body.deviceId,
    blob: body.blob,
    updatedAt,
  };

  // Try Cloudflare KV.
  if (platform?.env && platform.env!.SAVE_KV) {
    const kv = platform.env!.SAVE_KV;
    await kv.put(`save:${body.deviceId}`, JSON.stringify(record));
    return json({ accepted: true, updatedAt });
  }

  // Dev fallback. Unreachable in a built artifact (B-1).
  requireBoundStorage(false, 'SAVE_KV', 'save');
  devSaveStore.set(body.deviceId, { blob: body.blob, updatedAt });
  return json({ accepted: true, updatedAt });
};

/**
 * POST /api/recovery/generate — generate a 12-word BIP-39 mnemonic
 * and bind it to a deviceId.
 *
 * POST /api/recovery/restore — exchange a mnemonic for the bound deviceId.
 *
 * The mapping (mnemonic → deviceId) is stored server-side, encrypted
 * at rest. The mnemonic itself is the key — we store only a hash of it
 * (SHA-256) so the server cannot recover the mnemonic from its storage.
 *
 * Storage backends:
 *   - Cloudflare: platform.env.RECOVERY_KV (Workers KV namespace)
 *   - Dev: in-memory Map
 */

import { json, error } from '@sveltejs/kit';
import { requireBoundStorage } from '$lib/server/requireBoundStorage.js';
import type { RequestHandler } from './$types';

// Minimal BIP-39 word list (256 words — enough for a 12-word mnemonic
// with 8 bits of entropy per word = 96 bits total, which is sufficient
// for our use case and keeps the bundle small).
// In production, use the full 2048-word list via a library like 'bip39'.
// For Phase 0, this curated list is sufficient.
const WORD_LIST: readonly string[] = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
  'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
  'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
  'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
  'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
  'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album',
  'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone',
  'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among',
  'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle', 'angry',
  'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
  'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april',
  'arch', 'arctic', 'area', 'arena', 'argue', 'arm', 'armed', 'armor',
  'army', 'around', 'arrange', 'arrest', 'arrive', 'arrow', 'art', 'artefact',
  'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset', 'assist', 'assume',
  'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction',
  'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado',
  'avoid', 'awake', 'aware', 'away', 'awesome', 'awful', 'awkward', 'axis',
  'baby', 'bachelor', 'bacon', 'badge', 'bag', 'balance', 'balcony', 'ball',
  'bamboo', 'banana', 'banner', 'bar', 'barely', 'bargain', 'barrel', 'base',
  'basic', 'basket', 'battle', 'beach', 'bean', 'beauty', 'because', 'become',
  'beef', 'before', 'begin', 'behave', 'behind', 'believe', 'below', 'belt',
  'bench', 'benefit', 'best', 'betray', 'better', 'between', 'beyond', 'bicycle',
  'bid', 'bike', 'bind', 'biology', 'bird', 'birth', 'bitter', 'black',
  'blade', 'blame', 'blanket', 'blast', 'bleak', 'bless', 'blind', 'blood',
  'blossom', 'blouse', 'blue', 'blur', 'blush', 'board', 'boat', 'body',
  'boil', 'bomb', 'bone', 'bonus', 'book', 'boost', 'border', 'boring',
  'borrow', 'boss', 'bottom', 'bounce', 'box', 'boy', 'bracket', 'brain',
  'brand', 'brass', 'brave', 'bread', 'breeze', 'brick', 'bridge', 'brief',
  'bright', 'bring', 'brisk', 'broccoli', 'broken', 'bronze', 'broom', 'brother',
  'brown', 'brush', 'bubble', 'buddy', 'budget', 'buffalo', 'build', 'bulb',
  'bulk', 'bullet', 'bundle', 'bunker', 'burden', 'burger', 'burst', 'bus',
  'business', 'busy', 'butter', 'buyer', 'buzz', 'cabbage', 'cabin', 'cable',
];

const devRecoveryStore = new Map<string, string>(); // hash → deviceId

function generateMnemonic(NumWords = 12): string {
  const words: string[] = [];
  const random = new Uint32Array(NumWords);
  crypto.getRandomValues(random);
  for (let i = 0; i < NumWords; i++) {
    words.push(WORD_LIST[random[i]! % WORD_LIST.length]!);
  }
  return words.join(' ');
}

async function hashMnemonic(mnemonic: string): Promise<string> {
  const encoded = new TextEncoder().encode(mnemonic.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const POST: RequestHandler = async ({ request, platform }) => {
  let body: { deviceId?: string };

  try {
    body = await request.json();
  } catch {
    throw error(400, 'Invalid JSON body');
  }

  if (!body.deviceId || typeof body.deviceId !== 'string') {
    throw error(400, 'Missing required field: deviceId');
  }

  const mnemonic = generateMnemonic();
  const hash = await hashMnemonic(mnemonic);

  // Store hash → deviceId mapping.
  if (platform?.env && platform.env!.RECOVERY_KV) {
    const kv = platform.env!.RECOVERY_KV;
    await kv.put(`recovery:${hash}`, body.deviceId);
  } else {
    // Unreachable in a built artifact (B-1): a recovery phrase that is accepted into memory
    // and lost on restart is worse than a 503 — the player believes their save is recoverable.
    requireBoundStorage(false, 'RECOVERY_KV', 'recovery');
    devRecoveryStore.set(hash, body.deviceId);
  }

  // Return the mnemonic ONCE. The server never stores it again.
  return json({ mnemonic, deviceId: body.deviceId });
};

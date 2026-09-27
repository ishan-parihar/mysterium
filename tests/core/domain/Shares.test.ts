/**
 * Phase 17 d3 — the share seam is live (16 §2.4.1, MY-AD-0034).
 *
 * The owner's 2026-09-27 ruling: the sharing system is persona-free — an API-key-permission
 * shape where the scope selection is the entire security interface. These tests pin the
 * BEHAVIOUR the seam is supposed to produce:
 *
 *   SD1 a valid scope run creates a share (sorted, live, unique id);
 *   SD2 the L0 floor — felt-sense is never shareable (MY-AD-0034's law at creation);
 *   SD3 gapped runs are refused (contiguous from L1, the same law renderLevel enforces);
 *   SD4 revocation nulls the share idempotently;
 *   SD5 the one law agrees at both enforcement points — createShare's refusal set is exactly
 *       renderLevel's refusal set (corrupting one without the other cannot widen access).
 */
import { describe, it, expect } from 'vitest';
import { createShare, revokeShare } from '../../../src/core/domain/shares.js';
import { renderLevel, scopeRunValid, type ConsentLink } from '../../../src/core/domain/articulationLadder.js';
import type { Stage } from '../../../src/core/domain/Stage.js';

const NOW = 1790000000000;
const stage = 'Amber' as Stage;

describe('the persona-free share mechanism (16 §2.4.1, MY-AD-0034)', () => {
  it('SD1: a valid scope run creates a live share', () => {
    const { share } = createShare(['L2', 'L1'], NOW);
    expect(share).toBeDefined();
    expect(share!.scopes).toEqual(['L1', 'L2']);
    expect(share!.revoked).toBe(false);
    expect(share!.grantId.startsWith('share-')).toBe(true);
  });

  it('SD2: L0 (felt-sense) is never shareable — the floor is enforced at creation', () => {
    const outcome = createShare(['L0', 'L1'], NOW);
    expect(outcome.share).toBeUndefined();
    expect(outcome.reason).toContain('MY-AD-0034');
  });

  it('SD3: gapped runs and empty scopes are refused', () => {
    const gapped = createShare(['L1', 'L3'], NOW);
    expect(gapped.share).toBeUndefined();
    expect(gapped.reason).toContain('contiguous run from L1');
    expect(createShare([], NOW).share).toBeUndefined();
    expect(createShare(['L9'], NOW).share).toBeUndefined();
  });

  it('SD4: revocation nulls the share, idempotently', () => {
    const { share } = createShare(['L1', 'L2'], NOW);
    const first = revokeShare([share!], share!.grantId);
    expect(first.revoked).toBe(true);
    expect(first.next[0].revoked).toBe(true);
    const second = revokeShare(first.next, share!.grantId);
    expect(second.revoked).toBe(false); // re-revoke is a no-op, not an error
  });

  it('SD5: the scope law agrees at both enforcement points', () => {
    // Every share createShare accepts, renderLevel must honour under the auditor register;
    // every set createShare refuses, renderLevel must refuse too — one law, no gap.
    const accepted = createShare(['L1', 'L2', 'L3'], NOW).share!;
    const ok = renderLevel({ register: 'auditor', level: 'L2', playerStage: stage, consent: accepted }, new Map());
    expect(ok.allowed).toBe(true);

    const forged: ConsentLink = { grantId: 'g-forged', scopes: ['L1', 'L3'], revoked: false };
    const refused = renderLevel({ register: 'auditor', level: 'L3', playerStage: stage, consent: forged }, new Map());
    expect(refused.allowed).toBe(false);
    expect(refused.payload).toBeUndefined();

    // And the exported law itself is the single source both read:
    expect(scopeRunValid(['L1', 'L2'])).toBe(true);
    expect(scopeRunValid(['L0', 'L1'])).toBe(false);
    expect(scopeRunValid([])).toBe(false);
  });
});

/**
 * Tests for the claim-based credential ledger (doc 41).
 *
 * Guarantees under test:
 *   C1  Evidence chain — claims cite evidence; pack evidence carries reliability
 *       disclosure; undisclosed or ceiling-less provisional evidence fails (E2).
 *   C2  Consent issuance — subject is set at issuance (the player's per-claim
 *       consent act); issuance fails closed on validation failures (I1).
 *   C3  Category-error firewall — EQF levels require domain evidence; stage-shaped
 *       evidence is rejected outright (E4 / 41 §4.2).
 *   C4  Protected-data firewall — identity/journal/shadow refs never pass (E3).
 *   C5  Revocation — tombstoned claims refuse VC export; ledger stays auditable.
 *   C6  VC export — W3C-VC shape with competency metadata and evidence window.
 */
import { describe, it, expect } from 'vitest';
import {
  emptyLedger, draftClaim, issueClaim, revokeClaim, isRevoked,
  toVerifiableCredential, validateClaim, packEvidenceRef, masteryEvidenceRef,
} from '../../../src/core/credential/ClaimLedger.js';

const NOW = 1_700_000_000_000;

const MATURE = packEvidenceRef('memory.working-span', 's1', { retestR: 0.82, provisional: false, measuredAtMs: NOW });
const MASTERY = masteryEvidenceRef('math.foundations.numbers', 'analyzed', NOW);

function validDraft() {
  return {
    competencyDescriptor: 'Applies working-memory measurement and interprets span results',
    domain: 'math.foundations',
    level: { eqf: 4 as const },
    evidence: [MATURE, MASTERY],
    method: 'adaptive staircase with parallel forms',
    qualityAssurance: 'internal psychometric harness; reliability disclosed per evidence',
    nowMs: NOW,
  };
}

describe('evidence chain (C1)', () => {
  it('validates a metadata-complete claim', () => {
    const { claim, failures } = draftClaim(validDraft());
    expect(failures).toEqual([]);
    expect(validateClaim(claim)).toEqual([]);
  });

  it('rejects evidence-free claims (E1)', () => {
    const { failures } = draftClaim({ ...validDraft(), evidence: [] });
    expect(failures.some((f) => f.rule === 'E1')).toBe(true);
  });

  it('undisclosed pack evidence fails (E2)', () => {
    const noReliability = { type: 'pack' as const, ref: 'pack:p:s' };
    expect(validateClaim({ ...draftClaim(validDraft()).claim, evidence: [noReliability] })
      .some((f) => f.rule === 'E2')).toBe(true);
  });

  it('provisional without ceiling date fails; with ceiling passes (E2)', () => {
    const noCeiling = packEvidenceRef('p', 's', { provisional: true, measuredAtMs: NOW });
    const withCeiling = packEvidenceRef('p', 's', { provisional: true, provisionalUntil: '2027-03-01', measuredAtMs: NOW });
    const claim = draftClaim(validDraft()).claim;
    expect(validateClaim({ ...claim, evidence: [noCeiling] }).some((f) => f.rule === 'E2')).toBe(true);
    expect(validateClaim({ ...claim, evidence: [withCeiling] }).some((f) => f.rule === 'E2')).toBe(false);
  });
});

describe('consent issuance (C2)', () => {
  it('issues with a per-claim chosen subject and records the evidence window', () => {
    const ledger = emptyLedger();
    const { claim } = draftClaim(validDraft());
    const out = issueClaim(ledger, claim, 'Chosen Pseudonym');
    expect(out.claim?.subject).toBe('Chosen Pseudonym');
    expect(out.claim?.evidenceWindow?.fromMs).toBeLessThanOrEqual(NOW);
    expect(out.ledger.claims).toHaveLength(1);
  });

  it('refuses issuance without a subject (I1) and on failing rules', () => {
    const ledger = emptyLedger();
    const { claim } = draftClaim(validDraft());
    expect(issueClaim(ledger, claim, '  ').failures.some((f) => f.rule === 'I1')).toBe(true);
    const bad = { ...claim, evidence: [] };
    expect(issueClaim(ledger, bad, 'x').claim).toBeUndefined();
  });
});

describe('category-error firewall (C3)', () => {
  it('EQF without domain evidence fails (E4)', () => {
    const practiceOnly = { type: 'practice' as const, ref: 'vow:v1', reliability: { measuredAtMs: NOW } };
    const failures = validateClaim({ ...draftClaim(validDraft()).claim, evidence: [practiceOnly] });
    expect(failures.some((f) => f.rule === 'E4')).toBe(true);
  });

  it('stage-shaped evidence is rejected outright (E3/E4)', () => {
    const stageRef = { type: 'mastery' as const, ref: 'stage:Teal', reliability: { measuredAtMs: NOW } };
    const claim = draftClaim(validDraft()).claim;
    const failures = validateClaim({ ...claim, evidence: [stageRef] });
    expect(failures.some((f) => f.rule === 'E3')).toBe(true);
    expect(failures.some((f) => f.rule === 'E4')).toBe(true);
  });
});

describe('protected-data firewall (C4)', () => {
  it('identity/journal/shadow refs never pass (E3)', () => {
    const claim = draftClaim(validDraft()).claim;
    for (const ref of ['identity:profile-1', 'journal:entry-9', 'shadow:dark-addiction:Intrapersonal']) {
      const e = { type: 'attestation' as const, ref, reliability: { measuredAtMs: NOW } };
      expect(validateClaim({ ...claim, evidence: [e] }).some((f) => f.rule === 'E3'), ref).toBe(true);
    }
  });
});

describe('revocation (C5) + export (C6)', () => {
  it('revoked claims refuse export; ledger keeps tombstones', () => {
    let ledger = emptyLedger();
    const { claim } = draftClaim(validDraft());
    ledger = issueClaim(ledger, claim, 'Pseudonym').ledger;
    expect(toVerifiableCredential(ledger, claim.id).vc).toBeDefined();
    ledger = revokeClaim(ledger, claim.id, NOW + 1);
    expect(isRevoked(ledger, claim.id)).toBe(true);
    expect(toVerifiableCredential(ledger, claim.id).vc).toBeUndefined();
    expect(toVerifiableCredential(ledger, claim.id).error).toContain('revoked');
    expect(ledger.claims).toHaveLength(1); // tombstone, not deletion
  });

  it('projects the W3C-VC shape with competency metadata', () => {
    let ledger = emptyLedger();
    const { claim } = draftClaim(validDraft());
    const out = issueClaim(ledger, claim, 'Learner Pseudonym-1');
    ledger = out.ledger;
    const { vc } = toVerifiableCredential(ledger, claim.id);
    expect(vc).toBeDefined();
    expect(vc!.type).toContain('CompetencyCredential');
    expect(vc!.credentialSubject.eqfLevel).toBe(4);
    expect(vc!.credentialSubject.name).toBe('Learner Pseudonym-1');
    expect(vc!.credentialSubject.evidence.length).toBe(2);
    expect(vc!.credentialSubject.method).toContain('staircase');
  });

  it('unknown claims refuse export', () => {
    expect(toVerifiableCredential(emptyLedger(), 'nope').error).toBeDefined();
  });
});

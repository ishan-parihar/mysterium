/**
 * Claim-based credential ledger (doc 41 §4) — local-first credentialing.
 *
 * Evidence chain: every claim traces to typed evidence refs whose reliability
 * status is carried alongside — a claim may only cite pack evidence whose
 * pack has reliability data or an explicit provisionalUntil ceiling (the
 * honesty the psychometric harness reports). Consent is per-claim (issuance
 * is the player's act, 41 §4.3); identity fields are structurally excluded
 * from payloads (the subject field is a player-chosen pseudonym or name, NOT
 * the IdentityProfile — the firewall the kernel gate asserts).
 *
 * EQF category-error firewall (41 §4.2): levels attach to demonstrated
 * competency complexity within a domain, never to consciousness stages. The
 * ledger's inputs are mastery/pack/practice evidence only — stage data is
 * unreachable here by construction (no import from Significator internals).
 *
 * Export: W3C-VC-shaped JSON (self-issued immediately; partner countersign
 * slots come with 41 §4.5's routes). No network I/O in this module.
 */

// ---------------------------------------------------------------------------
// Claim model (41 §4.1)
// ---------------------------------------------------------------------------

export type EvidenceType = 'mastery' | 'pack' | 'practice' | 'attestation';

export interface EvidenceRef {
  readonly type: EvidenceType;
  /** Pointer into the evidence read model (concept id, pack session id, vow id…). */
  readonly ref: string;
  /** Reliability disclosure carried WITH the evidence, not buried elsewhere. */
  readonly reliability?: {
    readonly retestR?: number;
    readonly provisional?: boolean;
    readonly provisionalUntil?: string;
    readonly measuredAtMs: number;
  };
}

export interface CredentialClaim {
  readonly id: string;
  /** Player-chosen pseudonym or legal name per claim — never an IdentityProfile. */
  readonly subject: string;
  /** Canonical outcome statement (micro-credential learning outcome). */
  readonly competencyDescriptor: string;
  /** 37 domain tree id (e.g. 'math.foundations'). */
  readonly domain: string;
  readonly standardsTags?: readonly string[];
  readonly level?: { readonly eqf?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; readonly ects?: number };
  readonly evidence: readonly EvidenceRef[];
  /** Assessment method statement (micro-credential metadata). */
  readonly method: string;
  /** QA statement (micro-credential metadata). */
  readonly qualityAssurance: string;
  readonly issuedAtMs: number;
  readonly serialization?: 'edc-vc' | 'w3c-vc' | 'europass';
  /** Refresh disclosure: claims citing decaying evidence show their window. */
  readonly evidenceWindow?: { readonly fromMs: number; readonly toMs: number };
}

// ---------------------------------------------------------------------------
// Ledger state (pure; persisted by the caller like VowBook)
// ---------------------------------------------------------------------------

export interface ClaimLedger {
  readonly claims: readonly CredentialClaim[];
  /** Withdrawn claim ids — tombstones keep exports auditable. */
  readonly revoked: readonly { readonly id: string; readonly atMs: number }[];
}

export function emptyLedger(): ClaimLedger {
  return { claims: [], revoked: [] };
}

// ---------------------------------------------------------------------------
// Validation gates (the honesty rules, run at draft AND issue time)
// ---------------------------------------------------------------------------

export interface ClaimValidationFailure {
  readonly rule: 'E1' | 'E2' | 'E3' | 'E4' | 'I1';
  readonly message: string;
}

/**
 * Validate a drafted claim against the evidence-chain rules.
 *   E1  Every claim cites ≥ 1 evidence ref.
 *   E2  Pack evidence carries a reliability disclosure and it is either
 *       mature (retestR present) or explicitly provisional with a ceiling date.
 *   E3  No identity payload: subject is a freeform chosen name, and no
 *       evidence ref may smuggle identity/journal/shadow pointers.
 *   E4  EQF level present only with domain evidence (category-error firewall
 *       — stage-shaped refs like 'stage:*' are rejected outright).
 */
export function validateClaim(claim: CredentialClaim): ClaimValidationFailure[] {
  const failures: ClaimValidationFailure[] = [];
  if (claim.evidence.length === 0) {
    failures.push({ rule: 'E1', message: 'claim cites no evidence' });
  }
  for (const e of claim.evidence) {
    if (e.type === 'pack') {
      if (!e.reliability) {
        failures.push({ rule: 'E2', message: `pack evidence ${e.ref} lacks a reliability disclosure` });
      } else if (!e.reliability.provisional && e.reliability.retestR === undefined) {
        failures.push({ rule: 'E2', message: `pack evidence ${e.ref} has neither reliability data nor a provisional flag` });
      } else if (e.reliability.provisional && !e.reliability.provisionalUntil) {
        failures.push({ rule: 'E2', message: `provisional pack evidence ${e.ref} lacks a ceiling date` });
      }
    }
    const refLower = e.ref.toLowerCase();
    if (refLower.includes('identity') || refLower.includes('journal') || refLower.includes('shadow') || refLower.includes('stage:')) {
      failures.push({ rule: 'E3', message: `evidence ref '${e.ref}' points at protected or stage-shaped data` });
    }
  }
  if (claim.level?.eqf !== undefined) {
    // EQF requires the claim to be grounded in domain-tree evidence.
    const domainGrounded = claim.evidence.some((e) => e.type === 'mastery' || e.type === 'pack');
    if (!domainGrounded) {
      failures.push({ rule: 'E4', message: 'EQF level attached without mastery/pack domain evidence' });
    }
    // Stage-shaped evidence under an EQF claim is the category error itself.
    if (claim.evidence.some((e) => e.ref.toLowerCase().startsWith('stage:'))) {
      failures.push({ rule: 'E4', message: 'EQF level attached to stage-shaped evidence (category error)' });
    }
  }
  return failures;
}

// ---------------------------------------------------------------------------
// Draft → review → issue flow (41 §4.3; consent is the player's act)
// ---------------------------------------------------------------------------

export interface ClaimDraft {
  readonly competencyDescriptor: string;
  readonly domain: string;
  readonly standardsTags?: readonly string[];
  readonly level?: CredentialClaim['level'];
  readonly evidence: readonly EvidenceRef[];
  readonly method: string;
  readonly qualityAssurance: string;
  readonly serialization?: CredentialClaim['serialization'];
  readonly nowMs: number;
}

let claimSeq = 0;

/** Derivation engine: draft a metadata-complete claim from evidence. */
export function draftClaim(draft: ClaimDraft): { claim: CredentialClaim; failures: ClaimValidationFailure[] } {
  claimSeq += 1;
  const claim: CredentialClaim = {
    id: `claim-${draft.nowMs.toString(36)}-${claimSeq}`,
    subject: '', // set at issue time (player's per-claim naming choice)
    competencyDescriptor: draft.competencyDescriptor,
    domain: draft.domain,
    standardsTags: draft.standardsTags,
    level: draft.level,
    evidence: draft.evidence,
    method: draft.method,
    qualityAssurance: draft.qualityAssurance,
    issuedAtMs: draft.nowMs,
    serialization: draft.serialization ?? 'w3c-vc',
  };
  return { claim, failures: validateClaim(claim) };
}

/** Issue: player consented + named the subject. Fails closed on any rule. */
export function issueClaim(ledger: ClaimLedger, claim: CredentialClaim, subject: string): { ledger: ClaimLedger; claim?: CredentialClaim; failures: ClaimValidationFailure[] } {
  const failures = validateClaim(claim);
  if (failures.length > 0) return { ledger, failures };
  if (subject.trim().length === 0) {
    return { ledger, failures: [...failures, { rule: 'I1', message: 'subject name is required at issuance (per-claim consent act)' }] };
  }
  const issued: CredentialClaim = { ...claim, subject: subject.trim() };
  const evidenceFrom = Math.min(...claim.evidence.map(() => claim.issuedAtMs), claim.issuedAtMs);
  const withWindow: CredentialClaim = {
    ...issued,
    evidenceWindow: { fromMs: evidenceFrom, toMs: claim.issuedAtMs },
  };
  return { ledger: { ...ledger, claims: [...ledger.claims, withWindow] }, claim: withWindow, failures };
}

export function revokeClaim(ledger: ClaimLedger, id: string, atMs: number): ClaimLedger {
  if (!ledger.claims.some((c) => c.id === id)) return ledger;
  if (ledger.revoked.some((r) => r.id === id)) return ledger;
  return { ...ledger, revoked: [...ledger.revoked, { id, atMs }] };
}

export function isRevoked(ledger: ClaimLedger, id: string): boolean {
  return ledger.revoked.some((r) => r.id === id);
}

// ---------------------------------------------------------------------------
// Export (W3C-VC-shaped; Europass/EDC shapes slot into the same seam)
// ---------------------------------------------------------------------------

export interface VCProjection {
  readonly '@context': readonly string[];
  readonly type: readonly string[];
  readonly issuer: string;
  readonly issuanceDate: string;
  readonly credentialSubject: {
    readonly id: string;
    readonly name: string;
    readonly competency: string;
    readonly domain: string;
    readonly standardsTags?: readonly string[];
    readonly eqfLevel?: number;
    readonly ects?: number;
    readonly method: string;
    readonly qualityAssurance: string;
    readonly evidence: readonly EvidenceRef[];
    readonly evidenceWindow?: { readonly from: string; readonly to: string };
  };
}

/**
 * Project a claim to a W3C-VC-shaped JSON. Revoked claims refuse export.
 * Pure: the signing layer (self-sovereign key or partner countersign) wraps
 * this projection; it lives outside the core.
 */
export function toVerifiableCredential(ledger: ClaimLedger, claimId: string, issuerDid = 'did:mysterium:local'): { vc?: VCProjection; error?: string } {
  const claim = ledger.claims.find((c) => c.id === claimId);
  if (!claim) return { error: `claim ${claimId} not found` };
  if (isRevoked(ledger, claimId)) return { error: `claim ${claimId} is revoked` };
  const failures = validateClaim(claim);
  if (failures.length > 0) return { error: `claim ${claimId} fails validation: ${failures.map((f) => f.message).join('; ')}` };
  return {
    vc: {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential', 'CompetencyCredential'],
      issuer: issuerDid,
      issuanceDate: new Date(claim.issuedAtMs).toISOString(),
      credentialSubject: {
        id: issuerDid, // holder == issuer for self-issued claims
        name: claim.subject,
        competency: claim.competencyDescriptor,
        domain: claim.domain,
        standardsTags: claim.standardsTags,
        eqfLevel: claim.level?.eqf,
        ects: claim.level?.ects,
        method: claim.method,
        qualityAssurance: claim.qualityAssurance,
        evidence: claim.evidence,
        evidenceWindow: claim.evidenceWindow
          ? { from: new Date(claim.evidenceWindow.fromMs).toISOString(), to: new Date(claim.evidenceWindow.toMs).toISOString() }
          : undefined,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Evidence read-model bridge (pack → claim pipeline, plan Phase 9)
// ---------------------------------------------------------------------------

/**
 * Build a pack-evidence ref from a PackPsychometrics-style record. Provisional
 * packs produce provisional evidence — the disclosure travels WITH the claim.
 */
export function packEvidenceRef(
  packId: string,
  sessionId: string,
  reliability: { retestR?: number; provisional: boolean; provisionalUntil?: string; measuredAtMs: number },
): EvidenceRef {
  return {
    type: 'pack',
    ref: `pack:${packId}:${sessionId}`,
    reliability,
  };
}

/** Mastery evidence ref from a curriculum concept depth (37/31 machinery). */
export function masteryEvidenceRef(conceptId: string, depth: string, measuredAtMs: number): EvidenceRef {
  return {
    type: 'mastery',
    ref: `mastery:${conceptId}:${depth}`,
    reliability: { measuredAtMs },
  };
}

// ---------------------------------------------------------------------------
// RPL evidence export (41 §4.5 step 3, plan §8 item 5)
// ---------------------------------------------------------------------------

/**
 * The RPL portfolio — the format a partner institution's assessor receives
 * (41 §4.5 step 3: "the platform provides evidence, the institution awards").
 * Portfolio-shaped, not VC-shaped: institutions assess portfolios of
 * evidence claims, not single credentials. Structure mirrors what RPL
 * assessors expect: candidate-chosen name, competency claims with method +
 * QA metadata, per-claim reliability disclosures, and the assessment
 * context statement.
 *
 * Privacy: contains ONLY what issued claims already carry. Revoked claims
 * are excluded; drafts (unconsented) are excluded — the portfolio is the
 * player's consented public surface, nothing more.
 */
export interface RPLPortfolio {
  readonly format: 'mysterium-rpl-portfolio';
  readonly version: 1;
  readonly generatedAtMs: number;
  /** Player-chosen presentation name (per-claim subjects may differ; the
   *  portfolio uses the name the player picks at export time). */
  readonly candidateName: string;
  /** How the evidence was produced — the assessor's context. */
  readonly assessmentContext: string;
  readonly claims: readonly {
    readonly claimId: string;
    readonly domain: string;
    readonly competencyDescriptor: string;
    readonly standardsTags?: readonly string[];
    readonly level?: { readonly eqf?: number; readonly ects?: number };
    readonly method: string;
    readonly qualityAssurance: string;
    readonly issuedAt: string;
    readonly evidence: readonly EvidenceRef[];
  }[];
  /** Machine-checkable integrity: claim ids included, for verification against the issuing ledger. */
  readonly claimIds: readonly string[];
}

/**
 * Export the ledger's issued, non-revoked claims as an RPL portfolio.
 * Returns an error when there is nothing to export (never an empty
 * portfolio — that would misrepresent the candidate to an institution).
 */
export function exportRPLPortfolio(
  ledger: ClaimLedger,
  candidateName: string,
  options: {
    readonly assessmentContext?: string;
    readonly now?: number;
    /** Export only these claim ids (default: all issued, non-revoked). */
    readonly onlyClaimIds?: readonly string[];
  } = {},
): { portfolio?: RPLPortfolio; error?: string } {
  const now = options.now ?? Date.now();
  if (candidateName.trim().length === 0) {
    return { error: 'candidate name is required (the portfolio presents a chosen name, never a profile)' };
  }
  const revokedIds = new Set(ledger.revoked.map((r) => r.id));
  const only = options.onlyClaimIds ? new Set(options.onlyClaimIds) : null;
  const included = ledger.claims.filter(
    (c) =>
      c.subject.length > 0 && // issued (drafts have empty subject)
      !revokedIds.has(c.id) &&
      (only === null || only.has(c.id)),
  );
  if (included.length === 0) {
    return { error: 'no issued, non-revoked claims to export' };
  }
  // Fail-closed on validation: an invalid claim must never reach an assessor.
  for (const c of included) {
    const failures = validateClaim(c);
    if (failures.length > 0) {
      return { error: `claim ${c.id} fails validation: ${failures.map((f) => f.message).join('; ')}` };
    }
  }
  return {
    portfolio: {
      format: 'mysterium-rpl-portfolio',
      version: 1,
      generatedAtMs: now,
      candidateName: candidateName.trim(),
      assessmentContext: options.assessmentContext ??
        'Longitudinal evidence from a contemplative learning environment: adaptive, staircase-based competency assessment with parallel forms; mastery depth recorded per curriculum concept; all instrument reliability disclosures travel with the evidence.',
      claims: included.map((c) => ({
        claimId: c.id,
        domain: c.domain,
        competencyDescriptor: c.competencyDescriptor,
        standardsTags: c.standardsTags,
        level: c.level,
        method: c.method,
        qualityAssurance: c.qualityAssurance,
        issuedAt: new Date(c.issuedAtMs).toISOString(),
        evidence: c.evidence,
      })),
      claimIds: included.map((c) => c.id),
    },
  };
}

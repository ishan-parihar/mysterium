/**
 * credentialStore — browser persistence for the claim ledger (doc 41 §4).
 *
 * The CLI keeps the ledger in `credentials.json` beside the vow file
 * (`scripts/cli/practiceCmd.ts:runCredentialCommand`); the web surface keeps it
 * under its own localStorage key for the same reason `vowStore` does (39 §4.1):
 * the ledger lives OUTSIDE the Significator, so an old save parses unchanged and
 * consent records survive independently of the save.
 *
 * Every mutation goes through a ClaimLedger kernel function
 * (`draftClaim` / `issueClaim` / `revokeClaim`) and persists the returned
 * ledger. This store never authors a claim shape of its own — a second
 * validation path in the view layer is a second place for the evidence-chain
 * rules to be wrong.
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import {
  draftClaim,
  emptyLedger,
  issueClaim,
  masteryEvidenceRef,
  revokeClaim,
  type ClaimDraft,
  type ClaimLedger,
  type CredentialClaim,
  type EvidenceRef,
} from '$core/credential/ClaimLedger.js';

const LEDGER_KEY = 'credentials:v1';

/** The ledger as it stands in this session. */
export const credentialLedger = writable<ClaimLedger>(emptyLedger());

/** True once `loadCredentialLedger` has run, so the UI can tell empty from unread. */
export const credentialLedgerLoaded = writable(false);

function isEvidenceRefArray(v: unknown): v is readonly EvidenceRef[] {
  return Array.isArray(v) && v.every((e) => typeof e === 'object' && e !== null && typeof (e as { type?: unknown }).type === 'string' && typeof (e as { ref?: unknown }).ref === 'string');
}

function isCredentialClaim(v: unknown): v is CredentialClaim {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return typeof c.id === 'string'
    && typeof c.subject === 'string'
    && typeof c.competencyDescriptor === 'string'
    && typeof c.domain === 'string'
    && isEvidenceRefArray(c.evidence)
    && typeof c.method === 'string'
    && typeof c.qualityAssurance === 'string'
    && typeof c.issuedAtMs === 'number';
}

/**
 * Parse a persisted ledger, dropping any claim that does not match the kernel's
 * own shape. A corrupt or hand-edited entry is dropped rather than rendered:
 * showing a claim the kernel would refuse to issue is the one failure this
 * surface must not have.
 */
function parseLedger(raw: string | null): ClaimLedger {
  if (!raw) return emptyLedger();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return emptyLedger();
    const p = parsed as Record<string, unknown>;
    const claims = Array.isArray(p.claims) ? p.claims.filter(isCredentialClaim) : [];
    const revoked = Array.isArray(p.revoked)
      ? p.revoked.filter((r): r is { id: string; atMs: number } =>
          typeof r === 'object' && r !== null && typeof (r as { id?: unknown }).id === 'string' && typeof (r as { atMs?: unknown }).atMs === 'number')
      : [];
    return { claims, revoked };
  } catch {
    return emptyLedger();
  }
}

/** The localStorage surface the store needs. Injectable for tests. */
export interface LedgerStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

function localStorageAdapter(): LedgerStorage | null {
  if (!browser || typeof localStorage === 'undefined') return null;
  return {
    get: (k) => localStorage.getItem(k),
    set: (k, v) => localStorage.setItem(k, v),
  };
}

let storage: LedgerStorage | null = null;
let storageResolved = false;

function currentStorage(): LedgerStorage | null {
  if (!storageResolved) {
    storage = localStorageAdapter();
    storageResolved = true;
  }
  return storage;
}

/** Test seam: point the store at a Map so a jsdom run can exercise the read path. */
export function setLedgerStorage(next: LedgerStorage | null): void {
  storage = next;
  storageResolved = true;
}

/** Test seam: forget the resolved adapter. */
export function resetLedgerStorage(): void {
  storage = null;
  storageResolved = false;
}

/** Hydrate from storage (client-only; absent/corrupt → empty ledger). */
export function loadCredentialLedger(): void {
  const s = currentStorage();
  if (!s) {
    credentialLedger.set(emptyLedger());
    credentialLedgerLoaded.set(true);
    return;
  }
  try {
    credentialLedger.set(parseLedger(s.get(LEDGER_KEY)));
  } catch {
    credentialLedger.set(emptyLedger());
  }
  credentialLedgerLoaded.set(true);
}

function persist(ledger: ClaimLedger): void {
  credentialLedger.set(ledger);
  const s = currentStorage();
  if (!s) return;
  try {
    s.set(LEDGER_KEY, JSON.stringify(ledger));
  } catch {
    /* best-effort: the in-memory ledger still reflects the change */
  }
}

/** Snapshot for pure kernel calls (same shape as `currentVowBook`). */
export function currentLedger(): ClaimLedger {
  return get(credentialLedger);
}

export interface DraftResult {
  readonly claim?: CredentialClaim;
  readonly failures: readonly string[];
}

/**
 * Derive a claim from evidence via the kernel, then store it as a DRAFT.
 * Issuance is a separate act because naming the subject is the player's
 * per-claim consent (41 §4.3) — a draft must not be treated as a credential.
 */
export function draftFromEvidence(draft: ClaimDraft): DraftResult {
  const { claim, failures } = draftClaim(draft);
  if (failures.length > 0) return { failures: failures.map((f) => `${f.rule}: ${f.message}`) };
  const ledger = currentLedger();
  persist({ ...ledger, claims: [...ledger.claims, claim] });
  return { claim, failures: [] };
}

export interface IssueResult {
  readonly claim?: CredentialClaim;
  readonly failures: readonly string[];
}

/** Issue a drafted claim under a player-chosen name. Fails closed. */
export function issueDraft(claimId: string, subject: string): IssueResult {
  const ledger = currentLedger();
  const claim = ledger.claims.find((c) => c.id === claimId);
  if (!claim) return { failures: [`claim ${claimId} not found`] };
  if (claim.subject) return { failures: ['claim already issued'] };
  // `issueClaim` APPENDS the issued claim to the ledger it is given (ClaimLedger.ts:178),
  // so the draft must be removed from what we hand it — otherwise the store ends up
  // holding the draft AND its issued twin under the same id, and the first one wins
  // in `readCredentialView`, showing the claim as permanently unissued.
  const without = { ...ledger, claims: ledger.claims.filter((c) => c.id !== claimId) };
  const out = issueClaim(without, claim, subject);
  if (!out.claim) return { failures: out.failures.map((f) => `${f.rule}: ${f.message}`) };
  persist(out.ledger);
  return { claim: out.claim, failures: [] };
}

/** Tombstone a claim. `revokeClaim` is a no-op on unknown/already-revoked ids. */
export function revoke(claimId: string, atMs = Date.now()): void {
  persist(revokeClaim(currentLedger(), claimId, atMs));
}

/** The default evidence ref the CLI drafts from: a curriculum mastery record. */
export function defaultMasteryEvidence(domain: string, depth: string, measuredAtMs = Date.now()): EvidenceRef {
  return masteryEvidenceRef(domain, depth, measuredAtMs);
}

/**
 * The measurement-pack surface for the browser (`/pack`).
 *
 * The pack engine is live and **G45** locks its seam: the registry seeds on the boot path
 * (`GameLoop.startSession` calls `seedPackRegistry()`), so a `getPack` read in production is a HIT
 * and not a fallback-masked always-miss. This module reads the SAME registry through the SAME
 * `allPacks()` / `getPack()` API the CLI's `pack` command uses, and adds the two things a page needs
 * that a CLI line does not: the reliability standing, and the refusal to overstate it.
 *
 * The honesty law, and it is the whole point of this file:
 *
 *  - **Pack evidence is a CLAIM DRAFT, not a certification** (40 §1, 41 §4.3). `draftClaim`
 *    produces a claim nobody has issued; `issueClaim` is the player's consented act and names the
 *    subject. A page that renders a draft next to a green badge is claiming an authority the
 *    artefact does not have, so the view exposes DRAFT/ISSUED/REVOKED as distinct standings and
 *    never collapses them.
 *  - **The reliability disclosure travels WITH the evidence** (E2). A pack evidence ref is only
 *    valid if it is mature (a retest correlation exists) or explicitly provisional with a ceiling
 *    date; `validateClaim` enforces that at draft time, and this module re-reads the SAME
 *    `ReliabilityCollector` report the CLI's draft cites, so the number on the page is the number in
 *    the claim. A draft whose disclosure is missing is reported as INVALID, not rendered prettily.
 *  - **A pack with no sessions is provisional BY CONSTRUCTION, not by failure.** `computeReport`
 *    on zero sessions returns `gate: 'provisional'`. The view states that as a ceiling date and a
 *    count of sessions still needed, so an empty state reads as "not yet measured", never as a
 *    score of zero.
 *  - **The responder was a hash policy, not a person** (`scripts/cli/packCmd.ts`'s
 *    `RESPONDER_PROVENANCE`, and `delegate.ts`'s `runPackMandate`: `item.difficulty <=
 *    responderPolicy`). Every session this surface can show was scored by a deterministic simulated
 *    responder. That disclosure is the difference between "evidence of the machinery" and "a
 *    measured person", and the CLI prints it in yellow; a page has to carry it too.
 *
 * Nothing here decides anything: the engine owns measurement, the collector owns reliability, the
 * ledger owns claims. This module only reads and says.
 */

import { allPacks, getPack, type MeasurementPack, type PackSessionRecord } from '$core/packs/PackEngine.js';
import { ReliabilityCollector, type ReliabilityReport } from '$core/packs/ReliabilityCollector.js';
import { seedPackRegistry } from '$core/packs/referencePacks.js';
import { isRevoked, validateClaim, type ClaimLedger, type CredentialClaim } from '$core/credential/ClaimLedger.js';

// ── Persisted sessions (the reliability store the CLI writes; KV in the app) ──────────────────

const SESSIONS_KEY = 'pack-sessions:v1';

/** One recorded session plus the provenance the CLI stamps on it. */
export interface StoredSession extends PackSessionRecord {
  readonly packId: string;
  /**
   * How the session's responses were produced. `'deterministic-simulated'` is every session any
   * code path can currently produce: `runPackMandate` scores trials by a hash-derived policy. A
   * real human-answer path would extend this union, and every renderer below follows it.
   */
  readonly provenance: 'deterministic-simulated';
}

export function loadPackSessions(): readonly StoredSession[] {
  try {
    const raw = globalThis.localStorage?.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Narrow rather than cast: a malformed row must not become a session with undefined math.
    return parsed.filter(isStoredSession);
  } catch {
    return [];
  }
}

export function savePackSessions(sessions: readonly StoredSession[]): void {
  try { globalThis.localStorage?.setItem(SESSIONS_KEY, JSON.stringify(sessions)); } catch { /* degrade */ }
}

function isStoredSession(v: unknown): v is StoredSession {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return typeof s.packId === 'string'
    && typeof s.sessionId === 'string'
    && typeof s.formId === 'string'
    && typeof s.theta === 'number' && Number.isFinite(s.theta)
    && typeof s.se === 'number' && Number.isFinite(s.se)
    && typeof s.trials === 'number' && Number.isFinite(s.trials)
    && typeof s.correctCount === 'number' && Number.isFinite(s.correctCount)
    && typeof s.completedAtMs === 'number' && Number.isFinite(s.completedAtMs)
    && Array.isArray(s.itemIds);
}

// ── The reliability report, through the collector that computes it ────────────────────────────

/**
 * Replay the stored sessions through `ReliabilityCollector` and ask for the pack's report.
 *
 * Replayed rather than cached: `recordSession` enforces the pack's retest interval, so a session
 * recorded too early is stored and EXCLUDED from pairing — and only the collector knows which. The
 * CLI does the same replay (`priorRows` → `collector.recordSession` → `computeReport`), so the page
 * and the CLI cannot disagree about how many sessions count.
 */
export function reliabilityReportFor(pack: MeasurementPack, nowMs: number): ReliabilityReport {
  const collector = new ReliabilityCollector();
  const prior = loadPackSessions().filter((s) => s.packId === pack.id);
  for (const s of prior) collector.recordSession(pack, s);
  return collector.computeReport(pack, nowMs);
}

// ── The claim's standing — draft / issued / revoked / invalid ─────────────────────────────────

export type ClaimStanding =
  | { readonly kind: 'draft'; readonly subject: string | null }
  | { readonly kind: 'issued'; readonly subject: string }
  | { readonly kind: 'revoked'; readonly subject: string | null }
  /**
   * The claim exists but FAILS its own evidence rules (`validateClaim` non-empty). Surfacing this
   * is the point: a draft that cannot be issued is a defect in the evidence, and hiding it would
   * leave the player believing a working credential path.
   */
  | { readonly kind: 'invalid'; readonly subject: string | null; readonly reasons: readonly string[] };

export function claimStanding(ledger: ClaimLedger, claim: CredentialClaim): ClaimStanding {
  const failures = validateClaim(claim).map((f) => `${f.rule}: ${f.message}`);
  if (failures.length > 0) {
    return { kind: 'invalid', subject: claim.subject || null, reasons: failures };
  }
  if (isRevoked(ledger, claim.id)) {
    return { kind: 'revoked', subject: claim.subject || null };
  }
  // A claim carrying a subject has been through `issueClaim` (the consented, naming act); a draft
  // carries an empty subject and no issuer until the player consents.
  return claim.subject
    ? { kind: 'issued', subject: claim.subject }
    : { kind: 'draft', subject: null };
}

// ── The per-pack view ─────────────────────────────────────────────────────────────────────────

export interface PackView {
  readonly id: string;
  readonly construct: string;
  readonly locale: string | null;
  /** Items and forms in the instrument — the honest shape of the thing, not a summary score. */
  readonly formIds: readonly string[];
  readonly itemCount: number;
  /** Sessions recorded on this device, and how many the collector will actually pair. */
  readonly recordedSessions: number;
  readonly report: ReliabilityReport;
  /** The gap between what the maturity rule needs and what exists — a plan, not a verdict. */
  readonly sessionsNeeded: number;
  /** The provisional ceiling, when the pack declares one. `null` = mature-declared. */
  readonly provisionalUntil: string | null;
  /** Claims citing this pack, in ledger order. */
  readonly claims: readonly { readonly id: string; readonly standing: ClaimStanding; readonly ref: string }[];
  /** True when ANY session on record was scored by something other than a human. */
  readonly responderIsSimulated: boolean;
}

const LEDGER_KEY = 'credentials:v1';

function loadLedger(): ClaimLedger {
  try {
    const raw = globalThis.localStorage?.getItem(LEDGER_KEY);
    if (!raw) return { claims: [], revoked: [] };
    const parsed = JSON.parse(raw) as ClaimLedger;
    return Array.isArray(parsed.claims) && Array.isArray(parsed.revoked) ? parsed : { claims: [], revoked: [] };
  } catch {
    return { claims: [], revoked: [] };
  }
}

export function saveLedger(ledger: ClaimLedger): void {
  try { globalThis.localStorage?.setItem(LEDGER_KEY, JSON.stringify(ledger)); } catch { /* degrade */ }
}

/**
 * Every registered pack, projected.
 *
 * `seedPackRegistry()` is called first, defensively: G45 guarantees the boot path seeds it, and this
 * call is idempotent, so the guarantee is not being re-litigated — it just means this route does not
 * depend on having navigated through `/play` first. `allPacks()` is the registry's own read, so an
 * empty registry would surface as an empty page (a real, visible defect) rather than as a silent
 * fallback list of hardcoded packs.
 */
export function packViews(nowMs: number): readonly PackView[] {
  seedPackRegistry();
  const ledger = loadLedger();
  const sessions = loadPackSessions();
  return allPacks().map((pack) => {
    const report = reliabilityReportFor(pack, nowMs);
    const packSessions = sessions.filter((s) => s.packId === pack.id);
    // The maturity rule is the report's OWN field (E2 travels with the disclosure), never a
    // re-declared threshold — a page that re-stated the rule would drift from the engine's.
    const sessionsNeeded = Math.max(0, report.maturityRule.minSessions - report.sessionCount);
    return {
      id: pack.id,
      construct: pack.construct,
      locale: pack.locale ?? null,
      formIds: pack.forms.map((f) => f.id),
      itemCount: pack.items.length,
      recordedSessions: packSessions.length,
      report,
      sessionsNeeded,
      provisionalUntil: pack.provisionalUntil ?? null,
      claims: ledger.claims
        .filter((c) => c.evidence.some((e) => e.ref.startsWith(`pack:${pack.id}:`)))
        .map((c) => ({
          id: c.id,
          standing: claimStanding(ledger, c),
          ref: c.evidence.find((e) => e.ref.startsWith(`pack:${pack.id}:`))?.ref ?? `pack:${pack.id}`,
        })),
      responderIsSimulated: packSessions.some((s) => s.provenance === 'deterministic-simulated'),
    };
  });
}

/** One pack by id, through the registry's own lookup (G45's production read). */
export function packView(id: string, nowMs: number): PackView | null {
  seedPackRegistry();
  const pack: MeasurementPack | undefined = getPack(id);
  if (!pack) return null;
  return packViews(nowMs).find((v) => v.id === pack.id) ?? null;
}

// ── The standing statement the page must not soften ───────────────────────────────────────────

/** The one honest sentence about what a pack page can and cannot say. Used verbatim by the route. */
export const PACK_STANDING = 'A pack is a measurement instrument under development. What you see here is a claim draft and a reliability report, not a certification: nothing here has been issued, and the sessions on record were answered by a deterministic simulation of the scoring policy, not by a person.';

/** Whether a report has met its own maturity rule — read from the report, never recomputed. */
export function isMature(report: ReliabilityReport): boolean {
  return report.gate === 'mature';
}

/**
 * PlayerTelemetryView — the browser twin of the CLI's `insights` / `export` /
 * `events` / `credential` aggregation, extracted so the ROUTES never
 * re-implement a metric.
 *
 * The CLI does its aggregation inside `console.log` in
 * `src/cli/TrainingRuntime.ts:runInsightsCommand` and `src/cli/ExportRuntime.ts`,
 * which is un-reusable: there is no function to call, only a print. So the
 * AGGREGATION is lifted here — the same reads (TrialRecordStore, CognitiveIndex)
 * and the same arithmetic the CLI performs — and the CLI's serialisation is
 * preserved verbatim so a web export and a CLI export carry the same fields.
 *
 * Veil rule: `CognitiveIndex.feltSenseFor` is the only index text that reaches a
 * player view. Raw accuracy/RT stay in this module's return values, which
 * /insights never renders and only /export (the player's own data, handed back
 * to them) serialises.
 *
 * Storage: this module reads the SAME records the player's own play wrote —
 * the Significator (localStorage, via `loadSignificatorFromStorage`) and the
 * trial/session store. It never derives numbers from anywhere else, and never
 * reads a key directly; persistence stays with the stores that own each key.
 *
 * The one CLI behaviour deliberately NOT reproduced: `applyDecay()` mutates the
 * in-memory index, and the CLI calls it once per invocation. A page that called
 * it on every render would advance decay on every navigation. `snapshot()`
 * already applies the same `decayScore` to the value it returns, so a read needs
 * no mutation — the displayed number is identical and viewing is not a write.
 */

import type { Line } from '$core/domain/Line.js';
import type { SessionRecord } from '$core/braingame/TrialRecordStore.js';
import type { TrialRecord } from '$core/braingame/types.js';
import { allParadigms } from '$core/braingame/registry.js';
import { computeLearningAnalytics } from '$core/curriculum/LearningAnalytics.js';
import type { KnowledgeState } from '$core/curriculum/types.js';
import {
  exportRPLPortfolio,
  isRevoked,
  toVerifiableCredential,
  validateClaim,
  type ClaimLedger,
} from '$core/credential/ClaimLedger.js';
import type { TrainingServices } from '$core/assessments/trainingTools.js';

/**
 * One recorded event, as the WEB store actually holds it.
 *
 * Deliberately NOT `core/telemetry/TelemetryEvent`: that type's `type` is the
 * CLOSED `TelemetryEventType` union, but `telemetryStore` declares its own
 * `type: string` and the engine emits at least one kind outside that union
 * (`training_beat_completed`, gameEngine.ts:408) — it type-checks only because
 * the store widened the field. Narrowing this to the union would be a lie about
 * what is in the buffer, so the view carries the honest shape and reports the
 * kind as a string. Closing that gap means either amending the union or dropping
 * the emit; both touch shared kernel files outside this slice's scope.
 */
export interface RecordedEvent {
  readonly id: string;
  readonly type: string;
  readonly timestamp: number;
  readonly data: Readonly<Record<string, unknown>>;
}

const DAY_MS = 86_400_000;

// ── insights ───────────────────────────────────────────────────────────

export type Trend = 'rising' | 'stable' | 'decaying';

export interface LineInsight {
  readonly line: Line;
  /** The one player-facing phrase. Never render score01 in its place. */
  readonly feltSense: string;
  readonly trend: Trend;
  /** Raw, Veil-hidden. Rendered only under an explicit reveal. */
  readonly score01: number;
  readonly lastPlayedDaysAgo: number;
}

export interface DayPoint {
  /** ISO yyyy-mm-dd, ascending. */
  readonly day: string;
  readonly accuracy: number;
  readonly trials: number;
}

export interface InsightsModel {
  readonly days: number;
  readonly lines: readonly LineInsight[];
  readonly recentSessions: readonly SessionRecord[];
  readonly trend: readonly DayPoint[];
  /** Sessions outside the window — drives the "you haven't played lately" copy. */
  readonly sessionsOutsideWindow: number;
  /**
   * False when the index still holds no recorded play. A page that renders the
   * untouched baseline as if it were a measurement is the defect this prevents.
   */
  readonly hasTrainingData: boolean;
}

export interface InsightsOptions {
  readonly days?: number;
  /** Injected in tests; defaults to the browser TrainingServices singleton. */
  readonly services?: TrainingServices;
}

/**
 * Per-line aggregates over a `days` window — the web form of the CLI's
 * `mysterium insights --days N [--trend]`.
 */
export async function loadInsights(options: InsightsOptions = {}): Promise<InsightsModel> {
  const days = options.days ?? 14;
  const s = options.services;
  if (!s) throw new Error('loadInsights requires TrainingServices (call with services: in tests, or use the route loader)');
  const now = s.now();

  const lines: LineInsight[] = s.index.snapshot(now).map((e) => ({
    line: e.line,
    feltSense: s.index.feltSenseFor(e.line),
    trend: e.trend,
    score01: e.score01,
    lastPlayedDaysAgo: e.lastPlayedDaysAgo,
  }));

  const cutoff = now - days * DAY_MS;
  const allRecent = await s.trials.recentSessions(20);
  const recentSessions = allRecent.filter((r) => r.startedAt >= cutoff).slice(0, 10);

  return {
    days,
    lines,
    recentSessions,
    trend: dailyTrend(recentSessions),
    sessionsOutsideWindow: allRecent.length - recentSessions.length,
    hasTrainingData: hasTrainingData(lines),
  };
}

/** Per-day mean accuracy, ascending. */
function dailyTrend(sessions: readonly SessionRecord[]): readonly DayPoint[] {
  const byDay = new Map<string, { accSum: number; count: number; trials: number }>();
  for (const s of sessions) {
    const day = new Date(s.startedAt).toISOString().slice(0, 10);
    const cur = byDay.get(day) ?? { accSum: 0, count: 0, trials: 0 };
    cur.accSum += s.accuracy;
    cur.count += 1;
    cur.trials += s.trialsCompleted;
    byDay.set(day, cur);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([day, v]) => ({ day, accuracy: Math.round((v.accSum / v.count) * 100) / 100, trials: v.trials }));
}

/**
 * A line the player has never trained sits at baseline 0.5 with zero sessions.
 * `snapshot()` cannot distinguish that from a real 0.5, so the flag reads the
 * session evidence: an index that has only ever been defaulted has every line at
 * exactly the untouched baseline with no play recorded.
 */
function hasTrainingData(lines: readonly LineInsight[]): boolean {
  return lines.some((l) => Math.abs(l.score01 - 0.5) > 1e-9);
}

// ── export ─────────────────────────────────────────────────────────────

export type ExportFormat = 'json' | 'csv';

export interface ExportOptions {
  readonly format?: ExportFormat;
  readonly paradigm?: string;
  readonly days?: number;
  readonly analytics?: boolean;
  /** Curriculum progress; absent → the analytics section is reported absent. */
  readonly knowledge?: KnowledgeState;
  readonly services?: TrainingServices;
  /** Export timestamp. Injected in tests so the payload is deterministic. */
  readonly now?: number;
}

export interface ExportBundle {
  readonly format: ExportFormat;
  readonly fileName: string;
  readonly mimeType: string;
  readonly body: string;
  readonly trialCount: number;
  readonly sessionCount: number;
  /** Plain statement of what the produced file actually contains. */
  readonly included: readonly string[];
  /** Set when an optional section was asked for and is not present. */
  readonly missing: readonly string[];
}

/**
 * Build the player's own export. Serialisation is copied from
 * `src/cli/ExportRuntime.ts` (`serializeTrialForExport` / `toCsv`) field for
 * field, so the two surfaces cannot drift into producing different files.
 */
export async function buildExport(options: ExportOptions): Promise<ExportBundle> {
  const s = options.services;
  if (!s) throw new Error('buildExport requires TrainingServices (call with services: in tests, or use the route loader)');
  const format: ExportFormat = options.format === 'csv' ? 'csv' : 'json';
  const now = options.now ?? s.now();

  const paradigms = options.paradigm ? [options.paradigm] : allParadigms().map((p) => p.id);
  const all: TrialRecord[] = [];
  for (const pid of paradigms) all.push(...(await s.trials.trialsByParadigm(pid)));

  let trials = all;
  if (typeof options.days === 'number' && options.days > 0) {
    const cutoff = now - options.days * DAY_MS;
    trials = all.filter((t) => t.timestamp >= cutoff);
  }
  const sorted = [...trials].sort((a, b) => a.timestamp - b.timestamp);

  const allSessions = await s.trials.recentSessions(100);
  let sessions = allSessions;
  if (typeof options.days === 'number' && options.days > 0) {
    const cutoff = now - options.days * DAY_MS;
    sessions = sessions.filter((x) => x.startedAt >= cutoff);
  }
  if (options.paradigm) sessions = sessions.filter((x) => x.paradigmId === options.paradigm);

  const included: string[] = [
    `trial records (${sorted.length}): session id, paradigm id, timestamp, trial index, correctness, accuracy, adjusted latency, params hash`,
    `session summaries (${sessions.length}): accuracy, trials completed, median latency, composite performance`,
  ];
  const missing: string[] = [];

  const stem = exportStem(options);
  if (format === 'csv') {
    if (options.analytics) missing.push('learning analytics — CSV carries trial rows only; choose JSON to include it');
    return {
      format,
      fileName: `${stem}.csv`,
      mimeType: 'text/csv',
      body: toCsv(sorted, sessions),
      trialCount: sorted.length,
      sessionCount: sessions.length,
      included,
      missing,
    };
  }

  const payload: Record<string, unknown> = {
    exportedAt: now,
    days: options.days ?? null,
    paradigm: options.paradigm ?? null,
    trials: sorted.map(serializeTrialForExport),
    sessions,
  };
  if (options.analytics) {
    if (options.knowledge) {
      payload.learningAnalytics = computeLearningAnalytics(options.knowledge);
      included.push('learning analytics: per-subject study efficiency, learning velocity, modality effectiveness, review intervals');
    } else {
      payload.learningAnalytics = null;
      missing.push('learning analytics — no curriculum progress is saved for this device');
    }
  }
  return {
    format,
    fileName: `${stem}.json`,
    mimeType: 'application/json',
    body: JSON.stringify(payload, null, 2),
    trialCount: sorted.length,
    sessionCount: sessions.length,
    included,
    missing,
  };
}

function exportStem(o: ExportOptions): string {
  const parts = ['mysterium-export'];
  if (o.paradigm) parts.push(o.paradigm.replace(/[^a-z_]/gi, '_'));
  if (typeof o.days === 'number' && o.days > 0) parts.push(`${o.days}d`);
  return parts.join('-');
}

function serializeTrialForExport(t: TrialRecord): Record<string, unknown> {
  return {
    sessionId: t.sessionId,
    paradigmId: t.paradigmId,
    timestamp: t.timestamp,
    trialIndex: t.trialIndex,
    correct: t.correct,
    accuracy: t.accuracy,
    latencyMs: t.adjustedLatencyMs,
    paramsHash: t.paramsHash,
  };
}

function toCsv(trials: readonly TrialRecord[], sessions: readonly SessionRecord[]): string {
  const header = 'sessionId,paradigmId,timestamp,trialIndex,correct,accuracy,latencyMs,paramsHash';
  const rows = trials.map((t) =>
    [t.sessionId, t.paradigmId, String(t.timestamp), String(t.trialIndex), t.correct ? '1' : '0', String(t.accuracy), t.adjustedLatencyMs === null ? '' : String(t.adjustedLatencyMs), t.paramsHash]
      .map(csvEscape)
      .join(','),
  );
  if (sessions.length > 0) {
    const sessHeader = '# sessions: sessionId,paradigmId,startedAt,trialsCompleted,accuracy,rtMedianMs,performance';
    const sessRows = sessions.map((s0) =>
      [s0.sessionId, s0.paradigmId, String(s0.startedAt), String(s0.trialsCompleted), String(s0.accuracy), s0.rtMedianMs === null ? '' : String(s0.rtMedianMs), String(s0.performance)]
        .map(csvEscape)
        .join(','),
    );
    return [header, ...rows, sessHeader, ...sessRows].join('\n');
  }
  return [header, ...rows].join('\n');
}

function csvEscape(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

// ── events ─────────────────────────────────────────────────────────────

export interface EventKindCount {
  readonly type: string;
  readonly count: number;
}

export interface EventTail {
  readonly events: readonly RecordedEvent[];
  /** The kinds present, most frequent first — a legend, not a re-listing. */
  readonly kinds: readonly EventKindCount[];
  /**
   * False when telemetry is switched off for this device. The CLI distinguishes
   * "opt-in off, nothing recorded" from "enabled, no events yet" (runEvents) and
   * so must we: an empty list is only honest when recording is actually on.
   */
  readonly recording: boolean;
  /** Total held, before the tail cut — so "showing 20 of 137" is possible. */
  readonly total: number;
}

export interface EventTailOptions {
  readonly tail?: number;
  readonly recording?: boolean;
}

/** The recent event tail, newest last. Pure — the caller supplies the source. */
export function buildEventTail(events: readonly RecordedEvent[], options: EventTailOptions = {}): EventTail {
  const tail = options.tail ?? 20;
  const recent = events.slice(-tail);
  const counts = new Map<string, number>();
  for (const e of recent) counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
  const kinds: EventKindCount[] = [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  return { events: recent, kinds, recording: options.recording ?? false, total: events.length };
}

// ── credential ─────────────────────────────────────────────────────────

export interface CredentialRow {
  readonly id: string;
  /** '' for a draft — the subject is the player's per-claim naming act. */
  readonly subject: string;
  readonly descriptor: string;
  readonly domain: string;
  readonly evidenceCount: number;
  readonly issuedAtMs: number;
  readonly revoked: boolean;
  /** Validation failures; non-empty means this claim can never be issued. */
  readonly failures: readonly string[];
}

export interface CredentialView {
  readonly issued: readonly CredentialRow[];
  readonly drafts: readonly CredentialRow[];
  /** Tombstoned claim ids — kept so a withdrawn credential stays auditable. */
  readonly revokedIds: readonly string[];
}

/**
 * Split the ledger into what a player can actually PORT (issued) and what still
 * awaits their consent act (drafts). A draft carries `subject: ''` and
 * `toVerifiableCredential` cannot project it, so rendering the two in one list
 * would advertise a credential that does not exist.
 */
export function readCredentialView(ledger: ClaimLedger): CredentialView {
  const rows = ledger.claims.map((c): CredentialRow => ({
    id: c.id,
    subject: c.subject,
    descriptor: c.competencyDescriptor,
    domain: c.domain,
    evidenceCount: c.evidence.length,
    issuedAtMs: c.issuedAtMs,
    revoked: isRevoked(ledger, c.id),
    failures: validateClaim(c).map((f) => `${f.rule}: ${f.message}`),
  }));
  return {
    issued: rows.filter((r) => r.subject.trim().length > 0),
    drafts: rows.filter((r) => r.subject.trim().length === 0),
    revokedIds: ledger.revoked.map((r) => r.id),
  };
}

export interface CredentialExport {
  readonly body: string;
  /** The refusal text from the kernel, or '' when the export succeeded. */
  readonly error: string;
  readonly fileName: string;
}

/** The RPL portfolio (or a single W3C VC when `claimId` is given). */
export function buildCredentialExport(
  ledger: ClaimLedger,
  candidateName: string,
  claimId?: string,
): CredentialExport {
  if (claimId) {
    // The kernel's `toVerifiableCredential` does NOT check that the claim was issued —
    // it validates the claim's fields, and a draft passes that with `subject: ''`.
    // It will happily emit a credential whose credentialSubject names nobody. This
    // view is the layer that knows a draft is not yet a credential (41 §4.3), so the
    // refusal lives here; the kernel's silence is documented, not papered over.
    if (!ledger.claims.some((c) => c.id === claimId && c.subject.trim().length > 0)) {
      return { body: '', error: `claim ${claimId} is not issued — name it before exporting`, fileName: '' };
    }
      const { vc, error } = toVerifiableCredential(ledger, claimId);
    if (!vc) return { body: '', error: error ?? 'claim cannot be projected', fileName: '' };
    return { body: JSON.stringify(vc, null, 2), error: '', fileName: `${claimId}.json` };
  }
  const out = exportRPLPortfolio(ledger, candidateName);
  if (!out.portfolio) return { body: '', error: out.error ?? 'nothing to export', fileName: '' };
  return { body: JSON.stringify(out.portfolio, null, 2), error: '', fileName: 'mysterium-claims.json' };
}

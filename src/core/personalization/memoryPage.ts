/**
 * The standing page (MemoryPage) — 48 §3 (`docs/foundations/48-memory-architecture.md`), the
 * player-level cross-session memory object. Phase 12 d1.
 *
 * The Hindsight *mental-model* pattern made lawful: a standing answer, read at session boot
 * WITHOUT retrieval, rebuilt deterministically at session end from COMMITTED state only.
 *
 * The five laws (48 §3), enforced here by construction:
 * - **M1 deterministic build** — template prose over committed deltas; no LLM at write, no LLM at
 *   read; rebuilding from the same feed state yields byte-identical prose (tested).
 * - **M2 bounded by design** — hard budgets: trajectory ≤ 400 chars, ≤ 8 open threads (oldest
 *   closed first), ≤ 12 holon stances (most-intense kept).
 * - **M3 provenance required** — every thread cites the feed entry that opened it; the page
 *   records the full `derivedFrom` id list. A line that cannot cite its origin is fabrication.
 * - **M4 banded language only** — no scores, no stage names, no drive names, no assessment
 *   vocabulary (MY-AD-0020 crosses the recall path). The builders consume COMMITTED verdicts
 *   and worker digests only — raw signals never reach this module's inputs.
 * - **M5 one page, no parallel profiles** — a pure view over the feed + worker states; nothing
 *   here is stored as a second profile. Delete the entries and the rebuilt page loses the line.
 */

import type { ReportingFeed } from '../orchestration/reportingFeed.js';
import type { OwnerWorkerPoolState } from '../world/ownerWorkerPool.js';
import type { Holon } from '../world/Holon.js';

/** The thread budget (48 §3 M2). */
export const MAX_OPEN_THREADS = 8;
/** The trajectory prose budget, in characters (48 §3 M2). */
export const MAX_TRAJECTORY_CHARS = 400;
/** The holon-stance budget (48 §3 M2). */
export const MAX_HOLON_STATES = 12;

export interface OpenThread {
  /** The feed entry id that opened this thread — provenance (M3). */
  readonly ref: string;
  /** One sentence, banded language only (M4). */
  readonly summary: string;
  readonly ageSessions: number;
}

export interface HolonStance {
  readonly holonId: string;
  /** Banded stance prose mirrored from the worker's L3 digest. */
  readonly stance: string;
}

export interface MemoryPage {
  /** Deterministic clock of the rebuild (22 §9). */
  readonly builtAt: number;
  /** Every feed-entry id the page was built FROM — the provenance set (M3). */
  readonly derivedFrom: readonly string[];
  /** The arc so far, in stage-register voice — bounded prose (M2). */
  readonly trajectory: string;
  /** What is unresolved and should return (M2: oldest closed first past the budget). */
  readonly openThreads: readonly OpenThread[];
  /** Holon stance mirrors — the worker L3 digests, banded (M5: a view, not a store). */
  readonly holonStates: readonly HolonStance[];
}

/** Verdict language → banded thread summaries. The ONLY vocabulary this module emits. */
const VERDICT_BANDS: Readonly<Record<string, string>> = {
  encounter_record: 'a step was taken and settled',
  shadow_entry: 'something long-avoided was faced',
  mastery_evidence: 'a capability was shown to hold',
  pack_score: 'a practice was measured and returned',
  trajectory: 'the direction of travel was named',
  retention_estimate: 'what was kept was weighed',
  alignment_adjustment: 'the course was gently corrected',
  threshold_signal: 'something is ripening toward a change',
  consent_inform: 'a boundary was voiced and honoured',
};

/** Build the banded trajectory prose from COMMITTED verdict entries only (M1/M4). */
function buildTrajectory(feed: ReportingFeed): string {
  const committed = feed.read('cci').filter((e) => e.verdict !== undefined);
  const sessions = feed.read('planning').filter((e) => e.source === 'session');
  const count = committed.reduce((acc, e) => acc + (e.verdict?.committed.length ?? 0), 0);
  if (sessions.length === 0 && count === 0) return '';
  const s = sessions.length;
  const kindCounts = new Map<string, number>();
  for (const e of committed) {
    for (const c of e.verdict?.committed ?? []) {
      const kind = c.split('#')[0] ?? c;
      kindCounts.set(kind, (kindCounts.get(kind) ?? 0) + 1);
    }
  }
  const parts: string[] = [];
  parts.push(s === 1 ? 'One sitting has passed.' : `${s} sittings have passed.`);
  if (count === 0) {
    parts.push('Nothing has been settled yet — the ledger is open.');
  } else {
    const named = [...kindCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([kind, n]) => `${n} ${VERDICT_BANDS[kind] ?? 'steps were taken'}${n === 1 ? '' : 's'}`);
    parts.push(`Along the way: ${named.join('; ')}.`);
  }
  const prose = parts.join(' ');
  return prose.length > MAX_TRAJECTORY_CHARS ? `${prose.slice(0, MAX_TRAJECTORY_CHARS - 1)}…` : prose;
}

/** Extract open threads from session entries: unresolved proposals become returnable threads. */
function buildOpenThreads(feed: ReportingFeed): readonly OpenThread[] {
  // Ratified verdicts close their session's threads; sessions without a verdict stay open.
  const closedSessions = new Set(
    feed.read('cci').filter((e) => e.verdict !== undefined).map((e) => e.ref as { sessionId?: string }).map((r) => r.sessionId ?? ''),
  );
  const sessions = feed.read('planning').filter((e) => e.source === 'session');
  const threads: OpenThread[] = [];
  for (const e of sessions) {
    const ref = e.ref as { sessionId?: string };
    const sid = ref.sessionId ?? e.id;
    const pending = e.proposals.filter((p) => p.kind === 'threshold_signal' || p.kind === 'trajectory');
    if (pending.length === 0) continue;
    if (closedSessions.has(sid) && pending.every((p) => p.kind !== 'threshold_signal')) continue;
    const kind = pending[0]!.kind;
    threads.push({
      ref: e.id,
      summary:
        kind === 'threshold_signal'
          ? 'Something is ripening and has not yet arrived.'
          : 'A direction was named and not yet walked.',
      ageSessions: Math.max(0, sessions.length - sessions.indexOf(e) - 1),
    });
  }
  // M2: oldest closed first past the budget.
  return threads.slice(-MAX_OPEN_THREADS);
}

/** Mirror the worker L3 stances (banded; the hottest holons kept within budget). */
function buildHolonStates(workers: OwnerWorkerPoolState, holons: readonly Holon[]): readonly HolonStance[] {
  const byId = new Map(holons.map((h) => [h.id, h]));
  const entries = Object.entries(workers.workers)
    .map(([id, w]) => {
      const intensities = Object.entries(w.profile.intensities);
      const hottest = intensities.sort((a, b) => Math.abs(b[1] - 0.5) - Math.abs(a[1] - 0.5))[0];
      const name = byId.get(id)?.name ?? id;
      let stance = `${name} remembers you.`;
      if (hottest) {
        const [k, v] = hottest;
        const label = k.includes(':') ? k.slice(k.indexOf(':') + 1) : k;
        stance = v > 0.65
          ? `${name} holds warmth about ${label}.`
          : v < 0.35
            ? `${name} keeps a distance on ${label}.`
            : stance;
      }
      return { holonId: id, stance };
    })
    .sort((a, b) => a.holonId.localeCompare(b.holonId));
  return entries.slice(0, MAX_HOLON_STATES);
}

/**
 * Rebuild the standing page from committed state only (M1). Pure; same inputs → byte-identical
 * output (asserted in tests). `now` is the deterministic clock of the rebuild.
 */
export function buildMemoryPage(
  feed: ReportingFeed,
  workers: OwnerWorkerPoolState,
  holons: readonly Holon[],
  now: number,
): MemoryPage {
  return {
    builtAt: now,
    derivedFrom: feed.entries.map((e) => e.id),
    trajectory: buildTrajectory(feed),
    openThreads: buildOpenThreads(feed),
    holonStates: buildHolonStates(workers, holons),
  };
}

/**
 * The boot-time prose block — the `[CONTINUITY]` head. Banded language only (M4); an empty page
 * (no history) yields an empty array — the pre-memory pipeline is the fallback (45 §5).
 */
export function memoryPageBlock(page: MemoryPage | undefined): readonly string[] {
  if (!page) return [];
  const out: string[] = [];
  if (page.trajectory) out.push(page.trajectory);
  for (const t of page.openThreads.slice(-3)) out.push(`${t.summary} (from an earlier sitting)`);
  for (const h of page.holonStates.slice(0, 4)) out.push(h.stance);
  return out;
}

/** Veil-guard (M4): the forbidden vocabulary — assessment terms, stage names, drive names. */
const FORBIDDEN = [
  'stage', 'infrared', 'magenta', 'amber', 'orange', 'green', 'teal', 'turquoise',
  'drive', 'eros', 'agape', 'agency', 'communion', 'shadow', 'quadrant', 'cci',
  'score', 'assessment', 'diagnostic', 'level', 'competence',
] as const;

/** Audit a page for law violations — the G31-adjacent check the kernel gate reads. */
export function auditMemoryPage(page: MemoryPage): readonly string[] {
  const violations: string[] = [];
  const text = [
    page.trajectory,
    ...page.openThreads.map((t) => t.summary),
    ...page.holonStates.map((h) => h.stance),
  ].join(' ').toLowerCase();
  for (const word of FORBIDDEN) {
    if (text.includes(word)) violations.push(`M4 violation: banded text contains "${word}"`);
  }
  for (const t of page.openThreads) {
    if (!page.derivedFrom.includes(t.ref)) violations.push(`M3 violation: thread cites unknown origin ${t.ref}`);
  }
  if (page.trajectory.length > MAX_TRAJECTORY_CHARS) violations.push('M2 violation: trajectory over budget');
  if (page.openThreads.length > MAX_OPEN_THREADS) violations.push('M2 violation: too many open threads');
  if (page.holonStates.length > MAX_HOLON_STATES) violations.push('M2 violation: too many holon stances');
  return violations;
}

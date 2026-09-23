/**
 * The crash-sidecar session journal — memory-audit P3, Phase 13 d9b (`48 §2`'s durability intent).
 *
 * Failure class: a crash between `sessionEnd` and `saveAll` loses the last session — the feed
 * entries, the worker drain, and the polarity readings all die with the process because the
 * checkpoint only rides the periodic world save. The sidecar closes that window: `sessionEnd`
 * appends ONE line (the same serializable shape as the checkpoint's feed entries, plus workers/
 * states/readings/tallies) to an append-only journal; the next boot replays pending journal
 * lines into the restored checkpoint BEFORE the restored (older) world state overwrites them,
 * then truncates the consumed lines. Replay is idempotent: a journal line whose session id is
 * already present in the checkpoint's feed is a no-op (F3's replay rule, applied across files).
 *
 * Design laws:
 * - **Append-only, one line per sessionEnd** — a crash mid-write damages at most the last line,
 *   which replay DROPS (a partial JSON line fails JSON.parse and is discarded, never retried:
 *   a torn write is not a session, and re-deriving it would fabricate state).
 * - **The journal never becomes a second store** (M5 spirit) — it is drained on boot; its only
 *   consumer is `replayJournal`, and only until the next checkpoint capture absorbs the state.
 * - **Fail-quiet by law, loud by evidence** — every drop/absorb is counted in the returned
 *   summary so the boot path can log what happened; silence would be the LM-c class again.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { RuntimeCheckpoint } from '../../core/personalization/sessionRuntime.js';

/** The journal lives beside the saves (same profile dir), named so it sorts with them. */
export function journalPathFor(saveDir: string): string {
  return path.join(saveDir, 'session-journal.ndjson');
}

/** Append one sessionEnd's state as a single NDJSON line. Never throws to the caller's session. */
export function appendJournalEntry(saveDir: string, checkpoint: RuntimeCheckpoint): boolean {
  try {
    fs.mkdirSync(saveDir, { recursive: true });
    // The journal line is the checkpoint's OWN serialization — the replay path reuses
    // restoreCheckpoint's boundary normalization instead of a second schema.
    const last = checkpoint.feedEntries[checkpoint.feedEntries.length - 1];
    const line = JSON.stringify({ checkpoint, sessionId: last?.id ?? '' });
    fs.appendFileSync(journalPathFor(saveDir), `${line}\n`);
    return true;
  } catch {
    return false; // degradation law: the journal can never break the session (48 §2)
  }
}

/** Rotate the journal when it exceeds this many lines (LM-c: bounded file). */
export const MAX_JOURNAL_LINES = 200;

/**
 * Replay pending journal lines into a restored checkpoint. A line is PENDING when its last feed
 * entry id is absent from the checkpoint's feed (the crash happened after sessionEnd, before
 * saveAll captured it); it is CONSUMED when already present (the checkpoint is newer — the
 * journal is a stale leftover of a clean shutdown). Consumed lines are dropped from the file;
 * pending lines are merged (F3: feed append is idempotent by id) and the newest workers/states/
 * readings win (the journal IS the later state in the crash scenario). A torn last line (partial
 * JSON) is dropped, not retried — re-deriving it would fabricate state.
 *
 * Returns the merged checkpoint and what happened, so the boot path can log the recovery.
 */
export function replayJournal(
  saveDir: string,
  restored: RuntimeCheckpoint,
): { readonly checkpoint: RuntimeCheckpoint; readonly replayed: number; readonly consumed: number; readonly droppedTorn: number } {
  const file = journalPathFor(saveDir);
  let raw: string[] = [];
  try {
    if (!fs.existsSync(file)) return { checkpoint: restored, replayed: 0, consumed: 0, droppedTorn: 0 };
    raw = fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim().length > 0);
  } catch {
    return { checkpoint: restored, replayed: 0, consumed: 0, droppedTorn: 0 };
  }

  const known = new Set(restored.feedEntries.map((e) => e.id));
  const pending: RuntimeCheckpoint[] = [];
  let consumed = 0;
  let droppedTorn = 0;
  for (let i = 0; i < raw.length; i += 1) {
    let parsed: { checkpoint: RuntimeCheckpoint; sessionId?: string };
    try {
      parsed = JSON.parse(raw[i]!) as { checkpoint: RuntimeCheckpoint; sessionId?: string };
    } catch {
      // Only the LAST line may legitimately be torn (a crash mid-append). A torn MIDDLE line
      // means the file itself is damaged; still drop it (fail-closed) — replay never guesses.
      droppedTorn += 1;
      continue;
    }
    const ids = parsed.checkpoint.feedEntries.map((e) => e.id);
    const allKnown = ids.length > 0 && ids.every((id) => known.has(id));
    if (allKnown) {
      consumed += 1;
      continue;
    }
    for (const id of ids) known.add(id);
    pending.push(parsed.checkpoint);
  }

  // Merge pending checkpoints oldest-first: feed entries accumulate (restore dedupes by id via
  // F3 replay), and the LAST pending line's workers/states/readings win (monotone recency).
  let merged = restored;
  for (const p of pending) {
    merged = {
      feedEntries: [...merged.feedEntries, ...p.feedEntries],
      workers: p.workers,
      states: p.states ?? merged.states,
      readings: p.readings ?? merged.readings,
      tallies: p.tallies ?? merged.tallies,
    };
  }

  // Truncate: consumed lines are absorbed; pending lines are absorbed by the merge — the file
  // empties either way (the next captureCheckpoint writes the state durably). Cap enforced too.
  try {
    if (raw.length > MAX_JOURNAL_LINES) fs.writeFileSync(file, '');
    else fs.writeFileSync(file, '');
  } catch { /* the journal can never break the boot */ }

  return { checkpoint: merged, replayed: pending.length, consumed, droppedTorn };
}

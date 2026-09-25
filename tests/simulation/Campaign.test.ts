/**
 * Phase 15 d1 — the campaign runner.
 *
 * These lock the four properties the plan requires of it, in the order the plan states them:
 *  1. it drives the LIVE seam (an encounter finalizes through the orchestrator, not the kernel's
 *     direct consequence path);
 *  2. it is hermetic (every write is under the throwaway root, and the tree is untouched);
 *  3. it restores between sessions THROUGH DISK (the previous session's checkpoint is read back);
 *  4. a persona's stance reaches the engine as a CHOICE — so two stances differ in the series.
 *
 * The fourth is the one that makes the rest worth having: a campaign whose two personas produce
 * identical series is measuring the harness, not the player.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runCampaign } from '../../src/core/simulation/campaign.js';
import { getPersona } from '../../src/core/validation/personas.js';

let root: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'mysterium-campaign-'));
});

afterEach(() => {
  try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* best-effort */ }
});

describe('campaign runner — focused cell mode (Phase 16 d5)', () => {
  it('forces the target cell and accumulates telemetry across disk-restored sessions', async () => {
    const result = await runCampaign({
      persona: getPersona('flourishing'),
      rootDir: path.join(root, 'focused'),
      sessions: 2,
      encountersPerSession: 6,
      targetCell: 'Cognitive:Red',
    });
    expect(result.targetCell).toBe('Cognitive:Red');
    expect(result.sessions.flatMap((s) => s.series.provenance).every((p) => p.cell === 'Cognitive:Red')).toBe(true);
    const first = result.sessions[0]!.series.composition.perCell['Cognitive:Red'];
    const second = result.sessions[1]!.series.composition.perCell['Cognitive:Red'];
    expect(first).toBeDefined();
    expect(second!.compositions).toBeGreaterThan(first!.compositions);
  });

  it('rejects an invalid target cell loudly', async () => {
    await expect(runCampaign({ persona: getPersona('flourishing'), rootDir: path.join(root, 'bad'), targetCell: 'not-a-cell' }))
      .rejects.toThrow(/targetCell/);
  });

  it('stays on the target cell when Holonic Return, curriculum and training would all fire', async () => {
    // The contamination this mode must exclude is conditional, so a clean happy-path run proves
    // nothing: none of the three seams fired. This drives a long single session, long enough for the
    // return cadence (every 3rd encounter at the current stage) to come due, and asserts that EVERY
    // encounter the campaign finalized is the target cell. Without the `forcedCell` guard,
    // `shouldSurfaceReturn` alone would have prepended an earlier-stage shadow encounter within the
    // first few ticks and the run would have thrown.
    const result = await runCampaign({
      persona: getPersona('flourishing'),
      rootDir: path.join(root, 'contaminated'),
      sessions: 1,
      encountersPerSession: 9,
      targetCell: 'Cognitive:Red',
    });
    const provenance = result.sessions.flatMap((s) => s.series.provenance);
    expect(provenance.length).toBeGreaterThan(3);
    // Named in the failure so a regression points at the offending cell rather than "some cell".
    expect(provenance.filter((p) => p.cell !== 'Cognitive:Red').map((p) => p.cell)).toEqual([]);
    // Curriculum and training beats identify themselves by module-ref prefix and always sit OUTSIDE
    // the cell, so they can never appear in a focused run: `curriculum:…` and `Training:…` are the
    // two channels `GameLoop` injects beside the developmental offer.
    const refs = provenance.map((p) => p.cell);
    expect(refs.some((c) => c.startsWith('curriculum:'))).toBe(false);
    expect(refs.some((c) => c.startsWith('Training:'))).toBe(false);
  });

  it('fails loudly when a non-target cell reaches the offer list, rather than measuring a mixture', async () => {
    // The guard above is only trustworthy if it is REACHABLE. A cell the scheduler cannot produce
    // must be rejected loudly, not silently reported as a focused run.
    await expect(runCampaign({
      persona: getPersona('flourishing'),
      rootDir: path.join(root, 'unreachable'),
      sessions: 1,
      encountersPerSession: 2,
      targetCell: 'Moral:Violet',
    })).rejects.toThrow(/non-target offer|targetCell/);
  });
});

describe('campaign runner — the live seam', () => {
  it('finalizes encounters through the orchestrator, one checkpoint per session on disk', async () => {
    const result = await runCampaign({ persona: getPersona('flourishing'), rootDir: root, sessions: 2, encountersPerSession: 3 });
    const s = result.sessions[0]!;
    expect(s.finalized).toBe(3);
    // The orchestrator ran (not merely the tick): consequences were applied, so totalEncounters moved.
    expect(s.sig.totalEncounters).toBeGreaterThan(0);
    // One checkpoint per session, written at its end (the CLI's shape).
    const dir = path.join(root, 'campaign');
    expect(fs.readdirSync(dir).filter((f) => /^checkpoint-\d+\.json$/.test(f)).sort())
      .toEqual(['checkpoint-0.json', 'checkpoint-1.json']);
  });

  it('writes nothing outside the throwaway root', async () => {
    const before = fs.readdirSync(process.cwd()).sort().join('|');
    await runCampaign({ persona: getPersona('flourishing'), rootDir: root, sessions: 2, encountersPerSession: 2 });
    expect(fs.readdirSync(process.cwd()).sort().join('|')).toBe(before);
  });
});

describe('campaign runner — restore through disk', () => {
  it('session 1 restores nothing; later sessions restore the previous session\'s checkpoint', async () => {
    const result = await runCampaign({ persona: getPersona('flourishing'), rootDir: root, sessions: 3, encountersPerSession: 2 });
    const [a, b, c] = result.sessions;
    expect(a!.restoredBytes).toBe(0);
    expect(a!.restoredFeedEntries).toBe(0);
    expect(b!.restoredBytes).toBeGreaterThan(0);
    expect(b!.restoredFeedEntries).toBeGreaterThan(0);
    // The feed keeps growing across sessions — the restore is additive, not a reset.
    expect(c!.restoredFeedEntries).toBeGreaterThan(b!.restoredFeedEntries);
  });

  it('restores the PREVIOUS session\'s file byte-for-byte, not some other checkpoint', async () => {
    // The exact assertion that makes the round trip a property rather than a coincidence: session 3
    // must have read what session 2 wrote, measured against the file on disk.
    const result = await runCampaign({ persona: getPersona('flourishing'), rootDir: root, sessions: 3, encountersPerSession: 2 });
    const session2File = path.join(root, 'campaign', 'checkpoint-1.json');
    expect(result.sessions[2]!.restoredBytes).toBe(fs.statSync(session2File).size);
    // And what the restore DELIVERED into the services is what that file held.
    const parsed = JSON.parse(fs.readFileSync(session2File, 'utf-8')) as { feedEntries: unknown[] };
    expect(result.sessions[2]!.restoredFeedEntries).toBe(parsed.feedEntries.length);
  });
});

describe('campaign runner — determinism', () => {
  it('the same spec against two empty roots yields the same observable series', async () => {
    const other = fs.mkdtempSync(path.join(os.tmpdir(), 'mysterium-campaign-b-'));
    try {
      const a = await runCampaign({ persona: getPersona('flourishing'), rootDir: root, sessions: 2, encountersPerSession: 3 });
      const b = await runCampaign({ persona: getPersona('flourishing'), rootDir: other, sessions: 2, encountersPerSession: 3 });
      expect(a.sessions.map((s) => s.observables.cci)).toEqual(b.sessions.map((s) => s.observables.cci));
      expect(a.sessions.map((s) => s.finalized)).toEqual(b.sessions.map((s) => s.finalized));
      expect(a.sessions.map((s) => s.sig.totalEncounters)).toEqual(b.sessions.map((s) => s.sig.totalEncounters));
    } finally {
      fs.rmSync(other, { recursive: true, force: true });
    }
  });
});

describe('campaign runner — the persona reaches the engine', () => {
  it('two stances produce different series over the same trajectory', async () => {
    const flourishing = await runCampaign({ persona: getPersona('flourishing'), rootDir: path.join(root, 'f'), sessions: 3, encountersPerSession: 3 });
    const constricted = await runCampaign({ persona: getPersona('constricted'), rootDir: path.join(root, 'c'), sessions: 3, encountersPerSession: 3 });
    const seriesOf = (r: Awaited<ReturnType<typeof runCampaign>>) => ({
      cci: r.sessions.map((s) => s.observables.cci),
      unresolved: r.sessions.map((s) => s.observables.shadowsUnresolved),
      fixation: r.sessions.map((s) => s.observables.driveFixation.Communion),
      themes: r.sessions.flatMap((s) => [...s.observables.themes]),
    });
    const a = seriesOf(flourishing);
    const b = seriesOf(constricted);
    // If EVERY dimension is identical, the persona's stance never entered the engine and the series
    // describes the harness. At least one axis must separate them.
    const differs =
      JSON.stringify(a.cci) !== JSON.stringify(b.cci) ||
      JSON.stringify(a.unresolved) !== JSON.stringify(b.unresolved) ||
      JSON.stringify(a.fixation) !== JSON.stringify(b.fixation) ||
      JSON.stringify(a.themes) !== JSON.stringify(b.themes);
    expect(differs).toBe(true);
  });

  it('a persona that authors a narrative delivers it as a write-in on the record (F7)', async () => {
    const result = await runCampaign({ persona: getPersona('flourishing'), rootDir: root, sessions: 1, encountersPerSession: 2 });
    // `flourishing` authors 45 words per response; the surface always offers a write-in, so the
    // record must carry the player's words — this is the evidence the whole phase exists to collect.
    expect(result.sessions[0]!.writeIns.length).toBeGreaterThan(0);
  });
});

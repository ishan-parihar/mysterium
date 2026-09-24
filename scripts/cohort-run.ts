/**
 * Cohort runner — plan Phase 15 d1.
 *
 * Runs the campaign runner (`src/core/simulation/campaign.ts`) over one or more kernel personas and
 * prints one NDJSON row per session per persona. The rows are the campaign time-series: what the
 * live seam actually produced over trajectory time, which is the evidence the calibration list in
 * `AGENTS.md §4.2` item 3 has been waiting for.
 *
 * Two things this script deliberately is NOT:
 *
 *  - **Not a certifier.** It reports the observed series. It writes no threshold, flips no
 *    `rvPassed`, and mutates nothing in the tree — the same discipline `probe-pilot.ts` follows.
 *  - **Not a place for provider numbers.** The default is the HERMETIC tier (`--no-llm` on, the
 *    deterministic fallback path). A real-provider run is the experiential tier, its numbers are not
 *    reproducible, and no gate may read them.
 *
 * Every write goes under `--root` (default: a fresh temp directory). The campaign's checkpoint round
 * trip needs a real filesystem, so the root is created and — unless `--keep-root` — removed on exit.
 *
 * Run with: npx tsx scripts/cohort-run.ts --personas flourishing,constricted
 *
 * @script-status: wired — invoked by `npm run cohort` (package.json). It drives the campaign runner
 *                       over real sessions and prints the series; it never mutates the tree.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runCampaign, type CampaignResult } from '../src/core/simulation/campaign.js';
import { PERSONAS, getPersona } from '../src/core/validation/personas.js';

interface Args {
  personas: string[];
  sessions?: number;
  encounters?: number;
  root?: string;
  keepRoot: boolean;
  json: boolean;
  noLlm: boolean;
}

function parseArgs(argv: readonly string[]): Args {
  const args: Args = { personas: [], keepRoot: false, json: false, noLlm: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = (): string => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${a} needs a value`);
      return v;
    };
    switch (a) {
      case '--personas': args.personas = next().split(',').map((s) => s.trim()).filter(Boolean); break;
      case '--sessions': args.sessions = Number(next()); break;
      case '--encounters': args.encounters = Number(next()); break;
      case '--root': args.root = next(); break;
      case '--keep-root': args.keepRoot = true; break;
      case '--json': args.json = true; break;
      case '--llm': args.noLlm = false; break;
      case '--help':
        console.log('usage: cohort-run [--personas a,b] [--sessions N] [--encounters N] ' +
          '[--root DIR] [--keep-root] [--json] [--llm]');
        process.exit(0);
        break;
      default:
        if (a!.startsWith('--')) throw new Error(`unknown flag ${a}`);
    }
  }
  if (args.personas.length === 0) args.personas = PERSONAS.map((p) => p.name);
  return args;
}

/**
 * One NDJSON row per session. The fields are the observables the architecture actually claims, plus
 * the two restore measurements that make the checkpoint round trip visible in the series rather than
 * only in a gate: `restoredBytes` (what the previous session left on disk) and `restoredFeedEntries`
 * (what the restore delivered into the services at session start).
 */
function sessionRow(persona: string, r: CampaignResult['sessions'][number]): Record<string, unknown> {
  return {
    persona,
    session: r.session,
    endedAt: r.endedAt,
    offered: r.offered,
    finalized: r.finalized,
    writeIns: r.writeIns.length,
    restoredBytes: r.restoredBytes,
    restoredFeedEntries: r.restoredFeedEntries,
    checkpointsWritten: r.checkpointsWritten,
    cci: r.observables.cci,
    stage: r.sig.currentStage,
    // The drive vector — the T2 defect of Phase 14 d2a is the cautionary tale: four pinned numbers
    // read as a flat curve, not as a bug, so they belong in the series where a flat line is visible.
    driveWeights: r.observables.driveWeights,
    driveFixation: r.observables.driveFixation,
    shadowsSurfaced: r.sig.shadows.entries.length,
    totalEncounters: r.sig.totalEncounters,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const root = args.root ?? fs.mkdtempSync(path.join(os.tmpdir(), 'mysterium-cohort-'));
  const ownsRoot = args.root === undefined;
  fs.mkdirSync(root, { recursive: true });

  const results: CampaignResult[] = [];
  try {
    for (const name of args.personas) {
      const persona = getPersona(name);
      const result = await runCampaign({
        persona,
        rootDir: path.join(root, name),
        ...(args.sessions !== undefined ? { sessions: args.sessions } : {}),
        ...(args.encounters !== undefined ? { encountersPerSession: args.encounters } : {}),
        noLlm: args.noLlm,
      });
      results.push(result);

      for (const r of result.sessions) {
        console.log(JSON.stringify(sessionRow(name, r)));
      }
    }
  } catch (e) {
    console.error(`cohort-run: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }

  if (args.json) {
    console.log(JSON.stringify({
      tier: args.noLlm ? 'hermetic' : 'experiential',
      root,
      personas: results.map((r) => ({
        persona: r.persona,
        sessions: r.sessions.length,
        wallTimeMs: r.wallTimeMs,
        endedStage: r.sessions[r.sessions.length - 1]?.sig.currentStage ?? null,
        totalEncounters: r.sessions[r.sessions.length - 1]?.sig.totalEncounters ?? 0,
      })),
    }, null, 2));
  }

  if (ownsRoot && !args.keepRoot) {
    fs.rmSync(root, { recursive: true, force: true });
  }

  // Empty output is the failure mode worth failing on: a campaign that ran zero sessions produced no
  // evidence, and reporting success on it is how a broken seam looks like a passing gate.
  if (results.every((r) => r.sessions.every((s) => s.finalized === 0))) {
    console.error('cohort-run: no session finalized an encounter — the seam did not run');
    process.exit(1);
  }
}

void main();

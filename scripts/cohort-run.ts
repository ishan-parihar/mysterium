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
import { generateCohort, COHORT_AXES, type CohortPersona } from '../src/core/simulation/cohort.js';
import { PERSONAS, getPersona, type PersonaSpec } from '../src/core/validation/personas.js';

interface Args {
  personas: string[];
  sessions?: number;
  encounters?: number;
  root?: string;
  keepRoot: boolean;
  json: boolean;
  noLlm: boolean;
  /** Generated cohort size (d2). 0 = the curated personas only. */
  generate: number;
  seed: number;
  /** A single-axis hold: `--axis stance:avoiding` generates a cohort with that dimension pinned. */
  axis?: string;
}

function parseArgs(argv: readonly string[]): Args {
  const args: Args = { personas: [], keepRoot: false, json: false, noLlm: true, generate: 0, seed: 1 };
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
      case '--generate': args.generate = Number(next()); break;
      case '--seed': args.seed = Number(next()); break;
      case '--axis': args.axis = next(); break;
      case '--keep-root': args.keepRoot = true; break;
      case '--json': args.json = true; break;
      case '--llm': args.noLlm = false; break;
      case '--help':
        console.log('usage: cohort-run [--personas a,b] [--generate N] [--seed S] [--axis dim:value] ' +
          '[--sessions N] [--encounters N] [--root DIR] [--keep-root] [--json] [--llm]');
        console.log(`  curated personas: ${PERSONAS.map((p) => p.name).join(', ')}`);
        console.log(`  sweep axes:       ${COHORT_AXES.join(', ')}`);
        console.log('  --axis holds one generated dimension across the cohort (this is the boundary-search');
        console.log('  affordance: everything else still varies with --seed).');
        process.exit(0);
        break;
      default:
        if (a!.startsWith('--')) throw new Error(`unknown flag ${a}`);
    }
  }
  if (args.personas.length === 0 && args.generate === 0) args.personas = PERSONAS.map((p) => p.name);
  return args;
}

/** Parse `--axis dim:value` into a single-dimension hold, rejecting an axis the report cannot group by. */
function parseAxis(axis: string | undefined): Partial<import('../src/core/simulation/cohort.js').CohortDimensions> {
  if (!axis) return {};
  const [dim, ...rest] = axis.split(':');
  const value = rest.join(':');
  if (!(COHORT_AXES as readonly string[]).includes(dim ?? '')) {
    throw new Error(`unknown axis '${dim}' — one of ${COHORT_AXES.join(', ')}`);
  }
  switch (dim) {
    case 'stance': return { stance: value as 'engaged' | 'avoiding' | 'bypassing' };
    case 'cadence': return { cadence: Number(value) };
    case 'shadowQuadrant': return { shadowQuadrant: value === 'none' ? null : (value as never) };
    case 'neglectLines': return { neglectLines: value === 'none' ? [] : (value.split(',') as never) };
    default:
      // `currentStage`, `driveTilt` are derived per member (they are compositions of `altitudes`), so
      // they are groupable in a report but not directly settable here — pinning them would pin the
      // derivation, not the dimension. Rejected loudly rather than silently ignored.
      throw new Error(`axis '${dim}' is reportable but not directly settable`);
  }
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

/**
 * Attach the cohort axes to a row when the subject is generated.
 *
 * A report groups by axis, so the axis values must ride the row rather than be looked up from a
 * cohort object the report does not hold — the same reason the row carries `persona` rather than an
 * index into the generator's output.
 */
function subjectAxisRow(
  row: Record<string, unknown>,
  persona: PersonaSpec,
  axisValue: string | undefined,
): Record<string, unknown> {
  if (!('generated' in persona && persona.generated)) return row;
  const dims = (persona as CohortPersona).dimensions;
  return {
    ...row,
    generated: true,
    stage: axisValue,
    driveTilt: dims.driveTilt ? `${dims.driveTilt.drive}:${dims.driveTilt.direction}` : 'balanced',
    shadowQuadrant: dims.shadowQuadrant ?? 'none',
    stance: dims.stance,
    cadence: dims.cadence,
    neglectLines: [...dims.neglectLines].sort().join(',') || 'none',
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const root = args.root ?? fs.mkdtempSync(path.join(os.tmpdir(), 'mysterium-cohort-'));
  const ownsRoot = args.root === undefined;
  fs.mkdirSync(root, { recursive: true });

  const results: CampaignResult[] = [];
  try {
    const overrides = parseAxis(args.axis);
    const generated: readonly CohortPersona[] = args.generate > 0
      ? generateCohort({ count: args.generate, seed: args.seed, overrides })
      : [];
    const subjects: readonly { persona: PersonaSpec; label: string; axisValue?: string }[] = [
      ...args.personas.map((name) => ({ persona: getPersona(name), label: name })),
      ...generated.map((p) => ({ persona: p, label: p.name, axisValue: p.currentStage })),
    ];

    for (const { persona, label, axisValue: av } of subjects) {
      const result = await runCampaign({
        persona,
        rootDir: path.join(root, label),
        ...(args.sessions !== undefined ? { sessions: args.sessions } : {}),
        ...(args.encounters !== undefined ? { encountersPerSession: args.encounters } : {}),
        noLlm: args.noLlm,
      });
      results.push(result);

      for (const r of result.sessions) {
        const row = sessionRow(label, r);
        console.log(JSON.stringify(subjectAxisRow(row, persona, av)));
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

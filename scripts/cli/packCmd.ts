import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { ALL_LINES, type Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';
import type { ClaimLedger } from '../../src/core/credential/ClaimLedger.js';
import { JSON_MODE } from './flags.js';

/**
 * Single provenance source for every record this command produces. The S1 mandate's responder is
 * a hash policy (`item.difficulty <= responderPolicy`), not a human's answers, so its records must
 * never read as measured play. The claim's method string, the draft's QA string, and the
 * reliability-row marker all derive from this one declaration — they cannot drift apart. A real
 * player-answer path extends this union, and everything downstream follows it.
 */
type ResponderProvenance = 'deterministic-simulated' | 'live-answers';
const RESPONDER_PROVENANCE: ResponderProvenance = 'deterministic-simulated';

// @script-status: wired — imported by cli-game.ts, which `npm run cli` runs.
/**
 * The `pack` subcommand — one real measurement-pack session per invocation (doc 40 §1).
 *
 * Phase 17 d1 (EDUCATION-SURFACE-AUDIT-2026-09-26 §6): packs had no live path — the engine
 * registry was test-only and the S1 runner's only callers were gates, tests, and the delegate
 * drill. This command IS the live seam: it runs the same delegation machinery real play would
 * (S1 pack mandate → pack_score proposal → ratification → skillTheta, the sanctioned write
 * path), records the session into the ReliabilityCollector's local store, and drafts a
 * pack-evidence claim citing the real session id. Draft ≠ issue: naming the subject stays the
 * player's consented act (`mysterium credential issue <id> <subject>`).
 *
 * Kept as its own leaf (not folded into practiceCmd) because its shape is delegation + evidence
 * persistence, not a state machine like vow/pod — it shares only the state-file convention.
 * Heavy modules are awaited like every other CLI leaf (delegateCmd/practiceCmd) so a `mysterium
 * --help` does not pay for the orchestration stack.
 */
export async function runPackCommand(argv: string[]): Promise<void> {
  const seedFlag = argv.indexOf('--seed');
  const seedArg = seedFlag >= 0 ? argv[seedFlag + 1] : undefined;
  // Default derives from the clock: reliability data needs repeated sessions at real retest
  // intervals, so two invocations must not replay the same session id.
  const seed = seedArg && !seedArg.startsWith('--') ? seedArg : `pack-${Date.now().toString(36)}`;
  const asJson = JSON_MODE;

  const { delegateSession, ratifyProposalsTool } = await import('../../src/core/orchestration/orchestratorTools.js');
  const { createSignificator } = await import('../../src/core/domain/Significator.js');
  const { createInitialWorldState } = await import('../../src/core/engines/CandidateGeneration.js');
  const { seedCurriculumRegistry } = await import('../../src/core/curriculum/CurriculumSeed.js');
  const { seedPackRegistry } = await import('../../src/core/packs/referencePacks.js');
  const { getPack } = await import('../../src/core/packs/PackEngine.js');
  const { ReliabilityCollector } = await import('../../src/core/packs/ReliabilityCollector.js');
  const { ROLE_TOOLSETS } = await import('../../src/core/orchestration/types.js');
  const cred = await import('../../src/core/credential/ClaimLedger.js');
  const { vowFilePath } = await import('./support.js');

  seedCurriculumRegistry();
  seedPackRegistry();

  const altitudes = Object.fromEntries(ALL_LINES.map((l) => [l, 'Amber'])) as Record<Line, Stage>;
  const sig = createSignificator(`cli-${seed}`, altitudes, 'Amber');
  // The pack mandate never touches encounters (it administers instrument items), so an empty
  // world is the honest fixture — same as the delegate drill's fallback.
  const world = createInitialWorldState([]);
  const session = { targetSessionLength: 4, encountersSoFar: 0, recentLines: [], sessionDurationMs: 0 };
  const spec = {
    role: 'S1' as const,
    purpose: 'CLI pack session: administer one measurement pack (40 §1)',
    readProjection: new Set(['ops.registryHealth'] as const),
    toolset: new Set(ROLE_TOOLSETS['S1']),
    budget: { toolCallsMax: 6, virtualMsMax: 600_000 },
  };
  // Real wall-clock now: retest intervals are meaningful only against real time.
  const now = Date.now();

  const out = await delegateSession({ spec, sig, world, session, seed, now });
  if (!out.ok) {
    if (asJson) process.stdout.write(JSON.stringify({ ok: false, violation: out.violation }) + '\n');
    else console.error(`DELEGATION REJECTED: ${out.violation?.code} — ${out.violation?.detail}`);
    process.exitCode = 1;
    return;
  }
  const proposals = out.result?.proposals ?? [];
  const packProp = proposals.find((p) => p.kind === 'pack_score');
  if (!packProp) {
    const msg = 'the S1 mandate produced no pack_score proposal (budget exhausted before administration?)';
    if (asJson) process.stdout.write(JSON.stringify({ ok: false, error: msg }) + '\n');
    else console.error(msg);
    process.exitCode = 1;
    return;
  }
  const payload = packProp.payload as {
    readonly packId: string;
    readonly record: { readonly sessionId: string; readonly formId: string; readonly theta: number; readonly se: number; readonly trials: number; readonly correctCount: number; readonly itemIds: readonly string[]; readonly completedAtMs: number };
  };
  // d1's core repair, exercised for real: the production getPack read is a HIT post-seed.
  const pack = getPack(payload.packId);
  if (!pack) {
    const msg = `pack '${payload.packId}' not in the engine registry — the boot seed is missing`;
    if (asJson) process.stdout.write(JSON.stringify({ ok: false, error: msg }) + '\n');
    else console.error(msg);
    process.exitCode = 1;
    return;
  }

  const rat = ratifyProposalsTool({ proposals, sig: out.sig, world: out.world, now: now + 1 });
  const ratRow = rat.dispositions.find((d) => d.kind === 'pack_score');

  // Reliability: rehydrate prior rows through the public API (persistence is the caller's
  // concern — a JSON file here, KV in the app), then record this session and read the report.
  const stateDir = path.dirname(vowFilePath());
  const relFile = path.join(stateDir, 'reliability.json');
  const priorRows: { packId: string; sessionId: string; formId: string; theta: number; se: number; trials: number; correctCount: number; itemIds: string[]; completedAtMs: number }[] = (() => {
    if (!fs.existsSync(relFile)) return [];
    try { return JSON.parse(fs.readFileSync(relFile, 'utf8')); } catch { return []; }
  })();
  const collector = new ReliabilityCollector();
  for (const row of priorRows) {
    const p = getPack(row.packId);
    if (p) collector.recordSession(p, row);
  }
  const intervalOk = collector.recordSession(pack, payload.record);
  const report = collector.computeReport(pack, now);

  // Claim: draft (never issue) a pack-evidence claim citing the real session id — the G21
  // pattern, with the reliability disclosure travelling WITH the evidence (E2).
  const credFile = path.join(stateDir, 'credentials.json');
  const loadLedger = (): ClaimLedger => {
    if (fs.existsSync(credFile)) {
      try { return JSON.parse(fs.readFileSync(credFile, 'utf8')); } catch { /* fall through */ }
    }
    return cred.emptyLedger();
  };
  const evidence = cred.packEvidenceRef(pack.id, payload.record.sessionId, {
    provisional: report.gate === 'provisional',
    measuredAtMs: now,
    ...(pack.provisionalUntil ? { provisionalUntil: pack.provisionalUntil } : {}),
    ...(report.retestR !== undefined ? { retestR: report.retestR } : {}),
  });
  // Honesty (reviewer catch, 2026-09-27): the S1 mandate scores each trial as
  // `item.difficulty <= responderPolicy` — a hash-derived policy, not a human's answers. These
  // drafts are issuable, so the disclosure must travel with the claim itself: an issued VC from
  // this drill reads as evidence of the MACHINERY working, never as a measured person.
  const { claim, failures } = cred.draftClaim({
    competencyDescriptor: `Exercised ${pack.construct} under the ${pack.id} instrument (deterministic drill responder, theta ${payload.record.theta.toFixed(2)}, se ${payload.record.se.toFixed(2)})`,
    domain: pack.id,
    evidence: [evidence],
    method: `measurement-pack administration (40 §1), S1 delegated session, ratified pack_score — responder provenance: ${RESPONDER_PROVENANCE} (hash policy, not a human test-taker); drill evidence of the machinery, not a measured person`,
    qualityAssurance: `mysterium internal assessment machinery; reliability disclosure travels with the evidence; responder: ${RESPONDER_PROVENANCE}`,
    nowMs: now,
  });
  if (failures.length > 0) {
    const msg = failures.map((f) => f.message).join('; ');
    if (asJson) process.stdout.write(JSON.stringify({ ok: false, error: `claim draft rejected: ${msg}` }) + '\n');
    else console.error(`Claim draft rejected: ${msg}`);
    process.exitCode = 1;
    return;
  }
  const priorLedger = loadLedger();
  const ledger: ClaimLedger = { ...priorLedger, claims: [...priorLedger.claims, claim] };
  fs.writeFileSync(credFile, JSON.stringify(ledger, null, 2));
  fs.writeFileSync(relFile, JSON.stringify([...priorRows, { ...payload.record, packId: pack.id, provenance: RESPONDER_PROVENANCE, synthetic: true }], null, 2));

  if (asJson) {
    process.stdout.write(JSON.stringify({
      ok: true, packId: pack.id, construct: pack.construct,
      formId: payload.record.formId, trials: payload.record.trials,
      correctCount: payload.record.correctCount, theta: payload.record.theta, se: payload.record.se,
      ratified: ratRow?.accepted === true, ratificationReason: ratRow?.reason,
      intervalOk, reliability: report, claimId: claim.id,
    }) + '\n');
  } else {
    console.log(`\n  ${chalk.bold('Pack session')} — ${chalk.cyan(pack.id)} (${pack.construct})`);
    console.log(`  form ${payload.record.formId} · ${payload.record.trials} trials · ${payload.record.correctCount}/${payload.record.trials} correct`);
    console.log(`  theta ${payload.record.theta.toFixed(2)} (se ${payload.record.se.toFixed(2)}) · ratification: ${ratRow?.accepted ? chalk.green('accepted') : chalk.red(String(ratRow?.reason ?? 'no disposition'))}`);
    console.log(chalk.yellow('  responder: deterministic simulation (hash policy) — drill evidence of the machinery, not a measured person'));
    console.log(`  reliability: ${report.sessionCount} eligible session(s) · gate ${report.gate === 'mature' ? chalk.green('mature') : chalk.yellow(report.gate)}${report.retestR !== undefined ? ` · retest r=${report.retestR.toFixed(2)}` : ''}${intervalOk ? '' : chalk.yellow(' · retest interval violated (recorded, excluded from pairing)')}`);
    console.log(`\n  ${chalk.green('Claim drafted:')} ${claim.id}`);
    console.log(chalk.dim(`  Review it, then: mysterium credential issue ${claim.id} <chosen-name>`));
    console.log('');
  }
}

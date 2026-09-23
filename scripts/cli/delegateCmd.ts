import chalk from 'chalk';
import { JSON_MODE } from './flags.js';
import { type Line } from '../../src/core/domain/Line.js';
import { ALL_LINES } from '../../src/core/domain/Line.js';
import { type Stage } from '../../src/core/domain/Stage.js';
import { ALL_STAGES } from '../../src/core/domain/Stage.js';
import { type AgentRole } from '../../src/core/orchestration/types.js';
import { ALL_AGENT_ROLES } from '../../src/core/orchestration/councilStanding.js';






// @script-status: wired — imported by cli-game.ts, which `npm run cli` runs.
/**
 * The `delegate` subcommand — the orchestration surface (foundations/43).
 *
 * Stage D, leaf 5 (module-cohesion audit item 1). Argument parsing lives in `delegateArgs.ts`
 * (unit-tested); this module is the command body that consumes it. Kept as its own leaf rather
 * than folded into `profileCmd` because it is the one command whose output another agent consumes
 * — its stability contract is the machine surface, not the prose.
 */

export async function runDelegateCommand(argv: string[]): Promise<void> {
  const { delegateSession, emptyLedgerState, ratifyProposalsTool, schedulePresence } = await import('../../src/core/orchestration/orchestratorTools.js');
  const { createSignificator } = await import('../../src/core/domain/Significator.js');
  const { createInitialWorldState } = await import('../../src/core/engines/CandidateGeneration.js');
  // NB: `ALL_LINES` / `ALL_STAGES` are NOT re-imported here. They are module-level imports in
  // this file, and the local `await import` shadows used to hide that — a second binding for a
  // canonical constant, which is the class that let a retired stage ladder survive (audit §10.4).
  const { seedCurriculumRegistry } = await import('../../src/core/curriculum/CurriculumSeed.js');
  const { parseDelegateArgs, DELEGATE_ROLE_PATTERN } = await import('./delegateArgs.js');

  // Flags are read from the raw argv tail via parseDelegateArgs — see that
  // module for the collision rules this surface must obey (--json comes from
  // the ROOT opts; the budget flag must not share a root flag's name).
  const { role, line, stage, budget, seed, summon, trigger, intent } = parseDelegateArgs(argv);
  const asJson = JSON_MODE;

  // Narrowing guards. `parseDelegateArgs` returns RAW strings on purpose — the flags come from the
  // argv tail, so a garbage value must fail closed rather than be cast into a domain type. The
  // narrowing happens ONCE, here, so every consumer below is typed and needs no casts.
  const isLineArg = (v: string): v is Line => (ALL_LINES as readonly string[]).includes(v);
  const isStageArg = (v: string): v is Stage => (ALL_STAGES as readonly string[]).includes(v);
  const isRoleArg = (v: string): v is AgentRole =>
    DELEGATE_ROLE_PATTERN.test(v) && (ALL_AGENT_ROLES as readonly string[]).includes(v);

  if (!isRoleArg(role) || !isLineArg(line) || !isStageArg(stage)) {
    if (asJson) {
      process.stdout.write(JSON.stringify({ ok: false, violation: { code: 'invalid_argument', detail: `role/line/stage: ${role}/${line}/${stage}` } }) + '\n');
    } else {
      console.error(`Invalid --role/--line/--stage: ${role}/${line}/${stage}`);
    }
    process.exitCode = 1;
    return;
  }

  seedCurriculumRegistry();
  const altitudes = Object.fromEntries(ALL_LINES.map((l) => [l, stage])) as Record<import('../../src/core/domain/Line.js').Line, import('../../src/core/domain/Stage.js').Stage>;
  const sig = createSignificator(`cli-${seed}`, altitudes, stage);

  // Encounter pool: the scheduler needs resolvable holons for the target cell.
  // Reuse the kernel harness's world factory via its exported makeWorld path;
  // if unavailable, fall back to a minimal one-cell world.
  let world: import('../../src/core/engines/EncounterScheduler.js').WorldState;
  try {
    const harness = await import('../../src/core/validation/harness.js');
    const mk = (harness as unknown as { makeWorld?: () => import('../../src/core/engines/EncounterScheduler.js').WorldState }).makeWorld;
    world = mk
      ? mk.call(harness)
      : createInitialWorldState([{
          id: `h-${line}-${stage}`, name: `${line} ${stage} contact`, kind: 'NPC',
          line, stage,
          drives: { dominant: 'Agency', secondary: 'Eros', shadowQuadrant: null },
          polarity: 'Sovereign', narrativeRole: 'delegate-smoke', relationships: [], active: true,
        } as never]);
  } catch {
    world = createInitialWorldState([]);
  }
  const session = { targetSessionLength: Math.max(1, budget), encountersSoFar: 0, recentLines: [], sessionDurationMs: 0 };

  // ── Phase 13 d12: `--summon` — the DISPATCHER decides who appears (43 §3.3) ──────────────
  // The council tools are invoked exactly as the live loop invokes them, so this is a real
  // dispatch (trigger table → roles → delegated mandates → ratification), not a mock. `--trigger
  // <name>` names the state to simulate for a drill; absent, the quiet state (the ordinary
  // encounter) is used with `--intent` selecting its Journey-Guide.
  if (summon) {
    const { councilIntegrationFrom, handleCouncilTool } = await import('../../src/core/assessments/councilTools.js');
    const { observationForTrigger, ALL_TRIGGERS, dispatchCouncil } = await import('../../src/core/orchestration/dispatcher.js');
    const { ROLE_TOOLSETS } = await import('../../src/core/orchestration/types.js');
    const { AGENT_ROLE_COUNCIL } = await import('../../src/core/orchestration/councilStanding.js');
    const { createOrchestrationServices, buildEnvelope } = await import('../../src/core/personalization/sessionRuntime.js');

    if (trigger !== undefined && !(ALL_TRIGGERS as readonly string[]).includes(trigger)) {
      const detail = `unknown --trigger '${trigger}' (known: ${ALL_TRIGGERS.join(', ')})`;
      if (asJson) process.stdout.write(JSON.stringify({ ok: false, violation: { code: 'invalid_argument', detail } }) + '\n');
      else console.error(detail);
      process.exitCode = 1;
      return;
    }

    const observation = observationForTrigger((trigger ?? 'encounter-open') as never, intent);
    // The same pure decision the tool will make — printed so the CLI shows the dispatcher's ruling
    // (presence order and foreground), not merely the list of mandates that ran.
    const decision = dispatchCouncil({ ...observation, seed });
    const services = createOrchestrationServices();
    const env = buildEnvelope(
      services, sig,
      { usable: [], declaredInterests: [] },
      { line, stage, modality: 'ScenarioChoice' as never },
      `CLI summons (${trigger ?? 'quiet state'})`, [], 1_000_000, null,
    );

    let curSig = sig;
    let curWorld = world;
    let ledger = emptyLedgerState();
    const proposals: import('../../src/core/orchestration/types.js').Proposal[] = [];

    const integration = councilIntegrationFrom({
      observation,
      seed,
      cell: { line: line as never, stage: stage as never },
      plannedRoles: ['therapist', 'J1', 'J4', 'T1', 'A2'],
      run: async (summoned) => {
        const spec: import('../../src/core/orchestration/types.js').DelegationSpec = {
          role: summoned,
          ...(['J1', 'J2', 'J3', 'J4', 'J5'].includes(summoned) ? { cell: { line: line as never, stage: stage as never } } : {}),
          purpose: `CLI summons (${trigger ?? 'quiet state'}): ${summoned} mandate`,
          readProjection: new Set(['corpus.moduleSpec'] as const),
          toolset: new Set(ROLE_TOOLSETS[summoned]),
          budget: { toolCallsMax: budget, virtualMsMax: 600_000 },
        };
        const binding = AGENT_ROLE_COUNCIL[summoned];
        const scope = binding ? env.scopes[binding] : undefined;
        const out = await delegateSession({
          spec, sig: curSig, world: curWorld, session, seed, now: 1_000_000, ledger,
          ...(scope ? { scope } : {}),
        });
        if (out.ok) {
          curSig = out.sig;
          curWorld = out.world;
          ledger = out.ledger;
          proposals.push(...(out.result?.proposals ?? []));
        }
        return out;
      },
    });

    const res = await handleCouncilTool('summon_council', '{}', { integration });
    const rat = ratifyProposalsTool({ proposals, sig: curSig, world: curWorld, now: 1_100_000 });
    const sessions = (res.payload.sessions as Record<string, unknown>[] | undefined) ?? [];

    if (asJson) {
      process.stdout.write(JSON.stringify({
        ok: res.ok, summon: true, trigger: decision.trigger, strategy: decision.strategy,
        ...(decision.bypass ? { bypass: true } : {}),
        presence: decision.roles, foreground: decision.foreground,
        summons: res.payload.summons, background: decision.background, sessions,
        ratification: rat.dispositions,
      }) + '\n');
    } else {
      console.log(`\n  ${chalk.bold('Council summons')} — trigger ${chalk.cyan(decision.trigger)} (${decision.strategy})`);
      console.log(`  presence: ${decision.roles.join(' → ')}${decision.foreground ? chalk.dim(` · foreground ${decision.foreground}`) : ''}`);
      if (decision.bypass) console.log(`  ${chalk.yellow('⚠ bypass')} — the frame stops being a game; speak plainly.`);
      for (const s of sessions) {
        const roleName = String(s.role ?? '?');
        const outcome = String(s.outcome ?? '?');
        const reason = s.reason ? chalk.dim(` — ${String(s.reason)}`) : '';
        const kinds = Array.isArray(s.proposals) && s.proposals.length > 0 ? chalk.dim(` · ${(s.proposals as string[]).join(', ')}`) : '';
        console.log(`  ${outcome === 'skipped' || outcome === 'refused' ? chalk.yellow('·') : chalk.green('✓')} ${roleName.padEnd(10)} ${outcome}${reason}${kinds}`);
      }
      console.log(`  ${chalk.dim(`background: ${decision.background.join(', ') || '—'}`)}`);
      for (const d of rat.dispositions) {
        console.log(`  ${d.accepted ? chalk.green('✓') : chalk.yellow('·')} ${d.kind}: ${chalk.dim(d.reason)}`);
      }
      if (trigger === undefined) {
        console.log(`\n  ${chalk.dim('Drill another state:')} ${chalk.bold('mysterium delegate --summon --trigger <crisis|threshold-proximity|depth-plateau|…>')}`);
      }
    }
    return;
  }

  const spec: import('../../src/core/orchestration/types.js').DelegationSpec = {
    role,
    ...( ['J1','J2','J3','J4','J5'].includes(role) ? { cell: { line, stage } } : {}),
    purpose: `CLI delegation smoke: ${role} mandate`,
    readProjection: new Set(['corpus.moduleSpec'] as const),
    // P0-FIX (delegate smoke): derive the toolset from ROLE_TOOLSETS so every
    // role's smoke spec passes validation. The old hardcoded fallback
    // (['get_module_spec','record_encounter']) rejected T-roles at the gate —
    // the happy path spec→log→ratify was never reachable for them.
    toolset: new Set(
      (await import('../../src/core/orchestration/types.js')).ROLE_TOOLSETS[role] ?? ['get_module_spec', 'record_encounter'] as const,
    ),
    budget: { toolCallsMax: budget, virtualMsMax: 600_000 },
  };

  // P1-LLM: delegateSession is async (choice policies may consult an LLM);
  // the deterministic path is unchanged in outcome, only in await shape.
  const out = await delegateSession({ spec, sig, world, session, seed, now: 1_000_000, ledger: emptyLedgerState() });
  if (!out.ok) {
    const msg = `DELEGATION REJECTED: ${out.violation?.code} — ${out.violation?.detail}`;
    if (asJson) { process.stdout.write(JSON.stringify({ ok: false, violation: out.violation }) + '\n'); }
    else console.error(msg);
    process.exitCode = 1;
    return;
  }

  const rat = ratifyProposalsTool({ proposals: out.result?.proposals ?? [], sig: out.sig, world: out.world, now: 1_100_000 });
  const presence = schedulePresence(seed, ['therapist', 'J1', 'J4', 'T1', 'A2']);

  if (asJson) {
    process.stdout.write(JSON.stringify({
      ok: true, role, outcome: out.result?.outcome, encounters: out.encountersExecuted,
      sessionId: out.log.sessionId, proposals: out.result?.proposals.length ?? 0,
      proposalKinds: out.result?.proposals.map((p) => p.kind) ?? [],
      toolCalls: out.log.toolCalls.map((t) => t.tool),
      signals: out.result?.signals,
      ratification: rat.dispositions, presence,
    }) + '\n');
  } else {
    console.log(`\n  Delegated session — role ${chalk.bold(role)}${out.log.cell ? ` (${out.log.cell.line} × ${out.log.cell.stage})` : ''}`);
    console.log(`  outcome: ${out.result?.outcome}   encounters: ${out.encountersExecuted}   proposals: ${out.result?.proposals.length ?? 0}`);
    console.log(`  session: ${out.log.sessionId}`);
    const trace = out.log.toolCalls.map((t) => t.tool).join(' → ');
    if (trace) console.log(`  tools: ${chalk.dim(trace)}`);
    for (const p of out.result?.proposals ?? []) {
      console.log(`  proposal: ${chalk.cyan(p.kind)} ${chalk.dim(p.rationale)}`);
    }
    if ((out.result?.proposals.length ?? 0) === 0 && out.result?.outcome === 'budget_exhausted') {
      console.log(`  ${chalk.yellow('⚠')} no proposals emitted — mandate starved by the tool budget; raise ${chalk.bold('--budget')} (largest allowlist needs 3).`);
    }
    for (const d of rat.dispositions) {
      console.log(`  ${d.accepted ? chalk.green('✓') : chalk.yellow('·')} ${d.kind}: ${chalk.dim(d.reason)}`);
    }
    console.log(`  presence order: ${presence.join(' → ')}`);
    console.log(`\n  ${chalk.dim('Same --seed reproduces this session exactly (gate G14).')}`);
  }
}

// ── Practice objectives (doc 39) CLI ────────────────────────────────

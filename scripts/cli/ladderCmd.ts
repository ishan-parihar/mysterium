import chalk from 'chalk';
import { JSON_MODE } from './flags.js';
import type { LadderLevel, Register } from '../../src/core/domain/articulationLadder.js';

// @script-status: wired — imported by cli-game.ts, which `npm run cli` runs.
/**
 * The `ladder` subcommand — the articulation ladder, live (16 §10.5, Phase 17 d2).
 *
 * Until d2 the ladder was in-vitro: law-holding render code with zero importers. This command is
 * its first player-facing render path — the SELF register over the active profile's real
 * Significator, derived through `buildLadderPayloads` and rendered ONLY through `renderLevel`
 * (never around it). The auditor register is reachable in principle (AL1 — same ladder, consented
 * traversal), but with no consent brokerage yet it renders exactly what AL5 demands: a refusal
 * with its reason, legible to the person asking. The consent link surface arrives with d3.
 */
export async function runLadderCommand(argv: string[]): Promise<void> {
  const levelFlag = argv.indexOf('--level');
  const levelArg = levelFlag >= 0 ? argv[levelFlag + 1] : undefined;
  const registerFlag = argv.indexOf('--register');
  const registerArg = registerFlag >= 0 ? argv[registerFlag + 1] : undefined;
  const asJson = JSON_MODE;

  const { renderLevel, LADDER } = await import('../../src/core/domain/articulationLadder.js');
  const { buildLadderPayloads, SELF_RENDER_LEVELS } = await import('../../src/core/presentation/ladderProjections.js');
  const { createDefaultSignificator } = await import('./onboarding.js');
  const { hasSave } = await import('../../src/infra/persistence/SaveRepository.js');

  // Honesty gate (NF-7 pattern): the ladder renders a developmental HISTORY. With no save there
  // is none — `createDefaultSignificator` would fabricate a fresh profile and the command would
  // narrate "your centre of gravity" to a player who has never entered the world. Refuse instead.
  if (!hasSave()) {
    const msg = 'No save found — the articulation ladder renders a developmental history, and yours has not begun. Play a session (mysterium session) and one will be created automatically.';
    if (asJson) process.stdout.write(JSON.stringify({ ok: false, error: msg }) + '\n');
    else console.error(msg);
    process.exitCode = 1;
    return;
  }

  if (levelArg !== undefined && !LADDER.some((l) => l.level === levelArg)) {
    const msg = `unknown level '${levelArg}' — valid: ${LADDER.map((l) => l.level).join(', ')}`;
    if (asJson) process.stdout.write(JSON.stringify({ ok: false, error: msg }) + '\n');
    else console.error(msg);
    process.exitCode = 1;
    return;
  }
  const register = registerArg === 'auditor' ? 'auditor' as Register : 'self' as Register;
  if (registerArg !== undefined && registerArg !== 'self' && registerArg !== 'auditor') {
    const msg = `unknown register '${registerArg}' — valid: self, auditor`;
    if (asJson) process.stdout.write(JSON.stringify({ ok: false, error: msg }) + '\n');
    else console.error(msg);
    process.exitCode = 1;
    return;
  }

  const sig = await createDefaultSignificator();
  const payloads = buildLadderPayloads(sig);
  const levels: readonly LadderLevel[] = levelArg
    ? [levelArg as LadderLevel]
    : (register === 'self' ? SELF_RENDER_LEVELS : LADDER.map((l) => l.level));

  const rendered = levels.map((level) =>
    renderLevel({ register, level, playerStage: sig.currentStage }, payloads),
  );

  if (asJson) {
    process.stdout.write(JSON.stringify({
      ok: true,
      register,
      levels: rendered.map((r) => ({
        level: r.level,
        registerClass: r.registerClass,
        allowed: r.allowed,
        reason: r.reason,
        presentation: r.presentation,
        ...(r.payload ? { narrative: r.payload.narrative, metrics: r.payload.metrics ?? {} } : {}),
      })),
    }) + '\n');
    return;
  }

  console.log(`\n  ${chalk.bold('Articulation ladder')} — ${register} register`);
  for (const r of rendered) {
    const head = `  ${chalk.cyan(r.level)} · ${r.registerClass}`;
    if (!r.allowed) {
      console.log(`${head} — ${chalk.dim(r.reason)}`);
      continue;
    }
    console.log(`${head} · ${r.presentation}`);
    console.log(`    ${r.payload?.narrative ?? ''}`);
    const metrics = r.payload?.metrics;
    if (metrics && Object.keys(metrics).length > 0) {
      console.log(chalk.dim(`    ${Object.entries(metrics).map(([k, v]) => `${k}=${v}`).join(' · ')}`));
    }
  }
  if (register === 'self') {
    console.log(chalk.dim('\n  L4/L5 are the closed register class — met only as narrative consequence (20 §11.1).'));
  }
  console.log('');
}

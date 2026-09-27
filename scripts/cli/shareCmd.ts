import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { JSON_MODE } from './flags.js';
import type { LadderLevel } from '../../src/core/domain/articulationLadder.js';

// @script-status: wired — imported by cli-game.ts, which `npm run cli` runs.
/**
 * The `share` subcommand — the persona-free share mechanism + the first read-only consumer
 * surface (16 §2.4.1, MY-AD-0034, Phase 17 d3).
 *
 * Owner ruling 2026-09-27: an API-key-permission shape — the player selects the scopes the
 * recipient may see, and THAT IS the entire security interface. No parent/guardian/teacher/
 * therapist identity typing: `create` mints a key, `revoke` nulls it instantly (AL5), and
 * `view` is the Educator Desk's first render — a read-only traversal of the shared levels,
 * through `buildLadderPayloads` + `renderLevel` ONLY (never around them: the auditor register
 * re-checks the share's scope run at every render, so a corrupted store cannot widen access).
 *
 * Persistence is the caller's concern (40 §1.1's discipline): a `shares.json` beside the save.
 */
const USAGE = 'usage: mysterium share <create --scopes L1[,L2..] | list | revoke --id <grantId> | view --id <grantId> [--level L]>';

interface StoredShare {
  readonly grantId: string;
  readonly scopes: readonly LadderLevel[];
  readonly revoked: boolean;
  readonly createdAtMs: number;
}

export async function runShareCommand(argv: string[]): Promise<void> {
  const [sub] = argv;
  const rest = argv.slice(1);
  const asJson = JSON_MODE;
  const fail = (msg: string): void => {
    if (asJson) process.stdout.write(JSON.stringify({ ok: false, error: msg }) + '\n');
    else console.error(msg);
    process.exitCode = 1;
  };
  const say = (msg: string): void => {
    if (asJson) process.stdout.write(msg + '\n');
    else console.log(msg);
  };

  if (sub !== 'create' && sub !== 'list' && sub !== 'revoke' && sub !== 'view') {
    fail(USAGE);
    return;
  }

  const { createShare, revokeShare } = await import('../../src/core/domain/shares.js');
  const { vowFilePath } = await import('./support.js');
  const sharesFile = path.join(path.dirname(vowFilePath()), 'shares.json');
  const load = (): StoredShare[] => {
    if (!fs.existsSync(sharesFile)) return [];
    try { return JSON.parse(fs.readFileSync(sharesFile, 'utf8')); } catch { return []; }
  };
  const save = (shares: readonly StoredShare[]): void => {
    fs.mkdirSync(path.dirname(sharesFile), { recursive: true });
    fs.writeFileSync(sharesFile, JSON.stringify(shares, null, 2));
  };

  const flag = (name: string): string | undefined => {
    const i = rest.indexOf(name);
    return i >= 0 ? rest[i + 1] : undefined;
  };

  if (sub === 'create') {
    const scopesArg = flag('--scopes');
    if (!scopesArg) { fail(USAGE); return; }
    const outcome = createShare(scopesArg.split(',').map((s) => s.trim()).filter(Boolean), Date.now());
    if (!outcome.share) { fail(outcome.reason ?? 'share refused'); return; }
    save([...load(), outcome.share]);
    say(asJson
      ? JSON.stringify({ ok: true, grantId: outcome.share.grantId, scopes: outcome.share.scopes })
      : `${chalk.green('Share created.')} ${outcome.share.grantId} — scopes: ${outcome.share.scopes.join(', ')}`);
    return;
  }

  if (sub === 'list') {
    const shares = load();
    say(asJson
      ? JSON.stringify({ ok: true, shares })
      : shares.length === 0
        ? 'No shares. Create one: mysterium share create --scopes L1,L2'
        : shares.map((s) => `${s.revoked ? chalk.red('revoked') : chalk.green('live')} ${s.grantId} — scopes: ${s.scopes.join(', ')}`).join('\n'));
    return;
  }

  if (sub === 'revoke') {
    const id = flag('--id');
    if (!id) { fail(USAGE); return; }
    const { revoked, next } = revokeShare(load(), id);
    if (!revoked) { fail(`no live share '${id}' — nothing revoked`); return; }
    save(next);
    say(asJson ? JSON.stringify({ ok: true, revoked: id }) : `${chalk.green('Share revoked.')} ${id} renders nothing from now on (AL5).`);
    return;
  }

  // view — the first read-only consumer surface (the Educator Desk's render, 33 §7 + 16 §2.4.1)
  const id = flag('--id');
  if (!id) { fail(USAGE); return; }
  const share = load().find((s) => s.grantId === id);
  if (!share) { fail(`unknown share '${id}' — list live ones with: mysterium share list`); return; }
  if (share.revoked) { fail(`share '${id}' is revoked — the projection is nulled at every level (AL5)`); return; }

  const levelArg = flag('--level');
  const levels: readonly LadderLevel[] = levelArg
    ? [levelArg as LadderLevel]
    : [...share.scopes].sort();
  if (levelArg && !share.scopes.includes(levelArg as LadderLevel)) {
    fail(`level '${levelArg}' is outside share '${id}'s scopes (${share.scopes.join(', ')}) — purpose-bounded, 16 §2.4.1`);
    return;
  }

  // Honesty gate (NF-7 pattern): the view renders a developmental HISTORY. With no save there is
  // none — refuse rather than narrate a fabricated profile.
  const { hasSave } = await import('../../src/infra/persistence/SaveRepository.js');
  if (!hasSave()) {
    fail('No save found — a shared view renders a developmental history, and this profile has none.');
    return;
  }

  const { renderLevel } = await import('../../src/core/domain/articulationLadder.js');
  const { buildLadderPayloads } = await import('../../src/core/presentation/ladderProjections.js');
  const { createDefaultSignificator } = await import('./onboarding.js');
  const sig = await createDefaultSignificator();
  const payloads = buildLadderPayloads(sig);
  const rendered = levels.map((level) =>
    renderLevel({ register: 'auditor', level, playerStage: sig.currentStage, consent: share }, payloads),
  );

  if (asJson) {
    process.stdout.write(JSON.stringify({
      ok: true, shareId: share.grantId, levels: rendered.map((r) => ({
        level: r.level, allowed: r.allowed, reason: r.reason,
        narrative: r.payload?.narrative, metrics: r.payload?.metrics,
      })),
    }) + '\n');
    return;
  }
  console.log(chalk.bold(`Shared view ${share.grantId} — scopes: ${share.scopes.join(', ')} (re-checked at every render, AL5)`));
  for (const r of rendered) {
    console.log(`\n${chalk.bold(r.level)} — ${r.allowed ? chalk.green('allowed') : chalk.red('refused')}`);
    console.log(`  ${r.payload?.narrative ?? r.reason}`);
    if (r.payload?.metrics) console.log(`  ${Object.entries(r.payload.metrics).map(([k, v]) => `${k}: ${v}`).join(' · ')}`);
  }
}

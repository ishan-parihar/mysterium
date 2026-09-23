/**
 * The CLI subcommand matrix — plan Phase 14 d5.
 *
 * `tests/cli/` covered one 120-line helpers module while the entry point is ~5 800 lines of
 * production code that no gate could see. It could not boot for three days and nothing noticed.
 * `G36` (kernel gate) now boots every session mode; this file covers the **surface around** the
 * session: the version/help contract, the read-only subcommands, and the rejection of an unknown
 * command.
 *
 * Two properties make these tests honest rather than decorative:
 *
 *  1. **A throwaway state root.** Every boot runs with `MYSTERIUM_HOME` pointed at a temp dir, so a
 *     test never reads or mutates the developer's real profile — and the fact that it *can* is
 *     itself the assertion that the state root is addressable (G36 relies on the same contract).
 *  2. **Absence is asserted, not assumed.** The read-only subcommands are run in `--json`, and the
 *     test asserts the JSON is parseable — an empty stdout would otherwise pass as "no output".
 *
 * Spec: `docs/DEVELOPMENT-PLAN.md` Phase 14 d5 · `CHECKED-SURFACE-AUDIT-2026-09-24` §11 F10.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SESSION_MODES } from '../../src/core/domain/SessionMode.js';

const ROOT = process.cwd();
const ENTRY = path.join(ROOT, 'scripts', 'cli-game.ts');

let home = '';

interface Run {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

/** Boot the CLI once, against the throwaway state root. */
function run(args: readonly string[]): Run {
  const r = spawnSync(process.execPath, ['--import', 'tsx', ENTRY, ...args], {
    cwd: ROOT,
    env: { ...process.env, MYSTERIUM_HOME: home },
    encoding: 'utf-8',
    timeout: 120_000,
  });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

describe('CLI subcommand matrix', () => {
  beforeAll(() => {
    expect(fs.existsSync(ENTRY), 'scripts/cli-game.ts is the documented entry point').toBe(true);
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'mysterium-cli-matrix-'));
  });

  afterAll(() => {
    if (home) fs.rmSync(home, { recursive: true, force: true });
  });

  it('reports the version from package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8')) as { version: string };
    const r = run(['--version']);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout.trim()).toBe(pkg.version);
  });

  it('lists the full command surface in --help', () => {
    const r = run(['--help']);
    expect(r.status, r.stderr).toBe(0);
    // The help output is the interface contract: a command that stops appearing here is a command
    // a player cannot find. These are the names the parser registers.
    const expected = [
      'setup', 'status', 'new-game', 'diagnostic', 'curriculum', 'session', 'glossary', 'profile',
      'setup-profile', 'train', 'insights', 'export', 'calibrate', 'events', 'privacy', 'delegate',
    ];
    for (const name of expected) {
      expect(r.stdout, `--help does not list \`${name}\``).toMatch(new RegExp(`^\\s{2}${name}\\b`, 'm'));
    }
  });

  it('documents both session modes as selectable flags', () => {
    const r = run(['--help']);
    for (const mode of SESSION_MODES) {
      expect(r.stdout, `--help does not offer --mode=${mode}`).toContain(mode);
    }
    // The mode list is canonical in src/core/domain/SessionMode.ts; this is the coupling assertion
    // that the flag's advertised vocabulary is that list and not a copy of it.
    expect(r.stdout).toMatch(/--mode <mode>/);
  });

  it('answers the read-only subcommands with parseable JSON', () => {
    // Each entry: the argv, and the JSON `type` the command is expected to emit.
    const readOnly: readonly (readonly [string[], string])[] = [
      [['status', '--json'], 'status'],
      [['glossary', '--json'], 'glossary'],
    ];
    for (const [argv, type] of readOnly) {
      const r = run(argv);
      expect(r.status, `${argv.join(' ')} :: ${r.stderr}`).toBe(0);
      const line = r.stdout.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('{'))[0];
      expect(line, `${argv.join(' ')} produced no JSON`).toBeTruthy();
      const parsed = JSON.parse(line!) as { type?: string };
      expect(parsed.type, `${argv.join(' ')} emitted type ${parsed.type}`).toBe(type);
    }
  });

  it('runs the remaining read-only subcommands without error', () => {
    for (const argv of [['diagnostic'], ['profile', 'list'], ['credential', 'list'], ['vow', 'list'], ['events'], ['curriculum', 'lint']]) {
      const r = run(argv);
      expect(r.status, `${argv.join(' ')} :: ${r.stderr}`).toBe(0);
    }
  });

  it('rejects an unknown subcommand instead of silently succeeding', () => {
    const r = run(['definitely-not-a-command']);
    expect(r.status).not.toBe(0);
    expect(r.stderr.toLowerCase()).toContain('unknown command');
  });

  it('honours MYSTERIUM_HOME — the CLI reports the redirected state root', () => {
    const r = run(['status', '--json']);
    expect(r.status, r.stderr).toBe(0);
    const parsed = JSON.parse(r.stdout.split('\n').map((l) => l.trim()).find((l) => l.startsWith('{'))!) as {
      config?: { configDir?: string };
    };
    // The assertion that matters: the CLI itself resolves its state root through the canonical
    // helper, so G36 and this file can boot the system without touching a real profile.
    expect(parsed.config?.configDir).toBe(home);
  });
});

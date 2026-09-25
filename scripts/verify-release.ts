#!/usr/bin/env node
/**
 * Release smoke for the packaged CLI artifact.
 *
 * Source-level G36 cannot prove that `package.json.bin` boots: a stale or broken
 * bundle is still a green source suite. This post-build probe exercises the
 * artifact that npm publishes, including its declared version and every
 * canonical session mode, using an isolated MYSTERIUM_HOME throughout.
 *
 * @script-status: wired — `npm run verify:release`; read-only except for a
 * temporary state root that is removed before exit.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SESSION_MODES } from '../src/core/domain/SessionMode.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
  readonly version: string;
  readonly bin?: string | Readonly<Record<string, string>>;
};
const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.mysterium;
if (!bin) throw new Error('release smoke: package.json does not declare the mysterium bin');
const artifact = path.resolve(root, bin);

if (!fs.existsSync(artifact)) {
  throw new Error(`release smoke: ${bin} is missing; run npm run build:cli first`);
}

const version = spawnSync(process.execPath, [artifact, '--version'], {
  cwd: root,
  encoding: 'utf8',
});
if (version.error) throw new Error(`release smoke: --version failed to run: ${version.error.message}`);
if (version.status !== 0 || version.stdout.trim() !== pkg.version) {
  throw new Error(
    `release smoke: --version mismatch (status ${version.status}, output ${JSON.stringify(version.stdout.trim())}, expected ${pkg.version})`,
  );
}

const SAVE_FILES = ['world.json', 'save-all.json', 'save.json'];

/**
 * Did any save file under the isolated root carry an orchestration checkpoint?
 *
 * Recursive rather than `home/profiles/*` because the writer is `getMysteriumProfileDir()`: it
 * resolves `MYSTERIUM_HOME` itself, and only redirects into a profile when `profiles/_active` exists.
 * Assuming the `profiles/` shape would scan nothing on a fresh root and report a real write as absent.
 *
 * Symlinks ARE followed, because `profiles/_active` is one (`ProfileManager.ts`) and `Dirent.isDirectory()`
 * reports it as neither a file nor a directory — a symlink-blind scan silently misses the exact case
 * the redirect is built for. A visited set of REAL paths makes a self-referential or cyclic link a
 * bounded walk rather than a hang.
 */
function findCheckpoint(dir: string, seen: Set<string> = new Set()): boolean {
  let real: string;
  try {
    real = fs.realpathSync(dir);
  } catch {
    return false;
  }
  if (seen.has(real)) return false;
  seen.add(real);

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      // Resolve before recursing so a dangling link is skipped rather than thrown on.
      try {
        if (fs.statSync(p).isDirectory()) {
          if (findCheckpoint(p, seen)) return true;
        }
      } catch { /* dangling link is not a checkpoint */ }
    } else if (entry.isDirectory()) {
      if (findCheckpoint(p, seen)) return true;
    } else if (entry.isFile() && SAVE_FILES.includes(entry.name)) {
      try {
        if (fs.readFileSync(p, 'utf8').includes('orchestrationCheckpoint')) return true;
      } catch { /* unreadable file is not a checkpoint */ }
    }
  }
  return false;
}

for (const mode of SESSION_MODES) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), `mysterium-release-${mode}-`));
  try {
    const run = spawnSync(
      process.execPath,
      [artifact, '--headless', '--json', '--new-game', '-e', '2', `--mode=${mode}`],
      {
        cwd: root,
        env: { ...process.env, MYSTERIUM_HOME: home },
        encoding: 'utf8',
        timeout: 120_000,
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    if (run.error) throw new Error(`release smoke: ${mode} failed to run: ${run.error.message}`);
    if (run.status !== 0) throw new Error(`release smoke: ${mode} exited ${run.status}: ${run.stderr.trim()}`);
    if (!/"type":\s*"session_ended"/.test(run.stdout)) {
      throw new Error(`release smoke: ${mode} emitted no session_ended event`);
    }

    if (!findCheckpoint(home)) throw new Error(`release smoke: ${mode} completed without an orchestration checkpoint`);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
}

console.log(`release smoke: built CLI reports ${pkg.version}; ${SESSION_MODES.join(' and ')} sessions complete and persist checkpoints`);

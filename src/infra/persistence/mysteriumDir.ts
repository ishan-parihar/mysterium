import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Canonical Mysterium directory resolution.
 * Previously duplicated in FileKeyValueStore.defaultDir (11:22),
 * SaveRepository.getCliLegacyDir/getSaveDir (145:168), and
 * CLITelemetry.legacyKV (47:54) with drift (profile vs legacy).
 * Single source now: all persistence layers call these helpers.
 */
export function getMysteriumHome(): string {
  const home = typeof (os as unknown as { homedir?: () => string }).homedir === 'function'
    ? (os as unknown as { homedir: () => string }).homedir!()
    : '/tmp/.mysterium';
  return home;
}

export function getMysteriumLegacyDir(): string {
  // `MYSTERIUM_HOME` redirects the entire state root (default `~/.mysterium`). It exists so the
  // state directory is *addressable*: a gate or a test can boot the system against a throwaway
  // root instead of mutating the developer's real profile (G36, plan Phase 14 d5). Resolution
  // stays single-source here — ProfileManager and the CLI both read this function, not `os.homedir()`.
  const override = process.env.MYSTERIUM_HOME;
  if (override && override.trim().length > 0) return path.resolve(override);
  return path.join(getMysteriumHome(), '.mysterium');
}

export function getMysteriumProfileDir(): string {
  const legacy = getMysteriumLegacyDir();
  const link = path.join(legacy, 'profiles', '_active');
  try {
    if (fs.existsSync(link)) {
      const resolved = fs.realpathSync(link);
      if (fs.existsSync(resolved)) return resolved;
    }
  } catch { /* fallback to legacy */ }
  return legacy;
}

export function getMysteriumDirForScope(scope: 'legacy' | 'auto' = 'auto'): string {
  return scope === 'legacy' ? getMysteriumLegacyDir() : getMysteriumProfileDir();
}

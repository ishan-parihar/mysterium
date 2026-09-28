/**
 * B-1's player-visible half: `cloudSyncState` must have a reader.
 *
 * The defect class is WRITE-ONLY UI — a store that records a real failure and that nothing
 * renders. The server correctly 503s, the client correctly counts the failure and refuses to
 * mark the state synced, and the player is told nothing. That is the same silent-success class
 * one layer up, and it is invisible to a runtime test: nothing throws, every request behaves.
 *
 * So the assertion is an IMPORTER COUNT, the same shape G44 uses for `sessionControlStore` and
 * the same reason: the failure is an ABSENCE, and no runtime gate can see an absence.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REPO = process.cwd();
const componentPath = join(REPO, 'src/lib/components/CloudSyncIndicator.svelte');

/** Every .svelte/.ts file under src, excluding the store that defines the state. */
function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (/\.(svelte|ts)$/.test(entry)) acc.push(full);
  }
  return acc;
}

describe('B-1 — the sync failure state is rendered, not just recorded', () => {
  it('the indicator component exists and subscribes to cloudSyncState', () => {
    expect(existsSync(componentPath)).toBe(true);
    const src = readFileSync(componentPath, 'utf-8');
    // It must import the store AND react to it ($cloudSyncState) — a component that imported it
    // but never read it would be a write-only component, the same defect one level down.
    expect(src).toMatch(/import\s*\{[^}]*cloudSyncState[^}]*\}\s*from/);
    expect(src).toMatch(/\$cloudSyncState/);
    // Both states a player needs to be able to distinguish.
    expect(src).toMatch(/'failed'/);
  });

  it('the indicator is mounted in the root layout, so the signal is on every route', () => {
    const layout = readFileSync(join(REPO, 'src/routes/+layout.svelte'), 'utf-8');
    expect(layout).toMatch(/import CloudSyncIndicator/);
    expect(layout).toMatch(/<CloudSyncIndicator\s*\/>/);
  });

  it('cloudSyncState has at least one reader outside its own defining module', () => {
    const storePath = join(REPO, 'src/lib/stores/cloudSyncStore.ts');
    const importers = sourceFiles(join(REPO, 'src')).filter((f) => {
      if (f === storePath) return false;
      return /cloudSyncState/.test(readFileSync(f, 'utf-8'));
    });
    // Named in the failure so the message says what to restore, not just "too few".
    expect(importers, `cloudSyncState has no reader: ${importers.join(', ')}`).not.toHaveLength(0);
  });
});

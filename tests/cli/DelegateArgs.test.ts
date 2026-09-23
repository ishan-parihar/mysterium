/**
 * Delegate CLI surface (doc 43 Phase-1 smoke) — flag-handling contract.
 *
 * Regression: the delegate subcommand parses its flags from the RAW argv tail,
 * but the root commander program ALSO declares `--json` (and used to declare
 * `-e, --encounters`). Commander consumes root-declared flags before the
 * subcommand's raw tail is scanned, so:
 *   - `delegate --json` was silently non-JSON (argv scan never saw it), and
 *   - `delegate --encounters 5` silently ran at the default budget, which
 *     starved every 3-tool advisory mandate (T1/T2/J3/J4/therapist) into
 *     budget_exhausted with zero proposals — the spec→log→ratify→commit gate
 *     was unreachable for those roles through the CLI.
 *
 * The fix (scripts/cli/delegateArgs.ts) moved parsing into a testable module
 * and renamed the budget flag to the collision-free `--budget`. These tests
 * lock the contract: parsing behavior, the role vocabulary, the budget floor,
 * and a SOURCE-level guard that no root-declared flag name is ever re-scanned
 * from raw argv in the delegate path (the defect class, not just the instance).
 *
 * Spec: docs/foundations/43-agentic-orchestration-architecture.md §4.5;
 * plan revision record 2026-09-17 (delegation CLI smoke).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  parseDelegateArgs,
  DELEGATE_ROLE_PATTERN,
  DELEGATE_BUDGET_DEFAULT,
  ADVISORY_MIN_BUDGET,
} from '../../scripts/cli/delegateArgs.js';

describe('delegate CLI args (collision-free flag handling)', () => {
  it('applies defaults with an empty tail', () => {
    const a = parseDelegateArgs([]);
    expect(a.role).toBe('J1');
    expect(a.line).toBe('Cognitive');
    expect(a.stage).toBe('Red');
    expect(a.budget).toBe(DELEGATE_BUDGET_DEFAULT);
    expect(a.seed).toBe('cli-delegate');
  });

  it('parses explicit flags from the raw tail', () => {
    const a = parseDelegateArgs(['--role', 'T1', '--line', 'Somatic', '--stage', 'Amber', '--budget', '12', '--seed', 'abc']);
    expect(a.role).toBe('T1');
    expect(a.line).toBe('Somatic');
    expect(a.stage).toBe('Amber');
    expect(a.budget).toBe(12);
    expect(a.seed).toBe('abc');
  });

  it('NEVER reads --json from argv (the root parser consumes it first)', () => {
    // The historical defect: argv.includes('--json') was always false because
    // commander's root parse consumed the flag. The parser must not consult
    // argv for --json at all — passing it in the tail is inert.
    const a = parseDelegateArgs(['--json', '--role', 'T2']);
    expect(a.role).toBe('T2');
    expect('jsonMode' in a).toBe(false);
    expect('json' in a).toBe(false);
  });

  it('NEVER reads --encounters (renamed to the collision-free --budget)', () => {
    // The old flag name shares the root `-e, --encounters` declaration; the
    // root parser eats it before this scan, silently dropping user budgets.
    const a = parseDelegateArgs(['--encounters', '9', '--budget', '4']);
    expect(a.budget).toBe(4);
  });

  it('garbage/NaN budget falls back to the default (validateSpec still fail-closes ≤0)', () => {
    expect(parseDelegateArgs(['--budget', 'abc']).budget).toBe(DELEGATE_BUDGET_DEFAULT);
    expect(parseDelegateArgs(['--budget']).budget).toBe(DELEGATE_BUDGET_DEFAULT);
  });

  it('clamps to ≥1 so a zero budget can never silently pass through parsing', () => {
    expect(parseDelegateArgs(['--budget', '0']).budget).toBe(1);
    expect(parseDelegateArgs(['--budget', '-3']).budget).toBe(1);
  });

  // Phase 13 d12: the state-summoning surface. `--summon` makes the DISPATCHER choose the role.
  it('parses the summoning flags (--summon / --trigger / --intent)', () => {
    const quiet = parseDelegateArgs([]);
    expect(quiet.summon).toBe(false);
    expect(quiet.trigger).toBeUndefined();
    expect(quiet.intent).toBe('game');

    const summon = parseDelegateArgs(['--summon', '--trigger', 'crisis', '--intent', 'test']);
    expect(summon.summon).toBe(true);
    expect(summon.trigger).toBe('crisis');
    expect(summon.intent).toBe('test');
  });

  it('an unknown --intent degrades to game rather than throwing (the dispatcher owns the vocabulary)', () => {
    expect(parseDelegateArgs(['--intent', 'nonsense']).intent).toBe('game');
  });
});

describe('delegate role vocabulary (43 §4.2 council)', () => {
  const ALL_ROLES = [
    'J1', 'J2', 'J3', 'J4', 'J5',
    'T1', 'T2', 'T3',
    'A1', 'A2', 'A3', 'A4',
    'therapist',
    'S1', 'S2', 'S3', 'S4', 'S5',
  ];

  it('accepts all 18 council roles', () => {
    for (const role of ALL_ROLES) expect(DELEGATE_ROLE_PATTERN.test(role)).toBe(true);
  });

  it('rejects non-roles and malformed input', () => {
    for (const bad of ['J6', 'T0', 'A5', 'S6', 'admin', '', 'j1', 'THERAPIST', '--help']) {
      expect(DELEGATE_ROLE_PATTERN.test(bad)).toBe(false);
    }
  });
});

describe('advisory budget floor (the starvation defect)', () => {
  it('default budget completes the largest advisory allowlist (T1/T2: 2 reads + 1 propose)', () => {
    expect(DELEGATE_BUDGET_DEFAULT).toBeGreaterThanOrEqual(ADVISORY_MIN_BUDGET);
  });

  it('ADVISORY_MIN_BUDGET is exactly the largest allowlist cardinality in ROLE_TOOLSETS', async () => {
    const { ROLE_TOOLSETS } = await import('../../src/core/orchestration/types.js');
    const advisoryMax = Math.max(
      ...Object.values(ROLE_TOOLSETS)
        // Advisory mandates run every tool in the allowlist exactly once.
        .map((tools) => tools.length),
    );
    // The floor must cover the largest allowlist, whatever it evolves into —
    // if a role's allowlist grows, this test forces the floor (and default)
    // to grow with it instead of silently re-introducing starvation.
    expect(ADVISORY_MIN_BUDGET).toBeGreaterThanOrEqual(advisoryMax);
  });
});

describe('source-level collision guard (the defect CLASS)', () => {
  // runDelegateCommand moved to scripts/cli/delegateCmd.ts (cohesion item 1, stage D);
  // the commander declaration chain stays in the entry. Read both surfaces.
  const cliSource = readFileSync(new URL('../../scripts/cli-game.ts', import.meta.url), 'utf8');
  const cmdSource = readFileSync(new URL('../../scripts/cli/delegateCmd.ts', import.meta.url), 'utf8');
  const delegateBody = cmdSource;

  it('delegate declaration declares no root-shared flag names', () => {
    // Extract the .command('delegate') declaration block up to the next .command(.
    const start = cliSource.indexOf(".command('delegate')");
    const end = cliSource.indexOf(".command('vow");
    const block = cliSource.slice(start, end);
    // `--json` is root-declared; `--encounters` collides with root `-e, --encounters`.
    expect(block.includes("'--json'")).toBe(false);
    expect(block.includes("'--encounters'")).toBe(false);
    expect(block.includes("'--budget <n>'")).toBe(true);
  });

  it('runDelegateCommand never scans argv for root-declared flag names', () => {
    for (const banned of [
      "includes('--json')", "indexOf('--json')", "get('--json')",
      "includes('--headless')", "get('--headless')",
      "includes('--dev')", "get('--dev')",
      "includes('--model')", "get('--model')",
      "includes('--encounters')", "get('--encounters')",
      "includes('--verbose')", "get('--verbose')",
    ]) {
      expect(delegateBody.includes(banned), `delegate path must not scan argv for ${banned}`).toBe(false);
    }
  });

  it('runDelegateCommand parses via the extracted, tested module', () => {
    expect(delegateBody.includes('parseDelegateArgs')).toBe(true);
    expect(delegateBody.includes("delegateArgs.js")).toBe(true);
  });
});

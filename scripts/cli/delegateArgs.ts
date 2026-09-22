/**
 * Delegate-command flag parsing (doc 43 CLI smoke surface).
 *
 * @script-status: wired — imported by `scripts/cli-game.ts` at runtime (`import('./cli/delegateArgs.js')`
 *                 inside the delegate subcommand), which `npm run cli` executes. Not standalone.
 *
 * BUG-FIX regression extract: the delegate subcommand reads its flags from the
 * raw argv tail (program.args), NOT from commander's option store. That means
 * any flag whose NAME is also declared on the ROOT program (--json, the old
 * --encounters) is consumed by the root parser before this scan and silently
 * lost. Two rules keep this surface correct:
 *
 *   1. `--json` must come from the ROOT opt (JSON_MODE), never from argv.
 *   2. Subcommand-only flag names must never collide with root flag names
 *      (this is why the budget flag is `--budget`, not `--encounters`).
 *
 * Tests: tests/cli/DelegateArgs.test.ts
 */

/** Parsed delegate-command flags. */
export interface DelegateArgs {
  readonly role: string;
  readonly line: string;
  readonly stage: string;
  readonly budget: number;
  readonly seed: string;
  /**
   * Phase 13 d12: summon by STATE instead of by role. With `--summon`, the council DISPATCHER
   * decides who appears (43 §3.3) and `--role` is ignored — the CLI reports the summons and runs
   * each summoned mandate. `--trigger <name>` names the state to simulate (a dev/smoke surface);
   * absent, the quiet state is used (the ordinary encounter).
   */
  readonly summon: boolean;
  readonly trigger: string | undefined;
  /** The encounter's intent, which selects the Journey-Guide for an encounter-open summons. */
  readonly intent: 'game' | 'test' | 'diagnosis';
}

export const DELEGATE_ROLE_PATTERN =
  /^(J[1-5]|T[1-3]|A[1-4]|therapist|S[1-5])$/;

const BUDGET_DEFAULT = 6;

/**
 * The largest advisory allowlist (T1/T2) needs 2 reads + 1 propose = 3 tool
 * calls; the default budget must complete it or every advisory role starves
 * into budget_exhausted with zero proposals (the original defect).
 */
export const DELEGATE_BUDGET_DEFAULT = BUDGET_DEFAULT;

/** Budget below this cannot complete the largest advisory allowlist. */
export const ADVISORY_MIN_BUDGET = 3;

/**
 * Parse the raw argv tail of `mysterium delegate ...`.
 *
 * @param argv raw tail after the subcommand token (program.args.slice(1));
 *        must NOT be consulted for `--json` — the root parser consumes that
 *        flag before this scan (see module docstring).
 */
export function parseDelegateArgs(argv: readonly string[]): DelegateArgs {
  const get = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  // NaN/garbage falls back to the default; validateSpec fail-closes on ≤0.
  const budgetRaw = parseInt(get('--budget') ?? String(BUDGET_DEFAULT), 10);
  const budget = Math.max(1, Number.isFinite(budgetRaw) ? budgetRaw : BUDGET_DEFAULT);
  const intentRaw = get('--intent');
  const intent: DelegateArgs['intent'] = intentRaw === 'test' || intentRaw === 'diagnosis' ? intentRaw : 'game';
  return {
    role: get('--role') ?? 'J1',
    line: get('--line') ?? 'Cognitive',
    stage: get('--stage') ?? 'Red',
    budget,
    seed: get('--seed') ?? 'cli-delegate',
    summon: argv.includes('--summon'),
    trigger: get('--trigger'),
    intent,
  };
}

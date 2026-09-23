// @script-status: wired — imported by cli-game.ts, which `npm run cli` runs. Holds state; no side effects of its own.
/**
 * The invocation state — everything the runner captured at start-up, in ONE owner.
 *
 * Stage B of the CLI split (module-cohesion audit item 1). The runner declared ~20 module-level
 * values from the parsed argv, the resolved provider and the loaded config file, and every function
 * in a 5 300-line file read them as ambient globals. That is why the printers and the commands could
 * not move: not because they were tangled with each other, but because none of them owned the state
 * they read.
 *
 * Rules for this module:
 *
 *  - **Reads are free, writes go through a named setter.** Values are exported as live `let`
 *    bindings, so existing call sites keep reading `HEADLESS` exactly as before, while the two
 *    genuinely mutable ones expose `setHeadless` / `setLlmActive` — the mutation is then greppable
 *    instead of hidden in an assignment.
 *  - **The phases are the file's real phases, not one blob.** Provider resolution happens BEFORE
 *    argv parsing (an early `--model` override feeds it) and the answer queue is filled while the
 *    options are read, so the owner has two init calls plus an answer push. Collapsing them into one
 *    would have to lie about the order, and the order is load-bearing: config → provider → argv.
 *  - **`VERBOSE` is derived, never set.** It is `--verbose` AND `--dev`; the Veil rule is that
 *    requesting the machinery without opting into dev mode does not reveal it.
 *  - **The side effects stay in the entry.** Propagating headless/dev to `process.env`, and printing
 *    the Veil warning, are the runner's job — this module holds state, it does not act.
 */
import type { Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';
import type { Modality } from '../../src/core/domain/enums.js';
import type { SessionMode } from '../../src/core/domain/SessionMode.js';
import type { MysteriumConfig } from './config.js';

// ── Session shape (argv) ─────────────────────────────────────────────────────
export let HEADLESS = false;
export let RAW_VERBOSE = false;
export let DEV_MODE = false;
/** Derived: `--verbose` is only honoured together with `--dev` (Veil principle). */
export let VERBOSE = false;
export let JSON_MODE = false;
export let ACTIVE_MODEL = '';
export let encounterCount = 20;
export let FORCE_LINE: Line | undefined;
export let FORCE_STAGE: Stage | undefined;
export let FORCE_MODALITY: Modality | undefined;
export let FORCE_MODE: SessionMode | undefined;
export let FORCE_SHADOW: string | undefined;
export let NEW_GAME = false;
export let SKIP_CALIBRATION = false;
export let CURRICULUM_MODE = false;
/** The subcommand the invocation selected, if any (`program.args[0]`). */
export let subcommand: string | undefined;

// ── Provider identity (config + env, resolved before argv) ───────────────────
export let LLM_ACTIVE = false;
export let apiKey = 'sk-placeholder';
export let baseUrl = '';
export let model = '';
export let provider = '';
export let fileConfig: MysteriumConfig = {};

/** Answers supplied via `--answer` / `--answers`, consumed in order by the encounter loop. */
export const USER_ANSWERS: string[] = [];

/**
 * Phase 2 init: the provider identity, resolved from the config file, the environment and any early
 * `--model` override. Called BEFORE argv parsing, because the resolved model is a default the parse
 * may override.
 */
export function setProviderState(state: {
  readonly fileConfig: MysteriumConfig;
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
  readonly provider: string;
  readonly llmComplete: boolean;
}): void {
  fileConfig = state.fileConfig;
  apiKey = state.apiKey;
  baseUrl = state.baseUrl;
  model = state.model;
  provider = state.provider;
  LLM_ACTIVE = state.llmComplete;
}

/** Phase 3 init: the parsed invocation. `verbosity` is resolved into `VERBOSE` here, once. */
export function setInvocation(inv: {
  readonly subcommand?: string;
  readonly headless: boolean;
  readonly rawVerbose: boolean;
  readonly devMode: boolean;
  readonly jsonMode: boolean;
  readonly activeModel: string;
  readonly encounters: number;
  readonly line?: Line;
  readonly stage?: Stage;
  readonly modality?: Modality;
  readonly mode?: SessionMode;
  readonly forceShadow?: string;
  readonly newGame: boolean;
  readonly skipCalibration: boolean;
  readonly curriculum: boolean;
}): void {
  subcommand = inv.subcommand;
  HEADLESS = inv.headless;
  RAW_VERBOSE = inv.rawVerbose;
  DEV_MODE = inv.devMode;
  JSON_MODE = inv.jsonMode;
  ACTIVE_MODEL = inv.activeModel;
  encounterCount = inv.encounters;
  FORCE_LINE = inv.line;
  FORCE_STAGE = inv.stage;
  FORCE_MODALITY = inv.modality;
  FORCE_MODE = inv.mode;
  FORCE_SHADOW = inv.forceShadow;
  NEW_GAME = inv.newGame;
  SKIP_CALIBRATION = inv.skipCalibration;
  CURRICULUM_MODE = inv.curriculum;
  VERBOSE = inv.rawVerbose && inv.devMode;
}

/**
 * The non-TTY guard in `main()` turns headless on for a piped invocation. It goes through a setter so
 * the transition is visible at the call site rather than being an assignment to a module global.
 */
export function setHeadless(value: boolean): void {
  HEADLESS = value;
}

/** The LLM availability check clears this when the provider turns out to be unreachable. */
export function setLlmActive(value: boolean): void {
  LLM_ACTIVE = value;
}

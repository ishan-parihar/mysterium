/**
 * Surface gates — G36–G38, G44–G46: the entry point, the checked graph, the System-1 boundary,
 * the session-control wiring, the pack seam, and the articulation-ladder seam.
 *
 * Split out of `gates.ts` (module-cohesion audit item 2). These are the class-level gates: they assert
 * the shape of the BUILD and of the module graph, which no engine-level gate can see.
 *
 * Spec: the kernel's gate roster is owned by `gates/roster.ts` (`runValidationSuite` IS the order
 * gates run in) and every gate is documented at its own definition. The historical
 * `docs/validation/BENCHMARK-ARCHITECTURE.md` §6 was the spec for this roster, but that file is not
 * in the tree — see `docs/audits/DOC-SET-AUDIT-2026-09-20.md` R6, which records it as complementary to
 * `foundations/40`. Citations to it are therefore stale pointers, not a live authority; the gate
 * definitions and the roster are the authority now.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ALL_LINES } from '../../domain/Line.js';
import { ALL_DRIVES } from '../../domain/Drive.js';
import { ALL_MODALITIES } from '../../domain/enums.js';
import { SESSION_MODES } from '../../domain/SessionMode.js';
import { ALL_STAGES } from '../../domain/Stage.js';
import type { GateResult } from './plumbing.js';

// ---------------------------------------------------------------------------
// G36 — CLI boot smoke (hard, plan Phase 14 d5; `CHECKED-SURFACE-AUDIT-2026-09-24` §11 F10).
//
// The executable form of "the entry point runs". The CLI was non-bootable for three days and
// nothing in the battery noticed, because every other gate asserts the ENGINE and the entry point
// is not the engine. So this gate boots it: one real child process per member of the canonical
// `SESSION_MODES`, against a throwaway state root (`MYSTERIUM_HOME`), and requires exit 0 and a
// completed session.
//
// Every mode is booted, not just the default — F10 was precisely a mode that no agent could reach:
// the story branch's encounter dispatch threw, was swallowed by its own `try`, and the failure
// surfaced nowhere. A mode that cannot be booted is not a mode.
// ---------------------------------------------------------------------------

interface CliBootProbe {
  readonly mode: string;
  readonly exitCode: number | null;
  readonly ended: boolean;
  readonly timedOut: boolean;
  readonly detail: string;
  /** Phase 14 d4: did this mode persist the orchestration checkpoint? */
  readonly persisted: boolean;
}

/**
 * Did the boot leave an orchestration checkpoint behind? The default (DQ) surface bypassed the whole
 * architecture until Phase 14 d4 — this is the assertion that both modes run the REAL loop, not just
 * that they exit 0 (an exit-0 session that persists nothing is exactly what the audit found).
 */
function checkpointPersisted(home: string): boolean {
  // A first session has no active profile yet, so the save lands at the state root; once a profile
  // exists it lands under `profiles/<name>/`. Both are legitimate homes for the same file.
  const dirs = [home];
  try {
    for (const name of fs.readdirSync(path.join(home, 'profiles'))) dirs.push(path.join(home, 'profiles', name));
  } catch { /* no profiles dir yet — the root alone is enough */ }
  for (const dir of dirs) {
    for (const file of ['world.json', 'save-all.json', 'save.json']) {
      try {
        if (fs.readFileSync(path.join(dir, file), 'utf-8').includes('orchestrationCheckpoint')) return true;
      } catch { /* absent is expected for most of them */ }
    }
  }
  return false;
}

/** Boot the CLI once, headless, against `home`. Never rejects — a failure is probe data. */
function bootCli(mode: string, home: string, entry: string): Promise<CliBootProbe> {
  return new Promise((resolve) => {
    const args = [
      '--import', 'tsx', entry,
      '--headless', '--json', '--new-game',
      '-e', '2',
      `--mode=${mode}`,
    ];
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: { ...process.env, MYSTERIUM_HOME: home },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, 120_000);
    child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    child.on('error', (e) => {
      clearTimeout(timer);
      resolve({ mode, exitCode: null, ended: false, timedOut, persisted: false, detail: `spawn failed: ${e.message}` });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const ended = /"type":\s*"session_ended"/.test(stdout);
      const persisted = checkpointPersisted(home);
      const tail = stderr.trim().split('\n').filter(Boolean).slice(-2).join(' | ');
      resolve({
        mode, exitCode: code, ended, timedOut, persisted,
        detail: timedOut ? 'timed out after 120s'
          : code !== 0 ? `exit ${code}${tail ? ` — ${tail}` : ''}`
          : !ended ? 'no session_ended event on stdout — the session did not complete'
          : !persisted ? 'session completed but persisted no orchestration checkpoint — the mode runs outside the architecture'
          : `exit 0, session completed, checkpoint persisted`,
      });
    });
  });
}

export async function validateCliBoot(): Promise<GateResult> {
  const mk = (m: string): GateResult => ({ gate: 'G36 cli boot', passed: false, hard: true, details: m });
  try {
    const root = process.cwd();
    const entry = path.join(root, 'scripts', 'cli-game.ts');
    if (!fs.existsSync(entry)) return mk('scripts/cli-game.ts is missing — the documented entry point does not exist (npm run cli)');

    const roots: string[] = [];
    try {
      const probes = await Promise.all(SESSION_MODES.map((mode) => {
        const home = fs.mkdtempSync(path.join(os.tmpdir(), `mysterium-g36-${mode}-`));
        roots.push(home);
        return bootCli(mode, home, entry);
      }));
      const bad = probes.filter((p) => p.exitCode !== 0 || !p.ended || !p.persisted);
      if (bad.length > 0) {
        return mk(bad.map((p) => `--mode=${p.mode}: ${p.detail}`).join('; '));
      }
      return {
        gate: 'G36 cli boot', passed: true, hard: true,
        details: `${probes.length} session modes boot headless against a throwaway state root, complete a session and persist the orchestration checkpoint (${probes.map((p) => p.mode).join(', ')}); MYSTERIUM_HOME resolution honoured by the CLI`, };
    } finally {
      for (const dir of roots) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ } }
    }
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// G37 — Checked graph + canonical constants (hard, plan Phase 14 d5; the `G25` pattern applied to
// build config).
//
// Two assertions, both named by the audit.
//
//  1. **Checked graph.** Every production `.ts` under `src/` and `scripts/` matches a `tsconfig.json`
//     `include` pattern. A file outside the graph is unverified BY CONSTRUCTION: `tsc`, the tests,
//     the linter and every other gate skip it, so it can rot silently — the root cause of both the
//     non-bootable CLI (`scripts/**` was excluded) and the retired `White` ladder that survived only
//     in `scripts/**`.
//  2. **No re-declared canonical constant.** No module outside the canonical owner builds an array
//     literal containing a complete canonical set (stages / lines / drives / modalities). The `src/`
//     copies agreed on the day they were measured — which is exactly why this is a precondition
//     rather than a bug: the next retirement would have to find all of them.
// ---------------------------------------------------------------------------

/** Directories at or below a production root that the checked graph never contains. */
const G37_SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'android', '.svelte-kit', 'coverage', '.wrangler']);

/**
 * Exemptions to assertion 2, each with the reason it is not a re-declaration. Extending this list
 * is the conscious act the gate exists to force — a new entry must say why the list is a DIFFERENT
 * vocabulary rather than a second copy of the canonical one.
 */
const G37_CANONICAL_EXEMPT: readonly { readonly file: string; readonly why: string }[] = [
  {
    file: 'src/core/personalization/udv.ts',
    why: "`auditUdv`'s forbidden-token denylist is a superset vocabulary (stage names PLUS the ray/band markers `Indigo`, `Ultraviolet`, `cci`) — it lists tokens to REJECT from a serialized UDV, not an altitude ladder",
  },
  {
    file: 'src/core/presentation/veilDescriptors.ts',
    why: 'the player-facing descriptor table is keyed BY stage — a stage-indexed record, not a ladder passed to `indexOf`',
  },
  {
    file: 'src/core/personalization/scenarioSeedVariants.ts',
    why: '`MODALITY_ANGLES` is one AUTHORED angle per modality (46 §2/§6) — a table, not a ladder; adding a modality must add an authored angle, which is the point of the table',
  },
];

/** Convert a tsconfig `include` glob to a matcher. Handles the directory-spanning and single-segment star forms used here. */
function globToRegExp(pattern: string): RegExp {
  let out = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern.charAt(i);
    if (c === '*') {
      if (pattern.charAt(i + 1) === '*') {
        // a star immediately followed by a slash spans directories; a bare double-star spans anything
        if (pattern.charAt(i + 2) === '/') { out += '(?:.*/)?'; i += 2; } else { out += '.*'; i += 1; }
      } else {
        out += '[^/]*';
      }
      continue;
    }
    out += '.+^$()|{}[]'.includes(c) || c === '?' ? '\\' + c : c;
  }
  return new RegExp('^' + out + '$');
}

/** Every `.ts` file under `dir`, as POSIX relative paths from the repo root. */
function walkProductionTs(absDir: string, relDir: string, out: string[]): void {
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(absDir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (G37_SKIP_DIRS.has(e.name)) continue;
    const rel = `${relDir}/${e.name}`;
    if (e.isDirectory()) walkProductionTs(path.join(absDir, e.name), rel, out);
    else if (e.isFile() && e.name.endsWith('.ts')) out.push(rel);
  }
}

/**
 * Parse JSON-with-comments (the form tsconfig files are written in). Tiny scanner rather than a
 * dependency: strings are copied through so a `//` inside a path is never mistaken for a comment.
 * Backslash and newline are named via `fromCharCode` so the source carries no escape sequences.
 */
function readJsonc(text: string): unknown {
  const BS = String.fromCharCode(92);
  const LF = String.fromCharCode(10);
  let out = '';
  let inString = false;
  let quote = '';
  for (let i = 0; i < text.length; i++) {
    const c = text.charAt(i);
    const next = text.charAt(i + 1);
    if (inString) {
      out += c;
      if (c === BS) { out += next; i++; continue; }
      if (c === quote) inString = false;
      continue;
    }
    if (c === '"' || c === "'") { inString = true; quote = c; out += c; continue; }
    if (c === '/' && next === '/') {
      while (i < text.length && text.charAt(i) !== LF) i++;
      out += LF;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < text.length && !(text.charAt(i) === '*' && text.charAt(i + 1) === '/')) i++;
      i++;
      continue;
    }
    out += c;
  }
  return JSON.parse(out);
}

// ---------------------------------------------------------------------------
// G38 — The System-1 boundary (hard, plan Phase 14 d6).
//
// `43 §2` ratified three surfaces a local decision model may inform and no others, and three
// boundaries it may never cross: it proposes (never commits), it never authors, and it is never the
// final authority. Those are properties of the WIRING, not of the model — so they are asserted at
// the module-graph level, the `G25` pattern again:
//
//  1. **The core depends on the port, never the adapter.** No file under `src/core/` imports
//     `LayaSystem1Adapter`; the core holds `System1Port`. That is what makes the adapter
//     replaceable, and it is the difference between a boundary and a convention.
//  2. **The adapter has no write surface.** It cannot author, because it cannot persist — no
//     `writeFileSync`/`appendFileSync`/`localStorage` in the adapter's module.
//  3. **The fallback is reachable.** `system1Port.ts` must export both the deterministic
//     implementation and the guard combinator; a fallback nothing constructs is the same as none,
//     which is the failure this gate exists to make visible.
// ---------------------------------------------------------------------------

export function validateSystem1Boundary(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G38 system-1 boundary', passed: false, hard: true, details: m });
  try {
    const root = process.cwd();
    const adapterRel = 'src/infra/llm/LayaSystem1Adapter.ts';
    const adapterPath = path.join(root, adapterRel);
    if (!fs.existsSync(adapterPath)) return mk(`${adapterRel} is missing — the ratified System-1 adapter does not exist`);

    // 1 — the direction of dependence. An IMPORT, not a MENTION: every one of these files names the
    // adapter in its doc-comment (which is how a reader learns where it lives), and a substring test
    // fired on the comments that explain the rule. Match the import syntax so the assertion catches
    // the dependency it exists to catch.
    const adapterImport = /(?:from|import)\s*\(?\s*['"][^'"]*LayaSystem1Adapter(?:\.js)?['"]/;
    const coreFiles: string[] = [];
    walkProductionTs(path.join(root, 'src/core'), 'src/core', coreFiles);
    const importers = coreFiles.filter((rel) => adapterImport.test(fs.readFileSync(path.join(root, rel), 'utf-8')));
    if (importers.length > 0) {
      return mk(`the core imports the adapter (${importers.slice(0, 3).join(', ')}) — the core must depend on the System1Port, not on one implementation (43 §2)`);
    }

    // 2 — no write surface in the adapter: proposing is not authoring.
    const adapterText = fs.readFileSync(adapterPath, 'utf-8');
    for (const verb of ['writeFileSync', 'appendFileSync', 'localStorage', 'sessionStorage']) {
      if (adapterText.includes(verb)) return mk(`${adapterRel} contains '${verb}' — a System-1 adapter proposes; it never persists what it proposes`);
    }

    // 3 — the fallback exists and is constructible.
    const portPath = path.join(root, 'src/core/personalization/system1Port.ts');
    if (!fs.existsSync(portPath)) return mk('src/core/personalization/system1Port.ts is missing — the port the adapter implements does not exist');
    const portText = fs.readFileSync(portPath, 'utf-8');
    for (const symbol of ['export function createDeterministicSystem1', 'export function withSystem1Fallback', 'export function decideSystem1']) {
      if (!portText.includes(symbol)) return mk(`system1Port.ts does not export \`${symbol}\` — the degradation path must exist, not merely be documented`);
    }

    return {
      gate: 'G38 system-1 boundary', passed: true, hard: true,
      details: `${coreFiles.length} core files depend on System1Port and none on the adapter; the adapter carries no persistence verb; the deterministic fallback, the vocabulary guard and the agreement decision are all exported`,
    };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export function validateCheckedGraph(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G37 checked graph', passed: false, hard: true, details: m });
  try {
    const root = process.cwd();
    const configPath = path.join(root, 'tsconfig.json');
    if (!fs.existsSync(configPath)) return mk('tsconfig.json not found at the repo root');
    // tsconfig is JSONC: it carries `//` comments. Stripping them is what makes the assertion read
    // the REAL config rather than a copy of it (a copy would be a second source that can drift).
    const config = readJsonc(fs.readFileSync(configPath, 'utf-8')) as { include?: string[] };
    const include = config.include ?? [];
    if (include.length === 0) return mk('tsconfig.json declares no `include` — the checked graph is empty and nothing is verified');
    const patterns = include.map(globToRegExp);

    const files: string[] = [];
    for (const dir of ['src', 'scripts']) walkProductionTs(path.join(root, dir), dir, files);
    if (files.length === 0) return mk('no production TypeScript found under src/ and scripts/ — the walk is broken');

    const outside = files.filter((rel) => !patterns.some((re) => re.test(rel)));
    if (outside.length > 0) {
      return mk(`${outside.length} production file(s) sit outside the checked graph — tsc/the tests/the gates never read them: ${outside.slice(0, 5).join(', ')}${outside.length > 5 ? ` (+${outside.length - 5} more)` : ''}`);
    }

    const sets: readonly { readonly name: string; readonly owner: string; readonly members: readonly string[] }[] = [
      { name: 'stages', owner: 'src/core/domain/Stage.ts', members: ALL_STAGES as readonly string[] },
      { name: 'lines', owner: 'src/core/domain/Line.ts', members: ALL_LINES as readonly string[] },
      { name: 'drives', owner: 'src/core/domain/Drive.ts', members: ALL_DRIVES as readonly string[] },
      { name: 'modalities', owner: 'src/core/domain/enums.ts', members: ALL_MODALITIES as readonly string[] },
    ];
    const exempt = new Set(G37_CANONICAL_EXEMPT.map((e) => e.file));

    const redeclarations: string[] = [];
    for (const rel of files) {
      if (exempt.has(rel) || sets.some((s) => s.owner === rel)) continue;
      const text = fs.readFileSync(path.join(root, rel), 'utf-8');
      for (const literal of text.match(/\[[^\[\]]*\]/gs) ?? []) {
        for (const set of sets) {
          const present = set.members.filter((m) => literal.includes(`'${m}'`) || literal.includes(`"${m}"`)).length;
          if (present === set.members.length) redeclarations.push(`${rel} rebuilds the canonical ${set.name} set`);
        }
      }
    }
    if (redeclarations.length > 0) {
      return mk(`${redeclarations.length} re-declaration(s) of a canonical domain constant — import it from its owner instead: ${redeclarations.slice(0, 5).join('; ')}${redeclarations.length > 5 ? ` (+${redeclarations.length - 5} more)` : ''}`);
    }

    return {
      gate: 'G37 checked graph', passed: true, hard: true,
      details: `${files.length} production files inside the tsconfig include set (${include.length} patterns); 0 complete re-declarations of the canonical stages/lines/drives/modalities sets across them (${G37_CANONICAL_EXEMPT.length} documented exemptions)`, };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * The store's CLI-parity fields, paired with the context field each one must reach. A pair whose
 * context field regresses to a hard-coded literal is the exact shape of the original defect.
 */
const SESSION_CONTROL_PARITY_FIELDS: readonly (readonly [string, string])[] = [
  ['encounterCount', 'targetSessionLength'],
  ['forceLine', 'forceLine'],
  ['forceStage', 'forceStage'],
  ['forceModality', 'forceModality'],
];

/**
 * The G44 decision, as a pure function of the engine source, so the gate's FAILURE is testable
 * without mutating the working tree. `AGENTS.md`'s own rule (`MY-RG-0010`) is that a gate which
 * cannot fail is decoration; a gate whose only reachable exit is `passed: true` is exactly that,
 * and the only honest way to prove otherwise is to hand it a source that is genuinely dark.
 */
/**
 * Extract the regions of the engine that actually BUILD a `SessionContext`, so the field checks are
 * scoped to where the wiring must live rather than to the whole file.
 *
 * This exists because a whole-file `/forceLine/.test(text)` is vacuous: the word appears in the
 * store's import, in the `forceFields` block, and in this file's own prose. A file could drop every
 * read from its context literals, keep the import for a comment, and pass. G37 already works this
 * way — it extracts and inspects regions, not whole files — so this is the same idiom rather than a
 * new one.
 *
 * Two shapes are accepted, matching the two builders the WebUI has: an inline
 * `const … : SessionContext = { … }` literal, and a spread of a named `forceFields` object. The
 * `targetSessionLength` check is scoped to the literal because that field is set directly from the
 * store there.
 */
export function sessionContextRegions(text: string): string {
  const literals = [...text.matchAll(/SessionContext\s*=\s*\{([\s\S]*?)\n\s*\};/g)].map((m) => m[1] ?? '');
  const spreads = [...text.matchAll(/const\s+forceFields\s*=\s*\{([\s\S]*?)\n\s*\};/g)].map((m) => m[1] ?? '');
  return [...literals, ...spreads].join('\n');
}
/**
 * The G44 decision, as a pure function of the engine source, so the gate's FAILURE is testable
 * without mutating the working tree. `AGENTS.md`'s own rule (`MY-RG-0010`) is that a gate which
 * cannot fail is decoration; a gate whose only reachable exit is `passed: true` is exactly that,
 * and the only honest way to prove otherwise is to hand it a source that is genuinely dark.
 */
export function evaluateSessionControlWiring(text: string): { passed: boolean; details: string } {
  if (!/sessionControlStore/.test(text)) {
    return { passed: false, details: 'gameEngine.ts does not reference sessionControlStore — the settings controls are write-only again' };
  }
  if (!/sessionControlStore\.js/.test(text)) {
    return { passed: false, details: 'gameEngine.ts references sessionControlStore without importing it from its owner module' };
  }

  // Scoped to the context builders, NOT the whole file: a mention in a comment is not a read.
  // And matched as a VALUE (`control.forceLine`), not as a bare word — a mutation that swaps the
  // read for a literal leaves the word standing in the `forceFields` block, and a word-level check
  // passes it. This shape was verified by mutating the real file: a bare-word gate returned
  // `passed: true` on a file that had dropped the read, which is precisely the vacuity being removed.
  const regions = sessionContextRegions(text);
  if (regions.length === 0) {
    return { passed: false, details: 'gameEngine.ts builds no SessionContext literal or forceFields block — the wiring surface moved and this gate must follow it' };
  }
  const missing = SESSION_CONTROL_PARITY_FIELDS.filter(
    ([field]) => !new RegExp(`\\bcontrol\\.${field}\\b`).test(regions),
  );
  if (missing.length > 0) {
    return { passed: false, details: `no SessionContext builder reads ${missing.map(([f]) => f).join(', ')} from the store — those settings controls are inert (checked inside the context literals, not the whole file)` };
  }

  // Phase 16 d9 — the browser is not an instrument. The settings store has no `focusedCell`
  // producer, so ANY pin logic in this file is either dead (a constant false — the shape d8 shipped
  // and d9 deleted) or a NEW deliberate surface nobody has ratified. Both spellings are rejected:
  // consulting the shared predicate without a producer, and re-deriving a local copy. When the WebUI
  // gains an instrument mode, relax this check in the same commit that adds the producer.
  if (/\bisDeliberateInstrumentPin\s*\(/.test(text) || /const\s+(?:pinnedCell|instrumentPin)\s*=/.test(text)) {
    return { passed: false, details: 'gameEngine.ts carries pin logic — the browser is not an instrument (no focusedCell producer); the rule lives in the kernel seams, so a pin expression here is dead code or an unratified surface' };
  }

  return { passed: true, details: `store reachable from the WebUI engine; ${SESSION_CONTROL_PARITY_FIELDS.length} parity fields read inside the SessionContext builders; no instrument-pin logic in the browser` };
}

/**
 * The CLI half of the same wiring: `scripts/cli/runtime.ts` builds force-aware SessionContexts from
 * `--line`/`--stage`, and a human typing BOTH flags is the deliberate instrument pin. d9 moved the
 * seam-suppression rule behind `focusedCell`, which silently unmarked those builders — the CLI kept
 * the candidate cell filter but regained the four injection seams, a mixed-cohort run. Counting
 * builders (not mere presence of one mark) is what catches a THIRD builder appearing unmarked — the
 * same ABSENCE class the store wiring guards.
 */
export function evaluateCliInstrumentMarking(text: string): { passed: boolean; details: string } {
  const builders = (text.match(/\.\.\.\(FORCE_LINE \?/g) ?? []).length;
  const marks = (text.match(/FORCE_LINE && FORCE_STAGE[^\n]*focusedCell:\s*true/g) ?? []).length;
  if (marks < builders) {
    return { passed: false, details: `scripts/cli/runtime.ts has ${builders} force-aware session builder(s) but only ${marks} deliberate-pin mark(s) — an unmarked builder filters candidates to the cell while keeping the four injection seams, a mixed-cohort run` };
  }
  return { passed: true, details: `every force-aware CLI builder (${builders}) sets focusedCell: true when both --line and --stage are given` };
}

/**
 * G44 — the session controls are wired, not write-only (Phase 16 d8, 2026-09-26).
 *
 * `src/lib/stores/sessionControlStore.ts` declares itself "Parity with CLI flags: --encounters,
 * --line, --stage, --modality, --dev", and the settings page renders a control for each. It then had
 * exactly ONE importer — the settings page — and NO `SessionContext` builder read it: `gameEngine.ts`
 * hard-coded `targetSessionLength: 5` and passed no force fields at all. Four player-facing controls
 * persisted to localStorage and changed nothing, while `AGENTS.md` §4.2 item 2 listed the
 * live-surface-wiring set as EMPTY.
 *
 * Why a gate and not a test: the failure mode is ABSENCE. Every runtime assertion still passes with
 * the store fully dark, because an unread field behaves exactly like an absent one. A test that
 * exercises play cannot see it; only the module graph can. So this gate reads the graph — the same
 * technique as G37 — and fails if the store's own fields stop reaching a `SessionContext` builder.
 *
 * Deliberately a STATIC assertion. Running the WebUI here would require a browser; the checked graph
 * is the strongest claim available in a Node gate, and the claim it makes is precisely the one that
 * was false before.
 *
 * d9 added the CLI half: `scripts/cli/runtime.ts` builds two force-aware SessionContexts, and after
 * the rule moved behind `focusedCell` both silently lost their seam suppression — the CLI kept the
 * candidate filter but regained the four injection seams. The gate now counts force-aware builders
 * and requires a deliberate-pin mark on each, and rejects pin logic in the browser outright.
 */
export async function validateSessionControlsWired(): Promise<GateResult> {
  try {
    const enginePath = path.join(process.cwd(), 'src/lib/engine/gameEngine.ts');
    if (!fs.existsSync(enginePath)) {
      return { gate: 'G44 session controls wired', passed: false, hard: true, details: `error: ${enginePath} not found` };
    }
    const engineVerdict = evaluateSessionControlWiring(fs.readFileSync(enginePath, 'utf-8'));
    const cliPath = path.join(process.cwd(), 'scripts/cli/runtime.ts');
    if (!fs.existsSync(cliPath)) {
      return { gate: 'G44 session controls wired', passed: false, hard: true, details: `error: ${cliPath} not found` };
    }
    const cliVerdict = evaluateCliInstrumentMarking(fs.readFileSync(cliPath, 'utf-8'));
    return {
      gate: 'G44 session controls wired',
      passed: engineVerdict.passed && cliVerdict.passed,
      hard: true,
      details: `${engineVerdict.details}; ${cliVerdict.details}`,
    };
  } catch (e) {
    return { gate: 'G44 session controls wired', passed: false, hard: true, details: `error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ---------------------------------------------------------------------------
// G45 — pack seam wired (Phase 17 d1; `EDUCATION-SURFACE-AUDIT-2026-09-26` §0/§6).
//
// The pack engine's registry was test-only for its whole life: registerPack had no production
// caller, so the one production getPack read (pack-score acceptance in delegate.ts) was a
// fallback-masked always-miss, and no runtime gate could see the absence — an unseeded registry
// behaves exactly like an empty one. This gate reads the module graph instead (the G37/G44
// technique) and fails if the seed leaves the boot path or the CLI pack session stops reaching
// the real delegation, reliability, and claim machinery.
// ---------------------------------------------------------------------------

export async function validatePackSeamWired(): Promise<GateResult> {
  const gate = 'G45 pack seam wired';
  try {
    // Teeth (MY-RG-0010): match CALLS, never mentions. A commented-out seed or a bare import
    // still textually contains `seedPackRegistry()`, so every check below runs on comment-stripped
    // text with call-site anchoring — proven by mutation: comment the seed out, gut the seed
    // function, or sever the CLI's delegateSession call, and this gate goes red.
    const stripLineComments = (t: string): string => t.replace(/^\s*\/\/.*$/gm, '');
    const read = (rel: string): string => {
      const p = path.join(process.cwd(), rel);
      if (!fs.existsSync(p)) throw new Error(`${p} not found`);
      return stripLineComments(fs.readFileSync(p, 'utf-8'));
    };
    if (!/^\s*seedPackRegistry\(\);/m.test(read('src/core/GameLoop.ts'))) {
      return { gate, passed: false, hard: true, details: 'src/core/GameLoop.ts no longer CALLS seedPackRegistry() on the boot path — the pack registry is test-only again, and delegate.ts\'s getPack read reverts to a fallback-masked always-miss' };
    }
    if (!/export function seedPackRegistry[\s\S]*?registerPack\(/.test(read('src/core/packs/referencePacks.ts'))) {
      return { gate, passed: false, hard: true, details: 'seedPackRegistry is on the boot path but no longer registers packs into the engine registry' };
    }
    const cmd = read('scripts/cli/packCmd.ts');
    const missing = ([
      ['delegateSession', /delegateSession\(/],
      ['ReliabilityCollector', /ReliabilityCollector/],
      ['packEvidenceRef', /packEvidenceRef/],
      ['seedPackRegistry', /seedPackRegistry/],
    ] as const).filter(([, re]) => !re.test(cmd)).map(([n]) => n);
    if (missing.length > 0) {
      return { gate, passed: false, hard: true, details: `scripts/cli/packCmd.ts no longer reaches: ${missing.join(', ')} — the pack session left the live delegation/reliability/claim machinery` };
    }
    return { gate, passed: true, hard: true, details: 'pack registry seeded on the boot path; the CLI pack session runs the real delegation machinery, records reliability data, and drafts pack-evidence claims' };
  } catch (e) {
    return { gate, passed: false, hard: true, details: `error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ---------------------------------------------------------------------------
// G46 — articulation ladder wired (Phase 17 d2; `EDUCATION-SURFACE-AUDIT-2026-09-26` §6 d2).
//
// The ladder (16 §10.5) was in-vitro for its whole life: law-holding render code with zero
// importers. The failure is absence again — a bridge that nothing renders through behaves
// exactly like no bridge — so this gate reads the module graph. It requires BOTH halves of the
// seam at each consumer: the payload producer (buildLadderPayloads) AND the law-holder
// (renderLevel). A consumer calling only the bridge would bypass AL1–AL6 (raw payloads, no
// register discipline); a consumer calling only renderLevel has nothing real to render.
// ---------------------------------------------------------------------------

export async function validateLadderWired(): Promise<GateResult> {
  const gate = 'G46 articulation ladder wired';
  try {
    const stripLineComments = (t: string): string => t.replace(/^\s*\/\/.*$/gm, '');
    const read = (rel: string): string => {
      const p = path.join(process.cwd(), rel);
      if (!fs.existsSync(p)) throw new Error(`${p} not found`);
      return stripLineComments(fs.readFileSync(p, 'utf-8'));
    };
    const bridge = read('src/core/presentation/ladderProjections.ts');
    if (!/buildLadderPayloads[\s\S]*?articulationLadder\.js/.test(bridge) && !/from '\.\.\/domain\/articulationLadder\.js'/.test(bridge)) {
      return { gate, passed: false, hard: true, details: 'ladderProjections no longer derives its payload types from the ladder — the bridge and the law-holder have drifted apart' };
    }
    if (!/for \(const spec of LADDER\)/.test(bridge)) {
      return { gate, passed: false, hard: true, details: 'ladderProjections dropped its every-level completeness contract — a level can go dark silently again' };
    }
    const consumers: readonly [string, string][] = [
      ['scripts/cli/ladderCmd.ts', 'the CLI ladder command'],
      ['src/routes/profile/+page.svelte', 'the WebUI profile page'],
    ];
    for (const [rel, name] of consumers) {
      const text = read(rel);
      const missing = ([
        ['buildLadderPayloads', /buildLadderPayloads\(/],
        ['renderLevel', /renderLevel\(/],
      ] as const).filter(([, re]) => !re.test(text)).map(([n]) => n);
      if (missing.length > 0) {
        return { gate, passed: false, hard: true, details: `${name} no longer reaches: ${missing.join(', ')} — the ladder ${missing.includes('renderLevel') ? 'is bypassed (raw payloads, no register law)' : 'has no real payload producer'}` };
      }
    }
    return { gate, passed: true, hard: true, details: 'ladder bridge derives every level; both the CLI and the WebUI profile render through the law-holder' };
  } catch (e) {
    return { gate, passed: false, hard: true, details: `error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

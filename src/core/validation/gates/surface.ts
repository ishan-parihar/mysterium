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

/**
 * Gate-source reader helper: strip line, block, and HTML comments before matching, so a gate can only be satisfied by live code — never by a mention in prose (a JSDoc
 * block naming `ReliabilityCollector` must not satisfy a wiring check, G45's mutation #4).
 */
function stripSourceComments(t: string): string {
  return t
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    // Line comments BOTH line-initial and trailing — G47's mutation #9 proved a trailing
    // `// createShare(` mention satisfies a call-anchored row. `://` is protected (URLs);
    // a quoted `//` literal in a string would be eaten, which is acceptable for gate matching.
    .replace(/(^|[^\w:])\/\/.*$/gm, '$1');
}

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
    // Teeth (MY-RG-0010): match CALLS, never mentions. A commented-out seed, a bare import, or a
    // JSDoc mention still textually contains the symbol, so every check below runs on
    // comment-stripped text (line + block + HTML comments) with call-site anchoring — proven by
    // mutation: comment the seed out, gut the seed function, sever the CLI's delegateSession
    // call, or delete the collector construction, and this gate goes red.
    const read = (rel: string): string => {
      const p = path.join(process.cwd(), rel);
      if (!fs.existsSync(p)) throw new Error(`${p} not found`);
      return stripSourceComments(fs.readFileSync(p, 'utf-8'));
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
      ['new ReliabilityCollector()', /new ReliabilityCollector\(/],
      ['packEvidenceRef', /packEvidenceRef\(/],
      ['seedPackRegistry()', /seedPackRegistry\(\)/],
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
    const read = (rel: string): string => {
      const p = path.join(process.cwd(), rel);
      if (!fs.existsSync(p)) throw new Error(`${p} not found`);
      return stripSourceComments(fs.readFileSync(p, 'utf-8'));
    };
    const bridge = read('src/core/presentation/ladderProjections.ts');
    if (!/from '\.\.\/domain\/articulationLadder\.js'/.test(bridge)) {
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

// ---------------------------------------------------------------------------
// G47 — the share seam wired (Phase 17 d3; 16 §2.4.1 + MY-AD-0034).
//
// The share mechanism (persona-free, scope-selected — the owner's 2026-09-27 ruling) has the
// same absence-class failure the pack and ladder seams had: a share store with no consumer,
// or a view that renders around renderLevel, behaves exactly like no share system. The gate
// requires BOTH enforcement points of MY-AD-0034's one law: createShare must call the
// exported scopeRunValid (validated at creation), and the view consumer must reach
// createShare + revokeShare + buildLadderPayloads + renderLevel + the hasSave honesty gate.
// ---------------------------------------------------------------------------

export async function validateShareSeamWired(): Promise<GateResult> {
  const gate = 'G47 share mechanism wired';
  try {
    const read = (rel: string): string => {
      const p = path.join(process.cwd(), rel);
      if (!fs.existsSync(p)) throw new Error(`${p} not found`);
      return stripSourceComments(fs.readFileSync(p, 'utf-8'));
    };
    const shares = read('src/core/domain/shares.ts');
    if (!/scopeRunValid\(/.test(shares)) {
      return { gate, passed: false, hard: true, details: 'shares.ts no longer validates through scopeRunValid — the MY-AD-0034 scope law has one enforcement point instead of two' };
    }
    const lawHolder = read('src/core/domain/articulationLadder.ts');
    if (!/scopeRunValid\(/.test(lawHolder)) {
      return { gate, passed: false, hard: true, details: 'the law-holder dropped scopeRunValid — the render-time re-check (AL5) is gone' };
    }
    const cmd = read('scripts/cli/shareCmd.ts');
    const missing = ([
      ['createShare', /createShare\(/],
      ['revokeShare', /revokeShare\(/],
      ['buildLadderPayloads', /buildLadderPayloads\(/],
      ['renderLevel', /renderLevel\(/],
      ['hasSave', /hasSave\(/],
    ] as const).filter(([, re]) => !re.test(cmd)).map(([n]) => n);
    if (missing.length > 0) {
      return { gate, passed: false, hard: true, details: `scripts/cli/shareCmd.ts no longer reaches: ${missing.join(', ')} — the share surface left the scope law / ladder machinery` };
    }
    return { gate, passed: true, hard: true, details: 'share scope law enforced at creation and re-checked at render; the CLI share view renders through the law-holder with the hasSave honesty gate' };
  } catch (e) {
    return { gate, passed: false, hard: true, details: `error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ---------------------------------------------------------------------------
// G48 — pod transport M0 wired (Phase 17 d4; 38 §4.2).
//
// M0 gives the pod state machine its transport seam: a KV-backed coordinator over the
// declared-binding shape (local double until the user-reserved KV IDs exist) plus the
// client-polling half. The absence class is the same one G45/G46/G47 close: a transport
// with no consumer, or a consumer applying events around the serial discipline, behaves
// exactly like no transport. The gate requires the CLI to construct the coordinator, poll
// through it, and apply through it — and the adapter family to hold the discipline
// (applyEvent) and the privacy wall (payloadIsSafe) behind the PodTransport contract.
// ---------------------------------------------------------------------------

export async function validatePodTransportWired(): Promise<GateResult> {
  const gate = 'G48 pod transport M0 wired';
  try {
    const read = (rel: string): string => {
      const p = path.join(process.cwd(), rel);
      if (!fs.existsSync(p)) throw new Error(`${p} not found`);
      return stripSourceComments(fs.readFileSync(p, 'utf-8'));
    };
    const adapters = read('src/infra/pods/PodTransport.ts');
    // Scope the discipline rows to the KVPodCoordinator CLASS BODY: the in-memory adapter's own
    // applyEvent/payloadIsSafe calls must not satisfy the M0 rows (mutation #12 — the production
    // adapter bypassing the discipline while the test double keeps it stays red).
    const kvStart = adapters.indexOf('export class KVPodCoordinator');
    if (kvStart < 0) {
      return { gate, passed: false, hard: true, details: 'PodTransport.ts no longer declares KVPodCoordinator — the M0 adapter is gone' };
    }
    const kvBody = adapters.slice(kvStart);
    const missingAdapter = ([
      ['applyEvent (the serial discipline)', /applyEvent\(/],
      ['payloadIsSafe (the privacy wall)', /payloadIsSafe\(/],
      ['the PodTransport contract', /implements PodTransport/],
    ] as const).filter(([, re]) => !re.test(kvBody)).map(([n]) => n);
    if (missingAdapter.length > 0) {
      return { gate, passed: false, hard: true, details: `PodTransport.ts no longer holds: ${missingAdapter.join(', ')} — the M0 adapter bypasses the event discipline/privacy wall` };
    }
    const cmd = read('scripts/cli/practiceCmd.ts');
    const missingCmd = ([
      ['KVPodCoordinator construction', /new KVPodCoordinator\(/],
      ['pollEvents (the client-polling half)', /pollEvents\(/],
      ['apply (the serial event path)', /\.apply\(/],
    ] as const).filter(([, re]) => !re.test(cmd)).map(([n]) => n);
    if (missingCmd.length > 0) {
      return { gate, passed: false, hard: true, details: `scripts/cli/practiceCmd.ts no longer reaches: ${missingCmd.join(', ')} — the pod CLI left the M0 transport seam` };
    }
    return { gate, passed: true, hard: true, details: 'M0 KV coordinator holds the serial discipline + privacy wall; the pod CLI applies and polls through the transport' };
  } catch (e) {
    return { gate, passed: false, hard: true, details: `error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ---------------------------------------------------------------------------
// G49 — the practice toolset registered (Phase 17 D-39; 39 §4.2/§4.4 P1).
//
// P0's practice loop was live via /journal, but the two agent tools existed only as a
// header comment in practiceTools.ts — the in-vitro class G45–G48 exist to catch. The gate
// requires: the schemas module reaching the pure functions AND the §4.4 pipeline with its
// heuristic fallback AND the crisis gate; the orchestrator registering PRACTICE_TOOLS and
// dispatching through handlePracticeTool; and the engine passing the integration.
// ---------------------------------------------------------------------------

export async function validatePracticeToolsWired(): Promise<GateResult> {
  const gate = 'G49 practice tools registered';
  try {
    const read = (rel: string): string => {
      const p = path.join(process.cwd(), rel);
      if (!fs.existsSync(p)) throw new Error(`${p} not found`);
      return stripSourceComments(fs.readFileSync(p, 'utf-8'));
    };
    const schemas = read('src/core/practice/practiceToolSchemas.ts');
    const missingSchema = ([
      ['proposeObjectives (the pure proposer)', /proposeObjectives\(/],
      ['processCheckIn (the pure check-in)', /processCheckIn\(/],
      ['scoreReflectionPipeline (the §4.4 pipeline)', /scoreReflectionPipeline\(/],
      ['detectCrisis (the crisis gate before scoring)', /detectCrisis\(/],
    ] as const).filter(([, re]) => !re.test(schemas)).map(([n]) => n);
    if (missingSchema.length > 0) {
      return { gate, passed: false, hard: true, details: `practiceToolSchemas.ts no longer reaches: ${missingSchema.join(', ')} — the tools bypass the pure core, the pipeline, or the crisis gate` };
    }
    const pipeline = read('src/core/practice/ReflectionEvidence.ts');
    if (!/scoreReflectionDepth\(/.test(pipeline)) {
      return { gate, passed: false, hard: true, details: 'ReflectionEvidence no longer calls scoreReflectionDepth — the §4.4 graceful-degrade fallback is gone' };
    }
    const orch = read('src/core/assessments/AgenticOrchestrator.ts');
    // BOTH dispatch sites, not one: the orchestrator has two run paths, and a row that matches
    // either lets one path's practice dispatch be deleted while the gate stays green — the MUT12
    // shape. A tool call on that path would then fall through to "unknown tool". Counted, because
    // both sites are the same call and only the count distinguishes them.
    const practiceDispatchSites = (orch.match(/handlePracticeTool\(/g) ?? []).length;
    const missingOrch = ([
      ['PRACTICE_TOOLS registration', /PRACTICE_TOOLS as unknown as/],
      [`handlePracticeTool dispatch on BOTH run paths (found ${practiceDispatchSites}, need 2)`, practiceDispatchSites >= 2],
    ] as const)
      .filter(([, ok]) => (typeof ok === 'boolean' ? !ok : !ok.test(orch)))
      .map(([n]) => n);
    if (missingOrch.length > 0) {
      return { gate, passed: false, hard: true, details: `AgenticOrchestrator no longer reaches: ${missingOrch.join(', ')} — the practice tools cannot go live on the session loop` };
    }
    if (!/practice:/.test(read('src/lib/engine/gameEngine.ts'))) {
      return { gate, passed: false, hard: true, details: 'gameEngine no longer passes the practice integration — the tools are constructed but never registered' };
    }
    return { gate, passed: true, hard: true, details: 'practice toolset reaches the pure core through the crisis gate and the §4.4 pipeline; registered and dispatched on both orchestrator paths; the engine supplies the integration' };
  } catch (e) {
    return { gate, passed: false, hard: true, details: `error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ---------------------------------------------------------------------------
// G50 — the WebUI schedules like the kernel (Phase 17 Track B) + the reserved
// primary's position contract (MY-AD-0033).
//
// The browser's `scheduleEncounters` called `scheduleNextWithHolonicReturn` with
// DEFAULT_WEIGHTS and no bleed-through and never interleaved curriculum beats, while every
// other surface scheduled through `tickWithStrategy` (strategy weight bias + bleed-through +
// the curriculum interleave). One cadence definition, two consumers — the parity gap.
// The reserve row keeps MY-AD-0033's POSITION contract (most-starved eligible line wins;
// the all-zero tie is canonical order, not hash order) scale-independent, which no seeded
// campaign can witness.
// ---------------------------------------------------------------------------

export async function validateWebUiParityWired(): Promise<GateResult> {
  const gate = 'G50 WebUI scheduling parity';
  try {
    const read = (rel: string): string => {
      const p = path.join(process.cwd(), rel);
      if (!fs.existsSync(p)) throw new Error(`${p} not found`);
      return stripSourceComments(fs.readFileSync(p, 'utf-8'));
    };
    const engine = read('src/lib/engine/gameEngine.ts');
    const missing = ([
      ['applyWeightBias (the strategy bias)', /applyWeightBias\(/],
      ['detectBleedThrough', /detectBleedThrough\(/],
      ['generateCurriculumEncounters (the interleave)', /generateCurriculumEncounters\(/],
    ] as const).filter(([, re]) => !re.test(engine)).map(([n]) => n);
    if (missing.length > 0) {
      return { gate, passed: false, hard: true, details: `gameEngine.ts no longer reaches: ${missing.join(', ')} — the browser has drifted back to unweighted scheduling` };
    }
    const loop = read('src/core/GameLoop.ts');
    if (!/applyWeightBias\(\s*DEFAULT_WEIGHTS/.test(loop) || !/generateCurriculumEncounters\(/.test(loop)) {
      return { gate, passed: false, hard: true, details: 'the kernel loop no longer applies the strategy bias or the curriculum interleave — the parity definition itself is gone' };
    }
    const scheduler = read('src/core/engines/EncounterScheduler.ts');
    if (!/export function selectReservedPrimaryByLineCoverage/.test(scheduler)) {
      return { gate, passed: false, hard: true, details: 'the reserved primary is no longer exported — its scale-independent contract cannot be asserted' };
    }
    return { gate, passed: true, hard: true, details: 'browser scheduling carries the strategy bias, bleed-through and the curriculum interleave; the reserved primary keeps its exported position contract' };
  } catch (e) {
    return { gate, passed: false, hard: true, details: `error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ---------------------------------------------------------------------------
// G51 — the three auditor surfaces are wired through the share law (33 §7, 16 §2.4.1).
//
// 33 §7 has declared Guardian Mirror, Educator Desk and Therapeutic Pane as RENDER CONTRACTS
// since 2026-09-17. They were unbuilt, and nothing failed: an absence no runtime gate can see.
//
// The failure this gate exists for is specific. A surface that renders a profile is a CONSENT
// DECISION, and the law is already written — `renderLevel` re-checks the scope run and the
// revocation at every render (AL5). A surface that builds its own payloads and draws them is
// not a style choice, it is a second and weaker permission system sitting in `src/routes`,
// where the player's revocation would not reach it.
//
// So the gate requires the SEAM to be the only path, and requires both halves of it at every
// consumer, in the shape G46/G47 already use:
//   - the projection seam reaches BOTH buildLadderPayloads and renderLevel (it cannot derive a
//     payload without the bridge, and it cannot decide permission without the law-holder);
//   - each of the three routes reaches the seam, so no surface can render around it;
//   - the honesty gate survives — a surface refuses without a Significator rather than
//     narrating a fabricated profile, which is the one failure a working law would still permit.
// ---------------------------------------------------------------------------

export async function validateAuditorSurfacesWired(): Promise<GateResult> {
  const gate = 'G51 auditor surfaces wired through the share law';
  try {
    const read = (rel: string): string => {
      const p = path.join(process.cwd(), rel);
      if (!fs.existsSync(p)) throw new Error(`${p} not found`);
      return stripSourceComments(fs.readFileSync(p, 'utf-8'));
    };

    // (1) The seam holds BOTH halves. A seam that reaches the bridge but not the law-holder is a
    //     payload factory; one that reaches the law but not the bridge renders nothing.
    const seam = read('src/lib/components/auditor/auditorProjection.ts');
    const seamMissing = ([
      ['buildLadderPayloads (the payload bridge)', /buildLadderPayloads\(/],
      ['renderLevel (the law-holder)', /renderLevel\(/],
      ['consentFor (the grant lookup)', /consentFor\(/],
      ['auditor register (AL1 — never the self register)', /register:\s*'auditor'/],
      ['the hasSave honesty gate', /no Significator loaded/],
    ] as const).filter(([, re]) => !re.test(seam)).map(([n]) => n);
    if (seamMissing.length > 0) {
      return { gate, passed: false, hard: true, details: `the projection seam no longer reaches: ${seamMissing.join(', ')} — a surface can render a profile without passing the consent law (16 §2.4.1)` };
    }

    // (2) Every one of the three surfaces reaches the seam. 33 §7 declares exactly three; a
    //     fourth surface with no gate row is the same absence this gate is closing.
    const SURFACES = ['guardian', 'educator', 'therapeutic'] as const;
    for (const surface of SURFACES) {
      const rel = `src/routes/auditor/${surface}/+page.svelte`;
      const page = read(rel);
      // `read` already strips comments, so this cannot be satisfied by a comment naming the
      // component — MUT52 wrapped the surface in `<!-- AuditorSurface -->` and passed a
      // call-anchored-looking check. The row is now about USE, not the name.
      if (!/<AuditorSurface[\s/>]/.test(page)) {
        return { gate, passed: false, hard: true, details: `${rel} no longer renders the shared surface — 33 §7.1 declares this surface, and a surface that renders its own payloads is a second permission system` };
      }
      // The surface must name its own scope, or all three would be the same pane.
      if (!new RegExp(`surface="${surface}"`).test(page)) {
        return { gate, passed: false, hard: true, details: `${rel} does not declare surface="${surface}" — 33 §7.1 gives each surface its own projection` };
      }
      // AND it must not reach the bridge or the law-holder itself. Reaching the seam is not
      // enough: a route that renders the shared surface AND builds its own payloads beside it is
      // still a second permission system, and the shared component's refusal would not cover the
      // extra drawing. (MUT46: this row exists because the reach-only check passed it.)
      // Match the SYMBOL, not a call with it. MUT46 imported buildLadderPayloads and never
      // called it — an unused import is the bypass just as much as a call is, and a call-anchored
      // row let it through. G47's mutation #9 taught this lesson already; this row would have
      // repeated it.
      const bypass = ([
        ['buildLadderPayloads', /buildLadderPayloads/],
        ['renderLevel', /renderLevel/],
        ['LADDER_LEVELS (the ladder is the seam\'s to read)', /LADDER_LEVELS/],
      ] as const).filter(([, re]) => re.test(page)).map(([n]) => n);
      if (bypass.length > 0) {
        return { gate, passed: false, hard: true, details: `${rel} reaches ${bypass.join(', ')} directly — the seam is the ONLY path a surface may take, or a route draws beside its own refusal` };
      }
    }

    // (2b) And there is no FOURTH surface. 33 §7.1 declares exactly three, each with its own
    //      projection and its own rules. A new route under src/routes/auditor/ rendering an
    //      AuditorSurface is an auditor surface with no render contract, no scope and no rule —
    //      the same absence this gate exists to close, in the direction that matters most.
    //      (MUT55: a `counsellor` route passed every row above.)
    const auditorDir = path.join(process.cwd(), 'src/routes/auditor');
    if (fs.existsSync(auditorDir)) {
      const found = fs
        .readdirSync(auditorDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .filter((n) => fs.existsSync(path.join(auditorDir, n, '+page.svelte')))
        .sort();
      const extra = found.filter((n) => !(SURFACES as readonly string[]).includes(n));
      if (extra.length > 0) {
        return { gate, passed: false, hard: true, details: `src/routes/auditor/ has surfaces 33 §7.1 does not declare: ${extra.join(', ')} — an auditor surface without a render contract, scope or rule is an unratified disclosure surface` };
      }
    }

    // (3) The shell renders no data of its own. 33 §7: the projections arrive pre-filtered and
    //     consent-checked and the render layer "adds visual hierarchy and interaction only" — a
    //     shell that reads a payload is a shell that can decide to show one.
    const shell = read('src/lib/components/auditor/AuditorShell.svelte');
    // Symbol-anchored, for the same reason as the bypass rows: a shell that reads
    // `payloads.get('L1')` (MUT51) never spells a call, so a call-anchored row let it through.
    if (/buildLadderPayloads|renderLevel|\bpayloads\b|\.metrics\b|LevelPayload/.test(shell)) {
      return { gate, passed: false, hard: true, details: 'AuditorShell.svelte reaches the payload or the law — 33 §7 makes the shell hierarchy and interaction only' };
    }

    return { gate, passed: true, hard: true, details: 'all three surfaces reach the seam, the seam holds both halves of the law, and the honesty gate survives' };
  } catch (e) {
    return { gate, passed: false, hard: true, details: `G51 errored: ${(e as Error).message}` };
  }
}

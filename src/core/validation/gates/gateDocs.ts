import * as fs from 'fs';
import * as path from 'path';
import type { GateResult } from './plumbing.js';

/**
 * Every kernel gate must be named by at least one live document.
 *
 * THE CLASS THIS EXISTS FOR (MY-RG-0034). A gate that is named nowhere is a gate whose failure mode is
 * never anticipated. Measured 2026-09-30: G55, G56 and G57 existed in `roster.ts` and appeared in
 * **no live document** — `AGENTS.md` included. `AGENTS.md` §4.2 taught a 51-gate model of the kernel
 * whose roster was 57, and the three unnamed ones were the newest and least discoverable: the
 * closed-register Veil gate, the keyed-`{#each}` gate, and the route-reachability gate.
 *
 * G57 had already caught a real orphan (`/knowledge` reachable only from `/profile`) that a reader of
 * the current root protocol had no reason to look for. G55 guards the Veil law that `AGENTS.md` §5.4
 * states in prose the reader believes is current. A gate whose name is absent teaches nothing.
 *
 * WHY THIS IS AN ABSENCE AND SO NEEDS A DOCUMENT ASSERTION. Nothing throws when a gate is unnamed: the
 * gate runs, it passes, and the reader's model of the kernel is quietly wrong. No runtime behaviour
 * distinguishes "documented" from "undocumented" — which is the same reasoning that made G44 a
 * module-graph assertion rather than a runtime gate, and G57 a source scan rather than a click test.
 *
 * WHY NOT `arch.py` DOC-GOVERNANCE. The doc gates read `_org.yaml` and the record layer; the gate
 * roster is a code artefact, and the binding that matters runs the other way — a code id must have a
 * document home. That direction has no owner today. This is it.
 *
 * THE SCOPE IS DELIBERATE: LIVE documents only. `docs/audits/` is `live: false` — dated evidence, never
 * an authority — so a gate named only in an audit has not been communicated. A scan that accepted
 * audits would pass the moment someone wrote a dated report about the gap, which is exactly what a
 * record is for and exactly what documentation is not.
 */

const REPO = process.cwd();

/** Where a gate's name is allowed to count as communication. */
const LIVE_DOC_DIRS = ['docs/foundations', 'docs/system', 'docs/lines', 'docs/stages', 'docs/progression', 'docs/narrative'];
const LIVE_DOC_FILES = ['AGENTS.md'];

/** Rungs that are explicitly non-authoritative. Never searched. */
const NON_AUTHORITATIVE = ['docs/audits', 'docs/historical'];

/** Extra prose files that sit at the repo root rather than under `docs/`. */
function isLiveDoc(rel: string): boolean {
  if (NON_AUTHORITATIVE.some((d) => rel === d || rel.startsWith(`${d}/`))) return false;
  if (LIVE_DOC_FILES.includes(rel)) return true;
  return LIVE_DOC_DIRS.some((d) => rel === d || rel.startsWith(`${d}/`));
}

function walk(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else if (entry.name.endsWith('.md')) out.push(abs);
  }
}

/**
 * Strip TypeScript comments. Used ONLY for the `.ts` gate-id scan.
 *
 * A comment-satisfied scan measures nothing, so the id scan must not read its own file's prose. This
 * rule has no business on Markdown — see `stripMarkdown`.
 */
function stripTsComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

/**
 * Strip HTML comments from Markdown. HTML comments are the only comment form Markdown has.
 *
 * THIS SPLIT IS THE FIX, and it came from a measured failure. The first version of this gate ran a
 * C-style `/* ... *\/` rule over the Markdown haystack and reported **18 undocumented gates** when
 * only 3 were. `AGENTS.md` §2.0b contains an ASCII directory tree in which one line begins with
 * `/` + `*`; the block-comment rule matched from there to the next `*\/` in the file and swallowed
 * **55,462 characters** — very nearly the whole document — so every gate named in ordinary prose
 * appeared absent.
 *
 * The gate did not under-report a real problem. It invented one, which is worse: the obvious repair
 * is to go edit 18 documents to satisfy an instrument that was never measuring what it claimed.
 * That is MY-RG-0010 in its purest form — **reproduce the failure before you edit the tree against
 * it.** A report of 18 defects earns exactly as much trust as a report of 0.
 *
 * Fenced code blocks are also removed, not because a code fence is a comment but because a fence may
 * contain something that looks like one, and because a gate id quoted in an example is not a document
 * *describing* that gate.
 */
function stripMarkdown(src: string): string {
  return src
    .replace(/^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\1[ \t]*$/gm, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

export function validateGatesDocumented(): GateResult {
  const mk = (m: string): GateResult => ({
    gate: 'G58 every kernel gate is named by a live document',
    passed: false,
    hard: true,
    details: m,
  });

  try {
    /**
     * THE ID SOURCE IS THE GATE MODULES, and this file's own suite must NOT be consulted.
     *
     * A gate that called `runValidationSuite()` to learn which gates ran would be a gate inside the
     * suite inspecting the suite — and `roster.ts` calls this validator, so every run re-entered the
     * suite, which pushes a whole campaign tier per nesting level. That is not a slow gate; it is a
     * non-terminating one.
     *
     * TWO CHEAPER SOURCES ARE ALSO WRONG, and both were tried:
     *  - a regex over `roster.ts` finds nothing, because the roster calls `validateFoo()` and never
     *    repeats an id;
     *  - a regex over the gate modules finds 55, not 58, because a module declares its id TWO
     *    incompatible ways — G1–G12 return `{ gate: 'G3 coherence' }` objects while later ones go
     *    through an `mk(id, message)` helper — so either pattern alone is incomplete.
     *
     * Hence BOTH patterns below, over every module under `gates/` EXCEPT this one: this file's own
     * docblock names G55/G56/G57/G58 while explaining the defect, so scanning it would satisfy every id
     * and the gate would pass vacuously. The gate would be the thing causing its own false green.
     */
    const gatesDir = path.join(REPO, 'src/core/validation/gates');

    /**
     * THE ID SOURCE IS THE ROSTER'S OWN IMPORT GRAPH, and four cheaper sources were each wrong.
     *
     *  - the EXECUTED SUITE (`runValidationSuite`) is authoritative but re-enters this gate — the
     *    roster calls this validator, so every run would recurse through a whole campaign tier. It is
     *    async, so the first version silently read `.results` off a Promise and got `undefined`.
     *  - a regex over `roster.ts` alone finds nothing: the roster calls `validateFoo()` and never
     *    repeats an id in an expression.
     *  - a directory scan of `gates/` is WRONG BY CONSTRUCTION: G16 lives in `src/core/practice/` and
     *    G18 in `src/core/pods/`. Measured — a `gates/`-only scan finds 54 of 58 and reports two
     *    perfectly good gates as absent.
     *  - per-convention patterns are each lossy, and lossily in a way that looks like a finding:
     *    `gate:`-only 38, `mk(`-only 43, "any quoted literal" 48, and with a hyphen-tolerant trailing
     *    class 56. G38's name is `'G38 system-1 boundary'` — the hyphen in "system-1" is why a
     *    `[a-z '-]*` class misses it, and a missed id reads as an undocumented gate.
     *
     * So: resolve each imported validator to its real module and read the ids there. The roster is
     * the only file that knows which module owns which gate, so following its imports is the one
     * resolution that cannot miss a gate for living outside `gates/`. Measured: 58 ids, matching the
     * 58 imported validators exactly.
     */
    const rosterSrc = stripTsComments(fs.readFileSync(path.join(gatesDir, 'roster.ts'), 'utf8'));
    const ids = new Set<string>();
    const validators = new Set<string>();

    for (const m of rosterSrc.matchAll(/import\s*\{([^}]+)\}\s*from\s*'([^']+)'/g)) {
      const [block, from] = [m[1], m[2]];
      const froms = new Set(
        block
          .split(',')
          .map((n) => n.trim().split(' as ').pop() ?? '')
          .filter((n) => n.startsWith('validate')),
      );
      for (const n of froms) validators.add(n);
      if (![...froms].some((n) => n.startsWith('validate'))) continue;

      // Resolve `./surface.js` and `../../pods/podStateMachine.js` against the gates directory, with
      // the TS extension the source uses rather than the `.js` specifier the import carries.
      const abs = path.resolve(gatesDir, from.replace(/\.js$/, '.ts'));
      if (!fs.existsSync(abs)) {
        return mk(`roster.ts imports ${from} but ${abs} does not exist — the graph is broken, not the scan empty`);
      }
      const src = stripTsComments(fs.readFileSync(abs, 'utf8'));
      for (const lit of src.matchAll(/'(G\d+[a-z]?)[^']*'/g)) ids.add(lit[1]);
    }

    if (ids.size === 0) return mk('no gate ids parsed from the roster import graph — the parse is wrong, not the roster empty');
    if (ids.size === 0) return mk('no gate ids parsed from src/core/validation/gates/ — the parse is wrong, not the roster empty');

    if (validators.size === 0) return mk('no validate* imports found in roster.ts — the cross-check is broken, not the roster empty');
    if (ids.size < validators.size) {
      return mk(
        `${validators.size} validators are imported by roster.ts but only ${ids.size} gate ids were parsed — ` +
          `${validators.size - ids.size} gate(s) are invisible to this gate, so a green result would mean nothing. ` +
          `Widen the id patterns, or give the unnamed gate a G-number.`,
      );
    }

    const docFiles: string[] = [];
    for (const d of LIVE_DOC_DIRS) walk(path.join(REPO, d), docFiles);
    for (const f of LIVE_DOC_FILES) {
      const abs = path.join(REPO, f);
      if (fs.existsSync(abs)) docFiles.push(abs);
    }

    const haystack = docFiles
      .filter((f) => isLiveDoc(path.relative(REPO, f).replace(/\\/g, '/')))
      .map((f) => stripMarkdown(fs.readFileSync(f, 'utf8')))
      .join('\n');

    if (haystack.length === 0) return mk('no live documents were read — a zero haystack would pass every gate as undocumented-but-absent');

    const undocumented = [...ids].filter((id) => !new RegExp(`\\b${id}\\b`).test(haystack));

    if (undocumented.length > 0) {
      return mk(
        `${undocumented.length} gate id(s) are named by NO live document: ${undocumented.join(', ')}. ` +
          `A gate whose name is absent teaches nothing: the reader's model of what the kernel checks is ` +
          `wrong, and its failure mode is never anticipated. Name it in the doc that owns its concern — ` +
          `AGENTS.md §4.2 for the roster narrative, or the organ contract for its subject. ` +
          `docs/audits/ and docs/historical/ do not count: a dated report is evidence, not communication.`,
      );
    }

    return {
      gate: 'G58 every kernel gate is named by a live document',
      passed: true,
      hard: true,
      details: `${ids.size} gate ids across ${validators.size} roster validators, all named by at least one live document (fences + HTML comments stripped, audits/historical excluded)`,
    };
  } catch (err) {
    return mk(`threw: ${err instanceof Error ? err.message : String(err)}`);
  }
}

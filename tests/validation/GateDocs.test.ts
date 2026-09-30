import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import { validateGatesDocumented } from '../../src/core/validation/gates/gateDocs.js';

const GATE_SRC = path.join(process.cwd(), 'src/core/validation/gates/gateDocs.ts');
const source = (): string => fs.readFileSync(GATE_SRC, 'utf8');

/**
 * MY-RG-0034's recurrence guard.
 *
 * THE DEFECT. G55, G56 and G57 ran in the roster while `AGENTS.md` §4.2 taught a 51-gate model of a
 * 57-gate kernel. A gate named nowhere is a gate whose failure mode is never anticipated — and G57 had
 * already caught a real orphan (`/knowledge` reachable only from `/profile`) that a reader of the
 * current root protocol had no reason to look for.
 *
 * The failure is an ABSENCE: nothing throws when a gate is unnamed, so no runtime behaviour separates
 * "documented" from "undocumented". Same reasoning that made G44 a module-graph assertion and G57 a
 * source scan.
 */
describe('G58 — every kernel gate is named by a live document', () => {
  it('passes on the current tree', () => {
    const r = validateGatesDocumented();
    expect(r.details).not.toContain('named by NO live document');
    expect(r.passed).toBe(true);
  });

  it('covers every imported validator — a green that cannot see a gate means nothing', () => {
    // THE CROSS-CHECK THIS PINS. Four id sources were tried and each was lossy in a way that LOOKED
    // like a finding: the executed suite re-enters the roster (and is async, so the first version read
    // `.results` off a Promise); `roster.ts` alone repeats no id; a `gates/` directory scan finds 54
    // of 58 because G16 lives in `src/core/practice/` and G18 in `src/core/pods/`; and per-convention
    // patterns find 38, 43, 48 and 56 — G38 is `'G38 system-1 boundary'`, and the hyphen in "system-1"
    // defeats an `[a-z '-]*` trailing class.
    //
    // An instrument that reports 18 undocumented gates when 2 are true looks exactly like a gate
    // finding a real problem, and the obvious repair — edit 18 documents — makes it worse. So the
    // count is asserted against the roster's own import count rather than trusted.
    const details = validateGatesDocumented().details;
    const m = /(\d+) gate ids across (\d+) roster validators/.exec(details);
    expect(m, `details did not carry the reconciliation: ${details}`).not.toBeNull();
    expect(Number(m![1])).toBe(Number(m![2]));
    expect(Number(m![2])).toBe(58);
  });

  it('resolves ids through the roster import graph, not a gates/ directory scan', () => {
    // A `gates/` scan is wrong by construction: two gates' bodies live outside that directory. The
    // roster is the only file that knows which module owns which gate.
    expect(source()).toContain("path.resolve(gatesDir, from.replace(/\\.js$/, '.ts'))");
  });

  it('never calls the suite it is a member of', () => {
    // `roster.ts` calls this validator, so calling `runValidationSuite` here would re-enter the
    // suite through a whole campaign tier per nesting level — and it is `async`, so the first version
    // silently read `.results` off a Promise and got `undefined`, which then read as "no ids parsed".
    //
    // Strip comments FIRST, which is this session's standing lesson applied to the test that guards
    // the gate about comment stripping: the file's docblock NAMES `runValidationSuite` while
    // explaining why it is forbidden, so a raw substring check fails on its own explanation.
    const code = source()
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/^\s*\/\/.*$/gm, ' ');
    expect(code).not.toContain('runValidationSuite');
  });

  it('reads Markdown with a Markdown stripper, not a C-style comment rule', () => {
    // THE MEASURED FAILURE THIS PINS. The first version ran a `/* ... */` rule over Markdown and
    // reported 18 undocumented gates when 6 were true: `AGENTS.md` §2.0b's ASCII directory tree
    // contains a line beginning `/` + `*`, and the block-comment rule matched from there to the next
    // `*/` — swallowing 55,462 characters, very nearly the whole document.
    expect(source()).toContain('function stripMarkdown(');
    expect(source()).toContain('function stripTsComments(');
    const mdFn = source().slice(
      source().indexOf('function stripMarkdown('),
      source().indexOf('export function validateGatesDocumented'),
    );
    expect(mdFn).not.toContain('/\\*');
  });

  it('excludes docs/audits and docs/historical — a dated report is evidence, not communication', () => {
    // If audits counted, this gate would pass the moment someone wrote a report describing the gap —
    // which is what a record is for and precisely what documentation is not.
    expect(source()).toContain('docs/audits');
    expect(source()).toContain('NON_AUTHORITATIVE');
    expect(validateGatesDocumented().passed).toBe(true);
  });
});
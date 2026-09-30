import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateRoutesReachable } from '$core/validation/gates/reachability.js';

/**
 * G57 must see a real orphan, and must not invent one.
 *
 * WHAT THE GATE GETS WRONG IF IT IS CARELESS. It started as "any `.svelte` file that mentions the
 * path", which is too generous — a ROUTE PAGE is not a navigation surface, so `/glossary` mentioning
 * `/insights` would vouch for it. Over-correcting to "exclude `src/routes/**`" was worse: the app's
 * real navigation lives INSIDE the route tree (`src/routes/+page.svelte` is the 16-item home menu,
 * `+layout.svelte` the shell, `settings/` the hub), and excluding them flagged 16 reachable routes as
 * orphans. The rule that survives is: a route may vouch for ITSELF, and shared navigation surfaces
 * vouch for everything — nothing else.
 *
 * So this asserts both directions. A gate that only ever reports orphans is a gate that cries wolf;
 * one that only ever passes is a gate that measures nothing.
 */
describe('G57 route reachability', () => {
  it('passes on the current tree — 28 routes, none orphaned', () => {
    const result = validateRoutesReachable();
    expect(result.passed, result.details).toBe(true);
  });

  it('names what it actually checked, so the report is not read as broader than it is', () => {
    const result = validateRoutesReachable();
    // Under-reporting what a gate verified is how a reader over-trusts it — the same defect as G55's
    // pass message naming only the template half when it also scans the corpus.
    expect(result.details).toMatch(/a route never counts as a link source for another route/);
    expect(result.details).toMatch(/\d+ routes on disk/);
  });

  it('the nav surfaces it treats as shared are the ones a player navigates through', () => {
    // A binding assertion: the rule is a list of surfaces, and shrinking or widening that list is
    // exactly how 16 reachable routes were declared orphans.
    const src = readFileSync('src/core/validation/gates/reachability.ts', 'utf8');
    // COMMENTS ARE STRIPPED BEFORE ANY OF THIS, and that is the third time in this session a
    // scan has been satisfied by a docblock explaining itself. Deleting the settings surface from
    // the rule turned the behavioural test red (correctly — /diagnostic became an orphan) while
    // every `toMatch(/settings/)` stayed green, because the word appears in the comment naming it.
    // A binding assertion that a rename or a reformat, or a well-meaning comment, can satisfy is
    // not a binding assertion.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

    expect(code, 'the shared-surface rule is gone').toMatch(/isNavigationSurface/);
    expect(code, 'the app shell is no longer a shared surface').toMatch(/\+layout/);
    expect(code, 'the settings hub is no longer a shared surface').toMatch(/routes.*settings/);
    expect(code, 'the home menu is no longer a shared surface').toMatch(/\+page/);
    // A route's own page counts for itself and nothing else — the rule that fixed both the false
    // positives (16 reachable routes flagged) and the real one (/knowledge had no nav entry).
    expect(code, 'per-route self-vouch is gone').toMatch(/selfHaystack/);
  });
});

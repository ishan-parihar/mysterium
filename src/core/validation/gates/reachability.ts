import * as fs from 'fs';
import * as path from 'path';
import type { GateResult } from './plumbing.js';

/**
 * Every route must be reachable from something a player can actually click.
 *
 * THE CLASS THIS EXISTS FOR. The app's navigation is THREE independently maintained arrays —
 * `Sidebar.svelte` (11 items), `BottomNav.svelte` (4) and the home page's own lists (16) — and a
 * fourth surface, `/settings`. Four routes were reachable from none of them: `/auditor/guardian`,
 * `/auditor/educator`, `/auditor/therapeutic` (the whole 16 §2.4 consent surface) and `/diagnostic`.
 * They were built, gated, tested, and invisible — a player had to be told the URL by hand. Both the
 * CLI and the test suite passed the entire time, because every one of those surfaces is fully
 * implemented. Nothing was broken; the capability simply had no door.
 *
 * WHY A GATE AND NOT A LINK AUDIT. Four orphans were found by hand and fixed by hand, and the hand
 * step is exactly what does not recur. A fifth route will be added by a future session, will be
 * fully built and fully tested, and will be just as invisible — so the class needs an assertion.
 *
 * WHY A SOURCE SCAN IS THE RIGHT INSTRUMENT. Reachability is an ABSENCE: nothing throws, nothing
 * renders, and the route works perfectly when typed. A runtime test cannot see a page nobody
 * navigates to. So the instrument reads the route tree from disk and the Svelte sources that could
 * link to it — the same module-graph reasoning as G44 (sessionControlStore) and G48 (pod transport).
 *
 * REACHABILITY IS NOT OPENNESS. A link that lands on a consent refusal is a legitimate destination:
 * the player learns a grant is required, and the refusal is pinned by its own behavioural test. What
 * is forbidden is a route with no path to it at all.
 */

/**
 * Deliberately unlinked, with the reason each is still correct.
 *
 * An allowlist must be a decision list, not a suppression list — every entry states why the route is
 * not player-facing, so a reviewer reads a justification rather than a name.
 */
const REACHABILITY_EXEMPT: readonly { readonly route: string; readonly why: string }[] = [
  // `/` is the home page itself. Everything links to it; it links to nowhere by definition.
  { route: '/', why: 'the home page — a root is reachable by construction' },
];

/** Svelte files that can carry a player-visible link. */
const LINK_SOURCES = 'src';

function routeOf(absPage: string, root: string): string {
  const rel = path.relative(root, absPage).replace(/\\/g, '/');
  // `src/routes/play/+page.svelte` → `/play`; `src/routes/+page.svelte` → `/`.
  const without = rel.replace(/^src\/routes/, '').replace(/\/\+page\.svelte$/, '');
  return without === '' ? '/' : without;
}

function walk(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
}

export function validateRoutesReachable(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G57 route reachability', passed: false, hard: true, details: m });

  try {
    const root = process.cwd();
    const routesDir = path.join(root, 'src/routes');
    if (!fs.existsSync(routesDir)) return mk('src/routes not found — the walk is broken, not the tree');

    const pages: string[] = [];
    walk(routesDir, pages);
    const routeFiles = pages.filter((p) => p.endsWith('/+page.svelte'));

    // An empty route list would make every assertion below vacuously true, which is the shape of a
    // gate that cannot fail. Refuse instead.
    if (routeFiles.length === 0) return mk('no +page.svelte found under src/routes — the walk is broken');

    // Every .svelte file is a potential link source: a nav array, a settings list, a card, anything.
    const svelte: string[] = [];
    walk(path.join(root, LINK_SOURCES), svelte);
    const linkFiles = svelte.filter((p) => p.endsWith('.svelte'));

    if (linkFiles.length === 0) return mk('no .svelte files found — nothing can link anywhere');

    // One concatenated haystack, with comments stripped. A link inside a comment is not a link, and
    // the four routes that had this bug each carry a comment explaining it — a naive scan reports
    // all of them as linked and the gate silently passes forever.
    const stripComments = (s: string): string =>
      s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

    const haystack = linkFiles
      .map((f) => stripComments(fs.readFileSync(f, 'utf-8')))
      .join('\n');

    const exempt = new Set(REACHABILITY_EXEMPT.map((e) => e.route));
    const orphans = routeFiles
      .map((f) => routeOf(f, root))
      .filter((route) => !exempt.has(route))
      // `goto('/play')`, `href="/play"`, `href="/play?x"` — a path SEGMENT match, not a substring,
      // so `/play` is not satisfied by a link to `/playlist`.
      .filter((route) => {
        const pattern = new RegExp(`['"\`]${route.replace(/\//g, '\\/')}(\\?[^'"\`]*)?['"\`]`);
        return !pattern.test(haystack);
      });

    if (orphans.length > 0) {
      return mk(
        `${orphans.length} route(s) are reachable from NO link in ${LINK_SOURCES}: ${orphans.join(', ')}. ` +
          `A player cannot get there. Link it, or add it to REACHABILITY_EXEMPT with a reason.`,
      );
    }

    return {
      gate: 'G57 route reachability',
      passed: true,
      hard: true,
      details: `${routeFiles.length} routes on disk, all reachable from a link (${linkFiles.length} .svelte files scanned)`,
    };
  } catch (err) {
    return mk(`threw: ${err instanceof Error ? err.message : String(err)}`);
  }
}

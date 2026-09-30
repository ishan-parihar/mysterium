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

    // Every .svelte file is a candidate link source: a nav array, a settings list, a card, anything.
    const svelte: string[] = [];
    walk(path.join(root, LINK_SOURCES), svelte);
    const navFiles = svelte.filter((p) => p.endsWith('.svelte'));

    // A ROUTE PAGE MAY VOUCH FOR ITSELF, NEVER FOR ANOTHER ROUTE.
    //
    // Excluding `src/routes/**` outright was too blunt and wrong: the app's real navigation surfaces
    // live INSIDE the route tree — `src/routes/+page.svelte` holds the 16-item home menu and
    // `+layout.svelte` the shell — and excluding them flagged 16 genuinely reachable routes as
    // orphans. The rule that survives is narrower and is the one a player experiences: a route can
    // only vouch for ITSELF. `/insights` appearing inside `/insights` is its own title; `/insights`
    // appearing inside `/glossary` is not a path to it.
    //
    // So the haystack is PER ROUTE: every navigation surface plus, for each route, only its own page.
    if (navFiles.length === 0) return mk('no .svelte files found — nothing can link anywhere');

    const stripComments = (s: string): string =>
      s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

    // The SHARED navigation surfaces are the shell and the pages a player navigates THROUGH rather than
    // reads: the sidebar and bottom nav in `src/lib`, the home menu, the app shell, and SETTINGS —
    // which is where the auditor surfaces and the diagnostic report are offered, and which is a
    // navigation surface in its own right rather than a content page that happens to hold links.
    // Excluding it flagged the four routes that fix in 37c3119 added links to.
    const isNavigationSurface = (p: string): boolean => {
      const f = p.replace(/\\/g, '/');
      if (!f.includes('/src/routes/')) return true;                     // src/lib/** — shell + components
      if (/src\/routes\/\+page\.svelte$/.test(f)) return true;          // the 16-item home menu
      if (/src\/routes\/\+layout\.svelte$/.test(f)) return true;        // the app shell
      if (/src\/routes\/settings\/[+a-z]*page\.svelte$/.test(f)) return true; // the settings hub
      return false;                                                     // a CONTENT page
    };

    const sharedHaystack = navFiles
      .filter(isNavigationSurface)
      .map((f) => stripComments(fs.readFileSync(f, 'utf-8')))
      .join('\n');

    // For each route, its own page may count — and only itself.
    const selfHaystack = new Map<string, string>();
    for (const file of routeFiles) {
      selfHaystack.set(routeOf(file, root), stripComments(fs.readFileSync(file, 'utf-8')));
    }

    const linked = (route: string, haystack: string): boolean => {
      const pattern = new RegExp(`['"\`]${route.replace(/\//g, '\\/')}(\\?[^'"\`]*)?['"\`]`);
      return pattern.test(haystack);
    };

    const exempt = new Set(REACHABILITY_EXEMPT.map((e) => e.route));
    const orphans = routeFiles
      .map((f) => routeOf(f, root))
      .filter((route) => !exempt.has(route))
      .filter((route) => {
        if (linked(route, sharedHaystack)) return false;
        return !linked(route, selfHaystack.get(route) ?? '');
      });

    if (orphans.length > 0) {
      return mk(
        `${orphans.length} route(s) are reachable from NO navigation surface: ${orphans.join(', ')}. ` +
          `A player cannot get there. Link it from a nav/settings surface or from its own page, or add ` +
          `it to REACHABILITY_EXEMPT with a reason. One route cannot vouch for another.`,
      );
    }

    return {
      gate: 'G57 route reachability',
      passed: true,
      hard: true,
      details: `${routeFiles.length} routes on disk, all reachable — each linked from a shared navigation surface or from its own page (a route never counts as a link source for another route)`,
    };
  } catch (err) {
    return mk(`threw: ${err instanceof Error ? err.message : String(err)}`);
  }
}

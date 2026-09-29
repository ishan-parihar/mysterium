/**
 * The one place that decides how Mysterium is SERVED.
 *
 * Every `+page.ts` under `src/routes/` re-exports `ssr` and `prerender` from here. They used to be
 * 26 pairs of hand-written literals, which is a value repeated 52 times — and M5 says a value that
 * derives from a decision belongs in one place, because 52 copies is where a decision quietly
 * stops being a decision.
 *
 * WHY PRERENDER IS TRUE. This is the deployment-cost lever. With `prerender = false` on the
 * cloudflare target, EVERY page navigation boots a Worker to return an HTML shell that hydrates
 * client-side anyway — billed invocations to deliver bytes the CDN holds. With `prerender = true`
 * the 26 client-only routes are emitted as static assets and served from the edge, and the only
 * invocations left are the ones that genuinely need computation: `/api/*`. No route carries a
 * `load` function (asserted by G55), so there is nothing for a prerender pass to execute and
 * nothing that can read per-request state at build time.
 *
 * THE `/api/*` HALF IS UNCHANGED. Endpoints under `src/routes/api/` do not read these exports —
 * a `+server.ts` handler runs per request by definition — so metering, KV and the recovery path
 * are untouched. Prerendering changes who serves the HTML, not what the endpoints do.
 *
 * The `static` BUILD_TARGET (Capacitor / offline demo) wanted these values before anyone thought
 * to ask why cloudflare should differ. It was never a separate policy; it was the only policy,
 * applied to one target and forgotten on the other. `deployStatic` exists so a future target that
 * genuinely needs a server can opt back in without editing 26 files.
 */

/** Pre-render the route into a static asset. Page loads then cost no Worker invocation. */
export const prerender = true;

/** Client-rendered. Every surface in this app reads browser storage, so there is no server HTML. */
export const ssr = false;

/**
 * Escape hatch for a target that must serve HTML dynamically. Nothing uses it today; it exists so
 * the decision stays in one file when such a target appears, rather than being re-derived
 * twenty-six times.
 */
export function servingPolicyFor(buildTarget: string): { ssr: boolean; prerender: boolean } {
  return buildTarget === 'server' ? { ssr: true, prerender: false } : { ssr, prerender };
}

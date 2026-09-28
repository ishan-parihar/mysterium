/**
 * Server hooks — runs on every request.
 *
 * The BFF's rate limiting. Every `/api/*` route is metered here, through the ONE shared limiter in
 * `$lib/server/rateLimit` (tiers, rationale, and the fail-closed decision are documented there).
 *
 * What this replaced: a per-IP counter that guarded `/api/llm/*` only, leaving the other seven
 * endpoints unmetered — and `/api/save` is the worst of them, accepting a 256KB write keyed on a
 * client-supplied `deviceId` with no auth. The old store also could not bound its own memory: it
 * swept every 5 minutes but only dropped entries older than 24 h, so a rotating-IP flood grew the
 * Map for a full day. The shared limiter caps by age AND by entry count.
 *
 * FAIL CLOSED (documented in `rateLimit.ts`): if metering itself throws, this answers 429 rather
 * than calling `resolve`. An abuse guard that fails open is not an abuse guard, and the only signal
 * a broken limiter produces while open is the traffic it let through.
 *
 * The store is process-local. On Cloudflare each isolate is long-lived, so the ceiling holds per
 * isolate rather than globally; cross-isolate enforcement needs a Durable Object, which is a
 * deployment decision, not a code path.
 */

import type { Handle } from '@sveltejs/kit';
import {
  checkRequestRateLimit,
  describeWindow,
  type RateLimitHit,
  sharedRateLimiter,
} from '$lib/server/rateLimit.js';

export const handle: Handle = async ({ event, resolve }) => {
  let hit: RateLimitHit | null;
  try {
    hit = checkRequestRateLimit(event, Date.now(), sharedRateLimiter);
  } catch (err) {
    console.error('[rate-limit] metering failed; failing closed', err);
    return new Response(
      JSON.stringify({ error: 'Rate limiter unavailable', detail: 'Request refused. Try again shortly.' }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } },
    );
  }

  if (hit && !hit.decision.allowed) {
    const { policy, decision } = hit;
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        detail:
          `Max ${policy.rule.limit} ${policy.name} requests per ${describeWindow(policy.rule.windowMs)} ` +
          `for this client. Resets in ${decision.retryAfterSec}s.`,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(decision.retryAfterSec),
        },
      },
    );
  }

  return resolve(event);
};

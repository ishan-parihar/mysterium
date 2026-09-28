/**
 * BFF rate limiting — ONE shared, pure, injectable-time limiter for every `/api/*` route.
 *
 * Why this file exists: `hooks.server.ts` metered `/api/llm/*` and nothing else. The other seven
 * BFF endpoints were unmetered, and `/api/save` accepts a 256KB write keyed on a client-supplied
 * `deviceId` with no auth — the single most abusable surface in the app. The old limiter also
 * could not bound its own memory: it swept every 5 minutes, but only entries older than 24 h were
 * dropped, so a rotating-IP flood grows the Map for a full day before anything is evicted. This
 * version caps the store by ENTRY COUNT as well as by age, so the ceiling holds at any window.
 *
 * The design is deliberately three pieces, in this order:
 *
 *  1. `checkRateLimit(store, key, rule, now)` — PURE. The store is a parameter and the clock is a
 *     parameter, so the whole policy decision is testable with a `Map` and a number: no server, no
 *     `Date.now()`, no sleeping. Every rule below is exercised exactly this way in the tests.
 *  2. `createRateLimiter(...)` — the stateful wrapper: the same pure call, plus a bounded sweep.
 *  3. `checkRequestRateLimit(request, now, limiter)` — maps a path to a tier and a key. This is
 *     what `hooks.server.ts` calls once per request, and what the G53 kernel gate drives.
 *
 * FAIL CLOSED. This is an abuse guard, and the failure mode of an abuse guard that fails OPEN is
 * the whole reason it exists: a limiter that throws on a malformed rule and then lets the request
 * through is a limiter that is one bad deploy away from being decoration. So `checkRateLimit`
 * REJECTS a non-finite or non-positive rule by throwing (a programming error, caught nowhere in
 * the limiter), and `hooks.server.ts` catches anything that escapes and answers 429 rather than
 * calling `resolve`. A key logging problem would be reported; an open door would not. M6 permits
 * fail-closed exactly where it is documented, as it is here.
 *
 * Tiers are set by what the endpoint COSTS THE OPERATOR, not by how often the client calls it:
 *
 *   | policy           | routes                    | cost                                   | limit      |
 *   |------------------|---------------------------|----------------------------------------|------------|
 *   | llm              | /api/llm/chat, /api/llm/tools | a real LLM round-trip, billed        | 100 / day  |
 *   | save             | /api/save                 | KV write, up to 256KB, no auth         | 60 / min   |
 *   | agent            | /api/agent/observe,probe  | CPU + an open SSE stream               | 120 / min  |
 *   | telemetry        | /api/telemetry            | Analytics Engine write per event      | 30 / min   |
 *   | recovery-generate| /api/recovery/generate    | SHA-256 + KV write; once per account  | 5 / hour   |
 *   | recovery-restore | /api/recovery/restore     | SHA-256 + KV read, replayable         | 20 / hour  |
 *
 * `agent` and `telemetry` are generous on purpose: a normal session produces a debounced save
 * every few seconds and a telemetry flush every 5 s, so a tight ceiling here would refuse a real
 * player. `/api/save` is the one tier that must hold under abuse rather than under play, and 60
 * writes a minute is 36× the debounced cadence the client actually uses (`cloudSyncStore`, 500 ms
 * quiet-time debounce) while still capping one IP at 5,760 KV writes a day.
 *
 * The FALLBACK policy is the last line of defence, not a tier: a `/api/*` route added tomorrow is
 * metered the moment it exists, before anyone remembers to give it a budget. It is deliberately
 * tight, and G53 requires every route in the tree to carry a DELIBERATE tier — so falling back is
 * visible in the gate, not silent.
 */

/** One minute, in ms. Named so the tier table above reads in the same units as the rules. */
export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** The budget for one key over one window. */
export interface RateLimitRule {
  /** Requests permitted per window. Must be a finite positive number. */
  readonly limit: number;
  /** Window length in ms. Must be a finite positive number. */
  readonly windowMs: number;
}

/** The verdict for one request. `retryAfterSec` is 0 when `allowed`. */
export interface RateLimitDecision {
  readonly allowed: boolean;
  /** Whole seconds until the current window frees a slot; >= 1 when refused. */
  readonly retryAfterSec: number;
  /** Requests still available in this window. 0 once refused. */
  readonly remaining: number;
}

/** One key's window. `windowMs` is stored per entry so a sweep can expire each by its OWN rule. */
export interface RateLimitCounter {
  count: number;
  windowStart: number;
  windowMs: number;
}

export type RateLimitStore = Map<string, RateLimitCounter>;

/** A path→budget table entry. */
export interface RateLimitPolicy {
  /** Bucket name; also the key namespace, so tiers never share a budget. */
  readonly name: string;
  /** Matches this path exactly, or anything under `prefix + '/'` — never a sibling like `/api/telemetry-x`. */
  readonly prefix: string;
  readonly rule: RateLimitRule;
}

/**
 * The subset of SvelteKit's `RequestEvent` the limiter reads. Narrow on purpose: the gate and the
 * tests drive it with a two-field literal instead of constructing a real `RequestEvent`.
 *
 * The IP lives under `request.headers`, NOT on `event.headers` — SvelteKit's `RequestEvent` has
 * no `headers` of its own. Reading `event.headers` typechecked against a narrower interface and
 * then threw a TypeError on every real request, which the fail-closed branch turned into a 429 on
 * all of `/api/*`. G53's behavioural hook check is what found it: a fixture missing `headers` and
 * a genuine defect produced the same 429, so the gate now distinguishes the two.
 */
export interface MeteredRequest {
  readonly url: { readonly pathname: string };
  readonly request: { readonly headers: { get(name: string): string | null } };
}

export interface RateLimitHit {
  readonly policy: RateLimitPolicy;
  readonly decision: RateLimitDecision;
}

export interface RateLimiter {
  check(key: string, rule: RateLimitRule, now: number): RateLimitDecision;
  /** Live entry count — the bounded-memory property, observable so it can be asserted. */
  readonly size: number;
  /** Drop every entry. Test seam; the runtime never calls it. */
  reset(): void;
}


export const RATE_LIMIT_POLICIES: readonly RateLimitPolicy[] = [
  { name: 'llm', prefix: '/api/llm/', rule: { limit: 100, windowMs: DAY_MS } },
  { name: 'recovery-generate', prefix: '/api/recovery/generate', rule: { limit: 5, windowMs: HOUR_MS } },
  { name: 'recovery-restore', prefix: '/api/recovery/restore', rule: { limit: 20, windowMs: HOUR_MS } },
  { name: 'save', prefix: '/api/save', rule: { limit: 60, windowMs: MINUTE_MS } },
  { name: 'agent', prefix: '/api/agent/', rule: { limit: 120, windowMs: MINUTE_MS } },
  { name: 'telemetry', prefix: '/api/telemetry', rule: { limit: 30, windowMs: MINUTE_MS } },
];

/** Applied to any other `/api/*` path. Tight on purpose: it is a backstop, not a budget. */
export const FALLBACK_API_POLICY: RateLimitPolicy = {
  name: 'api-fallback',
  prefix: '/api/',
  rule: { limit: 360, windowMs: 6 * MINUTE_MS },
};

const ALL_POLICIES: readonly RateLimitPolicy[] = [...RATE_LIMIT_POLICIES, FALLBACK_API_POLICY];

/** Every named policy, fallback included — what G53 iterates. */
export function allRateLimitPolicies(): readonly RateLimitPolicy[] {
  return ALL_POLICIES;
}

function isUsableRule(rule: RateLimitRule): boolean {
  return Number.isFinite(rule.limit) && rule.limit > 0 && Number.isFinite(rule.windowMs) && rule.windowMs > 0;
}

function assertUsableRule(rule: RateLimitRule): void {
  if (!isUsableRule(rule)) {
    // Fail CLOSED: an unusable rule is a configuration defect, and a defect in an abuse guard
    // must not become an open door. Throwing here is what makes hooks.server.ts answer 429.
    throw new Error(
      `rate limit rule must be finite and positive, got limit=${rule.limit} windowMs=${rule.windowMs}`,
    );
  }
}

/**
 * Pathname match on a `/` boundary: `prefix` itself, or anything nested under it.
 *
 * The trailing slash is normalised first. A policy prefix like `/api/llm/` already ends in one, and
 * naively appending another produced `/api/llm//`, which matches nothing — every LLM and agent
 * request silently fell through to the fallback budget. Mutation-caught, not review-caught.
 */
function policyCovers(policy: RateLimitPolicy, pathname: string): boolean {
  const base = policy.prefix.endsWith('/') ? policy.prefix.slice(0, -1) : policy.prefix;
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** The tier a pathname is metered under. Never null: a non-`/api/` path is the caller's cue. */
export function policyFor(pathname: string): RateLimitPolicy {
  for (const policy of ALL_POLICIES) {
    if (policyCovers(policy, pathname)) return policy;
  }
  // Unreachable for a path starting with '/api/' (the fallback covers it) and harmless otherwise.
  return FALLBACK_API_POLICY;
}

/** Human-readable window, for the 429 body. */
export function describeWindow(windowMs: number): string {
  if (windowMs % DAY_MS === 0) return `${windowMs / DAY_MS} day(s)`;
  if (windowMs % HOUR_MS === 0) return `${windowMs / HOUR_MS} hour(s)`;
  if (windowMs % MINUTE_MS === 0) return `${windowMs / MINUTE_MS} minute(s)`;
  return `${Math.round(windowMs / 1000)}s`;
}

/**
 * The whole policy decision, as a pure function.
 *
 * `store` and `now` are parameters rather than ambient state, so this is the unit under test: a
 * `Map` and a number in, a verdict out. Counting continues while over the limit (the window must
 * still roll), and a refusal carries the seconds until the window frees a slot.
 */
export function checkRateLimit(
  store: RateLimitStore,
  key: string,
  rule: RateLimitRule,
  now: number,
): RateLimitDecision {
  assertUsableRule(rule);
  if (!Number.isFinite(now)) throw new Error(`rate limit clock must be finite, got ${now}`);

  const existing = store.get(key);
  // A rule change under the same key restarts the window rather than counting against the old one.
  const fresh =
    !existing || existing.windowMs !== rule.windowMs || now - existing.windowStart >= rule.windowMs;
  const entry = fresh ? { count: 0, windowStart: now, windowMs: rule.windowMs } : existing;
  entry.count += 1;
  store.set(key, entry);

  if (entry.count > rule.limit) {
    const resetAt = entry.windowStart + rule.windowMs;
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      remaining: 0,
    };
  }
  return { allowed: true, retryAfterSec: 0, remaining: rule.limit - entry.count };
}

export interface RateLimiterOptions {
  /** Hard ceiling on tracked keys. The store cannot exceed it, whatever the window. */
  readonly maxEntries?: number;
  /** Minimum age before a sweep may run. A sweep is O(entries); the entry-count check is O(1). */
  readonly sweepIntervalMs?: number;
}

const DEFAULT_MAX_ENTRIES = 10_000;
const DEFAULT_SWEEP_INTERVAL_MS = MINUTE_MS;

/**
 * The stateful wrapper around `checkRateLimit`: same verdict, plus a bounded sweep.
 *
 * Bounded by AGE and by COUNT. The age sweep expires each entry against its OWN `windowMs` (not
 * the rule of whichever request happened to trigger it) — expiring a day-long LLM budget because a
 * one-minute telemetry sweep ran would hand an abuser a fresh 100 LLM calls. When a flood of
 * fresh keys outpaces the age sweep, the count ceiling evicts the oldest window starts, which is
 * the one order that cannot starve a live window: the newest key is never evicted.
 */
export function createRateLimiter(options: RateLimiterOptions = {}): RateLimiter {
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const sweepIntervalMs = options.sweepIntervalMs ?? DEFAULT_SWEEP_INTERVAL_MS;
  const store: RateLimitStore = new Map();
  let lastSweep = Number.NEGATIVE_INFINITY;

  function sweep(now: number): void {
    lastSweep = now;
    for (const [key, entry] of store) {
      if (now - entry.windowStart >= entry.windowMs) store.delete(key);
    }
    if (store.size <= maxEntries) return;
    // ponytail: O(n log n) sort on an already-over-cap store, which only runs under flood.
    // Replace with a bucketed-by-minute sweep if the cap is ever raised into the millions.
    const oldestFirst = [...store.entries()].sort((a, b) => a[1].windowStart - b[1].windowStart);
    for (let i = 0; i < oldestFirst.length - maxEntries; i++) {
      store.delete(oldestFirst[i]![0]);
    }
  }

  return {
    check(key, rule, now) {
      if (now - lastSweep >= sweepIntervalMs || store.size > maxEntries) sweep(now);
      const decision = checkRateLimit(store, key, rule, now);
      // Sweep AFTER the insert, or a flood keeps the store one entry over the cap: the pre-insert
      // check sees size === max, declines to sweep, and the insert pushes it to max + 1 forever.
      if (store.size > maxEntries) sweep(now);
      return decision;
    },
    get size() {
      return store.size;
    },
    reset() {
      store.clear();
      lastSweep = Number.NEGATIVE_INFINITY;
    },
  };
}

/** The process-wide limiter `hooks.server.ts` meters every request through. */
export const sharedRateLimiter: RateLimiter = createRateLimiter();

/**
 * Extract the client IP. Cloudflare sets `CF-Connecting-IP`; behind any other proxy the first hop
 * of `X-Forwarded-For` is the client. Both are attacker-reachable, so the key is a floor on abuse,
 * not an identity claim — which is why `/api/save` is tiered for abuse and not for honesty.
 * `unknown` is a real bucket: with no header at all every such client shares one budget, which
 * refuses loudly rather than granting an unlimited one.
 */
export function getClientIP(request: MeteredRequest): string {
  const cfIP = request.request.headers.get('cf-connecting-ip');
  if (cfIP) return cfIP;
  const xff = request.request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'unknown';
}

/** The metered-request surface: the policy for a path and the verdict for the client behind it. */
export function checkRequestRateLimit(
  request: MeteredRequest,
  now: number,
  limiter: RateLimiter = sharedRateLimiter,
): RateLimitHit | null {
  const { pathname } = request.url;
  if (!pathname.startsWith('/api/')) return null;
  const policy = policyFor(pathname);
  // The tier name namespaces the key, so spending the LLM budget cannot starve a telemetry flush.
  const decision = limiter.check(`${policy.name}:${getClientIP(request)}`, policy.rule, now);
  return { policy, decision };
}

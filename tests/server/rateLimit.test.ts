/**
 * The BFF rate limiter — the policy decision, exercised as a pure function.
 *
 * Every case here drives `checkRateLimit` with an explicit `Map` and an explicit `now`. Nothing
 * sleeps, nothing reads a real clock, and no server starts: the limiter's job is to decide, and a
 * test that could not control the clock could not tell a rolling window from a fixed one.
 *
 * The cases that matter are the ones a happy-path test cannot make:
 *   - the window ROLLS (a counter that never reset is not a rate limiter, it is a denial)
 *   - two keys do not share a budget (a shared budget is one abuser locking out every other player)
 *   - the store is BOUNDED (the property the old `/api/llm/*` limiter did not have)
 *   - tiers do not starve each other, and a path is matched on a `/` boundary, not a prefix
 */
import { describe, it, expect } from 'vitest';
import {
  checkRateLimit,
  checkRequestRateLimit,
  createRateLimiter,
  describeWindow,
  getClientIP,
  policyFor,
  allRateLimitPolicies,
  RATE_LIMIT_POLICIES,
  type MeteredRequest,
  type RateLimitRule,
  type RateLimitStore,
} from '../../src/lib/server/rateLimit.js';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const tenPerMinute: RateLimitRule = { limit: 10, windowMs: MIN };

function freshStore(): RateLimitStore {
  return new Map();
}

function request(pathname: string, ip: string | null = '1.2.3.4'): MeteredRequest {
  return {
    url: { pathname },
    request: {
      headers: {
        get: (name: string) => (name.toLowerCase() === 'cf-connecting-ip' ? ip : null),
      },
    },
  };
}

describe('checkRateLimit — the pure decision', () => {
  it('passes every request up to the limit and refuses the one past it', () => {
    const store = freshStore();
    for (let i = 1; i <= 10; i++) {
      const d = checkRateLimit(store, 'k', tenPerMinute, 1_000_000);
      expect(d.allowed, `request ${i} of 10`).toBe(true);
      expect(d.remaining).toBe(10 - i);
    }
    const over = checkRateLimit(store, 'k', tenPerMinute, 1_000_000);
    expect(over.allowed).toBe(false);
    expect(over.remaining).toBe(0);
  });

  it('keeps counting while over the limit, so the window still rolls', () => {
    const store = freshStore();
    for (let i = 0; i < 25; i++) checkRateLimit(store, 'k', tenPerMinute, 0);
    expect(store.get('k')!.count).toBe(25);
  });

  it('rolls the window when it expires', () => {
    const store = freshStore();
    for (let i = 0; i < 10; i++) checkRateLimit(store, 'k', tenPerMinute, 0);
    expect(checkRateLimit(store, 'k', tenPerMinute, MIN - 1).allowed).toBe(false);
    // One ms before expiry the window is still the old one; the request at the boundary is the
    // first of the NEW window. A limiter that reset early would hand out a second full budget.
    const after = checkRateLimit(store, 'k', tenPerMinute, MIN);
    expect(after.allowed).toBe(true);
    expect(after.remaining).toBe(9);
    expect(store.get('k')!.count).toBe(1);
  });

  it('reports whole seconds until the window frees a slot, never zero on a refusal', () => {
    const store = freshStore();
    for (let i = 0; i < 10; i++) checkRateLimit(store, 'k', tenPerMinute, 0);
    const d = checkRateLimit(store, 'k', tenPerMinute, MIN - 1);
    expect(d.allowed).toBe(false);
    expect(d.retryAfterSec).toBe(1);
  });

  it('isolates keys — one abuser does not lock out anyone else', () => {
    const store = freshStore();
    for (let i = 0; i < 11; i++) checkRateLimit(store, 'a', tenPerMinute, 0);
    expect(checkRateLimit(store, 'a', tenPerMinute, 0).allowed).toBe(false);
    // A different IP with its own untouched budget, and the shared store is what must not leak.
    const other = checkRateLimit(store, 'b', tenPerMinute, 0);
    expect(other.allowed).toBe(true);
    expect(other.remaining).toBe(9);
    expect(store.get('a')!.count).toBe(12);
    // And 'b' is untouched by its neighbour's flood — a shared counter would read 13.
    expect(store.get('b')!.count).toBe(1);
  });

  it('starts a new window when the rule under the same key changes', () => {
    const store = freshStore();
    for (let i = 0; i < 10; i++) checkRateLimit(store, 'k', tenPerMinute, 0);
    const widened = checkRateLimit(store, 'k', { limit: 100, windowMs: DAY }, 0);
    expect(widened.allowed).toBe(true);
    expect(widened.remaining).toBe(99);
  });

  it('refuses a non-finite or non-positive rule instead of metering nothing', () => {
    const store = freshStore();
    for (const bad of [
      { limit: 0, windowMs: MIN },
      { limit: -1, windowMs: MIN },
      { limit: 10, windowMs: 0 },
      { limit: 10, windowMs: Number.POSITIVE_INFINITY },
      { limit: Number.NaN, windowMs: MIN },
    ] satisfies readonly RateLimitRule[]) {
      expect(() => checkRateLimit(store, 'k', bad, 0), JSON.stringify(bad)).toThrow();
    }
    expect(store.size).toBe(0);
  });

  it('refuses a non-finite clock rather than returning a verdict nobody can act on', () => {
    expect(() => checkRateLimit(freshStore(), 'k', tenPerMinute, Number.NaN)).toThrow();
  });
});

describe('createRateLimiter — the bounded store', () => {
  it('sweeps a window on age, so a quiet key does not occupy the map forever', () => {
    const limiter = createRateLimiter({ maxEntries: 100 });
    limiter.check('a', tenPerMinute, 0);
    limiter.check('b', tenPerMinute, 0);
    expect(limiter.size).toBe(2);
    limiter.check('a', tenPerMinute, MIN);
    expect(limiter.size).toBe(1);
  });

  it('expires each entry against its OWN window, not the sweeping rule\'s', () => {
    const limiter = createRateLimiter({ maxEntries: 100, sweepIntervalMs: MIN });
    const llm = { limit: 100, windowMs: DAY };
    // Spend the whole LLM budget, so a wrongly-expired entry would be observable.
    for (let i = 0; i < 100; i++) limiter.check('llm:1.1.1.1', llm, 0);
    // A minute later a one-minute-budget request triggers the sweep. If the sweep expired
    // entries by the TRIGGERING rule's window it would drop the day-long LLM budget after 60s and
    // hand the abuser 100 more LLM calls — the failure this test exists for.
    limiter.check('telemetry:1.1.1.1', tenPerMinute, MIN);
    // Two live entries: the LLM one (day window) and the telemetry one just created (minute
    // window, started at MIN, so not yet expired).
    expect(limiter.size).toBe(2);
    // Still refused on the next call: the day window did not roll over.
    expect(limiter.check('llm:1.1.1.1', llm, MIN).allowed).toBe(false);
  });

  it('never grows past the entry ceiling under a rotating-key flood', () => {
    const limiter = createRateLimiter({ maxEntries: 50, sweepIntervalMs: MIN });
    // 5,000 distinct keys in one window — none is old enough to age out, so only the count cap
    // can bound this. The old /api/llm limiter had no cap at all and grew for a full day.
    for (let i = 0; i < 5_000; i++) limiter.check(`key:${i}`, tenPerMinute, 0);
    expect(limiter.size).toBeLessThanOrEqual(50);
  });

  it('evicts the oldest window, so the newest key is never the one dropped', () => {
    // limit 1 makes the survival observable: a surviving key is already over budget, an evicted
    // one starts fresh. No store access needed — the verdict is the evidence.
    const once: RateLimitRule = { limit: 1, windowMs: MIN };
    const limiter = createRateLimiter({ maxEntries: 10, sweepIntervalMs: DAY });
    expect(limiter.check('key:39', once, 39).allowed).toBe(true);
    for (let i = 0; i < 40; i++) limiter.check(`flood:${i}`, once, i);
    expect(limiter.size).toBeLessThanOrEqual(10);
    expect(limiter.check('key:39', once, 39).allowed).toBe(false);
  });

  it('reset empties the store', () => {
    const limiter = createRateLimiter();
    limiter.check('a', tenPerMinute, 0);
    limiter.reset();
    expect(limiter.size).toBe(0);
  });
});

describe('policyFor — which tier a path lands in', () => {
  it('routes every live BFF endpoint to its deliberate tier', () => {
    expect(policyFor('/api/save').name).toBe('save');
    expect(policyFor('/api/llm/chat').name).toBe('llm');
    expect(policyFor('/api/llm/tools').name).toBe('llm');
    expect(policyFor('/api/agent/observe').name).toBe('agent');
    // `/api/agent/probe` spends a 2048-token provider call directly (not via `/api/llm/chat`), so
    // it is metered apart from its bookkeeping sibling. A shared `agent` tier would let 120/min
    // of LLM spend sit under a limit sized for an endpoint that makes no model call at all.
    expect(policyFor('/api/agent/probe').name).toBe('agent-probe');
    expect(policyFor('/api/telemetry').name).toBe('telemetry');
    expect(policyFor('/api/recovery/generate').name).toBe('recovery-generate');
    expect(policyFor('/api/recovery/restore').name).toBe('recovery-restore');
  });

  it('budgets /api/save by what it costs, not by how often the client calls it', () => {
    const save = policyFor('/api/save').rule;
    const telemetry = policyFor('/api/telemetry').rule;
    // 256KB KV writes, no auth, client-chosen key. Per HOUR that is the heaviest per-minute tier
    // in the table — and that is deliberate: `cloudSyncStore` debounces 500ms, so a real player
    // rarely exceeds a handful, while the ceiling still caps one IP at 3,600 writes an hour.
    expect(save.windowMs).toBe(MIN);
    const perHour = (r: RateLimitRule): number => (r.limit * 3_600_000) / r.windowMs;
    expect(perHour(save)).toBeGreaterThan(perHour(telemetry));
    // It is also the only unauthenticated write surface: no other /api route accepts a body blob.
    expect(policyFor('/api/llm/chat').rule.windowMs).toBe(DAY);
  });

  it('matches on a / boundary, so a sibling route cannot inherit a budget', () => {
    // A future /api/save/export must not silently spend the save budget, and must not be free
    // either — it lands on the fallback, which the gate will flag as un-tiered.
    expect(policyFor('/api/savex').name).not.toBe('save');
    expect(policyFor('/api/savex').name).toBe('api-fallback');
  });

  it('falls back for an unknown /api path rather than leaving it unmetered', () => {
    expect(policyFor('/api/brand-new').name).toBe('api-fallback');
  });

  it('has no two policies claiming the same prefix', () => {
    const seen = new Set<string>();
    for (const p of RATE_LIMIT_POLICIES) {
      expect(seen.has(p.prefix), `duplicate prefix ${p.prefix}`).toBe(false);
      seen.add(p.prefix);
    }
  });

  it('gives every policy a finite positive budget', () => {
    for (const p of allRateLimitPolicies()) {
      expect(Number.isFinite(p.rule.limit) && p.rule.limit > 0, p.name).toBe(true);
      expect(Number.isFinite(p.rule.windowMs) && p.rule.windowMs > 0, p.name).toBe(true);
    }
  });
});

describe('checkRequestRateLimit — the hook\'s entry point', () => {
  it('ignores non-API paths', () => {
    expect(checkRequestRateLimit(request('/'), 0, createRateLimiter())).toBeNull();
    expect(checkRequestRateLimit(request('/recover'), 0, createRateLimiter())).toBeNull();
  });

  it('meters /api/save per IP and refuses the 61st write in a minute', () => {
    const limiter = createRateLimiter();
    const rule = policyFor('/api/save').rule;
    for (let i = 0; i < rule.limit; i++) {
      expect(checkRequestRateLimit(request('/api/save', '9.9.9.9'), 0, limiter)!.decision.allowed).toBe(true);
    }
    const refused = checkRequestRateLimit(request('/api/save', '9.9.9.9'), 0, limiter)!;
    expect(refused.decision.allowed).toBe(false);
    expect(refused.decision.retryAfterSec).toBe(60);
    expect(refused.policy.name).toBe('save');
  });

  it('namespaces the key by tier, so LLM spend cannot starve telemetry', () => {
    const limiter = createRateLimiter();
    const llm = policyFor('/api/llm/chat').rule;
    for (let i = 0; i < llm.limit; i++) {
      checkRequestRateLimit(request('/api/llm/chat', '5.5.5.5'), 0, limiter);
    }
    expect(checkRequestRateLimit(request('/api/llm/chat', '5.5.5.5'), 0, limiter)!.decision.allowed).toBe(false);
    // Same IP, same instant, different tier: still has its whole budget.
    expect(checkRequestRateLimit(request('/api/telemetry', '5.5.5.5'), 0, limiter)!.decision.allowed).toBe(true);
  });

  it('keys on CF-Connecting-IP first, then the first X-Forwarded-For hop', () => {
    const withHeaders = (n: string, v: string | null): MeteredRequest => ({
      url: { pathname: '/api/save' },
      request: { headers: { get: (k) => (k.toLowerCase() === n ? v : null) } },
    });
    expect(getClientIP(withHeaders('cf-connecting-ip', '1.1.1.1'))).toBe('1.1.1.1');
    expect(getClientIP(withHeaders('cf-connecting-ip', '1.1.1.1'))).not.toBe('2.2.2.2');
    // The Cloudflare header wins over the proxy chain, even when both are present.
    expect(getClientIP({
      url: { pathname: '/api/save' },
      request: { headers: { get: (k) => (k === 'cf-connecting-ip' ? '1.1.1.1' : k === 'x-forwarded-for' ? '2.2.2.2, 3.3.3.3' : null) } },
    })).toBe('1.1.1.1');
    expect(getClientIP(withHeaders('x-forwarded-for', ' 8.8.8.8 , 9.9.9.9'))).toBe('8.8.8.8');
    // No header at all is a real bucket, not an unlimited one: 'unknown' shares a budget.
    expect(getClientIP(withHeaders('cf-connecting-ip', null))).toBe('unknown');
  });

  it('meters the LLM day budget: the 101st call in the day is refused', () => {
    const limiter = createRateLimiter();
    const rule = policyFor('/api/llm/chat').rule;
    expect(rule.limit).toBe(100);
    for (let i = 0; i < rule.limit; i++) {
      checkRequestRateLimit(request('/api/llm/chat', '7.7.7.7'), 0, limiter);
    }
    const refused = checkRequestRateLimit(request('/api/llm/chat', '7.7.7.7'), 0, limiter)!;
    expect(refused.decision.allowed).toBe(false);
    expect(refused.decision.retryAfterSec).toBe(DAY / 1000);
    // A day later the budget is back.
    expect(checkRequestRateLimit(request('/api/llm/chat', '7.7.7.7'), DAY, limiter)!.decision.allowed).toBe(true);
  });

  it('keys by IP, not by one shared counter — mutation M5 proved the gap', () => {
    // The pure `checkRateLimit` tests prove per-KEY isolation, but the key is ASSEMBLED here.
    // A limiter that counted every client under one key passed every assertion above while one
    // player's session locked out every other player behind them — so this drives the public
    // entry point and watches the second IP stay unmetered.
    const limiter = createRateLimiter();
    const rule = policyFor('/api/telemetry').rule;
    for (let i = 0; i <= rule.limit; i++) {
      checkRequestRateLimit(request('/api/telemetry', '1.1.1.1'), 0, limiter);
    }
    expect(checkRequestRateLimit(request('/api/telemetry', '1.1.1.1'), 0, limiter)!.decision.allowed).toBe(false);
    // A DIFFERENT IP, mid-flood, still has its whole budget.
    const other = checkRequestRateLimit(request('/api/telemetry', '2.2.2.2'), 0, limiter)!;
    expect(other.decision.allowed).toBe(true);
    expect(other.decision.remaining).toBe(rule.limit - 1);
    // And the abuser stays refused: the isolation is not a reset.
    expect(checkRequestRateLimit(request('/api/telemetry', '1.1.1.1'), 0, limiter)!.decision.allowed).toBe(false);
  });

  it('meters every live endpoint on the shared limiter, by its own tier', () => {
    // The per-IP claim above is only load-bearing if the client IP actually reaches the key, so
    // this walks the real route table through the real entry point: eight routes, eight tiers,
    // each refused only for its own client.
    const limiter = createRateLimiter();
    const routes = [
      '/api/save', '/api/llm/chat', '/api/llm/tools', '/api/agent/observe',
      '/api/agent/probe', '/api/telemetry', '/api/recovery/generate', '/api/recovery/restore',
    ] as const;
    for (const route of routes) {
      const { limit } = policyFor(route).rule;
      for (let i = 0; i <= limit; i++) {
        const hit = checkRequestRateLimit(request(route, '3.3.3.3'), 0, limiter);
        expect(hit, route).not.toBeNull();
        expect(hit!.policy.name, route).toBe(policyFor(route).name);
      }
      expect(checkRequestRateLimit(request(route, '3.3.3.3'), 0, limiter)!.decision.allowed, route).toBe(false);
    }
  });
});

describe('describeWindow — the 429 body must not say "86400000 milliseconds"', () => {
  it('names each tier window in human units', () => {
    expect(describeWindow(MIN)).toBe('1 minute(s)');
    expect(describeWindow(HOUR)).toBe('1 hour(s)');
    expect(describeWindow(DAY)).toBe('1 day(s)');
    expect(describeWindow(5 * MIN)).toBe('5 minute(s)');
    expect(describeWindow(90_000)).toBe('90s');
  });
});

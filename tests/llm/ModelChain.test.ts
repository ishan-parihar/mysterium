/**
 * The model chain: what it must and must not do.
 *
 * DAMP, not DRY (AGENTS M7) — one fake `fetch` per case, inlined, because a shared helper here
 * would be the untested logic the rule warns about. Every test drives the REAL `_lib` fetch path.
 *
 * The load-bearing cases are the NEGATIVE ones. A chain that falls through on a 400 looks helpful
 * and is not: a 400 is that model's own malformed request, and the next model rejects it the same
 * way, so the chain multiplies latency and hides a real bug. A 401 is the KEY, not the model.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { env } from '$env/dynamic/private';

const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  env.LLM_API_KEY = undefined;
  env.LLM_BASE_URL = undefined;
  env.LLM_MODEL = undefined;
  env.LLM_MODEL_CHAIN = undefined;
  env.LLM_PROVIDER = undefined;
  vi.restoreAllMocks();
});

/** A provider that fails every model except the one named in `okModel`. */
function fakeProvider(opts: { statuses: Record<string, number>; okModel: string }): {
  calls: string[];
} {
  const calls: string[] = [];
  globalThis.fetch = vi.fn(async (_url: unknown, init: unknown) => {
    const body = JSON.parse((init as RequestInit).body as string) as { model: string };
    calls.push(body.model);
    const status = opts.statuses[body.model] ?? 200;
    if (status !== 200) {
      return new Response(`upstream said ${status}`, { status });
    }
    return new Response(
      JSON.stringify({
        data: { choices: [{ message: { content: `from ${body.model}` } }] },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as unknown as typeof fetch;
  return { calls };
}

async function callProxy(): Promise<Response> {
  const { proxyChatCompletion } = await import('../../src/routes/api/llm/_lib.js');
  return proxyChatCompletion({
    messages: [{ role: 'user', content: 'hello' }],
  });
}

describe('the model chain', () => {
  it('uses the first model when it answers — the chain must not add a call on the happy path', async () => {
    env.LLM_API_KEY = 'sk-test';
    env.LLM_BASE_URL = 'https://example.test/v1';
    env.LLM_PROVIDER = 'openai';
    env.LLM_MODEL = 'first-model';
    env.LLM_MODEL_CHAIN = 'first-model,second-model,third-model';
    const { calls } = fakeProvider({ statuses: {}, okModel: 'first-model' });

    const res = await callProxy();
    expect(res.status).toBe(200);
    expect(calls).toEqual(['first-model']);
  });

  it('falls through to the next model on a 429, and the later model answers', async () => {
    env.LLM_API_KEY = 'sk-test';
    env.LLM_BASE_URL = 'https://example.test/v1';
    env.LLM_PROVIDER = 'openai';
    env.LLM_MODEL = 'first-model';
    env.LLM_MODEL_CHAIN = 'first-model,second-model';
    const { calls } = fakeProvider({ statuses: { 'first-model': 429 }, okModel: 'second-model' });

    const res = await callProxy();
    expect(res.status).toBe(200);
    // The ORDER is the claim: model 2 is attempted only because model 1 failed.
    expect(calls).toEqual(['first-model', 'second-model']);
    await expect(res.json()).resolves.toMatchObject({
      data: { choices: [{ message: { content: 'from second-model' } }] },
    });
  });

  it('falls through on a 5xx — an upstream outage is the chain’s whole purpose', async () => {
    env.LLM_API_KEY = 'sk-test';
    env.LLM_BASE_URL = 'https://example.test/v1';
    env.LLM_PROVIDER = 'openai';
    env.LLM_MODEL = 'first-model';
    env.LLM_MODEL_CHAIN = 'first-model,second-model';
    const { calls } = fakeProvider({ statuses: { 'first-model': 503 }, okModel: 'second-model' });

    expect((await callProxy()).status).toBe(200);
    expect(calls).toEqual(['first-model', 'second-model']);
  });

  it('does NOT fall through on a 400 — that is this model’s own bad request', async () => {
    env.LLM_API_KEY = 'sk-test';
    env.LLM_BASE_URL = 'https://example.test/v1';
    env.LLM_PROVIDER = 'openai';
    env.LLM_MODEL = 'first-model';
    env.LLM_MODEL_CHAIN = 'first-model,second-model';
    const { calls } = fakeProvider({ statuses: { 'first-model': 400 }, okModel: 'second-model' });

    const res = await callProxy();
    // One call, not two. A chain that retried here would triple latency and hide the real bug.
    expect(calls).toEqual(['first-model']);
    expect(res.status).toBe(400);
  });

  it('does NOT walk the chain on a 401 — that is the key, and every model shares it', async () => {
    env.LLM_API_KEY = 'sk-test';
    env.LLM_BASE_URL = 'https://example.test/v1';
    env.LLM_PROVIDER = 'openai';
    env.LLM_MODEL = 'first-model';
    env.LLM_MODEL_CHAIN = 'first-model,second-model,third-model';
    const { calls } = fakeProvider({ statuses: { 'first-model': 401, 'second-model': 401, 'third-model': 401 }, okModel: '' });

    const res = await callProxy();
    expect(calls).toEqual(['first-model']);
    expect(res.status).toBe(401);
  });

  it('surfaces the LAST upstream status when the whole chain is exhausted, not a synthesised error', async () => {
    env.LLM_API_KEY = 'sk-test';
    env.LLM_BASE_URL = 'https://example.test/v1';
    env.LLM_PROVIDER = 'openai';
    env.LLM_MODEL = 'first-model';
    env.LLM_MODEL_CHAIN = 'first-model,second-model';
    const { calls } = fakeProvider({ statuses: { 'first-model': 429, 'second-model': 503 }, okModel: '' });

    const res = await callProxy();
    expect(calls).toEqual(['first-model', 'second-model']);
    // The LAST thing upstream actually said (503 from the final model), not a synthetic 500 and
    // not the FIRST failure. Both of those would misreport the cause: a 500 hides a rate limit
    // behind an opaque server error, and a 429 would blame a model that is no longer the one that
    // failed.
    expect(res.status).toBe(503);
  });

  it('falls back to the single LLM_MODEL when no chain is configured', async () => {
    env.LLM_API_KEY = 'sk-test';
    env.LLM_BASE_URL = 'https://example.test/v1';
    env.LLM_PROVIDER = 'openai';
    env.LLM_MODEL = 'only-model';
    env.LLM_MODEL_CHAIN = undefined;
    const { calls } = fakeProvider({ statuses: {}, okModel: 'only-model' });

    expect((await callProxy()).status).toBe(200);
    expect(calls).toEqual(['only-model']);
  });

  it('ignores blank entries — a trailing comma must not become an empty model call', async () => {
    env.LLM_API_KEY = 'sk-test';
    env.LLM_BASE_URL = 'https://example.test/v1';
    env.LLM_PROVIDER = 'openai';
    env.LLM_MODEL = 'first-model';
    env.LLM_MODEL_CHAIN = ' first-model , , second-model , ';
    const { calls } = fakeProvider({ statuses: { 'first-model': 429 }, okModel: 'second-model' });

    expect((await callProxy()).status).toBe(200);
    expect(calls).toEqual(['first-model', 'second-model']);
  });
});

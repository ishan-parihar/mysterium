/**
 * Server-side LLM proxy helper.
 *
 * Used by the LLM API route handlers (chat, tools).
 *
 * CRITICAL SECURITY: This file reads LLM_API_KEY from server-only env.
 * The key NEVER reaches the client bundle. The client calls the LLM
 * API endpoints and this helper forwards to the actual provider.
 *
 * VeilFilter runs server-side (input AND output) so its rules can be
 * updated without redeploying the client.
 *
 * AUDIT v1 (HARDCODE-AUDIT, step 3): added streaming mode. The proxy
 * now supports two response modes selected by the request Accept header:
 *   - default application/json (or wildcard star-slash-star): full
 *     buffered Response with JSON body, VeilFilter applied to the
 *     full output (legacy).
 *   - text/event-stream: Server-Sent Events stream of LLM deltas.
 *     VeilFilter runs at END of stream on the concatenated output to
 *     produce a final veiled frame. We intentionally do NOT run
 *     VeilFilter per-chunk. The codebase has no incremental VeilFilter.
 *     Mid-stream chunks may briefly show un-veiled text but those
 *     tokens do not get persisted; only the finalised veiled text is
 *     kept.
 */

import { filterInput, filterOutput } from '$shared/llm/VeilFilter.js';
import { env } from '$env/dynamic/private';

import { InfraConfig } from '$core/config/InfraConfig.js';
import { serverNoLlmEnabled } from '$lib/config/noLlm.js';
const LLM_TIMEOUT_MS = InfraConfig.LLM_TIMEOUT_MS;

export interface LLMProviderConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly model: string;
  readonly protocol: 'openai' | 'anthropic';
  readonly authStyle?: 'bearer' | 'x-api-key';
  readonly providerName: string;
}

/**
 * Resolve the active LLM config from server-side env vars.
 * Returns null if the LLM is not configured (dev without key, or
 * production with LLM disabled).
 *
 * Resolution order (matches ProviderRegistry.resolveLLMConfig):
 *   1. Generic LLM_* env vars (LLM_PROVIDER / LLM_BASE_URL / LLM_API_KEY / LLM_MODEL)
 *   2. Provider-specific shortcuts: OPENAI_API_KEY / ANTHROPIC_API_KEY
 *   3. Legacy VITE_LLM_* env vars (backwards compat with prior `.env`
 *      layouts which named the variables with the SvelteKit
 *      client-exposed prefix). This is intentional: even though
 *      VITE_-prefixed values are normally inlined into the client
 *      bundle, SvelteKit still surfaces them at build-time to
 *      `$env/dynamic/private` when the prefix is hard-coded in
 *      the source file (NOT exposed to `$env/static/private`). We
 *      read them as a fallback to make local `.env` migration
 *      friction-free — see ProviderRegistry.ts:235 for the same
 *      documented convention. The keys stay server-side whether
 *      by prefix or not; clients never read them.
 *   4. Sk-placeholder is treated as "not configured" so a stub
 *      `.env` doesn't accidentally proxy a fake call.
 *
 * ASK ONE QUESTION, DON'T RE-DECIDE. This function used to read only `LLM_API_KEY`, so a deploy
 * that set `VITE_LLM_REQUIRED=0` — the operator's explicit "serve the corpus, spend nothing"
 * signal — still reached a provider on every call, because only the browser consulted the
 * resolver. It now asks `serverNoLlmEnabled`, which is NARROWER than the browser's `noLlmEnabled`
 * on purpose: it answers only the explicit instruction. The first attempt called the browser
 * resolver here, and that was a worse bug than the one it fixed — the browser resolver detects
 * from a client-visible key, a server has none, so it returned true for every deploy and turned
 * a PAID deploy into a silent corpus-only one. The server's own key check is the authority on
 * whether a key exists; this function only carries the operator's veto over it.
 */
export function resolveServerLLMConfig(): LLMProviderConfig | null {
  if (serverNoLlmEnabled(env)) return null;
  const apiKey =
    env.LLM_API_KEY ||
    env.OPENAI_API_KEY ||
    env.ANTHROPIC_API_KEY ||
    env.VITE_LLM_API_KEY || // legacy fallback
    '';
  if (!apiKey || apiKey === 'sk-placeholder') return null;

  const provider = (env.LLM_PROVIDER || env.VITE_LLM_PROVIDER || '').toLowerCase();
  const baseUrl =
    env.LLM_BASE_URL ||
    env.VITE_LLM_BASE_URL || // legacy fallback
    (provider === 'anthropic' || env.ANTHROPIC_API_KEY
      ? 'https://api.anthropic.com/v1'
      : 'https://api.openai.com/v1');
  const model =
    env.LLM_MODEL ||
    env.VITE_LLM_MODEL || // legacy fallback
    env.MODEL || // user's spec from the opencode provider profile
    (provider === 'anthropic' || env.ANTHROPIC_API_KEY
      ? 'claude-3-5-sonnet-20241022'
      : 'gpt-4o-mini');
  const protocol: 'openai' | 'anthropic' =
    provider === 'anthropic' || baseUrl.includes('anthropic.com') || (baseUrl ?? '').includes('anthropic')
      ? 'anthropic'
      : 'openai';
  const authStyle: 'bearer' | 'x-api-key' =
    protocol === 'anthropic' ? 'x-api-key' : 'bearer';

  return {
    baseUrl,
    apiKey,
    model,
    protocol,
    authStyle,
    providerName: provider || (protocol === 'anthropic' ? 'anthropic' : 'openai'),
  };
}

/** Fetch with AbortController timeout to prevent hangs. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = LLM_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function buildHeaders(config: LLMProviderConfig): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.authStyle === 'x-api-key') {
    headers['x-api-key'] = config.apiKey;
    if (config.protocol === 'anthropic') headers['anthropic-version'] = '2023-06-01';
  } else {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }
  return headers;
}

/** Log Veil violations for telemetry (server-side only). */
function logVeilViolation(source: string, violations: readonly string[]): void {
  if (violations.length === 0) return;
  console.warn(`[VeilFilter:server] ${source}: ${violations.length} violation(s): ${violations.join(', ')}`);
}

/**
 * Proxy a chat completion request to the configured LLM provider.
 * Applies VeilFilter to input (system + user messages) and output.
 *
 * Returns the provider's response (OpenAI or Anthropic format),
 * with Veil-filtered content.
 */
/**
 * The model chain: a comma-separated `LLM_MODEL_CHAIN`, tried in order.
 *
 * A PROVIDER IS NOT A CHAIN. One `LLM_MODEL` string means one model, and when it is rate-limited
 * or gone the only recovery is the corpus — a total content downgrade for a transient upstream
 * fault. LoI runs the same shape (`MODEL_CHAIN` in `src/lib/server/agent/models.ts`, three free
 * models, ordered by budget) and that ordering is the point: the cheapest sufficient model goes
 * first, so a fallback is a smaller bill rather than a bigger one.
 *
 * `LLM_MODEL` still wins when the chain is unset, so a deploy that has never heard of this keeps
 * working. `resolveServerLLMConfig` is deliberately UNCHANGED and still returns a single config:
 * the chain is a property of the FETCH, not of the resolution, so no caller learns about it and
 * the existing contract is exactly as before.
 */
export function modelChain(config: LLMProviderConfig): readonly string[] {
  const chain = (env.LLM_MODEL_CHAIN || '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  return chain.length > 0 ? chain : [config.model];
}

/**
 * POST to the provider, walking the chain until one model answers.
 *
 * A model is dropped on a 429 or a 5xx ONLY. A 400 is that model's own malformed request and the
 * next model would reject it identically, so falling through would multiply latency and hide a
 * real bug behind a chain that "tried three models". A 401/403 is the KEY, not the model, and is
 * returned immediately — walking the chain on a bad credential turns one clear failure into N
 * confusing ones.
 *
 * ON EXHAUSTION THE LAST UPSTREAM RESPONSE IS RETURNED, not thrown. This is why the exhausted
 * case is not a 500: a caller that receives a real `Response` passes its status straight through,
 * so a chain-wide rate limit reads as a 429 to whatever handles it. Throwing here was the first
 * implementation and the test caught it — a synthetic `Error` reached the caller's catch and every
 * upstream status collapsed into one opaque 500, which is precisely the loss of information a
 * chain exists to prevent.
 *
 * A TRANSPORT FAILURE IS TRACKED SEPARATELY, because `lastResponse = undefined` on a timeout
 * DISCARDS the status the previous model already gave. For a chain of [429, timeout] that turned a
 * concrete rate limit into a synthetic "all models failed at the transport level" — the one status
 * the caller could have acted on was the one thrown away. So the response and the transport
 * failure are separate facts: a real response is returned whenever one exists, and the throw is
 * reserved for a chain where NO model ever answered with a status at all.
 */
async function fetchThroughChain(
  config: LLMProviderConfig,
  buildBody: (model: string) => unknown,
): Promise<Response> {
  const models = modelChain(config);
  let lastResponse: Response | undefined;
  let sawTransportFailure = false;
  for (const model of models) {
    let res: Response;
    try {
      res = await fetchWithTimeout(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: buildHeaders(config),
        body: JSON.stringify(buildBody(model)),
      });
    } catch {
      // A timeout is upstream's problem for THAT model; try the next one. `lastResponse` is left
      // ALONE — a status an earlier model already returned is still the best thing to report.
      sawTransportFailure = true;
      continue;
    }
    if (res.ok || (res.status !== 429 && res.status < 500)) return res;
    lastResponse = res;
    console.warn(`[llm] model ${model} returned ${res.status}; trying the next in the chain`);
  }
  if (lastResponse) return lastResponse;
  throw new Error(
    sawTransportFailure
      ? `All ${models.length} model(s) in the chain failed at the transport level`
      : `The LLM model chain is empty`,
  );
}

export async function proxyChatCompletion(
  body: {
    readonly messages: readonly { role: string; content: string }[];
    readonly system?: string;
    readonly temperature?: number;
    readonly maxTokens?: number;
    readonly tools?: readonly unknown[];
  },
): Promise<Response> {
  const config = resolveServerLLMConfig();
  if (!config) {
    return new Response(
      JSON.stringify({ error: 'LLM not configured server-side' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Apply VeilFilter to input.
  const veiledSystem = body.system ? filterInput(body.system) : undefined;
  const veiledMessages = body.messages.map((m) => ({
    ...m,
    content: filterInput(m.content),
  }));

  try {
    let res: Response;
    if (config.protocol === 'anthropic') {
      const anthropicBody: Record<string, unknown> = {
        model: config.model,
        system: veiledSystem ?? '',
        messages: veiledMessages.filter((m) => m.role !== 'system'),
        temperature: body.temperature ?? 0.7,
        max_tokens: body.maxTokens ?? 4096,
      };
      if (body.tools && body.tools.length > 0) {
        anthropicBody.tools = body.tools.map((t: any) => ({
          name: t.function?.name ?? t.name,
          description: t.function?.description ?? t.description ?? '',
          input_schema: t.function?.parameters ?? t.parameters ?? { type: 'object', properties: {} },
        }));
      }
      res = await fetchWithTimeout(`${config.baseUrl}/messages`, {
        method: 'POST',
        headers: buildHeaders(config),
        body: JSON.stringify(anthropicBody),
      });
    } else {
      const openaiBody: Record<string, unknown> = {
        model: config.model,
        messages: veiledSystem
          ? [{ role: 'system', content: veiledSystem }, ...veiledMessages]
          : veiledMessages,
        temperature: body.temperature ?? 0.7,
      };
      if (body.maxTokens) openaiBody.max_tokens = body.maxTokens;
      if (body.tools && body.tools.length > 0) openaiBody.tools = body.tools;
      res = await fetchThroughChain(config, (model) => ({ ...openaiBody, model }));
    }

    if (!res.ok) {
      const errText = await res.text();
      return new Response(
        JSON.stringify({ error: `LLM provider error: ${res.status}`, detail: errText }),
        { status: res.status, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const data = await res.json() as any;

    // Apply VeilFilter to output content.
    if (config.protocol === 'anthropic') {
      const textBlock = data.content?.find((b: any) => b.type === 'text');
      if (textBlock?.text) {
        const r = filterOutput(textBlock.text);
        logVeilViolation('proxyChatCompletion.anthropic', r.violations);
        textBlock.text = r.filtered;
      }
      if (data.content) {
        const toolBlocks = data.content.filter((b: any) => b.type === 'tool_use');
        if (toolBlocks.length > 0) {
          return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    } else {
      const choice = data.choices?.[0]?.message;
      if (choice?.content) {
        const r = filterOutput(choice.content);
        logVeilViolation('proxyChatCompletion.openai', r.violations);
        choice.content = r.filtered;
      }
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: `LLM proxy exception: ${message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

/**
 * Streaming variant — proxies the LLM with `Accept: text/event-stream`
 * to the client. Returns a Server-Sent Events Response.
 *
 * VeilFilter guarantee (see file header): NOT applied per-chunk. Applied
 * once at end-of-stream on the concatenated text. Mid-stream frames are
 * raw provider deltas.
 *
 * Frame shapes (one JSON object per `data:` line):
 *   - `{"text": "<delta>"}` — a single provider delta
 *   - `{"veiled": "<filtered full text>", "violations": [...]}` — final frame
 *   - `{"done": true}` — sentinel before connection close
 *   - `{"error": "<message>"}` — fatal proxy failure
 *
 * Provider support: OpenAI Chat Completions `stream: true` (SSE),
 * Anthropic Messages `stream: true` (SSE). Both are returned as-is
 * from the provider, untouched by us apart from extracting the text
 * delta. Anthropic event types are translated to the same shape.
 */
export function proxyChatCompletionStream(
  body: {
    readonly messages: readonly { role: string; content: string }[];
    readonly system?: string;
    readonly temperature?: number;
    readonly maxTokens?: number;
    readonly tools?: readonly unknown[];
  },
): Response {
  const config = resolveServerLLMConfig();
  if (!config) {
    // No streaming body — emit a single error frame so the client EventSource picks it up
    // as the first frame and closes. We mirror the JSON-mode status here.
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: 'LLM not configured server-side' })}\n\n`,
          ),
        );
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      },
    });
    return new Response(stream, {
      status: 503,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  const veiledSystem = body.system ? filterInput(body.system) : undefined;
  const veiledMessages = body.messages.map((m) => ({
    ...m,
    content: filterInput(m.content),
  }));

  // Build the upstream request, identical to buffered proxy but with `stream: true`.
  const buildUpstream = async (): Promise<{
    url: string;
    init: RequestInit;
    /** Present only on the OpenAI path: a chain-walking fetch, preferred over `url`+`init`. */
    fetch?: () => Promise<Response>;
    parseDelta: (raw: string, acc: string) => string;
  }> => {
    if (config.protocol === 'anthropic') {
      const anthropicBody: Record<string, unknown> = {
        model: config.model,
        system: veiledSystem ?? '',
        messages: veiledMessages.filter((m) => m.role !== 'system'),
        temperature: body.temperature ?? 0.7,
        max_tokens: body.maxTokens ?? 4096,
        stream: true,
      };
      if (body.tools && body.tools.length > 0) {
        anthropicBody.tools = body.tools.map((t: any) => ({
          name: t.function?.name ?? t.name,
          description: t.function?.description ?? t.description ?? '',
          input_schema: t.function?.parameters ?? t.parameters ?? { type: 'object', properties: {} },
        }));
      }
      return {
        url: `${config.baseUrl}/messages`,
        init: {
          method: 'POST',
          headers: buildHeaders(config),
          body: JSON.stringify(anthropicBody),
        },
        // Anthropic streams `event: content_block_delta` with `data.delta.text`.
        // Each SSE-record is several lines, one of which is `data: <json>`.
        parseDelta: (_raw: string, acc: string) => acc,
      };
    }
    const openaiBody: Record<string, unknown> = {
      model: config.model,
      messages: veiledSystem
        ? [{ role: 'system', content: veiledSystem }, ...veiledMessages]
        : veiledMessages,
      temperature: body.temperature ?? 0.7,
      ...(body.maxTokens ? { max_tokens: body.maxTokens } : {}),
      ...(body.tools && body.tools.length > 0 ? { tools: body.tools } : {}),
      stream: true,
    };
    return {
      url: `${config.baseUrl}/chat/completions`,
      init: {
        method: 'POST',
        headers: buildHeaders(config),
        body: JSON.stringify(openaiBody),
      },
      // A STREAM FALLS BACK ONLY BEFORE ITS FIRST BYTE. `fetchThroughChain` returns the Response
      // with the body UNREAD, so switching models on a 429/5xx here is safe — no part of model 1's
      // output has reached the player. Once bytes are flowing a switch would emit two answers
      // spliced together, so a mid-stream fault is the caller's problem, not the chain's.
      fetch: () => fetchThroughChain(config, (model) => ({ ...openaiBody, model })),
      parseDelta: (_raw: string, _acc: string) => _acc,
    };
  };

  const encoder = new TextEncoder();

  // We build the stream lazily because the upstream `fetch` is async.
  return new Response(
    new ReadableStream({
      async start(controller) {
        let concatenatedFullText = '';
        try {
          const upstream = await buildUpstream();
          // `fetch` is present only on the OpenAI path; the Anthropic path keeps the direct call,
          // because the chain is keyed on `/chat/completions` and a `/messages` body is a
          // different protocol with a different model vocabulary.
          const res = upstream.fetch
            ? await upstream.fetch()
            : await fetchWithTimeout(upstream.url, upstream.init);
          if (!res.ok || !res.body) {
            const errText = await res.text().catch(() => '<no body>');
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: `LLM provider error: ${res.status}`, detail: errText })}\n\n`,
              ),
            );
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
            controller.close();
            return;
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          // Process upstream SSE records one by one. The exact shape
          // depends on the protocol — OpenAI sends `data: {...}` lines
          // with `choices[].delta.content`; Anthropic sends multi-line
          // event records. We unify to extract text deltas.
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // Normalize line endings, split, keep partial last line in buffer.
            const normalized = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            const pieces = normalized.split('\n');
            buffer = pieces.pop() ?? '';

            for (const line of pieces) {
              const trimmed = line.trimEnd();
              if (!trimmed) continue;

              if (config.protocol === 'anthropic') {
                // Anthropic SSE records start with `event:` then `data:`.
                // We pass data: lines through; ignore event: bookkeeping.
                if (!trimmed.startsWith('data:')) continue;
                const raw = trimmed.slice(5).trim();
                if (raw === '[DONE]' || raw === '') continue;
                try {
                  const parsed = JSON.parse(raw) as any;
                  if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                    const text: string = parsed.delta.text ?? '';
                    if (text) {
                      concatenatedFullText += text;
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ text })}\n\n`),
                      );
                    }
                  } else if (parsed.type === 'message_stop') {
                    // Sentry for end — we'll send the [done] below.
                  }
                } catch {
                  // ignore malformed lines
                }
              } else {
                // OpenAI: each line is `data: <json>` (or `data: [DONE]`).
                if (!trimmed.startsWith('data:')) continue;
                const raw = trimmed.slice(5).trim();
                if (raw === '[DONE]' || raw === '') continue;
                try {
                  const parsed = JSON.parse(raw) as any;
                  const delta: string =
                    parsed?.choices?.[0]?.delta?.content ?? '';
                  if (delta) {
                    concatenatedFullText += delta;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ text: delta })}\n\n`),
                    );
                  }
                } catch {
                  // ignore malformed lines
                }
              }
            }
          }

          // End-of-stream: run VeilFilter on the concatenated text and
          // emit the final veiled frame.
          const veiled = filterOutput(concatenatedFullText);
          if (veiled.violations.length > 0) {
            logVeilViolation(
              `proxyChatCompletionStream.${config.protocol}`,
              veiled.violations,
            );
          }
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ veiled: veiled.filtered, violations: veiled.violations })}\n\n`,
            ),
          );
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          // Surface any in-flight exception as an error frame so the
          // client's EventSource surfaces it; the connection then closes.
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: `LLM proxy exception: ${message}` })}\n\n`),
          );
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        }
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'x-llm-provider': config.providerName,
        'x-llm-model': config.model,
      },
    },
  );
}

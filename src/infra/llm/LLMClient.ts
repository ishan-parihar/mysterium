/**
 * LLMClient — thin wrapper around a chat-completions endpoint.
 * Used for open-ended response evaluation in later-stage probes.
 *
 * T-3.6: Veil violations detected by filterOutput are logged to console.warn
 * for telemetry aggregation. In production, these should be routed to the
 * TelemetryService for centralized monitoring.
 *
 * Dynamic-config refactor (UX-R3 follow-up): the previous implementation
 * hard-read VITE_LLM_* env vars. The new implementation resolves config
 * through ProviderRegistry.resolveConfig(), which supports:
 *   - Provider-specific env vars (OPENCODE_API_KEY, ANTHROPIC_API_KEY, etc.)
 *   - Generic LLM_* env vars (LLM_PROVIDER, LLM_BASE_URL, LLM_API_KEY, LLM_MODEL)
 *   - Legacy VITE_LLM_* env vars (backwards compat)
 *   - The MODEL env var (per the user's spec)
 *   - Saved config file (~/.mysterium/config.json)
 * No hardcoded model names anywhere — models come from /models or models.dev.
 */

import type { Stage } from '../../core/domain/Stage.js';
import type { AgentMessage, ToolCall } from '../../core/assessments/agentTypes.js';
import { filterInput, filterOutput } from './VeilFilter.js';
import { resolveConfig, isComplete, getModels, type LLMConfig } from './ProviderRegistry.js';
import {
  isBrowserWithBFF,
  proxyQueryLLM,
  proxyQueryLLMWithTools,
  proxyEvaluateResponse,
  proxyQueryLLMStream,
} from './ProxiedLLMClient.js';

/** T-3.6: Log Veil violations for telemetry. */
/** R8-BUG-3 (UX-R8): Gate VeilFilter logs behind Mysterium_DEV env var so they
 * don't leak into normal user output. Previously these appeared in --agent
 * mode, violating the Veil design principle. */
function logVeilViolation(source: string, violations: readonly string[]): void {
  if (violations.length === 0) return;
  // Only log when Mysterium_DEV=1 (set by the CLI when --dev is active).
  if (typeof process !== 'undefined' && process.env?.Mysterium_DEV === '1') {
    console.warn(`[VeilFilter] ${source}: ${violations.length} violation(s): ${violations.join(', ')}`);
  }
}

export interface LLMEvaluation {
  readonly score: number;
  readonly feedback: string;
  readonly inferredStage?: Stage;
  readonly confidence?: number;
}

import { InfraConfig } from '../../core/config/InfraConfig.js';

const FALLBACK: LLMEvaluation = { score: 0.5, feedback: 'LLM unavailable' };

const LLM_TIMEOUT_MS = InfraConfig.LLM_TIMEOUT_MS;
const LLM_RETRY_COUNT = InfraConfig.LLM_RETRY_COUNT;
const LLM_RETRY_BACKOFF_MS = InfraConfig.LLM_RETRY_BACKOFF_MS;

/** Fetch with AbortController timeout to prevent hangs */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = LLM_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * NF-2: Fetch with retry. Retries on network errors, timeouts, HTTP 429
 * (rate limit), and HTTP 5xx (server errors). Does NOT retry on 4xx
 * (client errors — those won't fix themselves). Returns the last response
 * (which may be an error response) so callers can inspect res.ok.
 */
async function fetchWithRetry(url: string, init: RequestInit, timeoutMs = LLM_TIMEOUT_MS): Promise<Response> {
  let lastRes: Response | null = null;
  let lastErr: any = null;
  for (let attempt = 0; attempt <= LLM_RETRY_COUNT; attempt++) {
    try {
      const res = await fetchWithTimeout(url, init, timeoutMs);
      // Retry on rate-limit (429) and server errors (5xx) — these are transient
      if ((res.status === 429 || res.status >= 500) && attempt < LLM_RETRY_COUNT) {
        await new Promise(r => setTimeout(r, LLM_RETRY_BACKOFF_MS));
        continue;
      }
      return res;
    } catch (err: any) {
      lastErr = err;
      lastRes = null;
      // Network error / timeout — retry once
      if (attempt < LLM_RETRY_COUNT) {
        await new Promise(r => setTimeout(r, LLM_RETRY_BACKOFF_MS));
        continue;
      }
    }
  }
  // All retries exhausted — re-throw the last error so callers can catch it
  if (lastErr) throw lastErr;
  // Shouldn't reach here, but return last response as fallback
  return lastRes ?? new Response('{"error":"retry exhausted"}', { status: 503 });
}

/**
 * Resolve the active LLM config. Reads from env vars + saved config file
 * via ProviderRegistry. The CLI calls this once at startup and seeds
 * process.env.VITE_LLM_* for backwards compat with code that still reads
 * those directly. New code should call this function instead.
 *
 * The savedConfig parameter is optional — when omitted, only env vars are
 * consulted. The CLI passes the loaded ~/.mysterium/config.json here.
 */
let cachedConfig: LLMConfig | null = null;
export function getActiveConfig(savedConfig?: Parameters<typeof resolveConfig>[1]): LLMConfig {
  if (cachedConfig && !savedConfig) return cachedConfig;
  cachedConfig = resolveConfig({}, savedConfig ?? {});
  return cachedConfig;
}

/**
 * Returns the active config only if the LLM is enabled AND the config is
 * complete. Returns null otherwise. This is the function LLM call sites
 * should use — it respects both --no-llm (via setLLMDisabled) and missing
 * config (via isComplete). Replaces the old `isComplete(getActiveConfig())`
 * pattern which didn't account for --no-llm.
 */
export function getEnabledConfig(savedConfig?: Parameters<typeof resolveConfig>[1]): LLMConfig | null {
  if (llmGloballyDisabled) return null;
  const config = getActiveConfig(savedConfig);
  return isComplete(config) ? config : null;
}

/** Invalidate the cached config (used when setup saves a new config). */
export function invalidateConfigCache(): void {
  cachedConfig = null;
  modelValidated = false;
}

/**
 * R5-P2-3 (UX-R5/R6): Lazy model validation. Fetches the provider's /models
 * list once and warns (not errors) if the configured model isn't found.
 * Non-blocking: failures (network, auth) are silently ignored. This closes
 * the last R3 input-validation gap (--model was silently accepted).
 */
let modelValidated = false;
export async function validateModelIfFresh(): Promise<{ valid: boolean; message?: string } | null> {
  if (modelValidated) return null;
  modelValidated = true;
  const config = getEnabledConfig();
  if (!config) return null;
  try {
    const models = await getModels(config);
    if (models.length === 0) return null; // couldn't fetch — don't block
    const found = models.some(m => m.id === config.model || m.id.includes(config.model) || config.model.includes(m.id));
    if (!found) {
      return {
        valid: false,
        message: `Model '${config.model}' not found in ${config.providerName}'s /models list (${models.length} models available). The call may fail, or the model may be valid but not listed.`,
      };
    }
    return { valid: true };
  } catch {
    return null; // best-effort — never block on validation
  }
}

/**
 * Global LLM disable flag. Set by the CLI when --no-llm is passed.
 * When true, all LLM calls short-circuit to the fallback path, even if
 * the config is complete (i.e. an API key is present). This ensures
 * --no-llm truly disables the LLM everywhere — not just in the CLI's
 * LLM_ACTIVE flag. Previously the PersistentAgent path would still call
 * the LLM because isComplete() returned true (the config file had a key).
 */
let llmGloballyDisabled = false;
export function setLLMDisabled(disabled: boolean): void {
  llmGloballyDisabled = disabled;
}
export function isLLMDisabled(): boolean {
  return llmGloballyDisabled;
}

function isAnthropicProtocol(config: LLMConfig): boolean {
  return config.protocol === 'anthropic' || config.baseUrl.includes('anthropic.com');
}

function buildHeaders(config: LLMConfig): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey && config.apiKey !== 'sk-placeholder') {
    if (config.authStyle === 'x-api-key') {
      headers['x-api-key'] = config.apiKey;
      if (config.protocol === 'anthropic') headers['anthropic-version'] = '2023-06-01';
    } else {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }
  }
  return headers;
}

export async function evaluateResponse(
  prompt: string,
  rubric: string,
  playerResponse: string,
): Promise<LLMEvaluation> {
  // PHASE-0 SECURITY FIX: In the browser, route through the BFF proxy
  // so the LLM API key never reaches the client. The CLI (Node) path
  // below remains unchanged for direct provider calls.
  if (isBrowserWithBFF()) {
    const result = await proxyEvaluateResponse(prompt, rubric, playerResponse);
    let inferredStage: Stage | undefined = undefined;
    if (result.inferredStage) {
      const normalized = result.inferredStage.charAt(0).toUpperCase() + result.inferredStage.slice(1).toLowerCase();
      const stages: string[] = ['Infrared', 'Magenta', 'Red', 'Amber', 'Orange', 'Green', 'Teal', 'Turquoise'];
      if (stages.includes(normalized)) {
        inferredStage = normalized as Stage;
      }
    }
    return {
      score: result.score,
      feedback: result.feedback,
      inferredStage,
      confidence: result.confidence,
    };
  }

  const config = getEnabledConfig();
  if (!config) return FALLBACK;

  const systemContent = `You are a developmental psychology scoring rubric evaluator. ${rubric}\nIf evaluating a calibration probe, determine which developmental stage (Infrared, Magenta, Red, Amber, Orange, Green, Teal, Turquoise) the player response corresponds to and provide a confidence rating. Respond ONLY with JSON: {"score": <0-1>, "feedback": "<brief>", "inferredStage": "<stage>", "confidence": <0-1>}`;
  const userContent = `Prompt: ${prompt}\nPlayer response: ${playerResponse}`;

  try {
    let res: Response;
    if (isAnthropicProtocol(config)) {
      res = await fetchWithRetry(`${config.baseUrl}/messages`, {
        method: 'POST',
        headers: buildHeaders(config),
        body: JSON.stringify({
          model: config.model,
          system: systemContent,
          messages: [{ role: 'user', content: userContent }],
          temperature: 0.2,
          max_tokens: 1024,
        }),
      });
    } else {
      res = await fetchWithRetry(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: buildHeaders(config),
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: userContent },
          ],
          temperature: 0.2,
        }),
      });
    }

    if (!res.ok) return FALLBACK;

    const data = (await res.json()) as any;
    const content = isAnthropicProtocol(config)
      ? data.content?.[0]?.text ?? ''
      : data.choices?.[0]?.message?.content ?? '';
    const parsed = JSON.parse(content) as { score: number; feedback: string; inferredStage?: string; confidence?: number };
    const score = Math.max(0, Math.min(1, parsed.score));

    let inferredStage: Stage | undefined = undefined;
    if (parsed.inferredStage) {
      const normalized = parsed.inferredStage.charAt(0).toUpperCase() + parsed.inferredStage.slice(1).toLowerCase();
      const stages: string[] = ['Infrared', 'Magenta', 'Red', 'Amber', 'Orange', 'Green', 'Teal', 'Turquoise'];
      if (stages.includes(normalized)) {
        inferredStage = normalized as Stage;
      }
    }

    return {
      score,
      feedback: (() => { const r = filterOutput(parsed.feedback ?? ''); logVeilViolation('evaluateResponse.feedback', r.violations); return r.filtered; })(),
      inferredStage,
      confidence: parsed.confidence,
    };
  } catch {
    return FALLBACK;
  }
}

export async function queryLLM(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  // PHASE-0 SECURITY FIX: In the browser, route through the BFF proxy.
  if (isBrowserWithBFF()) {
    return proxyQueryLLM(systemPrompt, userMessage);
  }

  const config = getEnabledConfig();
  if (!config) return '{"error": "LLM unavailable"}';

  // DEV-5: Apply VeilFilter.filterInput to the system prompt + user message
  // before sending to the LLM. The Veil is bidirectional per foundations/20 —
  // filtering only output is half a Veil. Input filtering prevents the LLM
  // from seeing system-terms (stage labels, drive names, etc.) that would
  // bias its generation toward technical language.
  const veiledSystemPrompt = filterInput(systemPrompt);
  const veiledUserMessage = filterInput(userMessage);

  try {
    let res: Response;
    if (isAnthropicProtocol(config)) {
      res = await fetchWithRetry(`${config.baseUrl}/messages`, {
        method: 'POST',
        headers: buildHeaders(config),
        body: JSON.stringify({
          model: config.model,
          system: veiledSystemPrompt,
          messages: [{ role: 'user', content: veiledUserMessage }],
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });
    } else {
      res = await fetchWithRetry(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: buildHeaders(config),
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: veiledSystemPrompt },
            { role: 'user', content: veiledUserMessage },
          ],
          temperature: 0.7,
        }),
      });
    }

    if (!res.ok) return `{"error": "fetch error: ${res.status}"}`;

    const data = (await res.json()) as any;
    const rawContent = isAnthropicProtocol(config)
      ? data.content?.[0]?.text ?? ''
      : data.choices?.[0]?.message?.content ?? '';
    { const r = filterOutput(rawContent); logVeilViolation('queryLLM', r.violations); return r.filtered; }
  } catch (err: any) {
    return `{"error": "exception: ${err.message || err}"}`;
  }
}

/**
 * Streaming version of queryLLM.
 * Returns a ReadableStream of text deltas (strings).
 *
 * AUDIT v1: added for WebUI LLM-dependence.
 */
export async function queryLLMStream(
  systemPrompt: string,
  userMessage: string,
): Promise<ReadableStream<string>> {
  // In the browser, route through the BFF proxy.
  if (isBrowserWithBFF()) {
    return proxyQueryLLMStream(systemPrompt, userMessage);
  }

  const config = getEnabledConfig();
  if (!config) {
    return new ReadableStream({
      start(controller) {
        controller.enqueue('{"error": "LLM unavailable"}');
        controller.close();
      },
    });
  }

  const veiledSystemPrompt = filterInput(systemPrompt);
  const veiledUserMessage = filterInput(userMessage);

  // For Node/CLI path, we implement a basic SSE consumer.
  return new ReadableStream({
    async start(controller) {
      try {
        let res: Response;
        if (isAnthropicProtocol(config)) {
          res = await fetchWithRetry(`${config.baseUrl}/messages`, {
            method: 'POST',
            headers: buildHeaders(config),
            body: JSON.stringify({
              model: config.model,
              system: veiledSystemPrompt,
              messages: [{ role: 'user', content: veiledUserMessage }],
              temperature: 0.7,
              max_tokens: 4096,
              stream: true,
            }),
          });
        } else {
          res = await fetchWithRetry(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: buildHeaders(config),
            body: JSON.stringify({
              model: config.model,
              messages: [
                { role: 'system', content: veiledSystemPrompt },
                { role: 'user', content: veiledUserMessage },
              ],
              temperature: 0.7,
              stream: true,
            }),
          });
        }

        if (!res.ok || !res.body) {
          controller.enqueue(`{"error": "fetch error: ${res.status}"}`);
          controller.close();
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const raw = trimmed.slice(5).trim();
            if (raw === '[DONE]') continue;
            try {
              const data = JSON.parse(raw);
              if (isAnthropicProtocol(config)) {
                if (data.type === 'content_block_delta' && data.delta?.text) {
                  controller.enqueue(data.delta.text);
                }
              } else {
                const delta = data.choices?.[0]?.delta?.content;
                if (delta) controller.enqueue(delta);
              }
            } catch { /* ignore malformed */ }
          }
        }
        controller.close();
      } catch (err: any) {
        controller.enqueue(`{"error": "exception: ${err.message || err}"}`);
        controller.close();
      }
    }
  });
}

export interface LLMToolResponse {
  readonly content: string | null;
  readonly toolCalls?: readonly ToolCall[];
}

export async function queryLLMWithTools(
  systemPrompt: string,
  messages: readonly AgentMessage[],
  tools?: readonly any[],
): Promise<LLMToolResponse> {
  // PHASE-0 SECURITY FIX: In the browser, route through the BFF proxy.
  if (isBrowserWithBFF()) {
    const result = await proxyQueryLLMWithTools(systemPrompt, messages, tools);
    return {
      content: result.content,
      toolCalls: result.toolCalls as readonly ToolCall[] | undefined,
    };
  }

  const config = getEnabledConfig();
  if (!config) return { content: '{"error": "LLM unavailable"}' };

  // DEV-5: Apply VeilFilter.filterInput to the system prompt before sending.
  const veiledSystemPrompt = filterInput(systemPrompt);

  const anthropic = isAnthropicProtocol(config);

  const mappedMessages = messages.map(msg => {
    const result: any = { role: msg.role, content: msg.content };
    if (msg.toolCalls) {
      result.tool_calls = msg.toolCalls.map(tc => ({
        id: tc.id, type: tc.type,
        function: { name: tc.function.name, arguments: tc.function.arguments },
      }));
    }
    if (msg.toolCallId) result.tool_call_id = msg.toolCallId;
    if (msg.name) result.name = msg.name;
    return result;
  });

  try {
    let res: Response;
    if (anthropic) {
      // Anthropic: system goes to top-level param, no system role in messages
      const systemMsg = mappedMessages.find(m => m.role === 'system');
      const nonSystemMsgs = mappedMessages.filter(m => m.role !== 'system');
      const body: any = {
        model: config.model,
        system: systemMsg?.content ?? veiledSystemPrompt,
        messages: nonSystemMsgs,
        temperature: 0.7,
        max_tokens: 4096,
      };
      if (tools && tools.length > 0) {
        body.tools = tools.map((t: any) => ({
          name: t.function?.name ?? t.name,
          description: t.function?.description ?? t.description ?? '',
          input_schema: t.function?.parameters ?? t.parameters ?? { type: 'object', properties: {} },
        }));
      }
      res = await fetchWithRetry(`${config.baseUrl}/messages`, {
        method: 'POST',
        headers: buildHeaders(config),
        body: JSON.stringify(body),
      });
    } else {
      const body: any = {
        model: config.model,
        messages: [{ role: 'system', content: veiledSystemPrompt }, ...mappedMessages],
        temperature: 0.7,
      };
      if (tools && tools.length > 0) body.tools = tools;
      res = await fetchWithRetry(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: buildHeaders(config),
        body: JSON.stringify(body),
      });
    }

    if (!res.ok) {
      return { content: `{"error": "fetch error: ${res.status}"}` };
    }

    const data = (await res.json()) as any;

    if (anthropic) {
      // Anthropic response: content is an array of blocks
      const textBlock = data.content?.find((b: any) => b.type === 'text');
      const toolBlocks = data.content?.filter((b: any) => b.type === 'tool_use') ?? [];
      const textContent = textBlock?.text != null
        ? (() => { const r = filterOutput(textBlock.text); logVeilViolation('queryLLMWithTools.anthropic', r.violations); return r.filtered; })()
        : null;
      return {
        content: textContent,
        toolCalls: toolBlocks.length > 0 ? toolBlocks.map((b: any) => ({
          id: b.id,
          type: 'function' as const,
          function: { name: b.name, arguments: JSON.stringify(b.input) },
        })) : undefined,
      };
    }

    const choice = data.choices?.[0]?.message;
    if (!choice) return { content: null };
    const choiceContent = choice.content != null
      ? (() => { const r = filterOutput(choice.content); logVeilViolation('queryLLMWithTools.openai', r.violations); return r.filtered; })()
      : null;
    return {
      content: choiceContent,
      toolCalls: choice.tool_calls?.map((tc: any) => ({
        id: tc.id, type: tc.type,
        function: { name: tc.function.name, arguments: tc.function.arguments },
      })),
    };
  } catch (err: any) {
    return { content: `{"error": "exception: ${err.message || err}"}` };
  }
}


/**
 * Reading a completion out of a provider response, whatever shape it arrives in.
 *
 * THE ENVELOPE IS THE WHOLE BUG. Cline (and several other OpenAI-compatible gateways) answer
 * `{ data: { choices: [...] } }`, while OpenAI itself and the Anthropic protocol answer
 * `{ choices: [...] }` / `{ content: [...] }` at the top level. Three readers assumed the bare
 * shape, so on a gateway with an envelope every one of them got `undefined`, coerced it to `''`
 * with `?? ''`, and handed that to `JSON.parse` — which reports "Unexpected end of JSON input",
 * a message that points at the JSON rather than at the response that never arrived. The symptom
 * was a production onboarding page that sat on "Begin Calibration" forever: the probe endpoint
 * streamed a real `error` frame, and the client had no probe to render.
 *
 * `unwrapProviderBody` is the one place that knows about both shapes. It does NOT decide which is
 * correct — a provider that legitimately nests under `data` gets unwrapped, and anything else is
 * passed through untouched, so a new gateway shape degrades to "not found" here rather than to a
 * silent empty string three call sites away.
 */

/** The bare OpenAI chat-completion body, once any gateway envelope has been removed. */
export type OpenAICompletionBody = {
  readonly choices?: ReadonlyArray<{ message?: { content?: string } }>;
  readonly content?: ReadonlyArray<{ type?: string; text?: string }>;
};

/**
 * Strip a single provider envelope, if there is one.
 *
 * `data` is only unwrapped when it is an OBJECT that actually looks like a completion — a bare
 * `{ data: "ok" }` health-check body must not be unwrapped into the string `"ok"`, and a
 * completion nested under some future key should pass through and fail loudly downstream rather
 * than be silently reshaped here.
 */
export function unwrapProviderBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object') return {};
  const rec = body as Record<string, unknown>;
  const inner = rec['data'];
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const innerRec = inner as Record<string, unknown>;
    // Unwrap only when the inner object carries a completion, or nothing else does either —
    // a gateway that returns `{ data: { choices } }` is the case this exists for.
    if (innerRec['choices'] !== undefined || innerRec['content'] !== undefined) return innerRec;
  }
  return rec;
}

/**
 * Extract the assistant's text from a provider body, tolerating both shapes and both protocols.
 *
 * Returns `''` when nothing usable is present, which is the honest answer — the caller decides
 * whether an empty completion is fatal. `describeEmptyCompletion` exists so that decision can be
 * made with the model's name and the keys that DID arrive attached, instead of a bare
 * "Unexpected end of JSON input" that names neither.
 */
export function extractCompletionText(body: unknown): string {
  const data = unwrapProviderBody(body) as OpenAICompletionBody;

  // Anthropic: a list of typed blocks, only the `text` ones carrying an answer.
  const blocks = data.content;
  if (Array.isArray(blocks)) {
    const text = blocks.find((b) => b && (b.type === 'text' || typeof b.text === 'string'))?.text;
    if (typeof text === 'string') return text;
  }

  // OpenAI: choices[0].message.content.
  const choice = data.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content === 'string') return content;

  return '';
}

/**
 * Did the body carry a completion STRUCTURE at all, regardless of whether it held any text?
 *
 * This is the distinction a reader needs before treating an empty extraction as a failure. A
 * tool-use turn and a reasoning-only turn both legitimately extract to `''` while carrying a
 * perfectly valid shape, and turning either into an exception would replace a handled case with
 * a hard one. Only a body with neither `choices` nor `content` is genuinely malformed — there is
 * no reading of it at all.
 */
export function hasCompletionShape(body: unknown): boolean {
  const data = unwrapProviderBody(body) as OpenAICompletionBody;
  return Array.isArray(data.choices) || Array.isArray(data.content);
}

/**
 * A diagnostic for the empty case, naming what actually arrived.
 *
 * The bug this module exists for was invisible precisely because the failure said nothing about
 * the response. A caller that gets `''` should be able to say "model X returned no content; keys
 * were [data]" and have that be enough to locate it, rather than reporting a parse error about
 * the string that was about to be parsed.
 */
export function describeEmptyCompletion(body: unknown, model: string): string {
  const keys =
    body && typeof body === 'object' ? Object.keys(body as Record<string, unknown>) : [];
  return (
    `model ${model} returned no assistant content; ` +
    `top-level keys were [${keys.join(', ') || 'none'}]` +
    (keys.includes('data') ? ' (an unwrapped envelope is expected to carry choices or content)' : '')
  );
}

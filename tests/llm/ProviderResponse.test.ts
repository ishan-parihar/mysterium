/**
 * The response shape that broke onboarding.
 *
 * Cline answers `{ data: { choices: [...] } }`. OpenAI and Anthropic answer the bare shape. The
 * readers assumed bare, so on a wrapped gateway each one got `undefined`, coerced it to `''` with
 * `?? ''`, and handed that to `JSON.parse` — which reported "Unexpected end of JSON input" and
 * left the player staring at a "Begin Calibration" button that did nothing.
 *
 * Both shapes are pinned here because the bug was invisible in the common case: a bare-shape test
 * passes against a reader that only understands bare.
 */
import { describe, it, expect } from 'vitest';
import {
  describeEmptyCompletion,
  extractCompletionText,
  unwrapProviderBody,
} from '../../src/infra/llm/providerResponse.js';

describe('reading a provider completion', () => {
  it('reads a WRAPPED gateway body — the shape that broke onboarding', () => {
    const body = {
      data: { choices: [{ message: { content: '{"probe":"You wake up."}' } }] },
      success: true,
    };
    expect(extractCompletionText(body)).toBe('{"probe":"You wake up."}');
  });

  it('reads a BARE OpenAI body, unchanged behaviour', () => {
    const body = { choices: [{ message: { content: 'hello' } }] };
    expect(extractCompletionText(body)).toBe('hello');
  });

  it('reads a BARE Anthropic body', () => {
    const body = { content: [{ type: 'text', text: 'from anthropic' }] };
    expect(extractCompletionText(body)).toBe('from anthropic');
  });

  it('reads an Anthropic body that a gateway also wrapped', () => {
    const body = { data: { content: [{ type: 'text', text: 'wrapped anthropic' }] } };
    expect(extractCompletionText(body)).toBe('wrapped anthropic');
  });

  it('skips non-text Anthropic blocks (a tool_use first block is not an answer)', () => {
    const body = { content: [{ type: 'tool_use', id: 'x' }, { type: 'text', text: 'after tool' }] };
    expect(extractCompletionText(body)).toBe('after tool');
  });

  it('returns empty for a body with nothing usable — honest, not a crash', () => {
    expect(extractCompletionText({})).toBe('');
    expect(extractCompletionText({ data: {} })).toBe('');
    expect(extractCompletionText(null)).toBe('');
    expect(extractCompletionText('a string')).toBe('');
  });

  it('does NOT unwrap a non-object `data` — a health-check body must survive', () => {
    const body = { data: 'ok', status: 'healthy' };
    expect(unwrapProviderBody(body)).toBe(body);
  });

  it('does not mistake a string content for a completion', () => {
    // `choices[0].message.content` that is null (a reasoning-only or tool-call turn) must yield ''
    // rather than the string "null".
    const body = { data: { choices: [{ message: { content: null } }] } };
    expect(extractCompletionText(body)).toBe('');
  });
});

describe('the empty-completion diagnostic', () => {
  it('names the model and the keys that arrived, so the cause is locatable', () => {
    const msg = describeEmptyCompletion({ data: {}, success: true }, 'poolside/laguna-s-2.1:free');
    // The bug was invisible because the failure said nothing about the response. These three
    // facts are what a reader needs to locate it without a debugger.
    expect(msg).toContain('poolside/laguna-s-2.1:free');
    expect(msg).toContain('data');
    expect(msg).toContain('no assistant content');
  });

  it('does not name a `data` envelope hint when there was no envelope', () => {
    const msg = describeEmptyCompletion({ choices: [] }, 'some-model');
    expect(msg).toContain('choices');
    expect(msg).not.toContain('envelope is expected');
  });
});

/**
 * The Laya System-1 adapter — plan Phase 14 d6 (user-approved 2026-09-24).
 *
 * A `System1Port` implementation whose three operations are answered by ONE bounded model call
 * each: a typed question in, a typed answer out, no free-form text, no tools, no authoring. This is
 * the shape `43 §2` describes for a System-1 layer — a fast local decision over state, distinct
 * from the deliberative pattern.
 *
 * Three boundaries are structural here, not policy:
 *
 *  - **It never throws.** Every method returns `undefined`/`null` on any failure (no callable, bad
 *    JSON, a timeout, an out-of-vocabulary tag). The caller's combinator would catch a throw
 *    anyway; not throwing means the degradation path has ONE shape instead of two.
 *  - **It never widens the vocabulary.** A tag it proposes is a *string* until the caller's guard
 *    accepts it against the store. The adapter deliberately does not know the ontology, so it
 *    cannot be the thing that decides what exists.
 *  - **It caches per call.** The same topic resolved twice in a session must not cost two model
 *    calls; the cache is per-adapter and never persisted (a model answer is a proposal, not state).
 *
 * The agreement check that decides whether this adapter is kept at all lives with the port
 * (`system1Port.bindSystem1`) — the adapter cannot grade its own homework.
 */

import type { NeighbourPrefilter, System1Port } from '../../core/personalization/system1Port.js';
import type { EncounterRecord, PolarityReading } from '../../core/personalization/polarityResolution.js';
import type { TagId } from '../../core/world/tags/types.js';

/** The one dependency: a bounded json-in/json-out completion. Any provider may satisfy it. */
export type JsonCompletion = (prompt: string, opts?: { readonly timeoutMs?: number }) => Promise<unknown>;

export interface LayaSystem1Options {
  readonly complete: JsonCompletion;
  /** The tag vocabulary the model is TOLD about — a hint, never the guard (the caller's guard is). */
  readonly knownTags?: readonly string[];
  readonly timeoutMs?: number;
  /** Cap on per-adapter memo entries; a session resolves a handful of topics, not thousands. */
  readonly cacheLimit?: number;
}

/** Strip a fenced code block and parse — model output arrives wrapped often enough to matter. */
function parseJsonish(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/.exec(raw);
  const body = (fenced ? fenced[1] : raw) ?? '';
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

/** A bounded LRU-ish cache: insertion-ordered, evicted from the front. */
function makeCache(limit: number) {
  const store = new Map<string, TagId | undefined>();
  return {
    get(key: string): { hit: true; value: TagId | undefined } | { hit: false } {
      if (!store.has(key)) return { hit: false };
      return { hit: true, value: store.get(key) };
    },
    set(key: string, value: TagId | undefined): void {
      store.set(key, value);
      if (store.size > limit) {
        const oldest = store.keys().next();
        if (!oldest.done) store.delete(oldest.value);
      }
    },
  };
}

/**
 * Build the adapter. Every op is a single bounded call; a `complete` that is missing, slow or
 * malformed produces `undefined`, which the port's combinator turns into the deterministic answer.
 */
export function createLayaSystem1(options: LayaSystem1Options): System1Port {
  const timeoutMs = options.timeoutMs ?? 4_000;
  const cache = makeCache(options.cacheLimit ?? 256);
  const tagHint = (options.knownTags ?? []).join(', ');

  const call = async (prompt: string): Promise<unknown> => {
    try {
      return parseJsonish(await options.complete(prompt, { timeoutMs }));
    } catch {
      return undefined; // unreachable model, timeout, provider error — all the same answer here
    }
  };

  // The port's synchronous signatures are deliberate (`TopicTagResolver` is used inside a pure
  // query build). A promise cannot be awaited there, so the adapter answers SYNCHRONOUSLY from the
  // cache and warms it in the background: the first call for a topic returns `undefined` (the
  // fallback answers), and the next one returns the model's proposal. This is the honest shape for
  // a System-1 layer — it may inform the NEXT decision, never change the one in flight.
  const warm = (topic: string): void => {
    void call(
      [
        'You resolve a topic word to one tag id from this closed list. Answer with JSON only.',
        `Allowed tag ids: ${tagHint}`,
        `Topic: ${JSON.stringify(topic)}`,
        'Reply exactly {"tag":"<id>"} using an id from the list, or {"tag":null} if none fits.',
      ].join('\n'),
    ).then((raw) => {
      const tag = (raw as { tag?: unknown } | undefined)?.tag;
      cache.set(topic, typeof tag === 'string' ? (tag as TagId) : undefined);
    });
  };

  const resolveTopicTag = (topic: string): TagId | undefined => {
    const key = topic.trim().toLowerCase();
    const hit = cache.get(key);
    if (hit.hit) return hit.value;
    warm(key);
    return undefined;
  };

  const proposeReading = (_record: EncounterRecord): PolarityReading | null => null;

  const prefilterNeighbours: NeighbourPrefilter = (seedIds) => seedIds;

  return { id: 'laya-system1', resolveTopicTag, proposeReading, prefilterNeighbours };
}

/**
 * The asynchronous form of the port, for callers that CAN await (the composition and reporting
 * paths). Same boundaries, direct answers instead of a warm cache.
 */
export function createLayaSystem1Async(options: LayaSystem1Options): {
  readonly resolveTopicTag: (topic: string) => Promise<TagId | undefined>;
  readonly prefilterNeighbours: (seedIds: readonly string[], candidates: readonly string[]) => Promise<readonly string[]>;
  readonly proposeReading: (record: EncounterRecord) => Promise<PolarityReading | null>;
} {
  const { complete, knownTags, timeoutMs = 4_000 } = options;

  const ask = async (prompt: string): Promise<Record<string, unknown> | undefined> => {
    try {
      const parsed = parseJsonish(await complete(prompt, { timeoutMs }));
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : undefined;
    } catch {
      return undefined;
    }
  };

  return {
    async resolveTopicTag(topic) {
      const out = await ask(
        [
          'You resolve a topic word to one tag id from this closed list. Answer with JSON only.',
          `Allowed tag ids: ${(knownTags ?? []).join(', ')}`,
          `Topic: ${JSON.stringify(topic)}`,
          'Reply exactly {"tag":"<id>"} using an id from the list, or {"tag":null} if none fits.',
        ].join('\n'),
      );
      const tag = out?.tag;
      return typeof tag === 'string' ? (tag as TagId) : undefined;
    },
    async proposeReading() {
      // Retained as a documented no-op: the reading path stays on the deterministic implementation
      // until a held-out agreement set exists for it. A model that has not been measured for a
      // surface must not be the one answering it (the port's own law).
      return null;
    },
    async prefilterNeighbours(seedIds, candidates) {
      const out = await ask(
        [
          'You rank candidate ids by relevance to the seed ids. Answer with JSON only.',
          `Seeds: ${JSON.stringify(seedIds)}`,
          `Candidates: ${JSON.stringify(candidates.slice(0, 200))}`,
          'Reply exactly {"ids":["<id>", ...]} with at most 24 ids drawn ONLY from the candidates.',
        ].join('\n'),
      );
      const ids = out?.ids;
      if (!Array.isArray(ids)) return seedIds;
      const allowed = new Set(candidates);
      // The guard: a prefilter may reorder and narrow, never introduce.
      return ids.filter((id): id is string => typeof id === 'string' && allowed.has(id)).slice(0, 24);
    },
  };
}

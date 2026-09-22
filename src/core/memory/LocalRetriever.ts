/**
 * The LocalRetriever — 48 §4's default provider (`docs/foundations/48-memory-architecture.md`).
 * Phase 12 d2.
 *
 * ONE interface, TWO providers (`MY-AD-0032`); this is the ALWAYS-PRESENT one: BM25 over text
 * fields (the `arch.py` tokenizer/field-weighting pattern, already in-house) + recency weighting
 * + graph edges, fused by reciprocal-rank fusion. Deterministic, keyless, file-persisted — the
 * retrieval floor. When the optional EmbeddingRetriever is present the two lists RRF-fuse; when
 * it is absent, failed, or version-mismatched, THIS alone serves (48 §4 degradation, MY-RG-0032).
 *
 * Firewall note (48 §5): this module RANKS — it never writes, and its caller is responsible for
 * the banded-only/Veil-filtered/isolated guarantees on what is RETURNED. Ranking input may be
 * anything; output passes the firewall at the seam.
 */

/** Anything retrievable: an id, searchable text fields, a timestamp, and graph edges. */
export interface Retrievable {
  readonly id: string;
  /** The text fields to index, with their weights (title-like fields weigh more). */
  readonly fields: readonly { readonly name: string; readonly text: string; readonly weight: number }[];
  /** Deterministic clock (22 §9) — recency weighting input. */
  readonly at: number;
  /** Outgoing graph edges (holon relationships, feed refs) — the third signal. */
  readonly edges: readonly string[];
}

export interface RetrievalQuery {
  readonly text: string;
  /** The deterministic now of the query (22 §9) — recency half-life is measured against it. */
  readonly now: number;
  /** Ids to boost (graph neighbourhoods computed by the caller). */
  readonly boostIds?: readonly string[];
  /** Result cap. Default 20. */
  readonly limit?: number;
}

/** A ranked hit: id + fused score (RRF — reciprocal ranks, not raw relevance). */
export type Ranked = readonly { readonly id: string; readonly score: number }[];

// ── BM25 (the arch.py tokenizer pattern: lowercase, split on non-letters/digits, stopword-light) ──

const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'is', 'are', 'was', 'were', 'it', 'that', 'this', 'with', 'as', 'at', 'by']);

export function tokenize(text: string): readonly string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

const BM25_K1 = 1.5;
const BM25_B = 0.75;

interface Bm25Doc {
  readonly id: string;
  readonly terms: ReadonlyMap<string, number>; // term → weighted count
  readonly length: number;
}

/** Build the BM25 index over the corpus (weighted per field). */
function buildIndex(corpus: readonly Retrievable[]): { docs: readonly Bm25Doc[]; idf: ReadonlyMap<string, number> } {
  const docs: Bm25Doc[] = corpus.map((c) => {
    const terms = new Map<string, number>();
    let length = 0;
    for (const f of c.fields) {
      for (const t of tokenize(f.text)) {
        terms.set(t, (terms.get(t) ?? 0) + f.weight);
        length += f.weight;
      }
    }
    return { id: c.id, terms, length };
  });
  const df = new Map<string, number>();
  for (const d of docs) {
    for (const t of d.terms.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const N = Math.max(1, docs.length);
  const idf = new Map<string, number>();
  for (const [t, n] of df) idf.set(t, Math.log(1 + (N - n + 0.5) / (n + 0.5)));
  return { docs, idf };
}

function bm25Scores(queryText: string, docs: readonly Bm25Doc[], idf: ReadonlyMap<string, number>): Map<string, number> {
  const qTerms = tokenize(queryText);
  const avgLen = docs.reduce((a, d) => a + d.length, 0) / Math.max(1, docs.length);
  const scores = new Map<string, number>();
  for (const d of docs) {
    for (const t of qTerms) {
      const tf = d.terms.get(t);
      if (!tf) continue;
      const w = idf.get(t) ?? 0;
      scores.set(d.id, (scores.get(d.id) ?? 0) + w * ((tf * (BM25_K1 + 1)) / (tf + BM25_K1 * (1 - BM25_B + BM25_B * (d.length / Math.max(1e-9, avgLen))))));
    }
  }
  return scores;
}

// ── The three signals + RRF ─────────────────────────────────────────────────────────────────

const RECENCY_HALF_LIFE_MS = 1000 * 60 * 60 * 24 * 14; // 14 days — narrative memory decays gently

/** Recency rank: exponential decay by age, newest first. */
function recencyRank(corpus: readonly Retrievable[], now: number): Map<string, number> {
  const scored = corpus
    .map((c) => ({ id: c.id, s: Math.pow(0.5, Math.max(0, now - c.at) / RECENCY_HALF_LIFE_MS) }))
    .sort((a, b) => b.s - a.s);
  return new Map(scored.map((d, i) => [d.id, i + 1]));
}

/** Graph rank: 1 for the query's boosted ids (the graph neighbourhood), 2..n for the rest. */
function graphRank(corpus: readonly Retrievable[], query: RetrievalQuery): Map<string, number> {
  const boost = new Set(query.boostIds ?? []);
  const ranked = corpus
    .map((c) => ({ id: c.id, s: boost.has(c.id) ? 1 : boost.size > 0 && c.edges.some((e) => boost.has(e)) ? 0.5 : 0 }))
    .sort((a, b) => b.s - a.s);
  return new Map(ranked.map((d, i) => [d.id, i + 1]));
}

/** Reciprocal-rank fusion over k ranked lists (48 §4 — the agentmemory/Hindsight fusion pattern). */
export function rrfFuse(lists: readonly ReadonlyMap<string, number>[], k = 60, limit = 20): Ranked {
  // rrf: score(d) = Σ 1/(k + ordinal_i(d)) — computed from each list's ordinal position.
  const acc = new Map<string, number>();
  for (const list of lists) {
    let ordinal = 0;
    for (const [id] of list) {
      ordinal += 1;
      acc.set(id, (acc.get(id) ?? 0) + 1 / (k + ordinal));
    }
  }
  return [...acc.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, score]) => ({ id, score }));
}

/**
 * The LocalRetriever: BM25 + recency + graph, RRF-fused. Deterministic given (corpus order,
 * query); the corpus order is a replay input (48 §4). No network, no key, no model artifact.
 */
export function localRetrieve(corpus: readonly Retrievable[], query: RetrievalQuery): Ranked {
  if (corpus.length === 0) return [];
  const { docs, idf } = buildIndex(corpus);
  const bm25 = bm25Scores(query.text, docs, idf);

  const textRank = new Map(
    [...bm25.entries()]
      .filter(([, s]) => s > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([id], i) => [id, i + 1] as const),
  );
  const recentRank = recencyRank(corpus, query.now);
  const edgeRank = graphRank(corpus, query);

  const limit = query.limit ?? 20;
  return rrfFuse([textRank, recentRank, edgeRank], 60, limit);
}

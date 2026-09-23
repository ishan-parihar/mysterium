/**
 * Retrieval on the candidate path — Phase 13 d3 (`48 §4`'s scale intent; memory-audit P2 R1).
 *
 * The derived library (d10) is ~6.7k candidates and grows with the corpus; enumerating it per
 * encounter is linear cost the memory architecture already solved. This module is the SEAM:
 *
 * - **Shortlist** — above `SHORTLIST_THRESHOLD` candidates, `localRetrieve` (BM25 + recency +
 *   graph RRF) ranks the library against the query and returns the top-N for the pipeline's
 *   rank step; below the threshold the library passes through untouched (small pools rank
 *   fine by enumeration; determinism is bit-identical either way for tie-order).
 * - **Recall firewall on production traffic** — `RecallableDoc` is the minimum shape a
 *   candidate must carry for shortlisted retrieval: the document text is the candidate's
 *   rendering surface (its tags + landsIn), banded by construction (facet prose is corpus
 *   canon — 46 §8 provenance), scoped per-player by the caller. `filterRecall` re-checks the
 *   text at this seam so a derived recolouring can never smuggle forbidden vocabulary into
 *   the prompt — the same guard class the memory recall path uses (G31's law, second site).
 *
 * Degradation law (45 §5): an empty query or a retrieval failure degrades to the enumerated
 * library — pooling never blocks a session on retrieval.
 */

import { localRetrieve, type Retrievable } from '../memory/LocalRetriever.js';
import { filterRecall, type Recallable, type FilteredHit } from '../memory/retrievalFirewall.js';
import type { PoolCandidate } from './pooling.js';

/** Below this size, enumeration is cheaper than retrieval (and bit-identical). */
export const SHORTLIST_THRESHOLD = 500;
/** The shortlist cap — the rank step only needs the head of the distribution. */
export const SHORTLIST_LIMIT = 256;

/**
 * The candidate's recallable text: tags + landing domains joined — the retrieval surface.
 * Corpus-derived canon (facet prose, tag vocabulary, authored seeds) — banded by construction.
 */
export function candidateText(c: PoolCandidate): string {
  return [...c.tags, ...c.landsIn].join(' ');
}

/** The candidate as a Retrievable document (recency is not meaningful for a static library —
 *  every candidate shares the library's `at`, so recency ranks are stable ties for RRF). */
export function candidateAsRetrievable(c: PoolCandidate, at: number): Retrievable {
  return { id: c.id, fields: [{ name: 'text', text: candidateText(c), weight: 1 }], at, edges: c.landsIn };
}

/**
 * The shortlist step. Returns the candidates the rank step should consider: the whole library
 * below the threshold; the top-`SHORTLIST_LIMIT` retrieved above it. Deterministic given the
 * library order + query (the retriever is deterministic; ties resolve by RRF ordinal, which is
 * stable given corpus order).
 */
export function shortlist(
  library: readonly PoolCandidate[],
  queryText: string,
  now: number,
  limit: number = SHORTLIST_LIMIT,
): readonly PoolCandidate[] {
  if (library.length <= SHORTLIST_THRESHOLD || queryText.trim().length === 0) return library;
  const corpus = library.map((c) => candidateAsRetrievable(c, now));
  const ranked = localRetrieve(corpus, { text: queryText, now, limit: Math.min(limit, library.length) });
  if (ranked.length === 0) return library; // retrieval failure ⇒ enumeration (degradation law)
  const byId = new Map(library.map((c) => [c.id, c]));
  const out: PoolCandidate[] = [];
  for (const hit of ranked) {
    const c = byId.get(hit.id);
    if (c) out.push(c);
  }
  return out.length > 0 ? out : library;
}

/**
 * The recall-firewall check over shortlisted candidates — the production traffic G31 guards on
 * the memory path, now guarding the candidate path too. A candidate whose recall text carries
 * forbidden vocabulary is DROPPED (fail-closed), never flagged for the player. Documents are
 * constructed here from the candidates themselves; the scope is the caller's per-player scope
 * (R4): every candidate is library canon, so the scope is uniform — the check that matters at
 * this seam is the TEXT check (R1/R3).
 */
export function recallGuard(
  candidates: readonly PoolCandidate[],
  scope: string,
): readonly PoolCandidate[] {
  const documents = new Map<string, Recallable>(
    candidates.map((c) => [c.id, { id: c.id, scope, banded: true, text: candidateText(c) }]),
  );
  const ranked = candidates.map((c, i) => ({ id: c.id, score: candidates.length - i }));
  const clean = filterRecall(ranked, documents, scope) as readonly FilteredHit[];
  if (clean.length === candidates.length) return candidates;
  const ok = new Set(clean.map((h) => h.id));
  return candidates.filter((c) => ok.has(c.id));
}

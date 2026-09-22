/**
 * The retrieval firewall — 48 §5 (`docs/foundations/48-memory-architecture.md`), Phase 12 d4.
 * Gate **G31** enforces what this module implements; records `MY-RG-0031`/`MY-RG-0032`.
 *
 * Recall is a SECOND path by which data reaches LLM context, and every law that guards the
 * render path guards this one:
 *
 * - **R1 banded-only output** — a retriever may rank by anything; it may RETURN only
 *   banded/committed content. Raw C1/C2 signals, scores, stage names, drive names, and
 *   assessment vocabulary never cross (MY-AD-0020 crosses the seam).
 * - **R2 read-only** — retrieval results are context, never fields of record; the rank path
 *   mutates nothing (enforced by purity: every function here returns new arrays).
 * - **R3 Veil-filtered** — returned text passes the same filter class as prompt-render (22 §13.2,
 *   20): no stage naming of the player, no "the system has noticed…" constructions.
 * - **R4 isolated** — retrieval is per-player-store scoped by construction; the corpus a
 *   retriever sees IS the scope boundary, and the scope tag is asserted on every hit.
 *
 * The firewall is fail-closed: a hit that cannot prove it is clean is DROPPED, not flagged.
 */

import { rrfFuse, type Ranked } from './LocalRetriever.js';

/** The forbidden vocabulary (M4's list, shared shape — assessment/stage/drive/meta terms). */
export const FORBIDDEN_RECALL_TOKENS: readonly string[] = [
  'infrared', 'magenta', 'amber', 'orange', 'green', 'teal', 'turquoise',
  'eros', 'agape', 'agency score', 'communion score', 'shadow quadrant',
  'darkaddiction', 'darkallergy', 'goldenaddiction', 'goldenallergy',
  'the system has noticed', 'we have observed that you', 'your assessment',
  'your diagnosis', 'your level', 'your stage', 'cci', 'competence score',
];

/** Metadata every recallable document must carry (R4 isolation + R1 banded proof). */
export interface Recallable {
  readonly id: string;
  /** The per-player scope this document belongs to (R4). The query must match it exactly. */
  readonly scope: string;
  /** True when the text is already banded/committed content (R1). Raw-signal docs are false. */
  readonly banded: boolean;
  /** The banded text that may be returned. */
  readonly text: string;
}

export interface FilteredHit {
  readonly id: string;
  readonly text: string;
  readonly score: number;
}

/** R1+R3 text check: no forbidden token, no meta-construction. */
export function isBandedText(text: string): boolean {
  const t = text.toLowerCase();
  return !FORBIDDEN_RECALL_TOKENS.some((tok) => t.includes(tok));
}

/**
 * The firewall over a ranked list (R1–R4). Fail-closed per hit:
 * drops hits whose document is not proven banded, fails the text check, or escapes the scope.
 * Purity (R2): reads nothing mutable, writes nothing — a pure filter over its inputs.
 */
export function filterRecall(
  ranked: Ranked,
  documents: ReadonlyMap<string, Recallable>,
  queryScope: string,
): readonly FilteredHit[] {
  const out: FilteredHit[] = [];
  for (const hit of ranked) {
    const doc = documents.get(hit.id);
    if (!doc) continue;              // unknown provenance → drop (M3 spirit: no citation, no line)
    if (doc.scope !== queryScope) continue; // R4: cross-user hit → drop, never surface
    if (!doc.banded) continue;       // R1: raw signal doc → drop
    if (!isBandedText(doc.text)) continue; // R1/R3: forbidden vocabulary → drop
    out.push({ id: doc.id, text: doc.text, score: hit.score });
  }
  return out;
}

// ── The optional embedding tier (48 §4; MY-RG-0032 pinning) ─────────────────────────────────

/**
 * The pinned model identity. A provider is constructed ONLY with exactly this id+version; a
 * mismatch is a hard error at construction (never a warning). The version suffix is part of the
 * pin: re-embedding the same corpus under a changed model requires an explicit rebuild receipt
 * (the version bump IS the receipt — nothing drifts silently).
 */
export const EMBEDDING_MODEL_PIN = 'all-MiniLM-L6-v2@pin-1';

export interface EmbeddingProvider {
  readonly modelId: string;
  /** Deterministic vector for text (the provider's own pinned model does the work). */
  embed(text: string): readonly number[];
}

/**
 * Construct a provider — fail-closed on pin mismatch (MY-RG-0032): an unpinned or differently
 * versioned model never enters the engine.
 */
export function createEmbeddingProvider(modelId: string, embed: (text: string) => readonly number[]): EmbeddingProvider {
  if (modelId !== EMBEDDING_MODEL_PIN) {
    throw new Error(
      `MY-RG-0032: embedding model "${modelId}" does not match the pin "${EMBEDDING_MODEL_PIN}" — ` +
        'bump the pin AND regenerate the index (rebuild receipt) or refuse.',
    );
  }
  return { modelId, embed };
}

/**
 * Semantic rank over the corpus using the provider (called ONLY when a provider exists).
 * Cosine similarity; deterministic given the provider.
 */
export function semanticRank(
  provider: EmbeddingProvider,
  corpus: readonly { readonly id: string; readonly text: string }[],
  queryText: string,
  limit = 20,
): Ranked {
  const q = provider.embed(queryText);
  const qNorm = Math.sqrt(q.reduce((a, v) => a + v * v, 0)) || 1e-9;
  const scored = corpus
    .map((c) => {
      const v = provider.embed(c.text);
      const vNorm = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1e-9;
      const dot = q.reduce((a, x, i) => a + x * (v[i] ?? 0), 0);
      return { id: c.id, score: dot / (qNorm * vNorm) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored;
}

/**
 * RRF-fuse the local and semantic lists when BOTH exist; local alone otherwise (48 §4's
 * degradation rule — the floor must be GOOD, not merely present).
 */
export function fuseRanks(local: Ranked, semantic: Ranked | null, k = 60, limit = 20): Ranked {
  if (!semantic || semantic.length === 0) return local.slice(0, limit);
  const toOrdinalMap = (r: Ranked): Map<string, number> => new Map(r.map((h, i) => [h.id, i + 1]));
  return rrfFuse([toOrdinalMap(local), toOrdinalMap(semantic)], k, limit);
}

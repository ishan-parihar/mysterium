import { isLine, ALL_LINES, type Line } from '$core/domain/Line.js';
import { depthOrdinal, type CurriculumHolon, type DepthLevel, type KnowledgeState } from '$core/curriculum/types.js';

/**
 * Integration Map — canon `33 §3.1` View 5 (`:152-163`).
 *
 * Shows how knowledge across subjects connects through shared structural patterns. The data is not
 * missing and nothing needs authoring: 55 of the 113 corpus holons already carry `isomorphisms`, each
 * with a `pattern`, a `targetConceptId`, a `targetDomain` and — unusually well thought of — a
 * `limitations` string saying where the analogy BREAKS.
 *
 * GATED ON `analyzed` DEPTH, per canon §3.2:170, and the gate is on the SOURCE concept. Canon's own
 * rule is that the map is "only visible at 'analyzed' depth"; the target is named by the isomorphism
 * rather than discovered, so gating the source is both the cheaper and the more faithful reading. A
 * learner who has not analysed a concept has not done the work this view reports.
 *
 * `limitations` IS SHOWN, and that is the whole reason this view is worth building. An integration map
 * that says "Recursion connects to Logic" teaches a false transfer; one that also says "recursion adds
 * execution order and stack depth" teaches where the analogy stops. Canon does not ask for the caveat,
 * and a map without it is the fabricated-insight class this project keeps paying for.
 */

export interface AnalogyEdge {
  readonly from: string;
  readonly fromName: string;
  readonly to: string;
  readonly toName: string;
  /** The shared structural pattern, verbatim from the corpus. */
  readonly pattern: string;
  /** Where the analogy stops, verbatim. Empty when the corpus author wrote none. */
  readonly limitation: string;
  /** `Line`, or the literal 'unmapped' when a holon names a non-canonical line. See `isLine`. */
  readonly fromLine: Line | 'unmapped';
  readonly toLine: Line | 'unmapped';
  /** True when the two concepts are in different domains — the whole point of the view. */
  readonly crossDomain: boolean;
}

export interface PatternCluster {
  readonly pattern: string;
  readonly members: readonly string[];
  readonly memberNames: readonly string[];
  /** How many of the members' links leave the member's own domain. */
  readonly crossDomainLinks: number;
}

const depthOf = (knowledge: KnowledgeState | undefined, id: string): DepthLevel =>
  knowledge?.conceptStates.get(id)?.depthLevel ?? 'absent';

const ANALYZED: DepthLevel = 'analyzed';

/**
 * Every isomorphism whose SOURCE has reached `analyzed`.
 *
 * The target may be unreached. That is not a leak and not an oversight: the isomorphism is a claim the
 * CORPUS makes about a structure, and showing where a concept connects is how a learner decides to go
 * there. The reach gate is on the understanding the learner already has, not on the destination.
 */
export function analogyEdges(
  holons: readonly CurriculumHolon[],
  knowledge: KnowledgeState | undefined,
): readonly AnalogyEdge[] {
  const byId = new Map(holons.map((h) => [h.id, h]));
  const out: AnalogyEdge[] = [];

  for (const holon of holons) {
    if (depthOrdinal(depthOf(knowledge, holon.id)) < depthOrdinal(ANALYZED)) continue;

    for (const iso of holon.isomorphisms ?? []) {
      // A target that does not resolve is a corpus defect, not a row to render. A map whose edge
      // points at nothing is worse than one missing an edge, and silently dropping it here would hide
      // the defect the same way G17's checks were needed for the ninth line.
      const target = byId.get(iso.targetConceptId);
      if (!target) continue;

      // `devMapping` is REQUIRED on `CurriculumHolon`, so this read is type-safe — but the radar's
      // first version asked for `holon.dev.primaryLine`, a field that does not exist, and returned all
      // zeros against all 113 real holons while its own tests passed because the fixture built the same
      // wrong shape. A required field is not the same as a present one, so both sides are read through
      // one narrow guard and a holon that ever lacks it degrades to 'unmapped' instead of throwing from
      // a render path. G17 is what actually guarantees the corpus; this is what keeps one bad holon
      // from blanking the whole view.
      const fromLine = isLine(holon.devMapping?.primaryLine) ? holon.devMapping.primaryLine : undefined;
      const toLine = isLine(target.devMapping?.primaryLine) ? target.devMapping.primaryLine : undefined;
      out.push({
        from: holon.id,
        fromName: holon.name,
        to: iso.targetConceptId,
        toName: target.name,
        pattern: iso.pattern,
        limitation: iso.limitations ?? '',
        fromLine: fromLine ?? 'unmapped',
        toLine: toLine ?? 'unmapped',
        crossDomain: fromLine !== undefined && toLine !== undefined && fromLine !== toLine,
      });
    }
  }

  // Cross-domain first: that is the connection the view exists to reveal, and a same-domain link is
  // usually already a prerequisite the learner can see on the Knowledge Map.
  return out.sort(
    (a, b) => Number(b.crossDomain) - Number(a.crossDomain) || a.pattern.localeCompare(b.pattern),
  );
}

/**
 * Clusters: concepts sharing one structural pattern, canon `:160` "clusters emerge naturally".
 *
 * Grouped on the pattern STRING, which is authored per isomorphism and so is the only honest key. A
 * one-member group is dropped — a cluster of one is a node, not a cluster, and listing it would pad
 * the view with the edges already drawn.
 *
 * AND THE CORPUS ALMOST DOES NOT SUPPORT THIS -- measured, not assumed. Over all 57 isomorphisms there
 * are 55 distinct pattern strings, and exactly ONE appears on two or more distinct sources:
 * `divide_and_conquer`, and that is a machine key rather than prose. Every other pattern is unique text
 * ("decomposition into smaller subproblems", "hierarchical organization with traversal"). The corpus
 * authors each pattern for the one edge it describes, so the only cluster that can ever form is two
 * edges whose author happened to reuse a string.
 *
 * The three members that do form it are the algorithm family -- cs.program.algorithms,
 * cs.program.alg.sorting and cs.program.alg.sorting.mergesort, all reaching into
 * math.foundations.algebra -- so the section is not empty, it is one real cluster the corpus supports.
 *
 * A normalised key (stemming, or clustering on the target's subject) was NOT written. It would invent
 * groupings the corpus does not assert, and a "patterns that repeat" panel reporting a relationship no
 * author stated is the same over-claiming this view is built to avoid. When the corpus grows shared
 * patterns this returns more than one cluster; the filter is already the multi-source one.
 */
export function patternClusters(edges: readonly AnalogyEdge[]): readonly PatternCluster[] {
  const byPattern = new Map<string, AnalogyEdge[]>();
  for (const e of edges) {
    const bucket = byPattern.get(e.pattern);
    if (bucket) bucket.push(e);
    else byPattern.set(e.pattern, [e]);
  }

  return [...byPattern.entries()]
    .filter(([, es]) => new Set(es.map((e) => e.from)).size > 1)
    .map(([pattern, es]) => ({
      pattern,
      members: [...new Set(es.map((e) => e.from))],
      memberNames: [...new Set(es.map((e) => e.fromName))],
      crossDomainLinks: es.filter((e) => e.crossDomain).length,
    }))
    .sort((a, b) => b.crossDomainLinks - a.crossDomainLinks || a.pattern.localeCompare(b.pattern));
}

/** Distinct lines represented among the edges — a summary count, never a score. */
export function linesInvolved(edges: readonly AnalogyEdge[]): readonly Line[] {
  const seen = new Set<Line>();
  for (const e of edges) {
    // An 'unmapped' side contributes no line — it is a holon that names a non-canonical capacity, and
    // counting it under a default would attribute a concept to a line the corpus never claimed.
    if (e.fromLine !== 'unmapped') seen.add(e.fromLine);
    if (e.toLine !== 'unmapped') seen.add(e.toLine);
  }
  return ALL_LINES.filter((l) => seen.has(l));
}

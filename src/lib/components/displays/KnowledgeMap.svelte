<script lang="ts">
  /**
   * KnowledgeMap — canon 33 §3.1 View 1: "The Knowledge Map".
   *
   * A navigable graph of every concept the learner has met. Nodes are concepts coloured by depth
   * (grey absent → turquoise transformed), edges are prerequisites, and gaps are visible as missing
   * nodes or thin connections. Clicking a node shows its depth and retention.
   *
   * WHY THIS IS HAND-LAID RATHER THAN D3. 33 §4.2 names "D3.js force-directed" for this view, and a
   * force layout is a simulation that runs every frame, which is the wrong thing for a static corpus
   * of a few hundred nodes that redraws on a click. The engine underneath is already complete —
   * `buildGraph` returns nodes and prerequisite edges, `detectGaps` finds the holes, `learningPath`
   * orders them — so the missing piece was always the VIEW, not the analysis. This lays the graph out
   * in concentric rings by prerequisite depth, which is deterministic (the same save always draws the
   * same map), keyboard-navigable, and needs no animation loop to be understood.
   *
   * ponytail: ring layout over a force simulation. If the map ever needs to show true prerequisite
   * CLUSTERING rather than order, a force layout earns its cost — swap `layout()` only; the data,
   * colours and selection all stay.
   */
  import { buildGraph, detectGaps } from '$core/curriculum/KnowledgeGraph.js';
  import type { CurriculumHolon } from '$core/curriculum/types.js';
  import { ALL_DEPTH_LEVELS, type DepthLevel, type KnowledgeState } from '$core/curriculum/types.js';
  import { layoutRings, type Placed } from './mapLayout.js';

  interface Props {
    knowledge: KnowledgeState;
    holons: readonly CurriculumHolon[];
  }

  let { knowledge, holons }: Props = $props();

  let selected = $state<string | null>(null);

  /** Depth colour, grey → turquoise. 33 §3.1 View 1 names the exact ramp. */
  const DEPTH_COLOR: Record<DepthLevel, string> = {
    absent: 'var(--mysterium-fg-subtle, #6b7280)',
    memorized: 'var(--mysterium-danger)',
    comprehended: 'var(--mysterium-warning)',
    applied: 'var(--mysterium-accent)',
    analyzed: 'var(--mysterium-success)',
    evaluated: 'var(--mysterium-info, #38bdf8)',
    transformed: 'var(--mysterium-purple, #a78bfa)',
  };

  const SIZE = 460;

  const graph = $derived(buildGraph(holons));

  /** Gaps are per-concept: a prerequisite the learner has not met. */
  const gapIds = $derived.by(() => {
    const encountered = new Set(knowledge.conceptStates.keys());
    const gaps = new Set<string>();
    for (const id of graph.nodes.keys()) {
      for (const missing of detectGaps(id, graph.adjacency, encountered)) gaps.add(missing);
    }
    return gaps;
  });

  function depthOf(id: string): DepthLevel {
    return knowledge.conceptStates.get(id)?.depthLevel ?? 'absent';
  }

  /**
   * Concentric rings: depth 0 (prerequisite roots) on the outside, the deepest in the middle. The
   * radius is derived from the node's ring so a gap in the middle reads as a hole, which is the
   * visual language 33 §3.1 asks for ("gaps are visible as missing nodes").
   */
  const placed = $derived.by(() =>
    layoutRings(graph.nodes.values(), graph.adjacency, depthOf, new Set(knowledge.conceptStates.keys()), SIZE),
  );

  const edges = $derived.by(() => {
    const byId = new Map(placed.map((p) => [p.node.id, p]));
    const out: { from: Placed; to: Placed }[] = [];
    for (const [to, froms] of graph.adjacency.entries()) {
      const toPlaced = byId.get(to);
      if (!toPlaced) continue;
      for (const from of froms) {
        const fromPlaced = byId.get(from);
        if (fromPlaced) out.push({ from: fromPlaced, to: toPlaced });
      }
    }
    return out;
  });

  const selectedNode = $derived(placed.find((p) => p.node.id === selected) ?? null);
  const selectedState = $derived(selected ? knowledge.conceptStates.get(selected) : undefined);
  const metCount = $derived(placed.filter((p) => p.met).length);

  const DEPTH_ORDER = ALL_DEPTH_LEVELS;
</script>

<div class="knowledge-map">
  <div class="map-header">
    <div>
      <p class="map-title">Knowledge Map</p>
      <p class="map-sub">
        {metCount} of {placed.length} concepts met
        {#if gapIds.size > 0}<span class="gap-note"> · {gapIds.size} unmet prerequisite{gapIds.size === 1 ? '' : 's'}</span>{/if}
      </p>
    </div>
    <ul class="legend" aria-label="Depth colour key">
      {#each DEPTH_ORDER as d (d)}
        <li class="legend-item">
          <span class="swatch" style="background: {DEPTH_COLOR[d]}" aria-hidden="true"></span>
          {d}
        </li>
      {/each}
    </ul>
  </div>

  <svg viewBox="0 0 {SIZE} {SIZE}" role="img" aria-label="Knowledge map: concepts arranged by prerequisite depth, coloured by depth level">
    {#each edges as e (e.from.node.id + '->' + e.to.node.id)}
      <line
        x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y}
        stroke="var(--mysterium-border)"
        stroke-width={e.to.met ? 1.5 : 0.75}
        opacity={e.to.met ? 0.6 : 0.25}
      />
    {/each}
    {#each placed as p (p.node.id)}
      <g
        class="node"
        class:selected={selected === p.node.id}
        role="button"
        tabindex="0"
        aria-label="{p.node.name}, {p.depth}"
        onclick={() => (selected = selected === p.node.id ? null : p.node.id)}
        onkeydown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); selected = selected === p.node.id ? null : p.node.id; } }}
      >
        <circle
          cx={p.x} cy={p.y}
          r={selected === p.node.id ? 7 : p.met ? 5 : 3.5}
          fill={DEPTH_COLOR[p.depth]}
          fill-opacity={p.met ? 1 : 0.35}
          stroke={selected === p.node.id ? 'var(--mysterium-fg)' : 'none'}
          stroke-width="1.5"
        />
        {#if p.met}
          <text x={p.x} y={p.y - 9} class="node-label">{p.node.name}</text>
        {/if}
      </g>
    {/each}
  </svg>

  {#if selectedNode}
    <div class="node-detail" role="status">
      <p class="detail-name">{selectedNode.node.name}</p>
      <p class="detail-depth">
        {selectedNode.met ? selectedNode.depth : 'not yet met'}
        {#if selectedState}
          · retained {Math.round(selectedState.retention * 100)}%
          · reviewed {selectedState.reviewCount}×
        {/if}
      </p>
    </div>
  {:else}
    <p class="hint">Select a concept to see its depth and retention.</p>
  {/if}
</div>

<style>
  .knowledge-map {
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-3);
  }
  .map-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--mysterium-space-3);
    flex-wrap: wrap;
  }
  .map-title {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-lg);
    color: var(--mysterium-fg);
    margin: 0;
  }
  .map-sub {
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    margin: 0;
  }
  .gap-note { color: var(--mysterium-warning); }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--mysterium-space-2);
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: var(--mysterium-text-xs);
    color: var(--mysterium-fg-muted);
  }
  .swatch {
    width: 9px; height: 9px; border-radius: 50%; display: inline-block;
  }
  svg { width: 100%; height: auto; }
  .node { cursor: pointer; }
  .node:focus { outline: none; }
  .node:focus circle { stroke: var(--mysterium-accent); stroke-width: 2; }
  .node-label {
    font-size: 8px;
    fill: var(--mysterium-fg-muted);
    text-anchor: middle;
    pointer-events: none;
  }
  .node-detail {
    padding: var(--mysterium-space-3);
    border: 1px solid var(--mysterium-border);
    border-radius: var(--mysterium-radius);
  }
  .detail-name {
    font-family: var(--mysterium-font-display);
    color: var(--mysterium-fg);
    margin: 0 0 2px;
  }
  .detail-depth { font-size: var(--mysterium-text-sm); color: var(--mysterium-fg-muted); margin: 0; }
  .hint { font-size: var(--mysterium-text-sm); color: var(--mysterium-fg-muted); margin: 0; font-style: italic; }
</style>

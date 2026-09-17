<script lang="ts">
  /**
   * /curriculum route — holonic curriculum hierarchy browser.
   * Shows the full program → degree → course → module → lesson → concept
   * tree with progress indicators, prerequisite chains, and depth status.
   */
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import Seo from '$lib/components/Seo.svelte';
  import RouteShell from '$lib/components/RouteShell.svelte';
  import Card from '$lib/components/Card.svelte';
  import Stack from '$lib/components/Stack.svelte';
  import { gameStore, setSignificator } from '$lib/stores/gameStore.js';
  import { loadSignificatorFromStorage } from '$lib/stores/saveHydration.js';
  import type { CurriculumHolon, DepthLevel } from '$core/curriculum/types.js';
  import { depthOrdinal } from '$core/curriculum/types.js';

  const sig = $derived($gameStore.significator);
  const knowledge = $derived(sig?.knowledge);

  let allHolons = $state<CurriculumHolon[]>([]);
  let expandedNodes = $state<Set<string>>(new Set());
  let selectedNode = $state<string | null>(null);

  onMount(() => {
    if (!browser) return;
    if (!$gameStore.significator) {
      const loaded = loadSignificatorFromStorage();
      if (loaded) setSignificator(loaded);
    }
    import('$core/curriculum/index.js').then(async ({ getCurriculumRegistry, seedCurriculumRegistry }) => {
      seedCurriculumRegistry();
      const registry = getCurriculumRegistry();
      allHolons = [...registry.getAll()];
      // Auto-expand top-level nodes
      for (const h of allHolons) {
        if (h.parentId === null) expandedNodes.add(h.id);
      }
    });
  });

  // Build parent→children map
  const childMap = $derived.by(() => {
    const map = new Map<string, CurriculumHolon[]>();
    for (const h of allHolons) {
      if (h.parentId) {
        const list = map.get(h.parentId) ?? [];
        list.push(h);
        map.set(h.parentId, list);
      }
    }
    return map;
  });

  // Root nodes (no parent)
  const rootNodes = $derived(allHolons.filter(h => h.parentId === null));

  function toggleExpand(id: string) {
    if (expandedNodes.has(id)) {
      expandedNodes.delete(id);
    } else {
      expandedNodes.add(id);
    }
    expandedNodes = new Set(expandedNodes);
  }

  function selectNode(id: string) {
    selectedNode = selectedNode === id ? null : id;
  }

  function getDepth(conceptId: string): DepthLevel | undefined {
    return knowledge?.conceptStates.get(conceptId)?.depthLevel;
  }

  function getRetention(conceptId: string): number | undefined {
    return knowledge?.conceptStates.get(conceptId)?.retention;
  }

  function depthColor(level: DepthLevel): string {
    const ord = depthOrdinal(level);
    if (ord >= 5) return 'var(--mysterium-success)';
    if (ord >= 3) return 'var(--mysterium-accent)';
    if (ord >= 1) return 'var(--mysterium-warning)';
    return 'var(--mysterium-fg-muted)';
  }

  function retentionColor(retention: number): string {
    if (retention > 0.7) return 'var(--mysterium-success)';
    if (retention > 0.4) return 'var(--mysterium-warning)';
    return 'var(--mysterium-danger)';
  }

  function depthLabel(level: DepthLevel | undefined): string {
    if (!level) return '—';
    return level.charAt(0).toUpperCase() + level.slice(1);
  }

  const LEVEL_ICONS: Record<string, string> = {
    program: '🏛',
    degree: '🎓',
    course: '📚',
    module: '📦',
    unit: '📄',
    lesson: '📖',
    branch: '🌿',
    subject: '📂',
    topic: '💬',
    concept: '💡',
    instance: '✏️',
  };
</script>

<Seo
  title="Curriculum"
  description="Browse the holonic curriculum hierarchy — prerequisites, depth status, and learning progress."
  indexable={false}
/>

<RouteShell title="Curriculum" back="/">
  {#if allHolons.length === 0}
    <div class="empty-state">
      <p class="empty-title">No curriculum loaded</p>
      <p class="empty-desc">Curriculum data will appear here once available.</p>
    </div>
  {:else}
    <Stack gap="space-4">
      <!-- Stats bar -->
      <Card padding="space-3">
        <div class="stats-bar">
          <span class="stat">{allHolons.length} concepts</span>
          <span class="stat-sep">·</span>
          <span class="stat">{rootNodes.length} root{rootNodes.length !== 1 ? 's' : ''}</span>
          <span class="stat-sep">·</span>
          <span class="stat">{knowledge?.conceptStates.size ?? 0} studied</span>
        </div>
      </Card>

      <!-- Tree -->
      <Card padding="space-4">
        <div class="tree" role="tree" aria-label="Curriculum hierarchy">
          {#each rootNodes as node (node.id)}
            {@render treeNode(node, 0)}
          {/each}
        </div>
      </Card>

      <!-- Detail panel -->
      {#if selectedNode}
        {@const holon = allHolons.find(h => h.id === selectedNode)}
        {#if holon}
          <Card padding="space-4">
            <div class="detail-panel">
              <div class="detail-header">
                <span class="detail-icon">{LEVEL_ICONS[holon.level] ?? '📄'}</span>
                <div class="detail-meta">
                  <h3 class="detail-name">{holon.name}</h3>
                  <span class="detail-level">{holon.level}</span>
                </div>
              </div>
              <p class="detail-desc">{holon.description}</p>

              <!-- Depth status -->
              {#if getDepth(holon.id) || getRetention(holon.id) !== undefined}
                {@const depth = getDepth(holon.id)}
                {@const retention = getRetention(holon.id)}
                <div class="detail-section">
                  <span class="detail-section-title">Learning Status</span>
                  <div class="detail-metrics">
                    {#if depth}
                      <div class="detail-metric">
                        <span class="detail-metric-label">Depth</span>
                        <span class="detail-metric-value" style="color: {depthColor(depth)}">{depthLabel(depth)}</span>
                      </div>
                    {/if}
                    {#if retention !== undefined}
                      <div class="detail-metric">
                        <span class="detail-metric-label">Retention</span>
                        <span class="detail-metric-value" style="color: {retentionColor(retention)}">{Math.round(retention * 100)}%</span>
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}

              <!-- Prerequisites -->
              {#if holon.prerequisites.length > 0}
                <div class="detail-section">
                  <span class="detail-section-title">Prerequisites</span>
                  <div class="detail-tags">
                    {#each holon.prerequisites as prereqId (prereqId)}
                      {@const prereqDepth = getDepth(prereqId)}
                      <button class="detail-tag" class:studied={prereqDepth !== undefined} onclick={() => selectNode(prereqId)}>
                        {prereqId.split('.').pop()}
                        {#if prereqDepth}
                          <span class="tag-check">✓</span>
                        {/if}
                      </button>
                    {/each}
                  </div>
                </div>
              {/if}

              <!-- Cross-branch prerequisites -->
              {#if holon.crossBranchPrerequisites && holon.crossBranchPrerequisites.length > 0}
                <div class="detail-section">
                  <span class="detail-section-title">Cross-Branch Prerequisites</span>
                  <div class="detail-tags">
                    {#each holon.crossBranchPrerequisites as cbId (cbId)}
                      {@const cbDepth = getDepth(cbId)}
                      <button class="detail-tag cross-branch" class:studied={cbDepth !== undefined} onclick={() => selectNode(cbId)}>
                        {cbId}
                        {#if cbDepth}
                          <span class="tag-check">✓</span>
                        {/if}
                      </button>
                    {/each}
                  </div>
                </div>
              {/if}

              <!-- Isomorphisms -->
              {#if holon.isomorphisms.length > 0}
                <div class="detail-section">
                  <span class="detail-section-title">Structural Isomorphisms</span>
                  {#each holon.isomorphisms as iso (iso.targetConceptId)}
                    <div class="iso-item">
                      <span class="iso-pattern">{iso.pattern}</span>
                      <span class="iso-arrow">→</span>
                      <button class="detail-tag" onclick={() => selectNode(iso.targetConceptId)}>{iso.targetConceptId.split('.').pop()}</button>
                      <span class="iso-domain">{iso.targetDomain}</span>
                    </div>
                  {/each}
                </div>
              {/if}

              <!-- Dev mapping -->
              <div class="detail-section">
                <span class="detail-section-title">Developmental Mapping</span>
                <div class="detail-metrics">
                  <div class="detail-metric">
                    <span class="detail-metric-label">Primary Line</span>
                    <span class="detail-metric-value">{holon.devMapping.primaryLine}</span>
                  </div>
                  <div class="detail-metric">
                    <span class="detail-metric-label">Stage Range</span>
                    <span class="detail-metric-value">{holon.devMapping.stageRange.min} → {holon.devMapping.stageRange.max}</span>
                  </div>
                </div>
              </div>

              <!-- Depth rubric -->
              <div class="detail-section">
                <span class="detail-section-title">Depth Rubric</span>
                <div class="rubric-grid">
                  {#each Object.entries(holon.depthRubric.levels) as [level, entry] (level)}
                    <div class="rubric-row">
                      <span class="rubric-level" style="color: {depthColor(level as DepthLevel)}">{level}</span>
                      <div class="rubric-bar">
                        <div class="rubric-bar-fill" style="width: {entry.threshold * 100}%"></div>
                      </div>
                      <span class="rubric-threshold">{Math.round(entry.threshold * 100)}%</span>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          </Card>
        {/if}
      {/if}
    </Stack>
  {/if}
</RouteShell>

{#snippet treeNode(node: CurriculumHolon, depth: number)}
  {@const children = childMap.get(node.id) ?? []}
  {@const nodeDepth = getDepth(node.id)}
  {@const nodeRetention = getRetention(node.id)}
  {@const isExpanded = expandedNodes.has(node.id)}
  {@const isSelected = selectedNode === node.id}

  <div class="tree-node" style="padding-left: {depth * 1.5}rem" role="treeitem" aria-selected={isSelected} aria-expanded={children.length > 0 ? isExpanded : undefined}>
    <div
      class="tree-node-btn"
      class:expanded={isExpanded}
      class:selected={isSelected}
      class:studied={nodeDepth !== undefined}
      role="button"
      tabindex="0"
      onclick={() => selectNode(node.id)}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectNode(node.id); } }}
    >
      {#if children.length > 0}
        <button class="expand-btn" onclick={(e) => { e.stopPropagation(); toggleExpand(node.id); }} aria-label="{isExpanded ? 'Collapse' : 'Expand'} {node.name}">
          <span class="expand-icon">{isExpanded ? '▾' : '▸'}</span>
        </button>
      {:else}
        <span class="expand-spacer"></span>
      {/if}

      <span class="node-icon">{LEVEL_ICONS[node.level] ?? '📄'}</span>
      <span class="node-name">{node.name}</span>
      <span class="node-level">{node.level}</span>

      {#if nodeDepth}
        <span class="node-depth" style="color: {depthColor(nodeDepth)}">{depthLabel(nodeDepth)}</span>
      {/if}

      {#if nodeRetention !== undefined}
        <span class="node-retention" style="color: {retentionColor(nodeRetention)}">{Math.round(nodeRetention * 100)}%</span>
      {/if}

      {#if children.length > 0}
        <span class="node-count">{children.length}</span>
      {/if}
    </div>

    {#if isExpanded && children.length > 0}
      <div class="tree-children" role="group">
        {#each children as child (child.id)}
          {@render treeNode(child, depth + 1)}
        {/each}
      </div>
    {/if}
  </div>
{/snippet}

<style>
  .empty-state {
    text-align: center;
    padding: var(--mysterium-space-7) var(--mysterium-space-4);
  }
  .empty-title {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-sm);
    font-weight: 600;
    color: var(--mysterium-fg-muted);
    margin: 0 0 var(--mysterium-space-1);
  }
  .empty-desc {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-xs);
    color: var(--mysterium-fg-muted);
    font-style: italic;
    margin: 0;
  }

  /* Stats */
  .stats-bar {
    display: flex;
    align-items: center;
    gap: var(--mysterium-space-2);
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-xs);
    color: var(--mysterium-fg-muted);
  }
  .stat-sep { opacity: 0.3; }

  /* Tree */
  .tree {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .tree-node {
    display: flex;
    flex-direction: column;
  }
  .tree-node-btn {
    display: flex;
    align-items: center;
    gap: var(--mysterium-space-2);
    padding: var(--mysterium-space-1) var(--mysterium-space-2);
    background: none;
    border: 1px solid transparent;
    border-radius: var(--mysterium-radius-sm);
    cursor: pointer;
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-xs);
    color: var(--mysterium-fg);
    text-align: left;
    width: 100%;
    transition: background var(--mysterium-duration-fast) var(--mysterium-ease);
  }
  .tree-node-btn:hover {
    background: color-mix(in srgb, var(--mysterium-accent) 8%, transparent);
  }
  .tree-node-btn.selected {
    background: color-mix(in srgb, var(--mysterium-accent) 15%, transparent);
    border-color: color-mix(in srgb, var(--mysterium-accent) 30%, transparent);
  }
  .tree-node-btn.studied .node-name {
    color: var(--mysterium-accent);
  }
  .expand-btn {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--mysterium-fg-muted);
    line-height: 1;
    width: 1rem;
    height: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .expand-icon { font-size: 0.7rem; }
  .expand-spacer { width: 1rem; flex-shrink: 0; }
  .node-icon { flex-shrink: 0; }
  .node-name { flex: 1; font-weight: 500; }
  .node-level {
    color: var(--mysterium-fg-muted);
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .node-depth, .node-retention {
    font-size: 0.6rem;
    font-weight: 600;
  }
  .node-count {
    background: var(--mysterium-surface);
    padding: 0.1rem 0.4rem;
    border-radius: var(--mysterium-radius-full);
    font-size: 0.55rem;
    color: var(--mysterium-fg-muted);
  }
  .tree-children {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  /* Detail panel */
  .detail-panel {
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-3);
  }
  .detail-header {
    display: flex;
    align-items: flex-start;
    gap: var(--mysterium-space-3);
  }
  .detail-icon { font-size: 1.5rem; }
  .detail-meta { display: flex; flex-direction: column; gap: 2px; }
  .detail-name {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-sm);
    font-weight: 700;
    color: var(--mysterium-fg);
    margin: 0;
  }
  .detail-level {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-xs);
    color: var(--mysterium-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .detail-desc {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-xs);
    color: var(--mysterium-fg-muted);
    line-height: 1.5;
    margin: 0;
  }
  .detail-section {
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-1);
  }
  .detail-section-title {
    font-family: var(--mysterium-font-display);
    font-size: 0.6rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--mysterium-accent);
  }
  .detail-metrics {
    display: flex;
    gap: var(--mysterium-space-3);
  }
  .detail-metric {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .detail-metric-label {
    font-size: 0.55rem;
    color: var(--mysterium-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .detail-metric-value {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-xs);
    font-weight: 700;
    color: var(--mysterium-fg);
  }
  .detail-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--mysterium-space-1);
  }
  .detail-tag {
    font-family: var(--mysterium-font-body);
    font-size: 0.6rem;
    padding: 2px 6px;
    border-radius: var(--mysterium-radius-sm);
    background: var(--mysterium-surface);
    border: 1px solid var(--mysterium-border);
    color: var(--mysterium-fg-muted);
    cursor: pointer;
    transition: all var(--mysterium-duration-fast) var(--mysterium-ease);
  }
  .detail-tag:hover { background: var(--mysterium-surface-elevated); color: var(--mysterium-fg); }
  .detail-tag.studied { border-color: var(--mysterium-accent); color: var(--mysterium-accent); }
  .detail-tag.cross-branch { border-style: dashed; }
  .tag-check { font-size: 0.5rem; margin-left: 2px; }

  /* Isomorphisms */
  .iso-item {
    display: flex;
    align-items: center;
    gap: var(--mysterium-space-1);
    font-size: 0.6rem;
  }
  .iso-pattern { color: var(--mysterium-fg-muted); font-style: italic; }
  .iso-arrow { color: var(--mysterium-fg-muted); }
  .iso-domain { color: var(--mysterium-fg-muted); font-size: 0.55rem; }

  /* Rubric */
  .rubric-grid {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .rubric-row {
    display: grid;
    grid-template-columns: 6rem 1fr 2.5rem;
    align-items: center;
    gap: var(--mysterium-space-1);
  }
  .rubric-level {
    font-size: 0.6rem;
    text-transform: capitalize;
    font-weight: 500;
  }
  .rubric-bar {
    height: 4px;
    background: var(--mysterium-surface);
    border-radius: var(--mysterium-radius-full);
    overflow: hidden;
  }
  .rubric-bar-fill {
    height: 100%;
    background: var(--mysterium-accent);
    border-radius: var(--mysterium-radius-full);
  }
  .rubric-threshold {
    font-size: 0.55rem;
    color: var(--mysterium-fg-muted);
    text-align: right;
  }
</style>

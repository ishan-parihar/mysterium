<script lang="ts">
  /**
   * /curriculum/progress route — curriculum progress analytics dashboard.
   * Shows per-branch completion, depth progression, cross-domain isomorphism
   * mastery, and knowledge health metrics.
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
  import { ALL_DEPTH_LEVELS, depthOrdinal } from '$core/curriculum/types.js';
  import { computeKnowledgeHealth } from '$core/curriculum/CurriculumBridge.js';

  const sig = $derived($gameStore.significator);
  const knowledge = $derived(sig?.knowledge);

  let allHolons = $state<CurriculumHolon[]>([]);

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
    });
  });

  // Knowledge health metrics
  const healthMetrics = $derived(
    knowledge ? computeKnowledgeHealth(knowledge, allHolons.length) : null
  );

  // Per-branch analysis: group holons by their top-level branch prefix
  const branchAnalysis = $derived.by(() => {
    if (allHolons.length === 0) return [];

    // Group by first two segments of ID (e.g., "cs" from "cs.foundations.algorithms")
    const branchMap = new Map<string, CurriculumHolon[]>();
    for (const h of allHolons) {
      const branch = h.id.split('.').slice(0, 2).join('.');
      const list = branchMap.get(branch) ?? [];
      list.push(h);
      branchMap.set(branch, list);
    }

    const branches: {
      id: string;
      name: string;
      total: number;
      studied: number;
      avgDepth: number;
      avgRetention: number;
      depthDistribution: { level: DepthLevel; count: number }[];
    }[] = [];

    for (const [branchId, holons] of branchMap) {
      let studied = 0;
      let totalDepth = 0;
      let totalRetention = 0;
      let depthCount = 0;
      const distMap = new Map<DepthLevel, number>();
      for (const level of ALL_DEPTH_LEVELS) distMap.set(level, 0);

      for (const h of holons) {
        const cs = knowledge?.conceptStates.get(h.id);
        if (cs) {
          studied++;
          totalDepth += depthOrdinal(cs.depthLevel);
          totalRetention += cs.retention;
          depthCount++;
          distMap.set(cs.depthLevel, (distMap.get(cs.depthLevel) ?? 0) + 1);
        }
      }

      branches.push({
        id: branchId,
        name: holons[0]?.name?.split(' ').slice(0, 2).join(' ') ?? branchId,
        total: holons.length,
        studied,
        avgDepth: depthCount > 0 ? totalDepth / depthCount / (ALL_DEPTH_LEVELS.length - 1) : 0,
        avgRetention: depthCount > 0 ? totalRetention / depthCount : 0,
        depthDistribution: ALL_DEPTH_LEVELS.map(level => ({ level, count: distMap.get(level) ?? 0 })).filter(d => d.count > 0),
      });
    }

    return branches.sort((a, b) => b.studied - a.studied);
  });

  // Cross-domain isomorphism mastery
  const isomorphismMastery = $derived.by(() => {
    if (allHolons.length === 0 || !knowledge) return [];

    const results: {
      conceptId: string;
      conceptName: string;
      isomorphisms: { targetId: string; mastered: boolean; targetDepth: DepthLevel | undefined }[];
    }[] = [];

    for (const h of allHolons) {
      if (h.isomorphisms.length === 0) continue;
      const isoResults = h.isomorphisms.map(iso => ({
        targetId: iso.targetConceptId,
        mastered: knowledge.conceptStates.has(iso.targetConceptId) &&
          depthOrdinal(knowledge.conceptStates.get(iso.targetConceptId)!.depthLevel) >= depthOrdinal('comprehended'),
        targetDepth: knowledge.conceptStates.get(iso.targetConceptId)?.depthLevel,
      }));
      results.push({
        conceptId: h.id,
        conceptName: h.name,
        isomorphisms: isoResults,
      });
    }

    return results;
  });

  // Overall stats
  const totalStudied = $derived(knowledge?.conceptStates.size ?? 0);
  const totalRetained = $derived.by(() => {
    if (!knowledge) return 0;
    let count = 0;
    for (const cs of knowledge.conceptStates.values()) {
      if (cs.retention > 0.7) count++;
    }
    return count;
  });

  function depthColor(level: DepthLevel): string {
    const ord = depthOrdinal(level);
    if (ord >= 5) return 'var(--mysterium-success)';
    if (ord >= 3) return 'var(--mysterium-accent)';
    if (ord >= 1) return 'var(--mysterium-warning)';
    return 'var(--mysterium-fg-muted)';
  }

  function retentionColor(r: number): string {
    if (r > 0.7) return 'var(--mysterium-success)';
    if (r > 0.4) return 'var(--mysterium-warning)';
    return 'var(--mysterium-danger)';
  }

  function coveragePercent(studied: number, total: number): number {
    return total > 0 ? Math.round((studied / total) * 100) : 0;
  }
</script>

<Seo
  title="Curriculum Progress"
  description="Track your curriculum progress — per-branch completion, depth progression, and cross-domain mastery."
  indexable={false}
/>

<RouteShell title="Curriculum Progress" back="/curriculum">
  {#if allHolons.length === 0}
    <div class="empty-state">
      <p class="empty-title">No curriculum loaded</p>
      <p class="empty-desc">Curriculum data will appear here once available.</p>
    </div>
  {:else}
    <Stack gap="space-4">
      <!-- Overall Stats -->
      <Card padding="space-4">
        <div class="overall-stats">
          <div class="stat-card">
            <span class="stat-value">{totalStudied}</span>
            <span class="stat-label">concepts studied</span>
          </div>
          <div class="stat-card">
            <span class="stat-value" style="color: var(--mysterium-success)">{totalRetained}</span>
            <span class="stat-label">strongly retained</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{allHolons.length}</span>
            <span class="stat-label">total concepts</span>
          </div>
          {#if healthMetrics}
            {@const pct = Math.round(healthMetrics.conceptCoverage * 100)}
            <div class="stat-card">
              <span class="stat-value" style="color: {pct > 50 ? 'var(--mysterium-success)' : 'var(--mysterium-warning)'}">{pct}%</span>
              <span class="stat-label">coverage</span>
            </div>
          {/if}
        </div>
      </Card>

      <!-- Per-Branch Progress -->
      <Card padding="space-4">
        <h3 class="section-title">Branch Progress</h3>
        <div class="branch-list">
          {#each branchAnalysis as branch (branch.id)}
            {@const pct = coveragePercent(branch.studied, branch.total)}
            <div class="branch-row">
              <div class="branch-header">
                <span class="branch-name">{branch.name}</span>
                <span class="branch-count">{branch.studied}/{branch.total}</span>
              </div>
              <div class="branch-bar">
                <div class="branch-bar-fill" style="width: {pct}%; background: {pct > 70 ? 'var(--mysterium-success)' : pct > 30 ? 'var(--mysterium-warning)' : 'var(--mysterium-accent)'}"></div>
              </div>
              <div class="branch-metrics">
                <span class="branch-metric">
                  depth: <span style="color: {branch.avgDepth > 0.5 ? 'var(--mysterium-success)' : 'var(--mysterium-fg-muted)'}">{Math.round(branch.avgDepth * 100)}%</span>
                </span>
                <span class="branch-metric">
                  retention: <span style="color: {retentionColor(branch.avgRetention)}">{Math.round(branch.avgRetention * 100)}%</span>
                </span>
              </div>
              <!-- Depth distribution mini-bar -->
              {#if branch.depthDistribution.length > 0}
                <div class="mini-depth-bar">
                  {#each branch.depthDistribution as d (d.level)}
                    <div
                      class="mini-segment"
                      style="width: {(d.count / branch.total) * 100}%; background: {depthColor(d.level)}"
                      title="{d.level}: {d.count}"
                    ></div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </Card>

      <!-- Cross-Domain Isomorphism Mastery -->
      {#if isomorphismMastery.length > 0}
        <Card padding="space-4">
          <h3 class="section-title">Cross-Domain Isomorphisms</h3>
          <div class="iso-list">
            {#each isomorphismMastery as item (item.conceptId)}
              <div class="iso-item">
                <span class="iso-concept">{item.conceptName}</span>
                <div class="iso-targets">
                  {#each item.isomorphisms as iso (iso.targetId)}
                    <span class="iso-target" class:mastered={iso.mastered}>
                      → {iso.targetId.split('.').pop()}
                      {#if iso.targetDepth}
                        <span class="iso-depth" style="color: {depthColor(iso.targetDepth)}">{iso.targetDepth}</span>
                      {/if}
                    </span>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </Card>
      {/if}

      <!-- Knowledge Health (from CCI) -->
      {#if healthMetrics}
        <Card padding="space-4">
          <h3 class="section-title">Knowledge Health</h3>
          <div class="health-grid">
            <div class="health-metric">
              <span class="health-label">Coverage</span>
              <div class="health-bar">
                <div class="health-bar-fill" style="width: {healthMetrics.conceptCoverage * 100}%; background: var(--mysterium-accent)"></div>
              </div>
              <span class="health-value">{Math.round(healthMetrics.conceptCoverage * 100)}%</span>
            </div>
            <div class="health-metric">
              <span class="health-label">Average Depth</span>
              <div class="health-bar">
                <div class="health-bar-fill" style="width: {healthMetrics.averageDepth * 100}%; background: var(--mysterium-success)"></div>
              </div>
              <span class="health-value">{Math.round(healthMetrics.averageDepth * 100)}%</span>
            </div>
            <div class="health-metric">
              <span class="health-label">Retention</span>
              <div class="health-bar">
                <div class="health-bar-fill" style="width: {healthMetrics.retentionHealth * 100}%; background: {healthMetrics.retentionHealth > 0.7 ? 'var(--mysterium-success)' : 'var(--mysterium-warning)'}"></div>
              </div>
              <span class="health-value">{Math.round(healthMetrics.retentionHealth * 100)}%</span>
            </div>
            <div class="health-metric">
              <span class="health-label">Integration</span>
              <div class="health-bar">
                <div class="health-bar-fill" style="width: {healthMetrics.integrationDensity * 100}%; background: var(--mysterium-accent)"></div>
              </div>
              <span class="health-value">{Math.round(healthMetrics.integrationDensity * 100)}%</span>
            </div>
            <div class="health-metric">
              <span class="health-label">Misconceptions</span>
              <div class="health-bar">
                <div class="health-bar-fill" style="width: {healthMetrics.misconceptionLoad * 100}%; background: {healthMetrics.misconceptionLoad > 0.3 ? 'var(--mysterium-danger)' : 'var(--mysterium-success)'}"></div>
              </div>
              <span class="health-value">{Math.round(healthMetrics.misconceptionLoad * 100)}%</span>
            </div>
          </div>
        </Card>
      {/if}
    </Stack>
  {/if}
</RouteShell>

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

  .section-title {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: var(--mysterium-tracking-wider);
    color: var(--mysterium-accent);
    margin: 0 0 var(--mysterium-space-3);
  }

  /* Overall Stats */
  .overall-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--mysterium-space-3);
  }
  .stat-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--mysterium-space-1);
    padding: var(--mysterium-space-3);
    border-radius: var(--mysterium-radius-md);
    background: color-mix(in srgb, var(--mysterium-surface) 50%, transparent);
    border: 1px solid color-mix(in srgb, var(--mysterium-fg-muted) 10%, transparent);
  }
  .stat-value {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-lg);
    font-weight: 700;
    color: var(--mysterium-fg);
  }
  .stat-label {
    font-family: var(--mysterium-font-body);
    font-size: 0.6rem;
    color: var(--mysterium-fg-muted);
    text-transform: uppercase;
    letter-spacing: var(--mysterium-tracking-wide);
    text-align: center;
  }

  /* Branch Progress */
  .branch-list {
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-3);
  }
  .branch-row {
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-1);
  }
  .branch-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .branch-name {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-xs);
    font-weight: 600;
    color: var(--mysterium-fg);
    text-transform: capitalize;
  }
  .branch-count {
    font-family: var(--mysterium-font-body);
    font-size: 0.6rem;
    color: var(--mysterium-fg-muted);
  }
  .branch-bar {
    height: 6px;
    background: var(--mysterium-surface);
    border-radius: var(--mysterium-radius-full);
    overflow: hidden;
  }
  .branch-bar-fill {
    height: 100%;
    border-radius: var(--mysterium-radius-full);
    transition: width var(--mysterium-duration-slow) var(--mysterium-ease-out);
  }
  .branch-metrics {
    display: flex;
    gap: var(--mysterium-space-3);
  }
  .branch-metric {
    font-family: var(--mysterium-font-body);
    font-size: 0.6rem;
    color: var(--mysterium-fg-muted);
  }
  .mini-depth-bar {
    display: flex;
    height: 3px;
    border-radius: var(--mysterium-radius-full);
    overflow: hidden;
    gap: 1px;
  }
  .mini-segment {
    height: 100%;
    border-radius: var(--mysterium-radius-full);
    min-width: 2px;
  }

  /* Isomorphisms */
  .iso-list {
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-2);
  }
  .iso-item {
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-1);
    padding: var(--mysterium-space-2);
    border-radius: var(--mysterium-radius-sm);
    background: color-mix(in srgb, var(--mysterium-surface) 30%, transparent);
  }
  .iso-concept {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-xs);
    font-weight: 600;
    color: var(--mysterium-fg);
  }
  .iso-targets {
    display: flex;
    flex-wrap: wrap;
    gap: var(--mysterium-space-2);
  }
  .iso-target {
    font-family: var(--mysterium-font-body);
    font-size: 0.6rem;
    padding: 2px 6px;
    border-radius: var(--mysterium-radius-sm);
    background: color-mix(in srgb, var(--mysterium-fg-muted) 10%, transparent);
    color: var(--mysterium-fg-muted);
    border: 1px solid color-mix(in srgb, var(--mysterium-fg-muted) 20%, transparent);
    text-transform: capitalize;
  }
  .iso-target.mastered {
    background: color-mix(in srgb, var(--mysterium-success) 15%, transparent);
    color: var(--mysterium-success);
    border-color: color-mix(in srgb, var(--mysterium-success) 30%, transparent);
  }
  .iso-depth {
    font-size: 0.55rem;
    margin-left: 2px;
    font-weight: 600;
  }

  /* Health Grid */
  .health-grid {
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-2);
  }
  .health-metric {
    display: grid;
    grid-template-columns: 6rem 1fr 3rem;
    align-items: center;
    gap: var(--mysterium-space-2);
  }
  .health-label {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-xs);
    color: var(--mysterium-fg-muted);
  }
  .health-bar {
    height: 6px;
    background: var(--mysterium-surface);
    border-radius: var(--mysterium-radius-full);
    overflow: hidden;
  }
  .health-bar-fill {
    height: 100%;
    border-radius: var(--mysterium-radius-full);
    transition: width var(--mysterium-duration-slow) var(--mysterium-ease-out);
  }
  .health-value {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-xs);
    font-weight: 600;
    color: var(--mysterium-fg);
    text-align: right;
  }
</style>

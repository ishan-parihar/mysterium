<script lang="ts">
  /**
   * The one body all three auditor surfaces render (33 §7).
   *
   * The three surfaces differ in audience, drill-down ceiling and footer rule — not in structure.
   * Three copies of that structure would mean three places where a consent decision could be
   * re-derived by accident, so the routes are thin: this component owns the shape, the route owns
   * the scope, the backing label and the one rule 33 §7.3 states about that surface.
   */
  import { onMount } from 'svelte';
  import AuditorShell from '$lib/components/auditor/AuditorShell.svelte';
  import { projectForAuditor, type ProjectionResult } from '$lib/components/auditor/auditorProjection.js';
  import { loadSignificatorFromStorage } from '$lib/stores/saveHydration.js';
  import { liveShares, SURFACE_ENTRY_LEVEL, type AuditorSurface } from '$lib/stores/shareStore.js';
  import { LADDER_LEVELS, type LadderLevel } from '$core/domain/articulationLadder.js';
  import type { Significator } from '$core/domain/Significator.js';

  type Granularity = 'summary' | 'line' | 'line-stage' | 'line-stage-cell';

  interface Props {
    surface: AuditorSurface;
    /** The deepest level this surface's scope whitelists (33 §7.0/§7.1). */
    ceiling: LadderLevel;
    /** The 33 §7.3 rule that binds THIS surface, rendered as its footer. */
    rule: string;
  }

  let { surface, ceiling, rule }: Props = $props();

  let sig: Significator | undefined = $state();
  let granularity: Granularity = $state('summary');
  let window: '30d' | '90d' | 'all' = $state('90d');
  // `surface` is a prop, so the initial value must be derived from it rather than captured —
  // reading a prop in a $state initialiser freezes it at mount (svelte state_referenced_locally).
  let result: ProjectionResult = $state({
    refusal: 'loading the live Significator…',
    rendered: [],
    ceiling: 'L1',
  });

  onMount(() => {
    // The honesty gate at its source: no save means no Significator, and projectForAuditor
    // refuses rather than fabricating one. Rehydration, never construction.
    sig = loadSignificatorFromStorage() ?? undefined;
  });

  // Every change here is an EXPLICIT request through the law (33 §7.2.3): a granularity step or a
  // grant revocation re-issues the projection. No background refresh pushes detail into a view.
  $effect(() => {
    const depth = LADDER_LEVELS.indexOf(granularity === 'summary' ? 'L1'
      : granularity === 'line' ? 'L2'
      : granularity === 'line-stage' ? 'L3'
      : ceiling);
    const requested = LADDER_LEVELS.slice(
      LADDER_LEVELS.indexOf(SURFACE_ENTRY_LEVEL[surface]),
      Math.min(depth + 1, LADDER_LEVELS.indexOf(ceiling) + 1),
    );
    // Dereference the store so the effect SUBSCRIBES. `void liveShares` read the variable, not
    // its value, so a revocation in another tab never re-ran this effect and the open view kept
    // rendering a revoked grant — a consent failure, caught by driving the real page rather than
    // by any test. `void $liveShares` is the subscribe: the value is discarded, the dependency
    // is not.
    void $liveShares;
    result = projectForAuditor(surface, sig, requested.length ? requested : ['L1'], sig?.currentStage ?? 'Red');
  });
</script>

<AuditorShell
  {surface}
  consent={result.consent}
  refusal={result.refusal}
  level={SURFACE_ENTRY_LEVEL[surface]}
  {granularity}
  {window}
  onGranularity={(g) => (granularity = g)}
  onWindow={(w) => (window = w)}
>
  {#snippet children()}
    {#if result.refusal}
      <div class="blocked">{result.refusal}</div>
    {:else}
      {#each result.rendered as level (level.level)}
        <div class="level">
          <h2>
            {level.level}
            <!-- AL3: the presentation articulation is chosen from the PLAYER's stage, not the
                 auditor's. A player at Infrared reads the same grant in concrete markers. -->
            <span class="art">{level.presentation}</span>
          </h2>
          <p class="narrative">{level.payload?.narrative}</p>
          {#if level.payload?.metrics}
            <!-- 33 §7.3: metric-bearing is CORRECT here. Stage labels, rung indices, rubric names
                 and theta values render verbatim; the Veil felt-sense components are not reused. -->
            <dl>
              {#each Object.entries(level.payload.metrics) as [k, v] (k)}
                <div><dt>{k}</dt><dd>{v}</dd></div>
              {/each}
            </dl>
          {/if}
        </div>
      {/each}
      <p class="ladder">
        ceiling {result.ceiling} · ladder {LADDER_LEVELS.join(' ')} · a grant to
        {result.ceiling} admits traversal up to it, never past it. {rule}
      </p>
    {/if}
  {/snippet}
</AuditorShell>

<style>
  .blocked{background:var(--mysterium-surface);border:1px solid var(--mysterium-border);
           border-left:2px solid var(--mysterium-accent);padding:16px;font-size:13px;
           color:var(--mysterium-fg-muted)}
  .level{background:var(--mysterium-surface);border:1px solid var(--mysterium-border);
         padding:18px 20px;margin-bottom:12px}
  h2{font-family:var(--mysterium-font-display);font-size:17px;letter-spacing:.08em;
     text-transform:uppercase;color:var(--mysterium-accent);margin:0 0 4px}
  .art{font-size:10px;letter-spacing:.12em;color:var(--mysterium-fg-muted);text-transform:uppercase}
  .narrative{font-size:13.5px;color:var(--mysterium-fg);margin:0 0 12px;line-height:1.6}
  dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:0}
  dt{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--mysterium-muted);margin-bottom:3px}
  dd{margin:0;font-family:var(--mysterium-font-display);font-size:15px;color:var(--mysterium-fg)}
  .ladder{margin-top:16px;font-size:11px;color:var(--mysterium-fg-muted);letter-spacing:.04em;line-height:1.6}
</style>

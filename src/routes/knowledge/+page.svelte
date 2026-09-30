<script lang="ts">
  /**
   * /knowledge route — curriculum knowledge state dashboard.
   * Shows concept coverage, depth distribution, retention health,
   * and study recommendations based on the player's KnowledgeState.
   */
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import Seo from '$lib/components/Seo.svelte';
  import RouteShell from '$lib/components/RouteShell.svelte';
  import Card from '$lib/components/Card.svelte';
  import Stack from '$lib/components/Stack.svelte';
  import KnowledgeDashboard from '$lib/components/displays/KnowledgeDashboard.svelte';
  import KnowledgeMap from '$lib/components/displays/KnowledgeMap.svelte';
  import { gameStore, setSignificator } from '$lib/stores/gameStore.js';
  import { loadSignificatorFromStorage } from '$lib/stores/saveHydration.js';

  const sig = $derived($gameStore.significator);
  const knowledge = $derived(sig?.knowledge);

  // Count total concepts in the registry for coverage calculation
  let totalConcepts = $state(0);
  /**
   * The registry's holons, for the Knowledge Map. Canon 33 §3.1 View 1 draws the concept graph from
   * these, so the page needs the objects and not just the count — `getCurriculumRegistry()` is the
   * only owner of that set and this reads it rather than re-deriving from the curriculum files.
   *
   * SEEDED HERE, NOT ONLY AT THE LAYOUT. The layout seeds on mount for every route, but that is an
   * async import racing this page's own mount, so the first render saw an empty registry and the
   * page reported "no curriculum data" with zero nodes. Seeding is idempotent (`isRegistrySeeded`),
   * so calling it from a consumer that renders early costs nothing and removes the race; the layout
   * keeps the boot call for every other route.
   */
  let holons = $state<readonly import('$core/curriculum/types.js').CurriculumHolon[]>([]);
  let registryReady = $state(false);

  onMount(() => {
    if (!browser) return;
    if (!$gameStore.significator) {
      const loaded = loadSignificatorFromStorage();
      if (loaded) setSignificator(loaded);
    }
    // Dynamic import to avoid circular dependency.
    void Promise.all([
      import('$core/curriculum/CurriculumSeed.js'),
      import('$core/curriculum/CurriculumRegistry.js'),
    ]).then(([{ seedCurriculumRegistry }, { getCurriculumRegistry }]) => {
      seedCurriculumRegistry();
      const registry = getCurriculumRegistry();
      totalConcepts = registry.count();
      holons = registry
        .conceptIds()
        .map((id) => registry.get(id))
        .filter((h): h is NonNullable<typeof h> => h !== undefined);
      registryReady = true;
    });
  });
</script>

<Seo
  title="Knowledge State"
  description="View your curriculum knowledge — concept coverage, depth distribution, and retention health."
  indexable={false}
/>

<RouteShell title="Knowledge State" back="/profile">
  {#if !sig}
    <p class="empty-state">No save found. Enter the world to begin your learning journey.</p>
  {:else}
    <Stack gap="space-5">
      <Card padding="space-5">
        <KnowledgeDashboard {knowledge} totalConceptsInCurriculum={totalConcepts} />
      </Card>
      <Card padding="space-5">
        {#if registryReady && holons.length > 0 && knowledge}
          <KnowledgeMap {knowledge} {holons} />
        {:else}
          <p class="empty-state">
            {#if registryReady}
              No curriculum data yet — begin studying to build your knowledge profile.
            {:else}
              Loading the concept map…
            {/if}
          </p>
        {/if}
      </Card>
    </Stack>
  {/if}
</RouteShell>

<style>
  .empty-state {
    color: var(--mysterium-fg-muted);
    font-style: italic;
    text-align: center;
    padding: var(--mysterium-space-7) var(--mysterium-space-4);
  }
</style>

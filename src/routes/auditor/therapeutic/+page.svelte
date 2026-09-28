<script lang="ts">
  /**
   * Therapeutic Pane — 33 §7.1. Therapists, counsellors. Scope: `therapeutic`.
   * Hierarchy: integration trend → surfacing per line×quadrant → integration history → drive trend.
   *
   * L4 is the deepest level this scope whitelists (33 §7.0), which is why its ceiling is L4 and
   * not the L5 the other surfaces reach. And it never renders a diagnostic category: crisis
   * routes through the deterministic crisis layer (43 §4.7), never through a projection.
   */
  import Seo from '$lib/components/Seo.svelte';
  import RouteShell from '$lib/components/RouteShell.svelte';
  import AuditorSurface from '$lib/components/auditor/AuditorSurface.svelte';
</script>

<svelte:head>
  <Seo title="Therapeutic Pane" description="A consented clinical-adjacent view of integration patterns." />
</svelte:head>

<RouteShell title="Therapeutic Pane" back="/journal" backLabel="Journal">
  <AuditorSurface
    surface="therapeutic"
    ceiling="L4"
    rule="Patterns and trends only — no diagnostic categories, no crisis content (33 §7.3, 43 §4.7)."
  />
</RouteShell>

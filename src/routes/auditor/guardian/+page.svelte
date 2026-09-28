<script lang="ts">
  /**
   * Guardian Mirror — 33 §7.1. Parents, guardians-of-record. Scope: `guardian`.
   * Hierarchy: wellbeing overview → milestone timeline → engagement pattern → theta-attention.
   *
   * Thin by design: the surface renders a *description*, not a projection (33 §7.0/§7.1), so the
   * structure, the shell and the consent law all live in shared components. This route exists to
   * name WHICH surface and WHICH rule, so the three cannot drift into three implementations.
   */
  import Seo from '$lib/components/Seo.svelte';
  import RouteShell from '$lib/components/RouteShell.svelte';
  import AuditorSurface from '$lib/components/auditor/AuditorSurface.svelte';
</script>

<svelte:head>
  <Seo title="Guardian Mirror" description="A consented guardian view of developmental progress." />
</svelte:head>

<RouteShell title="Guardian Mirror" back="/profile" backLabel="Profile">
  <AuditorSurface
    surface="guardian"
    ceiling="L5"
    rule="Aggregate wellbeing only — the closed register stays closed on every surface (16 §2.4)."
  />
</RouteShell>

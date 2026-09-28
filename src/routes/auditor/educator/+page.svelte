<script lang="ts">
  /**
   * Educator Desk — 33 §7.1. Teachers, tutors. Scope: `educator`.
   * Hierarchy: branch rungs → depth distribution → prerequisite gaps → mastery sequence → packs.
   *
   * "Cohort-of-one" is load-bearing: 33 §7.3 forbids cross-player comparison, so this surface
   * renders ONE Significator per session. There is deliberately no multi-auditee mode — adding
   * one later by accident is the failure this comment exists to prevent.
   */
  import Seo from '$lib/components/Seo.svelte';
  import RouteShell from '$lib/components/RouteShell.svelte';
  import AuditorSurface from '$lib/components/auditor/AuditorSurface.svelte';
</script>

<svelte:head>
  <Seo title="Educator Desk" description="A consented educator view of one learner." />
</svelte:head>

<RouteShell title="Educator Desk" back="/curriculum" backLabel="Curriculum">
  <AuditorSurface
    surface="educator"
    ceiling="L3"
    rule="One auditee per session; batch comparison is out of scope (33 §7.3, 38's recognition discipline)."
  />
</RouteShell>

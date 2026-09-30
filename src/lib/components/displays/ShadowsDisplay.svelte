<script lang="ts">
  /**
   * ShadowsDisplay — how much is active, and nothing about which quadrant.
   *
   * Veil: 20 §11.1 puts shadow — "quadrant names, intensities, ledger entries" — in the CLOSED
   * register class, never player-readable at any stage. This component used to render a per-
   * quadrant label ('Clinging' / 'Resisting' / 'Bypassing' / 'Refusing'), a per-quadrant count, and
   * a per-quadrant severity band. Renaming `DarkAddiction` to 'Clinging' did not veil it: the
   * grouping KEY was still the quadrant and the band was still the intensity, so the player read
   * the ledger one renamed column at a time.
   *
   * What remains is the aggregate: how many patterns are live and how loud the loudest is. That is
   * felt-sense (ladder L0, open) and it is what a player can act on between sessions. The quadrant
   * breakdown belongs to the auditor register, which renders through the law-holder
   * (`renderLevel`, 16 §10.4) with a consent link.
   */
  import Badge from '$lib/components/Badge.svelte';
  import type { ShadowLedger } from '$core/domain/ShadowLedger.js';

  interface Props {
    shadows: ShadowLedger;
  }

  let { shadows }: Props = $props();

  const active = $derived(shadows.entries.filter((e) => e.resolvedAt === null));

  // ONE band for the whole ledger, from the loudest entry. The per-quadrant split is what leaked.
  const peak = $derived(active.length === 0 ? 0 : Math.max(...active.map((e) => e.severity)));

  function intensityBand(severity: number): string {
    if (severity > 0.7) return 'intense';
    if (severity > 0.4) return 'present';
    return 'faint';
  }
</script>

<div class="shadows-display">
  {#if active.length === 0}
    <p class="none-active">No active patterns. The field is clear.</p>
  {:else}
    <div class="shadows-summary">
      <span class="count">{active.length} active</span>
    </div>
    <div class="shadow-aggregate">
      <Badge variant={peak > 0.7 ? 'danger' : peak > 0.4 ? 'warning' : 'info'}>
        {intensityBand(peak)}
      </Badge>
    </div>
  {/if}
</div>

<style>
  .shadows-display {
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-2);
  }

  .none-active {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    font-style: italic;
    margin: 0;
  }

  .shadows-summary {
    display: flex;
    align-items: center;
    gap: var(--mysterium-space-2);
  }

  .count {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-warning);
    font-weight: 500;
  }

  .shadow-aggregate {
    display: flex;
    align-items: center;
    gap: var(--mysterium-space-2);
  }
</style>

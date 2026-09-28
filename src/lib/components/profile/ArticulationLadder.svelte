/**
 * The Articulation Ladder, rendered — the player's own surface (16 §10.5).
 *
 * WHY A COMPONENT AND NOT MORE LINES IN /profile. The payloads for all eight levels were already
 * derived by `buildLadderPayloads` and the CLI already traversed them; `/profile` rendered L1 and
 * L2 inline, hardcoded, with no selector. Adding four more hardcoded levels would have produced a
 * wall of prose with no way to choose a depth, and would have made the register boundary
 * (`closed` levels are refused in the self register) a per-level hand-rolled check.
 *
 * THE BOUNDARY IS THE POINT. L4 and L5 are the `closed` register class (16 §10.5 table) and
 * `renderLevel` REFUSES them in the self register at any stage (20 §11.1). So the selectable set
 * here is exactly `SELF_RENDER_LEVELS` — L0, L1, L2, L3, L6, L7 — and the component does not
 * maintain its own list, because a hand-kept list is a second place for the boundary to drift.
 * L4/L5 are reachable only through a consented auditor grant, which is what the auditor routes
 * are for.
 *
 * AL3 — presentation, not availability, is stage-articulated. `renderLevel` derives the
 * presentation from the PLAYER's stage, so the same level reads as concrete markers for an
 * Infrared-stage player and as full structure for a Teal one. The component displays what the
 * law-holder returns and decides nothing itself.
 *
 * AL1 — one ladder, no privilege tiers. The deepest levels are available to the SELF too; there is
 * no gate here that the auditor has and the player does not.
 */

<script lang="ts">
  import { renderLevel } from '$core/domain/articulationLadder.js';
  import type { LadderLevel, Register, RenderedLevel } from '$core/domain/articulationLadder.js';
  import { buildLadderPayloads, SELF_RENDER_LEVELS } from '$core/presentation/ladderProjections.js';
  import type { Significator } from '$core/domain/Significator.js';
  import Card from '$lib/components/Card.svelte';
  import Stack from '$lib/components/Stack.svelte';

  interface Props {
    readonly significator: Significator;
    /** The self register by default; the auditor register is what the auditor surfaces pass. */
    readonly register?: Register;
  }

  const { significator, register = 'self' }: Props = $props();

  /** The plain-language name of each level, for the heading. 16 §10.5's articulation column. */
  const LABELS: Readonly<Record<string, string>> = {
    L0: 'felt-sense',
    L1: 'whole-person span',
    L2: 'line profile',
    L3: 'where growth waits',
    L4: 'line × stage × quadrant',
    L5: 'polarity cell',
    L6: 'evidence',
    L7: 'provenance',
  };

  // The open register class, in ladder order, and only the levels this register may render. Asking
  // the law-holder for the whole set is the point: a level it refuses must not appear as a
  // button, because a button that renders nothing is a dead control.
  const levels = $derived.by(() => {
    const payloads = buildLadderPayloads(significator);
    return SELF_RENDER_LEVELS.map((level) => ({
      level,
      rendered: renderLevel({ register, level, playerStage: significator.currentStage }, payloads),
    })).filter((row) => row.rendered.allowed);
  });

  // Default to the shallowest renderable level, so a player who has never seen the ladder gets
  // felt-sense (L0) rather than being dropped into provenance (L7).
  let selected = $state<LadderLevel>('L0');
  const current = $derived.by<LadderLevel | undefined>(() => {
    const wanted = levels.find((row) => row.level === selected);
    // If the selected level is not renderable in this register (a player on a level the law
    // refuses), fall back to the first that is rather than rendering nothing.
    return wanted?.level ?? levels[0]?.level;
  });
  const shown = $derived.by<RenderedLevel | undefined>(() =>
    levels.find((row) => row.level === current)?.rendered,
  );
</script>

<Stack gap="space-3">
  <h2 class="section-title">Articulation</h2>
  <Card padding="space-5">
    <div class="ladder-nav" role="tablist" aria-label="Articulation ladder levels">
      {#each levels as row (row.level)}
        <button
          type="button"
          role="tab"
          class="ladder-tab"
          class:selected={row.level === current}
          aria-selected={row.level === current}
          onclick={() => { selected = row.level; }}
        >
          {row.level}
        </button>
      {/each}
    </div>

    {#if shown}
      <div class="ladder-line">
        {shown.level} · {LABELS[shown.level] ?? shown.level}
        <span class="ladder-pres">({shown.presentation})</span>
      </div>
      <p class="ladder-narrative">{shown.payload?.narrative ?? ''}</p>

      {#if shown.reason}
        <p class="ladder-refusal">{shown.reason}</p>
      {/if}
    {:else}
      <p class="ladder-narrative">No articulation is available in this register.</p>
    {/if}
  </Card>
</Stack>


<style>
  .ladder-nav {
    display: flex;
    flex-wrap: wrap;
    gap: space-1;
    margin-bottom: space-3;
  }
  .ladder-tab {
    /* A focus ring on every tab: the accent is the focus colour project-wide (WCAG 1.4.11). */
    outline: 2px solid transparent;
    background: transparent;
    border: 1px solid var(--mysterium-fg-muted);
    color: var(--mysterium-fg-muted);
    border-radius: var(--mysterium-radius-sm, 4px);
    padding: space-1 space-2;
    font: inherit;
    font-size: 0.875rem;
    cursor: pointer;
  }
  .ladder-tab:hover { color: var(--mysterium-fg); border-color: var(--mysterium-fg-muted); }
  .ladder-tab:focus-visible { outline-color: var(--mysterium-accent); }
  .ladder-tab.selected {
    color: var(--mysterium-fg);
    border-color: var(--mysterium-fg);
    font-weight: 600;
  }
  .ladder-line {
    font-size: 0.875rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--mysterium-fg-muted);
    margin-bottom: space-2;
  }
  .ladder-pres { text-transform: none; letter-spacing: 0; }
  .ladder-narrative { margin: 0; line-height: 1.6; }
  .ladder-refusal {
    margin: space-2 0 0;
    font-size: 0.8125rem;
    color: var(--mysterium-fg-muted);
  }
</style>

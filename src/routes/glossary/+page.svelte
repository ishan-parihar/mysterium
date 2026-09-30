<script lang="ts">
  /**
   * /glossary route — definitions for Mysterium terminology.
   * Parity with CLI `mysterium glossary` command.
   * ponytail: consumes shared GLOSSARY_TERMS from src/core/data/glossary.ts.
   */
  import Seo from '$lib/components/Seo.svelte';
  import RouteShell from '$lib/components/RouteShell.svelte';
  import Card from '$lib/components/Card.svelte';
  import Stack from '$lib/components/Stack.svelte';
  import { GLOSSARY_TERMS } from '$core/data/glossary.js';

  /**
   * PLAYER-AUDIENCE TERMS ONLY.
   *
   * This page rendered the whole corpus, which put all thirteen `audience: 'advanced'` rows on
   * screen for every visitor: `rayProfile`, `G_z / P_z`, raw `DarkAddiction`/`GoldenAllergy` quadrant
   * names, and the CCI composite's dimensions. Two of those are the CLOSED register class (20 §11.1 —
   * "polarity … shadow (quadrant names, intensities)"), so a player could read the scoring key and
   * the clinical vocabulary from a page whose whole job is explaining the game's own language.
   *
   * G55 guards TEMPLATES; this leak came through DATA — the template correctly interpolated
   * `{term.def}` — so the corpus carries its own audience and the page honours it. The advanced rows
   * are still here, still exported, and still reachable by an auditor surface that asks for them by
   * name; they are simply not on the player's glossary.
   */
  const PLAYER_TERMS = GLOSSARY_TERMS.filter((t) => t.audience === 'player');

  let search = $state('');
  const filtered = $derived(
    search.trim() === ''
      ? PLAYER_TERMS
      : PLAYER_TERMS.filter((t) =>
          t.term.toLowerCase().includes(search.toLowerCase()) ||
          t.def.toLowerCase().includes(search.toLowerCase())
        )
  );
</script>

<Seo
  title="Glossary"
  description="Definitions for Mysterium terminology — Holon, Significator, Line, Stage, Module, Modality, and more."
/>

<RouteShell title="Glossary" back="/">
  <Stack gap="space-4">
    <input
      class="search-input"
      type="text"
      placeholder="Search terms..."
      value={search}
      oninput={(e) => (search = e.currentTarget.value)}
      aria-label="Search glossary"
    />

    {#if filtered.length === 0}
      <Card padding="space-5">
        <p class="empty">No terms match "{search}".</p>
      </Card>
    {:else}
      <Stack gap="space-2">
        <!--
          The key is NOT `entry.term`. Tier1 and tier2 both define 'Transformation', and a keyed
          each over a non-unique key is a hard Svelte invariant failure that renders NOTHING — the
          whole page came up blank, from the one nav item called Glossary. Index is the correct key
          here because the list is a static corpus, not a reorderable collection.
        -->
        {#each filtered as entry, i (i)}
          <Card padding="space-4" variant="default">
            <div class="term-entry">
              <h3 class="term-name">{entry.term}</h3>
              <p class="term-def">{entry.def}</p>
            </div>
          </Card>
        {/each}
      </Stack>
    {/if}

    <p class="footer-note">
      For the full theoretical foundation, see the docs/foundations/ directory.
    </p>
  </Stack>
</RouteShell>

<style>
  .search-input {
    width: 100%;
    padding: var(--mysterium-space-3) var(--mysterium-space-4);
    background: var(--mysterium-surface);
    border: 1px solid var(--mysterium-border);
    border-radius: var(--mysterium-radius);
    color: var(--mysterium-fg);
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-base);
    transition: border-color var(--mysterium-duration-fast) var(--mysterium-ease),
                box-shadow var(--mysterium-duration-fast) var(--mysterium-ease);
    -webkit-tap-highlight-color: transparent;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--mysterium-accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--mysterium-accent) 20%, transparent);
  }

  .search-input::placeholder {
    color: var(--mysterium-fg-muted);
  }

  .term-entry {
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-2);
  }

  .term-name {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-md);
    font-weight: 600;
    color: var(--mysterium-accent);
    margin: 0;
    letter-spacing: var(--mysterium-tracking-wide);
  }

  .term-def {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    line-height: var(--mysterium-leading-relaxed);
    color: var(--mysterium-fg);
    margin: 0;
  }

  .empty {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    font-style: italic;
    text-align: center;
    margin: 0;
  }

  .footer-note {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-xs);
    color: var(--mysterium-fg-muted);
    text-align: center;
    font-style: italic;
    margin: 0;
  }
</style>

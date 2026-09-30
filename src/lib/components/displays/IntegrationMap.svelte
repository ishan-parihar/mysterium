<script lang="ts">
  /**
   * IntegrationMap — canon `33 §3.1` View 5 (`:152-163`), gated on `analyzed` depth by `§3.2:170`.
   *
   * NOT A FORCE-DIRECTED GRAPH. `33 §4.2:256` names a "network graph of cross-domain connections" and a
   * force simulation is the obvious reading, but this is a list of AUTHORED connections — 52 of them,
   * each with a stated pattern and, where the corpus author judged one was needed, a stated limitation.
   * A force layout would scatter them and hide the text, and the text is the content: "Recursion
   * connects to Mathematical Induction" is the claim, and the diagram is decoration around it. The
   * Knowledge Map's ring layout is reused in spirit — deterministic, keyboard-navigable, no animation
   * loop — and this goes further, because an authored list needs no layout at all.
   *
   * THE LIMITATION IS SHOWN, and that is the reason the view is worth building. A map that says
   * "Recursion connects to Logic" teaches a false transfer; one that also says "recursion adds execution
   * order and stack depth" teaches where the analogy stops. Canon does not ask for the caveat, and 15
   * of the 52 real links carry one — authored where a transfer is genuinely dangerous, which is better
   * than a uniform rate. Where there is no caveat the row says so rather than presenting the transfer
   * as complete.
   */
  import type { CurriculumHolon, KnowledgeState } from '$core/curriculum/types.js';
  import { depthOrdinal } from '$core/curriculum/types.js';
  import { analogyEdges, patternClusters } from './integrationModel.js';

  interface Props {
    holons: readonly CurriculumHolon[];
    knowledge: KnowledgeState | undefined;
  }

  let { holons, knowledge }: Props = $props();

  const edges = $derived(analogyEdges(holons, knowledge));
  const clusters = $derived(patternClusters(edges));

  /**
   * How close the learner is to the gate, in words.
   *
   * The view is empty for most of a learner's life, and an empty panel with no explanation reads as a
   * broken feature. Canon §3.2:170 makes the gate a deliberate choice — the map is only visible once the
   * work has been done — so the gate is stated as the reason, in the learner's own register.
   */
  const gateNote = $derived.by(() => {
    const reached = holons.filter((h) => depthOrdinal(knowledge?.conceptStates.get(h.id)?.depthLevel ?? 'absent') >= 4).length;
    if (reached === 0) return 'Connections appear here once you have taken a concept as far as analysis. Not yet.';
    return `${reached} concept${reached === 1 ? '' : 's'} analysed — here is what they connect to.`;
  });
</script>

<section class="integration" aria-labelledby="integration-heading">
  <h2 id="integration-heading" class="section-title">What connects across subjects</h2>

  {#if edges.length === 0}
    <p class="empty">{gateNote}</p>
  {:else}
    <p class="lede">
      {gateNote} {edges.filter((e) => e.crossDomain).length} of {edges.length} cross a subject boundary.
    </p>

    <ul class="edges" aria-label="Connections between concepts">
      {#each edges as e (e.from + '→' + e.to + e.pattern)}
        <li class="edge" class:cross={e.crossDomain}>
          <div class="head">
            <span class="name">{e.fromName}</span>
            <span class="arrow" aria-hidden="true">→</span>
            <span class="name">{e.toName}</span>
            {#if e.crossDomain}
              <span class="cross-badge">{e.fromLine} ↔ {e.toLine}</span>
            {/if}
          </div>
          <p class="pattern">Shares the structure “{e.pattern}”.</p>
          {#if e.limitation.length > 0}
            <p class="limitation">Where it stops: {e.limitation}</p>
          {:else}
            <p class="limitation muted">The corpus records no caveat on this one.</p>
          {/if}
        </li>
      {/each}
    </ul>

    {#if clusters.length > 0}
      <div class="clusters">
        <h3 class="clusters-title">Patterns that repeat</h3>
        <ul>
          {#each clusters as c (c.pattern)}
            <li>
              <span class="pattern-name">{c.pattern}</span>
              <span class="members">{c.memberNames.join(', ')}</span>
              <span class="count">{c.crossDomainLinks} across subjects</span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  {/if}
</section>

<style>
  .integration {
    display: block;
  }

  .lede,
  .empty {
    color: var(--mysterium-fg-muted);
    font-size: var(--mysterium-text-sm);
    margin-top: var(--mysterium-space-2);
  }

  .edges {
    list-style: none;
    margin: var(--mysterium-space-4) 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-3);
  }

  .edge {
    border: 1px solid var(--mysterium-border);
    border-left: 2px solid var(--mysterium-border);
    border-radius: var(--mysterium-radius-md);
    padding: var(--mysterium-space-3);
  }

  /* The cross-domain links get the accent edge. It is the one distinction the view leads with, so it
     has to be visible before any text is read. */
  .edge.cross {
    border-left-color: var(--mysterium-accent);
  }

  .head {
    display: flex;
    align-items: baseline;
    gap: var(--mysterium-space-2);
    flex-wrap: wrap;
  }

  .name {
    font-size: var(--mysterium-text-sm);
  }

  .arrow {
    color: var(--mysterium-fg-muted);
  }

  .cross-badge {
    font-size: var(--mysterium-text-xs);
    color: var(--mysterium-fg-muted);
    border: 1px solid var(--mysterium-border);
    border-radius: var(--mysterium-radius-sm);
    padding: 0 var(--mysterium-space-1);
  }

  .pattern,
  .limitation {
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    margin-top: var(--mysterium-space-1);
  }

  .limitation {
    color: var(--mysterium-fg-subtle, var(--mysterium-fg-muted));
  }

  .limitation.muted {
    font-style: italic;
    opacity: 0.75;
  }

  .clusters {
    margin-top: var(--mysterium-space-4);
  }

  .clusters-title {
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    margin: 0 0 var(--mysterium-space-2);
  }

  .clusters ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-2);
    font-size: var(--mysterium-text-sm);
  }

  .clusters li {
    display: flex;
    gap: var(--mysterium-space-3);
    align-items: baseline;
    flex-wrap: wrap;
  }

  .pattern-name {
    color: var(--mysterium-fg);
  }

  .members,
  .count {
    color: var(--mysterium-fg-muted);
  }
</style>

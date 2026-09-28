<script lang="ts">
  /**
   * /delegate route — the council dispatcher, as the player is allowed to see it.
   *
   * The kernel owns the decision: `dispatchCouncil` reads `TRIGGER_TABLE` top to bottom and the
   * first firing row wins, so crisis preempts everything, a threshold assembles the whole
   * foreground council, and the ordinary encounter is the last row rather than a competitor. This
   * route shows that law and lets a request be made against it — it never decides anything itself.
   *
   * The one thing this route must not do is print the internal vocabulary. `43 §4.7` rule 13
   * ("ROLE VOCABULARY IS INTERNAL") forbids showing role ids, trigger slugs, tool names and proposal
   * kinds to a player, and the trigger table is built entirely in that register. So every string this
   * page renders comes from `councilView`'s projection, and nothing here names a role: presence is
   * reported as a count, and a summon is described by the frame it produces.
   *
   * Determinism is the property worth seeing: the same request against the same state summons the
   * same thing every time, and the seed reorders presence without ever choosing it. That is
   * `MY-AD-0022` / `43 §3.3`, and the page says so rather than implying the choice was the player's.
   */

  import Seo from '$lib/components/Seo.svelte';
  import RouteShell from '$lib/components/RouteShell.svelte';
  import Card from '$lib/components/Card.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Stack from '$lib/components/Stack.svelte';
  import {
    councilTriggerViews,
    dispatchView,
    observationFor,
    CRISIS_TRIGGER,
    type CouncilTriggerView,
    type DispatchView,
  } from '$lib/orchestration/councilView.js';
  import type { SummonTrigger } from '$core/orchestration/dispatcher.js';

  const triggers: readonly CouncilTriggerView[] = councilTriggerViews();

  let selected = $state<SummonTrigger>('encounter-open');
  let seed = $state('web');
  let result = $state<DispatchView | null>(null);

  const selectedRow = $derived(triggers.find((t) => t.trigger === selected) ?? null);
  const isBypass = $derived(selected === CRISIS_TRIGGER);

  function request(trigger: SummonTrigger): void {
    selected = trigger;
    // The canonical minimal state for that row (`observationForTrigger`) is the only supported way
    // to ask for a named summons, so a request here cannot construct a state the table would
    // never have produced.
    result = dispatchView({ ...observationFor(trigger), seed });
  }
</script>

<Seo
  title="Council"
  description="What the Mysterium council does when something changes — the pacing law, in plain language, with a dispatch you can request."
/>

<RouteShell title="Council" back="/">
  <Stack gap="space-4">
    <Card>
      <p class="lede">
        Presence is a pacing instrument, not a mood. One table decides who is present, and it is
        read top to bottom: the first row that matches your state answers it, and the rows above it
        preempt it. The same state summons the same thing, every time — nothing here, and nothing in
        the session loop, is chosen by a model deciding you would enjoy it.
      </p>
    </Card>

    <Card>
      <h3 class="section-title">The table</h3>
      <Stack gap="space-2">
        {#each triggers as row (row.trigger)}
          <div class="row" class:row-selected={row.trigger === selected}>
            <div class="row-head">
              <span class="rank">{row.rank}</span>
              <span class="occasion">{row.occasion}</span>
              {#if row.bypass}<Badge variant="danger">the game stops</Badge>{/if}
              {#if row.infrastructureOnly}<Badge variant="default">off-stage</Badge>{/if}
            </div>
            <p class="frame">The frame becomes: {row.frameBecomes}.</p>
            <p class="meta">
              {row.presenceCount === 0 ? 'nobody meets the player' : `${row.presenceCount} figure${row.presenceCount === 1 ? '' : 's'} appear`}
              · called by {row.calledBy}
            </p>
          </div>
        {/each}
      </Stack>
    </Card>

    <Card>
      <h3 class="section-title">Ask for a dispatch</h3>
      <Stack gap="space-3">
        <p class="lede">
          A dispatch here is a drill against the table, not a summon you can keep: each row is
          answered from its canonical state, so what you see is exactly what that row would produce
          in a session.
        </p>

        <label class="field">
          <span class="field-label">Which moment</span>
          <select class="select" bind:value={selected}>
            {#each triggers as row (row.trigger)}
              <option value={row.trigger}>{row.rank}. {row.occasion}</option>
            {/each}
          </select>
        </label>

        <label class="field">
          <span class="field-label">Ordering seed</span>
          <input class="input" bind:value={seed} />
          <span class="hint">
            The seed reorders who is present. It never changes who is summoned — a different seed
            gives the same council in a different order.
          </span>
        </label>

        {#if isBypass}
          <p class="bypass-note">
            This is the bypass row, and it is offered read-only on purpose. It is the one trigger
            that stops the game being a game, and it belongs to a safety rule rather than to a
            request. The dispatch below is shown so the law is legible, not so it can be enacted on
            demand.
          </p>
        {/if}

        <Button variant="primary" onclick={() => request(selected)}>
          Run the dispatch
        </Button>
      </Stack>
    </Card>

    {#if selectedRow}
      <Card>
        <h3 class="section-title">The row you selected</h3>
        <p class="lede">{selectedRow.occasion} — the frame becomes {selectedRow.frameBecomes}.</p>
        <p class="meta">Ranked {selectedRow.rank} of {triggers.length}; nothing above it matched.</p>
      </Card>
    {/if}

    {#if result}
      <Card>
        <h3 class="section-title">What the table decided</h3>
        <Stack gap="space-3">
          <div class="result-head">
            <Badge variant={result.bypass ? 'danger' : 'accent'}>{result.bypass ? 'the game stops' : 'dispatched'}</Badge>
            <span class="rank">rank {result.rank}</span>
          </div>
          <dl class="verdict">
            <dt>What changed</dt>
            <dd>{result.whatChanged}</dd>
            <dt>What it means</dt>
            <dd>{result.whatItMeans}</dd>
            <dt>The frame becomes</dt>
            <dd>{result.frameBecomes}</dd>
            <dt>Presence</dt>
            <dd>
              {result.presenceCount} in the foreground
              {#if result.backgroundCount > 0}
                · {result.backgroundCount} working behind the curtain
              {/if}
            </dd>
          </dl>
          <p class="meta">
            The roles behind this are the loop's own vocabulary and are deliberately not shown
            here; what you are told is what changed and what the frame becomes.
          </p>
          {#if result.withheld.length > 0}
            <div class="withheld">
              <p class="withheld-head">Withheld</p>
              {#each result.withheld as w (w.role)}
                <p class="withheld-row">— {w.reason}</p>
              {/each}
            </div>
          {/if}
        </Stack>
      </Card>
    {/if}
  </Stack>
</RouteShell>

<style>
  .section-title {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: var(--mysterium-tracking-wider);
    color: var(--mysterium-accent);
    margin: 0 0 var(--mysterium-space-3);
  }
  .lede {
    color: var(--mysterium-fg);
    line-height: var(--mysterium-leading-normal);
  }
  .row {
    padding: var(--mysterium-space-2);
    border: 1px solid var(--mysterium-border);
    border-radius: var(--mysterium-radius-sm);
  }
  .row-selected {
    border-color: var(--mysterium-accent);
  }
  .row-head {
    display: flex;
    align-items: center;
    gap: var(--mysterium-space-2);
    flex-wrap: wrap;
  }
  .rank {
    font-family: var(--mysterium-font-mono, monospace);
    font-size: var(--mysterium-text-xs);
    color: var(--mysterium-accent);
  }
  .occasion {
    font-weight: 600;
  }
  .frame {
    color: var(--mysterium-fg-muted);
    font-size: var(--mysterium-text-sm);
    margin-top: var(--mysterium-space-1);
  }
  .meta {
    color: var(--mysterium-fg-muted);
    font-size: var(--mysterium-text-xs);
    margin-top: var(--mysterium-space-1);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-1);
  }
  .field-label {
    font-size: var(--mysterium-text-xs);
    text-transform: uppercase;
    letter-spacing: var(--mysterium-tracking-wider);
    color: var(--mysterium-fg-muted);
  }
  .select,
  .input {
    background: var(--mysterium-surface);
    color: var(--mysterium-fg);
    border: 1px solid var(--mysterium-border);
    border-radius: var(--mysterium-radius-sm);
    padding: var(--mysterium-space-2);
    font-family: inherit;
  }
  .select:focus-visible,
  .input:focus-visible {
    outline: 2px solid var(--mysterium-accent);
    outline-offset: 1px;
  }
  .hint {
    font-size: var(--mysterium-text-xs);
    color: var(--mysterium-fg-muted);
  }
  .bypass-note {
    color: var(--mysterium-fg-muted);
    font-size: var(--mysterium-text-sm);
    border-left: 2px solid var(--mysterium-accent);
    padding-left: var(--mysterium-space-2);
  }
  .result-head {
    display: flex;
    align-items: center;
    gap: var(--mysterium-space-2);
  }
  .verdict {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: var(--mysterium-space-1) var(--mysterium-space-3);
  }
  .verdict dt {
    font-size: var(--mysterium-text-xs);
    text-transform: uppercase;
    letter-spacing: var(--mysterium-tracking-wider);
    color: var(--mysterium-fg-muted);
  }
  .verdict dd {
    margin: 0;
  }
  .withheld {
    border-top: 1px solid var(--mysterium-border);
    padding-top: var(--mysterium-space-2);
  }
  .withheld-head {
    font-size: var(--mysterium-text-xs);
    text-transform: uppercase;
    letter-spacing: var(--mysterium-tracking-wider);
    color: var(--mysterium-fg-muted);
  }
  .withheld-row {
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
  }
</style>

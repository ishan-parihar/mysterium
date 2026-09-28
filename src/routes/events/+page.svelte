<script lang="ts">
  /**
   * /events route — the telemetry event tail.
   *
   * Source of truth: the in-memory buffer in `telemetryStore`, which the engine
   * feeds through `recordEvent`. There is NO pod transport here and no poll: the
   * web path buffers locally and posts a batch to /api/telemetry on a 5s debounce.
   *
   * The honesty problem this page exists to solve: the buffer is EMPTY in three
   * genuinely different situations, and only one of them is "no events ever".
   *
   *   1. opt-in OFF      → nothing is recorded at all. An empty list here would
   *                         be indistinguishable from a working recorder that
   *                         found nothing.
   *   2. opt-in ON, no
   *      events YET      → recording works, the player has not played since
   *                         enabling it.
   *   3. opt-in ON, events
   *      already flushed  → the batch POSTed to /api/telemetry succeeded and
   *                         the buffer was cleared. Events happened; this page
   *                         can no longer show them.
   *
   * The CLI's `runEvents` distinguishes (1) and (2) by checking the opt-in flag
   * before reading the store. This page does the same, and additionally says
   * plainly in (3) that flushed events are not retained here.
   */

  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import Seo from '$lib/components/Seo.svelte';
  import RouteShell from '$lib/components/RouteShell.svelte';
  import Card from '$lib/components/Card.svelte';
  import Stack from '$lib/components/Stack.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import { buildEventTail, type EventTail, type RecordedEvent } from '$core/presentation/playerTelemetryView.js';
  import { telemetryEvents } from '$lib/stores/telemetryStore.js';
  import { accessibilityStore } from '$lib/stores/accessibilityStore.js';

  const TAILS = [10, 20, 50] as const;

  let tailSize = $state(20);
  let events = $state<readonly RecordedEvent[]>([]);
  let loaded = $state(false);

  // Reactive read of the store's VALUE (never the store variable inside an effect:
  // naming the store itself is the bug that shipped a live consent failure once).
  const recording = $derived($accessibilityStore.telemetryOptIn);
  const model = $derived<EventTail>(buildEventTail(events, { tail: tailSize, recording }));

  onMount(() => {
    if (!browser) return;
    const unsubEvents = telemetryEvents.subscribe((v) => { events = v; });
    loaded = true;
    return () => { unsubEvents(); };
  });

  function formatTime(ms: number): string {
    return new Date(ms).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  function payload(e: RecordedEvent): string {
    const entries = Object.entries(e.data);
    if (entries.length === 0) return '—';
    return entries.map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join('  ');
  }
</script>

<Seo
  title="Events"
  description="The telemetry events your device has recorded this session, and exactly what is and is not retained."
  indexable={false}
/>

<RouteShell title="Events" back="/telemetry" backLabel="Telemetry">
  <Stack gap="space-4">
    <Card padding="space-5">
      <Stack gap="space-2">
        <h2 class="section-title">What this page shows</h2>
        <p class="body">
          Your device records an event when something happens in play, and holds them in
          memory. Nothing here is fetched, and there is no poll: what you see is what this
          session buffered.
        </p>
        <p class="body muted">
          Recording is off by default. When you turn it on in Settings, events are sent in
          batches to the game&rsquo;s own endpoint and then cleared from this buffer — this
          page does not keep a copy afterwards.
        </p>
      </Stack>
    </Card>

    {#if !loaded}
      <Card padding="space-5"><p class="empty">Reading the event buffer…</p></Card>
    {:else}
      <div class="tail-row" role="group" aria-label="Tail size">
        {#each TAILS as n (n)}
          <Button size="sm" variant={tailSize === n ? 'primary' : 'ghost'} onclick={() => (tailSize = n)}>
            Last {n}
          </Button>
        {/each}
      </div>

      {#if !recording}
        <Card variant="accent" padding="space-5">
          <Stack gap="space-2">
            <h2 class="section-title">Recording is off</h2>
            <p class="body">
              Telemetry is switched off on this device, so <strong>nothing is being
              recorded</strong>. The list below is empty because no event was ever captured
              — not because play produced nothing worth recording.
            </p>
            {#if events.length > 0}
              <p class="body muted">
                {events.length} event{events.length === 1 ? '' : 's'} arrived before the
                setting was turned off; they are shown below.
              </p>
            {/if}
            <div><Button variant="default" href="/settings">Open settings</Button></div>
          </Stack>
        </Card>
      {/if}

      <Card padding="space-5">
        <Stack gap="space-2">
          <h2 class="section-title">Buffered events</h2>

          {#if events.length === 0}
            <p class="empty">
              {#if recording}
                Recording is on and the buffer is empty — nothing has been recorded this
                session. Play a session, then come back; the buffer clears when a batch is
                sent.
              {:else}
                Nothing recorded, because recording is off.
              {/if}
            </p>
          {:else}
            <p class="count">
              Showing {model.events.length} of {model.total} buffered
              event{model.total === 1 ? '' : 's'}.
              {#if model.kinds.length > 0}
                {' '}{model.kinds.length} distinct kind{model.kinds.length === 1 ? '' : 's'}.
              {/if}
            </p>
            <ul class="list" role="list">
              {#each [...model.events].reverse() as e (e.id)}
                <li class="row">
                  <span class="time">{formatTime(e.timestamp)}</span>
                  <span class="type">{e.type}</span>
                  <span class="data">{payload(e)}</span>
                </li>
              {/each}
            </ul>
            <div class="kinds">
              {#each model.kinds as k (k.type)}
                <Badge variant="default">{k.type} · {k.count}</Badge>
              {/each}
            </div>
            <p class="footnote">
              This buffer is not a log. It holds what has not yet been sent, and it is lost on
              reload. For what the game can see and why, read the telemetry page.
            </p>
          {/if}
        </Stack>
      </Card>
    {/if}
  </Stack>
</RouteShell>

<style>
  .section-title {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-sm);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: var(--mysterium-tracking-wider);
    color: var(--mysterium-fg-muted);
    margin: 0;
  }

  .body {
    color: var(--mysterium-fg);
    font-size: var(--mysterium-text-base);
    margin: 0;
  }

  .body.muted,
  .footnote,
  .count {
    color: var(--mysterium-fg-muted);
    font-size: var(--mysterium-text-sm);
    margin: 0;
  }

  .footnote {
    font-style: italic;
  }

  .empty {
    color: var(--mysterium-fg-muted);
    font-style: italic;
    margin: 0;
  }

  .tail-row {
    display: flex;
    gap: var(--mysterium-space-2);
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .row {
    display: grid;
    grid-template-columns: 9.5rem 9rem 1fr;
    gap: var(--mysterium-space-2);
    padding: var(--mysterium-space-2) 0;
    border-bottom: 1px solid var(--mysterium-border);
    font-size: var(--mysterium-text-sm);
  }

  .row:last-child {
    border-bottom: none;
  }

  .time {
    color: var(--mysterium-fg-muted);
  }

  .type {
    color: var(--mysterium-accent);
  }

  .data {
    color: var(--mysterium-fg);
    word-break: break-word;
  }

  .kinds {
    display: flex;
    flex-wrap: wrap;
    gap: var(--mysterium-space-1);
    margin-top: var(--mysterium-space-2);
  }
</style>

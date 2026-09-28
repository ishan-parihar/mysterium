<script lang="ts">
  /**
   * /insights route — how your training senses have been resting and rising.
   *
   * The web twin of `mysterium insights` (TrainingRuntime.runInsightsCommand).
   * The aggregation is NOT reimplemented here: `loadInsights` reads the same
   * TrialRecordStore and CognitiveIndex the CLI reads and applies the same
   * arithmetic, so the two surfaces cannot disagree about a metric.
   *
   * Veil: only `feltSenseFor`'s phrase is rendered. The raw score is never shown.
   */

  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import Seo from '$lib/components/Seo.svelte';
  import RouteShell from '$lib/components/RouteShell.svelte';
  import Card from '$lib/components/Card.svelte';
  import Stack from '$lib/components/Stack.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import { loadInsights, type InsightsModel } from '$core/presentation/playerTelemetryView.js';
  import { getTrainingServices } from '$lib/engine/trainingBridge.js';
  import type { LineInsight, DayPoint } from '$core/presentation/playerTelemetryView.js';

  const WINDOWS = [7, 14, 30] as const;

  let model = $state<InsightsModel | null>(null);
  let days = $state<number>(14);
  let failed = $state(false);

  const GLYPH: Record<LineInsight['trend'], string> = {
    rising: '↗',
    decaying: '↘',
    stable: '·',
  };

  const TREND_LABEL: Record<LineInsight['trend'], string> = {
    rising: 'rising',
    decaying: 'resting',
    stable: 'steady',
  };

  const lines = $derived(model?.lines ?? []);
  const playedLines = $derived(lines.filter((l) => Math.abs(l.score01 - 0.5) > 1e-9));
  const untouched = $derived(lines.filter((l) => Math.abs(l.score01 - 0.5) <= 1e-9));

  async function load(window: number): Promise<void> {
    days = window;
    failed = false;
    try {
      model = await loadInsights({ days: window, services: await getTrainingServices() });
    } catch {
      failed = true;
      model = null;
    }
  }

  onMount(() => {
    if (!browser) return;
    void load(days);
  });

  function barWidth(entry: LineInsight): string {
    // The bar is a relative position, not a measurement — it is scaled across the
    // player's own lines only, so it says "resting vs rising", never "at 0.62".
    const all = lines.map((l) => l.score01);
    const min = Math.min(...all);
    const max = Math.max(...all);
    const range = max - min || 1;
    const pct = Math.round(((entry.score01 - min) / range) * 100);
    return `${Math.min(100, Math.max(4, pct))}%`;
  }

  function dayWidth(p: DayPoint): string {
    const all = model?.trend ?? [];
    const max = Math.max(...all.map((d) => d.accuracy));
    if (max <= 0) return '4%';
    return `${Math.max(4, Math.round((p.accuracy / max) * 100))}%`;
  }

  function formatDay(day: string): string {
    return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
</script>

<Seo
  title="Insights"
  description="How your training senses have been resting and rising — felt-sense aggregates over your own play."
/>

<RouteShell title="Insights" back="/profile" backLabel="Profile">
  <Stack gap="space-4">
    <div class="window-row" role="group" aria-label="Time window">
      {#each WINDOWS as w (w)}
        <Button
          size="sm"
          variant={days === w ? 'primary' : 'ghost'}
          onclick={() => void load(w)}
        >
          {w} days
        </Button>
      {/each}
    </div>

    {#if failed}
      <Card variant="accent" padding="space-5">
        <p class="empty">
          Your training store could not be read on this device. Nothing is hidden —
          the reading itself failed.
        </p>
      </Card>
    {:else if !model}
      <Card padding="space-5">
        <p class="empty">Reading your practice history…</p>
      </Card>
    {:else if !model.hasTrainingData}
      <Card variant="accent" padding="space-5">
        <Stack gap="space-2">
          <h2 class="section-title">Nothing measured yet</h2>
          <p class="empty">
            No training session has been recorded on this device, so there is nothing here
            to read. Every line would otherwise show the same starting value — that is the
            absence of a measurement, not a result.
          </p>
          <div><Button variant="primary" href="/play">Play a session</Button></div>
        </Stack>
      </Card>
    {:else}
      <Card padding="space-5">
        <Stack gap="space-2">
          <h2 class="section-title">Senses</h2>
          {#each playedLines as entry (entry.line)}
            <div class="line-row">
              <span class="glyph" aria-hidden="true">{GLYPH[entry.trend]}</span>
              <div class="line-body">
                <div class="line-head">
                  <span class="line-name">{entry.line}</span>
                  <Badge variant={entry.trend === 'rising' ? 'accent' : 'default'}>{TREND_LABEL[entry.trend]}</Badge>
                </div>
                <div class="track" role="presentation">
                  <div class="fill" class:decaying={entry.trend === 'decaying'} style:width={barWidth(entry)}></div>
                </div>
                <p class="phrase">{entry.feltSense}</p>
              </div>
            </div>
          {/each}
          {#if untouched.length > 0}
            <p class="footnote">
              {untouched.length} of {lines.length} lines have never been practised and sit at
              their starting value — they are not readings.
            </p>
          {/if}
        </Stack>
      </Card>

      <Card padding="space-5">
        <Stack gap="space-2">
          <h2 class="section-title">Recent sessions</h2>
          {#if model.recentSessions.length === 0}
            <p class="empty">
              {#if model.sessionsOutsideWindow > 0}
                No practice in the last {model.days} days.
                {model.sessionsOutsideWindow} older session{model.sessionsOutsideWindow === 1 ? '' : 's'} sit
                outside this window.
              {:else}
                No practice recorded yet.
              {/if}
            </p>
          {:else}
            <p class="count">
              {model.recentSessions.length} session{model.recentSessions.length === 1 ? '' : 's'}
              in the last {model.days} days.
            </p>
            <ul class="session-list" role="list">
              {#each model.recentSessions as s (s.sessionId)}
                <li class="session">
                  <span class="paradigm">{s.paradigmId.replace(/_/g, ' ')}</span>
                  <span class="meta">
                    {new Date(s.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    · {s.trialsCompleted} trials
                  </span>
                </li>
              {/each}
            </ul>
          {/if}
        </Stack>
      </Card>

      {#if model.trend.length >= 2}
        <Card padding="space-5">
          <Stack gap="space-2">
            <h2 class="section-title">Daily shape</h2>
            <p class="count">Mean accuracy per day, oldest first. Heights are relative to your best day here.</p>
            {#each model.trend as p (p.day)}
              <div class="day-row">
                <span class="day-label">{formatDay(p.day)}</span>
                <div class="track" role="presentation">
                  <div class="fill" style:width={dayWidth(p)}></div>
                </div>
                <span class="meta">{p.trials} trials</span>
              </div>
            {/each}
          </Stack>
        </Card>
      {/if}
    {/if}
  </Stack>
</RouteShell>

<style>
  .window-row {
    display: flex;
    gap: var(--mysterium-space-2);
  }

  .section-title {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-sm);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: var(--mysterium-tracking-wider);
    color: var(--mysterium-fg-muted);
    margin: 0;
  }

  .empty {
    color: var(--mysterium-fg-muted);
    font-style: italic;
    margin: 0;
  }

  .count,
  .footnote {
    color: var(--mysterium-fg-muted);
    font-size: var(--mysterium-text-sm);
    margin: 0;
  }

  .footnote {
    font-style: italic;
  }

  .line-row {
    display: flex;
    gap: var(--mysterium-space-3);
    align-items: flex-start;
  }

  .glyph {
    color: var(--mysterium-accent);
    font-size: var(--mysterium-text-lg);
    line-height: 1.4;
    min-width: 1ch;
  }

  .line-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-1);
  }

  .line-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--mysterium-space-2);
  }

  .line-name {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-base);
    color: var(--mysterium-fg);
  }

  .track {
    background: var(--mysterium-bg);
    border: 1px solid var(--mysterium-border);
    border-radius: var(--mysterium-radius-sm);
    height: 6px;
    overflow: hidden;
  }

  .fill {
    background: var(--mysterium-accent);
    height: 100%;
  }

  .fill.decaying {
    background: var(--mysterium-fg-muted);
  }

  .phrase {
    color: var(--mysterium-fg);
    font-size: var(--mysterium-text-sm);
    margin: 0;
  }

  .session-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .session {
    display: flex;
    justify-content: space-between;
    gap: var(--mysterium-space-3);
    padding: var(--mysterium-space-2) 0;
    border-bottom: 1px solid var(--mysterium-border);
  }

  .session:last-child {
    border-bottom: none;
  }

  .paradigm {
    color: var(--mysterium-fg);
    text-transform: capitalize;
  }

  .meta,
  .day-label {
    color: var(--mysterium-fg-muted);
    font-size: var(--mysterium-text-sm);
  }

  .day-row {
    display: grid;
    grid-template-columns: 4.5rem 1fr auto;
    gap: var(--mysterium-space-2);
    align-items: center;
  }
</style>

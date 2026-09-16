<script lang="ts">
  /**
   * /telemetry route — transparency page.
   * Lists every telemetry event with sample payloads. Opt-out links to /settings.
   */

  import { goto } from '$app/navigation';
  import Seo from '$lib/components/Seo.svelte';
  import RouteShell from '$lib/components/RouteShell.svelte';
  import Card from '$lib/components/Card.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Stack from '$lib/components/Stack.svelte';
  import { accessibilityStore } from '$lib/stores/accessibilityStore.js';

  const settings = $derived($accessibilityStore);

  const eventTypes = [
    {
      name: 'encounter_completed',
      description: 'Sent when you finish an encounter. Includes the consequence record (what changed in your profile).',
      sample: {
        type: 'encounter_completed',
        timestamp: 1720000000000,
        payload: { record: { encounterId: 'enc-abc123', line: 'cognitive', stage: 'red' } },
      },
    },
    {
      name: 'shadow_surfaced',
      description: 'Sent when a shadow pattern is detected during play. Includes the shadow ID, line, and quadrant.',
      sample: {
        type: 'shadow_surfaced',
        timestamp: 1720000000000,
        payload: { shadowId: 'shadow-def456', line: 'emotional', quadrant: 'UL' },
      },
    },
    {
      name: 'shadow_resolved',
      description: 'Sent when a previously-surfaced shadow is integrated. Includes the shadow ID.',
      sample: {
        type: 'shadow_resolved',
        timestamp: 1720000000000,
        payload: { shadowId: 'shadow-def456' },
      },
    },
    {
      name: 'transformation_triggered',
      description: 'Sent when a stage transformation is detected. Includes the transformation signal.',
      sample: {
        type: 'transformation_triggered',
        timestamp: 1720000000000,
        payload: { signal: { from: 'red', to: 'amber', line: 'cognitive' } },
      },
    },
    {
      name: 'session_started',
      description: 'Sent when a play session begins. Includes only the start timestamp.',
      sample: {
        type: 'session_started',
        timestamp: 1720000000000,
        payload: { timestamp: 1720000000000 },
      },
    },
    {
      name: 'session_ended',
      description: 'Sent when a play session ends. Includes the end timestamp and encounter count.',
      sample: {
        type: 'session_ended',
        timestamp: 1720000000000,
        payload: { timestamp: 1720000000000, encounterCount: 3 },
      },
    },
    {
      name: 'encounter_declined',
      description: 'Sent when you choose to skip an offered encounter. Includes the encounter ID and module reference.',
      sample: {
        type: 'encounter_declined',
        timestamp: 1720000000000,
        payload: { encounterId: 'enc-abc123', moduleRef: 'cognitive/red', line: 'cognitive', stage: 'red' },
      },
    },
  ];
</script>

<Seo
  title="Telemetry"
  description="Transparency: view every telemetry event Mysterium collects, with sample payloads. Opt in or out at any time."
/>

<RouteShell title="Telemetry" back="/">
  <Stack gap="space-5">
    <!-- Status -->
    <Card variant="accent" padding="space-5">
      <div class="status-row">
        <div class="status-label">
          <span class="status-name">Telemetry is currently</span>
          <span class="status-desc">
            {#if settings.telemetryOptIn}
              <Badge variant="success">ON</Badge> — events are sent to the server
            {:else}
              <Badge variant="default">OFF</Badge> — no events leave your device
            {/if}
          </span>
        </div>
        <Button variant="ghost" size="sm" onclick={() => goto('/settings')}>
          {settings.telemetryOptIn ? 'Disable' : 'Enable'} in Settings
        </Button>
      </div>
    </Card>

    <!-- Intro -->
    <Card padding="space-5">
      <Stack gap="space-3">
        <p class="intro-text">
          Mysterium collects anonymous telemetry to understand how the game is used
          and to improve the developmental assessment engine. We are transparent
          about every event we send. Below is the complete list.
        </p>
        <p class="intro-text">
          <strong>What we never collect:</strong> your Significator contents,
          encounter responses, journal entries, or any personally identifiable
          information. Telemetry events contain only event types, timestamps,
          and structural metadata (which line, which stage, which shadow ID).
        </p>
      </Stack>
    </Card>

    <!-- Event Types -->
    <Stack gap="space-3">
      <h2 class="section-title">Event Types ({eventTypes.length})</h2>
      <Stack gap="space-3">
        {#each eventTypes as evt (evt.name)}
          <Card padding="space-5">
            <Stack gap="space-3">
              <h3 class="event-name">{evt.name}</h3>
              <p class="event-desc">{evt.description}</p>
              <details class="event-payload">
                <summary>Sample payload</summary>
                <pre class="payload-code"><code>{JSON.stringify(evt.sample, null, 2)}</code></pre>
              </details>
            </Stack>
          </Card>
        {/each}
      </Stack>
    </Stack>
  </Stack>
</RouteShell>

<style>
  .status-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--mysterium-space-4);
    flex-wrap: wrap;
  }

  .status-label {
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-1);
  }

  .status-name {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-base);
    color: var(--mysterium-fg);
    font-weight: 500;
  }

  .status-desc {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    display: flex;
    align-items: center;
    gap: var(--mysterium-space-2);
  }

  .intro-text {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg);
    line-height: var(--mysterium-leading-relaxed);
    margin: 0;
  }

  .section-title {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-sm);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: var(--mysterium-tracking-wider);
    color: var(--mysterium-accent);
    margin: 0;
  }

  .event-name {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-md);
    font-weight: 600;
    color: var(--mysterium-accent);
    margin: 0;
  }

  .event-desc {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg);
    line-height: var(--mysterium-leading-relaxed);
    margin: 0;
  }

  .event-payload {
    background: var(--mysterium-surface);
    border: 1px solid var(--mysterium-border);
    border-radius: var(--mysterium-radius);
    padding: var(--mysterium-space-2) var(--mysterium-space-3);
  }

  .event-payload summary {
    cursor: pointer;
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .event-payload summary:focus-visible {
    outline: 2px solid var(--mysterium-accent);
    outline-offset: 2px;
  }

  .payload-code {
    margin: var(--mysterium-space-2) 0 0 0;
    padding: var(--mysterium-space-3);
    background: var(--mysterium-bg);
    border-radius: var(--mysterium-radius);
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-xs);
    color: var(--mysterium-fg-muted);
    overflow-x: auto;
    line-height: var(--mysterium-leading-normal);
  }
</style>

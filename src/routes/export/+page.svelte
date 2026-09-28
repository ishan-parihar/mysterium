<script lang="ts">
  /**
   * /export route — export YOUR OWN data.
   *
   * The privacy-critical surface. Three properties this page holds to:
   *
   *  1. LOCAL ONLY. The bundle is assembled in the browser from the player's own
   *     storage and handed back as a file. There is no server endpoint in the
   *     path, so the act of exporting cannot transmit anything. A network
   *     inspector on this page shows zero export requests.
   *  2. STATED BEFORE THE FACT. What the file contains is rendered from
   *     `ExportBundle.included` — the builder's own account of the payload, not
   *     hand-written copy that can drift from what the file holds. What is
   *     ABSENT is stated from `missing`, so a section that was asked for and is
   *     not there is never silently omitted.
   *  3. NO-SAVE IS REFUSED, NOT ZEROED. With no save, the page says so and does
   *     not offer a download. An empty export that reads as "you did nothing" is
   *     a different claim from "there is nothing to export yet".
   *
   * No import or delete path here by design: export only.
   */

  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import Seo from '$lib/components/Seo.svelte';
  import RouteShell from '$lib/components/RouteShell.svelte';
  import Card from '$lib/components/Card.svelte';
  import Stack from '$lib/components/Stack.svelte';
  import Button from '$lib/components/Button.svelte';
  import { buildExport, type ExportBundle, type ExportFormat } from '$core/presentation/playerTelemetryView.js';
  import { getTrainingServices } from '$lib/engine/trainingBridge.js';
  import { loadSignificatorFromStorage } from '$lib/stores/saveHydration.js';
  import { allParadigms } from '$core/braingame/registry.js';
  import type { KnowledgeState } from '$core/curriculum/types.js';

  type WindowOpt = 'all' | 7 | 30 | 90;

  let format = $state<ExportFormat>('json');
  let paradigm = $state<string>('');
  let windowOpt = $state<WindowOpt>('all');
  let analytics = $state(true);

  let hasSave = $state<boolean | null>(null);
  let knowledge = $state<KnowledgeState | undefined>(undefined);
  let bundle = $state<ExportBundle | null>(null);
  let error = $state('');
  let building = $state(false);

  const paradigms = allParadigms().map((p) => p.id);
  const WINDOWS: readonly { readonly label: string; readonly value: WindowOpt }[] = [
    { label: 'Everything', value: 'all' },
    { label: 'Last 7 days', value: 7 },
    { label: 'Last 30 days', value: 30 },
    { label: 'Last 90 days', value: 90 },
  ];

  const days = $derived(windowOpt === 'all' ? undefined : windowOpt);

  onMount(() => {
    if (!browser) return;
    // The curriculum section comes from the player's save, read through the same
    // hydration path every other route uses — not from localStorage directly.
    const sig = loadSignificatorFromStorage();
    hasSave = sig !== null;
    knowledge = sig?.knowledge;
    void rebuild();
  });

  async function rebuild(): Promise<void> {
    building = true;
    error = '';
    try {
      bundle = await buildExport({
        format,
        paradigm: paradigm || undefined,
        days,
        analytics,
        knowledge,
        services: await getTrainingServices(),
      });
    } catch (e) {
      error = e instanceof Error ? e.message : 'The export could not be built.';
      bundle = null;
    } finally {
      building = false;
    }
  }

  function download(): void {
    if (!bundle || !hasSave) return;
    const blob = new Blob([bundle.body], { type: bundle.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = bundle.fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoke on the next tick — revoking synchronously can cancel the download
    // in some browsers before it has read the blob.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
</script>

<Seo
  title="Export your data"
  description="Download everything Mysterium has stored about you — trial records, session summaries and curriculum analytics. Built on your device; nothing is sent anywhere."
  indexable={false}
/>

<RouteShell title="Your data" back="/settings" backLabel="Settings">
  <Stack gap="space-4">
    <Card padding="space-5">
      <Stack gap="space-2">
        <h2 class="section-title">Where this runs</h2>
        <p class="body">
          This page is built on your device. It reads the same records your play wrote and
          hands you a file. Nothing is uploaded to do it — there is no export endpoint to
          upload to.
        </p>
        <p class="body muted">
          The export is raw: per-trial correctness, response times, and your curriculum
          analytics. It is yours to read and yours to share, and it is readable by anything
          that can open a file. Keep it accordingly.
        </p>
      </Stack>
    </Card>

    {#if hasSave === null}
      <Card padding="space-5"><p class="empty">Reading your storage…</p></Card>
    {:else if !hasSave}
      <Card variant="accent" padding="space-5">
        <Stack gap="space-2">
          <h2 class="section-title">No save on this device</h2>
          <p class="body">
            There is no save here, so there is nothing to export. An empty file would read
            as "you recorded nothing" — which is a different claim from "nothing was ever
            recorded", and not one this page will make on your behalf.
          </p>
          <div><Button variant="default" href="/play">Start a game first</Button></div>
        </Stack>
      </Card>
    {:else}
      <Card padding="space-5">
        <Stack gap="space-3">
          <h2 class="section-title">What to include</h2>

          <label class="field">
            <span class="field-label">Format</span>
            <div class="choices" role="group" aria-label="Format">
              <Button size="sm" variant={format === 'json' ? 'primary' : 'ghost'} onclick={() => { format = 'json'; void rebuild(); }}>JSON</Button>
              <Button size="sm" variant={format === 'csv' ? 'primary' : 'ghost'} onclick={() => { format = 'csv'; void rebuild(); }}>CSV</Button>
            </div>
          </label>

          <label class="field">
            <span class="field-label">Window</span>
            <select class="select" bind:value={windowOpt} onchange={() => void rebuild()}>
              {#each WINDOWS as w (w.label)}
                <option value={w.value}>{w.label}</option>
              {/each}
            </select>
          </label>

          <label class="field">
            <span class="field-label">Practice</span>
            <select class="select" bind:value={paradigm} onchange={() => void rebuild()}>
              <option value="">All practices</option>
              {#each paradigms as p (p)}
                <option value={p}>{p.replace(/_/g, ' ')}</option>
              {/each}
            </select>
          </label>

          {#if format === 'json'}
            <label class="field checkbox">
              <input type="checkbox" bind:checked={analytics} onchange={() => void rebuild()} />
              <span class="field-label">Include curriculum analytics</span>
            </label>
          {/if}
        </Stack>
      </Card>

      {#if error}
        <Card variant="accent" padding="space-5">
          <p class="body">The export could not be built: {error}</p>
        </Card>
      {:else if bundle}
        <Card padding="space-5">
          <Stack gap="space-2">
            <h2 class="section-title">This file will contain</h2>
            <ul class="list" role="list">
              {#each bundle.included as line (line)}
                <li class="item">{line}</li>
              {/each}
            </ul>
            {#if bundle.missing.length > 0}
              <p class="missing">
                Not included: {bundle.missing.join('; ')}.
              </p>
            {/if}
            <p class="footnote">
              {bundle.trialCount} trial record{bundle.trialCount === 1 ? '' : 's'} ·
              {bundle.sessionCount} session summar{bundle.sessionCount === 1 ? 'y' : 'ies'} ·
              {bundle.fileName}
            </p>
            <div class="actions">
              <Button variant="primary" onclick={download} disabled={building}>
                {building ? 'Building…' : 'Download the file'}
              </Button>
            </div>
            <p class="footnote">
              The file is generated here and saved by your browser. Nothing leaves this device
              unless you send it on yourself.
            </p>
          </Stack>
        </Card>
      {:else}
        <Card padding="space-5"><p class="empty">Building your export…</p></Card>
      {/if}
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
  .footnote {
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

  .missing {
    color: var(--mysterium-fg-muted);
    font-size: var(--mysterium-text-sm);
    margin: 0;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-1);
  }

  .field.checkbox {
    flex-direction: row;
    align-items: center;
    gap: var(--mysterium-space-2);
  }

  .field-label {
    color: var(--mysterium-fg-muted);
    font-size: var(--mysterium-text-sm);
  }

  .choices {
    display: flex;
    gap: var(--mysterium-space-2);
  }

  .select {
    background: var(--mysterium-bg);
    color: var(--mysterium-fg);
    border: 1px solid var(--mysterium-border);
    border-radius: var(--mysterium-radius-sm);
    padding: var(--mysterium-space-2);
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-base);
  }

  .list {
    margin: 0;
    padding-left: var(--mysterium-space-4);
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-1);
  }

  .item {
    color: var(--mysterium-fg);
    font-size: var(--mysterium-text-sm);
  }

  .actions {
    margin-top: var(--mysterium-space-2);
  }
</style>

<script lang="ts">
  /**
   * /diagnostic route — system status.
   * Parity with CLI 'mysterium diagnostic'.
   * Shows: registries, holons, significator, session, LLM config, scheduler test.
   */
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import Seo from '$lib/components/Seo.svelte';
  import RouteShell from '$lib/components/RouteShell.svelte';
  import Card from '$lib/components/Card.svelte';
  import Stack from '$lib/components/Stack.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import { bootRegistries } from '$core/registries/boot.js';
  import { bootModuleRegistry } from '$core/assessments/bootModules.js';
  import { createSignificator } from '$core/domain/Significator.js';
  import { ALL_LINES } from '$core/domain/Line.js';
  import { describeStage } from '$core/presentation/veilDescriptors.js';
  import holonsJson from '$core/world/data/red-layer-holons.json';
  // BUGFIX (Full-Development Audit 2026-09-15): the page previously read
  // `(holonsJson as any).holons ?? []` on a JSON *array* — `.holons` is
  // undefined on arrays, so the diagnostic holons panel always rendered 0.
  // Also now includes the full stage-holon set (all 8 stages), matching the
  // CLI's loadHolons().
  import stageHolonsJson from '$core/world/data/stage-holons.json';

  type Status = 'idle' | 'loading' | 'ready' | 'error';
  let status: Status = $state('idle');
  let errorMsg = $state('');
  let moduleCount = $state(0);
  let holonBreakdown = $state({ total: 0, npc: 0, faction: 0, location: 0, other: 0 });
  let sigStage = $state('');

  onMount(async () => {
    if (!browser) return;
    status = 'loading';
    try {
      bootRegistries();
      const reg = bootModuleRegistry();
      moduleCount = reg.count();

      const holons = [...(holonsJson as any[]), ...(stageHolonsJson as any[])];
      holonBreakdown = {
        total: holons.length,
        npc: holons.filter((h: any) => h.kind === 'NPC').length,
        faction: holons.filter((h: any) => h.kind === 'Faction').length,
        location: holons.filter((h: any) => h.kind === 'Location').length,
        other: holons.length - holons.filter((h: any) => h.kind === 'NPC' || h.kind === 'Faction' || h.kind === 'Location').length,
      };

      const altitudes = {} as Record<string, string>;
      for (const line of ALL_LINES) altitudes[line] = 'Red';
      const sig = createSignificator('diagnostic-test', altitudes as never, 'Red');
      sigStage = describeStage(sig.currentStage);

      // ponytail: CCI + theme would require startSession — deferred to avoid engine import.
      // The CLI computes these; the WebUI shows the structural diagnostic only.
      status = 'ready';
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
      status = 'error';
    }
  });
</script>

<Seo
  title="Diagnostic"
  description="System diagnostic — registries, holons, significator, and LLM status."
  indexable={false}
/>

<RouteShell title="Diagnostic" back="/">
  {#if status === 'loading'}
    <Stack gap="space-3" align="center">
      <Spinner size="lg" />
      <p class="loading-text">Running diagnostic...</p>
    </Stack>
  {:else if status === 'error'}
    <Card padding="space-5" variant="default">
      <p class="error-text">Diagnostic failed: {errorMsg}</p>
    </Card>
  {:else if status === 'ready'}
    <Stack gap="space-5">
      <!-- Registries -->
      <Stack gap="space-3">
        <h2 class="section-title">Registries</h2>
        <Card padding="space-5">
          <Stack gap="space-2">
            <div class="diag-row">
              <span class="diag-label">Assessment modules</span>
              <Badge variant="success">{moduleCount} loaded</Badge>
            </div>
          </Stack>
        </Card>
      </Stack>

      <!-- Holons -->
      <Stack gap="space-3">
        <h2 class="section-title">Holons</h2>
        <Card padding="space-5">
          <Stack gap="space-2">
            <div class="diag-row">
              <span class="diag-label">Total</span>
              <Badge variant="accent">{holonBreakdown.total}</Badge>
            </div>
            <div class="diag-row">
              <span class="diag-label">NPCs</span>
              <span class="diag-value">{holonBreakdown.npc}</span>
            </div>
            <div class="diag-row">
              <span class="diag-label">Factions</span>
              <span class="diag-value">{holonBreakdown.faction}</span>
            </div>
            <div class="diag-row">
              <span class="diag-label">Locations</span>
              <span class="diag-value">{holonBreakdown.location}</span>
            </div>
            {#if holonBreakdown.other > 0}
              <div class="diag-row">
                <span class="diag-label">Other</span>
                <span class="diag-value">{holonBreakdown.other}</span>
              </div>
            {/if}
          </Stack>
        </Card>
      </Stack>

      <!-- Significator -->
      <Stack gap="space-3">
        <h2 class="section-title">Significator</h2>
        <Card padding="space-5">
          <Stack gap="space-2">
            <div class="diag-row">
              <span class="diag-label">Default stage</span>
              <span class="diag-value">{sigStage}</span>
            </div>
          </Stack>
        </Card>
      </Stack>

      <!-- LLM -->
      <Stack gap="space-3">
        <h2 class="section-title">LLM</h2>
        <Card padding="space-5">
          <Stack gap="space-2">
            <div class="diag-row">
              <span class="diag-label">Mode</span>
              <Badge variant="info">BFF proxy</Badge>
            </div>
            <div class="diag-row">
              <span class="diag-label">Endpoint</span>
              <span class="diag-value">/api/llm/chat</span>
            </div>
            <p class="diag-note">
              The WebUI proxies LLM calls through the BFF. The API key is held server-side.
              Run `mysterium diagnostic` in the CLI for client-side LLM config details.
            </p>
          </Stack>
        </Card>
      </Stack>
    </Stack>
  {/if}
</RouteShell>

<style>
  .loading-text {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    font-style: italic;
  }

  .error-text {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-danger);
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

  .diag-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--mysterium-space-3);
  }

  .diag-label {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
  }

  .diag-value {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg);
    font-weight: 500;
  }

  .diag-note {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-xs);
    color: var(--mysterium-fg-muted);
    font-style: italic;
    line-height: var(--mysterium-leading-relaxed);
    margin: var(--mysterium-space-2) 0 0 0;
  }
</style>

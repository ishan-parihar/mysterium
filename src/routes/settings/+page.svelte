<script lang="ts">
  /**
   * /settings route — Svelte-native settings.
   *
   * Uses the new component library: RouteShell, Card, Toggle, Button.
   * Toggles wire to accessibilityStore + A11yApplier → data-* on <html>.
   * Data deletion lives on /privacy, which enumerates what this app holds rather than
   * offering a single button whose copy cannot be kept honest.
   */

  import { goto } from '$app/navigation';
  import Seo from '$lib/components/Seo.svelte';
  import RouteShell from '$lib/components/RouteShell.svelte';
  import Card from '$lib/components/Card.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import Button from '$lib/components/Button.svelte';
  import Stack from '$lib/components/Stack.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { accessibilityStore, updateAccessibility } from '$lib/stores/accessibilityStore.js';
  import { sessionControlStore, updateSessionControl } from '$lib/stores/sessionControlStore.js';
  import { showToast } from '$lib/stores/toastStore.js';
  import { stageFade } from '$lib/transitions/stageMotion.js';
  import { ALL_LINES } from '$core/domain/Line.js';
  import { ALL_STAGES } from '$core/domain/Stage.js';
  import { ALL_MODALITIES } from '$core/domain/enums.js';

  const settings = $derived($accessibilityStore);
  const sessionControl = $derived($sessionControlStore);


  function toggleHighContrast() {
    updateAccessibility({ highContrast: !settings.highContrast });
    showToast(settings.highContrast ? 'High contrast off' : 'High contrast on', 'info', 2000);
  }

  function toggleReducedMotion() {
    updateAccessibility({ reducedMotion: !settings.reducedMotion });
    showToast(settings.reducedMotion ? 'Motion restored' : 'Motion reduced', 'info', 2000);
  }

  function toggleTelemetry() {
    updateAccessibility({ telemetryOptIn: !settings.telemetryOptIn });
    showToast(settings.telemetryOptIn ? 'Telemetry disabled' : 'Telemetry enabled', 'info', 2000);
  }

</script>

<Seo
  title="Settings"
  description="Adjust accessibility (high contrast, reduced motion), privacy (telemetry opt-in), and manage your save data."
/>

<RouteShell title="Settings" back="/">
  <Stack gap="space-5">
    <!-- Accessibility -->
    <section in:stageFade={{ delay: 60 }}>
      <Stack gap="space-3">
        <h2 class="section-title">Accessibility</h2>
        <Card padding="space-0">
          <Stack gap="space-0">
            <div class="setting-row">
              <div class="setting-label">
                <span class="setting-name">High Contrast</span>
                <span class="setting-desc">Increase visual contrast for readability</span>
              </div>
              <Toggle
                checked={settings.highContrast}
                onchange={toggleHighContrast}
                ariaLabel="Toggle high contrast"
              />
            </div>
            <div class="setting-divider" role="presentation"></div>
            <div class="setting-row">
              <div class="setting-label">
                <span class="setting-name">Reduced Motion</span>
                <span class="setting-desc">Disable animations and transitions</span>
              </div>
              <Toggle
                checked={settings.reducedMotion}
                onchange={toggleReducedMotion}
                ariaLabel="Toggle reduced motion"
              />
            </div>
          </Stack>
        </Card>
      </Stack>
    </section>

    <!-- Privacy -->
    <section in:stageFade={{ delay: 120 }}>
      <Stack gap="space-3">
        <h2 class="section-title">Privacy</h2>
        <Card padding="space-0">
          <Stack gap="space-0">
            <div class="setting-row">
              <div class="setting-label">
                <span class="setting-name">Telemetry</span>
                <span class="setting-desc">Share anonymous usage data to help improve the game</span>
              </div>
              <Toggle
                checked={settings.telemetryOptIn}
                onchange={toggleTelemetry}
                ariaLabel="Toggle telemetry"
              />
            </div>
            <div class="setting-divider" role="presentation"></div>
            <a class="setting-row setting-link" href="/telemetry">
              <div class="setting-label">
                <span class="setting-name">What data is collected?</span>
                <span class="setting-desc">View every event type and sample payload</span>
              </div>
              <span class="link-arrow" aria-hidden="true"><Icon name="arrow-right" size={18} /></span>
            </a>
            <div class="setting-divider" role="presentation"></div>
            <!--
              The three auditor surfaces (16 §10.4: Guardian Mirror, Educator Desk, Therapeutic Pane)
              and the Diagnostic report were ROUTES WITH NO ENTRY POINT. `knowledge` is reachable
              from the curriculum and so is not listed here; these four were linked from nothing in
              the app — not the sidebar, not the mobile nav, not the home grid — so a fully-featured
              auditor capability existed as a URL a player had to be told about by hand.

              They live in Settings rather than the sidebar because they are not daily surfaces: the
              sidebar should carry what a player meets daily, and an auditor enters when they are
              asked to.

              VERIFIED, NOT ASSUMED: driven in a browser with no consent grant, each surface refuses
              with "NO LIVE GRANT" and renders no closed-register value. The refusal lives in
              `renderLevel` (AL5), not in the template, so the link cannot become a door to the
              closed class — but the copy says so plainly rather than inviting the reader to expect
              content they will not have.
            -->
            <a class="setting-row setting-link" href="/diagnostic">
              <div class="setting-label">
                <span class="setting-name">Diagnostic</span>
                <span class="setting-desc">Your developmental profile in full detail</span>
              </div>
              <span class="link-arrow" aria-hidden="true"><Icon name="arrow-right" size={18} /></span>
            </a>
            <a class="setting-row setting-link" href="/auditor/guardian">
              <div class="setting-label">
                <span class="setting-name">Guardian view</span>
                <span class="setting-desc">What a guardian may read, if you have issued a consent link</span>
              </div>
              <span class="link-arrow" aria-hidden="true"><Icon name="arrow-right" size={18} /></span>
            </a>
            <a class="setting-row setting-link" href="/auditor/educator">
              <div class="setting-label">
                <span class="setting-name">Educator view</span>
                <span class="setting-desc">What an educator may read, if you have issued a consent link</span>
              </div>
              <span class="link-arrow" aria-hidden="true"><Icon name="arrow-right" size={18} /></span>
            </a>
            <a class="setting-row setting-link" href="/auditor/therapeutic">
              <div class="setting-label">
                <span class="setting-name">Therapeutic view</span>
                <span class="setting-desc">What a practitioner may read, if you have issued a consent link</span>
              </div>
              <span class="link-arrow" aria-hidden="true"><Icon name="arrow-right" size={18} /></span>
            </a>
          </Stack>
        </Card>
      </Stack>
    </section>

    <!-- Account -->
    <section in:stageFade={{ delay: 150 }}>
      <Stack gap="space-3">
        <h2 class="section-title">Account</h2>
        <Card padding="space-0">
          <a class="setting-row setting-link" href="/recover">
            <div class="setting-label">
              <span class="setting-name">Recover Save</span>
              <span class="setting-desc">Restore your progress on a new device</span>
            </div>
            <span class="link-arrow" aria-hidden="true"><Icon name="arrow-right" size={18} /></span>
          </a>
        </Card>
      </Stack>
    </section>

    <!-- Session (parity with CLI flags: --encounters, --line, --stage, --modality) -->
    <section in:stageFade={{ delay: 165 }}>
      <Stack gap="space-3">
        <h2 class="section-title">Session</h2>
        <Card padding="space-0">
          <Stack gap="space-0">
            <div class="setting-row">
              <div class="setting-label">
                <span class="setting-name">Encounters per session</span>
                <span class="setting-desc">How many encounters to schedule (default: 5)</span>
              </div>
              <input
                type="number"
                min="1"
                max="20"
                value={sessionControl.encounterCount}
                oninput={(e) => updateSessionControl({ encounterCount: Math.max(1, Math.min(20, parseInt(e.currentTarget.value) || 5)) })}
                class="number-input"
                aria-label="Encounters per session"
              />
            </div>
            <div class="setting-divider" role="presentation"></div>
            <div class="setting-row">
              <div class="setting-label">
                <span class="setting-name">Force line</span>
                <span class="setting-desc">Target a specific developmental line (auto = scheduler picks)</span>
              </div>
              <select
                value={sessionControl.forceLine ?? ''}
                onchange={(e) => updateSessionControl({ forceLine: e.currentTarget.value || null })}
                class="select-input"
                aria-label="Force specific line"
              >
                <option value="">Auto</option>
                {#each ALL_LINES as line}
                  <option value={line}>{line}</option>
                {/each}
              </select>
            </div>
            <div class="setting-divider" role="presentation"></div>
            <div class="setting-row">
              <div class="setting-label">
                <span class="setting-name">Force stage</span>
                <span class="setting-desc">Target a specific stage (auto = current stage)</span>
              </div>
              <select
                value={sessionControl.forceStage ?? ''}
                onchange={(e) => updateSessionControl({ forceStage: e.currentTarget.value || null })}
                class="select-input"
                aria-label="Force specific stage"
              >
                <option value="">Auto</option>
                {#each ALL_STAGES as stage}
                  <option value={stage}>{stage}</option>
                {/each}
              </select>
            </div>
            <div class="setting-divider" role="presentation"></div>
            <div class="setting-row">
              <div class="setting-label">
                <span class="setting-name">Force modality</span>
                <span class="setting-desc">Target a specific encounter modality (auto = scheduler picks)</span>
              </div>
              <select
                value={sessionControl.forceModality ?? ''}
                onchange={(e) => updateSessionControl({ forceModality: e.currentTarget.value || null })}
                class="select-input"
                aria-label="Force specific modality"
              >
                <option value="">Auto</option>
                {#each ALL_MODALITIES as modality}
                  <option value={modality}>{modality}</option>
                {/each}
              </select>
            </div>
          </Stack>
        </Card>
      </Stack>
    </section>

    <!-- Dev mode (parity with CLI --dev flag) -->
    <section in:stageFade={{ delay: 175 }}>
      <Stack gap="space-3">
        <h2 class="section-title">Developer</h2>
        <Card padding="space-0">
          <div class="setting-row">
            <div class="setting-label">
              <span class="setting-name">Dev mode</span>
              <span class="setting-desc">Show holistic primitives (G_z/P_z, rayProfile, phase position) in profile and encounters</span>
            </div>
            <Toggle
              checked={sessionControl.devMode}
              onchange={(v) => updateSessionControl({ devMode: v })}
              ariaLabel="Toggle dev mode"
            />
          </div>
        </Card>
      </Stack>
    </section>

    <!-- Data -->
    <section in:stageFade={{ delay: 180 }}>
      <Stack gap="space-3">
        <h2 class="section-title danger">Data</h2>
        <Card variant="default" padding="space-5">
          <Stack gap="space-3">
            <div class="setting-label">
              <span class="setting-name">Delete your data</span>
              <span class="setting-desc">
                See everything this app holds on this device, and delete it by group. This page
                used to offer a single "reset all data" that removed three of the nine keys the app
                stores — and its copy claimed it deleted your telemetry, which it never did.
              </span>
            </div>
            <Button variant="danger" onclick={() => goto('/privacy')}>
              Review and delete
            </Button>
          </Stack>
        </Card>
      </Stack>
    </section>
  </Stack>
</RouteShell>

<style>
  .section-title {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-md);
    font-weight: 600;
    color: var(--mysterium-fg);
    margin: 0;
    letter-spacing: var(--mysterium-tracking-wide);
  }

  .section-title.danger {
    color: var(--mysterium-danger);
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--mysterium-space-4);
    padding: var(--mysterium-space-4) var(--mysterium-space-5);
  }

  .setting-link {
    text-decoration: none;
    color: inherit;
    transition: background var(--mysterium-duration-fast) var(--mysterium-ease);
    -webkit-tap-highlight-color: transparent;
  }

  .setting-link:hover {
    background: var(--mysterium-surface-elevated);
  }

  .setting-link:focus-visible {
    outline: 2px solid var(--mysterium-accent);
    outline-offset: -2px;
  }

  .setting-divider {
    height: 1px;
    background: var(--mysterium-border);
    margin: 0 var(--mysterium-space-5);
  }

  .setting-label {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .setting-name {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-base);
    font-weight: 500;
    color: var(--mysterium-fg);
  }

  .setting-desc {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    line-height: var(--mysterium-leading-normal);
  }

  .link-arrow {
    color: var(--mysterium-fg-muted);
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .number-input,
  .select-input {
    padding: var(--mysterium-space-2) var(--mysterium-space-3);
    background: var(--mysterium-surface);
    border: 1px solid var(--mysterium-border);
    border-radius: var(--mysterium-radius);
    color: var(--mysterium-fg);
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    min-width: 8rem;
    transition: border-color var(--mysterium-duration-fast) var(--mysterium-ease);
    -webkit-tap-highlight-color: transparent;
  }

  .number-input:focus,
  .select-input:focus {
    outline: none;
    border-color: var(--mysterium-accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--mysterium-accent) 20%, transparent);
  }

  .number-input {
    width: 4rem;
    text-align: center;
  }


  /* Desktop: 2-column layout */
  @media (min-width: 1024px) {
    :global(.route-shell) {
      max-width: var(--mysterium-content-max-width-wide);
    }
  }
</style>

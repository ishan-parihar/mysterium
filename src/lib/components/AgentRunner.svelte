<script lang="ts">
  /**
   * <AgentRunner /> — visible presence of the Background-Agentic runtime.
   *
   * BACKGROUND-AGENTIC-ARCHITECTURE Decision 9 (Persistent affordance).
   *
   * A small, non-blocking status pill in the bottom-right. Phases:
   *   online  : faint dot
   *   offline : dimmed with "—" icon, no pulse
   *
   * The component is purely cosmetic — it never blocks clicks, never
   * grows beyond ~32x32 px, never opens modal dialogs. It exists so the
   * player can see "the loom is / is not moving" without lowering the
   * game's information density.
   *
   * It reports ONE thing: whether the Director is reachable. An in-flight
   * "thinking" state is deliberately NOT modelled here — the surfaces that
   * actually block on a BFF round-trip each render their own indicator at
   * the point of work (`<Spinner>` in /onboarding, /play, /setup and
   * /diagnostic, `Button loading` in /recover), which is more precise than
   * a global pill and is already visible where the player is looking. A
   * counter living here could never have been incremented: it was a
   * component-instance export, which no other module can reach.
   */

  import { derived } from 'svelte/store';
  import { llmStatus } from '$lib/stores/llmStatus.js';

  const state = derived(llmStatus, ($status) => ($status.offline ? 'offline' : 'online'));
</script>

<div
  class="agent-runner"
    data-state={$state}
    aria-hidden="true"
    title={$state === 'offline' ? 'Director unavailable' : 'Director online'}
  >
    {#if $state === 'offline'}
      <span class="dim-line"></span>
    {:else}
      <span class="dot"></span>
    {/if}
  </div>

<style>
  .agent-runner {
    position: fixed;
    right: var(--mysterium-space-4);
    bottom: calc(var(--mysterium-nav-height) + var(--mysterium-space-4));
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: var(--mysterium-surface-elevated);
    border: 1px solid var(--mysterium-border);
    pointer-events: none;
    opacity: 0.85;
    z-index: 1;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--mysterium-accent);
    opacity: 0.6;
  }
  .dim-line {
    width: 12px;
    height: 1px;
    background: var(--mysterium-fg-muted);
    opacity: 0.5;
  }
</style>

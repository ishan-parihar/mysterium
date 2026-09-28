<!--
  CloudSyncIndicator — the player-visible half of B-1.

  `cloudSyncStore` records every sync outcome in `cloudSyncState` (status, consecutiveFailures,
  lastError). Until now nothing rendered it, so a save that never reached durable storage was
  counted, logged, and invisible — the exact silent-success class the guard was built to kill. A
  store with no reader is not a delivered fix.

  Placement: the root layout, so the signal is present on every route rather than buried in
  /settings. It is deliberately small and non-blocking — a failed cloud sync does NOT stop play,
  because the local save always happened. What the player must never be misled about is whether
  their progress is on the server.

  Copy follows the same law the guard follows: it says what is true ("not yet on the server"),
  never what is merely reassuring. It never claims a save succeeded when it did not.

  Tokens only (`var(--mysterium-*)`); see `src/styles/tokens.css`.
-->
<script lang="ts">
  import { cloudSyncState } from '$lib/stores/cloudSyncStore.js';
</script>

<div class="sync" role="status" aria-live="polite">
  {#if $cloudSyncState.status === 'failed'}
    <span class="dot failed" aria-hidden="true"></span>
    <span class="label">
      Progress saved on this device, not yet on the server
      {#if $cloudSyncState.consecutiveFailures > 1}
        <span class="count">({$cloudSyncState.consecutiveFailures} attempts)</span>
      {/if}
    </span>
    {#if $cloudSyncState.lastError}
      <span class="reason">{$cloudSyncState.lastError}</span>
    {/if}
  {:else if $cloudSyncState.status === 'syncing'}
    <span class="dot syncing" aria-hidden="true"></span>
    <span class="label subtle">Saving…</span>
  {/if}
</div>

<style>
  .sync {
    display: flex;
    align-items: center;
    gap: var(--mysterium-space-2);
    padding: var(--mysterium-space-1) var(--mysterium-space-3);
    font-size: var(--mysterium-text-xs);
    color: var(--mysterium-fg);
    /* Sits above the page without stealing space: only mounted content occupies layout. */
  }

  .dot {
    width: var(--mysterium-space-2);
    height: var(--mysterium-space-2);
    border-radius: var(--mysterium-radius-full);
    flex: none;
  }

  .dot.failed {
    /* Not `--mysterium-error` (no such token); an explicit hue reads as alarm without
       pretending to be a status colour the token system already defines. */
    background: #e5484d;
  }

  .dot.syncing {
    background: var(--mysterium-fg-muted, currentColor);
    opacity: 0.5;
    animation: sync-pulse var(--mysterium-duration-base) var(--mysterium-ease) infinite;
  }

  .label {
    font-weight: 500;
  }

  .label.subtle {
    font-weight: 400;
    opacity: 0.7;
  }

  .count,
  .reason {
    opacity: 0.75;
  }

  @keyframes sync-pulse {
    0%,
    100% {
      opacity: 0.25;
    }
    50% {
      opacity: 0.6;
    }
  }

  /* A player who asked for reduced motion gets the state, not the animation. */
  @media (prefers-reduced-motion: reduce) {
    .dot.syncing {
      animation: none;
      opacity: 0.4;
    }
  }
</style>

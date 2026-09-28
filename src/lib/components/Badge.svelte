<script lang="ts">
  /**
   * Badge — small status indicator.
   * For fulfilled-vow badges, status indicators, etc.
   */
  import type { Snippet } from 'svelte';

  type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

  interface Props {
    variant?: Variant;
    class?: string;
    children: Snippet;
  }

  let { variant = 'default', class: className = '', children }: Props = $props();
</script>

<span class="badge badge-{variant} {className}">
  {@render children()}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: var(--mysterium-space-1);
    padding: var(--mysterium-space-1) var(--mysterium-space-2);
    border-radius: var(--mysterium-radius-full);
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-xs);
    font-weight: 600;
    letter-spacing: var(--mysterium-tracking-wide);
    text-transform: uppercase;
    border: 1px solid transparent;
    white-space: nowrap;
  }

  .badge-default {
    background: var(--mysterium-surface);
    color: var(--mysterium-fg-muted);
    border-color: var(--mysterium-border);
  }

  .badge-success {
    background: var(--mysterium-success-soft);
    color: var(--mysterium-success-fg);
    border-color: var(--mysterium-success);
  }

  .badge-warning {
    background: var(--mysterium-warning-soft);
    color: var(--mysterium-warning-fg);
    border-color: var(--mysterium-warning);
  }

  .badge-danger {
    background: var(--mysterium-danger-soft);
    color: var(--mysterium-danger-fg);
    border-color: var(--mysterium-danger);
  }

  .badge-info {
    background: var(--mysterium-info-soft);
    color: var(--mysterium-info-fg);
    border-color: var(--mysterium-info);
  }

  .badge-accent {
    background: var(--mysterium-accent-soft);
    color: var(--mysterium-accent-soft-fg);
    border-color: var(--mysterium-accent);
  }
</style>

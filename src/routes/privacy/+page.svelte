<script lang="ts">
  /**
   * /privacy route — what this app holds about you, and how to delete it.
   *
   * The page exists because the plan called export-your-own-data the actual privacy gap, and
   * because `/settings`'s existing reset was incomplete in a way nobody could see: it calls
   * `resetSavesInStorage`, which removes THREE keys, while the app writes at least six more. A
   * player who deleted their saves left behind their profile identities, their shares, the device
   * id their cloud key derives from, and their settings. The inventory below is built from the
   * real key set (`storedData.ts`) and annotated with what THIS build actually holds, so the page
   * reports the truth rather than a list that drifts.
   *
   * Four properties, each of which is a promise the page must be able to keep:
   *
   *  1. THE INVENTORY IS RENDERED, NOT HAND-WRITTEN. "What holds" and "how much" come from
   *     `storedData` + `storedSummary`, so a new store cannot be added without appearing here.
   *  2. DELETION IS CONFIRMED PER GROUP, WITH THE CONSEQUENCE STATED BEFORE THE CLICK. A single
   *     "Delete everything" button is the shape of a privacy page that has not thought about it;
   *     the player is told exactly which group goes and what it costs, and the click is theirs.
   *  3. WHAT IS NOT COVERED IS STATED. Telemetry on the analytics backend, a cloud save, and any
   *     free-input text already sent to a model provider are not on this device. A browser-side
   *     delete is not a deletion of everything, and the page says so instead of letting the word
   *     "everything" imply that it is.
   *  4. NO SILENT OVERWRITE. A delete that fails (private mode, quota) reports the failure rather
   *     than leaving the page claiming success.
   */
  import { onMount } from 'svelte';
  import Seo from '$lib/components/Seo.svelte';
  import RouteShell from '$lib/components/RouteShell.svelte';
  import Card from '$lib/components/Card.svelte';
  import Stack from '$lib/components/Stack.svelte';
  import Button from '$lib/components/Button.svelte';
  import {
    DATA_GROUP_LABEL,
    DATA_GROUP_ORDER,
    GROUP_CONSEQUENCE,
    NOT_COVERED,
    WHAT_LEAVES_THIS_DEVICE,
    deletableKeys,
    storedData,
    storedSummary,
    type DataGroup,
    type StoredItem,
  } from '$core/presentation/storedData.js';

  let items = $state<readonly StoredItem[]>([]);
  /** The group the player is being asked to confirm, or `null`. */
  let confirming = $state<DataGroup | null>(null);
  let failure = $state<string | null>(null);
  let deleted = $state<readonly DataGroup[]>([]);

  onMount(() => {
    items = storedData((k) => localStorage.getItem(k) !== null);
  });

  const summary = $derived(storedSummary(items));
  const nothingHeld = $derived(summary.present === 0);

  function byGroup(g: DataGroup): readonly StoredItem[] {
    return items.filter((i) => i.group === g);
  }

  function deleteGroup(g: DataGroup): void {
    const keys = deletableKeys(byGroup(g));
    // Log the exact set rather than trusting the filter. This path destroys data, and a group
    // deletion that removed a neighbouring group's key would be silent — the page would still say
    // "deleted" and the count would still move.
    console.log(`[privacy] deleting group=${g} keys=${keys.join(',') || '(none)'}`);
    try {
      for (const k of keys) localStorage.removeItem(k);
    } catch (err) {
      console.error('[privacy] delete failed:', err);
      failure = `This device would not let the page delete your ${DATA_GROUP_LABEL[g].toLowerCase()}. Nothing was reported as deleted.`;
      confirming = null;
      return;
    }
    deleted = [...deleted, g];
    items = storedData((k) => localStorage.getItem(k) !== null);
    confirming = null;
    failure = null;
  }
</script>

<Seo title="Privacy" description="What this app holds about you, and how to delete it." />

<RouteShell title="Privacy" back="/settings" backLabel="Settings">
  <Stack>
    <Card padding="space-5">
      <p class="eyebrow">What leaves this device</p>
      {#each WHAT_LEAVES_THIS_DEVICE as section (section.title)}
        <p><strong>{section.title}</strong></p>
        <p>{section.body}</p>
      {/each}
    </Card>

    <Card padding="space-5">
      <p class="eyebrow">What is here</p>
      {#if nothingHeld}
        <p data-testid="privacy-empty">
          This browser holds nothing for Mysterium. Nothing has been saved on this device.
        </p>
      {:else}
        <p data-testid="privacy-summary">
          This device holds {summary.present} of {summary.total} things the app can store. Each is
          listed below with what it contains, and each can be deleted on its own.
        </p>
      {/if}
      {#if failure}
        <p data-testid="privacy-failure">{failure}</p>
      {/if}
    </Card>

    {#each DATA_GROUP_ORDER as group (group)}
      {@const rows = byGroup(group)}
      {@const held = deletableKeys(rows).length}
      {#if rows.length > 0}
        <Card padding="space-5">
          <p class="eyebrow">{DATA_GROUP_LABEL[group]}</p>
          {#each rows as row (row.key)}
            <p data-testid="privacy-item-{row.key}">
              {row.label} — {row.holds}
              {#if !row.present}
                <span data-testid="not-held">(not held on this device)</span>
              {/if}
            </p>
          {/each}
          {#if confirming === group}
            <p data-testid="privacy-confirm-text">{GROUP_CONSEQUENCE[group]}</p>
            <Stack>
              <Button onclick={() => deleteGroup(group)}>Yes, delete it</Button>
              <Button onclick={() => (confirming = null)}>Keep it</Button>
            </Stack>
          {:else if held > 0}
            <Button onclick={() => (confirming = group)}>
              Delete {DATA_GROUP_LABEL[group].toLowerCase()}
            </Button>
          {:else}
            <p data-testid="privacy-nothing-to-delete">Nothing here is stored on this device.</p>
          {/if}
          {#if deleted.includes(group)}
            <p data-testid="privacy-deleted-{group}">Deleted. Reload the page to see it gone.</p>
          {/if}
        </Card>
      {/if}
    {/each}

    <Card padding="space-5">
      <p class="eyebrow">What deleting here does NOT reach</p>
      {#each NOT_COVERED as note, i (i)}
        <p>{note}</p>
      {/each}
      <p>
        If you exported your data first, you hold a copy of everything above and can delete that
        file yourself.
      </p>
    </Card>
  </Stack>
</RouteShell>

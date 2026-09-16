<script lang="ts">
  /**
   * /journal route — player journal + practice check-ins (doc 39).
   *
   * The check-in surface: select an active vow, answer the five reflection
   * prompts, and the record flows through processCheckIn (VowService) —
   * crisis-gated, engine-integrated, client-side persisted. Veil-compliant:
   * depth scores are recorded privately, never rendered as numbers.
   */

  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import Seo from '$lib/components/Seo.svelte';
  import RouteShell from '$lib/components/RouteShell.svelte';
  import Card from '$lib/components/Card.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Stack from '$lib/components/Stack.svelte';
  import { gameStore, setSignificator } from '$lib/stores/gameStore.js';
  import { loadSignificatorFromStorage } from '$lib/stores/saveHydration.js';
  import { loadWorldState, saveWorldState } from '$infra/persistence/SaveRepository.js';
  import { loadVowBook, saveVowBook, vowBookStore } from '$lib/stores/vowStore.js';
  import { processCheckIn } from '$core/practice/practiceTools.js';
  import { REFLECTION_PROMPTS } from '$core/practice/ReflectionEvidence.js';
  import { describeEncounterCount, describeSessionCount } from '$core/presentation/veilDescriptors.js';
  import type { CodexEntry, Vow } from '$core/domain/SharedTypes.js';
  import type { WorldState } from '$core/engines/EncounterScheduler.js';

  const sig = $derived($gameStore.significator);
  const entries = $derived((sig?.codexEntries ?? []) as readonly CodexEntry[]);
  const vows = $derived($vowBookStore.vows as readonly Vow[]);
  const activeVows = $derived(vows.filter((v) => (v.status ?? (v.fulfilled ? 'fulfilled' : 'active')) === 'active'));

  // ── Check-in flow state ──
  let checkInVow = $state<Vow | null>(null);
  let answers = $state<string[]>(REFLECTION_PROMPTS.map(() => ''));
  let checkInStage = $state<'idle' | 'safety' | 'done'>('idle');

  onMount(() => {
    if (!browser) return;
    if (!$gameStore.significator) {
      const loaded = loadSignificatorFromStorage();
      if (loaded) setSignificator(loaded);
    }
    loadVowBook();
  });

  function beginCheckIn(vow: Vow): void {
    checkInVow = vow;
    answers = REFLECTION_PROMPTS.map(() => '');
    checkInStage = 'idle';
  }

  function cancelCheckIn(): void {
    checkInVow = null;
    checkInStage = 'idle';
  }

  async function submitCheckIn(): Promise<void> {
    if (!checkInVow || !sig) return;
    const world: WorldState | null = loadWorldState();
    if (!world) return;
    const outcome = processCheckIn({
      book: $vowBookStore,
      sig,
      world,
      vow: checkInVow,
      answers: REFLECTION_PROMPTS.map((_, i) => answers[i] ?? ''),
      now: Date.now(),
    });
    if (outcome.routedToSafety) {
      // Journal text never leaves the client; nothing integrated, nothing stored.
      checkInStage = 'safety';
      return;
    }
    saveVowBook(outcome.book);
    setSignificator(outcome.sig);
    if (browser) localStorage.setItem('profile:v1', JSON.stringify(outcome.sig));
    saveWorldState(outcome.world);
    checkInVow = null;
    checkInStage = 'done';
  }

  function formatDate(ms: number): string {
    return new Date(ms).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
</script>

<Seo
  title="Journal"
  description="Your Mysterium journal — codex entries discovered, vows made, and reflections kept."
  indexable={false}
/>

<RouteShell title="Journal" back="/">
  {#if !sig}
    <p class="empty-state">No save found. Enter the world to begin your journey.</p>
  {:else}
    <Stack gap="space-5">
      <Card variant="accent" padding="space-5">
        <Stack gap="space-1">
          <p class="summary-line">{describeEncounterCount(sig.totalEncounters)}</p>
          <p class="summary-line muted">{describeSessionCount(sig.totalSessions)}</p>
        </Stack>
      </Card>

      {#if checkInVow}
        <Card variant="accent" padding="space-5">
          <Stack gap="space-3">
            <h2 class="section-title">Reflection — {checkInVow.text}</h2>
            {#each REFLECTION_PROMPTS as prompt, i}
              <label class="prompt-label" for={`prompt-${i}`}>
                <span class="prompt-text">{prompt}</span>
                <textarea
                  id={`prompt-${i}`}
                  class="prompt-input"
                  rows="3"
                  bind:value={answers[i]}
                  placeholder="Only what you want to keep."
                ></textarea>
              </label>
            {/each}
            <div class="checkin-actions">
              <Button variant="default" onclick={cancelCheckIn}>Not now</Button>
              <Button variant="primary" onclick={submitCheckIn}>Keep this reflection</Button>
            </div>
          </Stack>
        </Card>
      {:else if checkInStage === 'safety'}
        <Card variant="accent" padding="space-5">
          <Stack gap="space-2">
            <h2 class="section-title">You are not alone</h2>
            <p class="safety-text">
              What you wrote matters, and it stays here — nothing was stored, nothing was
              analyzed. If you are in pain, please reach out to someone: a trusted person
              near you, or your local crisis line. In the US you can call or text
              <strong>988</strong>; elsewhere, findahelpline.com lists local services.
            </p>
            <Button variant="default" onclick={() => (checkInStage = 'idle')}>Back to my journal</Button>
          </Stack>
        </Card>
      {:else}
        {#if checkInStage === 'done'}
          <Card padding="space-4">
            <p class="done-note">Recorded — held privately, nothing to act on.</p>
          </Card>
        {/if}

        <Stack gap="space-3">
          <h2 class="section-title">Practice objectives</h2>
          {#if vows.length === 0}
            <Card padding="space-5"><p class="empty-section">No vows made yet.</p></Card>
          {:else}
            <Card padding="space-0">
              <ul class="item-list" role="list">
                {#each vows as vow, i}
                  <li class="item vow-item" class:fulfilled={vow.fulfilled} class:divider={i > 0}>
                    <p class="item-text">{vow.text}</p>
                    <div class="item-meta">
                      <span class="item-date">{formatDate(vow.createdAtMs)}</span>
                      {#if vow.fulfilled}
                        <Badge variant="success">fulfilled</Badge>
                      {:else if (vow.status ?? 'active') === 'active'}
                        <Button variant="default" size="sm" onclick={() => beginCheckIn(vow)}>Reflect</Button>
                      {/if}
                    </div>
                  </li>
                {/each}
              </ul>
            </Card>
          {/if}
          {#if activeVows.length === 0 && vows.length > 0}
            <p class="all-set">Every vow here is either fulfilled or resting.</p>
          {/if}
        </Stack>
      {/if}

      <Stack gap="space-3">
        <h2 class="section-title">Codex Entries</h2>
        {#if entries.length === 0}
          <Card padding="space-5"><p class="empty-section">No entries yet. Explore the world.</p></Card>
        {:else}
          <Card padding="space-0">
            <ul class="item-list" role="list">
              {#each entries as entry, i}
                <li class="item" class:divider={i > 0}>
                  <h3 class="item-title">{entry.title}</h3>
                  <p class="item-body">{entry.body}</p>
                  <span class="item-date">{formatDate(entry.unlockedAtMs)}</span>
                </li>
              {/each}
            </ul>
          </Card>
        {/if}
      </Stack>
    </Stack>
  {/if}
</RouteShell>

<style>
  .empty-state {
    color: var(--mysterium-fg-muted);
    font-style: italic;
    text-align: center;
    padding: var(--mysterium-space-7) var(--mysterium-space-4);
  }

  .summary-line {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-base);
    color: var(--mysterium-fg);
    margin: 0;
  }

  .summary-line.muted {
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    font-style: italic;
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

  .empty-section {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    font-style: italic;
    text-align: center;
    margin: 0;
  }

  .item-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .item {
    padding: var(--mysterium-space-4) var(--mysterium-space-5);
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-2);
  }

  .item.divider {
    border-top: 1px solid var(--mysterium-border);
  }

  .item-text {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-base);
    color: var(--mysterium-fg);
    line-height: var(--mysterium-leading-normal);
    margin: 0;
  }

  .item-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--mysterium-space-3);
  }

  .item-date {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-xs);
    color: var(--mysterium-fg-muted);
  }

  .vow-item.fulfilled {
    opacity: 0.7;
  }

  .item-title {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-md);
    font-weight: 600;
    color: var(--mysterium-fg);
    margin: 0;
  }

  .item-body {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    line-height: var(--mysterium-leading-relaxed);
    margin: 0;
  }

  .prompt-label {
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-1);
  }

  .prompt-text {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg);
  }

  .prompt-input {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg);
    background: var(--mysterium-bg);
    border: 1px solid var(--mysterium-border);
    border-radius: var(--mysterium-radius-sm, 6px);
    padding: var(--mysterium-space-2) var(--mysterium-space-3);
    resize: vertical;
  }

  .prompt-input:focus {
    outline: none;
    border-color: var(--mysterium-accent);
  }

  .checkin-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--mysterium-space-3);
  }

  .safety-text {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg);
    line-height: var(--mysterium-leading-relaxed);
    margin: 0;
  }

  .done-note {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    font-style: italic;
    text-align: center;
    margin: 0;
  }

  .all-set {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-xs);
    color: var(--mysterium-fg-muted);
    font-style: italic;
    text-align: center;
    margin: 0;
  }
</style>

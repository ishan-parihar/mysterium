<script lang="ts">
  /**
   * /recover route — restore save on a new device via 12-word mnemonic.
   *
   * Flow:
   *   1. Player enters 12-word mnemonic (paste-distribute or word-by-word)
   *   2. POST /api/recovery/restore → returns deviceId
   *   3. GET /api/save?deviceId=… → returns save blob
   *   4. Validate + store in localStorage → redirect to /
   */

  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import Seo from '$lib/components/Seo.svelte';
  import RouteShell from '$lib/components/RouteShell.svelte';
  import Card from '$lib/components/Card.svelte';
  import Button from '$lib/components/Button.svelte';
  import Stack from '$lib/components/Stack.svelte';
  import { setSignificator } from '$lib/stores/gameStore.js';
  import { persistSignificator } from '$lib/stores/saveHydration.js';
  import { showToast } from '$lib/stores/toastStore.js';
  import { validateSignificator } from '$infra/persistence/validateSignificator.js';

  let words = $state(Array(12).fill(''));
  let error = $state<string | null>(null);
  let isRecovering = $state(false);
  let inputs: HTMLInputElement[] = [];

  function handleInput(i: number, value: string) {
    words[i] = value.trim().toLowerCase();
    error = null;
    if (value.includes(' ')) {
      const pasted = value.trim().toLowerCase().split(/\s+/);
      for (let j = 0; j < 12 && j < pasted.length; j++) {
        words[j] = pasted[j] ?? '';
      }
      words = [...words];
      const lastIdx = Math.min(pasted.length, 11);
      inputs[lastIdx]?.focus();
    } else if (value.length >= 4 && i < 11) {
      inputs[i + 1]?.focus();
    }
  }

  function handleKeydown(i: number, e: KeyboardEvent) {
    if (e.key === 'Backspace' && !words[i] && i > 0) {
      inputs[i - 1]?.focus();
    } else if (e.key === 'Enter' && i < 11) {
      inputs[i + 1]?.focus();
    }
  }

  async function attemptRecovery() {
    if (!browser) return;
    const filled = words.filter((w) => w.length > 0);
    if (filled.length !== 12) {
      error = 'Please enter all 12 words.';
      return;
    }

    isRecovering = true;
    error = null;

    try {
      const mnemonic = words.join(' ');

      const restoreRes = await fetch('/api/recovery/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mnemonic }),
      });

      if (!restoreRes.ok) {
        const detail = await restoreRes.json().catch(() => ({}));
        if (restoreRes.status === 404) {
          error = 'That recovery phrase was not recognized. Check each word and try again.';
        } else if (restoreRes.status === 429) {
          error = 'Too many recovery attempts. Please wait a few minutes and try again.';
        } else {
          error = detail?.error ?? `Recovery failed (${restoreRes.status})`;
        }
        isRecovering = false;
        return;
      }

      const { deviceId } = await restoreRes.json();

      const saveRes = await fetch(`/api/save?deviceId=${encodeURIComponent(deviceId)}`);
      if (!saveRes.ok) {
        if (saveRes.status === 404) {
          error = 'No save found for that recovery phrase. It may have been deleted.';
        } else {
          error = `Failed to fetch save (${saveRes.status})`;
        }
        isRecovering = false;
        return;
      }

      const saveData = await saveRes.json();

      try {
        // ponytail: C.12 — decrypt the blob if encrypted, else parse as plaintext (backward compat).
        let plaintext: string;
        if (saveData.encrypted) {
          const { CryptoStore } = await import('$infra/crypto/CryptoStore.js');
          // The key is derived from the deviceId bound to the recovery mnemonic.
          // The server returns the deviceId with the save; we derive the key from it.
          const crypto = new CryptoStore(deviceId);
          plaintext = await crypto.decrypt(saveData.blob);
        } else {
          plaintext = saveData.blob;
        }
        const sig = validateSignificator(JSON.parse(plaintext));
        if (!sig) throw new Error('Invalid save data');
        // Restore the deviceId so future syncs use the same key.
        localStorage.setItem('mysterium:device-id', deviceId);
        // THE RESTORE PATH WROTE THE BARE KEY. `localStorage.setItem('profile:v1', …)` is a key no
        // reader ever asks for — the engine hydrates through `SaveRepository`, whose `KeyValueStore`
        // prefixes with `mysterium:` — so a successfully decrypted, correctly validated save was
        // written, the player was told "Save restored", they were sent to `/`, and on the very next
        // load they were a stranger again. The most destructive place this asymmetry can live: a
        // restore that restores nothing. Same one writer as every other path (M8).
        await persistSignificator(sig);
        setSignificator(sig);
        showToast('Save restored', 'success', 3000);
        goto('/');
      } catch {
        error = 'The recovered save data was corrupt or the key did not match. Contact support.';
        isRecovering = false;
      }
    } catch (err) {
      error = 'Could not reach the recovery service. Check your internet connection.';
      isRecovering = false;
    }
  }
</script>

<Seo
  title="Recover Save"
  description="Restore your Mysterium progress on a new device using your 12-word recovery phrase."
  indexable={false}
/>

<RouteShell title="Recover Save" back="/">
  <Stack gap="space-5">
    <Card padding="space-5">
      <p class="recover-intro">
        Enter your 12-word recovery phrase to restore your progress on this device.
        You can paste the full phrase into any word box.
      </p>
    </Card>

    <div class="word-grid" role="group" aria-label="12-word recovery phrase">
      {#each words as word, i}
        <div class="word-cell">
          <label for="word-{i}" class="word-label">{i + 1}</label>
          <input
            id="word-{i}"
            bind:this={inputs[i]}
            type="text"
            value={word}
            oninput={(e) => handleInput(i, e.currentTarget.value)}
            onkeydown={(e) => handleKeydown(i, e)}
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            class="word-input"
            disabled={isRecovering}
            aria-label={`Recovery word ${i + 1}`}
          />
        </div>
      {/each}
    </div>

    {#if error}
      <p class="recover-error" role="alert">{error}</p>
    {/if}

    <Button
      variant="primary"
      size="lg"
      onclick={attemptRecovery}
      loading={isRecovering}
      disabled={words.filter((w) => w.length > 0).length !== 12}
    >
      Restore Save
    </Button>

    <p class="recover-note">
      Lost your recovery phrase? Unfortunately, saves cannot be restored without it.
      This is by design — your data is yours alone.
    </p>
  </Stack>
</RouteShell>

<style>
  .recover-intro {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    line-height: var(--mysterium-leading-relaxed);
    margin: 0;
  }

  .word-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--mysterium-space-3);
  }

  @media (min-width: 640px) {
    .word-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .word-cell {
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-1);
  }

  .word-label {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-xs);
    color: var(--mysterium-fg-muted);
    font-weight: 600;
    letter-spacing: var(--mysterium-tracking-wide);
  }

  .word-input {
    width: 100%;
    padding: var(--mysterium-space-2) var(--mysterium-space-3);
    background: var(--mysterium-surface);
    border: 1px solid var(--mysterium-border);
    border-radius: var(--mysterium-radius);
    color: var(--mysterium-fg);
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    transition: border-color var(--mysterium-duration-fast) var(--mysterium-ease),
                box-shadow var(--mysterium-duration-fast) var(--mysterium-ease);
    -webkit-tap-highlight-color: transparent;
  }

  .word-input:focus {
    outline: none;
    border-color: var(--mysterium-accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--mysterium-accent) 20%, transparent);
  }

  .word-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .recover-error {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-danger);
    background: var(--mysterium-danger-soft);
    border: 1px solid var(--mysterium-danger);
    border-radius: var(--mysterium-radius);
    padding: var(--mysterium-space-3) var(--mysterium-space-4);
    margin: 0;
  }

  .recover-note {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    line-height: var(--mysterium-leading-relaxed);
    text-align: center;
    font-style: italic;
    margin: 0;
  }
</style>

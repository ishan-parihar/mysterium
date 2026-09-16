<script lang="ts">
  /**
   * /profiles route — multi-profile management.
   * Parity with CLI 'mysterium profile list/create/switch/delete'.
   */
  import Seo from '$lib/components/Seo.svelte';
  import RouteShell from '$lib/components/RouteShell.svelte';
  import Card from '$lib/components/Card.svelte';
  import Button from '$lib/components/Button.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Stack from '$lib/components/Stack.svelte';
  import Cluster from '$lib/components/Cluster.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import Input from '$lib/components/Input.svelte';
  import {
    profilesStore,
    activeProfileStore,
    createProfile,
    deleteProfile,
    setActiveProfile,
  } from '$lib/stores/profileStore.js';
  import { showToast } from '$lib/stores/toastStore.js';

  let showCreate = $state(false);
  let newName = $state('');
  let deleteTarget = $state<string | null>(null);

  const profiles = $derived(Object.values($profilesStore));
  const active = $derived($activeProfileStore);

  function handleCreate() {
    const name = newName.trim();
    if (!name) {
      showToast('Profile name required', 'warning');
      return;
    }
    if ($profilesStore[name]) {
      showToast('Profile already exists', 'warning');
      return;
    }
    createProfile(name);
    setActiveProfile(name);
    showToast(`Profile "${name}" created + activated`, 'success');
    newName = '';
    showCreate = false;
  }

  function handleSwitch(name: string) {
    setActiveProfile(name);
    showToast(`Switched to profile "${name}"`, 'info');
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteProfile(deleteTarget);
    showToast(`Profile "${deleteTarget}" deleted`, 'info');
    deleteTarget = null;
  }

  function formatDate(ms: number): string {
    return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
</script>

<Seo
  title="Profiles"
  description="Manage your Mysterium profiles — multiple players on one device."
  indexable={false}
/>

<RouteShell title="Profiles" back="/">
  <Stack gap="space-5">
    <Cluster gap="space-3" justify="between">
      <p class="profile-count">{profiles.length} profile{profiles.length === 1 ? '' : 's'}</p>
      <Button variant="primary" size="sm" onclick={() => (showCreate = true)}>
        + New Profile
      </Button>
    </Cluster>

    {#if profiles.length === 0}
      <Card padding="space-5">
        <p class="empty">No profiles yet. Create one to begin.</p>
      </Card>
    {:else}
      <Stack gap="space-3">
        {#each profiles as profile (profile.name)}
          <Card padding="space-5" variant={active === profile.name ? 'accent' : 'default'}>
            <div class="profile-row">
              <div class="profile-info">
                <Cluster gap="space-2" align="start" wrap={false}>
                  <h3 class="profile-name">{profile.name}</h3>
                  {#if active === profile.name}
                    <Badge variant="success">Active</Badge>
                  {/if}
                </Cluster>
                <p class="profile-meta">
                  Created {formatDate(profile.createdAt)} · {profile.totalSessions} sessions · {profile.totalEncounters} encounters
                </p>
              </div>
              <Cluster gap="space-2">
                {#if active !== profile.name}
                  <Button size="sm" variant="ghost" onclick={() => handleSwitch(profile.name)}>Switch</Button>
                {/if}
                <Button size="sm" variant="danger" onclick={() => (deleteTarget = profile.name)}>Delete</Button>
              </Cluster>
            </div>
          </Card>
        {/each}
      </Stack>
    {/if}
  </Stack>
</RouteShell>

<Modal open={showCreate} onclose={() => (showCreate = false)} title="Create Profile" size="sm">
  <Stack gap="space-4">
    <Input
      value={newName}
      oninput={(v) => (newName = v)}
      placeholder="Profile name (e.g. 'main', 'alt')"
      label="Profile name"
    />
    <Cluster gap="space-3" justify="end">
      <Button variant="ghost" onclick={() => (showCreate = false)}>Cancel</Button>
      <Button variant="primary" onclick={handleCreate}>Create + Activate</Button>
    </Cluster>
  </Stack>
</Modal>

<Modal open={deleteTarget !== null} onclose={() => (deleteTarget = null)} title="Delete Profile?" size="sm">
  <Stack gap="space-4">
    <p class="delete-warning">
      This will permanently delete the profile "{deleteTarget}" including its encounter log and narrative memory.
      This cannot be undone.
    </p>
    <Cluster gap="space-3" justify="end">
      <Button variant="ghost" onclick={() => (deleteTarget = null)}>Cancel</Button>
      <Button variant="danger" onclick={handleDelete}>Delete</Button>
    </Cluster>
  </Stack>
</Modal>

<style>
  .profile-count {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    margin: 0;
  }

  .empty {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    font-style: italic;
    text-align: center;
    margin: 0;
  }

  .profile-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--mysterium-space-3);
  }

  .profile-info {
    flex: 1;
    min-width: 0;
  }

  .profile-name {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-md);
    font-weight: 600;
    color: var(--mysterium-fg);
    margin: 0;
  }

  .profile-meta {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-xs);
    color: var(--mysterium-fg-muted);
    margin: var(--mysterium-space-1) 0 0 0;
  }

  .delete-warning {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg);
    line-height: var(--mysterium-leading-relaxed);
    margin: 0;
  }
</style>

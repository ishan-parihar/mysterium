<script lang="ts">
  /**
   * /pod route — the cohort weave's sync surface (38 §4.2, M0).
   *
   * Everything on this page reaches the pod's state through `PodTransport`. That is the whole point:
   * **G48** locks the CLI half of the seam (the pod CLI constructs, applies and polls through
   * `KVPodCoordinator`), and a web surface that read the KV keys or a mirror file directly would be
   * the same bypass in a second place — a tail that never passed the serial `applyEvent` discipline
   * and never met the `payloadIsSafe` privacy wall (L1, 38 §4.3). `syncPod` polls through
   * `pollEvents(lastSeenSeq)`, exactly as `mysterium pod sync` does, and forms through `apply`.
   *
   * The honest parts are the point of the route:
   *   - **no pod configured is a state, not a zero.** A player who has never formed a pod has no
   *     state key at all. This page says that and offers the one action a single browser can
   *     complete; it does not render an empty tail under a healthy-looking pod header.
   *   - **a refusal keeps its reason.** `apply` returns `ok: false` with the wall's own reason, and
   *     that reason is what gets shown — a silent failure here would be indistinguishable from a
   *     working one.
   *   - **forming is the only mutating action offered.** Joining needs a pod that exists on another
   *     machine, publishing and recognition need other members, and a ritual needs a quorum; those
   *     belong to the CLI, where a founder and their members share one store. Buttons here would
   *     produce refusals dressed as a broken page.
   */

  import { onMount } from 'svelte';
  import Seo from '$lib/components/Seo.svelte';
  import RouteShell from '$lib/components/RouteShell.svelte';
  import Card from '$lib/components/Card.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Stack from '$lib/components/Stack.svelte';
  import Input from '$lib/components/Input.svelte';
  import { describeEvent } from '$lib/pods/podEventNames.js';
  import {
    BrowserPodKV,
    coordinatorForMirror,
    formPod,
    loadPodMirror,
    savePodMirror,
    syncPod,
    readPodStatus,
    type PodMirror,
    type PodStatus,
  } from '$lib/pods/podSync.js';
  import type { SerializedEvent } from '$core/pods/podStateMachine.js';

  let mirror = $state<PodMirror | null>(null);
  let status = $state<PodStatus | null>(null);
  let tail = $state<readonly SerializedEvent[]>([]);
  let busy = $state(false);
  let refusal = $state<string | null>(null);
  let newPodId = $state('');

  onMount(() => {
    const loaded = loadPodMirror();
    mirror = loaded;
    const transport = coordinatorForMirror(new BrowserPodKV(), loaded);
    readPodStatus(transport, loaded).then((s) => {
      status = s;
      if (s.kind === 'configured') return syncPod(transport, loaded);
      return null;
    }).then((r) => {
      if (!r) return;
      tail = r.events;
      mirror = { ...loaded, lastSeenSeq: r.lastSeenSeq };
      savePodMirror(mirror);
    });
  });

  async function refresh(): Promise<void> {
    if (!mirror) return;
    busy = true;
    try {
      const transport = coordinatorForMirror(new BrowserPodKV(), mirror);
      const r = await syncPod(transport, mirror);
      tail = r.events;
      mirror = { ...mirror, lastSeenSeq: r.lastSeenSeq };
      savePodMirror(mirror);
      status = r.status;
      refusal = null;
    } finally {
      busy = false;
    }
  }

  async function form(): Promise<void> {
    if (!mirror) return;
    busy = true;
    try {
      const transport = coordinatorForMirror(new BrowserPodKV(), mirror);
      const r = await formPod(transport, mirror, newPodId, 'we practice together', Date.now());
      status = r.status;
      // A refusal keeps the transport's own wording — the wall's reason, not ours.
      refusal = r.ok ? null : r.reason;
      if (r.ok) {
        mirror = { ...mirror, podId: newPodId.trim(), lastSeenSeq: 0 };
        tail = [];
      }
    } finally {
      busy = false;
    }
  }
</script>

<Seo
  title="Cohort"
  description="The Mysterium cohort weave — your pod, its event tail, and what the pod has been told about you."
/>

<RouteShell title="Cohort" back="/">
  <Stack gap="space-4">
    <Card>
      <p class="lede">
        A pod is a small group that practises the same ground, and the pod's history is a serial
        event log rather than a chat. What is below is that log's tail, read through the same
        transport the game loop writes through — the same discipline, the same privacy wall, the
        same order.
      </p>
    </Card>

    {#if status === null}
      <Card><p class="meta">Reading the pod log…</p></Card>
    {:else if status.kind === 'unformed'}
      <Card>
        <h3 class="section-title">No pod configured</h3>
        <Stack gap="space-3">
          <p class="lede">{status.reason}</p>
          <p class="meta">
            Forming a pod starts an event log on this device. It is mirrored mode: the pod's events
            travel between members, and nothing about your interior state travels with them.
          </p>
          <Input
            value={newPodId}
            oninput={(v) => (newPodId = v)}
            label="Pod id"
            placeholder="pod-…"
          />
          <Button variant="primary" disabled={busy} onclick={() => form()}>
            {busy ? 'Forming…' : 'Form a pod on this device'}
          </Button>
          {#if refusal}
            <p class="refusal" role="alert">{refusal}</p>
          {/if}
        </Stack>
      </Card>
    {:else}
      <Card>
        <h3 class="section-title">Your pod</h3>
        <Stack gap="space-3">
          <div class="head">
            <span class="pod-id">{status.podId}</span>
            <Badge variant={status.quorumMet ? 'success' : 'warning'}>
              {status.quorumMet ? 'quorum met' : 'quorum not met'}
            </Badge>
          </div>
          <p class="meta">{status.covenant}</p>
          <dl class="facts">
            <dt>Members</dt>
            <dd>
              {status.memberCount} of a possible {status.maxMembers}
              {status.isFounder ? ' · you formed it' : ''}
            </dd>
            <dt>Ritual</dt>
            <dd>{status.ritual ? `${status.ritual.mode} — ${status.ritual.state}` : 'none open'}</dd>
            <dt>Recognition signals</dt>
            <dd>{status.recognitions}</dd>
            <dt>Events you have read</dt>
            <dd>{status.lastSeenSeq}</dd>
          </dl>
          {#if !status.quorumMet}
            <p class="meta">
              A shared ritual cannot open until {status.minMembers} members are present. Until then
              the pod is a log with one member in it, which is honest and not very much yet.
            </p>
          {/if}
        </Stack>
      </Card>

      <Card>
        <h3 class="section-title">Sync</h3>
        <Stack gap="space-3">
          <p class="meta">
            Polling picks up everything after the last sequence number you read — the same
            client-polling contract the command line uses.
          </p>
          <Button variant="primary" disabled={busy} onclick={() => refresh()}>
            {busy ? 'Syncing…' : 'Sync the pod log'}
          </Button>
          {#if refusal}
            <p class="refusal" role="alert">{refusal}</p>
          {/if}
        </Stack>
      </Card>

      <Card>
        <h3 class="section-title">Event tail</h3>
        {#if tail.length === 0}
          <p class="meta">
            No new events since the last sync. That is the honest reading — the pod log is quiet, not
            empty, and the count of events you have read is above.
          </p>
        {:else}
          <ol class="tail">
            {#each tail as event, i (i)}
              <li class="event">
                <span class="event-type">{describeEvent(event)}</span>
                <span class="event-time">{new Date(event.occurredAtMs).toLocaleString()}</span>
              </li>
            {/each}
          </ol>
        {/if}
      </Card>
    {/if}
  </Stack>
</RouteShell>

<style>
  .section-title {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: var(--mysterium-tracking-wider);
    color: var(--mysterium-accent);
    margin: 0 0 var(--mysterium-space-3);
  }
  .lede {
    color: var(--mysterium-fg);
    line-height: var(--mysterium-leading-normal);
  }
  .meta {
    color: var(--mysterium-fg-muted);
    font-size: var(--mysterium-text-sm);
  }
  .refusal {
    color: var(--mysterium-fg);
    font-size: var(--mysterium-text-sm);
    border-left: 2px solid var(--mysterium-accent);
    padding-left: var(--mysterium-space-2);
  }
  .head {
    display: flex;
    align-items: center;
    gap: var(--mysterium-space-2);
  }
  .pod-id {
    font-weight: 600;
  }
  .facts {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: var(--mysterium-space-1) var(--mysterium-space-3);
  }
  .facts dt {
    font-size: var(--mysterium-text-xs);
    text-transform: uppercase;
    letter-spacing: var(--mysterium-tracking-wider);
    color: var(--mysterium-fg-muted);
  }
  .facts dd {
    margin: 0;
  }
  .tail {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-2);
  }
  .event {
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-1);
    padding: var(--mysterium-space-2);
    border-left: 2px solid var(--mysterium-border);
  }
  .event-type {
    font-weight: 500;
  }
  .event-time {
    font-size: var(--mysterium-text-xs);
    color: var(--mysterium-fg-muted);
  }
</style>

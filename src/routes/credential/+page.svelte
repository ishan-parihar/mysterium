<script lang="ts">
  /**
   * /credential route — the local claim ledger (doc 41 §4).
   *
   * WHAT A CREDENTIAL IS HERE, exactly: a self-issued claim about your own
   * assessed competency, citing typed evidence with a reliability disclosure
   * attached. It is NOT a grade from an institution and NOT a rating by a
   * verifier — real raters and institutions are owner-blocked and no external
   * body reads these. The page says so in those terms rather than implying a
   * credential an outside party would honour.
   *
   * The consent model is per-claim and is enforced by the kernel, not here:
   * `draftClaim` derives a claim with `subject: ''`, and only `issueClaim`,
   * which fails closed on an empty name, can issue it. So this page can offer
   * draft → name → issue, and the naming is the player's act (41 §4.3).
   *
   * Every mutation calls a ClaimLedger function and persists the returned
   * ledger (credentialStore). The page never authors a claim shape.
   */

  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import Seo from '$lib/components/Seo.svelte';
  import RouteShell from '$lib/components/RouteShell.svelte';
  import Card from '$lib/components/Card.svelte';
  import Stack from '$lib/components/Stack.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import {
    buildCredentialExport,
    readCredentialView,
    type CredentialView,
  } from '$core/presentation/playerTelemetryView.js';
  import {
    credentialLedger,
    currentLedger,
    draftFromEvidence,
    issueDraft,
    loadCredentialLedger,
    revoke,
  } from '$lib/stores/credentialStore.js';

  const DEFAULT_DESCRIPTOR = 'Demonstrates assessed competency at measured depth';
  const DEFAULT_METHOD = 'in-game depth assessment (31 dual-depth model)';
  const DEFAULT_QA = 'mysterium internal assessment machinery; evidence refs disclosed';

  let view = $derived<CredentialView>(readCredentialView($credentialLedger));
  let ledgerLoaded = $state(false);

  let domain = $state('math.foundations');
  let descriptor = $state(DEFAULT_DESCRIPTOR);
  let issueFor = $state<string | null>(null);
  let subjectName = $state('');
  let notice = $state('');
  let problem = $state('');

  let exportName = $state('');
  let exportFor = $state<string | null>(null);
  let exportError = $state('');

  onMount(() => {
    if (!browser) return;
    loadCredentialLedger();
    ledgerLoaded = true;
  });

  function draft(): void {
    problem = '';
    const mastery = { type: 'mastery' as const, ref: `mastery:${domain}:applied`, reliability: { measuredAtMs: Date.now() } };
    const out = draftFromEvidence({
      competencyDescriptor: descriptor.trim() || DEFAULT_DESCRIPTOR,
      domain: domain.trim() || 'math.foundations',
      evidence: [mastery],
      method: DEFAULT_METHOD,
      qualityAssurance: DEFAULT_QA,
      nowMs: Date.now(),
    });
    if (!out.claim) {
      problem = out.failures.join('; ');
      return;
    }
    notice = `Claim drafted. It is not a credential until you name it.`;
    issueFor = out.claim.id;
  }

  function issue(): void {
    if (!issueFor) return;
    problem = '';
    const out = issueDraft(issueFor, subjectName);
    if (!out.claim) {
      problem = out.failures.join('; ');
      return;
    }
    notice = `Issued to ${out.claim.subject}.`;
    issueFor = null;
    subjectName = '';
  }

  function withdraw(id: string): void {
    revoke(id);
    notice = 'Withdrawn. A tombstone is kept so the record stays auditable.';
  }

  function doExport(): void {
    exportError = '';
    const out = buildCredentialExport(currentLedger(), exportName, exportFor ?? undefined);
    if (out.error) {
      exportError = out.error;
      return;
    }
    const blob = new Blob([out.body], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = out.fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function formatDate(ms: number): string {
    return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
</script>

<Seo
  title="Credentials"
  description="Self-issued competency claims from your own assessed practice, with their evidence and reliability disclosures."
  indexable={false}
/>

<RouteShell title="Credentials" back="/profile" backLabel="Profile">
  <Stack gap="space-4">
    <Card padding="space-5">
      <Stack gap="space-2">
        <h2 class="section-title">What these are</h2>
        <p class="body">
          A credential here is a claim you make about your own assessed competency, carrying
          the evidence behind it and how reliable that evidence is. It is self-issued.
        </p>
        <p class="body muted">
          No institution and no external rater reads these. Nothing here is a qualification a
          third party currently honours; it is a portable, evidence-linked record you can
          show, and it is only as good as the disclosure printed on it.
        </p>
        <p class="body muted">
          Your identity profile is never placed in a claim. The name on a claim is one you
          choose for that claim, and it can differ from claim to claim.
        </p>
      </Stack>
    </Card>

    {#if !ledgerLoaded}
      <Card padding="space-5"><p class="empty">Reading your claim ledger…</p></Card>
    {:else}
      {#if notice}
        <Card variant="accent" padding="space-4"><p class="body">{notice}</p></Card>
      {/if}
      {#if problem}
        <Card variant="accent" padding="space-4"><p class="body">Refused: {problem}</p></Card>
      {/if}

      <Card padding="space-5">
        <Stack gap="space-3">
          <h2 class="section-title">Draft a claim</h2>
          <p class="body muted">
            A claim is derived from evidence, then reviewed. Naming it is the act that issues
            it — nothing is issued by drafting alone.
          </p>
          <label class="field">
            <span class="field-label">Domain</span>
            <input class="input" bind:value={domain} placeholder="math.foundations" />
          </label>
          <label class="field">
            <span class="field-label">What it asserts</span>
            <input class="input" bind:value={descriptor} placeholder={DEFAULT_DESCRIPTOR} />
          </label>
          <div><Button variant="primary" onclick={draft}>Draft claim</Button></div>
        </Stack>
      </Card>

      {#if issueFor}
        <Card variant="accent" padding="space-5">
          <Stack gap="space-3">
            <h2 class="section-title">Name it to issue</h2>
            <p class="body">
              Choose the name this claim will carry. It is yours to pick and need not be your
              legal name — an empty name is refused, because issuing is your consent.
            </p>
            <label class="field">
              <span class="field-label">Name on this claim</span>
              <input class="input" bind:value={subjectName} placeholder="A name you choose" />
            </label>
            <div class="actions">
              <Button variant="primary" onclick={issue} disabled={subjectName.trim().length === 0}>Issue it</Button>
              <Button variant="ghost" onclick={() => { issueFor = null; subjectName = ''; }}>Leave it a draft</Button>
            </div>
          </Stack>
        </Card>
      {/if}

      {#if view.issued.length === 0 && view.drafts.length === 0}
        <Card padding="space-5">
          <Stack gap="space-2">
            <h2 class="section-title">Nothing claimed yet</h2>
            <p class="empty">
              No claims have been drafted. That is an absence, not a result — nothing has been
              assessed into a claim and nothing has been withheld from one.
            </p>
          </Stack>
        </Card>
      {:else}
        <Card padding="space-5">
          <Stack gap="space-3">
            <h2 class="section-title">Issued</h2>
            {#if view.issued.length === 0}
              <p class="empty">No issued claims. Anything drafted is waiting on a name.</p>
            {:else}
              <ul class="list" role="list">
                {#each view.issued as row (row.id)}
                  <li class="row">
                    <div class="row-head">
                      <span class="subject">{row.subject}</span>
                      {#if row.revoked}
                        <Badge variant="danger">withdrawn</Badge>
                      {:else}
                        <Badge variant="accent">portable</Badge>
                      {/if}
                    </div>
                    <p class="descriptor">{row.descriptor}</p>
                    <p class="meta">
                      {row.domain} · {row.evidenceCount} evidence ref{row.evidenceCount === 1 ? '' : 's'}
                      · drafted {formatDate(row.issuedAtMs)}
                    </p>
                    {#if row.failures.length > 0}
                      <p class="warn">Would not issue: {row.failures.join('; ')}</p>
                    {/if}
                    {#if !row.revoked}
                      <div class="actions">
                        <Button size="sm" variant="ghost" onclick={() => (exportFor = row.id)}>Export this one</Button>
                        <Button size="sm" variant="ghost" onclick={() => withdraw(row.id)}>Withdraw</Button>
                      </div>
                    {/if}
                  </li>
                {/each}
              </ul>
            {/if}
          </Stack>
        </Card>

        {#if view.drafts.length > 0}
          <Card padding="space-5">
            <Stack gap="space-2">
              <h2 class="section-title">Awaiting your name</h2>
              <p class="body muted">Drafted, not issued. Nothing here is exportable yet.</p>
              <ul class="list" role="list">
                {#each view.drafts as row (row.id)}
                  <li class="row">
                    <p class="descriptor">{row.descriptor}</p>
                    <p class="meta">{row.domain} · drafted {formatDate(row.issuedAtMs)}</p>
                    <div class="actions">
                      <Button size="sm" variant="default" onclick={() => { issueFor = row.id; subjectName = ''; }}>
                        Name and issue
                      </Button>
                    </div>
                  </li>
                {/each}
              </ul>
            </Stack>
          </Card>
        {/if}

        {#if view.revokedIds.length > 0}
          <Card padding="space-5">
            <Stack gap="space-1">
              <h2 class="section-title">Withdrawn</h2>
              <p class="body muted">
                {view.revokedIds.length} withdrawn claim{view.revokedIds.length === 1 ? '' : 's'}.
                They are tombstoned rather than erased, so an export can show what was taken
                back. They are excluded from every export.
              </p>
            </Stack>
          </Card>
        {/if}
      {/if}

      {#if view.issued.length > 0}
        <Card padding="space-5">
          <Stack gap="space-3">
            <h2 class="section-title">Export your portfolio</h2>
            <p class="body">
              A single file carrying every issued, non-withdrawn claim, the evidence behind
              each, and the disclosure of how that evidence was produced.
            </p>
            <label class="field">
              <span class="field-label">Name the portfolio should present</span>
              <input class="input" bind:value={exportName} placeholder="A name you choose" />
            </label>
            {#if exportError}
              <p class="warn">{exportError}</p>
            {/if}
            <div class="actions">
              <Button variant="primary" onclick={doExport} disabled={exportName.trim().length === 0}>
                {exportFor ? 'Export the one claim' : 'Export the portfolio'}
              </Button>
              {#if exportFor}
                <Button variant="ghost" onclick={() => { exportFor = null; exportError = ''; }}>Export everything instead</Button>
              {/if}
            </div>
            <p class="footnote">
              Built on your device. Nothing is sent anywhere to produce it.
            </p>
          </Stack>
        </Card>
      {/if}
    {/if}
  </Stack>
</RouteShell>

<style>
  .section-title {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-sm);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: var(--mysterium-tracking-wider);
    color: var(--mysterium-fg-muted);
    margin: 0;
  }

  .body {
    color: var(--mysterium-fg);
    font-size: var(--mysterium-text-base);
    margin: 0;
  }

  .body.muted,
  .meta,
  .footnote {
    color: var(--mysterium-fg-muted);
    font-size: var(--mysterium-text-sm);
    margin: 0;
  }

  .footnote {
    font-style: italic;
  }

  .empty {
    color: var(--mysterium-fg-muted);
    font-style: italic;
    margin: 0;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-1);
  }

  .field-label {
    color: var(--mysterium-fg-muted);
    font-size: var(--mysterium-text-sm);
  }

  .input {
    background: var(--mysterium-bg);
    color: var(--mysterium-fg);
    border: 1px solid var(--mysterium-border);
    border-radius: var(--mysterium-radius-sm);
    padding: var(--mysterium-space-2);
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-base);
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .row {
    padding: var(--mysterium-space-3) 0;
    border-bottom: 1px solid var(--mysterium-border);
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-1);
  }

  .row:last-child {
    border-bottom: none;
  }

  .row-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--mysterium-space-2);
  }

  .subject {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-base);
    color: var(--mysterium-fg);
  }

  .descriptor {
    color: var(--mysterium-fg);
    font-size: var(--mysterium-text-sm);
    margin: 0;
  }

  .warn {
    color: var(--mysterium-fg-muted);
    font-size: var(--mysterium-text-sm);
    margin: 0;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--mysterium-space-2);
    margin-top: var(--mysterium-space-1);
  }
</style>

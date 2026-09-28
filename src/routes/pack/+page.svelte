<script lang="ts">
  /**
   * /pack route — the measurement instruments, and what they are honestly worth.
   *
   * The pack engine is live and **G45** locks its seam (the registry seeds on the boot path, so a
   * `getPack` read in production is a HIT and not a fallback-masked always-miss). This route reads
   * the same registry through the same `allPacks()` call the CLI's `pack` command uses, replays the
   * stored sessions through the same `ReliabilityCollector` the CLI replays them through, and reads
   * the same `ClaimLedger` the claim drafts are written to. Nothing on this page is computed here.
   *
   * What the page is FOR is the standing statement at the top, and it is not a disclaimer bolted on
   * afterwards — it is the reason the rest of the page is shaped the way it is:
   *
   *   - **A draft is not a certification** (40 §1, 41 §4.3). `draftClaim` produces a claim nobody
   *     has issued; `issueClaim` is the player's own consented act and is where the subject gets
   *     named. Draft / issued / revoked / invalid are four visibly different states here, and a
   *     claim that fails its own evidence rules (E1–E4) is shown as invalid rather than prettied.
   *   - **The responder was a simulation.** Every session on record was scored by the deterministic
   *     hash policy in `delegate.ts`'s `runPackMandate` (`item.difficulty <= responderPolicy`), not by
   *     a person. The CLI prints that in yellow on every run; a page that omitted it would let the
   *     same draft read as a measurement of somebody.
   *   - **No sessions is a ceiling, not a score of zero.** The reliability report on a pack with no
   *     sessions is `provisional`, and the page says how many more the pack's own maturity rule
   *     needs before the disclosure can say anything stronger.
   */

  import { onMount } from 'svelte';
  import Seo from '$lib/components/Seo.svelte';
  import RouteShell from '$lib/components/RouteShell.svelte';
  import Card from '$lib/components/Card.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Stack from '$lib/components/Stack.svelte';
  import {
    PACK_STANDING,
    packViews,
    isMature,
    type PackView,
  } from '$lib/packs/packEvidenceView.js';

  let packs = $state<readonly PackView[]>([]);
  let loaded = $state(false);
  // Computed once at mount: `computeReport` stamps `computedAtMs`, and a report that re-stamped
  // itself on every render would report a different "computed" time than the one inside the claim's
  // evidence ref.
  const nowMs = Date.now();

  onMount(() => {
    packs = packViews(nowMs);
    loaded = true;
  });
</script>

<Seo
  title="Instruments"
  description="The Mysterium measurement instruments — what each one measures, how reliable it is, and what the evidence on record is actually worth."
/>

<RouteShell title="Instruments" back="/">
  <Stack gap="space-4">
    <Card>
      <p class="standing" role="note">{PACK_STANDING}</p>
    </Card>

    {#if !loaded}
      <Card><p class="meta">Reading the registry…</p></Card>
    {:else if packs.length === 0}
      <Card>
        <h3 class="section-title">No instruments registered</h3>
        <Stack gap="space-3">
          <p class="lede">
            The instrument registry is empty. That is not a reading of zero — it means the packs
            have not been seeded on this build, which is a wiring fault rather than a state you
            measured yourself into.
          </p>
          <p class="meta">
            Ordinary play seeds the registry on session start, so reaching this state means the boot
            path did not run.
          </p>
        </Stack>
      </Card>
    {:else}
      {#each packs as pack (pack.id)}
        <Card>
          <h3 class="section-title">{pack.construct}</h3>
          <Stack gap="space-3">
            <div class="head">
              <span class="pack-id">{pack.id}</span>
              <Badge variant={isMature(pack.report) ? 'success' : 'warning'}>
                {isMature(pack.report) ? 'mature' : 'provisional'}
              </Badge>
              {#if pack.responderIsSimulated}
                <Badge variant="warning">simulated responder</Badge>
              {/if}
            </div>

            {#if pack.locale}
              <p class="meta">Locale: {pack.locale}</p>
            {/if}

            <dl class="facts">
              <dt>Forms</dt>
              <dd>{pack.formIds.length > 0 ? pack.formIds.join(', ') : 'none'}</dd>
              <dt>Items in the pool</dt>
              <dd>{pack.itemCount}</dd>
              <dt>Sessions on record</dt>
              <dd>
                {pack.recordedSessions}
                {#if pack.sessionsNeeded > 0}
                  · {pack.sessionsNeeded} more before the report can say anything stronger
                {/if}
              </dd>
              <dt>Test–retest</dt>
              <dd>
                {pack.report.retestR === undefined
                  ? 'not enough paired sessions yet'
                  : `r = ${pack.report.retestR.toFixed(2)} against a ${pack.report.maturityRule.minRetestR} floor`}
              </dd>
              <dt>Parallel-forms effect</dt>
              <dd>
                {pack.report.formEffect.toFixed(2)} against a {pack.report.maturityRule.maxFormEffect} ceiling
              </dd>
              <dt>Provisional ceiling</dt>
              <dd>
                {pack.provisionalUntil ?? 'none declared — the pack claims maturity without a reliability ceiling'}
              </dd>
            </dl>

            {#if pack.claims.length === 0}
              <p class="meta">
                No claim cites this instrument. A claim draft is written when a pack session is run
                through the delegated scorer; none has been on this device.
              </p>
            {:else}
              <div class="claims">
                <p class="claims-head">Claims on record</p>
                {#each pack.claims as claim (claim.id)}
                  <div class="claim">
                    <span class="claim-ref">{claim.ref}</span>
                    {#if claim.standing.kind === 'draft'}
                      <Badge variant="warning">draft — not issued</Badge>
                      <p class="meta">Drafted and waiting. Issuing it is your act, and naming the subject is yours to do.</p>
                    {:else if claim.standing.kind === 'issued'}
                      <Badge variant="success">issued to {claim.standing.subject}</Badge>
                    {:else if claim.standing.kind === 'revoked'}
                      <Badge variant="danger">revoked</Badge>
                    {:else}
                      <Badge variant="danger">invalid — cannot be issued</Badge>
                      {#each claim.standing.reasons as reason (reason)}
                        <p class="meta">{reason}</p>
                      {/each}
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </Stack>
        </Card>
      {/each}
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
  .standing {
    color: var(--mysterium-fg);
    line-height: var(--mysterium-leading-normal);
    border-left: 2px solid var(--mysterium-accent);
    padding-left: var(--mysterium-space-3);
  }
  .lede {
    color: var(--mysterium-fg);
    line-height: var(--mysterium-leading-normal);
  }
  .meta {
    color: var(--mysterium-fg-muted);
    font-size: var(--mysterium-text-sm);
  }
  .head {
    display: flex;
    align-items: center;
    gap: var(--mysterium-space-2);
    flex-wrap: wrap;
  }
  .pack-id {
    font-family: var(--mysterium-font-mono, monospace);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
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
  .claims {
    border-top: 1px solid var(--mysterium-border);
    padding-top: var(--mysterium-space-2);
  }
  .claims-head {
    font-size: var(--mysterium-text-xs);
    text-transform: uppercase;
    letter-spacing: var(--mysterium-tracking-wider);
    color: var(--mysterium-fg-muted);
  }
  .claim {
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-1);
    padding: var(--mysterium-space-2) 0;
  }
  .claim-ref {
    font-family: var(--mysterium-font-mono, monospace);
    font-size: var(--mysterium-text-xs);
  }
</style>

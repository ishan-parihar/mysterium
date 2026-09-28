# Production Deployment Plan

> **Ratified by the owner 2026-09-29.** Supersedes the sequencing in
> [[docs/DEPLOYMENT-READINESS-PLAN|DEPLOYMENT-READINESS-PLAN]] §3, which remains the
> **findings register** (B-1..B-5, G-1..G-12) and is still the authority on *what is blocked*;
> this document is the authority on **what order to do it in**.
> Authority order unchanged: `_org.yaml` → `44` → `foundations/*` → this plan → records.
>
> **The one fact that reframes everything: the game deploys and plays with NO LLM.** The System-1
> model was never on the critical path, and no replacement is needed. See §1.

## 1. Why no LLM blocks nothing

Verified against the tree, in three places:

| Mechanism | Evidence |
|---|---|
| Encounter falls back wholesale | `AgenticOrchestrator.ts:494-497` — `if (this.noLlm) return this.runFallback(line, stage, now)` |
| Narrative falls back per-element | `AgenticOrchestrator.ts:1211-1222` — an LLM error, timeout or `{"error":…}` shape falls to the same static corpus, Veil-seamed |
| The corpus is real, not a stub | `FallbackProvider.ts:11-13` — **line-specific** across all 8 lines, stage-banded, drawn from the 512 concept-drafts |

So a deploy with no API key plays. The degradation is a pre-authored, per-line, per-stage corpus
instead of a generated one — a **content-quality** difference, not an availability one.

**The one line that decides it.** `gameEngine.ts:321` reads `noLlm: options.noLlm ?? false`, and
the browser's only call site — `LLMDialogueRunner.svelte:121` — passes no options at all. A
keyless production deploy therefore aims every encounter at `/api/llm/chat`, which has no key.

This is safe but wasteful: `ProxiedLLMClient.ts:135` throws, and the orchestrator catches it per
element, so the game still works — after a failed round-trip per narrative element. **D-1 sets
`noLlm` from a build-time flag** so a keyless deploy skips the dead requests entirely rather than
failing into them.

## 2. The deploy sequence — 5 steps, 2 of them yours

| # | Step | Who | Gate |
|---|---|---|---|
| **D-1** | `noLlm` becomes a build-time flag, not a hardcoded `false` | **me** | new gate: the flag reaches `runEncounter` |
| **D-2** | `wrangler kv namespace create SAVE_KV` + `RECOVERY_KV`; paste 4 IDs into `wrangler.toml` | **you** | `deploy.yml:36` binding gate |
| **D-3** | Decide the identity model (§3) | **you** | — |
| **D-4** | First deploy + tag `v0.1.0` | **me** | `verify:release` |
| **D-5** | Verify in the live browser: boot → play an encounter → save → reload | **me + you** | manual |

**D-2 is the only thing standing between this repo and a live URL.** Everything else on the
critical path is code.

## 3. The identity decision (D-3) — the one real security finding

**The codebase contradicts itself in a privacy-critical path, and the code says so itself:**

- `src/routes/api/save/+server.ts:7` — *"The server NEVER sees plaintext Significator or WorldState."*
- `src/lib/stores/cloudSyncStore.ts:4-11` — *"the key is derived from the deviceId which the server
  holds. **This is NOT full E2E** … the key should be derived from the player's recovery mnemonic
  (which the server never sees in plaintext). That's a future enhancement."*

Both cannot be true, and `:94` POSTs `deviceId` in plaintext with no auth header. **The server can
decrypt every save today.** The route's docstring is the false one.

**What is affected:** anyone who can reach the KV namespace can read and decrypt any player's save
by guessing a 128-bit UUID, which is impractical, so this is a **claim-integrity defect, not a
live breach**. It matters because the docstring is the compliance artifact a reviewer reads.

**D-3 is a decision, not a ticket, because the shape changes recovery:**

| Option | Key derives from | Shared device | Recovery | Cost |
|---|---|---|---|---|
| **A. Mnemonic-derived** (the file's own suggestion) | the 12-word recovery phrase | separate saves per profile | phrase *is* the key — clean | re-encrypt on migrate |
| **B. Server-held key** | a key the server stores beside the blob | still one save | unchanged | server can decrypt — **not E2E at all** |
| **C. Account-based** | a real identity (passkey/email) | first-class | account recovery | largest build |

**Recommendation: A.** It is the only option that makes `+server.ts:7` true, it costs one key
derivation change, and it is what the code already intends. It also adds a checksum to the mnemonic
(a mistyped word currently restores nothing, silently).

## 4. Everything else, ranked

**Buildable now, after D-1:**

| Item | What |
|---|---|
| Ladder L0/L3/L6/L7 + descent stepper | canon-complete; L4/L5 are `closed` class and correctly unreachable in the self register. All 8 payloads exist — pure render work |
| `agentBusy` delete-or-wire | structurally dead: a Svelte 5 instance-script export, unreachable by any consumer |
| SSR in one decision | `/knowledge`, `/curriculum`, `/curriculum/progress` are the only 3 of 19 routes that still SSR |
| P2 — 9 routes | `export` → `insights` → `events` → `pack` → `delegate` → `pod` → `credential`; plus `privacy` (no export-your-own-data) and `calibrate` |
| **BFF rate limiting** | `hooks.server.ts:63` rate-limits **only** `/api/llm/*`. The other 7 endpoints are unmetered, and `/api/save` accepts 256KB writes keyed on a client-supplied id |

**Owner-blocked, non-blocking:** pod hosting (M1), density-hardening ruling, real raters /
institutions / DPIA, GitLab SSH (C6).

**Measurement, not code:** calibration figures are a **range** (22.3–23.0% unfamiliar-pole against
a 0.25 floor — below-floor in every run, at 745 encounters). Entropy is `insufficient-data`. The
polarity loop is inert (842 readings, 0 reconciled). All `provisional-simulated-cohort`: it may
reject, never certify. **None of this blocks a deploy** — it bounds what we may *claim*.

## 5. Definition of done for "production grade"

1. A player can reach the URL, complete an encounter, and reload with progress intact.
2. A player with no API key plays a complete session.
3. The save is unreadable by anyone without the player's key.
4. Every BFF endpoint is rate-limited and validates its input.
5. Every doc claim about the built system matches the tree (`arch.py validate` + a sweep for
   narrative claims, which no gate checks).

## 6. The rest of the canon, when the deploy is live

Front-end canon completion (the ladder, the P2 routes, the two P3 items) is tracked in
[[docs/system/sub-systems/presentation/web-surface-architecture|web-surface-architecture]] §7; the
calibration posture is in §4 above. Neither blocks a deploy, and both are named here so this plan
does not become a second place where that work is described.

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
element, so the game still works — after a failed round-trip per narrative element. **D-1 (BUILT
`a55129d`, gated by **G52**) resolves `noLlm` by DETECTING, not by a flag that can be forgotten**:
with `VITE_LLM_REQUIRED` unset — the default — the build uses the corpus whenever no
client-visible key exists, and `=1` / `=0` are the explicit overrides. A keyless deploy therefore
needs no configuration at all, and a build that later gains a key works unchanged.

## 2. The deploy sequence — 5 steps, 2 of them yours

| # | Step | Who | Gate |
|---|---|---|---|
| **D-1** | ~~`noLlm` becomes a build-time flag~~ **BUILT `a55129d`** — `src/lib/config/noLlm.ts`, gated by **G52** | **done** |
| **D-2** | `wrangler kv namespace create SAVE_KV` + `RECOVERY_KV`; paste 4 IDs into `wrangler.toml` | **you** | `deploy.yml:36` binding gate |
| **D-3** | Decide the identity model (§3) | **you** | — |
| **D-4** | First deploy + tag `v0.1.0` | **me** | `verify:release` |
| **D-5** | Verify in the live browser: boot → play an encounter → save → reload | **me + you** | manual |

**D-2 is the only thing standing between this repo and a live URL.** Everything else on the
critical path is code, and the one code item on it is done.

### How to configure it

`VITE_LLM_REQUIRED` is unset by default, which means **detect**: the build uses the authored
corpus when no client-visible key exists. So a keyless deploy works with no configuration at all.

| `VITE_LLM_REQUIRED` | Behaviour | Use when |
|---|---|---|
| unset | corpus when no key; model when a key is present | the default, and the right one |
| `1` | always attempt the model path | the key is injected at runtime, not at build |
| `0` | never attempt the model path | you deliberately want deterministic content |

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

**Buildable now — status as committed:**

| Item | Status |
|---|---|
| Ladder L0/L3/L6/L7 + descent stepper | ✅ **BUILT `4129cac`** — all six self-register levels render behind a selector; L4/L5 stay closed-class and unreachable in the self register. The stepper is genuinely descent-only and bounded by each surface's own consent ceiling |
| `agentBusy` | ✅ **DELETED `4129cac`** — an instance-script export in a Svelte 5 component, so structurally unreachable; every blocking surface already has a more precise local spinner |
| SSR in one decision | ✅ **BUILT `4129cac`** — all 19 routes declare their choice; **G54** imports each `+page.ts` and fails on a comment-only or computed value |
| **BFF rate limiting** | ✅ **DONE (SEC), `4129cac`.** All 8 `/api/*` endpoints are metered through one shared limiter (`src/lib/server/rateLimit.ts`) with per-IP tiers; the old `/api/llm/*`-only guard is gone. G53 refuses to pass on any route the limiter does not actually refuse |
| P2 — 9 routes | **BUILT** — `insights`, `export`, `events`, `credential`, `delegate`, `pod`, `pack` (`a537181`), then `privacy` and `calibrate` (`/privacy` carries both the inventory and the delete path; `/calibrate` is the browser equivalent of the CLI's quick calibration). All nine are linked from the home route. |

**Owner-blocked, non-blocking:** pod hosting (M1), density-hardening ruling, real raters /
institutions / DPIA, GitLab SSH (C6).

**Owner-blocked, and now public — D-3, the save-key decision.** `api/save/+server.ts:7` claims the
server never sees plaintext; `cloudSyncStore.ts:4-11` says the key derives from the deviceId the
server holds and calls it "NOT full E2E". Both describe the same code. The options are
mnemonic-derived (**recommended** — it is that file's own suggestion and it makes the first
docstring true), a server-held key (honest, but not E2E), or real identity. This is one decision,
not three tickets, because it changes the recovery design. **`/privacy` now states the current
design out loud** (`/privacy` → "What leaves this device" → your cloud save), so a player can read
it today — which is correct, but it means the decision should be scheduled rather than left to be
discovered from a public page. It does not block a deploy; it is the one item a public deploy
exposes before it is settled.

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

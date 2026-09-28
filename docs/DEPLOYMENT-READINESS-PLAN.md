# Deployment Readiness Plan

> **Rung:** plans. **Authority for sequencing:** this document orders the work; it invents no
> contract. Where it states a fact about the tree, that fact is verified against the code and
> dated in §1. Where it states a decision, the decision belongs to the owner and is marked.
>
> **Status (2026-09-28): OPEN — B-1 BUILT, the rest awaits the owner.** B-1 (the critical
> data-loss-with-a-success-message defect) is **fixed and verified end to end in the real
> worker**: the dev-fallback guard, the client-visible failure state, and the build-time gate. Every other item is owner-reserved (a Cloudflare account, a secret, a
> credential) or a deploy step. Nothing here is "build a new thing" — every item is a gap between
> an already-ratified design and an already-shipped surface.

---

## 0. The one-paragraph version

Mysterium is **feature-complete and instrumented** (roster 51, 1765 tests, 23/23 doc gates) but
it has **never been deployed** — there is no git tag, no npm publication, and no Cloudflare
namespace. The risk is not missing features; it is that a deploy would *appear* to succeed while
silently doing the wrong thing. Three surfaces are built to degrade quietly by design — the
in-memory save fallback, the `cloudSyncStore` silent no-op, and the `PodTransport` local double —
and quiet degradation is exactly the right behaviour in development and exactly the wrong
behaviour in production. **The work is therefore: make the difference between "not configured"
and "working" loud, then configure it.** Every item below exists because a real deploy step can
currently return success while the thing it claims to have done never happened.

---

## 1. Verified state of the tree (2026-09-28)

Facts, not assumptions. Each was read from the code in this commit.

| Surface | State | Evidence |
|---|---|---|
| Battery | 154 files / 1723 tests green; `arch.py validate` 23/23 + fixtures 23/23; lint 0/0 | CI + local |
| Gate roster | 51 (`G51` added 2026-09-28 with the auditor surfaces, mutation-proven) | `src/core/validation/gates/roster.ts` |
| Release smoke | green — built CLI reports 0.1.0, both session modes complete, checkpoints persist | `npm run verify:release` |
| Deploy targets | dual: `BUILD_TARGET=cloudflare` (default, adapter-cloudflare, SSR + BFF) and `BUILD_TARGET=static` (adapter-static, SPA, **no server endpoints**) | `svelte.config.js` |
| BFF endpoints | 8 live `+server.ts` routes under `src/routes/api/` | `find src/routes/api` |
| Client BFF consumers | 9 modules fetch `/api/*` (`ProxiedLLMClient`, `AgentRunner`, `cloudSyncStore`, `telemetryStore`, 3 pages, 2 hooks) | grep |
| Secrets/env | `LLM_API_KEY` (secret, set via `wrangler secret put`), `SAVE_KV` + `RECOVERY_KV` (ids **still the literal `REPLACE_WITH_*` placeholders**), `ANALYTICS` dataset | `wrangler.toml` |
| Git history | **no git tag exists** — `deploy.yml` triggers only on `v*` tags, so it has never fired | `git tag` → empty |
| npm | `mysterium` is **not published** (`npm view` → 404); `prepublishOnly` is wired but has never run against a release | `npm view mysterium` |
| GitLab remote | credential-blocked, `Permission denied (publickey)` exit 128 — origin (GitHub) is the only reachable remote | C6, `AGENTS.md` §4.2 |
| CI | `ci.yml` runs on every push to `main`; governance + build jobs both green | `.github/workflows/ci.yml` |

---


## 1b. Measurement honesty — calibration figures must be reported as a RANGE (verified 2026-09-28)

**`scripts/cohort-calibrate.ts` is deterministic in substance but not bit-reproducible, and its
output varies run to run at identical arguments.** Three invocations of `--seed 1 --generated 50`
gave **22.4% / 22.4% / 22.3%** unfamiliar-pole share; an unflagged run gave 23.0% — a spread of
~0.7pp at n=745 encounters.

**What is actually deterministic, verified rather than assumed:**

- **Persona generation is bit-identical.** `cohort.ts:89` seeds `mulberry32(seed +
  hashSeed(...))`; two `generateCohort({count:50, seed:1})` calls produced byte-identical arrays.
- **The encounter sequence is identical.** Diffing two `runCampaign` runs field by field: all 30
  differing lines were timestamps (`createdAt`, `lastEncounterAt`, per-cell theta) and nothing
  else — no cell, altitude or session record changed.
- **Staleness is NOT the mechanism.** A full-scale `--json` diff of two 745-encounter runs found
  **zero staleness differences** and every run reports `staleness=0.000` on all eight lines, so the
  `(now - ts)` urgency path in `DevelopmentalNeedsDetector.ts:30` is not what moves the number.
  `observables.ts:11-19` already documents the general hazard and the mitigation: the harness
  anchors a virtual clock at a fixed epoch and normalizes staleness relative to the newest cell,
  so gates assert on relative ordering, never absolute time.

**What does vary is small-scale content drift**: the same diff shows `readings` 842 vs 841 and
`distinctPairs` 6 vs 7 — a small number of encounters differ in which polarity pair they produce,
which moves a percentage computed over 745. The exact upstream source was not isolated; the
honest statement is that the pass is not bit-reproducible and the residual is a small content
drift, not a seeded-RNG failure and not a staleness effect.

**Why this belongs in a deployment-readiness plan.** §46/§5.2's 0.25 unfamiliar-pole floor is
evaluated against a number that moves by up to 0.7pp. Every figure this pass produces is therefore
a **distribution, not a point** — consistent with `provisional-simulated-cohort` (it may reject,
never certify), but NOT compatible with quoting a single figure to one decimal as a finding. The
decision-relevant fact, which holds across the whole observed range, is the **verdict**:

> unfamiliar-pole share **22.3–23.0% against a 0.25 floor — below-floor (REJECTED) in every run
> observed**, at 50 campaigns / 173 sessions / 745 encounters.

**The fix, if the range is ever wanted to be zero:** inject a fixed `now` into the campaign (the
ladder bridge already accepts `{now}`) and make the per-encounter clock a passed-in value rather
than a wall read. Not urgent: the verdict is stable, and a narrower number would not change it.

## 2. Blocking findings — these must be fixed before any public deploy

### B-1 — A misconfigured KV deploy reports success and loses every save. **CRITICAL.**

`src/routes/api/save/+server.ts` reads `platform.env.SAVE_KV`; if that binding is **absent or
still the `REPLACE_WITH_SAVE_KV_ID` placeholder**, the route falls through to a
process-local `Map` (line 28) and **still returns `200 {accepted: true}`** (line 109). The
client (`cloudSyncStore.ts`) treats a network error as a silent no-op. Net effect of deploying
with the placeholder ids that ship in `wrangler.toml`: every player believes their progress is
saved; nothing is; the first server restart loses everything, and no error is ever surfaced.

This is exactly the "quiet by design" class the project has been auditing for. In dev the
fallback is correct. In production it is a data-loss bug wearing a success message.

**STATUS: BUILT 2026-09-28.** `src/lib/server/requireBoundStorage.ts` — one rule, four call
sites: `requireBoundStorage(bound, binding, devOnly, env?)` throws a 503 with an operator-facing
body when a binding is absent outside a dev/test process. Wired into `/api/save` (GET + POST),
`/api/recovery/generate` and `/api/recovery/restore`. The fallback is **not deleted** — it remains
the dev experience and the `BUILD_TARGET=static` path — it is simply unreachable in a built
artifact, which is the minimal honest version: dev keeps working, production cannot lie.

`devFallbackAllowed(env)` is a pure function of `{dev, mode}` rather than reading `import.meta`
inline, so the production branch is assertable under vitest (whose `$app/environment` stub sets
`dev = false` — i.e. a helper that read `dev` directly would have been permanently untestable and
therefore permanently unverified). An unknown `mode` fails **closed** (treated as production).
Covered by `tests/server/requireBoundStorage.test.ts` (4 tests) which assert the *failure* — a
test that only proved the fallback still works would pass against the data-loss build — and
which assert the 503's `body.message`, the exact text a client receives. The client already
treats a non-OK response as a failure (`cloudSyncStore` returns `false`), so 503 is the correct
signal all the way through.

And the **player-visible half** (`src/lib/components/CloudSyncIndicator.svelte`, mounted in the
root layout so the signal is on every route): a failed sync says what is true — "saved on this
device, not yet on the server", with the attempt count and the server's own message — and never
claims a save succeeded when it did not. `cloudSyncState` is locked by an importer-count test,
because a store with no reader is the same silent-success class one layer up.

**VERIFIED END TO END IN THE REAL ARTIFACT**, which the unit test could not do — and the trap is
worth recording, because anyone verifying B-1 locally will hit it: `wrangler pages dev`
**auto-creates local KV bindings** from wrangler.toml's declared blocks, so it answers
`200 {accepted:true}` with the guard never running. B-1 is a deploy-time property, so no local
run can prove it. With the KV and analytics blocks removed from wrangler.toml, the real worker
returns:

```
POST /api/save              -> 503 {"message":"storage not configured: SAVE_KV is unbound, so
                                     this route cannot serve the save path. Refusing rather
                                     than falling back to an in-memory store that a restart
                                     would erase."}
POST /api/recovery/generate  -> 503 {"message":"storage not configured: RECOVERY_KV is unbound, ..."}
```

A **build-time gate** in `check-invariants.ts`: it reads `wrangler.toml`, finds any
`REPLACE_WITH_*` namespace id, and **fails with the remediation commands** under
`--require-bindings` (report-only by default, because the committed file is *meant* to hold
placeholders and CI builds on every push). `deploy.yml` passes that flag in a `bindings` job that
**gates the build**, so a deploy that cannot persist fails before an artifact exists rather than
after a player's first save. A note no step reads would be the same silent-success class one
layer up — the check's whole purpose is to be invoked by the thing it protects.

### B-2 — Two KV namespaces and one analytics dataset do not exist.

`wrangler.toml` ships placeholders, and creating them requires a Cloudflare account. This is
**owner-reserved** (namespace/dataset ids are a user decision), but nothing can be verified
until it is done. The commands are in the file's own header.

### B-3 — The GitHub Pages path was a degraded build wearing the product's name. **BUILT 2026-09-28.**

The single `deploy.yml` built with `BUILD_TARGET=static`, which per `svelte.config.js` means **no
SSR and no `/api/*` endpoints** — the client falls back to local-only persistence and a direct
LLM call. That is a legitimate Capacitor/offline mode, but it was named "Deploy to GitHub Pages",
fired on every `v*` tag, and would have published a URL that cannot save a player's progress
server-side while looking exactly like "Mysterium is live". The workflows were split, then the
static half was removed outright:

- `deploy.yml` → **Cloudflare Pages**, `BUILD_TARGET=cloudflare` (`:57`), the only production
  deploy, and it runs the binding gate (`scripts/check-invariants.ts --require-bindings`, `:36`)
  before it builds.
- `deploy-static.yml` → created in `28d251b`, retitled "Static build (offline demo / Capacitor
  artifact)" and moved to `v*-static` tags and manual dispatch — then **deleted entirely** in
  `75fb471` ("Remove the GitHub Pages deploy; keep Cloudflare Pages as the only production
  path"). The offline artifact is now built deliberately and locally, never published. Nothing in
  CI builds `BUILD_TARGET=static` under the product's name, so the confusion cannot recur.

**Verified 2026-09-28, including a correction to that same day.** An earlier pass at this file
marked B-3 "HALF BUILT" because `deploy-static.yml` was absent from the tree. That was wrong: the
file was created in `28d251b` and deliberately deleted in `75fb471`, so its absence is the
intended end state rather than a half-finished repair. A missing file proves only that nothing
currently creates it — `git log --all -- <path>` is the check that distinguishes deletion-by-
design from never-built, and that pass had not run it. The check is recorded here because it is
the one that would have caught it.

### B-4 — No release has ever been cut: no tag, no npm publication.

`prepublishOnly` runs `verify:release`, so the machinery is correct and simply has never been
invoked. The first release is a deliberate act: tag `v0.1.0`, confirm the tag build, publish.

### B-5 — Secrets are unverified. `LLM_API_KEY` may be absent at runtime.

If the secret is missing, the LLM paths fail per-request. Whether that fails *loudly* (a clear
500 the player sees) or *quietly* (an empty encounter) is the same question as B-1 and should be
audited in the same pass.

---

## 3. Gating items — required for a responsible deploy, not for boot

| # | Item | Why it gates | Owner? |
|---|---|---|---|
| G-1 | ~~**Fail-loud guard for missing bindings** (B-1)~~ **BUILT 2026-09-28** | data loss with a success message | **done** |
| G-2 | **Create the KV namespaces + analytics dataset** (B-2) | nothing persists without them | **yes** — account + ids |
| G-3 | **Set + verify `LLM_API_KEY`** (B-5) | no LLM without it | **yes** — the key |
| G-4 | **First real deploy to Cloudflare Pages** | proves B-1's guard, the bindings, and the BFF together | no |
| G-5 | ~~**Relabel/remove the GitHub Pages workflow** (B-3)~~ **BUILT 2026-09-28** | prevents a false "live" claim | **done** |
| G-6 | **Rate limiting on the BFF** | 8 unauthenticated endpoints; `/api/save` accepts 256KB writes keyed on a client-supplied `deviceId` | no — but confirm scope |
| G-7 | **A first-run smoke test against the live URL** | the only proof that boot → session → save → restore works in production | no |
| G-8 | **Error monitoring** | silent no-ops are the project's known failure mode; a deploy with no visibility cannot detect its own regressions | no |
| G-9 | **npm publish decision** | `mysterium` is a declared `bin`; publishing makes the CLI installable | **yes** |
| G-10 | **GitLab push credentials** (C6) | the two remotes must stay in sync per the protocol | **yes** — SSH key |
| G-11 | **Density-hardening ruling** (carried from Phase 17) | report-only vs battery-failing | **yes** |
| G-12 | **Pod hosting decision** (carried, 38 M1) | `PodTransport` runs on the local double only; pods do not sync | **yes** |

---

## 4. What is explicitly NOT deployment work

Named so the next reader does not re-open it:

- **Real raters / RV1–RV7 thresholds.** A deploy does not make synthetic evidence real. The
  numbers stay `provisional-simulated-cohort` until humans produce them. Deploy first, ratify
  later — but do not describe the deployed build as clinically calibrated.
- **Institutions / DPIA.** Required before any *third-party* use with real players' data, not
  before a private or self-hosted deploy.
- **Phase 16 d7's open calibration items** (expansion ratio 21% vs a 25% floor, entropy
  `insufficient-data`). These are *measurements to collect*, and a deployment is precisely the
  instrument that collects them. They are not blockers; they are beneficiaries.

---

## 5. Standing external list (owner-reserved, carried forward)

1. Cloudflare account + KV namespace/dataset ids.
2. `LLM_API_KEY` (and any provider-specific key).
3. Pod hosting target (M1).
4. Real raters.
5. Partner institutions + the DPIA.
6. GitLab SSH credentials (C6).
7. npm publish decision.
8. The density-hardening ruling.

---

## 6. Definition of done for "deployment ready"

Deployment-ready is a *verifiable* state, and every clause is a check that can fail:

- [ ] `npm run verify:release` green on the release commit.
- [ ] A live URL, reached over the network, completes boot → session → **save → restore** with
      the restore verified to have read from the *bound* namespace (not the in-memory fallback) —
      the B-1 guard makes the fallback impossible to reach in production, so reaching it *is* the
      failure signal.
- [ ] The BFF responds 4xx/5xx (not silent) on a deliberately malformed request.
- [ ] `git tag` shows the released version; both remotes carry the same commit.
- [ ] Every §5 item is either done or explicitly deferred *in writing*, by the owner.

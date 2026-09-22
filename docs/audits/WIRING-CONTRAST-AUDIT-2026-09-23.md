# Live-Surface Wiring Contrast Audit — 2026-09-23

**Scope:** every personalization / memory / world surface ratified in `45`, `46`, `47`, `48` and
`43 §5.5` — contrasted against what the live loop actually executes today.

**Method:** static consumer trace (every module's non-test, non-gate callers resolved by grep over
`src/` + `scripts/`), crosswalk of each ratified claim against its code reality, and a live-path
read of `sessionRuntime.buildEnvelope` → `AgenticOrchestrator` → `ContextPipeline`. This audit
*reads* the tree; it does not re-run the battery (the memory audit `MEMORY-AUDIT-2026-09-22` did,
and its §6 records the run conditions).

**Predecessor:** `docs/audits/MEMORY-AUDIT-2026-09-22.md` (memory tier F0–F9). This audit asks the
next question: *which other architected surfaces are in-vitro only?*

---

## 1. Verdict

**The documentation is ahead of the wiring — and the loop runs correctly anyway.**

Nothing found here is a crash, a leak, or a lie in the code: every dark surface is a module that
compiles, passes its gate, and is simply never reached at runtime. The player-facing consequence is
that personalization is **shallower than documented**: the live UDV carries **3 of its 8 declared
bands**, and the council-role scoping that would turn those bands into per-sub-agent alignment
never executes.

Two independent construction paths also coexist for the envelope and for the libraries; the live
path is the newer one, and the older one holds capabilities (role scoping, library views) the live
path lacks. The plan in §5 consolidates rather than rebuilds.

---

## 2. Documentation coverage — what exists, and where

Answering the direct question: **yes, the memory architecture is fully documented**, and the
broader personalization surface is documented at the same standard.

| Area | Owning doc | Status | Notes |
|---|---|---|---|
| **Memory / standing page / retrieval seam / recall firewall** | `48-memory-architecture.md` + `MY-AD-0032`, `MY-RG-0031`, `MY-RG-0032` | ✅ ratified | Its §2 surface inventory is the completeness law; §3 M1–M5, §4 seam, §5 R1–R4 |
| Live-surface wiring of 48 | — | ⚠️ **missing** | 48 §4 claims LocalRetriever "serves library ranking enrichment"; the code path does not exist yet (§4 W3) |
| Personalization / context pooling | `45-personalization-and-context-pooling.md` | ✅ ratified | UDV §3, pooling §5, role scoping §6.1, degradation §5, engagement ethics §7.3 |
| Council role scoping (sub-agent alignment) | `45 §6.1` (table as code: `ROLE_SCOPES`) | ✅ documented, ⚠️ dark in runtime (§4 W1) |
| World / NPC / scenario composition | `46-generative-world-composition.md` + `MY-AD-0031` | ✅ ratified | Facets §2, triad §6, composition §7, invariants §11 |
| Preference inference / probes | `47-preference-inference-and-scaffolding.md` | ✅ ratified | Evidence tiers §3, interest record §5, probes §7, checks §9 |
| Orchestration / feed / delegation | `43-agentic-orchestration-architecture.md` + `43 §5.5` | ✅ ratified | Four writers / three readers; contract live |
| Live session runtime (the actual seam) | — | ⚠️ **undocumented as a surface** | `sessionRuntime.ts` is now the canonical envelope builder; no doc names it (§4 W2) |

**Documentation defect (one):** `48 §4` states the retriever's service list in the present tense
before that path exists, and `45 §7.3` says `isMechanismAllowed` is "the check other organs call"
while no organ calls it. Both are corrected by the §5 d8 deliverable (status-mark the seam-only
items in place — the doc⇄code feedback loop AGENTS.md §3.2 requires).

---

## 3. The live-surface contrast

| # | Surface | Ratified claim | Code reality today | Status |
|---|---|---|---|---|
| 1 | `memoryPage` (48 §3) | rebuilt at session end, read at boot as the continuity head | `buildEnvelope` computes it; `ContextPipeline` renders `[CROSS-SESSION MEMORY]` | ✅ **LIVE** |
| 2 | `LocalRetriever` (48 §4) | serves library ranking, thread recall, time-slices | callers: G31 gate + firewall's internal `rrfFuse` only | ⛔ **DARK** (W3) |
| 3 | `retrievalFirewall` (48 §5) | guards the recall path | only G31's fixture traffic; no production recall exists to guard | ⚠️ **ARMED, NO TRAFFIC** (W3) |
| 4 | Embedding tier (48 §4) | optional pinned local model | pin + `createEmbeddingProvider` + `fuseRanks` seam only; no embedding runtime installed | ⚠️ **SEAM ONLY** (declared) |
| 5 | `envelopeRuntime.buildLiveEnvelope` (45 §5/§6) | — the "missing wiring" between the personalization stack and the orchestrator | one test consumer; `usableFields`/`declaredInterests` hardcoded **empty**, `purpose: []` | ⛔ **DARK + STUBBED** (W2) |
| 6 | `scopeForRole` / `ROLE_SCOPES` (45 §6.1 council alignment) | five roles each receive a declared band subset | only the dark module calls it; **never at the live seam** | ⛔ **DARK** (W1) |
| 7 | UDV bands (45 §3) | 8 dimensions: preference, interests, purpose, analogy, aversions, constraints, developmental, observed | live seam populates **3** (developmental, declared interests, aversions) | ⛔ **PARTIAL 3/8** (W4) |
| 8 | `udv.preference` band | modality mix, difficulty appetite, session tolerance, aesthetic leanings | `modalityMix`/`difficultyAppetite`/`sessionToleranceMin`/`aestheticLeanings` have **zero consumers anywhere** | ⛔ **INERT** (W4) |
| 9 | purpose band (45 §3, 39) | helps the pool route to the player's aims | `pooling.ts:67` reads it; live seam passes `purpose: []` | ⛔ **INERT** (W4) |
| 10 | analogy band (45 §5.4 analogical resonance) | interests carried into fluent domains | `pooling.ts:69` reads `analogy.fluentDomains`; no producer passes it | ⛔ **INERT** (W5) |
| 11 | `observedInterests` (47 §3 evidence ledger) | evidence-derived interests ride as ranking weight | `projectUdv` supports + precedence-guards it; no caller supplies it | ⛔ **INERT** (W5, = memory-audit R1) |
| 12 | `compose()` + `buildLibraryViews` (46 §6.1/§7) | one store, three views; entities composed from facets | `compose()` callers: G22 only; `buildLibraryViews`: one test | ⚠️ **AUTHORING-DARK** (W6) |
| 13 | `compositionTelemetry` + `diversityMonitor` (46 §11) | records composition events at the seam; flags visibility collapse | callers: `scripts/calibrate-personalization.ts` only — the runtime seam records nothing | ⛔ **DEV-SCRIPT ONLY** (W7) |
| 14 | `probeSet` / `probeContent` (47 §7) | probes are playable, log-only until RV-validated | no production offer/record path; `probeValidation.ts` has **zero references anywhere** | ⛔ **UNREACHABLE + DEAD MODULE** (W8) |
| 15 | `engagementRegister` (45 §7.3 / MY-RG-0017) | `isMechanismAllowed` is "the check other organs call" | called only by `tests/personalization/PlanImplement.test.ts` | ⚠️ **TEST-ONLY** (W9) |
| 16 | `interestRecord` (47 §5) | six-axis priors feed probe/mode choice | read by `dialecticEngine` only; no producer at the seam | ⚠️ **PARTIAL** (folded into W4/W5) |
| 17 | Feed readers (43 §5.5, 27/25) | planning bias + committed-only CCI | `GameLoop.composeBiases` + CLI — live | ✅ **LIVE** |
| 18 | Feed writers / checkpoint restore (43 §5.5, 22 §7.5) | four writers; state survives restart | `sessionRuntime` + CLI loop; G28 round-trip | ✅ **LIVE** |
| 19 | Preference intake (16 §2.1, 47 §8) | declared interests/aversions, consent-gated, withdrawable | `IdentityProfile` + CLI + privacy dashboard; G29 | ✅ **LIVE** |
| 20 | Authored triad (46 §2) | 64 world / NPC / scenario seeds + variants | `candidateLibrary` (2240) + `sessionRuntime.contextualSeed`/`worldPlace`/persona voice | ✅ **LIVE** |
| 21 | Polarities (46 §5.3) | pair states advance, persist | `sessionRuntime` session-end advance under saturation guard | ✅ **LIVE** |
| 22 | Delegation + toolset firewall (43, G14/G15) | spec → log → ratify → commit | `delegate.ts`, `orchestratorTools`, `choicePolicy` — live | ✅ **LIVE** |

---

## 4. Findings

**W1 — Council role scoping never executes (High).** `45 §6.1` is implemented as data
(`ROLE_SCOPES`) + function (`scopeForRole`), but its only caller is `envelopeRuntime`, which is
itself dark. Consequence: the five council roles (scenario-catalyst, narrative-voice, assessment,
curriculum-teacher, safety) never receive their declared per-role projections in production, so the
"sub-agent alignment" contract is unenforced where sub-agents actually run. The enforcement itself
is sound (absent = absent, not nulled) — it is simply unreached.

**W2 — Two envelope builders; the live one is newer, the dark one holds the missing capability
(High).** `sessionRuntime.buildEnvelope` is live and consent-correct. `envelopeRuntime` is
stubbed (`usableFields` empty, `purpose: []`) yet owns `forCatalyst` scoping and the
`ScenarioContext`/`DeferredRecord`/pole surface. Neither is a superset; both are maintained.
This is the redundancy class the uniqueness principle forbids (AGENTS.md §3.2).

**W3 — The retriever and its firewall guard nothing in production (High).** `LocalRetriever` and
`retrievalFirewall` are validated only by G31's injected fixtures. Because no production code calls
the retriever, the firewall has no real traffic — its guarantees are real but untested against the
seam it was written for. `48 §4`'s present-tense service list overstates current reality.

**W4 — The UDV is 3/8 populated at the live seam (High).** `sessionRuntime` passes
`usableFields`, `declaredInterests`, `developmental`, `aversions` — and hardcodes `purpose: []`,
supplying no `preference`, `analogy`, `constraints`, or `observedInterests`. Of these,
`preference` is worse than unpopulated: its four fields have **no consumer anywhere in the
codebase**, so even a supplied band would be dropped. Pooling already reads `interests`, `purpose`,
`analogy`, `aversions` (`pooling.ts:65–76`) — two of its four ranking inputs are therefore always
empty.

**W5 — The analogical-resonance mechanism has a consumer but no producer (Medium-High).** The
player's declared interests are the raw material for fluent-domain reasoning (45 §5.4) and the
`carried by analogy` tier of the catalyst loop. `pooling.ts` consumes `analogy.fluentDomains`;
nothing produces a band. Note the coupling with W9: `analogical-resonance` is a registered
engagement mechanism whose only lawful activation is via a supplied analogy band.

**W6 — The composition engine is authoring-dark (Medium).** `compose()` (46 §7) and
`buildLibraryViews` (46 §6.1's one-store-three-views) are exercised by gates and a single test;
the runtime reads the precompiled `facets.json` through `composeWorldTexture` and builds its
libraries from `candidateLibrary`. Either the composition engine is the authoring-time compiler (in
which case it should be *called by* the compiler and a gate should assert the store is its output),
or the runtime should compose entities through it. Today neither is stated, so the engine cannot
tell whether it is load-bearing.

**W7 — 46 §11's diversity monitor never sees runtime composition (Medium).** The monitor's power
depends on events recorded at the composition seam; only the calibration script records them. A
visibility collapse (the same facets composing everywhere) would therefore be invisible in
production and visible only when someone runs the dev script.

**W8 — Probes are unreachable, and the RV harness is a dead module (Medium).** `47 §7`'s probes
are "playable"; there is no offer/decline/record path in a session, so readings never accumulate —
which means the real-rater thresholds that would retire them from log-only can never be gathered
from play. Compounding it, `probeValidation.ts` (the RV harness built in Phase 11 d6) has **zero
references in `src/`, `scripts/`, or `tests/`** — a dead module by the audit's own F4 class.

**W9 — The engagement register is test-only (Medium).** `45 §7.3` names `isMechanismAllowed` as
the runtime check organs call; only a test calls it. The register's content and the endorsement +
reversal tests are real, but the *enforcement* is a test-time assertion, so a future mechanism
activated without registration would be caught only if a test happened to enumerate it.

**W11 — The pool is CELL-DETERMINISTIC: the bands reach the UDV but cannot discriminate (High,
found while building d1).** The candidate library is 2240 candidates over 448 cells — **exactly five
per cell** (`world`, `scenario`, `scenario-authored`, `world-authored`, `npc-authored`, 448 each). A
cell-targeted pool therefore returns the same five refs for every player, and the ordering within
five fixed items does not move: supplying purpose, analogy or a declared interest leaves
`context.pooled` byte-identical (measured, 2026-09-23). Personalization today reaches the prompt only
as the interest-echo prose — content *selection* is decided entirely by the encounter's cell.

This is the deeper form of W4/W5 and it is the one finding that blocks the architecture's stated
purpose (`45 §5`'s "the UDV is the retrieval key"): *a retrieval key that orders a fixed five is not
a retrieval key.* The cause is content volume, not code: one authored rendering per (cell, tier). The
fix is **candidate multiplicity per cell** — several renderings per cell, distinguished by domain /
preference / register, so the UDV's bands decide WHICH rendering the player meets (Phase 13 d10).

The differential criterion of Phase 13 therefore reports honestly as unmet today: the bands are
wired and gated (G33), and the criterion closes when d10 lands. Locked as a gap in
`tests/personalization/Phase13Wiring.test.ts` so the change that closes it is visible in CI.

**W10 — No doc names the live seam (Low).** `sessionRuntime.ts` is the canonical envelope builder
after the memory audit's F0 fix, but no foundation doc identifies it; `envelopeRuntime`'s header
still claims to be "the missing wiring". A replayed agent would wire the wrong module.

### Not defects (declared, external, or by design)

| Item | Why it is not a defect |
|---|---|
| Embedding runtime not installed | 48 §4 marks it optional; installing `transformers.js`/`onnxruntime-node` is a new dependency requiring approval (the seam + `MY-RG-0032` pin are in place) |
| Pods have no shared-memory store | 48 §2 #12 / §6 declares cohort memory an external seam pending a hosting decision |
| PESTLE macro memory dormant | 22 §7.4 declares it intentionally dormant |
| K1–K3 thresholds unset | Data-dependent; the harnesses exist, the data does not |
| GitLab remote unsynced (C6) | Credential-blocked, not code; GitHub is current |

---

## 5. The plan — Phase 13: Live-Surface Wiring & Council Alignment

The plan owns order and gates (AGENTS.md §4.2). This phase adds **no new architecture**: every
deliverable either populates an already-ratified band, calls an already-written function at the
seam it was written for, or retires a redundant path. It also absorbs the memory audit's open
P-items so there is one queue.

**Ordering rationale:** d1 (bands) precedes d2 (scoping) because scoping projects bands — carrying
real content first makes the scoping gate meaningful. d3 (retrieval) precedes d4 (telemetry) because
both are seam work on the same surfaces. Content-adjacent items (d5, d6) are last and parallelizable.

| # | Deliverable | Owner surfaces | Done when |
|---|---|---|---|
| **d1** | **Populate the UDV at the live seam** (W4, W5; memory-audit R1). Supply `purpose` (from `IdentityProfile.purposes`, consent-scoped), `analogy` (fluent domains derived from the interest graph + declared interests), `preference` (modality mix + difficulty appetite + session tolerance + aesthetic leanings from the profile/play history), `constraints` (accessibility, consent-gated), and `observedInterests` (evidence-ledger `evaluate()` output, precedence-guarded below declared). Each band degrades to its ratified default when absent — the degradation law, 45 §5. | `sessionRuntime.buildEnvelope` (+ identity/ledger readers) | **G33** — band population: declared precedence holds, consent withdrawal removes the band, empty input degrades silently, no band is silently dropped at the seam |
| **d2** | **Council role scoping goes live** (W1, W2, W10; 45 §6.1). The live envelope exposes `ScopedEnvelope` per role via `scopeForRole`; the orchestrator hands each council role its scoped view. Consolidate: `sessionRuntime` becomes canonical; `envelopeRuntime`'s unique capability moves into it and the stubbed module is retired (or reduced to a thin adapter, if a test consumer must survive). | `sessionRuntime`, `scenarioContext`, `AgenticOrchestrator` | **G32** — role scope enforced at the live seam: an injected violation (a role receiving a band outside `receives`) fails closed; `mustNotReceive` claims asserted as absence |
| **d3** | **Retrieval live in the candidate path** (W3; 48 §4; memory-audit P2). `localRetrieve` shortlists library candidates above a size threshold; recall passes `filterRecall` (R1–R4) on the production path, not only under G31 fixtures. Determinism preserved (stable tie-order, corpus order as replay input). | `sessionRuntime` pooling seam, `LocalRetriever`, `retrievalFirewall` | G31 extended with **production traffic**: the recall path is exercised end-to-end; a banded-external token injected into a corpus member is proven dropped |
| **d4** | **Composition telemetry at the runtime seam** (W7; 46 §11). Record composition events where the envelope composes world texture; evaluate the diversity monitors on a schedule; surface defect reports to the dev loop (never to the player). | `sessionRuntime`, `compositionTelemetry`, `diversityMonitor` | Monitor reports generated from runtime events; a synthetic low-diversity corpus produces a defect report |
| **d5** | **Probes reachable + RV harness live** (W8; 47 §7; memory-audit P1). Wire `probeSet` offer/decline/record into a session surface (log-only band, `MAX_PROBES_PER_SESSION` enforced); give `probeValidation.ts` a real caller (test or validation script) so RV-A/adversarial/below-stage runs are executable and the log-only retirement path is reachable. | `sessionRuntime`/CLI, `probeSet`, `probeContent`, `probeValidation` | Probe offer/decline reachable in play; the RV harness runs in CI; no module in the probe tier is unreferenced |
| **d6** | **Engagement-register enforcement at the mechanism seam** (W9; 45 §7.3, MY-RG-0017). Call `isMechanismAllowed` where retention mechanisms are activated (analogical resonance, curiosity gap, growth legibility); an unregistered or forbidden mechanism fails closed. | envelope/mechanism activation sites | **G34** — a forbidden mechanism fails closed at the seam (injected fixture), and every shipped mechanism is registered |
| **d7** | **Resolve the composition engine's status** (W6; 46 §6.1/§7). Either the facet-store compiler is routed through `compose()`/`buildLibraryViews` (a gate asserts the store is the engine's output) or the doc marks them authoring-only. No third option. | `scripts/compile-facets.ts` or `46` | One status, documented and gated — the engine is either load-bearing or declared |
| **d8** | **Doc status marks** (48 §4, 45 §7.3, 46 §11, plus a note naming `sessionRuntime` as the live seam in 45/48). Status-mark seam-only items in place; the doc⇄code loop runs in the same commit as the code. | foundations 45/46/48 | No present-tense claim in a foundation doc is unbacked by code or explicitly marked as seam/provisional |
| **d9** | **Memory-audit carry-overs**: MemoryPage render budget cap (P1), sidecar session journal for crash-between-`sessionEnd`-and-save (P3), firewall randomized property sweep (P3). | `memoryPage`, `sessionRuntime`, `retrievalFirewall` | Budget bounded under a maximal synthetic feed; journal replays a killed session; property sweep green over N seeds |
| **d10** | **Candidate multiplicity per cell (W11 — the finding that makes personalization real).** The library holds one rendering per (cell, tier), so a cell-targeted pool returns a fixed five and the UDV's bands have nothing to order. Author/admit N renderings per cell — variants distinguished by domain, register, modality emphasis and NPC voice — and let the pool rank them by the UDV (interests, purpose, analogy, preference). This is content work plus one ranking rule, not new architecture; it is what makes `45 §5`'s "the UDV is the retrieval key" true. | `candidateLibrary`, authored seed tiers, `pooling.ts` | The Phase 13 differential criterion holds: swapping ONE band changes `context.pooled`; the library is asserted at >5 candidates per cell; gates G27/G33 still green |

**Gates:** G32 (role scope at the live seam), G33 (UDV band population + consent), G34
(engagement-mechanism fail-closed), plus G31 extended with production recall traffic. Kernel suite
31 → 34.

**Duration:** ~2 weeks. d1–d2 are the critical path (they unlock the personalization depth the
whole architecture was built for); d3–d4 are seam work; d5–d7 are independent and parallelizable;
d9 is small and continuous.

**Success criterion (the phase's whole point):** a player's declared interests, purpose, analogy
domains and inferred preferences each measurably change which candidates pool and what each council
role receives — provable by a differential test that swaps one band and shows the ranking changes.

---

## 6. What this audit does NOT claim

- It does not re-run the battery. `MEMORY-AUDIT-2026-09-22 §6` holds the last verified run
  (1401/1401 tests, 0 TS errors, 23 doc gates, lint clean).
- It does not evaluate the LLM-facing prompt quality of the rendered blocks — only that the
  surfaces reach them.
- It does not audit the K-12 / pods / credentialing subsystems (their own docs own those).
- Absence of a caller is reported as a wiring gap, never as broken behavior: every dark surface
  here fails *quiet* by design (the degradation law), which is exactly why they went unnoticed.

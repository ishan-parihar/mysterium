# EDUCATION-CANON-COMPLETION-PLAN

**Rung note:** living plan (plans rung). Emitted 2026-09-27 as a dated audit doc, promoted to
this rung the same day on the owner's alignment directive — a document the owner extends in place
is a plan, not a dated record, and the audits rung is never-authority by law.

**Directive (user, 2026-09-27):** complete the missing architectural-docs context for the
education-system dimension — a plan plus a per-doc outline for owner alignment, with an audit of
existing codebase decisions mapped onto the docs. The ratified Phase 17 implementation track
(d3 → d4 → d5 → Track B) is **parked awaiting owner alignment** (user directive 2026-09-27: clarify
the surface area and perfect the foundations first); this plan is that clarification. Nothing
here executes until aligned.

**Owner ruling (2026-09-27) — the share model:** the Significator profile sharing system does
**not** implement second-party personas (parent / guardian-of-record / teacher / therapist) at
this point. It is implemented like an **API-key permission level**: a player intending to share
their profile creates a share and selects the scopes the recipient may see — **the scope
selection is the entire security interface.** C-A below is restated to that ruling; the persona
rows in 16 §2.4 become *consumers* (use cases of 33 §7's render contracts), not implemented
machinery.

**What this is not:** not a re-audit of implementation (that is
`EDUCATION-SURFACE-AUDIT-2026-09-26.md` + its §8 addendum), and not new phase scope — every
canon item attaches to an already-ratified iteration or is explicitly marked owner-decision.

---

## 1. Inventory — the education canon as it stands (verified against bytes this date)

| Doc | Owns | State |
|---|---|---|
| 29 meta-learning | Learning-science substrate for 30–32 | Spec; consumed by 30/32 |
| 30 holonic curriculum | Curriculum engine architecture | **Built + gated** (engine, 108 holons) |
| 31 depth-assessment | Depth scoring model | **Built + gated** (depth rungs) |
| 32 agentic linter | Lint contract for the corpus | Built; **severities too weak** (P-3 warning / P-4 info → cs.program's 8/8-empty module lints clean) — d5 |
| 33 §1–5 learner dashboards | Player-facing render contract | **Built** (WebUI surfaces) |
| 33 §7 auditor dashboards | Render contract: Guardian Mirror / Educator Desk / Therapeutic Pane | **Contract complete — surface absent.** §7 is an 80-line render contract (§7.0–§7.4, five binding rules) specifying three named surfaces, a shared `AuditorShell.svelte`, and a `/api/auditor/view` server route; grep over `src/` returns **zero** hits for any of them. `src/routes/api/` exists (llm/tools, recovery, agent,
   save, telemetry), so §7.4's route has a natural home beside them — **d3 builds the first
   consumer** (Educator Desk + the §7.4 auditor route) |
| 34 engine bridge | Curriculum ↔ engine adapters | **Built + gated** (adapter-cloudflare) |
| 35 complexity mapping | The density instrument (§5.2: 97-holon minimum) | Measured; the invariant itself **not built** — d5 |
| 36 upgrade plan | Curriculum upgrade trajectory (phases A–G; scaling projection) | **Audited:** plan-shaped foundations doc whose Phase A (prerequisite depth enforcement) / Phase B (deepen the holarchy) are what d5 executes via 35 §5.2's minimum; day-estimates stale by construction, non-load-bearing; no divergence verified |
| 37 K-12 expansion | Branch trees, acceptance layer | Built 10/11 trees; **5 verified divergences** (audit §3) — d5 |
| 38 cohort weave | Pods, transport M0/M1, sync discipline | Spec-only; **§4.2 already owns the M0/M1 transport decision exactly as planned** — d4 implements, no canon work needed |
| 39 action-induction journal | Objectives, reflection protocol, journal system | **P0 BUILT + LIVE** — VowService (§3.2 lifecycle), ReflectionEvidence (§3.3 five-prompt protocol + §4.4 P0 heuristic scorer), `/journal` route; the audit called it "the most operationally complete doc in the dimension". **P1 DARK** (LLM rubric scorer + `propose_objective`/`process_checkin` never registered on `/api/llm/tools` — verified by grep); P2 pod-gated (38 M1); P3 (ObjectiveGenerator + therapy-arc gate) dark |
| 40 measurement packs | Pack registry, administration, reliability infra | Seam **built by d1**; provenance contract absent (C-B below) |
| 41 credentialing | Claim ledger, issue flow, EU staging | **Built** (ledger, draft≠issue per §4.3); issuance CLI-only by design (§2 staging) |
| 42 levelling | Evidence-only grading, competence/identity firewall | **Built + gated** |
| 16 §2.4 / §10.4 / §10.5 | Auditor Projection Layer, projections, Articulation Ladder | Projections + ladder **built by d2**; the sharing *contract* is thin (C-A below, restated to the owner's 2026-09-27 share-model ruling) |

Headline: the canon is **not broadly incomplete**. 38, 40, 41, 42 are in buildable-to-built shape.
The real gaps are **five**, three of which already have ratified homes.

---

## 2. Reverse mapping — decisions that live in code but not in docs

Each row: the code decision (file), its intended canon home, the gap.

| # | Code decision | Where it lives | Canon home | Gap |
|---|---|---|---|---|
| R1 | `ConsentLink { grantId, scopes, revoked }` — player-created share, scope-selected, revocable; AL4 contiguous-from-L1 floor; refused renders never leak payloads. **Owner ruling 2026-09-27: persona-free, API-key shape — scope selection is the entire security interface** | `src/core/domain/articulationLadder.ts` (+ LadderLive LD3 pins) | 16 §2.4 is persona-brokered (parent/teacher/therapist rows, "extends the IdentityProfile consent ledger §2.1") with **no share-contract section**; the ruling diverges from the persona framing (recorded with compensation in C-A); §10.5's AL4 row says "descent only" but never pins the L1 floor | **Thin — C-A (attaches to d3)** |
| R2 | `ResponderProvenance = 'deterministic-simulated' \| 'live-answers'` — one const feeds claim method/QA and every reliability row (`provenance`, `synthetic: true`); synthetic evidence can reject, never certify | `scripts/cli/packCmd.ts:16-17` | The reject-never-certify rule lives in plan/audit prose; the **record-marker contract** (every row and claim carries provenance) has no canon home | **Absent — C-B (small standalone pass, or rides d5)** |
| R3 | Pack registry seeds on the boot path beside the curriculum registry; reliability rehydrates through the public `recordSession` API (persistence is the caller's concern) | `referencePacks.ts` seed + `GameLoop.ts:264` + `ReliabilityCollector.ts:74` | 40 §1 owns the registry concept; the boot-seeding + rehydration decisions are code-only | One line each — rides **C-B** |
| R4 | Draft ≠ issue: pack evidence lands as a claim DRAFT; naming the subject stays the player's consented act | `ClaimLedger.draftClaim` / `mysterium credential issue` | 41 §4.3 already specifies this flow | **No gap** (mapped, confirming canon ↔ code) |
| R5 | Pod event discipline (monotonic events, serial application, occurredAtMs ordering) | `src/core/pods/podStateMachine.ts` | 38 §4.2/4.3 specify it | **No gap** (mapped) — d4 implements M0 as written |
| R6 | `hasSave` honesty gate: a render that requires history refuses without a save rather than narrating a fabricated profile | `ladderCmd.ts`, SaveRepository | Nowhere stated as a render-contract pattern | One sentence in 33 §7 intro — rides **C-A** |
| R7 | G45/G46 gate contracts (call-anchored, comment-stripped matching) | Record layer + `surface.ts` | Owned by the record layer as intended | **No gap** (records own gate contracts by design) |
| R8 | Path-naming linkage: `arch.py context src/core/practice` routes to the catalyst organ and `src/core/packs` to curriculum, but both report *"no foundation document names this path"* — while 38 names `src/core/pods/podStateMachine.ts` and routes to its spec cleanly. 39/40 don't name the code they govern, so `context` cannot surface them | `arch.py context` output, 2026-09-27 | 39 §4.3 / 40 (a naming line each, the 38 pattern) | **Linkage gap** — rides C-A/C-B (one naming line per doc) |

The audit's wider wall-list (§0 of the 2026-09-26 audit) — packs unreachable, ladder in-vitro,
auditor surfaces dark, pods in-vitro, 37 acceptance teeth — is **implementation state**, being
closed by d1–d5; not repeated here.

---

## 3. Missing context, tiered

**REQUIRE (production-blocking, all have homes):**
1. 37's five divergences + the density instrument + linter severities — **d5, ratified**.
2. 16 §2.4 share contract (create / scope-select / revoke lifecycle per the owner ruling, AL4
   floor) — **C-A**; d3 needs it *before* building the share mechanism, per the grounding
   principle (§4.3: fix foundations first).
3. 40 provenance contract (R2/R3) — **C-B**.

**WANT (coherence, schedule with owners):**
4. 39 phase-honesty: P0 ships on the live `/journal` route (this plan's first draft wrongly
   called the doc spec-only — corrected against the audit's own §1 row and the bytes). What is
   genuinely dark is the **P1 seam**: no practice tool (`propose_objective`/`process_checkin`)
   is registered on `/api/llm/tools`, and the §4.4 LLM rubric scorer (with heuristic-degrade
   reconciliation) is unwired; P2 is pod-gated (38 M1), P3 (ObjectiveGenerator + the therapy-arc
   validation gate) is dark. Either schedule P1 — small: register the tools, wire the scorer's
   graceful degrade — or record "P0 ships; P1–P3 spec-held" so the phase table stops silently
   over-promising. **Owner decision D-39.**
5. 33 §7.1 Educator Desk row: adequate for d3's cohort-of-one surface; cohort views (multiple
   students) need a §7.x amendment when pods land (d4+ territory) — note, don't write yet.

**DEFER (user-reserved / external, unchanged):** real-rater RV thresholds, partner institutions
+ DPIA (41 §2 staging), pod hosting decision (M1), KV IDs.

---

## 4. The outline — proposed canon amendments for owner alignment

### C-A — 16 §2.4 "The share contract" (new subsection, ~12 lines; with d3)
**Restated to the owner's 2026-09-27 ruling:** an API-key-permission shape, persona-free.
1. The share shape, as code already types it: `grantId`, `scopes ⊆ L1..L7` (**player-selected**),
   `revoked` — one player-issued key per recipient; no identity typing, no role classes, no
   guardian-of-record logic. The scope selection **is** the security interface.
2. Lifecycle: create → scope-check at every render (AL5, already canon) → revoke nulls the
   projection instantly; refused renders return a reason, never a partial payload (LD3 pin).
3. AL4 floor stays load-bearing (a share's scopes are contiguous from L1; L0 — the player's
   felt-sense surface — is never shareable) — **a recorded divergence, not a prose sentence**:
   canon AL4 (16:513) says "descent only for auditors" but never names L0; code
   (`articulationLadder.ts`) enforces `firstIdx >= 1`. Lands as a MY-AD via `arch.py new` WITH
   its compensation (nothing lost: L1's holonic span already carries the lived-experience
   summary in rubric-named form), plus the one-line AL4 amendment in §10.5.
4. 16 §2.4's persona rows are re-framed as *consumers* of the share mechanism (the use cases
   33 §7's render contracts serve) — the re-framing is recorded in C-A's MY-AD (compensation:
   the three surfaces remain render contracts over the same shares; no capability is removed,
   only identity-typing deferred).
5. R6's honesty-gate sentence in 33 §7's intro: *a surface that renders history refuses without
   a save — never narrates a fabricated profile.*
6. R8's naming lines (16 §2.4 / 39 §4.3 / 40 name their code paths, the 38 pattern).
   **[ANSWERED by the ruling]** audit-trail depth: none now — the scope selection is the entire
   interface; grant/audit fields deferred to institutional surfaces if those ever land.
   **STATUS: LANDED 2026-09-27** — 16 §2.4.1 + §10.5's amended AL4, MY-AD-0034, 33 §7's
   honesty sentence, the R8 naming lines; the build (d3) followed.

### C-B — 40 §1 "Provenance & the synthetic-evidence contract" (new subsection, ~10 lines; standalone or with d5)
1. Every reliability row and claim draft carries `provenance ∈ {deterministic-simulated,
   live-answers}`; `synthetic: true` on every simulated row.
2. The rule's canon neighbours, cited not re-stated: 12 §5.4 RV3 (synthetic personas are
   validation-only instruments) and the Phase-15 record (*synthetic evidence can reject but never
   certify*). What has **no** canon home is the record-level enforcement contract: every row and
   claim carries provenance + synthetic markers, so a drill's theta can never be mistaken for a
   person's.
3. Boot-seeding + rehydration one-liners (R3).
   **[ALIGN]** none — this is already the enforced behavior; codifying it is pure drift-prevention.
   **STATUS: LANDED 2026-09-27** — 40 §1.1 in full.

### C-C — 37 reconciliation (already d5; outline per audit §3, not repeated)
   **[ALIGN]** the density-check hardening (report-only → battery-failing) remains the named
   owner decision in plan §8.
   **STATUS: LANDED 2026-09-27 (d5)** — 37 reconciled to the measured registry (113 holons /
   248 items; the 56/1,280 row retired), the difficulty-bell criterion amended as
   unimplementable-as-specified, P-3/P-4 promoted to error with 42 authored content pieces and
   the earth-science branch, the density instrument live (report-only + `--deny-under`).
   The hardening ruling remains the owner's; the numbers are on the table (every branch below
   35 §5.2's 97 minimum).

### C-D — 39 phase status — **SHIPPED (D-39, 2026-09-27)** under the full-execution directive (option (a))
   P0 ships; the dark remainder was precisely scoped: `scoreReflectionDepth`'s only production
   consumer was `/journal` via `processCheckIn` — so §4.4's pipeline ran **P0-only** (the heuristic
   stage; the LLM rubric stage + its reconcile were absent), and `practiceTools`'s header named a
   toolset nothing registered — the in-vitro shape G49 exists to catch. **BUILT:** both tools
   registered and dispatched on both orchestrator paths and live in the browser loop; the §4.4
   pipeline with its graceful degrade; the crisis gate ahead of scoring (crisis text never
   reaches the LLM). P2 stays pod-gated (38 M1); P3 (ObjectiveGenerator + the therapy-arc
   validation gate) remains dark and is Phase 18 material.

---

## 5. Interleaving with the ratified plan (no new phase) — **ALL LANDED 2026-09-27**

| Order | Item | Canon | Outcome |
|---|---|---|---|
| foundations-first | **C-A** share contract + AL4 floor record | 16 §2.4.1 + §10.5, MY-AD-0034, 33 §7, R8 lines | **LANDED** |
| 1 | **d3** share mechanism + first read-only consumer | C-A first | **BUILT** (G47) |
| 2 | **d4** pod transport M0 | none needed (38 §4.2 verified adequate) | **BUILT** (G48) |
| 3 | **d5** 37 teeth-first repair | C-C + C-B | **BUILT**; C-B also landed standalone (40 §1.1) |
| 4 | **D-39** the journal P1 seam | 39 §4.3's naming line updated | **SHIPPED** (G49) |
| 5 | **Track B** WebUI parity + the Interpersonal reserve | — | **BUILT** (G50) |

**This plan is closed.** Remaining owner-facing residue: the density-hardening ruling (the
numbers are measured) and the standing external list (KV IDs, hosting, real raters,
institutions, DPIA, C6).

## 6. Owner align points (the complete list) — **RESOLVED 2026-09-27**

1. ~~C-A audit-trail depth~~ — **ANSWERED by the 2026-09-27 share-model ruling:** the scope
   selection is the entire security interface; no grant/audit fields now.
2. ~~D-39~~ — **RESOLVED by the full-execution directive:** P1 shipped as deliverable D-39 (G49).
2. **D-39** — the journal P1 seam: register the practice tools + wire the LLM scorer now (rides
   Phase 17), or record P1–P3 spec-held. P2/P3 are pod-gated either way.
3. **C-C hardening** — the standing named decision (density gate report-only vs battery-failing).
   **Still the owner's; the instrument ships report-only and the numbers are measured
   (15 branches / 113 holons, every branch below 35 §5.2's 97 minimum) — the ruling is one
   flag away.**
4. ~~C-B~~ — uncontroversial, landed with the canon pass (40 §1.1).

Everything else in this plan is verification of existing canon↔code agreement, recorded so the
next reader doesn't re-derive it.

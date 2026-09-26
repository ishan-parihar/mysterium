# EDUCATION-CANON-COMPLETION-PLAN — 2026-09-27

**Directive (user, 2026-09-27):** complete the missing architectural-docs context for the
education-system dimension — a plan plus a per-doc outline for owner alignment, with an audit of
existing codebase decisions mapped onto the docs. The ratified Phase 17 implementation track
(d3 → d4 → d5 → Track B) is **unchanged and still first**; this plan sequences the canon depth
*into* those iterations. Nothing here executes until aligned.

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
| 33 §7 auditor dashboards | Render contract: Guardian Mirror / Educator Desk / Therapeutic Pane | Spec — **d3 builds the first surface** (Educator Desk) |
| 34 engine bridge | Curriculum ↔ engine adapters | **Built + gated** (adapter-cloudflare) |
| 35 complexity mapping | The density instrument (§5.2: 97-holon minimum) | Measured; the invariant itself **not built** — d5 |
| 37 K-12 expansion | Branch trees, acceptance layer | Built 10/11 trees; **5 verified divergences** (audit §3) — d5 |
| 38 cohort weave | Pods, transport M0/M1, sync discipline | Spec-only; **§4.2 already owns the M0/M1 transport decision exactly as planned** — d4 implements, no canon work needed |
| 39 action-induction journal | Objectives, reflection protocol, journal system | **P0 BUILT + LIVE** — VowService (§3.2 lifecycle), ReflectionEvidence (§3.3 five-prompt protocol + §4.4 P0 heuristic scorer), `/journal` route; the audit called it "the most operationally complete doc in the dimension". **P1 DARK** (LLM rubric scorer + `propose_objective`/`process_checkin` never registered on `/api/llm/tools` — verified by grep); P2 pod-gated (38 M1); P3 (ObjectiveGenerator + therapy-arc gate) dark |
| 40 measurement packs | Pack registry, administration, reliability infra | Seam **built by d1**; provenance contract absent (C-B below) |
| 41 credentialing | Claim ledger, issue flow, EU staging | **Built** (ledger, draft≠issue per §4.3); issuance CLI-only by design (§2 staging) |
| 42 levelling | Evidence-only grading, competence/identity firewall | **Built + gated** |
| 16 §2.4 / §10.4 / §10.5 | Auditor Projection Layer, projections, Articulation Ladder | Projections + ladder **built by d2**; consent *data contract* thin (C-A below) |

Headline: the canon is **not broadly incomplete**. 38, 40, 41, 42 are in buildable-to-built shape.
The real gaps are **five**, three of which already have ratified homes.

---

## 2. Reverse mapping — decisions that live in code but not in docs

Each row: the code decision (file), its intended canon home, the gap.

| # | Code decision | Where it lives | Canon home | Gap |
|---|---|---|---|---|
| R1 | `ConsentLink { grantId, scopes, revoked }` lifecycle: player-issued, revocable, scope-bounded; AL4 contiguous-from-L1 floor; refused renders never leak payloads | `src/core/domain/articulationLadder.ts` (+ LadderLive LD3 pins) | 16 §2.4 names the brokerage concept ("extends the IdentityProfile consent ledger §2.1") but has **no data contract / lifecycle section**; §10.5's AL4 row says "descent only" but never pins the L1 floor | **Thin — C-A (attaches to d3)** |
| R2 | `ResponderProvenance = 'deterministic-simulated' \| 'live-answers'` — one const feeds claim method/QA and every reliability row (`provenance`, `synthetic: true`); synthetic evidence can reject, never certify | `scripts/cli/packCmd.ts:16-17` | The reject-never-certify rule lives in plan/audit prose; the **record-marker contract** (every row and claim carries provenance) has no canon home | **Absent — C-B (small standalone pass, or rides d5)** |
| R3 | Pack registry seeds on the boot path beside the curriculum registry; reliability rehydrates through the public `recordSession` API (persistence is the caller's concern) | `referencePacks.ts` seed + `GameLoop.ts:264` + `ReliabilityCollector.ts:74` | 40 §1 owns the registry concept; the boot-seeding + rehydration decisions are code-only | One line each — rides **C-B** |
| R4 | Draft ≠ issue: pack evidence lands as a claim DRAFT; naming the subject stays the player's consented act | `ClaimLedger.draftClaim` / `mysterium credential issue` | 41 §4.3 already specifies this flow | **No gap** (mapped, confirming canon ↔ code) |
| R5 | Pod event discipline (monotonic events, serial application, occurredAtMs ordering) | `src/core/pods/podStateMachine.ts` | 38 §4.2/4.3 specify it | **No gap** (mapped) — d4 implements M0 as written |
| R6 | `hasSave` honesty gate: a render that requires history refuses without a save rather than narrating a fabricated profile | `ladderCmd.ts`, SaveRepository | Nowhere stated as a render-contract pattern | One sentence in 33 §7 intro — rides **C-A** |
| R7 | G45/G46 gate contracts (call-anchored, comment-stripped matching) | Record layer + `surface.ts` | Owned by the record layer as intended | **No gap** (records own gate contracts by design) |

The audit's wider wall-list (§0 of the 2026-09-26 audit) — packs unreachable, ladder in-vitro,
auditor surfaces dark, pods in-vitro, 37 acceptance teeth — is **implementation state**, being
closed by d1–d5; not repeated here.

---

## 3. Missing context, tiered

**REQUIRE (production-blocking, all have homes):**
1. 37's five divergences + the density instrument + linter severities — **d5, ratified**.
2. 16 §2.4 consent data contract (issue/grant/scope/revoke lifecycle, AL4 floor) — **C-A**; d3
   needs it *before* building the brokerage, per the grounding principle (§4.3: fix foundations
   first).
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

### C-A — 16 §2.4 "The consent brokerage data contract" (new subsection, ~15 lines; with d3)
1. The `ConsentLink` shape as code already types it: `grantId`, `scopes ⊆ L1..L7`, `revoked`,
   issued-by-the-player (guardian-of-record for young players, per the existing table).
2. Lifecycle: issue → grant-check at every render (AL5, already canon) → revoke nulls the
   projection instantly; refused renders return a reason, never a partial payload (LD3 pin).
3. The AL4 floor, one sentence in §10.5's AL4 row: *auditor descent is contiguous from L1; L0 is
   the player's felt-sense surface and is never grantable to an auditor.*
4. R6's honesty-gate sentence in 33 §7's intro: *a surface that renders history refuses without
   a save — never narrates a fabricated profile.*
   **[ALIGN]** depth of 2 — does the owner want audit-trail (who granted, when) as a first-class
   field now or when institutional surfaces need it?

### C-B — 40 §1 "Provenance & the synthetic-evidence contract" (new subsection, ~10 lines; standalone or with d5)
1. Every reliability row and claim draft carries `provenance ∈ {deterministic-simulated,
   live-answers}`; `synthetic: true` on every simulated row.
2. The rule as law: *synthetic evidence can reject a design but never certify a person; an
   issued VC from a simulated responder is evidence of the machinery, not a measurement.*
3. Boot-seeding + rehydration one-liners (R3).
   **[ALIGN]** none — this is already the enforced behavior; codifying it is pure drift-prevention.

### C-C — 37 reconciliation (already d5; outline per audit §3, not repeated)
   **[ALIGN]** the density-check hardening (report-only → battery-failing) remains the named
   owner decision in plan §8.

### C-D — 39 phase status (one paragraph, either form)
   P0 ships; the dark remainder is P1 (tools on `/api/llm/tools` + LLM rubric scorer with
   heuristic-degrade), P2 (pod-gated), P3 (ObjectiveGenerator + therapy-arc gate).
   **[ALIGN — owner decision D-39]:** (a) P1 rides Phase 17 as a small item (register the two
   tools, wire the scorer reconcile — days, not weeks; it is also the evidence side of the
   39→40→41 chain packs/claims cite), or (b) record "P0 ships; P1–P3 spec-held, revisit after
   Phase 17 / pods" and leave it at that.

---

## 5. Interleaving with the ratified plan (no new phase)

| Order | Item | Canon |
|---|---|---|
| next | **d3** Educator Desk + consent brokerage | C-A lands first (foundations-before-code) |
| then | **d4** pod transport M0 | none needed (38 §4.2 verified adequate); the 33 §7 cohort note waits |
| then | **d5** 37 teeth-first repair | C-C (already the plan's text) + C-B if not done standalone |
| parallel-OK | **C-B standalone** | 10 lines; can land any iteration before d5 |
| after Phase 17 (or as a Phase 17 add-on — owner's call) | **D-39 P1 seam** (if ruled (a)) | P2/P3 stay pod-gated regardless |
| unchanged | Track B + Phase 16 carries | none |

## 6. Owner align points (the complete list)

1. **C-A §2 depth** — audit-trail as first-class now, or deferred to institutional surfaces.
2. **D-39** — the journal P1 seam: register the practice tools + wire the LLM scorer now (rides
   Phase 17), or record P1–P3 spec-held. P2/P3 are pod-gated either way.
3. **C-C hardening** — the standing named decision (density gate report-only vs battery-failing).
4. Confirm C-B needs no alignment (proposed: treat as uncontroversial, land with the next
   iteration unless objected).

Everything else in this plan is verification of existing canon↔code agreement, recorded so the
next reader doesn't re-derive it.

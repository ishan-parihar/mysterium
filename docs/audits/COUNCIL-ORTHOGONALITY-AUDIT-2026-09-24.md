# Council Orthogonality & Envelope Architecture Audit — 2026-09-24

**Scope:** the two things this project calls *the council* — `43 §4.2`'s sub-agent taxonomy (18
roles) and `45 §6.1`'s personalization scopes (5 roles) — audited for **orthogonality**, then
designed for **summoning** (how each role enters the agentic loop and how the player's experience
shifts at that moment), **envelope scoping** (what each role receives, why, for how long, and what
it may return), and **standing context** (what every deployed agent carries in-window, and how it
reaches more on authorization).

**Method:** the ratifying docs read as contracts (`43 §3.1–§3.4`, `§4.1–§4.7`, `§5.1–§5.5`;
`45 §3`, `§5.4`, `§6.1`, `§7`), plus a consumer trace over `src/core/orchestration/` and
`src/core/personalization/` to establish what is live versus declared.

**Predecessors:** `WIRING-CONTRAST-AUDIT-2026-09-23` (live-surface wiring; W1 = role scoping dark,
now built) and `MEMORY-AUDIT-2026-09-22` (memory tier).

---

## 1. The two councils, stated once

| | **The workforce** (`43 §4.2`) | **The visibility table** (`45 §6.1`) |
|---|---|---|
| Question it answers | *who does the work* | *what may that worker see of the player* |
| Members | T1–T3 Teacher · A1–A4 Assessor · J1–J5 Journey-Guide · Therapist · S1–S5 Specialist | scenario-catalyst · narrative-voice · assessment · curriculum-teacher · safety |
| Grant | a toolset (`ROLE_TOOLSETS`) | a band subset of the UDV/envelope |
| Output | proposals, ratified by the orchestrator (L4) | rendered prose, scoped to mandate |
| Status | **built and live** (spec → log → ratify → commit; G14/G15; CLI `delegate`) | **built 2026-09-23** (G32/G33); one live consumer (`assessmentScopeLine`) |

`45 §6.1` declares that *each council role (`43 §4.2`) receives the envelope scoped to its mandate*
— i.e. the two are meant to be one council with two contracts. **They are not yet bound:** no
`AgentRole → CouncilRole` mapping exists in code, and `delegate.ts` carries no envelope at all.

---

## 2. Orthogonality audit

Each finding is a pair or triple whose mandates could overlap, with the ruling that keeps one owner
per function (§3.2's uniqueness principle applied to agents).

### O1 — J2 (test) vs A1 (Examiner): **same function, two dresses — needs a stated split**
`A1` runs “staircase-probed testing (08) in-game”; `J2` runs “a bounded assessment arc dressed as an
ordeal”. Both produce depth-level evidence. **Ruling:** they are the same *function* at two
*fidelities* — A1 owns the evidence contract and the psychometric calibration; J2 is the diegetic
delivery tier that must cite A1's parameters. Neither may invent its own depth scales.

### O2 — J4 (therapy) vs Therapist: **a producer/consumer pair, not a duplication — state it**
The Therapist “is the only agent permitted to *propose* shadow-work sessions (J4 delegation)”, so J4
delivers what the Therapist proposes. **Ruling:** one shadow-work arc has exactly one proposer
(Therapist) and one deliverer (J4); J4 never self-initiates shadow-work.

### O3 — A2 (Reviewer) vs Therapist arc notes: **adjacent narrative writers — split by object**
A2 synthesises the *reflection corpus* (39's journal); the Therapist keeps *arc notes* and holds the
safety frame. Both write prose about the player's inner process. **Ruling:** A2's object is the
journal entry (public to the player, consent-gated); the Therapist's object is the arc (private,
safety-bearing). A2 never reads arc notes; the Therapist never synthesises a reflection for display.

### O4 — T3 (Prescriber) vs S3 (Curriculum Aligner) vs J5 (Guidance): **three "what next" proposers — already distinct, verified**
The three proposal kinds are different in code (`propose_trajectory`, `propose_alignment_adjustment`,
`report_threshold_signal` — `TOOL_PROPOSAL_KINDS`), and each answers a different question: T3 = *this
player's study plan*; S3 = *the syllabus↔engine mapping*; J5 = *the threshold counsel narrative*.
**Ruling:** no change; the distinction is real and enforced by proposal kind. Recorded because the
prose in 4.2 could tempt a future reader to merge them.

### O5 — S2 (Context Steward) vs S4 (Data Warden): **adjacent identity roles — boundary is write vs read**
S4 executes consent grants/withdrawals and answers "what do you know about me"; S2 assembles the
projection inputs and the alignment context. **Ruling:** S4 is the only agent that changes consent
state; S2 is the only agent that assembles projections. S2 may never write consent; S4 may never
assemble a projection.

### O6 — A3 (Validator) vs S1 (Pack Agents): **a genuine redundancy — identical toolsets**
Both hold `pack_administer` + `pack_score` and both "administer domain instruments (40)". This is
the one true collision in the taxonomy. **Proposed ruling:** S1 is the pack's *operational owner*
(administration, session logistics, scoring pipeline); A3 is the *validity judge* (certification
claims, reliability status, `provisionalUntil` retirement). The shared toolset is fine — the
*distinct return contract* is what separates them: S1 returns a scored trial record; A3 returns a
reliability verdict on the instrument. Requires ratification (§7).

### O7 — A4 (Calibrator) vs A1 (Examiner): **distinct — placement vs evidence**
A4 returns placement parameters; A1 returns depth evidence. No overlap. Verified in code: A4's tool
is `propose_placement`, A1's is `propose_mastery_evidence`.

### O8 — `45 §6.1` has **no row for healing and no row for the orchestrator**
The table covers catalyst/voice/assessment/curriculum/safety, but the Therapist and J4 are the most
delicate consumers (they handle shadow material) and appear nowhere; and the orchestrator — who by
`43 §3.2` *holds everything* — has no declared contract either. **Both rows are added in §5.**

### O9 — 18 roles → 5 scopes: **no binding exists**
Which visibility does T1 get? Today: undefined. §5 supplies the table.

### O10 — **The council has no dispatcher in the live loop** (the largest operational gap)
Traced: the only production callers of `delegateSession` are the CLI (`mysterium delegate`) and the
kernel gate. The orchestrator's live encounter loop runs the encounter itself and never summons a
sub-agent; `schedulePresence` exists but is likewise un-summoned from play. So the council is a
fully-built workforce with no dispatcher — it can be invoked by hand, not by the journey. §4 designs
the dispatcher.

---

## 3. Summoning: how each role enters the loop, and what the player feels

`43 §3.3` already rules that *presence is a pacing instrument*: the orchestrator decides not only
who acts but when the player meets them, deterministically given strategy (27). What is missing is
the **trigger table** that binds a state-change to a summoner and to a role.

| Trigger (state change, checked where) | Summoner | Role summoned | The player's experience shifts to |
|---|---|---|---|
| Encounter opens on a cell | strategy (27) → orchestrator | **J1** (game) / **J2** (test) / **J3** (diagnosis) per the cell's intent | meeting the cell's figure — the world's inhabitant, in a scene |
| Depth plateau: repeated passes with no movement | strategy (27) | **T1** (teach) then **T2** (revise, if decayed) | a Mentor arrives who explains rather than tests |
| Retention decay on a consolidated band | strategy (27) via feed `progressDelta` | **T2** | a revisit, framed as remembering with someone |
| Reflection written in the journal | journal surface | **A2** | a Mirror reflects the player's own words back |
| Threshold proximity (17) | developmental agenda (`agapeScan`/`erosScan`) | **J5**, and the council *assembled* (43 §3.3's whole-council moment) | the world reorganises; several figures appear at once |
| Crisis pattern detected (`core/safety/crisis.ts`) | **bypass** (§4.7) | **safety** scope consumer, then the Therapist | the game stops being a game; the frame becomes plainly human |
| Shadow-work warranted (ledger entry) | **Therapist** proposes | **J4** delivers | a companion sits with the heavy thing, in-world |
| Pack intake due (40) | strategy (27) | **S1** administers / **A3** judges | a bounded, honest instrument — explicitly not the game |
| Placement unknown (onboarding, 42) | orchestrator | **A4** | calibration framed as a threshold trial |
| Consent change / "what do you know about me" | player-initiated | **S4** | a plainly-consented, out-of-fiction surface |
| Loop health, corpus, benchmarks | tick | **S5** (background) | nothing — the player never meets it |
| Context assembly, projections for other roles | every dispatch | **S2** (background) | nothing direct — it is the one who *prepares* the encounter |

Two properties make this a *design* and not a lookup: (1) **the trigger table is the pacing law** —
the same player in the same state must summon the same role (deterministic, kernel-testable per
27/43 §3.3); (2) **the whole-council moment is reserved for transformation** (17), which is what
makes its arrival dramatic — if the council were summoned freely, the threshold would lose its
weight.

---

## 4. The ideal envelope scoping, per role

`45 §6.1` currently states *which bands* a role receives. That is necessary and not sufficient: a
deployed agent also needs to know *why* it may use them, *how long* it holds them, and *what it may
return*. The four-part contract below extends the table without changing its rule (the more
metric-bearing the role, the less it sees).

| Role | Bands received | Purpose of use | Lifetime | Return contract |
|---|---|---|---|---|
| **Orchestrator (steward)** | **Everything** — all bands + the measurement layer (depths, thetas, CCI) | strategy, dispatch, ratification; it is the only agent that knows what is happening and why | the Significator's own memory (persistent) | commits state (L4); never a proposal |
| **scenario-catalyst** (foreground) | full UDV | render the encounter in the player's language | one encounter | encounter record + drive probes |
| **narrative-voice** | preference + analogy + purpose | voice and imagery only | one encounter | prose (no proposals) |
| **assessment** | developmental band + catalyst target | score this encounter's evidence | one encounter | mastery/shadow evidence proposals |
| **curriculum-teacher** | developmental band + purpose (as *transfer targets*) | choose what to teach next, in the player's language | one study arc | trajectory proposals |
| **safety** | aversions (veto list) + crisis signals | protect; never engage | always resident, speaks only on trigger | routing/escalation |
| **healing** *(new row, §7)* | aversions (veto list) + developmental band + purpose (as stakes) | sit with shadow material; never render catalyst in the player's own domains | one therapy arc | shadow-entry + resolution proposals |
| **ops / context-steward** | none of the player's bands (S2 holds the *projection inputs*, not the envelope) | assemble, operate, verify | standing | non-player-facing reports |

**The orchestrator's row is the important one**, because `43 §3.2` makes it the *steward of the
Significator's inner court*. It is the only role that sees the measurement layer; every other role
receives bands or prose. That asymmetry is what keeps the Veil intact at the top of the tree: the
player meets figures who speak in-world, while exactly one holder knows the numbers and never says
them (§3.4).

---

## 5. Standing context and envelope access (the delivery contract)

The user's ruling: *the scoped context must be part of the standing context window whenever an agent
is deployed, and there must be tooling to reach each envelope on demand — so that in long-running
agentic loops an agent can always call the context for audit, review, or refactor, when authorized.*

This turns the envelope from a per-call argument into a **two-tier contract**:

**(a) The standing block** — injected at every deployment, always in-window, never retrieved:

```
[MY MANDATE]   role · council · the one thing I do · what I return
[MY VIEW]      the bands I receive (rendered, banded language) · the catalyst target/cell
[MY BOUNDARIES] what I must not receive (stated explicitly) · the Veil: never assert measurement
[MY TOOLS]     my allowlist (43 §4.3) · read tools available to me
[MY SESSION]   session-log ref · delegation id · long-loop: prior delegations of the same mandate
```

**(b) The access tooling** — for the long loop, where a standing block is not enough:

| Tool | What it does | Authorization |
|---|---|---|
| `read_my_scope` | re-read own scoped envelope at any point in the session | none (own scope) |
| `read_band` | read one band beyond the standing view | **authorized per band per role**; refusal is recorded |
| `read_session_log` | read own prior delegations (43 §5.1 eager reading) | own role's logs |
| `analyze_session_logs` | deep analysis over the arc (43 §5.2) | on warrant, logged |
| `request_envelope_review` | ask S2/orchestrator for a fuller projection for audit | proposal; ratification required |

Every access is **read-only, purpose-bound, and logged**; no access tool writes state (F1/R2).
A refusal is information for the loop, not an error: it tells the orchestrator that a role's view is
being stretched, which is the early signal of the mis-scoping this audit exists to prevent.

---

## 6. What is actually required to operationalize this

Ordered; the first two are small and unblock everything else.

1. **Bind the two councils** (`AgentRole → CouncilRole`): J1–J5 → scenario-catalyst; T1–T3, S3 →
   curriculum-teacher; A1–A4, S1 → assessment; Therapist, J4 → healing; S4 + the crisis path →
   safety; S2 → producer (holds no player bands); S5 → none.
2. **Deliver the scope in the delegation path** — `delegationSpec`'s session context carries
   `scopes[boundRole]` + the standing block; extend G32 with an injected out-of-binding band
   (must fail closed). Until this lands, every delegated sub-agent runs unscoped.
3. **Add the healing + orchestrator rows** to `45 §6.1` (this audit's §4), so the two most
   consequential roles have contracts.
4. **Build the dispatcher** (O10) — the trigger table as strategy: `schedulePresence` gains its
   production caller in the live loop, deterministic per 43 §3.3, with a gate that the same state
   summons the same role.
5. **Then d10 (candidate multiplicity)** — because until a cell has more than one rendering, all
   roles receive the same content and scoping differentiates nothing.

---

## 7. Open decisions (ratification needed)

| # | Decision | Proposed default |
|---|---|---|
| D1 | Healing row: own scope / full envelope / strictest | **Own row** (§4): aversions + developmental + purpose-as-stakes, never the interest graph or analogy — affinities must not be usable as levers in shadow-work |
| D2 | A3 vs S1 redundancy (O6) | S1 operates the pack; A3 judges the instrument — distinct return contracts, shared toolset |
| D3 | Does the foreground assessment step become a delegated A-role call? | Yes, eventually: today one prompt both personalizes and scores; the council model wants the scoring step delegated to an Assessor with its immutable scope |
| D4 | Summoning tier | Strategy-driven and deterministic (no LLM decides who appears) — the threshold moment stays reserved for transformation |

---

## 8. What this audit does NOT claim

- It does not re-run the battery; the last verified run is recorded in `WIRING-CONTRAST-AUDIT-2026-09-23` §6.
- It does not design the WebUI surfaces for each role (33 owns the render contract).
- It does not change any ratified law: every ruling above operates inside `43 §4.1`'s L1–L4 and
  `45 §6.1`'s visibility rule.

# 43 — Agentic Orchestration Architecture: the Primary Orchestrator, the Sub-Agent Council, and the Tool Systems

> **Cross-references:** [[AGENTS.md|AGENTS.md (process protocol)]] · [[docs/foundations/23-polarity-ontology|23 — Polarity Ontology]] · [[docs/validation/BENCHMARK-ARCHITECTURE|Validation Benchmark Architecture]]
> **Status:** canonical-hypothesis (architecture; precedents exist and are load-bearing — see §8).
> **Lateral:** the **multi-agent execution topology** — how profile management, context
> acquisition, curriculum alignment, and every developmental surface are *agentically
> orchestrated*. This document owns: the primary-orchestrator/sub-agent relationship, the
> sub-agent taxonomy (the full council), the tool-system architecture for the core loop and
> each sub-loop, the session-log protocol that makes background orchestration possible, the
> foreground/background handoff, and the safety/consent boundaries of delegation. It does
> NOT own: what an assessment module contains (10, 26), how strategy is generated (27),
> how the curriculum hooks into the engine (34), or how practice objectives work (39) —
> it owns *who runs those mechanisms and how they hand results back*.

---

## 1. Purpose

### 1.1 The problem this document solves

Mysterium is not a single agent with a big prompt. It is a **society of specialized
agents coordinated by one primary orchestrator**. The user-facing requirement:

> "Everything related to profile management, and everything related to getting a
> particular domain of context for the user — including the alignment context for the
> curriculum — must be agentically orchestrated. The primary orchestrator must be able to
> call specialized agents whose job would be: teach/revise/prescribe,
> assess/review/test/validate, or line/stage-specific developmental
> journey-game / developmental-test / developmental-diagnosis / developmental-therapy /
> developmental-evolutionary-guidance. The sub-agent takes the foreground; the primary
> orchestrator sits in the background waiting for results, along with log files that give
> it the overview — and, if required, deeper log analysis that helps it orchestrate the
> entire journey more effectively."

Three structural claims follow, and they are binding:

1. **Agentic mediation is total.** There is no code path where a system surface
   (profile, context, curriculum, therapy, assessment) bypasses an agent to act on the
   player directly. Engines *compute*; agents *converse, interpret, prescribe, and
   deliver*. This is the radicalization of the existing canon (22 §1: "LLM as voice, not
   brain") — the voice is now plural.
2. **The orchestrator is a supervisor, not a micromanager.** While a sub-agent holds the
   foreground, the orchestrator does not interject into the player's experience. It
   waits, reads logs, and prepares. It re-enters the foreground only at defined
   handoff points (§6).
3. **Logs are the orchestrator's sensory organ.** Every sub-agent session produces a
   structured, replayable log. The orchestrator reads summaries eagerly and digs into
   raw logs only when summary signals warrant deeper analysis (§5). This is what lets
   it "sit in the background" without losing the thread of the journey.

### 1.2 The two questions every delegation answers

When the orchestrator considers delegating, it is answering one of:

- **"What should happen next, and who delivers it?"** (prescriptive delegation)
- **"What is actually true of this player, and who measures it?"** (epistemic delegation)

Both kinds of delegation produce the same artifact class — a **DelegationResult**
(§6.2) — but they differ in what the orchestrator does with the logs: prescriptive
results are checked for *delivery quality*, epistemic results are checked for
*measurement integrity* (did the agent stay inside its rubric; did it violate the Veil;
did it cross the competence/identity firewall, 42 §1.1).

---

## 2. Scientific basis

- **Distributed cognition (Hutchins).** Cognition is not bounded by one skull or one
  process; it is the property of a coordinated system of agents and artifacts. The
  orchestrator/council split is distributed cognition made literal — with the addition
  that the artifacts of coordination (logs) are first-class, machine-readable.
- **Supervisor–worker patterns from multi-agent systems research.** The orchestrator
  pattern (plan → delegate → wait → synthesize) matches observed best practice in
  LLM agent systems: a controlling agent with tool access delegating bounded tasks to
  specialists, each with a narrower system prompt, a smaller tool surface, and its own
  termination condition. Narrower scope per agent measurably improves reliability —
  which is also the psychometric requirement (a measuring agent must be stable, 40 §2).
- **Cognitive apprenticeship & the tutoring literature.** The Teacher agent operationalizes
  modeling/coaching/scaffolding/fading; the Assessor operationalizes the assessment-for-
  learning loop. Separating them is deliberate: the same agent that teaches you should
  not grade you (evaluation apprehension contaminates both; the assessor must be able to
  deliver unwelcome evidence cleanly, 31 §2's dual-depth honesty).
- **Therapeutic frame integrity.** The Therapist agent inherits the Veil (20) and the
  "never diagnostic to the user" commitment (§5.4 AGENTS.md canon). A dedicated therapy
  agent — rather than therapy-as-a-mode-of-chat — lets the system hold a *consistent
  therapeutic frame* across a whole arc, with the shadow ledger as shared memory.
- **Role-play and perspective-taking in development.** The Journey-Guide agents are
  personifications of developmental positions; embodiment of a stage's worldview is a
  known perspective-taking catalyst (11, 23).

---

## 3. Game-design mapping

### 3.1 The council as the game's cast

The sub-agent council IS the dramatis personae of Mysterium. The player never sees
"an LLM" — they meet characters: the Mentor who prescribes, the Mirror that tests,
the Threshold Guardian who walks them into a stage's world, the Healer who sits with
them in shadow-work. Each agent has a voice, a stance, and a *visual/narrative identity*
consistent across surfaces (CLI, WebUI, mobile).

### 3.2 The orchestration metaphor: the Significator's inner court

Canonically, the primary orchestrator is the **Significator's steward** — the part of
the psyche that coordinates the specialists. This is not decoration: it explains why the
player experiences continuity. The orchestrator is the *same* steward across sessions,
whose memory is the Significator itself; the council members are called into the
foreground as the journey requires.

### 3.3 Sub-agent presence is a pacing instrument

The orchestrator decides not only *who* acts but *when the player meets them* —
council presence is part of session strategy (27): a therapy arc opens with the Healer
present; a study session opens with the Teacher; a transformation threshold summons the
whole council. Presence scheduling is deterministic given strategy (kernel-testable).

### 3.4 Veil compliance across the council

No council member ever tells the player "your Interpersonal line measured 0.42." Each
speaks in-world: the Mirror shows a reflection; the Healer speaks of what feels heavy;
the Teacher says "this foundation wants more time." The *measurement* layer (depths,
thetas, CCI) is orchestrator-private, deliverable to the player only as felt-sense
gestures (QualitativeFeedback precedent) and explicitly only through dashboard views
that opt in (33).

---

## 4. Architectural contract

### 4.0 Where this contract runs (execution reality)

There are two runtimes in the repo, and the contract binds both:

- **CLI runtime** — `scripts/cli-game.ts` drives `src/core/assessments/AgenticOrchestrator.ts`
  (the existing in-process orchestrator with its 13-tool loop) **plus** the local agent
  harness (`scripts/agents/*.md` + `agent.lua` conventions): spawnable sub-agent sessions
  with their own context windows, transcript files, and completion signals.
- **WebUI runtime** — SvelteKit BFF endpoints under `src/routes/api/` (`api/agent/*`,
  `api/llm/*`): stateless tool-calling proxies today. The sub-agent session store
  (§6.3) is the server-side state that turns these into true delegated sessions.
  On Cloudflare Pages, long-running sub-agent work lands in a queued background
  invocation (Durable Object per pod precedent, 38) — the client polls or subscribes.

The *contract* (§4.2–§4.7) is runtime-neutral; the *bindings* above are where it
physically executes.

### 4.1 Topology: one primary, one council, strict tree

```
                        ┌────────────────────────────┐
                        │   PRIMARY ORCHESTRATOR      │
                        │  (the Significator's        │
                        │   steward; sole owner of    │
                        │   session strategy, 27)     │
                        └──────────┬─────────────────┘
                 delegates ↓       │        ↑ results + logs
        ┌──────────┬───────────┬──┴────────┬──────────────┐
        │          │           │           │              │
   ┌────┴────┐ ┌───┴────┐ ┌────┴───┐ ┌─────┴─────┐ ┌──────┴─────┐
   │ TEACHER │ │ASSESSOR│ │JOURNEY │ │ THERAPIST │ │ SPECIALISTS │
   │ council │ │ council│ │ GUIDES │ │  (1, arc- │ │ (packs,     │
   │ (T1–T3) │ │ (A1–A4)│ │(J1–J8+)│ │  bound)   │ │ data, ops)  │
   └─────────┘ └────────┘ └────────┘ └───────────┘ └────────────┘
        │            │          │           │              │
      teach       assess     embody      hold the       measure the
    /revise/     /review/    a line×     shadow; the    measurable;
    /prescribe   /test/      stage world arc has one     operate the
                             (J1–J64)    therapist      infrastructure
```

**Laws of the tree:**

- **L1 — Single active foreground.** Exactly one agent holds the player's foreground at
  a time. The orchestrator never holds the foreground while a sub-agent is active.
- **L2 — No peer conversation in front of the player.** Sub-agents do not talk to each
  other in the foreground. Coordination happens through the orchestrator reading logs
  and issuing new delegations (the player may *see* the council assembled, but the
  conversation is always with one agent).
- **L3 — Strict tree, no skip-level.** Sub-agents never re-delegate the foreground.
  (Sub-agents may call *tools* freely — including other engines — but never spawn
  foreground agents. This keeps the topology a tree and the accountability total.)
- **L4 — The orchestrator owns all state transitions.** Only the orchestrator applies
  consequences to the Significator (`processOutcome`/`applyConsequences`). Sub-agents
  receive **read-only projections** of engine state and return **proposals**; the
  orchestrator validates and commits (§4.7). This is the single-writer principle that
  makes the kernel gates (G1–G12) still meaningful.

### 4.2 The sub-agent taxonomy (the council)

Two axes classify every sub-agent: **function** (teach / assess / embody / heal /
measure / operate) and **scope** (line×stage-bounded or journey-wide).

**The Teacher council** — teach / revise / prescribe:

| ID | Agent | Scope | Foreground behavior | Returns to orchestrator |
|---|---|---|---|---|
| T1 | **Tutor** | one syllabus concept | Socratic explanation, worked examples, misconception repair | mastery evidence + proposed next concept |
| T2 | **Revision Coach** | a forgotten band (retention decay, 34 §3.3) | retrieval practice, spaced review | revised retention estimates + what still decays |
| T3 | **Prescriber** | the whole trajectory | translates needs (DevelopmentalNeedsDetector) into a study plan | proposed trajectory (prescription) for orchestrator ratification |

**The Assessor council** — assess / review / test / validate:

| ID | Agent | Scope | Foreground behavior | Returns |
|---|---|---|---|---|
| A1 | **Examiner** | one concept or line×stage | staircase-probed testing (08) in-game | depth-level evidence per concept (31) |
| A2 | **Reviewer** | reflection corpus | journal review synthesis (39 `review_practice`) | qualitative narrative + signals (Veil-safe) |
| A3 | **Validator** | pack/certification claims | administers explicit measurement-pack instruments (40) | scored results + reliability status |
| A4 | **Calibrator** | difficulty placement | the adaptive staircase placement probe | placement parameters for the engine |

**The Journey-Guide council** — line/stage-specific embodiment (64 cells + stage-band
guides). Each J-agent is the personification of one **line × stage cell** — the world's
inhabitants for that cell (concept-drafts' module voice). Their jobs, per the user's
enumeration:

| ID | Agent class | Foreground behavior | Returns |
|---|---|---|---|
| J1 | **Journey-Guide (game)** | runs a developmental **journey-game**: the module's 7 modality encounters, in-world | encounter records → orchestrator commits via processOutcome |
| J2 | **Journey-Guide (test)** | runs a **developmental-test**: a bounded assessment arc dressed as an ordeal | measurement records |
| J3 | **Journey-Guide (diagnosis)** | runs a **developmental-diagnosis**: implicit probing for a suspected shadow/drive imbalance | surfacing evidence; proposes shadow entries (orchestrator commits) |
| J4 | **Journey-Guide (therapy)** | runs a **developmental-therapy**: guided shadow-work on an actual ledger entry | resolution evidence per the implicit-integration rule (14) |
| J5 | **Journey-Guide (guidance)** | delivers **evolutionary guidance**: the macro-view conversation at thresholds (transformation proximity, 17) | readiness narrative; threshold counsel |

*J-agents are many (one per cell), but they share one implementation contract: they are
stateless persona lenses over the same encounter engine; their "identity" is a
(voice, world, stance) triple from the concept-drafts and polarity ontology (23).*

**The Therapist** — one per player at any time (the arc has one therapist):

- Holds the **therapeutic frame** across sessions: references the shared shadow ledger,
  tracks its own arc notes in the session log, never breaks the Veil.
- The only agent permitted to *propose* shadow-work sessions (J4 delegation) and
  safety-routed (§4.7): crisis patterns bypass everything and surface the safety layer.

**The Specialist council** — everything else the UX needs:

| ID | Agent | Scope | Purpose |
|---|---|---|---|
| S1 | **Pack Agents** | per measurement pack (40) | administer domain instruments (coding, language, memory…), score to pack harness |
| S2 | **Context Steward** | the profiling/context domain | **the profile-management and context-acquisition agent**: runs consent-first identity collection (16 §2.1), curates the HealingContext projector inputs, and assembles the *alignment context* for curriculum alignment — the domain-of-context getter |
| S3 | **Curriculum Aligner** | syllabus ↔ engine alignment | consumes the AlignmentContext (S2's output), proposes curriculum-side adjustments (concept sequencing, study themes 34 §3.6); never touches measurement |
| S4 | **Data Warden** | privacy/consent surface | executes consent grants/withdrawals (16 §2.1), answers "what do you know about me", runs the privacy CLI/UX surface |
| S5 | **Ops Agent** | infrastructure | health of packs/registry/seeding; benchmark runs; CI-tail reporting (validation kernel, docs/validation) |

S2 and S3 jointly implement the user's requirement that *profile management and
domain-of-context acquisition — including curriculum alignment context — are agentically
orchestrated*: no screen edits a profile directly; the Context Steward conducts it.

### 4.3 The tool systems

Tool surfaces are **per-agent, minimal, and enumerable**. The orchestrator's loop keeps
the existing 13 unified tools; each sub-agent gets only what its role requires.

**Core-loop toolset (primary orchestrator):**

| Class | Tools (existing unless noted) |
|---|---|
| State read | `get_full_profile`, `get_knowledge_snapshot`, `get_unified_profile` |
| Action | `recommend_workout`, `recommend_trajectory`, `study_concept`, `set_difficulty_override` |
| Detection | `detect_shadow_signals` |
| Orchestration (NEW) | `delegate_session` (§6), `read_session_log`, `analyze_session_logs`, `ratify_proposal`, `schedule_presence` (§3.3), `receive_auditor_request` (2026-09-17: accepts auditor proposals from the 16 §2.4/§10.4 projection layer surfaced by 33 §7's dashboards, and converts them to ordinary DelegationSpecs — auditors (guardians) propose through the same ratification laws as the council, 16 AP5; they never receive write tools, and TL2 applies with full force: auditor reads are the SAME purpose-scoped AuditorProjections as the dashboards, no new data surface) |
| Commit | `process_outcome` (the single-writer edge, L4) |

**Sub-loop toolsets (per council):**

| Council | Tools |
|---|---|
| Teacher | `get_concept` (read-only), `get_prereq_gaps` (reads the 31 §3.5a depth-closure computation — unsatisfied DEPTH edges, not mere existence), `propose_mastery_evidence`, `propose_trajectory` (T3) |
| Assessor | `get_staircase_state`, `submit_depth_evidence`, `submit_retention_estimate`, `flag_anomaly` |
| Journey-Guide | `get_module_spec` (concept-draft, read-only), `get_polarity_texture` (23), `record_encounter`, `propose_shadow_entry`, `report_threshold_signal` |
| Therapist | `get_shadow_ledger` (read-only projection), `propose_shadow_work`, `route_to_safety`, `note_arc` |
| Specialist | `read_identity_consent` (S4), `propose_alignment_adjustment` (S3), `pack_administer`/`pack_score` (S1), `run_benchmark_tier` (S5) |

**Tool-system laws:**

- **TL1 — Proposals are not effects.** Every sub-agent tool that would change state is a
  `propose_*` tool returning a proposal object; the orchestrator's ratification is the
  only commit path. (Engines remain deterministic; agents remain advisory.)
- **TL2 — Read projections are purpose-scoped.** A sub-agent's read tools return
  projections, not raw state: the Teacher sees curriculum state, not the shadow ledger;
  the Therapist sees the ledger, not retention curves. This is the same
  purpose-binding discipline as HealingContext (16 §2.1), applied to agents.
- **TL3 — Tool budgets are enforced per session.** Each delegation carries a maximum
  tool-call budget and a wall-clock/virtual-clock bound; exceeding it ends the session
  with `budget_exhausted` (a normal, loggable outcome).

### 4.4 The session-log protocol

Every sub-agent session produces a **SessionLog** — append-only, structured, and the
contractual basis of background orchestration:

```jsonc
{
  "sessionId": "uuid",
  "delegationId": "uuid",           // links to the orchestrator's delegation record
  "agentRole": "J4",                // council + role id
  "cell": { "line": "emotional", "stage": 4 },   // for cell-bounded agents
  "startedAtMs": 0, "endedAtMs": 0, // virtual clock (harness-consistent)
  "foreground": true,               // this session held the player
  "transcript": [ { "t": 0, "who": "agent"|"player"|"system", "text": "..." } ],
  "toolCalls": [ { "t": 0, "tool": "propose_shadow_entry", "argsHash": "...", "ok": true } ],
  "proposals": [ /* every proposal object emitted */ ],
  "signals": {                      // the eager-reading layer (§5.1)
    "veilRisk": 0.0,                // rubric-estimated clinical/measurement leakage
    "distressSignal": 0.0,          // crisis-pattern detector output
    "frustrationSignal": 0.0,       // flow-protection trigger (09)
    "progressDelta": 0.0,           // role-appropriate progress estimate
    "consentEvents": []             // any consent grants/withdrawals executed
  },
  "budget": { "toolCallsUsed": 0, "toolCallsMax": 0, "endedBy": "completion"|"budget_exhausted"|"handoff"|"safety" }
}
```

**Log laws:**

- **LL1 — Transcripts are consent-bound.** Transcript text may include player words;
  persistence follows the journal rule (39): reflections stay client-side unless the
  journal-consent covers them; aggregate signals always flow.
- **LL2 — Summaries are cheap, raw is expensive.** `signals` is designed for eager
  reading on every delegation; full transcript/tool-call analysis is opt-in when
  signals warrant (§5.2).
- **LL3 — Logs are replayable.** Given the log's tool calls and a fixed engine state,
  the session is reproducible offline (determinism gate G1 must stay green through the
  orchestration layer).

### 4.5 Foreground/background mechanics

- The player converses with the **foreground agent**. Input routing is a transport
  detail (CLI prompt, WebUI channel); the contract is that input goes to exactly one
  agent — the foreground holder.
- The orchestrator is **suspended** during foreground tenure except for its
  log-reading loop: on each tool-call or message boundary it may read appended log
  entries (LL2), update its delegation record, and prepare the next decision. It does
  not emit player-visible text.
- **Handoff events** (the only ways the foreground changes):
  1. `completion` — sub-agent finished its mandate (normal return, §6.2).
  2. `handoff` — the sub-agent explicitly requests a handoff (e.g., Tutor detects
     distress → requests Therapist foreground).
  3. `safety` — the crisis detector (any agent can call `route_to_safety`) preempts
     everything; the safety layer takes the foreground (existing safety architecture),
     and the orchestrator is notified through the log's `distressSignal`.
  4. `budget_exhausted` — §4.3 TL3; the orchestrator re-plans.
  5. `recalled` — the orchestrator recalls the foreground (rare; logged with reason).

### 4.6 Delegation lifecycle

```
orchestrator: plan (27) → needs a surface → choose role+cell (§4.2)
  → build DelegationSpec (purpose-scoped read projection + toolset + budget + HealingContext)
  → delegate_session(spec)          [foreground yields]
       sub-agent: runs its loop (tools + conversation), writes SessionLog
  → foreground returns (one of §4.5's five events)
orchestrator: read log → eager signals → (if warranted) analyze_session_logs (deep pass, §5.2)
  → ratify/commit proposals (L4) → re-plan → next delegation
```

### 4.7 Safety and consent boundaries of delegation

- **Safety is un-delegatable.** `route_to_safety` is available to every agent; the
  safety layer is outside the council (existing architecture) and preempts (§4.5.3).
- **Human-handoff flows are DEFERRED (2026-09-17).** The crisis layer stays
deterministic and local (offline-safe pattern scan, one definition consumed by the
practice loop and orchestration distressSignal). What is explicitly deferred: external
escalation contacts, localized/multilingual crisis patterns, live human handoff
protocols, and adverse-event surfaces. Stage-development, evolution, and healing —
profiling-diagnostics plus the validated agentic loop (12 §5.4) — take build priority.
`route_to_safety`'s contract is unaffected: it halts catalyst and holds a safe state;
it simply does not yet dial a human. Ownership stays here; no other document may claim it.
- **Consent is un-delegatable in the granting direction.** Only the S4 Data Warden may
  *execute* consent changes, and only with the player's direct action; other agents may
  only *inform* the player about consent. Auditor linkage extends this: for adult
  players, the auditor-grant is the player's own consent action; for young players,
  the guardian IS the consent-holder-of-record (and the player's own assent is
  additionally required where applicable). Both routes run through the same consent
  ledger (16 §2.4) and both are revocable at every render (AP4).

  <br>**DEFERRED to the 38-era (2026-09-17):** minor-guardianship product design —
  identity attestation, custody-of-consent surfaces, age-assurance mechanics, and
  supervised-pod integration (38 §4.5). Until the mechanism exists, the auditor layer
  (16 §2.4/§10.4, 33 §7) serves DOCUMENTED-GUARDIAN consent flows only; this is a
  product-surface deferral, not an architectural dependency of the consent model.
- **Auditor requests are un-delegatable in the same direction.** The auditor liaison's
  `receive_auditor_request` converts guardian proposals into DelegationSpecs (16 AP5);
  no auditor, and no council member acting for an auditor, may write profile state
  directly.
- **The competence/identity firewall holds across agents.** No agent in the measurement
  path (A-council, J2, J3, packs) receives HealingContext inputs; no agent in the
  healing path receives measurement outputs as player-visible content (42 §1.1). The
  G12 kernel gate extends to the orchestration layer.
- **Veil is enforced at ratification.** The orchestrator checks proposals for
  measurement leakage before commit (the `veilRisk` signal is advisory; the check is
  deterministic — QualitativeFeedback mapping).

---

## 5. The orchestrator's log-use doctrine

### 5.1 Eager reading (every delegation)

On return, the orchestrator reads `signals` (cheap, structured):
- `distressSignal > θ_d` → safety review, consider Therapist foreground next.
- `frustrationSignal > θ_f` → flow protection (09): recall or difficulty recalibration (A4 delegation).
- `veilRisk > θ_v` → audit the transcript before committing; reject leaking proposals.
- `progressDelta` feeds the strategy engine (27) as the delegation's observed outcome.

### 5.2 Deep analysis (on warrant)

`analyze_session_logs(delegationIds)` runs log-analysis tooling over full
transcripts/tool-calls when:
- signals cross thresholds, or
- the same role/cell produced anomalous results across sessions (e.g., a J-cell where
  every player stalls → possible corpus defect, feeds S5 Ops and the concept-draft
  feedback loop), or
- the player's trajectory diverges from the strategy's expectation materially.

Deep analysis produces an **OrchestratorInsight** (structured): suspected causes,
evidence excerpts, recommended plan deltas. Insights are themselves logged (the
orchestrator's own loop is also logged — it has a SessionLog with
`foreground: false`).

### 5.3 Cross-session pattern memory

The orchestrator maintains a **delegation ledger** (persisted alongside the
Significator): every delegation ever issued, its outcome class, and its signal
summary. Long-horizon patterns ("therapy arcs stall at week 3 under this cell's J4")
are the raw material for strategy evolution (27 §6) and for the validation kernel's
behavioral gates.

---

## 6. The delegation contract (types)

The kernel-of-record for this document is a small type contract (implementation §8):

```ts
interface DelegationSpec {
  role: AgentRole;                     // 'T1'|'T2'|'T3'|'A1'|'A2'|'A3'|'A4'|'J1'..'J5'|'therapist'|'S1'..'S5'
  cell?: { line: Line; stage: Stage };
  purpose: string;                     // the mandate, in the orchestrator's words
  readProjection: ReadonlySet<string>; // purpose-scoped state keys (TL2)
  toolset: ReadonlySet<ToolName>;
  budget: { toolCallsMax: number; virtualMsMax: number };
  healingContext?: HealingContext;     // only for healing-path agents (firewall)
}

interface DelegationResult {
  outcome: 'completion' | 'handoff' | 'safety' | 'budget_exhausted' | 'recalled';
  proposals: readonly Proposal[];      // TL1: nothing else can change state
  signals: SessionSignals;
  logRef: LogRef;                      // pointer into the append-only log store
}

interface Proposal {
  kind: 'mastery_evidence' | 'shadow_entry' | 'trajectory' | 'retention_estimate'
      | 'alignment_adjustment' | 'encounter_record' | 'threshold_signal' | 'consent_inform';
  payload: unknown;                    // validated per kind at ratification
  rationale: string;
}
```

---

## 7. Open questions

1. **Voice continuity across cell agents:** do J1–J3 for the same cell share one voice
   with different stances, or are they distinct personae? (Leans shared-voice; needs
   narrative-design confirmation against concept-drafts.)
2. **Parallel background sessions:** the contract says one foreground; may *non-foreground*
   specialist sessions (S1 packs, S5 ops) run concurrently? (Leans yes with a
   concurrency cap; must not double-write the delegation ledger.)
3. **Orchestrator model tiering:** does the steward run on a stronger model than council
   agents? Cost/latency policy is an open product decision.
4. **Log retention horizon:** how long do raw transcripts persist client-side before
   compaction to signals-only? (Ties to 39's retention question and GDPR minimization.)
5. **Council presence in cohort rituals (38):** does a pod share witnessing agents?
   Deferred to 38's M2+ phases.

## 8. Principles served

- **Assessment-in-novelty, Veil-first:** the council measures through world experience,
  never clinical disclosure (20, 26); ratification-time Veil checks make it structural.
- **The holon is never outgrown:** the delegation ledger + log analysis give the
  orchestrator the long memory that shadow-mode maintenance (26) requires.
- **Self-contained and all-inclusive:** every surface a player touches is a delegated
  mandate — nothing exists outside an agent's responsibility.
- **Checkpoint-model continuity:** delegation is resumable by construction — specs and
  logs are serializable; a session can end anywhere and the orchestrator re-plans from
  the ledger.
- **Single-writer integrity:** all state transitions remain orchestrator-committed and
  engine-computed; the kernel gates (G1–G12) remain valid through the orchestration
  layer.
- **Agentic mediation:** profile, context, curriculum alignment, teaching, assessment,
  and therapy are all conducted by specialized agents — the UX is a court, not a menu.

---

## Appendix A — Implementation precedents and anchoring (repo reality)

- `src/core/assessments/AgenticOrchestrator.ts` — the existing in-process orchestrator
  (13-tool loop, context assembly, ConsequenceParser, QualitativeFeedback): the
  seed of the primary orchestrator; gains `delegate_session`/log tooling per §4.3.
- `src/routes/api/agent/{observe,probe}` + `src/routes/api/llm/{chat,tools}` — the BFF
  surface the WebUI-side session store and sub-agent runner hang off.
- `scripts/agents/*.md` + local agent harness conventions — spawnable sub-agent
  sessions with transcripts; the CLI-side precedent for foreground/background runs.
- `src/core/curriculum/MetaCognitiveProbe.ts`, `LearningAnalytics.ts`,
  `DevelopmentalNeedsDetector.ts` — engines the Teacher/Assessor councils read via
  projections and whose outputs their proposals feed.
- `src/core/healing/HealingContext.ts` — the purpose-bound context projector (16 §2.1);
  the only identity-context source permitted in DelegationSpecs.
- `docs/agentic-loop/02-system-architecture-audit-2026-08-28.md` — the audit that
  established the current loop; doc 43 supersedes its *topology* recommendations,
  not its engine-level findings.
- Validation kernel gates (G1–G12) — extend to orchestration via the
  determinism-of-delegation and firewall-of-toolsets checks (§5.3, §4.7).

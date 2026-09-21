# 38 — Cohort Weave: Multiplayer & Collaborative Expansion

> **Status:** canonical-hypothesis (architecture; MVP scope fenced hard below).
> **Lateral:** the SOCIAL layer of Mysterium — cohort pods, collaborative catalyst, and
> recognition signals — as the *minimum* multiplayer sufficient for social induction,
> with an explicit anti-over-engineering fence. This document owns only: pod mechanics,
> shared-ritual encounter modes, the recognition system that replaces vanity leaderboards,
> and the server-side coordination contract. Real-world practice and its social witness
> are owned by 39 (which *consumes* pods for social-induction); legal/privacy substrate
> is owned by 41.
> **Satisfied by:** `src/core/pods/podStateMachine.ts` (the pod lifecycle and its ritual stages) · `src/infra/pods/PodTransport.ts` (the transport)

## 1. Purpose

Development is relational. Vygotsky placed learning in the social field; the Law of One
places 4th-density positive work in the **social memory complex** — a group whose members
remain individual while thinking/feeling as one. Mysterium's engine today is single-player:
the Great Way's collective holons (18) are simulated, not lived.

The Cohort Weave adds the smallest real-social structure that changes the developmental
math: the **pod** — 3–9 mutually-invited players who share rituals, witness each other's
practice, and recognize each other's growth. The user's over-engineering concern is
correct and is answered structurally below (§1.1), not rhetorically.

### 1.1 The scope fence (the anti-over-engineering contract)

| IN the MVP (M0–M1) | Deferred (M2+, only on evidence) | NOT in this architecture |
|---|---|---|
| Invite-only pods (3–9 members) | Inter-pod weave challenges | Public feeds, follows, DMs |
| Shared ritual encounters | Cross-pod seasonal events | Content-creator economy |
| Practice witness signals (39) | Mentor/mentee pairing | Voice / video chat |
| Privacy-safe recognition signals | Cohort-aware scheduler slots | Global public leaderboards (never) |
| Pod-internal, opt-in recognition | | Free-text pod chat (see §4.4) |

The third column is a *design refusal*, not a roadmap. Social-media mechanics optimize
for engagement-through-comparison — the exact inverse of the Veil's psychology (20) and
of §5.7's "addictive through felt-sense of growth, not dopamine manipulation." If a
feature would rank persons instead of honoring practice, it is out.

## 2. Scientific basis

- **Vygotsky / social constructionism.** Higher functions appear twice — between people
  before within one. A pod is a deliberate ZPD extension: pod members can hold Potentiator
  depth (13) that an individual cannot yet self-generate.
- **Commitment & accountability effects.** Public commitment devices and progress
  witnesses measurably increase follow-through; this is the mechanism 39's social-induction
  consumes. Note the *consent* qualifier — coerced accountability is compliance, the
  thing 37 §2.3 rejected.
- **Cooperative learning (Johnson & Johnson).** Positive interdependence + individual
  accountability outperform both competition and mere co-presence. This shapes ritual
  role design (§3.2): every member has an irreplaceable role.
- **Social-comparison hazards.** Upward comparison degrades self-assessment and triggers
  fixed-mindset responses. This is why recognition (§3.3) is built on *growth deltas and
  practice consistency*, never absolute standings, and why nothing public is derivable
  into a rank-of-persons.
- **Self-Determination Theory.** Relatedness is a basic need the single-player loop
  undersupplies; pods supply it without sacrificing autonomy (invite-only, opt-in
  recognition, no obligation ladders).
- **Law of One canon.** The social memory complex is the 4th-density-positive analogue
  of the pod: unity without self-erasure. STO polarity (19) becomes empirically probeable
  in pods: service actions in shared rituals register real polarity weight in a real
  social field — the smallest ecological STO/STS probe the engine can run.

## 3. Game-design mapping

### 3.1 The pod is a holon

A pod has its own Matrix (shared intention), Potentiator (collective depth the individual
cannot reach), and its own contact boundary (covenant — §4.1). Group encounters are
*group-catalyst*: processed collectively, integrated individually. No shared CCI — each
Significator remains sovereign; the pod's "state" is only the event stream (§4.3).

### 3.2 Three multiplayer encounter modes (mapped to the 7 modalities)

1. **Mirrored parallel** — all members receive the same catalyst simultaneously; each
   processes it alone in-session; then a short shared integration beat (each member's
   qualitative reflection, Veil-compliant). Lowest sync requirement; works for every
   modality; the M0 default.
2. **Collaborative ritual** — complementary roles in one encounter (native to the ritual
   modality; role design follows positive interdependence: the encounter *cannot*
   complete without each role's contribution). M1.
3. **Assistive Potentiator** — one member works an active shadow knot while pod members
   hold witness roles (healing modality). Strictly consent-gated by the worker per
   encounter; witnesses see only the public surface of the working, never the ledger.
   M1, heal/evolve vector only.

### 3.3 Recognition instead of leaderboards

The leaderboard pattern is replaced by **Recognition of Practice** — bounded, opt-in,
cohort-internal, season-scoped:

| Signal kind | Derived from | Why it's safe |
|---|---|---|
| Consistency | sessions held per period (§5.7 checkpoint model) | honors showing up, not beating others |
| Growth | CCI-delta over the period (only with explicit consent) | ranks trajectories, never persons |
| Service | ritual roles held, assistive witnessings, STO-weighted actions (19) | makes STO practice visible |

Recipients receive a recognition *event* (private to the pod), never a public rank.
No global aggregation exists anywhere in the data model (§4.3) — that's the structural
guarantee, not a policy.

## 4. Architectural contract

### 4.1 Domain model (sketch)

```ts
interface CohortPod {
  readonly id: string;
  readonly members: readonly PodMember[];      // ≤ 9
  readonly covenant: string;                   // player-authored shared intention
  readonly createdAtMs: number;
  readonly seasonId?: string;                  // present once M2 seasons exist
}
interface PodMember { readonly playerId: string; readonly joinedAtMs: number; readonly roles: readonly string[]; }

interface WeaveEvent {
  readonly id: string;
  readonly podId: string;
  readonly type: 'ritual-started' | 'ritual-completed' | 'recognition' | 'objective-witnessed';
  readonly payload: unknown;                   // mode-specific; never raw Significator data
  readonly occurredAtMs: number;               // client clock + server receive order (§4.2)
}
interface RecognitionSignal {
  readonly fromMemberId: string;               // always peer-issued or system-derived, never self-scored
  readonly toMemberId: string;
  readonly kind: 'consistency' | 'growth' | 'service';
  readonly periodId: string;
  readonly evidenceRef: string;                // pointer to a DERIVED aggregate, never to profile internals
}
interface SharedRitualSession {
  readonly podId: string;
  readonly encounterTemplateId: string;
  readonly mode: 'mirrored' | 'collaborative' | 'assistive';
  readonly roles: Readonly<Record<string, string>>;   // memberId → roleId
  readonly state: 'gathering' | 'catalyst' | 'integration' | 'closed';
}
```

### 4.2 Transport & topology

- **Local-first stays authoritative.** Each player's Significator lives where it lives
  today (localStorage / mysteriumDir, 07). The server is a *coordinator*, never a store
  of personal psych state.
- **M1 transport: one Cloudflare Durable Object per pod.** A pod is a naturally
  single-actor state machine (small member set, event serialization, gather-and-go
  membership) — DO gives strongly-consistent event application and WebSocket hibernation.
  This is an additive `wrangler.toml` binding next to the existing KV namespaces; no
  migration of existing endpoints.
- **M0 fallback (if DO cost/complexity is unwanted at first):** KV + client polling with
  last-write-wins on monotonic events. Acceptable for mirrored mode only; collaborative
  and assistive modes require the DO.
- **Offline-first reconciliation:** events carry `occurredAtMs` + server receive order;
  the pod object applies events serially; clients reconcile on reconnect by replaying
  the pod event log. Personal-only work (single-player sessions) never blocks on pod
  connectivity.

### 4.3 Sync discipline (the privacy load-bearing wall)

The server persists **only**: pod roster/metadata, ritual session state, weave events,
and derived recognition aggregates that a member explicitly published. It never receives
a Significator, a shadow ledger, a theta vector, or journal content (39). A "growth"
recognition is published as a period delta the player explicitly consented to — the
underlying CCI dimensions never leave the client.

### 4.4 Why no free-text chat in M0–M1

Pod communication happens through structured ritual responses, recognition events, and
pre-authored emotes. Free-text chat is: (a) the entire moderation surface, (b) an
LLM-content-liability magnet, (c) unnecessary for the developmental mechanics. Pods that
want to talk can — anywhere else (they invited each other). The weave supplies *structured*
sociality. Chat is deferred to M2+ only with a full moderation + minors policy (41 §3).

### 4.5 Minors & supervised pods (hook, not implementation)

K-12 learners (37) need pod shapes compatible with school/guardian contexts: teacher- or
guardian-created supervised pods, no invite chains by minors, recognition-only (no
assistive mode without guardian opt-in). Legal ownership: 41; this doc records the
product hooks: `CohortPod.supervision?: { kind: 'guardian' | 'classroom', supervisorMemberId }`.

### 4.6 Orchestrator integration (deferred, on evidence)

M0–M1 rituals are player-initiated. Only after 40's evidence chain shows cohort presence
improving retention/consistency does the AutoModeStrategy (27) gain cohort-aware slot
scheduling (e.g., proposing a ritual beat when pod quorum is live). Never before evidence.

## 5. Phases

| Phase | Contents | Acceptance |
|---|---|---|
| **M0 (2–3 wks)** | Pod formation (invite codes), mirrored rituals (KV/poll), structured responses + emotes | two pods complete mirrored rituals across networks; personal-only play unaffected offline |
| **M1 (3–4 wks)** | Durable Objects; collaborative + assistive modes; recognition signals; supervised-pod shape | role-independence test (ritual cannot complete without each role); recognition leaks nothing beyond published aggregates (validation harness asserts) |
| **M2 (evidence-gated)** | Inter-pod weave challenges; cohort-aware scheduler slots; (chat, if ever) full moderation+minors stack | 40-style cohort A/B shows retention/consistency uplift ≥ threshold before scheduler integration lands |

## 6. Open questions

1. DO cost model at thousands of pods — when does KV+poll win back?
2. Should pods decay? (Holonic integrity suggests neglected pods age out rather than
   linger as dead identity — what is the pod analogue of theta-decay?)
3. Timestamp trust without central identity (client clocks lie): is server-receive
   ordering sufficient for all M0–M2 event semantics?
4. Does assistive mode need an LLM facilitator, and if so, how does it stay Veil-compliant
   while speaking into a shared ritual space?
5. What is the pod's relationship to 18's simulated collective holons — do real pods
   *instantiate* Great-Way holons, replacing simulation with lived counterparts?

## 7. Principles served

- **Uniqueness:** owns the real-social layer; 18 stays the simulated-collective lateral;
  39 consumes pods for practice witness; 41 owns the legal substrate.
- **STO/STS (19):** pods are the first ecological field where service-vs-control social
  dynamics carry real polarity weight.
- **Veil (20):** recognition signals are derived, consented, and qualitative — no ranks,
  no psych exposure, no comparison-identity.
- **Infinite checkpoint (§5.7):** rituals are checkpointed like everything else; a member
  can leave mid-ritual without punishing the pod (integration beat records partials).
- **Heal/Evolve vectors (§5.3):** assistive mode is explicitly the heal/evolve vector
  made social; mirrored/collaborative modes carry evolve/heal breadth.

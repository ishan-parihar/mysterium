# 39 — Action Induction & the Journal System

> **Cross-references:** [[docs/validation/BENCHMARK-ARCHITECTURE|Validation Benchmark Architecture]]
> **Status:** canonical-hypothesis (architecture; builds on existing `Vow` machinery).
> **Lateral:** the bridge between the virtual game and the player's actual life —
> real-world practice objectives ("homework-like" without homework's coercion), their
> journal-level reflection check-ins, and the induction mechanisms (action-induction,
> social-induction) that make real life itself a catalyst stream. This document owns:
> the objective lifecycle, the reflection protocol and its rubric, the journal data
> model, and the **agent toolset** through which orchestrator agents run this loop.
> It does NOT own pods (38 consumes it for witness), measurement-pack reliability (40),
> or legal/credential surfaces (41).
>
> **Orchestration note (43):** the four practice tools (`propose_objective`,
> `process_checkin`, `review_practice`, `witness_objective`) are held by named agents in
> the 43 council: `propose_objective`/`process_checkin` by the Teacher council,
> `review_practice` by the Reviewer (A2), `witness_objective` via the pod surface. The
> Reviewer's synthesis is a delegated mandate returning a Veil-safe narrative, not an
> orchestrator-side function call.

## 1. Purpose

Mysterium's catalyst is currently delivered *inside the game*. But the ShadowEntry
resolved in a ritual only matters if life changes — the contact boundary (13) faces the
world, not the screen. This document mechanises the return trip: the engine proposes
**real-world practice objectives** calibrated to the Significator's state; the player
attempts them in life; a **journal reflection** closes the loop; the reflection is
scored for depth and fed back as *real-world catalyst evidence*, updating drives,
shadows, and polarity exactly as an in-game encounter would.

Two induction mechanisms are served:

- **Action-induction:** converting insight into committed action (the Willpower/Somatic
  bridge — the lines most underserved by purely symbolic games).
- **Social-induction:** making the action *witnessed* through the cohort pod (38),
  converting private resolve into socially-held practice.

The existing substrate is real and is the starting point: the Significator already
carries `Vow { text, createdAtMs, fulfilled }` (SharedTypes), surfaced read-only in
`/journal`. This document upgrades that seed into a full practice loop.

### 1.1 The homework distinction (explicit design commitment)

This is *not* homework. Homework is externally-assigned, deadline-punished, and
compliance-shaped — the obedience pipeline 37 §2.3 rejects. Objectives here are:
player-accepted (never auto-imposed), checkpoint-based (no deadlines), Veil-compliant
(no grades on your life), and *lapses are material, not moral failure* — a lapsed
objective is diagnostic data (avoidance signal → 10) that re-routes the scheduler,
never a red mark.

## 2. Scientific basis

- **Implementation intentions (Gollwitzer).** "When situation X, I will do Y" formats
  roughly double follow-through versus goal intentions. Objectives are therefore
  authored in if-then situational form; the generator produces them, and the check-in
  asks "did the situation arise?"
- **Behavioral activation.** Scheduled, valued activity is a first-line intervention
  for avoidance/withdrawal patterns; the objective system is behavioral activation
  gated by developmental state rather than by diagnosis.
- **Exposure hierarchies.** Shadow-work (10/17) generates avoidance targets; objectives
  can operationalise graduated real-world approach to avoided material (the heal/evolve
  vector §5.3 made behavioral). Difficulty is staircase-controlled (08) — approach
  steps start at the low end.
- **Self-concordance.** Goals autonomously chosen and intrinsically motivated are
  pursued more persistently and predict well-being gains. Hence: player-acceptance
  gates, and objectives are phrased from the player's own values/vows, not from a
  system rubric of virtue.
- **Expressive writing (Pennebaker).** Structured emotional writing about experience
  produces measurable health and cognitive gains; the journal is a therapeutic
  mechanism, not merely a progress log. Prompts follow the disclosure literature
  (facts + felt-sense + meaning), never surveillance.
- **Commitment & consistency + public witness.** Stated commitments, especially before
  witnesses, increase follow-through (the social-induction mechanism; consent-gated
  per 38 §2).
- **Reflection depth scales (31).** The depth spectrum from surface recall to
  transformative reflection is the rubric axis: a check-in is scored for the *depth of
  processing* evident in the reflection, not for positivity, length theater, or
  compliance.
- **Precaution — reward hacking.** Self-reported practice + LLM-scored reflection is a
  Goodhart surface. §3.3's rubric is designed to score *processing quality*, which is
  harder to fake than claimed outcomes, and §4.5 treats reflection-plausibility
  divergence as a signal (never as an accusation — the Veil holds here too).

## 3. Game-design mapping

### 3.1 Objective taxonomy (four kinds, each probing a real axis)

| Kind | Probes / feeds | Example shape | Line affinity |
|---|---|---|---|
| **Practice vow** | consistency → theta maintenance, Willpower | "When you finish work tomorrow, 10 minutes of the breath practice you learned in the Somatic encounter." | Somatic, Willpower |
| **Exposure step** | avoidance → shadow resolution pressure (heal/evolve) | "One low-stakes moment this week where you say the true thing you'd normally soften." | Intrapersonal, Interpersonal |
| **Learning quest** | curriculum transfer → real-world application evidence (34/37) | "Teach the concept of feedback loops to someone, or find three live examples around you; note what surprised you." | Cognitive, (any) |
| **Service act** | STO polarity probe in a *real* social field (19) | "One unasked-for act of help this week; note what you wanted in return." | Interpersonal, Moral |

Every kind is a catalyst, not an assignment: the objective itself is the offered
catalyst, the attempt is the experience, the journal reflection is the integration
catalyst→experience→integration (14) run across the game/life boundary.

### 3.2 The objective lifecycle

```
proposed ──accepted──▶ active ──check-in──▶ fulfilled
   │                     │  │                  │
   │ (decline is data)   │  └──re-negotiated──▶ active (amended)
   ▼                     ▼
 recorded              lapsed ──▶ feeds avoidance/fixation signal (10, 24)
 (preference learning:                          → may re-surface as a
  proposal generator adapts)                      re-proposed, smaller step
```

- **Proposal:** generated from engine state (needs detector, active shadows, theta
  staleness, curriculum position) by the ObjectiveGenerator agent-tool; the player can
  also author their own (self-concordance).
- **Accept/decline:** declining is logged as preference signal only. Three declines of
  a *class* of objective quietly reroutes proposals (never nags — no notification
  pressure mechanics exist in this system).
- **Check-in:** the journal reflection (§3.3). Multiple check-ins per objective allowed;
  the fulfilled transition happens when reflection depth and consistency satisfy the
  objective's own stated criteria — evaluated as development evidence, not as
  fact-verification.
- **Lapse:** an active objective past its self-declared horizon without any check-in
  becomes lapsed. Lapse is *material*: it raises the relevant avoidance signal and the
  scheduler may offer a smaller approach step. It never generates notification guilt —
  lapse is discovered at the next visit, per the checkpoint model (§5.7).

### 3.3 The reflection protocol (the check-in)

Fixed structure, five prompts (Veil-safe, disclosure-informed):

1. **What happened** — the factual surface (brief).
2. **What did you notice** — felt-sense during the attempt (body, emotion, thought).
3. **What was hard** — resistance, avoidance, self-talk at the contact boundary.
4. **What does it connect to** — pattern-recognition prompt (links to prior entries,
   encounters, vows — the meta-cognitive loop).
5. **What's next** — the next smallest step (feeds the next proposal).

**Depth rubric (scored, never shown as a score):** reflections are scored 1–5 on
processing depth per 31's spectrum — 1 = factual log; 2 = emotional naming; 3 =
mechanism insight (why it happened); 4 = pattern linkage (across time/lines); 5 =
reframe (identity-meaning shift, the 17-style frame change). **Positivity, grammar,
and length are explicitly unscored.** The rubric's only faking-resistance claim is
modest and honest: depth-of-processing is harder to fake than outcome claims, and
divergence between claimed ease and expressed resistance is itself diagnostic input.

### 3.4 Where reflection evidence enters the engine

A check-in produces a `ReflectionRecord` → normalized into a consequence record fed to
`processOutcome`/`applyConsequences` as a real-world catalyst event:
drive-vector updates from expressed approach/avoidance; shadow-ledger pressure relief
when an exposure step was attempted (regardless of "success"); STO/STS polarity weight
from service-act reflections; theta refresh for the objective's primary line. The game
loop and the life loop become one economy.

## 4. Architectural contract

### 4.1 Data model (extension of existing types — backward compatible)

```ts
// SharedTypes.ts — Vow gains optional fields; existing saves load unchanged.
export interface Vow {
  readonly text: string;
  readonly createdAtMs: number;
  readonly fulfilled: boolean;
  // ── 39 extension (optional ⇒ old saves parse) ──
  readonly kind?: 'practice' | 'exposure' | 'learning' | 'service';
  readonly status?: 'active' | 'fulfilled' | 'lapsed' | 'renegotiated';
  readonly implementationIntention?: { when: string; then: string };
  readonly horizonMs?: number;              // player-declared, not enforced
  readonly checkInCount?: number;
  readonly witnessPodId?: string;           // social-induction (38), optional
}

export interface ReflectionRecord {
  readonly id: string;
  readonly vowId?: string;
  readonly prompts: readonly { question: string; answer: string }[];
  readonly depthScore?: 1 | 2 | 3 | 4 | 5;  // rubric result, never surfaced as number
  readonly createdAtMs: number;
}
```

`Significator` gains `reflections?: readonly ReflectionRecord[]` (optional, same
compat rule). The `/journal` route upgrades from read-only vows/codex to the check-in
surface. Journal text is the most sensitive data in the system: **client-side
storage only** (localStorage / mysteriumDir, 07); if cloud sync (07) is later extended,
journal bodies are excluded by default — only derived, consented aggregates may leave,
same discipline as 38 §4.3.

### 4.2 The agent toolset (the "tooling-system-architecture" hook)

Objectives and check-ins are run **through agent tools** on the existing tool-calling
surface (`/api/llm/tools` proxy; CLI parity via the `mysterium` bin). The orchestrator
agent's practice toolset:

| Tool | Contract | Consumes / produces |
|---|---|---|
| `propose_objective` | given engine-state summary → 1–3 candidate objectives (if-then form, kind-tagged, sized by staircase) | needs detector + shadow ledger + curriculum position → `Vow` drafts |
| `process_checkin` | given reflection answers → depth score, extracted signals, consequence record | `ReflectionRecord` → `processOutcome` input |
| `review_practice` | periodic synthesis of reflection history → qualitative narrative (Veil-safe) | reflections → narrative for the player's journal view |
| `witness_objective` | (pod context, 38) emits `objective-witnessed` weave event | vow + consent → pod event |

**Ground rules for all practice tools:** (a) propose, never assign — the tool returns
drafts for player acceptance; (b) Veil-compliant output only — qualitative, no scores,
no clinical language, no diagnosis-flavored phrasing (20; telemetry precedent);
(c) crisis routing — any reflection matching self-harm/crisis patterns routes to the
safety layer (the existing `checkSafetyOverride` contract) and to real-world resource
 surfaced gently, *before* any game response; this is the one place the Veil yields.

### 4.3 Engine integration points (existing machinery, cited)

- Proposal inputs: `DevelopmentalNeedsDetector` outputs (already ranked, urgency-scored),
  `AutoModeStrategy` theme, theta staleness map, active shadow ledger, curriculum
  position (34 bridge).
- Consequence path: new `PracticeConsequence` record type flows through the existing
  `processOutcome` → `applyConsequences` → Significator chain unchanged.
- Scheduler: lapsed objectives and repeated declines feed encounter-selection weights
  (24) — the same avoidance-pressure pathway OA-13 already models.
- CLI parity: `mysterium practice` (list/accept/propose) and `mysterium checkin`
  (reflection flow) join the existing command surface; headless validation personas
  (validation kernel) gain practice-loop policies so gates can assert the loop end-to-end.

### 4.4 Reflection scoring pipeline

```
reflection text
  → heuristic pre-scorer (offline always: specificity markers, prompt coverage,
    follow-through consistency with prior entries)          [P0]
  → LLM rubric scorer via /api/llm/tools (rubric in §3.3; output = depth 1–5 +
    structured signal extraction, temperature 0)            [P1]
  → reconciliation: LLM absent/divergent ⇒ heuristic score stands (graceful degrade)
```

Offline mode is a first-class citizen (the CLI game already runs without an LLM key);
the practice loop must never *require* network.

## 5. Phases

| Phase | Contents | Acceptance |
|---|---|---|
| **P0 (3–4 d)** | `Vow` extension + `ReflectionRecord`; CLI `practice`/`checkin`; heuristic scorer; `/journal` read/write UI | a player can propose→accept→check-in→fulfill fully offline; old saves load untouched |
| **P1 (4–5 d)** | LLM rubric scorer + `propose_objective`/`process_checkin` tools on `/api/llm/tools`; safety routing tests | scorer gracefully degrades offline; crisis-pattern fixtures route to safety layer 100% |
| **P2 (3–4 d)** | `witness_objective` + pod integration (38 M1); recognition `service` evidence path | witnessed objective produces pod event + recognition evidence without journal text leaving client |
| **P3 (2–3 d)** | ObjectiveGenerator fed by needs detector + scheduler weights; validation personas extended with practice-loop policies | validation gate: therapy-arc persona with exposure objectives shows faster shadow-load decline than without (practice loop *demonstrably* accelerates the heal vector) |

## 6. Open questions

1. Reflection cadence — per-objective only, or also free journaling? (Free journaling
   is therapeutic but changes the storage/privacy calculus.)
2. How much proposal autonomy should the agent have at P3 — propose-only always, or a
   consented "suggest at session end" mode?
3. Do lapse signals ever *expire* (avoidance data aging out), and at what rate per line?
4. For minors (37/41 §3): what is the guardian's visibility — existence of objectives
   only, or content? Default should be existence-only.
5. Can service-act reflections claim polarity weight without any verification at all,
   or does unverified STO weight dilute the polarity signal (19)? (Tentative: cap
   self-reported weight below witnessed weight.)

## 7. Principles served

- **Catalyst→experience→integration (14):** the loop runs across the game/life
  boundary — objectives are catalyst, life is experience, journal is integration.
- **Veil (20):** no scores, grades, deadlines, or clinical language ever reach the
  player; lapse is silent material, and scoring exists only in the machinery.
- **Heal/evolve vectors (§5.3):** exposure steps operationalize heal/evolve; learning
  and service quests carry evolve/heal breadth.
- **Infinite checkpoint (§5.7):** no deadline mechanics; life practice participates in
  the same leave-anywhere, continuous-progress contract as the game.
- **Uniqueness:** owns objectives/reflection/induction; pods (38), packs (40),
  credentials (41) each stay in their lateral; consumes existing Vow/journal/agent-tool
  substrate rather than duplicating it.

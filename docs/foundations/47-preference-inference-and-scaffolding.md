# 47 — Preference Inference & the Scaffold Library

> **Lateral:** How a person's interests are **categorised** and their preferences **inferred from
> language**, under an evidence-tier rule that decides exactly which inference may become a field of
> record; and how that profile selects the **delivery structure** (the scaffold) of an encounter —
> the framework that fits the practice to one particular person.
> **Status:** ratified 2026-09-20 (`MY-AD-0022`, `MY-AD-0023`, `MY-RG-0020`, `MY-RG-0021`).
> **Owns:** the **evidence tiers** (T1/T2/T3), the **meta-program catalogue** and its linguistic
> markers, the **interest record** and its axes, the **scaffold library** and the **scaffold
> selection rule**, the **probe set**, and the **inference pipeline**.
> **Does not own:** the user-dimensionality vector and pooling (`45`), the tag ontology and the
> dialectic engine (`46`), ZPD and fading as learning science (`29 §2.7`), depth levels (`31`),
> modalities (`11`), the staircase (`08`), the encounter priority formula (`24`), grading
> (`42`), the identity/consent context and its projectors (`16 §2.1`), data classes and the
> projection firewall (`MY-AD-0020`), the engagement contract's forbidden list (`45 §7`), objective
> kinds (`39`), cohort formation (`38`).
> **Cross-references:** all of the above. This document is the join between *who the person is* and
> *how the practice is arranged for them*.

**Naming note (recorded to prevent a real collision).** This project already uses **meta-pattern** for
vision-logic content in the cognitive line (pattern-across-patterns at Teal/Turquoise,
`src/core/assessments/cognitive/turquoise.ts`). The NLP lineage's term is **meta-program**, and that
is the word used here. A reader looking for the Teal construct must not arrive at this document.

---

## 1. Purpose and the gap this fills

Three joins were missing, and each of them has a named owner on only one side:

| Join | Already owned | Was unowned |
|---|---|---|
| person → **interest record** | `45 §3` declares the UDV's interest graph, `46 §4` declares the tag ontology | how an interest is *categorised*, and what an entry actually consists of |
| person → **preference profile** | `45 §3` declares the preference group of fields | where those fields come from, and which inferences may be written |
| (interest × profile × catalyst target) → **delivery structure** | `29 §2.7` owns ZPD and fading as learning science; `11` owns modalities | that delivery structure is a **selected object with a library and a fading rule**, rather than an authoring decision made per encounter |

`45 §3.1` rule 1 already forbids the dangerous case — *"no field may be inferred into the UDV from
behaviour if it was not declared and consented; observed signals improve ranking but may not create a
field of record"* — and `45 §10` then names the consequence: *"Where exactly is the line, and is it
auditable?"* **This document is the answer. The line is the evidence tier, and the tier is a property
of the distinction, not of the inference method.** That is what makes it auditable: a distinction
either has a validated analogue or it does not, and that fact does not change with how confidently an
implementation reads the text.

---

## 2. The meta-program lens: what it is, and the red line

NLP's **meta-programs** (Bandler/Grinder lineage; systemised by Cameron-Bandler and Rose Charvet as the
*Lab Profile*) describe the distinctions people habitually sort by — toward/away, global/specific,
options/procedures, and so on. The lineage is **not** an evidence base. Some of its distinctions
coincide with constructs that *are* empirically established; some do not. Both facts are load-bearing
here, and they produce two rules.

**Rule 1 — the lens is read-only over language.** Meta-programs are used as a **detection
vocabulary**: a hypothesis space over the player's own words and free choices. Their output is
evidence, and evidence is tiered (§3).

**Rule 2 — the rest of the technique set is forbidden outright.** The NLP canon also contains
influence methods: state induction and anchoring, embedded commands, pacing-and-leading,
presupposition insertion, covert elicitation, reframing-as-persuasion. All of them are **denied**,
and not on taste. They fail `45 §7.3`'s reversal test by construction:

> *"This developmental practice is designed to keep you here by inducing a trance state and anchoring
> it to the return button."*

The sentence does not survive being read aloud, so the mechanism is out (`MY-RG-0017`). The
distinction in one line:

> **The lens may change how the material is presented to the person. It may never change what the
> person wants, knows, or chooses.**

This is enforceable structurally rather than by intention (§9 check 6): the inference module is a
**pure reader over text**, and the only write path out of it is the UDV field set — which by
construction cannot hold a player state, a motivational manipulation, or a narrative obligation.

---

## 3. The evidence tiers

Every distinction in §4 carries a tier. The tier — not the confidence of an implementation, not the
volume of evidence — decides what may be done with a reading.

| Tier | Definition | May become | May influence | May be surfaced to the player |
|---|---|---|---|---|
| **T1 — instrumented** | a validated instrument exists, *or* an empirically robust construct has a game-measurable expression | a **consent-bound field of record**, with a declared data class | ranking · scaffold selection · the UDV | yes, through the player's own register of the articulation ladder (`MY-AD-0007`), as an instrument result |
| **T2 — correlational** | an established construct with **no** validated instrument in this system | a **ranking weight and a scaffold input** — never a field of record | ranking · scaffold selection | **no** — never presented as a fact about the person |
| **T3 — descriptive** | a distinction with no empirical support behind it | **nothing persisted.** Derived at prompt-assembly time and discarded with the session | the surface of the current encounter only (register, imagery, sequence) | no |

Three consequences, all of which resolve real hazards:

- **T3 is ephemeral by design, so it cannot accumulate into a profile.** The most seductive failure —
  a hundred plausible little readings becoming a dossier of things the player never said — requires a
  store, and T3 has none.
- **T2 may steer the practice but may not describe the person.** It is legitimate to *arrange* an
  encounter for someone who reads as global-chunking; it is not legitimate to tell them they are a
  global thinker on the strength of it. This is `MY-AD-0012`'s firewall applied to preference: a
  reading is not an identity.
- **T1 requires an instrument, which requires the existing validation protocol.** A probe that seeds
  a T1 field must pass `12 §5.4`'s RV1–RV7. No new protocol is introduced here; the existing one is
  the gate.

### 3.1 Trait and state are different evidence classes

The same linguistic material yields two kinds of reading, and they must not be mixed:

| Class | What it is | Where it may be written |
|---|---|---|
| **Trait** (the §4 distinctions) | a relatively stable habit of sorting | per its tier: T1 field · T2 weight · T3 ephemeral |
| **State** (Meta-Model markers: deletions, nominalisations, universal quantifiers, cause–effect constructions, heavy modal constriction) | a reading of the player's *current* processing load or constriction | `04`'s accessibility model — **never** a preference field, **never** a developmental field |

`04 §3.1` already rules that state is accessibility, not progression. §4 row 12 and this section are
the same rule at the preference layer: **a hard week must not become a trait.** A constricted reading
is an argument to *lower pressure on the current encounter*, not to change what the player is being
taught or to conclude anything about who they are.

---

## 4. The meta-program catalogue

Fourteen distinctions, each with the markers that are read, the construct it actually is, its tier,
and the specific thing it may influence. Where the NLP label and the construct diverge, the construct
is authoritative — the label is only a handle.

| # | Distinction | What is read | Empirical correlate | Tier | What it may influence |
|---|---|---|---|---|---|
| 1 | **toward / away-from** | "so that I can…", "to reach…" vs "so it doesn't…", "otherwise…", "to make sure" | regulatory focus — promotion/prevention (Higgins 1997); validated (RFQ) | **T1** | the *framing* of an unchanged catalytic purpose: a gain to pursue vs a loss to avert; `stake` direction (`46 §2.1` ch. 6) |
| 2 | **internal / external reference** | "I decided", "I knew" vs "they said", "people expect", "the guide says" | locus of evaluation ≈ self-monitoring (Snyder); intrinsic vs extrinsic aspiration (Kasser & Ryan). Distinct from locus of control (Rotter), which is about outcomes | **T2** | who validates: the NPC's verdict or the player's own read. **Never the grading channel** — `42 §1.1` is evidence-only and a reference frame must not leak into measurement (`45 §6.1`) |
| 3 | **global / specific** | "in general", "the whole system", abstractions vs enumerated steps, counts, named instances | construal level (Trope & Liberman); validated (Behavioral Identification Form) | **T1** | scene granularity; whether a task is posed as a system or as a step; **how** a `31` depth level is presented |
| 4 | **sameness / difference** | "same as last time", "nothing changes" vs "finally something different" | openness facets (NEO) + novelty seeking (Cloninger TCI) | **T2** | how much of the world's *surface* rotates between encounters — the frequency of loop-breaking. **Not difficulty**: `16 §6.4` owns that |
| 5 | **match / mismatch** | "exactly", "that's right" vs "that's not quite it", "actually…" | weak as a trait; adjacent to agreeableness facets and critical-thinking disposition, neither with a clean in-game instrument | **T3** | surface only — how much a dissenting NPC is foregrounded in voice |
| 6 | **proactive / reactive / inactive** | "let's", "I'll go", "I started" vs "if that happened I'd…", "tell me what to do" | proactive personality (Bateman & Crant 1993); locomotion (Kruglanski) | **T1** | whether an encounter opens with an **invitation** (the player must initiate) or a **situation already in motion** (the player must respond) — a structural scaffold choice (§6), never a difficulty change |
| 7 | **options / procedures** | "what if we…", "there must be another way" vs "just tell me the steps", "what's the process" | need for cognition (Cacioppo & Petty) + autonomy (SDT) | **T1** | choice density (`19`); the scaffold's opening move (`choice-set` vs `stepped-ladder`) |
| 8 | **in-time / through-time** | present stakes, "right now" vs "over the arc", "in five years", temporal ordering | time perspective (Zimbardo ZTPI) + future orientation (Steinberg) | **T2** | whether consequences land immediately or across encounters (`19`); the scaffold's horizon (`moment-press` vs `quest-chain`) |
| 9 | **associate / dissociate** | "I felt sick", first-person affect vs "one would notice…", "it seems as though" | perspective taking (Davis IRI) + fantasy facets of openness | **T1** | narrative vantage, and the width of the `16 §7` UL→UR observation window. **Rule: a dissociated vantage may never reduce the player's authorship of a choice.** A vantage is not an absolution (`16 §4`) |
| 10 | **independent / proximity / cooperative** | "on my own", "I'd rather just do it" vs "with someone", "let's get a group" | self-construal, independent vs interdependent (Markus & Kitayama; Singelis SCS) | **T1** | whether the encounter offers solitude, a partner or a team; feeds cohort matching (`38`). It biases the **form within a required social field** — it may never remove the field the developmental agenda requires |
| 11 | **perceptual preference** (V/A/K) | "I see what you mean", "that sounds right", "it feels off" | **the meshing hypothesis is not supported** (Pashler et al. 2008, *Learning Styles: Concepts and Evidence*). Modality preference is real *as a preference*; matching it to improve learning is not | **T3** | surface register (imagery channel) only. **It may never select the modality** — `11`'s modalities are catalyst axes, and choosing one to suit a "visual learner" can make the target shadow unprobeable (`45 §4`) |
| 12 | **necessity / possibility / desire** | "I have to", "I must", "I can't" vs "I could", "I'd like to" | modal operators (Meta-Model) — **linguistic, not a trait**; meaningful as a **state** marker | **T3** (as trait) / **state class** (§3.1) | surface only; and as state, an input to `04`'s accessibility model |
| 13 | **convincer channel & pattern** | how certainty is reported — "I saw it work", "they told me", "I just tried it" — and how many repetitions preceded acceptance | the *channel* is **T3**; the *repetition count* is a behavioural observable and is measurable in-world | **T3** distinguishable / observable is evidence-bearing (§8) | how evidence of the player's own progress is presented (`33`'s surfaces: shown · told · felt-by-having-done), and the pacing of a reveal. **This is the one distinction with a lever-shaped use** — "how long before they believe they improved" is a retention mechanism if misused, so it is explicitly bound by `45 §7.2–§7.3` and by `MY-RG-0017` |
| 14 | **mastery / performance orientation** | "I'm not good at this" (fixed) vs "I haven't learned this yet"; attentiveness to others' scores | implicit theories of ability (Dweck; the Mindset scale — replication-debated, robust as a primed *state*, weaker as a stable trait) | **T2** | whether the world foregrounds practice or demonstration; **may only ever *soften* other-comparison, never license it** — a performance-oriented reading plus a comparison-exposing world is how a practice becomes a shaming machine, and `42`'s evidence-only grading and `MY-AD-0012` already forbid the comparison outright |

**Coverage is not a goal.** The T1 set is what the probe set (§7) targets. T2 and T3 accumulate from
ordinary play, or do not — a player who is never read on `match/mismatch` loses nothing, because a T3
reading is surface decoration.

---

## 5. The interest record

`45 §3` declares that an interest graph exists; `46 §4` declares the domain vocabulary tags are drawn
from. This section declares **what an interest entry is**, which is what makes interests comparable,
retrievable, and usable as a retrieval key.

### 5.1 Six axes

```typescript
interface InterestRecord {
  readonly domain: TagId;            // 46 §4 — what it is about (inherits the axis position, so the
                                     // dialectical opposite is free)
  readonly mode: InterestMode;       // how they relate to it
  readonly depth: 'surface' | 'working' | 'fluent';   // 45 §6's enum, mapped to 31's ladder (§5.2)
  readonly salience: number;         // 0..1 — how much it matters
  readonly loadBearing: boolean;     // §5.3 — identity-carrying, and therefore protected
  readonly aim: ObjectiveKind;       // 39 §3.1 — what the interest is FOR, motivationally
  readonly provenance: 'declared' | 'probed' | 'observed';
}
```

| Axis | Values | Why it is a separate axis |
|---|---|---|
| **domain** | the tag store (`46 §4`) | it is the join to the component stock, and the axis position gives the dialectical opposite for free |
| **mode** | `consume · produce · master · compete · collect · teach · repair · serve · contemplate` | **the sharpest axis, and absent everywhere else.** A listener and a maker of the same music need different content to be *engaged* — identical domain, opposite mode |
| **depth** | `surface · working · fluent` | it decides whether a domain can carry a bridge at all; a `surface` interest can decorate, only a `working`+ interest can carry structure |
| **salience** | 0..1 | weighting; interacts with `46 §5.2`'s expansion floor — a high-salience domain is the *easiest* to over-use |
| **loadBearing** | boolean | §5.3 |
| **aim** | `practice-vow · exposure-step · learning-quest · service-act` (`39 §3.1`) | an interest with an aim connects to the Vow and gives the bridge its stakes layer (`45 §5.4`); without one, content is understood and still feels pointless |
| **provenance** | `declared · probed · observed` | it determines what may be written as a field (§8) |

`45 §6`'s three depth levels are kept unchanged and **mapped to `31`'s ladder** rather than extended
(`surface` ≈ levels 1–2, `working` ≈ 3–4, `fluent` ≈ 5–6, with level 7 reachable only through
transfer). Two competing depth enums would be a defect; one enum and one mapping is not.

### 5.2 The three provenances, and the cold-start ladder

| Provenance | Source | Available | Write rights |
|---|---|---|---|
| **declared** | onboarding self-report, adaptive facets, explicit edits | session 1 | any tier, as the player's own statement — the highest-authority source, and the only route to a T2 field being *shown* |
| **probed** | the in-world probe set (§7) | sessions 1..k | T1 only, and only with a passing RV result for that instrument |
| **observed** | behaviour: replayed encounters, revisited NPCs, free choices, journal and reflection text | continuous | **ranking weights only** — never a field of record (`45 §3.1` rule 1, operationalised by the tier) |

The ladder is deliberate: declaration is cheap and authoritative but thin; probing is authoritative
about a construct and expensive in engagement; observation is free and the only source that can grow
over years. The tier rule lets the cheap source *steer* while forbidding it from *defining*.

**Declining is not evidence.** A refused probe, a skipped reflection and a deleted field yield no
reading, and the refusal itself must not become a data point. Treating non-participation as signal is
the covert-inference failure in miniature (`MY-RG-0020`).

### 5.3 Load-bearing interests are protected

An interest is **load-bearing** when it carries identity or vocation — the thing a person would say
they *are*. It is marked on the record and it constrains the dialectic engine:

> **A load-bearing domain may not be selected as the structural pole of a bridge** (`46 §5.1`).

The reason is not caution. The spiral deliberately maps difficult structure onto the opposite of a
domain the player reasons fluently in — and if that domain is also the thing they love most, the
practice risks degrading the one area of their life that is working. Fluency may be the *surface* of a
bridge into difficult material; it must not be the *site* where their weak dimension is trained.
Non-load-bearing interests carry the load instead, and there are always several.

### 5.4 Archetypes are expiring priors, never types

The user-facing need this serves is real: before anything is known about a person, a delivery prior has
to exist, and population structure is a legitimate source for it. Clustering players into interest
archetypes is therefore allowed for exactly two purposes:

1. **cold-start scaffold selection** — sessions 1..k, before individual evidence exists;
2. **cohort formation** (`38`) — matching on *mode* and *salience* pattern rather than on domain,
   because two people who both love music may have nothing else in common while a listener and an
   engineer who both `produce` have a great deal.

And it is constrained by four rules, because this is the exact mechanism by which a developmental
practice starts telling people what they are:

- an archetype is a **prior with an expiry**, superseded the moment individual evidence accumulates;
- it is **never stored in an identity field** (`MY-AD-0012` — competence and identity never mix, and a
  typology is identity by another route);
- it is **never surfaced to the player**, not even as a suggestion;
- the **number of archetypes is small and its axes are the T1 set** — a clustering whose dimensions
  are unvalidated distinctions launders T3 into a label, which is worse than a T3 reading because a
  label is authored by the system and looks authoritative.

The failure class is `MY-RG-0021`.

---

## 6. The scaffold library

### 6.1 What a scaffold is

A **scaffold** is a structural arrangement of a facet sequence — *how* the composed content (`46 §7`)
is presented — independent of the content itself. `29 §2.7` establishes that scaffolding is
load-bearing for learning and that it must **fade**. What was missing is that a scaffold is a
**selectable object with a library, a compatibility set and a fading rule**, rather than a decision
re-made by an author for every encounter.

```typescript
interface Scaffold {
  readonly id: ScaffoldId;
  readonly arranges: string;                        // what structural choice it makes
  readonly selectedBy: readonly MetaProgramId[];    // §4 readings that favour it
  readonly modalities: readonly GameModality[];     // 11 — compatibility, never selection
  readonly depthFloor: number;                      // 31 — below this it is incoherent
  readonly stageFloor: Stage;                       // 02 — below this it cannot be understood
  readonly fadesTo: readonly ScaffoldId[];          // the DAG edge (§6.4)
  readonly maxExposures: number | null;             // §6.4 — null only for the terminal scaffold
}
```

### 6.2 The ten

| Scaffold | Arranges | Selected by | Fades to |
|---|---|---|---|
| **`worked-example`** | a full model, then a partial, then independent practice (`29 §2.7`, §2.8's novice case) | specific chunking · procedure preference · low depth | `stepped-ladder` |
| **`stepped-ladder`** | the procedure given first; choices only after it is executable | procedure · specific | `choice-set` |
| **`choice-set`** | options first; the principle is discovered from consequences | options · global · proactive | `solo-inquiry` |
| **`estrangement`** | the dialectical opposite is the **structure**, the familiar domain the **surface** (`46 §5.1`) | the default (the spiral) | `immersion` |
| **`immersion`** | wholly in the target domain, no bridge at all | difference-preference · high novelty tolerance · depth ≥ working | `estrangement` |
| **`compare-and-contrast`** | two instances differing on exactly one dimension | sameness-with-exceptions; the cleanest teacher of an abstraction | `solo-inquiry` |
| **`quest-chain`** | one consequence horizon spanning several encounters | through-time · proactive | `solo-inquiry` |
| **`moment-press`** | one scene, immediate and recoverable stakes | in-time · proactive | `quest-chain` |
| **`witness-and-invite`** | an NPC models the act; the player is invited to follow | reactive · proximity/cooperative | `choice-set` |
| **`solo-inquiry`** | no guide; the situation alone | independent · global · options | — (terminal) |

### 6.3 Selection

Selection is a **multiplicative bias in the same seam as every other bias** (`MY-AD-0008`, `45 §5.3`),
never a second scheduler and never a filter around `24`:

```
compatible = { s ∈ ScaffoldStore :
                 modality ∈ s.modalities
               ∧ depth ≥ s.depthFloor
               ∧ stage ≥ s.stageFloor
               ∧ coherent(s, catalystTarget)              // 46 §7 step 5's coherence check
               ∧ exposures(target, s) < s.maxExposures }

chosen = argmax over compatible of  fit(s, metaProgramProfile) × developmentalFit(s, depth, stage)

subject to   aversion veto                        (45 §3.1 rule 2)
             structural fidelity to C              (45 §5.4)
             the expansion floor on scaffold set   (46 §5.2)
             the load-bearing rule                 (§5.3)
```

Four properties are ratified with the rule:

- **The catalyst target is fixed before selection.** A scaffold arranges; it never chooses what is
  being developed (`45 §4`). Selection cannot be reached by preference.
- **Determinism.** The same `(profile, target, seed)` yields the same scaffold, recorded with its
  inputs exactly as a composition is (`46 §7.1`), so a player can ask why an encounter was shaped the
  way it was and receive a record.
- **The expansion floor applies to scaffolds, not only to tags.** A player who always reads as
  in-time will still meet `quest-chain` at the `46 §5.2` ratio. Otherwise the scaffold library becomes
  the comfort engine the tag store is already guarded against.
- **The player can see the scaffold and edit it.** Legibility is `45 §3.1` rule 3, and it is stated in
  plain language ("this was shown to you as a worked example first") rather than meta-program jargon.

### 6.4 Fading is a path, not a setting

`solo-inquiry` is the only scaffold with `maxExposures: null`, because the scaffold graph is a DAG
**converging on unassisted practice**. Fading is therefore not a per-scaffold timer; it is *movement
along the graph*, and `31`'s depth ceiling is what caps how long a support can legitimately remain.
Two rules follow:

- **Every scaffold has a `maxExposures` for a given target.** A scaffold that never fades is a crutch:
  it keeps the player's performance high and their competence unchanged. This is the scaffolding's own
  version of the growth-edge rule (`16 §6.4`).
- **Scaffold hardening is a defect, not a preference.** If one scaffold exceeds a declared share of a
  player's encounters, that is a fault to fix (§11), not a personalisation success.

### 6.5 What is *not* a scaffold

Three existing axes are orthogonal and must not be folded in:

| Axis | What it is | Why it is not a scaffold |
|---|---|---|
| `11`'s seven **modalities** | the catalyst axes through which a line×stage is probed | a modality is *what* probes; a scaffold is *how* the probe is arranged. `11`'s affinity contract binds them (a scaffold is compatible with a modality, never a substitute for one) |
| `08`'s **staircase** | adaptive difficulty | difficulty is a *parameter* of an encounter, and a scaffold must not become a difficulty dial (row 6 of §4 exists precisely to keep proactivity structural) |
| `29 §2.2`'s **spacing / retrieval schedule** | when material returns | a schedule is time-domain; a scaffold is structure-domain. `29` owns it; this document schedules nothing |

---

## 7. The probe set

`probed` provenance needs an instrument that is **indistinguishable from play** (`AGENTS.md §5.4` —
the game is never diagnostic to the user).

- **Shape.** 2–3 probes per T1 distinction; each probe discriminates between two poles by confronting
  the player with a situation where the two would choose differently. A probe is a playable encounter,
  never a questionnaire item.
- **Validation.** A probe that seeds a **T1 field of record** must pass `12 §5.4`'s RV1–RV7. A probe
  that has not passed may still run, but its readings are log-only and may not leave §3's
  weight/ephemeral band. **No new validation protocol is introduced** — `12 §5.4` is the gate, which
  also means a probe set is championed by the same rubric-validation discipline as every other
  implicit instrument.
- **Budget.** The probe set is delivered *across* sessions and is bounded by the same engagement budget
  as everything else (`09 §4`; `ONBOARDING-REDESIGN-PLAN`'s ≤8 probes per line is the precedent). The
  T1 set is ~10 distinctions, so full coverage is a multi-session programme, not onboarding homework.
- **Declinable.** A refused probe yields no reading and the refusal is not recorded (§5.2).
- **Coverage is not required.** Unprobed distinctions simply stay in the weight/ephemeral band; the
  practice works without them.

---

## 8. The inference pipeline

```
LANGUAGE & CHOICE        journal, reflection text, dialogue, free choice, revisits
        ↓
OBSERVABLE EXTRACTION    deterministic marker pass (§4 markers) + choice/revisit counters
        ↓
EVIDENCE LEDGER          per distinction: observations × context × recency
        ↓
TIER GATE                §3: T1 → field of record · T2 → weight only · T3 → ephemeral
        ↓
CONSUMPTION              UDV write (45 §3) · scaffold selection (§6.3) · tag weighting (46 §4)
```

| Rule | Statement | Why |
|---|---|---|
| **Deterministic commit** | extraction is deterministic; an LLM may *propose* an observation, but the commit is the deterministic counter | `MY-AD-0001`'s kernel discipline and `43 §5.3`'s determinism. An LLM-written profile is unauditable by construction |
| **Minimum evidence** | a T2 write needs ≥6 observations across ≥3 distinct contexts, recency-weighted; a T1 write additionally requires the instrument's own reliability to hold (`12 §5.4`, `40 §4.3`) | one bad session must not become a trait |
| **Contradiction is represented, not resolved** | evidence is stored **per context** (solitary / social / work / play), not as one verdict per person | a person can be toward in one domain and away in another; a single verdict per person is the typology error in miniature (§5.4) |
| **Expiry** | T3 evidence lives for the session; T2/T1 decay without reconfirmation | the preference-layer analogue of `25`'s theta-decay — analogous rule, *not* the same mechanism; developmental decay and preference-evidence decay never share a store |
| **The observation firewall** | observed signals may create weights, never fields of record | restates `45 §3.1` rule 1 by reference; §3's tier is the operationalisation that makes it checkable |
| **Legibility & withdrawal** | the player reads, edits and deletes; deletion removes the evidence *and* the derived weight, and the deletion is not itself recorded | `45 §3.1` rule 3, plus §5.2's "declining is not evidence" |
| **Data class on every field** | every stored field declares a class per `MY-AD-0020` | `MY-RG-0018` requires it; §9 check 1 adds tier, provenance and consent reference |

---

## 9. What is executable

Each row is a candidate gate for the implementation phase. Together they are the mechanical answer to
`45 §10`'s *"is it auditable?"*

| # | Check | Fails when |
|---|---|---|
| 1 | every UDV preference/interest field carries `{tier, provenance, dataClass, consentRef}` | a field arrives without its provenance |
| 2 | **the store schema has no slot for a T3 reading** | a T3 distinction is persisted at all |
| 3 | an archetype prior carries an expiry, and no identity field holds one | a prior became a label (`MY-RG-0021`) |
| 4 | no scaffold is selected outside its compatibility set, and none exceeds `maxExposures` | fading was skipped; a crutch survived |
| 5 | every selected scaffold is recorded with `(profile, target, seed)` | the choice is unexplained and irreproducible |
| 6 | **the inference module has no write path to player state other than the UDV field set, and the UDV cannot hold a state value** | an implementation gains the ability to induce, anchor or manipulate (§2 rule 2) |
| 7 | a `loadBearing` domain is never the structural pole | §5.3 was bypassed |
| 8 | a T1 field cites a passing RV result for its instrument | a probe was promoted without validation |
| 9 | a scaffold exceeding its declared share triggers a defect report | hardening was read as personalisation success |

Check 6 is the load-bearing one: it converts the ethical red line from a promise into a **structural
property of the module graph**. A module that is a pure reader over text, writing only tiered UDV
fields, cannot implement the forbidden technique set — not because it was told not to, but because
there is nowhere for it to write.

---

## 10. Code home (recommendation, not a citation)

Following `MY-AD-0002`'s layer rules — core is pure, infra integrates, surfaces consume:

| Concern | Recommended home | Why that layer |
|---|---|---|
| marker extraction, the evidence ledger, tier gate, decay | `src/infra/profiles/` (proposed files, none existing yet) | it reads storage and integrates; the profile store already lives there |
| scaffold library and the selection function | a pure module consumed by `46 §10`'s composition pipeline | selection is a deterministic pure function over `(profile, target, seed)` — core's job |
| probe set as playable encounters | authored content, compiled through `46 §8`'s corpus path | probes are encounters, not instruments with their own pipeline |

The `profiling` organ (`_org.yaml`) currently declares `contract_docs` for `12`, `16`, `25`, `40` and
`code: [src/core/domain, src/infra/profiles]`. This document joins that set, and the scaffold-library
half joins `curriculum`'s.

---

## 11. Failure modes

| Failure | Mechanism | Countermeasure |
|---|---|---|
| **Covert profiling** | observation accretes field by field into things the player never declared | §3's tier rule + §8's observation firewall + `MY-RG-0020` |
| **Type-casting** | a cold-start archetype hardens into a label the system then serves forever | §5.4's expiry + no identity field + never surfaced + `MY-RG-0021` |
| **Trait from a state** | a constricted week is read as a disposition | §3.1's separation; state reads go to `04`, never to a preference field |
| **Learning-style fallacy** | a T3 perceptual preference is used to select the modality | §4 row 11 is T3 and explicitly barred from modality selection; `11`'s affinity contract governs |
| **Scaffold hardening** | one scaffold becomes the only arrangement | §6.4's `maxExposures` + §9 check 9 |
| **Crutch persistence** | a support stays because performance looks good | fading is mandatory and the graph converges on `solo-inquiry`; `31`'s ceiling caps it |
| **Comfort scaffold** | `immersion`/`choice-set` selected forever because they read as preferred | §6.3's expansion floor on the scaffold set |
| **Load-bearing damage** | a vocation-carrying interest becomes the training ground for weakness | §5.3 |
| **False teacher** | a familiar surface distorts `C` because the arrangement was optimised for comfort | `45 §5.4` structural fidelity; assessment scored on `C`, never on the arrangement |
| **Inference non-determinism** | an LLM writes a profile reading | §8 deterministic commit; the model proposes, the counter commits |
| **Manipulation** | the technique set is reintroduced as "engagement optimisation" | §2 rule 2 + §9 check 6 (structural) + `MY-RG-0017` + `45 §7.3`'s two tests |
| **Measurement leakage** | a reference-frame or orientation reading reaches the grading channel | §4 rows 2 and 14; `45 §6.1`'s scoping rule (metric-bearing roles see least) |
| **Cross-cultural marker invalidity** | §4's markers are English-language and culture-laden | same discipline as `46 §9`: markers are authored per locale, never machine-translated |

---

## 12. Principles served

Principles **1, 3, 5, 6** — the practice is delivered in the player's own language *and structure* (1);
the machinery that knows them best cannot be turned into a lever, because the lens is read-only and
the module graph has nowhere to write a manipulation (3); the developmental need outranks the
preference, since the scaffold arranges a target it never chooses (5); and every reading is tiered,
attributed and the player's to read, edit and delete (6).

---

## 13. Open questions

- **Tier reassignment.** A tier is a claim about the evidence base, and evidence changes. Who may
  re-tier a distinction, and does it require an AD? (Proposed: yes — the tier is a property of the
  catalogue, changed by record, never by an implementation.)
- **Profile legibility.** Does the player see the *profile* or only the *scaffolding choices*? (Leaning:
  scaffold is visible and editable; the profile surfaces only as a T1 instrument result, because
  displaying a T2/T3 reading as a fact about the person is `MY-RG-0021`'s failure regardless of how it
  is framed.)
- **Probe budget.** ~10 T1 distinctions × 2–3 probes is 20–30 probes. Is that compatible with `09 §4`'s
  engagement budget, or does the T1 set need to shrink to what a player will actually meet?
- **Archetype set.** How many archetypes, and are they culture-specific? The axes are T1, but the
  *clusters* are probably not universal.
- **Marker validity across languages.** §4's markers are English and culture-laden; the localisation
  strategy (per-locale authored markers vs a shared construct with local expression) is unresolved.
- **Scaffold graph completeness.** Ten scaffolds and their `fadesTo` edges are a proposal. Is the DAG
  acyclic and total in practice — and is there a legitimate scaffold this set is missing?
- **Decay calibration.** §8's expiry windows and the ≥6/≥3 evidence floor are reasoned, not measured.
  Same standing deferral as `45`'s `noveltyBudget` and `46`'s `expansionRatio`: one play-data
  calibration answers all three.

---

## 14. References

Listed as resolvable paths so the knowledge-base graph can see this document's dependencies. Canon's
`NN §X` shorthand was the reading convention but was **not** an edge — no extractor resolved that
form, so a canon document's doc→doc edges were invisible (the whole canon rung's graph was
inbound-only). The extractor now resolves it (`outbound_refs` style 6), so the explicit list below is
kept for prose clarity rather than as a workaround.

| Depends on | For |
|---|---|
| `docs/foundations/45-personalization-and-context-pooling.md` | the UDV, three-library pooling, the analogical bridge, the engagement contract (§7) |
| `docs/foundations/46-generative-world-composition.md` | facets, the tag store, the dialectic engine, the composition pipeline |
| `docs/foundations/29-meta-learning-science.md` | ZPD, scaffolding and fading (§2.7–§2.8); spacing (§2.2) |
| `docs/foundations/31-depth-assessment-model.md` | the depth ladder, its ceiling, and the depth-mapping of §5.1 |
| `docs/foundations/11-game-modalities.md` | the modality affinity contract (§6.5) |
| `docs/foundations/12-drive-assessment-mechanics.md` | the rubric-validation protocol (§5.4 — RV1–RV7) |
| `docs/foundations/16-significator-architecture.md` | the Significator, the articulation ladder, the free-will commitment (§4), growth edge (§6.4) |
| `docs/foundations/39-action-induction-journal-system.md` | the objective kinds the `aim` axis draws from |
| `docs/foundations/04-states-of-consciousness.md` | state as accessibility, never progression (§3.1) |
| `docs/foundations/08-psychophysics-and-staircase.md` | the staircase, which §6.5 keeps orthogonal to scaffolds |
| `docs/foundations/19-choice-and-polarity-engine.md` | choice density and consequence horizons |
| `docs/foundations/38-cohort-weave-multiplayer.md` | cohort formation, the second permitted use of an archetype (§5.4) |
| `docs/foundations/42-developmental-levelling-mechanism.md` | evidence-only grading, the identity firewall |
| `docs/foundations/33-self-directed-dashboard.md` | how the player reads their own model (§6.3, §9) |
| `src/core/assessments/cognitive/turquoise.ts` | the *existing* `meta-pattern` sense this document disambiguates from |
| `src/infra/profiles/` | the recommended home for inference (proposed files, none existing yet — §10) |
| `src/core/validation/gates.ts` | where the kernel gates that §9's checks would extend live |

**Records that transcribe this document:** `MY-AD-0022`, `MY-AD-0023`, `MY-RG-0020`, `MY-RG-0021`.

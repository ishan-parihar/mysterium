# 45 — Personalization & Context Pooling: the Scenario Catalyst Provider

> **Lateral:** How the *player's own dimensionality* becomes a first-class retrieval key, and how the
> three world libraries (world · NPC · scenario) are pooled against it to compose the context
> envelope that the scenario-catalyst agent and its sub-agents operate from — plus the engagement
> contract that keeps that personalization non-exploitative.
> **Status:** ratified 2026-09-20 (`MY-AD-0018`, `MY-AD-0019`, `MY-RG-0017`).
> **Owns:** the **user-dimensionality vector (UDV)**, the **three-library pooling model**, the
> **analogical bridge**, the **ScenarioContext envelope**, and the **endorsement test**.
> **Does not own:** the world's holon taxonomy (`18`), the LLM pipeline's step order and prompt
> assembly (`22`), encounter *selection* and its ONE priority formula (`24`), the objective/Vow
> system (`39`), flow and reward-schedule theory (`09`), modality contracts (`11`), the sub-agent
> roster and toolset firewall (`43`), the profile's consent mechanics (`16 §2.1`), and — since
> 2026-09-20 — the **composition of the entities that are pooled**: this document assumes libraries
> exist and pools over them; `46` specifies that they are composed from facets and adds the tag
> store and the dialectic engine; and — since the same day — **how preference fields are inferred and
> which delivery structure is chosen for a person**: `47` owns the evidence tiers, the meta-program
> catalogue, the interest record and the scaffold library.
> **Cross-references:** all of the above; this document is the join between them.

---

## 1. Purpose and the gap this fills

`22 §4.2` injects a `VeilFilteredSignificator` into every generation: perceived layer, line
altitudes, drive signals, shadow signals, recent choice patterns, transformation proximity, session
energy. That is a **developmental** description of the player and nothing else.

What it does not carry is *who this particular person is*: what they already love, how they prefer to
learn, what they are building toward, what vocabulary lands for them, what bores them to tears. The
pipeline therefore generates a developmentally-correct encounter in a generic voice. Two players at
the same line-stage receive interchangeable content — which is precisely the thing a person notices
first and stops returning over.

This document adds the missing half without forking any existing mechanism:

| Question | Owner | Added here |
|---|---|---|
| What world are we in? | `18` | — |
| Which holons exist and what is their shape? | `18 §2`, `22 §2` | — |
| How is a prompt assembled from holons + state? | `22 §4` | the **pooled** personalization block (§6) |
| Which encounter is selected? | `24` | the *candidate set* the formula ranks (§5) |
| What is the player developing toward? | `16`, `39` | how that purpose re-weights *relevance* (§5.3) |
| How do we keep them returning? | `09` | the **endorsement test** and the forbidden list (§7) |

---

## 2. The three libraries

Personalization needs a substrate to pool *from*. Mysterium's world content is therefore modelled as
three libraries with different lifecycles. They are **libraries, not a single table**: an NPC can
appear in many scenarios, a scenario can be re-instantiated across worlds, and a world outlives both.

| Library | What an entry is | Owner of the *shape* | Lifecycle | Growth driver |
|---|---|---|---|---|
| **World** | A holon at group altitude or above — region, culture, organisation, ecosystem — with its PESTLE facets, perceptibility strata, and state history | `18 §2`, `18 §3`, `18 §5` | slow (world inertia, `18 §4.3`) | collective mirroring, macro-catalysts (`24`) |
| **NPC** | A holon at individual/dyadic altitude: an agent with drives, a stage voice, its own distortion profile, relationships, and a memory | `18 §2.1–§2.2`, `22 §2.1`, `22 §3.1` | medium | two-fold world memory (`MY-AD-0009`) |
| **Scenario** | A *situation template*: a locus, a cast (NPC refs), a catalytic purpose (line × stage), a modality, an initial stake, and a set of pressure levers | `11` (modality), `12` (drive probes), `22 §6` (modality contract) | fast | encounter outcomes, consequence propagation |

**Scenarios are the unit of instantiation.** A scenario template is *parameterized* by the pooling
step (§5) into a concrete encounter: the same template yields a courtroom in a mercantile world for
one player and a family council in a pastoral one for another, with the same catalytic purpose
intact. This is what makes variety affordable: content scales by **combination**, not by authoring
every variant.

**Invariant (ratified):** a scenario template declares only `{locus_kind, cast_shape, catalytic
purpose, modality, stake_kind, pressure_levers}`. Anything more specific makes it unpoolable, and
DG-enforcement of that shape is deferred to the implementation phase (see §10).

---

## 3. The user-dimensionality vector (UDV)

The UDV is the retrieval key. It is **not a new store**: every field is either derived from an
existing engine's state or read from `16 §2.1`'s consent-bound identity context through the
purpose-bound projector. Nothing here is a parallel profile.

| Field group | Fields | Source of truth | Consent |
|---|---|---|---|
| **Developmental** | center of gravity, line altitudes, active drives/shadows, transformation proximity | `16 §2`, `25` (CCI) | inherent (not identity) |
| **Preference** | preferred learning modality mix, session-length tolerance, difficulty appetite, aesthetic/tone leanings | `09`, `11`, `08` (staircase) | opt-in, revocable |
| **Interest graph** | weighted topics/domains the player already cares about; depth per topic; source of the interest | `16 §2.1` identity fields + declared interests + observed engagement in `39` objectives | opt-in, revocable |
| **Purpose & vision** | the player's stated aims, longer-horizon intentions, and the objectives they have adopted | `39` objective taxonomy (the Vow) | opt-in, revocable |
| **Analogical vocabulary** | the domains the player reasons fluently in (their metaphors: sport, code, cooking, music, kinship…); words that land and words that repel | derived from interest graph + language-reflective evidence + explicit declaration | opt-in, revocable |
| **Aversions** | taboos, topics and framings that must not be used | explicit declaration | opt-in, revocable, **fail-closed** |
| **Life constraints** | time budget, device, accessibility needs, situational limits | `09 §4` NFRs, `src/core/accessibility` | opt-in, revocable |

### 3.1 Three rules on the UDV

1. **Consent-first, purpose-bound.** Identity-derived fields are reachable only through the existing
   projector (`16 §2.1`). The pooling step requests *purpose-scoped projections*
   (`gameplay-personalization`), never raw identity. No field may be inferred into the UDV from
   behaviour if it was not declared and consented; *observed* signals improve ranking but may not
   create a field of record.
2. **Aversion is fail-closed.** A taboo suppresses a candidate unconditionally. It is the one UDV
   field with veto power over the priority formula (`24`) — relevance never overrides a stated "not
   this".
3. **The UDV is readable, editable, and exportable by the player.** Personalization the player cannot
   inspect is indistinguishable from manipulation, so legibility is a structural requirement, not a
   courtesy. Surface it through the recommendation engine's own contract (`33 §1–§5`).

---

## 4. What personalization may and may not do

The developmental agenda outranks the preference agenda. Personalization shapes **how** catalyst is
delivered, never **which** development is being served.

| May | May not |
|---|---|
| Choose the scenario that carries a required catalytic purpose | Replace the catalytic purpose with one the player prefers |
| Express a concept in the player's analogical vocabulary | Rewrite the concept's structure to fit that vocabulary (§5.4) |
| Pick the modality within the affinity of the target line-stage (`11`) | Choose a modality that cannot probe the target shadow |
| Tune tone, stakes, aesthetic, pacing | Tune difficulty away from the growth edge (`16 §6.4`) |
| Prioritize among equivalent candidates | Suppress a candidate the developmental state requires (except by aversion) |

**The comfort trap.** Preference-based personalization degenerates into a comfort engine: it serves
the player what they already like, which is exactly what a *practice* must not do. `16 §6.4`'s
growth-edge bias is the standing counterweight, and `09 §3.2`'s boredom backstop is the standing
counterweight for plateau. This document inherits both and adds no third mechanism.

---

## 5. Context pooling

Pooling is a **retrieval-then-rank** pipeline that runs *before* `24`'s selection, producing the
candidate set the priority formula ranks. It is not a second scheduler.

```
UDV ──► QUERY ──► LIBRARY RETRIEVAL ──► CONSTRAINT FILTER ──► CANDIDATE SET ──► (24) selection
         │              │                      │                    │
      (§3 key)   world · NPC · scenario   veil · strata ·      ranked by relevance
                 (semantic match)         prereq · taboo       to UDV × catalytic need
```

### 5.1 Query construction

The UDV is reduced to a **weighted term set** with three bands: *interest terms* (high weight),
*analogical vocabulary* (high weight, used for surface rendering), *purpose terms* (medium), and
*developmental terms* from `22 §4.2` (medium — they set the catalytic target, not the flavour).
Retrieval is semantic: term overlap first (the house BM25 model, `arch.py`'s `Corpus` is the
reference implementation of the same idea over documents), embeddings where a provider is available,
with deterministic lexical fallback so pooling never depends on a network call.

### 5.2 Constraint filter (hard, in order)

1. **Veil** (`20`) — nothing the player must not know may enter the context as an *assertion*.
2. **Perceptibility strata** (`18 §5`) — a candidate above the player's perceived layer renders only
   as its lower-strata appearance.
3. **Aversion** (§3.1 rule 2) — veto.
4. **Prerequisites / depth** (`31 §3.5a`, `24 §3.2.8`) — a candidate whose depth floor exceeds the
   player's is not offered as primary; it may appear as texture.
5. **Modality fitness** (`11`) — the candidate's modality must be able to probe the target line-stage.

### 5.3 Ranking: relevance is a bias, never a replacement

Pooling produces a *ranked candidate set*. `24`'s ONE priority formula remains the single selection
authority, and this document's contribution enters it on the same terms as every other bias
(`MY-AD-0008`): as a **multiplicative bias on the eight criteria**, never a hard filter and never a
parallel queue. Relevance-to-UDV biases toward candidates that will *land*; the developmental
criteria decide which one *should*. If they disagree, the developmental criteria win — the player
gets the encounter they need in the vocabulary they love.

### 5.4 The analogical bridge

The mechanism that makes boring-but-necessary content land. Target concept `C` is rendered through
the player's fluent domain `D` in three layers, all three required:

| Layer | Operation | Failure if omitted |
|---|---|---|
| **Structural** | map `C`'s internal structure (its parts, relations, invariants) onto a structure already present in `D` | the analogy is decorative and teaches nothing |
| **Surface** | express `C` in `D`'s vocabulary, register, and imagery (`22 §4.4`'s `vocabularyBand` + `valueLens`) | the content lands as foreign and is rejected |
| **Stakes** | connect `C` to an aim in the player's purpose set (`39`) | the content is understood and still feels pointless |

**Refinement (2026-09-20, `46 §5.1`):** the *structural* layer maps onto the **dialectical opposite**
of the player's fluent domain — surface in `D`, structure in `D'`. Rendering in `D` alone produces a
filter bubble: everything is learned in a vocabulary the player already owns, and the dimension they
lack is never trained. Fluency is the carrier; the opposite pole is the payload. The two guards below
are unchanged and now have a sharper job. The **structural arrangement** that carries the spiral is
`estrangement` (`47 §6.2`), chosen by the rule in `47 §6.3` — so *how* a bridge is delivered is a
selected object with its own library and fading rule, not a decision re-made per encounter.

**Two guards, both mandatory:**

- **Structural fidelity.** An analogy that distorts `C` is a false teacher, and a false teacher at
  scale is worse than a boring one. The bridge therefore records the mapping it used, and the
  encounter's assessment is scored on `C`, never on `D` — mastery evidence (`42`) must not be
  obtainable by fluency in the player's own favourite domain.
- **Analogy rotation.** A single domain used indefinitely turns into an echo chamber. Every bridge
  instance declares a `noveltyBudget`: the fraction of encounters that must introduce a *new* domain.
  Bridging is a ramp into unfamiliar material, not a wall around familiar material.

---

## 6. The ScenarioContext envelope

The object handed to the scenario-catalyst agent and, scoped, to its sub-agents (`43`).

```typescript
interface UserDimensionalityVector {
  developmental: VeilFilteredSignificator;        // 22 §4.2, unchanged
  preference: { modalityMix: Partial<Record<GameModality, number>>; difficultyAppetite: 'gentle'|'steady'|'steep';
                sessionToleranceMin: number; aestheticLeanings: string[] };
  interests: ReadonlyArray<{ topic: string; weight: number; depth: 'surface'|'working'|'fluent'; source: 'declared'|'observed' }>;
  purpose: ReadonlyArray<{ kind: 'practice-vow'|'exposure-step'|'learning-quest'|'service-act'; statement: string }>;   // 39 §3.1
  analogy: { fluentDomains: ReadonlyArray<{ domain: string; weight: number }>;
             landings: string[];        // words/framings that work
             repels: string[] };        // fail-closed
  aversions: string[];                  // fail-closed, veto power
  constraints: { timeBudgetMin?: number; accessibility: string[] };
}

interface ScenarioContext {
  udv: UserDimensionalityVector;                       // purpose-scoped projection, never raw identity
  pooled: { world: HolonRef[]; npcs: HolonRef[]; scenarios: ScenarioTemplateRef[] };   // §5.2 survivors
  analogicalBridge: { structuralMap: string; surfaceMap: string; stakeHook: string | null;
                      domain: string; noveltyBudget: number } | null;
  catalystTarget: { line: Line; stage: Stage; modality: GameModality; purpose: string };   // from 16/22/24
  veiled: string[];                                     // what the LLM must not assert (20)
}
```

### 6.1 Sub-agent alignment

Each council role (`43 §4.2`) receives the envelope **scoped to its mandate**, and the UDV is
projected per role rather than passed whole:

| Role | Receives | Must not receive |
|---|---|---|
| Scenario catalyst (foreground) | the full envelope | — |
| Narrative/voice sub-agents | preference + analogy + purpose | developmental numbers, aversions *content* (only the veto list) |
| Assessment sub-agents | developmental + catalyst target | interest graph, purpose statements (grading is evidence-only, `42 §1.1`) |
| Curriculum/teacher sub-agents | developmental + depth + purpose (as transfer targets) | analogy internals (they must not teach in the player's domain) |
| Safety sub-agents | aversions + crisis signals | interest graph, analogy |

The rule behind the table: **the more metric-bearing the role, the less of the UDV it may see.**
Personalization is a rendering concern; measurement must remain blind to it, or relevance leaks into
assessment.

---

## 7. The engagement contract (the "hook")

The design goal is **sustained voluntary return**: the player comes back because the practice
evidently works and evidently speaks their language. `09 §2.4` already forbids variable-ratio
rewards for progression, and `AGENTS.md §5.7` states the standard — addictive through the felt sense
of growth, not dopamine manipulation. This section converts that standard into an auditable test.

### 7.1 Allowed mechanisms

| Mechanism | Why it is legitimate | Where it binds |
|---|---|---|
| **Growth legibility** — the player can *see* their trajectory | the reward is the actual product | `33`, `25` |
| **Autonomy** — genuine choice with visible consequences | `16 §4` free will is a design commitment | `16 §4.2`, `19` |
| **Competence** — challenge matched to the growth edge | the practice's core mechanic | `08`, `16 §6.4` |
| **Relatedness** — NPCs and cohorts that know the player | genuine social field, not simulated obligation | `18 §2`, `38` |
| **Curiosity gap** — an opened question the player wants to close | intrinsic, self-terminating | `15 §`, `22 §4` |
| **Identity congruence** — "this is the person I am becoming" | self-authored, not sold | `16 §5`, `39` |
| **Analogical resonance** — the material speaks their language | §5.4 the entire point of this document | §5.4 |
| **Narrative transportation** — the world is interesting | authored quality, not a lever | `18`, `21` |

### 7.2 Forbidden mechanisms (executable checks, not sentiments)

- **Variable-ratio reward** on anything developmental. Cosmetic loot and scripted narrative beats
  only (`09 §2.4`).
- **Loss aversion / streak punishment** — no decaying streak, no "you lost your progress" framing.
  Theta-decay (`25`) is a *world* property and must never be surfaced as a threat.
- **Artificial scarcity and FOMO** — no time-limited encounters, no expiring offers.
- **Dark-pattern notifications** — no guilt framing, no "your NPCs miss you", no countdown.
- **Engagement-maximizing objectives** — session length is never a target (`09 §4` sets the default,
  the player sets the actual).
- **Personalization against stated purpose** — using the interest graph to retain a player *away*
  from the development they asked for.
- **Manufactured parasocial obligation** — an NPC may not be scripted to suffer from the player's
  absence in order to produce return.
- **Analogical falsification** — bending a concept's structure to fit a preferred domain (§5.4).

### 7.3 The two tests (the enforcement of §7.2)

Any mechanism that increases return must pass both:

1. **Endorsement test.** Shown a plain description of the mechanism and its effect, would the player
   endorse it? (Not "would they fail to object" — would they *endorse* it.)
2. **Reversal test.** If the mechanism were publicly the headline feature of this product — in a
   newspaper, to a clinician, to the player's own child — would the design survive the sentence?
   *"This contemplative practice is designed to keep you here by …"* — if the sentence is
   uncomfortable, the mechanism is out.

Both tests are recorded per mechanism in the implementation's engagement register, and the failure
class is `MY-RG-0017`.

---

## 8. Failure modes

| Failure | Mechanism | Countermeasure |
|---|---|---|
| **Filter bubble** | pooling narrows to the familiar; variety collapses | analogy rotation + `noveltyBudget` (§5.4); `11`'s modality spread |
| **Comfort drift** | preference outranks the growth edge | `16 §6.4` growth-edge bias; §7.2's last item |
| **Analogical falsification** | a pretty analogy teaches the wrong structure | structural fidelity + scoring on `C` (§5.4) |
| **Consent erosion** | fields accrete from observation until the UDV is a covert profile | §3.1 rules 1 and 3; purpose-scoped projections only |
| **Assessment leakage** | relevance leaks into grading | §6.1 scoping rule (metric-bearing roles see least) |
| **Veil violation** | the bridge reveals the assessment | `20`; the bridge carries metaphor and stakes, never scores |
| **Manipulation drift** | retention mechanics accrete one plausible step at a time | §7.2 + §7.3 tests as a standing gate (`MY-RG-0017`) |

---

## 9. Principles served

Principles **1, 3, 5, 6** — the practice is delivered in the player's own language (1), without
exploiting the machinery that knows them best (3), with the developmental need always outranking the
preference (5), and with the player able to read, edit and export the model of themselves that drives
it (6).

---

## 10. Open questions

- **Pooling at scale.** How large may a library grow before semantic retrieval needs an index
  artifact rather than a scan? (The house `Corpus` is a full-scan BM25 over 647 documents; three
  libraries at 10⁴ entries will require an index.)
- **Embeddings and determinism.** A provider-backed embedding breaks the kernel's determinism
  guarantee unless the vector is frozen per encounter. Does the pooled set need to be *persisted*
  with the encounter, so a replayed session pools identically?
- **UDV inference boundary — resolved 2026-09-20 (`47 §3`, `MY-AD-0022`).** The line is the
  **evidence tier**: T1 may become a field of record, T2 may only bias ranking and select a scaffold,
  T3 is never persisted. The tier is a property of the *distinction* rather than of the inference
  method, which is what makes it auditable — `47 §9` lists the checks.
- **Novelty budget calibration.** What fraction of encounters must introduce a new domain before
  rotation feels disruptive rather than invigorating? Unresolved; needs play data.
- **Scenario template shape enforcement.** §2's invariant needs a linter (a schema gate) before the
  template library can be authored at volume.
- **Cross-cultural analogy.** Fluency domains are culture-laden; a domain fluent for one player is
  exotic or offensive to another. The bridge needs the same cultural-review discipline as `11`.

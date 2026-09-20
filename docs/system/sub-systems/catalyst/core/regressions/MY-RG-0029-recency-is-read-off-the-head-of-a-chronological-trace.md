---
ID: MY-RG-0029
Title: "Recency is read off the head of a chronological trace"
Status: Active
Date: 2026-09-20
Organ: catalyst
Severity: low
Source: foundations/24-encounter-scheduler §3.3
Description: "world.recentEncounters is ordered oldest-first and recency is its TAIL: the generator reads slice(-3) and slice(-2). A consumer that reads slice(0, 3) implements the inverse rule and prefers exactly what the player has just been doing, while the code reads as correct because both spellings look like 'the last few'."
Related: [MY-RG-0023, MY-AD-0025]
---

## The failure

`world.recentEncounters` is **chronological — oldest first**. Every recency read in
`CandidateGeneration` takes the *tail*:

```ts
const last3 = recent.slice(-3);
if (last3.some(r => r.line === holon.line && r.stage === holon.stage && r.modality === modality)) continue;
const last2 = recent.slice(-2);
```

The new `24 §3.3` tie-break comparator, written from the same canon sentence ("prefer a different
modality from the last 3 encounters"), read the **head**:

```ts
const recentModalities = trace.slice(0, 3).map(e => e.modality);   // wrong end
```

Both spellings read as "the last few". One implements the rule and one implements its inverse: on a
long trace the head is the *oldest* three encounters, so the comparator prefers exactly what the
player has already moved past — the opposite of novelty — and it did so deterministically and
invisibly, because there is no failure mode other than a subtly wrong order.

## Why the gates missed it

The rule has no observable that breaks. A ranking is produced either way, every candidate is still
considered, and the only signal is preference among candidates the generator already considered
interchangeable. It was caught by reading the neighbouring consumer's own convention rather than by
any assertion.

## The guard

The direction is now recorded where the read happens, so the next reader of this function inherits
the convention instead of re-deriving it:

```ts
// world.recentEncounters is CHRONOLOGICAL (oldest first) — the generator reads recency off its
// tail (`slice(-3)` / `slice(-2)`), so "the last 3" is the last three ELEMENTS. Reading the head
// here would have inverted the rule and made the tie-break prefer what the player had just been
// doing.
```

`tests/engines/EncounterScheduler.test.ts` asserts the rule through `rankCandidates` with a
three-entry trace in which the newest entry is *last*, so a head-read fails the test.

## The wider rule

An ordered collection has no self-describing direction. When you add a second consumer of a
sequence, read how the first one traverses it — the convention is in the code, not in the name.

## Related

- `24 §3.3` — tie-breaking rules, and the rule order this comparator implements
- `MY-RG-0023` — the removed additive `diversityBonus`, whose job this comparator took over


<!-- 2026-09-20: link to the removed diversity bonus whose job the comparator took over (recon ba28734641) -->

<!-- 2026-09-20: Source must name a resolvable document path (DG15); link to the removed bonus the comparator replaced (recon ee7385c595) -->

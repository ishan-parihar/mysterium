# Implementation plan — remaining UI/UX work

Derived from driving all 28 routes in a browser (fresh visitor + populated save) and ingesting
`docs/foundations/*` against the tree, 2026-09-30. Every claim below was measured in this repo; the
evidence line says how. Nothing here is inferred from a document.

## Status of what shipped today

| Commit | Fix | Browser evidence |
|---|---|---|
| `354db2b` | `/calibrate` wrote a key no reader uses → player could not reach `/play` | `/play` rendered the seeded world instead of redirecting |
| `d6c2e48` | 2 more bare-key writers (`/journal`, `/recover`); probe options 2&3 collapsed to the same stage; Card mouse-only; double-click minted two profiles | Cognitive read **Amber** not Red; 5 named buttons on `/play`; Enter opened an encounter; 3 same-tick clicks → 1 key |
| `e4b73f7` | WebUI never called `endSession`; added G57 reachability gate | `totalSessions` 0 → 1 on leaving `/play`; unlinking `/diagnostic` turned G57 red naming it |

---

## P1 — Correctness defects in work shipped today

### 1.1 My threshold fix contradicts the contract three lines above it
**Measured.** `calibrationPrompts.ts:71` declares `// Index 0 = Red level, 1 = Amber level, 2 =
Orange level`. My `[1.75, 2.4, 3.1]` resolves to **Magenta, Red, Amber**. I fixed the collapse and
missed the documented intent — the values are wrong, not merely collapsing.

**Fix.** Realize the declared contract against each line's own map. Per map, `t0 ∈ [Red, Amber)`,
`t1 ∈ [Amber, Orange)`, `t2 ∈ [Orange, Green)`:
- EMOTIONAL (Red 2.5 / Amber 3.2 / Orange 4.0 / Green 4.8) → `[2.6, 3.4, 4.1]`
- COGNITIVE (Red 2.2 / Amber 2.8 / Orange 3.5 / Green 4.5) → `[2.4, 3.0, 3.8]`

`ThresholdDiscrimination.test.ts` additionally asserts **option `i` yields exactly the declared
stage per line** — the contract directly, not the property I originally chose. The old `[2,2.5,3]`
is the failing negative control. Mutation-prove: revert one line's values, confirm that line's
assertion goes red naming the wrong stage.

### 1.2 `endGameSession` never syncs `gameStore`
**Measured.** `gameEngine.ts:499-501` calls `setSignificator(newSig)` + `debouncedSync(newSig)` after
every consequence. `endGameSession` writes `closed.sig` to `engineStore` and disk only. `/journal`,
`/profile` and the nav read `gameStore`, so **theta decay and the Choice outcome persist correctly but
display stale until a reload** — the exact store-says-one-thing shape this session has fixed twice.

**Fix.** Mirror lines 499-501. Test: store a `gameStore` significator, call `endGameSession`, assert
`get(gameStore).significator` carries the new `totalSessions`. Mutation: delete the
`setSignificator` call → red.

### 1.3 `flushEngine` has zero callers — a tab close still loses the session
**Measured.** `grep` for `flushEngine` outside its definition returns nothing. The session boundary
added in `e4b73f7` fires on the Menu button; closing the tab is the same absence by a different exit,
and this repo's recurring class is precisely *the exit nobody wired*.

**Fix.** `beforeunload` → `endGameSession()` in `/play`. Be honest in the comment: an async write is
not guaranteed to complete during unload, so this is best-effort and the real guarantee is that
**every completed encounter is already persisted** (which it is — `applyResponseOnly` saves on
completion). The session summary is what unload cannot guarantee. Decide whether to wire it at all
after stating that; the defensible default is to wire it and say what it does and does not buy.

### 1.4 `event.repeat` — holding Space re-fires `startEncounter`
**Measured.** `cardActivation.ts` has no `repeat` guard. On `/play` a card opens an encounter; holding
Space re-fires it continuously.

**Fix.** `if (event.repeat) return;` first in `cardKeydown`. Test: dispatch `keydown` with
`repeat: true` → handler not called. Also change `onclick?.(event as unknown as MouseEvent)` to
`onclick?.()` — `onclick?: () => void` declares no argument, and `/play`'s Skip handler does
`e.stopPropagation()` on a *click* event that never happens on the keyboard path.

### 1.5 Duplicate `gameStore` import (M8)
**Measured.** `play/+page.svelte:28` and `:30` both import from `$lib/stores/gameStore.js`. Merge.

---

## P2 — A11y and honesty

### 2.1 Encounter-card accessible names include "Skip" and badges
**Measured.** The card's accessible name is its entire text: `Warmup Deterministic The Viper Tactician ·
strategist-rival … Skip`. A screen reader announces the action label as part of the control's name.

This is **operability (fixed) vs intelligibility (open)** and they are different claims. Fix by giving
the card an explicit `aria-label` naming the encounter, keeping the visual text unchanged. Test: the
a11y tree shows the name without "Skip".

### 2.2 G55's pass message under-reports what it verifies
**Measured.** G55's message names only the template half; it also scans the glossary corpus. A gate
that under-reports invites a reader to trust it more than it deserves.

### 2.3 CI has no assertion for the 9-term player glossary
The browser check is not repeatable. Assert in `GlossaryCorpus.test.ts` that the player-audience set
is exactly the 9 player terms and no advanced term leaks in.

### 2.4 `CardKeyboard`'s source assertions are formatting-coupled
Lines matching `/onkeydown=\{onKeydown\}/` go red on a formatter pass, and the pressure will be to
weaken them. Assert the **import** (`from './cardActivation.js'`), which is the stable binding.

---

## P3 — The five canon dashboard views

`33 §4.2` names ten components; six were missing. Knowledge Map (View 1) shipped in `bede9e0`. Four
remain, and **the data exists** — this is presentation debt, not a model gap:
`CurriculumHolon.prerequisites` (edges), `dev.primaryLine` + `dev.secondaryLines` (View 2's
cross-domain link, which canon names specifically), `ConceptState.depthHistory` + `lastReviewedAt`
(View 3's timeline).

- **View 2 `DevelopmentalRadar`** — extend `/profile`'s existing inline SVG radar with per-line
  curriculum depth. `33 §4.2:253` names it "extension of existing radar component with curriculum
  data".
- **View 3 `LearningTrajectory`** — plot `depthHistory` against `lastReviewedAt`.
- **View 4 `StudyPlanner`** — `learningPath` already orders by unmet prerequisites.
- **View 5 `IntegrationMap`** — `internalizedHolons` + `shadows` already on the Significator.

Each gets its own test, and each is mounted in a browser before it counts. `KnowledgeMap` still has
no test — its pure layout logic (`depthOrdinalFor`, `placed`, `gapIds`) is testable and should be
first, since View 2–5 will copy its shape.

**Sequencing note.** Views 2–5 are the largest feature debt and the least urgent: nothing is broken
without them, and the deploy blocker below makes them un-shippable anyway. Do P1/P2 first.

---

## P4 — Verification debt

- **`/diagnostic` never browser-verified.** Linked into Settings; renders CCI dimension bands (open
  register per 20 §11.1). `:57` carries a `ponytail:` noting CCI+theme is deferred to avoid an engine
  import — so what it *does* render must be confirmed, not assumed.
- **`/curriculum` and `/curriculum/progress` seeding race.** `/knowledge` seeds idempotently; these
  two still read the registry in their own `onMount`. My `bede9e0` commit message claims "one boot
  path for every route" — that is **overstated** and must be corrected.
- **G57 self-link hole.** The gate scans all 66 `.svelte` files including `src/routes/**`, so a route
  satisfied only by another route's template counts as linked. Exclude `src/routes/**` from the
  haystack, or a page can self-satisfy. Prove: unlink one of the four orphans, confirm red.
- **`HoldProbe.svelte` — 0 importers.** `scoreHoldProbe` and `CalibrationRun` are built and tested;
  the component is orphaned. Mount it on `/calibrate` (the page already runs hold probes) or record
  it as deliberately unmounted with the reason.
- **`checkTermUnlocks` — 0 callers.** Check `scripts/` and the CLI before changing its loop; if
  genuinely uncalled it is a documented in-vitro surface, and the honest move is to wire it or say
  so, not to quietly broaden its semantics.
- **`inferAltitudesFromAnswers` — unused.** `/calibrate` uses `QuickCalibrationScoring`. Dead module
  or live? Decide and delete or wire.
- **Process-global `DirectorAgent`** (`src/lib/server/agentRegistry.ts`) — two concurrent players
  share calibration state; traps until process restart. Real on Workers.

---

## P5 — Release blockers (unchanged, not code work)

- **Cloudflare account mismatch.** `wrangler whoami` authenticates as
  `the.understrata@proton.me`; the project lives under `ishanbestdabang@gmail.com`
  (`c0798019f…`). After re-auth, `pages project list` must show **ONLY** `mysterium` before deploying.
  Seven commits are unpushed to production.
- **CNAME** for `mysterium.ishanparihar.com` needs a token with `Zone:DNS:Edit` on `ishanparihar.com`.
- **GitLab push exits 128** (credential-blocked, C6). §7.5 requires both remotes.
- **Credential rotation** (user): `sk-R5OM…` (opencode.zen), `HkKPyYJivQ…` (lifeos Cloudflare).

---

## Recommended order

1. **P1** — 1.1 and 1.2 are wrong behaviour shipped today; 1.3–1.5 are small.
2. **P2** — cheap, closes honest-reporting and a11y-intelligibility.
3. **P4** — the two corrections to my own commit claims (curriculum seeding, G57 self-link) matter
   more than the rest: a record that overstates what shipped is how the next session redoes or
   wrongly trusts work.
4. **P5** — deploy unblocks everything above; the user owns the credential work.
5. **P3** — largest, least urgent, blocked on nothing but time.

## Standing rules for this work

- **Mutation-prove red against the real defect before claiming teeth** (MY-RG-0010). Every test here
  was, and the mutations are named per item.
- **A gate that cannot fail measures nothing.** Every new assertion carries a negative control.
- **`svelte-check` is the only gate that reads `.svelte` files** (`tsconfig` covers `tests/**` and
  `scripts/**`, which is why `tsc` caught the `RecentEncounter` fixture too). Run it even when
  `tsc rc=0`.
- **Never assert a number the tree can contradict** — prefer measured output over prose, and correct
  the record when a measurement contradicts it.

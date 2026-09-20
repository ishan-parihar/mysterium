# Docs Restructuring Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the entire `docs/` tree so that every file accurately describes the current system (Mysterium — a contemplative practice for evolution), no file references dead systems (ATB combat, PlayerProfile, Phaser), and successor AI agents can onboard without confusion.

**Architecture:** Three-phase approach: (1) Archive dead files, (2) Rewrite stale meta docs, (3) Create missing architecture docs. Each phase produces a clean, committable state.

**Tech Stack:** Markdown documentation only. No code changes.

## Global Constraints

- Every document must carry the six required headings from REQUIREMENTS.md (Purpose, Scientific basis, Game-design mapping, Architectural contract, Open questions, Principles served)
- The naming "Mysterium" is canonical (renamed from CCRPG on 2026-07-24)
- The theoretical substrate in `foundations/` (37 files) is EXEMPT from rewriting — it is accurate and timeless
- The concept-drafts (512 files) are EXEMPT — they are accurate
- All file moves use `git mv` to preserve history
- Every phase ends with a commit + push to both remotes
- Run `python3 skills/workspace-lint/scripts/workspace_lint.py --root .` after each phase

---

## Phase 1: Archive Dead Files

Move all superseded, dead, and redundant files to organized archive subdirectories. This is pure file moves — no content changes.

### Task 1.1: Create archive subdirectories

- [ ] **Step 1: Create archive subdirectories**

```bash
cd /home/ishanp/Documents/GitHub/MY-PROJECTS/CCRPG
mkdir -p docs/archive/atb-combat
mkdir -p docs/archive/old-audits
mkdir -p docs/archive/old-plans
mkdir -p docs/archive/old-agentic
mkdir -p docs/archive/old-frontend
mkdir -p docs/archive/old-profiling
mkdir -p docs/archive/old-efficacy
mkdir -p docs/archive/old-holoos
mkdir -p docs/archive/old-superpowers
```

- [ ] **Step 2: Verify directory structure**

Run: `find docs/archive -type d | sort`
Expected: 9 new subdirectories plus the existing 6 archived files

### Task 1.2: Archive superseded red-team audits

- [ ] **Step 1: Move 5 superseded red-team audits**

```bash
cd /home/ishanp/Documents/GitHub/MY-PROJECTS/CCRPG
git mv docs/RED-TEAM-AUDIT.md docs/archive/old-audits/
git mv docs/RED-TEAM-AUDIT-2.md docs/archive/old-audits/
git mv docs/RED-TEAM-AUDIT-CATALYST-TRAJECTORY.md docs/archive/old-audits/
git mv docs/RED-TEAM-AUDIT-CURRENT-STATE.md docs/archive/old-audits/
git mv docs/RED-TEAM-AUDIT-FULL-FLOW.md docs/archive/old-audits/
git mv docs/GAMEPLAY-MODES-AUDIT.md docs/archive/old-audits/
```

- [ ] **Step 2: Move superseded ponytail audit**

```bash
git mv docs/audits/PONYTAIL-AUDIT.md docs/archive/old-audits/
```

- [ ] **Step 3: Verify**

Run: `ls docs/RED-TEAM-AUDIT* docs/GAMEPLAY-MODES-AUDIT* 2>&1`
Expected: "No such file or directory" for all

### Task 1.3: Archive root-archive files (36 files)

- [ ] **Step 1: Move old plans**

```bash
cd /home/ishanp/Documents/GitHub/MY-PROJECTS/CCRPG
git mv docs/root-archive/MVP-BLUEPRINT.md docs/archive/old-plans/
git mv docs/root-archive/UNIFIED-IMPLEMENTATION-PLAN.md docs/archive/old-plans/
git mv docs/root-archive/GOLD-STANDARD-PLAN.md docs/archive/old-plans/
git mv docs/root-archive/ROADMAP.md docs/archive/old-plans/
```

- [ ] **Step 2: Move old agentic audits**

```bash
git mv docs/root-archive/AGENTIC-ARCHITECTURE-PLAN.md docs/archive/old-agentic/
git mv docs/root-archive/AGENTIC-LOOP-AUDIT.md docs/archive/old-agentic/
git mv docs/root-archive/AGENTIC-SYSTEM-AUDIT.md docs/archive/old-agentic/
git mv docs/root-archive/AGENTIC-SYSTEM-AUDIT-ROUND2.md docs/archive/old-agentic/
git mv docs/root-archive/AGENTIC-SYSTEM-AUDIT-ROUND3.md docs/archive/old-agentic/
```

- [ ] **Step 3: Move old frontend audits**

```bash
git mv docs/root-archive/CCRPG-FRONTEND-ARCHITECTURE-PLAN.md docs/archive/old-frontend/
git mv docs/root-archive/SVELTE-FRONTEND-AUDIT.md docs/archive/old-frontend/
git mv docs/root-archive/FRONTEND-IMPLEMENTATION-WORKLOG.md docs/archive/old-frontend/
```

- [ ] **Step 4: Move old profiling docs**

```bash
git mv docs/root-archive/PROFILING-SYSTEM-DESIGN.md docs/archive/old-profiling/
git mv docs/root-archive/PROFILING-ARCHITECTURE-AUDIT.md docs/archive/old-profiling/
git mv docs/root-archive/PROFILING-INFRASTRUCTURE-RND.md docs/archive/old-profiling/
```

- [ ] **Step 5: Move old efficacy audits**

```bash
git mv docs/root-archive/EFFICACY-AUDIT-REPORT.md docs/archive/old-efficacy/
git mv docs/root-archive/EFFICACY-PILOT-REPORT.md docs/archive/old-efficacy/
git mv docs/root-archive/EFFICACY-PILOT-REPORT-R2.md docs/archive/old-efficacy/
```

- [ ] **Step 6: Move old HoloOS audits**

```bash
git mv docs/root-archive/AUDIT-HOLOOS-ALIGNMENT.md docs/archive/old-holoos/
git mv docs/root-archive/HOLOOS-DEVIATION-ANALYSIS.md docs/archive/old-holoos/
```

- [ ] **Step 7: Move old UX audit rounds (11 files)**

```bash
git mv docs/root-archive/UX-AUDIT-REPORT.md docs/archive/old-audits/
git mv docs/root-archive/UX-AUDIT-REPORT-R2.md docs/archive/old-audits/
git mv docs/root-archive/UX-AUDIT-REPORT-R3.md docs/archive/old-audits/
git mv docs/root-archive/UX-AUDIT-REPORT-R4.md docs/archive/old-audits/
git mv docs/root-archive/UX-AUDIT-REPORT-R5.md docs/archive/old-audits/
git mv docs/root-archive/UX-AUDIT-REPORT-R6.md docs/archive/old-audits/
git mv docs/root-archive/UX-AUDIT-REPORT-R7.md docs/archive/old-audits/
git mv docs/root-archive/UX-AUDIT-REPORT-R8.md docs/archive/old-audits/
git mv docs/root-archive/UX-AUDIT-REPORT-R9.md docs/archive/old-audits/
git mv docs/root-archive/UX-AUDIT-REPORT-R10.md docs/archive/old-audits/
```

- [ ] **Step 8: Move remaining root-archive files**

```bash
git mv docs/root-archive/AUDIT-REPORT.md docs/archive/
git mv docs/root-archive/AUDIT-USER-MATRIX.md docs/archive/
git mv docs/root-archive/WORLD-BUILDER-AUDIT.md docs/archive/
git mv docs/root-archive/BUGS-AND-GAPS.md docs/archive/
git mv docs/root-archive/PILOT-PERSONAS.md docs/archive/
```

- [ ] **Step 9: Verify root-archive is empty**

Run: `ls docs/root-archive/ 2>&1`
Expected: empty or "No such file or directory"

### Task 1.4: Archive stale superpowers plans

- [ ] **Step 1: Move stale superpowers plans**

```bash
cd /home/ishanp/Documents/GitHub/MY-PROJECTS/CCRPG
git mv docs/superpowers/plans/2026-06-21-upgrade-refactor-plan.md docs/archive/old-superpowers/
git mv docs/superpowers/plans/2026-06-22-immediate-refactor-plan.md docs/archive/old-superpowers/
git mv docs/superpowers/plans/2026-06-21-cli-distribution-plan.md docs/archive/old-superpowers/
git mv docs/superpowers/plans/2026-06-21-tui-operationalization-plan.md docs/archive/old-superpowers/
```

- [ ] **Step 2: Move stale superpowers spec (rename reference)**

```bash
git mv docs/superpowers/specs/2026-06-18-ccrpg-upgrades-design.md docs/archive/old-superpowers/
```

### Task 1.5: Commit Phase 1

- [ ] **Step 1: Stage and commit**

```bash
cd /home/ishanp/Documents/GitHub/MY-PROJECTS/CCRPG
git add -A docs/archive/ docs/root-archive/ docs/RED-TEAM-AUDIT* docs/GAMEPLAY-MODES-AUDIT* docs/audits/PONYTAIL-AUDIT.md docs/superpowers/
git commit -m 'docs: archive 40+ superseded documents

Phase 1 of docs restructuring:
- 5 red-team audits → archive/old-audits/
- 11 UX audit rounds → archive/old-audits/
- 1 gameplay modes audit → archive/old-audits/
- 1 ponytail audit → archive/old-audits/
- 4 old plans → archive/old-plans/
- 5 old agentic audits → archive/old-agentic/
- 3 old frontend audits → archive/old-frontend/
- 3 old profiling docs → archive/old-profiling/
- 3 old efficacy audits → archive/old-efficacy/
- 2 old HoloOS audits → archive/old-holoos/
- 5 misc root-archive files → archive/
- 5 stale superpowers plans/specs → archive/old-superpowers/

All files preserved via git mv for history tracking.'
```

- [ ] **Step 2: Push to both remotes**

```bash
git push origin main && git push gitlab main
```

- [ ] **Step 3: Run workspace-lint**

```bash
python3 skills/workspace-lint/scripts/workspace_lint.py --root .
```

---

## Phase 2: Rewrite Root-Level Meta Docs

Rewrite the 6 core meta documents to accurately describe the current system (Mysterium — contemplative practice, not fighting game).

### Task 2.1: Rewrite `00-vision.md`

- [ ] **Step 1: Write new vision document**

Replace the entire content of `docs/00-vision.md` with:

```markdown
# 00 — Vision

## 1. Purpose

Mysterium is a contemplative practice that uses game mechanics as its delivery vehicle. Every encounter simultaneously diagnoses AND heals/evolves the player across all dimensions of being. It functions as:

1. **A developmental assessment engine** — 64 modules (8 lines × 8 stages), 1,280 items, 7 modalities. Every encounter is a validated developmental assessment.
2. **A complete education replacement** — 5-level holonic curriculum, knowledge graph, 6-level depth assessment, spaced repetition, cross-domain isomorphisms, research pipeline through Ph.D.
3. **A shadow work tool** — 4-quadrant shadow model (Dark-Addiction/Allergy, Golden-Addiction/Allergy), 256 shadow configurations, detection→surfacing→integration mechanics.
4. **A polarity engine** — 64-cell polarity texture catalogue, STO/STS crystallization, harvest mechanics at White stage. Every choice is a polarity signal.
5. **An incarnation architecture** — ONE world with 8 perceptual layers. The world doesn't change—your perception does. Transformation is a layer-shift, not a teleport.
6. **A cosmology** — Law-of-One energy-ray correspondence as canonical metaphysics, mapping the soul's journey through density.

The elevator pitch:

> Mysterium mirrors your inner landscape across all dimensions of being. Every encounter is a catalyst. Every concept is a thread. Every shadow is raw material. The mystery isn't hidden—it's you.

It is a *literal* developmental practice that hides inside a *legitimate* game. The practice honesty makes the play real; the play depth makes the practice survivable. Neither half of the project succeeds without the other.

## 2. Scientific basis

Mysterium sits at the intersection of four mature research traditions:

- **Integral developmental psychology** — Wilber's AQAL framework synthesising Piaget (cognitive), Kohlberg (moral), Fowler (faith), Gardner (multiple intelligences), Loevinger (ego), Goleman (emotional). The game's macro-progression IS the eight stages (Infrared → White / Archaic → Super-Integral).
- **Meta-learning science** — Spaced repetition, forgetting curves, desirable difficulties, interleaving, the testing effect, depth-of-processing theory. The curriculum system replaces formal education with adaptive, depth-aware learning.
- **Shadow work psychology** — Jungian shadow integration, 4-quadrant shadow model (Dark-Addiction/Allergy, Golden-Addiction/Allergy), developmental pathology across 8 lines × 8 stages.
- **Psychophysics of skill acquisition** — The transformed up-down staircase (1-up/2-down rule), which converges difficulty to the player's 70.7% performance threshold, the empirically established sweet-spot for both engagement (flow theory) and neuroplastic gain.

Optional metaphysical / aesthetic layer: the Law-of-One energy-ray correspondence (Red→Violet) which maps cleanly onto the integral stages as a sub-octave pattern. Used in Mysterium **as canonical metaphysics** — see `foundations/06-law-of-one-correspondence.md`.

## 3. Game-design mapping

The vision compresses to one rule:

> **Every gameplay verb must be the gamification of a validated developmental assessment, and every progression milestone must be the demonstration of that assessment at a new altitude.**

The corollary rules:

- A combat encounter is a *probe* — it tests one or more lines at one or more stages, and emits telemetry that updates the player's developmental profile.
- A curriculum concept is a *thread* — it weaves through the 5-level holarchy, deepening from foundational to transformative.
- A shadow encounter is a *forge* — it surfaces psychological patterns and provides the catalyst for integration.
- A polarity choice is a *signal* — it reveals the player's STO/STS crystallization trajectory.
- A transformation is a *layer-shift* — the player's perception of the ONE world deepens, not the world itself.
- A cosmetic / narrative reward never bypasses a developmental gate. There is no pay-to-stage. There is no XP-to-stage. There is only demonstration.

## 4. Architectural contract

The vision dictates the engineering boundaries:

1. **The cognitive-evaluation core is pure TypeScript.** No Phaser, no Capacitor, no Colyseus. It must be runnable from a CLI, a Vitest suite, a future iOS port, a future research-lab desktop variant, or a future web-only build. This is the irreducible asset.
2. **The skill-tree is data, not code.** Adding a new line, a new stage, a new shadow archetype must be a JSON / TS-data change, not a code change.
3. **All cognitive evaluation is server-authoritative in multiplayer.** The client never decides "did you pass the n-back."
4. **All telemetry is opt-in, on-device by default, encrypted at rest, and never sold.** The data is sensitive — it is, in effect, neuropsychometric.
5. **The Veil of Forgetting is sacred.** All mechanics operate invisibly. The player never sees the engine. They experience reflection, not measurement.

## 5. Open questions

- **Curriculum graduation depth.** The 5-level holarchy scales from foundational to Ph.D.-level (~850 holons). Current seed data contains ~50 holons. When does the curriculum "graduate" a player?
- **Shadow integration fidelity.** The 4-quadrant shadow model has 256 configurations. How many must be operational for the system to be considered complete?
- **Multiplayer-as-development.** Some lines (interpersonal, moral) are best trained *between* humans, not against AI. Whether co-op is necessary for full progression, or merely expressive, is unresolved.

## 6. Principles served

Principles **1** (what the game trains), **2** (validity), **4** (earned progression), and **7** (codebase honesty).
```

- [ ] **Step 2: Verify the file reads correctly**

Run: `head -5 docs/00-vision.md`
Expected: "# 00 — Vision"

### Task 2.2: Rewrite `01-first-principles.md`

- [ ] **Step 1: Write new first-principles document**

Replace the entire content of `docs/01-first-principles.md` with:

```markdown
# 01 — First Principles

## 1. Purpose

This document is the *spine* of the research phase. It expands the seven first-principles questions from `REQUIREMENTS.md §1` into stand-alone arguments, with citations, counter-examples, and acceptance criteria. Every later document is, in effect, a long-form answer to one of the seven.

When a design decision is made anywhere in Mysterium, it must be possible to walk it back to one of these seven principles. If it cannot, either the decision is wrong or the principle list is incomplete.

## 2. Scientific basis

The seven principles are not invented — they are the residue of merging five literatures:

| Literature | What it contributes |
|---|---|
| Cognitive-training meta-analyses (Simons et al. 2016, Melby-Lervåg 2016) | The hard truth that *most* brain-training transfer claims are invalid. → Principle 2. |
| Action-video-game cognition research (Bavelier, Green) | The validated finding that action games genuinely improve attention and "learning to learn." → Principle 1. |
| Psychophysical method (Levitt 1971, Cornsweet 1962) | The transformed up-down staircase as the only known way to keep a participant at threshold. → Principle 3. |
| Integral developmental psychology (Wilber, Cook-Greuter, Kegan) | The discovery that lines develop at *different* altitudes within the same person — i.e., progression is *not* a single bar. → Principle 4. |
| Meta-learning science (Bjork, Brown, Roediger) | Spaced repetition, desirable difficulties, depth-of-processing — the curriculum system's scientific foundation. → Principle 8. |

Principles 5 (UX) and 6 (honesty/integrity) are emergent from the intersection — they are the constraints that prevent the science from being discarded by the player or weaponised against them.

## 3. Game-design mapping

### Principle 1 — *What is the game actually training?*

The game must, at all times, be able to answer "right now, this encounter — which line, which stage, which modality?" If the answer is *unspecified*, the encounter is illegal.

**Acceptance criterion:** every module in the 64-module registry carries an explicit `(line, stage, modality)` triple. Any module without one fails review.

### Principle 2 — *How do we know it is training that thing?*

For every cognitive task in the assessment module system, we cite its laboratory analogue, name its established psychometric properties, and specify the in-game parameter band that preserves the construct.

**Acceptance criterion:** the curriculum architecture audit specifies a correlation study design between in-game performance and the laboratory analogue with `r ≥ 0.5` as the bar.

### Principle 3 — *Growth edge without breaking immersion*

The 1-up/2-down staircase converges to 70.7% accuracy. Encounters must keep the player there *without* surfacing the algorithm. The player should feel *challenged*, not *measured*.

**Acceptance criterion:** in playtesting, when asked "did the game feel like it was adjusting difficulty," ≤ 30% of players say yes.

### Principle 4 — *Stage progression must be earned*

A player at apparent Orange (Rational) on the cognitive line but stuck at Red (Power) on the moral line is *not* an Orange player. Stage advancement requires demonstration across **all eight lines** at the relevant altitude.

**Acceptance criterion:** a synthetic player profile with 8/8 cognitive mastery but 1/8 moral or 1/8 interpersonal mastery is *blocked* from advancing by the gate logic.

### Principle 5 — *Multi-line, multi-quadrant on a phone*

The challenge: a phone viewport. The eight-line × eight-stage matrix is 64 cells. We cannot show 64 cells at once.

The chosen solution: *radial altitude chart* — eight spokes (lines), graduated rings (stages). The current "horizon" line shows the lowest line — the developmental bottleneck.

**Acceptance criterion:** new players can identify their weakest line within 10 seconds of viewing the chart.

### Principle 6 — *Honest simulation*

In a single-player context, *the game should still not lie to itself.* If the player exploits a glitch to bypass a cognitive task, the gate must not record a pass.

**Acceptance criterion:** automated adversarial testing of the client→server boundary; any client-spoofed cognitive result is rejected and logged.

### Principle 7 — *Honest codebase*

The `core/` directory imports from no game engine, no native bridge, no networking library. It is portable to any future runtime.

**Acceptance criterion:** `npm test` passes with `core/` mocked of all I/O. A future engine swap requires only changes to `game/` and `infra/`.

### Principle 8 — *Curriculum as education replacement*

The holonic curriculum system must be self-contained, adaptive, and depth-aware. It must replace formal education across all 8 lines of intelligence, scaling from foundational to transformative depth.

**Acceptance criterion:** a player can complete the curriculum without any external educational resource, and the system adapts to their forgetting curve and depth level.

## 4. Architectural contract

These principles compile down to five hard rules at the architectural layer:

1. **Every domain entity has a `(stage, line)` location** or is decorated by one of those at use-time. (Principle 1)
2. **Every cognitive use-case ships with a property-based test demonstrating construct validity.** (Principle 2)
3. **DDA state lives in `core/usecases/`, never in `game/scenes/`.** (Principles 3, 7)
4. **Stage-advancement is a pure function of the player profile.** Any UI that shows progress reads from this function; no UI ever sets stage directly. (Principles 4, 6, 7)
5. **The curriculum system is data-driven.** Adding a new concept, a new depth level, a new learning pathway must be a JSON/TS-data change, not a code change. (Principle 8)

## 5. Open questions

- **Are the eight principles complete?** A reasonable challenge is "where is *fun*?" Fun is implicit in Principles 3 and 5, but the literature on flow distinguishes *enjoyment* from *engagement*. Should we promote fun to Principle 9?
- **Trade-offs between principles.** Principle 6 (honesty) and Principle 5 (UX) frequently conflict — e.g., showing the staircase is honest but immersion-breaking. Each conflict needs a documented adjudication.
- **Falsifiability of Principle 2.** What would convince us the game is *not* training what it claims? The curriculum architecture audit must operationalise this.

## 6. Principles served

This document serves principles **1, 2, 3, 4, 5, 6, 7, 8** — it *is* the articulation of the eight.
```

- [ ] **Step 2: Verify**

Run: `head -5 docs/01-first-principles.md`
Expected: "# 01 — First Principles"

### Task 2.3: Rewrite `02-glossary.md`

- [ ] **Step 1: Write new glossary document**

Replace the entire content of `docs/02-glossary.md` with a glossary that:
- Removes all ATB-era terms (Battler, Bestiary, Boss, Combat verb, ATB, Fill rate, Focus point, Object pool, Skill tree, Stance, Telemetry packet)
- Adds curriculum terms (Holon, DepthLevel, ForgettingCurve, SpacedRepetition, HolonicCurriculum, KnowledgeGraph, Isomorphism)
- Adds shadow work terms (Dark-Addiction, Dark-Allergy, Golden-Addiction, Golden-Allergy, ShadowLedger, CompoundShadow)
- Adds polarity terms (STO, STS, PolarityTexture, PolarityTrace, Crystallization)
- Keeps all existing valid terms (Stage, Line, Quadrant, State, Drive, Ray, Significator, CCI, etc.)

The file should maintain the six-heading structure and the canonical type definitions.

### Task 2.4: Rewrite `03-research-methodology.md`

- [ ] **Step 1: Write new methodology document**

Replace the entire content of `docs/03-research-methodology.md` with a methodology document that:
- Removes references to non-existent docs (architecture/01, combat/02, validation/00)
- Updates the evidence hierarchy for the current system
- Keeps DSR, OMDE, INFORM frameworks (still valid)
- Updates the conflict-resolution procedure for current docs

### Task 2.5: Rewrite `INDEX.md`

- [ ] **Step 1: Write new index document**

Replace the entire content of `docs/INDEX.md` with an index that:
- Reflects the actual directory structure (no references to architecture/, ux/, validation/, roadmap/)
- Adds the new architecture/ section (once created in Phase 3)
- Updates the reading order for the current system
- Removes references to root-archive files

### Task 2.6: Rewrite `REQUIREMENTS.md`

- [ ] **Step 1: Write new requirements document**

Replace the entire content of `docs/REQUIREMENTS.md` with a requirements document that:
- Describes Mysterium as a contemplative practice (not a fighting game)
- Updates the directory tree to reflect actual structure
- Updates canon decisions to reflect current system
- Removes the 87-document plan (never completed)
- Removes ATB references

### Task 2.7: Update `ONBOARDING-REDESIGN-PLAN.md` §5

- [ ] **Step 1: Update integration section**

Edit `docs/ONBOARDING-REDESIGN-PLAN.md` section 5 (Integration with Existing Systems) to:
- Replace `PlayerProfile.altitudes` → `Significator.altitudes`
- Replace `PlayerProfile.rayProfile` → computed from altitudes
- Replace `PlayerProfile.shadows` → `Significator.shadowLedger`
- Replace `Combat DDA` → assessment module difficulty adaptation
- Fix `lineToTaskSlug` mappings

### Task 2.8: Commit Phase 2

- [ ] **Step 1: Stage and commit**

```bash
cd /home/ishanp/Documents/GitHub/MY-PROJECTS/CCRPG
git add docs/00-vision.md docs/01-first-principles.md docs/02-glossary.md docs/03-research-methodology.md docs/INDEX.md docs/REQUIREMENTS.md docs/ONBOARDING-REDESIGN-PLAN.md
git commit -m 'docs: rewrite 7 root-level meta docs for current identity

Phase 2 of docs restructuring:
- 00-vision.md: contemplative practice, not fighting game
- 01-first-principles.md: removed ATB references, added Principle 8 (curriculum)
- 02-glossary.md: removed 15+ ATB terms, added curriculum/shadow/polarity terms
- 03-research-methodology.md: removed references to non-existent docs
- INDEX.md: reflects actual directory structure
- REQUIREMENTS.md: describes current system, not 87-doc plan
- ONBOARDING-REDESIGN-PLAN.md §5: updated integration references'
```

- [ ] **Step 2: Push to both remotes**

```bash
git push origin main && git push gitlab main
```

- [ ] **Step 3: Run workspace-lint**

```bash
python3 skills/workspace-lint/scripts/workspace_lint.py --root .
```

---

## Phase 3: Update Stale Docs & Create Architecture Docs

### Task 3.1: Update lines/*.md (8 files)

For each of the 8 line files (`docs/lines/01-cognitive.md` through `docs/lines/08-interpersonal.md`):

- [ ] **Step 1: Replace "Combat style" column**

In each file's table, replace the "Combat style" column header with "Assessment modality affinity" and update the cell contents to reference assessment modalities instead of ATB mechanics.

Example for `docs/lines/01-cognitive.md`:
- Old: "Spellcasting, planning, n-back, Tower-of-London"
- New: "Deterministic (n-back, planning puzzles), Strategic (multi-step sequencing)"

### Task 3.2: Update stages/*.md (8 files)

For each of the 8 stage files (`docs/stages/01-infrared-archaic.md` through `docs/stages/08-white-superintegral.md`):

- [ ] **Step 1: Replace "Bestiary" sections**

Replace "Bestiary" section headers with "Encounter module archetypes" and update contents to reference assessment modules instead of enemies.

### Task 3.3: Update narrative/00-narrative-architecture.md

- [ ] **Step 1: Replace ATB references**

Replace references to ATB combat, enemies, and Phaser rendering with assessment modules, encounter archetypes, and SvelteKit WebUI.

### Task 3.4: Update progression/00-progression-overview.md

- [ ] **Step 1: Replace XP/level references**

Replace XP, levels, and ATB combat references with demonstration-based progression, altitude shifts, and assessment module outcomes.

### Task 3.5: Create `docs/architecture/` directory with 8 docs

- [ ] **Step 1: Create architecture directory**

```bash
mkdir -p docs/architecture
```

- [ ] **Step 2: Write `docs/architecture/01-overview.md`**

The binding architectural contract. C4 context diagram. Module boundaries. How the 64-module system, curriculum, shadow work, polarity engine, and LLM integration compose into a working system.

- [ ] **Step 3: Write `docs/architecture/02-core-engine.md`**

Significator as sole state vessel. CCI computation. Auto-mode strategy. Encounter scheduler. Theta-decay. The 10 core engines in `src/core/engines/` and how they're wired.

- [ ] **Step 4: Write `docs/architecture/02-encounter-system.md`**

64 modules (8 lines × 8 stages). 7 modalities. AgenticOrchestrator. TaskRenderers. Item selection. The assessment module contract and composition rules.

- [ ] **Step 5: Write `docs/architecture/03-curriculum-system.md`**

5-level holarchy. Knowledge graph. 6-level depth assessment. Spaced repetition. Cross-domain isomorphisms. Research pipeline. The curriculum engine bridge.

- [ ] **Step 6: Write `docs/architecture/04-shadow-work.md`**

4-quadrant shadow model. 256 configurations. Detection→surfacing→integration. ShadowDetector. Compound shadows. Holonic return.

- [ ] **Step 7: Write `docs/architecture/05-polarity-engine.md`**

64-cell polarity texture catalogue. STO/STS crystallization. 4-level aggregation. Harvest mechanics. PolarityTrace.

- [ ] **Step 8: Write `docs/architecture/06-llm-integration.md`**

LLM as voice, not brain. ContextPipeline. ProxiedLLMClient. VeilFilter. FallbackProvider. Streaming interface.

- [ ] **Step 9: Write `docs/architecture/07-persistence.md`**

Significator serialization. AES-GCM encryption. ProfileManager. CryptoStore. Save repository.

- [ ] **Step 10: Write `docs/architecture/08-rendering-layer.md`**

SvelteKit WebUI. CLI. Capacitor. Phaser (legacy). CSS design tokens. Component library.

### Task 3.6: Commit Phase 3

- [ ] **Step 1: Stage and commit**

```bash
cd /home/ishanp/Documents/GitHub/MY-PROJECTS/CCRPG
git add docs/lines/ docs/stages/ docs/narrative/ docs/progression/ docs/architecture/
git commit -m 'docs: update stale docs + create architecture/ directory

Phase 3 of docs restructuring:
- Updated 8 lines/*.md: replaced ATB combat styles with assessment modalities
- Updated 8 stages/*.md: replaced bestiary sections with encounter archetypes
- Updated narrative/00: replaced ATB references with assessment modules
- Updated progression/00: replaced XP/levels with demonstration-based progression
- Created docs/architecture/ with 8 implementation docs:
  - 00-overview: binding architectural contract
  - 01-core-engine: Significator, CCI, AutoMode, Scheduler
  - 02-encounter-system: 64 modules, 7 modalities, AgenticOrchestrator
  - 03-curriculum-system: holonic curriculum, depth assessment, spaced repetition
  - 04-shadow-work: 4-quadrant shadow model, detection→integration
  - 05-polarity-engine: STO/STS crystallization, harvest mechanics
  - 06-llm-integration: LLM as voice, not brain
  - 07-persistence: Significator serialization, encryption
  - 08-rendering-layer: SvelteKit WebUI, CLI, Capacitor'
```

- [ ] **Step 2: Push to both remotes**

```bash
git push origin main && git push gitlab main
```

- [ ] **Step 3: Run workspace-lint**

```bash
python3 skills/workspace-lint/scripts/workspace_lint.py --root .
```

---

## Phase 4: Final Validation

### Task 4.1: Verify no dead references remain

- [ ] **Step 1: Search for ATB references**

Run: `grep -r 'ATB\\|Battler\\|Bestiary\\|Combat verb\\|Fill rate\\|Focus point\\|Object pool\\|Stance\\|Telemetry packet' docs/ --include='*.md' -l | grep -v archive | grep -v concept-drafts | grep -v .memsearch`
Expected: 0 files (or only files in archive/)

- [ ] **Step 2: Search for PlayerProfile references**

Run: `grep -r 'PlayerProfile' docs/ --include='*.md' -l | grep -v archive | grep -v concept-drafts | grep -v .memsearch`
Expected: 0 files (or only files in archive/)

- [ ] **Step 3: Search for references to non-existent docs**

Run: `grep -r 'architecture/01\\|combat/02\\|enemies/04\\|validation/00\\|ux/00' docs/ --include='*.md' -l | grep -v archive | grep -v concept-drafts | grep -v .memsearch`
Expected: 0 files

### Task 4.2: Verify new docs are well-formed

- [ ] **Step 1: Check all new architecture docs have six headings**

Run: `for f in docs/architecture/*.md; do echo "=== $f ==="; grep -c "^## [1-6]\\." "$f"; done`
Expected: each file shows 6

### Task 4.3: Final commit and push

- [ ] **Step 1: Any remaining fixes**

Fix any issues found in validation.

- [ ] **Step 2: Final push**

```bash
git push origin main && git push gitlab main
```

---

## Summary

| Phase | Files Moved | Files Rewritten | Files Created | Commit |
|---|---|---|---|---|
| Phase 1: Archive | 40+ | 0 | 0 | `docs: archive 40+ superseded documents` |
| Phase 2: Rewrite meta | 0 | 7 | 0 | `docs: rewrite 7 root-level meta docs` |
| Phase 3: Update + Create | 0 | 19 | 8 | `docs: update stale docs + create architecture/` |
| Phase 4: Validate | 0 | 0 | 0 | (fixup if needed) |
| **Total** | **40+** | **26** | **8** | **4 commits** |

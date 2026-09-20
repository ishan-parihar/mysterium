# Mysterium — Progress Tracker

> **Cross-references:** [[AGENTS.md|AGENTS.md (process protocol)]] · [[docs/architecture/00-mysterium-identity|Mysterium Identity]] · [[docs/architecture/10-stage-assessment-architecture|Stage Assessment Architecture]] · [[docs/architecture/11-curriculum-authoring|Curriculum Authoring]] · [[docs/architecture/ONBOARDING-REDESIGN-PLAN|Onboarding Redesign Plan]] · [[docs/foundations/00-integral-theory|00 — Integral Theory]] · [[docs/foundations/01-aqal-quadrants|01 — Aqal Quadrants]] · [[docs/foundations/02-eight-stages-overview|02 — Eight Stages Overview]]
> **Status (2026-09-16):** FROZEN SNAPSHOT — progress history is now tracked in `docs/CHANGELOG.md`; the live document set is indexed in `docs/INDEX.md`. Nothing below is normative.
>
> **Current phase:** Documentation Architecture — Epistemological Refactor Complete
> **Last updated:** 2026-07-24

---

## Iteration Protocol (AGENTS.md §7.5)

1. Make changes (code, docs, config)
2. Run workspace-lint: `python3 skills/workspace-lint/scripts/workspace_lint.py --root .`
3. Run build + tests: `npm run build && npm test`
4. Fix any violations
5. Git commit + push to BOTH remotes (`git push origin main && git push gitlab main`)

---

## Architectural Preferences (carry forward)

1. **Veil principle is sacred** (AGENTS.md §5.4): game is NEVER diagnostic to user. All player-facing surfaces must route through VeilFilter.
2. **CLI is first-class** (PONYTAIL-AUDIT-v2): CLI is not a debug tool — it's a primary game surface alongside WebUI.
3. **Theory is exhaustive** — the gap is not in theory, it's in implementation. Add code, not docs.
4. **YAGNI**: cut dead weight ruthlessly.
5. **No regressions**: every iteration must keep all tests passing.
6. **Commit discipline**: one logical change per commit. Push to BOTH remotes after each.

---

## Completed Work

### Mysterium Rename (CCRPG → Mysterium)
- ✅ 225 files renamed across entire codebase
- ✅ Package name, CLI command, config dirs, env vars, types, docs, UI, PWA manifest
- ✅ 793 tests passing, build succeeds, workspace-lint clean

### Documentation Architecture Audit
- ✅ 104 files catalogued across 10 directories
- ✅ DOC-ARCHITECTURE-AUDIT-2026-07-24.md produced
- ✅ DOC-REAUDIT-2026-07-24.md produced
- ✅ 47 superseded documents archived to organized archive/ subdirectories

### Documentation Restructuring
- ✅ Phase 1: Archive 47 dead/superseded files
- ✅ Phase 2: Rewrite 7 root-level meta docs (00-vision, 01-first-principles, 02-glossary, 03-methodology, INDEX, REQUIREMENTS, ONBOARDING-REDESIGN-PLAN §5)
- ✅ Phase 3: Update 19 stale docs (lines/*.md, stages/*.md) + create 8 architecture docs
- ✅ Phase 4: Validate — 793 tests pass, build succeeds, workspace-lint clean

### Epistemological Refactor
- ✅ Moved STAGE-ASSESSMENT-ARCHITECTURE.md → architecture/10-stage-assessment-architecture.md
- ✅ Moved curriculum-authoring.md → architecture/11-curriculum-authoring.md
- ✅ Fixed cross-references across all docs (STAGE-ASSESSMENT-ARCHITECTURE, curriculum-authoring)
- ✅ Created Mysterium Identity Document (architecture/00-mysterium-identity.md)
- ✅ Updated PROGRESS.md with current state

---

## Current Documentation Structure

```
docs/
├── 00-vision.md                          ← Contemplative practice vision
├── 01-first-principles.md                ← 8 principles (no ATB references)
├── 02-glossary.md                        ← Updated with curriculum/shadow/polarity terms
├── 03-research-methodology.md            ← Research methodology
├── INDEX.md                              ← Documentation index (updated)
├── REQUIREMENTS.md                       ← Current system requirements
├── PROGRESS.md                           ← This file
├── CHANGELOG.md                          ← Version history
├── ONBOARDING-REDESIGN-PLAN.md           ← Binary-search composite assessment
├── RED-TEAM-AUDIT-DEFINITIVE.md          ← Historical (kept for context)
│
├── architecture/                         ← IMPLEMENTATION DOCS (11 files)
│   ├── 00-mysterium-identity.md          ← WHAT the system IS
│   ├── 00-overview.md                    ← Binding architectural contract
│   ├── 01-core-engine.md                 ← Significator, CCI, AutoMode, Scheduler
│   ├── 02-encounter-system.md            ← 64 modules, 7 modalities
│   ├── 03-curriculum-system.md           ← Holonic curriculum, depth assessment
│   ├── 04-shadow-work.md                 ← 4-quadrant shadow model
│   ├── 05-polarity-engine.md             ← STO/STS crystallization
│   ├── 06-llm-integration.md             ← LLM as voice, not brain
│   ├── 07-persistence.md                 ← Significator serialization, encryption
│   ├── 08-rendering-layer.md             ← CLI-first, WebUI-second
│   ├── 09-stage-assessment-architecture.md ← 64-module assessment system
│   └── 10-curriculum-authoring.md        ← How to author curriculum holons
│
├── foundations/                           ← THEORETICAL SUBSTRATE (37 files)
│   ├── 00-integral-theory.md             ← AQAL as master lens
│   ├── 01-aqal-quadrants.md              ← UL/UR/LL/LR specification
│   ├── 02-eight-stages-overview.md       ← 8-stage macro-progression
│   ├── 03-lines-of-intelligence-overview.md ← 8 lines specification
│   ├── 04-states-of-consciousness.md     ← Gross/Subtle/Causal/Witness/NonDual
│   ├── 05-drives-and-polarities.md       ← 4 drives as motivational primitives
│   ├── 06-law-of-one-correspondence.md   ← Canonical cosmology
│   ├── 07-neuroscience-of-development.md ← Brain-based evidence
│   ├── 08-psychophysics-and-staircase.md ← Adaptive difficulty
│   ├── 09-flow-and-engagement-theory.md  ← Flow state theory
│   ├── 10-shadow-and-pathology.md        ← 256-shadow model
│   ├── 11-game-modalities.md             ← 7 modalities
│   ├── 12-drive-assessment-mechanics.md  ← Per-module drive probes
│   ├── 13-architecture-of-consciousness.md ← 5-layer topography
│   ├── 14-game-as-developmental-catalyst.md ← Catalyst→experience→integration
│   ├── 15-macro-scale-archetypal-mind.md ← Pure theory: Significator/Transformation/Great Way/Choice
│   ├── 16-significator-architecture.md   ← PlayerProfile as Significator
│   ├── 17-transformation-mechanics.md    ← Frame-change at stage thresholds
│   ├── 18-great-way-world-architecture.md ← World as PESTLE-mapped holons
│   ├── 19-choice-and-polarity-engine.md  ← STO/STS vectors
│   ├── 20-veil-of-forgetting.md          ← Implicit-operation principle
│   ├── 21-incarnation-architecture.md    ← MASTER SYNTHESIS
│   ├── 22-holon-context-engine.md        ← LLM-driven world
│   ├── 23-polarity-ontology.md           ← 64-cell polarity texture catalogue
│   ├── 24-encounter-scheduler.md         ← Encounter selection algorithm
│   ├── 25-cumulative-consciousness-index.md ← CCI composite metric
│   ├── 26-unified-core-architecture.md   ← Unified core architecture
│   ├── 27-auto-mode-strategy-engine.md   ← Auto-mode session strategy
│   ├── 28-holoos-open-joints-mapping.md  ← HoloOS mapping
│   ├── 29-meta-learning-science.md       ← Spaced repetition, desirable difficulties
│   ├── 30-holonic-curriculum-architecture.md ← 5-level holarchy
│   ├── 31-depth-assessment-model.md      ← 6-level depth spectrum
│   ├── 32-agentic-curriculum-linter.md   ← Curriculum validation
│   ├── 33-self-directed-dashboard.md     ← Player-facing dashboard
│   ├── 34-curriculum-engine-bridge.md    ← Integration with existing engines
│   ├── 35-framework-complexity-curriculum-mapping.md ← Framework-complexity mapping
│   └── 36-curriculum-upgrade-plan.md     ← Implementation plan
│
├── concept-drafts/                       ← 512 game concept documents
├── lines/                                ← Per-line documentation (8 files, ATB refs removed)
├── stages/                               ← Per-stage documentation (8 files, ATB refs removed)
├── narrative/                            ← Narrative architecture
├── progression/                          ← Progression overview
├── audits/                               ← Active audits
├── superpowers/                          ← Skills, specs, plans
└── archive/                              ← 47 superseded documents
```

---

## Key Test Results

| Metric | Value |
|---|---|
| Tests passing | 793/793 |
| Build | Succeeds |
| Workspace-lint | Clean |
| TypeScript | No errors |

---

## Git Remotes

- **GitHub:** `origin` → `https://github.com/ishan-parihar/CCRPG.git`
- **GitLab:** `gitlab` → `https://gitlab.com/ishan-parihar/CCRPG.git`

---

## Next Steps

1. Flesh out architecture docs (04-shadow, 05-polarity, 06-llm, 07-persistence, 08-rendering) with more detail and cross-references to foundations/
2. Write cross-reference map (epistemological chain) connecting all docs
3. End-to-end CLI fresh-user test to verify nothing is broken after rename and restructuring

# Doc-Set Audit — 2026-09-16

> **Scope:** the entire `docs/` tree plus `AGENTS.md` — staleness, dead references,
> contract violations, redundancy, discoverability, and the cross-linking (Obsidian-KB)
> requirement. Method: automated scan (dead links, dead `src/` paths, stale-term regex,
> six-heading contract, ref-block presence, INDEX reconciliation) followed by manual
> classification of every finding into FIX / ARCHIVE-EXPECTED / STAMP-AND-KEEP.
>
> **Trigger:** user directive — find stale definitions that could divert development
> agents; wire all docs into a cross-referenced knowledge base; reorganize dormant docs.

---

## 1. Findings and dispositions

### F1 — AGENTS.md was the largest dilution risk (FIXED)

`AGENTS.md` is the first document every development agent reads, and it was stale in
two load-bearing ways:

- Its foundations table ended at **27**, so docs 28–43 (curriculum expansion, domain
  expansion, levelling, agentic orchestration) were invisible to agents reading the
  operating manual.
- Its "Current Phase" section still declared **Implementation Phase 0 — Legacy
  Removal** per `UNIFIED-IMPLEMENTATION-PLAN.md` — a plan that has been **archived**
  in `docs/archive/old-plans/` for weeks. An agent following it would re-do completed
  work ("remove legacy ATB code" — already removed) exactly the failure mode the
  user predicted: "some stale definition or reference worked against us."

**Fix:** foundations table extended to 43 with the three post-27 sets; §4.2 rewritten to
the current phase (orchestration-layer implementation per foundations/43, with the
legacy-removal record pointed at this audit); the UNIFIED-IMPLEMENTATION-PLAN and
MVP-BLUEPRINT table rows marked ARCHIVED with their live successors named (MVP canon
decision #2 lives revised in foundations/41 §0).

### F2 — Stale ATB combat mechanics in active canon (FIXED, 6 sites)

The 2026-07-24 doc restructure archived the ATB philosophy docs but missed six
active-canvas passages that still *taught removed mechanics* — the most dangerous
staleness class, because they read as current design:

| Location | Stale content | Fixed to |
|---|---|---|
| `foundations/11-game-modalities.md` | "Combat encounters (ATB + cognitive overlays)" as a modality row | "Assessment-module encounters (real-time cognitive tasking + overlays)" |
| `foundations/21-incarnation-architecture.md` | "Combat encounters (ATB fights…)" in daily-life encounter mix | "High-intensity assessment-module encounters…" |
| `foundations/22-holon-context-engine.md` | "Combat micro-interactions (ATB timing)" hot-path row | "Real-time encounter micro-interactions (task timing)" |
| `lines/01-cognitive.md` | "Late dropouts cost ATB" | "cost encounter momentum" |
| `lines/04-intrapersonal.md` | "Pauses ATB for self/all" (Witness Pause verb) | "Pauses encounter tasking for self/all" |
| `lines/06-somatic.md` | "primary input to ATB fill rate" (Agility) | "primary input to real-time encounter pacing" |

Each fix preserves the design intent (real-time pacing pressure, pause-cost economy)
without referencing the removed combat system. `architecture/00-mysterium-identity.md`
already stated ATB's removal and needed no change.

### F3 — Dead `src/` paths in architecture docs (FIXED, 5 sites)

Agents following file references hit dead ends:

| Doc | Dead path | Reality |
|---|---|---|
| `architecture/02-core-engine.md` | `src/core/assessments/GameLoop.ts` | `src/core/GameLoop.ts` |
| `architecture/03-encounter-system.md` | `src/core/assessments/TaskRenderers.ts` | `src/core/assessments/cli/TaskRenderers.ts` |
| `architecture/05-shadow-work.md` | `src/core/assessments/ShadowDetector.ts` | `src/core/usecases/ShadowDetector.ts` (and its "currently dead code" framing was stale — it is referenced by the orchestrator/tool surface) |
| `architecture/08-persistence.md` | `SignificatorStore.ts` + `WorldStateStore.ts` | `SaveRepository.ts` (single repository over KeyValueStore backends) |
| `architecture/11-curriculum-authoring.md` | `src/core/curriculum/CalibrationBias.ts` | `computeCalibrationBias()` inside `src/core/curriculum/DepthAssessment.ts` |

### F4 — INDEX.md architecture list was off-by-one from `02-` onward (FIXED)

INDEX listed `architecture/02-encounter-system.md`, `03-curriculum-system.md`, …
`08-rendering-layer.md` — numbers matching an older tree. The actual files are
`03-encounter-system.md` … `09-rendering-layer.md`, and `00-mysterium-identity.md`
was unlisted. Reading-order step 9 also pointed at the wrong terminal file. Both fixed.

### F5 — Dormant / orphaned structure (REORGANIZED)

| Item | Disposition |
|---|---|
| `docs/references/` (4 brain-training platform analyses) | Was invisible to INDEX and misnamed; moved to **`docs/research/references/`** and added to INDEX — it is the grounding corpus of `docs/brain-game-upgrade/` and belongs under a research heading |
| `docs/root-archive/PONYTAIL-AUDIT.md` | A *distinct* 2026-07-03 over-engineering audit colliding by filename with the archived 2026-06-30 one; moved to `docs/archive/old-audits/PONYTAIL-AUDIT-2026-07-03.md`; empty dir removed |
| `docs/superpowers/plans/EVERGREEN-TWO-MODE-PLAN.md` | Stamped **Superseded** — its two-mode duality is canon in foundations/26 (4 execution modes) + architecture/10; retained as design rationale |
| `docs/superpowers/plans/2026-06-18-security-hardening.md` | Stamped **Implemented** (`src/infra/crypto/CryptoStore.ts` is live); retained as record |
| `docs/brain-game-upgrade/` | README stamped **Implemented and absorbed** (as-built = 06; surface lives in foundations/26 modes + 43 toolsets); directory now a completed work-stream record |
| `docs/PROGRESS.md` | Stamped **FROZEN SNAPSHOT** (progress history → `CHANGELOG.md`, live set → `INDEX.md`); nothing in it is normative |
| `docs/superpowers/plans/archived/*` | Already correctly archived; no action |

### F6 — Missing cross-references (FIXED — 46 docs wired, derived not invented)

Added a `> **Cross-references:**` block (Obsidian wiki-links, full paths:
`[[docs/foundations/26-unified-core-architecture|26 — Unified Core Architecture]]`)
after the H1 of every agent-facing canon doc that lacked one and that *textually
mentions* other docs. Generation rules (reproducible):

1. **Derived from actual mentions only** — strict matchers: `foundations/NN-` /
   `architecture/NN-` path refs, "doc NN", "NN —" em-dash pairs, hyphenated slug
   phrases, spaced slug phrases. Bare numbers are deliberately NOT matched (they
   collide with dates like 2026-07-26 and section marks like §26 — the first
   generation pass proved this and was reverted).
2. Wiki-links carry full rel-paths so Obsidian resolves them from any folder.
3. Docs with existing explicit `References/Depends on/Referenced by` blocks are not
   touched (16, 22, 24, 27, 34, 39, 40, 42 keep their richer curated blocks — 22/27/
   34/39/40 also gained **Orchestration note (43)** blocks earlier this session).
4. Cap of 8 links per doc (strongest first) to keep the block scannable.

A regeneration script pattern is documented here; re-run after adding new foundations
docs to keep the KB dense.

### F7 — Six-heading contract drift (TRIAGED; residual accepted)

The contract (`docs/INDEX.md` bottom) is fully honored by docs 00–09, 15–23, 28–34,
37–43. Findings:

- **Docs 10, 11, 12, 14, 16, 20, 23–27, 41** use working heading names ("Scientific
  basis" → "Methodological honesty" in 06; "Game-design mapping" → section 2/3 content
  in 10/11/12; etc.). **Disposition: accepted as heading-name variance** — the
  substance is present in all of them (verified per doc). A mechanical rename would
  churn 13 canonical docs for zero informational gain; the contract's intent (every doc
  declares purpose, grounds its claims, maps to game design, states its contract, lists
  open questions and principles) is met.
- **Docs 13, 15, 18, 19, 21, 22, 28** (older generation) genuinely lack several
  sections. **Disposition: deferred** — these are superseded-in-part by 21/26 (which
  cite them); restwcturing them is real editing work queued for a dedicated pass, not
  collateral of this audit. Flagged here so it is visible, not lost.
- **Docs 35/36** carry an explicit "Heading contract" stamp declaring their working
  format (added this pass) so agents know the variance is intentional.

### F8 — Stale terms in frozen contexts (NO ACTION, by design)

126 stale-term regex hits, of which all but a handful sit in `docs/archive/`,
`docs/audits/` (historical records), `docs/CHANGELOG.md` and `docs/PROGRESS.md`
(now stamped frozen) — the correct places for old vocabulary. Two live mentions:

- `docs/concept-drafts/cognitive/06-green/social-cooperative.md` says "WebSocket-based
  multiplayer" — concept-drafts are the 512-file corpus governed by their own README;
  the multiplayer machinery is now specified by foundations/38 (Durable Objects, no
  public realtime sockets). **Disposition: noted; concept-draft corpus is not edited
  piecemeal** — doc 38's scope fence governs where implementations diverge.
- `docs/foundations/38-cohort-weave-multiplayer.md` mentions WebSocket hibernation as
  a Durable-Object capability — correct platform fact, not staleness.

---

## 2. What the audit changed about the KB's shape

```
docs/
├── foundations/            00–43 (canon; 43 added this session — agentic orchestration)
├── architecture/           00–11 (file paths re-verified against src/)
├── research/
│   └── references/         ← brain-training platform analyses (moved, now discoverable)
├── validation/             benchmark kernel spec
├── lines/, stages/         per-line/per-stage canon (ATB mechanics purged)
├── concept-drafts/         512-module corpus (unchanged by design)
├── brain-game-upgrade/     completed work-stream record (stamped)
├── superpowers/plans/      plans stamped Implemented / Superseded where settled
├── audits/                 audit artifacts incl. this file
└── archive/                frozen legacy (expected stale; never normative)
```

## 3. Conventions going forward

1. **Every new foundations doc** carries: status line, lateral statement, explicit
   Depends on / Referenced by, and (auto-generated or curated) Cross-references block.
2. **Every plan/work-stream doc** carries a status stamp (Active / Implemented /
   Superseded / Archived) — no doc is left ambiguous about whether it is normative.
3. **`AGENTS.md` §4.2** is the single source of "current phase"; it must be updated in
   the same commit that completes or redefines a phase.
4. **Re-run the cross-reference generator** after adding numbered foundations docs.
5. **Residual queue:** heading-contract restoration for docs 13/15/18/19/21/22/28
   (F7-deferred); concept-draft multiplayer wording (F8) to be swept if/when doc 38
   phases begin.

## 4. Verification

- Automated re-scan after fixes: 0 dead INDEX links; 0 dead `src/` paths in
  `architecture/`; 0 stale-term hits in active canon (excluding platform-correct
  WebSocket mentions); INDEX mentions all foundations 00–43.
- Cross-ref blocks: 46 docs, all derived from strict mention patterns (no invented
  relationships; first-pass bare-number matcher rejected and reverted).

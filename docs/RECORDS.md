# Records — decisions (AD) and regressions (RG)

Generated zones below are written by `genome rec emit`; never hand-edit them.
Topic → governing record notes go above the zones.

**The full record set is 71 AD/RG files, in two homes.** The 23 system-wide records live in
`docs/system/core/decisions/` and `docs/system/core/regressions/` and are the ones indexed below.
The other 48 are organ-scoped, under `docs/system/sub-systems/<organ>/core/{decisions,regressions}/`,
and `docs/INDEX.md` § Records (71) indexes all of them — that is the document the `decisions`
card class points at. The ID space is shared and the numbering is contiguous across both homes:
`MY-AD-0001` to `MY-AD-0037`, and `MY-RG-0001` to `MY-RG-0034`. Those two ranges are why the
numbering above the zones names them: `genome rec new` reads this file to find the highest
number ever spent, so it cannot mint an ID that `scripts/arch.py` has already used. When
`scripts/arch.py` mints a record, add its number to the range above — that is the whole
synchronisation between the two writers.
`MY-RG-0030` is organ-scoped, so this module's flat view cannot see it and `genome lint`
reports one W105 for the citation of it in `MY-AD-0005`; the record exists, in
`docs/system/sub-systems/catalyst/core/regressions/`.

<!-- genome:zone records sha=cbcc6500ac85 -->
**Decisions** (13)

| ID | Title | Status | Description |
|---|---|---|---|
| MY-AD-0001 | Assessment-module execution replaces the ATB combat spine | Active | Progression runs on assessment-module execution; narrative frames (including conflict) are delivery vehicles, never the progression mechanism. |
| MY-AD-0002 | Layer rules: core is pure, infra integrates, surfaces consume, content is data | Active | Four layer rules bounding src/core, src/infra, the rendering surfaces and content data. |
| MY-AD-0003 | Vocabulary is owned by foundations/44; the ladder is ratified | Active | One term, one owner, one meaning; the eight stages are KosmOS L1-L8 with a closure that is not a stage. |
| MY-AD-0004 | The objective is continuing development, not the harvest | Active | Continuing progression across all dimensions without residual entropy or shadows; the closure is an emergent horizon, never an optimisation target. |
| MY-AD-0005 | Eligibility is a condition; the closure is an event | Active | checkChoiceEligibility computes a condition; the harvest is the event gated by eligibility AND arrival. The two were conflated. |
| MY-AD-0006 | Register classes: the full metric register is available at any stage | Active | Open vs closed register classes, with the HoloOS D3-Veil divergence recorded and its compensation specified. |
| MY-AD-0007 | One articulation ladder, two registers, no privilege tiers | Active | L0-L7 with AL1-AL6: the same derivation rendered in a self-register and an auditor-register; access is consented traversal, never a credential class. |
| MY-AD-0008 | Objective alignment biases catalyst selection; it never replaces it | Active | AlignmentContract (author, intent, target, deviation band, ceiling) applies through the existing scheduler bias seam, as a bias only. |
| MY-AD-0009 | Two-fold world memory with a per-holon owner worker | Active | Profiling memory and object memory are separate ledgers; each holon has exactly one owning worker (local single writer) and context is handed to the game agent. |
| MY-AD-0010 | One foreground orchestrator; background workers for menial jobs | Active | A single foreground agent owns the user interaction; sub-agents run sessions and report into the cycle; menial work runs as background workers under ratification-only commits. |
| MY-AD-0011 | Human intervention is integrated, not a privileged handoff path | Active | No separate handoff policy: the platform stays one integrated system for user and auditor alike, with no privilege tiers. |
| MY-AD-0012 | Grading is evidence-only; competence and identity never mix | Active | Ladder movement derives only from demonstrated evidence; knowledge-axis measures never feed identity diagnostics. |
| MY-AD-0013 | Documentation is governed as a three-record system | Active | Decisions (AD), regression guards (RG) and a mutation ledger, with a machine-readable structure declaration and fail-closed gates. |

**Regressions** (10)

| ID | Title | Severity | Description |
|---|---|---|---|
| MY-RG-0001 | A one-way migration script looks idempotent and is not | High | doc-stage-reindex.py was applied twice in one pipeline; the second pass re-mapped the correct new stage name and corrupted 194 files. |
| MY-RG-0002 | Stage vocabulary drift (superseded names reappearing in active canon) | High | The retired stage vocabulary (White as a stage, Turquoise as stage 7, stage=density labels) keeps reappearing in new prose. |
| MY-RG-0003 | A document claims authority it does not own | Medium | docs/system/AGENTS.md.md described itself as the binding architectural contract while the ratified hierarchy gives contracts to foundations and sequencing to the plan. |
| MY-RG-0004 | A dormant directory reads as live canon | Medium | Dated directories (agentic-loop/, brain-game-upgrade/, superpowers/, a June red-team audit at the docs root) were navigable as if current. |
| MY-RG-0005 | Canon and code drift apart on a shared vocabulary | Medium | The priority weights in PriorityComputation.ts disagreed with the documented canon (7 criteria vs 8), and the stage re-index renamed docs without renaming the code identifiers. |
| MY-RG-0006 | A ratified policy seam with no consumer (dormant proposals) | High | propose_alignment_adjustment was dispositioned by ratifyProposals but nothing applied it, so an approved policy had no effect. |
| MY-RG-0007 | A lifecycle state machine permits a transition the canon forbids | High | Significator.ts allowed Exploring -> Harvesting directly, bypassing Developing, Crystallizing and Transforming. |
| MY-RG-0008 | Two documents own one formula | Medium | concept-drafts/SCORING-ARCHITECTURE.md and foundations/25 both carried the consciousness-index aggregation formula. |
| MY-RG-0009 | A partial purge leaves the old system's vocabulary in place | Medium | The ATB removal pass updated foundations but missed architecture/10, which kept 'Relationship to Combat' and 'How This Replaces Combat-Only Progression'. |
| MY-RG-0010 | A gate passes because its fixture cannot fail | Medium | Every gate must demonstrably fail on an injected violation, or it is decoration rather than enforcement. |
<!-- genome:end records -->

<!-- genome:zone idmap sha=a7a72b4c9dd0 -->
(no retired records)
<!-- genome:end idmap -->

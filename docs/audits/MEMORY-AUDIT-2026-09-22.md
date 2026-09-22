# Memory Infrastructure Audit — 2026-09-22

**Scope:** every surface of the Phase 11+12 memory integration (commit `301e2cf`) — the MemoryPage
(48 §3), the LocalRetriever (48 §4), the retrieval firewall (48 §5), the checkpoint persistence
path, the feed writers/readers, and the live agentic loop that binds them.

**Method:** line-by-line module read → live-loop trace (CLI boot → restore → encounter → capture →
sessionEnd → page → next boot) → adversarial probes (NaN/Infinity, unicode, zero/negative budgets,
duplicate ids, cross-scope docs, malformed checkpoints, feed idempotency) → findings fixed at
owner → regression tests locking each fix → full battery.

---

## 1. Verdict

**The memory infrastructure was correct in-vitro but incompletely live.** The headline finding
(F0): the three Phase-12 modules — MemoryPage, LocalRetriever, retrieval firewall — passed every
gate and test yet had **zero production callers**. The `[CONTINUITY]` head that 48 §3 promises at
every boot was never rendered into any prompt; retrieval over the 2240-candidate library existed
only inside the G31 gate. This audit closes that gap and seven others; after the fixes, the
memory loop is operational end-to-end and every fix is locked by a regression test.

---

## 2. Findings and fixes

| # | Severity | Finding | Owner fix | Locked by |
|---|---|---|---|---|
| **F0** | **Critical** | **Zero production callers for memoryPage / LocalRetriever / retrievalFirewall** — validated in-vitro, never attached to the live loop. Cross-session memory did not reach the prompt. | `buildEnvelope` now computes the page (`buildMemoryPage`) and returns a `continuity` field, every line `isBandedText`-filtered at the seam (M4 render guard); `AgenticOrchestrator.personalizationContext` carries it; ContextPipeline renders it as `[CROSS-SESSION MEMORY]`, distinct from the in-session `[CONTINUITY]` block. | MemoryAudit W1 |
| **F1** | **High** | **Thread-closing asymmetry (memory fabrication class):** a session with a ratifying verdict did NOT close its `threshold_signal` threads (`pending.every(p => p.kind !== 'threshold_signal')` skip). The verdict is the unit of closure — ratifying a ripening left it "open" forever, fabricating a permanent open thread. | `buildOpenThreads` closes ALL of a session's threads once its verdict exists. | MemoryAudit F1 |
| **F2** | Medium | **Open threads expire by age alone** — ambiguity in the M2 contract (cap vs time culling). | Behavior pinned: threads close only on verdict; `MAX_OPEN_THREADS` is the sole culler (oldest-first). Comment + test. | MemoryAudit F2 |
| **F3** | Medium | **Pluralization garbage:** `${n} ${BAND[kind]}${n===1?'':'s'}` produced "3 a step was takens"-class prose. Appending `s` to a sentence is not pluralization. | `VERDICT_BANDS_PLURAL` table; count shown only when `n > 1` ("3 steps were taken" / "a step was taken"). | MemoryAudit F3 |
| **F4** | **High** | **Veil vocabulary drift (MY-RG-0031 class):** render-path guard (`memoryPage FORBIDDEN`) and recall-path guard (`FORBIDDEN_RECALL_TOKENS`) held DIFFERENT lists — a construction could pass one path and breach the other. | Page `FORBIDDEN` expanded to the recall superset; behavioral lockstep test: every text the recall firewall drops must also be page-audit-flagged. | MemoryAudit F4 |
| **F5** | Medium | **Unbounded feed growth (LM-c):** `captureCheckpoint` serialized ALL entries; a long campaign's `world.json` grows forever. | `MAX_CHECKPOINT_FEED_ENTRIES = 2000` window at capture; the MemoryPage is the compaction layer — older entries' meaning survives in trajectory/threads/stances. | MemoryAudit F5 |
| **F6** | Medium | **ASCII-only tokenizer:** `/[^a-z0-9]+/` silently dropped every non-Latin token — a declared interest "медитация" could never match anything. | Unicode-aware tokenizer (`\p{L}\p{N}` + NFKD fold + combining-mark strip); ASCII semantics preserved (G31 tokenizer check still passes). | MemoryAudit F6 |
| **F7** | Low | Checkpoint round-trip fragility: `captureCheckpoint` omitted empty `proposals`; restored entries then crashed the NEXT capture. | (Fixed during Phase 12 build — G28 caught it.) Serialize-always + restore backfill. | G28 gate |
| **F8** | Low | `read()` is O(n) per call; the page calls it twice; the envelope now runs per encounter. | Measured at cap: page build < 1 ms at 2000 entries. Accepted; noted for revisit if the cap rises. | — |
| **F9** | **Critical (infra)** | **vitest thread-pool race:** suites mutating `process.env.HOME` (MigrateLegacySave) corrupted each other under parallel load — worker threads share `process.env`. Failed only under load; passed isolated; **failed on the pre-audit baseline too** (verified via `git stash`). | `pool: 'forks'` in `vitest.config.ts` — process isolation is env isolation by construction. Full-suite cost stays < 15 s. | full-suite green ×2 |

### Adversarial probes that PASSED (no fix needed)

- NaN/Infinity deltas never render into the page; page on empty feed is valid.
- Retriever: empty corpus; limit 0/negative; duplicate ids across corpus (no double-count in RRF).
- Firewall: raw band dropped (R1), cross-scope dropped (R4), unknown provenance dropped (M3),
  Veil tokens stripped (R3); `assertRecallSafe`-equivalent fail-closed behavior confirmed.
- Feed: duplicate session append idempotent (W4/F3); verdict + worker entries well-formed.

---

## 3. Live-loop trace (post-fix)

```
boot → createOrchestrationServices(world.holons, savedCheckpoint)
     → restoreCheckpoint: F3 replay (windowed ≤2000) + workers + polarity states
     → per encounter: buildEnvelope
         → memoryPageBlock(buildMemoryPage(feed, workers, holons, now))
         → isBandedText per line (M4 render guard)
         → contextInput.continuityBlock → [CROSS-SESSION MEMORY] in the system prompt
     → sessionEnd: W1 session entry + owner-worker drain + polarity advance + G30 verdict
     → captureCheckpoint (2000-entry window) → saveAll(currentSig, currentWorld)
next boot → restored feed replays → page rebuilds → the world remembers
```

---

## 4. Residual risks (declared, not phase-able)

| # | Risk | Disposition |
|---|---|---|
| R1 | `observedInterests` band never reaches pooling — the envelope's only interest producer is the declared band (47 §3's evidence ledger is not yet wired to the UDV input). | Designed feature gap; needs evidence-ledger → UDV-input wiring in a planned change, not a hotfix. Declared so it cannot be silently forgotten. |
| R2 | Page build is O(feed) per encounter. | Acceptable at the 2000-entry cap (< 1 ms); revisit only if the cap rises. |
| R3 | Embedding tier (`EmbeddingProvider`, `semanticRank`) exists but has no runtime consumer. | By design — BM25+recency+graph is the default retriever (48 §4); the pin (MY-RG-0032) exists for when a semantic tier is actually attached. |

---

## 5. Test surface added

- `tests/personalization/MemoryAudit.test.ts` — 12 tests, one per finding (F1–F6, W1 live-envelope,
  F4 lockstep behavioral property, F5 windowing + compaction, W1 cold-start degradation).
- `vitest.config.ts` — `pool: 'forks'` with the race documented in place.
- Adversarial probe suite (transient, this audit) — results recorded in §2.

**Battery at audit close (verified):** tsc clean · 1401/1401 tests green under `pool: 'forks'`
(127 files) · build 0 errors · `arch validate` 0 violations / 23 gates · workspace lint 0 errors
/ 0 warnings. See §6 for the run conditions.

---

## 6. Verification note (2026-09-23, CLOSED)

The full battery initially failed for two environment reasons, both resolved — recorded so the
faults are reproducible and their mitigations durable:

1. **vitest EDQUOT (`Unknown system error -122, write`):** vitest's transform/temp writes failed
   because `/tmp` on this host is tmpfs under a per-user quota — disk space was never the
   constraint (101 GB free). **Mitigation (durable):** run the suite with a disk-backed tmpdir —
   `mkdir -p $HOME/tmp && TMPDIR=$HOME/tmp npm test`. If this recurs in CI, set `TMPDIR` there
   too; no code change is warranted.
2. **Agent terminal broker outage:** the shell was unavailable mid-battery (JSON Parse EOF);
   file-tool work continued, shell work was resumed after recovery. No repository impact.

**Final battery (all verified 2026-09-23):** `npx tsc --noEmit` → 0 errors ·
`TMPDIR=$HOME/tmp npm test` → **1401 passed / 1401** (127 files, `pool: 'forks'`) ·
`npm run build` → 0 TS errors · `python3 scripts/arch.py validate` → **0 violations, 23 gates** ·
`workspace_lint.py` → 0 errors, 0 warnings.

The §2 closing battery line and §7's P0 row reflect the completed run.

---

## 7. Refactor plan — robustness, resilience, operational efficacy

Prioritized; each item names its owner surface and its completion evidence. P0 precedes all
commit activity; P1–P2 are the next development passes; P3+ are declared, not scheduled.

| Pri | Item | Owner surface | Action | Done when |
|---|---|---|---|---|
| **P0** | ~~Unverified battery~~ **DONE 2026-09-23** | repo | Battery completed under the TMPDIR mitigation: 1401/1401 · build 0 errors · 23 gates · lint clean; §6 note closed with real numbers. Ledger receipt; commit + push. | ✅ |
| **P0** | EDQUOT environment fault | `vitest.config.ts` / CI notes | Root-caused to a tmpfs quota on `/tmp`, not code. Durable mitigation documented in §6: run with a disk-backed `TMPDIR`. | ✅ (mitigation recorded; revisit only if CI reproduces) |
| **P1** | R1 — observed-band gap | `sessionRuntime.buildEnvelope` + evidence ledger (47 §3) | Wire the interest evidence ledger's output into `UdvInputs.observedInterests` behind the existing declared-band precedence, keeping the G29 consent firewall (observed ≠ declared, never merged). | Pooling UDV carries observed interests; test proves declared-band precedence and that withdrawing declared interests does not delete observed evidence. |
| **P1** | MemoryPage rendering budget | `memoryPage.ts` | Add a max-line budget to `memoryPageBlock` (defensive cap independent of feed state) so a pathological trajectory can never bloat the system prompt. | Property test: block size bounded under a 2000-entry synthetic feed with maximal threads/stances. |
| **P2** | Retrieval in the candidate path | `sessionRuntime` pooling seam | LocalRetriever is live for memory recall; the 2240-candidate library is still enumerated, not retrieved. Gate candidate shortlisting through `localRetrieve` when the pool exceeds a size threshold (48 §4's scale intent). | Benchmark: shortlist path used above the threshold; selection determinism preserved (stable tie-order). |
| **P2** | Embedding tier activation seam | `LocalRetriever` + MY-RG-0032 pin | Keep local floor as default; add the config-gated hook where `semanticRank` may fuse in, fail-closed to the local floor on any model error, version-pinned per the RG. | Injected-fault test: model throw ⇒ local floor output unchanged; pin check in the gate. |
| **P2** | Page rebuild cost | `memoryPage.read()` | Only if the feed cap rises above 2000: single-pass page builder (one `read()`), or incremental page diffs at capture time. | Benchmark note with the new numbers. |
| **P3** | Cross-process memory store | `captureCheckpoint`/`restoreCheckpoint` | Current continuity rides `world.json`; a crash between sessionEnd and save still loses the last session. Optional: append-only sidecar journal (one line per sessionEnd) replayed before checkpoint restore. | Fault-injection test: kill between sessionEnd and saveAll ⇒ journal replays the session; G28 round-trip still byte-identical. |
| **P3** | Firewall property-based sweep | `retrievalFirewall` | Randomized text corpus (unicode, mixed-band, injection-shaped strings) property: no banded-external token ever survives `filterRecall`. | Property test green over N seeds; added to the Benchmark suite. |

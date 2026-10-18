# platform - organ router

<!-- arch:auto-zone:start -->
### Identity (generated from _org.yaml - do not edit)

- **Organ:** `platform`
- **Rung:** system (`docs/system/sub-systems/platform/`)
- **Contract docs (canon):** *(none - substrate organ)*
- **Code it describes:** `src/core/config`, `src/core/data`, `src/core/events`, `src/core/telemetry`, `src/infra/i18n`, `src/infra/telemetry`, `src/cli`, `src/shared`
- **Records:** `core/decisions/` (AD) - `core/regressions/` (RG)

Route anything here with `python3 scripts/arch.py route <path>`.
Pull the whole bundle with `python3 scripts/arch.py context <code-or-doc-path>`.

### Documents in this organ (auto-discovered — never hand-maintained)

- [documentation-governance-tooling.md](./documentation-governance-tooling.md) — Documentation Governance & Tooling

<!-- arch:auto-zone:end -->

<!-- arch:manual-zone:start -->
### Boundaries and invariants (curated - preserved across emits)

*(not yet curated for this organ)*

### Hand-linked records (hand-linked; kept outside the auto-zone)

- [MY-AD-0014 — The doc set is readable as a map: route resolves code and context emits the bundle](core/decisions/MY-AD-0014-the-doc-set-is-readable-as-a-map-route-resolves-code-and-con.md)
- [MY-AD-0015 — The knowledge-base is queried, not only validated](core/decisions/MY-AD-0015-the-knowledge-base-is-queried-not-only-validated.md)
- [MY-AD-0016 — Relationality is enforced when creating, modifying and validating the knowledge-base](core/decisions/MY-AD-0016-relationality-is-enforced-when-creating-modifying-and-valida.md)
- [MY-AD-0017 — Documentation declares a phase from the tree, never from memory](core/decisions/MY-AD-0017-documentation-declares-a-phase-from-the-tree-never-from-memo.md)
- [MY-AD-0024 — A rung's router must name every document in its rung](core/decisions/MY-AD-0024-a-rung-s-router-must-name-every-document-in-its-rung.md)
- [MY-AD-0027 — A gate is not trusted until it has been shown to fail](core/decisions/MY-AD-0027-a-gate-is-not-trusted-until-it-has-been-shown-to-fail.md)
- [MY-AD-0028 — A ratified law declares its consumer or a tracked deferral](core/decisions/MY-AD-0028-a-ratified-law-declares-its-consumer-or-a-tracked-deferral.md)
- [MY-AD-0032 — Cross-session memory is two deterministic surfaces over committed state](core/decisions/MY-AD-0032-cross-session-memory-is-two-deterministic-surfaces-over-comm.md)
- [MY-AD-0036 — A process-global cache on a multi-tenant request path is a defect by construction](core/decisions/MY-AD-0036-a-process-global-cache-on-a-multi-tenant-request-path-is-a-d.md)
- [MY-RG-0011 — A generated surface drifts and the commit still looks green](core/regressions/MY-RG-0011-a-generated-surface-drifts-and-the-commit-still-looks-green.md)
- [MY-RG-0012 — A declared rung that no gate reads](core/regressions/MY-RG-0012-a-declared-rung-that-no-gate-reads.md)
- [MY-RG-0013 — A verification step mutates the artefact it verifies, or a restore discards unrelated work](core/regressions/MY-RG-0013-a-verification-step-mutates-the-artefact-it-verifies-or-a-re.md)
- [MY-RG-0014 — A declaration claims enforcement that no gate performs](core/regressions/MY-RG-0014-a-declaration-claims-enforcement-that-no-gate-performs.md)
- [MY-RG-0015 — A registry is hand-maintained where the tree could be discovered](core/regressions/MY-RG-0015-a-registry-is-hand-maintained-where-the-tree-could-be-discov.md)
- [MY-RG-0016 — A reference that resolves to nothing passes every gate](core/regressions/MY-RG-0016-a-reference-that-resolves-to-nothing-passes-every-gate.md)
- [MY-RG-0022 — A document omitted from its rung router passes every gate](core/regressions/MY-RG-0022-a-document-omitted-from-its-rung-router-passes-every-gate.md)
- [MY-RG-0024 — A law with no consumer passes every gate](core/regressions/MY-RG-0024-a-law-with-no-consumer-passes-every-gate.md)
- [MY-RG-0028 — A parity harness with a private clock or fixture compares fixtures, not the loop](core/regressions/MY-RG-0028-a-parity-harness-with-a-private-clock-or-fixture-compares-fi.md)
- [MY-RG-0031 — A recall path bypasses the firewalls that guard the render path](core/regressions/MY-RG-0031-a-recall-path-bypasses-the-firewalls-that-guard-the-render-p.md)
- [MY-RG-0032 — An embedding model drifts without a pinned version and a rebuild receipt](core/regressions/MY-RG-0032-an-embedding-model-drifts-without-a-pinned-version-and-a-reb.md)
<!-- arch:manual-zone:end -->

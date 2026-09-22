---
ID: MY-RG-0032
Title: "An embedding model drifts without a pinned version and a rebuild receipt"
Status: Active
Date: 2026-09-22
Organ: platform
Severity: medium
Source: "foundations/48-memory-architecture section 4"
Description: "Pinned model id+version recorded in save; mismatch is a boot error; drift requires explicit rebuild receipt; absent provider degrades to LocalRetriever floor."
Related: []
---

## The failure

An embedding retriever is a dependency on a model artifact. When the model changes — a library
upgrade swaps weights, a re-download replaces the file, a config silently unpins — the same query
against the same corpus returns a different ranking. To the player this reads as the world
subtly forgetting them; to the kernel it is a determinism break (G14): replay of the same save
no longer reproduces the same session context. The class is `MY-RG-0028`'s cousin — an input
disagreement that makes a comparison meaningless — but on the memory axis.

## The guard

**MY-RG-0032** is enforced wherever an embedding provider is constructed:

1. **Pinned identity.** The model id AND version/hash are constants in code, recorded into the
   save when first used; a mismatch between save-recorded and current is a hard error at boot,
   not a warning.
2. **Drift = rebuild, never silence.** A recorded model change requires an explicit rebuild
   receipt (embedding index regenerated, entry appended to the ledger). Silent model replacement
   passes no gate.
3. **Optional means floorable.** The provider absent → `LocalRetriever` alone, flagged in
   telemetry, behavior byte-identical to the no-embedding build (45 §5 degradation law).

Related: [MY-AD-0032, MY-RG-0028]


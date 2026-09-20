---
ID: MY-RG-0014
Title: "A declaration claims enforcement that no gate performs"
Status: Active
Date: 2026-09-20
Organ: platform
Severity: High
Source: "docs/audits/KB-UTILITIES-AUDIT-2026-09-20.md UT-5"
Description: "A file claims that validation enforces something and no gate does, so the claim is worse than silence: it transfers trust. _org.yaml asserted that organ code paths MUST resolve on disk and validate enforces it; no gate did, and the only detector was DG11's mislabelled staleness message whose advice (emit) baked the bogus path into a canonical router and turned the check green. Same class as the gate enable/disable flags that silently did nothing."
Related: []
---

## The regression

A file asserts that validation enforces a rule, and no gate does. This is worse than silence: it
**transfers trust**. A reader who checks the declaration stops checking the thing itself.

**Observed:** `_org.yaml` line 133 — *"`code` paths MUST resolve on disk (`arch.py validate`
enforces)"*. No gate did. Injecting a fabricated code path into an organ (a `src/…` entry that does
not exist) produced these signals and nothing else:

```
✗ DG11: docs/INDEX.md is stale — run `python3 scripts/arch.py emit`
✗ DG11: docs/system/sub-systems/kernel/AGENTS.md auto-zone is stale — run `python3 scripts/arch.py emit`
```

Neither message mentions the code path, and **following the advice makes it worse**: `emit` bakes the
nonexistent path into the canonical router, after which `validate` is green with a fabricated `code:`
entry in a governed document. The detector mislabelled the problem and recommended the action that
hid it.

Same class: the gate enable/disable flags (`dg1_dg1` vs `dg1_frontmatter`) made `enabled: false` a
silent no-op — a fail-*open* default in the component whose job is failing closed.

## Prevention (executable)

- **DG13** (`dg13_organ_integrity`): every organ's `code:` path must exist on disk, every
  `contract_docs` ref must resolve, every organ must declare code and have a router. Proven to fail on
  both injections (bogus code path; bogus contract doc).
- `GATE_CONFIG_KEY` resolves each gate's real config key, so `enabled: false` disables the gate.

## Prevention (procedural)

When a declaration says "X enforces this", the check is: name the gate, run the injection, watch it
fail. If it cannot be made to fail, the sentence is false and must be deleted or implemented — not
left as reassurance.

## References

- `docs/audits/KB-UTILITIES-AUDIT-2026-09-20.md` UT-5
- `docs/audits/RED-TEAM-2026-09-20.md` RT-5a
- `MY-RG-0010` (a gate passes because its fixture cannot fail)

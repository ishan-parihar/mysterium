---
ID: MY-RG-0019
Title: "A static store reasserts itself beside the generated one"
Status: Active
Date: 2026-09-20
Organ: world
Severity: Medium
Source: "docs/foundations/46-generative-world-composition.md section 11"
Description: "A dynamic content architecture degrades into a static one the moment hand-authored entities are faster to ship: the composition pipeline coexists with a hand-written per-stage encounter list, and every new exception is individually reasonable. The mitigation is structural rather than procedural - the store has no entity table to put one in - plus invariant 4 (a facet's tags must resolve in the tag store, so an unknown tag is a compile error rather than a silent drop). Evidence: the Red layer is authored as one TypeScript file per line across nine files, and GAP-WB-4..10 of the archived world-builder audit are still unimplemented."
Related: ["MY-AD-0021", "MY-RG-0015", "MY-RG-0001"]
---

## The regression

A dynamic content architecture degrades back into a static one **the moment a hand-authored entity is
faster to ship than a composition**. No decision is needed for this to happen: a designer needs one
specific NPC for one encounter, writing it directly is an afternoon's work, and the exception is
individually reasonable every single time.

**Already present in the tree.** The Red layer is authored as **one TypeScript file per line across
nine files** (`src/core/world/encounters-red/`) — one stage expressed as hand-written code. And the
archived world-builder audit's `GAP-WB-4…10` remain unimplemented while `GAP-WB-1`, `-2` and `-3`
were wired, so the codebase's world trajectory is *partially* what the archive planned and *nothing*
like what `18`/`22`/`45`/`46` specify.

## Why the usual mitigation fails

The usual answer is "add entities through the pipeline". That is a convention, and a convention loses
to convenience. The mitigation adopted (`MY-AD-0021`) is **structural instead**:

- **There is no entity table to put a hand-authored entity into.** The store holds facets and tags;
  a whole entity has no home, so authoring one requires first building the thing this architecture
  deliberately does not provide.
- **Invariant 4 is a compile error, not a warning:** a facet whose tag does not resolve in the tag
  store fails the build. An unknown tag cannot be silently dropped — which is `DG17`'s lesson
  (a cited record ID that does not exist) applied to content.
- **A tag without an `opposite` is also a compile error** (invariant 2), so the dialectic relation
  cannot rot the way a hand-maintained pairing list would. This is `MY-RG-0015`'s rule — derive what
  can be derived, declare only what cannot — applied to content rather than to a registry.
- **Reconciliation gate.** The facet store is compiler-only from the corpus (§8), so a hand-added
  facet shows up as a divergence at the next reconcile rather than as a mystery at the next play test.

## Early-warning signal

**Composition entropy per line×stage.** If a cell's composed entities collapse onto a small number of
facets, either the facet stock for that cell is thin or hand-authored content has crept in. Either way
the measurement is per-cell and cheap, and it is the thing to watch once the compiler exists.

## References

- `docs/foundations/46-generative-world-composition.md` §1, §8, §11
- `docs/foundations/22-holon-context-engine.md` §7.4
- `MY-AD-0021`, `MY-RG-0015` (a registry hand-maintained where the tree could be discovered)

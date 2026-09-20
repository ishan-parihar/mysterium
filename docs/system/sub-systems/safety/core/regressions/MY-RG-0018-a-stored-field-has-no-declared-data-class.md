---
ID: MY-RG-0018
Title: "A stored field has no declared data class"
Status: Active
Date: 2026-09-20
Organ: safety
Severity: High
Source: "docs/system/sub-systems/safety/ethics-and-data-privacy.md section 2"
Description: "A field of record added without a class has undefined retention and undefined readers, so it defaults to the most permissive interpretation available and is indistinguishable from a covert profile. Every field in the persistence schema belongs to C0-C3 or it does not ship; C1/C2 leave the owning engines only through a registered projection; and no field may be created by writing back a model inference."
Related: ["MY-AD-0020", "MY-AD-0018", "MY-RG-0006"]
---

## The regression

A field of record added without a data class has **undefined retention and undefined readers**. In
practice that does not mean "nobody can read it" — it means the most permissive interpretation
available at the time is used, by whoever needs to ship a feature. The result is a field that no
contract protects and no reviewer can see is unprotected: indistinguishable, in the schema and in
the UI, from a covert profile.

This is the same shape as `MY-RG-0006` (a ratified policy seam with no consumer): the *intent* is
recorded, the *enforcement point* is not, and the gap is invisible because everything still compiles.

## Prevention

- **Every field in the persistence schema declares its class (C0–C3) at the point of definition**, or
  it does not ship. The class is a schema property, not a table in a document, so a new field with no
  class is a build-time defect rather than a code-review question.
- **Projection-only egress.** C1 and C2 leave the engines that own them only through a registered
  purpose-bound projection (`16 §2.4`); a direct read of a C1/C2 store from any other module is the
  violation, not the projection.
- **No inference write-back.** Observed signals may weight ranking; they may never become a stored
  attribute (`45 §3.1` rule 1, `MY-AD-0018`).
- **De-anonymised aggregate is the same class** at report time: a cohort report without its `n` or
  below the `n` floor is a defensive failure of §2.1 rule 2, not a formatting issue.

## What is deliberately not enforced yet

The contract is ratified and the class declaration is specified, but the schema lint (`MY-AD-0020`'s
enforcement point) lands with the persistence layer. Until then this guard is a review obligation,
recorded here so its absence is visible rather than assumed — the failure mode `MY-RG-0014` names.

## References

- `docs/system/sub-systems/safety/ethics-and-data-privacy.md` §2, §2.1, §3
- `docs/foundations/16-significator-architecture.md` §2.1, §2.4
- `MY-AD-0020`, `MY-RG-0006` (a ratified policy seam with no consumer), `MY-RG-0014`

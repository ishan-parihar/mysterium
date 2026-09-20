---
ID: MY-RG-0028
Title: "A parity harness with a private clock or fixture compares fixtures, not the loop"
Status: Active
Date: 2026-09-20
Organ: platform
Severity: medium
Source: foundations/43-agentic-orchestration-architecture §4.4
Description: "A parity gate that drives one path through the production loop and the other through a hand-built imitation proves nothing if the two disagree in their inputs: a local epoch constant two years off the harness's, and a Red-only world against the harness's Infrared/Magenta/Red world, meant the gate was comparing fixtures. It read as green because a separately substituted criterion flattened the differing dimension out of the observable."
Related: [MY-RG-0027, MY-RG-0023, MY-RG-0014]
---

## The failure

The WebUI parity harness exists to prove that the browser binding and the validation kernel drive
**the same loop** — "same persona state ⇒ same encounter sequence ⇒ same observables". It did not
hold that. Two of its inputs disagreed with the path it was supposedly mirroring:

| Input | Kernel harness | Parity harness |
|---|---|---|
| virtual clock | `BENCH_EPOCH = Date.UTC(2026, 0, 1)` | a local `1_700_000_000_000` (2023-11-14) |
| world | 3 stages per line (`Infrared`, `Magenta`, `Red`) | `Red` only |

Theta staleness is a function of `now`, and the encounter set is a function of the world, so the
two "identical" paths were scheduling different encounters — and the gate called that parity. In
one run the kernel produced shadows on `Cognitive/Infrared`, `Cognitive/Magenta` while the browser
produced `Cognitive/Red`, `Spiritual/Red`: different cells, different compound pairs, different
`shadowTopology`.

It read green anyway, because the substituted theta criterion (an unvisited cell scoring maximum
urgency) made every candidate score identically on the dominant term, which flattened the
differing dimension out of the composite the gate asserted on. **Two defects in one formula: one
created the divergence, the other hid it.**

## Why the gates missed it

The harness looked like the stronger of the two fixtures, so nothing invited comparison of their
*inputs* — only their outputs, which agreed. A parity test whose two paths share no clock and no
world is testing two fixtures; the assertion it writes is a coincidence it has no way to detect.

## The guard

One clock and one world, both owned by the kernel:

- `harness.ts` exports `BENCH_EPOCH` and `buildBenchWorld()`.
- The parity test imports both rather than declaring its own; the local calls that built a
  `Red`-only world are gone, and `collectKernelRefs` and `runBrowserBindingSession` now drive the
  same world the trajectory runs on.

The rule this generalises to: **a parity harness may not own a fixture.** If it needs a clock, an
epoch, a world, or a registry, it takes the one the production path takes — a copy is a second
source of truth, and the divergence between copies is invisible precisely because the test
compares outputs rather than inputs.

## Related

- `43 §4.4` — delegation determinism, the same replayability requirement one layer up
- `MY-RG-0027` — the absent-input defect this gate was finally able to catch
- `MY-RG-0023` — the substituted term that masked the divergence


<!-- 2026-09-20: link to the defect it finally caught, the term that masked it, and the gate-fixture law (recon ba28734641) -->

<!-- 2026-09-20: Source must name a resolvable document path (DG15); link the record to its family (recon ee7385c595) -->

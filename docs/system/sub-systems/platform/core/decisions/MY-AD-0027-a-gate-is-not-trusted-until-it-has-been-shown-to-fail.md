---
ID: MY-AD-0027
Title: "A gate is not trusted until it has been shown to fail"
Status: Active
Date: 2026-09-20
Organ: platform
Source: "AGENTS.md section 7.5 step 1b"
Description: "Every governance gate carries one targeted injection in scripts/arch.py GATE_FIXTURES; arch.py fixtures runs them, and a gate without a fixture is reported as unproven rather than assumed good."
Related: []
Consumer: "`scripts/arch.py` (the fixtures verb and GATE_FIXTURES)"
---



<!-- 2026-09-20: DG19: the fixture harness consumes this law (recon 0806ac6546) -->

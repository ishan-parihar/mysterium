/**
 * Validation gates — assertions that the engine MEASURES correctly.
 *
 * Spec: docs/validation/BENCHMARK-ARCHITECTURE.md §6.
 *
 * Two kinds of gates:
 *  - Per-persona expectations: the engine's internal model must agree with the
 *    ground truth encoded in the persona's response policy.
 *  - Population gates: different personas must produce separable,
 *    reproducible, and coherent model states.
 *
 * Gate results carry observed details so failures are diagnosable without a
 * re-run. Hard gates block deployment; soft gates record and warn.
 *
 * **This file is the roster.** The gates themselves were split by family into `gates/` (the
 * module-cohesion audit's item 2): ~50 exported gates sharing one import block read as peers of
 * each other, and a reader looking for "what guards the Veil" had to scan the whole file. Each
 * family file names the gate band it owns and imports only what it uses; this index keeps the
 * public surface unchanged — every consumer still imports from `gates.js`, and the re-export list
 * below is the single place to see which families exist.
 *
 * `roster.ts` is the one family that reads the whole set: `runValidationSuite` IS the order in
 * which the gates run, so a new gate is added there to be run rather than merely to exist.
 */
export * from './gates/plumbing.js';
export * from './gates/roster.js';
export * from './gates/trajectory.js';
export * from './gates/veil.js';
export * from './gates/curriculum.js';
export * from './gates/orchestration.js';
export * from './gates/personalization.js';
export * from './gates/memory.js';
export * from './gates/surface.js';

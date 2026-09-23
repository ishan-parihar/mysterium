/**
 * SessionMode — the session flows the engine can run (plan Phase 14 d4).
 *
 * There are two, and they differ in what the *player experiences*, not in what the engine
 * measures: `direct` poses the question, `story` delivers it through a situated scene. Both
 * run the same encounter pipeline, the same assessment and the same persistence.
 *
 * CANONICAL SOURCE. The list is declared here, not in the CLI, because three surfaces must agree
 * on it: the `--mode` flag's validation, the interactive mode prompt, and the branch that selects
 * the flow. When the CLI owned the list, the prompt could be skipped (`--headless`/`--json`) while
 * the branch stayed hardcoded to one member — an unreachable surface (`CHECKED-SURFACE-AUDIT
 * 2026-09-24` §11 F10). G36 boots every member of this list, so adding a mode without making it
 * bootable fails a gate.
 */
export const SESSION_MODES = ['direct', 'story'] as const;

export type SessionMode = (typeof SESSION_MODES)[number];

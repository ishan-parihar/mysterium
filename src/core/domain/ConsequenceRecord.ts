import type { Drive } from './Drive.js';
import type { Line } from './Line.js';
import type { Stage } from './Stage.js';
import type { ShadowQuadrant } from './enums.js';
import type { PolarityTrace } from './PolarityTrace.js';

export interface HolonDelta {
  readonly holonId: string;
  readonly field: string;
  readonly oldValue: unknown;
  readonly newValue: unknown;
}

export interface ConsequenceRecord {
  readonly encounterId: string;
  readonly timestamp: number;
  /**
   * The line the encounter was ABOUT — the developmental stream this catalyst was delivered into
   * (`ScheduledEncounter.targetLines[0]`). Total, not optional: every encounter is routed to a
   * line, so a record that cannot name one is not a record.
   *
   * It is separate from `altitudeShift.line`, which is present only when a shift actually
   * occurred. Consumers that ask "which dimensions of the inner landscape did this session touch?"
   * (the post-session summary) need the routed line, not the shifted one — reading the shift would
   * silently undercount to the encounters that moved an altitude and report a plausible-but-wrong
   * number, which is exactly the failure this field closes.
   */
  readonly line: Line;
  readonly polarityTrace: PolarityTrace;
  readonly shadowSurfaced: ShadowQuadrant | null;
  readonly shadowResolved: string | null;
  readonly holonDeltas: readonly HolonDelta[];
  readonly altitudeShift: { readonly line: Line; readonly from: Stage; readonly to: Stage } | null;
  readonly driveShift: { readonly drive: Drive; readonly delta: number } | null;
  readonly narrativeSummary: string;
  /** P2-High: Optional developmental feedback (internal, not player-facing). */
  readonly feedback?: string;
  /** P2-High: Optional 10-dim psychometric scores from the agent's evaluation. */
  readonly scores?: Record<string, number>;
}

/**
 * The telemetry event vocabulary — the CLOSED set of kinds a collector may record.
 *
 * `encounter_started` is the start half of the encounter pair. It was emitted by the live loop for
 * as long as the encounter path has existed but was missing from this union, so the kind was
 * unrepresentable: every consumer of the vocabulary was blind to it, and the CLI's emit site could
 * not be type-checked (it sat outside the checked graph — see CHECKED-SURFACE-AUDIT-2026-09-24
 * §10.2). The story path additionally emits `encounter_completed` when the outcome is known;
 * `encounter_started` carries no outcome by construction.
 */
export type TelemetryEventType =
  | 'encounter_started'
  | 'encounter_completed'
  | 'encounter_declined'
  | 'polarity_shift'
  | 'shadow_surfaced'
  | 'shadow_resolved'
  | 'transformation_triggered'
  | 'session_started'
  | 'session_ended'
  | 'user_matrix_summary';

export interface TelemetryEvent {
  readonly id: string;
  readonly type: TelemetryEventType;
  readonly timestamp: number;
  readonly data: Readonly<Record<string, unknown>>;
}

export const ALL_TELEMETRY_EVENT_TYPES: readonly TelemetryEventType[] = [
  'encounter_started',
  'encounter_completed',
  'encounter_declined',
  'polarity_shift',
  'shadow_surfaced',
  'shadow_resolved',
  'transformation_triggered',
  'session_started',
  'session_ended',
  'user_matrix_summary',
];

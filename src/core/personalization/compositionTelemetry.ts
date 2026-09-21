/**
 * Composition telemetry — the runtime record-keeper for the calibration loop.
 *
 * The diversity monitors (`diversityMonitor.ts`) are pure functions over composition events;
 * this module is the stateful wrapper that (a) records events at the composition seam,
 * (b) evaluates the monitors on demand, and (c) retains reports for the development loop's
 * triage (46 §11: a defect must be SEEN and triaged, never thrown at the player).
 *
 * Retention is bounded: events roll off a FIFO cap and reports persist until acknowledged —
 * memory cannot grow unbounded from composition traffic, and a defect cannot silently vanish
 * because it was never read.
 */

import {
  detectScaffoldShareDefects,
  detectVisibilityCollapse,
  type CompositionEvent,
  type DefectReport,
} from './diversityMonitor.js';

export const MAX_EVENTS = 2000;

export interface TelemetryInput {
  readonly cells?: readonly string[];
  readonly scaffoldCeilings?: Readonly<Record<string, number>>;
  readonly now?: () => number;
}

export interface CompositionTelemetry {
  readonly eventCount: number;
  /** Record one composition (called from the runtime seam; never throws). */
  record(event: CompositionEvent): void;
  /** Evaluate both monitors over the retained window; returns the actionable (unacknowledged) set. */
  evaluate(): readonly DefectReport[];
  /** Triage: acknowledge a report so it leaves the pending set (the loop closed the loop). */
  acknowledge(kind: DefectReport['kind'], subject: string): void;
  /** Pending (unacknowledged) reports — what the development loop still owes attention. */
  readonly pending: readonly DefectReport[];
  /** Cells seen in the retained window (for the monitor's scan set). */
  readonly knownCells: readonly string[];
  /** The retained event window, for offline analysis (calibration harness, dev tools). */
  readonly events: readonly CompositionEvent[];
}

export function createCompositionTelemetry(input: TelemetryInput = {}): CompositionTelemetry {
  const events: CompositionEvent[] = [];
  const pending: DefectReport[] = [];
  const now = input.now ?? (() => Date.now());

  return {
    get eventCount() {
      return events.length;
    },
    record(event) {
      events.push(event);
      if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
    },
    evaluate() {
      const cells = input.cells ?? [...new Set(events.map((e) => e.cell))];
      const reports = [
        ...detectVisibilityCollapse(events, cells, now()),
        ...detectScaffoldShareDefects(events, input.scaffoldCeilings ?? {}, now()),
      ];
      // Every (kind, subject) ever raised is remembered for the retention window's lifetime;
      // an acknowledged pair is NOT re-raised by later evaluates (the triage decision stands
      // until the events roll off and the window resets — evaluate() is a sampling, not a
      // re-litigation).
      const known = new Set(pending.map((r) => `${r.kind}:${r.subject}`));
      for (const r of reports) {
        const key = `${r.kind}:${r.subject}`;
        if (known.has(key)) continue;
        pending.push(r);
      }
      return this.pending;
    },
    acknowledge(kind, subject) {
      for (const r of pending) {
        if (r.kind === kind && r.subject === subject) {
          (r as { acknowledged?: boolean }).acknowledged = true;
        }
      }
    },
    get pending() {
      return pending.filter((r) => !(r as { acknowledged?: boolean }).acknowledged);
    },
    get knownCells() {
      return [...new Set(events.map((e) => e.cell))];
    },
    get events() {
      return [...events];
    },
  };
}

import { describe, it, expect } from 'vitest';
import { ALL_TELEMETRY_EVENT_TYPES } from '../../src/core/telemetry/TelemetryEvent.js';
import type { TelemetryEvent, TelemetryEventType } from '../../src/core/telemetry/TelemetryEvent.js';

describe('TelemetryEvent', () => {
  it('ALL_TELEMETRY_EVENT_TYPES contains all expected event types', () => {
    const expected: TelemetryEventType[] = [
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
    expect(ALL_TELEMETRY_EVENT_TYPES).toEqual(expected);
  });

  it('has exactly 10 event types', () => {
    expect(ALL_TELEMETRY_EVENT_TYPES).toHaveLength(10);
  });

  it('TelemetryEvent interface shape is satisfied by a valid object', () => {
    const event: TelemetryEvent = {
      id: 'test-1',
      type: 'encounter_completed',
      timestamp: 1234567890,
      data: { some: 'value' },
    };
    expect(event.id).toBe('test-1');
    expect(event.type).toBe('encounter_completed');
    expect(event.timestamp).toBe(1234567890);
    expect(event.data).toEqual({ some: 'value' });
  });

  it('data field accepts arbitrary key-value pairs', () => {
    const event: TelemetryEvent = {
      id: 'test-2',
      type: 'session_started',
      timestamp: Date.now(),
      data: { nested: { deep: true }, count: 42, list: [1, 2, 3] },
    };
    expect(event.data).toHaveProperty('nested');
    expect(event.data).toHaveProperty('count', 42);
  });
});

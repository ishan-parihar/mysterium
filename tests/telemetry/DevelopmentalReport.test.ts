import { describe, it, expect } from 'vitest';
import { generateReport } from '../../src/core/telemetry/DevelopmentalReport.js';
import { filterOutput } from '../../src/infra/llm/VeilFilter.js';
import type { TelemetryEvent } from '../../src/core/telemetry/TelemetryEvent.js';

function makeSampleEvents(): TelemetryEvent[] {
  return [
    { id: 'e1', type: 'session_started', timestamp: 1000, data: { timestamp: 1000 } },
    { id: 'e2', type: 'encounter_completed', timestamp: 2000, data: { record: 'test1' } },
    { id: 'e3', type: 'encounter_completed', timestamp: 3000, data: { record: 'test2' } },
    { id: 'e4', type: 'encounter_completed', timestamp: 4000, data: { record: 'test3' } },
    { id: 'e5', type: 'shadow_surfaced', timestamp: 5000, data: { shadowId: 's1' } },
    { id: 'e6', type: 'shadow_resolved', timestamp: 6000, data: { shadowId: 's1' } },
    { id: 'e7', type: 'transformation_triggered', timestamp: 7000, data: { signal: 'growth' } },
    { id: 'e8', type: 'transformation_triggered', timestamp: 8000, data: { signal: 'shift' } },
    { id: 'e9', type: 'session_ended', timestamp: 9000, data: { timestamp: 9000, encounterCount: 3 } },
  ];
}

describe('DevelopmentalReport', () => {
  it('generates a report from sample events', () => {
    const events = makeSampleEvents();
    const report = generateReport(events);

    expect(report.generatedAt).toBeGreaterThan(0);
    expect(report.summary).toBeTruthy();
    expect(Array.isArray(report.themes)).toBe(true);
    expect(Array.isArray(report.growthAreas)).toBe(true);
    expect(Array.isArray(report.patterns)).toBe(true);
  });

  it('report has meaningful content with sample events', () => {
    const events = makeSampleEvents();
    const report = generateReport(events);

    expect(report.themes.length).toBeGreaterThan(0);
    expect(report.patterns.length).toBeGreaterThan(0);
  });

  it('empty events produces a valid minimal report', () => {
    const report = generateReport([]);

    expect(report.generatedAt).toBeGreaterThan(0);
    expect(report.summary).toBeTruthy();
    expect(report.themes).toEqual([]);
    expect(report.growthAreas).toEqual([]);
    expect(report.patterns).toEqual([]);
  });

  it('report output passes VeilFilter with no violations', () => {
    const events = makeSampleEvents();
    const report = generateReport(events);

    // Check all text fields
    const allText = [
      report.summary,
      ...report.themes,
      ...report.growthAreas,
      ...report.patterns,
    ].join(' ');

    const result = filterOutput(allText);
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('empty report output passes VeilFilter', () => {
    const report = generateReport([]);
    const result = filterOutput(report.summary);
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('report does not contain numerical scores or percentages', () => {
    const events = makeSampleEvents();
    const report = generateReport(events);

    const allText = [
      report.summary,
      ...report.themes,
      ...report.growthAreas,
      ...report.patterns,
    ].join(' ');

    // No percentage patterns
    expect(allText).not.toMatch(/\d+%/);
    // No "score: N" patterns
    expect(allText).not.toMatch(/score\s*[:=]\s*\d+/i);
  });

  it('report uses qualitative language only', () => {
    const events = makeSampleEvents();
    const report = generateReport(events);

    const allText = [
      report.summary,
      ...report.themes,
      ...report.growthAreas,
      ...report.patterns,
    ].join(' ');

    // Should not contain stage names as labels
    expect(allText).not.toMatch(/\b(Infrared|Magenta|Red|Amber|Orange|Green|Teal|Turquoise)\s+(stage|level|altitude)/i);
    // Should not contain drive names as terms
    expect(allText).not.toMatch(/\b(Agency|Communion|Eros|Agape)\s+(drive|score)/i);
    // Should not contain shadow quadrant names
    expect(allText).not.toMatch(/\b(dark[-\s]?addiction|dark[-\s]?allergy|golden[-\s]?addiction|golden[-\s]?allergy)\b/i);
  });
});

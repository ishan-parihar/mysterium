/**
 * Tests for QualitativeFeedback — Veil-compliant qualitative feedback mapper.
 * Per UX-01 (Task 4-mysterium-ux-audit) and foundations/20 §3.5.
 */
import { describe, it, expect } from 'vitest';
import { toQualitativeFeedback, formatQualitativeFeedback } from '../../src/infra/llm/QualitativeFeedback.js';
import type { Drive } from '../../src/core/domain/Drive.js';
import type { DriveDirectionality } from '../../src/core/domain/enums.js';

function allHealthy(): Record<Drive, DriveDirectionality> {
  return {
    Agency: 'HealthyBalanced',
    Communion: 'HealthyBalanced',
    Eros: 'HealthyBalanced',
    Agape: 'HealthyBalanced',
  };
}

function withDrive(drive: Drive, signal: DriveDirectionality): Record<Drive, DriveDirectionality> {
  return { ...allHealthy(), [drive]: signal };
}

describe('QualitativeFeedback — band classification', () => {
  it('returns "clean" when all drives healthy and passed', () => {
    const fb = toQualitativeFeedback(allHealthy(), null, true);
    expect(fb.band).toBe('clean');
  });

  it('returns "tight" when a dark-shadow signal is present but passed', () => {
    const fb = toQualitativeFeedback(withDrive('Agency', 'DarkAddicted'), 'DarkAddiction', true);
    expect(fb.band).toBe('tight');
  });

  it('returns "fumbled" when a dark-shadow signal is present and failed', () => {
    const fb = toQualitativeFeedback(withDrive('Agency', 'DarkAddicted'), 'DarkAddiction', false);
    expect(fb.band).toBe('fumbled');
  });

  it('returns "loose" when a golden-shadow signal is present and failed', () => {
    const fb = toQualitativeFeedback(withDrive('Eros', 'GoldenAddicted'), 'GoldenAddiction', false);
    expect(fb.band).toBe('loose');
  });
});

describe('QualitativeFeedback — Veil compliance', () => {
  it('never includes stage labels (Red, Amber, etc.) in the output', () => {
    const stages = ['Infrared', 'Magenta', 'Red', 'Amber', 'Orange', 'Green', 'Teal', 'Turquoise'];
    for (const shadowQuadrant of ['DarkAddiction', 'DarkAllergy', 'GoldenAddiction', 'GoldenAllergy'] as const) {
      const fb = toQualitativeFeedback(withDrive('Agency', 'DarkAddicted'), shadowQuadrant, false);
      const text = formatQualitativeFeedback(fb);
      for (const stage of stages) {
        expect(text).not.toContain(stage);
      }
    }
  });

  it('never includes drive names (Agency, Communion, Eros, Agape) in the output', () => {
    const drives = ['Agency', 'Communion', 'Eros', 'Agape'];
    for (const signal of ['DarkAddicted', 'DarkAverted', 'GoldenAddicted', 'GoldenAverted', 'HealthyBalanced'] as const) {
      const fb = toQualitativeFeedback(withDrive('Agency', signal), null, true);
      const text = formatQualitativeFeedback(fb);
      for (const drive of drives) {
        expect(text).not.toMatch(new RegExp(`\\b${drive}\\b`, 'i'));
      }
    }
  });

  it('never includes shadow quadrant names in the output', () => {
    const quadrants = ['DarkAddiction', 'DarkAllergy', 'GoldenAddiction', 'GoldenAllergy'];
    for (const quadrant of quadrants) {
      const fb = toQualitativeFeedback(withDrive('Agency', 'DarkAddicted'), quadrant as never, false);
      const text = formatQualitativeFeedback(fb);
      for (const q of quadrants) {
        expect(text).not.toContain(q);
      }
    }
  });

  it('never includes numerical scores in the output', () => {
    const fb = toQualitativeFeedback(withDrive('Agency', 'DarkAddicted'), 'DarkAddiction', false);
    const text = formatQualitativeFeedback(fb);
    // No patterns like "score: 0.5" or "70%"
    expect(text).not.toMatch(/\b\d+(\.\d+)?\s*%/);
    expect(text).not.toMatch(/score\s*[:=]\s*\d/i);
  });
});

describe('QualitativeFeedback — content quality', () => {
  it('produces a gesture (1-2 sentences)', () => {
    const fb = toQualitativeFeedback(allHealthy(), null, true);
    expect(fb.gesture).toBeTruthy();
    expect(fb.gesture.length).toBeGreaterThan(10);
  });

  it('produces a resonance (1 sentence)', () => {
    const fb = toQualitativeFeedback(allHealthy(), null, true);
    expect(fb.resonance).toBeTruthy();
    expect(fb.resonance.length).toBeGreaterThan(10);
  });

  it('produces a shadowHint when a shadow is surfaced', () => {
    const fb = toQualitativeFeedback(withDrive('Agency', 'DarkAddicted'), 'DarkAddiction', false);
    expect(fb.shadowHint).toBeTruthy();
    expect(fb.shadowHint!.length).toBeGreaterThan(10);
  });

  it('omits shadowHint when no shadow is surfaced', () => {
    const fb = toQualitativeFeedback(allHealthy(), null, true);
    expect(fb.shadowHint).toBeUndefined();
  });

  it('formats as a joined string with all available parts', () => {
    const fb = toQualitativeFeedback(withDrive('Agency', 'DarkAddicted'), 'DarkAddiction', false);
    const text = formatQualitativeFeedback(fb);
    expect(text).toContain(fb.gesture);
    expect(text).toContain(fb.resonance);
    expect(text).toContain(fb.shadowHint!);
  });

  it('differentiates feedback across different bands', () => {
    const clean = toQualitativeFeedback(allHealthy(), null, true);
    const fumbled = toQualitativeFeedback(withDrive('Agency', 'DarkAddicted'), 'DarkAddiction', false);
    expect(clean.resonance).not.toBe(fumbled.resonance);
  });
});

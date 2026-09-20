/**
 * Tests for veilDescriptors — the Veil-compliance single source of truth.
 *
 * CRITICAL: These tests enforce the canon (AGENTS.md §5.4, foundations/20):
 * the player must NEVER see raw stage labels, drive percentages, encounter
 * counts, or assessment scores. If any of these tests fail, the Veil is
 * broken and the offending descriptor must be fixed before merge.
 */

import { describe, it, expect } from 'vitest';
import {
  describeStage,
  describeDriveSpread,
  describeEncounterCount,
  describeCCI,
  describeSessionCount,
  describeSignificator,
} from '../../src/core/presentation/veilDescriptors.js';
import type { Stage } from '../../src/core/domain/Stage.js';

const ALL_STAGES: readonly Stage[] = [
  'Infrared', 'Magenta', 'Red', 'Amber', 'Orange', 'Green', 'Teal', 'Turquoise',
];

const VEIL_VIOLATION_PATTERNS: readonly RegExp[] = [
  // Raw stage names used as labels
  /\b(stage|level|altitude)\s+(is|equals|=)\s+(infrared|magenta|red|amber|orange|green|teal|turquoise)\b/i,
  // Numerical scores
  /\b\d+(\.\d+)?\s*%/,
  /\b(score|rating|level|altitude|metric)\s*[:=]?\s*\d+/i,
  // Drive percentages
  /\b(agency|communion|eros|agape)\s*[:=]?\s*\d+/i,
];

function assertVeilCompliant(text: string): void {
  for (const pattern of VEIL_VIOLATION_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error(`Veil violation in descriptor: "${text}" matches ${pattern}`);
    }
  }
}

describe('veilDescriptors', () => {
  describe('describeStage', () => {
    it('returns a non-empty string for every stage', () => {
      for (const stage of ALL_STAGES) {
        const desc = describeStage(stage);
        expect(desc).toBeTruthy();
        expect(desc.length).toBeGreaterThan(5);
      }
    });

    it('never includes the raw stage name', () => {
      for (const stage of ALL_STAGES) {
        const desc = describeStage(stage);
        expect(desc.toLowerCase()).not.toContain(stage.toLowerCase());
      }
    });

    it('is Veil-compliant (no raw labels, numbers, or scores)', () => {
      for (const stage of ALL_STAGES) {
        assertVeilCompliant(describeStage(stage));
      }
    });
  });

  describe('describeDriveSpread', () => {
    it('returns a descriptor for balanced drives', () => {
      const desc = describeDriveSpread({ agency: 0.5, communion: 0.5, eros: 0.5, agape: 0.5 });
      expect(desc).toContain('balance');
      assertVeilCompliant(desc);
    });

    it('returns a descriptor for moderate spread', () => {
      const desc = describeDriveSpread({ agency: 0.6, communion: 0.4, eros: 0.5, agape: 0.5 });
      expect(desc).toContain('stronger');
      assertVeilCompliant(desc);
    });

    it('returns a descriptor for dominant pattern', () => {
      const desc = describeDriveSpread({ agency: 0.9, communion: 0.1, eros: 0.5, agape: 0.5 });
      expect(desc).toContain('dominant');
      assertVeilCompliant(desc);
    });

    it('handles empty weights', () => {
      const desc = describeDriveSpread({});
      expect(desc).toBeTruthy();
      assertVeilCompliant(desc);
    });
  });

  describe('describeEncounterCount', () => {
    it('returns Veil-compliant descriptors for various counts', () => {
      for (const n of [0, 5, 15, 50, 100]) {
        const desc = describeEncounterCount(n);
        expect(desc).toBeTruthy();
        // Must never contain the raw number
        expect(desc).not.toContain(String(n));
        assertVeilCompliant(desc);
      }
    });
  });

  describe('describeCCI', () => {
    it('returns Veil-compliant descriptors for the full range', () => {
      for (const cci of [0, 0.1, 0.3, 0.5, 0.7, 0.85, 0.95, 1.0]) {
        const desc = describeCCI(cci);
        expect(desc).toBeTruthy();
        assertVeilCompliant(desc);
      }
    });
  });

  describe('describeSessionCount', () => {
    it('returns Veil-compliant descriptors for various counts', () => {
      for (const n of [0, 2, 10, 30, 75]) {
        const desc = describeSessionCount(n);
        expect(desc).toBeTruthy();
        expect(desc).not.toContain(String(n));
        assertVeilCompliant(desc);
      }
    });
  });

  describe('describeSignificator', () => {
    it('returns all four descriptors', () => {
      // Minimal mock Significator
      const mockSig = {
        id: 'test',
        currentStage: 'Red' as Stage,
        drives: { weights: { agency: 0.5, communion: 0.5, eros: 0.5, agape: 0.5 } },
        totalEncounters: 5,
        totalSessions: 2,
      } as any;

      const desc = describeSignificator(mockSig);
      expect(desc.stageAesthetic).toBeTruthy();
      expect(desc.driveDescriptor).toBeTruthy();
      expect(desc.encounterDescriptor).toBeTruthy();
      expect(desc.sessionDescriptor).toBeTruthy();

      // All must be Veil-compliant
      assertVeilCompliant(desc.stageAesthetic);
      assertVeilCompliant(desc.driveDescriptor);
      assertVeilCompliant(desc.encounterDescriptor);
      assertVeilCompliant(desc.sessionDescriptor);
    });
  });
});

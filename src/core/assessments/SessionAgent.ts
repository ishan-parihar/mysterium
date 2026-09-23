/**
 * SessionAgent — persistent agent that lives across an entire session.
 * Accumulates encounter history, detects cross-encounter patterns,
 * and builds synthesis strings for the LLM to inform next questions.
 *
 * ponytail: This is a minimal viable implementation. Pattern detection
 * is keyword-based for now. Sophisticated trajectory analysis is deferred.
 */
import { ALL_LINES } from '../domain/Line.js';
import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';
import type { ShadowQuadrant } from '../domain/enums.js';

export interface SessionEncounterRecord {
  readonly line: Line;
  readonly stage: Stage;
  readonly narrativeSummary: string;
  readonly writeInResponse?: string;
  readonly driveExpression: { agency: number; communion: number; eros: number; agape: number };
  readonly shadowSurfaced: ShadowQuadrant | null;
  readonly passed: boolean;
  readonly timestamp: number;
}

export class SessionAgent {
  private history: SessionEncounterRecord[] = [];

  addEncounter(record: SessionEncounterRecord): void {
    this.history.push(record);
  }

  get encounterCount(): number {
    return this.history.length;
  }

  get lastEncounter(): SessionEncounterRecord | undefined {
    return this.history[this.history.length - 1];
  }

  /**
   * Build a synthesis string for injection into the LLM system prompt.
   * This is the core value: cross-encounter pattern recognition that the
   * per-encounter AgenticOrchestrator cannot do alone.
   */
  buildSynthesis(): string {
    if (this.history.length === 0) return '';

    const linesExplored = [...new Set(this.history.map(r => r.line))];
    const dominantDrives = this.detectDominantDrives();
    const shadowPatterns = this.detectShadowPatterns();
    const writeInThemes = this.extractWriteInThemes();
    const engagementTrend = this.assessEngagementTrend();

    const parts: string[] = [];

    // Lines explored this session
    if (linesExplored.length > 0) {
      parts.push(`Lines explored: ${linesExplored.join(', ')}`);
    }

    // Dominant drive patterns across encounters
    if (dominantDrives !== 'balanced') {
      parts.push(`Dominant drive pattern: ${dominantDrives}`);
    }

    // Shadow patterns detected across encounters
    if (shadowPatterns !== 'none') {
      parts.push(`Shadow patterns surfaced: ${shadowPatterns}`);
    }

    // Write-in response themes (from free-form reflections)
    if (writeInThemes !== 'none') {
      parts.push(`Player's reflective themes: ${writeInThemes}`);
    }

    // Engagement trend (deepening, plateauing, declining)
    if (engagementTrend !== 'stable') {
      parts.push(`Engagement trend: ${engagementTrend}`);
    }

    // Specific guidance for the next question
    const nextGuidance = this.suggestNextFocus();
    if (nextGuidance) {
      parts.push(`Suggested focus: ${nextGuidance}`);
    }

    return parts.join('\n');
  }

  /**
   * Detect which drives have been most expressed across encounters.
   * Returns a string like "Agency dominant (3 encounters), Eros secondary (2)"
   */
  private detectDominantDrives(): string {
    if (this.history.length < 2) return 'balanced';

    const driveCounts = { agency: 0, communion: 0, eros: 0, agape: 0 };
    for (const r of this.history) {
      const { agency, communion, eros, agape } = r.driveExpression;
      // The highest-scoring drive is the "expressed" one
      const max = Math.max(agency, communion, eros, agape);
      if (max === agency && max > 0.5) driveCounts.agency++;
      else if (max === communion && max > 0.5) driveCounts.communion++;
      else if (max === eros && max > 0.5) driveCounts.eros++;
      else if (max === agape && max > 0.5) driveCounts.agape++;
    }

    const sorted = Object.entries(driveCounts)
      .sort((a, b) => b[1] - a[1])
      .filter(([, count]) => count > 0);

    if (sorted.length === 0) return 'balanced';

    return sorted
      .map(([drive, count]) => `${drive}(${count}/${this.history.length})`)
      .join(', ');
  }

  /**
   * Detect shadow patterns across encounters.
   * A single shadow is a signal; the same shadow appearing 2+ times is a pattern.
   */
  private detectShadowPatterns(): string {
    const shadows = this.history
      .filter(r => r.shadowSurfaced)
      .map(r => r.shadowSurfaced!);

    if (shadows.length === 0) return 'none';

    // Count occurrences
    const counts: Record<string, number> = {};
    for (const s of shadows) {
      counts[s] = (counts[s] ?? 0) + 1;
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([q, n]) => n >= 2 ? `${q}(×${n} — pattern)` : `${q}`)
      .join(', ');
  }

  /**
   * Extract themes from write-in responses.
   * Ponytail: keyword-based for now. LLM-mediated analysis is deferred.
   */
  private extractWriteInThemes(): string {
    const writeIns = this.history
      .filter(r => r.writeInResponse && r.writeInResponse.length > 20)
      .map(r => r.writeInResponse!);

    if (writeIns.length === 0) return 'none';

    // Look for recurring themes across write-ins
    const themeKeywords = {
      'avoidance/withdrawal': ['avoid', 'withdraw', 'escape', 'retreat', 'numb', 'shut down'],
      'control/power': ['control', 'force', 'dominate', 'must', 'have to', 'need to'],
      'connection/relationship': ['connect', 'together', 'others', 'relationship', 'belong'],
      'growth/aspiration': ['grow', 'reach', 'aspire', 'become', 'evolve', 'transform'],
      'acceptance/surrender': ['accept', 'allow', 'surrender', 'let go', 'peace', 'calm'],
      'confusion/uncertainty': ['confused', 'uncertain', 'lost', 'don\'t know', 'unclear'],
    };

    const themeCounts: Record<string, number> = {};
    for (const writeIn of writeIns) {
      const lower = writeIn.toLowerCase();
      for (const [theme, keywords] of Object.entries(themeKeywords)) {
        if (keywords.some(kw => lower.includes(kw))) {
          themeCounts[theme] = (themeCounts[theme] ?? 0) + 1;
        }
      }
    }

    const detected = Object.entries(themeCounts)
      .filter(([, count]) => count >= 1)
      .sort((a, b) => b[1] - a[1])
      .map(([theme]) => theme);

    return detected.length > 0 ? detected.join(', ') : 'none';
  }

  /**
   * Assess whether the player's engagement is deepening, plateauing, or declining.
   * Uses write-in length as a proxy for engagement depth.
   */
  private assessEngagementTrend(): string {
    if (this.history.length < 3) return 'stable';

    const recentWriteIns = this.history.slice(-3)
      .filter(r => r.writeInResponse)
      .map(r => r.writeInResponse!.split(/\s+/).length);

    if (recentWriteIns.length < 2) return 'stable';

    const avgFirst = recentWriteIns.slice(0, Math.floor(recentWriteIns.length / 2))
      .reduce((a, b) => a + b, 0) / Math.floor(recentWriteIns.length / 2);
    const avgSecond = recentWriteIns.slice(Math.floor(recentWriteIns.length / 2))
      .reduce((a, b) => a + b, 0) / Math.ceil(recentWriteIns.length / 2);

    if (avgSecond > avgFirst * 1.3) return 'deepening — player is engaging more fully';
    if (avgSecond < avgFirst * 0.7) return 'declining — player may be fatigued or withdrawing';
    return 'stable';
  }

  /**
   * Suggest what the next question should focus on, based on accumulated patterns.
   */
  private suggestNextFocus(): string | null {
    if (this.history.length < 2) return null;

    const linesExplored = [...new Set(this.history.map(r => r.line))];
    const unexplored = ALL_LINES.filter(l => !linesExplored.includes(l));

    // If we have unexplored lines, suggest one
    if (unexplored.length > 0) {
      return `Explore ${unexplored[0]} — not yet covered this session`;
    }

    // If shadow patterns detected, suggest going deeper on that line
    const shadowLines = this.history
      .filter(r => r.shadowSurfaced)
      .map(r => r.line);
    if (shadowLines.length > 0) {
      return `Go deeper on ${shadowLines[0]} — shadow pattern detected`;
    }

    return null;
  }
}

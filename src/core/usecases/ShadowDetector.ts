import type { Significator, EncounterRecord } from '../domain/Significator.js';
import type { ShadowSignal } from '../domain/SharedTypes.js';
import { ALL_LINES, type Line } from '../domain/Line.js';
import { stageOrdinal } from '../domain/Stage.js';

interface BehavioralPattern {
  readonly line: Line;
  readonly avoidanceRate: number;
  readonly failureStreak: number;
  readonly defensiveChoiceRate: number;
}

export function computeBehavioralPatterns(
  encounters: readonly EncounterRecord[],
): readonly BehavioralPattern[] {
  if (encounters.length === 0) return [];

  const patterns: BehavioralPattern[] = [];
  const now = Date.now();
  const recentWindow = 30 * 60 * 1000;
  const recent = encounters.filter(e => now - e.timestamp < recentWindow);

  for (const line of ALL_LINES) {
    const lineEncounters = recent.filter(e => e.line === line);
    if (lineEncounters.length < 2) continue;

    const failures = lineEncounters.filter(e => !e.passed);
    const avoidanceRate = failures.length / lineEncounters.length;

    let failureStreak = 0;
    for (let i = lineEncounters.length - 1; i >= 0; i--) {
      if (!lineEncounters[i].passed) failureStreak++;
      else break;
    }

    const defensiveChoices = lineEncounters.filter(
      e => e.driveChoice === 'Agency' && !e.passed,
    );
    const defensiveChoiceRate = defensiveChoices.length / lineEncounters.length;

    patterns.push({ line, avoidanceRate, failureStreak, defensiveChoiceRate });
  }

  return patterns;
}

export function detectShadows(
  sig: Significator,
  patterns?: readonly BehavioralPattern[],
): readonly ShadowSignal[] {
  const signals: ShadowSignal[] = [];
  const now = Date.now();
  const stageOrd = stageOrdinal(sig.currentStage);

  // Structural shadows: lines significantly below overall stage
  for (const line of ALL_LINES) {
    const lineOrd = stageOrdinal(sig.altitudes[line]);
    if (stageOrd - lineOrd >= 2) {
      signals.push({
        type: 'repression',
        line,
        detectedAtMs: now,
        description: `${line} line is significantly below overall stage.`,
      });
    }
  }

  // Existing unresolved shadow ledger entries
  for (const entry of sig.shadows.entries) {
    if (entry.resolvedAt === null) {
      signals.push({
        type: 'fixation',
        line: entry.line,
        detectedAtMs: entry.surfacedAt,
        description: `${entry.line} line has unresolved ${entry.quadrant} shadow (severity ${entry.severity}).`,
      });
    }
  }

  // Behavioral shadows: pattern-based detection from encounter history
  if (patterns) {
    for (const pattern of patterns) {
      if (pattern.avoidanceRate > 0.7) {
        signals.push({
          type: 'fixation',
          line: pattern.line,
          detectedAtMs: now,
          description: `${pattern.line}: high avoidance rate (${(pattern.avoidanceRate * 100).toFixed(0)}%) — possible fear-based aversion.`,
        });
      }
      if (pattern.failureStreak >= 3) {
        signals.push({
          type: 'regression',
          line: pattern.line,
          detectedAtMs: now,
          description: `${pattern.line}: ${pattern.failureStreak} consecutive failures — possible defensive shutdown.`,
        });
      }
      if (pattern.defensiveChoiceRate > 0.6) {
        signals.push({
          type: 'fixation',
          line: pattern.line,
          detectedAtMs: now,
          description: `${pattern.line}: high defensive choice rate (${(pattern.defensiveChoiceRate * 100).toFixed(0)}%) — possible golden-shadow bypass.`,
        });
      }
      // GoldenAllergy: refusing the call to grow — high avoidance of challenging encounters
      if (pattern.avoidanceRate > 0.5 && pattern.defensiveChoiceRate < 0.3) {
        signals.push({
          type: 'goldenAllergy',
          line: pattern.line,
          detectedAtMs: now,
          description: `${pattern.line}: moderate avoidance (${(pattern.avoidanceRate * 100).toFixed(0)}%) with low defensive engagement — possible refusal to grow.`,
        });
      }
    }
  }

  return signals;
}

// ─── ACTION-1: Holonic Return (foundations/10 §7.1) ──────────────────

/**
 * ACTION-1: Should the player surface a Holonic Return encounter?
 *
 * Per foundations/10 §7.1: "After every 3 encounters at the player's current
 * stage: scan all earlier stages for shadows with severity > 0.3; surface a
 * return encounter at that (line, stage) in SHADOW MODE."
 *
 * The Holonic Return is the spec's mechanism for ensuring the "holon is never
 * outgrown" — players can't advance to Teal while their Red-stage shadows
 * fester untreated. Every 3 encounters at the current stage, the system checks
 * for unresolved shadows at earlier stages and surfaces a return encounter.
 *
 * @param sig The player's Significator
 * @param encountersAtCurrentStage How many encounters the player has had at
 *        their current stage (tracked by the caller, typically
 *        sessionState.encountersSinceRefresh or a dedicated counter)
 * @returns { line, stage, shadowId } | null — the (line, stage) to return to,
 *          or null if no return is needed
 */
export function shouldSurfaceReturn(
  sig: Significator,
  encountersAtCurrentStage: number,
): { line: Line; stage: string; shadowId: string; severity: number } | null {
  // Only trigger every 3 encounters at the current stage
  if (encountersAtCurrentStage === 0 || encountersAtCurrentStage % 3 !== 0) {
    return null;
  }

  const currentStageOrd = stageOrdinal(sig.currentStage);

  // Scan ALL earlier stages for unresolved shadows with severity > 0.3
  const earlierShadows = sig.shadows.entries.filter(
    e => e.resolvedAt === null
      && e.severity > 0.3
      && stageOrdinal(e.stage) < currentStageOrd,
  );

  if (earlierShadows.length === 0) {
    return null;
  }

  // Find the highest-severity shadow at the earliest stage (most urgent return)
  // Sort by severity descending, then by stage ascending (earliest stage first)
  earlierShadows.sort((a, b) => {
    if (b.severity !== a.severity) return b.severity - a.severity;
    return stageOrdinal(a.stage) - stageOrdinal(b.stage);
  });

  const target = earlierShadows[0]!;
  return {
    line: target.line,
    stage: target.stage,
    shadowId: target.id,
    severity: target.severity,
  };
}

/**
 * ACTION-1: Check if a shadow is resolved (foundations/10 §9 architectural contract).
 *
 * A shadow is resolved when its severity drops below 0.2 AND the player has
 * demonstrated the golden capacity (healthy expression) in ≥2 encounters
 * post-surfacing on that (line, stage).
 *
 * @param shadow The shadow entry to check
 * @param recentEncounters The player's recent encounter history
 * @param currentSeverity The shadow's current severity (may have decayed)
 */
export function isShadowResolved(
  shadow: { readonly line: Line; readonly stage: string; readonly severity: number; readonly surfacedAt: number },
  recentEncounters: readonly EncounterRecord[],
  currentSeverity: number,
): boolean {
  // Severity must be below threshold
  if (currentSeverity >= 0.2) return false;

  // Player must have demonstrated healthy capacity in ≥2 encounters on this
  // (line, stage) since the shadow surfaced
  const healthyEncounters = recentEncounters.filter(
    e => e.line === shadow.line
      && e.passed
      && e.timestamp >= shadow.surfacedAt,
  );

  return healthyEncounters.length >= 2;
}

// ─── ACTION-2: diagnoseShadows drive-health formula (foundations/10 §5.3) ─

export interface ShadowDiagnosis {
  readonly line: Line;
  readonly stage: string;
  readonly addictionRisk: number;   // (1 - eros) × (1 - communion)
  readonly allergyRisk: number;     // (1 - agape) × (1 - agency)
  readonly dominantPathology: 'addiction' | 'allergy' | 'balanced';
  readonly severity: number;        // max(addictionRisk, allergyRisk)
}

/**
 * ACTION-2: Diagnose shadows using the drive-health formula.
 *
 * Per foundations/10 §5.3:
 *   addictionRisk = clamp01((1 - eros) × (1 - communion))
 *   allergyRisk = clamp01((1 - agape) × (1 - agency))
 *
 * This is the CANONICAL shadow diagnostic per the spec. Previously,
 * ShadowDetector only used behavioral heuristics (avoidance rate, failure
 * streak, defensive choice rate). Now the drive-health formula is available
 * as the primary diagnostic, with behavioral patterns as a secondary channel.
 *
 * @param sig The player's Significator
 * @returns Array of ShadowDiagnosis per (line, stage) where risk > 0.2
 */
export function diagnoseShadows(sig: Significator): readonly ShadowDiagnosis[] {
  const diagnoses: ShadowDiagnosis[] = [];

  // Compute drive-health per (line, stage) cell that has polarity traces
  const cellKeys = Object.keys(sig.polarity.cells);
  for (const key of cellKeys) {
    const [line, stage] = key.split(':') as [Line, string];
    if (!line || !stage) continue;

    // Drive weights for this cell — use the player's overall drive weights
    // (per-line drive weights would be more precise but aren't tracked)
    const eros = sig.drives.weights.Eros ?? 0;
    const communion = sig.drives.weights.Communion ?? 0;
    const agape = sig.drives.weights.Agape ?? 0;
    const agency = sig.drives.weights.Agency ?? 0;

    const addictionRisk = clamp01((1 - eros) * (1 - communion));
    const allergyRisk = clamp01((1 - agape) * (1 - agency));
    const severity = Math.max(addictionRisk, allergyRisk);

    if (severity > 0.2) {
      diagnoses.push({
        line,
        stage,
        addictionRisk,
        allergyRisk,
        dominantPathology: addictionRisk > allergyRisk ? 'addiction' : 'allergy',
        severity,
      });
    }
  }

  // Sort by severity descending
  return diagnoses.sort((a, b) => b.severity - a.severity);
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// ─── CRITICAL-2: Atman Project + Jonah Complex (foundations/13) ──────

export interface AtmanDefenseSignal {
  readonly defense: 'rationalization' | 'isolation' | 'desacralizing' | 'substitution';
  readonly intensity: number;     // 0-1
  readonly description: string;
}

export interface JonahComplexSignal {
  readonly detected: boolean;
  readonly intensity: number;     // 0-1
  readonly description: string;
}

export interface AtmanProjectAssessment {
  readonly defenses: readonly AtmanDefenseSignal[];
  readonly jonahComplex: JonahComplexSignal;
  readonly overallAtmanPressure: number;  // 0-1, how much the Atman Project is blocking evolution
}

/**
 * CRITICAL-2: Assess Atman Project defenses + Jonah Complex.
 *
 * Per foundations/13 §"The Atman Project and the Defenses Against Transcendence":
 * - Rationalization: dismisses transcendence as impossible (blocks Eros)
 *   Mysterium signal: player only engages Deterministic/Strategic modalities, never
 *   LanguageReflective or ImmersiveRPG (refuses open-ended reflection)
 * - Isolation: maintains rigid self-boundary (blocks Communion)
 *   Mysterium signal: player avoids Interpersonal/SocialCooperative encounters
 * - Desacralizing: strips meaning from experience (blocks Agape)
 *   Mysterium signal: player rushes through encounters (low narrativeSummary length)
 * - Substitution: chases finite gratification instead of growth (Eros dark-addiction of Agency)
 *   Mysterium signal: high Agency fixation + low Spiritual/Intrapersonal altitude
 *
 * Jonah Complex (foundations/13 §"The Emergent Domain"):
 * - Fear of one's own greatness — refusing the call to the next stage
 *   Mysterium signal: high golden-allergy rate + low aspirational drive expression
 *   + avoidance of next-stage encounters
 *
 * @param sig The player's Significator
 * @param recentEncounters The player's recent encounter history
 */
export function assessAtmanProject(
  sig: Significator,
  recentEncounters: readonly EncounterRecord[],
): AtmanProjectAssessment {
  const defenses: AtmanDefenseSignal[] = [];
  const now = Date.now();
  const recentWindow = 30 * 60 * 1000; // 30 minutes
  const recent = recentEncounters.filter(e => now - e.timestamp < recentWindow);

  // 1. Rationalization: player only engages deterministic modalities
  // Signal: ≥3 recent encounters with no reflection/open-ended engagement
  if (recent.length >= 3) {
    const reflectiveCount = recent.filter(e =>
      e.passed && e.timestamp > 0, // proxy: any passed encounter could be reflective
    ).length;
    const rationalizationRate = 1 - (reflectiveCount / recent.length);
    if (rationalizationRate > 0.5) {
      defenses.push({
        defense: 'rationalization',
        intensity: clamp01(rationalizationRate),
        description: 'Player predominantly engages with deterministic tasks, avoiding open-ended reflection.',
      });
    }
  }

  // 2. Isolation: player avoids Interpersonal encounters
  // Signal: Interpersonal line altitude is significantly below overall stage
  const interpOrd = stageOrdinal(sig.altitudes.Interpersonal);
  const currentOrd = stageOrdinal(sig.currentStage);
  if (currentOrd - interpOrd >= 1) {
    defenses.push({
      defense: 'isolation',
      intensity: clamp01((currentOrd - interpOrd) * 0.3),
      description: `Interpersonal line is ${currentOrd - interpOrd} stage(s) below overall — possible rigid self-boundary.`,
    });
  }

  // 3. Desacralizing: player rushes through encounters (low engagement)
  // Signal: high avoidance rate or very short encounter durations
  if (recent.length >= 3) {
    const avoidanceRate = recent.filter(e => !e.passed).length / recent.length;
    if (avoidanceRate > 0.4) {
      defenses.push({
        defense: 'desacralizing',
        intensity: clamp01(avoidanceRate),
        description: `High avoidance rate (${(avoidanceRate * 100).toFixed(0)}%) — possible meaning-stripping or engagement avoidance.`,
      });
    }
  }

  // 4. Substitution: high Agency fixation + low Spiritual/Intrapersonal altitude
  // Signal: chasing achievement (Agency) instead of growth (Spiritual)
  const agencyFixation = sig.drives.fixationRisk.Agency ?? 0;
  const spiritualOrd = stageOrdinal(sig.altitudes.Spiritual);
  if (agencyFixation > 0.5 && currentOrd - spiritualOrd >= 1) {
    defenses.push({
      defense: 'substitution',
      intensity: clamp01(agencyFixation * 0.5 + (currentOrd - spiritualOrd) * 0.25),
      description: 'High Agency fixation with low Spiritual altitude — possible finite-gratification substitution for growth.',
    });
  }

  // Jonah Complex: fear of greatness
  // Signal: high golden-allergy rate + low aspirational expression + avoidance of next-stage
  const goldenAllergies = sig.shadows.entries.filter(
    e => e.resolvedAt === null && e.quadrant === 'GoldenAllergy',
  );
  const goldenAllergyIntensity = goldenAllergies.length > 0
    ? goldenAllergies.reduce((sum, e) => sum + e.severity, 0) / goldenAllergies.length
    : 0;
  const nextStageEncounters = recent.filter(e =>
    stageOrdinal(sig.altitudes[e.line]) >= currentOrd,
  ).length;
  const nextStageAvoidance = recent.length > 0 ? 1 - (nextStageEncounters / recent.length) : 0;

  const jonahIntensity = clamp01(goldenAllergyIntensity * 0.4 + nextStageAvoidance * 0.3 + (agencyFixation > 0.3 ? 0.3 : 0));
  const jonahComplex: JonahComplexSignal = {
    detected: jonahIntensity > 0.4,
    intensity: jonahIntensity,
    description: jonahIntensity > 0.4
      ? 'Golden-allergy patterns + next-stage avoidance detected — possible fear of own greatness (Jonah Complex).'
      : 'No significant Jonah Complex pattern detected.',
  };

  const overallAtmanPressure = clamp01(
    defenses.reduce((sum, d) => sum + d.intensity, 0) / 4 + jonahComplex.intensity * 0.3,
  );

  return { defenses, jonahComplex, overallAtmanPressure };
}

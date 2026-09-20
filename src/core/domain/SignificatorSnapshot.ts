/**
 * SignificatorSnapshot - read-only projection with pre-computed analytics.
 * Spec: foundations/25 section 2.1 and foundations/24.
 *
 * The snapshot is an immutable view of the Significator at a point in time,
 * augmented with derived/computed fields for efficient querying.
 */
import type { Line } from './Line.js';
import type { Stage } from './Stage.js';
import type { Drive } from './Drive.js';
import type { Significator, TransformationRecord, DriveState } from './Significator.js';
import type { PolarityState } from './PolarityCellVector.js';
import type { ShadowLedger } from './ShadowLedger.js';
import { ALL_LINES } from './Line.js';
import { ALL_DRIVES } from './Drive.js';
import { stageOrdinal } from './Stage.js';

export interface CompoundShadow {
  readonly primaryEntry: string;
  readonly partnerEntry: string;
  readonly lines: readonly Line[];
  readonly combinedSeverity: number;
}

export interface TransformationReadinessData {
  readonly linesAtEdge: number;
  readonly shadowClearance: boolean;
  readonly catalystSaturation: number;
  readonly pendingTransformation: boolean;
  readonly targetStage: Stage | null;
  readonly sessionsSinceLastTransformation: number;
}

export interface SignificatorSnapshot {
  readonly id: string;
  readonly altitudes: Readonly<Record<Line, Stage>>;
  readonly currentStage: Stage;
  readonly drives: DriveState;
  readonly polarity: PolarityState;
  readonly shadows: ShadowLedger;
  readonly theta: Significator['theta'];
  readonly transformations: readonly TransformationRecord[];
  readonly totalEncounters: number;
  readonly totalSessions: number;
  readonly driveBalance: Record<Drive, number>;
  readonly fixationRisk: Record<Drive, number>;
  readonly compoundShadows: readonly CompoundShadow[];
  readonly recentEncounterHistory: readonly { id: string; timestamp: number }[];
  readonly transformationReadiness: TransformationReadinessData;
}

/**
 * Compute drive balance from drive weights.
 * Maps each drive weight to a -1..1 range where 0 is balanced.
 * Uses normalization: balance = (weight - mean) / max(abs deviation, 1)
 */
function computeDriveBalance(drives: DriveState): Record<Drive, number> {
  const weights = drives.weights;
  const values = ALL_DRIVES.map(d => weights[d]);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const maxDev = Math.max(1, ...values.map(v => Math.abs(v - mean)));

  const result = {} as Record<Drive, number>;
  for (const d of ALL_DRIVES) {
    result[d] = (weights[d] - mean) / maxDev;
  }
  return result;
}

/**
 * Extract compound shadow patterns - shadows with cross-line partner relationships.
 */
function extractCompoundShadows(shadows: ShadowLedger): CompoundShadow[] {
  const compounds: CompoundShadow[] = [];
  const seen = new Set<string>();

  for (const entry of shadows.entries) {
    if (entry.compoundPartner === null) continue;
    if (seen.has(entry.id)) continue;

    const partner = shadows.entries.find(e => e.id === entry.compoundPartner);
    if (!partner) continue;

    seen.add(entry.id);
    seen.add(partner.id);

    const lines: Line[] = [];
    if (!lines.includes(entry.line)) lines.push(entry.line);
    if (!lines.includes(partner.line)) lines.push(partner.line);

    compounds.push({
      primaryEntry: entry.id,
      partnerEntry: partner.id,
      lines,
      combinedSeverity: (entry.severity + partner.severity) / 2,
    });
  }

  return compounds;
}

/**
 * Build recent encounter history from theta timestamps.
 * Returns up to 20 most recent encounters sorted by timestamp descending.
 */
function buildRecentEncounterHistory(
  theta: Significator['theta'],
): readonly { id: string; timestamp: number }[] {
  const entries = Object.entries(theta.lastEncounter)
    .filter(([, ts]) => ts > 0)
    .map(([id, timestamp]) => ({ id, timestamp }))
    .sort((a, b) => b.timestamp - a.timestamp);

  return entries.slice(0, 20);
}

/**
 * Compute transformation readiness data.
 */
function computeTransformationReadiness(sig: Significator): TransformationReadinessData {
  const currentOrdinal = stageOrdinal(sig.currentStage);

  // Count lines at the edge of current stage (altitude matches current stage)
  let linesAtEdge = 0;
  for (const line of ALL_LINES) {
    if (stageOrdinal(sig.altitudes[line]) >= currentOrdinal) {
      linesAtEdge++;
    }
  }

  // Shadow clearance: no active shadows with severity > 0.7
  const highSeverityShadows = sig.shadows.entries.filter(
    e => e.resolvedAt === null && e.severity > 0.7,
  );
  const shadowClearance = highSeverityShadows.length === 0;

  // Catalyst saturation: ratio of polarity cells with high crystallization
  const cellKeys = Object.keys(sig.polarity.cells);
  const crystallizedCells = cellKeys.filter(
    k => sig.polarity.cells[k].crystallization > 0.7,
  );
  const catalystSaturation =
    cellKeys.length > 0 ? crystallizedCells.length / cellKeys.length : 0;

  // Sessions since last transformation
  const lastTransformation = sig.transformations.length > 0
    ? sig.transformations[sig.transformations.length - 1]
    : null;
  const sessionsSinceLastTransformation = lastTransformation
    ? Math.max(0, sig.totalSessions - (lastTransformation.triggeredAtSession ?? 0))
    : Infinity;  // Never transformed = not in post-transformation recovery

  // Determine if transformation is pending and target stage
  const readinessThreshold = 0.6;
  const readinessScore = (linesAtEdge / ALL_LINES.length + catalystSaturation) / 2;
  const pendingTransformation = readinessScore >= readinessThreshold && shadowClearance;

  const ALL_STAGES: readonly Stage[] = [
    'Infrared', 'Magenta', 'Red', 'Amber', 'Orange', 'Green', 'Teal', 'Turquoise',
  ];
  const targetStage = pendingTransformation && currentOrdinal < ALL_STAGES.length - 1
    ? ALL_STAGES[currentOrdinal + 1]
    : null;

  return {
    linesAtEdge,
    shadowClearance,
    catalystSaturation,
    pendingTransformation,
    targetStage,
    sessionsSinceLastTransformation,
  };
}

/**
 * Create a read-only snapshot from a Significator with all derived fields computed.
 */
export function toSnapshot(sig: Significator): SignificatorSnapshot {
  return {
    id: sig.id,
    altitudes: sig.altitudes,
    currentStage: sig.currentStage,
    drives: sig.drives,
    polarity: sig.polarity,
    shadows: sig.shadows,
    theta: sig.theta,
    transformations: sig.transformations,
    totalEncounters: sig.totalEncounters,
    totalSessions: sig.totalSessions,
    driveBalance: computeDriveBalance(sig.drives),
    fixationRisk: { ...sig.drives.fixationRisk } as Record<Drive, number>,
    compoundShadows: extractCompoundShadows(sig.shadows),
    recentEncounterHistory: buildRecentEncounterHistory(sig.theta),
    transformationReadiness: computeTransformationReadiness(sig),
  };
}

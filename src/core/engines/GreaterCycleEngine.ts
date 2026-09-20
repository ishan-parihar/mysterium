/**
 * GreaterCycleEngine — computes HoloOS G_z / P_z dual health metrics.
 *
 * HoloOS alignment (per AUDIT-HOLOOS-ALIGNMENT.md §2.5.6):
 * HoloOS requires both G_z (Lesser-Cycle health, Agape, rewards balance/
 * integration) AND P_z (Greater-Cycle health, Eros, rewards polarization/
 * transcendence) for total metabolic health. The two are co-equal and
 * multiply: Total Metabolic Health = G_z · P_z.
 *
 * Ontological derivation (per HoloOS Primal Distortion Genesis Theorem,
 * _THEORY/02_Ontology/08.8.7_Primal_Distortion_Genesis_Theorem.md):
 * - G_z (Agape/integration) ↔ Love-Law (D2, Second Distortion).
 * - P_z (Eros/polarization) ↔ Free-Will-Law (D1, First Distortion).
 * - Light-Law (D3) is the substrate both operate on.
 * A holon at D3 (Light) needs both Free-Will-choice (P_z) and Love-
 * integration (G_z) to be metabolically complete.
 *
 * Status: canonical-hypothesis (Mysterium-specific operationalization; the
 * underlying HoloOS framework is canonical-hypothesis per 02.1 + 08.8.7).
 *
 * This is a SCAFFOLD — Phase 1 deliverable. The CCIEngine will consume
 * these metrics as a 6th dimension (alongside the existing 5) once
 * T-1.8 wires them in.
 *
 * Spec: foundations/25 §1.1 (revised 2026-07-03)
 */
import type { Significator } from '../domain/Significator.js';
import { stageOrdinal } from '../domain/Stage.js';
import { ALL_LINES, LINE_COMPLEX, type Complex } from '../domain/Line.js';
// P2-High: Import per-line theta half-lives for accurate staleness computation
import { DEFAULT_THETA_PARAMS } from './ThetaDecay.js';

/** Lesser-Cycle health (Agape, rewards balance/integration). [0,1] */
export interface GzMetric {
  readonly value: number;
  readonly driveBalance: number;       // 1 - maxImbalance across 4 drives
  readonly shadowIntegration: number;  // 1 - normalized unresolved shadow severity
  readonly thetaFreshness: number;     // 1 - normalized staleness across cells
  readonly complexBalance: number;     // 1 - maxImbalance across 3 Complex altitudes
  // DEV-1: HoloOS formula components (per 00.md §6.2)
  readonly autonomyCoeff: number;      // A_z = exp(-|ln(Ω_A)|) — boundary resistance
  readonly connectionCoeff: number;    // C_z = exp(-|ln(σ_C)|) — field conductance
  readonly horizontalBalance: number;  // B_H = min(A_z, C_z) / max(A_z, C_z)
  readonly verticalBalance: number;    // B_V = min(Eros, Agape) / max(Eros, Agape)
}

/** Greater-Cycle health (Eros, rewards polarization/transcendence). [0,1] */
export interface PzMetric {
  readonly value: number;
  readonly polarityCrystallization: number;   // sig.polarity.master.crystallizationIndex
  readonly transformationReadiness: number;   // linesAtEdge / 8 + catalystSaturation, averaged
  readonly greatWayAlignment: number;         // polarity.master.dominantDirection stability over recent encounters
  readonly choiceAuthenticity: number;        // 1 - (avoidance rate from recentEncounters)
  // DEV-1: HoloOS formula components (per 00.md §6.3)
  readonly structuralGradient: number;        // ∇Ψ = |P - M| / (P + M + ε) — Matrix vs Potentiator distance
  readonly polarAlignment: number;            // cos(θ_alignment) — behavioral output aligned with core choice
}

/** Total Metabolic Health = G_z · P_z (geometric mean). [0,1] */
export interface MetabolicHealth {
  readonly gz: number;
  readonly pz: number;
  readonly total: number;            // gz * pz
  readonly gzBreakdown: GzMetric;
  readonly pzBreakdown: PzMetric;
  /**
   * GAP-D2-2 (per HoloOS 08.8.14): 'transitional' distinguishes
   * Significator-Liminality (healthy phase-transition) from
   * 'polarizing-unhealthy' (pathological polarization without integration).
   */
  readonly interpretation: 'consolidating' | 'polarizing-healthy' | 'polarizing-unhealthy' | 'stuck' | 'transitional';
  /** GAP-D2-2: Significator-Liminality signature (per 08.8.14 §8.1 + 08.8.21 R4). */
  readonly liminalitySignature?: {
    readonly pzSpike: boolean;           // P_z > 0.7
    readonly subDensitySaturation: boolean; // ≥5/8 lines with crystallization > 0.7
    readonly isTransitional: boolean;    // both pzSpike AND subDensitySaturation
  };
}

/**
 * DEV-1: Compute G_z from Significator state using the HoloOS geometric-mean formula.
 *
 * Per HoloOS 00.md §6.2:
 *   G_z = (A_z × C_z × B_H × B_V)^(1/4)
 *
 * Where:
 *   A_z = exp(-|ln(Ω_A)|) — Autonomy Coefficient (boundary resistance)
 *   C_z = exp(-|ln(σ_C)|) — Connection Coefficient (field conductance)
 *   B_H = min(A_z, C_z) / max(A_z, C_z) — horizontal balance
 *   B_V = min(Eros, Agape) / max(Eros, Agape) — vertical balance
 *
 * Key property: geometric mean means ANY factor near 0 collapses G_z.
 * This enforces the "Goldilocks Zone" — all drives must be non-zero.
 *
 * Mysterium mapping:
 *   Ω_A = (M × η_M) / (|C| + ε) — M = avg drive weight, η_M = 1 - avg fixationRisk, |C| = totalEncounters
 *   σ_C = (P × η_P) / (|E| + ε) — P = avg rayProfile, η_P = 1 - avg shadow severity, |E| = totalEncounters
 */
export function computeGz(sig: Significator, now: number): GzMetric {
  // --- Legacy components (retained for backward compat + telemetry) ---
  const weights = Object.values(sig.drives.weights);
  const maxWeight = Math.max(...weights);
  const minWeight = Math.min(...weights);
  const driveBalance = clamp01(1 - (maxWeight - minWeight));

  const unresolved = sig.shadows.entries.filter(e => e.resolvedAt === null);
  const avgSeverity = unresolved.length > 0
    ? unresolved.reduce((s, e) => s + e.severity, 0) / unresolved.length
    : 0;
  const shadowIntegration = clamp01(1 - avgSeverity);

  const cellKeys = Object.keys(sig.theta.lastEncounter);
  const cellCount = cellKeys.length || 1;
  let totalStaleness = 0;
  for (const key of cellKeys) {
    const lastTs = sig.theta.lastEncounter[key] ?? 0;
    if (lastTs === 0) { totalStaleness += 1; continue; }
    const elapsed = now - lastTs;
    // P2-High: Use per-line theta half-lives instead of hardcoded 7-day global.
    // Each line has a different decay rate (Somatic=3d, Willpower=4d, etc.).
    // The key format is "Line:Stage" — extract the line to look up its half-life.
    const line = key.split(':')[0] ?? '';
    const halfLife = (DEFAULT_THETA_PARAMS.lineHalfLives as Record<string, number>)?.[line] ?? DEFAULT_THETA_PARAMS.halfLife;
    totalStaleness += 1 - Math.pow(0.5, elapsed / halfLife);
  }
  const thetaFreshness = clamp01(1 - (totalStaleness / cellCount));

  const complexAlts = computeComplexAltitudes(sig);
  const complexValues = Object.values(complexAlts);
  const complexBalance = clamp01(1 - (Math.max(...complexValues) - Math.min(...complexValues)) / 7);

  // --- DEV-1: HoloOS geometric-mean formula (per 00.md §6.2) ---
  const eps = 0.01;

  // Matrix state (M) = average drive weight — the structured present configuration
  const M = weights.reduce((a, b) => a + b, 0) / weights.length;
  // Matrix digestion efficiency (η_M) = 1 - average fixationRisk
  const fixationValues = Object.values(sig.drives.fixationRisk);
  const eta_M = clamp01(1 - (fixationValues.reduce((a, b) => a + b, 0) / (fixationValues.length || 1)));
  // Catalyst flux (|C|) = totalEncounters — cumulative perturbation received
  const catalystFlux = sig.totalEncounters + eps;
  // Ω_A = (M × η_M) / (|C| + ε) — boundary resistance
  const Omega_A = (M * eta_M) / (catalystFlux + eps);
  // A_z = exp(-|ln(Ω_A)|) — optimal at Ω_A = 1 (balanced resistance)
  const autonomyCoeff = clamp01(Math.exp(-Math.abs(Math.log(Omega_A || eps))));

  // Potentiator state (P) = average rayProfile value — the reachable possibility field
  const rayValues = Object.values(sig.rayProfile);
  const P = rayValues.reduce((a, b) => a + b, 0) / (rayValues.length || 1);
  // Potentiator digestion efficiency (η_P) = 1 - average unresolved shadow severity
  const eta_P = shadowIntegration;
  // Experience flux (|E|) = totalEncounters — cumulative integrated state-update
  const experienceFlux = sig.totalEncounters + eps;
  // σ_C = (P × η_P) / (|E| + ε) — field conductance
  const sigma_C = (P * eta_P) / (experienceFlux + eps);
  // C_z = exp(-|ln(σ_C)|) — optimal at σ_C = 1 (balanced conductance)
  const connectionCoeff = clamp01(Math.exp(-Math.abs(Math.log(sigma_C || eps))));

  // B_H = min(A_z, C_z) / max(A_z, C_z) — horizontal balance (boundary symmetry)
  const horizontalBalance = Math.max(autonomyCoeff, connectionCoeff) > 0
    ? clamp01(Math.min(autonomyCoeff, connectionCoeff) / Math.max(autonomyCoeff, connectionCoeff))
    : 0;

  // B_V = min(Eros, Agape) / max(Eros, Agape) — vertical balance (ascent/descent symmetry)
  const erosWeight = sig.drives.weights.Eros ?? 0;
  const agapeWeight = sig.drives.weights.Agape ?? 0;
  const verticalBalance = Math.max(erosWeight, agapeWeight) > 0
    ? clamp01(Math.min(erosWeight, agapeWeight) / Math.max(erosWeight, agapeWeight))
    : 0;

  // G_z = (A_z × C_z × B_H × B_V)^(1/4) — geometric mean of 4 factors
  // Key property: any factor near 0 collapses G_z (the Goldilocks Zone requirement)
  const value = clamp01(Math.pow(autonomyCoeff * connectionCoeff * horizontalBalance * verticalBalance, 0.25));

  return {
    value,
    driveBalance,
    shadowIntegration,
    thetaFreshness,
    complexBalance,
    autonomyCoeff,
    connectionCoeff,
    horizontalBalance,
    verticalBalance,
  };
}

/**
 * DEV-1: Compute P_z from Significator state using the HoloOS gradient × alignment formula.
 *
 * Per HoloOS 00.md §6.3:
 *   P_z = ∇Ψ × cos(θ_alignment)
 *
 * Where:
 *   ∇Ψ = |P - M| / (P + M + ε) — structural potential gradient (Matrix vs Potentiator distance)
 *   cos(θ_alignment) = polar alignment — behavioral output aligned with core choice
 *
 * Key property: P_z rewards COMMITMENT, not balance. Neutrality is the pathology
 * (the sinkhole of indifference). cos(θ_alignment) inverts the balance logic.
 */
export function computePz(sig: Significator): PzMetric {
  const eps = 0.01;

  // --- Legacy components (retained for backward compat + telemetry) ---
  const polarityCrystallization = clamp01(sig.polarity.master.crystallizationProgress ?? 0);

  const currentOrd = stageOrdinal(sig.currentStage);
  const linesAtEdge = Object.values(sig.altitudes).filter(
    alt => stageOrdinal(alt) >= currentOrd,
  ).length;
  const lineRatio = linesAtEdge / ALL_LINES.length;

  const cellKeys = Object.keys(sig.polarity.cells);
  const crystallizedCells = cellKeys.filter(
    k => (sig.polarity.cells[k]?.crystallization ?? 0) > 0.7,
  ).length;
  const catalystSaturation = cellKeys.length > 0 ? crystallizedCells / cellKeys.length : 0;
  const transformationReadiness = clamp01((lineRatio + catalystSaturation) / 2);

  // Legacy greatWayAlignment (retained for backward compat).
  // DEV-3: When world state is available via computeMetabolicHealth, the real
  // greatWayAlignment is computed from PESTLE tension + NPC relationships +
  // macro-event pressure (see computeGreatWayAlignment below). This legacy
  // fallback is used when only the sig is available (no world state).
  const greatWayAlignment = polarityCrystallization > 0.5 ? polarityCrystallization : polarityCrystallization * 0.5;

  const recent = sig.recentEncounters ?? [];
  const avoidanceRate = recent.length > 0
    ? recent.filter(e => !e.passed).length / recent.length
    : 0;
  const choiceAuthenticity = clamp01(1 - avoidanceRate);

  // --- DEV-1: HoloOS gradient × alignment formula (per 00.md §6.3) ---
  // ∇Ψ = |P - M| / (P + M + ε) — structural potential gradient
  // P = Potentiator state (avg rayProfile), M = Matrix state (avg drive weight)
  const rayValues = Object.values(sig.rayProfile);
  const P = rayValues.reduce((a, b) => a + b, 0) / (rayValues.length || 1);
  const driveWeights = Object.values(sig.drives.weights);
  const M = driveWeights.reduce((a, b) => a + b, 0) / (driveWeights.length || 1);
  const structuralGradient = clamp01(Math.abs(P - M) / (P + M + eps));

  // cos(θ_alignment) = polar alignment — how committed the polarity direction is.
  // In HoloOS, this measures behavioral output aligned with core choice.
  // Mysterium mapping: polarity crystallization progress is the commitment measure.
  // Neutrality (crystallizationProgress = 0) is the pathology (sinkhole of indifference).
  // cos(θ_alignment) = crystallizationProgress (0 = depolarized, 1 = fully committed)
  const polarAlignment = polarityCrystallization;

  // P_z = ∇Ψ × cos(θ_alignment) — gradient × alignment
  // Rewards BOTH tension between Matrix/Potentiator AND directional commitment
  const value = clamp01(structuralGradient * polarAlignment);

  return {
    value,
    polarityCrystallization,
    transformationReadiness,
    greatWayAlignment,
    choiceAuthenticity,
    structuralGradient,
    polarAlignment,
  };
}

/**
 * DEV-3: Compute Great Way alignment from WorldState.
 *
 * Per HoloOS 08.8.4, the Great Way is the operating environment — the field of
 * pressure the Significator navigates. PESTLE tension IS Great Way pressure;
 * macro events ARE Great Way transformations; NPC relationships ARE Great Way
 * co-creation. This function measures how aligned the player is with the
 * Great Way's pressure field.
 *
 * Returns { alignment, direction, pressure }:
 * - alignment: 0-1, how much the player's polarity direction matches the
 *   dominant PESTLE pressure direction
 * - direction: 'Radiative' | 'Absorptive' | null — the Great Way's pressure
 *   direction (high social/environmental = Radiative/STO; high
 *   political/economic = Absorptive/STS)
 * - pressure: 0-1, average PESTLE tension + macro-event intensity
 */
export function computeGreatWayAlignment(
  sig: Significator,
  world?: { readonly pestleTension: Readonly<Record<string, number>>; readonly activeMacroEvents?: readonly unknown[]; readonly npcRelationships?: readonly { readonly strength: number }[] },
): { alignment: number; direction: 'Radiative' | 'Absorptive' | null; pressure: number } {
  if (!world) {
    // Fallback when no world state available — use the legacy proxy
    const crystallization = clamp01(sig.polarity.master.crystallizationProgress ?? 0);
    return {
      alignment: crystallization > 0.5 ? crystallization : crystallization * 0.5,
      direction: null,
      pressure: 0,
    };
  }

  // PESTLE tension = Great Way pressure
  const pestleValues = Object.values(world.pestleTension);
  const avgTension = pestleValues.length > 0
    ? pestleValues.reduce((a, b) => a + b, 0) / pestleValues.length
    : 0;
  const macroPressure = (world.activeMacroEvents?.length ?? 0) * 0.15;
  const npcPressure = (world.npcRelationships?.filter(r => r.strength > 0.3).length ?? 0) * 0.05;
  const pressure = clamp01(avgTension + macroPressure + npcPressure);

  // Great Way direction: high social+environmental = Radiative (STO); high
  // political+economic = Absorptive (STS). This maps the PESTLE dimensions to
  // the polarity axes per foundations/18 (the Great Way IS the PESTLE field).
  const social = world.pestleTension.social ?? 0;
  const environmental = world.pestleTension.environmental ?? 0;
  const political = world.pestleTension.political ?? 0;
  const economic = world.pestleTension.economic ?? 0;
  const radiativePressure = social + environmental;
  const absorptivePressure = political + economic;
  const direction: 'Radiative' | 'Absorptive' | null =
    radiativePressure > absorptivePressure + 0.1 ? 'Radiative'
    : absorptivePressure > radiativePressure + 0.1 ? 'Absorptive'
    : null;

  // Alignment = how much the player's polarity direction matches the Great Way's
  const playerDirection = sig.polarity.master.dominantDirection;
  let alignment = 0;
  if (direction !== null && playerDirection !== null) {
    alignment = playerDirection === direction ? 1.0 : 0.3;
  } else if (direction === null && playerDirection === null) {
    alignment = 0.5; // both neutral
  } else {
    alignment = 0.4; // one is neutral
  }
  // Scale by pressure — low pressure means the Great Way isn't exerting much
  // directional force, so alignment matters less
  alignment = clamp01(alignment * (0.5 + pressure * 0.5));

  return { alignment, direction, pressure };
}

/**
 * Compute total Metabolic Health = G_z · P_z.
 * DEV-3: Accepts optional world state for Great Way alignment computation.
 */
export function computeMetabolicHealth(sig: Significator, now: number = Date.now(), world?: { readonly pestleTension: Readonly<Record<string, number>>; readonly activeMacroEvents?: readonly unknown[]; readonly npcRelationships?: readonly { readonly strength: number }[] }): MetabolicHealth {
  const gzBreakdown = computeGz(sig, now);
  const pzBreakdown = computePz(sig);
  const gz = gzBreakdown.value;
  const pz = pzBreakdown.value;
  const total = gz * pz;

  // DEV-3: Compute Great Way alignment from world state when available.
  // This replaces the self-referential proxy that was greatWayAlignment.
  // The result is stored in pzBreakdown.greatWayAlignment via the legacy field
  // (overwritten here with the real value when world is provided).
  if (world) {
    const gwAlignment = computeGreatWayAlignment(sig, world);
    // Override the legacy proxy with the real PESTLE-based alignment
    (pzBreakdown as { greatWayAlignment: number }).greatWayAlignment = gwAlignment.alignment;
  }

  // GAP-D2-2 (per HoloOS 08.8.14 §8.1 + 08.8.21 Gap R4): detect the
  // Significator-Liminality signature to distinguish transitional (healthy
  // phase-transition) from pathological (stuck-in-shadow) states.
  // Signature: P_z spike (> 0.7) + sub-density S7 saturation (≥5/8 lines
  // with polarity crystallization > 0.7).
  const pzSpike = pz > 0.7;
  const cellKeys = Object.keys(sig.polarity.cells);
  const saturatedLines = new Set<string>();
  for (const key of cellKeys) {
    if ((sig.polarity.cells[key]?.crystallization ?? 0) > 0.7) {
      const [line] = key.split(':');
      if (line) saturatedLines.add(line);
    }
  }
  const subDensitySaturation = saturatedLines.size >= 5;
  const isTransitional = pzSpike && subDensitySaturation;

  let interpretation: MetabolicHealth['interpretation'];
  if (isTransitional) {
    // Significator-Liminality: the holon is in phase-transition, NOT pathological.
    // Per 08.8.14, this is a NECESSARY and HEALTHY state — the old Significator
    // is dissolving and the new one has not yet crystallized.
    interpretation = 'transitional';
  } else if (gz < 0.3 && pz < 0.3) {
    interpretation = 'stuck';
  } else if (gz > 0.6 && pz < 0.3) {
    interpretation = 'consolidating'; // healthy but not advancing
  } else if (pz > 0.6 && gz < 0.3) {
    interpretation = 'polarizing-unhealthy'; // advancing without integration
  } else {
    interpretation = 'polarizing-healthy'; // both metrics reasonably nonzero
  }

  return {
    gz,
    pz,
    total,
    gzBreakdown,
    pzBreakdown,
    interpretation,
    liminalitySignature: { pzSpike, subDensitySaturation, isTransitional },
  };
}

/** Synthesize Complex-level altitude (hysteresis across Lines within a Complex). */
export function computeComplexAltitudes(sig: Significator): Record<Complex, number> {
  const result = { Mind: 0, Body: 0, Spirit: 0 } as Record<Complex, number>;
  for (const complex of ['Mind', 'Body', 'Spirit'] as const) {
    const lines = ALL_LINES.filter(l => LINE_COMPLEX[l] === complex);
    const ords = lines.map(l => stageOrdinal(sig.altitudes[l]));
    // Use max (most-developed line in the complex) rather than min —
    // a Complex's altitude is led by its strongest Line.
    result[complex] = Math.max(...ords);
  }
  return result;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// ---------------------------------------------------------------------------
// Wave 5: Static/derived fields per HoloOS 08.8.19/20/16
// ---------------------------------------------------------------------------

/** Substrate-Law mapping per HoloOS 08.8.7 Primal Distortion Genesis Theorem. */
export const SUBSTRATE_LAYER_LAW: readonly { readonly density: number; readonly law: string; readonly stage: string }[] = [
  { density: 1, law: 'Free Will', stage: 'Infrared/Magenta' },
  { density: 2, law: 'Love', stage: 'Red/Amber' },
  { density: 3, law: 'Light', stage: 'Orange/Green/Teal' },
  // NOT a stage. Canon 02: "The sub-octave closure — the Violet event (L8 Turquoise completed)
  // ≈ our octave's contributions". The row previously read `'White'`, which named the retired
  // stage 8 — the same conflation of the ladder's top with the closure EVENT that gave stage 8
  // the Violet ray (see domain/Ray.ts CLOSURE_BINDING). There is no D4 stage in Mysterium.
  { density: 4, law: 'Our octave contributions', stage: 'Violet event (closure — not a stage)' },
];

/** Involution-ground block: 3 prior octaves, each contributing a substrate-layer. */
export const INVOLUTION_GROUND = {
  priorOctaves: [
    { octave: 'N-3', law: 'Free Will', substrateContribution: 'D1 layer' },
    { octave: 'N-2', law: 'Love', substrateContribution: 'D2 layer' },
    { octave: 'N-1', law: 'Light', substrateContribution: 'D3 layer' },
  ],
  currentOctave: 'N (our octave, 3rd density)',
} as const;

/**
 * Wave 5: Compute Indigo-Ray accessibility — closeness to direct unity-access.
 * Per HoloOS 08.8.16 §7.5, this is the average activation of Green/Blue/Indigo
 * ray-centers in the player's rayProfile.
 */
export function computeIndigoRayAccessibility(sig: Significator): number {
  const green = sig.rayProfile.Green ?? 0;
  const blue = sig.rayProfile.Blue ?? 0;
  const indigo = sig.rayProfile.Indigo ?? 0;
  return clamp01((green + blue + indigo) / 3);
}

/**
 * DEV-4: Compute contact-boundary permeability (0.0–1.0).
 *
 * Per HoloOS 00.md, Transformation is the contact-boundary membrane —
 * continuously regulating Catalyst/Experience flow. The permeability is
 * computed from drive balance:
 * - High balance (all drives equal) → optimal permeability (0.5, Goldilocks)
 * - High imbalance → extreme permeability (rigid if one drive dominates, or
 *   confluent if drives are very low)
 *
 * During transformation phases, permeability shifts:
 * - 'crucible' phase → high permeability (0.8) — much Catalyst flows for restructuring
 * - 'emergence' phase → low permeability (0.2) — integration, consolidation
 * - 'unravelling' phase → moderate-high (0.7) — old frame dissolving
 * - 'idle'/'threshold' → computed from drive balance (Goldilocks target)
 */
export function computeContactBoundaryPermeability(sig: Significator): number {
  const phase = sig.transformationPhase ?? 'idle';

  // During transformation phases, override with phase-specific values
  switch (phase) {
    case 'crucible':
      return 0.8; // High permeability — the membrane opens for restructuring
    case 'unravelling':
      return 0.7; // Moderate-high — old frame dissolving, Catalyst pouring in
    case 'emergence':
      return 0.2; // Low permeability — integration, consolidation, the membrane closes
    case 'complete':
      return 0.3; // Low-moderate — post-transformation stabilization
    default:
      break; // 'idle' or 'threshold' — compute from drive balance
  }

  // For idle/threshold: compute from drive balance (the Goldilocks target)
  const weights = Object.values(sig.drives.weights);
  const maxWeight = Math.max(...weights);
  const minWeight = Math.min(...weights);
  const spread = maxWeight - minWeight;

  // Low spread (balanced) → optimal permeability (0.5)
  // High spread (imbalanced) → extreme permeability
  // The direction of the extreme depends on which drives are dominant:
  // - Agency dominant → rigid (low permeability) — armored boundary
  // - Communion dominant → confluent (high permeability) — dissolved boundary
  const agencyWeight = sig.drives.weights.Agency ?? 0;
  const communionWeight = sig.drives.weights.Communion ?? 0;

  if (spread < 0.1) {
    return 0.5; // Goldilocks zone
  }

  // Imbalanced: shift toward extreme based on dominant drive
  const basePermeability = 0.5;
  const shift = Math.min(0.3, spread * 0.5); // max shift of 0.3
  if (agencyWeight > communionWeight) {
    return clamp01(basePermeability - shift); // rigid (Agency dominant = boundary resistance)
  } else {
    return clamp01(basePermeability + shift); // confluent (Communion dominant = boundary dissolution)
  }
}

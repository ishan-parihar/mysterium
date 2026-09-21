import type { Drive } from '../domain/Drive.js';
import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';
import type { HolonKind, EnergeticDirection, Modality, ShadowQuadrant } from '../domain/enums.js';
import type { TransformationRecord } from '../domain/Significator.js';

export interface HolonDriveState {
  readonly dominant: Drive;
  readonly secondary: Drive;
  readonly shadowQuadrant: ShadowQuadrant | null;
}

export interface Holon {
  readonly id: string;
  readonly name: string;
  readonly kind: HolonKind;
  readonly line: Line;
  readonly stage: Stage;
  readonly drives: HolonDriveState;
  readonly polarity: EnergeticDirection;
  readonly narrativeRole: string;
  readonly relationships: readonly string[];
  readonly modality?: Modality;
  readonly active: boolean;
  /**
   * T-1.5 (per AUDIT-HOLOOS-ALIGNMENT.md §2.5.1): Every holon has a
   * Significator — the persistent greater-cycle accumulator. For NPCs,
   * factions, and locations, this is their transformation history. Empty
   * for holons that haven't transformed. Enables the Harvest endgame
   * (retired player characters become mentor-NPCs with preserved state).
   *
   * HoloOS anchor: _THEORY/02_Ontology/02.1_Microcosmic_Metabolic_Architecture.md
   * (canonical) — every holon runs ONE invariant architecture.
   */
  readonly transformations?: readonly TransformationRecord[];
}

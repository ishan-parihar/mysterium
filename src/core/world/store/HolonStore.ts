import type { Holon } from '../Holon.js';
import type { Line } from '../../domain/Line.js';
import type { Stage } from '../../domain/Stage.js';
import type { HolonKind } from '../../domain/enums.js';

export interface HolonRegistry {
  readonly holons: readonly Holon[];
}

export function createRegistry(holons: Holon[]): HolonRegistry {
  return { holons: [...holons] };
}

export function addHolon(registry: HolonRegistry, holon: Holon): HolonRegistry {
  return { holons: [...registry.holons, holon] };
}

export function removeHolon(registry: HolonRegistry, id: string): HolonRegistry {
  return { holons: registry.holons.filter(h => h.id !== id) };
}

export function queryByKind(registry: HolonRegistry, kind: HolonKind): Holon[] {
  return registry.holons.filter(h => h.kind === kind);
}

export function queryByAltitude(registry: HolonRegistry, stage: Stage): Holon[] {
  return registry.holons.filter(h => h.stage === stage);
}

export function queryByLine(registry: HolonRegistry, line: Line): Holon[] {
  return registry.holons.filter(h => h.line === line);
}

export function getHolon(registry: HolonRegistry, id: string): Holon | undefined {
  return registry.holons.find(h => h.id === id);
}

export function queryByNarrativeRole(registry: HolonRegistry, role: string): Holon[] {
  return registry.holons.filter(h => h.narrativeRole === role);
}

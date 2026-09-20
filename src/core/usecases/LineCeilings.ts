/**
 * LineCeilings — enforces cognitive-substrate caps per lines/00 §4.
 * Most lines cannot exceed Cognitive altitude by more than a fixed offset.
 */
import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';
import { ALL_STAGES, stageOrdinal } from '../domain/Stage.js';

interface CeilingRule {
  readonly dependsOn: Line | null;
  readonly offset: number;
}

const LINE_CEILINGS: Readonly<Record<Line, CeilingRule>> = {
  Cognitive:     { dependsOn: null,        offset: 0 },
  Emotional:    { dependsOn: 'Cognitive',  offset: 1 },
  Moral:        { dependsOn: 'Cognitive',  offset: 1 },
  Intrapersonal:{ dependsOn: 'Cognitive',  offset: 1 },
  Spiritual:    { dependsOn: 'Cognitive',  offset: 1 },
  Somatic:      { dependsOn: null,         offset: 0 },
  Willpower:    { dependsOn: 'Cognitive',  offset: 2 },
  Interpersonal:{ dependsOn: 'Cognitive',  offset: 1 },
};

/**
 * Get the maximum stage a line can reach given current altitudes.
 */
export function lineCeiling(line: Line, altitudes: Record<Line, Stage>): Stage {
  const rule = LINE_CEILINGS[line];
  if (!rule.dependsOn) return 'Turquoise';
  const depOrd = stageOrdinal(altitudes[rule.dependsOn]);
  const maxOrd = Math.min(depOrd + rule.offset, ALL_STAGES.length - 1);
  return ALL_STAGES[maxOrd]!;
}

/**
 * Cap a proposed altitude to the line's ceiling.
 */
export function capToCeiling(line: Line, proposed: Stage, altitudes: Record<Line, Stage>): Stage {
  const ceiling = lineCeiling(line, altitudes);
  const proposedOrd = stageOrdinal(proposed);
  const ceilingOrd = stageOrdinal(ceiling);
  return proposedOrd <= ceilingOrd ? proposed : ceiling;
}

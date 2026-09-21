import type { EncounterSpec } from '../../domain/Encounter.js';
import { cognitiveEncounters } from './cognitive.js';
import { emotionalEncounters } from './emotional.js';
import { moralEncounters } from './moral.js';
import { intrapersonalEncounters } from './intrapersonal.js';
import { spiritualEncounters } from './spiritual.js';
import { somaticEncounters } from './somatic.js';
import { willpowerEncounters } from './willpower.js';
import { interpersonalEncounters } from './interpersonal.js';
import { conquerorEncounters } from './conqueror.js';

export const redEncounterData: readonly EncounterSpec[] = [
  ...cognitiveEncounters,
  ...emotionalEncounters,
  ...moralEncounters,
  ...intrapersonalEncounters,
  ...spiritualEncounters,
  ...somaticEncounters,
  ...willpowerEncounters,
  ...interpersonalEncounters,
  // GAP-WB-3: Register the 4-phase Conqueror boss encounters
  ...conquerorEncounters,
];

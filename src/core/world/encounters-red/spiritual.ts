import type { EncounterSpec } from '../../domain/Encounter.js';

export const spiritualEncounters: readonly EncounterSpec[] = [
  {
    id: 'red-spi-language-primalconnect',
    lines: ['Spiritual', 'Somatic'],
    stage: 'Red',
    quadrants: ['UL', 'UR'],
    role: 'side',
    ray: 'Yellow',
    modality: 'LanguageReflective',
    taskBinds: [{ taskSlug: 'breath_rhythm', line: 'Spiritual' }],
    narrative: {
      theme: 'Primal Connection',
      allyBeats: ['The earth speaks through your bones — listen.'],
      codexEntry: 'Before temples were built, the body itself was the sacred site.',
    },
    enemy: {
      name: 'Earth-Caller',
      difficulty: 2,
    },
  },
  {
    id: 'red-spi-scenario-warritritual',
    lines: ['Spiritual', 'Willpower'],
    stage: 'Red',
    quadrants: ['UL', 'UR'],
    role: 'side',
    ray: 'Yellow',
    modality: 'ScenarioChoice',
    taskBinds: [{ taskSlug: 'held_input', line: 'Willpower' }],
    narrative: {
      theme: 'War-Ritual',
      allyBeats: ['The ritual demands stillness amid chaos — hold or break.'],
      codexEntry: 'The war-ritual channels primal fury into sacred purpose.',
    },
    enemy: {
      name: 'Ritual Guardian',
      difficulty: 2,
    },
  },
  {
    id: 'red-spi-immersive-powersource',
    lines: ['Spiritual', 'Emotional'],
    stage: 'Red',
    quadrants: ['UL'],
    role: 'side',
    ray: 'Yellow',
    modality: 'ImmersiveRPG',
    taskBinds: [{ taskSlug: 'breath_rhythm', line: 'Spiritual' }],
    narrative: {
      theme: 'Power-Source Identification',
      allyBeats: ['From where does your strength flow — rage, devotion, or something deeper?'],
      codexEntry: 'The warrior who names their source of power transcends blind fury.',
    },
    enemy: {
      name: 'Source Phantom',
      difficulty: 2,
    },
  },
];

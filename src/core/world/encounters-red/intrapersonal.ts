import type { EncounterSpec } from '../../domain/Encounter.js';

export const intrapersonalEncounters: readonly EncounterSpec[] = [
  {
    id: 'red-intra-language-impulserecog',
    lines: ['Intrapersonal', 'Emotional'],
    stage: 'Red',
    quadrants: ['UL'],
    role: 'side',
    ray: 'Yellow',
    modality: 'LanguageReflective',
    taskBinds: [{ taskSlug: 'self_report', line: 'Intrapersonal' }],
    narrative: {
      theme: 'Impulse Recognition',
      allyBeats: ['Name the urge before it names you.'],
      codexEntry: 'Self-awareness begins when impulse is witnessed, not obeyed.',
    },
    enemy: {
      name: 'Impulse Shade',
      difficulty: 1,
    },
  },
  {
    id: 'red-intra-scenario-pressureself',
    lines: ['Intrapersonal', 'Willpower'],
    stage: 'Red',
    quadrants: ['UL', 'UR'],
    role: 'side',
    ray: 'Yellow',
    modality: 'ScenarioChoice',
    taskBinds: [{ taskSlug: 'stroop', line: 'Intrapersonal' }],
    narrative: {
      theme: 'Self-Awareness Under Pressure',
      allyBeats: ['The arena roars — can you still hear your own voice?'],
      codexEntry: 'Pressure reveals who you truly are beneath the mask.',
    },
    enemy: {
      name: 'Mirror Gladiator',
      difficulty: 2,
    },
  },
  {
    id: 'red-intra-immersive-shadowduel',
    lines: ['Intrapersonal', 'Cognitive'],
    stage: 'Red',
    quadrants: ['UL', 'UR'],
    role: 'side',
    ray: 'Yellow',
    modality: 'ImmersiveRPG',
    taskBinds: [{ taskSlug: 'self_report', line: 'Intrapersonal' }],
    narrative: {
      theme: 'Shadow Duel',
      allyBeats: ['Your own shadow rises — it knows every move you will make.'],
      codexEntry: 'The warrior who defeats their shadow gains self-mastery.',
    },
    enemy: {
      name: 'Shadow Self',
      difficulty: 2,
    },
  },
];

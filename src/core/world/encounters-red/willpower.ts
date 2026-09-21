import type { EncounterSpec } from '../../domain/Encounter.js';

export const willpowerEncounters: readonly EncounterSpec[] = [
  {
    id: 'red-wil-deterministic-goallock',
    lines: ['Willpower', 'Cognitive'],
    stage: 'Red',
    quadrants: ['UR'],
    role: 'side',
    ray: 'Yellow',
    modality: 'Deterministic',
    taskBinds: [{ taskSlug: 'go_no_go', line: 'Willpower' }],
    narrative: {
      theme: 'Goal-Lock',
      allyBeats: ['Lock onto the target — ignore all distraction.'],
      codexEntry: 'The will that cannot be diverted becomes unstoppable.',
    },
    enemy: {
      name: 'Distraction Fiend',
      difficulty: 2,
    },
  },
  {
    id: 'red-wil-strategic-defiancepressure',
    lines: ['Willpower', 'Interpersonal'],
    stage: 'Red',
    quadrants: ['UR', 'LL'],
    role: 'side',
    ray: 'Yellow',
    modality: 'Strategic',
    taskBinds: [{ taskSlug: 'held_input', line: 'Willpower' }],
    narrative: {
      theme: 'Defiance Under Pressure',
      allyBeats: ['They demand submission — hold your ground.'],
      codexEntry: 'Defiance is will made visible against superior force.',
    },
    enemy: {
      name: 'Pressure Lord',
      difficulty: 2,
    },
  },
  {
    id: 'red-wil-embodied-sustainedeffort',
    lines: ['Willpower', 'Somatic'],
    stage: 'Red',
    quadrants: ['UR'],
    role: 'side',
    ray: 'Yellow',
    modality: 'Embodied',
    taskBinds: [{ taskSlug: 'held_input', line: 'Willpower' }],
    narrative: {
      theme: 'Sustained Effort',
      allyBeats: ['Your arms burn — one more rep, one more breath.'],
      codexEntry: 'Sustained effort is where willpower and flesh become one.',
    },
    enemy: {
      name: 'Exhaustion Demon',
      difficulty: 3,
    },
  },
  {
    id: 'red-wil-immersive-ironcage',
    lines: ['Willpower', 'Emotional'],
    stage: 'Red',
    quadrants: ['UR', 'UL'],
    role: 'side',
    ray: 'Yellow',
    modality: 'ImmersiveRPG',
    taskBinds: [{ taskSlug: 'go_no_go', line: 'Willpower' }],
    narrative: {
      theme: 'Iron Cage Trial',
      allyBeats: ['Trapped and provoked — do not act until the moment is right.'],
      codexEntry: 'The iron cage tests whether your will commands your instincts.',
    },
    enemy: {
      name: 'Cage Master',
      difficulty: 2,
    },
  },
];

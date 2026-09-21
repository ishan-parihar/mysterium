import type { EncounterSpec } from '../../domain/Encounter.js';

export const somaticEncounters: readonly EncounterSpec[] = [
  {
    id: 'red-som-embodied-reflexdrill',
    lines: ['Somatic', 'Cognitive'],
    stage: 'Red',
    quadrants: ['UR'],
    role: 'side',
    ray: 'Yellow',
    modality: 'Embodied',
    taskBinds: [{ taskSlug: 'reaction_time', line: 'Somatic' }],
    narrative: {
      theme: 'Reflex Training',
      allyBeats: ['Strike the target the instant it appears — hesitation is death.'],
      codexEntry: 'The body trained in reflex moves before thought can slow it.',
    },
    enemy: {
      name: 'Reflex Golem',
      difficulty: 2,
    },
  },
  {
    id: 'red-som-deterministic-combatposture',
    lines: ['Somatic', 'Willpower'],
    stage: 'Red',
    quadrants: ['UR'],
    role: 'side',
    ray: 'Yellow',
    modality: 'Deterministic',
    taskBinds: [{ taskSlug: 'held_input', line: 'Somatic' }],
    narrative: {
      theme: 'Combat Posture',
      allyBeats: ['Hold the stance — your body is the shield.'],
      codexEntry: 'Posture is the silent declaration of readiness.',
    },
    enemy: {
      name: 'Iron Stance',
      difficulty: 3,
    },
  },
  {
    id: 'red-som-strategic-endurancetrial',
    lines: ['Somatic', 'Emotional'],
    stage: 'Red',
    quadrants: ['UR', 'UL'],
    role: 'side',
    ray: 'Yellow',
    modality: 'Strategic',
    taskBinds: [{ taskSlug: 'reaction_time', line: 'Somatic' }],
    narrative: {
      theme: 'Endurance Trial',
      allyBeats: ['Pace yourself — the trial ends only when your will does.'],
      codexEntry: 'Endurance is strategy written in flesh and breath.',
    },
    enemy: {
      name: 'Endurance Warden',
      difficulty: 3,
    },
  },
  {
    id: 'red-som-immersive-pitfighter',
    lines: ['Somatic', 'Interpersonal'],
    stage: 'Red',
    quadrants: ['UR', 'LL'],
    role: 'side',
    ray: 'Yellow',
    modality: 'ImmersiveRPG',
    taskBinds: [{ taskSlug: 'reaction_time', line: 'Somatic' }],
    narrative: {
      theme: 'Pit-Fighter Challenge',
      allyBeats: ['The crowd roars — adapt to each opponent or fall.'],
      codexEntry: 'In the pit, the body speaks the only language that matters.',
    },
    enemy: {
      name: 'Pit Champion',
      difficulty: 3,
    },
  },
];

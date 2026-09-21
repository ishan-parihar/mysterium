import type { EncounterSpec } from '../../domain/Encounter.js';

export const emotionalEncounters: readonly EncounterSpec[] = [
  {
    id: 'red-emo-scenario-ragereader',
    lines: ['Emotional', 'Interpersonal'],
    stage: 'Red',
    quadrants: ['UL', 'LL'],
    role: 'side',
    ray: 'Yellow',
    modality: 'ScenarioChoice',
    taskBinds: [{ taskSlug: 'affect_recognition', line: 'Emotional' }],
    narrative: {
      theme: 'Rage-Reading',
      allyBeats: ['The warrior snarls — is it fury or fear behind those eyes?'],
      codexEntry: 'To read rage is to disarm it before the blow falls.',
    },
    enemy: {
      name: 'Rage-Reader',
      difficulty: 2,
    },
  },
  {
    id: 'red-emo-embodied-fearpulse',
    lines: ['Emotional', 'Somatic'],
    stage: 'Red',
    quadrants: ['UL', 'UR'],
    role: 'side',
    ray: 'Yellow',
    modality: 'Embodied',
    taskBinds: [{ taskSlug: 'breath_rhythm', line: 'Somatic' }],
    narrative: {
      theme: 'Fear-Pulse',
      allyBeats: ['Your heartbeat spikes — breathe through the terror.'],
      codexEntry: 'Fear lives in the body before the mind can name it.',
    },
    enemy: {
      name: 'Dread Stalker',
      difficulty: 2,
    },
  },
  {
    id: 'red-emo-social-dominance',
    lines: ['Emotional', 'Moral'],
    stage: 'Red',
    quadrants: ['UL', 'LL'],
    role: 'side',
    ray: 'Yellow',
    modality: 'SocialCooperative',
    taskBinds: [{ taskSlug: 'affect_recognition', line: 'Emotional' }],
    narrative: {
      theme: 'Dominance Display',
      allyBeats: ['The pack circles — show strength without cruelty.'],
      codexEntry: 'True dominance earns respect; false dominance breeds rebellion.',
    },
    enemy: {
      name: 'Pack Alpha',
      difficulty: 2,
    },
  },
  {
    id: 'red-emo-immersive-berserkveil',
    lines: ['Emotional', 'Willpower'],
    stage: 'Red',
    quadrants: ['UL', 'UR'],
    role: 'side',
    ray: 'Yellow',
    modality: 'ImmersiveRPG',
    taskBinds: [{ taskSlug: 'go_no_go', line: 'Willpower' }],
    narrative: {
      theme: 'Berserk Veil',
      allyBeats: ['The red mist descends — choose when to unleash.'],
      codexEntry: 'The berserker who chooses when to rage masters the veil.',
    },
    enemy: {
      name: 'Veil Berserker',
      difficulty: 3,
    },
  },
];

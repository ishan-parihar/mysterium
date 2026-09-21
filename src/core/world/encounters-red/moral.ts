import type { EncounterSpec } from '../../domain/Encounter.js';

export const moralEncounters: readonly EncounterSpec[] = [
  {
    id: 'red-mor-scenario-survivalethics',
    lines: ['Moral', 'Cognitive'],
    stage: 'Red',
    quadrants: ['LL', 'UR'],
    role: 'side',
    ray: 'Yellow',
    modality: 'ScenarioChoice',
    taskBinds: [{ taskSlug: 'dilemma_choice', line: 'Moral' }],
    narrative: {
      theme: 'Survival Ethics',
      allyBeats: ['Food for one or hunger for all — choose now.'],
      codexEntry: 'Scarcity is the forge in which morality is tested.',
    },
    enemy: {
      name: 'Famine Wraith',
      difficulty: 2,
    },
  },
  {
    id: 'red-mor-language-loyaltyjustice',
    lines: ['Moral', 'Interpersonal'],
    stage: 'Red',
    quadrants: ['LL', 'LR'],
    role: 'side',
    ray: 'Yellow',
    modality: 'LanguageReflective',
    taskBinds: [{ taskSlug: 'value_coherence', line: 'Moral' }],
    narrative: {
      theme: 'Loyalty vs Justice',
      allyBeats: ['Your comrade stole — do you report or protect?'],
      codexEntry: 'When loyalty and justice collide, the warrior discovers their true code.',
    },
    enemy: {
      name: 'Oath-Breaker',
      difficulty: 2,
    },
  },
  {
    id: 'red-mor-social-mercyvengeance',
    lines: ['Moral', 'Emotional'],
    stage: 'Red',
    quadrants: ['LL', 'UL'],
    role: 'side',
    ray: 'Yellow',
    modality: 'SocialCooperative',
    taskBinds: [{ taskSlug: 'dilemma_choice', line: 'Moral' }],
    narrative: {
      theme: 'Mercy vs Vengeance',
      allyBeats: ['The defeated foe begs — your blade still drips.'],
      codexEntry: 'Mercy requires more strength than vengeance ever did.',
    },
    enemy: {
      name: 'Fallen Rival',
      difficulty: 2,
    },
  },
  {
    id: 'red-mor-immersive-warcourt',
    lines: ['Moral', 'Willpower'],
    stage: 'Red',
    quadrants: ['LL', 'UR'],
    role: 'side',
    ray: 'Yellow',
    modality: 'ImmersiveRPG',
    taskBinds: [{ taskSlug: 'dilemma_choice', line: 'Moral' }],
    narrative: {
      theme: 'War-Court Judgment',
      allyBeats: ['You sit in judgment — the tribe demands blood, wisdom demands pause.'],
      codexEntry: 'The war-court reveals whether power serves order or appetite.',
    },
    enemy: {
      name: 'War-Judge',
      difficulty: 2,
    },
  },
];

import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';

export interface PolarityTexture {
  readonly sto: string;
  readonly sts: string;
  readonly exploratory: string;
}

export type PolarityOntology = Readonly<Record<string, PolarityTexture>>;

export function getTexture(ontology: PolarityOntology, line: Line, stage: Stage): PolarityTexture | undefined {
  return ontology[`${line}:${stage}`];
}

export const DEFAULT_POLARITY_ONTOLOGY: PolarityOntology = {
  // ── Cognitive ──
  'Cognitive:Infrared': { sto: 'sensory-alertness-for-group', sts: 'hoarding-awareness', exploratory: 'primal-noticing' },
  'Cognitive:Magenta': { sto: 'mythic-storytelling', sts: 'deceptive-enchantment', exploratory: 'magical-wondering' },
  'Cognitive:Red': { sto: 'strategic-service', sts: 'cunning-dominance', exploratory: 'tactical-curiosity' },
  'Cognitive:Amber': { sto: 'doctrinal-teaching', sts: 'dogmatic-control', exploratory: 'systematic-inquiry' },
  'Cognitive:Orange': { sto: 'rational-innovation-shared', sts: 'intellectual-exploitation', exploratory: 'hypothesis-testing' },
  'Cognitive:Green': { sto: 'perspectival-bridging', sts: 'relativistic-paralysis', exploratory: 'multi-lens-seeing' },
  'Cognitive:Teal': { sto: 'holistic-synthesis-offered', sts: 'meta-cognitive-elitism', exploratory: 'integral-mapping' },
  'Cognitive:Turquoise': { sto: 'nondual-clarity-radiated', sts: 'transcendent-detachment', exploratory: 'witness-cognition' },

  // ── Emotional ──
  'Emotional:Infrared': { sto: 'protective-alarm', sts: 'terror-projection', exploratory: 'raw-sensation' },
  'Emotional:Magenta': { sto: 'tribal-warmth', sts: 'emotional-enmeshment', exploratory: 'wonder-feeling' },
  'Emotional:Red': { sto: 'fierce-compassion', sts: 'emotional-weaponization', exploratory: 'raw-feeling' },
  'Emotional:Amber': { sto: 'devotional-care', sts: 'guilt-induction', exploratory: 'belonging-affect' },
  'Emotional:Orange': { sto: 'empathic-attunement', sts: 'charm-manipulation', exploratory: 'emotional-literacy' },
  'Emotional:Green': { sto: 'radical-acceptance', sts: 'emotional-flooding', exploratory: 'deep-empathy' },
  'Emotional:Teal': { sto: 'transpersonal-compassion', sts: 'spiritual-bypassing', exploratory: 'collective-feeling' },
  'Emotional:Turquoise': { sto: 'unconditional-love', sts: 'dissociative-bliss', exploratory: 'nondual-affect' },

  // ── Moral ──
  'Moral:Infrared': { sto: 'instinctive-protection', sts: 'predatory-amorality', exploratory: 'survival-ethics' },
  'Moral:Magenta': { sto: 'kinship-loyalty', sts: 'tribal-exclusion', exploratory: 'taboo-testing' },
  'Moral:Red': { sto: 'honor-for-the-weak', sts: 'might-makes-right', exploratory: 'power-ethics' },
  'Moral:Amber': { sto: 'dutiful-service', sts: 'righteous-punishment', exploratory: 'rule-following' },
  'Moral:Orange': { sto: 'fair-dealing', sts: 'contractual-exploitation', exploratory: 'utilitarian-calculus' },
  'Moral:Green': { sto: 'justice-advocacy', sts: 'moral-superiority', exploratory: 'care-reasoning' },
  'Moral:Teal': { sto: 'universal-responsibility', sts: 'cosmic-indifference', exploratory: 'integral-ethics' },
  'Moral:Turquoise': { sto: 'selfless-dharma', sts: 'amoral-transcendence', exploratory: 'nondual-morality' },

  // ── Intrapersonal ──
  'Intrapersonal:Infrared': { sto: 'body-trust-shared', sts: 'narcissistic-survival', exploratory: 'self-sensing' },
  'Intrapersonal:Magenta': { sto: 'dream-sharing', sts: 'fantasy-withdrawal', exploratory: 'inner-imagery' },
  'Intrapersonal:Red': { sto: 'self-mastery-modeled', sts: 'grandiose-inflation', exploratory: 'ego-testing' },
  'Intrapersonal:Amber': { sto: 'humble-self-offering', sts: 'self-denial-control', exploratory: 'role-identity' },
  'Intrapersonal:Orange': { sto: 'authentic-self-expression', sts: 'self-branding', exploratory: 'self-concept-revision' },
  'Intrapersonal:Green': { sto: 'vulnerable-transparency', sts: 'identity-diffusion', exploratory: 'shadow-dialogue' },
  'Intrapersonal:Teal': { sto: 'witness-presence-offered', sts: 'spiritual-narcissism', exploratory: 'meta-self-awareness' },
  'Intrapersonal:Turquoise': { sto: 'egoless-service', sts: 'self-annihilation', exploratory: 'nondual-identity' },

  // ── Spiritual ──
  'Spiritual:Infrared': { sto: 'animistic-reverence', sts: 'superstitious-dread', exploratory: 'numinous-sensing' },
  'Spiritual:Magenta': { sto: 'ritual-blessing', sts: 'magical-coercion', exploratory: 'sacred-play' },
  'Spiritual:Red': { sto: 'warrior-devotion', sts: 'power-worship', exploratory: 'divine-will-testing' },
  'Spiritual:Amber': { sto: 'faithful-stewardship', sts: 'fundamentalist-control', exploratory: 'doctrinal-seeking' },
  'Spiritual:Orange': { sto: 'contemplative-inquiry', sts: 'spiritual-materialism', exploratory: 'meaning-experimentation' },
  'Spiritual:Green': { sto: 'interfaith-service', sts: 'syncretistic-appropriation', exploratory: 'pluralistic-seeking' },
  'Spiritual:Teal': { sto: 'cosmic-stewardship', sts: 'guru-complex', exploratory: 'unitive-exploration' },
  'Spiritual:Turquoise': { sto: 'transparent-radiance', sts: 'nihilistic-void', exploratory: 'nondual-abiding' },

  // ── Somatic ──
  'Somatic:Infrared': { sto: 'protective-embodiment', sts: 'feral-aggression', exploratory: 'sensorimotor-play' },
  'Somatic:Magenta': { sto: 'dance-offering', sts: 'body-possession', exploratory: 'rhythmic-exploration' },
  'Somatic:Red': { sto: 'strength-in-service', sts: 'physical-domination', exploratory: 'power-testing' },
  'Somatic:Amber': { sto: 'disciplined-labor', sts: 'body-mortification', exploratory: 'form-practice' },
  'Somatic:Orange': { sto: 'peak-performance-shared', sts: 'body-exploitation', exploratory: 'athletic-optimization' },
  'Somatic:Green': { sto: 'somatic-healing-offered', sts: 'body-idealization', exploratory: 'embodied-sensitivity' },
  'Somatic:Teal': { sto: 'energy-channeling', sts: 'kundalini-inflation', exploratory: 'subtle-body-mapping' },
  'Somatic:Turquoise': { sto: 'transfigured-presence', sts: 'disembodied-escape', exploratory: 'nondual-embodiment' },

  // ── Willpower ──
  'Willpower:Infrared': { sto: 'survival-persistence-shared', sts: 'desperate-clinging', exploratory: 'impulse-testing' },
  'Willpower:Magenta': { sto: 'ritual-commitment', sts: 'obsessive-fixation', exploratory: 'desire-exploration' },
  'Willpower:Red': { sto: 'heroic-resolve', sts: 'tyrannical-imposition', exploratory: 'will-to-power' },
  'Willpower:Amber': { sto: 'steadfast-duty', sts: 'rigid-obedience', exploratory: 'discipline-building' },
  'Willpower:Orange': { sto: 'goal-directed-service', sts: 'ruthless-ambition', exploratory: 'achievement-drive' },
  'Willpower:Green': { sto: 'collective-commitment', sts: 'passive-abdication', exploratory: 'consensual-willing' },
  'Willpower:Teal': { sto: 'surrendered-will', sts: 'spiritual-willfulness', exploratory: 'integral-intention' },
  'Willpower:Turquoise': { sto: 'divine-will-alignment', sts: 'will-dissolution', exploratory: 'nondual-volition' },

  // ── Interpersonal ──
  'Interpersonal:Infrared': { sto: 'pack-bonding', sts: 'parasitic-attachment', exploratory: 'proximity-seeking' },
  'Interpersonal:Magenta': { sto: 'tribal-nurturing', sts: 'clannish-exclusion', exploratory: 'belonging-play' },
  'Interpersonal:Red': { sto: 'loyal-alliance', sts: 'dominance-hierarchy', exploratory: 'power-relating' },
  'Interpersonal:Amber': { sto: 'communal-service', sts: 'conformity-enforcement', exploratory: 'role-relating' },
  'Interpersonal:Orange': { sto: 'collaborative-networking', sts: 'transactional-manipulation', exploratory: 'strategic-relating' },
  'Interpersonal:Green': { sto: 'deep-mutuality', sts: 'codependent-merging', exploratory: 'empathic-relating' },
  'Interpersonal:Teal': { sto: 'collective-resonance', sts: 'boundary-dissolution', exploratory: 'field-relating' },
  'Interpersonal:Turquoise': { sto: 'universal-communion', sts: 'relational-bypassing', exploratory: 'nondual-relating' },
};

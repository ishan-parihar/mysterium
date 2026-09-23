/**
 * The ScenarioChoice corpus — a scene and a drive-mapped option set per line × stage.
 *
 * Split out of `FallbackProvider.ts` (module-cohesion audit item 5): this module is DATA,
 * authored against `schema.ts`. Nothing here decides anything — the pools are selected in
 * `../FallbackProvider.ts`, where `LR_BY_LINE_*`/`SC_BY_LINE_*` route each cell to a pool.
 */
import { driveOptionsToMCQ, type FallbackContent } from './schema.js';

export // ============================================================================
// LINE-SPECIFIC SCENARIO CHOICE CONTENT — Red stage
// ============================================================================

const SC_COGNITIVE_RED: readonly FallbackContent[] = [
  {
    scenario: 'Your team faces a problem no one has solved before. The old methods don\'t work. Two approaches emerge — one familiar but insufficient, one untested but promising.',
    options: driveOptionsToMCQ({
      agency: 'Take charge — design a new approach from first principles',
      communion: 'Gather everyone\'s perspectives before deciding',
      eros: 'Push into the untested approach despite the risk',
      agape: 'Synthesize both approaches into something neither camp expected',
    }),
  },
  {
    scenario: 'A decision must be made with incomplete information. Acting now means risk; waiting means losing the window. Your mind sees patterns in the data — but the patterns might be illusions.',
    options: driveOptionsToMCQ({
      agency: 'Trust the strongest pattern and act decisively',
      communion: 'Consult others to triangulate the pattern\'s meaning',
      eros: 'Hypothesize beyond the data — take an intuitive leap',
      agape: 'Hold the ambiguity — let the pattern reveal itself before acting',
    }),
  },
];

export const SC_EMOTIONAL_RED: readonly FallbackContent[] = [
  {
    scenario: 'A close friend shares devastating news. You feel your own emotions surge — grief, fear, helplessness. Your friend is watching your face for cues.',
    options: driveOptionsToMCQ({
      agency: 'Contain your reaction — be the strong one they need',
      communion: 'Feel with them — let your own grief be a bridge',
      eros: 'Use the moment to deepen the truth of your bond',
      agape: 'Hold space for both your pain and theirs without choosing',
    }),
  },
  {
    scenario: 'You are overwhelmed. Multiple stressors converge — work, relationships, health. Your emotional bandwidth is exhausted. Someone needs you.',
    options: driveOptionsToMCQ({
      agency: 'Push through — you can handle it if you organize better',
      communion: 'Reach out — you need support too, and asking is not weakness',
      eros: 'Use the overwhelm as fuel — pressure reveals what matters',
      agape: 'Accept the limitation — you cannot pour from an empty vessel',
    }),
  },
];

export const SC_MORAL_RED: readonly FallbackContent[] = [
  {
    scenario: 'You discover that a friend has been lying to someone you both care about. The lie is harmful but well-intentioned. Confronting it will damage the friendship.',
    options: driveOptionsToMCQ({
      agency: 'Confront the lie directly — truth is non-negotiable',
      communion: 'Talk to your friend privately — seek understanding before action',
      eros: 'Use the situation to catalyze deeper honesty between everyone involved',
      agape: 'Hold the complexity — the harm and the intention both deserve acknowledgment',
    }),
  },
  {
    scenario: 'You witness a systemic injustice. You have the power to act but doing so will cost you personally — reputation, safety, comfort. Silence is safe and complicit.',
    options: driveOptionsToMCQ({
      agency: 'Act — your agency demands you resist what is wrong',
      communion: 'Mobilize collective action — this is bigger than you',
      eros: 'The injustice is a call to your highest capacity — answer it',
      agape: 'Act from compassion for all sides, including those perpetrating the harm',
    }),
  },
];

export const SC_INTRAPERSONAL_RED: readonly FallbackContent[] = [
  {
    scenario: 'You look in the mirror and see someone you barely recognize. The face is yours but the expression belongs to someone performing a life. A question surfaces: who are you when no one is watching?',
    options: driveOptionsToMCQ({
      agency: 'Define yourself on your own terms — reject others\' projections',
      communion: 'Ask the people closest to you who they see',
      eros: 'Sit with the uncertainty — let the unfamiliar self reveal itself',
      agape: 'Accept all the versions — the performer and the one beneath',
    }),
  },
];

export const SC_SPIRITUAL_RED: readonly FallbackContent[] = [
  {
    scenario: 'You stand at a threshold. Behind you — a life built on achievement, accumulation, and identity. Before you — an unknown that might dissolve everything you\'ve built. Something in you knows the threshold must be crossed.',
    options: driveOptionsToMCQ({
      agency: 'Choose to cross — will yourself through the threshold',
      communion: 'Ask others who have crossed — learn from their passage',
      eros: 'Follow the pull — let longing carry you forward',
      agape: 'Hold both sides — cross without destroying what came before',
    }),
  },
];

export const SC_INTERPERSONAL_RED: readonly FallbackContent[] = [
  {
    scenario: 'In a group setting, someone is being excluded. You notice it. The group dynamic is fragile — intervening could disrupt the social order or protect someone who needs it.',
    options: driveOptionsToMCQ({
      agency: 'Speak up directly — name what you see and redirect the group',
      communion: 'Include the excluded person through direct engagement',
      eros: 'Use the moment to challenge the group\'s patterns of belonging',
      agape: 'Hold awareness of everyone\'s pain — the excluded and the excluders',
    }),
  },
];

export const SC_SOMATIC_RED: readonly FallbackContent[] = [
  {
    scenario: 'Your body is sending signals — tension, fatigue, restlessness — but you are busy. The signals compete with your agenda. You can override them, attend to them, or find a middle way.',
    options: driveOptionsToMCQ({
      agency: 'Override — your will drives the body, not the reverse',
      communion: 'Listen — the body knows things the mind ignores',
      eros: 'Attune — find the rhythm between what the body wants and what the day demands',
      agape: 'Integrate — let body and mind negotiate rather than compete',
    }),
  },
];

export const SC_WILLPOWER_RED: readonly FallbackContent[] = [
  {
    scenario: 'You committed to a difficult goal. You are halfway through and exhausted. The finish line is real but distant. Quitting would relieve the pressure but betray the commitment.',
    options: driveOptionsToMCQ({
      agency: 'Push through — your will is stronger than fatigue',
      communion: 'Ask for help — endurance shared is endurance multiplied',
      eros: 'Reconnect with why you started — let purpose fuel persistence',
      agape: 'Reassess — maybe the goal needs to evolve, not be abandoned',
    }),
  },
];

export // Line-specific ScenarioChoice for Orange stage
const SC_COGNITIVE_ORANGE: readonly FallbackContent[] = [
  {
    scenario: 'You\'ve developed a groundbreaking approach to an old problem. Two paths: publish openly and build reputation, or patent and profit. Your career and the field both hang in the balance.',
    options: driveOptionsToMCQ({
      agency: 'Publish — your contribution stands on its own merit',
      communion: 'Share the credit generously — knowledge is collective',
      eros: 'Patent it — resources enable future breakthroughs',
      agape: 'Release it freely but ensure it reaches those who need it most',
    }),
  },
];

export const SC_EMOTIONAL_ORANGE: readonly FallbackContent[] = [
  {
    scenario: 'A colleague takes credit for your idea in a meeting. You feel anger, betrayal, and a familiar urge to withdraw. The room watches.',
    options: driveOptionsToMCQ({
      agency: 'Speak up immediately — claim your contribution',
      communion: 'Address it privately — maintain the relationship',
      eros: 'Let it go — your growth doesn\'t depend on recognition',
      agape: 'Acknowledge the complexity — they may need the credit more than you do',
    }),
  },
];

export const SC_MORAL_ORANGE: readonly FallbackContent[] = [
  {
    scenario: 'Your company profits from a practice you find ethically questionable but legal. You benefit financially. Leaving means financial risk; staying means complicity.',
    options: driveOptionsToMCQ({
      agency: 'Leave — your integrity is not for sale',
      communion: 'Advocate for change from within — the company needs voices like yours',
      eros: 'Use the position strategically — systemic change requires leverage',
      agape: 'Work toward a transition that doesn\'t abandon those who depend on you',
    }),
  },
];

export const SC_INTRAPERSONAL_ORANGE: readonly FallbackContent[] = [
  {
    scenario: 'You achieved a major goal and felt... empty. The anticipation was more alive than the achievement. Something in you knows the goal was never the point.',
    options: driveOptionsToMCQ({
      agency: 'Set a bigger goal — the emptiness is just a signal to aim higher',
      communion: 'Share the achievement — meaning lives in shared experience',
      eros: 'Follow the emptiness — it\'s pointing toward something real',
      agape: 'Rest here — let the emptiness teach you what enough feels like',
    }),
  },
];

export const SC_SPIRITUAL_ORANGE: readonly FallbackContent[] = [
  {
    scenario: 'You\'ve read every philosophy, attended every workshop, and collected insights like trophies. But wisdom feels distant. A voice asks: is understanding the same as living it?',
    options: driveOptionsToMCQ({
      agency: 'Apply one insight fully — depth beats breadth',
      communion: 'Teach what you know — articulation deepens understanding',
      eros: 'Let go of the need to understand — live the question instead',
      agape: 'Integrate by serving — wisdom expressed through action becomes real',
    }),
  },
];

export const SC_INTERPERSONAL_ORANGE: readonly FallbackContent[] = [
  {
    scenario: 'A business partner proposes a profitable venture that requires bending your ethical standards slightly. The opportunity is genuine, the compromise is small.',
    options: driveOptionsToMCQ({
      agency: 'Negotiate harder terms — profit without compromise',
      communion: 'Decline — the relationship is worth more than the deal',
      eros: 'Propose an alternative that achieves the profit through innovation',
      agape: 'Accept the tension — pragmatic good may outweigh principled purity',
    }),
  },
];

export const SC_SOMATIC_ORANGE: readonly FallbackContent[] = [
  {
    scenario: 'Your body breaks down during an intensive project — back pain, insomnia, headaches. Your mind says "push through." Your body says "stop." The deadline is in two weeks.',
    options: driveOptionsToMCQ({
      agency: 'Adapt the approach — find a way to meet the deadline without breaking further',
      communion: 'Delegate — you don\'t have to do this alone',
      eros: 'Reframe the breakdown as a signal to transform your relationship with work',
      agape: 'Honor the body\'s message — rest now, recover fully, then finish stronger',
    }),
  },
];

export const SC_WILLPOWER_ORANGE: readonly FallbackContent[] = [
  {
    scenario: 'You\'ve built an impressive streak of discipline — daily practice, no exceptions. But the practice has become mechanical. The passion that started it feels distant.',
    options: driveOptionsToMCQ({
      agency: 'Maintain the streak — discipline outlasts motivation',
      communion: 'Find a practice partner — shared commitment rekindles the flame',
      eros: 'Break the pattern intentionally — let absence reveal desire',
      agape: 'Evolve the practice — let it grow as you grow',
    }),
  },
];

export // ============================================================================
// LINE-SPECIFIC SCENARIO CHOICE CONTENT — Amber stage
// ============================================================================

const SC_COGNITIVE_AMBER: readonly FallbackContent[] = [
  {
    scenario: 'The institution has a methodology that works. A newcomer proposes a radical alternative. The data supports it, but the methodology challenges foundational assumptions the institution is built on.',
    options: driveOptionsToMCQ({
      agency: 'Defend the proven methodology — it works for a reason',
      communion: 'Hear the newcomer out — the institution should model good thinking',
      eros: 'Test the radical approach alongside the proven one',
      agape: 'Honor both — the tradition and the innovation each carry truth',
    }),
  },
];

export const SC_EMOTIONAL_AMBER: readonly FallbackContent[] = [
  {
    scenario: 'Your community mourns a loss. Grief has a proper form — rituals, timelines, expressions. But your grief doesn\'t fit the form. It\'s messy and inconvenient.',
    options: driveOptionsToMCQ({
      agency: 'Grieve your own way — authenticity matters more than propriety',
      communion: 'Follow the community\'s form — the structure holds everyone',
      eros: 'Let the uncontained grief teach the community something new',
      agape: 'Hold both — your grief is real and the community\'s form serves a purpose',
    }),
  },
];

export const SC_MORAL_AMBER: readonly FallbackContent[] = [
  {
    scenario: 'The order\'s code requires you to report a member\'s transgression. You know the transgression was an act of compassion that technically violated protocol. Reporting feels wrong. Not reporting feels like betrayal.',
    options: driveOptionsToMCQ({
      agency: 'Follow the code — precedent matters more than individual cases',
      communion: 'Protect the member — compassion should not be punished',
      eros: 'Challenge the code — this is a moment for the order to evolve',
      agape: 'Seek the elder\'s counsel — wisdom, not rules, should guide this decision',
    }),
  },
];

export const SC_INTRAPERSONAL_AMBER: readonly FallbackContent[] = [
  {
    scenario: 'You\'ve spent years building an identity within your community. The identity is honored, respected, real. But beneath it, something stirs — an self that doesn\'t fit the mold.',
    options: driveOptionsToMCQ({
      agency: 'Honor the stirrings — your identity must be chosen, not inherited',
      communion: 'Trust the community\'s view of you — they see what you cannot',
      eros: 'Explore the stirring in private — growth begins in the hidden places',
      agape: 'Integrate both — the community self and the hidden self are not enemies',
    }),
  },
];

export const SC_SPIRITUAL_AMBER: readonly FallbackContent[] = [
  {
    scenario: 'The ritual has been performed the same way for generations. You feel a deep resonance with it — but also a subtle emptiness. The form is perfect, but the spirit within it flickers.',
    options: driveOptionsToMCQ({
      agency: 'Perform the ritual with renewed intention — the form is the vessel',
      communion: 'Bring your experience to the elders — the ritual may need to breathe',
      eros: 'Let the emptiness speak — what is the ritual reaching toward?',
      agape: 'Hold the tension between form and feeling — both are sacred',
    }),
  },
];

export const SC_INTERPERSONAL_AMBER: readonly FallbackContent[] = [
  {
    scenario: 'A new member violates an unwritten rule. The community is divided — some want enforcement, others see an opportunity to update the norm. Your voice carries weight.',
    options: driveOptionsToMCQ({
      agency: 'Enforce the norm — unwritten rules are the community\'s backbone',
      communion: 'Listen to the newcomer\'s perspective — they may see a blind spot',
      eros: 'Use this as a catalyst for healthy evolution of the norm',
      agape: 'Hold the space for both tradition and change without choosing sides',
    }),
  },
];

export const SC_SOMATIC_AMBER: readonly FallbackContent[] = [
  {
    scenario: 'The morning routine your body follows is sacred — the same stretches, the same breathing, the same posture. It grounds you. But lately, your body craves something different.',
    options: driveOptionsToMCQ({
      agency: 'Maintain the routine — your body needs structure',
      communion: 'Listen to the craving — your body is communicating',
      eros: 'Evolve the routine — let it grow with you',
      agape: 'Honor both — keep the core, explore the edges',
    }),
  },
];

export const SC_WILLPOWER_AMBER: readonly FallbackContent[] = [
  {
    scenario: 'Your discipline has earned you a respected position. Others look to your example. But the discipline has become an identity — stopping feels like annihilation.',
    options: driveOptionsToMCQ({
      agency: 'Continue — the position depends on your example',
      communion: 'Share the burden — let others carry the weight too',
      eros: 'Question whether discipline serves you or you serve discipline',
      agape: 'Redesign the practice so it sustains rather than depletes',
    }),
  },
];

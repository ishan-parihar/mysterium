/**
 * FallbackProvider — pre-authored content for when the LLM is unavailable.
 *
 * Per foundations/22 §12. Content drawn from concept-drafts for each modality.
 *
 * Phase 4 upgrade: content is now LINE-SPECIFIC. Each of the 8 lines
 * (Cognitive, Emotional, Moral, Intrapersonal, Spiritual, Interpersonal,
 * Somatic, Willpower) gets distinct prompts and drive-mapped MCQ options
 * so the assessment actually probes the correct developmental dimension.
 *
 * Location note: this file was moved from src/infra/llm/ to
 * src/core/fallback/ during HARDCODE-AUDIT step 1. The LLM-tier
 * infrastructure should not own pre-authored content — this is a
 * domain concern (validated developmental exercises), not a transport
 * concern.
 *
 * Invariant: the WebUI's LLM-driven path NEVER imports this module.
 * It exists exclusively as a degradation target. The Veil seam
 * surfaces the use of this content to the player.
 */
// Audit: tighten import paths now that the file lives at src/core/fallback/
import * as fs from 'fs';
import type { Modality } from '../domain/enums.js';
import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';

export interface FallbackContent {
  readonly prompt?: string;
  readonly scenario?: string;
  readonly options?: readonly { readonly id: string; readonly text: string }[];
  readonly framing?: string;
  readonly followUps?: readonly string[];
}

// ---------------------------------------------------------------------------
// Drive-mapped option generator — each MCQ set includes one option per drive
// so scoring always has a dimensional signal to work with.
// ---------------------------------------------------------------------------

/** Drive-mapped options: agency / communion / eros / agape — always 4 options */
interface DriveOptions {
  readonly agency: string;   // Self-direction, decisiveness, boundary-setting
  readonly communion: string; // Empathy, connection, relational attunement
  readonly eros: string;     // Aspiration, growth-seeking, reaching toward
  readonly agape: string;    // Integration, compassion, returning to include
}

function driveOptionsToMCQ(d: DriveOptions): { id: string; text: string }[] {
  return [
    { id: 'agency', text: d.agency },
    { id: 'communion', text: d.communion },
    { id: 'eros', text: d.eros },
    { id: 'agape', text: d.agape },
  ];
}

// ============================================================================
// LINE-SPECIFIC LANGUAGE REFLECTIVE CONTENT — Red stage
// Each line probes its unique developmental dimension at the survival/power tier.
// ============================================================================

const LR_COGNITIVE_RED: readonly FallbackContent[] = [
  {
    prompt: 'When a problem defeats your usual approach, what happens inside your mind? Do you reach for a new strategy, or double down on what you know?',
    followUps: ['Can you describe the moment of being stuck?', 'What does your mind do when certainty dissolves?'],
  },
  {
    prompt: 'Your thinking has patterns — shortcuts your mind takes without asking. Name one.',
    followUps: ['When did you first notice it?', 'How does it serve you, and how does it limit you?'],
  },
  // NF3-4 (Fresh-User Audit 3): Expanded from 2 to 5 prompts per line to reduce
  // cross-session repetition. The audit found verbatim duplicates within 4
  // sessions because the pool was exhausted after 2 questions per line.
  {
    prompt: 'You are certain about something that matters. What would it take for you to be wrong about it?',
    followUps: ['What does certainty feel like in your body?', 'When did you last change your mind about something important?'],
  },
  {
    prompt: 'Your mind races ahead of the moment. Where does it go when it leaves the present?',
    followUps: ['Is it planning, rehearsing, or escaping?', 'What does the present moment feel like when you return to it?'],
  },
  {
    prompt: 'When you face a decision, what does your mind trust more — logic, instinct, or experience? And which has betrayed you?',
    followUps: ['Can you separate the three?', 'Which one would you trust if the other two failed?'],
  },
];

const LR_EMOTIONAL_RED: readonly FallbackContent[] = [
  {
    prompt: 'Something angered you today. Before you acted on it — what did the anger feel like in your body?',
    followUps: ['Where did it live?', 'If the anger could speak, what would it say?'],
  },
  {
    prompt: 'Name an emotion you avoid. What would happen if you stayed with it for a full minute?',
    followUps: ['What are you afraid it will reveal?', 'What does avoidance cost you?'],
  },
  // NF3-4: Expanded from 2 to 5 prompts to reduce cross-session repetition.
  {
    prompt: 'Joy arrives — and something in you flinches. What is the flinch protecting?',
    followUps: ['What happened the last time you let joy in fully?', 'Is the flinch older than the joy?'],
  },
  {
    prompt: 'You felt something shift in you recently. Can you name it — without naming the event that triggered it?',
    followUps: ['Is the shift permanent or passing?', 'What does the new feeling need from you?'],
  },
  {
    prompt: 'Sadness has a texture. Describe yours — not what it is about, but how it feels.',
    followUps: ['Where in your body does it live?', 'Has it always felt this way?'],
  },
];

const LR_MORAL_RED: readonly FallbackContent[] = [
  {
    prompt: 'You witnessed someone being treated unfairly. What moved you — justice, loyalty, or self-preservation?',
    followUps: ['Did you act or watch?', 'What does that choice tell you about your moral code?'],
  },
  {
    prompt: 'When does honesty become cruel? Where is your line?',
    followUps: ['Has someone crossed that line with you?', 'Who decides where the line falls?'],
  },
  // NF3-4: Expanded from 2 to 5 prompts to reduce cross-session repetition.
  {
    prompt: 'You broke a promise. Not a big one — a small one. What did you tell yourself to make it okay?',
    followUps: ['Who paid the cost?', 'Would you break it again?'],
  },
  {
    prompt: 'Someone trusts you completely. What would it take for you to betray that trust — and would you admit it?',
    followUps: ['Is there a betrayal you have not admitted?', 'What does trust mean to you?'],
  },
  {
    prompt: 'You have a moral line you will not cross. Where did it come from — and have you ever wanted to move it?',
    followUps: ['Is the line yours or inherited?', 'What lies on the other side?'],
  },
];

const LR_INTRAPERSONAL_RED: readonly FallbackContent[] = [
  {
    prompt: 'When you are completely alone, what is your relationship with yourself like?',
    followUps: ['Is there a difference between who you are alone and who you are with others?', 'What does solitude reveal?'],
  },
  {
    prompt: 'You carry a version of yourself that no one else sees. Describe it.',
    followUps: ['Is that version you, or a mask?', 'What would happen if it surfaced?'],
  },
  // NF3-4: Expanded from 2 to 5 prompts to reduce cross-session repetition.
  {
    prompt: 'You tell yourself a story about who you are. What is the story — and what part of it is a lie?',
    followUps: ['Who would you be without the story?', 'What does the lie protect?'],
  },
  {
    prompt: 'Something in you wants attention. What is it — and what happens when you give it to it?',
    followUps: ['Is it a part, a feeling, or a need?', 'What would it take to listen?'],
  },
  {
    prompt: 'You are pretending not to know something about yourself. What is it?',
    followUps: ['How long have you known?', 'What would change if you admitted it?'],
  },
];

const LR_SPIRITUAL_RED: readonly FallbackContent[] = [
  {
    prompt: 'What does the word "meaning" point to in your life — right now, not in theory?',
    followUps: ['Is meaning something you find or something you make?', 'When did you last feel it?'],
  },
  {
    prompt: 'If everything you do were erased tomorrow, what would remain of you?',
    followUps: ['Does that thought liberate or terrify you?', 'What is left when achievement falls away?'],
  },
  // NF3-4: Expanded from 2 to 5 prompts to reduce cross-session repetition.
  {
    prompt: 'You felt small before something vast. What was it — and what did the smallness teach you?',
    followUps: ['Was it awe or fear?', 'What did you want to do with the feeling?'],
  },
  {
    prompt: 'There is something you call sacred. Name it — without using the word "sacred."',
    followUps: ['What would it mean to violate it?', 'Has it always been sacred to you?'],
  },
  {
    prompt: 'You are waiting for something. What is it — and is the waiting active or passive?',
    followUps: ['Are you waiting or avoiding?', 'What would it mean to stop waiting?'],
  },
];

const LR_INTERPERSONAL_RED: readonly FallbackContent[] = [
  {
    prompt: 'Think of the last conflict you had with someone close. What role did you play that you didn\'t choose consciously?',
    followUps: ['Did you recognize it in the moment?', 'What would playing a different role have cost you?'],
  },
  {
    prompt: 'Who in your life can you be fully honest with — and what makes that possible?',
    followUps: ['What prevents that honesty with others?', 'Is the barrier theirs or yours?'],
  },
  // NF3-4: Expanded from 2 to 5 prompts to reduce cross-session repetition.
  {
    prompt: 'You are performing a version of yourself for someone. Who — and what would drop if you stopped?',
    followUps: ['Are they watching, or is it your own expectation?', 'What would it cost to be seen?'],
  },
  {
    prompt: 'Someone is pulling away from you. What is your first instinct — and where did you learn it?',
    followUps: ['Is the instinct to chase, retreat, or punish?', 'Has it ever worked?'],
  },
  {
    prompt: 'You owe someone an apology you have not given. What is stopping you — and is it actually about them?',
    followUps: ['What would the apology cost you?', 'What does the silence cost them?'],
  },
];

const LR_SOMATIC_RED: readonly FallbackContent[] = [
  {
    prompt: 'Where in your body do you carry the most tension right now? What is it protecting?',
    followUps: ['If it could move, where would it go?', 'What memory lives in that tension?'],
  },
  {
    prompt: 'Your body speaks in sensations, not words. What is it saying to you right now?',
    followUps: ['When did you last listen?', 'What happens when you stop and attend to it?'],
  },
  // NF3-4: Expanded from 2 to 5 prompts to reduce cross-session repetition.
  {
    prompt: 'You are tired but will not rest. What is the tiredness protecting you from feeling?',
    followUps: ['What would happen if you stopped?', 'Is the tiredness physical or emotional?'],
  },
  {
    prompt: 'Your breath changes when you think of something difficult. What is the thought — and what does the breath do?',
    followUps: ['Can you soften the breath without changing the thought?', 'What does the breath know that the mind does not?'],
  },
  {
    prompt: 'There is a sensation you avoid — a place in your body you do not like to feel. Where is it?',
    followUps: ['What happened there?', 'What would it mean to stay with it for one breath?'],
  },
];

const LR_WILLPOWER_RED: readonly FallbackContent[] = [
  {
    prompt: 'Name something you persist at even when it hurts. Why do you stay?',
    followUps: ['Is it discipline or avoidance of something else?', 'When does persistence become self-harm?'],
  },
  {
    prompt: 'Your willpower has a direction. What is it pointed at — and what is it pointed away from?',
    followUps: ['Is that direction yours or inherited?', 'What would it feel like to aim it somewhere new?'],
  },
  // NF3-4: Expanded from 2 to 5 prompts to reduce cross-session repetition.
  {
    prompt: 'You said yes when you meant no. What made the yes feel safer than the no?',
    followUps: ['What would the no have cost?', 'Whose voice is in the yes?'],
  },
  {
    prompt: 'There is something you keep promising yourself you will do — and keep not doing. What is it?',
    followUps: ['Is the promise real or decorative?', 'What would it mean to drop the promise entirely?'],
  },
  {
    prompt: 'You are holding something together. What would happen if you let it fall apart — just for a moment?',
    followUps: ['What are you afraid would break?', 'Has holding it together become the thing itself?'],
  },
];

// Line-specific LanguageReflective for Orange stage
const LR_COGNITIVE_ORANGE: readonly FallbackContent[] = [
  {
    prompt: 'You built a mental model that works. How attached are you to it — and what would it take to abandon it?',
    followUps: ['Is your model a tool or a identity?', 'When did it last fail you?'],
  },
  {
    prompt: 'Your expertise has edges. Where does your competence end and your comfort zone begin?',
    followUps: ['What do you avoid learning?', 'Who threatens your sense of mastery?'],
  },
];

const LR_EMOTIONAL_ORANGE: readonly FallbackContent[] = [
  {
    prompt: 'You succeeded at something important. Before the satisfaction faded — what did the success actually feel like?',
    followUps: ['Was it relief, pride, or something else entirely?', 'Did the feeling match the achievement?'],
  },
  {
    prompt: 'Someone you compete with just surpassed you. What emotion rises first — and what does it tell you about what you value?',
    followUps: ['Can you separate your worth from your ranking?', 'What would it feel like to want them to succeed?'],
  },
];

const LR_MORAL_ORANGE: readonly FallbackContent[] = [
  {
    prompt: 'You had the chance to advance by bending a rule. You took it — or didn\'t. What justified your choice?',
    followUps: ['Would you make the same choice again?', 'Who sets the rules you follow?'],
  },
  {
    prompt: 'Is the system fair? If not, what is your responsibility toward fixing it — especially when you benefit from it?',
    followUps: ['Where does self-interest end and accountability begin?', 'What would real fairness cost you?'],
  },
];

const LR_INTRAPERSONAL_ORANGE: readonly FallbackContent[] = [
  {
    prompt: 'You are good at many things. Which of those things is actually YOU — and which is performance?',
    followUps: ['What would remain if the audience disappeared?', 'Is there a difference?'],
  },
  {
    prompt: 'Your self-image has been built through achievement. What happens to you if the achievements stop?',
    followUps: ['Who are you without the resume?', 'Is that question terrifying or freeing?'],
  },
];

const LR_SPIRITUAL_ORANGE: readonly FallbackContent[] = [
  {
    prompt: 'Progress is your engine. But progress toward what — and who decided the destination?',
    followUps: ['Is your ambition yours or borrowed?', 'What would it mean to want enough?'],
  },
  {
    prompt: 'You believe you can shape your destiny. What shape would you choose if no one were watching?',
    followUps: ['Is that shape different from the one you show the world?', 'What would authenticity cost here?'],
  },
];

const LR_INTERPERSONAL_ORANGE: readonly FallbackContent[] = [
  {
    prompt: 'You network strategically. Which of those relationships are real — and does it matter?',
    followUps: ['Can a transactional relationship become genuine?', 'What do you offer that no one else can?'],
  },
  {
    prompt: 'A colleague is struggling while you are thriving. Do you help, observe, or compete? Why?',
    followUps: ['What does your choice reveal about your model of success?', 'Is helping ever truly selfless?'],
  },
];

const LR_SOMATIC_ORANGE: readonly FallbackContent[] = [
  {
    prompt: 'Your body keeps score of your ambitions. Where does the drive to achieve live in your physical self?',
    followUps: ['What happens to your body when you rest?', 'Is rest productive or threatening?'],
  },
  {
    prompt: 'You push through fatigue to meet a deadline. What is your body asking for in that moment of override?',
    followUps: ['What would happen if you listened instead?', 'Is your body a tool or a partner?'],
  },
];

const LR_WILLPOWER_ORANGE: readonly FallbackContent[] = [
  {
    prompt: 'You have discipline — but is it directed or reactive? Are you building something or running from something?',
    followUps: ['What would happen if you stopped?', 'Is your willpower a choice or a compulsion?'],
  },
  {
    prompt: 'Your ambition drives you forward. What are you sacrificing to keep moving?',
    followUps: ['Is the sacrifice conscious?', 'What would you do differently if you weren\'t afraid of falling behind?'],
  },
];

// Line-specific LanguageReflective for Amber stage
const LR_COGNITIVE_AMBER: readonly FallbackContent[] = [
  {
    prompt: 'You follow a method because it is proven. When did you last question whether it is still right?',
    followUps: ['What would it take to abandon a trusted framework?', 'Is your method yours or inherited?'],
  },
  {
    prompt: 'There is a story you tell about how the world works. Who taught it to you — and do you still believe it?',
    followUps: ['What would change if you didn\'t?', 'How much of your worldview is chosen vs. absorbed?'],
  },
];

const LR_EMOTIONAL_AMBER: readonly FallbackContent[] = [
  {
    prompt: 'Belonging has a price. What have you suppressed to keep your place in the group?',
    followUps: ['Does the group know what you gave up?', 'What would happen if you brought it back?'],
  },
  {
    prompt: 'You follow the emotional norms of your community. When do they serve you — and when do they cage you?',
    followUps: ['What emotion are you not allowed to feel?', 'Whose rules are they, really?'],
  },
];

const LR_MORAL_AMBER: readonly FallbackContent[] = [
  {
    prompt: 'You uphold a code you did not write. Is the code just — or merely familiar?',
    followUps: ['When was the last time you questioned it?', 'What happens to those who break it?'],
  },
  {
    prompt: 'Authority demands obedience. Conscience demands something else. Where do you stand when they diverge?',
    followUps: ['Have you ever chosen conscience over code?', 'What did it cost you?'],
  },
];

const LR_INTRAPERSONAL_AMBER: readonly FallbackContent[] = [
  {
    prompt: 'You know your role in the community. Is the role the same as the self — or a container for it?',
    followUps: ['What lives beneath the role?', 'Would your community recognize you without it?'],
  },
  {
    prompt: 'Tradition shapes your identity. How much of "you" is actually the tradition wearing your face?',
    followUps: ['If you shed the tradition, what would remain?', 'Is that remainder something you want to meet?'],
  },
];

const LR_SPIRITUAL_AMBER: readonly FallbackContent[] = [
  {
    prompt: 'Ritual gives your days structure. Is the structure a scaffold for meaning, or a substitute for it?',
    followUps: ['What does the ritual mean to you vs. to the community?', 'When did you last feel the ritual rather than perform it?'],
  },
  {
    prompt: 'Duty calls you to something larger than yourself. Does the largeness inspire you, or weigh on you?',
    followUps: ['Is your duty freely chosen?', 'What would it mean to refuse?'],
  },
];

const LR_INTERPERSONAL_AMBER: readonly FallbackContent[] = [
  {
    prompt: 'Your community has expectations of you. Which expectation feels right — and which feels like a leash?',
    followUps: ['Who set the expectations?', 'What would happen if you dropped one?'],
  },
  {
    prompt: 'Someone outside your circle challenges your way of life. What rises first — defense, curiosity, or dismissal?',
    followUps: ['What might they see that you cannot?', 'Is your belonging strengthened or threatened by the question?'],
  },
];

const LR_SOMATIC_AMBER: readonly FallbackContent[] = [
  {
    prompt: 'Your body follows routines — morning rituals, habitual postures, practiced gestures. Which of these are chosen, and which are automatic?',
    followUps: ['What would happen if you broke one routine?', 'Where does discipline end and rigidity begin?'],
  },
  {
    prompt: 'Tension lives in your jaw, your shoulders, your hands. What role does it play in maintaining your sense of order?',
    followUps: ['Is the tension protecting something?', 'What would looseness mean here?'],
  },
];

const LR_WILLPOWER_AMBER: readonly FallbackContent[] = [
  {
    prompt: 'You endure because the code demands it. Is your endurance an expression of strength — or a denial of pain?',
    followUps: ['When does endurance become avoidance?', 'What would it mean to rest without guilt?'],
  },
  {
    prompt: 'Your willpower sustains the structure. But what sustains your willpower?',
    followUps: ['Is it the structure itself, or something beneath it?', 'What happens when the structure fails?'],
  },
];

// ============================================================================
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

const SC_EMOTIONAL_RED: readonly FallbackContent[] = [
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

const SC_MORAL_RED: readonly FallbackContent[] = [
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

const SC_INTRAPERSONAL_RED: readonly FallbackContent[] = [
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

const SC_SPIRITUAL_RED: readonly FallbackContent[] = [
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

const SC_INTERPERSONAL_RED: readonly FallbackContent[] = [
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

const SC_SOMATIC_RED: readonly FallbackContent[] = [
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

const SC_WILLPOWER_RED: readonly FallbackContent[] = [
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

// Line-specific ScenarioChoice for Orange stage
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

const SC_EMOTIONAL_ORANGE: readonly FallbackContent[] = [
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

const SC_MORAL_ORANGE: readonly FallbackContent[] = [
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

const SC_INTRAPERSONAL_ORANGE: readonly FallbackContent[] = [
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

const SC_SPIRITUAL_ORANGE: readonly FallbackContent[] = [
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

const SC_INTERPERSONAL_ORANGE: readonly FallbackContent[] = [
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

const SC_SOMATIC_ORANGE: readonly FallbackContent[] = [
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

const SC_WILLPOWER_ORANGE: readonly FallbackContent[] = [
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

// ============================================================================
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

const SC_EMOTIONAL_AMBER: readonly FallbackContent[] = [
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

const SC_MORAL_AMBER: readonly FallbackContent[] = [
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

const SC_INTRAPERSONAL_AMBER: readonly FallbackContent[] = [
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

const SC_SPIRITUAL_AMBER: readonly FallbackContent[] = [
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

const SC_INTERPERSONAL_AMBER: readonly FallbackContent[] = [
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

const SC_SOMATIC_AMBER: readonly FallbackContent[] = [
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

const SC_WILLPOWER_AMBER: readonly FallbackContent[] = [
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

// ============================================================================
// LINE-SPECIFIC EMBODIED CONTENT — Red stage
// ============================================================================

const EMB_COGNITIVE_RED: readonly FallbackContent[] = [
  {
    prompt: 'Close your eyes. Notice the quality of your thoughts right now — scattered, focused, racing, still. Where does that quality live in your body?',
    followUps: ['What shape would your thinking take if it were a physical sensation?', 'Does the body follow the mind, or the mind the body?'],
  },
];

const EMB_EMOTIONAL_RED: readonly FallbackContent[] = [
  {
    prompt: 'Place a hand on your chest. Breathe. What emotion is your body holding right now — independent of what your mind thinks you should feel?',
    followUps: ['Does the body\'s emotion match the mind\'s story?', 'What would happen if you trusted the body\'s version?'],
  },
];

const EMB_MORAL_RED: readonly FallbackContent[] = [
  {
    prompt: 'When you face a moral choice, your body responds before your mind. Notice: is there tightness or openness in your chest right now?',
    followUps: ['Does the body already know the right answer?', 'What does the body feel when you act against your conscience?'],
  },
];

const EMB_INTRAPERSONAL_RED: readonly FallbackContent[] = [
  {
    prompt: 'Scan your body from head to toe. Where do you feel most alive? Where do you feel numb? The map of sensation is the map of self.',
    followUps: ['What does the numbness protect?', 'What does the aliveness want to do?'],
  },
];

const EMB_SPIRITUAL_RED: readonly FallbackContent[] = [
  {
    prompt: 'Breathe deeply three times. On each exhale, notice what the body releases. What does your body carry that is not yours to carry?',
    followUps: ['Whose weight is in your shoulders?', 'What would your body feel like if it belonged only to itself?'],
  },
];

const EMB_INTERPERSONAL_RED: readonly FallbackContent[] = [
  {
    prompt: 'Think of someone you will see today. Notice what happens in your body when they come to mind — expansion or contraction, warmth or tension.',
    followUps: ['What does your body know about this person that your mind hasn\'t admitted?', 'Is the body\'s signal a message or a memory?'],
  },
];

const EMB_SOMATIC_RED: readonly FallbackContent[] = [
  {
    prompt: 'Stand still. Feel your feet on the ground. Notice the micro-adjustments your body makes to hold you upright. Your body is already doing something extraordinary without being asked.',
    followUps: ['What else is it doing that you haven\'t noticed?', 'If your body could speak right now, what would it say first?'],
  },
];

const EMB_WILLPOWER_RED: readonly FallbackContent[] = [
  {
    prompt: 'Hold your hand out in front of you, palm down. Keep it perfectly still. Notice what happens in your arm, your shoulder, your breath. This is willpower as a physical experience.',
    followUps: ['Where does the effort live?', 'What would it feel like to release the effort without dropping the hand?'],
  },
];

// ============================================================================
// LINE-SPECIFIC DETERMINISTIC CONTENT — Red stage (short framings)
// ============================================================================

const DET_COGNITIVE_RED: readonly FallbackContent[] = [
  { framing: 'A pattern hides in the noise. Track it.' },
  { framing: 'Three signals converge. Which one matters most?' },
  { framing: 'The logic chain has a gap. Find it before time runs out.' },
];

const DET_EMOTIONAL_RED: readonly FallbackContent[] = [
  { framing: 'An emotional face appears for two seconds. Name it.' },
  { framing: 'The tone of voice shifts. What changed beneath the words?' },
  { framing: 'Two emotions coexist. Identify both.' },
];

const DET_MORAL_RED: readonly FallbackContent[] = [
  { framing: 'A dilemma unfolds. There is no clean answer. Choose anyway.' },
  { framing: 'Someone is hurt. You can help, but it costs you. Decide.' },
  { framing: 'The rule says one thing. The situation says another. Act.' },
];

const DET_INTRAPERSONAL_RED: readonly FallbackContent[] = [
  { framing: 'An impulse arises. Name it before you act on it.' },
  { framing: 'A self-image cracks. What is underneath?' },
  { framing: 'The gap between intention and action opens. Observe it.' },
];

const DET_SPIRITUAL_RED: readonly FallbackContent[] = [
  { framing: 'A moment of meaning appears. What made it meaningful?' },
  { framing: 'Silence opens. What is present in it?' },
  { framing: 'The ego flinches. Notice what triggered it.' },
];

const DET_INTERPERSONAL_RED: readonly FallbackContent[] = [
  { framing: 'A social signal flashes. Decode it in real time.' },
  { framing: 'Two people need different things from you. Prioritize.' },
  { framing: 'The group energy shifts. Name the shift before it names you.' },
];

const DET_SOMATIC_RED: readonly FallbackContent[] = [
  { framing: 'A body sensation demands attention. Name it without interpreting it.' },
  { framing: 'Your breathing changed. Catch the moment it shifted.' },
  { framing: 'Tension appears somewhere unexpected. Locate it precisely.' },
];

const DET_WILLPOWER_RED: readonly FallbackContent[] = [
  { framing: 'An impulse arises. Hold still for three breaths before responding.' },
  { framing: 'Fatigue whispers. Notice whether it is physical or emotional.' },
  { framing: 'A choice between comfort and growth appears. Name what pulls you toward comfort.' },
];

// ============================================================================
// Line-specific content for higher stages — abbreviated pools
// (Red and Orange have the richest content; higher stages get line-specific generics)
// ============================================================================

// GAP-1b: LR_GENERIC_STAGE removed — Teal and Turquoise now have
// line-specific authored content (LR_BY_LINE_TURQUOISE, LR_BY_LINE_WHITE).

// ============================================================================
// Fallback pools by stage for other modalities (keeping existing stage-based pools)
// ============================================================================

const LANGUAGE_REFLECTIVE_INFRARED: readonly FallbackContent[] = [
  { prompt: 'Something stirs in the depths. Before words, before thought — what is it?', followUps: ['Can you stay with it?', 'What does the body know?'] },
];

const LANGUAGE_REFLECTIVE_MAGENTA: readonly FallbackContent[] = [
  { prompt: 'The old stories speak through you. What voice rises when you stop trying to think?', followUps: ['Does the story belong to you or to something older?', 'What would happen if you let it finish?'] },
];

// ============================================================================
// Generic fallbacks for modality × stage combos not covered above
// ============================================================================

const GENERIC_LANGUAGE_REFLECTIVE: FallbackContent = {
  prompt: 'What is present for you right now?',
  followUps: ['What does that tell you?', 'Where does it lead?'],
};

const GENERIC_SCENARIO_CHOICE: FallbackContent = {
  scenario: 'A crossroads appears. Each path carries weight.',
  options: driveOptionsToMCQ({
    agency: 'Take the direct route — trust your capacity',
    communion: 'Consult those affected before deciding',
    eros: 'Follow what calls you — let longing be the compass',
    agape: 'Hold the complexity — every path has cost',
  }),
};

const GENERIC_DETERMINISTIC: FallbackContent = {
  framing: 'Focus. The moment demands clarity.',
};

const GENERIC_STRATEGIC: FallbackContent = {
  scenario: 'Resources are limited. The map shows three routes to the objective, each with hidden risks.',
  options: driveOptionsToMCQ({
    agency: 'Take the shortest path — speed over safety',
    communion: 'Share the plan — collective intelligence is stronger',
    eros: 'Choose the path that teaches you the most',
    agape: 'Pick the route that causes least harm to all parties',
  }),
};

const GENERIC_EMBODIED: FallbackContent = {
  prompt: 'Close your eyes. Where do you feel tension in your body right now?',
  followUps: ['What does that tension want to do?', 'Breathe into it. What shifts?'],
};

const GENERIC_SOCIAL_COOPERATIVE: FallbackContent = {
  scenario: 'The scouts look to you. The path splits — one leads through danger, the other through uncertainty. They need your word.',
  options: driveOptionsToMCQ({
    agency: 'Lead — you will not ask them to go where you will not',
    communion: 'Ask the group — every voice matters in this decision',
    eros: 'Choose the path that will make them grow, even if it\'s harder',
    agape: 'Find the third way — neither danger nor avoidance, but something new',
  }),
};

const GENERIC_IMMERSIVE_RPG: FallbackContent = {
  prompt: 'The world stretches before you. A path winds through unfamiliar terrain. Something waits ahead — you can feel it.',
  followUps: ['What draws you forward?', 'What do you leave behind?'],
};

const GENERIC_FALLBACK: FallbackContent = {
  prompt: 'What is present for you right now?',
  followUps: ['What does that tell you?', 'Where does it lead?'],
};

// ============================================================================
// LINE → CONTENT POOL MAP — the routing tables
// ============================================================================

type ContentPool = readonly FallbackContent[];

/** Line-specific LanguageReflective pools — Red stage */
const LR_BY_LINE_RED: Record<string, ContentPool> = {
  Cognitive: LR_COGNITIVE_RED,
  Emotional: LR_EMOTIONAL_RED,
  Moral: LR_MORAL_RED,
  Intrapersonal: LR_INTRAPERSONAL_RED,
  Spiritual: LR_SPIRITUAL_RED,
  Interpersonal: LR_INTERPERSONAL_RED,
  Somatic: LR_SOMATIC_RED,
  Willpower: LR_WILLPOWER_RED,
};

/** Line-specific LanguageReflective pools — Orange stage */
const LR_BY_LINE_ORANGE: Record<string, ContentPool> = {
  Cognitive: LR_COGNITIVE_ORANGE,
  Emotional: LR_EMOTIONAL_ORANGE,
  Moral: LR_MORAL_ORANGE,
  Intrapersonal: LR_INTRAPERSONAL_ORANGE,
  Spiritual: LR_SPIRITUAL_ORANGE,
  Interpersonal: LR_INTERPERSONAL_ORANGE,
  Somatic: LR_SOMATIC_ORANGE,
  Willpower: LR_WILLPOWER_ORANGE,
};

/** Line-specific LanguageReflective pools — Amber stage */
const LR_BY_LINE_AMBER: Record<string, ContentPool> = {
  Cognitive: LR_COGNITIVE_AMBER,
  Emotional: LR_EMOTIONAL_AMBER,
  Moral: LR_MORAL_AMBER,
  Intrapersonal: LR_INTRAPERSONAL_AMBER,
  Spiritual: LR_SPIRITUAL_AMBER,
  Interpersonal: LR_INTERPERSONAL_AMBER,
  Somatic: LR_SOMATIC_AMBER,
  Willpower: LR_WILLPOWER_AMBER,
};

// ============================================================================
// LINE-SPECIFIC LANGUAGE REFLECTIVE CONTENT — Green stage
// Efficacy Audit GAP-1: Author Green-stage content (8 lines × 2 prompts).
// Green is the pluralistic/sensitive stage (25y+): multiple valid perspectives,
// emphasis on caring and connection, shadow of boundary dissolution + naive
// idealism. Probes the tension between inclusivity and discrimination.
// ============================================================================

const LR_COGNITIVE_GREEN: readonly FallbackContent[] = [
  {
    prompt: 'You can see multiple perspectives on an issue — but when every view is valid, how do you decide which one to act from? What guides your choice when logic alone cannot break the tie?',
    followUps: ['Is there a perspective you privilege without admitting it?', 'What would it cost to commit to one view?'],
  },
  {
    prompt: 'You understand systems of oppression. But understanding them can become a kind of paralysis — seeing every problem as structural. Where does your agency live when the system is the problem?',
    followUps: ['Can individual action matter within unjust structures?', 'What do you do when awareness becomes a cage?'],
  },
];

const LR_EMOTIONAL_GREEN: readonly FallbackContent[] = [
  {
    prompt: 'You feel others\' pain deeply — sometimes so deeply it becomes your own. Where does their suffering end and yours begin? What happens to you when you can\'t find that line?',
    followUps: ['Is absorbing others\' pain care or enmeshment?', 'What would healthy distance look like?'],
  },
  {
    prompt: 'You value emotional honesty. But sometimes honesty becomes a weapon — "I\'m just being real." When does your emotional truth serve connection, and when does it serve your own comfort?',
    followUps: ['Is there a difference between authenticity and unfiltered?', 'What do you owe the other person\'s feelings?'],
  },
];

const LR_MORAL_GREEN: readonly FallbackContent[] = [
  {
    prompt: 'You believe all perspectives deserve respect. But some perspectives cause harm. How do you hold both — the commitment to inclusivity and the responsibility to name harm — without collapsing into either?',
    followUps: ['Can tolerance include intolerance?', 'Where does your inclusivity reach its limit?'],
  },
  {
    prompt: 'You see how privilege operates. But seeing it can become a kind of guilt-spiral — constantly checking yourself, never acting. What would it look like to move from awareness to accountable action?',
    followUps: ['Is guilt a form of care or a form of self-protection?', 'What would repair look like — not just recognition?'],
  },
];

const LR_INTRAPERSONAL_GREEN: readonly FallbackContent[] = [
  {
    prompt: 'Your identity is layered — you contain multiple selves that shift by context. But which of those selves is choosing? And can a self that is always shifting ever truly rest?',
    followUps: ['Is fluidity freedom or fragmentation?', 'What would it feel like to be fully one thing?'],
  },
  {
    prompt: 'You\'ve done the inner work. You know your patterns, your shadows, your triggers. But knowing yourself can become a new kind of armor — self-awareness as performance. Where does genuine vulnerability live beyond your self-knowledge?',
    followUps: ['Can self-awareness become a defense?', 'What would it mean to not know yourself for a moment?'],
  },
];

const LR_SPIRITUAL_GREEN: readonly FallbackContent[] = [
  {
    prompt: 'You sense the interconnectedness of all things. But that sensing can become a bypass — "we\'re all one" used to avoid the real friction of relationship. Where does your oneness-claim meet the messiness of actual connection?',
    followUps: ['Is spiritual bypass a pattern you recognize?', 'What does interconnectedness cost you?'],
  },
  {
    prompt: 'You hold space for others\' spiritual paths. But what is YOUR path — not the pluralistic acceptance of all paths, but the specific, particular, committed practice that is yours alone?',
    followUps: ['Can you commit to one path without rejecting others?', 'What would devotion look like for you?'],
  },
];

const LR_INTERPERSONAL_GREEN: readonly FallbackContent[] = [
  {
    prompt: 'You care deeply about others\' experience. But caring can become a form of control — anticipating needs, managing feelings, preventing discomfort. When does your care serve them, and when does it serve your need to be needed?',
    followUps: ['Can you let someone struggle without intervening?', 'What would it mean to trust their process?'],
  },
  {
    prompt: 'You value egalitarian relationships. But hierarchy still exists — some people have more power, more access, more privilege. How do you navigate real power differences without pretending they don\'t exist or letting them define everything?',
    followUps: ['Can equality coexist with difference?', 'What does power-with look like in practice?'],
  },
];

const LR_SOMATIC_GREEN: readonly FallbackContent[] = [
  {
    prompt: 'You\'re attuned to subtle body signals — tension, energy, gut feelings. But that sensitivity can become hypervigilance — always scanning, never resting. What would it feel like to let your body be ordinary, not a signal to interpret?',
    followUps: ['Is your body a temple or a home?', 'Can you inhabit your body without monitoring it?'],
  },
  {
    prompt: 'You feel the collective in your body — the grief, the anxiety, the hope of your community. But carrying collective pain personally is not the same as transforming it. Where does your body end and the collective begin?',
    followUps: ['Is somatic empathy a gift or a burden?', 'What would it mean to metabolize rather than carry?'],
  },
];

const LR_WILLPOWER_GREEN: readonly FallbackContent[] = [
  {
    prompt: 'You can hold multiple priorities simultaneously. But holding everything can mean committing to nothing. What would it look like to choose — really choose — one thing, and let the others fall away?',
    followUps: ['Is non-commitment a form of care or fear?', 'What would you sacrifice by choosing?'],
  },
  {
    prompt: 'Your will is in service of collective good. But collective will can become diffuse — everyone\'s priority is no one\'s priority. Where does YOUR will live within the collective? What is yours to do, specifically, that no one else can do?',
    followUps: ['Can you lead without dominating?', 'What would it mean to claim your unique contribution?'],
  },
];

/** Line-specific LanguageReflective pools — Green stage */
const LR_BY_LINE_GREEN: Record<string, ContentPool> = {
  Cognitive: LR_COGNITIVE_GREEN,
  Emotional: LR_EMOTIONAL_GREEN,
  Moral: LR_MORAL_GREEN,
  Intrapersonal: LR_INTRAPERSONAL_GREEN,
  Spiritual: LR_SPIRITUAL_GREEN,
  Interpersonal: LR_INTERPERSONAL_GREEN,
  Somatic: LR_SOMATIC_GREEN,
  Willpower: LR_WILLPOWER_GREEN,
};

// ============================================================================
// LINE-SPECIFIC LANGUAGE REFLECTIVE CONTENT — Teal stage
// GAP-1b (Efficacy Audit): Teal = integral/vision-logic. Can hold
// multiple paradigms simultaneously, sees patterns across patterns, operates
// from worldcentric + ecological + kosmocentric awareness. Shadow: meta-bypass
// (seeing the pattern of patterns as an excuse to not act), arrogance of
// comprehensiveness, paralysis of integration.
// ============================================================================

const LR_COGNITIVE_TURQUOISE: readonly FallbackContent[] = [
  {
    prompt: 'You can hold competing paradigms in mind without collapse. But integration can become its own avoidance — the meta-view so comprehensive it paralyzes action. Where does your capacity to see all sides prevent you from choosing one?',
    followUps: ['Can wisdom be a form of hiding?', 'What would it cost to be partial — to commit to one frame?'],
  },
  {
    prompt: 'You see the pattern beneath the pattern. But who is the one seeing? The meta-cognitive observer — is it a self, a function, or an escape hatch from the mess of being a specific person?',
    followUps: ['Can the observer be observed?', 'What does the one who sees all patterns need that seeing cannot provide?'],
  },
];

const LR_EMOTIONAL_TURQUOISE: readonly FallbackContent[] = [
  {
    prompt: 'You feel the emotional weather of systems — the grief of institutions, the anxiety of ecosystems. But feeling everything can mean feeling nothing fully. What single grief, if you let it be only yours and not the world\'s, would break you open?',
    followUps: ['Is cosmic empathy a defense against personal grief?', 'What would it mean to mourn one thing completely?'],
  },
  {
    prompt: 'You\'ve transcended reactivity — most of the time. But transcendence can be anesthesia. What emotion have you integrated so thoroughly that you no longer feel it — and is that integration or numbing?',
    followUps: ['Can integration be a form of death?', 'What would re-enchantment look like — not the emotion you transcended, but the one on the other side?'],
  },
];

const LR_MORAL_TURQUOISE: readonly FallbackContent[] = [
  {
    prompt: 'You see how every moral position is partially true and partially blind. But the view from nowhere is still a position — one that avoids the risk of being wrong. What would you stake your life on, knowing it\'s incomplete?',
    followUps: ['Can you act with conviction while holding doubt?', 'What does integrity look like when you can see all sides?'],
  },
  {
    prompt: 'You understand the development of morality itself — how each stage transcends and includes the prior. But understanding development can become a way to judge those at "lower" stages. Where does your developmental awareness become its own form of hierarchy?',
    followUps: ['Can integral consciousness be arrogant?', 'What does humility look like at the altitude where you can see the whole spiral?'],
  },
];

const LR_INTRAPERSONAL_TURQUOISE: readonly FallbackContent[] = [
  {
    prompt: 'You can observe the observer — witness the witness. But the witness can become a dissociated self, floating above the mess. When did the witness become a refuge from being a body, a person, a specific someone with wants?',
    followUps: ['Can witnessing be a bypass?', 'What does the witness avoid by watching?'],
  },
  {
    prompt: 'Your self-sense is fluid — you can occupy multiple perspectives at will. But fluidity without ground is dissociation. What is the ground — not the witness, not the observer, but the irreducible "you" that persists across every frame?',
    followUps: ['Is there a self beneath the fluidity, or just the flow?', 'What would it mean to be pinned to one identity — and is that a loss or a relief?'],
  },
];

const LR_SPIRITUAL_TURQUOISE: readonly FallbackContent[] = [
  {
    prompt: 'You\'ve tasted non-dual awareness — the state where subject and object dissolve. But the taste can become a reference point, a spiritual credential. What in you still needs the experience to mean something? What would it mean to let the taste go?',
    followUps: ['Can awakening become attachment?', 'What remains when the peak experience fades and only the ordinary remains?'],
  },
  {
    prompt: 'You see the kosmos as a single evolutionary process — matter to life to mind to spirit. But seeing the kosmos can replace living in it. Where does your kosmic vision meet the unwashed dishes, the difficult neighbor, the ordinary Tuesday?',
    followUps: ['Can kosmic consciousness avoid kitchen-sink reality?', 'What does enlightenment look like when it takes out the trash?'],
  },
];

const LR_INTERPERSONAL_TURQUOISE: readonly FallbackContent[] = [
  {
    prompt: 'You can hold the developmental perspective of every person you meet — seeing where they are and why. But that capacity can become a subtle superiority, a way of being above rather than with. When does your capacity to understand someone replace your willingness to be surprised by them?',
    followUps: ['Can developmental awareness kill genuine meeting?', 'What would it mean to not know where someone is — to meet them without a map?'],
  },
  {
    prompt: 'You work across worldviews — bridging, translating, integrating. But the bridge-builder can become the bridge — never arriving, always mediating. Where do YOU live, when you\'re not connecting others?',
    followUps: ['Is the integral perspective a home or a transit?', 'What would it mean to stop mediating and just be in one place?'],
  },
];

const LR_SOMATIC_TURQUOISE: readonly FallbackContent[] = [
  {
    prompt: 'Your body is a microcosm of the kosmos — you feel tides, cycles, planetary rhythms. But kosmic embodiment can disconnect from the ordinary body — the one that gets tired, gets sick, gets old. What does your kosmic body need that your ordinary body has been asking for?',
    followUps: ['Can kosmic embodiment be disembodiment?', 'What would it mean to just be tired — not transducing cosmic fatigue, just tired?'],
  },
  {
    prompt: 'You can regulate your nervous system at will — down-regulate, up-regulate, co-regulate. But mastery can become control. What happens in your body when you stop regulating and let it be wild, unmanaged, alive?',
    followUps: ['Is your body a system to be optimized or an animal to be lived?', 'What would unregulated embodiment feel like?'],
  },
];

const LR_WILLPOWER_TURQUOISE: readonly FallbackContent[] = [
  {
    prompt: 'Your will is aligned with the evolutionary impulse itself — you act for the kosmos, not just for yourself. But kosmic will can mask personal avoidance. What do YOU want — not the kosmos, not the spiral, not the process — you, the specific person?',
    followUps: ['Can kosmic purpose erase personal desire?', 'What would it mean to want something small and specific and entirely yours?'],
  },
  {
    prompt: 'You can hold multiple priorities in creative tension. But holding can become a substitute for doing. What is the one act — not the meta-act, not the integral act, but the single concrete act — that the current moment demands of you?',
    followUps: ['Can the integral view delay necessary action?', 'What does the next right thing look like when you stop seeing all the things?'],
  },
];

const LR_BY_LINE_TURQUOISE: Record<string, ContentPool> = {
  Cognitive: LR_COGNITIVE_TURQUOISE,
  Emotional: LR_EMOTIONAL_TURQUOISE,
  Moral: LR_MORAL_TURQUOISE,
  Intrapersonal: LR_INTRAPERSONAL_TURQUOISE,
  Spiritual: LR_SPIRITUAL_TURQUOISE,
  Interpersonal: LR_INTERPERSONAL_TURQUOISE,
  Somatic: LR_SOMATIC_TURQUOISE,
  Willpower: LR_WILLPOWER_TURQUOISE,
};

// ============================================================================
// LINE-SPECIFIC LANGUAGE REFLECTIVE CONTENT — Turquoise stage
// GAP-1b: Turquoise = super-integral / non-dual. The witness dissolves into
// the witnessed. The doer dissolves into the doing. Shadow: the "nobody
// here" bypass — using non-dual framing to avoid the messy work of being
// a person. These probes challenge the Turquoise-stage practitioner to bring
// the non-dual realization INTO form, relationship, and action — not as
// transcendence but as incarnation.
// ============================================================================

const LR_COGNITIVE_WHITE: readonly FallbackContent[] = [
  {
    prompt: 'The one who knows has dissolved into the knowing. But knowing without a knower can become its own neutrality — a luminous void that doesn\'t engage. What calls you back into the particular, the partial, the committed — not as regression, but as incarnation?',
    followUps: ['Can non-knowing be an avoidance of position?', 'What does the formless know that requires form to express?'],
  },
];

const LR_EMOTIONAL_WHITE: readonly FallbackContent[] = [
  {
    prompt: 'Emotions arise and dissolve in the space of awareness — witnessed, not held. But the space can become a distance. What emotion, if you let it be fully yours — not witnessed, but inhabited — would surprise the witness itself?',
    followUps: ['Can the witness be a wound?', 'What would it mean to not be the space, but the weather?'],
  },
];

const LR_MORAL_WHITE: readonly FallbackContent[] = [
  {
    prompt: 'Right action arises spontaneously from emptiness — no deliberation, no rule. But spontaneity without reflection can be chaos wearing a halo. When does the "natural" action need to be questioned — and who questions it when there\'s no one home?',
    followUps: ['Can natural action be wrong action?', 'What does responsibility look like when there\'s no self to be responsible?'],
  },
];

const LR_INTRAPERSONAL_WHITE: readonly FallbackContent[] = [
  {
    prompt: 'There is no one here — just this, happening. But "no one here" can be the most sophisticated hiding of all. What if the one who says "no one is here" IS someone — and that someone has needs the emptiness can\'t meet?',
    followUps: ['Can non-self be a self-defense?', 'What does the emptiness thirst for?'],
  },
];

const LR_SPIRITUAL_WHITE: readonly FallbackContent[] = [
  {
    prompt: 'The seeker and the sought have merged — there is only this. But the merger can become a ceiling, a final achievement that stops the movement. What is beyond awakening — not more awakening, but what awakening looks like when it forgets it\'s awakened and just does the dishes?',
    followUps: ['Can the end of the path be a new beginning?', 'What does post-awakening practice look like when there\'s no one practicing?'],
  },
];

const LR_INTERPERSONAL_WHITE: readonly FallbackContent[] = [
  {
    prompt: 'In the non-dual, there is no other — just this, appearing as two. But "no other" can erase the actual person in front of you — their specificity, their difference, their irreducible not-you-ness. What does it mean to truly meet an other — not as appearance, but as someone who is genuinely, stubbornly, beautifully not-you?',
    followUps: ['Can non-duality avoid intimacy?', 'What would it mean to honor separateness as sacred?'],
  },
];

const LR_SOMATIC_WHITE: readonly FallbackContent[] = [
  {
    prompt: 'The body is the dharma — every sensation is emptiness dancing. But the body also bleeds, ages, and dies. What does emptiness do with mortality — not as concept, but as the actual, cellular, irreversible process of this body ending?',
    followUps: ['Can emptiness face its own death?', 'What does the body know that emptiness can\'t hold?'],
  },
];

const LR_WILLPOWER_WHITE: readonly FallbackContent[] = [
  {
    prompt: 'Action arises with no actor — the doing is the doer. But formless action can avoid the particular work this moment demands. What is the one specific, concrete, unglamorous thing that needs doing — and can emptiness roll up its sleeves?',
    followUps: ['Can non-doing be an excuse for not doing?', 'What does engaged emptiness look like?'],
  },
];

const LR_BY_LINE_WHITE: Record<string, ContentPool> = {
  Cognitive: LR_COGNITIVE_WHITE,
  Emotional: LR_EMOTIONAL_WHITE,
  Moral: LR_MORAL_WHITE,
  Intrapersonal: LR_INTRAPERSONAL_WHITE,
  Spiritual: LR_SPIRITUAL_WHITE,
  Interpersonal: LR_INTERPERSONAL_WHITE,
  Somatic: LR_SOMATIC_WHITE,
  Willpower: LR_WILLPOWER_WHITE,
};


/** Line-specific ScenarioChoice pools — Red stage */
const SC_BY_LINE_RED: Record<string, ContentPool> = {
  Cognitive: SC_COGNITIVE_RED,
  Emotional: SC_EMOTIONAL_RED,
  Moral: SC_MORAL_RED,
  Intrapersonal: SC_INTRAPERSONAL_RED,
  Spiritual: SC_SPIRITUAL_RED,
  Interpersonal: SC_INTERPERSONAL_RED,
  Somatic: SC_SOMATIC_RED,
  Willpower: SC_WILLPOWER_RED,
};

/** Line-specific ScenarioChoice pools — Orange stage */
const SC_BY_LINE_ORANGE: Record<string, ContentPool> = {
  Cognitive: SC_COGNITIVE_ORANGE,
  Emotional: SC_EMOTIONAL_ORANGE,
  Moral: SC_MORAL_ORANGE,
  Intrapersonal: SC_INTRAPERSONAL_ORANGE,
  Spiritual: SC_SPIRITUAL_ORANGE,
  Interpersonal: SC_INTERPERSONAL_ORANGE,
  Somatic: SC_SOMATIC_ORANGE,
  Willpower: SC_WILLPOWER_ORANGE,
};

/** Line-specific ScenarioChoice pools — Amber stage */
const SC_BY_LINE_AMBER: Record<string, ContentPool> = {
  Cognitive: SC_COGNITIVE_AMBER,
  Emotional: SC_EMOTIONAL_AMBER,
  Moral: SC_MORAL_AMBER,
  Intrapersonal: SC_INTRAPERSONAL_AMBER,
  Spiritual: SC_SPIRITUAL_AMBER,
  Interpersonal: SC_INTERPERSONAL_AMBER,
  Somatic: SC_SOMATIC_AMBER,
  Willpower: SC_WILLPOWER_AMBER,
};

/** Line-specific Embodied pools — Red stage */
const EMB_BY_LINE_RED: Record<string, ContentPool> = {
  Cognitive: EMB_COGNITIVE_RED,
  Emotional: EMB_EMOTIONAL_RED,
  Moral: EMB_MORAL_RED,
  Intrapersonal: EMB_INTRAPERSONAL_RED,
  Spiritual: EMB_SPIRITUAL_RED,
  Interpersonal: EMB_INTERPERSONAL_RED,
  Somatic: EMB_SOMATIC_RED,
  Willpower: EMB_WILLPOWER_RED,
};

/** Line-specific Deterministic pools — Red stage */
const DET_BY_LINE_RED: Record<string, ContentPool> = {
  Cognitive: DET_COGNITIVE_RED,
  Emotional: DET_EMOTIONAL_RED,
  Moral: DET_MORAL_RED,
  Intrapersonal: DET_INTRAPERSONAL_RED,
  Spiritual: DET_SPIRITUAL_RED,
  Interpersonal: DET_INTERPERSONAL_RED,
  Somatic: DET_SOMATIC_RED,
  Willpower: DET_WILLPOWER_RED,
};

// ============================================================================
// Public API
// ============================================================================

// PILOT-5.4 (Efficacy Pilot): Track asked questions to avoid repetition.
// NF-3 (Fresh-User Re-Audit): Cross-session de-dup is now implemented.
// The re-audit found Session 4 was entirely verbatim duplicates from
// earlier sessions — the in-memory Set was empty on each new process.
// Now the set is persisted to the profile directory (asked-prompts.json)
// and loaded at session start.
const _askedPrompts = new Set<string>();

const ASKED_PROMPTS_MAX = 200; // cap to prevent unbounded growth

/**
 * NF-3: Load the asked-prompts set from the active profile directory.
 * Called by the CLI at session start. No-op if no profile is active
 * or the file doesn't exist yet.
 */
export function loadAskedPrompts(profileDir: string | null): void {
  _askedPrompts.clear();
  if (!profileDir) return;
  try {
    const file = profileDir + '/asked-prompts.json';
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(data.prompts)) {
        for (const p of data.prompts) {
          if (typeof p === 'string') _askedPrompts.add(p);
        }
      }
    }
  } catch { /* best-effort — start with empty set */ }
}

/**
 * NF-3: Save the asked-prompts set to the active profile directory.
 * Called by the CLI at session end. No-op if no profile is active.
 */
export function saveAskedPrompts(profileDir: string | null): void {
  if (!profileDir) return;
  try {
    fs.mkdirSync(profileDir, { recursive: true });
    // Cap the set to the most recent N prompts (Set preserves insertion order)
    const prompts = [..._askedPrompts];
    const capped = prompts.length > ASKED_PROMPTS_MAX
      ? prompts.slice(prompts.length - ASKED_PROMPTS_MAX)
      : prompts;
    const file = profileDir + '/asked-prompts.json';
    fs.writeFileSync(file, JSON.stringify({ prompts: capped }, null, 2), 'utf8');
  } catch { /* best-effort — don't break session end */ }
}

/** NF-3: Test helper — clear the in-memory set (for unit tests). */
export function _clearAskedPromptsForTest(): void {
  _askedPrompts.clear();
}

function pickRandom<T>(arr: readonly T[]): T {
  // If the array items have a 'prompt' field, try to avoid repeating
  if (arr.length > 0 && typeof arr[0] === 'object' && arr[0] !== null && 'prompt' in arr[0]) {
    const unasked = arr.filter(item => {
      const prompt = (item as any).prompt as string | undefined;
      return !prompt || !_askedPrompts.has(prompt);
    });
    // If all have been asked, clear the set and start fresh (but still pick randomly)
    const pool = unasked.length > 0 ? unasked : arr;
    const index = Math.floor(Math.random() * pool.length);
    const picked = pool[index] as any;
    if (picked?.prompt) _askedPrompts.add(picked.prompt);
    return picked as T;
  }
  const index = Math.floor(Math.random() * arr.length);
  return arr[index];
}



function pickFromStageLinePools(
  stagePools: Record<string, Record<string, ContentPool>>,
  stage: Stage,
  line: Line,
  genericFallback: ContentPool,
): FallbackContent {
  const linePool = stagePools[stage]?.[line];
  if (linePool && linePool.length > 0) return pickRandom(linePool);
  // Fall back to Red stage for this line if higher stages don't have line-specific content
  const redPool = stagePools['Red']?.[line];
  if (redPool && redPool.length > 0) return pickRandom(redPool);
  return pickRandom(genericFallback);
}

// ─── Altitude-conditional reframe layers ─────────────────────────────
// Per the altitude-scaling audit: a Teal player encountering Red-stage
// content needs a DIFFERENT framing than a Red player encountering the same
// content. These reframe layers wrap the base prompt with altitude-conditional
// meta-cognitive framing. The base prompt (Red-stage content) is preserved;
// the reframe layer adds the complexity the player's altitude demands.

type AltitudeBand = 'low' | 'mid' | 'high' | 'peak';

function altitudeBand(playerStage: Stage): AltitudeBand {
  const ord = ['Infrared', 'Magenta', 'Red', 'Amber', 'Orange', 'Green', 'Teal', 'Turquoise'].indexOf(playerStage);
  if (ord <= 2) return 'low';    // Infrared, Magenta, Red
  if (ord <= 4) return 'mid';    // Amber, Orange
  if (ord <= 6) return 'high';   // Green, Teal
  return 'peak';                  // Turquoise
}

interface ReframeLayer {
  readonly prefix: string;
  readonly suffix: string;
}

// Per-(holonStage × altitudeBand) reframe layers.
// When player altitude = holon stage (same band), no reframe (base prompt used as-is).
const REFRAME_LAYERS: Partial<Record<string, Record<AltitudeBand, ReframeLayer>>> = {
  Red: {
    low: { prefix: '', suffix: '' },  // co-altitudinal — no reframe
    mid: {
      prefix: 'You can see this Red-stage pattern from your current vantage. ',
      suffix: ' — What does the pattern still cost you, even now that you can name it?',
    },
    high: {
      prefix: 'Notice the Red-stage pattern arising. You can hold it as pattern, not identity. ',
      suffix: ' — Where does the pattern still live unmetabolized in you? Not the version you can name — the version that still names you.',
    },
    peak: {
      prefix: 'From presence, witness the Red pattern as it moves. ',
      suffix: ' — What is the felt-quality of recognizing it as pattern, without rejecting or identifying?',
    },
  },
  Amber: {
    low: { prefix: '', suffix: '' },
    mid: {
      prefix: 'You can see the structure this Amber-stage pattern imposes. ',
      suffix: ' — Where does the structure still shape you, even as you see through it?',
    },
    high: {
      prefix: 'Notice the Amber-stage pattern: inherited order, unexamined loyalty. You can hold it as pattern. ',
      suffix: ' — What in you still reaches for the structure even as you see its limits?',
    },
    peak: {
      prefix: 'From presence, witness the Amber pattern of order-seeking. ',
      suffix: ' — What is the felt-quality of the order-impulse arising and dissolving?',
    },
  },
  Orange: {
    low: { prefix: '', suffix: '' },
    mid: { prefix: '', suffix: '' },
    high: {
      prefix: 'Notice the Orange-stage pattern: achievement as identity, optimization as purpose. You can see it from above. ',
      suffix: ' — Where does the achiever-self still drive you, even as you witness its construct-nature?',
    },
    peak: {
      prefix: 'From presence, witness the Orange pattern of strategic optimization. ',
      suffix: ' — What is the felt-quality of the optimizing impulse arising and dissolving?',
    },
  },
  Green: {
    low: { prefix: '', suffix: '' },
    mid: { prefix: '', suffix: '' },
    high: {
      prefix: 'Notice the Green-stage pattern: sensitivity as identity, inclusion as purpose. You can see it from above. ',
      suffix: ' — Where does the sensitivity-self still bind you, even as you witness its compassion-nature?',
    },
    peak: {
      prefix: 'From presence, witness the Green pattern of empathic inclusion. ',
      suffix: ' — What is the felt-quality of the inclusion-impulse arising and dissolving?',
    },
  },
  Teal: {
    low: { prefix: '', suffix: '' },
    mid: { prefix: '', suffix: '' },
    high: { prefix: '', suffix: '' },  // co-altitudinal for high-band Teal players
    peak: {
      prefix: 'From presence, witness the Teal pattern of integral vision. ',
      suffix: ' — What is the felt-quality of the integral-impulse arising and dissolving?',
    },
  },
  Turquoise: {
    low: { prefix: '', suffix: '' },
    mid: { prefix: '', suffix: '' },
    high: { prefix: '', suffix: '' },
    peak: {
      prefix: 'From presence, witness the Turquoise pattern of non-dual release. ',
      suffix: ' — What is the felt-quality of presence itself, without object?',
    },
  },
};

function applyReframe(content: FallbackContent, holonStage: Stage, playerStage: Stage): FallbackContent {
  const band = altitudeBand(playerStage);
  const stageReframes = REFRAME_LAYERS[holonStage];
  if (!stageReframes) return content;
  const layer = stageReframes[band];
  if (!layer || (layer.prefix === '' && layer.suffix === '')) return content;

  // Apply reframe to ALL text-bearing fields
  const reframedPrompt = content.prompt
    ? `${layer.prefix}${content.prompt}${layer.suffix}`
    : content.prompt;

  const reframedScenario = content.scenario
    ? `${layer.prefix}${content.scenario}${layer.suffix}`
    : content.scenario;

  // GAP-V3-35: Also reframe the 'framing' field (used by Deterministic modality)
  const reframedFraming = content.framing
    ? `${layer.prefix}${content.framing}${layer.suffix}`
    : content.framing;

  return {
    ...content,
    prompt: reframedPrompt,
    scenario: reframedScenario,
    framing: reframedFraming,
  };
}

export function getFallback(modality: Modality, line: Line, stage: Stage, playerStage?: Stage): FallbackContent {
  const playerAlt = playerStage ?? stage;  // default: co-altitudinal (no reframe)
  let content: FallbackContent;

  switch (modality) {
    case 'LanguageReflective': {
      const stageMap: Record<string, Record<string, ContentPool>> = {
        Red: LR_BY_LINE_RED,
        Orange: LR_BY_LINE_ORANGE,
        Amber: LR_BY_LINE_AMBER,
        Green: LR_BY_LINE_GREEN,
        Teal: LR_BY_LINE_TURQUOISE,
        Turquoise: LR_BY_LINE_WHITE,
      };
      if (stage === 'Infrared') content = pickRandom(LANGUAGE_REFLECTIVE_INFRARED);
      else if (stage === 'Magenta') content = pickRandom(LANGUAGE_REFLECTIVE_MAGENTA);
      else content = pickFromStageLinePools(stageMap, stage, line, LR_BY_LINE_RED[line] ?? [GENERIC_LANGUAGE_REFLECTIVE]);
      break;
    }

    case 'ScenarioChoice': {
      const stageMap: Record<string, Record<string, ContentPool>> = {
        Red: SC_BY_LINE_RED,
        Orange: SC_BY_LINE_ORANGE,
        Amber: SC_BY_LINE_AMBER,
      };
      if (stage === 'Infrared') content = pickRandom([
        { scenario: 'Raw sensation. Before interpretation, before story — something moves through you.', options: driveOptionsToMCQ({ agency: 'Follow it', communion: 'Share it with someone', eros: 'Let it transform you', agape: 'Hold it with acceptance' }) },
      ]);
      else if (stage === 'Magenta') content = pickRandom([
        { scenario: 'The ritual has begun. Something ancient stirs.', options: driveOptionsToMCQ({ agency: 'Lead the ritual', communion: 'Surrender to it', eros: 'Channel the energy', agape: 'Hold the space for all' }) },
      ]);
      else content = pickFromStageLinePools(stageMap, stage, line, SC_BY_LINE_RED[line] ?? [GENERIC_SCENARIO_CHOICE]);
      break;
    }

    case 'Deterministic': {
      const detStageMap: Record<string, Record<string, ContentPool>> = {
        Red: DET_BY_LINE_RED,
      };
      content = pickFromStageLinePools(detStageMap, stage, line, [GENERIC_DETERMINISTIC]);
      break;
    }

    case 'Embodied': {
      const embStageMap: Record<string, Record<string, ContentPool>> = {
        Red: EMB_BY_LINE_RED,
      };
      content = pickFromStageLinePools(embStageMap, stage, line, [GENERIC_EMBODIED]);
      break;
    }

    case 'Strategic':
      content = GENERIC_STRATEGIC;
      break;
    case 'SocialCooperative':
      content = GENERIC_SOCIAL_COOPERATIVE;
      break;
    case 'ImmersiveRPG':
      content = GENERIC_IMMERSIVE_RPG;
      break;
    default:
      content = GENERIC_FALLBACK;
  }

  // Apply altitude-conditional reframe
  return applyReframe(content, stage, playerAlt);
}

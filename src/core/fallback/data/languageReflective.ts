/**
 * The LanguageReflective corpus — one pool per line × stage, for the stages a corpus was authored for.
 *
 * Split out of `FallbackProvider.ts` (module-cohesion audit item 5): this module is DATA,
 * authored against `schema.ts`. Nothing here decides anything — the pools are selected in
 * `../FallbackProvider.ts`, where `LR_BY_LINE_*`/`SC_BY_LINE_*` route each cell to a pool.
 */
import type { FallbackContent } from './schema.js';

export // ============================================================================
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

export const LR_EMOTIONAL_RED: readonly FallbackContent[] = [
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

export const LR_MORAL_RED: readonly FallbackContent[] = [
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

export const LR_INTRAPERSONAL_RED: readonly FallbackContent[] = [
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

export const LR_SPIRITUAL_RED: readonly FallbackContent[] = [
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

export const LR_INTERPERSONAL_RED: readonly FallbackContent[] = [
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

export const LR_SOMATIC_RED: readonly FallbackContent[] = [
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

export const LR_WILLPOWER_RED: readonly FallbackContent[] = [
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

export // Line-specific LanguageReflective for Orange stage
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

export const LR_EMOTIONAL_ORANGE: readonly FallbackContent[] = [
  {
    prompt: 'You succeeded at something important. Before the satisfaction faded — what did the success actually feel like?',
    followUps: ['Was it relief, pride, or something else entirely?', 'Did the feeling match the achievement?'],
  },
  {
    prompt: 'Someone you compete with just surpassed you. What emotion rises first — and what does it tell you about what you value?',
    followUps: ['Can you separate your worth from your ranking?', 'What would it feel like to want them to succeed?'],
  },
];

export const LR_MORAL_ORANGE: readonly FallbackContent[] = [
  {
    prompt: 'You had the chance to advance by bending a rule. You took it — or didn\'t. What justified your choice?',
    followUps: ['Would you make the same choice again?', 'Who sets the rules you follow?'],
  },
  {
    prompt: 'Is the system fair? If not, what is your responsibility toward fixing it — especially when you benefit from it?',
    followUps: ['Where does self-interest end and accountability begin?', 'What would real fairness cost you?'],
  },
];

export const LR_INTRAPERSONAL_ORANGE: readonly FallbackContent[] = [
  {
    prompt: 'You are good at many things. Which of those things is actually YOU — and which is performance?',
    followUps: ['What would remain if the audience disappeared?', 'Is there a difference?'],
  },
  {
    prompt: 'Your self-image has been built through achievement. What happens to you if the achievements stop?',
    followUps: ['Who are you without the resume?', 'Is that question terrifying or freeing?'],
  },
];

export const LR_SPIRITUAL_ORANGE: readonly FallbackContent[] = [
  {
    prompt: 'Progress is your engine. But progress toward what — and who decided the destination?',
    followUps: ['Is your ambition yours or borrowed?', 'What would it mean to want enough?'],
  },
  {
    prompt: 'You believe you can shape your destiny. What shape would you choose if no one were watching?',
    followUps: ['Is that shape different from the one you show the world?', 'What would authenticity cost here?'],
  },
];

export const LR_INTERPERSONAL_ORANGE: readonly FallbackContent[] = [
  {
    prompt: 'You network strategically. Which of those relationships are real — and does it matter?',
    followUps: ['Can a transactional relationship become genuine?', 'What do you offer that no one else can?'],
  },
  {
    prompt: 'A colleague is struggling while you are thriving. Do you help, observe, or compete? Why?',
    followUps: ['What does your choice reveal about your model of success?', 'Is helping ever truly selfless?'],
  },
];

export const LR_SOMATIC_ORANGE: readonly FallbackContent[] = [
  {
    prompt: 'Your body keeps score of your ambitions. Where does the drive to achieve live in your physical self?',
    followUps: ['What happens to your body when you rest?', 'Is rest productive or threatening?'],
  },
  {
    prompt: 'You push through fatigue to meet a deadline. What is your body asking for in that moment of override?',
    followUps: ['What would happen if you listened instead?', 'Is your body a tool or a partner?'],
  },
];

export const LR_WILLPOWER_ORANGE: readonly FallbackContent[] = [
  {
    prompt: 'You have discipline — but is it directed or reactive? Are you building something or running from something?',
    followUps: ['What would happen if you stopped?', 'Is your willpower a choice or a compulsion?'],
  },
  {
    prompt: 'Your ambition drives you forward. What are you sacrificing to keep moving?',
    followUps: ['Is the sacrifice conscious?', 'What would you do differently if you weren\'t afraid of falling behind?'],
  },
];

export // Line-specific LanguageReflective for Amber stage
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

export const LR_EMOTIONAL_AMBER: readonly FallbackContent[] = [
  {
    prompt: 'Belonging has a price. What have you suppressed to keep your place in the group?',
    followUps: ['Does the group know what you gave up?', 'What would happen if you brought it back?'],
  },
  {
    prompt: 'You follow the emotional norms of your community. When do they serve you — and when do they cage you?',
    followUps: ['What emotion are you not allowed to feel?', 'Whose rules are they, really?'],
  },
];

export const LR_MORAL_AMBER: readonly FallbackContent[] = [
  {
    prompt: 'You uphold a code you did not write. Is the code just — or merely familiar?',
    followUps: ['When was the last time you questioned it?', 'What happens to those who break it?'],
  },
  {
    prompt: 'Authority demands obedience. Conscience demands something else. Where do you stand when they diverge?',
    followUps: ['Have you ever chosen conscience over code?', 'What did it cost you?'],
  },
];

export const LR_INTRAPERSONAL_AMBER: readonly FallbackContent[] = [
  {
    prompt: 'You know your role in the community. Is the role the same as the self — or a container for it?',
    followUps: ['What lives beneath the role?', 'Would your community recognize you without it?'],
  },
  {
    prompt: 'Tradition shapes your identity. How much of "you" is actually the tradition wearing your face?',
    followUps: ['If you shed the tradition, what would remain?', 'Is that remainder something you want to meet?'],
  },
];

export const LR_SPIRITUAL_AMBER: readonly FallbackContent[] = [
  {
    prompt: 'Ritual gives your days structure. Is the structure a scaffold for meaning, or a substitute for it?',
    followUps: ['What does the ritual mean to you vs. to the community?', 'When did you last feel the ritual rather than perform it?'],
  },
  {
    prompt: 'Duty calls you to something larger than yourself. Does the largeness inspire you, or weigh on you?',
    followUps: ['Is your duty freely chosen?', 'What would it mean to refuse?'],
  },
];

export const LR_INTERPERSONAL_AMBER: readonly FallbackContent[] = [
  {
    prompt: 'Your community has expectations of you. Which expectation feels right — and which feels like a leash?',
    followUps: ['Who set the expectations?', 'What would happen if you dropped one?'],
  },
  {
    prompt: 'Someone outside your circle challenges your way of life. What rises first — defense, curiosity, or dismissal?',
    followUps: ['What might they see that you cannot?', 'Is your belonging strengthened or threatened by the question?'],
  },
];

export const LR_SOMATIC_AMBER: readonly FallbackContent[] = [
  {
    prompt: 'Your body follows routines — morning rituals, habitual postures, practiced gestures. Which of these are chosen, and which are automatic?',
    followUps: ['What would happen if you broke one routine?', 'Where does discipline end and rigidity begin?'],
  },
  {
    prompt: 'Tension lives in your jaw, your shoulders, your hands. What role does it play in maintaining your sense of order?',
    followUps: ['Is the tension protecting something?', 'What would looseness mean here?'],
  },
];

export const LR_WILLPOWER_AMBER: readonly FallbackContent[] = [
  {
    prompt: 'You endure because the code demands it. Is your endurance an expression of strength — or a denial of pain?',
    followUps: ['When does endurance become avoidance?', 'What would it mean to rest without guilt?'],
  },
  {
    prompt: 'Your willpower sustains the structure. But what sustains your willpower?',
    followUps: ['Is it the structure itself, or something beneath it?', 'What happens when the structure fails?'],
  },
];

export // ============================================================================
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

export const LANGUAGE_REFLECTIVE_MAGENTA: readonly FallbackContent[] = [
  { prompt: 'The old stories speak through you. What voice rises when you stop trying to think?', followUps: ['Does the story belong to you or to something older?', 'What would happen if you let it finish?'] },
];

export // ============================================================================
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

export const LR_EMOTIONAL_GREEN: readonly FallbackContent[] = [
  {
    prompt: 'You feel others\' pain deeply — sometimes so deeply it becomes your own. Where does their suffering end and yours begin? What happens to you when you can\'t find that line?',
    followUps: ['Is absorbing others\' pain care or enmeshment?', 'What would healthy distance look like?'],
  },
  {
    prompt: 'You value emotional honesty. But sometimes honesty becomes a weapon — "I\'m just being real." When does your emotional truth serve connection, and when does it serve your own comfort?',
    followUps: ['Is there a difference between authenticity and unfiltered?', 'What do you owe the other person\'s feelings?'],
  },
];

export const LR_MORAL_GREEN: readonly FallbackContent[] = [
  {
    prompt: 'You believe all perspectives deserve respect. But some perspectives cause harm. How do you hold both — the commitment to inclusivity and the responsibility to name harm — without collapsing into either?',
    followUps: ['Can tolerance include intolerance?', 'Where does your inclusivity reach its limit?'],
  },
  {
    prompt: 'You see how privilege operates. But seeing it can become a kind of guilt-spiral — constantly checking yourself, never acting. What would it look like to move from awareness to accountable action?',
    followUps: ['Is guilt a form of care or a form of self-protection?', 'What would repair look like — not just recognition?'],
  },
];

export const LR_INTRAPERSONAL_GREEN: readonly FallbackContent[] = [
  {
    prompt: 'Your identity is layered — you contain multiple selves that shift by context. But which of those selves is choosing? And can a self that is always shifting ever truly rest?',
    followUps: ['Is fluidity freedom or fragmentation?', 'What would it feel like to be fully one thing?'],
  },
  {
    prompt: 'You\'ve done the inner work. You know your patterns, your shadows, your triggers. But knowing yourself can become a new kind of armor — self-awareness as performance. Where does genuine vulnerability live beyond your self-knowledge?',
    followUps: ['Can self-awareness become a defense?', 'What would it mean to not know yourself for a moment?'],
  },
];

export const LR_SPIRITUAL_GREEN: readonly FallbackContent[] = [
  {
    prompt: 'You sense the interconnectedness of all things. But that sensing can become a bypass — "we\'re all one" used to avoid the real friction of relationship. Where does your oneness-claim meet the messiness of actual connection?',
    followUps: ['Is spiritual bypass a pattern you recognize?', 'What does interconnectedness cost you?'],
  },
  {
    prompt: 'You hold space for others\' spiritual paths. But what is YOUR path — not the pluralistic acceptance of all paths, but the specific, particular, committed practice that is yours alone?',
    followUps: ['Can you commit to one path without rejecting others?', 'What would devotion look like for you?'],
  },
];

export const LR_INTERPERSONAL_GREEN: readonly FallbackContent[] = [
  {
    prompt: 'You care deeply about others\' experience. But caring can become a form of control — anticipating needs, managing feelings, preventing discomfort. When does your care serve them, and when does it serve your need to be needed?',
    followUps: ['Can you let someone struggle without intervening?', 'What would it mean to trust their process?'],
  },
  {
    prompt: 'You value egalitarian relationships. But hierarchy still exists — some people have more power, more access, more privilege. How do you navigate real power differences without pretending they don\'t exist or letting them define everything?',
    followUps: ['Can equality coexist with difference?', 'What does power-with look like in practice?'],
  },
];

export const LR_SOMATIC_GREEN: readonly FallbackContent[] = [
  {
    prompt: 'You\'re attuned to subtle body signals — tension, energy, gut feelings. But that sensitivity can become hypervigilance — always scanning, never resting. What would it feel like to let your body be ordinary, not a signal to interpret?',
    followUps: ['Is your body a temple or a home?', 'Can you inhabit your body without monitoring it?'],
  },
  {
    prompt: 'You feel the collective in your body — the grief, the anxiety, the hope of your community. But carrying collective pain personally is not the same as transforming it. Where does your body end and the collective begin?',
    followUps: ['Is somatic empathy a gift or a burden?', 'What would it mean to metabolize rather than carry?'],
  },
];

export const LR_WILLPOWER_GREEN: readonly FallbackContent[] = [
  {
    prompt: 'You can hold multiple priorities simultaneously. But holding everything can mean committing to nothing. What would it look like to choose — really choose — one thing, and let the others fall away?',
    followUps: ['Is non-commitment a form of care or fear?', 'What would you sacrifice by choosing?'],
  },
  {
    prompt: 'Your will is in service of collective good. But collective will can become diffuse — everyone\'s priority is no one\'s priority. Where does YOUR will live within the collective? What is yours to do, specifically, that no one else can do?',
    followUps: ['Can you lead without dominating?', 'What would it mean to claim your unique contribution?'],
  },
];

export // ============================================================================
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

export const LR_EMOTIONAL_TURQUOISE: readonly FallbackContent[] = [
  {
    prompt: 'You feel the emotional weather of systems — the grief of institutions, the anxiety of ecosystems. But feeling everything can mean feeling nothing fully. What single grief, if you let it be only yours and not the world\'s, would break you open?',
    followUps: ['Is cosmic empathy a defense against personal grief?', 'What would it mean to mourn one thing completely?'],
  },
  {
    prompt: 'You\'ve transcended reactivity — most of the time. But transcendence can be anesthesia. What emotion have you integrated so thoroughly that you no longer feel it — and is that integration or numbing?',
    followUps: ['Can integration be a form of death?', 'What would re-enchantment look like — not the emotion you transcended, but the one on the other side?'],
  },
];

export const LR_MORAL_TURQUOISE: readonly FallbackContent[] = [
  {
    prompt: 'You see how every moral position is partially true and partially blind. But the view from nowhere is still a position — one that avoids the risk of being wrong. What would you stake your life on, knowing it\'s incomplete?',
    followUps: ['Can you act with conviction while holding doubt?', 'What does integrity look like when you can see all sides?'],
  },
  {
    prompt: 'You understand the development of morality itself — how each stage transcends and includes the prior. But understanding development can become a way to judge those at "lower" stages. Where does your developmental awareness become its own form of hierarchy?',
    followUps: ['Can integral consciousness be arrogant?', 'What does humility look like at the altitude where you can see the whole spiral?'],
  },
];

export const LR_INTRAPERSONAL_TURQUOISE: readonly FallbackContent[] = [
  {
    prompt: 'You can observe the observer — witness the witness. But the witness can become a dissociated self, floating above the mess. When did the witness become a refuge from being a body, a person, a specific someone with wants?',
    followUps: ['Can witnessing be a bypass?', 'What does the witness avoid by watching?'],
  },
  {
    prompt: 'Your self-sense is fluid — you can occupy multiple perspectives at will. But fluidity without ground is dissociation. What is the ground — not the witness, not the observer, but the irreducible "you" that persists across every frame?',
    followUps: ['Is there a self beneath the fluidity, or just the flow?', 'What would it mean to be pinned to one identity — and is that a loss or a relief?'],
  },
];

export const LR_SPIRITUAL_TURQUOISE: readonly FallbackContent[] = [
  {
    prompt: 'You\'ve tasted non-dual awareness — the state where subject and object dissolve. But the taste can become a reference point, a spiritual credential. What in you still needs the experience to mean something? What would it mean to let the taste go?',
    followUps: ['Can awakening become attachment?', 'What remains when the peak experience fades and only the ordinary remains?'],
  },
  {
    prompt: 'You see the kosmos as a single evolutionary process — matter to life to mind to spirit. But seeing the kosmos can replace living in it. Where does your kosmic vision meet the unwashed dishes, the difficult neighbor, the ordinary Tuesday?',
    followUps: ['Can kosmic consciousness avoid kitchen-sink reality?', 'What does enlightenment look like when it takes out the trash?'],
  },
];

export const LR_INTERPERSONAL_TURQUOISE: readonly FallbackContent[] = [
  {
    prompt: 'You can hold the developmental perspective of every person you meet — seeing where they are and why. But that capacity can become a subtle superiority, a way of being above rather than with. When does your capacity to understand someone replace your willingness to be surprised by them?',
    followUps: ['Can developmental awareness kill genuine meeting?', 'What would it mean to not know where someone is — to meet them without a map?'],
  },
  {
    prompt: 'You work across worldviews — bridging, translating, integrating. But the bridge-builder can become the bridge — never arriving, always mediating. Where do YOU live, when you\'re not connecting others?',
    followUps: ['Is the integral perspective a home or a transit?', 'What would it mean to stop mediating and just be in one place?'],
  },
];

export const LR_SOMATIC_TURQUOISE: readonly FallbackContent[] = [
  {
    prompt: 'Your body is a microcosm of the kosmos — you feel tides, cycles, planetary rhythms. But kosmic embodiment can disconnect from the ordinary body — the one that gets tired, gets sick, gets old. What does your kosmic body need that your ordinary body has been asking for?',
    followUps: ['Can kosmic embodiment be disembodiment?', 'What would it mean to just be tired — not transducing cosmic fatigue, just tired?'],
  },
  {
    prompt: 'You can regulate your nervous system at will — down-regulate, up-regulate, co-regulate. But mastery can become control. What happens in your body when you stop regulating and let it be wild, unmanaged, alive?',
    followUps: ['Is your body a system to be optimized or an animal to be lived?', 'What would unregulated embodiment feel like?'],
  },
];

export const LR_WILLPOWER_TURQUOISE: readonly FallbackContent[] = [
  {
    prompt: 'Your will is aligned with the evolutionary impulse itself — you act for the kosmos, not just for yourself. But kosmic will can mask personal avoidance. What do YOU want — not the kosmos, not the spiral, not the process — you, the specific person?',
    followUps: ['Can kosmic purpose erase personal desire?', 'What would it mean to want something small and specific and entirely yours?'],
  },
  {
    prompt: 'You can hold multiple priorities in creative tension. But holding can become a substitute for doing. What is the one act — not the meta-act, not the integral act, but the single concrete act — that the current moment demands of you?',
    followUps: ['Can the integral view delay necessary action?', 'What does the next right thing look like when you stop seeing all the things?'],
  },
];

export // ============================================================================
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

export const LR_EMOTIONAL_WHITE: readonly FallbackContent[] = [
  {
    prompt: 'Emotions arise and dissolve in the space of awareness — witnessed, not held. But the space can become a distance. What emotion, if you let it be fully yours — not witnessed, but inhabited — would surprise the witness itself?',
    followUps: ['Can the witness be a wound?', 'What would it mean to not be the space, but the weather?'],
  },
];

export const LR_MORAL_WHITE: readonly FallbackContent[] = [
  {
    prompt: 'Right action arises spontaneously from emptiness — no deliberation, no rule. But spontaneity without reflection can be chaos wearing a halo. When does the "natural" action need to be questioned — and who questions it when there\'s no one home?',
    followUps: ['Can natural action be wrong action?', 'What does responsibility look like when there\'s no self to be responsible?'],
  },
];

export const LR_INTRAPERSONAL_WHITE: readonly FallbackContent[] = [
  {
    prompt: 'There is no one here — just this, happening. But "no one here" can be the most sophisticated hiding of all. What if the one who says "no one is here" IS someone — and that someone has needs the emptiness can\'t meet?',
    followUps: ['Can non-self be a self-defense?', 'What does the emptiness thirst for?'],
  },
];

export const LR_SPIRITUAL_WHITE: readonly FallbackContent[] = [
  {
    prompt: 'The seeker and the sought have merged — there is only this. But the merger can become a ceiling, a final achievement that stops the movement. What is beyond awakening — not more awakening, but what awakening looks like when it forgets it\'s awakened and just does the dishes?',
    followUps: ['Can the end of the path be a new beginning?', 'What does post-awakening practice look like when there\'s no one practicing?'],
  },
];

export const LR_INTERPERSONAL_WHITE: readonly FallbackContent[] = [
  {
    prompt: 'In the non-dual, there is no other — just this, appearing as two. But "no other" can erase the actual person in front of you — their specificity, their difference, their irreducible not-you-ness. What does it mean to truly meet an other — not as appearance, but as someone who is genuinely, stubbornly, beautifully not-you?',
    followUps: ['Can non-duality avoid intimacy?', 'What would it mean to honor separateness as sacred?'],
  },
];

export const LR_SOMATIC_WHITE: readonly FallbackContent[] = [
  {
    prompt: 'The body is the dharma — every sensation is emptiness dancing. But the body also bleeds, ages, and dies. What does emptiness do with mortality — not as concept, but as the actual, cellular, irreversible process of this body ending?',
    followUps: ['Can emptiness face its own death?', 'What does the body know that emptiness can\'t hold?'],
  },
];

export const LR_WILLPOWER_WHITE: readonly FallbackContent[] = [
  {
    prompt: 'Action arises with no actor — the doing is the doer. But formless action can avoid the particular work this moment demands. What is the one specific, concrete, unglamorous thing that needs doing — and can emptiness roll up its sleeves?',
    followUps: ['Can non-doing be an excuse for not doing?', 'What does engaged emptiness look like?'],
  },
];

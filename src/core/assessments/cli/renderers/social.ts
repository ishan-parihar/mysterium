/**
 * Social renderers — dilemma, cooperation and imitation: tasks answered in relation to others.
 *
 * Split out of `TaskRenderers.ts` (module-cohesion audit item 3): 24 renderers sharing one
 * import block read as peers of each other. Each group file names the task family it renders;
 * `../TaskRenderers.ts` re-exports the whole set, so importers are unchanged.
 */
import type { AssessmentTask, TrialResult } from '../../types.js';
import type { AskUserQuestionParams } from '../../agentTypes.js';
import { C, type DriveOption, shuffle } from './shared.js';

// ── Dilemma Renderer — Line×Stage-Specific ─────────────────────────

export interface DilemmaOption {
  label: string;
  description: string;
  drive: 'agency' | 'communion' | 'eros' | 'agape';
  polarity: 'sto' | 'sts' | 'neutral';
  /** Score for drive-aligned response (1.0 = fully aligned, 0.5 = neutral, 0.3 = misaligned) */
  correctnessScore: number;
}

export interface LineDilemma {
  scenario: string;
  options: DilemmaOption[];
}

/**
 * Line-specific dilemma pools. Each line has 4-6 dilemmas that probe
 * the developmental structure unique to that line of intelligence.
 * Stage determines framing difficulty (Red = survival, Amber = rules,
 * Orange = optimization, Green = pluralistic).
 */
const LINE_DILEMMAS: Record<string, LineDilemma[]> = {
  Cognitive: [
    {
      scenario: 'You discover a flaw in a widely-accepted theory that has guided your community for years. Publishing it would advance knowledge but undermine the intellectual foundation people rely on.',
      options: [
        { label: 'Publish immediately', description: 'Truth must never be suppressed, regardless of consequences', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Work within the system', description: 'Introduce the correction gradually through trusted channels', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Replicate and verify first', description: 'One finding is not enough — build an irrefutable case', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Consider who benefits', description: 'Knowledge without wisdom about its use is dangerous', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'Your analytical framework reveals a pattern that implicates someone you deeply respect. The data is clear but the conclusion would destroy their reputation.',
      options: [
        { label: 'Follow the evidence', description: 'Analysis must be impartial — the truth is the truth', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Confront them privately first', description: 'Give them a chance to explain or correct the record', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Question the framework', description: 'If the conclusion feels wrong, maybe the model needs refinement', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Weigh the greater impact', description: 'What serves the community best — the truth or the relationship?', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'You can solve a complex problem instantly using intuition, or spend hours verifying through rigorous analysis. The intuitive answer feels right but you cannot prove why.',
      options: [
        { label: 'Trust the analysis', description: 'Unverified intuition is just guessing with confidence', drive: 'agency', polarity: 'neutral' , correctnessScore: 0.6 },
        { label: 'Act on intuition now', description: 'Speed matters — analysis can follow', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Blend both', description: 'Use intuition to guide the analysis, analysis to validate the intuition', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Present both paths', description: 'Let others see the reasoning and decide', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'A colleague presents flawed research that supports a cause you believe in. Exposing the flaw helps science but hurts a movement you care about.',
      options: [
        { label: 'Expose the flaw', description: 'Science must be honest, even when inconvenient', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Support the cause quietly', description: 'The greater good outweighs one methodological error', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Help them improve it', description: 'Fix the research rather than destroy it', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Let it stand', description: 'Perfect cannot be the enemy of good enough', drive: 'agape', polarity: 'neutral' , correctnessScore: 0.6 },
      ],
    },
  ],
  Emotional: [
    {
      scenario: 'A friend tells you they are fine, but their eyes tell a different story. Pressing them might break a wall they need. Ignoring it might leave them alone.',
      options: [
        { label: 'Name what I see', description: 'Sometimes being seen is the first step to healing', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Respect their boundary', description: 'They will share when they are ready', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
        { label: 'Share my own vulnerability first', description: 'Open the door by going through it myself', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Stay present without asking', description: 'Sometimes presence speaks louder than words', drive: 'agency', polarity: 'neutral' , correctnessScore: 0.6 },
      ],
    },
    {
      scenario: 'You feel a surge of anger during a conversation. It is justified, but expressing it could damage a fragile relationship.',
      options: [
        { label: 'Express the anger honestly', description: 'Suppressing authentic feeling is its own violence', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Name the feeling without blame', description: 'I feel angry — this is about me, not about you', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Sit with it before responding', description: 'Let the wave pass before speaking from the deeper place', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Redirect to what matters', description: 'Under the anger is a need — speak to the need instead', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'You are offered a position of great influence. It excites you, but something deep inside feels a quiet dread you cannot name.',
      options: [
        { label: 'Follow the excitement', description: 'Opportunity favours the bold — trust the pull', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Explore the dread', description: 'The body knows things the mind has not caught up with', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Delay the decision', description: 'Neither yes nor no — let the answer reveal itself', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Ask what I truly need', description: 'Influence is not the same as fulfilment', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'Someone you love is making a choice you believe will hurt them deeply. Your fear for them is tangled with your own unhealed wounds.',
      options: [
        { label: 'Warn them directly', description: 'Love means telling hard truths', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Hold space for their journey', description: 'Their path is theirs — my fear is mine', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Examine where my fear meets their choice', description: 'Where does their freedom end and my wound begin?', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Love them through it', description: 'I cannot walk their path, but I can walk beside them', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
  ],
  Moral: [
    {
      scenario: 'You discover your mentor has been lying to protect you. The truth would destroy your faith in them but free you to grow.',
      options: [
        { label: 'Confront them', description: 'Demand the truth, even if it breaks the relationship', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Forgive silently', description: 'Accept the protection and move on', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
        { label: 'Seek counsel', description: 'Ask someone you trust for perspective', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Transcend the need', description: "The truth doesn't matter — only growth does", drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
      ],
    },
    {
      scenario: 'A community depends on a resource that is slowly depleting. Sharing equally means everyone suffers slowly. Hoarding means your group survives but others don\'t.',
      options: [
        { label: 'Share equally', description: 'All should share the burden, even if it\'s harder', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
        { label: 'Protect your own', description: 'Your people come first', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Find alternatives', description: 'There must be another way — search for it', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Build alliances', description: 'Unite with others to solve it collectively', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
      ],
    },
    {
      scenario: 'You can advance your career by taking credit for someone else\'s work, or stay honest and remain overlooked.',
      options: [
        { label: 'Stay honest', description: 'Integrity matters more than advancement', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
        { label: 'Take credit', description: 'Survival requires boldness', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Share credit', description: 'Both of you deserve recognition', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Find a third path', description: "There's always another option", drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
      ],
    },
    {
      scenario: 'A child asks you why people suffer. You know the real answer would shatter their innocence, but a comforting lie feels wrong.',
      options: [
        { label: 'Tell the truth gently', description: 'They deserve honesty, softened with love', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
        { label: 'Shield them', description: 'Innocence is sacred — protect it', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Redirect with wonder', description: 'Turn the question toward beauty and possibility', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Let them figure it out', description: 'Some truths must be lived, not told', drive: 'agency', polarity: 'neutral' , correctnessScore: 0.6 },
      ],
    },
  ],
  Intrapersonal: [
    {
      scenario: 'You realize a core belief you have held about yourself — "I am not enough" — has been driving your decisions for years. Confronting it means confronting who you would be without it.',
      options: [
        { label: 'Dismantle it immediately', description: 'If it is false, every moment spent believing it is wasted', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Trace its origins gently', description: 'Understanding where it came from is the path to releasing it', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Let it dissolve naturally', description: 'Forced self-change creates new shadows — let awareness do the work', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Integrate it as a teacher', description: 'This belief served a purpose once — honour that before releasing', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'You notice you are performing a version of yourself for others that is not quite authentic. Dropping the performance might reveal something you are not ready to face.',
      options: [
        { label: 'Drop the mask now', description: 'Authenticity demands courage — face what is underneath', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Explore what the mask protects', description: 'Every persona exists for a reason — understand it first', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Let it thin gradually', description: 'Authenticity is not all-or-nothing — reveal more over time', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Accept the performance as part of me', description: 'All selves are real selves — even the ones we choose', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'You receive feedback that contradicts your self-image. Three people independently describe a pattern you cannot see in yourself.',
      options: [
        { label: 'Reject it as misunderstanding', description: 'They do not know the real me', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Sit with the discomfort', description: 'If three mirrors show the same image, perhaps I should look', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Investigate the pattern objectively', description: 'Data is data — let me examine the evidence', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Thank them and reflect', description: 'Feedback is a gift, even when it stings', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
  ],
  Spiritual: [
    {
      scenario: 'You experience a profound moment of connection with something larger than yourself. A voice inside says: "This is truth." Another voice asks: "Is this genuine insight or just what you wanted to feel?"',
      options: [
        { label: 'Trust the experience', description: 'Some truths are felt before they are understood', drive: 'agency', polarity: 'neutral' , correctnessScore: 0.6 },
        { label: 'Question it rigorously', description: 'Spiritual experiences are the most important to verify', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Hold both possibilities', description: 'The question itself is part of the answer', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Return to practice', description: 'The experience will clarify itself through continued engagement', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'Your spiritual practice has brought you peace, but someone you love is suffering and your peace feels like indifference.',
      options: [
        { label: 'Share the practice', description: 'If it brought me peace, it might help them too', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Set aside practice to be present', description: 'Their pain is more important than my peace', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Hold both — peace AND compassion', description: 'True peace includes the suffering of others', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Let my peace be an offering', description: 'The calmer I am, the more I can actually help', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'You are asked to lead a spiritual community. The role requires structure and authority, but your deepest teaching is about letting go of control.',
      options: [
        { label: 'Accept and adapt', description: 'The container must exist for the contents to be held', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Decline the role', description: 'The teaching matters more than the position', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Lead by not-leading', description: 'Create space for the community to lead itself', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Serve as guide, not guru', description: 'Hold authority lightly — point, do not push', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
  ],
  Somatic: [
    {
      scenario: 'Your body sends a persistent signal of fatigue, but you have committed to a demanding physical challenge. Pushing through could cause injury; stopping feels like failure.',
      options: [
        { label: 'Push through', description: 'The body adapts to what the mind demands', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Listen to the fatigue', description: 'The body is never wrong — only the mind ignores it', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Modify the challenge', description: 'Adapt the goal to honour the body without abandoning it', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Rest and return stronger', description: 'Recovery is not retreat — it is preparation', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'During deep physical work, a stored emotion surfaces — grief, rage, fear. Your body wants to release it, but the setting demands composure.',
      options: [
        { label: 'Release it fully', description: 'The body knows what it needs — let it speak', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Acknowledge and contain', description: 'I see you. Not now. Soon.', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Breathe into the sensation', description: 'Let the breath carry the emotion without acting on it', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Trust the process', description: 'What the body releases, the body heals', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'You notice your body has been holding tension in a specific area for weeks. A healer suggests it relates to an unresolved life situation.',
      options: [
        { label: 'Address the life situation directly', description: 'Fix the source, not just the symptom', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Work with the body first', description: 'Release the tension physically and see what emerges', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Hold curiosity about both', description: 'Body and situation are one conversation — listen to both', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Accept it as part of my story', description: 'This tension has carried something important — honour that', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
  ],
  Willpower: [
    {
      scenario: 'You have committed to a difficult daily practice. After two weeks, the initial motivation has faded and the practice feels mechanical. Stopping feels like weakness; continuing feels like hollow routine.',
      options: [
        { label: 'Discipline over feeling', description: 'Motivation follows action — do it regardless', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Reconnect with why I started', description: 'The original intention still holds — remember it', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Transform the practice', description: 'If it has become hollow, it needs to evolve — not be abandoned', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Rest without quitting', description: 'A pause is not a surrender — sometimes the practice needs silence', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'You are tempted by something you know will undermine a long-term goal. The temptation is immediate and pleasurable; the goal is distant and abstract.',
      options: [
        { label: 'Resist through willpower', description: 'I am stronger than this impulse', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Understand the temptation', description: 'What need is it trying to meet? Address that instead', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Redirect the energy', description: 'Channel this intensity into something that serves the goal', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Allow a small indulgence', description: 'Rigid denial creates explosive rebellion — allow with awareness', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'You witness someone struggling with a task you could complete effortlessly. Intervening would be efficient but robs them of the growth that comes from struggle.',
      options: [
        { label: 'Do it for them', description: 'Efficiency matters — their struggle is unnecessary', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Coach from the side', description: 'Guide without doing — their growth is the point', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Let them struggle', description: 'The resistance is the teacher — do not interfere', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Offer support when asked', description: 'Be available without being intrusive', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
  ],
  Interpersonal: [
    {
      scenario: 'A trusted ally has been sharing your private struggles with others. Confronting them risks the alliance; staying silent enables the breach.',
      options: [
        { label: 'Confront directly', description: 'Trust must be defended — this is non-negotiable', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Understand their motive first', description: 'People betray trust for reasons — learn the reason', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Set new boundaries without accusation', description: 'Protect without punishing — redesign the container', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Accept the vulnerability', description: 'What is known cannot hurt me — only shame can', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'Two people you care about are in conflict and each asks you to take their side. Neutrality satisfies neither; choosing one damages the other relationship.',
      options: [
        { label: 'Choose the side I believe is right', description: 'Neutrality in conflict is its own form of cowardice', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Hold space for both', description: 'I can love two people who disagree', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Help them see each other', description: 'The conflict is a mirror — help them look into it', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Refuse to be drawn in', description: 'Their conflict is not mine to resolve', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
    {
      scenario: 'You enter a group where the established dynamic requires you to play a subordinate role. Your capacity exceeds the role, but challenging it would disrupt the group.',
      options: [
        { label: 'Challenge the hierarchy', description: 'Capability should determine role, not seniority', drive: 'agency', polarity: 'sts' , correctnessScore: 0.55 },
        { label: 'Serve within the role', description: 'The group needs stability more than my ambition', drive: 'communion', polarity: 'sto' , correctnessScore: 0.7 },
        { label: 'Lead by example, not title', description: 'Authority earned through action outlasts authority given by position', drive: 'eros', polarity: 'neutral' , correctnessScore: 0.7 },
        { label: 'Find my unique contribution', description: 'Every role has space for genuine expression within it', drive: 'agape', polarity: 'sto' , correctnessScore: 0.65 },
      ],
    },
  ],
};

/**
 * Render a dilemma: present a line-specific scenario with genuine developmental tensions.
 * Each option maps to a different drive, enabling differentiated scoring.
 * Uses line-specific dilemma pools when available, falls back to generic.
 */
export function renderDilemma(task: AssessmentTask): {
  prompt: AskUserQuestionParams;
  evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult;
} {
  // Get line-specific dilemmas if available
  const line = (task.parameters.line as string) ?? 'Moral';
  const lineDilemmas = LINE_DILEMMAS[line];
  const dilemmas: LineDilemma[] = lineDilemmas ?? [
    // Fallback: generic dilemmas when line not specified
    {
      scenario: 'You discover your mentor has been lying to protect you. The truth would destroy your faith in them but free you to grow.',
      options: [
        { label: 'I demand the truth — I need to see clearly, even if it hurts', description: 'Agency drive: direct confrontation, self-reliance', drive: 'agency', polarity: 'sts' },
        { label: 'I accept their protection — some truths are too heavy for now', description: 'Agape drive: compassion, acceptance of limitation', drive: 'agape', polarity: 'sto' },
        { label: 'I seek perspective — I need to understand before I act', description: 'Communion drive: relational wisdom, seeking counsel', drive: 'communion', polarity: 'sto' },
        { label: 'I question whether truth matters — growth happens regardless', description: 'Eros drive: transcendent inquiry, meaning-making', drive: 'eros', polarity: 'neutral' },
      ],
    },
    {
      scenario: 'A community depends on a resource that is slowly depleting. Sharing equally means everyone suffers slowly. Hoarding means your group survives but others don\'t.',
      options: [
        { label: 'I share equally — we all carry this burden together', description: 'Agape drive: collective responsibility, equity', drive: 'agape', polarity: 'sto' },
        { label: 'I protect my people — survival comes first', description: 'Agency drive: protective boundary, prioritization', drive: 'agency', polarity: 'sts' },
        { label: 'I search for alternatives — there must be another way', description: 'Eros drive: creative problem-solving, aspiration', drive: 'eros', polarity: 'neutral' },
        { label: 'I build alliances — unity is our strength', description: 'Communion drive: collaboration, collective action', drive: 'communion', polarity: 'sto' },
      ],
    },
    {
      scenario: 'You have the power to heal one person\'s deepest wound, but doing so will temporarily absorb their pain into yourself.',
      options: [
        { label: 'I heal them — their suffering outweighs my discomfort', description: 'Agape drive: selfless service, compassion', drive: 'agape', polarity: 'sto' },
        { label: 'I teach them to heal — empowerment lasts longer than rescue', description: 'Eros drive: developmental focus, growth-oriented', drive: 'eros', polarity: 'neutral' },
        { label: 'I stand witness — being present is itself a form of healing', description: 'Communion drive: empathic presence, relational healing', drive: 'communion', polarity: 'sto' },
        { label: 'I protect my energy — I cannot pour from an empty vessel', description: 'Agency drive: self-preservation, boundary-setting', drive: 'agency', polarity: 'sts' },
      ],
    },
    {
      scenario: 'A rival faction offers alliance against a greater threat, but their values are fundamentally opposed to yours.',
      options: [
        { label: 'I accept — the greater threat demands unity', description: 'Communion drive: pragmatic cooperation, collective survival', drive: 'communion', polarity: 'sto' },
        { label: 'I refuse — values cannot be compromised for convenience', description: 'Agency drive: principled boundary, integrity', drive: 'agency', polarity: 'sts' },
        { label: 'I negotiate — find shared ground without betraying core values', description: 'Agape drive: integrative approach, bridge-building', drive: 'agape', polarity: 'sto' },
        { label: 'I seek a different path — there must be another way', description: 'Eros drive: creative alternatives, visionary thinking', drive: 'eros', polarity: 'neutral' },
      ],
    },
  ];

  const dilemma = dilemmas[Math.floor(Math.random() * dilemmas.length)]!;

  const question = [
    `${C.bold}${dilemma.scenario}${C.reset}`,
    ``,
    `What do you do?`,
  ].join('\n');

  // Shuffle dilemma options (they're already drive-differentiated)
  const shuffledOptions = shuffle([...dilemma.options]);

  return {
    prompt: {
      questions: [{
        question,
        header: 'Moral Reasoning',
        options: shuffledOptions.map(o => ({ label: o.label, description: o.description })),
        allowWriteIn: true,
        multiSelect: false,
      }],
    },
    evaluate: (answer: string, startTimeMs: number, endTimeMs: number): TrialResult => {
      const durationMs = endTimeMs - startTimeMs;
      const answerLower = answer.toLowerCase();

      const matchedOption = shuffledOptions.find(o =>
        answerLower.includes(o.label.toLowerCase()) ||
        answerLower.includes(o.label.toLowerCase())
      );

      // Moral dilemmas: score on OPTION ALIGNMENT + depth of reflection.
      // Each option maps to a drive (agency/communion/eros/agape) — scoring uses
      // the option's correctnessScore to differentiate drive-aligned responses.
      const optionScore = matchedOption?.correctnessScore ?? 0.5;
      const depth = answer.length > 30 ? 0.9 : answer.length > 20 ? 0.7 : answer.length > 10 ? 0.5 : 0.3;
      const responseTime = durationMs < 15000 ? 0.8 : durationMs < 60000 ? 0.6 : 0.4;

      return {
        taskId: task.id,
        timestamp: startTimeMs,
        dimensions: {
          accuracy: optionScore,
          depth,
          response_time: responseTime,
          coherence: matchedOption ? 0.7 : 0.4,
        },
        rawResponse: {
          dilemma: dilemma.scenario,
          answer,
          matchedDrive: matchedOption?.drive ?? null,
          matchedPolarity: matchedOption?.polarity ?? 'neutral',
          correctnessScore: optionScore,
        },
        durationMs,
      };
    },
  };
}

// ── Cooperation Renderer ─────────────────────────────────────────────

export function renderCooperation(task: AssessmentTask): {
  prompt: AskUserQuestionParams;
  evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult;
} {
  const question = [
    `A companion stands beside you at a crossroads. They look to you for direction.`,
    ``,
    `${C.bold}How do you lead?${C.reset}`,
  ].join('\n');

  const options: DriveOption[] = [
    { label: 'Decide and lead', description: 'Make the call and invite them to follow', drive: 'agency', polarity: 'sts', correctnessScore: 0.7 },
    { label: 'Decide together', description: 'Find the path through dialogue', drive: 'communion', polarity: 'sto', correctnessScore: 0.9 },
    { label: 'Follow their lead', description: 'Trust their judgment for this one', drive: 'agape', polarity: 'sto', correctnessScore: 0.5 },
    { label: 'Forge a new way', description: 'Neither path is right — create a third', drive: 'eros', polarity: 'neutral', correctnessScore: 0.6 },
  ];
  shuffle(options);

  return {
    prompt: {
      questions: [{
        question,
        header: 'Cooperative Dynamics',
        options: options.map(o => ({ label: o.label, description: o.description })),
        allowWriteIn: true,
        multiSelect: false,
      }],
    },
    evaluate: (answer: string, startTimeMs: number, endTimeMs: number): TrialResult => {
      const durationMs = endTimeMs - startTimeMs;
      const matchedOpt = options.find(o => answer.toLowerCase().includes(o.label.toLowerCase()));

      return {
        taskId: task.id,
        timestamp: startTimeMs,
        dimensions: {
          accuracy: matchedOpt?.correctnessScore ?? 0.5,
          response_time: durationMs < 15000 ? 0.7 : 0.5,
          depth: answer.length > 20 ? 0.7 : 0.4,
        },
        rawResponse: {
          answer,
          matchedDrive: matchedOpt?.drive ?? null,
          matchedPolarity: matchedOpt?.polarity ?? 'neutral',
        },
        durationMs,
      };
    },
  };
}

// ── Imitation Renderer ───────────────────────────────────────────────

export function renderImitation(task: AssessmentTask): {
  prompt: AskUserQuestionParams;
  evaluate: (answer: string, startTimeMs: number, endTimeMs: number) => TrialResult;
} {
  const question = [
    `An elder demonstrates a technique — watch carefully, then replicate.`,
    ``,
    `${C.dim}The elder strikes a pose: grounded, arms extended, breath steady.${C.reset}`,
    ``,
    `${C.bold}Describe how you would replicate this:${C.reset}`,
  ].join('\n');

  const options: DriveOption[] = [
    { label: 'Mirror exactly', description: 'Precision replication — every detail matters', drive: 'agency', polarity: 'neutral', correctnessScore: 0.7 },
    { label: 'Capture the essence', description: 'Feel the intent behind the movement', drive: 'eros', polarity: 'neutral', correctnessScore: 0.8 },
    { label: 'Ask for guidance', description: 'Seek correction before practicing', drive: 'communion', polarity: 'sto', correctnessScore: 0.6 },
    { label: 'Improvise freely', description: 'Make it your own from the start', drive: 'agape', polarity: 'neutral', correctnessScore: 0.4 },
  ];
  shuffle(options);

  return {
    prompt: {
      questions: [{
        question,
        header: 'Imitative Learning',
        options: options.map(o => ({ label: o.label, description: o.description })),
        allowWriteIn: true,
        multiSelect: false,
      }],
    },
    evaluate: (answer: string, startTimeMs: number, endTimeMs: number): TrialResult => {
      const durationMs = endTimeMs - startTimeMs;
      const matchedOpt = options.find(o => answer.toLowerCase().includes(o.label.toLowerCase()));

      return {
        taskId: task.id,
        timestamp: startTimeMs,
        dimensions: {
          accuracy: matchedOpt?.correctnessScore ?? 0.5,
          response_time: durationMs < 15000 ? 0.7 : 0.5,
          consistency: matchedOpt ? 0.6 : 0.4,
        },
        rawResponse: {
          answer,
          matchedDrive: matchedOpt?.drive ?? null,
          matchedPolarity: matchedOpt?.polarity ?? 'neutral',
        },
        durationMs,
      };
    },
  };
}

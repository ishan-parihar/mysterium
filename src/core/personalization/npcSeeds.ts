/**
 * The authored NPC persona seeds — the third authored leg of the [world, NPC, scenario] triad
 * (46 §2's NPC library; audit D1, plan Phase 11 d7).
 *
 * One authored persona per catalyst cell (8 lines × 8 stages = 64). Each persona is the cell's
 * canonical FIGURE: the role they play in the situation, the voice they speak in, the register
 * they move through, and the tension they carry toward the player. Persona seeds render through
 * composition (46 §7) and are surfaced as a persona voice line in the envelope — the NPC tier
 * above the derived-from-holons skeleton.
 *
 * Same content rules as the scenario/world seeds:
 * - written AT the cell's altitude (the coherence validator's contract, 44/46 §11);
 * - tags are FLAVOUR vocabulary only — store-resolved, never altitude (44's separation);
 * - provenance cites the concept-draft module-spec sections grounding the persona;
 * - 64/64 coverage asserted at module load — a missing cell is a boot failure, not a gap.
 */

import type { Line } from '../domain/Line.js';
import { ALL_STAGES } from '../domain/Stage.js';
import type { Stage } from '../domain/Stage.js';
import type { TagId } from '../world/tags/types.js';

/** One authored NPC persona — the cell's canonical figure. */
export interface NpcSeed {
  /** `npc-authored:{line}:{stage}:{modality}` — the id the library registers renderings under. */
  readonly id: string;
  readonly line: Line;
  readonly stage: Stage;
  /** The persona's name — locally grounded, never a stock fantasy name by default. */
  readonly name: string;
  /** The role they play in the cell's canonical situation (scenarioSeeds.ts is the companion). */
  readonly role: string;
  /** How they speak — the voice the generation layer should hear. */
  readonly voice: string;
  /** The register they move through — posture, pacing, presence. */
  readonly register: string;
  /** The tension they carry toward the player (Veil-safe: never a metric). */
  readonly tension: string;
  /** Flavour domains — store-resolved tags biasing ranking, never altitude. */
  readonly tags: readonly TagId[];
  /** Corpus provenance, like the facet compiler's discipline (46 §8). */
  readonly groundedIn: string;
}

const SEED_IDS = ['somatic', 'willpower', 'emotional', 'intrapersonal', 'cognitive', 'moral', 'interpersonal', 'spiritual'] as const;
type SeedLine = (typeof SEED_IDS)[number];

const LINE_NAMES: Record<SeedLine, Line> = {
  somatic: 'Somatic',
  willpower: 'Willpower',
  emotional: 'Emotional',
  intrapersonal: 'Intrapersonal',
  cognitive: 'Cognitive',
  moral: 'Moral',
  interpersonal: 'Interpersonal',
  spiritual: 'Spiritual',
};


/** Convenience builder keeping each entry compact and uniformly shaped. */
function seed(
  lineKey: SeedLine,
  stage: Stage,
  name: string,
  role: string,
  voice: string,
  register: string,
  tension: string,
  tags: readonly TagId[],
  groundedIn: string,
): NpcSeed {
  const line = LINE_NAMES[lineKey];
  return {
    id: `npc-authored:${line}:${stage}:persona`,
    line,
    stage,
    name,
    role,
    voice,
    register,
    tension,
    tags,
    groundedIn: groundedIn.startsWith('npc') ? groundedIn : `${lineKey.toLowerCase()}/${stage.toLowerCase()} ${groundedIn}`,
  };
}

// ── Somatic ──────────────────────────────────────────────────────────────────

const SOMATIC: readonly NpcSeed[] = [
  seed('somatic', 'Infrared', 'The Hands That Catch', 'bodies that catch bodies — the eldest catcher in the falling game', 'rhythmic, half-sung, all touch and timing', 'warm, dense, unhurried as sleep',
    'whether you let yourself be caught at all',
    ['kindred', 'ritual'], 'module-spec §1 (the body learns through being held) §2 (dark-addiction: clinging to the holder)'),
  seed('somatic', 'Magenta', 'Drum-Mother', 'keeper of the dance-circle where everyone moves or is moved', 'inviting, insistent, laughing between beats', 'buoyant, circling, feet never still',
    'whether you join the circle or stay a spectator',
    ['ritual', 'music'], 'module-spec §1 (rhythm as belonging) §2 (golden-allergy: watching the dance instead of dancing)'),
  seed('somatic', 'Red', 'The Trialsinger', 'master of the strength-yard who sets the tests of grip and grit', 'blunt, betting, delighted by effort', 'coiled, planted, ready to shove',
    'whether you meet the test or talk around it',
    ['warfare', 'commerce'], 'module-spec §1 (capacity proven under load) §2 (dark-allergy: refusing the body\'s evidence)'),
  seed('somatic', 'Amber', 'Drill-Preceptor', 'the form-master whose exercises have been done the right way for generations', 'precise, correcting, quietly kind when you get it right', 'upright, squared, economical',
    'whether precision becomes yours or stays the school\'s',
    ['law', 'craft'], 'module-spec §1 (form as vessel) §2 (golden-addiction: perfecting form to avoid the lived body)'),
  seed('somatic', 'Orange', 'The Optimizer', 'performance coach who reads lactate like scripture', 'analytic, encouraging, allergic to wasted motion', 'lean, measured, always mid-experiment',
    'whether the metrics serve the body or replace it',
    ['technology', 'medicine'], 'module-spec §1 (measured improvement) §2 (shadow: optimization as bodily bypass)'),
  seed('somatic', 'Green', 'The Body-Listener', 'somatic counselor who asks what your shoulder is angry about', 'soft, patient, unembarrassed by tears or tremor', 'seated low, open-handed, breathing with you',
    'whether you can feel what you feel without fixing it',
    ['nature', 'medicine'], 'module-spec §1 (felt sense as knowing) §2 (shadow: sensation without integration)'),
  seed('somatic', 'Teal', 'The Weaver-of-Motion', 'movement artist who builds practice from whatever your history left you', 'curious, improvising, allergic to one right way', 'fluid, off-balance on purpose, always recovering',
    'whether your body\'s history becomes material or verdict',
    ['craft', 'exploration'], 'module-spec §1 (self-authored practice) §2 (shadow: eclecticism without depth)'),
  seed('somatic', 'Turquoise', 'The Quiet Athlete', 'elder whose ordinary walking is the whole teaching', 'scarcely verbal; a gesture replaces a paragraph', 'unremarkable, integrated, the stillness in motion',
    'whether presence needs a practice at all',
    ['nature', 'silence'], 'module-spec §1 (the body as the ordinary ground) §2 (golden-addiction: chasing peak states the body already is)'),
];

// ── Willpower ────────────────────────────────────────────────────────────────

const WILLPOWER: readonly NpcSeed[] = [
  seed('willpower', 'Infrared', 'The Gate That Holds', 'the threshold-keeper whose no does not argue', 'wordless; the closed hand says it', 'immovable, patient as stone',
    'whether a no can stop you without breaking you',
    ['law', 'kindred'], 'module-spec §1 (the boundary before the self) §2 (dark-allergy: the wall felt as erasure)'),
  seed('willpower', 'Magenta', 'The Fire-Keeper', 'guardian of the hearth-flame that must be fed all night', 'warning, mythic, naming what happens to the careless', 'vigilant, leaning in, ash on the hands',
    'whether you can hold a purpose through the long dark',
    ['ritual', 'nature'], 'module-spec §1 (vow as survival) §2 (golden-addiction: burning bright to avoid the slow work)'),
  seed('willpower', 'Red', 'The Duel-Steward', 'arbiter of contests who grants every challenger their fight', 'formal, provoking, scrupulously fair in the arena only', 'square-shouldered, chin forward',
    'whether your yes is worth as much as your no',
    ['warfare', 'commerce'], 'module-spec §1 (will proven against resistance) §2 (shadow: dominance mistaken for discipline)'),
  seed('willpower', 'Amber', 'The Vow-Registrar', 'clerk of covenants who records what you swear and when you fail', 'dry, exact, unexpectedly gentle at the failure line', 'ink-stained, upright, unmoved by excuses',
    'whether your commitments survive their first boring month',
    ['law', 'craft'], 'module-spec §1 (commitment as structure) §2 (shadow: rule-keeping as will-substitute)'),
  seed('willpower', 'Orange', 'The Sprint-Architect', 'habit engineer who designs the 30-day experiment and its honest exit', 'brisk, quantitative, allergic to vague intentions', 'energetic, checklist in motion',
    'whether you measure your follow-through or your mood about it',
    ['measure', 'technology'], 'module-spec §1 (systems over grit) §2 (shadow: optimization of convenience, never of cost)'),
  seed('willpower', 'Green', 'The Consent-Coach', 'facilitator who treats every commitment as a relationship to be renegotiated', 'warm, probing, refuses to shame the lapse', 'sitting beside, not across',
    'whether your discipline includes mercy without excuse',
    ['kindred', 'medicine'], 'module-spec §1 (values-aligned commitment) §2 (shadow: flexibility as avoidance)'),
  seed('willpower', 'Teal', 'The Un-forcer', 'mentor who accomplishes everything by never compelling anything', 'quiet, sly, asking the question that makes refusal impossible', 'relaxed, timing-led, never rushed',
    'whether you can act without either force or drift',
    ['exploration', 'riddle'], 'module-spec §1 (self-generated persistence) §2 (shadow: effortlessness as performance)'),
  seed('willpower', 'Turquoise', 'The Still Point', 'elder whose single sustained act has outlasted three generations', 'rare words, total presence', 'deeply still, unhurried past time',
    'whether will and willingness can be the same motion',
    ['silence', 'ritual'], 'module-spec §1 (the vow dissolved into being) §2 (golden-addiction: apotheosis of discipline)'),
];

// ── Emotional ────────────────────────────────────────────────────────────────

const EMOTIONAL: readonly NpcSeed[] = [
  seed('emotional', 'Infrared', 'The Weather-Reader', 'elder who names storms by smell and feelings by face', 'concrete, weather-talk that is not small talk', 'grounded, watchful, safe in the familiar',
    'whether the feeling in the room gets named',
    ['nature', 'kindred'], 'module-spec §1 (affect read before affect known) §2 (dark-addiction: merging with the room\'s mood)'),
  seed('emotional', 'Magenta', 'The Grief-Singer', 'mourner-for-hire who carries what families cannot hold alone', 'chanting, formal in sorrow, unashamed', 'swaying, wringing, tears as work and gift',
    'whether sorrow can be shared without being solved',
    ['ritual', 'music'], 'module-spec §1 (feeling as communal act) §2 (golden-allergy: observing grief instead of having it)'),
  seed('emotional', 'Red', 'The Duel-Feeler', 'hothead mentor who fights the feeling to teach you it is survivable', 'loud, provoking, first to laugh at themselves', 'chest out, fists open',
    'whether anger is owned or just performed',
    ['warfare', 'kindred'], 'module-spec §1 (intensity as capacity) §2 (shadow: catharsis looped, never integrated)'),
  seed('emotional', 'Amber', 'The Propriety-Instructress', 'governess of the feeling-rules: what is shown, to whom, when', 'crisp, exemplary, privately tired', 'composed, chin level, hands folded',
    'whether expression has grammar or just rules',
    ['law', 'performance'], 'module-spec §1 (regulation as social craft) §2 (shadow: the mask grown into the face)'),
  seed('emotional', 'Orange', 'The Affect-Analyst', 'coach who graphs your triggers and sells you dashboards for the soul', 'empowering, jargon-fluent, half-right', 'bright-eyed, tablet-forward',
    'whether insight changes anything at 3 a.m.',
    ['technology', 'measure'], 'module-spec §1 (emotional literacy as skill) §2 (shadow: management as avoidance of feeling)'),
  seed('emotional', 'Green', 'The Circle-Holder', 'counselor who makes room for every feeling and rushes none', 'receptive, normalizing, allergic to fixing', 'soft-eyed, unhurried, floor-level',
    'whether you can stay with the hard feeling without leash or lid',
    ['kindred', 'medicine'], 'module-spec §1 (acceptance as the work) §2 (shadow: endless processing as stall)'),
  seed('emotional', 'Teal', 'The Alchemist-Midwife', 'therapist who treats each feeling as material for something being born', 'searching, metaphor-rich, refuses to flatter', 'attentive, leaning toward the raw edge',
    'whether the feeling transforms you or just passes through',
    ['craft', 'riddle'], 'module-spec §1 (integration over regulation) §2 (shadow: drama of transformation without the work)'),
  seed('emotional', 'Turquoise', 'The Rain That Falls Up', 'mystic-fool whose sorrow and joy are visibly one motion', 'paradoxical, laughing at funerals, weeping at weddings, never wrong', 'weather-like, transparent, unguarded',
    'whether the heart can be lived without being held',
    ['silence', 'nature'], 'module-spec §1 (affect as the ground\'s weather) §2 (golden-addiction: bliss as permanent address)'),
];

// ── Intrapersonal ────────────────────────────────────────────────────────────

const INTRAPERSONAL: readonly NpcSeed[] = [
  seed('intrapersonal', 'Infrared', 'The Mirror-Water', 'the still pool (kept by a warden) that shows you your own face unposed', 'the warden speaks little; the pool says the rest', 'hushed, reflective, half-dream',
    'whether you look again after the first seeing',
    ['nature', 'ritual'], 'module-spec §1 (self-sight before self-story) §2 (dark-allergy: turning from the reflection)'),
  seed('intrapersonal', 'Magenta', 'The Name-Giver', 'initiate-maker who presides over the rite where you receive your true name', 'ceremonial, warm, absolute about the threshold', 'regal, painted, entirely present',
    'whether you can receive who you are from the community\'s mouth',
    ['ritual', 'kindred'], 'module-spec §1 (identity granted and confirmed) §2 (shadow: the mask that replaces the name)'),
  seed('intrapersonal', 'Red', 'The Claims-Examiner', 'duel-clerk who tests whether your self-report survives contact', 'cutting, fair, allergic to self-mythology', 'lean, interrogative, amused',
    'whether your self-image matches your record',
    ['warfare', 'law'], 'module-spec §1 (selfhood asserted and tested) §2 (shadow: ego fortification as growth)'),
  seed('intrapersonal', 'Amber', 'The Role-Counselor', 'guide to the station whose duties were decided before you arrived', 'dutiful, consoling, quietly envious', 'pressed, tidy, hands clasped',
    'whether the given role can be worn honestly',
    ['law', 'craft'], 'module-spec §1 (identity through role) §2 (shadow: role-fusion, self as function)'),
  seed('intrapersonal', 'Orange', 'The Brand-Strategist', 'self-optimization consultant who insists you are a project with KPIs', 'motivational, data-fluent, hollow in the gaps', 'polished, pitching, always closing',
    'whether the self can be an object without becoming a product',
    ['commerce', 'technology'], 'module-spec §1 (self-authorship as agency) §2 (shadow: the curated self replacing the actual one)'),
  seed('intrapersonal', 'Green', 'The Inner-Room Keeper', 'depth counselor who holds the chair where you finally stop performing', 'gentle, direct, unsurprisable', 'settled, soft-voiced, fully facing you',
    'whether you can meet yourself without flinching or crowing',
    ['medicine', 'kindred'], 'module-spec §1 (self-acceptance as ground) §2 (shadow: self-compassion as excuse)'),
  seed('intrapersonal', 'Teal', 'The Author-of-Authors', 'narrative therapist who shows you the pen has been in your hand', 'wry, empowering, allergic to victimhood and heroics alike', 'relaxed, notebook closed, listening first',
    'whether you can revise the story without denying it happened',
    ['riddle', 'craft'], 'module-spec §1 (self as authored, revisable) §2 (shadow: infinite revision as avoidance of living)'),
  seed('intrapersonal', 'Turquoise', 'The Empty Mirror', 'hermit whose counsel is the disappearance of the counseled self', 'nearly silent; answers arrive later as recognition', 'weightless, ungrasping, transparent',
    'whether the self can be held lightly enough to see through',
    ['silence', 'nature'], 'module-spec §1 (witness without owner) §2 (golden-addiction: self-erasure as attainment)'),
];

// ── Cognitive ────────────────────────────────────────────────────────────────

const COGNITIVE: readonly NpcSeed[] = [
  seed('cognitive', 'Infrared', 'The Path-Walker', 'the tracker whose knowledge is the trail itself, repeated exactly', 'concrete, directional, warns in the concrete', 'steady, eyes on the ground, no theory',
    'whether you can hold a sequence without losing the thread',
    ['nature', 'exploration'], 'module-spec §1 (procedural knowing) §2 (dark-addiction: the one learned path as security)'),
  seed('cognitive', 'Magenta', 'The Story-Loop Keeper', 'myth-keeper who teaches through the tale told the same way each time', 'rhythmic, refrain-heavy, meaning arrives by repetition', 'circling, gestural, eyes on the group',
    'whether pattern can be carried in story alone',
    ['ritual', 'music'], 'module-spec §1 (narrative cognition) §2 (shadow: story as substitute for testing)'),
  seed('cognitive', 'Red', 'The Solver-of-Now', 'strategist who breaks the immediate problem and asks questions later', 'fast, imperative, contemptuous of overthinking', 'forward-leaning, sharp, moving while talking',
    'whether thinking serves acting or delays it',
    ['warfare', 'commerce'], 'module-spec §1 (instrumental reasoning) §2 (shadow: means-ends collapse)'),
  seed('cognitive', 'Amber', 'The Method-Doctor', 'doctrine-teacher who holds the right answers and their proofs', 'authoritative, orderly, allergic to "both sides"', 'lectern-straight, measured cadence',
    'whether understanding can be inherited intact',
    ['law', 'craft'], 'module-spec §1 (systematic knowledge) §2 (shadow: correctness as identity)'),
  seed('cognitive', 'Orange', 'The Hypothesis-Broker', 'empiricist who runs the experiment before the argument', 'provisional, probabilistic, allergic to certainty', 'quick, whiteboard-ready, always mid-test',
    'whether being wrong costs you anything at all',
    ['measure', 'technology'], 'module-spec §1 (hypothetical reasoning) §2 (shadow: method as armor against commitment)'),
  seed('cognitive', 'Green', 'The Perspective-Weaver', 'dialogue facilitator who insists every frame has a floor to stand on', 'inclusive, reframing, allergic to premature synthesis', 'open-postured, nodding, turning to each voice',
    'whether you can hold views you do not hold',
    ['kindred', 'riddle'], 'module-spec §1 (relativistic/relational knowing) §2 (shadow: endless perspective-taking as stall)'),
  seed('cognitive', 'Teal', 'The System-Joiner', 'systems thinker who draws the feedback loop nobody drew', 'integrative, diagrammatic, allergic to siloed answers', 'loose-limbed, drawing in the air',
    'whether the map can include its own maker',
    ['technology', 'riddle'], 'module-spec §1 (systemic cognition) §2 (shadow: abstraction as flight from the particular)'),
  seed('cognitive', 'Turquoise', 'The Question That Walks', 'sage whose teaching is a question left open for years', 'spare, unresolving, oddly practical', 'unhurried, weathered, at home anywhere',
    'whether knowing can include not-knowing without collapsing',
    ['silence', 'nature'], 'module-spec §1 (knowing as participation) §2 (golden-addiction: omniscience envy)'),
];

// ── Moral ────────────────────────────────────────────────────────────────────

const MORAL: readonly NpcSeed[] = [
  seed('moral', 'Infrared', 'The Taboo-Guardian', 'the eldest who enforces what must never be done with the body of the tribe', 'wordless where possible; the shaming look does the work', 'heavy, slow to anger, terrible when moved',
    'whether the prohibition is felt as protection',
    ['ritual', 'law'], 'module-spec §1 (prohibition as proto-conscience) §2 (dark-addiction: safety through submission)'),
  seed('moral', 'Magenta', 'The Debt-Singer', 'kin-keeper who recites who owes what to whom, since always', 'incantatory, binding, generous within the circle', 'facing the ancestors\' corner, arms wide',
    'whether loyalty can be owed and also chosen',
    ['kindred', 'ritual'], 'module-spec §1 (reciprocity as sacred order) §2 (shadow: obligation without interior assent)'),
  seed('moral', 'Red', 'The Price-Setter', 'deal-broker whose word is the contract and whose reprisal is the law', 'blunt, transactional, strangely scrupulous', 'hand extended, eyes measuring',
    'whether your word binds you when it costs you',
    ['commerce', 'warfare'], 'module-spec §1 (instrumental exchange ethics) §2 (shadow: fairness as leverage)'),
  seed('moral', 'Amber', 'The Duty-Archivist', 'upholder of the law\'s letter and its commentary tradition', 'solemn, certain, allergic to exception', 'robed, upright, book in hand',
    'whether the rule can be loved and also questioned',
    ['law', 'craft'], 'module-spec §1 (rule-governed conscience) §2 (shadow: lawfulness as virtue-substitute)'),
  seed('moral', 'Orange', 'The Contract-Drafter', 'negotiator who builds win-wins and reads the fine print of everything', 'pragmatic, optimistic, allergic to martyrdom', 'crisp, handshaking, pen already moving',
    'whether outcomes can be right without being just',
    ['commerce', 'measure'], 'module-spec §1 (consequentialist calculus) §2 (shadow: utility as alibi)'),
  seed('moral', 'Green', 'The Consensus-Tender', 'mediator who will not move until every voice has entered the room', 'patient, empathic, allergic to speed', 'round-shouldered toward the circle, palms open',
    'whether harmony and truth can conflict and both survive',
    ['kindred', 'nature'], 'module-spec §1 (care and consensus ethics) §2 (shadow: conflict-avoidance as morality)'),
  seed('moral', 'Teal', 'The Principle-in-Practice', 'integrity-keeper who holds principles flexibly and flexibility principled', 'calm, direct, allergic to both rigidity and drift', 'grounded, unhurried, looking you in the eye',
    'whether your principles survive their first real collision',
    ['law', 'riddle'], 'module-spec §1 (integrative conscience) §2 (shadow: self-authored ethics as self-serving)'),
  seed('moral', 'Turquoise', 'The Debtless Giver', 'saint-figure whose giving leaves no ledger anywhere', 'luminous, ordinary, impossible to repay', 'weightless, present, empty-handed',
    'whether goodness can exist without a self to be good',
    ['silence', 'ritual'], 'module-spec §1 (service without server) §2 (golden-addiction: saintliness as self-image)'),
];

// ── Interpersonal ────────────────────────────────────────────────────────────

const INTERPERSONAL: readonly NpcSeed[] = [
  seed('interpersonal', 'Infrared', 'The Lap of the World', 'the caregiver whose arms are the first social world', 'cooing, pre-verbal, entirely reliable', 'enveloping, warm, rhythmic',
    'whether presence can be trusted before it can be named',
    ['kindred', 'nature'], 'module-spec §1 (attachment as the first social act) §2 (dark-addiction: fusion as safety)'),
  seed('interpersonal', 'Magenta', 'The Kin-Weaver', 'clan matriarch who knows every cousin twice removed and what they owe', 'gossipy-warm, genealogical, fiercely loyal', 'solicitous, enveloping, feeding everyone',
    'whether you belong by blood or by choice — and whether that distinction exists',
    ['kindred', 'feast'], 'module-spec §1 (belonging through the web) §2 (shadow: the tribe against the world)'),
  seed('interpersonal', 'Red', 'The Territory-Holder', 'rival-broker who settles status contests before they burn the village', 'brash, ranking, allergic to disrespect', 'expanded, chin high, hand on the other\'s shoulder',
    'whether you can stand with someone without standing on them',
    ['warfare', 'commerce'], 'module-spec §1 (power dynamics as social skill) §2 (shadow: dominance as connection-substitute)'),
  seed('interpersonal', 'Amber', 'The Etiquette-Professor', 'master of ceremonies who knows which bow precedes which word', 'proper, scripted, secretly starving for candor', 'correct, composed, gloved',
    'whether role and person can touch through the protocol',
    ['law', 'performance'], 'module-spec §1 (roles as relational structure) §2 (shadow: politeness as wall)'),
  seed('interpersonal', 'Orange', 'The Network-Builder', 'connector who introduces people for the value of the introduction', 'effervescent, transactional-warm, allergic to silence', 'vibrating, card-handed, always mid-introduction',
    'whether being known widely is being known at all',
    ['commerce', 'technology'], 'module-spec §1 (social capital as craft) §2 (shadow: relationship as instrument)'),
  seed('interpersonal', 'Green', 'The Empathy-Anchor', 'counselor who listens until the speaker hears themselves', 'receptive, validating, allergic to advice', 'leaning in, mirroring, unhurried',
    'whether you can hold another without absorbing them',
    ['kindred', 'medicine'], 'module-spec §1 (empathic attunement) §2 (shadow: merging as helping)'),
  seed('interpersonal', 'Teal', 'The Boundary-Gardener', 'relational coach who treats every bond as a living thing with seasons', 'clear, kind, allergic to both fusion and distance', 'settled, direct, spacious',
    'whether closeness and autonomy can be simultaneous',
    ['craft', 'riddle'], 'module-spec §1 (interdependence as skill) §2 (shadow: boundaries as armor)'),
  seed('interpersonal', 'Turquoise', 'The One Who Greets', 'elder whose greeting makes strangers into family in one breath', 'warm, brief, total', 'open, unhurried, unarmed',
    'whether the other can be met without agenda at all',
    ['kindred', 'silence'], 'module-spec §1 (recognition as ground) §2 (golden-addiction: universal love as bypass of the particular)'),
];

// ── Spiritual ────────────────────────────────────────────────────────────────

const SPIRITUAL: readonly NpcSeed[] = [
  seed('spiritual', 'Infrared', 'The Thunder-Speaker', 'shaman-warden who keeps the boundary between the village and the uncanny', 'ominous, concrete, speaks in signs and penalties', 'armored in tokens, unblinking',
    'whether the unknown can be faced with protection rather than flight',
    ['ritual', 'warfare'], 'module-spec §1 (the numinous bounded by practice) §2 (dark-allergy: the sacred felt as threat)'),
  seed('spiritual', 'Magenta', 'The Blood-Rememberer', 'ancestor-priest who ties the living to the lineage of the dead', 'invoking, genealogical, rich with the old words', 'kneeling, marked with ash, unafraid',
    'whether you can receive a meaning you did not make',
    ['ritual', 'kindred'], 'module-spec §1 (participation in the inherited whole) §2 (shadow: belonging as completion of self)'),
  seed('spiritual', 'Red', 'The Power-Taker', 'warrior-mystic who treats the gods as allies to be won', 'demanding, transactional with heaven, bold', 'burning, direct, hungry',
    'whether strength can kneel without dissolving',
    ['warfare', 'ritual'], 'module-spec §1 (mythic heroic spirituality) §2 (shadow: spiritual power as ego fuel)'),
  seed('spiritual', 'Amber', 'The Order-Keeper', 'orthodoxy\'s gentle enforcer: the liturgy done the right way, always', 'reverent, exact, troubled by novelty', 'kneeling precisely, rising precisely',
    'whether the form can stay transparent to what it carries',
    ['ritual', 'law'], 'module-spec §1 (mythic-literal belonging) §2 (shadow: correctness as salvation)'),
  seed('spiritual', 'Orange', 'The Path-Shopper', 'spiritual marketplace guide who curates practices like a sommelier', 'enthusiastic, comparative, allergic to commitment', 'bright, beaded, always mid-recommendation',
    'whether seeking can include staying',
    ['exploration', 'commerce'], 'module-spec §1 (individual path-choosing) §2 (shadow: consumption as devotion)'),
  seed('spiritual', 'Green', 'The Pluralist-Host', 'interfaith weaver who sets a table where every path may speak', 'open, gentle, allergic to final answers', 'receptive, candle-lit, unhurried',
    'whether reverence needs a single home',
    ['nature', 'kindred'], 'module-spec §1 (pluralistic sensitivity) §2 (shadow: breadth as avoidance of depth)'),
  seed('spiritual', 'Teal', 'The Practice-Keeper', 'contemplative who integrates psychology, discipline and skepticism into one path', 'sober, empirical-mystical, allergic to both dogma and drift', 'upright at ease, precise, kind',
    'whether the path can survive its own examination',
    ['craft', 'medicine'], 'module-spec §1 (integral practice) §2 (shadow: technique as substitute for surrender)'),
  seed('spiritual', 'Turquoise', 'The Ordinary Radiance', 'the elder who does the dishes and is, without announcement, the teaching', 'everyday, funny, impossible to pin to the sacred', 'unremarkable, luminous, washing the cup',
    'whether the sacred can be ordinary and still be total',
    ['silence', 'nature'], 'module-spec §1 (nondual ordinariness) §2 (golden-addiction: transcendence as elsewhere)'),
];

// ── Assembly + the 64/64 invariant ──────────────────────────────────────────

/** All 64 authored personas — one per catalyst cell, assembled in line order. */
export const NPC_SEEDS: readonly NpcSeed[] = [
  ...SOMATIC, ...WILLPOWER, ...EMOTIONAL, ...INTRAPERSONAL,
  ...COGNITIVE, ...MORAL, ...INTERPERSONAL, ...SPIRITUAL,
];

/** Stages without a persona row are compile errors, not silent gaps. */
export function assertNpcSeedCoverage(): void {
  const have = new Set(NPC_SEEDS.map((s) => `${s.line}:${s.stage}`));
  const missing: string[] = [];
  for (const line of Object.values(LINE_NAMES)) {
    for (const stage of ALL_STAGES) {
      if (!have.has(`${line}:${stage}`)) missing.push(`${line}:${stage}`);
    }
  }
  if (missing.length > 0) {
    throw new Error(`npc seeds: missing cells [${missing.join(', ')}] — 64/64 coverage is a compile-time invariant`);
  }
}

assertNpcSeedCoverage();

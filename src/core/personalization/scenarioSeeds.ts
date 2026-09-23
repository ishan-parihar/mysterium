/**
 * The authored scenario seeds — the foundational seeding for the world/NPC/scenario +
 * personalization architecture (46 §2, 45 §5 §2 "scenario library").
 *
 * One authored seed per catalyst cell (8 lines × 8 stages = 64). Each seed is the cell's canonical
 * SITUATION: locus, cast, and stakes — grounded in the concept-draft corpus (module-spec §1/§2 for
 * that cell) and written AT the stage's altitude, never above or below it. This is the load-bearing
 * content rule the user ratified: the permutation/combination of [world, NPC, scenario] components
 * must not produce a stage-incoherent simulation, so every seed carries its own cell and the
 * coherence validator (stageCoherence.ts) rejects any combination that mixes altitudes.
 *
 * Tags name the seed's FLAVOUR domains — every tag resolves in the initial tag store (46 §11
 * invariant 4 applies here too; the constructor validates). Stage altitude is NOT carried in tags:
 * tags are preference vocabulary, stages are developmental altitude, and the two must never be
 * conflated (44's lens/altitude separation).
 *
 * Authoring provenance: each seed cites the module-spec sections it was grounded in (like the
 * facet compiler's provenance discipline, 46 §8 — humans can audit content back to the corpus).
 */

import type { Line } from '../domain/Line.js';
import { ALL_STAGES } from '../domain/Stage.js';
import type { Stage } from '../domain/Stage.js';
import type { TagId } from '../world/tags/types.js';

/** One authored scenario seed — the cell's canonical situation. */
export interface ScenarioSeed {
  /** `scenario:{line}:{stage}:authored` — the id the library registers it under. */
  readonly id: string;
  readonly line: Line;
  readonly stage: Stage;
  /** The situation in one breath — what the player walks into. Stage-coherent prose. */
  readonly situation: string;
  /** The cast: who is present (rendered into NPCs by composition, 46 §7). */
  readonly cast: readonly string[];
  /** What is at stake for the player-character's own development (never a metric, Veil-safe). */
  readonly stakes: string;
  /** Flavour domains — store-resolved tags that bias ranking (45 §5.3), never altitude. */
  readonly tags: readonly TagId[];
  /** Corpus provenance: which concept-draft module-spec sections ground this seed. */
  readonly groundedIn: string;
}

const SEED_IDS = ['somatic', 'willpower', 'emotional', 'intrapersonal', 'cognitive', 'moral', 'interpersonal', 'spiritual'] as const;
type SeedLine = (typeof SEED_IDS)[number];

/** Capitalized line names matching the domain `Line` type. */
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
  line: SeedLine,
  stageIdx: number,
  situation: string,
  cast: readonly string[],
  stakes: string,
  tags: readonly TagId[],
  groundedIn: string,
): ScenarioSeed {
  const stage = ALL_STAGES[stageIdx]!;
  return {
    id: `scenario:${LINE_NAMES[line]}:${stage}:authored`,
    line: LINE_NAMES[line],
    stage,
    situation,
    cast,
    stakes,
    tags,
    groundedIn,
  };
}

/**
 * The 64 authored seeds. Each row: situation / cast / stakes / tags / provenance, written at the
 * cell's altitude from the module-spec corpus. Stage voices:
 *  Infrared = sensory-kin safety · Magenta = image, kin, place · Red = power, impulse, contest ·
 *  Amber = order, role, rule · Orange = optimization, autonomy, craft · Green = care, voice, inclusion ·
 *  Teal = systems, emergence, authenticity · Turquoise = wholeness, participation-mystique.
 */
export const SCENARIO_SEEDS: readonly ScenarioSeed[] = [
  // ── SOMATIC ─────────────────────────────────────────────────────────────────
  seed('somatic', 0,
    'Night. A body too tired to flee but too wound to sleep, every sound landing on the skin. A rough blanket, a fire dying, the simple animal question: safe enough to rest?',
    ['the fire-keeper (an elder who notices bodies, not words)'],
    'The body learns the difference between held and merely hidden — or braces itself and stays braced.',
    ['kindred', 'nature'],
    'somatic/infrared module-spec §1 (regulation, comfort seeking) §2 (dark-addiction: control of sensation)'),
  seed('somatic', 1,
    'A river crossing at dusk, crossing-point chosen by feel: the stones talk through the soles. On the far bank, drumlight. The body wants in.',
    ['the crossing-guide (reads balance like weather)', 'the drum-circle at the far bank'],
    'Rhythm claims the body or the body holds its own rhythm — either way, it moves or it is moved.',
    ['ritual', 'music'],
    'somatic/magenta module-spec §1 (embodied image-identification) §2 (golden-addiction: endless enrapture)'),
  seed('somatic', 2,
    'The wrestling ring at the center of camp, chalk circle, whole tribe watching. A bigger opponent, a shorter fuse, and the choice that makes bodies: press the advantage or read the room.',
    ['the ring-warden (enforces the circle, respects force)', 'the challenger'],
    'Power felt as muscle and timing — spent recklessly it injures the one who spends it.',
    ['warfare', 'exploration'],
    'somatic/red module-spec §1 (power and physical mastery) §2 (dark-addiction: the impulsive body)'),
  seed('somatic', 3,
    'The legion training yard at dawn: forms repeated until they are law. The drill-master counts; the body complies; merit is measured in clean repetition. Something in the back complains.',
    ['the drill-master (order made flesh)', 'the veteran who remembers when form was alive'],
    'Discipline builds the body into an instrument — or into a cage that only knows one posture.',
    ['law', 'warfare'],
    'somatic/amber module-spec §1 (disciplined regimens) §2 (dark-allergy: refusal of the body\'s signals)'),
  seed('somatic', 4,
    'A performance lab with motion sensors and mirrors; the athlete-engineer tunes stride length like a trade route. Data streams; the body is a start-up. Burnout lurks like an investor asking hard questions.',
    ['the biomech coach (optimization as devotion)', 'the physio who talks about rest in ROI terms'],
    'The body as system to be optimized — brilliant gains, invisible costs, and the question of who the optimizing serves.',
    ['technology', 'craft'],
    'somatic/orange module-spec §1 (measured performance) §2 (golden-addiction: bypass via peak states)'),
  seed('somatic', 5,
    'A community garden in rehabilitation; every body here carries some history. The invitation isPartner stretching — but only if touch is wanted, and the asking matters as much as the moving.',
    ['the facilitator (holds consent like a sacred object)', 'the gardener whose tremor is simply weather'],
    'The body learns to be a home shared with others — accommodation without erasure.',
    ['kindred', 'medicine'],
    'somatic/green module-spec §1 (consentful embodiment) §2 (dark-allergy: rejection of embodied difference)'),
  seed('somatic', 6,
    'A night-dive with breath held long past comfort: the body as sensor array in a living reef. Sensation, signal, and story arrive together — and the diver must notice which is which, without surfacing.',
    ['the dive-partner (a second nervous system, synced)'],
    'Interoception becomes instrument: the body reads the system, and the system reads the body back.',
    ['nature', 'exploration'],
    'somatic/teal module-spec §1 (systemic interoception) §2 (dark-addiction: control of every signal)'),
  seed('somatic', 7,
    'A dawn on the mountain with no summit — walking as one motion among motions, rain and breath and footfall a single weather. Nothing to achieve; a participation to allow.',
    ['no one (and, somehow, everything)'],
    'The body dissolves into the field without disappearing — presence as the whole moving through a part.',
    ['nature', 'ritual'],
    'somatic/turquoise module-spec §1 (the body as planetary organ) §2 (golden-allergy: refusing the call to re-enter)'),

  // ── WILLPOWER ───────────────────────────────────────────────────────────────
  seed('willpower', 0,
    'A hunger walk: one day without food, guided, protected, witnessed. The urge to end it early arrives wearing many disguises — each one a lesson in who is in charge.',
    ['the walk-elder (has done this forty times, says almost nothing)'],
    'Will first appears as the capacity to hold a simple no while everything in the body votes yes.',
    ['ritual', 'kindred'],
    'willpower/infrared module-spec §1 (impulse toleration) §2 (dark-addiction: clinging to immediate comfort)'),
  seed('willpower', 1,
    'The bonfire dare: run into the dark woods to touch the white tree and return. Fear is a door. The bravado is cheap; the walking through is not.',
    ['the dare-master', 'the ones who did not go (and stayed kind)'],
    'Courage borrowed from an image becomes one\'s own the first time it is spent deliberately.',
    ['exploration', 'ritual'],
    'willpower/magenta module-spec §1 (ritual courage) §2 (golden-addiction: heroicized self-image)'),
  seed('willpower', 2,
    'A war-band election by spear-raise: whoever can hold the band\'s hunger for a season gets to command it. The challenger stares; the band waits; the will to be first is the job description.',
    ['the challenger', 'the band (loyal only to strength that feeds them)'],
    'Ambition disciplined into leadership — or burned through in one glorious, useless charge.',
    ['warfare', 'commerce'],
    'willpower/red module-spec §1 (impulse toward power) §2 (dark-addiction: compulsive dominance)'),
  seed('willpower', 3,
    'The guild-apprenticeship: a decade binding. Sign the indenture, master the craft, keep the rule. The temptation to slip out and back in unobserved is the real curriculum.',
    ['the guild-master (keeper of standards)', 'the fellow apprentice who cheats'],
    'Self-command as promise-keeping across time — the will that signs is tested by the will that would un-sign.',
    ['law', 'craft'],
    'willpower/amber module-spec §1 (long-obligation discipline) §2 (dark-allergy: rejection of self-direction)'),
  seed('willpower', 4,
    'A solo build: ninety days to ship the product, no boss, no net. Calendar, energy, and attention are the whole economy. Distraction arrives dressed as opportunity, hourly.',
    ['the investor on the other end of the call', 'the co-founder who left amicably'],
    'The will as chief executive of one\'s own life — the freedom is real and so is the accountability.',
    ['commerce', 'technology'],
    'willpower/orange module-spec §1 (autonomous goal pursuit) §2 (dark-addiction: will as only tool)'),
  seed('willpower', 5,
    'The coalition meeting where the plan must change: advocacy, budget, and the signature the community actually wants. Holding the line and moving the line are both on the table tonight.',
    ['the coalition partners', 'the community delegate who must be answered to'],
    'Power shared on purpose — will in service of a consent the wielder does not solely own.',
    ['kindred', 'law'],
    'willpower/green module-spec §1 (sensitive power-sharing) §2 (dark-allergy: refusal to lead even when asked)'),
  seed('willpower', 6,
    'A distributed team in drift: no crisis, no orders — and momentum dying quietly. The work is to align purposes without seizing controls, to choose the next least-action that serves the whole.',
    ['the team (each an owner of their own will)', 'the one about to resign'],
    'Will as gardener, not commander: creating conditions where a hundred wills pull together without being pulled.',
    ['craft', 'kindred'],
    'willpower/teal module-spec §1 (self-managing coordination) §2 (dark-addiction: meta-control of everything)'),
  seed('willpower', 7,
    'The vow sits in the middle of the circle: made years ago, grown strange, its purpose completed or forgotten. To release it or renew it — and the whole lattice of commitments shivers with the answer.',
    ['those bound by the vow', 'the silence after the question'],
    'Will meeting its own source: choosing with the whole of one\'s history in view, holding and letting go as one act.',
    ['ritual', 'kindred'],
    'willpower/turquoise module-spec §1 (vows from totality) §2 (golden-addiction: dissolving into the field to avoid choosing)'),

  // ── EMOTIONAL ───────────────────────────────────────────────────────────────
  seed('emotional', 0,
    'A sudden storm separates the child from the group. Warm arms or cold dark — the first emotional facts arrive unfiltered, and someone either comes or does not.',
    ['the searcher with the lantern'],
    'Feeling as signal before language: fear answered by warmth, or learned to be hidden.',
    ['kindred', 'nature'],
    'emotional/infrared module-spec §1 (comfort seeking) §2 (dark-addiction: attachment clinging)'),
  seed('emotional', 1,
    'Grief at the edge of the village: a beloved elder is gone, and the dead are accompanied by song, paint, and fire. Emotion is the guest of honor — image-laden, honest, unashamed.',
    ['the mourning-kin', 'the singer who carries the grief-line'],
    'The full animal depth of feeling met inside its image and its kin — no management, just company.',
    ['ritual', 'music'],
    'emotional/magenta module-spec §1 (felt image and kin) §2 (golden-addiction: dramatized emotional identity)'),
  seed('emotional', 2,
    'Betrayal in the band: a rival took the kill and the credit. Anger arrives like a lit fuse. The camp watches what the betrayed does with it — and the anger is watching too.',
    ['the rival', 'the friend who says nothing but stays close'],
    'Anger as power and as poison: felt fully, aimed precisely, or swallowed whole — each has a cost.',
    ['warfare', 'kindred'],
    'emotional/red module-spec §1 (raw affect) §2 (dark-addiction: compulsive emotional dominance)'),
  seed('emotional', 3,
    'The household of rules: feelings are permitted at set hours and in set rooms. A death in the family, a promotion in the guild — and the same question at both: what does one properly feel, and where?',
    ['the patriarch/matriarch', 'the aunt who breaks the rule kindly'],
    'Emotion learned as role — the dignity of containment, and the debt it stores.',
    ['law', 'kindred'],
    'emotional/amber module-spec §1 (role-appropriate affect) §2 (dark-allergy: rejection of emotional life)'),
  seed('emotional', 4,
    'The performance review, but honest: a feedback culture where emotion is data. The engineer separates feeling from finding — hurt, hypothesis, adjustment — in one seated conversation.',
    ['the manager (direct, not cruel)', 'the peer who modelled receiving feedback well'],
    'Feeling met as information in service of growth — agile, useful, and strangely lonely if that is all it is.',
    ['commerce', 'craft'],
    'emotional/orange module-spec §1 (emotional regulation toward goals) §2 (golden-addiction: optimization of feeling)'),
  seed('emotional', 5,
    'The circle of many truths: a room where each person\'s experience is voiced and received without correction. The trigger that flared all week is finally spoken — and the room does not flinch.',
    ['the facilitator (protects the circle)', 'the one whose words land hardest'],
    'Feeling as communion: every emotion welcomed at the table, the difficult ones given the longest chair.',
    ['kindred', 'medicine'],
    'emotional/green module-spec §1 (authentic emotional expression) §2 (dark-addiction: attachment to the wounded identity)'),
  seed('emotional', 6,
    'A team post-mortem where the system, not the person, is the patient: fear mapped to feedback loops, joy mapped to flow channels. The question is what the emotion is telling the whole, not what is wrong with whom.',
    ['the team-therapist-systemician', 'the colleague who caused the outage (and is held, not blamed)'],
    'Emotion read as systemic signal — the weather of the whole, visible in every local shower.',
    ['technology', 'medicine'],
    'emotional/teal module-spec §1 (emotion as system information) §2 (dark-allergy: bypassing into analysis)'),
  seed('emotional', 7,
    'A shared dream vigil: nine people, one room, one night, feelings shared before sleep and collected after. Where does my grief end and yours begin? The borders are real and also not.',
    ['the vigil-keeper', 'the one whose dream was everyone\'s'],
    'Feeling as participation in one field — experienced personally, known collectively, held as both.',
    ['ritual', 'kindred'],
    'emotional/turquoise module-spec §1 (transpersonal resonance) §2 (golden-addiction: merging to avoid personal feeling)'),

  // ── INTRAPERSONAL ───────────────────────────────────────────────────────────
  seed('intrapersonal', 0,
    'The quiet after the thunder: alone in a shelter, the child meets the first stranger — themselves. Who is watching in there? The answer is a feeling, not a name.',
    ['no cast (the first solitude)'],
    'The inner witness stirs: the self notices the self, and a lifelong conversation opens.',
    ['nature', 'ritual'],
    'intrapersonal/infrared module-spec §1 (self-soothing) §2 (dark-addiction: clinging to the familiar self-image)'),
  seed('intrapersonal', 1,
    'The medicine cave: sent into the dark with a paint-pot and a question. Whatever is on the walls when the fire dies is what the self drew when no one watched.',
    ['the cave (the true facilitator)', 'the elder waiting at the mouth'],
    'The self encountered through image and ordeal — drawn, named, and offered back to the kin for witness.',
    ['ritual', 'craft'],
    'intrapersonal/magenta module-spec §1 (self through image) §2 (golden-addiction: spirit-identity inflation)'),
  seed('intrapersonal', 2,
    'Exile by one\'s own doing: thrown out of the band for overreach, alone with the consequences and a mirror that has no mercy and no audience. Who returns to the fire — and as what?',
    ['the band at the fire (visible, unreachable)', 'the exile\'s own reflection'],
    'The self authored in defiance of its own worst moment — identity as a thing seized from consequence.',
    ['exploration', 'warfare'],
    'intrapersonal/red module-spec §1 (self through assertion) §2 (dark-addiction: the hardened ego)'),
  seed('intrapersonal', 3,
    'The confession booth of the order: nightly self-examination against the rule. The penance is real; so is the comfort of the ledger. Somewhere the rule and the soul diverge quietly.',
    ['the confessor', 'the rule-book (a character in its own right)'],
    'The self disciplined by its own ideal — genuine growth, and the shadow of never being enough by the book.',
    ['law', 'ritual'],
    'intrapersonal/amber module-spec §1 (self-examination) §2 (dark-allergy: rejection of the examining self)'),
  seed('intrapersonal', 4,
    'The one-week silence retreat with a journal and a metrics app: self as start-up, self as monastery. Both experiments run in parallel. The dashboards disagree; the journal disagrees more.',
    ['the retreat coordinator', 'the app (cheerful, relentless)'],
    'Self-knowledge as personal project — measured, curated, improved… and what does the measurer need?',
    ['technology', 'craft'],
    'intrapersonal/orange module-spec §1 (self-optimization) §2 (dark-addiction: controlling the self-image)'),
  seed('intrapersonal', 5,
    'The authenticity dare within a tight circle: say the unsaid thing to the person it concerns, with the group holding. The mask is not torn off — it is offered, and the face under it is uncertain.',
    ['the circle', 'the person the unsaid thing concerns'],
    'The self met in honest relating — vulnerability as the price and the gift of real belonging.',
    ['kindred', 'medicine'],
    'intrapersonal/green module-spec §1 (authentic self-in-community) §2 (dark-allergy: rejecting the growing self)'),
  seed('intrapersonal', 6,
    'The parts-mapping session: an inner council where ambition, fear, care, and cynicism each take the chair, disagree on the record, and must draft a joint statement. The self as ecology, not kingdom.',
    ['the facilitator of inner work', 'the four parts (each fully voiced)'],
    'Self as multiplicity in dialogue — no part is the boss, and the integration is authored, not imposed.',
    ['craft', 'ritual'],
    'intrapersonal/teal module-spec §1 (self-as-system) §2 (dark-addiction: managing all parts all the time)'),
  seed('intrapersonal', 7,
    'The question with no handle: who was watching before the self assembled, and what remains when identification loosens? Not answered — sat with, in the company of others holding the same question.',
    ['the sitting-circle', 'the question itself'],
    'The self as wave in an ocean it has begun to recognize — identity transparent without being erased.',
    ['ritual', 'nature'],
    'intrapersonal/turquoise module-spec §1 (witnessing awareness) §2 (golden-addiction: bypass into the infinite to avoid personal work)'),

  // ── COGNITIVE ───────────────────────────────────────────────────────────────
  seed('cognitive', 0,
    'Finding the way home in failing light: landmarks, star-motions, the feel of the slope. No map exists. The mind holds two facts — the rock shaped like a skull, the river\'s sound — and builds a path.',
    ['the path (and its one false twin)'],
    'Cognition as survival sense: few facts, held steadily, become a way home.',
    ['nature', 'exploration'],
    'cognitive/infrared module-spec §1 (concrete tracking) §2 (dark-addiction: the fixed mental groove)'),
  seed('cognitive', 1,
    'The shaman\'s riddle-game by the fire: two shells, one bead, and a story that moves the bead when no one watches. The child\'s mind must hold image and place together — the bead is where the story last left it.',
    ['the shaman (delighted by cleverness)', 'the children who wager their best stones'],
    'Thinking as image-tracking: the world is full of hidden movements, and a mind that watches them well eats well.',
    ['ritual', 'craft'],
    'cognitive/magenta module-spec §1 (image-logic tracking) §2 (dark-addiction: magical certainty without checking)'),
  seed('cognitive', 2,
    'The raid-planning circle: sandy table, carved markers, two moves ahead. Every plan is a bet; every bet is the band\'s food. Think fast, concretely, and like you mean it.',
    ['the war-chief', 'the scout with the bad news'],
    'The mind as weapon — short-horizon, concrete, power-serving. Sharp when aimed; dangerous when it aims at allies.',
    ['warfare', 'craft'],
    'cognitive/red module-spec §1 (egocentric strategic cognition) §2 (dark-addiction: the compulsive strategist)'),
  seed('cognitive', 3,
    'The case before the guild court: two testimonies, one rule, no exceptions clause. The reasoning must be orderly enough to satisfy the record and honest enough to satisfy the grief in the room.',
    ['the magistrate', 'the scribe (the record is watching)'],
    'Thought as lawful structure — categories, precedents, consistency. The strength of the ladder, and its ceiling.',
    ['law', 'craft'],
    'cognitive/amber module-spec §1 (formal-rule reasoning) §2 (dark-addiction: the closed rule-system)'),
  seed('cognitive', 4,
    'The pivot review: three quarters of data say the product is wrong for the market. Hypotheses, metrics, falsification, and a founder\'s sunk cost all in one room. The spreadsheet does not care who is hurt.',
    ['the data lead', 'the founder whose thesis is dying'],
    'The mind as hypothesis engine — abstract, self-correcting, ruthless. Its bias: everything measured is real, everything unmeasured is not.',
    ['technology', 'commerce'],
    'cognitive/orange module-spec §1 (hypothetico-deductive reasoning) §2 (dark-addiction: reduction to the measurable)'),
  seed('cognitive', 5,
    'The community redesign workshop: traffic, housing, and the elders\' garden all pull the same square. Every analysis is checked against lived testimony — and the data that contradicts the most affected voices must sit with the model, not over it.',
    ['the workshop facilitator', 'the elders from the garden', 'the transport planner with the numbers'],
    'Thinking that listens: abstraction and empathy as one analytic — the model serves the testimonies, not the reverse.',
    ['kindred', 'architecture'],
    'cognitive/green module-spec §1 (contextual, pluralistic reasoning) §2 (dark-addiction: consensus as substitute for analysis)'),
  seed('cognitive', 6,
    'The ecosystem negotiation: logging town, river co-op, and the species corridor, one whiteboard, all interests live. The mind holds the whole graph — including the parts that push back on the holding.',
    ['the facilitator-mapper', 'the three stakeholder nodes'],
    'Cognition as systemic: feedback, emergence, and the honest fact that the map is part of the territory.',
    ['nature', 'law'],
    'cognitive/teal module-spec §1 (system thinking) §2 (dark-addiction: meta-framework hoarding)'),
  seed('cognitive', 7,
    'The dream-code session: a design problem set aside unsolved, answered overnight from somewhere, and the disciplined check of whether the answer is true. Knowing that is not only knowing how — and still checking.',
    ['the colleague who dreams in diagrams', 'the verification protocol'],
    'Thought rejoined to its source — intuitive wholes verified by waking rigor, neither dismissed.',
    ['craft', 'ritual'],
    'cognitive/turquoise module-spec §1 (integrative cognition) §2 (golden-addiction: trusting the field without verification)'),

  // ── MORAL ───────────────────────────────────────────────────────────────────
  seed('moral', 0,
    'The shared bowl at the fire\'s edge: another hand reaches in hungry, and the one holding it has just enough. The first ethical fact — mine, yours, ours — happens before any word for it exists.',
    ['the hungry one', 'the bowl (and its roundness)'],
    'Goodness as the given of care: shared without theory, or withheld and forever after noticed.',
    ['kindred', 'craft'],
    'moral/infrared module-spec §1 (proto-care) §2 (dark-addiction: clinging to what is mine)'),
  seed('moral', 1,
    'The taboo on the red pool: the water heals, and the place is the ancestor\'s. To drink is to live; to drink is to trespass. The kin\'s eyes are the real tribunal.',
    ['the ancestor (present in the pool)', 'the sick one who needs it'],
    'Right and wrong felt as sacred boundary — absolute, belonging to the place and the dead, owned by no argument.',
    ['ritual', 'nature'],
    'moral/magenta module-spec §1 (taboo and the sacred) §2 (dark-addiction: purity clinging)'),
  seed('moral', 2,
    'The taken trophy and the beaten rival: the strongest took what was not given, and the band calls it right because the strong made it so. The beaten one\'s brother watches, and remembers. What is "right" when power defines it — and what happens when the account comes due?',
    ['the strong one (untroubled, for now)', 'the brother who remembers'],
    'Justice as the strong\'s prerogative — its coherence is real, and so is the first debt it books against itself.',
    ['warfare', 'law'],
    'moral/red module-spec §1 (power-defined right) §2 (dark-addiction: might-makes-right loyalty)'),
  seed('moral', 3,
    'The verdict that must be written: the thief stole to feed children; the merchant lost the winter\'s stock; the rule says restitution. Justice as a machine of record — and the scribe\'s hand hesitates.',
    ['the magistrate (bound by the code)', 'the child of the thief in the gallery'],
    'Duty as the spine of right: the dignity of a law kept, and the first crack where law and justice diverge.',
    ['law', 'commerce'],
    'moral/amber module-spec §1 (rule-based justice) §2 (dark-addiction: the letter that devours)'),
  seed('moral', 4,
    'The trolley-problem of the startup: ship the safety patch late and lose the contract, or ship now and let the risk ride. Utilitarian math, stakeholder futures, and a founder\'s signature on both.',
    ['the board', 'the safety engineer who resigned over this once'],
    'Consequentialist reasoning with real stakes — the greatest good calculated honestly, and what the calculation cannot hold.',
    ['commerce', 'technology'],
    'moral/orange module-spec §1 (consequentialist calculus) §2 (dark-addiction: optimization as the only ethic)'),
  seed('moral', 5,
    'The inclusion crisis: the beloved founder\'s language excludes half the community now. Loyalty, harm, and history in one conversation where the goal is no one\'s defeat.',
    ['the founder (beloved and in the wrong)', 'the members who were hurt and stayed'],
    'Care as moral instrument: the standpoint of the affected centered, process honored over quick verdicts.',
    ['kindred', 'medicine'],
    'moral/green module-spec §1 (care-based pluralism) §2 (dark-addiction: the helper\'s self-image)'),
  seed('moral', 6,
    'The supply-web audit: no single villain, one harmful system. Moral attention as graph traversal — following the harm through contractors and complicity to the leverage point where intervention actually lands.',
    ['the auditor (systemic conscience)', 'the node that can actually change the graph'],
    'Ethics as system intervention: blame dissolves into structure, and responsibility scales to the map.',
    ['commerce', 'craft'],
    'moral/teal module-spec §1 (systemic responsibility) §2 (dark-allergy: cynicism about any action in the graph)'),
  seed('moral', 7,
    'The edge-case that breaks every framework: the choice serves the whole and wounds the one, and every ethical lens in the room agrees on the analysis and disagrees on the act. The decision is made in the dark — together.',
    ['the council of lenses', 'the one who bears the wound'],
    'Morality beyond frameworks — held, felt, and chosen as participation in a wholeness that includes the cost.',
    ['ritual', 'kindred'],
    'moral/turquoise module-spec §1 (integral ethics) §2 (golden-addiction: appeals to wholeness that dodge the choice)'),

  // ── INTERPERSONAL ───────────────────────────────────────────────────────────
  seed('interpersonal', 0,
    'The stranger at the fire: a new face circles the warmth, deciding. One shared task — carrying wood, feeding the fire — either opens the circle or does not.',
    ['the fire-group', 'the stranger'],
    'Belonging\'s first mechanics: proximity, small cooperation, and the reading of who is safe.',
    ['kindred', 'nature'],
    'interpersonal/infrared module-spec §1 (proximal bonding) §2 (dark-addiction: clinging to the known few)'),
  seed('interpersonal', 1,
    'The blood-bond rite: two kin cut palms and clasp. The bond is now a fact of the world, older than choice. The other half of the rite — what the bond demands later, at cost — is not yet visible.',
    ['the bond-kin (sworn)', 'the elder who binds'],
    'Relationship as sacred given: loyalty absolute, identity entangled, the shadow of the bond not yet paid.',
    ['ritual', 'kindred'],
    'interpersonal/magenta module-spec §1 (kin-bonding) §2 (dark-addiction: fusion with the kin-image)'),
  seed('interpersonal', 2,
    'The respect market: status in the band is taken, given, defended. A rivalry over who leads the hunt is really over who matters. Every negotiation happens twice — once in words, once in posture.',
    ['the rival', 'the band (the audience that decides)'],
    'Relationships as contests of standing — dominance read correctly is alliance; read wrongly, war.',
    ['warfare', 'commerce'],
    'interpersonal/red module-spec §1 (power-dynamic relationships) §2 (dark-addiction: respect as possession)'),
  seed('interpersonal', 4,
    'The contract with the exit clause: two professionals, one joint venture, everything specified in writing — including how to leave. The partnership works beautifully until one of them has a bad quarter and the clause starts looking like a lifeboat. Trust, it turns out, is also an asset class.',
    ['the partner (precise, decent, calculating)', 'the lawyer who drafted the clause'],
    'Relationships as negotiated exchange — clean incentives, real mutual gain, and the question of what neither party ever put in the contract.',
    ['commerce', 'law'],
    'interpersonal/orange module-spec §1 (transactional-strategic relationships) §2 (dark-addiction: scorekeeping the exchange)'),
  seed('interpersonal', 2 + 1, // amber
    'The marriage of the houses: two guild-families, one contract, one feast. Duty defines every bond — parent, spouse, patron — and the hearts in the arrangement have opinions the contract did not consult.',
    ['the two house-heads', 'the young pair being arranged'],
    'Relationship as role and obligation — stable, legible, dignified, and full of unspoken personal cost.',
    ['law', 'kindred'],
    'interpersonal/amber module-spec §1 (role-bound relationships) §2 (dark-allergy: rejecting anyone outside the roles)'),
  seed('interpersonal', 4 + 1, // green
    'The mediation circle: two members, one rupture, a facilitator, and the rule that everyone\'s needs get named. No one is expelled; the conflict is the curriculum.',
    ['the two in rupture', 'the facilitator'],
    'Relationship as mutual meeting — needs voiced, boundaries honored, the bond rebuilt stronger than harmony ever was.',
    ['kindred', 'medicine'],
    'interpersonal/green module-spec §1 (authentic-dialogue relationships) §2 (dark-addiction: need for approval as currency)'),
  seed('interpersonal', 5 + 1, // teal
    'The org-network redesign: reporting lines dissolve into constellations of collaboration. Relationship as living system — roles rotate by capacity, feedback is ambient, and the lonely star must be noticed before it burns out.',
    ['the constellation (the team itself)', 'the burning-out star'],
    'Relating at scale without roles as armour — every bond personally authored, held in a system that keeps breathing.',
    ['craft', 'technology'],
    'interpersonal/teal module-spec §1 (whole-system relating) §2 (dark-addiction: managing every relationship in the web)'),
  seed('interpersonal', 6 + 1, // turquoise
    'The global council-table: delegates of every lineage, one shared crisis, no shared myth. The work is to feel the field of the table itself — and to speak from it, not merely at it.',
    ['the delegates (many worlds, one table)', 'the field between them'],
    'Communion as the operative fact beneath every difference — relationship as the world talking to itself.',
    ['kindred', 'ritual'],
    'interpersonal/turquoise module-spec §1 (planetary communion) §2 (golden-addiction: dissolving difference into false unity)'),

  // ── SPIRITUAL ───────────────────────────────────────────────────────────────
  seed('spiritual', 0,
    'The first awe: a night sky too large, held by a hand too small. No doctrine, no words — the universe simply arrives, and the nervous system opens or closes.',
    ['the sky (the first temple)'],
    'Spirit as raw encounter: vastness met before it can be named, and the body\'s yes or no to it.',
    ['nature', 'ritual'],
    'spiritual/infrared module-spec §1 (sensory awe) §2 (dark-addiction: clinging to the comfort of smallness)'),
  seed('spiritual', 1,
    'The ancestor dance: masks of the honored dead, firelight, the drum until the drum plays itself. The veil between living and dead is thin by design, and the tribe dances in both worlds at once.',
    ['the masked ancestors (the dancers wearing them)', 'the drum'],
    'Spirit as image and participation — the unseen world entered with the whole body, kin to the bone.',
    ['ritual', 'music'],
    'spiritual/magenta module-spec §1 (animistic participation) §2 (dark-addiction: dependence on the magic helper)'),
  seed('spiritual', 2,
    'The war-god\'s altar: victory belongs to the strong, and the offering is made accordingly. Power is religious here — sacred, brutal, and honestly so. The question the altar asks: what do you actually worship?',
    ['the altar-keeper', 'the young one whose armor still does not fit'],
    'Spirit claimed by the ego for its own ascent — the strength and the horror of a god made in one\'s image.',
    ['warfare', 'ritual'],
    'spiritual/red module-spec §1 (power-spirituality) §2 (dark-addiction: identification with the god-image)'),
  seed('spiritual', 3,
    'The order\'s liturgical hour: the same words, the same gestures, centuries of the same. Meaning arrives through exactness — and one phrase tonight suddenly means itself again, alive inside the repetition.',
    ['the liturgist', 'the young monk/warrior hearing it fresh'],
    'Spirit as lawful devotion: tradition as a vessel that holds — until it is mistaken for the water.',
    ['ritual', 'law'],
    'spiritual/amber module-spec §1 (mythic-membership faith) §2 (dark-allergy: rejecting other paths as godless)'),
  seed('spiritual', 4,
    'The marketplace of practices: meditation apps, retreat centers, biohacked flow states. The seeker as consumer with a practice portfolio — genuine openings, purchased experiences, and a quiet question about who is doing the seeking.',
    ['the practice-seller', 'the friend who asks what it is all for'],
    'Spirit as personal project and private gain — real doors opened, and the seeker growing heavier with each key.',
    ['commerce', 'technology'],
    'spiritual/orange module-spec §1 (individuated practice) §2 (golden-addiction: spiritual bypass via achievement)'),
  seed('spiritual', 5,
    'The interfaith shelter: one roof, five prayers, one shared act of feeding strangers. The traditions argue upstairs; downstairs, the pot of soup is unmistakably holy.',
    ['the five prayer-leaders', 'the volunteers who never argue'],
    'Spirit as compassion in action — plurality honored, the shared heart of practice met in service.',
    ['medicine', 'kindred'],
    'spiritual/green module-spec §1 (compassionate pluralism) §2 (dark-addiction: attachment to being the caring one)'),
  seed('spiritual', 6,
    'The contemplative-systems dialogue: monks and ecologists, one question — what does the forest want? Practice and science meet as two languages for one living whole, and both are changed by the translation.',
    ['the monk-scientist pair', 'the forest (the silent third party)'],
    'Spirit as the interior of systems — contemplation and ecology as one literacy, each correcting the other.',
    ['nature', 'craft'],
    'spiritual/teal module-spec §1 (nature-mysticism with rigor) §2 (dark-addiction: owning the integral map)'),
  seed('spiritual', 7,
    'The ordinary afternoon with nothing missing: tea, a friend, traffic noise, the whole field of it. Not a peak state — a level one. Spirit not as elsewhere, but as the is-ness that was never absent.',
    ['the friend (also the whole field)', 'the tea'],
    'Spirit as the ground of the ordinary — participation without acquisition, presence without a prize.',
    ['ritual', 'nature'],
    'spiritual/turquoise module-spec §1 (everyday nonduality) §2 (golden-addiction: peak-state chasing disguised as presence)'),
];

/** Stages without a seed row above are compile errors, not silent gaps. */
export function assertSeedCoverage(): void {
  const have = new Set(SCENARIO_SEEDS.map((s) => `${s.line}:${s.stage}`));
  const missing: string[] = [];
  for (const line of Object.values(LINE_NAMES)) {
    for (const stage of ALL_STAGES) {
      if (!have.has(`${line}:${stage}`)) missing.push(`${line}:${stage}`);
    }
  }
  if (missing.length > 0) {
    throw new Error(`scenario seeds: missing cells [${missing.join(', ')}] — 64/64 coverage is a compile-time invariant`);
  }
}

assertSeedCoverage();

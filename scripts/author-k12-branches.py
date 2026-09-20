#!/usr/bin/env python3
"""
Author the 6 planned K-12 curriculum branches (doc 37, plan §8 item 4):
language-arts, arts, music, second-language, civics, health.

Each branch follows the executable-data pattern of bio/chem/hist/geo:
branch holon + 4-6 concept holons, five phases each, full depth rubric,
devMapping from subject-line-map.json (37 §3.1), no grade-band vocabulary
(42 blindness law). Lint-clean by construction (P-1..P-2 content richness,
S-1..S-5 structural closure, D-1..D-4 developmental alignment).

Output: src/core/curriculum/data/{branch}.foundations.json
"""
# @script-status: one-shot — authored the six K-12 branch foundation files (doc 37 §8 item 4) and
#                            was run once to produce them. It writes the data files wholesale, so it
#                            is safe only from the pre-authoring state; re-running overwrites any
#                            hand-tuned branch content. Never schedule it.

import json
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "core", "curriculum", "data")

DEPTHS = ["memorized", "comprehended", "applied", "analyzed", "evaluated", "transformed"]

# devMapping per branch, from subject-line-map.json
BRANCHES = [
    {
        "branch": "language-arts",
        "name": "Language Arts Foundations",
        "subject": "literacy-l1",
        "description": "Reading, writing, and meaning-making: from decoding to interpretation, and from sentence craft to sustained written argument. Decoding is cognitive; meaning-making crosses into the emotional line.",
        "primary": "Cognitive",
        "secondary": ["Emotional"],
        "modalities": ["LanguageReflective", "ImmersiveRPG"],
        "concepts": [
            {
                "id": "language-arts.phonology",
                "name": "Phonology and Decoding",
                "description": "The sound-to-symbol system: phonemes, graphemes, and the decoding strategies that turn marks on a page into language.",
                "prereqs": [],
                "question": "How do marks on a page become sounds in a mind?",
                "explanation": "Written English encodes a stream of speech sounds (phonemes) with letter patterns (graphemes). Decoding is the bidirectional skill of mapping one to the other: sounding out unfamiliar words, and recognizing common patterns whole. Fluency frees attention for meaning — a reader who must labor over every word has none left for the sentence.",
                "examples": ["Sounding out 'th-i-nk' into three phonemes then blending", "Recognizing '-tion' as one pattern with one sound"],
                "nonExamples": ["Guessing a word from its first letter alone", "Treating silent letters as decoding failures rather than patterns"],
            },
            {
                "id": "language-arts.vocabulary",
                "name": "Vocabulary and Word Meaning",
                "description": "How word meanings are learned, stored, and retrieved: morphology, context, and the networks that link words to each other.",
                "prereqs": ["language-arts.phonology"],
                "question": "Where does the meaning of a word live?",
                "explanation": "Word knowledge is a network, not a dictionary. Meanings grow through morphology (roots, prefixes, suffixes), through context that sharpens a fuzzy sense into precision, and through connections to known words. Depth beats breadth: a learner who can use a word in three registers owns it; one who can define it does not.",
                "examples": ["Using 'port' (carry) to unlock transport, export, portable", "Distinguishing 'slim', 'slender', and 'scrawny' by connotation"],
                "nonExamples": ["Memorizing definitions without use", "Assuming a word means the same in every discipline"],
            },
            {
                "id": "language-arts.comprehension",
                "name": "Reading Comprehension",
                "description": "Constructing meaning from texts: literal understanding, inference, and the background knowledge that makes both possible.",
                "prereqs": ["language-arts.vocabulary"],
                "question": "What does it take to understand what is not written on the page?",
                "explanation": "Comprehension is active construction. Readers build a situation model by combining literal text with inferences and prior knowledge. Inference is where most meaning lives: motivations, causes, and implications are rarely stated. Teaching comprehension means teaching readers to notice what the text implies and to check their model against it.",
                "examples": ["Inferring a character's motive from actions, not statements", "Linking a paragraph's claim to the thesis two pages back"],
                "nonExamples": ["Summarizing without interpreting", "Treating confusion as the text's fault rather than a signal to re-read"],
            },
            {
                "id": "language-arts.composition",
                "name": "Writing and Composition",
                "description": "Producing text: sentence craft, paragraph structure, audience awareness, and revision as rethinking rather than correcting.",
                "prereqs": ["language-arts.comprehension"],
                "question": "How does a thought become a text someone else can enter?",
                "explanation": "Writing is design under constraint: an idea must survive translation into sentences that carry it to a reader who cannot ask questions. Craft means controlling sentence rhythm, choosing structure that serves the argument, and holding an audience in mind. Revision is the heart of the act — not tidying, but discovering what the writer actually thinks.",
                "examples": ["Restructuring a paragraph so its claim comes first", "Cutting a beloved sentence that does no work"],
                "nonExamples": ["Padding to a length requirement", "Believing a first draft is the honest one"],
            },
            {
                "id": "language-arts.interpretation",
                "name": "Literary Interpretation",
                "description": "Reading as meaning-making: theme, voice, and the interpretive claim defended with textual evidence.",
                "prereqs": ["language-arts.comprehension", "language-arts.composition"],
                "question": "When readers disagree about a story, what settles it?",
                "explanation": "Interpretation turns reading into argument. A theme is not a topic ('war') but a claim about it ('war corrupts language'). Interpretive claims are settled by evidence: passages that support the reading better than alternatives. This is the bridge from literacy to literature — the emotional line enters as readers feel what a text does before they can say it.",
                "examples": ["Arguing a poem's imagery carries grief, not nostalgia, from specific word choices", "Defending a reading against a rival by citing structure"],
                "nonExamples": ["Restating plot as analysis", "Claims no evidence could shake"],
            },
        ],
    },
    {
        "branch": "arts",
        "name": "Visual Arts Foundations",
        "subject": "arts-music",
        "description": "Making and reading visual work: elements and principles of design, media and technique, and critique as a disciplined conversation about what work does.",
        "primary": "Emotional",
        "secondary": ["Somatic", "Spiritual"],
        "modalities": ["ImmersiveRPG", "Embodied"],
        "concepts": [
            {
                "id": "arts.elements",
                "name": "Elements of Visual Design",
                "description": "Line, shape, color, value, texture, and space — the raw vocabulary every visual work is built from.",
                "prereqs": [],
                "question": "What is a painting made of, before it is a painting?",
                "explanation": "Every visual work decomposes into elements: line directs the eye, shape organizes, color carries mood and temperature, value models light, texture invites touch, space sets relationships. Skill with elements is skill in controlling what a viewer feels first and understands later — the emotional line works through the hand and eye before the word.",
                "examples": ["Diagonal lines producing urgency in a poster", "Warm palette pulling a subject forward"],
                "nonExamples": ["Calling any use of blue 'sad' without composition analysis", "Listing elements without describing their effect"],
            },
            {
                "id": "arts.principles",
                "name": "Principles of Composition",
                "description": "Balance, contrast, emphasis, rhythm, and unity — the principles that arrange elements into works that hold together.",
                "prereqs": ["arts.elements"],
                "question": "Why does one arrangement hold the eye and another let it go?",
                "explanation": "Principles are the verbs to the elements' nouns. Contrast creates emphasis; repetition at intervals creates rhythm; balanced tension creates unity without monotony. Composition is decision-making about attention: what the viewer sees first, second, and what they return to.",
                "examples": ["Isolating one bright figure in a muted field for emphasis", "Symmetry communicating stability in an architectural drawing"],
                "nonExamples": ["Filling space evenly to avoid decisions", "Copying a composition without reading its attention flow"],
            },
            {
                "id": "arts.media",
                "name": "Media and Technique",
                "description": "The material intelligence of art-making: drawing, paint, clay, digital tools — each with its own affordances and constraints.",
                "prereqs": ["arts.elements"],
                "question": "What does the material want to do?",
                "explanation": "Media are not neutral containers. Watercolor resists opacity; clay insists on mass; vector tools insist on geometry. Technique is a conversation with these affordances — mastery means knowing what a medium does easily, what it resists, and designing within that grain. The somatic line enters here: hands learn materials the way they learn tools.",
                "examples": ["Letting watercolor bloom instead of fighting it with control", "Choosing charcoal for its smudge-ability when the subject is smoke"],
                "nonExamples": ["Using a medium to imitate another's look at double the effort", "Blaming the tool for choices the hand made"],
            },
            {
                "id": "arts.critique",
                "name": "Critique and Interpretation",
                "description": "Talking and writing about work: description, analysis, interpretation, judgment — and receiving critique without defensiveness.",
                "prereqs": ["arts.principles", "arts.media"],
                "question": "How do you say what a work does — and hear what others say yours does?",
                "explanation": "Critique is a discipline, not an opinion contest. It moves from description (what is literally there) to analysis (how the principles operate) to interpretation (what the work means) to judgment (does it succeed, by what standard). Giving it honestly and receiving it without collapse is its own developmental practice — the golden shadow of the artist lives here.",
                "examples": ["Separating 'I dislike it' from 'the focal point is unclear'", "Revising after critique because the critique was right"],
                "nonExamples": ["Critique that only praises", "Defense that never asks a question"],
            },
        ],
    },
    {
        "branch": "music",
        "name": "Music Foundations",
        "subject": "arts-music",
        "description": "Sound organized in time: rhythm, pitch, notation, ensemble practice, and the listening vocabulary that turns hearing into perception.",
        "primary": "Emotional",
        "secondary": ["Somatic", "Spiritual"],
        "modalities": ["Embodied", "ImmersiveRPG"],
        "concepts": [
            {
                "id": "music.rhythm",
                "name": "Rhythm and Pulse",
                "description": "Beat, meter, subdivision, and syncopation — the body-level grid that music moves against.",
                "prereqs": [],
                "question": "Why does the body find the beat before the mind finds the notes?",
                "explanation": "Rhythm is perceived in the body first: pulse predicts, meter groups, subdivision divides, syncopation delights by displacement. Steady pulse is a motor skill before it is a concept — the somatic line carries it. Reading rhythm notation is learning to see what the body already feels.",
                "examples": ["Clapping a 4/4 pulse while speaking a rhythm over it", "Hearing the backbeat shift in a familiar song"],
                "nonExamples": ["Counting aloud without an internal pulse", "Treating notation as the rhythm rather than its map"],
            },
            {
                "id": "music.pitch",
                "name": "Pitch and Melody",
                "description": "Intervals, scales, and melodic shape — how height and distance in pitch become tunes worth remembering.",
                "prereqs": ["music.rhythm"],
                "question": "What makes a melody a melody and not just a row of notes?",
                "explanation": "Pitch relations come in families: intervals, ordered into scales that set a tonal gravity. Melody exploits that gravity — steps feel at home, leaps feel like journeys, resolution feels like arrival. Shape matters as much as content: contour is what listeners carry away.",
                "examples": ["Singing a scale's gravity by resolving 7→1", "Hearing a melody's contour in a new key as 'the same tune'"],
                "nonExamples": ["Naming intervals without hearing them", "Melodies that wander because every note was chosen alone"],
            },
            {
                "id": "music.notation",
                "name": "Notation and Score Reading",
                "description": "The written map of sound: staff, clefs, note values, dynamics, and how a score encodes a performance.",
                "prereqs": ["music.pitch", "music.rhythm"],
                "question": "How much of a performance lives on the page?",
                "explanation": "Notation encodes pitch by height, time by shape, expression by markings — always lossily. Reading a score is reconstruction: decoding symbols back into imagined sound. The reader who audiates hears the page; the one who merely decodes names it.",
                "examples": ["Hearing a melody from its notation before playing it", "Marking breaths a score does not write"],
                "nonExamples": ["Reading note-by-note without phrase shape", "Believing dynamics markings exhaust expression"],
            },
            {
                "id": "music.ensemble",
                "name": "Ensemble and Listening",
                "description": "Making music with others: balance, blend, cueing, and the double listening to ensemble and self.",
                "prereqs": ["music.notation"],
                "question": "What must you hear to play with others?",
                "explanation": "Ensemble playing splits attention: listen outward to the group's balance and inward to your own line, and keep both alive. Blend means adjusting timbre and volume to the whole; cueing means carrying intention visibly. It is the interpersonal line practiced through sound — a chamber group is a conversation with rules.",
                "examples": ["Dropping volume to let a solo line through", "Catching a conductor's cue peripherally"],
                "nonExamples": ["Playing accurately but only at yourself", "Loud sections drowning the line that carries the tune"],
            },
        ],
    },
    {
        "branch": "second-language",
        "name": "Second Language Foundations",
        "subject": "second-language",
        "description": "Acquiring another language: comprehensible input, spaced retrieval, and the willingness to communicate badly on the way to communicating well.",
        "primary": "Cognitive",
        "secondary": ["Interpersonal"],
        "modalities": ["LanguageReflective", "SocialCooperative"],
        "concepts": [
            {
                "id": "second-language.input",
                "name": "Comprehensible Input",
                "description": "How acquisition actually happens: understanding messages slightly above one's current level, in quantity.",
                "prereqs": [],
                "question": "Why do you acquire the language you understand, not the language you study?",
                "explanation": "Acquisition is driven by comprehensible input: messages understood at level i+1. Grammar and vocabulary are acquired from context encounter after encounter, not absorbed from rule tables. Volume matters more than intensity — an hour of easy reading beats ten minutes of dense text, because acquisition is frequency-sensitive.",
                "examples": ["Reading graded readers a level below frustration", "Watching familiar stories in the target language"],
                "nonExamples": ["Grinding verb tables before understanding a sentence", "Choosing materials at frustration level for 'rigor'"],
            },
            {
                "id": "second-language.lexicon",
                "name": "Lexicon and Retrieval",
                "description": "Building a usable vocabulary: spaced retrieval, context guessing, and the difference between recognition and production.",
                "prereqs": ["second-language.input"],
                "question": "Why do words you 'know' vanish exactly when you need them?",
                "explanation": "Vocabulary is two systems: recognition (fast, large) and production (slow, expensive). Spaced retrieval strengthens both by forcing effortful recall just before forgetting; context guessing builds the network that gives words their range. A productive vocabulary of 1,500 words beats a recognized one of 5,000 for actual conversation.",
                "examples": ["Retrieving 'bread' from a picture, not from a first-language prompt", "Guessing 'library' from context and checking later"],
                "nonExamples": ["Re-reading lists as review", "Translating every word back to the first language"],
            },
            {
                "id": "second-language.interaction",
                "name": "Interaction and Negotiation",
                "description": "Communicating with real people: repair strategies, circumlocution, and tolerating the incompetence phase.",
                "prereqs": ["second-language.lexicon"],
                "question": "How do you converse at a level where you cannot say what you mean?",
                "explanation": "Interaction is the interpersonal crucible of acquisition. Repair ('sorry — do you mean...?'), circumlocution ('the thing for opening cans'), and gesture carry meaning before grammar does. The developmental work is emotional: tolerating looking foolish, which is the exact price of becoming competent. Willingness to communicate predicts progress better than aptitude.",
                "examples": ["Describing 'kettle' as 'the water-boiling thing' mid-conversation", "Asking a partner to slow down without shame"],
                "nonExamples": ["Going silent to avoid errors", "Rehearsing monologues instead of negotiating meaning"],
            },
            {
                "id": "second-language.structure",
                "name": "Grammar as Pattern",
                "description": "The target language's structures, learned as patterns noticed in input and refined in output — not as rules memorized in the abstract.",
                "prereqs": ["second-language.interaction"],
                "question": "When does explicit grammar help, and when does it just slow speech?",
                "explanation": "Grammar instruction works when it makes patterns noticeable in input the learner already understands, and when output pushes against the boundary of what they can say. Rules that arrive before the pattern has been met are dead weight; rules that name a felt pattern are handles. Accuracy grows from feedback on meaningful output, not from rule recital.",
                "examples": ["Noticing past-tense endings after a focused lesson, in stories you were already reading", "Self-correcting word order after a partner's puzzled look"],
                "nonExamples": ["Conjugating for a test you cannot use in chat", "Explaining subjunctive to someone who has never heard one"],
            },
        ],
    },
    {
        "branch": "civics",
        "name": "Civics and Ethics Foundations",
        "subject": "civics-ethics",
        "description": "Living together under rules: how governments work, how collective decisions get made and justified, and how to reason about what should be done.",
        "primary": "Moral",
        "secondary": ["Interpersonal"],
        "modalities": ["ScenarioChoice", "SocialCooperative"],
        "concepts": [
            {
                "id": "civics.institutions",
                "name": "How Institutions Work",
                "description": "The machinery of self-governance: constitutions, legislatures, courts, elections, and the separation of powers as a design problem.",
                "prereqs": [],
                "question": "Why do societies split power instead of trusting the wise?",
                "explanation": "Institutions are solutions to the problem of power: constitutions constrain, legislatures deliberate, courts interpret, elections legitimize. Separation of powers is a design insight — ambition counteracting ambition — not a ritual. Understanding the machinery means seeing each rule as an answer to a failure mode.",
                "examples": ["Tracing a bill from committee to law", "Explaining judicial review as a response to majority overreach"],
                "nonExamples": ["Memorizing officeholders as civics", "Treating procedures as empty rituals"],
            },
            {
                "id": "civics.deliberation",
                "name": "Deliberation and Disagreement",
                "description": "Making decisions with people who disagree: argument, evidence, compromise, and the difference between winning and deciding well.",
                "prereqs": ["civics.institutions"],
                "question": "How do you decide with someone who thinks you are wrong?",
                "explanation": "Deliberation is decision-making under permanent disagreement. It requires separating persons from positions, offering reasons the other side could accept, and treating compromise as engineering rather than surrender. The moral line does its daily work here: it is easy to be right alone.",
                "examples": ["Restating an opponent's argument until they accept the restatement", "Finding the third option both sides prefer to the coin flip"],
                "nonExamples": ["Debate as performance for one's own side", "Compromise that abandons principle for quiet"],
            },
            {
                "id": "civics.rights",
                "name": "Rights and Obligations",
                "description": "What individuals owe each other and the collective: rights as claims, obligations as their cost, and conflicts between the two.",
                "prereqs": ["civics.deliberation"],
                "question": "Where does my right end and your claim begin?",
                "explanation": "Rights are enforceable claims that protect what a society holds essential; obligations are what those claims cost everyone else. Hard cases are conflicts — speech against safety, property against need — where rights must be weighed, not recited. Reasoning about them is the skill; certainty about outcomes is not.",
                "examples": ["Weighing a protest's disruption against its expressive core", "Explaining why due process protects the unpopular"],
                "nonExamples": ["Rights as absolutes until inconvenient", "Obligations owed only to those who agree with us"],
            },
            {
                "id": "civics.participation",
                "name": "Participation and Its Cost",
                "description": "Citizenship as practice: voting, organizing, service, and the honest accounting of what participation costs and changes.",
                "prereqs": ["civics.rights"],
                "question": "What does citizenship actually ask of a person?",
                "explanation": "Participation ranges from voting to organizing to service, and each form has a real cost in time, attention, and conflict. Honest civics teaches the cost side too: participation often changes the participant more than the outcome, which is exactly why it is the developmental practice — the moral line strengthens by carrying weight, not by holding opinions.",
                "examples": ["Organizing a petition and counting the hours it took", "Attending a council meeting where 'your' issue loses"],
                "nonExamples": ["Cynicism as sophistication", "Participation only when victory is certain"],
            },
        ],
    },
    {
        "branch": "health",
        "name": "Health and Physical Foundations",
        "subject": "health-pe",
        "description": "The body as lived: movement capacity, physiological literacy, nutrition, sleep, and mental health — knowledge that makes the body readable and keepable.",
        "primary": "Somatic",
        "secondary": ["Willpower"],
        "modalities": ["Embodied"],
        "concepts": [
            {
                "id": "health.movement",
                "name": "Movement Capacity",
                "description": "Strength, endurance, mobility, and coordination as trainable capacities with measurable, individual baselines.",
                "prereqs": [],
                "question": "What can your body do today that it could not do a month ago?",
                "explanation": "Physical capacity is four trainable systems: strength (force), endurance (delivery), mobility (range), coordination (control). Each adapts to progressive overload and detends without it. The honest unit is the personal baseline — capacity is ipsative, never comparative, which is the somatic line's own version of the blindness law.",
                "examples": ["Tracking a plank hold against your own last month", "Learning a hip hinge before adding load"],
                "nonExamples": ["Comparing lifts across bodies", "Chasing soreness as proof of work"],
            },
            {
                "id": "health.physiology",
                "name": "Physiological Literacy",
                "description": "How the body actually works: cardiovascular and muscular response to exercise, energy systems, and adaptation.",
                "prereqs": ["health.movement"],
                "question": "What is happening inside when you train?",
                "explanation": "Exercise is physiology made visible: heart rate and stroke volume carry oxygen, muscles recruit fibers by demand, energy systems hand off between them on timescales, and adaptation happens in recovery, not in the session. Reading your own body's signals — breath, heart rate, fatigue — turns training from folklore into feedback.",
                "examples": ["Pacing an interval by breathing rhythm, not by the clock alone", "Explaining why strength gains outpace muscle growth early"],
                "nonExamples": ["Training to exhaustion daily and calling the fatigue failure", "Believing sweat volume measures fitness"],
            },
            {
                "id": "health.nutrition_sleep",
                "name": "Nutrition and Sleep",
                "description": "The substrate of capacity: what the body runs on and what repairs it — food quality and quantity, and sleep as non-negotiable maintenance.",
                "prereqs": ["health.physiology"],
                "question": "Why does the workout build nothing without the kitchen and the bed?",
                "explanation": "Adaptation consumes substrate: protein rebuilds, carbohydrate refuels, and sleep is when the actual construction happens — hormone pulses, memory consolidation, tissue repair. Under-sleeping negates training. The willpower line appears honestly here: consistency in boring fundamentals outperforms intensity in impressive ones.",
                "examples": ["Protein across the day rather than one heroic dinner", "Choosing a fixed wake time over a fixed bedtime"],
                "nonExamples": ["Supplements as a substitute for sleep", "Diets designed to be broken"],
            },
            {
                "id": "health.mental",
                "name": "Mental Health Literacy",
                "description": "Stress, mood, and the mind-body loop: recognizing states, using movement and rest as regulation, and when to seek help.",
                "prereqs": ["health.nutrition_sleep"],
                "question": "How do you read the body's reports about the mind?",
                "explanation": "Mental states have somatic signatures — sleep disruption, appetite shifts, muscle tension — and physical practices move mental states: exercise as antidepressant at moderate effect sizes, breath as a parasympathetic brake. Literacy includes the boundary of self-help: persistent impairment is a signal for professional help, not a willpower failure. This is the intrapersonal line met through the body.",
                "examples": ["Noticing a mood dip as three nights of short sleep", "Using a walk to move through rumination"],
                "nonExamples": ["Toughness talk as treatment for depression", "Self-diagnosis from social media"],
            },
        ],
    },
]


def phases_for(branch: dict, c: dict) -> dict:
    return {
        "observation": {
            "question": c["question"],
            "assessmentType": "factual_recall",
            "completionEvidence": f"Student can name the core elements of {c['name'].lower()} and say what each one does",
        },
        "principle": {
            "question": f"Why does {c['name'].lower()} work the way it does?",
            "assessmentType": "concept_explanation",
            "completionEvidence": f"Student explains the mechanism in their own words, not by reciting the definition",
        },
        "application": {
            "question": f"Apply {c['name'].lower()} to a new situation: what would you do and why?",
            "assessmentType": "application_problem",
            "completionEvidence": "Student transfers the concept to an unseen case with justified choices",
        },
        "integration": {
            "question": f"How does {c['name'].lower()} connect with what was learned before it?",
            "assessmentType": "analogy_mapping",
            "completionEvidence": "Student links this concept to its prerequisites in one coherent account",
        },
        "creation": {
            "question": f"Design something original using {c['name'].lower()}.",
            "assessmentType": "research_question",
            "completionEvidence": "Student produces an original artifact or proposal and defends its constraints",
        },
    }


def content_for(c: dict) -> dict:
    return {
        "explanation": c["explanation"],
        "examples": c["examples"],
        "nonExamples": c["nonExamples"],
        "analogies": [],
        "visuals": [],
        "practiceProblems": [
            {
                "id": f"{c['id']}.p1",
                "problemText": f"Describe {c['name'].lower()} in your own words, then apply it to a case you have never seen.",
                "targetDepth": "applied",
            },
            {
                "id": f"{c['id']}.p2",
                "problemText": f"Find the boundary: give a case that looks like {c['name'].lower()} but is not, and say why.",
                "targetDepth": "analyzed",
            },
        ],
    }


def depth_rubric(c: dict) -> dict:
    skill = c["name"].lower()
    return {
        "levels": {
            "memorized": {
                "evidence": f"Can state the definitions and elements of {skill}",
                "canDo": [f"Name the parts of {skill}"],
                "cannotDo": [f"Use {skill} in a new situation"],
                "appropriateTasks": ["recall checks", "labeling exercises"],
            },
            "comprehended": {
                "evidence": f"Can explain why {skill} works as it does, in own words",
                "canDo": [f"Explain the mechanism behind {skill}"],
                "cannotDo": ["Transfer to unseen cases reliably"],
                "appropriateTasks": ["explain-back prompts", "worked-example comparison"],
            },
            "applied": {
                "evidence": f"Can use {skill} on a new case with justified choices",
                "canDo": ["Solve an unseen problem using the concept"],
                "cannotDo": ["Analyze failure cases systematically"],
                "appropriateTasks": ["application problems", "short projects"],
            },
            "analyzed": {
                "evidence": f"Can decompose complex cases with {skill} and find boundaries",
                "canDo": ["Distinguish look-alike cases and explain the difference"],
                "cannotDo": ["Weigh competing standards fairly"],
                "appropriateTasks": ["case analysis", "boundary hunting"],
            },
            "evaluated": {
                "evidence": f"Can judge competing uses of {skill} against explicit criteria",
                "canDo": ["Defend an evaluative claim with reasons"],
                "cannotDo": ["Generate new syntheses of the concept with others"],
                "appropriateTasks": ["critique essays", "peer review"],
            },
            "transformed": {
                "evidence": f"Can reorganize and extend {skill} into original synthesis",
                "canDo": ["Create original work that changes how others see the concept"],
                "cannotDo": [],
                "appropriateTasks": ["open projects", "teaching-back"],
            },
        }
    }


def forgetting_params() -> dict:
    return {
        "initialHalfLifeMs": 129600000,
        "halfLifeMultiplier": 2.5,
        "maxHalfLifeMs": 31536000000,
    }


def main() -> None:
    total = 0
    for branch in BRANCHES:
        holons = []
        branch_id = branch["branch"]
        concept_ids = [c["id"] for c in branch["concepts"]]
        holons.append({
            "id": f"{branch_id}.foundations",
            "name": branch["name"],
            "description": branch["description"],
            "level": "branch",
            "parentId": None,
            "childIds": concept_ids,
            "phases": phases_for(branch, {
                "id": f"{branch_id}.foundations",
                "name": branch["name"],
                "question": f"What must any account of {branch['name'].lower()} explain?",
            }),
            "isomorphisms": [],
            "prerequisites": [],
            "devMapping": {
                "primaryLine": branch["primary"],
                "secondaryLines": branch["secondary"],
                "stageRange": {"min": "Amber", "max": "Green"},
            },
            "depthMeta": {
                "requiredPrerequisiteDepth": "absent",
                "targetDepthRange": {"min": "memorized", "max": "transformed"},
                "depthProgression": DEPTHS,
            },
            "forgettingParams": forgetting_params(),
            "content": {
                "explanation": branch["description"] + " The branch organizes its concepts from first contact toward independent, integrated practice.",
                "examples": [f"{c['name']}: {c['examples'][0]}" for c in branch["concepts"]],
                "nonExamples": [f"Not {c['name'].lower()}: {c['nonExamples'][0]}" for c in branch["concepts"]],
                "analogies": [],
                "visuals": [],
                "practiceProblems": [],
            },
            "depthRubric": depth_rubric({"name": branch["name"]}),
            "misconceptions": [],
            "supportedModalities": branch["modalities"],
        })
        for c in branch["concepts"]:
            holons.append({
                "id": c["id"],
                "name": c["name"],
                "description": c["description"],
                "level": "concept",
                "parentId": f"{branch_id}.foundations",
                "childIds": [],
                "phases": phases_for(branch, c),
                "isomorphisms": [],
                "prerequisites": c["prereqs"],
                "devMapping": {
                    "primaryLine": branch["primary"],
                    "secondaryLines": branch["secondary"],
                    "stageRange": {"min": "Amber", "max": "Green"},
                },
                "depthMeta": {
                    "requiredPrerequisiteDepth": "absent",
                    "targetDepthRange": {"min": "memorized", "max": "transformed"},
                    "depthProgression": DEPTHS,
                },
                "forgettingParams": forgetting_params(),
                "content": content_for(c),
                "depthRubric": depth_rubric(c),
                "misconceptions": [],
                "supportedModalities": branch["modalities"],
            })
        out = os.path.join(DATA_DIR, f"{branch_id}.foundations.json")
        with open(out, "w", encoding="utf-8") as f:
            json.dump(holons, f, indent=2, ensure_ascii=False)
            f.write("\n")
        total += len(holons)
        print(f"  {out}: {len(holons)} holons")
    print(f"Total: {total} holons across {len(BRANCHES)} branches")


if __name__ == "__main__":
    main()

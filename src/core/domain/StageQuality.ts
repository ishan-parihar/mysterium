/**
 * StageQuality — what each altitude IS, per quadrant.
 *
 * Canon home: docs/foundations/02 (the arc) and docs/foundations/06 §5.1 (the ratified ladder).
 * KosmOS source: `_Ontology/stages/altitude.md` — "The MASTER ALTITUDE SCALE", status Ratified.
 * The pathology model is `_Ontology/pathologies.md` (HoloOS 06.3), the same 4-fold model
 * docs/foundations/10 builds on.
 *
 * WHY THIS EXISTS (P2). The stage registry used to describe each altitude in one `description`
 * string with `stub: true`. That is not enough to tell two altitudes apart on a principled
 * basis: Teal and Turquoise share a ray, and nothing in code said what *qualitatively* separates
 * them. KosmOS defines every altitude by four things — an **emergent order**, per-quadrant
 * **integrity** markers, per-quadrant **pathology** markers, and **threshold** markers — so the
 * distinction becomes a property of the altitude rather than an arbitrary index.
 *
 * Two payoffs beyond the ladder itself:
 *
 * 1. **The AQAL quadrant integration that AGENTS.md §6 deferred.** These markers are ALREADY
 *    per-quadrant, and they come from ratified ontology rather than new theory. Ingesting them
 *    integrates the quadrants without inventing an architecture for them.
 * 2. **The dual vectors of AGENTS.md §5.3, made computable.** KosmOS's diagnosis protocol reads
 *    Agape as the pathology markers of the altitudes BELOW the centre of gravity (heal) and Eros
 *    as the threshold markers AT it (evolve). `agapeScan` / `erosScan` below are exactly that,
 *    and they are the same two directions the shadow model already names.
 *
 * FIREWALL (44 axis table, KosmOS `scale.md` §5.1, CONSTITUTION rule 13): quality belongs to the
 * ALTITUDE axis. It says nothing about the ray lens (`Ray.ts`), the knowledge axis (framework
 * depth, 31/42), or the intra-holonic vertical (13). Those are separate questions.
 */
import type { Stage } from './Stage.js';
import { ALL_STAGES, stageOrdinal } from './Stage.js';
import type { Quadrant } from './SharedTypes.js';

/** One marker string per AQAL quadrant — interior/exterior × individual/collective. */
export interface QuadrantMarkers {
  readonly UL: string; // interior-individual — experience, intention, construct, state
  readonly UR: string; // exterior-individual — behaviour, mechanism, physiology, measurable act
  readonly LL: string; // interior-collective — shared meaning, culture, ethic, resonance
  readonly LR: string; // exterior-collective — system, structure, institution, flow
}

export const QUADRANTS: readonly Quadrant[] = ['UL', 'UR', 'LL', 'LR'];

export interface StageQuality {
  readonly stage: Stage;
  /** KosmOS altitude label: L1 … L8. */
  readonly altitude: string;
  /**
   * The KosmOS canonical Stage# span (`_Ontology/stages.md`, 1–17). Mysterium's 8 stages are
   * L1–L8, so this span is what compresses 17 MHC stages onto one altitude.
   */
  readonly kosmosStage: readonly [number, number];
  /** Model of Hierarchical Complexity orders (0–16). Note: `kosmosStage - 1`. */
  readonly mhcOrder: readonly [number, number];
  readonly kegan: string;
  /** egocentric → ethnocentric → worldcentric → kosmocentric. */
  readonly identityBand: string;
  /** What emerges here that the altitude below could not express. */
  readonly emergentOrder: string;
  /** Healthy inclusion, per quadrant. */
  readonly integrityMarkers: QuadrantMarkers;
  /**
   * Blockage, per quadrant. These are the altitude's shadow content — the same fourfold
   * (dark/golden × addiction/allergy) model `pathologies.md` and docs/foundations/10 use, read
   * per quadrant rather than per drive.
   */
  readonly pathologyMarkers: QuadrantMarkers;
  /** The attractor-field at this altitude — what Eros is called toward. */
  readonly thresholdMarkers: string;
  /** Provenance. KosmOS is canonical where it speaks (44 §provenance). */
  readonly source: string;
}

export const STAGE_QUALITY: Readonly<Record<Stage, StageQuality>> = {
  Infrared: {
    stage: 'Infrared',
    altitude: 'L1',
    kosmosStage: [1, 2],
    mhcOrder: [0, 1],
    kegan: '—',
    identityBand: 'egocentric (pre-differentiated)',
    emergentOrder:
      'Anchoring in physical reality; survival consciousness; body-self fused with environment.',
    integrityMarkers: {
      UL: 'grounded embodied presence',
      UR: 'basic needs met, fight/flight functional',
      LL: 'secure primal bonding',
      LR: 'operates within natural ecology',
    },
    pathologyMarkers: {
      UL: 'chronic survival terror, dissociation, psychotic fragmentation',
      UR: 'inability to care for basic needs, self-destructive behavior',
      LL: 'inability to bond, merger/withdrawal oscillation',
      LR: 'homelessness, no material foundation',
    },
    thresholdMarkers:
      'Emotional identity and self-other differentiation beginning to emerge.',
    source: 'KosmOS _Ontology/stages/altitude.md L1',
  },
  Magenta: {
    stage: 'Magenta',
    altitude: 'L2',
    kosmosStage: [3, 3],
    mhcOrder: [2, 2],
    kegan: '0→1',
    identityBand: 'egocentric',
    emergentOrder:
      'Self differentiates from environment; magical-animistic world; the emotional self is born.',
    integrityMarkers: {
      UL: 'emerging self, imaginative wonder',
      UR: 'exploratory play, comforting ritual',
      LL: 'warm kinship/fusion bonds',
      LR: 'seasonal, kinship-based organization',
    },
    pathologyMarkers: {
      UL: 'magical thinking, identity confusion, emotional flooding',
      UR: 'superstitious compulsive behavior, ritual addiction',
      LL: 'fusion bonds, inability to differentiate self from other',
      LR: 'chaotic living systems, no stable structure',
    },
    thresholdMarkers: 'Ego-power and autonomous will beginning to assert.',
    source: 'KosmOS _Ontology/stages/altitude.md L2',
  },
  Red: {
    stage: 'Red',
    altitude: 'L3',
    kosmosStage: [4, 5],
    mhcOrder: [3, 4],
    kegan: '1→2',
    identityBand: 'egocentric',
    emergentOrder:
      'Full self-differentiation; autonomous will; the ego crystallizes as a separate power-self.',
    integrityMarkers: {
      UL: 'healthy assertion, courage, agency',
      UR: 'decisive action, capacity to impose form',
      LL: 'clear boundaries, earned respect',
      LR: 'can command and organize by will',
    },
    pathologyMarkers: {
      UL: 'power obsession, narcissistic grandiosity, impulse domination',
      UR: 'violence, exploitation, predatory behavior',
      LL: 'dominance-submission, betrayal cycles',
      LR: 'warlord systems, corruption, might-makes-right structures',
    },
    thresholdMarkers:
      'Heart-opening; belonging to something greater than the self.',
    source: 'KosmOS _Ontology/stages/altitude.md L3',
  },
  Amber: {
    stage: 'Amber',
    altitude: 'L4',
    kosmosStage: [6, 10],
    mhcOrder: [5, 9],
    kegan: '2→3',
    identityBand: 'ethnocentric',
    emergentOrder:
      'First heart-opening as ethnocentric love; rule/role order, conformist belonging, devotion.',
    integrityMarkers: {
      UL: 'principled devotion, duty, meaning',
      UR: 'discipline, rule-keeping, service',
      LL: 'deep loyalty, role-fidelity, belonging',
      LR: 'stable institutions, law, tradition',
    },
    pathologyMarkers: {
      UL: 'fundamentalism, rigid conformity, guilt/shame spirals',
      UR: 'mindless rule-following, compulsive ritual, self-denial',
      LL: 'in-group tribalism, excommunication of dissenters, us-vs-them',
      LR: 'theocratic rigidity, caste, traditional oppression',
    },
    thresholdMarkers:
      'Rational investigation; independent, evidence-based truth-seeking.',
    source: 'KosmOS _Ontology/stages/altitude.md L4',
  },
  Orange: {
    stage: 'Orange',
    altitude: 'L5',
    kosmosStage: [11, 12],
    mhcOrder: [10, 11],
    kegan: '3→4',
    identityBand: 'worldcentric (emerging)',
    emergentOrder:
      "Independent rational investigation; truth from evidence rather than authority or power; the co-Creator's inflow.",
    integrityMarkers: {
      UL: 'competence-based self-esteem, hypothetico-deductive reasoning',
      UR: 'goal-tracking, deliberate practice, enterprise-building',
      LL: 'merit-based, contractual relations, respect for competence',
      LR: 'democracy, regulated markets, scientific institutions',
    },
    pathologyMarkers: {
      UL: 'scientism, reductionism, emotional suppression, hubris',
      UR: 'workaholism, success-addiction, health neglect for achievement',
      LL: 'transactional relationships, commodification of persons',
      LR: 'extractive capitalism, ecological harm for profit',
    },
    thresholdMarkers:
      'Pluralistic sensitivity; noticing marginalized voices ("whose rationality? who benefits?"); felt hollowness of achievement.',
    source: 'KosmOS _Ontology/stages/altitude.md L5',
  },
  Green: {
    stage: 'Green',
    altitude: 'L6',
    kosmosStage: [13, 13],
    mhcOrder: [12, 12],
    kegan: '4',
    identityBand: 'worldcentric',
    emergentOrder:
      "Inclusive expression; pluralistic sensitivity; radiating authentic self and giving voice — the co-Creator's outflow.",
    integrityMarkers: {
      UL: 'empathy, perspective-taking, ecological care',
      UR: 'activism, dialogue, inclusive practice',
      LL: 'egalitarian, vulnerable, consensus-seeking',
      LR: 'flat organizations, welfare, sustainability',
    },
    pathologyMarkers: {
      UL: '"mean green meme," performative sensitivity, relativistic paralysis',
      UR: 'activism burnout, virtue signaling, conflict avoidance',
      LL: 'enforced egalitarianism that suppresses excellence, cancel dynamics',
      LR: 'dysfunctional consensus, organizational paralysis',
    },
    thresholdMarkers:
      'Integral meta-vision; embrace of whole systems and of healthy hierarchy as depth.',
    source: 'KosmOS _Ontology/stages/altitude.md L6',
  },
  Teal: {
    stage: 'Teal',
    altitude: 'L7',
    kosmosStage: [14, 14],
    mhcOrder: [13, 13],
    kegan: '4→5',
    identityBand: 'kosmocentric (2nd tier)',
    emergentOrder:
      'The gateway opens; meta-perspective sees all prior stages as necessary; vision-logic.',
    integrityMarkers: {
      UL: 'integral meta-cognition, holds paradox',
      UR: 'integral life practice, systemic leverage-point action',
      LL: 'developmental mentoring, genuine cross-level communication',
      LR: 'self-managing/teal organizations, holacracy',
    },
    pathologyMarkers: {
      UL: 'intellectual bypassing, "integral arrogance," premature transcendence',
      UR: 'integral practice as performance, spiritualized achievement',
      LL: 'guru dynamics, developmental elitism',
      LR: 'complexity paralysis, over-designed systems',
    },
    thresholdMarkers:
      'Embodied gateway; adept practice; being (not just seeing) the integration.',
    source: 'KosmOS _Ontology/stages/altitude.md L7',
  },
  Turquoise: {
    stage: 'Turquoise',
    altitude: 'L8',
    kosmosStage: [15, 15],
    mhcOrder: [14, 14],
    kegan: '5',
    identityBand: 'kosmocentric',
    emergentOrder:
      'The gateway is traversed; the entity embodies integration; trans-rational direct knowing.',
    integrityMarkers: {
      UL: 'holistic/transpersonal cognition, unity dawning',
      UR: 'contemplative action, healing/teaching from being',
      LL: 'soul-level connection, cosmic fellowship',
      LR: 'planetary, consciousness-based institutions',
    },
    pathologyMarkers: {
      UL: 'spiritual bypass at cosmic scale, dissociation from earth, "unworthiness"',
      UR: 'withdrawal from engagement, ethereal disconnection',
      LL: 'isolation in cosmic awareness, loss of human connection',
      LR: 'failure to build practical systems, planetary abstractionism',
    },
    thresholdMarkers: 'Total integration; harvest readiness.',
    source: 'KosmOS _Ontology/stages/altitude.md L8',
  },
};

/** The quality record for an altitude. */
export function qualityOf(stage: Stage): StageQuality {
  return STAGE_QUALITY[stage];
}

/** This altitude's pathology markers for one quadrant — its shadow content in that quadrant. */
export function pathologyIn(stage: Stage, quadrant: Quadrant): string {
  return STAGE_QUALITY[stage].pathologyMarkers[quadrant];
}

/** This altitude's healthy-inclusion markers for one quadrant. */
export function integrityIn(stage: Stage, quadrant: Quadrant): string {
  return STAGE_QUALITY[stage].integrityMarkers[quadrant];
}

/**
 * Agape scan — the heal/evolve (bottom-up) vector of AGENTS.md §5.3.
 *
 * KosmOS `altitude.md` → "Diagnosis protocol" step 2: *for every level BELOW the center of
 * gravity, surface its pathology markers; each present marker is a healing item (stabilize the
 * lower whole)*. These altitudes remain holonic members of the player after they are outgrown
 * (AGENTS.md §5.6), so this is not history — it is live maintenance work.
 */
export function agapeScan(centreOfGravity: Stage): readonly Stage[] {
  const cog = stageOrdinal(centreOfGravity);
  if (cog < 0) return [];
  return ALL_STAGES.slice(0, cog);
}

/**
 * Eros scan — the evolve/heal (top-down) vector of AGENTS.md §5.3.
 *
 * KosmOS `altitude.md` → step 3: *read the CENTER-OF-GRAVITY level's threshold markers; absent
 * markers are the transcendence agenda*. Note the marker read is the CoG's own, not the next
 * altitude's: a level's threshold markers describe the attractor field at its upper boundary
 * (L1's is "emotional identity … beginning to emerge", i.e. the pull toward L2). The emergent
 * edge is returned alongside so a caller knows what the call is toward. `null` at the top of the
 * ladder, where the next attractor is the closure rather than an altitude.
 */
export function erosScan(
  centreOfGravity: Stage,
): { stage: Stage; thresholdMarkers: string; calledToward: Stage | null } | null {
  const cog = stageOrdinal(centreOfGravity);
  if (cog < 0) return null;
  if (cog >= ALL_STAGES.length - 1) return null;
  return {
    stage: centreOfGravity,
    thresholdMarkers: STAGE_QUALITY[centreOfGravity].thresholdMarkers,
    calledToward: ALL_STAGES[cog + 1],
  };
}

// ---------------------------------------------------------------------------
// QUALITY-WIRING (MY-AD-0030) — the runtime reader the quality data was missing.
// ---------------------------------------------------------------------------

/**
 * The developmental agenda at a centre of gravity — BOTH vectors of AGENTS.md §5.3 in one
 * record, computed rather than declared.
 *
 * This is the structure the LLM-conditioning path consumes (`ContextPipelineInput.developmental-
 * Agenda`): it exists so catalyst can be aimed at the player's actual work — the threshold the
 * centre of gravity is being pulled across, and the lower altitudes whose pathology content is
 * still live — instead of at the encounter's nominal stage. Marker prose is the only payload:
 * Veil-safe by construction (no scores, no taxonomy labels), which is why this record may feed a
 * prompt but never a player-facing surface.
 */
export interface DevelopmentalAgenda {
  /** The centre of gravity the agenda was computed at. */
  readonly centreOfGravity: Stage;
  /** Eros: what this altitude's threshold markers name as the attractor. */
  readonly eros: { thresholdMarkers: string; calledToward: Stage | null } | null;
  /**
   * Agape: the per-quadrant pathology content still live BELOW the centre of gravity. One entry
   * per (altitude, quadrant) whose marker text is non-empty; empty only at the bottom of the
   * ladder, where there is nothing below to heal.
   */
  readonly agape: ReadonlyArray<{ stage: Stage; quadrant: Quadrant; marker: string }>;
}

/**
 * Compute the agenda for a centre of gravity. Deterministic and pure: same altitudes in, same
 * agenda out. The healing layers' targeting and the LLM conditioning path both read this, which
 * is what makes the two vectors of AGENTS.md §5.3 ONE computation instead of two conventions.
 */
export function buildDevelopmentalAgenda(centreOfGravity: Stage): DevelopmentalAgenda {
  return {
    centreOfGravity,
    eros: erosScan(centreOfGravity)
      ? { thresholdMarkers: erosScan(centreOfGravity)!.thresholdMarkers, calledToward: erosScan(centreOfGravity)!.calledToward }
      : null,
    agape: agapeScan(centreOfGravity).flatMap(stage =>
      QUADRANTS.map(quadrant => ({ stage, quadrant, marker: pathologyIn(stage, quadrant) })),
    ),
  };
}

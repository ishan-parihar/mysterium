/**
 * The engagement register — 45 §7.3 / ethics contract §5.1 (MY-AD-0020).
 *
 * Every retention mechanism must pass BOTH tests and be RECORDED here before it ships:
 *   1. Endorsement — shown a plain description of the mechanism and its effect, would the player
 *      endorse it? (Not "would they fail to object" — would they ENDORSE it.)
 *   2. Reversal — would the design survive the sentence "This contemplative practice is designed
 *      to keep you here by …" read aloud to a clinician, a regulator, or the player's own family?
 *
 * Failure class: `MY-RG-0017`. The register is the enforcement surface: a mechanism that is not
 * recorded with both tests passed has no legitimate place in the product, and `isMechanismAllowed`
 * is the check other organs call.
 */

export type EngagementMechanismId =
  | 'growth-legibility'
  | 'autonomy'
  | 'competence'
  | 'relatedness'
  | 'curiosity-gap'
  | 'identity-congruence'
  | 'analogical-resonance'
  | 'narrative-transportation';

/** 45 §7.1's allowed mechanisms, pre-registered with their binding grounds. */
export interface MechanismRecord {
  readonly id: EngagementMechanismId;
  readonly description: string;
  /** 45 §7.1 "Where it binds" — the canon surface the mechanism is anchored to. */
  readonly binds: string;
  readonly endorsementPassed: boolean;
  readonly reversalPassed: boolean;
}

const INITIAL_REGISTER: readonly MechanismRecord[] = Object.freeze([
  { id: 'growth-legibility', description: 'the player can SEE their trajectory', binds: '33, 25', endorsementPassed: true, reversalPassed: true },
  { id: 'autonomy', description: 'genuine choice with visible consequences', binds: '16 §4.2, 19', endorsementPassed: true, reversalPassed: true },
  { id: 'competence', description: 'challenge matched to the growth edge', binds: '08, 16 §6.4', endorsementPassed: true, reversalPassed: true },
  { id: 'relatedness', description: 'NPCs and cohorts that know the player', binds: '18 §2, 38', endorsementPassed: true, reversalPassed: true },
  { id: 'curiosity-gap', description: 'an opened question the player wants to close', binds: '15, 22 §4', endorsementPassed: true, reversalPassed: true },
  { id: 'identity-congruence', description: '"this is the person I am becoming"', binds: '16 §5, 39', endorsementPassed: true, reversalPassed: true },
  { id: 'analogical-resonance', description: 'the material speaks their language', binds: '45 §5.4', endorsementPassed: true, reversalPassed: true },
  { id: 'narrative-transportation', description: 'the world is interesting (authored quality, not a lever)', binds: '18, 21', endorsementPassed: true, reversalPassed: true },
]);

/** 45 §7.2's forbidden mechanisms — never registrable, always refused. */
export const FORBIDDEN_MECHANISMS: readonly string[] = Object.freeze([
  'variable-ratio reward on anything developmental',
  'loss aversion / streak punishment',
  'artificial scarcity and FOMO',
  'dark-pattern notifications',
  'engagement-maximizing objectives',
  'personalization against stated purpose',
  'manufactured parasocial obligation',
  'analogical falsification',
]);

export interface EngagementRegister {
  readonly entries: readonly MechanismRecord[];
  /** Register a mechanism; refuses when either test has not been passed or the mechanism is forbidden. */
  register(record: MechanismRecord): void;
  /** The gate other organs call: a mechanism not both-tests-passed and registered returns false. */
  isMechanismAllowed(id: string): boolean;
}

export function createEngagementRegister(): EngagementRegister {
  const entries: MechanismRecord[] = [...INITIAL_REGISTER];
  return {
    entries,
    register(record) {
      if (FORBIDDEN_MECHANISMS.some((f) => record.id === f || record.description === f)) {
        throw new Error(`engagement register: '${record.id}' is a forbidden mechanism (45 §7.2, MY-RG-0017)`);
      }
      if (!record.endorsementPassed || !record.reversalPassed) {
        throw new Error(`engagement register: '${record.id}' has not passed both tests (45 §7.3) — it does not ship`);
      }
      entries.push(record);
    },
    isMechanismAllowed(id) {
      const e = entries.find((x) => x.id === id);
      return e !== undefined && e.endorsementPassed && e.reversalPassed;
    },
  };
}

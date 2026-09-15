/**
 * validateSignificator — schema validation with backward-compat shims.
 *
 * T-0.8 (HS-16 fix): prior `loadSave`/`loadProfile` validated only 3 fields
 * (id, currentStage, altitudes) then trusted the rest, causing crashes when
 * old saves were missing new fields. This validator ensures every required
 * field is present, defaulting missing fields to safe values.
 *
 * Status: canonical (Mysterium-specific persistence contract).
 */
import type { Significator, TransformationRecord, EncounterRecord, DriveState } from '../../core/domain/Significator.js';
import type { Stage } from '../../core/domain/Stage.js';
import type { Line } from '../../core/domain/Line.js';
import { ALL_LINES } from '../../core/domain/Line.js';
import { ALL_STAGES } from '../../core/domain/Stage.js';
import { ALL_DRIVES } from '../../core/domain/Drive.js';
import type { Drive } from '../../core/domain/Drive.js';
import type { ShadowLedger, ShadowEntry } from '../../core/domain/ShadowLedger.js';
import type { PolarityState } from '../../core/domain/PolarityCellVector.js';
import type { KnowledgeState, ConceptState } from '../../core/curriculum/types.js';
import { ALL_DEPTH_LEVELS } from '../../core/curriculum/types.js';
import { IDENTITY_FIELDS, HEALING_PURPOSES, type IdentityProfile, type IdentityField, type FieldConsent, type HealingPurpose } from '../../core/domain/IdentityProfile.js';

const VALID_STAGES = new Set<string>(ALL_STAGES);
const VALID_LINES = new Set<string>(ALL_LINES);

function isString(x: unknown): x is string {
  return typeof x === 'string';
}

function isNumber(x: unknown): x is number {
  return typeof x === 'number' && !Number.isNaN(x);
}

function isBoolean(x: unknown): x is boolean {
  return typeof x === 'boolean';
}

function asArray<T = unknown>(x: unknown): T[] {
  return Array.isArray(x) ? x as T[] : [];
}

function asRecord(x: unknown): Record<string, unknown> {
  return (x && typeof x === 'object' && !Array.isArray(x)) ? x as Record<string, unknown> : {};
}

/**
 * Validate and normalize a parsed object into a Significator.
 * Returns null if the object is missing required identity fields (id).
 * Defaults missing optional fields to safe values.
 */
export function validateSignificator(input: unknown): Significator | null {
  const obj = asRecord(input);
  if (!isString(obj.id) || obj.id.length === 0) return null;

  // --- Identity + lifecycle ---
  const createdAt = isNumber(obj.createdAt) ? obj.createdAt : Date.now();
  const lifecycle = isString(obj.lifecycle) ? obj.lifecycle : 'Exploring';
  const currentStage = (isString(obj.currentStage) && VALID_STAGES.has(obj.currentStage))
    ? obj.currentStage as Stage
    : 'Red';

  // --- Altitudes: per-Line Stage ---
  const altitudesRaw = asRecord(obj.altitudes);
  const altitudes = {} as Record<Line, Stage>;
  for (const line of ALL_LINES) {
    const a = altitudesRaw[line];
    altitudes[line] = (isString(a) && VALID_STAGES.has(a)) ? a as Stage : 'Red';
  }

  // --- Drives ---
  const drivesRaw = asRecord(obj.drives);
  const weightsRaw = asRecord(drivesRaw.weights);
  const fixationRaw = asRecord(drivesRaw.fixationRisk);
  const weights = {} as Record<Drive, number>;
  const fixationRisk = {} as Record<Drive, number>;
  for (const drive of ALL_DRIVES) {
    weights[drive] = isNumber(weightsRaw[drive]) ? weightsRaw[drive] : 0;
    fixationRisk[drive] = isNumber(fixationRaw[drive]) ? fixationRaw[drive] : 0;
  }
  const drives: DriveState = { weights, fixationRisk };

  // --- Shadows ---
  const shadowsRaw = asRecord(obj.shadows);
  const entriesRaw = asArray<Record<string, unknown>>(shadowsRaw.entries);
  const entries: ShadowEntry[] = entriesRaw.map((e, i) => {
    const quadrant = isString(e.quadrant) ? e.quadrant : 'DarkAddiction';
    const entryLine = (isString(e.line) && VALID_LINES.has(e.line)) ? e.line as Line : 'Cognitive';
    const entryStage = (isString(e.stage) && VALID_STAGES.has(e.stage)) ? e.stage as Stage : 'Red';
    return {
      id: isString(e.id) ? e.id : `shadow-${i}`,
      quadrant: quadrant as ShadowEntry['quadrant'],
      line: entryLine,
      stage: entryStage,
      drive: isString(e.drive) ? e.drive as ShadowEntry['drive'] : 'Agency',
      surfacedAt: isNumber(e.surfacedAt) ? e.surfacedAt : Date.now(),
      resolvedAt: isNumber(e.resolvedAt) ? e.resolvedAt : null,
      recurrenceCount: isNumber(e.recurrenceCount) ? e.recurrenceCount : 0,
      compoundPartner: isString(e.compoundPartner) ? e.compoundPartner : null,
      severity: isNumber(e.severity) ? e.severity : 0.5,
    };
  });
  const shadows: ShadowLedger = {
    entries,
    activeCount: entries.filter(e => e.resolvedAt === null).length,
  };

  // --- Theta ---
  const thetaRaw = asRecord(obj.theta);
  const lastEncounterRaw = asRecord(thetaRaw.lastEncounter);
  const lastEncounter: Record<string, number> = {};
  for (const line of ALL_LINES) {
    for (const stage of ALL_STAGES) {
      const key = `${line}:${stage}`;
      const v = lastEncounterRaw[key];
      lastEncounter[key] = isNumber(v) ? v : 0;
    }
  }

  // --- Transformations ---
  const transformationsRaw = asArray<Record<string, unknown>>(obj.transformations);
  const transformations: TransformationRecord[] = transformationsRaw.map(t => ({
    fromStage: (isString(t.fromStage) && VALID_STAGES.has(t.fromStage)) ? t.fromStage as Stage : 'Infrared',
    toStage: (isString(t.toStage) && VALID_STAGES.has(t.toStage)) ? t.toStage as Stage : 'Infrared',
    triggeredAt: isNumber(t.triggeredAt) ? t.triggeredAt : 0,
    triggeredAtSession: isNumber(t.triggeredAtSession) ? t.triggeredAtSession : 0,
    catalystCount: isNumber(t.catalystCount) ? t.catalystCount : 0,
  }));

  // --- Recent encounters ---
  const recentRaw = asArray<Record<string, unknown>>(obj.recentEncounters);
  const recentEncounters: EncounterRecord[] = recentRaw.map(r => ({
    line: (isString(r.line) && VALID_LINES.has(r.line)) ? r.line as Line : 'Cognitive',
    passed: isBoolean(r.passed) ? r.passed : true,
    driveChoice: isString(r.driveChoice) ? r.driveChoice as EncounterRecord['driveChoice'] : undefined,
    timestamp: isNumber(r.timestamp) ? r.timestamp : Date.now(),
  })).slice(-50);

  // --- Other fields with defaults ---
  const totalEncounters = isNumber(obj.totalEncounters) ? obj.totalEncounters : 0;
  const totalSessions = isNumber(obj.totalSessions) ? obj.totalSessions : 0;
  const transformationPhase = isString(obj.transformationPhase) ? obj.transformationPhase as Significator['transformationPhase'] : 'idle';

  // --- Polarity (minimal validation; full schema is in PolarityCellVector) ---
  const polarity: PolarityState = (obj.polarity && typeof obj.polarity === 'object')
    ? obj.polarity as PolarityState
    : {
        cells: {},
        lineProfiles: {},
        master: {
          mode: 'Exploring' as const,
          dominantDirection: null,
          coherentLineCount: 0,
          crystallizationProgress: 0,
        },
      };

  // --- Ray profile + states (minimal) ---
  const rayProfile = asRecord(obj.rayProfile);
  const states = asRecord(obj.states);

  // --- Codex + avoided ---
  const codexEntries = asArray(obj.codexEntries);
  const avoidedEncounters = asArray<string>(obj.avoidedEncounters).filter(isString);

  // --- Knowledge (curriculum expansion) ---
  let knowledge: KnowledgeState | undefined;
  if (obj.knowledge && typeof obj.knowledge === 'object') {
    const kRaw = asRecord(obj.knowledge);
    // Reconstruct conceptStates Map from serialized object
    const conceptStatesRaw = asRecord(kRaw.conceptStates);
    const conceptStates = new Map<string, ConceptState>();
    for (const [key, val] of Object.entries(conceptStatesRaw)) {
      const cs = asRecord(val);
      const depthLevel = (isString(cs.depthLevel) && ALL_DEPTH_LEVELS.includes(cs.depthLevel as any))
        ? cs.depthLevel as ConceptState['depthLevel'] : 'absent';
      conceptStates.set(key, {
        depthLevel,
        retention: isNumber(cs.retention) ? cs.retention : 1.0,
        lastReviewedAt: isNumber(cs.lastReviewedAt) ? cs.lastReviewedAt : Date.now(),
        reviewCount: isNumber(cs.reviewCount) ? cs.reviewCount : 0,
        depthHistory: asArray(cs.depthHistory),
        misconceptionFlags: asArray<string>(cs.misconceptionFlags).filter(isString),
      });
    }
    // Reconstruct subjectProgress Map
    const subjectProgressRaw = asRecord(kRaw.subjectProgress);
    const subjectProgress = new Map<string, any>();
    for (const [key, val] of Object.entries(subjectProgressRaw)) {
      subjectProgress.set(key, val);
    }
    // FIX (Full-Development Audit 2026-09-15): reconstruct forgettingCurves Map.
    // The validator previously dropped this field on load, so forgetting-curve
    // persistence (Phase 5A, persistKnowledgeDecay in GameLoop) never survived
    // a save/load round-trip and review candidates lost their history.
    const forgettingCurvesRaw = asRecord(kRaw.forgettingCurves);
    const forgettingCurves = new Map<string, any>();
    for (const [key, val] of Object.entries(forgettingCurvesRaw)) {
      const fc = asRecord(val);
      forgettingCurves.set(key, {
        conceptId: isString(fc.conceptId) ? fc.conceptId : key,
        firstLearnedAt: isNumber(fc.firstLearnedAt) ? fc.firstLearnedAt : 0,
        lastRetrievedAt: isNumber(fc.lastRetrievedAt) ? fc.lastRetrievedAt : 0,
        retention: isNumber(fc.retention) ? fc.retention : 1,
        retrievalCount: isNumber(fc.retrievalCount) ? fc.retrievalCount : 0,
        halfLifeMs: isNumber(fc.halfLifeMs) ? fc.halfLifeMs : 0,
      });
    }
    knowledge = {
      conceptStates: conceptStates as ReadonlyMap<string, ConceptState>,
      subjectProgress: subjectProgress as ReadonlyMap<string, any>,
      studyHistory: asArray(kRaw.studyHistory),
      learningProfile: (kRaw.learningProfile && typeof kRaw.learningProfile === 'object')
        ? kRaw.learningProfile as KnowledgeState['learningProfile']
        : { preferredModalities: [], metacognitionScore: 0.5, calibrationAccuracy: 0.5, transferCapacity: 0.5, studyEfficiency: 0.5 },
      forgettingCurves: forgettingCurves as ReadonlyMap<string, any>,
    } as KnowledgeState;
  }

  // --- Identity (doc 16 §2.1: consent-bound, healing-layer-only) ---
  // Whitelist reconstruction: only known fields/consents survive. A value
  // without an active consent record is DROPPED (consent-gated existence).
  let identity: IdentityProfile | undefined;
  if (obj.identity && typeof obj.identity === 'object') {
    const iRaw = asRecord(obj.identity);
    const fieldsRaw = asRecord(iRaw.fields);
    const consentsRaw = asRecord(iRaw.consents);
    const fields: Partial<Record<IdentityField, string>> = {};
    const consents: Partial<Record<IdentityField, FieldConsent>> = {};
    for (const field of IDENTITY_FIELDS) {
      const value = fieldsRaw[field];
      const consentRaw = asRecord(consentsRaw[field]);
      const grantedAtMs = isNumber(consentRaw.grantedAtMs) ? consentRaw.grantedAtMs : 0;
      const withdrawnAtMs = isNumber(consentRaw.withdrawnAtMs) ? consentRaw.withdrawnAtMs : null;
      const purposesRaw = asArray<unknown>(consentRaw.purposes).filter(isString);
      const purposes = purposesRaw.filter((p): p is HealingPurpose => (HEALING_PURPOSES as readonly string[]).includes(p));
      if (isString(value) && withdrawnAtMs === null && purposes.length > 0) {
        fields[field] = value;
        consents[field] = { grantedAtMs, purposes, withdrawnAtMs: null };
      }
    }
    if (Object.keys(fields).length > 0) {
      identity = { fields, consents, version: 1 };
    }
  }

  const result: Significator = {
    id: obj.id,
    createdAt,
    lifecycle: lifecycle as Significator['lifecycle'],
    altitudes,
    currentStage,
    rayProfile: rayProfile as Significator['rayProfile'],
    states: states as Significator['states'],
    drives,
    polarity,
    shadows,
    theta: { lastEncounter },
    transformations,
    codexEntries: codexEntries as Significator['codexEntries'],
    transformationPhase,
    transformationSessionsInPhase: isNumber(obj.transformationSessionsInPhase) ? obj.transformationSessionsInPhase : 0,
    transformationKnotsResolved: isNumber(obj.transformationKnotsResolved) ? obj.transformationKnotsResolved : 0,
    transformationTotalKnots: isNumber(obj.transformationTotalKnots) ? obj.transformationTotalKnots : 0,
    transformationTargetStage: (obj.transformationTargetStage === null || (isString(obj.transformationTargetStage) && VALID_STAGES.has(obj.transformationTargetStage)))
      ? obj.transformationTargetStage as Stage | null
      : null,
    totalEncounters,
    totalSessions,
    avoidedEncounters,
    recentEncounters,
    knowledge,
    // P5-FIX (Full-Development Audit 2026-09-15): preserve the typed session
    // bookkeeping fields that were previously `as any` casts stripped on load.
    lastSessionAt: isNumber(obj.lastSessionAt) ? obj.lastSessionAt : undefined,
    curriculumIntervention: isString(obj.curriculumIntervention) ? obj.curriculumIntervention : undefined,
    identity,
  };

  return result;
}

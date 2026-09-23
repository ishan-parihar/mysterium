export { projectUdv, auditUdv, REGISTERED_PROJECTIONS } from './udv.js';
export type {
  UserDimensionalityVector,
  UdvInputs,
  ProjectionName,
  PreferenceBand,
  Interest,
  Purpose,
  AnalogyBand,
  LifeConstraints,
  DevelopmentalInputs,
} from './udv.js';

export { selectPoles, expansionBudget, EXPANSION_RATIO_FLOOR } from './dialecticEngine.js';
export type { PoleSelection, PolarityStateMap, DialecticMode, DialecticEngineInput, ExpansionBudget } from './dialecticEngine.js';

export { compose, buildLibraryViews, createCompositionStore, compositionOrder } from './composition.js';
export type {
  ComposedHolon,
  ComposedOfBinding,
  Library,
  LibraryViews,
  ScenarioTemplate,
  CompositionRequest,
  CompositionResult,
  CompositionStore,
  CompositionRecordEntry,
  ExtendedHolonKind,
} from './composition.js';

export { pool, buildQuery, constraintFilter, routeWithVeto, rankByRelevance } from './pooling.js';
export type {
  PoolCandidate,
  CandidateLibrary,
  PoolQuery,
  TopicTagResolver,
  DeferralRecord,
} from './pooling.js';

export { buildScenarioContext, scopeForRole, ROLE_SCOPES } from './scenarioContext.js';
export type {
  ScenarioContext,
  ScopedEnvelope,
  CouncilRole,
  RoleScope,
  PooledRefs,
  AnalogicalBridge,
} from './scenarioContext.js';

export {
  INTEREST_MODES, DEPTH_LADDER, depthToLadderRange, isPriorLive,
  createInterestRecord, isStructuralPoleAllowed,
} from './interestRecord.js';
export type { InterestRecord, InterestMode, InterestAim, InterestProvenance, InterestDepth, ArchetypePrior } from './interestRecord.js';

export {
  RV_DIMENSIONS, MAX_PROBES_PER_SESSION, createProbeLedger, canOfferProbe,
  recordProbePlay, recordProbeDecline, instrumentIsRVValidated,
} from './probeSet.js';
export type { Probe, ProbeReading, ProbeLedger, RVDimension } from './probeSet.js';

export {
  cellEntropy, detectVisibilityCollapse, detectScaffoldShareDefects,
  ENTROPY_FLOOR, MIN_COMPOSITIONS, DEFAULT_SCAFFOLD_SHARE_CEILING,
} from './diversityMonitor.js';
export type { CompositionEvent, DefectReport } from './diversityMonitor.js';

export { createEngagementRegister, FORBIDDEN_MECHANISMS } from './engagementRegister.js';
export type { EngagementRegister, MechanismRecord, EngagementMechanismId } from './engagementRegister.js';
export { shortlist, recallGuard, candidateText, SHORTLIST_THRESHOLD, SHORTLIST_LIMIT } from './retrievalShortlist.js';
export { createProbeRuntime, nextOfferable, recordProbeChoice, declineProbeOffer, harnessReport } from './probeRuntime.js';
export type { ProbeRuntime } from './probeRuntime.js';

// Phase 14 d7 — the K1 probe-validation protocol's executable half. Three responsibilities, three
// modules: the synthetic harness (probeValidation), the rater cohort's statistics
// (probeRaterCohort), and the decision they feed (probeThresholds).
export { summariseProbe, summariseCohort } from './probeRaterCohort.js';
export type { RaterAdministration, ProbeAgreementStat, CohortStat } from './probeRaterCohort.js';
export {
  PILOT_THRESHOLDS, MIN_RATERS_FOR_CERTIFICATION, adjudicateCohort, adjudicateProbes,
  detectBandFlips, runProbePilot, describePilot, validatedPole,
} from './probeThresholds.js';
export type {
  ProbeThresholds, ThresholdProvenance, RVVerdict, ProbeAdjudication, CohortAdjudication,
  BandFlip, PilotRater, PilotReport,
} from './probeThresholds.js';

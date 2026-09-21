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

export { createEngagementRegister, FORBIDDEN_MECHANISMS } from './engagementRegister.js';
export type { EngagementRegister, MechanismRecord, EngagementMechanismId } from './engagementRegister.js';

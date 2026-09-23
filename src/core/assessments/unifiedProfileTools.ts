/**
 * Unified Profile Tools — educational orchestrator for the core-loop-agent.
 * Spec: brain-games upgrade Stage 1-3 follow-up — agent must orchestrate
 * psychological (8×8), cognitive (brain-games), and educational (subjects/topics)
 * development via a single profile that is measured, mapped, stored, and
 * continuously developed, feeding the recommended trajectory.
 *
 * Design: read-only snapshot tools + holistic trajectory recommender.
 * Veil rule: all player-facing values are felt-sense; raw numbers stay behind --dev/--json.
 * Timing rule: these tools never run a trial loop — they read stores only.
 */
import { ALL_LINES } from '../domain/Line.js';
import type { Significator } from '../domain/Significator.js';
import type { CognitiveIndex } from '../training/CognitiveIndex.js';
import type { TrialRecordStore } from '../braingame/TrialRecordStore.js';
import type { CalibrationStore } from '../adaptive/CalibrationStore.js';
import { computeCCI } from '../engines/CCIEngine.js';
import { toSnapshot } from '../domain/SignificatorSnapshot.js';
import { planWorkout } from '../training/WorkoutPlanner.js';
import { computeReviewCandidates } from '../curriculum/ForgettingCurve.js';
import { getCurriculumRegistry } from '../curriculum/CurriculumRegistry.js';
import { bridgeDevelopmentalToCurriculum } from '../curriculum/CurriculumBridge.js';
import { detectDevelopmentalNeeds } from '../curriculum/DevelopmentalNeedsDetector.js';
import { getCurriculumRegistry as getCurriculumRegistryForBridge } from '../curriculum/CurriculumRegistry.js';
import type { Line } from '../domain/Line.js';

// ── Service context ──────────────────────────────────────────────────
export interface UnifiedProfileServices {
  readonly getSignificator: () => Promise<Significator | null> | Significator | null;
  readonly cognitiveIndex: CognitiveIndex;
  readonly trials: TrialRecordStore;
  readonly calibration: CalibrationStore;
  readonly now: () => number;
}

// ── Tool schemas ─────────────────────────────────────────────────────
export const GET_DEVELOPMENTAL_SNAPSHOT_TOOL = {
  type: 'function' as const,
  function: {
    name: 'get_developmental_snapshot',
    description: 'Read the player\'s psychological developmental snapshot: per-line stage altitudes (8 lines × 8 stages), shadow ledger, drive fixation, CCI and ray profile. Use to understand where the player is and what wants to emerge. Translate into felt-sense for the player; never expose stage names or raw scores directly.',
    parameters: { type: 'object', properties: {}, required: [] as string[] },
  },
};

export const GET_KNOWLEDGE_SNAPSHOT_TOOL = {
  type: 'function' as const,
  function: {
    name: 'get_knowledge_snapshot',
    description: 'Read the player\'s educational knowledge state: concept coverage, depth distribution, retention health, review candidates, and recent study events. Use to decide what to study next. Felt-sense only for player.',
    parameters: { type: 'object', properties: {}, required: [] as string[] },
  },
};

export const GET_UNIFIED_PROFILE_TOOL = {
  type: 'function' as const,
  function: {
    name: 'get_unified_profile',
    description: 'Composite profile across psychological, cognitive, and educational development. Use as the single source of truth for trajectory planning. Returns felt-sense summaries for each domain plus staleness and confidence.',
    parameters: { type: 'object', properties: {}, required: [] as string[] },
  },
};

export const RECOMMEND_TRAJECTORY_TOOL = {
  type: 'function' as const,
  function: {
    name: 'recommend_trajectory',
    description: 'Recommend the optimal next 3-5 steps across developmental encounters, brain-game workouts, and curriculum study, balanced by time budget and decay. Present via ask_user_question before executing any step.',
    parameters: {
      type: 'object',
      properties: {
        minutes: { type: 'integer', minimum: 5, maximum: 45, description: 'Time budget for the next arc.' },
        focusLine: { type: 'string', enum: [...ALL_LINES], description: 'Optional line to bias toward.' },
      },
      required: ['minutes'] as string[],
    },
  },
};

export const STUDY_CONCEPT_TOOL = {
  type: 'function' as const,
  function: {
    name: 'study_concept',
    description: 'Schedule a curriculum study encounter on a specific concept. Returns the schedule details (concept, action, estimated minutes, rationale) so the agent can present it via ask_user_question. If no conceptId is given, the next most-relevant concept is selected from the player\'s review queue.',
    parameters: {
      type: 'object',
      properties: {
        conceptId: { type: 'string', description: 'Specific concept id from the curriculum registry; omit to use the next review candidate.' },
      },
      required: [] as string[],
    },
  },
};

// P1-B1 (Architecture Audit Phase B): expose ShadowDetector's deterministic
// detection as an LLM-callable tool. The LLM can use this to ground its
// shadow framing in real signals rather than guessing from 14 keywords.
export const DETECT_SHADOW_SIGNALS_TOOL = {
  type: 'function' as const,
  function: {
    name: 'detect_shadow_signals',
    description: 'Run deterministic shadow detection over the player\'s profile. Returns per-line addiction/allergy risk, unresolved shadow entries, behavioral patterns (avoidance, failure streaks), and Atman Project defense signals. Use to ground shadow framing in real signals rather than guessing. Output is felt-sense-shaped (qualitative descriptions, not raw numbers).',
    parameters: { type: 'object', properties: {}, required: [] as string[] },
  },
};

export const UNIFIED_PROFILE_TOOLS = [
  GET_DEVELOPMENTAL_SNAPSHOT_TOOL,
  GET_KNOWLEDGE_SNAPSHOT_TOOL,
  GET_UNIFIED_PROFILE_TOOL,
  RECOMMEND_TRAJECTORY_TOOL,
  STUDY_CONCEPT_TOOL,
  DETECT_SHADOW_SIGNALS_TOOL,
] as const;

export const UNIFIED_TOOL_NAMES: ReadonlySet<string> = new Set(UNIFIED_PROFILE_TOOLS.map(t => t.function.name));

export const UNIFIED_RULES_SUFFIX = `
12. UNIFIED ORCHESTRATION: You are an educational orchestrator across three developmental streams — psychological (8 lines × 8 stages), cognitive (brain-games), and educational (subjects/topics). Before choosing the next catalyst, read get_unified_profile (or the specific snapshot) — translate decay, shadows, and retention into felt-sense framing. Never expose stage names, percentiles, or raw RT.
13. TRAJECTORY: Use recommend_trajectory to produce a balanced 3–5 step arc (developmental encounter, brain-game, curriculum study) for the minutes available. Present the arc via ask_user_question and respect the player's choice. Each stream heals/evolves the others; do not isolate them.
14. CONTINUITY: The profile is measured, mapped, stored, and continuously developed. After each game or study event the stores (TrialRecordStore, CognitiveIndex, KnowledgeState) are already persisted — your job is to read the updated snapshot and re-bias the next catalyst, not to re-ask what you already know.`;

export interface UnifiedHandlerContext {
  readonly services: UnifiedProfileServices;
}

// ── Dispatcher ────────────────────────────────────────────────────────
export async function handleUnifiedProfileTool(name: string, argsJson: string, ctx: UnifiedHandlerContext): Promise<{ ok: boolean; payload: Record<string, unknown> }> {
  try {
    const args = argsJson.trim() ? (JSON.parse(argsJson) as Record<string, unknown>) : {};
    switch (name) {
      case 'get_developmental_snapshot': return await getDevelopmentalSnapshot(ctx.services);
      case 'get_knowledge_snapshot': return await getKnowledgeSnapshot(ctx.services);
      case 'get_unified_profile': return await getUnifiedProfile(ctx.services);
      case 'recommend_trajectory': return await recommendTrajectory(args, ctx.services);
      case 'study_concept': return await studyConcept(args, ctx.services);
      case 'detect_shadow_signals': return await detectShadowSignals(ctx.services);
      default: return { ok: false, payload: { error: `Unknown unified tool: ${name}` } };
    }
  } catch (err) {
    return { ok: false, payload: { error: `Unified profile tool failed: ${(err as Error).message}` } };
  }
}

async function getDevelopmentalSnapshot(services: UnifiedProfileServices) {
  const sig = await services.getSignificator();
  if (!sig) return { ok: true, payload: { empty: true, feltSense: 'no profile yet — the journey is just beginning' } };
  const snap = toSnapshot(sig as any);
  const cci = computeCCI(snap, sig as any);
  const altitudes = Object.entries((sig as any).altitudes ?? {}).map(([line, stage]) => ({ line, stage, feltSense: `steadiness in ${String(line).toLowerCase()}` }));
  const shadows = (snap.shadows.entries ?? []).filter((e: any) => e.resolvedAt === null).length;
  const drives = Object.entries(snap.fixationRisk ?? {}).map(([drive, risk]) => ({ drive, risk01: Math.round((risk as number) * 100) / 100 }));
  return {
    ok: true as const,
    payload: {
      currentStage: (sig as any).currentStage ?? null,
      altitudes,
      shadowsUnresolved: shadows,
      drives,
      cci: { composite: Math.round(cci.composite * 100) / 100, dominantDimension: cci.dominantDimension, feltSense: cci.composite > 0.6 ? 'integration humming' : cci.composite > 0.4 ? 'field settling' : 'foundations gathering' },
      rayProfile: (sig as any).rayProfile ?? null,
    },
  };
}

async function getKnowledgeSnapshot(services: UnifiedProfileServices) {
  const sig = await services.getSignificator();
  const knowledge: any = (sig as any)?.knowledge;
  if (!knowledge) return { ok: true as const, payload: { empty: true, feltSense: 'no study yet — the curriculum awaits' } };
  const conceptStates: Map<string, any> = knowledge.conceptStates ?? new Map();
  const forgettingCurves: Map<string, any> = knowledge.forgettingCurves ?? new Map();
  const reviewCandidates = computeReviewCandidates(conceptStates as any, forgettingCurves as any, services.now());
  const registry = (() => { try { return getCurriculumRegistry(); } catch { return null; } })();
  const totalHolons = registry ? (registry as any).size ?? 0 : 0;
  return {
    ok: true as const,
    payload: {
      conceptCount: conceptStates.size,
      totalHolons,
      reviewCandidates: reviewCandidates.slice(0, 5).map((c: any) => ({ conceptId: c.conceptId, urgency: Math.round(c.urgency * 100) / 100 })),
      feltSense: reviewCandidates.length > 3 ? 'several threads asking to be revisited' : reviewCandidates.length > 0 ? 'a quiet thread wants attention' : 'knowledge resting easy',
    },
  };
}

async function getUnifiedProfile(services: UnifiedProfileServices) {
  services.cognitiveIndex.applyDecay(services.now());
  const [dev, know] = await Promise.all([getDevelopmentalSnapshot(services), getKnowledgeSnapshot(services)]);
  const cogSnap = services.cognitiveIndex.snapshot(services.now());
  const stalest = [...cogSnap].sort((a, b) => b.lastPlayedDaysAgo - a.lastPlayedDaysAgo)[0];
  const cogFelt: Record<string, string> = {};
  for (const s of cogSnap) cogFelt[s.line] = services.cognitiveIndex.feltSenseFor(s.line as Line);
  return {
    ok: true as const,
    payload: {
      developmental: dev.payload,
      knowledge: know.payload,
      cognitive: { lines: cogSnap.map(s => ({ line: s.line, trend: s.trend, lastPlayedDaysAgo: s.lastPlayedDaysAgo, feltSense: cogFelt[s.line] })), stalestLine: stalest?.line ?? null },
      continuity: 'measured, mapped, stored, and developed — next catalyst should follow the trajectory',
    },
  };
}

async function recommendTrajectory(args: Record<string, unknown>, services: UnifiedProfileServices) {
  const minutes = Math.min(45, Math.max(5, Number(args.minutes ?? 12)));
  const focusLine = typeof args.focusLine === 'string' ? (args.focusLine as Line) : undefined;
  const cogPlan = planWorkout(services.cognitiveIndex, { minutes: Math.max(5, Math.min(12, Math.round(minutes * 0.4))), focusLine });
  const sig = await services.getSignificator();
  // P1-QW5 (Architecture Audit Phase A): Wire bridgeDevelopmentalToCurriculum
  // so the educational step uses real KnowledgeState + retention data instead
  // of a generic 'growth:edge' placeholder. The bridge converts theta/drive
  // needs into concrete curriculum recommendations.
  const trajectory: { kind: 'developmental' | 'cognitive' | 'educational'; id: string; rationale: string; feltSense: string; estimatedMinutes: number }[] = [];
  // Developmental: 1 growth-edge encounter.
  // Use detectDevelopmentalNeeds to surface an actual developmental need.
  let devStep: { kind: 'developmental'; id: string; rationale: string; feltSense: string; estimatedMinutes: number };
  if (sig) {
    const topNeed = detectDevelopmentalNeeds(sig as any)[0];
    if (topNeed) {
      devStep = {
        kind: 'developmental',
        id: `growth:${topNeed.line}`,
        rationale: `${topNeed.type}: ${topNeed.line} asking for attention`,
        feltSense: 'a quiet edge where the next step wants to form',
        estimatedMinutes: 3,
      };
    } else {
      devStep = {
        kind: 'developmental',
        id: focusLine ? `growth:${focusLine}` : 'growth:edge',
        rationale: 'growth edge — where altitude meets horizon',
        feltSense: 'a quiet edge where the next step wants to form',
        estimatedMinutes: 3,
      };
    }
  } else {
    devStep = {
      kind: 'developmental',
      id: 'growth:edge',
      rationale: 'growth edge — where altitude meets horizon',
      feltSense: 'a quiet edge where the next step wants to form',
      estimatedMinutes: 3,
    };
  }
  trajectory.push(devStep);
  // Cognitive: 1-2 workout items with felt-sense (player-facing) + rationale (agent context)
  for (const item of cogPlan.items.slice(0, 2)) {
    const felt = item.domains.length > 0
      ? services.cognitiveIndex.feltSenseFor(item.domains[0]!)
      : 'mind settling into focus';
    trajectory.push({ kind: 'cognitive', id: item.paradigmId, rationale: item.rationale, feltSense: felt, estimatedMinutes: item.estimatedMinutes });
  }
  // Educational: prefer the bridge-recommended concept if available; else review; else new material.
  const know = await getKnowledgeSnapshot(services);
  const review = (know.payload.reviewCandidates as any[])?.[0];
  let bridgeRec: { conceptId: string; rationale: string } | null = null;
  if (sig && sig.knowledge) {
    const needs = detectDevelopmentalNeeds(sig as any);
    const registry = (() => { try { return getCurriculumRegistryForBridge(); } catch { return null; } })();
    if (registry && needs.length > 0) {
      const concepts = new Map<string, { id: string; primaryLine: string; depthRange: { min: any; max: any } }>();
      for (const h of registry.getAll()) {
        concepts.set(h.id, {
          id: h.id,
          primaryLine: h.devMapping.primaryLine,
          depthRange: h.depthMeta.targetDepthRange,
        });
      }
      const curves = sig.knowledge.forgettingCurves ?? new Map();
      for (const need of needs) {
        const rec = bridgeDevelopmentalToCurriculum(need, sig.knowledge, concepts, curves as any, services.now());
        if (rec) { bridgeRec = { conceptId: rec.conceptId, rationale: rec.rationale }; break; }
      }
    }
  }
  if (bridgeRec) {
    trajectory.push({
      kind: 'educational',
      id: bridgeRec.conceptId,
      rationale: bridgeRec.rationale,
      feltSense: 'a study thread pulling at your attention',
      estimatedMinutes: 4,
    });
  } else if (review) {
    trajectory.push({
      kind: 'educational',
      id: review.conceptId,
      rationale: 'retention tugging — revisit before decay',
      feltSense: 'a quiet thread wanting attention',
      estimatedMinutes: 4,
    });
  } else if (sig) {
    trajectory.push({ kind: 'educational', id: 'new_material', rationale: 'foundations steady — new material beckons', feltSense: 'fresh material waiting to be met', estimatedMinutes: 4 });
  }
  const total = trajectory.reduce((s, t) => s + t.estimatedMinutes, 0);
  // Trim to minutes budget (keep developmental + at least one cognitive)
  let trimmed = trajectory;
  if (total > minutes) {
    const keep = [trajectory[0]!, ...trajectory.filter(t => t.kind === 'cognitive').slice(0, 1)];
    const remaining = minutes - keep.reduce((s, t) => s + t.estimatedMinutes, 0);
    if (remaining >= 3 && trajectory.find(t => t.kind === 'educational')) {
      keep.push(trajectory.find(t => t.kind === 'educational')!);
    }
    trimmed = keep.slice(0, 4);
  }
  return {
    ok: true as const,
    payload: {
      minutes,
      focusLine: focusLine ?? null,
      steps: trimmed.map(s => ({ kind: s.kind, id: s.id, minutes: s.estimatedMinutes, rationale: s.rationale, feltSense: s.feltSense })),
      totalMinutes: trimmed.reduce((s, t) => s + t.estimatedMinutes, 0),
      feltSense: 'a balanced arc — psyche, mind, and study in one movement',
    },
  };
}

// P1-QW7 (Architecture Audit Phase A): study_concept tool. Lets the LLM
// request a study encounter on a specific concept (or the next review
// candidate). Returns a ScheduledEncounter-like shape so the agent can
// present it via ask_user_question and then dispatch the encounter.
async function studyConcept(args: Record<string, unknown>, services: UnifiedProfileServices) {
  const sig = await services.getSignificator();
  if (!sig?.knowledge) {
    return { ok: false, payload: { error: 'No knowledge state — play a session first' } };
  }
  const conceptId = typeof args.conceptId === 'string' ? args.conceptId : undefined;
  let target: { conceptId: string; action: 'review' | 'new_material' | 'deepen'; rationale: string; estimatedMinutes: number; feltSense: string } | null = null;
  if (conceptId) {
    const cs = sig.knowledge.conceptStates.get(conceptId);
    const action: 'review' | 'new_material' | 'deepen' = cs ? 'review' : 'new_material';
    target = {
      conceptId,
      action,
      rationale: cs ? `Player-requested review of ${conceptId}` : `Player-requested study of ${conceptId}`,
      estimatedMinutes: 5,
      feltSense: 'a thread of study drawing your attention',
    };
  } else {
    // Pick the highest-urgency review candidate.
    const review = computeReviewCandidates(sig.knowledge.conceptStates as any, sig.knowledge.forgettingCurves as any, services.now())[0];
    if (review) {
      target = {
        conceptId: review.conceptId,
        action: 'review',
        rationale: `Highest-urgency review: retention ${(review.currentRetention * 100).toFixed(0)}%`,
        estimatedMinutes: 5,
        feltSense: 'a quiet thread wanting attention',
      };
    }
  }
  if (!target) {
    return { ok: false, payload: { error: 'No concept available — study something new material first' } };
  }
  return {
    ok: true as const,
    payload: {
      encounter: { ...target, kind: 'curriculum' as const },
      feltSense: 'a study encounter waiting to be met',
    },
  };
}

// P1-B1 (Architecture Audit Phase B): detect_shadow_signals handler.
// Wraps ShadowDetector's deterministic detection (drive-health formula +
// behavioral patterns + Atman Project defenses) into a single tool call.
// Output is felt-sense-shaped: qualitative descriptions, not raw scores.
async function detectShadowSignals(services: UnifiedProfileServices) {
  const sig = await services.getSignificator();
  if (!sig) return { ok: true, payload: { empty: true, feltSense: 'no profile yet' } };
  // Dynamic imports to avoid a circular dependency (unifiedProfileTools is
  // imported by AgenticOrchestrator, and ShadowDetector imports Significator).
  const { detectShadows, diagnoseShadows, assessAtmanProject, computeBehavioralPatterns } = await import('../usecases/ShadowDetector.js');
  const encounters = (sig as any).encounters ?? [];
  const patterns = computeBehavioralPatterns(encounters);
  const shadows = detectShadows(sig as any, patterns);
  const diagnoses = diagnoseShadows(sig as any);
  const atman = assessAtmanProject(sig as any, encounters);

  return {
    ok: true as const,
    payload: {
      shadowSignals: shadows.map((s: any) => ({
        type: s.type,
        line: s.line,
        feltSense: shadowFeltSenseFor(s.type),
      })),
      diagnoses: diagnoses.slice(0, 5).map((d: any) => ({
        line: d.line,
        stage: d.stage,
        pathology: d.dominantPathology,
        feltSense: d.dominantPathology === 'addiction'
          ? 'a familiar pull that clings'
          : 'a flinching-away from contact',
      })),
      atmanDefenses: atman.defenses.map((d: any) => ({
        defense: d.defense,
        intensity: Math.round(d.intensity * 100) / 100,
        feltSense: atmanFeltSenseFor(d.defense),
      })),
      jonahComplex: atman.jonahComplex.detected
        ? { feltSense: atman.jonahComplex.description }
        : null,
      overallAtmanPressure: Math.round(atman.overallAtmanPressure * 100) / 100,
      feltSense: atman.overallAtmanPressure > 0.5
        ? 'shadows pressing in — old patterns wanting attention'
        : 'shadows resting easy',
    },
  };
}

function shadowFeltSenseFor(type: string): string {
  switch (type) {
    case 'fixation': return 'a familiar pull that clings';
    case 'repression': return 'a flinching-away from contact';
    case 'regression': return 'a defensive shutdown';
    case 'goldenAllergy': return 'a resistance to what wants to emerge';
    default: return 'an undertone seeking attention';
  }
}

function atmanFeltSenseFor(defense: string): string {
  switch (defense) {
    case 'rationalization': return 'treating transcendence as impossible';
    case 'isolation': return 'maintaining a rigid self-boundary';
    case 'desacralizing': return 'stripping meaning from experience';
    case 'substitution': return 'substituting finite gratification for growth';
    default: return 'a defense against emergence';
  }
}

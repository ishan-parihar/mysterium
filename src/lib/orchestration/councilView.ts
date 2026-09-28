/**
 * The PLAYER-FACING projection of the council dispatcher (`/delegate`).
 *
 * Why this module exists at all: the `43 §4.7` prompt rule 13 says **role vocabulary is internal** —
 * "role names (T1, A1, J4, therapist…), triggers, tool names and proposal kinds are never spoken
 * to the player". The dispatcher's own data (`TRIGGER_TABLE`) is built entirely in that internal
 * vocabulary: 11 rows named `crisis` / `threshold-proximity` / `depth-plateau`, each summoning roles
 * like `therapist` and `J4`. Rendering the table directly — the obvious thing to do when you are
 * building a route whose job is "render the triggers" — would put every one of those names on a
 * player-facing screen. That is a canon violation, so the projection lives HERE instead, in one
 * place, and the route renders only what this module emits.
 *
 * The laws this module holds (all pre-existing; none invented for the UI):
 *
 *  1. **No internal vocabulary crosses the boundary** (43 §4.7 r13). A summon is described by what
 *     the *frame becomes* — the ruling's own language, `docs/foundations/43` §3.3's table column
 *     "The frame becomes" — not by the role ids behind it. The role count is reportable; the role
 *     names are not. `:INTERNAL` is the sentinel a leak test asserts on.
 *  2. **Precedence is the ruling, so order is the data** (`43 §3.3`). The rows are emitted in
 *     `TRIGGER_TABLE` order, each carrying its own rank, so the UI cannot reorder the law by
 *     sorting on an unranked field.
 *  3. **Determinism is a claim about the kernel, not about the clock** (MY-AD-0022, `43 §3.3`).
 *     Nothing here reads `Date.now()`; two renders of the same state produce the same text.
 *  4. **A refusal is a first-class outcome** (`45 §6.1`, mirrored by `authorizeBandRead`). Every
 *     skipped summons carries a player-readable reason, because a silent skip hides a wiring defect
 *     (that is exactly the comment `councilTools.ts` `runSummons` carries).
 *  5. **Bypass is not a scene** (rule 14). A crisis dispatch is reported as the frame stopping being
 *     a game, and the projection never dresses it as content.
 *
 * Nothing here reads or writes state, and nothing here decides who is summoned — `dispatchCouncil`
 * owns that. This module only decides how a decided summon is *said*.
 */

import {
  TRIGGER_TABLE,
  ALL_TRIGGERS,
  dispatchCouncil,
  observationForTrigger,
  type CouncilObservation,
  type DispatchState,
  type Summon,
  type SummonTrigger,
} from '$core/orchestration/dispatcher.js';
import { AGENT_ROLE_COUNCIL } from '$core/orchestration/councilStanding.js';
import type { AgentRole } from '$core/orchestration/types.js';

/**
 * The sentinel every internal-vocabulary leak test looks for: an agent role id, a trigger slug, a
 * tool name or a proposal kind. Exported so the guard below and the route's test share ONE string
 * rather than a regex each.
 */
export const INTERNAL_VOCABULARY_MARKER = 'INTERNAL-VOCABULARY';

/** One row of the trigger table, said in player-facing language. */
export interface CouncilTriggerView {
  /** The internal trigger id — the route NEVER renders this; it is here for the rank/count only. */
  readonly trigger: SummonTrigger;
  /** 1-based precedence from `TRIGGER_TABLE` order. Crisis is 1; the ordinary encounter is last. */
  readonly rank: number;
  /** The state that fires this row, in the words of `43 §3.3`'s table. Never a predicate source. */
  readonly occasion: string;
  /** What the frame becomes — the ruling's own column, and the only thing a player is told. */
  readonly frameBecomes: string;
  /** How many figures appear in the foreground. A count is not a name. */
  readonly presenceCount: number;
  /** True when the frame stops being a game (the crisis bypass, `43 §4.7`). */
  readonly bypass: boolean;
  /** Who called it, in plain words — never the internal `Summoner` vocabulary. */
  readonly calledBy: string;
  /** True when this row summons nobody into the foreground (the loop-health row). */
  readonly infrastructureOnly: boolean;
}

/** The result of one requested dispatch, as the player is shown it. */
export interface DispatchView {
  readonly trigger: SummonTrigger;
  readonly rank: number;
  readonly frameBecomes: string;
  readonly bypass: boolean;
  /** Foreground presence, in presence order — COUNT only; the names are internal. */
  readonly presenceCount: number;
  /** Roles working behind the curtain. Reported as a count: the player never meets them. */
  readonly backgroundCount: number;
  /**
   * The two questions a summon is supposed to be judged on, in prose: what changed, and what it
   * means for the frame. Deterministic given the state (law 3).
   */
  readonly whatChanged: string;
  readonly whatItMeans: string;
  /** Refusals and skips, each with a reason (law 4). Empty when nothing was withheld. */
  readonly withheld: readonly WithheldView[];
}

export interface WithheldView {
  /** The internal role id — a DEBUG/test affordance, rendered nowhere; the route shows only why. */
  readonly role: AgentRole;
  readonly reason: string;
}

// ── The internal→player translation ────────────────────────────────────────────────────────────
//
// One table, per the "table is data" law the dispatcher already follows. A new trigger row is one
// entry here and one there; nothing in the route ever names a role.

/**
 * What each internal trigger is CALLED, in the player's language. Keyed by the trigger id, so a
 * trigger added to `TRIGGER_TABLE` without a row here is a type error, not a silent blank.
 */
const OCCASION: Readonly<Record<SummonTrigger, string>> = {
  crisis: 'Something heavier than the game turns up',
  'threshold-proximity': 'The ground shifts — a threshold draws near',
  'shadow-work-warranted': 'Material is ready to be worked',
  'placement-unknown': 'Your placement on this line is not yet known',
  'pack-intake-due': 'A measurement instrument is due',
  'consent-change': 'You ask what is held about you, or change a consent grant',
  'depth-plateau': 'Repeated passes without movement',
  'retention-decay': 'Something consolidated is fading',
  'reflection-written': 'A reflection has been written',
  'loop-health': 'The loop checks its own health',
  'encounter-open': 'An ordinary encounter opens',
};

/** The ruling's own column: what the frame becomes (`docs/foundations/43` §3.3). */
const FRAME_BECOMES: Readonly<Record<SummonTrigger, string>> = {
  crisis: 'plainly human — not a scene',
  'threshold-proximity': 'the world reorganises; several figures arrive at once',
  'shadow-work-warranted': 'a companion sits with the heavy thing',
  'placement-unknown': 'a threshold trial',
  'pack-intake-due': 'an honest instrument, explicitly not the game',
  'consent-change': 'out of the fiction, plainly and consented',
  'depth-plateau': 'a mentor who explains rather than tests',
  'retention-decay': 'remembering, with someone',
  'reflection-written': "a mirror returns the player's own words",
  'loop-health': 'nothing — the player never meets this one',
  'encounter-open': "the encounter's own guide meets the player in the scene",
};

/** `Summoner` in prose. The internal vocabulary (bypass/strategy/journal/player/tick) stays inside. */
const CALLED_BY: Readonly<Record<Summon['summoner'], string>> = {
  bypass: 'a safety rule, not a choice',
  strategy: 'the shape of the session',
  journal: 'what you just wrote',
  player: 'you',
  tick: 'the clock, off-stage',
};

/** How the summon answers a player who asked "what was that?" — the frame, in the second person. */
const WHAT_IT_MEANS: Readonly<Record<SummonTrigger, string>> = {
  crisis: 'The game stops. What is here is plainly a conversation, and it takes priority over everything else on this page.',
  'threshold-proximity': 'The whole council is assembled. The frame is meant to change, and it changes for everyone at once.',
  'shadow-work-warranted': 'Something you set down earlier is ready to be worked through, with a companion rather than alone.',
  'placement-unknown': 'The line is not placed yet, so a trial is offered before the real work begins.',
  'pack-intake-due': 'An instrument is being offered. It is explicitly not the game, and it says so.',
  'consent-change': 'You asked about your own record. The answer comes plainly, outside the fiction, and nothing is decided without you.',
  'depth-plateau': 'The same ground has been crossed three times without movement, so a mentor arrives to explain rather than test.',
  'retention-decay': 'Something that had settled is fading, so a revisit is framed as remembering with someone.',
  'reflection-written': 'Your own words are the input. A mirror returns them to you.',
  'loop-health': 'Infrastructure work happened off-stage. You were not part of it and you will not see it.',
  'encounter-open': 'Nothing has shifted. The encounter brings its own guide, as an ordinary opening does.',
};

/**
 * Every trigger row, in `TRIGGER_TABLE` order, projected for display.
 *
 * Derived from the table rather than restated, so the displayed order IS the law's order: if a row
 * is added, moved, or removed upstream, this list follows without a second edit (law 2). `presenceCount`
 * is computed by asking the table's own `roles()` on the canonical minimal state for that row
 * (`observationForTrigger`) — the same inverse `dispatchCouncil` uses — so the count can never
 * disagree with what a real dispatch of that row summons.
 */
export function councilTriggerViews(): readonly CouncilTriggerView[] {
  return TRIGGER_TABLE.map((row, i) => {
    const observation = observationForTrigger(row.trigger);
    const summoned = row.roles(observation);
    // Law 3: background roles are excluded from the foreground by construction in `dispatchCouncil`;
    // this counts the same way so the displayed number matches the dispatch.
    const background = row.background ?? ['S2'];
    const foreground = summoned.filter((r) => !background.includes(r));
    return {
      trigger: row.trigger,
      rank: i + 1,
      occasion: OCCASION[row.trigger],
      frameBecomes: FRAME_BECOMES[row.trigger],
      presenceCount: foreground.length,
      bypass: row.bypass === true,
      calledBy: CALLED_BY[row.summoner],
      infrastructureOnly: foreground.length === 0,
    };
  });
}

/** The triggers a player may request a dispatch for. The crisis row is included — see `noteOnCrisis`. */
export function requestableTriggers(): readonly SummonTrigger[] {
  return ALL_TRIGGERS;
}

/**
 * Why the crisis row appears in a player-facing list at all.
 *
 * A crisis is the one trigger that is NEVER a summons the player should be able to conjure for
 * pleasure: `43 §4.7` calls it a bypass, and rule 14 says a bypass is not a scene. The row is
 * offered because the page's job is to show the pacing law honestly, and hiding the one row that
 * stops the game would be a bigger lie. The UI renders this as a read-only ruling, not a button.
 */
export const CRISIS_TRIGGER: SummonTrigger = 'crisis';

/**
 * Run a real dispatch and project it for the player.
 *
 * `dispatchCouncil` does the deciding; this only says it. The `seed` affects presence ORDER, never
 * membership (law 3, `MY-AD-0022`), which is why the view reports a count and not a sequence.
 *
 * Note what is NOT carried through: `Summon.rationale`. It is the dispatcher's own explanation and
 * it is written in the internal register — "a crisis pattern is present", "the loop-health tick
 * fired" — so a view type that exposed it would be a loaded gun pointed at the next route. The
 * `whatChanged` / `whatItMeans` pair is the player-facing replacement, and the route renders those.
 */
export function dispatchView(state: DispatchState, withheld: readonly WithheldView[] = []): DispatchView {
  const summon = dispatchCouncil(state);
  const row = TRIGGER_TABLE.find((r) => r.trigger === summon.trigger);
  return {
    trigger: summon.trigger,
    rank: (row ? TRIGGER_TABLE.indexOf(row) : TRIGGER_TABLE.length) + 1,
    frameBecomes: FRAME_BECOMES[summon.trigger],
    bypass: summon.bypass,
    presenceCount: summon.roles.length,
    backgroundCount: summon.background.length,
    whatChanged: OCCASION[summon.trigger],
    whatItMeans: WHAT_IT_MEANS[summon.trigger],
    withheld,
  };
}

/** The canonical state a single named trigger fires — the only supported way to request one. */
export function observationFor(trigger: SummonTrigger, cellIntent: CouncilObservation['cellIntent'] = 'game'): CouncilObservation {
  return observationForTrigger(trigger, cellIntent);
}

// ── The role-vocabulary wall ───────────────────────────────────────────────────────────────────

/**
 * Every agent role id, plus the tool names and proposal kinds that share the internal register.
 * Used by the guard below and by the route's test, so "the UI may not say `therapist`" is one
 * assertion over one list.
 */
const INTERNAL_TERMS: readonly string[] = [
  ...Object.keys(AGENT_ROLE_COUNCIL),
  ...ALL_TRIGGERS,
  'summon_council',
  'schedule_presence',
  'delegate_session',
  'pack_score',
  'mastery_evidence',
  'retention_estimate',
  'shadow_entry',
  'encounter_record',
];

/**
 * Does this player-facing text leak a name the internal register owns?
 *
 * Word-boundary matching on a case-insensitive basis, so `crisis` is caught inside prose and `A1`
 * inside `A1.` but `thread` is not caught by `r` alone. This is the guard the route's test drives
 * over EVERY string the page can display (all trigger views, all dispatch views, all the prose
 * above). A guard nobody runs is decoration; the route test runs this one over the real render set.
 */
export function leaksInternalVocabulary(text: string): boolean {
  const haystack = text.toLowerCase();
  return INTERNAL_TERMS.some((term) => new RegExp(`\\b${term.toLowerCase()}\\b`).test(haystack));
}

/**
 * The authored probe content — 47 §7's probe set as PLAYABLE CONTENT.
 *
 * 47 §7: a probe is a playable encounter (never a questionnaire item) that discriminates between
 * two poles of a T1 distinction by confronting the player with a situation where the two would
 * choose DIFFERENTLY. The situation must be stage-neutral enough that the player's CHOICE reveals
 * the meta-program rather than their altitude — the distinction being probed is a preference
 * structure (§2's red line: meta-programs are not stages), so the probe confronts options, not
 * capacities.
 *
 * The poles are TAG ids (the store's flavour vocabulary) because that is where readings flow —
 * into the UDV's interest graph and the dialectic engine's fluent-tag set (46 §5). Both poles of
 * every probe resolve in the initial tag store; the constructor validates.
 *
 * RV status: NONE of these instruments has passed 12 §5.4's RV1–RV7 yet — they are authored and
 * runnable, and their readings are LOG-ONLY until validation runs (probeSet.ts enforces the band).
 * This is the honest state: content exists, validation is a data-collection programme.
 */

import type { Probe } from './probeSet.js';

/**
 * The T1 distinctions (47 §4's catalogue, the load-bearing set) with one authored playable probe
 * each. Each situation: one scene, immediate and recoverable stakes (the `moment-press` scaffold
 * shape — cheapest to recover from), two clearly differentiable action-poles.
 */
export const AUTHORED_PROBES: readonly Probe[] = [
  {
    id: 'probe-options-vs-procedure',
    distinction: 'options-first vs procedure-first',
    poleA: 'exploration', // options-first: open field, choose from consequences
    poleB: 'craft',       // procedure-first: the known way, executed well
    modality: 'ScenarioChoice',
    situation:
      'You are handed a sealed workshop. Two doors. Through the first: a master artisan mid-work who will train you their exact method, start to finish, no deviations. Through the second: an unlit hall of unlocked rooms where the only instruction is "the exits are all real — pick anything, break anything, the consequence is yours." Everyone in the hall chose their door for a reason. Which door do you walk through?',
    rvPassed: false,
    rvEvidence: [],
  },
  {
    id: 'probe-in-time-vs-through-time',
    distinction: 'in-time vs through-time',
    poleA: 'ritual',       // in-time: the moment is total
    poleB: 'architecture', // through-time: the structure across years decides
    modality: 'ScenarioChoice',
    situation:
      'The bridge festival happens once in a generation — tomorrow. Your closest friend is being honored at it; they asked you to stand beside them. But the foundations of your own house shifted overnight: an inspection at the same hour will decide whether the home you are still paying for stands or falls. You cannot attend both. Where are you tomorrow at noon?',
    rvPassed: false,
    rvEvidence: [],
  },
  {
    id: 'probe-proactive-vs-reactive',
    distinction: 'proactive vs reactive',
    poleA: 'warfare',    // proactive: strike, set the terms
    poleB: 'medicine',   // responsive: read, then answer what is actually there
    modality: 'ScenarioChoice',
    situation:
      'A rumor reaches you ahead of the plague-cart: three villages over, fever. The cart arrives at your gate in an hour — you can load it with your own supplies and drive it to the fever yourself, ahead of anyone\'s request. Or you can wait at your post: when the sick arrive at your door, you will treat exactly what walks in. The fever does not negotiate; the choice is only about who moves first. What do you do with the hour?',
    rvPassed: false,
    rvEvidence: [],
  },
  {
    id: 'probe-specific-vs-global',
    distinction: 'specific vs global',
    poleA: 'craft',         // specific: the one perfect joint
    poleB: 'architecture',  // global: the whole plan at once
    modality: 'ScenarioChoice',
    situation:
      'The cathedral is behind and the master-builder offers you one of two commissions. First: a single doorway, the most intricate joinery of your career, perfect and small and seen by every person who enters forever. Second: the master plan of the whole eastern wing — every room, every proportion, yours to set, with a hundred hands executing it roughly. You may take exactly one. Which one, and why does it pull at you?',
    rvPassed: false,
    rvEvidence: [],
  },
  {
    id: 'probe-toward-vs-away',
    distinction: 'toward-pleasure vs away-from-pain',
    poleA: 'exploration', // toward: the lure
    poleB: 'law',         // away: the wall
    modality: 'ScenarioChoice',
    situation:
      'Two inheritances, and you may keep only one. The first: your grandmother\'s maps — coastlines no chart records, a sea route marked "the harbor that is always worth finding." The second: your grandfather\'s fortress deed — walls that have never fallen, grain vaults against every recorded famine. One is a promise of something found; the other, a guarantee against being lost. Which one is yours?',
    rvPassed: false,
    rvEvidence: [],
  },
  {
    id: 'probe-sameness-vs-difference',
    distinction: 'sameness vs difference preference',
    poleA: 'kindred',       // sameness: like the ones I know
    poleB: 'technology',    // difference: the radically new
    modality: 'ScenarioChoice',
    situation:
      'A season of settling. The valley offers two homesteads at the same price. The first sits in your home valley: the dialect is yours, the neighbors know your family, the shape of every day is familiar. The second is a frontier town two months\' travel out, built by people from everywhere, where nothing about the days matches anything you have done — and the workshops are better than anywhere. Which homestead?',
    rvPassed: false,
    rvEvidence: [],
  },
  {
    id: 'probe-independent-vs-cooperative',
    distinction: 'independent vs cooperative working',
    poleA: 'exploration', // solo: the lone ascent
    poleB: 'kindred',     // together: the roped team
    modality: 'ScenarioChoice',
    situation:
      'The mountain grants two permits for the season\'s last window. You can take both and go alone — your pace, your judgment, no one\'s life in your hands but yours. Or you can bring the other climber: slower, more belays, but the summit ridge is treacherous this late and no one has crossed it solo. The mountain does not care which. Who goes up the mountain?',
    rvPassed: false,
    rvEvidence: [],
  },
  {
    id: 'probe-internal-vs-external-reference',
    distinction: 'internal vs external reference',
    poleA: 'law',      // external: the standard decides
    poleB: 'ritual',   // internal: the felt sense of the rite done rightly
    modality: 'ScenarioChoice',
    situation:
      'Your year of work stands finished in the guild hall. The masters\' jury scores it tomorrow; tonight, you are alone with it. You know — privately, completely — that it is not what you meant it to be: three flaws only you can see, in places no juror will ever look. The question is not whether to show it. It is this: if the jury scores it highest of the year, whose judgment of your work will you carry home — theirs, or the one you just had?',
    rvPassed: false,
    rvEvidence: [],
  },
];

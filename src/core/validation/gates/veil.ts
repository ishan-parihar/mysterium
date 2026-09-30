/**
 * Veil gates — G10–G12: what the player may be told, and what may be measured about them.
 *
 * Split out of `gates.ts` (module-cohesion audit item 2). These gates audit the *presentation* and
 * the *identity* boundary rather than the engine's model.
 *
 * Spec: docs/validation/BENCHMARK-ARCHITECTURE.md §6.
 */

import { PERSONAS } from '../personas.js';
import { runPersonaTrajectory } from '../harness.js';
import { describeStage } from '../../presentation/veilDescriptors.js';
import type { Line } from '../../domain/Line.js';
import type { KnowledgeState } from '../../curriculum/types.js';
import fs from 'node:fs';
import path from 'node:path';
import { buildLineLadder, buildSyllabusLadder, evaluateLineLevel, evaluateSyllabusLevel, DEFAULT_LEVELLING_CONFIG, EMPTY_PRIOR } from '../../curriculum/LevellingEngine.js';
import type { GateResult } from './plumbing.js';

// ---------------------------------------------------------------------------
// G10 — Veil invariants (the guide's ethics)
// ---------------------------------------------------------------------------

const SCORE_TOKEN = /\b\d+(\.\d+)?\b/;

const ALLOWED_WORDS = new Set(['One']);

export function validateVeilCompliance(): GateResult {
  for (const persona of PERSONAS) {
    const r = runPersonaTrajectory(persona);
    const sig = r.sessions[r.sessions.length - 1]!.sig;
    const description = describeStage(sig.currentStage);
    const tokens = description.match(SCORE_TOKEN) ?? [];
    const leaked = tokens.filter((t) => !ALLOWED_WORDS.has(t));
    if (leaked.length > 0) {
      return {
        gate: 'G10-veil-compliance', passed: false, hard: true,
        details: `describeStage(${sig.currentStage}) leaked score-like tokens: ${leaked.join(', ')} — "${description}"`,
      };
    }
  }
  return { gate: 'G10-veil-compliance', passed: true, hard: true, details: 'no score tokens in Veil descriptors for any persona terminal state' };
}

// ---------------------------------------------------------------------------
// G11 — Levelling mechanism (doc 42): demographic-blindness + laws
// ---------------------------------------------------------------------------

/** Vocabulary that must never appear in levelling thresholds or inputs. */
const FORBIDDEN_VOCAB = /\b(age|ages|boy|girl|male|female|gender|sex|race|ethnic|minority|iq)\b|\bold\b|\byears?[- ]?old\b|\bgrade[- ]?(band|level)\b/i;

/**
 * D2: lints the levelling engine source itself for demographic vocabulary —
 * the mechanism cannot express an age proxy without using these words.
 * D1+D3 (behavioral): identical evidence ⇒ identical evaluation, regardless
 * of any field not in the input shape (type-enforced), and deterministic.
 */
export function validateLevellingMechanism(): GateResult {
  // D2 — source lint: the mechanism cannot express an age proxy without the
  // forbidden vocabulary. Falls back to linting the exposed constants when
  // source is unavailable (bundled environments).
  let src = '';
  try {
    const p = path.resolve(process.cwd(), 'src/core/curriculum/LevellingEngine.ts');
    if (fs.existsSync(p)) src = fs.readFileSync(p, 'utf8');
  } catch {
    src = '';
  }
  if (!src) src = JSON.stringify(DEFAULT_LEVELLING_CONFIG);
  // Strip comments before matching — D2 forbids demographic vocabulary in
  // CODE (identifiers, thresholds, branches), not in prose that states the
  // policy itself. The doc-comment may say "age must never be an input";
  // the code must never say `if (age < 18)`.
  const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const vocabHit = codeOnly.match(FORBIDDEN_VOCAB);
  if (vocabHit) {
    return {
      gate: 'G11-levelling-mechanism', passed: false, hard: true,
      details: `demographic vocabulary "${vocabHit[0]}" found in levelling engine — forbidden by doc 42 §3.8 D2`,
    };
  }

  // D3 — determinism: identical evidence ⇒ identical evaluation.
  const now = 1_700_000_000_000;
  const altitudes = { Cognitive: 'Amber', Emotional: 'Red', Moral: 'Red', Intrapersonal: 'Magenta', Spiritual: 'Magenta', Somatic: 'Magenta', Willpower: 'Red', Interpersonal: 'Red' } as const;
  const baseInputs = { altitudes, theta: { lastEncounter: {} }, shadows: [] as never[], nowMs: now };
  const a = evaluateLineLevel(baseInputs, 'Cognitive');
  const b = evaluateLineLevel(baseInputs, 'Cognitive');
  if (a.evidenceScore !== b.evidenceScore || a.currentRung !== b.currentRung) {
    return { gate: 'G11-levelling-mechanism', passed: false, hard: true, details: 'line evaluation is not deterministic for identical inputs' };
  }

  // Evidence law: raising altitude must raise the computed rung.
  const raised = { ...baseInputs, altitudes: { ...altitudes, Cognitive: 'Orange' as const } };
  const raisedEval = evaluateLineLevel(raised, 'Cognitive');
  if (raisedEval.currentRung <= a.currentRung) {
    return { gate: 'G11-levelling-mechanism', passed: false, hard: true, details: 'raising altitude did not raise the computed rung — levelling is not evidence-driven' };
  }

  // Holonic integrity: an unresolved same-line shadow at/below the stage caps evidence.
  const shadowed = {
    ...baseInputs,
    shadows: [{
      id: 'g11-s1', quadrant: 'DarkAddiction' as const, line: 'Cognitive' as Line,
      stage: 'Amber' as const, drive: 'Eros' as const, surfacedAt: now - 1_000,
      resolvedAt: null, recurrenceCount: 0, compoundPartner: null, severity: 0.5,
    }],
  };
  const shadowedEval = evaluateLineLevel(shadowed, 'Cognitive');
  if (shadowedEval.cappedBy !== 'shadows') {
    return { gate: 'G11-levelling-mechanism', passed: false, hard: true, details: 'unresolved same-line shadow did not cap line evidence (holonic integrity gate inactive)' };
  }

  // Syllabus ladder: no evidence ⇒ rung 0, score 0.
  const emptyKnowledge: KnowledgeState = {
    conceptStates: new Map(),
    subjectProgress: new Map(),
    studyHistory: [],
    learningProfile: { preferredModalities: [], metacognitionScore: 0.5, calibrationAccuracy: 0.5, transferCapacity: 0.5, studyEfficiency: 0.5 },
  };
  const syll = evaluateSyllabusLevel(emptyKnowledge, [], DEFAULT_LEVELLING_CONFIG, EMPTY_PRIOR);
  if (syll.evidenceScore !== 0 || syll.currentRung !== 0) {
    return { gate: 'G11-levelling-mechanism', passed: false, hard: true, details: `empty syllabus evidence must be rung 0 (got rung ${syll.currentRung}, score ${syll.evidenceScore})` };
  }

  // Ladder shape: both families expose 8 rungs with monotone bars.
  const lineLadder = buildLineLadder('Cognitive');
  const syllLadder = buildSyllabusLadder('cs');
  if (lineLadder.rungs.length !== 8 || syllLadder.rungs.length !== 8) {
    return { gate: 'G11-levelling-mechanism', passed: false, hard: true, details: 'ladders must expose exactly 8 rungs' };
  }

  return { gate: 'G11-levelling-mechanism', passed: true, hard: true, details: 'levelling deterministic, evidence-driven, shadow-gated; no demographic vocabulary in engine' };
}

// ---------------------------------------------------------------------------
// G12 — Identity firewall (doc 42 §1.1, doc 16 §2.1):
// measurement paths must not import the healing/identity layer
// ---------------------------------------------------------------------------

/**
 * The competence/identity firewall: identity context exists FOR HEALING
 * (voicing/texture via projectHealingContext) and must be structurally
 * unreachable from measurement machinery. Asserts by source lint:
 *   - src/core/curriculum/**, src/core/engines/**, src/core/adaptive/** must
 *     not import HealingContext or IdentityProfile.
 *   - The projector must check consent (isFieldUsable) before any field use.
 *   - The Significator's identity field stays OPTIONAL (consent-gated existence).
 */
export function validateIdentityFirewall(): GateResult {
  let ok = true;
  const problems: string[] = [];
  try {
    const roots = ['src/core/curriculum', 'src/core/engines', 'src/core/adaptive'];
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      let entries: fs.Dirent[] = [];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
      for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...walk(p));
        else if (e.name.endsWith('.ts')) out.push(p);
      }
      return out;
    };
    for (const root of roots) {
      for (const file of walk(path.resolve(process.cwd(), root))) {
        const src = fs.readFileSync(file, 'utf8');
        const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
        if (/HealingContext|projectHealingContext|IdentityProfile/.test(code)) {
          ok = false;
          problems.push(`${file} references the identity/healing layer`);
        }
      }
    }
    // The projector must be consent-checked: source must call isFieldUsable.
    const hcPath = path.resolve(process.cwd(), 'src/core/healing/HealingContext.ts');
    if (fs.existsSync(hcPath)) {
      const hc = fs.readFileSync(hcPath, 'utf8');
      if (!hc.includes('isFieldUsable')) {
        ok = false;
        problems.push('HealingContext projector does not check per-field consent (isFieldUsable)');
      }
    }
    // Consent-gated existence: identity must be optional on the Significator type.
    const sigPath = path.resolve(process.cwd(), 'src/core/domain/Significator.ts');
    if (fs.existsSync(sigPath)) {
      const sigSrc = fs.readFileSync(sigPath, 'utf8');
      if (!/readonly identity\?\s*:\s*IdentityProfile/.test(sigSrc)) {
        ok = false;
        problems.push('Significator.identity must be optional (consent-gated existence)');
      }
    }
  } catch (err) {
    return { gate: 'G12-identity-firewall', passed: false, hard: true, details: `firewall check failed to run: ${err}` };
  }
  if (!ok) {
    return { gate: 'G12-identity-firewall', passed: false, hard: true, details: `identity firewall breached: ${problems.join('; ')}` };
  }
  return { gate: 'G12-identity-firewall', passed: true, hard: true, details: 'measurement paths clean of identity imports; projector consent-checked; identity optional on Significator' };
}

// ---------------------------------------------------------------------------
// G54 — closed-register values never reach a player-facing template
// ---------------------------------------------------------------------------

/**
 * The closed register class, as the field-level names a template would interpolate.
 *
 * 20 §11.1 puts polarity and shadow in the CLOSED class — "never to the player, at any stage".
 * These are the concrete spellings a Svelte template would reach for. `data-*` attributes and
 * script bodies are excluded below because they are not rendered.
 */
const CLOSED_REGISTER_INTERPOLATIONS: readonly RegExp[] = [
  /\{[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*\.(polarity|quadrant|severity)\}/,
  /\{[a-zA-Z_$][\w$]*\.(polarity|quadrant|severity)\s*\}/,
];

/** The literal closed-class words that must not appear as rendered text. */
const CLOSED_REGISTER_LITERALS: readonly string[] = [
  'DarkAddiction',
  'DarkAllergy',
  'GoldenAddiction',
  'GoldenAllergy',
];

function svelteFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        walk(path.join(dir, entry.name));
        continue;
      }
      if (entry.name.endsWith('.svelte')) out.push(path.join(dir, entry.name));
    }
  };
  walk(root);
  return out;
}

/**
 * Strip comments, `data-*` attributes, and the `<script>` block — none of which render.
 *
 * `data-polarity` is the legitimate carrier: it is not displayed and not announced by assistive
 * technology, and the submit path reads the value from the option object rather than the DOM.
 */
function renderedRegionsOf(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/\bdata-[\w-]+\s*=\s*\{[^}]*\}/g, '');
}

export function validateClosedRegisterNotRendered(): GateResult {
  const gate = 'G54 closed-register values never reach a player-facing template';
  try {
    const files = svelteFiles(path.join(process.cwd(), 'src'));
    if (files.length === 0) {
      return { gate, passed: false, hard: true, details: 'no .svelte files enumerated — the gate would pass on an empty scan, so it measures nothing' };
    }
    const offenders: string[] = [];
    for (const file of files) {
      const rendered = renderedRegionsOf(fs.readFileSync(file, 'utf-8'));
      for (const re of CLOSED_REGISTER_INTERPOLATIONS) {
        if (re.test(rendered)) offenders.push(`${path.relative(process.cwd(), file)} matches ${re}`);
      }
      for (const lit of CLOSED_REGISTER_LITERALS) {
        if (new RegExp(`>\\s*\\{?\\s*${lit}\\b`).test(rendered) || new RegExp(`\\{\\s*${lit}\\b`).test(rendered)) {
          offenders.push(`${path.relative(process.cwd(), file)} renders the closed literal ${lit}`);
        }
      }
    }
    if (offenders.length > 0) {
      return {
        gate,
        passed: false,
        hard: true,
        details: `${offenders.length} closed-register leak(s): ${offenders.slice(0, 6).join('; ')} — polarity/shadow are CLOSED (20 §11.1); keep them on a non-rendered carrier such as data-*`,
      };
    }
    return {
      gate,
      passed: true,
      hard: true,
      details: `${files.length} .svelte files scanned; no closed-register polarity/shadow value reaches a rendered region`,
    };
  } catch (err) {
    return { gate, passed: false, hard: true, details: `gate threw: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ---------------------------------------------------------------------------
// G55 — a keyed each is never keyed on a field that can repeat
// ---------------------------------------------------------------------------

/**
 * G55: a keyed `{#each … (x.field)}` whose `field` is not unique in the data renders NOTHING.
 *
 * Svelte treats a duplicate key as a hard invariant failure, and it fails the whole component tree
 * — so one duplicate row in a corpus took down an entire page. The `/glossary` corpus defines
 * 'Transformation' at both tier1 and tier2, the list was keyed on `term`, and the last item in the
 * app's navigation rendered a blank screen. No test failed and `tsc` was clean: the failure only
 * exists in the browser, on the exact data a player has.
 *
 * The gate cannot prove any field is unique for every future corpus, so it pins the two properties
 * that are checkable statically: no keyed `each` may key on a field this gate knows repeats, and the
 * known-repeating corpora must actually repeat (so a future de-duplication turns this gate red and
 * gets it deleted rather than left as decoration).
 */
const REPEATABLE_KEY_FIELDS: readonly string[] = ['term'];

function keyedEachBlocks(source: string): string[] {
  return [...source.matchAll(/\{\#each\s+[^}]*?\((\w+)\.(\w+)\)\}/g)].map((m) => `${m[1]}.${m[2]}`);
}

export function validateKeyedEachKeys(): GateResult {
  const gate = 'G55 a keyed each is never keyed on a field that can repeat';
  try {
    const files = svelteFiles(path.join(process.cwd(), 'src'));
    if (files.length === 0) {
      return { gate, passed: false, hard: true, details: 'no .svelte files enumerated — the gate would pass on an empty scan' };
    }
    const offenders: string[] = [];
    for (const file of files) {
      for (const block of keyedEachBlocks(fs.readFileSync(file, 'utf-8'))) {
        const field = block.split('.')[1]!;
        if (REPEATABLE_KEY_FIELDS.includes(field)) {
          offenders.push(`${path.relative(process.cwd(), file)} keys an each on ${block}, and \`${field}\` repeats in the corpus`);
        }
      }
    }

    // The second half: the corpus MUST still contain the duplicate this gate exists for. If someone
    // de-duplicates `term`, this fails and the gate gets removed in the same commit — a gate that
    // outlives its reason is decoration (MY-RG-0010).
    const glossary = fs.readFileSync(path.join(process.cwd(), 'src/core/data/glossary.ts'), 'utf-8');
    const terms = [...glossary.matchAll(/\{ term: '([^']+)'/g)].map((m) => m[1]!);
    const dupes = terms.filter((t, i) => terms.indexOf(t) !== i);
    if (dupes.length === 0) {
      return { gate, passed: false, hard: true, details: 'no duplicate glossary term remains — G55 was written for a repeat-key crash that no longer exists, so delete this gate rather than leave it green' };
    }

    if (offenders.length > 0) {
      return { gate, passed: false, hard: true, details: `${offenders.join('; ')} — corpus still repeats: ${[...new Set(dupes)].join(', ')}` };
    }
    return { gate, passed: true, hard: true, details: `${files.length} .svelte files scanned; no each is keyed on a repeating field (corpus still repeats: ${[...new Set(dupes)].join(', ')})` };
  } catch (err) {
    return { gate, passed: false, hard: true, details: `gate threw: ${err instanceof Error ? err.message : String(err)}` };
  }
}

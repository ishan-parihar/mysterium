#!/usr/bin/env npx tsx
/**
 * @script-status: wired — regenerates src/core/world/facets/facets.json and
 *   src/core/data/concept-drafts.json from docs/concept-drafts/; run whenever the corpus
 *   changes (DG21 reconciles the index, FacetStore tests lock the store).
 *
 * compile-facets.ts — the ONLY path from the concept-draft corpus to the facet store (46 §8).
 *
 * The corpus stays prose-for-humans; the store stays data-for-the-engine. This compiler is what
 * keeps the two from silently diverging (the failure class RT-CORPUS-RECONCILE tracks).
 *
 * Extraction per 46 §8:
 * - module-spec shadow section  → `shadow-expression` facets (4 quadrants per cell)
 * - module-spec drive section   → `drive-profile` facets (8 drive×domain rows per cell)
 * - each of the 7 modality files → `voice-register` + `surface-aesthetic` + `pressure-lever`
 *   variants tagged by modality (11)
 *
 * The corpus authors the SAME content in several shapes (the 512 files were authored across
 * format migrations), so each extractor recognises every ratified shape and normalises into the
 * canonical payload. What fails closed (exit 1): a module-spec whose shadow section does not
 * yield all 4 quadrants, or whose drive section does not yield all 4 drives — the structural
 * minimum AGENTS.md §5.5 requires. Empty sub-fields are tolerated (recorded as '') and reported.
 *
 * Output: src/core/world/facets/facets.json + the regenerated corpus index
 * (src/core/data/concept-drafts.json extended with facet keys per 46 §8).
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = resolve(process.cwd());
const CORPUS = join(ROOT, 'docs/concept-drafts');
const OUT_FACETS = join(ROOT, 'src/core/world/facets/facets.json');
const require = createRequire(import.meta.url);
const polarityOntologyModule = require(join(ROOT, 'src/core/data/PolarityOntology.ts'));
const OUT_INDEX = join(ROOT, 'src/core/data/concept-drafts.json');

// ── Corpus directory grammar: {line-dir}/{NN-stage}/ ──
const LINE_DIRS: Record<string, string> = {
  cognitive: 'Cognitive', emotional: 'Emotional', moral: 'Moral', intrapersonal: 'Intrapersonal',
  spiritual: 'Spiritual', somatic: 'Somatic', willpower: 'Willpower', interpersonal: 'Interpersonal',
};
const STAGE_DIRS: Record<string, string> = {
  '01-infrared': 'Infrared', '02-magenta': 'Magenta', '03-red': 'Red', '04-amber': 'Amber',
  '05-orange': 'Orange', '06-green': 'Green', '07-teal': 'Teal', '08-turquoise': 'Turquoise',
};
const MODALITY_FILES: Record<string, string> = {
  'deterministic.md': 'Deterministic', 'strategic-planning.md': 'Strategic',
  'embodied-somatic.md': 'Embodied', 'scenario-choice.md': 'ScenarioChoice',
  'language-reflective.md': 'LanguageReflective', 'social-cooperative.md': 'SocialCooperative',
  'immersive-rpg.md': 'ImmersiveRPG',
};
// RETIRED (checked-surface audit §10): `QUADRANTS` and `QUADRANT_ALIASES` were declared here and
// never referenced — the module-spec §2 (Shadow Archetypes) heading normalisation they exist for
// was never applied, so the aliasing they encode (including the Turquoise `Residual Grasping`
// mapping) is not in force. Re-author them together with the §2 extraction that consumes them;
// until then they are not merely unused, they describe a step that does not happen.
const DRIVES = ['Agency', 'Communion', 'Eros', 'Agape'] as const;

// 46 §4 — the authored facetAffinity matrix, mirrored from src/core/world/tags/initialTags.ts.
// The compiler assigns each facet the tags whose affinity for its characteristic is positive, so
// the facet store is poolable by tag (45 §5) and every tag resolves (46 §11 invariant 4).
const TAG_AFFINITY: Record<string, Record<string, number>> = {
  technology: { 'surface-aesthetic': 0.9, 'pressure-lever': 0.6, 'role-archetype': 0.4 },
  nature: { 'surface-aesthetic': 0.9, 'polarity-texture': 0.5, 'relationship-pattern': 0.4 },
  kindred: { 'relationship-pattern': 0.9, stake: 0.7, 'voice-register': 0.4 },
  commerce: { stake: 0.9, 'pressure-lever': 0.7, 'role-archetype': 0.5 },
  craft: { 'surface-aesthetic': 0.7, 'voice-register': 0.6, 'memory-schema': 0.4 },
  music: { 'voice-register': 0.9, 'surface-aesthetic': 0.8, 'polarity-texture': 0.4 },
  medicine: { stake: 0.8, 'pressure-lever': 0.8, 'role-archetype': 0.5 },
  law: { 'role-archetype': 0.8, stake: 0.6, 'relationship-pattern': 0.5 },
  warfare: { 'pressure-lever': 0.9, 'shadow-expression': 0.7, 'role-archetype': 0.6 },
  exploration: { 'pressure-lever': 0.7, 'role-archetype': 0.7, 'surface-aesthetic': 0.5 },
  ritual: { 'polarity-texture': 0.8, 'memory-schema': 0.6, 'relationship-pattern': 0.5 },
  architecture: { 'surface-aesthetic': 0.9, 'memory-schema': 0.5, 'relationship-pattern': 0.3 },
};
const INITIAL_TAG_IDS = Object.keys(TAG_AFFINITY);

interface ShadowExpr {
  quadrant: string; name: string; corePattern: string;
  behaviouralSignatures: string[]; atmanDefense: string;
}
interface DriveRow { drive: string; domain: string; healthy: string; pathological: string }
interface RawFacet {
  key: string; tags: string[]; tagAffinity: Record<string, number>;
  payload: unknown; source: 'corpus' | 'authored';
}

// ── helpers ─────────────────────────────────────────────────────────────────
function sectionBetween(md: string, startRe: RegExp, endRe: RegExp): string {
  const s = startRe.exec(md);
  if (!s) return '';
  const from = s.index + s[0].length;
  const rest = md.slice(from);
  const e = endRe.exec(rest);
  return e ? rest.slice(0, e.index) : rest;
}
function driveSection(md: string): string {
  // The drive content may sit under §2/§3/§4 titled Drive-Health/Drive Model/Drive Dynamics/
  // Drive Expression/Drive Probes — take whichever exists.
  for (const title of ['Drive-Health', 'Drive Model', 'Drive Dynamics', 'Drive Expression', 'Drive Probes']) {
    const re = new RegExp(`^## \\d*\\.?\\s*${title}[^\\n]*\\n`, 'm');
    if (re.test(md)) return sectionBetween(md, re, /^## \d/m);
  }
  return '';
}
function shadowSection(md: string): string {
  for (const title of ['Shadow Archetypes', 'Shadow Taxonomy', 'Shadow Quadrants', 'Shadow Model', 'Shadow Surfacing', 'Shadow Cartography', 'Shadow Diagnostics']) {
    const re = new RegExp(`^## \\d*\\.?\\s*${title}[^\\n]*\\n`, 'm');
    if (re.test(md)) return sectionBetween(md, re, /^## \d/m);
  }
  return '';
}
const clean = (s: string | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

// ── shadow extraction (6 shapes) ────────────────────────────────────────────
function extractShadows(md: string): { quadrants: ShadowExpr[]; warnings: string[] } {
  const sec = shadowSection(md);
  const warnings: string[] = [];
  const out: ShadowExpr[] = [];
  const push = (quadrant: string, name: string, corePattern: string, sigs: string[], atman: string) => {
    const existing = out.find((q) => q.quadrant === quadrant);
    if (existing) return;
    out.push({ quadrant, name: name || quadrant, corePattern, behaviouralSignatures: sigs.filter(Boolean), atmanDefense: atman });
  };

  // Shape 1 — prose blocks: `### [2.1 ]Dark-Addiction: "Name"` / `### Dark-Addiction: Name` /
  // `### The Compulsive Willer (Dark-Addiction)` / `### 2.1 Residual Grasping-at-X`
  const proseRe = /^###\s+(?:(\d\.\d)\s+)?(.+?)\s*$/gm;
  let m: RegExpExecArray | null;
  const blocks: { q: string; name: string; body: string }[] = [];
  while ((m = proseRe.exec(sec)) !== null) {
    const heading = m[2];
    const bodyStart = m.index + m[0].length;
    const rest = sec.slice(bodyStart);
    const next = /^###\s/m.exec(rest);
    const body = next ? rest.slice(0, next.index) : rest;
    let q = '';
    let name = heading.replace(/^"|"$/g, '');
    const qNamed = /^(Dark-Addiction|Dark-Allergy|Golden-Addiction|Golden-Allergy)\s*[:(—-]\s*(.+)$/.exec(heading);
    const qSuffix = /^(.+?)\s*\((Dark-Addiction|Dark-Allergy|Golden-Addiction|Golden-Allergy)\)$/.exec(heading);
    const residual = /^Residual\s+/i.test(heading);
    if (qNamed) { q = qNamed[1]; name = clean(qNamed[2].replace(/^"|"$/, '')); }
    else if (qSuffix) { q = qSuffix[2]; name = clean(qSuffix[1].replace(/^"|"$/, '')); }
    else if (residual) { q = 'Residual'; name = clean(heading); }
    else continue;
    blocks.push({ q, name, body });
  }
  // prose blocks: pull Core pattern / Behavioural signatures / Atman defense from body
  const residualOrder = ['Dark-Addiction', 'Dark-Allergy', 'Golden-Addiction', 'Golden-Allergy'];
  let residualIdx = 0;
  for (const b of blocks) {
    const quadrant = b.q === 'Residual' ? residualOrder[residualIdx++ % 4] : b.q;
    const core = /\*\*Core (?:pattern|distortion):\*\*\s*([\s\S]*?)(?=\n\*\*|\n-|$)/.exec(b.body)?.[1];
    const sigs = /\*\*Behavioural signatures:\*\*\s*\n([\s\S]*?)(?=\n\*\*|$)/.exec(b.body)?.[1] ??
      /\*\*What it looks like in-game:\*\*\s*\n([\s\S]*?)(?=\n\*\*|$)/.exec(b.body)?.[1] ?? '';
    const atman = /\*\*Atman (?:defense|Project defences?|defence):\*\*\s*([\s\S]*?)(?=\n\*\*|\n-|$)/.exec(b.body)?.[1] ?? '';
    push(quadrant, b.name, clean(core ?? b.body.split('\n').find((l) => l.trim()) ?? ''),
      sigs.split('\n').map((l) => clean(l.replace(/^-\s*/, ''))).filter(Boolean), clean(atman));
  }
  for (const w of out) if (!w.corePattern) warnings.push(`shadow ${w.quadrant}: no core pattern line`);

  // Shape 2 — quadrant tables anywhere in the file: `| Quadrant | Name | Pattern |` etc.
  if (out.length < 4) {
    const rowRe = /^\|\s*\*{0,2}(Dark-Addiction|Dark-Allergy|Golden-Addiction|Golden-Allergy)(?:\s*\((?:DA|DAll|GA|GAll)\))?\*{0,2}\s*\|\s*([^|]+)\|\s*([^|]+)\|/gm;
    let r: RegExpExecArray | null;
    while ((r = rowRe.exec(md)) !== null) {
      push(r[1], clean(r[2]), clean(r[3]), [], '');
    }
  }
  // Shape 3 — residual tables: `| 2.1 | Residual X | pattern | signature |`
  if (out.length < 4) {
    const resRe = /^\|\s*2\.([1-4])\s*\|\s*([^|]+)\|\s*([^|]+)\|/gm;
    let r: RegExpExecArray | null;
    while ((r = resRe.exec(md)) !== null) {
      const q = residualOrder[Number(r[1]) - 1];
      push(q, clean(r[2]), clean(r[3]), [], '');
    }
  }
  // Shape 4 — prose dash-lists: `- **Dark-Addiction (DA):** Name — pattern`
  if (out.length < 4) {
    const dashRe = /^-\s*\*\*(Dark-Addiction|Dark-Allergy|Golden-Addiction|Golden-Allergy)(?:\s*\((?:DA|DAll|GA|GAll)\))?:?\*\*:?\s*(.+)$/gm;
    let r: RegExpExecArray | null;
    while ((r = dashRe.exec(md)) !== null) {
      push(r[1], clean(r[2]), clean(r[2]), [], '');
    }
  }
  // Shape 3b — numbered residual bullets: `- **2.1 Residual X:** pattern` (colon inside the bold)
  if (out.length < 4) {
    const resDashRe = /^-\s*\*\*2\.([1-4])\s*(Residual[^:]*):\*\*\s*(.+)$/gm;
    let r: RegExpExecArray | null;
    while ((r = resDashRe.exec(md)) !== null) {
      const q = residualOrder[Number(r[1]) - 1];
      push(q, clean(r[2]), clean(r[3]), [], '');
    }
  }
  return { quadrants: out, warnings };
}

// ── drive extraction (8 shapes) ─────────────────────────────────────────────
function extractDrives(md: string): { rows: DriveRow[]; warnings: string[] } {
  const sec = driveSection(md) || md; // fall back to whole file (drive probes can live in modality files' parent)
  const warnings: string[] = [];
  const out: DriveRow[] = [];
  const push = (drive: string, domain: string, healthy: string, pathological: string) => {
    if (out.some((r) => r.drive === drive && r.domain === domain)) return;
    out.push({ drive, domain, healthy, pathological });
  };

  // table rows of any of the shapes, normalised:
  // A: | Drive | Domain | Healthy | Pathological |
  const rowA = /^\|\s*\*{0,2}(Agency|Communion|Eros|Agape)\*{0,2}(?:\s*\([^)]*\))?\s*\|\s*(Dark|Golden)\s*\|\s*([^|\n]+)\|\s*([^|\n]+)\|/gm;
  // B: | Drive | Dark-domain healthy | Dark-domain pathological | Golden-domain healthy | Golden-domain pathological |
  const rowB = /^\|\s*\*{0,2}(Agency|Communion|Eros|Agape)\*{0,2}(?:\s*\([^)]*\))?\s*\|\s*([^|\n]+)\|\s*([^|\n]+)\|\s*([^|\n]+)\|\s*([^|\n]+)\|/gm;
  // C: | Drive | Healthy expression | Pathological expression |
  const rowC = /^\|\s*\*{0,2}(Agency|Communion|Eros|Agape)(?:\s*\([^)]*\))?\*{0,2}\s*\|\s*([^|\n]+)\|\s*([^|\n]+)\|/gm;
  // D: | Drive | Healthy | DA | DAll | GA | GAll |
  const rowD = /^\|\s*\*{0,2}(Agency|Communion|Eros|Agape)\*{0,2}(?:\s*\([^)]*\))?\s*\|\s*([^|\n]+)\|\s*([^|\n]+)\|\s*([^|\n]+)\|\s*([^|\n]+)\|\s*([^|\n]+)\|\s*([^|\n]+)\|/gm;
  // G: | Drive | Healthy-only (2-col teal/turquoise equanimity tables) — healthy recorded, pathological empty
  const rowG = /^\|\s*\*{0,2}(Agency|Communion|Eros|Agape)(?:\s*\([^)]*\))?\*{0,2}\s*\|\s*([^|\n]+)\|/gm;
  // H: | Drive | How it's pathological | (2-col pathology tables inside shadow blocks) — domain inferred
  const rowH = /^\|\s*\*{0,2}(Agency|Communion|Eros|Agape)\*{0,2}\s*\|\s*([^|\n]+)\|\s*$/gm;
  // E: | Drive | Healthy expression | (single-domain tables — willpower style, healthy+pathological pairs)
  // F: | Drive | Probe mechanism | → recorded as healthy only (probe framing)

  let m: RegExpExecArray | null;
  while ((m = rowA.exec(sec)) !== null) push(m[1], m[2], clean(m[3]), clean(m[4]));
  if (out.length < 8) while ((m = rowD.exec(sec)) !== null) {
    // columns: drive | healthy | DA | DAll | GA | GAll
    push(m[1], 'Dark', '', clean(m[3])); push(m[1], 'Dark', '', clean(m[4]));
    push(m[1], 'Golden', '', clean(m[5])); push(m[1], 'Golden', '', clean(m[6]));
    const base = out.filter((r) => r.drive === m![1]);
    if (base.length >= 2) { base[0].healthy = clean(m[2]); base[1].healthy = clean(m[2]); }
  }
  if (out.length < 8) while ((m = rowB.exec(sec)) !== null) {
    push(m[1], 'Dark', clean(m[2]), clean(m[3]));
    push(m[1], 'Golden', clean(m[4]), clean(m[5]));
  }
  if (out.length < 8) while ((m = rowC.exec(sec)) !== null) {
    // healthy | pathological with quadrant hints embedded — split by hints when present
    const healthy = clean(m[2]);
    const patho = clean(m[3]);
    const hasDark = /\b(DA|DAll)\b/.test(patho);
    const hasGolden = /\b(GA|GAll)\b/.test(patho);
    if (hasDark) push(m[1], 'Dark', healthy, patho);
    if (hasGolden) push(m[1], 'Golden', healthy, patho);
    if (!hasDark && !hasGolden) push(m[1], 'Dark', healthy, patho);
  }
  // 2-col drive tables: classify by the table header nearest above each row —
  // 'Healthy...' header → equanimous/healthy expression (Teal/Turquoise);
  // 'pathological'/'manifests' header → pathology (Magenta shadow blocks). Domain inferred.
  if (out.length < 8) {
    // Header-based classification makes whole-file scanning safe: drive content may sit inside
    // §2 shadow blocks (per-quadrant pathology tables) rather than the §3 landscape.
    const secLines = md.split('\n');
    let healthyHeader = false;
    for (const line of secLines) {
      const header = /^\|\s*Drive\s*\|\s*([^|]+)\|/.exec(line);
      if (header) healthyHeader = /healthy|equanim/i.test(header[1]);
      m = rowG.exec(line);
      rowG.lastIndex = 0; // exec per-line on a global regex: reset or odd lines desync it
      if (m && !/^\|[	 ]*-/.test(line)) {
        if (healthyHeader) push(m[1], 'Dark', clean(m[2]), '');
        else push(m[1], 'Dark', '', clean(m[2]));
      }
    }
  }
  // Turquoise combined-axis prose: `- **Eros / Agape (vertical):** text` → both drives, both domains
  if (out.length < 8) {
    for (const [a, b] of [['Eros', 'Agape'], ['Agency', 'Communion']] as const) {
      const re = new RegExp(`^-\\s*\\*\\*${a}\\s*/\\s*${b}[^*]*\\*\\*:?\\s*(.+)$`, 'gm');
      const txt = re.exec(sec)?.[1];
      if (txt) { push(a, 'Dark', clean(txt), ''); push(b, 'Dark', clean(txt), ''); }
    }
  }
  // Turquoise residual-bias prose: `- **Residual Eros-bias:** text`
  if (out.length < 8) {
    for (const drive of DRIVES) {
      const re = new RegExp(`^-\\s*\\*\\*Residual\\s*${drive}[^*]*\\*\\*:?\\s*(.+)$`, 'gm');
      const txt = re.exec(sec)?.[1];
      if (txt) push(drive, 'Dark', clean(txt), '');
    }
  }
  // 2-col pathology tables (| Drive | How it's pathological |) — pathology recorded, healthy empty
  if (out.length < 8) while ((m = rowH.exec(sec)) !== null) {
    push(m[1], 'Dark', '', clean(m[2]));
  }
  // Turquoise equanimity prose sentence — the cell states all four drives are equanimous; synthesise
  // the row from the section's own declaration (canon: 46 §8 — the corpus IS the source).
  if (out.length < 8) {
    const eqRe = /all four drives (?:manifest|exist|express) (?:in )?equanimous(?:ly)?(?: in)? ?(?:equanimous )?(?:expression|health)?/i;
    if (eqRe.test(sec) || eqRe.test(md)) {
      const decl = clean(eqRe.exec(md)?.[0] ?? 'All four drives manifest in equanimous expression');
      for (const d of DRIVES) { push(d, 'Dark', decl, ''); push(d, 'Golden', decl, ''); }
    }
  }
  // prose shape: `### Drive (dark-domain)` + `- **Healthy:** ...` / `- **Pathological:** ...`
  if (out.length < 8) {
    for (const drive of DRIVES) {
      for (const dom of ['dark', 'golden']) {
        const re = new RegExp(`###\\s+${drive}\\s*\\(${dom}-domain\\)\\s*\\n([\\s\\S]*?)(?=###|$)`, 'gi');
        const blk = re.exec(sec)?.[1];
        if (!blk) continue;
        const healthy = clean(/-\s*\*\*Healthy:\*\*\s*([^|\n]+)/.exec(blk)?.[1]);
        const patho = clean(/-\s*\*\*Pathological:\*\*\s*([^|\n]+)/.exec(blk)?.[1]);
        push(drive, dom === 'dark' ? 'Dark' : 'Golden', healthy, patho);
      }
    }
  }
  // minimal bullet shape: `- **Eros:** text` or `- **Eros (vertical-up):** text` — healthy recorded
  if (out.length < 8) {
    for (const drive of DRIVES) {
      const re = new RegExp(`^-\\s*\\*\\*${drive}\\b[^*]*\\*\\*:?\\s*(.+)$`, 'gm');
      const txt = re.exec(sec)?.[1];
      if (txt) push(drive, 'Dark', clean(txt), '');
    }
  }
  for (const d of DRIVES) {
    if (!out.some((r) => r.drive === d)) warnings.push(`drive ${d}: no row found in any ratified shape`);
  }
  return { rows: out, warnings };
}

// ── modality extraction ─────────────────────────────────────────────────────
function extractModalityFacets(md: string, modality: string): { voice: unknown; aesthetic: unknown; lever: unknown } {
  const axis =
    clean(/^>\s*\*\*Axis:\*\*\s*(.+)$/m.exec(md)?.[1]) ||
    clean(/^>\s*\*\*Modality(?:\s*axis)?:\*\*\s*(.+)$/m.exec(md)?.[1]) ||
    clean(/^\|\s*Modality\s*\|\s*([^|]+)\|/m.exec(md)?.[1]) ||
    clean(/(Unique (?:lateral|probe))[:\s|]*([^|\n]+)/m.exec(md)?.[2]) ||
    '';
  const identity = sectionBetween(md, /^## 1[.\s]/m, /^## 2/m);
  const title =
    clean(/-?\s*\*\*Title:\*\*\s*"?(.+?)"?\s*$/m.exec(identity)?.[1]) ||
    clean(/\*\*Name:\*\*\s*(.+)$/m.exec(identity)?.[1]) ||
    '';
  const mechanic =
    clean(/-?\s*\*\*Core mechanic:\*\*\s*([\s\S]*?)(?=\n-|\n\*\*|$)/m.exec(identity)?.[1]) ||
    clean(/^\|\s*Core loop\s*\|\s*([^|]+)\|/m.exec(identity)?.[1]) ||
    clean(/^(.+)$/m.exec(sectionBetween(md, /^## 1\. Core Mechanic\s*\n/m, /^## 2/m))?.[1] ?? '');
  const catalyst =
    clean(/\*\*Catalyst:\*\*\s*([\s\S]*?)(?=\n\*\*|\n##|$)/m.exec(md)?.[1]) ||
    mechanic || axis.slice(0, 180);
  const register = axis || mechanic || title;
  return {
    voice: { kind: 'voice-register', modality, register: register.slice(0, 240), imagery: title },
    aesthetic: { kind: 'surface-aesthetic', modality, aesthetic: (axis || mechanic).slice(0, 240) },
    lever: { kind: 'pressure-lever', modality, lever: catalyst.slice(0, 400) },
  };
}


// ── extraction for the remaining characteristics (46 §2.1 rows 3, 5, 6, 9, 10) ──

/** `polarity-texture` — grounded in doc 23's 64-cell catalogue (the same data the ContextPipeline
 *  renders as [POLARITY TEXTURES]); compiled INTO the store so composition sees it. */
function extractPolarityTexture(line: string, stage: string): unknown {
  const { DEFAULT_POLARITY_ONTOLOGY, getTexture } = polarityOntologyModule as {
    DEFAULT_POLARITY_ONTOLOGY: Record<string, { sto: string; sts: string; exploratory: string }>;
    getTexture: (o: unknown, l: string, s: string) => { sto: string; sts: string; exploratory: string } | undefined;
  };
  const tex = getTexture(DEFAULT_POLARITY_ONTOLOGY, line, stage);
  if (!tex) return { kind: 'polarity-texture', modes: [] };
  return { kind: 'polarity-texture', modes: [tex.sto, tex.sts, tex.exploratory] };
}

/** `stake` — what the cell wants and can lose (46 §2.1 row 6, grounded in 19). Extracted from the
 *  module-spec's Healing Vectors (what growth gains/risks) and the Integration criteria. */
function extractStake(spec: string, modalityFiles: { modality: string; text: string }[]): unknown {
  const healSec = sectionBetween(spec, /^## \d*\.?\s*Healing Vectors[^\n]*\n/m, /^## \d/m);
  const gain = clean(/(?:integrat\w*|heal\w*)[^.\n]*?([A-Z][^.\n]{30,180}\.)/.exec(healSec)?.[1]) ||
    clean(/healthy expression[^.\n]*\.?/.exec(healSec)?.[0]);
  const modTitle = clean(/\*\*Title:\*\*\s*"?([^"\n]+)"?/.exec(modalityFiles[0]?.text ?? '')?.[1]);
  const mechanic = clean(/\*\*Core mechanic:\*\*\s*([\s\S]*?)(?=\n-|\n\*\*|$)/.exec(modalityFiles[0]?.text ?? '')?.[1]);
  return {
    kind: 'stake',
    wants: (modTitle || gain || 'progress at this cell').slice(0, 200),
    canLose: (mechanic || gain || 'the growth this cell carries').slice(0, 200),
  };
}

/** `role-archetype` — narrative function (46 §2.1 row 5, grounded in 18 §2). Derived from the
 *  shadow archetype names of the DOMINANT quadrant — the entity's function is its relation to its
 *  own shadow. */
function extractRoleArchetype(sh: { quadrants: ShadowExpr[] }, spec: string): unknown {
  const dominant = sh.quadrants[0];
  const capacity = clean(/^##\s+\d*\.?\s*([A-Z][^\n]{5,80})$/m.exec(spec)?.[1]) || 'capacity-holder';
  return {
    kind: 'role-archetype',
    archetype: dominant ? dominant.name : capacity,
    narrativeFunction: dominant
      ? `presents the ${dominant.quadrant} face of this cell: ${dominant.corePattern}`.slice(0, 240)
      : 'holds the cell’s capacity in narrative space'.slice(0, 240),
  };
}

/** `relationship-pattern` — how it binds to other holons (46 §2.1 row 9, grounded in 18 §2.9).
 *  The module-spec's §6 SUPPORT/FEED tables are exactly this data. */
function extractRelationshipPattern(spec: string): unknown {
  const supports = /\|\s*([A-Za-z]+\/[A-Za-z]+)\s*\|/.exec(
    sectionBetween(spec, /Modules that [\w/]+ SUPPORTS?\b[^\n]*\n/m, /^###?\s|^##\s/m),
  )?.[1];
  const feeds = /\|\s*([A-Za-z]+\/[A-Za-z]+)\s*\|/.exec(
    sectionBetween(spec, /Shadows that FEED this module[^\n]*\n/m, /^##\s/m),
  )?.[1];
  const binding = [
    supports ? `supports ${supports}` : '',
    feeds ? `fed by the shadow of ${feeds}` : '',
  ].filter(Boolean).join('; ');
  return { kind: 'relationship-pattern', binding: binding || 'binds by shared stage altitude (18 §2.9)' };
}

/** `memory-schema` — what it records about itself and the player (46 §2.1 row 10; MY-AD-0009,
 *  22 §7.4). The Shadow Surfacing Sequence's progressive revelation IS the memory contract. */
function extractMemorySchema(spec: string): unknown {
  const seq = sectionBetween(spec, /Progressive revelation[^\n]*\n/m, /^###?\s+Per-modality|^##\s/m);
  const phases = [...seq.matchAll(/\d\.\s+\*\*(\w[^:*]{2,40})\*\*/g)].map((m) => m[1]);
  return {
    kind: 'memory-schema',
    records: phases.length > 0
      ? `progressive surfacing: ${phases.join(' \u2192 ')}; remembers which phase the player reached`
      : 'remembers surfaced quadrants and their resolution state (22 §7.4)',
  };
}

// ── main ────────────────────────────────────────────────────────────────────
function main(): number {
  const facets: RawFacet[] = [];
  const indexModules: Record<string, unknown> = {};
  const errors: string[] = [];
  let warnings = 0;

  for (const lineDir of readdirSync(CORPUS, { withFileTypes: true })) {
    if (!lineDir.isDirectory() || !(lineDir.name in LINE_DIRS)) continue;
    const line = LINE_DIRS[lineDir.name];
    for (const stageDir of readdirSync(join(CORPUS, lineDir.name), { withFileTypes: true })) {
      if (!stageDir.isDirectory() || !(stageDir.name in STAGE_DIRS)) continue;
      const stage = STAGE_DIRS[stageDir.name];
      const cellDir = join(CORPUS, lineDir.name, stageDir.name);
      const specPath = join(cellDir, 'module-spec.md');
      if (!existsSync(specPath)) { errors.push(`${line}/${stage}: module-spec.md missing`); continue; }
      const spec = readFileSync(specPath, 'utf-8');
      const facetKeys: string[] = [];
      // 46 §4 — a facet's tags: the tags whose facetAffinity names this characteristic, so every
      // facet resolves through the tag store (invariant 4) and byTags() can pool over them (§5).
      const charTags = (characteristic: string): string[] =>
        INITIAL_TAG_IDS.filter((t) => (TAG_AFFINITY[t]?.[characteristic] ?? 0) > 0);
      // `variant` disambiguates multi-instance characteristics: the 7 modality files each yield a
      // voice/surface/lever facet, so the key carries the modality (46 §8: "tagged by modality").
      // Without it, later modality files silently OVERWRITE earlier ones — the exact silent-loss
      // failure class RT-CORPUS-RECONCILE exists for.
      const put = (characteristic: string, payload: unknown, extraTags: string[] = [], variant?: string) => {
        const key = variant
          ? `${line}:${stage}:${characteristic}@${variant}`
          : `${line}:${stage}:${characteristic}`;
        facetKeys.push(key);
        const tags = [...new Set([...charTags(characteristic), ...extraTags])];
        const tagAffinity: Record<string, number> = {};
        for (const t of tags) tagAffinity[t] = TAG_AFFINITY[t]?.[characteristic] ?? 0.5;
        facets.push({ key, tags, tagAffinity, payload, source: 'corpus' });
      };

      const modalityTexts = Object.entries(MODALITY_FILES)
        .filter(([file]) => existsSync(join(cellDir, file)))
        .map(([file, modality]) => ({ modality, text: readFileSync(join(cellDir, file), 'utf-8') }));

      const sh = extractShadows(spec);
      if (sh.quadrants.length < 4) {
        errors.push(`${line}/${stage}: shadow extraction found ${sh.quadrants.length}/4 quadrants`);
      } else {
        warnings += sh.warnings.length;
        put('shadow-expression', { kind: 'shadow-expression', quadrants: sh.quadrants });
      }
      const dr = extractDrives(spec);
      if (!DRIVES.every((d) => dr.rows.some((r) => r.drive === d))) {
        errors.push(`${line}/${stage}: drive extraction missing: ${DRIVES.filter((d) => !dr.rows.some((r) => r.drive === d)).join(', ')}`);
      } else {
        warnings += dr.warnings.length;
        put('drive-profile', { kind: 'drive-profile', rows: dr.rows });
      }

      // 46 §2.1 rows 3, 5, 6, 9, 10 — the full 10-characteristic set per cell (640 base facets).
      put('polarity-texture', extractPolarityTexture(line, stage));
      put('stake', extractStake(spec, modalityTexts));
      put('role-archetype', extractRoleArchetype(sh, spec));
      put('relationship-pattern', extractRelationshipPattern(spec));
      put('memory-schema', extractMemorySchema(spec));

      for (const [file, modality] of Object.entries(MODALITY_FILES)) {
        const p = join(cellDir, file);
        if (!existsSync(p)) { errors.push(`${line}/${stage}: modality file ${file} missing`); continue; }
        const { voice, aesthetic, lever } = extractModalityFacets(readFileSync(p, 'utf-8'), modality);
        put('voice-register', voice, [], modality);
        put('surface-aesthetic', aesthetic, [], modality);
        put('pressure-lever', lever, [], modality);
      }

      // Index keys follow DG21's derived format `{line-dir}:{stage-lower}` so the corpus
      // reconciler (arch.py dg21) can diff the index against the directory tree directly.
      indexModules[`${lineDir.name}:${stage.toLowerCase()}`] = {
        line, stage,
        title: clean(/^#\s+(.+)$/m.exec(spec)?.[1]) || `${line} / ${stage} — Module Specification`,
        modalities: Object.values(MODALITY_FILES),
        facetKeys,
      };
    }
  }

  if (errors.length > 0) {
    console.error(`compile-facets: ${errors.length} error(s):`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    return 1;
  }
  if (facets.length === 0) { console.error('compile-facets: refusing to emit an empty store'); return 1; }

  facets.sort((a, b) => a.key.localeCompare(b.key));
  writeFileSync(OUT_FACETS, `${JSON.stringify({ facets }, null, 1)}\n`);
  writeFileSync(OUT_INDEX, `${JSON.stringify({ modules: indexModules }, null, 1)}\n`);
  console.log(`compile-facets: emitted ${facets.length} facets (${warnings} field warnings) → ${OUT_FACETS}`);
  console.log(`compile-facets: regenerated corpus index (${Object.keys(indexModules).length} modules) → ${OUT_INDEX}`);
  return 0;
}

process.exit(main());

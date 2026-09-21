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

const ROOT = resolve(process.cwd());
const CORPUS = join(ROOT, 'docs/concept-drafts');
const OUT_FACETS = join(ROOT, 'src/core/world/facets/facets.json');
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
const QUADRANTS = ['Dark-Addiction', 'Dark-Allergy', 'Golden-Addiction', 'Golden-Allergy'] as const;
const QUADRANT_ALIASES: Record<string, string> = {
  'Dark-Addiction': 'Dark-Addiction', 'Dark-Allergy': 'Dark-Allergy',
  'Golden-Addiction': 'Golden-Addiction', 'Golden-Allergy': 'Golden-Allergy',
  'Residual Grasping': 'Dark-Addiction', // Turquoise residual patterns: 2.1→DA 2.2→DAll 2.3→GA 2.4→GAll by order
};
const DRIVES = ['Agency', 'Communion', 'Eros', 'Agape'] as const;

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
      const put = (characteristic: string, payload: unknown) => {
        const key = `${line}:${stage}:${characteristic}`;
        facetKeys.push(key);
        facets.push({ key, tags: [], tagAffinity: {}, payload, source: 'corpus' });
      };

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

      for (const [file, modality] of Object.entries(MODALITY_FILES)) {
        const p = join(cellDir, file);
        if (!existsSync(p)) { errors.push(`${line}/${stage}: modality file ${file} missing`); continue; }
        const { voice, aesthetic, lever } = extractModalityFacets(readFileSync(p, 'utf-8'), modality);
        put('voice-register', voice);
        put('surface-aesthetic', aesthetic);
        put('pressure-lever', lever);
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

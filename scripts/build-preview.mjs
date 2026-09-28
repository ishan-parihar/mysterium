/**
 * Regenerate the web-surface wireframe's palette block from src/styles/tokens.css.
 *
 * The preview (docs/audits/preview/web-surface-preview.html) inlines the 8 stage palettes so the
 * owner can open one file and see the whole surface. That made it a SECOND copy of the canonical
 * ladder in a file nothing else reads — the same defect class that produced a `[data-stage="white"]`
 * palette for a stage that does not exist while Teal, which does, had none.
 *
 * So the palettes are generated here rather than hand-copied, and
 * `tests/styles/stageTokens.test.ts` asserts the committed file still matches this source
 * (MUT39 drift, MUT40 a stage the canon lacks, MUT41 a stage dropped). Run after any change to
 * tokens.css:  node scripts/build-preview.mjs
 */
// @script-status: wired — regenerates the committed wireframe's palette block from tokens.css.
// It rewrites exactly the span between its own BEGIN/END markers and refuses to run if they are
// absent (MUT44). Run it after any edit to src/styles/tokens.css; the palette test fails if the
// committed file and the source disagree.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const tokens = readFileSync(join(root, 'src/styles/tokens.css'), 'utf-8');
const previewPath = join(root, 'docs/audits/preview/web-surface-preview.html');

const SHORT = {
  'mysterium-bg': 'bg',
  'mysterium-surface': 'surface',
  'mysterium-surface-elevated': 'surface-elevated',
  'mysterium-fg': 'fg',
  'mysterium-fg-muted': 'fg-muted',
  'mysterium-muted': 'muted',
  'mysterium-accent': 'accent',
  'mysterium-accent-soft': 'accent-soft',
  'mysterium-accent-fg': 'accent-fg',
  'mysterium-accent-soft-fg': 'accent-soft-fg',
  'mysterium-border': 'border',
};

const blocks = [];
for (const m of tokens.matchAll(/\[data-stage="([a-z]+)"\]\s*\{([^}]*)\}/g)) {
  const [, stage, body] = m;
  const fields = [];
  for (const [full, short] of Object.entries(SHORT)) {
    const v = new RegExp(`--${full}:\\s*([^;]+);`).exec(body);
    if (v) fields.push(`--${short}:${v[1].trim()}`);
  }
  const display = /--mysterium-font-display:\s*(.+?);/.exec(body)?.[1].trim();
  const bodyFont = /--mysterium-font-body:\s*(.+?);/.exec(body)?.[1].trim();
  blocks.push(
    `  [data-stage="${stage}"]{${fields.join(',')};--font-display:${display};--font-body:${bodyFont}}`,
  );
}

const generated = blocks.join('\n');
const START = '/* ── GENERATED PALETTES (scripts/build-preview.mjs) ── */';
const END = '/* ── END GENERATED ── */';

const preview = readFileSync(previewPath, 'utf-8');
const re = new RegExp(
  `${START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
);
if (!re.test(preview)) {
  console.error('preview is missing the generated-palette markers; add them before generating');
  process.exit(1);
}
writeFileSync(previewPath, preview.replace(re, `${START}\n${generated}\n${END}`));
console.log(`build-preview: wrote ${blocks.length} stage palettes from tokens.css`);

// @script-status: wired — the corpus generator (`npm run corpus:build`): reads the 64 module
//                          directories under docs/concept-drafts/ and emits the engine-facing
//                          src/core/data/concept-drafts.json. DG21 reconciles the two.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');
const DRAFTS = join(ROOT, 'docs', 'concept-drafts');
const OUT = join(ROOT, 'src', 'core', 'data', 'concept-drafts.json');

const LINES = ['cognitive', 'emotional', 'moral', 'intrapersonal', 'spiritual', 'somatic', 'willpower', 'interpersonal'] as const;
// Stage DIRECTORY names. These were stale (`07-turquoise`, `08-white`) after the 2026-09-20 ladder
// re-index renamed the corpus dirs to `07-teal` / `08-turquoise`; because the reads below are
// guarded by `existsSync`, the mismatch degraded SILENTLY into empty `modalities` arrays instead of
// failing (red-team RT-2). The `missing` guard below makes that failure loud.
const STAGES = ['01-infrared', '02-magenta', '03-red', '04-amber', '05-orange', '06-green', '07-teal', '08-turquoise'] as const;

const GAME_FILES = [
  ['deterministic.md', 'Deterministic'],
  ['strategic-planning.md', 'Strategic'],
  ['embodied-somatic.md', 'Embodied'],
  ['scenario-choice.md', 'ScenarioChoice'],
  ['language-reflective.md', 'LanguageReflective'],
  ['social-cooperative.md', 'SocialCooperative'],
  ['immersive-rpg.md', 'ImmersiveRPG'],
] as const;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function extractStageName(dir: string): string {
  return capitalize(dir.replace(/^\d+-/, ''));
}

interface ModuleOut {
  line: string;
  stage: string;
  title: string;
  modalities: string[];
}

const modules: Record<string, ModuleOut> = {};

for (const line of LINES) {
  for (const stageDir of STAGES) {
    const dir = join(DRAFTS, line, stageDir);
    if (!existsSync(dir)) {
      console.error(`\nbuild-concept-index: corpus module directory is missing:\n  ${dir}\n`);
      console.error('The generator may not silently produce an empty index. Either the corpus was');
      console.error('moved/re-indexed and these constants are stale, or the file list here is wrong.');
      process.exit(1);
    }
    const stage = extractStageName(stageDir);
    const key = `${line}:${stage.toLowerCase()}`;

    const specPath = join(dir, 'module-spec.md');
    let title = `${capitalize(line)} / ${stage} — Module Specification`;

    if (existsSync(specPath)) {
      const content = readFileSync(specPath, 'utf-8');
      const titleMatch = content.match(/^# (.+)$/m);
      if (titleMatch) title = titleMatch[1];
    }

    const modalities: string[] = [];
    for (const [file, modality] of GAME_FILES) {
      if (existsSync(join(dir, file))) {
        modalities.push(modality);
      }
    }

    modules[key] = { line: capitalize(line), stage, title, modalities };
  }
}

mkdirSync(join(ROOT, 'src', 'core', 'data'), { recursive: true });
writeFileSync(OUT, JSON.stringify({ modules }, null, 2));
console.log(`Wrote ${Object.keys(modules).length} modules to ${OUT}`);

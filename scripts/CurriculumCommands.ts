/**
 * CurriculumCommands — CLI subcommands for curriculum management.
 * Extracted from cli-game.ts as part of Phase C modular split.
 * Handles `mysterium curriculum [lint|list|progress|status]`.
 *
 * @script-status: wired — imported by cli-game.ts, which `npm run cli` runs. Not standalone.
 */
import chalk from 'chalk';
import { getCurriculumRegistry } from '../src/core/curriculum/CurriculumRegistry.js';
import { seedCurriculumRegistry } from '../src/core/curriculum/CurriculumSeed.js';
import { lintRegistry } from '../src/core/curriculum/CurriculumLinter.js';
import { probeCurriculum } from '../src/core/curriculum/MetaCognitiveProbe.js';
import { depthOrdinal, type DepthLevel } from '../src/core/curriculum/types.js';
import { hasSave, loadSave } from '../src/infra/persistence/SaveRepository.js';
import { banner, info } from './CliConsole.js';

export function runCurriculum(action?: string): void {
  banner('Curriculum Manager');
  seedCurriculumRegistry();
  const registry = getCurriculumRegistry();

  // Route based on action argument
  if (action && !['lint', 'list', 'progress', 'status'].includes(action)) {
    console.log(`
  ${chalk.red("Unknown action:")} ${action}. Use ${chalk.bold("lint")}, ${chalk.bold("list")}, ${chalk.bold("progress")}, or ${chalk.bold("status")}
`);
    return;
  }
  const count = registry.count();

  console.log(`\n  ${chalk.bold('Holons loaded:')} ${chalk.cyan(String(count))}`);
  console.log(`  ${chalk.bold('Branches:')} ${chalk.green(String(registry.getByLevel('branch').length))}`);
  console.log(`  ${chalk.bold('Concepts:')} ${chalk.blue(String(registry.getByLevel('concept').length))}`);
  console.log(`  ${chalk.bold('Subjects:')} ${chalk.magenta(String(registry.getByLevel('subject').length))}`);
  console.log(`  ${chalk.bold('Courses:')} ${chalk.yellow(String(registry.getByLevel('course').length))}`);
  console.log(`  ${chalk.bold('Lessons:')} ${chalk.cyan(String(registry.getByLevel('lesson').length))}`);

  // Run linter (when action is 'lint' or no action specified)
  if (!action || action === 'lint') {
    const result = lintRegistry(registry);
    if (result.overallPassed) {
      console.log(`\n  ${chalk.green('✓')} Lint passed (${result.totalErrors} errors, ${result.totalWarnings} warnings)`);
    } else {
      console.log(`\n  ${chalk.red('✗')} Lint failed (${result.totalErrors} errors, ${result.totalWarnings} warnings)`);
      for (const issue of result.graphIssues) {
        const icon = issue.severity === 'error' ? chalk.red('✗') : chalk.yellow('⚠');
        console.log(`  ${icon} [${issue.checkId}] ${issue.message}`);
      }
      for (const report of result.holonReports) {
        for (const err of report.errors) {
          console.log(`  ${chalk.red('✗')} [${err.checkId}] ${err.location}: ${err.message}`);
        }
      }
    }
  }
  // List branches (when action is 'list' or no action specified)
  if (!action || action === 'list') {
    const branches = registry.getByLevel('branch');
    if (branches.length > 0) {
      console.log(`\n  ${chalk.bold('Branches:')}`);
      for (const b of branches) {
        const childCount = b.childIds.length;
        console.log(`  ${chalk.cyan(b.id)} — ${chalk.dim(b.name)} (${childCount} child${childCount === 1 ? '' : 's'})`);
      }
    }
  }

  // P1-R6 (Curriculum Audit): Show player's curriculum progress.
  if (action === 'progress') {
    const sig = hasSave() ? loadSave() : null;
    if (!sig || !sig.knowledge || sig.knowledge.conceptStates.size === 0) {
      console.log(`\n  ${chalk.dim('No curriculum progress yet. Play a session to begin studying.')}`);
    } else {
      const states = [...sig.knowledge.conceptStates.entries()];
      const count = states.length;
      const avgRetention = states.reduce((sum, [_, cs]) => sum + cs.retention, 0) / count;
      const avgDepth = states.reduce((sum, [_, cs]) => sum + depthOrdinal(cs.depthLevel as DepthLevel), 0) / count;

      const retentionDesc = avgRetention > 0.7 ? 'well-held'
        : avgRetention > 0.4 ? 'developing'
        : 'fading';

      console.log(`\n  ${chalk.bold('Curriculum Progress')}`);
      info('concepts studied', String(count));
      info('avg retention', `${retentionDesc} (${Math.round(avgRetention * 100)}%)`);
      info('avg depth', avgDepth.toFixed(1));

      const sorted = [...states].sort((a, b) => b[1].retention - a[1].retention);
      if (sorted.length > 0) {
        console.log(`\n  ${chalk.bold('Strongest:')}`);
        for (const [id, cs] of sorted.slice(0, 3)) {
          const h = registry.get(id);
          console.log(`    ${chalk.green('✓')} ${h?.name ?? id} — ${Math.round(cs.retention * 100)}%`);
        }
      }
      if (sorted.length > 3) {
        console.log(`\n  ${chalk.bold('Needs review:')}`);
        for (const [id, cs] of sorted.slice(-3).reverse()) {
          const h = registry.get(id);
          console.log(`    ${chalk.yellow('↻')} ${h?.name ?? id} — ${Math.round(cs.retention * 100)}%`);
        }
      }
    }
  }

  // P1-QW1 (Architecture Audit Phase A): `mysterium curriculum status`
  if (action === 'status') {
    const lint = lintRegistry(registry);
    const sig = hasSave() ? loadSave() : null;
    const probe = sig?.knowledge ? probeCurriculum(sig.knowledge, registry, Date.now()) : null;

    console.log(`\n  ${chalk.bold('Curriculum Health')}`);
    const lintFelt = lint.totalErrors + lint.totalWarnings === 0
      ? chalk.green('all healthy')
      : chalk.yellow(`${lint.totalErrors} errors, ${lint.totalWarnings} warnings`);
    info('holons', `${lintFelt} (${count} total)`);
    if (probe) {
      info('progression audit', probe.shouldIntervene ? chalk.red('intervention needed') : chalk.green('on track'));
      info('rubric calibration', probe.rubricCalibration.length > 0
        ? `${probe.rubricCalibration.length} rubrics (${(probe.overallHealth * 100).toFixed(0)}% health)`
        : chalk.dim('none yet'));
    } else {
      info('audit', chalk.dim('no save — play a session to see audit'));
    }
    if (sig?.knowledge) {
      const states = [...sig.knowledge.conceptStates.entries()];
      const avg = states.length > 0
        ? states.reduce((s, [_, cs]) => s + cs.retention, 0) / states.length
        : 0;
      const retentionFelt = avg > 0.7 ? 'resting well' : avg > 0.4 ? 'still consolidating' : 'asking for attention';
      info('concepts studied', String(states.length));
      info('avg retention', `${retentionFelt} (${Math.round(avg * 100)}%)`);
    } else {
      info('concepts studied', chalk.dim('none yet — start a session to seed'));
    }
    const felt = lint.totalErrors === 0 && (!probe || !probe.shouldIntervene)
      ? chalk.cyan('curriculum is humming')
      : chalk.yellow('curriculum asks for tending');
    console.log(`\n  ${felt}`);
  }
  console.log('');
}

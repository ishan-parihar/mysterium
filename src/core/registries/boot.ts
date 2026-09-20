/**
 * Boot all registries. Called once at app startup.
 * NOTE (Infra refactor 2026-08-28): these 5 registries (Line/Stage/Ray/Drive/Encounter)
 * are now vestigial for the CLI agentic loop (orchestrator uses ModuleRegistry
 * + CurriculumRegistry). Kept for `mysterium diagnostic` and WebUI diagnostic
 * page; not on the hot path. Do not add new consumers — use assessments/registry.
 * ponytail: tasks/abilities/narrative registries removed — registered but never queried.
 */
import { register as cognitive } from './lines/01-cognitive.module.js';
import { register as emotional } from './lines/02-emotional.module.js';
import { register as moral } from './lines/03-moral.module.js';
import { register as intrapersonal } from './lines/04-intrapersonal.module.js';
import { register as spiritual } from './lines/05-spiritual.module.js';
import { register as somatic } from './lines/06-somatic.module.js';
import { register as willpower } from './lines/07-willpower.module.js';
import { register as interpersonal } from './lines/08-interpersonal.module.js';

import { register as infrared } from './stages/00-infrared.module.js';
import { register as magenta } from './stages/01-magenta.module.js';
import { register as red } from './stages/02-red.module.js';
import { register as amber } from './stages/03-amber.module.js';
import { register as orange } from './stages/04-orange.module.js';
import { register as green } from './stages/05-green.module.js';
import { register as teal } from './stages/06-teal.module.js';
import { register as turquoise } from './stages/07-turquoise.module.js';

import { register as rayRed } from './rays/01-red.module.js';
import { register as rayOrange } from './rays/02-orange.module.js';
import { register as rayYellow } from './rays/03-yellow.module.js';
import { register as rayGreen } from './rays/04-green.module.js';
import { register as rayBlue } from './rays/05-blue.module.js';
import { register as rayIndigo } from './rays/06-indigo.module.js';
import { register as rayViolet } from './rays/07-violet.module.js';

import { register as agency } from './drives/01-agency.module.js';
import { register as communion } from './drives/02-communion.module.js';
import { register as eros } from './drives/03-eros.module.js';
import { register as agape } from './drives/04-agape.module.js';
import { register as redEncounters } from './encounters/red-encounters.module.js';

export function bootRegistries(): void {
  // Lines
  cognitive();
  emotional();
  moral();
  intrapersonal();
  spiritual();
  somatic();
  willpower();
  interpersonal();

  // Stages
  infrared();
  magenta();
  red();
  amber();
  orange();
  green();
  teal();
  turquoise();

  // Rays
  rayRed();
  rayOrange();
  rayYellow();
  rayGreen();
  rayBlue();
  rayIndigo();
  rayViolet();

  // Drives
  agency();
  communion();
  eros();
  agape();

  // Encounters
  redEncounters();
}

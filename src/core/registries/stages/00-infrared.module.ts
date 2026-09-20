import { StageRegistry } from '../index.js';

export function register(): void {
  StageRegistry.register('Infrared', {
    stage: 'Infrared',
    description: 'Survival, sensory-motor foundation.',
    stub: true,
  });
}

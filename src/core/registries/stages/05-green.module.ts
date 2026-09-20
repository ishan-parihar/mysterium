import { StageRegistry } from '../index.js';

export function register(): void {
  StageRegistry.register('Green', {
    stage: 'Green',
    description: 'Sensitivity, plurality, inclusion.',
    stub: true,
  });
}

import { StageRegistry } from '../index.js';

export function register(): void {
  StageRegistry.register('Magenta', {
    stage: 'Magenta',
    description: 'Symbol, fantasy, magical agency.',
    stub: true,
  });
}

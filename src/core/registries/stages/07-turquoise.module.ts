import { StageRegistry } from '../index.js';

export function register(): void {
  StageRegistry.register('Turquoise', {
    stage: 'Turquoise',
    // NOT `ray: 'Violet'`. The gateway is TRAVERSED here (Indigo 6b) — the same ray as Teal, the
    // next sub-octave position. The Violet ray belongs to the closure EVENT (`CLOSURE_BINDING`),
    // which is why this module names no ray at all: `RAY_LENS['Turquoise']` is the source.
    description: 'Trans-rational direct knowing; the gateway TRAVERSED (Indigo 6b). Harvest readiness.',
    stub: true,
  });
}

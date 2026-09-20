import { StageRegistry } from '../index.js';

export function register(): void {
  StageRegistry.register('Amber', {
    stage: 'Amber',
    description: 'Belonging, rule-and-role.',
    stub: true,
    // UX-02: Amber = D2 ≈ Love/Logos (unity-attracting). Palette is
    // sandstone-parchment; audio is choral-monastic.
    palette: {
      primary: '#C9A66B',     // sandstone
      secondary: '#7A5C3D',   // leather brown
      accent: '#F4E4BC',      // parchment
    },
    audioMode: 'choral-monastic',
    physicsGravity: 0,
  });
}

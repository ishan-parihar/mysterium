import { StageRegistry } from '../index.js';

export function register(): void {
  StageRegistry.register('Orange', {
    stage: 'Orange',
    description: 'Reason, achievement, science.',
    stub: true,
    // UX-02: Orange = D3 ≈ Light (self-reflective choice in form). Palette
    // is steel-glass-blueprint; audio is minimalist-electronic.
    palette: {
      primary: '#3A7CA5',     // steel blue
      secondary: '#1F3A4D',   // blueprint navy
      accent: '#E8E8E8',      // blueprint turquoise
    },
    audioMode: 'minimalist-electronic',
    physicsGravity: 0,
  });
}

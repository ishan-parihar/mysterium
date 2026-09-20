import { StageRegistry } from '../index.js';

export function register(): void {
  StageRegistry.register('Red', {
    stage: 'Red',
    description: 'Ego, will, dominance. The first fully-playable stage.',
    stub: false,
    // UX-02: Perceptual-layer palette + audio for Red stage.
    // Red = D2 ≈ Love/Logos (directed growth, focusing). Palette is
    // blood-iron-rust; audio is tribal-percussive.
    palette: {
      primary: '#8B0000',     // dark blood red
      secondary: '#5C1F1F',   // rust shadow
      accent: '#D4A574',      // bronze/iron
    },
    audioMode: 'tribal-percussive',
    physicsGravity: 0,        // standard arcade gravity (Red is grounded)
  });
}

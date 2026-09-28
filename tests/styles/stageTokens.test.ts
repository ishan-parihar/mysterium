/**
 * The stage palettes must track the canonical ladder, not a second copy of it.
 *
 * The defect this pins: `tokens.css` shipped a `[data-stage="white"]` palette for a stage that
 * does not exist, and NO palette for `Teal` — which does. A player at Teal, the integral
 * structure, fell through to the default red theme. That is the retired-constant residue class
 * AGENTS.md §4.2 names: `White` was retired in `src/` and the retirement missed the CSS.
 *
 * The ladder is read from `ALL_STAGES` rather than restated here, so adding a stage to the canon
 * fails this test until the palette exists (MY-RG-0010: the gate must be provable, and the way to
 * prove it is delete a block and watch this go red).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_STAGES } from '../../src/core/domain/Stage.js';
import { describeStage } from '../../src/core/presentation/veilDescriptors.js';

const TOKENS = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf-8');

/** `[data-stage="x"] { ... }` blocks, keyed by the attribute value. */
function stageBlocks(): Map<string, string> {
  const out = new Map<string, string>();
  const re = /\[data-stage="([a-z]+)"\]\s*\{([^}]*)\}/g;
  for (let m = re.exec(TOKENS); m; m = re.exec(TOKENS)) out.set(m[1]!, m[2]!);
  return out;
}

const REQUIRED = [
  '--mysterium-bg',
  '--mysterium-fg',
  '--mysterium-fg-muted',
  '--mysterium-accent',
  '--mysterium-accent-soft',
  '--mysterium-border',
  '--mysterium-font-display',
  '--mysterium-font-body',
];

describe('stage tokens — the CSS ladder IS the canonical ladder', () => {
  const blocks = stageBlocks();

  it('defines exactly one palette per stage in ALL_STAGES, and no others', () => {
    const expected = new Set(ALL_STAGES.map((s) => s.toLowerCase()));
    const actual = new Set(blocks.keys());
    const missing = [...expected].filter((s) => !actual.has(s));
    const extra = [...actual].filter((s) => !expected.has(s));
    // `white` is the retired one this test exists for: it was a palette with no stage.
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });

  it('every palette declares the full token set', () => {
    for (const [stage, body] of blocks) {
      for (const token of REQUIRED) {
        expect(body, `${stage} is missing ${token}`).toContain(token);
      }
    }
  });

  it('each block is labelled with the descriptor describeStage() gives that stage', () => {
    // The comment drift is the same class as the palette drift: the header once attributed
    // Turquoise's descriptor to Teal. Assert the comment agrees with the Record<Stage,string>.
    for (const stage of ALL_STAGES) {
      const key = stage.toLowerCase();
      const block = blocks.get(key);
      expect(block, `${key} has no block`).toBeDefined();
      const before = TOKENS.slice(0, TOKENS.indexOf(`[data-stage="${key}"]`));
      const comment = before.slice(before.lastIndexOf('/*', before.length));
      expect(comment, `${key}'s block comment omits its descriptor`).toContain(
        describeStage(stage),
      );
    }
  });

  it('every stage motion is a real MotionName, not an invented word', () => {
    // `getMotionName()` (src/lib/transitions/stageMotion.ts:33) checks membership against a
    // closed list and falls back to 'snap'. An unknown token therefore does not error — it
    // silently becomes a wrong animation, which is the quiet-degradation class again.
    const VALID = ['pulse', 'drift', 'snap', 'chime', 'tick', 'grow', 'refract', 'dissolve'] as const;
    for (const [stage, body] of blocks) {
      const m = /--mysterium-motion:\s*([^;]+);/.exec(body);
      expect(m, `${stage} declares no motion`).not.toBeNull();
      expect(VALID as readonly string[], `${stage} motion "${m![1]}" is not a MotionName`).toContain(
        m![1]!.trim(),
      );
    }
  });

  it('body text passes WCAG AA (4.5:1) on every stage', () => {
    const lin = (v: number): number => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const lum = (hex: string): number => {
      const h = hex.replace('#', '');
      const [r, g, b] = [0, 2, 4].map((i) => lin(parseInt(h.slice(i, i + 2), 16)));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: string, b: string): number => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    for (const [stage, body] of blocks) {
      const val = (t: string): string => {
        const m = new RegExp(`${t}:\\s*(#[0-9a-fA-F]{6})`).exec(body);
        if (!m) throw new Error(`${stage}: ${t} is not a hex colour`);
        return m[1]!;
      };
      // fg and fg-muted carry text; accent is a FILL/identity colour and is measured in the
      // contrast report rather than required to be text-safe (it fails on 3 stages by design).
      expect(ratio(val('--mysterium-fg'), val('--mysterium-bg')), `${stage} fg/bg`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(val('--mysterium-fg-muted'), val('--mysterium-bg')), `${stage} muted/bg`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

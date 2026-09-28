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
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_STAGES } from '../../src/core/domain/Stage.js';
import { describeStage } from '../../src/core/presentation/veilDescriptors.js';

const TOKENS = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf-8');
const FONT_FACES = readFileSync(join(process.cwd(), 'src/styles/fonts.css'), 'utf-8');
const FONT_DIR = join(process.cwd(), 'static/fonts');

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
  '--mysterium-accent-fg',
  '--mysterium-accent-soft-fg',
  '--mysterium-border',
  '--mysterium-font-display',
  '--mysterium-font-body',
];

describe('stage tokens — the CSS ladder IS the canonical ladder', () => {
  const blocks = stageBlocks();

  // The same absence-blind class as the ladder above: `fonts.css` names a family, `tokens.css`
  // asks for it, and if the .ttf is absent the browser silently falls through to the NEXT family
  // in the stack — no error, no gate, a stage quietly rendered in the wrong typeface. The Teal
  // re-key moved four family assignments between blocks, so this is a live surface, not a
  // hypothetical.
  it('every stage is legible: text AA on bg, on the solid accent, and on accent-soft', () => {
    // TWO defects, found by reading the values rather than trusting the intent.
    //
    // (1) One `accent-fg` was serving TWO fills of different lightness. `accent-fg` is text on
    //     the SOLID accent (Button .btn-primary, HoldProbe .hold-button); `accent-soft-fg` is
    //     text on the accent-soft fill (Badge .badge-accent, Sidebar .nav-item.active,
    //     LLMDialogueRunner .option.selected). Amber and teal need DARK text on the solid and
    //     WHITE on the soft — inverting one to fix the other is how the other regressed, which
    //     is exactly what happened mid-fix here. Both pairings are asserted so a later edit
    //     cannot pass on one and fail the other.
    // (2) Turquoise inherited the retired block's dark gold on the ladder's only light
    //     background (2.75:1), the inverse of every other stage.
    for (const [stage, body] of blocks) {
      const hex = (token: string) => {
        const m = new RegExp(`${token}:\\s*(#[0-9a-fA-F]{6})`).exec(body);
        expect(m, `${stage} declares no ${token}`).not.toBeNull();
        return m![1]!;
      };
      // WCAG 2.1 relative luminance, done properly: linearise the channel first, then weight.
      // Skipping the linearisation is the mistake that makes a "contrast check" decorative —
      // it reports 2.75 where the true ratio is 8, or the reverse.
      const luminance = (hex: string) => {
        const channel = (v: number) => {
          const c = v / 255;
          return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        };
        const n = hex.replace('#', '');
        const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(n.slice(i, i + 2), 16)));
        return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
      };
      const ratio = (a: string, b: string) => {
        const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
        return (hi! + 0.05) / (lo! + 0.05);
      };

      const bg = hex('--mysterium-bg');
      // Body text: WCAG AA is 4.5:1 for normal text.
      expect(ratio(hex('--mysterium-fg'), bg), `${stage} fg on bg`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(hex('--mysterium-fg-muted'), bg), `${stage} fg-muted on bg`).toBeGreaterThanOrEqual(4.5);
      // Text drawn ON the accent-soft fill, in accent-fg. This is the pair the components use.
      // WCAG 1.4.11 non-text contrast: `accent` is not only an identity colour, it IS the focus
      // ring (17 sites across 8 components — Button, BackButton, BottomNav, Card, Toggle,
      // Sidebar, Toaster, LLMDialogueRunner) and a border colour. A focus indicator the user
      // cannot see fails the keyboard-navigation contract, so 3:1 is owed here, not 4.5:1.
      // This is the rule that was previously "exempt by design"; the exemption was the bug.
      expect(ratio(hex('--mysterium-accent'), bg), `${stage} accent on bg (non-text)`).toBeGreaterThanOrEqual(3);
      // Text on the SOLID accent fill.
      expect(
        ratio(hex('--mysterium-accent-fg'), hex('--mysterium-accent')),
        `${stage} accent-fg on accent`,
      ).toBeGreaterThanOrEqual(4.5);
      // Text on the accent-soft fill.
      expect(
        ratio(hex('--mysterium-accent-soft-fg'), hex('--mysterium-accent-soft')),
        `${stage} accent-soft-fg on accent-soft`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('every component drawing text on an accent fill uses the token for THAT fill', () => {
    // The class of bug the two tokens exist to prevent: a `color:` paired with a `background:`
    // that both reference accent, but one the solid and the other the soft. This reads the real
    // component sources, so a new consumer cannot reintroduce the mismatch silently.
    // HoldProbe has no hover rule that changes the fill, so it is the one component that only
    // ever sits on the solid accent. Button is NOT here: its :hover swaps to accent-soft and
    // switches token, so it legitimately uses both.
    const SOLID_ONLY = ['HoldProbe.svelte'];
    const files = [
      'src/lib/components/Button.svelte',
      'src/lib/components/Badge.svelte',
      'src/lib/components/Sidebar.svelte',
      'src/lib/components/gameplay/HoldProbe.svelte',
      'src/lib/components/gameplay/LLMDialogueRunner.svelte',
    ];
    for (const file of files) {
      const src = readFileSync(join(process.cwd(), file), 'utf-8');
      const name = file.slice(file.lastIndexOf('/') + 1);
      // Split on a whole rule, not on every '}' — a nested at-rule or a selector list would
      // otherwise leave a fragment with a background and no colour (or the reverse), which is how
      // a real mis-pairing slips past the check.
      for (const rule of src.match(/\{[^}]*\}/g) ?? []) {
        const fill = /background:\s*var\(--mysterium-(accent|accent-soft)\)/.exec(rule);
        if (!fill) continue;
        const wants = fill[1] === 'accent' ? 'accent-fg' : 'accent-soft-fg';
        // Assert the pairing, do not skip when it is absent: a rule that sets an accent fill and
        // then declares NO accent text colour is exactly the invisible-label case, and an
        // `if (!x) continue` here would let it through silently.
        expect(rule, `${name}: a ${fill[1]} fill must pair with ${wants}`).toContain(wants);
      }
      if (SOLID_ONLY.includes(name)) {
        expect(src, `${name} sits on the solid accent — it must not use accent-soft-fg`).not.toContain(
          'accent-soft-fg',
        );
      }
    }
  });

  it('no component mixes an accent token into transparency, which no contrast gate can read', () => {
    // `color-mix(... 80%, transparent)` lowers the effective ratio below the flat pairing, so a
    // measured 4.5:1 says nothing about what renders. The rule is therefore an absolute one:
    // text on an accent fill is a flat token or it is not checked. Every accent-adjacent colour
    // in a component must therefore be one the per-stage gate can verify by reading the value.
    const files = [
      'src/lib/components/Button.svelte',
      'src/lib/components/Badge.svelte',
      'src/lib/components/Sidebar.svelte',
      'src/lib/components/gameplay/HoldProbe.svelte',
      'src/lib/components/gameplay/LLMDialogueRunner.svelte',
    ];
    for (const file of files) {
      const src = readFileSync(join(process.cwd(), file), 'utf-8');
      for (const rule of src.match(/\{[^}]*\}/g) ?? []) {
        if (!/color-mix\([^)]*--mysterium-accent/.test(rule)) continue;
        expect(rule, `${file}: accent colour mixed into transparency is unverifiable`).not.toMatch(
          /color-mix\([^)]*--mysterium-accent/,
        );
      }
    }
  });

  it('every stage font resolves to a real .ttf, so no family falls back silently', () => {
    const onDisk = new Set(readdirSync(FONT_DIR));
    const declared = new Map<string, string>();
    const face = /font-family:\s*"([^"]+)";\s*\n\s*src:\s*url\("\/fonts\/([^"]+)"/g;
    for (let m = face.exec(FONT_FACES); m; m = face.exec(FONT_FACES)) declared.set(m[1]!, m[2]!);

    for (const [stage, body] of blocks) {
      for (const token of ['--mysterium-font-display', '--mysterium-font-body']) {
        const m = new RegExp(`${token}:\\s*"([^"]+)"`).exec(body);
        expect(m, `${stage} declares no ${token}`).not.toBeNull();
        const family = m![1]!;
        const file = declared.get(family);
        // The family must be registered AND its file must exist — either half missing is a
        // silent fallback, and neither half is visible from tokens.css alone.
        expect(file, `${stage} ${token} "${family}" has no @font-face in fonts.css`).toBeDefined();
        expect(onDisk, `${stage} ${token} "${family}" -> ${file} is absent`).toContain(file!);
      }
    }
  });

  it('no registered font is dead weight, and none is missing from disk', () => {
    const onDisk = new Set(readdirSync(FONT_DIR));
    const referenced = [...FONT_FACES.matchAll(/url\("\/fonts\/([^"]+)"\)/g)].map((m) => m[1]!);
    for (const file of referenced) expect(onDisk, `fonts.css references a missing ${file}`).toContain(file);
    for (const file of onDisk) {
      expect(referenced, `${file} is shipped but never registered — dead weight`).toContain(file);
    }
  });

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
      // fg and fg-muted carry body text, so they owe AA (4.5:1). The accent pairings are asserted
      // in the test above, which also covers accent as a non-text UI colour (WCAG 1.4.11, 3:1) and
      // both text-on-fill pairings — none of them are exempt, and an earlier version of this
      // comment claimed they were.
      expect(ratio(val('--mysterium-fg'), val('--mysterium-bg')), `${stage} fg/bg`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(val('--mysterium-fg-muted'), val('--mysterium-bg')), `${stage} muted/bg`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

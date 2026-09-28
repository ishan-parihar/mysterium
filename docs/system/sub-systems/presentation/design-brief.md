# DESIGN BRIEF — Mysterium

> Derived from the canon, not chosen. Produced per the `website-design` skill's `briefing` node
> (`~/.agents/skills/website-design/briefing/SKILL.md`), then **audited against the tree** — every
> claim below was checked against the code, and two skill defaults were rejected on the evidence.

The `website-design` skill targets marketing and landing sites. Mysterium is neither: it is an
**interactive developmental practice** whose front end is a persistent instrument a player returns
to over years. Two nodes transfer; two do not, and that is recorded below rather than applied
blindly.

| Signal | Value | Source |
|---|---|---|
| Page kind | **product / interactive app** — not a landing page | the routes are a player loop, not a funnel |
| Product type | entertainment + tool hybrid; a practice, not a game to win | `docs/foundations/14` |
| Audience | the player at every stage, plus consented guardians | AGENTS §5.4 |
| Vibe words | cave-dark · spirit-haunted · fortress-sharp · cathedral-ordered · mechanism-precise · garden-lush · crystalline · luminous-silence | `describeStage()` — **canon, not taste** |
| Foundation | **none — an existing hand-rolled token system** (`src/styles/tokens.css`) | the skill's own §5.A rule: never recreate a system you already have |
| Mode | **preserve** | 16 routes, 32 components and 11 stores are already shipped |

## The dials, and the one place this product diverges

| Dial | Value | Why |
|---|---|---|
| VARIANCE | **4** | the skill's "dashboard / data product" preset is 3; this is also a game, so 4 — then capped |
| MOTION | **3** | same preset, same cap. The 8 stage motions *are* the motion identity |
| DENSITY | **6** | between the skill's "dashboard" (7) and "e-commerce" (5): `/profile` is dense, `/play` is not, and density is a per-route decision |

The skill's quiet-constraint rule caps accessibility-critical briefs at VARIANCE 4 / MOTION 3
**"whatever the vibe words say"**. That cap is adopted, and it matters more here than it would on
a marketing site, because Mysterium's vibe words are unusually strong *and unusually load-bearing*.
**The canon's drama is carried by colour and type, not by layout variance or motion volume.** That
is the deliberate divergence from the skill's default answer, and it is recorded so the next reader
does not "fix" it toward a noisier result.

## The rule this brief yields

The skill's §0.5 says visual choices follow the subject's materials and vernacular rather than
generic defaults. Mysterium's subject supplies its own: **the developmental ladder**. A player at
Infrared must not be able to mistake their experience for a player at Turquoise. That makes
`data-stage` a **semantic contract, not a skin** — which is why it is set synchronously in `<head>`
before first paint, and why a retired stage (`White`) could leave a palette behind while a live
stage (`Teal`) had none: the ladder was being copied by hand instead of imported from
`ALL_STAGES`.

## Foundation: none needed

`tokens.css` is already a complete, canon-derived system — 8 stage palettes, a spacing scale, a
modular type scale, motion durations and easings. Installing a package would import a second
vocabulary into one tree, which is the failure the skill itself warns about at the end of its
own §5.A table.

## Skill nodes: applied vs not

| Node | Applied? | Why |
|---|---|---|
| `briefing` | **yes** | the brief and dials above; the accessibility cap is its own rule |
| `direction` | **partly** | "one style, one voice, tokens-only" is already satisfied by `tokens.css`; its canonical *token names* are deliberately NOT imported, because that would create a second vocabulary beside `--mysterium-*` |
| `components/*` | **no** | marketing recipes (hero, bento, pricing, social proof). Mysterium is an instrument — a "hero section" has no meaning here |
| `content`, `motion`, `quality` | **no** | slot-filling and static-site review; the equivalents here are the per-stage tokens and the gate roster |
| `deploy/*` | **no** | static hosts (Vercel / Netlify / Higgsfield). The only deploy is Cloudflare Pages (`.github/workflows/deploy.yml`), and the `static` build target is explicitly **not** a deployment |

## Two skill defaults rejected on the evidence

1. **"Install the official package if the brief matches a row" (§5.A).** Rejected: a complete
   canon-derived token system already exists, and the skill's own honesty rule forbids recreating
   a system's CSS by hand. A second vocabulary (`--color-primary` beside `--mysterium-accent`) is
   precisely the "two systems in one tree" the same section warns against.
2. **"If the design read diverges, ask ONE question."** Not needed — the read is not ambiguous.
   The canon dictates it: the player's stage dictates the palette. There is no taste decision to
   surface, which is itself worth recording, because it is why this product cannot be restyled by
   a designer without breaking a semantic contract.

## Constraints carried into development

- **Contrast is measured, not asserted.** `fg` and `fg-muted` pass WCAG AA (4.5:1) on all 8
  stages; `accent` does not, on 4 stages, **by design** — it is a fill, border, glow and focus-ring
  colour and must never carry body text. `tests/styles/stageTokens.test.ts` holds both facts.
- **Every stage has a palette, and no palette is without a stage.** Enforced by reading
  `ALL_STAGES`, so the check cannot itself drift.
- **The descriptor vocabulary lives in one place** — `describeStage()`'s `Record<Stage, string>` in
  `src/core/presentation/veilDescriptors.ts`. The CSS comments mirror it and are tested against it.
- **Motion names come from a closed union** (`MotionName` in `src/lib/transitions/stageMotion.ts`);
  an unknown token silently falls back to `snap`, so the union is a test, not a comment.

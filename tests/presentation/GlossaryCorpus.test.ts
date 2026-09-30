/**
 * The glossary corpus and its unlock rule.
 *
 * Two defects this file exists to pin, both found by driving /glossary rather than by a failing
 * assertion:
 *
 *  1. A repeated `term` blanks the whole page. The list is a keyed `{#each … (entry.term)}`, and
 *     Svelte treats a duplicate key as a hard invariant failure that kills the entire component
 *     tree — so tier1 and tier2 both defining 'Transformation' and 'Veil' rendered nothing at all,
 *     on the last item in the navigation, while the route still returned 200.
 *
 *  2. The unlock rule leaked the clinical tier. `checkTermUnlocks` fell back to a term's own NAME
 *     when it declared no keywords, so a narrative containing "drive" or "CCI" marked those terms
 *     unlocked to the player. The fallback turns the whole corpus keyword-reachable, which is exactly
 *     what P2-U5 puts behind an unlock. A row opts in by declaring the vocabulary that reaches it.
 */
import { describe, it, expect } from 'vitest';
import {
  GLOSSARY_TERMS,
  TIER2_GLOSSARY_TERMS,
  ADVANCED_GLOSSARY_TERMS,
  checkTermUnlocks,
} from '../../src/core/data/glossary.js';

describe('the glossary corpus', () => {
  it('defines every term exactly once — a repeat blanks the page', () => {
    const terms = GLOSSARY_TERMS.map((t) => t.term);
    const dupes = [...new Set(terms.filter((t, i) => terms.indexOf(t) !== i))];
    expect(dupes).toEqual([]);
  });

  it('has no empty definition or missing audience', () => {
    for (const t of GLOSSARY_TERMS) {
      expect(t.def.length, `${t.term} has no definition`).toBeGreaterThan(20);
      expect(t.audience, `${t.term} has no audience`).toBeTruthy();
      expect(t.unlockTier, `${t.term} has no tier`).toBeTruthy();
    }
  });

  it('a tier2 row never restates a tier1 term — the keywords are merged, not duplicated', () => {
    const tier1 = new Set(GLOSSARY_TERMS.filter((t) => t.unlockTier === 'tier1').map((t) => t.term));
    for (const t of TIER2_GLOSSARY_TERMS) {
      expect(tier1.has(t.term), `tier2 restates tier1 term '${t.term}'`).toBe(false);
    }
  });

  it('every term a tier2 row used to own kept its keywords on the surviving row', () => {
    // 'Transformation' and 'Veil' were de-duplicated from tier2 onto their tier1 rows. Their keyword
    // sets are the reason the tier2 rows existed, so losing them would have silently stopped the
    // terms unlocking — which is a behaviour change nobody would notice in a diff.
    for (const term of ['Transformation', 'Veil']) {
      const row = GLOSSARY_TERMS.find((t) => t.term === term)!;
      expect(row.unlockKeywords, `${term} lost its keywords in the merge`).toBeTruthy();
      expect(row.unlockKeywords!.length).toBeGreaterThan(0);
    }
    expect(GLOSSARY_TERMS.find((t) => t.term === 'Transformation')!.unlockKeywords).toContain('stage transition');
    expect(GLOSSARY_TERMS.find((t) => t.term === 'Veil')!.unlockKeywords).toContain('contemplative frame');
  });
});

describe('checkTermUnlocks', () => {
  it('unlocks a term whose declared keyword appears in the narrative', () => {
    const unlocked = checkTermUnlocks('something shifted — a frame-change, a new altitude', []);
    expect(unlocked).toContain('Transformation');
  });

  it('does NOT unlock an advanced term from its own name leaking into prose', () => {
    // P2-U5: the clinical tier is behind an unlock, not behind a word appearing once.
    for (const text of [
      'Your CCI rose this session.',
      'The drive balance shifted toward communion.',
      'This is an arc, not a climb.',
      'shadow quadrant intensity',
    ]) {
      expect(checkTermUnlocks(text, []), `"${text}" must not unlock a clinical term`).toEqual([]);
    }
  });

  it('never returns a term the caller already has', () => {
    const once = checkTermUnlocks('a stage transition happened', []);
    expect(once.length).toBeGreaterThan(0);
    expect(checkTermUnlocks('a stage transition happened', once)).toEqual([]);
  });

  it('leaves every keyword-less term permanently unreachable', () => {
    const noKeywords = ADVANCED_GLOSSARY_TERMS.filter((t) => !t.unlockKeywords || t.unlockKeywords.length === 0);
    expect(noKeywords.length).toBeGreaterThan(0); // the fixture is meaningful
    const text = noKeywords.map((t) => t.term).join(' ');
    expect(checkTermUnlocks(text, [])).toEqual([]);
  });
});

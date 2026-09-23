/**
 * The fallback-corpus contract — what an authored fallback entry IS.
 *
 * Split out of `FallbackProvider.ts` (module-cohesion audit item 5). The provider held ~1 300
 * lines of authored prose beside ~300 lines of selection logic, so a wording change showed up as
 * a code change to the selector. The corpus now lives in `data/`; this module is the shape it is
 * authored against, and `../FallbackProvider.ts` re-exports `FallbackContent` so the public
 * surface is unchanged.
 */

/** One authored fallback entry. Every field is optional: a modality uses what it needs. */
export interface FallbackContent {
  readonly prompt?: string;
  readonly scenario?: string;
  readonly options?: readonly { readonly id: string; readonly text: string }[];
  readonly framing?: string;
  readonly followUps?: readonly string[];
}

/** Drive-mapped options: agency / communion / eros / agape — always 4 options. */
export interface DriveOptions {
  readonly agency: string;    // Self-direction, decisiveness, boundary-setting
  readonly communion: string; // Empathy, connection, relational attunement
  readonly eros: string;      // Aspiration, growth-seeking, reaching toward
  readonly agape: string;     // Integration, compassion, returning to include
}

/**
 * Each option set carries exactly one option per drive, so scoring always has a dimensional signal
 * to work with no matter which option the player chooses.
 */
export function driveOptionsToMCQ(d: DriveOptions): { id: string; text: string }[] {
  return [
    { id: 'agency', text: d.agency },
    { id: 'communion', text: d.communion },
    { id: 'eros', text: d.eros },
    { id: 'agape', text: d.agape },
  ];
}

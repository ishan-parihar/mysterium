/**
 * PESTLE analysis for the Red developmental stage.
 * Describes the macro-environmental context that shapes Red-layer encounters.
 */

export interface PESTLEData {
  readonly political: string;
  readonly economic: string;
  readonly social: string;
  readonly technological: string;
  readonly legal: string;
  readonly environmental: string;
}

export const RedPESTLE: PESTLEData = {
  political: 'Warlord fiefdoms, might=authority, no centralized governance',
  economic: 'Plunder economy, tribute/raiding, resource hoarding',
  social: 'Might makes right, dominance hierarchies, loyalty through fear',
  technological: 'Weapons, fortifications, siege tools - all for conquest',
  legal: 'None - the strong make rules, the weak obey or flee',
  environmental: 'Harsh volcanic badlands, scarred earth, contested water sources',
};

export const PESTLE_DIMENSIONS = [
  'political',
  'economic',
  'social',
  'technological',
  'legal',
  'environmental',
] as const;

/**
 * StoredData — the inventory of what this app keeps, and what deleting it means.
 *
 * The `/settings` reset removed THREE keys: `profile:v1`, `world:v1`, `save:v1`. The app writes
 * at least six more —
 * `mysterium:profiles`, `mysterium:active-profile`, `mysterium:device-id`, `mysterium:accessibility`,
 * `mysterium:session-control`, `mysterium.shares.v1`. So a player who deleted their saves left
 * behind their profile identities, their shares (which point at a Significator projection), the
 * device id the save key is derived from, and their settings. A "delete my data" control that
 * leaves five of eight stores standing is not a delete.
 *
 * WHY AN INVENTORY AND NOT A HARDCODED LIST AT THE CALL SITE. The failure here is silent: a new
 * store is added, no test notices, and the privacy page quietly under-reports. So the list is data
 * with a `buildTarget` discriminator the caller must supply — the page filters to what exists in a
 * BROWSER and states plainly what is NOT covered, rather than implying completeness.
 *
 * GROUPING IS A PRODUCT CLAIM, NOT A LAYOUT ONE. "Play data" and "your identity" are deleted
 * differently on purpose: the second one is what every other record is keyed to, and deleting it
 * does NOT delete the first, because those keys are not derived from it — they are the same
 * device. Saying otherwise would be a promise the code cannot keep.
 */

/** What a group means when a player asks "what does deleting this do". */
export type DataGroup = 'play' | 'identity' | 'preferences' | 'shared';

export interface StoredItem {
  readonly key: string;
  readonly label: string;
  /** What it holds, in the player's words — not the variable name. */
  readonly holds: string;
  readonly group: DataGroup;
  /**
   * True when the app is known to write this key. A key this build does not write is still listed
   * when `present` is false, because "we hold nothing here" is an answer, and an inventory that
   * silently shrinks between versions is not one a player can rely on.
   */
  readonly present: boolean;
}

const KNOWN_KEYS: readonly Omit<StoredItem, 'present'>[] = [
  {
    key: 'profile:v1',
    label: 'Your Significator',
    holds: 'Your starting stage, the eight line altitudes, and your vow record.',
    group: 'play',
  },
  {
    key: 'world:v1',
    label: 'Your world',
    holds: 'The state of the world you have played through — which holons moved, and how.',
    group: 'play',
  },
  {
    key: 'save:v1',
    label: 'Your session checkpoint',
    holds: 'Where you stopped, so a session resumes where you left it.',
    group: 'play',
  },
  {
    key: 'mysterium:profiles',
    label: 'Profile identities',
    holds: 'The names you gave each profile. No assessment data — just the labels.',
    group: 'identity',
  },
  {
    key: 'mysterium:active-profile',
    label: 'Active profile',
    holds: 'Which profile you were last using. A pointer, nothing more.',
    group: 'identity',
  },
  {
    key: 'mysterium:device-id',
    label: 'Device id',
    holds:
      'A random id for this device. Your cloud save key is derived from it, so deleting it makes ' +
      'the cloud copy of your save unreadable to you — the local copy is deleted with it.',
    group: 'identity',
  },
  {
    key: 'mysterium.shares.v1',
    label: 'Shares you created',
    holds: 'Read-only links to projections of your Significator, with the scope you granted each.',
    group: 'shared',
  },
  {
    key: 'mysterium:accessibility',
    label: 'Accessibility settings',
    holds: 'Contrast, motion and text-size choices. Kept because it is a disability accommodation.',
    group: 'preferences',
  },
  {
    key: 'mysterium:session-control',
    label: 'Session controls',
    holds: 'Pins you set in settings — forced line, stage, or encounter count.',
    group: 'preferences',
  },
];

/** Groups in the order a player should read them: themselves, then what they made, then settings. */
export const DATA_GROUP_ORDER: readonly DataGroup[] = ['play', 'shared', 'identity', 'preferences'];

export const DATA_GROUP_LABEL: Readonly<Record<DataGroup, string>> = {
  play: 'Your play',
  identity: 'Your identity on this device',
  shared: 'What you shared',
  preferences: 'Your settings',
};

/**
 * The inventory, annotated with what this build actually holds. `probe` is injected so the
 * question "does this key exist?" is answerable without a global — the page passes `localStorage`
 * and a test passes a Map, and both get the same answer.
 */
export function storedData(probe: (key: string) => boolean): readonly StoredItem[] {
  return KNOWN_KEYS.map((item) => ({ ...item, present: probe(item.key) }));
}

/** Keys a full deletion removes. `present: false` keys are skipped rather than reported. */
export function deletableKeys(items: readonly StoredItem[]): readonly string[] {
  return items.filter((i) => i.present).map((i) => i.key);
}

/** The honest total: how many of the known keys this build actually writes. */
export function storedSummary(items: readonly StoredItem[]): {
  readonly total: number;
  readonly present: number;
  readonly byGroup: Readonly<Record<DataGroup, number>>;
} {
  const byGroup = {} as Record<DataGroup, number>;
  for (const g of DATA_GROUP_ORDER) byGroup[g] = 0;
  let present = 0;
  for (const item of items) {
    if (!item.present) continue;
    present += 1;
    byGroup[item.group] += 1;
  }
  return { total: KNOWN_KEYS.length, present, byGroup };
}

/**
 * What leaves this device, in the app's own words. This section is the reason the page exists, and
 * it is stated above the inventory rather than below it: the inventory is the reassuring half, and
 * it is the half that cannot be wrong.
 *
 * THE SAVE KEY IS THE HONEST PART AND IT IS NOT COMFORTING. `cloudSyncStore.ts:4-11` says it: the
 * blob is encrypted client-side with AES-GCM, the key never leaves the device, and it is derived
 * FROM the deviceId — which the server holds. So a save on the server is unreadable to anyone
 * without that id, and the id is the thing being sent. The same file names the fix (derive from
 * the recovery mnemonic, which the server never sees in plaintext) and calls it a future
 * enhancement. Until that is an owner's decision, this page states the mechanism rather than
 * letting "encrypted" imply end-to-end. Guessing a 128-bit uuid is impractical, so the honest
 * claim is that the server COULD decrypt, not that it does.
 */
export const WHAT_LEAVES_THIS_DEVICE: readonly { readonly title: string; readonly body: string }[] = [
  {
    title: 'Your cloud save, if you have one',
    body:
      'Encrypted on this device before it is sent. The key is derived from an id this device ' +
      'generated, and the server holds that id, so the server could in principle decrypt the ' +
      'save. We do not think that is a good enough arrangement and the fix — deriving the key ' +
      'from your recovery phrase, which the server never sees — is a decision that has not been ' +
      'made yet. Guessing the id outright is not practical, so the exposure is that we could, ' +
      'not that anyone has.',
  },
  {
    title: 'Telemetry — off unless you turn it on',
    body:
      'Nothing is sent until you opt in; the setting is off by default and lives under ' +
      'Accessibility in settings. Once you do, each event carries a type, a timestamp and a ' +
      'payload naming the encounter, the module it belongs to, whether you passed it, and — when ' +
      'one happens — a shadow quadrant or a stage transition. So it does describe your play, not ' +
      'just count it. It is sent with the same device id as above. The /telemetry page lists the ' +
      'full set of event types with their payloads.',
  },
  {
    title: 'Who can read the shadow quadrants we collect',
    body:
      'A shadow quadrant names a pattern of how you respond, and in your OWN play it is never ' +
      'shown to you — the game is built so you cannot read it back, and the privacy rule in the ' +
      'design is that it never appears in a player surface. The one deliberate exception is a ' +
      'third party you have consented to: the therapeutic projection, which by design reads ' +
      'shadow-surfacing patterns for a practitioner working with you. Consent is the only thing ' +
      'that opens it, not a privilege level. Separately, the analytics store is write-only from ' +
      'this app — the endpoint calls writeDataPoint and nothing in the codebase reads the store ' +
      'back, so no surface in the game can display what was collected. It is visible to us, the ' +
      'operator of the deploy, and to the infrastructure provider who stores it, through the ' +
      'provider\'s own query tools. If you would rather it were not collected at all, leaving ' +
      'telemetry off is enough — and that is the default.',
  },
  {
    title: 'Text you type into a probe',
    body:
      'On a deploy with a model key configured, free-input answers are sent to the model provider ' +
      'as part of the prompt, and leave our infrastructure entirely. On a deploy with no key the ' +
      'questionnaire is answered from an authored corpus and nothing you type is sent anywhere. ' +
      'The /setup page reports which one this deploy is, and it is worth reading before you write ' +
      'anything here that you would not want sent.',
  },
  {
    title: 'Nothing else',
    body:
      'No analytics beyond the above, no third-party scripts, and no advertising identifiers. ' +
      'Sharing a projection of your Significator is a separate act you take on the share page, ' +
      'with a scope you choose, and revoking it is silent for the other person.',
  },
];

/**
 * What deleting everything DOES NOT cover, stated rather than implied. `/api/telemetry` writes to
 * Analytics Engine, which is server-side and not in this device's storage — so a browser-side
 * deletion is not a deletion of everything, and the page has to say so rather than let the
 * "Delete everything" button imply otherwise.
 */
export const NOT_COVERED: readonly string[] = [
  'Telemetry events already accepted by the analytics backend. They are not readable from this ' +
    'device, and deleting the device id here does not retract them — it only means the next event ' +
    'carries a new id. The way to stop sending is to turn telemetry off in settings, which takes ' +
    'effect on the next event.',
  'Your cloud save, if one exists. Deleting the device id makes it unreadable to you, but the ' +
    'copy on the server is not itself removed by anything on this page.',
  'Anything you typed into the free-input field of a probe, on a deploy where a model key is ' +
    'configured. That text was sent to the model provider when the probe was answered, and this ' +
    'page cannot reach it. On a keyless deploy it never left this device at all.',
];

/** One sentence per group, for the confirm prompt — the player should know what they are dropping. */
export const GROUP_CONSEQUENCE: Readonly<Record<DataGroup, string>> = {
  play: 'Your starting stage, altitudes, world state and checkpoint go. There is no undo, and no ' +
    'copy anywhere else unless you exported it first.',
  shared: 'Links you gave to other people stop resolving. The people holding them cannot be ' +
    'notified — revoking is silent for them.',
  identity: 'Your profile names and device id go. Your play data is separate and is NOT deleted by ' +
    'this, so a new profile will start empty rather than inherit anything.',
  preferences: 'Accessibility and session settings return to their defaults.',
};

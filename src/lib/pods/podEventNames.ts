/**
 * How a pod event is SAID, rather than what it is called on the wire.
 *
 * The pod's event types are part of a shared serial log: the CLI writes them, the coordinator replays
 * them, and the privacy wall (`payloadIsSafe`, L1) reads them. That makes them a wire format rather
 * than the internal register `43 §4.7` keeps off a player screen — unlike the council's role ids,
 * which are internal and never rendered anywhere. Keeping the two in separate modules is the point:
 * it makes the boundary explicit, so a later route that wants to hide event types too has to make
 * that decision rather than inherit a permissive default.
 *
 * The `SerializedEvent['type']` union is the switch subject and the function is total over it, so a
 * new event type is a compile error here rather than a blank line in the UI.
 */

import type { SerializedEvent } from '$core/pods/podStateMachine.js';

type PodEventType = SerializedEvent['type'];

const EVENT_NAMES: Readonly<Record<PodEventType, string>> = {
  form: 'the pod was formed',
  join: 'a member joined',
  'ritual-start': 'a shared ritual opened',
  'ritual-advance': 'the ritual advanced',
  publish: 'an aggregate was published',
  recognize: 'a recognition was offered',
};

export function describeEvent(event: SerializedEvent): string {
  return EVENT_NAMES[event.type];
}

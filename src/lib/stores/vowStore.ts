/**
 * vowStore — client-side persistence for the practice-objective book (doc 39).
 *
 * The VowBook lives OUTSIDE the Significator (39 §4.1: "external vow list —
 * lives beside the Significator") under its own localStorage key so that old
 * saves parse unchanged and the journal owns its own lifecycle. Reflection
 * RECORDS flow into the Significator via processCheckIn (VowService), which
 * this store never bypasses.
 *
 * Client-side only (39 §4.1): nothing here syncs to the cloud.
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { emptyVowBook, type VowBook } from '$core/practice/VowService.js';

const VOW_BOOK_KEY = 'vows:v1';

export const vowBookStore = writable<VowBook>(emptyVowBook());

/** Hydrate from localStorage (client-only; corrupt/absent → empty book). */
export function loadVowBook(): void {
  if (!browser) return;
  try {
    const raw = localStorage.getItem(VOW_BOOK_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<VowBook>;
    vowBookStore.set({
      vows: Array.isArray(parsed.vows) ? parsed.vows : [],
      declineCounts: parsed.declineCounts && typeof parsed.declineCounts === 'object' ? parsed.declineCounts : {},
    });
  } catch {
    // best-effort: keep the empty book
  }
}

/** Persist the book (called after every lifecycle mutation). */
export function saveVowBook(book: VowBook): void {
  vowBookStore.set(book);
  if (!browser) return;
  try {
    localStorage.setItem(VOW_BOOK_KEY, JSON.stringify(book));
  } catch {
    // best-effort
  }
}

/** Current book snapshot (for pure service calls). */
export function currentVowBook(): VowBook {
  return get(vowBookStore);
}

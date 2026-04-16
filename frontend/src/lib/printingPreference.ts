/**
 * Per-user, per-card printing preference. Persisted to localStorage under
 * `cardPrintingChoice` as `{ [cardId]: imageFile }`. Applied purely
 * client-side via `usePreferredImageUrl` — every card body that renders an
 * image consults this hook and swaps in the chosen printing's URL.
 */
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "cardPrintingChoice";

let cache: Record<string, string> | null = null;
const listeners = new Set<() => void>();

function load(): Record<string, string> {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function save(next: Record<string, string>): void {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // swallow — best-effort
  }
  listeners.forEach((l) => l());
}

export function getPrintingPreference(cardId: string): string | undefined {
  return load()[cardId];
}

export function setPrintingPreference(cardId: string, imageFile: string): void {
  const current = load();
  save({ ...current, [cardId]: imageFile });
}

export function clearPrintingPreference(cardId: string): void {
  const current = load();
  if (!(cardId in current)) return;
  const next = { ...current };
  delete next[cardId];
  save(next);
}

export function subscribePrintingPreferences(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// React hook: returns the preferred imageUrl for this card, falling back to
// the default passed in. Subscribes to preference changes so components
// re-render when the user picks a different printing.
export function usePreferredImageUrl(cardId: string | undefined, defaultImageUrl: string): string {
  const pref = useSyncExternalStore(
    (cb) => subscribePrintingPreferences(cb),
    () => (cardId ? getPrintingPreference(cardId) : undefined),
    () => undefined,
  );
  return pref ? `/cards/${pref}.webp` : defaultImageUrl;
}

// React hook: returns the preferred printing ({rarity, imageUrl}) by matching
// the localStorage preference against the card's printings list. Falls back
// to the defaults when no preference exists or no matching printing is found.
export type PrintingInfo = { rarity: string; imageUrl: string };

export function usePreferredPrinting(
  cardId: string | undefined,
  defaultPrinting: PrintingInfo,
  printings: readonly PrintingInfo[],
): PrintingInfo {
  const pref = useSyncExternalStore(
    (cb) => subscribePrintingPreferences(cb),
    () => (cardId ? getPrintingPreference(cardId) : undefined),
    () => undefined,
  );
  if (pref) {
    const target = `/cards/${pref}.webp`;
    const found = printings.find((p) => p.imageUrl === target);
    if (found) return found;
  }
  return defaultPrinting;
}

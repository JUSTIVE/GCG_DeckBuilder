export const SEARCH_HISTORY_KEY = "gcg_search_history";
export const SEARCH_HISTORY_MAX = 15;
export const SEARCH_HISTORY_LIST_ID = "SearchHistoryList:singleton";

export interface SearchHistoryFilter {
  kind: string[];
  level?: number[];
  cost?: number[];
  package?: string;
  rarity?: string;
  keyword?: string[];
  trait?: string[];
  zone?: string[];
  color?: string[];
  query?: string;
  sort: string | null;
}

export interface FilterSearchHistory {
  __typename: "FilterSearchHistory";
  id: string;
  filter: SearchHistoryFilter;
  searchedAt: string;
}

export interface CardViewHistory {
  __typename: "CardViewHistory";
  id: string;
  cardId: string;
  searchedAt: string;
}

export type SearchHistoryEntry = FilterSearchHistory | CardViewHistory;

export interface SearchHistoryList {
  __typename: "SearchHistoryList";
  id: string;
  items: SearchHistoryEntry[];
}

export function makeSearchHistoryList(items: SearchHistoryEntry[]): SearchHistoryList {
  return { __typename: "SearchHistoryList", id: SEARCH_HISTORY_LIST_ID, items };
}

function filterKey(f: SearchHistoryFilter): string {
  const normalized: Record<string, unknown> = {};
  for (const k of Object.keys(f).sort()) {
    const v = (f as unknown as Record<string, unknown>)[k];
    normalized[k] = Array.isArray(v) ? [...v].sort() : (v ?? null);
  }
  return JSON.stringify(normalized);
}

export function readSearchHistory(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SearchHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeSearchHistory(entries: SearchHistoryEntry[]): void {
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(entries));
}

export function addFilterSearch({
  filter,
  sort,
}: {
  filter: Omit<SearchHistoryFilter, "sort">;
  sort?: string;
}): SearchHistoryList {
  const historyFilter: SearchHistoryFilter = { ...filter, sort: sort ?? null };
  const searchedAt = new Date().toISOString();
  const entry: FilterSearchHistory = {
    __typename: "FilterSearchHistory",
    id: btoa(`FilterSearchHistory:${searchedAt}`),
    filter: historyFilter,
    searchedAt,
  };
  const key = filterKey(historyFilter);
  const existing = readSearchHistory().filter(
    (e) => !(e.__typename === "FilterSearchHistory" && filterKey(e.filter) === key),
  );
  const updated = [entry, ...existing].slice(0, SEARCH_HISTORY_MAX);
  writeSearchHistory(updated);
  return makeSearchHistoryList(updated);
}

export function addCardView({ cardId }: { cardId: string }): SearchHistoryList {
  const searchedAt = new Date().toISOString();
  const entry: CardViewHistory = {
    __typename: "CardViewHistory",
    id: btoa(`CardViewHistory:${searchedAt}`),
    cardId,
    searchedAt,
  };
  const existing = readSearchHistory().filter(
    (e) => !(e.__typename === "CardViewHistory" && e.cardId === cardId),
  );
  const updated = [entry, ...existing].slice(0, SEARCH_HISTORY_MAX);
  writeSearchHistory(updated);
  return makeSearchHistoryList(updated);
}

export function removeSearchHistory({ id }: { id: string }): boolean {
  const updated = readSearchHistory().filter((e) => e.id !== id);
  writeSearchHistory(updated);
  return true;
}

export function clearSearchHistory(): boolean {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
  return true;
}

/**
 * serve.ts — In-browser GraphQL execution backed by the local card dataset.
 * See individual modules in ./serve/ for implementation details.
 */

import { buildSchema, executeSync, parse } from "graphql";
import type { GraphQLUnionType, GraphQLInterfaceType } from "graphql";
import schemaSDL from "../schema.graphql?raw";
import {
  allCards,
  cardById,
  bestFzfScore,
  bestExactScore,
  cardSearchTokens,
  encodeCursor,
  decodeCursor,
  makeTrait,
  makeKeyword,
  makeColor,
  makeSeries,
} from "./serve/cards";
import { applyFilter, applySort, type CardFilterInput } from "./serve/filter";
import {
  makeSearchHistoryList,
  readSearchHistory,
  addFilterSearch,
  addCardView,
  removeSearchHistory,
  clearSearchHistory,
  SEARCH_HISTORY_LIST_ID,
} from "./serve/history";
import {
  makeDeckList,
  readDecks,
  deckList,
  createDeck,
  deleteDeck,
  renameDeck,
  addCardToDeck,
  removeCardFromDeck,
  setDeckCards,
  DECK_LIST_ID,
} from "./serve/decks";
import { fieldResolver } from "./serve/fieldResolver";

// ─── Schema ───────────────────────────────────────────────────────────────────

export const schema = buildSchema(schemaSDL);

// ─── resolveType hooks ────────────────────────────────────────────────────────

const resolveNodeType = (obj: { __typename: string }): string =>
  obj.__typename === "ResourceCard" ? "Resource" : obj.__typename;

(schema.getType("Card") as GraphQLUnionType).resolveType = resolveNodeType;
(schema.getType("UnitLink") as GraphQLUnionType).resolveType = (obj: { __typename: string }) =>
  obj.__typename;
(schema.getType("SearchHistory") as GraphQLUnionType).resolveType = (obj: { __typename: string }) =>
  obj.__typename;
(schema.getType("PlayableCard") as GraphQLUnionType).resolveType = resolveNodeType;
(schema.getType("AddCardToDeckResult") as GraphQLUnionType).resolveType = (obj: {
  __typename: string;
}) => obj.__typename;
(schema.getType("CardGrouping") as GraphQLUnionType).resolveType = (obj: { __typename: string }) =>
  obj.__typename;
(schema.getType("Node") as GraphQLInterfaceType).resolveType = (obj: { __typename: string }) => {
  if (
    obj.__typename === "FilterSearchHistory" ||
    obj.__typename === "CardViewHistory" ||
    obj.__typename === "SearchHistoryList" ||
    obj.__typename === "Deck" ||
    obj.__typename === "DeckList" ||
    obj.__typename === "Trait" ||
    obj.__typename === "Keyword" ||
    obj.__typename === "Color" ||
    obj.__typename === "Series"
  )
    return obj.__typename;
  return resolveNodeType(obj);
};

// ─── Root value ───────────────────────────────────────────────────────────────

interface CardsArgs {
  first?: number;
  after?: string;
  filter?: CardFilterInput;
  sort?: string;
}

const rootValue = {
  node({ id }: { id: string }) {
    if (id === SEARCH_HISTORY_LIST_ID) return makeSearchHistoryList(readSearchHistory());
    if (id === DECK_LIST_ID) return makeDeckList(readDecks());
    const historyEntry = readSearchHistory().find((e) => e.id === id);
    if (historyEntry) return historyEntry;
    const deck = readDecks().find((d) => d.id === id);
    if (deck) return deck;
    // Check grouping IDs before card IDs
    try {
      const decoded = atob(id);
      if (decoded.startsWith("Trait:")) return makeTrait(decoded.slice(6));
      if (decoded.startsWith("Keyword:")) return makeKeyword(decoded.slice(8));
      if (decoded.startsWith("Color:")) return makeColor(decoded.slice(6));
      if (decoded.startsWith("Series:")) return makeSeries(decoded.slice(7));
    } catch {
      /* ignore malformed ids */
    }
    return cardById.get(id) ?? null;
  },

  trait({ value }: { value: string }) {
    return makeTrait(value);
  },

  keyword({ value }: { value: string }) {
    return makeKeyword(value);
  },

  color({ value }: { value: string }) {
    return makeColor(value);
  },

  series({ value }: { value: string }) {
    return makeSeries(value);
  },

  cards({ first = 20, after, filter, sort }: CardsArgs) {
    if (!filter) throw new Error("`filter` argument is required on `cards`");
    const filtered = applyFilter(allCards, filter);
    const sorted = applySort(filtered, sort);
    const totalCount = sorted.length;
    const startIndex = after != null ? decodeCursor(after) + 1 : 0;
    const endIndex = startIndex + first;
    const page = sorted.slice(startIndex, endIndex);
    const edges = page.map((node, i) => ({ cursor: encodeCursor(startIndex + i), node }));
    return {
      totalCount,
      edges,
      pageInfo: {
        hasPreviousPage: startIndex > 0,
        hasNextPage: endIndex < totalCount,
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges[edges.length - 1]?.cursor ?? null,
      },
    };
  },

  searchHistory() {
    return makeSearchHistoryList(readSearchHistory());
  },

  quicksearch({ query, first = 20 }: { query: string; first?: number }) {
    if (!query.trim()) return [];
    const trimmed = query.trim();
    const traitFocused = trimmed.startsWith("(") && trimmed.endsWith(")") && trimmed.length > 2;
    const cleanQuery = traitFocused ? trimmed.slice(1, -1).trim() : trimmed;
    const TRAIT_BONUS = 40;
    const scored: Array<{ score: number; card: (typeof allCards)[number] }> = [];
    for (const card of allCards) {
      const tokens = cardSearchTokens(card as Record<string, unknown>);
      const idScore = bestFzfScore(cleanQuery, tokens.id);
      const nameScore = bestFzfScore(cleanQuery, tokens.name);
      const descScore = bestFzfScore(cleanQuery, tokens.description);
      const traitScore = bestFzfScore(cleanQuery, tokens.traits);
      const linkScore = bestFzfScore(cleanQuery, tokens.links);
      const keywordScore = bestExactScore(cleanQuery, tokens.keywords);
      const seriesScore = bestExactScore(cleanQuery, tokens.series);
      const boostedTraitScore =
        traitFocused && traitScore >= 0 ? traitScore + TRAIT_BONUS : traitScore;
      const maxScore = Math.max(
        idScore,
        nameScore,
        descScore,
        boostedTraitScore,
        linkScore,
        keywordScore,
        seriesScore,
      );
      if (maxScore >= 0) {
        const finalScore = !traitFocused && nameScore >= 0 ? maxScore + 20 : maxScore;
        scored.push({ score: finalScore, card });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, first).map((s) => s.card);
  },

  randomCard({ kind }: { kind: string }) {
    const typeName: Record<string, string> = {
      UNIT: "UnitCard",
      PILOT: "PilotCard",
      COMMAND: "CommandCard",
      BASE: "BaseCard",
      RESOURCE: "ResourceCard",
    };
    const target = typeName[kind];
    if (!target) return null;
    const pool = allCards.filter((c) => c.__typename === target);
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  },

  randomCards({ kind, count }: { kind: string; count: number }) {
    const typeName: Record<string, string> = {
      UNIT: "UnitCard",
      PILOT: "PilotCard",
      COMMAND: "CommandCard",
      BASE: "BaseCard",
      RESOURCE: "ResourceCard",
    };
    const target = typeName[kind];
    if (!target) return [];
    const pool = allCards.filter((c) => c.__typename === target);
    if (!pool.length) return [];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  },

  addFilterSearch,
  addCardView,
  removeSearchHistory,
  clearSearchHistory,
  deckList,
  createDeck,
  deleteDeck,
  renameDeck,
  addCardToDeck,
  removeCardFromDeck,
  setDeckCards,
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function serveGraphQL(query: string, variables?: Record<string, unknown>) {
  return executeSync({
    schema,
    document: parse(query),
    variableValues: variables,
    rootValue,
    fieldResolver,
  });
}

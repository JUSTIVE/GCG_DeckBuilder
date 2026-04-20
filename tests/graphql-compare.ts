/**
 * graphql-compare.ts
 * 프론트엔드 in-memory GraphQL과 백엔드 HTTP GraphQL의 응답을 비교합니다.
 *
 * Usage: bun tests/graphql-compare.ts
 */

// ── localStorage mock (history/decks.ts 가져올 때 필요) ──────────────────────
const _store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => _store.get(k) ?? null,
  setItem: (k: string, v: string) => _store.set(k, v),
  removeItem: (k: string) => _store.delete(k),
  clear: () => _store.clear(),
};

// ── atob/btoa (serve.ts node IDs에 사용) ────────────────────────────────────
(globalThis as Record<string, unknown>).atob = (s: string) =>
  Buffer.from(s, "base64").toString("utf8");
(globalThis as Record<string, unknown>).btoa = (s: string) =>
  Buffer.from(s, "utf8").toString("base64");

// ── Frontend in-memory GraphQL 빌드 ─────────────────────────────────────────
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildSchema, executeSync, parse } from "graphql";
import type { GraphQLUnionType, GraphQLInterfaceType } from "graphql";

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
} from "../frontend/src/serve/cards";
import { applyFilter, applySort, type CardFilterInput } from "../frontend/src/serve/filter";
import { fieldResolver } from "../frontend/src/serve/fieldResolver";
import {
  makeSearchHistoryList,
  readSearchHistory,
  SEARCH_HISTORY_LIST_ID,
} from "../frontend/src/serve/history";
import {
  makeDeckList,
  readDecks,
  DECK_LIST_ID,
} from "../frontend/src/serve/decks";

const schemaSDL = readFileSync(resolve(import.meta.dir, "../frontend/schema.graphql"), "utf-8");
const schema = buildSchema(schemaSDL);

const resolveNodeType = (obj: { __typename: string }): string =>
  obj.__typename === "ResourceCard" ? "Resource" : obj.__typename;

(schema.getType("Card") as GraphQLUnionType).resolveType = resolveNodeType;
(schema.getType("PlayableCard") as GraphQLUnionType).resolveType = resolveNodeType;
(schema.getType("UnitLink") as GraphQLUnionType).resolveType = (obj: { __typename: string }) => obj.__typename;
(schema.getType("SearchHistory") as GraphQLUnionType).resolveType = (obj: { __typename: string }) => obj.__typename;
(schema.getType("AddCardToDeckResult") as GraphQLUnionType).resolveType = (obj: { __typename: string }) => obj.__typename;
(schema.getType("CardGrouping") as GraphQLUnionType).resolveType = (obj: { __typename: string }) => obj.__typename;
(schema.getType("DeckCard") as GraphQLUnionType).resolveType = (obj: { __typename: string }) => obj.__typename;
(schema.getType("DescriptionToken") as GraphQLUnionType).resolveType = (obj: { type: string }) => {
  if (obj.type === "trigger") return "TriggerToken";
  if (obj.type === "ability") return "AbilityToken";
  return "ProseToken";
};
(schema.getType("Node") as GraphQLInterfaceType).resolveType = (obj: { __typename: string }) => {
  const passThrough = new Set(["FilterSearchHistory","CardViewHistory","SearchHistoryList","Deck","DeckList","Trait","Keyword","Color","Series"]);
  return passThrough.has(obj.__typename) ? obj.__typename : resolveNodeType(obj);
};

interface CardsArgs { first?: number; after?: string; filter?: CardFilterInput; sort?: string; }

const rootValue = {
  node({ id }: { id: string }) {
    if (id === SEARCH_HISTORY_LIST_ID) return makeSearchHistoryList(readSearchHistory());
    if (id === DECK_LIST_ID) return makeDeckList(readDecks());
    try {
      const decoded = atob(id);
      if (decoded.startsWith("Trait:"))   return makeTrait(decoded.slice(6));
      if (decoded.startsWith("Keyword:")) return makeKeyword(decoded.slice(8));
      if (decoded.startsWith("Color:"))   return makeColor(decoded.slice(6));
      if (decoded.startsWith("Series:"))  return makeSeries(decoded.slice(7));
    } catch { /* ignore */ }
    return cardById.get(id) ?? null;
  },
  trait:   ({ value }: { value: string }) => makeTrait(value),
  keyword: ({ value }: { value: string }) => makeKeyword(value),
  color:   ({ value }: { value: string }) => makeColor(value),
  series:  ({ value }: { value: string }) => makeSeries(value),

  cards({ first = 20, after, filter, sort }: CardsArgs) {
    if (!filter) throw new Error("`filter` is required");
    const filtered = applyFilter(allCards, filter);
    const sorted = applySort(filtered, sort);
    const totalCount = sorted.length;
    const startIndex = after != null ? decodeCursor(after) + 1 : 0;
    const endIndex = startIndex + first;
    const page = sorted.slice(startIndex, endIndex);
    const edges = page.map((node, i) => ({ cursor: encodeCursor(startIndex + i), node }));
    return { totalCount, edges, pageInfo: { hasPreviousPage: startIndex > 0, hasNextPage: endIndex < totalCount, startCursor: edges[0]?.cursor ?? null, endCursor: edges[edges.length - 1]?.cursor ?? null } };
  },

  quicksearch({ query, first = 20 }: { query: string; first?: number }) {
    if (!query.trim()) return [];
    const trimmed = query.trim();
    const scored: Array<{ score: number; card: (typeof allCards)[number] }> = [];
    for (const card of allCards) {
      const tokens = cardSearchTokens(card as Record<string, unknown>);
      const maxScore = Math.max(
        bestFzfScore(trimmed, tokens.id), bestFzfScore(trimmed, tokens.name),
        bestFzfScore(trimmed, tokens.description), bestFzfScore(trimmed, tokens.traits),
        bestFzfScore(trimmed, tokens.links), bestExactScore(trimmed, tokens.keywords),
        bestExactScore(trimmed, tokens.series),
      );
      if (maxScore >= 0) scored.push({ score: maxScore, card });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, first).map((s) => s.card);
  },

  randomCard: () => null,
  randomCards: () => [],
  searchHistory: () => makeSearchHistoryList(readSearchHistory()),
  addFilterSearch: () => makeSearchHistoryList(readSearchHistory()),
  addCardView: () => makeSearchHistoryList(readSearchHistory()),
  removeSearchHistory: () => makeSearchHistoryList(readSearchHistory()),
  clearSearchHistory: () => makeSearchHistoryList(readSearchHistory()),
  deckList: () => makeDeckList(readDecks()),
  createDeck: () => makeDeckList(readDecks()),
  deleteDeck: () => makeDeckList(readDecks()),
  renameDeck: () => makeDeckList(readDecks()),
  addCardToDeck: () => ({ __typename: "DeckNotFoundError", deckId: "n/a" }),
  removeCardFromDeck: () => null,
  setDeckCards: () => null,
};

function runFrontend(query: string, variables?: Record<string, unknown>) {
  return executeSync({ schema, document: parse(query), variableValues: variables, rootValue, fieldResolver });
}

// ── Backend HTTP ─────────────────────────────────────────────────────────────
async function runBackend(query: string, variables?: Record<string, unknown>) {
  const res = await fetch("http://localhost:4000/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return res.json() as Promise<{ data?: unknown; errors?: unknown[] }>;
}

// ── 비교 유틸 ─────────────────────────────────────────────────────────────────
function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

type Result = { pass: boolean; label: string; diff?: { frontend: unknown; backend: unknown } };

async function compare(label: string, query: string, variables?: Record<string, unknown>): Promise<Result> {
  const fe = runFrontend(query, variables);
  const be = await runBackend(query, variables);

  if (fe.errors?.length || be.errors?.length) {
    return { pass: false, label, diff: { frontend: fe.errors, backend: be.errors } };
  }
  const pass = deepEqual(fe.data, be.data);
  return pass ? { pass, label } : { pass, label, diff: { frontend: fe.data, backend: be.data } };
}

// ── 테스트 케이스 ─────────────────────────────────────────────────────────────
const UNIT_CARDS_Q = `{ cards(first: 5, filter: { kind: [UNIT] }) { totalCount edges { node { __typename ... on UnitCard { id name { ko en } cost AP HP rarity color { value } traits { value } keywords { value } printings { rarity imageUrl } links { __typename ... on LinkPilot { pilot { name { ko en } AP HP } } ... on LinkTrait { trait } } } } } } }`;
const PILOT_CARDS_Q = `{ cards(first: 5, filter: { kind: [PILOT] }) { totalCount edges { node { __typename ... on PilotCard { id level cost rarity color { value } pilot { name { ko en } AP HP } } } } } }`;
const BASE_CARDS_Q  = `{ cards(first: 5, filter: { kind: [BASE]  }) { totalCount edges { node { __typename ... on BaseCard  { id name { ko } cost AP HP rarity } } } } }`;
const CMD_CARDS_Q   = `{ cards(first: 5, filter: { kind: [COMMAND] }) { totalCount edges { node { __typename ... on CommandCard { id name { ko } cost rarity } } } } }`;
const FILTER_Q  = `{ cards(first: 5, filter: { kind: [UNIT], color: [BLUE], cost: [3] }) { totalCount edges { node { ... on UnitCard { id cost color { value } } } } } }`;
const SORT_Q    = `{ cards(first: 5, filter: { kind: [UNIT] }, sort: COST_DESC) { edges { node { ... on UnitCard { id cost } } } } }`;
const NODE_Q    = `{ node(id: "GD01-001") { __typename ... on UnitCard { id name { ko } } } }`;
const TRAIT_Q   = `{ trait(value: EARTH_FEDERATION) { id value } }`;
const COLOR_Q   = `{ color(value: BLUE) { id value } }`;
const SERIES_Q  = `{ series(value: MOBILE_SUIT_GUNDAM) { id value } }`;
const KEYWORD_Q = `{ keyword(value: REPAIR) { id value } }`;
const DESCRIPTION_Q = `{ cards(first: 1, filter: { kind: [UNIT] }) { edges { node { ... on UnitCard { id description { tokens { __typename ... on ProseToken { text { ko en } } ... on TriggerToken { type keyword } ... on AbilityToken { type keyword n } } } } } } } }`;

const cases: Array<{ label: string; query: string; variables?: Record<string, unknown> }> = [
  { label: "cards(UNIT) 5개 - 전체 필드",            query: UNIT_CARDS_Q },
  { label: "cards(PILOT) 5개",                       query: PILOT_CARDS_Q },
  { label: "cards(BASE) 5개",                        query: BASE_CARDS_Q },
  { label: "cards(COMMAND) 5개",                     query: CMD_CARDS_Q },
  { label: "cards filter(BLUE, cost=3)",             query: FILTER_Q },
  { label: "cards sort(COST_DESC)",                  query: SORT_Q },
  { label: "node(GD01-001)",                         query: NODE_Q },
  { label: "trait(EARTH_FEDERATION)",               query: TRAIT_Q },
  { label: "color(BLUE)",                            query: COLOR_Q },
  { label: "series(MOBILE_SUIT_GUNDAM)",              query: SERIES_Q },
  { label: "keyword(REPAIR)",                        query: KEYWORD_Q },
  { label: "description tokens",                    query: DESCRIPTION_Q },
  // quicksearch: 프론트(퍼지) vs 백엔드(ilike) 알고리즘이 달라 결과 순서 차이는 정상
  // { label: "quicksearch(건담)", query: `{ quicksearch(query: "건담", first: 5) { __typename ... on UnitCard { id } } }` },
  { label: "totalCount all UNIT",                   query: `{ cards(first: 1, filter: { kind: [UNIT] }) { totalCount } }` },
  { label: "totalCount all PILOT",                  query: `{ cards(first: 1, filter: { kind: [PILOT] }) { totalCount } }` },
  { label: "totalCount all BASE",                   query: `{ cards(first: 1, filter: { kind: [BASE] }) { totalCount } }` },
  { label: "totalCount all COMMAND",                query: `{ cards(first: 1, filter: { kind: [COMMAND] }) { totalCount } }` },
];

// ── 실행 ──────────────────────────────────────────────────────────────────────
const GREEN = "\x1b[32m";
const RED   = "\x1b[31m";
const BOLD  = "\x1b[1m";
const RESET = "\x1b[0m";

console.log(`\n${BOLD}🔍 Frontend(in-memory) vs Backend(HTTP) GraphQL 비교${RESET}\n`);

let passed = 0, failed = 0;
const failures: Result[] = [];

for (const c of cases) {
  const result = await compare(c.label, c.query, c.variables);
  if (result.pass) {
    console.log(`${GREEN}✓${RESET} ${c.label}`);
    passed++;
  } else {
    console.log(`${RED}✗${RESET} ${c.label}`);
    failed++;
    failures.push(result);
  }
}

console.log(`\n${BOLD}─────────────────────────────────────────${RESET}`);
console.log(`${GREEN}✓ ${passed} passed${RESET}  ${failed > 0 ? RED : ""}✗ ${failed} failed${RESET}\n`);

for (const f of failures) {
  console.log(`\n${BOLD}${RED}FAIL: ${f.label}${RESET}`);
  console.log("Frontend:", JSON.stringify(f.diff?.frontend ?? "(no diff)", null, 2).slice(0, 800));
  console.log("Backend: ", JSON.stringify(f.diff?.backend  ?? "(no diff)", null, 2).slice(0, 800));
}

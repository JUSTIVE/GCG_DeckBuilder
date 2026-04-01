/**
 * serve.ts — In-browser GraphQL execution backed by the local card dataset.
 *
 * The schema.graphql is valid SDL and requires no preprocessing.
 *
 * Data → Schema bridging handled by the custom fieldResolver:
 *
 *  PilotCard.pilot : Pilot!
 *    Raw PilotCard stores { name, AP, HP } as flat top-level fields.
 *    We construct the Pilot object from them.
 *
 *  LinkPilot.pilot : Pilot!
 *    Raw LinkPilot stores { pilotName: string }.
 *    We look up the PilotCard by name and return { name, AP, HP }.
 *    Falls back to { name, AP: 0, HP: 0 } when the card is not in the dataset.
 *
 *  CommandCard.pilot : Pilot  (nullable)
 *    Raw CommandCard stores pilot as { name, AP, HP } already nested.
 *    Handled by the default resolver; AP/HP null-coerced via Pilot handler.
 *
 *  rarity : CardRarity!
 *    Raw data does not carry rarity yet. Defaults to "COMMON".
 *
 *  AP / HP : Int!
 *    Some BaseCard / UnitCard rows have null. Coerced to 0.
 *
 *  UnitCard.traits : [CardTrait!]!
 *    Raw UnitCard stores the array as "trait" (singular).
 *    We rename it to "traits" to match the schema field name.
 *
 *  UnitCard.links : [UnitLink!]!
 *    Schema changed from `link: UnitLink` (single nullable) to
 *    `links: [UnitLink!]!` (non-null array).
 *    Raw data still stores a single object under "link" (or omits the field).
 *    We wrap it in an array; absent/null → empty array [].
 *
 *  ResourceCard __typename → "Resource"
 *    Raw data uses "__typename": "ResourceCard"; schema type is "Resource".
 */

import { buildSchema, executeSync, parse, defaultFieldResolver } from "graphql";
import type {
  GraphQLUnionType,
  GraphQLInterfaceType,
  GraphQLResolveInfo,
} from "graphql";
import schemaSDL from "../schema.graphql?raw";
import allCardsRaw from "../../data/mapped.json";

// ─── Types ────────────────────────────────────────────────────────────────────

type RawCard = (typeof allCardsRaw)[number];
type AnyRecord = Record<string, unknown>;

// ─── Schema ───────────────────────────────────────────────────────────────────

export const schema = buildSchema(schemaSDL);

// ─── resolveType hooks ────────────────────────────────────────────────────────

/** Maps raw __typename to the GraphQL type name.  Only ResourceCard differs. */
const resolveNodeType = (obj: { __typename: string }): string =>
  obj.__typename === "ResourceCard" ? "Resource" : obj.__typename;

(schema.getType("Card") as GraphQLUnionType).resolveType = resolveNodeType;

(schema.getType("UnitLink") as GraphQLUnionType).resolveType = (obj: {
  __typename: string;
}) => obj.__typename;

(schema.getType("SearchHistory") as GraphQLUnionType).resolveType = (obj: {
  __typename: string;
}) => obj.__typename;

(schema.getType("Node") as GraphQLInterfaceType).resolveType = (obj: {
  __typename: string;
}) => {
  if (
    obj.__typename === "FilterSearchHistory" ||
    obj.__typename === "CardViewHistory"
  )
    return obj.__typename;
  return resolveNodeType(obj);
};

// ─── Data indexes ─────────────────────────────────────────────────────────────

const allCards = allCardsRaw as RawCard[];

/** O(1) card lookup for Query.node */
const cardById = new Map<string, RawCard>(
  allCards
    .filter((c): c is Extract<RawCard, { id: string }> => "id" in c && !!c.id)
    .map((c) => [c.id, c]),
);

/**
 * O(1) pilot lookup for LinkPilot.pilot resolution.
 * Keyed by the pilot's name (raw PilotCard.name top-level field).
 */
const pilotByName = new Map<string, AnyRecord>(
  allCards
    .filter(
      (c): c is RawCard & { name: string } =>
        c.__typename === "PilotCard" &&
        "name" in c &&
        typeof c.name === "string",
    )
    .map((c) => [(c as AnyRecord)["name"] as string, c as AnyRecord]),
);

// ─── FZF-style search ─────────────────────────────────────────────────────────

/**
 * Returns -1 if the pattern cannot be matched in order, otherwise a positive
 * score (higher = better). Consecutive matches and word-boundary matches give
 * bonus points, mirroring fzf's scoring heuristics.
 */
function fzfScore(pattern: string, target: string): number {
  if (!pattern) return 0;
  const p = pattern.toLowerCase();
  const t = target.toLowerCase();

  let score = 0;
  let pi = 0;
  let consecutive = 0;

  for (let ti = 0; ti < t.length && pi < p.length; ti++) {
    if (t[ti] === p[pi]) {
      pi++;
      consecutive++;
      score += consecutive * 2;
      if (ti === 0 || t[ti - 1] === " " || t[ti - 1] === "_") score += 3;
    } else {
      consecutive = 0;
    }
  }

  return pi === p.length ? score : -1;
}

/** Returns the best fzf score across all strings in `targets`, or -1. */
function bestFzfScore(pattern: string, targets: string[]): number {
  return targets.reduce<number>((best, t) => {
    const s = fzfScore(pattern, t);
    return s > best ? s : best;
  }, -1);
}

/** Extracts searchable text tokens from a raw card by field group. */
function cardSearchTokens(card: AnyRecord): {
  id: string[];
  name: string[];
  description: string[];
  traits: string[];
  links: string[];
} {
  const id: string[] = [];
  const name: string[] = [];
  const description: string[] = [];
  const traits: string[] = [];
  const links: string[] = [];

  if (typeof card["id"] === "string") id.push(card["id"]);
  if (typeof card["name"] === "string") name.push(card["name"]);

  if (Array.isArray(card["description"])) {
    for (const line of card["description"] as unknown[])
      if (typeof line === "string") description.push(line);
  }

  // UnitCard / BaseCard raw field: "trait" (array of CardTrait enum strings)
  if (Array.isArray(card["trait"])) {
    for (const t of card["trait"] as unknown[])
      if (typeof t === "string") traits.push(t);
  }

  // UnitCard raw field: "link" (single LinkTrait | LinkPilot object)
  const link = card["link"];
  if (link != null && typeof link === "object") {
    const l = link as AnyRecord;
    if (typeof l["trait"] === "string") links.push(l["trait"] as string);
    if (typeof l["pilotName"] === "string")
      links.push(l["pilotName"] as string);
  }

  return { id, name, description, traits, links };
}

// ─── Cursor helpers ───────────────────────────────────────────────────────────

const encodeCursor = (index: number): string => btoa(`cursor:${index}`);

function decodeCursor(cursor: string): number {
  try {
    const match = atob(cursor).match(/^cursor:(\d+)$/);
    if (match?.[1]) return parseInt(match[1], 10);
  } catch {
    /* ignore malformed cursors */
  }
  return -1;
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

/**
 * Sorts a card array by the given CardSort enum value.
 * Always returns a new array; the input is never mutated.
 * Null / undefined numeric values are coerced to 0 (consistent with the
 * AP/HP field resolver) so they sort stably at the bottom of ASC results.
 */
function applySort(cards: RawCard[], sort: string | undefined): RawCard[] {
  if (!sort) return cards;

  const sep = sort.lastIndexOf("_");
  const rawField = sort.slice(0, sep); // "NAME" | "COST" | "LEVEL" | "AP" | "HP"
  const dir = sort.slice(sep + 1); // "ASC" | "DESC"

  const key: string =
    rawField === "NAME"
      ? "name"
      : rawField === "COST"
        ? "cost"
        : rawField === "LEVEL"
          ? "level"
          : rawField === "AP"
            ? "AP"
            : rawField === "HP"
              ? "HP"
              : "id";

  const sign = dir === "DESC" ? -1 : 1;

  return [...cards].sort((a, b) => {
    const av = (a as AnyRecord)[key];
    const bv = (b as AnyRecord)[key];

    if (typeof av === "string" || typeof bv === "string") {
      return sign * String(av ?? "").localeCompare(String(bv ?? ""), "ko");
    }

    const an = (av as number | null | undefined) ?? 0;
    const bn = (bv as number | null | undefined) ?? 0;
    return sign * (an - bn);
  });
}

// ─── Filtering ────────────────────────────────────────────────────────────────

const KIND_TO_TYPENAME: Record<string, string> = {
  RESOURCE: "ResourceCard",
  BASE: "BaseCard",
  UNIT: "UnitCard",
  PILOT: "PilotCard",
  COMMAND: "CommandCard",
};

interface CardFilterInput {
  /** Required — array of CardKind values (OR condition) */
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
}

function applyFilter(cards: RawCard[], filter: CardFilterInput): RawCard[] {
  // Map kind array to __typename values
  const targetTypenames =
    filter.kind.length === 0
      ? Object.values(KIND_TO_TYPENAME)
      : filter.kind
          .map((k) => KIND_TO_TYPENAME[k])
          .filter((t): t is string => !!t);

  // When PILOT kind is requested, CommandCards with a pilot are also included.
  const includePilotedCommands =
    filter.kind.length === 0 || filter.kind.includes("PILOT");

  return cards.filter((card) => {
    // kind — card must match at least one of the requested kinds (OR condition)
    const typeMatch = targetTypenames.includes(card.__typename);
    const pilotedCommandMatch =
      includePilotedCommands &&
      card.__typename === "CommandCard" &&
      (card as AnyRecord)["pilot"] != null;
    if (!typeMatch && !pilotedCommandMatch) return false;

    const c = card as AnyRecord;

    // level
    if (filter.level?.length) {
      if (typeof c["level"] !== "number" || !filter.level.includes(c["level"]))
        return false;
    }

    // cost
    if (filter.cost?.length) {
      if (typeof c["cost"] !== "number" || !filter.cost.includes(c["cost"]))
        return false;
    }

    // package
    if (filter.package != null) {
      if (c["package"] !== filter.package) return false;
    }

    // rarity — absent rarity treated as "COMMON"
    if (filter.rarity != null) {
      const cardRarity =
        typeof c["rarity"] === "string" ? c["rarity"] : "COMMON";
      if (cardRarity !== filter.rarity) return false;
    }

    // keyword — card must contain ALL listed keywords
    if (filter.keyword?.length) {
      const cardKws = Array.isArray(c["keywords"])
        ? (c["keywords"] as string[])
        : [];
      if (!filter.keyword.every((kw) => cardKws.includes(kw))) return false;
    }

    // trait — card must contain ALL listed traits
    if (filter.trait?.length) {
      const cardTraits = Array.isArray(c["trait"])
        ? (c["trait"] as string[])
        : [];
      if (!filter.trait.every((t) => cardTraits.includes(t))) return false;
    }

    // zone — card must overlap at least one requested zone
    if (filter.zone?.length) {
      const cardZones = Array.isArray(c["zone"]) ? (c["zone"] as string[]) : [];
      if (!filter.zone.some((z) => cardZones.includes(z))) return false;
    }

    // color — card must match at least one requested color
    if (filter.color?.length) {
      const cardColor = typeof c["color"] === "string" ? c["color"] : null;
      if (!cardColor || !filter.color.includes(cardColor)) return false;
    }

    // full-text search across name and description
    if (filter.query) {
      const q = filter.query.toLowerCase();
      const nameHit =
        typeof c["name"] === "string" && c["name"].toLowerCase().includes(q);
      const descHit =
        Array.isArray(c["description"]) &&
        (c["description"] as string[]).some((line) =>
          line.toLowerCase().includes(q),
        );
      if (!nameHit && !descHit) return false;
    }

    return true;
  });
}

// ─── Search history (localStorage) ───────────────────────────────────────────

const SEARCH_HISTORY_KEY = "gcg_search_history";
const SEARCH_HISTORY_MAX = 15;

function filterKey(f: SearchHistoryFilter): string {
  const normalized: Record<string, unknown> = {};
  for (const k of Object.keys(f).sort()) {
    const v = (f as unknown as Record<string, unknown>)[k];
    normalized[k] = Array.isArray(v) ? [...v].sort() : v ?? null;
  }
  return JSON.stringify(normalized);
}

interface SearchHistoryFilter extends CardFilterInput {
  sort: string | null;
}

interface FilterSearchHistory {
  __typename: "FilterSearchHistory";
  id: string;
  filter: SearchHistoryFilter;
  searchedAt: string;
}

interface CardViewHistory {
  __typename: "CardViewHistory";
  id: string;
  cardId: string;
  cardName: string;
  searchedAt: string;
}

type SearchHistoryEntry = FilterSearchHistory | CardViewHistory;

const SEARCH_HISTORY_LIST_ID = "SearchHistoryList:singleton";

interface SearchHistoryList {
  __typename: "SearchHistoryList";
  id: string;
  items: SearchHistoryEntry[];
}

function makeSearchHistoryList(items: SearchHistoryEntry[]): SearchHistoryList {
  return { __typename: "SearchHistoryList", id: SEARCH_HISTORY_LIST_ID, items };
}

function readSearchHistory(): SearchHistoryEntry[] {
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

// ─── Root resolvers ───────────────────────────────────────────────────────────

interface CardsArgs {
  first?: number;
  after?: string;
  filter?: CardFilterInput;
  sort?: string;
}

const rootValue = {
  /** Query.node — look up any Node by its global ID */
  node({ id }: { id: string }): RawCard | SearchHistoryEntry | SearchHistoryList | null {
    if (id === SEARCH_HISTORY_LIST_ID) return makeSearchHistoryList(readSearchHistory());
    const historyEntry = readSearchHistory().find((e) => e.id === id);
    if (historyEntry) return historyEntry;
    return cardById.get(id) ?? null;
  },

  /** Query.cards — filtered, sorted, cursor-paginated CardConnection */
  cards({ first = 20, after, filter, sort }: CardsArgs) {
    if (!filter) throw new Error("`filter` argument is required on `cards`");

    const filtered = applyFilter(allCards, filter);
    const sorted = applySort(filtered, sort);
    const totalCount = sorted.length;

    let startIndex = 0;
    if (after != null) startIndex = decodeCursor(after) + 1;

    const endIndex = startIndex + first;
    const page = sorted.slice(startIndex, endIndex);

    const edges = page.map((node, i) => ({
      cursor: encodeCursor(startIndex + i),
      node,
    }));

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

  /** Query.searchHistory — returns the singleton SearchHistoryList node */
  searchHistory(): SearchHistoryList {
    return makeSearchHistoryList(readSearchHistory());
  },

  /** Query.quicksearch — fzf-style search across name, description, trait, link */
  quicksearch({ query, first = 20 }: { query: string; first?: number }) {
    if (!query.trim()) return [];

    // Parenthesised query → treat as trait-focused search and apply a large
    // trait bonus so that trait matches rank to the top.
    const trimmed = query.trim();
    const traitFocused =
      trimmed.startsWith("(") && trimmed.endsWith(")") && trimmed.length > 2;
    const cleanQuery = traitFocused ? trimmed.slice(1, -1).trim() : trimmed;

    const TRAIT_BONUS = 40;

    const scored: Array<{ score: number; card: RawCard }> = [];

    for (const card of allCards) {
      const tokens = cardSearchTokens(card as AnyRecord);

      const idScore = bestFzfScore(cleanQuery, tokens.id);
      const nameScore = bestFzfScore(cleanQuery, tokens.name);
      const descScore = bestFzfScore(cleanQuery, tokens.description);
      const traitScore = bestFzfScore(cleanQuery, tokens.traits);
      const linkScore = bestFzfScore(cleanQuery, tokens.links);

      const boostedTraitScore =
        traitFocused && traitScore >= 0 ? traitScore + TRAIT_BONUS : traitScore;

      const maxScore = Math.max(
        idScore,
        nameScore,
        descScore,
        boostedTraitScore,
        linkScore,
      );
      if (maxScore >= 0) {
        // Name matches get a boost unless we're in trait-focused mode
        const finalScore =
          !traitFocused && nameScore >= 0 ? maxScore + 20 : maxScore;
        scored.push({ score: finalScore, card });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, first).map((s) => s.card);
  },

  /** Mutation.addSearchHistory — prepend filter+sort, deduplicate by serialized key, cap at max */
  /** Mutation.addFilterSearch — save a filter+sort search to history */
  addFilterSearch({
    filter,
    sort,
  }: {
    filter: CardFilterInput;
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
      (e) =>
        !(
          e.__typename === "FilterSearchHistory" &&
          filterKey(e.filter) === key
        ),
    );
    const updated = [entry, ...existing].slice(0, SEARCH_HISTORY_MAX);
    writeSearchHistory(updated);
    return makeSearchHistoryList(updated);
  },

  /** Mutation.addCardView — save a card detail view to history */
  addCardView({ cardId }: { cardId: string }): SearchHistoryList {
    const card = cardById.get(cardId) as AnyRecord | undefined;
    let cardName = cardId;
    if (card) {
      if (typeof card["name"] === "string") cardName = card["name"];
    }
    const searchedAt = new Date().toISOString();
    const entry: CardViewHistory = {
      __typename: "CardViewHistory",
      id: btoa(`CardViewHistory:${searchedAt}`),
      cardId,
      cardName,
      searchedAt,
    };
    const existing = readSearchHistory().filter(
      (e) => !(e.__typename === "CardViewHistory" && e.cardId === cardId),
    );
    const updated = [entry, ...existing].slice(0, SEARCH_HISTORY_MAX);
    writeSearchHistory(updated);
    return makeSearchHistoryList(updated);
  },

  /** Mutation.removeSearchHistory — remove a single entry by its Node id */
  removeSearchHistory({ id }: { id: string }): boolean {
    const updated = readSearchHistory().filter((e) => e.id !== id);
    writeSearchHistory(updated);
    return true;
  },

  /** Mutation.clearSearchHistory — wipe all entries */
  clearSearchHistory(): boolean {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    return true;
  },
};

// ─── Field resolver ───────────────────────────────────────────────────────────

function fieldResolver(
  source: AnyRecord,
  args: AnyRecord,
  context: unknown,
  info: GraphQLResolveInfo,
): unknown {
  const { fieldName, parentType } = info;
  const typeName = parentType.name;

  // ── PilotCard.pilot → construct Pilot from flat raw fields ─────────────────
  //    Raw: { name: string, AP: number, HP: number, ... } (top-level)
  //    Schema: pilot: Pilot!
  if (typeName === "PilotCard" && fieldName === "pilot") {
    return {
      name: (source["name"] as string | undefined) ?? "",
      AP: (source["AP"] as number | null | undefined) ?? 0,
      HP: (source["HP"] as number | null | undefined) ?? 0,
    };
  }

  // ── CommandCard.pilot → extract pilot name from description ──────────────
  //    Raw: pilot: { name: "", AP: number, HP: number }  (name is always "")
  //    Actual name is embedded in description as 【파일럿】[<name>]
  if (typeName === "CommandCard" && fieldName === "pilot") {
    const raw = source["pilot"] as
      | { AP?: number; HP?: number }
      | null
      | undefined;
    if (raw == null) return null;
    const desc = source["description"];
    let name = "";
    if (Array.isArray(desc)) {
      for (const line of desc as string[]) {
        const match = /【파일럿】\[([^\]]+)\]/.exec(line);
        if (match?.[1]) {
          name = match[1];
          break;
        }
      }
    }
    return {
      name,
      AP: (raw["AP"] as number | null | undefined) ?? 0,
      HP: (raw["HP"] as number | null | undefined) ?? 0,
    };
  }

  // ── LinkPilot.pilot → look up PilotCard by name, return Pilot ─────────────
  //    Raw: { __typename: "LinkPilot", pilotName: string }
  //    Schema: pilot: Pilot!  (non-null — stub when pilot not in dataset)
  if (typeName === "LinkPilot" && fieldName === "pilot") {
    const pilotName = source["pilotName"] as string | undefined;
    const name = pilotName ?? "unknown";
    const card = pilotName ? pilotByName.get(pilotName) : undefined;
    return {
      name,
      AP: (card?.["AP"] as number | null | undefined) ?? 0,
      HP: (card?.["HP"] as number | null | undefined) ?? 0,
    };
  }

  // ── Pilot.AP / Pilot.HP → null coercion ─────────────────────────────────
  if (typeName === "Pilot" && (fieldName === "AP" || fieldName === "HP")) {
    return (source[fieldName] as number | null | undefined) ?? 0;
  }

  // ── UnitCard.traits / BaseCard.traits / PilotCard.traits / CommandCard.traits → raw field is "trait" (singular) ─────
  if (
    (typeName === "UnitCard" ||
      typeName === "BaseCard" ||
      typeName === "PilotCard" ||
      typeName === "CommandCard") &&
    fieldName === "traits"
  ) {
    const raw = source["trait"];
    return Array.isArray(raw) ? raw : [];
  }

  // ── UnitCard.links → raw field is "link" (single object or absent) ───
  //    Schema: links: [UnitLink!]!  — always an array, never null.
  if (typeName === "UnitCard" && fieldName === "links") {
    const raw = source["link"];
    if (raw == null) return [];
    return [raw];
  }

  // ── UnitCard / BaseCard AP / HP → null coercion ───────────────────────────
  if (
    (typeName === "UnitCard" || typeName === "BaseCard") &&
    (fieldName === "AP" || fieldName === "HP")
  ) {
    return (source[fieldName] as number | null | undefined) ?? 0;
  }

  // ── rarity → default to "COMMON" when absent ──────────────────────────────
  //    Applies to all card types (UnitCard, PilotCard, BaseCard, CommandCard,
  //    Resource) since the raw dataset does not carry rarity information yet.
  if (fieldName === "rarity") {
    const value = source["rarity"];
    return typeof value === "string" ? value : "COMMON";
  }

  // Default resolver — handles all remaining fields including:
  //   • CommandCard.pilot  (nullable Pilot already nested in raw data)
  return defaultFieldResolver(source, args, context, info);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Execute a GraphQL query against the local card dataset.
 *
 * @example
 * const result = await serveGraphQL(
 *   `query($f: CardFilterInput!) {
 *      cards(first: 10, filter: $f) {
 *        totalCount
 *        edges { node { ... on UnitCard { id name AP HP } } }
 *      }
 *    }`,
 *   { f: { kind: "UNIT", package: "GD01" } },
 * );
 */
export function serveGraphQL(
  query: string,
  variables?: Record<string, unknown>,
) {
  return executeSync({
    schema,
    document: parse(query),
    variableValues: variables,
    rootValue,
    fieldResolver,
  });
}

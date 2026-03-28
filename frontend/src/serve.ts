/**
 * serve.ts — In-browser GraphQL execution backed by the local card dataset.
 *
 * • Builds an executable schema from schema.graphql via graphql-js buildSchema,
 *   after SDL preprocessing to fix three issues in schema.graphql
 *   (schema.graphql is NOT modified — preprocessing happens at runtime):
 *
 *     1. `type PlayableCard` → `interface PlayableCard`
 *     2. `pack: CardPackage!` → `package: CardPackage!` inside that interface
 *        (all concrete types already use `package`)
 *     3. `type CommandCard implements PlayableCard & Node` →
 *        `type CommandCard implements Node`
 *        (CommandCard only declares 5 fields and cannot satisfy the full
 *        PlayableCard interface)
 *
 * • Wires resolveType handlers onto the Card union, UnitLink union,
 *   Node interface, and PlayableCard interface.
 * • Provides root resolvers for Query.node and Query.cards
 *   (Relay-style cursor pagination + full CardFilterInput support).
 * • A custom fieldResolver bridges mismatches between the raw JSON and
 *   the GraphQL schema:
 *     – LinkPilot.pilot : raw JSON stores pilotName: string;
 *                         schema declares pilot: PilotCard! (non-null).
 *                         Returns a stub PilotCard when the name is not found.
 *     – rarity          : raw data may omit rarity; schema says CardRarity!.
 *                         Defaults to "COMMON".
 *     – AP / HP         : some rows have null; schema says Int!.
 *                         Coerces null → 0.
 */

import { buildSchema, execute, parse, defaultFieldResolver } from "graphql";
import type {
  GraphQLUnionType,
  GraphQLInterfaceType,
  GraphQLResolveInfo,
} from "graphql";
import schemaSDL from "../schema.graphql?raw";
import allCardsRaw from "../../data/combined.json";

// ─── Raw data types ────────────────────────────────────────────────────────────

type RawCard = (typeof allCardsRaw)[number];
type AnyRecord = Record<string, unknown>;

// ─── SDL preprocessing ─────────────────────────────────────────────────────────

const processedSDL = schemaSDL
  // Fix 1: promote PlayableCard from a concrete type to an interface
  .replace(/\btype PlayableCard\b/, "interface PlayableCard")
  // Fix 2: rename `pack` → `package` in the PlayableCard interface
  //        (only appears once in the SDL; all concrete types already say `package`)
  .replace("  pack: CardPackage!", "  package: CardPackage!")
  // Fix 3: CommandCard cannot satisfy the full PlayableCard interface
  //        (it only declares 5 fields), so remove it from the implements clause
  .replace(
    "type CommandCard implements PlayableCard & Node",
    "type CommandCard implements Node",
  );

// ─── Schema ────────────────────────────────────────────────────────────────────

export const schema = buildSchema(processedSDL);

// ─── resolveType hooks ─────────────────────────────────────────────────────────

/**
 * Raw data uses __typename "ResourceCard" for what the schema calls "Resource".
 * All other __typename values already match.
 */
const resolveNodeType = (obj: { __typename: string }): string =>
  obj.__typename === "ResourceCard" ? "Resource" : obj.__typename;

/** Card union resolver. */
(schema.getType("Card") as GraphQLUnionType).resolveType = resolveNodeType;

/**
 * UnitLink union resolver.
 * Raw values "LinkTrait" and "LinkPilot" already match the schema type names.
 */
(schema.getType("UnitLink") as GraphQLUnionType).resolveType = (obj: {
  __typename: string;
}) => obj.__typename;

/** Node interface resolver. */
(schema.getType("Node") as GraphQLInterfaceType).resolveType = resolveNodeType;

/**
 * PlayableCard interface resolver.
 * Required when a fragment on PlayableCard is used; the runtime type must be
 * resolvable from the raw object.
 */
(schema.getType("PlayableCard") as GraphQLInterfaceType).resolveType =
  resolveNodeType;

// ─── Data indexes ──────────────────────────────────────────────────────────────

const allCards = allCardsRaw as RawCard[];

/** O(1) card lookup for Query.node */
const cardById = new Map<string, RawCard>(
  allCards
    .filter((c): c is Extract<RawCard, { id: string }> => "id" in c && !!c.id)
    .map((c) => [c.id, c]),
);

/** O(1) pilot lookup for LinkPilot.pilot field resolution */
const pilotByName = new Map<string, RawCard>(
  allCards
    .filter(
      (c): c is RawCard & { name: string } =>
        c.__typename === "PilotCard" &&
        "name" in c &&
        typeof c.name === "string",
    )
    .map((c) => [(c as AnyRecord)["name"] as string, c]),
);

// ─── Cursor helpers ────────────────────────────────────────────────────────────

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

// ─── Filtering ─────────────────────────────────────────────────────────────────

const KIND_TO_TYPENAME: Record<string, string> = {
  RESOURCE: "ResourceCard",
  BASE: "BaseCard",
  UNIT: "UnitCard",
  PILOT: "PilotCard",
  COMMAND: "CommandCard",
};

interface CardFilterInput {
  /** Required — must be one of RESOURCE | BASE | UNIT | PILOT | COMMAND */
  kind: string;
  level?: number[];
  cost?: number[];
  package?: string;
  /** Matches against the raw `rarity` field; absent rarity defaults to "COMMON". */
  rarity?: string;
  keyword?: string[];
  zone?: string[];
  query?: string;
}

function applyFilter(cards: RawCard[], filter: CardFilterInput): RawCard[] {
  const targetTypename = KIND_TO_TYPENAME[filter.kind];
  if (!targetTypename) return [];

  return cards.filter((card) => {
    // ── kind (required) ──────────────────────────────────────────────────────
    if (card.__typename !== targetTypename) return false;

    const c = card as AnyRecord;

    // ── level ────────────────────────────────────────────────────────────────
    if (filter.level?.length) {
      if (typeof c["level"] !== "number" || !filter.level.includes(c["level"]))
        return false;
    }

    // ── cost ─────────────────────────────────────────────────────────────────
    if (filter.cost?.length) {
      if (typeof c["cost"] !== "number" || !filter.cost.includes(c["cost"]))
        return false;
    }

    // ── package ───────────────────────────────────────────────────────────────
    if (filter.package != null) {
      if (c["package"] !== filter.package) return false;
    }

    // ── rarity — absent rarity on a card is treated as "COMMON" ──────────────
    if (filter.rarity != null) {
      const cardRarity =
        typeof c["rarity"] === "string" ? c["rarity"] : "COMMON";
      if (cardRarity !== filter.rarity) return false;
    }

    // ── keyword — card must contain ALL listed keywords ───────────────────────
    if (filter.keyword?.length) {
      const cardKws = Array.isArray(c["keywords"])
        ? (c["keywords"] as string[])
        : [];
      if (!filter.keyword.every((kw) => cardKws.includes(kw))) return false;
    }

    // ── zone — card must overlap at least one requested zone ─────────────────
    if (filter.zone?.length) {
      const cardZones = Array.isArray(c["zone"]) ? (c["zone"] as string[]) : [];
      if (!filter.zone.some((z) => cardZones.includes(z))) return false;
    }

    // ── full-text search across name and description ──────────────────────────
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

// ─── Root resolvers ────────────────────────────────────────────────────────────

interface CardsArgs {
  first?: number;
  after?: string;
  filter?: CardFilterInput;
}

const rootValue = {
  /** Query.node — returns any Node by its global ID */
  node({ id }: { id: string }): RawCard | null {
    return cardById.get(id) ?? null;
  },

  /** Query.cards — filtered, paginated CardConnection */
  cards({ first = 20, after, filter }: CardsArgs) {
    if (!filter) throw new Error("`filter` argument is required on `cards`");

    const filtered = applyFilter(allCards, filter);

    const totalCount = filtered.length;

    // Determine the zero-based start position from the cursor
    let startIndex = 0;
    if (after != null) {
      startIndex = decodeCursor(after) + 1;
    }

    const endIndex = startIndex + first;
    const page = filtered.slice(startIndex, endIndex);

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
};

// ─── Stub pilot factory ────────────────────────────────────────────────────────

/**
 * Returns a minimal PilotCard stub for use when the raw data references a
 * pilot by name but no matching PilotCard exists in the dataset.
 * LinkPilot.pilot is declared PilotCard! (non-null), so we must never return
 * null here.
 */
function makePilotStub(name: string): AnyRecord {
  return {
    __typename: "PilotCard",
    id: `stub:${name}`,
    name,
    level: 0,
    cost: 0,
    series: "MOBILE_SUIT_GUNDAM",
    color: "BLUE",
    rarity: "COMMON",
    package: "BASIC_CARDS",
    keywords: [],
    trait: [],
    description: [],
    AP: 0,
    HP: 0,
  };
}

// ─── Custom field resolver ─────────────────────────────────────────────────────
//
// Handles three schema ↔ data mismatches without touching the raw JSON:
//
//  1. LinkPilot.pilot
//     Raw: { __typename: "LinkPilot", pilotName: string }
//     Schema: pilot: PilotCard!  (non-null)
//     Fix: look up PilotCard by pilotName; return a stub when not found so
//          we never violate the non-null contract.
//
//  2. rarity  (UnitCard | PilotCard | BaseCard)
//     Raw: field may be absent
//     Schema: CardRarity!  (non-null)
//     Fix: default to "COMMON" when the field is missing or non-string.
//
//  3. AP / HP  (UnitCard | PilotCard | BaseCard)
//     Raw: can be null for some BaseCard rows
//     Schema: Int!  (non-null)
//     Fix: coerce null / undefined → 0.

function fieldResolver(
  source: AnyRecord,
  args: AnyRecord,
  context: unknown,
  info: GraphQLResolveInfo,
): unknown {
  const { fieldName, parentType } = info;
  const typeName = parentType.name;

  // ── LinkPilot.pilot → look up PilotCard; return stub if not found ───────────
  if (typeName === "LinkPilot" && fieldName === "pilot") {
    const name = source["pilotName"] as string | undefined;
    if (!name) return makePilotStub("unknown");
    return pilotByName.get(name) ?? makePilotStub(name);
  }

  // ── rarity → default to "COMMON" when absent ─────────────────────────────────
  if (
    (typeName === "UnitCard" ||
      typeName === "BaseCard" ||
      typeName === "PilotCard") &&
    fieldName === "rarity"
  ) {
    const value = source["rarity"];
    return typeof value === "string" ? value : "COMMON";
  }

  // ── AP / HP null coercion ────────────────────────────────────────────────────
  if (
    (typeName === "UnitCard" ||
      typeName === "BaseCard" ||
      typeName === "PilotCard") &&
    (fieldName === "AP" || fieldName === "HP")
  ) {
    const value = source[fieldName];
    return value ?? 0;
  }

  // Fall back to the default resolver for everything else.
  // UnitCard.link is handled here — schema says `link: UnitLink` (single
  // nullable), so we simply return the raw value (object or undefined/null).
  return defaultFieldResolver(source, args, context, info);
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Execute a GraphQL query against the local card dataset.
 *
 * @param query     - GraphQL query / mutation string
 * @param variables - Optional variable map
 * @returns         - Standard graphql-js ExecutionResult
 *
 * @example
 * const result = await serveGraphQL(`
 *   query Cards($filter: CardFilterInput!) {
 *     cards(first: 10, filter: $filter) {
 *       totalCount
 *       edges { cursor node { ... on UnitCard { id name AP HP } } }
 *       pageInfo { hasNextPage endCursor }
 *     }
 *   }
 * `, { filter: { kind: "UNIT", package: "ST01" } });
 */
export async function serveGraphQL(
  query: string,
  variables?: Record<string, unknown>,
) {
  return execute({
    schema,
    document: parse(query),
    variableValues: variables,
    rootValue,
    fieldResolver,
  });
}

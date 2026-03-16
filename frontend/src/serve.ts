/**
 * serve.ts — In-browser GraphQL execution backed by the local card dataset.
 *
 * • Builds an executable schema from schema.graphql via graphql-js buildSchema.
 * • Wires resolveType handlers onto the Card and UnitLink union types.
 * • Provides root resolvers for Query.node and Query.cards
 *   (Relay-style cursor pagination + full CardFilterInput support).
 * • A custom fieldResolver bridges two mismatches between the raw JSON and
 *   the GraphQL schema:
 *     – UnitCard.link  : raw JSON stores a single UnitLink object (or omits it);
 *                        the schema declares [UnitLink!]! (non-null array).
 *     – LinkPilot.pilot: raw JSON stores pilotName: string;
 *                        the schema declares pilot: PilotCard!.
 *     – AP / HP        : some BaseCard rows have null; the schema says Int!.
 */

import { buildSchema, execute, parse, defaultFieldResolver } from "graphql";
import type {
  GraphQLUnionType,
  GraphQLInterfaceType,
  GraphQLResolveInfo,
} from "graphql";
import schemaSDL from "../schema.graphql?raw";
import allCardsRaw from "../../data/mapped.json";

// ─── Raw data types ────────────────────────────────────────────────────────────

type RawCard = (typeof allCardsRaw)[number];
type AnyRecord = Record<string, unknown>;

// ─── Schema ────────────────────────────────────────────────────────────────────

export const schema = buildSchema(schemaSDL);

/**
 * Card union resolver.
 * Raw data uses __typename "ResourceCard" but the GraphQL type is "Resource".
 * All other __typename values already match the schema type names.
 */
(schema.getType("Card") as GraphQLUnionType).resolveType = (obj: {
  __typename: string;
}) => (obj.__typename === "ResourceCard" ? "Resource" : obj.__typename);

/**
 * UnitLink union resolver.
 * Raw data uses "LinkTrait" and "LinkPilot" which already match the schema.
 */
(schema.getType("UnitLink") as GraphQLUnionType).resolveType = (obj: {
  __typename: string;
}) => obj.__typename;

/**
 * Node interface resolver.
 * Required so that Query.node can return ResourceCard objects (whose raw
 * __typename is "ResourceCard") and have them correctly identified as the
 * GraphQL "Resource" type.  All other __typename values already match.
 */
const resolveNodeType = (obj: { __typename: string }) =>
  obj.__typename === "ResourceCard" ? "Resource" : obj.__typename;

(schema.getType("Node") as GraphQLInterfaceType).resolveType = resolveNodeType;

/**
 * PlayableCard interface resolver.
 * Needed when a PlayableCard fragment is used in a query; the runtime type
 * must be resolvable from the raw object.
 */
(schema.getType("PlayableCard") as GraphQLInterfaceType).resolveType =
  resolveNodeType;

// ─── Data indexes ──────────────────────────────────────────────────────────────

const allCards = allCardsRaw as RawCard[];

/** O(1) card lookup for node(id) */
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
    .map((c) => [c.name, c]),
);

// ─── Cursor helpers ────────────────────────────────────────────────────────────

const encodeCursor = (index: number) => btoa(`cursor:${index}`);

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

// ─── Custom field resolver ─────────────────────────────────────────────────────
//
// Handles three schema ↔ data mismatches without touching the raw JSON:
//
//  1. UnitCard.link
//     Raw: absent | single UnitLink object
//     Schema: [UnitLink!]!  (non-null array)
//     Fix: wrap in array; default to []
//
//  2. LinkPilot.pilot
//     Raw: { __typename: "LinkPilot", pilotName: string }
//     Schema: pilot: PilotCard!
//     Fix: look up the PilotCard by name from the global index
//
//  3. BaseCard.AP / UnitCard.AP / HP
//     Raw: can be null for some BaseCard rows
//     Schema: Int!  (non-null)
//     Fix: coerce null → 0

function fieldResolver(
  source: AnyRecord,
  args: AnyRecord,
  context: unknown,
  info: GraphQLResolveInfo,
): unknown {
  const { fieldName, parentType } = info;
  const typeName = parentType.name;

  // ── UnitCard.link → always return an array ──────────────────────────────────
  if (typeName === "UnitCard" && fieldName === "link") {
    const raw = source["link"];
    if (raw == null) return [];
    return Array.isArray(raw) ? raw : [raw];
  }

  // ── LinkPilot.pilot → look up PilotCard by stored pilotName ─────────────────
  if (typeName === "LinkPilot" && fieldName === "pilot") {
    const name = source["pilotName"] as string | undefined;
    if (!name) return null;
    return pilotByName.get(name) ?? null;
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

  // Fall back to the default resolver for everything else
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

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

import { buildSchema, execute, parse, defaultFieldResolver } from "graphql";
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

(schema.getType("Node") as GraphQLInterfaceType).resolveType = resolveNodeType;

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
  zone?: string[];
  query?: string;
}

function applyFilter(cards: RawCard[], filter: CardFilterInput): RawCard[] {
  // Map kind array to __typename values
  const targetTypenames = filter.kind
    .map((k) => KIND_TO_TYPENAME[k])
    .filter((t): t is string => !!t);

  if (targetTypenames.length === 0) return [];

  return cards.filter((card) => {
    // kind — card must match at least one of the requested kinds (OR condition)
    if (!targetTypenames.includes(card.__typename)) return false;

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

    // zone — card must overlap at least one requested zone
    if (filter.zone?.length) {
      const cardZones = Array.isArray(c["zone"]) ? (c["zone"] as string[]) : [];
      if (!filter.zone.some((z) => cardZones.includes(z))) return false;
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

// ─── Root resolvers ───────────────────────────────────────────────────────────

interface CardsArgs {
  first?: number;
  after?: string;
  filter?: CardFilterInput;
  sort?: string;
}

const rootValue = {
  /** Query.node — look up any Node by its global ID */
  node({ id }: { id: string }): RawCard | null {
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

  // ── Pilot.AP / Pilot.HP → null coercion ───────────────────────────────────
  //    Covers CommandCard.pilot.{AP,HP} resolved by the default resolver.
  if (typeName === "Pilot" && (fieldName === "AP" || fieldName === "HP")) {
    return (source[fieldName] as number | null | undefined) ?? 0;
  }

  // ── UnitCard.traits → raw field is "trait" (singular) ────────────────
  if (typeName === "UnitCard" && fieldName === "traits") {
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

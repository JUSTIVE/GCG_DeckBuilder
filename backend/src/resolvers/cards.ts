import { sql } from "kysely";
import {
  allCards, cardById as cardByIdMap, pilotByName,
  makeTrait, makeKeyword, makeColor, makeSeries,
  encodeCursor, decodeCursor,
} from "../serve/cards";
import {
  readSearchHistory, makeSearchHistoryList,
  addFilterSearch, addCardView, removeSearchHistory, clearSearchHistory,
} from "../serve/history";
import { DECK_MAX_COPIES } from "../serve/decks";
import type { Context } from "../context";

type AnyObj = Record<string, unknown>;

const KIND_TO_TYPENAME: Record<string, string> = {
  UNIT: "UnitCard", PILOT: "PilotCard", COMMAND: "CommandCard",
  BASE: "BaseCard", RESOURCE: "ResourceCard",
};
const SORT_COLUMN: Record<string, string> = {
  NAME_ASC: "name_en", NAME_DESC: "name_en",
  COST_ASC: "cost",   COST_DESC: "cost",
  LEVEL_ASC: "level", LEVEL_DESC: "level",
  AP_ASC: "ap",       AP_DESC: "ap",
  HP_ASC: "hp",       HP_DESC: "hp",
};
const SORT_DIR: Record<string, "asc" | "desc"> = {
  NAME_ASC: "asc",  NAME_DESC: "desc",
  COST_ASC: "asc",  COST_DESC: "desc",
  LEVEL_ASC: "asc", LEVEL_DESC: "desc",
  AP_ASC: "asc",    AP_DESC: "desc",
  HP_ASC: "asc",    HP_DESC: "desc",
};

function getPrintings(source: AnyObj) {
  const raw = source["printings"] as Array<{ rarity: string; imageFile: string; block?: string }> | undefined;
  const fallback = {
    rarity: source["rarity"] ?? "COMMON",
    imageUrl: `/cards/${source["imageFile"] ?? source["id"]}.webp`,
    block: (source["block"] as string | undefined) ?? "",
  };
  return raw?.length
    ? raw.map((p) => ({ rarity: p.rarity ?? "COMMON", imageUrl: `/cards/${p.imageFile}.webp`, block: p.block ?? "" }))
    : [fallback];
}

const withApHp = {
  AP: (obj: AnyObj) => (obj.AP as number | null | undefined) ?? 0,
  HP: (obj: AnyObj) => (obj.HP as number | null | undefined) ?? 0,
};

const sharedCardFields = {
  color:         (obj: AnyObj) => makeColor(obj.color as string),
  series:        (obj: AnyObj) => makeSeries(obj.series as string),
  traits:        (obj: AnyObj) => ((obj.trait as string[]) ?? []).map(makeTrait),
  relatedTraits: (obj: AnyObj) => ((obj.relatedTrait as string[]) ?? []).map(makeTrait),
  keywords:      (obj: AnyObj) => ((obj.keywords as string[]) ?? []).map(makeKeyword),
  imageUrl(obj: AnyObj)      { return getPrintings(obj)[0]!.imageUrl; },
  rarity(obj: AnyObj)        { return getPrintings(obj)[0]!.rarity; },
  printings:     (obj: AnyObj) => getPrintings(obj),
  defaultPrinting(obj: AnyObj) { return getPrintings(obj)[0]!; },
  limit(obj: AnyObj) {
    return typeof obj.limit === "number" ? obj.limit : DECK_MAX_COPIES;
  },
  blocked(obj: AnyObj) {
    const limit = typeof obj.limit === "number" ? obj.limit : DECK_MAX_COPIES;
    return limit === 0;
  },
  description(obj: AnyObj) {
    const lines = (obj.description as unknown[][]) ?? [];
    return lines.map((tokens) => ({
      tokens: (tokens as AnyObj[]).map((t) => {
        const type = t.type as string;
        const __typename =
          type === "trigger" ? "TriggerToken" : type === "ability" ? "AbilityToken" : "ProseToken";
        if (__typename === "ProseToken") {
          const { en, ko, ...rest } = t as AnyObj & { en: string; ko: string };
          return { __typename, ...rest, text: { en: en ?? "", ko: ko ?? "" } };
        }
        return { __typename, ...t };
      }),
    }));
  },
};

export const cardResolvers = {
  Query: {
    async cards(_: unknown, { first, after, filter, sort }: AnyObj, ctx: Context) {
      const limit = Math.min((first as number) ?? 20, 100);
      const offset = after ? decodeCursor(after as string) : 0;
      const f = (filter ?? {}) as AnyObj;

      let q = ctx.db.selectFrom("cards");
      if (f.kind && (f.kind as string[]).length) {
        const typenames = (f.kind as string[]).map((k) => KIND_TO_TYPENAME[k]).filter(Boolean);
        if (typenames.length) q = q.where("typename", "in", typenames);
      }
      if ((f.color as string[] | undefined)?.length)   q = q.where("color", "in", f.color as string[]);
      if ((f.level as number[] | undefined)?.length)   q = q.where("level", "in", f.level as number[]);
      if ((f.cost as number[] | undefined)?.length)    q = q.where("cost", "in", f.cost as number[]);
      if (f.package)   q = q.where("package", "=", f.package as string);
      if (f.rarity)    q = q.where("rarity", "=", f.rarity as string);
      if ((f.series as string[] | undefined)?.length)  q = q.where("series", "in", f.series as string[]);
      if ((f.zone as string[] | undefined)?.length)    q = q.where(sql`zone && ${f.zone}::text[]`);
      if ((f.trait as string[] | undefined)?.length)   q = q.where(sql`traits && ${f.trait}::text[]`);
      if ((f.keyword as string[] | undefined)?.length) q = q.where(sql`keywords && ${f.keyword}::text[]`);
      if (f.query) {
        const like = `%${f.query}%`;
        q = q.where((eb) => eb.or([eb("name_en", "ilike", like), eb("name_ko", "ilike", like)]));
      }

      const [countRow, rows] = await Promise.all([
        q.select(sql<string>`count(*)`.as("count")).executeTakeFirst(),
        q.selectAll()
          .orderBy((sort ? SORT_COLUMN[sort as string] : "id") as never, sort ? SORT_DIR[sort as string] : "asc")
          .limit(limit + 1).offset(offset).execute(),
      ]);

      const totalCount = parseInt(countRow?.count ?? "0", 10);
      const hasNextPage = rows.length > limit;
      const items = hasNextPage ? rows.slice(0, limit) : rows;
      const edges = items.map((row, i) => ({ cursor: encodeCursor(offset + i), node: row.raw as never }));

      return {
        totalCount, edges,
        pageInfo: {
          hasNextPage, hasPreviousPage: offset > 0,
          startCursor: edges[0]?.cursor ?? null,
          endCursor: edges[edges.length - 1]?.cursor ?? null,
        },
      };
    },

    node(_: unknown, { id }: { id: string }) {
      const direct = cardByIdMap.get(id);
      if (direct) return direct as never;
      const decoded = Buffer.from(id, "base64").toString("utf8");
      if (decoded.startsWith("Trait:"))   return makeTrait(decoded.slice(6)) as never;
      if (decoded.startsWith("Keyword:")) return makeKeyword(decoded.slice(8)) as never;
      if (decoded.startsWith("Color:"))   return makeColor(decoded.slice(6)) as never;
      if (decoded.startsWith("Series:"))  return makeSeries(decoded.slice(7)) as never;
      return (cardByIdMap.get(decoded) ?? null) as never;
    },

    quicksearch(_: unknown, { query, first }: { query: string; first?: number }) {
      const q = query.toLowerCase().trim();
      const limit = first ?? 10;
      const results: unknown[] = [];
      for (const card of allCards) {
        if (results.length >= limit) break;
        const c = card as AnyObj;
        const name = c["name"] as { en?: string; ko?: string } | string | undefined;
        const nameEn = typeof name === "object" ? (name?.en ?? "") : (name ?? "");
        const nameKo = typeof name === "object" ? (name?.ko ?? "") : (name ?? "");
        const id = c["id"] as string | undefined;
        if (nameEn.toLowerCase().includes(q) || nameKo.toLowerCase().includes(q) || (id && id.toLowerCase().includes(q))) {
          results.push(card);
        }
      }
      return results as never;
    },

    searchHistory() { return makeSearchHistoryList(readSearchHistory()) as never; },

    async randomCard(_: unknown, { kind }: { kind: string }, ctx: Context) {
      const target = KIND_TO_TYPENAME[kind];
      if (!target) return null;
      const row = await ctx.db.selectFrom("cards").select("raw")
        .where("typename", "=", target).orderBy(sql`RANDOM()`).limit(1).executeTakeFirst();
      return (row?.raw ?? null) as never;
    },

    async randomCards(_: unknown, { kind, count }: { kind: string; count: number }, ctx: Context) {
      const target = KIND_TO_TYPENAME[kind];
      if (!target) return [];
      const rows = await ctx.db.selectFrom("cards").select("raw")
        .where("typename", "=", target).orderBy(sql`RANDOM()`).limit(count).execute();
      return rows.map((r) => r.raw) as never;
    },

    trait(_: unknown, { value }: { value: string })  { return makeTrait(value) as never; },
    keyword(_: unknown, { value }: { value: string }) { return makeKeyword(value) as never; },
    color(_: unknown, { value }: { value: string })   { return makeColor(value) as never; },
    series(_: unknown, { value }: { value: string })  { return makeSeries(value) as never; },
  },

  Mutation: {
    addFilterSearch(_: unknown, { filter, sort }: AnyObj) { return addFilterSearch({ filter, sort } as never) as never; },
    addCardView(_: unknown, { cardId }: { cardId: string }) { return addCardView({ cardId }) as never; },
    removeSearchHistory(_: unknown, { id }: { id: string }) { return removeSearchHistory({ id }) as never; },
    clearSearchHistory() { return clearSearchHistory() as never; },
  },

  Card: {
    __resolveType(obj: AnyObj) {
      const t = obj.__typename as string;
      return t === "ResourceCard" ? "Resource" : t;
    },
  },
  PlayableCard: {
    __resolveType(obj: AnyObj) {
      const t = obj.__typename as string;
      return t === "ResourceCard" ? "Resource" : t;
    },
  },
  UnitLink:       { __resolveType: (obj: AnyObj) => obj.__typename as string },
  DescriptionToken: {
    __resolveType(obj: AnyObj) {
      const type = obj.type as string;
      if (type === "trigger") return "TriggerToken";
      if (type === "ability") return "AbilityToken";
      return "ProseToken";
    },
  },
  CardGrouping:   { __resolveType: (obj: AnyObj) => obj.__typename as string },
  SearchHistory:  { __resolveType: (obj: AnyObj) => obj.__typename as string },

  LinkPilot: {
    pilot(obj: AnyObj) {
      const pilotName = obj.pilotName as { en: string; ko: string } | undefined;
      const card = pilotName ? pilotByName.get(pilotName.ko) as AnyObj | undefined : undefined;
      return { name: pilotName ?? { en: "", ko: "" }, AP: (card?.["AP"] as number) ?? 0, HP: (card?.["HP"] as number) ?? 0 };
    },
  },
  CardViewHistory: {
    async card(obj: AnyObj, _: unknown, ctx: Context) {
      const row = await ctx.loaders.cardById.load(obj.cardId as string);
      return (row?.raw ?? null) as never;
    },
  },

  Trait:   { cards: () => [] as never },
  Keyword: { cards: () => [] as never },
  Color:   { cards: () => [] as never },
  Series:  { cards: () => [] as never },

  UnitCard:    { ...sharedCardFields, ...withApHp, links: (obj: AnyObj) => { const link = obj.link as AnyObj | null | undefined; return link ? [link] : []; } },
  PilotCard:   { ...sharedCardFields, pilot: (obj: AnyObj) => ({ name: obj.name, AP: obj.AP as number, HP: obj.HP as number }) },
  BaseCard:    { ...sharedCardFields, ...withApHp },
  CommandCard: { ...sharedCardFields },
  Resource:    {},
};

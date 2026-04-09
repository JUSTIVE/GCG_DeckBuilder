import { CardListPage, Query } from "@/page/CardListPage";
import { createFileRoute } from "@tanstack/react-router";
import { loadQuery } from "react-relay";
import { relayEnvironment } from "@/relay-environment";

const VALID_KINDS = ["UNIT", "PILOT", "BASE", "COMMAND"] as const;
const VALID_ZONES = ["SPACE", "EARTH"] as const;
const VALID_COLORS = ["BLUE", "GREEN", "RED", "YELLOW", "PURPLE", "WHITE"] as const;
const VALID_KEYWORDS = [
  "ACTION",
  "ACTIVATE_ACTION",
  "ACTIVATE_MAIN",
  "ATTACK",
  "BLOCKER",
  "BREACH",
  "BURST",
  "DEPLOY",
  "DESTROYED",
  "DURING_LINK",
  "DURING_PAIR",
  "FIRST_STRIKE",
  "HIGH_MANEUVER",
  "SUPPRESSION",
  "MAIN",
  "ONCE_PER_TURN",
  "END_OF_TURN",
  "PILOT",
  "REPAIR",
  "SUPPORT",
  "WHEN_LINKED",
  "WHEN_PAIRED",
] as const;
const VALID_TRAITS = [
  "ACADEMY",
  "OZ",
  "NEO_ZEON",
  "ZEON",
  "EARTH_ALLIANCE",
  "EARTH_FEDERATION",
  "MAGANAC_CORPS",
  "ZAFT",
  "OPERATION_METEOR",
  "NEWTYPE",
  "COORDINATOR",
  "CYBER_NEWTYPE",
  "STRONGHOLD",
  "WARSHIP",
  "TRIPLE_SHIP_ALLIANCE",
  "CIVILIAN",
  "WHITE_BASE_TEAM",
  "G_TEAM",
  "VANADIS_INSTITUTE",
  "ORB",
  "TEKKADAN",
  "TEIWAZ",
  "GJALLARHORN",
  "GUNDAM_FRAME",
  "ALAYA_VIJNANA",
  "TITANS",
  "VULTURE",
  "AEUG",
  "CLAN",
  "AGE_SYSTEM",
  "WHITE_FANG",
  "SIDE_6",
  "NEW_UNE",
  "UE",
  "VAGAN",
  "BIOLOGICAL_CPU",
  "ASUNO_FAMILY",
  "X_ROUNDER",
  "SUPERPOWER_BLOC",
  "CB",
  "INNOVADE",
  "GN_DRIVE",
  "SUPER_SOLDIER",
  "MAFTY",
  "SRA",
  "OLD_UNE",
  "JUPITRIS",
  "CYCLOPS_TEAM",
  "UN",
  "MINERVA_SQUAD",
] as const;
const VALID_PACKAGES = [
  "GD01",
  "GD02",
  "GD03",
  "ST01",
  "ST02",
  "ST03",
  "ST04",
  "ST05",
  "ST06",
  "ST07",
  "ST08",
  "ST09",
  "OTHER_PRODUCT_CARD",
  "EDITION_BETA",
  "BASIC_CARDS",
  "PROMOTION_CARD",
] as const;
const VALID_SERIES = [
  "MOBILE_SUIT_GUNDAM",
  "MOBILE_SUIT_Z_GUNDAM",
  "MOBILE_SUIT_GUNDAM_CHARS_COUNTERATTACK",
  "MOBILE_SUIT_GUNDAM_0080_WAR_IN_THE_POCKET",
  "MOBILE_SUIT_GUNDAM_WING",
  "AFTER_WAR_GUNDAM_X",
  "MOBILE_SUIT_GUNDAM_SEED",
  "MOBILE_SUIT_GUNDAM_SEED_DESTINY",
  "MOBILE_SUIT_GUNDAM_00",
  "MOBILE_SUIT_GUNDAM_UNICORN",
  "MOBILE_SUIT_GUNDAM_AGE",
  "MOBILE_SUIT_GUNDAM_IRON_BLOODED_ORPHANS",
  "MOBILE_SUIT_GUNDAM_HATHAWAYS_FLASH",
  "MOBILE_SUIT_GUNDAM_THE_WITCH_FROM_MERCURY",
  "MOBILE_SUIT_GUNDAM_GQUUUUUUX",
] as const;
const VALID_SORTS = [
  "NAME_ASC",
  "NAME_DESC",
  "COST_ASC",
  "COST_DESC",
  "LEVEL_ASC",
  "LEVEL_DESC",
  "AP_ASC",
  "AP_DESC",
  "HP_ASC",
  "HP_DESC",
] as const;

export type CardListSearch = {
  kind?: Array<(typeof VALID_KINDS)[number]>;
  cost?: number[];
  level?: number[];
  zone?: Array<(typeof VALID_ZONES)[number]>;
  color?: Array<(typeof VALID_COLORS)[number]>;
  keyword?: Array<(typeof VALID_KEYWORDS)[number]>;
  trait?: Array<(typeof VALID_TRAITS)[number]>;
  package?: (typeof VALID_PACKAGES)[number];
  series?: Array<(typeof VALID_SERIES)[number]>;
  query?: string;
  sort?: (typeof VALID_SORTS)[number];
  cardId?: string;
};

export type CardKeyword = (typeof VALID_KEYWORDS)[number];
export type CardTrait = (typeof VALID_TRAITS)[number];
export type CardSeries = (typeof VALID_SERIES)[number];

export const Route = createFileRoute("/cardlist")({
  validateSearch: (raw: Record<string, unknown>): CardListSearch => ({
    kind:
      Array.isArray(raw.kind) && raw.kind.length > 0
        ? ((raw.kind as string[]).filter((k) =>
            (VALID_KINDS as readonly string[]).includes(k),
          ) as CardListSearch["kind"])
        : undefined,
    cost: Array.isArray(raw.cost)
      ? (raw.cost as unknown[]).map(Number).filter((n) => !isNaN(n as number))
      : undefined,
    level: Array.isArray(raw.level)
      ? (raw.level as unknown[]).map(Number).filter((n) => !isNaN(n as number))
      : undefined,
    zone: Array.isArray(raw.zone)
      ? ((raw.zone as string[]).filter((z) =>
          (VALID_ZONES as readonly string[]).includes(z),
        ) as CardListSearch["zone"])
      : undefined,
    color: Array.isArray(raw.color)
      ? ((raw.color as string[]).filter((c) =>
          (VALID_COLORS as readonly string[]).includes(c),
        ) as CardListSearch["color"])
      : undefined,
    keyword: Array.isArray(raw.keyword)
      ? ((raw.keyword as string[]).filter((k) =>
          (VALID_KEYWORDS as readonly string[]).includes(k),
        ) as CardListSearch["keyword"])
      : undefined,
    trait: Array.isArray(raw.trait)
      ? ((raw.trait as string[]).filter((t) =>
          (VALID_TRAITS as readonly string[]).includes(t),
        ) as CardListSearch["trait"])
      : undefined,
    package:
      typeof raw.package === "string" && (VALID_PACKAGES as readonly string[]).includes(raw.package)
        ? (raw.package as CardListSearch["package"])
        : undefined,
    series: Array.isArray(raw.series)
      ? ((raw.series as string[]).filter((s) =>
          (VALID_SERIES as readonly string[]).includes(s),
        ) as CardListSearch["series"])
      : undefined,
    query: typeof raw.query === "string" && raw.query.trim() ? raw.query : undefined,
    sort:
      typeof raw.sort === "string" && (VALID_SORTS as readonly string[]).includes(raw.sort)
        ? (raw.sort as CardListSearch["sort"])
        : undefined,
    cardId: typeof raw.cardId === "string" && raw.cardId ? raw.cardId : undefined,
  }),
  loaderDeps: ({ search }) => ({
    kind: search.kind,
    cost: search.cost,
    level: search.level,
    zone: search.zone,
    color: search.color,
    keyword: search.keyword,
    trait: search.trait,
    package: search.package,
    series: search.series,
    query: search.query,
    sort: search.sort,
  }),
  loader: ({ deps }) =>
    loadQuery(relayEnvironment, Query, {
      filter: {
        kind: deps.kind ?? [],
        cost: deps.cost ?? null,
        level: deps.level ?? null,
        zone: deps.zone ?? null,
        color: deps.color ?? null,
        keyword: deps.keyword ?? null,
        trait: deps.trait ?? null,
        package: deps.package ?? null,
        series: deps.series ?? null,
        query: deps.query ?? null,
      },
      sort: (deps.sort as any) ?? null,
    }),
  component: CardListPage,
});

import { createFileRoute } from "@tanstack/react-router";
import { DeckDetailPage } from "src/page/DeckDetailPage";

const VALID_KINDS = ["UNIT", "PILOT", "BASE", "COMMAND"] as const;
const VALID_ZONES = ["SPACE", "EARTH"] as const;
const VALID_COLORS = ["BLUE", "GREEN", "RED", "YELLOW", "PURPLE", "WHITE"] as const;
const VALID_KEYWORDS = [
  "ACTION", "ACTIVATE_ACTION", "ACTIVATE_MAIN", "ATTACK", "BLOCKER", "BREACH",
  "BURST", "DEPLOY", "DESTROYED", "DURING_LINK", "DURING_PAIR", "FIRST_STRIKE",
  "HIGH_MANEUVER", "SUPPRESSION", "MAIN", "ONCE_PER_TURN", "END_OF_TURN",
  "PILOT", "REPAIR", "SUPPORT", "WHEN_LINKED", "WHEN_PAIRED",
] as const;
const VALID_TRAITS = [
  "ACADEMY", "OZ", "NEO_ZEON", "ZEON", "EARTH_ALLIANCE", "EARTH_FEDERATION",
  "MAGANAC_CORPS", "ZAFT", "OPERATION_METEOR", "NEWTYPE", "COORDINATOR",
  "CYBER_NEWTYPE", "STRONGHOLD", "WARSHIP", "TRIPLE_SHIP_ALLIANCE", "CIVILIAN",
  "WHITE_BASE_TEAM", "G_TEAM", "VANADIS_INSTITUTE", "ORB", "TEKKADAN", "TEIWAZ",
  "GJALLARHORN", "GUNDAM_FRAME", "ALAYA_VIJNANA", "TITANS", "VULTURE", "AEUG",
  "CLAN", "AGE_SYSTEM", "WHITE_FANG", "SIDE_6", "NEW_UNE", "UE", "VAGAN",
  "BIOLOGICAL_CPU", "ASUNO_FAMILY", "X_ROUNDER", "SUPERPOWER_BLOC", "CB",
  "INNOVADE", "GN_DRIVE", "SUPER_SOLDIER", "MAFTY", "SRA", "OLD_UNE",
  "JUPITRIS", "CYCLOPS_TEAM", "UN", "MINERVA_SQUAD",
] as const;
const VALID_PACKAGES = [
  "GD01", "GD02", "GD03", "ST01", "ST02", "ST03", "ST04", "ST05", "ST06",
  "ST07", "ST08", "ST09", "OTHER_PRODUCT_CARD", "EDITION_BETA", "BASIC_CARDS",
  "PROMOTION_CARD",
] as const;
const VALID_SORTS = [
  "NAME_ASC", "NAME_DESC", "COST_ASC", "COST_DESC", "LEVEL_ASC", "LEVEL_DESC",
  "AP_ASC", "AP_DESC", "HP_ASC", "HP_DESC",
] as const;

export type DeckDetailSearch = {
  view?: "deck";
  kind?: Array<(typeof VALID_KINDS)[number]>;
  cost?: number[];
  level?: number[];
  zone?: Array<(typeof VALID_ZONES)[number]>;
  color?: Array<(typeof VALID_COLORS)[number]>;
  keyword?: Array<(typeof VALID_KEYWORDS)[number]>;
  trait?: Array<(typeof VALID_TRAITS)[number]>;
  package?: (typeof VALID_PACKAGES)[number];
  query?: string;
  sort?: (typeof VALID_SORTS)[number];
};

function arr<T extends string>(raw: unknown, valid: readonly T[]): T[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const filtered = (raw as string[]).filter((v) => (valid as readonly string[]).includes(v)) as T[];
  return filtered.length > 0 ? filtered : undefined;
}

export const Route = createFileRoute("/deck/$deckId")({
  validateSearch: (raw: Record<string, unknown>): DeckDetailSearch => ({
    view: raw.view === "deck" ? "deck" : undefined,
    kind: arr(raw.kind, VALID_KINDS),
    cost: Array.isArray(raw.cost)
      ? (raw.cost as unknown[]).map(Number).filter((n) => !isNaN(n as number))
      : undefined,
    level: Array.isArray(raw.level)
      ? (raw.level as unknown[]).map(Number).filter((n) => !isNaN(n as number))
      : undefined,
    zone: arr(raw.zone, VALID_ZONES),
    color: arr(raw.color, VALID_COLORS),
    keyword: arr(raw.keyword, VALID_KEYWORDS),
    trait: arr(raw.trait, VALID_TRAITS),
    package:
      typeof raw.package === "string" && (VALID_PACKAGES as readonly string[]).includes(raw.package)
        ? (raw.package as DeckDetailSearch["package"])
        : undefined,
    query: typeof raw.query === "string" && raw.query.trim() ? raw.query : undefined,
    sort:
      typeof raw.sort === "string" && (VALID_SORTS as readonly string[]).includes(raw.sort)
        ? (raw.sort as DeckDetailSearch["sort"])
        : undefined,
  }),
  component: DeckDetailPage,
});

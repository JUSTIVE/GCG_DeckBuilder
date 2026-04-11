import type { RawCard, AnyRecord } from "./cards";

export const KIND_TO_TYPENAME: Record<string, string> = {
  RESOURCE: "ResourceCard",
  BASE: "BaseCard",
  UNIT: "UnitCard",
  PILOT: "PilotCard",
  COMMAND: "CommandCard",
};

export interface CardFilterInput {
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
  series?: string[];
}

export function applySort(cards: RawCard[], sort: string | undefined): RawCard[] {
  if (!sort)
    return [...cards].sort((a, b) =>
      String((a as AnyRecord).id ?? "").localeCompare(String((b as AnyRecord).id ?? "")),
    );

  const sep = sort.lastIndexOf("_");
  const rawField = sort.slice(0, sep);
  const dir = sort.slice(sep + 1);
  const key =
    rawField === "NAME" ? "name" :
    rawField === "COST" ? "cost" :
    rawField === "LEVEL" ? "level" :
    rawField === "AP" ? "AP" :
    rawField === "HP" ? "HP" : "id";
  const sign = dir === "DESC" ? -1 : 1;

  return [...cards].sort((a, b) => {
    const av = (a as AnyRecord)[key];
    const bv = (b as AnyRecord)[key];
    if (typeof av === "string" || typeof bv === "string")
      return sign * String(av ?? "").localeCompare(String(bv ?? ""), "ko");
    const an = (av as number | null | undefined) ?? 0;
    const bn = (bv as number | null | undefined) ?? 0;
    return sign * (an - bn);
  });
}

export function applyFilter(cards: RawCard[], filter: CardFilterInput): RawCard[] {
  const NON_RESOURCE_TYPENAMES = Object.entries(KIND_TO_TYPENAME)
    .filter(([k]) => k !== "RESOURCE")
    .map(([, v]) => v);
  const targetTypenames =
    filter.kind.length === 0
      ? NON_RESOURCE_TYPENAMES
      : filter.kind.map((k) => KIND_TO_TYPENAME[k]).filter((t): t is string => !!t);
  const includePilotedCommands = filter.kind.length === 0 || filter.kind.includes("PILOT");

  return cards.filter((card) => {
    const typeMatch = targetTypenames.includes(card.__typename);
    const pilotedCommandMatch =
      includePilotedCommands &&
      card.__typename === "CommandCard" &&
      (card as AnyRecord)["pilot"] != null;
    if (!typeMatch && !pilotedCommandMatch) return false;

    const c = card as AnyRecord;

    if (filter.level?.length) {
      if (typeof c["level"] !== "number" || !filter.level.includes(c["level"])) return false;
    }
    if (filter.cost?.length) {
      if (typeof c["cost"] !== "number" || !filter.cost.includes(c["cost"])) return false;
    }
    if (filter.package != null && c["package"] !== filter.package) return false;
    if (filter.rarity != null) {
      const cardRarity = typeof c["rarity"] === "string" ? c["rarity"] : "COMMON";
      if (cardRarity !== filter.rarity) return false;
    }
    if (filter.keyword?.length) {
      const cardKws = Array.isArray(c["keywords"]) ? (c["keywords"] as string[]) : [];
      if (!filter.keyword.every((kw) => cardKws.includes(kw))) return false;
    }
    if (filter.trait?.length) {
      const cardTraits = Array.isArray(c["trait"]) ? (c["trait"] as string[]) : [];
      if (!filter.trait.every((t) => cardTraits.includes(t))) return false;
    }
    if (filter.zone?.length) {
      const cardZones = Array.isArray(c["zone"]) ? (c["zone"] as string[]) : [];
      if (!filter.zone.some((z) => cardZones.includes(z))) return false;
    }
    if (filter.color?.length) {
      const cardColor = typeof c["color"] === "string" ? c["color"] : null;
      if (!cardColor || !filter.color.includes(cardColor)) return false;
    }
    if (filter.series?.length) {
      const cardSeries = typeof c["series"] === "string" ? c["series"] : null;
      if (!cardSeries || !filter.series.includes(cardSeries)) return false;
    }
    if (filter.query) {
      const q = filter.query.toLowerCase();
      const nameHit = typeof c["name"] === "string" && c["name"].toLowerCase().includes(q);
      const descHit =
        Array.isArray(c["description"]) &&
        (c["description"] as Array<{ tokens: Array<{ type: string; ko?: string }> }>)
          .some((line) =>
            line.tokens?.some((t) => t.type === "prose" && t.ko?.toLowerCase().includes(q))
          );
      if (!nameHit && !descHit) return false;
    }

    return true;
  });
}

import { defaultFieldResolver } from "graphql";
import type { GraphQLResolveInfo } from "graphql";
import { cardById, pilotByName, type AnyRecord } from "./cards";
import { type DeckCard, DECK_MAX_COPIES } from "./decks";

function descriptionToGraphQL(rawDesc: unknown): { tokens: object[] }[] {
  if (!Array.isArray(rawDesc)) return [];
  return (rawDesc as unknown[][]).map((line) => ({
    tokens: line.map((token: any) => {
      const t = token?.type;
      const __typename =
        t === "trigger" ? "TriggerToken" : t === "ability" ? "AbilityToken" : "ProseToken";
      return { __typename, ...token };
    }),
  }));
}

export function fieldResolver(
  source: AnyRecord,
  args: AnyRecord,
  context: unknown,
  info: GraphQLResolveInfo,
): unknown {
  const { fieldName, parentType } = info;
  const typeName = parentType.name;

  if (typeName === "PilotCard" && fieldName === "pilot") {
    const nameRaw = source["name"] as { en: string; ko: string } | string | undefined;
    const name =
      typeof nameRaw === "object" && nameRaw !== null
        ? nameRaw
        : { en: nameRaw ?? "", ko: nameRaw ?? "" };
    return {
      name,
      AP: (source["AP"] as number | null | undefined) ?? 0,
      HP: (source["HP"] as number | null | undefined) ?? 0,
    };
  }

  if (typeName === "CommandCard" && fieldName === "pilot") {
    const raw = source["pilot"] as { AP?: number; HP?: number } | null | undefined;
    if (raw == null) return null;
    const desc = source["description"];
    let nameKo = "";
    let nameEn = "";
    if (Array.isArray(desc)) {
      outer: for (const line of desc) {
        if (!Array.isArray(line)) break;
        for (const token of line as Array<{ type: string; ko?: string; en?: string }>) {
          if (token.type === "prose") {
            if (token.ko) {
              const m = /\[([^\]]+)\]/.exec(token.ko);
              if (m?.[1]) {
                nameKo = m[1];
              }
            }
            if (token.en) {
              const m = /\[([^\]]+)\]/.exec(token.en);
              if (m?.[1]) {
                nameEn = m[1];
              }
            }
            if (nameKo && nameEn) break outer;
          }
        }
      }
    }
    return {
      name: { en: nameEn, ko: nameKo },
      AP: (raw["AP"] as number | null | undefined) ?? 0,
      HP: (raw["HP"] as number | null | undefined) ?? 0,
    };
  }

  if (typeName === "LinkPilot" && fieldName === "pilot") {
    const pilotName = source["pilotName"] as { en: string; ko: string } | string | undefined;
    const nameObj =
      typeof pilotName === "object" && pilotName !== null
        ? pilotName
        : { en: pilotName ?? "unknown", ko: pilotName ?? "unknown" };
    const card = pilotByName.get(nameObj.ko);
    return {
      name: nameObj,
      AP: (card?.["AP"] as number | null | undefined) ?? 0,
      HP: (card?.["HP"] as number | null | undefined) ?? 0,
    };
  }

  if (typeName === "Pilot" && (fieldName === "AP" || fieldName === "HP")) {
    return (source[fieldName] as number | null | undefined) ?? 0;
  }

  if (typeName === "Resource" && fieldName === "name") {
    const raw = source["name"] as string | undefined;
    return { en: raw ?? "", ko: raw ?? "" };
  }

  if (
    (typeName === "UnitCard" || typeName === "BaseCard" || typeName === "CommandCard") &&
    fieldName === "name"
  ) {
    const raw = source["name"] as { en: string; ko: string } | string | undefined;
    return typeof raw === "object" && raw !== null ? raw : { en: raw ?? "", ko: raw ?? "" };
  }

  if (
    (typeName === "UnitCard" ||
      typeName === "PilotCard" ||
      typeName === "BaseCard" ||
      typeName === "CommandCard") &&
    fieldName === "imageUrl"
  ) {
    return `/cards/${source["id"]}.webp`;
  }

  if (typeName === "CardViewHistory" && fieldName === "imageUrl") {
    return `/cards/${source["cardId"]}.webp`;
  }

  if (
    (typeName === "UnitCard" ||
      typeName === "PilotCard" ||
      typeName === "BaseCard" ||
      typeName === "CommandCard") &&
    (fieldName === "limit" || fieldName === "blocked")
  ) {
    const limit =
      typeof source["limit"] === "number" ? (source["limit"] as number) : DECK_MAX_COPIES;
    return fieldName === "limit" ? limit : limit === 0;
  }

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

  if (
    (typeName === "UnitCard" ||
      typeName === "BaseCard" ||
      typeName === "PilotCard" ||
      typeName === "CommandCard") &&
    fieldName === "relatedTraits"
  ) {
    const raw = source["relatedTrait"];
    return Array.isArray(raw) ? raw : [];
  }

  if (typeName === "UnitCard" && fieldName === "links") {
    const raw = source["link"];
    return raw == null ? [] : [raw];
  }

  if (
    (typeName === "UnitCard" || typeName === "BaseCard") &&
    (fieldName === "AP" || fieldName === "HP")
  ) {
    return (source[fieldName] as number | null | undefined) ?? 0;
  }

  if (typeName === "Deck" && fieldName === "colors") {
    const deckCards = (source["cards"] as DeckCard[] | undefined) ?? [];
    const seen = new Set<string>();
    for (const dc of deckCards) {
      const card = cardById.get(dc.cardId) as AnyRecord | undefined;
      if (!card || card.__typename === "ResourceCard") continue;
      const color = card["color"];
      if (typeof color === "string") seen.add(color);
    }
    return Array.from(seen);
  }

  if (typeName === "Deck" && (fieldName === "topKeywords" || fieldName === "topTraits")) {
    const limit = typeof args["limit"] === "number" ? (args["limit"] as number) : 3;
    const deckCards = (source["cards"] as DeckCard[] | undefined) ?? [];
    const counts = new Map<string, number>();
    for (const dc of deckCards) {
      const card = cardById.get(dc.cardId) as AnyRecord | undefined;
      if (!card) continue;
      const rawField = fieldName === "topKeywords" ? card["keywords"] : card["trait"];
      const items = Array.isArray(rawField) ? (rawField as string[]) : [];
      for (const item of items) counts.set(item, (counts.get(item) ?? 0) + dc.count);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([kw]) => kw);
  }

  if (typeName === "DeckCard" && fieldName === "card") {
    const id = source["cardId"] as string | undefined;
    return id ? (cardById.get(id) ?? null) : null;
  }

  if (fieldName === "rarity") {
    const value = source["rarity"];
    return typeof value === "string" ? value : "COMMON";
  }

  if (
    (typeName === "UnitCard" ||
      typeName === "PilotCard" ||
      typeName === "BaseCard" ||
      typeName === "CommandCard") &&
    fieldName === "description"
  ) {
    return descriptionToGraphQL(source["description"]);
  }

  return defaultFieldResolver(source, args, context, info);
}

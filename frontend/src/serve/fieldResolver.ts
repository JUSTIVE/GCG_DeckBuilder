import { defaultFieldResolver } from "graphql";
import type { GraphQLResolveInfo } from "graphql";
import {
  allCards,
  cardById,
  pilotByName,
  makeTrait,
  makeKeyword,
  makeColor,
  makeSeries,
  type AnyRecord,
} from "./cards";
import { type DeckCard, DECK_MAX_COPIES } from "./decks";
import {
  computeDeckLinkSets,
  unitHasNoLinkedPilot,
  pilotHasNoLinkedUnit,
  splitPilotAliases,
} from "../lib/deckLinks";

// Card __typename → DeckCard variant __typename.
const DECK_CARD_VARIANT: Record<string, string> = {
  UnitCard: "UnitDeckCard",
  PilotCard: "PilotDeckCard",
  BaseCard: "BaseDeckCard",
  CommandCard: "CommandDeckCard",
  ResourceCard: "ResourceDeckCard",
};

type TaggedDeckCard = {
  __typename: string;
  card: AnyRecord;
  count: number;
  pilotLinked?: boolean;
  hasLinkingUnit?: boolean;
};

// Command cards with the PILOT keyword are "Pilot Commands" — they carry a
// pilot whose name is embedded in the description prose inside brackets like
// "[Quatre Raberba Winner]". Extract that so they count as pilots for link
// matching alongside regular PilotCard entries.
function extractCommandPilotName(card: AnyRecord): { ko: string; en: string } | null {
  const desc = card["description"];
  if (!Array.isArray(desc)) return null;
  let ko = "";
  let en = "";
  for (const line of desc as unknown[][]) {
    if (!Array.isArray(line)) continue;
    for (const token of line as Array<{ type: string; ko?: string; en?: string }>) {
      if (token.type !== "prose") continue;
      if (!ko && token.ko) {
        const m = /\[([^\]]+)\]/.exec(token.ko);
        if (m?.[1]) ko = m[1];
      }
      if (!en && token.en) {
        const m = /\[([^\]]+)\]/.exec(token.en);
        if (m?.[1]) en = m[1];
      }
      if (ko && en) return { ko, en };
    }
  }
  return ko || en ? { ko, en } : null;
}

/**
 * Raw card JSON uses `card.name` for pilot names and `card.link` (singular)
 * for unit link data. The deckLinks helpers expect the GraphQL-resolved shape
 * (`card.pilot.name.ko`, `card.links[].pilot.name.ko`). Convert here so the
 * same helpers work on both sides.
 */
function normalizeRawCardForLinks(card: AnyRecord): AnyRecord {
  if (card["__typename"] === "PilotCard") {
    return {
      __typename: "PilotCard",
      pilot: { name: card["name"] },
      traits: Array.isArray(card["trait"]) ? (card["trait"] as string[]) : [],
    };
  }
  if (card["__typename"] === "CommandCard") {
    // Pilot-command cards satisfy LinkPilot requirements like a pilot card.
    const keywords = Array.isArray(card["keywords"]) ? (card["keywords"] as string[]) : [];
    if (keywords.includes("PILOT")) {
      const pilotName = extractCommandPilotName(card);
      if (pilotName) {
        return {
          __typename: "PilotCard",
          pilot: { name: pilotName },
          traits: Array.isArray(card["trait"]) ? (card["trait"] as string[]) : [],
        };
      }
    }
    return { __typename: "CommandCard" };
  }
  if (card["__typename"] === "UnitCard") {
    const link = card["link"] as
      | {
          __typename?: string;
          pilotName?: { ko?: string; en?: string };
          trait?: string;
        }
      | undefined;
    const links: AnyRecord[] = [];
    if (link?.__typename === "LinkPilot") {
      links.push({ __typename: "LinkPilot", pilot: { name: link.pilotName } });
    } else if (link?.__typename === "LinkTrait" && link.trait) {
      links.push({ __typename: "LinkTrait", trait: link.trait });
    }
    return { __typename: "UnitCard", links };
  }
  return { __typename: card["__typename"] as string };
}

/**
 * Resolve raw deck card entries ({cardId, count}) into tagged DeckCard union
 * variants with link status computed for UnitDeckCard / PilotDeckCard.
 */
function buildTaggedDeckCards(rawCards: DeckCard[]): TaggedDeckCard[] {
  const resolved = rawCards
    .map((dc) => {
      const card = cardById.get(dc.cardId) as AnyRecord | undefined;
      if (!card) return null;
      return { card, normCard: normalizeRawCardForLinks(card), count: dc.count };
    })
    .filter((x): x is { card: AnyRecord; normCard: AnyRecord; count: number } => x != null);

  const linkSets = computeDeckLinkSets(resolved.map((r) => ({ card: r.normCard })));

  return resolved.map(({ card, normCard, count }) => {
    const variant = DECK_CARD_VARIANT[card["__typename"] as string] ?? "BaseDeckCard";
    const tagged: TaggedDeckCard = { __typename: variant, card, count };
    if (variant === "UnitDeckCard") {
      tagged.pilotLinked = !unitHasNoLinkedPilot(normCard as never, linkSets);
    } else if (variant === "PilotDeckCard") {
      tagged.hasLinkingUnit = !pilotHasNoLinkedUnit(normCard as never, linkSets);
    }
    return tagged;
  });
}

function descriptionToGraphQL(rawDesc: unknown): { tokens: object[] }[] {
  if (!Array.isArray(rawDesc)) return [];
  return (rawDesc as unknown[][]).map((line) => ({
    tokens: line.map((token: any) => {
      const t = token?.type;
      const __typename =
        t === "trigger" ? "TriggerToken" : t === "ability" ? "AbilityToken" : "ProseToken";
      if (__typename === "ProseToken") {
        const { en, ko, ...rest } = token as any;
        return { __typename, ...rest, text: { en: en ?? "", ko: ko ?? "" } };
      }
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

  if (typeName === "CardViewHistory" && fieldName === "card") {
    const id = source["cardId"] as string | undefined;
    return id ? (cardById.get(id) ?? null) : null;
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

  const isPlayableCard =
    typeName === "UnitCard" ||
    typeName === "BaseCard" ||
    typeName === "PilotCard" ||
    typeName === "CommandCard";

  if (isPlayableCard && fieldName === "color") {
    const raw = source["color"] as string | undefined;
    return raw ? makeColor(raw) : makeColor("BLUE");
  }

  if (isPlayableCard && fieldName === "traits") {
    const raw = source["trait"];
    return Array.isArray(raw) ? (raw as string[]).map(makeTrait) : [];
  }

  if (isPlayableCard && fieldName === "relatedTraits") {
    const raw = source["relatedTrait"];
    return Array.isArray(raw) ? (raw as string[]).map(makeTrait) : [];
  }

  if (isPlayableCard && fieldName === "keywords") {
    const raw = source["keywords"];
    return Array.isArray(raw) ? (raw as string[]).map(makeKeyword) : [];
  }

  if (isPlayableCard && fieldName === "series") {
    const raw = source["series"] as string | undefined;
    return raw ? makeSeries(raw) : null;
  }

  if (typeName === "Trait" && fieldName === "cards") {
    const v = source["value"] as string;
    return (allCards as AnyRecord[]).filter((c) => {
      const traits = c["trait"];
      return Array.isArray(traits) && (traits as string[]).includes(v);
    });
  }

  if (typeName === "Keyword" && fieldName === "cards") {
    const v = source["value"] as string;
    return (allCards as AnyRecord[]).filter((c) => {
      const kws = c["keywords"];
      return Array.isArray(kws) && (kws as string[]).includes(v);
    });
  }

  if (typeName === "Color" && fieldName === "cards") {
    const v = source["value"] as string;
    return (allCards as AnyRecord[]).filter(
      (c) => c["color"] === v && c["__typename"] !== "ResourceCard",
    );
  }

  if (typeName === "Series" && fieldName === "cards") {
    const v = source["value"] as string;
    return (allCards as AnyRecord[]).filter(
      (c) => c["series"] === v && c["__typename"] !== "ResourceCard",
    );
  }

  if (typeName === "UnitCard" && fieldName === "links") {
    const raw = source["link"];
    return raw == null ? [] : [raw];
  }

  if (typeName === "UnitCard" && fieldName === "linkablePilots") {
    const link = source["link"] as
      | { __typename?: string; pilotName?: { ko?: string }; trait?: string }
      | undefined;
    if (!link) return [];
    if (link.__typename === "LinkPilot") {
      const linkAliases = splitPilotAliases(link.pilotName?.ko);
      if (linkAliases.length === 0) return [];
      return (allCards as AnyRecord[]).filter((c) => {
        if (c["__typename"] !== "PilotCard") return false;
        const name = (c["name"] as { ko?: string } | undefined)?.ko;
        return splitPilotAliases(name).some((a) => linkAliases.includes(a));
      });
    }
    if (link.__typename === "LinkTrait" && link.trait) {
      const trait = link.trait;
      return (allCards as AnyRecord[]).filter((c) => {
        if (c["__typename"] !== "PilotCard") return false;
        const traits = c["trait"];
        return Array.isArray(traits) && (traits as string[]).includes(trait);
      });
    }
    return [];
  }

  if (typeName === "PilotCard" && fieldName === "linkableUnits") {
    const name = (source["name"] as { ko?: string } | undefined)?.ko;
    const pilotAliases = splitPilotAliases(name);
    const pilotTraits = Array.isArray(source["trait"]) ? (source["trait"] as string[]) : [];
    if (pilotAliases.length === 0 && pilotTraits.length === 0) return [];
    return (allCards as AnyRecord[]).filter((c) => {
      if (c["__typename"] !== "UnitCard") return false;
      const link = c["link"] as
        | { __typename?: string; pilotName?: { ko?: string }; trait?: string }
        | undefined;
      if (!link) return false;
      if (link.__typename === "LinkPilot") {
        return splitPilotAliases(link.pilotName?.ko).some((a) => pilotAliases.includes(a));
      }
      if (link.__typename === "LinkTrait" && link.trait) {
        return pilotTraits.includes(link.trait);
      }
      return false;
    });
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

  if (typeName === "Deck" && fieldName === "cards") {
    const raw = (source["cards"] as DeckCard[] | undefined) ?? [];
    return buildTaggedDeckCards(raw);
  }

  if (typeName === "Deck" && fieldName === "hasLinkWarning") {
    const raw = (source["cards"] as DeckCard[] | undefined) ?? [];
    return buildTaggedDeckCards(raw).some(
      (c) => c.pilotLinked === false || c.hasLinkingUnit === false,
    );
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

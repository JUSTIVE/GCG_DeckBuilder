import {
  deckList, createDeck, deleteDeck, renameDeck,
  addCardToDeck, removeCardFromDeck, setDeckCards,
  type DeckCard,
} from "../serve/decks";
import { computeDeckLinkSets, unitHasNoLinkedPilot, pilotHasNoLinkedUnit } from "../lib/deckLinks";
import type { Context } from "../context";

type AnyObj = Record<string, unknown>;

const DECK_CARD_VARIANT: Record<string, string> = {
  UnitCard: "UnitDeckCard", PilotCard: "PilotDeckCard", BaseCard: "BaseDeckCard",
  CommandCard: "CommandDeckCard", ResourceCard: "ResourceDeckCard",
};

function normalizeRawCardForLinks(card: AnyObj): AnyObj {
  if (card["__typename"] === "PilotCard") {
    return {
      __typename: "PilotCard",
      pilot: { name: card["name"] },
      traits: Array.isArray(card["trait"]) ? (card["trait"] as string[]) : [],
    };
  }
  if (card["__typename"] === "UnitCard") {
    const link = card["link"] as AnyObj | undefined;
    const links: AnyObj[] = [];
    if (link?.__typename === "LinkPilot") {
      links.push({ __typename: "LinkPilot", pilot: { name: link["pilotName"] } });
    } else if (link?.__typename === "LinkTrait" && link["trait"]) {
      links.push({ __typename: "LinkTrait", trait: link["trait"] });
    }
    return { __typename: "UnitCard", links };
  }
  return { __typename: card["__typename"] as string };
}

async function buildTaggedDeckCards(rawCards: DeckCard[], ctx: Context) {
  const rows = await ctx.loaders.cardById.loadMany(rawCards.map((dc) => dc.cardId));

  const resolved = rawCards
    .map((dc, i) => {
      const row = rows[i];
      if (!row || row instanceof Error) return null;
      const card = row.raw as AnyObj;
      return { card, normCard: normalizeRawCardForLinks(card), count: dc.count };
    })
    .filter((x): x is { card: AnyObj; normCard: AnyObj; count: number } => x != null);

  const linkSets = computeDeckLinkSets(resolved.map((r) => ({ card: r.normCard })));

  return resolved.map(({ card, normCard, count }) => {
    const variant = DECK_CARD_VARIANT[card["__typename"] as string] ?? "BaseDeckCard";
    const tagged: AnyObj = { __typename: variant, card, count };
    if (variant === "UnitDeckCard") tagged.pilotLinked = !unitHasNoLinkedPilot(normCard as never, linkSets);
    else if (variant === "PilotDeckCard") tagged.hasLinkingUnit = !pilotHasNoLinkedUnit(normCard as never, linkSets);
    return tagged;
  });
}

async function topFieldDB(obj: AnyObj, field: string, limit: number, ctx: Context): Promise<string[]> {
  const deckCards = (obj.cards as DeckCard[]) ?? [];
  const rows = await ctx.loaders.cardById.loadMany(deckCards.map((dc) => dc.cardId));
  const counts = new Map<string, number>();
  for (let i = 0; i < deckCards.length; i++) {
    const row = rows[i];
    if (!row || row instanceof Error) continue;
    const card = row.raw as AnyObj;
    const items = Array.isArray(card[field]) ? (card[field] as string[]) : [];
    for (const item of items) counts.set(item, (counts.get(item) ?? 0) + deckCards[i].count);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([k]) => k);
}

export const deckResolvers = {
  Query: {
    deckList() { return deckList() as never; },
  },

  Mutation: {
    createDeck(_: unknown, { name }: { name: string })                                                  { return createDeck({ name }) as never; },
    deleteDeck(_: unknown, { id }: { id: string })                                                      { return deleteDeck({ id }) as never; },
    renameDeck(_: unknown, { id, name }: { id: string; name: string })                                  { return renameDeck({ id, name }) as never; },
    addCardToDeck(_: unknown, { deckId, cardId }: { deckId: string; cardId: string })                   { return addCardToDeck({ deckId, cardId }) as never; },
    removeCardFromDeck(_: unknown, { deckId, cardId }: { deckId: string; cardId: string })              { return removeCardFromDeck({ deckId, cardId }) as never; },
    setDeckCards(_: unknown, { deckId, cards }: { deckId: string; cards: { cardId: string; count: number }[] }) { return setDeckCards({ deckId, cards }) as never; },
  },

  DeckCard:            { __resolveType: (obj: AnyObj) => obj.__typename as string },
  AddCardToDeckResult: { __resolveType: (obj: AnyObj) => obj.__typename as string },

  Deck: {
    async colors(obj: AnyObj, _: unknown, ctx: Context) {
      const deckCards = (obj.cards as DeckCard[]) ?? [];
      const rows = await ctx.loaders.cardById.loadMany(deckCards.map((dc) => dc.cardId));
      const seen = new Set<string>();
      for (const row of rows) {
        if (!row || row instanceof Error) continue;
        const card = row.raw as AnyObj;
        if (card.__typename === "ResourceCard") continue;
        if (typeof card["color"] === "string") seen.add(card["color"] as string);
      }
      return Array.from(seen) as never;
    },
    async topKeywords(obj: AnyObj, { limit }: { limit?: number }, ctx: Context) {
      return topFieldDB(obj, "keywords", limit ?? 3, ctx) as never;
    },
    async topTraits(obj: AnyObj, { limit }: { limit?: number }, ctx: Context) {
      return topFieldDB(obj, "trait", limit ?? 3, ctx) as never;
    },
    async cards(obj: AnyObj, _: unknown, ctx: Context) {
      return buildTaggedDeckCards((obj.cards as DeckCard[]) ?? [], ctx) as never;
    },
    async hasLinkWarning(obj: AnyObj, _: unknown, ctx: Context) {
      const tagged = await buildTaggedDeckCards((obj.cards as DeckCard[]) ?? [], ctx);
      return tagged.some((c) => c.pilotLinked === false || c.hasLinkingUnit === false);
    },
  },
};

import { cardById, type AnyRecord } from "./cards";

export const DECK_KEY = "gcg_decks";
export const DECK_MAX_CARDS = 50;
export const DECK_MAX_COLORS = 2;
export const DECK_MAX_COPIES = 4;
export const DECK_LIST_ID = "DeckList:singleton";

export interface DeckCard {
  cardId: string;
  count: number;
}

export interface Deck {
  __typename: "Deck";
  id: string;
  name: string;
  cards: DeckCard[];
  createdAt: string;
}

export interface DeckListShape {
  __typename: "DeckList";
  id: string;
  decks: Deck[];
}

export function readDecks(): Deck[] {
  try {
    const raw = localStorage.getItem(DECK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Deck[]) : [];
  } catch {
    return [];
  }
}

export function writeDecks(decks: Deck[]): void {
  localStorage.setItem(DECK_KEY, JSON.stringify(decks));
}

export function makeDeckList(decks: Deck[]): DeckListShape {
  return { __typename: "DeckList", id: DECK_LIST_ID, decks };
}

export function deckCardCount(deck: Deck): number {
  return deck.cards.reduce((sum, dc) => {
    const card = cardById.get(dc.cardId) as AnyRecord | undefined;
    if (card?.__typename === "ResourceCard") return sum;
    return sum + dc.count;
  }, 0);
}

export function deckColors(deck: Deck): Set<string> {
  const colors = new Set<string>();
  for (const dc of deck.cards) {
    const card = cardById.get(dc.cardId) as AnyRecord | undefined;
    if (!card || card.__typename === "ResourceCard") continue;
    if (typeof card["color"] === "string") colors.add(card["color"] as string);
  }
  return colors;
}

export function deckList(): DeckListShape {
  return makeDeckList(readDecks());
}

export function createDeck({ name }: { name: string }): DeckListShape {
  const decks = readDecks();
  const createdAt = new Date().toISOString();
  const deck: Deck = {
    __typename: "Deck",
    id: `@${btoa(`Deck:${createdAt}`)}`,
    name,
    cards: [],
    createdAt,
  };
  writeDecks([...decks, deck]);
  return makeDeckList([...decks, deck]);
}

export function deleteDeck({ id }: { id: string }): DeckListShape {
  const updated = readDecks().filter((d) => d.id !== id);
  writeDecks(updated);
  return makeDeckList(updated);
}

export function renameDeck({ id, name }: { id: string; name: string }): Deck {
  const decks = readDecks();
  const idx = decks.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error(`Deck not found: ${id}`);
  const updated = { ...decks[idx], name };
  decks[idx] = updated;
  writeDecks(decks);
  return updated;
}

export function addCardToDeck({ deckId, cardId }: { deckId: string; cardId: string }): AnyRecord {
  const decks = readDecks();
  const idx = decks.findIndex((d) => d.id === deckId);
  if (idx === -1) return { __typename: "DeckNotFoundError", deckId };

  const deck = { ...decks[idx], cards: [...decks[idx].cards] };
  const card = cardById.get(cardId) as AnyRecord | undefined;
  const isResource = card?.__typename === "ResourceCard";

  const cardLimit =
    typeof card?.["limit"] === "number" ? (card["limit"] as number) : DECK_MAX_COPIES;
  if (cardLimit === 0) return { __typename: "CardBannedError", cardId };

  const existing = deck.cards.find((dc) => dc.cardId === cardId);
  const currentCount = existing?.count ?? 0;
  if (currentCount >= cardLimit) {
    return {
      __typename: "CardCopyLimitExceededError",
      cardId,
      limit: cardLimit,
      current: currentCount,
    };
  }

  if (!isResource) {
    const current = deckCardCount(deck);
    if (current >= DECK_MAX_CARDS) {
      return { __typename: "DeckFullError", current, max: DECK_MAX_CARDS };
    }
    if (card && typeof card["color"] === "string") {
      const colors = deckColors(deck);
      if (!colors.has(card["color"] as string) && colors.size >= DECK_MAX_COLORS) {
        return {
          __typename: "DeckColorLimitExceededError",
          currentColors: [...colors],
          max: DECK_MAX_COLORS,
        };
      }
    }
  }

  if (existing) {
    deck.cards = deck.cards.map((dc) =>
      dc.cardId === cardId ? { ...dc, count: dc.count + 1 } : dc,
    );
  } else {
    deck.cards = [...deck.cards, { cardId, count: 1 }];
  }

  decks[idx] = deck;
  writeDecks(decks);
  return { __typename: "AddCardToDeckSuccess", deck };
}

export function removeCardFromDeck({ deckId, cardId }: { deckId: string; cardId: string }): Deck {
  const decks = readDecks();
  const idx = decks.findIndex((d) => d.id === deckId);
  if (idx === -1) throw new Error(`Deck not found: ${deckId}`);

  const deck = { ...decks[idx] };
  const existing = deck.cards.find((dc) => dc.cardId === cardId);
  if (!existing) return deck;

  deck.cards =
    existing.count <= 1
      ? deck.cards.filter((dc) => dc.cardId !== cardId)
      : deck.cards.map((dc) => (dc.cardId === cardId ? { ...dc, count: dc.count - 1 } : dc));

  decks[idx] = deck;
  writeDecks(decks);
  return deck;
}

export function setDeckCards({
  deckId,
  cards,
}: {
  deckId: string;
  cards: { cardId: string; count: number }[];
}): Deck {
  const decks = readDecks();
  const idx = decks.findIndex((d) => d.id === deckId);
  if (idx === -1) throw new Error(`Deck not found: ${deckId}`);
  const updated = { ...decks[idx], cards: cards.filter((c) => c.count > 0) };
  decks[idx] = updated;
  writeDecks(decks);
  return updated;
}

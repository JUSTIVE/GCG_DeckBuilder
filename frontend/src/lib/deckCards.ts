/**
 * Flatten a DeckCard union (from Relay-generated types) into a legacy-shape
 * `{ count, card }[]` for consumers that don't need per-variant type-safety.
 *
 * The union has shape:
 *   | { __typename: "UnitDeckCard"; count; card; pilotLinked; ... }
 *   | { __typename: "PilotDeckCard"; count; card; hasLinkingUnit; ... }
 *   | { __typename: "BaseDeckCard"; count; card }
 *   | { __typename: "CommandDeckCard"; count; card }
 *   | { __typename: "ResourceDeckCard"; count; card? }
 *   | { __typename: "%other" }   // relay forward-compat
 *
 * This helper drops `%other` entries and exposes the shared `{count, card}`.
 */
export type FlatDeckCard = {
  count: number;
  card: any;
  // Present only on UnitDeckCard variants — true iff the unit's pilot link
  // requirement is either absent or satisfied by a pilot card in the deck.
  pilotLinked?: boolean;
  // Present only on PilotDeckCard variants — true iff some unit in the deck
  // links to this pilot.
  hasLinkingUnit?: boolean;
};

// DeckCard variant __typename → inner card __typename.
// The inner `card` field isn't selected with __typename by most queries, so we
// inject it here so client code that groups/filters by `card.__typename` keeps
// working against the union-shaped data.
const DECK_CARD_TO_CARD: Record<string, string> = {
  UnitDeckCard: "UnitCard",
  PilotDeckCard: "PilotCard",
  BaseDeckCard: "BaseCard",
  CommandDeckCard: "CommandCard",
  ResourceDeckCard: "Resource",
};

export function flattenDeckCards(
  cards: readonly { readonly __typename: string }[] | null | undefined,
): FlatDeckCard[] {
  if (!cards) return [];
  return cards
    .filter((c) => c.__typename !== "%other")
    .map((c) => {
      const raw = c as unknown as {
        __typename: string;
        count?: number;
        card?: Record<string, unknown>;
        pilotLinked?: boolean;
        hasLinkingUnit?: boolean;
      };
      const innerTypename = DECK_CARD_TO_CARD[raw.__typename];
      const card = raw.card ? { __typename: innerTypename, ...raw.card } : null;
      return {
        count: typeof raw.count === "number" ? raw.count : 0,
        card,
        pilotLinked: raw.pilotLinked,
        hasLinkingUnit: raw.hasLinkingUnit,
      };
    });
}

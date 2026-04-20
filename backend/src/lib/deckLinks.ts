// Normalize a pilot name for link matching:
// 1. Split on "/" and "&" — "/" handles dual-personality pilots
//    (e.g. "알레루야 햅티즘 / 할레루야 햅티즘"), "&" handles composite/team
//    pilot cards (e.g. "가로드 란 & 티파 아딜") so any constituent can match.
// 2. Strip parenthetical disambiguators (e.g. "록온 스트라토스 (닐)" → "록온 스트라토스"),
//    so a pilot card variant still matches a link that names the base pilot.
export function splitPilotAliases(name: string | undefined | null): string[] {
  return (name ?? "")
    .split(/[/&]/)
    .map((s) => s.replace(/\([^)]*\)/g, "").trim())
    .filter(Boolean);
}

type AnyLink = {
  __typename?: string;
  pilot?: { name?: { ko?: string } };
  trait?: string;
};

type AnyCard = {
  __typename?: string;
  pilot?: { name?: { ko?: string } };
  traits?: readonly string[];
  links?: readonly AnyLink[];
};

export type DeckLinkSets = {
  pilotNamesInDeck: Set<string>;
  pilotTraitsInDeck: Set<string>;
  linkablePilotNames: Set<string>;
  linkableTraits: Set<string>;
};

export function computeDeckLinkSets(
  cards: readonly { card: AnyCard | null | undefined }[],
): DeckLinkSets {
  const pilotNamesInDeck = new Set<string>();
  const pilotTraitsInDeck = new Set<string>();
  const linkablePilotNames = new Set<string>();
  const linkableTraits = new Set<string>();
  for (const { card } of cards) {
    if (card?.__typename === "PilotCard") {
      for (const alias of splitPilotAliases(card.pilot?.name?.ko)) {
        pilotNamesInDeck.add(alias);
      }
      for (const trait of card.traits ?? []) {
        pilotTraitsInDeck.add(trait);
      }
    } else if (card?.__typename === "UnitCard") {
      for (const link of card.links ?? []) {
        if (link?.__typename === "LinkPilot") {
          for (const alias of splitPilotAliases(link.pilot?.name?.ko)) {
            linkablePilotNames.add(alias);
          }
        } else if (link?.__typename === "LinkTrait" && link.trait) {
          linkableTraits.add(link.trait);
        }
      }
    }
  }
  return { pilotNamesInDeck, pilotTraitsInDeck, linkablePilotNames, linkableTraits };
}

export function unitHasNoLinkedPilot(card: AnyCard, sets: DeckLinkSets): boolean {
  if (card?.__typename !== "UnitCard") return false;
  const links = card.links ?? [];
  if (links.length === 0) return false;
  // Satisfied iff ANY of the unit's links is met by the current deck.
  return !links.some((l) => {
    if (l?.__typename === "LinkPilot") {
      return splitPilotAliases(l.pilot?.name?.ko).some((a) => sets.pilotNamesInDeck.has(a));
    }
    if (l?.__typename === "LinkTrait" && l.trait) {
      return sets.pilotTraitsInDeck.has(l.trait);
    }
    return false;
  });
}

export function pilotHasNoLinkedUnit(card: AnyCard, sets: DeckLinkSets): boolean {
  if (card?.__typename !== "PilotCard") return false;
  const aliases = splitPilotAliases(card.pilot?.name?.ko);
  const traits = card.traits ?? [];
  if (aliases.length === 0 && traits.length === 0) return false;
  // A pilot is linked if some unit references either its name or its trait.
  const byName = aliases.some((a) => sets.linkablePilotNames.has(a));
  const byTrait = traits.some((t) => sets.linkableTraits.has(t));
  return !(byName || byTrait);
}

// Normalize a pilot name for link matching:
// 1. Split on "/" to handle dual-personality pilots (e.g. "알레루야 햅티즘 / 할레루야 햅티즘").
// 2. Strip parenthetical disambiguators (e.g. "록온 스트라토스 (닐)" → "록온 스트라토스"),
//    so a pilot card variant still matches a link that names the base pilot.
export function splitPilotAliases(name: string | undefined | null): string[] {
  return (name ?? "")
    .split("/")
    .map((s) => s.replace(/\([^)]*\)/g, "").trim())
    .filter(Boolean);
}

type AnyCard = { __typename?: string; pilot?: { name?: { ko?: string } }; links?: unknown[] };

export type DeckLinkSets = {
  pilotNamesInDeck: Set<string>;
  linkablePilotNames: Set<string>;
};

export function computeDeckLinkSets(
  cards: readonly { card: AnyCard | null | undefined }[],
): DeckLinkSets {
  const pilotNamesInDeck = new Set<string>();
  const linkablePilotNames = new Set<string>();
  for (const { card } of cards) {
    if (card?.__typename === "PilotCard") {
      for (const alias of splitPilotAliases(card.pilot?.name?.ko)) {
        pilotNamesInDeck.add(alias);
      }
    } else if (card?.__typename === "UnitCard") {
      for (const link of (card.links ?? []) as {
        __typename?: string;
        pilot?: { name?: { ko?: string } };
      }[]) {
        if (link?.__typename === "LinkPilot") {
          for (const alias of splitPilotAliases(link.pilot?.name?.ko)) {
            linkablePilotNames.add(alias);
          }
        }
      }
    }
  }
  return { pilotNamesInDeck, linkablePilotNames };
}

export function unitHasNoLinkedPilot(card: AnyCard, pilotNamesInDeck: Set<string>): boolean {
  if (card?.__typename !== "UnitCard") return false;
  const links = (card.links ?? []) as { __typename?: string; pilot?: { name?: { ko?: string } } }[];
  const pilotLinks = links.filter((l) => l?.__typename === "LinkPilot");
  if (pilotLinks.length === 0) return false;
  return !pilotLinks.some((l) =>
    splitPilotAliases(l.pilot?.name?.ko).some((a) => pilotNamesInDeck.has(a)),
  );
}

export function pilotHasNoLinkedUnit(card: AnyCard, linkablePilotNames: Set<string>): boolean {
  if (card?.__typename !== "PilotCard") return false;
  const aliases = splitPilotAliases(card.pilot?.name?.ko);
  if (aliases.length === 0) return false;
  return !aliases.some((a) => linkablePilotNames.has(a));
}

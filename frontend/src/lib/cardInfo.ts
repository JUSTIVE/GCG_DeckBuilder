import { localize } from "./localize";

export type CardInfo = {
  id: string;
  name: string;
  cost: number | null;
  level: number | null;
  color: string;
  typename: string;
  imageUrl: string | null;
};

export function extractCardInfo(card: any, lang = "ko"): CardInfo | null {
  if (!card) return null;
  const { __typename, id, cost, level, color, imageUrl } = card;
  const rawName = card.name ?? card.pilot?.name;
  if (!id || !rawName || !color) return null;
  const name =
    typeof rawName === "object" && rawName !== null ? localize(rawName, lang) : (rawName as string);
  return {
    id,
    name,
    cost: cost ?? null,
    level: level ?? null,
    typename: __typename,
    color,
    imageUrl: imageUrl ?? null,
  };
}

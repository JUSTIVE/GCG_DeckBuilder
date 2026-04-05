export type CardInfo = {
  id: string;
  name: string;
  cost: number | null;
  level: number | null;
  color: string;
  typename: string;
  imageUrl: string | null;
};

export function extractCardInfo(card: any): CardInfo | null {
  if (!card) return null;
  const { __typename, id, cost, level, color, imageUrl } = card;
  const name = card.name ?? card.pilot?.name;
  if (!id || !name || !color) return null;
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

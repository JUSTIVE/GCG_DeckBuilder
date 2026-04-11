type DeckCodePayload = { v: 1; cards: { id: string; n: number }[] };

export function encodeDeckCode(cards: readonly { count: number; card: any }[]): string {
  const payload: DeckCodePayload = {
    v: 1,
    cards: cards
      .map((dc) => ({ id: (dc.card as any)?.id as string | undefined, n: dc.count }))
      .filter((c): c is { id: string; n: number } => !!c.id),
  };
  return btoa(JSON.stringify(payload));
}

export function decodeDeckCode(code: string): { cardId: string; count: number }[] | null {
  try {
    const payload = JSON.parse(atob(code.trim())) as DeckCodePayload;
    if (payload.v !== 1 || !Array.isArray(payload.cards)) return null;
    return payload.cards.map((c) => ({ cardId: c.id, count: c.n }));
  } catch {
    return null;
  }
}

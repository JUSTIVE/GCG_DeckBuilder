import allCardsRaw from "../../../data/3.processed.json";

export type RawCard = (typeof allCardsRaw)[number];
export type AnyRecord = Record<string, unknown>;

export const allCards = allCardsRaw as RawCard[];

export const cardById = new Map<string, RawCard>(
  allCards
    .filter((c): c is Extract<RawCard, { id: string }> => "id" in c && !!c.id)
    .map((c) => [c.id, c]),
);

export const pilotByName = new Map<string, AnyRecord>(
  allCards
    .filter((c) => c.__typename === "PilotCard" && "name" in c)
    .map((c) => {
      const name = (c as AnyRecord)["name"];
      const key =
        typeof name === "object" && name !== null ? (name as { ko: string }).ko : (name as string);
      return [key, c as AnyRecord];
    }),
);

export const traitId   = (v: string) => Buffer.from(`Trait:${v}`).toString("base64");
export const keywordId = (v: string) => Buffer.from(`Keyword:${v}`).toString("base64");
export const colorId   = (v: string) => Buffer.from(`Color:${v}`).toString("base64");
export const seriesId  = (v: string) => Buffer.from(`Series:${v}`).toString("base64");

export const makeTrait   = (v: string) => ({ __typename: "Trait",   id: traitId(v),   value: v });
export const makeKeyword = (v: string) => ({ __typename: "Keyword", id: keywordId(v), value: v });
export const makeColor   = (v: string) => ({ __typename: "Color",   id: colorId(v),   value: v });
export const makeSeries  = (v: string) => ({ __typename: "Series",  id: seriesId(v),  value: v });

export const encodeCursor = (index: number): string =>
  Buffer.from(`cursor:${index}`).toString("base64");

export function decodeCursor(cursor: string): number {
  try {
    const match = Buffer.from(cursor, "base64").toString("utf8").match(/^cursor:(\d+)$/);
    if (match?.[1]) return parseInt(match[1], 10);
  } catch {
    /* ignore */
  }
  return -1;
}

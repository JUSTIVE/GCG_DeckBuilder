import DataLoader from "dataloader";
import type { Selectable } from "kysely";
import { db } from "./db";
import type { CardsTable } from "../db/types";

function makeLoaders() {
  return {
    cardById: new DataLoader<string, Selectable<CardsTable> | null>(async (ids) => {
      const rows = await db
        .selectFrom("cards")
        .selectAll()
        .where("id", "in", ids as string[])
        .execute();
      const map = new Map(rows.map((r) => [r.id, r]));
      return ids.map((id) => map.get(id) ?? null);
    }),
  };
}

export function createContext() {
  return { db, loaders: makeLoaders() };
}

export type Context = ReturnType<typeof createContext>;

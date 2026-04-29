import type { ColumnType, Generated } from "kysely";

export interface CardsTable {
  id: string;
  typename: string;
  name_en: string;
  name_ko: string;
  color: string | null;
  level: number | null;
  cost: number | null;
  ap: number | null;
  hp: number | null;
  rarity: string;
  package: string;
  series: string | null;
  traits: string[];
  keywords: string[];
  zone: string[];
  image_file: string | null;
  raw: unknown;
  created_at: ColumnType<Date, never, never>;
}

export interface DB {
  cards: CardsTable;
}

import { CardListPage } from "@/page/CardListPage";
import { createFileRoute } from "@tanstack/react-router";

const VALID_KINDS = ["UNIT", "PILOT", "BASE", "COMMAND", "RESOURCE"] as const;
const VALID_ZONES = ["SPACE", "EARTH"] as const;
const VALID_PACKAGES = [
  "GD01", "GD02", "GD03",
  "ST01", "ST02", "ST03", "ST04", "ST05", "ST06", "ST07", "ST08", "ST09",
  "OTHER_PRODUCT_CARD", "EDITION_BETA", "BASIC_CARDS", "PROMOTION_CARD",
] as const;

export type CardListSearch = {
  kind?: Array<(typeof VALID_KINDS)[number]>;
  cost?: number[];
  level?: number[];
  zone?: Array<(typeof VALID_ZONES)[number]>;
  package?: (typeof VALID_PACKAGES)[number];
  query?: string;
  cardId?: string;
};

export const Route = createFileRoute("/cardlist")({
  validateSearch: (raw: Record<string, unknown>): CardListSearch => ({
    kind:
      Array.isArray(raw.kind) && raw.kind.length > 0
        ? (raw.kind as string[]).filter((k) =>
            (VALID_KINDS as readonly string[]).includes(k),
          ) as CardListSearch["kind"]
        : undefined,
    cost: Array.isArray(raw.cost)
      ? (raw.cost as unknown[]).map(Number).filter((n) => !isNaN(n as number))
      : undefined,
    level: Array.isArray(raw.level)
      ? (raw.level as unknown[]).map(Number).filter((n) => !isNaN(n as number))
      : undefined,
    zone: Array.isArray(raw.zone)
      ? (raw.zone as string[]).filter((z) =>
          (VALID_ZONES as readonly string[]).includes(z),
        ) as CardListSearch["zone"]
      : undefined,
    package:
      typeof raw.package === "string" &&
      (VALID_PACKAGES as readonly string[]).includes(raw.package)
        ? (raw.package as CardListSearch["package"])
        : undefined,
    query:
      typeof raw.query === "string" && raw.query.trim()
        ? raw.query
        : undefined,
    cardId:
      typeof raw.cardId === "string" && raw.cardId ? raw.cardId : undefined,
  }),
  component: CardListPage,
});

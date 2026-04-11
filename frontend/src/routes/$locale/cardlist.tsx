import { CardListPage, Query } from "@/page/CardListPage";
import { createFileRoute } from "@tanstack/react-router";
import { loadQuery } from "react-relay";
import { relayEnvironment } from "@/relay-environment";
import {
  ALL_KEYWORDS,
  ALL_KINDS,
  ALL_ZONES,
  ALL_COLORS,
  ALL_TRAITS,
  ALL_PACKAGES,
  ALL_SERIES,
  ALL_SORTS,
  type CardKeyword,
  type CardTrait,
  type CardSeries,
} from "@/lib/gameConstants";

// Re-export types for components that import from this route file
export type { CardKeyword, CardTrait, CardSeries } from "@/lib/gameConstants";

export type CardListSearch = {
  kind?: Array<(typeof ALL_KINDS)[number]>;
  cost?: number[];
  level?: number[];
  zone?: Array<(typeof ALL_ZONES)[number]>;
  color?: Array<(typeof ALL_COLORS)[number]>;
  keyword?: CardKeyword[];
  trait?: CardTrait[];
  package?: (typeof ALL_PACKAGES)[number];
  series?: CardSeries[];
  query?: string;
  sort?: (typeof ALL_SORTS)[number];
  cardId?: string;
};

export const Route = createFileRoute("/$locale/cardlist")({
  validateSearch: (raw: Record<string, unknown>): CardListSearch => ({
    kind:
      Array.isArray(raw.kind) && raw.kind.length > 0
        ? ((raw.kind as string[]).filter((k) =>
            (ALL_KINDS as readonly string[]).includes(k),
          ) as CardListSearch["kind"])
        : undefined,
    cost: Array.isArray(raw.cost)
      ? (raw.cost as unknown[]).map(Number).filter((n) => !isNaN(n as number))
      : undefined,
    level: Array.isArray(raw.level)
      ? (raw.level as unknown[]).map(Number).filter((n) => !isNaN(n as number))
      : undefined,
    zone: Array.isArray(raw.zone)
      ? ((raw.zone as string[]).filter((z) =>
          (ALL_ZONES as readonly string[]).includes(z),
        ) as CardListSearch["zone"])
      : undefined,
    color: Array.isArray(raw.color)
      ? ((raw.color as string[]).filter((c) =>
          (ALL_COLORS as readonly string[]).includes(c),
        ) as CardListSearch["color"])
      : undefined,
    keyword: Array.isArray(raw.keyword)
      ? ((raw.keyword as string[]).filter((k) =>
          (ALL_KEYWORDS as readonly string[]).includes(k),
        ) as CardListSearch["keyword"])
      : undefined,
    trait: Array.isArray(raw.trait)
      ? ((raw.trait as string[]).filter((t) =>
          (ALL_TRAITS as readonly string[]).includes(t),
        ) as CardListSearch["trait"])
      : undefined,
    package:
      typeof raw.package === "string" && (ALL_PACKAGES as readonly string[]).includes(raw.package)
        ? (raw.package as CardListSearch["package"])
        : undefined,
    series: Array.isArray(raw.series)
      ? ((raw.series as string[]).filter((s) =>
          (ALL_SERIES as readonly string[]).includes(s),
        ) as CardListSearch["series"])
      : undefined,
    query: typeof raw.query === "string" && raw.query.trim() ? raw.query : undefined,
    sort:
      typeof raw.sort === "string" && (ALL_SORTS as readonly string[]).includes(raw.sort)
        ? (raw.sort as CardListSearch["sort"])
        : undefined,
    cardId: typeof raw.cardId === "string" && raw.cardId ? raw.cardId : undefined,
  }),
  loaderDeps: ({ search }) => ({
    kind: search.kind,
    cost: search.cost,
    level: search.level,
    zone: search.zone,
    color: search.color,
    keyword: search.keyword,
    trait: search.trait,
    package: search.package,
    series: search.series,
    query: search.query,
    sort: search.sort,
  }),
  loader: ({ deps }) =>
    loadQuery(relayEnvironment, Query, {
      filter: {
        kind: deps.kind ?? [],
        cost: deps.cost ?? null,
        level: deps.level ?? null,
        zone: deps.zone ?? null,
        color: deps.color ?? null,
        keyword: deps.keyword ?? null,
        trait: deps.trait ?? null,
        package: deps.package ?? null,
        series: deps.series ?? null,
        query: deps.query ?? null,
      },
      sort: (deps.sort as any) ?? null,
    }),
  component: CardListPage,
});

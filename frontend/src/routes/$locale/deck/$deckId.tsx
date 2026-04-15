import { createFileRoute } from "@tanstack/react-router";
import { loadQuery } from "react-relay";
import { relayEnvironment } from "@/relay-environment";
import { DeckDetailPage, Query } from "src/page/DeckDetailPage";
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

export type DeckDetailSearch = {
  view?: "deck";
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
};

function arr<T extends string>(raw: unknown, valid: readonly T[]): T[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const filtered = (raw as string[]).filter((v) => (valid as readonly string[]).includes(v)) as T[];
  return filtered.length > 0 ? filtered : undefined;
}

export const Route = createFileRoute("/$locale/deck/$deckId")({
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
  loader: ({ params, deps }) =>
    loadQuery(relayEnvironment, Query, {
      deckId: params.deckId,
      filter: {
        kind: (deps.kind as any) ?? ["UNIT", "PILOT", "BASE", "COMMAND"],
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
  validateSearch: (raw: Record<string, unknown>): DeckDetailSearch => ({
    view: raw.view === "deck" ? "deck" : undefined,
    kind: arr(raw.kind, ALL_KINDS),
    cost: Array.isArray(raw.cost)
      ? (raw.cost as unknown[]).map(Number).filter((n) => !isNaN(n as number))
      : undefined,
    level: Array.isArray(raw.level)
      ? (raw.level as unknown[]).map(Number).filter((n) => !isNaN(n as number))
      : undefined,
    zone: arr(raw.zone, ALL_ZONES),
    color: arr(raw.color, ALL_COLORS),
    keyword: arr(raw.keyword, ALL_KEYWORDS),
    trait: arr(raw.trait, ALL_TRAITS),
    package:
      typeof raw.package === "string" && (ALL_PACKAGES as readonly string[]).includes(raw.package)
        ? (raw.package as DeckDetailSearch["package"])
        : undefined,
    series: arr(raw.series, ALL_SERIES),
    query: typeof raw.query === "string" && raw.query.trim() ? raw.query : undefined,
    sort:
      typeof raw.sort === "string" && (ALL_SORTS as readonly string[]).includes(raw.sort)
        ? (raw.sort as DeckDetailSearch["sort"])
        : undefined,
  }),
  component: DeckDetailPage,
});

import { useTransition, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { graphql, useRefetchableFragment, useFragment } from "react-relay";
import { serveGraphQL } from "@/serve";
import { cn } from "@/lib/utils";
import { COLOR_BG, COLOR_HEX } from "src/render/color";
import { renderTrait } from "@/render/trait";
import { renderPackage } from "@/render/package";
import { renderZone } from "@/render/zone";
import { renderKeyword } from "@/render/keyword";
import { ClockIcon, EyeIcon, SearchIcon, Trash2Icon, XIcon } from "lucide-react";
import { localize } from "@/lib/localize";
import type { SearchHistoryPanel_query$key } from "@/__generated__/SearchHistoryPanel_query.graphql";
import type { SearchHistoryPanel_list$key } from "@/__generated__/SearchHistoryPanel_list.graphql";
import type { SearchHistoryPanel_filterSearch$key } from "@/__generated__/SearchHistoryPanel_filterSearch.graphql";
import type { SearchHistoryPanel_cardView$key } from "@/__generated__/SearchHistoryPanel_cardView.graphql";
import type { CardFilterInput } from "@/__generated__/CardListFragmentRefetchQuery.graphql";
import type { CardSort } from "@/__generated__/CardListPageQuery.graphql";

// ─── Fragments ────────────────────────────────────────────────────────────────

export const SearchHistoryListFragment = graphql`
  fragment SearchHistoryPanel_list on SearchHistoryList {
    items {
      __typename
      ... on FilterSearchHistory {
        id
        ...SearchHistoryPanel_filterSearch
      }
      ... on CardViewHistory {
        id
        ...SearchHistoryPanel_cardView
      }
    }
  }
`;

export const SearchHistoryPanelFragment = graphql`
  fragment SearchHistoryPanel_query on Query
  @refetchable(queryName: "SearchHistoryPanelRefetchQuery") {
    searchHistory {
      ...SearchHistoryPanel_list
    }
  }
`;

const FilterSearchFragment = graphql`
  fragment SearchHistoryPanel_filterSearch on FilterSearchHistory {
    id
    filter {
      kind
      sort
      color
      trait
      query
      cost
      level
      package
      zone
      keyword
      rarity
    }
    searchedAt
  }
`;

const CardViewFragment = graphql`
  fragment SearchHistoryPanel_cardView on CardViewHistory {
    id
    card {
      __typename
      ... on UnitCard {
        id
        name {
          en
          ko
        }
        color {
          value
        }
        imageUrl
      }
      ... on PilotCard {
        id
        pilot {
          name {
            en
            ko
          }
        }
        color {
          value
        }
        imageUrl
      }
      ... on BaseCard {
        id
        name {
          en
          ko
        }
        imageUrl
      }
      ... on CommandCard {
        id
        name {
          en
          ko
        }
        color {
          value
        }
        imageUrl
      }
      ... on Resource {
        id
        name {
          en
          ko
        }
      }
    }
    searchedAt
  }
`;

// ─── Mutations ────────────────────────────────────────────────────────────────

const REMOVE_MUTATION = `
  mutation RemoveSearchHistory($id: ID!) { removeSearchHistory(id: $id) }
`;
const CLEAR_MUTATION = `mutation { clearSearchHistory }`;

// ─── Label maps ───────────────────────────────────────────────────────────────

function getKindLabel(k: string) {
  return (i18n.t as any)(`kind.${k}`, { ns: "game" });
}
function getColorLabel(c: string) {
  return (i18n.t as any)(`color.${c}`, { ns: "game" });
}
function getSortLabel(s: string) {
  return (i18n.t as any)(`sort.${s}`, { ns: "filters" });
}

function formatRelativeTime(iso: string, t: (key: any, opts?: any) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t("search.just");
  if (m < 60) return t("search.minutesAgo", { count: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("search.hoursAgo", { count: h });
  return t("search.daysAgo", { count: Math.floor(h / 24) });
}

// ─── Filter summary chips ─────────────────────────────────────────────────────

type HistoryFilter = {
  kind: readonly string[];
  sort?: string | null;
  color?: readonly string[] | null;
  trait?: readonly string[] | null;
  query?: string | null;
  package?: string | null;
  zone?: readonly string[] | null;
  keyword?: readonly string[] | null;
  cost?: readonly number[] | null;
  level?: readonly number[] | null;
  rarity?: string | null;
};

function FilterSummary({ f, t }: { f: HistoryFilter; t: (key: any, opts?: any) => string }) {
  const parts: React.ReactNode[] = [];

  const kinds = [...(f.kind ?? [])];
  if (kinds.length > 0 && kinds.length < 5) {
    kinds.forEach((k) =>
      parts.push(
        <span key={`k-${k}`} className="rounded px-1.5 py-0.5 bg-muted text-xs font-medium">
          {getKindLabel(k)}
        </span>,
      ),
    );
  }

  [...(f.color ?? [])].forEach((c) =>
    parts.push(
      <span
        key={`c-${c}`}
        className={cn(
          "rounded px-1.5 py-0.5 text-xs font-medium",
          COLOR_BG[c],
          c === "WHITE" ? "text-gray-500 border border-border" : "text-white",
        )}
      >
        {getColorLabel(c)}
      </span>,
    ),
  );

  const traits = [...(f.trait ?? [])].slice(0, 3);
  traits.forEach((t) =>
    parts.push(
      <span key={`t-${t}`} className="rounded px-1.5 py-0.5 bg-muted text-xs">
        {renderTrait(t)}
      </span>,
    ),
  );
  const traitCount = f.trait?.length ?? 0;
  if (traitCount > 3) {
    parts.push(
      <span key="t-more" className="text-xs text-muted-foreground">
        +{traitCount - 3}
      </span>,
    );
  }

  if (f.package) {
    parts.push(
      <span key="pkg" className="rounded px-1.5 py-0.5 bg-muted text-xs">
        {renderPackage(f.package)}
      </span>,
    );
  }

  [...(f.zone ?? [])].forEach((z) =>
    parts.push(
      <span key={`z-${z}`} className="rounded px-1.5 py-0.5 bg-muted text-xs">
        {renderZone(z)}
      </span>,
    ),
  );

  [...(f.keyword ?? [])].forEach((k) =>
    parts.push(
      <span key={`kw-${k}`} className="rounded px-1.5 py-0.5 bg-muted text-xs">
        {renderKeyword(k)}
      </span>,
    ),
  );

  if ((f.cost?.length ?? 0) > 0) {
    const values = [...(f.cost ?? [])].join("·");
    parts.push(
      <span key="cost" className="rounded px-1.5 py-0.5 bg-muted text-xs">
        {`${t("filter.cost")} ${values}`}
      </span>,
    );
  }

  if ((f.level?.length ?? 0) > 0) {
    parts.push(
      <span key="level" className="rounded px-1.5 py-0.5 bg-muted text-xs">
        Lv {[...(f.level ?? [])].join("·")}
      </span>,
    );
  }

  if (f.query) {
    parts.push(
      <span key="q" className="rounded px-1.5 py-0.5 bg-muted text-xs">
        &ldquo;{f.query}&rdquo;
      </span>,
    );
  }

  if (f.sort) {
    parts.push(
      <span key="s" className="rounded px-1.5 py-0.5 bg-muted/50 text-xs text-muted-foreground">
        {getSortLabel(f.sort)}
      </span>,
    );
  }

  if (parts.length === 0) {
    parts.push(
      <span key="all" className="text-xs text-muted-foreground">
        {t("search.allCards")}
      </span>,
    );
  }

  return <div className="flex flex-wrap gap-1">{parts}</div>;
}

// ─── Entry rows ───────────────────────────────────────────────────────────────

function FilterSearchRow({
  entryRef,
  onRestore,
  onRemove,
}: {
  entryRef: SearchHistoryPanel_filterSearch$key;
  onRestore: (filter: CardFilterInput, sort: CardSort | null) => void;
  onRemove: (id: string, e: React.MouseEvent) => void;
}) {
  const { t } = useTranslation("common");
  const entry = useFragment(FilterSearchFragment, entryRef);
  const { sort, ...filterFields } = entry.filter;

  return (
    <div className="group flex items-start gap-1 rounded-md border border-border hover:bg-accent transition-colors">
      <button
        type="button"
        onClick={() =>
          onRestore(filterFields as unknown as CardFilterInput, (sort as CardSort) ?? null)
        }
        className="flex flex-col gap-1.5 p-2 text-left cursor-pointer flex-1 min-w-0"
      >
        <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
          <SearchIcon className="h-3 w-3 shrink-0" />
          <span className="text-[10px]">{t("search.filterSearch")}</span>
        </div>
        <FilterSummary f={entry.filter} t={t} />
        <span className="text-[10px] text-muted-foreground">
          {formatRelativeTime(entry.searchedAt, t)}
        </span>
      </button>
      <button
        type="button"
        onClick={(e) => onRemove(entry.id, e)}
        className="p-2 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive cursor-pointer transition-all shrink-0"
        aria-label={t("action.delete")}
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function CardViewRow({
  entryRef,
  onRestore,
  onRemove,
}: {
  entryRef: SearchHistoryPanel_cardView$key;
  onRestore: (cardId: string) => void;
  onRemove: (id: string, e: React.MouseEvent) => void;
}) {
  const { t, i18n } = useTranslation("common");
  const entry = useFragment(CardViewFragment, entryRef);

  const card = entry.card;
  const cardId = card.__typename !== "%other" ? card.id : "";
  const nameObj =
    card.__typename === "PilotCard"
      ? card.pilot?.name
      : card.__typename !== "%other" && "name" in card
        ? card.name
        : undefined;
  const cardName = localize(nameObj ?? null, i18n.language);
  const color =
    card.__typename !== "%other" && "color" in card
      ? ((card.color as { value: string } | null | undefined)?.value ?? null)
      : null;
  const imageUrl =
    card.__typename !== "%other" && "imageUrl" in card ? (card.imageUrl ?? null) : null;

  const borderColor = color
    ? color === "WHITE"
      ? "var(--border)"
      : COLOR_HEX[color]
    : "var(--border)";

  return (
    <div
      className="group cutout cutout-tl-md p-px rounded-md  "
      style={{ backgroundColor: borderColor }}
    >
      <div className="flex items-start gap-1 cutout cutout-tl-md bg-card group-hover:bg-accent transition-colors rounded-md">
        <button
          type="button"
          onClick={() => onRestore(cardId)}
          className="flex p-2 pr-0 text-left cursor-pointer flex-1 min-w-0"
        >
          <div className="flex flex-col gap-1.5 min-w-0 w-full">
            <div className="flex items-center text-muted-foreground w-full">
              <EyeIcon className="h-3 w-3 shrink-0" />
              <span className="text-[10px]">{t("search.cardLookup")}</span>
            </div>
            <div className="flex items-start gap-2">
              <img
                className="h-10 w-10 shrink-0 rounded object-cover cutout cutout-br-md"
                src={imageUrl?.replace(/\.webp$/, "-sm.webp")}
                style={
                  color
                    ? { backgroundColor: COLOR_HEX[color] + "33" }
                    : { backgroundColor: "var(--muted)" }
                }
                alt={cardName}
              />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-medium truncate">{cardName}</span>
                <span className="text-[10px] text-muted-foreground">{cardId}</span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {formatRelativeTime(entry.searchedAt, t)}
            </span>
          </div>
        </button>
        <button
          type="button"
          onClick={(e) => onRemove(entry.id, e)}
          className="p-2 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive cursor-pointer transition-all shrink-0"
          aria-label={t("action.delete")}
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

type Props = {
  queryRef: SearchHistoryPanel_query$key;
  onRestore: (filter: CardFilterInput, sort: CardSort | null) => void;
  onRestoreCardView?: (cardId: string) => void;
  fetchKey?: string;
};

export function SearchHistoryPanel({ queryRef, onRestore, onRestoreCardView, fetchKey }: Props) {
  const { t } = useTranslation("common");
  const [, startTransition] = useTransition();
  const [data, refetch] = useRefetchableFragment(SearchHistoryPanelFragment, queryRef);

  const prevFetchKeyRef = useRef(fetchKey);
  useEffect(() => {
    if (fetchKey === undefined || fetchKey === prevFetchKeyRef.current) return;
    prevFetchKeyRef.current = fetchKey;
    startTransition(() => {
      refetch({}, { fetchPolicy: "network-only" });
    });
  }, [fetchKey, refetch]);

  const historyList = useFragment(
    SearchHistoryListFragment,
    data.searchHistory as SearchHistoryPanel_list$key,
  );
  const entries = historyList?.items ?? [];
  if (entries.length === 0) return null;

  function refetchHistory() {
    startTransition(() => {
      refetch({}, { fetchPolicy: "network-only" });
    });
  }

  function handleRemove(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    serveGraphQL(REMOVE_MUTATION, { id });
    refetchHistory();
  }

  function handleClear() {
    serveGraphQL(CLEAR_MUTATION);
    refetchHistory();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <ClockIcon className="h-3 w-3" />
          {t("search.history")}
        </span>
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
        >
          <Trash2Icon className="h-3 w-3" />
          {t("action.deleteAll")}
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {entries.map((entry) => {
          if (entry.__typename === "FilterSearchHistory") {
            return (
              <FilterSearchRow
                key={entry.id}
                entryRef={entry}
                onRestore={onRestore}
                onRemove={handleRemove}
              />
            );
          }
          if (entry.__typename === "CardViewHistory") {
            return (
              <CardViewRow
                key={entry.id}
                entryRef={entry}
                onRestore={(cardId) => onRestoreCardView?.(cardId)}
                onRemove={handleRemove}
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

import { Dialog } from "@base-ui/react/dialog";
import { ClockIcon, SearchIcon, XIcon } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { serveGraphQL } from "@/serve";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { localize } from "@/lib/localize";
import { CardByIdOverlay } from "@/components/CardByIdOverlay";
import { COLOR_HEX } from "@/render/color";

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const HISTORY_QUERY = `
  query QuickSearchHistoryQuery {
    searchHistory {
      items {
        __typename
        ... on CardViewHistory {
          id
          card {
            __typename
            ... on UnitCard    { id name { en ko } color { value } imageUrl }
            ... on PilotCard   { id pilot { name { en ko } } color { value } imageUrl }
            ... on BaseCard    { id name { en ko } imageUrl }
            ... on CommandCard { id name { en ko } color { value } imageUrl }
            ... on Resource    { id name { en ko } }
          }
          searchedAt
        }
      }
    }
  }
`;

const QUICKSEARCH_QUERY = `
  query QuickSearchQuery($q: String!, $first: Int) {
    quicksearch(query: $q, first: $first) {
      __typename
      ... on UnitCard    { id name { en ko } level cost AP HP }
      ... on PilotCard   { id pilot { name { en ko } AP HP } level cost }
      ... on BaseCard    { id name { en ko } level cost AP HP }
      ... on CommandCard { id name { en ko } cost commandPilot: pilot { name { en ko } AP HP } }
      ... on Resource    { id name { en ko } }
    }
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type LocalizedString = { en: string; ko: string };

type UnitResult = {
  __typename: "UnitCard";
  id: string;
  name: LocalizedString;
  level: number;
  cost: number;
  AP: number;
  HP: number;
};
type PilotResult = {
  __typename: "PilotCard";
  id: string;
  pilot: { name: LocalizedString; AP: number; HP: number };
  level: number;
  cost: number;
};
type BaseResult = {
  __typename: "BaseCard";
  id: string;
  name: LocalizedString;
  level: number;
  cost: number;
  AP: number;
  HP: number;
};
type CommandResult = {
  __typename: "CommandCard";
  id: string;
  name: LocalizedString;
  cost: number;
  commandPilot?: { name: LocalizedString; AP: number; HP: number } | null;
};
type ResourceResult = { __typename: "Resource"; id: string; name: LocalizedString };

type SearchResult = UnitResult | PilotResult | BaseResult | CommandResult | ResourceResult;

type CardViewHistoryItem = {
  id: string;
  card: {
    __typename: string;
    id: string;
    name?: { en: string; ko: string };
    pilot?: { name: { en: string; ko: string } };
    color?: { value: string } | null;
    imageUrl?: string | null;
  };
  searchedAt?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type TCommon = (key: string, opts?: Record<string, unknown>) => string;
type TGame = (key: string) => string;

function resultLabel(r: SearchResult, lang: string): string {
  const name = r.__typename === "PilotCard" ? r.pilot.name : r.name;
  return localize(name, lang);
}

function resultMeta(r: SearchResult, t: TCommon): string {
  const cost = (n: number) => t("card.cost", { value: n });
  switch (r.__typename) {
    case "UnitCard":
      return `Lv${r.level} · ${cost(r.cost)} · AP${r.AP} HP${r.HP}`;
    case "PilotCard":
      return `Lv${r.level} · ${cost(r.cost)} · AP${r.pilot.AP} HP${r.pilot.HP}`;
    case "BaseCard":
      return `Lv${r.level} · ${cost(r.cost)} · AP${r.AP} HP${r.HP}`;
    case "CommandCard":
      return r.commandPilot
        ? `${cost(r.cost)} · AP${r.commandPilot.AP} HP${r.commandPilot.HP}`
        : cost(r.cost);
    case "Resource":
      return "";
  }
}

function getKindLabel(typename: string, tGame: TGame): string {
  const map: Record<string, string> = {
    UnitCard: tGame("kind.UNIT"),
    PilotCard: tGame("kind.PILOT"),
    BaseCard: tGame("kind.BASE"),
    CommandCard: tGame("kind.COMMAND"),
    Resource: tGame("kind.RESOURCE"),
  };
  return map[typename] ?? typename;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickSearch() {
  const { t, i18n: i18nInstance } = useTranslation("common");
  const { t: tGame } = useTranslation("game");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [overlayCardId, setOverlayCardId] = useState<string | null>(null);
  const [history, setHistory] = useState<CardViewHistoryItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // cmd+k / ctrl+k
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // focus, reset & fetch history
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
      void (async () => {
        const resp = await serveGraphQL(HISTORY_QUERY, {});
        const items =
          (
            (resp.data as Record<string, unknown>)?.["searchHistory"] as
              | { items: unknown[] }
              | undefined
          )?.items ?? [];
        const cardViews = items.filter(
          (i): i is CardViewHistoryItem & { __typename: "CardViewHistory" } =>
            (i as Record<string, unknown>).__typename === "CardViewHistory",
        );
        setHistory(cardViews.slice(0, 8));
      })();
    } else {
      setQuery("");
      setResults([]);
      setActiveIndex(-1);
    }
  }, [open]);

  // debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const resp = await serveGraphQL(QUICKSEARCH_QUERY, {
        q: query,
        first: 20,
      });
      const hits =
        ((resp.data as Record<string, unknown>)?.["quicksearch"] as SearchResult[]) ?? [];
      setResults(hits);
      setActiveIndex(-1);
      setLoading(false);
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function selectResult(r: SearchResult) {
    setOpen(false);
    setOverlayCardId(r.id);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = Math.min(i + 1, results.length - 1);
        listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = Math.max(i - 1, 0);
        listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectResult(results[activeIndex]);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-8 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <SearchIcon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t("search.label")}</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 text-xs sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <Dialog.Popup className="fixed left-1/2 top-[18%] z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover shadow-2xl transition duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            {/* Input row */}
            <div className="flex items-center gap-2 border-b border-border px-3">
              <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t("search.placeholder")}
                className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-[26rem] overflow-y-auto">
              {!query.trim() && history.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("search.prompt")}
                </p>
              )}
              {!query.trim() && history.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground">
                    <ClockIcon className="h-3 w-3" />
                    {t("search.history")}
                  </div>
                  <ul>
                    {history.map((item) => {
                      const cardId = item.card.id;
                      const nameObj =
                        item.card.__typename === "PilotCard"
                          ? item.card.pilot?.name
                          : item.card.name;
                      const cardName = localize(nameObj ?? null, i18nInstance.language);
                      const color = item.card.color?.value ?? null;
                      const imageUrl = item.card.imageUrl ?? null;
                      return (
                        <li key={item.id}>
                          <button
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                            onClick={() => {
                              setOpen(false);
                              setOverlayCardId(cardId);
                            }}
                          >
                            {imageUrl ? (
                              <img
                                src={imageUrl.replace(/\.webp$/, "-sm.webp")}
                                className="h-8 w-6 shrink-0 rounded object-cover object-top"
                                style={
                                  color ? { backgroundColor: COLOR_HEX[color] + "33" } : undefined
                                }
                                alt=""
                              />
                            ) : (
                              <span
                                className="h-8 w-6 shrink-0 rounded"
                                style={{
                                  backgroundColor: color ? COLOR_HEX[color] + "33" : "var(--muted)",
                                }}
                              />
                            )}
                            <span className="flex-1 truncate text-sm">{cardName}</span>
                            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                              {cardId}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {loading && (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("search.searching")}
                </p>
              )}
              {!loading && query.trim() && results.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("search.noResults")}
                </p>
              )}
              {!loading && results.length > 0 && (
                <ul ref={listRef} className="p-1">
                  {results.map((r, i) => (
                    <li key={r.id}>
                      <button
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left",
                          i === activeIndex
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent hover:text-accent-foreground",
                        )}
                        onMouseEnter={() => setActiveIndex(i)}
                        onClick={() => selectResult(r)}
                      >
                        <span className="w-14 shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-center text-xs text-muted-foreground">
                          {getKindLabel(r.__typename, tGame)}
                        </span>
                        <span className="flex-1 truncate text-sm font-medium">
                          {resultLabel(r, i18nInstance.language)}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {resultMeta(r, t)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {overlayCardId && (
        <Suspense>
          <CardByIdOverlay cardId={overlayCardId} onClose={() => setOverlayCardId(null)} />
        </Suspense>
      )}
    </>
  );
}

import { Dialog } from "@base-ui/react/dialog";
import { SearchIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { serveGraphQL } from "@/serve";
import { cn } from "@/lib/utils";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { localize } from "@/lib/localize";

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const QUICKSEARCH_QUERY = `
  query QuickSearchQuery($q: String!, $first: Int) {
    quicksearch(query: $q, first: $first) {
      __typename
      ... on UnitCard    { id name { en ko } level cost color AP HP }
      ... on PilotCard   { id pilot { name { en ko } AP HP } level cost color }
      ... on BaseCard    { id name { en ko } level cost AP HP }
      ... on CommandCard { id name { en ko } cost color commandPilot: pilot { name { en ko } AP HP } }
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
  color: string;
  AP: number;
  HP: number;
};
type PilotResult = {
  __typename: "PilotCard";
  id: string;
  pilot: { name: LocalizedString; AP: number; HP: number };
  level: number;
  cost: number;
  color: string;
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
  color: string;
  commandPilot?: { name: LocalizedString; AP: number; HP: number } | null;
};
type ResourceResult = { __typename: "Resource"; id: string; name: LocalizedString };

type SearchResult = UnitResult | PilotResult | BaseResult | CommandResult | ResourceResult;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resultLabel(r: SearchResult): string {
  const name = r.__typename === "PilotCard" ? r.pilot.name : r.name;
  return localize(name, i18n.language);
}

function resultMeta(r: SearchResult): string {
  switch (r.__typename) {
    case "UnitCard":
      return `Lv${r.level} · ${r.cost}코 · AP${r.AP} HP${r.HP}`;
    case "PilotCard":
      return `Lv${r.level} · ${r.cost}코 · AP${r.pilot.AP} HP${r.pilot.HP}`;
    case "BaseCard":
      return `Lv${r.level} · ${r.cost}코 · AP${r.AP} HP${r.HP}`;
    case "CommandCard":
      return r.commandPilot
        ? `${r.cost}코스트 · AP${r.commandPilot.AP} HP${r.commandPilot.HP}`
        : `${r.cost}코스트`;
    case "Resource":
      return "";
  }
}

function getKindLabel(typename: string): string {
  const map: Record<string, string> = {
    UnitCard: i18n.t("kind.UNIT", { ns: "game" }),
    PilotCard: i18n.t("kind.PILOT", { ns: "game" }),
    BaseCard: i18n.t("kind.BASE", { ns: "game" }),
    CommandCard: i18n.t("kind.COMMAND", { ns: "game" }),
    Resource: i18n.t("kind.RESOURCE", { ns: "game" }),
  };
  return map[typename] ?? typename;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickSearch() {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const { locale = "ko" } = useParams({ strict: false });

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

  // focus & reset
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
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
        first: 15,
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
    navigate({
      to: "/$locale/cardlist",
      params: { locale },
      search: (prev) => ({ ...prev, cardId: r.id }),
    });
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
              {!query.trim() && (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("search.prompt")}
                </p>
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
                          {getKindLabel(r.__typename)}
                        </span>
                        <span className="flex-1 truncate text-sm font-medium">
                          {resultLabel(r)}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {resultMeta(r)}
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
    </>
  );
}

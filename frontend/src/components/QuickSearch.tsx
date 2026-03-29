import { Dialog } from "@base-ui/react/dialog";
import { SearchIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { serveGraphQL } from "@/serve";
import { cn } from "@/lib/utils";

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const QUICKSEARCH_QUERY = `
  query QuickSearchQuery($q: String!, $first: Int) {
    quicksearch(query: $q, first: $first) {
      __typename
      ... on UnitCard    { id name level cost color AP HP }
      ... on PilotCard   { id pilot { name AP HP } level cost color }
      ... on BaseCard    { id name level cost AP HP }
      ... on CommandCard { id name cost color commandPilot: pilot { name AP HP } }
      ... on Resource    { id name }
    }
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type UnitResult = {
  __typename: "UnitCard";
  id: string;
  name: string;
  level: number;
  cost: number;
  color: string;
  AP: number;
  HP: number;
};
type PilotResult = {
  __typename: "PilotCard";
  id: string;
  pilot: { name: string; AP: number; HP: number };
  level: number;
  cost: number;
  color: string;
};
type BaseResult = {
  __typename: "BaseCard";
  id: string;
  name: string;
  level: number;
  cost: number;
  AP: number;
  HP: number;
};
type CommandResult = {
  __typename: "CommandCard";
  id: string;
  name: string;
  cost: number;
  color: string;
  commandPilot?: { name: string; AP: number; HP: number } | null;
};
type ResourceResult = { __typename: "Resource"; id: string; name: string };

type SearchResult =
  | UnitResult
  | PilotResult
  | BaseResult
  | CommandResult
  | ResourceResult;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resultLabel(r: SearchResult): string {
  return r.__typename === "PilotCard" ? r.pilot.name : r.name;
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

const KIND_LABEL: Record<string, string> = {
  UnitCard: "유닛",
  PilotCard: "파일럿",
  BaseCard: "베이스",
  CommandCard: "커맨드",
  Resource: "리소스",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
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

  // focus & reset
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      setQuery("");
      setResults([]);
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
        ((resp.data as Record<string, unknown>)?.[
          "quicksearch"
        ] as SearchResult[]) ?? [];
      setResults(hits);
      setLoading(false);
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-8 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <SearchIcon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">검색</span>
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
                placeholder="카드 이름, 효과, 특성으로 검색…"
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
                  검색어를 입력하세요
                </p>
              )}
              {loading && (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  검색 중…
                </p>
              )}
              {!loading && query.trim() && results.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  결과 없음
                </p>
              )}
              {!loading && results.length > 0 && (
                <ul className="p-1">
                  {results.map((r) => (
                    <li key={r.id}>
                      <button
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left",
                          "hover:bg-accent hover:text-accent-foreground",
                        )}
                        onClick={() => setOpen(false)}
                      >
                        <span className="w-14 shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-center text-xs text-muted-foreground">
                          {KIND_LABEL[r.__typename] ?? r.__typename}
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

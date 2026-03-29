import type { CardListPageQuery } from "@/__generated__/CardListPageQuery.graphql";
import type { CardFilterInput } from "@/__generated__/CardListFragmentRefetchQuery.graphql";
import { CardList } from "@/components/CardList";
import { useLazyLoadQuery } from "react-relay";
import { graphql } from "relay-runtime";
import { Route, type CardListSearch } from "@/routes/cardlist";
import { useRouter } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import { useRef, useState, useEffect } from "react";

const Query = graphql`
  query CardListPageQuery($filter: CardFilterInput!) {
    ...CardListFragment @arguments(first: 20, filter: $filter)
  }
`;

// ─── Kind labels ─────────────────────────────────────────────────────────────

const KIND_LABELS: Record<string, string> = {
  UNIT: "유닛",
  PILOT: "파일럿",
  BASE: "거점",
  COMMAND: "커맨드",
  RESOURCE: "리소스",
};
const ALL_KINDS = ["UNIT", "PILOT", "BASE", "COMMAND", "RESOURCE"] as const;
const ALL_ZONES = ["SPACE", "EARTH"] as const;
const ZONE_LABELS: Record<string, string> = { SPACE: "우주", EARTH: "지구" };
const COST_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// ─── Filter bar ──────────────────────────────────────────────────────────────

function FilterBar() {
  const search = Route.useSearch();
  const router = useRouter();
  const activeKind = search.kind ?? ["UNIT"];

  // local text input state to debounce
  const [queryText, setQueryText] = useState(search.query ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // sync if URL changes externally
  useEffect(() => {
    setQueryText(search.query ?? "");
  }, [search.query]);

  function navigate(patch: Partial<CardListSearch>) {
    router.navigate({
      to: "/cardlist",
      search: { ...search, ...patch },
    });
  }

  function toggleKind(k: (typeof ALL_KINDS)[number]) {
    const next = activeKind.includes(k)
      ? activeKind.filter((x) => x !== k)
      : [...activeKind, k];
    navigate({ kind: next.length > 0 ? next : [k] });
  }

  function toggleCost(c: number) {
    const current = search.cost ?? [];
    const next = current.includes(c)
      ? current.filter((x) => x !== c)
      : [...current, c];
    navigate({ cost: next.length > 0 ? next : undefined });
  }

  function toggleZone(z: (typeof ALL_ZONES)[number]) {
    const current = search.zone ?? [];
    const next = current.includes(z)
      ? current.filter((x) => x !== z)
      : [...current, z];
    navigate({ zone: next.length > 0 ? next : undefined });
  }

  function onQueryChange(value: string) {
    setQueryText(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigate({ query: value.trim() || undefined });
    }, 300);
  }

  const hasFilters =
    activeKind.join(",") !== "UNIT" ||
    (search.cost?.length ?? 0) > 0 ||
    (search.zone?.length ?? 0) > 0 ||
    !!search.query;

  function resetAll() {
    setQueryText("");
    router.navigate({ to: "/cardlist", search: { kind: ["UNIT"] } });
  }

  return (
    <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
      {/* Kind toggles */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground w-10 shrink-0">종류</span>
        <div className="flex flex-wrap gap-1">
          {ALL_KINDS.map((k) => (
            <button
              key={k}
              onClick={() => toggleKind(k)}
              className={cn(
                "rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors",
                activeKind.includes(k)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {KIND_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      {/* Cost chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground w-10 shrink-0">코스트</span>
        <div className="flex flex-wrap gap-1">
          {COST_OPTIONS.map((c) => (
            <button
              key={c}
              onClick={() => toggleCost(c)}
              className={cn(
                "h-6 w-6 rounded border text-xs font-medium transition-colors",
                (search.cost ?? []).includes(c)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Zone + Query row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground w-10 shrink-0">지형</span>
          <div className="flex gap-1">
            {ALL_ZONES.map((z) => (
              <button
                key={z}
                onClick={() => toggleZone(z)}
                className={cn(
                  "rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors",
                  (search.zone ?? []).includes(z)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {ZONE_LABELS[z]}
              </button>
            ))}
          </div>
        </div>

        {/* Text search */}
        <div className="relative ml-auto flex items-center">
          <input
            value={queryText}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="이름 · 효과 검색"
            className="h-7 rounded-md border border-input bg-background px-2.5 pr-7 text-xs outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          {queryText && (
            <button
              onClick={() => onQueryChange("")}
              className="absolute right-1.5 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {hasFilters && (
          <button
            onClick={resetAll}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            초기화
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

function buildFilter(search: CardListSearch): CardFilterInput {
  return {
    kind: search.kind ?? ["UNIT"],
    cost: search.cost ?? null,
    level: search.level ?? null,
    zone: search.zone ?? null,
    query: search.query ?? null,
  };
}

export function CardListPage() {
  const search = Route.useSearch();
  const filter = buildFilter(search);
  const data = useLazyLoadQuery<CardListPageQuery>(Query, { filter });

  return (
    <div className="flex flex-col">
      <FilterBar />
      <CardList queryRef={data} />
    </div>
  );
}

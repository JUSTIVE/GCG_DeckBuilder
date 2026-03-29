import type { CardListPageQuery } from "@/__generated__/CardListPageQuery.graphql";
import type { CardFilterInput } from "@/__generated__/CardListFragmentRefetchQuery.graphql";
import { CardList } from "@/components/CardList";
import { useLazyLoadQuery } from "react-relay";
import { graphql } from "relay-runtime";
import { Route, type CardListSearch } from "@/routes/cardlist";
import { useRouter } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import { useRef, useState, useEffect, Suspense } from "react";

const Query = graphql`
  query CardListPageQuery($filter: CardFilterInput!) {
    ...CardListFragment @arguments(first: 20, filter: $filter)
  }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildFilter(search: CardListSearch): CardFilterInput {
  return {
    kind: search.kind ?? ["UNIT"],
    cost: search.cost ?? null,
    level: search.level ?? null,
    zone: search.zone ?? null,
    query: search.query ?? null,
  };
}

function filterToSearch(filter: CardFilterInput): CardListSearch {
  const kind = filter.kind as CardListSearch["kind"];
  const cost = filter.cost as number[] | null | undefined;
  const level = filter.level as number[] | null | undefined;
  const zone = filter.zone as CardListSearch["zone"] | null | undefined;
  const query = filter.query as string | null | undefined;
  return {
    kind: kind?.join(",") === "UNIT" ? undefined : kind,
    cost: cost?.length ? cost : undefined,
    level: level?.length ? level : undefined,
    zone: zone?.length ? zone : undefined,
    query: query || undefined,
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

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

type FilterBarProps = {
  filter: CardFilterInput;
  onChange: (filter: CardFilterInput) => void;
};

function FilterBar({ filter, onChange }: FilterBarProps) {
  const [queryText, setQueryText] = useState(filter.query ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQueryText(filter.query ?? "");
  }, [filter.query]);

  function patch(next: Partial<CardFilterInput>) {
    onChange({ ...filter, ...next });
  }

  function toggleKind(k: (typeof ALL_KINDS)[number]) {
    const current = filter.kind as string[];
    const next = current.includes(k)
      ? current.filter((x) => x !== k)
      : [...current, k];
    patch({ kind: next.length > 0 ? (next as CardFilterInput["kind"]) : [k] });
  }

  function toggleCost(c: number) {
    const current = (filter.cost as number[] | undefined) ?? [];
    const next = current.includes(c)
      ? current.filter((x) => x !== c)
      : [...current, c];
    patch({ cost: next.length > 0 ? next : null });
  }

  function toggleZone(z: (typeof ALL_ZONES)[number]) {
    const current = (filter.zone as string[] | undefined) ?? [];
    const next = current.includes(z)
      ? current.filter((x) => x !== z)
      : [...current, z];
    patch({ zone: next.length > 0 ? (next as CardFilterInput["zone"]) : null });
  }

  function onQueryChange(value: string) {
    setQueryText(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      patch({ query: value.trim() || null });
    }, 300);
  }

  const activeKind = filter.kind as string[];
  const activeCost = (filter.cost as number[] | undefined) ?? [];
  const activeZone = (filter.zone as string[] | undefined) ?? [];

  const hasFilters =
    activeKind.join(",") !== "UNIT" ||
    activeCost.length > 0 ||
    activeZone.length > 0 ||
    !!filter.query;

  return (
    <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
      {/* Kind toggles */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground w-10 shrink-0">
          종류
        </span>
        <div className="flex flex-wrap gap-1">
          {ALL_KINDS.map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => toggleKind(k)}
              className={cn(
                "rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer",
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
        <span className="text-xs text-muted-foreground w-10 shrink-0">
          코스트
        </span>
        <div className="flex flex-wrap gap-1">
          {COST_OPTIONS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => toggleCost(c)}
              className={cn(
                "h-6 w-6 rounded border text-xs font-medium transition-colors cursor-pointer",
                activeCost.includes(c)
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
          <span className="text-xs text-muted-foreground w-10 shrink-0">
            지형
          </span>
          <div className="flex gap-1">
            {ALL_ZONES.map((z) => (
              <button
                type="button"
                key={z}
                onClick={() => toggleZone(z)}
                className={cn(
                  "rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer",
                  activeZone.includes(z)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {ZONE_LABELS[z]}
              </button>
            ))}
          </div>
        </div>

        <div className="relative ml-auto flex items-center">
          <input
            value={queryText}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="이름 · 효과 검색"
            className="h-7 rounded-md border border-input bg-background px-2.5 pr-7 text-xs outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          {queryText && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              className="absolute right-1.5 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={() => onChange({ kind: ["UNIT"] })}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline cursor-pointer"
          >
            초기화
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Content (suspends on initial load only) ─────────────────────────────────

function CardListContent({ filter }: { filter: CardFilterInput }) {
  // Capture the filter at first mount so useLazyLoadQuery only fires once.
  // Subsequent filter changes are handled by CardList via refetch.
  const initialFilterRef = useRef(filter);
  const data = useLazyLoadQuery<CardListPageQuery>(Query, {
    filter: initialFilterRef.current,
  });
  return <CardList queryRef={data} filter={filter} />;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function CardListPage() {
  const search = Route.useSearch();
  const router = useRouter();
  const filter = buildFilter(search);

  function handleFilterChange(newFilter: CardFilterInput) {
    router.navigate({
      to: "/cardlist",
      search: filterToSearch(newFilter),
      replace: true,
    });
  }

  return (
    <div className="flex flex-col">
      <FilterBar filter={filter} onChange={handleFilterChange} />
      <Suspense>
        <CardListContent filter={filter} />
      </Suspense>
    </div>
  );
}

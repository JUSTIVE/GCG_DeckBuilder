import type { CardListPageQuery } from "@/__generated__/CardListPageQuery.graphql";
import type { CardFilterInput } from "@/__generated__/CardListFragmentRefetchQuery.graphql";
import type { CardSort } from "@/__generated__/CardListPageQuery.graphql";
import { CardList } from "@/components/CardList";
import { useLazyLoadQuery } from "react-relay";
import { graphql } from "relay-runtime";
import { Route, type CardListSearch } from "@/routes/cardlist";
import { useRouter } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { SlidersHorizontalIcon, XIcon } from "lucide-react";
import { useRef, useState, useEffect, Suspense } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const Query = graphql`
  query CardListPageQuery($filter: CardFilterInput!, $sort: CardSort) {
    ...CardListFragment @arguments(first: 20, filter: $filter, sort: $sort)
  }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildFilter(search: CardListSearch): CardFilterInput {
  return {
    kind: search.kind ?? ["UNIT"],
    cost: search.cost ?? null,
    level: search.level ?? null,
    zone: search.zone ?? null,
    package: search.package ?? null,
    query: search.query ?? null,
  };
}

function buildSort(search: CardListSearch): CardSort | null {
  return (search.sort as CardSort) ?? null;
}

function filterToSearch(
  filter: CardFilterInput,
  sort: CardSort | null,
): CardListSearch {
  const kind = filter.kind as CardListSearch["kind"];
  const cost = filter.cost as number[] | null | undefined;
  const level = filter.level as number[] | null | undefined;
  const zone = filter.zone as CardListSearch["zone"] | null | undefined;
  const pkg = filter.package as CardListSearch["package"] | null | undefined;
  const query = filter.query as string | null | undefined;
  return {
    kind: kind?.join(",") === "UNIT" ? undefined : kind,
    cost: cost?.length ? cost : undefined,
    level: level?.length ? level : undefined,
    zone: zone?.length ? zone : undefined,
    package: pkg || undefined,
    query: query || undefined,
    sort: sort as CardListSearch["sort"] | undefined,
  };
}

function activeFilterCount(filter: CardFilterInput): number {
  let count = 0;
  const kind = filter.kind as string[];
  if (kind.join(",") !== "UNIT") count++;
  if ((filter.cost as number[] | null | undefined)?.length) count++;
  if ((filter.level as number[] | null | undefined)?.length) count++;
  if ((filter.zone as string[] | null | undefined)?.length) count++;
  if (filter.package) count++;
  if (filter.query) count++;
  return count;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const KIND_LABELS: Record<string, string> = {
  UNIT: "유닛",
  PILOT: "파일럿",
  BASE: "거점",
  COMMAND: "커맨드",
  RESOURCE: "리소스",
};

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "NAME_ASC", label: "이름 ↑" },
  { value: "NAME_DESC", label: "이름 ↓" },
  { value: "COST_ASC", label: "코스트 ↑" },
  { value: "COST_DESC", label: "코스트 ↓" },
  { value: "LEVEL_ASC", label: "레벨 ↑" },
  { value: "LEVEL_DESC", label: "레벨 ↓" },
  { value: "AP_ASC", label: "공격력 ↑" },
  { value: "AP_DESC", label: "공격력 ↓" },
  { value: "HP_ASC", label: "체력 ↑" },
  { value: "HP_DESC", label: "체력 ↓" },
];
const ALL_KINDS = ["UNIT", "PILOT", "BASE", "COMMAND", "RESOURCE"] as const;
const ALL_ZONES = ["SPACE", "EARTH"] as const;
const ZONE_LABELS: Record<string, string> = { SPACE: "우주", EARTH: "지구" };
const COST_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const LEVEL_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const INITIAL_FILTER: CardFilterInput = { kind: ["UNIT"] };

const PACK_GROUPS: {
  label: string;
  items: { value: string; label: string }[];
}[] = [
  {
    label: "부스트팩",
    items: [
      { value: "GD01", label: "GD01" },
      { value: "GD02", label: "GD02" },
      { value: "GD03", label: "GD03" },
    ],
  },
  {
    label: "스타터덱",
    items: [
      { value: "ST01", label: "ST01" },
      { value: "ST02", label: "ST02" },
      { value: "ST03", label: "ST03" },
      { value: "ST04", label: "ST04" },
      { value: "ST05", label: "ST05" },
      { value: "ST06", label: "ST06" },
      { value: "ST07", label: "ST07" },
      { value: "ST08", label: "ST08" },
      { value: "ST09", label: "ST09" },
    ],
  },
  {
    label: "기타",
    items: [
      { value: "BASIC_CARDS", label: "기본" },
      { value: "EDITION_BETA", label: "베타" },
      { value: "PROMOTION_CARD", label: "프로모" },
      { value: "OTHER_PRODUCT_CARD", label: "기타 상품" },
    ],
  },
];

// ─── Filter controls (shared between bar and bottom sheet) ───────────────────

type FilterControlsProps = {
  filter: CardFilterInput;
  sort: CardSort | null;
  onChange: (filter: CardFilterInput) => void;
  onSortChange: (sort: CardSort | null) => void;
};

function FilterControls({
  filter,
  sort,
  onChange,
  onSortChange,
}: FilterControlsProps) {
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

  function toggleLevel(l: number) {
    const current = (filter.level as number[] | undefined) ?? [];
    const next = current.includes(l)
      ? current.filter((x) => x !== l)
      : [...current, l];
    patch({ level: next.length > 0 ? next : null });
  }

  function toggleZone(z: (typeof ALL_ZONES)[number]) {
    const current = (filter.zone as string[] | undefined) ?? [];
    const next = current.includes(z)
      ? current.filter((x) => x !== z)
      : [...current, z];
    patch({ zone: next.length > 0 ? (next as CardFilterInput["zone"]) : null });
  }

  function togglePackage(p: string) {
    patch({
      package: filter.package === p ? null : (p as CardFilterInput["package"]),
    });
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
  const activeLevel = (filter.level as number[] | undefined) ?? [];
  const activeZone = (filter.zone as string[] | undefined) ?? [];
  const activePackage = filter.package as string | null | undefined;

  return (
    <div className="flex flex-col gap-3">
      {/* Sort */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground w-10 shrink-0">
          정렬
        </span>
        <select
          value={sort || ""}
          onChange={(e) =>
            onSortChange(e.target.value ? (e.target.value as CardSort) : null)
          }
          className="h-7 flex-1 rounded-md border border-input bg-background px-2.5 text-xs outline-none focus:border-primary cursor-pointer"
        >
          <option value="">기본</option>
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Kind */}
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

      {/* Cost */}
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

      {/* Level */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground w-10 shrink-0">
          레벨
        </span>
        <div className="flex flex-wrap gap-1">
          {LEVEL_OPTIONS.map((l) => (
            <button
              type="button"
              key={l}
              onClick={() => toggleLevel(l)}
              className={cn(
                "h-6 w-6 rounded border text-xs font-medium transition-colors cursor-pointer",
                activeLevel.includes(l)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Zone */}
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

      {/* Pack */}
      <div className="grid grid-cols-[2.5rem_1fr] items-start gap-x-1.5">
        <span className="text-xs text-muted-foreground pt-0.5">팩</span>
        <div className="flex flex-col gap-1.5">
          {PACK_GROUPS.map((group) => (
            <div
              key={group.label}
              className="grid grid-cols-[2.5rem_1fr] items-start gap-x-1"
            >
              <span className="text-[10px] text-muted-foreground/60 pt-0.5">
                {group.label}
              </span>
              <div className="flex flex-wrap gap-1">
                {group.items.map(({ value, label }) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => togglePackage(value)}
                    className={cn(
                      "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer",
                      activePackage === value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Query */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground w-10 shrink-0">
          검색
        </span>
        <div className="relative flex-1 flex items-center">
          <input
            value={queryText}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="이름 · 효과 검색"
            className="h-7 w-full rounded-md border border-input bg-background px-2.5 pr-7 text-xs outline-none placeholder:text-muted-foreground focus:border-primary"
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
      </div>
    </div>
  );
}

// ─── Desktop filter bar (md+) ─────────────────────────────────────────────────

function FilterBar({
  filter,
  sort,
  onChange,
  onSortChange,
}: FilterControlsProps) {
  const hasFilters = activeFilterCount(filter) > 0;

  return (
    <aside className="hidden md:flex flex-col gap-4 w-70 shrink-0 border-r border-border px-4 py-4 overflow-y-auto h-[calc(100dvh-65px)]">
      <FilterControls
        filter={filter}
        sort={sort}
        onChange={onChange}
        onSortChange={onSortChange}
      />
      {hasFilters && (
        <button
          type="button"
          onClick={() => onChange(INITIAL_FILTER)}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline cursor-pointer self-start"
        >
          초기화
        </button>
      )}
    </aside>
  );
}

// ─── Mobile filter trigger + bottom sheet (<md) ───────────────────────────────

function FilterBottomSheet({
  filter,
  sort,
  onChange,
  onSortChange,
}: FilterControlsProps) {
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(filter);

  return (
    <div className="flex md:hidden items-center gap-2 border-b border-border px-4 py-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
      >
        <SlidersHorizontalIcon className="h-3.5 w-3.5" />
        필터
        {count > 0 && (
          <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {count}
          </span>
        )}
      </button>

      {count > 0 && (
        <button
          type="button"
          onClick={() => onChange(INITIAL_FILTER)}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline cursor-pointer"
        >
          초기화
        </button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="px-4 pb-8 pt-0 rounded-t-xl"
        >
          <div className="mx-auto mb-4 mt-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
          <SheetHeader className="p-0 mb-4">
            <SheetTitle>필터</SheetTitle>
          </SheetHeader>
          <FilterControls
            filter={filter}
            sort={sort}
            onChange={onChange}
            onSortChange={onSortChange}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Content (suspends on initial load only) ─────────────────────────────────

function CardListContent({
  filter,
  sort,
}: {
  filter: CardFilterInput;
  sort: CardSort | null;
}) {
  const initialFilterRef = useRef(filter);
  const initialSortRef = useRef(sort);
  const data = useLazyLoadQuery<CardListPageQuery>(Query, {
    filter: initialFilterRef.current,
    sort: initialSortRef.current,
  });
  return <CardList queryRef={data} filter={filter} sort={sort} />;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function CardListPage() {
  const search = Route.useSearch();
  const router = useRouter();
  const filter = buildFilter(search);
  const sort = buildSort(search);

  function handleFilterChange(newFilter: CardFilterInput) {
    router.navigate({
      to: "/cardlist",
      search: (prev) => ({
        ...filterToSearch(newFilter, sort),
        cardId: prev.cardId,
      }),
      replace: true,
    });
  }

  function handleSortChange(newSort: CardSort | null) {
    router.navigate({
      to: "/cardlist",
      search: (prev) => ({
        ...filterToSearch(filter, newSort),
        cardId: prev.cardId,
      }),
      replace: true,
    });
  }

  return (
    <div className="flex flex-col md:flex-row">
      <FilterBar
        filter={filter}
        sort={sort}
        onChange={handleFilterChange}
        onSortChange={handleSortChange}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <FilterBottomSheet
          filter={filter}
          sort={sort}
          onChange={handleFilterChange}
          onSortChange={handleSortChange}
        />
        <Suspense>
          <CardListContent filter={filter} sort={sort} />
        </Suspense>
      </div>
    </div>
  );
}

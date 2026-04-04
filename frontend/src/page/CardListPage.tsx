import type { CardListPageQuery } from "@/__generated__/CardListPageQuery.graphql";
import type { CardFilterInput } from "@/__generated__/CardListFragmentRefetchQuery.graphql";
import type { CardSort } from "@/__generated__/CardListPageQuery.graphql";
import { CardList } from "@/components/CardList";
import { CardByIdOverlay } from "@/components/CardByIdOverlay";
import { useLazyLoadQuery } from "react-relay";
import { graphql } from "relay-runtime";
import {
  Route,
  type CardListSearch,
} from "@/routes/cardlist";
import { useRouter } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  ClockIcon,
  FileTextIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import {
  FilterControls,
  activeFilterCount,
  INITIAL_FILTER,
  type FilterControlsProps,
} from "@/components/CardFilterControls";
import { useRef, useState, Suspense, useMemo } from "react";
import { SearchHistoryPanel } from "@/components/SearchHistoryPanel";
import type { SearchHistoryPanel_query$key } from "@/__generated__/SearchHistoryPanel_query.graphql";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const Query = graphql`
  query CardListPageQuery($filter: CardFilterInput!, $sort: CardSort) {
    ...CardListFragment @arguments(first: 20, filter: $filter, sort: $sort)
    ...SearchHistoryPanel_query
  }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildFilter(search: CardListSearch): CardFilterInput {
  return {
    kind: search.kind ?? [],
    cost: search.cost ?? null,
    level: search.level ?? null,
    zone: search.zone ?? null,
    color: search.color ?? null,
    keyword: search.keyword ?? null,
    trait: search.trait ?? null,
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
  const color = filter.color as CardListSearch["color"] | null | undefined;
  const keyword = filter.keyword as
    | CardListSearch["keyword"]
    | null
    | undefined;
  const trait = filter.trait as CardListSearch["trait"] | null | undefined;
  const pkg = filter.package as CardListSearch["package"] | null | undefined;
  const query = filter.query as string | null | undefined;
  return {
    kind: kind,
    cost: cost?.length ? cost : undefined,
    level: level?.length ? level : undefined,
    zone: zone?.length ? zone : undefined,
    color: color?.length ? color : undefined,
    keyword: keyword?.length ? keyword : undefined,
    trait: trait?.length ? trait : undefined,
    package: pkg || undefined,
    query: query || undefined,
    sort: sort as CardListSearch["sort"] | undefined,
  };
}

// ─── Desktop filter bar (md+) ─────────────────────────────────────────────────

function FilterBar({
  filter,
  sort,
  onChange,
  onSortChange,
  onRestore,
  onRestoreCardView,
  historyQueryRef,
  historyFetchKey,
}: FilterControlsProps & {
  onRestore: (f: CardFilterInput, s: CardSort | null) => void;
  onRestoreCardView: (cardId: string) => void;
  historyQueryRef: SearchHistoryPanel_query$key;
  historyFetchKey: string;
}) {
  const hasFilters = activeFilterCount(filter) > 0;

  return (
    <aside className="hidden md:flex flex-col gap-4 w-85 shrink-0 border-r border-border px-4 py-4 overflow-y-auto h-[calc(100dvh-65px)]">
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
      <div className="border-t border-border pt-3">
        <SearchHistoryPanel
          queryRef={historyQueryRef}
          fetchKey={historyFetchKey}
          onRestore={onRestore}
          onRestoreCardView={onRestoreCardView}
        />
      </div>
    </aside>
  );
}

// ─── Mobile filter trigger + bottom sheet (<md) ───────────────────────────────

function FilterBottomSheet({
  filter,
  sort,
  onChange,
  onSortChange,
  showDescription,
  onToggleDescription,
  onRestore,
  onRestoreCardView,
  historyQueryRef,
  historyFetchKey,
}: FilterControlsProps & {
  showDescription: boolean;
  onToggleDescription: () => void;
  onRestore: (f: CardFilterInput, s: CardSort | null) => void;
  onRestoreCardView: (cardId: string) => void;
  historyQueryRef: SearchHistoryPanel_query$key;
  historyFetchKey: string;
}) {
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef<number | null>(null);
  const count = activeFilterCount(filter);

  function onHandlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragStartY.current = e.clientY;
    setDragY(0);
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }

  function onHandlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStartY.current === null) return;
    const delta = Math.max(0, e.clientY - dragStartY.current);
    setDragY(delta);
  }

  function onHandlePointerUp() {
    if (dragStartY.current === null) return;
    if (dragY > 80) {
      setOpen(false);
    }
    dragStartY.current = null;
    setDragY(0);
  }

  const isDragging = dragStartY.current !== null;

  return (
    <div className="flex md:hidden items-center gap-2 border-b border-border px-4 py-2">
      <button
        type="button"
        onClick={onToggleDescription}
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
          showDescription
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )}
      >
        <FileTextIcon className="h-3.5 w-3.5" />
        효과
      </button>
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

      <button
        type="button"
        onClick={() => setHistoryOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
      >
        <ClockIcon className="h-3.5 w-3.5" />
        기록
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

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="px-4 pb-0 pt-0 rounded-t-xl max-h-[80dvh] flex flex-col"
        >
          <div className="mx-auto mb-4 mt-3 h-1 w-10 rounded-full bg-muted-foreground/30 shrink-0" />
          <SheetHeader className="p-0 mb-4 shrink-0">
            <SheetTitle>검색 기록</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto pb-8">
            <SearchHistoryPanel
              queryRef={historyQueryRef}
              fetchKey={historyFetchKey}
              onRestore={(f, s) => { onRestore(f, s); setHistoryOpen(false); }}
              onRestoreCardView={(id) => { onRestoreCardView(id); setHistoryOpen(false); }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="px-4 pb-0 pt-0 rounded-t-xl max-h-[80dvh] flex flex-col"
          style={{
            transform: `translateY(${dragY}px)`,
            transition: isDragging ? "none" : undefined,
          }}
        >
          <div
            className="mx-auto mb-4 mt-3 h-1 w-10 rounded-full bg-muted-foreground/30 shrink-0 touch-none cursor-grab active:cursor-grabbing"
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerUp}
          />
          <SheetHeader className="p-0 mb-4 shrink-0">
            <SheetTitle>필터</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto pb-8">
            <FilterControls
              filter={filter}
              sort={sort}
              onChange={onChange}
              onSortChange={onSortChange}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Content ─────────────────────────────────────────────────────────────────

function CardListContent({
  queryRef,
  filter,
  sort,
  showDescription,
  onCardIdsChange,
}: {
  queryRef: CardListPageQuery["response"];
  filter: CardFilterInput;
  sort: CardSort | null;
  showDescription: boolean;
  onCardIdsChange: (ids: string[]) => void;
}) {
  return (
    <CardList
      queryRef={queryRef}
      filter={filter}
      sort={sort}
      showDescription={showDescription}
      onCardIdsChange={onCardIdsChange}
    />
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function CardListPage() {
  const search = Route.useSearch();
  const router = useRouter();
  const filter = buildFilter(search);
  const sort = buildSort(search);
  const [showDescription, setShowDescription] = useState(false);
  const [cardIds, setCardIds] = useState<string[]>([]);

  const initialFilterRef = useRef(filter);
  const initialSortRef = useRef(sort);
  const data = useLazyLoadQuery<CardListPageQuery>(Query, {
    filter: initialFilterRef.current,
    sort: initialSortRef.current,
  });

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

  function handleRestore(newFilter: CardFilterInput, newSort: CardSort | null) {
    router.navigate({
      to: "/cardlist",
      search: (prev) => ({
        ...filterToSearch(newFilter, newSort),
        cardId: prev.cardId,
      }),
      replace: true,
    });
  }

  function handleRestoreCardView(cardId: string) {
    router.navigate({
      to: "/cardlist",
      search: (prev) => ({ ...prev, cardId }),
      replace: true,
    });
  }

  const historyFetchKey = useMemo(
    () => JSON.stringify({ filter, sort }),
    [filter, sort],
  );

  return (
    <div className="flex flex-col md:flex-row">
      <FilterBar
        filter={filter}
        sort={sort}
        onChange={handleFilterChange}
        onSortChange={handleSortChange}
        onRestore={handleRestore}
        onRestoreCardView={handleRestoreCardView}
        historyQueryRef={data}
        historyFetchKey={historyFetchKey}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <FilterBottomSheet
          filter={filter}
          sort={sort}
          onChange={handleFilterChange}
          onSortChange={handleSortChange}
          showDescription={showDescription}
          onToggleDescription={() => setShowDescription((v) => !v)}
          onRestore={handleRestore}
          onRestoreCardView={handleRestoreCardView}
          historyQueryRef={data}
          historyFetchKey={historyFetchKey}
        />
        <div className="hidden md:flex items-center gap-2 border-b border-border px-4 py-2">
          <button
            type="button"
            onClick={() => setShowDescription((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
              showDescription
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <FileTextIcon className="h-3.5 w-3.5" />
            효과
          </button>
        </div>
        <CardListContent
          queryRef={data}
          filter={filter}
          sort={sort}
          showDescription={showDescription}
          onCardIdsChange={setCardIds}
        />
        {search.cardId && (
          <Suspense>
            <CardByIdOverlay cardId={search.cardId} cardIds={cardIds} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

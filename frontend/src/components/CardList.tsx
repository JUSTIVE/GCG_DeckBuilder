import type { CardListFragment$key } from "@/__generated__/CardListFragment.graphql";
import type {
  CardFilterInput,
  CardSort,
} from "@/__generated__/CardListFragmentRefetchQuery.graphql";
import { usePaginationFragment, useMutation } from "react-relay";
import { graphql } from "relay-runtime";
import { Card } from "./Card";
import { useRef, useState, useEffect, useTransition } from "react";
import type { CardListAddFilterSearchMutation } from "@/__generated__/CardListAddFilterSearchMutation.graphql";

const ADD_FILTER_SEARCH_MUTATION = graphql`
  mutation CardListAddFilterSearchMutation($filter: CardFilterInput!, $sort: CardSort) {
    addFilterSearch(filter: $filter, sort: $sort) {
      ...SearchHistoryPanel_list
    }
  }
`;
import { useVirtualizer } from "@tanstack/react-virtual";

const Fragment = graphql`
  fragment CardListFragment on Query
  @refetchable(queryName: "CardListFragmentRefetchQuery")
  @argumentDefinitions(
    filter: { type: "CardFilterInput" }
    sort: { type: "CardSort" }
    first: { type: "Int" }
    after: { type: "String" }
  ) {
    cards(after: $after, first: $first, filter: $filter, sort: $sort)
      @connection(key: "CardListFragment_cards") {
      totalCount
      edges {
        cursor
        node {
          ... on UnitCard {
            id
          }
          ... on PilotCard {
            id
          }
          ... on BaseCard {
            id
          }
          ... on CommandCard {
            id
          }
          ...CardFragment
        }
      }
    }
  }
`;

type Props = {
  queryRef: CardListFragment$key;
  filter?: CardFilterInput;
  sort?: CardSort | null;
  showDescription?: boolean;
  onCardAdd?: (cardId: string) => void;
  onCardRemove?: (cardId: string) => void;
  onCardOpen?: (cardId: string) => void;
  onCardIdsChange?: (ids: string[]) => void;
  scrollClassName?: string;
  deckCardCounts?: Record<string, number>;
  deckColors?: string[];
  deckFull?: boolean;
};

export function CardList({
  queryRef,
  filter,
  sort,
  showDescription = false,
  onCardAdd,
  onCardRemove,
  onCardOpen,
  onCardIdsChange,
  scrollClassName = "overflow-y-auto h-[calc(100dvh-65px-48px)] py-5",
  deckCardCounts,
  deckColors,
  deckFull,
}: Props) {
  const [, startTransition] = useTransition();
  const [commitAddFilterSearch] = useMutation<CardListAddFilterSearchMutation>(
    ADD_FILTER_SEARCH_MUTATION,
  );
  const { data, refetch, loadNext, hasNext, isLoadingNext } = usePaginationFragment(
    Fragment,
    queryRef,
  );

  // refetch when filter or sort changes, keeping old content visible via startTransition
  const prevParamsRef = useRef(JSON.stringify({ filter, sort }));
  useEffect(() => {
    const serialized = JSON.stringify({ filter, sort });
    if (serialized === prevParamsRef.current) return;
    prevParamsRef.current = serialized;
    if (!filter) return;
    startTransition(() => {
      refetch({ filter, sort: sort ?? null }, { fetchPolicy: "network-only" });
    });
    const hasActiveFilter =
      (filter.kind?.length ?? 0) > 0 ||
      !!filter.query ||
      (filter.color?.length ?? 0) > 0 ||
      (filter.trait?.length ?? 0) > 0 ||
      (filter.zone?.length ?? 0) > 0 ||
      (filter.keyword?.length ?? 0) > 0 ||
      (filter.level?.length ?? 0) > 0 ||
      (filter.cost?.length ?? 0) > 0 ||
      !!filter.package ||
      !!filter.rarity ||
      !!sort;
    if (hasActiveFilter) {
      commitAddFilterSearch({ variables: { filter, sort: sort ?? null } });
    }
  }, [filter, sort, refetch]);
  useEffect(() => {
    if (!onCardIdsChange) return;
    const ids = data.cards.edges.map((e) => (e.node as any).id).filter(Boolean) as string[];
    onCardIdsChange(ids);
  }, [data.cards.edges, onCardIdsChange]);

  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);

  // 컨테이너 너비에 따라 컬럼 수 계산
  useEffect(() => {
    const updateColumns = () => {
      if (!parentRef.current) return;
      const width = parentRef.current.offsetWidth;
      const minCardWidth = width < 768 ? 150 : 200;
      const cols = Math.floor((width - 32) / (minCardWidth + 16)); // padding & gap 고려
      setColumns(Math.max(1, cols));
    };

    updateColumns();
    const observer = new ResizeObserver(updateColumns);
    if (parentRef.current) observer.observe(parentRef.current);
    return () => observer.disconnect();
  }, []);

  // 행 개수 계산
  const rowCount = Math.ceil(data.cards.edges.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => {
      const cardHeight =
        ((parentRef.current?.offsetWidth ?? 0 - (columns - 1) * 32) / columns / 800) * 1117;
      return showDescription ? cardHeight + 120 : cardHeight;
    },
    measureElement: (el) => el.getBoundingClientRect().height,
    overscan: 2,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  // 스크롤 끝에 도달하면 다음 페이지 로드
  useEffect(() => {
    const lastItem = virtualItems.at(-1);
    // console.log(rowVirtualizer.getVirtualItems());
    if (!lastItem) return;

    if (lastItem.index >= rowCount - 1 && hasNext && !isLoadingNext) {
      loadNext(30);
    }
  }, [hasNext, isLoadingNext, loadNext, rowCount, virtualItems]);

  return (
    <div ref={parentRef} className={scrollClassName}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const endIndex = Math.min(startIndex + columns, data.cards.edges.length);
          const rowItems = data.cards.edges.slice(startIndex, endIndex);

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: "absolute",
                top: `${virtualRow.start}px`,
                left: 0,
                width: "100%",
              }}
            >
              <div
                className="grid gap-4 px-4 py-2"
                style={{
                  gridTemplateColumns: `repeat(${columns}, 1fr)`,
                }}
              >
                {rowItems.map((edge) => (
                  <Card
                    key={edge.cursor}
                    cardRef={edge.node}
                    showDescription={showDescription}
                    onAdd={onCardAdd}
                    onRemove={onCardRemove}
                    onOpen={onCardOpen}
                    deckFull={deckFull}
                    deckCardCount={
                      deckCardCounts ? (deckCardCounts[(edge.node as any).id] ?? 0) : 0
                    }
                    deckColors={deckColors}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {isLoadingNext && (
        <div className="flex justify-center p-4">
          <span className="text-gray-500">Loading...</span>
        </div>
      )}
    </div>
  );
}

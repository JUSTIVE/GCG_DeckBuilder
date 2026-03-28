import type { CardListFragment$key } from "@/__generated__/CardListFragment.graphql";
import { usePaginationFragment } from "react-relay";
import { graphql } from "relay-runtime";
import { Card } from "./Card";
import { createContext, useRef, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

type FocusCardContextType = {
  focusedCard: string | null;
  setFocusedCard: (value: string | null) => void;
};
export const CardListFocusContext = createContext<FocusCardContextType | null>(
  null,
);

export function CardListFocusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [focusedCard, setFocusedCard] = useState<string | null>(null);

  return (
    <CardListFocusContext value={{ focusedCard, setFocusedCard }}>
      {children}
    </CardListFocusContext>
  );
}

const Fragment = graphql`
  fragment CardListFragment on Query
  @refetchable(queryName: "CardListFragmentRefetchQuery")
  @argumentDefinitions(
    filter: { type: "CardFilterInput" }
    first: { type: "Int" }
    after: { type: "String" }
  ) {
    cards(after: $after, first: $first, filter: $filter)
      @connection(key: "CardListFragment_cards") {
      totalCount
      edges {
        cursor
        node {
          ...CardFragment
        }
      }
    }
  }
`;

type Props = {
  queryRef: CardListFragment$key;
};

export function CardList({ queryRef }: Props) {
  const { data, loadNext, hasNext, isLoadingNext } = usePaginationFragment(
    Fragment,
    queryRef,
  );
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);

  // 컨테이너 너비에 따라 컬럼 수 계산
  useEffect(() => {
    const updateColumns = () => {
      if (!parentRef.current) return;
      const width = parentRef.current.offsetWidth;
      const minCardWidth = width < 768 ? 150 : 250;
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
    estimateSize: () =>
      ((parentRef.current?.offsetWidth ?? 0 - (columns - 1) * 32) /
        columns /
        800) *
      1117, // 카드 높이 추정값 (aspect-100/160 기준)
    overscan: 2,
  });

  // 스크롤 끝에 도달하면 다음 페이지 로드
  useEffect(() => {
    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();
    if (!lastItem) return;

    if (lastItem.index >= rowCount - 1 && hasNext && !isLoadingNext) {
      loadNext(20);
    }
  }, [
    hasNext,
    isLoadingNext,
    loadNext,
    rowCount,
    rowVirtualizer.getVirtualItems(),
  ]);

  return (
    <CardListFocusProvider>
      <div ref={parentRef} className="overflow-y-auto h-[calc(100dvh-65px)]">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const startIndex = virtualRow.index * columns;
            const endIndex = Math.min(
              startIndex + columns,
              data.cards.edges.length,
            );
            const rowItems = data.cards.edges.slice(startIndex, endIndex);

            return (
              <div
                key={virtualRow.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div
                  className="grid gap-4 px-4"
                  style={{
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  }}
                >
                  {rowItems.map((edge) => (
                    <Card key={edge.cursor} cardRef={edge.node} />
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
    </CardListFocusProvider>
  );
}

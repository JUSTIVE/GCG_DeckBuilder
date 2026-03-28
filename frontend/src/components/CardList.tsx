import type { CardListFragment$key } from "@/__generated__/CardListFragment.graphql";
import { usePaginationFragment } from "react-relay";
import { graphql } from "relay-runtime";
import { Card } from "./Card";
import { createContext, useState } from "react";

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
  const { data } = usePaginationFragment(Fragment, queryRef);

  return (
    <CardListFocusProvider>
      <div
        className="@container grid @md:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]
       grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 mx-auto w-full p-4"
      >
        {data.cards.edges.map(({ cursor, node }) => (
          <Card key={cursor} cardRef={node} />
        ))}
      </div>
    </CardListFocusProvider>
  );
}
